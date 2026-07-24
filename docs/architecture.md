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
  API --> EquityLambda["Equity Lambda"]
  ImportLambda --> S3["S3 raw uploads"]
  ImportLambda --> Queue["SQS parse queue"]
  Queue --> Parser["Parser worker"]
  Parser --> Dynamo["DynamoDB hands table"]
  ReadLambda --> Dynamo
  EquityLambda --> Model["Local calculator or SageMaker endpoint"]
```

## Local Version

- One Node process serves static files and API routes.
- A JSON file stores imports and parsed hands.
- The parser, stats engine, and equity calculator are plain modules with tests.

## AWS Version

- S3 stores raw hand-history uploads.
- CloudFront serves the static dashboard from a private S3 bucket.
- Cognito signs users in through the Hosted UI.
- API Gateway fronts the public API.
- API Gateway validates Cognito JWTs before private routes reach Lambda.
- Lambda handles imports, reads, stats, and equity checks.
- SQS buffers parse jobs so large uploads do not block requests.
- DynamoDB stores parsed hand records keyed by the signed-in user's Cognito subject.
- CloudWatch alarms track API and parse worker errors.
- SageMaker can be added later for recommendation or clustering work.

## Data Shape

Raw uploads are kept separate from parsed hands. That makes parser changes easier: old uploads can be reprocessed when the parser learns a new format.

Parsed hands should eventually include:

- `userId`
- `importId`
- `handNumber`
- `tableName`
- `players`
- `hero`
- `holeCards`
- `board`
- `actions`
- `winnings`
- `createdAt`

## Version 0.4 Boundaries

The cloud backend and frontend host are deployed with SAM. The dashboard files are still plain static assets, so publishing the frontend is a separate `aws s3 sync` step after the stack is updated and `public/config.js` contains the API and Cognito outputs.
