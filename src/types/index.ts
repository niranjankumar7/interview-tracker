// Core type definitions for Interview Prep Tracker

export const APPLICATION_STATUSES = [
    'applied',
    'shortlisted',
    'interview',
    'offer',
    'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ROLE_TYPES = ['SDE', 'QA', 'Data', 'PM'] as const;

export type RoleType = (typeof ROLE_TYPES)[number];

export const FOCUS_AREAS = ['DSA', 'SystemDesign', 'Behavioral', 'Review', 'Mock'] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];

export const QUESTION_CATEGORIES = ['DSA', 'SystemDesign', 'Behavioral', 'SQL', 'Other'] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const QUESTION_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const INTERVIEW_ROUND_TYPES = ['Technical', 'HR', 'Managerial'] as const;

export type InterviewRoundType = (typeof INTERVIEW_ROUND_TYPES)[number];

export const SPRINT_STATUSES = ['active', 'completed', 'expired'] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const BLOCK_TYPES = ['morning', 'evening', 'quick'] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface Application {
    id: string;
    company: string;
    role: string;
    status: ApplicationStatus;
    applicationDate: string; // ISO date string
    interviewDate?: string; // ISO date string
    rounds: InterviewRound[];
    notes: string;
    createdAt: string;
}

export interface InterviewRound {
    roundNumber: number;
    roundType: InterviewRoundType;
    scheduledDate?: string;
    notes: string;
    questionsAsked: string[];
}

export interface Sprint {
    id: string;
    applicationId: string;
    interviewDate: string; // ISO date string
    roleType: RoleType;
    totalDays: number;
    dailyPlans: DailyPlan[];
    status: SprintStatus;
    createdAt: string;
}

export interface DailyPlan {
    day: number;
    date: string; // ISO date string
    focus: FocusArea;
    blocks: Block[];
    completed: boolean;
}

export interface Block {
    id: string;
    type: BlockType;
    duration: string;
    tasks: Task[];
    completed: boolean;
}

export interface Task {
    id: string;
    description: string;
    completed: boolean;
    category: string;
}

export interface Question {
    id: string;
    companyId: string;
    questionText: string;
    category: QuestionCategory;
    difficulty?: QuestionDifficulty;
    askedInRound?: string;
    dateAdded: string;
}

export interface UserProgress {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
    totalTasksCompleted: number;
}
