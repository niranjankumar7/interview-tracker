# Extension Capture API

API endpoint for the Chrome extension to capture job applications.

## Endpoint

```
POST /api/extension/capture
```

## Authentication

Requires JWT token in either:
- Cookie: `auth-token`
- Header: `Authorization: Bearer <token>`

## Request Body

```typescript
{
  company: string;              // Required: Company name
  role: string;                 // Required: Job title/role
  location?: string;            // Optional: Job location
  jobUrl: string;               // Required: URL where job was found
  jobDescriptionUrl?: string;   // Optional: Direct link to job description
  externalJobId?: string;       // Optional: ATS job ID (LinkedIn, Greenhouse, etc.)
  source: "extension";          // Required: Must be "extension"
  parsedAt: string;             // Required: ISO timestamp when parsed
  confidence: number;           // Required: 0.0 - 1.0 parse confidence
  rawHtml?: string;             // Optional: Raw HTML for telemetry
  metadata?: {                  // Optional: Additional metadata
    parserVersion?: string;
    platform?: string;          // linkedin, greenhouse, etc.
    manualReview?: boolean;     // Force manual review flag
    [key: string]: unknown;
  };
}
```

## Response

### Success (200 - Existing application updated)
```json
{
  "success": true,
  "applicationId": "uuid",
  "isNew": false,
  "mergedWith": "uuid",
  "requiresManualReview": false,
  "confidence": 0.95,
  "message": "Application already exists. Updated with new capture data."
}
```

### Success (201 - New application created)
```json
{
  "success": true,
  "applicationId": "uuid",
  "isNew": true,
  "requiresManualReview": false,
  "confidence": 0.95,
  "message": "New application created successfully."
}
```

### Error (400 - Validation Error)
```json
{
  "error": "Validation failed",
  "details": "Missing or invalid: company",
  "code": "VALIDATION_ERROR"
}
```

### Error (401 - Unauthorized)
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

## Deduplication

The system prevents duplicate applications using:
1. **Fingerprint**: SHA-256 hash of normalized (company, role, URL, externalJobId, timestamp hour)
2. **Time window**: 24-hour window for fuzzy matching
3. **Normalization**: Company names and roles are normalized (lowercase, suffixes stripped)

## Manual Review

Applications flagged for manual review when:
- `confidence < 0.7`
- `metadata.manualReview === true`

Flagged applications have a warning note added automatically.

## Database Schema Changes

### New Enum
```prisma
enum ApplicationSource {
  web
  extension
  import
}
```

### New Fields on Application Model
- `source`: ApplicationSource (default: web)
- `externalJobId`: Optional ATS job ID
- `captureMetadata`: JSON audit data
- `fingerprint`: Hash for deduplication

## Example Usage

```bash
curl -X POST http://localhost:3000/api/extension/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "company": "Google Inc.",
    "role": "Senior Software Engineer",
    "location": "Mountain View, CA",
    "jobUrl": "https://linkedin.com/jobs/view/123456",
    "externalJobId": "123456",
    "source": "extension",
    "parsedAt": "2024-03-14T10:00:00Z",
    "confidence": 0.92,
    "metadata": {
      "platform": "linkedin",
      "parserVersion": "1.0.0"
    }
  }'
```

## Files Created

1. `src/app/api/extension/capture/route.ts` - API endpoint
2. `src/lib/extension-capture.ts` - Core logic
3. `src/lib/extension-capture.test.ts` - Unit tests
4. `prisma/migrations/20250314044600_add_extension_capture_fields/migration.sql` - Database migration
