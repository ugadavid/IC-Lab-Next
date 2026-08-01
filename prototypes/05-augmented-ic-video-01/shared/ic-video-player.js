(function () {
  const YOUTUBE_API = "https://www.youtube.com/iframe_api";
  let youtubeApiPromise;

  if (!document.getElementById("ic-youtube-player-style")) {
    const style = document.createElement("style");
    style.id = "ic-youtube-player-style";
    style.textContent = ".youtube-active{width:100%;aspect-ratio:16/9;height:auto;max-height:none;overflow:hidden}.youtube-active iframe{display:block;width:100%;height:100%;border:0}";
    document.head.appendChild(style);
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!youtubeApiPromise) youtubeApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
      const script = document.createElement("script");
      script.src = YOUTUBE_API;
      script.onerror = () => reject(new Error("L’API officielle YouTube IFrame est indisponible."));
      document.head.appendChild(script);
    });
    return youtubeApiPromise;
  }

  window.createICVideoPlayer = function createICVideoPlayer({ container }) {
    const listeners = new Map();
    let nativeVideo = null;
    let hls = null;
    let youtubePlayer = null;
    let currentProvider = null;
    let timeTicker = null;
    let pendingLoadReject = null;
    let ready = false;
    const facade = {
      lastError: null,
      get currentTime() { return currentProvider === "youtube" ? (youtubePlayer?.getCurrentTime?.() || 0) : (nativeVideo?.currentTime || 0); },
      set currentTime(value) { facade.seek(value); },
      get duration() { return currentProvider === "youtube" ? (youtubePlayer?.getDuration?.() || 0) : (nativeVideo?.duration || 0); },
      get paused() { return currentProvider === "youtube" ? ![1, 3].includes(youtubePlayer?.getPlayerState?.()) : (nativeVideo?.paused ?? true); },
      addEventListener(type, handler) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(handler); },
      removeEventListener(type, handler) { listeners.get(type)?.delete(handler); },
      play() { return currentProvider === "youtube" ? youtubePlayer?.playVideo() : nativeVideo?.play(); },
      pause() { return currentProvider === "youtube" ? youtubePlayer?.pauseVideo() : nativeVideo?.pause(); },
      load() { nativeVideo?.load(); },
      seek(seconds) { if (currentProvider === "youtube") youtubePlayer?.seekTo(Math.max(0, seconds), true); else if (nativeVideo) nativeVideo.currentTime = Math.max(0, seconds); },
      emit(type, detail) {
        if (["loadedmetadata", "canplay"].includes(type)) ready = true;
        listeners.get(type)?.forEach(handler => handler(detail));
      }
    };
    function reset() {
      clearInterval(timeTicker); timeTicker = null;
      if (pendingLoadReject) {
        const error = new Error("Chargement annulé.");
        error.name = "AbortError";
        pendingLoadReject(error);
        pendingLoadReject = null;
      }
      hls?.destroy(); hls = null; youtubePlayer?.destroy(); youtubePlayer = null;
      nativeVideo?.remove(); nativeVideo = null; facade.lastError = null; ready = false;
      container.classList.remove("youtube-active"); container.replaceChildren();
    }
    function attachNative(source, useHls = true) {
      nativeVideo = document.createElement("video");
      nativeVideo.controls = true; nativeVideo.preload = "metadata"; nativeVideo.className = "video";
      ["loadstart", "loadedmetadata", "durationchange", "canplay", "timeupdate", "playing", "pause", "waiting", "stalled"].forEach(type => nativeVideo.addEventListener(type, () => facade.emit(type)));
      nativeVideo.addEventListener("error", () => {
        const error = new Error("La ressource vidéo est indisponible ou illisible.");
        facade.lastError = error;
        facade.emit("error", error);
      });
      container.append(nativeVideo);
      if (useHls && window.Hls && Hls.isSupported()) {
        return new Promise((resolve, reject) => {
          let settled = false;
          const settle = (callback, value) => {
            if (settled) return;
            settled = true;
            pendingLoadReject = null;
            callback(value);
          };
          pendingLoadReject = error => settle(reject, error);
          const instance = hls = new Hls();
          instance.on(Hls.Events.MEDIA_ATTACHED, () => instance.loadSource(source));
          instance.on(Hls.Events.MANIFEST_PARSED, () => {
            facade.emit("canplay");
            settle(resolve);
          });
          instance.on(Hls.Events.ERROR, (_event, data = {}) => {
            if (!data.fatal) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) facade.emit("waiting", data);
              return;
            }
            const status = data.response?.code || data.networkDetails?.status;
            const detail = data.details || data.type || "erreur inconnue";
            const error = new Error(`Lecture HLS impossible (${detail}${status ? `, HTTP ${status}` : ""}).`);
            error.hlsData = data;
            facade.lastError = error;
            facade.emit("error", error);
            settle(reject, error);
          });
          instance.attachMedia(nativeVideo);
        });
      } else if (!useHls || nativeVideo.canPlayType("application/vnd.apple.mpegurl")) { nativeVideo.src = source; nativeVideo.load(); }
      else {
        const error = new Error("La lecture HLS n’est pas prise en charge par ce navigateur.");
        facade.lastError = error;
        facade.emit("error", error);
        return Promise.reject(error);
      }
      return Promise.resolve();
    }
    async function load(video) {
      reset(); const hlsSource = video.url || video.proxyUrl; currentProvider = video.provider || (hlsSource ? "uga" : null);
      if ((currentProvider === "uga" || currentProvider === "local" || currentProvider === "direct") && hlsSource) {
        return attachNative(hlsSource, currentProvider === "uga" || video.kind === "hls" || Boolean(video.manifestUrl));
      }
      if (currentProvider !== "youtube" || !video.videoId || !video.embedUrl) throw new Error("La source vidéo n’est pas autorisée.");
      const YT = await loadYouTubeApi();
      container.classList.add("youtube-active");
      const frame = document.createElement("div"); frame.className = "youtube-player"; container.append(frame);
      const url = new URL(video.embedUrl); url.searchParams.set("enablejsapi", "1"); url.searchParams.set("playsinline", "1"); url.searchParams.set("origin", location.origin);
      youtubePlayer = new YT.Player(frame, { videoId: video.videoId, playerVars: { enablejsapi: 1, playsinline: 1, origin: location.origin, rel: 0 }, events: {
        onReady: () => { timeTicker = setInterval(() => facade.emit("timeupdate"), 250); facade.emit("loadedmetadata"); },
        onStateChange: event => { if (event.data === YT.PlayerState.PLAYING) facade.emit("playing"); if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) facade.emit("pause"); if (event.data === YT.PlayerState.BUFFERING) facade.emit("waiting"); },
        onError: () => {
          const error = new Error("La vidéo YouTube est indisponible ou non intégrable.");
          facade.lastError = error;
          facade.emit("error", error);
        }
      }});
    }
    facade.waitUntilReady = ({ timeoutMs = 10_000 } = {}) => {
      if (ready) return Promise.resolve();
      if (facade.lastError) return Promise.reject(facade.lastError);
      return new Promise((resolve, reject) => {
        const finish = (callback, value) => {
          clearTimeout(timer);
          facade.removeEventListener("loadedmetadata", onReady);
          facade.removeEventListener("canplay", onReady);
          facade.removeEventListener("error", onError);
          callback(value);
        };
        const onReady = () => finish(resolve);
        const onError = error => finish(reject, error || facade.lastError || new Error("Lecture impossible."));
        const timer = setTimeout(
          () => finish(reject, new Error("La ressource vidéo ne devient pas lisible.")),
          timeoutMs
        );
        facade.addEventListener("loadedmetadata", onReady);
        facade.addEventListener("canplay", onReady);
        facade.addEventListener("error", onError);
        if (ready) finish(resolve);
        else if (facade.lastError) finish(reject, facade.lastError);
      });
    };
    facade.load = load;
    facade.destroy = reset;
    Object.defineProperty(facade, "element", { get: () => nativeVideo || container.querySelector("iframe") });
    return facade;
  };

  window.upgradeICVideoElement = function upgradeICVideoElement(element, activityVideo) {
    const player = window.createICVideoPlayer({ container: element.parentElement });
    element.hidden = true;
    Object.defineProperties(element, {
      currentTime: { configurable: true, get: () => player.currentTime, set: value => player.seek(value) },
      duration: { configurable: true, get: () => player.duration },
      paused: { configurable: true, get: () => player.paused }
    });
    element.play = () => player.play(); element.pause = () => player.pause(); element.load = () => {};
    element.addEventListener = (type, handler) => player.addEventListener(type, handler);
    element.removeEventListener = (type, handler) => player.removeEventListener(type, handler);
    element.__icPlayer = player;
    return player.load(activityVideo).then(() => player);
  };
})();
