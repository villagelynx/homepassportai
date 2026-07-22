import { initAuth, signIn, signOut, getSession, getUserEmail } from "./auth.js";
import { isSupabaseConfigured } from "./config.js";

const ADMIN_STATS_URL = "/api/admin/stats";

const FEATURE_LABELS = {
  appliance_added: "Appliance added",
  room_scanned: "Room scanned",
  document_saved: "Document saved",
  manual_lookup: "Manual lookup",
  inventory_viewed: "Inventory viewed",
  reports_viewed: "Reports viewed",
};

const DEFINITION_ORDER = [
  ["totalUsers", "Total Registered Users"],
  ["activeToday", "Active Today"],
  ["newUsersThisWeek", "New Users This Week"],
  ["homesCreated", "Homes Created"],
  ["roomsScanned", "Rooms Scanned"],
  ["appliancesAdded", "Appliances Added"],
  ["manualsUploaded", "Manual Lookups"],
  ["storageUsed", "Storage Used"],
  ["usersByCountry", "Users by Country"],
  ["mostUsedFeatures", "Most Used Features"],
  ["devices", "iPhone vs Android"],
  ["dailyGrowth", "Daily Growth Chart"],
];

const els = {
  configMissing: document.getElementById("admin-config-missing"),
  signinSection: document.getElementById("admin-signin"),
  signinForm: document.getElementById("admin-signin-form"),
  signinError: document.getElementById("admin-signin-error"),
  email: document.getElementById("admin-email"),
  password: document.getElementById("admin-password"),
  btnSignin: document.getElementById("btn-admin-signin"),
  denied: document.getElementById("admin-denied"),
  deniedMessage: document.getElementById("admin-denied-message"),
  btnDeniedSignout: document.getElementById("btn-admin-denied-signout"),
  dashboard: document.getElementById("admin-dashboard"),
  signedInAs: document.getElementById("admin-signed-in-as"),
  btnRefresh: document.getElementById("btn-admin-refresh"),
  btnSignout: document.getElementById("btn-admin-signout"),
  statsError: document.getElementById("admin-stats-error"),
  statsLoading: document.getElementById("admin-stats-loading"),
  analyticsNote: document.getElementById("admin-analytics-note"),
  statsGrid: document.getElementById("admin-stats-grid"),
  growthSection: document.getElementById("admin-growth"),
  growthChart: document.getElementById("admin-growth-chart"),
  countriesSection: document.getElementById("admin-countries"),
  countriesList: document.getElementById("admin-countries-list"),
  featuresSection: document.getElementById("admin-features"),
  featuresList: document.getElementById("admin-features-list"),
  devicesSection: document.getElementById("admin-devices"),
  devicesList: document.getElementById("admin-devices-list"),
  definitionsSection: document.getElementById("admin-definitions"),
  definitionsList: document.getElementById("admin-definitions-list"),
  generatedAt: document.getElementById("admin-generated-at"),
  statTotalUsers: document.getElementById("stat-total-users"),
  statActiveToday: document.getElementById("stat-active-today"),
  statNewWeek: document.getElementById("stat-new-week"),
  statHomes: document.getElementById("stat-homes"),
  statRoomsScanned: document.getElementById("stat-rooms-scanned"),
  statRoomsHint: document.getElementById("stat-rooms-hint"),
  statAppliances: document.getElementById("stat-appliances"),
  statManuals: document.getElementById("stat-manuals"),
  statStorage: document.getElementById("stat-storage"),
};

function showError(el, message) {
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat().format(Number(value));
}

