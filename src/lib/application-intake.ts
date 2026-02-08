import { tryParseDateInput } from "@/lib/date-parsing";

type ApplicationStatus = "applied" | "shortlisted" | "interview" | "offer" | "rejected";

export type IntakeApplication = {
  company: string;
  role?: string;
  status?: ApplicationStatus;
  notes?: string;
  applicationDate?: string;
};

type IntakeApplicationInput = IntakeApplication | string;

const GENERIC_ROLE_KEYS = new Set([
  "software engineer",
  "software developer",
  "developer",
  "engineer",
  "sde",
  "swe",
]);

const ROLE_KEYWORD_REGEX =
  /\b(ml|machine learning|ai|data|software|sde|sde\d+|swe|swe\d+|sdet|developer|dev|engineer|scientist|manager|architect|analyst|devops|frontend|backend|full stack|mobile|intern|l\d+|e\d+|ic\d+)\b/i;

const NON_COMPANY_WORD_REGEX =
  /\b(put|down|applied|apply|position|role|resume|notes?|just|sent|submitted|for|at|in|my|i|to)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSeparatorDashes(value: string): string {
  return value.replace(/[–—]/g, "-");
}

function normalizeRoleToken(token: string): string {
  const lower = token.toLowerCase();
  const compactLevel = lower.replace(/-/g, "");

  if (/^(sde|swe|l|e|ic)\d+$/.test(compactLevel)) {
    return compactLevel.toUpperCase();
  }

  if (lower === "dev") return "Developer";
  if (lower === "devops") return "DevOps";
  if (lower === "ml" || lower === "ai" || lower === "sde" || lower === "sdet") {
    return lower.toUpperCase();
  }
  if (/^l\d+$/.test(lower)) return lower.toUpperCase();
  if (lower === "ui" || lower === "ux" || lower === "qa") return lower.toUpperCase();
  if (lower === "ios") return "iOS";

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function toDisplayRole(role: string): string {
  const words = role.split(/\s+/).filter(Boolean);
  if (words.length === 0) return role;

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && (lower === "of" || lower === "and" || lower === "for" || lower === "to")) {
        return lower;
      }
      return normalizeRoleToken(word);
    })
    .join(" ");
}

export function roleKey(role: string): string {
  return normalizeWhitespace(role.toLowerCase().replace(/[^a-z0-9]+/g, " "));
}

export function rolesEquivalent(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return roleKey(a) === roleKey(b);
}

export function isGenericRole(role: string | undefined): boolean {
  if (!role) return true;
  return GENERIC_ROLE_KEYS.has(roleKey(role));
}

