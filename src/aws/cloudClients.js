let cachedClients;

async function loadAwsSdk() {
  const [
    dynamodb,
    documentClient,
    s3,
    sqs
  ] = await Promise.all([
    import("@aws-sdk/client-dynamodb"),
    import("@aws-sdk/lib-dynamodb"),
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/client-sqs")
  ]);

  return {
    ...dynamodb,
    ...documentClient,
    ...s3,
    ...sqs
  };
}

export async function awsClients() {
  if (cachedClients) {
    return cachedClients;
  }

  const sdk = await loadAwsSdk();
  const dynamo = sdk.DynamoDBDocumentClient.from(new sdk.DynamoDBClient({}), {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
  const s3 = new sdk.S3Client({});
  const sqs = new sdk.SQSClient({});

  cachedClients = {
    dynamo,
    s3,
    sqs,
    sdk
  };

  return cachedClients;
}
