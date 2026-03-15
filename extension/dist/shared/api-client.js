/**
 * API Client for Interview Tracker Extension
 * Wrapper around fetch with auth headers and automatic token refresh
 */
import { ensureValidToken, refreshToken, logout, getApiBaseUrl, } from './auth';
// Default request timeout
const DEFAULT_TIMEOUT = 30000;
/**
 * Build the full API URL
 */
function buildUrl(endpoint) {
    const baseUrl = getApiBaseUrl();
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseUrl}/api/${cleanEndpoint}`;
}
/**
 * Get default headers including auth if available
 */
async function getHeaders(skipAuth) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Extension-Version': chrome.runtime.getManifest().version,
    };
    if (!skipAuth) {
        const token = await ensureValidToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return headers;
}
/**
 * Make an authenticated API request
 * Automatically handles token refresh on 401 responses
 */
export async function apiRequest(endpoint, config = {}) {
    const { timeout = DEFAULT_TIMEOUT, skipAuth, ...fetchConfig } = config;
    const url = buildUrl(endpoint);
    const headers = await getHeaders(skipAuth);
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...fetchConfig,
            headers: {
                ...headers,
                ...fetchConfig.headers,
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        // Handle 401 by attempting token refresh once
        if (response.status === 401 && !skipAuth) {
            console.log('[Interview Tracker] Token expired, attempting refresh...');
            const refreshed = await refreshToken();
            if (refreshed) {
                // Retry the request with new token
                const newHeaders = await getHeaders();
                const retryResponse = await fetch(url, {
                    ...fetchConfig,
                    headers: {
                        ...newHeaders,
                        ...fetchConfig.headers,
                    },
                });
                return handleResponse(retryResponse);
            }
            else {
                // Refresh failed, logout
                await logout();
                throw new ApiError('Session expired. Please log in again.', 401);
            }
        }
        return handleResponse(response);
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof ApiError) {
            throw error;
        }
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new ApiError('Request timed out', 408);
            }
            throw new ApiError(error.message, 0);
        }
        throw new ApiError('Unknown error', 0);
    }
}
/**
 * Handle API response and parse JSON
 */
async function handleResponse(response) {
    if (!response.ok) {
        let errorMessage = `Request failed: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        }
        catch {
            // Response wasn't JSON, use status text
            errorMessage = response.statusText || errorMessage;
        }
        throw new ApiError(errorMessage, response.status);
    }
    // Handle empty responses
    if (response.status === 204) {
        return undefined;
    }
    return await response.json();
}
/**
 * Custom API error class
 */
export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
/**
 * GET request helper
 */
export function get(endpoint, config) {
    return apiRequest(endpoint, { ...config, method: 'GET' });
}
/**
 * POST request helper
 */
export function post(endpoint, data, config) {
    return apiRequest(endpoint, {
        ...config,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    });
}
/**
 * PUT request helper
 */
export function put(endpoint, data, config) {
    return apiRequest(endpoint, {
        ...config,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    });
}
/**
 * PATCH request helper
 */
export function patch(endpoint, data, config) {
    return apiRequest(endpoint, {
        ...config,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
    });
}
/**
 * DELETE request helper
 */
export function del(endpoint, config) {
    return apiRequest(endpoint, { ...config, method: 'DELETE' });
}
// Export client as namespace for convenience
export const api = {
    request: apiRequest,
    get,
    post,
    put,
    patch,
    delete: del,
};
//# sourceMappingURL=api-client.js.map