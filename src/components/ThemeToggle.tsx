"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const currentTheme = theme ?? "system";

  const cycleTheme = () => {
    if (currentTheme === "light") setTheme("dark");
    else if (currentTheme === "dark") setTheme("system");
    else setTheme("light");
  };

  const modeLabel =
    currentTheme === "system"
      ? `System (${resolvedTheme ?? "light"})`
      : currentTheme === "dark"
        ? "Dark"
        : "Light";

  const icon =
    currentTheme === "system" ? (
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
