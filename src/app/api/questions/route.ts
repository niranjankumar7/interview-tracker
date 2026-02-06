/**
 * API Route: /api/questions
 * GET - Get all questions for authenticated user
 * POST - Create a new question
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

const createQuestionSchema = z.object({
    applicationId: z.string().optional(),
    questionText: z.string().min(1),
    category: z.enum(['DSA', 'SystemDesign', 'Behavioral', 'SQL', 'Other']),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    askedInRound: z.string().optional(),
});

// GET /api/questions
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { searchParams } = new URL(req.url);
        const applicationId = searchParams.get('applicationId');
        const category = searchParams.get('category');

        const where: any = { userId: user.userId };
        if (applicationId) where.applicationId = applicationId;
        if (category) where.category = category;

        const questions = await prisma.question.findMany({
            where,
            include: {
                application: {
                    select: {
                        company: true,
                    },
                },
            },
            orderBy: { dateAdded: 'desc' },
        });

        return NextResponse.json(questions);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get questions error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/questions
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const body = await req.json();
        const validation = createQuestionSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // If applicationId provided, verify it belongs to user
        if (data.applicationId) {
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
        }

        const question = await prisma.question.create({
            data: {
                userId: user.userId,
                applicationId: data.applicationId,
                questionText: data.questionText,
                category: data.category,
                difficulty: data.difficulty,
                askedInRound: data.askedInRound,
            },
            include: {
                application: {
                    select: {
                        company: true,
                    },
                },
            },
        });

        return NextResponse.json(question, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Create question error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
