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
const viewTitles = {
  overview: "Overview",
  sessions: "Sessions",
  hands: "Hands",
  live: "Live Hand",
  equity: "Equity",
  imports: "Imports"
};
const suggestedReviewTags = [
  "river-decision",
  "bluff",
  "value-bet",
  "bad-call",
  "3-bet-pot",
  "multiway",
  "all-in",
  "live-hand"
];

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
  reviewSpots: [],
  studyTags: [],
  similarHands: [],
  similarForHandId: null,
  selectedSessionId: null,
  selectedHandId: null,
  liveActions: [],
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
  handTagFilter: document.querySelector("#hand-tag-filter"),
  handReviewFilter: document.querySelector("#hand-review-filter"),
  handPositionFilter: document.querySelector("#hand-position-filter"),
  handSessionFilter: document.querySelector("#hand-session-filter"),
  handResultFilter: document.querySelector("#hand-result-filter"),
  handSort: document.querySelector("#hand-sort"),
  handLibrarySummary: document.querySelector("#hand-library-summary"),
  reviewStatusFilter: document.querySelector("#review-status-filter"),
  reviewSort: document.querySelector("#review-sort"),
  playerStats: document.querySelector("#player-stats"),
  leakList: document.querySelector("#leak-list"),
  tagSummary: document.querySelector("#tag-summary"),
  positionChart: document.querySelector("#position-chart"),
  importChart: document.querySelector("#import-chart"),
  bankrollChart: document.querySelector("#bankroll-chart"),
  locationChart: document.querySelector("#location-chart"),
  handList: document.querySelector("#hand-list"),
  handDetail: document.querySelector("#hand-detail"),
  bankrollForm: document.querySelector("#bankroll-form"),
  bankrollFormTitle: document.querySelector("#bankroll-form-title"),
  bankrollSubmit: document.querySelector("#bankroll-submit"),
  bankrollCancel: document.querySelector("#bankroll-cancel"),
  sessionList: document.querySelector("#session-list"),
  sessionSummary: document.querySelector("#session-summary"),
  sessionDetail: document.querySelector("#session-detail"),
  importList: document.querySelector("#import-list"),
  importForm: document.querySelector("#import-form"),
  importSession: document.querySelector("#import-session"),
  liveForm: document.querySelector("#live-hand-form"),
  liveSession: document.querySelector("#live-session"),
  liveHero: document.querySelector("#live-hero"),
  livePlayerRows: [...document.querySelectorAll("[data-live-player-row]")],
  liveActionStreet: document.querySelector("#live-action-street"),
  liveActionPlayer: document.querySelector("#live-action-player"),
  liveActionType: document.querySelector("#live-action-type"),
  liveActionAmount: document.querySelector("#live-action-amount"),
  liveAddAction: document.querySelector("#live-add-action"),
  liveActionList: document.querySelector("#live-action-list"),
  liveWinner: document.querySelector("#live-winner"),
  livePreview: document.querySelector("#live-preview"),
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
  state.reviewSpots = [];
  state.studyTags = [];
  state.similarHands = [];
  state.similarForHandId = null;
  state.selectedSessionId = null;
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
  elements.title.textContent = viewTitles[view] ?? view[0].toUpperCase() + view.slice(1);

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

function sessionId(session) {
  return session?.sessionId ?? session?.id ?? "";
}

function sessionById(id) {
  return state.bankrollSessions.find((session) => sessionId(session) === id) ?? null;
}

function sessionLabel(session) {
  if (!session) {
    return "No linked session";
  }

  return `${formatDate(session.date)} ${session.location} ${session.stakes || session.gameType}`.trim();
}

function importsForSession(id) {
  return state.imports.filter((item) => item.sessionId === id);
}

function handsForSession(id) {
  return state.hands.filter((hand) => hand.sessionId === id);
}

function estimatedHeroResult(hand) {
  if (!hand.hero) {
    return 0;
  }

  const committed = hand.actions
    .filter((action) => action.player === hand.hero)
    .reduce((sum, action) => sum + (Number(action.amount) || 0), 0);
  return Number(((Number(hand.winnings?.[hand.hero]) || 0) - committed).toFixed(2));
}

function trackedPot(hand) {
  return (hand.actions ?? []).reduce((sum, action) => sum + (Number(action.amount) || 0), 0);
}

function handTags(hand) {
  return Array.isArray(hand.tags) ? hand.tags : [];
}

