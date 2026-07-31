"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findChromium, readBrowserResults, runChromium } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const fixtureFile = path.join(__dirname, "fixtures", "layer-visibility.activity.json");
const fixtureActivity = JSON.parse(fs.readFileSync(fixtureFile, "utf8")).activity;
const teacherShell = require(path.join(prototypeDirectory, "shared", "teacher-shell.js"));

const teacherPages = [
  "teacher.html",
  "teacher-create.html",
  "teacher-edit.html",
  "teacher-guided.html",
  "teacher-author.html",
  "teacher-videos.html",
  "teacher-video-detail.html",
  "teacher-anonymization.html",
  "teacher-audio-anonymization.html"
];

test("le routeur du socle distingue toutes les vues enseignantes des vues étudiantes", () => {
  const activityId = "activité test";
  assert.deepEqual(teacherShell.routeContext("/teacher"), { route: "library", general: "library" });
  assert.deepEqual(teacherShell.routeContext("/teacher/create"), { route: "create", general: "library" });
  assert.deepEqual(teacherShell.routeContext("/teacher/videos"), { route: "videos", general: "videos" });
  assert.deepEqual(teacherShell.routeContext("/teacher/videos/video-1"), { route: "video-detail", general: "videos" });
  assert.deepEqual(teacherShell.routeContext("/teacher/anonymization/job-1"), { route: "anonymization", general: "videos" });
  assert.deepEqual(teacherShell.routeContext("/teacher/audio-anonymization/job-1"), { route: "audio-anonymization", general: "videos" });
  for (const route of ["edit", "guided", "author", "preview"]) {
    assert.deepEqual(teacherShell.routeContext(`/teacher/${route}/${encodeURIComponent(activityId)}`), {
      route,
      general: "library",
      activityId,
      activityPage: route
    });
  }
  assert.equal(teacherShell.routeContext(`/student/${encodeURIComponent(activityId)}`), null);
  assert.equal(teacherShell.routeContext("/student"), null);
  assert.equal(teacherShell.routeContext("/"), null);
  assert.equal(teacherShell.routeContext("/teacher/anonymization-advanced/job-1"), null);
});

