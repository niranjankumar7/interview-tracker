import type { Application, Question, Sprint, ThemePreference } from '@/types';
import type { RawSprint } from '@/types/api';

/**
 * API Client for Interview Tracker Backend
 * Handles all HTTP requests to the backend API
 */

import type { OfferDetails } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Types for API responses
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        name: string;
    };
    token: string;
    message: string;
}

export interface RegisterResponse {
    message: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        createdAt: string;
    };
}

export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    targetRole: string | null;
    experienceLevel: 'Junior' | 'Mid' | 'Senior' | null;
    createdAt: string;
    progress: {
        userId: string;
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: string | null;
        totalTasksCompleted: number;
        updatedAt: string;
    };
    preferences: {
        userId: string;
        theme: ThemePreference;
        studyRemindersEnabled: boolean;
        calendarAutoSyncEnabled: boolean;
        leetcodeAutoSyncEnabled: boolean;
        updatedAt: string;
    };
    leetcode: {
        username: string;
        connectedAt: string;
        lastSyncAt: string;
        readOnly: boolean;
        currentStreak: number;
        longestStreak: number;
        lastActiveDate: string | null;
        totalSolved: number;
        easySolved: number;
        mediumSolved: number;
        hardSolved: number;
    } | null;
}

export interface UserProgressRecord {
    userId: string;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
    totalTasksCompleted: number;
    updatedAt: string;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
}

/**
 * Set auth token in localStorage
 */
function setAuthToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', token);
}

/**
 * Remove auth token from localStorage
 */
function removeAuthToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Merge existing headers
    if (options.headers) {
        const existingHeaders = new Headers(options.headers);
        existingHeaders.forEach((value, key) => {
            headers[key] = value;
        });
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message =
            typeof payload === 'object' &&
            payload !== null &&
            'error' in payload &&
            typeof (payload as { error?: unknown }).error === 'string'
                ? (payload as { error: string }).error
                : `HTTP ${response.status}`;
        throw new Error(message);
    }

    return response.json();
}

// ============================================
// AUTHENTICATION API
// ============================================

export const authApi = {
    /**
     * Register a new user
     */
    async register(
        data: {
            email: string;
            password: string;
            name?: string;
        }
    ): Promise<RegisterResponse> {
        return apiRequest<RegisterResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Login user
     */
    async login(data: { email: string; password: string }): Promise<AuthResponse> {
        const response = await apiRequest<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (response.token) {
            setAuthToken(response.token);
        }

        return response;
    },

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        try {
            await apiRequest('/api/auth/logout', {
                method: 'POST',
            });
        } finally {
            removeAuthToken();
        }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!getAuthToken();
    },
};

// ============================================
// USER API
// ============================================

export const userApi = {
    /**
     * Get current user profile
     */
    async getProfile(): Promise<UserProfile> {
        return apiRequest<UserProfile>('/api/user/me');
    },

    /**
     * Update user profile
     */
    async updateProfile(data: {
        name?: string;
        targetRole?: string;
        experienceLevel?: 'Junior' | 'Mid' | 'Senior';
    }): Promise<UserProfile> {
        return apiRequest<UserProfile>('/api/user/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update user progress
     */
    async updateProgress(data: {
        currentStreak?: number;
        longestStreak?: number;
        lastActiveDate?: string;
        totalTasksCompleted?: number;
    }): Promise<UserProgressRecord> {
        return apiRequest<UserProgressRecord>('/api/user/progress', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};

// ============================================
// APPLICATIONS API
// ============================================

export const applicationsApi = {
    /**
     * Get all applications
     */
    async getAll(): Promise<Application[]> {
        return apiRequest<Application[]>('/api/applications');
    },

    /**
     * Get single application
     */
    async getById(id: string): Promise<Application> {
        return apiRequest<Application>(`/api/applications/${id}`);
    },

    /**
     * Create new application
     */
    async create(data: {
        company: string;
        role: string;
        jobDescriptionUrl?: string;
        roleType?: string;
        status?: 'applied' | 'shortlisted' | 'interview' | 'offer' | 'rejected';
        applicationDate?: string;
        interviewDate?: string;
        notes?: string;
        offerDetails?: OfferDetails;
    }): Promise<Application> {
        return apiRequest<Application>('/api/applications', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update application
     */
    async update(id: string, data: Partial<Application>): Promise<Application> {
        return apiRequest<Application>(`/api/applications/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Add interview round to an application
     */
    async createRound(id: string, data: {
        roundNumber: number;
        roundType: string;
        scheduledDate?: string;
        notes?: string;
        questionsAsked?: string[];
    }): Promise<any> {
        return apiRequest<any>(`/api/applications/${id}/rounds`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update an existing interview round on an application
     */
    async updateRound(
        id: string,
        roundNumber: number,
        data: {
            roundType?: string;
            scheduledDate?: string | null;
            notes?: string;
            questionsAsked?: string[];
        }
    ): Promise<any> {
        return apiRequest<any>(`/api/applications/${id}/rounds/${roundNumber}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete application
     */
    async delete(id: string): Promise<void> {
        await apiRequest(`/api/applications/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============================================
// QUESTIONS API
// ============================================

export const questionsApi = {
    /**
     * Get all questions
     */
    async getAll(filters?: { applicationId?: string; category?: string }): Promise<Question[]> {
        const params = new URLSearchParams();
        if (filters?.applicationId) params.append('applicationId', filters.applicationId);
        if (filters?.category) params.append('category', filters.category);

        const query = params.toString();
        return apiRequest<Question[]>(`/api/questions${query ? `?${query}` : ''}`);
    },

    /**
     * Create new question
     */
    async create(data: {
        questionText: string;
        category: 'DSA' | 'SystemDesign' | 'Behavioral' | 'SQL' | 'Other';
        difficulty?: 'Easy' | 'Medium' | 'Hard';
        askedInRound?: string;
        applicationId?: string;
    }): Promise<Question> {
        return apiRequest<Question>('/api/questions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

// ============================================
// SPRINTS API
// ============================================

export const sprintsApi = {
    /**
     * Get all sprints
     */
    async getAll(filters?: { status?: string }): Promise<Array<RawSprint>> {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);

        const query = params.toString();
        return apiRequest<Array<RawSprint>>(`/api/sprints${query ? `?${query}` : ''}`);
    },

    /**
     * Get single sprint
     */
    async getById(id: string): Promise<any> {
        return apiRequest<any>(`/api/sprints/${id}`);
    },

    /**
     * Create new sprint
     */
    async create(data: {
        applicationId: string;
        interviewDate: string;
        roleType: string;
        totalDays: number;
        dailyPlans: unknown;
    }): Promise<Sprint> {
        return apiRequest<Sprint>('/api/sprints', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update sprint
     */
    async update(id: string, data: {
        status?: 'active' | 'completed' | 'expired';
        dailyPlans?: any;
        interviewDate?: string;
        roleType?: string;
        totalDays?: number;
    }): Promise<any> {
        return apiRequest<any>(`/api/sprints/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Complete or uncomplete a single task in a sprint plan
     */
    async completeTask(id: string, data: {
        dayIndex: number;
        blockIndex: number;
        taskIndex: number;
        completed: boolean;
    }): Promise<any> {
        return apiRequest<any>(`/api/sprints/${id}/tasks/complete`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete sprint
     */
    async delete(id: string): Promise<void> {
        await apiRequest(`/api/sprints/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============================================
// EXPORT ALL
// ============================================

export const api = {
    auth: authApi,
    user: userApi,
    applications: applicationsApi,
    questions: questionsApi,
    sprints: sprintsApi,
};

export default api;
