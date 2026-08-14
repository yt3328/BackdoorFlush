# Backdoor Flush

Backdoor Flush is a small hand-history desk for reviewing poker sessions.

The local app lets you upload, paste, or load hand-history text, parse it into hands, look at player tendencies, flag a few review spots, replay individual hands, track bankroll sessions, and run quick equity checks.

Version 2.3 adds full workspace backup restore with preview, duplicate detection, and merge-only imports for local and signed-in cloud workspaces.

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
- Shows VPIP, PFR, 3-bet rate, aggression factor, captured hero-position coverage, and compact charts.
- Tracks poker sessions with location, stakes, hours, buy-ins, cash-outs, results, hourly rate, and bb/hr.
- Imports previous cash-game and tournament session exports into the bankroll tracker.
- Previews bankroll exports before import, including new sessions, ledger transactions, duplicates, and skipped rows.
- Tracks bankroll transactions separately from poker-session results.
- Shows bankroll progress, location-level session charts, and common Home periods such as 7D, 30D, 90D, YTD, and All.
- Keeps Home and Sessions filters synchronized across date range, location, game type, stakes, and linked-hand review status.
- Shows a workspace health strip for save mode, last activity, ready/queued/failed imports, linked hands, and review coverage.
- Labels demo data as temporary, local data as saved on the computer, and cloud data as saved to the signed-in account.
- Links imports to bankroll sessions when uploading, from the import log, or through the sample loader.
- Saves live-entered hands from a structured builder with seats, cards, actions, winners, and session links.
- Offers a read-only demo workspace that stays separate from a signed-in user's real data.
- Opens a session detail view with linked imports, linked hand filters, session audit counts, filtered review queues, and estimated hero results from parsed actions.
- Compares the logged bankroll result with the captured-hand estimate so missing hands are visible instead of hidden.
- Exports the current session view to CSV, the transaction ledger to CSV, filtered selected-session hands to CSV, and selected-session review reports to Markdown.
- Exports a full workspace JSON backup through the local or cloud API.
- Restores a workspace Backup JSON after previewing sessions, transactions, imports, hands, and duplicates.
- Saves tags and notes on individual hands.
- Builds a hands-to-review list from large swings, tagged hands, river decisions, and unreviewed spots.
- Opens a dedicated Review view with queue filters, progress, batch sessions, and current-hand navigation.
- Filters the hand library by tag, review status, session, hero position, result type, and pot/result sort.
- Summarizes tag performance across saved review spots.
- Finds similar hands from the selected hand's tags, hero position, streets, action pattern, pot size, and result.
- Breaks hands into hero decisions with pot size, bet size, pot odds, SPR, active players, and automatic flags.
- Saves notes and checklist answers on individual decisions.
- Supports mark-and-next review actions for hands and decision points.
- Builds a "what to work on next" list from open river decisions, flagged decisions, tagged hands, and biggest losses.
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
- Stores decision notes and checklist answers on hand records.
- Serves study endpoints for tag performance, hand-library filters, similar spots, decision breakdowns, and study plans.
- Writes bankroll sessions to a separate DynamoDB table.
- Stores bankroll ledger transactions alongside session records in DynamoDB.
- Imports exported bankroll sessions and transaction rows through the same protected API used by the dashboard.
- Exposes a protected workspace backup endpoint for signed-in cloud data.
- Restores signed-in cloud workspace backups through a protected merge endpoint.
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
curl http://localhost:3400/api/study/plan
curl http://localhost:3400/api/bankroll/summary
curl http://localhost:3400/api/bankroll/sessions
curl http://localhost:3400/api/bankroll/transactions
curl -X POST http://localhost:3400/api/bankroll/imports/preview
curl -X POST http://localhost:3400/api/bankroll/imports
curl -X POST http://localhost:3400/api/live-hands
curl http://localhost:3400/api/export/workspace
curl -X POST http://localhost:3400/api/restore/workspace/preview
curl -X POST http://localhost:3400/api/restore/workspace
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
- `src/core/decisionReview.js` builds decision breakdowns, checklists, and study-plan prompts.
- `src/core/handReview.js` normalizes review metadata and ranks hands for review.
- `src/core/studyTools.js` summarizes tags, filters the study library, and finds similar spots.
- `src/core/stats.js` computes player summaries and review signals.
- `src/core/equity.js` runs the Hold'em equity calculator.
- `src/core/sessionTracker.js` normalizes bankroll sessions and summary stats.
- `src/core/bankrollImport.js` reads exported bankroll/session CSV text.
- `src/core/bankrollTransactions.js` normalizes transaction ledger entries.
- `src/core/sessionInsights.js` combines bankroll sessions with linked imports and hands.
- `src/core/workspaceExport.js` builds the backup JSON payload.
- `src/core/workspaceRestore.js` validates backup JSON and plans merge restores.
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
- Add decision review exports for selected sessions.
- Add share links for filtered hand queues.
- Replace the first-pass decision flags with a larger recommendation engine.
