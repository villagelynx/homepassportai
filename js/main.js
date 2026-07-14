import { manualSearchUrl, manualsLibSearchUrl } from "./manual-links.js";
import {
  clearApiKey,
  hasUserApiKey,
  loadAiProvider,
  loadAnthropicApiKey,
  providerDisplayName,
  saveAiProvider,
  saveAnthropicApiKey,
  saveApiKey,
} from "./api-key.js";
import { detectCurrentLocation, loadLocation, locationDisplayLabel, saveLocation } from "./location.js";
import { localRepairGoogleUrl, localRepairSearchUrl } from "./repair-links.js";
import { APP_VERSION, config, isSupabaseConfigured } from "./config.js";
import {
  clearSessionExpiredFlag,
  friendlyAuthMessage,
  getUserEmail,
  initAuth,
  isSignedIn,
  refreshAuthIfNeeded,
  sendPasswordReset,
  setAuthListener,
  setRecoveryListener,
  signIn,
  signOut,
  signUp,
  updateUserPassword,
  wasSessionExpired,
} from "./auth.js";
import { analyzeAppliancePhotos, analyzeDocumentPhoto, analyzeLabelPhoto, analyzeRoomFrames, checkAnalyzeServer, checkApiKeyStatus, generateFacebookMarketplaceListing, readFileAsDataUrl } from "./analyze.js";
import { compressDataUrl } from "./image-compress.js";
import { addDocument, deleteDocument, loadDocuments } from "./document-storage.js";
import {
  documentTypeLabel,
  getDocumentTypeMeta,
  isTaxLikeDocument,
} from "./document-types.js";
import { hintForType } from "./label-hints.js";
import { initTheme, loadThemePreference, saveThemePreference } from "./theme.js";
import { loadRoomChipsEnabled, saveRoomChipsEnabled, loadHomeFilterAxis, saveHomeFilterAxis } from "./room-chips-prefs.js";
import {
  getItemCategoryMeta,
  groupByItemCategory,
  mapItemCategory,
} from "./item-categories.js";
import {
  BUILDING_FILTER_ID,
  BUILDING_GROUP_LABEL,
  isBuildingRoom,
  isOutdoorGroupRoom,
  mapRoomGuess,
  OUTDOOR_FILTER_ID,
  OUTDOOR_GROUP_LABEL,
  populateRoomSelect,
  roomDisplayName,
  ROOM_ORDER,
  setRoomTitleElement,
} from "./rooms.js";
import { installHintMode, isStandaloneApp } from "./install-prompt.js";
import { buildSignatureCollageLabelPhoto } from "./signature-label.js";
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
  landing: document.getElementById("view-landing"),
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
  guide: document.getElementById("view-guide"),
  detail: document.getElementById("view-detail"),
  marketplace: document.getElementById("view-marketplace"),
  editAppliance: document.getElementById("view-edit-appliance"),
  scanDoc: document.getElementById("view-scan-doc"),
  reviewDoc: document.getElementById("view-review-doc"),
};

const els = {
  buildTag: document.getElementById("build-tag"),
  landingBuildTag: document.getElementById("landing-build-tag"),
  applianceList: document.getElementById("appliance-list"),
  homeSearch: document.getElementById("home-search"),
  inputHomeSearch: document.getElementById("input-home-search"),
  btnClearHomeSearch: document.getElementById("btn-clear-home-search"),
  roomFilterChips: document.getElementById("room-filter-chips"),
  homeFilterToolbar: document.getElementById("home-filter-toolbar"),
  btnFilterAxisRoom: document.getElementById("btn-filter-axis-room"),
  btnFilterAxisType: document.getElementById("btn-filter-axis-type"),
  emptyState: document.getElementById("empty-state"),
  searchNoResults: document.getElementById("search-no-results"),
  homeDashboard: document.getElementById("home-dashboard"),
  homeInventoryPanel: document.getElementById("home-inventory-panel"),
  homeReportsPanel: document.getElementById("home-reports-panel"),
  homeItemMeta: document.getElementById("home-item-meta"),
  homeRecentGrid: document.getElementById("home-recent-grid"),
  homeRecentEmpty: document.getElementById("home-recent-empty"),
  homeRecentTitle: document.getElementById("home-recent-title"),
  btnHomeScanRoom: document.getElementById("btn-home-scan-room"),
  btnHomeAddItem: document.getElementById("btn-home-add-item"),
  btnHomeInventory: document.getElementById("btn-home-inventory"),
  btnHomeReports: document.getElementById("btn-home-reports"),
  btnHomeViewAll: document.getElementById("btn-home-view-all"),
  btnHomeProtected: document.getElementById("btn-home-protected"),
  btnTabHome: document.getElementById("btn-tab-home"),
  btnTabInventory: document.getElementById("btn-tab-inventory"),
  btnTabReports: document.getElementById("btn-tab-reports"),
  btnTabSettings: document.getElementById("btn-tab-settings"),
  apiSetupBanner: document.getElementById("api-setup-banner"),
  btnSyncStatus: document.getElementById("btn-sync-status"),
  btnGuide: document.getElementById("btn-guide"),
  btnTopbarSignOut: document.getElementById("btn-topbar-sign-out"),
  homePromoCard: document.querySelector(".home-promo-card"),
  btnHomePromoToggle: document.getElementById("btn-home-promo-toggle"),
  btnSettings: document.getElementById("btn-settings"),
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
  toolbarAppliance: document.getElementById("toolbar-appliance"),
  toolbarLabel: document.getElementById("toolbar-label"),
  toolbarReceipt: document.getElementById("toolbar-receipt"),
  toolbarRoomVideo: document.getElementById("toolbar-room-video"),
  toolbarDetailLabel: document.getElementById("toolbar-detail-label"),
  toolbarDocPhoto: document.getElementById("toolbar-doc-photo"),
  labelLabelPhoto: document.getElementById("label-label-photo"),
  labelReceiptPhoto: document.getElementById("label-receipt-photo"),
  inputReceipt: document.getElementById("input-receipt-photo"),
  btnAnalyze: document.getElementById("btn-analyze"),
  btnManualReview: document.getElementById("btn-manual-review"),
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
  fieldColor: document.getElementById("field-color"),
  fieldDimensions: document.getElementById("field-dimensions"),
  fieldEstimatedValue: document.getElementById("field-estimated-value"),
  fieldRetailPrice: document.getElementById("field-retail-price"),
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
  btnMarketplaceAppliance: document.getElementById("btn-marketplace-appliance"),
  btnMarketplaceBack: document.getElementById("btn-marketplace-back"),
  btnMarketplaceRegenerate: document.getElementById("btn-marketplace-regenerate"),
  btnMarketplaceCopyAll: document.getElementById("btn-marketplace-copy-all"),
  marketplaceTitle: document.getElementById("marketplace-title"),
  marketplaceStatus: document.getElementById("marketplace-status"),
  marketplaceResult: document.getElementById("marketplace-result"),
  marketplaceFieldTitle: document.getElementById("marketplace-field-title"),
  marketplaceFieldPrice: document.getElementById("marketplace-field-price"),
  marketplaceFieldCondition: document.getElementById("marketplace-field-condition"),
  marketplaceFieldDescription: document.getElementById("marketplace-field-description"),
  marketplaceCategory: document.getElementById("marketplace-category"),
  marketplacePhotos: document.getElementById("marketplace-photos"),
  marketplaceTips: document.getElementById("marketplace-tips"),
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
  editFieldColor: document.getElementById("edit-field-color"),
  editFieldDimensions: document.getElementById("edit-field-dimensions"),
  editFieldEstimatedValue: document.getElementById("edit-field-estimated-value"),
  editFieldRetailPrice: document.getElementById("edit-field-retail-price"),
  settingsForm: document.getElementById("settings-form"),
  fieldApiKey: document.getElementById("field-api-key"),
  fieldAnthropicKey: document.getElementById("field-anthropic-key"),
  fieldOpenAiWrap: document.getElementById("field-openai-wrap"),
  fieldAnthropicWrap: document.getElementById("field-anthropic-wrap"),
  providerOpenAi: document.getElementById("provider-openai"),
  providerAnthropic: document.getElementById("provider-anthropic"),
  fieldTheme: document.getElementById("field-theme"),
  fieldRoomChips: document.getElementById("field-room-chips"),
  apiKeyStatus: document.getElementById("api-key-status"),
  btnClearApiKey: document.getElementById("btn-clear-api-key"),
  settingsAccount: document.getElementById("settings-account"),
  settingsEmail: document.getElementById("settings-email"),
  btnSignOut: document.getElementById("btn-sign-out"),
  btnGoSignIn: document.getElementById("btn-go-sign-in"),
  btnRefreshVersion: document.getElementById("btn-refresh-version"),
  btnShowLanding: document.getElementById("btn-show-landing"),
  btnLandingBackApp: document.getElementById("btn-landing-back-app"),
  settingsInstall: document.getElementById("settings-install"),
  settingsInstallNote: document.getElementById("settings-install-note"),
  settingsInstallSteps: document.getElementById("settings-install-steps"),
  settingsInstallStandalone: document.getElementById("settings-install-standalone"),
  authForm: document.getElementById("auth-form"),
  authEmail: document.getElementById("auth-email"),
  authRememberEmail: document.getElementById("auth-remember-email"),
  authPassword: document.getElementById("auth-password"),
  btnAuthSubmit: document.getElementById("btn-auth-submit"),
  btnAuthToggle: document.getElementById("btn-auth-toggle"),
  btnAuthForgot: document.getElementById("btn-auth-forgot"),
  btnAuthOffline: document.getElementById("btn-auth-offline"),
  btnAuthBack: document.getElementById("btn-auth-back"),
  btnLandingSignIn: document.getElementById("btn-landing-sign-in"),
  btnLandingRegister: document.getElementById("btn-landing-register"),
  btnLandingHeaderSignIn: document.getElementById("btn-landing-header-sign-in"),
  btnLandingHeaderRegister: document.getElementById("btn-landing-header-register"),
  btnLandingStart: document.getElementById("btn-landing-start"),
  btnLandingOffline: document.getElementById("btn-landing-offline"),
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
  btnReportsInsurancePdf: document.getElementById("btn-reports-insurance-pdf"),
  btnScanInsurancePolicy: document.getElementById("btn-scan-insurance-policy"),
  btnScanPropertyTax: document.getElementById("btn-scan-property-tax"),
  btnScanPropertyAssessment: document.getElementById("btn-scan-property-assessment"),
  btnScanPropertyTaxDeferment: document.getElementById("btn-scan-property-tax-deferment"),
  btnScanTaxUtilities: document.getElementById("btn-scan-tax-utilities"),
  btnScanPropertyMap: document.getElementById("btn-scan-property-map"),
  reportsSavedEmpty: document.getElementById("reports-saved-empty"),
  reportsSavedList: document.getElementById("reports-saved-list"),
  scanDocTitle: document.getElementById("scan-doc-title"),
  scanDocLede: document.getElementById("scan-doc-lede"),
  previewDocPhoto: document.getElementById("preview-doc-photo"),
  labelDocPhoto: document.getElementById("label-doc-photo"),
  inputDocPhoto: document.getElementById("input-doc-photo"),
  btnRetakeDocPhoto: document.getElementById("btn-retake-doc-photo"),
  btnAnalyzeDoc: document.getElementById("btn-analyze-doc"),
  btnManualDocReview: document.getElementById("btn-manual-doc-review"),
  reviewDocTitle: document.getElementById("review-doc-title"),
  reviewDocPhoto: document.getElementById("review-doc-photo"),
  reviewDocForm: document.getElementById("review-doc-form"),
  reviewDocFieldsInsurance: document.getElementById("review-doc-fields-insurance"),
  reviewDocFieldsTax: document.getElementById("review-doc-fields-tax"),
  docConfidenceNote: document.getElementById("doc-confidence-note"),
  docFieldNickname: document.getElementById("doc-field-nickname"),
  docFieldInsurer: document.getElementById("doc-field-insurer"),
  docFieldPolicyNumber: document.getElementById("doc-field-policy-number"),
  docFieldPolicyType: document.getElementById("doc-field-policy-type"),
  docFieldNamedInsureds: document.getElementById("doc-field-named-insureds"),
  docFieldPropertyAddress: document.getElementById("doc-field-property-address"),
  docFieldEffectiveDate: document.getElementById("doc-field-effective-date"),
  docFieldExpirationDate: document.getElementById("doc-field-expiration-date"),
  docFieldDwellingCoverage: document.getElementById("doc-field-dwelling-coverage"),
  docFieldPersonalProperty: document.getElementById("doc-field-personal-property"),
  docFieldLiability: document.getElementById("doc-field-liability"),
  docFieldDeductible: document.getElementById("doc-field-deductible"),
  docFieldPremium: document.getElementById("doc-field-premium"),
  docFieldAgentName: document.getElementById("doc-field-agent-name"),
  docFieldAgentPhone: document.getElementById("doc-field-agent-phone"),
  docFieldTaxNickname: document.getElementById("doc-field-tax-nickname"),
  docTaxLabelAuthority: document.getElementById("doc-tax-label-authority"),
  docTaxLabelYear: document.getElementById("doc-tax-label-year"),
  docTaxLabelAssessed: document.getElementById("doc-tax-label-assessed"),
  docTaxLabelAmount: document.getElementById("doc-tax-label-amount"),
  docTaxLabelDates: document.getElementById("doc-tax-label-dates"),
  docTaxLabelNotes: document.getElementById("doc-tax-label-notes"),
  docFieldTaxingAuthority: document.getElementById("doc-field-taxing-authority"),
  docFieldParcel: document.getElementById("doc-field-parcel"),
  docFieldTaxAddress: document.getElementById("doc-field-tax-address"),
  docFieldTaxYear: document.getElementById("doc-field-tax-year"),
  docFieldAssessedValue: document.getElementById("doc-field-assessed-value"),
  docFieldTaxAmount: document.getElementById("doc-field-tax-amount"),
  docFieldDueDates: document.getElementById("doc-field-due-dates"),
  docFieldExemptions: document.getElementById("doc-field-exemptions"),
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

/** @type {{ type: import("./document-storage.js").DocumentType | null, photoDataUrl: string | null, analysis: Record<string, string> | null }} */
const documentScan = {
  type: null,
  photoDataUrl: null,
  analysis: null,
};

let detailId = null;
/** @type {import("./analyze.js").MarketplaceListingResult | null} */
let marketplaceListing = null;
/** @type {import("./storage.js").ApplianceRecord | null} */
let marketplaceItem = null;
let toastTimer = 0;
let authMode = "signin";
let allowOfflineUse = false;
/** @type {"all" | "recent" | string} */
let homeRoomFilter = "recent";
let homeTypeFilter = "recent";
/** @type {import("./room-chips-prefs.js").HomeFilterAxis} */
let homeFilterAxis = loadHomeFilterAxis();
let homeSearchQuery = "";
/** @type {"dashboard" | "inventory"} */
let homePanel = "dashboard";

const REMEMBERED_EMAIL_KEY = "homepassport-ai:remembered-email";

/** @type {{ dataUrl: string | null, suggestions: { brand: string, modelNumber: string, serialNumber: string } | null }} */
const detailLabelPending = {
  dataUrl: null,
  suggestions: null,
};

/** Valid UUID even on iPhone HTTP (192.168.x.x is not a secure context — no crypto.randomUUID). */
function newRecordId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through — some WebViews throw even when the function exists.
    }
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last resort: still UUID-shaped so Postgres `uuid` columns accept it.
  const s = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
  return `${s()}${s()}-${s()}-4${s().slice(1)}-a${s().slice(1)}-${s()}${s()}${s()}`;
}

