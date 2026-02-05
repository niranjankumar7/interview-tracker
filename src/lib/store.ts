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
    CalendarConnection,
    CalendarEvent,
    CalendarInterviewSuggestion,
    RoleType,
} from '@/types';
import { APP_VERSION } from '@/lib/constants';
import { appDataExportSchema, appDataSnapshotSchema } from '@/lib/app-data';
import { normalizeTopic } from '@/lib/topic-matcher';
import { generateSprint } from '@/lib/sprintGenerator';
import { buildCalendarSuggestions, isValidCompanyName, mergeCalendarEvents } from '@/lib/calendar-sync';

export type AppDataSnapshot = {
    applications: Application[];
    sprints: Sprint[];
    questions: Question[];
    progress: UserProgress;
    profile: UserProfile;
    preferences: AppPreferences;
    completedTopics: CompletedTopic[];
    calendar?: CalendarConnection;
    calendarEvents?: CalendarEvent[];
    calendarSuggestions?: CalendarInterviewSuggestion[];
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
    calendar: CalendarConnection;
    calendarEvents: CalendarEvent[];
    calendarSuggestions: CalendarInterviewSuggestion[];
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
     */
    updateApplication: (
        id: string,
        updates: ApplicationUpdate
    ) => void;
    deleteApplication: (id: string) => void;

    addSprint: (sprint: Sprint) => void;
    updateSprint: (id: string, updates: Partial<Sprint>) => void;

    addQuestion: (question: Question) => void;

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

    // Calendar sync
    connectCalendar: (info: { email?: string }) => void;
    disconnectCalendar: () => void;
    syncCalendarEvents: (events: CalendarEvent[], source?: CalendarEvent["source"]) => void;
    confirmCalendarSuggestion: (
        id: string,
        overrides?: {
            company?: string;
            role?: string;
            roleType?: RoleType;
            interviewDate?: string;
            createSprint?: boolean;
        }
    ) => void;
    dismissCalendarSuggestion: (id: string) => void;
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
});

const getInitialCalendar = (): CalendarConnection => ({
    provider: 'google',
    connected: false,
    readOnly: true,
});

