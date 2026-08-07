import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseHandHistory } from "../src/core/handParser.js";
import { buildSessionDetail, estimateHeroResult } from "../src/core/sessionInsights.js";

const sample = readFileSync(new URL("../samples/pokerstars-small.txt", import.meta.url), "utf8");

test("estimates hero result from winnings minus committed chips", () => {
  const result = estimateHeroResult({
    hero: "Tao",
    actions: [
      {
        player: "Tao",
        amount: 0.05
      },
      {
        player: "Villain",
        amount: 0.1
      },
      {
        player: "Tao",
        amount: 0.25
      }
    ],
    winnings: {
      Tao: 1.2
    }
  });

  assert.equal(result, 0.9);
});

test("builds session detail from linked imports and hands", () => {
  const hands = parseHandHistory(sample).map((hand, index) => ({
    ...hand,
    id: `hand-${index + 1}`,
    importId: "import-1",
    sessionId: "session-1"
  }));
  const detail = buildSessionDetail({
    session: {
      id: "session-1",
      sessionId: "session-1",
      date: "2026-07-24",
      location: "PokerStars",
      stakes: "$0.05/$0.10",
      profit: 14
    },
    imports: [
      {
        id: "import-1",
        sessionId: "session-1",
        handCount: hands.length
      }
    ],
    hands
  });

  assert.equal(detail.totals.importCount, 1);
  assert.equal(detail.totals.handCount, 5);
  assert.equal(detail.hands.length, 5);
  assert.ok(detail.players.some((player) => player.player === "Tao"));
  assert.ok(detail.biggestWins.length + detail.biggestLosses.length > 0);
});
