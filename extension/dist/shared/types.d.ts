/**
 * TypeScript interfaces for Interview Tracker Extension
 */
export interface User {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    createdAt: string;
}
export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token?: string;
    expiresAt?: string;
}
export type InterviewStatus = 'applied' | 'screening' | 'phone' | 'technical' | 'onsite' | 'offer' | 'rejected' | 'withdrawn';
export interface Interview {
    id: string;
    companyName: string;
    position: string;
    jobUrl?: string;
    status: InterviewStatus;
    salary?: {
        min?: number;
        max?: number;
        currency?: string;
        period?: 'yearly' | 'monthly' | 'hourly';
    };
    location?: string;
    remotePolicy?: 'remote' | 'hybrid' | 'onsite';
    contacts?: Contact[];
    notes?: string;
    dates: {
        applied?: string;
        lastContact?: string;
        nextStep?: string;
    };
    createdAt: string;
    updatedAt: string;
}
export interface Contact {
    id: string;
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
}
export interface InterviewEvent {
    id: string;
    interviewId: string;
    type: 'application' | 'screening' | 'interview' | 'followup' | 'offer' | 'rejection';
    title: string;
    description?: string;
    date: string;
    duration?: number;
    location?: string;
    notes?: string;
    createdAt: string;
}
export interface PageInfo {
    url: string;
    title: string;
    domain: string;
    jobTitle?: string;
    companyName?: string;
    extractedAt: string;
}
export type MessageType = 'HEALTH_CHECK' | 'GET_VERSION' | 'PING' | 'EXTRACT_PAGE_INFO' | 'CREATE_INTERVIEW' | 'SAVE_INTERVIEW' | 'GET_INTERVIEWS' | 'UPDATE_INTERVIEW' | 'DELETE_INTERVIEW';
export interface MessageRequest {
    type: MessageType;
    payload?: unknown;
}
export interface MessageResponse {
    success?: boolean;
    error?: string;
    healthy?: boolean;
    version?: string;
    pong?: boolean;
    data?: unknown;
    timestamp?: number;
}
export type StorageKey = 'authState' | 'interviews' | 'settings' | 'events';
export interface ExtensionSettings {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    autoExtract: boolean;
    defaultCurrency: string;
}
export interface ApiResponse {
    success: boolean;
    data?: unknown;
    error?: string;
    message?: string;
}
export interface PaginatedResponse {
    items: unknown[];
    total: number;
    page: number;
    perPage: number;
    hasMore: boolean;
}
export interface ExtractedJobData {
    company: string;
    role: string;
    location?: string;
    jobDescriptionUrl: string;
    description?: string;
    externalJobId?: string;
    source: string;
}
export interface ExtractionConfidence {
    company: number;
    role: number;
    location: number;
    overall: number;
}
export interface ExtractionResult {
    data: ExtractedJobData;
    confidence: ExtractionConfidence;
    rawHtml?: string;
    extractionMethod: 'json-ld' | 'meta' | 'heuristic' | 'manual' | 'adapter';
    timestamp: number;
}
export type ExtendedMessageType = MessageType | 'EXTRACT_JOB';
export interface ExtractJobMessage {
    type: 'EXTRACT_JOB';
    url: string;
}
export interface ExtractJobResponse {
    success: boolean;
    data?: {
        company: string;
        role: string;
        location?: string;
        jobUrl: string;
        jobDescription?: string;
        confidence: number;
    };
    error?: string;
}
export interface ExtensionMessageBase {
    type: ExtendedMessageType;
    payload?: unknown;
}
export type ExtensionMessage = ExtractJobMessage | {
    type: 'HEALTH_CHECK';
} | {
    type: 'PING';
} | {
    type: 'AUTH_STATE_CHANGED';
    payload: AuthState;
} | {
    type: 'SAVE_JOB';
    payload: unknown;
} | {
    type: 'GET_CURRENT_TAB';
};
export interface CaptureMetadata {
    confidence: ExtractionConfidence;
    extractionMethod: 'json-ld' | 'meta' | 'heuristic' | 'manual' | 'adapter';
    source: string;
    timestamp: number;
}
export interface CaptureRequest {
    company: string;
    role: string;
    location?: string;
    jobDescriptionUrl: string;
    externalJobId?: string;
    captureMetadata: CaptureMetadata;
}
//# sourceMappingURL=types.d.ts.map