function setBuildTagText(suffix = "") {
  const text = `Phase A · build ${APP_VERSION}${suffix}`;
  if (els.buildTag) els.buildTag.textContent = text;
  if (els.landingBuildTag) els.landingBuildTag.textContent = text;
}

setBuildTagText();

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
    setBuildTagText(" · ready");

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
        toast(friendlyAuthMessage(err));
        allowOfflineUse = true;
      }
    }

    setupSessionRefresh();

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

async function enterApp(options = {}) {
  const { notifyAiReady = false } = options;
  if (isSupabaseConfigured() && !isSignedIn() && !allowOfflineUse) {
    if (els.btnAuthOffline) els.btnAuthOffline.hidden = false;
    updateSyncBanner();
    showView("landing");
    return;
  }

  if (isSignedIn()) {
    const migrated = await migrateLocalInventoryIfNeeded();
    if (migrated > 0) toast(`Synced ${migrated} appliance(s) to the cloud`);
  }

  await renderHome();
  updateSyncBanner();
  showView("home");

  const aiStatus = await refreshApiKeyStatus();
  if (notifyAiReady) {
    notifyApiKeyStatus(aiStatus);
  } else {
    await updateApiSetupBanner();
  }
}

async function onAuthChanged() {
  if (isSignedIn()) {
    const migrated = await migrateLocalInventoryIfNeeded();
    if (migrated > 0) toast(`Synced ${migrated} appliance(s) to the cloud`);
    await renderHome();
    updateSyncBanner();
    return;
  }
  updateSyncBanner();
  if (wasSessionExpired()) {
    clearSessionExpiredFlag();
    toast("Your sign-in expired. Please sign in again.");
    showAuth("signin");
  }
}

function setupSessionRefresh() {
  if (!isSupabaseConfigured() || typeof document === "undefined") return;

  const refresh = () => {
    if (document.visibilityState === "visible") {
      void refreshAuthIfNeeded();
    }
  };

  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pageshow", () => void refreshAuthIfNeeded());
  window.addEventListener("focus", () => void refreshAuthIfNeeded());
}

function init() {
  updateHeaderTooltips();
  initHomePromoCard();
  populateRoomSelect(els.fieldRoomScan);
  populateRoomSelect(els.fieldRoom);
  populateRoomSelect(els.editFieldRoom);
  els.btnAdd?.addEventListener("click", () => startScan());
  els.btnScanRoom?.addEventListener("click", () => startRoomScan());
  els.btnHomeScanRoom?.addEventListener("click", () => startRoomScan());
  els.btnHomeAddItem?.addEventListener("click", () => startScan());
  els.btnHomeInventory?.addEventListener("click", () => openInventoryPanel());
  els.btnHomeReports?.addEventListener("click", () => openReportsHub());
  els.btnHomeViewAll?.addEventListener("click", () => openInventoryPanel());
  els.btnHomeProtected?.addEventListener("click", () => openReportsHub());
  els.btnTabHome?.addEventListener("click", () => setHomePanel("dashboard"));
  els.btnTabInventory?.addEventListener("click", () => openInventoryPanel());
  els.btnTabReports?.addEventListener("click", () => openReportsHub());
  els.btnTabSettings?.addEventListener("click", () => {
    renderSettings();
    showView("settings");
  });
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
  els.btnManualReview?.addEventListener("click", () => void openManualReview());
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
  els.btnMarketplaceAppliance?.addEventListener("click", () => void openMarketplaceAssistant());
  els.btnMarketplaceBack?.addEventListener("click", () => {
    if (detailId) void openDetail(detailId);
    else showView("home");
  });
  els.btnMarketplaceRegenerate?.addEventListener("click", () => void generateMarketplaceListing());
  els.btnMarketplaceCopyAll?.addEventListener("click", () => void copyAllMarketplaceText());
  document.querySelectorAll(".marketplace-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-copy-target");
      if (targetId) void copyMarketplaceField(targetId);
    });
  });
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
    void saveSettingsApiKey();
  });
  els.providerOpenAi?.addEventListener("change", () => {
    if (els.providerOpenAi?.checked) {
      saveAiProvider("openai");
      syncAiProviderUi();
      void refreshApiKeyStatus();
    }
  });
  els.providerAnthropic?.addEventListener("change", () => {
    if (els.providerAnthropic?.checked) {
      saveAiProvider("anthropic");
      syncAiProviderUi();
      void refreshApiKeyStatus();
    }
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
    if (!enabled) {
      homeRoomFilter = "recent";
      homeTypeFilter = "recent";
    }
    toast(enabled ? "Filter chips on" : "Filter chips off");
    void renderHome();
  });
  els.btnFilterAxisRoom?.addEventListener("click", () => setHomeFilterAxis("room"));
  els.btnFilterAxisType?.addEventListener("click", () => setHomeFilterAxis("type"));
  els.btnClearApiKey?.addEventListener("click", () => clearSettingsApiKey());
  els.btnSignOut?.addEventListener("click", () => void handleSignOut());
  els.btnTopbarSignOut?.addEventListener("click", () => {
    if (isSignedIn()) void handleSignOut();
    else showAuth("signin");
  });
  els.btnHomePromoToggle?.addEventListener("click", () => toggleHomePromoCard());
  els.btnSyncStatus?.addEventListener("click", () => {
    if (!isSupabaseConfigured()) return;
    if (isSignedIn()) {
      renderSettings();
      showView("settings");
      return;
    }
    showAuth("signin");
  });
  els.btnGoSignIn?.addEventListener("click", () => showAuth("signin"));
  els.btnRefreshVersion?.addEventListener("click", () => refreshToLatestVersion());
  els.btnShowLanding?.addEventListener("click", () => {
    els.btnLandingBackApp?.removeAttribute("hidden");
    showView("landing");
  });
  els.btnLandingBackApp?.addEventListener("click", () => {
    els.btnLandingBackApp?.setAttribute("hidden", "");
    showView("home");
  });
  els.btnLandingSignIn?.addEventListener("click", () => showAuth("signin"));
  els.btnLandingRegister?.addEventListener("click", () => showAuth("signup"));
  els.btnLandingHeaderSignIn?.addEventListener("click", () => showAuth("signin"));
  els.btnLandingHeaderRegister?.addEventListener("click", () => showAuth("signup"));
  els.btnLandingStart?.addEventListener("click", () => showAuth("signup"));
  els.btnLandingOffline?.addEventListener("click", () => {
    allowOfflineUse = true;
    void enterApp();
  });
  els.btnAuthBack?.addEventListener("click", () => showView("landing"));
  els.authForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    void handleAuthSubmit();
  });
  els.authEmail?.addEventListener("input", () => {
    const email = els.authEmail?.value.trim() ?? "";
    if (email) syncRememberedEmail(email);
  });
  els.authRememberEmail?.addEventListener("change", () => {
    const email = els.authEmail?.value.trim() ?? "";
    if (email) syncRememberedEmail(email);
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
  els.btnReportsInsurancePdf?.addEventListener("click", () => void exportInsuranceReport());
  els.btnScanInsurancePolicy?.addEventListener("click", () => startDocumentScan("insurancePolicy"));
  els.btnScanPropertyTax?.addEventListener("click", () => startDocumentScan("propertyTax"));
  els.btnScanPropertyAssessment?.addEventListener("click", () => startDocumentScan("propertyAssessment"));
  els.btnScanPropertyTaxDeferment?.addEventListener("click", () =>
    startDocumentScan("propertyTaxDeferment"),
  );
  els.btnScanTaxUtilities?.addEventListener("click", () => startDocumentScan("taxUtilities"));
  els.btnScanPropertyMap?.addEventListener("click", () => startDocumentScan("propertyMap"));
  els.inputDocPhoto?.addEventListener("change", () => void onDocumentPhoto());
  els.btnRetakeDocPhoto?.addEventListener("click", () => clearDocumentPhoto());
  els.btnAnalyzeDoc?.addEventListener("click", () => void runDocumentAnalysis());
  els.btnManualDocReview?.addEventListener("click", () => openManualDocumentReview());
  els.reviewDocForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    void saveDocumentRecord();
  });
  els.btnRestoreBackup?.addEventListener("click", () => void restoreInventory());
  els.btnRestoreInventory?.addEventListener("click", () => void restoreInventory());
  els.inputImportBackup?.addEventListener("change", () => void importBackupFile());

  for (const btn of document.querySelectorAll("[data-nav]")) {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target === "home") {
        resetScan();
        resetRoomScan();
        homePanel = "dashboard";
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
      } else if (target === "guide") {
        showView("guide");
      } else if (target === "reports") {
        openReportsHub();
      } else if (target === "scan-doc") {
        showView("scanDoc");
      }
    });
  }
}

