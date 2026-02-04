# LeetCode Sync (Backend Tasks)

## Goal
Allow users to connect their LeetCode username (read-only) and periodically sync activity signals:
streaks, last active date, and solved mix (easy/medium/hard).

## Consent & UX
- Explicit opt-in: “Connect LeetCode to track your activity (read-only).”
- Show what’s stored: streaks, last active date, solved mix.
- Allow disconnect + delete: “Forget LeetCode data.”
- Manual “Sync now” by default; scheduled sync only if user enables it.

## Terms of Service (Important)
- Review LeetCode ToS for scraping or API usage.
- Prefer official APIs/partners if available.
- If scraping is used:
  - Minimize request frequency.
  - Respect robots and rate limits.
  - Cache results and backoff on errors.

## Backend Endpoints
- `POST /api/leetcode/connect`
  - Accept username, store connection.
- `POST /api/leetcode/sync`
  - Fetch and return normalized stats for the username.
- `POST /api/leetcode/disconnect`
  - Remove username + stats.

## Data Model
- Connection:
  - `username`, `connectedAt`, `lastSyncAt`, `readOnly`
- Stats:
  - `currentStreak`, `longestStreak`, `lastActiveDate`
  - `easySolved`, `mediumSolved`, `hardSolved`, `totalSolved`

## Sync Strategy
- Manual sync first.
- If user enables auto-sync: run a scheduled job (e.g., daily) per user.
- Cache by username + lastSyncAt to avoid unnecessary calls.

## Security & Privacy
- Store only summary metrics, not raw problem data.
- Never store solutions or problem content.
- Provide “forget data” for immediate deletion.

## Frontend Integration Notes
- Replace `createDemoLeetCodeStats()` with real API response.
- Wire “Sync now” to backend endpoint.
