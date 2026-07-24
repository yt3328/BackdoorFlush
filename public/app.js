import { createAuthClient } from "./auth.js";

const positionOrder = ["BTN", "CO", "HJ", "LJ", "MP", "UTG+1", "UTG", "SB", "BB", "Unknown"];
const streetOrder = ["hole-cards", "flop", "turn", "river", "show-down"];
const streetLabels = {
  "hole-cards": "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  "show-down": "Showdown"
};

const emptyBankrollSummary = {
  sessionCount: 0,
  totalProfit: 0,
  totalHours: 0,
  totalBb: 0,
  averageProfit: 0,
  hourlyRate: 0,
  bbPerHour: 0,
  winRate: 0,
  points: [],
  byLocation: [],
  byGameType: [],
  recentSessions: []
};

const state = {
  view: "overview",
  hands: [],
  imports: [],
  bankrollSessions: [],
  bankrollSummary: emptyBankrollSummary,
  players: [],
  leaks: [],
  selectedHandId: null,
  replayStep: 0,
  importPollTimer: null
};

const apiBase = window.POKER_FELT_SCOPE_API_BASE ?? "";
const auth = createAuthClient(window.POKER_FELT_SCOPE_AUTH);

const elements = {
  title: document.querySelector("#page-title"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  views: [...document.querySelectorAll(".view")],
  authStatus: document.querySelector("#auth-status"),
  signIn: document.querySelector("#sign-in"),
  signOut: document.querySelector("#sign-out"),
  authNotice: document.querySelector("#auth-notice"),
  loadDemo: document.querySelector("#load-demo"),
  clearSession: document.querySelector("#clear-session"),
  refresh: document.querySelector("#refresh"),
  playerFilter: document.querySelector("#player-filter"),
  handPlayerFilter: document.querySelector("#hand-player-filter"),
  playerStats: document.querySelector("#player-stats"),
  leakList: document.querySelector("#leak-list"),
  positionChart: document.querySelector("#position-chart"),
  importChart: document.querySelector("#import-chart"),
  bankrollChart: document.querySelector("#bankroll-chart"),
  locationChart: document.querySelector("#location-chart"),
  handList: document.querySelector("#hand-list"),
  handDetail: document.querySelector("#hand-detail"),
  bankrollForm: document.querySelector("#bankroll-form"),
  sessionList: document.querySelector("#session-list"),
  sessionSummary: document.querySelector("#session-summary"),
  importList: document.querySelector("#import-list"),
  importForm: document.querySelector("#import-form"),
  historyFile: document.querySelector("#history-file"),
  clearImportText: document.querySelector("#clear-import-text"),
  equityForm: document.querySelector("#equity-form"),
  equityResult: document.querySelector("#equity-result"),
  toast: document.querySelector("#toast"),
  metrics: {
    sideHands: document.querySelector("#side-hands"),
    hands: document.querySelector("#metric-hands"),
    players: document.querySelector("#metric-players"),
    vpip: document.querySelector("#metric-vpip"),
    leaks: document.querySelector("#metric-leaks"),
    profit: document.querySelector("#metric-profit"),
    sessions: document.querySelector("#metric-sessions"),
    hourly: document.querySelector("#metric-hourly"),
    bbhr: document.querySelector("#metric-bbhr")
  }
};

async function api(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers ?? {})
  };
  const token = auth.token();

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        error: {
          message: text
        }
      };
    }
  }

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && auth.enabled) {
      auth.clear();
      renderAuthState();
    }

    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload;
}

function canUsePrivateApi() {
  return !auth.enabled || auth.isSignedIn();
}

function clearDashboardData() {
  state.hands = [];
  state.imports = [];
  state.bankrollSessions = [];
  state.bankrollSummary = emptyBankrollSummary;
  state.players = [];
  state.leaks = [];
  state.selectedHandId = null;
  state.replayStep = 0;
}

