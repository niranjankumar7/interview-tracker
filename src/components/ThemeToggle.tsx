"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { ThemePreference } from "@/types";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const updatePreferences = useStore((state) => state.updatePreferences);

  const cycleTheme = () => {
    const currentTheme: ThemePreference =
      theme === "light" || theme === "dark" || theme === "system"
        ? theme
        : "system";

    const nextTheme: ThemePreference =
      currentTheme === "light"
        ? "dark"
        : currentTheme === "dark"
          ? "system"
          : "light";

    setTheme(nextTheme);
    updatePreferences({ theme: nextTheme });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      className="relative h-9 w-9 bg-background/50 backdrop-blur-sm border-border z-50 cursor-pointer pointer-events-auto"
      title="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
