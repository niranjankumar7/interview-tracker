import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { getDailyPlansArray } from '@/lib/sprint-utils';
import { Prisma } from '@prisma/client';

const completeTaskSchema = z.object({
    dayIndex: z.number().int().min(0),
    blockIndex: z.number().int().min(0),
    taskIndex: z.number().int().min(0),
    completed: z.boolean(),
});

const persistedTaskSchema = z.object({
    id: z.string(),
    description: z.string(),
    completed: z.boolean(),
    category: z.string().optional(),
    estimatedMinutes: z.number().optional(),
});

const persistedBlockSchema = z.object({
    id: z.string(),
    type: z.string(),
    duration: z.string(),
    completed: z.boolean(),
    tasks: z.array(persistedTaskSchema),
});

const persistedDailyPlanSchema = z.object({
    day: z.number().int().min(1),
    date: z.string(),
    focus: z.string(),
    completed: z.boolean(),
    blocks: z.array(persistedBlockSchema),
});

// PUT /api/sprints/[id]/tasks/complete
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await params;
        const body = await req.json();
        const validation = completeTaskSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const existingSprint = await prisma.sprint.findFirst({
            where: { id, userId: user.userId },
        });

        if (!existingSprint) {
            return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
        }

        const { dayIndex, blockIndex, taskIndex, completed } = validation.data;

        const dailyPlans = getDailyPlansArray(existingSprint.dailyPlans).map((day) => ({
            ...day,
            blocks: (day.blocks ?? []).map((block) => ({
                ...block,
                tasks: [...(block.tasks ?? [])],
            })),
        }));

        const targetDay = dailyPlans[dayIndex];
        const targetBlock = targetDay?.blocks?.[blockIndex];
        const targetTask = targetBlock?.tasks?.[taskIndex];

        if (!targetDay || !targetBlock || !targetTask) {
            return NextResponse.json(
                { error: 'Invalid task path for sprint daily plan' },
                { status: 400 }
            );
        }

        targetTask.completed = completed;
        targetBlock.completed = targetBlock.tasks.every((task) => task.completed);
        targetDay.completed = targetDay.blocks.every((block) => block.completed);

        const isSprintCompleted = dailyPlans.every((day) => day.completed);
        const nextStatus =
            existingSprint.status === 'completed'
                ? 'completed'
                : isSprintCompleted
                    ? 'completed'
                    : existingSprint.status;

        // Validate normalized payload before persistence to avoid writing malformed JSON.
        const normalizedPlansResult = z.array(persistedDailyPlanSchema).safeParse(dailyPlans);
        if (!normalizedPlansResult.success) {
            return NextResponse.json(
                {
                    error: 'Invalid sprint daily plan structure',
                    issues: normalizedPlansResult.error.issues,
                },
                { status: 400 }
            );
        }

        const serializedDailyPlans: Prisma.InputJsonValue = JSON.parse(
            JSON.stringify(normalizedPlansResult.data)
        );

        // Optimistic concurrency: only update if updatedAt has not changed since read.
        const updateResult = await prisma.sprint.updateMany({
            where: {
                id,
                userId: user.userId,
                updatedAt: existingSprint.updatedAt,
            },
            data: {
                dailyPlans: serializedDailyPlans,
                status: nextStatus,
            },
        });

        if (updateResult.count === 0) {
            return NextResponse.json(
                {
                    error: 'Sprint was updated elsewhere. Refresh and retry.',
                    code: 'CONFLICT',
                },
                { status: 409 }
            );
        }

        const sprint = await prisma.sprint.findFirst({
            where: { id, userId: user.userId },
        });

        if (!sprint) {
            return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
        }

        return NextResponse.json(sprint);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Complete sprint task error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