function renderAuthState() {
  const signedIn = auth.isSignedIn();
  const needsSignIn = auth.enabled && !signedIn;

  elements.authStatus.textContent = auth.enabled
    ? signedIn
      ? auth.displayName()
      : "Signed out"
    : "Local mode";
  elements.signIn.hidden = !auth.enabled || signedIn;
  elements.signOut.hidden = !auth.enabled || !signedIn;
  elements.authNotice.hidden = !needsSignIn;
  document.body.classList.toggle("signed-out", needsSignIn);

  for (const button of [elements.loadDemo, elements.clearSession, elements.refresh]) {
    button.disabled = needsSignIn;
  }
}

function syncImportPolling() {
  if (state.importPollTimer) {
    window.clearTimeout(state.importPollTimer);
    state.importPollTimer = null;
  }

  const hasQueuedImport = state.imports.some((item) => item.status === "queued");
  if (!hasQueuedImport || !canUsePrivateApi()) {
    return;
  }

  state.importPollTimer = window.setTimeout(() => {
    state.importPollTimer = null;
    refresh({ quiet: true }).catch((error) => showToast(error.message));
  }, 2500);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setView(view) {
  state.view = view;
  elements.title.textContent = view[0].toUpperCase() + view.slice(1);

  for (const button of elements.navButtons) {
    button.classList.toggle("active", button.dataset.view === view);
  }

  for (const panel of elements.views) {
    panel.classList.toggle("active", panel.id === `view-${view}`);
  }
}

function cardClass(card) {
  return card.endsWith("h") || card.endsWith("d") ? "card red" : "card";
}

function renderCards(cards) {
  if (!cards?.length) {
    return "";
  }

  return `<div class="cards">${cards.map((card) => `<span class="${cardClass(card)}">${escapeHtml(card)}</span>`).join("")}</div>`;
}

function formatAmount(amount) {
  return amount === null || amount === undefined ? "" : ` ${Number(amount).toFixed(2)}`;
}

function formatAction(action) {
  return `${escapeHtml(action.player)} ${escapeHtml(action.type)}${formatAmount(action.amount)}`;
}

function formatCurrency(value, { compact = false, signed = false } = {}) {
  const number = Number(value ?? 0);
  const prefix = signed && number > 0 ? "+" : "";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact || Math.abs(number) >= 100 ? 0 : 2
  });

  return `${prefix}${formatter.format(number)}`;
}

