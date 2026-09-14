import { randomUUID } from "node:crypto";
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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the AWS store.`);
  }

  return value;
}

function createId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function rawUploadKey(userId, importId) {
  return `users/${encodeURIComponent(userId)}/imports/${importId}.txt`;
}

function sortByImportedAt(items) {
  return items.sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)));
}

function publicImport(item) {
  return {
    id: item.importId,
    importId: item.importId,
    name: item.name,
    source: item.source,
    sessionId: item.sessionId ?? null,
    status: item.status,
    handCount: item.handCount ?? 0,
    parsedHandCount: item.parsedHandCount ?? 0,
    skippedCount: item.skippedCount ?? 0,
    rawBytes: item.rawBytes ?? 0,
    rawHash: item.rawHash,
    rawKey: item.rawKey,
    importedAt: item.importedAt,
    parsedAt: item.parsedAt ?? null,
    errorMessage: item.errorMessage ?? null
  };
}

function publicHand(item) {
  const { userId, ...rest } = item;
  return {
    ...rest,
    tags: Array.isArray(item.tags) ? item.tags : [],
    notes: item.notes ?? "",
    reviewedAt: item.reviewedAt ?? null,
    decisionReviews: item.decisionReviews && typeof item.decisionReviews === "object" ? item.decisionReviews : {},
    id: item.handId
  };
}

function publicBankrollSession(item) {
  const { userId, ...rest } = item;
  return {
    ...rest,
    id: item.sessionId
  };
}

function publicBankrollTransaction(item) {
  const { userId, sessionId, ...rest } = item;
  return {
    ...rest,
    id: item.transactionId ?? sessionId,
    transactionId: item.transactionId ?? sessionId
  };
}

function storedRestoreImport(record, userId) {
  const { id, rawKey, ...rest } = record;
  return {
    ...rest,
    userId,
    importId: record.importId ?? record.id
  };
}

function storedRestoreHand(record, userId) {
  const { id, ...rest } = record;
  return {
    ...rest,
    userId,
    handId: record.handId ?? record.id
  };
}

function storedRestoreSession(record, userId) {
  const { id, ...rest } = record;
  return {
    ...rest,
    userId,
    entityType: "bankroll-session",
    sessionId: record.sessionId ?? record.id
  };
}

function storedRestoreTransaction(record, userId) {
  const { id, ...rest } = record;
  const transactionId = record.transactionId ?? record.id;
  return {
    ...rest,
    userId,
    entityType: "bankroll-transaction",
    sessionId: transactionId,
    transactionId
  };
}

function bankrollSessionKey(session) {
  return session.externalKey || "";
}

function bankrollTransactionKey(transaction) {
  return transaction.externalKey || "";
}

async function batchWriteAll(dynamo, sdk, requestItems) {
  let pending = requestItems;

  while (Object.keys(pending).length > 0) {
    const result = await dynamo.send(new sdk.BatchWriteCommand({
      RequestItems: pending
    }));
    pending = result.UnprocessedItems ?? {};
  }
}

export class CloudHandStore {
  constructor({ userId, clients }) {
    this.userId = userId;
    this.clients = clients;
    this.importsTable = requiredEnv("IMPORTS_TABLE_NAME");
    this.handsTable = requiredEnv("HANDS_TABLE_NAME");
    this.sessionsTable = requiredEnv("SESSIONS_TABLE_NAME");
    this.rawBucket = requiredEnv("RAW_UPLOADS_BUCKET");
    this.parseQueueUrl = process.env.PARSE_QUEUE_URL ?? null;
  }

  async findImportByRawHash(rawHash) {
    const { dynamo, sdk } = this.clients;
    const result = await dynamo.send(new sdk.QueryCommand({
      TableName: this.importsTable,
      IndexName: "RawHashIndex",
      KeyConditionExpression: "userId = :userId AND rawHash = :rawHash",
      ExpressionAttributeValues: {
        ":userId": this.userId,
        ":rawHash": rawHash
      },
      Limit: 1
    }));

    return result.Items?.[0] ? publicImport(result.Items[0]) : null;
  }

  async getImport(importId) {
    const { dynamo, sdk } = this.clients;
    const result = await dynamo.send(new sdk.GetCommand({
      TableName: this.importsTable,
      Key: {
        userId: this.userId,
        importId
      }
    }));

    return result.Item ? publicImport(result.Item) : null;
  }

  async listImports() {
    const { dynamo, sdk } = this.clients;
    const result = await dynamo.send(new sdk.QueryCommand({
      TableName: this.importsTable,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": this.userId
      },
      Limit: 100
    }));

    return sortByImportedAt((result.Items ?? []).map(publicImport));
  }

  async listAllImports() {
    const { dynamo, sdk } = this.clients;
    const items = [];
    let exclusiveStartKey;

    do {
      const result = await dynamo.send(new sdk.QueryCommand({
        TableName: this.importsTable,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": this.userId
        },
        ExclusiveStartKey: exclusiveStartKey
      }));

      items.push(...(result.Items ?? []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return sortByImportedAt(items.map(publicImport));
  }

  async createQueuedImport({ name, source, rawText, sessionId }) {
    const { dynamo, s3, sqs, sdk } = this.clients;
    const rawHash = hashText(rawText);
    const existingImport = await this.findImportByRawHash(rawHash);

    if (existingImport) {
      if (sessionId && existingImport.sessionId !== sessionId) {
        await this.updateImportSession(existingImport.importId, sessionId);
        existingImport.sessionId = sessionId;
      }

      return {
        import: existingImport,
        hands: await this.listHands({ importId: existingImport.importId }),
        duplicate: true,
        skippedCount: existingImport.parsedHandCount || existingImport.handCount || 0
      };
    }

    const importId = createId("imp");
    const importedAt = new Date().toISOString();
    const rawKey = rawUploadKey(this.userId, importId);
    const importRecord = {
      userId: this.userId,
      importId,
      name: name || "Uploaded session",
      source: source || "file-upload",
      sessionId: sessionId || null,
      status: "queued",
      handCount: 0,
      parsedHandCount: 0,
      skippedCount: 0,
      rawBytes: Buffer.byteLength(rawText, "utf8"),
      rawHash,
      rawKey,
      importedAt
    };

    await s3.send(new sdk.PutObjectCommand({
      Bucket: this.rawBucket,
      Key: rawKey,
      Body: rawText,
      ContentType: "text/plain; charset=utf-8",
      ServerSideEncryption: "AES256"
    }));

    await dynamo.send(new sdk.PutCommand({
      TableName: this.importsTable,
      Item: importRecord,
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(importId)"
    }));

    if (this.parseQueueUrl) {
      await sqs.send(new sdk.SendMessageCommand({
        QueueUrl: this.parseQueueUrl,
        MessageBody: JSON.stringify({
          userId: this.userId,
          importId,
          rawKey,
          sessionId: sessionId || null
        })
      }));
    }

    return {
      import: publicImport(importRecord),
      hands: [],
      duplicate: false,
      skippedCount: 0
    };
  }

  async readRawImport(rawKey) {
    const { s3, sdk } = this.clients;
    const result = await s3.send(new sdk.GetObjectCommand({
      Bucket: this.rawBucket,
      Key: rawKey
    }));

    return result.Body.transformToString();
  }

  async createLiveHand(payload) {
    const { dynamo, s3, sdk } = this.clients;
    const hand = buildLiveHand(payload);
    const rawText = JSON.stringify({
      kind: "live-hand",
      hand
    });
    const rawHash = hashText(rawText);
    const existingImport = await this.findImportByRawHash(rawHash);

    if (existingImport) {
      if (payload.sessionId && existingImport.sessionId !== payload.sessionId) {
        await this.updateImportSession(existingImport.importId, payload.sessionId);
        existingImport.sessionId = payload.sessionId;
      }

      const [existingHand] = await this.listHands({ importId: existingImport.importId, limit: 1 });
      return {
        import: existingImport,
        hand: existingHand ?? null,
        duplicate: true
      };
    }

    const importId = createId("imp");
    const importedAt = new Date().toISOString();
    const rawKey = rawUploadKey(this.userId, importId);
    const importRecord = {
      userId: this.userId,
      importId,
      name: payload.name || `Live hand ${hand.handNumber}`,
      source: "live-entry",
      sessionId: payload.sessionId || null,
      status: "ready",
      handCount: 1,
      parsedHandCount: 1,
      skippedCount: 0,
      rawBytes: Buffer.byteLength(rawText, "utf8"),
      rawHash,
      rawKey,
      importedAt,
      parsedAt: importedAt
    };
    const storedHand = {
      ...hand,
      userId: this.userId,
      handId: createId("hand"),
      id: undefined,
      importId,
      sessionId: importRecord.sessionId,
      handKey: handKey(hand),
      importedAt
    };

    await s3.send(new sdk.PutObjectCommand({
      Bucket: this.rawBucket,
      Key: rawKey,
      Body: rawText,
      ContentType: "application/json; charset=utf-8",
      ServerSideEncryption: "AES256"
    }));

    await dynamo.send(new sdk.PutCommand({
      TableName: this.importsTable,
      Item: importRecord,
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(importId)"
    }));

    await dynamo.send(new sdk.PutCommand({
      TableName: this.handsTable,
      Item: storedHand,
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(handId)"
    }));

    return {
      import: publicImport(importRecord),
      hand: publicHand(storedHand),
      duplicate: false
    };
  }

  async existingHandKeys() {
    const hands = await this.listHands({ limit: 1000 });
    return new Set(hands.map((hand) => hand.handKey ?? handKey(hand)));
  }

  async saveParsedImport({ importId, rawText, hands, sessionId }) {
    const { dynamo, sdk } = this.clients;
    const existingImport = await this.getImport(importId);
    const linkedSessionId = existingImport ? existingImport.sessionId ?? null : sessionId || null;
    const existingKeys = await this.existingHandKeys();
    const importedAt = new Date().toISOString();
    const parsedHands = hands.map((hand) => ({
      ...hand,
      handKey: handKey(hand)
    }));
    const newHands = parsedHands.filter((hand) => !existingKeys.has(hand.handKey));
    const storedHands = newHands.map((hand) => ({
      ...hand,
      userId: this.userId,
      handId: createId("hand"),
      id: undefined,
      importId,
      sessionId: linkedSessionId,
      tags: Array.isArray(hand.tags) ? hand.tags : [],
      notes: hand.notes ?? "",
      reviewedAt: hand.reviewedAt ?? null,
      decisionReviews: hand.decisionReviews && typeof hand.decisionReviews === "object" ? hand.decisionReviews : {},
      importedAt
    }));

    const writeRequests = storedHands.map((hand) => ({
      PutRequest: {
        Item: hand
      }
    }));

    for (let index = 0; index < writeRequests.length; index += 25) {
      await batchWriteAll(dynamo, sdk, {
        [this.handsTable]: writeRequests.slice(index, index + 25)
      });
    }

    const parsedAt = new Date().toISOString();
    await dynamo.send(new sdk.UpdateCommand({
      TableName: this.importsTable,
      Key: {
        userId: this.userId,
        importId
      },
      UpdateExpression: "SET #status = :status, handCount = :handCount, parsedHandCount = :parsedHandCount, skippedCount = :skippedCount, rawBytes = if_not_exists(rawBytes, :rawBytes), parsedAt = :parsedAt REMOVE errorMessage",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": "ready",
        ":handCount": storedHands.length,
        ":parsedHandCount": hands.length,
        ":skippedCount": hands.length - storedHands.length,
        ":rawBytes": Buffer.byteLength(rawText, "utf8"),
        ":parsedAt": parsedAt
      }
    }));

    return {
      handCount: storedHands.length,
      parsedHandCount: hands.length,
      skippedCount: hands.length - storedHands.length,
      hands: storedHands.map(publicHand)
    };
  }

  async markImportFailed(importId, errorMessage) {
    const { dynamo, sdk } = this.clients;
    await dynamo.send(new sdk.UpdateCommand({
      TableName: this.importsTable,
      Key: {
        userId: this.userId,
        importId
      },
      UpdateExpression: "SET #status = :status, errorMessage = :errorMessage, parsedAt = :parsedAt",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": "failed",
        ":errorMessage": errorMessage,
        ":parsedAt": new Date().toISOString()
      }
    }));
  }

  async listHands({ limit = 100, player, position, importId, sessionId } = {}) {
    const { dynamo, sdk } = this.clients;
    const result = await dynamo.send(new sdk.QueryCommand({
      TableName: this.handsTable,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": this.userId
      },
      Limit: Math.max(1, Math.min(1000, limit))
    }));

    let hands = (result.Items ?? []).map(publicHand);

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

    return sortByImportedAt(hands).slice(0, limit);
  }

  async listAllHands() {
    const { dynamo, sdk } = this.clients;
    const items = [];
    let exclusiveStartKey;

    do {
      const result = await dynamo.send(new sdk.QueryCommand({
        TableName: this.handsTable,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": this.userId
        },
        ExclusiveStartKey: exclusiveStartKey
      }));

      items.push(...(result.Items ?? []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return sortByImportedAt(items.map(publicHand));
  }

  async getHand(handId) {
    const { dynamo, sdk } = this.clients;
    const result = await dynamo.send(new sdk.GetCommand({
      TableName: this.handsTable,
      Key: {
        userId: this.userId,
        handId
      }
    }));

    return result.Item ? publicHand(result.Item) : null;
  }

  async updateHandReview(handId, payload) {
    const { dynamo, sdk } = this.clients;
    const existingHand = await this.getHand(handId);

    if (!existingHand) {
      throw new Error("Hand not found.");
    }

    const review = normalizeReviewPatch(payload, existingHand);
    await dynamo.send(new sdk.UpdateCommand({
      TableName: this.handsTable,
      Key: {
        userId: this.userId,
        handId
      },
      UpdateExpression: "SET tags = :tags, notes = :notes, reviewedAt = :reviewedAt, reviewUpdatedAt = :reviewUpdatedAt",
      ExpressionAttributeValues: {
        ":tags": review.tags,
        ":notes": review.notes,
        ":reviewedAt": review.reviewedAt,
        ":reviewUpdatedAt": review.reviewUpdatedAt
      }
    }));

    return {
      ...existingHand,
      ...review
    };
  }

  async decisionReview(handId) {
    const existingHand = await this.getHand(handId);

    if (!existingHand) {
      throw new Error("Hand not found.");
    }

    return buildDecisionBreakdown(existingHand);
  }

  async updateDecisionReview(handId, decisionId, payload) {
    const { dynamo, sdk } = this.clients;
    const existingHand = await this.getHand(handId);

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
    const decisionReviews = {
      ...existingReviews,
      [decisionId]: normalizeDecisionReviewPatch(payload, existingReviews[decisionId] ?? {})
    };
    const decisionReviewUpdatedAt = new Date().toISOString();

    await dynamo.send(new sdk.UpdateCommand({
      TableName: this.handsTable,
      Key: {
        userId: this.userId,
        handId
      },
      UpdateExpression: "SET decisionReviews = :decisionReviews, decisionReviewUpdatedAt = :decisionReviewUpdatedAt",
      ExpressionAttributeValues: {
        ":decisionReviews": decisionReviews,
        ":decisionReviewUpdatedAt": decisionReviewUpdatedAt
      }
    }));

    const hand = {
      ...existingHand,
      decisionReviews,
      decisionReviewUpdatedAt
    };

    return {
      hand,
      review: decisionReviews[decisionId],
      report: buildDecisionBreakdown(hand)
    };
  }

  async studyPlan() {
    return buildStudyPlan(await this.listHands({ limit: 1000 }));
  }

  async reviewQueue(filters = {}) {
    return buildReviewQueue(await this.listHands({ limit: 1000 }), filters);
  }

  async handLibrary(filters = {}) {
    return filterHandLibrary(await this.listHands({ limit: 1000 }), filters);
  }

  async tagPerformance() {
    return buildTagPerformance(await this.listHands({ limit: 1000 }));
  }

  async similarHands(handId, filters = {}) {
    return findSimilarHands(await this.listHands({ limit: 1000 }), handId, filters);
  }

  async updateImportSession(importId, sessionId) {
    const { dynamo, sdk } = this.clients;
    const existingImport = await this.getImport(importId);

    if (!existingImport) {
      throw new Error("Import not found.");
    }

    const nextSessionId = sessionId || null;
    await dynamo.send(new sdk.UpdateCommand({
      TableName: this.importsTable,
      Key: {
        userId: this.userId,
        importId
      },
      UpdateExpression: "SET sessionId = :sessionId",
      ExpressionAttributeValues: {
        ":sessionId": nextSessionId
      }
    }));

    const hands = await this.listHands({ importId, limit: 1000 });
    for (const hand of hands) {
      await dynamo.send(new sdk.UpdateCommand({
        TableName: this.handsTable,
        Key: {
          userId: this.userId,
          handId: hand.handId ?? hand.id
        },
        UpdateExpression: "SET sessionId = :sessionId",
        ExpressionAttributeValues: {
          ":sessionId": nextSessionId
        }
      }));
    }

    return {
      import: {
        ...existingImport,
        sessionId: nextSessionId
      },
      updatedHands: hands.length
    };
  }

  async listBankrollSessions() {
    const { dynamo, sdk } = this.clients;
    const items = [];
    let exclusiveStartKey;

    do {
      const result = await dynamo.send(new sdk.QueryCommand({
        TableName: this.sessionsTable,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": this.userId
        },
        ExclusiveStartKey: exclusiveStartKey
      }));

      items.push(...(result.Items ?? []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items
      .filter((item) => item.entityType !== "bankroll-transaction")
      .map(publicBankrollSession)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  async createBankrollSession(payload) {
    const { dynamo, sdk } = this.clients;
    const sessionId = createId("sess");
    const session = buildBankrollSession(payload, {
      id: sessionId
    });
    const storedSession = {
      ...session,
      id: undefined,
      entityType: "bankroll-session",
      userId: this.userId,
      sessionId
    };

    await dynamo.send(new sdk.PutCommand({
      TableName: this.sessionsTable,
      Item: storedSession,
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(sessionId)"
    }));

    return publicBankrollSession(storedSession);
  }

  async parseBankrollImportPlan(payload = {}) {
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
    const [existingSessions, existingTransactions] = await Promise.all([
      this.listBankrollSessions(),
      this.listBankrollTransactions()
    ]);
    const existingKeys = new Set(existingSessions.map(bankrollSessionKey).filter(Boolean));
    const existingTransactionKeys = new Set(existingTransactions.map(bankrollTransactionKey).filter(Boolean));

    return planBankrollImport(parsed, {
      existingSessionKeys: existingKeys,
      existingTransactionKeys
    });
  }

  async preparedBankrollImportPlan(payload = {}) {
    const [existingSessions, existingTransactions] = await Promise.all([
      this.listBankrollSessions(),
      this.listBankrollTransactions()
    ]);
    const existingKeys = new Set(existingSessions.map(bankrollSessionKey).filter(Boolean));
    const existingTransactionKeys = new Set(existingTransactions.map(bankrollTransactionKey).filter(Boolean));

    return planPreparedBankrollImport(payload, {
      existingSessionKeys: existingKeys,
      existingTransactionKeys
    });
  }

  async previewBankrollImport(payload = {}) {
    return this.parseBankrollImportPlan(payload);
  }

  async importBankrollSessions(payload = {}) {
    const { dynamo, sdk } = this.clients;
    const plan = await this.parseBankrollImportPlan(payload);
    const importedAt = new Date().toISOString();
    const storedSessions = [];
    const storedTransactions = [];

    for (const sessionPayload of plan.sessions) {
      const sessionId = createId("sess");
      const session = buildBankrollSession({
        ...sessionPayload,
        importedAt
      }, {
        id: sessionId,
        createdAt: importedAt,
        updatedAt: importedAt
      });
      const storedSession = {
        ...session,
        id: undefined,
        entityType: "bankroll-session",
        userId: this.userId,
        sessionId
      };

      storedSessions.push(storedSession);
    }

    for (const transactionPayload of plan.transactions) {
      const transactionId = createId("txn");
      const transaction = buildBankrollTransaction({
        ...transactionPayload,
        importedAt
      }, {
        id: transactionId,
        createdAt: importedAt,
        updatedAt: importedAt
      });
      const storedTransaction = {
        ...transaction,
        id: undefined,
        entityType: "bankroll-transaction",
        userId: this.userId,
        sessionId: transactionId,
        transactionId
      };

      storedTransactions.push(storedTransaction);
    }

    const writeRequests = [...storedSessions, ...storedTransactions].map((item) => ({
      PutRequest: {
        Item: item
      }
    }));

    for (let index = 0; index < writeRequests.length; index += 25) {
      await batchWriteAll(dynamo, sdk, {
        [this.sessionsTable]: writeRequests.slice(index, index + 25)
      });
    }

    return {
      importedCount: storedSessions.length,
      importedSessionCount: storedSessions.length,
      importedTransactionCount: storedTransactions.length,
      parsedSessionCount: plan.parsedSessionCount,
      parsedTransactionCount: plan.parsedTransactionCount,
      skippedCount: plan.skippedCount,
      duplicateCount: plan.duplicateCount,
      duplicateSessionCount: plan.duplicateSessionCount,
      duplicateTransactionCount: plan.duplicateTransactionCount,
      uncheckedCount: plan.uncheckedCount ?? 0,
      parsedRowCount: plan.parsedRowCount,
      source: plan.source,
      sessions: storedSessions.map(publicBankrollSession),
      transactions: storedTransactions.map(publicBankrollTransaction),
      skippedRows: plan.skippedRows
    };
  }

  async listBankrollTransactions() {
    const { dynamo, sdk } = this.clients;
    const items = [];
    let exclusiveStartKey;

    do {
      const result = await dynamo.send(new sdk.QueryCommand({
        TableName: this.sessionsTable,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": this.userId
        },
        ExclusiveStartKey: exclusiveStartKey
      }));

      items.push(...(result.Items ?? []));
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return items
      .filter((item) => item.entityType === "bankroll-transaction")
      .map(publicBankrollTransaction)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  async getBankrollTransaction(transactionId) {
    const { dynamo, sdk } = this.clients;
    const result = await dynamo.send(new sdk.GetCommand({
      TableName: this.sessionsTable,
      Key: {
        userId: this.userId,
        sessionId: transactionId
      }
    }));

    return result.Item?.entityType === "bankroll-transaction" ? publicBankrollTransaction(result.Item) : null;
  }

  async createBankrollTransaction(payload) {
    const { dynamo, sdk } = this.clients;
    const transactionId = createId("txn");
    const transaction = buildBankrollTransaction(payload, {
      id: transactionId
    });
    const storedTransaction = {
      ...transaction,
      id: undefined,
      entityType: "bankroll-transaction",
      userId: this.userId,
      sessionId: transactionId,
      transactionId
    };

    await dynamo.send(new sdk.PutCommand({
      TableName: this.sessionsTable,
      Item: storedTransaction,
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(sessionId)"
    }));

    return publicBankrollTransaction(storedTransaction);
  }

  async updateBankrollTransaction(transactionId, payload) {
    const { dynamo, sdk } = this.clients;
    const existingTransaction = await this.getBankrollTransaction(transactionId);

    if (!existingTransaction) {
      throw new Error("Bankroll transaction not found.");
    }

    const updatedTransaction = buildBankrollTransaction({
      ...existingTransaction,
      ...payload,
      transactionId
    }, {
      id: transactionId,
      createdAt: existingTransaction.createdAt,
      updatedAt: new Date().toISOString()
    });
    const storedTransaction = {
      ...updatedTransaction,
      id: undefined,
      entityType: "bankroll-transaction",
      userId: this.userId,
      sessionId: transactionId,
      transactionId
    };

    await dynamo.send(new sdk.PutCommand({
      TableName: this.sessionsTable,
      Item: storedTransaction
    }));

    return publicBankrollTransaction(storedTransaction);
  }

  async deleteBankrollTransaction(transactionId) {
    const { dynamo, sdk } = this.clients;
    const existingTransaction = await this.getBankrollTransaction(transactionId);

    if (!existingTransaction) {
      throw new Error("Bankroll transaction not found.");
    }

    await dynamo.send(new sdk.DeleteCommand({
      TableName: this.sessionsTable,
      Key: {
        userId: this.userId,
        sessionId: transactionId
      }
    }));

    return {
      transaction: existingTransaction
    };
  }

  async bankrollTransactionSummary() {
    return summarizeBankrollTransactions(await this.listBankrollTransactions());
  }

  async getBankrollSession(sessionId) {
    const { dynamo, sdk } = this.clients;
    const result = await dynamo.send(new sdk.GetCommand({
      TableName: this.sessionsTable,
      Key: {
        userId: this.userId,
        sessionId
      }
    }));

    return result.Item ? publicBankrollSession(result.Item) : null;
  }

  async updateBankrollSession(sessionId, payload) {
    const { dynamo, sdk } = this.clients;
    const existingSession = await this.getBankrollSession(sessionId);

    if (!existingSession) {
      throw new Error("Bankroll session not found.");
    }

    const updatedSession = buildBankrollSession({
      ...existingSession,
      ...payload,
      sessionId
    }, {
      id: sessionId,
      createdAt: existingSession.createdAt,
      updatedAt: new Date().toISOString()
    });
    const storedSession = {
      ...updatedSession,
      id: undefined,
      entityType: "bankroll-session",
      userId: this.userId,
      sessionId
    };

    await dynamo.send(new sdk.PutCommand({
      TableName: this.sessionsTable,
      Item: storedSession
    }));

    return publicBankrollSession(storedSession);
  }

  async deleteBankrollSession(sessionId) {
    const { dynamo, sdk } = this.clients;
    const existingSession = await this.getBankrollSession(sessionId);

    if (!existingSession) {
      throw new Error("Bankroll session not found.");
    }

    await dynamo.send(new sdk.DeleteCommand({
      TableName: this.sessionsTable,
      Key: {
        userId: this.userId,
        sessionId
      }
    }));

    const imports = await this.listImports();
    const unlinkedImports = imports.filter((item) => item.sessionId === sessionId);
    for (const record of unlinkedImports) {
      await this.updateImportSession(record.importId, null);
    }

    return {
      session: existingSession,
      unlinkedImports
    };
  }

  async bankrollSummary() {
    return summarizeBankrollSessions(await this.listBankrollSessions());
  }

  async bankrollSessionDetail(sessionId) {
    const session = await this.getBankrollSession(sessionId);

    return buildSessionDetail({
      session,
      imports: (await this.listImports()).filter((record) => record.sessionId === sessionId),
      hands: await this.listHands({ sessionId, limit: 1000 })
    });
  }

  async workspaceExport({ mode = "cloud" } = {}) {
    const [
      imports,
      hands,
      bankrollSessions,
      bankrollTransactions
    ] = await Promise.all([
      this.listAllImports(),
      this.listAllHands(),
      this.listBankrollSessions(),
      this.listBankrollTransactions()
    ]);

    return buildWorkspaceExport({
      mode,
      imports,
      hands,
      bankrollSessions,
      bankrollTransactions
    });
  }

  async workspaceRestorePlan(payload = {}) {
    const [
      imports,
      hands,
      bankrollSessions,
      bankrollTransactions
    ] = await Promise.all([
      this.listAllImports(),
      this.listAllHands(),
      this.listBankrollSessions(),
      this.listBankrollTransactions()
    ]);

    return buildWorkspaceRestorePlan(payload, {
      imports,
      hands,
      bankrollSessions,
      bankrollTransactions
    });
  }

  async previewWorkspaceRestore(payload = {}) {
    return publicWorkspaceRestorePlan(await this.workspaceRestorePlan(payload));
  }

  async restoreWorkspace(payload = {}) {
    const { dynamo, sdk } = this.clients;
    const plan = await this.workspaceRestorePlan(payload);
    const restoredAt = new Date().toISOString();

    const importRequests = plan.records.imports.map((record) => ({
      PutRequest: {
        Item: storedRestoreImport(record, this.userId)
      }
    }));
    const handRequests = plan.records.hands.map((record) => ({
      PutRequest: {
        Item: storedRestoreHand(record, this.userId)
      }
    }));
    const bankrollRequests = [
      ...plan.records.bankrollSessions.map((record) => ({
        PutRequest: {
          Item: storedRestoreSession(record, this.userId)
        }
      })),
      ...plan.records.bankrollTransactions.map((record) => ({
        PutRequest: {
          Item: storedRestoreTransaction(record, this.userId)
        }
      }))
    ];

    for (let index = 0; index < importRequests.length; index += 25) {
      await batchWriteAll(dynamo, sdk, {
        [this.importsTable]: importRequests.slice(index, index + 25)
      });
    }

    for (let index = 0; index < handRequests.length; index += 25) {
      await batchWriteAll(dynamo, sdk, {
        [this.handsTable]: handRequests.slice(index, index + 25)
      });
    }

    for (let index = 0; index < bankrollRequests.length; index += 25) {
      await batchWriteAll(dynamo, sdk, {
        [this.sessionsTable]: bankrollRequests.slice(index, index + 25)
      });
    }

    return workspaceRestoreResult(plan, { restoredAt });
  }

  async deleteImport(importId) {
    const { dynamo, sdk } = this.clients;
    const existingImport = await this.getImport(importId);

    if (!existingImport) {
      throw new Error("Import not found.");
    }

    const hands = await this.listHands({ importId, limit: 1000 });
    const deleteRequests = hands.map((hand) => ({
      DeleteRequest: {
        Key: {
          userId: this.userId,
          handId: hand.handId ?? hand.id
        }
      }
    }));

    for (let index = 0; index < deleteRequests.length; index += 25) {
      await batchWriteAll(dynamo, sdk, {
        [this.handsTable]: deleteRequests.slice(index, index + 25)
      });
    }

    await dynamo.send(new sdk.DeleteCommand({
      TableName: this.importsTable,
      Key: {
        userId: this.userId,
        importId
      }
    }));

    return {
      import: existingImport,
      removedHands: hands.length,
      hands
    };
  }

  async clear() {
    const imports = await this.listImports();
    let removedHands = 0;

    for (const record of imports) {
      const result = await this.deleteImport(record.importId);
      removedHands += result.removedHands;
    }

    return {
      removedImports: imports.length,
      removedHands
    };
  }
}

export async function createCloudHandStore({ userId }) {
  const { awsClients } = await import("./cloudClients.js");
  return new CloudHandStore({
    userId,
    clients: await awsClients()
  });
}
