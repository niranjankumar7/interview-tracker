"use client";

import { useStore } from "@/lib/store";
import { ApplicationStatus } from "@/types";
import {
    Building2,
    Calendar,
    Briefcase,
    GripVertical,
    Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

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
        <div className="h-full bg-background p-6 overflow-x-auto">
            <div className="flex gap-4 min-w-max h-full">
                {statusColumns.map((column) => {
                    const columnApps = applications.filter(
                        (app) => app.status === column.status
                    );

                    return (
                        <div
                            key={column.status}
                            className="w-72 flex-shrink-0 flex flex-col bg-muted rounded-xl"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.status)}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                                    <h3 className="font-semibold text-foreground">{column.label}</h3>
                                    <span className="ml-auto bg-background px-2 py-0.5 rounded-full text-sm text-muted-foreground">
                                        {columnApps.length}
                                    </span>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                {columnApps.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        Drop applications here
                                    </div>
                                ) : (
                                    columnApps.map((app) => (
                                        <div
                                            key={app.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, app.id)}
                                            className="bg-card rounded-lg shadow-sm border border-border p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                                        >
                                            {/* Card Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                                                    <div>
                                                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-muted-foreground" />
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
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                <Briefcase className="w-3.5 h-3.5" />
                                                {app.role}
                                            </div>

                                            {/* Interview Date */}
                                            {app.interviewDate && (
                                                <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded dark:bg-purple-950/30 dark:text-purple-200">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    Interview: {format(parseISO(app.interviewDate), "MMM d")}
                                                </div>
                                            )}

                                            {/* Applied Date */}
                                            <div className="mt-3 text-xs text-muted-foreground">
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
