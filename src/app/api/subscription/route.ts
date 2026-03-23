/**
 * API Route: /api/subscription
 * GET - Get current user's subscription status
 * POST - Create new subscription (Razorpay integration placeholder)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { 
  getSubscriptionStatus, 
  getOrCreateSubscription,
  PLAN_LIMITS 
} from '@/lib/freemium';
import { prisma } from '@/lib/db';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const createSubscriptionSchema = z.object({
  plan: z.enum(['pro', 'premium']),
  paymentMethodId: z.string().optional(), // For future Razorpay integration
});

// GET /api/subscription - Get current subscription status
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const status = await getSubscriptionStatus(user.userId);

    return NextResponse.json({
      subscription: {
        id: status.subscription.id,
        status: status.subscription.status,
        plan: status.subscription.plan,
        currentPeriodStart: status.subscription.currentPeriodStart,
        currentPeriodEnd: status.subscription.currentPeriodEnd,
      },
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
        resetDate: status.usage.resetDate,
      },
      limits: PLAN_LIMITS[status.subscription.plan],
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/subscription - Create/upgrade subscription
// ⚠️ SECURITY: This endpoint no longer allows direct plan upgrades without payment.
// Use /api/payments/create-subscription and webhook verification instead.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    // Reject direct upgrades - payment must go through Razorpay flow
    return NextResponse.json(
      { 
        error: 'Direct subscription upgrades are not allowed',
        message: 'Please use the payment flow to upgrade your subscription',
        code: 'PAYMENT_REQUIRED'
      },
      { status: 403 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Create subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}