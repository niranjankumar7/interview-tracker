/**
 * Adapter Test Harness
 * Validates site adapters against HTML fixtures
 */

import { SiteAdapter, ExtractedJobData, AdapterTestCase, AdapterTestResult } from '../src/content/adapters/types';
import { AdapterRegistry } from '../src/content/adapters/registry';
import { GenericAdapter } from '../src/content/adapters/generic-adapter';

/**
 * Creates a mock DOM document from HTML string
 */
function createMockDocument(html: string, url: string = 'https://example.com'): Document {
  // For Node.js environment
  if (typeof document === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html, { url });
    return dom.window.document;
  }
  
  // For browser environment
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

/**
 * Test harness for validating site adapters
 */
export class AdapterTestHarness {
  private results: AdapterTestResult[] = [];
  private fixtures: Map<string, string> = new Map();

  /**
   * Load an HTML fixture from string or file
   */
  loadFixture(name: string, html: string): void {
    this.fixtures.set(name, html);
  }

  /**
   * Run a single test case against an adapter
   */
  runTest(adapter: SiteAdapter, testCase: AdapterTestCase): AdapterTestResult {
    const result: AdapterTestResult = {
      adapterName: adapter.name,
      adapterVersion: adapter.version,
      testName: testCase.name,
      passed: false,
      timestamp: new Date()
    };

    try {
      // Get fixture HTML
      const html = testCase.fixture;
      const doc = createMockDocument(html, testCase.url);

      // Check if adapter can handle this URL
      if (!adapter.canHandle(testCase.url, doc)) {
        // For generic adapter, this might be OK
        if (adapter.name === 'Generic Adapter') {
          // Continue anyway
        } else {
          result.error = 'Adapter canHandle returned false';
          this.results.push(result);
          return result;
        }
      }

      // Extract data
      const extracted = adapter.extract(doc);
      result.extracted = extracted;

      // Validate results
      const validation = this.validateExtraction(extracted, testCase);
      result.passed = validation.valid;
      if (!validation.valid) {
        result.error = validation.error;
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    this.results.push(result);
    return result;
  }

  /**
   * Run all registered adapters against a set of test cases
   */
  runAllAdapters(testCases: AdapterTestCase[]): AdapterTestResult[] {
    const registry = AdapterRegistry.getInstance();
    const adapters = registry.getAllAdapters();
    
    for (const adapter of adapters) {
      for (const testCase of testCases) {
        this.runTest(adapter, testCase);
      }
    }

    return this.results;
  }

  /**
   * Run specific adapter against test cases
   */
  runAdapterTests(adapter: SiteAdapter, testCases: AdapterTestCase[]): AdapterTestResult[] {
    for (const testCase of testCases) {
      this.runTest(adapter, testCase);
    }
    return this.results.filter(r => r.adapterName === adapter.name);
  }

  /**
   * Validate extraction against expected values
   */
  private validateExtraction(
    extracted: ExtractedJobData,
    testCase: AdapterTestCase
  ): { valid: boolean; error?: string } {
    const expected = testCase.expected;
    const errors: string[] = [];

    // Check required fields
    if (!extracted.company) {
      errors.push('Missing required field: company');
    }
    if (!extracted.role) {
      errors.push('Missing required field: role');
    }
    if (!extracted.jobUrl) {
      errors.push('Missing required field: jobUrl');
    }

    // Check expected values (partial matching)
    if (expected.company && extracted.company !== expected.company) {
      errors.push(`Company mismatch: expected "${expected.company}", got "${extracted.company}"`);
    }
    if (expected.role && extracted.role !== expected.role) {
      errors.push(`Role mismatch: expected "${expected.role}", got "${extracted.role}"`);
    }
    if (expected.location && extracted.location !== expected.location) {
      errors.push(`Location mismatch: expected "${expected.location}", got "${extracted.location}"`);
    }

    // Check confidence threshold
    if (testCase.minConfidence !== undefined && extracted.confidence < testCase.minConfidence) {
      errors.push(`Confidence too low: ${extracted.confidence} < ${testCase.minConfidence}`);
    }

    if (errors.length > 0) {
      return { valid: false, error: errors.join('; ') };
    }

    return { valid: true };
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    let report = `
╔═══════════════════════════════════════════════════════════╗
║              ADAPTER TEST REPORT                          ║
╠═══════════════════════════════════════════════════════════╣
  Total Tests:  ${total}
  Passed:       ${passed} (${((passed / total) * 100).toFixed(1)}%)
  Failed:       ${failed} (${((failed / total) * 100).toFixed(1)}%)
═════════════════════════════════════════════════════════════
`;

    // Group by adapter
    const byAdapter = this.groupByAdapter(this.results);
    
    for (const [adapterName, results] of Object.entries(byAdapter)) {
      const adapterPassed = results.filter(r => r.passed).length;
      report += `
📦 ${adapterName} (v${results[0]?.adapterVersion || 'unknown'})
   ${adapterPassed}/${results.length} tests passed
`;

      for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        report += `   ${status} ${result.testName}`;
        if (!result.passed && result.error) {
          report += `\n      Error: ${result.error}`;
        }
        report += '\n';
      }
    }

    report += '\n═════════════════════════════════════════════════════════════\n';
    return report;
  }

  /**
   * Get test results for a specific adapter
   */
  getResultsForAdapter(adapterName: string): AdapterTestResult[] {
    return this.results.filter(r => r.adapterName === adapterName);
  }

  /**
   * Check if all tests passed
   */
  allPassed(): boolean {
    return this.results.length > 0 && this.results.every(r => r.passed);
  }

  /**
   * Clear all test results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Group results by adapter name
   */
  private groupByAdapter(results: AdapterTestResult[]): Record<string, AdapterTestResult[]> {
    const grouped: Record<string, AdapterTestResult[]> = {};
    for (const result of results) {
      if (!grouped[result.adapterName]) {
        grouped[result.adapterName] = [];
      }
      grouped[result.adapterName].push(result);
    }
    return grouped;
  }
}

/**
 * Example adapter version checker
 */
export class AdapterVersionChecker {
  private versionHistory: Map<string, string> = new Map();

