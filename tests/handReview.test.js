import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReviewQueue, normalizeReviewPatch, normalizeTags } from "../src/core/handReview.js";

function hand(overrides = {}) {
  return {
    id: "hand-1",
    importId: "import-1",
    sessionId: "session-1",
    handNumber: "live-1",
    tableName: "Live table",
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
        type: "raises",
        amount: 40
      },
      {
        street: "river",
        player: "Hero",
        type: "calls",
        amount: 85
      }
    ],
    winnings: {},
    tags: [],
    notes: "",
    reviewedAt: null,
    ...overrides
  };
}

test("normalizeTags cleans user-entered tags", () => {
  assert.deepEqual(normalizeTags(["River Decision", "river-decision", " Bad Call "]), [
    "river-decision",
    "bad-call"
  ]);
});

test("normalizeReviewPatch preserves existing fields unless updated", () => {
  const patch = normalizeReviewPatch({
    tags: ["Bluff"],
    reviewed: true
  }, {
    notes: "Existing note"
  }, {
    now: "2026-08-07T12:00:00.000Z"
  });

  assert.deepEqual(patch.tags, ["bluff"]);
  assert.equal(patch.notes, "Existing note");
  assert.equal(patch.reviewedAt, "2026-08-07T12:00:00.000Z");
  assert.equal(patch.reviewUpdatedAt, "2026-08-07T12:00:00.000Z");
});

test("buildReviewQueue ranks tagged river decisions and supports filters", () => {
  const spots = buildReviewQueue([
    hand({
      id: "small",
      handNumber: "small",
      actions: [
        {
          street: "flop",
          player: "Hero",
          type: "checks"
        }
      ]
    }),
    hand({
      id: "river",
      handNumber: "river",
      tags: ["river-decision"],
      notes: "Tough bluff catcher."
    }),
    hand({
      id: "reviewed",
      handNumber: "reviewed",
      reviewedAt: "2026-08-07T12:00:00.000Z",
      sessionId: "session-2"
    })
  ], {
    sessionId: "session-1",
    tag: "river decision",
    reviewed: "false"
  });

  assert.equal(spots.length, 1);
  assert.equal(spots[0].id, "river");
  assert.ok(spots[0].reasons.includes("River call"));
  assert.ok(spots[0].reasons.includes("Tagged"));
});
