/**
 * Webhook Delivery Service
 * Handles sending webhooks to user-configured endpoints
 */

import { prisma } from '@/lib/db';
import { WebhookDeliveryStatus } from '@prisma/client';
import crypto from 'crypto';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms

/**
 * Create a webhook signature for verification
 */
export function createWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify a webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  userId: string,
  event: string,
  payload: Record<string, any>
): Promise<void> {
  // Find active webhooks for this user and event
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId,
      active: true,
      events: {
        has: event,
      },
    },
  });

  if (webhooks.length === 0) return;

  const fullPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const payloadString = JSON.stringify(fullPayload);

  // Create delivery records for each webhook
  const deliveries = await Promise.all(
    webhooks.map(webhook =>
      prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: fullPayload as any,
          status: WebhookDeliveryStatus.pending,
          attempts: 0,
        },
      })
    )
  );

  // Send webhooks asynchronously
  deliveries.forEach((delivery, index) => {
    const webhook = webhooks[index];
    sendWebhook(webhook.url, webhook.secret, payloadString, delivery.id);
  });
}

/**
 * Send a single webhook with retry logic
 */
async function sendWebhook(
  url: string,
  secret: string,
  payload: string,
  deliveryId: string,
  attempt: number = 0
): Promise<void> {
  try {
    const signature = createWebhookSignature(payload, secret);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': JSON.parse(payload).event,
        'X-Webhook-Attempt': String(attempt + 1),
      },
      body: payload,
    });

    const responseText = await response.text();

    if (response.ok) {
      // Success
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.success,
          response: responseText,
          responseCode: response.status,
          attempts: attempt + 1,
          deliveredAt: new Date(),
        },
      });
    } else {
      // HTTP error - may retry
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if we should retry
    if (attempt < MAX_RETRIES - 1) {
      // Update to retrying status
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.retrying,
          response: errorMessage,
          attempts: attempt + 1,
        },
      });

      // Schedule retry
      setTimeout(() => {
        sendWebhook(url, secret, payload, deliveryId, attempt + 1);
      }, RETRY_DELAYS[attempt] || 30000);
    } else {
      // Max retries reached - mark as failed
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.failed,
          response: errorMessage,
          attempts: attempt + 1,
        },
      });
    }
  }
}

/**
 * Get webhook delivery statistics
 */
export async function getWebhookStats(webhookId: string): Promise<{
  total: number;
  successful: number;
  failed: number;
  pending: number;
}> {
  const [total, successful, failed, pending] = await Promise.all([
    prisma.webhookDelivery.count({ where: { webhookId } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: WebhookDeliveryStatus.success } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: WebhookDeliveryStatus.failed } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: { in: [WebhookDeliveryStatus.pending, WebhookDeliveryStatus.retrying] } } }),
  ]);

  return { total, successful, failed, pending };
}