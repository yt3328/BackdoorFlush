export function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "access-control-allow-origin": process.env.ALLOWED_ORIGIN ?? "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export class UnauthorizedError extends Error {
  constructor(message = "Sign in to continue.") {
    super(message);
    this.name = "UnauthorizedError";
  }
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
  const rawPath = event.rawPath ?? event.path ?? "/";
  const stage = event.requestContext?.stage;

  if (stage && stage !== "$default" && rawPath === `/${stage}`) {
    return "/";
  }

  if (stage && stage !== "$default" && rawPath.startsWith(`/${stage}/`)) {
    return rawPath.slice(stage.length + 1);
  }

  return rawPath;
}

export function queryValue(event, key) {
  return event.queryStringParameters?.[key] ?? null;
}

export function jwtClaimsFromEvent(event) {
  return (
    event.requestContext?.authorizer?.jwt?.claims ??
    event.requestContext?.authorizer?.claims ??
    null
  );
}

export function userIdFromEvent(event) {
  const userId = jwtClaimsFromEvent(event)?.sub;

  if (userId) {
    return userId;
  }

  if (process.env.REQUIRE_AUTH === "true") {
    throw new UnauthorizedError();
  }

  return process.env.DEFAULT_USER_ID ?? "local-dev-user";
}

export function handleError(error) {
  if (error instanceof UnauthorizedError) {
    return jsonResponse(401, {
      error: {
        message: error.message
      }
    });
  }

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
