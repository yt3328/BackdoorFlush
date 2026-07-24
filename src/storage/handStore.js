import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

function emptyState() {
  return {
    imports: [],
    hands: []
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

    return JSON.parse(readFileSync(this.persistencePath, "utf8"));
  }

  save() {
    if (!this.persistencePath) {
      return;
    }

    mkdirSync(dirname(this.persistencePath), { recursive: true });
    writeFileSync(this.persistencePath, JSON.stringify(this.state, null, 2));
  }

  addImport({ name, source, rawText, hands }) {
    const importedAt = new Date().toISOString();
    const importRecord = {
      id: createId("imp"),
      name: name || `Import ${this.state.imports.length + 1}`,
      source: source || "manual-upload",
      handCount: hands.length,
      rawBytes: Buffer.byteLength(rawText, "utf8"),
      importedAt
    };

    const storedHands = hands.map((hand) => ({
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

  clear() {
    this.state = emptyState();
    this.save();
  }
}

