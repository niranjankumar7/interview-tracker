"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const modeLabel =
    theme === "system"
      ? `System (${resolvedTheme ?? "light"})`
      : theme === "dark"
        ? "Dark"
        : "Light";

  const icon =
    theme === "system" ? (
      <Monitor className="h-4 w-4" />
    ) : resolvedTheme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      className="relative h-9 w-9 bg-background/50 backdrop-blur-sm border-border"
      title={`Theme: ${modeLabel}`}
      aria-label={`Theme: ${modeLabel}`}
    >
      {icon}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
