import { storage } from '../shared/storage.js';
// DOM Elements
const loginView = document.getElementById('login-view');
const userView = document.getElementById('user-view');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');
const addInterviewBtn = document.getElementById('add-interview-btn');
const viewDashboardBtn = document.getElementById('view-dashboard-btn');
// State
let currentUser = null;
/**
 * Initialize popup
 */
async function init() {
    console.log('[Interview Tracker] Popup initialized');
    // Check service worker health
    await checkHealth();
    // Load auth state
    await loadAuthState();
    // Setup event listeners
    setupEventListeners();
}
/**
 * Check service worker health
 */
async function checkHealth() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' });
        if (response?.healthy) {
            updateStatus(true, 'Connected');
        }
        else {
            updateStatus(false, 'Disconnected');
        }
    }
    catch (error) {
        console.error('[Interview Tracker] Health check failed:', error);
        updateStatus(false, 'Error');
    }
}
/**
 * Update connection status UI
 */
function updateStatus(online, text) {
    statusDot.classList.toggle('online', online);
    statusDot.classList.toggle('offline', !online);
    statusText.textContent = text;
}
/**
 * Load authentication state from storage
 */
async function loadAuthState() {
    try {
        const authState = await storage.get('authState');
        if (authState?.isAuthenticated && authState.user) {
            currentUser = authState.user;
            showAuthenticatedUI();
        }
        else {
            showUnauthenticatedUI();
        }
    }
    catch (error) {
        console.error('[Interview Tracker] Failed to load auth state:', error);
        showUnauthenticatedUI();
    }
}
/**
 * Show UI for authenticated user
 */
function showAuthenticatedUI() {
    loginView.classList.add('hidden');
    userView.classList.remove('hidden');
    if (currentUser) {
        userEmail.textContent = currentUser.email;
    }
    // Enable action buttons
    addInterviewBtn.disabled = false;
    viewDashboardBtn.disabled = false;
}
/**
 * Show UI for unauthenticated user
 */
function showUnauthenticatedUI() {
    loginView.classList.remove('hidden');
    userView.classList.add('hidden');
    // Disable action buttons
    addInterviewBtn.disabled = true;
    viewDashboardBtn.disabled = true;
}
/**
 * Handle login
 */
async function handleLogin() {
    // Simulate login - replace with actual auth flow
    const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString()
    };
    const authState = {
        isAuthenticated: true,
        user: mockUser,
        token: 'mock-token-xyz'
    };
    await storage.set('authState', authState);
    currentUser = mockUser;
    showAuthenticatedUI();
    console.log('[Interview Tracker] User logged in:', mockUser.email);
}
/**
 * Handle logout
 */
async function handleLogout() {
    await storage.remove('authState');
    currentUser = null;
    showUnauthenticatedUI();
    console.log('[Interview Tracker] User logged out');
}
/**
 * Setup event listeners
 */
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    addInterviewBtn.addEventListener('click', () => {
        console.log('[Interview Tracker] Add interview clicked');
        // TODO: Open add interview modal or page
    });
    viewDashboardBtn.addEventListener('click', () => {
        console.log('[Interview Tracker] View dashboard clicked');
        // TODO: Open dashboard in new tab
        chrome.tabs.create({ url: 'https://example.com/dashboard' });
    });
}
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
//# sourceMappingURL=popup.js.map