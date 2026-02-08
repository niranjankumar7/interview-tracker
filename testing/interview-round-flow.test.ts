import assert from "node:assert/strict";
import test from "node:test";

import { tryParseDateInput } from "@/lib/date-parsing";
import {
  type ApplicationForRoundUpsert,
  type InterviewRoundType,
  upsertInterviewRoundsBatch,
} from "@/lib/interview-round-upsert";

function makeApplication(): ApplicationForRoundUpsert & {
  status?: "applied" | "shortlisted" | "interview" | "offer" | "rejected";
  interviewDate?: string;
  currentRound?: InterviewRoundType;
} {
  return {
    id: "app-openai2",
    company: "OpenAI2",
    role: "RL Engineer",
    rounds: [],
    status: "applied",
  };
}

test("tryParseDateInput parses ordinal month/day format", () => {
  const base = new Date("2026-02-08T00:00:00Z");

  const first = tryParseDateInput("14th feb", base);
  const second = tryParseDateInput("Feb 18th", base);

  assert.ok(first, "Expected '14th feb' to parse");
  assert.ok(second, "Expected 'Feb 18th' to parse");

  assert.equal(first.getFullYear(), 2026);
  assert.equal(first.getMonth(), 1);
  assert.equal(first.getDate(), 14);

  assert.equal(second.getFullYear(), 2026);
  assert.equal(second.getMonth(), 1);
  assert.equal(second.getDate(), 18);
});

test("upsertInterviewRoundsBatch supports two-prompt flow for OpenAI2", async () => {
  const app = makeApplication();
  const apps = [app];

  const deps = {
    getApplications: () => apps,
    createRound: async (applicationId: string, data: {
      roundNumber: number;
      roundType: InterviewRoundType;
      scheduledDate: string;
      notes: string;
      questionsAsked: string[];
    }) => {
      assert.equal(applicationId, app.id);
      app.rounds = [...(app.rounds ?? []), data];
    },
    updateRound: async (
      applicationId: string,
      roundNumber: number,
      data: {
        roundType: InterviewRoundType;
        scheduledDate: string;
        notes: string;
      }
    ) => {
      assert.equal(applicationId, app.id);
      const idx = (app.rounds ?? []).findIndex((round) => round.roundNumber === roundNumber);
      assert.ok(idx >= 0, `Expected round ${roundNumber} to exist before update`);
      const previous = app.rounds?.[idx];
      if (!previous) return;
      app.rounds![idx] = {
        ...previous,
        ...data,
        roundNumber,
      };
    },
    updateApplication: async (
      applicationId: string,
      data: {
        status: "interview";
        interviewDate: string;
        currentRound: InterviewRoundType;
        role?: string;
      }
    ) => {
      assert.equal(applicationId, app.id);
      app.status = data.status;
      app.interviewDate = data.interviewDate;
      app.currentRound = data.currentRound;
      if (data.role) app.role = data.role;
    },
  };

  const firstPromptResult = await upsertInterviewRoundsBatch(
    [
      {
        company: "OpenAI2",
        role: "RL engineer",
        roundNumber: 1,
        scheduledDate: "25th feb 2026",
      },
    ],
    deps
  );

  const secondPromptResult = await upsertInterviewRoundsBatch(
    [
      {
        roundNumber: 2,
        scheduledDate: "28th feb 2026",
      },
    ],
    deps
  );

  assert.equal(firstPromptResult.count, 1);
  assert.equal(secondPromptResult.count, 1);

  const sortedRounds = [...(app.rounds ?? [])].sort(
    (a, b) => a.roundNumber - b.roundNumber
  );

  assert.equal(sortedRounds.length, 2, "OpenAI2 card should contain 2 rounds");
  assert.equal(sortedRounds[0]?.roundNumber, 1);
  assert.equal(sortedRounds[0]?.roundType, "TechnicalRound1");
  assert.equal(sortedRounds[1]?.roundNumber, 2);
  assert.equal(sortedRounds[1]?.roundType, "TechnicalRound2");
  assert.equal(app.status, "interview");
  assert.equal(app.currentRound, "TechnicalRound2");
});

