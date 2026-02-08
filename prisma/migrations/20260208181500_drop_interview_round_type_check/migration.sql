-- Allow flexible round labels (e.g. "First Round", "Round 3") to match API behavior.
ALTER TABLE "InterviewRound"
DROP CONSTRAINT IF EXISTS "InterviewRound_roundType_check";
