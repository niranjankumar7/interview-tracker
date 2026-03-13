# ADR-001: Chrome Extension Trust Model

**Status:** Proposed  
**Date:** 2025-03-14  
**Deciders:** Extension Team  
**Affected:** All extension development

## Context

The interview-tracker Chrome extension captures job posting data from career websites. Given the sensitive nature of job search data and our commitment to user privacy, we need strict trust boundaries that prioritize user control, transparency, and data minimization.

## Decision

We will adopt a **minimal-permission, user-controlled, local-first** trust model with explicit bans on automation that could harm users or violate platform policies.

---

## 1. Permissions Philosophy: Minimal & Explicit

### 1.1 Core Principle
The extension requests **only permissions essential to its stated purpose** and explains each permission request in human-readable terms.

### 1.2 Permission Requirements

| Permission | Justification | User Explanation |
|------------|---------------|------------------|
| `activeTab` | Capture job data from current tab | "To read job posting details from the page you're viewing" |
| `storage` | Save captured job data locally | "To store your job applications locally on your device" |
| `host_permissions` (specific domains only) | Parse job posting HTML | "To recognize job posting formats on supported career sites" |

### 1.3 Forbidden Permissions
The following permissions are **BANNED** without explicit ADR review:

- `background` (persistent background scripts)
- `webRequest` (intercepting network traffic)
- `cookies` (accessing browser cookies)
- `history` (browser history access)
- `bookmarks` (bookmark access)
- `downloads` (file downloads)
- `geolocation` (location tracking)
- `notifications` (push notifications)
- `<all_urls>` (universal site access)
- `tabs` (broad tab access beyond activeTab)

---

## 2. Banned Behaviors

The following behaviors are **STRICTLY PROHIBITED**:

### 2.1 Auto-Apply Automation
- **Prohibited:** Automatically submitting job applications on behalf of users
- **Prohibited:** Pre-filling application forms and auto-submitting
- **Prohibited:** Any interaction with "Apply" buttons without explicit user initiation

**Rationale:** Auto-apply violates most platforms' Terms of Service and creates liability for inaccurate applications.

### 2.2 Background Crawling
- **Prohibited:** Periodically scanning job sites in the background
- **Prohibited:** Opening hidden tabs or windows to scrape content
- **Prohibited:** Using service workers for automated data collection
- **Prohibited:** Scheduled/periodic sync jobs that fetch data without user action

**Rationale:** Background crawling consumes resources, generates unwanted traffic, and violates most sites' robots.txt policies.

### 2.3 Hidden Scraping
- **Prohibited:** Extracting data from pages not currently visible to the user
- **Prohibited:** Scraping user profile data, connections, or private information
- **Prohibited:** Collecting data from sites the user hasn't explicitly navigated to
- **Prohibited:** iframe scraping or shadow DOM manipulation without user consent

**Rationale:** Hidden scraping violates user trust and platform policies. Users must be aware of all data collection.

### 2.4 Data Exfiltration
- **Prohibited:** Sending job data to third-party analytics or tracking services
- **Prohibited:** Including tracking pixels or beacons
- **Prohibited:** Sharing anonymized/aggregated data with external parties

---

## 3. User Control Requirements

### 3.1 Explicit Capture Flow
Every data capture must follow this flow:

```
User visits job page → Clicks extension icon → Extension shows preview → User reviews data → User confirms save → Data stored
```

### 3.2 Mandatory Review Step
- **Required:** All extracted fields must be displayed for user review before saving
- **Required:** Users can edit any field before final save
- **Required:** Clear indication of what data will be captured
- **Required:** Cancel option at every step

### 3.3 No Silent Operation
- Extension icon must show visual indicator when job page is detected
- No automatic data extraction without user action
- No background sync that modifies user data without confirmation

### 3.4 Data Visibility
- Users can view all stored data within extension UI
- Export functionality provided for user data portability
- Clear deletion controls for individual entries or complete data wipe

---

## 4. Data Handling

### 4.1 Local-First Architecture
- Primary data storage: Browser's local storage (`chrome.storage.local`)
- No external database for job application data
- Optional: Encrypted backup to user-controlled cloud (user-initiated only)

### 4.2 No Third-Party Sharing
- Job posting data never sent to third parties
- No integration with external job boards, recruiters, or services
- No data sale, transfer, or licensing under any circumstances

### 4.3 Communication Security
- API calls to interview-tracker backend (if any) use HTTPS only
- Authentication tokens transmitted via secure headers
- No plaintext credential storage

### 4.4 Data Retention
- Data persists until user explicitly deletes it
- No automatic purging without user notification
- Uninstalling extension triggers optional data export prompt

---

## 5. Security Model

### 5.1 Token Storage
- Authentication tokens stored in `chrome.storage.local` (encrypted at rest by browser)
- No token persistence in memory longer than necessary
- Token refresh handled securely without exposing credentials
- Automatic token expiration handling

### 5.2 Content Security Policy (CSP)
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.interview-tracker.com;"
  }
}
```

- No inline scripts
- No `eval()` or `new Function()` usage
- No external script loading
- Restricted connect-src to approved API endpoints only

### 5.3 Sandboxing
- Content scripts run in isolated world (no access to page JavaScript)
- Popup scripts isolated from content scripts via message passing only
- No direct DOM manipulation from background/service worker

### 5.4 Input Sanitization
- All extracted HTML content sanitized before storage (DOMPurify or equivalent)
- XSS prevention on all user-editable fields
- URL validation on all links captured

### 5.5 Update Security
- Extension updates reviewed for permission changes
- Automatic updates disabled for permission increases (user approval required)
- Code signing verification on all distributed packages

---

## 6. Compliance & Enforcement

### 6.1 Code Review Checklist
All PRs must verify:
- [ ] No new permissions added without ADR amendment
- [ ] No banned behaviors introduced
- [ ] User review step present for all data capture
- [ ] No third-party data transmission added
- [ ] CSP rules updated if new connect-src needed

### 6.2 Automated Enforcement
- ESLint rules blocking `chrome.permissions.request` for forbidden permissions
- CI check for manifest.json permission changes
- Dependency audit to prevent tracking library inclusion

### 6.3 Privacy Policy Requirements
Privacy policy must explicitly state:
- What data is collected (job posting details)
- How it's collected (manual user-initiated capture)
- Where it's stored (local browser storage)
- Who has access (user only)

---

## 7. Consequences

### Positive
- User trust through transparency and control
- Compliance with Chrome Web Store policies
- Protection against platform TOS violations
- Minimal attack surface for security threats

### Negative
- More steps for user (explicit capture flow)
- Cannot offer "auto-sync" features competitors might have
- Requires user action for each job capture
- Limited to explicit host permissions (new sites require extension update)

---

## References

- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program_policies/)
- [OWASP Extension Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)

---

## Amendment Process

Changes to this ADR require:
1. Written proposal with security/privacy impact assessment
2. Review by at least one team member
3. Approval documented in this file with date and rationale
