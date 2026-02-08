/**
 * API Route: /api/applications/[id]/rounds
 * POST - Add interview round to an application
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

const interviewRoundTypeSchema = z.string().trim().min(1).max(120);

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

        const data = validation.data;
        const updatedApplication = await prisma.application.update({
            where: { id, userId: user.userId },
            data: {
                rounds: {
                    create: {
                        roundNumber: data.roundNumber,
                        roundType: data.roundType,
                        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
                        notes: data.notes,
                        questionsAsked: data.questionsAsked,
                    },
                },
            },
            select: {
                rounds: {
                    where: { roundNumber: data.roundNumber },
                    take: 1,
                },
            },
        });

        const [round] = updatedApplication.rounds;
        if (!round) {
            return NextResponse.json(
                { error: "Created round could not be loaded" },
                { status: 500 }
            );
        }

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
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        console.error("Create interview round error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
