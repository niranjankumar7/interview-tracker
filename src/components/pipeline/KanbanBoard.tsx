"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { ApplicationStatus } from "@/types";
import { PrepDetailPanel } from "@/components/prep";
import {
    Building2,
    Calendar,
    Briefcase,
    GripVertical,
    Trash2,
    ExternalLink,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

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

    // State for PrepDetailPanel
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [isPrepPanelOpen, setIsPrepPanelOpen] = useState(false);

    // Track mouse position to distinguish click from drag
    const mouseDownPosition = useRef<{ x: number; y: number } | null>(null);
    const DRAG_THRESHOLD = 5; // pixels

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

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownPosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleCardClick = (appId: string, e: React.MouseEvent) => {
        // Don't open panel if clicking on interactive elements
        if ((e.target as HTMLElement).closest('button, a, input')) return;

        // Check if this was a drag gesture (mouse moved significantly)
        if (mouseDownPosition.current) {
            const dx = Math.abs(e.clientX - mouseDownPosition.current.x);
            const dy = Math.abs(e.clientY - mouseDownPosition.current.y);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                // This was a drag, not a click
                mouseDownPosition.current = null;
                return;
            }
        }
        mouseDownPosition.current = null;

        setSelectedAppId(appId);
        setIsPrepPanelOpen(true);
    };

    const handleClosePrepPanel = () => {
        setIsPrepPanelOpen(false);
        setSelectedAppId(null);
    };

    // Calculate days until interview
    const getDaysUntilInterview = (interviewDate: string | undefined) => {
        if (!interviewDate) return null;
        const days = differenceInDays(parseISO(interviewDate), new Date());
        return days;
    };

    return (
        <>
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
                                        columnApps.map((app) => {
                                            const daysUntil = getDaysUntilInterview(app.interviewDate);
                                            const isUrgent = daysUntil !== null && daysUntil <= 3 && daysUntil >= 0;

                                            return (
                                                <div
                                                    key={app.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                                    onMouseDown={handleMouseDown}
                                                    onClick={(e) => handleCardClick(app.id, e)}
                                                    className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-lg transition-all group relative ${isUrgent
                                                        ? "border-orange-300 ring-2 ring-orange-100"
                                                        : "border-gray-200 hover:border-indigo-300"
                                                        }`}
                                                >
                                                    {/* Click hint */}
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink className="w-4 h-4 text-indigo-400" />
                                                    </div>

                                                    {/* Card Header */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing" />
                                                            <div>
                                                                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                                                    <Building2 className="w-4 h-4 text-gray-500" />
                                                                    {app.company}
                                                                </h4>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteApplication(app.id);
                                                            }}
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

                                                    {/* Interview Date with countdown */}
                                                    {app.interviewDate && (
                                                        <div className={`flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded ${isUrgent
                                                            ? "bg-orange-50 text-orange-700"
                                                            : "bg-purple-50 text-purple-600"
                                                            }`}>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {format(parseISO(app.interviewDate), "MMM d")}
                                                            </div>
                                                            {daysUntil !== null && daysUntil >= 0 && (
                                                                <span className="font-medium">
                                                                    {daysUntil === 0 ? "Today!" : `${daysUntil}d left`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Current Round Badge */}
                                                    {app.currentRound && (
                                                        <div className="mt-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded inline-block">
                                                            {app.currentRound.replace(/([A-Z])/g, ' $1').trim()}
                                                        </div>
                                                    )}

                                                    {/* Click to view prep hint */}
                                                    <div className="mt-3 text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">
                                                        Click to view prep →
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Prep Detail Panel Modal */}
            {isPrepPanelOpen && selectedAppId && (
                <PrepDetailPanel
                    appId={selectedAppId}
                    isOpen={isPrepPanelOpen}
                    onClose={handleClosePrepPanel}
                />
            )}
        </>
    );
}
