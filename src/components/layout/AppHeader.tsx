"use client";

import Link from "next/link";
import { LayoutTemplate, Settings } from "lucide-react";
import { MainNav } from "@/components/MainNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppHeader() {
  return (
    <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between shadow-sm flex-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <LayoutTemplate className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Blueprint</h1>
            <p className="text-xs text-muted-foreground">The master plan for job change</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <MainNav />

        <Link
          href="/settings"
          className="ml-2 inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
