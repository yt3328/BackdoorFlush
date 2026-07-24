import { calculateEquity } from "../core/equity.js";
import { parseHandHistory } from "../core/handParser.js";
import { detectLeaks, summarizeHands } from "../core/stats.js";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function body(event) {
  return event.body ? JSON.parse(event.body) : {};
}

export async function parseImport(event) {
  const payload = body(event);
  const hands = parseHandHistory(payload.rawText);

  return response(200, {
    handCount: hands.length,
    hands
  });
}

export async function equity(event) {
  return response(200, {
    result: calculateEquity(body(event))
  });
}

export async function leaks(event) {
  const payload = body(event);
  const summary = summarizeHands(payload.hands ?? [], payload.player);

  return response(200, {
    players: summary,
    leaks: detectLeaks(summary)
  });
}

