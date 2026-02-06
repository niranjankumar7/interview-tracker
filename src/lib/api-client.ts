/**
 * API Client for Interview Tracker Backend
 * Handles all HTTP requests to the backend API
 */

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

export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    targetRole: string | null;
    experienceLevel: string | null;
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
        theme: string;
        studyRemindersEnabled: boolean;
        calendarAutoSyncEnabled: boolean;
        leetcodeAutoSyncEnabled: boolean;
        updatedAt: string;
    };
    leetcode: any | null;
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
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
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
    async register(data: { email: string; password: string; name?: string }): Promise<AuthResponse> {
        const response = await apiRequest<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (response.token) {
            setAuthToken(response.token);
        }

        return response;
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
};

// ============================================
// APPLICATIONS API
// ============================================

export const applicationsApi = {
    /**
     * Get all applications
     */
    async getAll(): Promise<any[]> {
        return apiRequest<any[]>('/api/applications');
    },

    /**
     * Get single application
     */
    async getById(id: string): Promise<any> {
        return apiRequest<any>(`/api/applications/${id}`);
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
    }): Promise<any> {
        return apiRequest<any>('/api/applications', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update application
     */
    async update(id: string, data: any): Promise<any> {
        return apiRequest<any>(`/api/applications/${id}`, {
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
    async getAll(filters?: { applicationId?: string; category?: string }): Promise<any[]> {
        const params = new URLSearchParams();
        if (filters?.applicationId) params.append('applicationId', filters.applicationId);
        if (filters?.category) params.append('category', filters.category);

        const query = params.toString();
        return apiRequest<any[]>(`/api/questions${query ? `?${query}` : ''}`);
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
    }): Promise<any> {
        return apiRequest<any>('/api/questions', {
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
    async getAll(filters?: { status?: string }): Promise<any[]> {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);

        const query = params.toString();
        return apiRequest<any[]>(`/api/sprints${query ? `?${query}` : ''}`);
    },

    /**
     * Create new sprint
     */
    async create(data: {
        applicationId: string;
        interviewDate: string;
        roleType: string;
        totalDays: number;
        dailyPlans: any;
    }): Promise<any> {
        return apiRequest<any>('/api/sprints', {
            method: 'POST',
            body: JSON.stringify(data),
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
