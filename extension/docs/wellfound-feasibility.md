# Wellfound Capture Feasibility Review

**Document ID:** WF-FEAS-002  
**Date:** March 14, 2026  
**Reviewer:** Extension Product Team  
**Status:** COMPLETE

---

## Executive Summary

This document evaluates the feasibility, legal risks, and technical challenges of integrating Wellfound (formerly AngelList Talent) job data capture into the Interview Tracker browser extension.

**Recommendation:** 🔴 **RED - DO NOT IMPLEMENT**

Wellfound integration presents **unacceptable legal and policy risks** due to explicit Terms of Service prohibitions on scraping and automated data collection. Despite strong user demand for startup job tracking, the risk profile exceeds acceptable thresholds.

---

## Platform Analysis

### Wellfound Job Page Structure (wellfound.com/jobs/*)

Wellfound uses a consistent URL structure for job listings:

| URL Pattern | Description |
|-------------|-------------|
| `wellfound.com/company/{slug}/jobs/{id}-{title}` | Individual job posting page |
| `wellfound.com/company/{slug}/jobs` | Company jobs listing |
| `wellfound.com/role/{role-slug}` | Role-based search |
| `wellfound.com/location/{location}` | Location-based search |
| `wellfound.com/role/l/{role}/{location}` | Combined role + location search |

**Page Architecture:**
- **Framework:** React/Next.js with Apollo GraphQL
- **Data Delivery:** Server-side rendered with embedded Apollo state
- **HTML Structure:** Standard HTML5 with semantic elements

### Dynamic Content Loading (React-based)

Wellfound uses a common React pattern for data hydration:

```html
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "apolloState": {
        "data": {
          "JobListing:123456": { /* job data */ },
          "Startup:789": { /* company data */ }
        }
      }
    }
  }
}
</script>
```

**Key Technical Characteristics:**

| Aspect | Finding | Impact |
|--------|---------|--------|
| **Initial Load** | Server-side rendered with full data embedded | Data available immediately in HTML |
| **Pagination** | Cursor-based and offset-based | Requires parsing pagination metadata |
| **Dynamic Updates** | Apollo Client hydrates and manages state | Post-load changes via GraphQL |
| **Search Filters** | Role, location, remote, compensation | Multiple entry points for discovery |

**Data Extraction Approach:**
If permitted, extraction would involve:
1. Parse `__NEXT_DATA__` script tag content
2. Navigate Apollo state graph to find job/company nodes
3. Unpack reference relationships to flatten nested data
4. Extract relevant fields (title, company, salary, etc.)

### Authentication Requirements

| Content Type | Login Required | Notes |
|--------------|----------------|-------|
| Basic job listings | Sometimes | Public listings exist but are limited |
| Full job descriptions | Yes | Complete details behind auth wall |
| Salary/equity data | Yes | Core value proposition gated |
| Company funding info | Partial | Basic info public, details require auth |
| Application tracking | Yes | User's application status strictly auth-only |

**Implication:** Meaningful job tracking requires authenticated sessions, increasing detection risk and potential account consequences.

### Rate Limiting Behavior

Based on third-party scraper documentation and observations:

| Behavior | Observation |
|----------|-------------|
| **Anonymous access** | Aggressive throttling; CAPTCHA after few requests |
| **Authenticated access** | Rate limits tied to account; temporary blocks possible |
| **IP-based limits** | Observed; residential proxies recommended by commercial scrapers |
| **Anti-bot measures** | Active protection requiring bypass services (Scrapfly, etc.) |

Commercial scrapers like Apify and Scrapfly note that Wellfound "is notorious for blocking all web scrapers" and requires anti-scraping protection bypass.

### Historical Stability of Selectors

| Element | Stability | Notes |
|---------|-----------|-------|
| `__NEXT_DATA__` script tag | High | Standard Next.js pattern, unlikely to change |
| Apollo state structure | Medium | GraphQL schema changes could affect field names |
| URL patterns | High | Clean, semantic slugs used consistently |
| HTML selectors | Low | React class names obfuscated/minified |

**Assessment:** While the `__NEXT_DATA__` approach is stable, Wellfound's anti-scraping stance means technical feasibility is secondary to legal concerns.

---

## Policy Review

### Wellfound Terms of Service

