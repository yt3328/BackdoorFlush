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

