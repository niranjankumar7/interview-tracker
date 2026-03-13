/**
 * Service Worker for Interview Tracker Extension
 * Handles background tasks, health checks, message routing, and telemetry sync
 */

import { syncEvents, getTelemetrySettings } from '../shared/telemetry.js';

console.log('[Interview Tracker] Service Worker starting...');

// Track health status
let isHealthy = true;

// Telemetry sync alarm name
const TELEMETRY_SYNC_ALARM = 'telemetry-sync';

/**
 * Initialize service worker
 */
function initialize(): void {
  console.log('[Interview Tracker] Service Worker initialized successfully');
  console.log('[Interview Tracker] Status: healthy');
  
  // Set up periodic health check
  setInterval(() => {
    console.log('[Interview Tracker] Health check: still running');
  }, 60000); // Every minute
  
  // Schedule telemetry sync
  scheduleTelemetrySync();
}

/**
 * Schedule periodic telemetry sync using alarms API
 */
async function scheduleTelemetrySync(): Promise<void> {
  try {
    // Check if alarms API is available
    if (typeof chrome.alarms === 'undefined') {
      console.log('[Interview Tracker] Alarms API not available, using fallback');
      // Fallback: use setInterval
      setInterval(() => {
        performTelemetrySync();
      }, 60 * 60 * 1000); // Every hour
      return;
    }
    
    const settings = await getTelemetrySettings();
    const intervalMinutes = settings.sync_interval_hours * 60;
    
    // Create alarm for periodic sync
    await chrome.alarms.create(TELEMETRY_SYNC_ALARM, {
      periodInMinutes: Math.max(intervalMinutes, 15) // Minimum 15 minutes
    });
    
    console.log('[Interview Tracker] Telemetry sync scheduled every', settings.sync_interval_hours, 'hours');
  } catch (error) {
    console.error('[Interview Tracker] Failed to schedule telemetry sync:', error);
  }
}

/**
 * Perform telemetry sync
 */
async function performTelemetrySync(): Promise<void> {
  try {
    console.log('[Interview Tracker] Performing telemetry sync...');
    const result = await syncEvents();
    
    if (result.success) {
      console.log('[Interview Tracker] Telemetry sync completed successfully');
    } else {
      console.log('[Interview Tracker] Telemetry sync failed:', result.error);
    }
  } catch (error) {
    console.error('[Interview Tracker] Telemetry sync error:', error);
  }
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener(
  (
    request: { type: string; payload?: unknown },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean => {
    console.log('[Interview Tracker] Message received:', request.type, 'from:', sender.id);

    switch (request.type) {
      case 'HEALTH_CHECK':
        sendResponse({ healthy: isHealthy, timestamp: Date.now() });
        break;

      case 'GET_VERSION':
        sendResponse({ version: chrome.runtime.getManifest().version });
        break;

      case 'PING':
        sendResponse({ pong: true });
        break;

      case 'SYNC_TELEMETRY':
        // Manual telemetry sync request
        performTelemetrySync()
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }));
        return true; // Async response

      case 'GET_TELEMETRY_STATUS':
        getTelemetrySettings()
          .then(settings => sendResponse({ success: true, enabled: settings.enabled }))
          .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }));
        return true; // Async response

      default:
        console.warn('[Interview Tracker] Unknown message type:', request.type);
        sendResponse({ error: 'Unknown message type' });
    }

    // Return false for sync response
    return false;
  }
);

/**
 * Handle alarm events
 */
if (typeof chrome.alarms !== 'undefined') {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TELEMETRY_SYNC_ALARM) {
      console.log('[Interview Tracker] Telemetry sync alarm triggered');
      performTelemetrySync();
    }
  });
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Interview Tracker] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    console.log('[Interview Tracker] First install - welcome!');
    // Set default telemetry settings on install
    chrome.storage.local.set({
      'interview_tracker_telemetry_settings': {
        enabled: true,
        include_debug_info: false,
        sync_interval_hours: 24
      }
    });
  } else if (details.reason === 'update') {
    console.log('[Interview Tracker] Updated from version:', details.previousVersion);
  }
  
  // Ensure telemetry sync is scheduled
  scheduleTelemetrySync();
});

/**
 * Handle browser startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[Interview Tracker] Browser started - service worker waking up');
  scheduleTelemetrySync();
});

// Initialize
initialize();
