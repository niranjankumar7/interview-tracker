/**
 * Authentication module for Interview Tracker Extension
 * Handles login/logout, token storage, and auth state management
 */
import type { User, AuthState } from './types';
/**
 * Get the API base URL
 */
export declare function getApiBaseUrl(): string;
/**
 * Get the login URL for the backend
 */
export declare function getLoginUrl(): string;
/**
 * Redirect user to backend login page
 * After login, the backend should redirect to the extension with the token
 */
export declare function login(): Promise<void>;
/**
 * Handle the login callback from the backend
 * Called when the backend redirects back to the extension with tokens
 */
export declare function handleLoginCallback(tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    user: User;
}): Promise<void>;
/**
 * Logout the current user and clear all tokens
 */
export declare function logout(): Promise<void>;
/**
 * Get the stored JWT token
 * Returns null if no token exists
 */
export declare function getToken(): Promise<string | null>;
/**
 * Get the stored refresh token
 */
export declare function getRefreshToken(): Promise<string | null>;
/**
 * Get token expiration timestamp
 */
export declare function getTokenExpires(): Promise<number | null>;
/**
 * Check if the user is authenticated
 * Validates that token exists and is not expired
 */
export declare function isAuthenticated(): Promise<boolean>;
/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export declare function getCurrentUser(): Promise<User | null>;
/**
 * Refresh the access token using the refresh token
 * Returns true if successful, false otherwise
 */
export declare function refreshToken(): Promise<boolean>;
/**
 * Ensure token is valid before making API calls
 * Attempts to refresh if token is expired
 */
export declare function ensureValidToken(): Promise<string | null>;
export { User, AuthState };
//# sourceMappingURL=auth.d.ts.map