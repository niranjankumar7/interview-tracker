/**
 * Telemetry System for Interview Tracker Extension
 * Tracks extraction accuracy and failures for continuous improvement
 * Privacy-first: No personal data, aggregate only, user can opt out
 */
export type TelemetryEventType = 'extraction_attempt' | 'extraction_success' | 'extraction_failure' | 'save_confirmed' | 'save_edited' | 'duplicate_detected';
export interface TelemetryEvent {
    event: TelemetryEventType;
    domain: string;
    adapter: string;
    confidence: number;
    fields_extracted: string[];
    fields_edited: string[];
    error?: string;
    duration_ms: number;
    timestamp: string;
    session_id?: string;
}
export interface DomainMetrics {
    domain: string;
    attempts: number;
    successes: number;
    failures: number;
    confirmations: number;
    edits: number;
    duplicates: number;
    avg_confidence: number;
    avg_duration_ms: number;
    last_attempt: string;
}
export interface TelemetryMetrics {
    total_events: number;
    domains: Record<string, DomainMetrics>;
    adapters: Record<string, {
        attempts: number;
        successes: number;
        failures: number;
    }>;
    daily_stats: Record<string, {
        attempts: number;
        successes: number;
    }>;
    last_sync: string | null;
}
export interface TelemetrySettings {
    enabled: boolean;
    include_debug_info: boolean;
    sync_interval_hours: number;
}
/**
 * Get telemetry settings
 */
export declare function getTelemetrySettings(): Promise<TelemetrySettings>;
/**
 * Update telemetry settings
 */
export declare function setTelemetrySettings(settings: Partial<TelemetrySettings>): Promise<void>;
/**
 * Check if telemetry is enabled
 */
export declare function isTelemetryEnabled(): Promise<boolean>;
/**
 * Log a telemetry event
 */
export declare function logEvent(eventType: TelemetryEventType, data: {
    domain: string;
    adapter: string;
    confidence: number;
    fields_extracted?: string[];
    fields_edited?: string[];
    error?: string;
    duration_ms?: number;
}): Promise<void>;
/**
 * Get pending events that haven't been synced yet
 */
export declare function getPendingEvents(): Promise<TelemetryEvent[]>;
/**
 * Clear synced events
 */
export declare function clearPendingEvents(): Promise<void>;
/**
 * Get aggregated metrics
 */
export declare function getMetrics(): Promise<TelemetryMetrics>;
/**
 * Sync events to backend
 */
export declare function syncEvents(): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Get success rate for a domain
 */
export declare function getDomainSuccessRate(domain: string): Promise<number>;
/**
 * Get edit rate for a domain (measures extraction quality)
 */
export declare function getDomainEditRate(domain: string): Promise<number>;
/**
 * Get recent failures for debugging
 */
export declare function getRecentFailures(limit?: number): Promise<TelemetryEvent[]>;
/**
 * Reset all telemetry data (for user privacy)
 */
export declare function resetTelemetry(): Promise<void>;
/**
 * Track extraction attempt start - returns a tracker to complete the event
 */
export declare function startExtractionTracking(domain: string, adapter: string): {
    success: (fields: string[], confidence: number) => Promise<void>;
    failure: (error: string) => Promise<void>;
};
/**
 * Track save action
 */
export declare function trackSave(domain: string, adapter: string, wasEdited: boolean, fieldsEdited: string[], confidence: number): Promise<void>;
/**
 * Track duplicate detection
 */
export declare function trackDuplicate(domain: string, adapter: string): Promise<void>;
//# sourceMappingURL=telemetry.d.ts.map