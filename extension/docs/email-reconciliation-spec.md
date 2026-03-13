# Email Reconciliation Feature Specification

> **Status:** Draft  
> **Last Updated:** 2025-03-14  
> **Author:** Interview Tracker Product Team  
> **Priority:** P1 - Core Feature Roadmap

---

## 1. Problem Statement

### Current State
The Interview Tracker extension successfully captures the initial job application when users apply through supported platforms (LinkedIn, Greenhouse, Lever, etc.). However, **status updates occur outside the extension's visibility**:

| Stage | Source | Current Handling |
|-------|--------|------------------|
| Application Submitted | Extension popup | ✅ Auto-captured |
| Application Acknowledged | Email | ❌ Manual entry |
| Interview Scheduled | Email | ❌ Manual entry |
| Interview Completed | User memory | ❌ Manual entry |
| Rejection | Email | ❌ Manual entry |
| Offer Received | Email | ❌ Manual entry |

### Pain Points
1. **Context Switching:** Users must manually check emails and update tracker
2. **Data Loss:** Updates forgotten, tracker becomes stale
3. **Time Waste:** 2-5 minutes per update × 20-50 applications = hours of work
4. **Inconsistent Data:** No single source of truth for application status

### Target Outcome
Enable seamless status updates via email parsing, reducing manual work while respecting user privacy and control.

---

## 2. Proposed Solutions

### Option A: Gmail API Integration (Full Automation)

**Architecture:**
```
User's Gmail → Gmail API (readonly) → Our Backend → ML/Regex Parser → Suggested Updates → User Confirmation
```

**Technical Requirements:**
- OAuth 2.0 flow with `gmail.readonly` scope
- Background sync job (every 15-30 minutes)
- Query: `from:(greenhouse OR lever OR workday OR icims) subject:(interview OR application OR status OR offer OR rejection)`
- Content parsing with regex patterns + optional ML classification

**Pros:**
| Benefit | Detail |
|---------|--------|
| Fully Automatic | Zero user action required after setup |
| Comprehensive | Captures all job-related emails |
| Real-time | Updates appear within minutes of email arrival |
| Scalable | One setup, works for all future applications |

**Cons:**
| Concern | Detail |
|---------|--------|
| Privacy Concerns | Users may hesitate to grant email access |
| Permission Fatigue | Additional OAuth scope to approve |
| API Quotas | Gmail API has daily limits (1B quota units) |
| Complexity | Requires robust parsing, error handling, edge cases |
| Security Surface | Email access is high-privilege, requires strong security |

**Effort Estimate:** 6-8 weeks (2 engineers)

---

### Option B: Forward-to-Process (User-Initiated)

**Architecture:**
```
User receives email → Forwards to update+user123@interview-tracker.app → Backend parses → Creates suggestion → User confirms in UI
```

**Technical Requirements:**
- Unique forwarding address per user (`update+{userId}@interview-tracker.app`)
- Email ingestion service (SES + Lambda/Cloud Function)
- Parser service (simpler than Option A - full email content available)
- In-app notification system for new suggestions

**Pros:**
| Benefit | Detail |
|---------|--------|
| User Control | User decides which emails to process |
| Simpler Parsing | Full email content, structured headers available |
| Privacy Respect | Only forwarded emails are accessed |
| No API Quotas | Self-hosted ingestion, no third-party limits |
| Works Everywhere | Any email provider, not just Gmail |

**Cons:**
| Concern | Detail |
|---------|--------|
| Manual Step | User must remember to forward emails |
| Forwarding Setup | One-time setup of forwarding rules helps but adds complexity |
| Latency | Depends on user action, not automatic |
| User Education | Must teach users the forwarding workflow |

**Effort Estimate:** 4-5 weeks (2 engineers)

---

### Option C: Email Import UI (Copy-Paste)

**Architecture:**
```
User copies email content → Pastes into extension/web UI → Client-side parser extracts data → Preview → User confirms
```

**Technical Requirements:**
- Textarea input component in popup and/or web dashboard
- Client-side parsing engine (regex-based, no backend needed for Phase 1)
- Preview card showing extracted: Company, Position, New Status, Date, Next Steps
- Edit/Confirm UI for corrections

**Pros:**
| Benefit | Detail |
|---------|--------|
| Zero Permissions | No email access, no OAuth, no forwarding |
| Immediate Value | Can ship in days, not weeks |
| Total Transparency | User sees exactly what will be parsed |
| Works Offline | Parser runs locally, syncs when online |
| Privacy First | No email content leaves user's device until confirmed |

**Cons:**
| Concern | Detail |
|---------|--------|
| Manual Effort | User must copy-paste each email |
| Tedious at Scale | Becomes painful with 20+ applications |
| No Automation | Forgets to update = stale data |

