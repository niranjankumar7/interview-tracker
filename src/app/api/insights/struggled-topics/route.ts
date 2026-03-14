/**
 * API Route: /api/insights/struggled-topics
 * GET - Get aggregated struggled topics across applications/companies
 * 
 * Helps identify what topics to focus on when preparing for similar roles
 * 
 * Query params:
 * - company: Filter by specific company
 * - status: Filter by application status (e.g., 'rejected' to see what went wrong)
 * - roleType: Filter by role type
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { z } from 'zod';
import type { StruggledTopicsResponse, StruggledTopicItem } from '@/types/api';

const querySchema = z.object({
    company: z.string().optional(),
    status: z.enum(['applied', 'shortlisted', 'interview', 'offer', 'rejected']).optional(),
    roleType: z.string().optional(),
    groupBy: z.enum(['topic', 'company', 'category']).default('topic'),
});

/**
 * Extract and aggregate struggled topics from interview feedback
 */
async function getStruggledTopics(
    userId: string,
    filters: {
        company?: string;
        status?: string;
        roleType?: string;
    }
): Promise<StruggledTopicsResponse> {
    // Build application filter
    const appWhere: any = {
        userId,
    };

    if (filters.company) {
        appWhere.company = {
            equals: filters.company,
            mode: 'insensitive',
        };
    }

    if (filters.status) {
        appWhere.status = filters.status;
    }

    if (filters.roleType) {
        appWhere.roleType = {
            equals: filters.roleType,
            mode: 'insensitive',
        };
    }

    // Get applications with their rounds and feedback
    const applications = await prisma.application.findMany({
        where: appWhere,
        select: {
            id: true,
            company: true,
            role: true,
            status: true,
            rounds: {
                select: {
                    roundNumber: true,
                    roundType: true,
                    feedback: {
                        select: {
                            struggledTopics: true,
                        },
                    },
                },
            },
        },
    });

    // Aggregate struggled topics
    const topicMap = new Map<string, {
        count: number;
        companies: Set<string>;
        rounds: Set<string>;
        lastOccurred: Date;
    }>();

    for (const app of applications) {
        for (const round of app.rounds) {
            const topics = round.feedback?.struggledTopics || [];
            
            for (const topic of topics) {
                const normalizedTopic = topic.trim().toLowerCase();
                const existing = topicMap.get(normalizedTopic);

                if (existing) {
                    existing.count++;
                    existing.companies.add(app.company);
                    existing.rounds.add(`${round.roundType} (Round ${round.roundNumber})`);
                    // Update last occurred if this is more recent
                    // Note: We'd need the round date to properly track this
                } else {
                    topicMap.set(normalizedTopic, {
                        count: 1,
                        companies: new Set([app.company]),
                        rounds: new Set([`${round.roundType} (Round ${round.roundNumber})`]),
                        lastOccurred: new Date(), // Ideally use round date
                    });
                }
            }
        }
    }

    // Convert to array and sort by count
    const topics: StruggledTopicItem[] = Array.from(topicMap.entries())
        .map(([topic, data]) => ({
            topic,
            count: data.count,
            companies: Array.from(data.companies),
            relatedRounds: Array.from(data.rounds).slice(0, 5), // Top 5 rounds
            lastOccurred: data.lastOccurred.toISOString(),
        }))
        .sort((a, b) => b.count - a.count);

    // Build byCompany aggregation if no specific company filter
    let byCompany: Record<string, string[]> | undefined;
    if (!filters.company) {
        byCompany = {};
        for (const [topic, data] of topicMap.entries()) {
            for (const company of data.companies) {
                if (!byCompany[company]) {
                    byCompany[company] = [];
                }
                if (!byCompany[company].includes(topic)) {
                    byCompany[company].push(topic);
                }
            }
        }
    }

    const totalOccurrences = topics.reduce((sum, t) => sum + t.count, 0);

    return {
        totalOccurrences,
        uniqueTopics: topics.length,
        topics: topics.slice(0, 50), // Top 50 topics
        byCompany,
    };
}

/**
 * Get prep recommendations based on struggled topics
 */
async function getPrepRecommendations(
    userId: string,
    targetCompany?: string
): Promise<{
    focusAreas: string[];
    recommendedResources: Array<{
        topic: string;
        reason: string;
        priority: 'high' | 'medium' | 'low';
    }>;
}> {
    // Get all struggled topics
    const allTopics = await getStruggledTopics(userId, {});
    
    // Get company-specific topics if target company provided
    let companyTopics: StruggledTopicItem[] = [];
    if (targetCompany) {
        const companyData = await getStruggledTopics(userId, { company: targetCompany });
        companyTopics = companyData.topics;
    }

    // Combine and prioritize
    const highPriorityTopics = companyTopics.length > 0 
        ? companyTopics.slice(0, 5).map(t => t.topic)
        : allTopics.topics.slice(0, 5).map(t => t.topic);

    const recommendedResources = allTopics.topics.slice(0, 10).map(t => ({
        topic: t.topic,
        reason: t.companies.length > 1 
            ? `Asked at ${t.companies.length} different companies`
            : `Frequently asked at ${t.companies[0]}`,
        priority: t.count >= 3 ? 'high' : t.count >= 2 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
    }));

    return {
        focusAreas: highPriorityTopics,
        recommendedResources,
    };
}

// GET /api/insights/struggled-topics
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { searchParams } = new URL(req.url);

        const validation = querySchema.safeParse({
            company: searchParams.get('company') || undefined,
            status: searchParams.get('status') || undefined,
            roleType: searchParams.get('roleType') || undefined,
            groupBy: searchParams.get('groupBy') || 'topic',
        });

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const filters = validation.data;
        const includeRecommendations = searchParams.get('recommendations') === 'true';

        // Get struggled topics
        const topicsData = await getStruggledTopics(user.userId, {
            company: filters.company,
            status: filters.status,
            roleType: filters.roleType,
        });

        // Optionally include prep recommendations
        let recommendations;
        if (includeRecommendations) {
            recommendations = await getPrepRecommendations(user.userId, filters.company);
        }

        return NextResponse.json({
            ...topicsData,
            ...(recommendations && { recommendations }),
            filters: {
                company: filters.company,
                status: filters.status,
                roleType: filters.roleType,
            },
        });

    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get struggled topics error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
