"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Monitor,
  Moon,
  Save,
  Settings,
  Sun,
  User,
  Bell,
  Download,
  Upload,
  RotateCcw,
  Database,
  Calendar,
} from "lucide-react";

import { useStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { APP_VERSION } from "@/lib/constants";
import type { ExperienceLevel, ThemePreference } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LeetCodeSyncCard } from "@/components/leetcode";

type ThemeOption = {
  id: ThemePreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const themeOptions: ThemeOption[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const EXPORT_REVOKE_URL_DELAY_MS = 1000;

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme } = useTheme();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const profile = useStore((s) => s.profile);
  const preferences = useStore((s) => s.preferences);
  const updateProfile = useStore((s) => s.updateProfile);
  const updatePreferences = useStore((s) => s.updatePreferences);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetData = useStore((s) => s.resetData);
  const loadDemoData = useStore((s) => s.loadDemoData);

  const nameId = useId();
  const emailId = useId();
  const targetRoleId = useId();
  const experienceId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next);
    updatePreferences({ theme: next });
  };

  const currentTheme: ThemePreference = mounted
    ? theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : preferences.theme
    : preferences.theme;

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-prep-tracker-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    try {
      a.click();
    } finally {
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), EXPORT_REVOKE_URL_DELAY_MS);
    }
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("File is not valid JSON");
    }

    importData(parsed);
  };

  const experienceLevelOptions: readonly ExperienceLevel[] = [
    "Junior",
    "Mid",
    "Senior",
  ];

  const isExperienceLevel = (value: string): value is ExperienceLevel =>
    (experienceLevelOptions as readonly string[]).includes(value);

  const aboutText =
    "Track applications, build a focused sprint plan, and keep a lightweight question bank — all in one place.";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to app">
            <Link href="/chat">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">v{APP_VERSION}</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Used to personalize sprint planning and suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                value={user?.email || ""}
                readOnly
                disabled
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={targetRoleId}>Target role</Label>
              <Input
                id={targetRoleId}
                value={profile.targetRole}
                onChange={(e) => updateProfile({ targetRole: e.target.value })}
                placeholder='e.g. "Full Stack Engineer"'
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={experienceId}>Experience level</Label>
              <NativeSelect
                id={experienceId}
                value={profile.experienceLevel}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!isExperienceLevel(next)) return;
                  updateProfile({ experienceLevel: next });
                }}
              >
                {experienceLevelOptions.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>Appearance and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="text-sm font-medium">Theme</div>
              <div className="flex flex-wrap gap-2">
                {themeOptions.map((opt) => {
                  const selected = currentTheme === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleThemeChange(opt.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {mounted ? (
                  <span>Current: {currentTheme}</span>
                ) : (
                  <span>Loading theme…</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bell className="h-4 w-4" />
                  Enable study reminders
                </div>
                <div className="text-xs text-muted-foreground">
                  Simple daily reminder toggle (stored locally).
                </div>
              </div>
              <Switch
                checked={preferences.studyRemindersEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ studyRemindersEnabled: checked })
                }
                aria-label="Enable study reminders"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data management
            </CardTitle>
            <CardDescription>Export, import, or reset app data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export data
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Import data
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (confirm("Reset all data? This cannot be undone.")) {
                    resetData();
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset data
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (confirm("Load demo data? This will overwrite current data.")) {
                    loadDemoData();
                  }
                }}
              >
                <Save className="h-4 w-4" />
                Load demo data
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                  await handleImport(file);
                  alert("Import complete");
                } catch (err) {
                  alert(
                    err instanceof Error
                      ? err.message
                      : "Failed to import data",
                  );
                } finally {
                  e.target.value = "";
                }
              }}
            />

            <div className="text-xs text-muted-foreground">
              Exported data includes profile, preferences, applications, questions, and progress.
            </div>
          </CardContent>
        </Card>

        <LeetCodeSyncCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar sync
            </CardTitle>
            <CardDescription>
              Read-only calendar sync to detect interview invites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border border-border p-4 bg-muted/40">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/80">Feature coming soon.</span> We&apos;ll soon be able to scan your calendar for interview invites.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {aboutText}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
