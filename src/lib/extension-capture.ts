/**
 * Extension Capture Utilities
 * Core logic for handling job captures from the Chrome extension
 * Updated with deduplication and merge rules
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  createOrMergeApplication,
  getDeduplicationStats,
  getApplicationMergeHistory,
  ApplicationInput,
  FingerprintMatch,
  MergeEvent,
  generateFingerprint,
  generateFingerprintHash,
  normalizeCompany,
  normalizeRole,
} from '@/lib/dedupe-service';

// Confidence threshold for requiring manual review
const LOW_CONFIDENCE_THRESHOLD = 0.7;

export interface ExtensionCapturePayload {
    company: string;
    role: string;
    location?: string;
    jobUrl: string;
    jobDescriptionUrl?: string;
    externalJobId?: string;
    source: 'extension';
    parsedAt: string; // ISO timestamp
    confidence: number; // 0.0 - 1.0
    rawHtml?: string;
    metadata?: {
        parserVersion?: string;
        platform?: string; // linkedin, greenhouse, etc.
        manualReview?: boolean;
        [key: string]: unknown;
    };
}

export interface UpsertResult {
    success: boolean;
    applicationId: string;
    isNew: boolean;
    mergedWith?: string;
    requiresManualReview: boolean;
    confidence: number;
    matchType?: 'exact' | 'soft' | 'none';
    warnings?: string[];
}

/**
 * Extract hostname from URL for deduplication
 */
function normalizeJobUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        // Normalize LinkedIn URLs by removing tracking parameters
        if (urlObj.hostname.includes('linkedin.com')) {
            // Keep only the job ID for LinkedIn
            const jobIdMatch = url.match(/\/jobs\/view\/(\d+)/);
            if (jobIdMatch) {
                return `linkedin.com/jobs/view/${jobIdMatch[1]}`;
            }
        }
        return urlObj.hostname + urlObj.pathname;
    } catch {
        return url.toLowerCase().trim();
    }
}

/**
 * Main function to upsert application from extension capture
 * Uses the new deduplication service
 */
export async function upsertApplicationFromExtension(
    userId: string,
    payload: ExtensionCapturePayload
): Promise<UpsertResult> {
    const parsedAt = new Date(payload.parsedAt);

    // Determine if manual review is required
    const requiresManualReview = payload.confidence < LOW_CONFIDENCE_THRESHOLD ||
        payload.metadata?.manualReview === true;

    // Prepare capture metadata with deduplication telemetry
    const captureMetadata = {
        ...payload.metadata,
        rawHtml: payload.rawHtml ? '[truncated]' : undefined, // Don't store full HTML in metadata
        rawHtmlLength: payload.rawHtml?.length,
        parsedAt: payload.parsedAt,
        confidence: payload.confidence,
        jobUrl: payload.jobUrl,
        location: payload.location,
        capturedAt: new Date().toISOString(),
    };

    // Convert payload to ApplicationInput
    const applicationInput: ApplicationInput = {
        company: payload.company,
        role: payload.role,
        jobDescriptionUrl: payload.jobDescriptionUrl || payload.jobUrl,
        externalJobId: payload.externalJobId,
        status: 'applied',
        notes: requiresManualReview
            ? `⚠️ This application requires manual review. Confidence: ${(payload.confidence * 100).toFixed(1)}%`
            : '',
        applicationDate: new Date(),
        source: 'extension',
    };

    // Use the deduplication service to create or merge
    const result = await createOrMergeApplication(
        prisma,
        userId,
        applicationInput,
        captureMetadata
    );

    // Build the response
    return {
        success: true,
        applicationId: result.application.id,
        isNew: result.action === 'created',
        mergedWith: result.action === 'merged' ? result.application.id : undefined,
        requiresManualReview: requiresManualReview || result.action === 'warning',
        confidence: result.match?.confidence || payload.confidence,
        matchType: result.match?.matchType || 'none',
        warnings: result.warnings,
    };
}

/**
 * Get deduplication statistics for a user
 */
export async function getUserDeduplicationStats(userId: string) {
    return getDeduplicationStats(prisma, userId);
}

/**
 * Get merge history for a specific application
 */
export async function getApplicationMergeHistoryById(applicationId: string): Promise<MergeEvent[]> {
    return getApplicationMergeHistory(prisma, applicationId);
}

