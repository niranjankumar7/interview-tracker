"use client";

import { useStore } from "@/lib/store";
import { isToday, differenceInDays, parseISO } from "date-fns";
import {
    Clock,
    CheckCircle2,
    Circle,
    Flame,
    Target,
    Calendar,
} from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

// Props schema for Tambo registration
export const todaysPlanPanelSchema = z.object({
    showAll: z
        .boolean()
        .optional()
        .describe("Whether to show all active sprints or just the first one"),
});

interface TodaysPlanPanelProps {
    showAll?: boolean;
}

type TopicMatcher = {
    needle: string;
    regex: RegExp | null;
};

function escapeRegExp(value: string): string {
    // Escape topic text so it can be safely embedded in a RegExp.
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTopicMatcher(topic: string): TopicMatcher {
    const needle = topic.trim().toLowerCase();

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

export function TodaysPlanPanel({ showAll = true }: TodaysPlanPanelProps) {
    const sprints = useStore((state) => state.sprints);
    const applications = useStore((state) => state.applications);
    const completeTask = useStore((state) => state.completeTask);
    const progress = useStore((state) => state.progress);

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

    // Find active sprints
    const activeSprints = sprints.filter((s) => s.status === "active");

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

    const sprintsToShow = showAll ? activeSprints : [activeSprints[0]];

    return (
        <div className="space-y-6 max-w-lg">
            {/* Streak Banner */}
            {progress.currentStreak > 0 && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-4 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <Flame className="w-8 h-8" />
                        <div>
                            <p className="font-bold text-lg">{progress.currentStreak} Day Streak!</p>
                            <p className="text-sm opacity-90">Keep up the great work!</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{progress.totalTasksCompleted}</p>
                        <p className="text-xs opacity-80">tasks done</p>
                    </div>
                </div>
            )}

            {sprintsToShow.map((sprint) => {
                const app = applications.find((a) => a.id === sprint.applicationId);
                const struggledTopicMatchers =
                    struggledTopicMatchersByAppId.get(sprint.applicationId) ?? [];
                const todaysPlan = sprint.dailyPlans.find((plan) =>
                    isToday(parseISO(plan.date))
                );

                const daysUntilInterview = differenceInDays(
                    parseISO(sprint.interviewDate),
                    new Date()
                );

                // If no plan for today, show next available
                const planToShow =
                    todaysPlan ||
                    sprint.dailyPlans.find((p) => !p.completed) ||
                    sprint.dailyPlans[0];

                if (!planToShow) return null;

                const dayIndex = sprint.dailyPlans.findIndex(
                    (p) => p.day === planToShow.day
                );
                const completedTasks = planToShow.blocks.reduce(
                    (acc, block) => acc + block.tasks.filter((t) => t.completed).length,
                    0
                );
                const totalTasks = planToShow.blocks.reduce(
                    (acc, block) => acc + block.tasks.length,
                    0
                );

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
                                            {daysUntilInterview} days left
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-sm opacity-80">
                                        {todaysPlan ? "Today's Focus" : "Next Up"}
                                    </p>
                                    <p className="font-semibold">{planToShow.focus}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold">
                                        Day {planToShow.day}/{sprint.totalDays}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-5 py-3 bg-gray-50 border-b">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span>
                                    {completedTasks}/{totalTasks} tasks completed
                                </span>
                                <span>{Math.round((completedTasks / totalTasks) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${(completedTasks / totalTasks) * 100}%`,
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
                                            const categoryLower = (task.category ?? "")
                                                .trim()
                                                .toLowerCase();
                                            const descriptionLower = task.description.toLowerCase();

                                            const struggledMatch =
                                                struggledTopicMatchers.length > 0 &&
                                                struggledTopicMatchers.some((matcher) => {
                                                    if (categoryLower === matcher.needle) return true;

                                                    return matcher.regex
                                                        ? matcher.regex.test(descriptionLower)
                                                        : descriptionLower.includes(matcher.needle);
                                                });

                                            return (
                                                <li key={task.id} className="flex items-start gap-3">
                                                <button
                                                    onClick={() => {
                                                        completeTask(sprint.id, dayIndex, blockIdx, taskIdx);
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
