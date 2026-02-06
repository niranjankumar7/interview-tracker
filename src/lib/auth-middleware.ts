/**
 * Authentication Middleware
 * Verify JWT token and extract user information
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export interface AuthUser {
    userId: string;
    email: string;
}

/**
 * Get authenticated user from request
 * Returns user data if authenticated, null otherwise
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
    try {
        // Try to get token from cookie first
        let token = req.cookies.get('auth-token')?.value;

        // If not in cookie, try Authorization header
        if (!token) {
            const authHeader = req.headers.get('authorization');
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return null;
        }

        // Verify token
        const { payload } = await jwtVerify(token, JWT_SECRET);

        return {
            userId: payload.userId as string,
            email: payload.email as string,
        };
    } catch (error) {
        console.error('Auth verification error:', error);
        return null;
    }
}

/**
 * Require authentication
 * Throws error if user is not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<AuthUser> {
    const user = await getAuthUser(req);

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}
