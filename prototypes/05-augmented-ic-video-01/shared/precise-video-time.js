"use strict";

(function exposePreciseVideoTime(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Proto05PreciseVideoTime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPreciseVideoTime() {
  const STEPS = Object.freeze([-1, -0.1, 0.1, 1]);

  function knownDuration(video) {
    const duration = Number(video?.duration);
    return Number(video?.readyState) >= 1 && Number.isFinite(duration) && duration > 0 ? duration : null;
  }

  function relativeTime(currentSeconds, deltaSeconds, durationSeconds) {
    const currentMs = Math.round(Number(currentSeconds) * 1000);
    const deltaMs = Math.round(Number(deltaSeconds) * 1000);
    const durationMs = Math.round(Number(durationSeconds) * 1000);
    if (![currentMs, deltaMs, durationMs].every(Number.isFinite) || durationMs <= 0) return null;
    return Math.min(durationMs, Math.max(0, currentMs + deltaMs)) / 1000;
  }

  function formatTime(seconds) {
    const totalTenths = Math.max(0, Math.round((Number(seconds) || 0) * 10));
    const minutes = Math.floor(totalTenths / 600);
    const remainder = totalTenths - minutes * 600;
    return `${String(minutes).padStart(2, "0")}:${String(Math.floor(remainder / 10)).padStart(2, "0")},${remainder % 10}`;
  }

  function bind({ video, root, output = null, onSeek = null }) {
    if (!video || !root) throw new Error("Un lecteur et une zone de navigation temporelle sont requis.");
    const buttons = [...root.querySelectorAll("[data-video-step]")];
    const refresh = () => {
      const duration = knownDuration(video);
      buttons.forEach(button => { button.disabled = duration === null; });
      if (output) output.textContent = duration === null
        ? `${formatTime(video.currentTime)} / --:--,-`
        : `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
    };
    for (const button of buttons) {
      button.addEventListener("click", () => {
        const duration = knownDuration(video);
        const target = duration === null ? null : relativeTime(video.currentTime, button.dataset.videoStep, duration);
        if (target === null) return refresh();
        video.currentTime = target;
        refresh();
        if (typeof onSeek === "function") onSeek(target);
      });
    }
    for (const event of ["loadedmetadata", "durationchange", "emptied", "timeupdate"]) video.addEventListener(event, refresh);
    refresh();
    return Object.freeze({ refresh, buttons });
  }

  return Object.freeze({ STEPS, bind, formatTime, knownDuration, relativeTime });
});
