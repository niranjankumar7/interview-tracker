/**
 * API Route: /api/usage
 * GET - Get current usage stats
 * POST /api/usage/track - Track usage increment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { 
  getSubscriptionStatus, 
  trackUsage, 
  checkUsageLimit,
  PLAN_LIMITS 
} from '@/lib/freemium';

const trackUsageSchema = z.object({
  action: z.enum(['application', 'message']),
});

// GET /api/usage - Get current usage stats
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const status = await getSubscriptionStatus(user.userId);

    return NextResponse.json({
      plan: status.subscription.plan,
      subscriptionStatus: status.subscription.status,
      usage: {
        applications: {
          used: status.usage.applications,
          limit: status.usage.limits.applicationsPerMonth,
          remaining: Math.max(0, status.usage.limits.applicationsPerMonth - status.usage.applications),
          percentage: Math.min(100, Math.round((status.usage.applications / status.usage.limits.applicationsPerMonth) * 100)),
        },
        messages: {
          used: status.usage.messages,
          limit: status.usage.limits.messagesPerMonth,
          remaining: Math.max(0, status.usage.limits.messagesPerMonth - status.usage.messages),
          percentage: Math.min(100, Math.round((status.usage.messages / status.usage.limits.messagesPerMonth) * 100)),
        },
      },
      resetDate: status.usage.resetDate,
      limits: PLAN_LIMITS[status.subscription.plan],
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Get usage error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/usage/track - Track usage increment
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validation = trackUsageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { action } = validation.data;

    // Check if action is allowed
    const check = await checkUsageLimit(user.userId, action);
    
    if (!check.allowed) {
      return NextResponse.json(
        { 
          error: 'Usage limit exceeded',
          message: check.reason,
          code: 'PAYMENT_REQUIRED',
          usage: {
            current: check.current,
            limits: check.limits,
            plan: check.plan,
          }
        },
        { status: 402 } // Payment Required
      );
    }

    // Track the usage
    await trackUsage(user.userId, action);

    // Get updated status
    const status = await getSubscriptionStatus(user.userId);

    return NextResponse.json({
      success: true,
      action,
      usage: {
        applications: {
          used: status.usage.applications,
          limit: status.usage.limits.applicationsPerMonth,
          remaining: Math.max(0, status.usage.limits.applicationsPerMonth - status.usage.applications),
        },
        messages: {
          used: status.usage.messages,
          limit: status.usage.limits.messagesPerMonth,
          remaining: Math.max(0, status.usage.limits.messagesPerMonth - status.usage.messages),
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Track usage error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}