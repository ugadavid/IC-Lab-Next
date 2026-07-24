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
const workspaceDirectory = path.resolve(prototypeDirectory, "..", "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");
const sharedLanguageCatalogFile = path.join(workspaceDirectory, "shared", "reference-data", "languages.json");
const expectedLanguages = [
  { id: "fr", label: "Français" },
  { id: "es", label: "Espagnol" },
  { id: "it", label: "Italien" },
  { id: "pt", label: "Portugais" }
];

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

test("le référentiel global expose exactement quatre langues en lecture seule", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const catalogHashBefore = sha256(sharedLanguageCatalogFile);
  const filePayload = JSON.parse(fs.readFileSync(sharedLanguageCatalogFile, "utf8"));
  assert.deepEqual(filePayload, { languages: expectedLanguages });

  const initialStore = { schemaVersion: "0.1", updatedAt: "test-only", activities: [] };
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-language-catalog-");
  try {
    const response = await fetch(`${temporary.baseUrl}/api/proto05/language-catalog`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { languages: expectedLanguages });

    const rejected = await fetch(`${temporary.baseUrl}/api/proto05/language-catalog`, { method: "POST" });
    assert.equal(rejected.status, 405);
    assert.equal(rejected.headers.get("allow"), "GET");
    assert.deepEqual(JSON.parse(fs.readFileSync(temporary.dataFile, "utf8")), initialStore);
  } finally {
    await temporary.cleanup();
  }

  assert.equal(sha256(sharedLanguageCatalogFile), catalogHashBefore);
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

test("un brouillon vide accepte les langues partagées et refuse une langue hors référentiel", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = { schemaVersion: "0.1", updatedAt: "test-only", activities: [] };
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-language-save-");
  try {
    const createdResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Brouillon langues", description: "", videoId: "video-proto05-uga-37004" })
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).activity;
    created.languages = [
      { id: "fr", code: "FR", label: "Français" },
      { id: "es", code: "ES", label: "Espagnol" }
    ];

    const savedResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${created.id}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(authoringPayload(created))
    });
    assert.equal(savedResponse.status, 200);
    const saved = (await savedResponse.json()).activity;
    assert.deepEqual(saved.languages, created.languages);

    const temporaryHashBeforeRefusal = sha256(temporary.dataFile);
    saved.languages.push({ id: "de", code: "DE", label: "Allemand" });
    const rejectedResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${created.id}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(authoringPayload(saved))
    });
    assert.equal(rejectedResponse.status, 400);
    assert.match((await rejectedResponse.json()).error, /absente du référentiel partagé.*de/i);
    assert.equal(sha256(temporary.dataFile), temporaryHashBeforeRefusal);
  } finally {
    await temporary.cleanup();
  }

  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
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
    frame.contentDocument.querySelector('#title').value = 'Brouillon langues Chromium';
    frame.contentDocument.querySelector('#assets .asset .select').click();
    await waitFor(() => !frame.contentDocument.querySelector('#create').disabled, 'sélection vidéo');
    const selection = JSON.parse(frame.contentWindow.eval('JSON.stringify({assetId:state.assetId,playableId:state.playableId})'));
    const createdResponse = await fetch('/api/proto05/activities', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({title:frame.contentDocument.querySelector('#title').value,description:'',videoId:'video-proto05-uga-37004'})});
    const createdPayload = await createdResponse.json();
    const createdActivityId = createdPayload.activity.id;
    frame.contentWindow.location.href = '/teacher/author/' + encodeURIComponent(createdActivityId);
    await waitFor(() => frame.contentDocument?.querySelector('#activityLanguages'), 'atelier auteur');
    await waitFor(() => frame.contentDocument.querySelectorAll('#activityLanguages option').length === 4, 'référentiel de langues');
    const authorDocument = frame.contentDocument;
    const picker = authorDocument.querySelector('#activityLanguages');
    for (const option of picker.options) option.selected = ['fr', 'es'].includes(option.value);
    picker.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true }));
    authorDocument.querySelector('#addSegment').click();
    const segmentRow = authorDocument.querySelector('#segments [data-i="0"]');
    segmentRow.querySelector('[data-k="text"]').value = 'Segment multilingue';
    const segmentLanguages = segmentRow.querySelector('select[data-k="languageIds"][multiple]');
    for (const option of segmentLanguages.options) option.selected = ['fr', 'es'].includes(option.value);
    authorDocument.querySelector('#save').click();
    await waitFor(() => authorDocument.querySelector('#status').textContent.includes('Brouillon sauvegardé.'), 'sauvegarde du brouillon');
    const activityId = frame.contentWindow.eval('state.activity.id');
    const saved = (await (await fetch('/api/proto05/activities/' + encodeURIComponent(activityId))).json()).activity;
    const results = {
      options: [...picker.options].map(option => ({ id: option.value, label: option.textContent })),
      multiple: picker.multiple,
      pickerDisabled: picker.disabled,
      segmentControl: segmentLanguages.tagName,
      segmentMultiple: segmentLanguages.multiple,
      freeLanguageInputs: authorDocument.querySelectorAll('input[data-k="languageIds"], input[data-k="languageId"]').length,
      status: authorDocument.querySelector('#status').textContent,
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

test("Chromium crée un brouillon, sélectionne plusieurs langues partagées et le sauvegarde", { timeout: 30000 }, async () => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la vérification ciblée.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const temporary = await startTemporaryProto05Server({ schemaVersion: "0.1", updatedAt: "test-only", activities: [] }, "proto05-language-chromium-");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-language-chromium-profile-"));
  fs.writeFileSync(path.join(temporary.root, "prototype", "language-runner.html"), chromiumRunnerPage(), "utf8");
  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/language-runner.html`, profileDirectory, { virtualTimeBudget: 12000, timeout: 22000, windowSize: "1440,1000" });
    const results = readBrowserResults(dom);
    assert.deepEqual(results.options, expectedLanguages);
    assert.equal(results.multiple, true);
    assert.equal(results.pickerDisabled, false);
    assert.equal(results.segmentControl, "SELECT");
    assert.equal(results.segmentMultiple, true);
    assert.equal(results.freeLanguageInputs, 0);
    assert.equal(results.status, "Brouillon sauvegardé.");
    assert.deepEqual(results.saved.languages, [
      { id: "fr", code: "FR", label: "Français" },
      { id: "es", code: "ES", label: "Espagnol" }
    ]);
    assert.deepEqual(results.saved.segments[0].languageIds, ["fr", "es"]);
    assert.ok(results.viewport[0] >= 1400 && results.viewport[1] >= 800, `Viewport Chromium inattendu : ${results.viewport.join("×")}.`);
    assert.ok(results.authorWidth <= results.viewport[0], `Débordement horizontal : ${results.authorWidth}px pour ${results.viewport[0]}px.`);
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.cleanup();
  }

  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});