function setAuthMode(mode) {
  authMode = mode;
  if (els.btnAuthSubmit) {
    els.btnAuthSubmit.textContent = authMode === "signin" ? "Sign in" : "Create account";
  }
  if (els.btnAuthToggle) {
    els.btnAuthToggle.textContent =
      authMode === "signin" ? "Create an account" : "Already have an account? Sign in";
  }
  if (els.authPassword instanceof HTMLInputElement) {
    els.authPassword.autocomplete = authMode === "signin" ? "current-password" : "new-password";
  }
}

function loadRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

/** @param {string} email */
function saveRememberedEmail(email) {
  try {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  } catch {
    // Ignore storage failures in private mode.
  }
}

function clearRememberedEmail() {
  try {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Ignore storage failures in private mode.
  }
}

function applyRememberedEmail() {
  const remembered = loadRememberedEmail();
  if (els.authRememberEmail instanceof HTMLInputElement) {
    els.authRememberEmail.checked = Boolean(remembered);
  }
  if (els.authEmail instanceof HTMLInputElement && !els.authEmail.value.trim()) {
    els.authEmail.value = remembered;
  }
}

/** @param {string} email */
function syncRememberedEmail(email) {
  if (els.authRememberEmail instanceof HTMLInputElement && els.authRememberEmail.checked) {
    saveRememberedEmail(email);
  } else {
    clearRememberedEmail();
  }
}

/** @param {"signin" | "signup"} [mode] */
function showAuth(mode = "signin") {
  setAuthMode(mode);
  applyRememberedEmail();
  showView("auth");
}

function toggleAuthMode() {
  setAuthMode(authMode === "signin" ? "signup" : "signin");
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
    syncRememberedEmail(email);
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
    await enterApp({ notifyAiReady: true });
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
    syncRememberedEmail(email);
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
    await enterApp({ notifyAiReady: true });
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
  showView("landing");
  toast("Signed out");
}

function setTopbarTip(el, text) {
  if (!el) return;
  el.setAttribute("data-tip", text);
  el.setAttribute("aria-label", text);
  el.title = text;
}

function updateHeaderTooltips() {
  setTopbarTip(
    els.btnGuide,
    "How to use HomePassportAI — scanning tips, API key setup, and benefits",
  );
  setTopbarTip(
    els.btnSettings,
    "Settings — AI API key, account sign-in, backup, and insurance PDF",
  );
}

function updateTopbarSignOut() {
  if (!els.btnTopbarSignOut) return;
  if (!isSupabaseConfigured()) {
    els.btnTopbarSignOut.hidden = true;
    return;
  }
  const signedIn = isSignedIn();
  els.btnTopbarSignOut.hidden = false;
  els.btnTopbarSignOut.textContent = signedIn ? "Sign out" : "Sign in";
  els.btnTopbarSignOut.classList.toggle("topbar__sign-out--sign-in", !signedIn);
  setTopbarTip(
    els.btnTopbarSignOut,
    signedIn
      ? "Sign out of your account on this device"
      : "Sign in to sync and back up your inventory",
  );
}

const HOME_PROMO_COLLAPSED_KEY = "homepassport-ai:home-promo-collapsed";

