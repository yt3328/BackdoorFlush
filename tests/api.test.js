import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { beforeEach, test } from "node:test";
import { createApplication } from "../src/app.js";

let application;

beforeEach(() => {
  application = createApplication({ persistencePath: null });
});

function dispatch({ method = "GET", url, body } = {}) {
  const rawBody = body ? JSON.stringify(body) : "";
  const request = Readable.from(rawBody ? [Buffer.from(rawBody)] : []);
  request.method = method;
  request.url = url;
  request.headers = {
    host: "localhost",
    "content-type": "application/json"
  };

  return new Promise((resolve) => {
    const chunks = [];
    const response = {
      statusCode: 200,
      headers: {},
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = headers;
      },
      write(chunk) {
        chunks.push(Buffer.from(chunk));
      },
      end(chunk) {
        if (chunk) {
          this.write(chunk);
        }

        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: this.statusCode,
          text,
          async json() {
            return JSON.parse(text);
          }
        });
      }
    };

    application.server.emit("request", request, response);
  });
}

async function createTaggedLiveHand({
  sessionId,
  handNumber,
  position = "BTN",
  tags = [],
  reviewed = false,
  winner = "Villain",
  wonAmount = 180,
  riverAmount = 70
} = {}) {
  const liveResponse = await dispatch({
    method: "POST",
    url: "/api/live-hands",
    body: {
      sessionId,
      name: handNumber,
      tableName: "Study table",
      stakes: "$2/$5",
      handNumber,
      hero: "Tao",
      heroCards: "Ah Kd",
      boardCards: "As 7c 2h Jh 4s",
      winner,
      wonAmount,
      players: [
        {
          seat: 1,
          name: "Tao",
          position,
          stack: 900
        },
        {
          seat: 2,
          name: "Villain",
          position: "BB",
          stack: 900
        }
      ],
      actions: [
        {
          street: "hole-cards",
          player: "Tao",
          type: "raises",
          amount: 20
        },
        {
          street: "hole-cards",
          player: "Villain",
          type: "calls",
          amount: 20
        },
        {
          street: "river",
          player: "Tao",
          type: "calls",
          amount: riverAmount
        }
      ]
    }
  });
  const livePayload = await liveResponse.json();

  await dispatch({
    method: "PATCH",
    url: `/api/hands/${livePayload.hand.id}`,
    body: {
      tags,
      reviewed,
      notes: tags.join(" ")
    }
  });

  return livePayload.hand;
}

test("health endpoint returns ok", async () => {
  const response = await dispatch({ url: "/api/health" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.status, "ok");
});

test("demo endpoint loads sample hands", async () => {
  const response = await dispatch({ method: "POST", url: "/api/demo" });
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.import.handCount, 5);
});

test("demo endpoint skips an already imported sample", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });
  const duplicateResponse = await dispatch({ method: "POST", url: "/api/demo" });
  const duplicatePayload = await duplicateResponse.json();
  const handsResponse = await dispatch({ url: "/api/hands" });
  const handsPayload = await handsResponse.json();

  assert.equal(duplicateResponse.status, 200);
  assert.equal(duplicatePayload.duplicate, true);
  assert.equal(duplicatePayload.skippedCount, 5);
  assert.equal(handsPayload.hands.length, 5);
});

test("returns one parsed hand by id", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });
  const handsResponse = await dispatch({ url: "/api/hands?limit=1" });
  const handsPayload = await handsResponse.json();
  const response = await dispatch({ url: `/api/hands/${handsPayload.hands[0].id}` });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.hand.id, handsPayload.hands[0].id);
});

test("deletes an import and its hands", async () => {
  const importResponse = await dispatch({ method: "POST", url: "/api/demo" });
  const importPayload = await importResponse.json();
  const deleteResponse = await dispatch({
    method: "DELETE",
    url: `/api/imports/${importPayload.import.id}`
  });
  const deletePayload = await deleteResponse.json();
  const handsResponse = await dispatch({ url: "/api/hands" });
  const handsPayload = await handsResponse.json();

  assert.equal(deleteResponse.status, 200);
  assert.equal(deletePayload.removedHands, 5);
  assert.equal(handsPayload.hands.length, 0);
});

test("clears local session state", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });
  const clearResponse = await dispatch({ method: "DELETE", url: "/api/session" });
  const clearPayload = await clearResponse.json();
  const importsResponse = await dispatch({ url: "/api/imports" });
  const importsPayload = await importsResponse.json();

  assert.equal(clearResponse.status, 200);
  assert.equal(clearPayload.removedHands, 5);
  assert.equal(importsPayload.imports.length, 0);
});

