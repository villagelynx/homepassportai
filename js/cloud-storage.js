import { getSession } from "./auth.js";
import { getSupabase } from "./supabase-client.js";

const BUCKET = "appliance-photos";

/**
 * @typedef {import("./storage.js").ApplianceRecord} ApplianceRecord
 */

/** @param {string} dataUrl */
function dataUrlToBlob(dataUrl) {
  if (!dataUrl || !dataUrl.includes(",")) {
    throw new Error("Photo data is missing — retake the photo and try again.");
  }
  const [meta, b64] = dataUrl.split(",");
  if (!b64) throw new Error("Photo data is incomplete — retake the photo and try again.");
  const mime = /data:(.*?);/.exec(meta)?.[1] || "image/jpeg";
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime.startsWith("image/") ? "image/jpeg" : mime });
  } catch {
    throw new Error("Could not prepare photo for upload — try a smaller photo.");
  }
}

/** @param {unknown} err @param {string} fallback */
function cloudErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const o = /** @type {Record<string, unknown>} */ (err);
    const msg = o.message || o.error_description || o.error || o.msg;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

/** @param {string | null | undefined} path */
async function signedPhotoUrl(path) {
  if (!path) return null;
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** @param {object} row */
async function rowToRecord(row) {
  const [appliancePhotoDataUrl, labelPhotoDataUrl, receiptPhotoDataUrl] = await Promise.all([
    signedPhotoUrl(row.appliance_photo_path),
    signedPhotoUrl(row.label_photo_path),
    signedPhotoUrl(row.receipt_photo_path),
  ]);

  return /** @type {ApplianceRecord} */ ({
    id: row.id,
    nickname: row.nickname || "Appliance",
    room: row.room || "Other",
    applianceType: row.appliance_type || "",
    brand: row.brand || "",
    modelNumber: row.model_number || "",
    serialNumber: row.serial_number || "",
    colorDescription: row.color_description || "",
    dimensionsDescription: row.dimensions_description || "",
    estimatedCurrentValue: row.estimated_current_value || "",
    suggestedRetailPrice: row.suggested_retail_price || "",
    appliancePhotoDataUrl: appliancePhotoDataUrl || "",
    labelPhotoDataUrl: labelPhotoDataUrl || "",
    receiptPhotoDataUrl: receiptPhotoDataUrl,
    confidence: row.confidence || "",
    scannedAt: row.scanned_at || new Date().toISOString(),
    repairCompany: row.repair_company || null,
    _photoPaths: {
      appliance: row.appliance_photo_path,
      label: row.label_photo_path,
      receipt: row.receipt_photo_path,
    },
  });
}

/** @param {string} userId @param {string} applianceId @param {string} name @param {string} dataUrl */
async function uploadPhoto(userId, applianceId, name, dataUrl) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");
  if (!dataUrl) throw new Error(`Missing ${name} photo — retake and try again.`);
  const path = `${userId}/${applianceId}/${name}.jpg`;
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (error) throw new Error(cloudErrorMessage(error, `Could not upload ${name} photo.`));
  return path;
}

/** @returns {Promise<ApplianceRecord[]>} */
export async function loadCloudAppliances() {
  const supabase = await getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("appliances")
    .select("*")
    .order("scanned_at", { ascending: false });

  if (error) throw error;
  return Promise.all((data || []).map((row) => rowToRecord(row)));
}

/** @param {string} id @returns {Promise<ApplianceRecord | undefined>} */
export async function getCloudAppliance(id) {
  const supabase = await getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase.from("appliances").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return rowToRecord(data);
}

