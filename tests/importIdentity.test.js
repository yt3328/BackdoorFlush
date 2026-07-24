import assert from "node:assert/strict";
import { test } from "node:test";
import { handKey, hashText } from "../src/core/importIdentity.js";

test("hashText normalizes line endings and surrounding whitespace", () => {
  assert.equal(hashText("abc\r\n123\n"), hashText("abc\n123"));
});

test("handKey is stable across player order", () => {
  const first = handKey({
    handNumber: "1",
    tableName: "Juniper",
    hero: "Tao",
    board: ["Ah", "Kd", "2c"],
    players: [{ name: "Nora" }, { name: "Tao" }]
  });
  const second = handKey({
    handNumber: "1",
    tableName: "Juniper",
    hero: "Tao",
    board: ["Ah", "Kd", "2c"],
    players: [{ name: "Tao" }, { name: "Nora" }]
  });

  assert.equal(first, second);
});

