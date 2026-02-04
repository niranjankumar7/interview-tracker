"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { useStore } from "@/lib/store";
import { KanbanBoard, QuestionBankView } from "@/components/pipeline";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  MessageSquare,
  Kanban,
  BookOpen,
  Flame,
  Settings,
  BarChart3,
} from "lucide-react";

type View = "chat" | "pipeline" | "questions";

export default function ChatPage() {
  const [currentView, setCurrentView] = useState<View>("chat");
  const progress = useStore((s) => s.progress);

  const navItems = [
    { id: "chat" as View, label: "Chat", icon: MessageSquare },
    { id: "pipeline" as View, label: "Pipeline", icon: Kanban },
    { id: "questions" as View, label: "Questions", icon: BookOpen },
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Interview Prep Tracker</h1>
              <p className="text-xs text-muted-foreground">
                Your AI-powered prep companion
              </p>
            </div>
          </div>

          {/* Streak Display */}
          {progress.currentStreak > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 dark:bg-orange-950/30 dark:border-orange-900">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-200">
                {progress.currentStreak} day streak
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          <nav className="flex bg-muted rounded-lg p-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${currentView === item.id
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}

            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </nav>

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
        {currentView === "chat" && (
          <div className="h-full">
            <MessageThreadFull />
          </div>
        )}
        {currentView === "pipeline" && <KanbanBoard />}
        {currentView === "questions" && <QuestionBankView />}
      </main>
    </div>
  );
}
