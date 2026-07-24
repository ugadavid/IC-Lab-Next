"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findChromium, readBrowserResults, runChromium, sha256 } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");
const video = {
  id: "video-proto05-uga-37004",
  title: "Vidéo augmentée IC — source UGA",
  kind: "hls",
  proxyUrl: "/api/hls/uga-37004/livestream.m3u8",
  durationMs: 939217
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validActivity(id = "validation-fixture") {
  return {
    id,
    version: "0.1.0",
    status: "draft",
    title: "Fixture valide",
    description: "",
    instruction: "",
    pedagogicalQuestion: "",
    video: clone(video),
    transcription: { id: `transcription-${id}`, languageId: "fr", segmentIds: ["segment-1"] },
    segments: [{ id: "segment-1", startMs: 0, endMs: 1000, text: "Segment", speakerIds: ["speaker-1"], languageIds: ["fr"], phenomenonIds: ["phenomenon-1"] }],
    speakers: [{ id: "speaker-1", label: "Locuteur" }],
    languages: [{ id: "fr", code: "FR", label: "Français" }],
    languageIntervals: [{ id: "interval-1", languageId: "fr", segmentId: "segment-1", startMs: 0, endMs: 1000 }],
    layers: [{ id: "layer-1", label: "Couche", description: "", color: "#6d9ed1" }],
    phenomena: [{ id: "phenomenon-1", segmentId: "segment-1", layerId: "layer-1", startMs: 0, endMs: 1000 }],
    teacherAnnotations: [{ id: "annotation-1", segmentId: "segment-1", note: "", pedagogicalQuestion: "" }],
    overlays: [],
    layerConfiguration: {
      id: `layer-config-${id}`,
      defaultVisibleLayerIds: ["layer-1"],
      learnerVisibleLayerIds: ["layer-1"],
      teacherVisibleLayerIds: ["layer-1"],
      allowLearnerToggle: true
    }
  };
}

function authoringPayload(activity) {
  return {
    title: activity.title,
    description: activity.description,
    instruction: activity.instruction,
    pedagogicalQuestion: activity.pedagogicalQuestion,
    videoId: activity.video.id,
    videoRef: activity.videoRef,
    segments: activity.segments,
    languages: activity.languages,
    languageIntervals: activity.languageIntervals,
    phenomena: activity.phenomena,
    layers: activity.layers,
    teacherAnnotations: activity.teacherAnnotations,
    overlays: activity.overlays || [],
    layerConfiguration: activity.layerConfiguration
  };
}

test("création vide et validation d’intégrité sur serveur temporaire", { timeout: 20000 }, async context => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const legacyOrphan = validActivity("legacy-orphan");
  legacyOrphan.languages = [];
  legacyOrphan.transcription.languageId = "lang-fr";
  legacyOrphan.transcription.segmentIds = [];
  legacyOrphan.segments = [];
  legacyOrphan.speakers = [];
  legacyOrphan.languageIntervals = [];
  legacyOrphan.layers = [];
  legacyOrphan.phenomena = [];
  legacyOrphan.teacherAnnotations = [];
  legacyOrphan.layerConfiguration = {
    id: "layer-config-legacy-orphan",
    defaultVisibleLayerIds: [],
    learnerVisibleLayerIds: [],
    teacherVisibleLayerIds: [],
    allowLearnerToggle: true
  };
  const valid = validActivity();
  const initialStore = { schemaVersion: "0.1", updatedAt: "test-only", activities: [valid, legacyOrphan] };
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-empty-validation-");
  const authorPath = `/api/proto05/activities/${valid.id}/authoring`;
  const rejected = [];
  let createdResponse;
  let createdPayload;
  let savedResponse;
  let savedPayload;
  let persisted;
  let backup;
  let hashBeforeRejections;
  let hashAfterRejections;
  let executionError;

  const putAuthoring = async payload => fetch(`${temporary.baseUrl}${authorPath}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const rejectMutation = async (label, mutate) => {
    const activity = validActivity();
    mutate(activity);
    const response = await putAuthoring(authoringPayload(activity));
    rejected.push({ label, status: response.status, payload: await response.json() });
  };

  try {
    createdResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Brouillon vide", description: "", videoId: video.id })
    });
    createdPayload = await createdResponse.json();
    const empty = createdPayload.activity;
    savedResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(empty.id)}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(authoringPayload(empty))
    });
    savedPayload = await savedResponse.json();
    persisted = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    backup = JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8"));

    hashBeforeRejections = sha256(temporary.dataFile);
    await rejectMutation("langue", activity => { activity.segments[0].languageIds = ["language-missing"]; });
    await rejectMutation("locuteur", activity => { activity.segments[0].speakerIds = ["speaker-missing"]; });
    await rejectMutation("segment", activity => { activity.phenomena[0].segmentId = "segment-missing"; });
    await rejectMutation("couche", activity => { activity.phenomena[0].layerId = "layer-missing"; });
    await rejectMutation("phénomène", activity => { activity.segments[0].phenomenonIds = ["phenomenon-missing"]; });
    await rejectMutation("doublon", activity => { activity.languages.push(clone(activity.languages[0])); });
    await rejectMutation("cohérence", activity => { activity.segments[0].phenomenonIds = []; });
    await rejectMutation("configuration", activity => { activity.layerConfiguration.learnerVisibleLayerIds = []; });
    const legacyResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${legacyOrphan.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: legacyOrphan.title })
    });
    rejected.push({ label: "transcription", status: legacyResponse.status, payload: await legacyResponse.json() });
    hashAfterRejections = sha256(temporary.dataFile);
  } catch (error) {
    executionError = error;
  } finally {
    await temporary.stop();
  }

  await context.test("le brouillon créé ne contient aucune référence orpheline", () => {
    assert.equal(createdResponse.status, 201);
    const activity = createdPayload.activity;
    assert.equal(activity.transcription.languageId, null);
    assert.deepEqual(activity.transcription.segmentIds, []);
    for (const key of ["segments", "speakers", "languages", "languageIntervals", "layers", "phenomena", "teacherAnnotations"]) assert.deepEqual(activity[key], []);
    assert.deepEqual(activity.layerConfiguration.defaultVisibleLayerIds, []);
    assert.deepEqual(activity.layerConfiguration.learnerVisibleLayerIds, []);
    assert.deepEqual(activity.layerConfiguration.teacherVisibleLayerIds, []);
  });

  if (executionError) {
    await temporary.cleanup();
    throw executionError;
  }

  await context.test("le brouillon vide est sauvegardable sans enrichissement fictif", () => {
    assert.equal(savedResponse.status, 200);
    assert.deepEqual(savedPayload.activity, createdPayload.activity);
    const stored = clone(createdPayload.activity);
    delete stored.videoSource;
    delete stored.videoRef;
    const persistedActivity = clone(persisted.activities.find(activity => activity.id === createdPayload.activity.id));
    const backupActivity = clone(backup.activities.find(activity => activity.id === createdPayload.activity.id));
    delete persistedActivity.videoRef;
    delete backupActivity.videoRef;
    assert.deepEqual(persistedActivity, stored);
    assert.deepEqual(backupActivity, stored);
  });

  await context.test("les références inexistantes sont refusées avec un diagnostic ciblé", () => {
    for (const label of ["langue", "locuteur", "segment", "couche", "phénomène"]) {
      const result = rejected.find(item => item.label === label);
      assert.equal(result.status, 400);
      assert.match(result.payload.error, new RegExp(label, "i"));
      if (label === "phénomène") assert.match(result.payload.error, /références de phénomène incohérentes/i);
      else assert.match(result.payload.error, /inexistant/i);
    }
  });

  await context.test("les identifiants dupliqués sont refusés", () => {
    const result = rejected.find(item => item.label === "doublon");
    assert.equal(result.status, 400);
    assert.match(result.payload.error, /identifiant dupliqué/i);
  });

  await context.test("les références de phénomènes incohérentes sont refusées", () => {
    const result = rejected.find(item => item.label === "cohérence");
    assert.equal(result.status, 400);
    assert.match(result.payload.error, /références de phénomène incohérentes/i);
  });

  await context.test("les configurations de couches invalides sont refusées", () => {
    const result = rejected.find(item => item.label === "configuration");
    assert.equal(result.status, 400);
    assert.match(result.payload.error, /visibles par défaut.*visibles par les étudiants/i);
  });

  await context.test("une transcription orpheline historique est détectée sans réécriture", () => {
    const result = rejected.find(item => item.label === "transcription");
    assert.equal(result.status, 400);
    assert.match(result.payload.error, /transcription.*langue inexistante/i);
  });

  await context.test("tous les refus laissent la fixture temporaire inchangée", () => {
    assert.equal(hashAfterRejections, hashBeforeRejections);
  });

  await context.test("la donnée canonique reste strictement inchangée", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });

  await temporary.cleanup();
});

function chromiumRunnerPage() {
  return `<!doctype html><html><body data-test-state="running"><iframe id="flow" src="/teacher/create"></iframe><script>
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 7000;
    while (Date.now() < deadline) {
      try { if (predicate()) return; } catch {}
      await pause(25);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  (async () => {
    const frame = document.getElementById('flow');
      await waitFor(() => frame.contentDocument?.querySelector('#assets .asset .select'), 'catalogue vidéo de création');
      const createDocument = frame.contentDocument;
      createDocument.querySelector('#title').value = 'Brouillon Chromium';
      createDocument.querySelector('#assets .asset .select').click();
      await waitFor(() => !createDocument.querySelector('#create').disabled, 'sélection vidéo');
      const selection = JSON.parse(frame.contentWindow.eval('JSON.stringify({assetId:state.assetId,playableId:state.playableId})'));
      const created = await fetch('/api/proto05/activities', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({title:createDocument.querySelector('#title').value,description:'',videoId:'video-proto05-uga-37004'})});
      const createdPayload = await created.json();
      frame.contentWindow.location.href = '/teacher/guided/' + encodeURIComponent(createdPayload.activity.id);
      await waitFor(() => frame.contentDocument?.querySelector('#save'), 'redirection vers atelier guidé');
    await waitFor(() => frame.contentWindow.eval('Boolean(state.activity)') && frame.contentDocument.querySelector('#save'), 'chargement du brouillon');
    const authorDocument = frame.contentDocument;
    const initial = JSON.parse(frame.contentWindow.eval('JSON.stringify(state.activity)'));
    authorDocument.querySelector('#save').click();
      await waitFor(() => authorDocument.querySelector('#status').textContent.includes('Modifications enregistrées.'), 'confirmation de sauvegarde');
    const response = await fetch('/api/proto05/activities/' + encodeURIComponent(initial.id));
    const saved = (await response.json()).activity;
    const results = {
      pathname: frame.contentWindow.location.pathname,
      heading: authorDocument.querySelector('h1').textContent,
      status: authorDocument.querySelector('#status').textContent,
      initial,
      saved,
      viewport: [innerWidth, innerHeight],
      authorWidth: authorDocument.documentElement.scrollWidth
    };
    document.body.dataset.results = encodeURIComponent(JSON.stringify(results));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`;
}

test("parcours Chromium de création puis sauvegarde d’un brouillon vide", { timeout: 30000 }, async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la validation du parcours de brouillon vide.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const temporary = await startTemporaryProto05Server({ schemaVersion: "0.1", updatedAt: "test-only", activities: [] }, "proto05-empty-chromium-");
  const runnerFile = path.join(temporary.root, "prototype", "empty-draft-runner.html");
  fs.writeFileSync(runnerFile, chromiumRunnerPage(), "utf8");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-empty-chromium-profile-"));
  let results;
  let browserError;
  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/empty-draft-runner.html`, profileDirectory, { virtualTimeBudget: 12000, timeout: 22000, windowSize: "1440,1000" });
    results = readBrowserResults(dom);
  } catch (error) {
    browserError = error;
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.stop();
  }

  await context.test("la donnée canonique reste inchangée pendant Chromium", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });
  if (browserError) {
    await temporary.cleanup();
    throw browserError;
  }

  await context.test("le parcours atteint l’atelier auteur sans erreur visible", () => {
    assert.match(results.pathname, /^\/teacher\/guided\/proto05-draft-/);
    assert.equal(results.heading, "Brouillon Chromium");
    assert.equal(results.status, "Modifications enregistrées.");
    assert.ok(results.viewport[0] >= 1400 && results.viewport[1] >= 800, `Viewport Chromium inattendu : ${results.viewport.join("×")}.`);
    assert.ok(results.authorWidth <= results.viewport[0], `La page déborde horizontalement (${results.authorWidth}px pour ${results.viewport[0]}px).`);
  });

  await context.test("Chromium sauvegarde exactement le brouillon vide initialisé", () => {
    assert.equal(results.initial.transcription.languageId, null);
    assert.deepEqual(results.initial, results.saved);
    for (const key of ["segments", "speakers", "languages", "languageIntervals", "layers", "phenomena", "teacherAnnotations"]) assert.deepEqual(results.saved[key], []);
  });

  await temporary.cleanup();
});
