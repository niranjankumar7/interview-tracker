/**
 * Content script for extracting job data from web pages
 * Runs on all job posting pages
 */
import { findAdapter } from './adapters/index';
/**
 * Check if current page looks like a job posting
 */
function isJobPostingPage() {
    const url = window.location.href;
    const title = document.title.toLowerCase();
    // URL patterns
    const jobPatterns = [
        /\/job\//i,
        /\/jobs\//i,
        /\/careers\//i,
        /\/position\//i,
        /\/opening/i,
        /greenhouse\.io/i,
        /lever\.co/i,
        /ashbyhq\.com/i,
        /smartrecruiters\.com/i,
    ];
    const hasJobUrl = jobPatterns.some(pattern => pattern.test(url));
    // Title keywords
    const titleKeywords = ['job', 'career', 'position', 'opening', 'engineer', 'developer', 'manager'];
    const hasJobTitle = titleKeywords.some(keyword => title.includes(keyword));
    return hasJobUrl || hasJobTitle;
}
/**
 * Extract job data from current page
 */
function extractJobData() {
    const adapter = findAdapter(window.location.href, document);
    if (!adapter) {
        return null;
    }
    return adapter.extract(document);
}
// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_JOB') {
        try {
            // Check if this looks like a job page
            if (!isJobPostingPage()) {
                sendResponse({
                    success: false,
                    error: 'This does not appear to be a job posting page.',
                });
                return true;
            }
            // Extract job data
            const result = extractJobData();
            if (!result) {
                sendResponse({
                    success: false,
                    error: 'Could not extract job data from this page.',
                });
                return true;
            }
            sendResponse({
                success: true,
                data: {
                    company: result.company,
                    role: result.role,
                    location: result.location,
                    jobUrl: result.jobUrl,
                    jobDescription: result.jobDescription,
                    confidence: result.confidence,
                },
            });
        }
        catch (error) {
            console.error('Extraction error:', error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown extraction error',
            });
        }
    }
    return true; // Keep channel open for async
});
// Notify background script that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
//# sourceMappingURL=extractor.js.map