function safeParseISO(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createClientId(): string {
    return (
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
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
            calendar: getInitialCalendar(),
            calendarEvents: [],
            calendarSuggestions: [],
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

            connectCalendar: ({ email }) =>
                set((state) => ({
                    calendar: {
                        ...state.calendar,
                        connected: true,
                        readOnly: true,
                        email: email?.trim() || state.calendar.email,
                        connectedAt: new Date().toISOString(),
                    },
                })),

            disconnectCalendar: () =>
                set(() => ({
                    calendar: getInitialCalendar(),
                    calendarEvents: [],
                    calendarSuggestions: [],
                })),

            syncCalendarEvents: (events, source = 'sync') =>
                set((state) => {
                    const normalizedEvents = events.map((event) => ({
                        ...event,
                        source: event.source ?? source,
                    }));

                    const mergedEvents = mergeCalendarEvents(
                        state.calendarEvents,
                        normalizedEvents
                    );

                    const newSuggestions = buildCalendarSuggestions(
                        normalizedEvents,
                        state.applications
                    );

                    const nextSuggestions = [...state.calendarSuggestions];
                    const existingIds = new Set(nextSuggestions.map((suggestion) => suggestion.id));

                    for (const suggestion of newSuggestions) {
                        const matches = nextSuggestions.filter(
                            (item) => item.eventId === suggestion.eventId
                        );

                        const existingPending = matches.find(
                            (item) => item.status === 'pending'
                        );

                        if (existingPending) {
                            const pendingIndex = nextSuggestions.findIndex(
                                (item) => item.id === existingPending.id
                            );

                            if (pendingIndex !== -1) {
                                nextSuggestions[pendingIndex] = {
                                    ...existingPending,
                                    ...suggestion,
                                    id: existingPending.id,
                                    status: existingPending.status,
                                    createdAt: existingPending.createdAt,
                                };
                            }
                            continue;
                        }

                        const existingDismissed = matches.find(
                            (item) => item.status === 'dismissed'
                        );
                        if (existingDismissed) continue;

                        const existingConfirmed = matches.find(
                            (item) => item.status === 'confirmed'
                        );

                        if (existingConfirmed) {
                            const didChange =
                                existingConfirmed.interviewDate !== suggestion.interviewDate ||
                                existingConfirmed.title !== suggestion.title;

                            if (!didChange) continue;

                            const createdAt = new Date().toISOString();
                            const dateSegment = suggestion.interviewDate
                                .replace(/[^0-9]/g, '')
                                .slice(0, 14) || '0';
                            const baseId = `${suggestion.id}@${dateSegment}`;
                            let nextId = baseId;
                            let suffix = 1;

                            while (existingIds.has(nextId)) {
                                nextId = `${baseId}-${suffix++}`;
                            }

                            existingIds.add(nextId);
                            nextSuggestions.push({
                                ...suggestion,
                                id: nextId,
                                status: 'pending',
                                createdAt,
                                reason: `Rescheduled: ${suggestion.reason}`,
                            });
                            continue;
                        }

                        if (existingIds.has(suggestion.id)) continue;

                        existingIds.add(suggestion.id);
                        nextSuggestions.push(suggestion);
                    }

                    return {
                        calendarEvents: mergedEvents,
                        calendarSuggestions: nextSuggestions,
                        calendar: {
                            ...state.calendar,
                            lastSyncAt: new Date().toISOString(),
                        },
                    };
                }),

            confirmCalendarSuggestion: (id, overrides = {}) =>
                set((state) => {
                    const suggestion = state.calendarSuggestions.find((s) => s.id === id);
                    if (!suggestion) return {};

                    const companyInput = (overrides.company ?? suggestion.company).trim();
                    if (!isValidCompanyName(companyInput)) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.warn(
                                'confirmCalendarSuggestion: invalid company',
                                {
                                    suggestionId: id,
                                    company: companyInput,
                                }
                            );
                        }
                        return {};
                    }

                    const company = companyInput;
                    const role = (overrides.role ?? suggestion.role ?? 'Software Engineer').trim();
                    const interviewDate = overrides.interviewDate ?? suggestion.interviewDate;
                    const roleType = overrides.roleType ?? suggestion.roleType ?? 'SDE';
                    const createSprint = overrides.createSprint ?? true;
                    const nowIso = new Date().toISOString();

                    const existingIndex = state.applications.findIndex(
                        (app) => app.company.toLowerCase() === company.toLowerCase()
                    );

                    const nextApplications = [...state.applications];
                    let applicationId: string;

                    if (existingIndex === -1) {
                        applicationId = createClientId();
                        nextApplications.push({
                            id: applicationId,
                            company,
                            role,
                            roleType,
                            status: 'interview',
                            applicationDate: nowIso,
                            interviewDate,
                            rounds: [],
                            notes: '',
                            createdAt: nowIso,
                            source: 'calendar',
                        });
                    } else {
                        const existingApp = nextApplications[existingIndex];
                        applicationId = existingApp.id;
                        nextApplications[existingIndex] = {
                            ...existingApp,
                            interviewDate,
                            status: 'interview',
                            role: existingApp.role || role,
                            roleType: existingApp.roleType ?? roleType,
                            source: existingApp.source ?? 'calendar',
                        };
                    }

                    const nextSprints = [...state.sprints];
                    if (createSprint) {
                        const hasActiveSprint = nextSprints.some(
                            (sprint) =>
                                sprint.applicationId === applicationId &&
                                sprint.status === 'active'
                        );

                        if (!hasActiveSprint) {
                            const parsedDate = safeParseISO(interviewDate);
                            if (parsedDate) {
                                nextSprints.push(
                                    generateSprint(applicationId, parsedDate, roleType)
                                );
                            }
                        }
                    }

                    return {
                        applications: nextApplications,
                        sprints: nextSprints,
                        calendarSuggestions: state.calendarSuggestions.map((item) =>
                            item.id === id
                                ? {
                                      ...item,
                                      company,
                                      role,
                                      roleType,
                                      interviewDate,
                                      status: 'confirmed',
                                  }
                                : item
                        ),
                    };
                }),

            dismissCalendarSuggestion: (id) =>
                set((state) => ({
                    calendarSuggestions: state.calendarSuggestions.map((s) =>
                        s.id === id ? { ...s, status: "dismissed" } : s
                    ),
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
                    calendar: getInitialCalendar(),
                    calendarEvents: [],
                    calendarSuggestions: [],
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
                calendar: getInitialCalendar(),
                calendarEvents: [],
                calendarSuggestions: [],
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
                    calendar,
                    calendarEvents,
                    calendarSuggestions,
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
                        calendar,
                        calendarEvents,
                        calendarSuggestions,
                    },
                };
            },

            importData: (data) => {
                const exportParse = appDataExportSchema.safeParse(data);
                const applySnapshot = (snapshot: AppDataSnapshot) => {
                    set({
                        ...snapshot,
                        calendar: snapshot.calendar ?? getInitialCalendar(),
                        calendarEvents: snapshot.calendarEvents ?? [],
                        calendarSuggestions: snapshot.calendarSuggestions ?? [],
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
                calendar: state.calendar,
                calendarEvents: state.calendarEvents,
                calendarSuggestions: state.calendarSuggestions,
            }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<AppState> | undefined;

                return {
                    ...currentState,
                    ...persisted,
                    preferences: {
                        ...currentState.preferences,
                        ...(persisted?.preferences ?? {}),
                    },
                    calendar: {
                        ...currentState.calendar,
                        ...(persisted?.calendar ?? {}),
                    },
                };
            },
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