export function normalizeRoleText(role: string | undefined): string | undefined {
  if (!role) return undefined;

  let cleaned = normalizeWhitespace(role);
  cleaned = cleaned.replace(/^[`"'([{]+/, "").replace(/[`"')\]}]+$/, "");
  cleaned = cleaned.replace(/^role\s+of\s+/i, "");
  cleaned = cleaned.replace(/^(?:for|as)\s+(?:an?\s+|the\s+)?(?:role\s+of\s+)?/i, "");
  cleaned = cleaned.replace(/\s+(?:role|position)$/i, "");
  cleaned = cleaned.replace(/\bdev\b/gi, "developer");
  cleaned = normalizeWhitespace(cleaned);

  if (!cleaned) return undefined;
  return toDisplayRole(cleaned);
}

function normalizeNotesText(notes: string | undefined): string | undefined {
  if (!notes) return undefined;

  let cleaned = normalizeWhitespace(notes);
  cleaned = cleaned.replace(/^notes?\s*:\s*/i, "");
  cleaned = cleaned.replace(/^[-,:;.\s]+/, "");
  cleaned = normalizeWhitespace(cleaned);

  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeToStartOfDayIso(value: Date): string {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString();
}

function parseLooseDateExpression(value: string): Date | null {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return null;

  const parsed = tryParseDateInput(trimmed);
  if (parsed) return parsed;

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  return null;
}

function normalizeApplicationDate(dateValue: string | undefined): string | undefined {
  if (!dateValue) return undefined;
  const parsed = parseLooseDateExpression(dateValue);
  if (!parsed) return undefined;
  return normalizeToStartOfDayIso(parsed);
}

function looksLikeRoleText(value: string): boolean {
  return ROLE_KEYWORD_REGEX.test(value);
}

function splitDashSegments(value: string): string[] {
  return normalizeSeparatorDashes(value)
    .split(/\s+-\s+/)
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);
}

function parseDashStructuredFields(raw: string): {
  company?: string;
  role?: string;
  notes?: string;
} {
  const segments = splitDashSegments(raw);
  if (segments.length < 2) return {};

  const [company, ...tail] = segments;
  let role: string | undefined;
  let notes: string | undefined;

  for (const segment of tail) {
    if (!notes && /^notes?\s*:/i.test(segment)) {
      notes = normalizeNotesText(segment);
      continue;
    }

    if (!role && looksLikeRoleText(segment)) {
      role = normalizeRoleText(segment);
      continue;
    }

    if (!notes) {
      notes = normalizeNotesText(segment);
    }
  }

  return { company, role, notes };
}

function parsePositionSentence(raw: string): {
  company?: string;
  role?: string;
  notes?: string;
} {
  const text = normalizeWhitespace(raw);
  if (!text) return {};

  const roleThenCompany =
    text.match(
      /for\s+(?:an?\s+|the\s+)?(.+?)\s+(?:position|role)\s+(?:at|in)\s+([^,.;]+)(.*)$/i
    ) ??
    text.match(/as\s+(?:an?\s+|the\s+)?(.+?)\s+(?:position|role)\s+(?:at|in)\s+([^,.;]+)(.*)$/i);

  if (roleThenCompany) {
    return {
      role: normalizeRoleText(roleThenCompany[1]),
      company: normalizeWhitespace(roleThenCompany[2]),
      notes: normalizeNotesText(roleThenCompany[3]),
    };
  }

  const companyThenRole = text.match(
    /(?:at|in)\s+([^,.;]+?)\s+(?:for|as)\s+(?:an?\s+|the\s+)?(.+?)\s+(?:position|role)(.*)$/i
  );

  if (companyThenRole) {
    return {
      company: normalizeWhitespace(companyThenRole[1]),
      role: normalizeRoleText(companyThenRole[2]),
      notes: normalizeNotesText(companyThenRole[3]),
    };
  }

  return {};
}

function parseAddApplicationSentence(raw: string): {
  company?: string;
  role?: string;
  notes?: string;
} {
  const text = normalizeWhitespace(raw);
  if (!text) return {};

  const match = text.match(
    /\badd\s+(?:an?\s+)?application\s+for\s+([^,.;]+)(?:,\s*([^.;]+))?(.*)$/i
  );
  if (!match) return {};

  const company = normalizeWhitespace(match[1] ?? "");
  const roleCandidate = normalizeRoleText(match[2]);
  const trailing = normalizeNotesText(match[3]);

  return {
    company: company || undefined,
    role: roleCandidate && looksLikeRoleText(roleCandidate) ? roleCandidate : undefined,
    notes: trailing,
  };
}

function extractRoleFromText(value: string): string | undefined {
  const text = normalizeWhitespace(value);
  if (!text) return undefined;

  const patterns = [
    /(?:for|as)\s+(?:an?\s+|the\s+)?(?:role\s+of\s+)?([^,;|]+?)\s+(?:role|position)\b/i,
    /(?:for|as)\s+(?:an?\s+|the\s+)?([^,;|]+)$/i,
    /role\s+of\s+([^,;|]+)$/i,
    /-\s*([^,;|]+?)\s+(?:role|position)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = normalizeRoleText(match?.[1]);
    if (candidate && looksLikeRoleText(candidate)) return candidate;
  }

  return undefined;
}

function extractStandaloneRoleFromText(value: string): string | undefined {
  const text = normalizeWhitespace(value);
  if (!text) return undefined;

  const patterns = [
    /\b((?:sde|swe)\s*-?\s*\d+)\b/i,
    /\b((?:l|e|ic)\s*-?\s*\d+)\b/i,
    /\b((?:frontend|backend|full stack|fullstack|ml|machine learning|data|devops|sdet|software)\s+(?:engineer|developer|scientist|manager))\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const candidate = normalizeRoleText(match[1]);
    if (candidate && looksLikeRoleText(candidate)) return candidate;
  }

  return undefined;
}

function stripRoleSuffixFromCompany(rawCompany: string): string {
  const text = normalizeWhitespace(rawCompany);
  if (!text) return "";

  const patterns = [
    /^(.*?)\s+(?:for|as)\s+(?:an?\s+|the\s+)?(?:role\s+of\s+)?([^,;|]+?)\s+(?:role|position)\s*$/i,
    /^(.*?)\s*-\s*([^,;|]+?)\s+(?:role|position)\s*$/i,
    /^(.*?)\s+(?:for|as)\s+(?:an?\s+|the\s+)?(?:role\s+of\s+)?([^,;|]+)\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const roleCandidate = normalizeRoleText(match[2]);
    if (roleCandidate && looksLikeRoleText(roleCandidate)) {
      return normalizeWhitespace(match[1]);
    }
  }

  return text;
}

function extractNotesFromText(value: string): string | undefined {
  const text = normalizeWhitespace(value);
  if (!text) return undefined;

  const notesMatch = text.match(/notes?\s*:\s*(.+)$/i);
  if (notesMatch) return normalizeNotesText(notesMatch[1]);

  const resumeMatch = text.match(/\b((?:just\s+)?(?:sent|submitted)\s+(?:my\s+)?resume(?:.*)?)$/i);
  if (resumeMatch) return normalizeNotesText(resumeMatch[1]);

  return undefined;
}

function extractApplicationDateFromText(value: string): string | undefined {
  const text = normalizeWhitespace(value);
  if (!text) return undefined;

  const hasApplyVerb = /\b(applied|apply|submitted|sent(?:\s+my\s+resume)?)\b/i.test(text);
  if (!hasApplyVerb) return undefined;

  const directTokenMatch = text.match(
    /\b(yesterday|today|tomorrow|in\s+\d+\s+days?|next\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)|(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/i
  );
  if (directTokenMatch?.[1]) {
    const parsed = parseLooseDateExpression(directTokenMatch[1]);
    if (parsed) return normalizeToStartOfDayIso(parsed);
  }

  const onDateMatch = text.match(
    /\b(?:applied|apply|submitted|sent(?:\s+my\s+resume)?)\s+on\s+([^,.;!?]+)/i
  );
  if (onDateMatch?.[1]) {
    const parsed = parseLooseDateExpression(onDateMatch[1]);
    if (parsed) return normalizeToStartOfDayIso(parsed);
  }

  return undefined;
}

function uniqueRoles(roles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const role of roles) {
    const key = roleKey(role);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(role);
  }

  return out;
}

function coerceToObject(input: IntakeApplicationInput): IntakeApplication {
  if (typeof input === "string") {
    return { company: input };
  }

  return {
    company: input.company,
    role: input.role,
    status: input.status,
    notes: input.notes,
    applicationDate: input.applicationDate,
  };
}

function isLikelyCompanySegment(part: string): boolean {
  const cleaned = sanitizeCompanyName(stripRoleSuffixFromCompany(part));
  if (!cleaned) return false;

  if (NON_COMPANY_WORD_REGEX.test(cleaned.toLowerCase())) return false;
  if (cleaned.split(/\s+/).length > 5) return false;

  return /^[a-z0-9.&'/()\- ]+$/i.test(cleaned);
}

function extractCompanyListCandidate(rawCompany: string): string {
  let candidate = normalizeWhitespace(rawCompany);
  if (!candidate) return "";

  candidate = candidate.replace(
    /^(?:i\s+)?(?:have\s+)?(?:just\s+)?(?:applied|apply|submitted|sent)(?:\s+my\s+resume)?\s+(?:for|to)\s+/i,
    ""
  );
  candidate = candidate.replace(/^put\s+me\s+down\s+for\s+/i, "");
  candidate = candidate.replace(/^add\s+(?:an?\s+)?application\s+for\s+/i, "");

  candidate = candidate.replace(
    /\s+(?:for|as)\s+(?:an?\s+|the\s+)?(?:role\s+of\s+)?[^,.;]+?\s+(?:role|position)\s*$/i,
    ""
  );

  return normalizeWhitespace(candidate);
}

function shouldSplitSingleCompanyList(single: IntakeApplication): boolean {
  const companyListCandidate = extractCompanyListCandidate(single.company ?? "");
  if (!companyListCandidate.includes(",")) return false;

  const parts = companyListCandidate
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length <= 1) return false;
  return parts.every(isLikelyCompanySegment);
}

function expandCommaSeparatedCompanyList(apps: IntakeApplication[]): IntakeApplication[] {
  if (apps.length !== 1) return apps;

  const [single] = apps;
  if (!single || !shouldSplitSingleCompanyList(single)) return apps;

  const companyListCandidate = extractCompanyListCandidate(single.company);
  const sharedRole =
    normalizeRoleText(single.role) ??
    extractRoleFromText(single.company) ??
    extractStandaloneRoleFromText(single.company);
  const sharedNotes =
    normalizeNotesText(single.notes) ?? extractNotesFromText(single.company);
  const sharedApplicationDate =
    normalizeApplicationDate(single.applicationDate) ??
    extractApplicationDateFromText(single.company) ??
    extractApplicationDateFromText(single.notes ?? "");

  return companyListCandidate
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((company) => ({
      ...single,
      company,
      role: sharedRole,
      notes: sharedNotes,
      applicationDate: sharedApplicationDate,
    }));
}

function mergeText(primary: string | undefined, secondary: string | undefined): string | undefined {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const a = primary.toLowerCase();
  const b = secondary.toLowerCase();
  if (a.includes(b)) return primary;
  if (b.includes(a)) return secondary;

  return `${primary}. ${secondary}`;
}

/**
 * Clean company name by removing status/notes suffixes, delimiters, and trimming.
 */
export function sanitizeCompanyName(name: string): string {
  if (!name) return "";

  let cleaned = normalizeSeparatorDashes(normalizeWhitespace(name));
  cleaned = cleaned.split("|")[0]?.trim() ?? "";
  cleaned = cleaned.replace(/\s+-\s*notes?\s*:.*$/i, "");

  const dashParsed = parseDashStructuredFields(cleaned);
  if (dashParsed.company) {
    cleaned = dashParsed.company;
  }

  cleaned = cleaned
    .replace(/\s*(applied|shortlisted|interview|offer|rejected|status)\s*$/i, "")
    .trim();

  return normalizeWhitespace(cleaned);
}

/**
 * Normalizes application intake payloads from LLM tool calls.
 * - Handles single-string company lists separated by commas
 * - Extracts role and notes from malformed company text
 * - Backfills one specific role across entries that are missing or generic
 */
export function normalizeApplicationsForCreation(
  rawApps: IntakeApplicationInput[]
): IntakeApplication[] {
  const expanded = expandCommaSeparatedCompanyList(rawApps.map(coerceToObject));

  const normalized = expanded
    .map((app) => {
      const roleFromRoleField = normalizeRoleText(app.role);
      const notesFromField = normalizeNotesText(app.notes);
      const applicationDateFromField = normalizeApplicationDate(app.applicationDate);

      const dashFields = parseDashStructuredFields(app.company);
      const sentenceFields = parsePositionSentence(app.company);
      const addSentenceFields = parseAddApplicationSentence(app.company);
      const roleFromCompanyText = extractRoleFromText(app.company);
      const standaloneRoleFromCompanyText = extractStandaloneRoleFromText(app.company);
      const roleFromNotesText = extractRoleFromText(app.notes ?? "");
      const standaloneRoleFromNotesText = extractStandaloneRoleFromText(app.notes ?? "");
      const notesFromCompanyText = extractNotesFromText(app.company);
      const applicationDateFromCompanyText = extractApplicationDateFromText(app.company);
      const applicationDateFromNotesText = extractApplicationDateFromText(app.notes ?? "");

      const companyCandidate =
        addSentenceFields.company ??
        sentenceFields.company ??
        dashFields.company ??
        stripRoleSuffixFromCompany(app.company);
      const company = sanitizeCompanyName(companyCandidate);
      const roleCandidates = [
        roleFromRoleField,
        normalizeRoleText(addSentenceFields.role),
        normalizeRoleText(sentenceFields.role),
        normalizeRoleText(dashFields.role),
        roleFromCompanyText,
        standaloneRoleFromCompanyText,
        roleFromNotesText,
        standaloneRoleFromNotesText,
      ].filter((candidate): candidate is string => Boolean(candidate));

      let role = roleCandidates[0];
      if (role && isGenericRole(role)) {
        const specificRole = roleCandidates.find((candidate) => !isGenericRole(candidate));
        if (specificRole) {
          role = specificRole;
        }
      }
      const notes = mergeText(
        notesFromField,
        mergeText(
          normalizeNotesText(addSentenceFields.notes),
          mergeText(
            normalizeNotesText(sentenceFields.notes),
            mergeText(normalizeNotesText(dashFields.notes), notesFromCompanyText)
          )
        )
      );
      const applicationDate =
        applicationDateFromField ?? applicationDateFromCompanyText ?? applicationDateFromNotesText;

      return {
        ...app,
        company,
        role,
        notes,
        applicationDate,
      };
    })
    .filter((app) => app.company.length > 0);

  if (normalized.length <= 1) return normalized;

  const definedRoles = normalized
    .map((app) => normalizeRoleText(app.role))
    .filter((role): role is string => Boolean(role));

  const specificRoles = definedRoles.filter((role) => !isGenericRole(role));
  const uniqueSpecificRoles = uniqueRoles(specificRoles);

  if (uniqueSpecificRoles.length === 1) {
    const sharedRole = uniqueSpecificRoles[0];
    return normalized.map((app) => {
      const currentRole = normalizeRoleText(app.role);
      if (!currentRole || isGenericRole(currentRole)) {
        return { ...app, role: sharedRole };
      }
      return { ...app, role: currentRole };
    });
  }

  if (uniqueSpecificRoles.length === 0) {
    const uniqueDefinedRoles = uniqueRoles(definedRoles);
    if (uniqueDefinedRoles.length === 1 && definedRoles.length < normalized.length) {
      const sharedRole = uniqueDefinedRoles[0];
      return normalized.map((app) => ({
        ...app,
        role: normalizeRoleText(app.role) || sharedRole,
      }));
    }
  }

  return normalized.map((app) => ({
    ...app,
    role: normalizeRoleText(app.role),
  }));
}
