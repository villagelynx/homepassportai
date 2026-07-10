import { isSupabaseConfigured } from "./config.js";
import { handleAuthFailure, isSignedIn } from "./auth.js";
import {
  addLocalAppliance,
  clearLocalAppliances,
  deleteLocalAppliance,
  getLocalAppliance,
  loadAllLegacyAppliances,
  loadLocalAppliances,
  recoverLocalInventory,
  replaceLocalAppliances,
  scanAllApplianceStorage,
  updateLocalAppliance,
} from "./local-storage.js";
import {
  addCloudAppliance,
  deleteCloudAppliance,
  getCloudAppliance,
  loadCloudAppliances,
  migrateLocalToCloud,
  updateCloudAppliance,
} from "./cloud-storage.js";

/**
 * @typedef {object} ApplianceRecord
 * @property {string} id
 * @property {string} nickname
 * @property {string} room
 * @property {string} applianceType
 * @property {string} brand
 * @property {string} modelNumber
 * @property {string} serialNumber
 * @property {string} appliancePhotoDataUrl
 * @property {string | null} labelPhotoDataUrl
 * @property {string | null} [receiptPhotoDataUrl]
 * @property {string} [colorDescription]
 * @property {string} [dimensionsDescription]
 * @property {string} confidence
 * @property {string} scannedAt ISO timestamp
 * @property {{ name: string, phone: string, website: string, notes: string } | null} [repairCompany]
 * @property {{ appliance?: string, label?: string, receipt?: string | null }} [_photoPaths]
 */

function useCloud() {
  return isSupabaseConfigured() && isSignedIn();
}

/** @template T @param {() => Promise<T>} fn */
async function withCloudAuth(fn) {
  try {
    return await fn();
  } catch (err) {
    if (await handleAuthFailure(err)) {
      throw new Error("Your sign-in expired. Please sign in again.");
    }
    throw err;
  }
}

/** @returns {Promise<ApplianceRecord[]>} */
export async function loadAppliances() {
  if (useCloud()) return withCloudAuth(() => loadCloudAppliances());
  return loadLocalAppliances();
}

/** @param {ApplianceRecord} record */
export async function addAppliance(record) {
  if (useCloud()) {
    const saved = await withCloudAuth(() => addCloudAppliance(record));
    if (!saved) throw new Error("Could not save appliance.");
    return saved;
  }
  return addLocalAppliance(record);
}

/** @param {string} id */
export async function deleteAppliance(id) {
  if (useCloud()) {
    await withCloudAuth(() => deleteCloudAppliance(id));
    return;
  }
  deleteLocalAppliance(id);
}

/** @param {string} id @returns {Promise<ApplianceRecord | undefined>} */
export async function getAppliance(id) {
  if (useCloud()) {
    const cloud = await withCloudAuth(() => getCloudAppliance(id));
    if (cloud) return cloud;
    return getLocalAppliance(id);
  }
  return getLocalAppliance(id);
}

/** @param {string} id @param {Partial<ApplianceRecord>} updates */
export async function updateAppliance(id, updates) {
  if (useCloud()) {
    const saved = await withCloudAuth(() => updateCloudAppliance(id, updates));
    if (saved) return saved;
    const local = updateLocalAppliance(id, updates);
    if (!local) throw new Error("Could not update appliance.");
    return local;
  }
  const saved = updateLocalAppliance(id, updates);
  if (!saved) throw new Error("Could not update appliance.");
  return saved;
}

/** Migrate device-only inventory after sign-in. @returns {Promise<number>} */
export async function migrateLocalInventoryIfNeeded() {
  if (!useCloud()) return 0;
  const local = loadLocalAppliances();
  if (local.length === 0) return 0;
  await withCloudAuth(() => migrateLocalToCloud(local));
  clearLocalAppliances();
  return local.length;
}

/** @returns {Promise<number>} imported count */
export async function importApplianceBackup(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid backup file");
  }
  if (!Array.isArray(parsed)) throw new Error("Backup must be a list of appliances");

  if (useCloud()) {
    let count = 0;
    for (const item of parsed) {
      if (!item?.id || !item.appliancePhotoDataUrl) continue;
      await withCloudAuth(() => addCloudAppliance(item));
      count++;
    }
    return count;
  }

  const existing = loadLocalAppliances();
  const ids = new Set(existing.map((a) => a.id));
  let added = 0;
  for (const item of parsed) {
    if (!item?.id || ids.has(item.id)) continue;
    existing.unshift(item);
    ids.add(item.id);
    added++;
  }
  replaceLocalAppliances(existing);
  return added;
}

/** @returns {number} */
export function tryRecoverInventory() {
  if (useCloud() && isSignedIn()) return 0;
  return recoverLocalInventory();
}

export {
  loadAllLegacyAppliances,
  loadLocalAppliances,
  recoverLocalInventory,
  scanAllApplianceStorage,
};
