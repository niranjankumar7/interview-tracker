"use client";

import { useStore } from "@/lib/store";
import { differenceInMinutes, format, isToday, isYesterday, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const LAST_SHOWN_STORAGE_KEY = "interview-prep:lastNotificationShownAt";
const SNOOZED_STORAGE_KEY = "interview-prep:snoozedNotifications";

function getLocalDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function safeParseISO(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readJsonRecord(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const out: Record<string, string> = {};
    // Only keep string values; drop anything else to prevent corrupted storage from bypassing throttles.
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }

    return out;
  } catch {
    return {};
  }
}

function writeJsonRecord(key: string, value: Record<string, string>): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function wasShownToday(notificationKey: string, todayKey: string): boolean {
  const shown = readJsonRecord(LAST_SHOWN_STORAGE_KEY);
  return shown[notificationKey] === todayKey;
}

function markShown(notificationKey: string, todayKey: string): void {
  const shown = readJsonRecord(LAST_SHOWN_STORAGE_KEY);
  shown[notificationKey] = todayKey;
  writeJsonRecord(LAST_SHOWN_STORAGE_KEY, shown);
}

function isSnoozed(notificationKey: string): boolean {
  try {
    const raw = sessionStorage.getItem(SNOOZED_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    return parsed.includes(notificationKey);
  } catch {
    return false;
  }
}

function snooze(notificationKey: string): void {
  try {
    const raw = sessionStorage.getItem(SNOOZED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(parsed) ? parsed : [];

    if (!next.includes(notificationKey)) {
      next.push(notificationKey);
    }

    sessionStorage.setItem(SNOOZED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    sessionStorage.setItem(SNOOZED_STORAGE_KEY, JSON.stringify([notificationKey]));
  }
}

export function NotificationManager() {
  const router = useRouter();

  const hasHydrated = useStore((s) => s.hasHydrated);

  const didRunInitialChecks = useRef(false);
  const celebratedSprints = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasHydrated || didRunInitialChecks.current) return;
    didRunInitialChecks.current = true;

    const now = new Date();
    const todayKey = getLocalDayKey(now);
    const state = useStore.getState();

    // Check 1 (Urgency): upcoming interview within 48 hours.
    const upcoming = state.applications
      .filter((a) => a.interviewDate)
      .map((a) => {
        const interviewDate = safeParseISO(a.interviewDate!);
        if (!interviewDate) return null;

        const minutesUntil = differenceInMinutes(interviewDate, now);
        return { app: a, interviewDate, minutesUntil };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .filter((x) => x.minutesUntil > 0 && x.minutesUntil <= 48 * 60)
      .sort((a, b) => a.minutesUntil - b.minutesUntil)[0];

    if (upcoming) {
      const notificationKey = "urgency";

      if (!isSnoozed(notificationKey) && !wasShownToday(notificationKey, todayKey)) {
        const hoursUntil = Math.max(1, Math.ceil(upcoming.minutesUntil / 60));
        const daysUntil = Math.max(1, Math.ceil(hoursUntil / 24));
        const timeLabel = hoursUntil < 24 ? `${hoursUntil} hours` : `${daysUntil} days`;

        const goToPrep = () => {
          router.push(`/prep?applicationId=${encodeURIComponent(upcoming.app.id)}`);
        };

        toast(`Upcoming Interview: ${upcoming.app.company} in ${timeLabel}. Select Prep to get ready.`, {
          action: { label: "Prep", onClick: goToPrep },
          cancel: {
            label: "Snooze",
            onClick: () => snooze(notificationKey),
          },
        });

        markShown(notificationKey, todayKey);
      }
    }

    // Check 2 (Daily Habit): user was active yesterday but has not completed tasks today.
    const lastActive = safeParseISO(state.progress.lastActiveDate);
    const completedTasksToday = state.sprints.some((sprint) =>
      sprint.dailyPlans.some((plan) => {
        const planDate = safeParseISO(plan.date);
        if (!planDate) return false;

        return (
          isToday(planDate) &&
          plan.blocks.some((block) => block.tasks.some((task) => task.completed))
        );
      })
    );

    if (lastActive && isYesterday(lastActive) && !completedTasksToday) {
      const notificationKey = "daily-habit";

      if (!isSnoozed(notificationKey) && !wasShownToday(notificationKey, todayKey)) {
        const goToPlan = () => {
          router.push("/prep");
        };

        toast("Keep your streak alive! Complete a task today.", {
          action: { label: "Open plan", onClick: goToPlan },
          cancel: {
            label: "Snooze",
            onClick: () => snooze(notificationKey),
          },
        });

        markShown(notificationKey, todayKey);
      }
    }
  }, [hasHydrated, router]);

  useEffect(() => {
    if (!hasHydrated) return;

    return useStore.subscribe((state, prevState) => {
      for (const sprint of state.sprints) {
        const prevSprint = prevState.sprints.find((s) => s.id === sprint.id);
        if (!prevSprint) continue;

        if (prevSprint.status !== "completed" && sprint.status === "completed") {
          const notificationKey = `celebration:${sprint.id}`;
          if (isSnoozed(notificationKey)) {
            continue;
          }

          if (celebratedSprints.current.has(sprint.id)) {
            continue;
          }

          const company = state.applications.find((a) => a.id === sprint.applicationId)?.company;
          const goToPlan = () => {
            router.push(`/prep?applicationId=${encodeURIComponent(sprint.applicationId)}`);
          };

          toast(company ? `Sprint complete for ${company}! Nice work.` : "Sprint complete! Nice work.", {
            action: { label: "View plan", onClick: goToPlan },
            cancel: {
              label: "Snooze",
              onClick: () => snooze(notificationKey),
            },
          });

          celebratedSprints.current.add(sprint.id);
        }
      }
    });
  }, [hasHydrated, router]);

  return null;
}
