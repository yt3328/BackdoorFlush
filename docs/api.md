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
PATCH /api/imports/:id
DELETE /api/imports/:id
```

Create an import:

```json
{
  "name": "Sunday session",
  "source": "pokerstars-text",
  "rawText": "PokerStars Hand #...",
  "sessionId": "sess_..."
}
```

The response includes the import record and a small hand preview.

Exact duplicate uploads return the existing import with `duplicate: true`. Overlapping hands are skipped when their hand keys already exist.

In AWS mode, `POST /api/imports` returns `202` for a new upload because parsing happens asynchronously through SQS. Poll `GET /api/imports` until the import status becomes `ready` or `failed`.

Move an existing import to a bankroll session, or send an empty `sessionId` to unlink it:

```json
{
  "sessionId": "sess_..."
}
```

## Demo

```http
POST /api/demo
POST /api/demo?sessionId=sess_...
```

Loads `samples/pokerstars-small.txt`.

Repeated calls do not duplicate the sample hands.

## Hands

```http
GET /api/hands?limit=100&player=Tao&position=BTN&sessionId=sess_...
GET /api/hands/:id
PATCH /api/hands/:id
GET /api/hands/:id/decisions
PATCH /api/hands/:id/decisions/:decisionId
```

All query params are optional. `importId` can also be used to read hands from one upload.

Update review metadata on a hand:

```json
{
  "tags": ["river-decision", "bad-call"],
  "notes": "Called river without blocking value.",
  "reviewed": true
}
```

Send `reviewed: false` to reopen a hand.

Read a hand's decision breakdown:

```http
GET /api/hands/hand_.../decisions
```

This returns hero decisions with street, action, pot before/after, bet-size percentage, pot odds, SPR, active players, automatic flags, prompts, saved note, checklist answers, and reviewed status.

Update one decision review:

```json
{
  "note": "River call needs a clearer bluff-catching reason.",
  "checklist": {
    "villainRange": "Mostly value, some missed draws.",
    "handsBeat": "Missed draws only.",
    "worseHandsCall": "Not relevant.",
    "betterHandsFold": "",
    "nextAdjustment": "Fold this river without better blockers."
  },
  "reviewed": true
}
```

Send `reviewed: false` to reopen the decision.

## Live Hands

```http
POST /api/live-hands
```

Create one hand from live-session input:

```json
{
  "sessionId": "sess_...",
  "name": "River call",
  "tableName": "Table 12",
  "stakes": "$1/$3",
  "hero": "Tao",
  "heroCards": "Ah Kd",
  "boardCards": "As 7c 2h Jh 4s",
  "winner": "Tao",
  "wonAmount": 85,
  "players": [
    {
      "seat": 1,
      "name": "Tao",
      "position": "BTN",
      "stack": 300
    },
    {
      "seat": 2,
      "name": "Villain",
      "position": "BB",
      "stack": 300
    }
  ],
  "actions": [
    {
      "street": "hole-cards",
      "player": "Tao",
      "type": "raises",
      "amount": 12
    }
  ]
}
```

The server saves the hand using the same internal shape as parsed imports. In AWS mode, live hands are stored immediately as `ready` imports with `source: "live-entry"`.

## Summary

```http
GET /api/stats/summary
GET /api/stats/summary?player=Tao
```

Returns player-level hands, VPIP, PFR, 3-bet rate, aggression factor, and position splits.

## Review

```http
GET /api/leaks
GET /api/leaks?player=Tao
GET /api/review/spots?sessionId=sess_...&tag=river-decision&reviewed=false&sort=biggest-loss
```

`/api/leaks` returns rule-based player notes for the current sample. `/api/review/spots` returns ranked hands to review, using hand tags, notes, reviewed status, large pots, swings, and river decisions. All query params are optional.

## Study

```http
GET /api/study/tags
GET /api/study/library?tag=river-decision&reviewed=false&position=BTN&result=loss&sort=biggest-loss
GET /api/study/plan
GET /api/hands/:id/similar?limit=6
```

`/api/study/tags` returns tag-level hand counts, reviewed/open counts, total estimated result, average result, largest win/loss, and reviewed percentage.

`/api/study/library` returns compact hand rows for a filtered study library. Supported filters are `limit`, `sessionId`, `tag`, `reviewed`, `position`, `result`, `player`, `search`, and `sort`.

`/api/hands/:id/similar` returns hands ranked by shared tags, hero position, decision streets, preflop shape, pot size, and result type.

`/api/study/plan` returns study prompts built from open river decisions, flagged decisions, tagged hands, and biggest losses.

## Session

```http
DELETE /api/session
```

Clears imported hand-history records and parsed hands. Bankroll records are preserved.

## Bankroll

```http
GET /api/bankroll/sessions
POST /api/bankroll/sessions
GET /api/bankroll/sessions/:id
PATCH /api/bankroll/sessions/:id
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

`GET /api/bankroll/sessions/:id` returns the session, linked imports, linked hands, player summaries, review signals, a small review queue, and the biggest estimated hero wins/losses for that session.

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
