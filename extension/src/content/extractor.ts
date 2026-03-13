/**
 * Content script for extracting job data from web pages
 * Runs on all job posting pages
 */

import { extractJobData, isJobPostingPage } from './extractor';
import { ExtractJobMessage, ExtractJobResponse, ExtensionMessage } from '../shared/types';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender,
  sendResponse: (response: ExtractJobResponse) => void
) => {
  if (message.type === 'EXTRACT_JOB') {
    try {
      // Check if this looks like a job page
      if (!isJobPostingPage()) {
        sendResponse({
          type: 'EXTRACTION_RESULT',
          result: null,
          error: 'This does not appear to be a job posting page.',
        });
        return true;
      }

      // Extract job data
      const result = extractJobData();
      
      sendResponse({
        type: 'EXTRACTION_RESULT',
        result,
      });
    } catch (error) {
      console.error('Extraction error:', error);
      sendResponse({
        type: 'EXTRACTION_RESULT',
        result: null,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
      });
    }
  }
  
  return true; // Keep channel open for async
});

// Notify background script that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