**Effort Estimate:** 1-2 weeks (1 engineer)

---

## 3. Recommendation: Phased Approach

### Phase 1: Email Import UI (Q2 2025)
**Goal:** Deliver immediate value with minimal complexity

**Scope:**
- Paste parsing UI in extension popup
- Regex-based parser for common patterns
- Support for 5 major ATS systems (Greenhouse, Lever, Workday, ICIMS, SmartRecruiters)
- Basic preview and confirmation flow

**Success Metrics:**
- 70% of pasted emails correctly parsed
- <30 seconds from paste to confirmed update
- User satisfaction >4.0/5.0

---

### Phase 2: Forward-to-Process (Q3 2025)
**Goal:** Reduce friction for power users

**Scope:**
- Unique forwarding addresses per user
- Email ingestion pipeline
- In-app notification system
- Auto-link to existing applications by company/position
- Bulk confirmation UI for multiple updates

**Success Metrics:**
- 30% of active users enable forwarding
- 50% reduction in manual copy-paste actions
- Parser accuracy >85%

---

### Phase 3: Gmail API Integration (Q4 2025)
**Goal:** Full automation for users who want it

**Scope:**
- Optional Gmail OAuth integration
- Background sync with smart filtering
- ML-based classification for ambiguous emails
- Privacy dashboard showing what was accessed

**Gating Criteria (proceed only if):**
- Phase 2 shows strong user demand (>50% would use automation)
- Privacy concerns addressed (clear data retention policy)
- Engineering capacity available

---

## 4. Email Parsing Rules

### 4.1 Status Classification Matrix

| Status | Keywords/Patterns | Confidence Score |
|--------|------------------|------------------|
| **Applied** | "application received", "thank you for applying", "we received your application" | High |
| **Phone Screen** | "phone screen", "initial conversation", "recruiter call scheduled" | High |
| **Technical Interview** | "technical interview", "coding interview", "system design" | High |
| **On-site/Panel** | "on-site", "interview day", "meet the team", "final round" | High |
| **Offer** | "offer letter", "pleased to offer", "congratulations on your offer" | High |
| **Rejected** | "move forward with other candidates", "not moving forward", "decided to proceed" | High |
| **Withdrawn** | "withdraw your application", "position cancelled", "requisition closed" | Medium |
| **On Hold** | "position on hold", "hiring freeze", "paused", "delayed" | Medium |

### 4.2 ATS-Specific Patterns

#### Greenhouse
```regex
Subject: (Interview|Application) (Update|Confirmation|Scheduled) - (.+)
From: .*@greenhouse\.io
Body: (Congratulations|Your interview is scheduled|We regret to inform)
```

**Extracted Fields:**
- Company: From email domain or body
- Position: From subject line or body header
- Interview Type: "Phone Screen", "Technical", "On-site"
- Date/Time: `\d{1,2}:\d{2} (AM|PM).*\w+ \d{1,2},? \d{4}`
- Zoom Link: `https://\w+\.zoom\.us/j/\d+`

#### Lever
```regex
Subject: (Interview|Update) (at|from) (.+) - (.+)
From: .*@lever\.co
```

**Extracted Fields:**
- Similar to Greenhouse
- Often includes interviewer names
- Calendar invite usually attached

#### Workday
```regex
Subject: (Status Update|Interview Invitation|Application Acknowledgment)
From: .*@myworkday\.com|.*@.*\.workday\.com
```

**Challenges:**
- Generic email format
- Often requires login to see details
- Lower parsing accuracy, may need user confirmation

#### Generic Corporate
```regex
Subject: (Re: )?(Interview|Application|Offer|Status).*?(with|at|from) (.+)
From: (careers|jobs|hiring|recruiting|hr)@.*
```

### 4.3 Date Extraction Patterns

| Pattern | Regex Example | Example Match |
|---------|--------------|---------------|
| Full Date | `\w+day,? \w+ \d{1,2},? \d{4}` | "Monday, March 15, 2025" |
| Short Date | `\d{1,2}/\d{1,2}/\d{4}` | "03/15/2025" |
| ISO Date | `\d{4}-\d{2}-\d{2}` | "2025-03-15" |
| Time + Date | `\d{1,2}:\d{2}.*\d{1,2}/\d{1,2}` | "2:30 PM on 3/15" |
| Relative | `(tomorrow|next \w+day|in \d+ days)` | "tomorrow" |

### 4.4 Confidence Scoring

Each parsed result gets a confidence score (0-100):

