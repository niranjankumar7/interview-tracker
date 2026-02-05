# Blueprint - Project Brief for Development

## 🎯 Project Overview

**Project Name:** Blueprint  
**Hackathon:** Tambo Hackathon (WeMakeDevs)  
**Target Users:** Students and early-career professionals preparing for technical interviews  
**Core Technology:** Tambo React SDK (Generative UI) + Modern Web Stack

---

## 💡 The Problem We're Solving

Students applying for jobs face these challenges:
1. **Disorganized tracking** - No central place to track applications, interviews, and prep work
2. **No structured prep plan** - They know what to study but not *when* or *how much*
3. **Last-minute cramming** - Without a timeline, students often panic-prep the day before
4. **Lost interview insights** - Questions asked in previous rounds are forgotten or scattered
5. **No accountability** - Easy to skip prep days without tracking progress

---

## ✨ Our Solution

A **Generative UI Blueprint for Job Change** that:
- Uses natural language to create interview prep sprints
- Auto-generates time-boxed study plans based on interview date
- Tracks applications through a Kanban pipeline
- Maintains a question bank for each company
- Shows daily progress and streaks to maintain consistency

**Key Innovation:** Instead of manually clicking through forms, users **describe their interview situation in plain English**, and the AI generates the right UI components and prep plan automatically.

---

## 🏗️ Core Features (MVP Scope)

### Feature 1: Generative UI Chat Interface (MUST HAVE)
**What it does:**
- User types natural language commands like:
  - "I have an interview at Google next Thursday for SDE role"
  - "Add question: explain database indexing"
  - "Show me my prep plan for tomorrow"
- Tambo SDK interprets intent and renders appropriate UI components

**Technical Implementation:**
- Use Tambo React SDK for natural language → component mapping
- Parse user intent to extract: company, role, date, action type
- Dynamically render components based on parsed intent

---

### Feature 2: Interview Sprint Generator (MUST HAVE)
**What it does:**
- When user sets an interview date, auto-generate a structured prep plan
- Plan adapts based on days remaining and role type

**Sprint Structure Example (7 days before interview):**
```
Day 7-5: DSA Focus (60-90 min blocks)
  - Core patterns (arrays, strings, trees)
  - 2-3 problems per day
  - Timed practice

Day 4-2: System Design Focus (60-90 min blocks)
  - 1 design problem per day
  - Key concepts (caching, load balancing, databases)
  - Scalability patterns

Day 1: Final Review Day
  - Review weak topics
  - Go through company-specific questions
  - 1-2 mock interviews
```

**Technical Implementation:**
- Sprint templates based on role type (SDE/QA/Data/PM)
- Template selects topics based on:
  - Days remaining (7+ days vs 3 days vs 1 day)
  - Role requirements
- Each day has 2-3 "blocks" with specific tasks

**Data Model:**
```javascript
Sprint {
  id: string
  companyId: string
  interviewDate: date
  roleType: 'SDE' | 'QA' | 'Data' | 'PM'
  daysRemaining: number
  dailyPlans: [
    {
      day: number,
      focus: 'DSA' | 'SystemDesign' | 'Behavioral' | 'Review',
      blocks: [
        {
          duration: '60-90min',
          tasks: ['Solve 2 array problems', 'Review recursion pattern'],
          completed: boolean
        }
      ]
    }
  ]
}
```

---

### Feature 3: Application Pipeline (Kanban Board) (MUST HAVE)
**What it does:**
- Visual board to track application status
- Columns: Applied → Shortlisted → Interview Scheduled → Offer/Rejected
- Each card = one application (company + role)

**Card Details View:**
When user clicks a card, show:
- Company name + role + application date
- Interview rounds (Round 1, Round 2, HR)
- Prep plan status (if interview scheduled)
- Notes section
- Job description link
- Questions asked (linked to question bank)

**Technical Implementation:**
- Drag-and-drop Kanban (use react-beautiful-dnd or similar)
- Modal/side panel for card details
- Status updates trigger sprint generation if moved to "Interview Scheduled"

