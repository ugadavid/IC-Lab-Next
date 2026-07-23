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
    const facade = {
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
      emit(type) { listeners.get(type)?.forEach(handler => handler()); }
    };
    function reset() { clearInterval(timeTicker); timeTicker = null; hls?.destroy(); hls = null; youtubePlayer?.destroy(); youtubePlayer = null; nativeVideo?.remove(); nativeVideo = null; container.classList.remove("youtube-active"); container.replaceChildren(); }
    function attachNative(source, useHls = true) {
      nativeVideo = document.createElement("video");
      nativeVideo.controls = true; nativeVideo.preload = "metadata"; nativeVideo.className = "video";
      ["loadstart", "loadedmetadata", "durationchange", "canplay", "timeupdate", "playing", "pause", "waiting", "stalled", "error"].forEach(type => nativeVideo.addEventListener(type, () => facade.emit(type)));
      container.append(nativeVideo);
      if (useHls && window.Hls && Hls.isSupported()) {
        hls = new Hls();
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(source));
        hls.on(Hls.Events.MANIFEST_PARSED, () => facade.emit("canplay"));
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) facade.emit("error"); else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) facade.emit("waiting"); });
        hls.attachMedia(nativeVideo);
      } else if (!useHls || nativeVideo.canPlayType("application/vnd.apple.mpegurl")) { nativeVideo.src = source; nativeVideo.load(); }
      else facade.emit("error");
    }
    async function load(video) {
      reset(); const hlsSource = video.url || video.proxyUrl; currentProvider = video.provider || (hlsSource ? "uga" : null);
      if ((currentProvider === "uga" || currentProvider === "local" || currentProvider === "direct") && hlsSource) { attachNative(hlsSource, currentProvider === "uga"); return; }
      if (currentProvider !== "youtube" || !video.videoId || !video.embedUrl) throw new Error("La source vidéo n’est pas autorisée.");
      const YT = await loadYouTubeApi();
      container.classList.add("youtube-active");
      const frame = document.createElement("div"); frame.className = "youtube-player"; container.append(frame);
      const url = new URL(video.embedUrl); url.searchParams.set("enablejsapi", "1"); url.searchParams.set("playsinline", "1"); url.searchParams.set("origin", location.origin);
      youtubePlayer = new YT.Player(frame, { videoId: video.videoId, playerVars: { enablejsapi: 1, playsinline: 1, origin: location.origin, rel: 0 }, events: {
        onReady: () => { timeTicker = setInterval(() => facade.emit("timeupdate"), 250); facade.emit("loadedmetadata"); },
        onStateChange: event => { if (event.data === YT.PlayerState.PLAYING) facade.emit("playing"); if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) facade.emit("pause"); if (event.data === YT.PlayerState.BUFFERING) facade.emit("waiting"); },
        onError: () => facade.emit("error")
      }});
    }
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