function formatBytes(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatGeneratedAt(iso) {
  if (!iso) return "";
  try {
    return `Updated ${new Date(iso).toLocaleString()}`;
  } catch {
    return "";
  }
}

function setText(el, value) {
  if (el) el.textContent = value;
}

async function fetchAdminStats() {
  const session = getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sign in required.");

  const res = await fetch(ADMIN_STATS_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const error = new Error(payload?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return payload;
}

/** @param {HTMLElement | null} listEl @param {Array<{ label: string, value: string }>} rows @param {string} emptyText */
function renderKeyValueList(listEl, rows, emptyText) {
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "settings-note";
    empty.textContent = emptyText;
    listEl.append(empty);
    return;
  }
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "admin-recent-row";
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    item.append(label, value);
    listEl.append(item);
  }
}

/** @param {Array<{ date: string, count: number }>} rows */
function renderGrowthChart(rows) {
  if (!els.growthChart) return;
  els.growthChart.innerHTML = "";
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "settings-note";
    empty.textContent = "No signup data yet.";
    els.growthChart.append(empty);
    return;
  }

  const max = Math.max(...rows.map((row) => Number(row.count) || 0), 1);
  for (const row of rows) {
    const barWrap = document.createElement("div");
    barWrap.className = "admin-growth-bar";
    barWrap.title = `${row.date}: ${row.count}`;

    const fill = document.createElement("div");
    fill.className = "admin-growth-bar__fill";
    fill.style.height = `${Math.max(4, Math.round((Number(row.count) / max) * 100))}%`;

    const count = document.createElement("span");
    count.className = "admin-growth-bar__count";
    count.textContent = String(row.count);

    const label = document.createElement("span");
    label.className = "admin-growth-bar__label";
    label.textContent = row.date.slice(5);

    barWrap.append(count, fill, label);
    els.growthChart.append(barWrap);
  }
}

function renderDefinitions(definitions) {
  if (!els.definitionsList) return;
  els.definitionsList.innerHTML = "";
  for (const [key, title] of DEFINITION_ORDER) {
    const text = definitions?.[key];
    if (!text) continue;
    const item = document.createElement("li");
    item.innerHTML = `<strong>${title}:</strong> ${text}`;
    els.definitionsList.append(item);
  }
  if (els.definitionsSection) els.definitionsSection.hidden = els.definitionsList.children.length === 0;
}

function renderStats(stats) {
  setText(els.statTotalUsers, formatNumber(stats.totalUsers));
  setText(els.statActiveToday, formatNumber(stats.activeToday));
  setText(els.statNewWeek, formatNumber(stats.newUsersThisWeek));
  setText(els.statHomes, formatNumber(stats.homesCreated));
  setText(els.statAppliances, formatNumber(stats.appliancesAdded));
  setText(els.statManuals, formatNumber(stats.manualsUploaded));
  setText(els.statStorage, formatBytes(stats.storageBytes ?? stats.storageUsedBytes));

  if (stats.analyticsAvailable === false) {
    setText(els.statRoomsScanned, "—");
    setText(els.statRoomsHint, "Needs analytics migration");
    setText(els.statManuals, "—");
    if (els.analyticsNote) {
      els.analyticsNote.hidden = false;
      els.analyticsNote.textContent =
        "Analytics metrics are unavailable until you apply supabase/migrations/20260718000000_admin_analytics.sql.";
    }
  } else {
    setText(els.statRoomsScanned, formatNumber(stats.roomsScanned));
    const roomsWithItems =
      stats.roomsWithItems == null ? "" : ` · ${formatNumber(stats.roomsWithItems)} rooms with items`;
    setText(els.statRoomsHint, `Analytics events${roomsWithItems}`);
    if (els.analyticsNote) {
      els.analyticsNote.hidden = false;
      els.analyticsNote.textContent =
        "Country, device, feature, room-scan, and manual-lookup metrics accumulate going forward only.";
    }
  }

  const growth = Array.isArray(stats.dailyGrowth) ? stats.dailyGrowth : [];
  renderGrowthChart(growth);
  if (els.growthSection) els.growthSection.hidden = false;

  const countries = Array.isArray(stats.usersByCountry) ? stats.usersByCountry : [];
  renderKeyValueList(
    els.countriesList,
    countries.map((row) => ({
      label: row.countryCode,
      value: formatNumber(row.count),
    })),
    stats.analyticsAvailable === false
      ? "Apply the analytics migration to start collecting country data."
      : "No country data yet.",
  );
  if (els.countriesSection) els.countriesSection.hidden = false;

  const features = Array.isArray(stats.mostUsedFeatures) ? stats.mostUsedFeatures : [];
  renderKeyValueList(
    els.featuresList,
    features.map((row) => ({
      label: FEATURE_LABELS[row.name] || row.name,
      value: formatNumber(row.count),
    })),
    stats.analyticsAvailable === false
      ? "Apply the analytics migration to start collecting feature usage."
      : "No feature events yet.",
  );
  if (els.featuresSection) els.featuresSection.hidden = false;

  const devicesRaw = stats.devices || {};
  const devices = Array.isArray(devicesRaw)
    ? devicesRaw.reduce(
        (acc, row) => {
          const key =
            row?.device_type === "ios" || row?.deviceType === "ios"
              ? "ios"
              : row?.device_type === "android" || row?.deviceType === "android"
                ? "android"
                : "other";
          acc[key] += Number(row?.count || 0);
          return acc;
        },
        { ios: 0, android: 0, other: 0 },
      )
    : devicesRaw;
  renderKeyValueList(
    els.devicesList,
    [
      { label: "iPhone / iOS", value: formatNumber(devices.ios) },
      { label: "Android", value: formatNumber(devices.android) },
      { label: "Other", value: formatNumber(devices.other) },
    ],
    "No device data yet.",
  );
  if (els.devicesSection) els.devicesSection.hidden = false;

  renderDefinitions(stats.definitions || {});

  if (els.statsGrid) els.statsGrid.hidden = false;
  if (els.generatedAt) {
    els.generatedAt.textContent = formatGeneratedAt(stats.generatedAt);
    els.generatedAt.hidden = !stats.generatedAt;
  }
}

