/**
 * API Route: /api/sprints
 * GET - Get all sprints for authenticated user
 * POST - Create a new sprint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

const createSprintSchema = z.object({
    applicationId: z.string(),
    interviewDate: z.string(),
    roleType: z.string(),
    totalDays: z.number().int().min(1).max(30),
    dailyPlans: z.any(), // JSON data
});

// GET /api/sprints
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        const where: any = { userId: user.userId };
        if (status) where.status = status;

        const sprints = await prisma.sprint.findMany({
            where,
            include: {
                application: {
                    select: {
                        company: true,
                        role: true,
                    },
                },
            },
            orderBy: { interviewDate: 'asc' },
        });

        return NextResponse.json(sprints);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get sprints error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/sprints
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const body = await req.json();
        const validation = createSprintSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Verify application belongs to user
        const application = await prisma.application.findFirst({
            where: {
                id: data.applicationId,
                userId: user.userId,
            },
        });

        if (!application) {
            return NextResponse.json(
                { error: 'Application not found' },
                { status: 404 }
            );
        }

        const sprint = await prisma.sprint.create({
            data: {
                userId: user.userId,
                applicationId: data.applicationId,
                interviewDate: new Date(data.interviewDate),
                roleType: data.roleType,
                totalDays: data.totalDays,
                dailyPlans: data.dailyPlans,
                status: 'active',
            },
            include: {
                application: {
                    select: {
                        company: true,
                        role: true,
                    },
                },
            },
        });

        return NextResponse.json(sprint, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Create sprint error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
