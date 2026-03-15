"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/AppHeader";

interface PricingTier {
  name: string;
  price: number;
  period: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  popular?: boolean;
  plan: "free" | "pro" | "premium";
}

const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Get started with job tracking",
    icon: <Sparkles className="w-5 h-5" />,
    plan: "free",
    features: [
      "Up to 5 job applications",
      "50 AI chat messages/month",
      "Basic kanban board",
      "Interview prep questions",
      "Email reminders",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Pro",
    price: 499,
    period: "month",
    description: "For serious job seekers",
    icon: <Zap className="w-5 h-5" />,
    plan: "pro",
    popular: true,
    features: [
      "Unlimited job applications",
      "Unlimited AI chat",
      "Advanced kanban with automation",
      "Salary insights & negotiation tips",
      "Priority support",
      "LinkedIn profile optimization",
      "Mock interview simulator",
    ],
    cta: "Upgrade to Pro",
  },
  {
    name: "Premium",
    price: 999,
    period: "month",
    description: "Complete career transformation",
    icon: <Crown className="w-5 h-5" />,
    plan: "premium",
    features: [
      "Everything in Pro",
      "1-on-1 career coaching (1 hr/month)",
      "Resume review by experts",
      "Referral network access",
      "Company insider connections",
      "Custom job alerts",
      "Dedicated account manager",
    ],
    cta: "Go Premium",
  },
];

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    if (plan === "free") {
      // Just redirect to dashboard
      window.location.href = "/pipeline";
      return;
    }

    setIsLoading(plan);

    try {
      const response = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error("Failed to create subscription");
        setIsLoading(null);
      }
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(null);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      <AppHeader />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1
              className="text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Simple, transparent pricing
            </motion.h1>
            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Choose the plan that fits your job search. Upgrade anytime.
            </motion.p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  tier.popular
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-border bg-card"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`p-2 rounded-lg ${
                      tier.popular ? "bg-blue-500 text-white" : "bg-muted"
                    }`}
                  >
                    {tier.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                </div>

                <p className="text-muted-foreground mb-4">{tier.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold">₹{tier.price}</span>
                  <span className="text-muted-foreground">/{tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    tier.popular
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  onClick={() => handleSubscribe(tier.plan)}
                  disabled={isLoading === tier.plan}
                >
                  {isLoading === tier.plan ? "Loading..." : tier.cta}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* FAQ */}
          <motion.div
            className="mt-16 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-2xl font-semibold text-center mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Can I upgrade or downgrade anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can change your plan at any time. Prorated charges
                  will apply.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Is there a refund policy?</h3>
                <p className="text-sm text-muted-foreground">
                  We offer a 7-day money-back guarantee if you&apos;re not satisfied.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">What payment methods are accepted?</h3>
                <p className="text-sm text-muted-foreground">
                  We accept UPI, credit/debit cards, net banking, and wallets
                  via Razorpay.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
