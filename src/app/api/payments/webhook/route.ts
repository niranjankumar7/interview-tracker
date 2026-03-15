import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case "subscription.charged":
        await handleSubscriptionCharged(event.payload.subscription.entity);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;

      default:
        console.log(`Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment: any) {
  const { notes, order_id } = payment;
  const userId = notes?.userId;
  const plan = notes?.plan;

  if (!userId || !plan) {
    console.error("Missing userId or plan in payment notes");
    return;
  }

  // Update subscription to active
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "active",
      razorpayPaymentId: payment.id,
      razorpayOrderId: order_id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Reset usage limits
  await prisma.usageLimit.upsert({
    where: { userId },
    update: {
      applicationsCount: 0,
      messagesCount: 0,
      resetDate: new Date(),
    },
    create: {
      userId,
      applicationsCount: 0,
      messagesCount: 0,
      resetDate: new Date(),
    },
  });

  console.log(`Payment captured for user ${userId}, plan: ${plan}`);
}

async function handleSubscriptionCharged(subscription: any) {
  const userId = subscription.notes?.userId;
  if (!userId) return;

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "active",
      currentPeriodStart: new Date(subscription.current_start * 1000),
      currentPeriodEnd: new Date(subscription.current_end * 1000),
    },
  });

  console.log(`Subscription charged for user ${userId}`);
}

async function handleSubscriptionCancelled(subscription: any) {
  const userId = subscription.notes?.userId;
  if (!userId) return;

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "cancelled",
    },
  });

  console.log(`Subscription cancelled for user ${userId}`);
}