function loadHomePromoCollapsed() {
  try {
    return localStorage.getItem(HOME_PROMO_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveHomePromoCollapsed(collapsed) {
  try {
    localStorage.setItem(HOME_PROMO_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore
  }
}

function setHomePromoCollapsed(collapsed) {
  if (!els.homePromoCard || !els.btnHomePromoToggle) return;
  els.homePromoCard.classList.toggle("is-collapsed", collapsed);
  els.btnHomePromoToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
}

function toggleHomePromoCard() {
  const collapsed = !els.homePromoCard?.classList.contains("is-collapsed");
  setHomePromoCollapsed(collapsed);
  saveHomePromoCollapsed(collapsed);
}

function initHomePromoCard() {
  setHomePromoCollapsed(loadHomePromoCollapsed());
}

function updateSyncBanner() {
  updateTopbarSignOut();
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
    setTopbarTip(
      els.btnSyncStatus,
      `Cloud sync on — signed in as ${email}. Your inventory is backing up online.`,
    );
    return;
  }
  els.btnSyncStatus.classList.add("is-offline");
  setTopbarTip(
    els.btnSyncStatus,
    "Cloud sync off — sign in to back up your inventory and use it on other devices",
  );
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
}

function openSettingsForApiKey() {
  renderSettings();
  showView("settings");
  requestAnimationFrame(() => {
    const active =
      loadAiProvider() === "anthropic" ? els.fieldAnthropicKey : els.fieldApiKey;
    active?.focus();
    active?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

async function requireUserApiKeyForAi() {
  const name = providerDisplayName();
  if (!hasUserApiKey()) {
    toast(`Add your ${name} API key in Settings to use AI analysis`);
    openSettingsForApiKey();
    return false;
  }
  const status = await checkApiKeyStatus();
  if (!status.ready || status.source !== "user") {
    toast(status.error ? `API key issue — ${status.error}` : `Set up your ${name} API key in Settings first`);
    openSettingsForApiKey();
    return false;
  }
  return true;
}

async function updateApiSetupBanner() {
  if (!els.apiSetupBanner) return;
  const status = await checkApiKeyStatus();
  const hide = status.ready && status.source === "user";
  els.apiSetupBanner.hidden = hide;
}

function requireCloudSave() {
  if (isSupabaseConfigured() && !isSignedIn() && !allowOfflineUse) {
    toast("Sign in to save to the cloud");
    showAuth("signin");
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
  updateRoomVideoCaptureUi();
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
  updateRoomVideoCaptureUi();
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
  if (!(await requireUserApiKeyForAi())) return;

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
        estimatedCurrentValue: item.estimatedCurrentValue || "",
        suggestedRetailPrice: item.suggestedRetailPrice || "",
        confidence: item.confidence,
        frameIndex,
        photoDataUrl: roomScan.frames[frameIndex],
      };
    });

    populateRoomSelect(els.fieldRoomScan, roomScan.roomGuess);
    if (els.roomReviewLede) {
      els.roomReviewLede.textContent = result.demoMode
        ? "Demo mode (no AI key) — sample items shown. Check ones to keep, then save."
        : `Found ${roomScan.candidates.length} item${roomScan.candidates.length === 1 ? "" : "s"}. Check the ones to keep.`;
    }
    renderRoomReview();
    showView("roomReview");
    if (result.demoMode) toast("Demo mode — add an AI API key in Settings for real room scans");
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
  const bits = [
    item.brand,
    item.modelNumber,
    item.serialNumber,
    item.estimatedCurrentValue,
    item.suggestedRetailPrice,
    item.confidence ? `${item.confidence} confidence` : "",
  ]
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
        estimatedCurrentValue: item.estimatedCurrentValue?.trim() || "",
        suggestedRetailPrice: item.suggestedRetailPrice?.trim() || "",
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
function scrollAppToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** @param {keyof typeof views} name */
function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    if (!el) continue;
    const active = key === name;
    el.hidden = !active;
    el.classList.toggle("view--active", active);
  }
  const app = document.getElementById("app");
  app?.classList.toggle("app--landing", name === "landing");
  app?.classList.toggle("app--home-tabbar", name === "home");
  if (name !== "landing") {
    els.btnLandingBackApp?.setAttribute("hidden", "");
  }
  scrollAppToTop();
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

  if (els.toolbarAppliance) els.toolbarAppliance.hidden = !hasAppliance;
  if (els.toolbarLabel) els.toolbarLabel.hidden = !hasLabel;
  if (els.toolbarReceipt) els.toolbarReceipt.hidden = !hasReceipt;
  if (els.labelAppliancePhoto) els.labelAppliancePhoto.hidden = hasAppliance;
  if (els.labelLabelPhoto) els.labelLabelPhoto.hidden = hasLabel;
  if (els.labelReceiptPhoto) els.labelReceiptPhoto.hidden = hasReceipt;

  setCaptureLabelText(els.labelAppliancePhoto, "Take appliance photo");
  setCaptureLabelText(els.labelLabelPhoto, "Take label photo");
  setCaptureLabelText(els.labelReceiptPhoto, "Take receipt photo");
}

/** @param {HTMLElement | null} labelEl @param {string} text */
function setCaptureLabelText(labelEl, text) {
  if (!labelEl) return;
  labelEl.textContent = text;
}

function updateDetailLabelCaptureUi() {
  const hasPhoto = Boolean(detailLabelPending.dataUrl);
  const layout = document.querySelector(".detail-label-capture .capture-layout");
  if (layout) layout.classList.toggle("capture-layout--split", hasPhoto);
  if (els.toolbarDetailLabel) els.toolbarDetailLabel.hidden = !hasPhoto;
  if (els.labelDetailLabelPhoto) {
    els.labelDetailLabelPhoto.hidden = hasPhoto;
    setCaptureLabelText(els.labelDetailLabelPhoto, "Take label photo");
  }
}

function updateDocumentCaptureUi() {
  const hasPhoto = Boolean(documentScan.photoDataUrl);
  if (els.toolbarDocPhoto) els.toolbarDocPhoto.hidden = !hasPhoto;
  if (els.labelDocPhoto) {
    els.labelDocPhoto.hidden = hasPhoto;
    setCaptureLabelText(els.labelDocPhoto, "Take document photo");
  }
  if (els.btnAnalyzeDoc) els.btnAnalyzeDoc.disabled = !hasPhoto;
  if (els.btnManualDocReview) els.btnManualDocReview.disabled = !hasPhoto;
}

function openManualDocumentReview() {
  if (!documentScan.photoDataUrl || !documentScan.type) {
    toast("Take a document photo first");
    return;
  }

  const meta = getDocumentTypeMeta(documentScan.type);
  documentScan.analysis = null;

  /** @type {Record<string, string>} */
  const empty = {
    nickname: meta.defaultNickname,
    confidence: "manual",
  };

  if (documentScan.type === "insurancePolicy") {
    populateDocumentReviewForm({
      insurerName: "",
      policyNumber: "",
      policyType: "",
      namedInsureds: "",
      propertyAddress: "",
      effectiveDate: "",
      expirationDate: "",
      dwellingCoverage: "",
      personalPropertyCoverage: "",
      liabilityCoverage: "",
      deductible: "",
      annualPremium: "",
      agentName: "",
      agentPhone: "",
      ...empty,
    });
  } else {
    populateDocumentReviewForm({
      taxingAuthority: "",
      parcelNumber: "",
      propertyAddress: "",
      taxYear: "",
      assessedValue: "",
      taxAmount: "",
      dueDates: "",
      exemptions: "",
      ...empty,
    });
  }

  if (els.docConfidenceNote) {
    els.docConfidenceNote.hidden = false;
    els.docConfidenceNote.textContent =
      "Manual entry — fill in what you know, then save. AI analysis is optional.";
  }

  showView("reviewDoc");
}

function updateRoomVideoCaptureUi() {
  const hasVideo = Boolean(roomScan.videoUrl);
  if (els.toolbarRoomVideo) els.toolbarRoomVideo.hidden = !hasVideo;
  if (els.labelRoomVideo) {
    els.labelRoomVideo.hidden = hasVideo;
    setCaptureLabelText(els.labelRoomVideo, "Record room video");
  }
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
  try {
    scan.appliancePhotoDataUrl = await readAndCompressPhoto(file, { maxEdge: 1280, quality: 0.78 });
    setPreview(els.previewAppliance, scan.appliancePhotoDataUrl);
    if (els.btnToStep2) els.btnToStep2.disabled = false;
    updateCaptureButtons();
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not read photo");
  }
}

async function onLabelPhoto() {
  const file = els.inputLabel?.files?.[0];
  if (!file) return;
  try {
    scan.labelPhotoDataUrl = await readAndCompressPhoto(file, { maxEdge: 1280, quality: 0.78 });
    setPreview(els.previewLabel, scan.labelPhotoDataUrl);
    updateCaptureButtons();
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not read photo");
  }
}

async function onReceiptPhoto() {
  const file = els.inputReceipt?.files?.[0];
  if (!file) return;
  try {
    scan.receiptPhotoDataUrl = await readAndCompressPhoto(file, { maxEdge: 1280, quality: 0.78 });
    setPreview(els.previewReceipt, scan.receiptPhotoDataUrl);
    updateCaptureButtons();
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not read photo");
  }
}

/** @param {File} file @param {{ maxEdge?: number, quality?: number }} [opts] */
async function readAndCompressPhoto(file, opts = {}) {
  const raw = await readFileAsDataUrl(file);
  try {
    return await compressDataUrl(raw, opts);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Could not process photo — take a new photo with the camera (avoid HEIC from Files)",
    );
  }
}

function populateReviewPhotos() {
  if (!els.reviewPhotos) return;
  els.reviewPhotos.innerHTML = "";
  const photos = [["Photo", scan.appliancePhotoDataUrl]];
  if (scan.labelPhotoDataUrl) photos.push(["Label / signature", scan.labelPhotoDataUrl]);
  if (scan.receiptPhotoDataUrl) photos.push(["Receipt", scan.receiptPhotoDataUrl]);
  for (const [label, url] of photos) {
    if (!url) continue;
    const img = document.createElement("img");
    img.src = url;
    img.alt = label;
    els.reviewPhotos.append(img);
  }
}

async function openManualReview() {
  if (!scan.appliancePhotoDataUrl) {
    toast("Take a photo first");
    showView("scan1");
    return;
  }

  if (!els.fieldNickname?.value.trim()) els.fieldNickname.value = "Painting";
  if (!els.fieldType?.value.trim()) els.fieldType.value = "Painting";
  if (els.confidenceNote) {
    els.confidenceNote.hidden = false;
    els.confidenceNote.textContent =
      "Manual entry — fill in artist, title, and room, then save. AI analysis is optional.";
  }
  populateReviewPhotos();
  showView("review");
}

async function runAnalysis() {
  if (!scan.appliancePhotoDataUrl) return;
  if (!(await requireUserApiKeyForAi())) return;

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
    els.fieldColor.value = result.colorDescription || "";
    els.fieldDimensions.value = result.dimensionsDescription || "";
    if (els.fieldEstimatedValue) els.fieldEstimatedValue.value = result.estimatedCurrentValue || "";
    if (els.fieldRetailPrice) els.fieldRetailPrice.value = result.suggestedRetailPrice || "";
    els.fieldNickname.value =
      result.nickname ||
      [result.brand, result.applianceType].filter(Boolean).join(" ").trim();

    if (!scan.labelPhotoDataUrl && result.signatureRegions?.length) {
      try {
        const collage = await buildSignatureCollageLabelPhoto(
          scan.appliancePhotoDataUrl,
          result.signatureRegions,
        );
        if (collage) {
          scan.labelPhotoDataUrl = await compressDataUrl(collage, { maxEdge: 960, quality: 0.82 });
        }
      } catch {
        // Signature crop is best-effort.
      }
    }

    if (els.confidenceNote) {
      const c = result.confidence || "low";
      els.confidenceNote.hidden = false;
      if (result.demoMode) {
        els.confidenceNote.textContent =
          "Demo mode — add your AI API key in Settings (⚙) to enable photo analysis.";
      } else if (scan.labelPhotoDataUrl && result.signatureRegions?.length) {
        els.confidenceNote.textContent =
          "Signature corners cropped from your photo and saved as the label image. Verify artist and details below.";
      } else {
        els.confidenceNote.textContent = `Extraction confidence: ${c}. Please verify before saving.`;
      }
    }

    populateReviewPhotos();
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
  if (!scan.appliancePhotoDataUrl) {
    toast("Take a photo first");
    return;
  }
  if (!requireCloudSave()) return;

  const submitBtn = els.reviewForm?.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
  }

  try {
    const appliancePhoto = await compressDataUrl(scan.appliancePhotoDataUrl, {
      maxEdge: 1200,
      quality: 0.8,
    });
    const labelPhoto = scan.labelPhotoDataUrl
      ? await compressDataUrl(scan.labelPhotoDataUrl, { maxEdge: 1200, quality: 0.8 })
      : null;
    const receiptPhoto = scan.receiptPhotoDataUrl
      ? await compressDataUrl(scan.receiptPhotoDataUrl, { maxEdge: 1200, quality: 0.8 })
      : null;

    const type = els.fieldType.value.trim();
    const brand = els.fieldBrand.value.trim();
    const room = els.fieldRoom.value;
    const defaultName =
      [brand, type].filter(Boolean).join(" ").trim() ||
      (room !== "Other" ? `${room} item` : "Item");

    const record = {
      id: newRecordId(),
      nickname: els.fieldNickname.value.trim() || defaultName,
      room,
      applianceType: type,
      brand,
      modelNumber: els.fieldModel.value.trim(),
      serialNumber: els.fieldSerial.value.trim(),
      colorDescription: els.fieldColor?.value.trim() ?? "",
      dimensionsDescription: els.fieldDimensions?.value.trim() ?? "",
      estimatedCurrentValue: els.fieldEstimatedValue?.value.trim() ?? "",
      suggestedRetailPrice: els.fieldRetailPrice?.value.trim() ?? "",
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
    console.error(err);
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
          ? String(/** @type {{ message?: unknown }} */ (err).message || "")
          : "";
    toast(msg || "Could not save — check your connection and try again");
  } finally {
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save to HomePassportAI";
    }
  }
}

function syncAiProviderUi() {
  const provider = loadAiProvider();
  if (els.providerOpenAi instanceof HTMLInputElement) {
    els.providerOpenAi.checked = provider === "openai";
  }
  if (els.providerAnthropic instanceof HTMLInputElement) {
    els.providerAnthropic.checked = provider === "anthropic";
  }
  if (els.fieldOpenAiWrap) els.fieldOpenAiWrap.hidden = provider !== "openai";
  if (els.fieldAnthropicWrap) els.fieldAnthropicWrap.hidden = provider !== "anthropic";
}

function renderSettings() {
  if (els.fieldTheme) els.fieldTheme.value = loadThemePreference();
  if (els.fieldRoomChips) els.fieldRoomChips.checked = loadRoomChipsEnabled();
  syncAiProviderUi();
  void refreshApiKeyStatus();
  if (els.fieldApiKey) els.fieldApiKey.value = "";
  if (els.fieldAnthropicKey) els.fieldAnthropicKey.value = "";
  if (els.btnClearApiKey) els.btnClearApiKey.hidden = !hasUserApiKey();

  const cloud = isSupabaseConfigured();
  const signedIn = isSignedIn();
  if (els.settingsAccount) els.settingsAccount.hidden = !cloud || !signedIn;
  if (els.btnGoSignIn) els.btnGoSignIn.hidden = !cloud || signedIn;
  if (els.settingsEmail && signedIn) els.settingsEmail.textContent = getUserEmail();
  if (els.btnAuthOffline) els.btnAuthOffline.hidden = !cloud;
  renderInstallSettings();
}

/** @param {import("./analyze.js").ApiKeyStatus} status */
function applyApiKeyStatus(status) {
  if (!els.apiKeyStatus) return;
  els.apiKeyStatus.hidden = false;
  els.apiKeyStatus.classList.remove("is-ready", "is-warning", "is-missing");
  const name = providerDisplayName(status.provider || loadAiProvider());

  if (status.ready && status.source === "user") {
    els.apiKeyStatus.classList.add("is-ready");
    els.apiKeyStatus.textContent = `${name} ready — key ${status.masked} verified`;
    return;
  }
  if (status.source === "user" && status.masked) {
    els.apiKeyStatus.classList.add("is-warning");
    els.apiKeyStatus.textContent = `${name} key saved (${status.masked}) but not working — ${status.error || "check your provider dashboard"}`;
    return;
  }
  els.apiKeyStatus.classList.add("is-missing");
  els.apiKeyStatus.textContent = `No ${name} key yet — add your own key below (never a shared developer key)`;
}

/** @param {import("./analyze.js").ApiKeyStatus} status */
function notifyApiKeyStatus(status) {
  const name = providerDisplayName(status.provider || loadAiProvider());
  if (status.ready && status.source === "user") {
    toast(`${name} analysis ready — ${status.masked}`);
    return;
  }
  if (status.source === "user" && status.masked) {
    toast(status.error ? `API key issue — ${status.error}` : "API key saved but not verified — check Settings");
    return;
  }
  toast(`Add your ${name} API key in Settings to use AI analysis`);
}

async function refreshApiKeyStatus() {
  const status = await checkApiKeyStatus();
  applyApiKeyStatus(status);
  await updateApiSetupBanner();
  return status;
}

async function saveSettingsApiKey() {
  const provider = loadAiProvider();
  if (provider === "anthropic") {
    const key = els.fieldAnthropicKey?.value.trim() ?? "";
    if (!key) {
      toast("Paste your Claude API key");
      return;
    }
    if (!key.startsWith("sk-ant-")) {
      toast("Claude keys usually start with sk-ant-");
      return;
    }
    saveAnthropicApiKey(key);
  } else {
    const key = els.fieldApiKey?.value.trim() ?? "";
    if (!key) {
      toast("Paste your OpenAI API key");
      return;
    }
    if (!key.startsWith("sk-")) {
      toast("OpenAI keys should start with sk-");
      return;
    }
    saveApiKey(key);
  }
  if (els.fieldApiKey) els.fieldApiKey.value = "";
  if (els.fieldAnthropicKey) els.fieldAnthropicKey.value = "";
  const status = await refreshApiKeyStatus();
  notifyApiKeyStatus(status);
  if (els.btnClearApiKey) els.btnClearApiKey.hidden = !hasUserApiKey();
}

function clearSettingsApiKey() {
  if (!hasUserApiKey()) return;
  const name = providerDisplayName();
  if (!confirm(`Remove the saved ${name} API key from this device?`)) return;
  clearApiKey();
  renderSettings();
  toast(`${name} API key removed`);
}

function refreshToLatestVersion() {
  try {
    const url = new URL(location.href);
    url.searchParams.set("update", String(Date.now()));
    url.searchParams.set("v", String(Date.now()));
    location.replace(url.toString());
  } catch {
    location.reload();
  }
}

function openReportsHub() {
  renderReportsHub();
  setHomePanel("reports");
  showView("home");
}

function renderReportsHub() {
  const docs = loadDocuments();
  if (els.reportsSavedEmpty) {
    els.reportsSavedEmpty.hidden = docs.length > 0;
  }
  if (!els.reportsSavedList) return;
  els.reportsSavedList.hidden = docs.length === 0;
  els.reportsSavedList.innerHTML = "";

  for (const doc of docs) {
    const card = document.createElement("article");
    card.className = "reports-saved-card";

    const head = document.createElement("div");
    head.className = "reports-saved-card__head";

    const textWrap = document.createElement("div");
    const title = document.createElement("p");
    title.className = "reports-saved-card__title";
    title.textContent = doc.nickname || documentTypeLabel(doc.type);

    const type = document.createElement("p");
    type.className = "reports-saved-card__type";
    type.textContent = documentTypeLabel(doc.type);

    const meta = document.createElement("p");
    meta.className = "reports-saved-card__meta";
    meta.textContent = documentSummaryLine(doc);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "reports-saved-card__delete";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      if (!confirm(`Delete "${doc.nickname || documentTypeLabel(doc.type)}"?`)) return;
      deleteDocument(doc.id);
      renderReportsHub();
      toast("Document removed");
    });

    textWrap.append(title, type, meta);
    head.append(textWrap, del);
    card.append(head);
    els.reportsSavedList.append(card);
  }
}

