"use client";

import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LeetCodeSyncCard() {
  return (
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
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg border border-border p-4 bg-muted/40">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground/80">Feature coming soon.</span> We&apos;ll soon be able to sync your LeetCode streaks and stats.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

