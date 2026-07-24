function emptyPlayerStats(player) {
  return {
    player,
    hands: 0,
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    aggressionActions: 0,
    passiveActions: 0,
    netWon: 0,
    byPosition: {}
  };
}

function ensurePosition(stats, position) {
  const key = position ?? "Unknown";
  stats.byPosition[key] ??= {
    hands: 0,
    vpip: 0,
    pfr: 0,
    netWon: 0
  };

  return stats.byPosition[key];
}

function preflopActionsFor(hand, player) {
  return hand.actions.filter((action) => action.player === player && action.street === "hole-cards");
}

function didVoluntarilyPutMoneyInPot(actions) {
  return actions.some((action) => ["calls", "bets", "raises"].includes(action.type));
}

function didRaisePreflop(actions) {
  return actions.some((action) => action.type === "raises");
}

function didThreeBet(hand, player) {
  const preflopRaises = hand.actions.filter((action) => action.street === "hole-cards" && action.type === "raises");
  const playerRaiseIndex = preflopRaises.findIndex((action) => action.player === player);
  return playerRaiseIndex >= 1;
}

function percentage(value, total) {
  return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1));
}

function rateStats(stats) {
  return {
    ...stats,
    vpipPct: percentage(stats.vpip, stats.hands),
    pfrPct: percentage(stats.pfr, stats.hands),
    threeBetPct: percentage(stats.threeBet, stats.hands),
    aggressionFactor: Number((stats.aggressionActions / Math.max(1, stats.passiveActions)).toFixed(2)),
    byPosition: Object.fromEntries(
      Object.entries(stats.byPosition).map(([position, values]) => [
        position,
        {
          ...values,
          vpipPct: percentage(values.vpip, values.hands),
          pfrPct: percentage(values.pfr, values.hands)
        }
      ])
    )
  };
}

export function summarizeHands(hands, requestedPlayer) {
  const playerStats = new Map();

  for (const hand of hands) {
    for (const seat of hand.players) {
      if (requestedPlayer && seat.name !== requestedPlayer) {
        continue;
      }

      const stats = playerStats.get(seat.name) ?? emptyPlayerStats(seat.name);
      const position = ensurePosition(stats, seat.position);
      const preflop = preflopActionsFor(hand, seat.name);
      const vpip = didVoluntarilyPutMoneyInPot(preflop);
      const pfr = didRaisePreflop(preflop);

      stats.hands += 1;
      position.hands += 1;

      if (vpip) {
        stats.vpip += 1;
        position.vpip += 1;
      }

      if (pfr) {
        stats.pfr += 1;
        position.pfr += 1;
      }

      if (didThreeBet(hand, seat.name)) {
        stats.threeBet += 1;
      }

      const won = hand.winnings[seat.name] ?? 0;
      stats.netWon += won;
      position.netWon += won;

      const postflopActions = hand.actions.filter((action) => action.player === seat.name && action.street !== "hole-cards");
      stats.aggressionActions += postflopActions.filter((action) => ["bets", "raises"].includes(action.type)).length;
      stats.passiveActions += postflopActions.filter((action) => ["calls", "checks"].includes(action.type)).length;

      playerStats.set(seat.name, stats);
    }
  }

  return [...playerStats.values()].map(rateStats).sort((a, b) => b.hands - a.hands);
}

export function detectLeaks(summary) {
  const leaks = [];

  for (const player of summary) {
    if (player.hands < 20) {
      leaks.push({
        player: player.player,
        severity: "info",
        title: "Need more hands",
        detail: "The current sample is small. Treat these notes as directionally useful, not conclusive."
      });
    }

    if (player.vpipPct - player.pfrPct > 18) {
      leaks.push({
        player: player.player,
        severity: "medium",
        title: "Wide call gap",
        detail: "VPIP is much higher than PFR, which often points to too much passive preflop calling."
      });
    }

    if (player.pfrPct < 10 && player.hands >= 5) {
      leaks.push({
        player: player.player,
        severity: "low",
        title: "Low preflop pressure",
        detail: "PFR is low for the sample. Check whether playable hands are being opened or 3-bet often enough."
      });
    }

    if (player.aggressionFactor < 0.6 && player.passiveActions >= 4) {
      leaks.push({
        player: player.player,
        severity: "medium",
        title: "Postflop passivity",
        detail: "Calls and checks are outnumbering bets and raises. Review missed value bets and profitable bluffs."
      });
    }
  }

  return leaks;
}
