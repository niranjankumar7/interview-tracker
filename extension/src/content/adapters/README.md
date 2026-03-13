# Site Adapter Framework

The Site Adapter Framework provides a modular, extensible system for extracting job data from various job board websites.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Site Adapter  │────▶│   Registry   │────▶│  Extracted Data │
│   (per site)    │     │   (lookup)   │     │  (standardized) │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌──────────────┐
│ Generic Adapter │     │ Test Harness │
│   (fallback)    │     │  (validate)  │
└─────────────────┘     └──────────────┘
```

## Quick Start

### 1. Register Adapters

```typescript
import { registerAdapter } from './adapters/registry';
import { linkedInAdapter } from './adapters/linkedin-adapter';
import { greenhouseAdapter } from './adapters/greenhouse-adapter';
import { genericAdapter } from './adapters/generic-adapter';

// Register specific adapters (higher priority)
registerAdapter(linkedInAdapter, 10);
registerAdapter(greenhouseAdapter, 10);

// Register fallback generic adapter (lowest priority)
registerAdapter(genericAdapter, -1);
```

### 2. Find and Use Adapter

```typescript
import { findAdapter } from './adapters/registry';

const url = window.location.href;
const adapter = findAdapter(url, document);

if (adapter) {
  const jobData = adapter.extract(document);
  console.log(`Extracted: ${jobData.role} at ${jobData.company}`);
  console.log(`Confidence: ${jobData.confidence}`);
}
```

## Creating a New Adapter

Implement the `SiteAdapter` interface:

```typescript
import { SiteAdapter, ExtractedJobData } from './adapters/types';

export class MySiteAdapter implements SiteAdapter {
  domain = '*.mysite.com';  // Supports wildcards
  name = 'MySite Adapter';
  version = '1.0.0';

  canHandle(url: string, document: Document): boolean {
    // Return true if this adapter can extract from this URL/page
    return url.includes('jobs') && 
           document.querySelector('.job-details') !== null;
  }

  extract(document: Document): ExtractedJobData {
    // Extract data from the page
    return {
      company: document.querySelector('.company')?.textContent || '',
      role: document.querySelector('.title')?.textContent || '',
      location: document.querySelector('.location')?.textContent,
      jobDescription: document.querySelector('.description')?.innerHTML,
      jobUrl: document.location.href,
      externalJobId: this.extractJobId(document.location.href),
      confidence: 0.85,  // 0-1 based on extraction quality
      metadata: { source: 'mysite' }
    };
  }

  private extractJobId(url: string): string {
    const match = url.match(/\/jobs\/(\d+)/);
    return match ? match[1] : '';
  }
}
```

Then register it:

```typescript
import { registerAdapter } from './adapters/registry';
import { mySiteAdapter } from './adapters/mysite-adapter';

registerAdapter(mySiteAdapter);
```

## Generic Adapter

The `GenericAdapter` serves as a fallback for unknown sites. It uses:

1. **JSON-LD Structured Data** - Highest confidence (0.9)
2. **OpenGraph Meta Tags** - Medium confidence (0.3)
3. **Common CSS Selectors** - Low confidence (0.2-0.6)
4. **Page Metadata** - Lowest confidence (<0.3)

```typescript
import { genericAdapter } from './adapters/generic-adapter';

// Always works but with lower confidence
const jobData = genericAdapter.extract(document);
```

## Testing

Use the test harness to validate adapters:

```typescript
import { AdapterTestHarness } from '../tests/adapter-test-harness';
import { linkedInAdapter } from './adapters/linkedin-adapter';

const harness = new AdapterTestHarness();

const testCase = {
  name: 'LinkedIn Job Page',
  url: 'https://www.linkedin.com/jobs/view/12345',
  fixture: `
    <html>
      <body>
        <h1 class="job-title">Software Engineer</h1>
        <div class="company">TechCorp</div>
      </body>
    </html>
  `,
  expected: {
    company: 'TechCorp',
    role: 'Software Engineer'
  },
  minConfidence: 0.5
};

const results = harness.runAdapterTests(linkedInAdapter, [testCase]);
console.log(harness.generateReport());
```

### Version Checking

Track adapter versions to detect breaking changes:

```typescript
import { AdapterVersionChecker } from '../tests/adapter-test-harness';

const checker = new AdapterVersionChecker();
checker.registerExpectedVersion('LinkedIn Adapter', '1.0.0');

const versionCheck = checker.checkVersions([linkedInAdapter]);
// [{ adapter: 'LinkedIn Adapter', current: '1.0.0', expected: '1.0.0', match: true }]
```

## Domain Matching

The registry supports flexible domain matching:

| Pattern | Matches |
|---------|---------|
| `linkedin.com` | `linkedin.com`, `www.linkedin.com` |
| `*.greenhouse.io` | `stripe.greenhouse.io`, `airbnb.greenhouse.io` |
| `jobs.lever.co` | Exact match only |

## API Reference

### Types

```typescript
interface SiteAdapter {
  domain: string;
  name: string;
  version: string;
  canHandle(url: string, document: Document): boolean;
  extract(document: Document): ExtractedJobData;
}

interface ExtractedJobData {
  company: string;
  role: string;
  location?: string;
  jobDescription?: string;
  jobUrl: string;
  externalJobId?: string;
  confidence: number;
  metadata: Record<string, unknown>;
}
```

### Registry Functions

| Function | Description |
|----------|-------------|
| `registerAdapter(adapter, priority?)` | Register an adapter |
| `findAdapter(url, document)` | Find matching adapter |
| `getAllAdapters()` | Get all registered adapters |
| `AdapterRegistry.reset()` | Clear all adapters (for testing) |

## Included Adapters

| Adapter | Domain | Status |
|---------|--------|--------|
| LinkedIn | `linkedin.com` | ✅ Implemented |
| Greenhouse | `*.greenhouse.io` | ✅ Implemented |
| Generic | `*` (fallback) | ✅ Implemented |

## Acceptance Criteria

- ✅ New site adapter can be added by implementing `SiteAdapter` interface + registering
- ✅ Generic adapter works on unknown sites with low confidence
- ✅ Tests can be run for each adapter using the test harness
- ✅ Domain matching supports wildcards (e.g., `*.greenhouse.io`)
- ✅ Version tracking for detecting breaking changes
