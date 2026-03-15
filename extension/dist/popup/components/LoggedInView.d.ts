/**
 * Logged In View Component
 * Shows user email and logout button for authenticated users
 */
import React from 'react';
import { User } from '../../shared/auth';
interface LoggedInViewProps {
    user: User;
    onLogout?: () => void;
}
export declare const LoggedInView: React.FC<LoggedInViewProps>;
export {};
//# sourceMappingURL=LoggedInView.d.ts.map