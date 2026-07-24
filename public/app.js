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

const state = {
  view: "overview",
  hands: [],
  imports: [],
  players: [],
  leaks: [],
  selectedHandId: null,
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
  handList: document.querySelector("#hand-list"),
  handDetail: document.querySelector("#hand-detail"),
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
    leaks: document.querySelector("#metric-leaks")
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
  state.players = [];
  state.leaks = [];
  state.selectedHandId = null;
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

function renderHandDetail() {
  const hand = state.hands.find((item) => item.id === state.selectedHandId);

  if (!hand) {
    elements.handDetail.innerHTML = '<div class="empty">Select a hand to review the action.</div>';
    return;
  }

  const heroCards = hand.hero ? hand.holeCards[hand.hero] : [];
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
    ${renderCards([...heroCards, ...hand.board])}
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
  }

  if (!state.selectedHandId && state.hands.length > 0) {
    state.selectedHandId = state.hands[0].id;
  }

  renderMetrics();
  renderPlayerOptions();
  renderPlayerStats();
  renderCharts();
  renderLeaks();
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

  const [handsPayload, importsPayload, statsPayload, leaksPayload] = await Promise.all([
    api("/api/hands?limit=500"),
    api("/api/imports"),
    api("/api/stats/summary"),
    api("/api/leaks")
  ]);

  state.hands = handsPayload.hands;
  state.imports = importsPayload.imports;
  state.players = statsPayload.players;
  state.leaks = leaksPayload.leaks;
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
  renderHands();
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