function normalizeTag(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tagLabel(tag) {
  return String(tag ?? "").replaceAll("-", " ");
}

function heroPosition(hand) {
  return (hand.players ?? []).find((player) => player.name === hand.hero)?.position ?? "Unknown";
}

function resultBucket(hand) {
  const result = estimatedHeroResult(hand);
  if (result > 0) {
    return "win";
  }

  if (result < 0) {
    return "loss";
  }

  return "breakeven";
}

function handDateValue(hand) {
  return Date.parse(hand.importedAt ?? hand.createdAt ?? "") || 0;
}

function reviewQueuePath() {
  const params = new URLSearchParams({
    limit: "12",
    sort: elements.reviewSort?.value || "priority"
  });
  const reviewed = elements.reviewStatusFilter?.value ?? "false";

  if (reviewed) {
    params.set("reviewed", reviewed);
  }

  return `/api/review/spots?${params.toString()}`;
}

function renderTags(tags, { interactive = false, activeTags = [] } = {}) {
  const items = [...new Set(tags.filter(Boolean))];
  if (items.length === 0) {
    return "";
  }

  return `
    <div class="tag-list">
      ${items.map((tag) => {
        const active = activeTags.includes(tag) ? "active" : "";
        const body = `<span>${escapeHtml(tagLabel(tag))}</span>`;
        return interactive
          ? `<button class="tag-chip ${active}" type="button" data-review-tag="${escapeHtml(tag)}">${body}</button>`
          : `<span class="tag-chip ${active}">${body}</span>`;
      }).join("")}
    </div>
  `;
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
  elements.metrics.leaks.textContent = state.reviewSpots.length;
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

function renderSessionOptions() {
  const previous = elements.importSession.value;
  elements.importSession.innerHTML = [
    '<option value="">No linked session</option>',
    ...state.bankrollSessions.map((session) => (
      `<option value="${escapeHtml(sessionId(session))}">${escapeHtml(sessionLabel(session))}</option>`
    ))
  ].join("");
  elements.importSession.value = state.bankrollSessions.some((session) => sessionId(session) === previous) ? previous : "";
}

function renderLiveSessionOptions() {
  const previous = elements.liveSession.value;
  elements.liveSession.innerHTML = [
    '<option value="">No linked session</option>',
    ...state.bankrollSessions.map((session) => (
      `<option value="${escapeHtml(sessionId(session))}">${escapeHtml(sessionLabel(session))}</option>`
    ))
  ].join("");
  elements.liveSession.value = state.bankrollSessions.some((session) => sessionId(session) === previous) ? previous : "";
}

function allReviewTags() {
  return [...new Set([
    ...state.studyTags.map((row) => row.tag),
    ...state.hands.flatMap((hand) => handTags(hand)),
    ...suggestedReviewTags
  ].filter(Boolean))].sort((a, b) => tagLabel(a).localeCompare(tagLabel(b)));
}

function renderHandFilterOptions() {
  const previous = {
    tag: elements.handTagFilter.value,
    reviewed: elements.handReviewFilter.value,
    position: elements.handPositionFilter.value,
    session: elements.handSessionFilter.value,
    result: elements.handResultFilter.value,
    sort: elements.handSort.value
  };
  const positions = [...new Set(state.hands.map(heroPosition).filter(Boolean))]
    .sort((a, b) => {
      const aIndex = positionOrder.includes(a) ? positionOrder.indexOf(a) : positionOrder.length;
      const bIndex = positionOrder.includes(b) ? positionOrder.indexOf(b) : positionOrder.length;
      return aIndex - bIndex || a.localeCompare(b);
    });

  elements.handTagFilter.innerHTML = [
    '<option value="">All tags</option>',
    ...allReviewTags().map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tagLabel(tag))}</option>`)
  ].join("");
  elements.handPositionFilter.innerHTML = [
    '<option value="">All positions</option>',
    ...positions.map((position) => `<option value="${escapeHtml(position)}">${escapeHtml(position)}</option>`)
  ].join("");
  elements.handSessionFilter.innerHTML = [
    '<option value="">All sessions</option>',
    ...state.bankrollSessions.map((session) => (
      `<option value="${escapeHtml(sessionId(session))}">${escapeHtml(sessionLabel(session))}</option>`
    ))
  ].join("");

  elements.handTagFilter.value = allReviewTags().includes(previous.tag) ? previous.tag : "";
  elements.handReviewFilter.value = ["", "true", "false"].includes(previous.reviewed) ? previous.reviewed : "";
  elements.handPositionFilter.value = positions.includes(previous.position) ? previous.position : "";
  elements.handSessionFilter.value = state.bankrollSessions.some((session) => sessionId(session) === previous.session) ? previous.session : "";
  elements.handResultFilter.value = ["", "win", "loss", "breakeven"].includes(previous.result) ? previous.result : "";
  elements.handSort.value = ["newest", "biggest-loss", "biggest-win", "biggest-pot", "unreviewed"].includes(previous.sort) ? previous.sort : "newest";
}

function livePlayers() {
  return elements.livePlayerRows
    .map((row, index) => ({
      seat: row.querySelector("[data-live-seat]").value || index + 1,
      name: row.querySelector("[data-live-player-name]").value.trim(),
      position: row.querySelector("[data-live-position]").value,
      stack: row.querySelector("[data-live-stack]").value
    }))
    .filter((player) => player.name);
}

function livePlayerNames() {
  const names = new Set(livePlayers().map((player) => player.name));
  const hero = elements.liveHero.value.trim();
  if (hero) {
    names.add(hero);
  }
  return [...names];
}

function renderLivePlayerOptions() {
  const names = livePlayerNames();
  const previousActionPlayer = elements.liveActionPlayer.value;
  const previousWinner = elements.liveWinner.value;
  const options = names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

  elements.liveActionPlayer.innerHTML = options || '<option value="">No players</option>';
  elements.liveActionPlayer.value = names.includes(previousActionPlayer) ? previousActionPlayer : names[0] ?? "";
  elements.liveWinner.innerHTML = [
    '<option value="">No winner recorded</option>',
    ...names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
  ].join("");
  elements.liveWinner.value = names.includes(previousWinner) ? previousWinner : "";
}

function renderLiveActions() {
  if (state.liveActions.length === 0) {
    elements.liveActionList.innerHTML = '<div class="empty compact">No actions yet.</div>';
    return;
  }

  elements.liveActionList.innerHTML = state.liveActions
    .map((action, index) => `
      <div class="live-action-row">
        <span>${escapeHtml(streetLabels[action.street] ?? action.street)}</span>
        <strong>${formatAction(action)}</strong>
        <button class="button ghost" type="button" data-delete-live-action="${index}">Remove</button>
      </div>
    `)
    .join("");
}

function renderLivePreview() {
  const form = new FormData(elements.liveForm);
  const session = sessionById(elements.liveSession.value);
  const hero = form.get("hero") || "Hero";
  const heroCards = String(form.get("heroCards") ?? "").trim().split(/[\s,]+/).filter(Boolean);
  const board = String(form.get("boardCards") ?? "").trim().split(/[\s,]+/).filter(Boolean);
  const players = livePlayers();

  elements.livePreview.innerHTML = `
    <article class="preview-card">
      <span class="subtle">Session</span>
      <strong>${escapeHtml(sessionLabel(session))}</strong>
    </article>
    <article class="preview-card">
      <span class="subtle">Hero</span>
      <strong>${escapeHtml(hero)}</strong>
      ${renderCards(heroCards)}
    </article>
    <article class="preview-card">
      <span class="subtle">Board</span>
      ${board.length ? renderCards(board) : "<strong>Not set</strong>"}
    </article>
    <article class="preview-card">
      <span class="subtle">Seats</span>
      <strong>${players.length}</strong>
    </article>
    <article class="preview-card">
      <span class="subtle">Actions</span>
      <strong>${state.liveActions.length}</strong>
    </article>
  `;
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

function renderReviewQueue() {
  if (state.reviewSpots.length === 0) {
    elements.leakList.innerHTML = '<div class="empty">No hands in the review queue yet.</div>';
    return;
  }

  elements.leakList.innerHTML = state.reviewSpots
    .map(
      (spot) => `
        <article class="review-spot">
          <div class="review-spot-main">
            <div>
              <strong>#${escapeHtml(spot.handNumber)} / ${escapeHtml(spot.tableName ?? "Table")}</strong>
              <p>${escapeHtml(spot.reasons.join(" / "))}</p>
            </div>
            <span>${formatCurrency(spot.estimatedHeroResult, { signed: true })}</span>
          </div>
          <div class="review-spot-meta">
            ${renderCards([...(spot.heroCards ?? []), ...(spot.board ?? [])])}
            ${renderTags(spot.tags ?? [])}
            ${spot.reviewedAt ? '<span class="status ready">reviewed</span>' : '<span class="status queued">open</span>'}
          </div>
          <div class="review-spot-actions">
            <button class="button secondary" type="button" data-review-spot-hand="${escapeHtml(spot.id)}">Open</button>
            ${
              spot.reviewedAt
                ? `<button class="button ghost" type="button" data-queue-reopen="${escapeHtml(spot.id)}">Reopen</button>`
                : `<button class="button ghost" type="button" data-queue-mark-reviewed="${escapeHtml(spot.id)}">Mark Reviewed</button>`
            }
          </div>
        </article>
      `
    )
    .join("");
}

function renderTagSummary() {
  if (state.studyTags.length === 0) {
    elements.tagSummary.innerHTML = '<div class="empty compact">No tagged hands yet.</div>';
    return;
  }

  elements.tagSummary.innerHTML = state.studyTags
    .slice(0, 6)
    .map((row) => `
      <button class="tag-summary-row" type="button" data-filter-tag="${escapeHtml(row.tag)}">
        <span>
          <strong>${escapeHtml(tagLabel(row.tag))}</strong>
          <small>${row.handCount} hands / ${row.reviewedPct}% reviewed</small>
        </span>
        <em>${formatCurrency(row.totalResult, { signed: true })}</em>
      </button>
    `)
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

function resetBankrollForm() {
  elements.bankrollForm.reset();
  elements.bankrollForm.elements.date.value = new Date().toISOString().slice(0, 10);
  elements.bankrollForm.elements.location.value = "PokerStars";
  elements.bankrollForm.elements.gameType.value = "cash";
  elements.bankrollForm.elements.stakes.value = "$0.05/$0.10";
  elements.bankrollForm.elements.tableSize.value = "6";
  elements.bankrollForm.elements.hours.value = "2.5";
  elements.bankrollForm.elements.buyIn.value = "50";
  elements.bankrollForm.elements.cashOut.value = "64";
  elements.bankrollForm.elements.bigBlind.value = "0.10";
  elements.bankrollForm.dataset.editingSessionId = "";
  elements.bankrollFormTitle.textContent = "New Session";
  elements.bankrollSubmit.textContent = "Add Session";
  elements.bankrollCancel.hidden = true;
}

function fillBankrollForm(session) {
  elements.bankrollForm.elements.date.value = session.date ?? "";
  elements.bankrollForm.elements.location.value = session.location ?? "";
  elements.bankrollForm.elements.gameType.value = session.gameType ?? "cash";
  elements.bankrollForm.elements.stakes.value = session.stakes ?? "";
  elements.bankrollForm.elements.tableSize.value = session.tableSize ?? "";
  elements.bankrollForm.elements.hours.value = session.hours ?? "";
  elements.bankrollForm.elements.buyIn.value = session.buyIn ?? "";
  elements.bankrollForm.elements.cashOut.value = session.cashOut ?? "";
  elements.bankrollForm.elements.profit.value =
    session.buyIn === null && session.cashOut === null ? session.profit ?? "" : "";
  elements.bankrollForm.elements.bigBlind.value = session.bigBlind ?? "";
  elements.bankrollForm.elements.notes.value = session.notes ?? "";
  elements.bankrollForm.dataset.editingSessionId = sessionId(session);
  elements.bankrollFormTitle.textContent = "Edit Session";
  elements.bankrollSubmit.textContent = "Save Session";
  elements.bankrollCancel.hidden = false;
}

function renderSessionDetail() {
  const selectedSession = sessionById(state.selectedSessionId);

  if (!selectedSession) {
    elements.sessionDetail.innerHTML = '<div class="empty">Select a session to see linked imports and hands.</div>';
    return;
  }

  const id = sessionId(selectedSession);
  const linkedImports = importsForSession(id);
  const linkedHands = handsForSession(id);
  const sessionQueue = state.reviewSpots.filter((spot) => spot.sessionId === id).slice(0, 5);
  const estimatedResult = linkedHands.reduce((sum, hand) => sum + estimatedHeroResult(hand), 0);
  const spots = linkedHands
    .map((hand) => ({
      hand,
      result: estimatedHeroResult(hand)
    }))
    .sort((a, b) => Math.abs(b.result) - Math.abs(a.result))
    .slice(0, 6);

  elements.sessionDetail.innerHTML = `
    <section class="session-detail-card">
      <div class="session-detail-head">
        <div>
          <span class="subtle">Selected session</span>
          <strong>${escapeHtml(sessionLabel(selectedSession))}</strong>
        </div>
        <span class="pill">${linkedHands.length} hands</span>
      </div>
      <div class="detail-summary compact">
        <div>
          <span class="subtle">Logged result</span>
          <strong>${formatCurrency(selectedSession.profit, { signed: true })}</strong>
        </div>
        <div>
          <span class="subtle">Estimated from hands</span>
          <strong>${formatCurrency(estimatedResult, { signed: true })}</strong>
        </div>
      </div>
      <div class="linked-section">
        <h4>Linked Imports</h4>
        ${
          linkedImports.length
            ? linkedImports.map((item) => `<p>${escapeHtml(item.name)} / ${item.handCount} hands / ${escapeHtml(item.status ?? "ready")}</p>`).join("")
            : '<p class="muted-line">No imports linked yet.</p>'
        }
      </div>
      <div class="linked-section">
        <h4>Review Queue</h4>
        ${
          sessionQueue.length
            ? sessionQueue.map((spot) => `
                <button class="linked-hand" type="button" data-open-hand="${escapeHtml(spot.id)}">
                  <span>#${escapeHtml(spot.handNumber)} / ${escapeHtml(spot.reasons.join(", "))}</span>
                  <strong>${formatCurrency(spot.estimatedHeroResult, { signed: true })}</strong>
                </button>
              `).join("")
            : '<p class="muted-line">Tagged hands and large decision points appear here.</p>'
        }
      </div>
      <div class="linked-section">
        <h4>Largest Swings</h4>
        ${
          spots.length
            ? spots.map(({ hand, result }) => `
                <button class="linked-hand" type="button" data-open-hand="${escapeHtml(hand.id)}">
                  <span>#${escapeHtml(hand.handNumber)} / ${escapeHtml(hand.tableName ?? "Table")}</span>
                  <strong>${formatCurrency(result, { signed: true })}</strong>
                </button>
              `).join("")
            : '<p class="muted-line">Linked hands appear here after an import finishes parsing.</p>'
        }
      </div>
    </section>
  `;
}

function renderSessions() {
  renderSessionSummary();

  if (state.bankrollSessions.length === 0) {
    elements.sessionList.innerHTML = '<div class="empty">No bankroll sessions yet.</div>';
    renderSessionDetail();
    return;
  }

  elements.sessionList.innerHTML = state.bankrollSessions
    .map(
      (session) => {
        const id = sessionId(session);
        const linkedHands = handsForSession(id).length;
        const active = id === state.selectedSessionId ? "active" : "";

        return `
        <article class="session-row ${active}" data-select-bankroll-session="${escapeHtml(id)}">
          <div>
            <div class="session-row-title">
              <strong>${escapeHtml(session.location)}</strong>
              <span class="pill">${escapeHtml(session.stakes || session.gameType)}</span>
            </div>
            <p>${escapeHtml(formatDate(session.date))} / ${escapeHtml(session.gameType)} / ${formatNumber(session.hours, 1)}h</p>
            <p>${formatCurrency(session.profit, { signed: true })} / ${formatNumber(session.bbPerHour, 1)} bb/hr / ${linkedHands} linked hands</p>
            ${session.notes ? `<p>${escapeHtml(session.notes)}</p>` : ""}
          </div>
          <div class="row-actions">
            <button class="button secondary" type="button" data-edit-bankroll-session="${escapeHtml(id)}">Edit</button>
            <button class="button danger" type="button" data-delete-bankroll-session="${escapeHtml(id)}">Delete</button>
          </div>
        </article>
        `;
      }
    )
    .join("");

  renderSessionDetail();
}

function filteredHands() {
  const playerFilter = elements.handPlayerFilter.value.trim().toLowerCase();
  const tagFilter = normalizeTag(elements.handTagFilter.value);
  const reviewFilter = elements.handReviewFilter.value;
  const positionFilter = elements.handPositionFilter.value;
  const sessionFilter = elements.handSessionFilter.value;
  const resultFilter = elements.handResultFilter.value;
  const sort = elements.handSort.value;
  let hands = [...state.hands];

  if (playerFilter) {
    hands = hands.filter((hand) => (hand.players ?? []).some((player) => player.name.toLowerCase().includes(playerFilter)));
  }

  if (tagFilter) {
    hands = hands.filter((hand) => handTags(hand).includes(tagFilter));
  }

  if (reviewFilter === "true") {
    hands = hands.filter((hand) => Boolean(hand.reviewedAt));
  } else if (reviewFilter === "false") {
    hands = hands.filter((hand) => !hand.reviewedAt);
  }

  if (positionFilter) {
    hands = hands.filter((hand) => heroPosition(hand) === positionFilter);
  }

  if (sessionFilter) {
    hands = hands.filter((hand) => hand.sessionId === sessionFilter);
  }

  if (resultFilter) {
    hands = hands.filter((hand) => resultBucket(hand) === resultFilter);
  }

  hands.sort((a, b) => {
    if (sort === "biggest-loss") {
      return estimatedHeroResult(a) - estimatedHeroResult(b);
    }

    if (sort === "biggest-win") {
      return estimatedHeroResult(b) - estimatedHeroResult(a);
    }

    if (sort === "biggest-pot") {
      return trackedPot(b) - trackedPot(a);
    }

    if (sort === "unreviewed") {
      return Number(Boolean(a.reviewedAt)) - Number(Boolean(b.reviewedAt)) || handDateValue(b) - handDateValue(a);
    }

    return handDateValue(b) - handDateValue(a);
  });

  return hands;
}

function renderHandLibrarySummary(hands) {
  const reviewed = hands.filter((hand) => hand.reviewedAt).length;
  const totalResult = hands.reduce((sum, hand) => sum + estimatedHeroResult(hand), 0);
  const open = hands.length - reviewed;

  elements.handLibrarySummary.innerHTML = `
    <div>
      <span class="subtle">Shown</span>
      <strong>${hands.length}</strong>
    </div>
    <div>
      <span class="subtle">Open</span>
      <strong>${open}</strong>
    </div>
    <div>
      <span class="subtle">Reviewed</span>
      <strong>${reviewed}</strong>
    </div>
    <div>
      <span class="subtle">Result</span>
      <strong>${formatCurrency(totalResult, { signed: true })}</strong>
    </div>
  `;
}

function renderHands() {
  const hands = filteredHands();
  renderHandLibrarySummary(hands);

  if (hands.length === 0) {
    elements.handList.innerHTML = '<div class="empty">No matching hands.</div>';
    return;
  }

  elements.handList.innerHTML = hands
    .map((hand) => {
      const heroCards = hand.hero ? hand.holeCards[hand.hero] ?? [] : [];
      const winners = Object.keys(hand.winnings);
      const active = hand.id === state.selectedHandId ? "active" : "";
      const tags = handTags(hand);
      const result = estimatedHeroResult(hand);
      return `
        <button class="hand ${active}" type="button" data-hand-id="${escapeHtml(hand.id)}">
          <div class="hand-title">
            <strong>#${escapeHtml(hand.handNumber)}</strong>
            <span class="pill">${hand.reviewedAt ? "reviewed" : escapeHtml(hand.tableName ?? "Table")}</span>
          </div>
          ${renderCards([...heroCards, ...hand.board])}
          <p>${escapeHtml(hand.hero ?? "Unknown")} ${heroCards?.length ? "was dealt" : "sat in"} ${escapeHtml(heroCards?.join(" ") ?? "")}. Winner: ${escapeHtml(winners.join(", ") || "not shown")}.</p>
          <p>${escapeHtml(heroPosition(hand))} / ${formatCurrency(result, { signed: true })} / ${formatCurrency(trackedPot(hand))} pot</p>
          ${renderTags(tags)}
          ${hand.notes ? '<p class="note-preview">Has review note</p>' : ""}
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

function renderSimilarHands(hand) {
  const loading = state.similarForHandId !== hand.id;

  if (loading) {
    return `
      <section class="similar-panel">
        <div class="review-editor-head">
          <div>
            <span class="subtle">Study</span>
            <strong>Similar Spots</strong>
          </div>
        </div>
        <div class="empty compact">Finding matching spots.</div>
      </section>
    `;
  }

  if (state.similarHands.length === 0) {
    return `
      <section class="similar-panel">
        <div class="review-editor-head">
          <div>
            <span class="subtle">Study</span>
            <strong>Similar Spots</strong>
          </div>
          <span class="pill">0</span>
        </div>
        <div class="empty compact">No similar hands yet.</div>
      </section>
    `;
  }

  return `
    <section class="similar-panel">
      <div class="review-editor-head">
        <div>
          <span class="subtle">Study</span>
          <strong>Similar Spots</strong>
        </div>
        <span class="pill">${state.similarHands.length}</span>
      </div>
      <div class="similar-list">
        ${state.similarHands.map((spot) => `
          <button class="similar-hand" type="button" data-open-similar-hand="${escapeHtml(spot.id)}">
            <span>
              <strong>#${escapeHtml(spot.handNumber)} / ${escapeHtml(spot.heroPosition)}</strong>
              <small>${escapeHtml((spot.similarityReasons ?? []).join(" / ") || "Related action pattern")}</small>
            </span>
            <em>${formatCurrency(spot.estimatedHeroResult, { signed: true })}</em>
          </button>
        `).join("")}
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
  const activeTags = handTags(hand);
  const reviewTags = [...new Set([...suggestedReviewTags, ...activeTags])];
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
    <section class="review-editor">
      <div class="review-editor-head">
        <div>
          <span class="subtle">Review</span>
          <strong>${hand.reviewedAt ? `Reviewed ${new Date(hand.reviewedAt).toLocaleDateString()}` : "Open"}</strong>
        </div>
        <span class="pill">${formatCurrency(estimatedHeroResult(hand), { signed: true })}</span>
      </div>
      ${renderTags(reviewTags, {
        interactive: true,
        activeTags
      })}
      <textarea data-review-notes rows="5" placeholder="What happened in this hand?">${escapeHtml(hand.notes ?? "")}</textarea>
      <div class="form-actions">
        <button class="button" type="button" data-save-review>Save Review</button>
        <button class="button secondary" type="button" data-mark-reviewed>Mark Reviewed</button>
        <button class="button ghost" type="button" data-clear-reviewed>Reopen</button>
      </div>
    </section>
    ${renderSimilarHands(hand)}
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
      const linkedSession = sessionById(item.sessionId);
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
            <p>${item.skippedCount ?? 0} duplicate hands skipped / ${escapeHtml(sessionLabel(linkedSession))}</p>
          </div>
          <div class="row-actions import-actions">
            <select data-import-session="${escapeHtml(item.id)}" aria-label="Linked bankroll session">
              <option value="">No linked session</option>
              ${state.bankrollSessions.map((session) => `
                <option value="${escapeHtml(sessionId(session))}" ${sessionId(session) === item.sessionId ? "selected" : ""}>${escapeHtml(sessionLabel(session))}</option>
              `).join("")}
            </select>
            <button class="button danger" type="button" data-delete-import="${escapeHtml(item.id)}" ${status === "queued" ? "disabled" : ""}>Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function render() {
  renderAuthState();

  if (state.selectedSessionId && !state.bankrollSessions.some((session) => sessionId(session) === state.selectedSessionId)) {
    state.selectedSessionId = null;
  }

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
  renderSessionOptions();
  renderLiveSessionOptions();
  renderHandFilterOptions();
  renderLivePlayerOptions();
  renderLiveActions();
  renderLivePreview();
  renderPlayerStats();
  renderCharts();
  renderBankrollCharts();
  renderReviewQueue();
  renderTagSummary();
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
    reviewPayload,
    tagsPayload,
    bankrollSessionsPayload,
    bankrollSummaryPayload
  ] = await Promise.all([
    api("/api/hands?limit=500"),
    api("/api/imports"),
    api("/api/stats/summary"),
    api("/api/leaks"),
    api(reviewQueuePath()),
    api("/api/study/tags"),
    api("/api/bankroll/sessions"),
    api("/api/bankroll/summary")
  ]);

  state.hands = handsPayload.hands;
  state.imports = importsPayload.imports;
  state.players = statsPayload.players;
  state.leaks = leaksPayload.leaks;
  state.reviewSpots = reviewPayload.spots;
  state.studyTags = tagsPayload.tags;
  state.bankrollSessions = bankrollSessionsPayload.sessions;
  state.bankrollSummary = bankrollSummaryPayload.summary;

  if (state.selectedHandId && !state.hands.some((hand) => hand.id === state.selectedHandId)) {
    state.selectedHandId = null;
    state.replayStep = 0;
  }

  if (!state.selectedHandId && state.hands.length > 0) {
    state.selectedHandId = state.hands[0].id;
    state.replayStep = 0;
  }

  if (state.selectedHandId) {
    const similarPayload = await api(`/api/hands/${encodeURIComponent(state.selectedHandId)}/similar?limit=6`);
    state.similarForHandId = state.selectedHandId;
    state.similarHands = similarPayload.hands;
  } else {
    state.similarForHandId = null;
    state.similarHands = [];
  }

  render();

  if (!quiet) {
    renderAuthState();
  }
}

async function loadReviewQueue() {
  const payload = await api(reviewQueuePath());
  state.reviewSpots = payload.spots;
  renderMetrics();
  renderReviewQueue();
  renderSessions();
}

async function loadSimilarHands(handId) {
  state.similarForHandId = null;
  state.similarHands = [];
  renderHandDetail();

  const payload = await api(`/api/hands/${encodeURIComponent(handId)}/similar?limit=6`);
  if (state.selectedHandId !== handId) {
    return;
  }

  state.similarForHandId = handId;
  state.similarHands = payload.hands;
  renderHandDetail();
}

async function selectHand(handId) {
  state.selectedHandId = handId;
  state.replayStep = 0;
  renderHands();
  renderHandDetail();
  await loadSimilarHands(handId);
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

elements.livePlayerRows.forEach((row) => {
  row.addEventListener("input", () => {
    renderLivePlayerOptions();
    renderLivePreview();
  });
  row.addEventListener("change", () => {
    renderLivePlayerOptions();
    renderLivePreview();
  });
});

elements.liveForm.addEventListener("input", () => {
  renderLivePlayerOptions();
  renderLivePreview();
});

elements.liveSession.addEventListener("change", renderLivePreview);

elements.liveAddAction.addEventListener("click", () => {
  const player = elements.liveActionPlayer.value;

  if (!player) {
    showToast("Add a player before adding an action.");
    return;
  }

  state.liveActions.push({
    street: elements.liveActionStreet.value,
    player,
    type: elements.liveActionType.value,
    amount: elements.liveActionAmount.value.trim() || null
  });
  elements.liveActionAmount.value = "";
  renderLiveActions();
  renderLivePreview();
});

elements.liveActionList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-delete-live-action]");
  if (!target) {
    return;
  }

  state.liveActions.splice(Number(target.dataset.deleteLiveAction), 1);
  renderLiveActions();
  renderLivePreview();
});

elements.loadDemo.addEventListener("click", async () => {
  try {
    const sessionParam = state.selectedSessionId ? `?sessionId=${encodeURIComponent(state.selectedSessionId)}` : "";
    const payload = await api(`/api/demo${sessionParam}`, { method: "POST" });
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
for (const filter of [
  elements.handTagFilter,
  elements.handReviewFilter,
  elements.handPositionFilter,
  elements.handSessionFilter,
  elements.handResultFilter,
  elements.handSort
]) {
  filter.addEventListener("change", renderHands);
}

for (const filter of [elements.reviewStatusFilter, elements.reviewSort]) {
  filter.addEventListener("change", () => {
    loadReviewQueue().catch((error) => showToast(error.message));
  });
}

elements.handList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-hand-id]");
  if (!target) {
    return;
  }

  selectHand(target.dataset.handId).catch((error) => showToast(error.message));
});

elements.handDetail.addEventListener("click", async (event) => {
  const similarTarget = event.target.closest("[data-open-similar-hand]");
  if (similarTarget) {
    await selectHand(similarTarget.dataset.openSimilarHand);
    return;
  }

  const tagTarget = event.target.closest("[data-review-tag]");
  if (tagTarget) {
    tagTarget.classList.toggle("active");
    return;
  }

  const reviewTarget = event.target.closest("[data-save-review], [data-mark-reviewed], [data-clear-reviewed]");
  if (reviewTarget) {
    const hand = state.hands.find((item) => item.id === state.selectedHandId);
    if (!hand) {
      return;
    }

    const tags = [...elements.handDetail.querySelectorAll("[data-review-tag].active")]
      .map((button) => button.dataset.reviewTag);
    const notes = elements.handDetail.querySelector("[data-review-notes]")?.value ?? "";
    const reviewed = reviewTarget.matches("[data-mark-reviewed]")
      ? true
      : reviewTarget.matches("[data-clear-reviewed]")
        ? false
        : undefined;

    try {
      const payload = await api(`/api/hands/${encodeURIComponent(hand.id)}`, {
        method: "PATCH",
        body: {
          tags,
          notes,
          ...(reviewed === undefined ? {} : { reviewed })
        }
      });
      state.hands = state.hands.map((item) => item.id === payload.hand.id ? payload.hand : item);
      state.selectedHandId = payload.hand.id;
      await refresh({ quiet: true });
      state.selectedHandId = payload.hand.id;
      render();
      showToast(reviewed === true ? "Hand marked reviewed." : "Review saved.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

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

elements.leakList.addEventListener("click", (event) => {
  const markTarget = event.target.closest("[data-queue-mark-reviewed], [data-queue-reopen]");
  if (markTarget) {
    const id = markTarget.dataset.queueMarkReviewed ?? markTarget.dataset.queueReopen;
    const reviewed = Boolean(markTarget.dataset.queueMarkReviewed);

    api(`/api/hands/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: {
        reviewed
      }
    })
      .then(async () => {
        await refresh({ quiet: true });
        showToast(reviewed ? "Hand marked reviewed." : "Hand reopened.");
      })
      .catch((error) => showToast(error.message));
    return;
  }

  const target = event.target.closest("[data-review-spot-hand]");
  if (target) {
    setView("hands");
    selectHand(target.dataset.reviewSpotHand).catch((error) => showToast(error.message));
  }
});

