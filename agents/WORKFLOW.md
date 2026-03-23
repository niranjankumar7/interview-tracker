# Feature Development Workflow

This document describes the complete feature development lifecycle using the agent swarm.

## Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│     CEO     │────▶│  PM Agent   │────▶│ Tech Lead   │
│  (Request)  │     │  (Requirements)   │  │ (Feasibility)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  QA Agent   │◀────│ Tech Lead   │◀────│    CTO      │
│   (Test)    │     │ (Implement) │     │ (Architect) │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       ▼ (Bugs found?)
┌─────────────┐
│  Tech Lead  │
│   (Fix)     │
└──────┬──────┘
       │
       ▼ (No bugs)
┌─────────────┐
│  Tech Lead  │
│ (Update +   │
│    PR)      │
└─────────────┘
```

## Workflow Steps

### Phase 1: Requirements (PM Agent)
**Trigger:** CEO describes a new feature

**PM Agent Responsibilities:**
- [ ] Clarify feature requirements with CEO if needed
- [ ] Define user stories
- [ ] Identify edge cases
- [ ] Define success criteria
- [ ] Prioritize (P0/P1/P2)
- [ ] Document in `agents/tasks/pending.md`

**Output:** Feature specification document

---

### Phase 2: Technical Feasibility (Tech Lead Agent)
**Trigger:** PM requirements ready

**Tech Lead Agent Responsibilities:**
- [ ] Review requirements
- [ ] Assess technical complexity
- [ ] Identify dependencies
- [ ] Estimate effort
- [ ] Flag any blockers
- [ ] Suggest implementation approach

**Output:** Technical feasibility report

---

### Phase 3: Architecture (CTO Agent)
**Trigger:** Feasibility confirmed

**CTO Agent Responsibilities:**
- [ ] Design system architecture
- [ ] Define API contracts
- [ ] Plan database changes
- [ ] Identify integration points
- [ ] Security considerations
- [ ] Performance implications
- [ ] Create architecture document in `agents/decisions.md`

**Output:** Architecture specification + decision record

---

### Phase 4: Implementation (Tech Lead + Agent Swarm)
**Trigger:** Architecture approved

**Tech Lead Agent Responsibilities:**
- [ ] Spawn specialized agents for sub-tasks
- [ ] Assign tasks to agents:
  - Frontend agent - UI components
  - Backend agent - API routes
  - Integration agent - Third-party services
- [ ] Coordinate between agents
- [ ] Review agent outputs
- [ ] Integrate components
- [ ] Update `agents/tasks/completed.md`

**Agent Swarm Structure:**
```
Tech Lead (Coordinator)
├── Frontend Agent → UI components, pages
├── Backend Agent → API routes, DB changes
└── Integration Agent → Third-party APIs
```

**Output:** Working feature in feature branch

---

### Phase 5: Status Update (Tech Lead)
**Trigger:** Implementation complete

**Tech Lead Agent Responsibilities:**
- [ ] Update status in agent README
- [ ] Document what was built
- [ ] Note any deviations from architecture
- [ ] Prepare for QA handoff
- [ ] Update `agents/tasks/pending.md` → `completed.md`

**Output:** Status update + handoff document

---

### Phase 6: Testing (QA Agent)
**Trigger:** Tech Lead status update

**QA Agent Responsibilities:**
- [ ] Understand feature requirements
- [ ] Review implementation (code + architecture)
- [ ] Design test cases
- [ ] Execute tests:
  - [ ] Happy path tests
  - [ ] Edge case tests
  - [ ] Limit tests
  - [ ] Security tests
- [ ] Document bugs with severity
- [ ] Create test report

**Output:** QA test report with pass/fail status

---

### Phase 7: Bug Fixes (Tech Lead)
**Trigger:** QA report with bugs

**Tech Lead Agent Responsibilities:**
- [ ] Review QA report
- [ ] Prioritize bugs (Critical/High/Medium/Low)
- [ ] Fix critical and high bugs
- [ ] Re-test fixed bugs
- [ ] Update QA agent on fixes
- [ ] Request re-test if needed

**Output:** Fixed code + verification

---

### Phase 8: Pull Request (Tech Lead)
**Trigger:** QA approves (no critical/high bugs)

**Tech Lead Agent Responsibilities:**
- [ ] Create feature branch
- [ ] Commit all changes with clear messages
- [ ] Push to origin
- [ ] Create PR with:
  - Feature description
  - Architecture summary
  - Test results
  - Screenshots (if UI)
- [ ] Update agent documentation
- [ ] Mark task complete

**Output:** Pull request ready for CEO review

---

## Communication Protocol

### Between Agents
1. **Async updates** via documentation
2. **Blockers** escalated immediately to Tech Lead
3. **Questions** routed through Tech Lead coordinator

### Agent → CEO
1. **Status updates** at phase completion
2. **Decisions** documented in `agents/decisions.md`
3. **PRs** submitted for final approval

### CEO → Agent
1. **Feature requests** via feature template
2. **Feedback** on PRs
3. **Priority changes** via task updates

---

## Feature Request Template

When CEO wants a new feature, use this format:

```markdown
## Feature Request

### Title
[Short, descriptive title]

### Description
[What should this feature do?]

### User Story
As a [user type], I want [feature] so that [benefit]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Priority
[P0/P1/P2]

### Context
[Any additional context, screenshots, examples]

### Related
- Links to related features
- Dependencies
```

---

## Example Workflow

### Feature: "Dark Mode Toggle"

**Step 1 - CEO Request:**
```
I want users to be able to toggle between light and dark mode.
Should remember their preference.
```

**Step 2 - PM Agent:**
- Clarifies: Should it follow system preference by default?
- User story: "As a user, I want dark mode so I can use the app at night comfortably"
- Edge cases: What about existing users? Should persist across sessions?
- Priority: P1 (nice to have, not critical)

**Step 3 - Tech Lead:**
- Feasibility: ✅ Easy, Next.js has built-in dark mode support
- Approach: Use next-themes, add toggle in settings
- Dependencies: None
- Effort: 1 day

**Step 4 - CTO:**
- Architecture: Store preference in localStorage, sync with theme provider
- API changes: None
- DB changes: Add `theme` to UserPreferences table
- Security: No concerns

**Step 5 - Tech Lead spawns agents:**
- Frontend Agent: Create theme toggle component, update settings page
- Backend Agent: Add theme field to preferences API

**Step 6 - Status Update:**
"Dark mode implementation complete. Toggle in settings, persists preference, follows system default initially."

**Step 7 - QA Agent:**
- Tests: Toggle works, persists after refresh, respects system pref
- Bugs: None found

**Step 8 - PR Created:**
PR #X: Dark mode toggle with all changes documented

---

## Task Tracking

All tasks tracked in:
- `agents/tasks/pending.md` - Not started
- `agents/tasks/completed.md` - Done

Update these files at each phase transition.

---

## Escalation Paths

| Issue | Escalate To |
|-------|-------------|
| Architecture conflict | CTO Agent |
| Scope creep | PM Agent + CEO |
| Technical blocker | Tech Lead → CTO |
| Timeline slip | CEO |
| Bug dispute | QA + Tech Lead |

---

*This workflow ensures consistent, high-quality feature development using the agent swarm.*
