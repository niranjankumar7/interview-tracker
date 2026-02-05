"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Kanban, BookOpen, BarChart3 } from "lucide-react";

export function MainNav() {
    const pathname = usePathname();

    const navItems = [
        {
            href: "/chat",
            label: "Chat",
            icon: MessageSquare,
            isActive: pathname === "/chat",
        },
        {
            href: "/pipeline",
            label: "Pipeline",
            icon: Kanban,
            isActive: pathname.startsWith("/pipeline"),
        },
        {
            href: "/questions",
            label: "Questions",
            icon: BookOpen,
            isActive: pathname.startsWith("/questions"),
        },
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: BarChart3,
            isActive: pathname === "/dashboard",
        },
    ];

    return (
        <nav className="flex bg-muted rounded-lg p-1">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${item.isActive
                        ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm"
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
