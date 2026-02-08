"use client";

import { useStore } from "@/lib/store";
import { tryParseDateInput } from "@/lib/date-parsing";
import { getDailyPlansArray } from "@/lib/sprint-utils";
import type { Sprint, DailyPlan } from "@/types";
import {
    buildStruggledTopicMatchersByAppId,
    matchesStruggledTopic,
} from "@/lib/struggled-topics";
import { differenceInDays, format, isSameDay, parseISO } from "date-fns";
import {
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    Target,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { z } from "zod";

// Props schema for Tambo registration
export const planForDatePanelSchema = z.object({
    targetDate: z.preprocess(
        (val) => val ?? "tomorrow",
        z.string().describe(
            "Target date to show the prep plan for. Accepts YYYY-MM-DD or relative values like 'tomorrow' / 'next friday'. REQUIRED: Extract the date from the user's query (e.g., 'tomorrow', 'next friday', 'in 3 days')."
        )
    ),
    applicationId: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe(
            "Optional application ID to focus the plan on a single active sprint"
        )
    ),
});

interface PlanForDatePanelProps {
    targetDate: string;
    applicationId?: string;
}

type ParsedDailyPlan = {
    plan: DailyPlan;
    parsedDate: Date;
    time: number | null;
    index: number;
};

type ValidParsedDailyPlan = ParsedDailyPlan & { time: number };

type SprintMessageCardProps = {
    company?: string;
    role?: string;
    children: ReactNode;
};

function SprintMessageCard({ company, role, children }: SprintMessageCardProps) {
    const hasHeader = Boolean(company || role);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {hasHeader && (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5">
                    {company && <h3 className="font-bold text-xl">{company}</h3>}
                    {role && <p className="text-sm opacity-90">{role}</p>}
                </div>
            )}
            <div className="p-5 text-sm text-gray-700">{children}</div>
        </div>
    );
}

export function PlanForDatePanel({ targetDate, applicationId }: PlanForDatePanelProps) {
    const sprints = useStore((state) => state.sprints);
    const applications = useStore((state) => state.applications);
    const completeTask = useStore((state) => state.completeTask);

    // `targetDate` comes from natural language. This panel is intentionally strict and
    // shows a user-facing error when the input isn't recognized.
    const resolvedDate = useMemo(() => tryParseDateInput(targetDate), [targetDate]);

    const struggledTopicMatchersByAppId = useMemo(() => {
        return buildStruggledTopicMatchersByAppId(applications);
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

                const dailyPlans = getDailyPlansArray(sprint.dailyPlans);
                const parsedDailyPlans: ParsedDailyPlan[] = dailyPlans.map(
                    (plan, index) => {
                        const parsedDate = parseISO(plan.date);
                        const time = parsedDate.getTime();
                        return {
                            plan,
                            parsedDate,
                            time: Number.isNaN(time) ? null : time,
                            index,
                        };
                    }
                );

                const validDailyPlans = parsedDailyPlans.filter(
                    (p): p is ValidParsedDailyPlan => p.time !== null
                );

                const hasInvalidPlanDates =
                    validDailyPlans.length !== parsedDailyPlans.length;

                if (dailyPlans.length === 0) {
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

                if (validDailyPlans.length === 0) {
                    if (
                        hasInvalidPlanDates &&
                        process.env.NODE_ENV !== "production"
                    ) {
                        console.warn(
                            "PlanForDatePanel: sprint has invalid daily plan dates",
                            {
                                sprintId: sprint.id,
                                dailyPlanDates: dailyPlans.map((p) => p.date),
                            }
                        );
                    }

                    return (
                        <SprintMessageCard
                            key={`${sprint.id}:message:no-valid-dates`}
                            company={app?.company}
                            role={app?.role}
                        >
                            {hasInvalidPlanDates
                                ? "All days in this sprint have invalid dates and couldn't be shown."
                                : "This sprint doesn't have any valid daily plan dates."}
                        </SprintMessageCard>
                    );
                }

                const requestedPlanEntry =
                    validDailyPlans.find(({ parsedDate }) =>
                        isSameDay(parsedDate, resolvedDate)
                    ) ?? null;

                let selectedPlanEntry: ValidParsedDailyPlan | null = requestedPlanEntry;
                let guidanceMessage: string | null = null;

                if (!selectedPlanEntry) {
                    // Fallback is computed per-sprint (not globally across all sprints).
                    const resolvedTime = resolvedDate.getTime();

                    const nextPlan = validDailyPlans.reduce<
                        (typeof validDailyPlans)[number] | null
                    >((closest, plan) => {
                        if (plan.time <= resolvedTime) {
                            return closest;
                        }

                        if (!closest || plan.time < closest.time) {
                            return plan;
                        }

                        return closest;
                    }, null);

                    const lastPlan = validDailyPlans.reduce<
                        (typeof validDailyPlans)[number] | null
                    >((latest, plan) => {
                        if (!latest || plan.time > latest.time) {
                            return plan;
                        }

                        return latest;
                    }, null);

                    if (nextPlan) {
                        selectedPlanEntry = nextPlan;
                        guidanceMessage = `No plan found for ${format(resolvedDate, "EEE, MMM d, yyyy")} in this sprint. Showing the next available day in this sprint: ${format(nextPlan.parsedDate, "EEE, MMM d, yyyy")}.`;
                    } else if (lastPlan) {
                        selectedPlanEntry = lastPlan;
                        guidanceMessage = `No plan found for ${format(resolvedDate, "EEE, MMM d, yyyy")} in this sprint. This is the last planned prep day in this sprint (${format(lastPlan.parsedDate, "EEE, MMM d, yyyy")}).`;
                    }
                }

                if (!selectedPlanEntry) {
                    // Show a per-sprint message instead of silently skipping the sprint.
                    return (
                        <SprintMessageCard
                            key={`${sprint.id}:message:no-plan`}
                            company={app?.company}
                            role={app?.role}
                        >
                            {guidanceMessage ?? "No daily plan found for this sprint."}
                        </SprintMessageCard>
                    );
                }

                const { plan, parsedDate: planDate, index: dayIndex } = selectedPlanEntry;

                if (dayIndex < 0 || dayIndex >= dailyPlans.length) {
                    if (process.env.NODE_ENV !== "production") {
                        console.error("PlanForDatePanel: invalid day index", {
                            sprintId: sprint.id,
                            dayIndex,
                            selectedPlanEntry,
                        });
                    }

                    return (
                        <SprintMessageCard
                            key={`${sprint.id}:message:missing-plan`}
                            company={app?.company}
                            role={app?.role}
                        >
                            We couldn&apos;t load this day&apos;s plan for the sprint. Try refreshing the page or recreating the sprint.
                        </SprintMessageCard>
                    );
                }

                const blocks = plan.blocks ?? [];
                const completedTasks = blocks.reduce(
                    (acc, block) =>
                        acc + (block.tasks ?? []).filter((t) => t.completed).length,
                    0
                );
                const totalTasks = blocks.reduce(
                    (acc, block) => acc + (block.tasks ?? []).length,
                    0
                );

                const completionPercent =
                    totalTasks === 0
                        ? 0
                        : Math.round((completedTasks / totalTasks) * 100);

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
                                        {format(planDate, "yyyy-MM-dd")} · {plan.focus}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold">
                                        Day {plan.day}/{sprint.totalDays}
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
                            {blocks.map((block, blockIdx) => (
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
