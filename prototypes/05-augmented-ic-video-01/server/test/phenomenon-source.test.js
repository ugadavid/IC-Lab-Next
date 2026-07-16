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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalStore() {
  return JSON.parse(fs.readFileSync(canonicalDataFile, "utf8"));
}

function historical(store) {
  return store.activities.find(activity => activity.id === "proto05-augmented-video-01");
}

function authoringPayload(activity) {
  return {
    title: activity.title,
    description: activity.description,
    instruction: activity.instruction,
    pedagogicalQuestion: activity.pedagogicalQuestion,
    videoId: activity.video.id,
    segments: activity.segments,
    languages: activity.languages,
    languageIntervals: activity.languageIntervals,
    phenomena: activity.phenomena,
    layers: activity.layers,
    teacherAnnotations: activity.teacherAnnotations,
    layerConfiguration: activity.layerConfiguration
  };
}

function syncDerivedPhenomenonIds(activity) {
  for (const segment of activity.segments) {
    segment.phenomenonIds = activity.phenomena
      .filter(phenomenon => phenomenon.segmentId === segment.id)
      .map(phenomenon => phenomenon.id);
  }
}

function assertRelationsDerived(activity) {
  for (const segment of activity.segments) {
    const expected = activity.phenomena.filter(phenomenon => phenomenon.segmentId === segment.id).map(phenomenon => phenomenon.id).sort();
    assert.deepEqual([...(segment.phenomenonIds || [])].sort(), expected, `Cache dérivé incohérent pour ${segment.id}.`);
  }
}

function chromiumRunnerPage(activityId) {
  return `<!doctype html><html><body data-test-state="running"><iframe id="guided" src="/teacher/guided/${encodeURIComponent(activityId)}"></iframe><script>
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 9000;
    while (Date.now() < deadline) {
      try { if (predicate()) return; } catch {}
      await pause(25);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  (async () => {
    const guided = document.getElementById('guided');
    await waitFor(() => guided.contentDocument?.querySelectorAll('#timeline [data-ic-type="phenomenon"]').length === 26, 'timeline historique');
    const documentGuided = guided.contentDocument;
    const initialMarkers = documentGuided.querySelectorAll('#timeline [data-ic-type="phenomenon"]').length;
    const firstSegment = documentGuided.querySelector('#segments [data-type="segment"]');
    const initialSegmentCount = Number(firstSegment.dataset.phenomenonCount);
    firstSegment.click();
    documentGuided.querySelector('#addPhenomenon').click();
    await waitFor(() => documentGuided.querySelectorAll('#timeline [data-ic-type="phenomenon"]').length === 27, 'ajout immédiat dans la timeline');
    const afterSegmentCount = Number(documentGuided.querySelector('#segments [data-type="segment"]').dataset.phenomenonCount);
    const stateAfterAdd = guided.contentWindow.eval('state.activity');
    const added = stateAfterAdd.phenomena[stateAfterAdd.phenomena.length - 1];
    documentGuided.querySelector('#save').click();
    await waitFor(() => documentGuided.querySelector('#status').textContent.includes('Modifications enregistrées.'), 'sauvegarde guidée');
    const student = document.createElement('iframe');
    student.id = 'student';
    student.src = '/student/${encodeURIComponent(activityId)}';
    document.body.append(student);
    await waitFor(() => student.contentDocument?.querySelectorAll('#sharedTimelineMount [data-ic-type="phenomenon"]').length === 27, 'vue étudiante actualisée');
    const saved = (await (await fetch('/api/proto05/activities/${encodeURIComponent(activityId)}')).json()).activity;
    const savedSegment = saved.segments.find(segment => segment.id === added.segmentId);
    const results = {
      initialMarkers,
      afterMarkers: documentGuided.querySelectorAll('#timeline [data-ic-type="phenomenon"]').length,
      initialSegmentCount,
      afterSegmentCount,
      added,
      savedPhenomena: saved.phenomena.length,
      savedSegmentPhenomenonIds: savedSegment.phenomenonIds,
      studentMarkers: student.contentDocument.querySelectorAll('#sharedTimelineMount [data-ic-type="phenomenon"]').length,
      studentFirstSegmentTags: student.contentDocument.querySelectorAll('#transcriptList .segment:first-child .mini-tags .tag').length,
      viewport: [innerWidth, innerHeight]
    };
    document.body.dataset.results = encodeURIComponent(JSON.stringify(results));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`;
}

