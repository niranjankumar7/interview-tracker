/**
 * Telemetry System for Interview Tracker Extension
 * Tracks extraction accuracy and failures for continuous improvement
 * Privacy-first: No personal data, aggregate only, user can opt out
 */
import { storage } from './storage.js';
// Storage keys
const TELEMETRY_EVENTS_KEY = 'telemetry_events';
const TELEMETRY_METRICS_KEY = 'telemetry_metrics';
const TELEMETRY_SETTINGS_KEY = 'telemetry_settings';
const TELEMETRY_SESSION_KEY = 'telemetry_session_id';
const MAX_EVENTS_BEFORE_SYNC = 50;
const DEFAULT_SYNC_INTERVAL_HOURS = 24;
/**
 * Generate a session ID for grouping events
 */
function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Get or create session ID
 */
async function getSessionId() {
    let sessionId = await storage.get(TELEMETRY_SESSION_KEY);
    if (!sessionId) {
        sessionId = generateSessionId();
        await storage.set(TELEMETRY_SESSION_KEY, sessionId);
    }
    return sessionId;
}
/**
 * Get telemetry settings
 */
export async function getTelemetrySettings() {
    const settings = await storage.get(TELEMETRY_SETTINGS_KEY);
    return {
        enabled: true,
        include_debug_info: false,
        sync_interval_hours: DEFAULT_SYNC_INTERVAL_HOURS,
        ...(settings || {})
    };
}
/**
 * Update telemetry settings
 */
export async function setTelemetrySettings(settings) {
    const current = await getTelemetrySettings();
    await storage.set(TELEMETRY_SETTINGS_KEY, { ...current, ...settings });
}
/**
 * Check if telemetry is enabled
 */
export async function isTelemetryEnabled() {
    const settings = await getTelemetrySettings();
    return settings.enabled;
}
/**
 * Log a telemetry event
 */
export async function logEvent(eventType, data) {
    const settings = await getTelemetrySettings();
    if (!settings.enabled) {
        return;
    }
    const sessionId = await getSessionId();
    const event = {
        event: eventType,
        domain: sanitizeDomain(data.domain),
        adapter: data.adapter,
        confidence: data.confidence,
        fields_extracted: data.fields_extracted || [],
        fields_edited: data.fields_edited || [],
        duration_ms: data.duration_ms || 0,
        timestamp: new Date().toISOString(),
        session_id: sessionId
    };
    // Only include error if debug info is enabled (sanitized)
    if (settings.include_debug_info && data.error) {
        event.error = sanitizeError(data.error);
    }
    // Save the event
    await saveEvent(event);
    // Update metrics
    await updateMetrics(event);
    // Check if we should sync
    await maybeSyncEvents();
}
/**
 * Sanitize domain to avoid storing specific company subdomains
 * e.g., "company.greenhouse.io" -> "*.greenhouse.io"
 */
function sanitizeDomain(domain) {
    try {
        const url = domain.startsWith('http') ? new URL(domain) : new URL(`https://${domain}`);
        const hostname = url.hostname;
        // Known ATS platforms - generalize subdomains
        const atsPatterns = [
            { pattern: /\.greenhouse\.io$/, generic: '*.greenhouse.io' },
            { pattern: /\.lever\.co$/, generic: '*.lever.co' },
            { pattern: /\.ashbyhq\.com$/, generic: '*.ashbyhq.com' },
            { pattern: /\.smartrecruiters\.com$/, generic: '*.smartrecruiters.com' },
            { pattern: /\.breezy\.hr$/, generic: '*.breezy.hr' },
            { pattern: /\.applytojob\.com$/, generic: '*.applytojob.com' },
        ];
        for (const { pattern, generic } of atsPatterns) {
            if (pattern.test(hostname)) {
                return generic;
            }
        }
        // For other domains, keep main domain only (remove subdomains)
        const parts = hostname.split('.');
        if (parts.length > 2) {
            return parts.slice(-2).join('.');
        }
        return hostname;
    }
    catch {
        // If parsing fails, return original but truncated
        return domain.length > 50 ? domain.substring(0, 50) : domain;
    }
}
/**
 * Sanitize error message to remove potentially sensitive info
 */
