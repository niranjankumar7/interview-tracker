import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Logged In View Component
 * Shows user email and logout button for authenticated users
 */
import { useState } from 'react';
import { logout } from '../../shared/auth';
export const LoggedInView = ({ user, onLogout }) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            onLogout?.();
        }
        catch (error) {
            console.error('[Interview Tracker] Logout failed:', error);
        }
        finally {
            setIsLoggingOut(false);
        }
    };
    // Get initials from user name or email
    const getInitials = () => {
        if (user.name) {
            return user.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return user.email.slice(0, 2).toUpperCase();
    };
    return (_jsxs("div", { className: "logged-in-view", children: [_jsxs("div", { className: "user-header", children: [_jsx("div", { className: "user-avatar", children: user.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: user.name || user.email, className: "user-avatar-img" })) : (_jsx("span", { className: "user-avatar-initials", children: getInitials() })) }), _jsxs("div", { className: "user-info", children: [_jsx("p", { className: "user-email", title: user.email, children: user.email }), user.name && (_jsx("p", { className: "user-name", children: user.name }))] })] }), _jsx("div", { className: "user-actions", children: _jsx("button", { className: "logout-btn", onClick: handleLogout, disabled: isLoggingOut, children: isLoggingOut ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "logout-spinner" }), "Signing out..."] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "logout-icon", children: "\uD83D\uDEAA" }), "Sign Out"] })) }) }), _jsx("style", { children: `
        .logged-in-view {
          padding: 16px;
        }

        .user-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .user-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-avatar-initials {
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-email {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-name {
          font-size: 12px;
          color: #6b7280;
          margin: 2px 0 0 0;
        }

        .user-actions {
          display: flex;
          justify-content: flex-end;
        }

        .logout-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: transparent;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover:not(:disabled) {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }

        .logout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logout-icon {
          font-size: 14px;
        }

        .logout-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #e5e7eb;
          border-top-color: #6b7280;
          border-radius: 50%;
          animation: logoutSpin 0.8s linear infinite;
        }

        @keyframes logoutSpin {
          to {
            transform: rotate(360deg);
          }
        }
      ` })] }));
};
//# sourceMappingURL=LoggedInView.js.map