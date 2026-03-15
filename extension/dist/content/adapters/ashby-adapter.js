/**
 * Ashby ATS Adapter
 *
 * Handles job extraction from Ashby-powered career pages
 * Ashby provides both JSON API and structured HTML
 *
 * Sample URLs:
 * - https://jobs.ashbyhq.com/company-name/12345678-1234-1234-1234-123456789abc
 * - https://jobs.ashbyhq.com/company-name
 * - https://jobs.ashbyhq.com/anthropic
 *
 * Ashby DOM Structure:
 * - Job Title: h1 or [data-testid="job-title"]
 * - Company: .company-name or from URL/meta
 * - Location: .location or [data-testid="job-location"]
 * - Description: .job-description or .description
 *
 * Ashby also exposes job data via window.__ASHBY__ or API calls
 */
export class AshbyAdapter {
    domain = 'jobs.ashbyhq.com';
    name = 'Ashby Adapter';
    version = '1.0.0';
    canHandle(url, _document) {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('jobs.ashbyhq.com');
    }
    /**
     * Try to get job data from Ashby's embedded data or API
     */
    getAshbyJobData(document) {
        // Try to find embedded data in the page
        // Ashby sometimes exposes data via window.__ASHBY__
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ashbyData = window.__ASHBY__;
            if (ashbyData?.job) {
                return ashbyData.job;
            }
        }
        catch {
            // Ignore errors
        }
        // Try to find JSON data in script tags
        const scripts = document.querySelectorAll('script[type="application/json"]');
        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent || '{}');
                if (data.job || data.jobPosting) {
                    return (data.job || data.jobPosting);
                }
                // Check for nested props
                if (data.props?.pageProps?.job) {
                    return data.props.pageProps.job;
                }
            }
            catch {
                // Invalid JSON, skip
            }
        }
        return null;
    }
    extract(document) {
        const url = document.location?.href || '';
        // Try to get structured data first
        const ashbyData = this.getAshbyJobData(document);
        const company = this.extractCompany(document, url, ashbyData);
        const role = this.extractRole(document, ashbyData);
        const location = this.extractLocation(document, ashbyData);
        const jobDescription = this.extractDescription(document, ashbyData);
        const jobId = this.extractJobId(url, ashbyData);
        const confidence = this.calculateConfidence({ company, role, location, jobDescription, hasStructuredData: !!ashbyData });
        return {
            company: company || 'Unknown Company',
            role: role || 'Unknown Position',
            location: location || undefined,
            jobDescription: jobDescription || undefined,
            jobUrl: url,
            externalJobId: jobId,
            confidence,
            metadata: {
                source: 'jobs.ashbyhq.com',
                platform: 'Ashby',
                hasStructuredData: !!ashbyData,
                hasDescription: !!jobDescription,
                hasLocation: !!location,
            }
        };
    }
    extractCompany(document, url, ashbyData) {
        // Try embedded data first
        if (ashbyData?.company?.name) {
            return ashbyData.company.name;
        }
        if (ashbyData?.organization?.name) {
            return ashbyData.organization.name;
        }
        // Try DOM selectors
        const selectors = [
            '.company-name',
            '[data-testid="company-name"]',
            '.ashby-company-name',
            '.org-name',
            'header h1',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent)
                return el.textContent.trim();
        }
        // Extract from URL: jobs.ashbyhq.com/company-name/
        const match = url.match(/jobs\.ashbyhq\.com\/([^\/]+)/);
        if (match) {
            // Convert slug to readable name
            return match[1]
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
        }
        // Try meta tags
        const metaOrg = document.querySelector('meta[property="og:site_name"]');
        if (metaOrg) {
            const content = metaOrg.getAttribute('content');
            if (content)
                return content;
        }
        return null;
    }
    extractRole(document, ashbyData) {
        // Try embedded data first
        if (ashbyData?.title) {
            return ashbyData.title;
        }
        if (ashbyData?.jobTitle) {
            return ashbyData.jobTitle;
        }
        // Try DOM selectors
        const selectors = [
            '[data-testid="job-title"]',
            'h1',
            '.job-title',
            '.ashby-job-title',
            '.posting-title',
            'h2',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent)
                return el.textContent.trim();
        }
        return null;
    }
    extractLocation(document, ashbyData) {
        // Try embedded data first
        if (ashbyData?.location) {
            return ashbyData.location;
        }
        if (ashbyData?.locationName) {
            return ashbyData.locationName;
        }
        if (ashbyData?.locations && ashbyData.locations.length > 0) {
            return ashbyData.locations.join(', ');
        }
        // Try DOM selectors
        const selectors = [
            '[data-testid="job-location"]',
            '.location',
            '.job-location',
            '.ashby-location',
            '.posting-location',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent)
                return el.textContent.trim();
        }
        return null;
    }
    extractDescription(document, ashbyData) {
        // Try embedded data first
        if (ashbyData?.description) {
            return ashbyData.description;
        }
        if (ashbyData?.jobDescription) {
            return ashbyData.jobDescription;
        }
        if (ashbyData?.descriptionHtml) {
            // Strip HTML tags
            const div = document.createElement('div');
            div.innerHTML = ashbyData.descriptionHtml;
            return div.textContent || null;
        }
        // Try DOM selectors
        const selectors = [
            '[data-testid="job-description"]',
            '.job-description',
            '.description',
            '.ashby-description',
            '.posting-description',
            'article',
            'main',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
                return el.textContent.trim().substring(0, 2000);
            }
        }
        return null;
    }
    extractJobId(url, ashbyData) {
        // Try embedded data first
        if (ashbyData?.id) {
            return ashbyData.id;
        }
        // Ashby uses UUID-style job IDs in URL
        const match = url.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        return match ? match[1] : undefined;
    }
    calculateConfidence(data) {
        let confidence = 0.5; // Base confidence for Ashby
        if (data.hasStructuredData)
            confidence += 0.1; // Bonus for structured data
        if (data.company)
            confidence += 0.15;
        if (data.role)
            confidence += 0.15;
        if (data.location)
            confidence += 0.05;
        if (data.jobDescription)
            confidence += 0.05;
        return Math.min(confidence, 0.98);
    }
}
export const ashbyAdapter = new AshbyAdapter();
export default AshbyAdapter;
//# sourceMappingURL=ashby-adapter.js.map