/** @param {import("./document-storage.js").DocumentRecord} doc */
function documentSummaryLine(doc) {
  if (doc.type === "insurancePolicy") {
    const fields = /** @type {import("./document-storage.js").InsurancePolicyFields} */ (doc.extracted);
    const parts = [
      fields.insurerName,
      fields.policyNumber ? `Policy ${fields.policyNumber}` : "",
      fields.expirationDate ? `Renews ${fields.expirationDate}` : "",
    ].filter(Boolean);
    return parts.join(" • ") || "Saved for your records";
  }
  const fields = /** @type {import("./document-storage.js").PropertyTaxFields} */ (doc.extracted);
  const parts = [
    fields.taxingAuthority,
    fields.taxYear ? `Year ${fields.taxYear}` : "",
    fields.taxAmount || fields.assessedValue || "",
  ].filter(Boolean);
  return parts.join(" • ") || documentTypeLabel(doc.type);
}

/** @param {import("./document-storage.js").DocumentType} type */
function startDocumentScan(type) {
  resetDocumentScan();
  documentScan.type = type;
  const meta = getDocumentTypeMeta(type);
  if (els.scanDocTitle) els.scanDocTitle.textContent = meta.scanTitle;
  if (els.scanDocLede) els.scanDocLede.textContent = meta.scanLede;
  setCaptureLabelText(els.labelDocPhoto, "Take document photo");
  showView("scanDoc");
}

function resetDocumentScan() {
  documentScan.type = null;
  documentScan.photoDataUrl = null;
  documentScan.analysis = null;
  setPreview(els.previewDocPhoto, null);
  if (els.inputDocPhoto) els.inputDocPhoto.value = "";
  if (els.docConfidenceNote) els.docConfidenceNote.hidden = true;
  updateDocumentCaptureUi();
}

async function onDocumentPhoto() {
  const file = els.inputDocPhoto?.files?.[0];
  if (!file) return;
  try {
    documentScan.photoDataUrl = await readFileAsDataUrl(file);
    setPreview(els.previewDocPhoto, documentScan.photoDataUrl);
    updateDocumentCaptureUi();
  } catch {
    toast("Could not read photo");
  }
}

function clearDocumentPhoto() {
  documentScan.photoDataUrl = null;
  if (els.inputDocPhoto) els.inputDocPhoto.value = "";
  setPreview(els.previewDocPhoto, null);
  updateDocumentCaptureUi();
}

async function runDocumentAnalysis() {
  if (!documentScan.photoDataUrl || !documentScan.type) return;
  if (!(await requireUserApiKeyForAi())) return;

  if (els.btnAnalyzeDoc) {
    els.btnAnalyzeDoc.disabled = true;
    els.btnAnalyzeDoc.textContent = "Analyzing…";
  }

  try {
    const photo = await compressDataUrl(documentScan.photoDataUrl, {
      maxEdge: 1200,
      quality: 0.78,
    });
    const result = await analyzeDocumentPhoto(documentScan.type, photo);
    documentScan.analysis = result;
    populateDocumentReviewForm(result);
    showView("reviewDoc");
  } catch (err) {
    toast(err instanceof Error ? err.message : "Analysis failed");
  } finally {
    if (els.btnAnalyzeDoc) {
      els.btnAnalyzeDoc.disabled = !documentScan.photoDataUrl;
      els.btnAnalyzeDoc.textContent = "Analyze document";
    }
    if (els.btnManualDocReview) els.btnManualDocReview.disabled = !documentScan.photoDataUrl;
  }
}

/** @param {Record<string, string>} result */
function populateDocumentReviewForm(result) {
  const type = documentScan.type;
  const meta = getDocumentTypeMeta(type || "propertyTax");
  const isInsurance = type === "insurancePolicy";
  const taxLike = isTaxLikeDocument(type || "propertyTax");

  if (els.reviewDocTitle) els.reviewDocTitle.textContent = meta.reviewTitle;
  els.reviewDocFieldsInsurance?.toggleAttribute("hidden", !isInsurance);
  els.reviewDocFieldsTax?.toggleAttribute("hidden", !taxLike);

  const locationLabel = locationDisplayLabel(loadLocation());

  if (isInsurance) {
    if (els.docFieldNickname) {
      els.docFieldNickname.value =
        result.nickname ||
        [result.insurerName, result.policyType].filter(Boolean).join(" ").trim();
    }
    if (els.docFieldInsurer) els.docFieldInsurer.value = result.insurerName || "";
    if (els.docFieldPolicyNumber) els.docFieldPolicyNumber.value = result.policyNumber || "";
    if (els.docFieldPolicyType) els.docFieldPolicyType.value = result.policyType || "";
    if (els.docFieldNamedInsureds) els.docFieldNamedInsureds.value = result.namedInsureds || "";
    if (els.docFieldPropertyAddress) {
      els.docFieldPropertyAddress.value = result.propertyAddress || locationLabel;
    }
    if (els.docFieldEffectiveDate) els.docFieldEffectiveDate.value = result.effectiveDate || "";
    if (els.docFieldExpirationDate) els.docFieldExpirationDate.value = result.expirationDate || "";
    if (els.docFieldDwellingCoverage) els.docFieldDwellingCoverage.value = result.dwellingCoverage || "";
    if (els.docFieldPersonalProperty) els.docFieldPersonalProperty.value = result.personalPropertyCoverage || "";
    if (els.docFieldLiability) els.docFieldLiability.value = result.liabilityCoverage || "";
    if (els.docFieldDeductible) els.docFieldDeductible.value = result.deductible || "";
    if (els.docFieldPremium) els.docFieldPremium.value = result.annualPremium || "";
    if (els.docFieldAgentName) els.docFieldAgentName.value = result.agentName || "";
    if (els.docFieldAgentPhone) els.docFieldAgentPhone.value = result.agentPhone || "";
  } else if (taxLike) {
    const labels = meta.taxLabels;
    if (labels) {
      if (els.docTaxLabelAuthority) els.docTaxLabelAuthority.textContent = labels.authority;
      if (els.docTaxLabelYear) els.docTaxLabelYear.textContent = labels.year;
      if (els.docTaxLabelAssessed) els.docTaxLabelAssessed.textContent = labels.assessed;
      if (els.docTaxLabelAmount) els.docTaxLabelAmount.textContent = labels.amount;
      if (els.docTaxLabelDates) els.docTaxLabelDates.textContent = labels.dates;
      if (els.docTaxLabelNotes) els.docTaxLabelNotes.textContent = labels.notes;
      if (els.docFieldTaxNickname instanceof HTMLInputElement) {
        els.docFieldTaxNickname.placeholder = labels.nicknamePlaceholder;
      }
    }
    if (els.docFieldTaxNickname) {
      els.docFieldTaxNickname.value =
        result.nickname ||
        [result.taxingAuthority, result.taxYear ? `${meta.label} ${result.taxYear}` : meta.label]
          .filter(Boolean)
          .join(" ");
    }
    if (els.docFieldTaxingAuthority) els.docFieldTaxingAuthority.value = result.taxingAuthority || "";
    if (els.docFieldParcel) els.docFieldParcel.value = result.parcelNumber || "";
    if (els.docFieldTaxAddress) {
      els.docFieldTaxAddress.value = result.propertyAddress || locationLabel;
    }
    if (els.docFieldTaxYear) els.docFieldTaxYear.value = result.taxYear || "";
    if (els.docFieldAssessedValue) els.docFieldAssessedValue.value = result.assessedValue || "";
    if (els.docFieldTaxAmount) els.docFieldTaxAmount.value = result.taxAmount || "";
    if (els.docFieldDueDates) els.docFieldDueDates.value = result.dueDates || "";
    if (els.docFieldExemptions) els.docFieldExemptions.value = result.exemptions || "";
  }

  if (els.docConfidenceNote) {
    const c = result.confidence || "low";
    els.docConfidenceNote.hidden = false;
    if (result.demoMode) {
      els.docConfidenceNote.textContent =
        "Demo mode — add your AI API key in Settings to enable document extraction.";
    } else {
      els.docConfidenceNote.textContent = `Extraction confidence: ${c}. Please verify before saving.`;
    }
  }

  if (els.reviewDocPhoto && documentScan.photoDataUrl) {
    els.reviewDocPhoto.innerHTML = "";
    const img = document.createElement("img");
    img.src = documentScan.photoDataUrl;
    img.alt = `${meta.label} photo`;
    els.reviewDocPhoto.append(img);
  }
}

