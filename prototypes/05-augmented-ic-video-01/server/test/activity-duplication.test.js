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

function normalizeCopy(copy, source) {
  const normalized = clone(copy);
  const maps = {};
  for (const key of ["segments", "speakers", "languages", "languageIntervals", "layers", "phenomena", "teacherAnnotations"]) {
    maps[key] = new Map(copy[key].map((item, index) => [item.id, source[key][index].id]));
    normalized[key].forEach((item, index) => { item.id = source[key][index].id; });
  }
  const remap = (values, key) => values.map(value => maps[key].get(value));
  normalized.segments.forEach(segment => {
    segment.speakerIds = remap(segment.speakerIds, "speakers");
    segment.languageIds = remap(segment.languageIds, "languages");
    segment.phenomenonIds = remap(segment.phenomenonIds || [], "phenomena");
  });
  normalized.languageIntervals.forEach(interval => {
    interval.languageId = maps.languages.get(interval.languageId);
    interval.segmentId = maps.segments.get(interval.segmentId);
  });
  normalized.phenomena.forEach(phenomenon => {
    phenomenon.segmentId = maps.segments.get(phenomenon.segmentId);
    phenomenon.layerId = maps.layers.get(phenomenon.layerId);
  });
  normalized.teacherAnnotations.forEach(annotation => {
    annotation.segmentId = maps.segments.get(annotation.segmentId);
    if (annotation.overlay) annotation.overlay.layerIds = remap(annotation.overlay.layerIds || [], "layers");
  });
  normalized.transcription.id = source.transcription.id;
  normalized.transcription.languageId = maps.languages.get(normalized.transcription.languageId) || source.transcription.languageId;
  normalized.transcription.segmentIds = remap(normalized.transcription.segmentIds, "segments");
  normalized.layerConfiguration.id = source.layerConfiguration.id;
  for (const key of ["defaultVisibleLayerIds", "learnerVisibleLayerIds", "teacherVisibleLayerIds"]) {
    normalized.layerConfiguration[key] = remap(normalized.layerConfiguration[key], "layers");
  }
  return normalized;
}

function authoredData(activity) {
  return {
    video: activity.video,
    transcription: activity.transcription,
    segments: activity.segments,
    speakers: activity.speakers,
    languages: activity.languages,
    languageIntervals: activity.languageIntervals,
    layers: activity.layers,
    phenomena: activity.phenomena,
    teacherAnnotations: activity.teacherAnnotations,
    layerConfiguration: activity.layerConfiguration
  };
}

function allInternalIds(activity) {
  return [
    activity.transcription.id,
    activity.layerConfiguration.id,
    ...["segments", "speakers", "languageIntervals", "layers", "phenomena", "teacherAnnotations"]
      .flatMap(key => activity[key].map(item => item.id))
  ];
}

function emptyDraft(id, title, video) {
  return {
    id,
    version: "0.1.0",
    status: "draft",
    title,
    description: "Fixture de brouillon",
    instruction: "",
    pedagogicalQuestion: "",
    video: clone(video),
    transcription: { id: `transcription-${id}`, languageId: null, segmentIds: [] },
    segments: [],
    speakers: [],
    languages: [],
    languageIntervals: [],
    layers: [],
    phenomena: [],
    teacherAnnotations: [],
    overlays: [],
    layerConfiguration: {
      id: `layer-config-${id}`,
      defaultVisibleLayerIds: [],
      learnerVisibleLayerIds: [],
      teacherVisibleLayerIds: [],
      allowLearnerToggle: true
    }
  };
}

