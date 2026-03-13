/**
 * Background Script Entry Point
 */

// Import auth handler to set up listeners
import './auth-handler';

// Re-export auth functions for use by other modules
export { handleLoginCallback, logout, getToken, isAuthenticated } from '../shared/auth';
