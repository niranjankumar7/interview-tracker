# Architecture Decisions

This file records significant architectural decisions made by agents.

## Database

### Decision: Use Neon PostgreSQL (Serverless)
**Date:** 2026-03-15
**Decision Maker:** CTO Agent
**Context:** Needed scalable, cost-effective database for India market
**Options Considered:**
- Supabase (used initially but migrated away)
- Neon PostgreSQL (chosen)
- Self-hosted PostgreSQL

**Decision:** Neon PostgreSQL
**Rationale:**
- Serverless pricing aligns with bootstrap constraints
- Good Vercel integration
- Automatic scaling
- India region support

**Consequences:**
- Need to manage connection pooling
- Migration required from Supabase

## Authentication

### Decision: NextAuth.js v5 (Beta)
**Date:** 2026-03-15
**Decision Maker:** CTO Agent
**Rationale:**
- Built-in OAuth providers (Google, GitHub)
- Good Next.js integration
- Session management included

## Payments

### Decision: Razorpay for India
**Date:** 2026-03-15
**Decision Maker:** CTO Agent
**Rationale:**
- Best local payment experience in India
- Supports UPI, cards, net banking
- Local compliance
- Developer-friendly API

## Frontend

### Decision: Pipeline as Landing Page
**Date:** 2026-03-15
**Decision Maker:** Tech Lead Agent + PM Agent
**Rationale:**
- Users see immediate value (kanban board)
- Better than chat-first approach
- Differentiates from competitors

### Decision: Floating Chat Widget
**Date:** 2026-03-15
**Decision Maker:** Tech Lead Agent
**Rationale:**
- AI help accessible from any page
- Doesn't dominate the experience
- Natural UX pattern

## Product

### Decision: 5-Card Limit Per Prompt
**Date:** 2026-03-15
**Decision Maker:** PM Agent
**Rationale:**
- Prevents abuse
- Maintains UX quality
- Sufficient for batch entry (average user applies to 3-5 jobs at once)

### Decision: Freemium with Hard Limits
**Date:** 2026-03-15
**Decision Maker:** PM Agent
**Rationale:**
- Free: 5 applications (enough to try product)
- Pro: ₹499/month unlimited
- Premium: ₹999/month + coaching
- Drives conversion while managing costs

## Multi-Card Creation

### Decision: Parse Multiple Formats
**Date:** 2026-03-15
**Decision Maker:** Tech Lead Agent
**Supported Formats:**
- Comma-separated: "Google, Amazon, Microsoft"
- Numbered lists: "1. Google - SWE"
- Natural language with roles
- Shared role: "Applied to X, Y, Z as SDE"

**Rationale:** Users shouldn't have to learn a specific format

## Chrome Extension

### Decision: Manifest V3 with Content Scripts
**Date:** 2026-03-15
**Decision Maker:** Tech Lead Agent
**Rationale:**
- Modern Chrome extension standard
- Better performance
- Required for Chrome Web Store submission

---

*New decisions should be added with date, decision maker, context, and rationale.*
