import { estimateHeroResult, normalizeTags, trackedPot } from "./handReview.js";

const decisionActionTypes = new Set(["checks", "calls", "bets", "raises", "folds"]);
const checklistPromptConfig = [
  {
    id: "villainRange",
    label: "What range did villain represent?"
  },
  {
    id: "handsBeat",
    label: "What hands do I beat?"
  },
  {
    id: "worseHandsCall",
    label: "What worse hands call?"
  },
  {
    id: "betterHandsFold",
    label: "What better hands fold?"
  },
  {
    id: "nextAdjustment",
    label: "What will I do differently next time?"
  }
];

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function cleanText(value, limit = 1800) {
  return String(value ?? "").trim().slice(0, limit);
}

function amount(value) {
  return Number(value) || 0;
}

function actionAmount(action) {
  return amount(action?.amount);
}

function committedBefore(hand, player, actionIndex) {
  return (hand.actions ?? [])
    .slice(0, actionIndex)
    .filter((action) => action.player === player)
    .reduce((sum, action) => sum + actionAmount(action), 0);
}

function potBefore(hand, actionIndex) {
  return (hand.actions ?? [])
    .slice(0, actionIndex)
    .reduce((sum, action) => sum + actionAmount(action), 0);
}

function activePlayersBefore(hand, actionIndex) {
  const activePlayers = new Set((hand.players ?? []).map((player) => player.name));

  for (const action of (hand.actions ?? []).slice(0, actionIndex)) {
    if (action.type === "folds") {
      activePlayers.delete(action.player);
    }
  }

  return activePlayers.size;
}

function heroSeat(hand) {
  return (hand.players ?? []).find((player) => player.name === hand.hero) ?? null;
}

function previousAggression(hand, actionIndex, street) {
  return [...(hand.actions ?? []).slice(0, actionIndex)]
    .reverse()
    .find((action) => (
      action.street === street &&
      action.player !== hand.hero &&
      ["bets", "raises"].includes(action.type)
    )) ?? null;
}

function streetRaiseCount(hand, street) {
  return (hand.actions ?? []).filter((action) => action.street === street && action.type === "raises").length;
}

function flaggedReasons({ hand, action, actionIndex, pot, decisionAmount, spr, activePlayers, previousAggressor }) {
  const flags = [];
  const betRatio = pot > 0 ? decisionAmount / pot : 0;

  if (action.street === "river" && action.type === "calls" && decisionAmount > 0) {
    flags.push("River call");
  }

  if (previousAggressor && ["calls", "folds", "raises"].includes(action.type)) {
    flags.push(`Facing ${previousAggressor.type.replace(/s$/, "")}`);
  }

  if (activePlayers > 2) {
    flags.push("Multiway");
  }

  if (action.type === "calls" && betRatio >= 0.55) {
    flags.push("Large call");
  }

  if (["bets", "raises"].includes(action.type) && betRatio >= 0.75) {
    flags.push("Large bet size");
  } else if (["bets", "raises"].includes(action.type) && pot > 0 && betRatio <= 0.33) {
    flags.push("Small bet size");
  }

  if (spr !== null && spr <= 2) {
    flags.push("Low SPR");
  }

  if (action.street === "hole-cards" && streetRaiseCount(hand, "hole-cards") >= 2) {
    flags.push("3-bet pot");
  }

  return [...new Set(flags)];
}

function reviewForDecision(hand, decisionId) {
  const saved = hand.decisionReviews?.[decisionId] ?? {};
  const checklist = {};

  for (const prompt of checklistPromptConfig) {
    checklist[prompt.id] = cleanText(saved.checklist?.[prompt.id] ?? "", 900);
  }

  return {
    note: cleanText(saved.note, 2400),
    checklist,
    reviewedAt: saved.reviewedAt ?? null,
    updatedAt: saved.updatedAt ?? null
  };
}

export function decisionId(action, actionIndex) {
  return `${action.street}-${actionIndex}`;
}

