import type { Sprint } from "@/types";

export type RawSprint = Omit<Sprint, "dailyPlans"> & {
    dailyPlans: Sprint["dailyPlans"] | string | null;
};

// ============================================
// Company Questions API Types
// ============================================

export type CompanyQuestionStats = {
    totalQuestions: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
    mostAskedRounds: string[];
};

export type CompanyQuestionsResponse = {
    company: string;
    questions: Array<{
        id: string;
        questionText: string;
        category: string;
        difficulty: string | null;
        askedInRound: string | null;
        dateAdded: string;
        applicationId: string | null;
    }>;
    stats: CompanyQuestionStats;
};

export type AllCompaniesResponse = {
    companies: Array<{
        name: string;
        totalQuestions: number;
        topCategories: string[];
        lastAskedAt: string | null;
    }>;
    totalCompanies: number;
};

// ============================================
// Struggled Topics API Types
// ============================================

export type StruggledTopicItem = {
    topic: string;
    count: number;
    companies: string[];
    relatedRounds: string[];
    lastOccurred: string;
};

export type StruggledTopicsResponse = {
    totalOccurrences: number;
    uniqueTopics: number;
    topics: StruggledTopicItem[];
    byCompany?: Record<string, string[]>;
};
