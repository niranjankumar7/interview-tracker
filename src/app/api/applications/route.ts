/**
 * API Route: /api/applications
 * GET - Get all applications for authenticated user
 * POST - Create a new application (with deduplication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { 
    createOrMergeApplication, 
    getDeduplicationStats,
    ApplicationInput 
} from '@/lib/dedupe-service';

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
    externalJobId: z.string().optional(),
    source: z.enum(['web', 'extension', 'import']).default('web'),
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

// POST /api/applications - Create new application (with deduplication)
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

        // Prepare application input for deduplication service
        const applicationInput: ApplicationInput = {
            company: data.company,
            role: data.role,
            jobDescriptionUrl: data.jobDescriptionUrl,
            externalJobId: data.externalJobId,
            status: data.status,
            notes: data.notes,
            applicationDate: data.applicationDate ? new Date(data.applicationDate) : new Date(),
            source: data.source,
        };

        // Use deduplication service to create or merge
        const result = await createOrMergeApplication(
            prisma,
            user.userId,
            applicationInput,
            {
                source: data.source,
                roleType: data.roleType,
                offerDetails: offer,
            }
        );

        // If it was a merge, we need to update the offer details separately
        // since they weren't handled in the initial merge
        if (result.action === 'merged' && offer) {
            await prisma.application.update({
                where: { id: result.application.id },
                data: {
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
                    roleType: data.roleType,
                },
            });

            // Refresh the application data
            const updatedApp = await prisma.application.findUnique({
                where: { id: result.application.id },
                include: { rounds: true },
            });

            if (updatedApp) {
                result.application = updatedApp;
            }
        } else if (result.action === 'created') {
            // For new applications, we need to add the offer details
            if (offer || data.roleType) {
                const updated = await prisma.application.update({
                    where: { id: result.application.id },
                    data: {
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
                        roleType: data.roleType,
                    },
                    include: { rounds: true },
                });
                result.application = updated;
            }
        }

        // Build response with deduplication info
        const response = {
            ...result.application,
            _deduplication: {
                action: result.action,
                matchType: result.match?.matchType,
                confidence: result.match?.confidence,
                existingApplicationId: result.match?.existingApplicationId,
                warnings: result.warnings,
            },
        };

        const statusCode = result.action === 'created' ? 201 : 200;
        return NextResponse.json(response, { status: statusCode });

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
