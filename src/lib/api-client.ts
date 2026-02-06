/**
 * Simple API Client for Authentication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface AuthResponse {
    message: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
    token: string;
}

export const api = {
    auth: {
        async login(data: { email: string; password: string }): Promise<AuthResponse> {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Login failed' }));
                throw new Error(error.error || 'Login failed');
            }

            return response.json();
        },

        async register(data: { email: string; password: string; name: string }): Promise<AuthResponse> {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Registration failed' }));
                throw new Error(error.error || 'Registration failed');
            }

            return response.json();
        },
    },
};
