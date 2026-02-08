"use client";

import { useStore } from "@/lib/store";
import { generateSprint } from "@/lib/sprintGenerator";
import { tryParseDateInput } from "@/lib/date-parsing";
import { isGenericRole, rolesEquivalent, sanitizeCompanyName } from "@/lib/application-intake";
import { RoleType, Application, InterviewRound, InterviewRoundType, interviewRoundTypes } from "@/types";
import { format, addDays } from "date-fns";
import { useTamboComponentState } from "@tambo-ai/react";
import { Calendar, Briefcase, Building2, CheckCircle2, Target } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";

// Props schema for Tambo registration
export const sprintSetupCardSchema = z.object({
    company: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe("The company name for the interview")
    ),
    role: z.preprocess(
        (val) => val ?? undefined,
        z.enum(["SDE", "SDET", "ML", "DevOps", "Frontend", "Backend", "FullStack", "Data", "PM", "MobileEngineer"])
            .optional()
            .describe("The role type being interviewed for (SDE=Software Dev, SDET=Test Engineer, ML=Machine Learning, DevOps, Frontend, Backend, FullStack, Data=Data Engineer/Analyst, PM=Product Manager, MobileEngineer)")
    ),
    interviewDate: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe("The interview date in YYYY-MM-DD format or a relative description like 'next Thursday'")
    ),
    roundType: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("The type of interview round (e.g., TechnicalRound1, SystemDesign, Managerial, etc.)"),
    panelId: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe("Unique panel id to avoid state collisions")
    ),
});

interface SprintSetupCardProps {
    company?: string;
    role?: RoleType;
    interviewDate?: string;
    roundType?: InterviewRoundType;
    panelId?: string;
}

interface SprintSetupState {
    company: string;
    role: RoleType;
    interviewDate: string;
    roundType: InterviewRoundType;
    isSubmitted: boolean;
    isSubmitting: boolean;
    companyError?: string;
    interviewDateError?: string;
    formError?: string;
    hydrated?: {
        company: string;
        role: RoleType;
        interviewDate: string;
        roundType: InterviewRoundType;
    };
}

type HydratedSprintSetupState = {
    company: string;
    role: RoleType;
    interviewDate: string;
    roundType: InterviewRoundType;
};

const ROLE_LABELS: Record<RoleType, string> = {
    SDE: "Software Engineer",
    SDET: "Software Development Engineer in Test",
    ML: "ML Engineer",
    DevOps: "DevOps Engineer",
    Frontend: "Frontend Developer",
    Backend: "Backend Developer",
    FullStack: "Full Stack Developer",
    Data: "Data Engineer",
    PM: "Product Manager",
    MobileEngineer: "Mobile Engineer",
};

const INTERVIEW_ROUND_TYPE_LABELS: Record<(typeof interviewRoundTypes)[number], string> = {
    HR: "HR Round",
    TechnicalRound1: "Technical Round 1",
    TechnicalRound2: "Technical Round 2",
    SystemDesign: "System Design",
    Managerial: "Managerial Round",
    Assignment: "One-Week Assignment",
    Final: "Final Round",
};

const ROUND_SEQUENCE: InterviewRoundType[] = [
    "TechnicalRound1",
    "TechnicalRound2",
    "SystemDesign",
    "Managerial",
    "Final",
];

function getRoundTypeLabel(roundType: InterviewRoundType): string {
    return INTERVIEW_ROUND_TYPE_LABELS[roundType as (typeof interviewRoundTypes)[number]] ?? roundType;
}

function roleLabelForType(roleType: RoleType): string {
    return ROLE_LABELS[roleType];
}

function getNextRoundType(rounds: InterviewRound[]): InterviewRoundType {
    if (rounds.length === 0) return ROUND_SEQUENCE[0];

    // Find the last round in the sequence that has been completed or scheduled
    const lastRound = rounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];
    if (!lastRound) return ROUND_SEQUENCE[0];

    const lastRoundTypeIndex = ROUND_SEQUENCE.indexOf(lastRound.roundType);

    // If exact match found in sequence, suggest next
    if (lastRoundTypeIndex !== -1 && lastRoundTypeIndex < ROUND_SEQUENCE.length - 1) {
        return ROUND_SEQUENCE[lastRoundTypeIndex + 1];
    }

    // Fallback logic or default to next logical step if outside sequence
    return "TechnicalRound1";
}

