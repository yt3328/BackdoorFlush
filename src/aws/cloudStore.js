import { randomUUID } from "node:crypto";
import { buildReviewQueue, normalizeReviewPatch } from "../core/handReview.js";
import { handKey, hashText } from "../core/importIdentity.js";
import { buildLiveHand } from "../core/liveHandBuilder.js";
import { buildSessionDetail } from "../core/sessionInsights.js";
import { buildBankrollSession, summarizeBankrollSessions } from "../core/sessionTracker.js";

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

  async reviewQueue(filters = {}) {
    return buildReviewQueue(await this.listHands({ limit: 1000 }), filters);
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
    const result = await dynamo.send(new sdk.QueryCommand({
      TableName: this.sessionsTable,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": this.userId
      },
      Limit: 200
    }));

    return (result.Items ?? [])
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
    for (const record of imports.filter((item) => item.sessionId === sessionId)) {
      await this.updateImportSession(record.importId, null);
    }

    return {
      session: existingSession
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
      removedHands: hands.length
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
