# Blueprint Agents

This folder contains documentation, task history, and context for all AI agents working on the Blueprint Job Change project.

## Purpose

- Persistent record of agent tasks and decisions
- Onboarding context for new agents
- Task history and status tracking
- Skill definitions and capabilities

## Agent Registry

| Agent | Role | Status | Last Active |
|-------|------|--------|-------------|
| [Marketing Agent](./marketing/README.md) | Content, growth, social media | Active | 2026-03-15 |
| [CTO Agent](./cto/README.md) | Backend, architecture, infrastructure | Active | 2026-03-15 |
| [Tech Lead Agent](./tech-lead/README.md) | Frontend, APIs, integrations | Active | 2026-03-15 |
| [QA Agent](./qa/README.md) | Testing, quality assurance | Active | 2026-03-15 |
| [PM Agent](./pm/README.md) | Product management, roadmap | Active | 2026-03-15 |

## How to Use This Folder

### For Agents
1. Read your agent's README before starting work
2. Check `tasks/` folder for pending tasks
3. Update task status when complete
4. Document decisions in `decisions.md`

### For Humans (CEO/Founders)
1. Review agent READMEs to understand capabilities
2. Create new tasks in appropriate `tasks/` folder
3. Check task status to track progress
4. Review `decisions.md` for context on past choices

## Task Status Legend

- 🟡 **Pending** - Not started
- 🔵 **In Progress** - Currently working
- 🟢 **Complete** - Done and verified
- 🔴 **Blocked** - Waiting on something

## Quick Links

- [All Pending Tasks](./tasks/pending.md)
- [All Completed Tasks](./tasks/completed.md)
- [Architecture Decisions](./decisions.md)
- [Agent Spawn History](./spawn-history.md)