**Data Model:**
```javascript
Application {
  id: string
  company: string
  role: string
  status: 'applied' | 'shortlisted' | 'interview' | 'offer' | 'rejected'
  applicationDate: date
  interviewDate: date | null
  rounds: [
    {
      roundNumber: number,
      roundType: 'Technical' | 'HR' | 'Managerial',
      date: date,
      notes: string,
      questionsAsked: [questionId]
    }
  ],
  jobDescriptionUrl: string,
  notes: string
}
```

---

### Feature 4: Daily Plan View (MUST HAVE)
**What it does:**
- Shows "Today's Tasks" for active sprints
- Countdown to interview ("Interview in 6 days")
- Progress tracking (blocks completed today)
- Streak counter

**UI Layout:**
```
┌─────────────────────────────────────┐
│ 🎯 Google SDE Interview in 6 days   │
│ Today's Target: 2 blocks ✅□         │
└─────────────────────────────────────┘

Today's Plan - Day 2/7 (DSA Focus)
┌─────────────────────────────────────┐
│ Morning Block (60-90 min)           │
│ □ Solve: Two Sum problem            │
│ □ Solve: Valid Parentheses          │
│ □ Review: Hash Map pattern          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Evening Block (60-90 min)           │
│ □ Solve: Merge Intervals            │
│ □ Practice: Binary Search variant   │
└─────────────────────────────────────┘

Streak: 🔥 3 days
```

**Technical Implementation:**
- Filter today's tasks from active sprints
- Allow check/uncheck for task completion
- Update streak when all blocks completed
- Store completion in localStorage or backend

---

### Feature 5: Question Bank (SHOULD HAVE)
**What it does:**
- Repository of questions asked in interviews (per company)
- Users can add questions manually
- Filter by company, topic, or difficulty

**How users add questions:**
- Via chat: "Add question: reverse a linked list for Google"
- Via card detail view: quick add button
- Parse and tag automatically (DSA, System Design, Behavioral)

**Technical Implementation:**
- Simple CRUD for questions
- Auto-tagging based on keywords:
  - DSA: "array", "tree", "graph", "sort"
  - System Design: "design", "scale", "API", "database"
  - Behavioral: "tell me about", "situation", "conflict"
- Display in filterable list or table

**Data Model:**
```javascript
Question {
  id: string
  companyId: string
  questionText: string
  category: 'DSA' | 'SystemDesign' | 'Behavioral' | 'SQL' | 'Other'
  difficulty: 'Easy' | 'Medium' | 'Hard'
  askedInRound: string
  dateAdded: date
  userNotes: string
}
```

---

### Feature 6: Simple Analytics Dashboard (NICE TO HAVE)
**What it does:**
- Show progress overview:
  - Applications sent this month
  - Interviews scheduled
  - Current streak
  - Weak topics (based on failed tasks)
  - Success rate

**Keep it simple:**
- 3-4 key metrics with simple charts
- No complex ML or analysis

---

## 🎨 User Experience Flow

### Primary Flow: Creating Interview Sprint
```
1. User opens app
   ↓
2. User types: "I have an interview at OpenAI next Thursday for SDE"
   ↓
3. Tambo SDK parses → creates Application card in "Interview Scheduled"
   ↓
4. System calculates days remaining (7 days)
   ↓
5. Tambo renders "Sprint Setup" component
   ↓
6. User confirms role type (SDE selected by default)
   ↓
7. System generates 7-day plan with daily blocks
   ↓
8. Tambo renders "Your Sprint" view showing timeline
   ↓
9. User sees "Today's Plan" with first day tasks
```

### Secondary Flow: Adding Questions
```
1. User types: "Add question: explain ACID properties"
   ↓
2. Tambo renders "Add Question" component
   ↓
3. System auto-detects: category = SQL/Database
   ↓
4. Question added to current company's question bank
   ↓
5. Success confirmation shown
```

### Daily Use Flow:
```
1. User opens app
   ↓
2. Dashboard shows: "Interview in 5 days" + Today's tasks
   ↓
3. User completes morning block tasks (checks them off)
   ↓
4. Progress updates, encouragement shown
   ↓
5. Evening: user completes remaining tasks
   ↓
6. Day marked complete, streak increments 🔥
```

---

## 🛠️ Technical Stack

### Required (Hackathon Mandate):
- **Tambo React SDK** - For generative UI components
- **React 18+** - Frontend framework
- **TypeScript** - Type safety (recommended)

