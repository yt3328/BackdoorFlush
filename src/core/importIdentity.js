import { createHash } from "node:crypto";

export function hashText(value) {
  return createHash("sha256")
    .update(String(value ?? "").replaceAll("\r\n", "\n").trim())
    .digest("hex");
}

export function handKey(hand) {
  const playerNames = hand.players.map((player) => player.name).sort().join("|");
  return [
    hand.handNumber,
    hand.tableName ?? "",
    hand.hero ?? "",
    hand.board.join(" "),
    playerNames
  ].join("::");
}

