"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { createDemoLeetCodeStats } from "@/lib/leetcode-sync";

export function LeetCodeSyncGate() {
  const leetcode = useStore((s) => s.leetcode);
  const preferences = useStore((s) => s.preferences);
  const syncLeetCodeStats = useStore((s) => s.syncLeetCodeStats);

  const autoSyncRan = useRef(false);

  useEffect(() => {
    if (!leetcode.connected) return;
    if (!preferences.leetcodeAutoSyncEnabled) return;
    if (autoSyncRan.current) return;

    const lastSyncAt = leetcode.lastSyncAt ? new Date(leetcode.lastSyncAt) : null;
    const shouldSync =
      !lastSyncAt || Date.now() - lastSyncAt.getTime() > 24 * 60 * 60 * 1000;

    autoSyncRan.current = true;

    if (shouldSync) {
      syncLeetCodeStats(
        createDemoLeetCodeStats(leetcode.username ?? "leetcode")
      );
    }
  }, [
    leetcode.connected,
    leetcode.lastSyncAt,
    leetcode.username,
    preferences.leetcodeAutoSyncEnabled,
    syncLeetCodeStats,
  ]);

  return null;
}
