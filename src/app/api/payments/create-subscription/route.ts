import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Validate environment variables at startup
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error("Missing required Razorpay environment variables");
}

const PLAN_CONFIG = {
  pro: {
    amount: 49900, // ₹499 in paise
    name: "Blueprint Pro",
    description: "Pro subscription for job seekers",
  },
  premium: {
    amount: 99900, // ₹999 in paise
    name: "Blueprint Premium",
    description: "Premium subscription with coaching",
  },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!plan || !PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if env vars are configured
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 503 }
      );
    }

    const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];

    // Create Razorpay order
    const orderData = {
      amount: config.amount,
      currency: "INR",
      receipt: `sub_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        plan: plan,
      },
    };

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
        ).toString("base64")}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await response.json();

    if (!response.ok) {
      console.error("Razorpay order creation failed:", order);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create or update subscription record
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        plan: plan,
        status: "pending",
        razorpayOrderId: order.id,
      },
      create: {
        userId: user.id,
        plan: plan,
        status: "pending",
        razorpayOrderId: order.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Return checkout configuration for client-side Razorpay
    return NextResponse.json({
      orderId: order.id,
      amount: config.amount,
      currency: "INR",
      key: RAZORPAY_KEY_ID,
      name: config.name,
      description: config.description,
      prefill: {
        email: user.email,
        name: user.name || "",
      },
      notes: {
        userId: user.id,
        plan: plan,
      },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
