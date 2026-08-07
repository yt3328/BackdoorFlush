import { estimateHeroResult, normalizeTags, trackedPot } from "./handReview.js";

const streetOrder = ["hole-cards", "flop", "turn", "river", "show-down"];
const studyDecisionActions = new Set(["calls", "bets", "raises", "folds"]);

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function handDate(hand) {
  return hand.importedAt ?? hand.createdAt ?? "";
}

function normalizedSearch(value) {
  return String(value ?? "").trim().toLowerCase();
}

function handIdentity(hand) {
  return hand.id ?? hand.handId;
}

export function heroSeat(hand) {
  return (hand.players ?? []).find((player) => player.name === hand.hero) ?? null;
}

export function heroPosition(hand) {
  return heroSeat(hand)?.position ?? "Unknown";
}

function heroActions(hand) {
  return (hand.actions ?? []).filter((action) => action.player === hand.hero);
}

function decisionStreets(hand) {
  return [...new Set(heroActions(hand)
    .filter((action) => studyDecisionActions.has(action.type))
    .map((action) => action.street))];
}

function furthestStreet(streets) {
  return [...streets].sort((a, b) => streetOrder.indexOf(b) - streetOrder.indexOf(a))[0] ?? "hole-cards";
}

function preflopRaiseCount(hand) {
  return (hand.actions ?? []).filter((action) => action.street === "hole-cards" && action.type === "raises").length;
}

function resultBucket(result) {
  if (result > 0) {
    return "win";
  }

  if (result < 0) {
    return "loss";
  }

  return "breakeven";
}

function reviewedMatches(hand, reviewed) {
  if (reviewed === "true" || reviewed === true) {
    return Boolean(hand.reviewedAt);
  }

  if (reviewed === "false" || reviewed === false) {
    return !hand.reviewedAt;
  }

  return true;
}

export function publicStudyHand(hand) {
  const tags = normalizeTags(hand.tags ?? []);
  const result = estimateHeroResult(hand);
  const streets = decisionStreets(hand);

  return {
    id: handIdentity(hand),
    handId: hand.handId,
    importId: hand.importId,
    sessionId: hand.sessionId ?? null,
    handNumber: hand.handNumber,
    tableName: hand.tableName,
    hero: hand.hero,
    playerNames: (hand.players ?? []).map((player) => player.name),
    heroCards: hand.hero ? hand.holeCards?.[hand.hero] ?? [] : [],
    board: hand.board ?? [],
    tags,
    notes: String(hand.notes ?? "").trim(),
    reviewedAt: hand.reviewedAt ?? null,
    importedAt: handDate(hand),
    heroPosition: heroPosition(hand),
    decisionStreets: streets,
    primaryDecisionStreet: furthestStreet(streets),
    estimatedHeroResult: result,
    resultBucket: resultBucket(result),
    trackedPot: trackedPot(hand),
    preflopRaiseCount: preflopRaiseCount(hand)
  };
}

function compareStudyHands(a, b, sort = "newest") {
  if (sort === "biggest-loss") {
    return a.estimatedHeroResult - b.estimatedHeroResult;
  }

  if (sort === "biggest-win") {
    return b.estimatedHeroResult - a.estimatedHeroResult;
  }

  if (sort === "biggest-pot") {
    return b.trackedPot - a.trackedPot;
  }

  if (sort === "oldest") {
    return String(a.importedAt).localeCompare(String(b.importedAt));
  }

  if (sort === "reviewed") {
    return Number(Boolean(b.reviewedAt)) - Number(Boolean(a.reviewedAt));
  }

  if (sort === "unreviewed") {
    return Number(Boolean(a.reviewedAt)) - Number(Boolean(b.reviewedAt));
  }

  return String(b.importedAt).localeCompare(String(a.importedAt));
}

export function filterHandLibrary(hands = [], filters = {}) {
  const limit = Math.max(1, Math.min(500, Number(filters.limit) || 100));
  const tag = normalizeTags(filters.tag ? [filters.tag] : [])[0];
  const search = normalizedSearch(filters.search);
  const player = normalizedSearch(filters.player);
  let rows = hands.map(publicStudyHand);

  if (filters.sessionId) {
    rows = rows.filter((hand) => hand.sessionId === filters.sessionId);
  }

  if (tag) {
    rows = rows.filter((hand) => hand.tags.includes(tag));
  }

  if (filters.position) {
    rows = rows.filter((hand) => hand.heroPosition === filters.position);
  }

  if (filters.result) {
    rows = rows.filter((hand) => hand.resultBucket === filters.result);
  }

  if (filters.reviewed !== undefined && filters.reviewed !== null && filters.reviewed !== "") {
    rows = rows.filter((hand) => reviewedMatches(hand, filters.reviewed));
  }

  if (player) {
    rows = rows.filter((hand) => hand.playerNames.some((name) => normalizedSearch(name).includes(player)));
  }

  if (search) {
    rows = rows.filter((hand) => [
      hand.handNumber,
      hand.tableName,
      hand.hero,
      hand.heroPosition,
      hand.notes,
      hand.tags.join(" ")
    ].some((value) => normalizedSearch(value).includes(search)));
  }

  return rows.sort((a, b) => compareStudyHands(a, b, filters.sort)).slice(0, limit);
}

