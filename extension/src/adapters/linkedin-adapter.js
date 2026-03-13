/**
 * LinkedIn Adapter - Minimal Implementation
 * 
 * This module provides a conservative, user-triggered-only approach to
 * extracting job data from LinkedIn pages. It uses generic extraction
 * methods (meta tags, page title) rather than LinkedIn-specific selectors
 * to minimize fragility and ToS concerns.
 * 
 * PRINCIPLES:
 * - User-triggered ONLY (no auto-detection, no background polling)
 * - Generic extraction (no LinkedIn-specific selectors)
 * - Clear warnings about LinkedIn Terms of Service
 * - Graceful fallback when extraction fails
 * 
 * @module linkedin-adapter
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // LinkedIn domain patterns
    LINKEDIN_DOMAINS: [
      'linkedin.com',
      'www.linkedin.com'
    ],
    
    // Job URL patterns (for detection only, not extraction)
    JOB_URL_PATTERNS: [
      /\/jobs\/view\//,
      /\/jobs\/search/,
      /\/jobs\/collections/
    ],
    
    // Warning settings
    WARNING_KEY: 'linkedin_warning_acknowledged',
    WARNING_VERSION: '1.0', // Increment to force re-acknowledgment
    
    // Extraction timeouts (ms)
    EXTRACTION_TIMEOUT: 5000,
    
    // Debug mode
    DEBUG: false
  };

  // Logger
  const log = {
    debug: (...args) => CONFIG.DEBUG && console.log('[LinkedInAdapter]', ...args),
    info: (...args) => console.log('[LinkedInAdapter]', ...args),
    warn: (...args) => console.warn('[LinkedInAdapter]', ...args),
    error: (...args) => console.error('[LinkedInAdapter]', ...args)
  };

  /**
   * Check if current page is a LinkedIn job page
   * @returns {boolean}
   */
  function isLinkedInJobPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    // Check domain
    const isLinkedIn = CONFIG.LINKEDIN_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isLinkedIn) return false;
    
    // Check if it's a job-related page
    const isJobPage = CONFIG.JOB_URL_PATTERNS.some(pattern => 
      pattern.test(url)
    );
    
    return isJobPage;
  }

  /**
   * Show LinkedIn Terms of Service warning modal
   * @returns {Promise<boolean>} - True if user acknowledges, false if cancels
   */
  function showWarningModal() {
    return new Promise((resolve) => {
      // Check if already acknowledged
      const ack = localStorage.getItem(CONFIG.WARNING_KEY);
      if (ack === CONFIG.WARNING_VERSION) {
        log.debug('Warning already acknowledged');
        resolve(true);
        return;
      }

      // Create modal
      const modal = document.createElement('div');
      modal.id = 'interview-tracker-linkedin-warning';
      modal.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="
            background: white;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          ">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="
                width: 48px;
                height: 48px;
                background: #fff3cd;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
                font-size: 24px;
              ">⚠️</div>
              <h2 style="margin: 0; color: #856404; font-size: 20px;">
                LinkedIn Integration Notice
              </h2>
            </div>
            
            <div style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              <p style="margin-top: 0;">
                This feature allows you to <strong>manually save</strong> job information 
                from LinkedIn pages to your Interview Tracker.
              </p>
              
              <p><strong>Important:</strong></p>
              <ul style="padding-left: 20px;">
                <li>This is a <strong>manual, user-triggered</strong> feature only</li>
                <li>We do <strong>not</strong> automatically scrape or sync LinkedIn data</li>
                <li>Using this feature may be subject to LinkedIn's Terms of Service</li>
                <li>Your LinkedIn account remains your responsibility</li>
                <li>We recommend reviewing <a href="https://www.linkedin.com/legal/user-agreement" target="_blank" style="color: #0073b1;">LinkedIn's User Agreement</a></li>
              </ul>
              
              <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 13px; color: #666;">
                This feature extracts only publicly visible information using generic 
                methods (similar to bookmarking). It does not bypass any access controls 
                or use LinkedIn-specific automation.
              </p>
            </div>
            
            <label style="display: flex; align-items: center; margin-bottom: 20px; cursor: pointer;">
              <input type="checkbox" id="it-linkedin-dont-show" style="margin-right: 8px;">
              <span style="color: #666; font-size: 14px;">Don't show this warning again</span>
            </label>
            
            <div style="display: flex; gap: 12px;">
              <button id="it-linkedin-cancel" style="
                flex: 1;
                padding: 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                color: #666;
              ">Cancel</button>
              <button id="it-linkedin-confirm" style="
                flex: 1;
                padding: 12px;
                border: none;
                background: #0073b1;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
              ">I Understand - Proceed</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Event handlers
      const cancelBtn = modal.querySelector('#it-linkedin-cancel');
      const confirmBtn = modal.querySelector('#it-linkedin-confirm');
      const dontShowCheckbox = modal.querySelector('#it-linkedin-dont-show');

      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        if (dontShowCheckbox.checked) {
          localStorage.setItem(CONFIG.WARNING_KEY, CONFIG.WARNING_VERSION);
        }
        document.body.removeChild(modal);
        resolve(true);
      });

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal.firstElementChild) {
          document.body.removeChild(modal);
          resolve(false);
        }
      });
    });
  }

  /**
   * Extract job data using generic methods (meta tags, page title)
   * This avoids LinkedIn-specific selectors that are volatile and ToS-sensitive
   * 
   * @returns {Object|null} - Extracted job data or null if extraction fails
   */
  function extractJobDataGeneric() {
    log.debug('Starting generic job data extraction');

    try {
      const data = {
        source: 'linkedin',
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        extractionMethod: 'generic'
      };

      // 1. Try Open Graph meta tags (most reliable, platform-agnostic)
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogSiteName = document.querySelector('meta[property="og:site_name"]');

      if (ogTitle) {
        data.rawTitle = ogTitle.content;
        log.debug('Found og:title:', data.rawTitle);
      }

      if (ogDescription) {
        data.description = ogDescription.content;
        log.debug('Found og:description');
      }

      if (ogSiteName) {
        data.sourceName = ogSiteName.content;
      }

      // 2. Try standard meta tags
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && !data.description) {
        data.description = metaDescription.content;
      }

      // 3. Parse page title as fallback
      const pageTitle = document.title;
      if (pageTitle && !data.rawTitle) {
        data.rawTitle = pageTitle;
        log.debug('Using page title:', pageTitle);
      }

      // 4. Try JSON-LD structured data (if available)
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const structuredData = JSON.parse(script.textContent);
          if (structuredData['@type'] === 'JobPosting' || 
              (Array.isArray(structuredData) && structuredData.some(d => d['@type'] === 'JobPosting'))) {
            const jobData = Array.isArray(structuredData) 
              ? structuredData.find(d => d['@type'] === 'JobPosting')
              : structuredData;
            
            data.structuredData = jobData;
            log.debug('Found JobPosting structured data');
            
            // Extract from structured data if available
            if (jobData.title && !data.jobTitle) data.jobTitle = jobData.title;
            if (jobData.hiringOrganization?.name && !data.company) {
              data.company = jobData.hiringOrganization.name;
            }
            if (jobData.jobLocation?.address?.addressLocality && !data.location) {
              data.location = jobData.jobLocation.address.addressLocality;
            }
            if (jobData.description && !data.description) {
              data.description = jobData.description;
            }
          }
        } catch (e) {
          log.debug('Failed to parse JSON-LD:', e);
        }
      }

      // 5. Parse title for job/company info (heuristic)
      if (data.rawTitle && !data.jobTitle) {
        const parsed = parseJobTitle(data.rawTitle);
        data.jobTitle = parsed.jobTitle;
        data.company = parsed.company;
        log.debug('Parsed title:', parsed);
      }

      // 6. URL-based extraction (fallback)
      if (!data.jobId) {
        const urlMatch = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
        if (urlMatch) {
          data.jobId = urlMatch[1];
          log.debug('Extracted job ID from URL:', data.jobId);
        }
      }

      // Validate minimum required data
      if (!data.jobTitle && !data.rawTitle) {
        log.warn('Could not extract job title');
        return null;
      }

      log.info('Successfully extracted job data:', data.jobTitle || data.rawTitle);
      return data;

    } catch (error) {
      log.error('Extraction error:', error);
      return null;
    }
  }

  /**
   * Parse job title from page title using heuristics
   * LinkedIn titles are typically: "Job Title at Company Name | LinkedIn"
   * 
   * @param {string} title - The page title
   * @returns {Object} - {jobTitle, company}
   */
  function parseJobTitle(title) {
    if (!title) return { jobTitle: null, company: null };

    // Remove LinkedIn suffix
    let cleanTitle = title.replace(/\s*\|\s*LinkedIn$/i, '');
    cleanTitle = cleanTitle.replace(/\s*-\s*LinkedIn$/i, '');

    // Common patterns
    const patterns = [
      // "Job Title at Company"
      /^(.*?)\s+at\s+(.*?)$/i,
      // "Job Title - Company"
      /^(.*?)\s+-\s+(.*?)$/i,
      // "Company: Job Title"
      /^(.*?):\s+(.*?)$/i,
      // "Job Title | Company"
      /^(.*?)\s*\|\s*(.*?)$/i
    ];

    for (const pattern of patterns) {
      const match = cleanTitle.match(pattern);
      if (match) {
        return {
          jobTitle: match[1].trim(),
          company: match[2].trim()
        };
      }
    }

    // Fallback: return whole title as job title
    return {
      jobTitle: cleanTitle.trim(),
      company: null
    };
  }

  /**
   * Extract job data (main entry point)
   * Checks for user acknowledgment and extracts data
   * 
   * @returns {Promise<Object|null>}
   */
  async function extractJob() {
    log.info('LinkedIn adapter activated');

    // Check if on LinkedIn job page
    if (!isLinkedInJobPage()) {
      log.info('Not a LinkedIn job page, skipping');
      return null;
    }

    // Show warning and get consent
    const acknowledged = await showWarningModal();
    if (!acknowledged) {
      log.info('User cancelled');
      return null;
    }

    // Extract data
    const data = extractJobDataGeneric();
    
    if (!data) {
      log.warn('Extraction failed');
      // Could show user notification here
    }

    return data;
  }

  /**
   * Reset the warning acknowledgment (for testing)
   */
  function resetWarning() {
    localStorage.removeItem(CONFIG.WARNING_KEY);
    log.info('Warning acknowledgment reset');
  }

  /**
   * Check if adapter is available for current page
   * @returns {boolean}
   */
  function isAvailable() {
    return isLinkedInJobPage();
  }

  // Public API
  const LinkedInAdapter = {
    extractJob,
    isAvailable,
    resetWarning,
    // Expose internals for testing
    _config: CONFIG,
    _parseJobTitle: parseJobTitle
  };

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkedInAdapter;
  } else if (typeof define === 'function' && define.amd) {
    define(() => LinkedInAdapter);
  } else {
    window.LinkedInAdapter = LinkedInAdapter;
  }

  log.debug('LinkedIn adapter loaded');

})();
