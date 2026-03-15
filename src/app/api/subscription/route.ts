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
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validation = createSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { plan } = validation.data;

    // Get or create current subscription
    const currentSubscription = await getOrCreateSubscription(user.userId);

    // Calculate new period dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Update subscription
    // Note: This is a placeholder. In production, integrate with Razorpay
    // to create a subscription and get a razorpaySubscriptionId
    const updatedSubscription = await prisma.subscription.update({
      where: { userId: user.userId },
      data: {
        plan: plan as SubscriptionPlan,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        // razorpaySubscriptionId: 'razorpay_sub_id_placeholder',
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        plan: updatedSubscription.plan,
        status: updatedSubscription.status,
        currentPeriodStart: updatedSubscription.currentPeriodStart,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
      },
      message: `Successfully upgraded to ${plan} plan`,
      note: 'Razorpay integration pending - no actual payment processed',
    });
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