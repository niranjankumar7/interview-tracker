"use client";

import { useStore } from "@/lib/store";
import { tryParseDateInput } from "@/lib/date-parsing";
import { differenceInDays, format, isSameDay, parseISO } from "date-fns";
import {
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    Target,
} from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

// Props schema for Tambo registration
export const planForDatePanelSchema = z.object({
    targetDate: z
        .string()
        .describe(
            "Target date to show the prep plan for. Accepts YYYY-MM-DD or relative values like 'tomorrow' / 'next friday'."
        ),
    applicationId: z
        .string()
        .optional()
        .describe(
            "Optional application ID to focus the plan on a single active sprint"
        ),
});

interface PlanForDatePanelProps {
    targetDate: string;
    applicationId?: string;
}

type TopicMatcher = {
    needle: string;
    regex: RegExp | null;
};

function matchesStruggledTopic(
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

function escapeRegExp(value: string): string {
    // Escape topic text so it can be safely embedded in a RegExp.
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTopicMatcher(topic: string): TopicMatcher {
    const needle = topic.toLowerCase();

    if (needle.length <= 3) {
        // Avoid overly-permissive substring matches for short topics (e.g. "SQL" in "sequel").
        return {
            needle,
            regex: new RegExp(
                `(^|[^a-z0-9])${escapeRegExp(needle)}($|[^a-z0-9])`
            ),
        };
    }

    return { needle, regex: null };
}

export function PlanForDatePanel({ targetDate, applicationId }: PlanForDatePanelProps) {
    const sprints = useStore((state) => state.sprints);
    const applications = useStore((state) => state.applications);
    const completeTask = useStore((state) => state.completeTask);

    // `targetDate` comes from natural language. This panel is intentionally strict and
    // shows a user-facing error when the input isn't recognized.
    const resolvedDate = useMemo(() => tryParseDateInput(targetDate), [targetDate]);

    const struggledTopicMatchersByAppId = useMemo(() => {
        // Precompute once per applications update to avoid per-task lowercasing and repeated scans.
        const result = new Map<string, TopicMatcher[]>();

        for (const app of applications) {
            const topics = [
                ...new Set(
                    (app.rounds ?? []).flatMap(
                        (r) => r.feedback?.struggledTopics ?? []
                    )
                ),
            ];

            const matchers = topics
                .map(buildTopicMatcher)
                .filter((m) => m.needle.length > 0);

            result.set(app.id, matchers);
        }

        return result;
    }, [applications]);

    if (!resolvedDate) {
        return (
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-8 text-center max-w-md border border-red-200">
                <div className="p-4 bg-red-200 rounded-full w-fit mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-red-700" />
                </div>
                <h3 className="font-semibold text-lg text-red-800 mb-2">
                    Invalid Date
                </h3>
                <p className="text-red-700 text-sm">
                    I couldn&apos;t understand &ldquo;{targetDate}&rdquo;. Try something like
                    &ldquo;tomorrow&rdquo;, &ldquo;next Friday&rdquo;, &ldquo;in 3 days&rdquo;, or a date like
                    &ldquo;2024-12-31&rdquo;.
                </p>
            </div>
        );
    }

    const activeSprints = sprints.filter((s) => s.status === "active");
    const filteredSprints = applicationId
        ? activeSprints.filter((s) => s.applicationId === applicationId)
        : activeSprints;

    if (activeSprints.length === 0) {
        return (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center max-w-md border border-gray-200">
                <div className="p-4 bg-gray-200 rounded-full w-fit mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="font-semibold text-lg text-gray-700 mb-2">
                    No Active Sprints
                </h3>
                <p className="text-gray-500 text-sm">
                    Create an interview sprint to get started! Try saying: &ldquo;I have an
                    interview at Google next Thursday for SDE&rdquo;
                </p>
            </div>
        );
    }

    if (filteredSprints.length === 0 && applicationId) {
        return (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center max-w-md border border-gray-200">
                <div className="p-4 bg-gray-200 rounded-full w-fit mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="font-semibold text-lg text-gray-700 mb-2">
                    Sprint Not Found
                </h3>
                <p className="text-gray-500 text-sm">
                    I couldn&apos;t find an active sprint for that application.
                </p>
            </div>
        );
    }

    const resolvedDateLabel = format(resolvedDate, "EEEE, MMM d, yyyy");

    return (
        <div className="space-y-6 max-w-lg">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                        <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">
                            Prep plan for {resolvedDateLabel}
                        </p>
                        <p className="text-sm text-gray-500">
                            {filteredSprints.length} active sprint
                            {filteredSprints.length === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>
            </div>

            {filteredSprints.map((sprint) => {
                const app = applications.find((a) => a.id === sprint.applicationId);
                const struggledTopicMatchers =
                    struggledTopicMatchersByAppId.get(sprint.applicationId) ?? [];

                if (sprint.dailyPlans.length === 0) {
                    return (
                        <div
                            key={sprint.id}
                            className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                        >
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5">
                                <h3 className="font-bold text-xl">{app?.company}</h3>
                                <p className="text-sm opacity-90">{app?.role}</p>
                            </div>
                            <div className="p-5 text-sm text-gray-700">
                                No daily plans are available for this sprint yet.
                            </div>
                        </div>
                    );
                }

                const requestedPlan = sprint.dailyPlans.find((plan) =>
                    isSameDay(parseISO(plan.date), resolvedDate)
                );

                let planToShow = requestedPlan;
                let guidanceMessage: string | null = null;

                if (!planToShow) {
                    const resolvedTime = resolvedDate.getTime();

                    const nextPlan = sprint.dailyPlans.reduce<typeof requestedPlan | undefined>(
                        (closest, plan) => {
                            const planTime = parseISO(plan.date).getTime();
                            if (planTime <= resolvedTime) return closest;
                            if (!closest) return plan;

                            const closestTime = parseISO(closest.date).getTime();
                            return planTime < closestTime ? plan : closest;
                        },
                        undefined
                    );

                    const lastPlan = sprint.dailyPlans.reduce((latest, plan) => {
                        const latestTime = parseISO(latest.date).getTime();
                        const planTime = parseISO(plan.date).getTime();
                        return planTime > latestTime ? plan : latest;
                    }, sprint.dailyPlans[0]);

                    if (nextPlan) {
                        planToShow = nextPlan;
                        guidanceMessage = `No plan found for ${format(resolvedDate, "yyyy-MM-dd")} in this sprint. Showing the next available day in this sprint: ${format(parseISO(nextPlan.date), "yyyy-MM-dd")}.`;
                    } else {
                        planToShow = lastPlan;
                        guidanceMessage = `No plan found for ${format(resolvedDate, "yyyy-MM-dd")} in this sprint. This is the last planned prep day in this sprint (${format(parseISO(lastPlan.date), "yyyy-MM-dd")}).`;
                    }
                }

                if (!planToShow) return null;

                const dayIndex = sprint.dailyPlans.indexOf(planToShow);

                if (dayIndex === -1) return null;

                const completedTasks = planToShow.blocks.reduce(
                    (acc, block) =>
                        acc + block.tasks.filter((t) => t.completed).length,
                    0
                );
                const totalTasks = planToShow.blocks.reduce(
                    (acc, block) => acc + block.tasks.length,
                    0
                );

                const completionPercent =
                    totalTasks === 0
                        ? 0
                        : Math.round((completedTasks / totalTasks) * 100);

                const planDate = parseISO(planToShow.date);
                const interviewDate = parseISO(sprint.interviewDate);
                const daysDiff = Number.isNaN(interviewDate.getTime())
                    ? null
                    : differenceInDays(interviewDate, planDate);

                const interviewLabel =
                    daysDiff === null
                        ? "Interview date not set"
                        : daysDiff < 0
                            ? "Interview passed"
                            : daysDiff === 0
                                ? "Interview today"
                                : `${daysDiff} days left`;

                return (
                    <div
                        key={sprint.id}
                        className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="font-bold text-xl">{app?.company}</h3>
                                    <p className="text-sm opacity-90">{app?.role}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                        <Target className="w-4 h-4" />
                                        <span className="font-semibold">
                                            {interviewLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-sm opacity-80">Plan for</p>
                                    <p className="font-semibold">
                                        {format(planDate, "yyyy-MM-dd")} · {planToShow.focus}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold">
                                        Day {planToShow.day}/{sprint.totalDays}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {guidanceMessage && (
                            <div className="px-5 py-3 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-900">
                                {guidanceMessage}
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="px-5 py-3 bg-gray-50 border-b">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span>
                                    {completedTasks}/{totalTasks} tasks completed
                                </span>
                                <span>{completionPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${completionPercent}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Blocks */}
                        <div className="p-5 space-y-4">
                            {planToShow.blocks.map((block, blockIdx) => (
                                <div
                                    key={block.id}
                                    className={`rounded-lg p-4 ${block.completed
                                            ? "bg-green-50 border border-green-200"
                                            : "bg-gray-50 border border-gray-200"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold capitalize flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            {block.type} Block
                                            {block.completed && (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            )}
                                        </h4>
                                        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                                            {block.duration}
                                        </span>
                                    </div>

                                    <ul className="space-y-2">
                                        {block.tasks.map((task, taskIdx) => {
                                            const categoryLower = (
                                                task.category ?? ""
                                            ).toLowerCase();
                                            const descriptionLower = (
                                                task.description ?? ""
                                            ).toLowerCase();

                                            const struggledMatch =
                                                struggledTopicMatchers.length > 0 &&
                                                matchesStruggledTopic(
                                                    struggledTopicMatchers,
                                                    categoryLower,
                                                    descriptionLower
                                                );

                                            return (
                                                <li
                                                    key={task.id}
                                                    className="flex items-start gap-3"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            completeTask(
                                                                sprint.id,
                                                                dayIndex,
                                                                blockIdx,
                                                                taskIdx
                                                            );
                                                        }}
                                                        className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                                                    >
                                                        {task.completed ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-gray-400 hover:text-blue-500" />
                                                        )}
                                                    </button>
                                                    <span
                                                        className={`text-sm ${task.completed
                                                                ? "line-through text-gray-400"
                                                                : "text-gray-700"
                                                            } ${struggledMatch && !task.completed
                                                                ? "bg-yellow-50 border border-yellow-200 rounded px-2 py-1"
                                                                : ""
                                                            }`}
                                                    >
                                                        {task.description}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
