#!/usr/bin/env node
/**
 * Build PNG icons from icons/icon.svg (same house + blue gradient as the app).
 * Requires: macOS `qlmanage` or `rsvg-convert` (brew install librsvg).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = resolve(root, "icons");
const svg = resolve(iconsDir, "icon.svg");

if (!existsSync(svg)) {
  console.error("Missing icons/icon.svg");
  process.exit(1);
}

mkdirSync(iconsDir, { recursive: true });

function has(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** @param {number} size @param {string} outName */
function writePng(size, outName) {
  const out = resolve(iconsDir, outName);
  if (has("rsvg-convert")) {
    execSync(`rsvg-convert -w ${size} -h ${size} "${svg}" -o "${out}"`, { stdio: "inherit" });
    return;
  }
  const tmp = resolve(iconsDir, `.tmp-${size}.png`);
  execSync(`qlmanage -t -s ${size} -o "${iconsDir}" "${svg}" >/dev/null 2>&1`, { stdio: "inherit" });
  const generated = resolve(iconsDir, "icon.svg.png");
  if (existsSync(generated)) {
    renameSync(generated, out);
  } else if (existsSync(tmp)) {
    renameSync(tmp, out);
  } else {
    throw new Error(`Could not rasterize ${outName}. Install librsvg: brew install librsvg`);
  }
}

writePng(512, "icon-512.png");
writePng(192, "icon-192.png");
writePng(180, "apple-touch-icon.png");

console.log("Wrote icons/icon-512.png, icon-192.png, apple-touch-icon.png");
console.log("For sharper brand header (same artwork), run: python3 scripts/render-sharp-assets.py");
