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
import { useStore } from "@/lib/store";
import { toolDescriptions, schemaDescriptions, componentDescriptions } from "@/lib/tool-descriptions";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

/**
 * Clean company name by removing status suffixes, delimiters, and trimming
 */
function sanitizeCompanyName(name: string): string {
  if (!name) return '';

  // Remove common status suffixes that might be concatenated
  const cleaned = name
    .split('|')[0]  // Take content before pipe
    .split(' - ')[0] // Take content before dash separator
    .replace(/\s*(applied|shortlisted|interview|offer|rejected|status)\s*$/i, '') // Remove status keywords
    .trim();

  return cleaned;
}

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
      }>;
    }) => {
      const createApplicationAPI = useStore.getState().createApplicationAPI;
      const added: string[] = [];
      const failed: string[] = [];

      // Handle various input formats that Tambo might send
      const apps = input?.applications || [];

      console.log("addApplications input:", JSON.stringify(input, null, 2));

      for (const app of apps) {
        // Defensive: ensure we have a company name and sanitize it
        const rawName = typeof app === 'string' ? app : (app?.company || '');
        const companyName = sanitizeCompanyName(rawName);

        if (!companyName) {
          console.warn("Skipping application with no company name:", app);
          continue;
        }

        try {
          await createApplicationAPI({
            company: companyName,
            role: (typeof app === 'object' ? app?.role : undefined) || "Software Engineer",
            status: (typeof app === 'object' ? app?.status : undefined) || "applied",
            notes: (typeof app === 'object' ? app?.notes : undefined) || "",
            // Additional defaults required by API schema if not present
            roleType: undefined,
            applicationDate: new Date().toISOString(),
          });
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
    tool: async (input: {
      updates: Array<
        | string
        | {
          company: string;
          newStatus: "applied" | "shortlisted" | "interview" | "offer" | "rejected";
        }
      >;
    }) => {
      const state = useStore.getState();
      const applications = state.applications;
      const updateApplicationAPI = state.updateApplicationAPI;
      const results: Array<{ company: string; status: string; success: boolean }> = [];

      console.log("updateApplicationStatus input:", JSON.stringify(input, null, 2));

      const updates = input?.updates || [];

      for (const update of updates) {
        let companyName: string = '';
        let newStatus: "applied" | "shortlisted" | "interview" | "offer" | "rejected" = 'applied';

        if (typeof update === 'string') {
          // Handle string format like "Google:shortlisted" or "Google|shortlisted"
          const parts = update.split(/[:|]/);
          companyName = sanitizeCompanyName(parts[0] || '');
          const statusPart = parts[1]?.toLowerCase().trim();
          if (statusPart && ['applied', 'shortlisted', 'interview', 'offer', 'rejected'].includes(statusPart)) {
            newStatus = statusPart as typeof newStatus;
          }
        } else if (update && typeof update === 'object') {
          // Handle object format {company: "Google", newStatus: "shortlisted"}
          companyName = sanitizeCompanyName(update.company || '');
          newStatus = update.newStatus || 'applied';
        }

        if (!companyName) {
          results.push({ company: 'unknown', status: 'failed', success: false });
          continue;
        }

        // Find the application by company name (case-insensitive, also sanitize stored names)
        const app = applications.find(
          (a) => sanitizeCompanyName(a.company).toLowerCase() === companyName.toLowerCase()
        );

        if (app) {
          try {
            await updateApplicationAPI(app.id, { status: newStatus });
            results.push({ company: companyName, status: newStatus, success: true });
          } catch (error) {
            console.error(`Failed to update status for ${companyName}:`, error);
            results.push({ company: companyName, status: 'error', success: false });
          }
        } else {
          results.push({ company: companyName, status: 'not found', success: false });
        }
      }

      return {
        updated: results.filter((r) => r.success).map((r) => `${r.company} → ${r.status}`),
        failed: results.filter((r) => !r.success).map((r) => r.company),
        count: results.filter((r) => r.success).length,
      };
    },
    inputSchema: z.object({
      updates: z
        .array(
          z.object({
            company: z.string().describe(schemaDescriptions.updateApplicationStatus.company),
            newStatus: z
              .enum(["applied", "shortlisted", "interview", "offer", "rejected"])
              .describe(schemaDescriptions.updateApplicationStatus.newStatus),
          })
        )
        .describe(schemaDescriptions.updateApplicationStatus.updates),
    }),
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

      try {
        await updateApplicationAPI(app.id, {
          ...(hasComp ? { status: "offer" } : {}),
          offerDetails: {
            baseSalary: offerDetails.baseSalary,
            bonus: offerDetails.bonus,
            equity: offerDetails.equity?.toString(),
            totalCTC: offerDetails.totalCTC,
            currency: offerDetails.currency || "INR",
            location: offerDetails.location,
            workMode: mappedWorkMode,
            joiningDate: offerDetails.joiningDate,
            notes: offerDetails.notes,
          }
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
