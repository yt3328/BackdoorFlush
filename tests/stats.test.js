import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseHandHistory } from "../src/core/handParser.js";
import { detectLeaks, summarizeHands } from "../src/core/stats.js";

const sample = readFileSync(new URL("../samples/pokerstars-small.txt", import.meta.url), "utf8");

test("summarizes player frequencies", () => {
  const hands = parseHandHistory(sample);
  const summary = summarizeHands(hands, "Tao");
  const tao = summary[0];

  assert.equal(tao.player, "Tao");
  assert.equal(tao.hands, 5);
  assert.equal(tao.vpipPct, 100);
  assert.equal(tao.pfrPct, 60);
  assert.ok(tao.byPosition.BTN);
});

test("creates review signals for small samples", () => {
  const hands = parseHandHistory(sample);
  const leaks = detectLeaks(summarizeHands(hands));

  assert.ok(leaks.length > 0);
  assert.ok(leaks.some((leak) => leak.title === "Need more hands"));
});

