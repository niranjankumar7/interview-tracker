# Supported Domains Matrix

**Version:** 1.0  
**Last Updated:** 2025-03-14  
**Status:** Active Policy

---

## Summary

This document defines the support status for job posting domains in the interview-tracker Chrome extension. Sites are classified into three tiers based on parsing reliability, policy compliance, and maintenance burden.

---

## Domain Classification

### 🟢 Green: Fully Supported (P0)

These domains have dedicated parsers, are actively maintained, and are prioritized for bug fixes.

| Domain | Platform Type | Parser Status | Notes |
|--------|---------------|---------------|-------|
| `boards.greenhouse.io` | ATS | ✅ Production | Structured data, stable markup |
| `jobs.lever.co` | ATS | ✅ Production | JSON-LD structured data available |
| `jobs.ashbyhq.com` | ATS | ✅ Production | Clean HTML structure |
| `jobs.smartrecruiters.com` | ATS | ✅ Production | Well-documented schema |

**Support Commitment:**
- Dedicated parser maintained in codebase
- Test coverage for parser logic
- Priority bug fixes (P0)
- Regular validation checks

---

### 🟡 Yellow: Experimental / Best-Effort

These domains are supported with generic parsers. Extraction quality varies and may require manual user correction.

| Domain Category | Examples | Parsing Strategy | Limitations |
|-----------------|----------|------------------|-------------|
| Generic job sites | Indeed, Glassdoor, ZipRecruiter | Heuristic HTML parsing | Format changes frequently; may miss fields |
| Company career pages | Custom-built job pages | Meta tag + common selector patterns | Inconsistent markup between sites |
| Niche job boards | AngelList (non-Wellfound), Stack Overflow Jobs | Best-effort schema.org extraction | Variable data quality |

**Support Commitment:**
- Generic parsers applied
- No dedicated test coverage per site
- Bug fixes when reported (P2)
- Users may need to manually edit extracted data

---

### 🔴 Red: Blocked / Restricted

These domains are explicitly blocked or require additional review before support.

| Domain | Status | Rationale | Review Date |
|--------|--------|-----------|-------------|
| `linkedin.com` | 🔴 BLOCKED | Policy risk - LinkedIn actively blocks scrapers; violates ToS | 2025-03-14 |
| `wellfound.com` (AngelList) | 🔴 REVIEW REQUIRED | Needs legal/policy review for scraping permissions | 2025-03-14 |
| `indeed.com` (full access) | 🔴 PARTIAL | Rate limiting aggressive; may implement delays | 2025-03-14 |

---

## Classification Rationale

### Green Classification Criteria

A domain receives **Green** status when:
1. **Structured Data Available:** Uses JSON-LD, schema.org, or consistent HTML structure
2. **Public API or Documented Schema:** ATS platforms typically publish schema documentation
3. **Terms of Service Compliant:** Job aggregation is permitted or not explicitly prohibited
4. **Parser Feasibility:** Low complexity, stable selectors, minimal edge cases
5. **Active Maintenance:** Platform is actively maintained (not deprecated)

**Why These Greenhouse, Lever, Ashby, SmartRecruiters?**
- Purpose-built ATS platforms designed for job distribution
- Consistent, documented markup structures
- Job posting data is intended to be public and shareable
- No explicit prohibitions against browser extensions reading public job data

---

### Yellow Classification Criteria

A domain receives **Yellow** status when:
1. **Variable Markup:** HTML structure changes frequently or varies by implementation
2. **Limited Structured Data:** Relies on heuristics rather than explicit schema
3. **Aggressive Rate Limiting:** May block or throttle automated requests
4. **Grey Area TOS:** No explicit permission but not explicitly prohibited

**Rationale for Yellow Status:**
These sites can be parsed but require ongoing maintenance and user tolerance for imperfect data extraction. We provide best-effort support without guarantees.

---

### Red Classification Criteria

A domain receives **Red** status when any of the following apply:
1. **Explicit ToS Prohibition:** Terms explicitly prohibit automated access or scraping
2. **Active Anti-Scraping:** Aggressive bot detection, CAPTCHA, or legal threats
3. **Prior Enforcement Action:** History of blocking similar extensions or sending cease & desist
4. **High Legal Risk:** Potential for litigation or account bans affecting users
5. **User Data Privacy Concerns:** Sites with sensitive user profile data (LinkedIn)

---

