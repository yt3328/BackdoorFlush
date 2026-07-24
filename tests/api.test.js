import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { beforeEach, test } from "node:test";
import { createApplication } from "../src/app.js";

let application;

beforeEach(() => {
  application = createApplication({ persistencePath: null });
});

function dispatch({ method = "GET", url, body } = {}) {
  const rawBody = body ? JSON.stringify(body) : "";
  const request = Readable.from(rawBody ? [Buffer.from(rawBody)] : []);
  request.method = method;
  request.url = url;
  request.headers = {
    host: "localhost",
    "content-type": "application/json"
  };

  return new Promise((resolve) => {
    const chunks = [];
    const response = {
      statusCode: 200,
      headers: {},
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = headers;
      },
      write(chunk) {
        chunks.push(Buffer.from(chunk));
      },
      end(chunk) {
        if (chunk) {
          this.write(chunk);
        }

        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: this.statusCode,
          text,
          async json() {
            return JSON.parse(text);
          }
        });
      }
    };

    application.server.emit("request", request, response);
  });
}

test("health endpoint returns ok", async () => {
  const response = await dispatch({ url: "/api/health" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.status, "ok");
});

test("demo endpoint loads sample hands", async () => {
  const response = await dispatch({ method: "POST", url: "/api/demo" });
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.import.handCount, 5);
});

test("demo endpoint skips an already imported sample", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });
  const duplicateResponse = await dispatch({ method: "POST", url: "/api/demo" });
  const duplicatePayload = await duplicateResponse.json();
  const handsResponse = await dispatch({ url: "/api/hands" });
  const handsPayload = await handsResponse.json();

  assert.equal(duplicateResponse.status, 200);
  assert.equal(duplicatePayload.duplicate, true);
  assert.equal(duplicatePayload.skippedCount, 5);
  assert.equal(handsPayload.hands.length, 5);
});

test("returns one parsed hand by id", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });
  const handsResponse = await dispatch({ url: "/api/hands?limit=1" });
  const handsPayload = await handsResponse.json();
  const response = await dispatch({ url: `/api/hands/${handsPayload.hands[0].id}` });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.hand.id, handsPayload.hands[0].id);
});

test("deletes an import and its hands", async () => {
  const importResponse = await dispatch({ method: "POST", url: "/api/demo" });
  const importPayload = await importResponse.json();
  const deleteResponse = await dispatch({
    method: "DELETE",
    url: `/api/imports/${importPayload.import.id}`
  });
  const deletePayload = await deleteResponse.json();
  const handsResponse = await dispatch({ url: "/api/hands" });
  const handsPayload = await handsResponse.json();

  assert.equal(deleteResponse.status, 200);
  assert.equal(deletePayload.removedHands, 5);
  assert.equal(handsPayload.hands.length, 0);
});

test("clears local session state", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });
  const clearResponse = await dispatch({ method: "DELETE", url: "/api/session" });
  const clearPayload = await clearResponse.json();
  const importsResponse = await dispatch({ url: "/api/imports" });
  const importsPayload = await importsResponse.json();

  assert.equal(clearResponse.status, 200);
  assert.equal(clearPayload.removedHands, 5);
  assert.equal(importsPayload.imports.length, 0);
});

test("summary endpoint returns players after import", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });

  const response = await dispatch({ url: "/api/stats/summary?player=Tao" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.players[0].player, "Tao");
  assert.equal(payload.players[0].hands, 5);
});

test("equity endpoint returns a result", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/equity/calculate",
    body: {
      holeCards: ["Ah", "Kh"],
      boardCards: ["As", "9h", "4c"],
      opponents: 1,
      iterations: 200
    }
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.ok(payload.result.equityPct >= 0);
});

test("bankroll session endpoints create, summarize, and delete sessions", async () => {
  const createResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-24",
      location: "PokerStars",
      gameType: "cash",
      stakes: "$1/$2",
      hours: 3,
      buyIn: 400,
      cashOut: 520,
      notes: "Good value tables."
    }
  });
  const createPayload = await createResponse.json();
  const listResponse = await dispatch({ url: "/api/bankroll/sessions" });
  const listPayload = await listResponse.json();
  const summaryResponse = await dispatch({ url: "/api/bankroll/summary" });
  const summaryPayload = await summaryResponse.json();
  const deleteResponse = await dispatch({
    method: "DELETE",
    url: `/api/bankroll/sessions/${createPayload.session.id}`
  });
  const deletePayload = await deleteResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.session.profit, 120);
  assert.equal(createPayload.session.bbPerHour, 20);
  assert.equal(listPayload.sessions.length, 1);
  assert.equal(summaryPayload.summary.totalProfit, 120);
  assert.equal(summaryPayload.summary.sessionCount, 1);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletePayload.session.id, createPayload.session.id);
});

test("clearing imported hands preserves bankroll records", async () => {
  await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-24",
      location: "Casino",
      stakes: "$2/$5",
      hours: 2,
      profit: 200
    }
  });
  await dispatch({ method: "POST", url: "/api/demo" });
  await dispatch({ method: "DELETE", url: "/api/session" });
  const summaryResponse = await dispatch({ url: "/api/bankroll/summary" });
  const summaryPayload = await summaryResponse.json();

  assert.equal(summaryPayload.summary.sessionCount, 1);
  assert.equal(summaryPayload.summary.totalProfit, 200);
});
