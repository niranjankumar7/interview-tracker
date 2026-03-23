/**
 * API Route: /api/chat/action
 * POST endpoint that processes chat messages
 * Can create up to 5 kanban cards from a single prompt
 * Tracks counters: prompts sent vs kanban cards created
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { sanitizeCompanyName } from '@/lib/application-intake';
import { tryParseDateInput } from '@/lib/date-parsing';
import { checkUsageLimit, getUsageCounters, trackUsage } from '@/lib/freemium';

const MAX_CARDS_PER_PROMPT = 5;

const chatActionSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    previousMessages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }).optional(),
});

// Structure for extracted application data
interface ExtractedApplication {
  company: string;
  role: string;
  notes?: string;
}

// Result types for better type safety
interface CreationResult {
  success: boolean;
  company?: string;
  role?: string;
  id?: string;
  type?: string;
  newStatus?: string;
  roundNumber?: number;
  error?: string;
}

// Types of actions
interface MultiCardAction {
  type: 'create_applications' | 'update_status' | 'schedule_interview' | 'general_chat';
  applications: ExtractedApplication[];
  statusUpdate?: { company: string; status: string };
  interviewSchedule?: { company: string; date: string };
}

/**
 * Extract multiple applications from a single message
 * Supports formats like:
 * - "Applied to Google, Amazon, and Microsoft"
 * - "Applied for SWE at Google, PM at Meta, and Data at Netflix"
 * - "Just submitted applications to Flipkart, Swiggy, Zomato"
 */
function extractMultipleApplications(message: string): ExtractedApplication[] {
  const applications: ExtractedApplication[] = [];
  const seenCompanies = new Set<string>();
  
  // Pattern 1: "Applied for [Role] at [Company], [Role] at [Company], and [Role] at [Company]"
  // Example: "Applied for SWE at Google, PM at Meta, and Data Scientist at Netflix"
  const roleAtCompanyPattern = /applied\s+(?:for\s+)?(.+?)(?:\s+at\s+|\s+to\s+)(.+?)(?=,\s+(?:and\s+)?(?:\w+\s+)?(?:at|to)|\s+and\s+(?:\w+\s+)?(?:at|to)|$)/gi;
  
  // Pattern 2: "Applied to [Company], [Company], and [Company] as [Role]"
  // Example: "Applied to Google, Amazon, and Microsoft as SDE"
  const companiesThenRolePattern = /applied\s+(?:to\s+)?((?:[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*(?:,\s+|\s+and\s+))+)(?:as\s+|for\s+)?(.+?)(?:\.|$)/i;
  
  // Pattern 3: Simple comma-separated with "applied to" prefix
  // Example: "Applied to Google, Amazon, Microsoft, Meta, and Netflix"
  const simpleListPattern = /applied\s+(?:to|at)\s+(.+?)(?:\s+(?:as|for)\s+(.+?))?(?:\.|$)/i;
  
  // Pattern 4: Numbered or bulleted (from pasted list)
  // Example: "1. Google - SWE\n2. Amazon - PM"
  const numberedPattern = /(?:\d+[.\)]\s*|[•\-\*]\s*)([A-Za-z][A-Za-z\s]*?)(?:\s*[-:]\s*|\s+as\s+)(.+?)(?=\n|$)/gi;
  
  // Try Pattern 1: Role at Company, Role at Company
  const roleMatches = Array.from(message.matchAll(roleAtCompanyPattern));
  if (roleMatches.length >= 2) {
    for (const m of roleMatches.slice(0, MAX_CARDS_PER_PROMPT)) {
      const role = m[1]?.trim();
      const company = m[2]?.trim().replace(/,\s*$/g, '').replace(/\s+and\s*$/i, '');
      if (role && company && !seenCompanies.has(company.toLowerCase())) {
        seenCompanies.add(company.toLowerCase());
        applications.push({ company, role, notes: '' });
      }
    }
    if (applications.length > 0) return applications;
  }
  
  // Try Pattern 4: Numbered/bulleted list
  const numberedMatches = Array.from(message.matchAll(numberedPattern));
  if (numberedMatches.length >= 1) {
    for (const m of numberedMatches.slice(0, MAX_CARDS_PER_PROMPT)) {
      const company = m[1]?.trim();
      const role = m[2]?.trim();
      if (company && role && !seenCompanies.has(company.toLowerCase())) {
        seenCompanies.add(company.toLowerCase());
        applications.push({ company, role, notes: '' });
      }
    }
    if (applications.length > 0) return applications;
  }
  
  // Try Pattern 2: Companies list then role
  const companyRoleMatch = message.match(companiesThenRolePattern);
  if (companyRoleMatch) {
    const companiesStr = companyRoleMatch[1];
    const sharedRole = companyRoleMatch[2]?.trim();
    
    // Split by comma or "and"
    const companies = companiesStr
      .split(/,\s+|\s+and\s+/)
      .map(c => c.trim())
      .filter(c => c.length > 0 && !['applied', 'to', 'at', 'for'].includes(c.toLowerCase()));
    
    for (const company of companies.slice(0, MAX_CARDS_PER_PROMPT)) {
      const cleanCompany = company.replace(/,\s*$/g, '').trim();
      if (cleanCompany && !seenCompanies.has(cleanCompany.toLowerCase())) {
        seenCompanies.add(cleanCompany.toLowerCase());
        applications.push({ 
          company: cleanCompany, 
          role: sharedRole || 'Software Engineer', // Default role
          notes: '' 
        });
      }
    }
    if (applications.length > 0) return applications;
  }
  
  // Try Pattern 3: Simple list
  const simpleMatch = message.match(simpleListPattern);
  if (simpleMatch) {
    const listStr = simpleMatch[1];
    const sharedRole = simpleMatch[2]?.trim() || 'Software Engineer';
    
    const items = listStr
      .split(/,\s+|\s+and\s+/)
      .map(item => item.trim())
      .filter(item => {
        if (item.length <= 1) return false;
        if (['applied', 'to', 'at'].includes(item.toLowerCase())) return false;
        // Filter out time-related words that might be at the end of a sentence
        const cleanItem = item.toLowerCase().replace(/[.!,;]+$/, '');
        if (['yesterday', 'today', 'tomorrow', 'also', 'just', 'recently', 'already'].includes(cleanItem)) return false;
        return true;
      });
    
    for (const item of items.slice(0, MAX_CARDS_PER_PROMPT)) {
      const cleanCompany = item.replace(/[,.\s]+$/g, '').trim();
      if (cleanCompany && !seenCompanies.has(cleanCompany.toLowerCase())) {
        seenCompanies.add(cleanCompany.toLowerCase());
        applications.push({ 
          company: cleanCompany, 
          role: sharedRole, 
          notes: ''
        });
      }
    }
    if (applications.length > 0) return applications;
  }
  
  // Fallback: Try to extract single application (backward compatibility)
  const singlePatterns = [
    /applied\s+(?:for\s+)?(.+?)\s+(?:at|to)\s+(.+?)(?:\.\s*|$|,|;)/i,
    /applied\s+(?:to\s+)?(.+?)\s+(?:for\s+)?(.+?)(?:\.\s*|$|,|;)/i,
    /just\s+applied\s+(?:for\s+)?(.+?)\s+(?:at|to)\s+(.+?)(?:\.\s*|$|,|;)/i,
  ];
  
  for (const pattern of singlePatterns) {
    const m = message.match(pattern);
    if (m) {
      const role = m[1].trim();
      const company = m[2].trim();
      if (!seenCompanies.has(company.toLowerCase())) {
        applications.push({ company, role, notes: '' });
      }
      break;
    }
  }
  
  return applications;
}