### Recommended:
- **State Management:** Zustand or Redux Toolkit
- **Styling:** Tailwind CSS (fast, utility-first)
- **Drag & Drop:** react-beautiful-dnd (for Kanban)
- **Date Handling:** date-fns or Day.js
- **Forms:** React Hook Form
- **Data Persistence:** 
  - **Quick MVP:** localStorage + JSON
  - **Better:** Firebase/Supabase for real-time sync
- **Deployment:** Vercel or Netlify

---

## 📊 Data Architecture

### Core Entities:

```typescript
// Application (the main entity)
interface Application {
  id: string;
  userId: string;
  company: string;
  role: string;
  status: 'applied' | 'shortlisted' | 'interview' | 'offer' | 'rejected';
  applicationDate: Date;
  interviewDate?: Date;
  rounds: InterviewRound[];
  jobDescriptionUrl?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interview Round
interface InterviewRound {
  roundNumber: number;
  roundType: 'Technical' | 'HR' | 'Managerial' | 'Assignment';
  scheduledDate?: Date;
  completedDate?: Date;
  notes: string;
  questionsAsked: string[]; // question IDs
}

// Sprint (generated when interview is scheduled)
interface Sprint {
  id: string;
  applicationId: string;
  interviewDate: Date;
  roleType: 'SDE' | 'QA' | 'Data' | 'PM';
  createdDate: Date;
  totalDays: number;
  dailyPlans: DailyPlan[];
  status: 'active' | 'completed' | 'expired';
}

// Daily Plan
interface DailyPlan {
  day: number; // day 1, 2, 3...
  date: Date;
  focus: 'DSA' | 'SystemDesign' | 'Behavioral' | 'Review' | 'Mock';
  blocks: Block[];
  completed: boolean;
}

// Block (a study/prep session)
interface Block {
  id: string;
  type: 'morning' | 'evening' | 'quick';
  duration: string; // "60-90min"
  tasks: Task[];
  completed: boolean;
}

// Task
interface Task {
  id: string;
  description: string;
  completed: boolean;
  category: string; // "Arrays", "System Design", etc.
}

// Question Bank
interface Question {
  id: string;
  companyId: string;
  questionText: string;
  category: 'DSA' | 'SystemDesign' | 'Behavioral' | 'SQL' | 'Other';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topic?: string; // "Arrays", "Trees", "Caching", etc.
  askedInRound?: string;
  userNotes?: string;
  dateAdded: Date;
}

// User Progress
interface UserProgress {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  totalTasksCompleted: number;
  totalBlocksCompleted: number;
}
```

---

## 🎯 Sprint Template Logic

### Template Selection Rules:
```javascript
function generateSprintTemplate(roleType, daysRemaining) {
  
  // SDE Role Templates
  if (roleType === 'SDE') {
    if (daysRemaining >= 7) {
      return {
        days: [
          { day: 1-3, focus: 'DSA', topics: ['Arrays', 'Strings', 'Hash Maps'] },
          { day: 4-6, focus: 'SystemDesign', topics: ['Caching', 'Databases', 'APIs'] },
          { day: 7, focus: 'Review', topics: ['Mock Interview', 'Company Questions'] }
        ]
      }
    } else if (daysRemaining >= 3) {
      return {
        days: [
          { day: 1-2, focus: 'DSA', topics: ['Top patterns only'] },
          { day: 3, focus: 'Review', topics: ['Mock + Company Questions'] }
        ]
      }
    } else {
      return {
        days: [
          { day: 1, focus: 'Review', topics: ['Company Questions', 'Quick Revision'] }
        ]
      }
    }
  }
  
  // QA Role Templates
  if (roleType === 'QA') {
    if (daysRemaining >= 7) {
      return {
        days: [
          { day: 1-3, focus: 'Testing Concepts', topics: ['Test Cases', 'Automation Basics'] },
          { day: 4-6, focus: 'Tools & Frameworks', topics: ['Selenium', 'API Testing'] },
          { day: 7, focus: 'Review', topics: ['Mock Scenarios', 'Bug Reports'] }
        ]
      }
    }
    // ... more QA templates
  }
  
  // Add more role templates (Data, PM, etc.)
}
```