/**
 * Check if a capture would be a duplicate without creating it
 * Useful for UI preview/warning
 */
export async function previewDeduplicationCheck(
    userId: string,
    payload: Pick<ExtensionCapturePayload, 'company' | 'role' | 'jobUrl' | 'externalJobId'>
): Promise<{
    fingerprint: string;
    normalizedCompany: string;
    normalizedRole: string;
    isDuplicate: boolean;
    matchType: 'exact' | 'soft' | 'none';
    confidence: number;
    existingApplicationId?: string;
    warnings?: string[];
}> {
    const { checkApplicationDuplicate } = await import('@/lib/dedupe-service');

    const applicationInput: ApplicationInput = {
        company: payload.company,
        role: payload.role,
        jobDescriptionUrl: payload.jobUrl,
        externalJobId: payload.externalJobId,
    };

    const { match, fingerprint } = await checkApplicationDuplicate(
        prisma,
        userId,
        applicationInput
    );

    return {
        fingerprint: generateFingerprintHash(fingerprint),
        normalizedCompany: normalizeCompany(payload.company),
        normalizedRole: normalizeRole(payload.role),
        isDuplicate: match.isDuplicate,
        matchType: match.matchType,
        confidence: match.confidence,
        existingApplicationId: match.existingApplicationId,
        warnings: match.warnings,
    };
}

/**
 * Validate extension capture payload
 */
export function validateCapturePayload(payload: unknown): {
    valid: boolean;
    error?: string;
    data?: ExtensionCapturePayload;
} {
    if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Invalid payload: expected object' };
    }

    const p = payload as Record<string, unknown>;

    // Required fields
    if (!p.company || typeof p.company !== 'string' || p.company.trim().length === 0) {
        return { valid: false, error: 'Missing or invalid: company' };
    }

    if (!p.role || typeof p.role !== 'string' || p.role.trim().length === 0) {
        return { valid: false, error: 'Missing or invalid: role' };
    }

    if (!p.jobUrl || typeof p.jobUrl !== 'string' || !isValidUrl(p.jobUrl)) {
        return { valid: false, error: 'Missing or invalid: jobUrl' };
    }

    if (!p.parsedAt || typeof p.parsedAt !== 'string' || isNaN(Date.parse(p.parsedAt))) {
        return { valid: false, error: 'Missing or invalid: parsedAt (must be valid ISO date)' };
    }

    if (typeof p.confidence !== 'number' || p.confidence < 0 || p.confidence > 1) {
        return { valid: false, error: 'Missing or invalid: confidence (must be number 0-1)' };
    }

    // Optional fields validation
    if (p.location !== undefined && typeof p.location !== 'string') {
        return { valid: false, error: 'Invalid: location (must be string)' };
    }

    if (p.jobDescriptionUrl !== undefined && (typeof p.jobDescriptionUrl !== 'string' || !isValidUrl(p.jobDescriptionUrl))) {
        return { valid: false, error: 'Invalid: jobDescriptionUrl (must be valid URL)' };
    }

    if (p.externalJobId !== undefined && typeof p.externalJobId !== 'string') {
        return { valid: false, error: 'Invalid: externalJobId (must be string)' };
    }

    if (p.rawHtml !== undefined && typeof p.rawHtml !== 'string') {
        return { valid: false, error: 'Invalid: rawHtml (must be string)' };
    }

    if (p.metadata !== undefined && (typeof p.metadata !== 'object' || p.metadata === null)) {
        return { valid: false, error: 'Invalid: metadata (must be object)' };
    }

    return {
        valid: true,
        data: {
            company: p.company.trim(),
            role: p.role.trim(),
            location: p.location?.trim(),
            jobUrl: p.jobUrl.trim(),
            jobDescriptionUrl: p.jobDescriptionUrl?.trim(),
            externalJobId: p.externalJobId?.trim(),
            source: 'extension',
            parsedAt: p.parsedAt,
            confidence: p.confidence,
            rawHtml: p.rawHtml,
            metadata: p.metadata as ExtensionCapturePayload['metadata'],
        },
    };
}

/**
 * Check if string is a valid URL
 */
function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Re-export normalization functions for use in other modules
export { normalizeCompany, normalizeRole, generateFingerprint, generateFingerprintHash };
