/**
 * API Route: /api/questions
 * GET - Get all questions (global question bank)
 * POST - Create a new question
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const createQuestionSchema = z.object({
    applicationId: z.string().optional(),
    questionText: z.string().min(1),
    category: z.enum(['DSA', 'SystemDesign', 'Behavioral', 'SQL', 'Other']),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    askedInRound: z.string().optional(),
});

type LegacyQuestionRow = {
    id: string;
    applicationId: string | null;
    questionText: string;
    category: string;
    difficulty: string | null;
    askedInRound: string | null;
    dateAdded: Date | string;
    createdByUserId: string;
    applicationCompany: string | null;
};

type LegacyCreatedQuestionRow = {
    id: string;
    applicationId: string | null;
    questionText: string;
    category: string;
    difficulty: string | null;
    askedInRound: string | null;
    dateAdded: Date | string;
    userId: string;
};

function toIsoDateString(value: Date | string): string {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function isMissingCreatedByUserIdColumn(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2022') return false;

    const missingColumn = String(error.meta?.column ?? '').toLowerCase();
    return missingColumn.includes('createdbyuserid');
}

async function getQuestionsFromLegacySchema(
    applicationId: string | null,
    category: string | null
) {
    const conditions: Prisma.Sql[] = [];
    if (applicationId) {
        conditions.push(Prisma.sql`q."applicationId" = ${applicationId}`);
    }
    if (category) {
        conditions.push(Prisma.sql`q."category" = ${category}`);
    }

    const whereClause =
        conditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
            : Prisma.empty;

    const rows = await prisma.$queryRaw<LegacyQuestionRow[]>(Prisma.sql`
        SELECT
            q."id",
            q."applicationId",
            q."questionText",
            q."category",
            q."difficulty",
            q."askedInRound",
            q."dateAdded",
            q."userId" AS "createdByUserId",
            a."company" AS "applicationCompany"
        FROM "Question" q
        LEFT JOIN "Application" a ON a."id" = q."applicationId"
        ${whereClause}
        ORDER BY q."dateAdded" DESC
    `);

    return rows.map((row) => ({
        id: row.id,
        applicationId: row.applicationId,
        questionText: row.questionText,
        category: row.category,
        difficulty: row.difficulty,
        askedInRound: row.askedInRound,
        dateAdded: toIsoDateString(row.dateAdded),
        createdByUserId: row.createdByUserId,
        application: row.applicationCompany
            ? {
                company: row.applicationCompany,
            }
            : null,
    }));
}

async function createQuestionInLegacySchema(params: {
    userId: string;
    applicationId?: string;
    questionText: string;
    category: 'DSA' | 'SystemDesign' | 'Behavioral' | 'SQL' | 'Other';
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    askedInRound?: string;
}) {
    const rows = await prisma.$queryRaw<LegacyCreatedQuestionRow[]>(Prisma.sql`
        INSERT INTO "Question" (
            "id",
            "userId",
            "applicationId",
            "questionText",
            "category",
            "difficulty",
            "askedInRound",
            "dateAdded"
        )
        VALUES (
            ${randomUUID()},
            ${params.userId},
            ${params.applicationId ?? null},
            ${params.questionText},
            ${params.category},
            ${params.difficulty ?? null},
            ${params.askedInRound ?? null},
            CURRENT_TIMESTAMP
        )
        RETURNING
            "id",
            "applicationId",
            "questionText",
            "category",
            "difficulty",
            "askedInRound",
            "dateAdded",
            "userId"
    `);

    const created = rows[0];
    if (!created) {
        throw new Error('Failed to create question in legacy schema');
    }

    const application = created.applicationId
        ? await prisma.application.findUnique({
            where: { id: created.applicationId },
            select: { company: true },
        })
        : null;

    return {
        id: created.id,
        applicationId: created.applicationId,
        questionText: created.questionText,
        category: created.category,
        difficulty: created.difficulty,
        askedInRound: created.askedInRound,
        dateAdded: toIsoDateString(created.dateAdded),
        createdByUserId: created.userId,
        application: application
            ? {
                company: application.company,
            }
            : null,
    };
}

// GET /api/questions
export async function GET(req: NextRequest) {
    let applicationId: string | null = null;
    let category: string | null = null;

    try {
        await requireAuth(req);
        const { searchParams } = new URL(req.url);
        applicationId = searchParams.get('applicationId');
        category = searchParams.get('category');

        // Build where clause with proper typing
        const where: Prisma.QuestionWhereInput = {};
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
        if (isMissingCreatedByUserIdColumn(error)) {
            try {
                const legacyQuestions = await getQuestionsFromLegacySchema(
                    applicationId,
                    category
                );
                return NextResponse.json(legacyQuestions);
            } catch (legacyError) {
                console.error('Legacy get questions fallback error:', legacyError);
            }
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
    let userId: string | null = null;
    let validatedData: z.infer<typeof createQuestionSchema> | null = null;

    try {
        const user = await requireAuth(req);
        userId = user.userId;
        const body = await req.json();
        const validation = createQuestionSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;
        validatedData = data;

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
                createdByUserId: user.userId,
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
        if (isMissingCreatedByUserIdColumn(error) && userId && validatedData) {
            try {
                const legacyQuestion = await createQuestionInLegacySchema({
                    userId,
                    ...validatedData,
                });
                return NextResponse.json(legacyQuestion, { status: 201 });
            } catch (legacyError) {
                console.error('Legacy create question fallback error:', legacyError);
            }
        }

        console.error('Create question error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
