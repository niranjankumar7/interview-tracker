"use client";

import { useStore } from "@/lib/store";
import { QuestionCategory, QUESTION_CATEGORIES, Question } from "@/types";
import { useState } from "react";
import {
    Search,
    Filter,
    Building2,
    Tag,
    BookOpen,
    CircleDot,
    Plus,
    X,
} from "lucide-react";

const categoryColors: Record<QuestionCategory, { bg: string; text: string }> = {
    DSA: { bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-200" },
    SystemDesign: { bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-200" },
    Behavioral: { bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-700 dark:text-green-200" },
    SQL: { bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-200" },
    Other: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-200" },
};

const difficultyColors: Record<string, { bg: string; text: string }> = {
    Easy: { bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-700 dark:text-green-200" },
    Medium: { bg: "bg-yellow-100 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-200" },
    Hard: { bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-700 dark:text-red-200" },
};

export function QuestionBankView() {
    const questions = useStore((state) => state.questions);
    const applications = useStore((state) => state.applications);
    const addQuestion = useStore((state) => state.addQuestion);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<QuestionCategory | "All">("All");
    const [filterCompany, setFilterCompany] = useState<string>("All");

    // Add Question Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        questionText: "",
        category: "Other" as QuestionCategory,
        askedInRound: "",
        companyId: "",
    });
    const [addError, setAddError] = useState<string | null>(null);

    // Get unique companies
    const companies = Array.from(
        new Set(
            questions
                .map((q) => applications.find((a) => a.id === q.companyId)?.company)
                .filter(Boolean)
        )
    );

    // Filter questions
    const filteredQuestions = questions.filter((q) => {
        const matchesSearch = q.questionText
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesCategory =
            filterCategory === "All" || q.category === filterCategory;
        const matchesCompany =
            filterCompany === "All" ||
            applications.find((a) => a.id === q.companyId)?.company === filterCompany;
        return matchesSearch && matchesCategory && matchesCompany;
    });

    // Group by category
    const groupedQuestions = filteredQuestions.reduce((acc, q) => {
        if (!acc[q.category]) {
            acc[q.category] = [];
        }
        acc[q.category].push(q);
        return acc;
    }, {} as Record<QuestionCategory, typeof questions>);

    const handleAddQuestion = () => {
        if (!newQuestion.questionText.trim()) {
            setAddError("Please enter the question text.");
            return;
        }

        const question: Question = {
            id: crypto.randomUUID(),
            companyId: newQuestion.companyId || "",
            questionText: newQuestion.questionText.trim(),
            category: newQuestion.category,
            askedInRound: newQuestion.askedInRound || undefined,
            dateAdded: new Date().toISOString(),
        };

        addQuestion(question);

        // Reset form and close modal
        setNewQuestion({
            questionText: "",
            category: "Other",
            askedInRound: "",
            companyId: "",
        });
        setAddError(null);
        setIsAddModalOpen(false);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setAddError(null);
        setNewQuestion({
            questionText: "",
            category: "Other",
            askedInRound: "",
            companyId: "",
        });
    };

    return (
        <div className="h-full bg-background overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 rounded-xl dark:bg-indigo-950/40">
                            <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-200" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
                            <p className="text-muted-foreground text-sm">
                                {questions.length} questions saved
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Question
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-card rounded-xl border border-border p-4 mb-6 shadow-sm">
                    <div className="flex flex-wrap gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search questions..."
                                    className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <select
                                value={filterCategory}
                                onChange={(e) =>
                                    setFilterCategory(e.target.value as QuestionCategory | "All")
                                }
                                className="px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-background"
                            >
                                <option value="All">All Categories</option>
                                <option value="DSA">DSA</option>
                                <option value="SystemDesign">System Design</option>
                                <option value="Behavioral">Behavioral</option>
                                <option value="SQL">SQL</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Company Filter */}
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <select
                                value={filterCompany}
                                onChange={(e) => setFilterCompany(e.target.value)}
                                className="px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-background"
                            >
                                <option value="All">All Companies</option>
                                {companies.map((company) => (
                                    <option key={company} value={company}>
                                        {company}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Questions List */}
                {filteredQuestions.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-xl border border-border">
                        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">
                            No Questions Found
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            {questions.length === 0
                                ? "Add your first question to start building your question bank!"
                                : "Try adjusting your filters"}
                        </p>
                        {questions.length === 0 && (
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Add Your First Question
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
                            <div key={category}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="w-4 h-4 text-muted-foreground" />
                                    <h2 className="font-semibold text-foreground">{category}</h2>
                                    <span className="text-sm text-muted-foreground">
                                        ({categoryQuestions.length})
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {categoryQuestions.map((question) => {
                                        const company = applications.find(
                                            (a) => a.id === question.companyId
                                        )?.company;
                                        const catColors = categoryColors[question.category];
                                        const diffColors = question.difficulty
                                            ? difficultyColors[question.difficulty]
                                            : null;

                                        return (
                                            <div
                                                key={question.id}
                                                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
                                            >
                                                <p className="text-foreground mb-3">
                                                    {question.questionText}
                                                </p>

                                                <div className="flex items-center flex-wrap gap-2">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${catColors.bg} ${catColors.text}`}
                                                    >
                                                        {question.category}
                                                    </span>

                                                    {diffColors && (
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${diffColors.bg} ${diffColors.text}`}
                                                        >
                                                            {question.difficulty}
                                                        </span>
                                                    )}

                                                    {company && (
                                                        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                                                            <Building2 className="w-3 h-3" />
                                                            {company}
                                                        </span>
                                                    )}

                                                    {question.askedInRound && (
                                                        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-200">
                                                            <CircleDot className="w-3 h-3" />
                                                            {question.askedInRound}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Question Modal */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCloseModal();
                    }}
                >
                    <div className="bg-card rounded-xl shadow-xl w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Add Question</h2>
                                <p className="text-sm text-muted-foreground">Record a question asked in an interview</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-muted rounded-lg"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            {/* Question Text */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Question <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={newQuestion.questionText}
                                    onChange={(e) => {
                                        setAddError(null);
                                        setNewQuestion(prev => ({ ...prev, questionText: e.target.value }));
                                    }}
                                    placeholder="Enter the question that was asked..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-background resize-none"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Category
                                </label>
                                <select
                                    value={newQuestion.category}
                                    onChange={(e) => setNewQuestion(prev => ({ ...prev, category: e.target.value as QuestionCategory }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-background"
                                >
                                    {QUESTION_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Interview Round */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Interview Round
                                </label>
                                <input
                                    type="text"
                                    value={newQuestion.askedInRound}
                                    onChange={(e) => setNewQuestion(prev => ({ ...prev, askedInRound: e.target.value }))}
                                    placeholder="e.g., Round 1, Technical, HR"
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-background"
                                />
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Company (optional)
                                </label>
                                <select
                                    value={newQuestion.companyId}
                                    onChange={(e) => setNewQuestion(prev => ({ ...prev, companyId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-background"
                                >
                                    <option value="">No company</option>
                                    {applications.map(app => (
                                        <option key={app.id} value={app.id}>
                                            {app.company} - {app.role}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Error Message */}
                            {addError && (
                                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-200 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                                    {addError}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddQuestion}
                                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                            >
                                Add Question
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

