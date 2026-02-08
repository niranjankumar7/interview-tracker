/**
 * DuckDuckGo Scraper Service
 * Fetches company-specific interview insights using DuckDuckGo search
 */

import { RoleType, InterviewRoundType } from '@/types';
import { getScraperCache, setScraperCache } from './scraper-cache';

export interface ScrapedInterviewData {
    companyTips: string[];
    recentQuestions: string[];
    interviewProcess: string[];
    source: string;
    fetchedAt: string;
}

interface DDGSearchResult {
    Abstract: string;
    AbstractText: string;
    RelatedTopics: Array<{
        Text?: string;
        FirstURL?: string;
    }>;
}

/**
 * Fetch company-specific interview data using DuckDuckGo
 * 
 * TODO: Security/Privacy Concern
 * These fetch calls currently run client-side from the browser.
 * This exposes user queries and may violate DuckDuckGo's ToS.
 * Recommended fix: Create a Next.js API route (/api/interview-insights)
 * to proxy these requests server-side with proper rate limiting.
 * See PR review for details.
 */
export async function fetchCompanyInterviewData(
    company: string,
    role: string,
    roleType: RoleType,
    round?: InterviewRoundType
): Promise<ScrapedInterviewData | null> {
    // Check cache first
    const cacheKey = `${company.toLowerCase()}_${roleType}_${round || 'general'}`;
    const cached = getScraperCache(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // Build search query
        const roundText = round ? formatRoundForSearch(round) : 'technical interview';
        const searchQuery = `${company} ${role} interview questions ${roundText}`;

        // DuckDuckGo Instant Answer API (free, no API key required)
        const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;

        const response = await fetch(ddgApiUrl, {
            headers: {
                'Accept': 'application/json',
            },
            // Note: next.revalidate only works server-side, removed for clarity
        });

        if (!response.ok) {
            console.warn('DuckDuckGo API request failed:', response.status);
            return null;
        }

        const data: DDGSearchResult = await response.json();

        // Extract insights from the response
        const result = parseSearchResults(company, data);

        // Cache the result
        if (result.companyTips.length > 0 || result.recentQuestions.length > 0) {
            setScraperCache(cacheKey, result);
        }

        return result;

    } catch (error) {
        console.error('Error fetching company interview data:', error);
        return null;
    }
}

/**
 * Alternative: Fetch data using web search query (fallback method)
 */
export async function fetchViaWebSearch(
    company: string,
    roleType: RoleType
): Promise<ScrapedInterviewData | null> {
    const cacheKey = `web_${company.toLowerCase()}_${roleType}`;
    const cached = getScraperCache(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // Use DuckDuckGo HTML endpoint for more comprehensive results
        const searchQuery = `${company} interview experience ${roleType} questions glassdoor leetcode`;
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; InterviewPrepBot/1.0)',
            },
        });

        if (!response.ok) {
            return null;
        }

        const html = await response.text();
        const result = parseHTMLResults(company, html);

        if (result.companyTips.length > 0) {
            setScraperCache(cacheKey, result);
        }

        return result;

    } catch (error) {
        console.error('Web search failed:', error);
        return null;
    }
}

/**
 * Parse DuckDuckGo Instant Answer API results
 */
function parseSearchResults(company: string, data: DDGSearchResult): ScrapedInterviewData {
    const tips: string[] = [];
    const questions: string[] = [];
    const process: string[] = [];

    // Extract from abstract
    if (data.AbstractText) {
        const sentences = data.AbstractText.split('. ').filter(s => s.length > 20);
        sentences.slice(0, 2).forEach(s => tips.push(s.trim()));
    }

    // Extract from related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, 5).forEach(topic => {
            if (topic.Text) {
                const text = topic.Text.trim();

                // Categorize based on keywords
                if (text.toLowerCase().includes('question') || text.includes('?')) {
                    questions.push(text);
                } else if (text.toLowerCase().includes('round') || text.toLowerCase().includes('process')) {
                    process.push(text);
                } else if (text.length > 30) {
                    tips.push(text);
                }
            }
        });
    }

    // Add company-specific default tips if we got limited results
    if (tips.length === 0) {
        tips.push(...getDefaultCompanyTips(company));
    }

    return {
        companyTips: tips.slice(0, 5),
        recentQuestions: questions.slice(0, 5),
        interviewProcess: process.slice(0, 3),
        source: 'DuckDuckGo',
        fetchedAt: new Date().toLocaleString(),
    };
}