async function saveDocumentRecord() {
  if (!documentScan.photoDataUrl || !documentScan.type) return;

  const submitBtn = els.reviewDocForm?.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
  }

  try {
    const photo = await compressDataUrl(documentScan.photoDataUrl, {
      maxEdge: 1200,
      quality: 0.82,
    });

    /** @type {import("./document-storage.js").DocumentRecord} */
    const record = {
      id: newRecordId(),
      type: documentScan.type,
      nickname: "",
      photoDataUrl: photo,
      extracted: {},
      confidence: documentScan.analysis?.confidence || "manual",
      scannedAt: new Date().toISOString(),
    };

    if (documentScan.type === "insurancePolicy") {
      record.nickname = els.docFieldNickname?.value.trim() || "Insurance policy";
      record.extracted = {
        insurerName: els.docFieldInsurer?.value.trim() || "",
        policyNumber: els.docFieldPolicyNumber?.value.trim() || "",
        policyType: els.docFieldPolicyType?.value.trim() || "",
        namedInsureds: els.docFieldNamedInsureds?.value.trim() || "",
        propertyAddress: els.docFieldPropertyAddress?.value.trim() || "",
        effectiveDate: els.docFieldEffectiveDate?.value.trim() || "",
        expirationDate: els.docFieldExpirationDate?.value.trim() || "",
        dwellingCoverage: els.docFieldDwellingCoverage?.value.trim() || "",
        personalPropertyCoverage: els.docFieldPersonalProperty?.value.trim() || "",
        liabilityCoverage: els.docFieldLiability?.value.trim() || "",
        deductible: els.docFieldDeductible?.value.trim() || "",
        annualPremium: els.docFieldPremium?.value.trim() || "",
        agentName: els.docFieldAgentName?.value.trim() || "",
        agentPhone: els.docFieldAgentPhone?.value.trim() || "",
      };
    } else {
      const meta = getDocumentTypeMeta(documentScan.type);
      record.nickname = els.docFieldTaxNickname?.value.trim() || meta.defaultNickname;
      record.extracted = {
        taxingAuthority: els.docFieldTaxingAuthority?.value.trim() || "",
        parcelNumber: els.docFieldParcel?.value.trim() || "",
        propertyAddress: els.docFieldTaxAddress?.value.trim() || "",
        taxYear: els.docFieldTaxYear?.value.trim() || "",
        assessedValue: els.docFieldAssessedValue?.value.trim() || "",
        taxAmount: els.docFieldTaxAmount?.value.trim() || "",
        dueDates: els.docFieldDueDates?.value.trim() || "",
        exemptions: els.docFieldExemptions?.value.trim() || "",
      };
    }

    addDocument(record);
    resetDocumentScan();
    openReportsHub();
    toast(`Saved ${record.nickname}`);
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not save document");
  } finally {
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save document";
    }
  }
}

