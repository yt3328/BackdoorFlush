import { createAuthClient } from "./auth.js";

const appVersion = "2.6.0";
const shareHashPrefix = "#review-share=";
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
  review: "Review",
  sessions: "Sessions",
  hands: "Hands",
  live: "Live Hand",
  equity: "Equity",
  imports: "Imports",
  shared: "Shared Review"
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
  "live-hand",
  "sizing",
  "range",
  "missed-value",
  "thin-value",
  "overbluff",
  "position"
];
const onboardingStorageKey = "backdoor-flush.onboarding-entered";
const onboardingPanelStorageKey = "backdoor-flush.onboarding-panel-dismissed";
const backupExportStorageKey = "backdoor-flush.backup-exported";
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
  stakes: "",
  reviewStatus: ""
};

const emptySessionDetailFilters = {
  tag: "",
  reviewed: "",
  position: "",
  result: "",
  potSize: "",
  sort: "swing"
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
  workspaceRestorePreview: null,
  workspaceError: null,
  onboardingDismissed: readStorageFlag(onboardingPanelStorageKey),
  backupExported: readStorageFlag(backupExportStorageKey),
  sharedReview: null,
  sessionShareOptions: {
    hideAmounts: true,
    hideLocation: true,
    anonymizePlayers: true,
    includeNotes: false
  },
  bankrollFilters: { ...emptyBankrollFilters },
  sessionDetailFilters: { ...emptySessionDetailFilters },
  homePeriod: "30d",
  players: [],
  leaks: [],
  reviewSpots: [],
  reviewFilters: {
    reviewed: "false",
    sort: "priority"
  },
  reviewSession: {
    active: false,
    queueIds: [],
    cursor: 0,
    batchSize: 5,
    startedAt: null
  },
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
  demoMode: false,
  lastSyncedAt: null,
  lastSavedAt: null,
  lastSaveMessage: ""
};

const apiBase = window.POKER_FELT_SCOPE_API_BASE ?? "";
const auth = createAuthClient(window.POKER_FELT_SCOPE_AUTH);

