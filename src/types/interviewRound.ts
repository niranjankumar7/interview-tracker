export const interviewRoundTypes = [
    'HR',
    'TechnicalRound1',
    'TechnicalRound2',
    'SystemDesign',
    'Managerial',
    'Assignment',
    'Final',
] as const;

export type InterviewRoundType = (typeof interviewRoundTypes)[number];

export function isInterviewRoundType(value: string): value is InterviewRoundType {
    return (interviewRoundTypes as readonly string[]).includes(value);
}
