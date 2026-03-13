/**
 * API Route: /api/applications/[id]/merge-history
 * GET - Get merge history for a specific application
 * 
 * Returns:
 * - mergeHistory: Array of merge events showing when data was merged
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getApplicationMergeHistory } from '@/lib/dedupe-service';
import { prisma } from '@/lib/db';

// GET /api/applications/[id]/merge-history - Get merge history
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await params;

        // Verify the application belongs to the user
        const application = await prisma.application.findFirst({
            where: {
                id,
                userId: user.userId,
            },
            select: { id: true },
        });

        if (!application) {
            return NextResponse.json(
                { error: 'Application not found' },
                { status: 404 }
            );
        }

        // Get merge history
        const mergeHistory = await getApplicationMergeHistory(prisma, id);

        return NextResponse.json({
            success: true,
            applicationId: id,
            mergeHistory,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get merge history error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
