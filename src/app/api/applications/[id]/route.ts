/**
 * API Route: /api/applications/[id]
 * GET - Get single application
 * PUT - Update application
 * DELETE - Delete application
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

const updateApplicationSchema = z.object({
    company: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    jobDescriptionUrl: z.string().url().optional().nullable(),
    roleType: z.string().optional(),
    status: z.enum(['applied', 'shortlisted', 'interview', 'offer', 'rejected']).optional(),
    applicationDate: z.string().optional(),
    interviewDate: z.string().optional().nullable(),
    currentRound: z.string().optional().nullable(),
    notes: z.string().optional(),
    offerDetails: z.object({
        baseSalary: z.number().optional(),
        equity: z.string().optional(),
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

// GET /api/applications/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(req);
        const { id } = params;

        const application = await prisma.application.findFirst({
            where: {
                id,
                userId: user.userId,
            },
            include: {
                rounds: {
                    orderBy: { roundNumber: 'asc' },
                },
            },
        });

        if (!application) {
            return NextResponse.json(
                { error: 'Application not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(application);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get application error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/applications/[id]
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(req);
        const { id } = params;
        const body = await req.json();
        const validation = updateApplicationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Check if application exists and belongs to user
        const existing = await prisma.application.findFirst({
            where: { id, userId: user.userId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Application not found' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: any = {};

        if (data.company) updateData.company = data.company;
        if (data.role) updateData.role = data.role;
        if (data.jobDescriptionUrl !== undefined) updateData.jobDescriptionUrl = data.jobDescriptionUrl;
        if (data.roleType) updateData.roleType = data.roleType;
        if (data.status) updateData.status = data.status;
        if (data.applicationDate) updateData.applicationDate = new Date(data.applicationDate);
        if (data.interviewDate !== undefined) {
            updateData.interviewDate = data.interviewDate ? new Date(data.interviewDate) : null;
        }
        if (data.currentRound !== undefined) updateData.currentRound = data.currentRound;
        if (data.notes !== undefined) updateData.notes = data.notes;

        // Handle offer details
        if (data.offerDetails) {
            const offer = data.offerDetails;
            if (offer.baseSalary !== undefined) updateData.offerBaseSalary = offer.baseSalary;
            if (offer.equity !== undefined) updateData.offerEquity = offer.equity;
            if (offer.bonus !== undefined) updateData.offerBonus = offer.bonus;
            if (offer.currency !== undefined) updateData.offerCurrency = offer.currency;
            if (offer.location !== undefined) updateData.offerLocation = offer.location;
            if (offer.workMode !== undefined) updateData.offerWorkMode = offer.workMode;
            if (offer.joiningDate !== undefined) {
                updateData.offerJoiningDate = offer.joiningDate ? new Date(offer.joiningDate) : null;
            }
            if (offer.noticePeriod !== undefined) updateData.offerNoticePeriod = offer.noticePeriod;
            if (offer.benefits !== undefined) updateData.offerBenefits = offer.benefits;
            if (offer.notes !== undefined) updateData.offerNotes = offer.notes;
            if (offer.totalCTC !== undefined) updateData.offerTotalCTC = offer.totalCTC;
        }

        const application = await prisma.application.update({
            where: { id },
            data: updateData,
            include: {
                rounds: {
                    orderBy: { roundNumber: 'asc' },
                },
            },
        });

        return NextResponse.json(application);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Update application error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/applications/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(req);
        const { id } = params;

        // Check if application exists and belongs to user
        const existing = await prisma.application.findFirst({
            where: { id, userId: user.userId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Application not found' },
                { status: 404 }
            );
        }

        await prisma.application.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Application deleted successfully' });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Delete application error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
