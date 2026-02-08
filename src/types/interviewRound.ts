export const interviewRoundTypes = [
    'HR',
    'TechnicalRound1',
    'TechnicalRound2',
    'SystemDesign',
    'Managerial',
    'Assignment',
    'Final',
] as const;

export type KnownInterviewRoundType = (typeof interviewRoundTypes)[number];
export type InterviewRoundType = string;

export function isKnownInterviewRoundType(value: string): value is KnownInterviewRoundType {
    return (interviewRoundTypes as readonly string[]).includes(value);
}

// Backward-compatible alias for existing imports.
export const isInterviewRoundType = isKnownInterviewRoundType;
