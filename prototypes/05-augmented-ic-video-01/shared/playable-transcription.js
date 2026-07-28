"use strict";

(function exposePlayableTranscription(root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  if (root) root.Proto05PlayableTranscription = contract;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlayableTranscriptionContract() {
  function projectSegments(activity, overlays = []) {
    const speakersById = new Map((activity.speakers || []).map(speaker => [speaker.id, speaker.label]));
    const languagesById = new Map((activity.languages || []).map(language => [language.id, language.code]));
    const phenomenaBySegmentId = new Map();
    for (const phenomenon of activity.phenomena || []) {
      if (!phenomenaBySegmentId.has(phenomenon.segmentId)) phenomenaBySegmentId.set(phenomenon.segmentId, []);
      phenomenaBySegmentId.get(phenomenon.segmentId).push(phenomenon);
    }
    const annotationsBySegmentId = new Map(
      (activity.teacherAnnotations || []).map(annotation => [annotation.segmentId, annotation])
    );

    return (activity.segments || []).map(segment => {
      const annotation = annotationsBySegmentId.get(segment.id);
      const tags = (phenomenaBySegmentId.get(segment.id) || [])
        .map(phenomenon => phenomenon.layerId)
        .filter(Boolean);
      return {
        id: segment.id,
        start: segment.startMs / 1000,
        end: segment.endMs / 1000,
        speaker: (segment.speakerIds || [])
          .map(speakerId => speakersById.get(speakerId) || speakerId)
          .join(" et "),
        text: segment.text,
        languages: (segment.languageIds || [])
          .map(languageId => languagesById.get(languageId))
          .filter(Boolean),
        tags,
        note: annotation?.note || "",
        question: annotation?.pedagogicalQuestion || "",
        overlays: annotation ? overlays.filter(overlay => overlay.annotationId === annotation.id) : []
      };
    });
  }

  function hasVisibleTranscription(segment) {
    return Boolean(segment);
  }

  function segmentIndexAtTime(segments, time) {
    return segments.findIndex(segment => time >= segment.start && time < segment.end);
  }

  return Object.freeze({
    hasVisibleTranscription,
    projectSegments,
    segmentIndexAtTime
  });
});
