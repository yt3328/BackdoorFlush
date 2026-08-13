import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { calculateEquity } from "../core/equity.js";
import { parseHandHistory } from "../core/handParser.js";
import { detectLeaks, summarizeHands } from "../core/stats.js";
import { createCloudHandStore } from "./cloudStore.js";
import {
  eventBody,
  handleError,
  httpMethod,
  httpPath,
  jsonResponse,
  queryValue,
  userIdFromEvent
} from "./http.js";

const samplePath = fileURLToPath(new URL("../../samples/pokerstars-small.txt", import.meta.url));

function parseLimit(value) {
  const limit = Number.parseInt(value ?? "100", 10);
  return Math.max(1, Math.min(500, Number.isFinite(limit) ? limit : 100));
}

function importIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/imports\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function handIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/hands\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function handDecisionPath(pathname) {
  const match = pathname.match(/^\/api\/hands\/([^/]+)\/decisions(?:\/([^/]+))?$/);
  return match ? {
    handId: decodeURIComponent(match[1]),
    decisionId: match[2] ? decodeURIComponent(match[2]) : null
  } : null;
}

function similarHandIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/hands\/([^/]+)\/similar$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function bankrollSessionIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/bankroll\/sessions\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function bankrollTransactionIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/bankroll\/transactions\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function reviewedParam(value) {
  return value === "true" || value === "false" ? value : null;
}

async function createImportFromText({ store, payload }) {
  const result = await store.createQueuedImport({
    name: payload.name,
    source: payload.source,
    rawText: payload.rawText,
    sessionId: payload.sessionId
  });

  return jsonResponse(result.duplicate ? 200 : 202, {
    import: result.import,
    handPreview: result.hands.slice(0, 3),
    duplicate: Boolean(result.duplicate),
    skippedCount: result.skippedCount ?? 0
  });
}

export async function parseImport(event) {
  const payload = eventBody(event);
  const hands = parseHandHistory(payload.rawText);

  return jsonResponse(200, {
    handCount: hands.length,
    hands
  });
}

export async function equity(event) {
  return jsonResponse(200, {
    result: calculateEquity(eventBody(event))
  });
}

export async function leaks(event) {
  const payload = eventBody(event);
  const summary = summarizeHands(payload.hands ?? [], payload.player);

  return jsonResponse(200, {
    players: summary,
    leaks: detectLeaks(summary)
  });
}

