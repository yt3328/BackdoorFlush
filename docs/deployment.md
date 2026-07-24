# Deployment

Version 0.3 adds an AWS backend, but local mode still works with `npm start`.

## What Deploys

The SAM template creates:

- HTTP API Gateway
- API Lambda for `/api/*`
- SQS queue for parse jobs
- Parse worker Lambda
- S3 bucket for raw hand-history text
- DynamoDB imports table
- DynamoDB hands table
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
Confirm changes before deploy: Y
Allow SAM CLI IAM role creation: Y
Save arguments to configuration file: Y
```

After deploy, SAM prints an `ApiUrl` output. Copy that value.

## Point The Frontend At AWS

For local frontend testing against the deployed API, update `public/config.js`:

```js
window.POKER_FELT_SCOPE_API_BASE = "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev";
```

Then run:

```bash
npm start
```

Open:

```text
http://localhost:3400
```

## Later Static Hosting

The current frontend can be hosted separately with Amplify Hosting, S3 + CloudFront, or another static host. When hosted separately, set `public/config.js` to the deployed API URL before publishing the static files.

## Tear Down

When you are done testing AWS, remove the stack:

```bash
sam delete --stack-name poker-felt-scope-dev
```

This prevents small idle charges from lingering.

