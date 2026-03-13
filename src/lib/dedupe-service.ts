/**
 * Backend deduplication service for job applications
 * Integrates with Prisma and the shared dedupe utilities
 */

import { PrismaClient, Application, Prisma } from '@prisma/client';
import {
  Fingerprint,
  FingerprintMatch,
  MergeEvent,
  MergeTelemetry,
  CaptureMetadata,
  generateFingerprint,
  generateFingerprintHash,
  checkDuplicate,
  mergeApplicationData,
  createMergeEvent,
  DEDUPE_WINDOWS,
} from '@/lib/dedupe-shared';

// Re-export shared types and functions
export {
  Fingerprint,
  FingerprintMatch,
  MergeEvent,
  MergeTelemetry,
  CaptureMetadata,
  generateFingerprint,
  generateFingerprintHash,
  DEDUPE_WINDOWS,
};

export interface ApplicationInput {
  company: string;
  role: string;
  jobDescriptionUrl?: string;
  externalJobId?: string;
  status?: string;
  notes?: string;
  applicationDate?: Date;
  source?: string;
}

export interface DeduplicationResult {
  action: 'created' | 'merged' | 'warning';
  application: Application;
  match?: FingerprintMatch;
  mergeEvent?: MergeEvent;
  warnings?: string[];
}

/**
 * Fetch existing applications for a user that could be duplicates
 * Optimized query using fingerprint index
 */
