"use client";

import { useState } from "react";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import { useStore } from "@/lib/store";
import { KanbanBoard, QuestionBankView } from "@/components/pipeline";
import {
  MessageSquare,
  Kanban,
  BookOpen,
  Database,
  Settings,
  Flame,
} from "lucide-react";
import Link from "next/link";

type View = "chat" | "pipeline" | "questions";

export default function ChatPage() {
  const [currentView, setCurrentView] = useState<View>("chat");
  const mcpServers = useMcpServers();
  const loadDemoData = useStore((s) => s.loadDemoData);
  const progress = useStore((s) => s.progress);

  const navItems = [
    { id: "chat" as View, label: "Chat", icon: MessageSquare },
    { id: "pipeline" as View, label: "Pipeline", icon: Kanban },
    { id: "questions" as View, label: "Questions", icon: BookOpen },
  ];

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
    >
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800">Interview Prep Tracker</h1>
                <p className="text-xs text-gray-500">Your AI-powered prep companion</p>
              </div>
            </div>

            {/* Streak Display */}
            {progress.currentStreak > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">
                  {progress.currentStreak} day streak
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation */}
            <nav className="flex bg-gray-100 rounded-lg p-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${currentView === item.id
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 ml-2 border-l pl-2 border-gray-200">
              <button
                onClick={loadDemoData}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                title="Load demo data"
              >
                <Database className="w-4 h-4" />
                <span className="hidden md:inline">Demo</span>
              </button>
              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                title="Backup, restore, and reset data"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Settings</span>
              </Link>
            </div>
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
    </TamboProvider>
  );
}
