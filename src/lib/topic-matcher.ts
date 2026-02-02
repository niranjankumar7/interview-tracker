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
 * Find matching prep topic names for a given input
 * Returns all topic names that match or contain the input
 */
export function findMatchingTopics(input: string): string[] {
    const normalized = normalizeTopic(input);
    const allTopics = getAllPrepTopics();

    return allTopics.filter(topic => {
        const normalizedTopic = normalizeTopic(topic);
        return normalizedTopic.includes(normalized) || normalized.includes(normalizedTopic);
    });
}

/**
 * Get topic info including which roles/rounds use it
 */
export function getTopicUsage(topicName: string): { role: string; round: string }[] {
    const normalized = normalizeTopic(topicName);
    const usage: { role: string; round: string }[] = [];

    PREP_TEMPLATES.forEach(template => {
        template.rounds.forEach(round => {
            round.keyTopics.forEach(topic => {
                if (normalizeTopic(topic.name).includes(normalized) ||
                    topic.subtopics.some(st => normalizeTopic(st).includes(normalized))) {
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
