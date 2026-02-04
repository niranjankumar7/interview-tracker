"use client";

import { useStore } from "@/lib/store";
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from "@/types";
import { differenceInDays, format, parseISO } from "date-fns";
import { Calendar, Briefcase, Building2 } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

export const pipelineSummaryPanelSchema = z.object({
    status: z
        .enum(APPLICATION_STATUSES)
        .optional()
        .describe(
            "Optional status filter (applied, shortlisted, interview, offer, rejected)"
        ),
});

interface PipelineSummaryPanelProps {
    status?: ApplicationStatus;
}

type UpcomingInterview = {
    application: Application;
    interviewDate: Date;
    daysLeft: number;
};

type StatusGroup = {
    status: ApplicationStatus;
    label: string;
    badgeClass: string;
};

const STATUS_GROUPS: StatusGroup[] = [
    { status: "applied", label: "Applied", badgeClass: "bg-gray-100 text-gray-700" },
    {
        status: "shortlisted",
        label: "Shortlisted",
        badgeClass: "bg-blue-100 text-blue-700",
    },
    {
        status: "interview",
        label: "Interview",
        badgeClass: "bg-purple-100 text-purple-700",
    },
    { status: "offer", label: "Offer", badgeClass: "bg-green-100 text-green-700" },
    {
        status: "rejected",
        label: "Rejected",
        badgeClass: "bg-red-100 text-red-700",
    },
];

function safeParseISO(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getNextInterviewDate(app: Application): Date | null {
    const candidates: Date[] = [];

    const appInterview = safeParseISO(app.interviewDate);
    if (appInterview) candidates.push(appInterview);

    for (const round of app.rounds ?? []) {
        const scheduled = safeParseISO(round.scheduledDate);
        if (scheduled) candidates.push(scheduled);
    }

    if (candidates.length === 0) return null;

    const now = new Date();
    const upcoming = candidates
        .filter((d) => d.getTime() >= now.getTime())
        .sort((a, b) => a.getTime() - b.getTime());

    return upcoming[0] ?? null;
}

function formatInterviewDate(date: Date): string {
    return format(date, "MMM d, yyyy");
}

function formatDaysLeft(daysLeft: number): string {
    if (daysLeft === 0) return "Today";
    if (daysLeft === 1) return "1 day";
    return `${daysLeft} days`;
}

function getCountdownClass(daysLeft: number): string {
    if (daysLeft <= 2) return "text-red-600";
    if (daysLeft <= 7) return "text-amber-600";
    return "text-gray-600";
}

export function PipelineSummaryPanel({ status }: PipelineSummaryPanelProps) {
    const applications = useStore((s) => s.applications);

    const scopedApplications = useMemo(() => {
        if (!status) return applications;
        return applications.filter((app) => app.status === status);
    }, [applications, status]);

    const upcomingInterviews = useMemo((): UpcomingInterview[] => {
        const upcoming: UpcomingInterview[] = [];

        for (const application of scopedApplications) {
            const nextInterviewDate = getNextInterviewDate(application);
            if (!nextInterviewDate) continue;

            const daysLeft = differenceInDays(nextInterviewDate, new Date());
            if (daysLeft < 0) continue;

            upcoming.push({ application, interviewDate: nextInterviewDate, daysLeft });
        }

        upcoming.sort((a, b) => a.interviewDate.getTime() - b.interviewDate.getTime());
        return upcoming;
    }, [scopedApplications]);

    const groupedByStatus = useMemo(() => {
        const result = new Map<ApplicationStatus, Application[]>();
        for (const s of APPLICATION_STATUSES) result.set(s, []);

        for (const app of scopedApplications) {
            result.get(app.status)?.push(app);
        }

        for (const apps of result.values()) {
            apps.sort((a, b) => a.company.localeCompare(b.company));
        }

        return result;
    }, [scopedApplications]);

    if (applications.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-lg shadow-lg">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="font-semibold text-lg text-gray-700 mb-2">
                    No applications yet
                </h3>
                <p className="text-gray-500 text-sm">
                    Add a few applications first, then ask: &ldquo;show my pipeline&rdquo;
                    or &ldquo;show my interviews&rdquo;.
                </p>
            </div>
        );
    }

    if (status && scopedApplications.length === 0) {
        const label = STATUS_GROUPS.find((s) => s.status === status)?.label ?? status;
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-lg shadow-lg">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="font-semibold text-lg text-gray-700 mb-2">
                    No applications in {label}
                </h3>
                <p className="text-gray-500 text-sm">
                    Try asking: &ldquo;show my pipeline&rdquo; (without a status filter)
                    to see everything.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                        Pipeline Summary
                    </h3>
                    <p className="text-sm text-gray-500">
                        Applications grouped by status with upcoming interview dates
                    </p>
                </div>
                {status && (
                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                        Filter: {status}
                    </span>
                )}
            </div>

            {/* Upcoming Interviews */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-gray-800">Upcoming interviews</h4>
                </div>

                {upcomingInterviews.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        No upcoming interviews found.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {upcomingInterviews.slice(0, 5).map((item) => (
                            <div
                                key={item.application.id}
                                className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                        <Building2 className="w-4 h-4 text-gray-500" />
                                        <span className="truncate">{item.application.company}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">
                                        {item.application.role}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-medium text-gray-800">
                                        {formatInterviewDate(item.interviewDate)}
                                    </p>
                                    <p
                                        className={`text-xs font-medium ${getCountdownClass(
                                            item.daysLeft
                                        )}`}
                                    >
                                        {formatDaysLeft(item.daysLeft)} left
                                    </p>
                                </div>
                            </div>
                        ))}
                        {upcomingInterviews.length > 5 && (
                            <p className="text-xs text-gray-500">
                                Showing 5 of {upcomingInterviews.length} upcoming interviews.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Grouped pipeline */}
            <div className="space-y-5">
                {STATUS_GROUPS.filter((g) => !status || g.status === status).map(
                    (group) => {
                        const apps = groupedByStatus.get(group.status) ?? [];
                        return (
                            <div key={group.status}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${group.badgeClass}`}
                                        >
                                            {group.label}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {apps.length}
                                        </span>
                                    </div>
                                </div>

                                {apps.length === 0 ? (
                                    <p className="text-sm text-gray-400">No applications</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {apps.map((app) => {
                                            const nextInterviewDate = getNextInterviewDate(app);
                                            const daysLeft = nextInterviewDate
                                                ? differenceInDays(nextInterviewDate, new Date())
                                                : null;

                                            return (
                                                <div
                                                    key={app.id}
                                                    className="border border-gray-200 rounded-lg p-3 bg-white"
                                                >
                                                    <p className="text-sm font-medium text-gray-800 truncate">
                                                        {app.company}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {app.role}
                                                    </p>
                                                    {nextInterviewDate && daysLeft !== null && daysLeft >= 0 ? (
                                                        <p
                                                            className={`text-xs mt-2 font-medium ${getCountdownClass(
                                                                daysLeft
                                                            )}`}
                                                        >
                                                            Interview: {formatInterviewDate(nextInterviewDate)} ({formatDaysLeft(daysLeft)} left)
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs mt-2 text-gray-400">
                                                            No interview date
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }
                )}
            </div>
        </div>
    );
}
