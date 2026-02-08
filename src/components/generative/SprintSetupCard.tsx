"use client";

import { useStore } from "@/lib/store";
import { generateSprint } from "@/lib/sprintGenerator";
import { tryParseDateInput } from "@/lib/date-parsing";
import { isGenericRole, rolesEquivalent, sanitizeCompanyName } from "@/lib/application-intake";
import { RoleType, Application, InterviewRound } from "@/types";
import { format, addDays } from "date-fns";
import { useTamboComponentState } from "@tambo-ai/react";
import { Calendar, Briefcase, Building2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { z } from "zod";

// Props schema for Tambo registration
export const sprintSetupCardSchema = z.object({
    company: z.string().optional().describe("The company name for the interview"),
    role: z
        .enum(["SDE", "SDET", "ML", "DevOps", "Frontend", "Backend", "FullStack", "Data", "PM", "MobileEngineer"])
        .optional()
        .describe("The role type being interviewed for (SDE=Software Dev, SDET=Test Engineer, ML=Machine Learning, DevOps, Frontend, Backend, FullStack, Data=Data Engineer/Analyst, PM=Product Manager, MobileEngineer)"),
    interviewDate: z
        .string()
        .optional()
        .describe("The interview date in YYYY-MM-DD format or a relative description like 'next Thursday'"),
});

interface SprintSetupCardProps {
    company?: string;
    role?: RoleType;
    interviewDate?: string;
}

interface SprintSetupState {
    company: string;
    role: RoleType;
    interviewDate: string;
    isSubmitted: boolean;
    isSubmitting: boolean;
    companyError?: string;
    interviewDateError?: string;
    formError?: string;
    hydrated?: {
        company: string;
        role: RoleType;
        interviewDate: string;
    };
}

type HydratedSprintSetupState = {
    company: string;
    role: RoleType;
    interviewDate: string;
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

const ROUND_SEQUENCE: InterviewRound["roundType"][] = [
    "TechnicalRound1",
    "TechnicalRound2",
    "SystemDesign",
    "Managerial",
    "Final",
];

function roleLabelForType(roleType: RoleType): string {
    return ROLE_LABELS[roleType];
}

function getRoundTypeForRoundNumber(
    roundNumber: number
): InterviewRound["roundType"] {
    if (roundNumber <= 1) return ROUND_SEQUENCE[0];
    if (roundNumber > ROUND_SEQUENCE.length) return ROUND_SEQUENCE[ROUND_SEQUENCE.length - 1];
    return ROUND_SEQUENCE[roundNumber - 1];
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
    // Sync rules:
    // - Never overwrite state once a submission has started.
    // - Seed `hydrated` from props on first render.
    // - When props change, only overwrite the form if the user hasn't edited
    //   since the last hydration.

    useEffect(() => {
        const nextHydrated = {
            company: hydrated.company,
            role: hydrated.role,
            interviewDate: hydrated.interviewDate,
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
            prevHydrated.interviewDate !== nextHydrated.interviewDate;
        if (!hydratedChanged) return;

        const stateMatchesPrevHydrated =
            state.company === prevHydrated.company &&
            state.role === prevHydrated.role &&
            state.interviewDate === prevHydrated.interviewDate;

        if (stateMatchesPrevHydrated) {
            setState({
                ...state,
                company: nextHydrated.company,
                role: nextHydrated.role,
                interviewDate: nextHydrated.interviewDate,
                companyError: undefined,
                interviewDateError: undefined,
                formError: undefined,
                hydrated: nextHydrated,
            });
            return;
        }

        setState({ ...state, hydrated: nextHydrated });
    }, [hydrated.company, hydrated.role, hydrated.interviewDate, setState, state]);
}

export function SprintSetupCard({
    company: initialCompany,
    role: initialRole,
    interviewDate: initialDate,
}: SprintSetupCardProps) {
    const hydratedCompany = initialCompany || "";
    const hydratedRole: RoleType = initialRole ?? "SDE";
    const hydratedInterviewDate = normalizeDateInputValue(
        initialDate || getDefaultDate()
    );

    const componentStateKey = useMemo(() => {
        const normalizedCompany = sanitizeCompanyName(hydratedCompany).toLowerCase() || "unknown";
        const dateKey = hydratedInterviewDate || "unscheduled";
        return `sprint-setup-card:${normalizedCompany}:${hydratedRole}:${dateKey}`;
    }, [hydratedCompany, hydratedInterviewDate, hydratedRole]);

    const [state, setState] = useTamboComponentState<SprintSetupState>(
        componentStateKey,
        {
            company: hydratedCompany,
            role: hydratedRole,
            interviewDate: hydratedInterviewDate,
            isSubmitted: false,
            isSubmitting: false,
            companyError: undefined,
            interviewDateError: undefined,
            formError: undefined,
            hydrated: {
                company: hydratedCompany,
                role: hydratedRole,
                interviewDate: hydratedInterviewDate,
            },
        }
    );

    const applications = useStore((s) => s.applications);
    const sprints = useStore((s) => s.sprints);
    const createApplicationAPI = useStore((s) => s.createApplicationAPI);
    const updateApplicationAPI = useStore((s) => s.updateApplicationAPI);
    const createInterviewRoundAPI = useStore((s) => s.createInterviewRoundAPI);
    const createSprintAPI = useStore((s) => s.createSprintAPI);

    useSyncHydratedSprintSetupState(
        {
            company: hydratedCompany,
            role: hydratedRole,
            interviewDate: hydratedInterviewDate,
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
                const nextRoundType = getRoundTypeForRoundNumber(nextRoundNumber);

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
        return null;
    }
    const hasValues =
        validation.company.length > 0 && validation.interviewDate.length > 0;
    const hasFieldErrors = Boolean(
        state.companyError || state.interviewDateError || state.formError
    );
    const isFormValid = hasValues && !hasFieldErrors;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-md">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                        Setup Interview Sprint
                    </h3>
                    <p className="text-sm text-gray-500">
                        Confirm your interview details
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {state.companyError && (
                        <p className="mt-2 text-sm text-red-600">
                            {state.companyError}
                        </p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {state.interviewDateError && (
                        <p className="mt-2 text-sm text-red-600">
                            {state.interviewDateError}
                        </p>
                    )}
                </div>

                {state.formError && (
                    <p className="text-sm text-red-600">{state.formError}</p>
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
