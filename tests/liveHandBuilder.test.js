import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDecisionBreakdown } from "../src/core/decisionReview.js";
import { estimateHeroResult, trackedPot } from "../src/core/handReview.js";
import { buildLiveHand } from "../src/core/liveHandBuilder.js";

test("builds a live hand in the parser hand shape", () => {
  const hand = buildLiveHand({
    handNumber: "live-42",
    tableName: "Table 7",
    hero: "Tao",
    heroCards: "ah kd",
    boardCards: "As 7c 2h",
    winner: "Tao",
    wonAmount: "$84.50",
    players: [
      {
        seat: 1,
        name: "Tao",
        position: "BTN",
        stack: "300"
      },
      {
        seat: 2,
        name: "Villain",
        position: "BB",
        stack: "280"
      }
    ],
    actions: [
      {
        street: "preflop",
        player: "Tao",
        type: "raise",
        amount: "12"
      },
      {
        street: "flop",
        player: "Villain",
        type: "check"
      }
    ]
  });

  assert.equal(hand.handNumber, "live-42");
  assert.equal(hand.tableName, "Table 7");
  assert.equal(hand.hero, "Tao");
  assert.deepEqual(hand.holeCards.Tao, ["Ah", "Kd"]);
  assert.deepEqual(hand.board, ["As", "7c", "2h"]);
  assert.equal(hand.buttonSeat, 1);
  assert.equal(hand.actions[0].street, "hole-cards");
  assert.equal(hand.actions[0].type, "raises");
  assert.equal(hand.actions[1].type, "checks");
  assert.equal(hand.winnings.Tao, 84.5);
  assert.equal(hand.source, "live-entry");
});

test("adds action-only players to the seat list", () => {
  const hand = buildLiveHand({
    hero: "Hero",
    heroCards: ["Ac", "Ad"],
    players: [
      {
        seat: 1,
        name: "Hero",
        position: "SB",
        stack: 500
      },
      {
        seat: 2,
        name: "BB",
        position: "BB",
        stack: 500
      }
    ],
    actions: [
      {
        street: "turn",
        player: "CO",
        type: "bets",
        amount: 45
      }
    ]
  });

  assert.ok(hand.players.some((player) => player.name === "CO"));
  assert.equal(hand.players.length, 3);
});

test("normalizes ten-card notation in live hands", () => {
  const hand = buildLiveHand({
    hero: "Hero",
    heroCards: "10h 10d",
    boardCards: "10s 2c 3d",
    players: [
      {
        seat: 1,
        name: "Hero"
      },
      {
        seat: 2,
        name: "Villain"
      }
    ]
  });

  assert.deepEqual(hand.holeCards.Hero, ["Th", "Td"]);
  assert.deepEqual(hand.board, ["Ts", "2c", "3d"]);
});

test("stores forced bets and revealed showdown cards for live hands", () => {
  const hand = buildLiveHand({
    hero: "Hero",
    heroCards: "Ah Kd",
    boardCards: "Qs 8s 2c 4h 9d",
    winner: "Villain",
    wonAmount: "120",
    players: [
      {
        seat: 1,
        name: "Hero",
        position: "BTN",
        stack: "500"
      },
      {
        seat: 2,
        name: "SB",
        position: "SB",
        stack: "400"
      },
      {
        seat: 3,
        name: "BB",
        position: "BB",
        stack: "600"
      },
      {
        seat: 4,
        name: "Villain",
        position: "STR",
        stack: "800"
      }
    ],
    forcedBets: [
      {
        player: "SB",
        type: "small-blind",
        amount: "$2"
      },
      {
        player: "BB",
        type: "big-blind",
        amount: "$5"
      },
      {
        player: "Villain",
        type: "straddle",
        amount: "$10"
      }
    ],
    revealedHands: {
      Villain: "Qh Qd"
    },
    actions: [
      {
        street: "preflop",
        player: "Hero",
        type: "calls",
        amount: "10"
      }
    ]
  });

  assert.deepEqual(hand.holeCards.Villain, ["Qh", "Qd"]);
  assert.equal(hand.players.find((player) => player.name === "Villain").position, "STR");
  assert.equal(hand.forcedBets.length, 3);
  assert.equal(trackedPot(hand), 27);
  assert.equal(estimateHeroResult(hand), -10);
});

test("decision review pot includes blinds and straddle before the first hero action", () => {
  const hand = buildLiveHand({
    hero: "Hero",
    heroCards: "Ah Kd",
    players: [
      {
        seat: 1,
        name: "Hero",
        position: "BTN",
        stack: "500"
      },
      {
        seat: 2,
        name: "SB",
        position: "SB",
        stack: "400"
      },
      {
        seat: 3,
        name: "BB",
        position: "BB",
        stack: "600"
      },
      {
        seat: 4,
        name: "STR",
        position: "STR",
        stack: "800"
      }
    ],
    forcedBets: [
      {
        player: "SB",
        type: "small-blind",
        amount: 2
      },
      {
        player: "BB",
        type: "big-blind",
        amount: 5
      },
      {
        player: "STR",
        type: "straddle",
        amount: 10
      }
    ],
    actions: [
      {
        street: "preflop",
        player: "Hero",
        type: "raises",
        amount: 30
      }
    ]
  });
  const report = buildDecisionBreakdown(hand);

  assert.equal(report.decisions[0].potBefore, 17);
  assert.equal(report.decisions[0].potAfter, 47);
});

test("rejects duplicate visible cards", () => {
  assert.throws(
    () => buildLiveHand({
      hero: "Hero",
      heroCards: "Ah Kd",
      boardCards: "Ah 7c 2h",
      players: [
        {
          seat: 1,
          name: "Hero"
        },
        {
          seat: 2,
          name: "Villain"
        }
      ]
    }),
    /appears more than once/
  );
});
