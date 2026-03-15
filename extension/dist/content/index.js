"use strict";
/**
 * Content Script for Interview Tracker Extension
 *
 * Detects successful login on the Interview Tracker website
 * and communicates the token to the background script.
 */
// Configuration
const API_BASE_URL = 'http://localhost:3000';
/**
 * Check if current page is the Interview Tracker auth page
 */
function isInterviewTrackerAuthPage() {
    return window.location.href.includes('/auth');
}
/**
 * Check if current page is an auth callback
 */
function isAuthCallback() {
    return window.location.href.includes('/auth/callback') ||
        window.location.search.includes('token=');
}
/**
 * Extract auth data from the page
 * Looks for a specific meta tag or data attribute set by the server
 */
function extractAuthData() {
    // Try to get auth data from meta tags
    const authMeta = document.querySelector('meta[name="extension-auth"]');
    if (authMeta) {
        try {
            const data = JSON.parse(authMeta.getAttribute('content') || '');
            if (data.token && data.user) {
                return data;
            }
        }
        catch (error) {
            console.error('Failed to parse auth meta tag:', error);
        }
    }
    // Try to get auth data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userData = urlParams.get('user');
    if (token && userData) {
        try {
            const user = JSON.parse(decodeURIComponent(userData));
            return { token, user };
        }
        catch (error) {
            console.error('Failed to parse user data from URL:', error);
        }
    }
    // Try to get auth data from a global variable (set by the web app)
    const globalAuth = window.__EXTENSION_AUTH__;
    if (globalAuth?.token && globalAuth?.user) {
        return globalAuth;
    }
    return null;
}
/**
 * Send auth data to background script
 */
async function sendAuthToBackground(data) {
    try {
        await chrome.runtime.sendMessage({
            type: 'AUTH_CALLBACK',
            ...data,
        });
        // Show a notification to the user
        showAuthSuccessNotification(data.user);
    }
    catch (error) {
        console.error('Failed to send auth data to background:', error);
    }
}
/**
 * Show a visual notification that auth was successful
 */
async function showAuthSuccessNotification(user) {
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'interview-tracker-auth-notification';
    notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease;
    ">
      <span style="font-size: 24px;">✓</span>
      <div>
        <div style="font-weight: 600; font-size: 14px;">Successfully signed in!</div>
        <div style="font-size: 13px; opacity: 0.9;">${user.name || user.email}</div>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    </style>
  `;
    document.body.appendChild(notification);
    // Remove after 3 seconds
    setTimeout(() => {
        const el = document.getElementById('interview-tracker-auth-notification');
        if (el) {
            el.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => el.remove(), 300);
        }
    }, 3000);
}
/**
 * Monitor for auth data on the page
 */
function monitorForAuthData() {
    // Check immediately
    const authData = extractAuthData();
    if (authData) {
        sendAuthToBackground(authData);
        return;
    }
    // Set up a MutationObserver to watch for auth data being added to the page
    const observer = new MutationObserver((mutations) => {
        const authData = extractAuthData();
        if (authData) {
            observer.disconnect();
            sendAuthToBackground(authData);
        }
    });
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['content', 'data-auth'],
    });
    // Stop watching after 10 seconds
    setTimeout(() => observer.disconnect(), 10000);
}
/**
 * Inject script to expose auth data from the web app
 */
function injectAuthBridge() {
    const script = document.createElement('script');
    script.textContent = `
    (function() {
      // Listen for messages from the web app
      window.addEventListener('message', function(event) {
        // Only accept messages from the same origin
        if (event.origin !== window.location.origin) return;
        
        if (event.data?.type === 'EXTENSION_AUTH') {
          // Store auth data in a way the content script can access
          window.__EXTENSION_AUTH__ = event.data.payload;
          
          // Also dispatch a custom event for immediate notification
          window.dispatchEvent(new CustomEvent('interviewTrackerAuth', {
            detail: event.data.payload
          }));
        }
      });
    })();
  `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
}
// Main initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
}
else {
    initialize();
}
function initialize() {
    // Inject auth bridge script
    injectAuthBridge();
    // Listen for auth events from the injected script
    window.addEventListener('interviewTrackerAuth', ((event) => {
        const data = event.detail;
        if (data?.token && data?.user) {
            sendAuthToBackground(data);
        }
    }));
    // Check for auth callback in URL
    if (isAuthCallback()) {
        monitorForAuthData();
    }
    // Also monitor on the auth page in case of inline login
    if (isInterviewTrackerAuthPage()) {
        monitorForAuthData();
    }
}
// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_AUTH_DATA') {
        const authData = extractAuthData();
        sendResponse(authData);
    }
    return true;
});
console.log('Interview Tracker content script loaded');
//# sourceMappingURL=index.js.map