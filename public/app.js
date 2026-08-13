import { createAuthClient } from "./auth.js";

const positionOrder = ["BTN", "CO", "HJ", "LJ", "MP", "UTG+1", "UTG", "STR", "SB", "BB", "Unknown"];
const streetOrder = ["hole-cards", "flop", "turn", "river", "show-down"];
const streetLabels = {
  "hole-cards": "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  "show-down": "Showdown"
};
const viewTitles = {
  overview: "Home",
  sessions: "Sessions",
  hands: "Hands",
  live: "Live Hand",
  equity: "Equity",
  imports: "Imports"
};
const homePeriodOptions = [
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" }
];
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
const onboardingStorageKey = "backdoor-flush.onboarding-entered";
const liveTableSizes = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const livePositionOptions = ["BTN", "SB", "BB", "STR", "UTG", "UTG+1", "MP", "MP+1", "LJ", "HJ", "CO"];
const liveDefaultPositions = {
  2: ["BTN", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["BTN", "SB", "BB", "UTG"],
  5: ["BTN", "SB", "BB", "UTG", "CO"],
  6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  7: ["BTN", "SB", "BB", "UTG", "LJ", "HJ", "CO"],
  8: ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"],
  9: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"],
  10: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "LJ", "HJ", "CO"]
};
const liveStraddlePositions = {
  2: ["BTN", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["BTN", "SB", "BB", "STR"],
  5: ["BTN", "SB", "BB", "STR", "CO"],
  6: ["BTN", "SB", "BB", "STR", "HJ", "CO"],
  7: ["BTN", "SB", "BB", "STR", "LJ", "HJ", "CO"],
  8: ["BTN", "SB", "BB", "STR", "UTG+1", "LJ", "HJ", "CO"],
  9: ["BTN", "SB", "BB", "STR", "UTG+1", "MP", "LJ", "HJ", "CO"],
  10: ["BTN", "SB", "BB", "STR", "UTG+1", "MP", "MP+1", "LJ", "HJ", "CO"]
};
const liveBlindTypes = [
  { value: "", label: "--" },
  { value: "small-blind", label: "SB" },
  { value: "big-blind", label: "BB" },
  { value: "straddle", label: "STR" },
  { value: "ante", label: "Ante" }
];
const blindTypeLabels = {
  "small-blind": "SB",
  "big-blind": "BB",
  straddle: "STR",
  ante: "Ante"
};
const quickActionPresets = [
  { type: "folds", label: "Fold" },
  { type: "checks", label: "Check" },
  { type: "calls", label: "Call" }
];
const cardSuitMap = {
  h: {
    entity: "&hearts;",
    label: "hearts",
    className: "heart"
  },
  d: {
    entity: "&diams;",
    label: "diamonds",
    className: "diamond"
  },
  c: {
    entity: "&clubs;",
    label: "clubs",
    className: "club"
  },
  s: {
    entity: "&spades;",
    label: "spades",
    className: "spade"
  }
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

const emptyTransactionSummary = {
  transactionCount: 0,
  totalAmount: 0,
  inflow: 0,
  outflow: 0,
  byType: [],
  recentTransactions: []
};

const emptyBankrollFilters = {
  startDate: "",
  endDate: "",
  location: "",
  gameType: "",
  stakes: ""
};

const state = {
  view: "overview",
  hands: [],
  imports: [],
  bankrollSessions: [],
  bankrollSummary: emptyBankrollSummary,
  bankrollTransactions: [],
  bankrollTransactionSummary: emptyTransactionSummary,
  bankrollImportPreview: null,
  bankrollFilters: { ...emptyBankrollFilters },
  homePeriod: "30d",
  players: [],
  leaks: [],
  reviewSpots: [],
  studyTags: [],
  studyPlan: [],
  similarHands: [],
  similarForHandId: null,
  decisionReport: null,
  decisionReportForHandId: null,
  selectedDecisionId: null,
  selectedSessionId: null,
  selectedHandId: null,
  livePlayerCount: 6,
  liveSeatDrafts: Array.from({ length: 10 }, (_, index) => defaultLiveSeat(index, 6)),
  liveShowdownDrafts: {},
  liveActions: [],
  replayStep: 0,
  importPollTimer: null,
  showLanding: true,
  demoMode: false
};

const apiBase = window.POKER_FELT_SCOPE_API_BASE ?? "";
const auth = createAuthClient(window.POKER_FELT_SCOPE_AUTH);

const elements = {
  landing: document.querySelector("#landing-page"),
  appShell: document.querySelector("#app-shell"),
  title: document.querySelector("#page-title"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  views: [...document.querySelectorAll(".view")],
  authStatus: document.querySelector("#auth-status"),
  signIn: document.querySelector("#sign-in"),
  signOut: document.querySelector("#sign-out"),
  authNotice: document.querySelector("#auth-notice"),
  demoBanner: document.querySelector("#demo-banner"),
  exitDemo: document.querySelector("#exit-demo"),
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
  studyPlan: document.querySelector("#study-plan"),
  positionChart: document.querySelector("#position-chart"),
  importChart: document.querySelector("#import-chart"),
  studySampleContext: document.querySelector("#study-sample-context"),
  overviewEmpty: document.querySelector("#overview-empty"),
  homePeriodTitle: document.querySelector("#home-period-title"),
  homePeriodNote: document.querySelector("#home-period-note"),
  homePeriodTabs: document.querySelector("#home-period-tabs"),
  homeFocus: document.querySelector("#home-focus"),
  homeReviewSummary: document.querySelector("#home-review-summary"),
  homeStrength: document.querySelector("#home-strength"),
  homeWatch: document.querySelector("#home-watch"),
  bankrollChart: document.querySelector("#bankroll-chart"),
  locationChart: document.querySelector("#location-chart"),
  bankrollFilterControls: [...document.querySelectorAll("[data-bankroll-filter]")],
  bankrollFilterSummary: document.querySelector("#bankroll-filter-summary"),
  bankrollResetFilters: document.querySelector("#bankroll-reset-filters"),
  handList: document.querySelector("#hand-list"),
  handDetail: document.querySelector("#hand-detail"),
  bankrollForm: document.querySelector("#bankroll-form"),
  bankrollFormTitle: document.querySelector("#bankroll-form-title"),
  bankrollSubmit: document.querySelector("#bankroll-submit"),
  bankrollCancel: document.querySelector("#bankroll-cancel"),
  bankrollImportForm: document.querySelector("#bankroll-import-form"),
  bankrollImportFile: document.querySelector("#bankroll-import-file"),
  previewBankrollImport: document.querySelector("#preview-bankroll-import"),
  bankrollImportPreview: document.querySelector("#bankroll-import-preview"),
  bankrollImportStatus: document.querySelector("#bankroll-import-status"),
  clearBankrollImport: document.querySelector("#clear-bankroll-import"),
  transactionForm: document.querySelector("#bankroll-transaction-form"),
  transactionFormTitle: document.querySelector("#bankroll-transaction-form-title"),
  transactionSubmit: document.querySelector("#bankroll-transaction-submit"),
  transactionCancel: document.querySelector("#bankroll-transaction-cancel"),
  transactionSummary: document.querySelector("#transaction-summary"),
  transactionList: document.querySelector("#transaction-list"),
  sessionList: document.querySelector("#session-list"),
  sessionSummary: document.querySelector("#session-summary"),
  sessionDetail: document.querySelector("#session-detail"),
  importList: document.querySelector("#import-list"),
  importForm: document.querySelector("#import-form"),
  importSession: document.querySelector("#import-session"),
  liveForm: document.querySelector("#live-hand-form"),
  liveSession: document.querySelector("#live-session"),
  liveStakes: document.querySelector("#live-stakes"),
  liveHero: document.querySelector("#live-hero"),
  liveBlindPresets: document.querySelector("#live-blind-presets"),
  livePlayerCount: document.querySelector("#live-player-count"),
  liveSeatGrid: document.querySelector("#live-seat-grid"),
  liveStreetTabs: document.querySelector("#live-street-tabs"),
  liveActionShortcuts: document.querySelector("#live-action-shortcuts"),
  liveActionStreet: document.querySelector("#live-action-street"),
  liveActionPlayer: document.querySelector("#live-action-player"),
  liveActionType: document.querySelector("#live-action-type"),
  liveActionAmount: document.querySelector("#live-action-amount"),
  liveAddAction: document.querySelector("#live-add-action"),
  liveActionList: document.querySelector("#live-action-list"),
  liveShowdownList: document.querySelector("#live-showdown-list"),
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
    linkedHands: document.querySelector("#metric-linked-hands"),
    leaks: document.querySelector("#metric-leaks"),
    profit: document.querySelector("#metric-profit"),
    hours: document.querySelector("#metric-hours"),
    sessions: document.querySelector("#metric-sessions"),
    hourly: document.querySelector("#metric-hourly"),
    bbhr: document.querySelector("#metric-bbhr")
  }
};

async function api(path, options = {}) {
  if (state.demoMode) {
    throw new Error("Demo mode is read-only. Exit demo to use your workspace.");
  }

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
  state.bankrollTransactions = [];
  state.bankrollTransactionSummary = emptyTransactionSummary;
  state.bankrollImportPreview = null;
  state.bankrollFilters = { ...emptyBankrollFilters };
  state.players = [];
  state.leaks = [];
  state.reviewSpots = [];
  state.studyTags = [];
  state.studyPlan = [];
  state.similarHands = [];
  state.similarForHandId = null;
  state.decisionReport = null;
  state.decisionReportForHandId = null;
  state.selectedDecisionId = null;
  state.selectedSessionId = null;
  state.selectedHandId = null;
  state.replayStep = 0;
}

function renderAuthState() {
  const signedIn = auth.isSignedIn();
  const needsSignIn = auth.enabled && !signedIn && !state.demoMode && !state.showLanding;

  elements.landing.hidden = !state.showLanding;
  elements.appShell.hidden = state.showLanding;

  elements.authStatus.textContent = auth.enabled
    ? state.demoMode
      ? "Demo mode"
      : signedIn
      ? auth.displayName()
      : "Signed out"
    : state.demoMode
      ? "Demo mode"
      : "Local mode";
  elements.signIn.hidden = !auth.enabled || signedIn;
  elements.signOut.hidden = !auth.enabled || !signedIn;
  elements.authNotice.hidden = !needsSignIn;
  elements.demoBanner.hidden = !state.demoMode;
  elements.loadDemo.textContent = state.demoMode ? "Reload Demo" : "Explore Demo";
  elements.clearSession.textContent = state.demoMode ? "Exit Demo" : "Clear Session";
  elements.refresh.disabled = needsSignIn || state.demoMode;
  document.body.classList.toggle("landing-open", state.showLanding);
  document.body.classList.toggle("demo-mode", state.demoMode);
  document.body.classList.toggle("signed-out", needsSignIn);

  for (const button of [elements.loadDemo, elements.clearSession]) {
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

function renderEmptyState({
  title,
  body,
  primaryLabel,
  primaryView,
  secondaryLabel = "Explore Demo",
  secondaryAction = "demo",
  secondaryView = "",
  compact = false
}) {
  const primary = primaryLabel && primaryView
    ? `<button class="button" type="button" data-jump-view="${escapeHtml(primaryView)}">${escapeHtml(primaryLabel)}</button>`
    : "";
  const secondary = secondaryLabel
    ? `<button class="button secondary" type="button" ${
      secondaryView
        ? `data-jump-view="${escapeHtml(secondaryView)}"`
        : secondaryAction === "start"
          ? "data-start-tracking"
          : "data-load-demo"
    }>${escapeHtml(secondaryLabel)}</button>`
    : "";

  return `
    <div class="empty-state ${compact ? "compact" : ""}">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
      ${primary || secondary ? `<div class="empty-actions">${primary}${secondary}</div>` : ""}
    </div>
  `;
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

  window.scrollTo(0, 0);
}

function demoSessions() {
  return [
    {
      id: "demo-session-1",
      date: "2026-07-18",
      location: "Bellagio",
      gameType: "cash",
      stakes: "$2/$5 NLH",
      tableSize: 8,
      hours: 4.8,
      buyIn: 1000,
      cashOut: 1640,
      profit: 640,
      bigBlind: 5,
      bbWon: 128,
      bbPerHour: 26.7,
      notes: "Strong table, two marked river spots."
    },
    {
      id: "demo-session-2",
      date: "2026-07-24",
      location: "Aria",
      gameType: "cash",
      stakes: "$2/$5/$10 NLH",
      tableSize: 9,
      hours: 5.6,
      buyIn: 2000,
      cashOut: 1460,
      profit: -540,
      bigBlind: 5,
      bbWon: -108,
      bbPerHour: -19.3,
      notes: "Straddle game. Save hands where pot size got away from me."
    },
    {
      id: "demo-session-3",
      date: "2026-07-31",
      location: "Wynn",
      gameType: "cash",
      stakes: "$5/$10 NLH",
      tableSize: 8,
      hours: 6.2,
      buyIn: 2500,
      cashOut: 3920,
      profit: 1420,
      bigBlind: 10,
      bbWon: 142,
      bbPerHour: 22.9,
      notes: "Good value spots in position."
    },
    {
      id: "demo-session-4",
      date: "2026-08-04",
      location: "Home Game",
      gameType: "home-game",
      stakes: "$1/$3 NLH",
      tableSize: 7,
      hours: 3.5,
      buyIn: 600,
      cashOut: 410,
      profit: -190,
      bigBlind: 3,
      bbWon: -63.3,
      bbPerHour: -18.1,
      notes: "Loose table, review bluff catches."
    },
    {
      id: "demo-session-5",
      date: "2026-08-09",
      location: "Bellagio",
      gameType: "cash",
      stakes: "$2/$5 NLH",
      tableSize: 8,
      hours: 5.1,
      buyIn: 1000,
      cashOut: 1880,
      profit: 880,
      bigBlind: 5,
      bbWon: 176,
      bbPerHour: 34.5,
      notes: "Best session this month. Review value line."
    }
  ];
}

function demoHands() {
  return [
    {
      id: "demo-hand-1",
      importId: "demo-import-1",
      sessionId: "demo-session-2",
      handNumber: "DF-102",
      tableName: "Aria 2/5/10",
      source: "live-entry",
      hero: "Hero",
      holeCards: {
        Hero: ["Ah", "Kh"],
        Mateo: ["Ks", "Qs"]
      },
      board: ["Kc", "8h", "4h", "2s", "9d"],
      players: [
        { seat: 1, name: "Hero", stack: 2100, position: "BTN" },
        { seat: 2, name: "Nina", stack: 1500, position: "SB" },
        { seat: 3, name: "Owen", stack: 1800, position: "BB" },
        { seat: 4, name: "Mateo", stack: 2600, position: "STR" },
        { seat: 5, name: "Ivy", stack: 1300, position: "HJ" },
        { seat: 6, name: "Sam", stack: 2200, position: "CO" }
      ],
      forcedBets: [
        { player: "Nina", type: "small-blind", amount: 2 },
        { player: "Owen", type: "big-blind", amount: 5 },
        { player: "Mateo", type: "straddle", amount: 10 }
      ],
      actions: [
        { street: "hole-cards", player: "Ivy", type: "folds", amount: null },
        { street: "hole-cards", player: "Sam", type: "raises", amount: 35 },
        { street: "hole-cards", player: "Hero", type: "raises", amount: 110 },
        { street: "hole-cards", player: "Mateo", type: "calls", amount: 110 },
        { street: "hole-cards", player: "Sam", type: "calls", amount: 110 },
        { street: "flop", player: "Mateo", type: "checks", amount: null },
        { street: "flop", player: "Sam", type: "checks", amount: null },
        { street: "flop", player: "Hero", type: "bets", amount: 130 },
        { street: "flop", player: "Mateo", type: "calls", amount: 130 },
        { street: "flop", player: "Sam", type: "folds", amount: null },
        { street: "turn", player: "Mateo", type: "checks", amount: null },
        { street: "turn", player: "Hero", type: "bets", amount: 280 },
        { street: "turn", player: "Mateo", type: "calls", amount: 280 },
        { street: "river", player: "Mateo", type: "bets", amount: 725 },
        { street: "river", player: "Hero", type: "folds", amount: null }
      ],
      winnings: {
        Mateo: 1677
      },
      tags: ["river-decision", "3-bet-pot", "live-hand"],
      notes: "Big river donk after calling flop and turn. Review whether turn sizing creates this river spot too often.",
      reviewedAt: null,
      importedAt: "2026-07-24T22:30:00.000Z",
      createdAt: "2026-07-24T22:30:00.000Z"
    },
    {
      id: "demo-hand-2",
      importId: "demo-import-2",
      sessionId: "demo-session-5",
      handNumber: "DF-118",
      tableName: "Bellagio 2/5",
      source: "live-entry",
      hero: "Hero",
      holeCards: {
        Hero: ["Qc", "Qd"],
        Luca: ["As", "Jc"]
      },
      board: ["Qh", "7s", "3c", "8d", "2h"],
      players: [
        { seat: 1, name: "Hero", stack: 1420, position: "CO" },
        { seat: 2, name: "Luca", stack: 980, position: "BB" },
        { seat: 3, name: "Maya", stack: 860, position: "BTN" },
        { seat: 4, name: "Ben", stack: 1100, position: "HJ" }
      ],
      forcedBets: [
        { player: "Maya", type: "small-blind", amount: 2 },
        { player: "Luca", type: "big-blind", amount: 5 }
      ],
      actions: [
        { street: "hole-cards", player: "Ben", type: "folds", amount: null },
        { street: "hole-cards", player: "Hero", type: "raises", amount: 20 },
        { street: "hole-cards", player: "Maya", type: "folds", amount: null },
        { street: "hole-cards", player: "Luca", type: "calls", amount: 20 },
        { street: "flop", player: "Luca", type: "checks", amount: null },
        { street: "flop", player: "Hero", type: "bets", amount: 25 },
        { street: "flop", player: "Luca", type: "calls", amount: 25 },
        { street: "turn", player: "Luca", type: "checks", amount: null },
        { street: "turn", player: "Hero", type: "bets", amount: 75 },
        { street: "turn", player: "Luca", type: "calls", amount: 75 },
        { street: "river", player: "Luca", type: "checks", amount: null },
        { street: "river", player: "Hero", type: "bets", amount: 180 },
        { street: "river", player: "Luca", type: "calls", amount: 180 }
      ],
      winnings: {
        Hero: 610
      },
      tags: ["value-bet", "live-hand"],
      notes: "Good thin value spot. Compare river size against worse Qx and bluff-catchers.",
      reviewedAt: "2026-08-10T12:00:00.000Z",
      importedAt: "2026-08-09T20:15:00.000Z",
      createdAt: "2026-08-09T20:15:00.000Z"
    },
    {
      id: "demo-hand-3",
      importId: "demo-import-3",
      sessionId: "demo-session-4",
      handNumber: "DF-121",
      tableName: "Home Game",
      source: "live-entry",
      hero: "Hero",
      holeCards: {
        Hero: ["9h", "9s"]
      },
      board: ["Jd", "8d", "4c", "2h", "Ac"],
      players: [
        { seat: 1, name: "Hero", stack: 720, position: "BB" },
        { seat: 2, name: "Chris", stack: 640, position: "BTN" },
        { seat: 3, name: "Ray", stack: 510, position: "SB" },
        { seat: 4, name: "Alex", stack: 900, position: "CO" }
      ],
      forcedBets: [
        { player: "Ray", type: "small-blind", amount: 1 },
        { player: "Hero", type: "big-blind", amount: 3 }
      ],
      actions: [
        { street: "hole-cards", player: "Alex", type: "folds", amount: null },
        { street: "hole-cards", player: "Chris", type: "raises", amount: 12 },
        { street: "hole-cards", player: "Ray", type: "folds", amount: null },
        { street: "hole-cards", player: "Hero", type: "calls", amount: 12 },
        { street: "flop", player: "Hero", type: "checks", amount: null },
        { street: "flop", player: "Chris", type: "bets", amount: 18 },
        { street: "flop", player: "Hero", type: "calls", amount: 18 },
        { street: "turn", player: "Hero", type: "checks", amount: null },
        { street: "turn", player: "Chris", type: "bets", amount: 55 },
        { street: "turn", player: "Hero", type: "calls", amount: 55 },
        { street: "river", player: "Hero", type: "checks", amount: null },
        { street: "river", player: "Chris", type: "bets", amount: 145 },
        { street: "river", player: "Hero", type: "calls", amount: 145 }
      ],
      winnings: {
        Chris: 464
      },
      tags: ["river-decision", "bad-call"],
      notes: "Classic bluff-catch decision. Need to review opponent value range and missed draws.",
      reviewedAt: null,
      importedAt: "2026-08-04T23:45:00.000Z",
      createdAt: "2026-08-04T23:45:00.000Z"
    },
    {
      id: "demo-hand-4",
      importId: "demo-import-4",
      sessionId: "demo-session-3",
      handNumber: "PS-845912",
      tableName: "Wynn 5/10",
      source: "hand-history-text",
      hero: "Hero",
      holeCards: {
        Hero: ["Ad", "Jd"]
      },
      board: ["Jc", "6d", "2d", "Th", "4d"],
      players: [
        { seat: 1, name: "Hero", stack: 2600, position: "BTN" },
        { seat: 2, name: "Maya", stack: 2100, position: "BB" },
        { seat: 3, name: "Ben", stack: 1800, position: "HJ" }
      ],
      forcedBets: [
        { player: "Maya", type: "big-blind", amount: 10 }
      ],
      actions: [
        { street: "hole-cards", player: "Ben", type: "raises", amount: 30 },
        { street: "hole-cards", player: "Hero", type: "calls", amount: 30 },
        { street: "hole-cards", player: "Maya", type: "calls", amount: 30 },
        { street: "flop", player: "Maya", type: "checks", amount: null },
        { street: "flop", player: "Ben", type: "bets", amount: 55 },
        { street: "flop", player: "Hero", type: "calls", amount: 55 },
        { street: "flop", player: "Maya", type: "folds", amount: null },
        { street: "turn", player: "Ben", type: "checks", amount: null },
        { street: "turn", player: "Hero", type: "bets", amount: 150 },
        { street: "turn", player: "Ben", type: "calls", amount: 150 },
        { street: "river", player: "Ben", type: "checks", amount: null },
        { street: "river", player: "Hero", type: "bets", amount: 420 },
        { street: "river", player: "Ben", type: "folds", amount: null }
      ],
      winnings: {
        Hero: 665
      },
      tags: ["bluff", "position"],
      notes: "Good candidate to compare turn barrel and river follow-through.",
      reviewedAt: null,
      importedAt: "2026-07-31T21:30:00.000Z",
      createdAt: "2026-07-31T21:30:00.000Z"
    }
  ];
}

function demoImports() {
  return [
    {
      id: "demo-import-1",
      name: "Aria straddle hands",
      source: "live-entry",
      status: "ready",
      handCount: 1,
      skippedCount: 0,
      sessionId: "demo-session-2",
      importedAt: "2026-07-24T22:30:00.000Z"
    },
    {
      id: "demo-import-2",
      name: "Bellagio value spots",
      source: "live-entry",
      status: "ready",
      handCount: 1,
      skippedCount: 0,
      sessionId: "demo-session-5",
      importedAt: "2026-08-09T20:15:00.000Z"
    },
    {
      id: "demo-import-3",
      name: "Home game review notes",
      source: "live-entry",
      status: "ready",
      handCount: 1,
      skippedCount: 0,
      sessionId: "demo-session-4",
      importedAt: "2026-08-04T23:45:00.000Z"
    },
    {
      id: "demo-import-4",
      name: "Wynn hand-history import",
      source: "hand-history-text",
      status: "ready",
      handCount: 1,
      skippedCount: 0,
      sessionId: "demo-session-3",
      importedAt: "2026-07-31T21:30:00.000Z"
    }
  ];
}

function demoTransactions() {
  return [
    {
      id: "demo-transaction-1",
      date: "2026-07-15",
      type: "initial",
      amount: 12000,
      bankrollName: "Main",
      note: "Starting bankroll for the demo month."
    },
    {
      id: "demo-transaction-2",
      date: "2026-08-01",
      type: "withdrawal",
      amount: -800,
      bankrollName: "Main",
      note: "Pulled out rent money after the Wynn session."
    }
  ];
}

function summarizeDemoTransactions(transactions) {
  const totalAmount = transactions.reduce((sum, transaction) => sum + finiteNumber(transaction.amount), 0);
  const inflow = transactions
    .filter((transaction) => finiteNumber(transaction.amount) > 0)
    .reduce((sum, transaction) => sum + finiteNumber(transaction.amount), 0);
  const outflow = transactions
    .filter((transaction) => finiteNumber(transaction.amount) < 0)
    .reduce((sum, transaction) => sum + Math.abs(finiteNumber(transaction.amount)), 0);

  return {
    transactionCount: transactions.length,
    totalAmount,
    inflow,
    outflow,
    byType: [],
    recentTransactions: transactions
  };
}

function demoPlayers() {
  return [
    {
      player: "Hero",
      hands: 4,
      vpipPct: 100,
      pfrPct: 50,
      threeBetPct: 25,
      aggressionFactor: 1.8,
      byPosition: {
        BTN: { hands: 2, vpip: 2, pfr: 1, netWon: -10, vpipPct: 100, pfrPct: 50 },
        CO: { hands: 1, vpip: 1, pfr: 1, netWon: 310, vpipPct: 100, pfrPct: 100 },
        BB: { hands: 1, vpip: 1, pfr: 0, netWon: -233, vpipPct: 100, pfrPct: 0 }
      }
    },
    {
      player: "Chris",
      hands: 1,
      vpipPct: 100,
      pfrPct: 100,
      threeBetPct: 0,
      aggressionFactor: 3,
      byPosition: {
        BTN: { hands: 1, vpip: 1, pfr: 1, netWon: 464, vpipPct: 100, pfrPct: 100 }
      }
    },
    {
      player: "Luca",
      hands: 1,
      vpipPct: 100,
      pfrPct: 0,
      threeBetPct: 0,
      aggressionFactor: 0.25,
      byPosition: {
        BB: { hands: 1, vpip: 1, pfr: 0, netWon: -305, vpipPct: 100, pfrPct: 0 }
      }
    },
    {
      player: "Mateo",
      hands: 1,
      vpipPct: 100,
      pfrPct: 0,
      threeBetPct: 0,
      aggressionFactor: 1,
      byPosition: {
        STR: { hands: 1, vpip: 1, pfr: 0, netWon: 1677, vpipPct: 100, pfrPct: 0 }
      }
    }
  ];
}

function demoReviewReasons(hand) {
  const tags = handTags(hand);

  if (tags.includes("bad-call")) {
    return ["River call", "Large losing spot"];
  }

  if (tags.includes("3-bet-pot")) {
    return ["3-bet pot", "River decision"];
  }

  if (tags.includes("bluff")) {
    return ["Barrel line", "Unreviewed hand"];
  }

  return ["Saved for review"];
}

function demoReviewSpots(hands) {
  return hands
    .filter((hand) => !hand.reviewedAt)
    .map((hand) => ({
      id: hand.id,
      sessionId: hand.sessionId,
      handNumber: hand.handNumber,
      tableName: hand.tableName,
      reasons: demoReviewReasons(hand),
      estimatedHeroResult: estimatedHeroResult(hand),
      heroCards: hand.hero ? hand.holeCards[hand.hero] ?? [] : [],
      board: hand.board ?? [],
      tags: hand.tags ?? [],
      reviewedAt: hand.reviewedAt,
      priority: Math.abs(estimatedHeroResult(hand))
    }))
    .sort((a, b) => b.priority - a.priority);
}

function demoTagSummary(hands) {
  const rows = new Map();

  for (const hand of hands) {
    for (const tag of handTags(hand)) {
      const current = rows.get(tag) ?? {
        tag,
        handCount: 0,
        reviewedCount: 0,
        totalResult: 0
      };
      current.handCount += 1;
      current.reviewedCount += hand.reviewedAt ? 1 : 0;
      current.totalResult += estimatedHeroResult(hand);
      rows.set(tag, current);
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      reviewedPct: row.handCount === 0 ? 0 : Number(((row.reviewedCount / row.handCount) * 100).toFixed(1)),
      totalResult: roundNumber(row.totalResult)
    }))
    .sort((a, b) => b.handCount - a.handCount || a.tag.localeCompare(b.tag));
}

function demoStudyPlan(hands) {
  const riverHands = hands.filter((hand) => handTags(hand).includes("river-decision") && !hand.reviewedAt);
  const badCalls = hands.filter((hand) => handTags(hand).includes("bad-call") && !hand.reviewedAt);
  const bigPots = hands
    .filter((hand) => trackedPot(hand) >= 500 && !hand.reviewedAt)
    .sort((a, b) => trackedPot(b) - trackedPot(a));

  return [
    riverHands.length
      ? {
        title: "Review river decisions",
        detail: `${riverHands.length} saved hands need a river decision pass.`,
        count: riverHands.length,
        handIds: riverHands.map((hand) => hand.id)
      }
      : null,
    badCalls.length
      ? {
        title: "Audit bluff-catches",
        detail: "Look at the price, blockers, and opponent value range before marking these reviewed.",
        count: badCalls.length,
        handIds: badCalls.map((hand) => hand.id)
      }
      : null,
    bigPots.length
      ? {
        title: "Large pots first",
        detail: "Start with the saved spots where a single decision moved the session most.",
        count: bigPots.length,
        handIds: bigPots.map((hand) => hand.id)
      }
      : null
  ].filter(Boolean);
}

function demoDecisionReport(hand) {
  const heroActions = (hand.actions ?? [])
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => action.player === hand.hero);
  const decisions = heroActions.map(({ action, index }, decisionIndex) => {
    const amount = finiteNumber(action.amount);
    const potBefore = trackedPotAt(hand, index);
    const isRiverCall = action.street === "river" && action.type === "calls";
    const isLargeBet = amount > 0 && potBefore > 0 && amount / potBefore > 0.65;

    return {
      id: `${hand.id}-decision-${decisionIndex + 1}`,
      street: action.street,
      actionType: action.type,
      player: action.player,
      amount,
      potBefore: roundNumber(potBefore),
      potOddsPct: action.type === "calls" && amount > 0 ? roundNumber((amount / (potBefore + amount)) * 100, 1) : null,
      betSizePct: ["bets", "raises"].includes(action.type) && amount > 0 && potBefore > 0 ? roundNumber((amount / potBefore) * 100, 1) : null,
      spr: action.street === "hole-cards" ? null : 3.4,
      activePlayers: Math.max(2, hand.players.length - (hand.actions ?? []).slice(0, index).filter((item) => item.type === "folds").length),
      flags: [
        ...(isRiverCall ? ["River call needs range check"] : []),
        ...(isLargeBet ? ["Large sizing"] : [])
      ],
      promptIds: isRiverCall ? ["range", "price"] : ["plan"],
      note: "",
      checklist: {},
      reviewedAt: null
    };
  });

  return {
    summary: {
      decisionCount: decisions.length,
      reviewedCount: 0,
      flaggedCount: decisions.filter((decision) => decision.flags.length).length
    },
    prompts: [
      { id: "range", label: "What value hands does villain credibly represent?" },
      { id: "price", label: "What pot odds did the call need?" },
      { id: "plan", label: "What was the plan for the next street?" }
    ],
    decisions
  };
}

function setDemoDecisionContext(handId) {
  const hand = state.hands.find((item) => item.id === handId);
  if (!hand) {
    state.similarForHandId = null;
    state.similarHands = [];
    state.decisionReportForHandId = null;
    state.decisionReport = null;
    state.selectedDecisionId = null;
    return;
  }

  const tags = handTags(hand);
  state.similarForHandId = handId;
  state.similarHands = state.hands
    .filter((item) => item.id !== handId && item.tags?.some((tag) => tags.includes(tag)))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      handNumber: item.handNumber,
      heroPosition: heroPosition(item),
      estimatedHeroResult: estimatedHeroResult(item),
      similarityReasons: item.tags.filter((tag) => tags.includes(tag)).map(tagLabel)
    }));
  state.decisionReportForHandId = handId;
  state.decisionReport = demoDecisionReport(hand);
  state.selectedDecisionId = state.decisionReport.decisions[0]?.id ?? null;
}

