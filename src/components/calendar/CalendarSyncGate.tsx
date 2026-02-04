"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { createDemoCalendarEvents } from "@/lib/calendar-sync";
import { CalendarSyncReviewModal } from "./CalendarSyncReviewModal";

export function CalendarSyncGate() {
  const calendar = useStore((s) => s.calendar);
  const preferences = useStore((s) => s.preferences);
  const syncCalendarEvents = useStore((s) => s.syncCalendarEvents);
  const suggestions = useStore((s) => s.calendarSuggestions);
  const confirmSuggestion = useStore((s) => s.confirmCalendarSuggestion);
  const dismissSuggestion = useStore((s) => s.dismissCalendarSuggestion);

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const [open, setOpen] = useState(false);
  const hasPrompted = useRef(false);
  const autoSyncRan = useRef(false);

  useEffect(() => {
    if (!calendar.connected) return;
    if (!preferences.calendarAutoSyncEnabled) return;
    if (autoSyncRan.current) return;

    const lastSyncAt = calendar.lastSyncAt
      ? new Date(calendar.lastSyncAt)
      : null;
    const shouldSync =
      !lastSyncAt || Date.now() - lastSyncAt.getTime() > 6 * 60 * 60 * 1000;

    autoSyncRan.current = true;

    if (shouldSync) {
      syncCalendarEvents(createDemoCalendarEvents(), "demo");
    }
  }, [
    calendar.connected,
    calendar.lastSyncAt,
    preferences.calendarAutoSyncEnabled,
    syncCalendarEvents,
  ]);

  useEffect(() => {
    if (hasPrompted.current) return;
    if (pendingCount === 0) return;
    hasPrompted.current = true;
    setOpen(true);
  }, [pendingCount]);

  return (
    <CalendarSyncReviewModal
      isOpen={open}
      suggestions={suggestions}
      onClose={() => setOpen(false)}
      onConfirm={confirmSuggestion}
      onDismiss={dismissSuggestion}
    />
  );
}
