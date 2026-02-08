/**
 * Authentication Middleware
 * Verify JWT token and extract user information
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// JWT secret - MUST be set in environment variables
let cachedJwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
    if (cachedJwtSecret) return cachedJwtSecret;

    const jwtSecretString = process.env.JWT_SECRET;
    if (!jwtSecretString) {
        throw new Error(
            'FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.'
        );
    }

    cachedJwtSecret = new TextEncoder().encode(jwtSecretString);
    return cachedJwtSecret;
}

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
        const jwtSecret = getJwtSecret();
        const { payload } = await jwtVerify(token, jwtSecret);

        return {
            userId: payload.userId as string,
            email: payload.email as string,
        };
    } catch (error) {
        // Surface infrastructure misconfiguration as a real server error.
        if (error instanceof Error && error.message.includes('FATAL: JWT_SECRET')) {
            throw error;
        }

        // Only log in development to avoid noise and potential token leakage
        if (process.env.NODE_ENV === 'development') {
            console.debug('Auth verification failed');
        }
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
