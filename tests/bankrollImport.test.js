import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBankrollImport } from "../src/core/bankrollImport.js";

const bankrollExport = `"Bankroll Name"
"Default"
"Transaction Date","Amount","Note","Update Date"
"2023-03-14 15:36","0.00","Withdrawal","2023-03-14 15:36"
"2023-03-14 15:36","0.00","Initial bankroll","2023-03-14 15:36"

Cash Games

"Start Time","End Time","Weekday","Break Minutes","Play Time","Game","Limit Type","Location","Buy In","Cashed Out","Profit","Note","Location Type","State","Bankroll","Tips","SessionId","Stake"
"2026-08-08 21:22","2026-08-09 00:22","Sat","0","3:00","Texas Holdem","No Limit","Real Canadian","2000.00","0.00","-2000.00","","Casino","Completed","Default","0.00","362","2/5/10"
"2026-08-07 20:30","2026-08-07 23:30","Fri","0","3:00","Texas Holdem","No Limit","Real Canadian","1500.00","1725.00","225.00","soft table","Casino","Completed","Default","0.00","361","2/5/10"`;

test("parses cash-game bankroll exports into sessions", () => {
  const parsed = parseBankrollImport(bankrollExport, {
    source: "test-export"
  });

  assert.equal(parsed.sessions.length, 2);
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.skippedRows.length, 0);
  assert.equal(parsed.transactions[0].type, "withdrawal");
  assert.equal(parsed.transactions[1].type, "initial");
  assert.equal(parsed.transactions[1].externalKey.startsWith("bankroll-transaction:default:"), true);
  assert.equal(parsed.sessions[0].date, "2026-08-08");
  assert.equal(parsed.sessions[0].location, "Real Canadian");
  assert.equal(parsed.sessions[0].hours, 3);
  assert.equal(parsed.sessions[0].buyIn, 2000);
  assert.equal(parsed.sessions[0].cashOut, 0);
  assert.equal(parsed.sessions[0].profit, -2000);
  assert.equal(parsed.sessions[0].bankrollName, "Default");
  assert.equal(parsed.sessions[0].locationType, "Casino");
  assert.equal(parsed.sessions[0].externalId, "362");
  assert.equal(parsed.sessions[0].externalKey, "bankroll-session:cash:default:362");
  assert.equal(parsed.sessions[1].notes, "soft table");
});

test("keeps tournament exports separate from cash sessions with matching source ids", () => {
  const parsed = parseBankrollImport(`Cash Games
"Start Time","End Time","Weekday","Break Minutes","Play Time","Game","Limit Type","Location","Buy In","Cashed Out","Profit","Note","Location Type","State","Bankroll","Tips","SessionId","Stake"
"2026-04-15 14:00","2026-04-15 15:00","Wed","0","1:00","Texas Holdem","No Limit","Club WPT GOLD","100.00","140.00","40.00","","Online","Completed","Default","0.00","2","1/2"

Tourneys
"Start Time","End Time","Weekday","Break Minutes","Play Time","Game","Limit Type","Location","Buy In","Cashed Out","Profit","Note","Location Type","State","Bankroll","Tips","SessionId","Tourney Type","Players","Place Paid","Rank"
"2026-04-15 15:11","2026-04-15 16:11","Wed","0","1:00","Texas Holdem","No Limit","Club WPT GOLD","100.00","0.00","-100.00","","Online","Completed","Default","0.00","2","Single Table","0","0","0"`);

  assert.equal(parsed.sessions.length, 2);
  assert.equal(parsed.sessions[0].gameType, "cash");
  assert.equal(parsed.sessions[1].gameType, "tournament");
  assert.equal(parsed.sessions[0].externalKey, "bankroll-session:cash:default:2");
  assert.equal(parsed.sessions[1].externalKey, "bankroll-session:tournament:default:2");
  assert.equal(parsed.sessions[1].stakes, "Single Table");
});

test("parses generic session CSV rows without an export section", () => {
  const parsed = parseBankrollImport(`"Date","Location","Stakes","Hours","Profit","Note"
"2026-08-01","Home game","$1/$2","4.5","($120.00)","missed river value"`);

  assert.equal(parsed.sessions.length, 1);
  assert.equal(parsed.sessions[0].date, "2026-08-01");
  assert.equal(parsed.sessions[0].profit, -120);
  assert.equal(parsed.sessions[0].hours, 4.5);
  assert.equal(parsed.sessions[0].stakes, "$1/$2");
  assert.equal(parsed.sessions[0].notes, "missed river value");
});
