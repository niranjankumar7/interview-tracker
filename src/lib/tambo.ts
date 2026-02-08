/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import {
  SprintSetupCard,
  sprintSetupCardSchema,
  TodaysPlanPanel,
  todaysPlanPanelSchema,
  PlanForDatePanel,
  planForDatePanelSchema,
  AddQuestionPanel,
  addQuestionPanelSchema,
  OfferDetailsPanel,
  offerDetailsPanelSchema,
  PipelineSummaryPanel,
  pipelineSummaryPanelSchema,
} from "@/components/generative";
import {
  isGenericRole,
  normalizeApplicationsForCreation,
  normalizeRoleText,
  rolesEquivalent,
  sanitizeCompanyName,
} from "@/lib/application-intake";
import {
  upsertInterviewRoundsBatch,
} from "@/lib/interview-round-upsert";
import { useStore } from "@/lib/store";
import {
  normalizeRoundUpdatesInput,
  normalizeStatusUpdatesInput,
} from "@/lib/tool-input-normalizers";
import { toolDescriptions, schemaDescriptions, componentDescriptions } from "@/lib/tool-descriptions";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

type StoreState = ReturnType<typeof useStore.getState>;
type StoredApplication = StoreState["applications"][number];

type OfferDetailsToolInput = {
  currency?: string;
  totalCTC?: number;
  baseSalary?: number;
  bonus?: number;
  equity?: string | number;
  joiningDate?: string;
  location?: string;
  workMode?: string;
  noticePeriod?: string;
  benefits?: string[];
  notes?: string;
};

function hasOfferCompensation(details: OfferDetailsToolInput): boolean {
  // Treat 0 as "provided" (e.g., zero bonus).
  return (
    details.totalCTC != null ||
    details.baseSalary != null ||
    details.bonus != null ||
    details.equity != null
  );
}

function normalizeOfferWorkMode(
  raw: string | undefined
): "WFH" | "Hybrid" | "Office" | undefined {
  if (!raw) return undefined;

  const wm = raw.toLowerCase();
  if (wm.includes("remote") || wm.includes("wfh")) return "WFH";
  if (wm.includes("hybrid")) return "Hybrid";
  if (
    wm.includes("office") ||
    wm.includes("onsite") ||
    wm.includes("on-site") ||
    wm.includes("on site")
  )
    return "Office";

  return undefined;
}

function findApplicationsByCompany(
  applications: StoredApplication[],
  company: string | undefined
) {
  const companyName = sanitizeCompanyName(company ?? "");
  if (!companyName) {
    return { ok: false, message: "Company name is required" } as const;
  }

  const matches = applications.filter(
    (app) => sanitizeCompanyName(app.company).toLowerCase() === companyName.toLowerCase()
  );

  return { ok: true, companyName, matches } as const;
}

