import { summarizeBankrollTransactions } from "./bankrollTransactions.js";
import { summarizeBankrollSessions } from "./sessionTracker.js";

export const workspaceExportSchemaVersion = "2.2.0";

export function buildWorkspaceExport({
  mode = "local",
  imports = [],
  hands = [],
  bankrollSessions = [],
  bankrollTransactions = [],
  exportedAt = new Date().toISOString()
} = {}) {
  const safeImports = Array.isArray(imports) ? imports : [];
  const safeHands = Array.isArray(hands) ? hands : [];
  const safeSessions = Array.isArray(bankrollSessions) ? bankrollSessions : [];
  const safeTransactions = Array.isArray(bankrollTransactions) ? bankrollTransactions : [];

  return {
    app: "Backdoor Flush",
    schemaVersion: workspaceExportSchemaVersion,
    exportedAt,
    mode,
    counts: {
      imports: safeImports.length,
      hands: safeHands.length,
      bankrollSessions: safeSessions.length,
      bankrollTransactions: safeTransactions.length
    },
    summaries: {
      bankroll: summarizeBankrollSessions(safeSessions),
      transactions: summarizeBankrollTransactions(safeTransactions)
    },
    imports: safeImports,
    hands: safeHands,
    bankrollSessions: safeSessions,
    bankrollTransactions: safeTransactions
  };
}
