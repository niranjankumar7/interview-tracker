import { addDays, parseISO, startOfDay } from "date-fns";

const DAYS_OF_WEEK = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
] as const;

// Cap relative offsets to avoid absurd dates or overflow. Ten years is more than
// enough for interview-planning scenarios.
const MAX_IN_DAYS = 3650;

const WEEKDAY_PATTERN =
    /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/;

function safeAddDays(base: Date, days: number): Date | null {
    if (!Number.isFinite(days) || days < 0 || days > MAX_IN_DAYS) {
        return null;
    }

    const result = addDays(base, days);
    return Number.isNaN(result.getTime()) ? null : result;
}

/**
* Parses a user-provided date input into a concrete Date.
*
* All returned values are normalized to the start of day.
*
* Supports:
* - ISO strings: `YYYY-MM-DD` or full ISO timestamps
* - Relative strings: `today`, `tomorrow`, `yesterday`
* - Weekdays (matched as standalone words): `friday`, `next friday`, `next thursday`
* - `in N days` (bounded to a reasonable max)
*
* Notes:
* - Only the first recognized weekday token is used.
*/
export function tryParseDateInput(
    dateString: string,
    baseDate: Date = new Date()
): Date | null {
    const raw = dateString.trim();
    const base = startOfDay(baseDate);

    if (raw.length === 0) {
        return null;
    }

    const isoLike = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;
    if (isoLike.test(raw)) {
        const parsedISO = parseISO(raw);
        if (!Number.isNaN(parsedISO.getTime())) {
            return startOfDay(parsedISO);
        }
    }

    const lowered = raw.toLowerCase();

    if (lowered === "today") return base;
    if (lowered === "tomorrow") return addDays(base, 1);
    if (lowered === "yesterday") return addDays(base, -1);

    const inDaysMatch = lowered.match(/\bin\s+(\d+)\s+days?\b/);
    if (inDaysMatch) {
        const days = Number(inDaysMatch[1]);
        return safeAddDays(base, days) ?? null;
    }

    const weekdayMatch = lowered.match(WEEKDAY_PATTERN);
    if (weekdayMatch) {
        const hasNext = Boolean(weekdayMatch[1]);
        const weekday = weekdayMatch[2] as (typeof DAYS_OF_WEEK)[number];
        const i = DAYS_OF_WEEK.indexOf(weekday);

        const currentDay = base.getDay();
        let daysUntil = i - currentDay;
        if (daysUntil < 0 || (daysUntil === 0 && hasNext)) daysUntil += 7;
        return safeAddDays(base, daysUntil) ?? null;
    }

    const fallbackISO = parseISO(raw);
    if (!Number.isNaN(fallbackISO.getTime())) {
        return startOfDay(fallbackISO);
    }

    return null;
}

/**
* Parse a date input or, if parsing fails, return baseDate + 7 days.
*
* Intended for flows where a reasonable default is better than a hard error.
*/
export function parseDateInput(dateString: string, baseDate: Date = new Date()): Date {
    return tryParseDateInput(dateString, baseDate) ?? addDays(startOfDay(baseDate), 7);
}
