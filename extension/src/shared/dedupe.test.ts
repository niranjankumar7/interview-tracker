/**
 * Tests for deduplication utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeCompany,
  normalizeRole,
  generateFingerprint,
  isDuplicate,
  type JobData,
} from './dedupe';

describe('normalizeCompany', () => {
  it('should lowercase and remove legal suffixes', () => {
    expect(normalizeCompany('Acme Inc.')).toBe('acme');
    expect(normalizeCompany('TechCorp LLC')).toBe('techcorp');
    expect(normalizeCompany('Startup Ltd.')).toBe('startup');
    expect(normalizeCompany('Big Corp Corporation')).toBe('big corp');
  });

  it('should remove punctuation', () => {
    expect(normalizeCompany('A.C.M.E., Inc.')).toBe('acme');
    expect(normalizeCompany('Tech-Start Co.')).toBe('techstart');
  });

  it('should trim whitespace', () => {
    expect(normalizeCompany('  Acme  Inc.  ')).toBe('acme');
  });
});

describe('normalizeRole', () => {
  it('should expand common abbreviations', () => {
    expect(normalizeRole('Sr Engineer')).toBe('senior engineer');
    expect(normalizeRole('Jr Developer')).toBe('junior developer');
    expect(normalizeRole('Eng Mgr')).toBe('engineer manager');
  });

  it('should handle multiple abbreviations', () => {
    expect(normalizeRole('Sr FE Dev')).toBe('senior frontend developer');
    expect(normalizeRole('VP of Eng')).toBe('vice president of engineer');
  });

  it('should lowercase and remove punctuation', () => {
    expect(normalizeRole('Senior Software Engineer.')).toBe('senior software engineer');
  });
});

describe('generateFingerprint', () => {
  it('should generate consistent SHA-256 hashes for same data', async () => {
    const job: JobData = {
      company: 'Google Inc.',
      role: 'Sr Software Engineer',
      jobDescriptionUrl: 'https://careers.google.com/jobs/123',
      timestamp: 1700000000000,
    };

    const hash1 = await generateFingerprint(job);
    const hash2 = await generateFingerprint(job);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 is 64 hex chars
  });

  it('should generate different hashes for different companies', async () => {
    const job1: JobData = {
      company: 'Google Inc.',
      role: 'Software Engineer',
      jobDescriptionUrl: 'https://example.com/job',
      timestamp: 1700000000000,
    };

    const job2: JobData = {
      company: 'Microsoft Corp',
      role: 'Software Engineer',
      jobDescriptionUrl: 'https://example.com/job',
      timestamp: 1700000000000,
    };

    const hash1 = await generateFingerprint(job1);
    const hash2 = await generateFingerprint(job2);

    expect(hash1).not.toBe(hash2);
  });
});

describe('isDuplicate', () => {
  it('should return true for exact duplicate within 24h', () => {
    const baseTime = Date.now();
    
    const newJob: JobData = {
      company: 'Google Inc.',
      role: 'Senior Software Engineer',
      jobDescriptionUrl: 'https://careers.google.com/jobs/123',
      timestamp: baseTime,
    };

    const existingJobs: JobData[] = [
      {
        company: 'Google LLC',
        role: 'Sr. Software Engineer',
        jobDescriptionUrl: 'https://careers.google.com/jobs/123?utm_source=linkedin',
        timestamp: baseTime - 1000 * 60 * 60, // 1 hour ago
      },
    ];

    expect(isDuplicate(newJob, existingJobs)).toBe(true);
  });

  it('should return false for same job outside 24h window', () => {
    const baseTime = Date.now();
    
    const newJob: JobData = {
      company: 'Google',
      role: 'Software Engineer',
      jobDescriptionUrl: 'https://careers.google.com/jobs/123',
      timestamp: baseTime,
    };

    const existingJobs: JobData[] = [
      {
        company: 'Google',
        role: 'Software Engineer',
        jobDescriptionUrl: 'https://careers.google.com/jobs/123',
        timestamp: baseTime - 1000 * 60 * 60 * 25, // 25 hours ago
      },
    ];

    expect(isDuplicate(newJob, existingJobs)).toBe(false);
  });

  it('should return false for different jobs', () => {
    const baseTime = Date.now();
    
    const newJob: JobData = {
      company: 'Google',
      role: 'Software Engineer',
      jobDescriptionUrl: 'https://careers.google.com/jobs/123',
      timestamp: baseTime,
    };

    const existingJobs: JobData[] = [
      {
        company: 'Microsoft',
        role: 'Software Engineer',
        jobDescriptionUrl: 'https://careers.microsoft.com/jobs/456',
        timestamp: baseTime - 1000 * 60 * 60, // 1 hour ago
      },
    ];

    expect(isDuplicate(newJob, existingJobs)).toBe(false);
  });

  it('should return true for normalized duplicate with different formatting', () => {
    const baseTime = Date.now();
    
    const newJob: JobData = {
      company: 'Acme, Inc.',
      role: 'Sr. Engineer',
      jobDescriptionUrl: 'https://jobs.acme.com/123',
      timestamp: baseTime,
    };

    const existingJobs: JobData[] = [
      {
        company: 'ACME INC',
        role: 'Senior Engineer',
        jobDescriptionUrl: 'https://jobs.acme.com/123',
        timestamp: baseTime - 1000 * 60 * 30, // 30 minutes ago
      },
    ];

    expect(isDuplicate(newJob, existingJobs)).toBe(true);
  });

  it('should return false for empty existing jobs array', () => {
    const newJob: JobData = {
      company: 'Google',
      role: 'Engineer',
      jobDescriptionUrl: 'https://google.com/jobs/1',
      timestamp: Date.now(),
    };

    expect(isDuplicate(newJob, [])).toBe(false);
  });
});
