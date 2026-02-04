"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { BookOpen, RefreshCcw, Shield, Unplug } from "lucide-react";
import { createPortal } from "react-dom";

import { useStore } from "@/lib/store";
import { createDemoLeetCodeStats } from "@/lib/leetcode-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function ConnectModal({
  isOpen,
  onClose,
  onConnect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (username: string) => void;
}) {
  const [username, setUsername] = useState("");

  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Connect LeetCode</h2>
            <p className="text-sm text-muted-foreground">
              Read-only access to track streaks and activity.
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
              We store only: streak counts, last active date, and solved mix. No problem
              statements or solutions are stored.
            </div>
          </div>

          <div className="space-y-1">
            <Label>LeetCode username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="leetcode_handle"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!username.trim()) return;
                onConnect(username.trim());
                setUsername("");
              }}
            >
              Connect LeetCode
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function LeetCodeSyncCard() {
  const leetcode = useStore((s) => s.leetcode);
  const leetcodeStats = useStore((s) => s.leetcodeStats);
  const preferences = useStore((s) => s.preferences);
  const updatePreferences = useStore((s) => s.updatePreferences);
  const connectLeetCode = useStore((s) => s.connectLeetCode);
  const disconnectLeetCode = useStore((s) => s.disconnectLeetCode);
  const syncLeetCodeStats = useStore((s) => s.syncLeetCodeStats);

  const [isConnectOpen, setIsConnectOpen] = useState(false);

  const lastSyncLabel = leetcode.lastSyncAt
    ? format(parseISO(leetcode.lastSyncAt), "MMM d, yyyy · h:mm a")
    : "Not synced yet";

  const solvedMix = useMemo(() => {
    if (!leetcodeStats) return null;
    const total = leetcodeStats.totalSolved || 1;
    return {
      easy: Math.round((leetcodeStats.easySolved / total) * 100),
      medium: Math.round((leetcodeStats.mediumSolved / total) * 100),
      hard: Math.round((leetcodeStats.hardSolved / total) * 100),
    };
  }, [leetcodeStats]);

  const handleConnect = (username: string) => {
    connectLeetCode({ username });
    syncLeetCodeStats(createDemoLeetCodeStats(username));
    setIsConnectOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            LeetCode sync
          </CardTitle>
          <CardDescription>
            Track streaks and problem mix to keep prep momentum visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <div className="text-sm font-medium text-foreground">
                {leetcode.connected ? "Connected to LeetCode" : "Not connected"}
              </div>
              <div className="text-xs text-muted-foreground">
                {leetcode.username ? `Username: ${leetcode.username}` : "Read-only access"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last sync: {lastSyncLabel}
              </div>
            </div>
            {leetcode.connected ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    syncLeetCodeStats(
                      createDemoLeetCodeStats(leetcode.username ?? "leetcode")
                    )
                  }
                >
                  <RefreshCcw className="h-4 w-4" />
                  Sync now
                </Button>
                <Button variant="destructive" onClick={disconnectLeetCode}>
                  Forget data
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsConnectOpen(true)}>
                Connect LeetCode
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div>
              <div className="text-sm font-medium text-foreground">
                Auto-sync on login
              </div>
              <div className="text-xs text-muted-foreground">
                If enabled, we&apos;ll sync LeetCode when the app loads.
              </div>
            </div>
            <Switch
              checked={preferences.leetcodeAutoSyncEnabled}
              onCheckedChange={(checked) => {
                if (
                  checked &&
                  !confirm(
                    "Enable daily auto-sync? We'll sync your LeetCode activity once per day when you log in."
                  )
                ) {
                  return;
                }
                updatePreferences({ leetcodeAutoSyncEnabled: checked });
              }}
            />
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="text-sm font-medium text-foreground mb-2">
              Latest activity snapshot
            </div>
            {leetcodeStats ? (
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Current streak</div>
                  <div className="text-lg font-semibold">
                    {leetcodeStats.currentStreak} days
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Last active</div>
                  <div className="text-lg font-semibold">
                    {leetcodeStats.lastActiveDate
                      ? format(parseISO(leetcodeStats.lastActiveDate), "MMM d")
                      : "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Solved mix</div>
                  <div className="text-sm">
                    Easy {solvedMix?.easy ?? 0}% · Medium {solvedMix?.medium ?? 0}% ·
                    Hard {solvedMix?.hard ?? 0}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Connect and sync to see your streak snapshot.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConnectModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onConnect={handleConnect}
      />
    </>
  );
}
