"use client";

import { useStore } from "@/lib/store";
import { ApplicationStatus } from "@/types";
import {
    Building2,
    Calendar,
    Briefcase,
    GripVertical,
    PanelRight,
    Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { PrepDetailPanel } from "./PrepDetailPanel";

const statusColumns: { status: ApplicationStatus; label: string; color: string }[] = [
    { status: "applied", label: "Applied", color: "bg-gray-500" },
    { status: "shortlisted", label: "Shortlisted", color: "bg-blue-500" },
    { status: "interview", label: "Interview", color: "bg-purple-500" },
    { status: "offer", label: "Offer", color: "bg-green-500" },
    { status: "rejected", label: "Rejected", color: "bg-red-500" },
];

export function KanbanBoard() {
    const applications = useStore((state) => state.applications);
    const updateApplication = useStore((state) => state.updateApplication);
    const deleteApplication = useStore((state) => state.deleteApplication);

    const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, appId: string) => {
        e.dataTransfer.setData("applicationId", appId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, newStatus: ApplicationStatus) => {
        e.preventDefault();
        const appId = e.dataTransfer.getData("applicationId");
        if (appId) {
            updateApplication(appId, { status: newStatus });
        }
    };

    return (
        <div className="h-full bg-gray-50 p-6 overflow-x-auto">
            <div className="flex gap-4 min-w-max h-full">
                {statusColumns.map((column) => {
                    const columnApps = applications.filter(
                        (app) => app.status === column.status
                    );

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

                                            <button
                                                type="button"
                                                onClick={() => setSelectedApplicationId(app.id)}
                                                className="mt-3 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
                                            >
                                                <PanelRight className="w-4 h-4" />
                                                Prep details
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <PrepDetailPanel
                applicationId={selectedApplicationId}
                isOpen={selectedApplicationId !== null}
                onClose={() => setSelectedApplicationId(null)}
            />
        </div>
    );
}
