/**
 * API Route: /api/user/me
 * GET - Get current user profile and progress
 * PUT - Update user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

const updateProfileSchema = z.object({
    name: z.string().optional(),
    targetRole: z.string().optional(),
    experienceLevel: z.enum(['Junior', 'Mid', 'Senior']).optional(),
});

// GET /api/user/me
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth(req);

        const user = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: {
                id: true,
                email: true,
                name: true,
                targetRole: true,
                experienceLevel: true,
                createdAt: true,
                progress: true,
                preferences: true,
                leetcode: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/user/me
export async function PUT(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        const body = await req.json();
        const validation = updateProfileSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        const user = await prisma.user.update({
            where: { id: auth.userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                targetRole: true,
                experienceLevel: true,
                createdAt: true,
                progress: true,
                preferences: true,
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