function mergeNotes(existing: string | undefined, incoming: string | undefined): string | undefined {
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

function pickApplicationForUpsert(
  matches: StoredApplication[],
  incomingRole: string | undefined
): StoredApplication | undefined {
  if (matches.length === 0) return undefined;

  if (incomingRole) {
    const exactRoleMatches = matches.filter((candidate) =>
      rolesEquivalent(candidate.role, incomingRole)
    );
    const exactRoleMatch =
      exactRoleMatches.find(
        (candidate) => (candidate.company || "").trim() === sanitizeCompanyName(candidate.company)
      ) ?? exactRoleMatches[0];
    if (exactRoleMatch) return exactRoleMatch;

    const genericMatches = matches.filter((candidate) => isGenericRole(candidate.role));
    const genericRoleMatch =
      genericMatches.find(
        (candidate) => (candidate.company || "").trim() === sanitizeCompanyName(candidate.company)
      ) ?? genericMatches[0];
    if (genericRoleMatch) return genericRoleMatch;
  }

  if (matches.length === 1) {
    const [single] = matches;
    return single;
  }

  return undefined;
}

const permissiveStatusUpdateInputSchema = z
  .object({
    updates: z.array(z.unknown()).optional(),
    update: z.array(z.unknown()).optional(),
    data: z.unknown().optional(),
    applicationId: z
      .string()
      .optional()
      .describe(schemaDescriptions.updateApplicationStatus.applicationId),
    company: z
      .string()
      .optional()
      .describe(schemaDescriptions.updateApplicationStatus.company),
    newStatus: z
      .string()
      .optional()
      .describe(schemaDescriptions.updateApplicationStatus.newStatus),
    status: z.string().optional(),
    state: z.string().optional(),
  });

const permissiveRoundUpdateInputSchema = z
  .object({
    updates: z.array(z.unknown()).optional(),
    update: z.array(z.unknown()).optional(),
    data: z.unknown().optional(),
    applicationId: z
      .string()
      .optional()
      .describe(schemaDescriptions.upsertInterviewRounds.applicationId),
    company: z
      .string()
      .optional()
      .describe(schemaDescriptions.upsertInterviewRounds.company),
    role: z
      .string()
      .optional()
      .describe(schemaDescriptions.upsertInterviewRounds.role),
    roundType: z
      .string()
      .optional()
      .describe(schemaDescriptions.upsertInterviewRounds.roundType),
    roundNumber: z
      .union([z.number(), z.string()])
      .optional()
      .describe(schemaDescriptions.upsertInterviewRounds.roundNumber),
    scheduledDate: z
      .string()
      .optional()
      .describe(schemaDescriptions.upsertInterviewRounds.scheduledDate),
    date: z.string().optional(),
    interviewDate: z.string().optional(),
    notes: z.string().optional().describe(schemaDescriptions.upsertInterviewRounds.notes),
  });

/**
 * tools
 *
 * This array contains all the Tambo tools that are registered for use within the application.
 * Each tool is defined with its name, description, and expected props. The tools
 * can be controlled by AI to dynamically fetch data based on user interactions.
 */

export const tools: TamboTool[] = [
  {
    name: "getApplications",
    description: toolDescriptions.getApplications,
    tool: () => {
      return useStore.getState().applications;
    },
    inputSchema: z.object({}),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        company: z.string(),
        role: z.string(),
        status: z.enum([
          "applied",
          "shortlisted",
          "interview",
          "offer",
          "rejected",
        ]),
        interviewDate: z.string().optional(),
      })
    ),
  },
  {
    name: "getApplicationStatus",
    description: toolDescriptions.getApplicationStatus,
    tool: ({ company }: { company: string }) => {
      const state = useStore.getState();
      const applications = state.applications;
      const companyResult = findApplicationsByCompany(applications, company);

      if (!companyResult.ok) {
        return {
          found: false,
          message: companyResult.message,
        };
      }

      const { companyName, matches } = companyResult;
      if (matches.length === 0) {
        return {
          found: false,
          company: companyName,
          message: `No application found for ${companyName}.`,
        };
      }

      const normalizedMatches = [...matches].sort((a, b) =>
        (a.role || "").localeCompare(b.role || "")
      );

      const summary =
        normalizedMatches.length === 1
          ? `${companyName} is currently in ${normalizedMatches[0]?.status} status (${normalizedMatches[0]?.role}).`
          : `${companyName} has ${normalizedMatches.length} applications with mixed statuses.`;

      return {
        found: true,
        company: companyName,
        summary,
        applications: normalizedMatches.map((app) => ({
          id: app.id,
          company: app.company,
          role: app.role,
          status: app.status,
          interviewDate: app.interviewDate,
          notes: app.notes,
        })),
        message: summary,
      };
    },
    inputSchema: z.object({
      company: z.string().describe(schemaDescriptions.getApplicationStatus.company),
    }),
    outputSchema: z.object({
      found: z.boolean(),
      company: z.string().optional(),
      summary: z.string().optional(),
      applications: z
        .array(
          z.object({
            id: z.string(),
            company: z.string(),
            role: z.string(),
            status: z.enum(["applied", "shortlisted", "interview", "offer", "rejected"]),
            interviewDate: z.string().optional(),
            notes: z.string().optional(),
          })
        )
        .optional(),
      message: z.string(),
    }),
  },
  {
    name: "getActiveSprints",
    description: toolDescriptions.getActiveSprints,
    tool: () => {
      const state = useStore.getState();
      return state.sprints
        .filter((s) => s.status === "active")
        .map((s) => {
          const app = state.applications.find((a) => a.id === s.applicationId);
          return {
            id: s.id,
            company: app?.company || "Unknown",
            role: app?.role || "Unknown",
            interviewDate: s.interviewDate,
            totalDays: s.totalDays,
            currentDay:
              s.dailyPlans.findIndex((d) => !d.completed) + 1 || s.totalDays,
          };
        });
    },
    inputSchema: z.object({}),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        company: z.string(),
        role: z.string(),
        interviewDate: z.string(),
        totalDays: z.number(),
        currentDay: z.number(),
      })
    ),
  },
  {
    name: "getQuestions",
    description: toolDescriptions.getQuestions,
    tool: ({ company }: { company?: string }) => {
      const state = useStore.getState();
      let questions = state.questions;

      if (company) {
        const app = state.applications.find(
          (a) => a.company.toLowerCase() === company.toLowerCase()
        );
        if (app) {
          questions = questions.filter((q) => q.companyId === app.id);
        }
      }

      return questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        category: q.category,
        difficulty: q.difficulty,
        company:
          state.applications.find((a) => a.id === q.companyId)?.company ||
          "General",
      }));
    },
    inputSchema: z.object({
      company: z.string().optional().describe(schemaDescriptions.getQuestions.company),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        questionText: z.string(),
        category: z.string(),
        difficulty: z.string().optional(),
        company: z.string(),
      })
    ),
  },
  {
    name: "getUserProgress",
    description: toolDescriptions.getUserProgress,
    tool: () => {
      return useStore.getState().progress;
    },
    inputSchema: z.object({}),
    outputSchema: z.object({
      currentStreak: z.number(),
      longestStreak: z.number(),
      totalTasksCompleted: z.number(),
    }),
  },
  {
    name: "markTopicComplete",
    description: toolDescriptions.markTopicComplete,
    tool: (input: { topicName: string }) => {
      const store = useStore.getState();
      const { topicName } = input;

      // Check if already completed
      const existing = store.getTopicCompletion(topicName);
      if (existing) {
        return {
          success: true,
          alreadyCompleted: true,
          topicName,
          completedAt: existing.completedAt,
          message: `"${topicName}" was already marked as completed on ${new Date(existing.completedAt).toLocaleDateString()}`
        };
      }

      // Mark as complete
      store.markTopicComplete(topicName, 'chat');

      return {
        success: true,
        alreadyCompleted: false,
        topicName,
        completedAt: new Date().toISOString(),
        message: `Great job! "${topicName}" marked as completed. This topic will now show as studied in all your interview prep panels.`
      };
    },
    inputSchema: z.object({
      topicName: z.string().describe(schemaDescriptions.markTopicComplete.topicName),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      alreadyCompleted: z.boolean(),
      topicName: z.string(),
      completedAt: z.string(),
      message: z.string(),
    }),
  },
  {
    name: "getCompletedTopics",
    description: toolDescriptions.getCompletedTopics,
    tool: () => {
      const completedTopics = useStore.getState().completedTopics;
      return {
        topics: completedTopics.map(t => ({
          name: t.displayName || t.topicName, // Use displayName for proper casing
          completedAt: t.completedAt,
          source: t.source
        })),
        count: completedTopics.length
      };
    },
    inputSchema: z.object({}),
    outputSchema: z.object({
      topics: z.array(z.object({
        name: z.string(),
        completedAt: z.string(),
        source: z.enum(['chat', 'manual'])
      })),
      count: z.number(),
    }),
  },
  {
    name: "addApplications",
    description: toolDescriptions.addApplications,
    tool: async (input: {
      applications: Array<{
        company: string;
        role?: string;
        status?: "applied" | "shortlisted" | "interview" | "offer" | "rejected";
        notes?: string;
        applicationDate?: string;
      }>;
    }) => {
      const state = useStore.getState();
      const createApplicationAPI = state.createApplicationAPI;
      const updateApplicationAPI = state.updateApplicationAPI;
      let knownApplications = [...state.applications];
      const added: string[] = [];
      const failed: string[] = [];

      console.log("addApplications input:", JSON.stringify(input, null, 2));
      const apps = normalizeApplicationsForCreation(input?.applications || []);
      console.log("addApplications normalized:", JSON.stringify(apps, null, 2));

      for (const app of apps) {
        const companyName = sanitizeCompanyName(app.company || "");
        const incomingRole = normalizeRoleText(app.role);
        const incomingNotes = app.notes?.trim();
        const incomingApplicationDate = app.applicationDate;

        if (!companyName) {
          console.warn("Skipping application with no company name:", app);
          continue;
        }

        const companyMatches = knownApplications.filter(
          (candidate) =>
            sanitizeCompanyName(candidate.company).toLowerCase() === companyName.toLowerCase()
        );
        const existing = pickApplicationForUpsert(companyMatches, incomingRole);

        if (existing) {
          const mergedNotes = mergeNotes(existing.notes, incomingNotes);
          const updates: {
            company?: string;
            role?: string;
            status?: "applied" | "shortlisted" | "interview" | "offer" | "rejected";
            notes?: string;
            applicationDate?: string;
          } = {};

          if ((existing.company || "").trim() !== companyName) {
            updates.company = companyName;
          }

          if (
            incomingRole &&
            (!rolesEquivalent(existing.role, incomingRole) || isGenericRole(existing.role))
          ) {
            updates.role = incomingRole;
          }

          if (app.status && existing.status !== app.status) {
            updates.status = app.status;
          }

          if (mergedNotes !== existing.notes) {
            updates.notes = mergedNotes ?? "";
          }

          if (incomingApplicationDate && incomingApplicationDate !== existing.applicationDate) {
            updates.applicationDate = incomingApplicationDate;
          }

          try {
            if (Object.keys(updates).length > 0) {
              await updateApplicationAPI(existing.id, updates);
            }

            const nextApplication = {
              ...existing,
              ...updates,
            };
            knownApplications = knownApplications.map((candidate) =>
              candidate.id === existing.id ? nextApplication : candidate
            );

            const malformedDuplicates = companyMatches.filter(
              (candidate) =>
                candidate.id !== existing.id &&
                (candidate.company || "").trim() !== sanitizeCompanyName(candidate.company)
            );

            for (const duplicate of malformedDuplicates) {
              const archivedNotes =
                mergeNotes(
                  duplicate.notes,
                  "Auto-archived malformed duplicate card after normalization."
                ) ?? "";

              await updateApplicationAPI(duplicate.id, {
                status: "rejected",
                notes: archivedNotes,
              });

              knownApplications = knownApplications.map((candidate) =>
                candidate.id === duplicate.id
                  ? {
                    ...candidate,
                    status: "rejected",
                    notes: archivedNotes,
                  }
                  : candidate
              );
            }

            added.push(companyName);
          } catch (error) {
            console.error(`Failed to update application for ${companyName}:`, error);
            failed.push(companyName);
          }
          continue;
        }

        if (companyMatches.length > 0) {
          console.warn("Ambiguous duplicate applications; skipping auto-create:", {
            companyName,
            incomingRole,
            matches: companyMatches.map((candidate) => ({
              id: candidate.id,
              company: candidate.company,
              role: candidate.role,
            })),
          });
          failed.push(companyName);
          continue;
        }

        try {
          const created = await createApplicationAPI({
            company: companyName,
            role: incomingRole || "Software Engineer",
            status: app.status || "applied",
            notes: incomingNotes || "",
            // Additional defaults required by API schema if not present
            roleType: undefined,
            applicationDate: incomingApplicationDate || new Date().toISOString(),
          });
          knownApplications = [...knownApplications, created];
          added.push(companyName);
        } catch (error) {
          console.error(`Failed to create application for ${companyName}:`, error);
          failed.push(companyName);
        }
      }

      return {
        added,
        failed: failed.length > 0 ? failed : undefined,
        count: added.length
      };
    },
    inputSchema: z.object({
      applications: z
        .array(
          z.object({
            company: z.string().describe(schemaDescriptions.addApplications.company),
            role: z.string().optional().describe(schemaDescriptions.addApplications.role),
            status: z
              .enum(["applied", "shortlisted", "interview", "offer", "rejected"])
              .optional()
              .describe(schemaDescriptions.addApplications.status),
            notes: z.string().optional().describe(schemaDescriptions.addApplications.notes),
            applicationDate: z
              .string()
              .optional()
              .describe(schemaDescriptions.addApplications.applicationDate),
          })
        )
        .describe(schemaDescriptions.addApplications.applications),
    }),
    outputSchema: z.object({
      added: z.array(z.string()),
      failed: z.array(z.string()).optional(),
      count: z.number(),
    }),
  },
  {
    name: "updateApplicationStatus",
    description: toolDescriptions.updateApplicationStatus,
    tool: async (input: unknown) => {
      const results: Array<{ company: string; status: string; success: boolean }> = [];

      console.log("updateApplicationStatus input:", JSON.stringify(input, null, 2));

      const updates = normalizeStatusUpdatesInput(input);

      if (updates.length === 0) {
        return {
          updated: [],
          failed: ["invalid_input"],
          count: 0,
        };
      }

      for (const update of updates) {
        const companyName = sanitizeCompanyName(update.company || "");
        const applicationId = update.applicationId?.trim() || "";
        const newStatus = update.newStatus;

        if (!applicationId && !companyName) {
          results.push({ company: "unknown", status: "failed", success: false });
          continue;
        }

        const resolveApp = () => {
          const applications = useStore.getState().applications;

          if (applicationId) {
            const byId = applications.find((candidate) => candidate.id === applicationId);
            if (byId) return byId;
          }

          if (!companyName) return undefined;

          const matches = applications.filter(
            (candidate) =>
              sanitizeCompanyName(candidate.company).toLowerCase() ===
              companyName.toLowerCase()
          );

          if (matches.length === 0) return undefined;
          if (matches.length === 1) return matches[0];

          const interviewingMatches = matches.filter(
            (candidate) => candidate.status === "interview"
          );
          if (interviewingMatches.length === 1) return interviewingMatches[0];

          return matches[0];
        };

        let app = resolveApp();

        if (!app) {
          try {
            await useStore.getState().syncWithBackend();
            app = resolveApp();
          } catch (error) {
            console.error("Status update sync retry failed:", error);
          }
        }

        if (app) {
          try {
            await useStore.getState().updateApplicationAPI(app.id, { status: newStatus });
            results.push({
              company:
                sanitizeCompanyName(app.company) || companyName || applicationId || "unknown",
              status: newStatus,
              success: true,
            });
          } catch (error) {
            console.error(
              `Failed to update status for ${companyName || applicationId}:`,
              error
            );
            results.push({
              company: companyName || applicationId || "unknown",
              status: "error",
              success: false,
            });
          }
        } else {
          results.push({
            company: companyName || applicationId || "unknown",
            status: "not found",
            success: false,
          });
        }
      }

      return {
        updated: results.filter((r) => r.success).map((r) => `${r.company} → ${r.status}`),
        failed: results.filter((r) => !r.success).map((r) => r.company),
        count: results.filter((r) => r.success).length,
      };
    },
    inputSchema: permissiveStatusUpdateInputSchema.describe(
      schemaDescriptions.updateApplicationStatus.updates
    ),
    outputSchema: z.object({
      updated: z.array(z.string()),
      failed: z.array(z.string()),
      count: z.number(),
    }),
  },
  {
    name: "upsertInterviewRounds",
    description: toolDescriptions.upsertInterviewRounds,
    tool: async (input: unknown) => {
      const updates = normalizeRoundUpdatesInput(input);
      if (updates.length === 0) {
        return {
          updated: [],
          failed: ["invalid_input"],
          count: 0,
        };
      }

      return upsertInterviewRoundsBatch(updates, {
        getApplications: () => useStore.getState().applications,
        refreshApplications: async () => {
          await useStore.getState().syncWithBackend();
        },
        createRound: async (applicationId, data) => {
          await useStore.getState().createInterviewRoundAPI(applicationId, data);
        },
        updateRound: async (applicationId, roundNumber, data) => {
          await useStore.getState().updateInterviewRoundAPI(
            applicationId,
            roundNumber,
            data
          );
        },
        updateApplication: async (applicationId, data) => {
          await useStore.getState().updateApplicationAPI(applicationId, data);
        },
      });
    },
    inputSchema: permissiveRoundUpdateInputSchema.describe(
      schemaDescriptions.upsertInterviewRounds.updates
    ),
    outputSchema: z.object({
      updated: z.array(z.string()),
      failed: z.array(z.string()),
      count: z.number(),
    }),
  },
  {
    name: "updateOfferDetails",
    description:
      "Save or update job offer details for an application. Prefer applicationId when known. If matching by company finds multiple applications, returns success=false with a candidates list; callers should prompt for an applicationId and retry. Sets status to offer only when compensation fields are provided (CTC/base/bonus/equity).",
    tool: async (input: {
      applicationId?: string;
      company?: string;
      offerDetails: OfferDetailsToolInput;
    }) => {
      const state = useStore.getState();
      const { applications, updateApplicationAPI } = state;
      const { applicationId, company, offerDetails } = input;

      if (!applicationId && !company) {
        return {
          success: false,
          message: "Either applicationId or company must be provided"
        };
      }

      let app = applicationId
        ? applications.find((candidate) => candidate.id === applicationId)
        : undefined;

      if (applicationId && !app) {
        return {
          success: false,
          message: `Application with id "${applicationId}" not found.`
        };
      }

      if (!app) {
        const companyResult = findApplicationsByCompany(applications, company);
        if (!companyResult.ok) {
          return { success: false, message: companyResult.message };
        }

        if (companyResult.matches.length === 0) {
          return {
            success: false,
            message: `Application for "${companyResult.companyName}" not found. Please add the application first.`
          };
        }

        if (companyResult.matches.length > 1) {
          return {
            success: false,
            candidates: companyResult.matches.map((candidate) => ({
              id: candidate.id,
              company: candidate.company,
              role: candidate.role,
              status: candidate.status,
            })),
            message: `Multiple applications found for "${companyResult.companyName}". Please specify the applicationId from the candidates list.`,
          };
        }

        const match = companyResult.matches[0];
        if (!match) {
          return {
            success: false,
            message: `Application for "${companyResult.companyName}" not found. Please add the application first.`
          };
        }

        app = match;
      }

      const hasComp = hasOfferCompensation(offerDetails);
      const mappedWorkMode = normalizeOfferWorkMode(offerDetails.workMode);
      const currentOffer = app.offerDetails ?? {};
      const mergedOfferDetails = {
        baseSalary: offerDetails.baseSalary ?? currentOffer.baseSalary,
        bonus: offerDetails.bonus ?? currentOffer.bonus,
        equity:
          offerDetails.equity !== undefined
            ? offerDetails.equity.toString()
            : currentOffer.equity?.toString(),
        totalCTC: offerDetails.totalCTC ?? currentOffer.totalCTC,
        currency: offerDetails.currency ?? currentOffer.currency ?? "INR",
        location: offerDetails.location ?? currentOffer.location,
        workMode: mappedWorkMode ?? currentOffer.workMode,
        joiningDate: offerDetails.joiningDate ?? currentOffer.joiningDate,
        noticePeriod: offerDetails.noticePeriod ?? currentOffer.noticePeriod,
        benefits: offerDetails.benefits ?? currentOffer.benefits,
        notes: offerDetails.notes ?? currentOffer.notes,
      };

      try {
        await updateApplicationAPI(app.id, {
          ...(hasComp ? { status: "offer" } : {}),
          offerDetails: mergedOfferDetails,
        });

        return {
          success: true,
          company: app.company,
          message:
            `Successfully saved offer details for ${app.company}. ` +
            `Total CTC: ${offerDetails.totalCTC ?? "Not set"}`
        };
      } catch (error) {
        console.error("Failed to update offer details:", error);
        return {
          success: false,
          message: "Failed to save offer details due to a server error."
        };
      }
    },
    inputSchema: z
      .object({
        applicationId: z.string().optional().describe("Application id (preferred when known)"),
        company: z.string().optional().describe("Company name"),
        offerDetails: z.object({
          currency: z.string().optional().describe("Currency code (e.g. INR, USD)"),
          totalCTC: z.number().optional().describe("Total CTC"),
          baseSalary: z.number().optional().describe("Base salary"),
          bonus: z.number().optional().describe("Bonus amount"),
          equity: z.union([z.string(), z.number()]).optional().describe("Equity (number or string description)"),
          joiningDate: z.string().optional().describe("Joining date (YYYY-MM-DD)"),
          location: z.string().optional().describe("Location"),
          workMode: z.string().optional().describe("Work mode (e.g. Remote, WFH, Hybrid, Office)"),
          notes: z.string().optional().describe("Additional notes"),
        }),
      })
      .refine((data) => Boolean(data.applicationId || data.company), {
        message: "Either applicationId or company must be provided",
      }),
    outputSchema: z.object({
      success: z.boolean(),
      company: z.string().optional(),
      candidates: z
        .array(
          z.object({
            id: z.string(),
            company: z.string(),
            role: z.string(),
            status: z.enum(["applied", "shortlisted", "interview", "offer", "rejected"]),
          })
        )
        .optional(),
      message: z.string(),
    }),
  },
  // Add more tools here
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  {
    name: "SprintSetupCard",
    description: componentDescriptions.SprintSetupCard,
    component: SprintSetupCard,
    propsSchema: sprintSetupCardSchema,
  },
  {
    name: "TodaysPlanPanel",
    description: componentDescriptions.TodaysPlanPanel,
    component: TodaysPlanPanel,
    propsSchema: todaysPlanPanelSchema,
  },
  {
    name: "PlanForDatePanel",
    description: componentDescriptions.PlanForDatePanel,
    component: PlanForDatePanel,
    propsSchema: planForDatePanelSchema,
  },
  {
    name: "AddQuestionPanel",
    description: componentDescriptions.AddQuestionPanel,
    component: AddQuestionPanel,
    propsSchema: addQuestionPanelSchema,
  },
  {
    name: "PipelineSummaryPanel",
    description: componentDescriptions.PipelineSummaryPanel,
    component: PipelineSummaryPanel,
    propsSchema: pipelineSummaryPanelSchema,
  },
  {
    name: "OfferDetailsPanel",
    description: componentDescriptions.OfferDetailsPanel,
    component: OfferDetailsPanel,
    propsSchema: offerDetailsPanelSchema,
  },
  // Add more components here
];
