import type { CompletedTopic } from "@/types";
import { normalizeTopic } from "@/lib/topic-matcher";
import { useStore } from "@/lib/store";

type TopicCompletionGetter = (topicName: string) => CompletedTopic | undefined;

const TOPIC_PREREQUISITES: Record<string, string[]> = {
    [normalizeTopic("Dynamic Programming")]: ["Recursion"],
};

function getDirectPrerequisites(topicName: string): string[] {
    return TOPIC_PREREQUISITES[normalizeTopic(topicName)] ?? [];
}

function getAllPrerequisites(topicName: string): string[] {
    const seen = new Set<string>();
    const prerequisites: string[] = [];
    const stack = [...getDirectPrerequisites(topicName)];

    while (stack.length > 0) {
        const next = stack.pop();
        if (!next) continue;

        const normalized = normalizeTopic(next);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        prerequisites.push(next);

        stack.push(...getDirectPrerequisites(next));
    }

    return prerequisites;
}

/**
* Returns which prerequisite topics are not yet completed.
*
* This is meant to power subtle UI warnings when users mark an advanced topic
* as done before completing its foundational topics.
*/
export function getMissingPrerequisites(
    topicName: string,
    getTopicCompletion: TopicCompletionGetter = useStore.getState().getTopicCompletion
): string[] {
    const prerequisites = getAllPrerequisites(topicName);
    return prerequisites.filter((p) => !getTopicCompletion(p));
}
