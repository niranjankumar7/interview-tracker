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

    // Verify webhook signature using constant-time comparison
    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    // Use timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (sigBuffer.length !== expectedBuffer.length || 
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
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

  // Idempotent upsert: create or update subscription
  // This handles cases where the subscription row doesn't exist yet
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: "active",
      plan: plan, // Persist the paid plan from payment notes
      razorpayPaymentId: payment.id,
      razorpayOrderId: order_id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId,
      plan: plan,
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

  // Use upsert for idempotency
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: "active",
      currentPeriodStart: new Date(subscription.current_start * 1000),
      currentPeriodEnd: new Date(subscription.current_end * 1000),
    },
    create: {
      userId,
      plan: "pro", // Default, should be from subscription notes if available
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

  // Use upsert for idempotency
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: "cancelled",
    },
    create: {
      userId,
      plan: "free",
      status: "cancelled",
    },
  });

  console.log(`Subscription cancelled for user ${userId}`);
}
