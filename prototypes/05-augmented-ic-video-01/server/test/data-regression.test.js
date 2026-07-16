"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { sha256 } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function addUnknownSentinels(store) {
  const activity = store.activities[0];
  store.testUnknownStoreField = { preserved: "store" };
  activity.testUnknownActivityField = { preserved: "activity" };
  activity.video.testUnknownVideoField = "video";
  activity.transcription.testUnknownTranscriptionField = "transcription";
  activity.segments[0].testUnknownSegmentField = "segment";
  activity.speakers[0].testUnknownSpeakerField = "speaker";
  activity.languages[0].testUnknownLanguageField = "language";
  activity.languageIntervals[0].testUnknownIntervalField = "interval";
  activity.layers[0].testUnknownLayerField = "layer";
  activity.phenomena[0].testUnknownPhenomenonField = "phenomenon";
  activity.teacherAnnotations[0].testUnknownAnnotationField = "annotation";
  activity.layerConfiguration.testUnknownConfigurationField = "configuration";
}

function authoringPayload(activity, changes = {}) {
  return {
    title: activity.title,
    description: activity.description,
    instruction: activity.instruction || "",
    pedagogicalQuestion: activity.pedagogicalQuestion || "",
    videoId: activity.video.id,
    segments: activity.segments,
    languages: activity.languages,
    languageIntervals: activity.languageIntervals,
    phenomena: activity.phenomena,
    layers: activity.layers,
    teacherAnnotations: activity.teacherAnnotations,
    layerConfiguration: activity.layerConfiguration,
    ...changes
  };
}

function collectionOrders(activity) {
  return {
    segments: activity.segments.map(item => item.id),
    languageIntervals: activity.languageIntervals.map(item => item.id),
    phenomena: activity.phenomena.map(item => item.id),
    layers: activity.layers.map(item => item.id),
    languages: activity.languages.map(item => item.id),
    speakers: activity.speakers.map(item => item.id),
    teacherAnnotations: activity.teacherAnnotations.map(item => item.id),
    transcriptionSegments: [...activity.transcription.segmentIds],
    defaultVisibleLayers: [...activity.layerConfiguration.defaultVisibleLayerIds],
    learnerVisibleLayers: [...activity.layerConfiguration.learnerVisibleLayerIds],
    teacherVisibleLayers: [...activity.layerConfiguration.teacherVisibleLayerIds]
  };
}

function referenceIssues(activity) {
  const issues = [];
  const collections = [
    ["segment", activity.segments],
    ["intervalle", activity.languageIntervals],
    ["phénomène", activity.phenomena],
    ["couche", activity.layers],
    ["langue", activity.languages],
    ["locuteur", activity.speakers],
    ["annotation", activity.teacherAnnotations]
  ];
  for (const [label, items] of collections) {
    const ids = items.map(item => item.id);
    if (ids.some(id => typeof id !== "string" || !id)) issues.push(`${label}: identifiant absent`);
    if (new Set(ids).size !== ids.length) issues.push(`${label}: identifiant dupliqué`);
  }

  const segments = new Map(activity.segments.map(item => [item.id, item]));
  const intervals = activity.languageIntervals;
  const phenomena = new Map(activity.phenomena.map(item => [item.id, item]));
  const languages = new Set(activity.languages.map(item => item.id));
  const speakers = new Set(activity.speakers.map(item => item.id));
  const layers = new Set(activity.layers.map(item => item.id));

  if (!languages.has(activity.transcription.languageId)) issues.push("transcription: langue inconnue");
  if (JSON.stringify(activity.transcription.segmentIds) !== JSON.stringify(activity.segments.map(item => item.id))) {
    issues.push("transcription: segments absents ou désordonnés");
  }

  for (const segment of activity.segments) {
    for (const id of segment.languageIds || []) if (!languages.has(id)) issues.push(`${segment.id}: langue ${id} inconnue`);
    for (const id of segment.speakerIds || []) if (!speakers.has(id)) issues.push(`${segment.id}: locuteur ${id} inconnu`);
    for (const id of segment.phenomenonIds || []) {
      const phenomenon = phenomena.get(id);
      if (!phenomenon) issues.push(`${segment.id}: phénomène ${id} inconnu`);
      else if (phenomenon.segmentId !== segment.id) issues.push(`${segment.id}: phénomène ${id} rattaché à ${phenomenon.segmentId}`);
    }
    const intervalLanguages = intervals.filter(item => item.segmentId === segment.id).map(item => item.languageId).sort();
    const segmentLanguages = [...(segment.languageIds || [])].sort();
    if (JSON.stringify(intervalLanguages) !== JSON.stringify(segmentLanguages)) issues.push(`${segment.id}: intervalles linguistiques incomplets`);
    const segmentPhenomena = activity.phenomena.filter(item => item.segmentId === segment.id).map(item => item.id).sort();
    const declaredPhenomena = [...(segment.phenomenonIds || [])].sort();
    if (JSON.stringify(segmentPhenomena) !== JSON.stringify(declaredPhenomena)) issues.push(`${segment.id}: phénomènes incomplets`);
  }

  for (const interval of intervals) {
    if (!segments.has(interval.segmentId)) issues.push(`${interval.id}: segment inconnu`);
    if (!languages.has(interval.languageId)) issues.push(`${interval.id}: langue inconnue`);
  }
  for (const phenomenon of activity.phenomena) {
    if (!segments.has(phenomenon.segmentId)) issues.push(`${phenomenon.id}: segment inconnu`);
    if (!layers.has(phenomenon.layerId)) issues.push(`${phenomenon.id}: couche inconnue`);
  }
  const annotatedSegments = new Set();
  for (const annotation of activity.teacherAnnotations) {
    if (!segments.has(annotation.segmentId)) issues.push(`${annotation.id}: segment inconnu`);
    if (annotatedSegments.has(annotation.segmentId)) issues.push(`${annotation.id}: annotation de segment dupliquée`);
    annotatedSegments.add(annotation.segmentId);
    for (const layerId of annotation.overlay?.layerIds || []) {
      if (!layers.has(layerId)) issues.push(`${annotation.id}: couche overlay ${layerId} inconnue`);
    }
  }
  if (annotatedSegments.size !== activity.segments.length) issues.push("annotations: tous les segments ne sont pas couverts");
  for (const key of ["defaultVisibleLayerIds", "learnerVisibleLayerIds", "teacherVisibleLayerIds"]) {
    for (const layerId of activity.layerConfiguration[key] || []) {
      if (!layers.has(layerId)) issues.push(`configuration ${key}: couche ${layerId} inconnue`);
    }
  }
  return issues;
}

