"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, Plug, RefreshCcw, Shield, Unplug } from "lucide-react";

import { useStore } from "@/lib/store";
import { createDemoCalendarEvents } from "@/lib/calendar-sync";
import { CalendarSyncReviewModal } from "./CalendarSyncReviewModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createPortal } from "react-dom";

function ConnectModal({
  isOpen,
  onClose,
  onConnect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (email?: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === "undefined") return;
    setPortalTarget(document.body);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !portalTarget) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              Connect Google Calendar
            </h2>
            <p className="text-sm text-muted-foreground">
              Read-only access to detect interview invites.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Unplug className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-border p-3 bg-muted/40">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              We only request read-only access. This demo uses local storage to simulate
              synced events until the backend OAuth flow is wired.
            </div>
          </div>

          <div className="space-y-1">
            <Label>Calendar email (optional)</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onConnect(email);
                setEmail("");
              }}
            >
              Connect calendar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}

export function CalendarSyncCard() {
  const calendar = useStore((s) => s.calendar);
  const preferences = useStore((s) => s.preferences);
  const updatePreferences = useStore((s) => s.updatePreferences);
  const suggestions = useStore((s) => s.calendarSuggestions);
  const connectCalendar = useStore((s) => s.connectCalendar);
  const disconnectCalendar = useStore((s) => s.disconnectCalendar);
  const syncCalendarEvents = useStore((s) => s.syncCalendarEvents);
  const confirmSuggestion = useStore((s) => s.confirmCalendarSuggestion);
  const dismissSuggestion = useStore((s) => s.dismissCalendarSuggestion);

  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const pendingSuggestions = useMemo(
    () => suggestions.filter((s) => s.status === "pending"),
    [suggestions]
  );

  const lastSyncLabel = calendar.lastSyncAt
    ? format(parseISO(calendar.lastSyncAt), "MMM d, yyyy · h:mm a")
    : "Not synced yet";

  const handleConnect = (email?: string) => {
    connectCalendar({ email });
    syncCalendarEvents(createDemoCalendarEvents(), "demo");
    setIsConnectOpen(false);
    setIsReviewOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Calendar sync
          </CardTitle>
          <CardDescription>
            Read-only calendar connection to detect interview invites automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <div className="text-sm font-medium text-foreground">
                {calendar.connected ? "Connected to Google Calendar" : "Not connected"}
              </div>
              <div className="text-xs text-muted-foreground">
                {calendar.email ? `Account: ${calendar.email}` : "Read-only access"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last sync: {lastSyncLabel}
              </div>
            </div>
            {calendar.connected ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    syncCalendarEvents(createDemoCalendarEvents(), "demo")
                  }
                >
                  <RefreshCcw className="h-4 w-4" />
                  Sync now
                </Button>
                <Button variant="destructive" onClick={disconnectCalendar}>
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsConnectOpen(true)}>
                <Plug className="h-4 w-4" />
                Connect calendar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <div className="text-sm font-medium text-foreground">
                Auto-sync on login
              </div>
              <div className="text-xs text-muted-foreground">
                If enabled, we&apos;ll sync your calendar on app load.
              </div>
            </div>
            <Switch
              checked={preferences.calendarAutoSyncEnabled}
              onCheckedChange={(checked) =>
                updatePreferences({ calendarAutoSyncEnabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <div className="text-sm font-medium text-foreground">
                Pending interview matches
              </div>
              <div className="text-xs text-muted-foreground">
                {pendingSuggestions.length} event
                {pendingSuggestions.length === 1 ? "" : "s"} waiting for confirmation
              </div>
            </div>
            <Button
              variant="outline"
              disabled={pendingSuggestions.length === 0}
              onClick={() => setIsReviewOpen(true)}
            >
              Review matches
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConnectModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onConnect={handleConnect}
      />

      <CalendarSyncReviewModal
        isOpen={isReviewOpen}
        suggestions={suggestions}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={confirmSuggestion}
        onDismiss={dismissSuggestion}
      />
    </>
  );
}