### Daily Task Generation:
```javascript
function generateDailyTasks(focus, topics) {
  const taskTemplates = {
    DSA: [
      'Solve 2 problems on {topic}',
      'Review pattern: {topic}',
      'Practice timed problems (30 min)'
    ],
    SystemDesign: [
      'Study concept: {topic}',
      'Design 1 small system using {topic}',
      'Watch 1 system design video'
    ],
    Review: [
      'Review all weak topics',
      'Go through company question bank',
      'Complete 1-2 mock interviews'
    ]
  };
  
  // Generate tasks by filling templates with topics
  return taskTemplates[focus].map(template => 
    template.replace('{topic}', topics[0]) // simplified
  );
}
```

---

## 🎨 UI Components Structure

### Component Hierarchy:
```
App
├── ChatInterface (Tambo SDK)
│   ├── MessageList
│   └── InputBar
├── Dashboard
│   ├── ActiveSprints
│   │   └── SprintCountdown
│   ├── TodaysPlan
│   │   └── BlockCard
│   │       └── TaskCheckbox
│   └── StreakDisplay
├── KanbanBoard
│   ├── Column (Applied, Shortlisted, etc.)
│   │   └── ApplicationCard
│   │       └── CardDetailModal
│   │           ├── RoundsList
│   │           ├── NotesSection
│   │           └── QuestionsList
├── SprintView
│   ├── Timeline
│   ├── DailyPlanCard
│   └── ProgressBar
└── QuestionBank
    ├── FilterBar
    ├── QuestionList
    └── AddQuestionForm
```

---

## 🚀 Development Phases

### Phase 1: Core Setup (Day 1)
- [ ] Initialize React + TypeScript project
- [ ] Install and configure Tambo SDK
- [ ] Set up Tailwind CSS
- [ ] Create basic routing structure
- [ ] Set up state management (Zustand/Redux)
- [ ] Create data models and mock data

### Phase 2: Chat Interface (Day 1-2)
- [ ] Integrate Tambo SDK chat component
- [ ] Create intent parsing logic
- [ ] Implement basic command handlers:
  - "Add interview at {company} on {date} for {role}"
  - "Show my interviews"
  - "Add question: {question text}"
- [ ] Test natural language understanding

### Phase 3: Application Pipeline (Day 2-3)
- [ ] Build Kanban board UI
- [ ] Implement drag-and-drop functionality
- [ ] Create application card component
- [ ] Build card detail modal
- [ ] Add CRUD operations for applications

### Phase 4: Sprint Generator (Day 3-4)
- [ ] Implement sprint template logic
- [ ] Build sprint creation workflow
- [ ] Create daily plan generator
- [ ] Design sprint timeline UI
- [ ] Link sprints to applications

### Phase 5: Daily Plan View (Day 4-5)
- [ ] Build "Today's Plan" dashboard
- [ ] Implement task completion tracking
- [ ] Add countdown timers
- [ ] Create progress indicators
- [ ] Implement streak logic

### Phase 6: Question Bank (Day 5-6)
- [ ] Build question CRUD interface
- [ ] Implement auto-categorization
- [ ] Add filtering and search
- [ ] Link questions to companies
- [ ] Create question display in card details

### Phase 7: Polish & Demo Prep (Day 6-7)
- [ ] Add animations and transitions
- [ ] Improve responsive design
- [ ] Add loading states and error handling
- [ ] Create demo data and scenarios
- [ ] Practice demo presentation
- [ ] Deploy to production

---

## 🎭 Demo Script (For Hackathon Presentation)

### Hook (30 seconds):
"Imagine getting an interview call from your dream company. You have 7 days. Do you know exactly what to study each day? Most students don't. They panic, cram, and hope for the best. We built a better way."

### Demo (3-4 minutes):

**Act 1: The Problem (30 sec)**
"Meet Rahul. He's applied to 15 companies. He's tracking them in a messy spreadsheet. He just got an interview call from Google—but he has no idea how to prepare systematically."

**Act 2: The Solution (2 min)**
*[Screen: Chat interface]*

"Rahul opens our app and types:"
```
"I have an interview at Google next Thursday for SDE role"
```

*[Tambo generates Sprint Setup component]*

"The AI understands his intent. It creates an application card and asks him to confirm the details."

*[Shows generated 7-day sprint timeline]*

