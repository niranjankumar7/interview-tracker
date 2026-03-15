/**
 * API Client for Interview Tracker Extension
 * Wrapper around fetch with auth headers and automatic token refresh
 */
interface RequestConfig extends RequestInit {
    timeout?: number;
    skipAuth?: boolean;
}
/**
 * Make an authenticated API request
 * Automatically handles token refresh on 401 responses
 */
export declare function apiRequest<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T>;
/**
 * Custom API error class
 */
export declare class ApiError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
/**
 * GET request helper
 */
export declare function get<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T>;
/**
 * POST request helper
 */
export declare function post<T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T>;
/**
 * PUT request helper
 */
export declare function put<T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T>;
/**
 * PATCH request helper
 */
export declare function patch<T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T>;
/**
 * DELETE request helper
 */
export declare function del<T = unknown>(endpoint: string, config?: RequestConfig): Promise<T>;
export declare const api: {
    request: typeof apiRequest;
    get: typeof get;
    post: typeof post;
    put: typeof put;
    patch: typeof patch;
    delete: typeof del;
};
export {};
//# sourceMappingURL=api-client.d.ts.map