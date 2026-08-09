import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDecisionBreakdown, buildStudyPlan, normalizeDecisionReviewPatch } from "../src/core/decisionReview.js";

function decisionHand(overrides = {}) {
  return {
    id: "hand-1",
    importId: "import-1",
    sessionId: "session-1",
    handNumber: "decision-1",
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
      },
      {
        seat: 3,
        name: "Caller",
        stack: 300,
        position: "SB"
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
        street: "hole-cards",
        player: "Caller",
        type: "calls",
        amount: 40
      },
      {
        street: "hole-cards",
        player: "Hero",
        type: "calls",
        amount: 28
      },
      {
        street: "river",
        player: "Villain",
        type: "bets",
        amount: 90
      },
      {
        street: "river",
        player: "Hero",
        type: "calls",
        amount: 90
      }
    ],
    winnings: {},
    tags: ["river-decision"],
    notes: "",
    reviewedAt: null,
    decisionReviews: {},
    importedAt: "2026-08-09T12:00:00.000Z",
    ...overrides
  };
}

test("buildDecisionBreakdown returns hero decisions with pot context and flags", () => {
  const report = buildDecisionBreakdown(decisionHand());
  const river = report.decisions.find((decision) => decision.street === "river");

  assert.equal(report.summary.decisionCount, 3);
  assert.equal(report.summary.openCount, 3);
  assert.equal(river.actionType, "calls");
  assert.equal(river.potBefore, 210);
  assert.equal(river.potOddsPct, 30);
  assert.ok(river.flags.includes("River call"));
  assert.ok(river.flags.includes("Facing bet"));
});

test("normalizeDecisionReviewPatch stores notes, checklist answers, and reviewed status", () => {
  const patch = normalizeDecisionReviewPatch({
    note: "River call is probably too optimistic.",
    checklist: {
      villainRange: "Value heavy.",
      handsBeat: "Missed spades only.",
      ignored: "not stored"
    },
    reviewed: true
  }, {}, {
    now: "2026-08-09T12:00:00.000Z"
  });

  assert.equal(patch.note, "River call is probably too optimistic.");
  assert.equal(patch.checklist.villainRange, "Value heavy.");
  assert.equal(patch.checklist.handsBeat, "Missed spades only.");
  assert.equal(patch.checklist.ignored, undefined);
  assert.equal(patch.reviewedAt, "2026-08-09T12:00:00.000Z");
});

test("buildStudyPlan creates tasks from open river decisions, flags, tags, and losses", () => {
  const plan = buildStudyPlan([
    decisionHand(),
    decisionHand({
      id: "winner",
      winnings: {
        Hero: 420
      },
      decisionReviews: {
        "river-5": {
          reviewedAt: "2026-08-09T12:00:00.000Z"
        }
      }
    })
  ]);
  const ids = plan.map((item) => item.id);

  assert.ok(ids.includes("river-decisions"));
  assert.ok(ids.includes("flagged-decisions"));
  assert.ok(ids.includes("tagged-open-hands"));
  assert.ok(ids.includes("biggest-losses"));
});
