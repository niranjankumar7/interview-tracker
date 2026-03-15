/**
 * SmartRecruiters ATS Adapter
 *
 * Handles job extraction from SmartRecruiters-powered career pages
 *
 * Sample URLs:
 * - https://jobs.smartrecruiters.com/CompanyName/1234567890-job-title
 * - https://jobs.smartrecruiters.com/CompanyName
 * - https://careers.smartrecruiters.com/CompanyName
 * - https://www.smartrecruiters.com/careers/company-name
 *
 * SmartRecruiters DOM Structure:
 * - Job Title: .job-title or h1
 * - Company: .company-name or from URL/meta
 * - Location: .job-location or .location
 * - Description: .job-description or .description
 */
export class SmartRecruitersAdapter {
    domain = '*.smartrecruiters.com';
    name = 'SmartRecruiters Adapter';
    version = '1.0.0';
    canHandle(url, _document) {
        const urlObj = new URL(url);
        // Check domain matches
        if (!urlObj.hostname.endsWith('smartrecruiters.com')) {
            return false;
        }
        // Additional check: ensure we're on a job page or careers page
        // SmartRecruiters job URLs typically have a job ID pattern
        const pathname = urlObj.pathname;
        const isJobPage = pathname.includes('/job/') ||
            pathname.includes('/jobs/') ||
            pathname.includes('/careers/') ||
            pathname.includes('/Job/') ||
            // Match numeric job ID pattern: /1234567890-job-title
            /\/\d+-[a-z0-9-]+$/i.test(pathname);
        return isJobPage;
    }
    extract(document) {
        const url = document.location?.href || '';
        const company = this.extractCompany(document, url);
        const role = this.extractRole(document);
        const location = this.extractLocation(document);
        const jobDescription = this.extractDescription(document);
        const jobId = this.extractJobId(url, document);
        const confidence = this.calculateConfidence({ company, role, location, jobDescription });
        return {
            company: company || 'Unknown Company',
            role: role || 'Unknown Position',
            location: location || undefined,
            jobDescription: jobDescription || undefined,
            jobUrl: url,
            externalJobId: jobId,
            confidence,
            metadata: {
                source: 'smartrecruiters.com',
                platform: 'SmartRecruiters',
                hasDescription: !!jobDescription,
                hasLocation: !!location,
            }
        };
    }
    extractCompany(document, url) {
        // Try DOM selectors
        const selectors = [
            '.company-name',
            '.employer-name',
            '.org-name',
            '.organization-name',
            '[data-testid="company-name"]',
            'header .company',
            '.job-header .company',
            '.sr-company-name',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent)
                return el.textContent.trim();
        }
        // Try meta tags
        const metaOrg = document.querySelector('meta[property="og:site_name"]');
        if (metaOrg) {
            const content = metaOrg.getAttribute('content');
            if (content)
                return content;
        }
        // Extract from URL: jobs.smartrecruiters.com/CompanyName/...
        const match = url.match(/(?:jobs|careers)\.smartrecruiters\.com\/([^\/]+)/);
        if (match) {
            // Convert slug to readable name (handle camelCase or hyphenated)
            const slug = match[1];
            // Try to split camelCase
            const withSpaces = slug
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/-/g, ' ')
                .replace(/_/g, ' ');
            return withSpaces.replace(/\b\w/g, c => c.toUpperCase());
        }
        return null;
    }
    extractRole(document) {
        const selectors = [
            '.job-title',
            '.jobTitle',
            '[data-testid="job-title"]',
            '.position-title',
            '.posting-title',
            'h1',
            'h2',
            '.sr-job-title',
            '.title',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent)
                return el.textContent.trim();
        }
        return null;
    }
    extractLocation(document) {
        const selectors = [
            '.job-location',
            '.jobLocation',
            '[data-testid="job-location"]',
            '.location',
            '.job-meta .location',
            '.sr-location',
            '.posting-location',
            '.position-location',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent)
                return el.textContent.trim();
        }
        return null;
    }
    extractDescription(document) {
        const selectors = [
            '.job-description',
            '.jobDescription',
            '[data-testid="job-description"]',
            '.description',
            '.posting-description',
            '.position-description',
            '.sr-description',
            'article',
            '.details',
            '.job-details',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
                return el.textContent.trim().substring(0, 2000);
            }
        }
        // Fallback: look for main content area
        const main = document.querySelector('main, .main-content, .content');
        if (main) {
            // Try to find the largest text block
            const paragraphs = main.querySelectorAll('p');
            if (paragraphs.length > 0) {
                const combined = Array.from(paragraphs)
                    .map(p => p.textContent?.trim())
                    .filter((text) => !!text)
                    .join('\n\n');
                if (combined.length > 100) {
                    return combined.substring(0, 2000);
                }
            }
        }
        return null;
    }
    extractJobId(url, document) {
        // Try to find job ID in meta tags or data attributes first
        const jobIdMeta = document.querySelector('meta[name="job-id"]');
        if (jobIdMeta) {
            const content = jobIdMeta.getAttribute('content');
            if (content)
                return content;
        }
        // SmartRecruiters URLs: /CompanyName/1234567890-job-title
        const match = url.match(/\/(\d+)-[a-z0-9-]+$/i);
        if (match) {
            return match[1];
        }
        // Alternative pattern: /job/1234567890
        const jobMatch = url.match(/\/job[s]?\/(\d+)/i);
        if (jobMatch) {
            return jobMatch[1];
        }
        // Another pattern: /Job/Index/1234
        const indexMatch = url.match(/\/Job\/Index\/(\d+)/i);
        if (indexMatch) {
            return indexMatch[1];
        }
        return undefined;
    }
    calculateConfidence(data) {
        let confidence = 0.45; // Base confidence for SmartRecruiters (slightly lower due to variability)
        if (data.company)
            confidence += 0.15;
        if (data.role)
            confidence += 0.2;
        if (data.location)
            confidence += 0.1;
        if (data.jobDescription)
            confidence += 0.05;
        return Math.min(confidence, 0.95);
    }
}
export const smartRecruitersAdapter = new SmartRecruitersAdapter();
export default SmartRecruitersAdapter;
//# sourceMappingURL=smartrecruiters-adapter.js.map