"use client";

import { useStore } from "@/lib/store";
import type { Application, ApplicationStatus } from "@/types";
import {
    Building2,
    Calendar,
    Briefcase,
    GripVertical,
    Search,
    Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMemo, useState, type DragEvent } from "react";
import { useDebounce } from "use-debounce";

const statusColumns: { status: ApplicationStatus; label: string; color: string }[] = [
    { status: "applied", label: "Applied", color: "bg-gray-500" },
    { status: "shortlisted", label: "Shortlisted", color: "bg-blue-500" },
    { status: "interview", label: "Interview", color: "bg-purple-500" },
    { status: "offer", label: "Offer", color: "bg-green-500" },
    { status: "rejected", label: "Rejected", color: "bg-red-500" },
];

const SEARCH_DEBOUNCE_MS = 250;
const DRAG_DATA_KEY = "applicationId";

const getSearchRank = (
    companyLower: string,
    roleLower: string,
    normalizedQuery: string
): number | null => {
    if (companyLower.startsWith(normalizedQuery)) return 0;
    if (companyLower.includes(normalizedQuery)) return 1;
    if (roleLower.startsWith(normalizedQuery)) return 2;
    if (roleLower.includes(normalizedQuery)) return 3;
    return null;
};

export function KanbanBoard() {
    const applications = useStore((state) => state.applications);
    const updateApplication = useStore((state) => state.updateApplication);
    const deleteApplication = useStore((state) => state.deleteApplication);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery] = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

    const indexedApplications = useMemo(
        () =>
            applications.map((app) => ({
                app,
                companyLower: app.company.toLowerCase(),
                roleLower: app.role.toLowerCase(),
            })),
        [applications]
    );

    const { applicationsByStatus, filteredCount } = useMemo(() => {
        const normalizedQuery = debouncedSearchQuery.trim().toLowerCase();

        const byStatus: Record<ApplicationStatus, Application[]> = {
            applied: [],
            shortlisted: [],
            interview: [],
            offer: [],
            rejected: [],
        };

        if (normalizedQuery === "") {
            for (const entry of indexedApplications) {
                byStatus[entry.app.status].push(entry.app);
            }

            return {
                applicationsByStatus: byStatus,
                filteredCount: indexedApplications.length,
            };
        }

        const matches: { app: Application; rank: number }[] = [];
        for (const entry of indexedApplications) {
            const rank = getSearchRank(entry.companyLower, entry.roleLower, normalizedQuery);
            if (rank === null) continue;
            matches.push({ app: entry.app, rank });
        }

        // Keep higher-relevance matches first; within the same rank, sort by company for stable UX.
        matches.sort((a, b) => {
            const rankDelta = a.rank - b.rank;
            if (rankDelta !== 0) return rankDelta;
            return a.app.company.localeCompare(b.app.company);
        });

        for (const match of matches) {
            byStatus[match.app.status].push(match.app);
        }

        return {
            applicationsByStatus: byStatus,
            filteredCount: matches.length,
        };
    }, [indexedApplications, debouncedSearchQuery]);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, appId: string) => {
        e.dataTransfer.setData(DRAG_DATA_KEY, appId);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, newStatus: ApplicationStatus) => {
        e.preventDefault();
        const appId = e.dataTransfer.getData(DRAG_DATA_KEY);
        if (appId) {
            updateApplication(appId, { status: newStatus });
        }
    };

    return (
        <div className="h-full bg-gray-50 p-6 overflow-x-auto">
            <div className="flex items-center gap-4 mb-4 min-w-max">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-800">Search</h2>
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Company or role…"
                            aria-label="Search applications by company or role"
                            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                {applications.length > 0 && debouncedSearchQuery.trim() !== "" && (
                    <div className="text-sm text-gray-500">
                        Showing {filteredCount} of {applications.length}
                    </div>
                )}
            </div>

            <div className="flex gap-4 min-w-max h-full">
                {statusColumns.map((column) => {
                    const columnApps = applicationsByStatus[column.status];

                    return (
                        <div
                            key={column.status}
                            className="w-72 flex-shrink-0 flex flex-col bg-gray-100 rounded-xl"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.status)}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                                    <h3 className="font-semibold text-gray-700">{column.label}</h3>
                                    <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-sm text-gray-500">
                                        {columnApps.length}
                                    </span>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                {columnApps.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Drop applications here
                                    </div>
                                ) : (
                                    columnApps.map((app) => (
                                        <div
                                            key={app.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, app.id)}
                                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                                        >
                                            {/* Card Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-gray-500" />
                                                            {app.company}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteApplication(app.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1"
                                                    title="Delete application"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Role */}
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                <Briefcase className="w-3.5 h-3.5" />
                                                {app.role}
                                            </div>

                                            {/* Interview Date */}
                                            {app.interviewDate && (
                                                <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    Interview: {format(parseISO(app.interviewDate), "MMM d")}
                                                </div>
                                            )}

                                            {/* Applied Date */}
                                            <div className="mt-3 text-xs text-gray-400">
                                                Applied {format(parseISO(app.applicationDate), "MMM d, yyyy")}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
