import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { equity, leaks, parseImport, api } from "../src/aws/lambdaHandlers.js";
import { userIdFromEvent } from "../src/aws/http.js";

const sample = readFileSync(new URL("../samples/pokerstars-small.txt", import.meta.url), "utf8");

function event(body) {
  return {
    body: JSON.stringify(body)
  };
}

test("parseImport Lambda handler parses raw hand-history text", async () => {
  const response = await parseImport(event({ rawText: sample }));
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.handCount, 5);
});

test("equity Lambda handler returns a bounded equity result", async () => {
  const response = await equity(event({
    holeCards: ["Ah", "Kh"],
    boardCards: ["As", "9h", "4c"],
    opponents: 1,
    iterations: 200
  }));
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.ok(payload.result.equityPct >= 0);
  assert.ok(payload.result.equityPct <= 100);
});

test("leaks Lambda handler summarizes hands passed in the request", async () => {
  const parsedResponse = await parseImport(event({ rawText: sample }));
  const parsedPayload = JSON.parse(parsedResponse.body);
  const response = await leaks(event({ hands: parsedPayload.hands }));
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.ok(payload.players.length > 0);
  assert.ok(payload.leaks.length > 0);
});

test("API Lambda health route does not need AWS clients", async () => {
  const response = await api({
    rawPath: "/api/health",
    requestContext: {
      http: {
        method: "GET"
      }
    }
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.runtime, "aws-lambda");
});

test("API Lambda strips HTTP API stage prefix from routes", async () => {
  const response = await api({
    rawPath: "/dev/api/health",
    requestContext: {
      stage: "dev",
      http: {
        method: "GET"
      }
    }
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.service, "backdoor-flush");
});

test("AWS user id comes from Cognito JWT claims when present", () => {
  const userId = userIdFromEvent({
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: "user-sub-123"
          }
        }
      }
    }
  });

  assert.equal(userId, "user-sub-123");
});

test("AWS user id rejects anonymous cloud requests when auth is required", () => {
  const previousRequireAuth = process.env.REQUIRE_AUTH;
  process.env.REQUIRE_AUTH = "true";

  try {
    assert.throws(() => userIdFromEvent({}), /Sign in to continue/);
  } finally {
    if (previousRequireAuth === undefined) {
      delete process.env.REQUIRE_AUTH;
    } else {
      process.env.REQUIRE_AUTH = previousRequireAuth;
    }
  }
});
