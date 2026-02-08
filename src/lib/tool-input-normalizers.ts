import { sanitizeCompanyName } from "@/lib/application-intake";
import { INTERVIEW_ROUND_TYPES } from "@/lib/interview-round-upsert";

type ApplicationStatus = "applied" | "shortlisted" | "interview" | "offer" | "rejected";

const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "applied",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
];

export type NormalizedStatusUpdate = {
  applicationId?: string;
  company?: string;
  newStatus: ApplicationStatus;
};

export type NormalizedRoundUpdate = {
  applicationId?: string;
  company?: string;
  role?: string;
  roundType?: (typeof INTERVIEW_ROUND_TYPES)[number];
  roundNumber?: number;
  scheduledDate: string;
  notes?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(
  obj: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function normalizeStatus(raw: unknown): ApplicationStatus | undefined {
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return undefined;

  if (APPLICATION_STATUSES.includes(normalized as ApplicationStatus)) {
    return normalized as ApplicationStatus;
  }

  if (normalized.includes("reject")) return "rejected";
  if (normalized.includes("short")) return "shortlisted";
  if (normalized.includes("interview") || normalized.includes("screen")) return "interview";
  if (normalized.includes("offer")) return "offer";
  if (normalized.includes("appl")) return "applied";

  return undefined;
}

function normalizeStatusUpdate(raw: unknown): NormalizedStatusUpdate | null {
  if (typeof raw === "string") {
    const parts = raw.split(/[:|]/);
    if (parts.length >= 2) {
      const company = sanitizeCompanyName(parts[0] || "");
      const newStatus = normalizeStatus(parts[1]) ?? "applied";
      if (!company) return null;
      return { company, newStatus };
    }

    return null;
  }

  if (!isPlainObject(raw)) return null;

  const applicationId = getStringField(raw, [
    "applicationId",
    "application_id",
    "appId",
    "appID",
    "id",
  ]);
  const companyRaw = getStringField(raw, ["company", "companyName", "name", "employer"]);
  const company = companyRaw ? sanitizeCompanyName(companyRaw) : undefined;
  const newStatusRaw = getStringField(raw, ["newStatus", "status", "state"]);
  const newStatus = normalizeStatus(newStatusRaw) ?? "applied";

  if (!applicationId && !company) return null;
  return {
    ...(applicationId ? { applicationId } : {}),
    ...(company ? { company } : {}),
    newStatus,
  };
}

export function normalizeStatusUpdatesInput(input: unknown): NormalizedStatusUpdate[] {
  const rawUpdates: unknown[] = [];

  if (Array.isArray(input)) {
    rawUpdates.push(...input);
  } else if (typeof input === "string") {
    rawUpdates.push(input);
  } else if (isPlainObject(input)) {
    if (Array.isArray(input.updates)) {
      rawUpdates.push(...input.updates);
    } else if (Array.isArray(input.update)) {
      rawUpdates.push(...input.update);
    } else if (isPlainObject(input.data) && Array.isArray(input.data.updates)) {
      rawUpdates.push(...input.data.updates);
    } else {
      rawUpdates.push(input);
    }
  }

  return rawUpdates
    .map((entry) => normalizeStatusUpdate(entry))
    .filter((entry): entry is NormalizedStatusUpdate => Boolean(entry));
}

function normalizeRoundType(raw: unknown): (typeof INTERVIEW_ROUND_TYPES)[number] | undefined {
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim();
  if (!normalized) return undefined;

  const exact = INTERVIEW_ROUND_TYPES.find((roundType) => roundType === normalized);
  if (exact) return exact;

  const lower = normalized.toLowerCase().replace(/[\s_-]+/g, "");

  if (lower.includes("tech1") || lower.includes("technical1") || lower.includes("round1")) {
    return "TechnicalRound1";
  }
  if (lower.includes("tech2") || lower.includes("technical2") || lower.includes("round2")) {
    return "TechnicalRound2";
  }
  if (lower.includes("systemdesign") || lower.includes("sysdesign")) {
    return "SystemDesign";
  }
  if (lower.includes("manager")) {
    return "Managerial";
  }
  if (lower.includes("assignment")) {
    return "Assignment";
  }
  if (lower.includes("final")) {
    return "Final";
  }
  if (lower === "hr" || lower.includes("humanresources")) {
    return "HR";
  }

  return undefined;
}

function normalizeRoundNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }

  if (typeof raw !== "string") return undefined;
  const match = raw.match(/(\d+)/);
  if (!match?.[1]) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function inferRoundTypeFromNumber(
  roundNumber: number | undefined
): (typeof INTERVIEW_ROUND_TYPES)[number] | undefined {
  if (!roundNumber) return undefined;
  if (roundNumber <= 1) return "TechnicalRound1";
  if (roundNumber === 2) return "TechnicalRound2";
  if (roundNumber === 3) return "SystemDesign";
  if (roundNumber === 4) return "Managerial";
  return "Final";
}

function normalizeDateField(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString();
  }

  return undefined;
}

function normalizeRoundUpdate(raw: unknown): NormalizedRoundUpdate | null {
  if (!isPlainObject(raw)) return null;

  const applicationId = getStringField(raw, [
    "applicationId",
    "application_id",
    "appId",
    "appID",
    "id",
  ]);
  const companyRaw = getStringField(raw, ["company", "companyName", "name", "employer"]);
  const company = companyRaw ? sanitizeCompanyName(companyRaw) : undefined;
  const role = getStringField(raw, ["role", "position", "jobRole", "title"]);
  const roundType = normalizeRoundType(
    getStringField(raw, ["roundType", "type", "round", "interviewRound"])
  );
  const roundNumber = normalizeRoundNumber(
    getStringField(raw, ["roundNumber", "roundNo", "round", "round_num"]) ?? raw.roundNumber
  );
  const normalizedRoundType = roundType ?? inferRoundTypeFromNumber(roundNumber);
  const scheduledDate = normalizeDateField(
    raw.scheduledDate ??
      raw.date ??
      raw.interviewDate ??
      raw.interview_date ??
      raw.scheduled_on ??
      raw.scheduledOn
  );
  const notes = getStringField(raw, ["notes", "note", "comment", "remarks"]);

  if (!scheduledDate) return null;

  return {
    ...(applicationId ? { applicationId } : {}),
    ...(company ? { company } : {}),
    ...(role ? { role } : {}),
    ...(normalizedRoundType ? { roundType: normalizedRoundType } : {}),
    ...(roundNumber ? { roundNumber } : {}),
    scheduledDate,
    ...(notes ? { notes } : {}),
  };
}

export function normalizeRoundUpdatesInput(input: unknown): NormalizedRoundUpdate[] {
  const rawUpdates: unknown[] = [];

  if (Array.isArray(input)) {
    rawUpdates.push(...input);
  } else if (isPlainObject(input)) {
    if (Array.isArray(input.updates)) {
      rawUpdates.push(...input.updates);
    } else if (Array.isArray(input.update)) {
      rawUpdates.push(...input.update);
    } else if (isPlainObject(input.data) && Array.isArray(input.data.updates)) {
      rawUpdates.push(...input.data.updates);
    } else {
      rawUpdates.push(input);
    }
  }

  return rawUpdates
    .map((entry) => normalizeRoundUpdate(entry))
    .filter((entry): entry is NormalizedRoundUpdate => Boolean(entry));
}
