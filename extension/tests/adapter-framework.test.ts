/**
 * Adapter Framework Tests
 * Example test cases demonstrating the test harness
 */

import { AdapterTestHarness, AdapterTestCase, AdapterVersionChecker } from './adapter-test-harness';
import { AdapterRegistry, registerAdapter } from '../src/content/adapters/registry';
import { GenericAdapter, genericAdapter } from '../src/content/adapters/generic-adapter';
import { linkedInAdapter } from '../src/content/adapters/linkedin-adapter';
import { greenhouseAdapter } from '../src/content/adapters/greenhouse-adapter';

describe('Adapter Framework', () => {
  let harness: AdapterTestHarness;

  beforeEach(() => {
    AdapterRegistry.reset();
    harness = new AdapterTestHarness();
  });

  describe('Registry', () => {
    test('should register and find adapter', () => {
      registerAdapter(linkedInAdapter);
      
      const html = `
        <!DOCTYPE html>
        <html><body></body></html>
      `;
      const doc = createMockDoc(html, 'https://www.linkedin.com/jobs/view/12345');
      const adapter = AdapterRegistry.getInstance().findAdapter('https://www.linkedin.com/jobs/view/12345', doc);
      
      expect(adapter).toBe(linkedInAdapter);
    });

    test('should support wildcard domain matching', () => {
      registerAdapter(greenhouseAdapter);
      
      const html = `
        <!DOCTYPE html>
        <html><body></body></html>
      `;
      const doc = createMockDoc(html, 'https://stripe.greenhouse.io/jobs/12345');
      const adapter = AdapterRegistry.getInstance().findAdapter('https://stripe.greenhouse.io/jobs/12345', doc);
      
      expect(adapter).toBe(greenhouseAdapter);
    });

    test('should return all adapters', () => {
      registerAdapter(linkedInAdapter);
      registerAdapter(greenhouseAdapter);
      registerAdapter(genericAdapter, -1);
      
      const all = AdapterRegistry.getInstance().getAllAdapters();
      expect(all).toHaveLength(3);
    });
  });

  describe('Generic Adapter', () => {
    test('should extract from JSON-LD', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Software Engineer",
              "hiringOrganization": { "name": "Test Corp" },
              "jobLocation": { 
                "address": { "addressLocality": "New York", "addressRegion": "NY" }
              }
            }
            </script>
          </head>
          <body></body>
        </html>
      `;
      const doc = createMockDoc(html, 'https://example.com/job/123');
      const result = genericAdapter.extract(doc);
      
      expect(result.company).toBe('Test Corp');
      expect(result.role).toBe('Software Engineer');
      expect(result.location).toBe('New York, NY');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should extract from OpenGraph tags', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Product Manager at Startup">
            <meta property="og:site_name" content="Startup Inc">
            <meta property="og:description" content="Join our team...">
          </head>
          <body></body>
        </html>
      `;
      const doc = createMockDoc(html, 'https://startup.com/careers/pm');
      const result = genericAdapter.extract(doc);
      
      expect(result.role).toContain('Product Manager');
      expect(result.company).toBe('Startup Inc');
    });

    test('should fallback to page title when no structured data', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Senior Developer | TechCorp</title></head>
          <body><h1>Senior Developer</h1></body>
        </html>
      `;
      const doc = createMockDoc(html, 'https://techcorp.com/jobs/123');
      const result = genericAdapter.extract(doc);
      
      expect(result.role).toBe('Senior Developer');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Test Harness', () => {
    test('should run test cases and generate report', () => {
      const testCase: AdapterTestCase = {
        name: 'LinkedIn Job Page',
        url: 'https://www.linkedin.com/jobs/view/12345',
        fixture: `
          <!DOCTYPE html>
          <html>
            <body>
              <h1 class="job-details-jobs-unified-top-card__job-title">
                Senior Software Engineer
              </h1>
              <div class="job-details-jobs-unified-top-card__company-name">
                <a href="/company/acme">Acme Corp</a>
              </div>
            </body>
          </html>
        `,
        expected: {
          company: 'Acme Corp',
          role: 'Senior Software Engineer'
        },
        minConfidence: 0.5
      };

      const results = harness.runAdapterTests(linkedInAdapter, [testCase]);
      
      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
      expect(results[0].extracted?.role).toBe('Senior Software Engineer');
    });

    test('should detect failing tests', () => {
      const testCase: AdapterTestCase = {
        name: 'Failing Test',
        url: 'https://example.com',
        fixture: `
          <!DOCTYPE html>
          <html><body>No job content here</body></html>
        `,
        expected: {
          company: 'Expected Company',
          role: 'Expected Role'
        },
        minConfidence: 0.9
      };

      const results = harness.runAdapterTests(genericAdapter, [testCase]);
      
      expect(results[0].passed).toBe(false);
      expect(results[0].error).toBeDefined();
    });
  });

  describe('Version Checking', () => {
    test('should detect version mismatches', () => {
      const checker = new AdapterVersionChecker();
      checker.registerExpectedVersion('LinkedIn Adapter', '2.0.0');
      
      const versions = checker.checkVersions([linkedInAdapter]);
      
      expect(versions[0].match).toBe(false);
      expect(versions[0].current).toBe('1.0.0');
      expect(versions[0].expected).toBe('2.0.0');
    });
  });
});

/**
 * Helper to create mock document for Node.js environment
 */
function createMockDoc(html: string, url: string): Document {
  // In real tests, this would use JSDOM or similar
  // This is a simplified version for demonstration
  return {
    location: { href: url },
    querySelector: (selector: string) => null,
    querySelectorAll: (selector: string) => [],
    title: ''
  } as unknown as Document;
}