export async function api(event) {
  try {
    const method = httpMethod(event);
    const pathname = httpPath(event);

    if (method === "OPTIONS") {
      return jsonResponse(204, {});
    }

    if (pathname === "/api/health" && method === "GET") {
      return jsonResponse(200, {
        status: "ok",
        service: "backdoor-flush",
        runtime: "aws-lambda",
        generatedAt: new Date().toISOString()
      });
    }

    const store = await createCloudHandStore({
      userId: userIdFromEvent(event)
    });

    if (pathname === "/api/imports" && method === "GET") {
      return jsonResponse(200, {
        imports: await store.listImports()
      });
    }

    if (pathname === "/api/imports" && method === "POST") {
      return createImportFromText({
        store,
        payload: eventBody(event)
      });
    }

    if (pathname === "/api/live-hands" && method === "POST") {
      return jsonResponse(201, await store.createLiveHand(eventBody(event)));
    }

    const importId = importIdFromPath(pathname);
    if (importId && method === "DELETE") {
      return jsonResponse(200, await store.deleteImport(importId));
    }

    if (importId && method === "PATCH") {
      return jsonResponse(200, await store.updateImportSession(importId, eventBody(event).sessionId));
    }

    if (pathname === "/api/demo" && method === "POST") {
      return createImportFromText({
        store,
        payload: {
          name: "Small table sample",
          source: "sample",
          rawText: readFileSync(samplePath, "utf8"),
          sessionId: queryValue(event, "sessionId")
        }
      });
    }

    if (pathname === "/api/hands" && method === "GET") {
      return jsonResponse(200, {
        hands: await store.listHands({
          limit: parseLimit(queryValue(event, "limit")),
          player: queryValue(event, "player"),
          position: queryValue(event, "position"),
          importId: queryValue(event, "importId"),
          sessionId: queryValue(event, "sessionId")
        })
      });
    }

    const handId = handIdFromPath(pathname);
    if (handId && method === "GET") {
      const hand = await store.getHand(handId);

      if (!hand) {
        return jsonResponse(404, {
          error: {
            message: "Hand not found."
          }
        });
      }

      return jsonResponse(200, { hand });
    }

    if (handId && method === "PATCH") {
      return jsonResponse(200, {
        hand: await store.updateHandReview(handId, eventBody(event))
      });
    }

    const decisionPath = handDecisionPath(pathname);
    if (decisionPath && method === "GET" && !decisionPath.decisionId) {
      return jsonResponse(200, await store.decisionReview(decisionPath.handId));
    }

    if (decisionPath && method === "PATCH" && decisionPath.decisionId) {
      return jsonResponse(200, await store.updateDecisionReview(
        decisionPath.handId,
        decisionPath.decisionId,
        eventBody(event)
      ));
    }

    if (pathname === "/api/stats/summary" && method === "GET") {
      return jsonResponse(200, {
        players: summarizeHands(
          await store.listHands({ limit: 500 }),
          queryValue(event, "player")
        )
      });
    }

    if (pathname === "/api/leaks" && method === "GET") {
      const summary = summarizeHands(
        await store.listHands({ limit: 500 }),
        queryValue(event, "player")
      );

      return jsonResponse(200, {
        leaks: detectLeaks(summary)
      });
    }

    if (pathname === "/api/review/spots" && method === "GET") {
      return jsonResponse(200, {
        spots: await store.reviewQueue({
          limit: queryValue(event, "limit"),
          sessionId: queryValue(event, "sessionId"),
          tag: queryValue(event, "tag"),
          reviewed: reviewedParam(queryValue(event, "reviewed")),
          sort: queryValue(event, "sort")
        })
      });
    }

    if (pathname === "/api/study/tags" && method === "GET") {
      return jsonResponse(200, {
        tags: await store.tagPerformance()
      });
    }

    if (pathname === "/api/study/library" && method === "GET") {
      return jsonResponse(200, {
        hands: await store.handLibrary({
          limit: parseLimit(queryValue(event, "limit")),
          sessionId: queryValue(event, "sessionId"),
          tag: queryValue(event, "tag"),
          reviewed: reviewedParam(queryValue(event, "reviewed")),
          position: queryValue(event, "position"),
          result: queryValue(event, "result"),
          player: queryValue(event, "player"),
          search: queryValue(event, "search"),
          sort: queryValue(event, "sort")
        })
      });
    }

    if (pathname === "/api/study/plan" && method === "GET") {
      return jsonResponse(200, {
        items: await store.studyPlan()
      });
    }

    const similarHandId = similarHandIdFromPath(pathname);
    if (similarHandId && method === "GET") {
      return jsonResponse(200, {
        hands: await store.similarHands(similarHandId, {
          limit: queryValue(event, "limit")
        })
      });
    }

    if (pathname === "/api/bankroll/sessions" && method === "GET") {
      return jsonResponse(200, {
        sessions: await store.listBankrollSessions()
      });
    }

    if (pathname === "/api/bankroll/sessions" && method === "POST") {
      return jsonResponse(201, {
        session: await store.createBankrollSession(eventBody(event))
      });
    }

    if (pathname === "/api/bankroll/imports/preview" && method === "POST") {
      return jsonResponse(200, await store.previewBankrollImport(eventBody(event)));
    }

    if (pathname === "/api/bankroll/imports" && method === "POST") {
      const result = await store.importBankrollSessions(eventBody(event));
      return jsonResponse(result.importedCount > 0 || result.importedTransactionCount > 0 ? 201 : 200, result);
    }

    if (pathname === "/api/bankroll/transactions" && method === "GET") {
      return jsonResponse(200, {
        transactions: await store.listBankrollTransactions()
      });
    }

    if (pathname === "/api/bankroll/transactions" && method === "POST") {
      return jsonResponse(201, {
        transaction: await store.createBankrollTransaction(eventBody(event))
      });
    }

    if (pathname === "/api/bankroll/transactions/summary" && method === "GET") {
      return jsonResponse(200, {
        summary: await store.bankrollTransactionSummary()
      });
    }

    const bankrollTransactionId = bankrollTransactionIdFromPath(pathname);
    if (bankrollTransactionId && method === "PATCH") {
      return jsonResponse(200, {
        transaction: await store.updateBankrollTransaction(bankrollTransactionId, eventBody(event))
      });
    }

    if (bankrollTransactionId && method === "DELETE") {
      return jsonResponse(200, await store.deleteBankrollTransaction(bankrollTransactionId));
    }

    const bankrollSessionId = bankrollSessionIdFromPath(pathname);
    if (bankrollSessionId && method === "GET") {
      const detail = await store.bankrollSessionDetail(bankrollSessionId);

      if (!detail) {
        return jsonResponse(404, {
          error: {
            message: "Bankroll session not found."
          }
        });
      }

      return jsonResponse(200, detail);
    }

    if (bankrollSessionId && method === "PATCH") {
      return jsonResponse(200, {
        session: await store.updateBankrollSession(bankrollSessionId, eventBody(event))
      });
    }

    if (bankrollSessionId && method === "DELETE") {
      return jsonResponse(200, await store.deleteBankrollSession(bankrollSessionId));
    }

    if (pathname === "/api/bankroll/summary" && method === "GET") {
      return jsonResponse(200, {
        summary: await store.bankrollSummary()
      });
    }

    if (pathname === "/api/export/workspace" && method === "GET") {
      return jsonResponse(200, await store.workspaceExport({
        mode: "cloud"
      }));
    }

    if (pathname === "/api/session" && method === "DELETE") {
      return jsonResponse(200, await store.clear());
    }

    if (pathname === "/api/equity/calculate" && method === "POST") {
      return equity(event);
    }

    return jsonResponse(404, {
      error: {
        message: "Endpoint not found."
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function processParseQueue(event) {
  const results = [];

  for (const record of event.Records ?? []) {
    const message = JSON.parse(record.body);
    const store = await createCloudHandStore({
      userId: message.userId
    });

    try {
      const rawText = await store.readRawImport(message.rawKey);
      const hands = parseHandHistory(rawText);
      const result = await store.saveParsedImport({
        importId: message.importId,
        rawText,
        hands,
        sessionId: message.sessionId
      });
      results.push({
        importId: message.importId,
        status: "ready",
        handCount: result.handCount
      });
    } catch (error) {
      await store.markImportFailed(message.importId, error.message);
      throw error;
    }
  }

  return {
    results
  };
}
