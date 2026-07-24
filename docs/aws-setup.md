# AWS Setup

This project does not need AWS root credentials in the app or in chat.

## Account Checklist

1. Turn on MFA for the AWS root user.
2. Create a monthly AWS Budget alert before deploying.
3. Use AWS IAM Identity Center or an IAM user for CLI access.
4. Keep the root user for account administration only.

## Recommended Local Access

Use AWS CLI v2 with SSO/IAM Identity Center when possible:

```bash
aws configure sso
aws sso login --profile poker-felt-scope
```

Then deploy with:

```bash
AWS_PROFILE=poker-felt-scope sam deploy --guided --template-file infra/template.yaml
```

If you choose access keys instead, create them for an IAM user, not the root user, and store them only in your local AWS config.

## Budget

Start with a small budget:

```text
Monthly budget: $10 or $20
Alerts: 50%, 80%, 100%
```

The v0.3 backend uses serverless services: API Gateway, Lambda, S3, SQS, DynamoDB, and CloudWatch. Light development use should be inexpensive, but the budget alert is still worth setting up first.

