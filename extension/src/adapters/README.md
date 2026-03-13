# LinkedIn Adapter

**⚠️ IMPORTANT: Read the [Feasibility Assessment](../docs/linkedin-feasibility.md) before using this adapter.**

## Overview

This adapter provides a conservative, user-triggered-only method for extracting job information from LinkedIn pages. It is designed to minimize legal and technical risks while still providing value to users.

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| **User-Triggered Only** | Only activates when user explicitly clicks the extension icon |
| **No Automation** | No background polling, no auto-detection, no "My Applications" scraping |
| **Generic Extraction** | Uses Open Graph meta tags and page title, NOT LinkedIn-specific selectors |
| **Clear Warnings** | Shows prominent ToS warning before first use (and can be re-shown) |
| **Graceful Fallback** | Returns partial data rather than failing completely |

## Installation

Include the adapter in your content script or popup:

```html
<script src="src/adapters/linkedin-adapter.js"></script>
```

Or as a module:

```javascript
import LinkedInAdapter from './src/adapters/linkedin-adapter.js';
```

## Usage

### Basic Usage

```javascript
// When user clicks the extension icon/button
async function onExtensionClick() {
  // Check if adapter is available for current page
  if (!LinkedInAdapter.isAvailable()) {
    console.log('Not a LinkedIn job page');
    return;
  }

  // Extract job data (will show warning modal first)
  const jobData = await LinkedInAdapter.extractJob();
  
  if (jobData) {
    // Send to your backend or store locally
    await saveJob(jobData);
  }
}
```

### Example Extracted Data

```json
{
  "source": "linkedin",
  "url": "https://www.linkedin.com/jobs/view/1234567890/",
  "extractedAt": "2026-03-14T04:47:00.000Z",
  "extractionMethod": "generic",
  "rawTitle": "Senior Software Engineer at Example Corp | LinkedIn",
  "jobTitle": "Senior Software Engineer",
  "company": "Example Corp",
  "description": "We are looking for a Senior Software Engineer...",
  "jobId": "1234567890",
  "structuredData": {
    "@type": "JobPosting",
    "title": "Senior Software Engineer",
    "hiringOrganization": {
      "name": "Example Corp"
    },
    "jobLocation": {
      "address": {
        "addressLocality": "San Francisco"
      }
    }
  }
}
```

## API Reference

### `extractJob()`

Main entry point. Shows warning modal (if not previously acknowledged) and extracts job data.

**Returns:** `Promise<Object|null>` - Job data object or null if extraction failed/cancelled

### `isAvailable()`

Check if the current page is a LinkedIn job page that this adapter can handle.

**Returns:** `boolean`

### `resetWarning()`

Reset the warning acknowledgment (for testing purposes).

**Returns:** `void`

## Extraction Strategy

The adapter uses a cascading fallback strategy:

1. **Open Graph meta tags** (`og:title`, `og:description`, `og:site_name`)
2. **Standard meta tags** (`description`)
3. **Page title parsing** (heuristic pattern matching)
4. **JSON-LD structured data** (`JobPosting` schema if available)
5. **URL extraction** (job ID from URL path)

### Why Not LinkedIn-Specific Selectors?

LinkedIn's DOM structure:
- Changes frequently (A/B tests, obfuscation)
- Requires constant maintenance
- More likely to trigger anti-bot detection
- Creates stronger ToS violation claims

Generic extraction is:
- More stable across page updates
- Works on other job sites too
- Less likely to be blocked
- Defensible as "bookmarking" behavior

## Warning Modal

The adapter displays a prominent warning modal on first use:

```
⚠️ LINKEDIN INTEGRATION NOTICE

This feature allows you to manually save job information from 
LinkedIn pages to your Interview Tracker.

Important:
• This is a manual, user-triggered feature only
• We do not automatically scrape or sync LinkedIn data
• Using this feature may be subject to LinkedIn's Terms of Service
• Your LinkedIn account remains your responsibility
• We recommend reviewing LinkedIn's User Agreement

[Don't show again] [Cancel] [I Understand - Proceed]
```

Users can check "Don't show again" to skip the warning on future uses.

## Limitations

| Limitation | Reason |
|------------|--------|
| Cannot extract salary data | Often hidden behind interaction/login |
| Cannot extract application status | Requires "My Applications" page access (not implemented) |
| Cannot auto-sync applications | Intentionally not implemented (ToS risk) |
| Less detailed than scraping | Trade-off for stability and compliance |
| May fail on unusual page layouts | Relies on standard meta tags |

## Testing

### Unit Tests

```javascript
// Test title parsing
const adapter = require('./linkedin-adapter.js');

console.log(adapter._parseJobTitle('Engineer at Google | LinkedIn'));
// { jobTitle: 'Engineer', company: 'Google' }

console.log(adapter._parseJobTitle('Product Manager - Meta'));
// { jobTitle: 'Product Manager', company: 'Meta' }
```

### Manual Testing

1. Navigate to a LinkedIn job posting
2. Open browser console
3. Load adapter script
4. Call `LinkedInAdapter.extractJob()`
5. Verify warning modal appears
6. Confirm extraction works after acknowledgment

## Troubleshooting

### Extraction returns null

- Check if page has loaded completely (dynamic content)
- Verify Open Graph meta tags exist: `document.querySelector('meta[property="og:title"]')`
- Check console for error messages

### Warning modal not showing

- May have been previously acknowledged
- Call `LinkedInAdapter.resetWarning()` to reset

### Anti-bot detection triggered

- Ensure you're not calling extractJob() in a loop
- Avoid rapid repeated extractions
- Use reasonable delays between actions

## Legal Considerations

⚠️ **IMPORTANT:**

This adapter is designed to minimize risk but does not eliminate it. By using this code:

1. You acknowledge that LinkedIn's Terms of Service prohibit scraping
2. Users should be informed of potential risks
3. This is intended as a "bookmarking" tool, not a scraper
4. Consult legal counsel before deploying in production

See [linkedin-feasibility.md](../docs/linkedin-feasibility.md) for comprehensive legal analysis.

## Future Considerations

**DO NOT implement:**
- ❌ Auto-detection of job page visits
- ❌ Background syncing of "My Applications"
- ❌ LinkedIn-specific DOM selectors
- ❌ Session/cookie handling
- ❌ Rate limit bypassing
- ❌ Headless browser automation

**Potential improvements:**
- ✅ Better heuristics for title parsing
- ✅ Support for more job board sites
- ✅ Improved structured data extraction
- ✅ User-configurable extraction rules

## Changelog

### v1.0.0 (2026-03-14)
- Initial implementation
- Generic extraction using meta tags
- Warning modal with acknowledgment
- JSON-LD structured data support

## License

This adapter is provided as-is with no warranty. Use at your own risk.