function sanitizeError(error) {
    // Truncate long errors
    let sanitized = error.length > 200 ? error.substring(0, 200) + '...' : error;
    // Remove potential URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL]');
    // Remove potential company names (heuristic: capitalized words before common job terms)
    sanitized = sanitized.replace(/\b[A-Z][a-zA-Z]+\s+(?:Inc|LLC|Ltd|Corp|Company)\b/g, '[COMPANY]');
    return sanitized;
}
/**
 * Save event to local storage
 */
async function saveEvent(event) {
    const events = await getPendingEvents();
    events.push(event);
    // Keep only last 1000 events to prevent storage bloat
    if (events.length > 1000) {
        events.shift();
    }
    await storage.set(TELEMETRY_EVENTS_KEY, events);
}
/**
 * Get pending events that haven't been synced yet
 */
export async function getPendingEvents() {
    return (await storage.get(TELEMETRY_EVENTS_KEY)) || [];
}
/**
 * Clear synced events
 */
export async function clearPendingEvents() {
    await storage.remove(TELEMETRY_EVENTS_KEY);
}
/**
 * Update aggregated metrics
 */
async function updateMetrics(event) {
    const metrics = (await storage.get(TELEMETRY_METRICS_KEY)) || {
        total_events: 0,
        domains: {},
        adapters: {},
        daily_stats: {},
        last_sync: null
    };
    metrics.total_events++;
    // Update domain metrics
    if (!metrics.domains[event.domain]) {
        metrics.domains[event.domain] = {
            domain: event.domain,
            attempts: 0,
            successes: 0,
            failures: 0,
            confirmations: 0,
            edits: 0,
            duplicates: 0,
            avg_confidence: 0,
            avg_duration_ms: 0,
            last_attempt: event.timestamp
        };
    }
    const domainMetric = metrics.domains[event.domain];
    domainMetric.last_attempt = event.timestamp;
    // Track event type
    switch (event.event) {
        case 'extraction_attempt':
            domainMetric.attempts++;
            break;
        case 'extraction_success':
            domainMetric.successes++;
            break;
        case 'extraction_failure':
            domainMetric.failures++;
            break;
        case 'save_confirmed':
            domainMetric.confirmations++;
            break;
        case 'save_edited':
            domainMetric.edits++;
            break;
        case 'duplicate_detected':
            domainMetric.duplicates++;
            break;
    }
    // Update running average for confidence and duration
    const totalOps = domainMetric.successes + domainMetric.failures;
    if (totalOps > 0) {
        domainMetric.avg_confidence =
            (domainMetric.avg_confidence * (totalOps - 1) + event.confidence) / totalOps;
        domainMetric.avg_duration_ms =
            (domainMetric.avg_duration_ms * (totalOps - 1) + event.duration_ms) / totalOps;
    }
    // Update adapter metrics
    if (!metrics.adapters[event.adapter]) {
        metrics.adapters[event.adapter] = { attempts: 0, successes: 0, failures: 0 };
    }
    const adapterMetric = metrics.adapters[event.adapter];
    if (event.event === 'extraction_attempt')
        adapterMetric.attempts++;
    if (event.event === 'extraction_success')
        adapterMetric.successes++;
    if (event.event === 'extraction_failure')
        adapterMetric.failures++;
    // Update daily stats
    const dateKey = event.timestamp.split('T')[0];
    if (!metrics.daily_stats[dateKey]) {
        metrics.daily_stats[dateKey] = { attempts: 0, successes: 0 };
    }
    if (event.event === 'extraction_attempt')
        metrics.daily_stats[dateKey].attempts++;
    if (event.event === 'extraction_success')
        metrics.daily_stats[dateKey].successes++;
    await storage.set(TELEMETRY_METRICS_KEY, metrics);
}
/**
 * Get aggregated metrics
 */
export async function getMetrics() {
    return (await storage.get(TELEMETRY_METRICS_KEY)) || {
        total_events: 0,
        domains: {},
        adapters: {},
        daily_stats: {},
        last_sync: null
    };
}
/**
 * Check if we should sync events to backend
 */
