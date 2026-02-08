/**
* Centralized AI guidance strings for Tambo tools/components.
*/

type ToolDescriptionKey =
  | "updateApplicationStatus"
  | "upsertInterviewRounds"
  | "addApplications"
  | "getApplications"
  | "getApplicationStatus"
  | "getActiveSprints"
  | "getQuestions"
  | "getUserProgress"
  | "markTopicComplete"
  | "getCompletedTopics";

// Only include tools here where we actually wire field-level `.describe(...)` strings.
// Tools with empty or trivial input schemas don't need entries.
type SchemaDescriptions = {
  updateApplicationStatus: {
    applicationId: string;
    company: string;
    newStatus: string;
    updates: string;
  };
  upsertInterviewRounds: {
    applicationId: string;
    company: string;
    role: string;
    roundType: string;
    roundNumber: string;
    scheduledDate: string;
    notes: string;
    updates: string;
  };
  addApplications: {
    company: string;
    role: string;
    status: string;
    notes: string;
    applicationDate: string;
    applications: string;
  };
  getApplicationStatus: {
    company: string;
  };
  markTopicComplete: {
    topicName: string;
  };
  getQuestions: {
    company: string;
  };
};

type ComponentDescriptionKey =
  | "SprintSetupCard"
  | "TodaysPlanPanel"
  | "PlanForDatePanel"
  | "AddQuestionPanel"
  | "PipelineSummaryPanel"
  | "OfferDetailsPanel";

