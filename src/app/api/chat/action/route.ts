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
import { checkUsageLimit, trackUsage } from '@/lib/freemium';

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

// Counters for tracking
interface CreationCounters {
  promptsSent: number;
  kanbanCardsCreated: number;
  remainingLimit: number;
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
  
  let match;
  
  // Try Pattern 1: Role at Company, Role at Company
  const roleMatches = Array.from(message.matchAll(roleAtCompanyPattern));
  if (roleMatches.length >= 2) {
    for (const m of roleMatches.slice(0, MAX_CARDS_PER_PROMPT)) {
      const role = m[1]?.trim();
      const company = m[2]?.trim().replace(/,\s*$/g, '').replace(/\s+and\s*$/i, '');
      if (role && company && !seenCompanies.has(company.toLowerCase())) {
        seenCompanies.add(company.toLowerCase());
        applications.push({ company, role, notes: message });
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
        applications.push({ company, role, notes: message });
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
          notes: message 
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
      .filter(item => item.length > 1 && !['applied', 'to', 'at'].includes(item.toLowerCase()));
    
    for (const item of items.slice(0, MAX_CARDS_PER_PROMPT)) {
      const cleanCompany = item.replace(/[,.\s]+$/g, '').trim();
      if (cleanCompany && !seenCompanies.has(cleanCompany.toLowerCase())) {
        seenCompanies.add(cleanCompany.toLowerCase());
        applications.push({ 
          company: cleanCompany, 
          role: sharedRole, 
          notes: message 
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
        applications.push({ company, role, notes: message });
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
  const lowerMessage = message.toLowerCase();
  
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
  const interviewPatterns = [
    /interview\s+(?:scheduled|at|on)\s+(.+?)\s+(?:at|with)\s+(.+?)(?:\.\s*|$|,|;)/i,
    /have\s+(?:an\s+)?interview\s+(?:at|with)\s+(.+?)\s+(?:on|at)\s+(.+?)(?:\.\s*|$|,|;)/i,
  ];
  
  for (const pattern of interviewPatterns) {
    const match = message.match(pattern);
    if (match) {
      const dateMatch = message.match(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/);
      const date = dateMatch ? dateMatch[0] : 'pending';
      const company = match[1]?.trim() || match[2]?.trim();
      
      return {
        type: 'schedule_interview',
        applications: [],
        interviewSchedule: { company, date },
      };
    }
  }
  
  return { type: 'general_chat', applications: [] };
}

/**
 * Get current counters for user
 */
async function getUserCounters(userId: string): Promise<CreationCounters> {
  const [usageLimit, subscription] = await Promise.all([
    prisma.usageLimit.findUnique({ where: { userId } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);
  
  const plan = subscription?.plan || 'free';
  const limits = {
    free: { applications: 5, messages: 50 },
    pro: { applications: Infinity, messages: Infinity },
    premium: { applications: Infinity, messages: Infinity },
  };
  
  const planLimits = limits[plan as keyof typeof limits] || limits.free;
  
  return {
    promptsSent: usageLimit?.messagesCount || 0,
    kanbanCardsCreated: usageLimit?.applicationsCount || 0,
    remainingLimit: Math.max(0, planLimits.applications - (usageLimit?.applicationsCount || 0)),
  };
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
    const countersBefore = await getUserCounters(user.userId);

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
    const results: any[] = [];
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

      // Check if user has enough quota for all cards
      const remainingQuota = countersBefore.remainingLimit;
      if (remainingQuota < appsToCreate.length) {
        appsToCreate = appsToCreate.slice(0, remainingQuota);
        limitExceeded = true;
      }

      for (const app of appsToCreate) {
        try {
          const application = await prisma.application.create({
            data: {
              userId: user.userId,
              company: app.company,
              role: app.role,
              status: 'applied',
              applicationDate: new Date(),
              notes: app.notes || '',
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

          const round = await prisma.interviewRound.create({
            data: {
              applicationId: application.id,
              roundNumber: nextRoundNumber,
              roundType: 'technical',
            },
          });

          if (application.status === 'applied') {
            await prisma.application.update({
              where: { id: application.id },
              data: { status: 'interview' },
            });
          }

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
        results.push({
          success: false,
          error: 'Failed to schedule interview',
        });
      }
    }

    // Get updated counters AFTER processing
    const countersAfter = await getUserCounters(user.userId);

    // Generate response message
    let responseMessage: string;
    
    if (action.type === 'general_chat') {
      responseMessage = "I'm here to help you track your job applications! 💼\n\n**You can create up to 5 cards in one message.** Try saying:\n\n• \"Applied to Google, Amazon, and Microsoft as SDE\"\n• \"Applied for SWE at Meta, PM at Netflix, and Data at Uber\"\n• \"Just applied to Flipkart, Swiggy, Zomato, Ola, and Razorpay\"\n\nI'll automatically create kanban cards for each one!";
    } else if (action.type === 'create_applications') {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount === 0) {
        responseMessage = "⚠️ I couldn't create any applications. You may have reached your limit or there was an error.";
      } else if (successCount === 1) {
        responseMessage = `✅ Created 1 application: **${results[0].role}** at **${results[0].company}**`;
      } else {
        const companies = results.filter(r => r.success).map(r => r.company).join(', ');
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
        remainingApplications: countersAfter.remainingLimit,
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
