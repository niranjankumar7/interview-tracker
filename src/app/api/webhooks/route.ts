/**
 * API Route: /api/webhooks
 * GET - List user's webhooks
 * POST - Create webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

// Valid webhook events
export const WEBHOOK_EVENTS = [
  'application.created',
  'application.updated',
  'application.deleted',
  'application.status_changed',
  'interview.scheduled',
  'interview.completed',
  'offer.received',
  'sprint.created',
  'sprint.completed',
] as const;

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  active: z.boolean().default(true),
});

// GET /api/webhooks - List user's webhooks
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.userId },
      include: {
        _count: {
          select: { deliveries: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Don't return the secret in the list
    const sanitizedWebhooks = webhooks.map(webhook => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
      deliveryCount: webhook._count.deliveries,
    }));

    return NextResponse.json({
      webhooks: sanitizedWebhooks,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('List webhooks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create webhook
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validation = createWebhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { url, events, active } = validation.data;

    // Generate a secret for webhook signature verification
    const secret = `whsec_${randomBytes(32).toString('hex')}`;

    const webhook = await prisma.webhook.create({
      data: {
        userId: user.userId,
        url,
        events,
        secret,
        active,
      },
    });

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        secret: webhook.secret, // Only shown once on creation
        createdAt: webhook.createdAt,
      },
      message: 'Webhook created successfully. Save the secret - it will not be shown again.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Create webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}