const transactionTypes = new Set(["deposit", "withdrawal", "transfer", "initial", "adjustment"]);

function finiteNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function optionalTextFields(payload, fields) {
  return fields.reduce((metadata, field) => {
    const value = payload[field];
    const text = String(value ?? "").trim();
    if (text) {
      metadata[field] = text;
    }
    return metadata;
  }, {});
}

export function normalizeBankrollTransactionType(value, amount = 0, note = "") {
  const type = String(value ?? "").trim().toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

  if (transactionTypes.has(type)) {
    return type;
  }

  const noteKey = String(note ?? "").toLowerCase();
  if (noteKey.includes("initial")) {
    return "initial";
  }

  if (noteKey.includes("withdraw")) {
    return "withdrawal";
  }

  if (noteKey.includes("transfer")) {
    return "transfer";
  }

  if (noteKey.includes("deposit") || noteKey.includes("add")) {
    return "deposit";
  }

  return Number(amount) < 0 ? "withdrawal" : "deposit";
}

export function buildBankrollTransaction(payload = {}, defaults = {}) {
  const amount = round(finiteNumber(payload.amount));
  const note = String(payload.note ?? payload.notes ?? "").trim();
  const createdAt = defaults.createdAt ?? new Date().toISOString();
  const date = String(payload.date || payload.transactionDate || payload.transactionAt || todayIsoDate()).slice(0, 10);
  const metadata = optionalTextFields(payload, [
    "bankrollName",
    "externalId",
    "externalKey",
    "importSource",
    "transactionAt",
    "sourceUpdatedAt",
    "importedAt"
  ]);

  return {
    id: defaults.id ?? payload.id ?? payload.transactionId,
    transactionId: defaults.id ?? payload.transactionId ?? payload.id,
    date,
    type: normalizeBankrollTransactionType(payload.type, amount, note),
    amount,
    note,
    ...metadata,
    ...(payload.importRowNumber === undefined || payload.importRowNumber === null
      ? {}
      : { importRowNumber: Math.trunc(finiteNumber(payload.importRowNumber)) }),
    createdAt,
    updatedAt: defaults.updatedAt ?? createdAt
  };
}

function sortByDateAsc(transactions) {
  return [...transactions].sort((a, b) => {
    const dateCompare = String(a.date).localeCompare(String(b.date));
    return dateCompare === 0
      ? String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
      : dateCompare;
  });
}

function groupTransactions(transactions) {
  const groups = new Map();

  for (const transaction of transactions) {
    const current = groups.get(transaction.type) ?? {
      type: transaction.type,
      count: 0,
      amount: 0
    };
    current.count += 1;
    current.amount += transaction.amount;
    groups.set(transaction.type, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      amount: round(group.amount)
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export function summarizeBankrollTransactions(rawTransactions = []) {
  const transactions = rawTransactions.map((transaction) => buildBankrollTransaction(transaction, {
    id: transaction.transactionId ?? transaction.id,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt
  }));
  const ordered = sortByDateAsc(transactions);
  let cumulativeAmount = 0;

  const points = ordered.map((transaction) => {
    cumulativeAmount += transaction.amount;
    return {
      transactionId: transaction.transactionId ?? transaction.id,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
      cumulativeAmount: round(cumulativeAmount)
    };
  });
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const inflow = transactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const outflow = transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  return {
    transactionCount: transactions.length,
    totalAmount: round(totalAmount),
    inflow: round(inflow),
    outflow: round(outflow),
    points,
    byType: groupTransactions(transactions),
    recentTransactions: [...transactions]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 8)
  };
}
