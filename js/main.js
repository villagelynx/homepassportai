import { manualSearchUrl, manualsLibSearchUrl } from "./manual-links.js";
import { clearApiKey, hasUserApiKey, loadApiKey, maskApiKey, saveApiKey } from "./api-key.js";
import { detectCurrentLocation, loadLocation, locationDisplayLabel, saveLocation } from "./location.js";
import { localRepairGoogleUrl, localRepairSearchUrl } from "./repair-links.js";
import { APP_VERSION, config, isSupabaseConfigured } from "./config.js";
import {
  getUserEmail,
  initAuth,
  isSignedIn,
  sendPasswordReset,
  setAuthListener,
  setRecoveryListener,
  signIn,
  signOut,
  signUp,
  updateUserPassword,
} from "./auth.js";
import { analyzeAppliancePhotos, analyzeLabelPhoto, analyzeRoomFrames, checkAnalyzeServer, readFileAsDataUrl } from "./analyze.js";
import { compressDataUrl } from "./image-compress.js";
import { hintForType } from "./label-hints.js";
import { initTheme, loadThemePreference, saveThemePreference } from "./theme.js";
import { loadRoomChipsEnabled, saveRoomChipsEnabled } from "./room-chips-prefs.js";
import { mapRoomGuess, populateRoomSelect, roomDisplayName, ROOM_ORDER } from "./rooms.js";
import {
  dismissInstallPrompt,
  installHintMode,
  isInstallDismissed,
  isStandaloneApp,
  resetInstallPrompt,
  shouldShowInstallPrompt,
} from "./install-prompt.js";
import { generateInsurancePdf } from "./insurance-report.js";
import { extractVideoFrames, ROOM_SCAN_MAX_SECONDS } from "./video-frames.js";
import {
  addAppliance,
  deleteAppliance,
  getAppliance,
  loadAppliances,
  importApplianceBackup,
  loadAllLegacyAppliances,
  migrateLocalInventoryIfNeeded,
  tryRecoverInventory,
  updateAppliance,
} from "./storage.js";

const views = {
  home: document.getElementById("view-home"),
  auth: document.getElementById("view-auth"),
  updatePassword: document.getElementById("view-update-password"),
  scanRoom: document.getElementById("view-scan-room"),
  roomReview: document.getElementById("view-room-review"),
  scan1: document.getElementById("view-scan-1"),
  scan2: document.getElementById("view-scan-2"),
  scan3: document.getElementById("view-scan-3"),
  review: document.getElementById("view-review"),
  settings: document.getElementById("view-settings"),
  detail: document.getElementById("view-detail"),
  editAppliance: document.getElementById("view-edit-appliance"),
};

