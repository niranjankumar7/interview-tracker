import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Application, Sprint, Question, UserProgress } from '@/types';

interface AppState {
    // Data
    applications: Application[];
    sprints: Sprint[];
    questions: Question[];
    // Unique IDs/slugs for study topics the user has marked as completed.
    completedTopics: string[];
    progress: UserProgress;

    // Actions
    addApplication: (app: Application) => void;
    updateApplication: (id: string, updates: Partial<Application>) => void;
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

const createInitialProgress = (): UserProgress => ({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString(),
    totalTasksCompleted: 0,
});

const createResetProgress = (): UserProgress => ({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date(0).toISOString(),
    totalTasksCompleted: 0,
});

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            applications: [],
            sprints: [],
            questions: [],
            completedTopics: [],
            progress: createInitialProgress(),

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
                completedTopics: [],
                progress: createResetProgress()
            }),
        }),
        {
            name: 'interview-prep-storage',
        }
    )
);