test("summary endpoint returns players after import", async () => {
  await dispatch({ method: "POST", url: "/api/demo" });

  const response = await dispatch({ url: "/api/stats/summary?player=Tao" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.players[0].player, "Tao");
  assert.equal(payload.players[0].hands, 5);
});

test("equity endpoint returns a result", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/equity/calculate",
    body: {
      holeCards: ["Ah", "Kh"],
      boardCards: ["As", "9h", "4c"],
      opponents: 1,
      iterations: 200
    }
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.ok(payload.result.equityPct >= 0);
});

test("bankroll session endpoints create, summarize, and delete sessions", async () => {
  const createResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-24",
      location: "PokerStars",
      gameType: "cash",
      stakes: "$1/$2",
      hours: 3,
      buyIn: 400,
      cashOut: 520,
      notes: "Good value tables."
    }
  });
  const createPayload = await createResponse.json();
  const listResponse = await dispatch({ url: "/api/bankroll/sessions" });
  const listPayload = await listResponse.json();
  const summaryResponse = await dispatch({ url: "/api/bankroll/summary" });
  const summaryPayload = await summaryResponse.json();
  const deleteResponse = await dispatch({
    method: "DELETE",
    url: `/api/bankroll/sessions/${createPayload.session.id}`
  });
  const deletePayload = await deleteResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.session.profit, 120);
  assert.equal(createPayload.session.bbPerHour, 20);
  assert.equal(listPayload.sessions.length, 1);
  assert.equal(summaryPayload.summary.totalProfit, 120);
  assert.equal(summaryPayload.summary.sessionCount, 1);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletePayload.session.id, createPayload.session.id);
});

test("bankroll import endpoint imports exported cash-game sessions and skips duplicates", async () => {
  const rawText = `"Bankroll Name"
"Default"
"Transaction Date","Amount","Note","Update Date"
"2023-03-14 15:36","0.00","Withdrawal","2023-03-14 15:36"
"2023-03-14 15:36","0.00","Initial bankroll","2023-03-14 15:36"

Cash Games

"Start Time","End Time","Weekday","Break Minutes","Play Time","Game","Limit Type","Location","Buy In","Cashed Out","Profit","Note","Location Type","State","Bankroll","Tips","SessionId","Stake"
"2026-08-08 21:22","2026-08-09 00:22","Sat","0","3:00","Texas Holdem","No Limit","Real Canadian","2000.00","0.00","-2000.00","","Casino","Completed","Default","0.00","362","2/5/10"
"2026-08-07 20:30","2026-08-07 23:30","Fri","0","3:00","Texas Holdem","No Limit","Real Canadian","1500.00","1725.00","225.00","","Casino","Completed","Default","0.00","361","2/5/10"`;

  const importResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/imports",
    body: {
      rawText,
      source: "bankroll-csv"
    }
  });
  const importPayload = await importResponse.json();
  const summaryResponse = await dispatch({ url: "/api/bankroll/summary" });
  const summaryPayload = await summaryResponse.json();
  const duplicateResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/imports",
    body: {
      rawText,
      source: "bankroll-csv"
    }
  });
  const duplicatePayload = await duplicateResponse.json();

  assert.equal(importResponse.status, 201);
  assert.equal(importPayload.importedCount, 2);
  assert.equal(importPayload.skippedCount, 2);
  assert.equal(importPayload.sessions[0].location, "Real Canadian");
  assert.equal(importPayload.sessions[0].externalKey, "bankroll-session:cash:default:362");
  assert.equal(summaryPayload.summary.sessionCount, 2);
  assert.equal(summaryPayload.summary.totalProfit, -1775);
  assert.equal(summaryPayload.summary.totalHours, 6);
  assert.equal(duplicateResponse.status, 200);
  assert.equal(duplicatePayload.importedCount, 0);
  assert.equal(duplicatePayload.duplicateCount, 2);
});

