import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Popup Entry Point
 */
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getCurrentUser, isAuthenticated } from '../shared/auth';
import { LoginView } from './components/LoginView';
import { LoggedInView } from './components/LoggedInView';
import './popup.css';
const Popup = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionExpired, setSessionExpired] = useState(false);
    const checkAuth = async () => {
        try {
            setLoading(true);
            const isAuth = await isAuthenticated();
            if (isAuth) {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    setSessionExpired(false);
                }
                else {
                    // Token exists but user fetch failed - session expired
                    setSessionExpired(true);
                    setUser(null);
                }
            }
            else {
                setUser(null);
            }
        }
        catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        checkAuth();
        // Listen for auth state changes from background
        const messageListener = (message) => {
            if (message.type === 'AUTH_SUCCESS' && message.user) {
                setUser(message.user);
                setSessionExpired(false);
            }
            else if (message.type === 'SESSION_EXPIRED') {
                setSessionExpired(true);
                setUser(null);
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);
    const handleLogout = () => {
        setUser(null);
        setSessionExpired(false);
        // Re-check auth to update state
        checkAuth();
    };
    if (loading) {
        return (_jsx("div", { className: "popup-container", children: _jsx("div", { className: "popup-loading", children: _jsx("div", { className: "popup-spinner" }) }) }));
    }
    // Show logged in view if we have a user
    if (user) {
        return (_jsx("div", { className: "popup-container", children: _jsx(LoggedInView, { user: user, onLogout: handleLogout }) }));
    }
    // Show login view
    return (_jsx("div", { className: "popup-container", children: _jsx(LoginView, {}) }));
};
// Mount the React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(_jsx(React.StrictMode, { children: _jsx(Popup, {}) }));
}
//# sourceMappingURL=index.js.map