import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { handKey, hashText } from "../core/importIdentity.js";
import { buildLiveHand } from "../core/liveHandBuilder.js";
import { buildSessionDetail } from "../core/sessionInsights.js";
import { buildBankrollSession, summarizeBankrollSessions } from "../core/sessionTracker.js";

function emptyState() {
  return {
    imports: [],
    hands: [],
    bankrollSessions: []
  };
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
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
        handKey: hand.handKey ?? handKey(hand)
      })) : [],
      bankrollSessions: Array.isArray(state.bankrollSessions) ? state.bankrollSessions : []
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
      session: existingSession
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

  deleteImport(id) {
    const existingImport = this.state.imports.find((record) => record.id === id);

    if (!existingImport) {
      throw new Error("Import not found.");
    }

    const beforeCount = this.state.hands.length;
    this.state.imports = this.state.imports.filter((record) => record.id !== id);
    this.state.hands = this.state.hands.filter((hand) => hand.importId !== id);
    this.save();

    return {
      import: existingImport,
      removedHands: beforeCount - this.state.hands.length
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
