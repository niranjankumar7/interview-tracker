"use client";

import { useStore } from "@/lib/store";
import { autoTagCategory } from "@/utils/categoryTagger";
import { QuestionCategory } from "@/types";
import { useTamboComponentState } from "@tambo-ai/react";
import { HelpCircle, Building2, Tag, CheckCircle2, Plus } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

function normalizeCategoryInput(value: unknown): QuestionCategory | undefined {
    if (!value || typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;

    if (
        normalized === "dsa" ||
        normalized.includes("data structure") ||
        normalized.includes("algo") ||
        normalized.includes("linked list") ||
        normalized.includes("list ii") ||
        normalized.includes("list 2") ||
        normalized.includes("duplicates") ||
        normalized.includes("array") ||
        normalized.includes("string") ||
        normalized.includes("leetcode")
    ) {
        return "DSA";
    }

    if (
        normalized === "systemdesign" ||
        normalized === "system design" ||
        normalized === "system-design" ||
        normalized.includes("design") ||
        normalized.includes("architecture")
    ) {
        return "SystemDesign";
    }

    if (
        normalized === "behavioral" ||
        normalized === "behavioural" ||
        normalized.includes("behavior") ||
        normalized.includes("behaviour")
    ) {
        return "Behavioral";
    }

    if (normalized === "sql" || normalized.includes("database") || normalized === "db") {
        return "SQL";
    }

    if (normalized === "other") {
        return "Other";
    }

    return "Other";
}

// Props schema for Tambo registration
export const addQuestionPanelSchema = z.object({
    questionText: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe("The interview question text to add")
    ),
    company: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe("The company this question is associated with")
    ),
    category: z.preprocess(
        (val) => {
            if (Array.isArray(val)) {
                const first = val[0];
                if (typeof first === "string") {
                    return normalizeCategoryInput(first) ?? "Other";
                }
                return "Other";
            }

            if (typeof val === "string") {
                return normalizeCategoryInput(val) ?? "Other";
            }

            return val ?? undefined;
        },
        z.enum(["DSA", "SystemDesign", "Behavioral", "SQL", "Other"])
            .optional()
            .describe("The category of the question")
    ),
    panelId: z.preprocess(
        (val) => val ?? undefined,
        z.string().optional().describe("Unique panel id to avoid state collisions")
    ),
});

interface AddQuestionPanelProps {
    questionText?: string;
    company?: string;
    category?: QuestionCategory;
    panelId?: string;
}

interface AddQuestionState {
    questionText: string;
    selectedCompany: string;
    category: QuestionCategory;
    round: string;
    difficulty: "Easy" | "Medium" | "Hard";
    isSubmitted: boolean;
    isSubmitting: boolean;
}