test("imports can be linked to, moved between, and unlinked from bankroll sessions", async () => {
  const firstSessionResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-24",
      location: "PokerStars",
      stakes: "$0.05/$0.10",
      hours: 2.5,
      buyIn: 50,
      cashOut: 64
    }
  });
  const secondSessionResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-25",
      location: "Home game",
      stakes: "$1/$2",
      hours: 4,
      profit: -80
    }
  });
  const firstSession = (await firstSessionResponse.json()).session;
  const secondSession = (await secondSessionResponse.json()).session;
  const importResponse = await dispatch({
    method: "POST",
    url: `/api/demo?sessionId=${encodeURIComponent(firstSession.id)}`
  });
  const importPayload = await importResponse.json();
  const firstHandsResponse = await dispatch({
    url: `/api/hands?sessionId=${encodeURIComponent(firstSession.id)}`
  });
  const firstHandsPayload = await firstHandsResponse.json();
  const firstDetailResponse = await dispatch({
    url: `/api/bankroll/sessions/${encodeURIComponent(firstSession.id)}`
  });
  const firstDetailPayload = await firstDetailResponse.json();

  assert.equal(importResponse.status, 201);
  assert.equal(importPayload.import.sessionId, firstSession.id);
  assert.equal(firstHandsPayload.hands.length, 5);
  assert.ok(firstHandsPayload.hands.every((hand) => hand.sessionId === firstSession.id));
  assert.equal(firstDetailResponse.status, 200);
  assert.equal(firstDetailPayload.totals.importCount, 1);
  assert.equal(firstDetailPayload.totals.handCount, 5);
  assert.ok(firstDetailPayload.players.length > 0);

  const relinkResponse = await dispatch({
    method: "PATCH",
    url: `/api/imports/${encodeURIComponent(importPayload.import.id)}`,
    body: {
      sessionId: secondSession.id
    }
  });
  const relinkPayload = await relinkResponse.json();
  const movedHandsResponse = await dispatch({
    url: `/api/hands?sessionId=${encodeURIComponent(secondSession.id)}`
  });
  const movedHandsPayload = await movedHandsResponse.json();
  const emptiedHandsResponse = await dispatch({
    url: `/api/hands?sessionId=${encodeURIComponent(firstSession.id)}`
  });
  const emptiedHandsPayload = await emptiedHandsResponse.json();

  assert.equal(relinkResponse.status, 200);
  assert.equal(relinkPayload.updatedHands, 5);
  assert.equal(relinkPayload.import.sessionId, secondSession.id);
  assert.equal(movedHandsPayload.hands.length, 5);
  assert.equal(emptiedHandsPayload.hands.length, 0);

  const editResponse = await dispatch({
    method: "PATCH",
    url: `/api/bankroll/sessions/${encodeURIComponent(secondSession.id)}`,
    body: {
      location: "Resorts World",
      notes: "Moved linked import here."
    }
  });
  const editPayload = await editResponse.json();
  const secondDetailResponse = await dispatch({
    url: `/api/bankroll/sessions/${encodeURIComponent(secondSession.id)}`
  });
  const secondDetailPayload = await secondDetailResponse.json();

  assert.equal(editResponse.status, 200);
  assert.equal(editPayload.session.location, "Resorts World");
  assert.equal(secondDetailPayload.totals.handCount, 5);
  assert.equal(secondDetailPayload.imports[0].sessionId, secondSession.id);

  const deleteResponse = await dispatch({
    method: "DELETE",
    url: `/api/bankroll/sessions/${encodeURIComponent(secondSession.id)}`
  });
  const importsAfterDeleteResponse = await dispatch({ url: "/api/imports" });
  const importsAfterDeletePayload = await importsAfterDeleteResponse.json();
  const handsAfterDeleteResponse = await dispatch({
    url: `/api/hands?sessionId=${encodeURIComponent(secondSession.id)}`
  });
  const handsAfterDeletePayload = await handsAfterDeleteResponse.json();

  assert.equal(deleteResponse.status, 200);
  assert.equal(importsAfterDeletePayload.imports[0].sessionId, null);
  assert.equal(handsAfterDeletePayload.hands.length, 0);
});

