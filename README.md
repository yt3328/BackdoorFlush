# PokerFeltScope

PokerFeltScope is a small hand-history desk for reviewing poker sessions.

The local app lets you upload, paste, or load hand-history text, parse it into hands, look at player tendencies, flag a few review spots, replay individual hands, track bankroll sessions, and run quick equity checks.

Version 0.6 links imported hand histories to bankroll sessions, so a session can show both the logged result and the hands that produced the review spots.

## Run it

```bash
npm test
npm start
```

Open:

```text
http://localhost:3400
```

The local app stores state in `data/poker-felt-scope.json`. You can clear the session from the dashboard or delete that file when you want a clean table.

## What works

Local mode:

- Imports PokerStars-style text hand histories from a file picker or pasted text.
- Skips duplicate uploads and overlapping hands.
- Stores parsed hands in a local JSON store.
- Deletes individual imports or clears the local session.
- Shows VPIP, PFR, 3-bet rate, aggression factor, position splits, and compact charts.
- Tracks poker sessions with location, stakes, hours, buy-ins, cash-outs, results, hourly rate, and bb/hr.
- Shows bankroll curve and location-level session charts.
- Links imports to bankroll sessions when uploading, from the import log, or through the sample loader.
- Opens a session detail view with linked imports, linked hands, and estimated hero results from parsed actions.
- Replays parsed actions on a visual table with step controls.
- Flags a few basic review signals from the current sample.
- Runs a Monte Carlo equity check for 2-card Hold'em hands.
- Serves a small dashboard and REST API from one Node process.

AWS mode:

- Creates a Cognito user pool and web app client for account sign-in.
- Protects cloud API routes with an API Gateway JWT authorizer.
- Uses the signed-in Cognito subject as the DynamoDB partition key for each user.
- Queues uploaded hand histories through an API Lambda.
- Stores raw text in S3.
- Parses uploads asynchronously from SQS.
- Writes imports and parsed hands to DynamoDB.
- Writes bankroll sessions to a separate DynamoDB table.
- Exposes the same core stats/equity behavior through Lambda handlers.
- Hosts the static dashboard from a private S3 bucket through CloudFront.

## API

```bash
curl http://localhost:3400/api/health
curl -X POST http://localhost:3400/api/demo
curl http://localhost:3400/api/hands
curl http://localhost:3400/api/stats/summary
curl http://localhost:3400/api/leaks
curl http://localhost:3400/api/bankroll/summary
curl http://localhost:3400/api/bankroll/sessions
curl -X DELETE http://localhost:3400/api/session
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
- `src/core/sessionTracker.js` normalizes bankroll sessions and summary stats.
- `src/core/sessionInsights.js` combines bankroll sessions with linked imports and hands.
- `src/http/apiServer.js` exposes the local API and serves the dashboard.
- `src/storage/handStore.js` keeps local state.
- `src/aws/` contains Lambda handlers and AWS data adapters.
- `public/auth.js` handles Cognito Hosted UI sign-in with PKCE.
- `infra/template.yaml` is the AWS SAM backend template.
- `samples/` has a small hand-history file for local testing.
- `docs/aws-setup.md` covers safe account setup.
- `docs/deployment.md` covers SAM build/deploy steps.

## Next

- Support more hand-history formats and larger real-world exports.
- Add richer filters inside the session detail view.
- Replace the first-pass review rules with a larger recommendation engine.
