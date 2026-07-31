(function exposeAuthoringMutationState(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Proto05AuthoringMutationState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAuthoringMutationState() {
  "use strict";

  function applyCanonicalActivity(state, payload, render) {
    if (!state || typeof state !== "object") throw new TypeError("État auteur absent.");
    if (!payload?.activity || typeof payload.activity !== "object") {
      throw new TypeError("Réponse canonique d’activité absente.");
    }
    state.activity = payload.activity;
    if (typeof render === "function") render();
    return state.activity;
  }

  const COLLECTION_BY_SELECTION_TYPE = Object.freeze({
    segment: "segments",
    interval: "languageIntervals",
    phenomenon: "phenomena",
    speaker: "speakers",
    layer: "layers",
    annotation: "teacherAnnotations",
    overlay: "overlays"
  });

  function rebindSelection(activity, selection) {
    const type = selection?.type;
    const id = selection?.item?.id;
    const collection = COLLECTION_BY_SELECTION_TYPE[type];
    if (!collection || typeof id !== "string") return null;
    const item = (activity?.[collection] || []).find(candidate => candidate?.id === id);
    return item ? { ...selection, item, isNew: false } : null;
  }

  function singleFlight(action) {
    if (typeof action !== "function") throw new TypeError("Mutation auteur absente.");
    let pending = null;
    return function runSingleFlight(...argumentsList) {
      if (pending) return pending;
      pending = Promise.resolve()
        .then(() => action.apply(this, argumentsList))
        .finally(() => { pending = null; });
      return pending;
    };
  }

  return Object.freeze({ applyCanonicalActivity, rebindSelection, singleFlight });
});
