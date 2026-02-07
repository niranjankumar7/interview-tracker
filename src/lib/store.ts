import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isToday, isYesterday, parseISO } from 'date-fns';
import {
    Application,
    InterviewRound,
    Sprint,
    Question,
    UserProgress,
    UserProfile,
    AppPreferences,
    CompletedTopic,
    LeetCodeConnection,
    LeetCodeStats,
    OfferDetails,
} from '@/types';
import { APP_VERSION } from '@/lib/constants';
import { appDataExportSchema, appDataSnapshotSchema } from '@/lib/app-data';
import { normalizeTopic } from '@/lib/topic-matcher';
import { autoTagCategory } from '@/utils/categoryTagger';
import { api } from '@/lib/api-client';

type RawSprint = Omit<Sprint, 'dailyPlans'> & {
    dailyPlans: Sprint['dailyPlans'] | string | null;
};

export type AppDataSnapshot = {
    applications: Application[];
    sprints: Sprint[];
    questions: Question[];
    progress: UserProgress;
    profile: UserProfile;
    preferences: AppPreferences;
    completedTopics: CompletedTopic[];
    leetcode?: LeetCodeConnection;
    leetcodeStats?: LeetCodeStats;
};

export type AppDataExport = {
    version: string;
    exportedAt: string;
    snapshot: AppDataSnapshot;
};

type InterviewRoundPatch = Pick<InterviewRound, 'roundNumber'> &
    Partial<Pick<InterviewRound, 'feedback' | 'questionsAsked'>>;

type ApplicationUpdate = Partial<Omit<Application, 'rounds'>> & {
    rounds?: InterviewRoundPatch[];
};

function mergeRoundFeedback(
    prev: InterviewRound['feedback'] | undefined,
    next: InterviewRound['feedback'] | undefined
): InterviewRound['feedback'] | undefined {
    if (!next) return prev;
    if (!prev) return next;
    return {
        rating: next.rating ?? prev.rating,
        pros: next.pros ?? prev.pros,
        cons: next.cons ?? prev.cons,
        struggledTopics: next.struggledTopics ?? prev.struggledTopics,
        notes: next.notes ?? prev.notes,
    };
}

interface AppState {
    // Data
    applications: Application[];
    sprints: Sprint[];
    questions: Question[];
    progress: UserProgress;
    profile: UserProfile;
    preferences: AppPreferences;
    completedTopics: CompletedTopic[];
    leetcode: LeetCodeConnection;
    leetcodeStats: LeetCodeStats | null;
    hasHydrated: boolean;

    setHasHydrated: (hasHydrated: boolean) => void;

    // Actions
    addApplication: (app: Application) => void;

    /**
     * Attempts to add a new interview round. Returns `true` on success.
     * Returns `false` if a round with the same `roundNumber` already exists.
     */
    addInterviewRound: (applicationId: string, round: InterviewRound) => boolean;
    /**
     * Shallow-update an application. If `updates.rounds` is provided, each entry is treated as a
     * patch merged into an existing round matched by `roundNumber`.
     *
     * To add new rounds, use `addInterviewRound`. If `feedback` is provided, it is merged field-
     * by-field, so omitted fields preserve existing values.
     *
     * For saving round feedback/questions and syncing the Question Bank, prefer `saveRoundFeedback`.
     */
    updateApplication: (
        id: string,
        updates: ApplicationUpdate
    ) => void;

    /**
     * Saves round feedback and replaces `questionsAsked` for the round.
     *
     * If `questionTexts` is non-empty, those questions are also synced into the Question Bank
     * in the same persisted write.
     */
    saveRoundFeedback: (params: {
        applicationId: string;
        roundNumber: number;
        feedback: InterviewRound['feedback'];
        questionTexts: string[];
    }) => void;
    deleteApplication: (id: string) => void;

    addSprint: (sprint: Sprint) => void;
    updateSprint: (id: string, updates: Partial<Sprint>) => void;

    addQuestion: (question: Question) => void;

