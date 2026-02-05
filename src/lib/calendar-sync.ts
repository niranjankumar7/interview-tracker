import { addDays, addHours, isAfter, parseISO, startOfDay } from "date-fns";
import type {
  Application,
  CalendarEvent,
  CalendarInterviewSuggestion,
  RoleType,
} from "@/types";

const INTERVIEW_KEYWORDS = [
  "interview",
  "phone screen",
  "screen",
  "onsite",
  "on-site",
  "technical",
  "final round",
  "recruiter",
  "hiring manager",
  "panel",
  "loop",
  "assessment",
];

const ROLE_HINTS: Array<{
  pattern: RegExp;
  roleType: RoleType;
  roleLabel: string;
}> = [
  { pattern: /\bfrontend\b|\bfront-end\b/, roleType: "Frontend", roleLabel: "Frontend Engineer" },
  { pattern: /\bbackend\b|\bback-end\b/, roleType: "Backend", roleLabel: "Backend Engineer" },
  { pattern: /\bfull\s*stack\b|\bfull-stack\b/, roleType: "FullStack", roleLabel: "Full Stack Engineer" },
  { pattern: /\bsdet\b|\btest engineer\b/, roleType: "SDET", roleLabel: "SDET" },
  { pattern: /\bsde\b|\bsoftware engineer\b/, roleType: "SDE", roleLabel: "Software Engineer" },
  { pattern: /\bdata\b|\bdata engineer\b|\bdata analyst\b/, roleType: "Data", roleLabel: "Data Engineer" },
  { pattern: /\bml\b|\bmachine learning\b/, roleType: "ML", roleLabel: "ML Engineer" },
  { pattern: /\bdevops\b|\bsre\b/, roleType: "DevOps", roleLabel: "DevOps Engineer" },
  { pattern: /\bpm\b|\bproduct manager\b/, roleType: "PM", roleLabel: "Product Manager" },
  { pattern: /\bmobile\b|\bios\b|\bandroid\b/, roleType: "MobileEngineer", roleLabel: "Mobile Engineer" },
];

const COMPANY_PATTERNS: RegExp[] = [
  /interview\s+(?:with|at)\s+([^|@\-]+)/i,
  /interview\s*[:-]\s*([^|@]+)/i,
  /([^|@\-]+)\s+(?:interview|onsite|screen|loop)/i,
];

const MAX_COMPANY_LENGTH = 40;

export function isValidCompanyName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== "unknown";
}

function isPotentialInterview(title: string): boolean {
  const lower = title.toLowerCase();
  return INTERVIEW_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function sanitizeCompanyName(value: string): string {
  return value
    .replace(/\(.*?\)/g, "")
    .replace(/interview|onsite|on-site|screen|loop|round/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, MAX_COMPANY_LENGTH);
}

function findCompanyFromExisting(
  title: string,
  applications: Application[]
): string | null {
  if (applications.length === 0) return null;

  const titleLower = title.toLowerCase();
  const matches = applications
    .map((app) => app.company)
    .filter((company) => company && titleLower.includes(company.toLowerCase()));

  if (matches.length === 0) return null;

  return matches.sort((a, b) => b.length - a.length)[0];
}

function extractCompanyFromTitle(title: string): string | null {
  for (const pattern of COMPANY_PATTERNS) {
    const match = title.match(pattern);
    if (match?.[1]) {
      const cleaned = sanitizeCompanyName(match[1]);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

function guessRoleFromTitle(title: string): { role?: string; roleType?: RoleType } {
  const lower = title.toLowerCase();
  for (const hint of ROLE_HINTS) {
    if (hint.pattern.test(lower)) {
      return { role: hint.roleLabel, roleType: hint.roleType };
    }
  }
  return {};
}

function isFutureOrToday(dateIso: string): boolean {
  const parsed = parseISO(dateIso);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = startOfDay(new Date());
  return isAfter(startOfDay(parsed), addDays(today, -1));
}

export function buildCalendarSuggestions(
  events: CalendarEvent[],
  applications: Application[]
): CalendarInterviewSuggestion[] {
  const suggestions: CalendarInterviewSuggestion[] = [];

  for (const event of events) {
    if (!isFutureOrToday(event.start)) continue;
    if (!isPotentialInterview(event.title)) continue;

    const matchFromPipeline = findCompanyFromExisting(event.title, applications);
    const extractedCompany = extractCompanyFromTitle(event.title);
    const company = matchFromPipeline || extractedCompany || "Unknown";

    const { role, roleType } = guessRoleFromTitle(event.title);

    let confidence: CalendarInterviewSuggestion["confidence"] = "low";
    let reason = "Calendar event title includes interview keywords.";

    if (matchFromPipeline) {
      confidence = "high";
      reason = `Matched "${matchFromPipeline}" from your pipeline in the event title.`;
    } else if (extractedCompany) {
      confidence = "medium";
      reason = `Parsed "${extractedCompany}" from the event title.`;
    }

    suggestions.push({
      id: `${event.provider}:${event.id}`,
      eventId: event.id,
      title: event.title,
      company,
      role,
      roleType,
      interviewDate: event.start,
      confidence,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  return suggestions;
}

export function mergeCalendarEvents(
  existing: CalendarEvent[],
  incoming: CalendarEvent[]
): CalendarEvent[] {
  const byId = new Map(existing.map((event) => [event.id, event]));

  for (const event of incoming) {
    byId.set(event.id, { ...byId.get(event.id), ...event });
  }

  return Array.from(byId.values()).sort((a, b) => a.start.localeCompare(b.start));
}

export function createDemoCalendarEvents(): CalendarEvent[] {
  const today = startOfDay(new Date());
  return [
    {
      id: "demo-interview-google",
      provider: "google",
      title: "Google SDE Interview",
      start: addHours(addDays(today, 5), 10).toISOString(),
      end: addHours(addDays(today, 5), 11).toISOString(),
      location: "Google Meet",
      meetingLink: "https://meet.google.com/demo",
      source: "demo",
    },
    {
      id: "demo-interview-amazon",
      provider: "google",
      title: "Amazon Phone Screen - Backend",
      start: addHours(addDays(today, 9), 15).toISOString(),
      end: addHours(addDays(today, 9), 16).toISOString(),
      location: "Zoom",
      meetingLink: "https://zoom.us/demo",
      source: "demo",
    },
    {
      id: "demo-non-interview",
      provider: "google",
      title: "Team Retro",
      start: addHours(addDays(today, 3), 12).toISOString(),
      end: addHours(addDays(today, 3), 13).toISOString(),
      source: "demo",
    },
  ];
}
