/**
 * API Route: /api/sprints/[id]
 * GET - Get a single sprint
 * PUT - Update a sprint
 * DELETE - Delete a sprint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { Prisma } from '@prisma/client';

const roleTypeSchema = z.enum([
    'SDE',
    'SDET',
    'ML',
    'DevOps',
    'Frontend',
    'Backend',
    'FullStack',
    'Data',
    'PM',
    'MobileEngineer',
]);

// Schema for individual task in a daily plan
const taskSchema = z.object({
    id: z.string(),
    description: z.string(),
    completed: z.boolean().default(false),
    category: z.string().optional(),
    estimatedMinutes: z.number().optional(),
});

// Schema for a block within a daily plan
const blockSchema = z.object({
    id: z.string(),
    type: z.string(),
    duration: z.string(),
    completed: z.boolean().default(false),
    tasks: z.array(taskSchema),
});

// Schema for a daily plan
const dailyPlanSchema = z.object({
    day: z.number().int().min(1),
    date: z.string(),
    focus: z.string(),
    completed: z.boolean().default(false),
    blocks: z.array(blockSchema),
});

const updateSprintSchema = z.object({
    status: z.enum(['active', 'completed', 'expired']).optional(),
    dailyPlans: z.array(dailyPlanSchema).optional(),
    interviewDate: z
        .string()
        .refine((value) => !Number.isNaN(new Date(value).getTime()), {
            message: 'Invalid interviewDate',
        })
        .optional(),
    roleType: roleTypeSchema.optional(),
    totalDays: z.number().int().min(1).max(30).optional(),
});

// GET /api/sprints/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await params;

        const sprint = await prisma.sprint.findFirst({
            where: {
                id,
                userId: user.userId,
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

        if (!sprint) {
            return NextResponse.json(
                { error: 'Sprint not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(sprint);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get sprint error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/sprints/[id]
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await params;
        const body = await req.json();
        const validation = updateSprintSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Verify sprint belongs to user
        const existingSprint = await prisma.sprint.findFirst({
            where: {
                id,
                userId: user.userId,
            },
        });

        if (!existingSprint) {
            return NextResponse.json(
                { error: 'Sprint not found' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: Prisma.SprintUpdateInput = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.dailyPlans !== undefined) updateData.dailyPlans = data.dailyPlans;
        if (data.interviewDate !== undefined) {
            const parsedInterviewDate = new Date(data.interviewDate);
            if (Number.isNaN(parsedInterviewDate.getTime())) {
                return NextResponse.json(
                    { error: 'Invalid interviewDate' },
                    { status: 400 }
                );
            }
            updateData.interviewDate = parsedInterviewDate;
        }
        if (data.roleType !== undefined) updateData.roleType = data.roleType;
        if (data.totalDays !== undefined) updateData.totalDays = data.totalDays;

        const sprint = await prisma.sprint.update({
            where: { id },
            data: updateData,
            include: {
                application: {
                    select: {
                        company: true,
                        role: true,
                    },
                },
            },
        });

        return NextResponse.json(sprint);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Update sprint error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/sprints/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await params;

        // Verify sprint belongs to user
        const existingSprint = await prisma.sprint.findFirst({
            where: {
                id,
                userId: user.userId,
            },
        });

        if (!existingSprint) {
            return NextResponse.json(
                { error: 'Sprint not found' },
                { status: 404 }
            );
        }

        await prisma.sprint.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Sprint deleted successfully' });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Delete sprint error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