export function buildTagPerformance(hands = []) {
  const rows = new Map();

  for (const hand of hands) {
    const result = estimateHeroResult(hand);
    for (const tag of normalizeTags(hand.tags ?? [])) {
      const row = rows.get(tag) ?? {
        tag,
        handCount: 0,
        reviewedCount: 0,
        openCount: 0,
        totalResult: 0,
        largestWin: null,
        largestLoss: null
      };

      row.handCount += 1;
      row.reviewedCount += hand.reviewedAt ? 1 : 0;
      row.openCount += hand.reviewedAt ? 0 : 1;
      row.totalResult = round(row.totalResult + result);
      row.largestWin = row.largestWin === null ? result : Math.max(row.largestWin, result);
      row.largestLoss = row.largestLoss === null ? result : Math.min(row.largestLoss, result);
      rows.set(tag, row);
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      averageResult: round(row.totalResult / Math.max(1, row.handCount)),
      reviewedPct: round((row.reviewedCount / Math.max(1, row.handCount)) * 100, 1)
    }))
    .sort((a, b) => b.handCount - a.handCount || Math.abs(b.totalResult) - Math.abs(a.totalResult));
}

function sharedValues(first = [], second = []) {
  const secondSet = new Set(second);
  return first.filter((value) => secondSet.has(value));
}

function similarityProfile(hand) {
  const studyHand = publicStudyHand(hand);
  return {
    ...studyHand,
    decisionStreets: decisionStreets(hand),
    preflopRaiseCount: preflopRaiseCount(hand)
  };
}

function similarScore(target, candidate) {
  const reasons = [];
  let score = 0;
  const sharedTags = sharedValues(target.tags, candidate.tags);
  const sharedStreets = sharedValues(target.decisionStreets, candidate.decisionStreets);
  const potGap = Math.abs(target.trackedPot - candidate.trackedPot);
  const potBase = Math.max(1, target.trackedPot);
  const potRatio = potGap / potBase;

  if (sharedTags.length > 0) {
    score += sharedTags.length * 28;
    reasons.push(`Shared tag: ${sharedTags[0].replaceAll("-", " ")}`);
  }

  if (target.heroPosition === candidate.heroPosition) {
    score += 14;
    reasons.push(`Same position: ${target.heroPosition}`);
  }

  if (sharedStreets.length > 0) {
    score += sharedStreets.length * 12;
    reasons.push(`Same street: ${sharedStreets.at(-1).replaceAll("-", " ")}`);
  }

  if (target.primaryDecisionStreet === candidate.primaryDecisionStreet) {
    score += 8;
  }

  if (target.preflopRaiseCount >= 2 && candidate.preflopRaiseCount >= 2) {
    score += 10;
    reasons.push("Both 3-bet pots");
  }

  if (potRatio <= 0.25) {
    score += 10;
    reasons.push("Similar pot size");
  } else if (potRatio <= 0.5) {
    score += 5;
  }

  if (target.resultBucket === candidate.resultBucket) {
    score += 6;
    reasons.push(`Same result type: ${target.resultBucket}`);
  }

  return {
    score: round(score),
    reasons: [...new Set(reasons)]
  };
}

export function findSimilarHands(hands = [], handId, filters = {}) {
  const limit = Math.max(1, Math.min(20, Number(filters.limit) || 6));
  const targetHand = hands.find((hand) => handIdentity(hand) === handId || hand.handId === handId);

  if (!targetHand) {
    throw new Error("Hand not found.");
  }

  const target = similarityProfile(targetHand);
  return hands
    .filter((hand) => hand !== targetHand)
    .map((hand) => {
      const candidate = similarityProfile(hand);
      const similarity = similarScore(target, candidate);

      return {
        ...candidate,
        similarityScore: similarity.score,
        similarityReasons: similarity.reasons
      };
    })
    .filter((hand) => hand.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore || Math.abs(b.estimatedHeroResult) - Math.abs(a.estimatedHeroResult))
    .slice(0, limit);
}