function timingIssues(activity) {
  const issues = [];
  const duration = activity.video.durationMs;
  if (!Number.isInteger(duration) || duration <= 0) issues.push("durée vidéo invalide");
  const checkRange = (item, label) => {
    if (!Number.isInteger(item.startMs) || !Number.isInteger(item.endMs)) issues.push(`${label}: temps non entier`);
    else if (item.startMs < 0 || item.startMs >= item.endMs || item.endMs > duration) issues.push(`${label}: intervalle hors durée`);
  };
  for (const segment of activity.segments) checkRange(segment, segment.id);
  for (let index = 1; index < activity.segments.length; index += 1) {
    if (activity.segments[index].startMs < activity.segments[index - 1].startMs) issues.push("segments: ordre temporel décroissant");
  }
  const segments = new Map(activity.segments.map(item => [item.id, item]));
  for (const interval of activity.languageIntervals) {
    checkRange(interval, interval.id);
    const segment = segments.get(interval.segmentId);
    if (segment && (interval.startMs !== segment.startMs || interval.endMs !== segment.endMs)) issues.push(`${interval.id}: désynchronisé du segment`);
    if (segment && !segment.languageIds.includes(interval.languageId)) issues.push(`${interval.id}: langue absente du segment`);
  }
  for (const phenomenon of activity.phenomena) {
    checkRange(phenomenon, phenomenon.id);
    const segment = segments.get(phenomenon.segmentId);
    if (segment && (phenomenon.startMs !== segment.startMs || phenomenon.endMs !== segment.endMs)) issues.push(`${phenomenon.id}: désynchronisé du segment`);
    if (segment && !segment.phenomenonIds.includes(phenomenon.id)) issues.push(`${phenomenon.id}: référence inverse absente`);
  }
  return issues;
}

function assertUnknownSentinels(store) {
  const activity = store.activities[0];
  assert.deepEqual(store.testUnknownStoreField, { preserved: "store" });
  assert.deepEqual(activity.testUnknownActivityField, { preserved: "activity" });
  assert.equal(activity.video.testUnknownVideoField, "video");
  assert.equal(activity.transcription.testUnknownTranscriptionField, "transcription");
  assert.equal(activity.segments[0].testUnknownSegmentField, "segment");
  assert.equal(activity.speakers[0].testUnknownSpeakerField, "speaker");
  assert.equal(activity.languages[0].testUnknownLanguageField, "language");
  assert.equal(activity.languageIntervals[0].testUnknownIntervalField, "interval");
  assert.equal(activity.layers[0].testUnknownLayerField, "layer");
  assert.equal(activity.phenomena[0].testUnknownPhenomenonField, "phenomenon");
  assert.equal(activity.teacherAnnotations[0].testUnknownAnnotationField, "annotation");
  assert.equal(activity.layerConfiguration.testUnknownConfigurationField, "configuration");
}

