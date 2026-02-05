// Core type definitions for Interview Prep Tracker

export const APPLICATION_STATUSES = [
    'applied',
    'shortlisted',
    'interview',
    'offer',
    'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// Extended to 10 role types for comprehensive prep templates
export const ROLE_TYPES = [
    'SDE',
    'SDET',
    'ML',
    'DevOps',
    'Frontend',
    'Backend',
    'FullStack',
    'Data',
    'PM',
    'MobileEngineer',
] as const;

export type RoleType = (typeof ROLE_TYPES)[number];

// Interview round types for round-specific prep
export const INTERVIEW_ROUND_TYPES = [
    'HR',
    'TechnicalRound1',
    'TechnicalRound2',
    'SystemDesign',
    'Managerial',
    'Assignment',
    'Final',
] as const;

export type InterviewRoundType = (typeof INTERVIEW_ROUND_TYPES)[number];

export const FOCUS_AREAS = ['DSA', 'SystemDesign', 'Behavioral', 'Review', 'Mock'] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];

export const QUESTION_CATEGORIES = ['DSA', 'SystemDesign', 'Behavioral', 'SQL', 'Other'] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const QUESTION_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const SPRINT_STATUSES = ['active', 'completed', 'expired'] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const BLOCK_TYPES = ['morning', 'evening', 'quick'] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

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
    source?: 'manual' | 'calendar';
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
    calendarAutoSyncEnabled: boolean;
}

// Track completed prep topics globally
export interface CompletedTopic {
    topicName: string;        // Normalized topic name
    displayName?: string;     // Original display name (for UI)
    completedAt: string;      // ISO date string
    source: 'chat' | 'manual';
}

export type CalendarProvider = 'google';

export interface CalendarConnection {
    provider: CalendarProvider;
    connected: boolean;
    readOnly: boolean;
    email?: string;
    connectedAt?: string;
    lastSyncAt?: string;
}

export interface CalendarEvent {
    id: string;
    provider: CalendarProvider;
    title: string;
    start: string;
    end?: string;
    organizer?: string;
    attendees?: string[];
    location?: string;
    meetingLink?: string;
    source?: 'sync' | 'import' | 'demo';
}

export interface CalendarInterviewSuggestion {
    id: string;
    eventId: string;
    title: string;
    company: string;
    role?: string;
    roleType?: RoleType;
    interviewDate: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
    status: 'pending' | 'confirmed' | 'dismissed';
    createdAt: string;
}
