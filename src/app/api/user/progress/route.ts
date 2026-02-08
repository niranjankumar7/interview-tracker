/**
 * API Route: /api/user/progress
 * PUT - Update user progress (streak, tasks completed, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

const updateProgressSchema = z.object({
    currentStreak: z.number().int().min(0).optional(),
    longestStreak: z.number().int().min(0).optional(),
    lastActiveDate: z.string().optional(),
    totalTasksCompleted: z.number().int().min(0).optional(),
});

// PUT /api/user/progress
export async function PUT(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        const body = await req.json();
        const validation = updateProgressSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Prepare update data
        const updateData: any = {};
        if (data.currentStreak !== undefined) updateData.currentStreak = data.currentStreak;
        if (data.longestStreak !== undefined) updateData.longestStreak = data.longestStreak;
        if (data.lastActiveDate !== undefined) updateData.lastActiveDate = new Date(data.lastActiveDate);
        if (data.totalTasksCompleted !== undefined) updateData.totalTasksCompleted = data.totalTasksCompleted;

        // Update or create progress record
        const progress = await prisma.userProgress.upsert({
            where: { userId: auth.userId },
            update: updateData,
            create: {
                userId: auth.userId,
                currentStreak: data.currentStreak ?? 0,
                longestStreak: data.longestStreak ?? 0,
                lastActiveDate: data.lastActiveDate ? new Date(data.lastActiveDate) : null,
                totalTasksCompleted: data.totalTasksCompleted ?? 0,
            },
        });

        return NextResponse.json(progress);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Update progress error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
