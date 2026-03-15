/**
 * Freemium Check Library
 * Handles subscription status and usage limits
 */

import { prisma } from '@/lib/db';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

// Plan limits
export const PLAN_LIMITS = {
  free: {
    applicationsPerMonth: 5,
    messagesPerMonth: 50,
  },
  pro: {
    applicationsPerMonth: 50,
    messagesPerMonth: 500,
  },
  premium: {
    applicationsPerMonth: Infinity,
    messagesPerMonth: Infinity,
  },
};

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  current: {
    applications: number;
    messages: number;
  };
  limits: {
    applications: number;
    messages: number;
  };
  plan: SubscriptionPlan;
}

/**
 * Get or create user subscription
 */
export async function getOrCreateSubscription(userId: string) {
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    subscription = await prisma.subscription.create({
      data: {
        userId,
        status: SubscriptionStatus.active,
        plan: SubscriptionPlan.free,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  return subscription;
}

/**
 * Get or create user usage limits
 */
export async function getOrCreateUsageLimit(userId: string) {
  let usageLimit = await prisma.usageLimit.findUnique({
    where: { userId },
  });

  if (!usageLimit) {
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    usageLimit = await prisma.usageLimit.create({
      data: {
        userId,
        applicationsCount: 0,
        messagesCount: 0,
        resetDate,
      },
    });
  }

  // Check if we need to reset counters
  const now = new Date();
  if (now >= usageLimit.resetDate) {
    const newResetDate = new Date(now);
    newResetDate.setMonth(newResetDate.getMonth() + 1);
    newResetDate.setDate(1);
    newResetDate.setHours(0, 0, 0, 0);

    usageLimit = await prisma.usageLimit.update({
      where: { userId },
      data: {
        applicationsCount: 0,
        messagesCount: 0,
        resetDate: newResetDate,
      },
    });
  }

  return usageLimit;
}

/**
 * Check if user can perform an action
 */
export async function checkUsageLimit(
  userId: string,
  action: 'application' | 'message'
): Promise<UsageCheck> {
  const subscription = await getOrCreateSubscription(userId);
  const usageLimit = await getOrCreateUsageLimit(userId);

  const limits = PLAN_LIMITS[subscription.plan];

  let allowed = true;
  let reason: string | undefined;

  if (action === 'application') {
    if (usageLimit.applicationsCount >= limits.applicationsPerMonth) {
      allowed = false;
      reason = `Free plan limit: ${limits.applicationsPerMonth} applications per month. Upgrade to add more.`;
    }
  } else if (action === 'message') {
    if (usageLimit.messagesCount >= limits.messagesPerMonth) {
      allowed = false;
      reason = `Free plan limit: ${limits.messagesPerMonth} messages per month. Upgrade to continue chatting.`;
    }
  }

  return {
    allowed,
    reason,
    current: {
      applications: usageLimit.applicationsCount,
      messages: usageLimit.messagesCount,
    },
    limits: {
      applications: limits.applicationsPerMonth,
      messages: limits.messagesPerMonth,
    },
    plan: subscription.plan,
  };
}

/**
 * Increment usage counter
 */
export async function trackUsage(
  userId: string,
  action: 'application' | 'message'
): Promise<void> {
  const usageLimit = await getOrCreateUsageLimit(userId);

  if (action === 'application') {
    await prisma.usageLimit.update({
      where: { userId },
      data: { applicationsCount: { increment: 1 } },
    });
  } else if (action === 'message') {
    await prisma.usageLimit.update({
      where: { userId },
      data: { messagesCount: { increment: 1 } },
    });
  }
}

/**
 * Get full subscription status with usage
 */
export async function getSubscriptionStatus(userId: string) {
  const subscription = await getOrCreateSubscription(userId);
  const usageLimit = await getOrCreateUsageLimit(userId);
  const limits = PLAN_LIMITS[subscription.plan];

  return {
    subscription,
    usage: {
      applications: usageLimit.applicationsCount,
      messages: usageLimit.messagesCount,
      limits,
      resetDate: usageLimit.resetDate,
    },
  };
}