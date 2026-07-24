# API

The local server exposes a small JSON API under `/api`.

In AWS mode, all `/api/*` routes except `GET /api/health` require a Cognito bearer token. The dashboard gets this token after sign-in and sends it as:

```http
Authorization: Bearer <id-token>
```

## Health

```http
GET /api/health
```

Returns service status.

## Imports

```http
GET /api/imports
POST /api/imports
DELETE /api/imports/:id
```

Create an import:

```json
{
  "name": "Sunday session",
  "source": "pokerstars-text",
  "rawText": "PokerStars Hand #..."
}
```

The response includes the import record and a small hand preview.

Exact duplicate uploads return the existing import with `duplicate: true`. Overlapping hands are skipped when their hand keys already exist.

In AWS mode, `POST /api/imports` returns `202` for a new upload because parsing happens asynchronously through SQS. Poll `GET /api/imports` until the import status becomes `ready` or `failed`.

## Demo

```http
POST /api/demo
```

Loads `samples/pokerstars-small.txt`.

Repeated calls do not duplicate the sample hands.

## Hands

```http
GET /api/hands?limit=100&player=Tao&position=BTN
GET /api/hands/:id
```

All query params are optional.

## Summary

```http
GET /api/stats/summary
GET /api/stats/summary?player=Tao
```

Returns player-level hands, VPIP, PFR, 3-bet rate, aggression factor, and position splits.

## Review Signals

```http
GET /api/leaks
GET /api/leaks?player=Tao
```

Returns rule-based notes for the current sample.

## Session

```http
DELETE /api/session
```

Clears imported hand-history records and parsed hands. Bankroll records are preserved.

## Bankroll

```http
GET /api/bankroll/sessions
POST /api/bankroll/sessions
DELETE /api/bankroll/sessions/:id
GET /api/bankroll/summary
```

Create a bankroll session:

```json
{
  "date": "2026-07-24",
  "location": "PokerStars",
  "gameType": "cash",
  "stakes": "$1/$2",
  "tableSize": 6,
  "hours": 3,
  "buyIn": 400,
  "cashOut": 520,
  "notes": "Good value tables."
}
```

The server calculates `profit`, `bbWon`, `hourlyRate`, and `bbPerHour`. If `profit` is sent directly, it overrides the buy-in/cash-out calculation.

## Equity

```http
POST /api/equity/calculate
```

```json
{
  "holeCards": ["Ah", "Kh"],
  "boardCards": ["As", "9h", "4c"],
  "opponents": 1,
  "iterations": 1200
}
```

Cards use short notation: rank then suit. Examples: `Ah`, `Td`, `7c`, `Ks`.
