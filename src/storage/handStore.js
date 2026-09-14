import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { buildDecisionBreakdown, buildStudyPlan, normalizeDecisionReviewPatch } from "../core/decisionReview.js";
import { buildReviewQueue, normalizeReviewPatch } from "../core/handReview.js";
import { handKey, hashText } from "../core/importIdentity.js";
import {
  hasPreparedBankrollRows,
  parseBankrollImport,
  planBankrollImport,
  planPreparedBankrollImport
} from "../core/bankrollImport.js";
import { buildBankrollTransaction, summarizeBankrollTransactions } from "../core/bankrollTransactions.js";
import { buildLiveHand } from "../core/liveHandBuilder.js";
import { buildSessionDetail } from "../core/sessionInsights.js";
import { buildBankrollSession, summarizeBankrollSessions } from "../core/sessionTracker.js";
import { buildTagPerformance, filterHandLibrary, findSimilarHands } from "../core/studyTools.js";
import { buildWorkspaceExport } from "../core/workspaceExport.js";
import { buildWorkspaceRestorePlan, publicWorkspaceRestorePlan, workspaceRestoreResult } from "../core/workspaceRestore.js";

function emptyState() {
  return {
    imports: [],
    hands: [],
    bankrollSessions: [],
    bankrollTransactions: []
  };
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function bankrollSessionKey(session) {
  return session.externalKey || "";
}

function bankrollTransactionKey(transaction) {
  return transaction.externalKey || "";
}

export class HandStore {
  constructor({ persistencePath } = {}) {
    this.persistencePath = persistencePath ?? null;
    this.state = this.load();
  }

  load() {
    if (!this.persistencePath || !existsSync(this.persistencePath)) {
      return emptyState();
    }

    const state = JSON.parse(readFileSync(this.persistencePath, "utf8"));
    return {
      imports: Array.isArray(state.imports) ? state.imports : [],
      hands: Array.isArray(state.hands) ? state.hands.map((hand) => ({
        ...hand,
        tags: Array.isArray(hand.tags) ? hand.tags : [],
        notes: hand.notes ?? "",
        reviewedAt: hand.reviewedAt ?? null,
        decisionReviews: hand.decisionReviews && typeof hand.decisionReviews === "object" ? hand.decisionReviews : {},
        handKey: hand.handKey ?? handKey(hand)
      })) : [],
      bankrollSessions: Array.isArray(state.bankrollSessions) ? state.bankrollSessions : [],
      bankrollTransactions: Array.isArray(state.bankrollTransactions) ? state.bankrollTransactions : []
    };
  }

  save() {
    if (!this.persistencePath) {
      return;
    }

    mkdirSync(dirname(this.persistencePath), { recursive: true });
    writeFileSync(this.persistencePath, JSON.stringify(this.state, null, 2));
  }

  addImport({ name, source, rawText, hands, sessionId }) {
    const rawHash = hashText(rawText);
    const existingImport = this.state.imports.find((record) => record.rawHash === rawHash);

    if (existingImport) {
      if (sessionId && existingImport.sessionId !== sessionId) {
        this.updateImportSession(existingImport.id, sessionId);
      }

      return {
        import: this.state.imports.find((record) => record.id === existingImport.id),
        hands: this.state.hands.filter((hand) => hand.importId === existingImport.id),
        duplicate: true,
        skippedCount: hands.length
      };
    }

    const importedAt = new Date().toISOString();
    const existingHandKeys = new Set(this.state.hands.map((hand) => hand.handKey ?? handKey(hand)));
    const newHands = hands
      .map((hand) => ({
        ...hand,
        handKey: handKey(hand)
      }))
      .filter((hand) => !existingHandKeys.has(hand.handKey));

    if (newHands.length === 0) {
      const incomingKeys = new Set(hands.map(handKey));
      const matchingHand = this.state.hands.find((hand) => incomingKeys.has(hand.handKey ?? handKey(hand)));
      const matchingImport = this.state.imports.find((record) => record.id === matchingHand?.importId);

      if (matchingImport) {
        return {
          import: matchingImport,
          hands: this.state.hands.filter((hand) => hand.importId === matchingImport.id),
          duplicate: true,
          skippedCount: hands.length
        };
      }
    }

    const importRecord = {
      id: createId("imp"),
      name: name || `Import ${this.state.imports.length + 1}`,
      source: source || "manual-upload",
      sessionId: sessionId || null,
      handCount: newHands.length,
      parsedHandCount: hands.length,
      skippedCount: hands.length - newHands.length,
      rawBytes: Buffer.byteLength(rawText, "utf8"),
      rawHash,
      importedAt
    };

    const storedHands = newHands.map((hand) => ({
      ...hand,
      id: createId("hand"),
      importId: importRecord.id,
      sessionId: importRecord.sessionId,
      tags: Array.isArray(hand.tags) ? hand.tags : [],
      notes: hand.notes ?? "",
      reviewedAt: hand.reviewedAt ?? null,
      decisionReviews: hand.decisionReviews && typeof hand.decisionReviews === "object" ? hand.decisionReviews : {},
      importedAt
    }));

    this.state.imports.unshift(importRecord);
    this.state.hands.unshift(...storedHands);
    this.save();

    return {
      import: importRecord,
      hands: storedHands
    };
  }

  listImports() {
    return [...this.state.imports];
  }

  createLiveHand(payload) {
    const hand = buildLiveHand(payload);
    const result = this.addImport({
      name: payload.name || `Live hand ${hand.handNumber}`,
      source: "live-entry",
      rawText: JSON.stringify({
        kind: "live-hand",
        hand
      }),
      hands: [hand],
      sessionId: payload.sessionId
    });

    return {
      import: result.import,
      hand: result.hands[0] ?? null,
      duplicate: Boolean(result.duplicate)
    };
  }

  listHands({ limit = 100, player, position, importId, sessionId } = {}) {
    let hands = [...this.state.hands];

    if (importId) {
      hands = hands.filter((hand) => hand.importId === importId);
    }

    if (sessionId) {
      hands = hands.filter((hand) => hand.sessionId === sessionId);
    }

    if (player) {
      hands = hands.filter((hand) => hand.players.some((seat) => seat.name === player));
    }

    if (position && player) {
      hands = hands.filter((hand) => {
        const seat = hand.players.find((entry) => entry.name === player);
        return seat?.position === position;
      });
    }

    return hands.slice(0, limit);
  }

  getHand(id) {
    return this.state.hands.find((hand) => hand.id === id) ?? null;
  }

  updateHandReview(id, payload) {
    const existingHand = this.getHand(id);

    if (!existingHand) {
      throw new Error("Hand not found.");
    }

    const review = normalizeReviewPatch(payload, existingHand);
    Object.assign(existingHand, review);
    this.save();

    return existingHand;
  }

  decisionReview(id) {
    const existingHand = this.getHand(id);

    if (!existingHand) {
      throw new Error("Hand not found.");
    }

    return buildDecisionBreakdown(existingHand);
  }

  updateDecisionReview(id, decisionId, payload) {
    const existingHand = this.getHand(id);

    if (!existingHand) {
      throw new Error("Hand not found.");
    }

    const report = buildDecisionBreakdown(existingHand);
    if (!report.decisions.some((decision) => decision.id === decisionId)) {
      throw new Error("Decision not found.");
    }

    const existingReviews = existingHand.decisionReviews && typeof existingHand.decisionReviews === "object"
      ? existingHand.decisionReviews
      : {};
    existingHand.decisionReviews = {
      ...existingReviews,
      [decisionId]: normalizeDecisionReviewPatch(payload, existingReviews[decisionId] ?? {})
    };
    existingHand.decisionReviewUpdatedAt = new Date().toISOString();
    this.save();

    return {
      hand: existingHand,
      review: existingHand.decisionReviews[decisionId],
      report: buildDecisionBreakdown(existingHand)
    };
  }

  studyPlan() {
    return buildStudyPlan(this.listHands({ limit: 1000 }));
  }

  reviewQueue(filters = {}) {
    return buildReviewQueue(this.listHands({ limit: 1000 }), filters);
  }

  handLibrary(filters = {}) {
    return filterHandLibrary(this.listHands({ limit: 1000 }), filters);
  }

  tagPerformance() {
    return buildTagPerformance(this.listHands({ limit: 1000 }));
  }

  similarHands(id, filters = {}) {
    return findSimilarHands(this.listHands({ limit: 1000 }), id, filters);
  }

  updateImportSession(importId, sessionId) {
    const existingImport = this.state.imports.find((record) => record.id === importId || record.importId === importId);

    if (!existingImport) {
      throw new Error("Import not found.");
    }

    const nextSessionId = sessionId || null;
    existingImport.sessionId = nextSessionId;
    for (const hand of this.state.hands) {
      if (hand.importId === existingImport.id || hand.importId === existingImport.importId) {
        hand.sessionId = nextSessionId;
      }
    }
    this.save();

    return {
      import: existingImport,
      updatedHands: this.state.hands.filter((hand) => (
        hand.importId === existingImport.id || hand.importId === existingImport.importId
      )).length
    };
  }

  listBankrollSessions() {
    return [...this.state.bankrollSessions].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  getBankrollSession(id) {
    return this.state.bankrollSessions.find((session) => session.id === id || session.sessionId === id) ?? null;
  }

  createBankrollSession(payload) {
    const id = createId("sess");
    const session = buildBankrollSession(payload, {
      id
    });

    this.state.bankrollSessions.unshift(session);
    this.save();

    return session;
  }

  parseBankrollImportPlan(payload = {}) {
    if (hasPreparedBankrollRows(payload)) {
      return this.preparedBankrollImportPlan(payload);
    }

    const rawText = payload.rawText ?? payload.text ?? "";
    if (!String(rawText).trim()) {
      throw new Error("Paste or upload a bankroll export first.");
    }

    const parsed = parseBankrollImport(rawText, {
      source: payload.source,
      bankrollName: payload.bankrollName,
      defaultLocation: payload.defaultLocation,
      defaultStakes: payload.defaultStakes
    });
    const existingKeys = new Set(this.state.bankrollSessions.map(bankrollSessionKey).filter(Boolean));
    const existingTransactionKeys = new Set(this.state.bankrollTransactions.map(bankrollTransactionKey).filter(Boolean));

    return planBankrollImport(parsed, {
      existingSessionKeys: existingKeys,
      existingTransactionKeys
    });
  }

  preparedBankrollImportPlan(payload = {}) {
    const existingKeys = new Set(this.state.bankrollSessions.map(bankrollSessionKey).filter(Boolean));
    const existingTransactionKeys = new Set(this.state.bankrollTransactions.map(bankrollTransactionKey).filter(Boolean));

    return planPreparedBankrollImport(payload, {
      existingSessionKeys: existingKeys,
      existingTransactionKeys
    });
  }

  previewBankrollImport(payload = {}) {
    return this.parseBankrollImportPlan(payload);
  }

  importBankrollSessions(payload = {}) {
    const plan = this.parseBankrollImportPlan(payload);
    const importedAt = new Date().toISOString();
    const sessions = [];
    const transactions = [];

    for (const sessionPayload of plan.sessions) {
      const id = createId("sess");
      const session = buildBankrollSession({
        ...sessionPayload,
        importedAt
      }, {
        id,
        createdAt: importedAt,
        updatedAt: importedAt
      });

      sessions.push(session);
    }

    for (const transactionPayload of plan.transactions) {
      const id = createId("txn");
      const transaction = buildBankrollTransaction({
        ...transactionPayload,
        importedAt
      }, {
        id,
        createdAt: importedAt,
        updatedAt: importedAt
      });

      transactions.push(transaction);
    }

    if (sessions.length > 0 || transactions.length > 0) {
      this.state.bankrollSessions = [...sessions, ...this.state.bankrollSessions];
      this.state.bankrollTransactions = [...transactions, ...this.state.bankrollTransactions];
      this.save();
    }

    return {
      importedCount: sessions.length,
      importedSessionCount: sessions.length,
      importedTransactionCount: transactions.length,
      parsedSessionCount: plan.parsedSessionCount,
      parsedTransactionCount: plan.parsedTransactionCount,
      skippedCount: plan.skippedCount,
      duplicateCount: plan.duplicateCount,
      duplicateSessionCount: plan.duplicateSessionCount,
      duplicateTransactionCount: plan.duplicateTransactionCount,
      uncheckedCount: plan.uncheckedCount ?? 0,
      parsedRowCount: plan.parsedRowCount,
      source: plan.source,
      sessions,
      transactions,
      skippedRows: plan.skippedRows
    };
  }

  listBankrollTransactions() {
    return [...this.state.bankrollTransactions].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  getBankrollTransaction(id) {
    return this.state.bankrollTransactions.find(
      (transaction) => transaction.id === id || transaction.transactionId === id
    ) ?? null;
  }

  createBankrollTransaction(payload) {
    const id = createId("txn");
    const transaction = buildBankrollTransaction(payload, {
      id
    });

    this.state.bankrollTransactions.unshift(transaction);
    this.save();

    return transaction;
  }

  updateBankrollTransaction(id, payload) {
    const existingTransaction = this.getBankrollTransaction(id);

    if (!existingTransaction) {
      throw new Error("Bankroll transaction not found.");
    }

    const updatedTransaction = buildBankrollTransaction({
      ...existingTransaction,
      ...payload,
      id: existingTransaction.id,
      transactionId: existingTransaction.transactionId
    }, {
      id: existingTransaction.transactionId ?? existingTransaction.id,
      createdAt: existingTransaction.createdAt,
      updatedAt: new Date().toISOString()
    });

    this.state.bankrollTransactions = this.state.bankrollTransactions.map((transaction) =>
      transaction.id === existingTransaction.id || transaction.transactionId === existingTransaction.transactionId
        ? updatedTransaction
        : transaction
    );
    this.save();

    return updatedTransaction;
  }

  deleteBankrollTransaction(id) {
    const existingTransaction = this.getBankrollTransaction(id);

    if (!existingTransaction) {
      throw new Error("Bankroll transaction not found.");
    }

    this.state.bankrollTransactions = this.state.bankrollTransactions.filter(
      (transaction) => transaction.id !== id && transaction.transactionId !== id
    );
    this.save();

    return {
      transaction: existingTransaction
    };
  }

  bankrollTransactionSummary() {
    return summarizeBankrollTransactions(this.state.bankrollTransactions);
  }

  updateBankrollSession(id, payload) {
    const existingSession = this.getBankrollSession(id);

    if (!existingSession) {
      throw new Error("Bankroll session not found.");
    }

    const updatedSession = buildBankrollSession({
      ...existingSession,
      ...payload,
      id: existingSession.id,
      sessionId: existingSession.sessionId
    }, {
      id: existingSession.sessionId ?? existingSession.id,
      createdAt: existingSession.createdAt,
      updatedAt: new Date().toISOString()
    });

    this.state.bankrollSessions = this.state.bankrollSessions.map((session) =>
      session.id === existingSession.id || session.sessionId === existingSession.sessionId
        ? updatedSession
        : session
    );
    this.save();

    return updatedSession;
  }

  deleteBankrollSession(id) {
    const existingSession = this.getBankrollSession(id);

    if (!existingSession) {
      throw new Error("Bankroll session not found.");
    }

    const existingSessionId = existingSession.sessionId ?? existingSession.id;
    const unlinkedImports = this.state.imports.filter((record) => record.sessionId === existingSessionId);

    this.state.bankrollSessions = this.state.bankrollSessions.filter(
      (session) => session.id !== id && session.sessionId !== id
    );
    for (const record of this.state.imports) {
      if (record.sessionId === existingSessionId) {
        record.sessionId = null;
      }
    }
    for (const hand of this.state.hands) {
      if (hand.sessionId === existingSessionId) {
        hand.sessionId = null;
      }
    }
    this.save();

    return {
      session: existingSession,
      unlinkedImports
    };
  }

  bankrollSummary() {
    return summarizeBankrollSessions(this.state.bankrollSessions);
  }

  bankrollSessionDetail(id) {
    const session = this.getBankrollSession(id);
    const sessionId = session?.sessionId ?? session?.id;

    return buildSessionDetail({
      session,
      imports: this.state.imports.filter((record) => record.sessionId === sessionId),
      hands: this.listHands({ sessionId, limit: 1000 })
    });
  }

  workspaceExport({ mode = "local" } = {}) {
    return buildWorkspaceExport({
      mode,
      imports: [...this.state.imports],
      hands: [...this.state.hands],
      bankrollSessions: this.listBankrollSessions(),
      bankrollTransactions: this.listBankrollTransactions()
    });
  }

  workspaceRestorePlan(payload = {}) {
    return buildWorkspaceRestorePlan(payload, {
      imports: this.state.imports,
      hands: this.state.hands,
      bankrollSessions: this.state.bankrollSessions,
      bankrollTransactions: this.state.bankrollTransactions
    });
  }

  previewWorkspaceRestore(payload = {}) {
    return publicWorkspaceRestorePlan(this.workspaceRestorePlan(payload));
  }

  restoreWorkspace(payload = {}) {
    const plan = this.workspaceRestorePlan(payload);
    const restoredAt = new Date().toISOString();

    if (plan.totalReady > 0) {
      this.state.bankrollSessions = [
        ...plan.records.bankrollSessions,
        ...this.state.bankrollSessions
      ];
      this.state.bankrollTransactions = [
        ...plan.records.bankrollTransactions,
        ...this.state.bankrollTransactions
      ];
      this.state.imports = [
        ...plan.records.imports,
        ...this.state.imports
      ];
      this.state.hands = [
        ...plan.records.hands,
        ...this.state.hands
      ];
      this.save();
    }

    return workspaceRestoreResult(plan, { restoredAt });
  }

  deleteImport(id) {
    const existingImport = this.state.imports.find((record) => record.id === id);

    if (!existingImport) {
      throw new Error("Import not found.");
    }

    const removedHands = this.state.hands.filter((hand) => hand.importId === id);
    this.state.imports = this.state.imports.filter((record) => record.id !== id);
    this.state.hands = this.state.hands.filter((hand) => hand.importId !== id);
    this.save();

    return {
      import: existingImport,
      removedHands: removedHands.length,
      hands: removedHands
    };
  }

  clear() {
    const removedImports = this.state.imports.length;
    const removedHands = this.state.hands.length;
    this.state.imports = [];
    this.state.hands = [];
    this.save();

    return {
      removedImports,
      removedHands
    };
  }
}
