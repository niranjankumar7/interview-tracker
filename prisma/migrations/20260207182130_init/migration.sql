-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "targetRole" TEXT,
    "experienceLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "jobDescriptionUrl" TEXT,
    "roleType" TEXT,
    "status" TEXT NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "interviewDate" TIMESTAMP(3),
    "currentRound" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offerBaseSalary" DOUBLE PRECISION,
    "offerEquity" TEXT,
    "offerBonus" DOUBLE PRECISION,
    "offerCurrency" TEXT,
    "offerLocation" TEXT,
    "offerWorkMode" TEXT,
    "offerJoiningDate" TIMESTAMP(3),
    "offerNoticePeriod" TEXT,
    "offerBenefits" TEXT[],
    "offerNotes" TEXT,
    "offerTotalCTC" DOUBLE PRECISION,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewRound" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "roundType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "questionsAsked" TEXT[],
    "feedbackRating" INTEGER,
    "feedbackPros" TEXT[],
    "feedbackCons" TEXT[],
    "feedbackStruggledTopics" TEXT[],
    "feedbackNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewDate" TIMESTAMP(3) NOT NULL,
    "roleType" TEXT NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "dailyPlans" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "questionText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT,
    "askedInRound" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "totalTasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "studyRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "calendarAutoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "leetcodeAutoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CompletedTopic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "displayName" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "CompletedTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeetCodeConnection" (
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),
    "readOnly" BOOLEAN NOT NULL DEFAULT true,
    "currentStreak" INTEGER,
    "longestStreak" INTEGER,
    "lastActiveDate" TIMESTAMP(3),
    "totalSolved" INTEGER,
    "easySolved" INTEGER,
    "mediumSolved" INTEGER,
    "hardSolved" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeetCodeConnection_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_interviewDate_idx" ON "Application"("interviewDate");

-- CreateIndex
CREATE INDEX "InterviewRound_applicationId_idx" ON "InterviewRound"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewRound_applicationId_roundNumber_key" ON "InterviewRound"("applicationId", "roundNumber");

-- CreateIndex
CREATE INDEX "Sprint_userId_idx" ON "Sprint"("userId");

-- CreateIndex
CREATE INDEX "Sprint_applicationId_idx" ON "Sprint"("applicationId");

-- CreateIndex
CREATE INDEX "Sprint_status_idx" ON "Sprint"("status");

-- CreateIndex
CREATE INDEX "Sprint_interviewDate_idx" ON "Sprint"("interviewDate");

-- CreateIndex
CREATE INDEX "Question_userId_idx" ON "Question"("userId");

-- CreateIndex
CREATE INDEX "Question_applicationId_idx" ON "Question"("applicationId");

-- CreateIndex
CREATE INDEX "Question_category_idx" ON "Question"("category");

-- CreateIndex
CREATE INDEX "CompletedTopic_userId_idx" ON "CompletedTopic"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletedTopic_userId_topicName_key" ON "CompletedTopic"("userId", "topicName");

-- AddCheckConstraints
ALTER TABLE "User"
    ADD CONSTRAINT "User_experienceLevel_check"
    CHECK ("experienceLevel" IS NULL OR "experienceLevel" IN ('Junior', 'Mid', 'Senior'));

ALTER TABLE "Application"
    ADD CONSTRAINT "Application_status_check"
    CHECK ("status" IN ('applied', 'shortlisted', 'interview', 'offer', 'rejected'));

ALTER TABLE "Application"
    ADD CONSTRAINT "Application_roleType_check"
    CHECK ("roleType" IS NULL OR "roleType" IN ('SDE', 'SDET', 'ML', 'DevOps', 'Frontend', 'Backend', 'FullStack', 'Data', 'PM', 'MobileEngineer'));

ALTER TABLE "Application"
    ADD CONSTRAINT "Application_offerWorkMode_check"
    CHECK ("offerWorkMode" IS NULL OR "offerWorkMode" IN ('WFH', 'Hybrid', 'Office'));

ALTER TABLE "InterviewRound"
    ADD CONSTRAINT "InterviewRound_roundType_check"
    CHECK ("roundType" IN ('HR', 'TechnicalRound1', 'TechnicalRound2', 'SystemDesign', 'Managerial', 'Assignment', 'Final'));

ALTER TABLE "Sprint"
    ADD CONSTRAINT "Sprint_status_check"
    CHECK ("status" IN ('active', 'completed', 'expired'));

ALTER TABLE "Sprint"
    ADD CONSTRAINT "Sprint_roleType_check"
    CHECK ("roleType" IN ('SDE', 'SDET', 'ML', 'DevOps', 'Frontend', 'Backend', 'FullStack', 'Data', 'PM', 'MobileEngineer'));

ALTER TABLE "Question"
    ADD CONSTRAINT "Question_category_check"
    CHECK ("category" IN ('DSA', 'SystemDesign', 'Behavioral', 'SQL', 'Other'));

ALTER TABLE "Question"
    ADD CONSTRAINT "Question_difficulty_check"
    CHECK ("difficulty" IS NULL OR "difficulty" IN ('Easy', 'Medium', 'Hard'));

ALTER TABLE "UserPreferences"
    ADD CONSTRAINT "UserPreferences_theme_check"
    CHECK ("theme" IN ('light', 'dark', 'system'));

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewRound" ADD CONSTRAINT "InterviewRound_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedTopic" ADD CONSTRAINT "CompletedTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeetCodeConnection" ADD CONSTRAINT "LeetCodeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
