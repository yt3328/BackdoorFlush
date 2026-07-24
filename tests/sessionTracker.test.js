import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBankrollSession,
  parseStakes,
  summarizeBankrollSessions
} from "../src/core/sessionTracker.js";

test("parseStakes reads common blind notation", () => {
  assert.deepEqual(parseStakes("$1/$2"), {
    smallBlind: 1,
    bigBlind: 2
  });
  assert.deepEqual(parseStakes("0.05/0.10"), {
    smallBlind: 0.05,
    bigBlind: 0.1
  });
});

test("buildBankrollSession calculates profit and win rates", () => {
  const session = buildBankrollSession({
    date: "2026-07-24",
    location: "PokerStars",
    gameType: "cash",
    stakes: "$1/$2",
    hours: 3,
    buyIn: 400,
    cashOut: 520
  }, {
    id: "sess_test"
  });

  assert.equal(session.id, "sess_test");
  assert.equal(session.profit, 120);
  assert.equal(session.bbWon, 60);
  assert.equal(session.hourlyRate, 40);
  assert.equal(session.bbPerHour, 20);
});

test("summarizeBankrollSessions builds bankroll chart points", () => {
  const summary = summarizeBankrollSessions([
    {
      id: "sess_a",
      date: "2026-07-20",
      location: "PokerStars",
      gameType: "cash",
      stakes: "$1/$2",
      hours: 2,
      profit: 100
    },
    {
      id: "sess_b",
      date: "2026-07-21",
      location: "Casino",
      gameType: "cash",
      stakes: "$2/$5",
      hours: 4,
      profit: -50
    }
  ]);

  assert.equal(summary.sessionCount, 2);
  assert.equal(summary.totalProfit, 50);
  assert.equal(summary.hourlyRate, 8.33);
  assert.equal(summary.bbPerHour, 6.67);
  assert.equal(summary.winRate, 50);
  assert.equal(summary.points.at(-1).cumulativeProfit, 50);
  assert.equal(summary.byLocation.length, 2);
});
