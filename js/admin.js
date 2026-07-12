import { initAuth, signIn, signOut, getSession, getUserEmail } from "./auth.js";
import { isSupabaseConfigured } from "./config.js";

const ADMIN_STATS_URL = "/api/admin/stats";

const els = {
  configMissing: document.getElementById("admin-config-missing"),
  signinSection: document.getElementById("admin-signin"),
  signinForm: document.getElementById("admin-signin-form"),
  signinError: document.getElementById("admin-signin-error"),
  email: document.getElementById("admin-email"),
  password: document.getElementById("admin-password"),
  btnSignin: document.getElementById("btn-admin-signin"),
  dashboard: document.getElementById("admin-dashboard"),
  signedInAs: document.getElementById("admin-signed-in-as"),
  btnRefresh: document.getElementById("btn-admin-refresh"),
  btnSignout: document.getElementById("btn-admin-signout"),
  statsError: document.getElementById("admin-stats-error"),
  statsLoading: document.getElementById("admin-stats-loading"),
  statsGrid: document.getElementById("admin-stats-grid"),
  recentSignupsSection: document.getElementById("admin-recent-signups"),
  recentSignupsList: document.getElementById("admin-recent-signups-list"),
  generatedAt: document.getElementById("admin-generated-at"),
  statTotalUsers: document.getElementById("stat-total-users"),
  statSignups7: document.getElementById("stat-signups-7"),
  statSignups30: document.getElementById("stat-signups-30"),
  statUsersInventory: document.getElementById("stat-users-inventory"),
  statTotalItems: document.getElementById("stat-total-items"),
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

function formatGeneratedAt(iso) {
  if (!iso) return "";
  try {
    return `Updated ${new Date(iso).toLocaleString()}`;
  } catch {
    return "";
  }
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
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }

  return payload;
}

function renderStats(stats) {
  if (els.statTotalUsers) els.statTotalUsers.textContent = formatNumber(stats.totalUsers);
  if (els.statSignups7) els.statSignups7.textContent = formatNumber(stats.signupsLast7Days);
  if (els.statSignups30) els.statSignups30.textContent = formatNumber(stats.signupsLast30Days);
  if (els.statUsersInventory) {
    els.statUsersInventory.textContent = formatNumber(stats.usersWithInventory);
  }
  if (els.statTotalItems) els.statTotalItems.textContent = formatNumber(stats.totalInventoryItems);

  if (els.recentSignupsList) {
    els.recentSignupsList.innerHTML = "";
    const rows = Array.isArray(stats.recentSignups) ? stats.recentSignups : [];
    if (rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "settings-note";
      empty.textContent = "No signups recorded yet.";
      els.recentSignupsList.append(empty);
    } else {
      for (const row of rows) {
        const item = document.createElement("div");
        item.className = "admin-recent-row";
        const date = document.createElement("span");
        date.textContent = row.date;
        const count = document.createElement("strong");
        count.textContent = formatNumber(row.count);
        item.append(date, count);
        els.recentSignupsList.append(item);
      }
    }
  }

  if (els.recentSignupsSection) els.recentSignupsSection.hidden = false;
  if (els.statsGrid) els.statsGrid.hidden = false;
  if (els.generatedAt) {
    els.generatedAt.textContent = formatGeneratedAt(stats.generatedAt);
    els.generatedAt.hidden = !stats.generatedAt;
  }
}

async function loadStats() {
  showError(els.statsError, "");
  if (els.statsLoading) els.statsLoading.hidden = false;
  if (els.statsGrid) els.statsGrid.hidden = true;
  if (els.recentSignupsSection) els.recentSignupsSection.hidden = true;
  if (els.generatedAt) els.generatedAt.hidden = true;

  try {
    const stats = await fetchAdminStats();
    renderStats(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stats";
    showError(els.statsError, message);
    if (message.toLowerCase().includes("sign in")) {
      showSignin();
    }
  } finally {
    if (els.statsLoading) els.statsLoading.hidden = true;
  }
}

function showSignin() {
  if (els.signinSection) els.signinSection.hidden = false;
  if (els.dashboard) els.dashboard.hidden = true;
}

function showDashboard() {
  if (els.signinSection) els.signinSection.hidden = true;
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

els.btnSignout?.addEventListener("click", () => {
  void (async () => {
    await signOut();
    showSignin();
    showError(els.statsError, "");
    if (els.statsGrid) els.statsGrid.hidden = true;
    if (els.recentSignupsSection) els.recentSignupsSection.hidden = true;
    if (els.generatedAt) els.generatedAt.hidden = true;
  })();
});

void boot();
