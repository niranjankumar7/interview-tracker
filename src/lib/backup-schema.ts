import { z } from "zod";

const applicationStatusSchema = z.enum([
  "applied",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
]);

const interviewRoundSchema = z.object({
  roundNumber: z.number(),
  roundType: z.enum(["Technical", "HR", "Managerial"]),
  scheduledDate: z.string().optional(),
  notes: z.string(),
  questionsAsked: z.array(z.string()),
});

const applicationSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  status: applicationStatusSchema,
  applicationDate: z.string(),
  interviewDate: z.string().optional(),
  rounds: z.array(interviewRoundSchema),
  notes: z.string(),
  createdAt: z.string(),
});

const roleTypeSchema = z.enum(["SDE", "QA", "Data", "PM"]);
const focusAreaSchema = z.enum([
  "DSA",
  "SystemDesign",
  "Behavioral",
  "Review",
  "Mock",
]);

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
  category: z.enum(["DSA", "SystemDesign", "Behavioral", "SQL", "Other"]),
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

export const storeBackupSchema = z.object({
  applications: z.array(applicationSchema),
  sprints: z.array(sprintSchema),
  questions: z.array(questionSchema),
  completedTopics: z.array(z.string()).optional(),
  progress: userProgressSchema,
});

export type StoreBackup = z.infer<typeof storeBackupSchema>;
