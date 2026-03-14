/**
 * API Route: /api/questions/by-company
 * GET - Get questions aggregated by company with stats
 * 
 * Query params:
 * - company: Filter by specific company name
 * - category: Filter by question category
 * - includeStats: Include aggregated stats (default: true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { CompanyQuestionsResponse, AllCompaniesResponse, CompanyQuestionStats } from '@/types/api';

const querySchema = z.object({
    company: z.string().optional(),
    category: z.enum(['DSA', 'SystemDesign', 'Behavioral', 'SQL', 'Other']).optional(),
    includeStats: z.enum(['true', 'false']).default('true'),
    limit: z.string().default('50'),
});

/**
 * Get aggregated question stats for a company
 */
async function getCompanyStats(
    userId: string,
    company: string
): Promise<CompanyQuestionStats> {
    const questions = await prisma.question.findMany({
        where: {
            createdByUserId: userId,
            application: {
                company: {
                    equals: company,
                    mode: 'insensitive',
                },
            },
        },
        select: {
            category: true,
            difficulty: true,
            askedInRound: true,
        },
    });

    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const roundFrequency: Record<string, number> = {};

    for (const q of questions) {
        // Category counts
        byCategory[q.category] = (byCategory[q.category] || 0) + 1;

        // Difficulty counts
        if (q.difficulty) {
            byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
        }

        // Round frequency
        if (q.askedInRound) {
            roundFrequency[q.askedInRound] = (roundFrequency[q.askedInRound] || 0) + 1;
        }
    }

    // Get top 3 most asked rounds
    const mostAskedRounds = Object.entries(roundFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([round]) => round);

    return {
        totalQuestions: questions.length,
        byCategory,
        byDifficulty,
        mostAskedRounds,
    };
}

/**
 * Get all companies with question summaries
 */
async function getAllCompaniesSummary(userId: string): Promise<AllCompaniesResponse> {
    // Get all questions with company info
    const questions = await prisma.question.findMany({
        where: {
            createdByUserId: userId,
            applicationId: { not: null },
        },
        select: {
            category: true,
            dateAdded: true,
            application: {
                select: {
                    company: true,
                },
            },
        },
        orderBy: {
            dateAdded: 'desc',
        },
    });

    // Aggregate by company
    const companyMap = new Map<string, {
        totalQuestions: number;
        categories: Map<string, number>;
        lastAskedAt: Date | null;
    }>();

    for (const q of questions) {
        const company = q.application?.company;
        if (!company) continue;

        const normalizedName = company.trim();
        const existing = companyMap.get(normalizedName);

        if (existing) {
            existing.totalQuestions++;
            existing.categories.set(q.category, (existing.categories.get(q.category) || 0) + 1);
            if (q.dateAdded && (!existing.lastAskedAt || q.dateAdded > existing.lastAskedAt)) {
                existing.lastAskedAt = q.dateAdded;
            }
        } else {
            const categories = new Map<string, number>();
            categories.set(q.category, 1);
            companyMap.set(normalizedName, {
                totalQuestions: 1,
                categories,
                lastAskedAt: q.dateAdded,
            });
        }
    }

    const companies = Array.from(companyMap.entries())
        .map(([name, data]) => ({
            name,
            totalQuestions: data.totalQuestions,
            topCategories: Array.from(data.categories.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat]) => cat),
            lastAskedAt: data.lastAskedAt?.toISOString() || null,
        }))
        .sort((a, b) => b.totalQuestions - a.totalQuestions);

    return {
        companies,
        totalCompanies: companies.length,
    };
}

/**
 * Get detailed questions for a specific company
 */
async function getCompanyQuestions(
    userId: string,
    company: string,
    category?: string,
    limit: number = 50
): Promise<CompanyQuestionsResponse> {
    const where: Prisma.QuestionWhereInput = {
        createdByUserId: userId,
        application: {
            company: {
                equals: company,
                mode: 'insensitive',
            },
        },
    };

    if (category) {
        where.category = category;
    }

    const [questions, stats] = await Promise.all([
        prisma.question.findMany({
            where,
            select: {
                id: true,
                questionText: true,
                category: true,
                difficulty: true,
                askedInRound: true,
                dateAdded: true,
                applicationId: true,
            },
            orderBy: { dateAdded: 'desc' },
            take: limit,
        }),
        getCompanyStats(userId, company),
    ]);

    return {
        company,
        questions: questions.map(q => ({
            ...q,
            dateAdded: q.dateAdded.toISOString(),
        })),
        stats,
    };
}

// GET /api/questions/by-company
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const { searchParams } = new URL(req.url);

        const validation = querySchema.safeParse({
            company: searchParams.get('company') || undefined,
            category: searchParams.get('category') || undefined,
            includeStats: searchParams.get('includeStats') || 'true',
            limit: searchParams.get('limit') || '50',
        });

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const { company, category, includeStats, limit } = validation.data;

        // If no company specified, return summary of all companies
        if (!company) {
            const summary = await getAllCompaniesSummary(user.userId);
            return NextResponse.json(summary);
        }

        // Return detailed questions for specific company
        const data = await getCompanyQuestions(
            user.userId,
            company,
            category,
            parseInt(limit, 10)
        );

        return NextResponse.json(data);

    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get company questions error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
