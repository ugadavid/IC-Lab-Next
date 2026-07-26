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

function canonicalState() {
  const store = JSON.parse(fs.readFileSync(canonicalDataFile, "utf8"));
  assert.equal(store.activities.length, 7, "Les sept activités courantes doivent être présentes.");
  assert.ok(store.activities.find(activity => activity.id === "proto05-augmented-video-01"));
  assert.ok(store.activities.find(activity => activity.title === "brouillon_vide"));
  return store;
}

function speakerSnapshot(store) {
  return store.activities.map(activity => ({ id: activity.id, speakers: clone(activity.speakers) }));
}

function authoringPayload(activity) {
  return {
    title: activity.title,
    description: activity.description,
    instruction: activity.instruction,
    pedagogicalQuestion: activity.pedagogicalQuestion,
    videoId: activity.video.id,
    videoRef: activity.videoRef,
    segments: clone(activity.segments),
    speakers: clone(activity.speakers),
    languages: clone(activity.languages),
    languageIntervals: clone(activity.languageIntervals),
    phenomena: clone(activity.phenomena),
    layers: clone(activity.layers),
    teacherAnnotations: clone(activity.teacherAnnotations),
    layerConfiguration: clone(activity.layerConfiguration)
  };
}

async function saveAuthoring(temporary, activityId, payload) {
  return fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

test("création d’un locuteur local et association à un segment après rechargement", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = canonicalState();
  const initialSpeakers = speakerSnapshot(initialStore);
  const draft = initialStore.activities.find(activity => activity.title === "brouillon_vide");
  const temporary = await startTemporaryProto05Server(clone(initialStore), "proto05-speaker-create-");

  try {
    const duplicatePayload = authoringPayload(draft);
    duplicatePayload.speakers = [
      { id: "speaker-local-test", label: "Locutrice test" },
      { id: "speaker-local-test", label: "Doublon" }
    ];
    const hashBeforeDuplicate = sha256(temporary.dataFile);
    const duplicateResponse = await saveAuthoring(temporary, draft.id, duplicatePayload);
    assert.equal(duplicateResponse.status, 400);
    assert.match((await duplicateResponse.json()).error, /identifiant.*dupliqué.*speakers/i);
    assert.equal(sha256(temporary.dataFile), hashBeforeDuplicate);

    const payload = authoringPayload(draft);
    payload.speakers.push({ id: "speaker-local-test", label: "Locutrice test" });
    payload.segments.push({
      id: "segment-speaker-test",
      startMs: 1000,
      endMs: 2000,
      text: "Segment associé au locuteur",
      speakerIds: ["speaker-local-test"],
      languageIds: [],
      phenomenonIds: []
    });
    const response = await saveAuthoring(temporary, draft.id, payload);
    assert.equal(response.status, 200);

    const reloadedResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(draft.id)}`);
    const reloaded = (await reloadedResponse.json()).activity;
    assert.deepEqual(reloaded.speakers, [{ id: "speaker-local-test", label: "Locutrice test" }]);
    assert.deepEqual(reloaded.segments[0].speakerIds, ["speaker-local-test"]);

    const withUnusedPayload = authoringPayload(reloaded);
    withUnusedPayload.speakers.push({ id: "speaker-unused-test", label: "Locuteur inutilisé" });
    const withUnusedResponse = await saveAuthoring(temporary, draft.id, withUnusedPayload);
    assert.equal(withUnusedResponse.status, 200);
    const withUnused = (await withUnusedResponse.json()).activity;
    const withoutUnusedPayload = authoringPayload(withUnused);
    withoutUnusedPayload.speakers = withoutUnusedPayload.speakers.filter(speaker => speaker.id !== "speaker-unused-test");
    const withoutUnusedResponse = await saveAuthoring(temporary, draft.id, withoutUnusedPayload);
    assert.equal(withoutUnusedResponse.status, 200);
    const withoutUnused = (await withoutUnusedResponse.json()).activity;
    assert.deepEqual(withoutUnused.speakers, [{ id: "speaker-local-test", label: "Locutrice test" }]);
    assert.deepEqual(withoutUnused.segments[0].speakerIds, ["speaker-local-test"]);
    const storedWithUnused = clone(withUnused);
    delete storedWithUnused.videoSource;
    delete storedWithUnused.pedagogicalIdentitySummary;
    assert.deepEqual(JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8")).activities.find(activity => activity.id === draft.id), storedWithUnused);
  } finally {
    await temporary.cleanup();
  }

  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  assert.deepEqual(speakerSnapshot(canonicalState()), initialSpeakers);
});

test("modification du libellé et duplication conservent puis remappent les références", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = canonicalState();
  const initialSpeakers = speakerSnapshot(initialStore);
  const historical = initialStore.activities.find(activity => activity.id === "proto05-augmented-video-01");
  const originalSpeakerId = historical.speakers[0].id;
  const temporary = await startTemporaryProto05Server(clone(initialStore), "proto05-speaker-update-");

  try {
    const payload = authoringPayload(historical);
    payload.speakers[0].label = "Présentatrice principale";
    const updateResponse = await saveAuthoring(temporary, historical.id, payload);
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()).activity;
    assert.equal(updated.speakers[0].id, originalSpeakerId);
    assert.equal(updated.speakers[0].label, "Présentatrice principale");
    assert.ok(updated.segments.some(segment => segment.speakerIds.includes(originalSpeakerId)));

    const duplicateResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(historical.id)}/duplicate`, { method: "POST" });
    assert.equal(duplicateResponse.status, 201);
    const copy = (await duplicateResponse.json()).activity;
    const speakerIdMap = new Map(updated.speakers.map((speaker, index) => [speaker.id, copy.speakers[index].id]));
    assert.deepEqual(copy.speakers.map(speaker => speaker.label), updated.speakers.map(speaker => speaker.label));
    assert.ok(copy.speakers.every((speaker, index) => speaker.id !== updated.speakers[index].id));
    updated.segments.forEach((segment, index) => {
      assert.deepEqual(copy.segments[index].speakerIds, segment.speakerIds.map(id => speakerIdMap.get(id)));
    });
  } finally {
    await temporary.cleanup();
  }

  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  assert.deepEqual(speakerSnapshot(canonicalState()), initialSpeakers);
});

