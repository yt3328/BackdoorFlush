import { buildReviewQueue, estimateHeroResult } from "./handReview.js";
import { detectLeaks, summarizeHands } from "./stats.js";

export { estimateHeroResult };

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function publicHandSpot(hand) {
  return {
    id: hand.id,
    handId: hand.handId,
    handNumber: hand.handNumber,
    tableName: hand.tableName,
    hero: hand.hero,
    board: hand.board,
    heroCards: hand.hero ? hand.holeCards?.[hand.hero] ?? [] : [],
    tags: hand.tags ?? [],
    notes: hand.notes ?? "",
    reviewedAt: hand.reviewedAt ?? null,
    estimatedHeroResult: estimateHeroResult(hand),
    winnerNames: Object.keys(hand.winnings ?? {})
  };
}

export function buildSessionDetail({ session, imports = [], hands = [] }) {
  if (!session) {
    return null;
  }

  const players = summarizeHands(hands);
  const spots = hands.map(publicHandSpot);

  return {
    session,
    imports,
    hands,
    players,
    leaks: detectLeaks(players),
    reviewQueue: buildReviewQueue(hands, {
      limit: 8
    }),
    totals: {
      importCount: imports.length,
      handCount: hands.length,
      estimatedHeroResult: round(spots.reduce((sum, hand) => sum + hand.estimatedHeroResult, 0))
    },
    biggestWins: [...spots]
      .filter((hand) => hand.estimatedHeroResult > 0)
      .sort((a, b) => b.estimatedHeroResult - a.estimatedHeroResult)
      .slice(0, 5),
    biggestLosses: [...spots]
      .filter((hand) => hand.estimatedHeroResult < 0)
      .sort((a, b) => a.estimatedHeroResult - b.estimatedHeroResult)
      .slice(0, 5)
  };
}
