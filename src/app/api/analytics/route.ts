/**
 * API Route: /api/analytics
 * GET /api/analytics/overview - Dashboard stats
 * GET /api/analytics/funnel - Conversion funnel data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

// Helper function to calculate date ranges
function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'all':
      startDate.setFullYear(2000); // Effectively all time
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}

// GET /api/analytics/overview - Dashboard stats
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'overview';
    const range = searchParams.get('range') || '30d';

    const { startDate, endDate } = getDateRange(range);

    if (type === 'overview') {
      // Get basic stats
      const [
        totalApplications,
        activeApplications,
        interviewsScheduled,
        offersReceived,
        totalRounds,
        applicationsByStatus,
        recentApplications,
        applicationsOverTime,
      ] = await Promise.all([
        // Total applications
        prisma.application.count({
          where: {
            userId: user.userId,
            applicationDate: { gte: startDate, lte: endDate },
          },
        }),
        // Active applications (not rejected or offer)
        prisma.application.count({
          where: {
            userId: user.userId,
            status: { notIn: ['rejected', 'offer'] },
          },
        }),
        // Interviews scheduled
        prisma.interviewRound.count({
          where: {
            application: { userId: user.userId },
            scheduledDate: { gte: startDate, lte: endDate },
          },
        }),
        // Offers received
        prisma.application.count({
          where: {
            userId: user.userId,
            status: 'offer',
            updatedAt: { gte: startDate, lte: endDate },
          },
        }),
        // Total interview rounds completed
        prisma.interviewRound.count({
          where: {
            application: { userId: user.userId },
            feedbackRating: { not: null },
          },
        }),
        // Applications by status
        prisma.application.groupBy({
          by: ['status'],
          where: { userId: user.userId },
          _count: { status: true },
        }),
        // Recent applications
        prisma.application.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            company: true,
            role: true,
            status: true,
            createdAt: true,
          },
        }),
        // Applications over time (by week)
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('week', "applicationDate") as week,
            COUNT(*) as count
          FROM "Application"
          WHERE "userId" = ${user.userId}
            AND "applicationDate" >= ${startDate}
            AND "applicationDate" <= ${endDate}
          GROUP BY DATE_TRUNC('week', "applicationDate")
          ORDER BY week ASC
        `,
      ]);

      // Calculate conversion rates
      const offerRate = totalApplications > 0 
        ? Math.round((offersReceived / totalApplications) * 100) 
        : 0;
      const interviewRate = totalApplications > 0
        ? Math.round((interviewsScheduled / totalApplications) * 100)
        : 0;

      // Format applications by status
      const statusCounts = applicationsByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        overview: {
          totalApplications,
          activeApplications,
          interviewsScheduled,
          offersReceived,
          totalRounds,
          conversionRates: {
            offerRate,
            interviewRate,
          },
        },
        statusBreakdown: statusCounts,
        recentApplications,
        applicationsOverTime: (applicationsOverTime as any[]).map(row => ({
          week: row.week,
          count: Number(row.count),
        })),
        period: {
          range,
          startDate,
          endDate,
        },
      });
    }

    if (type === 'funnel') {
      // Get funnel data - progression through stages
      const funnelData = await Promise.all([
        // Stage 1: Applied
        prisma.application.count({
          where: { userId: user.userId },
        }),
        // Stage 2: Shortlisted/Phone Screen
        prisma.application.count({
          where: { 
            userId: user.userId,
            status: { in: ['shortlisted', 'interview'] },
          },
        }),
        // Stage 3: Technical Rounds
        prisma.application.count({
          where: {
            userId: user.userId,
            OR: [
              { status: 'interview' },
              { rounds: { some: {} } },
            ],
          },
        }),
        // Stage 4: Final Rounds
        prisma.$queryRaw`
          SELECT COUNT(DISTINCT "applicationId") as count
          FROM "InterviewRound"
          WHERE "roundNumber" >= 3
            AND "applicationId" IN (
              SELECT id FROM "Application" WHERE "userId" = ${user.userId}
            )
        `,
        // Stage 5: Offers
        prisma.application.count({
          where: { userId: user.userId, status: 'offer' },
        }),
      ]);

      const [applied, shortlisted, technical, finalResult, offers] = funnelData;
      const finalRounds = Number((finalResult as any[])[0]?.count || 0);

      const funnel = [
        { stage: 'Applied', count: applied },
        { stage: 'Shortlisted', count: shortlisted },
        { stage: 'Technical Interview', count: technical },
        { stage: 'Final Round', count: finalRounds },
        { stage: 'Offer Received', count: offers },
      ];

      // Calculate drop-off rates
      const funnelWithRates = funnel.map((stage, index) => {
        const previousCount = index > 0 ? funnel[index - 1].count : stage.count;
        const conversionRate = previousCount > 0 
          ? Math.round((stage.count / previousCount) * 100) 
          : 0;
        const dropOffRate = index > 0 ? 100 - conversionRate : 0;
        
        return {
          ...stage,
          conversionRate,
          dropOffRate,
        };
      });

      return NextResponse.json({
        funnel: funnelWithRates,
        overallConversion: applied > 0 
          ? Math.round((offers / applied) * 100) 
          : 0,
      });
    }

    return NextResponse.json(
      { error: 'Invalid analytics type. Use "overview" or "funnel".' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}