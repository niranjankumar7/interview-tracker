import { addDays, startOfDay } from "date-fns";
import type { LeetCodeStats } from "@/types";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function createDemoLeetCodeStats(username: string): LeetCodeStats {
  const seed = hashString(username || "leetcode");

  const easySolved = 50 + (seed % 150);
  const mediumSolved = 30 + ((seed >> 2) % 120);
  const hardSolved = 10 + ((seed >> 3) % 60);
  const totalSolved = easySolved + mediumSolved + hardSolved;

  const currentStreak = 1 + (seed % 12);
  const longestStreak = currentStreak + 5 + ((seed >> 4) % 15);

  const today = startOfDay(new Date());
  const lastActiveDate = addDays(today, -(seed % 3)).toISOString();

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
  };
}
