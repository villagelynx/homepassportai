/**
 * Shrink photos before localStorage save (iPhone originals are too large).
 * @param {string} dataUrl
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<string>}
 */
export function compressDataUrl(dataUrl, { maxEdge = 1200, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error("Could not process photo"));
    img.src = dataUrl;
  });
}
