/**
 * Freemium utility functions for usage tracking and limits
 * Stub implementation for PR #54 - will be fully implemented in PR #55
 */

import { prisma } from './db';

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface UsageCounters {
  promptsSent: number;
  kanbanCardsCreated: number;
  remainingLimit: number | null;
}

const FREE_APPLICATION_LIMIT = 5;

/**
 * Check if user has exceeded their usage limit for a specific action
 */
export async function checkUsageLimit(
  userId: string,
  action: 'message' | 'application'
): Promise<UsageCheckResult> {
  if (action === 'application') {
    const applicationsCount = await prisma.application.count({
      where: { userId },
    });

    if (applicationsCount >= FREE_APPLICATION_LIMIT) {
      return {
        allowed: false,
        reason: `Free plan limit reached (${FREE_APPLICATION_LIMIT} applications).`,
      };
    }
  }

  return { allowed: true };
}

export async function getUsageCounters(userId: string): Promise<UsageCounters> {
  const applicationsCount = await prisma.application.count({
    where: { userId },
  });

  return {
    promptsSent: 0,
    kanbanCardsCreated: applicationsCount,
    remainingLimit: Math.max(0, FREE_APPLICATION_LIMIT - applicationsCount),
  };
}

/**
 * Track usage for a specific action
 */
export async function trackUsage(
  _userId: string,
  _action: 'message' | 'application'
): Promise<void> {
  void _userId;
  void _action;
  // Intentionally a no-op until dedicated usage tables land.
}