const els = {
  buildTag: document.getElementById("build-tag"),
  applianceList: document.getElementById("appliance-list"),
  homeSearch: document.getElementById("home-search"),
  inputHomeSearch: document.getElementById("input-home-search"),
  btnClearHomeSearch: document.getElementById("btn-clear-home-search"),
  roomFilterChips: document.getElementById("room-filter-chips"),
  emptyState: document.getElementById("empty-state"),
  searchNoResults: document.getElementById("search-no-results"),
  btnSyncStatus: document.getElementById("btn-sync-status"),
  installBanner: document.getElementById("install-banner"),
  installBannerTitle: document.getElementById("install-banner-title"),
  installBannerLede: document.getElementById("install-banner-lede"),
  installBannerSteps: document.getElementById("install-banner-steps"),
  btnDismissInstall: document.getElementById("btn-dismiss-install"),
  btnAdd: document.getElementById("btn-add-appliance"),
  btnScanRoom: document.getElementById("btn-scan-room"),
  inputRoomVideo: document.getElementById("input-room-video"),
  previewRoomVideo: document.getElementById("preview-room-video"),
  roomScanStatus: document.getElementById("room-scan-status"),
  labelRoomVideo: document.getElementById("label-room-video"),
  btnClearRoomVideo: document.getElementById("btn-clear-room-video"),
  btnAnalyzeRoom: document.getElementById("btn-analyze-room"),
  fieldRoomScan: document.getElementById("field-room-scan"),
  roomReviewLede: document.getElementById("room-review-lede"),
  roomReviewList: document.getElementById("room-review-list"),
  roomReviewEmpty: document.getElementById("room-review-empty"),
  btnRoomSelectAll: document.getElementById("btn-room-select-all"),
  btnRoomSelectNone: document.getElementById("btn-room-select-none"),
  btnSaveRoomItems: document.getElementById("btn-save-room-items"),
  inputAppliance: document.getElementById("input-appliance-photo"),
  inputLabel: document.getElementById("input-label-photo"),
  previewAppliance: document.getElementById("preview-appliance"),
  previewLabel: document.getElementById("preview-label"),
  previewReceipt: document.getElementById("preview-receipt"),
  btnToStep2: document.getElementById("btn-to-step-2"),
  btnToStep3: document.getElementById("btn-to-step-3"),
  btnRetakeAppliance: document.getElementById("btn-retake-appliance"),
  btnRetakeLabel: document.getElementById("btn-retake-label"),
  btnRetakeReceipt: document.getElementById("btn-retake-receipt"),
  btnRetakeBoth: document.getElementById("btn-retake-both"),
  labelAppliancePhoto: document.getElementById("label-appliance-photo"),
  labelLabelPhoto: document.getElementById("label-label-photo"),
  labelReceiptPhoto: document.getElementById("label-receipt-photo"),
  inputReceipt: document.getElementById("input-receipt-photo"),
  btnAnalyze: document.getElementById("btn-analyze"),
  btnSkipReceipt: document.getElementById("btn-skip-receipt"),
  btnSkipLabel: document.getElementById("btn-skip-label"),
  labelHintText: document.getElementById("label-hint-text"),
  reviewPhotos: document.getElementById("review-photos"),
  reviewForm: document.getElementById("review-form"),
  fieldNickname: document.getElementById("field-nickname"),
  fieldRoom: document.getElementById("field-room"),
  fieldType: document.getElementById("field-type"),
  fieldBrand: document.getElementById("field-brand"),
  fieldModel: document.getElementById("field-model"),
  fieldSerial: document.getElementById("field-serial"),
  confidenceNote: document.getElementById("confidence-note"),
  detailTitle: document.getElementById("detail-title"),
  detailBody: document.getElementById("detail-body"),
  detailManuals: document.getElementById("detail-manuals"),
  detailRepair: document.getElementById("detail-repair"),
  detailLabelLede: document.getElementById("detail-label-lede"),
  previewDetailLabelPhoto: document.getElementById("preview-detail-label-photo"),
  labelDetailLabelPhoto: document.getElementById("label-detail-label-photo"),
  inputDetailLabelPhoto: document.getElementById("input-detail-label-photo"),
  btnClearDetailLabelPhoto: document.getElementById("btn-clear-detail-label-photo"),
  detailLabelReview: document.getElementById("detail-label-review"),
  detailLabelAnalyzeStatus: document.getElementById("detail-label-analyze-status"),
  detailLabelReviewForm: document.getElementById("detail-label-review-form"),
  detailLabelBrand: document.getElementById("detail-label-brand"),
  detailLabelModel: document.getElementById("detail-label-model"),
  detailLabelSerial: document.getElementById("detail-label-serial"),
  detailLabelBrandHint: document.getElementById("detail-label-brand-hint"),
  detailLabelModelHint: document.getElementById("detail-label-model-hint"),
  detailLabelSerialHint: document.getElementById("detail-label-serial-hint"),
  detailLabelConfidence: document.getElementById("detail-label-confidence"),
  btnCancelDetailLabelReview: document.getElementById("btn-cancel-detail-label-review"),
  btnShareAppliance: document.getElementById("btn-share-appliance"),
  btnEdit: document.getElementById("btn-edit-appliance"),
  btnDelete: document.getElementById("btn-delete-appliance"),
  editForm: document.getElementById("edit-appliance-form"),
  btnEditBack: document.getElementById("btn-edit-back"),
  editFieldNickname: document.getElementById("edit-field-nickname"),
  editFieldRoom: document.getElementById("edit-field-room"),
  editFieldType: document.getElementById("edit-field-type"),
  editFieldBrand: document.getElementById("edit-field-brand"),
  editFieldModel: document.getElementById("edit-field-model"),
  editFieldSerial: document.getElementById("edit-field-serial"),
  settingsForm: document.getElementById("settings-form"),
  fieldApiKey: document.getElementById("field-api-key"),
  fieldTheme: document.getElementById("field-theme"),
  fieldRoomChips: document.getElementById("field-room-chips"),
  apiKeyStatus: document.getElementById("api-key-status"),
  btnClearApiKey: document.getElementById("btn-clear-api-key"),
  settingsAccount: document.getElementById("settings-account"),
  settingsEmail: document.getElementById("settings-email"),
  btnSignOut: document.getElementById("btn-sign-out"),
  btnGoSignIn: document.getElementById("btn-go-sign-in"),
  btnRefreshVersion: document.getElementById("btn-refresh-version"),
  settingsInstall: document.getElementById("settings-install"),
  settingsInstallNote: document.getElementById("settings-install-note"),
  settingsInstallSteps: document.getElementById("settings-install-steps"),
  settingsInstallStandalone: document.getElementById("settings-install-standalone"),
  btnShowInstallCard: document.getElementById("btn-show-install-card"),
  authForm: document.getElementById("auth-form"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  btnAuthSubmit: document.getElementById("btn-auth-submit"),
  btnAuthToggle: document.getElementById("btn-auth-toggle"),
  btnAuthForgot: document.getElementById("btn-auth-forgot"),
  btnAuthOffline: document.getElementById("btn-auth-offline"),
  updatePasswordForm: document.getElementById("update-password-form"),
  newPassword: document.getElementById("new-password"),
  confirmPassword: document.getElementById("confirm-password"),
  btnUpdatePassword: document.getElementById("btn-update-password"),
  btnExportBackup: document.getElementById("btn-export-backup"),
  btnInsurancePdf: document.getElementById("btn-insurance-pdf"),
  btnRestoreBackup: document.getElementById("btn-restore-backup"),
  btnRestoreInventory: document.getElementById("btn-restore-inventory"),
  inputImportBackup: document.getElementById("input-import-backup"),
  toast: document.getElementById("toast"),
};

/** @type {{ appliancePhotoDataUrl: string | null, labelPhotoDataUrl: string | null, receiptPhotoDataUrl: string | null }} */
const scan = {
  appliancePhotoDataUrl: null,
  labelPhotoDataUrl: null,
  receiptPhotoDataUrl: null,
};

/**
 * @typedef {object} RoomCandidate
 * @property {string} id
 * @property {boolean} keep
 * @property {string} nickname
 * @property {string} applianceType
 * @property {string} brand
 * @property {string} modelNumber
 * @property {string} serialNumber
 * @property {string} confidence
 * @property {number} frameIndex
 * @property {string} photoDataUrl
 */

/** @type {{ videoUrl: string | null, frames: string[], candidates: RoomCandidate[], roomGuess: string }} */
const roomScan = {
  videoUrl: null,
  frames: [],
  candidates: [],
  roomGuess: "Other",
};

let detailId = null;
let toastTimer = 0;
let authMode = "signin";
let allowOfflineUse = false;
/** @type {"all" | string} */
let homeRoomFilter = "all";
let homeSearchQuery = "";

/** @type {{ dataUrl: string | null, suggestions: { brand: string, modelNumber: string, serialNumber: string } | null }} */
const detailLabelPending = {
  dataUrl: null,
  suggestions: null,
};

/** Secure contexts only (HTTPS / localhost). HTTP on iPhone needs a fallback. */
function newRecordId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `hp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

if (els.buildTag) els.buildTag.textContent = `Phase A · build ${APP_VERSION}`;

const arrivedViaPasswordReset =
  typeof location !== "undefined" && /(?:[#&?])type=recovery(?:&|$)/.test(location.hash + location.search);

void boot();

document.documentElement.dataset.hpReady = "pending";

function isLocalNetworkDev() {
  if (typeof location === "undefined") return false;
  const h = location.hostname;
  return h === "localhost" || h === "127.0.0.1" || /^192\.168\.\d+\.\d+$/.test(h);
}

async function boot() {
  try {
    initTheme();
    try {
      const params = new URLSearchParams(location.search);
      if (params.get("install") === "1") resetInstallPrompt();
    } catch {
      // ignore
    }
    init();
    clearBootError();
    document.documentElement.dataset.hpReady = "1";
    if (els.buildTag) els.buildTag.textContent = `Phase A · build ${APP_VERSION} · ready`;

    void probeAnalyzeServer();

    if (isSupabaseConfigured()) {
      try {
        setRecoveryListener(() => showView("updatePassword"));
        await initAuth();
        setAuthListener(() => {
          void onAuthChanged();
        });
      } catch (err) {
        console.error(err);
        toast(err instanceof Error ? err.message : "Could not connect to cloud");
        allowOfflineUse = true;
      }
    }

    if (arrivedViaPasswordReset && isSupabaseConfigured()) {
      showView("updatePassword");
      return;
    }

    await enterApp();
  } catch (err) {
    console.error(err);
    showBootError(err instanceof Error ? err.message : "App failed to load");
  }
}

async function probeAnalyzeServer() {
  if (!isLocalNetworkDev()) return;
  const ok = await checkAnalyzeServer();
  if (!ok) {
    toast("Mac server not reachable — run ./serve.sh on your Mac and keep Terminal open");
  }
}

/** @param {string} message */
function showBootError(message) {
  const el = document.getElementById("boot-error");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
}

function clearBootError() {
  const el = document.getElementById("boot-error");
  if (el) {
    el.hidden = true;
    el.textContent = "";
  }
  if (typeof window.__hpClearLoadError === "function") {
    window.__hpClearLoadError();
  }
}

async function enterApp() {
  if (isSupabaseConfigured() && !isSignedIn() && !allowOfflineUse) {
    if (els.btnAuthOffline) els.btnAuthOffline.hidden = false;
    updateSyncBanner();
    showView("auth");
    return;
  }

  if (isSignedIn()) {
    const migrated = await migrateLocalInventoryIfNeeded();
    if (migrated > 0) toast(`Synced ${migrated} appliance(s) to the cloud`);
  }

  await renderHome();
  updateSyncBanner();
  updateInstallBanner();
  showView("home");
}

async function onAuthChanged() {
  if (isSignedIn()) {
    const migrated = await migrateLocalInventoryIfNeeded();
    if (migrated > 0) toast(`Synced ${migrated} appliance(s) to the cloud`);
    await renderHome();
    updateSyncBanner();
    updateInstallBanner();
    return;
  }
  updateSyncBanner();
}

function init() {
  populateRoomSelect(els.fieldRoomScan);
  populateRoomSelect(els.fieldRoom);
  populateRoomSelect(els.editFieldRoom);
  els.btnAdd?.addEventListener("click", () => startScan());
  els.btnScanRoom?.addEventListener("click", () => startRoomScan());
  els.inputRoomVideo?.addEventListener("change", () => void onRoomVideoSelected());
  els.btnClearRoomVideo?.addEventListener("click", () => clearRoomVideo());
  els.btnAnalyzeRoom?.addEventListener("click", () => void runRoomAnalysis());
  els.btnRoomSelectAll?.addEventListener("click", () => setAllRoomKeep(true));
  els.btnRoomSelectNone?.addEventListener("click", () => setAllRoomKeep(false));
  els.btnSaveRoomItems?.addEventListener("click", () => void saveRoomItems());
  els.inputAppliance?.addEventListener("change", () => void onAppliancePhoto());
  els.btnRetakeAppliance?.addEventListener("click", () => clearAppliancePhoto());
  els.btnToStep2?.addEventListener("click", () => {
    if (els.labelHintText) {
      els.labelHintText.textContent = hintForType(els.fieldType?.value || "");
    }
    if (els.btnToStep3) els.btnToStep3.disabled = false;
    showView("scan2");
  });
  els.inputLabel?.addEventListener("change", () => void onLabelPhoto());
  els.btnRetakeLabel?.addEventListener("click", () => clearLabelPhoto());
  els.btnToStep3?.addEventListener("click", () => showView("scan3"));
  els.btnSkipLabel?.addEventListener("click", () => {
    scan.labelPhotoDataUrl = null;
    if (els.inputLabel) els.inputLabel.value = "";
    setPreview(els.previewLabel, null);
    updateCaptureButtons();
    showView("scan3");
  });
  els.inputReceipt?.addEventListener("change", () => void onReceiptPhoto());
  els.btnRetakeReceipt?.addEventListener("click", () => clearReceiptPhoto());
  els.btnSkipReceipt?.addEventListener("click", () => {
    scan.receiptPhotoDataUrl = null;
    setPreview(els.previewReceipt, null);
    updateCaptureButtons();
    void runAnalysis();
  });
  els.btnRetakeBoth?.addEventListener("click", () => {
    resetScan();
    showView("scan1");
    toast("Photos cleared — start over");
  });
  els.btnAnalyze?.addEventListener("click", () => void runAnalysis());
  els.reviewForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    void saveRecord();
  });
  els.btnDelete?.addEventListener("click", () => void removeDetail());
  els.inputDetailLabelPhoto?.addEventListener("change", () => void onDetailLabelPhotoSelected());
  els.btnClearDetailLabelPhoto?.addEventListener("click", () => clearDetailLabelPhoto());
  els.detailLabelReviewForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    void saveDetailLabelReview();
  });
  els.btnCancelDetailLabelReview?.addEventListener("click", () => cancelDetailLabelReview());
  els.btnShareAppliance?.addEventListener("click", () => void shareCurrentAppliance());
  els.inputHomeSearch?.addEventListener("input", () => {
    homeSearchQuery = els.inputHomeSearch?.value.trim() ?? "";
    updateHomeSearchClearButton();
    void renderHome();
  });
  els.btnClearHomeSearch?.addEventListener("click", () => {
    homeSearchQuery = "";
    if (els.inputHomeSearch) els.inputHomeSearch.value = "";
    updateHomeSearchClearButton();
    void renderHome();
    els.inputHomeSearch?.focus();
  });
  els.btnEdit?.addEventListener("click", () => void openEditAppliance());
  els.btnEditBack?.addEventListener("click", () => {
    if (detailId) void openDetail(detailId);
    else showView("home");
  });
  els.editForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    void saveEditAppliance();
  });
  els.settingsForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettingsApiKey();
  });
  els.fieldTheme?.addEventListener("change", () => {
    const value = els.fieldTheme?.value;
    if (value === "system" || value === "light" || value === "dark") {
      saveThemePreference(value);
      toast(value === "light" ? "Daylight mode on" : value === "dark" ? "Dark mode on" : "Using system appearance");
    }
  });
  els.fieldRoomChips?.addEventListener("change", () => {
    const enabled = els.fieldRoomChips?.checked ?? true;
    saveRoomChipsEnabled(enabled);
    if (!enabled) homeRoomFilter = "all";
    toast(enabled ? "Room filter chips on" : "Room filter chips off");
    void renderHome();
  });
  els.btnClearApiKey?.addEventListener("click", () => clearSettingsApiKey());
  els.btnSignOut?.addEventListener("click", () => void handleSignOut());
  els.btnSyncStatus?.addEventListener("click", () => {
    if (!isSupabaseConfigured()) return;
    if (isSignedIn()) {
      renderSettings();
      showView("settings");
      return;
    }
    showView("auth");
  });
  els.btnGoSignIn?.addEventListener("click", () => showView("auth"));
  els.btnRefreshVersion?.addEventListener("click", () => refreshToLatestVersion());
  els.authForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    void handleAuthSubmit();
  });
  els.btnAuthToggle?.addEventListener("click", () => toggleAuthMode());
  els.btnAuthForgot?.addEventListener("click", () => void handleForgotPassword());
  els.updatePasswordForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    void handleUpdatePassword();
  });
  els.btnAuthOffline?.addEventListener("click", () => {
    allowOfflineUse = true;
    void enterApp();
  });

  for (const toggle of document.querySelectorAll("[data-toggle-password]")) {
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-toggle-password");
      const input = targetId ? document.getElementById(targetId) : null;
      if (!(input instanceof HTMLInputElement)) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.classList.toggle("is-visible", show);
      toggle.setAttribute("aria-pressed", String(show));
      const label = toggle.getAttribute("aria-label") || "";
      if (label.startsWith("Show")) toggle.setAttribute("aria-label", label.replace("Show", "Hide"));
      else if (label.startsWith("Hide")) toggle.setAttribute("aria-label", label.replace("Hide", "Show"));
    });
  }
  els.btnExportBackup?.addEventListener("click", () => exportBackup());
  els.btnInsurancePdf?.addEventListener("click", () => void exportInsuranceReport());
  els.btnRestoreBackup?.addEventListener("click", () => void restoreInventory());
  els.btnRestoreInventory?.addEventListener("click", () => void restoreInventory());
  els.inputImportBackup?.addEventListener("change", () => void importBackupFile());
  els.btnDismissInstall?.addEventListener("click", () => {
    dismissInstallPrompt();
    updateInstallBanner();
    renderInstallSettings();
  });
  els.btnShowInstallCard?.addEventListener("click", () => {
    resetInstallPrompt();
    updateInstallBanner();
    renderInstallSettings();
    toast("Tip will show on home");
    void renderHome().then(() => showView("home"));
  });

  for (const btn of document.querySelectorAll("[data-nav]")) {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target === "home") {
        resetScan();
        resetRoomScan();
        void renderHome().then(() => {
          updateSyncBanner();
          showView("home");
        });
      } else if (target === "scan-room") {
        showView("scanRoom");
      } else if (target === "scan-1") {
        showView("scan1");
      } else if (target === "scan-2") {
        showView("scan2");
      } else if (target === "scan-3") {
        showView("scan3");
      } else if (target === "settings") {
        renderSettings();
        showView("settings");
      }
    });
  }
}

function toggleAuthMode() {
  authMode = authMode === "signin" ? "signup" : "signin";
  if (els.btnAuthSubmit) {
    els.btnAuthSubmit.textContent = authMode === "signin" ? "Sign in" : "Create account";
  }
  if (els.btnAuthToggle) {
    els.btnAuthToggle.textContent = authMode === "signin" ? "Create an account" : "Already have an account? Sign in";
  }
}

async function handleAuthSubmit() {
  const email = els.authEmail?.value.trim() ?? "";
  const password = els.authPassword?.value ?? "";
  if (!email || !password) return;

  const submit = els.btnAuthSubmit;
  if (submit instanceof HTMLButtonElement) {
    submit.disabled = true;
    submit.textContent = authMode === "signin" ? "Signing in…" : "Creating account…";
  }

  try {
    if (authMode === "signin") {
      await signIn(email, password);
      toast("Signed in");
    } else {
      const session = await signUp(email, password);
      if (!session) {
        toast("Account created — check your email to confirm, then sign in");
        authMode = "signin";
        toggleAuthMode();
        return;
      }
      toast("Account created — you are signed in");
    }
    allowOfflineUse = false;
    await enterApp();
  } catch (err) {
    toast(err instanceof Error ? err.message : "Authentication failed");
  } finally {
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = false;
      submit.textContent = authMode === "signin" ? "Sign in" : "Create account";
    }
  }
}

async function handleForgotPassword() {
  const email = els.authEmail?.value.trim() ?? "";
  if (!email) {
    toast("Enter your email above, then tap Forgot password");
    els.authEmail?.focus();
    return;
  }

  const btn = els.btnAuthForgot;
  if (btn instanceof HTMLButtonElement) btn.disabled = true;

  try {
    await sendPasswordReset(email);
    toast("Password reset email sent — check your inbox");
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not send reset email");
  } finally {
    if (btn instanceof HTMLButtonElement) btn.disabled = false;
  }
}

async function handleUpdatePassword() {
  const password = els.newPassword?.value ?? "";
  const confirm = els.confirmPassword?.value ?? "";

  if (password.length < 6) {
    toast("Password must be at least 6 characters");
    return;
  }
  if (password !== confirm) {
    toast("Passwords do not match");
    return;
  }

  const btn = els.btnUpdatePassword;
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = true;
    btn.textContent = "Updating…";
  }

  try {
    await updateUserPassword(password);
    if (els.newPassword) els.newPassword.value = "";
    if (els.confirmPassword) els.confirmPassword.value = "";
    if (typeof history !== "undefined" && history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search.replace(/[?&]type=recovery/, ""));
    }
    toast("Password updated — you're signed in");
    allowOfflineUse = false;
    await enterApp();
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not update password");
  } finally {
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = false;
      btn.textContent = "Update password";
    }
  }
}

async function handleSignOut() {
  if (!confirm("Sign out on this device?")) return;
  await signOut();
  allowOfflineUse = false;
  await renderHome();
  updateSyncBanner();
  showView("auth");
  toast("Signed out");
}

function updateSyncBanner() {
  if (!els.btnSyncStatus) return;
  if (!isSupabaseConfigured()) {
    els.btnSyncStatus.hidden = true;
    return;
  }
  els.btnSyncStatus.hidden = false;
  els.btnSyncStatus.classList.remove("is-online", "is-offline");
  if (isSignedIn()) {
    els.btnSyncStatus.classList.add("is-online");
    const email = getUserEmail();
    els.btnSyncStatus.setAttribute("aria-label", `Synced as ${email}`);
    els.btnSyncStatus.title = `Synced as ${email}`;
    return;
  }
  els.btnSyncStatus.classList.add("is-offline");
  els.btnSyncStatus.setAttribute("aria-label", "Offline on this device. Tap to sign in.");
  els.btnSyncStatus.title = "Offline on this device. Tap to sign in.";
}

function installInstructionsHtml() {
  if (installHintMode() === "ios") {
    return [
      'Tap <strong>Share</strong> <span class="install-banner__share" aria-hidden="true">□↑</span> in Safari',
      "Tap <strong>Add to Home Screen</strong>",
      "Tap <strong>Add</strong>",
    ];
  }
  return [
    "On your iPhone, open this site in <strong>Safari</strong>",
    'Tap <strong>Share</strong> <span class="install-banner__share" aria-hidden="true">□↑</span>',
    "Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>",
  ];
}

function fillInstallSteps(listEl, steps) {
  if (!listEl) return;
  listEl.innerHTML = steps.map((step) => `<li>${step}</li>`).join("");
}

function updateInstallBanner() {
  if (!els.installBanner) return;
  const show = shouldShowInstallPrompt();
  els.installBanner.hidden = !show;
  if (!show) return;

  const ios = installHintMode() === "ios";
  if (els.installBannerTitle) {
    els.installBannerTitle.textContent = ios
      ? "Add HomePassportAI to your iPhone"
      : "Add HomePassportAI on iPhone";
  }
  if (els.installBannerLede) {
    els.installBannerLede.textContent = ios
      ? "Open like an app from your home screen — same blue house icon."
      : "Use Safari on your iPhone to add the blue house icon to your home screen.";
  }
  fillInstallSteps(els.installBannerSteps, installInstructionsHtml());
}

function renderInstallSettings() {
  const standalone = isStandaloneApp();
  const ios = installHintMode() === "ios";

  if (els.settingsInstallStandalone) {
    els.settingsInstallStandalone.hidden = !standalone;
  }
  if (els.settingsInstallNote) {
    els.settingsInstallNote.hidden = standalone;
    if (!standalone) {
      els.settingsInstallNote.textContent = ios
        ? "Open HomePassportAI like an app — same blue house icon on your home screen."
        : "On your iPhone, open HomePassportAI in Safari, then add it to your home screen.";
    }
  }
  if (els.settingsInstallSteps) {
    els.settingsInstallSteps.hidden = standalone;
    if (!standalone) fillInstallSteps(els.settingsInstallSteps, installInstructionsHtml());
  }
  if (els.btnShowInstallCard) {
    els.btnShowInstallCard.hidden = standalone || !ios || !isInstallDismissed();
  }
}

function requireCloudSave() {
  if (isSupabaseConfigured() && !isSignedIn() && !allowOfflineUse) {
    toast("Sign in to save to the cloud");
    showView("auth");
    return false;
  }
  return true;
}

function startScan() {
  if (!requireCloudSave()) return;
  resetScan();
  showView("scan1");
}

function startRoomScan() {
  if (!requireCloudSave()) return;
  resetRoomScan();
  showView("scanRoom");
}

function resetRoomScan() {
  if (roomScan.videoUrl) {
    URL.revokeObjectURL(roomScan.videoUrl);
  }
  roomScan.videoUrl = null;
  roomScan.frames = [];
  roomScan.candidates = [];
  roomScan.roomGuess = "Other";
  if (els.inputRoomVideo) els.inputRoomVideo.value = "";
  setRoomVideoPreview(null);
  setRoomScanStatus("");
  if (els.btnAnalyzeRoom) els.btnAnalyzeRoom.disabled = true;
  if (els.btnClearRoomVideo) els.btnClearRoomVideo.hidden = true;
  setCaptureLabelText(els.labelRoomVideo, "Record room video");
  if (els.roomReviewList) els.roomReviewList.innerHTML = "";
  if (els.btnSaveRoomItems) els.btnSaveRoomItems.disabled = true;
}

/** @param {string | null} url */
function setRoomVideoPreview(url) {
  const container = els.previewRoomVideo;
  if (!container) return;
  container.innerHTML = "";
  if (!url) {
    container.classList.add("capture-card__preview--empty");
    const span = document.createElement("span");
    span.textContent = "No video yet";
    container.append(span);
    return;
  }
  container.classList.remove("capture-card__preview--empty");
  const video = document.createElement("video");
  video.src = url;
  video.controls = true;
  video.playsInline = true;
  video.muted = true;
  video.setAttribute("playsinline", "");
  container.append(video);
}

/** @param {string} text */
function setRoomScanStatus(text) {
  if (!els.roomScanStatus) return;
  if (!text) {
    els.roomScanStatus.hidden = true;
    els.roomScanStatus.textContent = "";
    return;
  }
  els.roomScanStatus.hidden = false;
  els.roomScanStatus.textContent = text;
}

function clearRoomVideo() {
  resetRoomScan();
  toast("Video cleared");
}

async function onRoomVideoSelected() {
  const file = els.inputRoomVideo?.files?.[0];
  if (!file) return;

  if (roomScan.videoUrl) URL.revokeObjectURL(roomScan.videoUrl);
  roomScan.videoUrl = URL.createObjectURL(file);
  roomScan.frames = [];
  roomScan.candidates = [];
  setRoomVideoPreview(roomScan.videoUrl);
  if (els.btnClearRoomVideo) els.btnClearRoomVideo.hidden = false;
  setCaptureLabelText(els.labelRoomVideo, "Re-record room video");
  if (els.btnAnalyzeRoom) els.btnAnalyzeRoom.disabled = true;
  setRoomScanStatus("Pulling still frames from your video…");

  try {
    const { frames, durationSeconds, truncated } = await extractVideoFrames(file);
    roomScan.frames = frames;
    if (els.btnAnalyzeRoom) els.btnAnalyzeRoom.disabled = frames.length < 2;
    const seconds = Math.round(durationSeconds);
    setRoomScanStatus(
      truncated
        ? `Using first ${ROOM_SCAN_MAX_SECONDS}s · ${frames.length} frames ready`
        : `${seconds}s video · ${frames.length} frames ready`
    );
  } catch (err) {
    roomScan.frames = [];
    if (els.btnAnalyzeRoom) els.btnAnalyzeRoom.disabled = true;
    setRoomScanStatus("");
    toast(err instanceof Error ? err.message : "Could not read video");
  }
}

async function runRoomAnalysis() {
  if (roomScan.frames.length < 2) {
    toast("Record a short room video first");
    return;
  }

  const btn = els.btnAnalyzeRoom;
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = true;
    btn.textContent = "Analyzing room…";
  }
  setRoomScanStatus("AI is spotting items in your room…");

  try {
    const result = await analyzeRoomFrames(roomScan.frames);
    roomScan.roomGuess = mapRoomGuess(result.roomGuess);
    roomScan.candidates = result.items.map((item, i) => {
      const frameIndex = Math.max(0, Math.min(roomScan.frames.length - 1, item.frameIndex || 0));
      return {
        id: `room-${i}-${newRecordId()}`,
        keep: true,
        nickname: item.nickname,
        applianceType: item.applianceType,
        brand: item.brand,
        modelNumber: item.modelNumber,
        serialNumber: item.serialNumber,
        confidence: item.confidence,
        frameIndex,
        photoDataUrl: roomScan.frames[frameIndex],
      };
    });

    populateRoomSelect(els.fieldRoomScan, roomScan.roomGuess);
    if (els.roomReviewLede) {
      els.roomReviewLede.textContent = result.demoMode
        ? "Demo mode (no OpenAI key) — sample items shown. Check ones to keep, then save."
        : `Found ${roomScan.candidates.length} item${roomScan.candidates.length === 1 ? "" : "s"}. Check the ones to keep.`;
    }
    renderRoomReview();
    showView("roomReview");
    if (result.demoMode) toast("Demo mode — add an OpenAI key in Settings for real room scans");
  } catch (err) {
    toast(err instanceof Error ? err.message : "Room analysis failed");
  } finally {
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = roomScan.frames.length < 2;
      btn.textContent = "Analyze room video";
    }
  }
}

function renderRoomReview() {
  const list = els.roomReviewList;
  if (!list) return;
  list.innerHTML = "";

  const hasItems = roomScan.candidates.length > 0;
  if (els.roomReviewEmpty) els.roomReviewEmpty.hidden = hasItems;
  updateRoomSaveButton();

  for (const item of roomScan.candidates) {
    const card = document.createElement("label");
    card.className = "room-review-card";
    card.setAttribute("role", "listitem");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "room-review-card__check";
    check.checked = item.keep;
    check.addEventListener("change", () => {
      item.keep = check.checked;
      updateRoomSaveButton();
    });

    const img = document.createElement("img");
    img.className = "room-review-card__thumb";
    img.src = item.photoDataUrl;
    img.alt = "";

    const body = document.createElement("div");
    body.className = "room-review-card__body";

    const nickname = document.createElement("input");
    nickname.type = "text";
    nickname.className = "input";
    nickname.value = item.nickname;
    nickname.placeholder = "Nickname";
    nickname.addEventListener("input", () => {
      item.nickname = nickname.value;
    });

    const type = document.createElement("input");
    type.type = "text";
    type.className = "input";
    type.value = item.applianceType;
    type.placeholder = "Type";
    type.addEventListener("input", () => {
      item.applianceType = type.value;
    });

    const brand = document.createElement("input");
    brand.type = "text";
    brand.className = "input";
    brand.value = item.brand;
    brand.placeholder = "Brand (optional)";
    brand.addEventListener("input", () => {
      item.brand = brand.value;
      updateRoomMeta(meta, item);
    });

    const model = document.createElement("input");
    model.type = "text";
    model.className = "input";
    model.value = item.modelNumber;
    model.placeholder = "Model number (optional)";
    model.addEventListener("input", () => {
      item.modelNumber = model.value;
      updateRoomMeta(meta, item);
    });

    const serial = document.createElement("input");
    serial.type = "text";
    serial.className = "input";
    serial.value = item.serialNumber;
    serial.placeholder = "Serial number (optional)";
    serial.addEventListener("input", () => {
      item.serialNumber = serial.value;
      updateRoomMeta(meta, item);
    });

    const meta = document.createElement("p");
    meta.className = "room-review-card__meta";
    updateRoomMeta(meta, item);

    body.append(nickname, type, brand, model, serial, meta);
    card.append(check, img, body);
    list.append(card);
  }
}

/** @param {HTMLElement} meta @param {RoomCandidate} item */
function updateRoomMeta(meta, item) {
  const bits = [item.brand, item.modelNumber, item.serialNumber, item.confidence ? `${item.confidence} confidence` : ""]
    .filter(Boolean)
    .join(" · ");
  meta.textContent = bits || "From room video";
}

/** @param {boolean} keep */
function setAllRoomKeep(keep) {
  for (const item of roomScan.candidates) item.keep = keep;
  renderRoomReview();
}

function updateRoomSaveButton() {
  if (!els.btnSaveRoomItems) return;
  const count = roomScan.candidates.filter((c) => c.keep).length;
  els.btnSaveRoomItems.disabled = count === 0;
  els.btnSaveRoomItems.textContent =
    count === 0 ? "Save selected items" : `Save ${count} selected item${count === 1 ? "" : "s"}`;
}

async function saveRoomItems() {
  const kept = roomScan.candidates.filter((c) => c.keep);
  if (kept.length === 0) {
    toast("Check at least one item to keep");
    return;
  }

  const room = els.fieldRoomScan?.value || roomScan.roomGuess || "Other";
  const btn = els.btnSaveRoomItems;
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }

  try {
    let saved = 0;
    for (const item of kept) {
      const photo = await compressDataUrl(item.photoDataUrl);
      const type = item.applianceType.trim() || "Item";
      const brand = item.brand.trim();
      const nickname =
        item.nickname.trim() ||
        [brand, type].filter(Boolean).join(" ").trim() ||
        `${room} item`;

      await addAppliance({
        id: newRecordId(),
        nickname,
        room,
        applianceType: type,
        brand,
        modelNumber: item.modelNumber.trim(),
        serialNumber: item.serialNumber.trim(),
        appliancePhotoDataUrl: photo,
        labelPhotoDataUrl: null,
        receiptPhotoDataUrl: null,
        confidence: item.confidence || "room-video",
        scannedAt: new Date().toISOString(),
        repairCompany: null,
      });
      saved += 1;
    }

    resetRoomScan();
    await renderHome();
    updateSyncBanner();
    showView("home");
    toast(`Saved ${saved} item${saved === 1 ? "" : "s"} from room scan`);
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not save room items");
    updateRoomSaveButton();
  }
}

/** @param {keyof typeof views} name */
function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    if (!el) continue;
    const active = key === name;
    el.hidden = !active;
    el.classList.toggle("view--active", active);
  }
}

function resetScan() {
  scan.appliancePhotoDataUrl = null;
  scan.labelPhotoDataUrl = null;
  scan.receiptPhotoDataUrl = null;
  setPreview(els.previewAppliance, null);
  setPreview(els.previewLabel, null);
  setPreview(els.previewReceipt, null);
  if (els.btnToStep2) els.btnToStep2.disabled = true;
  if (els.btnToStep3) els.btnToStep3.disabled = true;
  if (els.inputAppliance) els.inputAppliance.value = "";
  if (els.inputLabel) els.inputLabel.value = "";
  if (els.inputReceipt) els.inputReceipt.value = "";
  if (els.labelHintText) {
    els.labelHintText.textContent =
      "After your appliance photo, we’ll show where the label is usually located.";
  }
  if (els.confidenceNote) els.confidenceNote.hidden = true;
  updateCaptureButtons();
}

function updateCaptureButtons() {
  const hasAppliance = Boolean(scan.appliancePhotoDataUrl);
  const hasLabel = Boolean(scan.labelPhotoDataUrl);
  const hasReceipt = Boolean(scan.receiptPhotoDataUrl);

  if (els.btnRetakeAppliance) els.btnRetakeAppliance.hidden = !hasAppliance;
  if (els.btnRetakeLabel) els.btnRetakeLabel.hidden = !hasLabel;
  if (els.btnRetakeReceipt) els.btnRetakeReceipt.hidden = !hasReceipt;

  setCaptureLabelText(
    els.labelAppliancePhoto,
    hasAppliance ? "Retake appliance photo" : "Take appliance photo"
  );
  setCaptureLabelText(
    els.labelLabelPhoto,
    hasLabel ? "Retake label photo" : "Take label photo"
  );
  setCaptureLabelText(
    els.labelReceiptPhoto,
    hasReceipt ? "Retake receipt photo" : "Take receipt photo"
  );
}

/** @param {HTMLElement | null} labelEl @param {string} text */
function setCaptureLabelText(labelEl, text) {
  if (!labelEl) return;
  const input = labelEl.querySelector("input");
  labelEl.textContent = "";
  if (input) labelEl.appendChild(input);
  labelEl.appendChild(document.createTextNode(text));
}

function clearAppliancePhoto() {
  scan.appliancePhotoDataUrl = null;
  scan.labelPhotoDataUrl = null;
  scan.receiptPhotoDataUrl = null;
  if (els.inputAppliance) els.inputAppliance.value = "";
  if (els.inputLabel) els.inputLabel.value = "";
  if (els.inputReceipt) els.inputReceipt.value = "";
  setPreview(els.previewAppliance, null);
  setPreview(els.previewLabel, null);
  setPreview(els.previewReceipt, null);
  if (els.btnToStep2) els.btnToStep2.disabled = true;
  if (els.btnToStep3) els.btnToStep3.disabled = false;
  updateCaptureButtons();
  toast("Appliance photo cleared");
}

function clearLabelPhoto() {
  scan.labelPhotoDataUrl = null;
  scan.receiptPhotoDataUrl = null;
  if (els.inputLabel) els.inputLabel.value = "";
  if (els.inputReceipt) els.inputReceipt.value = "";
  setPreview(els.previewLabel, null);
  setPreview(els.previewReceipt, null);
  updateCaptureButtons();
  toast("Label photo cleared");
}

function clearReceiptPhoto() {
  scan.receiptPhotoDataUrl = null;
  if (els.inputReceipt) els.inputReceipt.value = "";
  setPreview(els.previewReceipt, null);
  updateCaptureButtons();
  toast("Receipt photo cleared");
}

/** @param {HTMLElement | null} container @param {string | null} dataUrl */
function setPreview(container, dataUrl) {
  if (!container) return;
  container.innerHTML = "";
  if (!dataUrl) {
    container.classList.add("capture-card__preview--empty");
    const span = document.createElement("span");
    span.textContent = "No photo yet";
    container.append(span);
    return;
  }
  container.classList.remove("capture-card__preview--empty");
  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "";
  container.append(img);
}

async function onAppliancePhoto() {
  const file = els.inputAppliance?.files?.[0];
  if (!file) return;
  scan.appliancePhotoDataUrl = await readFileAsDataUrl(file);
  setPreview(els.previewAppliance, scan.appliancePhotoDataUrl);
  if (els.btnToStep2) els.btnToStep2.disabled = false;
  updateCaptureButtons();
}

async function onLabelPhoto() {
  const file = els.inputLabel?.files?.[0];
  if (!file) return;
  scan.labelPhotoDataUrl = await readFileAsDataUrl(file);
  setPreview(els.previewLabel, scan.labelPhotoDataUrl);
  updateCaptureButtons();
}

async function onReceiptPhoto() {
  const file = els.inputReceipt?.files?.[0];
  if (!file) return;
  scan.receiptPhotoDataUrl = await readFileAsDataUrl(file);
  setPreview(els.previewReceipt, scan.receiptPhotoDataUrl);
  updateCaptureButtons();
}

async function runAnalysis() {
  if (!scan.appliancePhotoDataUrl) return;

  if (els.btnAnalyze) {
    els.btnAnalyze.disabled = true;
    els.btnAnalyze.textContent = "Analyzing…";
  }

  try {
    const appliancePhoto = await compressDataUrl(scan.appliancePhotoDataUrl, {
      maxEdge: 960,
      quality: 0.72,
    });
    const labelPhoto = scan.labelPhotoDataUrl
      ? await compressDataUrl(scan.labelPhotoDataUrl, { maxEdge: 960, quality: 0.72 })
      : null;

    const result = await analyzeAppliancePhotos({
      appliancePhotoDataUrl: appliancePhoto,
      ...(labelPhoto ? { labelPhotoDataUrl: labelPhoto } : {}),
    });

    if (els.labelHintText) {
      els.labelHintText.textContent = hintForType(result.applianceType);
    }

    els.fieldType.value = result.applianceType || "";
    els.fieldBrand.value = result.brand || "";
    els.fieldModel.value = result.modelNumber || "";
    els.fieldSerial.value = result.serialNumber || "";
    els.fieldNickname.value =
      result.nickname ||
      [result.brand, result.applianceType].filter(Boolean).join(" ").trim();

    if (els.confidenceNote) {
      const c = result.confidence || "low";
      els.confidenceNote.hidden = false;
      if (result.demoMode) {
        els.confidenceNote.textContent =
          "Demo mode — add your OpenAI key in Settings (⚙) to enable photo analysis.";
      } else {
        els.confidenceNote.textContent = `Extraction confidence: ${c}. Please verify before saving.`;
      }
    }

    if (els.reviewPhotos) {
      els.reviewPhotos.innerHTML = "";
      const photos = [["Appliance", scan.appliancePhotoDataUrl]];
      if (scan.labelPhotoDataUrl) {
        photos.push(["Label", scan.labelPhotoDataUrl]);
      }
      if (scan.receiptPhotoDataUrl) {
        photos.push(["Receipt", scan.receiptPhotoDataUrl]);
      }
      for (const [label, url] of photos) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = label;
        els.reviewPhotos.append(img);
      }
    }

    showView("review");
  } catch (err) {
    toast(err instanceof Error ? err.message : "Analysis failed");
  } finally {
    if (els.btnAnalyze) {
      els.btnAnalyze.disabled = false;
      els.btnAnalyze.textContent = "Analyze photos";
    }
  }
}

async function saveRecord() {
  if (!scan.appliancePhotoDataUrl) return;

  const submitBtn = els.reviewForm?.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
  }

  try {
    const appliancePhoto = await compressDataUrl(scan.appliancePhotoDataUrl);
    const labelPhoto = scan.labelPhotoDataUrl ? await compressDataUrl(scan.labelPhotoDataUrl) : null;
    const receiptPhoto = scan.receiptPhotoDataUrl
      ? await compressDataUrl(scan.receiptPhotoDataUrl)
      : null;

    const type = els.fieldType.value.trim();
    const brand = els.fieldBrand.value.trim();
    const room = els.fieldRoom.value;
    const defaultName =
      [brand, type].filter(Boolean).join(" ").trim() ||
      (room !== "Other" ? `${room} appliance` : "Appliance");

    const record = {
      id: newRecordId(),
      nickname: els.fieldNickname.value.trim() || defaultName,
      room,
      applianceType: type,
      brand,
      modelNumber: els.fieldModel.value.trim(),
      serialNumber: els.fieldSerial.value.trim(),
      appliancePhotoDataUrl: appliancePhoto,
      labelPhotoDataUrl: labelPhoto,
      receiptPhotoDataUrl: receiptPhoto,
      confidence: config.analyzeApiUrl ? "api" : "manual",
      scannedAt: new Date().toISOString(),
      repairCompany: null,
    };

    await addAppliance(record);
    resetScan();
    await renderHome();
    updateSyncBanner();
    showView("home");
    toast(`Saved “${record.nickname}”`);
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not save");
  } finally {
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save to HomePassportAI";
    }
  }
}

function renderSettings() {
  const key = loadApiKey();
  if (els.fieldTheme) els.fieldTheme.value = loadThemePreference();
  if (els.fieldRoomChips) els.fieldRoomChips.checked = loadRoomChipsEnabled();
  if (els.apiKeyStatus) {
    if (key) {
      els.apiKeyStatus.hidden = false;
      els.apiKeyStatus.textContent = `Key saved on this device: ${maskApiKey(key)}`;
    } else {
      els.apiKeyStatus.hidden = true;
      els.apiKeyStatus.textContent = "";
    }
  }
  if (els.fieldApiKey) els.fieldApiKey.value = "";
  if (els.btnClearApiKey) els.btnClearApiKey.hidden = !key;

  const cloud = isSupabaseConfigured();
  const signedIn = isSignedIn();
  if (els.settingsAccount) els.settingsAccount.hidden = !cloud || !signedIn;
  if (els.btnGoSignIn) els.btnGoSignIn.hidden = !cloud || signedIn;
  if (els.settingsEmail && signedIn) els.settingsEmail.textContent = getUserEmail();
  if (els.btnAuthOffline) els.btnAuthOffline.hidden = !cloud;
  renderInstallSettings();
}

function saveSettingsApiKey() {
  const key = els.fieldApiKey?.value.trim() ?? "";
  if (!key) {
    toast("Paste your OpenAI API key");
    return;
  }
  if (!key.startsWith("sk-")) {
    toast("Key should start with sk-");
    return;
  }
  saveApiKey(key);
  renderSettings();
  toast("API key saved on this device");
}

function refreshToLatestVersion() {
  try {
    const url = new URL(location.href);
    url.searchParams.set("update", String(Date.now()));
    location.replace(url.toString());
  } catch {
    location.reload();
  }
}

function clearSettingsApiKey() {
  if (!hasUserApiKey()) return;
  if (!confirm("Remove the saved API key from this device?")) return;
  clearApiKey();
  renderSettings();
  toast("API key removed");
}

async function exportInsuranceReport() {
  const list = await loadAppliances();
  if (list.length === 0) {
    toast("No appliances to include — add or restore your inventory first");
    return;
  }

  const btn = els.btnInsurancePdf;
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = true;
    btn.textContent = "Building PDF…";
  }

  try {
    await generateInsurancePdf(list);
    toast(`Insurance PDF ready (${list.length} item${list.length === 1 ? "" : "s"})`);
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not create PDF");
  } finally {
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = false;
      btn.textContent = "Download insurance PDF";
    }
  }
}

async function exportBackup() {
  const list = loadAllLegacyAppliances();
  const data = list.length ? list : await loadAppliances();
  if (data.length === 0) {
    toast("No appliances to export");
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `homepassportai-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${data.length} appliance(s)`);
}

async function restoreInventory() {
  const count = tryRecoverInventory();
  if (count > 0) {
    await renderHome();
    updateSyncBanner();
    toast(`Restored ${count} appliance(s)`);
    return;
  }

  if (isLocalNetworkDev()) {
    toast(
      "Nothing found here. Your items may be saved under a different port — try http://YOUR_MAC_IP:8080, then Settings → Export appliances (JSON)."
    );
    return;
  }

  toast(
    "No saved data on this device. On your Mac app, open Settings → Export appliances (JSON), then use Import backup file here."
  );
}

async function importBackupFile() {
  const file = els.inputImportBackup?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const count = await importApplianceBackup(text);
    await renderHome();
    updateSyncBanner();
    toast(count ? `Imported ${count} appliance(s)` : "Nothing new to import");
  } catch (err) {
    toast(err instanceof Error ? err.message : "Import failed");
  } finally {
    if (els.inputImportBackup) els.inputImportBackup.value = "";
  }
}

async function renderHome() {
  let list = await loadAppliances();
  if (list.length === 0) {
    tryRecoverInventory();
    list = await loadAppliances();
  }
  if (!els.applianceList || !els.emptyState) return;

  const chipsEnabled = loadRoomChipsEnabled();
  const hasInventory = list.length > 0;

  if (els.homeSearch) {
    els.homeSearch.hidden = !hasInventory;
  }
  if (els.inputHomeSearch && els.inputHomeSearch.value !== homeSearchQuery) {
    els.inputHomeSearch.value = homeSearchQuery;
  }
  updateHomeSearchClearButton();

  const filtered = homeSearchQuery ? list.filter((item) => applianceMatchesSearch(item, homeSearchQuery)) : list;
  const grouped = groupByRoom(filtered);

  if (els.roomFilterChips) {
    els.roomFilterChips.hidden = !chipsEnabled || !hasInventory;
  }

  if (chipsEnabled && hasInventory) {
    const allGrouped = groupByRoom(list);
    if (homeRoomFilter !== "all" && !allGrouped.some(([room]) => room === homeRoomFilter)) {
      homeRoomFilter = "all";
    }
    renderRoomFilterChips(allGrouped, list.length);
  } else {
    homeRoomFilter = "all";
  }

  els.applianceList.innerHTML = "";
  els.emptyState.hidden = hasInventory;
  if (els.searchNoResults) {
    els.searchNoResults.hidden = !hasInventory || filtered.length > 0 || !homeSearchQuery;
  }

  const showHeadings = !chipsEnabled || homeRoomFilter === "all";
  const entries =
    chipsEnabled && homeRoomFilter !== "all"
      ? grouped.filter(([room]) => room === homeRoomFilter)
      : grouped;

  for (const [room, items] of entries) {
    if (showHeadings) {
      const heading = document.createElement("h3");
      heading.className = "category-heading";
      heading.textContent = roomDisplayName(room);
      els.applianceList.append(heading);
    }

    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "appliance-card";
      btn.setAttribute("role", "listitem");

      const img = document.createElement("img");
      img.className = "appliance-card__thumb";
      img.src = item.appliancePhotoDataUrl;
      img.alt = "";

      const body = document.createElement("div");
      body.className = "appliance-card__body";
      const title = document.createElement("h3");
      title.textContent = item.nickname;
      const meta = document.createElement("p");
      const type = item.applianceType ? ` · ${item.applianceType}` : "";
      const model = item.modelNumber ? ` · ${item.modelNumber}` : "";
      meta.textContent = `${item.brand || "Unknown brand"}${type}${model}`;
      body.append(title, meta);

      btn.append(img, body);
      btn.addEventListener("click", () => void openDetail(item.id));
      els.applianceList.append(btn);
    }
  }
}

/** @param {import("./storage.js").ApplianceRecord} item @param {string} query */
function applianceMatchesSearch(item, query) {
  const haystack = [
    item.nickname,
    item.brand,
    item.modelNumber,
    item.serialNumber,
    item.room,
    item.applianceType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

function updateHomeSearchClearButton() {
  if (!els.btnClearHomeSearch) return;
  els.btnClearHomeSearch.hidden = !homeSearchQuery;
}

/** @param {[string, import("./storage.js").ApplianceRecord[]][]} grouped */
function renderRoomFilterChips(grouped, totalCount) {
  const container = els.roomFilterChips;
  if (!container) return;

  container.innerHTML = "";
  container.append(
    makeRoomFilterChip("all", `All · ${totalCount}`, homeRoomFilter === "all"),
  );

  for (const [room, items] of grouped) {
    container.append(
      makeRoomFilterChip(room, `${roomDisplayName(room)} · ${items.length}`, homeRoomFilter === room),
    );
  }
}

/** @param {"all" | string} roomId */
function makeRoomFilterChip(roomId, label, selected) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `room-filter-chip${selected ? " room-filter-chip--selected" : ""}`;
  btn.setAttribute("role", "tab");
  btn.setAttribute("aria-selected", String(selected));
  btn.textContent = label;
  btn.addEventListener("click", () => {
    if (homeRoomFilter === roomId) return;
    homeRoomFilter = roomId;
    void renderHome();
  });
  return btn;
}

/** @param {import("./storage.js").ApplianceRecord[]} appliances */
function groupByRoom(appliances) {
  const buckets = new Map();
  for (const item of appliances) {
    const room = item.room || "Other";
    if (!buckets.has(room)) buckets.set(room, []);
    buckets.get(room).push(item);
  }

  const sortByNickname = (a, b) =>
    (a.nickname || "").localeCompare(b.nickname || "", undefined, { sensitivity: "base" });

  const grouped = [];
  for (const room of ROOM_ORDER) {
    if (buckets.has(room)) {
      grouped.push([room, buckets.get(room).sort(sortByNickname)]);
      buckets.delete(room);
    }
  }
  for (const room of [...buckets.keys()].sort((a, b) => a.localeCompare(b))) {
    grouped.push([room, buckets.get(room).sort(sortByNickname)]);
  }
  return grouped;
}

async function openDetail(id) {
  const item = await getAppliance(id);
  if (!item) return;
  detailId = id;
  resetDetailLabelCapture();

  if (els.detailTitle) els.detailTitle.textContent = item.nickname;
  if (!els.detailBody) return;

  const scanned = new Date(item.scannedAt).toLocaleString();
  const labelImg = item.labelPhotoDataUrl
    ? `<figure class="detail-photo">
        <img src="${item.labelPhotoDataUrl}" alt="" />
        <figcaption>Model / serial label</figcaption>
      </figure>`
    : "";
  const receiptImg = item.receiptPhotoDataUrl
    ? `<figure class="detail-photo">
        <img src="${item.receiptPhotoDataUrl}" alt="" />
        <figcaption>Receipt</figcaption>
      </figure>`
    : "";

  els.detailBody.innerHTML = `
    <div class="detail-photos">
      <figure class="detail-photo">
        <img src="${item.appliancePhotoDataUrl}" alt="" />
        <figcaption>Appliance</figcaption>
      </figure>
      ${labelImg}
      ${receiptImg}
    </div>
    <dl>
      <div><dt>Room</dt><dd>${escapeHtml(item.room)}</dd></div>
      <div><dt>Type</dt><dd>${escapeHtml(item.applianceType || "—")}</dd></div>
      <div><dt>Brand</dt><dd>${escapeHtml(item.brand || "—")}</dd></div>
      <div><dt>Model</dt><dd>${escapeHtml(item.modelNumber || "—")}</dd></div>
      <div><dt>Serial</dt><dd>${escapeHtml(item.serialNumber || "—")}</dd></div>
      <div><dt>Scanned</dt><dd>${escapeHtml(scanned)}</dd></div>
    </dl>
  `;

  if (els.detailLabelLede) {
    els.detailLabelLede.textContent = item.labelPhotoDataUrl
      ? "Take a new close-up to replace the model/serial label photo."
      : "No label yet — snap a close-up of the manufacturer sticker or rating plate.";
  }
  setCaptureLabelText(
    els.labelDetailLabelPhoto,
    item.labelPhotoDataUrl ? "Retake label photo" : "Take label photo"
  );
  if (els.btnClearDetailLabelPhoto) els.btnClearDetailLabelPhoto.hidden = true;
  if (els.btnShareAppliance) {
    els.btnShareAppliance.hidden = false;
    els.btnShareAppliance.textContent =
      typeof navigator !== "undefined" && typeof navigator.share === "function"
        ? "Share item"
        : "Copy item info";
  }

  renderDetailManualLinks(item);
  renderDetailRepair(item);
  showView("detail");
}

function resetDetailLabelCapture() {
  detailLabelPending.dataUrl = null;
  detailLabelPending.suggestions = null;
  if (els.inputDetailLabelPhoto) els.inputDetailLabelPhoto.value = "";
  setPreview(els.previewDetailLabelPhoto, null);
  if (els.btnClearDetailLabelPhoto) els.btnClearDetailLabelPhoto.hidden = true;
  if (els.labelDetailLabelPhoto) els.labelDetailLabelPhoto.classList.remove("capture-btn--busy");
  hideDetailLabelReview();
}

function hideDetailLabelReview() {
  if (els.detailLabelReview) els.detailLabelReview.hidden = true;
  if (els.detailLabelAnalyzeStatus) {
    els.detailLabelAnalyzeStatus.hidden = true;
    els.detailLabelAnalyzeStatus.textContent = "";
  }
  if (els.detailLabelReviewForm) els.detailLabelReviewForm.hidden = false;
  if (els.detailLabelConfidence) {
    els.detailLabelConfidence.hidden = true;
    els.detailLabelConfidence.textContent = "";
  }
  for (const hint of [
    els.detailLabelBrandHint,
    els.detailLabelModelHint,
    els.detailLabelSerialHint,
  ]) {
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
      hint.replaceChildren();
    }
  }
}

function clearDetailLabelPhoto() {
  resetDetailLabelCapture();
  toast("Photo cleared");
}

function cancelDetailLabelReview() {
  resetDetailLabelCapture();
  toast("Label capture cancelled");
}

/** @param {HTMLElement | null} hintEl @param {string} current @param {string} suggested */
function setLabelFieldHint(hintEl, current, suggested) {
  if (!hintEl) return;
  if (!current || !suggested || current === suggested) {
    hintEl.hidden = true;
    hintEl.replaceChildren();
    return;
  }
  hintEl.hidden = false;
  hintEl.textContent = `AI suggests: ${suggested} `;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Use suggestion";
  btn.addEventListener("click", () => {
    const fieldId = hintEl.id;
    const input =
      fieldId === "detail-label-brand-hint"
        ? els.detailLabelBrand
        : fieldId === "detail-label-model-hint"
          ? els.detailLabelModel
          : els.detailLabelSerial;
    if (input instanceof HTMLInputElement) input.value = suggested;
    hintEl.hidden = true;
    hintEl.replaceChildren();
  });
  hintEl.append(btn);
}

async function onDetailLabelPhotoSelected() {
  const file = els.inputDetailLabelPhoto?.files?.[0];
  if (!file || !detailId) return;

  const item = await getAppliance(detailId);
  if (!item) return;

  if (els.labelDetailLabelPhoto) els.labelDetailLabelPhoto.classList.add("capture-btn--busy");
  hideDetailLabelReview();

  try {
    const dataUrl = await readFileAsDataUrl(file);
    detailLabelPending.dataUrl = dataUrl;
    setPreview(els.previewDetailLabelPhoto, dataUrl);
    if (els.btnClearDetailLabelPhoto) els.btnClearDetailLabelPhoto.hidden = false;

    if (els.detailLabelReview) els.detailLabelReview.hidden = false;
    if (els.detailLabelAnalyzeStatus) {
      els.detailLabelAnalyzeStatus.hidden = false;
      els.detailLabelAnalyzeStatus.textContent = "Analyzing label…";
    }
    if (els.detailLabelReviewForm) els.detailLabelReviewForm.hidden = true;

    const labelPhoto = await compressDataUrl(dataUrl, { maxEdge: 960, quality: 0.72 });
    const result = await analyzeLabelPhoto(labelPhoto);

    detailLabelPending.suggestions = {
      brand: result.brand || "",
      modelNumber: result.modelNumber || "",
      serialNumber: result.serialNumber || "",
    };

    if (els.detailLabelBrand) {
      els.detailLabelBrand.value = item.brand?.trim() || result.brand || "";
    }
    if (els.detailLabelModel) {
      els.detailLabelModel.value = item.modelNumber?.trim() || result.modelNumber || "";
    }
    if (els.detailLabelSerial) {
      els.detailLabelSerial.value = item.serialNumber?.trim() || result.serialNumber || "";
    }

    setLabelFieldHint(els.detailLabelBrandHint, item.brand?.trim() || "", result.brand || "");
    setLabelFieldHint(els.detailLabelModelHint, item.modelNumber?.trim() || "", result.modelNumber || "");
    setLabelFieldHint(els.detailLabelSerialHint, item.serialNumber?.trim() || "", result.serialNumber || "");

    if (els.detailLabelConfidence) {
      els.detailLabelConfidence.hidden = false;
      if (result.demoMode) {
        els.detailLabelConfidence.textContent =
          "Demo mode — add your OpenAI key in Settings (⚙) to enable label analysis.";
      } else {
        els.detailLabelConfidence.textContent = `Extraction confidence: ${result.confidence || "low"}. Review before saving.`;
      }
    }

    if (els.detailLabelAnalyzeStatus) els.detailLabelAnalyzeStatus.hidden = true;
    if (els.detailLabelReviewForm) els.detailLabelReviewForm.hidden = false;
  } catch (err) {
    resetDetailLabelCapture();
    toast(err instanceof Error ? err.message : "Could not analyze label photo");
  } finally {
    if (els.labelDetailLabelPhoto) els.labelDetailLabelPhoto.classList.remove("capture-btn--busy");
  }
}

async function saveDetailLabelReview() {
  if (!detailId || !detailLabelPending.dataUrl) return;

  const submitBtn = els.detailLabelReviewForm?.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
  }

  try {
    const labelPhoto = await compressDataUrl(detailLabelPending.dataUrl);
    const updates = {
      labelPhotoDataUrl: labelPhoto,
      brand: els.detailLabelBrand?.value.trim() ?? "",
      modelNumber: els.detailLabelModel?.value.trim() ?? "",
      serialNumber: els.detailLabelSerial?.value.trim() ?? "",
    };

    await updateAppliance(detailId, updates);
    resetDetailLabelCapture();
    await renderHome();
    await openDetail(detailId);
    toast("Label photo and details saved");
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not save label photo");
  } finally {
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save label photo & details";
    }
  }
}

/** @param {import("./storage.js").ApplianceRecord} item */
function formatApplianceShareText(item) {
  const lines = [
    item.nickname,
    item.room ? `Room: ${item.room}` : "",
    item.applianceType ? `Type: ${item.applianceType}` : "",
    item.brand ? `Brand: ${item.brand}` : "",
    item.modelNumber ? `Model: ${item.modelNumber}` : "",
    item.serialNumber ? `Serial: ${item.serialNumber}` : "",
    "— HomePassportAI",
  ].filter(Boolean);
  return lines.join("\n");
}

/** @param {string} dataUrl @param {string} filename */
async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const type = blob.type || "image/jpeg";
  return new File([blob], filename, { type });
}

async function shareCurrentAppliance() {
  if (!detailId) return;
  const item = await getAppliance(detailId);
  if (!item) return;

  const text = formatApplianceShareText(item);
  const photoUrl = item.appliancePhotoDataUrl || item.labelPhotoDataUrl;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (canShare) {
    try {
      /** @type {ShareData} */
      const shareData = { text, title: item.nickname };
      if (photoUrl) {
        const ext = photoUrl.startsWith("data:image/png") ? "png" : "jpg";
        const file = await dataUrlToFile(photoUrl, `${sanitizeFilename(item.nickname)}.${ext}`);
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      }
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast("Item details copied — paste into Messages");
      return;
    }
  } catch {
    // fall through
  }

  const subject = encodeURIComponent(item.nickname);
  const body = encodeURIComponent(text);
  location.href = `mailto:?subject=${subject}&body=${body}`;
}

/** @param {string} name */
function sanitizeFilename(name) {
  return name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "appliance";
}

async function openEditAppliance() {
  if (!detailId) return;
  const item = await getAppliance(detailId);
  if (!item) return;

  if (els.editFieldNickname) els.editFieldNickname.value = item.nickname || "";
  populateRoomSelect(els.editFieldRoom, item.room || "Other");
  if (els.editFieldType) els.editFieldType.value = item.applianceType || "";
  if (els.editFieldBrand) els.editFieldBrand.value = item.brand || "";
  if (els.editFieldModel) els.editFieldModel.value = item.modelNumber || "";
  if (els.editFieldSerial) els.editFieldSerial.value = item.serialNumber || "";

  showView("editAppliance");
}

async function saveEditAppliance() {
  if (!detailId) return;

  const nickname = els.editFieldNickname?.value.trim() ?? "";
  const room = els.editFieldRoom?.value || "Other";
  const applianceType = els.editFieldType?.value.trim() ?? "";
  const brand = els.editFieldBrand?.value.trim() ?? "";
  const modelNumber = els.editFieldModel?.value.trim() ?? "";
  const serialNumber = els.editFieldSerial?.value.trim() ?? "";

  const submitBtn = els.editForm?.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
  }

  try {
    const defaultName =
      [brand, applianceType].filter(Boolean).join(" ").trim() ||
      (room !== "Other" ? `${room} item` : "Item");

    await updateAppliance(detailId, {
      nickname: nickname || defaultName,
      room,
      applianceType,
      brand,
      modelNumber,
      serialNumber,
    });

    await renderHome();
    await openDetail(detailId);
    toast("Item updated");
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not save changes");
  } finally {
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save changes";
    }
  }
}

function renderDetailManualLinks(item) {
  const el = els.detailManuals;
  if (!el) return;

  const google = manualSearchUrl(item);
  const lib = manualsLibSearchUrl(item);

  if (!google && !lib) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  el.hidden = false;
  el.innerHTML = `<p class="hint">Manual links use your saved brand and model — opens in a new tab.</p>`;

  if (google) {
    const a = document.createElement("a");
    a.className = "btn btn--secondary btn--block";
    a.href = google;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Search for owner's manual";
    el.append(a);
  }

  if (lib) {
    const a = document.createElement("a");
    a.className = "btn btn--secondary btn--block";
    a.href = lib;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Search on ManualsLib";
    el.append(a);
  }
}

function renderDetailRepair(item) {
  const el = els.detailRepair;
  if (!el) return;

  const location = loadLocation();
  const areaLabel = locationDisplayLabel(location);
  const mapsUrl = localRepairSearchUrl(item, location);
  const googleUrl = localRepairGoogleUrl(item, location);
  const company = item.repairCompany;

  el.innerHTML = `<h3 class="detail-section-title">Repair</h3>`;

  const locationBlock = document.createElement("div");
  locationBlock.className = "repair-location";
  locationBlock.innerHTML = `
    <p class="repair-location__label">${
      areaLabel
        ? `Local search area: <strong>${escapeHtml(areaLabel)}</strong>`
        : "Set your ZIP or city to search for nearby repair shops."
    }</p>
    <div class="repair-location__row">
      <input type="text" class="input" id="repair-zip" placeholder="ZIP or city" value="${escapeHtml(
        location?.zip || location?.label || ""
      )}" autocomplete="postal-code" />
      <button type="button" class="btn btn--secondary" id="btn-save-location">Save area</button>
      <button type="button" class="btn btn--ghost" id="btn-use-location">Use my location</button>
    </div>
  `;
  el.append(locationBlock);

  const links = document.createElement("div");
  links.className = "detail-manuals";
  if (mapsUrl) {
    const a = document.createElement("a");
    a.className = "btn btn--secondary btn--block";
    a.href = mapsUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Find local repair (Maps)";
    links.append(a);
  }
  if (googleUrl) {
    const a = document.createElement("a");
    a.className = "btn btn--secondary btn--block";
    a.href = googleUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Search repair shops (Google)";
    links.append(a);
  }
  if (!mapsUrl && !googleUrl) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Save your area above to enable repair search links.";
    links.append(p);
  }
  el.append(links);

  const companySection = document.createElement("div");
  companySection.className = "repair-company";
  companySection.innerHTML = `<h3 class="detail-section-title">Your repair company</h3>`;

  const card = document.createElement("div");
  card.className = "repair-company__card";
  card.hidden = !company?.name;

  if (company?.name) {
    const phone = company.phone?.trim();
    const website = company.website?.trim();
    const notes = company.notes?.trim();
    card.innerHTML = `
      <div><strong>${escapeHtml(company.name)}</strong></div>
      ${phone ? `<div><a href="tel:${escapeHtml(phone.replace(/\s/g, ""))}">${escapeHtml(phone)}</a></div>` : ""}
      ${
        website
          ? `<div><a href="${escapeHtml(normalizeUrl(website))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              website
            )}</a></div>`
          : ""
      }
      ${notes ? `<div>${escapeHtml(notes)}</div>` : ""}
    `;
  }

  const empty = document.createElement("p");
  empty.className = "repair-company__empty";
  empty.hidden = Boolean(company?.name);
  empty.textContent = "Save a trusted repair shop for this appliance.";

  const form = document.createElement("form");
  form.className = "repair-form";
  form.hidden = Boolean(company?.name);
  form.innerHTML = `
    <label class="field">
      <span>Company name</span>
      <input type="text" class="input" id="repair-name" value="${escapeHtml(company?.name || "")}" required />
    </label>
    <label class="field">
      <span>Phone</span>
      <input type="tel" class="input" id="repair-phone" value="${escapeHtml(company?.phone || "")}" placeholder="Optional" />
    </label>
    <label class="field">
      <span>Website</span>
      <input type="url" class="input" id="repair-website" value="${escapeHtml(company?.website || "")}" placeholder="Optional" />
    </label>
    <label class="field">
      <span>Notes</span>
      <input type="text" class="input" id="repair-notes" value="${escapeHtml(company?.notes || "")}" placeholder="e.g. Account #, preferred tech" />
    </label>
    <button type="submit" class="btn btn--primary btn--block">Save repair company</button>
  `;

  const btnEdit = document.createElement("button");
  btnEdit.type = "button";
  btnEdit.className = "btn btn--secondary btn--block";
  btnEdit.textContent = company?.name ? "Edit repair company" : "Add repair company";
  btnEdit.hidden = !company?.name;

  const btnClear = document.createElement("button");
  btnClear.type = "button";
  btnClear.className = "btn btn--ghost btn--block";
  btnClear.textContent = "Remove repair company";
  btnClear.hidden = !company?.name;

  companySection.append(card, empty, form, btnEdit, btnClear);
  el.append(companySection);

  const zipInput = locationBlock.querySelector("#repair-zip");
  locationBlock.querySelector("#btn-save-location")?.addEventListener("click", () => {
    const value = zipInput instanceof HTMLInputElement ? zipInput.value.trim() : "";
    if (!value) {
      toast("Enter a ZIP code or city");
      return;
    }
    const isZip = /^\d{5}(-\d{4})?$/.test(value);
    saveLocation(isZip ? { zip: value, label: value } : { label: value, zip: "" });
    toast(`Area saved: ${value}`);
    void openDetail(item.id);
  });

  locationBlock.querySelector("#btn-use-location")?.addEventListener("click", () => {
    void (async () => {
      try {
        const loc = await detectCurrentLocation();
        saveLocation(loc);
        toast("Using your current location");
        void openDetail(item.id);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Location failed");
      }
    })();
  });

  btnEdit.addEventListener("click", () => {
    card.hidden = true;
    form.hidden = false;
    btnEdit.hidden = true;
    btnClear.hidden = true;
    empty.hidden = true;
  });

  btnClear.addEventListener("click", () => {
    if (!detailId) return;
    if (!confirm("Remove the saved repair company for this appliance?")) return;
    void (async () => {
      await updateAppliance(detailId, { repairCompany: null });
      toast("Repair company removed");
      void openDetail(detailId);
    })();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void (async () => {
      if (!detailId) return;

      const name = form.querySelector("#repair-name");
      const phone = form.querySelector("#repair-phone");
      const website = form.querySelector("#repair-website");
      const notes = form.querySelector("#repair-notes");

      const repairCompany = {
        name: name instanceof HTMLInputElement ? name.value.trim() : "",
        phone: phone instanceof HTMLInputElement ? phone.value.trim() : "",
        website: website instanceof HTMLInputElement ? website.value.trim() : "",
        notes: notes instanceof HTMLInputElement ? notes.value.trim() : "",
      };

      if (!repairCompany.name) {
        toast("Company name is required");
        return;
      }

      await updateAppliance(detailId, { repairCompany });
      toast(`Saved ${repairCompany.name}`);
      void openDetail(detailId);
    })();
  });
}

/** @param {string} url */
function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

async function removeDetail() {
  if (!detailId) return;
  if (!confirm("Remove this appliance from HomePassportAI?")) return;
  await deleteAppliance(detailId);
  detailId = null;
  await renderHome();
  updateSyncBanner();
  updateInstallBanner();
  showView("home");
  toast("Appliance removed");
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} message */
function toast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2800);
}
