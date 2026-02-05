"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InterviewRoundType, OfferDetails, RoleType, Sprint } from "@/types";
import { getInterviewRoundTheme } from "@/lib/interviewRoundRegistry";
import {
    getRoundPrepContent,
    getAvailableRounds,
} from "@/data/prep-templates";
import { getCompanyPrepData, ScrapedInterviewData } from "@/services/scraper";
import { useStore } from "@/lib/store";
import {
    formatOfferTotalCTC,
    getOfferCurrency,
    parseEquityField,
    parseNumberField,
} from "@/lib/offer-details";
import { format, parseISO, differenceInDays, startOfDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    X,
    Building2,
    Briefcase,
    Calendar,
    Clock,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Lightbulb,
    HelpCircle,
    Target,
    Loader2,
    AlertTriangle,
    ExternalLink,
} from "lucide-react";
import { getMissingPrerequisites } from "@/services/PrepValidator";

interface PrepDetailPanelProps {
    appId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Delay close slightly to avoid flicker if the application list is briefly replaced.
const CLOSE_ON_MISSING_APP_DELAY_MS = 200;

// Used only when a role has no configured rounds (or `availableRounds[0]` is missing).
const SELECTED_ROUND_FALLBACK: InterviewRoundType = "TechnicalRound1";

export function PrepDetailPanel({
    appId,
    isOpen,
    onClose,
}: PrepDetailPanelProps) {
    const application = useStore((state) =>
        state.applications.find((app) => app.id === appId)
    );
    const updateApplication = useStore((state) => state.updateApplication);
    const getTopicCompletion = useStore((state) => state.getTopicCompletion);
    const sprints = useStore((state) => state.sprints);

    const sprintForApplication = useMemo(() => {
        let latestSprint: Sprint | null = null;
        let latestSprintCreatedAtTime = Number.NEGATIVE_INFINITY;

        for (const sprint of sprints) {
            if (sprint.applicationId !== appId) continue;

            if (sprint.status === "active") return sprint;

            const createdAtDate = safeParseISODate(sprint.createdAt);
            if (!createdAtDate) continue;

            const createdAtTime = createdAtDate.getTime();

            if (createdAtTime > latestSprintCreatedAtTime) {
                latestSprint = sprint;
                latestSprintCreatedAtTime = createdAtTime;
            }
        }

        return latestSprint;
    }, [appId, sprints]);

    const offerBenefitsKey = application?.offerDetails?.benefits?.join("\n") ?? "";
    const [offerBenefitsText, setOfferBenefitsText] = useState(offerBenefitsKey);
    const [isOfferBenefitsDirty, setIsOfferBenefitsDirty] = useState(false);

    const offerBenefitsTextRef = useRef(offerBenefitsKey);
    const isOfferBenefitsDirtyRef = useRef(false);

    useEffect(() => {
        offerBenefitsTextRef.current = offerBenefitsText;
    }, [offerBenefitsText]);

    useEffect(() => {
        isOfferBenefitsDirtyRef.current = isOfferBenefitsDirty;
    }, [isOfferBenefitsDirty]);

    useEffect(() => {
        if (isOfferBenefitsDirty) return;
        setOfferBenefitsText(offerBenefitsKey);
    }, [isOfferBenefitsDirty, offerBenefitsKey]);

    const updateOfferDetails = useCallback(
        (patch: Partial<OfferDetails>) => {
            if (!application) return;

            const prev = application.offerDetails ?? {
                currency: "INR",
                benefits: [],
            };

            const next: OfferDetails = {
                ...prev,
                ...patch,
                currency: patch.currency ?? prev.currency ?? "INR",
                benefits: patch.benefits ?? prev.benefits ?? [],
            };

            updateApplication(appId, { offerDetails: next });
        },
        [appId, application, updateApplication]
    );

    const commitBenefits = useCallback(() => {
        const parsedBenefits = offerBenefitsText
            .split(/\n|,/)
            .map((b) => b.trim())
            .filter(Boolean);
        updateOfferDetails({ benefits: parsedBenefits });
        setIsOfferBenefitsDirty(false);
    }, [offerBenefitsText, updateOfferDetails]);

    useEffect(() => {
        return () => {
            if (!isOfferBenefitsDirtyRef.current) return;

            const parsedBenefits = offerBenefitsTextRef.current
                .split(/\n|,/)
                .map((b) => b.trim())
                .filter(Boolean);
            updateOfferDetails({ benefits: parsedBenefits });
        };
    }, [appId, updateOfferDetails]);

    // Tracks whether the current `appId` has been found in the store at least once.
    const [hadApplication, setHadApplication] = useState(false);

    // Scraper state
    const [scrapedContent, setScrapedContent] = useState<ScrapedInterviewData | null>(null);
    const [isLoadingScraped, setIsLoadingScraped] = useState(false);

    const [jobDescriptionUrlDraft, setJobDescriptionUrlDraft] = useState("");
    const [notesDraft, setNotesDraft] = useState("");

    // Only the latest scrape request is allowed to update local state.
    const activeScrapeAbortController = useRef<AbortController | null>(null);
    const scrapeRequestId = useRef(0);
    const lastSyncedApplicationId = useRef<string | null>(null);
    const lastSavedJobDescriptionUrl = useRef<string>("");
    // Notes are normalized via `normalizeNotesForSave` before saving/comparing.
    const lastSavedNotes = useRef<string>("");

    const resetScrapeState = useCallback(() => {
        if (activeScrapeAbortController.current && !activeScrapeAbortController.current.signal.aborted) {
            activeScrapeAbortController.current.abort();
        }
        activeScrapeAbortController.current = null;

        setScrapedContent(null);
        setIsLoadingScraped(false);
    }, []);

    useEffect(() => {
        if (!isOpen || !application) return;
        if (lastSyncedApplicationId.current === application.id) return;

        lastSyncedApplicationId.current = application.id;
        const jobDescriptionUrl = (application.jobDescriptionUrl ?? "").trim();
        const notes = application.notes ?? "";

        setJobDescriptionUrlDraft(jobDescriptionUrl);
        setNotesDraft(notes);

        lastSavedJobDescriptionUrl.current = jobDescriptionUrl;
        lastSavedNotes.current = normalizeNotesForSave(notes);
    }, [application, isOpen]);

    const saveJobDescriptionUrl = useCallback(() => {
        const nextJobDescriptionUrl = jobDescriptionUrlDraft.trim();
        if (nextJobDescriptionUrl === lastSavedJobDescriptionUrl.current) return;

        updateApplication(appId, { jobDescriptionUrl: nextJobDescriptionUrl });
        lastSavedJobDescriptionUrl.current = nextJobDescriptionUrl;
    }, [appId, jobDescriptionUrlDraft, updateApplication]);

    const saveNotes = useCallback(() => {
        const nextNotes = normalizeNotesForSave(notesDraft);
        if (nextNotes === lastSavedNotes.current) return;

        updateApplication(appId, { notes: nextNotes });
        lastSavedNotes.current = nextNotes;
    }, [appId, notesDraft, updateApplication]);

    // Idempotent: safe to call multiple times during close/unmount.
    const flushApplicationEdits = useCallback(() => {
        saveJobDescriptionUrl();
        saveNotes();
    }, [saveJobDescriptionUrl, saveNotes]);

    useEffect(() => {
        if (!isOpen) return;
        return () => {
            flushApplicationEdits();
        };
    }, [flushApplicationEdits, isOpen]);

    const handleClose = useCallback(() => {
        flushApplicationEdits();
        resetScrapeState();

        onClose();
    }, [flushApplicationEdits, onClose, resetScrapeState]);

    useEffect(() => {
        if (!isOpen) {
            resetScrapeState();
            setHadApplication(false);
            lastSyncedApplicationId.current = null;
        }
    }, [isOpen, resetScrapeState]);

    useEffect(() => {
        setHadApplication(false);
        setIsOfferBenefitsDirty(false);
    }, [appId]);

    useEffect(() => {
        if (isOpen && application) {
            setHadApplication(true);
        }
    }, [application, isOpen]);

    useEffect(() => {
        if (!isOpen || application || !hadApplication) return;

        const timeout = setTimeout(() => {
            handleClose();
        }, CLOSE_ON_MISSING_APP_DELAY_MS);

        return () => clearTimeout(timeout);
    }, [application, appId, hadApplication, handleClose, isOpen]);

    const company = application?.company ?? null;
    const role = application?.role ?? null;
    const roleType: RoleType = application ? application.roleType || inferRoleType(application.role) : "SDE";

    const availableRounds = roleType ? getAvailableRounds(roleType) : [];
    const defaultRound = availableRounds[0] ?? SELECTED_ROUND_FALLBACK;
    const selectedRoundFromStore = application?.currentRound;
    const selectedRound =
        selectedRoundFromStore && availableRounds.includes(selectedRoundFromStore)
            ? selectedRoundFromStore
            : defaultRound;

    const scrapeKey = isOpen && company && role ? `${appId}|${company}|${role}|${roleType}|${selectedRound}` : null;

    // Fetch scraped data when panel opens
    // Uses AbortController to prevent stale responses from overwriting current data
    useEffect(() => {
        if (!scrapeKey || !company || !role) {
            resetScrapeState();
            return;
        }

        const abortController = new AbortController();
        const requestId = (scrapeRequestId.current += 1);

        activeScrapeAbortController.current?.abort();
        activeScrapeAbortController.current = abortController;

        setScrapedContent(null);

        setIsLoadingScraped(true);
        getCompanyPrepData(company, role, roleType, selectedRound)
            .then((data) => {
                if (abortController.signal.aborted) return;
                if (scrapeRequestId.current !== requestId) return;
                setScrapedContent(data);
            })
            .catch((err) => {
                if (abortController.signal.aborted) return;
                if (scrapeRequestId.current !== requestId) return;
                console.error("Error fetching scraped data:", err);
            })
            .finally(() => {
                if (abortController.signal.aborted) return;
                if (scrapeRequestId.current !== requestId) return;
                setIsLoadingScraped(false);
            });

        return () => {
            abortController.abort();
            if (activeScrapeAbortController.current === abortController) {
                activeScrapeAbortController.current = null;
            }
        };
    }, [company, resetScrapeState, role, roleType, scrapeKey, selectedRound]);

    if (!isOpen || !application) return null;

    const prepContent = getRoundPrepContent(roleType, selectedRound);

    const today = startOfDay(new Date());

    const interviewDate = safeParseISODate(application.interviewDate);

    const daysUntilInterview = interviewDate
        ? differenceInDays(startOfDay(interviewDate), today)
        : null;

    const sprintStatusSummary = sprintForApplication
        ? (() => {
            // `completedDays` drives the calendar progress; task counts drive the overall percent.
            let completedDays = 0;
            let totalTasks = 0;
            let completedTasks = 0;

            for (const day of sprintForApplication.dailyPlans) {
                if (day.completed) completedDays += 1;

                for (const block of day.blocks) {
                    totalTasks += block.tasks.length;

                    for (const task of block.tasks) {
                        if (task.completed) completedTasks += 1;
                    }
                }
            }

            const percent =
                totalTasks === 0
                    ? 0
                    : Math.round((completedTasks / totalTasks) * 100);
            const clampedPercent = Math.max(0, Math.min(100, percent));

            const sprintInterviewDate = safeParseISODate(
                sprintForApplication.interviewDate
            );
            const daysDelta = sprintInterviewDate
                ? differenceInDays(startOfDay(sprintInterviewDate), today)
                : 0;

            const overdueDays =
                sprintForApplication.status === "expired" && daysDelta < 0
                    ? Math.abs(daysDelta)
                    : null;

            const daysLeft =
                sprintForApplication.status === "completed"
                    ? 0
                    : Math.max(0, daysDelta);

            return {
                totalTasks,
                completedTasks,
                percent: clampedPercent,
                daysLeft,
                overdueDays,
                completedDays,
            };
        })()
        : null;

    const jobDescriptionHref = (() => {
        const raw = jobDescriptionUrlDraft.trim();
        if (!raw) return null;

        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw);
        const withScheme = hasScheme ? raw : `https://${raw}`;

        try {
            const url = new URL(withScheme);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return null;
            }
            return url.toString();
        } catch {
            return null;
        }
    })();

    const handleRoundChange = (round: InterviewRoundType) => {
        updateApplication(appId, { currentRound: round });
    };

    // Helper to check if a topic is completed (using store's centralized matching)
    const isTopicCompleted = (topicName: string): { completed: boolean; date?: string } => {
        const match = getTopicCompletion(topicName);
        if (match) {
            return {
                completed: true,
                date: format(parseISO(match.completedAt), 'MMM d')
            };
        }
        return { completed: false };
    };

    const offerDetails = application.offerDetails;
    const offerCurrency = getOfferCurrency(offerDetails);
    const offerTotalLabel = formatOfferTotalCTC(offerDetails) ?? "—";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-border">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{application.company}</h2>
                                <div className="flex items-center gap-3 mt-1 text-white/90">
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="w-4 h-4" />
                                        {application.role}
                                    </span>
                                    {application.interviewDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {format(parseISO(application.interviewDate), "MMM d, yyyy")}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Countdown Badge */}
                    {daysUntilInterview !== null && daysUntilInterview >= 0 && (
                        <div className="mt-4 flex items-center gap-2">
                            <div className="bg-white/20 px-4 py-2 rounded-full flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                <span className="font-semibold">
                                    {daysUntilInterview === 0
                                        ? "Interview Today!"
                                        : `${daysUntilInterview} days until interview`}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Round Selector Tabs */}
                {application.status !== "offer" && (
                    <div className="border-b border-border bg-muted/40 px-6 py-3">
                        <div className="flex gap-2 overflow-x-auto">
                            {availableRounds.map((roundType) => {
                                const roundTheme = getInterviewRoundTheme(roundType);
                                const RoundIcon = roundTheme.icon;
                                const isSelected = selectedRound === roundType;

                                return (
                                    <button
                                        key={roundType}
                                        onClick={() => handleRoundChange(roundType)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${isSelected
                                            ? roundTheme.tabActiveClassName
                                            : roundTheme.tabInactiveClassName
                                            }`}
                                    >
                                        <RoundIcon className="w-4 h-4" />
                                        {roundTheme.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {application.status === "offer" ? (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-5 border border-green-200 dark:border-green-800">
                            <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-100 mb-4 flex items-center gap-2">
                                <Briefcase className="w-5 h-5" />
                                Offer
                            </h3>

                            <div className="text-sm text-emerald-800 dark:text-emerald-200 mb-4">
                                Total CTC:{" "}
                                <span className="font-semibold">{offerTotalLabel}</span>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <input
                                        value={offerDetails?.currency ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({ currency: e.target.value })
                                        }
                                        placeholder={offerCurrency}
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Work mode</label>
                                    <select
                                        value={offerDetails?.workMode ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({
                                                workMode: e.target.value
                                                    ? (e.target.value as OfferDetails["workMode"])
                                                    : undefined,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    >
                                        <option value="">Select…</option>
                                        <option value="WFH">WFH</option>
                                        <option value="Hybrid">Hybrid</option>
                                        <option value="Office">Office</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total CTC</label>
                                    <input
                                        type="number"
                                        value={offerDetails?.totalCTC ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({
                                                totalCTC: parseNumberField(e.target.value),
                                            })
                                        }
                                        placeholder="e.g., 18"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base salary</label>
                                    <input
                                        type="number"
                                        value={offerDetails?.baseSalary ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({
                                                baseSalary: parseNumberField(e.target.value),
                                            })
                                        }
                                        placeholder="e.g., 14"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus</label>
                                    <input
                                        type="number"
                                        value={offerDetails?.bonus ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({
                                                bonus: parseNumberField(e.target.value),
                                            })
                                        }
                                        placeholder="e.g., 2"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Equity</label>
                                    <input
                                        value={
                                            offerDetails?.equity === undefined
                                                ? ""
                                                : String(offerDetails.equity)
                                        }
                                        onChange={(e) =>
                                            updateOfferDetails({
                                                equity: parseEquityField(e.target.value),
                                            })
                                        }
                                        placeholder="e.g., 10k RSUs or 1"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        value={offerDetails?.location ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({ location: e.target.value })
                                        }
                                        placeholder="e.g., Bangalore"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Joining date</label>
                                    <input
                                        type="date"
                                        value={offerDetails?.joiningDate ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({ joiningDate: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-green-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notice period</label>
                                    <input
                                        value={offerDetails?.noticePeriod ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({ noticePeriod: e.target.value })
                                        }
                                        placeholder="e.g., 30 days"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
                                    <textarea
                                        value={offerBenefitsText}
                                        onChange={(e) => {
                                            setIsOfferBenefitsDirty(true);
                                            setOfferBenefitsText(e.target.value);
                                        }}
                                        onBlur={commitBenefits}
                                        rows={4}
                                        placeholder="One per line (or comma-separated)"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">Saved on blur</div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={offerDetails?.notes ?? ""}
                                        onChange={(e) =>
                                            updateOfferDetails({ notes: e.target.value })
                                        }
                                        rows={4}
                                        placeholder="Any extra context"
                                        className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="md:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
                            <h3 className="font-semibold text-lg text-foreground mb-4">
                                Application details
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Job description URL
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="url"
                                            value={jobDescriptionUrlDraft}
                                            onChange={(e) =>
                                                setJobDescriptionUrlDraft(e.target.value)
                                            }
                                            onBlur={saveJobDescriptionUrl}
                                            placeholder="https://..."
                                        />
                                        {jobDescriptionHref ? (
                                            <a
                                                href={jobDescriptionHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-muted"
                                                aria-label="Open job description"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        ) : null}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Notes
                                    </label>
                                    <Textarea
                                        value={notesDraft}
                                        onChange={(e) => setNotesDraft(e.target.value)}
                                        onBlur={saveNotes}
                                        placeholder="Add anything you want to remember about this application..."
                                        className="min-h-[96px]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                            <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-100 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Prep plan
                            </h3>

                            {sprintForApplication && sprintStatusSummary ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-emerald-800 dark:text-emerald-200">Sprint</span>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full font-medium ${sprintForApplication.status === "completed"
                                                ? "bg-emerald-200 text-emerald-900"
                                                : sprintForApplication.status === "expired"
                                                    ? "bg-amber-200 text-amber-900"
                                                    : "bg-emerald-600 text-white"
                                                }`}
                                        >
                                            {sprintForApplication.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-emerald-800 dark:text-emerald-200">
                                            {sprintStatusSummary.overdueDays !== null
                                                ? "Overdue"
                                                : "Days left"}
                                        </span>
                                        <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                                            {sprintStatusSummary.overdueDays ??
                                                sprintStatusSummary.daysLeft}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-emerald-800 dark:text-emerald-200">Completed</span>
                                        <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                                            {sprintStatusSummary.percent}%
                                        </span>
                                    </div>

                                    <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${sprintStatusSummary.percent}%`,
                                            }}
                                        />
                                    </div>

                                    <p className="text-xs text-emerald-800 dark:text-emerald-200">
                                        {sprintStatusSummary.completedDays}/{
                                            sprintForApplication.dailyPlans.length
                                        } days • {sprintStatusSummary.completedTasks}/
                                        {sprintStatusSummary.totalTasks} tasks
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                                    No sprint yet. Create one to get a day-by-day plan.
                                </p>
                            )}
                        </div>
                    </div>
                    {application.status !== "offer" && (
                        prepContent ? (
                            <>
                                {/* Focus Areas */}
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
                                    <h3 className="font-semibold text-lg text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Focus Areas
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {prepContent.focusAreas.map((area, idx) => (
                                            <span
                                                key={idx}
                                                className="bg-background px-3 py-1.5 rounded-full text-sm font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                            >
                                                {area}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Time Allocation */}
                                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <span className="text-amber-800 dark:text-amber-200 font-medium">
                                        Recommended: {prepContent.timeAllocation}
                                    </span>
                                </div>

                                {/* Key Topics */}
                                <div>
                                    <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        Key Topics to Prepare
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {prepContent.keyTopics.map((topic) => {
                                            const completion = isTopicCompleted(topic.name);
                                            const missingPrerequisites = completion.completed
                                                ? getMissingPrerequisites(topic.name, getTopicCompletion)
                                                : [];
                                            const hasMissingPrerequisites = missingPrerequisites.length > 0;
                                            const missingPrerequisitesLabel = hasMissingPrerequisites
                                                ? `Missing prerequisite${missingPrerequisites.length === 1 ? "" : "s"}: ${missingPrerequisites.join(
                                                    ", "
                                                )}`
                                                : "";
                                            const missingPrerequisitesTooltipId = `missing-prerequisites-${topic.name
                                                .replace(/[^a-z0-9]+/gi, "-")
                                                .toLowerCase()}`;

                                            return (
                                                <div
                                                    key={topic.name}
                                                    className={`rounded-xl p-4 border transition-all ${completion.completed
                                                        ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800 ring-2 ring-green-200 dark:ring-green-900"
                                                        : topic.priority === "high"
                                                            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                                                            : topic.priority === "medium"
                                                                ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
                                                                : "bg-muted/40 border-border"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {completion.completed && (
                                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            )}
                                                            <h4 className={`font-semibold ${completion.completed ? "text-green-800" : "text-gray-800"}`}>
                                                                {topic.name}
                                                            </h4>
                                                            {completion.completed && hasMissingPrerequisites && (
                                                                <span className="relative inline-flex items-center group">
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex items-center text-amber-600"
                                                                        aria-describedby={missingPrerequisitesTooltipId}
                                                                    >
                                                                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                                                                        <span className="sr-only">{missingPrerequisitesLabel}</span>
                                                                    </button>
                                                                    <span
                                                                        id={missingPrerequisitesTooltipId}
                                                                        role="tooltip"
                                                                        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max max-w-[240px] -translate-x-1/2 whitespace-normal rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                                                                    >
                                                                        {missingPrerequisitesLabel}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        {completion.completed ? (
                                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                                                ✓ Studied {completion.date}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${topic.priority === "high"
                                                                    ? "bg-red-100 text-red-700"
                                                                    : topic.priority === "medium"
                                                                        ? "bg-yellow-100 text-yellow-700"
                                                                        : "bg-gray-100 text-gray-600"
                                                                    }`}
                                                            >
                                                                {topic.priority} priority
                                                            </span>
                                                        )}
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {topic.subtopics.map((sub, subIdx) => (
                                                            <li
                                                                key={subIdx}
                                                                className={`text-sm flex items-start gap-2 ${completion.completed ? "text-green-700" : "text-gray-600"
                                                                    }`}
                                                            >
                                                                <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${completion.completed ? "text-green-500" : "text-gray-400"
                                                                    }`} />
                                                                {sub}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Common Questions */}
                                <div>
                                    <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                                        <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        Common Questions
                                    </h3>
                                    <div className="bg-card rounded-xl border border-border divide-y divide-border">
                                        {prepContent.commonQuestions.map((question, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                                            >
                                                <span className="text-muted-foreground font-mono text-sm w-6">
                                                    {(idx + 1).toString().padStart(2, "0")}
                                                </span>
                                                <span className="text-card-foreground">{question}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Scraped Company-Specific Content */}
                                {(isLoadingScraped || scrapedContent) && (
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                                        <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
                                            <Building2 className="w-5 h-5" />
                                            {application.company}-Specific Insights
                                        </h3>
                                        {isLoadingScraped ? (
                                            <div className="flex items-center gap-3 text-emerald-700">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Fetching company-specific interview tips...</span>
                                            </div>
                                        ) : scrapedContent ? (
                                            <div className="space-y-4">
                                                {scrapedContent.companyTips.length > 0 && (
                                                    <div>
                                                        <h4 className="font-medium text-emerald-800 mb-2">Tips:</h4>
                                                        <ul className="space-y-2">
                                                            {scrapedContent.companyTips.map((tip, idx) => (
                                                                <li key={idx} className="flex items-start gap-2 text-sm text-emerald-700">
                                                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                                                    {tip}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {scrapedContent.recentQuestions.length > 0 && (
                                                    <div>
                                                        <h4 className="font-medium text-emerald-800 mb-2">Recent Questions:</h4>
                                                        <ul className="space-y-2">
                                                            {scrapedContent.recentQuestions.map((q, idx) => (
                                                                <li key={idx} className="flex items-start gap-2 text-sm text-emerald-700">
                                                                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                                    {q}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <p className="text-xs text-emerald-600 mt-2">
                                                    Source: {scrapedContent.source} • Updated: {scrapedContent.fetchedAt}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {/* Tips */}
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                                    <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                                        <Lightbulb className="w-5 h-5" />
                                        Pro Tips
                                    </h3>
                                    <ul className="space-y-2">
                                        {prepContent.tips.map((tip, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-3 text-blue-800 dark:text-blue-200"
                                            >
                                                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                <p>No prep content available for this round.</p>
                                <p className="text-sm mt-2">Try selecting a different round type above.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

function safeParseISODate(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNotesForSave(value: string): string {
    // Preserve leading whitespace and internal formatting (e.g., indentation),
    // but trim trailing spaces/tabs at the end of the note to avoid noisy diffs and unnecessary saves.
    return value.replace(/[ \t]+$/u, "");
}

// Helper function to infer role type from role string
function inferRoleType(role: string): RoleType {
    const roleLower = role.toLowerCase();

    if (roleLower.includes('sdet') || roleLower.includes('test') || roleLower.includes('qa')) {
        return 'SDET';
    }
    if (roleLower.includes('ml') || roleLower.includes('machine learning') || roleLower.includes('ai')) {
        return 'ML';
    }
    if (roleLower.includes('devops') || roleLower.includes('sre') || roleLower.includes('infrastructure')) {
        return 'DevOps';
    }
    if (roleLower.includes('frontend') || roleLower.includes('front-end') || roleLower.includes('ui')) {
        return 'Frontend';
    }
    if (roleLower.includes('backend') || roleLower.includes('back-end') || roleLower.includes('server')) {
        return 'Backend';
    }
    if (roleLower.includes('fullstack') || roleLower.includes('full-stack') || roleLower.includes('full stack')) {
        return 'FullStack';
    }
    if (roleLower.includes('data engineer') || roleLower.includes('data analyst') || roleLower.includes('analytics')) {
        return 'Data';
    }
    if (roleLower.includes('product') || roleLower.includes('pm')) {
        return 'PM';
    }
    if (roleLower.includes('mobile') || roleLower.includes('ios') || roleLower.includes('android') || roleLower.includes('react native')) {
        return 'MobileEngineer';
    }

    // Default to SDE for general software roles
    return 'SDE';
}
