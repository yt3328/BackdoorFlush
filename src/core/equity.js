const rankValues = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

const ranks = Object.keys(rankValues);
const suits = ["c", "d", "h", "s"];

function buildDeck() {
  return ranks.flatMap((rank) => suits.map((suit) => `${rank}${suit}`));
}

function assertCard(card) {
  if (typeof card !== "string" || !/^[2-9TJQKA][cdhs]$/.test(card)) {
    throw new Error(`Invalid card: ${card}`);
  }
}

function shuffle(cards) {
  const copy = [...cards];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function combinations(items, size) {
  const results = [];

  function walk(start, current) {
    if (current.length === size) {
      results.push([...current]);
      return;
    }

    for (let index = start; index <= items.length - (size - current.length); index += 1) {
      current.push(items[index]);
      walk(index + 1, current);
      current.pop();
    }
  }

  walk(0, []);
  return results;
}

function straightHigh(ranksInHand) {
  const unique = [...new Set(ranksInHand)].sort((a, b) => b - a);

  if (unique.includes(14)) {
    unique.push(1);
  }

  for (let index = 0; index <= unique.length - 5; index += 1) {
    const window = unique.slice(index, index + 5);
    if (window[0] - window[4] === 4) {
      return window[0];
    }
  }

  return null;
}

function encode(category, kickers) {
  return [category, ...kickers].reduce((score, value) => score * 15 + value, 0);
}

function scoreFive(cards) {
  const cardRanks = cards.map((card) => rankValues[card[0]]).sort((a, b) => b - a);
  const cardSuits = cards.map((card) => card[1]);
  const flush = cardSuits.every((suit) => suit === cardSuits[0]);
  const straight = straightHigh(cardRanks);
  const counts = new Map();

  for (const rank of cardRanks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }

  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (flush && straight) {
    return encode(8, [straight]);
  }

  if (groups[0][1] === 4) {
    const kicker = groups.find(([, count]) => count === 1)[0];
    return encode(7, [groups[0][0], kicker]);
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return encode(6, [groups[0][0], groups[1][0]]);
  }

  if (flush) {
    return encode(5, cardRanks);
  }

  if (straight) {
    return encode(4, [straight]);
  }

  if (groups[0][1] === 3) {
    const kickers = groups.filter(([, count]) => count === 1).map(([rank]) => rank).sort((a, b) => b - a);
    return encode(3, [groups[0][0], ...kickers]);
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairs = groups.filter(([, count]) => count === 2).map(([rank]) => rank).sort((a, b) => b - a);
    const kicker = groups.find(([, count]) => count === 1)[0];
    return encode(2, [...pairs, kicker]);
  }

  if (groups[0][1] === 2) {
    const kickers = groups.filter(([, count]) => count === 1).map(([rank]) => rank).sort((a, b) => b - a);
    return encode(1, [groups[0][0], ...kickers]);
  }

  return encode(0, cardRanks);
}

export function scoreBestHand(cards) {
  if (!Array.isArray(cards) || cards.length < 5 || cards.length > 7) {
    throw new Error("scoreBestHand expects 5 to 7 cards.");
  }

  for (const card of cards) {
    assertCard(card);
  }

  return Math.max(...combinations(cards, 5).map(scoreFive));
}

export function calculateEquity({ holeCards, boardCards = [], opponents = 1, iterations = 1200 } = {}) {
  if (!Array.isArray(holeCards) || holeCards.length !== 2) {
    throw new Error("holeCards must contain exactly two cards.");
  }

  if (!Array.isArray(boardCards) || boardCards.length > 5) {
    throw new Error("boardCards must contain 0 to 5 cards.");
  }

  const opponentCount = Math.max(1, Math.min(8, Number.parseInt(opponents, 10) || 1));
  const runCount = Math.max(100, Math.min(20000, Number.parseInt(iterations, 10) || 1200));
  const knownCards = [...holeCards, ...boardCards];

  for (const card of knownCards) {
    assertCard(card);
  }

  if (new Set(knownCards).size !== knownCards.length) {
    throw new Error("Cards cannot be repeated.");
  }

  let wins = 0;
  let ties = 0;
  let losses = 0;
  const deck = buildDeck().filter((card) => !knownCards.includes(card));

  for (let run = 0; run < runCount; run += 1) {
    const shuffled = shuffle(deck);
    let cursor = 0;
    const opponentsHands = [];

    for (let opponent = 0; opponent < opponentCount; opponent += 1) {
      opponentsHands.push([shuffled[cursor], shuffled[cursor + 1]]);
      cursor += 2;
    }

    const runBoard = [...boardCards];
    while (runBoard.length < 5) {
      runBoard.push(shuffled[cursor]);
      cursor += 1;
    }

    const heroScore = scoreBestHand([...holeCards, ...runBoard]);
    const opponentScores = opponentsHands.map((cards) => scoreBestHand([...cards, ...runBoard]));
    const bestOpponentScore = Math.max(...opponentScores);

    if (heroScore > bestOpponentScore) {
      wins += 1;
    } else if (heroScore === bestOpponentScore) {
      ties += 1;
    } else {
      losses += 1;
    }
  }

  return {
    holeCards,
    boardCards,
    opponents: opponentCount,
    iterations: runCount,
    wins,
    ties,
    losses,
    equityPct: Number((((wins + ties / 2) / runCount) * 100).toFixed(1))
  };
}