test("le menu général reste limité aux deux espaces principaux et sépare IC-Hub", () => {
  const items = teacherShell.generalItems("library");
  assert.deepEqual(items.map(item => item.label), [
    "Bibliothèque",
    "Vidéothèque"
  ]);
  assert.deepEqual(items.map(item => item.href), [
    "/teacher",
    "/teacher/videos"
  ]);
  assert.equal(items.filter(item => item.active).length, 1);
  assert.equal(items.find(item => item.active).id, "library");
  assert.ok(items.every(item => !["Nouvelle activité", "Ajouter une vidéo", "IC-Hub"].includes(item.label)));

  assert.deepEqual(teacherShell.hubItem(), {
    id: "hub",
    label: "IC-Hub",
    href: "http://127.0.0.1:8790/",
    active: false,
    hub: true
  });

  const shellSource = fs.readFileSync(path.join(prototypeDirectory, "shared", "teacher-shell.js"), "utf8");
  assert.equal((shellSource.match(/http:\/\/127\.0\.0\.1:8790\//g) || []).length, 1);
  for (const page of teacherPages) {
    const source = fs.readFileSync(path.join(prototypeDirectory, page), "utf8");
    assert.doesNotMatch(source, /http:\/\/127\.0\.0\.1:8790\//);
  }
});

test("la navigation d’activité distingue le guidé de l’auteur expert et signale la page active", () => {
  const items = teacherShell.activityItems("activity/with spaces", "author");
  assert.deepEqual(items.map(item => item.label), [
    "Fiche",
    "Guidé",
    "Auteur expert",
    "Prévisualisation"
  ]);
  assert.equal(items.filter(item => item.active).length, 1);
  assert.equal(items.find(item => item.active).id, "author");
  assert.ok(items.every(item => item.href.includes("activity%2Fwith%20spaces")));
  assert.ok(items.every(item => !item.href.includes("anonymization-advanced")));
});

test("les pages enseignantes partagent le socle sans ajouter sa feuille à l’artefact étudiant", () => {
  for (const page of teacherPages) {
    const source = fs.readFileSync(path.join(prototypeDirectory, page), "utf8");
    assert.match(source, /\/shared\/teacher-shell\.css/);
    assert.match(source, /\/shared\/teacher-shell\.js/);
  }
  const studentArtifact = fs.readFileSync(path.join(prototypeDirectory, "index-0.0.9.html"), "utf8");
  const shellSource = fs.readFileSync(path.join(prototypeDirectory, "shared", "teacher-shell.js"), "utf8");
  assert.doesNotMatch(studentArtifact, /\/shared\/teacher-shell\.js/);
  assert.doesNotMatch(studentArtifact, /\/shared\/teacher-shell\.css/);
  assert.doesNotMatch(studentArtifact, /data-teacher-shell|teacher-shell__general/);
  assert.match(shellSource, /context\.route === "preview" && window\.self !== window\.top/);
});

test("les actions métier existantes restent présentes dans leurs pages", () => {
  const source = page => fs.readFileSync(path.join(prototypeDirectory, page), "utf8");
  const activityLibrarySource = fs.readFileSync(path.join(prototypeDirectory, "shared", "activity-library.js"), "utf8");
  const videoLibrarySource = source("teacher-videos.html");
  const videoDetailSource = source("teacher-video-detail.html");
  assert.match(activityLibrarySource, /data-duplicate-id/);
  assert.match(activityLibrarySource, /data-delete-id/);
  assert.match(source("teacher.html"), /href="\/teacher\/create">Ajouter une activité/);
  assert.match(source("teacher-create.html"), /id="create"/);
  assert.match(source("teacher-edit.html"), /id="save"/);
  assert.match(source("teacher-guided.html"), /id="save"/);
  assert.match(source("teacher-author.html"), /id="save"/);
  for (const page of ["teacher-edit.html", "teacher-guided.html", "teacher-author.html"]) {
    assert.match(source(page), /if-match/);
    assert.match(source(page), /Recharger la version actuelle/);
  }
  assert.match(activityLibrarySource, /revisionToken/);
  assert.match(videoDetailSource, /editorialRevisionToken/);
  assert.match(videoDetailSource, /deletionRevisionToken/);
  assert.match(videoDetailSource, /data-action="workshop-image"/);
  assert.match(videoDetailSource, /data-action="workshop-audio"/);
  assert.match(videoDetailSource, /preflight && preflight\.allowed === false/);
  assert.match(videoLibrarySource, /window\.proto05OpenUsagePanel=openUsagePanel/);
  assert.match(videoLibrarySource, /queueMicrotask\(\(\)=>window\.proto05OpenUsagePanel/);
  assert.match(source("teacher-anonymization.html"), /id="derive"/);
  assert.match(source("teacher-audio-anonymization.html"), /id="derive"/);
  assert.doesNotMatch(videoLibrarySource, /← Bibliothèque enseignant/);
  assert.doesNotMatch(source("teacher-create.html"), /← Bibliothèque enseignant|Ouvrir la Library/);
  assert.ok(teacherPages.every(page => !source(page).includes("anonymization-advanced")));
});

test("les surfaces enseignantes utilisent les dialogues partagés sans appel natif", () => {
  const auditedFiles = [
    ...teacherPages,
    "guided-overlays.js",
    path.join("shared", "activity-library.js")
  ];
  const dialogUsers = [
    "teacher-videos.html",
    "teacher-video-detail.html",
    path.join("shared", "activity-library.js")
  ];
  const nativeDialog = /\bwindow\.(?:alert|confirm|prompt)\s*\(|(?<![\w.])(?:alert|confirm|prompt)\s*\(/;
  for (const file of auditedFiles) {
    const source = fs.readFileSync(path.join(prototypeDirectory, file), "utf8");
    assert.doesNotMatch(source, nativeDialog, file);
  }
  for (const file of dialogUsers) {
    const source = fs.readFileSync(path.join(prototypeDirectory, file), "utf8");
    assert.match(source, /Proto05TeacherDialogs\.(?:confirm|prompt)\(/, file);
  }

  const shellSource = fs.readFileSync(
    path.join(prototypeDirectory, "shared", "teacher-shell.js"),
    "utf8"
  );
  assert.match(shellSource, /aria-modal/);
  assert.match(shellSource, /event\.key === "Escape"/);
  assert.match(shellSource, /event\.key !== "Tab"/);
  assert.match(shellSource, /trigger\?\.isConnected/);
  assert.match(shellSource, /confirmButton\.disabled = true/);
  assert.match(shellSource, /input\.setAttribute\("aria-invalid"/);
});

test("la validation d’un prompt partagé refuse le vide sans perdre sa valeur", () => {
  assert.equal(
    teacherShell.requiredPromptIssue("  ", "Le nom est obligatoire."),
    "Le nom est obligatoire."
  );
  assert.equal(teacherShell.requiredPromptIssue("Nom conservé", "Le nom est obligatoire."), null);
});

test("le dialogue partagé valide dans la modale, piège le focus et le restitue", {
  timeout: 25000
}, async () => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour le contrôle des dialogues.");
  const store = { schemaVersion: "0.1", updatedAt: "test-only", activities: [] };
  const temporary = await startTemporaryProto05Server(store, "proto05-teacher-dialog-");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-teacher-dialog-profile-"));
  const runnerUrl = temporary.writeRunner("teacher-dialog-runner.html", `<!doctype html><html><head>
  <link rel="stylesheet" href="/shared/teacher-shell.css">
  <script src="/shared/teacher-shell.js"></script>
  </head><body data-test-state="running"><button id="trigger">Ouvrir</button><script>
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      try { if (predicate()) return; } catch {}
      await pause(20);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  (async () => {
    const trigger = document.getElementById('trigger');
    trigger.focus();
    const promptResult = Proto05TeacherDialogs.prompt({
      title: 'Nom du dossier',
      message: 'Renseignez un nom.',
      label: 'Nom',
      initialValue: 'Valeur initiale',
      confirmLabel: 'Créer',
      trigger,
      validate: value => Proto05TeacherShell.requiredPromptIssue(value, 'Le nom est obligatoire.')
    });
    await waitFor(() => document.querySelector('.teacher-dialog input'), 'ouverture du prompt');
    const input = document.querySelector('.teacher-dialog input');
    const create = [...document.querySelectorAll('.teacher-dialog button')].find(button => button.textContent === 'Créer');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    create.click();
    await waitFor(() => !document.querySelector('.teacher-dialog__validation').hidden, 'erreur intégrée');
    const invalidValue = input.value;
    const validationMessage = document.querySelector('.teacher-dialog__validation').textContent;
    input.value = 'Valeur corrigée';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const validationCleared = document.querySelector('.teacher-dialog__validation').hidden;
    create.focus();
    create.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    const trappedFocusLabel = document.activeElement.getAttribute('aria-label');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    const cancelled = await promptResult;
    const focusRestored = document.activeElement === trigger;

    let confirmations = 0;
    const confirmResult = Proto05TeacherDialogs.confirm({
      title: 'Confirmation',
      message: 'Confirmer une fois.',
      confirmLabel: 'Confirmer',
      trigger
    }).then(value => { confirmations += 1; return value; });
    await waitFor(() => document.querySelector('.teacher-dialog__primary'), 'ouverture de la confirmation');
    const confirm = document.querySelector('.teacher-dialog__primary');
    confirm.click();
    confirm.click();
    const confirmed = await confirmResult;

    document.body.dataset.results = encodeURIComponent(JSON.stringify({
      invalidValue,
      validationMessage,
      validationCleared,
      trappedFocusLabel,
      cancelled,
      focusRestored,
      confirmed,
      confirmations
    }));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`);

  try {
    const dom = await runChromium(
      chromium,
      `${temporary.baseUrl}${runnerUrl}`,
      profileDirectory,
      { virtualTimeBudget: 12000, timeout: 20000, windowSize: "390,720" }
    );
    const results = readBrowserResults(dom);
    assert.equal(results.invalidValue, "");
    assert.equal(results.validationMessage, "Le nom est obligatoire.");
    assert.equal(results.validationCleared, true);
    assert.equal(results.trappedFocusLabel, "Fermer le dialogue");
    assert.equal(results.cancelled, null);
    assert.equal(results.focusRestored, true);
    assert.equal(results.confirmed, true);
    assert.equal(results.confirmations, 1);
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.cleanup();
  }
});

test("les routes enseignantes et les actifs partagés sont servis par le runtime MariaDB isolé", { timeout: 15000 }, async () => {
  const store = { schemaVersion: "0.1", updatedAt: "test-only", activities: [] };
  const temporary = await startTemporaryProto05Server(store, "proto05-teacher-ui-");
  try {
    const routes = [
      "/teacher",
      "/teacher/create",
      "/teacher/edit/teacher-ui-fixture",
      "/teacher/guided/teacher-ui-fixture",
      "/teacher/author/teacher-ui-fixture",
      "/teacher/preview/teacher-ui-fixture",
      "/teacher/videos",
      "/teacher/videos/video-fixture",
      "/teacher/anonymization/job-fixture",
      "/teacher/audio-anonymization/job-fixture"
    ];
    for (const route of routes) {
      const response = await fetch(`${temporary.baseUrl}${route}`);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /\/shared\/teacher-shell\.js/, route);
    }

    const studentResponse = await fetch(`${temporary.baseUrl}/student/teacher-ui-fixture`);
    assert.equal(studentResponse.status, 200);
    const studentHtml = await studentResponse.text();
    assert.doesNotMatch(studentHtml, /\/shared\/teacher-shell\.(?:js|css)/);

    const styleResponse = await fetch(`${temporary.baseUrl}/shared/teacher-shell.css`);
    assert.equal(styleResponse.status, 200);
    assert.match(styleResponse.headers.get("content-type"), /text\/css/);
    const scriptResponse = await fetch(`${temporary.baseUrl}/shared/teacher-shell.js`);
    assert.equal(scriptResponse.status, 200);
    assert.match(scriptResponse.headers.get("content-type"), /text\/javascript/);
    const activityLibraryResponse = await fetch(`${temporary.baseUrl}/shared/activity-library.js`);
    assert.equal(activityLibraryResponse.status, 200);
    assert.match(activityLibraryResponse.headers.get("content-type"), /text\/javascript/);

    const removed = await fetch(`${temporary.baseUrl}/teacher/anonymization-advanced/job-fixture`);
    assert.equal(removed.status, 404);
  } finally {
    await temporary.cleanup();
  }
});

test("la sauvegarde collante de la fiche conserve le formulaire et ses états", { timeout: 25000 }, async () => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour le contrôle ciblé de la sauvegarde.");
  const store = {
    schemaVersion: "0.1",
    updatedAt: "test-only",
    activities: [{ ...fixtureActivity, id: "teacher-ui-save-fixture" }]
  };
  const temporary = await startTemporaryProto05Server(store, "proto05-teacher-ui-save-");
  const activityId = temporary.activityId("teacher-ui-save-fixture");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-teacher-ui-save-profile-"));
  const runnerUrl = temporary.writeRunner("teacher-ui-save-runner.html", `<!doctype html><html><body data-test-state="running"><iframe id="page" src="/teacher/edit/${activityId}"></iframe><script>
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      try { if (predicate()) return; } catch {}
      await pause(25);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  (async () => {
    const frame = document.getElementById('page');
    await waitFor(() => frame.contentDocument?.querySelector('[data-teacher-shell-save]') && frame.contentDocument.querySelector('#title')?.value, 'chargement de la fiche');
    const page = frame.contentDocument;
    const title = page.querySelector('#title');
    title.value = 'Titre sauvegardé depuis le socle partagé';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    const dirtyState = page.querySelector('.teacher-shell__save-status').textContent.trim();
    page.querySelector('[data-teacher-shell-save]').click();
    await waitFor(() => page.querySelector('#status').textContent.includes('enregistrées'), 'sauvegarde par le socle');
    const payload = await (await fetch('/api/proto05/activities/${activityId}')).json();
    document.body.dataset.results = encodeURIComponent(JSON.stringify({
      dirtyState,
      savedState: page.querySelector('.teacher-shell__save-status').textContent.trim(),
      savedTitle: payload.activity.title,
      sourceSaveStillPresent: Boolean(page.querySelector('#save'))
    }));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`);

  try {
    const dom = await runChromium(
      chromium,
      `${temporary.baseUrl}${runnerUrl}`,
      profileDirectory,
      { virtualTimeBudget: 12000, timeout: 20000, windowSize: "1440,1000" }
    );
    const results = readBrowserResults(dom);
    assert.equal(results.dirtyState, "Modifications non enregistrées");
    assert.equal(results.savedState, "Enregistré");
    assert.equal(results.savedTitle, "Titre sauvegardé depuis le socle partagé");
    assert.equal(results.sourceSaveStillPresent, true);
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.cleanup();
  }
});