function loadDemoExperience({ quiet = false } = {}) {
  const sessions = demoSessions();
  const hands = demoHands();
  const transactions = demoTransactions();

  clearDashboardData();
  state.demoMode = true;
  state.showLanding = false;
  state.homePeriod = "30d";
  state.bankrollSessions = sessions;
  state.bankrollSummary = summarizeBankrollSessions(sessions);
  state.bankrollTransactions = transactions;
  state.bankrollTransactionSummary = summarizeDemoTransactions(transactions);
  state.imports = demoImports();
  state.hands = hands;
  state.players = demoPlayers();
  state.reviewSpots = demoReviewSpots(hands);
  state.leaks = [];
  state.studyTags = demoTagSummary(hands);
  state.studyPlan = demoStudyPlan(hands);
  state.selectedSessionId = sessions.at(-1)?.id ?? null;
  state.selectedHandId = hands[0]?.id ?? null;
  state.replayStep = 0;
  if (state.selectedHandId) {
    setDemoDecisionContext(state.selectedHandId);
  }
  render();
  setView("overview");
  window.scrollTo(0, 0);
  if (!quiet) {
    showToast("Demo mode loaded.");
  }
}

async function startTracking({ targetView = "sessions" } = {}) {
  state.demoMode = false;

  if (auth.enabled && !auth.isSignedIn()) {
    await auth.signIn();
    return;
  }

  state.showLanding = false;
  window.localStorage.setItem(onboardingStorageKey, "true");
  await refresh({ quiet: true });
  setView(targetView);
  window.scrollTo(0, 0);
  showToast(targetView === "sessions" ? "Ready for your first session." : "Workspace ready.");
}

