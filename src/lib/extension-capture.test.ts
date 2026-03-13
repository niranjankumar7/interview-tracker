/**
 * Tests for Extension Capture functionality
 * Run with: npx tsx src/lib/extension-capture.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    normalizeCompanyName,
    normalizeRole,
    generateFingerprint,
    validateCapturePayload,
} from './extension-capture';

describe('Extension Capture', () => {
    describe('normalizeCompanyName', () => {
        it('should lowercase company names', () => {
            expect(normalizeCompanyName('Google')).toBe('google');
            expect(normalizeCompanyName('AMAZON')).toBe('amazon');
        });

        it('should strip common suffixes', () => {
            expect(normalizeCompanyName('Google Inc.')).toBe('google');
            expect(normalizeCompanyName('Apple Inc')).toBe('apple');
            expect(normalizeCompanyName('Meta Platforms LLC')).toBe('meta platforms');
            expect(normalizeCompanyName('Stripe Ltd.')).toBe('stripe');
            expect(normalizeCompanyName('Microsoft Corporation')).toBe('microsoft');
            expect(normalizeCompanyName('Nvidia Corp')).toBe('nvidia');
        });

        it('should handle edge cases', () => {
            expect(normalizeCompanyName('')).toBe('');
            expect(normalizeCompanyName('   ')).toBe('');
            expect(normalizeCompanyName('Company,')).toBe('company');
            expect(normalizeCompanyName('Company, Inc.')).toBe('company');
        });
    });

    describe('normalizeRole', () => {
        it('should lowercase role titles', () => {
            expect(normalizeRole('Software Engineer')).toBe('software engineer');
        });

        it('should normalize seniority abbreviations', () => {
            expect(normalizeRole('Sr. Software Engineer')).toBe('senior software engineer');
            expect(normalizeRole('Sr Software Engineer')).toBe('senior software engineer');
            expect(normalizeRole('Jr. Developer')).toBe('junior developer');
            expect(normalizeRole('SW Engineer')).toBe('software engineer');
        });

        it('should handle edge cases', () => {
            expect(normalizeRole('')).toBe('');
            expect(normalizeRole('   ')).toBe('');
        });
    });

    describe('generateFingerprint', () => {
        it('should generate consistent fingerprints', () => {
            const timestamp = new Date('2024-01-15T10:00:00Z');
            const fp1 = generateFingerprint('Google Inc.', 'Software Engineer', 'https://linkedin.com/jobs/123', undefined, timestamp);
            const fp2 = generateFingerprint('google', 'software engineer', 'https://linkedin.com/jobs/123', undefined, timestamp);
            expect(fp1).toBe(fp2);
        });

        it('should generate different fingerprints for different inputs', () => {
            const timestamp = new Date('2024-01-15T10:00:00Z');
            const fp1 = generateFingerprint('Google', 'Software Engineer', 'https://linkedin.com/jobs/123', undefined, timestamp);
            const fp2 = generateFingerprint('Google', 'Senior Software Engineer', 'https://linkedin.com/jobs/123', undefined, timestamp);
            expect(fp1).not.toBe(fp2);
        });

        it('should include externalJobId in fingerprint', () => {
            const timestamp = new Date('2024-01-15T10:00:00Z');
            const fp1 = generateFingerprint('Google', 'Engineer', 'https://linkedin.com/jobs/123', 'job-456', timestamp);
            const fp2 = generateFingerprint('Google', 'Engineer', 'https://linkedin.com/jobs/123', 'job-789', timestamp);
            expect(fp1).not.toBe(fp2);
        });
    });

    describe('validateCapturePayload', () => {
        it('should validate valid payload', () => {
            const payload = {
                company: 'Google',
                role: 'Software Engineer',
                jobUrl: 'https://linkedin.com/jobs/123',
                parsedAt: '2024-01-15T10:00:00Z',
                confidence: 0.95,
            };
            const result = validateCapturePayload(payload);
            expect(result.valid).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.source).toBe('extension');
        });

        it('should reject missing company', () => {
            const payload = {
                role: 'Software Engineer',
                jobUrl: 'https://linkedin.com/jobs/123',
                parsedAt: '2024-01-15T10:00:00Z',
                confidence: 0.95,
            };
            const result = validateCapturePayload(payload);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('company');
        });

        it('should reject invalid confidence', () => {
            const payload = {
                company: 'Google',
                role: 'Software Engineer',
                jobUrl: 'https://linkedin.com/jobs/123',
                parsedAt: '2024-01-15T10:00:00Z',
                confidence: 1.5,
            };
            const result = validateCapturePayload(payload);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('confidence');
        });

        it('should reject invalid URL', () => {
            const payload = {
                company: 'Google',
                role: 'Software Engineer',
                jobUrl: 'not-a-url',
                parsedAt: '2024-01-15T10:00:00Z',
                confidence: 0.95,
            };
            const result = validateCapturePayload(payload);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('jobUrl');
        });

        it('should accept valid optional fields', () => {
            const payload = {
                company: 'Google',
                role: 'Software Engineer',
                location: 'Mountain View, CA',
                jobUrl: 'https://linkedin.com/jobs/123',
                jobDescriptionUrl: 'https://careers.google.com/job/123',
                externalJobId: 'job-456',
                parsedAt: '2024-01-15T10:00:00Z',
                confidence: 0.95,
                rawHtml: '<html>...</html>',
                metadata: { platform: 'linkedin', parserVersion: '1.0.0' },
            };
            const result = validateCapturePayload(payload);
            expect(result.valid).toBe(true);
            expect(result.data?.metadata?.platform).toBe('linkedin');
        });
    });
});
