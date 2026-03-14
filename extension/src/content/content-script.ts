/**
 * Content Script for Interview Tracker Extension
 * Runs on all web pages to extract job interview information
 * Now with telemetry tracking for extraction accuracy
 */

import { findAdapter } from './adapters/index';
import { generateFingerprint, isDuplicate } from '../shared/dedupe.js';
import {
  startExtractionTracking,
  trackSave,
  trackDuplicate,
  type TelemetryEvent
} from '../shared/telemetry.js';
import type { ExtractedJobData } from './adapters/types';

console.log('[Interview Tracker] Content script loaded on:', window.location.href);

// Track active extraction for telemetry
let activeExtraction: ReturnType<typeof startExtractionTracking> | null = null;

/**
 * Extract page information
 */
function extractPageInfo() {
  const url = window.location.href;
  const title = document.title;
  const domain = window.location.hostname;
  
  // Try to find job-related information
  const jobTitle = extractJobTitle();
  const companyName = extractCompanyName();
  
  return {
    url,
    title,
    domain,
    jobTitle,
    companyName,
    extractedAt: new Date().toISOString()
  };
}

/**
 * Attempt to extract job title from common selectors
 */
function extractJobTitle() {
  const selectors = [
    'h1[data-testid="job-title"]',
    'h1.job-title',
    '[class*="job-title"]',
    'h1',
    '[data-automation="job-title"]'
  ];
  
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    } catch {
      // Invalid selector, continue
    }
  }
  
  return undefined;
}

/**
 * Attempt to extract company name from common selectors
 */
function extractCompanyName() {
  const selectors = [
    '[data-testid="company-name"]',
    '.company-name',
    '[class*="company"]',
    '[data-automation="company-name"]'
  ];
  
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    } catch {
      // Invalid selector, continue
    }
  }
  
  // Try to extract from domain for known job sites
  const domain = window.location.hostname;
  const knownSites: Record<string, string> = {
    'linkedin.com': 'LinkedIn',
    'indeed.com': 'Indeed',
    'glassdoor.com': 'Glassdoor',
    'angel.co': 'AngelList',
    'greenhouse.io': 'Greenhouse'
  };
  
  for (const [site, name] of Object.entries(knownSites)) {
    if (domain.includes(site)) {
      return name;
    }
  }
  
  return undefined;
}

/**
 * Extract job data using the appropriate adapter
 * Includes telemetry tracking
 */
async function extractJobData(): Promise<{
  data: ExtractedJobData | null;
  adapter: string | null;
  isDuplicate: boolean;
  fingerprint: string | null;
}> {
  const url = window.location.href;
  const domain = window.location.hostname;

  // Find the appropriate adapter
  const adapter = findAdapter(url);
  
  if (!adapter) {
    console.log('[Interview Tracker] No adapter found for:', url);
    return { data: null, adapter: null, isDuplicate: false, fingerprint: null };
  }

  console.log('[Interview Tracker] Using adapter:', adapter.name);

  // Start telemetry tracking
  const extractionTracker = startExtractionTracking(domain, adapter.name);
  activeExtraction = extractionTracker;

  try {
    // Extract job data
    const extractedData = adapter.extract(document);
    
    if (!extractedData || (!extractedData.company && !extractedData.role)) {
      extractionTracker.failure('No data extracted - empty result');
      activeExtraction = null;
      return { data: null, adapter: adapter.name, isDuplicate: false, fingerprint: null };
    }

    // Get extracted fields for telemetry
    const fields = [
      ...(extractedData.company ? ['company'] : []),
      ...(extractedData.role ? ['role'] : []),
      ...(extractedData.location ? ['location'] : []),
      ...(extractedData.jobDescription ? ['description'] : []),
      ...(extractedData.externalJobId ? ['jobId'] : [])
    ];

    // Generate fingerprint for deduplication
    const fingerprint = await generateFingerprint({
      jobDescriptionUrl: extractedData.jobUrl,
      company: extractedData.company,
      role: extractedData.role,
      externalJobId: extractedData.externalJobId
    });

    // Check for duplicates
    // Note: In a real implementation, we'd check against existing interviews in storage
    const isDuplicate = false; // Placeholder - would need storage access

    // Log successful extraction
    extractionTracker.success(fields, extractedData.confidence);
    activeExtraction = null;

    if (isDuplicate) {
      await trackDuplicate(domain, adapter.name);
    }

    return {
      data: extractedData,
      adapter: adapter.name,
      isDuplicate,
      fingerprint
    };

  } catch (error) {
    // Log extraction failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
    extractionTracker.failure(errorMessage);
    activeExtraction = null;
    
    console.error('[Interview Tracker] Extraction failed:', error);
    return { data: null, adapter: adapter.name, isDuplicate: false, fingerprint: null };
  }
}

