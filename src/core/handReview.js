function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function committedByPlayer(hand, player) {
  return (hand.actions ?? [])
    .filter((action) => action.player === player)
    .reduce((sum, action) => sum + (Number(action.amount) || 0), 0);
}

function normalizedTag(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanNotes(value) {
  return String(value ?? "").trim().slice(0, 4000);
}

export function estimateHeroResult(hand) {
  const hero = hand.hero;
  if (!hero) {
    return 0;
  }

  return round((Number(hand.winnings?.[hero]) || 0) - committedByPlayer(hand, hero));
}

export function trackedPot(hand) {
  return round((hand.actions ?? []).reduce((sum, action) => sum + (Number(action.amount) || 0), 0));
}

export function normalizeTags(tags = []) {
  const rawTags = Array.isArray(tags)
    ? tags
    : String(tags).split(/[\s,]+/);

  return [...new Set(rawTags.map(normalizedTag).filter(Boolean))].slice(0, 12);
}

export function normalizeReviewPatch(payload = {}, existing = {}, defaults = {}) {
  const reviewedValue = payload.reviewed ?? payload.isReviewed;
  const nextReviewedAt =
    reviewedValue === true
      ? existing.reviewedAt || defaults.now || new Date().toISOString()
      : reviewedValue === false
        ? null
        : existing.reviewedAt ?? null;

  return {
    tags: payload.tags === undefined ? normalizeTags(existing.tags ?? []) : normalizeTags(payload.tags),
    notes: payload.notes === undefined ? cleanNotes(existing.notes) : cleanNotes(payload.notes),
    reviewedAt: nextReviewedAt,
    reviewUpdatedAt: defaults.now || new Date().toISOString()
  };
}

export function reviewReasons(hand) {
  const reasons = [];
  const result = estimateHeroResult(hand);
  const pot = trackedPot(hand);
  const hero = hand.hero;
  const tags = normalizeTags(hand.tags ?? []);

  if (!hand.reviewedAt) {
    reasons.push("Unreviewed");
  }

  if (result < 0) {
    reasons.push("Losing hand");
  } else if (result > 0) {
    reasons.push("Winning hand");
  }

  if (pot > 0) {
    reasons.push("Pot built");
  }

  if ((hand.actions ?? []).some((action) => action.street === "river" && action.player === hero && action.type === "calls")) {
    reasons.push("River call");
  }

  if ((hand.actions ?? []).some((action) => action.street === "river" && action.player === hero && ["bets", "raises"].includes(action.type))) {
    reasons.push("River aggression");
  }

  if ((hand.actions ?? []).filter((action) => action.street === "hole-cards" && action.type === "raises").length >= 2) {
    reasons.push("3-bet pot");
  }

  if (tags.length > 0) {
    reasons.push("Tagged");
  }

  if (cleanNotes(hand.notes)) {
    reasons.push("Has notes");
  }

  return [...new Set(reasons)];
}

function reviewScore(hand) {
  const result = Math.abs(estimateHeroResult(hand));
  const pot = trackedPot(hand);
  const hero = hand.hero;
  const tags = normalizeTags(hand.tags ?? []);
  let score = result * 2 + pot * 0.35;

  if (!hand.reviewedAt) {
    score += 12;
  } else {
    score -= 8;
  }

  if (tags.length > 0) {
    score += 18 + tags.length * 2;
  }

  if (cleanNotes(hand.notes)) {
    score += 6;
  }

  if ((hand.actions ?? []).some((action) => action.street === "river" && action.player === hero && ["calls", "bets", "raises"].includes(action.type))) {
    score += 16;
  }

  if ((hand.actions ?? []).filter((action) => action.street === "hole-cards" && action.type === "raises").length >= 2) {
    score += 10;
  }

  return round(score);
}

function publicReviewSpot(hand) {
  const heroSeat = (hand.players ?? []).find((player) => player.name === hand.hero);

  return {
    id: hand.id,
    handId: hand.handId,
    importId: hand.importId,
    sessionId: hand.sessionId ?? null,
    handNumber: hand.handNumber,
    tableName: hand.tableName,
    hero: hand.hero,
    heroCards: hand.hero ? hand.holeCards?.[hand.hero] ?? [] : [],
    board: hand.board ?? [],
    heroPosition: heroSeat?.position ?? "Unknown",
    tags: normalizeTags(hand.tags ?? []),
    notes: cleanNotes(hand.notes),
    reviewedAt: hand.reviewedAt ?? null,
    importedAt: hand.importedAt ?? hand.createdAt ?? null,
    estimatedHeroResult: estimateHeroResult(hand),
    trackedPot: trackedPot(hand),
    score: reviewScore(hand),
    reasons: reviewReasons(hand)
  };
}

function compareReviewSpots(a, b, sort = "priority") {
  if (sort === "biggest-loss") {
    return a.estimatedHeroResult - b.estimatedHeroResult;
  }

  if (sort === "biggest-win") {
    return b.estimatedHeroResult - a.estimatedHeroResult;
  }

  if (sort === "biggest-pot") {
    return b.trackedPot - a.trackedPot;
  }

  if (sort === "newest") {
    return String(b.importedAt).localeCompare(String(a.importedAt));
  }

  if (sort === "oldest") {
    return String(a.importedAt).localeCompare(String(b.importedAt));
  }

  return b.score - a.score || Math.abs(b.estimatedHeroResult) - Math.abs(a.estimatedHeroResult);
}

export function buildReviewQueue(hands = [], filters = {}) {
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
  let spots = hands.map(publicReviewSpot);

  if (filters.sessionId) {
    spots = spots.filter((spot) => spot.sessionId === filters.sessionId);
  }

  if (filters.tag) {
    const tag = normalizedTag(filters.tag);
    spots = spots.filter((spot) => spot.tags.includes(tag));
  }

  if (filters.reviewed === "true" || filters.reviewed === true) {
    spots = spots.filter((spot) => Boolean(spot.reviewedAt));
  } else if (filters.reviewed === "false" || filters.reviewed === false) {
    spots = spots.filter((spot) => !spot.reviewedAt);
  }

  return spots
    .filter((spot) => spot.score > 0)
    .sort((a, b) => compareReviewSpots(a, b, filters.sort))
    .slice(0, limit);
}
