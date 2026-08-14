import { buildBankrollTransaction } from "./bankrollTransactions.js";
import { handKey } from "./importIdentity.js";
import { buildBankrollSession } from "./sessionTracker.js";

export const workspaceRestoreSchemaVersion = "2.3.0";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactKeys(values) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function stableText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function numericText(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "";
}

function primaryId(record, fields, fallback) {
  for (const field of fields) {
    const value = String(record?.[field] ?? "").trim();
    if (value) {
      return value;
    }
  }

  return fallback;
}

function recordKeyIndex(records, keyBuilder) {
  const index = new Map();

  for (const record of records) {
    for (const key of keyBuilder(record)) {
      if (!index.has(key)) {
        index.set(key, record);
      }
    }
  }

  return index;
}

function findMatch(index, keys) {
  for (const key of keys) {
    const match = index.get(key);
    if (match) {
      return match;
    }
  }

  return null;
}

function addRecordToIndex(index, record, keyBuilder) {
  for (const key of keyBuilder(record)) {
    if (!index.has(key)) {
      index.set(key, record);
    }
  }
}

function sessionKeys(session = {}) {
  const normalized = buildBankrollSession(session, {
    id: session.sessionId ?? session.id,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  });

  return compactKeys([
    normalized.id && `session:id:${normalized.id}`,
    normalized.sessionId && `session:id:${normalized.sessionId}`,
    normalized.externalKey && `session:external:${normalized.externalKey}`,
    [
      "session:logical",
      normalized.date,
      stableText(normalized.location),
      stableText(normalized.gameType),
      stableText(normalized.stakes),
      numericText(normalized.hours),
      numericText(normalized.buyIn),
      numericText(normalized.cashOut),
      numericText(normalized.profit)
    ].join("|")
  ]);
}

function transactionKeys(transaction = {}) {
  const normalized = buildBankrollTransaction(transaction, {
    id: transaction.transactionId ?? transaction.id,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt
  });

  return compactKeys([
    normalized.id && `transaction:id:${normalized.id}`,
    normalized.transactionId && `transaction:id:${normalized.transactionId}`,
    normalized.externalKey && `transaction:external:${normalized.externalKey}`,
    [
      "transaction:logical",
      normalized.date,
      stableText(normalized.type),
      numericText(normalized.amount),
      stableText(normalized.bankrollName),
      stableText(normalized.note)
    ].join("|")
  ]);
}

function importKeys(record = {}) {
  return compactKeys([
    record.importId && `import:id:${record.importId}`,
    record.id && `import:id:${record.id}`,
    record.rawHash && `import:hash:${record.rawHash}`
  ]);
}

function safeHandKey(hand) {
  if (hand?.handKey) {
    return hand.handKey;
  }

  if (!Array.isArray(hand?.players) || !Array.isArray(hand?.board)) {
    return "";
  }

  try {
    return handKey(hand);
  } catch {
    return "";
  }
}

function handKeys(hand = {}) {
  return compactKeys([
    hand.handId && `hand:id:${hand.handId}`,
    hand.id && `hand:id:${hand.id}`,
    safeHandKey(hand) && `hand:key:${safeHandKey(hand)}`
  ]);
}

function countRecords(records) {
  return {
    imports: records.imports.length,
    hands: records.hands.length,
    bankrollSessions: records.bankrollSessions.length,
    bankrollTransactions: records.bankrollTransactions.length
  };
}