export function AddQuestionPanel({
    questionText: initialText,
    company: initialCompany,
    category: initialCategory,
    panelId,
}: AddQuestionPanelProps) {
    const applications = useStore((state) => state.applications);
    const questions = useStore((state) => state.questions);
    const createQuestionAPI = useStore((state) => state.createQuestionAPI);

    // Auto-detect category from question text
    const detectedCategory = initialText
        ? autoTagCategory(initialText)
        : initialCategory || "Other";

    const componentId = useMemo(() => {
        if (panelId) return `add-question-panel:${panelId}`;
        const questionSlug = (initialText || "unknown")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
        const companySlug = (initialCompany || "general").toLowerCase().trim();
        return `add-question-panel:${companySlug}:${questionSlug}`;
    }, [initialCompany, initialText, panelId]);

    const [state, setState] = useTamboComponentState<AddQuestionState>(
        componentId,
        {
            questionText: initialText || "",
            selectedCompany: initialCompany || "",
            category: detectedCategory,
            round: "",
            difficulty: "Medium",
            isSubmitted: false,
            isSubmitting: false,
        }
    );

    const alreadySaved = useMemo(() => {
        if (!state) return false;
        const normalizedText = state.questionText.trim().replace(/\s+/g, " ").toLowerCase();
        if (!normalizedText) return false;

        const selectedApp = applications.find(
            (a) => a.company.toLowerCase() === state.selectedCompany.toLowerCase()
        );
        const selectedAppId = selectedApp?.id;

        return questions.some((q) => {
            const sameText =
                q.questionText.trim().replace(/\s+/g, " ").toLowerCase() === normalizedText;
            if (!sameText) return false;

            if (selectedAppId) {
                return q.companyId === selectedAppId;
            }

            return !q.companyId;
        });
    }, [applications, questions, state]);

    // Handle loading state
    if (!state) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-md animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!state.questionText.trim()) {
            return;
        }

        setState({ ...state, isSubmitting: true });

        try {
            const companyApp = applications.find(
                (a) => a.company.toLowerCase() === state.selectedCompany.toLowerCase()
            );

            await createQuestionAPI({
                questionText: state.questionText,
                category: state.category,
                difficulty: state.difficulty,
                askedInRound: state.round || undefined,
                applicationId: companyApp?.id,
            });

            setState({ ...state, isSubmitted: true, isSubmitting: false });
        } catch (error) {
            console.error("Error adding question:", error);
            setState({ ...state, isSubmitting: false });
            // TODO: Show error notification to user
        }
    };

    if (state.isSubmitted || alreadySaved) {
        return (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-lg max-w-md">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-green-800">
                            Question Added!
                        </h3>
                        <p className="text-sm text-green-600">
                            Saved to{" "}
                            {state.selectedCompany
                                ? `${state.selectedCompany}'s`
                                : "general"}{" "}
                            question bank
                        </p>
                    </div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 mt-3">
                    <p className="text-sm text-gray-700 italic">
                        &ldquo;{state.questionText.substring(0, 100)}
                        {state.questionText.length > 100 ? "..." : ""}&rdquo;
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {state.category}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-md">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-purple-100 rounded-full">
                    <HelpCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                        Add Interview Question
                    </h3>
                    <p className="text-sm text-gray-500">
                        Save questions for future reference
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Plus className="w-4 h-4" />
                        Question
                    </label>
                    <textarea
                        value={state.questionText}
                        onChange={(e) => {
                            const newText = e.target.value;
                            const newCategory = newText ? autoTagCategory(newText) : state.category;
                            setState({ ...state, questionText: newText, category: newCategory });
                        }}
                        rows={3}
                        placeholder="e.g., Design a URL shortener system..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    />
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Building2 className="w-4 h-4" />
                        Company
                    </label>
                    <select
                        value={state.selectedCompany}
                        onChange={(e) =>
                            setState({ ...state, selectedCompany: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                    >
                        <option value="">General / Unknown</option>
                        {applications.map((app) => (
                            <option key={app.id} value={app.company}>
                                {app.company}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Tag className="w-4 h-4" />
                            Category
                            <span className="text-xs text-gray-400">(auto)</span>
                        </label>
                        <select
                            value={state.category}
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    category: e.target.value as QuestionCategory,
                                })
                            }
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-sm"
                        >
                            <option value="DSA">DSA</option>
                            <option value="SystemDesign">System Design</option>
                            <option value="Behavioral">Behavioral</option>
                            <option value="SQL">SQL</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Difficulty
                        </label>
                        <select
                            value={state.difficulty}
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    difficulty: e.target.value as "Easy" | "Medium" | "Hard",
                                })
                            }
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-sm"
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Round (optional)
                    </label>
                    <input
                        type="text"
                        value={state.round}
                        onChange={(e) => setState({ ...state, round: e.target.value })}
                        placeholder="e.g., Round 1, Technical, Final"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={!state.questionText.trim() || state.isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                    {state.isSubmitting ? "Saving..." : "Add Question 📝"}
                </button>
            </div>
        </div>
    );
}
