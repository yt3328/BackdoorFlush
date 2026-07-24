import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseHandHistory } from "../src/core/handParser.js";

const sample = readFileSync(new URL("../samples/pokerstars-small.txt", import.meta.url), "utf8");

test("parses a PokerStars-style hand history file", () => {
  const hands = parseHandHistory(sample);

  assert.equal(hands.length, 5);
  assert.equal(hands[0].hero, "Tao");
  assert.deepEqual(hands[0].holeCards.Tao, ["Ah", "Kh"]);
  assert.deepEqual(hands[0].board, ["As", "9h", "4c", "2d"]);
  assert.equal(hands[0].actions.some((action) => action.player === "Tao" && action.type === "raises"), true);
});

test("rejects empty input", () => {
  assert.throws(() => parseHandHistory(""), /rawText is required/);
});

