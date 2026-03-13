/**
 * Ashby Adapter Tests
 * Validates extraction from Ashby-powered career pages
 */

import { describe, test, expect } from 'vitest';
import { AshbyAdapter } from '../../src/content/adapters/ashby-adapter';
import { loadFixture } from '../test-utils';

describe('Ashby Adapter', () => {
  const ashbyAdapter = new AshbyAdapter();

  test('extracts company from ashby page', () => {
    const doc = loadFixture('ashby-sample.html');
    const result = ashbyAdapter.extract(doc);
    
    expect(result).not.toBeNull();
    expect(result?.company).toBe('Test Corp');
  });

  test('extracts role/job title', () => {
    const doc = loadFixture('ashby-sample.html');
    const result = ashbyAdapter.extract(doc);
    
    expect(result).not.toBeNull();
    expect(result?.role).toBe('Senior Data Scientist');
  });

  test('extracts location', () => {
    const doc = loadFixture('ashby-sample.html');
    const result = ashbyAdapter.extract(doc);
    
    expect(result).not.toBeNull();
    expect(result?.location).toBe('Remote • United States');
  });

  test('extracts job description', () => {
    const doc = loadFixture('ashby-sample.html');
    const result = ashbyAdapter.extract(doc);
    
    expect(result).not.toBeNull();
    expect(result?.description).toBeDefined();
  });

  test('provides correct source', () => {
    const doc = loadFixture('ashby-sample.html');
    const result = ashbyAdapter.extract(doc);
    
    expect(result).not.toBeNull();
    expect(result?.source).toBe('jobs.ashbyhq.com');
  });

  test('canHandle returns true for ashby job URLs', () => {
    expect(ashbyAdapter.canHandle('https://jobs.ashbyhq.com/company/12345')).toBe(true);
    expect(ashbyAdapter.canHandle('https://jobs.ashbyhq.com/anthropic')).toBe(true);
  });

  test('canHandle returns false for non-ashby URLs', () => {
    expect(ashbyAdapter.canHandle('https://example.com/jobs/12345')).toBe(false);
    expect(ashbyAdapter.canHandle('https://greenhouse.io/jobs/12345')).toBe(false);
  });
});
