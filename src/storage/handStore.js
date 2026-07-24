import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { handKey, hashText } from "../core/importIdentity.js";
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

  addImport({ name, source, rawText, hands }) {
    const rawHash = hashText(rawText);
    const existingImport = this.state.imports.find((record) => record.rawHash === rawHash);

    if (existingImport) {
      return {
        import: existingImport,
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

  listHands({ limit = 100, player, position } = {}) {
    let hands = [...this.state.hands];

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

  listBankrollSessions() {
    return [...this.state.bankrollSessions].sort((a, b) => String(b.date).localeCompare(String(a.date)));
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

  deleteBankrollSession(id) {
    const existingSession = this.state.bankrollSessions.find((session) => session.id === id || session.sessionId === id);

    if (!existingSession) {
      throw new Error("Bankroll session not found.");
    }

    this.state.bankrollSessions = this.state.bankrollSessions.filter(
      (session) => session.id !== id && session.sessionId !== id
    );
    this.save();

    return {
      session: existingSession
    };
  }

  bankrollSummary() {
    return summarizeBankrollSessions(this.state.bankrollSessions);
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
