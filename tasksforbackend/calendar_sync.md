# Calendar Sync (Backend Tasks)

## Goal
Replace the frontend mock calendar sync with a real Google Calendar read-only integration that can detect interview invites and suggest pipeline updates.

## OAuth and Permissions
- Create Google Cloud project and enable Google Calendar API.
- Configure OAuth consent screen.
- Scopes to request:
`https://www.googleapis.com/auth/calendar.readonly`
- Implement OAuth redirect flow with PKCE.
- Store access + refresh tokens securely (encrypted at rest).
- Allow disconnect/revoke and clear tokens.

## Backend Endpoints
- `POST /api/calendar/connect`
Return authorization URL and PKCE challenge.
- `GET /api/calendar/callback`
Exchange code for tokens, persist.
- `POST /api/calendar/sync`
Fetch events and return normalized payload.
- `POST /api/calendar/webhook`
Receive push notifications.
- `POST /api/calendar/disconnect`
Revoke tokens and clear data.

## Data Models
- Calendar connection state: provider, email, connectedAt, lastSyncAt.
- Calendar events: id, title, start, end, organizer, attendees, location, meetingLink.
- Calendar suggestions: eventId, company, role, roleType, interviewDate, confidence, status.

## Sync Strategy
- Initial full sync on connect.
- Incremental sync using `syncToken`.
- Store `syncToken` per user.
- Normalize events and de-dupe by eventId.
- Detect updates and cancellations.

## Reschedule and Cancellation Handling
- If user allowed auto-apply: update pipeline interview dates asynchronously.
- Otherwise create a pending confirmation entry:
“We saw this interview rescheduled to {date}, confirm?”
- If event is cancelled, optionally mark application status or notify.

## Heuristics (Reuse Frontend Logic)
- Interview keywords in title.
- Company matching against pipeline companies.
- Role inference from title.
- Confidence: high if company matches pipeline, medium if parsed from title.

## Rate Limits and Caching
- Respect Google API quotas.
- Cache last sync timestamp.
- Exponential backoff on errors.

## Security and Privacy
- Store minimum event data needed for suggestions.
- Avoid logging raw event bodies.
- Provide “forget calendar data” option.

## Frontend Integration Notes
- Replace `createDemoCalendarEvents()` with API response.
- `syncCalendarEvents()` should be called with real data on:
Connect, manual “Sync now,” and auto-sync on login if enabled.
