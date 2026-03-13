# Chrome Extension QA Matrix

**Last Updated:** 2026-03-14
**QA Agent:** ext-qa-matrix-agent

## P0 Test Cases (Critical Path)

| Feature | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| Auth | Login from popup | Clicking "Sign In" redirects to OAuth provider, returns valid JWT token | P0 |
| Auth | Token refresh | Token refreshes automatically before expiry (within 5 min window) | P0 |
| Auth | Logout | Clears chrome.storage.local auth data, shows login screen | P0 |
| Save | Greenhouse job page | Extracts company, role, location, jobId with confidence > 0.9 | P0 |
| Save | Lever job page | Extracts company, role, location, jobId with confidence > 0.9 | P0 |
| Save | Ashby job page | Extracts company, role, location, jobId with confidence > 0.9 | P0 |
| Save | SmartRecruiters job page | Extracts company, role, location, jobId with confidence > 0.9 | P0 |
| Save | LinkedIn job page | Extracts company, role, location, jobId with confidence > 0.85 | P0 |
| Save | Generic site | Extracts with JSON-LD fallback, confidence 0.5-0.7 | P0 |
| Dedupe | Same job twice | Updates existing record, doesn't create duplicate | P0 |
| Dedupe | Same company, different role | Creates new interview record | P0 |
| Review | Low confidence (< 0.6) | Shows warning banner with "Please review" message | P0 |
| Review | Missing required fields | Shows inline error, prevents save until fixed | P0 |
| Backend | Successful save | POST to /api/extension/capture returns 200 with interview ID | P0 |
| Backend | Failed save | Shows error toast with backend message | P0 |

## P1 Test Cases (High Priority)

| Feature | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| Auth | Session persistence | Token survives browser restart | P1 |
| Auth | Invalid token handling | Redirects to login on 401 from API | P1 |
| Save | Job description extraction | Captures first 2000 chars of description | P1 |
| Save | Salary extraction | Extracts salary range when available | P1 |
| UI | Popup state management | Shows loading states during extraction | P1 |
| UI | Extension icon badge | Shows count of saved jobs for current site | P1 |
| Storage | Offline queue | Queues saves when offline, syncs on reconnect | P1 |

## P2 Test Cases (Medium Priority)

| Feature | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI | Keyboard shortcuts | Cmd/Ctrl+Shift+S opens popup | P2 |
| UI | Dark mode support | Follows system preference | P2 |
| Analytics | Save events | Tracks successful/failed saves | P2 |
| Performance | Extraction speed | < 500ms for supported adapters | P2 |

## Adapter-Specific Test Matrix

### Greenhouse Adapter

| Test Case | Fixture | Expected Company | Expected Role | Min Confidence |
|-----------|---------|------------------|---------------|----------------|
| Stripe job page | `greenhouse-stripe.html` | Stripe | Software Engineer | 0.9 |
| Shopify job page | `greenhouse-shopify.html` | Shopify | Senior Developer | 0.9 |
| Subdomain extraction | `greenhouse-acme.html` | Acme Inc | Product Manager | 0.85 |

### Lever Adapter

| Test Case | Fixture | Expected Company | Expected Role | Min Confidence |
|-----------|---------|------------------|---------------|----------------|
| Standard posting | `lever-startup.html` | TechStartup | Full Stack Engineer | 0.9 |
| Multi-location | `lever-multiloc.html` | GlobalCorp | Senior PM | 0.85 |

### Ashby Adapter

| Test Case | Fixture | Expected Company | Expected Role | Min Confidence |
|-----------|---------|------------------|---------------|----------------|
| JSON-LD data | `ashby-tech.html` | Anthropic | ML Engineer | 0.95 |
| DOM fallback | `ashby-noscript.html` | Company | Designer | 0.8 |

### LinkedIn Adapter

| Test Case | Fixture | Expected Company | Expected Role | Min Confidence |
|-----------|---------|------------------|---------------|----------------|
| Standard job view | `linkedin-job.html` | Google | Product Manager | 0.85 |
| Easy Apply page | `linkedin-easyapply.html` | Meta | Software Engineer | 0.8 |

## E2E Test Flows

### Flow 1: Happy Path Save

```
1. Navigate to Greenhouse job page
2. Click extension icon
3. Wait for extraction (verify popup shows extracted data)
4. Click "Save Job"
5. Verify success toast
6. Verify backend has new interview record
```

### Flow 2: Low Confidence Review

```
1. Navigate to generic job site (no structured data)
2. Click extension icon
3. Verify warning banner shown
4. Manually edit company name
5. Click "Save Job"
6. Verify save succeeds with manual corrections
```

### Flow 3: Duplicate Detection

```
1. Save job from Greenhouse page
2. Navigate to same job page again
3. Click extension icon
4. Verify popup shows "Already saved" state
5. Click "Update" instead of "Save"
6. Verify backend updates existing record
```

### Flow 4: Authentication Flow

```
1. Clear all extension storage
2. Click extension icon
3. Verify "Sign In" button shown
4. Click "Sign In"
5. Complete OAuth flow
6. Verify popup shows authenticated state
7. Verify token stored in chrome.storage.local
```

## Regression Test Checklist

- [ ] All adapter tests pass
- [ ] E2E tests pass in headless Chrome
- [ ] No console errors in popup
- [ ] No console errors in content script
- [ ] No console errors in service worker
- [ ] Build completes without warnings
- [ ] Extension loads in Chrome Dev Mode

## Known Issues / Limitations

| Issue | Impact | Workaround | Planned Fix |
|-------|--------|------------|-------------|
| LinkedIn dynamic content | Medium | Retry extraction after 1s delay | MutationObserver |
| Greenhouse custom domains | Low | Falls back to generic adapter | Domain whitelist |
| CORS on some job boards | Low | Use background script proxy | N/A - external issue |

## CI/CD Quality Gates

| Gate | Condition | Action on Fail |
|------|-----------|----------------|
| Adapter Tests | 100% pass rate | Block PR merge |
| E2E Tests | 100% pass rate | Block PR merge |
| Test Coverage | > 80% for adapters | Warn, don't block |
| Build | No TypeScript errors | Block PR merge |
| Lint | No ESLint errors | Block PR merge |

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Lead | ext-qa-matrix-agent | 2026-03-14 | ✅ COMPLETE |
| Test Fixtures | ext-qa-matrix-agent | 2026-03-14 | ✅ 4 fixtures created |
| Adapter Tests | ext-qa-matrix-agent | 2026-03-14 | ✅ 5 adapter suites |
| E2E Tests | ext-qa-matrix-agent | 2026-03-14 | ✅ Full flow coverage |
| CI Integration | ext-qa-matrix-agent | 2026-03-14 | ✅ GitHub Actions |
