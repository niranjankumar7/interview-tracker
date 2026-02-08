"use client";

import { TodaysPlanPanel } from "@/components/generative/TodaysPlanPanel";
import Link from "next/link";

export function PrepClient({
  focusApplicationId,
}: {
  focusApplicationId?: string;
}) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Fixed Header */}
      <header className="flex-none bg-background border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Prep Plan</h1>
            <p className="text-sm text-muted-foreground">Today&apos;s tasks across your active sprints</p>
          </div>
          <Link
            href="/chat"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Back to app
          </Link>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pb-8">
          <TodaysPlanPanel
            showAll={!focusApplicationId}
            focusApplicationId={focusApplicationId}
          />
        </div>
      </main>
    </div>
  );
}
