# PokerFeltScope

PokerFeltScope is a small hand-history desk for reviewing poker sessions.

The first version keeps things local: paste or load hand-history text, parse it into hands, look at player tendencies, flag a few review spots, and run quick equity checks. The AWS folder sketches the pieces needed when the parser moves from a local app into an upload-and-process pipeline.

## Run it

```bash
npm test
npm start
```

Open:

```text
http://localhost:3400
```

The local app stores state in `data/poker-felt-scope.json`. Delete that file when you want a clean table.

## What works

- Imports PokerStars-style text hand histories.
- Stores parsed hands in a local JSON store.
- Shows VPIP, PFR, 3-bet rate, aggression factor, and position splits.
- Flags a few basic review signals from the current sample.
- Runs a Monte Carlo equity check for 2-card Hold'em hands.
- Serves a small dashboard and REST API from one Node process.

## API

```bash
curl http://localhost:3400/api/health
curl -X POST http://localhost:3400/api/demo
curl http://localhost:3400/api/hands
curl http://localhost:3400/api/stats/summary
curl http://localhost:3400/api/leaks
```

Equity check:

```bash
curl -X POST http://localhost:3400/api/equity/calculate \
  -H "content-type: application/json" \
  -d '{
    "holeCards": ["Ah", "Kh"],
    "boardCards": ["As", "9h", "4c"],
    "opponents": 1,
    "iterations": 1200
  }'
```

## Layout

- `src/core/handParser.js` parses hand-history text.
- `src/core/stats.js` computes player summaries and review signals.
- `src/core/equity.js` runs the Hold'em equity calculator.
- `src/http/apiServer.js` exposes the local API and serves the dashboard.
- `src/storage/handStore.js` keeps local state.
- `src/aws/lambdaHandlers.js` has small Lambda-ready handlers for the core functions.
- `infra/template.yaml` is the AWS SAM starting point.
- `samples/` has a small hand-history file for local testing.

## Next

- Support more hand-history formats.
- Store uploads in S3 and parsed hands in DynamoDB.
- Move parsing into an SQS-backed worker.
- Add session-level graphs and bankroll tracking.
- Replace the first-pass review rules with a larger recommendation engine.