elements.tagSummary.addEventListener("click", (event) => {
  const target = event.target.closest("[data-filter-tag]");
  if (!target) {
    return;
  }

  setView("hands");
  elements.handTagFilter.value = target.dataset.filterTag;
  renderHands();
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

elements.importList.addEventListener("change", async (event) => {
  const target = event.target.closest("[data-import-session]");
  if (!target) {
    return;
  }

  try {
    const payload = await api(`/api/imports/${encodeURIComponent(target.dataset.importSession)}`, {
      method: "PATCH",
      body: {
        sessionId: target.value
      }
    });
    await refresh();
    showToast(`Linked ${payload.updatedHands} hands.`);
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
  const editingSessionId = elements.bankrollForm.dataset.editingSessionId;

  try {
    const payload = await api(
      editingSessionId
        ? `/api/bankroll/sessions/${encodeURIComponent(editingSessionId)}`
        : "/api/bankroll/sessions",
      {
      method: editingSessionId ? "PATCH" : "POST",
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
    state.selectedSessionId = payload.session.id;
    await refresh();
    fillBankrollForm(sessionById(state.selectedSessionId) ?? payload.session);
    showToast(`${editingSessionId ? "Saved" : "Added"} ${formatCurrency(payload.session.profit, { signed: true })} session.`);
  } catch (error) {
    showToast(error.message);
  }
});

elements.sessionList.addEventListener("click", async (event) => {
  const deleteTarget = event.target.closest("[data-delete-bankroll-session]");
  if (deleteTarget) {
    if (!window.confirm("Delete this bankroll session? Linked imports will stay imported, but become unlinked.")) {
      return;
    }

    try {
      const payload = await api(`/api/bankroll/sessions/${encodeURIComponent(deleteTarget.dataset.deleteBankrollSession)}`, {
        method: "DELETE"
      });
      if (state.selectedSessionId === deleteTarget.dataset.deleteBankrollSession) {
        state.selectedSessionId = null;
        resetBankrollForm();
      }
      await refresh();
      showToast(`Deleted ${formatCurrency(payload.session.profit, { signed: true })} session.`);
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const editTarget = event.target.closest("[data-edit-bankroll-session]");
  if (editTarget) {
    const session = sessionById(editTarget.dataset.editBankrollSession);
    if (session) {
      state.selectedSessionId = sessionId(session);
      fillBankrollForm(session);
      renderSessions();
    }
    return;
  }

  const rowTarget = event.target.closest("[data-select-bankroll-session]");
  if (rowTarget) {
    state.selectedSessionId = rowTarget.dataset.selectBankrollSession;
    const session = sessionById(state.selectedSessionId);
    if (session) {
      fillBankrollForm(session);
    }
    renderSessions();
  }
});

elements.sessionDetail.addEventListener("click", (event) => {
  const target = event.target.closest("[data-open-hand]");
  if (!target) {
    return;
  }

  setView("hands");
  selectHand(target.dataset.openHand).catch((error) => showToast(error.message));
});

elements.bankrollCancel.addEventListener("click", () => {
  state.selectedSessionId = null;
  resetBankrollForm();
  renderSessions();
});

elements.liveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const payload = await api("/api/live-hands", {
      method: "POST",
      body: {
        sessionId: form.get("sessionId"),
        name: form.get("name"),
        tableName: form.get("tableName"),
        stakes: form.get("stakes"),
        handNumber: form.get("handNumber"),
        hero: form.get("hero"),
        heroCards: form.get("heroCards"),
        boardCards: form.get("boardCards"),
        winner: form.get("winner"),
        wonAmount: form.get("wonAmount"),
        players: livePlayers(),
        actions: state.liveActions,
        notes: form.get("notes")
      }
    });

    state.liveActions = [];
    await refresh({ quiet: true });
    if (payload.hand?.id) {
      state.selectedHandId = payload.hand.id;
      state.replayStep = 0;
    }
    if (payload.hand?.sessionId) {
      state.selectedSessionId = payload.hand.sessionId;
    }
    render();
    setView("hands");
    if (payload.hand?.id) {
      await loadSimilarHands(payload.hand.id);
    }
    showToast(payload.duplicate ? "Live hand was already saved." : "Live hand saved.");
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
        rawText: form.get("rawText"),
        sessionId: form.get("sessionId")
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
