"use client";

import { useStore } from "@/lib/store";
import { generateSprint } from "@/lib/sprintGenerator";
import { tryParseDateInput } from "@/lib/date-parsing";
import { RoleType, Application } from "@/types";
import { format, addDays } from "date-fns";
import { useTamboComponentState } from "@tambo-ai/react";
import { Calendar, Briefcase, Building2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

// Props schema for Tambo registration
export const sprintSetupCardSchema = z.object({
    company: z.string().describe("The company name for the interview"),
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
    company: string;
    role?: RoleType;
    interviewDate?: string;
}

interface SprintSetupState {
    company: string;
    role: RoleType;
    interviewDate: string;
    isSubmitted: boolean;
    isSubmitting: boolean;
    errorMessage?: string;
}

export function SprintSetupCard({
    company: initialCompany,
    role: initialRole,
    interviewDate: initialDate,
}: SprintSetupCardProps) {
    const [state, setState] = useTamboComponentState<SprintSetupState>(
        "sprint-setup-card",
        {
            company: initialCompany || "",
            role: (initialRole as RoleType) || "SDE",
            interviewDate: initialDate || getDefaultDate(),
            isSubmitted: false,
            isSubmitting: false,
            errorMessage: undefined,
        }
    );

    const addApplication = useStore((s) => s.addApplication);
    const addSprint = useStore((s) => s.addSprint);

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

    const handleConfirm = async () => {
        if (!state.company || !state.interviewDate) {
            return;
        }

        const parsedDate = tryParseDateInput(state.interviewDate);
        if (!parsedDate) {
            setState({
                ...state,
                errorMessage:
                    "Please provide an interview date like 'tomorrow', 'next Thursday', or a YYYY-MM-DD date.",
            });
            return;
        }

        setState({ ...state, isSubmitting: true, errorMessage: undefined });

        try {
            // Create application
            const application: Application = {
                id: Date.now().toString(),
                company: state.company,
                role: state.role,
                status: "interview",
                applicationDate: new Date().toISOString(),
                interviewDate: parsedDate.toISOString(),
                rounds: [],
                notes: "",
                createdAt: new Date().toISOString(),
            };

            addApplication(application);

            // Generate sprint
            const sprint = generateSprint(application.id, parsedDate, state.role);
            addSprint(sprint);

            setState({ ...state, isSubmitted: true, isSubmitting: false });
        } catch (error) {
            console.error("Error creating sprint:", error);
            setState({ ...state, isSubmitting: false });
        }
    };

    if (state.isSubmitted) {
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
                                errorMessage: undefined,
                            })
                        }
                        placeholder="e.g., Google, Amazon, Microsoft"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
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
                                errorMessage: undefined,
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
                        value={formatDateForInput(state.interviewDate)}
                        onChange={(e) =>
                            setState({
                                ...state,
                                interviewDate: e.target.value,
                                errorMessage: undefined,
                            })
                        }
                        min={format(new Date(), "yyyy-MM-dd")}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {state.errorMessage && (
                        <p className="mt-2 text-sm text-red-600">{state.errorMessage}</p>
                    )}
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!state.company || !state.interviewDate || state.isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                    {state.isSubmitting ? "Creating Sprint..." : "Create Sprint 🚀"}
                </button>
            </div>
        </div>
    );
}

// Helper functions
function getDefaultDate(): string {
    return format(addDays(new Date(), 7), "yyyy-MM-dd");
}

function formatDateForInput(dateStr: string): string {
    if (dateStr.trim().length === 0) return "";
    const parsed = tryParseDateInput(dateStr);
    if (!parsed) return "";
    return format(parsed, "yyyy-MM-dd");
}