/** @param {ApplianceRecord} record */
export async function addCloudAppliance(record) {
  const supabase = await getSupabase();
  const session = getSession();
  const userId = session?.user?.id;
  if (!supabase || !userId) throw new Error("Sign in to save to the cloud.");
  if (!record?.appliancePhotoDataUrl) {
    throw new Error("Photo is required to save this item.");
  }

  let appliancePath;
  let labelPath = null;
  let receiptPath = null;
  try {
    appliancePath = await uploadPhoto(userId, record.id, "appliance", record.appliancePhotoDataUrl);
    labelPath = record.labelPhotoDataUrl
      ? await uploadPhoto(userId, record.id, "label", record.labelPhotoDataUrl)
      : null;
    receiptPath = record.receiptPhotoDataUrl
      ? await uploadPhoto(userId, record.id, "receipt", record.receiptPhotoDataUrl)
      : null;
  } catch (err) {
    throw new Error(cloudErrorMessage(err, "Could not upload photos. Check your connection and try again."));
  }

  const { error } = await supabase.from("appliances").insert({
    id: record.id,
    user_id: userId,
    nickname: record.nickname,
    room: record.room,
    appliance_type: record.applianceType,
    brand: record.brand,
    model_number: record.modelNumber,
    serial_number: record.serialNumber,
    color_description: record.colorDescription || null,
    dimensions_description: record.dimensionsDescription || null,
    estimated_current_value: record.estimatedCurrentValue || null,
    suggested_retail_price: record.suggestedRetailPrice || null,
    appliance_photo_path: appliancePath,
    label_photo_path: labelPath,
    receipt_photo_path: receiptPath,
    confidence: record.confidence,
    repair_company: record.repairCompany,
    scanned_at: record.scannedAt,
  });

  if (error) throw new Error(cloudErrorMessage(error, "Could not save item to the cloud."));

  try {
    const saved = await getCloudAppliance(record.id);
    if (saved) return saved;
  } catch {
    // Insert succeeded — return local record so save still completes.
  }

  return {
    ...record,
    labelPhotoDataUrl: record.labelPhotoDataUrl ?? null,
    receiptPhotoDataUrl: record.receiptPhotoDataUrl ?? null,
    _photoPaths: {
      appliance: appliancePath,
      label: labelPath || undefined,
      receipt: receiptPath || undefined,
    },
  };
}

/** @param {string} id @param {Partial<ApplianceRecord>} updates */
export async function updateCloudAppliance(id, updates) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured.");

  const existing = await getCloudAppliance(id);
  if (!existing) return null;

  const session = getSession();
  const userId = session?.user?.id;

  const payload = {};
  if (updates.nickname != null) payload.nickname = updates.nickname;
  if (updates.room != null) payload.room = updates.room;
  if (updates.applianceType != null) payload.appliance_type = updates.applianceType;
  if (updates.brand != null) payload.brand = updates.brand;
  if (updates.modelNumber != null) payload.model_number = updates.modelNumber;
  if (updates.serialNumber != null) payload.serial_number = updates.serialNumber;
  if (updates.colorDescription != null) payload.color_description = updates.colorDescription;
  if (updates.dimensionsDescription != null) payload.dimensions_description = updates.dimensionsDescription;
  if (updates.estimatedCurrentValue != null) payload.estimated_current_value = updates.estimatedCurrentValue;
  if (updates.suggestedRetailPrice != null) payload.suggested_retail_price = updates.suggestedRetailPrice;
  if (updates.confidence != null) payload.confidence = updates.confidence;
  if (updates.repairCompany !== undefined) payload.repair_company = updates.repairCompany;

  if (updates.labelPhotoDataUrl && userId) {
    payload.label_photo_path = await uploadPhoto(userId, id, "label", updates.labelPhotoDataUrl);
  }

  const { error } = await supabase.from("appliances").update(payload).eq("id", id);
  if (error) throw error;

  if (updates.labelPhotoDataUrl) {
    return getCloudAppliance(id);
  }

  return { ...existing, ...updates };
}

/** @param {string} id */
export async function deleteCloudAppliance(id) {
  const supabase = await getSupabase();
  const session = getSession();
  const userId = session?.user?.id;
  if (!supabase || !userId) throw new Error("Sign in to delete from the cloud.");

  const existing = await getCloudAppliance(id);
  const paths = [
    existing?._photoPaths?.appliance,
    existing?._photoPaths?.label,
    existing?._photoPaths?.receipt,
  ].filter(Boolean);

  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const { error } = await supabase.from("appliances").delete().eq("id", id);
  if (error) throw error;
}

/** @param {ApplianceRecord[]} localRecords */
export async function migrateLocalToCloud(localRecords) {
  for (const record of localRecords) {
    await addCloudAppliance(record);
  }
}
