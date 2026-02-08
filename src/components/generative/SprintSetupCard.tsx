"use client";

import { useStore } from "@/lib/store";
import { generateSprint } from "@/lib/sprintGenerator";
import { tryParseDateInput } from "@/lib/date-parsing";
import { RoleType, Application } from "@/types";
import { format, addDays } from "date-fns";
import { useTamboComponentState } from "@tambo-ai/react";
import { Calendar, Briefcase, Building2, CheckCircle2 } from "lucide-react";
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
    panelId: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe("Unique panel id to avoid state collisions")
    ),
});

interface SprintSetupCardProps {
    company?: string;
    role?: RoleType;
    interviewDate?: string;
    panelId?: string;
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
    panelId,
}: SprintSetupCardProps) {
    const hydratedCompany = initialCompany || "";
    const hydratedRole: RoleType = initialRole ?? "SDE";
    const hydratedInterviewDate = normalizeDateInputValue(
        initialDate || getDefaultDate()
    );

    const componentId = useMemo(() => {
        if (panelId) return `sprint-setup-card:${panelId}`;
        const companySlug = (hydratedCompany || "unknown").toLowerCase().trim();
        const roleSlug = hydratedRole.toLowerCase();
        const dateSlug = hydratedInterviewDate || "unknown-date";
        return `sprint-setup-card:${companySlug}:${roleSlug}:${dateSlug}`;
    }, [hydratedCompany, hydratedInterviewDate, hydratedRole, panelId]);

    const [state, setState] = useTamboComponentState<SprintSetupState>(
        componentId,
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

    const createApplicationAPI = useStore((s) => s.createApplicationAPI);
    const createSprintAPI = useStore((s) => s.createSprintAPI);
    const applications = useStore((s) => s.applications);
    const sprints = useStore((s) => s.sprints);

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
    const existingSprintForCurrentInput = useMemo(() => {
        const company = validation.company.toLowerCase();
        if (!company || !validation.parsedDate) return false;
        const targetDate = format(validation.parsedDate, "yyyy-MM-dd");

        const matchedApplications = applications.filter((app) => {
            const appDate = normalizeDateInputValue(app.interviewDate ?? "");
            const sameCompany = app.company.toLowerCase().trim() === company;
            const sameRole = (app.roleType ?? "SDE") === state.role;
            const sameDate = appDate === targetDate;
            return sameCompany && sameRole && sameDate;
        });

        if (matchedApplications.length === 0) return false;

        return matchedApplications.some((app) =>
            sprints.some((sprint) => sprint.applicationId === app.id)
        );
    }, [applications, sprints, state.role, validation.company, validation.parsedDate]);

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
            // Create application in database
            const createdApp = await createApplicationAPI({
                company: validation.company,
                role: state.role,
                status: "interview",
                applicationDate: new Date().toISOString(),
                interviewDate: validation.parsedDate.toISOString(),
                notes: "",
                roleType: state.role,
            });

            // Generate sprint
            const sprint = generateSprint(createdApp.id, validation.parsedDate, state.role);

            // Create sprint in database
            await createSprintAPI({
                applicationId: createdApp.id,
                interviewDate: validation.parsedDate.toISOString(),
                roleType: state.role,
                totalDays: sprint.totalDays,
                dailyPlans: sprint.dailyPlans,
            });

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

    if (state.isSubmitted || existingSprintForCurrentInput) {
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
