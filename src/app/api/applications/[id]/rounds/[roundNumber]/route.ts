/**
 * API Route: /api/applications/[id]/rounds/[roundNumber]
 * PUT - Update interview round by round number
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

const interviewRoundTypeSchema = z.string().trim().min(1).max(120);

const updateRoundSchema = z.object({
    roundType: interviewRoundTypeSchema.optional(),
    scheduledDate: z.string().optional().nullable(),
    notes: z.string().optional(),
    questionsAsked: z.array(z.string()).optional(),
});

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; roundNumber: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id, roundNumber } = await params;
        const numericRoundNumber = Number.parseInt(roundNumber, 10);

        if (!Number.isInteger(numericRoundNumber) || numericRoundNumber <= 0) {
            return NextResponse.json(
                { error: "roundNumber must be a positive integer" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const validation = updateRoundSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid input", issues: validation.error.issues },
                { status: 400 }
            );
        }

        const app = await prisma.application.findFirst({
            where: { id, userId: user.userId },
        });
        if (!app) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        const existingRound = await prisma.interviewRound.findUnique({
            where: {
                applicationId_roundNumber: {
                    applicationId: id,
                    roundNumber: numericRoundNumber,
                },
            },
        });

        if (!existingRound) {
            return NextResponse.json(
                { error: "Round not found" },
                { status: 404 }
            );
        }

        const data = validation.data;
        const round = await prisma.interviewRound.update({
            where: {
                applicationId_roundNumber: {
                    applicationId: id,
                    roundNumber: numericRoundNumber,
                },
            },
            data: {
                ...(data.roundType !== undefined ? { roundType: data.roundType } : {}),
                ...(data.scheduledDate !== undefined
                    ? { scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null }
                    : {}),
                ...(data.notes !== undefined ? { notes: data.notes } : {}),
                ...(data.questionsAsked !== undefined ? { questionsAsked: data.questionsAsked } : {}),
            },
        });

        return NextResponse.json(round);
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.error("Update interview round error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
