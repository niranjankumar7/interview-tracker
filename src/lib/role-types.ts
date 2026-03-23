export const KNOWN_ROLE_TYPE_ORDER = [
    "SDE",
    "SDET",
    "ML",
    "DevOps",
    "Frontend",
    "Backend",
    "FullStack",
    "Data",
    "PM",
    "MobileEngineer",
] as const;

export type KnownRoleType = (typeof KNOWN_ROLE_TYPE_ORDER)[number];

export const KNOWN_ROLE_TYPE_LABELS: Record<KnownRoleType, string> = {
    SDE: "Software Development Engineer",
    SDET: "Software Dev Engineer in Test",
    ML: "Machine Learning Engineer",
    DevOps: "DevOps / SRE",
    Frontend: "Frontend Developer",
    Backend: "Backend Developer",
    FullStack: "Full Stack Developer",
    Data: "Data Engineer / Analyst",
    PM: "Product Manager",
    MobileEngineer: "Mobile Engineer",
};

function normalizeRoleTypeToken(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeRoleTypeInput(value: string | null | undefined): string {
    return value?.trim() ?? "";
}

export function getKnownRoleType(value: string | null | undefined): KnownRoleType | undefined {
    const trimmed = normalizeRoleTypeInput(value);
    if (!trimmed) return undefined;

    const exactMatch = KNOWN_ROLE_TYPE_ORDER.find((roleType) => roleType === trimmed);
    if (exactMatch) return exactMatch;

    const normalized = normalizeRoleTypeToken(trimmed);
    return KNOWN_ROLE_TYPE_ORDER.find(
        (roleType) => normalizeRoleTypeToken(roleType) === normalized
    );
}

export function inferRoleTypeFromText(value: string | null | undefined): KnownRoleType {
    const normalized = normalizeRoleTypeInput(value).toLowerCase();

    if (
        normalized.includes("sdet") ||
        normalized.includes("qa") ||
        normalized.includes("test engineer") ||
        normalized.includes("quality engineer")
    ) {
        return "SDET";
    }

    if (
        normalized.includes("machine learning") ||
        normalized.includes("data scientist") ||
        normalized.includes("ml") ||
        normalized.includes(" ai ") ||
        normalized.startsWith("ai ") ||
        normalized.endsWith(" ai") ||
        normalized.includes("artificial intelligence")
    ) {
        return "ML";
    }

    if (
        normalized.includes("devops") ||
        normalized.includes("sre") ||
        normalized.includes("site reliability") ||
        normalized.includes("platform engineer") ||
        normalized.includes("infrastructure") ||
        normalized.includes("cloud engineer")
    ) {
        return "DevOps";
    }

    if (
        normalized.includes("frontend") ||
        normalized.includes("front-end") ||
        normalized.includes(" ui ") ||
        normalized.startsWith("ui ") ||
        normalized.endsWith(" ui") ||
        normalized.includes("web engineer") ||
        normalized.includes("web developer")
    ) {
        return "Frontend";
    }

    if (
        normalized.includes("backend") ||
        normalized.includes("back-end") ||
        normalized.includes("server") ||
        normalized.includes("api engineer")
    ) {
        return "Backend";
    }

    if (
        normalized.includes("fullstack") ||
        normalized.includes("full-stack") ||
        normalized.includes("full stack")
    ) {
        return "FullStack";
    }

    if (
        normalized.includes("data engineer") ||
        normalized.includes("data analyst") ||
        normalized.includes("analytics") ||
        normalized.includes("business intelligence") ||
        normalized.includes("bi engineer")
    ) {
        return "Data";
    }

    if (
        normalized.includes("product manager") ||
        normalized === "pm" ||
        normalized.startsWith("pm ") ||
        normalized.endsWith(" pm")
    ) {
        return "PM";
    }

    if (
        normalized.includes("mobile") ||
        normalized.includes("ios") ||
        normalized.includes("android") ||
        normalized.includes("react native") ||
        normalized.includes("flutter")
    ) {
        return "MobileEngineer";
    }

    return "SDE";
}

export function resolveRoleTypeForTemplate(
    roleType: string | null | undefined,
    fallbackText?: string | null | undefined
): KnownRoleType {
    return (
        getKnownRoleType(roleType) ??
        getKnownRoleType(fallbackText) ??
        inferRoleTypeFromText([roleType, fallbackText].filter(Boolean).join(" "))
    );
}

export function getRoleTypeLabel(roleType: string | null | undefined): string {
    const knownRoleType = getKnownRoleType(roleType);
    if (knownRoleType) {
        return KNOWN_ROLE_TYPE_LABELS[knownRoleType];
    }

    const trimmed = normalizeRoleTypeInput(roleType);
    return trimmed || KNOWN_ROLE_TYPE_LABELS.SDE;
}

export function areRoleTypesEquivalent(
    roleTypeA: string | null | undefined,
    roleTypeB: string | null | undefined
): boolean {
    const normalizedA = normalizeRoleTypeInput(roleTypeA);
    const normalizedB = normalizeRoleTypeInput(roleTypeB);
    if (!normalizedA || !normalizedB) return false;

    const knownA = getKnownRoleType(normalizedA);
    const knownB = getKnownRoleType(normalizedB);
    if (knownA && knownB) {
        return knownA === knownB;
    }

    return normalizeRoleTypeToken(normalizedA) === normalizeRoleTypeToken(normalizedB);
}

export function getRoleTypeOptions(extraRoleType?: string | null): Array<{
    value: string;
    label: string;
}> {
    const options = KNOWN_ROLE_TYPE_ORDER.map((roleType) => ({
        value: roleType,
        label: KNOWN_ROLE_TYPE_LABELS[roleType],
    }));

    const trimmed = normalizeRoleTypeInput(extraRoleType);
    if (!trimmed || getKnownRoleType(trimmed)) {
        return options;
    }

    return [{ value: trimmed, label: `${trimmed} (Custom)` }, ...options];
}
