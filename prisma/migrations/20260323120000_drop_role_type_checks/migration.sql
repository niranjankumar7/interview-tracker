-- Allow custom role labels for applications and sprints.
ALTER TABLE "Application"
DROP CONSTRAINT IF EXISTS "Application_roleType_check";

ALTER TABLE "Sprint"
DROP CONSTRAINT IF EXISTS "Sprint_roleType_check";
