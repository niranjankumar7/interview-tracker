import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isToday, isYesterday, parseISO } from 'date-fns';
import {
    Application,
    Sprint,
    Question,
    UserProgress,
    CompletedTopic,
    UserProfile,
    AppPreferences,
} from '@/types';
import { APP_VERSION } from '@/lib/constants';
import { appDataExportSchema, appDataSnapshotSchema } from '@/lib/app-data';
import { normalizeTopic } from '@/lib/topic-matcher';

export type AppDataSnapshot = {
    applications: Application[];
    sprints: Sprint[];
    questions: Question[];
    progress: UserProgress;
    profile: UserProfile;
    preferences: AppPreferences;
    completedTopics: CompletedTopic[];
};

export type AppDataExport = {
    version: string;
    exportedAt: string;
    snapshot: AppDataSnapshot;
};

interface AppState {
    // Data
    applications: Application[];
    sprints: Sprint[];
    questions: Question[];
    progress: UserProgress;
    profile: UserProfile;
    preferences: AppPreferences;
    completedTopics: CompletedTopic[];
    hasHydrated: boolean;

    setHasHydrated: (hasHydrated: boolean) => void;

    // Actions
    addApplication: (app: Application) => void;
    updateApplication: (id: string, updates: Partial<Application>) => void;
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
}

const getInitialProgress = (): UserProgress => ({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString(),
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
});

function safeParseISO(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
            hasHydrated: false,

            setHasHydrated: (hasHydrated) => set({ hasHydrated }),

            addApplication: (app) =>
                set((state) => ({
                    applications: [...state.applications, app]
                })),

            updateApplication: (id, updates) =>
                set((state) => ({
                    applications: state.applications.map(app =>
                        app.id === id ? { ...app, ...updates } : app
                    )
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
                progress: getInitialProgress(),
                profile: getInitialProfile(),
                preferences: getInitialPreferences(),
                completedTopics: [],
            }),

            exportData: () => {
                const { applications, sprints, questions, progress, profile, preferences, completedTopics } = get();
                return {
                    version: APP_VERSION,
                    exportedAt: new Date().toISOString(),
                    snapshot: { applications, sprints, questions, progress, profile, preferences, completedTopics },
                };
            },

            importData: (data) => {
                const exportParse = appDataExportSchema.safeParse(data);
                if (exportParse.success) {
                    set(exportParse.data.snapshot);
                    return;
                }

                const snapshotParse = appDataSnapshotSchema.safeParse(data);
                if (snapshotParse.success) {
                    set(snapshotParse.data);
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
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
