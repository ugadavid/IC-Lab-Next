"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { migrateStore, runMigration } = require("../scripts/migrate-language-catalog");
const { findChromium, readBrowserResults, runChromium, sha256 } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const workspaceDirectory = path.resolve(prototypeDirectory, "..", "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");
const catalogFile = path.join(workspaceDirectory, "shared", "reference-data", "languages.json");
const fixedMigrationDate = "2026-07-16T20:00:00.000Z";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function migratedCanonicalStore() {
  return migrateStore(readJson(canonicalDataFile), readJson(catalogFile), fixedMigrationDate);
}

test("la migration remappe les cinq activités sans modifier les contenus pédagogiques", () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const before = readJson(canonicalDataFile);
  const after = migrateStore(before, readJson(catalogFile), fixedMigrationDate);
  assert.equal(after.activities.length, 5);
  assert.deepEqual(after.activities.map(activity => activity.id), before.activities.map(activity => activity.id));

  const historical = after.activities.find(activity => activity.id === "proto05-augmented-video-01");
  const originalCopy = after.activities.find(activity => activity.title === "Original_copy");
  assert.deepEqual(historical.languages.map(language => language.id), ["fr", "es", "it", "pt"]);
  assert.deepEqual(originalCopy.languages.map(language => language.id), ["fr", "es", "it", "pt"]);
  assert.equal(historical.transcription.languageId, "fr");
  assert.equal(originalCopy.transcription.languageId, "fr");
  assert.ok(historical.segments.every(segment => segment.languageIds.every(id => ["fr", "es", "it", "pt"].includes(id))));
  assert.ok(originalCopy.languageIntervals.every(interval => ["fr", "es", "it", "pt"].includes(interval.languageId)));

  for (const title of ["MboloTest", "Lbinz", "brouillon_vide"]) {
    const draft = after.activities.find(activity => activity.title === title);
    assert.ok(draft, `${title} doit rester présente.`);
    assert.deepEqual(draft.languages, []);
    assert.deepEqual(draft.segments, []);
    assert.deepEqual(draft.languageIntervals, []);
    assert.equal(draft.transcription.languageId, null);
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

test("l’application sur copie temporaire produit une sauvegarde exacte avant remplacement atomique", () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-language-migration-copy-"));
  const dataFile = path.join(root, "activities.json");
  const backupFile = path.join(root, "activities.before-language-migration.json.bak");
  fs.copyFileSync(canonicalDataFile, dataFile);
  const temporaryHashBefore = sha256(dataFile);
  try {
    const result = runMigration({ dataFile, catalogFile, apply: true, backupFile, updatedAt: fixedMigrationDate });
    assert.equal(result.applied, true);
    assert.equal(result.beforeSha256, temporaryHashBefore);
    assert.equal(sha256(backupFile), temporaryHashBefore);
    assert.equal(sha256(dataFile), result.afterSha256);
    assert.equal(result.before.length, 5);
    assert.equal(result.after.length, 5);
    assert.deepEqual(result.before.map(activity => activity.volumes), result.after.map(activity => activity.volumes));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

test("le serveur refuse les anciennes langues et une duplication conserve les identifiants partagés", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = migratedCanonicalStore();
  const temporary = await startTemporaryProto05Server(store, "proto05-language-migration-server-");
  try {
    const historical = store.activities.find(activity => activity.id === "proto05-augmented-video-01");
    const duplicateResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${historical.id}/duplicate`, { method: "POST" });
    assert.equal(duplicateResponse.status, 201);
    const duplicate = (await duplicateResponse.json()).activity;
    assert.deepEqual(duplicate.languages, historical.languages);
    assert.deepEqual(duplicate.languages.map(language => language.id), ["fr", "es", "it", "pt"]);
    assert.equal(duplicate.transcription.languageId, "fr");
    assert.ok(duplicate.segments.every(segment => segment.languageIds.every(id => ["fr", "es", "it", "pt"].includes(id))));

    const empty = store.activities.find(activity => activity.title === "brouillon_vide");
    const rejectedPayload = {
      title: empty.title,
      description: empty.description,
      instruction: empty.instruction,
      pedagogicalQuestion: empty.pedagogicalQuestion,
      videoId: empty.video.id,
      segments: empty.segments,
      languages: [{ id: "lang-fr", code: "FR", label: "Français" }],
      languageIntervals: empty.languageIntervals,
      phenomena: empty.phenomena,
      layers: empty.layers,
      teacherAnnotations: empty.teacherAnnotations,
      layerConfiguration: empty.layerConfiguration
    };
    const hashBeforeRefusal = sha256(temporary.dataFile);
    const rejected = await fetch(`${temporary.baseUrl}/api/proto05/activities/${empty.id}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rejectedPayload)
    });
    assert.equal(rejected.status, 400);
    assert.match((await rejected.json()).error, /absente du référentiel partagé.*lang-fr/i);
    assert.equal(sha256(temporary.dataFile), hashBeforeRefusal);
  } finally {
    await temporary.cleanup();
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});

function chromiumRunnerPage(emptyActivityId) {
  return `<!doctype html><html><body data-test-state="running">
  <iframe id="historical" src="/student/proto05-augmented-video-01"></iframe>
  <iframe id="empty" src="/teacher/author/${encodeURIComponent(emptyActivityId)}"></iframe>
  <script>
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
    const historicalFrame = document.getElementById('historical');
    const emptyFrame = document.getElementById('empty');
    await waitFor(() => historicalFrame.contentDocument?.querySelectorAll('#transcriptList .segment').length === 11, 'activité historique');
    await waitFor(() => emptyFrame.contentDocument?.querySelectorAll('#activityLanguages option').length === 4, 'brouillon vide');
    const picker = emptyFrame.contentDocument.querySelector('#activityLanguages');
    emptyFrame.contentDocument.querySelector('#save').click();
    await waitFor(() => emptyFrame.contentDocument.querySelector('#status').textContent.includes('Brouillon sauvegardé.'), 'sauvegarde brouillon vide');
    const historical = (await (await fetch('/api/proto05/activities/proto05-augmented-video-01')).json()).activity;
    const empty = (await (await fetch('/api/proto05/activities/${encodeURIComponent(emptyActivityId)}')).json()).activity;
    const results = {
      historicalLanguages: historical.languages,
      historicalTranscriptionLanguageId: historical.transcription.languageId,
      historicalSegmentsRendered: historicalFrame.contentDocument.querySelectorAll('#transcriptList .segment').length,
      emptyOptions: [...picker.options].map(option => option.value),
      emptyPickerDisabled: picker.disabled,
      emptyStatus: emptyFrame.contentDocument.querySelector('#status').textContent,
      emptyLanguages: empty.languages,
      emptyTranscriptionLanguageId: empty.transcription.languageId,
      viewport: [innerWidth, innerHeight],
      historicalWidth: historicalFrame.contentDocument.documentElement.scrollWidth,
      emptyWidth: emptyFrame.contentDocument.documentElement.scrollWidth
    };
    document.body.dataset.results = encodeURIComponent(JSON.stringify(results));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`;
}

test("Chromium vérifie l’activité historique migrée et la sauvegarde du brouillon vide", { timeout: 30000 }, async () => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la vérification ciblée.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = migratedCanonicalStore();
  const emptyActivity = store.activities.find(activity => activity.title === "brouillon_vide");
  assert.ok(emptyActivity, "Le brouillon vide doit être présent dans la fixture migrée.");
  const temporary = await startTemporaryProto05Server(store, "proto05-language-migration-chromium-");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-language-migration-profile-"));
  fs.writeFileSync(path.join(temporary.root, "prototype", "language-migration-runner.html"), chromiumRunnerPage(emptyActivity.id), "utf8");
  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/language-migration-runner.html`, profileDirectory, {
      virtualTimeBudget: 14000,
      timeout: 24000,
      windowSize: "1440,1000"
    });
    const results = readBrowserResults(dom);
    assert.deepEqual(results.historicalLanguages.map(language => language.id), ["fr", "es", "it", "pt"]);
    assert.equal(results.historicalTranscriptionLanguageId, "fr");
    assert.equal(results.historicalSegmentsRendered, 11);
    assert.deepEqual(results.emptyOptions, ["fr", "es", "it", "pt"]);
    assert.equal(results.emptyPickerDisabled, false);
    assert.equal(results.emptyStatus, "Brouillon sauvegardé.");
    assert.deepEqual(results.emptyLanguages, []);
    assert.equal(results.emptyTranscriptionLanguageId, null);
    assert.ok(results.viewport[0] >= 1400 && results.viewport[1] >= 800);
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.cleanup();
  }
  assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
});
