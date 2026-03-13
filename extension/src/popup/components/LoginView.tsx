/**
 * Login View Component
 * Simple login button for unauthenticated users
 */

import React from 'react';
import { login } from '../../shared/auth';

export const LoginView: React.FC = () => {
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('[Interview Tracker] Login failed:', error);
    }
  };

  return (
    <div className="login-view">
      <div className="login-header">
        <h1 className="login-title">Interview Tracker</h1>
        <p className="login-subtitle">
          Track your job applications and interview progress
        </p>
      </div>

      <div className="login-content">
        <div className="login-icon">📋</div>
        <p className="login-description">
          Sign in to save job applications from LinkedIn, Greenhouse, and more.
        </p>
        
        <button 
          className="login-btn"
          onClick={handleLogin}
        >
          <span className="login-btn-icon">🔐</span>
          Sign In
        </button>
        
        <p className="login-hint">
          You&apos;ll be redirected to our secure login page
        </p>
      </div>

      <style>{`
        .login-view {
          padding: 24px;
          text-align: center;
        }

        .login-header {
          margin-bottom: 24px;
        }

        .login-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .login-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .login-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .login-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }

        .login-description {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
        }

        .login-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          width: 100%;
          justify-content: center;
        }

        .login-btn:hover {
          background: #4338ca;
        }

        .login-btn:active {
          transform: scale(0.98);
        }

        .login-btn-icon {
          font-size: 16px;
        }

        .login-hint {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
        }
      `}</style>
    </div>
  );
};
