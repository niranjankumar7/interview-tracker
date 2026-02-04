"use client";

import { useState, useEffect } from "react";
import { Application, InterviewRoundType, RoleType } from "@/types";
import { getInterviewRoundTheme } from "@/lib/interviewRoundRegistry";
import {
    getRoundPrepContent,
    getAvailableRounds,
} from "@/data/prep-templates";
import { getCompanyPrepData, ScrapedInterviewData } from "@/services/scraper";
import { useStore } from "@/lib/store";
import { format, parseISO, differenceInDays } from "date-fns";
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
} from "lucide-react";
import { getMissingPrerequisites } from "@/services/PrepValidator";

interface PrepDetailPanelProps {
    application: Application;
    isOpen: boolean;
    onClose: () => void;
    onUpdateRound?: (round: InterviewRoundType) => void;
}

export function PrepDetailPanel({
    application,
    isOpen,
    onClose,
    onUpdateRound,
}: PrepDetailPanelProps) {
    // Determine role type - try to match from roleType or parse from role string
    const roleType = application.roleType || inferRoleType(application.role);
    const availableRounds = getAvailableRounds(roleType);
    const [selectedRound, setSelectedRound] = useState<InterviewRoundType>(() => {
        const rounds = getAvailableRounds(roleType);
        const preferredRound = application.currentRound;
        if (preferredRound && rounds.includes(preferredRound)) return preferredRound;

        return rounds[0] ?? "TechnicalRound1";
    });

    // Scraper state
    const [scrapedContent, setScrapedContent] = useState<ScrapedInterviewData | null>(null);
    const [isLoadingScraped, setIsLoadingScraped] = useState(false);

    const prepContent = getRoundPrepContent(roleType, selectedRound);

    // Access topic completion from global store (centralized matching logic)
    const getTopicCompletion = useStore((state) => state.getTopicCompletion);

    const daysUntilInterview = application.interviewDate
        ? differenceInDays(parseISO(application.interviewDate), new Date())
        : null;

    // Reset selected round when application changes and keep it within the available rounds
    useEffect(() => {
        const rounds = getAvailableRounds(roleType);
        const preferredRound = application.currentRound;
        const nextSelectedRound =
            preferredRound && rounds.includes(preferredRound)
                ? preferredRound
                : (rounds[0] ?? "TechnicalRound1");

        setSelectedRound(nextSelectedRound);
    }, [application.id, application.currentRound, roleType]);

    // Fetch scraped data when panel opens
    // Uses AbortController to prevent stale responses from overwriting current data
    useEffect(() => {
        const abortController = new AbortController();

        if (isOpen && application.company) {
            setIsLoadingScraped(true);
            getCompanyPrepData(application.company, application.role, roleType, selectedRound)
                .then(data => {
                    if (!abortController.signal.aborted) {
                        setScrapedContent(data);
                    }
                })
                .catch(err => {
                    if (!abortController.signal.aborted) {
                        console.error('Error fetching scraped data:', err);
                    }
                })
                .finally(() => {
                    if (!abortController.signal.aborted) {
                        setIsLoadingScraped(false);
                    }
                });
        }

        return () => abortController.abort();
    }, [isOpen, application.company, application.role, roleType, selectedRound]);

    const handleRoundChange = (round: InterviewRoundType) => {
        setSelectedRound(round);
        onUpdateRound?.(round);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
                            onClick={onClose}
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
                <div className="border-b bg-gray-50 px-6 py-3">
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {prepContent ? (
                        <>
                            {/* Focus Areas */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                                <h3 className="font-semibold text-lg text-indigo-900 mb-3 flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Focus Areas
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {prepContent.focusAreas.map((area, idx) => (
                                        <span
                                            key={idx}
                                            className="bg-white px-3 py-1.5 rounded-full text-sm font-medium text-indigo-700 border border-indigo-200"
                                        >
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Time Allocation */}
                            <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-4 border border-amber-200">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <span className="text-amber-800 font-medium">
                                    Recommended: {prepContent.timeAllocation}
                                </span>
                            </div>

                            {/* Key Topics */}
                            <div>
                                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-indigo-600" />
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
                                                    ? "bg-green-50 border-green-300 ring-2 ring-green-200"
                                                    : topic.priority === "high"
                                                        ? "bg-red-50 border-red-200"
                                                        : topic.priority === "medium"
                                                            ? "bg-yellow-50 border-yellow-200"
                                                            : "bg-gray-50 border-gray-200"
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
                                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-purple-600" />
                                    Common Questions
                                </h3>
                                <div className="bg-white rounded-xl border border-gray-200 divide-y">
                                    {prepContent.commonQuestions.map((question, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-gray-400 font-mono text-sm w-6">
                                                {(idx + 1).toString().padStart(2, "0")}
                                            </span>
                                            <span className="text-gray-700">{question}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scraped Company-Specific Content */}
                            {(isLoadingScraped || scrapedContent) && (
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                                    <h3 className="font-semibold text-lg text-emerald-900 mb-3 flex items-center gap-2">
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
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
                                <h3 className="font-semibold text-lg text-blue-900 mb-3 flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5" />
                                    Pro Tips
                                </h3>
                                <ul className="space-y-2">
                                    {prepContent.tips.map((tip, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-3 text-blue-800"
                                        >
                                            <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No prep content available for this round.</p>
                            <p className="text-sm mt-2">Try selecting a different round type above.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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