test("live hand endpoint saves a manually entered hand into a bankroll session", async () => {
  const sessionResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-26",
      location: "Live room",
      stakes: "$1/$3",
      hours: 5,
      profit: 180
    }
  });
  const session = (await sessionResponse.json()).session;
  const liveResponse = await dispatch({
    method: "POST",
    url: "/api/live-hands",
    body: {
      sessionId: session.id,
      name: "River call",
      tableName: "Table 12",
      stakes: "$1/$3",
      handNumber: "live-test-1",
      hero: "Tao",
      heroCards: "Ah Kd",
      boardCards: "As 7c 2h Jh 4s",
      winner: "Tao",
      wonAmount: 85,
      players: [
        {
          seat: 1,
          name: "Tao",
          position: "BTN",
          stack: 300
        },
        {
          seat: 2,
          name: "Villain",
          position: "BB",
          stack: 300
        }
      ],
      actions: [
        {
          street: "hole-cards",
          player: "Tao",
          type: "raises",
          amount: 12
        },
        {
          street: "hole-cards",
          player: "Villain",
          type: "calls",
          amount: 12
        },
        {
          street: "flop",
          player: "Villain",
          type: "checks"
        },
        {
          street: "flop",
          player: "Tao",
          type: "bets",
          amount: 18
        },
        {
          street: "flop",
          player: "Villain",
          type: "calls",
          amount: 18
        },
        {
          street: "river",
          player: "Tao",
          type: "calls",
          amount: 40
        }
      ]
    }
  });
  const livePayload = await liveResponse.json();
  const handsResponse = await dispatch({
    url: `/api/hands?sessionId=${encodeURIComponent(session.id)}`
  });
  const handsPayload = await handsResponse.json();
  const summaryResponse = await dispatch({ url: "/api/stats/summary?player=Tao" });
  const summaryPayload = await summaryResponse.json();
  const detailResponse = await dispatch({
    url: `/api/bankroll/sessions/${encodeURIComponent(session.id)}`
  });
  const detailPayload = await detailResponse.json();

  assert.equal(liveResponse.status, 201);
  assert.equal(livePayload.import.source, "live-entry");
  assert.equal(livePayload.hand.sessionId, session.id);
  assert.equal(livePayload.hand.hero, "Tao");
  assert.deepEqual(livePayload.hand.holeCards.Tao, ["Ah", "Kd"]);
  assert.equal(handsPayload.hands.length, 1);
  assert.equal(summaryPayload.players[0].player, "Tao");
  assert.equal(summaryPayload.players[0].hands, 1);
  assert.equal(detailPayload.totals.handCount, 1);
  assert.equal(detailPayload.biggestWins[0].id, livePayload.hand.id);
});

test("hand review metadata can be saved and queried through the review queue", async () => {
  const sessionResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-27",
      location: "Live room",
      stakes: "$2/$5",
      hours: 4,
      profit: -250
    }
  });
  const session = (await sessionResponse.json()).session;
  const liveResponse = await dispatch({
    method: "POST",
    url: "/api/live-hands",
    body: {
      sessionId: session.id,
      tableName: "Table 4",
      handNumber: "review-test-1",
      hero: "Tao",
      heroCards: "Qh Qd",
      boardCards: "Js 8s 2c 6h 3d",
      winner: "Villain",
      wonAmount: 240,
      players: [
        {
          seat: 1,
          name: "Tao",
          position: "CO",
          stack: 800
        },
        {
          seat: 2,
          name: "Villain",
          position: "BTN",
          stack: 900
        }
      ],
      actions: [
        {
          street: "hole-cards",
          player: "Tao",
          type: "raises",
          amount: 20
        },
        {
          street: "hole-cards",
          player: "Villain",
          type: "calls",
          amount: 20
        },
        {
          street: "river",
          player: "Tao",
          type: "calls",
          amount: 90
        }
      ]
    }
  });
  const livePayload = await liveResponse.json();
  const patchResponse = await dispatch({
    method: "PATCH",
    url: `/api/hands/${livePayload.hand.id}`,
    body: {
      tags: ["river decision", "bad-call"],
      notes: "Did not block value range.",
      reviewed: true
    }
  });
  const patchPayload = await patchResponse.json();
  const handResponse = await dispatch({ url: `/api/hands/${livePayload.hand.id}` });
  const handPayload = await handResponse.json();
  const reviewedQueueResponse = await dispatch({
    url: `/api/review/spots?sessionId=${encodeURIComponent(session.id)}&tag=river-decision&reviewed=true`
  });
  const reviewedQueuePayload = await reviewedQueueResponse.json();
  const openQueueResponse = await dispatch({
    url: `/api/review/spots?sessionId=${encodeURIComponent(session.id)}&reviewed=false`
  });
  const openQueuePayload = await openQueueResponse.json();

  assert.equal(patchResponse.status, 200);
  assert.deepEqual(patchPayload.hand.tags, ["river-decision", "bad-call"]);
  assert.equal(patchPayload.hand.notes, "Did not block value range.");
  assert.ok(patchPayload.hand.reviewedAt);
  assert.deepEqual(handPayload.hand.tags, ["river-decision", "bad-call"]);
  assert.equal(reviewedQueuePayload.spots.length, 1);
  assert.equal(reviewedQueuePayload.spots[0].id, livePayload.hand.id);
  assert.ok(reviewedQueuePayload.spots[0].reasons.includes("Tagged"));
  assert.equal(openQueuePayload.spots.length, 0);
});

