/**
 * Generic Adapter - Fallback for unknown sites
 * Uses heuristics: JSON-LD, meta tags, common selectors
 * Low confidence but works everywhere
 */
/**
 * Generic adapter that attempts to extract job data from any site
 * using standard structured data formats and common selectors
 */
export class GenericAdapter {
    domain = '*';
    name = 'Generic Adapter';
    version = '1.0.0';
    /**
     * Generic adapter can handle any URL, but with lowest priority
     */
    canHandle(url, document) {
        // Check if page has any job-related content indicators
        const indicators = [
            // Common job page URL patterns
            /job/i,
            /career/i,
            /position/i,
            /opening/i,
            /employment/i,
        ];
        const hasJobUrl = indicators.some(pattern => pattern.test(url));
        // Check for job-related structured data
        const hasJobPosting = this.hasJobPostingSchema(document);
        // Check for common job page elements
        const hasJobElements = this.hasJobPageIndicators(document);
        return hasJobUrl || hasJobPosting || hasJobElements;
    }
    /**
     * Extract job data using multiple fallback strategies
     */
    extract(document) {
        const url = document.location?.href || '';
        let confidence = 0;
        let company = '';
        let role = '';
        let location = '';
        let jobDescription = '';
        let externalJobId = '';
        const metadata = {};
        // Strategy 1: JSON-LD structured data (highest confidence)
        const jsonLdData = this.extractFromJsonLd(document);
        if (jsonLdData) {
            company = jsonLdData.company || company;
            role = jsonLdData.role || role;
            location = jsonLdData.location || location;
            jobDescription = jsonLdData.jobDescription || jobDescription;
            externalJobId = jsonLdData.externalJobId || externalJobId;
            confidence = Math.max(confidence, jsonLdData.confidence);
            metadata.jsonLd = true;
        }
        // Strategy 2: OpenGraph meta tags
        const ogData = this.extractFromOpenGraph(document);
        if (ogData) {
            if (!role && ogData.title) {
                role = this.cleanJobTitle(ogData.title);
            }
            if (!company && ogData.siteName) {
                company = ogData.siteName;
            }
            if (!jobDescription && ogData.description) {
                jobDescription = ogData.description;
            }
            confidence = Math.max(confidence, 0.3);
            metadata.openGraph = true;
        }
        // Strategy 3: Common job selectors
        const selectorData = this.extractFromSelectors(document);
        if (selectorData) {
            company = company || selectorData.company || '';
            role = role || selectorData.role || '';
            location = location || selectorData.location || '';
            jobDescription = jobDescription || selectorData.jobDescription || '';
            confidence = Math.max(confidence, selectorData.confidence);
            metadata.selectors = true;
        }
        // Strategy 4: Page metadata fallback
        if (!company) {
            company = this.extractCompanyFromDomain(url) || this.extractFromMetaSiteName(document) || 'Unknown Company';
        }
        if (!role) {
            role = this.extractTitleFromPage(document);
        }
        // Calculate final confidence
        confidence = this.calculateConfidence({ company, role, location, jobDescription, jsonLd: !!metadata.jsonLd });
        // Try to extract job ID from URL
        if (!externalJobId) {
            externalJobId = this.extractJobIdFromUrl(url);
        }
        return {
            company: company.trim(),
            role: role.trim(),
            location: location?.trim() || undefined,
            jobDescription: jobDescription?.trim() || undefined,
            jobUrl: url,
            externalJobId: externalJobId || undefined,
            confidence,
            metadata
        };
    }
    /**
     * Check if page has JobPosting schema
     */
    hasJobPostingSchema(document) {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent || '');
                const schemas = Array.isArray(data) ? data : [data];
                if (schemas.some(s => s['@type'] === 'JobPosting' || (s['@graph'] && s['@graph'].some((g) => g['@type'] === 'JobPosting')))) {
                    return true;
                }
            }
            catch {
                // Invalid JSON, skip
            }
        }
        return false;
    }
    /**
     * Check for common job page indicators
     */
    hasJobPageIndicators(document) {
        const selectors = [
            '[data-testid*="job"]',
            '[class*="job-" i]',
            '[class*="position-" i]',
            '[id*="job-" i]',
            '[id*="position-" i]',
            'h1:contains("Job")',
            '.job-description',
            '.position-description',
            'meta[name="description"][content*="job" i]'
        ];
        return selectors.some(selector => {
            try {
                return document.querySelector(selector) !== null;
            }
            catch {
                return false;
            }
        });
    }
    /**
     * Extract data from JSON-LD structured data
     */
    extractFromJsonLd(document) {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent || '');
                const schemas = Array.isArray(data) ? data : [data];
                for (const schema of schemas) {
                    // Handle @graph wrapper
                    const graph = schema['@graph'] || [schema];
                    for (const item of graph) {
                        if (item['@type'] === 'JobPosting') {
                            const result = {
                                confidence: 0.9
                            };
                            // Extract job title
                            if (item.title) {
                                result.role = item.title;
                            }
                            // Extract company
                            if (item.hiringOrganization) {
                                if (typeof item.hiringOrganization === 'string') {
                                    result.company = item.hiringOrganization;
                                }
                                else if (item.hiringOrganization.name) {
                                    result.company = item.hiringOrganization.name;
                                }
                            }
                            // Extract location
                            if (item.jobLocation) {
                                const loc = Array.isArray(item.jobLocation) ? item.jobLocation[0] : item.jobLocation;
                                if (loc.address) {
                                    if (typeof loc.address === 'string') {
                                        result.location = loc.address;
                                    }
                                    else {
                                        const parts = [loc.address.addressLocality, loc.address.addressRegion, loc.address.addressCountry]
                                            .filter(Boolean);
                                        if (parts.length > 0) {
                                            result.location = parts.join(', ');
                                        }
                                    }
                                }
                                else if (loc.name) {
                                    result.location = loc.name;
                                }
                            }
                            // Extract description
                            if (item.description) {
                                result.jobDescription = item.description;
                            }
                            // Extract job ID
                            if (item.identifier) {
                                if (typeof item.identifier === 'string') {
                                    result.externalJobId = item.identifier;
                                }
                                else if (item.identifier.value) {
                                    result.externalJobId = item.identifier.value;
                                }
                            }
                            return result;
                        }
                    }
                }
            }
            catch {
                // Invalid JSON, skip
            }
        }
        return null;
    }
    /**
     * Extract data from OpenGraph meta tags
     */
    extractFromOpenGraph(document) {
        const getMeta = (property) => {
            const meta = document.querySelector(`meta[property="og:${property}"], meta[name="og:${property}"]`);
            return meta?.getAttribute('content') || undefined;
        };
        const title = getMeta('title');
        const siteName = getMeta('site_name');
        const description = getMeta('description');
        if (title || siteName || description) {
            return { title, siteName, description };
        }
        return null;
    }
    /**
     * Extract data using common CSS selectors
     */
    extractFromSelectors(document) {
        const result = {};
        let confidence = 0.2;
        // Company selectors
        const companySelectors = [
            '[data-testid="company-name"]',
            '.company-name',
            '.employer-name',
            '.organization-name',
            'a[href*="/company/"]',
            '.company-info h1',
            '.company-info h2'
        ];
        for (const selector of companySelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent) {
                result.company = el.textContent.trim();
                confidence += 0.1;
                break;
            }
        }
        // Role selectors
        const roleSelectors = [
            '[data-testid="job-title"]',
            '.job-title',
            '.position-title',
            'h1[data-automation="job-title"]',
            'h1:contains("Engineer"), h1:contains("Manager"), h1:contains("Developer")',
            'header h1',
            '.posting-header h1'
        ];
        for (const selector of roleSelectors) {
            try {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    result.role = el.textContent.trim();
                    confidence += 0.15;
                    break;
                }
            }
            catch {
                // Invalid selector, skip
            }
        }
        // Location selectors
        const locationSelectors = [
            '[data-testid="job-location"]',
            '.job-location',
            '.location',
            '.position-location',
            '[data-automation="job-location"]'
        ];
        for (const selector of locationSelectors) {
            try {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    result.location = el.textContent.trim();
                    confidence += 0.1;
                    break;
                }
            }
            catch {
                // Invalid selector, skip
            }
        }
        // Description selectors
        const descriptionSelectors = [
            '[data-testid="job-description"]',
            '.job-description',
            '.description',
            '.posting-description',
            '[data-automation="job-description"]',
            '#job-description'
        ];
        for (const selector of descriptionSelectors) {
            try {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    result.jobDescription = el.textContent.trim();
                    confidence += 0.1;
                    break;
                }
            }
            catch {
                // Invalid selector, skip
            }
        }
        if (result.company || result.role) {
            return { ...result, confidence: Math.min(confidence, 0.6) };
        }
        return null;
    }
    /**
     * Extract company from domain
     */
    extractCompanyFromDomain(url) {
        try {
            const hostname = new URL(url).hostname;
            const parts = hostname.split('.');
            // Handle subdomains: jobs.company.com -> Company
            if (parts.length >= 2) {
                const domain = parts[parts.length - 2];
                // Capitalize first letter
                return domain.charAt(0).toUpperCase() + domain.slice(1);
            }
        }
        catch {
            // Invalid URL
        }
        return null;
    }
    /**
     * Extract site name from meta tag
     */
    extractFromMetaSiteName(document) {
        const meta = document.querySelector('meta[property="og:site_name"], meta[name="application-name"]');
        return meta?.getAttribute('content') || null;
    }
    /**
     * Extract job title from page
     */
    extractTitleFromPage(document) {
        // Try h1 first
        const h1 = document.querySelector('h1');
        if (h1?.textContent) {
            const title = h1.textContent.trim();
            // Clean up common suffixes
            return this.cleanJobTitle(title);
        }
        // Fall back to page title
        const pageTitle = document.title;
        if (pageTitle) {
            return this.cleanJobTitle(pageTitle);
        }
        return 'Unknown Position';
    }
    /**
     * Clean up job title by removing common suffixes
     */
    cleanJobTitle(title) {
        const suffixes = [
            ' | LinkedIn',
            ' | Indeed',
            ' | Glassdoor',
            ' - Careers',
            ' - Jobs',
            ' | Greenhouse',
            ' | Lever'
        ];
        let cleaned = title;
        for (const suffix of suffixes) {
            if (cleaned.endsWith(suffix)) {
                cleaned = cleaned.slice(0, -suffix.length);
            }
        }
        return cleaned.trim();
    }
    /**
     * Extract job ID from URL
     */
    extractJobIdFromUrl(url) {
        const patterns = [
            /[?&]jobId=([^&]+)/i,
            /[?&]jid=([^&]+)/i,
            /\/jobs\/(\d+)(?:\/|$)/,
            /\/job\/(\d+)(?:\/|$)/,
            /\/position\/(\d+)(?:\/|$)/,
            /\/postings\/(\w+)/,
            /\/apply\/(\w+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return '';
    }
    /**
     * Calculate overall confidence score
     */
    calculateConfidence(data) {
        let score = 0.1; // Base score
        if (data.company && data.company !== 'Unknown Company')
            score += 0.2;
        if (data.role && data.role !== 'Unknown Position')
            score += 0.2;
        if (data.location)
            score += 0.15;
        if (data.jobDescription)
            score += 0.15;
        if (data.jsonLd)
            score += 0.2;
        return Math.min(score, 0.7); // Cap at 0.7 for generic adapter
    }
}
/**
 * Singleton instance of the generic adapter
 */
export const genericAdapter = new GenericAdapter();
//# sourceMappingURL=generic-adapter.js.map