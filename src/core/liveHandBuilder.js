const streetAliases = {
  preflop: "hole-cards",
  "hole cards": "hole-cards",
  "hole-cards": "hole-cards",
  flop: "flop",
  turn: "turn",
  river: "river",
  showdown: "show-down",
  "show-down": "show-down"
};

const actionAliases = {
  fold: "folds",
  folds: "folds",
  check: "checks",
  checks: "checks",
  call: "calls",
  calls: "calls",
  bet: "bets",
  bets: "bets",
  raise: "raises",
  raises: "raises"
};

function cleanText(value) {
  return String(value ?? "").trim();
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value, fallback = 0) {
  const number = nullableNumber(value);
  return number === null ? fallback : Math.max(0, number);
}

function cleanPosition(value) {
  return cleanText(value).toUpperCase();
}

function normalizeCard(value, label) {
  const text = cleanText(value);
  const match = text.match(/^(10|[2-9TJQKA])([cdhs])$/i);

  if (!match) {
    throw new Error(`${label} has an invalid card: ${text || "blank"}.`);
  }

  const rank = match[1].toUpperCase() === "10" ? "T" : match[1].toUpperCase();
  return `${rank}${match[2].toLowerCase()}`;
}

function cardsFromInput(value, { label, max, required = false } = {}) {
  const rawCards = Array.isArray(value)
    ? value
    : cleanText(value).split(/[\s,]+/).filter(Boolean);

  if (required && rawCards.length === 0) {
    throw new Error(`${label} is required.`);
  }

  if (rawCards.length > max) {
    throw new Error(`${label} expects at most ${max} cards.`);
  }

  return rawCards.map((card) => normalizeCard(card, label));
}

function optionalHoleCards(value, label) {
  const cards = cardsFromInput(value, {
    label,
    max: 2
  });

  if (cards.length === 0) {
    return [];
  }

  if (cards.length !== 2) {
    throw new Error(`${label} expects exactly 2 cards when provided.`);
  }

  return cards;
}

function assertUniqueCards(cards) {
  const seen = new Set();

  for (const card of cards) {
    if (seen.has(card)) {
      throw new Error(`Card ${card} appears more than once.`);
    }
    seen.add(card);
  }
}

function normalizeStreet(value) {
  const street = streetAliases[cleanText(value).toLowerCase()];

  if (!street) {
    throw new Error(`Invalid street: ${value}.`);
  }

  return street;
}

function normalizeActionType(value) {
  const actionType = actionAliases[cleanText(value).toLowerCase()];

  if (!actionType) {
    throw new Error(`Invalid action type: ${value}.`);
  }

  return actionType;
}

function nextSeat(players) {
  return Math.max(0, ...players.map((player) => Number(player.seat) || 0)) + 1;
}

function upsertPlayer(players, name, defaults = {}) {
  const playerName = cleanText(name);

  if (!playerName || players.some((player) => player.name === playerName)) {
    return;
  }

  players.push({
    seat: nextSeat(players),
    name: playerName,
    stack: positiveNumber(defaults.stack),
    position: cleanPosition(defaults.position) || null
  });
}

function normalizePlayers(rawPlayers, hero, actions, winnings, holeCards, forcedBets) {
  const players = Array.isArray(rawPlayers)
    ? rawPlayers
      .map((player, index) => ({
        seat: Math.max(1, Math.trunc(positiveNumber(player.seat, index + 1))),
        name: cleanText(player.name),
        stack: positiveNumber(player.stack),
        position: cleanPosition(player.position) || null
      }))
      .filter((player) => player.name)
    : [];

  upsertPlayer(players, hero, {
    position: "BTN"
  });

  for (const action of actions) {
    upsertPlayer(players, action.player);
  }

  for (const winner of Object.keys(winnings)) {
    upsertPlayer(players, winner);
  }

  for (const player of Object.keys(holeCards)) {
    upsertPlayer(players, player);
  }

  for (const forcedBet of forcedBets) {
    upsertPlayer(players, forcedBet.player);
  }

  if (players.length < 2) {
    throw new Error("At least two players are required.");
  }

  return players.sort((a, b) => a.seat - b.seat);
}

function normalizeActions(rawActions) {
  if (!Array.isArray(rawActions)) {
    throw new Error("actions must be a list.");
  }

  return rawActions
    .map((action) => ({
      player: cleanText(action.player),
      street: normalizeStreet(action.street || "hole-cards"),
      type: normalizeActionType(action.type),
      amount: nullableNumber(action.amount)
    }))
    .filter((action) => action.player);
}

