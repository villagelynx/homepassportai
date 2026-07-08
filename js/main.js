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
import { analyzeAppliancePhotos, checkAnalyzeServer, readFileAsDataUrl } from "./analyze.js";
import { compressDataUrl } from "./image-compress.js";
import { hintForType } from "./label-hints.js";
import { initTheme, loadThemePreference, saveThemePreference } from "./theme.js";
import { generateInsurancePdf } from "./insurance-report.js";
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
  scan1: document.getElementById("view-scan-1"),
  scan2: document.getElementById("view-scan-2"),
  scan3: document.getElementById("view-scan-3"),
  review: document.getElementById("view-review"),
  settings: document.getElementById("view-settings"),
  detail: document.getElementById("view-detail"),
};

const ROOM_ORDER = ["Kitchen", "Laundry", "Garage", "Basement", "Utility", "Other"];

const els = {
  buildTag: document.getElementById("build-tag"),
  applianceList: document.getElementById("appliance-list"),
  emptyState: document.getElementById("empty-state"),
  syncBanner: document.getElementById("sync-banner"),
  btnAdd: document.getElementById("btn-add-appliance"),
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
  btnDelete: document.getElementById("btn-delete-appliance"),
  settingsForm: document.getElementById("settings-form"),
  fieldApiKey: document.getElementById("field-api-key"),
  fieldTheme: document.getElementById("field-theme"),
  apiKeyStatus: document.getElementById("api-key-status"),
  btnClearApiKey: document.getElementById("btn-clear-api-key"),
  settingsAccount: document.getElementById("settings-account"),
  settingsEmail: document.getElementById("settings-email"),
  btnSignOut: document.getElementById("btn-sign-out"),
  btnGoSignIn: document.getElementById("btn-go-sign-in"),
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

let detailId = null;
let toastTimer = 0;
let authMode = "signin";
let allowOfflineUse = false;

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
    showView("auth");
    return;
  }

  if (isSignedIn()) {
    const migrated = await migrateLocalInventoryIfNeeded();
    if (migrated > 0) toast(`Synced ${migrated} appliance(s) to the cloud`);
  }

  await renderHome();
  updateSyncBanner();
  showView("home");
}

async function onAuthChanged() {
  if (isSignedIn()) {
    const migrated = await migrateLocalInventoryIfNeeded();
    if (migrated > 0) toast(`Synced ${migrated} appliance(s) to the cloud`);
    await renderHome();
    updateSyncBanner();
  }
}

function init() {
  els.btnAdd?.addEventListener("click", () => startScan());
  els.inputAppliance?.addEventListener("change", () => void onAppliancePhoto());
  els.btnRetakeAppliance?.addEventListener("click", () => clearAppliancePhoto());
  els.btnToStep2?.addEventListener("click", () => {
    if (els.labelHintText) {
      els.labelHintText.textContent = hintForType(els.fieldType?.value || "");
    }
    showView("scan2");
  });
  els.inputLabel?.addEventListener("change", () => void onLabelPhoto());
  els.btnRetakeLabel?.addEventListener("click", () => clearLabelPhoto());
  els.btnToStep3?.addEventListener("click", () => showView("scan3"));
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
  els.btnClearApiKey?.addEventListener("click", () => clearSettingsApiKey());
  els.btnSignOut?.addEventListener("click", () => void handleSignOut());
  els.btnGoSignIn?.addEventListener("click", () => showView("auth"));
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

  for (const btn of document.querySelectorAll("[data-nav]")) {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target === "home") {
        resetScan();
        void renderHome().then(() => {
          updateSyncBanner();
          showView("home");
        });
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
  if (!els.syncBanner) return;
  if (!isSupabaseConfigured()) {
    els.syncBanner.hidden = true;
    return;
  }
  if (isSignedIn()) {
    els.syncBanner.hidden = false;
    els.syncBanner.textContent = `Synced as ${getUserEmail()}`;
    return;
  }
  els.syncBanner.hidden = false;
  els.syncBanner.innerHTML =
    'Offline on this device — <button type="button" class="linkish" id="banner-sign-in">Sign in to sync</button>';
  els.syncBanner.querySelector("#banner-sign-in")?.addEventListener("click", () => showView("auth"));
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
  if (els.btnToStep3) els.btnToStep3.disabled = true;
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
  if (els.btnToStep3) els.btnToStep3.disabled = true;
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
  if (els.btnToStep3) els.btnToStep3.disabled = false;
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
  if (!scan.appliancePhotoDataUrl || !scan.labelPhotoDataUrl) return;

  if (els.btnAnalyze) {
    els.btnAnalyze.disabled = true;
    els.btnAnalyze.textContent = "Analyzing…";
  }

  try {
    const result = await analyzeAppliancePhotos({
      appliancePhotoDataUrl: scan.appliancePhotoDataUrl,
      labelPhotoDataUrl: scan.labelPhotoDataUrl,
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
      const photos = [
        ["Appliance", scan.appliancePhotoDataUrl],
        ["Label", scan.labelPhotoDataUrl],
      ];
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
  if (!scan.appliancePhotoDataUrl || !scan.labelPhotoDataUrl) return;

  const submitBtn = els.reviewForm?.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
  }

  try {
    const [appliancePhoto, labelPhoto] = await Promise.all([
      compressDataUrl(scan.appliancePhotoDataUrl),
      compressDataUrl(scan.labelPhotoDataUrl),
    ]);
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

  els.applianceList.innerHTML = "";
  els.emptyState.hidden = list.length > 0;

  for (const [room, items] of groupByRoom(list)) {
    const heading = document.createElement("h3");
    heading.className = "category-heading";
    heading.textContent = roomDisplayName(room);
    els.applianceList.append(heading);

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

/** @param {string} room */
function roomDisplayName(room) {
  if (room === "Utility") return "Utility / mechanical";
  return room;
}

async function openDetail(id) {
  const item = await getAppliance(id);
  if (!item) return;
  detailId = id;

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

  renderDetailManualLinks(item);
  renderDetailRepair(item);
  showView("detail");
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
