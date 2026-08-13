import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBankrollTransaction,
  summarizeBankrollTransactions
} from "../src/core/bankrollTransactions.js";

test("buildBankrollTransaction normalizes imported ledger rows", () => {
  const transaction = buildBankrollTransaction({
    date: "2026-08-13",
    amount: "-250.125",
    note: "Withdrawal to checking",
    bankrollName: "Default"
  }, {
    id: "txn_1",
    createdAt: "2026-08-13T10:00:00.000Z"
  });

  assert.equal(transaction.id, "txn_1");
  assert.equal(transaction.transactionId, "txn_1");
  assert.equal(transaction.amount, -250.12);
  assert.equal(transaction.type, "withdrawal");
  assert.equal(transaction.bankrollName, "Default");
});

test("summarizeBankrollTransactions returns ledger totals", () => {
  const summary = summarizeBankrollTransactions([
    { transactionId: "txn_1", date: "2026-08-01", type: "initial", amount: 1000 },
    { transactionId: "txn_2", date: "2026-08-02", type: "deposit", amount: 300 },
    { transactionId: "txn_3", date: "2026-08-03", type: "withdrawal", amount: -120 }
  ]);

  assert.equal(summary.transactionCount, 3);
  assert.equal(summary.totalAmount, 1180);
  assert.equal(summary.inflow, 1300);
  assert.equal(summary.outflow, 120);
  assert.equal(summary.points.at(-1).cumulativeAmount, 1180);
});
