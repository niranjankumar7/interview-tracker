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

const ORDINAL_DAY_PATTERN = /\b(\d{1,2})(st|nd|rd|th)\b/gi;
const DATE_TIME_SPACE_SEPARATOR_PATTERN =
    /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/;
const MONTH_TOKEN_TO_INDEX: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
};
const TZ_ABBREVIATION_TO_OFFSET: Record<string, string> = {
    UTC: "Z",
    GMT: "Z",
    IST: "+05:30",
    PST: "-08:00",
    PDT: "-07:00",
    MST: "-07:00",
    MDT: "-06:00",
    CST: "-06:00",
    CDT: "-05:00",
    EST: "-05:00",
    EDT: "-04:00",
};

function safeAddDays(base: Date, days: number): Date | null {
    if (!Number.isFinite(days) || days < 0 || days > MAX_IN_DAYS) {
        return null;
    }

    const result = addDays(base, days);
    return Number.isNaN(result.getTime()) ? null : result;
}

function normalizeOrdinalDayTokens(value: string): string {
    return value.replace(ORDINAL_DAY_PATTERN, "$1");
}

function parseFlexibleYear(raw: string | undefined, baseYear: number): number | null {
    if (!raw) return baseYear;

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed)) return null;

    if (raw.length === 2) {
        return parsed >= 70 ? 1900 + parsed : 2000 + parsed;
    }

    if (raw.length === 4) {
        return parsed;
    }

    return null;
}

function toLocalStartOfDayDate(year: number, monthIndex: number, day: number): Date | null {
    const candidate = new Date(year, monthIndex, day);
    if (
        Number.isNaN(candidate.getTime()) ||
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== monthIndex ||
        candidate.getDate() !== day
    ) {
        return null;
    }

    return startOfDay(candidate);
}

function parseDayMonthExpression(raw: string, baseDate: Date): Date | null {
    const normalized = normalizeOrdinalDayTokens(raw)
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    if (!normalized) return null;

    const dayMonthMatch = normalized.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{2,4}))?$/i);
    const monthDayMatch = normalized.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{2,4}))?$/i);

    let dayRaw: string | undefined;
    let monthRaw: string | undefined;
    let yearRaw: string | undefined;

    if (dayMonthMatch) {
        dayRaw = dayMonthMatch[1];
        monthRaw = dayMonthMatch[2];
        yearRaw = dayMonthMatch[3];
    } else if (monthDayMatch) {
        monthRaw = monthDayMatch[1];
        dayRaw = monthDayMatch[2];
        yearRaw = monthDayMatch[3];
    } else {
        return null;
    }

    const monthIndex = MONTH_TOKEN_TO_INDEX[monthRaw.toLowerCase()];
    if (monthIndex === undefined) return null;

    const day = Number.parseInt(dayRaw, 10);
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;

    const year = parseFlexibleYear(yearRaw, baseDate.getFullYear());
    if (year === null) return null;

    const parsed = toLocalStartOfDayDate(year, monthIndex, day);
    if (!parsed) return null;

    // If the user omits year and the parsed date is far in the past, prefer the next year.
    if (!yearRaw) {
        const deltaMs = parsed.getTime() - baseDate.getTime();
        const halfYearMs = 183 * 24 * 60 * 60 * 1000;
        if (deltaMs < -halfYearMs) {
            const nextYearParsed = toLocalStartOfDayDate(year + 1, monthIndex, day);
            if (nextYearParsed) return nextYearParsed;
        }
    }

    return parsed;
}

function normalizeTimezoneAbbreviation(raw: string): string {
    const trimmed = raw.trim();
    const match = trimmed.match(/^(.*?)(?:\s+)([a-z]{2,4})$/i);
    if (!match) return trimmed;

    const prefix = match[1]?.trim() ?? "";
    const tzToken = match[2]?.toUpperCase() ?? "";
    const offset = TZ_ABBREVIATION_TO_OFFSET[tzToken];
    if (!offset) return trimmed;

    if (offset === "Z") {
        return `${prefix}Z`;
    }

    if (prefix.includes("T")) {
        return `${prefix}${offset}`;
    }

    return `${prefix} ${offset}`;
}

function normalizeDateTimeSeparator(raw: string): string {
    return raw.replace(DATE_TIME_SPACE_SEPARATOR_PATTERN, "$1T$2");
}

function shouldUseNativeDateFallback(raw: string): boolean {
    return (
        /\d{4}/.test(raw) ||
        /\d{1,2}:\d{2}/.test(raw) ||
        /\b(?:utc|gmt|ist|pst|pdt|mst|mdt|cst|cdt|est|edt)\b/i.test(raw) ||
        /[+-]\d{2}:?\d{2}\b/.test(raw)
    );
}

function parseWithTimezoneAndNativeFallback(raw: string): Date | null {
    const normalizedOrdinal = normalizeOrdinalDayTokens(raw);
    const normalizedSpacing = normalizeDateTimeSeparator(normalizedOrdinal);
    const withTimezoneOffset = normalizeTimezoneAbbreviation(normalizedSpacing);

    const parsedISO = parseISO(withTimezoneOffset);
    if (!Number.isNaN(parsedISO.getTime())) {
        return startOfDay(parsedISO);
    }

    if (!shouldUseNativeDateFallback(withTimezoneOffset)) {
        return null;
    }

    const parsedNative = new Date(withTimezoneOffset);
    if (Number.isNaN(parsedNative.getTime())) {
        return null;
    }

    return startOfDay(parsedNative);
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
        const normalized = normalizeTimezoneAbbreviation(normalizeDateTimeSeparator(raw));
        const parsedISO = parseISO(normalized);
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

    const monthDayParsed = parseDayMonthExpression(raw, base);
    if (monthDayParsed) {
        return monthDayParsed;
    }

    const fallbackTimezoneParsed = parseWithTimezoneAndNativeFallback(raw);
    if (fallbackTimezoneParsed) {
        return fallbackTimezoneParsed;
    }

    const fallbackISO = parseISO(normalizeTimezoneAbbreviation(normalizeDateTimeSeparator(raw)));
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
