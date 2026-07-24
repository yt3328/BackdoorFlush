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

async function createImport(request, response, store) {
  const payload = await readJsonBody(request);
  const rawText = payload.rawText;
  const hands = parseHandHistory(rawText);
  const result = store.addImport({
    name: payload.name,
    source: payload.source,
    rawText,
    hands
  });

  sendJson(response, 201, {
    import: result.import,
    handPreview: result.hands.slice(0, 3)
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
          hands
        });

        sendJson(response, 201, {
          import: result.import,
          handPreview: result.hands.slice(0, 3)
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
            position: requestUrl.searchParams.get("position")
          })
        });
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
        error.message.includes("required") ||
        error.message.includes("expects") ||
        error.message.includes("cannot") ||
        error.message.includes("No hands");
      sendError(response, badRequest ? 400 : 500, error.message);
    }
  });
}
