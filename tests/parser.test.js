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

test("parses currency amounts in hand histories", () => {
  const [hand] = parseHandHistory(`
PokerStars Hand #999: Hold'em No Limit ($0.05/$0.10 USD) - 2026/07/20 20:14:21 ET
Table 'Currency' 2-max Seat #1 is the button
Seat 1: Hero ($10.00 in chips)
Seat 2: Villain ($9.50 in chips)
*** HOLE CARDS ***
Dealt to Hero [Ac Ad]
Hero: raises $0.20 to $0.30
Villain: calls $0.20
*** FLOP *** [As 7d 2c]
Villain: checks
Hero: bets $0.45
Villain: folds
Hero collected $0.60 from pot
*** SUMMARY ***
Total pot $0.60
`);

  assert.equal(hand.players[0].stack, 10);
  assert.equal(hand.actions[0].amount, 0.3);
  assert.equal(hand.actions[3].amount, 0.45);
  assert.equal(hand.winnings.Hero, 0.6);
});
