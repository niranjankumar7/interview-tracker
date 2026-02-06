/**
 * API Route: POST /api/auth/register
 * Register a new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = registerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const { email, password, name } = validation.data;

        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return NextResponse.json(
                { error: emailValidation.error },
                { status: 400 }
            );
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json(
                { error: passwordValidation.error },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user with default progress and preferences
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                progress: {
                    create: {
                        currentStreak: 0,
                        longestStreak: 0,
                        totalTasksCompleted: 0,
                    },
                },
                preferences: {
                    create: {
                        theme: 'system',
                        studyRemindersEnabled: false,
                        calendarAutoSyncEnabled: false,
                        leetcodeAutoSyncEnabled: false,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });

        return NextResponse.json(
            { message: 'User created successfully', user },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
