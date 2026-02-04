/**
 * Topic Matcher
 * Utilities for matching and normalizing prep topics
 */

import { PREP_TEMPLATES, PrepTopic } from '@/data/prep-templates';

/**
 * Normalize topic name for consistent comparison
 * - Lowercase
 * - Replace & with and
 * - Collapse whitespace
 */
export function normalizeTopic(name: string): string {
    return name
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Check if two topic names match (fuzzy)
 */
export function topicsMatch(topic1: string, topic2: string): boolean {
    return normalizeTopic(topic1) === normalizeTopic(topic2);
}

/**
 * Get all unique topic names from prep templates
 */
export function getAllPrepTopics(): string[] {
    const topics = new Set<string>();

    PREP_TEMPLATES.forEach(template => {
        template.rounds.forEach(round => {
            round.keyTopics.forEach(topic => {
                topics.add(topic.name);
                // Also add subtopics as study items
                topic.subtopics.forEach(st => topics.add(st));
            });
        });
    });

    return Array.from(topics);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find matching prep topic names for a given input
 * Uses safe matching: exact normalized match preferred, 
 * word-boundary fuzzy match for longer inputs
 */
export function findMatchingTopics(input: string): string[] {
    const normalized = normalizeTopic(input);
    const allTopics = getAllPrepTopics();

    // Require minimum length to avoid overly broad matches
    if (normalized.length < 3) return [];

    return allTopics.filter(topic => {
        const normalizedTopic = normalizeTopic(topic);

        // Exact match first (safest)
        if (normalizedTopic === normalized) return true;

        // For fuzzy matching, require minimum 4 chars and word boundaries
        if (normalized.length >= 4) {
            const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i');
            return wordBoundaryRegex.test(normalizedTopic);
        }

        return false;
    });
}

/**
 * Get topic info including which roles/rounds use it
 * Uses safe word-boundary matching to prevent false positives
 */
export function getTopicUsage(topicName: string): { role: string; round: string }[] {
    const normalized = normalizeTopic(topicName);
    const usage: { role: string; round: string }[] = [];

    // Require minimum length to avoid overly broad matches
    if (normalized.length < 3) return usage;

    const matchesTopic = (target: string): boolean => {
        const normalizedTarget = normalizeTopic(target);
        // Exact match
        if (normalizedTarget === normalized) return true;
        // Word-boundary match for longer inputs
        if (normalized.length >= 4) {
            const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i');
            return wordBoundaryRegex.test(normalizedTarget);
        }
        return false;
    };

    PREP_TEMPLATES.forEach(template => {
        template.rounds.forEach(round => {
            round.keyTopics.forEach(topic => {
                if (matchesTopic(topic.name) ||
                    topic.subtopics.some(st => matchesTopic(st))) {
                    usage.push({
                        role: template.displayName,
                        round: round.displayName
                    });
                }
            });
        });
    });

    return usage;
}
