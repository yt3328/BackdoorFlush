import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTagPerformance, filterHandLibrary, findSimilarHands } from "../src/core/studyTools.js";

function studyHand(overrides = {}) {
  return {
    id: "hand-1",
    importId: "import-1",
    sessionId: "session-1",
    handNumber: "study-1",
    tableName: "Main",
    hero: "Hero",
    holeCards: {
      Hero: ["Ah", "Kd"]
    },
    board: ["As", "7c", "2h", "Jh", "4s"],
    players: [
      {
        seat: 1,
        name: "Hero",
        stack: 300,
        position: "BTN"
      },
      {
        seat: 2,
        name: "Villain",
        stack: 300,
        position: "BB"
      }
    ],
    actions: [
      {
        street: "hole-cards",
        player: "Hero",
        type: "raises",
        amount: 12
      },
      {
        street: "hole-cards",
        player: "Villain",
        type: "calls",
        amount: 12
      },
      {
        street: "river",
        player: "Hero",
        type: "calls",
        amount: 70
      }
    ],
    winnings: {},
    tags: [],
    notes: "",
    reviewedAt: null,
    importedAt: "2026-08-01T12:00:00.000Z",
    ...overrides
  };
}

test("buildTagPerformance summarizes tagged hand results and review progress", () => {
  const rows = buildTagPerformance([
    studyHand({
      id: "river-loss",
      tags: ["river decision", "bad-call"]
    }),
    studyHand({
      id: "river-win",
      tags: ["river-decision"],
      winnings: {
        Hero: 220
      },
      reviewedAt: "2026-08-07T12:00:00.000Z"
    }),
    studyHand({
      id: "untagged"
    })
  ]);
  const river = rows.find((row) => row.tag === "river-decision");

  assert.equal(river.handCount, 2);
  assert.equal(river.reviewedCount, 1);
  assert.equal(river.openCount, 1);
  assert.equal(river.reviewedPct, 50);
  assert.equal(rows.some((row) => row.tag === "untagged"), false);
});

test("filterHandLibrary combines tag, status, position, result, and sort filters", () => {
  const rows = filterHandLibrary([
    studyHand({
      id: "target-loss",
      tags: ["river-decision"],
      reviewedAt: null
    }),
    studyHand({
      id: "reviewed-win",
      tags: ["river-decision"],
      winnings: {
        Hero: 200
      },
      reviewedAt: "2026-08-07T12:00:00.000Z"
    }),
    studyHand({
      id: "other-position",
      players: [
        {
          seat: 1,
          name: "Hero",
          stack: 300,
          position: "CO"
        }
      ],
      tags: ["bluff"]
    })
  ], {
    tag: "river decision",
    reviewed: "false",
    position: "BTN",
    result: "loss",
    sort: "biggest-loss"
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "target-loss");
  assert.equal(rows[0].heroPosition, "BTN");
  assert.equal(rows[0].resultBucket, "loss");
});

test("findSimilarHands ranks shared tags, position, streets, and pot size", () => {
  const rows = findSimilarHands([
    studyHand({
      id: "target",
      tags: ["river-decision", "bad-call"]
    }),
    studyHand({
      id: "close",
      handNumber: "close",
      tags: ["river-decision"],
      actions: [
        {
          street: "hole-cards",
          player: "Hero",
          type: "raises",
          amount: 10
        },
        {
          street: "river",
          player: "Hero",
          type: "calls",
          amount: 68
        }
      ]
    }),
    studyHand({
      id: "far",
      handNumber: "far",
      players: [
        {
          seat: 1,
          name: "Hero",
          stack: 300,
          position: "CO"
        }
      ],
      tags: ["value-bet"],
      actions: [
        {
          street: "flop",
          player: "Hero",
          type: "bets",
          amount: 12
        }
      ]
    })
  ], "target");

  assert.equal(rows[0].id, "close");
  assert.ok(rows[0].similarityScore > rows.at(-1).similarityScore);
  assert.ok(rows[0].similarityReasons.some((reason) => reason.includes("Shared tag")));
});
