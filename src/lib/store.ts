import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Application, InterviewRound, Sprint, Question, UserProgress } from '@/types';

type InterviewRoundPatch = Partial<InterviewRound> &
    Pick<InterviewRound, 'roundNumber'>;

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

    // Actions
    addApplication: (app: Application) => void;
    addInterviewRound: (applicationId: string, round: InterviewRound) => void;
    /**
     * Shallow-update an application. If `updates.rounds` is provided, each entry is treated as a
     * patch merged into an existing round matched by `roundNumber`.
     *
     * To add new rounds, use `addInterviewRound`.
     */
    updateApplication: (
        id: string,
        updates: ApplicationUpdate
    ) => void;
    deleteApplication: (id: string) => void;

    addSprint: (sprint: Sprint) => void;
    updateSprint: (id: string, updates: Partial<Sprint>) => void;

    addQuestion: (question: Question) => void;

    completeTask: (sprintId: string, dayIndex: number, blockIndex: number, taskIndex: number) => void;

    updateProgress: (updates: Partial<UserProgress>) => void;

    // Utilities
    loadDemoData: () => void;
    resetData: () => void;
}

const initialProgress: UserProgress = {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString(),
    totalTasksCompleted: 0,
};

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            applications: [],
            sprints: [],
            questions: [],
            progress: initialProgress,

            addApplication: (app) =>
                set((state) => ({
                    applications: [...state.applications, app]
                })),

            addInterviewRound: (applicationId, round) =>
                set((state) => ({
                    applications: state.applications.map((app) => {
                        if (app.id !== applicationId) return app;
                        const rounds = [...(app.rounds ?? []), round].sort(
                            (a, b) => a.roundNumber - b.roundNumber
                        );
                        return { ...app, rounds };
                    }),
                })),

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

            completeTask: (sprintId, dayIndex, blockIndex, taskIndex) =>
                set((state) => {
                    const sprints = state.sprints.map(sprint => {
                        if (sprint.id !== sprintId) return sprint;

                        const dailyPlans = sprint.dailyPlans.map((day, dIdx) => {
                            if (dIdx !== dayIndex) return day;

                            const blocks = day.blocks.map((block, bIdx) => {
                                if (bIdx !== blockIndex) return block;

                                const tasks = block.tasks.map((task, tIdx) => {
                                    if (tIdx !== taskIndex) return task;
                                    return { ...task, completed: !task.completed };
                                });

                                const blockCompleted = tasks.every(t => t.completed);
                                return { ...block, tasks, completed: blockCompleted };
                            });

                            const dayCompleted = blocks.every(b => b.completed);
                            return { ...day, blocks, completed: dayCompleted };
                        });

                        return { ...sprint, dailyPlans };
                    });

                    return {
                        sprints,
                        progress: {
                            ...state.progress,
                            totalTasksCompleted: state.progress.totalTasksCompleted + 1
                        }
                    };
                }),

            updateProgress: (updates) =>
                set((state) => ({
                    progress: { ...state.progress, ...updates }
                })),

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
                progress: initialProgress
            }),
        }),
        {
            name: 'interview-prep-storage',
        }
    )
);
