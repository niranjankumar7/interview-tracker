/**
 * API Route: /api/applications
 * GET - Get all applications for authenticated user
 * POST - Create a new application
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

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

const createApplicationSchema = z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    jobDescriptionUrl: z.string().url().optional(),
    roleType: roleTypeSchema.optional(),
    status: z.enum(['applied', 'shortlisted', 'interview', 'offer', 'rejected']).default('applied'),
    applicationDate: z.string().optional(),
    interviewDate: z.string().optional(),
    notes: z.string().default(''),
    offerDetails: z.object({
        baseSalary: z.number().optional(),
        equity: z.union([z.string(), z.number()]).optional(),
        bonus: z.number().optional(),
        currency: z.string().optional(),
        location: z.string().optional(),
        workMode: z.enum(['WFH', 'Hybrid', 'Office']).optional(),
        joiningDate: z.string().optional(),
        noticePeriod: z.string().optional(),
        benefits: z.array(z.string()).optional(),
        notes: z.string().optional(),
        totalCTC: z.number().optional(),
    }).optional(),
});

// GET /api/applications - Get all applications
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        const applications = await prisma.application.findMany({
            where: { userId: user.userId },
            include: {
                rounds: {
                    orderBy: { roundNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(applications);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get applications error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/applications - Create new application
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const body = await req.json();
        const validation = createApplicationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;
        const offer = data.offerDetails;

        const application = await prisma.application.create({
            data: {
                userId: user.userId,
                company: data.company,
                role: data.role,
                jobDescriptionUrl: data.jobDescriptionUrl,
                roleType: data.roleType,
                status: data.status,
                applicationDate: data.applicationDate ? new Date(data.applicationDate) : new Date(),
                interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
                notes: data.notes,
                offerBaseSalary: offer?.baseSalary,
                offerEquity: offer?.equity?.toString(),
                offerBonus: offer?.bonus,
                offerCurrency: offer?.currency,
                offerLocation: offer?.location,
                offerWorkMode: offer?.workMode,
                offerJoiningDate: offer?.joiningDate ? new Date(offer.joiningDate) : null,
                offerNoticePeriod: offer?.noticePeriod,
                offerBenefits: offer?.benefits ?? [],
                offerNotes: offer?.notes,
                offerTotalCTC: offer?.totalCTC,
            },
            include: {
                rounds: true,
            },
        });

        return NextResponse.json(application, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Create application error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