/**
 * Parse message for multi-card actions
 */
function parseMessageForMultiAction(message: string): MultiCardAction {
  // Check for application creation patterns
  const hasApplicationKeyword = /\b(applied|application|submitted|applied to|applied for)\b/i.test(message);
  
  if (hasApplicationKeyword) {
    const applications = extractMultipleApplications(message);
    if (applications.length > 0) {
      return {
        type: 'create_applications',
        applications,
      };
    }
  }
  
  // Check for status update patterns
  const statusPatterns = [
    /(?:got|received)\s+(?:a\s+)?(.+?)\s+(?:from|at)\s+(.+?)(?:\.\s*|$|,|;)/i,
    /moved\s+(?:to|into)\s+(.+?)\s+(?:at|with)\s+(.+?)(?:\.\s*|$|,|;)/i,
  ];
  
  const statusKeywords = ['interview', 'offer', 'rejected', 'shortlisted'];
  
  for (const pattern of statusPatterns) {
    const match = message.match(pattern);
    if (match) {
      const potentialStatus = match[1].toLowerCase();
      const company = match[2].trim();
      
      for (const keyword of statusKeywords) {
        if (potentialStatus.includes(keyword)) {
          return {
            type: 'update_status',
            applications: [],
            statusUpdate: { company, status: keyword },
          };
        }
      }
    }
  }
  
  // Check for interview scheduling
  // Pattern: "interview scheduled with [Company] on [Date]" or "interview at [Company] on [Date]"
  // We extract company first, then look for date separately in the full message
  const interviewPatterns = [
    // "interview scheduled with Google on 03/25" - company is after "with" or "at"
    /interview\s+(?:scheduled|at)\s+(?:with\s+)?(.+?)(?:\s+on\s+|\s+at\s+)(.+?)(?:\.\s*|$|,|;)/i,
    // "have an interview with Google on 03/25" - company after "with"
    /have\s+(?:an\s+)?interview\s+(?:with|at)\s+(.+?)(?:\s+on\s+|\s+at\s+)(.+?)(?:\.\s*|$|,|;)/i,
    // "interview on 03/25 with Google" - date first, company after "with"
    /interview\s+(?:on\s+)?(.+?)\s+(?:with|at)\s+(.+?)(?:\.\s*|$|,|;)/i,
  ];
  
  for (const pattern of interviewPatterns) {
    const match = message.match(pattern);
    if (match) {
      const dateMatch = message.match(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/);
      const date = dateMatch ? dateMatch[0] : 'pending';
      // Company is always the last capture group (the entity name, not the date)
      // We try match[2] first (usually company), fallback to match[1]
      const candidate1 = match[1]?.trim();
      const candidate2 = match[2]?.trim();
      // Choose the one that looks more like a company name (not a date)
      const looksLikeDate = (s: string) => /^\d{1,2}[\/\.-]\d{1,2}/.test(s);
      const company = looksLikeDate(candidate1) ? candidate2 : candidate1 || candidate2;
      
      if (company && !looksLikeDate(company)) {
        return {
          type: 'schedule_interview',
          applications: [],
          interviewSchedule: { company, date },
        };
      }
    }
  }
  
  return { type: 'general_chat', applications: [] };
}

