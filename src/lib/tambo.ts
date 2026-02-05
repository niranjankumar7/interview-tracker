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
      company: z.string().optional().describe("Filter questions by company name"),
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
    tool: (input: {
      applications: Array<{
        company: string;
        role?: string;
        status?: "applied" | "shortlisted" | "interview" | "offer" | "rejected";
      }>;
    }) => {
      const addApplication = useStore.getState().addApplication;
      const added: string[] = [];

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

        const newApp = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          company: companyName,
          role: (typeof app === 'object' ? app?.role : undefined) || "Software Engineer",
          status: (typeof app === 'object' ? app?.status : undefined) || "applied",
          applicationDate: new Date().toISOString(),
          rounds: [],
          notes: "",
          createdAt: new Date().toISOString(),
        };

        addApplication(newApp);
        added.push(companyName);
      }

      return { added, count: added.length };
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
          })
        )
        .describe(schemaDescriptions.addApplications.applications),
    }),
    outputSchema: z.object({
      added: z.array(z.string()),
      count: z.number(),
    }),
  },
  {
    name: "updateApplicationStatus",
    description: toolDescriptions.updateApplicationStatus,
    tool: (input: {
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
      const updateApplication = state.updateApplication;
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
          updateApplication(app.id, { status: newStatus });
          results.push({ company: companyName, status: newStatus, success: true });
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
