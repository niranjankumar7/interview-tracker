import { z } from "zod";

import {
  APPLICATION_STATUSES,
  BLOCK_TYPES,
  FOCUS_AREAS,
  INTERVIEW_ROUND_TYPES,
  QUESTION_CATEGORIES,
  QUESTION_DIFFICULTIES,
  ROLE_TYPES,
  SPRINT_STATUSES,
} from "@/types";

const dateStringSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Invalid date",
  });

const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

const interviewRoundSchema = z.object({
  roundNumber: z.number(),
  roundType: z.enum(INTERVIEW_ROUND_TYPES),
  scheduledDate: dateStringSchema.optional(),
  notes: z.string(),
  questionsAsked: z.array(z.string()),
}).strict();

const applicationSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  roleType: z.enum(ROLE_TYPES).optional(),
  status: applicationStatusSchema,
  applicationDate: dateStringSchema,
  interviewDate: dateStringSchema.optional(),
  currentRound: z.enum(INTERVIEW_ROUND_TYPES).optional(),
  rounds: z.array(interviewRoundSchema),
  notes: z.string(),
  createdAt: dateStringSchema,
}).strict();

const roleTypeSchema = z.enum(ROLE_TYPES);
const focusAreaSchema = z.enum(FOCUS_AREAS);

const taskSchema = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
  category: z.string(),
}).strict();

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(BLOCK_TYPES),
  duration: z.string(),
  tasks: z.array(taskSchema),
  completed: z.boolean(),
}).strict();

const dailyPlanSchema = z.object({
  day: z.number(),
  date: dateStringSchema,
  focus: focusAreaSchema,
  blocks: z.array(blockSchema),
  completed: z.boolean(),
}).strict();

const sprintSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  interviewDate: dateStringSchema,
  roleType: roleTypeSchema,
  totalDays: z.number(),
  dailyPlans: z.array(dailyPlanSchema),
  status: z.enum(SPRINT_STATUSES),
  createdAt: dateStringSchema,
}).strict();

const questionSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  questionText: z.string(),
  category: z.enum(QUESTION_CATEGORIES),
  difficulty: z.enum(QUESTION_DIFFICULTIES).optional(),
  askedInRound: z.string().optional(),
  dateAdded: dateStringSchema,
}).strict();

const userProgressSchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastActiveDate: dateStringSchema,
  totalTasksCompleted: z.number(),
}).strict();

const completedTopicSchema = z.object({
  topicName: z.string(),
  displayName: z.string().optional(),
  completedAt: dateStringSchema,
  source: z.enum(["chat", "manual"]),
}).strict();

// v1 backups are intentionally strict; unknown fields fail validation.
export const storeBackupSchema = z.object({
  version: z.literal(1),
  applications: z.array(applicationSchema),
  sprints: z.array(sprintSchema),
  questions: z.array(questionSchema),
  completedTopics: z.array(completedTopicSchema),
  progress: userProgressSchema,
}).strict();

export type StoreBackup = z.infer<typeof storeBackupSchema>;