test("duplication d’une activité Proto05", { timeout: 15000 }, async context => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const canonicalStore = JSON.parse(fs.readFileSync(canonicalDataFile, "utf8"));
  const historical = canonicalStore.activities.find(activity => activity.id === "proto05-augmented-video-01");
  assert.ok(historical, "L’activité historique doit être présente dans la donnée de référence.");

  const initialStore = clone(canonicalStore);
  let mbolo = initialStore.activities.find(activity => activity.title === "MboloTest");
  if (!mbolo) {
    mbolo = emptyDraft("proto05-test-draft-mbolo", "MboloTest", historical.video);
    initialStore.activities.push(mbolo);
  }
  let lbinz = initialStore.activities.find(activity => activity.title === "Lbinz");
  if (!lbinz) {
    lbinz = emptyDraft("proto05-test-draft-lbinz", "Lbinz", historical.video);
    initialStore.activities.push(lbinz);
  }
  const emptyCopyCandidate = emptyDraft("proto05-test-valid-empty-draft", "Brouillon vide valide", historical.video);
  initialStore.activities.push(emptyCopyCandidate);
  const fixtureHistorical = initialStore.activities.find(activity => activity.id === historical.id);
  fixtureHistorical.studentObservations = [{ id: "student-observation-1" }];
  fixtureHistorical.learnerObservations = [{ id: "learner-observation-1" }];
  fixtureHistorical.observations = [{ id: "generic-observation-1" }];
  const invalidSource = clone(fixtureHistorical);
  invalidSource.id = "proto05-invalid-duplicate-source";
  invalidSource.title = "Source invalide";
  invalidSource.segments[1].id = invalidSource.segments[0].id;
  initialStore.activities.push(invalidSource);

  const originals = new Map(initialStore.activities.filter(activity => activity.id !== invalidSource.id).map(activity => [activity.id, clone(activity)]));
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-duplication-");
  const duplicate = async id => fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
  let historicalResponse;
  let historicalPayload;
  let afterHistorical;
  let historicalBackup;
  let draftResponse;
  let draftPayload;
  let afterDraft;
  let draftBackup;
  let unknownResponse;
  let invalidResponse;
  let invalidMethodResponse;
  let hashBeforeRefusals;
  let hashAfterRefusals;
  let executionError;

  try {
    historicalResponse = await duplicate(historical.id);
    historicalPayload = await historicalResponse.json();
    afterHistorical = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    historicalBackup = JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8"));

    draftResponse = await duplicate(emptyCopyCandidate.id);
    draftPayload = await draftResponse.json();
    afterDraft = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    draftBackup = JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8"));

    hashBeforeRefusals = sha256(temporary.dataFile);
    unknownResponse = await duplicate("activité-inconnue");
    invalidResponse = await duplicate(invalidSource.id);
    invalidMethodResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(historical.id)}/duplicate`);
    hashAfterRefusals = sha256(temporary.dataFile);
  } catch (error) {
    executionError = error;
  } finally {
    await temporary.stop();
  }

  await context.test("la donnée canonique et les brouillons existants restent inchangés", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
    for (const [id, original] of originals) assert.deepEqual(afterDraft.activities.find(activity => activity.id === id), original);
    assert.deepEqual(afterDraft.activities.find(activity => activity.title === "MboloTest"), originals.get(mbolo.id));
    assert.deepEqual(afterDraft.activities.find(activity => activity.title === "Lbinz"), originals.get(lbinz.id));
  });

  if (executionError) {
    await temporary.cleanup();
    throw executionError;
  }

  const historicalCopy = historicalPayload.activity;
  const draftCopy = draftPayload.activity;
  await context.test("l’activité historique est dupliquée avec un identifiant et un titre explicites", () => {
    assert.equal(historicalResponse.status, 201);
    assert.notEqual(historicalCopy.id, fixtureHistorical.id);
    assert.match(historicalCopy.id, /^proto05-copy-/);
    assert.equal(historicalCopy.title, `Copie de ${fixtureHistorical.title}`);
    assert.equal(historicalCopy.description, fixtureHistorical.description);
    assert.equal(historicalCopy.instruction, fixtureHistorical.instruction);
    assert.equal(historicalCopy.pedagogicalQuestion, fixtureHistorical.pedagogicalQuestion);
    assert.equal(historicalCopy.status, "draft");
    assert.deepEqual(historicalCopy.video, fixtureHistorical.video);
  });

  await context.test("les volumes et données auteur historiques sont copiés", () => {
    assert.deepEqual({
      segments: historicalCopy.segments.length,
      languageIntervals: historicalCopy.languageIntervals.length,
      phenomena: historicalCopy.phenomena.length,
      layers: historicalCopy.layers.length,
      languages: historicalCopy.languages.length,
      speakers: historicalCopy.speakers.length,
      teacherAnnotations: historicalCopy.teacherAnnotations.length
    }, { segments: 11, languageIntervals: 22, phenomena: 26, layers: 7, languages: 4, speakers: 5, teacherAnnotations: 11 });
    assert.deepEqual(authoredData(normalizeCopy(historicalCopy, fixtureHistorical)), authoredData(fixtureHistorical));
  });

  await context.test("les identifiants internes locaux sont régénérés et les langues partagées restent stables", () => {
    const sourceIds = new Set(allInternalIds(fixtureHistorical));
    const copyIds = allInternalIds(historicalCopy);
    assert.equal(new Set(copyIds).size, copyIds.length);
    assert.ok(copyIds.every(id => !sourceIds.has(id)));
    assert.ok(copyIds.every(id => id.includes(historicalCopy.id)));
    assert.deepEqual(historicalCopy.languages, fixtureHistorical.languages);
    assert.deepEqual(historicalCopy.languages.map(language => language.id), ["fr", "es", "it", "pt"]);
  });

  await context.test("les observations étudiantes ne sont jamais copiées", () => {
    assert.ok(fixtureHistorical.studentObservations.length);
    for (const key of ["studentObservations", "learnerObservations", "observations"]) assert.equal(key in historicalCopy, false);
  });

  await context.test("un brouillon existant peut être dupliqué indépendamment", () => {
    assert.equal(draftResponse.status, 201);
    assert.notEqual(draftCopy.id, mbolo.id);
    assert.notEqual(draftCopy.id, historicalCopy.id);
    assert.equal(draftCopy.title, `Copie de ${emptyCopyCandidate.title}`);
    assert.equal(draftCopy.description, emptyCopyCandidate.description);
    assert.equal(draftCopy.instruction, emptyCopyCandidate.instruction);
    assert.equal(draftCopy.pedagogicalQuestion, emptyCopyCandidate.pedagogicalQuestion);
    assert.deepEqual(authoredData(normalizeCopy(draftCopy, emptyCopyCandidate)), authoredData(emptyCopyCandidate));
  });

  await context.test("l’original reste strictement inchangé après chaque duplication", () => {
    assert.deepEqual(afterHistorical.activities.find(activity => activity.id === historical.id), originals.get(historical.id));
    assert.deepEqual(afterDraft.activities.find(activity => activity.id === historical.id), originals.get(historical.id));
    assert.deepEqual(afterDraft.activities.find(activity => activity.id === mbolo.id), originals.get(mbolo.id));
  });

  await context.test("les activités inconnues et les sources invalides sont refusées sans écriture", async () => {
    assert.equal(unknownResponse.status, 404);
    assert.match((await unknownResponse.json()).error, /introuvable/i);
    assert.equal(invalidResponse.status, 400);
    assert.match((await invalidResponse.json()).error, /identifiant.*segments/i);
    assert.equal(invalidMethodResponse.status, 405);
    assert.equal(invalidMethodResponse.headers.get("allow"), "POST");
    assert.equal(hashAfterRefusals, hashBeforeRefusals);
  });

  await context.test("la sauvegarde atomique conserve une sauvegarde cohérente", () => {
    assert.deepEqual(historicalBackup, initialStore);
    assert.deepEqual(draftBackup, afterHistorical);
    assert.equal(afterDraft.activities.length, initialStore.activities.length + 2);
  });

  await temporary.cleanup();
});
