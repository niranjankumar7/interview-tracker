"use client";

import { useStore } from "@/lib/store";
import { differenceInMinutes, format, isToday, isYesterday, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PersistApi = {
  hasHydrated?: () => boolean;
  onFinishHydration?: (cb: () => void) => () => void;
};

const LAST_SHOWN_STORAGE_KEY = "interview-prep:lastNotificationShownAt";
const SNOOZED_STORAGE_KEY = "interview-prep:snoozedNotifications";

function getLocalDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function readJsonRecord(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
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

function getPersistApi(): PersistApi | undefined {
  return (useStore as unknown as { persist?: PersistApi }).persist;
}

export function NotificationManager() {
  const router = useRouter();

  const [hasHydrated, setHasHydrated] = useState(() => {
    const persistApi = getPersistApi();
    return persistApi?.hasHydrated?.() ?? true;
  });

  const didRunInitialChecks = useRef(false);
  const lastSprintStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    const persistApi = getPersistApi();
    if (!persistApi?.onFinishHydration) return;

    const unsubscribe = persistApi.onFinishHydration(() => {
      setHasHydrated(true);
    });

    setHasHydrated(persistApi.hasHydrated?.() ?? true);
    return unsubscribe;
  }, []);

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
        const interviewDate = parseISO(a.interviewDate!);
        const minutesUntil = differenceInMinutes(interviewDate, now);
        return { app: a, interviewDate, minutesUntil };
      })
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

        toast(`Upcoming Interview: ${upcoming.app.company} in ${timeLabel}! Click to prep.`, {
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
    const lastActive = parseISO(state.progress.lastActiveDate);
    const completedTasksToday = state.sprints.some((sprint) =>
      sprint.dailyPlans.some(
        (plan) =>
          isToday(parseISO(plan.date)) &&
          plan.blocks.some((block) => block.tasks.some((task) => task.completed))
      )
    );

    if (isYesterday(lastActive) && !completedTasksToday) {
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

    const seedStatuses: Record<string, string> = {};
    for (const sprint of useStore.getState().sprints) {
      seedStatuses[sprint.id] = sprint.status;
    }
    lastSprintStatuses.current = seedStatuses;

    return useStore.subscribe((state, prevState) => {
      const now = new Date();
      const todayKey = getLocalDayKey(now);

      for (const sprint of state.sprints) {
        const prevStatus = prevState.sprints.find((s) => s.id === sprint.id)?.status;
        const lastKnownStatus = prevStatus ?? lastSprintStatuses.current[sprint.id];

        if (lastKnownStatus !== "completed" && sprint.status === "completed") {
          const notificationKey = `celebration:${sprint.id}`;
          if (isSnoozed(notificationKey) || wasShownToday(notificationKey, todayKey)) {
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

          markShown(notificationKey, todayKey);
        }

        lastSprintStatuses.current[sprint.id] = sprint.status;
      }
    });
  }, [hasHydrated, router]);

  return null;
}
