"use strict";

(function exposePlayableAnnotations(root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  if (root) root.Proto05PlayableAnnotations = contract;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlayableAnnotationsContract() {
  function projectAnnotations(activity) {
    const segmentsById = new Map((activity.segments || []).map(segment => [segment.id, segment]));
    return (activity.teacherAnnotations || [])
      .map(annotation => {
        const segment = segmentsById.get(annotation.segmentId);
        if (!segment) return null;
        return {
          id: annotation.id,
          segmentId: annotation.segmentId,
          start: Number(segment.startMs) / 1000,
          end: Number(segment.endMs) / 1000,
          note: annotation.note || "",
          question: annotation.pedagogicalQuestion || ""
        };
      })
      .filter(annotation => (
        annotation
        && Number.isFinite(annotation.start)
        && Number.isFinite(annotation.end)
        && annotation.start >= 0
        && annotation.end > annotation.start
      ))
      .sort((left, right) => (
        left.start - right.start
        || left.end - right.end
        || left.id.localeCompare(right.id)
      ));
  }

  function annotationsAtTime(annotations, time) {
    const currentTime = Number(time);
    if (!Number.isFinite(currentTime) || currentTime < 0) return [];
    return annotations.filter(annotation => currentTime >= annotation.start && currentTime < annotation.end);
  }

  function presentationAtTime(annotations, time) {
    const active = annotationsAtTime(annotations, time);
    return {
      active,
      note: active.map(annotation => annotation.note.trim()).filter(Boolean).join("\n\n"),
      questions: active.map(annotation => annotation.question.trim()).filter(Boolean)
    };
  }

  return Object.freeze({
    annotationsAtTime,
    presentationAtTime,
    projectAnnotations
  });
});
