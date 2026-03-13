/**
 * Shared deduplication utilities
 * This file mirrors the extension's src/shared/dedupe.ts
 * Keep both files in sync!
 */

export interface Fingerprint {
  normalizedCompany: string;
  normalizedRole: string;
  sourceUrl: string;
  externalJobId?: string;
  timestamp: number; // rounded to day
}

export interface FingerprintMatch {
  isDuplicate: boolean;
  matchType: 'exact' | 'soft' | 'none';
  confidence: number;
  existingApplicationId?: string;
  warnings?: string[];
}

export interface MergeTelemetry {
  duplicateRate: number;
  falsePositiveRate: number;
  totalCaptures: number;
  duplicatesFound: number;
  softMatches: number;
  mergeHistory: MergeEvent[];
}

export interface MergeEvent {
  timestamp: string;
  sourceApplicationId: string;
  targetApplicationId: string;
  matchType: 'exact' | 'soft';
  fieldsUpdated: string[];
  confidence: number;
}

// Company name suffixes to remove during normalization
const COMPANY_SUFFIXES = [
  'inc', 'llc', 'ltd', 'limited', 'corp', 'corporation',
  'co', 'company', 'plc', 'gmbh', 'ag', 'sa', 'bv', 'nv',
  'pvt', 'private', 'public'
];

// Seniority levels to remove from role normalization
const SENIORITY_LEVELS = [
  'junior', 'jr', 'entry level', 'entry-level', 'associate',
  'senior', 'sr', 'lead', 'principal', 'staff',
  'manager', 'director', 'vp', 'vice president', 'head of',
  'chief', 'cto', 'ceo', 'cfo', 'coo'
];