function totalCounts(counts) {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

function mapIncomingIds(map, record, fields, targetId) {
  for (const field of fields) {
    const value = String(record?.[field] ?? "").trim();
    if (value && targetId) {
      map.set(value, targetId);
    }
  }
}

function remapNullableId(value, idMap) {
  const key = String(value ?? "").trim();
  if (!key) {
    return null;
  }

  return idMap.get(key) ?? key;
}

function normalizeImport(record = {}, index, { sessionIdMap }) {
  const importId = primaryId(record, ["importId", "id"], `imp_restore_${index + 1}`);
  const sessionId = remapNullableId(record.sessionId, sessionIdMap);

  return {
    ...record,
    id: importId,
    importId,
    sessionId,
    status: record.status === "failed" ? "failed" : "ready",
    handCount: Math.max(0, Number(record.handCount ?? 0) || 0),
    parsedHandCount: Math.max(0, Number(record.parsedHandCount ?? record.handCount ?? 0) || 0),
    skippedCount: Math.max(0, Number(record.skippedCount ?? 0) || 0),
    rawBytes: Math.max(0, Number(record.rawBytes ?? 0) || 0),
    rawHash: record.rawHash ?? null,
    importedAt: record.importedAt ?? new Date().toISOString(),
    parsedAt: record.parsedAt ?? record.importedAt ?? null,
    errorMessage: record.errorMessage ?? null
  };
}

function normalizeHand(record = {}, index, { sessionIdMap, importIdMap }) {
  const handId = primaryId(record, ["handId", "id"], `hand_restore_${index + 1}`);
  const normalized = {
    ...record,
    id: handId,
    handId,
    importId: remapNullableId(record.importId, importIdMap),
    sessionId: remapNullableId(record.sessionId, sessionIdMap),
    players: asArray(record.players),
    holeCards: record.holeCards && typeof record.holeCards === "object" ? record.holeCards : {},
    board: asArray(record.board),
    actions: asArray(record.actions),
    forcedBets: asArray(record.forcedBets),
    winnings: record.winnings && typeof record.winnings === "object" ? record.winnings : {},
    tags: asArray(record.tags),
    notes: record.notes ?? "",
    reviewedAt: record.reviewedAt ?? null,
    decisionReviews: record.decisionReviews && typeof record.decisionReviews === "object"
      ? record.decisionReviews
      : {},
    importedAt: record.importedAt ?? new Date().toISOString()
  };
  normalized.handKey = safeHandKey(normalized) || `restore:${handId}`;

  return normalized;
}

function normalizeSession(record = {}, index) {
  const sessionId = primaryId(record, ["sessionId", "id"], `sess_restore_${index + 1}`);

  return buildBankrollSession(record, {
    id: sessionId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

function normalizeTransaction(record = {}, index) {
  const transactionId = primaryId(record, ["transactionId", "id"], `txn_restore_${index + 1}`);

  return buildBankrollTransaction(record, {
    id: transactionId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

export function parseWorkspaceRestorePayload(payload = {}) {
  const source = payload.rawText ?? payload.text ?? payload.backup ?? payload;
  let backup = source;

  if (typeof source === "string") {
    if (!source.trim()) {
      throw new Error("Paste or upload a Backup JSON file first.");
    }

    backup = JSON.parse(source);
  }

  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new Error("Invalid Backup JSON.");
  }

  const records = {
    imports: asArray(backup.imports),
    hands: asArray(backup.hands),
    bankrollSessions: asArray(backup.bankrollSessions ?? backup.sessions),
    bankrollTransactions: asArray(backup.bankrollTransactions ?? backup.transactions)
  };

  if (totalCounts(countRecords(records)) === 0) {
    throw new Error("Backup JSON does not contain restorable Backdoor Flush data.");
  }

  return {
    app: backup.app ?? "Unknown",
    schemaVersion: backup.schemaVersion ?? "unknown",
    exportedAt: backup.exportedAt ?? null,
    mode: backup.mode ?? "unknown",
    records
  };
}

export function buildWorkspaceRestorePlan(payload = {}, existing = {}) {
  const backup = parseWorkspaceRestorePayload(payload);
  const existingRecords = {
    imports: asArray(existing.imports),
    hands: asArray(existing.hands),
    bankrollSessions: asArray(existing.bankrollSessions),
    bankrollTransactions: asArray(existing.bankrollTransactions)
  };
  const records = {
    imports: [],
    hands: [],
    bankrollSessions: [],
    bankrollTransactions: []
  };
  const duplicates = {
    imports: [],
    hands: [],
    bankrollSessions: [],
    bankrollTransactions: []
  };
  const sessionIdMap = new Map();
  const importIdMap = new Map();
  const sessionIndex = recordKeyIndex(existingRecords.bankrollSessions, sessionKeys);
  const transactionIndex = recordKeyIndex(existingRecords.bankrollTransactions, transactionKeys);
  const importIndex = recordKeyIndex(existingRecords.imports, importKeys);
  const handIndex = recordKeyIndex(existingRecords.hands, handKeys);
  const warnings = [];

  if (backup.app !== "Backdoor Flush") {
    warnings.push(`Backup source is ${backup.app}, not Backdoor Flush.`);
  }

  backup.records.bankrollSessions.forEach((record, index) => {
    const normalized = normalizeSession(record, index);
    const match = findMatch(sessionIndex, sessionKeys(normalized));
    const targetId = match?.sessionId ?? match?.id ?? normalized.sessionId;

    mapIncomingIds(sessionIdMap, record, ["sessionId", "id"], targetId);
    mapIncomingIds(sessionIdMap, normalized, ["sessionId", "id"], targetId);

    if (match) {
      duplicates.bankrollSessions.push(normalized);
      return;
    }

    records.bankrollSessions.push(normalized);
    addRecordToIndex(sessionIndex, normalized, sessionKeys);
  });

  backup.records.bankrollTransactions.forEach((record, index) => {
    const normalized = normalizeTransaction(record, index);
    const match = findMatch(transactionIndex, transactionKeys(normalized));

    if (match) {
      duplicates.bankrollTransactions.push(normalized);
      return;
    }

    records.bankrollTransactions.push(normalized);
    addRecordToIndex(transactionIndex, normalized, transactionKeys);
  });

  backup.records.imports.forEach((record, index) => {
    const normalized = normalizeImport(record, index, { sessionIdMap });
    const match = findMatch(importIndex, importKeys(normalized));
    const targetId = match?.importId ?? match?.id ?? normalized.importId;

    mapIncomingIds(importIdMap, record, ["importId", "id"], targetId);
    mapIncomingIds(importIdMap, normalized, ["importId", "id"], targetId);

    if (match) {
      duplicates.imports.push(normalized);
      return;
    }

    records.imports.push(normalized);
    addRecordToIndex(importIndex, normalized, importKeys);
  });

  backup.records.hands.forEach((record, index) => {
    const normalized = normalizeHand(record, index, { sessionIdMap, importIdMap });
    const match = findMatch(handIndex, handKeys(normalized));

    if (match) {
      duplicates.hands.push(normalized);
      return;
    }

    records.hands.push(normalized);
    addRecordToIndex(handIndex, normalized, handKeys);
  });

  const incomingCounts = countRecords(backup.records);
  const readyCounts = countRecords(records);
  const duplicateCounts = countRecords(duplicates);

  return {
    schemaVersion: workspaceRestoreSchemaVersion,
    mode: "merge",
    source: {
      app: backup.app,
      schemaVersion: backup.schemaVersion,
      exportedAt: backup.exportedAt,
      mode: backup.mode
    },
    incomingCounts,
    readyCounts,
    duplicateCounts,
    totalReady: totalCounts(readyCounts),
    totalDuplicate: totalCounts(duplicateCounts),
    warnings,
    records,
    duplicates
  };
}

function previewRecords(records, limit = 5) {
  return {
    imports: records.imports.slice(0, limit),
    hands: records.hands.slice(0, limit),
    bankrollSessions: records.bankrollSessions.slice(0, limit),
    bankrollTransactions: records.bankrollTransactions.slice(0, limit)
  };
}

export function publicWorkspaceRestorePlan(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    mode: plan.mode,
    source: plan.source,
    incomingCounts: plan.incomingCounts,
    readyCounts: plan.readyCounts,
    duplicateCounts: plan.duplicateCounts,
    totalReady: plan.totalReady,
    totalDuplicate: plan.totalDuplicate,
    warnings: plan.warnings,
    ...previewRecords(plan.records)
  };
}

export function workspaceRestoreResult(plan, { restoredAt = new Date().toISOString() } = {}) {
  return {
    ...publicWorkspaceRestorePlan(plan),
    restoredAt,
    restoredCounts: plan.readyCounts
  };
}
