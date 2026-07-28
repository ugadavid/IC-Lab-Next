(function initializeGuidedAuthoringContract(globalObject, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (globalObject) globalObject.Proto05GuidedAuthoring = api;
})(typeof window !== "undefined" ? window : globalThis, function guidedAuthoringContractFactory() {
  "use strict";

  function buildAuthoringPayload(activity) {
    return {
      title: activity.title,
      description: activity.description,
      instruction: activity.instruction || "",
      pedagogicalQuestion: activity.pedagogicalQuestion || "",
      videoRef: activity.videoRef,
      segments: activity.segments || [],
      speakers: activity.speakers || [],
      languages: activity.languages || [],
      languageIntervals: activity.languageIntervals || [],
      phenomena: activity.phenomena || [],
      layers: activity.layers || [],
      teacherAnnotations: activity.teacherAnnotations || [],
      overlays: activity.overlays || [],
      layerConfiguration: activity.layerConfiguration
    };
  }

  function phenomenonIssue(activity, phenomenon) {
    const segment = (activity.segments || []).find(item => item.id === phenomenon.segmentId);
    if (!segment) return "Choisissez un segment existant pour ce phénomène.";
    if (!(activity.layers || []).some(item => item.id === phenomenon.layerId)) {
      return "Créez ou choisissez une couche pédagogique pour ce phénomène.";
    }
    if (!Number.isInteger(phenomenon.startMs) || !Number.isInteger(phenomenon.endMs)
      || phenomenon.startMs < 0 || phenomenon.endMs <= phenomenon.startMs) {
      return "Le phénomène doit avoir un intervalle temporel non nul.";
    }
    const durationMs = Number(activity.video?.durationMs);
    if (Number.isFinite(durationMs) && durationMs > 0 && phenomenon.endMs > durationMs) {
      return "La fin du phénomène dépasse la durée de la vidéo.";
    }
    if (phenomenon.startMs < segment.startMs || phenomenon.endMs > segment.endMs) {
      return "Placez le phénomène à l’intérieur du segment choisi.";
    }
    return null;
  }

  function preparePhenomenon(activity, currentTimeMs, selectedSegmentId = null) {
    const segments = activity.segments || [];
    if (!segments.length) {
      return { error: "Ajout impossible : créez d’abord un segment temporel." };
    }
    if (!(activity.layers || []).length) {
      return { error: "Ajout impossible : créez d’abord une couche pédagogique." };
    }

    const current = Math.round(Number(currentTimeMs));
    const segmentAtCurrentTime = Number.isInteger(current)
      ? segments.find(item => current >= item.startMs && current < item.endMs)
      : null;
    const selectedSegment = selectedSegmentId
      ? segments.find(item => item.id === selectedSegmentId)
      : null;
    const segment = segmentAtCurrentTime || selectedSegment;
    if (!segment) {
      return {
        error: "Ajout impossible : placez la tête de lecture dans un segment ou sélectionnez un segment."
      };
    }
    if (!Number.isInteger(segment.startMs) || !Number.isInteger(segment.endMs)
      || segment.startMs < 0 || segment.endMs <= segment.startMs) {
      return { error: "Ajout impossible : le segment choisi n’a pas d’intervalle temporel valide." };
    }

    const startMs = segmentAtCurrentTime ? current : segment.startMs;
    const durationMs = Number(activity.video?.durationMs);
    const maximumEnd = Number.isFinite(durationMs) && durationMs > 0
      ? Math.min(segment.endMs, durationMs)
      : segment.endMs;
    const endMs = Math.min(startMs + 5000, maximumEnd);
    if (endMs <= startMs) {
      return { error: "Ajout impossible : aucun intervalle non nul n’est disponible dans ce segment." };
    }

    return {
      phenomenon: {
        segmentId: segment.id,
        layerId: activity.layers[0].id,
        startMs,
        endMs
      },
      usedSelectedSegment: !segmentAtCurrentTime && Boolean(selectedSegment)
    };
  }

  function normalizedLanguageCatalog(languages) {
    if (!Array.isArray(languages)) return [];
    return languages.filter(language => (
      language
      && typeof language.id === "string"
      && language.id
      && typeof language.label === "string"
      && language.label
    ));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function renderLanguageOptions(languages, selectedId = null) {
    return normalizedLanguageCatalog(languages).map(language => (
      `<option value="${escapeHtml(language.id)}" ${language.id === selectedId ? "selected" : ""}>${escapeHtml(language.label)}</option>`
    )).join("");
  }

  function ensureActivityLanguage(activity, language) {
    const reference = normalizedLanguageCatalog([language])[0];
    if (!reference) throw new Error("La langue sélectionnée est absente du référentiel.");
    activity.languages = Array.isArray(activity.languages) ? activity.languages : [];
    const existing = activity.languages.find(item => item.id === reference.id);
    if (existing) return existing;
    const selected = {
      id: reference.id,
      code: reference.id.toUpperCase(),
      label: reference.label
    };
    activity.languages.push(selected);
    return selected;
  }

  function languageIntervalTimeIssue(startMs, endMs, durationMs) {
    if (!Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < 0 || endMs < 0) {
      return "Renseignez des bornes temporelles valides.";
    }
    if (endMs <= startMs) {
      return "La fin doit être postérieure au début.";
    }
    const maximum = Number(durationMs);
    if (Number.isFinite(maximum) && maximum > 0 && endMs > maximum) {
      return "La fin doit rester dans la durée de la vidéo.";
    }
    return null;
  }

  function applyLanguageIntervalBounds(interval, candidate, durationMs) {
    const issue = languageIntervalTimeIssue(candidate?.startMs, candidate?.endMs, durationMs);
    if (issue) return { valid: false, issue };
    interval.startMs = candidate.startMs;
    interval.endMs = candidate.endMs;
    return { valid: true, issue: null };
  }

  return {
    applyLanguageIntervalBounds,
    buildAuthoringPayload,
    ensureActivityLanguage,
    languageIntervalTimeIssue,
    phenomenonIssue,
    preparePhenomenon,
    renderLanguageOptions
  };
});