function normalizeWinnings(payload) {
  const winnings = {};

  if (payload.winnings && typeof payload.winnings === "object") {
    for (const [player, amount] of Object.entries(payload.winnings)) {
      const playerName = cleanText(player);
      const won = nullableNumber(amount);
      if (playerName && won !== null) {
        winnings[playerName] = won;
      }
    }
  }

  const winner = cleanText(payload.winner ?? payload.winnerName);
  const wonAmount = nullableNumber(payload.wonAmount ?? payload.collectedAmount);
  if (winner && wonAmount !== null) {
    winnings[winner] = wonAmount;
  }

  return winnings;
}

function normalizeHoleCards(payload, hero, heroCards) {
  const holeCards = {
    [hero]: heroCards
  };

  const rawHoleCards = payload.holeCards && !Array.isArray(payload.holeCards) && typeof payload.holeCards === "object"
    ? payload.holeCards
    : {};
  const rawRevealedHands = payload.revealedHands && typeof payload.revealedHands === "object"
    ? payload.revealedHands
    : {};

  for (const [player, cards] of Object.entries({
    ...rawHoleCards,
    ...rawRevealedHands
  })) {
    const playerName = cleanText(player);
    if (!playerName || playerName === hero) {
      continue;
    }

    const normalizedCards = optionalHoleCards(cards, `${playerName} hole cards`);
    if (normalizedCards.length === 2) {
      holeCards[playerName] = normalizedCards;
    }
  }

  if (Array.isArray(payload.showdownCards)) {
    for (const entry of payload.showdownCards) {
      const playerName = cleanText(entry.player ?? entry.name);
      if (!playerName || playerName === hero) {
        continue;
      }

      const normalizedCards = optionalHoleCards(entry.cards ?? entry.holeCards, `${playerName} showdown cards`);
      if (normalizedCards.length === 2) {
        holeCards[playerName] = normalizedCards;
      }
    }
  }

  return holeCards;
}

function normalizeForcedBetType(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeForcedBets(rawForcedBets) {
  if (!Array.isArray(rawForcedBets)) {
    return [];
  }

  return rawForcedBets
    .map((forcedBet) => ({
      player: cleanText(forcedBet.player),
      type: normalizeForcedBetType(forcedBet.type || forcedBet.kind || "blind"),
      amount: positiveNumber(forcedBet.amount),
      street: normalizeStreet(forcedBet.street || "hole-cards")
    }))
    .filter((forcedBet) => forcedBet.player && forcedBet.amount > 0);
}

function generatedHandNumber(defaults) {
  const now = defaults.now ? new Date(defaults.now) : new Date();
  const stamp = Number.isNaN(now.getTime())
    ? Date.now().toString(36)
    : now.toISOString().replace(/\D/g, "").slice(0, 17);
  return `live-${stamp}`;
}

export function buildLiveHand(payload = {}, defaults = {}) {
  const hero = cleanText(payload.hero) || "Hero";
  const heroCards = cardsFromInput(payload.heroCards ?? payload.holeCards, {
    label: "heroCards",
    max: 2,
    required: true
  });

  if (heroCards.length !== 2) {
    throw new Error("heroCards expects exactly 2 cards.");
  }

  const board = cardsFromInput(payload.boardCards ?? payload.board, {
    label: "boardCards",
    max: 5
  });

  const actions = normalizeActions(payload.actions ?? []);
  const winnings = normalizeWinnings(payload);
  const forcedBets = normalizeForcedBets(payload.forcedBets);
  const holeCards = normalizeHoleCards(payload, hero, heroCards);
  assertUniqueCards([...Object.values(holeCards).flat(), ...board]);

  const players = normalizePlayers(payload.players, hero, actions, winnings, holeCards, forcedBets);
  const explicitButtonSeat = nullableNumber(payload.buttonSeat);
  const buttonSeat = explicitButtonSeat ?? players.find((player) => player.position === "BTN")?.seat ?? null;

  return {
    handNumber: cleanText(payload.handNumber) || defaults.handNumber || generatedHandNumber(defaults),
    tableName: cleanText(payload.tableName) || cleanText(payload.location) || "Live table",
    buttonSeat,
    players,
    hero,
    holeCards,
    board,
    actions,
    forcedBets,
    winnings,
    rawLineCount: actions.length + forcedBets.length,
    source: "live-entry",
    stakes: cleanText(payload.stakes),
    notes: cleanText(payload.notes)
  };
}
