/**
 * Authentication module for Interview Tracker Extension
 * Handles login/logout, token storage, and auth state management
 */
import { storage } from './storage';
// Auth storage keys
const AUTH_STATE_KEY = 'authState';
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRES_KEY = 'tokenExpires';
// API base URL from environment
const API_BASE_URL = 'http://localhost:3000';
/**
 * Get the API base URL
 */
export function getApiBaseUrl() {
    return API_BASE_URL;
}
/**
 * Get the login URL for the backend
 */
export function getLoginUrl() {
    return `${API_BASE_URL}/auth/login`;
}
/**
 * Redirect user to backend login page
 * After login, the backend should redirect to the extension with the token
 */
export async function login() {
    const loginUrl = getLoginUrl();
    const redirectUrl = chrome.identity?.getRedirectURL?.() || chrome.runtime.getURL('popup.html');
    // Construct the full login URL with redirect back to extension
    const fullLoginUrl = `${loginUrl}?redirect_uri=${encodeURIComponent(redirectUrl)}`;
    // Open login in a new tab
    await chrome.tabs.create({ url: fullLoginUrl });
}
/**
 * Handle the login callback from the backend
 * Called when the backend redirects back to the extension with tokens
 */
export async function handleLoginCallback(tokens) {
    const { accessToken, refreshToken, expiresIn, user } = tokens;
    // Calculate expiration time
    const expiresAt = expiresIn
        ? Date.now() + expiresIn * 1000
        : Date.now() + 3600 * 1000; // Default 1 hour
    // Store tokens
    await storage.set(TOKEN_KEY, accessToken);
    if (refreshToken) {
        await storage.set(REFRESH_TOKEN_KEY, refreshToken);
    }
    await storage.set(TOKEN_EXPIRES_KEY, expiresAt);
    // Store auth state
    const authState = {
        isAuthenticated: true,
        user,
        token: accessToken,
        expiresAt: new Date(expiresAt).toISOString(),
    };
    await storage.set(AUTH_STATE_KEY, authState);
    console.log('[Interview Tracker] Login successful for:', user.email);
}
/**
 * Logout the current user and clear all tokens
 */
export async function logout() {
    try {
        // Optionally notify backend of logout
        const token = await getToken();
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
            catch (error) {
                // Ignore errors - still clear local state
                console.warn('[Interview Tracker] Logout request failed:', error);
            }
        }
    }
    finally {
        // Clear all auth data from storage
        await storage.remove(TOKEN_KEY);
        await storage.remove(REFRESH_TOKEN_KEY);
        await storage.remove(TOKEN_EXPIRES_KEY);
        await storage.remove(AUTH_STATE_KEY);
        console.log('[Interview Tracker] Logout complete');
    }
}
/**
 * Get the stored JWT token
 * Returns null if no token exists
 */
export async function getToken() {
    return await storage.get(TOKEN_KEY);
}
/**
 * Get the stored refresh token
 */
export async function getRefreshToken() {
    return await storage.get(REFRESH_TOKEN_KEY);
}
/**
 * Get token expiration timestamp
 */
export async function getTokenExpires() {
    return await storage.get(TOKEN_EXPIRES_KEY);
}
/**
 * Check if the user is authenticated
 * Validates that token exists and is not expired
 */
export async function isAuthenticated() {
    const token = await getToken();
    if (!token) {
        return false;
    }
    const expiresAt = await getTokenExpires();
    if (!expiresAt) {
        return true; // No expiration set, assume valid
    }
    // Check if token is expired (with 5 minute buffer)
    const isExpired = Date.now() >= expiresAt - 5 * 60 * 1000;
    return !isExpired;
}
/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
    const authState = await storage.get(AUTH_STATE_KEY);
    return authState?.user || null;
}
/**
 * Refresh the access token using the refresh token
 * Returns true if successful, false otherwise
 */
export async function refreshToken() {
    const refreshTokenValue = await getRefreshToken();
    if (!refreshTokenValue) {
        return false;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });
        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.status}`);
        }
        const data = await response.json();
        if (data.accessToken && data.user) {
            await handleLoginCallback({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                expiresIn: data.expiresIn,
                user: data.user,
            });
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('[Interview Tracker] Token refresh failed:', error);
        // Clear auth state on refresh failure
        await logout();
        return false;
    }
}
/**
 * Ensure token is valid before making API calls
 * Attempts to refresh if token is expired
 */
export async function ensureValidToken() {
    const isAuth = await isAuthenticated();
    if (isAuth) {
        return await getToken();
    }
    // Token might be expired, try to refresh
    const refreshed = await refreshToken();
    if (refreshed) {
        return await getToken();
    }
    return null;
}
//# sourceMappingURL=auth.js.map