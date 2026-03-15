/**
 * Content Script for Interview Tracker Extension
 *
 * Detects successful login on the Interview Tracker website
 * and communicates the token to the background script.
 */
declare const API_BASE_URL = "http://localhost:3000";
/**
 * Check if current page is the Interview Tracker auth page
 */
declare function isInterviewTrackerAuthPage(): boolean;
/**
 * Check if current page is an auth callback
 */
declare function isAuthCallback(): boolean;
/**
 * Extract auth data from the page
 * Looks for a specific meta tag or data attribute set by the server
 */
declare function extractAuthData(): {
    token: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
} | null;
/**
 * Send auth data to background script
 */
declare function sendAuthToBackground(data: {
    token: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
}): Promise<void>;
/**
 * Show a visual notification that auth was successful
 */
declare function showAuthSuccessNotification(user: {
    name: string | null;
    email: string;
}): Promise<void>;
/**
 * Monitor for auth data on the page
 */
declare function monitorForAuthData(): void;
/**
 * Inject script to expose auth data from the web app
 */
declare function injectAuthBridge(): void;
declare function initialize(): void;
//# sourceMappingURL=index.d.ts.map