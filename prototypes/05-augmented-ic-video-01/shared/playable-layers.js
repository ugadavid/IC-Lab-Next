"use strict";

(function exposePlayableLayers(root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  if (root) root.Proto05PlayableLayers = contract;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlayableLayerContract() {
  function projectLayers(activity, audience = "learner") {
    const layers = Array.isArray(activity.layers) ? activity.layers : [];
    const configuration = activity.layerConfiguration || {};
    const visibilityKey = audience === "teacher"
      ? "teacherVisibleLayerIds"
      : "learnerVisibleLayerIds";
    const configuredIds = Array.isArray(configuration[visibilityKey])
      ? configuration[visibilityKey]
      : [];
    const availableIds = new Set(
      configuredIds.length ? configuredIds : layers.map(layer => layer.id)
    );
    const defaultIds = new Set(
      Array.isArray(configuration.defaultVisibleLayerIds)
        ? configuration.defaultVisibleLayerIds
        : []
    );
    const availableLayers = layers.filter(layer => availableIds.has(layer.id));
    return {
      layers: availableLayers,
      activeLayerIds: availableLayers
        .map(layer => layer.id)
        .filter(layerId => defaultIds.has(layerId))
    };
  }

  return Object.freeze({ projectLayers });
});
