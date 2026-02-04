import type { CompletedTopic } from "@/types";
import { normalizeTopic } from "@/lib/topic-matcher";

type GetCompletedTopic = (topicName: string) => CompletedTopic | undefined;

const TOPIC_PREREQUISITES: Record<string, string[]> = {
    [normalizeTopic("Dynamic Programming")]: ["Recursion"],
    [normalizeTopic("Common Systems")]: ["Fundamentals"],
    [normalizeTopic("Data Storage")]: ["Fundamentals"],
};

function getDirectPrerequisites(topicName: string): string[] {
    return TOPIC_PREREQUISITES[normalizeTopic(topicName)] ?? [];
}

function getAllPrerequisites(topicName: string): string[] {
    const expanded = new Set<string>();
    const displayNamesByNormalized = new Map<string, Set<string>>();
    const stack = [...getDirectPrerequisites(topicName)];

    while (stack.length > 0) {
        const next = stack.pop();
        if (!next) continue;

        const normalized = normalizeTopic(next);
        const displayNames = displayNamesByNormalized.get(normalized);
        if (displayNames) {
            displayNames.add(next);
        } else {
            displayNamesByNormalized.set(normalized, new Set([next]));
        }

        if (!expanded.has(normalized)) {
            expanded.add(normalized);
            stack.push(...getDirectPrerequisites(next));
        }
    }

    return Array.from(displayNamesByNormalized.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, displayNames]) => {
            return Array.from(displayNames).sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: "base" })
            )[0]!;
        });
}

/**
* Returns which prerequisite topics are not yet completed.
*
* This is meant to power subtle UI warnings when users mark an advanced topic
* as done before completing its foundational topics.
*/
export function getMissingPrerequisites(
    topicName: string,
    getCompletedTopic: GetCompletedTopic
): string[] {
    const prerequisites = getAllPrerequisites(topicName);
    return prerequisites.filter((p) => !getCompletedTopic(p));
}
