/**
 * API Route: /api/chat/action
 * POST endpoint that processes chat messages
 * If user says "applied for X at Y", create application via AI
 * Return both chat response AND action taken
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { checkUsageLimit, trackUsage } from '@/lib/freemium';

const chatActionSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    previousMessages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }).optional(),
});

// Types of actions that can be extracted from messages
type ChatAction = 
  | { type: 'create_application'; data: { company: string; role: string; notes?: string } }
  | { type: 'update_status'; data: { company: string; status: string; notes?: string } }
  | { type: 'schedule_interview'; data: { company: string; date: string; notes?: string } }
  | { type: 'general_chat'; data: null };

/**
 * Parse user message to detect actions
 * This is a simplified version - in production, use a proper NLP service
 */
function parseMessageForAction(message: string): ChatAction {
  const lowerMessage = message.toLowerCase();
  
  // Patterns for creating applications
  const applicationPatterns = [
    /applied\s+(?:for\s+)?(.+?)\s+(?:at|to)\s+(.+?)(?:\.|$|,|;)/i,
    /applied\s+(?:to\s+)?(.+?)\s+(?:for\s+)?(.+?)(?:\.|$|,|;)/i,
    /just\s+applied\s+(?:for\s+)?(.+?)\s+(?:at|to)\s+(.+?)(?:\.|$|,|;)/i,
    /submitted\s+(?:my\s+)?application\s+(?:for\s+)?(.+?)\s+(?:at|to)\s+(.+?)(?:\.|$|,|;)/i,
  ];

  for (const pattern of applicationPatterns) {
    const match = message.match(pattern);
    if (match) {
      const role = match[1].trim();
      const company = match[2].trim();
      return {
        type: 'create_application',
        data: { company, role, notes: message },
      };
    }
  }

  // Patterns for status updates
  const statusPatterns = [
    /(?:got|received)\s+(?:a\s+)?(.+?)\s+(?:from|at)\s+(.+?)(?:\.|$|,|;)/i,
    /moved\s+(?:to|into)\s+(.+?)\s+(?:at|with)\s+(.+?)(?:\.|$|,|;)/i,
    /(?:i am|i'm)\s+(?:now\s+)?(.+?)\s+(?:at|with)\s+(.+?)(?:\.|$|,|;)/i,
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
            data: { company, status: keyword, notes: message },
          };
        }
      }
    }
  }

  // Patterns for interview scheduling
  const interviewPatterns = [
    /interview\s+(?:scheduled|at|on)\s+(.+?)\s+(?:at|with)\s+(.+?)(?:\.|$|,|;)/i,
    /have\s+(?:an\s+)?interview\s+(?:at|with)\s+(.+?)\s+(?:on|at)\s+(.+?)(?:\.|$|,|;)/i,
  ];

  for (const pattern of interviewPatterns) {
    const match = message.match(pattern);
    if (match) {
      // Try to extract date - simplified
      const dateMatch = message.match(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/);
      const date = dateMatch ? dateMatch[0] : 'pending';
      const company = message.toLowerCase().includes('with') 
        ? match[2]?.trim() || match[1]?.trim()
        : match[1]?.trim();
      
      return {
        type: 'schedule_interview',
        data: { company, date, notes: message },
      };
    }
  }

  return { type: 'general_chat', data: null };
}