test("Chromium ajoute un phénomène et synchronise immédiatement timeline et transcription", { timeout: 30000 }, async () => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la recette ciblée.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const activity = historical(store);
  const temporary = await startTemporaryProto05Server(store, "proto05-phenomenon-add-");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-phenomenon-add-profile-"));
  fs.writeFileSync(path.join(temporary.root, "prototype", "phenomenon-runner.html"), chromiumRunnerPage(activity.id), "utf8");
  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/phenomenon-runner.html`, profileDirectory, {
      virtualTimeBudget: 14000,
      timeout: 24000,
      windowSize: "1440,1000"
    });
    const results = readBrowserResults(dom);
    assert.equal(results.initialMarkers, 26);
    assert.equal(results.afterMarkers, 27);
    assert.equal(results.initialSegmentCount, 2);
    assert.equal(results.afterSegmentCount, 3);
    assert.equal(results.savedPhenomena, 27);
    assert.ok(results.savedSegmentPhenomenonIds.includes(results.added.id));
    assert.equal(results.studentMarkers, 27);
    assert.equal(results.studentFirstSegmentTags, 3);
    assert.ok(results.viewport[0] >= 1400 && results.viewport[1] >= 800);
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.cleanup();
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

test("la suppression d’un phénomène met à jour le cache dérivé et sauvegarde la source", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const activity = historical(store);
  const removed = activity.phenomena[0];
  activity.phenomena = activity.phenomena.filter(phenomenon => phenomenon.id !== removed.id);
  syncDerivedPhenomenonIds(activity);
  const temporary = await startTemporaryProto05Server(store, "proto05-phenomenon-delete-");
  try {
    const response = await fetch(`${temporary.baseUrl}/api/proto05/activities/${activity.id}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(authoringPayload(activity))
    });
    assert.equal(response.status, 200);
    const saved = (await response.json()).activity;
    assert.equal(saved.phenomena.some(phenomenon => phenomenon.id === removed.id), false);
    assertRelationsDerived(saved);
  } finally {
    await temporary.cleanup();
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

test("la duplication reconstruit la relation depuis phenomena[].segmentId", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const activity = historical(store);
  const temporary = await startTemporaryProto05Server(store, "proto05-phenomenon-duplicate-");
  try {
    const response = await fetch(`${temporary.baseUrl}/api/proto05/activities/${activity.id}/duplicate`, { method: "POST" });
    assert.equal(response.status, 201);
    const duplicate = (await response.json()).activity;
    assert.equal(duplicate.phenomena.length, activity.phenomena.length);
    assertRelationsDerived(duplicate);
    for (const phenomenon of duplicate.phenomena) assert.ok(duplicate.segments.some(segment => segment.id === phenomenon.segmentId));
  } finally {
    await temporary.cleanup();
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

test("Original_copy reste intacte et toute écriture incohérente est refusée", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const originalCopy = store.activities.find(activity => activity.title === "Original_copy");
  assert.ok(originalCopy, "Original_copy doit être présente.");
  const temporary = await startTemporaryProto05Server(clone(store), "proto05-phenomenon-invalid-");
  const temporaryHashBefore = sha256(temporary.dataFile);
  try {
    const response = await fetch(`${temporary.baseUrl}/api/proto05/activities/${originalCopy.id}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(authoringPayload(originalCopy))
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.match(payload.error, /phenomenonIds dérivés attendus=.*source de vérité est phenomena\[\]\.segmentId/i);
    assert.equal(sha256(temporary.dataFile), temporaryHashBefore);

    const duplicateResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${originalCopy.id}/duplicate`, { method: "POST" });
    assert.equal(duplicateResponse.status, 400);
    assert.equal(sha256(temporary.dataFile), temporaryHashBefore);
  } finally {
    await temporary.cleanup();
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});