"Now watch this—it auto-generates a 7-day prep sprint:
- Days 1-3: DSA fundamentals
- Days 4-6: System design
- Day 7: Final review and mocks"

*[Navigate to Today's Plan view]*

"Every morning, Rahul sees exactly what to do today. Two focused study blocks. Specific topics. Clear tasks."

*[Show task completion + streak]*

"He checks off tasks. His streak grows. The system keeps him accountable."

**Act 3: The Value (1 min)**

*[Show question bank]*

"After the interview, Rahul adds questions he was asked:"
```
"Add question: design URL shortener"
```

"Now this knowledge lives in his question bank. Next time he applies to Google, he'll have real interview questions ready."

*[Show Kanban board with multiple companies]*

"And he's not just tracking Google. He can see all his applications in one place. Applied. Shortlisted. Interview. Offer."

**Closing (30 sec):**
"This isn't just a tracker. It's a system that transforms chaotic interview prep into a structured sprint. Built with Tambo's generative UI, so students spend less time clicking and more time preparing."

---

## ✅ Success Metrics (What Makes This a Winner)

### Judging Criteria Alignment:

1. **Best Use Case of Tambo (30% weight)**
   - ✅ Heavy use of generative UI for intent-based interactions
   - ✅ Multiple component types rendered based on natural language
   - ✅ Demonstrates Tambo's value clearly

2. **Technical Implementation + UX (30% weight)**
   - ✅ Clean, professional UI
   - ✅ Smooth interactions and animations
   - ✅ Mobile-responsive design
   - ✅ Good state management and data flow

3. **Problem Solving + Innovation (25% weight)**
   - ✅ Solves a real, relatable student problem
   - ✅ Unique approach (sprint-based prep vs just tracking)
   - ✅ Thoughtful UX (daily plans, streaks, accountability)

4. **Presentation Quality (15% weight)**
   - ✅ Clear demo script
   - ✅ Relatable story (Rahul's journey)
   - ✅ Shows before/after value
   - ✅ Professional delivery

---

## 🚨 Common Pitfalls to Avoid

1. **Over-engineering**
   - Don't build a complex ML model for question categorization
   - Don't create 50 different sprint templates
   - Don't add features users won't see in demo

2. **Under-using Tambo**
   - Don't make it just a React app with Tambo slapped on
   - Use Tambo for core interactions, not just one feature
   - Show multiple component types being generated

3. **Poor demo preparation**
   - Don't wing the demo
   - Don't use real messy data
   - Don't skip the "why this matters" story

4. **Scope creep**
   - Don't add Gmail integration (privacy nightmare)
   - Don't build complex analytics
   - Don't create a mobile app version

---

## 📝 Final Checklist Before Submission

- [ ] All core features working end-to-end
- [ ] Tambo SDK properly integrated (no errors)
- [ ] Demo data loaded and tested
- [ ] UI is responsive (mobile + desktop)
- [ ] No console errors or warnings
- [ ] Deployed and accessible via URL
- [ ] Demo script practiced (under 5 min)
- [ ] README with setup instructions
- [ ] Screenshots/video for submission
- [ ] Team member roles documented

---

## 🎯 Post-Hackathon Roadmap (If You Want to Build This for Real)

### Version 2.0 Features:
- Google Calendar integration (read-only)
- Community question bank (shared across users)
- AI-powered question recommendations
- Mock interview scheduler
- Resume analyzer (weak topic detection)
- Interview feedback tracking
- Analytics dashboard
- Mobile app (React Native)

### Monetization Ideas:
- Premium templates for top companies
- 1-on-1 mock interview marketplace
- Company-specific prep guides
- Interview buddy matching

---

## 💬 Communication with Coding Agent

When you send this to Claude (or another coding agent), start with:

```
I'm building an Interview Prep Tracker for the Tambo Hackathon. 

Please read this complete project brief document carefully. 

After reading, please:
1. Confirm you understand the project scope
2. Suggest the optimal tech stack
3. Create a detailed file structure
4. Help me set up the initial project
5. Guide me through building this phase by phase

Let's start with Phase 1: Core Setup. Please help me initialize the project.
```

Then work iteratively, completing one phase at a time.

---

**This brief is your north star. Keep it open while coding. Refer back when you get stuck or scope-creep tempts you. Good luck! 🚀**
