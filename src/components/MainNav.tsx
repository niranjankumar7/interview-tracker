"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquare, Kanban, BookOpen, BarChart3 } from "lucide-react";

export function MainNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentView = searchParams.get("view");

    // Determine active state
    const isChatActive = pathname === "/chat";
    const isPipelineActive = pathname?.startsWith("/pipeline");
    const isQuestionsActive = pathname?.startsWith("/questions");
    const isDashboardActive = pathname === "/dashboard";

    const navItems = [
        {
            href: "/chat",
            label: "Chat",
            icon: MessageSquare,
            isActive: isChatActive,
        },
        {
            href: "/pipeline",
            label: "Pipeline",
            icon: Kanban,
            isActive: isPipelineActive,
        },
        {
            href: "/questions",
            label: "Questions",
            icon: BookOpen,
            isActive: isQuestionsActive,
        },
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: BarChart3,
            isActive: isDashboardActive,
        },
    ];

    return (
        <nav className="flex bg-gray-100 dark:bg-muted rounded-lg p-1">
            {navItems.map((item) => (
                <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${item.isActive
                        ? "bg-white dark:bg-background text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                </Link>
            ))}
        </nav>
    );
}