async function maybeSyncEvents() {
    const events = await getPendingEvents();
    const settings = await getTelemetrySettings();
    // Sync if we have enough events
    if (events.length >= MAX_EVENTS_BEFORE_SYNC) {
        await syncEvents();
        return;
    }
    // Or if it's been long enough since last sync
    const metrics = await getMetrics();
    if (metrics.last_sync) {
        const lastSync = new Date(metrics.last_sync);
        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync >= settings.sync_interval_hours) {
            await syncEvents();
        }
    }
}
/**
 * Sync events to backend
 */
export async function syncEvents() {
    const settings = await getTelemetrySettings();
    if (!settings.enabled) {
        return { success: false, error: 'Telemetry disabled' };
    }
    const events = await getPendingEvents();
    if (events.length === 0) {
        return { success: true };
    }
    try {
        // Get backend URL from storage or use default
        const backendUrl = (await storage.get('apiUrl')) || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/api/extension/telemetry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ events }),
        });
        if (response.ok) {
            // Clear synced events
            await clearPendingEvents();
            // Update last sync time
            const metrics = await getMetrics();
            metrics.last_sync = new Date().toISOString();
            await storage.set(TELEMETRY_METRICS_KEY, metrics);
            return { success: true };
        }
        else {
            const error = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${error}` };
        }
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
/**
 * Get success rate for a domain
 */
export async function getDomainSuccessRate(domain) {
    const metrics = await getMetrics();
    const domainMetric = metrics.domains[domain];
    if (!domainMetric || domainMetric.attempts === 0) {
        return 0;
    }
    return Math.round((domainMetric.successes / domainMetric.attempts) * 100);
}
/**
 * Get edit rate for a domain (measures extraction quality)
 */
export async function getDomainEditRate(domain) {
    const metrics = await getMetrics();
    const domainMetric = metrics.domains[domain];
    if (!domainMetric || domainMetric.confirmations === 0) {
        return 0;
    }
    return Math.round((domainMetric.edits / domainMetric.confirmations) * 100);
}
/**
 * Get recent failures for debugging
 */
export async function getRecentFailures(limit = 10) {
    const events = await getPendingEvents();
    return events
        .filter(e => e.event === 'extraction_failure')
        .slice(-limit);
}
/**
 * Reset all telemetry data (for user privacy)
 */
export async function resetTelemetry() {
    await storage.remove(TELEMETRY_EVENTS_KEY);
    await storage.remove(TELEMETRY_METRICS_KEY);
    await storage.remove(TELEMETRY_SESSION_KEY);
    // Keep settings so user preference is preserved
}
/**
 * Track extraction attempt start - returns a tracker to complete the event
 */
export function startExtractionTracking(domain, adapter) {
    const startTime = Date.now();
    let completed = false;
    return {
        async success(fields, confidence) {
            if (completed)
                return;
            completed = true;
            const duration = Date.now() - startTime;
            await logEvent('extraction_attempt', {
                domain,
                adapter,
                confidence,
                fields_extracted: fields,
                duration_ms: duration
            });
            await logEvent('extraction_success', {
                domain,
                adapter,
                confidence,
                fields_extracted: fields,
                duration_ms: duration
            });
        },
        async failure(error) {
            if (completed)
                return;
            completed = true;
            const duration = Date.now() - startTime;
            await logEvent('extraction_attempt', {
                domain,
                adapter,
                confidence: 0,
                duration_ms: duration
            });
            await logEvent('extraction_failure', {
                domain,
                adapter,
                confidence: 0,
                error,
                duration_ms: duration
            });
        }
    };
}
/**
 * Track save action
 */
export async function trackSave(domain, adapter, wasEdited, fieldsEdited, confidence) {
    if (wasEdited) {
        await logEvent('save_edited', {
            domain,
            adapter,
            confidence,
            fields_edited: fieldsEdited
        });
    }
    else {
        await logEvent('save_confirmed', {
            domain,
            adapter,
            confidence,
            fields_extracted: []
        });
    }
}
/**
 * Track duplicate detection
 */
export async function trackDuplicate(domain, adapter) {
    await logEvent('duplicate_detected', {
        domain,
        adapter,
        confidence: 0
    });
}
//# sourceMappingURL=telemetry.js.map