/**
 * Shrink photos before save/upload (iPhone originals are often too large).
 * @param {string} dataUrl
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<string>}
 */
export async function compressDataUrl(dataUrl, { maxEdge = 1200, quality = 0.82 } = {}) {
  if (!dataUrl) throw new Error("Could not process photo");

  try {
    const bitmap = await dataUrlToImageBitmap(dataUrl);
    return encodeBitmap(bitmap, maxEdge, quality);
  } catch {
    // Fall through to HTMLImageElement path.
  }

  return compressWithImageElement(dataUrl, maxEdge, quality);
}

/** @param {string} dataUrl */
async function dataUrlToImageBitmap(dataUrl) {
  if (typeof createImageBitmap !== "function") {
    throw new Error("createImageBitmap unavailable");
  }
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

/**
 * @param {ImageBitmap} bitmap
 * @param {number} maxEdge
 * @param {number} quality
 */
function encodeBitmap(bitmap, maxEdge, quality) {
  try {
    let { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", quality);
  } catch (err) {
    bitmap.close?.();
    throw err;
  }
}

/**
 * @param {string} dataUrl
 * @param {number} maxEdge
 * @param {number} quality
 * @returns {Promise<string>}
 */
function compressWithImageElement(dataUrl, maxEdge, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        reject(new Error("Could not process photo — try retaking as a new photo"));
      }
    };
    img.onerror = () =>
      reject(new Error("Could not process photo — try retaking as a new photo (not from Files)"));
    img.src = dataUrl;
  });
}
