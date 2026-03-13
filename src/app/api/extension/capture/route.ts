/**
 * API Route: /api/extension/capture
 * POST - Capture job data from browser extension
 * Extension-only endpoint with fingerprint-based deduplication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// Confidence score validation
const confidenceSchema = z.object({
  company: z.number().min(0).max(1),
  role: z.number().min(0).max(1),
  location: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
});

// Capture request schema
const captureRequestSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  role: z.string().min(1, 'Role is required'),
  location: z.string().optional(),
  jobDescriptionUrl: z.string().url('Valid URL is required'),
  externalJobId: z.string().optional(),
  captureMetadata: z.object({
    confidence: confidenceSchema,
    extractionMethod: z.enum(['json-ld', 'meta', 'heuristic', 'manual']),
    source: z.string(),
    timestamp: z.number(),
  }).optional(),
});

/**
 * Generate fingerprint for deduplication
 */
function generateFingerprint(data: {
  jobDescriptionUrl: string;
  externalJobId?: string;
}): string {
  if (data.externalJobId) {
    return `ext:${data.externalJobId}`;
  }
  
  const normalizedUrl = normalizeUrl(data.jobDescriptionUrl);
  return hashString(normalizedUrl);
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'gbraid', 'wbraid', 'fbclid', 'gclid',
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    
    return `${urlObj.origin}${pathname}${urlObj.search}`;
  } catch {
    return url;
  }
}

/**
 * Simple hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * POST /api/extension/capture
 * Capture job data from extension
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    
    // Validate request
    const validation = captureRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: validation.error.issues },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // Generate fingerprint for deduplication
    const fingerprint = generateFingerprint({
      jobDescriptionUrl: data.jobDescriptionUrl,
      externalJobId: data.externalJobId,
    });
    
    // Check for duplicates
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId: user.userId,
        OR: [
          { fingerprint },
          { jobDescriptionUrl: { equals: normalizeUrl(data.jobDescriptionUrl) } },
        ],
      },
    });
    
    if (existingApplication) {
      return NextResponse.json(
        { 
          error: 'This job has already been saved',
          isDuplicate: true,
          existingApplicationId: existingApplication.id,
        },
        { status: 409 }
      );
    }
    
    // Create the application
    const application = await prisma.application.create({
      data: {
        userId: user.userId,
        company: data.company,
        role: data.role,
        location: data.location,
        jobDescriptionUrl: data.jobDescriptionUrl,
        externalJobId: data.externalJobId,
        source: 'extension',
        status: 'applied',
        applicationDate: new Date(),
        fingerprint,
        captureMetadata: data.captureMetadata || {},
      },
    });
    
    return NextResponse.json({
      success: true,
      id: application.id,
      company: application.company,
      role: application.role,
      status: application.status,
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.error('Extension capture error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/extension/capture
 * Health check endpoint for extension
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    return NextResponse.json({
      authenticated: true,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
