import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateEquity, scoreBestHand } from "../src/core/equity.js";

test("scores stronger hands above weaker hands", () => {
  const flush = scoreBestHand(["Ah", "Kh", "Qh", "Jh", "2h", "7c", "9d"]);
  const pair = scoreBestHand(["As", "Ad", "Qh", "Jh", "2c", "7c", "9d"]);

  assert.ok(flush > pair);
});

test("calculates a bounded equity result", () => {
  const result = calculateEquity({
    holeCards: ["Ah", "Kh"],
    boardCards: ["As", "9h", "4c"],
    opponents: 1,
    iterations: 200
  });

  assert.equal(result.iterations, 200);
  assert.ok(result.equityPct >= 0);
  assert.ok(result.equityPct <= 100);
  assert.equal(result.wins + result.ties + result.losses, 200);
});

