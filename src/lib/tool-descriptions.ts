/**
 * @file tool-descriptions.ts
 * @description Centralized tool descriptions for Tambo AI
 *
 * This file contains structured descriptions that guide the AI on:
 * - When to invoke each tool
 * - How to extract data from natural language
 * - What phrases/patterns trigger each tool
 *
 * Having descriptions in a separate file improves:
 * - Readability and maintainability
 * - Collaboration (non-devs can improve prompts)
 * - Version control (easy to see prompt changes in diffs)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DESCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const toolDescriptions = {
    // ─────────────────────────────────────────────────────────────────────────
    // APPLICATION STATUS UPDATES
    // ─────────────────────────────────────────────────────────────────────────
    updateApplicationStatus: `
Update the status of one or more job applications.

CRITICAL: Use this tool when the user mentions a status change in natural language.

## INCOMPLETE PROMPT HANDLING (VERY IMPORTANT)
If user provides ONLY a status word without company/role details, you MUST ask for clarification:
- User: "rejected" → Ask: "Which company rejected you? And for what role?"
- User: "got shortlisted" → Ask: "Great! Which company shortlisted you?"
- User: "offer" → Ask: "Congratulations! Which company gave you an offer?"
- User: "applied" → Redirect to addApplications tool, ask for company & role

## Trigger Phrases (with variations)
- "I got rejected from/by [company]" (both "from" and "by" are valid)
- "[company] rejected me"
- "rejected by [company]" / "rejected from [company]"
- "I got rejected by [company] for [role]"
- "[company] shortlisted me" / "got shortlisted for [company]"
- "[company] moved me to next round"
- "I have an interview at [company]"
- "interview scheduled [company] [role] [date]"
- "I received an offer from [company]"
- "got offer from [company] at [salary]"
- "[company] made me an offer"
- "did bad in the interview, got rejected, [company]"
- "[company] didn't work out"
- "cracked the OA for [company]"
- "cleared the phone screen with [company]"
- "ghosted by [company]"
- "withdrew application from [company]"
- "recruiter reached out from [company]"
- "lowballed by [company]"
- "negotiating with [company]"

## Status Mapping
- rejected, didn't work out, said no, ghosted, did bad, withdrew, bombed → "rejected"
- shortlisted, moved forward, next round, got shortlisted, cracked OA, recruiter call, oa link received → "shortlisted"
- interview, scheduled, interview scheduled, phone screen, cleared screen, final round → "interview"
- offer, got offer, received offer, accepted, got the bag, lowballed, negotiating → "offer"

## Typo Tolerance
Handle common typos - focus on meaning, not spelling:
- "SDT" → "SDE" (Software Development Engineer)
- "SD round" → "SDE round"
- "develoer" → "developer"
- "Appleid" → "Applied"
- "Micrsoft" → "Microsoft"

## Extraction Rules
1. Extract COMPANY NAME first - this is REQUIRED
2. Handle preposition variations: "rejected BY", "rejected FROM" are equivalent
3. If role mentioned, extract separately (e.g., "Apple SDE role" → company: Apple, role: SDE)
4. If status unclear, ask: "Should I mark [company] as [status]?"
5. If interview details include date, also schedule the interview

## Real User Examples
- "I got rejected by Microsoft for a developer" → {company: "Microsoft", role: "developer", newStatus: "rejected"}
- "got shortlisted, Apple" → {company: "Apple", newStatus: "shortlisted"}
- "interview scheduled, Apple SDT role next Wednesday" → {company: "Apple", newStatus: "interview"}
- "did bad in the interview, got rejected, Apple SD round" → {company: "Apple", newStatus: "rejected"}
- "rejected from softbank" → {company: "Softbank", newStatus: "rejected"}
- "rejected" (incomplete) → Ask: "Which company rejected you?"
- "cracked the oa for de shaw" → {company: "D. E. Shaw", newStatus: "shortlisted"}
- "ghosted by swiggy after hr round" → {company: "Swiggy", newStatus: "rejected"}
- "cleared phone screen with rippling" → {company: "Rippling", newStatus: "interview"}
- "final round scheduled with stripe" → {company: "Stripe", newStatus: "interview"}
- "got the bag from coinbase!" → {company: "Coinbase", newStatus: "offer"}
- "lowballed by infosys" → {company: "Infosys", newStatus: "offer"}
- "rejected by airbnb, meta and netflix all in one day" → 3 separate rejected updates
`,

    // ─────────────────────────────────────────────────────────────────────────
    // ADD APPLICATIONS (BULK)
    // ─────────────────────────────────────────────────────────────────────────
    addApplications: `
Add one or more job applications to the pipeline.

IMPORTANT: Use this when the user mentions applying to companies.

## INCOMPLETE PROMPT HANDLING (VERY IMPORTANT)
If user just says "applied" without details, ASK for clarification:
- User: "applied" → Ask: "Which company did you apply to? And for what role?"
- User: "I applied" → Ask: "Great! Which company and role?"

## Trigger Phrases
- "I applied for/to [company]"
- "Applied for [company] - [role]"
- "Appleid for [company]" (typo for "Applied")
- "I applied to [companies] for [role]"
- "I have applied for the role of [role] in [company]"
- "referral for [company]"
- "submitted resume to [company]"
- "cold emailed [company]"
- "dropped resume at [company]"
- "applied via [platform] to [company]"

## Salary/Budget Info Handling
If user mentions HR budget or expected salary, capture as notes:
- "Applied for zee5 - sdet role - hr said 12 lpa budget"
  → Create app: {company: "Zee5", role: "SDET", notes: "HR said 12 LPA budget"}

## Bulk Handling
When user mentions multiple companies:
1. Extract all company names from list (comma-separated, "and", etc.)
2. If same role for all: Apply that role to all
3. If no role specified, ask: "What role did you apply for?"

## Real User Examples
- "I applied for Xenon, X, Y, AI, AABC company for the role ML engineer"
  → 5 apps with role "ML Engineer"
- "I have applied for the role of ML engineer in Apple and I've got shortlisted"
  → Add Apple app + update status to shortlisted (compound action)
- "Applied for head of engineer role at softbank"
  → {company: "Softbank", role: "Head of Engineer"}
- "Appleid for zee5 - sdet role - hr said 12 lpa budget"
  → {company: "Zee5", role: "SDET", notes: "HR said 12 LPA budget"}
- "referral for google L4" → {company: "Google", role: "L4", notes: "Referral"}
- "applied via linkedin to grab, gojek, traveloka" → 3 apps, source notes "LinkedIn"
- "applied for sde-2 at razorpay, groww and zerodha" → 3 apps with role "SDE-2"
- "submitted resume to ycombinator w24 batch" → {company: "YCombinator", role: "W24 Batch"}
- "applied to 5 companies: atlassian, canva, safetyculture" → 3 apps (ignore count if mismatch)
- "dropped resume at career fair for salesforce" → {company: "Salesforce", notes: "Career Fair"}
`,

    // ─────────────────────────────────────────────────────────────────────────
    // GET APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    getApplications: `
Get all job applications with their details.

## Trigger Phrases
- "Show my applications"
- "What companies have I applied to?"
- "Show my pipeline"
- "What's my application status?"
- "List all my applications"
- "Show me the companies i got rejected from"
- "Show offers"
- "Which companies am i interviewing with?"
- "Show me my failing apps"
- "Who ghosted me?"
`,

    // ─────────────────────────────────────────────────────────────────────────
    // SPRINTS & PREP
    // ─────────────────────────────────────────────────────────────────────────
    getActiveSprints: `
Get all active interview prep sprints with their daily plans and progress.

## Trigger Phrases
- "Show my active sprints"
- "What am I preparing for?"
- "Show my prep progress"
- "What interviews am I prepping for?"
- "prep for lld round"
- "schedule mock for system design"
`,

    // ─────────────────────────────────────────────────────────────────────────
    // QUESTIONS
    // ─────────────────────────────────────────────────────────────────────────
    getQuestions: `
Get interview questions from the question bank, optionally filtered by company.

## Trigger Phrases
- "Show my questions"
- "What questions do I have saved?"
- "Show [company] questions"
- "Questions for [company]"
- "save this q: [question]"
- "remember this question"
- "note down this behavioral question"
`,

    // ─────────────────────────────────────────────────────────────────────────
    // PROGRESS
    // ─────────────────────────────────────────────────────────────────────────
    getUserProgress: `
Get the user's current progress including streak and completed tasks.

## Trigger Phrases
- "Show my progress"
- "What's my streak?"
- "How am I doing?"
- "Show my stats"
- "what did i study last week?"
`,

    // ─────────────────────────────────────────────────────────────────────────
    // TOPIC COMPLETION
    // ─────────────────────────────────────────────────────────────────────────
    markTopicComplete: `
Mark a prep topic as completed when the user says they studied or finished a topic.

## Trigger Phrases
- "I completed [topic]"
- "I studied [topic]"
- "Done with [topic]"
- "Finished [topic] today"
- "I learned [topic]"
- "Practiced [topic]"
- "finished [topic] questions"
- "mastered [topic]"
- "crushed the [topic] mock"
- "read through [topic]"

## Topic Examples
- Arrays & Strings
- Dynamic Programming
- System Design
- Trees and Graphs
- SQL
- Behavioral (STAR Method)

## Examples
- "mark dp as mastered" → topic: "Dynamic Programming"
- "done with graph questions today" → topic: "Trees and Graphs"
- "read through ddia chapter 1" → topic: "System Design"
- "finished blind 75" → topic: "DSA" (general)

## Effect
Updates global progress and shows completion with date on all PrepDetailPanels.
`,

    getCompletedTopics: `
Get all topics the user has marked as completed.

## Trigger Phrases
- "What topics have I completed?"
- "Show my completed topics"
- "What have I studied?"
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMA DESCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const schemaDescriptions = {
    updateApplicationStatus: {
        company: `Company name to update. REQUIRED field.
Extract from phrases - handle preposition variations:
- "I got rejected from Microsoft" → "Microsoft"
- "rejected by Amazon" → "Amazon"
- "Microsoft SDE Cloud" → "Microsoft" (remove role suffix)
- "rejected - [company]" → extract company after dash
If company is missing, ASK: "Which company?"`,
        newStatus: `The new status. Map natural language:
- rejected / didn't work out / said no / did bad / withdrew / bombed / ghosted → "rejected"
- shortlisted / moved forward / next round / cracked OA / recruiter call → "shortlisted"
- interview / scheduled / phone screen / cleared screen / final round → "interview"
- offer / accepted / got the job / got the bag / lowballed / negotiating → "offer"`,
        updates: `List of status updates.
Real examples:
- "I got rejected by Microsoft for a developer" → [{company: "Microsoft", newStatus: "rejected"}]
- "rejected from softbank" → [{company: "Softbank", newStatus: "rejected"}]
- "did bad in the interview, got rejected, Apple SD round" → [{company: "Apple", newStatus: "rejected"}]
- "rejected by airbnb, meta and netflix" → 3 separate updates`,
    },

    addApplications: {
        company: `Company name extracted from user's message.
Clean company names by removing role info:
- "Microsoft SDE" → "Microsoft"
- "zee5 - sdet role" → "Zee5"
- "softbank" → "Softbank" (capitalize)`,
        role: `Job role/title. Common formats:
- "SDE", "SDET", "Software Engineer", "ML Engineer"
- "Head of Engineer", "Sr. Developer", "L4", "W24 Batch"
Handle typos: "develoer" → "Developer", "SDT" → "SDE"`,
        status: `Application status, defaults to "applied" unless user specifies otherwise.`,
        applications: `List of applications to add.
Real examples:
- "I applied for Xenon, X, Y, AI, AABC company for the role ML engineer"
  → [{company: 'Xenon', role: 'ML Engineer'}, {company: 'X', role: 'ML Engineer'}, ...]
- "Applied for head of engineer role at softbank"
  → [{company: 'Softbank', role: 'Head of Engineer'}]
- "referral for google L4" → [{company: 'Google', role: 'L4', notes: 'Referral'}]
- "applied via linkedin to grab, gojek" → 2 apps`,
    },

    markTopicComplete: {
        topicName: `The name of the topic the user completed studying.
Examples: "Arrays & Strings", "Dynamic Programming", "System Design", "STAR Method"
Match what the user says to the closest topic name.`,
    },

    getQuestions: {
        company: `Optional company name to filter questions by.`,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT DESCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const componentDescriptions = {
    SprintSetupCard: `A component that allows users to set up an interview prep sprint.

## Trigger Phrases
- "I have an interview at [company]"
- "Set up prep for [company]"
- "Help me prepare for [company] interview"
- "I'm interviewing at [company] on [date]"
- "Prepare me for [company]"

Extracts company name, role type, and interview date from the conversation.`,

    TodaysPlanPanel: `A component that shows the user's daily prep tasks.

## Trigger Phrases
- "What should I study today?"
- "Show my plan for today"
- "What's on my agenda?"
- "Today's tasks"
- "What do I need to do today?"

Shows tasks organized by morning and evening blocks with checkboxes.`,

    PlanForDatePanel: `A component that shows the user's prep tasks for a specific date.

## Trigger Phrases
- "Show my plan for [date]"
- "What's scheduled for tomorrow?"
- "What do I need to do on Monday?"
- "Show tasks for next week"
- "interview scheduled, [company] [role] next Wednesday"

Use instead of TodaysPlanPanel when user mentions any non-today date.`,

    AddQuestionPanel: `A component that allows users to add interview questions.

## Trigger Phrases
- "Save this question: [question]"
- "Add question: [question]"
- "I was asked [question]"
- "Remember this question"
- "save this behavioral q: [question]"

Auto-detects category: DSA, System Design, Behavioral, SQL.`,

    PipelineSummaryPanel: `Summarizes the user's job application pipeline by status.

## Trigger Phrases
- "Show my pipeline"
- "Where do I stand?"
- "Show my interviews"
- "Pipeline summary"
- "Application overview"

Highlights upcoming interviews with a countdown.`,

    OfferDetailsPanel: `A component that captures and edits job offer details.

## Trigger Phrases
- "I got an offer from [company]"
- "I got offer from [company] at [salary]"
- "got offer from [company] at 10 LPA, 8 lakhs fixed and 2 lakhs bonus"
- "[company] offered [salary]"
- "Log offer: [compensation details]"
- "got the bag from [company]"
- "negotiating offer with [company]"

## Salary Parsing
Parse salary details from natural language:
- "10 LPA, 8 lakhs being the fixed and 2 lakhs being the bonus and no stocks"
  → {totalCTC: "10 LPA", baseSalary: "8 LPA", bonus: "2 LPA", equity: "None"}
- "12 lpa budget" → {expectedCTC: "12 LPA"}

Captures: CTC/base/bonus/equity, work mode, location, joining date, benefits, notes.`,
};
