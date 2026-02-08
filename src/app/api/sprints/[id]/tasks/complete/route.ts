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

        const sprint = await prisma.sprint.update({
            where: { id },
            data: {
                dailyPlans: dailyPlans as unknown as Prisma.InputJsonValue,
                status: nextStatus,
            },
        });

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
