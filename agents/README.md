# Blueprint Agents

This folder contains documentation, task history, and context for all AI agents working on the Blueprint Job Change project.

## Purpose

- Persistent record of agent tasks and decisions
- Onboarding context for new agents
- Task history and status tracking
- Skill definitions and capabilities
- Feature development workflow documentation

## 🚀 Quick Start: Requesting a New Feature

### For CEO (Niranjan)

1. **Use the feature template:**
   ```bash
   # Copy the template
   cp agents/FEATURE_REQUEST_TEMPLATE.md agents/features/my-new-feature.md
   
   # Fill it out and describe your feature
   ```

2. **Or simply tell me (Kimi Claw):**
   > "I want [feature description]"

3. **The agent swarm will then:**
   - PM Agent → Clarifies requirements
   - Tech Lead → Assesses feasibility  
   - CTO Agent → Designs architecture
   - Tech Lead → Implements with agent swarm
   - QA Agent → Tests everything
   - Tech Lead → Creates PR

4. **You'll get a PR to review**

See [WORKFLOW.md](./WORKFLOW.md) for the complete process.

## Agent Registry

| Agent | Role | Status | Last Active |
|-------|------|--------|-------------|
| [Marketing Agent](./marketing/README.md) | Content, growth, social media | Active | 2026-03-15 |
| [CTO Agent](./cto/README.md) | Backend, architecture, infrastructure | Active | 2026-03-15 |
| [Tech Lead Agent](./tech-lead/README.md) | Frontend, APIs, integrations | Active | 2026-03-15 |
| [QA Agent](./qa/README.md) | Testing, quality assurance | Active | 2026-03-15 |
| [PM Agent](./pm/README.md) | Product management, roadmap | Active | 2026-03-15 |

## Workflow Documentation

- [Feature Development Workflow](./WORKFLOW.md) - Complete 8-phase process
- [Feature Request Template](./FEATURE_REQUEST_TEMPLATE.md) - Use this to request features
- [Architecture Decisions](./decisions.md) - Why we built things this way

## How to Use This Folder

### For Agents
1. Read your agent's README before starting work
2. Check `tasks/` folder for pending tasks
3. Update task status when complete
4. Document decisions in `decisions.md`
5. Follow [WORKFLOW.md](./WORKFLOW.md) for feature development

### For Humans (CEO/Founders)
1. Review agent READMEs to understand capabilities
2. Create new tasks using [FEATURE_REQUEST_TEMPLATE.md](./FEATURE_REQUEST_TEMPLATE.md)
3. Check task status to track progress
4. Review `decisions.md` for context on past choices

## Task Status Legend

- 🟡 **Pending** - Not started
- 🔵 **In Progress** - Currently working
- 🟢 **Complete** - Done and verified
- 🔴 **Blocked** - Waiting on something

## Quick Links

- [Feature Request Template](./FEATURE_REQUEST_TEMPLATE.md) ← Start here for new features
- [Development Workflow](./WORKFLOW.md) ← How features get built
- [All Pending Tasks](./tasks/pending.md)
- [All Completed Tasks](./tasks/completed.md)
- [Architecture Decisions](./decisions.md)
- [Agent Spawn History](./spawn-history.md)