/**
 * Create interview data from current page
 * Legacy method - now uses adapter-based extraction
 */
async function createInterviewFromPage() {
  const result = await extractJobData();
  
  if (!result.data) {
    // Fallback to basic extraction
    const pageInfo = extractPageInfo();
    return {
      id: generateId(),
      companyName: pageInfo.companyName || 'Unknown Company',
      position: pageInfo.jobTitle || 'Unknown Position',
      jobUrl: pageInfo.url,
      status: 'applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  return {
    id: generateId(),
    companyName: result.data.company,
    position: result.data.role,
    jobUrl: result.data.jobUrl,
    location: result.data.location,
    description: result.data.jobDescription,
    externalJobId: result.data.externalJobId,
    fingerprint: result.fingerprint,
    source: result.adapter || undefined,
    status: 'applied',
    confidence: result.data.confidence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Generate unique ID
 */
function generateId() {
  return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Track save action with telemetry
 */
async function trackSaveAction(
  wasEdited: boolean,
  fieldsEdited: string[],
  domain: string,
  adapter: string,
  confidence: number
): Promise<void> {
  await trackSave(domain, adapter, wasEdited, fieldsEdited, confidence);
}

/**
 * Highlight potential job listings on the page
 */
function highlightJobListings() {
  const jobKeywords = ['apply', 'job', 'position', 'career', 'hiring'];
  const links = document.querySelectorAll('a');
  
  links.forEach(link => {
    const text = link.textContent?.toLowerCase() || '';
    const href = link.getAttribute('href') || '';
    
    if (jobKeywords.some(keyword => text.includes(keyword) || href.includes(keyword))) {
      link.setAttribute('data-interview-tracker', 'potential-job');
    }
  });
  
  console.log('[Interview Tracker] Highlighted potential job listings');
}

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Interview Tracker] Content script received message:', request);

  switch (request.type) {
    case 'EXTRACT_PAGE_INFO':
      sendResponse({ success: true, data: extractPageInfo() });
      break;

    case 'CREATE_INTERVIEW':
      createInterviewFromPage()
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Async response

    case 'EXTRACT_JOB':
      extractJobData()
        .then(result => {
          if (result.data) {
            sendResponse({ 
              success: true, 
              data: {
                ...result.data,
                adapter: result.adapter,
                isDuplicate: result.isDuplicate,
                fingerprint: result.fingerprint
              }
            });
          } else {
            sendResponse({ 
              success: false, 
              error: 'Could not extract job data from this page',
              adapter: result.adapter 
            });
          }
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Async response

    case 'TRACK_SAVE':
      // Track save action with telemetry
      if (request.payload) {
        const { wasEdited, fieldsEdited, domain, adapter, confidence } = request.payload;
        trackSaveAction(wasEdited, fieldsEdited, domain, adapter, confidence)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Async response
      }
      sendResponse({ success: false, error: 'Missing payload' });
      break;

    case 'PING':
      sendResponse({ pong: true, url: window.location.href });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return false;
});

// Initialize
console.log('[Interview Tracker] Content script initialized on:', window.location.hostname);

// Listen for page changes (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[Interview Tracker] URL changed:', url);
    // Cancel any active extraction tracking
    if (activeExtraction) {
      activeExtraction.failure('Page navigation');
      activeExtraction = null;
    }
  }
}).observe(document, { subtree: true, childList: true });