export function buildDecisionBreakdown(hand = {}) {
  const hero = hand.hero;
  const decisions = [];

  if (!hero) {
    return {
      handId: hand.id ?? hand.handId ?? null,
      decisions,
      summary: {
        decisionCount: 0,
        reviewedCount: 0,
        openCount: 0,
        flaggedCount: 0
      },
      prompts: checklistPromptConfig
    };
  }

  const seat = heroSeat(hand);
  const startingStack = amount(seat?.stack);

  for (const [actionIndex, action] of (hand.actions ?? []).entries()) {
    if (action.player !== hero || !decisionActionTypes.has(action.type)) {
      continue;
    }

    const pot = potBefore(hand, actionIndex);
    const decisionAmount = actionAmount(action);
    const committed = committedBefore(hand, hero, actionIndex);
    const remainingStack = startingStack > 0 ? Math.max(0, startingStack - committed) : null;
    const spr = remainingStack !== null && pot > 0 ? round(remainingStack / pot) : null;
    const potOdds = action.type === "calls" && decisionAmount > 0
      ? round((decisionAmount / Math.max(1, pot + decisionAmount)) * 100, 1)
      : null;
    const betSizePct = ["bets", "raises", "calls"].includes(action.type) && decisionAmount > 0 && pot > 0
      ? round((decisionAmount / pot) * 100, 1)
      : null;
    const activePlayers = activePlayersBefore(hand, actionIndex);
    const previousAggressor = previousAggression(hand, actionIndex, action.street);
    const id = decisionId(action, actionIndex);
    const flags = flaggedReasons({
      hand,
      action,
      actionIndex,
      pot,
      decisionAmount,
      spr,
      activePlayers,
      previousAggressor
    });
    const review = reviewForDecision(hand, id);

    decisions.push({
      id,
      actionIndex,
      street: action.street,
      actionType: action.type,
      player: action.player,
      amount: decisionAmount,
      potBefore: round(pot),
      potAfter: round(pot + decisionAmount),
      betSizePct,
      potOddsPct: potOdds,
      spr,
      activePlayers,
      previousAggressor: previousAggressor ? {
        player: previousAggressor.player,
        type: previousAggressor.type,
        amount: actionAmount(previousAggressor)
      } : null,
      flags,
      promptIds: checklistPromptConfig.map((prompt) => prompt.id),
      note: review.note,
      checklist: review.checklist,
      reviewedAt: review.reviewedAt,
      updatedAt: review.updatedAt
    });
  }

  const reviewedCount = decisions.filter((decision) => decision.reviewedAt).length;
  return {
    handId: hand.id ?? hand.handId ?? null,
    decisions,
    summary: {
      decisionCount: decisions.length,
      reviewedCount,
      openCount: decisions.length - reviewedCount,
      flaggedCount: decisions.filter((decision) => decision.flags.length > 0).length
    },
    prompts: checklistPromptConfig
  };
}

export function normalizeDecisionReviewPatch(payload = {}, existing = {}, defaults = {}) {
  const now = defaults.now || new Date().toISOString();
  const reviewedValue = payload.reviewed ?? payload.isReviewed;
  const nextChecklist = {
    ...(existing.checklist ?? {})
  };

  if (payload.checklist && typeof payload.checklist === "object") {
    for (const prompt of checklistPromptConfig) {
      if (payload.checklist[prompt.id] !== undefined) {
        nextChecklist[prompt.id] = cleanText(payload.checklist[prompt.id], 900);
      }
    }
  }

  for (const prompt of checklistPromptConfig) {
    nextChecklist[prompt.id] = cleanText(nextChecklist[prompt.id], 900);
  }

  return {
    note: payload.note === undefined ? cleanText(existing.note, 2400) : cleanText(payload.note, 2400),
    checklist: nextChecklist,
    reviewedAt: reviewedValue === true
      ? existing.reviewedAt || now
      : reviewedValue === false
        ? null
        : existing.reviewedAt ?? null,
    updatedAt: now
  };
}

export function buildStudyPlan(hands = []) {
  const taggedOpenHands = hands.filter((hand) => normalizeTags(hand.tags ?? []).length > 0 && !hand.reviewedAt);
  const losingHands = hands.filter((hand) => estimateHeroResult(hand) < 0);
  const decisionReports = hands.map((hand) => ({
    hand,
    report: buildDecisionBreakdown(hand)
  }));
  const openDecisions = decisionReports.flatMap(({ hand, report }) => (
    report.decisions
      .filter((decision) => !decision.reviewedAt)
      .map((decision) => ({
        hand,
        decision
      }))
  ));
  const riverDecisions = openDecisions.filter(({ decision }) => decision.street === "river");
  const flaggedDecisions = openDecisions.filter(({ decision }) => decision.flags.length > 0);
  const biggestLosses = [...losingHands]
    .sort((a, b) => estimateHeroResult(a) - estimateHeroResult(b))
    .slice(0, 5);

  return [
    {
      id: "river-decisions",
      title: "Review river decisions",
      detail: "Work through open river calls, bets, raises, and folds.",
      count: riverDecisions.length,
      handIds: [...new Set(riverDecisions.map(({ hand }) => hand.id ?? hand.handId))].slice(0, 5)
    },
    {
      id: "flagged-decisions",
      title: "Clear flagged decisions",
      detail: "Focus on large calls, unusual bet sizes, low SPR spots, and multiway decisions.",
      count: flaggedDecisions.length,
      handIds: [...new Set(flaggedDecisions.map(({ hand }) => hand.id ?? hand.handId))].slice(0, 5)
    },
    {
      id: "tagged-open-hands",
      title: "Finish tagged hands",
      detail: "Close out hands you already marked as important.",
      count: taggedOpenHands.length,
      handIds: taggedOpenHands.slice(0, 5).map((hand) => hand.id ?? hand.handId)
    },
    {
      id: "biggest-losses",
      title: "Study biggest losses",
      detail: "Start with the largest negative estimated hero results.",
      count: biggestLosses.length,
      handIds: biggestLosses.map((hand) => hand.id ?? hand.handId),
      totalResult: round(biggestLosses.reduce((sum, hand) => sum + estimateHeroResult(hand), 0)),
      trackedPot: round(biggestLosses.reduce((sum, hand) => sum + trackedPot(hand), 0))
    }
  ].filter((item) => item.count > 0);
}