async function exitDemo() {
  state.demoMode = false;
  clearDashboardData();

  if (auth.enabled && !auth.isSignedIn()) {
    state.showLanding = true;
    render();
    return;
  }

  state.showLanding = false;
  await refresh({ quiet: true });
}


function cardParts(card) {
  const text = String(card ?? "").trim();
  const match = text.match(/^(10|[2-9TJQKA])([cdhs])$/i);

  if (!match) {
    return {
      rank: text === "??" ? "?" : text || "?",
      suit: "",
      entity: "",
      label: "hidden card",
      className: "card-back"
    };
  }

  const rank = match[1].toUpperCase() === "T" ? "10" : match[1].toUpperCase();
  const suit = match[2].toLowerCase();
  const suitMeta = cardSuitMap[suit];

  return {
    rank,
    suit,
    entity: suitMeta.entity,
    label: `${rank} of ${suitMeta.label}`,
    className: `card-${suitMeta.className}`
  };
}

function cardClass(card) {
  const parts = cardParts(card);
  return `card ${parts.className}`;
}

function renderCard(card, { mini = false } = {}) {
  const parts = cardParts(card);
  const miniClass = mini ? " mini-card" : "";

  if (parts.className === "card-back") {
    return `
      <span class="card card-back${miniClass}" aria-label="${escapeHtml(parts.label)}">
        <span class="card-back-mark">BF</span>
      </span>
    `;
  }

  return `
    <span class="${cardClass(card)}${miniClass}" aria-label="${escapeHtml(parts.label)}">
      <span class="card-corner">
        <strong>${escapeHtml(parts.rank)}</strong>
        <em>${parts.entity}</em>
      </span>
      <span class="card-center">${parts.entity}</span>
    </span>
  `;
}