    /**
     * Upserts the provided question texts into the Question Bank for the given application.
     *
     * De-duplication is done by matching `applicationId` + a normalized `questionText` (trimmed,
     * collapsed whitespace, lower-cased).
     */
    upsertQuestionsFromRound: (params: {
        applicationId: string;
        roundNumber: number;
        roundType: InterviewRound['roundType'];
        questionTexts: string[];
    }) => void;

    completeTask: (
        sprintId: string,
        dayIndex: number,
        blockIndex: number,
        taskIndex: number
    ) => void;

    updateProgress: (updates: Partial<UserProgress>) => void;
    updateProfile: (updates: Partial<UserProfile>) => void;
    updatePreferences: (updates: Partial<AppPreferences>) => void;

    // Topic progress tracking
    markTopicComplete: (topicName: string, source?: 'chat' | 'manual') => void;
    unmarkTopicComplete: (topicName: string) => void;
    getTopicCompletion: (topicName: string) => CompletedTopic | undefined;

    // Utilities
    loadDemoData: () => void;
    resetData: () => void;
    exportData: () => AppDataExport;
    importData: (data: unknown) => void;

    // LeetCode sync
    connectLeetCode: (info: { username: string }) => void;
    disconnectLeetCode: () => void;
    syncLeetCodeStats: (stats: LeetCodeStats) => void;

    // API Integration methods
    loadApplicationsFromAPI: () => Promise<void>;
    loadSprintsFromAPI: () => Promise<void>;
    loadQuestionsFromAPI: (filters?: { applicationId?: string; category?: string }) => Promise<void>;
    createApplicationAPI: (data: {
        company: string;
        role: string;
        jobDescriptionUrl?: string;
        roleType?: string;
        status?: 'applied' | 'shortlisted' | 'interview' | 'offer' | 'rejected';
        applicationDate?: string;
        interviewDate?: string;
        notes?: string;
        offerDetails?: OfferDetails;
    }) => Promise<Application>;
    updateApplicationAPI: (id: string, updates: Partial<Application>) => Promise<void>;
    deleteApplicationAPI: (id: string) => Promise<void>;
    createSprintAPI: (data: {
        applicationId: string;
        interviewDate: string;
        roleType: string;
        totalDays: number;
        dailyPlans: Sprint['dailyPlans'];
    }) => Promise<Sprint>;
    createQuestionAPI: (data: {
        questionText: string;
        category: 'DSA' | 'SystemDesign' | 'Behavioral' | 'SQL' | 'Other';
        difficulty?: 'Easy' | 'Medium' | 'Hard';
        askedInRound?: string;
        applicationId?: string;
    }) => Promise<Question>;
    syncWithBackend: () => Promise<void>;
}

const getInitialProgress = (): UserProgress => ({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString(),
    totalTasksCompleted: 0,
});

const getResetProgress = (): UserProgress => ({
    currentStreak: 0,
    longestStreak: 0,
    // Use epoch as a sentinel for a fully reset state.
    lastActiveDate: new Date(0).toISOString(),
    totalTasksCompleted: 0,
});

const getInitialProfile = (): UserProfile => ({
    name: '',
    targetRole: '',
    experienceLevel: 'Mid',
});

const getInitialPreferences = (): AppPreferences => ({
    theme: 'system',
    studyRemindersEnabled: false,
    calendarAutoSyncEnabled: false,
    leetcodeAutoSyncEnabled: false,
});

const getInitialLeetCode = (): LeetCodeConnection => ({
    connected: false,
    readOnly: true,
});

