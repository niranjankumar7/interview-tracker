import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRoundUpdatesInput,
  normalizeStatusUpdatesInput,
} from "@/lib/tool-input-normalizers";

test("normalizeStatusUpdatesInput accepts alternate status payload keys", () => {
  const updates = normalizeStatusUpdatesInput({
    companyName: "MistralAI",
    status: "Interview",
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.company, "MistralAI");
  assert.equal(updates[0]?.newStatus, "interview");
});

test("normalizeStatusUpdatesInput accepts application id aliases", () => {
  const updates = normalizeStatusUpdatesInput({
    updates: [
      {
        application_id: "fd4338ab-688b-4351-a83e-c8d608683c64",
        state: "shortlisted",
      },
    ],
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.applicationId, "fd4338ab-688b-4351-a83e-c8d608683c64");
  assert.equal(updates[0]?.newStatus, "shortlisted");
});

test("normalizeRoundUpdatesInput accepts alternate round/date keys", () => {
  const updates = normalizeRoundUpdatesInput({
    companyName: "MistralAI",
    round: "2nd round",
    date: "28th feb 2026",
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.company, "MistralAI");
  assert.equal(updates[0]?.roundNumber, 2);
  assert.equal(updates[0]?.roundType, "TechnicalRound2");
  assert.equal(updates[0]?.scheduledDate, "28th feb 2026");
});

test("normalizeRoundUpdatesInput accepts application id + scheduled_on format", () => {
  const updates = normalizeRoundUpdatesInput({
    updates: [
      {
        appId: "fd4338ab-688b-4351-a83e-c8d608683c64",
        roundNumber: "1",
        scheduled_on: "2026-02-25",
      },
    ],
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.applicationId, "fd4338ab-688b-4351-a83e-c8d608683c64");
  assert.equal(updates[0]?.roundNumber, 1);
  assert.equal(updates[0]?.scheduledDate, "2026-02-25");
});
