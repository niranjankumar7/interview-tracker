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
} from "@/components/generative";
import { useStore } from "@/lib/store";
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
    description:
      "Get all job applications with their details including company, role, status, and interview date",
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
    description:
      "Get all active interview prep sprints with their daily plans and progress",
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
    description:
      "Get interview questions from the question bank, optionally filtered by company",
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
    description: "Get the user's current progress including streak and completed tasks",
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
    description:
      "Mark a prep topic as completed when the user says they studied or finished a topic. Examples: 'I completed Arrays and Strings', 'I studied Dynamic Programming', 'Done with Trees and Graphs'. This updates the global progress and shows completion with date on all PrepDetailPanels.",
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
      topicName: z.string().describe("The name of the topic the user completed studying. Examples: 'Arrays & Strings', 'Dynamic Programming', 'System Design', 'STAR Method'"),
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
    description:
      "Get all topics the user has marked as completed. Use this to show the user their study progress.",
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
    description:
      "Add one or more job applications to the pipeline. Use this when the user wants to add companies they've applied to, track new applications, or bulk add applications. Each application will be added with the specified status.",
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
            company: z.string().describe("Company name"),
            role: z.string().optional().describe("Job role/title"),
            status: z
              .enum(["applied", "shortlisted", "interview", "offer", "rejected"])
              .optional()
              .describe("Application status, defaults to 'applied'"),
          })
        )
        .describe("List of applications to add"),
    }),
    outputSchema: z.object({
      added: z.array(z.string()),
      count: z.number(),
    }),
  },
  {
    name: "updateApplicationStatus",
    description:
      "Update the status of one or more job applications. Use this when the user says they got shortlisted, rejected, received an offer, or has an interview scheduled. This moves the application card to the corresponding column in the pipeline.",
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
            company: z.string().describe("Company name to update"),
            newStatus: z
              .enum(["applied", "shortlisted", "interview", "offer", "rejected"])
              .describe("The new status for this application"),
          })
        )
        .describe("List of status updates to apply"),
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
    description:
      "A component that allows users to set up an interview prep sprint. Use this when the user mentions having an interview, wants to prepare for an interview, or talks about an upcoming interview at a company. Extracts company name, role type, and interview date from the conversation.",
    component: SprintSetupCard,
    propsSchema: sprintSetupCardSchema,
  },
  {
    name: "TodaysPlanPanel",
    description:
      "A component that shows the user's daily prep tasks. Use this when the user asks about today's plan, what they should study, what tasks they have, or wants to see their current sprint progress. Shows tasks organized by morning and evening blocks with checkboxes.",
    component: TodaysPlanPanel,
    propsSchema: todaysPlanPanelSchema,
  },
  {
    name: "PlanForDatePanel",
    description:
      "A component that shows the user's prep tasks for a specific date. Supported patterns: 'today', 'tomorrow', weekday names (with optional 'next'), 'in N days', a YYYY-MM-DD date, or a full ISO timestamp (date part is used). Pass the user's phrase directly as the targetDate. Use this instead of TodaysPlanPanel when the user mentions any non-today date or asks for their plan on a particular day. If the exact date isn't available, it shows the nearest upcoming day with guidance.",
    component: PlanForDatePanel,
    propsSchema: planForDatePanelSchema,
  },
  {
    name: "AddQuestionPanel",
    description:
      "A component that allows users to add interview questions to their question bank. Use this when the user wants to add a question, mentions a question they were asked, or wants to save a question for later. Auto-detects the question category (DSA, System Design, Behavioral, SQL).",
    component: AddQuestionPanel,
    propsSchema: addQuestionPanelSchema,
  },
  // Add more components here
];