// POST /api/chat/action - Process chat message and potentially take action
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

    const { message, context } = validation.data;

    // Check message usage limit
    const usageCheck = await checkUsageLimit(user.userId, 'message');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Usage limit exceeded',
          message: usageCheck.reason,
          code: 'PAYMENT_REQUIRED',
        },
        { status: 402 }
      );
    }

    // Track message usage
    await trackUsage(user.userId, 'message');

    // Parse the message for actions
    const action = parseMessageForAction(message);
    let actionResult: any = null;

    // Execute the action if detected
    if (action.type === 'create_application') {
      // Check application limit before creating
      const appCheck = await checkUsageLimit(user.userId, 'application');
      if (!appCheck.allowed) {
        actionResult = {
          success: false,
          error: 'Application limit reached. Upgrade to add more applications.',
          limitReached: true,
        };
      } else {
        try {
          // Create the application
          const application = await prisma.application.create({
            data: {
              userId: user.userId,
              company: action.data.company,
              role: action.data.role,
              status: 'applied',
              applicationDate: new Date(),
              notes: action.data.notes || '',
            },
          });

          // Track application usage
          await trackUsage(user.userId, 'application');

          actionResult = {
            success: true,
            type: 'application_created',
            data: {
              id: application.id,
              company: application.company,
              role: application.role,
              status: application.status,
            },
          };
        } catch (error) {
          console.error('Failed to create application:', error);
          actionResult = {
            success: false,
            error: 'Failed to create application',
          };
        }
      }
    } else if (action.type === 'update_status') {
      try {
        // Find the application by company name
        const application = await prisma.application.findFirst({
          where: {
            userId: user.userId,
            company: {
              contains: action.data.company,
              mode: 'insensitive',
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (application) {
          const updated = await prisma.application.update({
            where: { id: application.id },
            data: {
              status: action.data.status,
              notes: action.data.notes 
                ? `${application.notes}\n\nStatus update: ${action.data.notes}`
                : application.notes,
            },
          });

          actionResult = {
            success: true,
            type: 'status_updated',
            data: {
              id: updated.id,
              company: updated.company,
              oldStatus: application.status,
              newStatus: updated.status,
            },
          };
        } else {
          actionResult = {
            success: false,
            error: `No application found for ${action.data.company}`,
          };
        }
      } catch (error) {
        console.error('Failed to update status:', error);
        actionResult = {
          success: false,
          error: 'Failed to update status',
        };
      }
    } else if (action.type === 'schedule_interview') {
      try {
        const application = await prisma.application.findFirst({
          where: {
            userId: user.userId,
            company: {
              contains: action.data.company,
              mode: 'insensitive',
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (application) {
          // Get the next round number
          const lastRound = await prisma.interviewRound.findFirst({
            where: { applicationId: application.id },
            orderBy: { roundNumber: 'desc' },
          });

          const nextRoundNumber = (lastRound?.roundNumber || 0) + 1;

          const round = await prisma.interviewRound.create({
            data: {
              applicationId: application.id,
              roundNumber: nextRoundNumber,
              roundType: 'technical', // Default, user can update later
              notes: action.data.notes || '',
            },
          });

          // Update application status if needed
          if (application.status === 'applied') {
            await prisma.application.update({
              where: { id: application.id },
              data: { status: 'interview' },
            });
          }

          actionResult = {
            success: true,
            type: 'interview_scheduled',
            data: {
              applicationId: application.id,
              company: application.company,
              roundNumber: round.roundNumber,
            },
          };
        } else {
          actionResult = {
            success: false,
            error: `No application found for ${action.data.company}`,
          };
        }
      } catch (error) {
        console.error('Failed to schedule interview:', error);
        actionResult = {
          success: false,
          error: 'Failed to schedule interview',
        };
      }
    }

    // Generate response message based on action
    let responseMessage: string;
    
    if (action.type === 'general_chat') {
      responseMessage = "I understand! I'm here to help you track your job applications. You can tell me things like 'I applied for Software Engineer at Google' or 'I got an offer from Meta' and I'll update your tracker automatically.";
    } else if (actionResult?.success) {
      switch (actionResult.type) {
        case 'application_created':
          responseMessage = `✅ Great! I've added your application for **${actionResult.data.role}** at **${actionResult.data.company}**. Good luck!`;
          break;
        case 'status_updated':
          responseMessage = `✅ Updated! Your application at **${actionResult.data.company}** is now marked as **${actionResult.data.newStatus}**.`;
          break;
        case 'interview_scheduled':
          responseMessage = `✅ Interview scheduled! I've added Round ${actionResult.data.roundNumber} for **${actionResult.data.company}**.`;
          break;
        default:
          responseMessage = '✅ Action completed successfully!';
      }
    } else if (actionResult?.limitReached) {
      responseMessage = `⚠️ ${actionResult.error}`;
    } else {
      responseMessage = `⚠️ I tried to process your request but encountered an issue: ${actionResult?.error || 'Unknown error'}. You can try again or update your tracker manually.`;
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      action: actionResult,
      usage: {
        messages: {
          used: usageCheck.current.messages + 1,
          limit: usageCheck.limits.messages,
        },
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