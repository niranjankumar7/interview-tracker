/**
 * Auth Handler for Background Script
 * Listens for auth-related messages and handles auth state changes
 */

import { handleLoginCallback, logout, isAuthenticated, getCurrentUser } from '../shared/auth';
import type { User } from '../shared/types';

// Track auth state changes
let currentAuthState = false;

/**
 * Initialize auth handler
 */
function initialize(): void {
  console.log('[Interview Tracker] Auth handler initialized');
  
  // Set up auth check on startup
  checkAuthState();
  
  // Listen for auth-related messages
  chrome.runtime.onMessage.addListener(authMessageListener);
}

/**
 * Check and broadcast current auth state
 */
async function checkAuthState(): Promise<void> {
  const isAuth = await isAuthenticated();
  currentAuthState = isAuth;
  
  console.log('[Interview Tracker] Auth state:', isAuth ? 'authenticated' : 'unauthenticated');
}

/**
 * Handle auth-related messages
 */
function authMessageListener(
  request: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  switch (request.type) {
    case 'AUTH_LOGIN_CALLBACK':
      handleLoginCallbackMessage(request.payload as LoginCallbackPayload, sendResponse);
      return true; // Async response
      
    case 'AUTH_LOGOUT':
      handleLogoutMessage(sendResponse);
      return true; // Async response
      
    case 'AUTH_CHECK':
      handleAuthCheck(sendResponse);
      return true; // Async response
      
    case 'AUTH_GET_USER':
      handleGetUser(sendResponse);
      return true; // Async response
      
    default:
      return false; // Not handled
  }
}

interface LoginCallbackPayload {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
}

/**
 * Handle login callback message
 */
async function handleLoginCallbackMessage(
  payload: LoginCallbackPayload,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    await handleLoginCallback(payload);
    currentAuthState = true;
    
    // Broadcast auth success to all listeners
    broadcastAuthState('AUTH_SUCCESS', payload.user);
    
    sendResponse({ success: true, user: payload.user });
  } catch (error) {
    console.error('[Interview Tracker] Login callback failed:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Login failed' 
    });
  }
}

/**
 * Handle logout message
 */
async function handleLogoutMessage(
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    await logout();
    currentAuthState = false;
    
    // Broadcast logout to all listeners
    broadcastAuthState('AUTH_LOGOUT');
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Interview Tracker] Logout failed:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Logout failed' 
    });
  }
}

/**
 * Handle auth check message
 */
async function handleAuthCheck(
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    const isAuth = await isAuthenticated();
    currentAuthState = isAuth;
    
    sendResponse({ 
      success: true, 
      isAuthenticated: isAuth 
    });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Auth check failed' 
    });
  }
}

/**
 * Handle get user message
 */
async function handleGetUser(
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    const user = await getCurrentUser();
    
    sendResponse({ 
      success: true, 
      user 
    });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Get user failed' 
    });
  }
}

/**
 * Broadcast auth state change to all extension pages
 */
function broadcastAuthState(type: string, user?: User): void {
  const message = { type, user };
  
  // Send to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have content script, ignore errors
        });
      }
    });
  });
  
  // Send to runtime (for popup)
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup may not be open, ignore errors
  });
}

// Initialize on module load
initialize();

export {};
