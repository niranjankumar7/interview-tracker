import type { Application } from "@/types";

export type TopicMatcher = {
    needle: string;
    regex: RegExp | null;
};

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTopicMatcher(topic: string): TopicMatcher {
    const needle = topic.toLowerCase();

    if (needle.length <= 3) {
        return {
            needle,
            regex: new RegExp(
                `(^|[^a-z0-9])${escapeRegExp(needle)}($|[^a-z0-9])`
            ),
        };
    }

    return { needle, regex: null };
}

export function buildStruggledTopicMatchersByAppId(
    applications: Application[]
): Map<string, TopicMatcher[]> {
    const result = new Map<string, TopicMatcher[]>();

    for (const app of applications) {
        const topics = [
            ...new Set(
                (app.rounds ?? []).flatMap((r) => r.feedback?.struggledTopics ?? [])
            ),
        ];

        const matchers = topics
            .map(buildTopicMatcher)
            .filter((m) => m.needle.length > 0);

        result.set(app.id, matchers);
    }

    return result;
}

export function matchesStruggledTopic(
    matchers: TopicMatcher[],
    categoryLower: string,
    descriptionLower: string
): boolean {
    return matchers.some((matcher) => {
        if (categoryLower === matcher.needle) return true;
        if (matcher.regex) return matcher.regex.test(descriptionLower);
        return descriptionLower.includes(matcher.needle);
    });
}