**Source:** [Wellfound General Terms](https://wellfound.com/terms) (Last Updated: June 5, 2020)

#### Explicit Prohibitions (Section III - Covenants)

> **Covenant #04:** "You agree that you will not... copy, disclose or distribute Content except as expressly permitted by the Terms **(including through the use of automated or non-automated harvesting, collection or 'scraping')** or otherwise use the Site or Services for competitive purposes"

> **Covenant #06:** "use any automated system (including a spider, robot, or offline reader) to access the Site or Services in a manner that takes more bandwidth or produces greater load on Wellfound's network or servers than a human can reasonably produce in the same period of time by using a conventional on-line web browser"

> **Covenant #05:** "use any Content, or other information acquired from the Site or through your use of the Services for commercial activity or in a manner that directly or indirectly competes with Wellfound, the Site or the Services"

#### Key Prohibited Activities

| Activity | Covenant | Status |
|----------|----------|--------|
| Automated scraping | #04, #06 | Explicitly prohibited |
| Non-automated harvesting | #04 | Explicitly prohibited |
| Copying/distributing content | #04 | Restricted |
| Competitive use of data | #05 | Prohibited |
| Excessive bandwidth usage | #06 | Prohibited |

### Data Usage Restrictions

**From ToS Section IV - Privacy and Confidentiality:**

> "By using the Services you may have an opportunity to see Content created by other Users. You agree not to copy, distribute or disclose that Content or permit any other person to do so."

**Key Restrictions:**
1. **Confidentiality obligation:** Users must keep employer/candidate information confidential
2. **No redistribution:** Cannot share job data with third parties
3. **No commercial use:** Data cannot be used for competing services
4. **Account responsibility:** User liable for all activity under their account

### API Availability

| Aspect | Finding |
|--------|---------|
| **Official API** | Exists but appears restricted to approved partners |
| **Public Documentation** | Not readily accessible |
| **OAuth/Open Access** | Not available for third-party extensions |
| **Partner Program** | Requires business development effort |
| **Extension Compatibility** | Browser extension scraping likely violates API ToS |

**Assessment:** No viable official API pathway for a browser extension integration.

### Legal Precedent Context

While Wellfound-specific litigation is not prominent, the broader scraping legal landscape includes:

- **hiQ Labs v. LinkedIn:** Established that scraping public data doesn't violate CFAA, but breach of contract claims remain viable
- **Meta v. Bright Data (2024):** Confirmed scraping behind contractual restrictions constitutes breach of contract
- **Industry practice:** Wellfound's explicit ToS language provides strong basis for legal action if they chose to pursue it

---

## Risk Assessment

| Risk | Level | Mitigation | Assessment |
|------|-------|------------|------------|
| **Selector volatility** | Medium | Generic fallback | Apollo state pattern is stable, but HTML selectors change |
| **Account bans** | Low-Medium | Respect rate limits | Users risk Wellfound account suspension |
| **Data completeness** | Medium | User confirmation | Many listings require login for full details |
| **ToS Violation** | **HIGH** | None viable | Explicit prohibition; no grey area |
| **Legal Action** | Medium | N/A | Wellfound could send cease & desist |
| **Anti-scraping evasion** | Medium | Rate limiting | Active protection requires bypass services |
| **Reputational** | Medium | Transparency | Supporting scraped site may harm reputation |

### Detailed Risk Analysis

#### 🔴 ToS Violation (HIGH)
- **Evidence:** Covenant #04 explicitly bans "scraping" and "harvesting"
- **Impact:** Breach of contract; potential for account termination
- **Mitigation:** None viable while maintaining functionality
- **Conclusion:** Unacceptable risk

#### 🟡 Account Bans (MEDIUM)
- **Evidence:** Wellfound can terminate accounts for ToS violations (Section VIII)
- **Impact:** User loses access to Wellfound platform
- **Mitigation:** Rate limiting, user warnings
- **Conclusion:** Significant user-facing risk

#### 🟡 Legal Action (MEDIUM)
- **Evidence:** No known litigation, but ToS provides basis for action
- **Impact:** Cease & desist, potential damages
- **Mitigation:** Legal review, compliance documentation
- **Conclusion:** Requires monitoring

#### 🟢 Selector Volatility (LOW-MEDIUM)
- **Evidence:** Next.js/Apollo patterns are stable industry standards
- **Impact:** Maintenance burden if selectors change
- **Mitigation:** Generic fallback strategies
- **Conclusion:** Manageable technical risk

#### 🟡 Data Completeness (MEDIUM)
- **Evidence:** Full details often require authentication
- **Impact:** Incomplete job data extraction
- **Mitigation:** User confirmation/editing
- **Conclusion:** Usability impact but not blocking

---

## Recommended Approach

### NOT RECOMMENDED

Standard adapter implementation is **not advisable** due to explicit ToS prohibitions.

### Evaluated Alternatives

| Approach | Feasibility | Rationale |
|----------|-------------|-----------|
| **Browser extension (scraping)** | ❌ REJECTED | Violates ToS Covenant #04, #06 |
| **Wellfound API partnership** | ⚠️ UNVERIFIED | May be viable but requires business development |
| **User-triggered manual save** | ⚠️ LEGALLY UNCERTAIN | Even manual extraction may violate ToS |
| **Manual user entry** | ✅ ACCEPTED | User copies/pastes job details manually |
| **Wait for policy change** | ⚠️ DEFERRED | Monitor ToS for changes |

### If Policy Were to Change

*If Wellfound were to permit user-initiated data collection, the implementation would follow this approach:*

#### Standard Adapter Implementation

```typescript
// Wellfound Job Page Adapter
class WellfoundAdapter implements JobPageAdapter {
  readonly domainPattern = /^https:\/\/wellfound\.com\/company\/[^\/]+\/jobs\/\d+/;
  
  canHandle(url: string): boolean {
    return this.domainPattern.test(url);
  }
  
  extractJobData(): JobData {
    // Extract from __NEXT_DATA__ script tag
    const nextData = JSON.parse(
      document.querySelector('script#__NEXT_DATA__')?.textContent || '{}'
    );
    
    const apolloState = nextData.props?.pageProps?.apolloState?.data;
    const jobNode = this.findJobNode(apolloState);
    
    return {
      title: jobNode.title,
      company: jobNode.company.name,
      location: jobNode.locationNames?.join(', '),
      salaryRange: jobNode.compensation,
      equityRange: jobNode.equity,
      description: jobNode.description,
      requirements: jobNode.skillsRequired,
      remote: jobNode.remote,
      jobType: jobNode.jobType,
      url: window.location.href
    };
  }
  
  private findJobNode(apolloState: any): any {
    // Find job node in Apollo state graph
    for (const key in apolloState) {
      if (key.startsWith('JobListing:')) {
        return apolloState[key];
      }
    }
    return null;
  }
}
```

#### User-Triggered Saves Only

If implemented, the approach would be:
- **No auto-detection:** Extension does not automatically detect job page visits
- **Explicit user action:** User must click extension icon to save
- **No background polling:** No automatic syncing or monitoring
- **User confirmation:** Extracted data presented for user review before saving

#### No Auto-Sync

- No periodic synchronization of job listings
- No automatic status updates
- No background refresh of saved jobs
- All updates require explicit user action

---

## Go/No-Go Decision

### 🔴 RED - DO NOT IMPLEMENT

**Recommendation:** High risk, do not implement

**Rationale:**

1. **Explicit Prohibition:** Wellfound's Terms of Service explicitly prohibit scraping (automated and non-automated harvesting) in Covenant #04. The language is unambiguous and leaves no grey area.

2. **Business Model Conflict:** Wellfound monetizes access to job data through recruiter subscriptions. Free scraping conflicts with this revenue model and provides strong incentive for enforcement.

3. **User Risk:** Users could face account suspension or permanent bans on Wellfound for using the extension, creating liability and support burden.

4. **Reputational Risk:** Supporting a platform with explicit anti-scraping terms could harm the extension's reputation, especially in the developer/recruiter community.

5. **No API Alternative:** Unlike some platforms where official APIs provide a compliance pathway, Wellfound's API is restricted and not available for extension use.

6. **Legal Uncertainty:** While scraping public data may not violate CFAA (per hiQ Labs), breach of contract claims remain viable, and Wellfound's explicit ToS language strengthens any potential legal action.

### Comparison to LinkedIn

| Factor | LinkedIn | Wellfound |
|--------|----------|-----------|
| **ToS Prohibition** | Explicit | Explicit |
| **Technical Barriers** | Very High (anti-bot) | Medium (anti-scraping) |
| **Legal History** | Active litigator | Unknown |
| **Risk Level** | Very High | High |
| **Recommendation** | Yellow (with caution) | Red (do not implement) |

### Conditions for Reconsideration

This decision could be revisited if:

1. **API Partnership:** Wellfound grants official API access for browser extensions with appropriate terms
2. **ToS Change:** Terms are updated to explicitly permit user-initiated data collection
3. **Legal Opinion:** External legal counsel provides written opinion that user-triggered extraction is permissible under current terms
4. **Precedent:** Industry precedent establishes that similar tools are tolerated

### Exit Triggers (If Implemented Despite Recommendation)

If implementation proceeds contrary to this assessment, stop immediately if:
- Wellfound issues cease-and-desist notice
- Users report account suspensions
- Legal counsel advises against continued operation
- Media or community backlash occurs

---

## References

1. [Wellfound Terms of Service](https://wellfound.com/terms)
2. [Wellfound Privacy Policy](https://wellfound.com/privacy)
3. [Scrapfly: How to Scrape Wellfound](https://scrapfly.io/blog/posts/how-to-scrape-wellfound-aka-angellist)
4. [Apify: Wellfound Job Scraper](https://apify.com/clearpath/wellfound-api-job-scraper)
5. [Wellfound Code of Conduct](https://help.wellfound.com/article/833-what-is-the-code-of-conduct-for-recruiters-using-wellfound)
6. hiQ Labs v. LinkedIn, 938 F.3d 1061 (9th Cir. 2019)
7. Meta Platforms v. Bright Data, N.D. Cal. 2024

---

## Decision Record

| Date | Decision | Decision Maker | Notes |
|------|----------|----------------|-------|
| 2025-03-14 | 🔴 NO-GO | Extension Product Team | ToS explicitly prohibits scraping |
| 2026-03-14 | 🔴 NO-GO (Reaffirmed) | Extension Product Team | Updated assessment confirms high risk |

---

**Document Owner:** Extension Product Team  
**Review Cycle:** Quarterly or upon ToS changes  
**Distribution:** Engineering, Legal, Product
