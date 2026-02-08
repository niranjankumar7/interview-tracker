/**
 * API Route: /api/applications/[id]/rounds
 * POST - Add interview round to an application
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

const interviewRoundTypeSchema = z.enum([
    "HR",
    "TechnicalRound1",
    "TechnicalRound2",
    "SystemDesign",
    "Managerial",
    "Assignment",
    "Final",
]);

const createRoundSchema = z.object({
    roundNumber: z.number().int().positive(),
    roundType: interviewRoundTypeSchema,
    scheduledDate: z.string().optional().nullable(),
    notes: z.string().default(""),
    questionsAsked: z.array(z.string()).default([]),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        const { id } = await params;

        const body = await req.json();
        const validation = createRoundSchema.safeParse(body);
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

        const data = validation.data;
        const round = await prisma.interviewRound.create({
            data: {
                applicationId: id,
                roundNumber: data.roundNumber,
                roundType: data.roundType,
                scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
                notes: data.notes,
                questionsAsked: data.questionsAsked,
            },
        });

        return NextResponse.json(round, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Round number already exists for this application." },
                { status: 409 }
            );
        }

        console.error("Create interview round error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
