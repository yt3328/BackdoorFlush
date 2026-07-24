function finiteNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function parseStakes(stakes) {
  const text = String(stakes ?? "");
  const match = text.match(/\$?(\d+(?:\.\d+)?)\s*\/\s*\$?(\d+(?:\.\d+)?)/);

  if (!match) {
    return {
      smallBlind: null,
      bigBlind: null
    };
  }

  return {
    smallBlind: Number(match[1]),
    bigBlind: Number(match[2])
  };
}

export function buildBankrollSession(payload = {}, defaults = {}) {
  const parsedStakes = parseStakes(payload.stakes);
  const smallBlind = nullableNumber(payload.smallBlind) ?? parsedStakes.smallBlind;
  const bigBlind = nullableNumber(payload.bigBlind) ?? parsedStakes.bigBlind;
  const buyIn = nullableNumber(payload.buyIn);
  const cashOut = nullableNumber(payload.cashOut);
  const explicitProfit = nullableNumber(payload.profit ?? payload.result);
  const profit =
    explicitProfit ??
    (buyIn !== null || cashOut !== null ? finiteNumber(cashOut) - finiteNumber(buyIn) : 0);
  const hours = Math.max(0, finiteNumber(payload.hours));
  const normalizedBigBlind = bigBlind && bigBlind > 0 ? bigBlind : null;
  const bbWon = normalizedBigBlind ? profit / normalizedBigBlind : 0;
  const sessionDate = String(payload.date || payload.playedAt || todayIsoDate()).slice(0, 10);
  const createdAt = defaults.createdAt ?? new Date().toISOString();

  return {
    id: defaults.id ?? payload.id ?? payload.sessionId,
    sessionId: defaults.id ?? payload.sessionId ?? payload.id,
    date: sessionDate,
    location: String(payload.location || "Unspecified").trim(),
    gameType: String(payload.gameType || "cash").trim(),
    stakes: String(payload.stakes || "").trim(),
    tableSize: Math.max(2, Math.min(10, Math.trunc(finiteNumber(payload.tableSize, 6)))),
    smallBlind,
    bigBlind: normalizedBigBlind,
    hours: round(hours),
    buyIn,
    cashOut,
    profit: round(profit),
    bbWon: round(bbWon),
    hourlyRate: hours > 0 ? round(profit / hours) : 0,
    bbPerHour: hours > 0 ? round(bbWon / hours) : 0,
    notes: String(payload.notes || "").trim(),
    createdAt,
    updatedAt: defaults.updatedAt ?? createdAt
  };
}

function sortByDateAsc(sessions) {
  return [...sessions].sort((a, b) => {
    const dateCompare = String(a.date).localeCompare(String(b.date));
    return dateCompare === 0
      ? String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
      : dateCompare;
  });
}

function groupSessions(sessions, key) {
  const groups = new Map();

  for (const session of sessions) {
    const groupKey = session[key] || "Unspecified";
    const current = groups.get(groupKey) ?? {
      label: groupKey,
      sessions: 0,
      profit: 0,
      hours: 0,
      bbWon: 0
    };

    current.sessions += 1;
    current.profit += session.profit;
    current.hours += session.hours;
    current.bbWon += session.bbWon;
    groups.set(groupKey, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      profit: round(group.profit),
      hours: round(group.hours),
      bbWon: round(group.bbWon),
      hourlyRate: group.hours > 0 ? round(group.profit / group.hours) : 0,
      bbPerHour: group.hours > 0 ? round(group.bbWon / group.hours) : 0
    }))
    .sort((a, b) => b.profit - a.profit);
}

export function summarizeBankrollSessions(rawSessions = []) {
  const sessions = rawSessions.map((session) => buildBankrollSession(session, {
    id: session.sessionId ?? session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  }));
  const ordered = sortByDateAsc(sessions);
  let cumulativeProfit = 0;
  let cumulativeBb = 0;

  const points = ordered.map((session) => {
    cumulativeProfit += session.profit;
    cumulativeBb += session.bbWon;
    return {
      sessionId: session.sessionId ?? session.id,
      date: session.date,
      label: `${session.location} ${session.stakes}`.trim(),
      profit: session.profit,
      bbWon: session.bbWon,
      cumulativeProfit: round(cumulativeProfit),
      cumulativeBb: round(cumulativeBb)
    };
  });

  const totalHours = sessions.reduce((sum, session) => sum + session.hours, 0);
  const totalProfit = sessions.reduce((sum, session) => sum + session.profit, 0);
  const totalBb = sessions.reduce((sum, session) => sum + session.bbWon, 0);
  const winningSessions = sessions.filter((session) => session.profit > 0).length;
  const bestSession = [...sessions].sort((a, b) => b.profit - a.profit)[0] ?? null;
  const worstSession = [...sessions].sort((a, b) => a.profit - b.profit)[0] ?? null;

  return {
    sessionCount: sessions.length,
    totalProfit: round(totalProfit),
    totalHours: round(totalHours),
    totalBb: round(totalBb),
    averageProfit: sessions.length > 0 ? round(totalProfit / sessions.length) : 0,
    hourlyRate: totalHours > 0 ? round(totalProfit / totalHours) : 0,
    bbPerHour: totalHours > 0 ? round(totalBb / totalHours) : 0,
    winRate: sessions.length > 0 ? round((winningSessions / sessions.length) * 100, 1) : 0,
    bestSession,
    worstSession,
    points,
    byLocation: groupSessions(sessions, "location"),
    byGameType: groupSessions(sessions, "gameType"),
    recentSessions: [...sessions]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 8)
  };
}
