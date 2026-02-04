"use client";

import { PrepDetailPanel as PrepGuidancePanel } from "@/components/prep";
import { useStore } from "@/lib/store";
import { Application, ApplicationStatus, InterviewRoundType } from "@/types";
import { format, parseISO, differenceInDays } from "date-fns";
import {
    Briefcase,
    Building2,
    Calendar,
    ExternalLink,
    GripVertical,
    PanelRight,
    Search,
    Trash2,
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { useMemo, useRef, useState, type DragEvent } from "react";

import { PrepDetailPanel as RoundFeedbackPanel } from "./PrepDetailPanel";

const statusColumns: { status: ApplicationStatus; label: string; color: string }[] = [
    { status: "applied", label: "Applied", color: "bg-gray-500" },
    { status: "shortlisted", label: "Shortlisted", color: "bg-blue-500" },
    { status: "interview", label: "Interview", color: "bg-purple-500" },
    { status: "offer", label: "Offer", color: "bg-green-500" },
    { status: "rejected", label: "Rejected", color: "bg-red-500" },
];

const SEARCH_DEBOUNCE_MS = 250;
const DRAG_DATA_KEY = "applicationId";

// Rank search results so that:
// 0: company starts with query
// 1: company contains query
// 2: role starts with query
// 3: role contains query
const getSearchRank = (
    companyLower: string,
    roleLower: string,
    normalizedQuery: string
): number | null => {
    if (normalizedQuery === "") return null;

    if (companyLower.startsWith(normalizedQuery)) return 0;
    if (companyLower.includes(normalizedQuery)) return 1;
    if (roleLower.startsWith(normalizedQuery)) return 2;
    if (roleLower.includes(normalizedQuery)) return 3;
    return null;
};

export function KanbanBoard() {
    const applications = useStore((state) => state.applications);
    const updateApplication = useStore((state) => state.updateApplication);
    const deleteApplication = useStore((state) => state.deleteApplication);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery] = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

    // State for PrepDetailPanel
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isPrepPanelOpen, setIsPrepPanelOpen] = useState(false);
    const [feedbackApplicationId, setFeedbackApplicationId] = useState<string | null>(
        null
    );

    // Track mouse position to distinguish click from drag
    const mouseDownPosition = useRef<{ x: number; y: number } | null>(null);
    const DRAG_THRESHOLD = 5; // pixels

    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase();
    const isSearching = normalizedQuery !== "";

    const indexedApplications = useMemo(
        () =>
            applications.map((app) => ({
                app,
                companyLower: app.company.toLowerCase(),
                roleLower: app.role.toLowerCase(),
            })),
        [applications]
    );

    const { applicationsByStatus, matchCount } = useMemo(() => {
        const byStatus = Object.fromEntries(
            statusColumns.map(({ status }) => [status, [] as Application[]])
        ) as Record<ApplicationStatus, Application[]>;

        if (normalizedQuery === "") {
            for (const entry of indexedApplications) {
                byStatus[entry.app.status].push(entry.app);
            }

            return {
                applicationsByStatus: byStatus,
                matchCount: indexedApplications.length,
            };
        }

        const matches: { app: Application; rank: number }[] = [];
        for (const entry of indexedApplications) {
            const rank = getSearchRank(
                entry.companyLower,
                entry.roleLower,
                normalizedQuery
            );
            if (rank === null) continue;
            matches.push({ app: entry.app, rank });
        }

        // Keep higher-relevance matches first; within the same rank, use additional tie-breakers
        // so ordering stays deterministic during filtering.
        matches.sort((a, b) => {
            const rankDelta = a.rank - b.rank;
            if (rankDelta !== 0) return rankDelta;

            const companyDelta = a.app.company.localeCompare(b.app.company);
            if (companyDelta !== 0) return companyDelta;

            const roleDelta = a.app.role.localeCompare(b.app.role);
            if (roleDelta !== 0) return roleDelta;

            return a.app.id.localeCompare(b.app.id);
        });

        for (const match of matches) {
            byStatus[match.app.status].push(match.app);
        }

        return {
            applicationsByStatus: byStatus,
            matchCount: matches.length,
        };
    }, [indexedApplications, normalizedQuery]);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, appId: string) => {
        e.dataTransfer.setData(DRAG_DATA_KEY, appId);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (
        e: DragEvent<HTMLDivElement>,
        newStatus: ApplicationStatus
    ) => {
        e.preventDefault();
        const appId = e.dataTransfer.getData(DRAG_DATA_KEY);
        if (appId) {
            updateApplication(appId, { status: newStatus });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownPosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleCardClick = (app: Application, e: React.MouseEvent) => {
        // Don't open panel if clicking on interactive elements
        if ((e.target as HTMLElement).closest("button, a, input")) return;

        // Check if this was a drag gesture (mouse moved significantly)
        if (mouseDownPosition.current) {
            const dx = Math.abs(e.clientX - mouseDownPosition.current.x);
            const dy = Math.abs(e.clientY - mouseDownPosition.current.y);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                // This was a drag, not a click
                mouseDownPosition.current = null;
                return;
            }
        }
        mouseDownPosition.current = null;

        setSelectedApp(app);
        setIsPrepPanelOpen(true);
    };

    const handleClosePrepPanel = () => {
        setIsPrepPanelOpen(false);
        setSelectedApp(null);
    };

    const handleUpdateRound = (round: InterviewRoundType) => {
        if (selectedApp) {
            updateApplication(selectedApp.id, { currentRound: round });
            setSelectedApp({ ...selectedApp, currentRound: round });
        }
    };

    // Calculate days until interview
    const getDaysUntilInterview = (interviewDate: string | undefined) => {
        if (!interviewDate) return null;
        return differenceInDays(parseISO(interviewDate), new Date());
    };

    return (
        <>
            <div className="h-full bg-background p-6 overflow-x-auto">
                <div className="flex items-center gap-4 mb-4 min-w-max">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground">Search</h2>
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Company or role…"
                                aria-label="Search applications by company or role"
                                className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                    {applications.length > 0 && isSearching && (
                        <div className="text-sm text-muted-foreground">
                            Showing {matchCount} of {applications.length}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 min-w-max h-full">
                    {statusColumns.map((column) => {
                        const columnApps = applicationsByStatus[column.status];

                        return (
                            <div
                                key={column.status}
                                className="w-72 flex-shrink-0 flex flex-col bg-muted rounded-xl"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.status)}
                            >
                                {/* Column Header */}
                                <div className="p-4 border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${column.color}`} />
                                        <h3 className="font-semibold text-foreground">{column.label}</h3>
                                        <span className="ml-auto bg-background px-2 py-0.5 rounded-full text-sm text-muted-foreground">
                                            {columnApps.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                    {columnApps.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            {isSearching
                                                ? "No matches in this column for this search"
                                                : "Drop applications here"}
                                        </div>
                                    ) : (
                                        columnApps.map((app) => {
                                            const daysUntil = getDaysUntilInterview(app.interviewDate);
                                            const isUrgent =
                                                daysUntil !== null &&
                                                daysUntil <= 3 &&
                                                daysUntil >= 0;

                                            return (
                                                <div
                                                    key={app.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                                    onMouseDown={handleMouseDown}
                                                    onClick={(e) => handleCardClick(app, e)}
                                                    className={`bg-card rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-lg transition-all group relative ${isUrgent
                                                        ? "border-orange-300 ring-2 ring-orange-100 dark:border-orange-900 dark:ring-orange-950/40"
                                                        : "border-border hover:border-indigo-300"
                                                        }`}
                                                >
                                                    {/* Click hint */}
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink className="w-4 h-4 text-indigo-400 dark:text-indigo-300" />
                                                    </div>

                                                    {/* Card Header */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing" />
                                                            <div>
                                                                <h4 className="font-semibold text-foreground flex items-center gap-2">
                                                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                                                    {app.company}
                                                                </h4>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteApplication(app.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1"
                                                            title="Delete application"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Role */}
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                        <Briefcase className="w-3.5 h-3.5" />
                                                        {app.role}
                                                    </div>

                                                    {/* Interview Date with countdown */}
                                                    {app.interviewDate && (
                                                        <div className={`flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded ${isUrgent
                                                            ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-200"
                                                            : "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-200"
                                                            }`}>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {format(parseISO(app.interviewDate), "MMM d")}
                                                            </div>
                                                            {daysUntil !== null && daysUntil >= 0 && (
                                                                <span className="font-medium">
                                                                    {daysUntil === 0
                                                                        ? "Today!"
                                                                        : `${daysUntil}d left`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Current Round Badge */}
                                                    {app.currentRound && (
                                                        <div className="mt-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded inline-block dark:bg-indigo-950/30 dark:text-indigo-200">
                                                            {app.currentRound
                                                                .replace(/([A-Z])/g, " $1")
                                                                .trim()}
                                                        </div>
                                                    )}

                                                    {/* Click to view prep hint */}
                                                    <div className="mt-3 text-xs text-muted-foreground group-hover:text-indigo-500 transition-colors">
                                                        Click to view prep →
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFeedbackApplicationId(app.id);
                                                        }}
                                                        className="mt-2 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
                                                    >
                                                        <PanelRight className="w-4 h-4" />
                                                        Round feedback
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Prep Detail Panel Modal */}
            {selectedApp && (
                <PrepGuidancePanel
                    application={selectedApp}
                    isOpen={isPrepPanelOpen}
                    onClose={handleClosePrepPanel}
                    onUpdateRound={handleUpdateRound}
                />
            )}

            <RoundFeedbackPanel
                applicationId={feedbackApplicationId}
                isOpen={feedbackApplicationId !== null}
                onClose={() => setFeedbackApplicationId(null)}
            />
        </>
    );
}
