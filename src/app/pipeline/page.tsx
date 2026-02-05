"use client";

import Link from "next/link";
import { KanbanBoard } from "@/components/pipeline";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MainNav } from "@/components/MainNav";
import {
    LayoutTemplate,

    Settings,
} from "lucide-react";

export default function PipelinePage() {
    const progress = useStore((s) => s.progress);

    return (
        <div className="flex flex-1 min-h-0 flex-col bg-background h-screen">
            {/* Header */}
            <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between shadow-sm flex-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                            <LayoutTemplate className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-foreground">Blueprint</h1>
                            <p className="text-xs text-muted-foreground">
                                The master plan for job change
                            </p>
                        </div>
                    </div>

                    {/* Streak Display */}

                </div>

                <div className="flex items-center gap-2">
                    {/* Navigation */}
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

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                <KanbanBoard />
            </main>
        </div>
    );
}