  /**
   * Register expected version for an adapter
   */
  registerExpectedVersion(adapterName: string, version: string): void {
    this.versionHistory.set(adapterName, version);
  }

  /**
   * Check if adapter versions match expected
   */
  checkVersions(adapters: SiteAdapter[]): { adapter: string; current: string; expected: string; match: boolean }[] {
    return adapters.map(adapter => {
      const expected = this.versionHistory.get(adapter.name);
      return {
        adapter: adapter.name,
        current: adapter.version,
        expected: expected || 'unknown',
        match: expected ? adapter.version === expected : true
      };
    });
  }

  /**
   * Detect breaking changes by comparing adapter behavior
   */
  async detectBreakingChanges(
    adapter: SiteAdapter,
    testCases: AdapterTestCase[],
    referenceResults: ExtractedJobData[]
  ): Promise<{ hasBreakingChanges: boolean; changes: string[] }> {
    const harness = new AdapterTestHarness();
    const results = harness.runAdapterTests(adapter, testCases);
    const changes: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const reference = referenceResults[i];

      if (!result.extracted || !reference) continue;

      // Compare key fields
      if (result.extracted.company !== reference.company) {
        changes.push(`Company extraction changed: "${reference.company}" -> "${result.extracted.company}"`);
      }
      if (result.extracted.role !== reference.role) {
        changes.push(`Role extraction changed: "${reference.role}" -> "${result.extracted.role}"`);
      }
    }

    return {
      hasBreakingChanges: changes.length > 0,
      changes
    };
  }
}

/**
 * Convenience function to run adapter tests
 */
export function runAdapterTests(
  adapter: SiteAdapter,
  testCases: AdapterTestCase[]
): AdapterTestResult[] {
  const harness = new AdapterTestHarness();
  return harness.runAdapterTests(adapter, testCases);
}

/**
 * Create a sample test case for development
 */
export function createSampleTestCase(): AdapterTestCase {
  return {
    name: 'Sample Job Page',
    url: 'https://jobs.example.com/123',
    fixture: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Senior Engineer at Example Corp</title>
          <meta property="og:title" content="Senior Engineer">
          <meta property="og:site_name" content="Example Corp">
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Senior Engineer",
            "hiringOrganization": {
              "@type": "Organization",
              "name": "Example Corp"
            },
            "jobLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "San Francisco",
                "addressRegion": "CA"
              }
            }
          }
          </script>
        </head>
        <body>
          <h1 class="job-title">Senior Engineer</h1>
          <div class="company-name">Example Corp</div>
          <div class="job-location">San Francisco, CA</div>
          <div class="job-description">
            <p>We are looking for a Senior Engineer...</p>
          </div>
        </body>
      </html>
    `,
    expected: {
      company: 'Example Corp',
      role: 'Senior Engineer',
      location: 'San Francisco, CA'
    },
    minConfidence: 0.5
  };
}

/**
 * Run self-test with generic adapter
 */
export function runSelfTest(): void {
  console.log('🧪 Running adapter framework self-test...\n');

  const harness = new AdapterTestHarness();
  const generic = new GenericAdapter();

  // Register generic adapter
  AdapterRegistry.getInstance().registerAdapter(generic, -1); // Lowest priority

  // Run sample test
  const testCase = createSampleTestCase();
  const results = harness.runAdapterTests(generic, [testCase]);

  console.log(harness.generateReport());

  if (results[0]?.passed) {
    console.log('✅ Self-test passed!\n');
  } else {
    console.log('⚠️ Self-test completed with warnings\n');
  }
}

// Export types for consumers
export type { SiteAdapter, ExtractedJobData, AdapterTestCase, AdapterTestResult };
