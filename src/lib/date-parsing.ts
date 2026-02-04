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
export function parseDateInput(dateString: string, baseDate: Date = new Date()): Date {
    const raw = dateString.trim();
    const base = startOfDay(baseDate);

    if (raw.length === 0) {
        return base;
    }

    const parsedISO = parseISO(raw);
    if (!Number.isNaN(parsedISO.getTime())) {
        return startOfDay(parsedISO);
    }

    const lowered = raw.toLowerCase();

    if (lowered === "today") return base;
    if (lowered === "tomorrow") return addDays(base, 1);
    if (lowered === "yesterday") return addDays(base, -1);

    const inDaysMatch = lowered.match(/\bin\s+(\d+)\s+days?\b/);
    if (inDaysMatch) {
        return addDays(base, Number(inDaysMatch[1]));
    }

    for (let i = 0; i < DAYS_OF_WEEK.length; i++) {
        if (!lowered.includes(DAYS_OF_WEEK[i])) continue;

        const currentDay = base.getDay();
        let daysUntil = i - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        return addDays(base, daysUntil);
    }

    // Default to 7 days from now.
    return addDays(base, 7);
}