function renderCards(cards) {
  if (!cards?.length) {
    return "";
  }

  return `<div class="cards">${cards.map((card) => renderCard(card)).join("")}</div>`;
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

function formatLongDate(value) {
  if (!value) {
    return "";
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function finiteNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundNumber(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function parseBigBlind(stakes) {
  const match = String(stakes ?? "").match(/\$?(\d+(?:\.\d+)?)\s*\/\s*\$?(\d+(?:\.\d+)?)/);
  return match ? Number(match[2]) : null;
}

function bankrollSessionDate(session) {
  return String(session.date ?? "").slice(0, 10);
}

function bankrollSessionProfit(session) {
  return finiteNumber(session.profit);
}

function bankrollSessionHours(session) {
  return Math.max(0, finiteNumber(session.hours));
}

function bankrollSessionBbWon(session) {
  if (Number.isFinite(Number(session.bbWon))) {
    return finiteNumber(session.bbWon);
  }

  const bigBlind = finiteNumber(session.bigBlind, parseBigBlind(session.stakes));
  return bigBlind > 0 ? bankrollSessionProfit(session) / bigBlind : 0;
}

function bankrollSessionField(session, field) {
  const value = String(session[field] ?? "").trim();
  return value || "Unspecified";
}

function sortBankrollSessionsByDate(sessions) {
  return [...sessions].sort((a, b) => {
    const dateCompare = bankrollSessionDate(a).localeCompare(bankrollSessionDate(b));
    return dateCompare === 0
      ? String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
      : dateCompare;
  });
}

function summarizeBankrollGroup(sessions, field) {
  const groups = new Map();

  for (const session of sessions) {
    const label = bankrollSessionField(session, field);
    const current = groups.get(label) ?? {
      label,
      sessions: 0,
      profit: 0,
      hours: 0,
      bbWon: 0
    };

    current.sessions += 1;
    current.profit += bankrollSessionProfit(session);
    current.hours += bankrollSessionHours(session);
    current.bbWon += bankrollSessionBbWon(session);
    groups.set(label, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      profit: roundNumber(group.profit),
      hours: roundNumber(group.hours),
      bbWon: roundNumber(group.bbWon),
      hourlyRate: group.hours > 0 ? roundNumber(group.profit / group.hours) : 0,
      bbPerHour: group.hours > 0 ? roundNumber(group.bbWon / group.hours) : 0
    }))
    .sort((a, b) => b.profit - a.profit);
}

function summarizeBankrollSessions(sessions = []) {
  const ordered = sortBankrollSessionsByDate(sessions);
  let cumulativeProfit = 0;
  let cumulativeBb = 0;
  const points = ordered.map((session) => {
    const profit = bankrollSessionProfit(session);
    const bbWon = bankrollSessionBbWon(session);
    cumulativeProfit += profit;
    cumulativeBb += bbWon;

    return {
      sessionId: sessionId(session),
      date: bankrollSessionDate(session),
      label: `${bankrollSessionField(session, "location")} ${session.stakes ?? ""}`.trim(),
      profit: roundNumber(profit),
      bbWon: roundNumber(bbWon),
      cumulativeProfit: roundNumber(cumulativeProfit),
      cumulativeBb: roundNumber(cumulativeBb)
    };
  });
  const totalHours = sessions.reduce((sum, session) => sum + bankrollSessionHours(session), 0);
  const totalProfit = sessions.reduce((sum, session) => sum + bankrollSessionProfit(session), 0);
  const totalBb = sessions.reduce((sum, session) => sum + bankrollSessionBbWon(session), 0);
  const winningSessions = sessions.filter((session) => bankrollSessionProfit(session) > 0).length;

  return {
    sessionCount: sessions.length,
    totalProfit: roundNumber(totalProfit),
    totalHours: roundNumber(totalHours),
    totalBb: roundNumber(totalBb),
    averageProfit: sessions.length > 0 ? roundNumber(totalProfit / sessions.length) : 0,
    hourlyRate: totalHours > 0 ? roundNumber(totalProfit / totalHours) : 0,
    bbPerHour: totalHours > 0 ? roundNumber(totalBb / totalHours) : 0,
    winRate: sessions.length > 0 ? roundNumber((winningSessions / sessions.length) * 100, 1) : 0,
    points,
    byLocation: summarizeBankrollGroup(sessions, "location"),
    byGameType: summarizeBankrollGroup(sessions, "gameType"),
    byStakes: summarizeBankrollGroup(sessions, "stakes"),
    recentSessions: [...sessions]
      .sort((a, b) => bankrollSessionDate(b).localeCompare(bankrollSessionDate(a)))
      .slice(0, 8)
  };
}

function bankrollFilterActive() {
  return Object.values(state.bankrollFilters).some(Boolean);
}

function bankrollViewLimited() {
  return bankrollFilterActive() || homePeriodOption().value !== "all";
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function currentDateKey() {
  return dateKey(new Date());
}

function daysBefore(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - Math.max(0, days - 1));
  return copy;
}

function homePeriodOption(value = state.homePeriod) {
  return homePeriodOptions.find((option) => option.value === value) ?? homePeriodOptions[1];
}

function homePeriodRange() {
  const option = homePeriodOption();
  const today = new Date(`${currentDateKey()}T12:00:00`);

  if (option.value === "all") {
    return {
      startDate: "",
      endDate: ""
    };
  }

  if (option.value === "ytd") {
    return {
      startDate: `${today.getFullYear()}-01-01`,
      endDate: currentDateKey()
    };
  }

  return {
    startDate: dateKey(daysBefore(today, option.days)),
    endDate: currentDateKey()
  };
}

function normalizedManualDateRange() {
  const startDate = state.bankrollFilters.startDate;
  const endDate = state.bankrollFilters.endDate;

  if (startDate && endDate && startDate > endDate) {
    return {
      startDate: endDate,
      endDate: startDate
    };
  }

  return {
    startDate,
    endDate
  };
}

function normalizedDateRange() {
  const manual = normalizedManualDateRange();
  const period = homePeriodRange();
  const startDates = [manual.startDate, period.startDate].filter(Boolean).sort();
  const endDates = [manual.endDate, period.endDate].filter(Boolean).sort();

  return {
    startDate: startDates.at(-1) ?? "",
    endDate: endDates[0] ?? ""
  };
}

function filteredBankrollSessions() {
  const { startDate, endDate } = normalizedDateRange();

  return state.bankrollSessions.filter((session) => {
    const date = bankrollSessionDate(session);
    if (startDate && date < startDate) {
      return false;
    }
    if (endDate && date > endDate) {
      return false;
    }
    if (state.bankrollFilters.location && bankrollSessionField(session, "location") !== state.bankrollFilters.location) {
      return false;
    }
    if (state.bankrollFilters.gameType && bankrollSessionField(session, "gameType") !== state.bankrollFilters.gameType) {
      return false;
    }
    if (state.bankrollFilters.stakes && bankrollSessionField(session, "stakes") !== state.bankrollFilters.stakes) {
      return false;
    }

    return true;
  });
}

function currentBankrollSummary() {
  return summarizeBankrollSessions(filteredBankrollSessions());
}

function uniqueBankrollValues(field) {
  return [...new Set(state.bankrollSessions.map((session) => bankrollSessionField(session, field)))]
    .sort((a, b) => a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base"
    }));
}

function setBankrollSelectOptions(name, label, values) {
  const control = elements.bankrollFilterControls.find((item) => item.dataset.bankrollFilter === name);
  if (!control) {
    return;
  }

  if (state.bankrollFilters[name] && !values.includes(state.bankrollFilters[name])) {
    state.bankrollFilters[name] = "";
  }

  control.innerHTML = [
    `<option value="">${escapeHtml(label)}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
  ].join("");
  control.value = state.bankrollFilters[name];
}

function bankrollViewParts() {
  const parts = [homePeriodOption().label];
  const manualRange = normalizedManualDateRange();

  if (manualRange.startDate && manualRange.endDate) {
    parts.push(`${formatLongDate(manualRange.startDate)} to ${formatLongDate(manualRange.endDate)}`);
  } else if (manualRange.startDate) {
    parts.push(`since ${formatLongDate(manualRange.startDate)}`);
  } else if (manualRange.endDate) {
    parts.push(`through ${formatLongDate(manualRange.endDate)}`);
  }

  for (const name of ["location", "gameType", "stakes"]) {
    if (state.bankrollFilters[name]) {
      parts.push(state.bankrollFilters[name]);
    }
  }

  return parts;
}

function renderHomePeriodControls() {
  const option = homePeriodOption();
  const summary = currentBankrollSummary();
  const { startDate, endDate } = normalizedDateRange();

  elements.homePeriodTitle.textContent = option.label;
  elements.homePeriodNote.textContent = summary.sessionCount > 0
    ? option.value === "all" && !startDate && !endDate
      ? `${summary.sessionCount} sessions across all logged results.`
      : `${summary.sessionCount} sessions from ${startDate ? formatLongDate(startDate) : "your first logged session"}${endDate ? ` through ${formatLongDate(endDate)}` : ""}.`
    : `No sessions in ${option.label.toLowerCase()}.`;

  for (const button of elements.homePeriodTabs.querySelectorAll("[data-home-period]")) {
    button.classList.toggle("active", button.dataset.homePeriod === state.homePeriod);
  }
}

function renderBankrollFilters() {
  setBankrollSelectOptions("location", "All locations", uniqueBankrollValues("location"));
  setBankrollSelectOptions("gameType", "All games", uniqueBankrollValues("gameType"));
  setBankrollSelectOptions("stakes", "All stakes", uniqueBankrollValues("stakes"));

  for (const control of elements.bankrollFilterControls) {
    if (control.tagName === "SELECT") {
      continue;
    }
    control.value = state.bankrollFilters[control.dataset.bankrollFilter] ?? "";
  }

  const filteredSessions = filteredBankrollSessions();
  const parts = bankrollViewParts();

  elements.bankrollFilterSummary.textContent = parts.length
    ? `${filteredSessions.length} of ${state.bankrollSessions.length} sessions shown / ${parts.join(" / ")}`
    : `${state.bankrollSessions.length} sessions shown`;
}

function sessionId(session) {
  return session?.sessionId ?? session?.id ?? "";
}

function sessionById(id) {
  return state.bankrollSessions.find((session) => sessionId(session) === id) ?? null;
}

function transactionId(transaction) {
  return transaction?.transactionId ?? transaction?.id ?? "";
}

function transactionById(id) {
  return state.bankrollTransactions.find((transaction) => transactionId(transaction) === id) ?? null;
}

function transactionTypeLabel(type) {
  return String(type ?? "adjustment")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  const actionCommitment = hand.actions
    .filter((action) => action.player === hand.hero)
    .reduce((sum, action) => sum + (Number(action.amount) || 0), 0);
  const forcedCommitment = (hand.forcedBets ?? [])
    .filter((forcedBet) => forcedBet.player === hand.hero)
    .reduce((sum, forcedBet) => sum + (Number(forcedBet.amount) || 0), 0);

  return Number(((Number(hand.winnings?.[hand.hero]) || 0) - actionCommitment - forcedCommitment).toFixed(2));
}

function trackedPot(hand) {
  const actionPot = (hand.actions ?? []).reduce((sum, action) => sum + (Number(action.amount) || 0), 0);
  const forcedPot = (hand.forcedBets ?? []).reduce((sum, forcedBet) => sum + (Number(forcedBet.amount) || 0), 0);

  return actionPot + forcedPot;
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
    return bankrollViewLimited() || state.bankrollSessions.length > 0
      ? renderEmptyState({
        title: "No sessions in this view",
        body: "Adjust the period, date, location, game, or stakes filters to bring sessions back into view.",
        secondaryLabel: "",
        compact: true
      })
      : renderEmptyState({
        title: "Start building your poker profile",
        body: "Log a session and Backdoor Flush will start tracking your performance over time.",
        primaryLabel: "Log First Session",
        primaryView: "sessions",
        compact: true
      });
  }

  const values = points.map((point) => point.cumulativeProfit);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const rawSpan = Math.max(1, rawMax - rawMin);
  const min = rawMin - rawSpan * 0.08;
  const max = rawMax + rawSpan * 0.08;
  const span = Math.max(1, max - min);
  const width = 760;
  const height = 320;
  const padding = {
    top: 26,
    right: 30,
    bottom: 36,
    left: 78
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const valueToY = (value) => padding.top + plotHeight - ((value - min) / span) * plotHeight;
  const coordinates = points.map((point, index) => {
    const x = padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = valueToY(point.cumulativeProfit);
    return {
      x,
      y,
      point
    };
  });
  const zeroY = valueToY(0);
  const linePath = coordinates.map((entry, index) => {
    const prefix = index === 0 ? "M" : "L";
    return `${prefix}${entry.x.toFixed(1)} ${entry.y.toFixed(1)}`;
  }).join(" ");
  const first = coordinates[0];
  const last = coordinates.at(-1);
  const areaPath = `${linePath} L${last.x.toFixed(1)} ${zeroY.toFixed(1)} L${first.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  const maxIndex = values.indexOf(rawMax);
  const minIndex = values.indexOf(rawMin);
  const markerStep = Math.max(1, Math.ceil(points.length / 18));
  const visibleMarkerIndexes = new Set([0, points.length - 1, maxIndex, minIndex]);

  for (let index = 0; index < points.length; index += markerStep) {
    visibleMarkerIndexes.add(index);
  }

  const ticks = Array.from({ length: 5 }, (_, index) => max - (span / 4) * index);

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Bankroll curve">
      ${ticks.map((value) => {
        const y = valueToY(value);
        return `
          <line class="chart-grid-line" x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}"></line>
          <text class="chart-axis-label" x="${padding.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end">${formatCurrency(value, { compact: true })}</text>
        `;
      }).join("")}
      <line class="zero-line" x1="${padding.left}" y1="${zeroY.toFixed(1)}" x2="${width - padding.right}" y2="${zeroY.toFixed(1)}"></line>
      <path class="bankroll-area" d="${areaPath}"></path>
      <path class="bankroll-line" d="${linePath}"></path>
      ${coordinates
        .map(({ x, y, point }, index) => {
          const title = `${point.date} / ${point.label || "Session"} / ${formatCurrency(point.profit, { signed: true })} session / ${formatCurrency(point.cumulativeProfit, { signed: true })} running`;
          return `
            <circle class="bankroll-hit-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8">
              <title>${escapeHtml(title)}</title>
            </circle>
            ${visibleMarkerIndexes.has(index)
              ? `<circle class="bankroll-point ${point.profit >= 0 ? "win" : "loss"}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${points.length === 1 ? 5 : 3.8}">
              <title>${escapeHtml(point.date)} ${formatCurrency(point.cumulativeProfit, { signed: true })}</title>
            </circle>`
              : ""}
          `;
        })
        .join("")}
      <text class="chart-axis-label" x="${padding.left}" y="${height - 10}" text-anchor="start">${escapeHtml(formatDate(points[0].date))}</text>
      <text class="chart-axis-label" x="${width - padding.right}" y="${height - 10}" text-anchor="end">${escapeHtml(formatDate(points.at(-1).date))}</text>
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
  const bankrollSummary = currentBankrollSummary();
  const linkedHands = state.hands.filter((hand) => hand.sessionId).length;
  const liveHands = state.hands.filter((hand) => hand.source === "live-entry").length;
  const importedHands = Math.max(0, handCount - liveHands);

  elements.metrics.sideHands.textContent = handCount;
  elements.metrics.hands.textContent = handCount;
  elements.metrics.players.textContent = state.players.length;
  elements.metrics.linkedHands.textContent = linkedHands;
  elements.metrics.leaks.textContent = state.reviewSpots.length;
  elements.studySampleContext.innerHTML = handCount === 0
    ? `
      <strong>Study sample</strong>
      <span>Captured-hand stats will appear after hands are imported or built from live sessions.</span>
    `
    : `
      <strong>Study sample</strong>
      <span>${handCount} saved hands: ${liveHands} live-built, ${importedHands} imported, ${linkedHands} linked to bankroll sessions. Hand stats below are review-sample signals, not a complete record of every hand played.</span>
    `;
  elements.overviewEmpty.hidden = handCount > 0 || state.bankrollSessions.length > 0;
  elements.overviewEmpty.innerHTML = elements.overviewEmpty.hidden
    ? ""
    : renderEmptyState({
      title: "Start building your poker profile",
      body: "Log your first session or explore the demo to see how tracking, review, and study connect.",
      primaryLabel: "Log First Session",
      primaryView: "sessions"
    });
  elements.metrics.profit.textContent = formatCurrency(bankrollSummary.totalProfit, {
    compact: true,
    signed: true
  });
  elements.metrics.hours.textContent = formatNumber(bankrollSummary.totalHours, 1);
  elements.metrics.sessions.textContent = bankrollSummary.sessionCount;
  elements.metrics.hourly.textContent = `${formatCurrency(bankrollSummary.hourlyRate, {
    compact: true,
    signed: true
  })}/hr`;
  elements.metrics.bbhr.textContent = formatNumber(bankrollSummary.bbPerHour, 1);
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

function numericInput(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(number) ? number : fallback;
}

function parseStakeAmounts(stakes) {
  return [...String(stakes ?? "").matchAll(/(?:\$|\b)(\d+(?:\.\d+)?)/g)]
    .map((match) => Number(match[1]))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
}

function blindStructureFromStakes(stakes = "") {
  const amounts = parseStakeAmounts(stakes);

  return {
    smallBlind: amounts[0] ?? 0,
    bigBlind: amounts[1] ?? amounts[0] ?? 0,
    straddle: amounts[2] ?? 0,
    hasStraddle: amounts.length >= 3 && amounts[2] > 0
  };
}

function currentBlindStructure() {
  return blindStructureFromStakes(elements.liveStakes?.value ?? "");
}

function defaultPositionPlan(playerCount, structure = blindStructureFromStakes()) {
  return (structure.hasStraddle ? liveStraddlePositions : liveDefaultPositions)[playerCount] ?? liveDefaultPositions[playerCount] ?? [];
}

function defaultPositionForSeat(index, playerCount = state.livePlayerCount, structure = blindStructureFromStakes()) {
  return defaultPositionPlan(playerCount, structure)[index] ?? livePositionOptions[index % livePositionOptions.length];
}

function defaultBlindForPosition(position, structure = blindStructureFromStakes()) {
  const normalizedPosition = String(position ?? "").trim().toUpperCase();

  if (normalizedPosition === "SB" && structure.smallBlind > 0) {
    return {
      type: "small-blind",
      amount: structure.smallBlind
    };
  }

  if (normalizedPosition === "BB" && structure.bigBlind > 0) {
    return {
      type: "big-blind",
      amount: structure.bigBlind
    };
  }

  if (normalizedPosition === "STR" && structure.straddle > 0) {
    return {
      type: "straddle",
      amount: structure.straddle
    };
  }

  return {
    type: "",
    amount: ""
  };
}

function defaultLiveSeat(index, playerCount = 6, structure = blindStructureFromStakes()) {
  const position = defaultPositionForSeat(index, playerCount, structure);
  const blind = defaultBlindForPosition(position, structure);

  return {
    seat: String(index + 1),
    name: index === 0 ? "Hero" : index < playerCount ? `Villain ${index}` : "",
    position,
    stack: index < playerCount ? "300" : "",
    blindType: blind.type,
    blindAmount: blind.amount ? String(blind.amount) : ""
  };
}

function isDefaultPositionValue(index, value) {
  const position = String(value ?? "").trim().toUpperCase();
  if (!position) {
    return true;
  }

  return liveTableSizes.some((playerCount) => (
    liveDefaultPositions[playerCount]?.[index] === position ||
    liveStraddlePositions[playerCount]?.[index] === position
  ));
}

function applyBlindStructure({ forcePositions = false, forceBlinds = false } = {}) {
  const structure = currentBlindStructure();

  for (let index = 0; index < state.livePlayerCount; index += 1) {
    const existingDraft = state.liveSeatDrafts[index] ?? {};
    const nextDefault = defaultLiveSeat(index, state.livePlayerCount, structure);
    const position = forcePositions || isDefaultPositionValue(index, existingDraft.position)
      ? nextDefault.position
      : existingDraft.position || nextDefault.position;
    const blind = defaultBlindForPosition(position, structure);
    const shouldUseDefaultBlind = forceBlinds || (
      isDefaultPositionValue(index, existingDraft.position) &&
      (!existingDraft.blindType || !existingDraft.blindAmount)
    );

    state.liveSeatDrafts[index] = {
      ...existingDraft,
      seat: existingDraft.seat || nextDefault.seat,
      name: existingDraft.name || nextDefault.name,
      position,
      stack: existingDraft.stack || nextDefault.stack,
      blindType: shouldUseDefaultBlind ? blind.type : existingDraft.blindType,
      blindAmount: shouldUseDefaultBlind ? (blind.amount ? String(blind.amount) : "") : existingDraft.blindAmount
    };
  }
}

function liveSeatRows() {
  return [...elements.liveSeatGrid.querySelectorAll("[data-live-player-row]")];
}

function syncLiveSeatDraftsFromDom() {
  for (const row of liveSeatRows()) {
    const index = Number(row.dataset.livePlayerRow);
    state.liveSeatDrafts[index] = {
      seat: row.querySelector("[data-live-seat]").value || String(index + 1),
      name: row.querySelector("[data-live-player-name]").value,
      position: row.querySelector("[data-live-position]").value,
      stack: row.querySelector("[data-live-stack]").value,
      blindType: row.querySelector("[data-live-blind-type]").value,
      blindAmount: row.querySelector("[data-live-blind-amount]").value
    };
  }
}

function syncLiveShowdownDraftsFromDom() {
  for (const input of elements.liveShowdownList.querySelectorAll("[data-showdown-player]")) {
    state.liveShowdownDrafts[input.dataset.showdownPlayer] = input.value;
  }
}

function renderLivePlayerCount() {
  for (const button of elements.livePlayerCount.querySelectorAll("[data-live-player-count]")) {
    button.classList.toggle("active", Number(button.dataset.livePlayerCount) === state.livePlayerCount);
  }
}

function renderBlindOptions(selectedType) {
  return liveBlindTypes
    .map((blindType) => `<option value="${escapeHtml(blindType.value)}" ${blindType.value === selectedType ? "selected" : ""}>${escapeHtml(blindType.label)}</option>`)
    .join("");
}

function renderLiveSeatRows() {
  renderLivePlayerCount();
  applyBlindStructure();

  const labelRow = `
    <div class="live-seat-row live-seat-labels">
      <span>Seat</span>
      <span>Player</span>
      <span>Position</span>
      <span>Stack</span>
      <span>Blind</span>
    </div>
  `;
  const rows = Array.from({ length: state.livePlayerCount }, (_, index) => {
    const draft = state.liveSeatDrafts[index] ?? defaultLiveSeat(index, state.livePlayerCount);
    const normalizedDraft = {
      ...draft,
      position: draft.position || defaultPositionForSeat(index, state.livePlayerCount),
      stack: draft.stack || "300",
      blindType: draft.blindType ?? "",
      blindAmount: draft.blindAmount ?? ""
    };
    state.liveSeatDrafts[index] = normalizedDraft;

    return `
      <div class="live-seat-row" data-live-player-row="${index}">
        <input data-live-seat value="${escapeHtml(normalizedDraft.seat)}" inputmode="numeric" aria-label="Seat ${index + 1}">
        <input data-live-player-name value="${escapeHtml(normalizedDraft.name)}" autocomplete="off" aria-label="Seat ${index + 1} player">
        <input data-live-position value="${escapeHtml(normalizedDraft.position)}" list="live-position-options" autocomplete="off" aria-label="Seat ${index + 1} position">
        <input data-live-stack value="${escapeHtml(normalizedDraft.stack)}" inputmode="decimal" aria-label="Seat ${index + 1} stack">
        <div class="blind-cell">
          <select data-live-blind-type aria-label="Seat ${index + 1} blind type">
            ${renderBlindOptions(normalizedDraft.blindType)}
          </select>
          <input data-live-blind-amount value="${escapeHtml(normalizedDraft.blindAmount)}" inputmode="decimal" aria-label="Seat ${index + 1} blind amount">
        </div>
      </div>
    `;
  }).join("");

  elements.liveSeatGrid.innerHTML = labelRow + rows;
}

function livePlayers() {
  return liveSeatRows()
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

function liveForcedBets() {
  return liveSeatRows()
    .map((row) => {
      const player = row.querySelector("[data-live-player-name]").value.trim();
      const type = row.querySelector("[data-live-blind-type]").value;
      const amount = numericInput(row.querySelector("[data-live-blind-amount]").value, 0);

      return {
        player,
        type,
        amount,
        street: "hole-cards"
      };
    })
    .filter((forcedBet) => forcedBet.player && forcedBet.type && forcedBet.amount > 0);
}

function revealedHandsFromLiveForm() {
  syncLiveShowdownDraftsFromDom();

  return Object.fromEntries(
    Object.entries(state.liveShowdownDrafts)
      .map(([player, cards]) => [player, String(cards ?? "").trim()])
      .filter(([player, cards]) => player && cards)
  );
}

function liveStreetContribution(player, street = currentLiveStreet()) {
  const forcedContribution = street === "hole-cards"
    ? liveForcedBets()
      .filter((forcedBet) => forcedBet.player === player)
      .reduce((sum, forcedBet) => sum + (Number(forcedBet.amount) || 0), 0)
    : 0;
  const actionContribution = state.liveActions
    .filter((action) => action.street === street && action.player === player)
    .reduce((sum, action) => sum + (Number(action.amount) || 0), 0);

  return forcedContribution + actionContribution;
}

function liveCallAmount(player, street = currentLiveStreet()) {
  const players = livePlayerNames();
  const largestContribution = Math.max(0, ...players.map((name) => liveStreetContribution(name, street)));
  return Math.max(0, largestContribution - liveStreetContribution(player, street));
}

function livePotState() {
  const player = elements.liveActionPlayer.value;
  const pot = trackedPot({
    actions: state.liveActions,
    forcedBets: liveForcedBets()
  });

  return {
    pot,
    callAmount: player ? liveCallAmount(player) : 0,
    forcedBets: liveForcedBets()
  };
}

function forcedBetLabel(forcedBet) {
  return `${escapeHtml(forcedBet.player)} ${escapeHtml(blindTypeLabels[forcedBet.type] ?? forcedBet.type)} ${formatCurrency(forcedBet.amount)}`;
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

function renderLiveShowdownRows() {
  const hero = elements.liveHero.value.trim() || "Hero";
  const players = livePlayers().filter((player) => player.name !== hero);

  if (players.length === 0) {
    elements.liveShowdownList.innerHTML = '<div class="empty compact">No opponent seats yet.</div>';
    return;
  }

  elements.liveShowdownList.innerHTML = players
    .map((player) => {
      const value = state.liveShowdownDrafts[player.name] ?? "";
      const cards = String(value).trim().split(/[\s,]+/).filter(Boolean).slice(0, 2);

      return `
        <div class="showdown-row">
          <span>
            <strong>${escapeHtml(player.name)}</strong>
            <small>${escapeHtml(player.position ?? `Seat ${player.seat}`)}</small>
          </span>
          <input data-showdown-player="${escapeHtml(player.name)}" value="${escapeHtml(value)}" autocomplete="off" placeholder="Qs Qd" aria-label="${escapeHtml(player.name)} showdown cards">
          <div class="mini-cards">${cards.length ? cards.map((card) => renderCard(card, { mini: true })).join("") : renderCard("??", { mini: true }) + renderCard("??", { mini: true })}</div>
        </div>
      `;
    })
    .join("");
}

function renderActionShortcuts() {
  const structure = currentBlindStructure();
  const selectedPlayer = elements.liveActionPlayer.value;
  const street = currentLiveStreet();
  const { pot, callAmount } = livePotState();
  const bettingBase = street === "hole-cards"
    ? Math.max(structure.straddle || 0, structure.bigBlind || 0, 1)
    : Math.max(pot, structure.bigBlind || 1);
  const shortcutRows = [
    ...quickActionPresets.map((preset) => ({
      ...preset,
      amount: preset.type === "calls" ? callAmount : null,
      label: preset.type === "calls" && callAmount > 0 ? `Call ${formatCurrency(callAmount)}` : preset.label
    })),
    {
      type: street === "hole-cards" ? "raises" : "bets",
      amount: Math.round(((street === "hole-cards" ? bettingBase * 3 : bettingBase * 0.5) + Number.EPSILON) * 100) / 100,
      label: street === "hole-cards" ? `Open ${formatCurrency(bettingBase * 3)}` : `1/2 pot ${formatCurrency(bettingBase * 0.5)}`
    },
    {
      type: street === "hole-cards" ? "raises" : "bets",
      amount: Math.round(((street === "hole-cards" ? bettingBase * 4 : bettingBase) + Number.EPSILON) * 100) / 100,
      label: street === "hole-cards" ? `Raise ${formatCurrency(bettingBase * 4)}` : `Pot ${formatCurrency(bettingBase)}`
    }
  ];

  elements.liveActionShortcuts.innerHTML = shortcutRows
    .map((shortcut) => {
      const disabled = !selectedPlayer || (shortcut.type === "calls" && Number(shortcut.amount) <= 0);

      return `
      <button type="button" data-action-shortcut-type="${escapeHtml(shortcut.type)}" data-action-shortcut-amount="${shortcut.amount ?? ""}" ${disabled ? "disabled" : ""}>
        ${escapeHtml(shortcut.label)}
      </button>
    `;
    })
    .join("");
}

function renderLiveActions() {
  if (state.liveActions.length === 0) {
    elements.liveActionList.innerHTML = '<div class="empty compact">No actions yet.</div>';
    return;
  }

  elements.liveActionList.innerHTML = renderActionTimeline(state.liveActions, {
    removable: true
  });
}

function actionAmountLabel(action) {
  return action.amount ? formatCurrency(action.amount) : "";
}

function actionTypeClass(action) {
  return String(action.type ?? "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

function renderActionTimeline(actions, { removable = false, activeIndex = -1 } = {}) {
  const renderedStreets = streetOrder
    .map((street) => {
      const streetActions = actions
        .map((action, index) => ({
          action,
          index
        }))
        .filter((entry) => entry.action.street === street);

      if (streetActions.length === 0) {
        return "";
      }

      return `
        <section class="action-street-group">
          <h5>${escapeHtml(streetLabels[street] ?? street)}</h5>
          <div class="action-street-list">
            ${streetActions.map(({ action, index }) => `
              <div class="live-action-row ${index === activeIndex ? "active" : ""}">
                <span class="action-order">${index + 1}</span>
                <strong>${escapeHtml(action.player)}</strong>
                <span class="action-badge ${actionTypeClass(action)}">${escapeHtml(action.type)}</span>
                <em>${escapeHtml(actionAmountLabel(action))}</em>
                ${removable ? `<button class="button ghost" type="button" data-delete-live-action="${index}">Remove</button>` : ""}
              </div>
            `).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  return `<div class="action-timeline">${renderedStreets}</div>`;
}

function seatStyle(index, total) {
  const angle = -90 + (360 / Math.max(1, total)) * index;
  const radians = (angle * Math.PI) / 180;
  const x = 50 + Math.cos(radians) * 38;
  const y = 50 + Math.sin(radians) * 31;

  return `--seat-left: ${x.toFixed(2)}%; --seat-top: ${y.toFixed(2)}%;`;
}

function renderTableSeats(players, {
  hero = "",
  heroCards = [],
  activePlayer = "",
  foldedPlayers = new Set(),
  revealedHands = {},
  forcedBets = []
} = {}) {
  return players
    .map((player, index) => {
      const isHero = player.name === hero;
      const isActive = player.name === activePlayer;
      const isFolded = foldedPlayers.has(player.name);
      const cards = revealedHands[player.name] ?? (isHero ? heroCards : ["??", "??"]);
      const forcedBet = forcedBets.find((item) => item.player === player.name);
      const classes = [
        "table-seat",
        isHero ? "hero" : "",
        isActive ? "active" : "",
        isFolded ? "folded" : ""
      ].filter(Boolean).join(" ");

      return `
        <div class="${classes}" style="${seatStyle(index, players.length)}">
          <span>${escapeHtml(player.position ?? `Seat ${player.seat}`)}</span>
          <strong>${escapeHtml(player.name)}</strong>
          <small>${formatNumber(player.stack, 0)} stack</small>
          ${forcedBet ? `<small class="seat-forced-bet">${escapeHtml(blindTypeLabels[forcedBet.type] ?? forcedBet.type)} ${formatCurrency(forcedBet.amount)}</small>` : ""}
          <div class="mini-cards">${cards.map((card) => renderCard(card, { mini: true })).join("")}</div>
        </div>
      `;
    })
    .join("");
}

function currentLiveStreet() {
  return elements.liveActionStreet.value || "hole-cards";
}

function renderStreetTabs() {
  for (const button of elements.liveStreetTabs.querySelectorAll("[data-live-street]")) {
    button.classList.toggle("active", button.dataset.liveStreet === currentLiveStreet());
  }
}

function renderLivePreview() {
  const form = new FormData(elements.liveForm);
  const session = sessionById(elements.liveSession.value);
  const hero = form.get("hero") || "Hero";
  const heroCards = String(form.get("heroCards") ?? "").trim().split(/[\s,]+/).filter(Boolean);
  const board = String(form.get("boardCards") ?? "").trim().split(/[\s,]+/).filter(Boolean);
  const players = livePlayers();
  const forcedBets = liveForcedBets();
  const revealedHands = revealedHandsFromLiveForm();
  const lastAction = state.liveActions.at(-1);
  const foldedPlayers = new Set(state.liveActions.filter((action) => action.type === "folds").map((action) => action.player));
  const potState = livePotState();
  const trackedPot = trackedPotAt({
    actions: state.liveActions,
    forcedBets
  }, state.liveActions.length + 1);
  const visibleBoard = board.length ? renderCards(board) : renderCards(["??", "??", "??"]);
  const blindLine = forcedBets.length ? forcedBets.map(forcedBetLabel).join(" / ") : "No forced bets";

  renderStreetTabs();
  renderActionShortcuts();

  elements.livePreview.innerHTML = `
    <div class="live-table-preview">
      <div class="live-table-felt table-size-${players.length}">
        ${renderTableSeats(players, {
          hero,
          heroCards,
          activePlayer: lastAction?.player ?? "",
          foldedPlayers,
          revealedHands,
          forcedBets
        })}
        <div class="board-zone live-board-zone">
          <span class="subtle">${escapeHtml(sessionLabel(session))}</span>
          ${visibleBoard}
          <strong>${formatCurrency(trackedPot)}</strong>
          <small>tracked pot</small>
        </div>
      </div>
    </div>
    <div class="live-preview-stats">
      <article class="preview-card">
        <span class="subtle">Pot</span>
        <strong>${formatCurrency(trackedPot)}</strong>
      </article>
      <article class="preview-card">
        <span class="subtle">To call</span>
        <strong>${formatCurrency(potState.callAmount)}</strong>
      </article>
      <article class="preview-card wide">
        <span class="subtle">Blinds</span>
        <strong>${escapeHtml(blindLine)}</strong>
      </article>
      <article class="preview-card">
        <span class="subtle">Seats</span>
        <strong>${players.length}</strong>
      </article>
      <article class="preview-card">
        <span class="subtle">Actions</span>
        <strong>${state.liveActions.length}</strong>
      </article>
    </div>
    ${
      state.liveActions.length
        ? renderActionTimeline(state.liveActions, { activeIndex: state.liveActions.length - 1 })
        : '<div class="empty compact">No actions yet.</div>'
    }
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
    elements.playerStats.innerHTML = '<tr><td colspan="6">Capture hands to see sample player tendencies.</td></tr>';
  }
}

function positionRows() {
  const totals = new Map();
  const handCount = state.hands.length;

  for (const hand of state.hands) {
    const position = heroPosition(hand) || "Unknown";
    const current = totals.get(position) ?? { hands: 0, result: 0 };
    current.hands += 1;
    current.result += estimatedHeroResult(hand);
    totals.set(position, current);
  }

  return [...totals.entries()]
    .map(([position, values]) => ({
      position,
      hands: values.hands,
      sharePct: handCount === 0 ? 0 : Number(((values.hands / handCount) * 100).toFixed(1)),
      result: values.result
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
    elements.positionChart.innerHTML = renderEmptyState({
      title: "No captured positions yet",
      body: "Import or build hands and this chart will show which hero positions your review sample covers.",
      primaryLabel: "Build Live Hand",
      primaryView: "live",
      compact: true
    });
  } else {
    elements.positionChart.innerHTML = positions
      .map(
        (row) => `
          <div class="chart-row-item">
            <div class="chart-label">
              <strong>${escapeHtml(row.position)}</strong>
              <span>${row.hands} captured hands</span>
            </div>
            <div class="single-bar coverage">
              <span style="width: ${Math.max(4, row.sharePct)}%"></span>
            </div>
            <div class="chart-values">${row.sharePct}% / ${formatCurrency(row.result, { signed: true })}</div>
          </div>
        `
      )
      .join("");
  }

  const imports = [...state.imports].reverse();
  const maxHands = Math.max(1, ...imports.map((item) => item.handCount));

  if (imports.length === 0) {
    elements.importChart.innerHTML = renderEmptyState({
      title: "No hand imports yet",
      body: "Import hand-history text when you want a larger batch of hands to review.",
      primaryLabel: "Import Hands",
      primaryView: "imports",
      compact: true
    });
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
  const summary = currentBankrollSummary();
  elements.bankrollChart.innerHTML = renderSparkline(summary.points ?? []);

  const locations = summary.byLocation ?? [];
  const maxProfit = Math.max(1, ...locations.map((item) => Math.abs(item.profit)));

  if (locations.length === 0) {
    elements.locationChart.innerHTML = bankrollViewLimited() || state.bankrollSessions.length > 0
      ? renderEmptyState({
        title: "No locations in this view",
        body: "Try a wider period or remove detailed filters.",
        compact: true,
        secondaryLabel: ""
      })
      : renderEmptyState({
        title: "No locations yet",
        body: "Add sessions from the places you play and this chart will compare results by location.",
        primaryLabel: "Log First Session",
        primaryView: "sessions",
        compact: true
      });
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
    elements.leakList.innerHTML = renderEmptyState({
      title: "No hands waiting for review",
      body: "Save difficult hands, tag important spots, or import a session and they will appear here.",
      primaryLabel: "Build Live Hand",
      primaryView: "live",
      compact: true
    });
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
    elements.tagSummary.innerHTML = renderEmptyState({
      title: "No tagged hands yet",
      body: "Tag hands during review and this area will show where your saved hands are winning or losing.",
      primaryLabel: "Open Hands",
      primaryView: "hands",
      compact: true
    });
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

function renderStudyPlan() {
  if (state.studyPlan.length === 0) {
    elements.studyPlan.innerHTML = renderEmptyState({
      title: "No study focus yet",
      body: "Keep logging and reviewing hands to unlock a focused list of spots to work on next.",
      primaryLabel: "Open Review",
      primaryView: "hands",
      compact: true
    });
    return;
  }

  elements.studyPlan.innerHTML = state.studyPlan
    .slice(0, 4)
    .map((item) => `
      <button class="study-plan-row" type="button" data-study-plan-hand="${escapeHtml(item.handIds?.[0] ?? "")}" ${item.handIds?.length ? "" : "disabled"}>
        <span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.detail)}</small>
        </span>
        <em>${item.count}</em>
      </button>
    `)
    .join("");
}

function openReviewHands() {
  const queuedIds = new Set(state.reviewSpots.filter((spot) => !spot.reviewedAt).map((spot) => spot.id));
  const taggedOpenHands = state.hands.filter((hand) => !hand.reviewedAt && handTags(hand).length > 0);
  const queuedHands = state.hands.filter((hand) => queuedIds.has(hand.id));

  return [...new Map([...queuedHands, ...taggedOpenHands].map((hand) => [hand.id, hand])).values()];
}

function unresolvedTagRows() {
  const rows = new Map();

  for (const hand of openReviewHands()) {
    for (const tag of handTags(hand)) {
      const current = rows.get(tag) ?? {
        tag,
        count: 0,
        result: 0,
        handIds: []
      };
      current.count += 1;
      current.result += estimatedHeroResult(hand);
      current.handIds.push(hand.id);
      rows.set(tag, current);
    }
  }

  return [...rows.values()].sort((a, b) => (
    b.count - a.count ||
    Math.abs(b.result) - Math.abs(a.result) ||
    tagLabel(a.tag).localeCompare(tagLabel(b.tag))
  ));
}

function strongestStudyTag() {
  return [...state.studyTags]
    .filter((row) => Number(row.totalResult) > 0 && Number(row.handCount) > 0)
    .sort((a, b) => Number(b.totalResult) - Number(a.totalResult))[0] ?? null;
}

function weakestStudyTag() {
  return [...state.studyTags]
    .filter((row) => Number(row.totalResult) < 0 && Number(row.handCount) > 0)
    .sort((a, b) => Number(a.totalResult) - Number(b.totalResult))[0] ?? null;
}

function focusRecommendation() {
  const planItem = state.studyPlan.find((item) => item.handIds?.length);
  if (planItem) {
    return {
      eyebrow: "Recommended Focus",
      title: planItem.title,
      detail: planItem.detail,
      count: planItem.count,
      handId: planItem.handIds[0],
      actionLabel: "Start Review"
    };
  }

  const [tagRow] = unresolvedTagRows();
  if (tagRow) {
    return {
      eyebrow: "Potential Area to Review",
      title: tagLabel(tagRow.tag),
      detail: `${tagRow.count} open saved hands carry this tag. Start there before drawing bigger conclusions.`,
      count: tagRow.count,
      tag: tagRow.tag,
      handId: tagRow.handIds[0],
      actionLabel: "Review Related Hands"
    };
  }

  if (state.reviewSpots.length > 0) {
    const [spot] = state.reviewSpots;
    return {
      eyebrow: "Next Hand",
      title: `Hand #${spot.handNumber}`,
      detail: `${spot.reasons.join(" / ")} is waiting in your review list.`,
      count: state.reviewSpots.length,
      handId: spot.id,
      actionLabel: "Open Hand"
    };
  }

  return null;
}

function renderInsightEmpty(target, title, body) {
  target.innerHTML = renderEmptyState({
    title,
    body,
    primaryLabel: "Build Live Hand",
    primaryView: "live",
    secondaryLabel: "Explore Demo",
    compact: true
  });
}

function renderHomeFocus() {
  const focus = focusRecommendation();

  if (!focus) {
    renderInsightEmpty(
      elements.homeFocus,
      "Keep logging to unlock a focus area",
      "Save and review a few hands, then Backdoor Flush will surface the most useful next study target."
    );
    return;
  }

  elements.homeFocus.innerHTML = `
    <article class="focus-callout">
      <span class="subtle">${escapeHtml(focus.eyebrow)}</span>
      <strong>${escapeHtml(focus.title)}</strong>
      <p>${escapeHtml(focus.detail)}</p>
      <div class="focus-meta">
        <span>${focus.count} ${focus.count === 1 ? "hand" : "hands"}</span>
        <button class="button" type="button" data-open-review-hand="${escapeHtml(focus.handId)}">${escapeHtml(focus.actionLabel)}</button>
      </div>
    </article>
  `;
}

function renderHomeReviewSummary() {
  const openSpots = openReviewHands();
  const highPriority = openSpots.filter((hand) => Math.abs(estimatedHeroResult(hand)) >= 300 || trackedPot(hand) >= 600).length;
  const firstSpot = openSpots[0];

  if (openSpots.length === 0) {
    elements.homeReviewSummary.innerHTML = renderEmptyState({
      title: "No hands waiting",
      body: "Save difficult or interesting hands and they will appear here for later review.",
      primaryLabel: "Build Live Hand",
      primaryView: "live",
      compact: true
    });
    return;
  }

  elements.homeReviewSummary.innerHTML = `
    <div class="review-count-card">
      <span class="subtle">Open review work</span>
      <strong>${openSpots.length} hands waiting</strong>
      <p>${highPriority} high priority / ${openSpots.length - highPriority} normal</p>
      <button class="button" type="button" data-open-review-hand="${escapeHtml(firstSpot.id)}">Start Review</button>
    </div>
  `;
}

function renderHomeProfile() {
  const strength = strongestStudyTag();
  const watch = weakestStudyTag() ?? unresolvedTagRows()[0] ?? null;

  elements.homeStrength.innerHTML = strength
    ? `
      <article class="sample-profile-card">
        <span class="subtle">Captured hands</span>
        <strong>${escapeHtml(tagLabel(strength.tag))}</strong>
        <p>${strength.handCount} hands / ${formatCurrency(strength.totalResult, { signed: true })} sample result.</p>
        <button class="button secondary" type="button" data-open-review-tag="${escapeHtml(strength.tag)}">View Hands</button>
      </article>
    `
    : renderEmptyState({
      title: "No strength surfaced yet",
      body: "Tagged, reviewed hands will reveal where your captured sample is performing well.",
      secondaryLabel: "",
      compact: true
    });

  elements.homeWatch.innerHTML = watch
    ? `
      <article class="sample-profile-card watch">
        <span class="subtle">${watch.totalResult < 0 ? "Captured hands" : "Open review sample"}</span>
        <strong>${escapeHtml(tagLabel(watch.tag))}</strong>
        <p>${watch.handCount ?? watch.count} hands / ${
          watch.totalResult !== undefined
            ? `${formatCurrency(watch.totalResult, { signed: true })} sample result.`
            : "most common unresolved tag."
        }</p>
        <button class="button secondary" type="button" data-open-review-tag="${escapeHtml(watch.tag)}">Review Related</button>
      </article>
    `
    : renderEmptyState({
      title: "No watch area yet",
      body: "Backdoor Flush will point to potential review areas after you save and tag hands.",
      secondaryLabel: "",
      compact: true
    });
}

function renderHomeInsights() {
  renderHomeFocus();
  renderHomeReviewSummary();
  renderHomeProfile();
}

function renderSessionSummary() {
  const summary = currentBankrollSummary();
  const transactionSummary = state.bankrollTransactionSummary;
  const bankrollBalance = summary.totalProfit + transactionSummary.totalAmount;
  const limitedView = bankrollViewLimited();
  const secondaryLabel = limitedView ? "Avg/session" : "Bankroll balance";
  const secondaryValue = limitedView
    ? summary.averageProfit
    : bankrollBalance;
  const viewLabel = bankrollViewParts().join(" / ");

  elements.sessionSummary.innerHTML = `
    <div class="session-kpis">
      <div>
        <span class="subtle">Session profit</span>
        <strong>${formatCurrency(summary.totalProfit, { signed: true })}</strong>
      </div>
      <div>
        <span class="subtle">${secondaryLabel}</span>
        <strong>${formatCurrency(secondaryValue, { signed: true })}</strong>
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
    <p class="session-scope-note">Showing ${escapeHtml(viewLabel)} session results.</p>
  `;
}

function renderBankrollImportPreview(payload = state.bankrollImportPreview) {
  if (!payload) {
    elements.bankrollImportPreview.innerHTML = "";
    return;
  }

  const sessions = payload.sessions ?? [];
  const transactions = payload.transactions ?? [];
  const skippedRows = payload.skippedRows ?? [];

  elements.bankrollImportPreview.innerHTML = `
    <div class="import-preview-grid">
      <div>
        <span class="subtle">Sessions ready</span>
        <strong>${payload.readySessionCount ?? sessions.length}</strong>
      </div>
      <div>
        <span class="subtle">Transactions ready</span>
        <strong>${payload.readyTransactionCount ?? transactions.length}</strong>
      </div>
      <div>
        <span class="subtle">Duplicates</span>
        <strong>${payload.duplicateCount ?? 0}</strong>
      </div>
      <div>
        <span class="subtle">Skipped rows</span>
        <strong>${payload.skippedCount ?? 0}</strong>
      </div>
    </div>
    <div class="preview-lists">
      <div>
        <h4>Sessions</h4>
        ${
          sessions.length
            ? sessions.slice(0, 4).map((session) => `
                <p>${escapeHtml(formatDate(session.date))} / ${escapeHtml(session.location)} / ${formatCurrency(session.profit, { signed: true })}</p>
              `).join("")
            : '<p class="muted-line">No new sessions found.</p>'
        }
      </div>
      <div>
        <h4>Transactions</h4>
        ${
          transactions.length
            ? transactions.slice(0, 4).map((transaction) => `
                <p>${escapeHtml(formatDate(transaction.date))} / ${escapeHtml(transactionTypeLabel(transaction.type))} / ${formatCurrency(transaction.amount, { signed: true })}</p>
              `).join("")
            : '<p class="muted-line">No new transactions found.</p>'
        }
      </div>
      ${
        skippedRows.length
          ? `<div>
              <h4>Skipped</h4>
              ${skippedRows.slice(0, 3).map((row) => `<p>Row ${escapeHtml(row.rowNumber)} / ${escapeHtml(row.reason)}</p>`).join("")}
            </div>`
          : ""
      }
    </div>
  `;
}

function renderTransactions() {
  const summary = state.bankrollTransactionSummary;

  elements.transactionSummary.innerHTML = `
    <div class="session-kpis">
      <div>
        <span class="subtle">Ledger net</span>
        <strong>${formatCurrency(summary.totalAmount, { signed: true })}</strong>
      </div>
      <div>
        <span class="subtle">Inflow</span>
        <strong>${formatCurrency(summary.inflow)}</strong>
      </div>
      <div>
        <span class="subtle">Outflow</span>
        <strong>${formatCurrency(summary.outflow)}</strong>
      </div>
      <div>
        <span class="subtle">Entries</span>
        <strong>${summary.transactionCount}</strong>
      </div>
    </div>
  `;

  if (state.bankrollTransactions.length === 0) {
    elements.transactionList.innerHTML = renderEmptyState({
      title: "No bankroll transactions yet",
      body: "Use transactions for deposits, withdrawals, transfers, or a starting bankroll balance.",
      secondaryLabel: "",
      compact: true
    });
    return;
  }

  elements.transactionList.innerHTML = state.bankrollTransactions
    .slice(0, 10)
    .map((transaction) => {
      const id = transactionId(transaction);
      return `
        <article class="transaction-row">
          <div>
            <div class="session-row-title">
              <strong>${escapeHtml(transactionTypeLabel(transaction.type))}</strong>
              <span class="pill">${formatCurrency(transaction.amount, { signed: true })}</span>
            </div>
            <p>${escapeHtml(formatDate(transaction.date))} / ${escapeHtml(transaction.bankrollName ?? "Default")}</p>
            ${transaction.note ? `<p>${escapeHtml(transaction.note)}</p>` : ""}
          </div>
          <div class="row-actions">
            <button class="button secondary" type="button" data-edit-bankroll-transaction="${escapeHtml(id)}">Edit</button>
            <button class="button danger" type="button" data-delete-bankroll-transaction="${escapeHtml(id)}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
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

function resetTransactionForm() {
  elements.transactionForm.reset();
  elements.transactionForm.elements.date.value = new Date().toISOString().slice(0, 10);
  elements.transactionForm.elements.type.value = "deposit";
  elements.transactionForm.elements.bankrollName.value = "Default";
  elements.transactionForm.dataset.editingTransactionId = "";
  elements.transactionFormTitle.textContent = "Bankroll Transactions";
  elements.transactionSubmit.textContent = "Add Transaction";
  elements.transactionCancel.hidden = true;
}

function fillTransactionForm(transaction) {
  elements.transactionForm.elements.date.value = transaction.date ?? "";
  elements.transactionForm.elements.type.value = transaction.type ?? "adjustment";
  elements.transactionForm.elements.amount.value = transaction.amount ?? "";
  elements.transactionForm.elements.bankrollName.value = transaction.bankrollName ?? "Default";
  elements.transactionForm.elements.note.value = transaction.note ?? "";
  elements.transactionForm.dataset.editingTransactionId = transactionId(transaction);
  elements.transactionFormTitle.textContent = "Edit Transaction";
  elements.transactionSubmit.textContent = "Save Transaction";
  elements.transactionCancel.hidden = false;
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

function renderSessionDetail(visibleSessions = state.bankrollSessions) {
  const selectedSession = visibleSessions.some((session) => sessionId(session) === state.selectedSessionId)
    ? sessionById(state.selectedSessionId)
    : null;

  if (!selectedSession) {
    elements.sessionDetail.innerHTML = bankrollViewLimited()
      ? renderEmptyState({
        title: "Select a matching session",
        body: "Session details show linked imports, saved hands, and the largest swings for the selected session.",
        secondaryLabel: "",
        compact: true
      })
      : renderEmptyState({
        title: "Session details will appear here",
        body: "Choose a session after logging one to connect bankroll results with saved hands.",
        primaryLabel: "Log First Session",
        primaryView: "sessions",
        compact: true
      });
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
        <h4>Hands to Review</h4>
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
  const sessions = filteredBankrollSessions();
  renderSessionSummary();

  if (sessions.length === 0) {
    elements.sessionList.innerHTML = bankrollViewLimited() || state.bankrollSessions.length > 0
      ? renderEmptyState({
        title: "No sessions in this view",
        body: "Widen the Home period or adjust the detailed filters.",
        primaryLabel: "Home",
        primaryView: "overview",
        secondaryLabel: "",
        compact: true
      })
      : renderEmptyState({
        title: "Log your first session",
        body: "Add where you played, the stakes, hours, buy-in, and cash-out to start tracking your results.",
        primaryLabel: "Use Session Form",
        primaryView: "sessions",
        compact: true
      });
    renderSessionDetail(sessions);
    return;
  }

  elements.sessionList.innerHTML = sessions
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

  renderSessionDetail(sessions);
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
    elements.handList.innerHTML = state.hands.length === 0
      ? renderEmptyState({
        title: "Capture the hands that matter",
        body: "Import hand histories or build a live hand so important decisions are ready for review later.",
        primaryLabel: "Build Live Hand",
        primaryView: "live",
        secondaryLabel: "Import Hands",
        secondaryView: "imports",
        compact: true
      })
      : renderEmptyState({
        title: "No hands match these filters",
        body: "Try a broader tag, position, session, review, or result filter.",
        secondaryLabel: "",
        compact: true
      });
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
  const hasShowdownCards = Object.keys(hand.holeCards ?? {}).some((player) => player !== hand.hero);
  const steps = [
    {
      street: "hole-cards",
      action: null
    },
    ...hand.actions.map((action) => ({
      street: action.street,
      action
    }))
  ];

  if (hasShowdownCards && !steps.some((step) => step.street === "show-down")) {
    steps.push({
      street: "show-down",
      action: null,
      showdown: true
    });
  }

  return steps;
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
  const forcedPot = (hand.forcedBets ?? []).reduce((sum, forcedBet) => sum + (Number(forcedBet.amount) || 0), 0);
  const actionPot = (hand.actions ?? [])
    .slice(0, Math.max(0, stepIndex))
    .reduce((sum, action) => sum + (Number(action.amount) || 0), 0);

  return forcedPot + actionPot;
}

function renderReplayer(hand, steps) {
  const step = steps[state.replayStep] ?? steps[0];
  const activePlayer = step.action?.player ?? null;
  const visibleBoard = boardForStreet(hand, step.street);
  const foldedPlayers = foldedPlayersAt(hand, state.replayStep);
  const trackedPot = trackedPotAt(hand, state.replayStep);
  const heroCards = hand.hero ? hand.holeCards[hand.hero] : [];
  const revealShowdown = step.showdown || step.street === "show-down" || state.replayStep === steps.length - 1;
  const revealedHands = revealShowdown ? hand.holeCards ?? {} : {};
  const actionText = step.action
    ? formatAction(step.action)
    : step.showdown
      ? "Showdown cards revealed"
    : `Hand #${escapeHtml(hand.handNumber)} ready`;
  const seats = renderTableSeats(hand.players, {
    hero: hand.hero,
    heroCards,
    activePlayer,
    foldedPlayers,
    revealedHands,
    forcedBets: hand.forcedBets ?? []
  });

  return `
    <section class="replayer">
      <div class="replay-table table-size-${hand.players.length}">
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
      ${hand.actions.length ? renderActionTimeline(hand.actions, { activeIndex: Math.max(0, state.replayStep - 1) }) : ""}
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

function decisionAmountLabel(decision) {
  return decision.amount > 0 ? ` ${formatCurrency(decision.amount)}` : "";
}

function decisionTitle(decision) {
  return `${streetLabels[decision.street] ?? decision.street}: ${decision.actionType}${decisionAmountLabel(decision)}`;
}

function decisionReportFor(hand) {
  return state.decisionReportForHandId === hand.id ? state.decisionReport : null;
}

function renderDecisionReview(hand) {
  const report = decisionReportFor(hand);

  if (!report) {
    return `
      <section class="decision-review">
        <div class="review-editor-head">
          <div>
            <span class="subtle">Decision Review</span>
            <strong>Loading decisions</strong>
          </div>
        </div>
        <div class="empty compact">Building the street-by-street breakdown.</div>
      </section>
    `;
  }

  if (report.decisions.length === 0) {
    return `
      <section class="decision-review">
        <div class="review-editor-head">
          <div>
            <span class="subtle">Decision Review</span>
            <strong>No hero decisions found</strong>
          </div>
        </div>
        <div class="empty compact">Hero actions appear here after a parsed or live hand has action data.</div>
      </section>
    `;
  }

  const selected = report.decisions.find((decision) => decision.id === state.selectedDecisionId) ?? report.decisions[0];
  state.selectedDecisionId = selected.id;
  const promptById = new Map((report.prompts ?? []).map((prompt) => [prompt.id, prompt]));

  return `
    <section class="decision-review">
      <div class="review-editor-head">
        <div>
          <span class="subtle">Decision Review</span>
          <strong>${report.summary.reviewedCount} / ${report.summary.decisionCount} reviewed</strong>
        </div>
        <span class="pill">${report.summary.flaggedCount} flags</span>
      </div>
      <div class="decision-strip">
        ${report.decisions.map((decision) => `
          <button class="decision-chip ${decision.id === selected.id ? "active" : ""}" type="button" data-select-decision="${escapeHtml(decision.id)}">
            <span>${escapeHtml(streetLabels[decision.street] ?? decision.street)}</span>
            <strong>${escapeHtml(decision.actionType)}${decision.amount ? ` ${formatCurrency(decision.amount)}` : ""}</strong>
            ${decision.reviewedAt ? '<small>reviewed</small>' : '<small>open</small>'}
          </button>
        `).join("")}
      </div>
      <article class="decision-card" data-current-decision="${escapeHtml(selected.id)}">
        <div class="decision-card-head">
          <div>
            <span class="subtle">${escapeHtml(decisionTitle(selected))}</span>
            <strong>${formatCurrency(selected.potBefore)} pot before / ${selected.spr === null ? "SPR n/a" : `SPR ${selected.spr}`}</strong>
          </div>
          ${selected.reviewedAt ? '<span class="status ready">reviewed</span>' : '<span class="status queued">open</span>'}
        </div>
        <div class="decision-metrics">
          <div>
            <span class="subtle">Bet size</span>
            <strong>${selected.betSizePct === null ? "--" : `${selected.betSizePct}%`}</strong>
          </div>
          <div>
            <span class="subtle">Pot odds</span>
            <strong>${selected.potOddsPct === null ? "--" : `${selected.potOddsPct}%`}</strong>
          </div>
          <div>
            <span class="subtle">Players</span>
            <strong>${selected.activePlayers}</strong>
          </div>
        </div>
        ${selected.flags.length ? renderTags(selected.flags.map(normalizeTag)) : '<p class="muted-line">No automatic flags for this decision.</p>'}
        <textarea data-decision-note rows="4" placeholder="Decision note">${escapeHtml(selected.note ?? "")}</textarea>
        <div class="decision-checklist">
          ${(selected.promptIds ?? []).map((promptId) => {
            const prompt = promptById.get(promptId) ?? { id: promptId, label: promptId };
            return `
              <label>
                ${escapeHtml(prompt.label)}
                <textarea data-decision-checklist="${escapeHtml(prompt.id)}" rows="2">${escapeHtml(selected.checklist?.[prompt.id] ?? "")}</textarea>
              </label>
            `;
          }).join("")}
        </div>
        <div class="form-actions">
          <button class="button" type="button" data-save-decision>Save Decision</button>
          <button class="button secondary" type="button" data-mark-decision-reviewed>Mark Reviewed</button>
          <button class="button ghost" type="button" data-clear-decision-reviewed>Reopen</button>
        </div>
      </article>
    </section>
  `;
}

function renderHandDetail() {
  const hand = state.hands.find((item) => item.id === state.selectedHandId);

  if (!hand) {
    elements.handDetail.innerHTML = state.hands.length === 0
      ? renderEmptyState({
        title: "No hand selected",
        body: "Saved hands open here with replay, notes, tags, similar spots, and decision review.",
        primaryLabel: "Build Live Hand",
        primaryView: "live",
        compact: true
      })
      : renderEmptyState({
        title: "Select a hand",
        body: "Choose a saved hand to replay the action and review the decision points.",
        secondaryLabel: "",
        compact: true
      });
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
    ${renderDecisionReview(hand)}
    ${renderSimilarHands(hand)}
    <ul class="seat-list">${seats}</ul>
    <div class="street-list">${streets || '<div class="empty">No actions parsed for this hand.</div>'}</div>
  `;
}

function renderImports() {
  if (state.imports.length === 0) {
    elements.importList.innerHTML = renderEmptyState({
      title: "No imports yet",
      body: "Paste or upload hand-history text to create a larger review sample.",
      primaryLabel: "Use Import Form",
      primaryView: "imports",
      compact: true
    });
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

  renderBankrollFilters();
  renderHomePeriodControls();
  renderMetrics();
  renderPlayerOptions();
  renderSessionOptions();
  renderLiveSessionOptions();
  renderHandFilterOptions();
  renderLiveSeatRows();
  renderLivePlayerOptions();
  renderLiveShowdownRows();
  renderActionShortcuts();
  renderLiveActions();
  renderLivePreview();
  renderPlayerStats();
  renderCharts();
  renderBankrollCharts();
  renderReviewQueue();
  renderTagSummary();
  renderStudyPlan();
  renderHomeInsights();
  renderBankrollImportPreview();
  renderTransactions();
  renderSessions();
  renderHands();
  renderHandDetail();
  renderImports();
  syncImportPolling();
}

async function refresh({ quiet = false } = {}) {
  if (state.demoMode) {
    render();
    if (!quiet) {
      showToast("Demo mode is already loaded.");
    }
    return;
  }

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
    planPayload,
    bankrollSessionsPayload,
    bankrollSummaryPayload,
    bankrollTransactionsPayload,
    bankrollTransactionSummaryPayload
  ] = await Promise.all([
    api("/api/hands?limit=500"),
    api("/api/imports"),
    api("/api/stats/summary"),
    api("/api/leaks"),
    api(reviewQueuePath()),
    api("/api/study/tags"),
    api("/api/study/plan"),
    api("/api/bankroll/sessions"),
    api("/api/bankroll/summary"),
    api("/api/bankroll/transactions"),
    api("/api/bankroll/transactions/summary")
  ]);

  state.hands = handsPayload.hands;
  state.imports = importsPayload.imports;
  state.players = statsPayload.players;
  state.leaks = leaksPayload.leaks;
  state.reviewSpots = reviewPayload.spots;
  state.studyTags = tagsPayload.tags;
  state.studyPlan = planPayload.items;
  state.bankrollSessions = bankrollSessionsPayload.sessions;
  state.bankrollSummary = bankrollSummaryPayload.summary;
  state.bankrollTransactions = bankrollTransactionsPayload.transactions;
  state.bankrollTransactionSummary = bankrollTransactionSummaryPayload.summary;

  if (state.selectedHandId && !state.hands.some((hand) => hand.id === state.selectedHandId)) {
    state.selectedHandId = null;
    state.replayStep = 0;
  }

  if (!state.selectedHandId && state.hands.length > 0) {
    state.selectedHandId = state.hands[0].id;
    state.replayStep = 0;
  }

  if (state.selectedHandId) {
    const [similarPayload, decisionPayload] = await Promise.all([
      api(`/api/hands/${encodeURIComponent(state.selectedHandId)}/similar?limit=6`),
      api(`/api/hands/${encodeURIComponent(state.selectedHandId)}/decisions`)
    ]);
    state.similarForHandId = state.selectedHandId;
    state.similarHands = similarPayload.hands;
    state.decisionReportForHandId = state.selectedHandId;
    state.decisionReport = decisionPayload;
    if (!state.selectedDecisionId || !decisionPayload.decisions.some((decision) => decision.id === state.selectedDecisionId)) {
      state.selectedDecisionId = decisionPayload.decisions[0]?.id ?? null;
    }
  } else {
    state.similarForHandId = null;
    state.similarHands = [];
    state.decisionReportForHandId = null;
    state.decisionReport = null;
    state.selectedDecisionId = null;
  }

  render();

  if (!quiet) {
    renderAuthState();
  }
}

async function loadReviewQueue() {
  if (state.demoMode) {
    renderMetrics();
    renderReviewQueue();
    renderHomeInsights();
    renderSessions();
    return;
  }

  const payload = await api(reviewQueuePath());
  state.reviewSpots = payload.spots;
  renderMetrics();
  renderReviewQueue();
  renderHomeInsights();
  renderSessions();
}

async function loadSimilarHands(handId) {
  if (state.demoMode) {
    setDemoDecisionContext(handId);
    renderHandDetail();
    return;
  }

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

async function loadDecisionReview(handId) {
  if (state.demoMode) {
    setDemoDecisionContext(handId);
    renderHandDetail();
    return;
  }

  state.decisionReportForHandId = null;
  state.decisionReport = null;
  renderHandDetail();

  const payload = await api(`/api/hands/${encodeURIComponent(handId)}/decisions`);
  if (state.selectedHandId !== handId) {
    return;
  }

  state.decisionReportForHandId = handId;
  state.decisionReport = payload;
  if (!state.selectedDecisionId || !payload.decisions.some((decision) => decision.id === state.selectedDecisionId)) {
    state.selectedDecisionId = payload.decisions[0]?.id ?? null;
  }
  renderHandDetail();
}

async function loadStudyPlan() {
  if (state.demoMode) {
    renderStudyPlan();
    renderHomeInsights();
    return;
  }

  const payload = await api("/api/study/plan");
  state.studyPlan = payload.items;
  renderStudyPlan();
  renderHomeInsights();
}

async function selectHand(handId) {
  state.selectedHandId = handId;
  state.replayStep = 0;
  state.selectedDecisionId = null;

  if (state.demoMode) {
    setDemoDecisionContext(handId);
    renderHands();
    renderHandDetail();
    return;
  }

  renderHands();
  renderHandDetail();
  await Promise.all([
    loadSimilarHands(handId),
    loadDecisionReview(handId)
  ]);
}

function readSelectedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsText(file);
  });
}

function countLabel(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function bankrollImportSummary(payload) {
  const duplicateCount = payload.duplicateCount ?? 0;
  const skippedCount = Math.max(0, (payload.skippedCount ?? 0) - duplicateCount);
  const importedSessions = payload.importedSessionCount ?? payload.importedCount ?? payload.readySessionCount ?? 0;
  const importedTransactions = payload.importedTransactionCount ?? payload.readyTransactionCount ?? 0;
  const parts = [countLabel(importedSessions, "session") + " imported"];

  if (importedTransactions > 0) {
    parts.push(countLabel(importedTransactions, "transaction") + " imported");
  }

  if (duplicateCount > 0) {
    parts.push(countLabel(duplicateCount, "duplicate") + " skipped");
  }

  if (skippedCount > 0) {
    parts.push(countLabel(skippedCount, "non-session row") + " skipped");
  }

  return parts.join(" / ");
}

function bankrollPreviewSummary(payload) {
  const parts = [
    countLabel(payload.readySessionCount ?? 0, "session") + " ready",
    countLabel(payload.readyTransactionCount ?? 0, "transaction") + " ready"
  ];

  if ((payload.duplicateCount ?? 0) > 0) {
    parts.push(countLabel(payload.duplicateCount, "duplicate") + " found");
  }

  if ((payload.skippedCount ?? 0) > 0) {
    parts.push(countLabel(payload.skippedCount, "row") + " skipped");
  }

  return parts.join(" / ");
}

document.addEventListener("click", (event) => {
  const startTarget = event.target.closest("[data-start-tracking]");
  if (startTarget) {
    event.preventDefault();
    startTracking().catch((error) => showToast(error.message));
    return;
  }

  const demoTarget = event.target.closest("[data-load-demo]");
  if (demoTarget) {
    event.preventDefault();
    loadDemoExperience();
    return;
  }

  const exitTarget = event.target.closest("[data-exit-demo], #exit-demo");
  if (exitTarget) {
    event.preventDefault();
    exitDemo().catch((error) => showToast(error.message));
    return;
  }

  const reviewHandTarget = event.target.closest("[data-open-review-hand]");
  if (reviewHandTarget) {
    event.preventDefault();
    setView("hands");
    selectHand(reviewHandTarget.dataset.openReviewHand).catch((error) => showToast(error.message));
    return;
  }

  const reviewTagTarget = event.target.closest("[data-open-review-tag]");
  if (reviewTagTarget) {
    event.preventDefault();
    setView("hands");
    elements.handTagFilter.value = reviewTagTarget.dataset.openReviewTag;
    elements.handReviewFilter.value = "false";
    renderHands();
    return;
  }

  const viewTarget = event.target.closest("[data-jump-view]");
  if (viewTarget) {
    event.preventDefault();
    if (state.showLanding) {
      startTracking({ targetView: viewTarget.dataset.jumpView }).catch((error) => showToast(error.message));
      return;
    }

    setView(viewTarget.dataset.jumpView);
  }
});

elements.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

elements.homePeriodTabs.addEventListener("click", (event) => {
  const target = event.target.closest("[data-home-period]");
  if (!target) {
    return;
  }

  state.homePeriod = homePeriodOptions.some((option) => option.value === target.dataset.homePeriod)
    ? target.dataset.homePeriod
    : "30d";
  renderBankrollFilters();
  renderHomePeriodControls();
  renderMetrics();
  renderBankrollCharts();
  renderSessions();
});

elements.livePlayerCount.addEventListener("click", (event) => {
  const target = event.target.closest("[data-live-player-count]");
  if (!target) {
    return;
  }

  syncLiveSeatDraftsFromDom();
  syncLiveShowdownDraftsFromDom();
  state.livePlayerCount = Number(target.dataset.livePlayerCount);
  applyBlindStructure();
  renderLiveSeatRows();
  renderLivePlayerOptions();
  renderLiveShowdownRows();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveSeatGrid.addEventListener("input", () => {
  syncLiveSeatDraftsFromDom();
  renderLivePlayerOptions();
  renderLiveShowdownRows();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveSeatGrid.addEventListener("change", () => {
  syncLiveSeatDraftsFromDom();
  renderLivePlayerOptions();
  renderLiveShowdownRows();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveStreetTabs.addEventListener("click", (event) => {
  const target = event.target.closest("[data-live-street]");
  if (!target) {
    return;
  }

  elements.liveActionStreet.value = target.dataset.liveStreet;
  renderStreetTabs();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveBlindPresets.addEventListener("click", (event) => {
  const target = event.target.closest("[data-blind-preset]");
  if (!target) {
    return;
  }

  syncLiveSeatDraftsFromDom();
  syncLiveShowdownDraftsFromDom();
  elements.liveStakes.value = target.dataset.blindPreset;
  applyBlindStructure({
    forcePositions: true,
    forceBlinds: true
  });
  renderLiveSeatRows();
  renderLivePlayerOptions();
  renderLiveShowdownRows();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveForm.addEventListener("input", (event) => {
  if (event.target.closest("#live-seat-grid")) {
    return;
  }

  if (event.target.closest("#live-showdown-list")) {
    syncLiveShowdownDraftsFromDom();
    renderLivePreview();
    return;
  }

  syncLiveSeatDraftsFromDom();
  syncLiveShowdownDraftsFromDom();
  if (event.target === elements.liveStakes) {
    applyBlindStructure({
      forceBlinds: true
    });
    renderLiveSeatRows();
  }
  renderLivePlayerOptions();
  renderLiveShowdownRows();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveSession.addEventListener("change", () => {
  renderLivePreview();
});

for (const control of [elements.liveActionPlayer, elements.liveActionType, elements.liveActionAmount]) {
  control.addEventListener("change", () => {
    renderActionShortcuts();
    renderLivePreview();
  });
}

elements.liveActionShortcuts.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action-shortcut-type]");
  if (!target) {
    return;
  }

  const player = elements.liveActionPlayer.value;
  if (!player) {
    showToast("Add a player before adding an action.");
    return;
  }

  state.liveActions.push({
    street: currentLiveStreet(),
    player,
    type: target.dataset.actionShortcutType,
    amount: target.dataset.actionShortcutAmount || null
  });
  elements.liveActionAmount.value = "";
  renderLiveActions();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveAddAction.addEventListener("click", () => {
  const player = elements.liveActionPlayer.value;

  if (!player) {
    showToast("Add a player before adding an action.");
    return;
  }

  state.liveActions.push({
    street: currentLiveStreet(),
    player,
    type: elements.liveActionType.value,
    amount: elements.liveActionAmount.value.trim() || null
  });
  elements.liveActionAmount.value = "";
  renderLiveActions();
  renderActionShortcuts();
  renderLivePreview();
});

elements.liveActionList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-delete-live-action]");
  if (!target) {
    return;
  }

  state.liveActions.splice(Number(target.dataset.deleteLiveAction), 1);
  renderLiveActions();
  renderActionShortcuts();
  renderLivePreview();
});

elements.loadDemo.addEventListener("click", async () => {
  if (state.demoMode) {
    loadDemoExperience();
    return;
  }

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
  if (state.demoMode) {
    await exitDemo();
    showToast("Exited demo mode.");
    return;
  }

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

for (const control of elements.bankrollFilterControls) {
  control.addEventListener("change", () => {
    state.bankrollFilters[control.dataset.bankrollFilter] = control.value;
    renderBankrollFilters();
    renderHomePeriodControls();
    renderMetrics();
    renderBankrollCharts();
    renderSessions();
  });
}

elements.bankrollResetFilters.addEventListener("click", () => {
  state.bankrollFilters = { ...emptyBankrollFilters };
  renderBankrollFilters();
  renderHomePeriodControls();
  renderMetrics();
  renderBankrollCharts();
  renderSessions();
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

  const decisionTarget = event.target.closest("[data-select-decision]");
  if (decisionTarget) {
    state.selectedDecisionId = decisionTarget.dataset.selectDecision;
    renderHandDetail();
    return;
  }

  const decisionReviewTarget = event.target.closest("[data-save-decision], [data-mark-decision-reviewed], [data-clear-decision-reviewed]");
  if (decisionReviewTarget) {
    const hand = state.hands.find((item) => item.id === state.selectedHandId);
    const decisionId = elements.handDetail.querySelector("[data-current-decision]")?.dataset.currentDecision;
    if (!hand || !decisionId) {
      return;
    }

    const checklist = {};
    for (const input of elements.handDetail.querySelectorAll("[data-decision-checklist]")) {
      checklist[input.dataset.decisionChecklist] = input.value;
    }
    const reviewed = decisionReviewTarget.matches("[data-mark-decision-reviewed]")
      ? true
      : decisionReviewTarget.matches("[data-clear-decision-reviewed]")
        ? false
        : undefined;

    try {
      const payload = await api(`/api/hands/${encodeURIComponent(hand.id)}/decisions/${encodeURIComponent(decisionId)}`, {
        method: "PATCH",
        body: {
          note: elements.handDetail.querySelector("[data-decision-note]")?.value ?? "",
          checklist,
          ...(reviewed === undefined ? {} : { reviewed })
        }
      });
      state.hands = state.hands.map((item) => item.id === payload.hand.id ? payload.hand : item);
      state.decisionReportForHandId = hand.id;
      state.decisionReport = payload.report;
      state.selectedDecisionId = decisionId;
      await loadStudyPlan();
      renderHandDetail();
      showToast(reviewed === true ? "Decision marked reviewed." : "Decision review saved.");
    } catch (error) {
      showToast(error.message);
    }
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

elements.studyPlan.addEventListener("click", (event) => {
  const target = event.target.closest("[data-study-plan-hand]");
  if (!target || !target.dataset.studyPlanHand) {
    return;
  }

  setView("hands");
  selectHand(target.dataset.studyPlanHand).catch((error) => showToast(error.message));
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

elements.bankrollImportFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const rawText = await readSelectedFile(file);
    elements.bankrollImportForm.elements.rawText.value = rawText;
    state.bankrollImportPreview = null;
    renderBankrollImportPreview();
    elements.bankrollImportStatus.textContent = `${file.name} loaded.`;
  } catch (error) {
    showToast(error.message);
  }
});

elements.clearBankrollImport.addEventListener("click", () => {
  elements.bankrollImportForm.elements.rawText.value = "";
  elements.bankrollImportFile.value = "";
  elements.bankrollImportStatus.textContent = "";
  state.bankrollImportPreview = null;
  renderBankrollImportPreview();
});

elements.previewBankrollImport.addEventListener("click", async () => {
  const rawText = elements.bankrollImportForm.elements.rawText.value;

  try {
    elements.bankrollImportStatus.textContent = "Building preview...";
    const payload = await api("/api/bankroll/imports/preview", {
      method: "POST",
      body: {
        rawText,
        source: "bankroll-csv"
      }
    });
    state.bankrollImportPreview = payload;
    renderBankrollImportPreview(payload);
    elements.bankrollImportStatus.textContent = bankrollPreviewSummary(payload);
  } catch (error) {
    elements.bankrollImportStatus.textContent = error.message;
    showToast(error.message);
  }
});

elements.bankrollImportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    elements.bankrollImportStatus.textContent = "Importing sessions...";
    const payload = await api("/api/bankroll/imports", {
      method: "POST",
      body: {
        rawText: form.get("rawText"),
        source: "bankroll-csv"
      }
    });
    state.selectedSessionId = payload.sessions?.[0]?.id ?? state.selectedSessionId;
    state.bankrollImportPreview = payload;
    await refresh();
    renderBankrollImportPreview(payload);
    elements.bankrollImportStatus.textContent = bankrollImportSummary(payload);
    showToast(bankrollImportSummary(payload));
  } catch (error) {
    elements.bankrollImportStatus.textContent = error.message;
    showToast(error.message);
  }
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

elements.transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const editingTransactionId = elements.transactionForm.dataset.editingTransactionId;

  try {
    const payload = await api(
      editingTransactionId
        ? `/api/bankroll/transactions/${encodeURIComponent(editingTransactionId)}`
        : "/api/bankroll/transactions",
      {
        method: editingTransactionId ? "PATCH" : "POST",
        body: {
          date: form.get("date"),
          type: form.get("type"),
          amount: form.get("amount"),
          bankrollName: form.get("bankrollName"),
          note: form.get("note")
        }
      }
    );
    await refresh();
    fillTransactionForm(transactionById(payload.transaction.id) ?? payload.transaction);
    showToast(`${editingTransactionId ? "Saved" : "Added"} ${formatCurrency(payload.transaction.amount, { signed: true })} transaction.`);
  } catch (error) {
    showToast(error.message);
  }
});

elements.transactionCancel.addEventListener("click", resetTransactionForm);

elements.transactionList.addEventListener("click", async (event) => {
  const deleteTarget = event.target.closest("[data-delete-bankroll-transaction]");
  if (deleteTarget) {
    if (!window.confirm("Delete this bankroll transaction?")) {
      return;
    }

    try {
      const payload = await api(`/api/bankroll/transactions/${encodeURIComponent(deleteTarget.dataset.deleteBankrollTransaction)}`, {
        method: "DELETE"
      });
      await refresh();
      resetTransactionForm();
      showToast(`Deleted ${formatCurrency(payload.transaction.amount, { signed: true })} transaction.`);
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const editTarget = event.target.closest("[data-edit-bankroll-transaction]");
  if (editTarget) {
    const transaction = transactionById(editTarget.dataset.editBankrollTransaction);
    if (transaction) {
      fillTransactionForm(transaction);
    }
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
  syncLiveSeatDraftsFromDom();
  syncLiveShowdownDraftsFromDom();

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
        forcedBets: liveForcedBets(),
        revealedHands: revealedHandsFromLiveForm(),
        actions: state.liveActions,
        notes: form.get("notes")
      }
    });

    state.liveActions = [];
    state.liveShowdownDrafts = {};
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
      await Promise.all([
        loadSimilarHands(payload.hand.id),
        loadDecisionReview(payload.hand.id)
      ]);
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
  state.demoMode = false;
  auth.signIn().catch((error) => showToast(error.message));
});

elements.signOut.addEventListener("click", () => {
  auth.signOut();
  state.demoMode = false;
  state.showLanding = true;
  clearDashboardData();
  render();
});

async function boot() {
  if (elements.bankrollForm?.elements.date) {
    elements.bankrollForm.elements.date.value = new Date().toISOString().slice(0, 10);
  }
  if (elements.transactionForm?.elements.date) {
    resetTransactionForm();
  }

  try {
    await auth.finishRedirect();
  } catch (error) {
    showToast(error.message);
  }

  state.showLanding = auth.enabled
    ? !auth.isSignedIn()
    : window.localStorage.getItem(onboardingStorageKey) !== "true";

  if (!state.showLanding && canUsePrivateApi()) {
    await refresh();
    return;
  }

  clearDashboardData();
  render();
}

boot().catch((error) => showToast(error.message));
