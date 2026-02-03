import type { LucideIcon } from "lucide-react";
import {
    User,
    Code,
    Terminal,
    Network,
    UserCog,
    ClipboardCheck,
    Trophy,
} from "lucide-react";

export interface InterviewRoundTheme {
    label: string;
    icon: LucideIcon;
    badgeClassName: string;
    tabActiveClassName: string;
    tabInactiveClassName: string;
}

export const interviewRoundRegistry = {
    HR: {
        label: "HR",
        icon: User,
        badgeClassName: "bg-emerald-50 text-emerald-700",
        tabActiveClassName: "bg-emerald-600 text-white shadow-md",
        tabInactiveClassName:
            "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200",
    },
    TechnicalRound1: {
        label: "Technical Round 1",
        icon: Code,
        badgeClassName: "bg-indigo-50 text-indigo-700",
        tabActiveClassName: "bg-indigo-600 text-white shadow-md",
        tabInactiveClassName:
            "bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200",
    },
    TechnicalRound2: {
        label: "Technical Round 2",
        icon: Terminal,
        badgeClassName: "bg-blue-50 text-blue-700",
        tabActiveClassName: "bg-blue-600 text-white shadow-md",
        tabInactiveClassName:
            "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200",
    },
    SystemDesign: {
        label: "System Design",
        icon: Network,
        badgeClassName: "bg-purple-50 text-purple-700",
        tabActiveClassName: "bg-purple-600 text-white shadow-md",
        tabInactiveClassName:
            "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200",
    },
    Managerial: {
        label: "Managerial",
        icon: UserCog,
        badgeClassName: "bg-amber-50 text-amber-800",
        tabActiveClassName: "bg-amber-600 text-white shadow-md",
        tabInactiveClassName:
            "bg-white text-amber-800 hover:bg-amber-50 border border-amber-200",
    },
    Assignment: {
        label: "Assignment",
        icon: ClipboardCheck,
        badgeClassName: "bg-slate-50 text-slate-700",
        tabActiveClassName: "bg-slate-700 text-white shadow-md",
        tabInactiveClassName:
            "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200",
    },
    Final: {
        label: "Final",
        icon: Trophy,
        badgeClassName: "bg-red-50 text-red-700",
        tabActiveClassName: "bg-red-600 text-white shadow-md",
        tabInactiveClassName:
            "bg-white text-red-700 hover:bg-red-50 border border-red-200",
    },
} satisfies Record<string, InterviewRoundTheme>;

export type InterviewRoundType = keyof typeof interviewRoundRegistry;

export function getInterviewRoundTheme(roundType: InterviewRoundType): InterviewRoundTheme {
    return interviewRoundRegistry[roundType];
}
