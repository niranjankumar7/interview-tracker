/**
 * API Route: /api/webhooks/[id]
 * DELETE - Delete a webhook
 * GET - Get webhook details with recent deliveries
 * PATCH - Update webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { WEBHOOK_EVENTS } from '../route';

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
  active: z.boolean().optional(),
});

// GET /api/webhooks/[id] - Get webhook details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
      recentDeliveries: webhook.deliveries.map(d => ({
        id: d.id,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        responseCode: d.responseCode,
        createdAt: d.createdAt,
        deliveredAt: d.deliveredAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Get webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/webhooks/[id] - Update webhook
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const validation = updateWebhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: validation.error.issues },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      success: true,
      webhook: {
        id: updated.id,
        url: updated.url,
        events: updated.events,
        active: updated.active,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Update webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    // Verify the webhook belongs to the user
    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Delete the webhook (cascade will delete deliveries)
    await prisma.webhook.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Delete webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}