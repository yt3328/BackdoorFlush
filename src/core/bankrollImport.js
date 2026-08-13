import { hashText } from "./importIdentity.js";

const pokerSessionSections = new Map([
  ["cashgames", "cash"],
  ["cashgame", "cash"],
  ["sessions", "cash"],
  ["tourneys", "tournament"],
  ["tournaments", "tournament"],
  ["tournament", "tournament"]
]);
const completedStates = new Set(["completed", "complete", "closed", "done", ""]);

function normalizeKey(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function isBlankRow(row) {
  return row.every((cell) => cleanText(cell) === "");
}

function onlyCell(row) {
  const cells = row.map(cleanText).filter(Boolean);
  return cells.length === 1 ? cells[0] : null;
}

function parseCsvRows(rawText) {
  const text = String(rawText ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function rowToRecord(header, row) {
  return header.reduce((record, key, index) => {
    const normalized = normalizeKey(key);
    if (normalized) {
      record[normalized] = cleanText(row[index]);
    }
    return record;
  }, {});
}

function pick(record, keys) {
  for (const key of keys) {
    const value = record[normalizeKey(key)];
    if (value !== undefined && cleanText(value) !== "") {
      return cleanText(value);
    }
  }

  return "";
}

function headerKind(row) {
  const keys = new Set(row.map(normalizeKey));

  if (keys.has("starttime") && keys.has("endtime") && keys.has("profit")) {
    return "poker-session";
  }

  if (keys.has("transactiondate") && keys.has("amount")) {
    return "transaction";
  }

  if ((keys.has("date") || keys.has("sessiondate") || keys.has("playedat")) && keys.has("location")) {
    return "generic-session";
  }

  return null;
}

function parseMoney(value) {
  const text = cleanText(value);
  if (!text) {
    return null;
  }

  const negative = /^\(.*\)$/.test(text);
  const normalized = text.replace(/[,$%\s()]/g, "");
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return negative ? -Math.abs(amount) : amount;
}

function parseInteger(value, fallback = null) {
  const number = Number.parseInt(cleanText(value), 10);
  return Number.isFinite(number) ? number : fallback;
}

function parsePositiveInteger(value, fallback = null) {
  const number = parseInteger(value, fallback);
  return number && number > 0 ? number : fallback;
}

function parseDate(value) {
  const text = cleanText(value);
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const us = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (us) {
    return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }

  return "";
}

function parseDateTime(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    return "";
  }

  return [
    `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`,
    `${match[4].padStart(2, "0")}:${match[5]}:${match[6] ?? "00"}`
  ].join("T");
}

function parseDurationHours(value) {
  const text = cleanText(value);
  if (!text) {
    return null;
  }

  const clock = text.match(/^(\d+):(\d{1,2})$/);
  if (clock) {
    return Number(clock[1]) + Number(clock[2]) / 60;
  }

  const label = text.match(/(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m)?/i);
  if (label && (label[1] || label[2])) {
    return Number(label[1] ?? 0) + Number(label[2] ?? 0) / 60;
  }

  const decimal = Number(text);
  return Number.isFinite(decimal) ? decimal : null;
}

function hoursBetween(startValue, endValue, breakMinutesValue) {
  const start = cleanText(startValue).replace(" ", "T");
  const end = cleanText(endValue).replace(" ", "T");
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
    return null;
  }

  const breakHours = (parseMoney(breakMinutesValue) ?? 0) / 60;
  const hours = (endDate.valueOf() - startDate.valueOf()) / 3600000 - breakHours;
  return hours >= 0 ? hours : null;
}

function importedSessionKey(record, fallbackParts, sessionType) {
  const sourceId = pick(record, ["SessionId", "Session ID", "Id"]);
  const bankroll = pick(record, ["Bankroll", "Bankroll Name"]);
  const type = normalizeKey(sessionType || "session");

  if (sourceId) {
    return `bankroll-session:${type}:${normalizeKey(bankroll || "default")}:${normalizeKey(sourceId)}`;
  }

  return `bankroll-session:${type}:${hashText(fallbackParts.join("|")).slice(0, 24)}`;
}

function importedTransactionKey(record, fallbackParts, context) {
  const bankroll = pick(record, ["Bankroll", "Bankroll Name"]) || context.bankrollName || "default";
  return `bankroll-transaction:${normalizeKey(bankroll)}:${hashText(fallbackParts.join("|")).slice(0, 24)}`;
}

function inferTransactionType(note, amount) {
  const key = normalizeKey(note);

  if (key.includes("initial")) {
    return "initial";
  }

  if (key.includes("withdraw")) {
    return "withdrawal";
  }

  if (key.includes("transfer")) {
    return "transfer";
  }

  if (key.includes("deposit") || key.includes("add")) {
    return "deposit";
  }

  return Number(amount) < 0 ? "withdrawal" : "deposit";
}

function transactionFromRecord(record, context) {
  const transactionDateText = pick(record, ["Transaction Date", "Date", "Created At"]);
  const updateDateText = pick(record, ["Update Date", "Updated At"]);
  const amount = parseMoney(pick(record, ["Amount", "Transaction Amount", "Net"]));
  const date = parseDate(transactionDateText) || parseDate(updateDateText);

  if (!date || amount === null) {
    return {
      skipped: "Transaction row is missing date or amount."
    };
  }

  const note = pick(record, ["Note", "Notes", "Description"]);
  const bankrollName = pick(record, ["Bankroll", "Bankroll Name"]) || context.bankrollName;
  const transaction = {
    date,
    amount,
    type: inferTransactionType(note, amount),
    note,
    bankrollName,
    importSource: context.source,
    transactionAt: parseDateTime(transactionDateText),
    sourceUpdatedAt: parseDateTime(updateDateText)
  };
  transaction.externalKey = importedTransactionKey(record, [
    transactionDateText,
    updateDateText,
    bankrollName,
    amount,
    note
  ], context);

  return {
    transaction
  };
}

function pokerSessionFromRecord(record, context) {
  const state = pick(record, ["State", "Status"]);
  if (!completedStates.has(normalizeKey(state))) {
    return {
      skipped: `Poker session row is ${state}.`
    };
  }

  const gameType = context.currentGameType || "cash";
  const startedAtText = pick(record, ["Start Time", "Started At", "Date"]);
  const endedAtText = pick(record, ["End Time", "Ended At"]);
  const date = parseDate(startedAtText) || parseDate(endedAtText);
  if (!date) {
    return {
      skipped: "Poker session row has no usable date."
    };
  }

  const location = pick(record, ["Location", "Venue", "Site"]) || context.defaultLocation || "Imported session";
  const stakes = pick(record, ["Stake", "Stakes", "Blinds", "Tourney Type", "Tournament Type"]) || context.defaultStakes || "";
  const buyIn = parseMoney(pick(record, ["Buy In", "Buy-In", "Buyin"]));
  const cashOut = parseMoney(pick(record, ["Cashed Out", "Cash Out", "Cashout"]));
  const explicitProfit = parseMoney(pick(record, ["Profit", "Result", "Net"]));
  const playTime = parseDurationHours(pick(record, ["Play Time", "Duration", "Hours"]));
  const hours = playTime ?? hoursBetween(
    startedAtText,
    endedAtText,
    pick(record, ["Break Minutes", "Break"])
  ) ?? 0;
  const locationType = pick(record, ["Location Type", "Type"]);
  const sourceId = pick(record, ["SessionId", "Session ID", "Id"]);
  const game = pick(record, ["Game", "Game Type"]);
  const limitType = pick(record, ["Limit Type", "Limit"]);
  const tournamentType = pick(record, ["Tourney Type", "Tournament Type"]);
  const bankrollName = pick(record, ["Bankroll", "Bankroll Name"]) || context.bankrollName;
  const note = pick(record, ["Note", "Notes"]);
  const tableSize = parsePositiveInteger(pick(record, ["Table Size", "Players"]), normalizeKey(locationType) === "online" ? 6 : 9);
  const startedAt = parseDateTime(startedAtText);
  const endedAt = parseDateTime(endedAtText);
  const profit = explicitProfit ?? (
    buyIn !== null || cashOut !== null ? (cashOut ?? 0) - (buyIn ?? 0) : null
  );

  if (profit === null) {
    return {
      skipped: "Poker session row has no usable result."
    };
  }

  const session = {
    date,
    location,
    gameType,
    stakes,
    tableSize,
    hours,
    buyIn,
    cashOut,
    profit,
    notes: note,
    bankrollName,
    locationType,
    state,
    externalId: sourceId,
    importSource: context.source,
    startedAt,
    endedAt,
    importedGame: [limitType, game, tournamentType].filter(Boolean).join(" ").trim()
  };
  session.externalKey = importedSessionKey(record, [
    gameType,
    date,
    startedAtText,
    endedAtText,
    location,
    stakes,
    buyIn,
    cashOut,
    profit
  ], gameType);

  return {
    session
  };
}

function genericSessionFromRecord(record, context) {
  const date = parseDate(pick(record, ["Date", "Session Date", "Played At", "Start Time"]));
  const location = pick(record, ["Location", "Venue", "Site"]) || context.defaultLocation || "Imported session";
  const profit = parseMoney(pick(record, ["Profit", "Result", "Net", "Amount"]));

  if (!date || profit === null) {
    return {
      skipped: "Session row is missing date or result."
    };
  }

  const stakes = pick(record, ["Stake", "Stakes", "Blinds"]) || context.defaultStakes || "";
  const session = {
    date,
    location,
    gameType: pick(record, ["Game Type", "Game"]) || "cash",
    stakes,
    tableSize: parseInteger(pick(record, ["Table Size", "Players"]), 6),
    hours: parseDurationHours(pick(record, ["Hours", "Play Time", "Duration"])) ?? 0,
    buyIn: parseMoney(pick(record, ["Buy In", "Buy-In", "Buyin"])),
    cashOut: parseMoney(pick(record, ["Cashed Out", "Cash Out", "Cashout"])),
    profit,
    notes: pick(record, ["Note", "Notes"]),
    bankrollName: pick(record, ["Bankroll", "Bankroll Name"]) || context.bankrollName,
    externalId: pick(record, ["SessionId", "Session ID", "Id"]),
    importSource: context.source
  };
  session.externalKey = importedSessionKey(record, [
    date,
    location,
    stakes,
    session.hours,
    session.buyIn,
    session.cashOut,
    profit
  ], session.gameType);

  return {
    session
  };
}

export function parseBankrollImport(rawText, options = {}) {
  const rows = parseCsvRows(rawText);
  const sessions = [];
  const transactions = [];
  const skippedRows = [];
  const context = {
    source: cleanText(options.source) || "bankroll-export",
    bankrollName: cleanText(options.bankrollName),
    defaultLocation: cleanText(options.defaultLocation),
    defaultStakes: cleanText(options.defaultStakes)
  };
  let currentSection = "";
  let pendingSingleHeader = "";
  let header = null;
  let kind = null;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    if (isBlankRow(row)) {
      return;
    }

    const single = onlyCell(row);
    if (single) {
      const normalizedSingle = normalizeKey(single);

      if (pendingSingleHeader === "bankrollname") {
        context.bankrollName = single;
        pendingSingleHeader = "";
        return;
      }

      if (normalizedSingle === "bankrollname") {
        pendingSingleHeader = "bankrollname";
        return;
      }

      if (pokerSessionSections.has(normalizedSingle)) {
        currentSection = pokerSessionSections.get(normalizedSingle);
        header = null;
        kind = null;
        return;
      }
    }

    const nextKind = headerKind(row);
    if (nextKind) {
      header = row;
      kind = nextKind;
      return;
    }

    if (!header || !kind) {
      return;
    }

    const record = rowToRecord(header, row);

    if (kind === "transaction") {
      const result = transactionFromRecord(record, context);

      if (result.transaction) {
        transactions.push({
          ...result.transaction,
          importRowNumber: rowNumber
        });
      } else {
        skippedRows.push({
          rowNumber,
          section: "transactions",
          reason: result.skipped ?? "Transaction row could not be imported."
        });
      }
      return;
    }

    context.currentGameType = currentSection || "cash";
    const result = kind === "poker-session"
      ? pokerSessionFromRecord(record, context)
      : genericSessionFromRecord(record, context);

    if (result.session) {
      sessions.push({
        ...result.session,
        importRowNumber: rowNumber
      });
    } else {
      skippedRows.push({
        rowNumber,
        section: kind,
        reason: result.skipped ?? "Row could not be imported."
      });
    }
  });

  return {
    sessions,
    transactions,
    skippedRows,
    parsedRowCount: rows.length,
    source: context.source
  };
}