export const toolDescriptions = {
  updateApplicationStatus: `
Update the status of one or more job applications.

CRITICAL: Use this tool when the user mentions a status change in natural language.
Prefer applicationId when available; use company name otherwise.

## INCOMPLETE PROMPT HANDLING (VERY IMPORTANT)
If the user provides ONLY a status word without a company name, you MUST ask for clarification:
- User: "rejected" → Ask: "Which company rejected you?"
- User: "got shortlisted" → Ask: "Which company shortlisted you?"
- User: "offer" → Ask: "Which company gave you an offer?"
- User: "applied" → Redirect to addApplications tool; ask for company & role

## DUPLICATE COMPANY HANDLING
If multiple applications exist for the same company (different roles), ask for clarification:
- "Which role at [company] should I update? You have: [role1], [role2]"

## Trigger Phrases (with variations)
- "I got rejected from/by [company]" (both "from" and "by" are valid)
- "[company] rejected me"
- "rejected by [company]" / "rejected from [company]"
- "I got rejected by [company] for [role]"
- "[company] shortlisted me" / "got shortlisted for [company]"
- "[company] moved me to next round"
- "I have an interview at [company]"
- "interview scheduled [company] [role] [date]" (date is optional; ignore it for this tool call)
- "I received an offer from [company]"
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
- offer, got offer, received offer, accepted, got the bag → "offer"

## Typo Tolerance
Handle common typos - focus on meaning, not spelling:
- "SDT" → "SDE" (Software Development Engineer)
- "SD round" → "SDE round"
- "develoer" → "developer"
- "Appleid" → "Applied"
- "Micrsoft" → "Microsoft"

## Extraction Rules
1. If applicationId is available, use it first.
2. Otherwise extract COMPANY NAME.
3. Handle preposition variations: "rejected BY" and "rejected FROM" are equivalent.
4. If a role is mentioned, ignore it for this tool call (this tool only updates status).
5. If status is unclear, ask: "Should I mark [company] as [status]?"

## Real User Examples
- "I got rejected by Microsoft for a developer" → {company: "Microsoft", newStatus: "rejected"}
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
`.trim(),

  upsertInterviewRounds: `
Add or update interview rounds on an existing application (e.g., Tech 1, Tech 2 with dates).

IMPORTANT:
- Use this for prompts like "set tech 1 on Feb 14 and tech 2 on Feb 18".
- Prefer applicationId if known; otherwise use company/role matching.
- Prefer updating the existing company/role application instead of creating a new card.
- If company has multiple roles and role is not specified, ask for clarification.

## Trigger Phrases
- "Add round 2 for [company]"
- "Set tech 1 date to [date]"
- "Tech 2 on [date] for [company]"
- "Add another interview round for [company]"
- "Update interview dates for [company]"

## Round Labels
- Round names are user/company specific. Keep the label from user intent when available
  (examples: "Tech Screen", "Manager Round", "Bar Raiser", "HR").
- If roundType is missing but roundNumber exists, the system will use a neutral label like "Round 3".
`.trim(),

  addApplications: `
Add one or more job applications to the pipeline.

IMPORTANT: Use this when the user mentions applying to companies.

## INCOMPLETE PROMPT HANDLING (VERY IMPORTANT)
If the user just says "applied" without details, ASK for clarification:
- User: "applied" → Ask: "Which company did you apply to? And for what role?"
- User: "I applied" → Ask: "Which company and role?"

## DUPLICATE COMPANY HANDLING
If user is adding a company that already exists in the pipeline:
- Ask: "You already have an application at [company]. Are you applying for a different role, or is this a duplicate?"
- If different role, proceed with adding the new application
- If duplicate, skip and inform user

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

## Notes Handling
If the user mentions additional context (salary expectations, HR budget, source like LinkedIn, referral), capture it in the optional "notes" field.
If the user mentions when they applied (e.g., "yesterday", "on Jan 5"), capture that in "applicationDate" instead of burying it only in notes.

Example:
- "Applied for zee5 - sdet role - hr said 12 lpa budget"
  → {company: "Zee5", role: "SDET", notes: "HR said 12 LPA budget"}

## Bulk Handling
When the user mentions multiple companies:
1. Extract all company names from the list (comma-separated, "and", etc.)
2. If the same role applies to all: apply that role to all
3. If no role is specified, ask: "What role did you apply for?"

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
- "applied via linkedin to grab, gojek, traveloka"
  → 3 apps with notes "Applied via LinkedIn"
- "applied for sde-2 at razorpay, groww and zerodha" → 3 apps with role "SDE-2"
- "submitted resume to ycombinator w24 batch" → {company: "YCombinator", role: "W24 Batch"}
- "applied to 5 companies: atlassian, canva, safetyculture" → 3 apps (ignore count if mismatch)
- "dropped resume at career fair for salesforce" → {company: "Salesforce", notes: "Career Fair"}
`.trim(),

  getApplications: `
Get all job applications with their details.

IMPORTANT: Use this for broad, multi-company pipeline views.
If the user asks about ONE specific company (e.g., "Where do I stand with Microsoft?"),
use getApplicationStatus instead of this tool.

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
`.trim(),

  getApplicationStatus: `
Get the current status for a single company application.

IMPORTANT: Use this for company-specific questions and respond concisely.
Do NOT open PipelineSummaryPanel for these.

## Trigger Phrases
- "Where do I stand with [company]?"
- "What's my status with [company]?"
- "Any update on [company]?"
- "What happened with [company]?"
- "Did [company] move me forward?"

## Response Style
- Return a short direct answer first (status + role).
- If multiple roles exist at the same company, list each role + status.
- If not found, clearly say no application exists for that company.
`.trim(),

  getActiveSprints: `
Get all active interview prep sprints with their daily plans and progress.

## Trigger Phrases
- "Show my active sprints"
- "What am I preparing for?"
- "Show my prep progress"
- "What interviews am I prepping for?"
- "prep for lld round"
- "schedule mock for system design"
`.trim(),

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
`.trim(),

  getUserProgress: `
Get the user's current progress including streak and completed tasks.

## Trigger Phrases
- "Show my progress"
- "What's my streak?"
- "How am I doing?"
- "Show my stats"
- "what did i study last week?"
`.trim(),

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
`.trim(),

  getCompletedTopics: `
Get all topics the user has marked as completed.

## Trigger Phrases
- "What topics have I completed?"
- "Show my completed topics"
- "What have I studied?"
`.trim(),
} satisfies Record<ToolDescriptionKey, string>;

