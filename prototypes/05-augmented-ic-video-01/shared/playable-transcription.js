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
    const annotationsBySegmentId = new Map();
    for (const annotation of activity.teacherAnnotations || []) {
      if (!annotationsBySegmentId.has(annotation.segmentId)) annotationsBySegmentId.set(annotation.segmentId, []);
      annotationsBySegmentId.get(annotation.segmentId).push(annotation);
    }
    for (const annotations of annotationsBySegmentId.values()) {
      annotations.sort((left, right) => left.id.localeCompare(right.id));
    }

    return (activity.segments || []).map(segment => {
      const annotations = annotationsBySegmentId.get(segment.id) || [];
      const annotationIds = new Set(annotations.map(annotation => annotation.id));
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
        annotations: annotations.map(annotation => ({
          id: annotation.id,
          note: annotation.note || "",
          question: annotation.pedagogicalQuestion || ""
        })),
        note: annotations.map(annotation => annotation.note || "").filter(Boolean).join("\n\n"),
        question: annotations.map(annotation => annotation.pedagogicalQuestion || "").filter(Boolean).join(" · "),
        overlays: overlays.filter(overlay => annotationIds.has(overlay.annotationId))
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