test("non-régression des données historiques Proto05", { timeout: 15000 }, async context => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const canonicalStore = JSON.parse(fs.readFileSync(canonicalDataFile, "utf8"));
  const initialStore = clone(canonicalStore);
  addUnknownSentinels(initialStore);
  const initialActivity = initialStore.activities[0];
  const initialOrders = collectionOrders(initialActivity);
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-data-regression-");
  const initialTemporaryHash = sha256(temporary.dataFile);
  const writes = [];
  const savePath = `/api/proto05/activities/${encodeURIComponent(initialActivity.id)}/authoring`;
  let noOpResponse;
  let targetedResponse;
  let afterNoOp;
  let afterTargeted;
  let afterNoOpHash;
  let firstBackupHash;
  let secondBackupHash;
  let secondBackup;
  let executionError;

  const save = async payload => {
    writes.push({ method: "PUT", pathname: savePath });
    return fetch(`${temporary.baseUrl}${savePath}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  };

  try {
    noOpResponse = await save(authoringPayload(initialActivity));
    await noOpResponse.json();
    afterNoOp = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    afterNoOpHash = sha256(temporary.dataFile);
    firstBackupHash = sha256(`${temporary.dataFile}.bak`);

    targetedResponse = await save(authoringPayload(afterNoOp.activities[0], { title: `${initialActivity.title} — test ciblé` }));
    await targetedResponse.json();
    afterTargeted = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    secondBackupHash = sha256(`${temporary.dataFile}.bak`);
    secondBackup = JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8"));
  } catch (error) {
    executionError = error;
  } finally {
    await temporary.stop();
  }

  await context.test("data/activities.json reste strictement inchangé", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });

  await context.test("les volumes historiques attendus sont présents", () => {
    assert.deepEqual({
      segments: initialActivity.segments.length,
      languageIntervals: initialActivity.languageIntervals.length,
      phenomena: initialActivity.phenomena.length,
      layers: initialActivity.layers.length,
      languages: initialActivity.languages.length,
      speakers: initialActivity.speakers.length,
      teacherAnnotations: initialActivity.teacherAnnotations.length
    }, {
      segments: 11,
      languageIntervals: 22,
      phenomena: 26,
      layers: 7,
      languages: 4,
      speakers: 5,
      teacherAnnotations: 11
    });
  });

  await context.test("toutes les références historiques sont valides", () => {
    assert.deepEqual(referenceIssues(initialActivity), []);
  });

  await context.test("les temps sont valides et synchronisés", () => {
    assert.deepEqual(timingIssues(initialActivity), []);
  });

  if (executionError) {
    await temporary.cleanup();
    throw executionError;
  }

  await context.test("une sauvegarde sans modification conserve les données et leur ordre", () => {
    assert.equal(noOpResponse.status, 200);
    const normalized = clone(afterNoOp);
    normalized.updatedAt = initialStore.updatedAt;
    assert.deepEqual(normalized, initialStore);
    assert.deepEqual(collectionOrders(afterNoOp.activities[0]), initialOrders);
  });

  await context.test("une modification ciblée ne réordonne ni ne supprime rien", () => {
    assert.equal(targetedResponse.status, 200);
    assert.equal(afterTargeted.activities[0].title, `${initialActivity.title} — test ciblé`);
    const normalized = clone(afterTargeted);
    normalized.updatedAt = afterNoOp.updatedAt;
    normalized.activities[0].title = afterNoOp.activities[0].title;
    assert.deepEqual(normalized, afterNoOp);
    assert.deepEqual(collectionOrders(afterTargeted.activities[0]), initialOrders);
  });

  await context.test("les champs inconnus ou non concernés sont conservés", () => {
    assertUnknownSentinels(afterNoOp);
    assertUnknownSentinels(afterTargeted);
    assert.deepEqual(afterTargeted.activities[0].speakers, initialActivity.speakers);
    assert.deepEqual(afterTargeted.activities[0].transcription, initialActivity.transcription);
  });

  await context.test("la sauvegarde .bak correspond exactement à l’état précédent", () => {
    assert.equal(firstBackupHash, initialTemporaryHash);
    assert.equal(secondBackupHash, afterNoOpHash);
    assert.deepEqual(secondBackup, afterNoOp);
  });

  await context.test("seules les deux écritures attendues ciblent la copie temporaire", () => {
    assert.deepEqual(writes, [
      { method: "PUT", pathname: savePath },
      { method: "PUT", pathname: savePath }
    ]);
  });

  await temporary.cleanup();
});