```javascript
function calculateConfidence(extracted) {
  let score = 50; // Base score
  
  // +20 for exact company match in existing applications
  if (companyExists(extracted.company)) score += 20;
  
  // +15 for exact status keyword match
  if (isKnownStatusKeyword(extracted.status)) score += 15;
  
  // +10 for date found
  if (extracted.date) score += 10;
  
  // +5 for position match
  if (positionSimilarity(extracted.position) > 0.8) score += 5;
  
  // -20 if multiple companies detected (ambiguous)
  if (extracted.companies.length > 1) score -= 20;
  
  return Math.min(100, Math.max(0, score));
}
```

**Confidence Thresholds:**
- **90-100:** Auto-apply (with notification)
- **70-89:** Show preview, one-click confirm
- **50-69:** Show preview, require review
- **<50:** Show raw text, manual entry suggested

---

## 5. UI/UX Specifications

### 5.1 Extension Popup - Paste Interface

```
┌─────────────────────────────────────────┐
│  📧 Email Import                    [X] │
├─────────────────────────────────────────┤
│                                         │
│  Paste email content below:             │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  [Textarea for email content]   │   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [      Parse Email Content       ]     │
│                                         │
└─────────────────────────────────────────┘
```

### 5.2 Preview Card (After Parsing)

```
┌─────────────────────────────────────────┐
│  ✅ Preview (85% confidence)        [X] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🏢 Company:    Stripe          │   │
│  │ 💼 Position:   Senior Engineer │   │
│  │ 📊 Status:  →  Technical Interview │
│  │ 📅 Date:       Mar 20, 2025    │   │
│  │ 🔗 Details:    Zoom link available│  │
│  └─────────────────────────────────┘   │
│                                         │
│  [   ✓ Confirm & Save   ] [  ✏️ Edit  ] │
│                                         │
│  [  ✕ Ignore - Not Related  ]           │
│                                         │
└─────────────────────────────────────────┘
```

### 5.3 Edit Mode

```
┌─────────────────────────────────────────┐
│  ✏️ Edit Extraction                 [X] │
├─────────────────────────────────────────┤
│                                         │
│  Company:   [Stripe           ] [🔍]   │
│  Position:  [Senior Engineer  ] [🔍]   │
│  Status:    [Technical Interview ▼]    │
│             - Applied                  │
│             - Phone Screen             │
│             - Technical Interview ✓    │
│             - On-site                  │
│             - Offer                    │
│             - Rejected                 │
│  Date:      [2025-03-20       ] 📅     │
│  Notes:     [Zoom: link...    ]        │
│                                         │
│  [        ✓ Save Update          ]     │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4 Web Dashboard - Bulk Processing

For Phase 2/3, a dedicated page at `/dashboard/email-imports`:

```
┌──────────────────────────────────────────────────────────────┐
│  📧 Pending Email Updates                            [⚙️]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [All] [High Confidence] [Needs Review] [Processed]          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✅  Stripe - Senior Engineer        92%    [Review]  │   │
│  │     Status: Technical Interview on Mar 20            │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ⚠️  Unknown Company                 45%    [Review]  │   │
│  │     Could not parse company name                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ✅  Meta - Product Manager          88%    [Review]  │   │
│  │     Status: Rejected                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [  Confirm All High Confidence (2)  ]  [  Ignore All  ]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.5 Settings - Email Integration