export const schemaDescriptions = {
  updateApplicationStatus: {
    company: `
Company name to update. Optional if applicationId is provided.

Extract from phrases (handle preposition variations):
- "I got rejected from Microsoft" → "Microsoft"
- "rejected by Amazon" → "Amazon"
- "Microsoft SDE Cloud" → "Microsoft" (remove role suffix)
- "rejected - [company]" → extract company after dash

Prefer applicationId when available; use company otherwise.
`.trim(),
    applicationId: `
Optional application id for precise updates when company matching is ambiguous.
Example: "fd4338ab-688b-4351-a83e-c8d608683c64"
`.trim(),
    newStatus: `
The new status. Map natural language:
- rejected / didn't work out / said no / did bad / withdrew / bombed / ghosted → "rejected"
- shortlisted / moved forward / next round / cracked OA / recruiter call → "shortlisted"
- interview / scheduled / phone screen / cleared screen / final round → "interview"
- offer / accepted / got the job / got the bag / lowballed / negotiating → "offer"
`.trim(),
    updates: `
List of status updates.

Real examples:
- "I got rejected by Microsoft for a developer" → [{company: "Microsoft", newStatus: "rejected"}]
- "rejected from softbank" → [{company: "Softbank", newStatus: "rejected"}]
- "did bad in the interview, got rejected, Apple SD round" → [{company: "Apple", newStatus: "rejected"}]
- "rejected by airbnb, meta and netflix" → 3 separate updates
- "Set status to interview for application fd4338ab-688b-4351-a83e-c8d608683c64"
  → [{applicationId:"fd4338ab-688b-4351-a83e-c8d608683c64", newStatus:"interview"}]
`.trim(),
  },

  upsertInterviewRounds: {
    applicationId: `
Optional application id for exact targeting. Prefer this if known.
Example: "fd4338ab-688b-4351-a83e-c8d608683c64"
`.trim(),
    company: `
Company name whose interview round should be updated. Optional if applicationId is provided.
Example: "Google"
`.trim(),
    role: `
Optional role to disambiguate when a company has multiple applications.
Example: "ML Engineer"
`.trim(),
    roundType: `
Optional interview round type.
Use free text from the user when possible (examples: "Tech Screen", "Manager Round", "HR").
`.trim(),
    roundNumber: `
Optional round number. If provided without roundType, the round can still be tracked as "Round N".
`.trim(),
    scheduledDate: `
Interview round date. Accept natural language or ISO date.
Examples: "Feb 18, 2026", "2026-02-18", "next Wednesday"
`.trim(),
    notes: `
Optional note for the round.
Example: "Tech Round 2"
`.trim(),
    updates: `
List of round updates.

Examples:
- "Google ML engineer tech 1 on Feb 14 and tech 2 on Feb 18"
  -> [{company:"Google", role:"ML Engineer", roundNumber:1, scheduledDate:"2026-02-14"},
      {company:"Google", role:"ML Engineer", roundNumber:2, scheduledDate:"2026-02-18"}]
- "Add another round for Meta PM on Feb 20"
  -> [{company:"Meta", role:"PM", scheduledDate:"2026-02-20"}]
- "Round 1 on Feb 25 for app fd4338ab-688b-4351-a83e-c8d608683c64"
  -> [{applicationId:"fd4338ab-688b-4351-a83e-c8d608683c64", roundNumber:1, scheduledDate:"2026-02-25"}]
`.trim(),
  },

  addApplications: {
    company: `
Company name extracted from the user's message.

Clean company names by removing role info:
- "Microsoft SDE" → "Microsoft"
- "zee5 - sdet role" → "Zee5"
- "softbank" → "Softbank" (capitalize)
`.trim(),
    role: `
Job role/title. Common formats:
- "SDE", "SDET", "Software Engineer", "ML Engineer"
- "Head of Engineer", "Sr. Developer", "L4", "W24 Batch"

IMPORTANT: If a role applies to multiple companies, include it here for EACH company.

Handle typos:
- "develoer" → "Developer"
- "SDT" → "SDE"
`.trim(),
    status: `Application status. Defaults to "applied" unless the user specifies otherwise.`,
    notes: `
Optional free-text notes. Use for context like salary/budget, referral/source, etc.

Examples:
- "HR said 12 LPA budget"
- "Applied via LinkedIn"
- "Referral"
`.trim(),
    applicationDate: `
Optional application date. Use this when the user specifies when they applied.

Examples:
- "I applied yesterday" → "yesterday"
- "applied on 2026-02-07" → "2026-02-07"
- "submitted my resume on next friday" → "next friday"
`.trim(),
    applications: `
List of applications to add.

## CRITICAL: SHARED ROLES
If the user specifies a single role for multiple companies (e.g., "applied to X, Y, Z for ML Engineer"), you MUST generate an object for EACH company and include the "role": "ML Engineer" in EVERY object. Do NOT leave the role empty.

Real examples:
- "I applied for Xenon, X, Y, AI, AABC company for the role ML engineer"
  → [{company: "Xenon", role: "ML Engineer"}, {company: "X", role: "ML Engineer"}, ...]
- "Applied for head of engineer role at softbank"
  → [{company: "Softbank", role: "Head of Engineer"}]
- "referral for google L4" → [{company: "Google", role: "L4", notes: "Referral"}]
- "applied via linkedin to grab, gojek" → 2 apps with notes "Applied via LinkedIn"
- "I applied for google , microsfot, openai, anthropic for ml engineer role"
  → [{company: "Google", role: "ML Engineer"}, {company: "Microsoft", role: "ML Engineer"}, {company: "OpenAI", role: "ML Engineer"}, {company: "Anthropic", role: "ML Engineer"}]
`.trim(),
  },

  markTopicComplete: {
    topicName: `
The name of the topic the user completed studying.

Examples: "Arrays & Strings", "Dynamic Programming", "System Design", "STAR Method".
Match what the user says to the closest topic name.
`.trim(),
  },

  getQuestions: {
    company: `Optional company name to filter questions by.`.trim(),
  },
  getApplicationStatus: {
    company: `
Company name to check status for.

Examples:
- "Where do I stand with Microsoft?" → "Microsoft"
- "Any updates on OpenAI?" → "OpenAI"
- "status for google" → "Google"
`.trim(),
  },
} satisfies SchemaDescriptions;