function toDateKey(value: string | Date | undefined): string | undefined {
    if (!value) return undefined;

    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return undefined;
    return format(dateValue, "yyyy-MM-dd");
}

function getNextRoundNumber(rounds: InterviewRound[]): number {
    if (rounds.length === 0) return 1;
    return Math.max(...rounds.map((round) => round.roundNumber)) + 1;
}

function findMatchingApplication(args: {
    applications: Application[];
    company: string;
    roleType: RoleType;
}): Application | undefined {
    const normalizedCompany = sanitizeCompanyName(args.company).toLowerCase();
    const roleLabel = roleLabelForType(args.roleType);

    const candidates = args.applications
        .filter(
            (application) =>
                sanitizeCompanyName(application.company).toLowerCase() === normalizedCompany
        )
        .sort((a, b) => {
            const aTime = new Date(a.createdAt || a.applicationDate || 0).getTime();
            const bTime = new Date(b.createdAt || b.applicationDate || 0).getTime();
            return bTime - aTime;
        });

    if (candidates.length === 0) return undefined;

    const exactRoleType = candidates.find(
        (candidate) => candidate.roleType === args.roleType
    );
    if (exactRoleType) return exactRoleType;

    const exactRole = candidates.find((candidate) =>
        rolesEquivalent(candidate.role, roleLabel)
    );
    if (exactRole) return exactRole;

    const genericRole = candidates.find((candidate) => isGenericRole(candidate.role));
    if (genericRole) return genericRole;

    return candidates[0];
}

function validateSprintSetupInput(state: SprintSetupState): {
    company: string;
    interviewDate: string;
    parsedDate: Date | null;
    companyError?: string;
    interviewDateError?: string;
} {
    const company = state.company.trim();
    const interviewDate = state.interviewDate.trim();

    const companyError = company.length === 0 ? "Please enter a company name." : undefined;
    const interviewDateMissingError =
        interviewDate.length === 0 ? "Please select an interview date." : undefined;

    const parsedDate = interviewDate.length > 0 ? tryParseDateInput(interviewDate) : null;
    const interviewDateError =
        interviewDateMissingError ??
        (parsedDate ? undefined : "Please select a valid interview date.");

    return {
        company,
        interviewDate,
        parsedDate,
        companyError,
        interviewDateError,
    };
}

function useSyncHydratedSprintSetupState(
    hydrated: HydratedSprintSetupState,
    state: SprintSetupState | undefined,
    setState: (nextState: SprintSetupState) => void
) {
    useEffect(() => {
        const nextHydrated = {
            company: hydrated.company,
            role: hydrated.role,
            interviewDate: hydrated.interviewDate,
            roundType: hydrated.roundType,
        };

        if (!state || state.isSubmitted || state.isSubmitting) {
            return;
        }

        if (!state.hydrated) {
            setState({ ...state, hydrated: nextHydrated });
            return;
        }

        const prevHydrated = state.hydrated;

        const hydratedChanged =
            prevHydrated.company !== nextHydrated.company ||
            prevHydrated.role !== nextHydrated.role ||
            prevHydrated.interviewDate !== nextHydrated.interviewDate ||
            prevHydrated.roundType !== nextHydrated.roundType;

        if (!hydratedChanged) return;

        const stateMatchesPrevHydrated =
            state.company === prevHydrated.company &&
            state.role === prevHydrated.role &&
            state.interviewDate === prevHydrated.interviewDate &&
            state.roundType === prevHydrated.roundType;

        if (stateMatchesPrevHydrated) {
            setState({
                ...state,
                company: nextHydrated.company,
                role: nextHydrated.role,
                interviewDate: nextHydrated.interviewDate,
                roundType: nextHydrated.roundType,
                companyError: undefined,
                interviewDateError: undefined,
                formError: undefined,
                hydrated: nextHydrated,
            });
            return;
        }

        setState({ ...state, hydrated: nextHydrated });
    }, [hydrated.company, hydrated.role, hydrated.interviewDate, hydrated.roundType, setState, state]);
}

