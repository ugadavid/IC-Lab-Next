"use strict";

(function exposeGenerationSession(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DicoTextGeneration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildGenerationSessionApi() {
  class CancellableGenerationSession {
    constructor(options = {}) {
      this.now = options.now || Date.now;
      this.setInterval = options.setInterval || globalThis.setInterval.bind(globalThis);
      this.clearInterval = options.clearInterval || globalThis.clearInterval.bind(globalThis);
      this.sequence = 0;
      this.active = null;
    }

    start(languages, onTick) {
      if (this.active) return null;
      const controller = new AbortController();
      const active = {
        id: ++this.sequence,
        controller,
        languages: [...languages],
        startedAt: this.now(),
        timer: null,
      };
      const tick = () => {
        if (this.active !== active) return;
        onTick(Math.max(0, Math.floor((this.now() - active.startedAt) / 1000)));
      };
      this.active = active;
      tick();
      active.timer = this.setInterval(tick, 250);
      return {
        id: active.id,
        signal: controller.signal,
        languages: [...active.languages],
      };
    }

    isCurrent(id) {
      return Boolean(this.active && this.active.id === id);
    }

    finish(id) {
      if (!this.isCurrent(id)) return false;
      this.clearInterval(this.active.timer);
      this.active = null;
      return true;
    }

    cancel() {
      if (!this.active) return null;
      const cancelled = this.active;
      this.clearInterval(cancelled.timer);
      this.active = null;
      cancelled.controller.abort();
      return { id: cancelled.id, languages: [...cancelled.languages] };
    }
  }

  function isAbortError(error) {
    return error?.name === "AbortError" || error?.code === "OPENAI_CANCELLED";
  }

  return { CancellableGenerationSession, isAbortError };
});