function formatNumber(value, places = 1) {
  return Number(value ?? 0).toFixed(places);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function renderSparkline(points) {
  if (!points.length) {
    return '<div class="empty">No bankroll sessions yet.</div>';
  }

  const values = points.map((point) => point.cumulativeProfit);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(1, max - min);
  const width = 640;
  const height = 240;
  const padding = 28;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const coordinates = points.map((point, index) => {
    const x = padding + (points.length === 1 ? plotWidth : (index / (points.length - 1)) * plotWidth);
    const y = padding + plotHeight - ((point.cumulativeProfit - min) / span) * plotHeight;
    return {
      x,
      y,
      point
    };
  });
  const zeroY = padding + plotHeight - ((0 - min) / span) * plotHeight;
  const path = coordinates.map((entry) => `${entry.x},${entry.y}`).join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Bankroll curve">
      <line class="zero-line" x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}"></line>
      <polyline class="bankroll-line" points="${path}"></polyline>
      ${coordinates
        .map(
          ({ x, y, point }) => `
            <circle class="bankroll-point ${point.profit >= 0 ? "win" : "loss"}" cx="${x}" cy="${y}" r="5">
              <title>${escapeHtml(point.date)} ${formatCurrency(point.cumulativeProfit, { signed: true })}</title>
            </circle>
          `
        )
        .join("")}
    </svg>
    <div class="chart-axis">
      <span>${escapeHtml(formatDate(points[0].date))}</span>
      <strong>${formatCurrency(points.at(-1).cumulativeProfit, { signed: true })}</strong>
      <span>${escapeHtml(formatDate(points.at(-1).date))}</span>
    </div>
  `;
}

function renderMetrics() {
  const handCount = state.hands.length;
  const avgVpip =
    state.players.length === 0
      ? 0
      : state.players.reduce((sum, player) => sum + player.vpipPct, 0) / state.players.length;

  elements.metrics.sideHands.textContent = handCount;
  elements.metrics.hands.textContent = handCount;
  elements.metrics.players.textContent = state.players.length;
  elements.metrics.vpip.textContent = `${avgVpip.toFixed(1)}%`;
  elements.metrics.leaks.textContent = state.leaks.length;
  elements.metrics.profit.textContent = formatCurrency(state.bankrollSummary.totalProfit, {
    compact: true,
    signed: true
  });
  elements.metrics.sessions.textContent = state.bankrollSummary.sessionCount;
  elements.metrics.hourly.textContent = `${formatCurrency(state.bankrollSummary.hourlyRate, {
    compact: true,
    signed: true
  })}/hr`;
  elements.metrics.bbhr.textContent = formatNumber(state.bankrollSummary.bbPerHour, 1);
}

function renderPlayerOptions() {
  const previous = elements.playerFilter.value;
  elements.playerFilter.innerHTML = [
    '<option value="">All players</option>',
    ...state.players.map((player) => `<option value="${escapeHtml(player.player)}">${escapeHtml(player.player)}</option>`)
  ].join("");
  elements.playerFilter.value = state.players.some((player) => player.player === previous) ? previous : "";
}

function selectedPlayers() {
  const filteredPlayer = elements.playerFilter.value;
  return filteredPlayer
    ? state.players.filter((player) => player.player === filteredPlayer)
    : state.players;
}

function renderPlayerStats() {
  const players = selectedPlayers();

  elements.playerStats.innerHTML = players
    .map(
      (player) => `
        <tr>
          <td><strong>${escapeHtml(player.player)}</strong></td>
          <td>${player.hands}</td>
          <td>${player.vpipPct}%</td>
          <td>${player.pfrPct}%</td>
          <td>${player.threeBetPct}%</td>
          <td>${player.aggressionFactor}</td>
        </tr>
      `
    )
    .join("");

  if (players.length === 0) {
    elements.playerStats.innerHTML = '<tr><td colspan="6">No hands loaded yet.</td></tr>';
  }
}

function positionRows() {
  const totals = new Map();

  for (const player of selectedPlayers()) {
    for (const [position, values] of Object.entries(player.byPosition)) {
      const current = totals.get(position) ?? { hands: 0, vpip: 0, pfr: 0 };
      current.hands += values.hands;
      current.vpip += values.vpip;
      current.pfr += values.pfr;
      totals.set(position, current);
    }
  }

  return [...totals.entries()]
    .map(([position, values]) => ({
      position,
      hands: values.hands,
      vpipPct: values.hands === 0 ? 0 : Number(((values.vpip / values.hands) * 100).toFixed(1)),
      pfrPct: values.hands === 0 ? 0 : Number(((values.pfr / values.hands) * 100).toFixed(1))
    }))
    .sort((a, b) => {
      const aIndex = positionOrder.includes(a.position) ? positionOrder.indexOf(a.position) : positionOrder.length;
      const bIndex = positionOrder.includes(b.position) ? positionOrder.indexOf(b.position) : positionOrder.length;
      return aIndex - bIndex;
    });
}

function renderCharts() {
  const positions = positionRows();

  if (positions.length === 0) {
    elements.positionChart.innerHTML = '<div class="empty">Load hands to see position patterns.</div>';
  } else {
    elements.positionChart.innerHTML = positions
      .map(
        (row) => `
          <div class="chart-row-item">
            <div class="chart-label">
              <strong>${escapeHtml(row.position)}</strong>
              <span>${row.hands} hands</span>
            </div>
            <div class="bar-pair">
              <span class="bar vpip" style="width: ${row.vpipPct}%"></span>
              <span class="bar pfr" style="width: ${row.pfrPct}%"></span>
            </div>
            <div class="chart-values">VPIP ${row.vpipPct}% / PFR ${row.pfrPct}%</div>
          </div>
        `
      )
      .join("");
  }

  const imports = [...state.imports].reverse();
  const maxHands = Math.max(1, ...imports.map((item) => item.handCount));

  if (imports.length === 0) {
    elements.importChart.innerHTML = '<div class="empty">No imports yet.</div>';
    return;
  }

  elements.importChart.innerHTML = imports
    .map((item) => {
      const width = Math.max(6, (item.handCount / maxHands) * 100);
      return `
        <div class="chart-row-item compact">
          <div class="chart-label">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${new Date(item.importedAt).toLocaleDateString()}</span>
          </div>
          <div class="single-bar">
            <span style="width: ${width}%"></span>
          </div>
          <div class="chart-values">${item.handCount} new / ${item.skippedCount ?? 0} skipped</div>
        </div>
      `;
    })
    .join("");
}

function renderBankrollCharts() {
  elements.bankrollChart.innerHTML = renderSparkline(state.bankrollSummary.points ?? []);

  const locations = state.bankrollSummary.byLocation ?? [];
  const maxProfit = Math.max(1, ...locations.map((item) => Math.abs(item.profit)));

  if (locations.length === 0) {
    elements.locationChart.innerHTML = '<div class="empty">Add sessions to compare locations.</div>';
    return;
  }

  elements.locationChart.innerHTML = locations
    .map((item) => {
      const width = Math.max(6, (Math.abs(item.profit) / maxProfit) * 100);
      return `
        <div class="chart-row-item compact">
          <div class="chart-label">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${item.sessions} sessions / ${formatNumber(item.hours, 1)}h</span>
          </div>
          <div class="single-bar ${item.profit >= 0 ? "positive" : "negative"}">
            <span style="width: ${width}%"></span>
          </div>
          <div class="chart-values">${formatCurrency(item.profit, { signed: true })} / ${formatNumber(item.bbPerHour, 1)} bb/hr</div>
        </div>
      `;
    })
    .join("");
}

function renderLeaks() {
  if (state.leaks.length === 0) {
    elements.leakList.innerHTML = '<div class="empty">No review signals yet.</div>';
    return;
  }

  elements.leakList.innerHTML = state.leaks
    .map(
      (leak) => `
        <article class="leak ${leak.severity}">
          <div class="leak-title">
            <strong>${escapeHtml(leak.title)}</strong>
            <span class="pill">${escapeHtml(leak.player)}</span>
          </div>
          <p>${escapeHtml(leak.detail)}</p>
        </article>
      `
    )
    .join("");
}

function renderSessionSummary() {
  const summary = state.bankrollSummary;

  elements.sessionSummary.innerHTML = `
    <div class="session-kpis">
      <div>
        <span class="subtle">Profit</span>
        <strong>${formatCurrency(summary.totalProfit, { signed: true })}</strong>
      </div>
      <div>
        <span class="subtle">Hours</span>
        <strong>${formatNumber(summary.totalHours, 1)}</strong>
      </div>
      <div>
        <span class="subtle">Win rate</span>
        <strong>${formatNumber(summary.winRate, 1)}%</strong>
      </div>
      <div>
        <span class="subtle">BB/hr</span>
        <strong>${formatNumber(summary.bbPerHour, 1)}</strong>
      </div>
    </div>
  `;
}

function renderSessions() {
  renderSessionSummary();

  if (state.bankrollSessions.length === 0) {
    elements.sessionList.innerHTML = '<div class="empty">No bankroll sessions yet.</div>';
    return;
  }

  elements.sessionList.innerHTML = state.bankrollSessions
    .map(
      (session) => `
        <article class="session-row">
          <div>
            <div class="session-row-title">
              <strong>${escapeHtml(session.location)}</strong>
              <span class="pill">${escapeHtml(session.stakes || session.gameType)}</span>
            </div>
            <p>${escapeHtml(formatDate(session.date))} / ${escapeHtml(session.gameType)} / ${formatNumber(session.hours, 1)}h</p>
            <p>${formatCurrency(session.profit, { signed: true })} / ${formatNumber(session.bbPerHour, 1)} bb/hr / ${formatCurrency(session.hourlyRate, { signed: true })}/hr</p>
            ${session.notes ? `<p>${escapeHtml(session.notes)}</p>` : ""}
          </div>
          <button class="button danger" type="button" data-delete-bankroll-session="${escapeHtml(session.id)}">Delete</button>
        </article>
      `
    )
    .join("");
}

function filteredHands() {
  const filter = elements.handPlayerFilter.value.trim().toLowerCase();
  return filter
    ? state.hands.filter((hand) => hand.players.some((player) => player.name.toLowerCase().includes(filter)))
    : state.hands;
}

function renderHands() {
  const hands = filteredHands();

  if (hands.length === 0) {
    elements.handList.innerHTML = '<div class="empty">No matching hands.</div>';
    return;
  }

  elements.handList.innerHTML = hands
    .map((hand) => {
      const heroCards = hand.hero ? hand.holeCards[hand.hero] : [];
      const winners = Object.keys(hand.winnings);
      const active = hand.id === state.selectedHandId ? "active" : "";
      return `
        <button class="hand ${active}" type="button" data-hand-id="${escapeHtml(hand.id)}">
          <div class="hand-title">
            <strong>#${escapeHtml(hand.handNumber)}</strong>
            <span class="pill">${escapeHtml(hand.tableName ?? "Table")}</span>
          </div>
          ${renderCards([...heroCards, ...hand.board])}
          <p>${escapeHtml(hand.hero ?? "Unknown")} ${heroCards?.length ? "was dealt" : "sat in"} ${escapeHtml(heroCards?.join(" ") ?? "")}. Winner: ${escapeHtml(winners.join(", ") || "not shown")}.</p>
        </button>
      `;
    })
    .join("");
}

function replaySteps(hand) {
  return [
    {
      street: "hole-cards",
      action: null
    },
    ...hand.actions.map((action) => ({
      street: action.street,
      action
    }))
  ];
}

function boardForStreet(hand, street) {
  const index = streetOrder.indexOf(street);

  if (index <= streetOrder.indexOf("hole-cards")) {
    return [];
  }

  if (street === "flop") {
    return hand.board.slice(0, 3);
  }

  if (street === "turn") {
    return hand.board.slice(0, 4);
  }

  return hand.board.slice(0, 5);
}

function foldedPlayersAt(hand, stepIndex) {
  return new Set(
    hand.actions
      .slice(0, Math.max(0, stepIndex))
      .filter((action) => action.type === "folds")
      .map((action) => action.player)
  );
}

function trackedPotAt(hand, stepIndex) {
  return hand.actions
    .slice(0, Math.max(0, stepIndex))
    .reduce((sum, action) => sum + (Number(action.amount) || 0), 0);
}

function renderReplayer(hand, steps) {
  const step = steps[state.replayStep] ?? steps[0];
  const activePlayer = step.action?.player ?? null;
  const visibleBoard = boardForStreet(hand, step.street);
  const foldedPlayers = foldedPlayersAt(hand, state.replayStep);
  const trackedPot = trackedPotAt(hand, state.replayStep);
  const heroCards = hand.hero ? hand.holeCards[hand.hero] : [];
  const actionText = step.action
    ? formatAction(step.action)
    : `Hand #${escapeHtml(hand.handNumber)} ready`;
  const seats = hand.players
    .map((player, index) => {
      const isHero = player.name === hand.hero;
      const isActive = player.name === activePlayer;
      const isFolded = foldedPlayers.has(player.name);
      const cards = isHero ? heroCards : ["??", "??"];

      return `
        <div class="replay-seat seat-pos-${index % 6} ${isActive ? "active" : ""} ${isFolded ? "folded" : ""}">
          <span>${escapeHtml(player.position ?? `Seat ${player.seat}`)}</span>
          <strong>${escapeHtml(player.name)}</strong>
          <small>${Number(player.stack).toFixed(2)}</small>
          <div class="mini-cards">${cards.map((card) => `<em class="${cardClass(card)}">${escapeHtml(card)}</em>`).join("")}</div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="replayer">
      <div class="replay-table">
        ${seats}
        <div class="board-zone">
          <span class="subtle">${escapeHtml(streetLabels[step.street] ?? step.street)}</span>
          ${renderCards(visibleBoard)}
          <strong>${formatCurrency(trackedPot)}</strong>
          <small>tracked pot</small>
        </div>
      </div>
      <div class="replay-controls">
        <button class="button secondary" type="button" data-replay="start">Start</button>
        <button class="button secondary" type="button" data-replay="prev">Prev</button>
        <div class="replay-action">
          <strong>${actionText}</strong>
          <span>${state.replayStep + 1} / ${steps.length}</span>
        </div>
        <button class="button secondary" type="button" data-replay="next">Next</button>
        <button class="button secondary" type="button" data-replay="end">End</button>
      </div>
    </section>
  `;
}

function renderHandDetail() {
  const hand = state.hands.find((item) => item.id === state.selectedHandId);

  if (!hand) {
    elements.handDetail.innerHTML = '<div class="empty">Select a hand to review the action.</div>';
    return;
  }

  const heroCards = hand.hero ? hand.holeCards[hand.hero] : [];
  const steps = replaySteps(hand);
  state.replayStep = Math.max(0, Math.min(state.replayStep, steps.length - 1));
  const actionGroups = new Map(streetOrder.map((street) => [street, []]));

  for (const action of hand.actions) {
    if (!actionGroups.has(action.street)) {
      actionGroups.set(action.street, []);
    }
    actionGroups.get(action.street).push(action);
  }

  const seats = hand.players
    .map(
      (player) => `
        <li>
          <span>${escapeHtml(player.position ?? "Seat")}</span>
          <strong>${escapeHtml(player.name)}</strong>
          <small>${Number(player.stack).toFixed(2)}</small>
        </li>
      `
    )
    .join("");

  const streets = [...actionGroups.entries()]
    .filter(([, actions]) => actions.length > 0)
    .map(
      ([street, actions]) => `
        <section class="street">
          <h4>${streetLabels[street] ?? escapeHtml(street)}</h4>
          <ol>
            ${actions.map((action) => `<li>${formatAction(action)}</li>`).join("")}
          </ol>
        </section>
      `
    )
    .join("");

  elements.handDetail.innerHTML = `
    <article class="detail-summary">
      <div>
        <span class="subtle">Hand</span>
        <strong>#${escapeHtml(hand.handNumber)}</strong>
      </div>
      <div>
        <span class="subtle">Hero</span>
        <strong>${escapeHtml(hand.hero ?? "Unknown")}</strong>
      </div>
    </article>
    ${renderReplayer(hand, steps)}
    <ul class="seat-list">${seats}</ul>
    <div class="street-list">${streets || '<div class="empty">No actions parsed for this hand.</div>'}</div>
  `;
}

function renderImports() {
  if (state.imports.length === 0) {
    elements.importList.innerHTML = '<div class="empty">No imports yet.</div>';
    return;
  }

  elements.importList.innerHTML = state.imports
    .map((item) => {
      const status = item.status ?? "ready";
      const statusLine =
        status === "queued"
          ? "Queued for parsing"
          : status === "failed"
            ? escapeHtml(item.errorMessage ?? "Parsing failed")
            : `${item.handCount} new hands from ${escapeHtml(item.source)} on ${new Date(item.importedAt).toLocaleString()}`;

      return `
        <article class="import-row">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p><span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span> ${statusLine}</p>
            <p>${item.skippedCount ?? 0} duplicate hands skipped</p>
          </div>
          <button class="button danger" type="button" data-delete-import="${escapeHtml(item.id)}" ${status === "queued" ? "disabled" : ""}>Delete</button>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderAuthState();

  if (state.selectedHandId && !state.hands.some((hand) => hand.id === state.selectedHandId)) {
    state.selectedHandId = null;
    state.replayStep = 0;
  }

  if (!state.selectedHandId && state.hands.length > 0) {
    state.selectedHandId = state.hands[0].id;
    state.replayStep = 0;
  }

  renderMetrics();
  renderPlayerOptions();
  renderPlayerStats();
  renderCharts();
  renderBankrollCharts();
  renderLeaks();
  renderSessions();
  renderHands();
  renderHandDetail();
  renderImports();
  syncImportPolling();
}

async function refresh({ quiet = false } = {}) {
  if (!canUsePrivateApi()) {
    clearDashboardData();
    render();
    return;
  }

  const [
    handsPayload,
    importsPayload,
    statsPayload,
    leaksPayload,
    bankrollSessionsPayload,
    bankrollSummaryPayload
  ] = await Promise.all([
    api("/api/hands?limit=500"),
    api("/api/imports"),
    api("/api/stats/summary"),
    api("/api/leaks"),
    api("/api/bankroll/sessions"),
    api("/api/bankroll/summary")
  ]);

  state.hands = handsPayload.hands;
  state.imports = importsPayload.imports;
  state.players = statsPayload.players;
  state.leaks = leaksPayload.leaks;
  state.bankrollSessions = bankrollSessionsPayload.sessions;
  state.bankrollSummary = bankrollSummaryPayload.summary;
  render();

  if (!quiet) {
    renderAuthState();
  }
}

function readSelectedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsText(file);
  });
}

elements.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

elements.loadDemo.addEventListener("click", async () => {
  try {
    const payload = await api("/api/demo", { method: "POST" });
    await refresh();
    showToast(
      payload.duplicate
        ? "Sample was already loaded."
        : payload.import.status === "queued"
          ? "Sample queued for parsing."
          : `Loaded ${payload.import.handCount} sample hands.`
    );
  } catch (error) {
    showToast(error.message);
  }
});

elements.clearSession.addEventListener("click", async () => {
  if (!window.confirm("Clear all imported hands from this workspace?")) {
    return;
  }

  try {
    const payload = await api("/api/session", { method: "DELETE" });
    state.selectedHandId = null;
    await refresh();
    showToast(`Cleared ${payload.removedHands} hands.`);
  } catch (error) {
    showToast(error.message);
  }
});

elements.refresh.addEventListener("click", async () => {
  try {
    await refresh();
    showToast("Dashboard refreshed.");
  } catch (error) {
    showToast(error.message);
  }
});

elements.playerFilter.addEventListener("change", () => {
  renderPlayerStats();
  renderCharts();
});
elements.handPlayerFilter.addEventListener("input", renderHands);

elements.handList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-hand-id]");
  if (!target) {
    return;
  }

  state.selectedHandId = target.dataset.handId;
  state.replayStep = 0;
  renderHands();
  renderHandDetail();
});

elements.handDetail.addEventListener("click", (event) => {
  const target = event.target.closest("[data-replay]");
  if (!target) {
    return;
  }

  const hand = state.hands.find((item) => item.id === state.selectedHandId);
  if (!hand) {
    return;
  }

  const steps = replaySteps(hand);
  const action = target.dataset.replay;
  if (action === "start") {
    state.replayStep = 0;
  } else if (action === "prev") {
    state.replayStep = Math.max(0, state.replayStep - 1);
  } else if (action === "next") {
    state.replayStep = Math.min(steps.length - 1, state.replayStep + 1);
  } else if (action === "end") {
    state.replayStep = steps.length - 1;
  }

  renderHandDetail();
});

elements.importList.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-delete-import]");
  if (!target || !window.confirm("Delete this import and its hands?")) {
    return;
  }

  try {
    const payload = await api(`/api/imports/${encodeURIComponent(target.dataset.deleteImport)}`, {
      method: "DELETE"
    });
    await refresh();
    showToast(`Deleted ${payload.removedHands} hands.`);
  } catch (error) {
    showToast(error.message);
  }
});

elements.historyFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const rawText = await readSelectedFile(file);
    elements.importForm.elements.rawText.value = rawText;
    elements.importForm.elements.name.value = file.name.replace(/\.[^.]+$/, "") || "Imported session";
    elements.importForm.elements.source.value = "file-upload";
    showToast(`Loaded ${file.name} into the import form.`);
  } catch (error) {
    showToast(error.message);
  }
});

elements.clearImportText.addEventListener("click", () => {
  elements.importForm.elements.rawText.value = "";
  elements.historyFile.value = "";
});

elements.bankrollForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const payload = await api("/api/bankroll/sessions", {
      method: "POST",
      body: {
        date: form.get("date"),
        location: form.get("location"),
        gameType: form.get("gameType"),
        stakes: form.get("stakes"),
        tableSize: form.get("tableSize"),
        hours: form.get("hours"),
        buyIn: form.get("buyIn"),
        cashOut: form.get("cashOut"),
        profit: form.get("profit"),
        bigBlind: form.get("bigBlind"),
        notes: form.get("notes")
      }
    });
    await refresh();
    showToast(`Added ${formatCurrency(payload.session.profit, { signed: true })} session.`);
  } catch (error) {
    showToast(error.message);
  }
});

elements.sessionList.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-delete-bankroll-session]");
  if (!target || !window.confirm("Delete this bankroll session?")) {
    return;
  }

  try {
    const payload = await api(`/api/bankroll/sessions/${encodeURIComponent(target.dataset.deleteBankrollSession)}`, {
      method: "DELETE"
    });
    await refresh();
    showToast(`Deleted ${formatCurrency(payload.session.profit, { signed: true })} session.`);
  } catch (error) {
    showToast(error.message);
  }
});

elements.importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const payload = await api("/api/imports", {
      method: "POST",
      body: {
        name: form.get("name"),
        source: form.get("source"),
        rawText: form.get("rawText")
      }
    });
    await refresh();
    showToast(
      payload.duplicate
        ? "That session is already imported."
        : payload.import.status === "queued"
          ? "Upload queued for parsing."
          : `Imported ${payload.import.handCount} hands.`
    );
  } catch (error) {
    showToast(error.message);
  }
});

elements.equityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    elements.equityResult.innerHTML = "<strong>...</strong><span>running</span>";
    const payload = await api("/api/equity/calculate", {
      method: "POST",
      body: {
        holeCards: String(form.get("holeCards")).trim().split(/\s+/),
        boardCards: String(form.get("boardCards")).trim().split(/\s+/).filter(Boolean),
        opponents: Number(form.get("opponents")),
        iterations: Number(form.get("iterations"))
      }
    });

    const result = payload.result;
    elements.equityResult.innerHTML = `
      <strong>${result.equityPct}%</strong>
      <span>${result.wins} wins, ${result.ties} ties, ${result.losses} losses</span>
    `;
  } catch (error) {
    elements.equityResult.innerHTML = "<strong>--</strong><span>equity</span>";
    showToast(error.message);
  }
});

elements.signIn.addEventListener("click", () => {
  auth.signIn().catch((error) => showToast(error.message));
});

elements.signOut.addEventListener("click", () => {
  auth.signOut();
  clearDashboardData();
  render();
});

async function boot() {
  if (elements.bankrollForm?.elements.date) {
    elements.bankrollForm.elements.date.value = new Date().toISOString().slice(0, 10);
  }

  try {
    await auth.finishRedirect();
  } catch (error) {
    showToast(error.message);
  }

  if (canUsePrivateApi()) {
    await refresh();
    return;
  }

  clearDashboardData();
  render();
}

boot().catch((error) => showToast(error.message));
