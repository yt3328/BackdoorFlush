# Architecture Notes

The local app is intentionally small, but the module boundaries line up with a cloud version.

```mermaid
flowchart LR
  Browser["Dashboard"] --> CloudFront["CloudFront"]
  CloudFront --> FrontendS3["S3 frontend bucket"]
  Browser --> Cognito["Cognito Hosted UI"]
  Browser --> API["API Gateway"]
  Cognito --> API
  API --> ImportLambda["Import Lambda"]
  API --> ReadLambda["Read Lambda"]
  API --> LiveLambda["Live Hand Routes"]
  API --> EquityLambda["Equity Lambda"]
  API --> SessionLambda["Session Tracker Routes"]
  ImportLambda --> S3["S3 raw uploads"]
  ImportLambda --> Queue["SQS parse queue"]
  Queue --> Parser["Parser worker"]
  Parser --> Dynamo["DynamoDB hands table"]
  LiveLambda --> S3
  LiveLambda --> Dynamo
  ReadLambda --> Dynamo
  SessionLambda --> SessionsDynamo["DynamoDB sessions table"]
  SessionLambda --> Dynamo
  EquityLambda --> Model["Local calculator or SageMaker endpoint"]
```

## Local Version

- One Node process serves static files and API routes.
- A JSON file stores imports, parsed hands, and bankroll sessions.
- The parser, stats engine, bankroll tracker, and equity calculator are plain modules with tests.

## AWS Version

- S3 stores raw hand-history uploads.
- CloudFront serves the static dashboard from a private S3 bucket.
- Cognito signs users in through the Hosted UI.
- API Gateway fronts the public API.
- API Gateway validates Cognito JWTs before private routes reach Lambda.
- Lambda handles imports, live hands, reads, stats, bankroll sessions, and equity checks.
- SQS buffers parse jobs so large uploads do not block requests.
- DynamoDB stores parsed hand records keyed by the signed-in user's Cognito subject.
- DynamoDB stores bankroll sessions in a separate table keyed by the same signed-in user.
- Imports and hands can carry a `sessionId`, which lets one bankroll record open into its linked hand review.
- Live hands are normalized into the same hand shape as parsed imports, then saved as ready `live-entry` imports.
- Review tags, notes, and reviewed status live on each hand record.
- Study views derive tag performance, filtered library rows, and similar spots from those hand records.
- Decision reviews derive street-level hero decisions from hand actions and store notes/checklists back on the hand record.
- CloudWatch alarms track API and parse worker errors.
- SageMaker can be added later for recommendation or clustering work.

## Data Shape

Raw uploads are kept separate from parsed hands. That makes parser changes easier: old uploads can be reprocessed when the parser learns a new format.

Parsed hands should eventually include:

- `userId`
- `importId`
- `sessionId`
- `handNumber`
- `tableName`
- `players`
- `hero`
- `holeCards`
- `board`
- `actions`
- `winnings`
- `tags`
- `notes`
- `reviewedAt`
- `decisionReviews`
- `createdAt`

Bankroll sessions include:

- `userId`
- `sessionId`
- `date`
- `location`
- `gameType`
- `stakes`
- `hours`
- `buyIn`
- `cashOut`
- `profit`
- `bbWon`
- `hourlyRate`
- `bbPerHour`
- `notes`

Imports include:

- `userId`
- `importId`
- `sessionId`
- `name`
- `source`
- `status`
- `handCount`
- `rawHash`
- `rawKey`
- `importedAt`

## Version 1.0 Boundaries

The cloud backend and frontend host are deployed with SAM. The dashboard files are still plain static assets, so publishing the frontend is a separate `aws s3 sync` step after the stack is updated and `public/config.js` contains the API and Cognito outputs. v1.0 supports hand-library filters, tag performance summaries, review queue controls, similar-hand recommendations, decision breakdowns, per-decision notes/checklists, and study-plan prompts. Decision flags are rule-based; a later version can learn from reviewed decisions and user corrections.
