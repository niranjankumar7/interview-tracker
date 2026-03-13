/**
 * API Route: /api/applications/dedupe-stats
 * GET - Get deduplication statistics for the authenticated user
 * 
 * Returns:
 * - duplicateRate: Percentage of captures that were duplicates
 * - falsePositiveRate: Estimated rate of incorrect merges
 * - totalCaptures: Total number of application captures
 * - duplicatesFound: Number of duplicate applications detected
 * - softMatches: Number of potential duplicates flagged
 * - mergeHistory: Recent merge events
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getDeduplicationStats, getApplicationMergeHistory } from '@/lib/dedupe-service';
import { prisma } from '@/lib/db';

// GET /api/applications/dedupe-stats - Get deduplication statistics
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        // Get deduplication stats
        const stats = await getDeduplicationStats(prisma, user.userId);

        return NextResponse.json({
            success: true,
            stats: {
                duplicateRate: stats.duplicateRate,
                falsePositiveRate: stats.falsePositiveRate,
                totalCaptures: stats.totalCaptures,
                duplicatesFound: stats.duplicatesFound,
                softMatches: stats.softMatches,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.error('Get deduplication stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
