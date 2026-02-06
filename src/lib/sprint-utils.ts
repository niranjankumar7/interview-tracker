import { DailyPlan } from '@/types';

/**
 * Safely get dailyPlans as an array.
 * The API might return dailyPlans as a JSON string or non-array format.
 * This utility ensures we always work with a proper array.
 */
export function getDailyPlansArray(dailyPlans: unknown): DailyPlan[] {
    if (!dailyPlans) return [];

    // If it's already an array, return it
    if (Array.isArray(dailyPlans)) return dailyPlans;

    // If it's a string, try to parse it as JSON
    if (typeof dailyPlans === 'string') {
        try {
            const parsed = JSON.parse(dailyPlans);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

/**
 * Safely get blocks from a plan.
 * Handles cases where blocks might be undefined or not an array.
 */
export function getBlocksArray(blocks: unknown): Array<{
    blockLabel?: string;
    completed?: boolean;
    tasks: Array<{ completed?: boolean; category?: string; title?: string }>;
}> {
    if (!blocks) return [];
    if (Array.isArray(blocks)) return blocks;
    return [];
}

/**
 * Safely get tasks from a block.
 * Handles cases where tasks might be undefined or not an array.
 */
export function getTasksArray(tasks: unknown): Array<{
    completed?: boolean;
    category?: string;
    title?: string;
}> {
    if (!tasks) return [];
    if (Array.isArray(tasks)) return tasks;
    return [];
}
