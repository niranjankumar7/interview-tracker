import { z } from "zod";
import { WORK_MODES } from "@/types";

const applicationStatusSchema = z.enum([
  "applied",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
]);

const roleTypeSchema = z.enum([
  "SDE",
  "SDET",
  "ML",
  "DevOps",
  "Frontend",
  "Backend",
  "FullStack",
  "Data",
  "PM",
  "MobileEngineer",
]);

const focusAreaSchema = z.enum([
  "DSA",
  "SystemDesign",
  "Behavioral",
  "Review",
  "Mock",
]);

const questionCategorySchema = z.enum([
  "DSA",
  "SystemDesign",
  "Behavioral",
  "SQL",
  "Other",
]);

const experienceLevelSchema = z.enum(["Junior", "Mid", "Senior"]);
const themePreferenceSchema = z.enum(["light", "dark", "system"]);

const interviewRoundTypeSchema = z.enum([
  "HR",
  "TechnicalRound1",
  "TechnicalRound2",
  "SystemDesign",
  "Managerial",
  "Assignment",
  "Final",
]);

const interviewRoundSchema = z.object({
  roundNumber: z.number(),
  roundType: interviewRoundTypeSchema,
  scheduledDate: z.string().optional(),
  notes: z.string(),
  questionsAsked: z.array(z.string()),
  feedback: z
    .object({
      rating: z.number(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      struggledTopics: z.array(z.string()),
      notes: z.string(),
    })
    .optional(),
});

const workModeSchema = z.enum(WORK_MODES);

const offerDetailsSchema = z
  .object({
    baseSalary: z.number().optional(),
    equity: z.union([z.number(), z.string()]).optional(),
    bonus: z.number().optional(),
    currency: z.string().optional(),
    location: z.string().optional(),
    workMode: workModeSchema.optional(),
    joiningDate: z.string().optional(),
    noticePeriod: z.string().optional(),
    benefits: z.array(z.string()).optional(),
    notes: z.string().optional(),
    totalCTC: z.number().optional(),
  })
  .strict();

const applicationSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  jobDescriptionUrl: z.string().optional(),
  roleType: roleTypeSchema.optional(),
  status: applicationStatusSchema,
  applicationDate: z.string(),
  interviewDate: z.string().optional(),
  currentRound: interviewRoundTypeSchema.optional(),
  rounds: z.array(interviewRoundSchema),
  notes: z.string().default(""),
  offerDetails: offerDetailsSchema.optional(),
  createdAt: z.string(),
});

const taskSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
  category: z.string(),
});

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["morning", "evening", "quick"]),
  duration: z.string(),
  tasks: z.array(taskSchema),
  completed: z.boolean(),
});

const dailyPlanSchema = z.object({
  day: z.number(),
  date: z.string(),
  focus: focusAreaSchema,
  blocks: z.array(blockSchema),
  completed: z.boolean(),
});

const sprintSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  interviewDate: z.string(),
  roleType: roleTypeSchema,
  totalDays: z.number(),
  dailyPlans: z.array(dailyPlanSchema),
  status: z.enum(["active", "completed", "expired"]),
  createdAt: z.string(),
});

const questionSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  questionText: z.string(),
  category: questionCategorySchema,
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  askedInRound: z.string().optional(),
  dateAdded: z.string(),
});

const userProgressSchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastActiveDate: z.string(),
  totalTasksCompleted: z.number(),
});

const userProfileSchema = z.object({
  name: z.string(),
  targetRole: z.string(),
  experienceLevel: experienceLevelSchema,
});

const appPreferencesSchema = z.object({
  theme: themePreferenceSchema,
  studyRemindersEnabled: z.boolean(),
  calendarAutoSyncEnabled: z.boolean().default(false),
  leetcodeAutoSyncEnabled: z.boolean().default(false),
});

const completedTopicSchema = z.object({
  topicName: z.string(),
  displayName: z.string().optional(),
  completedAt: z.string(),
  source: z.enum(["chat", "manual"]),
});

const leetcodeConnectionSchema = z.object({
  connected: z.boolean(),
  username: z.string().optional(),
  connectedAt: z.string().optional(),
  lastSyncAt: z.string().optional(),
  readOnly: z.boolean(),
});

const leetcodeStatsSchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastActiveDate: z.string().optional(),
  totalSolved: z.number(),
  easySolved: z.number(),
  mediumSolved: z.number(),
  hardSolved: z.number(),
});

export const appDataSnapshotSchema = z.object({
  applications: z.array(applicationSchema),
  sprints: z.array(sprintSchema),
  questions: z.array(questionSchema),
  progress: userProgressSchema,
  profile: userProfileSchema,
  preferences: appPreferencesSchema,
  completedTopics: z.array(completedTopicSchema),
  leetcode: leetcodeConnectionSchema.optional(),
  leetcodeStats: leetcodeStatsSchema.optional(),
});

export const appDataExportSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  snapshot: appDataSnapshotSchema,
});

export type AppDataSnapshotSchema = z.infer<typeof appDataSnapshotSchema>;
export type AppDataExportSchema = z.infer<typeof appDataExportSchema>;
