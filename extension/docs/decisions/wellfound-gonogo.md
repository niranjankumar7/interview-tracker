# Decision: Wellfound (AngelList) Integration

**Status:** 🔴 **NO-GO - DO NOT IMPLEMENT**  
**Date:** March 14, 2026  
**Decision Maker:** Extension Product Team  
**Reviewed By:** Legal/Compliance Review  

---

## Summary

After comprehensive technical and legal review, we are **declining to implement** Wellfound (formerly AngelList Talent) integration for the Interview Tracker extension due to **unacceptable legal and policy risks**.

---

## Decision Rationale

### 1. Explicit Terms of Service Prohibition

Wellfound's General Terms (Section III, Covenant #04) explicitly prohibit:

> "copy, disclose or distribute Content except as expressly permitted by the Terms **(including through the use of automated or non-automated harvesting, collection or 'scraping')**"

This is not an ambiguous or grey-area prohibition—it explicitly names "scraping" as a violation.

### 2. No Viable Alternative Pathway

| Pathway | Status | Reason |
|---------|--------|--------|
| Web scraping | ❌ Blocked | Explicit ToS violation |
| Official API | ❌ Unavailable | Partner-only access |
| Manual user entry | ✅ Available | Zero risk, high friction |
| User-triggered save | ⚠️ Uncertain | May still violate ToS |

### 3. User Risk Assessment

Users of a Wellfound scraper would face:
- **Account suspension** (Wellfound reserves right to terminate for ToS violations)
- **Loss of access** to job application history on Wellfound
- **No recourse** if banned (arbitration clause in ToS)

### 4. Business Model Conflict

Wellfound monetizes job data access through recruiter subscriptions. Free data extraction conflicts with their core business model and provides strong incentive for enforcement action.

### 5. Risk Comparison

| Platform | Risk Level | Our Decision |
|----------|------------|--------------|
| Greenhouse | 🟢 Low | ✅ Implement |
| Lever | 🟢 Low | ✅ Implement |
| LinkedIn | 🟡 Medium-High | ⚠️ Yellow (caution) |
| **Wellfound** | **🔴 High** | **❌ No-Go** |

---

## What We Evaluated

### Technical Feasibility: ✅ High

Wellfound uses a predictable React/Apollo GraphQL architecture with data embedded in `__NEXT_DATA__` script tags. Extraction would be technically straightforward if permitted.

### Legal Risk: 🔴 High

Explicit ToS prohibitions on scraping with no ambiguity. Strong basis for breach of contract claims.

### User Risk: 🟡 Medium

Account bans possible but not as aggressively enforced as LinkedIn (based on available evidence).

### Maintenance Burden: 🟢 Low

Apollo/Next.js patterns are stable industry standards.

---

## Alternatives for Users

Users seeking to track Wellfound job applications should:

1. **Manual Entry:** Copy/paste job details into Interview Tracker manually
2. **Bookmark + Notes:** Use browser bookmarks with manual notes
3. **Spreadsheet:** Maintain a parallel tracking spreadsheet for Wellfound roles
4. **Wait:** Monitor for Wellfound API opening or ToS changes

---

## Conditions for Reconsideration

This decision may be revisited if:

1. **API Partnership:** Wellfound grants official API access for job tracking extensions
2. **ToS Amendment:** Terms updated to permit user-initiated data collection
3. **Legal Opinion:** External counsel provides written opinion that current approach is permissible
4. **Industry Shift:** Clear precedent established that similar tools are tolerated

---

## Related Documents

- [Wellfound Feasibility Assessment](../wellfound-feasibility.md)
- [Supported Domains Matrix](../supported-domains.md)
- [LinkedIn Go/No-Go Decision](./linkedin-gonogo.md)

---

## Decision Log

| Date | Decision | Notes |
|------|----------|-------|
| 2025-03-14 | 🔴 NO-GO | Initial assessment - ToS prohibits scraping |
| 2026-03-14 | 🔴 NO-GO | Reaffirmed - No change in risk profile |

---

**Next Review:** Quarterly or upon Wellfound ToS changes