/**
 * Parse HTML search results (fallback)
 */
function parseHTMLResults(company: string, html: string): ScrapedInterviewData {
    const tips: string[] = [];
    const questions: string[] = [];

    // Simple regex to extract result snippets
    const snippetMatches = html.match(/class="result__snippet"[^>]*>(.*?)<\/a>/g);

    if (snippetMatches) {
        snippetMatches.slice(0, 10).forEach(match => {
            // Clean HTML tags
            const text = match.replace(/<[^>]*>/g, '').trim();
            if (text.length > 20 && text.length < 300) {
                if (text.includes('?') || text.toLowerCase().includes('asked')) {
                    questions.push(text);
                } else {
                    tips.push(text);
                }
            }
        });
    }

    if (tips.length === 0) {
        tips.push(...getDefaultCompanyTips(company));
    }

    return {
        companyTips: tips.slice(0, 5),
        recentQuestions: questions.slice(0, 5),
        interviewProcess: [],
        source: 'Web Search',
        fetchedAt: new Date().toLocaleString(),
    };
}

/**
 * Format round type for search query
 */
function formatRoundForSearch(round: InterviewRoundType): string {
    const roundMap: Record<string, string> = {
        'HR': 'HR behavioral',
        'TechnicalRound1': 'first round coding',
        'TechnicalRound2': 'second round technical',
        'SystemDesign': 'system design',
        'Managerial': 'hiring manager',
        'Assignment': 'take home assignment',
        'Final': 'final onsite'
    };
    return roundMap[round] || round.replace(/[_-]+/g, ' ');
}

/**
 * Get default tips for well-known companies
 */
function getDefaultCompanyTips(company: string): string[] {
    const companyLower = company.toLowerCase();

    const companyTips: Record<string, string[]> = {
        'google': [
            'Focus on problem-solving approach over getting the perfect solution',
            "Google values 'Googleyness' - collaboration, humility, and being data-driven",
            'Practice explaining your thought process clearly',
            'Expect questions on scalability and trade-offs in system design'
        ],
        'amazon': [
            'Study and practice the 16 Amazon Leadership Principles',
            "Use the STAR method for behavioral questions - it's critical at Amazon",
            'Expect questions about customer obsession and ownership',
            'Be ready to discuss times you disagreed with your team/manager'
        ],
        'microsoft': [
            'Microsoft focuses on growth mindset - show willingness to learn',
            'Prepare for collaborative problem-solving scenarios',
            'Expect questions about handling ambiguity',
            'System design often includes Azure/cloud considerations'
        ],
        'meta': [
            'Meta interviews are fast-paced - practice under time pressure',
            'Focus on optimal solutions from the start',
            'Behavioral interviews emphasize building for scale and impact',
            'Expect questions about handling large-scale systems'
        ],
        'apple': [
            'Apple values attention to detail and craftsmanship',
            'Expect deep technical questions on your area of expertise',
            'Be prepared to discuss past projects in detail',
            'Secrecy and discretion are important cultural values'
        ]
    };

    for (const [key, tips] of Object.entries(companyTips)) {
        if (companyLower.includes(key)) {
            return tips;
        }
    }

    // Generic tips for unknown companies
    return [
        `Research ${company}'s products, mission, and recent news`,
        'Prepare specific examples from your experience that align with the role',
        'Review the job description and match your skills to requirements',
        'Prepare thoughtful questions about the team and projects'
    ];
}

/**
 * Main function to get interview prep data for a company
 */
export async function getCompanyPrepData(
    company: string,
    role: string,
    roleType: RoleType,
    round?: InterviewRoundType
): Promise<ScrapedInterviewData> {
    // Try DuckDuckGo API first
    let result = await fetchCompanyInterviewData(company, role, roleType, round);

    // Fallback to web search if needed
    if (!result || (result.companyTips.length === 0 && result.recentQuestions.length === 0)) {
        result = await fetchViaWebSearch(company, roleType);
    }

    // If all fails, return default tips
    if (!result) {
        return {
            companyTips: getDefaultCompanyTips(company),
            recentQuestions: [],
            interviewProcess: [],
            source: 'Default Tips',
            fetchedAt: new Date().toLocaleString(),
        };
    }

    return result;
}
