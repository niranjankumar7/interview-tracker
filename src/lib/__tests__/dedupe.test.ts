/**
 * Tests for deduplication and merge rules
 */

import {
  normalizeCompany,
  normalizeRole,
  generateFingerprint,
  generateFingerprintHash,
  calculateSimilarity,
  isExactMatch,
  isSoftMatch,
  checkDuplicate,
  mergeApplicationData,
  calculateMatchConfidence,
  DEDUPE_WINDOWS,
} from '@/lib/dedupe-shared';

describe('Deduplication', () => {
  describe('normalizeCompany', () => {
    it('should lowercase company names', () => {
      expect(normalizeCompany('Google')).toBe('google');
      expect(normalizeCompany('Meta Platforms')).toBe('meta platforms');
    });

    it('should remove common suffixes', () => {
      expect(normalizeCompany('Acme Inc')).toBe('acme');
      expect(normalizeCompany('Acme LLC')).toBe('acme');
      expect(normalizeCompany('Acme Ltd')).toBe('acme');
      expect(normalizeCompany('Acme Corporation')).toBe('acme');
      expect(normalizeCompany('Acme Corp')).toBe('acme');
      expect(normalizeCompany('Acme Co')).toBe('acme');
    });

    it('should remove punctuation', () => {
      expect(normalizeCompany('Acme, Inc.')).toBe('acme');
      expect(normalizeCompany('Acme (Old Name)')).toBe('acme old name');
    });

    it('should handle multiple suffixes', () => {
      expect(normalizeCompany('Acme Inc., LLC')).toBe('acme');
    });
  });

  describe('normalizeRole', () => {
    it('should lowercase role titles', () => {
      expect(normalizeRole('Software Engineer')).toBe('software engineer');
    });

    it('should remove seniority levels', () => {
      expect(normalizeRole('Senior Software Engineer')).toBe('software engineer');
      expect(normalizeRole('Junior Developer')).toBe('developer');
      expect(normalizeRole('Sr. Engineer')).toBe('engineer');
      expect(normalizeRole('Lead Software Engineer')).toBe('software engineer');
    });

    it('should standardize abbreviations', () => {
      expect(normalizeRole('SWE')).toBe('software engineer');
      expect(normalizeRole('SDE')).toBe('software development engineer');
      expect(normalizeRole('Dev')).toBe('developer');
      expect(normalizeRole('ML Engineer')).toBe('machine learning engineer');
    });

    it('should handle complex titles', () => {
      expect(normalizeRole('Senior Full Stack SWE')).toBe('full stack software engineer');
    });
  });

  describe('generateFingerprint', () => {
    it('should generate consistent fingerprints', () => {
      const fp1 = generateFingerprint('Google Inc', 'Senior SWE', 'https://google.com/jobs', '12345');
      const fp2 = generateFingerprint('Google LLC', 'Senior Software Engineer', 'https://google.com/jobs', '12345');
      
      // Company and role should be normalized to be the same
      expect(fp1.normalizedCompany).toBe(fp2.normalizedCompany);
      expect(fp1.normalizedRole).toBe(fp2.normalizedRole);
    });

    it('should include all fields', () => {
      const fp = generateFingerprint('Company', 'Role', 'https://example.com', 'job123', 1234567890);
      
      expect(fp.normalizedCompany).toBe('company');
      expect(fp.normalizedRole).toBe('role');
      expect(fp.sourceUrl).toBe('https://example.com');
      expect(fp.externalJobId).toBe('job123');
      expect(fp.timestamp).toBeGreaterThan(0);
    });

    it('should round timestamp to day', () => {
      const now = Date.now();
      const fp = generateFingerprint('Company', 'Role', undefined, undefined, now);
      
      const expectedDay = new Date(now);
      expectedDay.setHours(0, 0, 0, 0);
      
      expect(fp.timestamp).toBe(expectedDay.getTime());
    });
  });

  describe('generateFingerprintHash', () => {
    it('should generate consistent hashes', () => {
      const fp = generateFingerprint('Google', 'SWE', 'https://google.com', '123');
      const hash = generateFingerprintHash(fp);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).toContain('google');
      expect(hash).toContain('software engineer');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateSimilarity('software engineer', 'software engineer')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateSimilarity('abc', 'xyz')).toBe(0);
    });

    it('should calculate correct similarity for similar strings', () => {
      const similarity = calculateSimilarity('software engineer', 'software engineering');
      expect(similarity).toBeGreaterThan(0.8);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty strings', () => {
      expect(calculateSimilarity('', 'test')).toBe(0);
      expect(calculateSimilarity('test', '')).toBe(0);
    });
  });

  describe('isExactMatch', () => {
    it('should match identical fingerprints', () => {
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com', '123');
      const fp2 = generateFingerprint('Google', 'SWE', 'https://google.com', '123');
      
      expect(isExactMatch(fp1, fp2)).toBe(true);
    });

    it('should match normalized company names', () => {
      const fp1 = generateFingerprint('Google Inc', 'SWE', 'https://google.com');
      const fp2 = generateFingerprint('Google LLC', 'SWE', 'https://google.com');
      
      expect(isExactMatch(fp1, fp2)).toBe(true);
    });

    it('should not match different companies', () => {
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com');
      const fp2 = generateFingerprint('Meta', 'SWE', 'https://meta.com');
      
      expect(isExactMatch(fp1, fp2)).toBe(false);
    });

    it('should not match different roles', () => {
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com');
      const fp2 = generateFingerprint('Google', 'PM', 'https://google.com');
      
      expect(isExactMatch(fp1, fp2)).toBe(false);
    });

    it('should not match outside time window', () => {
      const now = Date.now();
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com', undefined, now);
      const fp2 = generateFingerprint('Google', 'SWE', 'https://google.com', undefined, now - 31 * 24 * 60 * 60 * 1000);
      
      expect(isExactMatch(fp1, fp2, 30)).toBe(false);
    });

    it('should require externalJobId match if both present', () => {
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com', '123');
      const fp2 = generateFingerprint('Google', 'SWE', 'https://google.com', '456');
      
      expect(isExactMatch(fp1, fp2)).toBe(false);
    });
  });

  describe('isSoftMatch', () => {
    it('should match similar roles at same company', () => {
      const fp1 = generateFingerprint('Google', 'Software Engineer', 'https://google.com');
      const fp2 = generateFingerprint('Google', 'Software Engineering', 'https://google.com');
      
      expect(isSoftMatch(fp1, fp2)).toBe(true);
    });

    it('should not match different companies', () => {
      const fp1 = generateFingerprint('Google', 'Software Engineer', 'https://google.com');
      const fp2 = generateFingerprint('Meta', 'Software Engineer', 'https://meta.com');
      
      expect(isSoftMatch(fp1, fp2)).toBe(false);
    });

    it('should not match dissimilar roles', () => {
      const fp1 = generateFingerprint('Google', 'Software Engineer', 'https://google.com');
      const fp2 = generateFingerprint('Google', 'Product Manager', 'https://google.com');
      
      expect(isSoftMatch(fp1, fp2)).toBe(false);
    });

    it('should not match outside shorter time window', () => {
      const now = Date.now();
      const fp1 = generateFingerprint('Google', 'Software Engineer', 'https://google.com', undefined, now);
      const fp2 = generateFingerprint('Google', 'Software Engineering', 'https://google.com', undefined, now - 8 * 24 * 60 * 60 * 1000);
      
      expect(isSoftMatch(fp1, fp2)).toBe(false);
    });
  });

  describe('checkDuplicate', () => {
    it('should find exact match', () => {
      const newFp = generateFingerprint('Google', 'SWE', 'https://google.com', '123');
      const existing = [
        { id: 'app1', fingerprint: generateFingerprint('Google', 'SWE', 'https://google.com', '123') },
      ];
      
      const result = checkDuplicate(newFp, existing);
      
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('exact');
      expect(result.existingApplicationId).toBe('app1');
    });

    it('should find soft match', () => {
      const newFp = generateFingerprint('Google', 'Software Engineer', 'https://google.com');
      const existing = [
        { id: 'app1', fingerprint: generateFingerprint('Google', 'Software Engineering', 'https://google.com') },
      ];
      
      const result = checkDuplicate(newFp, existing);
      
      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBe('soft');
      expect(result.existingApplicationId).toBe('app1');
      expect(result.warnings).toBeDefined();
    });

    it('should return no match for different applications', () => {
      const newFp = generateFingerprint('Google', 'SWE', 'https://google.com');
      const existing = [
        { id: 'app1', fingerprint: generateFingerprint('Meta', 'SWE', 'https://meta.com') },
      ];
      
      const result = checkDuplicate(newFp, existing);
      
      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBe('none');
    });

    it('should prioritize exact match over soft match', () => {
      const newFp = generateFingerprint('Google', 'SWE', 'https://google.com');
      const existing = [
        { id: 'app1', fingerprint: generateFingerprint('Google', 'SWE', 'https://google.com') },
        { id: 'app2', fingerprint: generateFingerprint('Google', 'Software Engineering', 'https://google.com') },
      ];
      
      const result = checkDuplicate(newFp, existing);
      
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('exact');
      expect(result.existingApplicationId).toBe('app1');
    });
  });

  describe('mergeApplicationData', () => {
    it('should merge mutable fields', () => {
      const existing = { id: '1', company: 'Google', role: 'SWE', location: 'NYC', salary: 100000 };
      const newData = { id: '2', company: 'Google', role: 'Senior SWE', location: 'SF', salary: 150000 };
      
      const result = mergeApplicationData(existing, newData);
      
      expect(result.merged.location).toBe('SF');
      expect(result.merged.salary).toBe(150000);
      expect(result.fieldsUpdated).toContain('location');
      expect(result.fieldsUpdated).toContain('salary');
    });

    it('should preserve immutable fields', () => {
      const existing = { id: '1', createdAt: '2024-01-01', userId: 'user1', company: 'Google' };
      const newData = { id: '2', createdAt: '2024-02-01', userId: 'user2', company: 'Meta' };
      
      const result = mergeApplicationData(existing, newData);
      
      expect(result.merged.id).toBe('1');
      expect(result.merged.createdAt).toBe('2024-01-01');
      expect(result.merged.userId).toBe('user1');
    });

    it('should not overwrite with empty values', () => {
      const existing = { company: 'Google', role: 'SWE' };
      const newData = { company: '', role: null, location: undefined };
      
      const result = mergeApplicationData(existing, newData);
      
      expect(result.merged.company).toBe('Google');
      expect(result.merged.role).toBe('SWE');
      expect(result.fieldsUpdated).toHaveLength(0);
    });

    it('should fill empty fields from new data', () => {
      const existing = { company: 'Google', role: 'SWE', notes: '' };
      const newData = { company: 'Meta', role: 'PM', notes: 'Important notes' };
      
      const result = mergeApplicationData(existing, newData, ['location'], ['id']);
      
      // Company and role are not in mutable fields, so they should only update if empty
      expect(result.merged.company).toBe('Google'); // Not empty, so preserved
      expect(result.merged.role).toBe('SWE'); // Not empty, so preserved
      expect(result.merged.notes).toBe('Important notes'); // Was empty, so updated
    });
  });

  describe('calculateMatchConfidence', () => {
    it('should return high confidence for exact match', () => {
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com', '123');
      const fp2 = generateFingerprint('Google', 'SWE', 'https://google.com', '123');
      
      const confidence = calculateMatchConfidence(fp1, fp2);
      
      expect(confidence).toBeGreaterThan(0.9);
    });

    it('should return lower confidence for partial match', () => {
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com');
      const fp2 = generateFingerprint('Google', 'Software Engineer'); // Different role, no URL
      
      const confidence = calculateMatchConfidence(fp1, fp2);
      
      expect(confidence).toBeGreaterThan(0.3);
      expect(confidence).toBeLessThan(0.8);
    });

    it('should return low confidence for minimal match', () => {
      const fp1 = generateFingerprint('Google', 'SWE', 'https://google.com');
      const fp2 = generateFingerprint('Meta', 'PM', 'https://meta.com');
      
      const confidence = calculateMatchConfidence(fp1, fp2);
      
      expect(confidence).toBeLessThan(0.2);
    });
  });
});

describe('DEDUPE_WINDOWS constants', () => {
  it('should have correct values', () => {
    expect(DEDUPE_WINDOWS.EXACT_MATCH_DAYS).toBe(30);
    expect(DEDUPE_WINDOWS.SOFT_MATCH_DAYS).toBe(7);
    expect(DEDUPE_WINDOWS.SOFT_MATCH_SIMILARITY).toBe(0.8);
  });
});
