# Backdoor Flush

Backdoor Flush is a small hand-history desk for reviewing poker sessions.

The local app lets you upload, paste, or load hand-history text, parse it into hands, look at player tendencies, flag a few review spots, replay individual hands, track bankroll sessions, and run quick equity checks.

Version 0.9 adds study filters, tag performance summaries, review queue controls, and similar-hand recommendations.

## Run it

```bash
npm test
npm start
```

Open:

```text
http://localhost:3400
```

The local app stores state in `data/poker-felt-scope.json`. That filename is kept for existing local workspaces; you can clear the session from the dashboard or delete that file when you want a clean table.

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
- Saves live-entered hands from a structured builder with seats, cards, actions, winners, and session links.
- Opens a session detail view with linked imports, linked hands, and estimated hero results from parsed actions.
- Saves tags and notes on individual hands.
- Builds a review queue from large swings, tagged hands, river decisions, and unreviewed spots.
- Filters the hand library by tag, review status, session, hero position, result type, and pot/result sort.
- Summarizes tag performance across saved review spots.
- Finds similar hands from the selected hand's tags, hero position, streets, action pattern, pot size, and result.
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
- Saves live-entered hands directly as ready imports.
- Writes imports and parsed hands to DynamoDB.
- Stores review tags, notes, and reviewed status on hand records.
- Serves study endpoints for tag performance, hand-library filters, and similar spots.
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
curl http://localhost:3400/api/review/spots
curl http://localhost:3400/api/study/tags
curl http://localhost:3400/api/study/library
curl http://localhost:3400/api/bankroll/summary
curl http://localhost:3400/api/bankroll/sessions
curl -X POST http://localhost:3400/api/live-hands
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
- `src/core/liveHandBuilder.js` normalizes manually entered live hands.
- `src/core/handReview.js` normalizes review metadata and ranks hands for review.
- `src/core/studyTools.js` summarizes tags, filters the study library, and finds similar spots.
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
- Add saved study plans built from recurring tags and losses.
- Replace the first-pass similarity scoring with a larger recommendation engine.