export const componentDescriptions = {
  SprintSetupCard: `
A component that allows users to set up an interview prep sprint.

## Trigger Phrases
- "I have an interview at [company]"
- "Set up prep for [company]"
- "Help me prepare for [company] interview"
- "I'm interviewing at [company] on [date]"
- "Prepare me for [company]"

Extracts company name, role type, and interview date from the conversation.
`.trim(),

  TodaysPlanPanel: `
A component that shows the user's daily prep tasks.

## Trigger Phrases
- "What should I study today?"
- "Show my plan for today"
- "What's on my agenda?"
- "Today's tasks"
- "What do I need to do today?"

Shows tasks organized by morning and evening blocks with checkboxes.
`.trim(),

  PlanForDatePanel: `
A component that shows the user's prep tasks for a specific date.

## Trigger Phrases
- "Show my plan for [date]"
- "What's scheduled for tomorrow?"
- "What do I need to do on Monday?"
- "Show tasks for next week"
- "interview scheduled, [company] [role] next Wednesday"

Use instead of TodaysPlanPanel when user mentions any non-today date.
`.trim(),

  AddQuestionPanel: `
A component that allows users to add interview questions.

## Trigger Phrases
- "Save this question: [question]"
- "Add question: [question]"
- "I was asked [question]"
- "Remember this question"
- "save this behavioral q: [question]"

Auto-detects category: DSA, System Design, Behavioral, SQL.
`.trim(),

  PipelineSummaryPanel: `
Summarizes the user's job application pipeline by status.

IMPORTANT: Use only for explicit pipeline-summary requests.
Do NOT use for single-company status questions like:
- "Where do I stand with Microsoft?"
- "What's my status with Google?"

## Trigger Phrases
- "Show my pipeline"
- "Show my interviews"
- "Pipeline summary"
- "Application overview"
- "Show full pipeline table"
- "Give me the full status breakdown"

Highlights upcoming interviews with a countdown.
`.trim(),

  OfferDetailsPanel: `
A component that captures and edits job offer details.

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

Captures: CTC/base/bonus/equity, work mode, location, joining date, benefits, notes.
`.trim(),
} satisfies Record<ComponentDescriptionKey, string>;