export function SprintSetupCard({
    company: initialCompany,
    role: initialRole,
    interviewDate: initialDate,
    roundType: initialRoundType,
    panelId,
}: SprintSetupCardProps) {
    const applications = useStore((s) => s.applications);

    // Determine default round type based on existing application or prediction
    const getDefaultRoundTypeForApp = (companyName: string, roleType: RoleType): InterviewRoundType => {
        const app = findMatchingApplication({
            applications,
            company: companyName,
            roleType,
        });

        if (app) {
            return getNextRoundType(app.rounds);
        }

        return "TechnicalRound1";
    };

    const hydratedCompany = initialCompany || "";
    const hydratedRole: RoleType = initialRole ?? "SDE";
    const hydratedInterviewDate = normalizeDateInputValue(
        initialDate || getDefaultDate()
    );
    const hydratedRoundType: InterviewRoundType = initialRoundType ?? getDefaultRoundTypeForApp(hydratedCompany, hydratedRole);


    const componentStateKey = useMemo(() => {
        const normalizedCompany = sanitizeCompanyName(hydratedCompany).toLowerCase() || "unknown";
        const dateKey = hydratedInterviewDate || "unscheduled";
        return `sprint-setup-card:${normalizedCompany}:${hydratedRole}:${dateKey}:${hydratedRoundType}`;
    }, [hydratedCompany, hydratedInterviewDate, hydratedRole, hydratedRoundType]);

    const componentId = useMemo(() => {
        if (panelId) return `sprint-setup-card:${panelId}`;
        const companySlug = (hydratedCompany || "unknown").toLowerCase().trim();
        const roleSlug = hydratedRole.toLowerCase();
        const dateSlug = hydratedInterviewDate || "unknown-date";
        return `sprint-setup-card:${companySlug}:${roleSlug}:${dateSlug}`;
    }, [hydratedCompany, hydratedInterviewDate, hydratedRole, panelId]);

    const [state, setState] = useTamboComponentState<SprintSetupState>(
        panelId ? componentId : componentStateKey,
        {
            company: hydratedCompany,
            role: hydratedRole,
            interviewDate: hydratedInterviewDate,
            roundType: hydratedRoundType,
            isSubmitted: false,
            isSubmitting: false,
            companyError: undefined,
            interviewDateError: undefined,
            formError: undefined,
            hydrated: {
                company: hydratedCompany,
                role: hydratedRole,
                interviewDate: hydratedInterviewDate,
                roundType: hydratedRoundType,
            },
        }
    );

    const sprints = useStore((s) => s.sprints);
    const createApplicationAPI = useStore((s) => s.createApplicationAPI);
    const updateApplicationAPI = useStore((s) => s.updateApplicationAPI);
    const createInterviewRoundAPI = useStore((s) => s.createInterviewRoundAPI);
    const createSprintAPI = useStore((s) => s.createSprintAPI);

    // Update round type when company/role changes if user hasn't manually set it?
    // For now, let's keep it simple and just rely on initial hydration or user selection.

    useSyncHydratedSprintSetupState(
        {
            company: hydratedCompany,
            role: hydratedRole,
            interviewDate: hydratedInterviewDate,
            roundType: hydratedRoundType,
        },
        state,
        setState
    );

    // Handle loading state
    if (!state) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-md animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    const validation = validateSprintSetupInput(state);
    const normalizedCompany = sanitizeCompanyName(validation.company);
    const selectedDateKey = toDateKey(validation.parsedDate ?? state.interviewDate);
    const matchedApplicationForCurrentInputs = normalizedCompany
        ? findMatchingApplication({
            applications,
            company: normalizedCompany,
            roleType: state.role,
        })
        : undefined;

    const hasMatchingSprint = Boolean(
        matchedApplicationForCurrentInputs &&
        selectedDateKey &&
        sprints.some(
            (sprint) =>
                sprint.applicationId === matchedApplicationForCurrentInputs.id &&
                toDateKey(sprint.interviewDate) === selectedDateKey
        )
    );

    const handleConfirm = async () => {
        if (!validation.parsedDate || validation.companyError || validation.interviewDateError) {
            setState({
                ...state,
                companyError: validation.companyError,
                interviewDateError: validation.interviewDateError,
                formError: undefined,
            });
            return;
        }

        const submittingState: SprintSetupState = {
            ...state,
            company: validation.company,
            interviewDate: format(validation.parsedDate, "yyyy-MM-dd"),
            isSubmitting: true,
            companyError: undefined,
            interviewDateError: undefined,
            formError: undefined,
        };

        setState(submittingState);

        try {
            const dateIso = validation.parsedDate.toISOString();
            const companyName = sanitizeCompanyName(validation.company);
            const roleLabel = roleLabelForType(state.role);
            const interviewDateKey = toDateKey(validation.parsedDate);

            if (!companyName) {
                throw new Error("Please enter a valid company name.");
            }
            if (!interviewDateKey) {
                throw new Error("Could not normalize interview date.");
            }

            let application =
                findMatchingApplication({
                    applications: useStore.getState().applications,
                    company: companyName,
                    roleType: state.role,
                }) ?? null;

            if (!application) {
                application = await createApplicationAPI({
                    company: companyName,
                    role: roleLabel,
                    roleType: state.role,
                    status: "interview",
                    applicationDate: new Date().toISOString(),
                    interviewDate: dateIso,
                    notes: "",
                });
            }

            const latestApplication =
                useStore
                    .getState()
                    .applications.find((candidate) => candidate.id === application.id) ??
                application;
            const existingRoundForDate = (latestApplication.rounds ?? []).find(
                (round) => toDateKey(round.scheduledDate) === interviewDateKey
            );

            let targetRound = existingRoundForDate;
            if (!targetRound) {
                const nextRoundNumber = getNextRoundNumber(latestApplication.rounds ?? []);

                // Use the user-selected round type
                const nextRoundType = state.roundType;

                try {
                    targetRound = await createInterviewRoundAPI(latestApplication.id, {
                        roundNumber: nextRoundNumber,
                        roundType: nextRoundType,
                        scheduledDate: dateIso,
                        notes: "",
                        questionsAsked: [],
                    });
                } catch {
                    const refreshedApp = useStore
                        .getState()
                        .applications.find((candidate) => candidate.id === latestApplication.id);
                    targetRound = refreshedApp?.rounds?.find(
                        (round) => toDateKey(round.scheduledDate) === interviewDateKey
                    );
                    if (!targetRound) {
                        throw new Error("Couldn't create interview round.");
                    }
                }
            }

            const shouldUpdateRole =
                isGenericRole(latestApplication.role) ||
                !rolesEquivalent(latestApplication.role, roleLabel);
            const shouldUpdateRoleType = latestApplication.roleType !== state.role;
            const shouldNormalizeCompany =
                sanitizeCompanyName(latestApplication.company) !== companyName;

            await updateApplicationAPI(latestApplication.id, {
                status: "interview",
                interviewDate: dateIso,
                currentRound: targetRound.roundType,
                ...(shouldNormalizeCompany ? { company: companyName } : {}),
                ...(shouldUpdateRole ? { role: roleLabel } : {}),
                ...(shouldUpdateRoleType ? { roleType: state.role } : {}),
            });

            const hasSprintForDate = useStore.getState().sprints.some(
                (sprint) =>
                    sprint.applicationId === latestApplication.id &&
                    toDateKey(sprint.interviewDate) === interviewDateKey
            );

            if (!hasSprintForDate) {
                const sprint = generateSprint(latestApplication.id, validation.parsedDate, state.role);
                // Also update the sprint generation to potentially use the round type context if needed in future
                // For now generateSprint uses the application's currentRound which we updated above
                await createSprintAPI({
                    applicationId: sprint.applicationId,
                    interviewDate: sprint.interviewDate,
                    roleType: sprint.roleType,
                    totalDays: sprint.totalDays,
                    dailyPlans: sprint.dailyPlans,
                });
            }

            setState({
                ...submittingState,
                isSubmitted: true,
                isSubmitting: false,
            });
        } catch (error) {
            console.error("Error creating sprint:", error);
            setState({
                ...submittingState,
                isSubmitting: false,
                formError: "Couldn't create the sprint. Please try again.",
            });
        }
    };

    if (state.isSubmitted || hasMatchingSprint) {
        return (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-lg max-w-md">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-green-800">
                            Sprint Created!
                        </h3>
                        <p className="text-sm text-green-600">
                            Your interview prep plan for {state.company} is ready
                        </p>
                    </div>
                </div>
                <p className="text-sm text-gray-600">
                    Ask me &ldquo;What should I do today?&rdquo; to see your daily tasks.
                </p>
            </div>
        );
    }
    const hasValues =
        validation.company.length > 0 && validation.interviewDate.length > 0;
    const hasFieldErrors = Boolean(
        state.companyError || state.interviewDateError || state.formError
    );
    const isFormValid = hasValues && !hasFieldErrors;

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg max-w-md">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg text-foreground">
                        Setup Interview Sprint
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Confirm your interview details
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Building2 className="w-4 h-4" />
                        Company
                    </label>
                    <input
                        type="text"
                        value={state.company}
                        onChange={(e) =>
                            setState({
                                ...state,
                                company: e.target.value,
                                companyError: undefined,
                                formError: undefined,
                            })
                        }
                        placeholder="e.g., Google, Amazon, Microsoft"
                        className="w-full px-4 py-2.5 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-muted-foreground"
                    />
                    {state.companyError && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {state.companyError}
                        </p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Briefcase className="w-4 h-4" />
                        Role Type
                    </label>
                    <select
                        value={state.role}
                        onChange={(e) =>
                            setState({
                                ...state,
                                role: e.target.value as RoleType,
                                formError: undefined,
                            })
                        }
                        className="w-full px-4 py-2.5 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="SDE">Software Development Engineer</option>
                        <option value="SDET">Software Dev Engineer in Test</option>
                        <option value="ML">Machine Learning Engineer</option>
                        <option value="DevOps">DevOps / SRE</option>
                        <option value="Frontend">Frontend Developer</option>
                        <option value="Backend">Backend Developer</option>
                        <option value="FullStack">Full Stack Developer</option>
                        <option value="Data">Data Engineer / Analyst</option>
                        <option value="PM">Product Manager</option>
                        <option value="MobileEngineer">Mobile Engineer</option>
                    </select>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Target className="w-4 h-4" />
                        Round Type
                    </label>
                    <select
                        value={state.roundType}
                        onChange={(e) =>
                            setState({
                                ...state,
                                roundType: e.target.value as InterviewRoundType,
                                formError: undefined,
                            })
                        }
                        className="w-full px-4 py-2.5 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        {state.roundType &&
                            !interviewRoundTypes.includes(state.roundType as (typeof interviewRoundTypes)[number]) && (
                                <option value={state.roundType}>{getRoundTypeLabel(state.roundType)}</option>
                            )}
                        {interviewRoundTypes.map((type) => (
                            <option key={type} value={type}>
                                {getRoundTypeLabel(type)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        Interview Date
                    </label>
                    <input
                        type="date"
                        value={state.interviewDate}
                        onChange={(e) =>
                            setState({
                                ...state,
                                interviewDate: e.target.value,
                                interviewDateError: undefined,
                                formError: undefined,
                            })
                        }
                        min={format(new Date(), "yyyy-MM-dd")}
                        className="w-full px-4 py-2.5 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {state.interviewDateError && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {state.interviewDateError}
                        </p>
                    )}
                </div>

                {state.formError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{state.formError}</p>
                )}

                <button
                    onClick={handleConfirm}
                    disabled={!isFormValid || state.isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                    {state.isSubmitting ? "Creating Sprint..." : "Create Sprint"}
                </button>
            </div>
        </div>
    );
}

// Helper functions
function getDefaultDate(): string {
    return format(addDays(new Date(), 7), "yyyy-MM-dd");
}

function normalizeDateInputValue(dateStr: string): string {
    if (dateStr.trim().length === 0) return "";
    const parsed = tryParseDateInput(dateStr);
    if (!parsed) return "";
    return format(parsed, "yyyy-MM-dd");
}
