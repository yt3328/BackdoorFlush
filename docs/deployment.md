# Deployment

Version 0.5 adds cloud sign-in, static frontend hosting, bankroll sessions, and the visual hand replayer, but local mode still works with `npm start`.

## What Deploys

The SAM template creates:

- HTTP API Gateway
- Cognito user pool, Hosted UI domain, and web app client
- API Lambda for `/api/*`
- SQS queue for parse jobs
- Parse worker Lambda
- S3 bucket for raw hand-history text
- DynamoDB imports table
- DynamoDB hands table
- DynamoDB bankroll sessions table
- Private S3 bucket for the dashboard
- CloudFront distribution for the dashboard
- CloudWatch alarms for Lambda errors

## Prerequisites

- AWS account
- AWS CLI v2
- AWS SAM CLI
- Node.js 20 or newer
- Local AWS profile configured through SSO or IAM

## Install Dependencies

```bash
npm install
```

## Build

```bash
sam build --template-file infra/template.yaml
```

## Deploy

```bash
sam deploy --guided --template-file infra/template.yaml
```

Suggested guided values:

```text
Stack Name: poker-felt-scope-dev
AWS Region: us-east-1
Parameter StageName: dev
Parameter AllowedOrigin: *
Parameter DefaultUserId: local-dev-user
Parameter RequireAuth: true
Confirm changes before deploy: Y
Allow SAM CLI IAM role creation: Y
Save arguments to configuration file: Y
```

After deploy, SAM prints outputs for the API, Cognito, S3, and CloudFront.

## Configure The Frontend

Update `public/config.js` with the deployed stack outputs:

```js
window.POKER_FELT_SCOPE_API_BASE = "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev";
window.POKER_FELT_SCOPE_AUTH = {
  clientId: "your-cognito-user-pool-client-id",
  hostedUiDomain: "https://your-cognito-domain.auth.us-east-1.amazoncognito.com",
  redirectUri: window.location.origin,
  logoutUri: window.location.origin
};
```

For local frontend testing against the deployed API, run:

```bash
npm start
```

Open:

```text
http://localhost:3400
```

The Cognito app client allows both `http://localhost:3400` and the CloudFront URL as callback/logout URLs.

## Publish The Dashboard

Copy the static frontend files to the `FrontendBucketName` output:

```bash
aws s3 sync public/ s3://your-frontend-bucket-name --delete \
  --profile poker-felt-scope \
  --region us-east-1
```

Then refresh CloudFront using the `FrontendDistributionId` output:

```bash
aws cloudfront create-invalidation \
  --distribution-id your-cloudfront-distribution-id \
  --paths "/*" \
  --profile poker-felt-scope
```

Open the `FrontendUrl` output. The first user can create an account through Cognito's Hosted UI and then return to the dashboard.

## Protected API Calls

In AWS mode, routes under `/api/*` require a Cognito ID token, except `GET /api/health`. The browser handles this after sign-in by sending:

```http
Authorization: Bearer <id-token>
```

Each signed-in user's Cognito `sub` becomes the DynamoDB `userId`, so different users do not share imported hands.

## Tear Down

When you are done testing AWS, remove the stack:

```bash
sam delete --stack-name poker-felt-scope-dev --profile poker-felt-scope --region us-east-1
```

This prevents small idle charges from lingering.
