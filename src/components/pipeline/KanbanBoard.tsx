"use client";

import { PrepDetailPanel } from "@/components/prep";
import { useStore } from "@/lib/store";
import { getInterviewRoundTheme } from "@/lib/interviewRoundRegistry";
import { formatOfferTotalCTC } from "@/lib/offer-details";
import { generateSprint } from "@/lib/sprintGenerator";
import { Application, ApplicationStatus, RoleType } from "@/types";
import { addDays, differenceInDays, format, parseISO, startOfDay } from "date-fns";
import {
    AlertTriangle,
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
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";

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
const DEFAULT_INTERVIEW_OFFSET_DAYS = 7;

const ROLE_TYPE_LABELS: Record<RoleType, string> = {
    SDE: "Software Development Engineer",
    SDET: "Software Dev Engineer in Test",
    ML: "Machine Learning Engineer",
    DevOps: "DevOps / SRE",
    Frontend: "Frontend Developer",
    Backend: "Backend Developer",
    FullStack: "Full Stack Developer",
    Data: "Data Engineer / Analyst",
    PM: "Product Manager",
    MobileEngineer: "Mobile Engineer",
};

const ROLE_TYPE_ORDER: RoleType[] = [
    "SDE",
    "SDET",
    "ML",
    "DevOps",
    "Frontend",
    "Backend",
    "FullStack",
    "Data",
    "PM",
    "MobileEngineer",
];

const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_PREFIX_RE = /^\d{4}-\d{2}-\d{2}T/;

const parseInterviewDate = (value: string): Date | null => {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return startOfDay(parsed);
};

const getInterviewDateOnly = (value: string): string | null => {
    if (ISO_DATE_ONLY_RE.test(value)) return value;
    if (ISO_DATE_TIME_PREFIX_RE.test(value)) return value.slice(0, 10);

    const parsed = parseInterviewDate(value);
    if (!parsed) return null;
    return format(parsed, "yyyy-MM-dd");
};

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
    const sprints = useStore((state) => state.sprints);
    const updateApplication = useStore((state) => state.updateApplication);
    const updateApplicationAPI = useStore((state) => state.updateApplicationAPI);
    const deleteApplicationAPI = useStore((state) => state.deleteApplicationAPI);
    const addSprint = useStore((state) => state.addSprint);
    const updateSprint = useStore((state) => state.updateSprint);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery] = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

    // State for PrepDetailPanel
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [isPrepPanelOpen, setIsPrepPanelOpen] = useState(false);
    const [feedbackApplicationId, setFeedbackApplicationId] = useState<string | null>(
        null
    );

    const [interviewSetup, setInterviewSetup] = useState<{
        applicationId: string;
        interviewDate: string;
        roleType: RoleType;
        previousStatus: ApplicationStatus;
        statusPersisted: boolean;
    } | null>(null);
    const [interviewSetupError, setInterviewSetupError] = useState<string | null>(
        null
    );

    const cancelInterviewSetup = useCallback(() => {
        if (interviewSetup && interviewSetup.previousStatus !== "interview") {
            updateApplication(interviewSetup.applicationId, {
                status: interviewSetup.previousStatus,
            });
            if (interviewSetup.statusPersisted) {
                void updateApplicationAPI(interviewSetup.applicationId, {
                    status: interviewSetup.previousStatus,
                }).catch((error) => {
                    console.error(
                        "Failed to revert application status after interview setup cancel:",
                        error
                    );
                });
            }
        }

        setInterviewSetup(null);
        setInterviewSetupError(null);
    }, [interviewSetup, updateApplication, updateApplicationAPI]);

    useEffect(() => {
        if (!interviewSetup) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            cancelInterviewSetup();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [cancelInterviewSetup, interviewSetup]);

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

    const ensureSprintForInterview = (
        applicationId: string,
        interviewDate: Date,
        roleType: RoleType
    ) => {
        const relatedSprints = sprints.filter(
            (sprint) => sprint.applicationId === applicationId
        );

        const activeSprints = relatedSprints.filter(
            (sprint) => sprint.status === "active"
        );

        const candidates = activeSprints.length > 0 ? activeSprints : relatedSprints;
        const canonical = candidates
            .slice()
            .sort((a, b) => {
                const aCreatedAt = new Date(a.createdAt).getTime();
                const bCreatedAt = new Date(b.createdAt).getTime();

                if (Number.isNaN(aCreatedAt) && Number.isNaN(bCreatedAt)) {
                    return b.id.localeCompare(a.id);
                }
                if (Number.isNaN(aCreatedAt)) return 1;
                if (Number.isNaN(bCreatedAt)) return -1;

                const createdAtDelta = bCreatedAt - aCreatedAt;
                if (createdAtDelta !== 0) return createdAtDelta;
                return b.id.localeCompare(a.id);
            })[0];

        const nextSprint = generateSprint(applicationId, interviewDate, roleType);

        if (!canonical) {
            addSprint(nextSprint);
            return;
        }

        if (relatedSprints.length > 1) {
            console.warn(
                "KanbanBoard: multiple sprints found for application; using canonical sprint",
                {
                    applicationId,
                    sprintIds: relatedSprints.map((s) => s.id),
                    canonicalSprintId: canonical.id,
                }
            );
        }

        if (canonical.status === "active") {
            const shouldReplace = window.confirm(
                "An interview prep sprint already exists for this application. Regenerate it? This will replace your existing plan and reset any progress."
            );
            if (!shouldReplace) return;
        }

        updateSprint(canonical.id, {
            interviewDate: nextSprint.interviewDate,
            roleType: nextSprint.roleType,
            totalDays: nextSprint.totalDays,
            dailyPlans: nextSprint.dailyPlans,
            status: nextSprint.status,
            createdAt: nextSprint.createdAt,
        });

        for (const duplicate of relatedSprints) {
            if (duplicate.id === canonical.id) continue;
            if (duplicate.status !== "active") continue;
            updateSprint(duplicate.id, { status: "expired" });
        }
    };

    const handleDrop = async (
        e: DragEvent<HTMLDivElement>,
        newStatus: ApplicationStatus
    ) => {
        e.preventDefault();
        let rollbackStatus: (() => void) | null = null;
        try {
            const appId = e.dataTransfer.getData(DRAG_DATA_KEY);

            if (!appId) return;
            const app = applications.find((a) => a.id === appId);
            if (!app) return;
            const previousStatus = app.status;
            rollbackStatus = () => {
                updateApplication(appId, { status: previousStatus });
            };

            if (newStatus === "interview") {
                const interviewDateIso = app.interviewDate;
                const roleType = app.roleType;
                const needsInterviewDetails = !interviewDateIso || !roleType;

                if (needsInterviewDetails) {
                    updateApplication(appId, { status: "interview" });
                    let statusPersisted = false;
                    try {
                        await updateApplicationAPI(appId, { status: "interview" });
                        statusPersisted = true;
                    } catch (error) {
                        updateApplication(appId, { status: previousStatus });
                        console.error(
                            "Failed to persist interview status before opening setup modal:",
                            error
                        );
                        return;
                    }

                    setInterviewSetupError(null);
                    const existingDateOnly = interviewDateIso
                        ? getInterviewDateOnly(interviewDateIso)
                        : null;
                    setInterviewSetup({
                        applicationId: app.id,
                        interviewDate:
                            existingDateOnly ??
                            format(
                                addDays(new Date(), DEFAULT_INTERVIEW_OFFSET_DAYS),
                                "yyyy-MM-dd"
                            ),
                        roleType: roleType ?? "SDE",
                        previousStatus,
                        statusPersisted,
                    });
                    return;
                }

                const normalizedExistingDate = parseInterviewDate(interviewDateIso);
                const normalizedToday = startOfDay(new Date());
                const daysUntilInterview = differenceInDays(
                    normalizedExistingDate ?? normalizedToday,
                    normalizedToday
                );

                if (
                    !normalizedExistingDate ||
                    daysUntilInterview < 0
                ) {
                    updateApplication(appId, { status: "interview" });
                    let statusPersisted = false;
                    try {
                        await updateApplicationAPI(appId, { status: "interview" });
                        statusPersisted = true;
                    } catch (error) {
                        updateApplication(appId, { status: previousStatus });
                        console.error(
                            "Failed to persist interview status for invalid-date setup flow:",
                            error
                        );
                        return;
                    }

                    setInterviewSetup({
                        applicationId: app.id,
                        interviewDate: format(
                            addDays(new Date(), DEFAULT_INTERVIEW_OFFSET_DAYS),
                            "yyyy-MM-dd"
                        ),
                        roleType: roleType ?? "SDE",
                        previousStatus,
                        statusPersisted,
                    });
                    setInterviewSetupError(
                        "The stored interview date is invalid or in the past. Please confirm an updated date to generate a sprint."
                    );
                    return;
                }

                updateApplication(appId, { status: "interview" });
                await updateApplicationAPI(appId, { status: "interview" });
                ensureSprintForInterview(app.id, normalizedExistingDate, roleType);
                return;
            }

            updateApplication(appId, { status: newStatus });
            await updateApplicationAPI(appId, { status: newStatus });

            if (newStatus === "rejected") {
                const relatedSprints = sprints.filter(
                    (sprint) => sprint.applicationId === app.id
                );
                for (const sprint of relatedSprints) {
                    if (sprint.status !== "active") continue;
                    updateSprint(sprint.id, { status: "expired" });
                }
            }
        } catch (error) {
            rollbackStatus?.();
            console.error("Failed to update application status from pipeline:", error);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownPosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleCardClick = (appId: string, e: React.MouseEvent) => {
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

        setSelectedAppId(appId);
        setIsPrepPanelOpen(true);
    };

    const handleClosePrepPanel = () => {
        setIsPrepPanelOpen(false);
        setSelectedAppId(null);
    };

    // Calculate days until interview
    const getDaysUntilInterview = (interviewDate: string | undefined) => {
        if (!interviewDate) return null;
        const parsed = parseInterviewDate(interviewDate);
        if (!parsed) return null;
        return differenceInDays(parsed, startOfDay(new Date()));
    };

    return (
        <>
            <div className="h-full bg-background p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <h2 className="text-lg font-semibold text-foreground">Search</h2>
                        <div className="relative flex-1 sm:w-80">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {statusColumns.map((column) => {
                        const columnApps = applicationsByStatus[column.status];

                        return (
                            <div
                                key={column.status}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.status)}
                                className="flex flex-col min-h-[400px] bg-card rounded-lg border border-border"
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between p-3 border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${column.color}`} />
                                        <h3 className="font-semibold text-sm text-foreground">
                                            {column.label}
                                        </h3>
                                    </div>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                        {columnApps.length}
                                    </span>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                    {columnApps.length === 0 ? (
                                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                                            No applications
                                        </div>
                                    ) : (
                                        columnApps.map((app) => {
                                            const daysUntil = getDaysUntilInterview(app.interviewDate);
                                            const parsedInterviewDate = app.interviewDate
                                                ? parseInterviewDate(app.interviewDate)
                                                : null;
                                            const isUrgent =
                                                daysUntil !== null &&
                                                daysUntil <= 3 &&
                                                daysUntil >= 0;

                                            const offerTotalLabel =
                                                app.status === "offer"
                                                    ? formatOfferTotalCTC(app.offerDetails)
                                                    : null;

                                            const roundTheme = app.currentRound
                                                ? getInterviewRoundTheme(app.currentRound)
                                                : undefined;

                                            let roundBadge: React.ReactNode = null;
                                            if (app.currentRound) {
                                                if (roundTheme) {
                                                    const RoundIcon = roundTheme.icon;
                                                    roundBadge = (
                                                        <div
                                                            className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${roundTheme.badgeClassName}`}
                                                        >
                                                            <RoundIcon className="w-3.5 h-3.5" />
                                                            {roundTheme.label}
                                                        </div>
                                                    );
                                                } else {
                                                    roundBadge = (
                                                        <div
                                                            className="mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 bg-muted text-muted-foreground"
                                                            title="Unknown interview round"
                                                        >
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                            Unknown: {app.currentRound}
                                                        </div>
                                                    );
                                                }
                                            }

                                            return (
                                                <div
                                                    key={app.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                                    onMouseDown={handleMouseDown}
                                                    onClick={(e) => handleCardClick(app.id, e)}
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
                                                                void deleteApplicationAPI(app.id).catch((error) => {
                                                                    console.error(
                                                                        "Failed to delete application from pipeline:",
                                                                        error
                                                                    );
                                                                });
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

                                                    {app.status === "offer" && (offerTotalLabel || app.offerDetails?.workMode) && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {offerTotalLabel && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                                                                    CTC: {offerTotalLabel}
                                                                </span>
                                                            )}
                                                            {app.offerDetails?.workMode && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    {app.offerDetails.workMode}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Interview Date with countdown */}
                                                    {parsedInterviewDate && (
                                                        <div className={`flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded ${isUrgent
                                                            ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-200"
                                                            : "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-200"
                                                            }`}>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {format(parsedInterviewDate, "MMM d")}
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
                                                    {roundBadge}

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
            {isPrepPanelOpen && selectedAppId && (
                <PrepDetailPanel
                    appId={selectedAppId}
                    isOpen={isPrepPanelOpen}
                    onClose={handleClosePrepPanel}
                />
            )}

            <RoundFeedbackPanel
                applicationId={feedbackApplicationId}
                isOpen={feedbackApplicationId !== null}
                onClose={() => setFeedbackApplicationId(null)}
            />

            {interviewSetup && (
                <div
                    className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (e.target === e.currentTarget) {
                            cancelInterviewSetup();
                        }
                    }}
                >
                    <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    Move to Interview
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Set interview date and role to generate a sprint
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    cancelInterviewSetup();
                                }}
                                className="p-2 hover:bg-muted rounded-lg"
                                aria-label="Close"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Interview date
                                </label>
                                <input
                                    type="date"
                                    value={interviewSetup.interviewDate}
                                    onChange={(e) => {
                                        setInterviewSetupError(null);
                                        setInterviewSetup((prev) =>
                                            prev
                                                ? {
                                                    ...prev,
                                                    interviewDate: e.target.value,
                                                }
                                                : prev
                                        );
                                    }}
                                    min={format(new Date(), "yyyy-MM-dd")}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Role type
                                </label>
                                <select
                                    value={interviewSetup.roleType}
                                    onChange={(e) => {
                                        setInterviewSetupError(null);
                                        setInterviewSetup((prev) =>
                                            prev
                                                ? {
                                                    ...prev,
                                                    roleType: e.target.value as RoleType,
                                                }
                                                : prev
                                        );
                                    }}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                                >
                                    {ROLE_TYPE_ORDER.map((role) => (
                                        <option key={role} value={role}>
                                            {ROLE_TYPE_LABELS[role]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {interviewSetupError && (
                                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                                    {interviewSetupError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        cancelInterviewSetup();
                                    }}
                                    className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void (async () => {
                                            if (!interviewSetup) return;
                                            if (!interviewSetup.interviewDate) {
                                                setInterviewSetupError(
                                                    "Please select an interview date."
                                                );
                                                return;
                                            }

                                            const parsedDate = parseInterviewDate(
                                                interviewSetup.interviewDate
                                            );
                                            if (!parsedDate) {
                                                setInterviewSetupError(
                                                    "Interview date is invalid."
                                                );
                                                return;
                                            }

                                            const normalizedToday = startOfDay(new Date());
                                            if (
                                                differenceInDays(
                                                    parsedDate,
                                                    normalizedToday
                                                ) < 0
                                            ) {
                                                setInterviewSetupError(
                                                    "Interview date must be today or later."
                                                );
                                                return;
                                            }

                                            await updateApplicationAPI(
                                                interviewSetup.applicationId,
                                                {
                                                    status: "interview",
                                                    interviewDate:
                                                        interviewSetup.interviewDate,
                                                    roleType: interviewSetup.roleType,
                                                }
                                            );
                                            updateApplication(
                                                interviewSetup.applicationId,
                                                {
                                                    status: "interview",
                                                    interviewDate:
                                                        interviewSetup.interviewDate,
                                                    roleType: interviewSetup.roleType,
                                                }
                                            );

                                            ensureSprintForInterview(
                                                interviewSetup.applicationId,
                                                parsedDate,
                                                interviewSetup.roleType
                                            );

                                            setInterviewSetup(null);
                                            setInterviewSetupError(null);
                                        })().catch((error) => {
                                            console.error(
                                                "Failed to confirm interview details from pipeline:",
                                                error
                                            );
                                            setInterviewSetupError(
                                                "Unable to save interview details. Please try again."
                                            );
                                        });
                                    }}
                                    className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
