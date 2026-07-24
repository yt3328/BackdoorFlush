const seatPattern = /^Seat\s+(\d+):\s+(.+?)\s+\(([-\d.]+)\s+in chips\)/;
const dealtPattern = /^Dealt to (.+?) \[([2-9TJQKA][cdhs]) ([2-9TJQKA][cdhs])\]/;
const actionPattern = /^(.+?):\s+(folds|checks|calls|bets|raises)(?:\s+([-\d.]+))?(?:\s+to\s+([-\d.]+))?/;
const streetPattern = /^\*\*\* (HOLE CARDS|FLOP|TURN|RIVER|SHOW DOWN|SUMMARY) \*\*\*/;
const boardPattern = /^\*\*\* (FLOP|TURN|RIVER) \*\*\* \[(.+?)\](?: \[(.+?)\])?/;
const collectedPattern = /^(.+?) collected ([-\d.]+) from pot/;

const positionsBySeatCount = {
  2: ["SB", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["BTN", "SB", "BB", "UTG"],
  5: ["BTN", "SB", "BB", "UTG", "CO"],
  6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  7: ["BTN", "SB", "BB", "UTG", "LJ", "HJ", "CO"],
  8: ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"],
  9: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
};

function parseAmount(value) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cardsFromText(text) {
  return text
    .replaceAll("[", "")
    .replaceAll("]", "")
    .split(/\s+/)
    .filter(Boolean);
}

function splitHands(rawText) {
  return rawText
    .split(/\n\s*\n(?=PokerStars Hand #|Hand #|Table |Seat \d+:)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function assignPositions(players, buttonSeat) {
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const buttonIndex = sorted.findIndex((player) => player.seat === buttonSeat);
  const order = buttonIndex === -1 ? sorted : [...sorted.slice(buttonIndex), ...sorted.slice(0, buttonIndex)];
  const labels = positionsBySeatCount[order.length] ?? positionsBySeatCount[9];
  const positionBySeat = new Map();

  order.forEach((player, index) => {
    positionBySeat.set(player.seat, labels[index] ?? `Seat ${index + 1}`);
  });

  return players.map((player) => ({
    ...player,
    position: positionBySeat.get(player.seat) ?? null
  }));
}

function parseHeader(line, fallbackIndex) {
  const handMatch = line.match(/(?:PokerStars )?Hand #?(\d+)/i);
  const tableMatch = line.match(/Table ['"]?([^'"]+)['"]?/i);

  return {
    handNumber: handMatch?.[1] ?? `sample-${fallbackIndex + 1}`,
    tableName: tableMatch?.[1] ?? null
  };
}

function parseButtonSeat(line) {
  const match = line.match(/Seat #(\d+) is the button/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseHand(chunk, index) {
  const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = parseHeader(lines[0] ?? "", index);
  const players = [];
  const holeCards = {};
  const board = [];
  const actions = [];
  const winnings = {};
  let tableName = header.tableName;
  let buttonSeat = null;
  let street = "preflop";

  for (const line of lines) {
    buttonSeat ??= parseButtonSeat(line);
    tableName ??= line.match(/Table ['"]?([^'"]+)['"]?/i)?.[1] ?? null;

    const seatMatch = line.match(seatPattern);
    if (seatMatch) {
      players.push({
        seat: Number.parseInt(seatMatch[1], 10),
        name: seatMatch[2],
        stack: parseAmount(seatMatch[3])
      });
      continue;
    }

    const streetMatch = line.match(streetPattern);
    if (streetMatch) {
      street = streetMatch[1].toLowerCase().replaceAll(" ", "-");
    }

    const boardMatch = line.match(boardPattern);
    if (boardMatch) {
      const visibleCards = [...cardsFromText(boardMatch[2])];
      if (boardMatch[3]) {
        visibleCards.push(...cardsFromText(boardMatch[3]));
      }
      board.splice(0, board.length, ...visibleCards);
      continue;
    }

    const dealtMatch = line.match(dealtPattern);
    if (dealtMatch) {
      holeCards[dealtMatch[1]] = [dealtMatch[2], dealtMatch[3]];
      continue;
    }

    const actionMatch = line.match(actionPattern);
    if (actionMatch) {
      actions.push({
        player: actionMatch[1],
        street,
        type: actionMatch[2],
        amount: parseAmount(actionMatch[4] ?? actionMatch[3])
      });
      continue;
    }

    const collectedMatch = line.match(collectedPattern);
    if (collectedMatch) {
      winnings[collectedMatch[1]] = (winnings[collectedMatch[1]] ?? 0) + parseAmount(collectedMatch[2]);
    }
  }

  return {
    handNumber: header.handNumber,
    tableName,
    buttonSeat,
    players: assignPositions(players, buttonSeat),
    hero: Object.keys(holeCards)[0] ?? null,
    holeCards,
    board,
    actions,
    winnings,
    rawLineCount: lines.length
  };
}

export function parseHandHistory(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("rawText is required.");
  }

  const hands = splitHands(rawText).map(parseHand).filter((hand) => hand.players.length > 0);

  if (hands.length === 0) {
    throw new Error("No hands found in the upload.");
  }

  return hands;
}