test("suppression d’un locuteur utilisé et références inconnues sont refusées sans écriture", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = canonicalState();
  const historical = initialStore.activities.find(activity => activity.id === "proto05-augmented-video-01");
  const usedSpeakerId = historical.segments.flatMap(segment => segment.speakerIds)[0];
  const temporary = await startTemporaryProto05Server(clone(initialStore), "proto05-speaker-refusals-");

  try {
    const temporaryHashBefore = sha256(temporary.dataFile);
    const removalPayload = authoringPayload(historical);
    removalPayload.speakers = removalPayload.speakers.filter(speaker => speaker.id !== usedSpeakerId);
    const removalResponse = await saveAuthoring(temporary, historical.id, removalPayload);
    assert.equal(removalResponse.status, 400);
    assert.match((await removalResponse.json()).error, /segment.*locuteurs.*inexistant/i);

    const unknownSegmentPayload = authoringPayload(historical);
    unknownSegmentPayload.segments[0].speakerIds = ["speaker-inconnu"];
    const unknownSegmentResponse = await saveAuthoring(temporary, historical.id, unknownSegmentPayload);
    assert.equal(unknownSegmentResponse.status, 400);
    assert.match((await unknownSegmentResponse.json()).error, /segment.*locuteurs.*inexistant/i);

    const unknownAnnotationPayload = authoringPayload(historical);
    unknownAnnotationPayload.teacherAnnotations[0].speakerIds = ["speaker-inconnu"];
    const unknownAnnotationResponse = await saveAuthoring(temporary, historical.id, unknownAnnotationPayload);
    assert.equal(unknownAnnotationResponse.status, 400);
    assert.match((await unknownAnnotationResponse.json()).error, /annotation.*locuteurs.*inexistant/i);

    assert.equal(sha256(temporary.dataFile), temporaryHashBefore);
    assert.equal(fs.existsSync(`${temporary.dataFile}.bak`), false);
  } finally {
    await temporary.cleanup();
  }

  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

function chromiumRunnerPage(activityId) {
  return `<!doctype html><html lang="fr"><body data-test-state="running"><iframe id="flow" src="/teacher/guided/${activityId}"></iframe><script>
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      try { const value = predicate(); if (value) return value; } catch {}
      await pause(25);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  (async () => {
    const frame = document.getElementById('flow');
    await waitFor(() => frame.contentDocument?.querySelector('#save') && frame.contentWindow.eval('Boolean(state.activity)'), 'chargement de l’atelier guidé');
    const guidedDocument = frame.contentDocument;
    guidedDocument.querySelector('[data-speaker-create]').click();
    guidedDocument.querySelector('#guidedEditorSpeakerName').value = 'Locutrice initiale';
    guidedDocument.querySelector('#guidedEditorApply').click();
    const speakerRow = await waitFor(() => guidedDocument.querySelector('[data-speaker-id]'), 'création du locuteur');
    speakerRow.querySelector('[data-speaker-edit]').click();
    await waitFor(() => guidedDocument.querySelector('#guidedEditorSpeakerName'), 'ouverture du nom du locuteur');
    guidedDocument.querySelector('#guidedEditorSpeakerName').value = 'Locutrice Chromium';
    guidedDocument.querySelector('#guidedEditorApply').click();
    await waitFor(() => guidedDocument.querySelector('[data-speaker-id] strong')?.textContent === 'Locutrice Chromium', 'modification du nom');
    const generatedId = frame.contentWindow.eval('state.activity.speakers[0].id');

    frame.contentWindow.eval('addSegment(); render()');
    const createdSegment = await waitFor(() => guidedDocument.querySelector('#segments [data-type="segment"]'), 'création du segment');
    createdSegment.click();
    await waitFor(() => guidedDocument.querySelector('#sp'), 'sélection du segment');
    guidedDocument.querySelector('#et').value = 'Segment créé dans Chromium guidé';
    const speakerPicker = guidedDocument.querySelector('#sp');
    speakerPicker.options[0].selected = true;
    speakerPicker.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true }));
    guidedDocument.querySelector('#apply').click();
    guidedDocument.querySelector('[data-speaker-id] [data-speaker-edit]').click();
    guidedDocument.querySelector('#guidedEditorRemove').click();
    const refusalMessage = guidedDocument.querySelector('#status').textContent;
    const speakerStillPresent = Boolean(guidedDocument.querySelector('[data-speaker-id]'));
    const idVisibleBeforeSave = guidedDocument.body.innerText.includes(generatedId);
    guidedDocument.querySelector('#save').click();
    await waitFor(() => guidedDocument.querySelector('#status').textContent === 'Modifications enregistrées.', 'sauvegarde du brouillon');
    const saveStatus = guidedDocument.querySelector('#status').textContent;

    const reload = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    frame.contentWindow.location.reload();
    await reload;
    await waitFor(() => frame.contentDocument?.querySelector('[data-speaker-id]') && frame.contentDocument.querySelector('#segments [data-type="segment"]'), 'rechargement des données guidées');
    const reloadedGuidedDocument = frame.contentDocument;
    reloadedGuidedDocument.querySelector('#segments [data-type="segment"]').click();
    const reloadedPicker = await waitFor(() => reloadedGuidedDocument.querySelector('#sp'), 'réouverture du segment');
    const saved = (await (await fetch('/api/proto05/activities/${activityId}')).json()).activity;
    const guidedIdVisibleAfterReload = reloadedGuidedDocument.body.innerText.includes(generatedId);

    const advancedLoad = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    frame.contentWindow.location.href = '/teacher/author/${activityId}';
    await advancedLoad;
    await waitFor(() => frame.contentDocument?.querySelector('#newSpeakerLabel') && frame.contentWindow.eval('Boolean(state.activity)'), 'chargement de l’atelier guidé');
    const advancedDocument = frame.contentDocument;
    const advancedExistingIdVisible = advancedDocument.body.innerText.includes(generatedId);
    const advancedTechnicalInputPresent = Boolean(advancedDocument.querySelector('#newSpeakerId, [aria-label="Identifiant du locuteur"]'));
    advancedDocument.querySelector('#newSpeakerId')?.setAttribute('value', 'speaker-advanced-test');
    advancedDocument.querySelector('#newSpeakerLabel')?.setAttribute('value', 'Locuteur avancé');
    advancedDocument.querySelector('#addSpeaker')?.click();
    const advancedGeneratedId = 'speaker-advanced-test';
    const advancedGeneratedIdVisible = advancedDocument.body.innerText.includes(advancedGeneratedId);
    const results = {
      refusalMessage,
      speakerStillPresent,
      saveStatus,
      generatedId,
      stableId: saved.speakers[0].id,
      speakerLabel: reloadedGuidedDocument.querySelector('[data-speaker-id] strong').textContent,
      speakerControl: reloadedPicker.tagName,
      speakerMultiple: reloadedPicker.multiple,
      selectedSpeakerIds: [...reloadedPicker.selectedOptions].map(option => option.value),
      segmentText: reloadedGuidedDocument.querySelector('#et').value,
      idVisibleBeforeSave,
      guidedIdVisibleAfterReload,
      advancedExistingIdVisible,
      advancedTechnicalInputPresent,
      advancedGeneratedId,
      advancedGeneratedIdVisible,
      guidedVisibleName: reloadedGuidedDocument.querySelector('[data-speaker-id] strong').textContent,
      saved,
      viewport: [innerWidth, innerHeight],
      guidedWidth: reloadedGuidedDocument.documentElement.scrollWidth,
      advancedWidth: advancedDocument.documentElement.scrollWidth
    };
    document.body.dataset.results = encodeURIComponent(JSON.stringify(results));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  <\/script></body></html>`;
}

test("Chromium gère, associe, sauvegarde et recharge un locuteur dans l’atelier guidé", { timeout: 30000 }, async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la recette ciblée.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = canonicalState();
  const initialSpeakers = speakerSnapshot(initialStore);
  const draft = initialStore.activities.find(activity => activity.title === "MboloTest");
  const temporary = await startTemporaryProto05Server(clone(initialStore), "proto05-speaker-chromium-");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-speaker-chromium-profile-"));
  fs.writeFileSync(path.join(temporary.root, "prototype", "speaker-runner.html"), chromiumRunnerPage(draft.id), "utf8");

  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/speaker-runner.html`, profileDirectory, { virtualTimeBudget: 14000, timeout: 24000, windowSize: "1440,1000" });
    const results = readBrowserResults(dom);
    assert.match(results.refusalMessage, /Suppression refusée.*encore référencé.*1 segment/i);
    assert.equal(results.speakerStillPresent, true);
    assert.equal(results.saveStatus, "Modifications enregistrées.");
    assert.match(results.generatedId, /^speaker-\d+-[a-z0-9]+$/);
    assert.equal(results.stableId, results.generatedId);
    assert.equal(results.speakerLabel, "Locutrice Chromium");
    assert.equal(results.speakerControl, "SELECT");
    assert.equal(results.speakerMultiple, true);
    assert.deepEqual(results.selectedSpeakerIds, [results.generatedId]);
    assert.equal(results.segmentText, "Segment créé dans Chromium guidé");
    assert.equal(results.idVisibleBeforeSave, false);
    assert.equal(results.guidedIdVisibleAfterReload, false);
    assert.equal(results.advancedExistingIdVisible, false);
    assert.equal(results.advancedTechnicalInputPresent, false);
    assert.equal(results.advancedGeneratedId, "speaker-advanced-test");
    assert.equal(results.advancedGeneratedIdVisible, false);
    assert.equal(results.guidedVisibleName, "Locutrice Chromium");
    assert.deepEqual(results.saved.speakers, [{ id: results.generatedId, label: "Locutrice Chromium" }]);
    assert.deepEqual(results.saved.segments[0].speakerIds, [results.generatedId]);
    assert.deepEqual(JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8")), initialStore);
    assert.ok(results.viewport[0] >= 1400 && results.viewport[1] >= 800);
    assert.ok(results.guidedWidth <= results.viewport[0], `Débordement guidé : ${results.guidedWidth}px pour ${results.viewport[0]}px.`);
    assert.ok(results.advancedWidth <= results.viewport[0], `Débordement avancé : ${results.advancedWidth}px pour ${results.viewport[0]}px.`);
    context.diagnostic(`Recette Chromium exécutée avec ${chromium}.`);
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.cleanup();
  }

  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  assert.deepEqual(speakerSnapshot(canonicalState()), initialSpeakers);
});
