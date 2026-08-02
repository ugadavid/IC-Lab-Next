"use strict";

(function exposeVideoTransport(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Proto05PreciseVideoTime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createVideoTransport() {
  const STEPS = Object.freeze([-5, -1, -0.1, 0.1, 1, 5]);
  const ACTIONS = Object.freeze([
    Object.freeze({ symbol: "<<<", hint: "−5 s", label: "Reculer de 5 secondes", step: -5 }),
    Object.freeze({ symbol: "<<", hint: "−1 s", label: "Reculer de 1 seconde", step: -1 }),
    Object.freeze({ symbol: "<", hint: "−0,1 s", label: "Reculer de 0,1 seconde", step: -0.1 }),
    Object.freeze({ symbol: "▶", hint: "Lecture", label: "Lire la vidéo", toggle: true }),
    Object.freeze({ symbol: ">", hint: "+0,1 s", label: "Avancer de 0,1 seconde", step: 0.1 }),
    Object.freeze({ symbol: ">>", hint: "+1 s", label: "Avancer de 1 seconde", step: 1 }),
    Object.freeze({ symbol: ">>>", hint: "+5 s", label: "Avancer de 5 secondes", step: 5 })
  ]);

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

  function seekIcon(direction, amplitude) {
    const count = amplitude === 5 ? 3 : amplitude === 1 ? 2 : 1;
    const points = direction < 0 ? "13 7 7 12 13 17" : "11 7 17 12 11 17";
    const start = direction < 0 ? 11 - (count - 1) * 4 : 13 - (count - 1) * 4;
    const chevrons = Array.from({ length: count }, (_, index) => `<polyline points="${points}" transform="translate(${start + index * 4 - 11} 0)"/>`).join("");
    return `<svg class="video-transport__icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><g>${chevrons}</g></svg>`;
  }

  function playbackIcon(paused) {
    const shape = paused
      ? '<path d="M9 7.5 17 12l-8 4.5z" fill="currentColor" stroke="none"/>'
      : '<path d="M8.5 7.5h2.8v9H8.5zm4.2 0h2.8v9h-2.8z" fill="currentColor" stroke="none"/>';
    return `<svg class="video-transport__icon video-transport__icon--playback" viewBox="0 0 24 24" focusable="false" aria-hidden="true">${shape}</svg>`;
  }

  function transportMarkup() {
    const buttons = ACTIONS.map(action => {
      const symbol = action.toggle ? playbackIcon(true) : seekIcon(Math.sign(action.step), Math.abs(action.step));
      return action.toggle
        ? `<button type="button" class="video-transport__button video-transport__toggle" data-video-toggle aria-label="${action.label}" title="${action.label}"><span class="video-transport__symbol" aria-hidden="true">${symbol}</span><span class="video-transport__hint" aria-hidden="true">${action.hint}</span></button>`
        : `<button type="button" class="video-transport__button" data-video-step="${action.step}" aria-label="${action.label}" title="${action.label}"><span class="video-transport__symbol" aria-hidden="true">${symbol}</span><span class="video-transport__hint" aria-hidden="true">${action.hint}</span></button>`;
    }).join("");
    return `<div class="video-transport__controls">${buttons}</div><output class="video-transport__time" data-video-time aria-live="polite">00:00,0 / --:--,-</output>`;
  }

  function render(root) {
    if (!root) throw new Error("Une zone de transport vidéo est requise.");
    root.classList.add("video-transport");
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Commandes de lecture vidéo");
    root.innerHTML = transportMarkup();
    return root;
  }

  function bind({ video, root, output = null, onSeek = null, onPlayError = null }) {
    if (!video || !root) throw new Error("Un lecteur et une barre de transport vidéo sont requis.");
    const buttons = [...root.querySelectorAll("[data-video-step]")];
    const toggle = root.querySelector("[data-video-toggle]");
    const timeOutput = output || root.querySelector("[data-video-time]");
    const toggleSymbol = toggle?.querySelector(".video-transport__symbol");
    const toggleHint = toggle?.querySelector(".video-transport__hint");
    const refresh = () => {
      const duration = knownDuration(video);
      buttons.forEach(button => { button.disabled = duration === null; });
      if (toggle) toggle.disabled = duration === null;
      if (timeOutput) timeOutput.textContent = duration === null
        ? `${formatTime(video.currentTime)} / --:--,-`
        : `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
      const paused = video.paused !== false;
      if (toggleSymbol) toggleSymbol.innerHTML = playbackIcon(paused);
      if (toggleHint) toggleHint.textContent = paused ? "Lecture" : "Pause";
      if (toggle) {
        const label = paused ? "Lire la vidéo" : "Mettre la vidéo en pause";
        toggle.setAttribute("aria-label", label);
        toggle.setAttribute("title", label);
        toggle.setAttribute("aria-pressed", String(!paused));
      }
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
    toggle?.addEventListener("click", async () => {
      try {
        if (video.paused === false) video.pause();
        else await video.play();
      } catch (error) {
        if (typeof onPlayError === "function") onPlayError(error);
      } finally {
        refresh();
      }
    });
    for (const event of ["loadedmetadata", "durationchange", "emptied", "timeupdate", "play", "playing", "pause", "ended"]) {
      video.addEventListener(event, refresh);
    }
    refresh();
    return Object.freeze({ refresh, buttons, toggle, output: timeOutput });
  }

  function mount(options) {
    render(options.root);
    return bind(options);
  }

  return Object.freeze({ ACTIONS, STEPS, bind, formatTime, knownDuration, mount, relativeTime, render, transportMarkup });
});