## Domain Details

### 🟢 Greenhouse (`boards.greenhouse.io`)

**Support Level:** P0 - Fully Supported

**Parser Strategy:**
- Extract JSON-LD structured data from `<script type="application/ld+json">`
- Fallback to semantic HTML selectors
- Company name from subdomain

**Example URLs:**
- `https://boards.greenhouse.io/companyname/jobs/12345`

**Fields Extracted:**
- Job title, company name, location, description, application URL, posted date

---

### 🟢 Lever (`jobs.lever.co`)

**Support Level:** P0 - Fully Supported

**Parser Strategy:**
- JSON-LD job posting schema
- Clean semantic HTML structure
- Department/team extraction from page content

**Example URLs:**
- `https://jobs.lever.co/companyname/12345-abc`

**Fields Extracted:**
- Job title, company name, location, description, team, commitment (FT/PT/Contract)

---

### 🟢 Ashby (`jobs.ashbyhq.com`)

**Support Level:** P0 - Fully Supported

**Parser Strategy:**
- Consistent HTML structure across all Ashby instances
- Meta tags for job metadata
- Clean job description selectors

**Example URLs:**
- `https://jobs.ashbyhq.com/companyname/12345`

**Fields Extracted:**
- Job title, company name, location, description, department, employment type

---

### 🟢 SmartRecruiters (`jobs.smartrecruiters.com`)

**Support Level:** P0 - Fully Supported

**Parser Strategy:**
- Schema.org JobPosting markup
- Predictable URL structure
- Rich metadata extraction

**Example URLs:**
- `https://jobs.smartrecruiters.com/companyname/12345-job-title`

**Fields Extracted:**
- Job title, company name, location, description, job ID, posting date

---

### 🔴 LinkedIn (`linkedin.com`)

**Support Level:** BLOCKED

**Blocking Rationale:**
1. **Terms of Service:** LinkedIn's User Agreement explicitly prohibits "scraping" and automated data collection
2. **Legal History:** LinkedIn has filed lawsuits against scrapers (hiQ Labs case) and actively blocks scraping tools
3. **Technical Barriers:** Aggressive bot detection, CAPTCHA, rate limiting, authentication walls
4. **User Risk:** Users risk account suspension or permanent ban for using scraping tools
5. **Privacy Concerns:** LinkedIn profiles contain sensitive personal/professional data

**Decision:** **NO-GO** - See `decisions/linkedin-gonogo.md` for full risk assessment.

---

### 🔴 Wellfound (`wellfound.com`, formerly AngelList)

**Support Level:** 🔴 **BLOCKED**

**Blocking Rationale:**
1. **Explicit ToS Prohibition:** Covenant #04 explicitly bans "automated or non-automated harvesting, collection or 'scraping'"
2. **Automated Access Ban:** Covenant #06 prohibits automated systems accessing the site
3. **No Grey Area:** Unlike platforms with ambiguous terms, Wellfound clearly prohibits scraping
4. **User Account Risk:** Users could face suspension for using scraping tools
5. **API Alternative:** Not available for browser extension use (partner-only)

**Decision:** **NO-GO** - See [wellfound-feasibility.md](../wellfound-feasibility.md) and [decisions/wellfound-gonogo.md](../decisions/wellfound-gonogo.md) for full assessment.

**Technical Note:** Wellfound uses React/Apollo GraphQL with data embedded in `__NEXT_DATA__`. While technically extractable, legal prohibitions prevent implementation.

---

## Adding New Domains

### Process for Domain Support Request

1. **Submit Request:** Open issue with domain URL pattern and example job posting
2. **ToS Review:** Verify terms of service permit data access
3. **Technical Assessment:** Evaluate parser feasibility
4. **Classification:** Assign Green/Yellow/Red based on criteria above
5. **Implementation:** For Green/Yellow, implement parser; for Red, document rationale

### Escalation to Green Status

Yellow domains can be promoted to Green when:
- Parser has been stable for 90+ days
- No breaking markup changes
- Sufficient user demand demonstrated
- Dedicated test coverage added

---

## Maintenance Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Green domain validation | Weekly (automated) | CI/CD |
| Parser health checks | Daily | Monitoring |
| Yellow domain review | Monthly | Product Team |
| Red domain re-evaluation | Quarterly | Legal + Product |
| ToS monitoring | Continuous | Automated alerts |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-03-14 | Initial classification |
