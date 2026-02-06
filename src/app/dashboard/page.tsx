"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeOfferTotalCTC, getOfferCurrency } from "@/lib/offer-details";
import { getDailyPlansArray } from "@/lib/sprint-utils";
import type { ApplicationStatus, Sprint } from "@/types";
import {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isValid,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Calendar,
  Target,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

type StatusChartConfig = {
  status: ApplicationStatus;
  label: string;
  chartColorHex: string;
};

const statusChartConfigs: StatusChartConfig[] = [
  { status: "applied", label: "Applied", chartColorHex: "#6B7280" },
  { status: "shortlisted", label: "Shortlisted", chartColorHex: "#3B82F6" },
  { status: "interview", label: "Interview", chartColorHex: "#8B5CF6" },
  { status: "offer", label: "Offer", chartColorHex: "#22C55E" },
  { status: "rejected", label: "Rejected", chartColorHex: "#EF4444" },
];

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function computeCompletionStats(sprints: Sprint[]) {
  // Map keys are normalized to local `yyyy-MM-dd` strings.
  const activityCounts = new Map<string, number>();
  const topicsByDate = new Map<string, Set<string>>();

  for (const sprint of sprints) {
    const dailyPlans = getDailyPlansArray(sprint.dailyPlans);
    for (const plan of dailyPlans) {
      const key = format(startOfDay(parseISO(plan.date)), "yyyy-MM-dd");

      const blocks = plan.blocks ?? [];
      for (const block of blocks) {
        const tasks = block.tasks ?? [];
        for (const task of tasks) {
          if (!task.completed) continue;

          activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);

          const topic = task.category?.trim() || "General";
          const set = topicsByDate.get(key) ?? new Set<string>();
          set.add(topic);
          topicsByDate.set(key, set);
        }
      }
    }
  }

  const topicCounts = new Map<string, number>();
  for (const [key, topics] of topicsByDate.entries()) {
    topicCounts.set(key, topics.size);
  }

  return { activityCounts, topicCounts };
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setMounted(true);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const scheduleNextTick = () => {
      const current = new Date();
      const nextMidnight = startOfDay(addDays(current, 1));
      let msUntilNextMidnight = nextMidnight.getTime() - current.getTime();
      if (msUntilNextMidnight <= 0) {
        msUntilNextMidnight = 1000;
      }
      timeoutId = setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, msUntilNextMidnight);
      return timeoutId;
    };

    scheduleNextTick();
    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const applications = useStore((s) => s.applications);
  const sprints = useStore((s) => s.sprints);
  const progress = useStore((s) => s.progress);

  const today = useMemo(() => startOfDay(now), [now]);

  const { activityCounts: completedActivityCountsByDate, topicCounts: completedTopicCountsByDate } =
    useMemo(() => computeCompletionStats(sprints), [sprints]);

  const topicProgressSeries = useMemo(() => {
    const start = subDays(today, 29);
    const days = Array.from({ length: 30 }, (_, idx) => addDays(start, idx));

    let cumulative = 0;
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      cumulative += completedTopicCountsByDate.get(key) ?? 0;
      return {
        date: format(d, "MMM d"),
        cumulative,
      };
    });
  }, [completedTopicCountsByDate, today]);

  const totalTopicsLast30 = topicProgressSeries.at(-1)?.cumulative ?? 0;

  const applicationPipelineData = useMemo(() => {
    const counts = new Map<ApplicationStatus, number>();
    for (const config of statusChartConfigs) counts.set(config.status, 0);
    for (const app of applications) {
      counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
    }

    return statusChartConfigs
      .map((cfg) => ({
        name: cfg.label,
        value: counts.get(cfg.status) ?? 0,
        color: cfg.chartColorHex,
      }))
      .filter((d) => d.value > 0);
  }, [applications]);

  const offerRows = useMemo(() => {
    return applications
      .filter((app) => app.status === "offer")
      .map((app) => {
        const currency = getOfferCurrency(app.offerDetails);
        const total = computeOfferTotalCTC(app.offerDetails);
        return {
          app,
          offer: app.offerDetails,
          currency,
          total,
          sortValue: total ?? Number.NEGATIVE_INFINITY,
        };
      })
      .sort((a, b) => {
        if (a.currency !== b.currency) {
          return a.currency.localeCompare(b.currency);
        }
        return b.sortValue - a.sortValue;
      });
  }, [applications]);

  const offerCurrencies = useMemo(() => {
    return Array.from(
      new Set(offerRows.map((row) => row.currency.trim().toUpperCase())),
    );
  }, [offerRows]);

  const canCompareOffers = offerCurrencies.length <= 1;

  const bestOfferTotal = useMemo(() => {
    if (!canCompareOffers) return null;

    let best: number | null = null;
    for (const row of offerRows) {
      if (row.total === null) continue;
      if (best === null || row.total > best) {
        best = row.total;
      }
    }
    return best;
  }, [canCompareOffers, offerRows]);

  const upcomingInterviews = useMemo(() => {
    return applications
      .flatMap((app) => {
        if (!app.interviewDate) return [];
        const interviewDate = parseISO(app.interviewDate);
        if (!isValid(interviewDate) || !isAfter(interviewDate, today)) return [];
        return [
          {
            app,
            interviewDate,
            daysLeft: differenceInDays(interviewDate, today),
          },
        ];
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [applications, today]);

  const heatmap = useMemo(() => {
    const rangeStart = startOfWeek(subDays(today, 364), { weekStartsOn: 0 });
    const totalDays = differenceInDays(today, rangeStart) + 1;
    const weeks = Math.ceil(totalDays / 7);

    const cells = Array.from({ length: weeks }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(rangeStart, weekIndex * 7 + dayIndex);
        const isFuture = date.getTime() > today.getTime();
        const key = format(date, "yyyy-MM-dd");
        const count = isFuture
          ? 0
          : (completedActivityCountsByDate.get(key) ?? 0);
        return { date, key, count, isFuture };
      }),
    );

    return { rangeStart, weeks, cells };
  }, [completedActivityCountsByDate, today]);

  const totalActivityLastYear = useMemo(() => {
    const rangeStart = startOfWeek(subDays(today, 364), { weekStartsOn: 0 });
    const rangeStartKey = format(rangeStart, "yyyy-MM-dd");
    const todayKey = format(today, "yyyy-MM-dd");
    let total = 0;
    for (const [key, count] of completedActivityCountsByDate.entries()) {
      // Keys are normalized to yyyy-MM-dd, so lexicographic order matches chronological order.
      if (key < rangeStartKey || key > todayKey) {
        continue;
      }
      total += count;
    }
    return total;
  }, [completedActivityCountsByDate, today]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Tasks completed</p>
                <Target className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {progress.totalTasksCompleted}
              </p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Applications</p>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {applications.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tracked</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Upcoming interviews</p>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {upcomingInterviews.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
            </div>
          </div>


          {/* Next Interviews - moved to first position */}
          <Card title="Next interviews" subtitle="Countdown to upcoming interviews">
            {upcomingInterviews.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-10">
                No interviews scheduled
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingInterviews.map(({ app, interviewDate, daysLeft }) => (
                  <div
                    key={app.id}
                    className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-lg leading-tight">
                          {app.company}
                        </p>
                        <p className="text-sm opacity-90 mt-0.5">{app.role}</p>
                      </div>
                      <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-semibold">{daysLeft}d</span>
                      </div>
                    </div>
                    <p className="text-sm opacity-90 mt-4">
                      Interview on {format(interviewDate, "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Application Pipeline - now in second position */}
          <Card
            title="Application pipeline"
            subtitle="Distribution of applications by status"
          >
            {!mounted ? (
              <div className="h-[240px] bg-muted/20 rounded-lg animate-pulse" />
            ) : applications.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
                No applications yet
              </div>
            ) : applicationPipelineData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
                Add statuses to see the pipeline breakdown
              </div>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={applicationPipelineData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {applicationPipelineData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card
            title="Offer comparison"
            subtitle="Offers grouped by currency and sorted by total CTC (uses offerDetails.totalCTC when set, otherwise base+bonus(+numeric equity))"
          >
            {offerRows.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-lg p-10">
                No offers yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                {!canCompareOffers && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    Multiple currencies detected ({offerCurrencies.join(", ")}) — best offer highlighting is disabled.
                  </div>
                )}
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Company</th>
                      <th className="py-2 pr-4">Total CTC</th>
                      <th className="py-2 pr-4">Base</th>
                      <th className="py-2 pr-4">Bonus</th>
                      <th className="py-2 pr-4">Equity</th>
                      <th className="py-2 pr-4">Work mode</th>
                      <th className="py-2 pr-4">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {offerRows.map((row) => {
                      const isBest =
                        bestOfferTotal !== null && row.total !== null && row.total === bestOfferTotal;

                      return (
                        <tr
                          key={row.app.id}
                          className={isBest ? "bg-emerald-50" : undefined}
                        >
                          <td className="py-2 pr-4 font-medium text-gray-800">
                            {row.app.company}
                            {isBest && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Best
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {row.total === null
                              ? "—"
                              : `${row.total.toLocaleString()} ${row.currency}`}
                          </td>
                          <td className="py-2 pr-4">
                            {row.offer?.baseSalary === undefined
                              ? "—"
                              : `${row.offer.baseSalary.toLocaleString()} ${row.currency}`}
                          </td>
                          <td className="py-2 pr-4">
                            {row.offer?.bonus === undefined
                              ? "—"
                              : `${row.offer.bonus.toLocaleString()} ${row.currency}`}
                          </td>
                          <td className="py-2 pr-4">
                            {row.offer?.equity === undefined
                              ? "—"
                              : String(row.offer.equity)}
                          </td>
                          <td className="py-2 pr-4">
                            {row.offer?.workMode ?? "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {row.offer?.location ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Topic Progress - moved to bottom with "Feature coming soon" */}
          <Card
            title="Topic progress"
            subtitle="Cumulative topics completed over the last 30 days"
          >
            <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
              <div className="text-center">
                <p className="font-medium text-foreground">Feature coming soon</p>
                <p className="text-xs mt-1">Track your topic completion progress here</p>
              </div>
            </div>
          </Card>

          <Card
            title="Study streak"
            subtitle="Activity frequency over the last year"
          >
            {totalActivityLastYear === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-10">
                Feature coming soon
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <div className="flex gap-1">
                    {heatmap.cells.map((week, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col gap-1">
                        {week.map((cell) => {
                          const level =
                            cell.count === 0
                              ? "bg-muted"
                              : cell.count <= 1
                                ? "bg-green-200"
                                : cell.count <= 3
                                  ? "bg-green-300"
                                  : cell.count <= 6
                                    ? "bg-green-400"
                                    : "bg-green-500";

                          const title = cell.isFuture
                            ? undefined
                            : `${format(cell.date, "MMM d, yyyy")}: ${cell.count} task${cell.count === 1 ? "" : "s"}`;

                          return (
                            <div
                              key={cell.key}
                              title={title}
                              aria-hidden={cell.isFuture || undefined}
                              className={`w-3.5 h-3.5 rounded-sm ${cell.isFuture ? "bg-transparent pointer-events-none" : level}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span>{format(heatmap.rangeStart, "MMM yyyy")}</span>
                    <span>{format(today, "MMM yyyy")}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
