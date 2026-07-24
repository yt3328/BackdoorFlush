export function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": process.env.ALLOWED_ORIGIN ?? "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function eventBody(event) {
  if (!event.body) {
    return {};
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return JSON.parse(rawBody);
}

export function httpMethod(event) {
  return event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
}

export function httpPath(event) {
  return event.rawPath ?? event.path ?? "/";
}

export function queryValue(event, key) {
  return event.queryStringParameters?.[key] ?? null;
}

export function userIdFromEvent(event) {
  return (
    event.requestContext?.authorizer?.jwt?.claims?.sub ??
    event.requestContext?.authorizer?.claims?.sub ??
    process.env.DEFAULT_USER_ID ??
    "local-dev-user"
  );
}

export function handleError(error) {
  const badRequest =
    error instanceof SyntaxError ||
    error.message.includes("Invalid") ||
    error.message.includes("required") ||
    error.message.includes("expects") ||
    error.message.includes("cannot") ||
    error.message.includes("No hands");
  const notFound = error.message.toLowerCase().includes("not found");

  return jsonResponse(notFound ? 404 : badRequest ? 400 : 500, {
    error: {
      message: error.message
    }
  });
}