test("study endpoints return tag summaries, filtered library hands, and similar spots", async () => {
  const sessionResponse = await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-08-07",
      location: "Study room",
      stakes: "$2/$5",
      hours: 3,
      profit: -120
    }
  });
  const session = (await sessionResponse.json()).session;
  const target = await createTaggedLiveHand({
    sessionId: session.id,
    handNumber: "study-target",
    tags: ["river decision", "bad-call"],
    reviewed: false,
    winner: "Villain",
    riverAmount: 90
  });
  const close = await createTaggedLiveHand({
    sessionId: session.id,
    handNumber: "study-close",
    tags: ["river-decision"],
    reviewed: true,
    winner: "Tao",
    wonAmount: 240,
    riverAmount: 85
  });
  await createTaggedLiveHand({
    sessionId: session.id,
    handNumber: "study-far",
    position: "CO",
    tags: ["value-bet"],
    reviewed: false,
    winner: "Tao",
    wonAmount: 150,
    riverAmount: 25
  });

  const tagsResponse = await dispatch({ url: "/api/study/tags" });
  const tagsPayload = await tagsResponse.json();
  const libraryResponse = await dispatch({
    url: `/api/study/library?tag=river-decision&reviewed=false&position=BTN&result=loss&sessionId=${encodeURIComponent(session.id)}&sort=biggest-loss`
  });
  const libraryPayload = await libraryResponse.json();
  const similarResponse = await dispatch({
    url: `/api/hands/${encodeURIComponent(target.id)}/similar?limit=2`
  });
  const similarPayload = await similarResponse.json();
  const riverSummary = tagsPayload.tags.find((row) => row.tag === "river-decision");

  assert.equal(tagsResponse.status, 200);
  assert.equal(riverSummary.handCount, 2);
  assert.equal(riverSummary.reviewedCount, 1);
  assert.equal(libraryResponse.status, 200);
  assert.deepEqual(libraryPayload.hands.map((hand) => hand.id), [target.id]);
  assert.equal(similarResponse.status, 200);
  assert.equal(similarPayload.hands[0].id, close.id);
  assert.ok(similarPayload.hands[0].similarityReasons.some((reason) => reason.includes("Shared tag")));
});

test("decision review endpoints save checklist answers and feed the study plan", async () => {
  const hand = await createTaggedLiveHand({
    handNumber: "decision-api-target",
    tags: ["river-decision", "bad-call"],
    reviewed: false,
    winner: "Villain",
    riverAmount: 110
  });
  const decisionsResponse = await dispatch({
    url: `/api/hands/${encodeURIComponent(hand.id)}/decisions`
  });
  const decisionsPayload = await decisionsResponse.json();
  const riverDecision = decisionsPayload.decisions.find((decision) => decision.street === "river");
  const patchResponse = await dispatch({
    method: "PATCH",
    url: `/api/hands/${encodeURIComponent(hand.id)}/decisions/${encodeURIComponent(riverDecision.id)}`,
    body: {
      note: "Call needs a better bluff-catching reason.",
      checklist: {
        villainRange: "Polar but value heavy.",
        handsBeat: "Only missed draws.",
        worseHandsCall: "Not relevant."
      },
      reviewed: true
    }
  });
  const patchPayload = await patchResponse.json();
  const planResponse = await dispatch({ url: "/api/study/plan" });
  const planPayload = await planResponse.json();
  const savedDecision = patchPayload.report.decisions.find((decision) => decision.id === riverDecision.id);

  assert.equal(decisionsResponse.status, 200);
  assert.ok(riverDecision.flags.includes("River call"));
  assert.equal(patchResponse.status, 200);
  assert.equal(savedDecision.note, "Call needs a better bluff-catching reason.");
  assert.equal(savedDecision.checklist.villainRange, "Polar but value heavy.");
  assert.ok(savedDecision.reviewedAt);
  assert.equal(planResponse.status, 200);
  assert.ok(planPayload.items.some((item) => item.id === "tagged-open-hands"));
});

test("clearing imported hands preserves bankroll records", async () => {
  await dispatch({
    method: "POST",
    url: "/api/bankroll/sessions",
    body: {
      date: "2026-07-24",
      location: "Casino",
      stakes: "$2/$5",
      hours: 2,
      profit: 200
    }
  });
  await dispatch({ method: "POST", url: "/api/demo" });
  await dispatch({ method: "DELETE", url: "/api/session" });
  const summaryResponse = await dispatch({ url: "/api/bankroll/summary" });
  const summaryPayload = await summaryResponse.json();

  assert.equal(summaryPayload.summary.sessionCount, 1);
  assert.equal(summaryPayload.summary.totalProfit, 200);
});
