/**
 * @typedef {{ corner?: string, xPercent: number, yPercent: number, widthPercent: number, heightPercent: number }} SignatureRegion
 */

/** @param {unknown} raw @returns {SignatureRegion[]} */
export function normalizeSignatureRegions(raw) {
  if (!Array.isArray(raw)) return [];

  /** @type {SignatureRegion[]} */
  const regions = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const x = Number(item.x_percent ?? item.xPercent ?? item.x);
    const y = Number(item.y_percent ?? item.yPercent ?? item.y);
    const w = Number(item.width_percent ?? item.widthPercent ?? item.width);
    const h = Number(item.height_percent ?? item.heightPercent ?? item.height);
    if (![x, y, w, h].every((n) => Number.isFinite(n) && n > 0)) continue;
    regions.push({
      corner: String(item.corner || "").trim(),
      xPercent: clamp(x, 0, 100),
      yPercent: clamp(y, 0, 100),
      widthPercent: clamp(w, 1, 100),
      heightPercent: clamp(h, 1, 100),
    });
  }

  const cornerOrder = { top_left: 0, top_right: 1, bottom_left: 2, bottom_right: 3 };
  return regions
    .sort((a, b) => {
      const ao = cornerOrder[a.corner] ?? 9;
      const bo = cornerOrder[b.corner] ?? 9;
      if (ao !== bo) return ao - bo;
      return a.yPercent - b.yPercent;
    })
    .slice(0, 2);
}

/** @param {number} value @param {number} min @param {number} max */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** @param {string} dataUrl @returns {Promise<HTMLImageElement>} */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for signature crop"));
    img.src = dataUrl;
  });
}

/**
 * Crop signature corners from a painting photo and stack into one label-style image.
 * @param {string} sourceDataUrl
 * @param {SignatureRegion[]} regions
 * @returns {Promise<string | null>} JPEG data URL
 */
export async function buildSignatureCollageLabelPhoto(sourceDataUrl, regions) {
  const boxes = normalizeSignatureRegions(regions);
  if (!boxes.length) return null;

  const img = await loadImage(sourceDataUrl);
  const cropWidth = Math.min(520, Math.max(180, img.width));
  const pad = 8;
  const labelHeight = 22;
  const crops = boxes.map((box) => cropRegion(img, box));

  const totalHeight =
    pad + crops.reduce((sum, crop, i) => sum + labelHeight + crop.height + (i ? pad : 0), 0) + pad;
  const maxCropH = Math.max(...crops.map((c) => c.height));
  const canvasHeight = Math.max(totalHeight, pad * 2 + maxCropH + labelHeight);

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth + pad * 2;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#f4f7fb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = pad;
  for (let i = 0; i < crops.length; i++) {
    const crop = crops[i];
    const box = boxes[i];
    const label = cornerLabel(box.corner, i);

    ctx.fillStyle = "#64748b";
    ctx.font = "600 13px DM Sans, system-ui, sans-serif";
    ctx.fillText(label, pad, y + 14);

    y += labelHeight;
    const drawW = cropWidth;
    const drawH = Math.round((crop.height / crop.width) * drawW);
    ctx.drawImage(crop.canvas, pad, y, drawW, drawH);
    y += drawH + pad;
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

/** @param {string} corner @param {number} index */
function cornerLabel(corner, index) {
  const map = {
    top_left: "Top left signature",
    top_right: "Top right signature",
    bottom_left: "Bottom left signature",
    bottom_right: "Bottom right signature",
  };
  return map[corner] || `Signature ${index + 1}`;
}

/** @param {HTMLImageElement} img @param {SignatureRegion} box */
function cropRegion(img, box) {
  const sx = Math.round((box.xPercent / 100) * img.width);
  const sy = Math.round((box.yPercent / 100) * img.height);
  const sw = Math.max(8, Math.round((box.widthPercent / 100) * img.width));
  const sh = Math.max(8, Math.round((box.heightPercent / 100) * img.height));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return { canvas, width: sw, height: sh };
}
