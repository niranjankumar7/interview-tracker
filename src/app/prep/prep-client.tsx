"use client";

import { TodaysPlanPanel } from "@/components/generative/TodaysPlanPanel";
import Link from "next/link";

export function PrepClient({
  focusApplicationId,
}: {
  focusApplicationId?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Prep Plan</h1>
            <p className="text-sm text-gray-500">Today's tasks across your active sprints</p>
          </div>
          <Link
            href="/chat"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <TodaysPlanPanel
          showAll={!focusApplicationId}
          focusApplicationId={focusApplicationId}
        />
      </main>
    </div>
  );
}