export async function fetchPotentialDuplicates(
  prisma: PrismaClient,
  userId: string,
  fingerprint: Fingerprint,
  lookbackDays: number = 60
): Promise<Array<{ id: string; fingerprint: Fingerprint; createdAt: Date }>> {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Query by normalized company name using the fingerprint field
  const fingerprintHash = generateFingerprintHash(fingerprint);
  const normalizedCompany = fingerprint.normalizedCompany;

  const applications = await prisma.application.findMany({
    where: {
      userId,
      createdAt: {
        gte: lookbackDate,
      },
      OR: [
        { fingerprint: { startsWith: normalizedCompany } },
        { company: { contains: normalizedCompany, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      fingerprint: true,
      createdAt: true,
      company: true,
      role: true,
      jobDescriptionUrl: true,
      externalJobId: true,
      applicationDate: true,
    },
  });

  // Parse fingerprints from stored strings
  return applications
    .map((app) => ({
      id: app.id,
      fingerprint: parseFingerprintFromString(app.fingerprint, {
        company: app.company,
        role: app.role,
        jobDescriptionUrl: app.jobDescriptionUrl,
        externalJobId: app.externalJobId,
        applicationDate: app.applicationDate,
      }),
      createdAt: app.createdAt,
    }))
    .filter((app): app is { id: string; fingerprint: Fingerprint; createdAt: Date } => 
      app.fingerprint !== null
    );
}

/**
 * Parse fingerprint from stored string or reconstruct from application data
 */
function parseFingerprintFromString(
  fingerprintStr: string | null,
  fallbackData: {
    company: string;
    role: string;
    jobDescriptionUrl?: string | null;
    externalJobId?: string | null;
    applicationDate: Date;
  }
): Fingerprint | null {
  if (fingerprintStr) {
    try {
      const parts = fingerprintStr.split('|');
      if (parts.length >= 2) {
        return {
          normalizedCompany: parts[0],
          normalizedRole: parts[1],
          sourceUrl: parts[2] || fallbackData.jobDescriptionUrl || '',
          externalJobId: parts[3] || fallbackData.externalJobId || undefined,
          timestamp: fallbackData.applicationDate.getTime(),
        };
      }
    } catch {
      // Fall through to regeneration
    }
  }

  // Regenerate fingerprint from stored data
  return generateFingerprint(
    fallbackData.company,
    fallbackData.role,
    fallbackData.jobDescriptionUrl || undefined,
    fallbackData.externalJobId || undefined,
    fallbackData.applicationDate.getTime()
  );
}

/**
 * Check if a new application is a duplicate
 */
export async function checkApplicationDuplicate(
  prisma: PrismaClient,
  userId: string,
  input: ApplicationInput
): Promise<{ match: FingerprintMatch; fingerprint: Fingerprint; potentialDuplicates: Array<{ id: string; fingerprint: Fingerprint; createdAt: Date }> }> {
  const fingerprint = generateFingerprint(
    input.company,
    input.role,
    input.jobDescriptionUrl,
    input.externalJobId,
    input.applicationDate?.getTime() || Date.now()
  );

  // Fetch potential duplicates from the last 60 days
  const potentialDuplicates = await fetchPotentialDuplicates(
    prisma,
    userId,
    fingerprint,
    60
  );

  const match = checkDuplicate(
    fingerprint,
    potentialDuplicates.map((d) => ({ id: d.id, fingerprint: d.fingerprint }))
  );

  return { match, fingerprint, potentialDuplicates };
}

/**
 * Create or merge application based on deduplication check
 */
export async function createOrMergeApplication(
  prisma: PrismaClient,
  userId: string,
  input: ApplicationInput,
  captureMetadata?: CaptureMetadata
): Promise<DeduplicationResult> {
  const { match, fingerprint, potentialDuplicates } = await checkApplicationDuplicate(
    prisma,
    userId,
    input
  );

  // Prepare capture metadata with deduplication info
  const updatedMetadata: CaptureMetadata = {
    ...captureMetadata,
    deduplication: {
      fingerprint: generateFingerprintHash(fingerprint),
      matchType: match.matchType,
      confidence: match.confidence,
      matchedApplicationId: match.existingApplicationId,
      wasMerged: false,
    },
  };

  // Handle exact match - merge into existing
  if (match.isDuplicate && match.matchType === 'exact' && match.existingApplicationId) {
    const existingApp = await prisma.application.findUnique({
      where: { id: match.existingApplicationId },
    });

    if (!existingApp) {
      // Shouldn't happen, but create new if it does
      return createNewApplication(prisma, userId, input, fingerprint, updatedMetadata);
    }

    // Merge data
    const { merged, fieldsUpdated } = mergeApplicationData(
      existingApp as Record<string, unknown>,
      {
        ...input,
        status: input.status || existingApp.status,
        notes: input.notes || existingApp.notes,
      } as Record<string, unknown>,
      ['location', 'description', 'notes', 'salary', 'status', 'roleType'],
      ['id', 'createdAt', 'userId', 'applicationDate']
    );

    // Update the existing application
    const updated = await prisma.application.update({
      where: { id: existingApp.id },
      data: {
        ...merged,
        captureMetadata: {
          ...((existingApp.captureMetadata as Prisma.JsonObject) || {}),
          ...updatedMetadata,
          lastMerge: new Date().toISOString(),
          mergeHistory: [
            ...((((existingApp.captureMetadata as Prisma.JsonObject)?.mergeHistory as MergeEvent[]) || [])),
            createMergeEvent('new-capture', existingApp.id, 'exact', fieldsUpdated, match.confidence),
          ],
        } as Prisma.JsonObject,
      },
    });

    return {
      action: 'merged',
      application: updated,
      match,
      mergeEvent: createMergeEvent('new-capture', existingApp.id, 'exact', fieldsUpdated, match.confidence),
    };
  }

  // Handle soft match - return warning but still create
  if (match.matchType === 'soft' && match.existingApplicationId) {
    const newApp = await createNewApplication(prisma, userId, input, fingerprint, updatedMetadata);
    
    return {
      ...newApp,
      action: 'warning',
      warnings: [
        `Potential duplicate detected: Similar application exists (${match.existingApplicationId})`,
        ...(match.warnings || []),
      ],
    };
  }

  // No match - create new application
  return createNewApplication(prisma, userId, input, fingerprint, updatedMetadata);
}

/**
 * Create a new application with fingerprint
 */
async function createNewApplication(
  prisma: PrismaClient,
  userId: string,
  input: ApplicationInput,
  fingerprint: Fingerprint,
  captureMetadata?: CaptureMetadata
): Promise<DeduplicationResult> {
  const application = await prisma.application.create({
    data: {
      userId,
      company: input.company,
      role: input.role,
      jobDescriptionUrl: input.jobDescriptionUrl,
      externalJobId: input.externalJobId,
      status: input.status || 'applied',
      notes: input.notes || '',
      applicationDate: input.applicationDate || new Date(),
      source: (input.source as 'web' | 'extension' | 'import') || 'web',
      fingerprint: generateFingerprintHash(fingerprint),
      captureMetadata: captureMetadata as Prisma.JsonObject,
    },
  });

  return {
    action: 'created',
    application,
  };
}

/**
 * Get deduplication statistics for a user
 */
export async function getDeduplicationStats(
  prisma: PrismaClient,
  userId: string
): Promise<MergeTelemetry> {
  const applications = await prisma.application.findMany({
    where: { userId },
    select: {
      captureMetadata: true,
      createdAt: true,
    },
  });

  let totalCaptures = 0;
  let duplicatesFound = 0;
  let softMatches = 0;
  const mergeHistory: MergeEvent[] = [];

  for (const app of applications) {
    const metadata = app.captureMetadata as CaptureMetadata | null;
    if (metadata?.deduplication) {
      totalCaptures++;
      
      if (metadata.deduplication.matchType === 'exact') {
        duplicatesFound++;
      } else if (metadata.deduplication.matchType === 'soft') {
        softMatches++;
      }
    }

    // Collect merge history
    const appMergeHistory = (app.captureMetadata as { mergeHistory?: MergeEvent[] } | null)?.mergeHistory;
    if (appMergeHistory) {
      mergeHistory.push(...appMergeHistory);
    }
  }

  // Calculate false positive rate (applications that were merged but later recreated)
  const falsePositives = mergeHistory.filter(
    (event, index, arr) => 
      arr.findIndex(e => e.targetApplicationId === event.targetApplicationId && e.timestamp !== event.timestamp) !== -1
  ).length;

  return {
    duplicateRate: totalCaptures > 0 ? duplicatesFound / totalCaptures : 0,
    falsePositiveRate: duplicatesFound > 0 ? falsePositives / duplicatesFound : 0,
    totalCaptures,
    duplicatesFound,
    softMatches,
    mergeHistory: mergeHistory.slice(-100), // Keep last 100 events
  };
}

/**
 * Get merge history for a specific application
 */
export async function getApplicationMergeHistory(
  prisma: PrismaClient,
  applicationId: string
): Promise<MergeEvent[]> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      captureMetadata: true,
    },
  });

  if (!application) {
    return [];
  }

  const metadata = application.captureMetadata as { mergeHistory?: MergeEvent[] } | null;
  return metadata?.mergeHistory || [];
}
