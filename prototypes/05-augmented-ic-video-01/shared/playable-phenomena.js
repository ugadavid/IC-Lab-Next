"use strict";

(function exposePlayablePhenomena(root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  if (root) root.Proto05PlayablePhenomena = contract;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlayablePhenomenaContract() {
  function projectPhenomena(activity) {
    return (activity.phenomena || []).map(phenomenon => ({
      id: phenomenon.id,
      segmentId: phenomenon.segmentId,
      layerId: phenomenon.layerId,
      startMs: phenomenon.startMs,
      endMs: phenomenon.endMs
    }));
  }

  function visiblePhenomena(phenomena, activeLayers) {
    return phenomena.filter(phenomenon => activeLayers.has(phenomenon.layerId));
  }

  return Object.freeze({
    projectPhenomena,
    visiblePhenomena
  });
});