function normalizeRole(role: string | undefined): string {
  return role?.trim().replace(/\s+/g, ' ') || 'Software Engineer';
}

function getRoundTypeForNumber(roundNumber: number): string {
  if (roundNumber === 1) return 'TechnicalRound1';
  if (roundNumber === 2) return 'TechnicalRound2';
  return `Round ${roundNumber}`;
}

function parseScheduledInterviewDate(value: string): Date | null {
  if (!value || value === 'pending') return null;

  const parsed = tryParseDateInput(value);
  if (parsed) return parsed;

  const nativeParsed = new Date(value);
  if (Number.isNaN(nativeParsed.getTime())) {
    return null;
  }

  return nativeParsed;
}

// POST /api/chat/action - Process chat message with multi-card support
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validation = chatActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // Get current counters BEFORE processing
    const countersBefore = await getUsageCounters(user.userId);

    // Check message usage limit
    const usageCheck = await checkUsageLimit(user.userId, 'message');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Usage limit exceeded',
          message: usageCheck.reason,
          code: 'PAYMENT_REQUIRED',
          counters: {
            promptsSent: countersBefore.promptsSent,
            kanbanCardsCreated: countersBefore.kanbanCardsCreated,
          },
        },
        { status: 402 }
      );
    }

    // Track prompt sent
    await trackUsage(user.userId, 'message');
    const promptsSentAfter = countersBefore.promptsSent + 1;

    // Parse the message for actions
    const action = parseMessageForMultiAction(message);
    const results: CreationResult[] = [];
    let cardsCreated = 0;
    let limitExceeded = false;
    let truncated = false;

    // Execute multi-card creation
    if (action.type === 'create_applications' && action.applications.length > 0) {
      // Check if we need to truncate to 5 cards
      let appsToCreate = action.applications;
      if (appsToCreate.length > MAX_CARDS_PER_PROMPT) {
        appsToCreate = appsToCreate.slice(0, MAX_CARDS_PER_PROMPT);
        truncated = true;
      }

      // Check usage limit for each card atomically to prevent race conditions
      for (const app of appsToCreate) {
        const usageCheck = await checkUsageLimit(user.userId, 'application');
        if (!usageCheck.allowed) {
          limitExceeded = true;
          results.push({
            success: false,
            company: app.company,
            error: usageCheck.reason || 'Usage limit exceeded',
          });
          continue;
        }

        try {
          const company = sanitizeCompanyName(app.company);
          const role = normalizeRole(app.role);

          if (!company) {
            results.push({
              success: false,
              company: app.company,
              error: 'Missing company name',
            });
            continue;
          }

          const application = await prisma.application.create({
            data: {
              userId: user.userId,
              company,
              role,
              roleType: role,
              status: 'applied',
              applicationDate: new Date(),
              notes: '', // Don't store full message to avoid bloat
            },
          });

          await trackUsage(user.userId, 'application');
          cardsCreated++;

          results.push({
            success: true,
            company: application.company,
            role: application.role,
            id: application.id,
          });
        } catch (error) {
          console.error(`Failed to create application for ${app.company}:`, error);
          results.push({
            success: false,
            company: app.company,
            error: 'Failed to create application',
          });
        }
      }
    } else if (action.type === 'update_status' && action.statusUpdate) {
      // Handle status update (single for now)
      try {
        const application = await prisma.application.findFirst({
          where: {
            userId: user.userId,
            company: {
              contains: action.statusUpdate.company,
              mode: 'insensitive',
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (application) {
          const updated = await prisma.application.update({
            where: { id: application.id },
            data: {
              status: action.statusUpdate.status,
            },
          });

          results.push({
            success: true,
            type: 'status_updated',
            company: updated.company,
            newStatus: updated.status,
          });
        } else {
          results.push({
            success: false,
            error: `No application found for ${action.statusUpdate.company}`,
          });
        }
      } catch (error) {
        console.error('Failed to update application status from chat action:', error);
        results.push({
          success: false,
          error: 'Failed to update status',
        });
      }
    } else if (action.type === 'schedule_interview' && action.interviewSchedule) {
      // Handle interview scheduling (single for now)
      try {
        const application = await prisma.application.findFirst({
          where: {
            userId: user.userId,
            company: {
              contains: action.interviewSchedule.company,
              mode: 'insensitive',
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (application) {
          const lastRound = await prisma.interviewRound.findFirst({
            where: { applicationId: application.id },
            orderBy: { roundNumber: 'desc' },
          });

          const nextRoundNumber = (lastRound?.roundNumber || 0) + 1;

          const roundType = getRoundTypeForNumber(nextRoundNumber);
          const scheduledDate = parseScheduledInterviewDate(
            action.interviewSchedule.date
          );

          const round = await prisma.interviewRound.create({
            data: {
              applicationId: application.id,
              roundNumber: nextRoundNumber,
              roundType,
              scheduledDate,
            },
          });

          await prisma.application.update({
            where: { id: application.id },
            data: {
              status: 'interview',
              currentRound: roundType,
              ...(scheduledDate ? { interviewDate: scheduledDate } : {}),
            },
          });

          results.push({
            success: true,
            type: 'interview_scheduled',
            company: application.company,
            roundNumber: round.roundNumber,
          });
        } else {
          results.push({
            success: false,
            error: `No application found for ${action.interviewSchedule.company}`,
          });
        }
      } catch (error) {
        console.error('Failed to schedule interview from chat action:', error);
        results.push({
          success: false,
          error: 'Failed to schedule interview',
        });
      }
    }

    // Get updated counters AFTER processing
    const countersAfter = await getUsageCounters(user.userId);

    // Generate response message
    let responseMessage: string;
    
    if (action.type === 'general_chat') {
      responseMessage = "I'm here to help you track your job applications! 💼\n\n**You can create up to 5 cards in one message.** Try saying:\n\n• \"Applied to Google, Amazon, and Microsoft as SDE\"\n• \"Applied for SWE at Meta, PM at Netflix, and Data at Uber\"\n• \"Just applied to Flipkart, Swiggy, Zomato, Ola, and Razorpay\"\n\nI'll automatically create kanban cards for each one!";
    } else if (action.type === 'create_applications') {
      const successfulResults = results.filter(r => r.success);
      const successCount = successfulResults.length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount === 0) {
        responseMessage = "⚠️ I couldn't create any applications. You may have reached your limit or there was an error.";
      } else if (successCount === 1) {
        const success = successfulResults[0];
        responseMessage = `✅ Created 1 application: **${success.role}** at **${success.company}**`;
      } else {
        const companies = successfulResults.map(r => r.company).join(', ');
        responseMessage = `✅ Created **${successCount} applications**!\n\nCompanies: ${companies}`;
        
        if (truncated) {
          responseMessage += `\n\n⚠️ Note: I can only create up to ${MAX_CARDS_PER_PROMPT} cards per message. The rest were skipped.`;
        }
        if (limitExceeded) {
          responseMessage += `\n\n⚠️ You've reached your application limit. Upgrade to create more!`;
        }
      }
      
      if (failCount > 0) {
        const failed = results.filter(r => !r.success).map(r => r.company).join(', ');
        responseMessage += `\n\n⚠️ Failed to create: ${failed}`;
      }
    } else if (results[0]?.success) {
      responseMessage = `✅ ${results[0].type === 'status_updated' 
        ? `Updated status for **${results[0].company}** to **${results[0].newStatus}**`
        : `Interview scheduled for **${results[0].company}** (Round ${results[0].roundNumber})`}`;
    } else {
      responseMessage = `⚠️ ${results[0]?.error || 'Something went wrong'}`;
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      action: {
        type: action.type,
        results,
      },
      counters: {
        promptsSent: promptsSentAfter,
        kanbanCardsCreated: countersAfter.kanbanCardsCreated,
        cardsCreatedThisPrompt: cardsCreated,
        remainingApplications: countersAfter.remainingLimit === null ? -1 : countersAfter.remainingLimit, // -1 means unlimited
      },
      limits: {
        maxCardsPerPrompt: MAX_CARDS_PER_PROMPT,
        truncated,
        limitExceeded,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Chat action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
