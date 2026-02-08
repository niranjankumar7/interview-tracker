/**
 * API Route: POST /api/auth/login
 * Login user and return session token
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { SignJWT } from 'jose';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

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


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const { email, password } = validation.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                passwordHash: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Create JWT token
        const jwtSecret = getJwtSecret();
        const token = await new SignJWT({ userId: user.id, email: user.email })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d') // Token expires in 7 days
            .sign(jwtSecret);

        // Return user data and token
        const response = NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token,
        });

        // Set HTTP-only cookie for token
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