// Punctuation to remove from company names
const PUNCTUATION_REGEX = /[.,;:'"()\[\]{}]/g;

/**
 * Normalize company name for deduplication
 * - Lowercase
 * - Remove common suffixes (Inc, LLC, Ltd, etc.)
 * - Remove punctuation
 * - Trim whitespace
 */
export function normalizeCompany(company: string): string {
  if (!company) return '';
  
  let normalized = company.toLowerCase().trim();
  
  // Remove punctuation
  normalized = normalized.replace(PUNCTUATION_REGEX, '');
  
  // Remove common suffixes
  for (const suffix of COMPANY_SUFFIXES) {
    const regex = new RegExp(`\\s+${suffix}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }
  
  // Clean up extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Normalize role title for deduplication
 * - Lowercase
 * - Remove seniority levels (junior, senior, etc.)
 * - Standardize common abbreviations
 * - Trim whitespace
 */
export function normalizeRole(role: string): string {
  if (!role) return '';
  
  let normalized = role.toLowerCase().trim();
  
  // Remove seniority levels
  for (const level of SENIORITY_LEVELS) {
    const regex = new RegExp(`\\b${level}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }
  
  // Standardize common abbreviations
  normalized = normalized
    .replace(/\bswe\b/g, 'software engineer')
    .replace(/\bsde\b/g, 'software development engineer')
    .replace(/\bdev\b/g, 'developer')
    .replace(/\bfe\b/g, 'frontend')
    .replace(/\bbe\b/g, 'backend')
    .replace(/\bfs\b/g, 'fullstack')
    .replace(/\bml\b/g, 'machine learning');
  
  // Clean up extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Round timestamp to start of day for comparison
 */
export function roundToDay(timestamp: number | Date): number {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Generate a fingerprint for an application
 */
export function generateFingerprint(
  company: string,
  role: string,
  sourceUrl?: string,
  externalJobId?: string,
  timestamp?: number
): Fingerprint {
  return {
    normalizedCompany: normalizeCompany(company),
    normalizedRole: normalizeRole(role),
    sourceUrl: sourceUrl || '',
    externalJobId: externalJobId || undefined,
    timestamp: timestamp ? roundToDay(timestamp) : roundToDay(Date.now()),
  };
}

/**
 * Generate a hash string from fingerprint for quick comparison
 */
export function generateFingerprintHash(fingerprint: Fingerprint): string {
  const parts = [
    fingerprint.normalizedCompany,
    fingerprint.normalizedRole,
    fingerprint.sourceUrl,
    fingerprint.externalJobId || '',
  ];
  return parts.join('|');
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create distance matrix
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  
  return 1 - distance / maxLength;
}

/**
 * Check if two fingerprints match exactly
 * Criteria: same normalized company + role + sourceUrl within time window
 */
export function isExactMatch(
  fingerprint1: Fingerprint,
  fingerprint2: Fingerprint,
  windowDays: number = 30
): boolean {
  // If externalJobId is present in both, it must match
  if (fingerprint1.externalJobId && fingerprint2.externalJobId) {
    if (fingerprint1.externalJobId !== fingerprint2.externalJobId) {
      return false;
    }
  }
  
  // Check company match
  if (fingerprint1.normalizedCompany !== fingerprint2.normalizedCompany) {
    return false;
  }
  
  // Check role match
  if (fingerprint1.normalizedRole !== fingerprint2.normalizedRole) {
    return false;
  }
  
  // Check source URL match (if provided)
  if (fingerprint1.sourceUrl && fingerprint2.sourceUrl) {
    if (fingerprint1.sourceUrl !== fingerprint2.sourceUrl) {
      return false;
    }
  }
  
  // Check time window
  const timeDiff = Math.abs(fingerprint1.timestamp - fingerprint2.timestamp);
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  
  return timeDiff <= windowMs;
}

/**
 * Check if two fingerprints are a soft match (potential duplicate)
 * Criteria: same company + similar role (80% similarity) within shorter time window
 */
export function isSoftMatch(
  fingerprint1: Fingerprint,
  fingerprint2: Fingerprint,
  windowDays: number = 7,
  similarityThreshold: number = 0.8
): boolean {
  // Must have same company
  if (fingerprint1.normalizedCompany !== fingerprint2.normalizedCompany) {
    return false;
  }
  
  // Check role similarity
  const roleSimilarity = calculateSimilarity(
    fingerprint1.normalizedRole,
    fingerprint2.normalizedRole
  );
  
  if (roleSimilarity < similarityThreshold) {
    return false;
  }
  
  // Check time window (shorter for soft matches)
  const timeDiff = Math.abs(fingerprint1.timestamp - fingerprint2.timestamp);
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  
  if (timeDiff > windowMs) {
    return false;
  }
  
  // If source URLs are provided and match, boost confidence
  if (fingerprint1.sourceUrl && fingerprint2.sourceUrl) {
    if (fingerprint1.sourceUrl === fingerprint2.sourceUrl) {
      return true;
    }
  }
  
  return roleSimilarity >= similarityThreshold;
}

/**
 * Calculate match confidence score (0-1)
 */
export function calculateMatchConfidence(
  fingerprint1: Fingerprint,
  fingerprint2: Fingerprint
): number {
  let confidence = 0;
  
  // Company match contributes 40%
  if (fingerprint1.normalizedCompany === fingerprint2.normalizedCompany) {
    confidence += 0.4;
  }
  
  // Role similarity contributes 30%
  const roleSimilarity = calculateSimilarity(
    fingerprint1.normalizedRole,
    fingerprint2.normalizedRole
  );
  confidence += roleSimilarity * 0.3;
  
  // Source URL match contributes 20%
  if (fingerprint1.sourceUrl && fingerprint2.sourceUrl) {
    if (fingerprint1.sourceUrl === fingerprint2.sourceUrl) {
      confidence += 0.2;
    }
  } else if (!fingerprint1.sourceUrl && !fingerprint2.sourceUrl) {
    confidence += 0.1; // Partial credit if neither has URL
  }
  
  // External job ID match contributes 10%
  if (fingerprint1.externalJobId && fingerprint2.externalJobId) {
    if (fingerprint1.externalJobId === fingerprint2.externalJobId) {
      confidence += 0.1;
    }
  } else if (!fingerprint1.externalJobId && !fingerprint2.externalJobId) {
    confidence += 0.05; // Partial credit
  }
  
  return confidence;
}

/**
 * Determine if a new application is a duplicate of an existing one
 */
export function checkDuplicate(
  newFingerprint: Fingerprint,
  existingFingerprints: Array<{ id: string; fingerprint: Fingerprint }>
): FingerprintMatch {
  let bestMatch: FingerprintMatch = {
    isDuplicate: false,
    matchType: 'none',
    confidence: 0,
  };
  
  for (const existing of existingFingerprints) {
    // Check for exact match first
    if (isExactMatch(newFingerprint, existing.fingerprint)) {
      return {
        isDuplicate: true,
        matchType: 'exact',
        confidence: calculateMatchConfidence(newFingerprint, existing.fingerprint),
        existingApplicationId: existing.id,
      };
    }
    
    // Check for soft match
    if (isSoftMatch(newFingerprint, existing.fingerprint)) {
      const confidence = calculateMatchConfidence(newFingerprint, existing.fingerprint);
      
      // Only upgrade to soft match if better than current best
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          isDuplicate: false, // Soft matches aren't auto-duplicates
          matchType: 'soft',
          confidence,
          existingApplicationId: existing.id,
          warnings: [
            `Potential duplicate: Similar role "${existing.fingerprint.normalizedRole}" at same company`,
          ],
        };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Merge new application data into existing application
 * Newer data wins for mutable fields, original creation date is preserved
 */
export function mergeApplicationData<T extends Record<string, unknown>>(
  existingData: T,
  newData: T,
  mutableFields: string[] = ['location', 'description', 'notes', 'salary', 'status'],
  immutableFields: string[] = ['id', 'createdAt', 'userId']
): { merged: T; fieldsUpdated: string[] } {
  const merged = { ...existingData };
  const fieldsUpdated: string[] = [];
  
  for (const [key, value] of Object.entries(newData)) {
    // Skip immutable fields
    if (immutableFields.includes(key)) {
      continue;
    }
    
    // Skip if new value is null/undefined/empty
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    // For mutable fields, new data wins if it exists
    if (mutableFields.includes(key)) {
      if (JSON.stringify(merged[key as keyof T]) !== JSON.stringify(value)) {
        merged[key as keyof T] = value as T[keyof T];
        fieldsUpdated.push(key);
      }
    }
    // For other fields, only update if existing is empty
    else if (!merged[key as keyof T]) {
      merged[key as keyof T] = value as T[keyof T];
      fieldsUpdated.push(key);
    }
  }
  
  return { merged, fieldsUpdated };
}

/**
 * Create a merge event for audit logging
 */
export function createMergeEvent(
  sourceId: string,
  targetId: string,
  matchType: 'exact' | 'soft',
  fieldsUpdated: string[],
  confidence: number
): MergeEvent {
  return {
    timestamp: new Date().toISOString(),
    sourceApplicationId: sourceId,
    targetApplicationId: targetId,
    matchType,
    fieldsUpdated,
    confidence,
  };
}

/**
 * Update telemetry metrics
 */
export function updateTelemetry(
  current: MergeTelemetry,
  isDuplicate: boolean,
  isFalsePositive: boolean = false
): MergeTelemetry {
  const newTotal = current.totalCaptures + 1;
  const newDuplicates = current.duplicatesFound + (isDuplicate ? 1 : 0);
  
  return {
    ...current,
    totalCaptures: newTotal,
    duplicatesFound: newDuplicates,
    duplicateRate: newDuplicates / newTotal,
    falsePositiveRate: isFalsePositive 
      ? (current.falsePositiveRate * current.duplicatesFound + 1) / newDuplicates 
      : current.falsePositiveRate,
  };
}

/**
 * Constants for deduplication windows
 */
export const DEDUPE_WINDOWS = {
  EXACT_MATCH_DAYS: 30,
  SOFT_MATCH_DAYS: 7,
  SOFT_MATCH_SIMILARITY: 0.8,
} as const;

/**
 * Capture metadata for telemetry storage
 */
export interface CaptureMetadata {
  deduplication?: {
    fingerprint: string;
    matchType: 'exact' | 'soft' | 'none';
    confidence: number;
    matchedApplicationId?: string;
    wasMerged: boolean;
  };
  telemetry?: MergeTelemetry;
}
