const state = {
  view: "overview",
  hands: [],
  imports: [],
  players: [],
  leaks: []
};

const elements = {
  title: document.querySelector("#page-title"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  views: [...document.querySelectorAll(".view")],
  loadDemo: document.querySelector("#load-demo"),
  refresh: document.querySelector("#refresh"),
  playerFilter: document.querySelector("#player-filter"),
  handPlayerFilter: document.querySelector("#hand-player-filter"),
  playerStats: document.querySelector("#player-stats"),
  leakList: document.querySelector("#leak-list"),
  handList: document.querySelector("#hand-list"),
  importList: document.querySelector("#import-list"),
  importForm: document.querySelector("#import-form"),
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
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json"
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
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
  elements.playerFilter.value = previous;
}

function renderPlayerStats() {
  const filteredPlayer = elements.playerFilter.value;
  const players = filteredPlayer
    ? state.players.filter((player) => player.player === filteredPlayer)
    : state.players;

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

function renderHands() {
  const filter = elements.handPlayerFilter.value.trim();
  const hands = filter
    ? state.hands.filter((hand) => hand.players.some((player) => player.name.toLowerCase().includes(filter.toLowerCase())))
    : state.hands;

  if (hands.length === 0) {
    elements.handList.innerHTML = '<div class="empty">No matching hands.</div>';
    return;
  }

  elements.handList.innerHTML = hands
    .map((hand) => {
      const heroCards = hand.hero ? hand.holeCards[hand.hero] : [];
      const winners = Object.keys(hand.winnings);
      return `
        <article class="hand">
          <div class="hand-title">
            <strong>#${escapeHtml(hand.handNumber)}</strong>
            <span class="pill">${escapeHtml(hand.tableName ?? "Table")}</span>
          </div>
          ${renderCards([...heroCards, ...hand.board])}
          <p>${escapeHtml(hand.hero ?? "Unknown")} ${heroCards?.length ? "was dealt" : "sat in"} ${escapeHtml(heroCards?.join(" ") ?? "")}. Winner: ${escapeHtml(winners.join(", ") || "not shown")}.</p>
        </article>
      `;
    })
    .join("");
}

function renderImports() {
  if (state.imports.length === 0) {
    elements.importList.innerHTML = '<div class="empty">No imports yet.</div>';
    return;
  }

  elements.importList.innerHTML = state.imports
    .map(
      (item) => `
        <article class="import-row">
          <strong>${escapeHtml(item.name)}</strong>
          <p>${item.handCount} hands from ${escapeHtml(item.source)} on ${new Date(item.importedAt).toLocaleString()}</p>
        </article>
      `
    )
    .join("");
}

function render() {
  renderMetrics();
  renderPlayerOptions();
  renderPlayerStats();
  renderLeaks();
  renderHands();
  renderImports();
}

async function refresh() {
  const [handsPayload, importsPayload, statsPayload, leaksPayload] = await Promise.all([
    api("/api/hands?limit=200"),
    api("/api/imports"),
    api("/api/stats/summary"),
    api("/api/leaks")
  ]);

  state.hands = handsPayload.hands;
  state.imports = importsPayload.imports;
  state.players = statsPayload.players;
  state.leaks = leaksPayload.leaks;
  render();
}

elements.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

elements.loadDemo.addEventListener("click", async () => {
  try {
    const payload = await api("/api/demo", { method: "POST" });
    await refresh();
    showToast(`Loaded ${payload.import.handCount} sample hands.`);
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

elements.playerFilter.addEventListener("change", renderPlayerStats);
elements.handPlayerFilter.addEventListener("input", renderHands);

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
    showToast(`Imported ${payload.import.handCount} hands.`);
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

refresh().catch((error) => showToast(error.message));
