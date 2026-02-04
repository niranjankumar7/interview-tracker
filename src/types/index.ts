// Core type definitions for Interview Prep Tracker

export type ApplicationStatus =
    | 'applied'
    | 'shortlisted'
    | 'interview'
    | 'offer'
    | 'rejected';

// Extended to 10 role types for comprehensive prep templates
export type RoleType =
    | 'SDE'
    | 'SDET'
    | 'ML'
    | 'DevOps'
    | 'Frontend'
    | 'Backend'
    | 'FullStack'
    | 'Data'
    | 'PM'
    | 'MobileEngineer';

// Interview round types for round-specific prep
export type InterviewRoundType =
    | 'HR'
    | 'TechnicalRound1'
    | 'TechnicalRound2'
    | 'SystemDesign'
    | 'Managerial'
    | 'Assignment'
    | 'Final';

export type FocusArea =
    | 'DSA'
    | 'SystemDesign'
    | 'Behavioral'
    | 'Review'
    | 'Mock';

export type QuestionCategory =
    | 'DSA'
    | 'SystemDesign'
    | 'Behavioral'
    | 'SQL'
    | 'Other';

export interface Application {
    id: string;
    company: string;
    role: string;
    roleType?: RoleType; // Structured role type for prep templates
    status: ApplicationStatus;
    applicationDate: string; // ISO date string
    interviewDate?: string; // ISO date string
    currentRound?: InterviewRoundType; // Current interview round for prep
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
    feedback?: {
        rating: number; // 1-5 stars
        pros: string[];
        cons: string[];
        struggledTopics: string[]; // List of topic names
        notes: string;
    };
}

export interface Sprint {
    id: string;
    applicationId: string;
    interviewDate: string; // ISO date string
    roleType: RoleType;
    totalDays: number;
    dailyPlans: DailyPlan[];
    status: 'active' | 'completed' | 'expired';
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
    type: 'morning' | 'evening' | 'quick';
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
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    askedInRound?: string;
    dateAdded: string;
}

export interface UserProgress {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
    totalTasksCompleted: number;
}
export type ExperienceLevel = 'Junior' | 'Mid' | 'Senior';

export interface UserProfile {
    name: string;
    targetRole: string;
    experienceLevel: ExperienceLevel;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface AppPreferences {
    theme: ThemePreference;
    studyRemindersEnabled: boolean;
}

// Track completed prep topics globally
export interface CompletedTopic {
    topicName: string;        // Normalized topic name
    displayName?: string;     // Original display name (for UI)
    completedAt: string;      // ISO date string
    source: 'chat' | 'manual';
}
