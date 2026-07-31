"use strict";

const REPLACEMENT_TYPES = Object.freeze({
  "soft-tone": Object.freeze({ id: "soft-tone", label: "Tonalité douce" }),
  beep: Object.freeze({ id: "beep", label: "Bip" }),
  silence: Object.freeze({ id: "silence", label: "Silence" })
});

const MAX_PASSAGES = 200;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/;

function requiredIdentifier(value, label) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!IDENTIFIER.test(result)) throw new Error(`${label} est invalide.`);
  return result;
}

function optionalText(value, label, maximum) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > maximum) {
    throw new Error(`${label} doit contenir au plus ${maximum} caractères.`);
  }
  return value.trim() || null;
}

function millisecond(value, label) {
  const result = Number(value);
  if (!Number.isFinite(result) || !Number.isInteger(result) || result < 0) {
    throw new Error(`${label} doit être un nombre entier positif ou nul de millisecondes.`);
  }
  return result;
}

function normalizeAudioPassages(value, { durationMs, requirePassages = false } = {}) {
  if (!Array.isArray(value) || value.length > MAX_PASSAGES || (requirePassages && value.length === 0)) {
    throw new Error(requirePassages
      ? `Le plan doit contenir de 1 à ${MAX_PASSAGES} passages.`
      : `Le plan doit contenir au plus ${MAX_PASSAGES} passages.`);
  }
  const duration = millisecond(durationMs, "La durée de la vidéo");
  if (duration === 0) throw new Error("La durée de la vidéo doit être strictement positive.");
  const identifiers = new Set();
  const passages = value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Le passage ${index + 1} est invalide.`);
    }
    const id = requiredIdentifier(entry.id, `L’identifiant du passage ${index + 1}`);
    if (identifiers.has(id)) throw new Error(`L’identifiant ${id} est dupliqué.`);
    identifiers.add(id);
    const startMs = millisecond(entry.startMs, `Le début du passage ${id}`);
    const endMs = millisecond(entry.endMs, `La fin du passage ${id}`);
    if (endMs <= startMs) throw new Error(`La fin du passage ${id} doit être postérieure à son début.`);
    if (endMs > duration) throw new Error(`Le passage ${id} dépasse la durée de la vidéo.`);
    const replacementType = String(entry.replacementType || "soft-tone");
    if (!REPLACEMENT_TYPES[replacementType]) throw new Error(`L’effet du passage ${id} est inconnu.`);
    return {
      id,
      startMs,
      endMs,
      replacementType,
      label: optionalText(entry.label, `Le libellé du passage ${id}`, 500),
      reason: optionalText(entry.reason, `La raison du passage ${id}`, 1000)
    };
  }).sort((left, right) => (
    left.startMs - right.startMs
      || left.endMs - right.endMs
      || left.id.localeCompare(right.id)
  ));
  for (let index = 1; index < passages.length; index += 1) {
    const previous = passages[index - 1];
    const current = passages[index];
    if (current.startMs < previous.endMs) {
      throw new Error(`Les passages ${previous.id} et ${current.id} se chevauchent. Les passages contigus restent autorisés.`);
    }
  }
  return passages;
}

function normalizeAudioPlan(value, options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Le plan d’anonymisation audio est invalide.");
  }
  const durationMs = millisecond(options.durationMs ?? value.durationMs, "La durée de la vidéo");
  const passages = normalizeAudioPassages(value.passages || [], {
    durationMs,
    requirePassages: options.requirePassages === true
  });
  return {
    id: requiredIdentifier(value.id, "L’identifiant du plan"),
    sourceAssetId: requiredIdentifier(value.sourceAssetId, "L’asset source"),
    sourcePlayableId: requiredIdentifier(value.sourcePlayableId, "Le playable source"),
    durationMs,
    revision: Number.isInteger(Number(value.revision)) && Number(value.revision) >= 0
      ? Number(value.revision)
      : 0,
    passages,
    passageCount: passages.length,
    maskedDurationMs: passages.reduce((sum, passage) => sum + passage.endMs - passage.startMs, 0)
  };
}

function seconds(milliseconds) {
  return (milliseconds / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function fades(durationSeconds) {
  const fade = Math.min(0.015, durationSeconds / 4);
  if (fade <= 0) return "";
  return `,afade=t=in:st=0:d=${fade.toFixed(4)},afade=t=out:st=${Math.max(0, durationSeconds - fade).toFixed(4)}:d=${fade.toFixed(4)}`;
}

function buildAudioReplacementFilter(passages, durationMs) {
  const normalized = normalizeAudioPassages(passages, { durationMs, requirePassages: true });
  const graph = [];
  const pieces = [];
  let cursorMs = 0;
  const addOriginal = (startMs, endMs) => {
    if (endMs <= startMs) return;
    const index = pieces.length;
    const durationSeconds = (endMs - startMs) / 1000;
    graph.push(`[0:a:0]atrim=start=${seconds(startMs)}:end=${seconds(endMs)},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo${fades(durationSeconds)}[audio${index}]`);
    pieces.push(`[audio${index}]`);
  };
  const addReplacement = passage => {
    const index = pieces.length;
    const durationSeconds = (passage.endMs - passage.startMs) / 1000;
    const duration = seconds(passage.endMs - passage.startMs);
    if (passage.replacementType === "silence") {
      graph.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${duration},asetpts=PTS-STARTPTS[audio${index}]`);
    } else if (passage.replacementType === "beep") {
      graph.push(`sine=frequency=880:sample_rate=48000:duration=${duration},volume=0.09,aformat=sample_fmts=fltp:channel_layouts=stereo${fades(durationSeconds)}[audio${index}]`);
    } else {
      graph.push(`sine=frequency=196:sample_rate=48000:duration=${duration},volume=0.045[tone${index}a]`);
      graph.push(`sine=frequency=246.94:sample_rate=48000:duration=${duration},volume=0.035[tone${index}b]`);
      graph.push(`[tone${index}a][tone${index}b]amix=inputs=2:normalize=0,aformat=sample_fmts=fltp:channel_layouts=stereo${fades(durationSeconds)}[audio${index}]`);
    }
    pieces.push(`[audio${index}]`);
  };
  for (const passage of normalized) {
    addOriginal(cursorMs, passage.startMs);
    addReplacement(passage);
    cursorMs = passage.endMs;
  }
  addOriginal(cursorMs, durationMs);
  graph.push(`${pieces.join("")}concat=n=${pieces.length}:v=0:a=1[outa]`);
  return {
    filter: graph.join(";"),
    outputLabel: "[outa]",
    passages: normalized,
    videoCodec: "copy",
    audioCodec: "aac",
    sampleRate: 48000,
    overlapRule: "half-open-no-overlap-adjacency-allowed"
  };
}

function activeAudioPassage(passages, timeMs) {
  const value = Number(timeMs);
  if (!Number.isFinite(value)) return null;
  return passages.find(passage => value >= passage.startMs && value < passage.endMs) || null;
}

module.exports = {
  MAX_PASSAGES,
  REPLACEMENT_TYPES,
  activeAudioPassage,
  buildAudioReplacementFilter,
  normalizeAudioPassages,
  normalizeAudioPlan
};
