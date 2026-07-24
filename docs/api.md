# API

The local server exposes a small JSON API under `/api`.

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

Clears all local imports and parsed hands.

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
