"use strict";

(function exposePlayableOverlays(root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  if (root) root.Proto05PlayableOverlays = contract;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlayableOverlayContract() {
  function projectOverlays(activity) {
    return (activity.overlays || []).map(overlay => ({
      id: overlay.id,
      annotationId: overlay.annotationId || null,
      start: overlay.startMs / 1000,
      end: overlay.endMs / 1000,
      title: overlay.title || "",
      text: overlay.text || "",
      tags: Array.isArray(overlay.layerIds) ? overlay.layerIds : []
    }));
  }

  function overlayAtTime(overlays, time) {
    return overlays.find(overlay => time >= overlay.start && time < overlay.end) || null;
  }

  function hasVisibleOverlay(overlay, activeLayers) {
    const tags = Array.isArray(overlay?.tags) ? overlay.tags : [];
    return tags.length === 0 || tags.some(tag => activeLayers.has(tag));
  }

  return Object.freeze({
    hasVisibleOverlay,
    overlayAtTime,
    projectOverlays
  });
});
