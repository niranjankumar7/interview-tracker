"use client";

import { TodaysPlanPanel } from "@/components/generative/TodaysPlanPanel";
import { AppHeader } from "@/components/layout/AppHeader";

export function PrepClient({
  focusApplicationId,
}: {
  focusApplicationId?: string;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      <AppHeader />

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-20 md:px-6">
          <div className="mx-auto mb-6 w-full max-w-4xl">
            <h1 className="text-2xl font-bold text-foreground">Prep Plan</h1>
            <p className="text-sm text-muted-foreground">
              Today&apos;s tasks across your active sprints
            </p>
          </div>

          <div className="flex justify-center">
            <TodaysPlanPanel
              showAll={!focusApplicationId}
              focusApplicationId={focusApplicationId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
