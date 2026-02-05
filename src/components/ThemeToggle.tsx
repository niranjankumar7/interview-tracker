"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { ThemePreference } from "@/types";

export function ThemeToggle() {
  /*
    Modify cycleTheme to toggle between light and dark using resolvedTheme.
    This fixes the issue where cycling from Dark -> System -> Light required two clicks
    (if System was Dark). Now it's always a binary toggle.
  */
  const { setTheme, theme, resolvedTheme } = useTheme();

  const updatePreferences = useStore((state) => state.updatePreferences);

  const cycleTheme = () => {
    // If we are currently "dark" (either explicitly or via system), switch to light.
    // Otherwise switch to dark.
    const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark");
    const nextTheme: ThemePreference = isDark ? "light" : "dark";

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
