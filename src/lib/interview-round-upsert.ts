import {
  isGenericRole,
  normalizeRoleText,
  rolesEquivalent,
  sanitizeCompanyName,
} from "@/lib/application-intake";
import { tryParseDateInput } from "@/lib/date-parsing";

export type InterviewRoundType = string;
type ApplicationStatus = "applied" | "shortlisted" | "interview" | "offer" | "rejected";

type InterviewRoundLite = {
  roundNumber: number;
  roundType: InterviewRoundType;
  notes?: string;
};

export type ApplicationForRoundUpsert = {
  id: string;
  company: string;
  role: string;
  status?: ApplicationStatus;
  rounds?: InterviewRoundLite[];
};

export type InterviewRoundUpdateInput = {
  applicationId?: string;
  company?: string;
  role?: string;
  roundType?: string;
  roundNumber?: number;
  scheduledDate: string;
  notes?: string;
};

type RoundWritePayload = {
  roundType: InterviewRoundType;
  scheduledDate: string;
  notes: string;
};

export type InterviewRoundUpsertDeps = {
  getApplications: () => ApplicationForRoundUpsert[];
  refreshApplications?: () => Promise<void>;
  createRound: (
    applicationId: string,
    data: {
      roundNumber: number;
      roundType: InterviewRoundType;
      scheduledDate: string;
      notes: string;
      questionsAsked: string[];
    }
  ) => Promise<void>;
  updateRound: (
    applicationId: string,
    roundNumber: number,
    data: RoundWritePayload
  ) => Promise<void>;
  updateApplication: (
    applicationId: string,
    data: {
      status: "interview";
      interviewDate: string;
      currentRound: InterviewRoundType;
      role?: string;
    }
  ) => Promise<void>;
};

export function mergeNotes(existing: string | undefined, incoming: string | undefined): string | undefined {
  const current = existing?.trim();
  const next = incoming?.trim();

  if (!next) return current;
  if (!current) return next;

  const currentLower = current.toLowerCase();
  const nextLower = next.toLowerCase();
  if (currentLower.includes(nextLower)) return current;
  if (nextLower.includes(currentLower)) return next;

  return `${current}. ${next}`;
}

function pickPreferredCandidate<T extends { company: string }>(
  matches: T[]
): T | undefined {
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  const canonicalNameMatches = matches.filter((candidate) => {
    const trimmed = (candidate.company || "").trim();
    if (!trimmed) return false;
    return sanitizeCompanyName(candidate.company).toLowerCase() === trimmed.toLowerCase();
  });
  if (canonicalNameMatches.length === 1) {
    return canonicalNameMatches[0];
  }

  return undefined;
}

export function pickApplicationForUpsert<T extends ApplicationForRoundUpsert>(
  matches: T[],
  incomingRole: string | undefined
): T | undefined {
  if (matches.length === 0) return undefined;

  if (incomingRole) {
    const exactRoleMatches = matches.filter((candidate) =>
      rolesEquivalent(candidate.role, incomingRole)
    );
    const exactRoleMatch = pickPreferredCandidate(exactRoleMatches);
    if (exactRoleMatch) return exactRoleMatch;

    const genericMatches = matches.filter((candidate) => isGenericRole(candidate.role));
    const genericRoleMatch = pickPreferredCandidate(genericMatches);
    if (genericRoleMatch) return genericRoleMatch;
  }

  return pickPreferredCandidate(matches);
}

function findApplicationsByRole(
  applications: ApplicationForRoundUpsert[],
  incomingRole: string | undefined
): ApplicationForRoundUpsert[] {
  if (!incomingRole) return [];

  const exactRoleMatches = applications.filter((candidate) =>
    rolesEquivalent(candidate.role, incomingRole)
  );
  if (exactRoleMatches.length > 0) {
    return exactRoleMatches;
  }

  // Fallback for older cards that still have generic roles.
  return applications.filter((candidate) => isGenericRole(candidate.role));
}

function toRoundTypeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((token) => {
      if (/^[0-9]+$/.test(token)) return token;
      if (token.toLowerCase() === "hr") return "HR";
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

function parseInterviewRoundType(value: string | undefined): InterviewRoundType | undefined {
  if (!value) return undefined;

  const normalized = value.trim();
  if (!normalized) return undefined;

  const compact = normalized.toLowerCase().replace(/[\s_-]+/g, "");

  if (compact === "hr" || compact.includes("humanresources")) return "HR";
  if (
    compact.includes("technicalround1") ||
    compact.includes("techround1") ||
    compact.includes("technical1") ||
    compact.includes("tech1")
  ) {
    return "TechnicalRound1";
  }
  if (
    compact.includes("technicalround2") ||
    compact.includes("techround2") ||
    compact.includes("technical2") ||
    compact.includes("tech2")
  ) {
    return "TechnicalRound2";
  }
  if (compact.includes("systemdesign") || compact.includes("sysdesign")) return "SystemDesign";
  if (
    compact.includes("managerial") ||
    compact.includes("managerround") ||
    compact.includes("hiringmanager")
  ) {
    return "Managerial";
  }
  if (compact.includes("assignment") || compact.includes("takehome")) return "Assignment";
  if (compact.includes("final")) return "Final";

  const roundNumberMatch = compact.match(/^round(\d+)$/);
  if (roundNumberMatch?.[1]) {
    return `Round ${Number.parseInt(roundNumberMatch[1], 10)}`;
  }

  return toRoundTypeLabel(normalized);
}

function inferRoundTypeFromNumber(roundNumber: number): InterviewRoundType {
  return `Round ${roundNumber}`;
}

function getRoundNumberForType(
  rounds: InterviewRoundLite[],
  roundType: InterviewRoundType
): number | undefined {
  const existing = rounds.find((round) => round.roundType === roundType);
  return existing?.roundNumber;
}

function resolveTargetApplication(
  params: {
    update: InterviewRoundUpdateInput;
    applications: ApplicationForRoundUpsert[];
    lastResolvedApplicationId: string | null;
  }
): ApplicationForRoundUpsert | undefined {
  const { update, applications, lastResolvedApplicationId } = params;
  const incomingRole = normalizeRoleText(update.role);
  const explicitCompany = sanitizeCompanyName(update.company || "");

  if (update.applicationId) {
    return applications.find((candidate) => candidate.id === update.applicationId);
  }

  if (explicitCompany) {
    const companyMatches = applications.filter(
      (candidate) =>
        sanitizeCompanyName(candidate.company).toLowerCase() === explicitCompany.toLowerCase()
    );

    if (incomingRole) {
      return pickApplicationForUpsert(companyMatches, incomingRole);
    }

    if (companyMatches.length === 1) {
      return companyMatches[0];
    }

    const interviewingMatches = companyMatches.filter(
      (candidate) => candidate.status === "interview"
    );
    if (interviewingMatches.length === 1) {
      return interviewingMatches[0];
    }

    const matchesWithRounds = companyMatches.filter(
      (candidate) => (candidate.rounds?.length ?? 0) > 0
    );
    if (matchesWithRounds.length === 1) {
      return matchesWithRounds[0];
    }

    return undefined;
  }

  if (incomingRole) {
    const roleMatches = findApplicationsByRole(applications, incomingRole);
    if (roleMatches.length === 1) {
      return roleMatches[0];
    }
  } else if (lastResolvedApplicationId) {
    return applications.find((candidate) => candidate.id === lastResolvedApplicationId);
  }

  // Cross-turn fallback: if exactly one interview card exists, treat it as context target.
  const inInterview = applications.filter((candidate) => candidate.status === "interview");
  if (inInterview.length === 1) {
    return inInterview[0];
  }

  return undefined;
}

export async function upsertInterviewRoundsBatch(
  updates: InterviewRoundUpdateInput[],
  deps: InterviewRoundUpsertDeps
): Promise<{
  updated: string[];
  failed: string[];
  count: number;
}> {
  const updated: string[] = [];
  const failed: string[] = [];
  let lastResolvedApplicationId: string | null = null;

  for (const update of updates) {
    const incomingRole = normalizeRoleText(update.role);
    const explicitCompany = sanitizeCompanyName(update.company || "");

    let applications = deps.getApplications();
    let targetApplication = resolveTargetApplication({
      update,
      applications,
      lastResolvedApplicationId,
    });

    if (!targetApplication && deps.refreshApplications) {
      await deps.refreshApplications();
      applications = deps.getApplications();
      targetApplication = resolveTargetApplication({
        update,
        applications,
        lastResolvedApplicationId,
      });
    }

    if (!targetApplication) {
      failed.push(update.applicationId || explicitCompany || incomingRole || "unknown");
      continue;
    }

    lastResolvedApplicationId = targetApplication.id;
    const companyName = sanitizeCompanyName(targetApplication.company) || explicitCompany;

    const parsedDate = tryParseDateInput(update.scheduledDate);
    if (!parsedDate) {
      failed.push(companyName || incomingRole || "unknown");
      continue;
    }

    const scheduledDateIso = parsedDate.toISOString();

    const latestApplication =
      deps
        .getApplications()
        .find((candidate) => candidate.id === targetApplication.id) ?? targetApplication;

    const existingRounds = [...(latestApplication.rounds ?? [])].sort(
      (a, b) => a.roundNumber - b.roundNumber
    );

    const providedRoundNumber =
      typeof update.roundNumber === "number" && update.roundNumber > 0
        ? Math.floor(update.roundNumber)
        : undefined;
    const providedRoundType = parseInterviewRoundType(update.roundType);
    const nextRoundNumber =
      existingRounds.length > 0
        ? Math.max(...existingRounds.map((round) => round.roundNumber)) + 1
        : 1;

    const targetRoundNumber =
      providedRoundNumber ??
      (providedRoundType
        ? getRoundNumberForType(existingRounds, providedRoundType)
        : undefined) ??
      nextRoundNumber;
    const targetRoundType = providedRoundType ?? inferRoundTypeFromNumber(targetRoundNumber);

    const existingRound = existingRounds.find(
      (round) => round.roundNumber === targetRoundNumber
    );
    const mergedRoundNotes = mergeNotes(existingRound?.notes, update.notes) ?? "";

    try {
      if (existingRound) {
        await deps.updateRound(latestApplication.id, targetRoundNumber, {
          roundType: targetRoundType,
          scheduledDate: scheduledDateIso,
          notes: mergedRoundNotes,
        });
      } else {
        await deps.createRound(latestApplication.id, {
          roundNumber: targetRoundNumber,
          roundType: targetRoundType,
          scheduledDate: scheduledDateIso,
          notes: mergedRoundNotes,
          questionsAsked: [],
        });
      }

      const shouldUpdateRole =
        incomingRole &&
        (isGenericRole(latestApplication.role) ||
          !rolesEquivalent(latestApplication.role, incomingRole));

      await deps.updateApplication(latestApplication.id, {
        status: "interview",
        interviewDate: scheduledDateIso,
        currentRound: targetRoundType,
        ...(shouldUpdateRole ? { role: incomingRole } : {}),
      });

      updated.push(
        `${companyName || "unknown"} -> Round ${targetRoundNumber} (${targetRoundType}) on ${scheduledDateIso.slice(
          0,
          10
        )}`
      );
    } catch (error) {
      console.error(`Failed to upsert round for ${companyName}:`, error);
      failed.push(companyName || incomingRole || "unknown");
    }
  }

  return {
    updated,
    failed,
    count: updated.length,
  };
}