async function exportInsuranceReport() {
  const list = await loadAppliances();
  if (list.length === 0) {
    toast("No appliances to include — add or restore your inventory first");
    return;
  }

  const buttons = [els.btnInsurancePdf, els.btnReportsInsurancePdf].filter(
    (btn) => btn instanceof HTMLButtonElement,
  );
  for (const btn of buttons) {
    btn.disabled = true;
    btn.dataset.prevLabel = btn.textContent || "";
    btn.textContent = "Building PDF…";
  }

  try {
    const { generateInsurancePdf: buildPdf } = await import("./insurance-report.js");
    if (typeof buildPdf !== "function") {
      throw new Error("PDF generator failed to load — hard-refresh and try again");
    }
    await buildPdf(list);
    toast(`Insurance PDF ready (${list.length} item${list.length === 1 ? "" : "s"})`);
  } catch (err) {
    toast(err instanceof Error ? err.message : "Could not create PDF");
  } finally {
    for (const btn of buttons) {
      btn.disabled = false;
      btn.textContent = btn.dataset.prevLabel || "Download insurance PDF";
      delete btn.dataset.prevLabel;
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
  const onDashboard = homePanel === "dashboard";
  const onInventory = homePanel === "inventory";

  if (onDashboard) {
    updateHomeDashboardStats(list.length);
    renderRecentlyAdded(list, chipsEnabled);

    if (els.homeFilterToolbar) {
      els.homeFilterToolbar.hidden = !chipsEnabled || !hasInventory;
    }

    if (chipsEnabled && hasInventory) {
      if (homeFilterAxis === "type") {
        const typeGrouped = groupByItemCategory(list);
        if (
          homeTypeFilter !== "all" &&
          homeTypeFilter !== "recent" &&
          !typeGrouped.some(([id]) => id === homeTypeFilter)
        ) {
          homeTypeFilter = "recent";
        }
      } else {
        const allGrouped = groupByRoom(list);
        if (
          homeRoomFilter !== "all" &&
          homeRoomFilter !== "recent" &&
          homeRoomFilter !== BUILDING_FILTER_ID &&
          homeRoomFilter !== OUTDOOR_FILTER_ID &&
          !allGrouped.some(([room]) => room === homeRoomFilter)
        ) {
          homeRoomFilter = "recent";
        }
      }
      syncHomeFilterAxisButtons();
      renderHomeFilterChips(list);
    } else {
      homeRoomFilter = "recent";
      homeTypeFilter = "recent";
    }
  } else {
    if (els.homeFilterToolbar) els.homeFilterToolbar.hidden = true;
    if (els.homeRecentGrid) els.homeRecentGrid.innerHTML = "";
    if (els.homeRecentEmpty) els.homeRecentEmpty.hidden = true;
  }

  if (onInventory) {
    if (els.homeSearch) {
      els.homeSearch.hidden = !hasInventory;
    }
    if (els.inputHomeSearch && els.inputHomeSearch.value !== homeSearchQuery) {
      els.inputHomeSearch.value = homeSearchQuery;
    }
    updateHomeSearchClearButton();

    const filtered = homeSearchQuery ? list.filter((item) => applianceMatchesSearch(item, homeSearchQuery)) : list;
    const grouped = groupByRoom(filtered);

    els.applianceList.innerHTML = "";
    els.emptyState.hidden = hasInventory;
    if (els.searchNoResults) {
      els.searchNoResults.hidden = !hasInventory || filtered.length > 0 || !homeSearchQuery;
    }

    const showHeadings =
      !chipsEnabled ||
      homeRoomFilter === "all" ||
      homeRoomFilter === BUILDING_FILTER_ID ||
      homeRoomFilter === OUTDOOR_FILTER_ID;
    const roomFiltered =
      chipsEnabled &&
      homeRoomFilter !== "all" &&
      homeRoomFilter !== "recent" &&
      homeRoomFilter !== BUILDING_FILTER_ID &&
      homeRoomFilter !== OUTDOOR_FILTER_ID;

    if (chipsEnabled && homeRoomFilter === "recent") {
      const sorted = [...filtered].sort(
        (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
      );
      for (const item of sorted) {
        els.applianceList.append(makeApplianceCardButton(item));
      }
    } else {
      const entries =
        chipsEnabled && homeRoomFilter === BUILDING_FILTER_ID
          ? grouped.filter(([room]) => isBuildingRoom(room))
          : chipsEnabled && homeRoomFilter === OUTDOOR_FILTER_ID
            ? grouped.filter(([room]) => isOutdoorGroupRoom(room))
            : roomFiltered
              ? grouped.filter(([room]) => room === homeRoomFilter)
              : grouped;

      let buildingGroupHeadingShown = false;
      let outdoorGroupHeadingShown = false;
      for (const [room, items] of entries) {
        if (showHeadings && isBuildingRoom(room) && !buildingGroupHeadingShown) {
          const groupHeading = document.createElement("h2");
          groupHeading.className = "category-group-heading";
          groupHeading.textContent = BUILDING_GROUP_LABEL;
          els.applianceList.append(groupHeading);
          buildingGroupHeadingShown = true;
        }

        if (showHeadings && isOutdoorGroupRoom(room) && !outdoorGroupHeadingShown) {
          const groupHeading = document.createElement("h2");
          groupHeading.className = "category-group-heading";
          groupHeading.textContent = OUTDOOR_GROUP_LABEL;
          els.applianceList.append(groupHeading);
          outdoorGroupHeadingShown = true;
        }

        if (showHeadings) {
          const heading = document.createElement("h3");
          heading.className = "category-heading";
          setRoomTitleElement(heading, room, roomDisplayName(room));
          els.applianceList.append(heading);
        }

        for (const item of items) {
          els.applianceList.append(makeApplianceCardButton(item));
        }
      }
    }
  } else {
    els.applianceList.innerHTML = "";
    if (els.homeSearch) els.homeSearch.hidden = true;
    if (els.searchNoResults) els.searchNoResults.hidden = true;
    els.emptyState.hidden = true;
  }

  applyHomePanelVisibility();
  void updateApiSetupBanner();
  syncHomeTabButtons();
}

function openInventoryPanel() {
  homeRoomFilter = "all";
  setHomePanel("inventory");
  void renderHome();
  queueMicrotask(() => {
    els.inputHomeSearch?.focus({ preventScroll: true });
  });
}

function applyHomePanelVisibility() {
  els.homeDashboard?.toggleAttribute("hidden", homePanel !== "dashboard");
  els.homeInventoryPanel?.toggleAttribute("hidden", homePanel !== "inventory");
  els.homeReportsPanel?.toggleAttribute("hidden", homePanel !== "reports");
}

function setHomePanel(panel) {
  homePanel = panel;
  applyHomePanelVisibility();
  syncHomeTabButtons();
  if (panel === "inventory") {
    els.homeInventoryPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (panel === "reports") {
    els.homeReportsPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function syncHomeTabButtons() {
  els.btnTabHome?.classList.toggle("is-active", homePanel === "dashboard");
  els.btnTabInventory?.classList.toggle("is-active", homePanel === "inventory");
  els.btnTabReports?.classList.toggle("is-active", homePanel === "reports");
}

function updateHomeDashboardStats(itemCount) {
  if (els.homeItemMeta) {
    const label = itemCount === 1 ? "Item" : "Items";
    els.homeItemMeta.textContent = `${itemCount} ${label} • All Up to Date`;
  }
}

/** @param {"all" | "recent" | string} [filter] */
function getHomeRecentSectionTitle(filter = activeHomeFilter()) {
  if (filter === "all") return "All Items";
  if (filter === "recent") return "Recently Added";
  if (homeFilterAxis === "type") {
    return getItemCategoryMeta(filter).label;
  }
  if (filter === BUILDING_FILTER_ID) return BUILDING_GROUP_LABEL;
  if (filter === OUTDOOR_FILTER_ID) return OUTDOOR_GROUP_LABEL;
  return roomDisplayName(filter);
}

/** @returns {"all" | "recent" | string} */
function activeHomeFilter() {
  return homeFilterAxis === "type" ? homeTypeFilter : homeRoomFilter;
}

/** @param {import("./room-chips-prefs.js").HomeFilterAxis} axis */
function setHomeFilterAxis(axis) {
  if (homeFilterAxis === axis) return;
  homeFilterAxis = axis;
  saveHomeFilterAxis(axis);
  homeRoomFilter = "recent";
  homeTypeFilter = "recent";
  syncHomeFilterAxisButtons();
  void renderHome();
}

function syncHomeFilterAxisButtons() {
  els.btnFilterAxisRoom?.classList.toggle("is-active", homeFilterAxis === "room");
  els.btnFilterAxisType?.classList.toggle("is-active", homeFilterAxis === "type");
  if (els.roomFilterChips) {
    els.roomFilterChips.setAttribute(
      "aria-label",
      homeFilterAxis === "type" ? "Filter by group" : "Filter by room",
    );
  }
}

/** @param {import("./storage.js").ApplianceRecord} item */
function makeApplianceCardButton(item) {
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

  const extraParts = [item.colorDescription, item.dimensionsDescription].filter(Boolean);
  if (extraParts.length) {
    const extra = document.createElement("p");
    extra.className = "appliance-card__extra";
    extra.textContent = extraParts.join(" · ");
    body.append(extra);
  }

  btn.append(img, body);
  btn.addEventListener("click", () => void openDetail(item.id));
  return btn;
}

/** @param {import("./storage.js").ApplianceRecord[]} list @param {"all" | "recent" | string} filter */
function getDashboardCategoryItems(list, filter) {
  let items = [...list];

  if (homeFilterAxis === "type") {
    if (filter !== "all" && filter !== "recent") {
      items = items.filter((item) => mapItemCategory(item.applianceType) === filter);
      items.sort((a, b) =>
        (a.nickname || "").localeCompare(b.nickname || "", undefined, { sensitivity: "base" }),
      );
      return items;
    }
  } else if (filter !== "all" && filter !== "recent" && filter !== BUILDING_FILTER_ID && filter !== OUTDOOR_FILTER_ID) {
    items = items.filter((item) => (item.room || "Other") === filter);
    items.sort((a, b) =>
      (a.nickname || "").localeCompare(b.nickname || "", undefined, { sensitivity: "base" }),
    );
    return items;
  }

  if (homeFilterAxis === "room" && filter === BUILDING_FILTER_ID) {
    items = items.filter((item) => isBuildingRoom(item.room || "Other"));
    items.sort((a, b) =>
      (a.nickname || "").localeCompare(b.nickname || "", undefined, { sensitivity: "base" }),
    );
    return items;
  }

  if (homeFilterAxis === "room" && filter === OUTDOOR_FILTER_ID) {
    items = items.filter((item) => isOutdoorGroupRoom(item.room || "Other"));
    items.sort((a, b) =>
      (a.nickname || "").localeCompare(b.nickname || "", undefined, { sensitivity: "base" }),
    );
    return items;
  }

  items.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  if (filter === "recent") {
    return items.slice(0, 6);
  }

  return items;
}

/** @param {"all" | "recent" | string} filter */
function getHomeRecentEmptyMessage(filter) {
  if (filter === "recent" || filter === "all") return "No items yet — scan or add your first item.";
  if (homeFilterAxis === "type") {
    return `No ${getItemCategoryMeta(filter).label.toLowerCase()} items yet.`;
  }
  if (filter === BUILDING_FILTER_ID) return "No building items yet.";
  if (filter === OUTDOOR_FILTER_ID) return "No outdoor items yet.";
  return `No items in ${roomDisplayName(filter)} yet.`;
}

/** @param {import("./storage.js").ApplianceRecord[]} list @param {boolean} [chipsEnabled] */
function renderRecentlyAdded(list, chipsEnabled = loadRoomChipsEnabled()) {
  if (!els.homeRecentGrid) return;
  els.homeRecentGrid.innerHTML = "";

  const filter = chipsEnabled ? activeHomeFilter() : "recent";
  if (els.homeRecentTitle) {
    els.homeRecentTitle.textContent = getHomeRecentSectionTitle(filter);
  }

  const items = getDashboardCategoryItems(list, filter);

  if (els.homeRecentEmpty) {
    els.homeRecentEmpty.textContent = getHomeRecentEmptyMessage(filter);
    els.homeRecentEmpty.hidden = items.length > 0;
  }

  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "home-recent-card";
    btn.setAttribute("role", "listitem");

    const imgWrap = document.createElement("div");
    imgWrap.className = "home-recent-card__img-wrap";
    const img = document.createElement("img");
    img.className = "home-recent-card__img";
    img.src = item.appliancePhotoDataUrl;
    img.alt = "";
    imgWrap.append(img);

    const body = document.createElement("div");
    body.className = "home-recent-card__body";
    const name = document.createElement("p");
    name.className = "home-recent-card__name";
    name.textContent = item.nickname;
    const room = document.createElement("p");
    room.className = "home-recent-card__room";
    room.textContent = roomDisplayName(item.room);
    const price = document.createElement("p");
    price.className = "home-recent-card__price";
    price.textContent = item.estimatedCurrentValue || item.suggestedRetailPrice || "—";
    body.append(name, room, price);

    btn.append(imgWrap, body);
    btn.addEventListener("click", () => void openDetail(item.id));
    els.homeRecentGrid.append(btn);
  }
}

/** @param {import("./storage.js").ApplianceRecord} item @param {string} query */
function applianceMatchesSearch(item, query) {
  const haystack = [
    item.nickname,
    item.brand,
    item.modelNumber,
    item.serialNumber,
    item.colorDescription,
    item.dimensionsDescription,
    item.estimatedCurrentValue,
    item.suggestedRetailPrice,
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

/** @param {import("./storage.js").ApplianceRecord[]} list */
function renderHomeFilterChips(list) {
  const container = els.roomFilterChips;
  if (!container) return;

  container.innerHTML = "";
  const totalCount = list.length;
  const active = activeHomeFilter();

  container.append(
    makeHomeFilterChip("all", `All · ${totalCount}`, active === "all"),
    makeHomeFilterChip("recent", "Recently Added", active === "recent"),
  );

  if (homeFilterAxis === "type") {
    for (const [categoryId, items] of groupByItemCategory(list)) {
      const meta = getItemCategoryMeta(categoryId);
      container.append(
        makeHomeFilterChip(
          categoryId,
          `${meta.icon} ${meta.label} · ${items.length}`,
          active === categoryId,
          { plainText: true },
        ),
      );
    }
    return;
  }

  const grouped = groupByRoom(list);
  const buildingCount = grouped
    .filter(([room]) => isBuildingRoom(room))
    .reduce((sum, [, items]) => sum + items.length, 0);
  if (buildingCount > 0) {
    container.append(
      makeHomeFilterChip(
        BUILDING_FILTER_ID,
        `${BUILDING_GROUP_LABEL} · ${buildingCount}`,
        active === BUILDING_FILTER_ID,
      ),
    );
  }

  const outdoorCount = grouped
    .filter(([room]) => isOutdoorGroupRoom(room))
    .reduce((sum, [, items]) => sum + items.length, 0);
  if (outdoorCount > 0) {
    container.append(
      makeHomeFilterChip(
        OUTDOOR_FILTER_ID,
        `${OUTDOOR_GROUP_LABEL} · ${outdoorCount}`,
        active === OUTDOOR_FILTER_ID,
      ),
    );
  }

  for (const [room, items] of grouped) {
    if (isBuildingRoom(room) || isOutdoorGroupRoom(room)) continue;
    container.append(
      makeHomeFilterChip(room, `${roomDisplayName(room)} · ${items.length}`, active === room),
    );
  }
}

/**
 * @param {"all" | "recent" | string} filterId
 * @param {string} label
 * @param {boolean} selected
 * @param {{ plainText?: boolean }} [opts]
 */
function makeHomeFilterChip(filterId, label, selected, opts = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `room-filter-chip${selected ? " room-filter-chip--selected" : ""}`;
  btn.setAttribute("role", "tab");
  btn.setAttribute("aria-selected", String(selected));
  if (opts.plainText || filterId === "recent") {
    btn.textContent = label;
  } else if (filterId === BUILDING_FILTER_ID) {
    setRoomTitleElement(btn, "Building", label);
  } else if (filterId === OUTDOOR_FILTER_ID) {
    setRoomTitleElement(btn, "Outdoor", label);
  } else {
    setRoomTitleElement(btn, filterId, label);
  }
  btn.addEventListener("click", () => {
    if (homeFilterAxis === "type") {
      if (homeTypeFilter === filterId) return;
      homeTypeFilter = filterId;
    } else {
      if (homeRoomFilter === filterId) return;
      homeRoomFilter = filterId;
    }
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
  const labelCaption = /painting|artwork|art print/i.test(
    `${item.applianceType} ${item.nickname}`,
  )
    ? "Signature / label detail"
    : "Model / serial label";

  const labelImg = item.labelPhotoDataUrl
    ? `<figure class="detail-photo">
        <img src="${item.labelPhotoDataUrl}" alt="" />
        <figcaption>${labelCaption}</figcaption>
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
      <div><dt>Color</dt><dd>${escapeHtml(item.colorDescription || "—")}</dd></div>
      <div><dt>Dimensions</dt><dd>${escapeHtml(item.dimensionsDescription || "—")}</dd></div>
      <div><dt>Est. replacement value</dt><dd>${escapeHtml(item.estimatedCurrentValue || "—")}</dd></div>
      <div><dt>Suggested retail</dt><dd>${escapeHtml(item.suggestedRetailPrice || "—")}</dd></div>
      <div><dt>Scanned</dt><dd>${escapeHtml(scanned)}</dd></div>
    </dl>
  `;

  if (els.detailLabelLede) {
    els.detailLabelLede.textContent = item.labelPhotoDataUrl
      ? "Take a new close-up to replace the model/serial label photo."
      : "No label yet — snap a close-up of the manufacturer sticker or rating plate.";
  }
  setCaptureLabelText(els.labelDetailLabelPhoto, "Take label photo");
  updateDetailLabelCaptureUi();
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
  if (els.labelDetailLabelPhoto) els.labelDetailLabelPhoto.classList.remove("capture-btn--busy");
  updateDetailLabelCaptureUi();
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
    updateDetailLabelCaptureUi();

    if (!(await requireUserApiKeyForAi())) return;

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
          "Demo mode — add your AI API key in Settings (⚙) to enable label analysis.";
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
    item.colorDescription ? `Color: ${item.colorDescription}` : "",
    item.dimensionsDescription ? `Dimensions: ${item.dimensionsDescription}` : "",
    item.estimatedCurrentValue ? `Est. value: ${item.estimatedCurrentValue}` : "",
    item.suggestedRetailPrice ? `Retail (MSRP): ${item.suggestedRetailPrice}` : "",
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

/** @param {string} text @param {string} [successMessage] */
async function copyTextToClipboard(text, successMessage = "Copied") {
  if (!text.trim()) {
    toast("Nothing to copy");
    return false;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast(successMessage);
      return true;
    }
  } catch {
    // fall through
  }
  toast("Could not copy — select and copy manually");
  return false;
}

/** @param {string} fieldId */
async function copyMarketplaceField(fieldId) {
  const el = document.getElementById(fieldId);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  const label =
    fieldId === "marketplace-field-title"
      ? "Title"
      : fieldId === "marketplace-field-price"
        ? "Price"
        : fieldId === "marketplace-field-condition"
          ? "Condition"
          : "Description";
  await copyTextToClipboard(el.value, `${label} copied`);
}

async function copyAllMarketplaceText() {
  const title = els.marketplaceFieldTitle?.value.trim() || "";
  const price = els.marketplaceFieldPrice?.value.trim() || "";
  const condition = els.marketplaceFieldCondition?.value.trim() || "";
  const description = els.marketplaceFieldDescription?.value.trim() || "";
  const lines = [
    title ? `Title: ${title}` : "",
    price ? `Price: ${price}` : "",
    condition ? `Condition: ${condition}` : "",
    description,
  ].filter(Boolean);
  await copyTextToClipboard(lines.join("\n\n"), "Listing text copied — paste into Facebook");
}

/** @param {import("./analyze.js").MarketplaceListingResult} result @param {import("./storage.js").ApplianceRecord} item */
function renderMarketplaceResult(result, item) {
  marketplaceListing = result;
  marketplaceItem = item;

  if (els.marketplaceFieldTitle) els.marketplaceFieldTitle.value = result.title || "";
  if (els.marketplaceFieldPrice) els.marketplaceFieldPrice.value = result.price || "";
  if (els.marketplaceFieldCondition) els.marketplaceFieldCondition.value = result.condition || "";
  if (els.marketplaceFieldDescription) {
    els.marketplaceFieldDescription.value = result.description || "";
  }

  if (els.marketplaceCategory) {
    if (result.categoryHint) {
      els.marketplaceCategory.hidden = false;
      els.marketplaceCategory.textContent = `Suggested category: ${result.categoryHint}`;
    } else {
      els.marketplaceCategory.hidden = true;
      els.marketplaceCategory.textContent = "";
    }
  }

  if (els.marketplacePhotos) {
    const photoMeta = {
      appliance: { label: "Main photo", url: item.appliancePhotoDataUrl },
      label: { label: "Label / serial", url: item.labelPhotoDataUrl },
      receipt: { label: "Receipt", url: item.receiptPhotoDataUrl },
    };
    const recByPhoto = new Map(
      (result.photoRecommendations || []).map((rec) => [rec.photo, rec]),
    );
    els.marketplacePhotos.replaceChildren();

    for (const [key, meta] of Object.entries(photoMeta)) {
      if (!meta.url) continue;
      const rec = recByPhoto.get(/** @type {"appliance"|"label"|"receipt"} */ (key));
      const include = rec ? rec.include : true;
      const note = rec?.note || (include ? "Include in your listing" : "Optional — skip if not needed");

      const card = document.createElement("article");
      card.className = "marketplace-photo-card";

      const img = document.createElement("img");
      img.src = meta.url;
      img.alt = meta.label;
      card.append(img);

      const labelEl = document.createElement("p");
      labelEl.className = "marketplace-photo-card__label";
      labelEl.textContent = meta.label;
      card.append(labelEl);

      const badge = document.createElement("span");
      badge.className = `marketplace-photo-card__badge ${
        include ? "marketplace-photo-card__badge--include" : "marketplace-photo-card__badge--skip"
      }`;
      badge.textContent = include ? "Include" : "Skip";
      card.append(badge);

      const noteEl = document.createElement("p");
      noteEl.className = "marketplace-photo-card__note";
      noteEl.textContent = note;
      card.append(noteEl);

      els.marketplacePhotos.append(card);
    }
  }

  if (els.marketplaceTips) {
    const tips = result.sellingTips || [];
    els.marketplaceTips.replaceChildren();
    if (tips.length) {
      els.marketplaceTips.hidden = false;
      for (const tip of tips) {
        const li = document.createElement("li");
        li.textContent = tip;
        els.marketplaceTips.append(li);
      }
    } else {
      els.marketplaceTips.hidden = true;
    }
  }

  if (els.marketplaceResult) els.marketplaceResult.hidden = false;
  if (els.btnMarketplaceRegenerate) els.btnMarketplaceRegenerate.hidden = false;
}

function resetMarketplaceView() {
  marketplaceListing = null;
  marketplaceItem = null;
  if (els.marketplaceStatus) {
    els.marketplaceStatus.hidden = true;
    els.marketplaceStatus.textContent = "";
  }
  if (els.marketplaceResult) els.marketplaceResult.hidden = true;
  if (els.btnMarketplaceRegenerate) els.btnMarketplaceRegenerate.hidden = true;
  if (els.marketplaceFieldTitle) els.marketplaceFieldTitle.value = "";
  if (els.marketplaceFieldPrice) els.marketplaceFieldPrice.value = "";
  if (els.marketplaceFieldCondition) els.marketplaceFieldCondition.value = "";
  if (els.marketplaceFieldDescription) els.marketplaceFieldDescription.value = "";
  if (els.marketplaceCategory) {
    els.marketplaceCategory.hidden = true;
    els.marketplaceCategory.textContent = "";
  }
  if (els.marketplacePhotos) els.marketplacePhotos.replaceChildren();
  if (els.marketplaceTips) {
    els.marketplaceTips.hidden = true;
    els.marketplaceTips.replaceChildren();
  }
}

async function openMarketplaceAssistant() {
  if (!detailId) return;
  const item = await getAppliance(detailId);
  if (!item) return;

  if (els.marketplaceTitle) {
    els.marketplaceTitle.textContent = `Sell: ${item.nickname}`;
  }
  resetMarketplaceView();
  showView("marketplace");
  await generateMarketplaceListing();
}

async function generateMarketplaceListing() {
  if (!detailId) return;
  const item = await getAppliance(detailId);
  if (!item) return;

  if (!(await requireUserApiKeyForAi())) return;

  if (els.marketplaceStatus) {
    els.marketplaceStatus.hidden = false;
    els.marketplaceStatus.textContent = "Generating listing…";
  }
  if (els.marketplaceResult) els.marketplaceResult.hidden = true;
  if (els.btnMarketplaceRegenerate) els.btnMarketplaceRegenerate.hidden = true;

  try {
    const photos = {};
    if (item.appliancePhotoDataUrl) {
      photos.appliancePhotoDataUrl = await compressDataUrl(item.appliancePhotoDataUrl, {
        maxEdge: 1200,
        quality: 0.78,
      });
    }
    if (item.labelPhotoDataUrl) {
      photos.labelPhotoDataUrl = await compressDataUrl(item.labelPhotoDataUrl, {
        maxEdge: 960,
        quality: 0.72,
      });
    }
    if (item.receiptPhotoDataUrl) {
      photos.receiptPhotoDataUrl = await compressDataUrl(item.receiptPhotoDataUrl, {
        maxEdge: 960,
        quality: 0.72,
      });
    }

    if (!photos.appliancePhotoDataUrl && !photos.labelPhotoDataUrl && !photos.receiptPhotoDataUrl) {
      toast("Add at least one photo to this item first");
      if (detailId) void openDetail(detailId);
      return;
    }

    const result = await generateFacebookMarketplaceListing(item, photos);
    if (result.demoMode) {
      toast("Add your AI API key in Settings to generate listings");
      openSettingsForApiKey();
      if (detailId) void openDetail(detailId);
      return;
    }

    renderMarketplaceResult(result, item);
    if (els.marketplaceStatus) els.marketplaceStatus.hidden = true;
    toast("Listing ready — copy and paste into Facebook");
  } catch (err) {
    if (els.marketplaceStatus) {
      els.marketplaceStatus.hidden = false;
      els.marketplaceStatus.textContent =
        err instanceof Error ? err.message : "Could not generate listing";
    }
    toast(err instanceof Error ? err.message : "Could not generate listing");
  }
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
  if (els.editFieldColor) els.editFieldColor.value = item.colorDescription || "";
  if (els.editFieldDimensions) els.editFieldDimensions.value = item.dimensionsDescription || "";
  if (els.editFieldEstimatedValue) els.editFieldEstimatedValue.value = item.estimatedCurrentValue || "";
  if (els.editFieldRetailPrice) els.editFieldRetailPrice.value = item.suggestedRetailPrice || "";

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
  const colorDescription = els.editFieldColor?.value.trim() ?? "";
  const dimensionsDescription = els.editFieldDimensions?.value.trim() ?? "";
  const estimatedCurrentValue = els.editFieldEstimatedValue?.value.trim() ?? "";
  const suggestedRetailPrice = els.editFieldRetailPrice?.value.trim() ?? "";

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
      colorDescription,
      dimensionsDescription,
      estimatedCurrentValue,
      suggestedRetailPrice,
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