```
┌─────────────────────────────────────────┐
│  ⚙️ Email Integration Settings          │
├─────────────────────────────────────────┤
│                                         │
│  Current Method: Copy & Paste           │
│                                         │
│  Upgrade Options:                       │
│  ┌─────────────────────────────────┐   │
│  │ ⬜ Forward-to-Process (Phase 2) │   │
│  │   Your address: update+abc123@..│   │
│  │                                 │   │
│  │ ⬜ Gmail Auto-Sync (Phase 3)    │   │
│  │   [Connect Gmail]               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────      │
│  Auto-confirm threshold: [85% ▼]        │
│  Notify on new updates: ☑️               │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Implementation Roadmap

### Phase 1: Copy-Paste Import (Q2 2025)

**Timeline: 4-6 weeks**

| Week | Task | Owner | Deliverable |
|------|------|-------|-------------|
| 1 | Parser engine MVP | Backend | Regex parser with 5 ATS patterns |
| 1-2 | UI components | Frontend | Paste textarea, preview card |
| 2 | Confidence scoring | Backend | Scoring algorithm |
| 3 | Edit/confirm flow | Frontend | Full update workflow |
| 3-4 | Testing & refinement | QA | >70% accuracy on test corpus |
| 5 | Documentation | Product | User guide, help articles |
| 6 | Launch & feedback | All | Release, monitor metrics |

**Resources:** 1 Backend, 1 Frontend, 0.5 Designer

---

### Phase 2: Forward-to-Process (Q3 2025)

**Timeline: 6-8 weeks**

| Week | Task | Owner | Deliverable |
|------|------|-------|-------------|
| 1-2 | Email infrastructure | Backend | SES setup, ingestion pipeline |
| 2-3 | Address generation | Backend | Unique addresses per user |
| 3-4 | Notification system | Backend | In-app notifications |
| 4-5 | Bulk processing UI | Frontend | Dashboard for multiple updates |
| 5-6 | Auto-linking logic | Backend | Match emails to applications |
| 6-7 | Security review | Security | Audit, penetration testing |
| 7-8 | Beta & launch | All | Gradual rollout |

**Resources:** 1 Backend, 1 Frontend, 1 DevOps, Security review

---

### Phase 3: Gmail API (Q4 2025)

**Timeline: 8-10 weeks (conditional)**

| Week | Task | Owner | Deliverable |
|------|------|-------|-------------|
| 1-2 | OAuth integration | Backend | Gmail OAuth flow |
| 2-3 | Background sync | Backend | Cron job, queue system |
| 3-5 | ML classification | ML/Backend | Smart email classification |
| 5-6 | Privacy dashboard | Frontend | Transparency UI |
| 6-8 | Testing & compliance | All | Privacy audit, TOU updates |
| 8-10 | Gradual rollout | All | Phased release, monitoring |

**Resources:** 2 Backend, 1 ML Engineer, 1 Frontend, Legal review

**Go/No-Go Decision Point:** End of Q2 - proceed only if Phase 1 shows >40% weekly usage of email import feature.

---

## 7. Technical Considerations

### 7.1 Data Privacy

| Phase | Data Handling | Retention |
|-------|--------------|-----------|
| 1 | Email content never leaves client | N/A - processed locally |
| 2 | Email stored temporarily for parsing | 24 hours, then purged |
| 3 | Metadata only, full email on-demand | 7 days for suggestions |

### 7.2 Security

- All email processing over TLS
- Unique forwarding addresses (unguessable tokens)
- Rate limiting on ingestion endpoints
- Audit logs for all status changes

### 7.3 Error Handling

| Scenario | Handling |
|----------|----------|
| Parser fails | Show raw text, allow manual entry |
| Ambiguous company | Show "Select Company" dropdown with candidates |
| Duplicate update | Merge with existing, show diff |
| Email not job-related | "Not recognized" with feedback option |

### 7.4 Testing Strategy

- **Unit Tests:** Parser patterns, confidence scoring
- **Integration Tests:** End-to-end import flow
- **Test Corpus:** 500+ real email samples (anonymized)
- **Beta Program:** 50 users for 2 weeks before each phase launch

---

## 8. Success Metrics & KPIs

### Phase 1 Goals
| Metric | Target | Measurement |
|--------|--------|-------------|
| Parse Accuracy | >70% | Correct status extracted / Total parsed |
| User Adoption | >40% weekly | Users using import / Active users |
| Time to Update | <30 sec | Paste to confirmed update |
| User Satisfaction | >4.0/5 | Post-action survey |

### Phase 2 Goals
| Metric | Target | Measurement |
|--------|--------|-------------|
| Forwarding Adoption | >30% | Users with forwarding enabled |
| Manual Actions Reduced | >50% | Copy-paste actions vs Phase 1 |
| Parse Accuracy | >85% | Improved patterns, more context |

### Phase 3 Goals
| Metric | Target | Measurement |
|--------|--------|-------------|
| Gmail Adoption | >20% | Users with Gmail connected |
| Fully Automated Updates | >60% | Updates requiring no user action |
| Privacy Concerns | <5% | Support tickets, opt-out rate |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users don't trust email parsing | Medium | High | Start with Phase 1 (no permissions), build trust |
| Parser accuracy too low | Medium | High | Extensive test corpus, user feedback loop |
| Gmail API changes/deprecation | Low | High | Abstract email provider interface |
| Privacy regulations (GDPR) | Medium | Medium | Privacy by design, clear policies |
| Engineering delays | Medium | Medium | Phased approach allows scope reduction |
| ATS email format changes | High | Low | Pattern versioning, quick updates |

---

## 10. Appendix

### A. Sample Email Test Cases

See `tests/email-samples/` for anonymized real-world examples:
- `greenhouse-interview-scheduled.txt`
- `lever-rejection.txt`
- `workday-offer.txt`
- `generic-phone-screen.txt`

### B. Related Documents

- [LinkedIn Integration Spec](./linkedin-feasibility.md)
- [Wellfound Integration Spec](./wellfound-feasibility.md)
- [Trust Model ADR](./ADR-001-trust-model.md)

### C. Open Questions

1. Should we support Outlook/Microsoft Graph API in Phase 3 alongside Gmail?
2. Do we need explicit opt-in for each company, or is global consent sufficient?
3. How long should we store parsed results before auto-deleting?

---

*This specification is a living document. Updates will be tracked in the revision history.*
