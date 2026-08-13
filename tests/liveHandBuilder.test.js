import assert from "node:assert/strict";
import { test } from "node:test";
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
