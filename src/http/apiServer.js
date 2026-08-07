import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseHandHistory } from "../core/handParser.js";
import { calculateEquity } from "../core/equity.js";
import { detectLeaks, summarizeHands } from "../core/stats.js";
import { readJsonBody, sendError, sendJson } from "./respond.js";
import { serveStatic } from "./staticFiles.js";

const samplePath = fileURLToPath(new URL("../../samples/pokerstars-small.txt", import.meta.url));

function methodAllowed(request, response, expected) {
  if (request.method !== expected) {
    sendError(response, 405, `Use ${expected} for this endpoint.`);
    return false;
  }

  return true;
}

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

function bankrollSessionIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/bankroll\/sessions\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function createImport(request, response, store) {
  const payload = await readJsonBody(request);
  const rawText = payload.rawText;
  const hands = parseHandHistory(rawText);
  const result = store.addImport({
    name: payload.name,
    source: payload.source,
    rawText,
    hands,
    sessionId: payload.sessionId
  });

  sendJson(response, result.duplicate ? 200 : 201, {
    import: result.import,
    handPreview: result.hands.slice(0, 3),
    duplicate: Boolean(result.duplicate),
    skippedCount: result.skippedCount ?? 0
  });
}

export function createHttpServer({ store }) {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

      if (!requestUrl.pathname.startsWith("/api")) {
        await serveStatic(request, response);
        return;
      }

      if (requestUrl.pathname === "/api/health") {
        if (!methodAllowed(request, response, "GET")) {
          return;
        }

        sendJson(response, 200, {
          status: "ok",
          service: "poker-felt-scope",
          generatedAt: new Date().toISOString()
        });
        return;
      }

      if (requestUrl.pathname === "/api/imports" && request.method === "GET") {
        sendJson(response, 200, {
          imports: store.listImports()
        });
        return;
      }

      if (requestUrl.pathname === "/api/imports" && request.method === "POST") {
        await createImport(request, response, store);
        return;
      }

      if (requestUrl.pathname === "/api/live-hands" && request.method === "POST") {
        const payload = await readJsonBody(request);
        sendJson(response, 201, store.createLiveHand(payload));
        return;
      }

      const importId = importIdFromPath(requestUrl.pathname);
      if (importId && request.method === "DELETE") {
        sendJson(response, 200, store.deleteImport(importId));
        return;
      }

      if (importId && request.method === "PATCH") {
        const payload = await readJsonBody(request);
        sendJson(response, 200, store.updateImportSession(importId, payload.sessionId));
        return;
      }

      if (requestUrl.pathname === "/api/demo") {
        if (!methodAllowed(request, response, "POST")) {
          return;
        }

        const rawText = readFileSync(samplePath, "utf8");
        const hands = parseHandHistory(rawText);
        const result = store.addImport({
          name: "Small table sample",
          source: "sample",
          rawText,
          hands,
          sessionId: requestUrl.searchParams.get("sessionId")
        });

        sendJson(response, result.duplicate ? 200 : 201, {
          import: result.import,
          handPreview: result.hands.slice(0, 3),
          duplicate: Boolean(result.duplicate),
          skippedCount: result.skippedCount ?? 0
        });
        return;
      }

      if (requestUrl.pathname === "/api/hands") {
        if (!methodAllowed(request, response, "GET")) {
          return;
        }

        sendJson(response, 200, {
          hands: store.listHands({
            limit: parseLimit(requestUrl.searchParams.get("limit")),
            player: requestUrl.searchParams.get("player"),
            position: requestUrl.searchParams.get("position"),
            importId: requestUrl.searchParams.get("importId"),
            sessionId: requestUrl.searchParams.get("sessionId")
          })
        });
        return;
      }

      const handId = handIdFromPath(requestUrl.pathname);
      if (handId && request.method === "GET") {
        const hand = store.getHand(handId);
        if (!hand) {
          sendError(response, 404, "Hand not found.");
          return;
        }

        sendJson(response, 200, { hand });
        return;
      }

      if (requestUrl.pathname === "/api/stats/summary") {
        if (!methodAllowed(request, response, "GET")) {
          return;
        }

        sendJson(response, 200, {
          players: summarizeHands(
            store.listHands({ limit: 500 }),
            requestUrl.searchParams.get("player")
          )
        });
        return;
      }

      if (requestUrl.pathname === "/api/leaks") {
        if (!methodAllowed(request, response, "GET")) {
          return;
        }

        const summary = summarizeHands(
          store.listHands({ limit: 500 }),
          requestUrl.searchParams.get("player")
        );

        sendJson(response, 200, {
          leaks: detectLeaks(summary)
        });
        return;
      }

      if (requestUrl.pathname === "/api/bankroll/sessions" && request.method === "GET") {
        sendJson(response, 200, {
          sessions: store.listBankrollSessions()
        });
        return;
      }

      if (requestUrl.pathname === "/api/bankroll/sessions" && request.method === "POST") {
        const payload = await readJsonBody(request);
        sendJson(response, 201, {
          session: store.createBankrollSession(payload)
        });
        return;
      }

      const bankrollSessionId = bankrollSessionIdFromPath(requestUrl.pathname);
      if (bankrollSessionId && request.method === "GET") {
        const detail = store.bankrollSessionDetail(bankrollSessionId);

        if (!detail) {
          sendError(response, 404, "Bankroll session not found.");
          return;
        }

        sendJson(response, 200, detail);
        return;
      }

      if (bankrollSessionId && request.method === "PATCH") {
        const payload = await readJsonBody(request);
        sendJson(response, 200, {
          session: store.updateBankrollSession(bankrollSessionId, payload)
        });
        return;
      }

      if (bankrollSessionId && request.method === "DELETE") {
        sendJson(response, 200, store.deleteBankrollSession(bankrollSessionId));
        return;
      }

      if (requestUrl.pathname === "/api/bankroll/summary") {
        if (!methodAllowed(request, response, "GET")) {
          return;
        }

        sendJson(response, 200, {
          summary: store.bankrollSummary()
        });
        return;
      }

      if (requestUrl.pathname === "/api/session") {
        if (!methodAllowed(request, response, "DELETE")) {
          return;
        }

        sendJson(response, 200, store.clear());
        return;
      }

      if (requestUrl.pathname === "/api/equity/calculate") {
        if (!methodAllowed(request, response, "POST")) {
          return;
        }

        const payload = await readJsonBody(request);
        sendJson(response, 200, {
          result: calculateEquity(payload)
        });
        return;
      }

      sendError(response, 404, "Endpoint not found.");
    } catch (error) {
      const badRequest =
        error instanceof SyntaxError ||
        error.message.includes("Invalid") ||
        error.message.includes("At least") ||
        error.message.includes("appears") ||
        error.message.includes("required") ||
        error.message.includes("expects") ||
        error.message.includes("cannot") ||
        error.message.includes("No hands");
      const notFound = error.message.includes("not found");
      sendError(response, notFound ? 404 : badRequest ? 400 : 500, error.message);
    }
  });
}