const elements = {
  landing: document.querySelector("#landing-page"),
  appShell: document.querySelector("#app-shell"),
  title: document.querySelector("#page-title"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  views: [...document.querySelectorAll(".view")],
  sharedReview: document.querySelector("#shared-review"),
  authStatus: document.querySelector("#auth-status"),
  signIn: document.querySelector("#sign-in"),
  signOut: document.querySelector("#sign-out"),
  authNotice: document.querySelector("#auth-notice"),
  demoBanner: document.querySelector("#demo-banner"),
  workspaceHealth: document.querySelector("#workspace-health"),
  workspaceAlert: document.querySelector("#workspace-alert"),
  onboardingPanel: document.querySelector("#onboarding-panel"),
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
  reviewWorkflowStatus: document.querySelector("#review-workflow-status"),
  reviewWorkflowSort: document.querySelector("#review-workflow-sort"),
  reviewBatchSize: document.querySelector("#review-batch-size"),
  reviewStartSession: document.querySelector("#review-start-session"),
  reviewClearSession: document.querySelector("#review-clear-session"),
  reviewSessionSummary: document.querySelector("#review-session-summary"),
  reviewProgress: document.querySelector("#review-progress"),
  reviewFlowList: document.querySelector("#review-flow-list"),
  reviewHandNav: document.querySelector("#review-hand-nav"),
  reviewHandDetail: document.querySelector("#review-hand-detail"),
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
  bankrollFilterSummaries: [...document.querySelectorAll("[data-bankroll-filter-summary]")],
  bankrollResetFilters: [...document.querySelectorAll("[data-bankroll-reset-filters]")],
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
  workspaceRestoreForm: document.querySelector("#workspace-restore-form"),
  workspaceRestoreFile: document.querySelector("#workspace-restore-file"),
  previewWorkspaceRestore: document.querySelector("#preview-workspace-restore"),
  workspaceRestorePreview: document.querySelector("#workspace-restore-preview"),
  workspaceRestoreStatus: document.querySelector("#workspace-restore-status"),
  clearWorkspaceRestore: document.querySelector("#clear-workspace-restore"),
  transactionForm: document.querySelector("#bankroll-transaction-form"),
  transactionFormTitle: document.querySelector("#bankroll-transaction-form-title"),
  transactionSubmit: document.querySelector("#bankroll-transaction-submit"),
  transactionCancel: document.querySelector("#bankroll-transaction-cancel"),
  transactionSummary: document.querySelector("#transaction-summary"),
  transactionList: document.querySelector("#transaction-list"),
  sessionList: document.querySelector("#session-list"),
  sessionSummary: document.querySelector("#session-summary"),
  sessionDetail: document.querySelector("#session-detail"),
  exportSessionsCsv: document.querySelector("#export-sessions-csv"),
  exportTransactionsCsv: document.querySelector("#export-transactions-csv"),
  exportWorkspaceJson: document.querySelector("#export-workspace-json"),
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

function readStorageFlag(key) {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeStorageFlag(key, value) {
  try {
    if (value) {
      window.localStorage.setItem(key, "true");
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Local storage can be unavailable in strict browser privacy modes.
  }
}

function friendlyApiError(error) {
  const rawMessage = String(error?.message ?? error ?? "Request failed.");

  if (/failed to fetch|load failed|networkerror|could not reach/i.test(rawMessage)) {
    return {
      title: "Could not reach the workspace API",
      message: "Your current screen was left untouched. Check the connection, then refresh the workspace.",
      detail: "If this keeps happening on the live site, the API Gateway or CloudFront configuration may need attention."
    };
  }

  if (/unauthorized|forbidden|401|403|sign in/i.test(rawMessage)) {
    return {
      title: "Sign in again to keep saving",
      message: "Your account session may have expired. Sign in again, then retry the action.",
      detail: rawMessage
    };
  }

  return {
    title: "Workspace action failed",
    message: "Backdoor Flush could not finish the last request. Your saved data was not cleared.",
    detail: rawMessage
  };
}

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

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new Error("Could not reach the Backdoor Flush API. Check your connection, then try Refresh.");
  }

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

function workspaceModeMeta() {
  const signedIn = auth.isSignedIn();

  if (state.sharedReview) {
    return {
      mode: "shared",
      topbarLabel: "Shared review",
      title: "Shared review",
      badge: "Read-only",
      detail: "This is a read-only session review link. It does not load or change account data.",
      saveTarget: "Shared review is read-only.",
      saveToast: "Shared review is read-only."
    };
  }

  if (state.demoMode) {
    return {
      mode: "demo",
      topbarLabel: "Demo mode",
      title: "Demo workspace",
      badge: "Temporary",
      detail: "Demo data is memory-only and resets when the page refreshes or you exit demo mode.",
      saveTarget: "Changes are temporary in demo mode.",
      saveToast: "Saved in the temporary demo."
    };
  }

  if (auth.enabled) {
    if (signedIn) {
      return {
        mode: "cloud",
        topbarLabel: auth.displayName(),
        title: "Cloud workspace",
        badge: "Saved to account",
        detail: "Imports, bankroll sessions, live hands, and reviews are stored under your signed-in account.",
        saveTarget: "Saved to your account.",
        saveToast: "Saved to your account."
      };
    }

    return {
      mode: "signed-out",
      topbarLabel: "Signed out",
      title: "Signed out",
      badge: "Sign in needed",
      detail: "Sign in before adding real sessions or hands so your work is tied to your account.",
      saveTarget: "Sign in before saving.",
      saveToast: "Sign in before saving."
    };
  }

  return {
    mode: "local",
    topbarLabel: "Local mode",
    title: "Local workspace",
    badge: "Saved on this computer",
    detail: "Local data is saved in this project workspace on this computer.",
    saveTarget: "Saved on this computer.",
    saveToast: "Saved on this computer."
  };
}

function markWorkspaceSaved(message = "Workspace updated") {
  state.lastSavedAt = new Date().toISOString();
  state.lastSaveMessage = message;
  state.workspaceError = null;
  renderWorkspaceHealth();
  renderWorkspaceAlert();
  renderOnboardingPanel();

  return `${message}. ${workspaceModeMeta().saveToast}`;
}

function clearDashboardData() {
  state.hands = [];
  state.imports = [];
  state.bankrollSessions = [];
  state.bankrollSummary = emptyBankrollSummary;
  state.bankrollTransactions = [];
  state.bankrollTransactionSummary = emptyTransactionSummary;
  state.bankrollImportPreview = null;
  state.workspaceRestorePreview = null;
  state.workspaceError = null;
  state.bankrollFilters = { ...emptyBankrollFilters };
  state.sessionDetailFilters = { ...emptySessionDetailFilters };
  state.players = [];
  state.leaks = [];
  state.reviewSpots = [];
  state.reviewFilters = {
    reviewed: "false",
    sort: "priority"
  };
  state.reviewSession = {
    active: false,
    queueIds: [],
    cursor: 0,
    batchSize: 5,
    startedAt: null
  };
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
  state.lastSyncedAt = null;
  state.lastSavedAt = null;
  state.lastSaveMessage = "";
}

function renderAuthState() {
  const signedIn = auth.isSignedIn();
  const needsSignIn = auth.enabled && !signedIn && !state.demoMode && !state.sharedReview && !state.showLanding;
  const mode = workspaceModeMeta();

  elements.landing.hidden = !state.showLanding;
  elements.appShell.hidden = state.showLanding;

  elements.authStatus.textContent = mode.topbarLabel;
  elements.authStatus.dataset.mode = mode.mode;
  elements.signIn.hidden = !auth.enabled || signedIn || state.demoMode || Boolean(state.sharedReview);
  elements.signOut.hidden = !auth.enabled || !signedIn || state.demoMode || Boolean(state.sharedReview);
  elements.authNotice.hidden = !needsSignIn;
  elements.demoBanner.hidden = !state.demoMode;
  elements.loadDemo.textContent = state.demoMode ? "Reload Demo" : "Explore Demo";
  elements.clearSession.textContent = state.demoMode ? "Exit Demo" : "Clear Hands";
  elements.refresh.disabled = needsSignIn || state.demoMode || Boolean(state.sharedReview);
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

function clientReviewSpot(hand) {
  const pot = trackedPot(hand);
  const result = estimatedHeroResult(hand);
  const tags = handTags(hand);
  const priority = Math.abs(result) * 2 + pot * 0.35 + (hand.reviewedAt ? -8 : 12) + tags.length * 2;

  return {
    id: hand.id,
    sessionId: hand.sessionId,
    handNumber: hand.handNumber,
    tableName: hand.tableName,
    reasons: demoReviewReasons(hand),
    estimatedHeroResult: result,
    trackedPot: pot,
    heroCards: hand.hero ? hand.holeCards[hand.hero] ?? [] : [],
    board: hand.board ?? [],
    tags,
    reviewedAt: hand.reviewedAt,
    importedAt: hand.importedAt ?? hand.createdAt ?? null,
    priority,
    score: priority
  };
}

function compareReviewSpots(a, b, sort = "priority") {
  if (sort === "biggest-loss") {
    return a.estimatedHeroResult - b.estimatedHeroResult;
  }

  if (sort === "biggest-win") {
    return b.estimatedHeroResult - a.estimatedHeroResult;
  }

  if (sort === "biggest-pot") {
    return (b.trackedPot ?? 0) - (a.trackedPot ?? 0);
  }

  if (sort === "newest") {
    return String(b.importedAt ?? "").localeCompare(String(a.importedAt ?? ""));
  }

  return (b.score ?? b.priority ?? 0) - (a.score ?? a.priority ?? 0) || Math.abs(b.estimatedHeroResult) - Math.abs(a.estimatedHeroResult);
}

function demoReviewSpots(hands, filters = state.reviewFilters) {
  let spots = hands.map(clientReviewSpot);

  if (filters.reviewed === "true") {
    spots = spots.filter((spot) => Boolean(spot.reviewedAt));
  } else if (filters.reviewed === "false") {
    spots = spots.filter((spot) => !spot.reviewedAt);
  }

  return spots.sort((a, b) => compareReviewSpots(a, b, filters.sort));
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
    const id = `${hand.id}-decision-${decisionIndex + 1}`;
    const savedReview = hand.decisionReviews?.[id] ?? {};

    return {
      id,
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
      note: savedReview.note ?? "",
      checklist: savedReview.checklist ?? {},
      reviewedAt: savedReview.reviewedAt ?? null,
      updatedAt: savedReview.updatedAt ?? null
    };
  });

  return {
    summary: {
      decisionCount: decisions.length,
      reviewedCount: decisions.filter((decision) => decision.reviewedAt).length,
      openCount: decisions.filter((decision) => !decision.reviewedAt).length,
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

  clearShareHash();
  clearDashboardData();
  state.sharedReview = null;
  state.demoMode = true;
  state.workspaceError = null;
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
  state.lastSyncedAt = new Date().toISOString();
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
  state.sharedReview = null;
  state.workspaceError = null;
  clearShareHash();

  if (auth.enabled && !auth.isSignedIn()) {
    await auth.signIn();
    return;
  }

  state.showLanding = false;
  window.localStorage.setItem(onboardingStorageKey, "true");
  await refresh({ quiet: true });
  if (targetView === "review") {
    await openReviewView();
  } else {
    setView(targetView);
  }
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
    const id = sessionId(session);
    const linkedHands = handsForSession(id);
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

    if (state.bankrollFilters.reviewStatus === "open" && !linkedHands.some((hand) => !hand.reviewedAt)) {
      return false;
    }
    if (state.bankrollFilters.reviewStatus === "reviewed" && (linkedHands.length === 0 || linkedHands.some((hand) => !hand.reviewedAt))) {
      return false;
    }
    if (state.bankrollFilters.reviewStatus === "linked" && linkedHands.length === 0) {
      return false;
    }
    if (state.bankrollFilters.reviewStatus === "unlinked" && linkedHands.length > 0) {
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
  const controls = elements.bankrollFilterControls.filter((item) => item.dataset.bankrollFilter === name);
  if (controls.length === 0) {
    return;
  }

  if (state.bankrollFilters[name] && !values.includes(state.bankrollFilters[name])) {
    state.bankrollFilters[name] = "";
  }

  for (const control of controls) {
    control.innerHTML = [
      `<option value="">${escapeHtml(label)}</option>`,
      ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    ].join("");
    control.value = state.bankrollFilters[name];
  }
}

function bankrollViewParts() {
  const parts = [homePeriodOption().label];
  const manualRange = normalizedManualDateRange();
  const reviewStatusLabels = {
    open: "has open reviews",
    reviewed: "all linked hands reviewed",
    linked: "has linked hands",
    unlinked: "no linked hands"
  };

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

  if (state.bankrollFilters.reviewStatus) {
    parts.push(reviewStatusLabels[state.bankrollFilters.reviewStatus] ?? state.bankrollFilters.reviewStatus);
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

  if (!["", "open", "reviewed", "linked", "unlinked"].includes(state.bankrollFilters.reviewStatus)) {
    state.bankrollFilters.reviewStatus = "";
  }

  for (const control of elements.bankrollFilterControls) {
    if (control.tagName === "SELECT") {
      control.value = state.bankrollFilters[control.dataset.bankrollFilter] ?? "";
      continue;
    }
    control.value = state.bankrollFilters[control.dataset.bankrollFilter] ?? "";
  }

  const filteredSessions = filteredBankrollSessions();
  const parts = bankrollViewParts();

  const summaryText = parts.length
    ? `${filteredSessions.length} of ${state.bankrollSessions.length} sessions shown / ${parts.join(" / ")}`
    : `${state.bankrollSessions.length} sessions shown`;

  for (const summary of elements.bankrollFilterSummaries) {
    summary.textContent = summaryText;
  }
}

function renderExportControls() {
  const hasAnyData = state.imports.length > 0 ||
    state.hands.length > 0 ||
    state.bankrollSessions.length > 0 ||
    state.bankrollTransactions.length > 0;

  elements.exportSessionsCsv.disabled = filteredBankrollSessions().length === 0;
  elements.exportTransactionsCsv.disabled = state.bankrollTransactions.length === 0;
  elements.exportWorkspaceJson.disabled = !hasAnyData;
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

function sessionPotSizeBucket(hand, session) {
  const pot = trackedPot(hand);
  const bigBlind = finiteNumber(session?.bigBlind, parseBigBlind(session?.stakes));
  const potBb = bigBlind > 0 ? pot / bigBlind : pot;

  if (potBb >= 100) {
    return "large";
  }

  if (potBb >= 30) {
    return "medium";
  }

  return "small";
}

function sessionPotSizeLabel(bucket) {
  return {
    small: "Small pot",
    medium: "Medium pot",
    large: "Large pot"
  }[bucket] ?? "Any pot";
}

function sessionHandFilterValues(hands, getter) {
  return [...new Set(hands.map(getter).filter(Boolean))]
    .sort((a, b) => {
      const aIndex = positionOrder.includes(a) ? positionOrder.indexOf(a) : positionOrder.length;
      const bIndex = positionOrder.includes(b) ? positionOrder.indexOf(b) : positionOrder.length;
      return aIndex - bIndex || String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });
}

function filterSessionHands(hands, session) {
  const filters = state.sessionDetailFilters;
  let filtered = [...hands];

  if (filters.tag) {
    filtered = filtered.filter((hand) => handTags(hand).includes(filters.tag));
  }

  if (filters.reviewed === "true") {
    filtered = filtered.filter((hand) => Boolean(hand.reviewedAt));
  } else if (filters.reviewed === "false") {
    filtered = filtered.filter((hand) => !hand.reviewedAt);
  }

  if (filters.position) {
    filtered = filtered.filter((hand) => heroPosition(hand) === filters.position);
  }

  if (filters.result) {
    filtered = filtered.filter((hand) => resultBucket(hand) === filters.result);
  }

  if (filters.potSize) {
    filtered = filtered.filter((hand) => sessionPotSizeBucket(hand, session) === filters.potSize);
  }

  filtered.sort((a, b) => {
    if (filters.sort === "biggest-loss") {
      return estimatedHeroResult(a) - estimatedHeroResult(b);
    }

    if (filters.sort === "biggest-win") {
      return estimatedHeroResult(b) - estimatedHeroResult(a);
    }

    if (filters.sort === "biggest-pot") {
      return trackedPot(b) - trackedPot(a);
    }

    if (filters.sort === "newest") {
      return handDateValue(b) - handDateValue(a);
    }

    if (filters.sort === "open-first") {
      return Number(Boolean(a.reviewedAt)) - Number(Boolean(b.reviewedAt)) || Math.abs(estimatedHeroResult(b)) - Math.abs(estimatedHeroResult(a));
    }

    return Math.abs(estimatedHeroResult(b)) - Math.abs(estimatedHeroResult(a));
  });

  return filtered;
}

function sessionHandStats(hands = []) {
  const openHands = hands.filter((hand) => !hand.reviewedAt).length;
  const taggedHands = hands.filter((hand) => handTags(hand).length > 0).length;
  const totalResult = hands.reduce((sum, hand) => sum + estimatedHeroResult(hand), 0);
  const biggestPot = hands.reduce((max, hand) => Math.max(max, trackedPot(hand)), 0);

  return {
    handCount: hands.length,
    openHands,
    reviewedHands: hands.length - openHands,
    taggedHands,
    totalResult: roundNumber(totalResult),
    biggestPot: roundNumber(biggestPot)
  };
}

function compareSessionReviewSpots(a, b, sort = "swing") {
  if (sort === "open-first") {
    return Number(Boolean(a.reviewedAt)) - Number(Boolean(b.reviewedAt)) || compareSessionReviewSpots(a, b, "swing");
  }

  if (sort === "swing") {
    return Math.abs(b.estimatedHeroResult) - Math.abs(a.estimatedHeroResult) || (b.trackedPot ?? 0) - (a.trackedPot ?? 0);
  }

  if (["biggest-loss", "biggest-win", "biggest-pot", "newest"].includes(sort)) {
    return compareReviewSpots(a, b, sort);
  }

  return compareReviewSpots(a, b, "priority");
}

function sessionReviewQueue(hands = [], sort = state.sessionDetailFilters.sort) {
  return hands
    .filter((hand) => !hand.reviewedAt || handTags(hand).length > 0 || Math.abs(estimatedHeroResult(hand)) > 0)
    .map(clientReviewSpot)
    .sort((a, b) => compareSessionReviewSpots(a, b, sort));
}

function sessionHandFilterSummary(filteredHands, allHands) {
  const parts = [];
  const filters = state.sessionDetailFilters;

  if (filters.tag) {
    parts.push(tagLabel(filters.tag));
  }
  if (filters.reviewed === "true") {
    parts.push("reviewed");
  } else if (filters.reviewed === "false") {
    parts.push("open");
  }
  if (filters.position) {
    parts.push(filters.position);
  }
  if (filters.result) {
    parts.push(filters.result);
  }
  if (filters.potSize) {
    parts.push(sessionPotSizeLabel(filters.potSize).toLowerCase());
  }

  return parts.length
    ? `${filteredHands.length} of ${allHands.length} linked hands shown / ${parts.join(" / ")}`
    : `${allHands.length} linked hands shown`;
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

function exportDateToken() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function slugPart(value, fallback = "export") {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || fallback;
}

function csvCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) ? value.join("; ") : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function markdownCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownTable(headers, rows) {
  if (rows.length === 0) {
    return "";
  }

  return [
    `| ${headers.map(markdownCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function downloadTextFile({ filename, text, mimeType }) {
  const blob = new Blob([text], {
    type: mimeType
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cardsText(cards = []) {
  return Array.isArray(cards) ? cards.filter(Boolean).join(" ") : "";
}

function sessionExportRows(sessions) {
  const headers = [
    "Session ID",
    "Date",
    "Location",
    "Game Type",
    "Stakes",
    "Table Size",
    "Hours",
    "Buy In",
    "Cash Out",
    "Profit",
    "Big Blind",
    "BB Won",
    "Hourly Rate",
    "BB Per Hour",
    "Linked Hands",
    "Open Reviews",
    "Reviewed Hands",
    "Linked Imports",
    "Notes"
  ];

  return [
    headers,
    ...sessions.map((session) => {
      const id = sessionId(session);
      const linkedHands = handsForSession(id);
      const stats = sessionHandStats(linkedHands);

      return [
        id,
        bankrollSessionDate(session),
        session.location,
        session.gameType,
        session.stakes,
        session.tableSize,
        session.hours,
        session.buyIn,
        session.cashOut,
        session.profit,
        session.bigBlind,
        session.bbWon ?? bankrollSessionBbWon(session),
        session.hourlyRate,
        session.bbPerHour,
        linkedHands.length,
        stats.openHands,
        stats.reviewedHands,
        importsForSession(id).map((item) => item.name),
        session.notes
      ];
    })
  ];
}

function transactionExportRows(transactions) {
  return [
    ["Transaction ID", "Date", "Type", "Amount", "Bankroll", "Note", "Created At", "Updated At"],
    ...transactions.map((transaction) => [
      transactionId(transaction),
      transaction.date,
      transaction.type,
      transaction.amount,
      transaction.bankrollName ?? "Default",
      transaction.note,
      transaction.createdAt,
      transaction.updatedAt
    ])
  ];
}

function handExportRows(hands, session) {
  return [
    [
      "Hand ID",
      "Hand Number",
      "Table",
      "Source",
      "Hero",
      "Hero Position",
      "Hero Cards",
      "Board",
      "Result",
      "Pot",
      "Pot Size",
      "Reviewed",
      "Tags",
      "Imported At",
      "Notes"
    ],
    ...hands.map((hand) => [
      hand.id,
      hand.handNumber,
      hand.tableName,
      hand.source,
      hand.hero,
      heroPosition(hand),
      hand.hero ? cardsText(hand.holeCards[hand.hero] ?? []) : "",
      cardsText(hand.board ?? []),
      estimatedHeroResult(hand),
      trackedPot(hand),
      sessionPotSizeLabel(sessionPotSizeBucket(hand, session)),
      hand.reviewedAt ? "yes" : "no",
      handTags(hand),
      hand.importedAt ?? hand.createdAt,
      hand.notes
    ])
  ];
}

function clientWorkspaceBackup() {
  return {
    app: "Backdoor Flush",
    schemaVersion: appVersion,
    exportedAt: new Date().toISOString(),
    mode: workspaceModeMeta().mode,
    counts: {
      imports: state.imports.length,
      hands: state.hands.length,
      bankrollSessions: state.bankrollSessions.length,
      bankrollTransactions: state.bankrollTransactions.length
    },
    filters: {
      homePeriod: state.homePeriod,
      bankroll: { ...state.bankrollFilters },
      sessionDetail: { ...state.sessionDetailFilters },
      review: { ...state.reviewFilters }
    },
    summaries: {
      bankroll: state.bankrollSummary,
      visibleBankroll: currentBankrollSummary(),
      transactions: state.bankrollTransactionSummary
    },
    imports: state.imports,
    hands: state.hands,
    bankrollSessions: state.bankrollSessions,
    bankrollTransactions: state.bankrollTransactions,
    reviewSpots: state.reviewSpots,
    studyTags: state.studyTags,
    studyPlan: state.studyPlan
  };
}

async function workspaceBackupPayload() {
  if (state.demoMode || !canUsePrivateApi()) {
    return clientWorkspaceBackup();
  }

  return api("/api/export/workspace");
}

function exportSessionsCsv() {
  const sessions = filteredBankrollSessions();
  if (sessions.length === 0) {
    showToast("No sessions in this view to export.");
    return;
  }

  downloadTextFile({
    filename: `backdoor-flush-sessions-${exportDateToken()}.csv`,
    text: rowsToCsv(sessionExportRows(sessions)),
    mimeType: "text/csv;charset=utf-8"
  });
  showToast(`Exported ${sessions.length} sessions.`);
}

function exportTransactionsCsv() {
  if (state.bankrollTransactions.length === 0) {
    showToast("No bankroll transactions to export.");
    return;
  }

  downloadTextFile({
    filename: `backdoor-flush-transactions-${exportDateToken()}.csv`,
    text: rowsToCsv(transactionExportRows(state.bankrollTransactions)),
    mimeType: "text/csv;charset=utf-8"
  });
  showToast(`Exported ${state.bankrollTransactions.length} transactions.`);
}

async function exportWorkspaceJson() {
  const payload = await workspaceBackupPayload();
  const counts = payload.counts ?? {};
  const totalRecords = (counts.imports ?? 0) +
    (counts.hands ?? 0) +
    (counts.bankrollSessions ?? 0) +
    (counts.bankrollTransactions ?? 0);

  if (totalRecords === 0) {
    showToast("No workspace data to export yet.");
    return;
  }

  downloadTextFile({
    filename: `backdoor-flush-backup-${exportDateToken()}.json`,
    text: `${JSON.stringify(payload, null, 2)}\n`,
    mimeType: "application/json;charset=utf-8"
  });
  state.backupExported = true;
  writeStorageFlag(backupExportStorageKey, true);
  renderOnboardingPanel();
  showToast("Workspace backup exported.");
}

function exportSessionHandsCsv(sessionIdValue = state.selectedSessionId) {
  const session = sessionById(sessionIdValue);
  if (!session) {
    showToast("Select a session first.");
    return;
  }

  const hands = filterSessionHands(handsForSession(sessionIdValue), session);
  if (hands.length === 0) {
    showToast("No linked hands match the current session filters.");
    return;
  }

  downloadTextFile({
    filename: `backdoor-flush-${slugPart(sessionLabel(session), "session")}-hands-${exportDateToken()}.csv`,
    text: rowsToCsv(handExportRows(hands, session)),
    mimeType: "text/csv;charset=utf-8"
  });
  showToast(`Exported ${hands.length} linked hands.`);
}

function sessionReviewMarkdown(session) {
  const id = sessionId(session);
  const linkedImports = importsForSession(id);
  const linkedHands = handsForSession(id);
  const filteredHands = filterSessionHands(linkedHands, session);
  const allStats = sessionHandStats(linkedHands);
  const filteredStats = sessionHandStats(filteredHands);
  const queue = sessionReviewQueue(filteredHands);
  const estimatedResult = linkedHands.reduce((sum, hand) => sum + estimatedHeroResult(hand), 0);
  const gap = session.profit - estimatedResult;
  const tagRows = demoTagSummary(filteredHands).map((row) => [
    tagLabel(row.tag),
    row.handCount,
    `${formatNumber(row.reviewedPct, 1)}%`,
    formatCurrency(row.totalResult, { signed: true })
  ]);
  const biggestRows = [...filteredHands]
    .sort((a, b) => Math.abs(estimatedHeroResult(b)) - Math.abs(estimatedHeroResult(a)))
    .slice(0, 8)
    .map((hand) => [
      hand.handNumber,
      heroPosition(hand),
      hand.hero ? cardsText(hand.holeCards[hand.hero] ?? []) : "",
      cardsText(hand.board ?? []),
      formatCurrency(estimatedHeroResult(hand), { signed: true }),
      formatCurrency(trackedPot(hand)),
      handTags(hand).map(tagLabel).join(", "),
      hand.reviewedAt ? "Reviewed" : "Open"
    ]);
  const importRows = linkedImports.map((item) => [
    item.name,
    item.source,
    item.status ?? "ready",
    item.handCount,
    item.importedAt
  ]);
  const queueRows = queue.map((spot) => [
    spot.handNumber,
    spot.reasons.join(", "),
    formatCurrency(spot.estimatedHeroResult, { signed: true }),
    spot.reviewedAt ? "Reviewed" : "Open"
  ]);
  const handRows = filteredHands.map((hand) => [
    hand.handNumber,
    heroPosition(hand),
    hand.hero ? cardsText(hand.holeCards[hand.hero] ?? []) : "",
    cardsText(hand.board ?? []),
    formatCurrency(estimatedHeroResult(hand), { signed: true }),
    formatCurrency(trackedPot(hand)),
    handTags(hand).map(tagLabel).join(", "),
    hand.reviewedAt ? "Reviewed" : "Open"
  ]);
  const lines = [
    `# ${sessionLabel(session)} Review`,
    "",
    `Generated: ${new Date().toLocaleString()}`,
    `Workspace: ${workspaceModeMeta().title}`,
    "",
    "Logged result is the bankroll record. Captured-hand estimate only sums saved or imported hands linked to this session.",
    "",
    "## Summary",
    "",
    `- Logged result: ${formatCurrency(session.profit, { signed: true })}`,
    `- Captured-hand estimate: ${formatCurrency(estimatedResult, { signed: true })}`,
    `- Uncaptured gap: ${formatCurrency(gap, { signed: true })}`,
    `- Hours: ${formatNumber(session.hours, 1)}`,
    `- Hourly rate: ${formatCurrency(session.hourlyRate, { signed: true })}/hr`,
    `- BB/hr: ${formatNumber(session.bbPerHour, 1)}`,
    `- Linked hands: ${linkedHands.length}`,
    `- Filtered hands: ${filteredHands.length}`,
    `- Open reviews: ${allStats.openHands}`,
    "",
    "## Active Filters",
    "",
    `- Session scope: ${bankrollViewParts().join(" / ")}`,
    `- Linked hand scope: ${sessionHandFilterSummary(filteredHands, linkedHands)}`,
    "",
    "## Session Audit",
    "",
    `- Linked imports: ${linkedImports.length}`,
    `- Reviewed linked hands: ${allStats.reviewedHands}/${linkedHands.length}`,
    `- Filtered captured result: ${formatCurrency(filteredStats.totalResult, { signed: true })}`,
    `- Filtered biggest pot: ${formatCurrency(filteredStats.biggestPot)}`,
    "",
    "## Tagged Themes",
    "",
    tagRows.length
      ? markdownTable(["Theme", "Hands", "Reviewed", "Captured Result"], tagRows)
      : "No tags are saved on the currently filtered hands.",
    "",
    "## Biggest Hands",
    "",
    biggestRows.length
      ? markdownTable(["Hand", "Position", "Hero Cards", "Board", "Result", "Pot", "Tags", "Status"], biggestRows)
      : "No linked hands match the current filters.",
    "",
    "## Linked Imports",
    "",
    importRows.length
      ? markdownTable(["Name", "Source", "Status", "Hands", "Imported At"], importRows)
      : "No imports are linked to this session.",
    "",
    "## Filtered Review Queue",
    "",
    queueRows.length
      ? markdownTable(["Hand", "Reasons", "Result", "Status"], queueRows)
      : "No linked hands match the current review filters.",
    "",
    "## Filtered Hands",
    "",
    handRows.length
      ? markdownTable(["Hand", "Position", "Hero Cards", "Board", "Result", "Pot", "Tags", "Status"], handRows)
      : "No linked hands match the current filters.",
    "",
    "## Session Notes",
    "",
    session.notes || "No session notes saved.",
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function exportSessionReviewReport(sessionIdValue = state.selectedSessionId) {
  const session = sessionById(sessionIdValue);
  if (!session) {
    showToast("Select a session first.");
    return;
  }

  downloadTextFile({
    filename: `backdoor-flush-${slugPart(sessionLabel(session), "session")}-review-${exportDateToken()}.md`,
    text: sessionReviewMarkdown(session),
    mimeType: "text/markdown;charset=utf-8"
  });
  showToast("Session review report exported.");
}

function visibleAmount(value, options = state.sessionShareOptions, formatOptions = {}) {
  return options.hideAmounts ? "Hidden" : formatCurrency(value, formatOptions);
}

function visibleLocation(session, options = state.sessionShareOptions) {
  return options.hideLocation ? "Hidden location" : session.location;
}

function visibleTable(hand, options = state.sessionShareOptions) {
  return options.hideLocation ? "Hidden table" : hand.tableName ?? "Table";
}

function privacySummary(options = state.sessionShareOptions) {
  const parts = [];
  if (options.hideAmounts) {
    parts.push("amounts hidden");
  }
  if (options.hideLocation) {
    parts.push("location hidden");
  }
  if (options.anonymizePlayers) {
    parts.push("player names anonymized");
  }
  if (!options.includeNotes) {
    parts.push("notes excluded");
  }

  return parts.length ? parts.join(" / ") : "full session details";
}

function sharedPlayerName(name, options, nameMap) {
  if (!options.anonymizePlayers) {
    return name;
  }

  if (!nameMap.has(name)) {
    nameMap.set(name, nameMap.size === 0 ? "Hero" : `Player ${nameMap.size}`);
  }

  return nameMap.get(name);
}

function sessionQueueExportRows(spots, session) {
  return [
    ["Hand", "Reasons", "Position", "Hero Cards", "Board", "Result", "Pot", "Tags", "Status"],
    ...spots.map((spot) => {
      const hand = handById(spot.id);

      return [
        spot.handNumber,
        spot.reasons.join("; "),
        hand ? heroPosition(hand) : "",
        cardsText(spot.heroCards),
        cardsText(spot.board),
        spot.estimatedHeroResult,
        spot.trackedPot,
        spot.tags.map(tagLabel).join("; "),
        spot.reviewedAt ? "reviewed" : "open"
      ];
    })
  ];
}

function exportSessionQueueCsv(sessionIdValue = state.selectedSessionId) {
  const session = sessionById(sessionIdValue);
  if (!session) {
    showToast("Select a session first.");
    return;
  }

  const spots = sessionReviewQueue(filterSessionHands(handsForSession(sessionIdValue), session));
  if (spots.length === 0) {
    showToast("No review queue hands match the current filters.");
    return;
  }

  downloadTextFile({
    filename: `backdoor-flush-${slugPart(sessionLabel(session), "session")}-queue-${exportDateToken()}.csv`,
    text: rowsToCsv(sessionQueueExportRows(spots, session)),
    mimeType: "text/csv;charset=utf-8"
  });
  showToast(`Exported ${spots.length} review spots.`);
}

function buildSessionSharePayload(session, options = state.sessionShareOptions) {
  const id = sessionId(session);
  const linkedHands = handsForSession(id);
  const filteredHands = filterSessionHands(linkedHands, session);
  const allStats = sessionHandStats(linkedHands);
  const filteredStats = sessionHandStats(filteredHands);
  const queue = sessionReviewQueue(filteredHands).slice(0, 20);
  const biggestHands = [...filteredHands]
    .sort((a, b) => Math.abs(estimatedHeroResult(b)) - Math.abs(estimatedHeroResult(a)))
    .slice(0, 10);
  const estimatedResult = linkedHands.reduce((sum, hand) => sum + estimatedHeroResult(hand), 0);
  const nameMap = new Map();

  return {
    app: "Backdoor Flush",
    type: "session-review-share",
    schemaVersion: appVersion,
    generatedAt: new Date().toISOString(),
    privacy: {
      ...options,
      summary: privacySummary(options)
    },
    session: {
      label: `${formatDate(session.date)} ${visibleLocation(session, options)} ${session.stakes || session.gameType}`.trim(),
      date: session.date,
      location: visibleLocation(session, options),
      gameType: session.gameType,
      stakes: session.stakes,
      hours: formatNumber(session.hours, 1),
      profit: visibleAmount(session.profit, options, { signed: true }),
      hourlyRate: visibleAmount(session.hourlyRate, options, { signed: true }),
      bbPerHour: formatNumber(session.bbPerHour, 1),
      notes: options.includeNotes ? session.notes || "" : ""
    },
    filters: {
      bankroll: bankrollViewParts(),
      linkedHands: sessionHandFilterSummary(filteredHands, linkedHands)
    },
    summary: {
      linkedHands: linkedHands.length,
      filteredHands: filteredHands.length,
      openReviews: allStats.openHands,
      reviewedHands: allStats.reviewedHands,
      taggedHands: allStats.taggedHands,
      capturedResult: visibleAmount(estimatedResult, options, { signed: true }),
      filteredCapturedResult: visibleAmount(filteredStats.totalResult, options, { signed: true }),
      uncapturedGap: visibleAmount(session.profit - estimatedResult, options, { signed: true }),
      biggestPot: visibleAmount(filteredStats.biggestPot, options)
    },
    queue: queue.map((spot) => {
      const hand = handById(spot.id);
      const heroName = hand ? sharedPlayerName(hand.hero ?? "Hero", options, nameMap) : "Hero";

      return {
        handNumber: spot.handNumber,
        tableName: hand ? visibleTable(hand, options) : "Table",
        reasons: spot.reasons,
        hero: heroName,
        position: hand ? heroPosition(hand) : "",
        heroCards: spot.heroCards,
        board: spot.board,
        result: visibleAmount(spot.estimatedHeroResult, options, { signed: true }),
        pot: visibleAmount(spot.trackedPot, options),
        tags: spot.tags.map(tagLabel),
        status: spot.reviewedAt ? "Reviewed" : "Open"
      };
    }),
    biggestHands: biggestHands.map((hand) => ({
      handNumber: hand.handNumber,
      tableName: visibleTable(hand, options),
      hero: sharedPlayerName(hand.hero ?? "Hero", options, nameMap),
      position: heroPosition(hand),
      heroCards: hand.hero ? hand.holeCards[hand.hero] ?? [] : [],
      board: hand.board ?? [],
      result: visibleAmount(estimatedHeroResult(hand), options, { signed: true }),
      pot: visibleAmount(trackedPot(hand), options),
      tags: handTags(hand).map(tagLabel),
      status: hand.reviewedAt ? "Reviewed" : "Open"
    })),
    tagThemes: demoTagSummary(filteredHands).slice(0, 8).map((row) => ({
      tag: tagLabel(row.tag),
      hands: row.handCount,
      reviewed: row.reviewedCount,
      result: visibleAmount(row.totalResult, options, { signed: true })
    }))
  };
}

function sessionCompactSummary(sessionIdValue = state.selectedSessionId) {
  const session = sessionById(sessionIdValue);
  if (!session) {
    return "";
  }

  const options = state.sessionShareOptions;
  const id = sessionId(session);
  const linkedHands = handsForSession(id);
  const filteredHands = filterSessionHands(linkedHands, session);
  const stats = sessionHandStats(filteredHands);
  const queue = sessionReviewQueue(filteredHands);
  const topTags = demoTagSummary(filteredHands).slice(0, 3).map((row) => tagLabel(row.tag));

  return [
    `${formatDate(session.date)} ${visibleLocation(session, options)} ${session.stakes || session.gameType} review`.trim(),
    `Privacy: ${privacySummary(options)}`,
    `Logged result: ${visibleAmount(session.profit, options, { signed: true })}`,
    `Linked hands: ${linkedHands.length}; filtered hands: ${filteredHands.length}; open reviews: ${stats.openHands}`,
    `Captured result in current filter: ${visibleAmount(stats.totalResult, options, { signed: true })}`,
    `Top review spots: ${queue.slice(0, 3).map((spot) => `#${spot.handNumber} (${spot.reasons.join(", ")})`).join("; ") || "none"}`,
    `Themes: ${topTags.join(", ") || "none yet"}`,
    `Filters: ${sessionHandFilterSummary(filteredHands, linkedHands)}`
  ].join("\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function encodeSharePayload(payload) {
  const text = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function decodeSharePayload(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function sharePayloadFromHash() {
  if (!window.location.hash.startsWith(shareHashPrefix)) {
    return null;
  }

  const payload = decodeSharePayload(window.location.hash.slice(shareHashPrefix.length));
  if (payload?.app !== "Backdoor Flush" || payload?.type !== "session-review-share") {
    throw new Error("This review link is not a Backdoor Flush session share.");
  }

  return payload;
}

function openSharedReviewFromHash() {
  const payload = sharePayloadFromHash();
  if (!payload) {
    return false;
  }

  state.sharedReview = payload;
  state.demoMode = false;
  state.showLanding = false;
  setView("shared");
  render();

  return true;
}

function clearShareHash() {
  if (window.location.hash.startsWith(shareHashPrefix)) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}

async function copySessionShareLink(sessionIdValue = state.selectedSessionId) {
  const session = sessionById(sessionIdValue);
  if (!session) {
    showToast("Select a session first.");
    return;
  }

  const payload = buildSessionSharePayload(session);
  const url = `${window.location.origin}${window.location.pathname}#review-share=${encodeSharePayload(payload)}`;
  await copyText(url);
  showToast(`Review link copied with ${payload.privacy.summary}.`);
}

async function copySessionSummary(sessionIdValue = state.selectedSessionId) {
  const summary = sessionCompactSummary(sessionIdValue);
  if (!summary) {
    showToast("Select a session first.");
    return;
  }

  await copyText(summary);
  showToast("Session summary copied.");
}

function reviewQueuePath() {
  const params = new URLSearchParams({
    limit: "50",
    sort: state.reviewFilters.sort || "priority"
  });
  const reviewed = state.reviewFilters.reviewed ?? "false";

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

function formatTimestamp(value) {
  if (!value) {
    return "No activity yet";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function savedHandReviewCount() {
  return state.hands.filter((hand) => (
    Boolean(hand.reviewedAt) ||
    Boolean(String(hand.notes ?? "").trim()) ||
    handTags(hand).length > 0
  )).length;
}

function decisionReviewEntries() {
  return state.hands.flatMap((hand) => (
    Object.values(hand.decisionReviews && typeof hand.decisionReviews === "object" ? hand.decisionReviews : {})
  ));
}

function savedDecisionReviewCount() {
  return decisionReviewEntries().filter((review) => (
    Boolean(review?.reviewedAt) ||
    Boolean(String(review?.note ?? "").trim()) ||
    Object.values(review?.checklist ?? {}).some((value) => String(value ?? "").trim())
  )).length;
}

function workspaceAttentionItems({ queuedImports, failedImports, unlinkedHands, openReviews }) {
  const items = [];

  if (failedImports > 0) {
    items.push(`${failedImports} failed import${failedImports === 1 ? "" : "s"}`);
  }

  if (queuedImports > 0) {
    items.push(`${queuedImports} import${queuedImports === 1 ? "" : "s"} parsing`);
  }

  if (unlinkedHands > 0 && state.bankrollSessions.length > 0) {
    items.push(`${unlinkedHands} hand${unlinkedHands === 1 ? "" : "s"} not linked to a session`);
  }

  if (openReviews > 0) {
    items.push(`${openReviews} open review${openReviews === 1 ? "" : "s"}`);
  }

  return items;
}

function renderWorkspaceHealth() {
  if (!elements.workspaceHealth) {
    return;
  }

  if (state.showLanding) {
    elements.workspaceHealth.hidden = true;
    elements.workspaceHealth.innerHTML = "";
    return;
  }

  const mode = workspaceModeMeta();
  const filteredSessions = filteredBankrollSessions();
  const linkedHands = state.hands.filter((hand) => hand.sessionId).length;
  const unlinkedHands = Math.max(0, state.hands.length - linkedHands);
  const readyImports = state.imports.filter((item) => (item.status ?? "ready") === "ready").length;
  const queuedImports = state.imports.filter((item) => item.status === "queued").length;
  const failedImports = state.imports.filter((item) => item.status === "failed").length;
  const openReviews = state.hands.filter((hand) => !hand.reviewedAt).length;
  const reviewedHands = Math.max(0, state.hands.length - openReviews);
  const reviewNotes = savedHandReviewCount();
  const decisionReviews = savedDecisionReviewCount();
  const attentionItems = workspaceAttentionItems({
    queuedImports,
    failedImports,
    unlinkedHands,
    openReviews
  });
  const lastActivity = state.lastSavedAt
    ? `${state.lastSaveMessage || "Last saved"} / ${formatTimestamp(state.lastSavedAt)}`
    : state.lastSyncedAt
      ? `Last refreshed / ${formatTimestamp(state.lastSyncedAt)}`
      : "No workspace activity yet";
  const hasRecords = state.hands.length > 0 || state.imports.length > 0 || state.bankrollSessions.length > 0 || state.bankrollTransactions.length > 0;
  const actions = state.sharedReview
    ? `
      <button class="button secondary" type="button" data-start-tracking>Open App</button>
    `
    : `
      <button class="button secondary" type="button" data-jump-view="sessions">Log Session</button>
      <button class="button secondary" type="button" data-jump-view="live">Build Hand</button>
      <button class="button secondary" type="button" data-jump-view="imports">Import</button>
      <button class="button ghost" type="button" data-export-workspace-json ${hasRecords ? "" : "disabled"}>Backup</button>
    `;

  elements.workspaceHealth.hidden = false;
  elements.workspaceHealth.className = `workspace-health ${mode.mode}`;
  elements.workspaceHealth.innerHTML = `
    <div class="workspace-health-head">
      <div>
        <p class="eyebrow">Workspace</p>
        <h3>${escapeHtml(mode.title)} <span class="mode-pill ${escapeHtml(mode.mode)}">${escapeHtml(mode.badge)}</span></h3>
        <p>${escapeHtml(mode.detail)}</p>
      </div>
      <div class="workspace-save-state">
        <span>${escapeHtml(mode.saveTarget)}</span>
        <strong>${escapeHtml(lastActivity)}</strong>
      </div>
    </div>
    <div class="workspace-health-actions" aria-label="Workspace actions">
      ${actions}
    </div>
    <div class="workspace-health-grid">
      <div>
        <span>Sessions</span>
        <strong>${filteredSessions.length}/${state.bankrollSessions.length}</strong>
        <small>${escapeHtml(bankrollViewParts().join(" / "))}</small>
      </div>
      <div>
        <span>Linked hands</span>
        <strong>${linkedHands}/${state.hands.length}</strong>
        <small>${unlinkedHands} unlinked</small>
      </div>
      <div>
        <span>Imports</span>
        <strong>${readyImports}</strong>
        <small>${queuedImports} parsing / ${failedImports} failed</small>
      </div>
      <div>
        <span>Review work</span>
        <strong>${reviewedHands}/${state.hands.length}</strong>
        <small>${reviewNotes} hand notes / ${decisionReviews} decisions</small>
      </div>
    </div>
    <p class="workspace-health-note">${escapeHtml(
      attentionItems.length
        ? `Needs attention: ${attentionItems.join(", ")}.`
        : "Data looks connected for the current workspace."
    )}</p>
  `;
}

function renderWorkspaceAlert() {
  if (!elements.workspaceAlert) {
    return;
  }

  if (state.showLanding || state.sharedReview || !state.workspaceError) {
    elements.workspaceAlert.hidden = true;
    elements.workspaceAlert.innerHTML = "";
    return;
  }

  const error = state.workspaceError;
  elements.workspaceAlert.hidden = false;
  elements.workspaceAlert.innerHTML = `
    <div>
      <strong>${escapeHtml(error.title)}</strong>
      <p>${escapeHtml(error.message)}</p>
      ${error.detail ? `<small>${escapeHtml(error.detail)}</small>` : ""}
    </div>
    <div class="workspace-alert-actions">
      ${auth.enabled && !auth.isSignedIn() ? '<button class="button secondary" type="button" data-start-tracking>Sign In</button>' : ""}
      <button class="button" type="button" data-retry-refresh>Retry</button>
      <button class="button ghost" type="button" data-clear-workspace-alert>Dismiss</button>
    </div>
  `;
}

function workspaceSetupSteps() {
  const linkedHands = state.hands.filter((hand) => hand.sessionId).length;
  const reviewWork = savedHandReviewCount() + savedDecisionReviewCount();
  const hasData = state.hands.length > 0 || state.imports.length > 0 || state.bankrollSessions.length > 0 || state.bankrollTransactions.length > 0;
  const workspaceReady = !auth.enabled || auth.isSignedIn() || state.demoMode;

  return [
    {
      title: state.demoMode ? "Explore demo workspace" : auth.enabled ? "Open a saved workspace" : "Use local workspace",
      body: state.demoMode
        ? "Demo changes are temporary, but the workflow matches the real workspace."
        : workspaceReady
          ? workspaceModeMeta().saveTarget
          : "Sign in so sessions, hands, and notes stay attached to your account.",
      done: workspaceReady,
      actionLabel: workspaceReady ? "Ready" : "Sign In",
      actionAttrs: workspaceReady ? "" : "data-start-tracking"
    },
    {
      title: "Log a bankroll session",
      body: state.bankrollSessions.length
        ? `${state.bankrollSessions.length} session${state.bankrollSessions.length === 1 ? "" : "s"} saved.`
        : "Add date, location, stakes, hours, buy-in, and cash-out.",
      done: state.bankrollSessions.length > 0,
      actionLabel: state.bankrollSessions.length ? "View Sessions" : "Add Session",
      actionAttrs: 'data-jump-view="sessions"'
    },
    {
      title: "Capture hands",
      body: state.hands.length
        ? `${state.hands.length} hand${state.hands.length === 1 ? "" : "s"} saved from live entry or import.`
        : "Build a live hand after a session, or paste online hand-history text.",
      done: state.hands.length > 0,
      actionLabel: state.hands.length ? "View Hands" : "Build Hand",
      actionAttrs: `data-jump-view="${state.hands.length ? "hands" : "live"}"`
    },
    {
      title: "Connect hands to sessions",
      body: linkedHands
        ? `${linkedHands} captured hand${linkedHands === 1 ? "" : "s"} linked to bankroll sessions.`
        : "Link hands so review work belongs to the session where it happened.",
      done: linkedHands > 0,
      actionLabel: linkedHands ? "Review Links" : "Link Hands",
      actionAttrs: 'data-jump-view="sessions"'
    },
    {
      title: "Start reviewing",
      body: reviewWork
        ? `${reviewWork} saved review note${reviewWork === 1 ? "" : "s"} or decision checklist entries.`
        : "Mark important hands, tag themes, and write short decision notes.",
      done: reviewWork > 0,
      actionLabel: reviewWork ? "Open Review" : "Start Review",
      actionAttrs: 'data-jump-view="review"'
    },
    {
      title: "Keep a backup",
      body: state.backupExported
        ? "A workspace backup was exported from this browser."
        : hasData
          ? "Download a JSON backup after meaningful imports or session logs."
          : "A backup becomes useful once the workspace has sessions or hands.",
      done: state.backupExported,
      actionLabel: hasData ? "Backup JSON" : "Add Data First",
      actionAttrs: hasData ? "data-export-workspace-json" : 'data-jump-view="sessions"'
    }
  ];
}

function renderOnboardingPanel() {
  if (!elements.onboardingPanel) {
    return;
  }

  if (state.showLanding || state.sharedReview) {
    elements.onboardingPanel.hidden = true;
    elements.onboardingPanel.innerHTML = "";
    return;
  }

  const steps = workspaceSetupSteps();
  const doneCount = steps.filter((step) => step.done).length;
  const hasActivity = state.hands.length > 0 || state.imports.length > 0 || state.bankrollSessions.length > 0 || state.bankrollTransactions.length > 0;
  const allDone = doneCount === steps.length;

  if (state.onboardingDismissed && hasActivity && !state.workspaceError) {
    elements.onboardingPanel.hidden = true;
    elements.onboardingPanel.innerHTML = "";
    return;
  }

  const nextIndex = steps.findIndex((step) => !step.done);
  const activeIndex = nextIndex === -1 ? steps.length - 1 : nextIndex;
  const progress = Math.round((doneCount / steps.length) * 100);

  elements.onboardingPanel.hidden = false;
  elements.onboardingPanel.innerHTML = `
    <div class="onboarding-head">
      <div>
        <p class="eyebrow">Getting Started</p>
        <h3>${allDone ? "Workspace foundation is set" : "Build a useful poker workspace"}</h3>
        <p>${allDone
          ? "You have the core loop in place: sessions, captured hands, linked review work, and backup habit."
          : "Follow this order to make the app useful with real poker data instead of scattered notes."}</p>
      </div>
      <div class="onboarding-progress">
        <strong>${doneCount}/${steps.length}</strong>
        <span>setup steps</span>
        <div class="progress-track"><span style="width: ${progress}%"></span></div>
      </div>
    </div>
    <div class="onboarding-steps">
      ${steps.map((step, index) => {
        const status = step.done ? "Done" : index === activeIndex ? "Next" : "Later";
        const statusClass = step.done ? "done" : index === activeIndex ? "next" : "later";
        return `
          <article class="onboarding-step ${statusClass}">
            <span class="onboarding-index">${step.done ? "OK" : index + 1}</span>
            <div>
              <strong>${escapeHtml(step.title)}</strong>
              <p>${escapeHtml(step.body)}</p>
            </div>
            <span class="status ${step.done ? "ready" : index === activeIndex ? "queued" : ""}">${escapeHtml(status)}</span>
            ${step.actionAttrs ? `<button class="button secondary" type="button" ${step.actionAttrs}>${escapeHtml(step.actionLabel)}</button>` : ""}
          </article>
        `;
      }).join("")}
    </div>
    <div class="onboarding-actions">
      <button class="button" type="button" data-jump-view="sessions">Add Session</button>
      <button class="button secondary" type="button" data-jump-view="live">Build Live Hand</button>
      <button class="button secondary" type="button" data-jump-view="imports">Import Hands</button>
      <button class="button ghost" type="button" data-dismiss-onboarding>${allDone ? "Close" : "Hide Guide"}</button>
    </div>
  `;
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

function handById(id) {
  return state.hands.find((hand) => hand.id === id) ?? null;
}

function renderReviewFilterControls() {
  const statusControls = [elements.reviewStatusFilter, elements.reviewWorkflowStatus].filter(Boolean);
  const sortControls = [elements.reviewSort, elements.reviewWorkflowSort].filter(Boolean);

  for (const control of statusControls) {
    control.value = ["", "true", "false"].includes(state.reviewFilters.reviewed)
      ? state.reviewFilters.reviewed
      : "false";
  }

  for (const control of sortControls) {
    control.value = ["priority", "biggest-loss", "biggest-win", "biggest-pot", "newest"].includes(state.reviewFilters.sort)
      ? state.reviewFilters.sort
      : "priority";
  }

  elements.reviewBatchSize.value = String(state.reviewSession.batchSize || 5);
}

function renderReviewQueue() {
  if (state.reviewSpots.length === 0) {
    const reviewedOnly = state.reviewFilters.reviewed === "true";
    const allHands = state.reviewFilters.reviewed === "";
    elements.leakList.innerHTML = renderEmptyState({
      title: reviewedOnly ? "No reviewed hands in this view" : allHands ? "No review hands in this view" : "No hands waiting for review",
      body: reviewedOnly
        ? "Marked hands appear here after review work is saved."
        : "Save difficult hands, tag important spots, or import a session and they will appear here.",
      primaryLabel: "Build Live Hand",
      primaryView: "live",
      compact: true
    });
    return;
  }

  elements.leakList.innerHTML = state.reviewSpots
    .slice(0, 12)
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

function reviewSpotById(id) {
  return state.reviewSpots.find((spot) => spot.id === id) ?? (handById(id) ? clientReviewSpot(handById(id)) : null);
}

function reviewQueueIds() {
  return state.reviewSpots
    .map((spot) => spot.id)
    .filter((id) => Boolean(handById(id)));
}

function activeReviewQueueIds() {
  if (!state.reviewSession.active) {
    return reviewQueueIds();
  }

  return state.reviewSession.queueIds.filter((id) => Boolean(handById(id)));
}

function reviewQueueCursor() {
  const ids = activeReviewQueueIds();
  const selectedIndex = ids.indexOf(state.selectedHandId);

  if (selectedIndex >= 0) {
    return selectedIndex;
  }

  return Math.max(0, Math.min(state.reviewSession.cursor, ids.length - 1));
}

function reviewQueueProgress(ids = activeReviewQueueIds()) {
  const reviewedCount = ids.filter((id) => handById(id)?.reviewedAt).length;

  return {
    total: ids.length,
    reviewedCount,
    openCount: ids.length - reviewedCount,
    pct: ids.length === 0 ? 0 : Math.round((reviewedCount / ids.length) * 100)
  };
}

function reviewedThisWeekCount() {
  const start = dateKey(daysBefore(new Date(`${currentDateKey()}T12:00:00`), 7));

  return state.hands.filter((hand) => hand.reviewedAt && String(hand.reviewedAt).slice(0, 10) >= start).length;
}

function startReviewSession({ initialHandId = "", queueIds: sourceQueueIds = null } = {}) {
  const batchSize = Number(elements.reviewBatchSize.value || state.reviewSession.batchSize || 5);
  const ids = Array.isArray(sourceQueueIds)
    ? sourceQueueIds.filter((id) => Boolean(handById(id)))
    : reviewQueueIds();
  const queueIds = ids.slice(0, Math.max(1, batchSize));

  if (initialHandId && !queueIds.includes(initialHandId) && handById(initialHandId)) {
    queueIds.unshift(initialHandId);
  }

  state.reviewSession = {
    active: queueIds.length > 0,
    queueIds,
    cursor: Math.max(0, queueIds.indexOf(initialHandId)),
    batchSize,
    startedAt: queueIds.length > 0 ? new Date().toISOString() : null
  };

  return queueIds[state.reviewSession.cursor] ?? queueIds[0] ?? null;
}

function endReviewSession() {
  state.reviewSession = {
    active: false,
    queueIds: [],
    cursor: 0,
    batchSize: Number(elements.reviewBatchSize.value || state.reviewSession.batchSize || 5),
    startedAt: null
  };
}

function nextReviewIndexAfter(currentId) {
  const ids = activeReviewQueueIds();
  const currentIndex = Math.max(0, ids.indexOf(currentId));

  for (let index = currentIndex + 1; index < ids.length; index += 1) {
    if (!handById(ids[index])?.reviewedAt) {
      return index;
    }
  }

  for (let index = 0; index <= currentIndex; index += 1) {
    if (!handById(ids[index])?.reviewedAt) {
      return index;
    }
  }

  return ids.length > 0 ? Math.min(currentIndex + 1, ids.length - 1) : -1;
}

async function moveReviewSelection(direction) {
  const ids = activeReviewQueueIds();
  if (ids.length === 0) {
    renderReviewWorkflow();
    return;
  }

  const nextIndex = Math.max(0, Math.min(ids.length - 1, reviewQueueCursor() + direction));
  state.reviewSession.cursor = nextIndex;
  await selectHand(ids[nextIndex]);
}

async function advanceReviewAfter(currentId) {
  const ids = activeReviewQueueIds();
  const progress = reviewQueueProgress(ids);

  if (ids.length === 0 || progress.openCount === 0) {
    renderReviewWorkflow();
    showToast("Review session complete.");
    return;
  }

  const nextIndex = nextReviewIndexAfter(currentId);
  if (nextIndex < 0) {
    renderReviewWorkflow();
    return;
  }

  state.reviewSession.cursor = nextIndex;
  await selectHand(ids[nextIndex]);
}

function refreshDemoReviewState() {
  state.reviewSpots = demoReviewSpots(state.hands);
  state.studyTags = demoTagSummary(state.hands);
  state.studyPlan = demoStudyPlan(state.hands);

  if (state.selectedHandId) {
    setDemoDecisionContext(state.selectedHandId);
  }
}

async function saveHandReviewPatch(hand, body) {
  if (state.demoMode) {
    const reviewedValue = body.reviewed;
    const updatedHand = {
      ...hand,
      tags: body.tags === undefined ? handTags(hand) : [...new Set(body.tags.map(normalizeTag).filter(Boolean))],
      notes: body.notes === undefined ? hand.notes ?? "" : String(body.notes ?? "").trim(),
      reviewedAt: reviewedValue === true
        ? hand.reviewedAt || new Date().toISOString()
        : reviewedValue === false
          ? null
          : hand.reviewedAt ?? null,
      reviewUpdatedAt: new Date().toISOString()
    };
    state.hands = state.hands.map((item) => item.id === hand.id ? updatedHand : item);
    refreshDemoReviewState();
    return {
      hand: updatedHand
    };
  }

  return api(`/api/hands/${encodeURIComponent(hand.id)}`, {
    method: "PATCH",
    body
  });
}

async function saveDecisionReviewPatch(hand, decisionId, body) {
  if (state.demoMode) {
    const existingReviews = hand.decisionReviews && typeof hand.decisionReviews === "object"
      ? hand.decisionReviews
      : {};
    const existing = existingReviews[decisionId] ?? {};
    const reviewedValue = body.reviewed;
    const nextReview = {
      note: String(body.note ?? existing.note ?? "").trim(),
      checklist: body.checklist ?? existing.checklist ?? {},
      reviewedAt: reviewedValue === true
        ? existing.reviewedAt || new Date().toISOString()
        : reviewedValue === false
          ? null
          : existing.reviewedAt ?? null,
      updatedAt: new Date().toISOString()
    };
    const updatedHand = {
      ...hand,
      decisionReviews: {
        ...existingReviews,
        [decisionId]: nextReview
      },
      decisionReviewUpdatedAt: new Date().toISOString()
    };
    state.hands = state.hands.map((item) => item.id === hand.id ? updatedHand : item);
    setDemoDecisionContext(hand.id);

    return {
      hand: updatedHand,
      report: state.decisionReport,
      review: nextReview
    };
  }

  return api(`/api/hands/${encodeURIComponent(hand.id)}/decisions/${encodeURIComponent(decisionId)}`, {
    method: "PATCH",
    body
  });
}

function renderReviewSessionSummary() {
  const activeIds = activeReviewQueueIds();
  const progress = reviewQueueProgress(activeIds);
  const allOpen = state.hands.filter((hand) => !hand.reviewedAt).length;
  const allReviewed = state.hands.length - allOpen;

  elements.reviewSessionSummary.innerHTML = `
    <div class="review-kpis">
      <div>
        <span class="subtle">Open</span>
        <strong>${allOpen}</strong>
      </div>
      <div>
        <span class="subtle">${state.reviewSession.active ? "Session" : "Queue"}</span>
        <strong>${activeIds.length}</strong>
      </div>
      <div>
        <span class="subtle">Reviewed</span>
        <strong>${allReviewed}</strong>
      </div>
      <div>
        <span class="subtle">This Week</span>
        <strong>${reviewedThisWeekCount()}</strong>
      </div>
    </div>
    <p class="review-scope-note">${escapeHtml(state.reviewSession.active ? "Active review session" : "Queue view")} / ${escapeHtml(state.reviewFilters.sort.replaceAll("-", " "))}</p>
  `;
}

function renderReviewProgress() {
  const ids = activeReviewQueueIds();
  const progress = reviewQueueProgress(ids);

  if (state.hands.length === 0) {
    elements.reviewProgress.innerHTML = renderEmptyState({
      title: "No hands captured yet",
      body: "Build or import hands before starting a review session.",
      primaryLabel: "Build Live Hand",
      primaryView: "live",
      secondaryLabel: "Import Hands",
      secondaryView: "imports",
      compact: true
    });
    elements.reviewHandNav.innerHTML = "";
    return;
  }

  if (ids.length === 0) {
    elements.reviewProgress.innerHTML = renderEmptyState({
      title: "No hands in this queue",
      body: "Change the status or sort controls to bring hands back into view.",
      secondaryLabel: "",
      compact: true
    });
    elements.reviewHandNav.innerHTML = "";
    return;
  }

  elements.reviewProgress.innerHTML = `
    <article class="review-progress-card">
      <div>
        <span class="subtle">${state.reviewSession.active ? "Session progress" : "Queue progress"}</span>
        <strong>${progress.reviewedCount} / ${progress.total} reviewed</strong>
      </div>
      <div class="progress-track" aria-hidden="true">
        <span style="width: ${progress.pct}%"></span>
      </div>
      <p>${progress.openCount} open / ${progress.pct}% complete</p>
    </article>
  `;

  elements.reviewHandNav.innerHTML = `
    <button class="button secondary" type="button" data-review-move="-1" ${reviewQueueCursor() <= 0 ? "disabled" : ""}>Prev</button>
    <button class="button secondary" type="button" data-review-move="1" ${reviewQueueCursor() >= ids.length - 1 ? "disabled" : ""}>Next</button>
  `;
}

function renderReviewFlowList() {
  const ids = activeReviewQueueIds();

  if (ids.length === 0) {
    elements.reviewFlowList.innerHTML = "";
    return;
  }

  elements.reviewFlowList.innerHTML = ids
    .map((id, index) => {
      const hand = handById(id);
      const spot = reviewSpotById(id);
      const active = id === state.selectedHandId ? "active" : "";
      const reviewed = hand?.reviewedAt ? "reviewed" : "";
      const reasons = spot?.reasons ?? [];

      return `
        <button class="review-flow-row ${active} ${reviewed}" type="button" data-review-select="${escapeHtml(id)}">
          <span class="review-flow-index">${index + 1}</span>
          <span class="review-flow-main">
            <strong>#${escapeHtml(spot?.handNumber ?? hand?.handNumber ?? id)}</strong>
            <small>${escapeHtml(reasons.join(" / ") || "Saved hand")}</small>
          </span>
          <span class="review-flow-meta">
            <em>${formatCurrency(spot?.estimatedHeroResult ?? estimatedHeroResult(hand), { signed: true })}</em>
            <small>${hand?.reviewedAt ? "reviewed" : "open"}</small>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderReviewHandWorkspace() {
  const hand = handById(state.selectedHandId);

  if (!hand) {
    elements.reviewHandDetail.innerHTML = renderEmptyState({
      title: "Select a hand",
      body: "Choose a hand from the queue to replay it and work through the review.",
      secondaryLabel: "",
      compact: true
    });
    return;
  }

  elements.reviewHandDetail.innerHTML = handDetailHtml(hand, {
    reviewMode: true,
    spot: reviewSpotById(hand.id)
  });
}

function renderReviewWorkflow() {
  renderReviewFilterControls();
  renderReviewSessionSummary();
  renderReviewProgress();
  renderReviewFlowList();
  renderReviewHandWorkspace();
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
      primaryView: "review",
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

function restoreCount(payload, bucket, field) {
  return payload?.[bucket]?.[field] ?? 0;
}

function restoreSourceLabel(source = {}) {
  const exportedAt = source.exportedAt ? formatDate(String(source.exportedAt).slice(0, 10)) : "unknown date";
  return `${source.app ?? "Backup"} ${source.schemaVersion ?? ""}`.trim() + ` / ${exportedAt}`;
}

function renderWorkspaceRestorePreview(payload = state.workspaceRestorePreview) {
  if (!payload) {
    elements.workspaceRestorePreview.innerHTML = "";
    return;
  }

  const sessions = payload.bankrollSessions ?? [];
  const transactions = payload.bankrollTransactions ?? [];
  const imports = payload.imports ?? [];
  const hands = payload.hands ?? [];
  const readyCounts = payload.readyCounts ?? {};
  const duplicateCounts = payload.duplicateCounts ?? {};
  const warnings = payload.warnings ?? [];

  elements.workspaceRestorePreview.innerHTML = `
    <div class="import-preview-grid restore-preview-grid">
      <div>
        <span class="subtle">Sessions ready</span>
        <strong>${readyCounts.bankrollSessions ?? 0}</strong>
      </div>
      <div>
        <span class="subtle">Transactions ready</span>
        <strong>${readyCounts.bankrollTransactions ?? 0}</strong>
      </div>
      <div>
        <span class="subtle">Hands ready</span>
        <strong>${readyCounts.hands ?? 0}</strong>
      </div>
      <div>
        <span class="subtle">Duplicates</span>
        <strong>${payload.totalDuplicate ?? 0}</strong>
      </div>
    </div>
    <div class="preview-lists">
      <div>
        <h4>${escapeHtml(restoreSourceLabel(payload.source))}</h4>
        <p>${countLabel(payload.totalReady ?? 0, "record")} ready / ${countLabel(payload.totalDuplicate ?? 0, "duplicate")} skipped</p>
      </div>
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
        <h4>Hands & Imports</h4>
        <p>${countLabel(readyCounts.hands ?? 0, "hand")} ready / ${countLabel(readyCounts.imports ?? 0, "import")} ready</p>
        ${
          hands.length
            ? hands.slice(0, 3).map((hand) => `<p>${escapeHtml(hand.handNumber ?? hand.id)} / ${escapeHtml(hand.tableName ?? "Unknown table")}</p>`).join("")
            : '<p class="muted-line">No new hands found.</p>'
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
        imports.length || warnings.length
          ? `<div>
              <h4>Notes</h4>
              ${imports.slice(0, 3).map((item) => `<p>${escapeHtml(item.name ?? item.id)} / ${escapeHtml(item.source ?? "backup")}</p>`).join("")}
              ${warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
            </div>`
          : ""
      }
    </div>
    <p class="muted-line">Incoming duplicates: ${restoreCount(payload, "duplicateCounts", "bankrollSessions")} sessions / ${restoreCount(payload, "duplicateCounts", "bankrollTransactions")} transactions / ${restoreCount(payload, "duplicateCounts", "hands")} hands / ${restoreCount(payload, "duplicateCounts", "imports")} imports.</p>
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

function selectedOption(current, value) {
  return current === value ? "selected" : "";
}

function renderSessionHandFilters(hands, session) {
  const filters = state.sessionDetailFilters;
  const tags = sessionHandFilterValues(hands.flatMap((hand) => handTags(hand)), (tag) => tag);
  const positions = sessionHandFilterValues(hands, heroPosition);
  const potBuckets = sessionHandFilterValues(hands, (hand) => sessionPotSizeBucket(hand, session));

  if (filters.tag && !tags.includes(filters.tag)) {
    filters.tag = "";
  }
  if (filters.position && !positions.includes(filters.position)) {
    filters.position = "";
  }
  if (filters.potSize && !potBuckets.includes(filters.potSize)) {
    filters.potSize = "";
  }
  if (!["", "true", "false"].includes(filters.reviewed)) {
    filters.reviewed = "";
  }
  if (!["", "win", "loss", "breakeven"].includes(filters.result)) {
    filters.result = "";
  }
  if (!["swing", "open-first", "biggest-loss", "biggest-win", "biggest-pot", "newest"].includes(filters.sort)) {
    filters.sort = "swing";
  }

  return `
    <div class="session-hand-filters">
      <label>
        Tag
        <select data-session-hand-filter="tag" aria-label="Session hand tag filter">
          <option value="">All tags</option>
          ${tags.map((tag) => `<option value="${escapeHtml(tag)}" ${selectedOption(filters.tag, tag)}>${escapeHtml(tagLabel(tag))}</option>`).join("")}
        </select>
      </label>
      <label>
        Review
        <select data-session-hand-filter="reviewed" aria-label="Session hand review filter">
          <option value="">All review</option>
          <option value="false" ${selectedOption(filters.reviewed, "false")}>Open</option>
          <option value="true" ${selectedOption(filters.reviewed, "true")}>Reviewed</option>
        </select>
      </label>
      <label>
        Position
        <select data-session-hand-filter="position" aria-label="Session hero position filter">
          <option value="">All positions</option>
          ${positions.map((position) => `<option value="${escapeHtml(position)}" ${selectedOption(filters.position, position)}>${escapeHtml(position)}</option>`).join("")}
        </select>
      </label>
      <label>
        Result
        <select data-session-hand-filter="result" aria-label="Session hand result filter">
          <option value="">All results</option>
          <option value="loss" ${selectedOption(filters.result, "loss")}>Losses</option>
          <option value="win" ${selectedOption(filters.result, "win")}>Wins</option>
          <option value="breakeven" ${selectedOption(filters.result, "breakeven")}>Breakeven</option>
        </select>
      </label>
      <label>
        Pot size
        <select data-session-hand-filter="potSize" aria-label="Session hand pot size filter">
          <option value="">Any pot</option>
          ${["large", "medium", "small"]
            .filter((bucket) => potBuckets.includes(bucket))
            .map((bucket) => `<option value="${escapeHtml(bucket)}" ${selectedOption(filters.potSize, bucket)}>${escapeHtml(sessionPotSizeLabel(bucket))}</option>`)
            .join("")}
        </select>
      </label>
      <label>
        Sort
        <select data-session-hand-filter="sort" aria-label="Session hand sort">
          <option value="swing" ${selectedOption(filters.sort, "swing")}>Swing size</option>
          <option value="open-first" ${selectedOption(filters.sort, "open-first")}>Open first</option>
          <option value="biggest-loss" ${selectedOption(filters.sort, "biggest-loss")}>Loss</option>
          <option value="biggest-win" ${selectedOption(filters.sort, "biggest-win")}>Win</option>
          <option value="biggest-pot" ${selectedOption(filters.sort, "biggest-pot")}>Pot</option>
          <option value="newest" ${selectedOption(filters.sort, "newest")}>Newest</option>
        </select>
      </label>
      <button class="button secondary" type="button" data-reset-session-hand-filters>Reset</button>
    </div>
  `;
}

function renderSessionHandRow(hand, session) {
  const result = estimatedHeroResult(hand);
  const pot = trackedPot(hand);
  const potBucket = sessionPotSizeBucket(hand, session);
  const tags = handTags(hand);
  const heroCards = hand.hero ? hand.holeCards[hand.hero] ?? [] : [];

  return `
    <article class="session-hand-row">
      <button class="session-hand-main" type="button" data-open-hand="${escapeHtml(hand.id)}">
        <div>
          <div class="session-row-title">
            <strong>#${escapeHtml(hand.handNumber)} / ${escapeHtml(hand.tableName ?? "Table")}</strong>
            <span class="pill">${hand.reviewedAt ? "reviewed" : "open"}</span>
          </div>
          ${renderCards([...heroCards, ...(hand.board ?? [])])}
          <p>${escapeHtml(heroPosition(hand))} / ${escapeHtml(sessionPotSizeLabel(potBucket))} / ${formatCurrency(pot)} pot</p>
          ${tags.length ? renderTags(tags) : ""}
        </div>
        <strong>${formatCurrency(result, { signed: true })}</strong>
      </button>
      <div class="row-actions">
        <button class="button secondary" type="button" data-open-hand="${escapeHtml(hand.id)}">Open Hand</button>
        <button class="button ghost" type="button" data-open-session-review-hand="${escapeHtml(hand.id)}">Review</button>
      </div>
    </article>
  `;
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
  const filteredHands = filterSessionHands(linkedHands, selectedSession);
  const allStats = sessionHandStats(linkedHands);
  const filteredStats = sessionHandStats(filteredHands);
  const sessionQueue = sessionReviewQueue(filteredHands).slice(0, 5);
  const openQueue = sessionQueue.filter((spot) => !spot.reviewedAt);
  const estimatedResult = linkedHands.reduce((sum, hand) => sum + estimatedHeroResult(hand), 0);
  const difference = selectedSession.profit - estimatedResult;
  const importedHands = linkedHands.filter((hand) => hand.source !== "live-entry").length;
  const liveHands = Math.max(0, linkedHands.length - importedHands);
  const spots = filteredHands
    .map((hand) => ({
      hand,
      result: estimatedHeroResult(hand)
    }))
    .sort((a, b) => Math.abs(b.result) - Math.abs(a.result))
    .slice(0, 6);
  const strongestTag = demoTagSummary(linkedHands)[0] ?? null;

  elements.sessionDetail.innerHTML = `
    <section class="session-detail-card">
      <div class="session-detail-head">
        <div>
          <span class="subtle">Selected session</span>
          <strong>${escapeHtml(sessionLabel(selectedSession))}</strong>
          <p>${escapeHtml(formatLongDate(selectedSession.date))} / ${escapeHtml(selectedSession.gameType)} / ${formatNumber(selectedSession.hours, 1)} hours</p>
        </div>
        <div class="session-detail-actions">
          <span class="pill">${linkedHands.length} linked hands</span>
          <button class="button secondary" type="button" data-start-session-review="${escapeHtml(id)}" ${sessionQueue.length === 0 ? "disabled" : ""}>Review Filtered</button>
          <button class="button secondary" type="button" data-export-session-report="${escapeHtml(id)}">Export Report</button>
          <button class="button ghost" type="button" data-export-session-hands="${escapeHtml(id)}" ${filteredHands.length === 0 ? "disabled" : ""}>Hands CSV</button>
        </div>
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
        <div>
          <span class="subtle">Uncaptured gap</span>
          <strong>${formatCurrency(difference, { signed: true })}</strong>
        </div>
        <div>
          <span class="subtle">Open reviews</span>
          <strong>${allStats.openHands}</strong>
        </div>
      </div>
      <p class="session-capture-note">Logged result is the bankroll record. Captured-hand estimate only sums saved or imported hands linked to this session, so the gap usually means not every hand from the session is recorded.</p>

      <div class="session-share-panel">
        <div>
          <h4>Share Review</h4>
          <p>Creates a read-only review package from the current linked-hand filters.</p>
        </div>
        <div class="share-options" aria-label="Session share privacy options">
          <label>
            <input type="checkbox" data-session-share-option="hideAmounts" ${state.sessionShareOptions.hideAmounts ? "checked" : ""}>
            Hide amounts
          </label>
          <label>
            <input type="checkbox" data-session-share-option="hideLocation" ${state.sessionShareOptions.hideLocation ? "checked" : ""}>
            Hide location
          </label>
          <label>
            <input type="checkbox" data-session-share-option="anonymizePlayers" ${state.sessionShareOptions.anonymizePlayers ? "checked" : ""}>
            Anonymize players
          </label>
          <label>
            <input type="checkbox" data-session-share-option="includeNotes" ${state.sessionShareOptions.includeNotes ? "checked" : ""}>
            Include notes
          </label>
        </div>
        <div class="session-share-actions">
          <button class="button secondary" type="button" data-export-session-queue="${escapeHtml(id)}" ${sessionQueue.length === 0 ? "disabled" : ""}>Queue CSV</button>
          <button class="button secondary" type="button" data-copy-session-summary="${escapeHtml(id)}">Copy Summary</button>
          <button class="button" type="button" data-copy-session-share="${escapeHtml(id)}" ${filteredHands.length === 0 ? "disabled" : ""}>Copy Link</button>
        </div>
      </div>

      <div class="session-drilldown-controls">
        <div>
          <h4>Linked Hand Filters</h4>
          <p>${escapeHtml(sessionHandFilterSummary(filteredHands, linkedHands))}</p>
        </div>
        ${renderSessionHandFilters(linkedHands, selectedSession)}
      </div>

      <div class="session-drilldown-grid">
        <div class="session-mini-panel">
          <h4>Session Audit</h4>
          <div class="audit-list">
            <p><strong>${linkedImports.length}</strong><span>linked imports</span></p>
            <p><strong>${liveHands}</strong><span>live-built hands</span></p>
            <p><strong>${importedHands}</strong><span>imported hands</span></p>
            <p><strong>${allStats.reviewedHands}/${linkedHands.length}</strong><span>hands reviewed</span></p>
          </div>
          ${
            linkedImports.length
              ? `<div class="linked-section compact">
                  ${linkedImports.map((item) => `<p>${escapeHtml(item.name)} / ${item.handCount} hands / ${escapeHtml(item.status ?? "ready")}</p>`).join("")}
                </div>`
              : '<p class="muted-line">No imports linked yet. Link an import or save a live hand to this session.</p>'
          }
        </div>

        <div class="session-mini-panel">
          <h4>Filtered Breakdown</h4>
          <div class="audit-list">
            <p><strong>${filteredStats.handCount}</strong><span>hands shown</span></p>
            <p><strong>${filteredStats.openHands}</strong><span>open reviews</span></p>
            <p><strong>${formatCurrency(filteredStats.totalResult, { signed: true })}</strong><span>captured result</span></p>
            <p><strong>${formatCurrency(filteredStats.biggestPot)}</strong><span>biggest pot</span></p>
          </div>
          <p class="muted-line">${
            strongestTag
              ? `Most common tag in this session: ${escapeHtml(tagLabel(strongestTag.tag))}.`
              : "Tags saved on linked hands will surface session-level patterns here."
          }</p>
        </div>
      </div>

      <div class="linked-section">
        <div class="linked-section-head">
          <h4>Session Review Queue</h4>
          <span>${openQueue.length} open / ${sessionQueue.length} filtered</span>
        </div>
        ${
          sessionQueue.length
            ? sessionQueue.map((spot) => `
                <button class="linked-hand" type="button" data-open-session-review-hand="${escapeHtml(spot.id)}">
                  <span>#${escapeHtml(spot.handNumber)} / ${escapeHtml(spot.reasons.join(", "))}</span>
                  <strong>${formatCurrency(spot.estimatedHeroResult, { signed: true })}</strong>
                </button>
              `).join("")
            : '<p class="muted-line">No linked hands match the current filters.</p>'
        }
      </div>
      <div class="linked-section">
        <div class="linked-section-head">
          <h4>Filtered Linked Hands</h4>
          <span>${filteredHands.length} shown</span>
        </div>
        ${
          spots.length
            ? spots.map(({ hand }) => renderSessionHandRow(hand, selectedSession)).join("")
            : '<p class="muted-line">Linked hands appear here after an import finishes parsing.</p>'
        }
      </div>
      <div class="linked-section session-reflection">
        <h4>Session Reflection</h4>
        <p>${selectedSession.notes ? escapeHtml(selectedSession.notes) : "Use the session note field for what went well, mistakes, mental game, and the next adjustment."}</p>
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

function renderDecisionReview(hand, { reviewMode = false } = {}) {
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
          ${reviewMode ? '<button class="button secondary" type="button" data-mark-decision-reviewed-next>Mark & Next</button>' : ""}
          <button class="button ghost" type="button" data-clear-decision-reviewed>Reopen</button>
        </div>
      </article>
    </section>
  `;
}

function emptyHandDetailHtml() {
  return state.hands.length === 0
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
}

function handDetailHtml(hand, { reviewMode = false, spot = null } = {}) {
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

  const reviewContext = reviewMode && spot
    ? `
      <section class="review-context-strip">
        <div>
          <span class="subtle">Why this hand</span>
          <strong>${escapeHtml((spot.reasons ?? []).join(" / ") || "Saved for review")}</strong>
        </div>
        <div>
          <span class="subtle">Tracked pot</span>
          <strong>${formatCurrency(spot.trackedPot ?? trackedPot(hand))}</strong>
        </div>
      </section>
    `
    : "";

  return `
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
    ${reviewContext}
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
        ${reviewMode ? '<button class="button secondary" type="button" data-save-review-next>Save & Next</button>' : ""}
        <button class="button secondary" type="button" data-mark-reviewed>Mark Reviewed</button>
        ${reviewMode ? '<button class="button secondary" type="button" data-mark-reviewed-next>Mark & Next</button>' : ""}
        <button class="button ghost" type="button" data-clear-reviewed>Reopen</button>
      </div>
    </section>
    ${renderDecisionReview(hand, { reviewMode })}
    ${renderSimilarHands(hand)}
    <ul class="seat-list">${seats}</ul>
    <div class="street-list">${streets || '<div class="empty">No actions parsed for this hand.</div>'}</div>
  `;
}

function renderHandDetail() {
  const hand = handById(state.selectedHandId);
  elements.handDetail.innerHTML = hand ? handDetailHtml(hand) : emptyHandDetailHtml();
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

function sharedTags(tags = []) {
  return tags.length
    ? `<div class="tag-list">${tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
}

function renderSharedHandRows(rows = [], emptyMessage = "No hands included in this share.") {
  return rows.length
    ? rows.map((row) => `
        <article class="shared-hand-row">
          <div>
            <div class="session-row-title">
              <strong>#${escapeHtml(row.handNumber)} / ${escapeHtml(row.tableName ?? "Table")}</strong>
              <span class="pill">${escapeHtml(row.status ?? "Open")}</span>
            </div>
            ${renderCards([...(row.heroCards ?? []), ...(row.board ?? [])])}
            <p>${escapeHtml(row.position ?? "")} / ${escapeHtml(row.hero ?? "Hero")} / ${escapeHtml(row.pot ?? "Pot hidden")} pot</p>
            ${row.reasons?.length ? `<p>${escapeHtml(row.reasons.join(" / "))}</p>` : ""}
            ${sharedTags(row.tags ?? [])}
          </div>
          <strong>${escapeHtml(row.result ?? "")}</strong>
        </article>
      `).join("")
    : `<p class="muted-line">${escapeHtml(emptyMessage)}</p>`;
}

function renderSharedReview() {
  if (!elements.sharedReview) {
    return;
  }

  const payload = state.sharedReview;
  if (!payload) {
    elements.sharedReview.innerHTML = renderEmptyState({
      title: "No shared review loaded",
      body: "Open a Backdoor Flush review link to see a read-only session package.",
      primaryLabel: "Open App",
      primaryView: "overview",
      compact: true
    });
    return;
  }

  const summary = payload.summary ?? {};
  const session = payload.session ?? {};
  const themes = payload.tagThemes ?? [];

  elements.sharedReview.innerHTML = `
    <div class="shared-review-head">
      <div>
        <p class="eyebrow">Shared Review</p>
        <h3>${escapeHtml(session.label ?? "Session Review")}</h3>
        <p>${escapeHtml(formatLongDate(session.date))} / ${escapeHtml(session.gameType ?? "cash")} / ${escapeHtml(session.stakes ?? "")} / ${escapeHtml(session.hours ?? "0.0")} hours</p>
      </div>
      <div class="shared-review-actions">
        <span class="pill">${escapeHtml(payload.privacy?.summary ?? "privacy settings")}</span>
        <button class="button secondary" type="button" data-copy-shared-link>Copy Link</button>
        <button class="button" type="button" data-start-tracking>Open App</button>
      </div>
    </div>

    <div class="detail-summary compact shared-summary">
      <div>
        <span class="subtle">Logged result</span>
        <strong>${escapeHtml(session.profit ?? "Hidden")}</strong>
      </div>
      <div>
        <span class="subtle">Captured result</span>
        <strong>${escapeHtml(summary.capturedResult ?? "Hidden")}</strong>
      </div>
      <div>
        <span class="subtle">Open reviews</span>
        <strong>${escapeHtml(summary.openReviews ?? 0)}</strong>
      </div>
      <div>
        <span class="subtle">Linked hands</span>
        <strong>${escapeHtml(summary.linkedHands ?? 0)}</strong>
      </div>
    </div>

    <div class="session-drilldown-grid">
      <div class="session-mini-panel">
        <h4>Review Scope</h4>
        <div class="audit-list">
          <p><strong>${escapeHtml(summary.filteredHands ?? 0)}</strong><span>filtered hands</span></p>
          <p><strong>${escapeHtml(summary.reviewedHands ?? 0)}</strong><span>reviewed hands</span></p>
          <p><strong>${escapeHtml(summary.taggedHands ?? 0)}</strong><span>tagged hands</span></p>
          <p><strong>${escapeHtml(summary.biggestPot ?? "Hidden")}</strong><span>biggest pot</span></p>
        </div>
        <p class="muted-line">${escapeHtml((payload.filters?.bankroll ?? []).join(" / ") || "All sessions")}</p>
        <p class="muted-line">${escapeHtml(payload.filters?.linkedHands ?? "")}</p>
      </div>
      <div class="session-mini-panel">
        <h4>Tagged Themes</h4>
        ${
          themes.length
            ? themes.map((theme) => `
                <p class="shared-theme-row">
                  <strong>${escapeHtml(theme.tag)}</strong>
                  <span>${escapeHtml(theme.hands)} hands / ${escapeHtml(theme.reviewed)} reviewed / ${escapeHtml(theme.result)}</span>
                </p>
              `).join("")
            : '<p class="muted-line">No tagged themes included.</p>'
        }
      </div>
    </div>

    <div class="linked-section">
      <div class="linked-section-head">
        <h4>Review Queue</h4>
        <span>${escapeHtml((payload.queue ?? []).length)} hands</span>
      </div>
      ${renderSharedHandRows(payload.queue ?? [], "No review queue hands included.")}
    </div>

    <div class="linked-section">
      <div class="linked-section-head">
        <h4>Biggest Hands</h4>
        <span>${escapeHtml((payload.biggestHands ?? []).length)} hands</span>
      </div>
      ${renderSharedHandRows(payload.biggestHands ?? [], "No biggest-hand list included.")}
    </div>

    ${
      session.notes
        ? `<div class="linked-section session-reflection">
            <h4>Notes</h4>
            <p>${escapeHtml(session.notes)}</p>
          </div>`
        : ""
    }
  `;
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
  renderExportControls();
  renderHomePeriodControls();
  renderMetrics();
  renderWorkspaceHealth();
  renderWorkspaceAlert();
  renderOnboardingPanel();
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
  renderReviewFilterControls();
  renderReviewQueue();
  renderTagSummary();
  renderStudyPlan();
  renderHomeInsights();
  renderBankrollImportPreview();
  renderWorkspaceRestorePreview();
  renderSharedReview();
  renderTransactions();
  renderSessions();
  renderHands();
  renderHandDetail();
  renderReviewWorkflow();
  renderImports();
  syncImportPolling();
}

async function refresh({ quiet = false } = {}) {
  if (state.demoMode) {
    state.workspaceError = null;
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

  let payloads;
  try {
    payloads = await Promise.all([
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
  } catch (error) {
    state.workspaceError = friendlyApiError(error);
    render();
    if (!quiet) {
      showToast(state.workspaceError.title);
    }
    throw error;
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
  ] = payloads;

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
  state.workspaceError = null;
  state.lastSyncedAt = new Date().toISOString();

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
    state.reviewSpots = demoReviewSpots(state.hands);
    renderReviewFilterControls();
    renderMetrics();
    renderReviewQueue();
    renderReviewWorkflow();
    renderHomeInsights();
    renderSessions();
    return;
  }

  const payload = await api(reviewQueuePath());
  state.reviewSpots = payload.spots;
  renderMetrics();
  renderReviewFilterControls();
  renderReviewQueue();
  renderHomeInsights();
  renderReviewWorkflow();
  renderSessions();
}

async function loadSimilarHands(handId) {
  if (state.demoMode) {
    setDemoDecisionContext(handId);
    renderHandDetail();
    renderReviewWorkflow();
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
  renderReviewWorkflow();
}

async function loadDecisionReview(handId) {
  if (state.demoMode) {
    setDemoDecisionContext(handId);
    renderHandDetail();
    renderReviewWorkflow();
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
  renderReviewWorkflow();
}

async function loadStudyPlan() {
  if (state.demoMode) {
    renderStudyPlan();
    renderHomeInsights();
    renderReviewWorkflow();
    return;
  }

  const payload = await api("/api/study/plan");
  state.studyPlan = payload.items;
  renderStudyPlan();
  renderHomeInsights();
  renderReviewWorkflow();
}

async function selectHand(handId) {
  state.selectedHandId = handId;
  state.replayStep = 0;
  state.selectedDecisionId = null;

  if (state.demoMode) {
    setDemoDecisionContext(handId);
    renderHands();
    renderHandDetail();
    renderReviewWorkflow();
    return;
  }

  renderHands();
  renderHandDetail();
  renderReviewWorkflow();
  await Promise.all([
    loadSimilarHands(handId),
    loadDecisionReview(handId)
  ]);
  renderReviewWorkflow();
}

async function openReviewView({ handId = "", startSession = false } = {}) {
  setView("review");

  if (startSession) {
    handId = startReviewSession({ initialHandId: handId }) ?? handId;
  }

  const ids = activeReviewQueueIds();
  const targetId = handId || (ids.includes(state.selectedHandId) ? state.selectedHandId : ids[0]);

  if (targetId) {
    await selectHand(targetId);
    return;
  }

  renderReviewWorkflow();
}

async function openSessionReview(sessionIdValue, initialHandId = "") {
  const session = sessionById(sessionIdValue);
  if (!session) {
    showToast("Select a session first.");
    return;
  }

  const queueIds = sessionReviewQueue(filterSessionHands(handsForSession(sessionIdValue), session))
    .map((spot) => spot.id);
  const targetId = startReviewSession({ initialHandId, queueIds }) ?? initialHandId;

  if (!targetId) {
    renderSessionDetail(filteredBankrollSessions());
    showToast("No linked hands match the current session filters.");
    return;
  }

  await openReviewView({ handId: targetId });
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

function workspaceRestoreSummary(payload, verb = "ready") {
  const counts = verb === "restored"
    ? payload.restoredCounts ?? payload.readyCounts ?? {}
    : payload.readyCounts ?? {};
  const parts = [
    countLabel(counts.bankrollSessions ?? 0, "session") + ` ${verb}`,
    countLabel(counts.bankrollTransactions ?? 0, "transaction") + ` ${verb}`,
    countLabel(counts.hands ?? 0, "hand") + ` ${verb}`
  ];

  if ((counts.imports ?? 0) > 0) {
    parts.push(countLabel(counts.imports, "import") + ` ${verb}`);
  }

  if ((payload.totalDuplicate ?? 0) > 0) {
    parts.push(countLabel(payload.totalDuplicate, "duplicate") + " skipped");
  }

  return parts.join(" / ");
}

async function handleHandDetailClick(event, container, { reviewMode = false } = {}) {
  const similarTarget = event.target.closest("[data-open-similar-hand]");
  if (similarTarget) {
    await selectHand(similarTarget.dataset.openSimilarHand);
    return;
  }

  const decisionTarget = event.target.closest("[data-select-decision]");
  if (decisionTarget) {
    state.selectedDecisionId = decisionTarget.dataset.selectDecision;
    renderHandDetail();
    renderReviewWorkflow();
    return;
  }

  const decisionReviewTarget = event.target.closest("[data-save-decision], [data-mark-decision-reviewed], [data-mark-decision-reviewed-next], [data-clear-decision-reviewed]");
  if (decisionReviewTarget) {
    const hand = handById(state.selectedHandId);
    const decisionId = container.querySelector("[data-current-decision]")?.dataset.currentDecision;
    if (!hand || !decisionId) {
      return;
    }

    const checklist = {};
    for (const input of container.querySelectorAll("[data-decision-checklist]")) {
      checklist[input.dataset.decisionChecklist] = input.value;
    }
    const reviewed = decisionReviewTarget.matches("[data-mark-decision-reviewed], [data-mark-decision-reviewed-next]")
      ? true
      : decisionReviewTarget.matches("[data-clear-decision-reviewed]")
        ? false
        : undefined;
    const advance = reviewMode && decisionReviewTarget.matches("[data-mark-decision-reviewed-next]");

    try {
      const payload = await saveDecisionReviewPatch(hand, decisionId, {
        note: container.querySelector("[data-decision-note]")?.value ?? "",
        checklist,
        ...(reviewed === undefined ? {} : { reviewed })
      });
      state.hands = state.hands.map((item) => item.id === payload.hand.id ? payload.hand : item);
      state.decisionReportForHandId = hand.id;
      state.decisionReport = payload.report;
      state.selectedDecisionId = decisionId;
      await loadStudyPlan();
      renderHandDetail();
      renderReviewWorkflow();
      if (advance) {
        await advanceReviewAfter(hand.id);
      }
      showToast(markWorkspaceSaved(reviewed === true ? "Decision marked reviewed" : "Decision review saved"));
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

  const reviewTarget = event.target.closest("[data-save-review], [data-save-review-next], [data-mark-reviewed], [data-mark-reviewed-next], [data-clear-reviewed]");
  if (reviewTarget) {
    const hand = handById(state.selectedHandId);
    if (!hand) {
      return;
    }

    const tags = [...container.querySelectorAll("[data-review-tag].active")]
      .map((button) => button.dataset.reviewTag);
    const notes = container.querySelector("[data-review-notes]")?.value ?? "";
    const reviewed = reviewTarget.matches("[data-mark-reviewed], [data-mark-reviewed-next]")
      ? true
      : reviewTarget.matches("[data-clear-reviewed]")
        ? false
        : undefined;
    const advance = reviewMode && reviewTarget.matches("[data-save-review-next], [data-mark-reviewed-next]");

    try {
      const payload = await saveHandReviewPatch(hand, {
        tags,
        notes,
        ...(reviewed === undefined ? {} : { reviewed })
      });
      state.hands = state.hands.map((item) => item.id === payload.hand.id ? payload.hand : item);
      state.selectedHandId = payload.hand.id;
      if (state.demoMode) {
        render();
      } else {
        await refresh({ quiet: true });
        state.selectedHandId = payload.hand.id;
        render();
      }
      if (advance) {
        await advanceReviewAfter(payload.hand.id);
      }
      showToast(markWorkspaceSaved(reviewed === true ? "Hand marked reviewed" : reviewed === false ? "Hand reopened" : "Review saved"));
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  const target = event.target.closest("[data-replay]");
  if (!target) {
    return;
  }

  const hand = handById(state.selectedHandId);
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
  renderReviewWorkflow();
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
    openReviewView({
      handId: reviewHandTarget.dataset.openReviewHand,
      startSession: true
    }).catch((error) => showToast(error.message));
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

  const copySharedLinkTarget = event.target.closest("[data-copy-shared-link]");
  if (copySharedLinkTarget) {
    event.preventDefault();
    copyText(window.location.href).then(() => showToast("Shared review link copied.")).catch((error) => showToast(error.message));
    return;
  }

  const retryRefreshTarget = event.target.closest("[data-retry-refresh]");
  if (retryRefreshTarget) {
    event.preventDefault();
    refresh()
      .then(() => showToast("Workspace refreshed."))
      .catch((error) => showToast(error.message));
    return;
  }

  const clearAlertTarget = event.target.closest("[data-clear-workspace-alert]");
  if (clearAlertTarget) {
    event.preventDefault();
    state.workspaceError = null;
    renderWorkspaceAlert();
    return;
  }

  const dismissOnboardingTarget = event.target.closest("[data-dismiss-onboarding]");
  if (dismissOnboardingTarget) {
    event.preventDefault();
    state.onboardingDismissed = true;
    writeStorageFlag(onboardingPanelStorageKey, true);
    renderOnboardingPanel();
    showToast("Setup guide hidden.");
    return;
  }

  const exportWorkspaceTarget = event.target.closest("[data-export-workspace-json]");
  if (exportWorkspaceTarget) {
    event.preventDefault();
    exportWorkspaceJson().catch((error) => showToast(error.message));
    return;
  }

  const viewTarget = event.target.closest("[data-jump-view]");
  if (viewTarget) {
    event.preventDefault();
    if (state.showLanding) {
      startTracking({ targetView: viewTarget.dataset.jumpView }).catch((error) => showToast(error.message));
      return;
    }

    if (viewTarget.dataset.jumpView === "review") {
      openReviewView().catch((error) => showToast(error.message));
      return;
    }

    setView(viewTarget.dataset.jumpView);
  }
});

elements.navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.view === "review") {
      openReviewView().catch((error) => showToast(error.message));
      return;
    }

    setView(button.dataset.view);
  });
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
  renderWorkspaceHealth();
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
          ? markWorkspaceSaved("Sample queued for parsing")
          : markWorkspaceSaved(`Loaded ${payload.import.handCount} sample hands`)
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
    showToast(markWorkspaceSaved(`Cleared ${payload.removedHands} hands`));
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
    renderWorkspaceHealth();
  });
}

for (const resetButton of elements.bankrollResetFilters) {
  resetButton.addEventListener("click", () => {
    state.bankrollFilters = { ...emptyBankrollFilters };
    renderBankrollFilters();
    renderHomePeriodControls();
    renderMetrics();
    renderBankrollCharts();
    renderSessions();
    renderWorkspaceHealth();
  });
}

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

for (const filter of [elements.reviewStatusFilter, elements.reviewWorkflowStatus]) {
  filter.addEventListener("change", () => {
    state.reviewFilters.reviewed = filter.value;
    endReviewSession();
    loadReviewQueue().catch((error) => showToast(error.message));
  });
}

for (const filter of [elements.reviewSort, elements.reviewWorkflowSort]) {
  filter.addEventListener("change", () => {
    state.reviewFilters.sort = filter.value;
    endReviewSession();
    loadReviewQueue().catch((error) => showToast(error.message));
  });
}

elements.reviewBatchSize.addEventListener("change", () => {
  state.reviewSession.batchSize = Number(elements.reviewBatchSize.value || 5);
  if (state.reviewSession.active) {
    const selected = state.selectedHandId;
    const targetId = startReviewSession({
      initialHandId: selected
    });
    if (targetId && targetId !== selected) {
      selectHand(targetId).catch((error) => showToast(error.message));
      return;
    }
  }
  renderReviewWorkflow();
});

elements.reviewStartSession.addEventListener("click", () => {
  const targetId = startReviewSession({
    initialHandId: state.selectedHandId
  });

  if (!targetId) {
    renderReviewWorkflow();
    showToast("No hands in the current review queue.");
    return;
  }

  openReviewView({
    handId: targetId
  }).catch((error) => showToast(error.message));
});

elements.reviewClearSession.addEventListener("click", () => {
  endReviewSession();
  renderReviewWorkflow();
});

elements.reviewFlowList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-review-select]");
  if (!target) {
    return;
  }

  const ids = activeReviewQueueIds();
  const index = ids.indexOf(target.dataset.reviewSelect);
  state.reviewSession.cursor = index >= 0 ? index : state.reviewSession.cursor;
  selectHand(target.dataset.reviewSelect).catch((error) => showToast(error.message));
});

elements.reviewHandNav.addEventListener("click", (event) => {
  const target = event.target.closest("[data-review-move]");
  if (!target) {
    return;
  }

  moveReviewSelection(Number(target.dataset.reviewMove)).catch((error) => showToast(error.message));
});

elements.handList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-hand-id]");
  if (!target) {
    return;
  }

  selectHand(target.dataset.handId).catch((error) => showToast(error.message));
});

elements.handDetail.addEventListener("click", (event) => {
  handleHandDetailClick(event, elements.handDetail).catch((error) => showToast(error.message));
});

elements.reviewHandDetail.addEventListener("click", (event) => {
  handleHandDetailClick(event, elements.reviewHandDetail, {
    reviewMode: true
  }).catch((error) => showToast(error.message));
});

elements.leakList.addEventListener("click", (event) => {
  const markTarget = event.target.closest("[data-queue-mark-reviewed], [data-queue-reopen]");
  if (markTarget) {
    const id = markTarget.dataset.queueMarkReviewed ?? markTarget.dataset.queueReopen;
    const reviewed = Boolean(markTarget.dataset.queueMarkReviewed);
    const hand = handById(id);

    if (!hand) {
      return;
    }

    saveHandReviewPatch(hand, {
      reviewed
    })
      .then(async () => {
        if (state.demoMode) {
          render();
        } else {
          await refresh({ quiet: true });
        }
        showToast(reviewed ? "Hand marked reviewed." : "Hand reopened.");
      })
      .catch((error) => showToast(error.message));
    return;
  }

  const target = event.target.closest("[data-review-spot-hand]");
  if (target) {
    openReviewView({
      handId: target.dataset.reviewSpotHand,
      startSession: true
    }).catch((error) => showToast(error.message));
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

  openReviewView({
    handId: target.dataset.studyPlanHand,
    startSession: true
  }).catch((error) => showToast(error.message));
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
    showToast(markWorkspaceSaved(`Deleted ${payload.removedHands} hands`));
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
    showToast(markWorkspaceSaved(`Linked ${payload.updatedHands} hands`));
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
    state.sessionDetailFilters = { ...emptySessionDetailFilters };
    state.bankrollImportPreview = payload;
    await refresh();
    renderBankrollImportPreview(payload);
    elements.bankrollImportStatus.textContent = bankrollImportSummary(payload);
    showToast(markWorkspaceSaved(bankrollImportSummary(payload).replace(/\.$/, "")));
  } catch (error) {
    elements.bankrollImportStatus.textContent = error.message;
    showToast(error.message);
  }
});

elements.workspaceRestoreFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const rawText = await readSelectedFile(file);
    elements.workspaceRestoreForm.elements.rawText.value = rawText;
    state.workspaceRestorePreview = null;
    renderWorkspaceRestorePreview();
    elements.workspaceRestoreStatus.textContent = `${file.name} loaded.`;
  } catch (error) {
    showToast(error.message);
  }
});

elements.clearWorkspaceRestore.addEventListener("click", () => {
  elements.workspaceRestoreForm.elements.rawText.value = "";
  elements.workspaceRestoreFile.value = "";
  elements.workspaceRestoreStatus.textContent = "";
  state.workspaceRestorePreview = null;
  renderWorkspaceRestorePreview();
});

elements.previewWorkspaceRestore.addEventListener("click", async () => {
  const rawText = elements.workspaceRestoreForm.elements.rawText.value;

  try {
    elements.workspaceRestoreStatus.textContent = "Building preview...";
    const payload = await api("/api/restore/workspace/preview", {
      method: "POST",
      body: {
        rawText
      }
    });
    state.workspaceRestorePreview = payload;
    renderWorkspaceRestorePreview(payload);
    elements.workspaceRestoreStatus.textContent = workspaceRestoreSummary(payload);
  } catch (error) {
    elements.workspaceRestoreStatus.textContent = error.message;
    showToast(error.message);
  }
});

elements.workspaceRestoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    elements.workspaceRestoreStatus.textContent = "Merging backup...";
    const payload = await api("/api/restore/workspace", {
      method: "POST",
      body: {
        rawText: form.get("rawText")
      }
    });
    state.workspaceRestorePreview = payload;
    await refresh();
    state.workspaceRestorePreview = payload;
    renderWorkspaceRestorePreview(payload);
    elements.workspaceRestoreStatus.textContent = workspaceRestoreSummary(payload, "restored");
    showToast(markWorkspaceSaved(workspaceRestoreSummary(payload, "restored")));
  } catch (error) {
    elements.workspaceRestoreStatus.textContent = error.message;
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
      }
    );
    state.selectedSessionId = payload.session.id;
    state.sessionDetailFilters = { ...emptySessionDetailFilters };
    await refresh();
    fillBankrollForm(sessionById(state.selectedSessionId) ?? payload.session);
    showToast(markWorkspaceSaved(`${editingSessionId ? "Saved" : "Added"} ${formatCurrency(payload.session.profit, { signed: true })} session`));
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
        state.sessionDetailFilters = { ...emptySessionDetailFilters };
        resetBankrollForm();
      }
      await refresh();
      showToast(markWorkspaceSaved(`Deleted ${formatCurrency(payload.session.profit, { signed: true })} session`));
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
      state.sessionDetailFilters = { ...emptySessionDetailFilters };
      fillBankrollForm(session);
      renderSessions();
    }
    return;
  }

  const rowTarget = event.target.closest("[data-select-bankroll-session]");
  if (rowTarget) {
    state.selectedSessionId = rowTarget.dataset.selectBankrollSession;
    state.sessionDetailFilters = { ...emptySessionDetailFilters };
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
    showToast(markWorkspaceSaved(`${editingTransactionId ? "Saved" : "Added"} ${formatCurrency(payload.transaction.amount, { signed: true })} transaction`));
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
      showToast(markWorkspaceSaved(`Deleted ${formatCurrency(payload.transaction.amount, { signed: true })} transaction`));
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

elements.exportSessionsCsv.addEventListener("click", exportSessionsCsv);
elements.exportTransactionsCsv.addEventListener("click", exportTransactionsCsv);
elements.exportWorkspaceJson.addEventListener("click", () => {
  exportWorkspaceJson().catch((error) => showToast(error.message));
});

elements.sessionDetail.addEventListener("click", (event) => {
  const queueTarget = event.target.closest("[data-export-session-queue]");
  if (queueTarget) {
    exportSessionQueueCsv(queueTarget.dataset.exportSessionQueue);
    return;
  }

  const summaryTarget = event.target.closest("[data-copy-session-summary]");
  if (summaryTarget) {
    copySessionSummary(summaryTarget.dataset.copySessionSummary).catch((error) => showToast(error.message));
    return;
  }

  const shareTarget = event.target.closest("[data-copy-session-share]");
  if (shareTarget) {
    copySessionShareLink(shareTarget.dataset.copySessionShare).catch((error) => showToast(error.message));
    return;
  }

  const reportTarget = event.target.closest("[data-export-session-report]");
  if (reportTarget) {
    exportSessionReviewReport(reportTarget.dataset.exportSessionReport);
    return;
  }

  const handsExportTarget = event.target.closest("[data-export-session-hands]");
  if (handsExportTarget) {
    exportSessionHandsCsv(handsExportTarget.dataset.exportSessionHands);
    return;
  }

  const reviewTarget = event.target.closest("[data-start-session-review]");
  if (reviewTarget) {
    openSessionReview(reviewTarget.dataset.startSessionReview).catch((error) => showToast(error.message));
    return;
  }

  const sessionReviewTarget = event.target.closest("[data-open-session-review-hand]");
  if (sessionReviewTarget) {
    openSessionReview(state.selectedSessionId, sessionReviewTarget.dataset.openSessionReviewHand).catch((error) => showToast(error.message));
    return;
  }

  const resetTarget = event.target.closest("[data-reset-session-hand-filters]");
  if (resetTarget) {
    state.sessionDetailFilters = { ...emptySessionDetailFilters };
    renderSessionDetail(filteredBankrollSessions());
    return;
  }

  const target = event.target.closest("[data-open-hand]");
  if (!target) {
    return;
  }

  setView("hands");
  selectHand(target.dataset.openHand).catch((error) => showToast(error.message));
});

elements.sessionDetail.addEventListener("change", (event) => {
  const shareTarget = event.target.closest("[data-session-share-option]");
  if (shareTarget) {
    state.sessionShareOptions[shareTarget.dataset.sessionShareOption] = shareTarget.checked;
    renderSessionDetail(filteredBankrollSessions());
    return;
  }

  const target = event.target.closest("[data-session-hand-filter]");
  if (!target) {
    return;
  }

  state.sessionDetailFilters[target.dataset.sessionHandFilter] = target.value;
  renderSessionDetail(filteredBankrollSessions());
});

elements.bankrollCancel.addEventListener("click", () => {
  state.selectedSessionId = null;
  state.sessionDetailFilters = { ...emptySessionDetailFilters };
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
      state.sessionDetailFilters = { ...emptySessionDetailFilters };
    }
    render();
    setView("hands");
    if (payload.hand?.id) {
      await Promise.all([
        loadSimilarHands(payload.hand.id),
        loadDecisionReview(payload.hand.id)
      ]);
    }
    showToast(payload.duplicate ? "Live hand was already saved." : markWorkspaceSaved("Live hand saved"));
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
          ? markWorkspaceSaved("Upload queued for parsing")
          : markWorkspaceSaved(`Imported ${payload.import.handCount} hands`)
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
    if (openSharedReviewFromHash()) {
      return;
    }
  } catch (error) {
    showToast(error.message);
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

window.addEventListener("hashchange", () => {
  try {
    if (openSharedReviewFromHash()) {
      return;
    }

    if (state.view === "shared") {
      state.sharedReview = null;
      state.showLanding = auth.enabled ? !auth.isSignedIn() : false;
      setView("overview");
      render();
    }
  } catch (error) {
    showToast(error.message);
  }
});

boot().catch((error) => showToast(error.message));
