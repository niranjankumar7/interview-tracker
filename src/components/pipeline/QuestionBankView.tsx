"use client";

import { useStore } from "@/lib/store";
import { QuestionCategory } from "@/types";
import { useState } from "react";
import {
    Search,
    Filter,
    Building2,
    Tag,
    BookOpen,
    CircleDot,
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
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<QuestionCategory | "All">("All");
    const [filterCompany, setFilterCompany] = useState<string>("All");

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

    return (
        <div className="h-full bg-background overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
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
                        <p className="text-muted-foreground text-sm">
                            {questions.length === 0
                                ? 'Start adding questions by saying "Add question: ..."'
                                : "Try adjusting your filters"}
                        </p>
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
        </div>
    );
}