export function planBankrollImport(parsed, {
  existingSessionKeys = new Set(),
  existingTransactionKeys = new Set()
} = {}) {
  const sessions = [];
  const transactions = [];
  const duplicateRows = [];
  let duplicateSessionCount = 0;
  let duplicateTransactionCount = 0;

  for (const session of parsed.sessions ?? []) {
    if (session.externalKey && existingSessionKeys.has(session.externalKey)) {
      duplicateSessionCount += 1;
      duplicateRows.push({
        rowNumber: session.importRowNumber,
        section: "poker-session",
        reason: "Session was already imported."
      });
    } else {
      sessions.push(session);
    }
  }

  for (const transaction of parsed.transactions ?? []) {
    if (transaction.externalKey && existingTransactionKeys.has(transaction.externalKey)) {
      duplicateTransactionCount += 1;
      duplicateRows.push({
        rowNumber: transaction.importRowNumber,
        section: "transactions",
        reason: "Transaction was already imported."
      });
    } else {
      transactions.push(transaction);
    }
  }

  const skippedRows = [...(parsed.skippedRows ?? []), ...duplicateRows];

  return {
    source: parsed.source,
    parsedRowCount: parsed.parsedRowCount,
    parsedSessionCount: parsed.sessions?.length ?? 0,
    parsedTransactionCount: parsed.transactions?.length ?? 0,
    readySessionCount: sessions.length,
    readyTransactionCount: transactions.length,
    duplicateCount: duplicateRows.length,
    duplicateSessionCount,
    duplicateTransactionCount,
    skippedCount: skippedRows.length,
    sessions,
    transactions,
    skippedRows: skippedRows.slice(0, 50)
  };
}
