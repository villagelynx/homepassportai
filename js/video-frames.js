/**
 * Extract still frames from a short room-scan video for AI analysis.
 * Caps at 60 seconds so payloads stay within serverless limits.
 */

export const ROOM_SCAN_MAX_SECONDS = 60;
export const ROOM_SCAN_FRAME_COUNT = 8;

/**
 * @param {File | Blob} videoFile
 * @param {{ maxSeconds?: number, frameCount?: number, maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<{ frames: string[], durationSeconds: number, truncated: boolean }>}
 */
export async function extractVideoFrames(videoFile, opts = {}) {
  const maxSeconds = opts.maxSeconds ?? ROOM_SCAN_MAX_SECONDS;
  const frameCount = opts.frameCount ?? ROOM_SCAN_FRAME_COUNT;
  const maxEdge = opts.maxEdge ?? 720;
  const quality = opts.quality ?? 0.7;

  const url = URL.createObjectURL(videoFile);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    await waitForVideoReady(video);

    const fullDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : maxSeconds;
    const truncated = fullDuration > maxSeconds + 0.25;
    const durationSeconds = Math.min(fullDuration, maxSeconds);

    const times = sampleTimes(durationSeconds, frameCount);
    /** @type {string[]} */
    const frames = [];

    for (const t of times) {
      await seekVideo(video, t);
      frames.push(captureFrame(video, maxEdge, quality));
    }

    return { frames, durationSeconds, truncated };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** @param {number} duration @param {number} count */
function sampleTimes(duration, count) {
  if (count <= 1) return [Math.min(0.1, duration * 0.5)];
  const start = Math.min(0.35, duration * 0.05);
  const end = Math.max(start + 0.1, duration - 0.25);
  const times = [];
  for (let i = 0; i < count; i++) {
    const t = start + ((end - start) * i) / (count - 1);
    times.push(Math.min(duration, Math.max(0, t)));
  }
  return times;
}

/** @param {HTMLVideoElement} video */
function waitForVideoReady(video) {
  return new Promise((resolve, reject) => {
    const onError = () => reject(new Error("Could not read this video — try recording again in Safari"));
    video.addEventListener("error", onError, { once: true });
    video.addEventListener(
      "loadedmetadata",
      () => {
        if (video.readyState >= 1) resolve();
        else {
          video.addEventListener("loadeddata", () => resolve(), { once: true });
        }
      },
      { once: true }
    );
  });
}

/**
 * @param {HTMLVideoElement} video
 * @param {number} time
 */
function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not scrub video frames"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    try {
      video.currentTime = time;
    } catch (err) {
      cleanup();
      reject(err instanceof Error ? err : new Error("Seek failed"));
    }
  });
}

/**
 * @param {HTMLVideoElement} video
 * @param {number} maxEdge
 * @param {number} quality
 */
function captureFrame(video, maxEdge, quality) {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const width = Math.max(1, Math.round(vw * scale));
  const height = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not capture video frame");
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