function hideDashboardPanels() {
  if (els.statsGrid) els.statsGrid.hidden = true;
  if (els.growthSection) els.growthSection.hidden = true;
  if (els.countriesSection) els.countriesSection.hidden = true;
  if (els.featuresSection) els.featuresSection.hidden = true;
  if (els.devicesSection) els.devicesSection.hidden = true;
  if (els.definitionsSection) els.definitionsSection.hidden = true;
  if (els.generatedAt) els.generatedAt.hidden = true;
  if (els.analyticsNote) els.analyticsNote.hidden = true;
}

async function loadStats() {
  showError(els.statsError, "");
  if (els.statsLoading) els.statsLoading.hidden = false;
  hideDashboardPanels();

  try {
    const stats = await fetchAdminStats();
    showDashboard();
    renderStats(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stats";
    const status = err && typeof err === "object" ? Number(err.status || 0) : 0;
    if (status === 403) {
      showDenied(message);
      return;
    }
    if (status === 401 || message.toLowerCase().includes("sign in")) {
      showSignin();
      showError(els.signinError, message);
      return;
    }
    showDashboard();
    showError(els.statsError, message);
  } finally {
    if (els.statsLoading) els.statsLoading.hidden = true;
  }
}

function showSignin() {
  if (els.signinSection) els.signinSection.hidden = false;
  if (els.dashboard) els.dashboard.hidden = true;
  if (els.denied) els.denied.hidden = true;
}

function showDenied(message) {
  if (els.signinSection) els.signinSection.hidden = true;
  if (els.dashboard) els.dashboard.hidden = true;
  if (els.denied) els.denied.hidden = false;
  if (els.deniedMessage && message) els.deniedMessage.textContent = message;
}

function showDashboard() {
  if (els.signinSection) els.signinSection.hidden = true;
  if (els.denied) els.denied.hidden = true;
  if (els.dashboard) els.dashboard.hidden = false;
  if (els.signedInAs) {
    els.signedInAs.textContent = `Signed in as ${getUserEmail()}`;
  }
}

async function boot() {
  if (!isSupabaseConfigured()) {
    if (els.configMissing) els.configMissing.hidden = false;
    return;
  }

  await initAuth();

  if (getSession()?.access_token) {
    showDashboard();
    await loadStats();
  } else {
    showSignin();
  }
}

els.signinForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(els.signinError, "");

  const email = els.email instanceof HTMLInputElement ? els.email.value.trim() : "";
  const password = els.password instanceof HTMLInputElement ? els.password.value : "";
  if (!email || !password) return;

  const submit = els.btnSignin;
  if (submit instanceof HTMLButtonElement) {
    submit.disabled = true;
    submit.textContent = "Signing in…";
  }

  try {
    await signIn(email, password);
    showDashboard();
    await loadStats();
  } catch (err) {
    showError(els.signinError, err instanceof Error ? err.message : "Sign in failed");
  } finally {
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = false;
      submit.textContent = "Sign in";
    }
  }
});

els.btnRefresh?.addEventListener("click", () => {
  void loadStats();
});

async function handleSignOut() {
  await signOut();
  showSignin();
  showError(els.statsError, "");
  hideDashboardPanels();
}

els.btnSignout?.addEventListener("click", () => {
  void handleSignOut();
});

els.btnDeniedSignout?.addEventListener("click", () => {
  void handleSignOut();
});

void boot();