function safeParseISO(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeQuestionText(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hasMeaningfulOfferValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

function normalizeApplicationFromApi(raw: Record<string, unknown>): Application {
    const existingOffer = (raw.offerDetails as OfferDetails | undefined) ?? {};
    const mergedOffer: OfferDetails = {
        baseSalary:
            existingOffer.baseSalary ??
            (raw.offerBaseSalary as number | undefined),
        equity:
            existingOffer.equity ??
            (raw.offerEquity as string | undefined),
        bonus:
            existingOffer.bonus ??
            (raw.offerBonus as number | undefined),
        currency:
            existingOffer.currency ??
            (raw.offerCurrency as string | undefined),
        location:
            existingOffer.location ??
            (raw.offerLocation as string | undefined),
        workMode:
            existingOffer.workMode ??
            (raw.offerWorkMode as OfferDetails['workMode'] | undefined),
        joiningDate:
            existingOffer.joiningDate ??
            (typeof raw.offerJoiningDate === 'string'
                ? raw.offerJoiningDate
                : undefined),
        noticePeriod:
            existingOffer.noticePeriod ??
            (raw.offerNoticePeriod as string | undefined),
        benefits:
            existingOffer.benefits ??
            (raw.offerBenefits as string[] | undefined),
        notes:
            existingOffer.notes ??
            (raw.offerNotes as string | undefined),
        totalCTC:
            existingOffer.totalCTC ??
            (raw.offerTotalCTC as number | undefined),
    };

    const hasOfferDetails = Object.values(mergedOffer).some(hasMeaningfulOfferValue);

    const application = raw as unknown as Application;
    return {
        ...application,
        notes: application.notes ?? '',
        rounds: application.rounds ?? [],
        offerDetails: hasOfferDetails ? mergedOffer : undefined,
    };
}

// Fallback ID state for environments without `crypto.randomUUID`/`crypto.getRandomValues`.
// Keeps IDs stable-ish and reduces same-millisecond collision risk.
let fallbackQuestionIdLastTime = 0;
let fallbackQuestionIdCounter = 0;

function createQuestionId(): string {
    if (
        typeof crypto !== 'undefined' &&
        'randomUUID' in crypto &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    if (
        typeof crypto !== 'undefined' &&
        'getRandomValues' in crypto &&
        typeof crypto.getRandomValues === 'function'
    ) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    const now = Date.now();
    if (now === fallbackQuestionIdLastTime) {
        fallbackQuestionIdCounter += 1;
    } else {
        fallbackQuestionIdLastTime = now;
        fallbackQuestionIdCounter = 0;
    }

    const randomSuffix = Math.random().toString(16).slice(2, 8);
    return `${now}-${fallbackQuestionIdCounter}-${randomSuffix}`;
}

function getAskedInRoundLabel(
    roundNumber: number,
    roundType: InterviewRound['roundType']
): string {
    return `Round ${roundNumber}: ${roundType}`;
}

function getQuestionDedupeKey(companyId: string | undefined, normalizedText: string): string {
    return `${companyId ?? 'none'}|${normalizedText}`;
}

function upsertQuestionsFromRoundInList(
    questions: Question[],
    params: {
        applicationId: string;
        roundNumber: number;
        roundType: InterviewRound['roundType'];
        questionTexts: string[];
    }
): Question[] {
    const askedInRound = getAskedInRoundLabel(params.roundNumber, params.roundType);
    const nextQuestions = [...questions];
    const index = new Map<string, number>();

    for (let i = 0; i < nextQuestions.length; i += 1) {
        const q = nextQuestions[i];
        index.set(
            getQuestionDedupeKey(q.companyId, normalizeQuestionText(q.questionText)),
            i
        );
    }

    const dateAdded = new Date().toISOString();

    for (const rawText of params.questionTexts) {
        const questionText = rawText.trim();
        if (!questionText) continue;

        const key = getQuestionDedupeKey(
            params.applicationId,
            normalizeQuestionText(questionText)
        );

        const existingIdx = index.get(key);
        if (existingIdx === undefined) {
            nextQuestions.push({
                id: createQuestionId(),
                companyId: params.applicationId,
                questionText,
                category: autoTagCategory(questionText),
                askedInRound,
                dateAdded,
            });

            index.set(key, nextQuestions.length - 1);
            continue;
        }

        const existing = nextQuestions[existingIdx];
        nextQuestions[existingIdx] = {
            ...existing,
            category: autoTagCategory(questionText),
            askedInRound,
        };
    }

    return nextQuestions;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            applications: [],
            sprints: [],
            questions: [],
            progress: getInitialProgress(),
            profile: getInitialProfile(),
            preferences: getInitialPreferences(),
            completedTopics: [],
            leetcode: getInitialLeetCode(),
            leetcodeStats: null,
            hasHydrated: false,

            setHasHydrated: (hasHydrated) => set({ hasHydrated }),

            addApplication: (app) =>
                set((state) => ({
                    applications: [...state.applications, app]
                })),

            addInterviewRound: (applicationId, round) => {
                let didAdd = false;

                set((state) => ({
                    applications: state.applications.map((app) => {
                        if (app.id !== applicationId) return app;

                        const existingRound = (app.rounds ?? []).some(
                            (r) => r.roundNumber === round.roundNumber
                        );

                        if (existingRound) {
                            const message = `addInterviewRound: duplicate roundNumber ${round.roundNumber} for application ${applicationId}`;
                            console.error(message, {
                                applicationId,
                                roundNumber: round.roundNumber,
                                round,
                            });
                            return app;
                        }

                        didAdd = true;
                        const rounds = [...(app.rounds ?? []), round].sort(
                            (a, b) => a.roundNumber - b.roundNumber
                        );
                        return { ...app, rounds };
                    }),
                }));

                return didAdd;
            },

            updateApplication: (id, updates) =>
                set((state) => ({
                    applications: state.applications.map((app) => {
                        if (app.id !== id) return app;

                        const { rounds: roundUpdates, ...topLevelUpdates } = updates;
                        if (!roundUpdates || roundUpdates.length === 0) {
                            return { ...app, ...topLevelUpdates };
                        }

                        const nextRounds = [...(app.rounds ?? [])];
                        for (const roundUpdate of roundUpdates) {
                            const idx = nextRounds.findIndex(
                                (r) => r.roundNumber === roundUpdate.roundNumber
                            );

                            if (idx === -1) {
                                if (process.env.NODE_ENV !== 'production') {
                                    console.warn(
                                        'updateApplication: tried to update missing round',
                                        {
                                            applicationId: id,
                                            roundNumber: roundUpdate.roundNumber,
                                        }
                                    );
                                }
                                continue;
                            }

                            const prev = nextRounds[idx];
                            nextRounds[idx] = {
                                ...prev,
                                ...roundUpdate,
                                feedback: mergeRoundFeedback(
                                    prev.feedback,
                                    roundUpdate.feedback
                                ),
                            };
                        }

                        nextRounds.sort((a, b) => a.roundNumber - b.roundNumber);

                        return {
                            ...app,
                            ...topLevelUpdates,
                            rounds: nextRounds,
                        };
                    }),
                })),

            saveRoundFeedback: ({ applicationId, roundNumber, feedback, questionTexts }) =>
                set((state) => {
                    let targetRoundType: InterviewRound['roundType'] | null = null;

                    const applications = state.applications.map((app) => {
                        if (app.id !== applicationId) return app;

                        const nextRounds = [...(app.rounds ?? [])];
                        const idx = nextRounds.findIndex((r) => r.roundNumber === roundNumber);
                        if (idx === -1) {
                            if (process.env.NODE_ENV !== 'production') {
                                console.warn(
                                    'saveRoundFeedback: tried to update missing round',
                                    {
                                        applicationId,
                                        roundNumber,
                                        availableRounds: (app.rounds ?? []).map((r) => ({
                                            roundNumber: r.roundNumber,
                                            roundType: r.roundType,
                                        })),
                                    }
                                );
                            }
                            return app;
                        }

                        const prev = nextRounds[idx];
                        targetRoundType = prev.roundType;
                        nextRounds[idx] = {
                            ...prev,
                            questionsAsked: questionTexts,
                            feedback: mergeRoundFeedback(prev.feedback, feedback),
                        };

                        nextRounds.sort((a, b) => a.roundNumber - b.roundNumber);

                        return {
                            ...app,
                            rounds: nextRounds,
                        };
                    });

                    const questions =
                        questionTexts.length > 0 && targetRoundType
                            ? upsertQuestionsFromRoundInList(state.questions, {
                                applicationId,
                                roundNumber,
                                roundType: targetRoundType,
                                questionTexts,
                            })
                            : state.questions;

                    return { applications, questions };
                }),

            deleteApplication: (id) =>
                set((state) => ({
                    applications: state.applications.filter(app => app.id !== id),
                    sprints: state.sprints.filter(sprint => sprint.applicationId !== id)
                })),

            addSprint: (sprint) =>
                set((state) => ({
                    sprints: [...state.sprints, sprint]
                })),

            updateSprint: (id, updates) =>
                set((state) => ({
                    sprints: state.sprints.map(sprint =>
                        sprint.id === id ? { ...sprint, ...updates } : sprint
                    )
                })),

            addQuestion: (question) =>
                set((state) => ({
                    questions: [...state.questions, question]
                })),

            upsertQuestionsFromRound: ({ applicationId, roundNumber, roundType, questionTexts }) =>
                set((state) => ({
                    questions: upsertQuestionsFromRoundInList(state.questions, {
                        applicationId,
                        roundNumber,
                        roundType,
                        questionTexts,
                    }),
                })),

            completeTask: (sprintId, dayIndex, blockIndex, taskIndex) => {
                const existingTask =
                    get()
                        .sprints.find((sprint) => sprint.id === sprintId)
                        ?.dailyPlans[dayIndex]?.blocks[blockIndex]?.tasks[taskIndex];

                if (!existingTask || existingTask.completed) return;

                set((state) => {
                    const sprints = state.sprints.map(sprint => {
                        if (sprint.id !== sprintId) return sprint;

                        const dailyPlans = sprint.dailyPlans.map((day, dIdx) => {
                            if (dIdx !== dayIndex) return day;

                            const blocks = day.blocks.map((block, bIdx) => {
                                if (bIdx !== blockIndex) return block;

                                const tasks = block.tasks.map((task, tIdx) => {
                                    if (tIdx !== taskIndex) return task;
                                    return { ...task, completed: true };
                                });

                                const blockCompleted = tasks.every(t => t.completed);
                                return { ...block, tasks, completed: blockCompleted };
                            });

                            const dayCompleted = blocks.every(b => b.completed);
                            return { ...day, blocks, completed: dayCompleted };
                        });

                        const isSprintCompleted = dailyPlans.every((d) => d.completed);

                        const nextStatus: Sprint["status"] =
                            sprint.status === 'completed'
                                ? 'completed'
                                : isSprintCompleted
                                    ? 'completed'
                                    : sprint.status;

                        return { ...sprint, dailyPlans, status: nextStatus };
                    });

                    const now = new Date();
                    const lastActive = safeParseISO(state.progress.lastActiveDate);

                    let nextStreak = state.progress.currentStreak;
                    if (lastActive && isToday(lastActive)) {
                        nextStreak = Math.max(1, nextStreak);
                    } else if (lastActive && isYesterday(lastActive)) {
                        nextStreak = nextStreak + 1;
                    } else {
                        nextStreak = 1;
                    }

                    const nextLongest = Math.max(state.progress.longestStreak, nextStreak);

                    return {
                        sprints,
                        progress: {
                            ...state.progress,
                            currentStreak: nextStreak,
                            longestStreak: nextLongest,
                            lastActiveDate: now.toISOString(),
                            totalTasksCompleted: state.progress.totalTasksCompleted + 1
                        }
                    };
                });
            },

            updateProgress: (updates) =>
                set((state) => ({
                    progress: { ...state.progress, ...updates }
                })),

            updateProfile: (updates) =>
                set((state) => ({
                    profile: { ...state.profile, ...updates }
                })),

            updatePreferences: (updates) =>
                set((state) => ({
                    preferences: { ...state.preferences, ...updates }
                })),

            connectLeetCode: ({ username }) =>
                set((state) => ({
                    leetcode: {
                        ...state.leetcode,
                        connected: true,
                        readOnly: true,
                        username: username.trim(),
                        connectedAt: new Date().toISOString(),
                    },
                })),

            disconnectLeetCode: () =>
                set(() => ({
                    leetcode: getInitialLeetCode(),
                    leetcodeStats: null,
                })),

            syncLeetCodeStats: (stats) =>
                set((state) => ({
                    leetcodeStats: stats,
                    leetcode: {
                        ...state.leetcode,
                        lastSyncAt: new Date().toISOString(),
                    },
                })),

            // Topic progress tracking
            markTopicComplete: (topicName, source = 'manual') => {
                const normalized = normalizeTopic(topicName);
                const existing = get().completedTopics.find(t => t.topicName === normalized);
                if (!existing) {
                    set((state) => ({
                        completedTopics: [...state.completedTopics, {
                            topicName: normalized,
                            displayName: topicName,
                            completedAt: new Date().toISOString(),
                            source
                        }]
                    }));
                }
            },

            unmarkTopicComplete: (topicName) => {
                const normalized = normalizeTopic(topicName);
                set((state) => ({
                    completedTopics: state.completedTopics.filter(t => t.topicName !== normalized)
                }));
            },

            getTopicCompletion: (topicName) => {
                const normalized = normalizeTopic(topicName);
                return get().completedTopics.find(t => t.topicName === normalized);
            },

            loadDemoData: () => {
                const today = new Date();
                const addDays = (date: Date, days: number) => {
                    const result = new Date(date);
                    result.setDate(result.getDate() + days);
                    return result.toISOString();
                };

                const demoApplications: Application[] = [
                    {
                        id: '1',
                        company: 'Google',
                        role: 'SDE - Backend',
                        status: 'interview',
                        applicationDate: addDays(today, -14),
                        interviewDate: addDays(today, 5),
                        rounds: [],
                        notes: 'Referred by John',
                        createdAt: addDays(today, -14),
                    },
                    {
                        id: '2',
                        company: 'Amazon',
                        role: 'SDE - Full Stack',
                        status: 'shortlisted',
                        applicationDate: addDays(today, -10),
                        rounds: [],
                        notes: '',
                        createdAt: addDays(today, -10),
                    },
                    {
                        id: '3',
                        company: 'Microsoft',
                        role: 'SDE - Cloud',
                        status: 'applied',
                        applicationDate: addDays(today, -5),
                        rounds: [],
                        notes: 'Applied through careers portal',
                        createdAt: addDays(today, -5),
                    },
                ];

                const demoQuestions: Question[] = [
                    {
                        id: '1',
                        companyId: '1',
                        questionText: 'Design a URL shortener',
                        category: 'SystemDesign',
                        difficulty: 'Medium',
                        askedInRound: 'Round 2',
                        dateAdded: addDays(today, -5),
                    },
                    {
                        id: '2',
                        companyId: '1',
                        questionText: 'Implement LRU Cache',
                        category: 'DSA',
                        difficulty: 'Medium',
                        askedInRound: 'Round 1',
                        dateAdded: addDays(today, -3),
                    },
                ];

                set({
                    applications: demoApplications,
                    sprints: [],
                    questions: demoQuestions,
                    completedTopics: [],
                    leetcode: getInitialLeetCode(),
                    leetcodeStats: null,
                    progress: {
                        currentStreak: 3,
                        longestStreak: 7,
                        lastActiveDate: today.toISOString(),
                        totalTasksCompleted: 15,
                    }
                });
            },

            resetData: () => set({
                applications: [],
                sprints: [],
                questions: [],
                progress: getResetProgress(),
                profile: getInitialProfile(),
                preferences: getInitialPreferences(),
                completedTopics: [],
                leetcode: getInitialLeetCode(),
                leetcodeStats: null,
            }),

            exportData: () => {
                const {
                    applications,
                    sprints,
                    questions,
                    progress,
                    profile,
                    preferences,
                    completedTopics,
                    leetcode,
                    leetcodeStats,
                } = get();
                return {
                    version: APP_VERSION,
                    exportedAt: new Date().toISOString(),
                    snapshot: {
                        applications,
                        sprints,
                        questions,
                        progress,
                        profile,
                        preferences,
                        completedTopics,
                        leetcode,
                        leetcodeStats: leetcodeStats ?? undefined,
                    },
                };
            },

            importData: (data) => {
                const exportParse = appDataExportSchema.safeParse(data);
                const applySnapshot = (snapshot: AppDataSnapshot) => {
                    set({
                        ...snapshot,
                        leetcode: snapshot.leetcode ?? getInitialLeetCode(),
                        leetcodeStats: snapshot.leetcodeStats ?? null,
                    });
                };

                if (exportParse.success) {
                    applySnapshot(exportParse.data.snapshot);
                    return;
                }

                const snapshotParse = appDataSnapshotSchema.safeParse(data);
                if (snapshotParse.success) {
                    applySnapshot(snapshotParse.data);
                    return;
                }

                const issue = exportParse.error.issues[0] ?? snapshotParse.error.issues[0];
                const defaultWhere = exportParse.error.issues[0] ? 'data' : 'snapshot';
                const where = issue?.path?.length ? issue.path.join('.') : defaultWhere;
                const message = issue?.message ?? 'File does not match expected export format';
                throw new Error(`${where}: ${message}`);
            },

            // API Integration implementations
            loadApplicationsFromAPI: async () => {
                try {
                    const apps = await api.applications.getAll();
                    set({
                        applications: apps.map((app) =>
                            normalizeApplicationFromApi(app as Record<string, unknown>)
                        ),
                    });
                } catch (error) {
                    console.error('Failed to load applications from API:', error);
                    throw error;
                }
            },

            loadSprintsFromAPI: async () => {
                try {
                    const rawSprints = (await api.sprints.getAll()) as RawSprint[];
                    // Ensure dailyPlans is properly parsed (backend might return it as JSON string)
                    const sprints = rawSprints.map((sprint) => ({
                        ...sprint,
                        dailyPlans: Array.isArray(sprint.dailyPlans)
                            ? sprint.dailyPlans
                            : typeof sprint.dailyPlans === 'string'
                                ? JSON.parse(sprint.dailyPlans)
                                : [],
                    }));
                    set({ sprints });
                } catch (error) {
                    console.error('Failed to load sprints from API:', error);
                    throw error;
                }
            },

            loadQuestionsFromAPI: async (filters) => {
                try {
                    const questions = await api.questions.getAll(filters);
                    set({ questions });
                } catch (error) {
                    console.error('Failed to load questions from API:', error);
                    throw error;
                }
            },

            createApplicationAPI: async (data) => {
                try {
                    const app = await api.applications.create(data);
                    const normalizedApp = normalizeApplicationFromApi(
                        app as Record<string, unknown>
                    );
                    set((state) => ({
                        applications: [...state.applications, normalizedApp]
                    }));
                    return normalizedApp;
                } catch (error) {
                    console.error('Failed to create application:', error);
                    throw error;
                }
            },

            updateApplicationAPI: async (id, updates) => {
                try {
                    const updatedApp = await api.applications.update(id, updates);
                    const normalizedUpdatedApp = normalizeApplicationFromApi(
                        updatedApp as Record<string, unknown>
                    );
                    set((state) => ({
                        applications: state.applications.map(app =>
                            app.id === id ? { ...app, ...normalizedUpdatedApp } : app
                        )
                    }));
                } catch (error) {
                    console.error('Failed to update application:', error);
                    throw error;
                }
            },

            deleteApplicationAPI: async (id) => {
                try {
                    await api.applications.delete(id);
                    set((state) => ({
                        applications: state.applications.filter(app => app.id !== id),
                        sprints: state.sprints.filter(sprint => sprint.applicationId !== id)
                    }));
                } catch (error) {
                    console.error('Failed to delete application:', error);
                    throw error;
                }
            },

            createSprintAPI: async (data) => {
                try {
                    const sprint = await api.sprints.create(data);
                    set((state) => ({
                        sprints: [...state.sprints, sprint]
                    }));
                    return sprint;
                } catch (error) {
                    console.error('Failed to create sprint:', error);
                    throw error;
                }
            },

            createQuestionAPI: async (data) => {
                try {
                    const question = await api.questions.create(data);
                    set((state) => ({
                        questions: [...state.questions, question]
                    }));
                    return question;
                } catch (error) {
                    console.error('Failed to create question:', error);
                    throw error;
                }
            },

            syncWithBackend: async () => {
                try {
                    // Load all data from backend in parallel
                    const [apps, rawSprints, questions, userProfile] = await Promise.all([
                        api.applications.getAll(),
                        api.sprints.getAll() as Promise<RawSprint[]>,
                        api.questions.getAll(),
                        api.user.getProfile().catch(() => null), // User profile is optional
                    ]);

                    // Ensure dailyPlans is properly parsed (backend might return it as JSON string)
                    const sprints = rawSprints.map((sprint) => ({
                        ...sprint,
                        dailyPlans: Array.isArray(sprint.dailyPlans)
                            ? sprint.dailyPlans
                            : typeof sprint.dailyPlans === 'string'
                                ? JSON.parse(sprint.dailyPlans)
                                : [],
                    }));

                    // Build the update object
                    const update: Partial<AppState> = {
                        applications: apps.map((app) =>
                            normalizeApplicationFromApi(app as Record<string, unknown>)
                        ),
                        sprints,
                        questions,
                    };

                    // Sync user profile data if available
                    if (userProfile) {
                        // Update profile
                        if (userProfile.name) {
                            update.profile = {
                                ...get().profile,
                                name: userProfile.name || get().profile.name,
                                targetRole: userProfile.targetRole || get().profile.targetRole,
                                experienceLevel:
                                    userProfile.experienceLevel ??
                                    get().profile.experienceLevel,
                            };
                        }

                        // Update progress from API
                        if (userProfile.progress) {
                            update.progress = {
                                ...get().progress,
                                currentStreak: userProfile.progress.currentStreak ?? get().progress.currentStreak,
                                longestStreak: userProfile.progress.longestStreak ?? get().progress.longestStreak,
                                lastActiveDate: userProfile.progress.lastActiveDate ?? get().progress.lastActiveDate,
                                totalTasksCompleted: userProfile.progress.totalTasksCompleted ?? get().progress.totalTasksCompleted,
                            };
                        }

                        // Update preferences from API
                        if (userProfile.preferences) {
                            update.preferences = {
                                ...get().preferences,
                                theme: userProfile.preferences.theme ?? get().preferences.theme,
                                studyRemindersEnabled: userProfile.preferences.studyRemindersEnabled ?? get().preferences.studyRemindersEnabled,
                                calendarAutoSyncEnabled: userProfile.preferences.calendarAutoSyncEnabled ?? get().preferences.calendarAutoSyncEnabled,
                                leetcodeAutoSyncEnabled: userProfile.preferences.leetcodeAutoSyncEnabled ?? get().preferences.leetcodeAutoSyncEnabled,
                            };
                        }

                        // Update leetcode connection from API
                        if (userProfile.leetcode) {
                            update.leetcode = {
                                ...get().leetcode,
                                username: userProfile.leetcode.username || get().leetcode.username,
                                connectedAt: userProfile.leetcode.connectedAt || get().leetcode.connectedAt,
                                lastSyncAt: userProfile.leetcode.lastSyncAt || get().leetcode.lastSyncAt,
                            };

                            // Update leetcode stats
                            update.leetcodeStats = {
                                totalSolved: userProfile.leetcode.totalSolved ?? 0,
                                easySolved: userProfile.leetcode.easySolved ?? 0,
                                mediumSolved: userProfile.leetcode.mediumSolved ?? 0,
                                hardSolved: userProfile.leetcode.hardSolved ?? 0,
                                currentStreak: userProfile.leetcode.currentStreak ?? 0,
                                longestStreak: userProfile.leetcode.longestStreak ?? 0,
                                lastActiveDate:
                                    userProfile.leetcode.lastActiveDate ?? undefined,
                            };
                        }
                    }

                    set(update);
                } catch (error) {
                    console.error('Failed to sync with backend:', error);
                    throw error;
                }
            },
        }),
        {
            name: 'interview-prep-storage',
            partialize: (state) => ({
                applications: state.applications,
                sprints: state.sprints,
                questions: state.questions,
                progress: state.progress,
                profile: state.profile,
                preferences: state.preferences,
                completedTopics: state.completedTopics,
                leetcode: state.leetcode,
                leetcodeStats: state.leetcodeStats,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
                if (!state) return;
                if (state.preferences.calendarAutoSyncEnabled === undefined) {
                    state.updatePreferences({ calendarAutoSyncEnabled: false });
                }
                if (state.preferences.leetcodeAutoSyncEnabled === undefined) {
                    state.updatePreferences({ leetcodeAutoSyncEnabled: false });
                }
            },
        }
    )
);
