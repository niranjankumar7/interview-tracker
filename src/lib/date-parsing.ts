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

/**
* Parses a user-provided date input into a concrete Date.
*
* Supports:
* - ISO strings: `YYYY-MM-DD` or full ISO timestamps
* - Relative strings: `today`, `tomorrow`, `yesterday`
* - Weekdays: `friday`, `next friday`, `next thursday`
* - `in N days`
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
        return addDays(base, Number(inDaysMatch[1]));
    }

    const hasNext = lowered.includes("next ");

    for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
        if (!lowered.includes(DAYS_OF_WEEK[i])) continue;

        const currentDay = base.getDay();
        let daysUntil = i - currentDay;
        if (daysUntil < 0 || (daysUntil === 0 && hasNext)) daysUntil += 7;
        return addDays(base, daysUntil);
    }

    return null;
}

export function parseDateInput(dateString: string, baseDate: Date = new Date()): Date {
    // If the input cannot be parsed, we intentionally fall back to 7 days from baseDate.
    // This behavior is useful for flows like sprint setup, where a reasonable default is
    // better than a hard error.
    return tryParseDateInput(dateString, baseDate) ?? addDays(startOfDay(baseDate), 7);
}