test("upsertInterviewRoundsBatch can infer missing company in sequential round updates", async () => {
  const app: ApplicationForRoundUpsert = {
    id: "app-google-ml",
    company: "Google",
    role: "ML Engineer",
    rounds: [],
  };
  const apps = [app];

  const deps = {
    getApplications: () => apps,
    createRound: async (
      applicationId: string,
      data: {
        roundNumber: number;
        roundType: InterviewRoundType;
        scheduledDate: string;
        notes: string;
        questionsAsked: string[];
      }
    ) => {
      assert.equal(applicationId, app.id);
      app.rounds = [...(app.rounds ?? []), data];
    },
    updateRound: async () => {
      throw new Error("updateRound should not be called in this test");
    },
    updateApplication: async () => {
      // no-op
    },
  };

  const result = await upsertInterviewRoundsBatch(
    [
      {
        company: "Google",
        role: "ML Engineer",
        roundNumber: 1,
        scheduledDate: "14th feb 2026",
      },
      {
        roundNumber: 2,
        scheduledDate: "18th feb 2026",
      },
    ],
    deps
  );

  assert.equal(result.count, 2);
  assert.equal((app.rounds ?? []).length, 2);
  assert.deepEqual(
    (app.rounds ?? []).map((r) => r.roundNumber).sort((a, b) => a - b),
    [1, 2]
  );
});

test("upsertInterviewRoundsBatch resolves directly by applicationId", async () => {
  const app: ApplicationForRoundUpsert = {
    id: "app-direct-id",
    company: "OpenAI2",
    role: "RL Engineer",
    status: "applied",
    rounds: [],
  };
  const apps = [app];

  const deps = {
    getApplications: () => apps,
    createRound: async (
      applicationId: string,
      data: {
        roundNumber: number;
        roundType: InterviewRoundType;
        scheduledDate: string;
        notes: string;
        questionsAsked: string[];
      }
    ) => {
      assert.equal(applicationId, app.id);
      app.rounds = [...(app.rounds ?? []), data];
    },
    updateRound: async () => {
      throw new Error("updateRound should not be called in this test");
    },
    updateApplication: async () => {
      // no-op
    },
  };

  const result = await upsertInterviewRoundsBatch(
    [
      {
        applicationId: "app-direct-id",
        roundNumber: 1,
        scheduledDate: "25th feb 2026",
      },
    ],
    deps
  );

  assert.equal(result.count, 1);
  assert.equal((app.rounds ?? []).length, 1);
  assert.equal(app.rounds?.[0]?.roundNumber, 1);
});

test("upsertInterviewRoundsBatch prefers the interview card when company has duplicates", async () => {
  const appliedApp: ApplicationForRoundUpsert = {
    id: "app-openai2-applied",
    company: "OpenAI2",
    role: "RL Engineer",
    status: "applied",
    rounds: [],
  };
  const interviewApp: ApplicationForRoundUpsert = {
    id: "app-openai2-interview",
    company: "OpenAI2",
    role: "RL Engineer",
    status: "interview",
    rounds: [],
  };
  const apps = [appliedApp, interviewApp];

  const deps = {
    getApplications: () => apps,
    createRound: async (
      applicationId: string,
      data: {
        roundNumber: number;
        roundType: InterviewRoundType;
        scheduledDate: string;
        notes: string;
        questionsAsked: string[];
      }
    ) => {
      const target = apps.find((app) => app.id === applicationId);
      assert.ok(target, `Expected target application ${applicationId} to exist`);
      target.rounds = [...(target.rounds ?? []), data];
    },
    updateRound: async () => {
      throw new Error("updateRound should not be called in this test");
    },
    updateApplication: async () => {
      // no-op
    },
  };

  const result = await upsertInterviewRoundsBatch(
    [
      {
        company: "OpenAI2",
        roundNumber: 2,
        scheduledDate: "28th feb 2026",
      },
    ],
    deps
  );

  assert.equal(result.count, 1);
  assert.equal(appliedApp.rounds?.length ?? 0, 0);
  assert.equal(interviewApp.rounds?.length ?? 0, 1);
  assert.equal(interviewApp.rounds?.[0]?.roundNumber, 2);
});
