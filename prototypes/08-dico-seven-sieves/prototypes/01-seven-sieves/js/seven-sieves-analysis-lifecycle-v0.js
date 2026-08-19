(function initSevenSievesAnalysisLifecycle(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SevenSievesAnalysisLifecycle = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createLifecycleApi() {
  "use strict";

  const DEFAULT_ANALYSIS_TIMEOUT_MS = 15_000;

  function createAnalysisLifecycle(options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_ANALYSIS_TIMEOUT_MS;
    const setTimeoutFn = options.setTimeoutFn || setTimeout;
    const clearTimeoutFn = options.clearTimeoutFn || clearTimeout;
    const setIntervalFn = options.setIntervalFn || setInterval;
    const clearIntervalFn = options.clearIntervalFn || clearInterval;
    const onTransition = options.onTransition || (() => {});
    const onElapsed = options.onElapsed || (() => {});
    const createAbortController = options.createAbortController || (() => new AbortController());

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error("Le délai maximal d’analyse doit être positif.");
    }

    let generation = 0;
    let active = null;
    let state = "ready";
    let disposed = false;

    function transition(nextState, details = {}) {
      state = nextState;
      if (!disposed) onTransition(nextState, details);
    }

    function clearTimers(request) {
      if (!request) return;
      clearTimeoutFn(request.timeoutId);
      clearIntervalFn(request.intervalId);
      request.timeoutId = null;
      request.intervalId = null;
    }

    function finish(request, outcome, details = {}) {
      if (!request || active !== request || request.finished) return false;
      request.finished = true;
      clearTimers(request);
      active = null;
      transition(outcome, { generation: request.generation, ...details });
      request.resolve({ status: outcome, generation: request.generation, ...details });
      return true;
    }

    function abortActive(outcome) {
      if (!active) return false;
      const request = active;
      request.controller.abort();
      return finish(request, outcome);
    }

    function start(execute, handlers = {}) {
      if (disposed) throw new Error("Le cycle d’analyse est fermé.");
      if (typeof execute !== "function") throw new Error("Analyse absente.");
      if (active) return { started: false, generation: active.generation, promise: active.promise };

      generation += 1;
      const controller = createAbortController();
      let resolveCompletion;
      const completion = new Promise((resolve) => { resolveCompletion = resolve; });
      const request = {
        generation,
        controller,
        finished: false,
        timeoutId: null,
        intervalId: null,
        promise: completion,
        resolve: resolveCompletion,
      };
      active = request;
      transition("running", { generation });
      onElapsed(0, { generation });

      request.intervalId = setIntervalFn(() => {
        if (active !== request || request.finished) return;
        request.elapsedSeconds = (request.elapsedSeconds || 0) + 1;
        onElapsed(request.elapsedSeconds, { generation });
      }, 1_000);
      request.timeoutId = setTimeoutFn(() => {
        if (active !== request || request.finished) return;
        request.controller.abort();
        finish(request, "timed_out");
      }, timeoutMs);

      Promise.resolve()
        .then(() => execute({ signal: controller.signal, generation }))
        .then((value) => {
          if (active !== request || request.finished) return;
          try {
            handlers.onSuccess?.(value, { generation });
            finish(request, "success", { value });
          } catch (error) {
            handlers.onError?.(error, { generation });
            finish(request, "error", { error });
          }
        })
        .catch((error) => {
          if (active !== request || request.finished) return;
          handlers.onError?.(error, { generation });
          finish(request, "error", { error });
        });

      return { started: true, generation, promise: completion };
    }

    function cancel() {
      return abortActive("cancelled");
    }

    function invalidate() {
      if (active) abortActive("invalidated");
      else transition("invalidated", { generation });
    }

    function dispose() {
      disposed = true;
      if (!active) return;
      const request = active;
      request.controller.abort();
      clearTimers(request);
      request.finished = true;
      active = null;
      request.resolve({ status: "disposed", generation: request.generation });
    }

    return {
      start,
      cancel,
      invalidate,
      dispose,
      getState: () => state,
      getGeneration: () => generation,
      isRunning: () => active !== null,
      isCurrent: (candidateGeneration) => active?.generation === candidateGeneration,
    };
  }

  return { DEFAULT_ANALYSIS_TIMEOUT_MS, createAnalysisLifecycle };
});
