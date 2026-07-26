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
  "teacher-anonymization.html"
];

test("le routeur du socle distingue toutes les vues enseignantes des vues étudiantes", () => {
  const activityId = "activité test";
  assert.deepEqual(teacherShell.routeContext("/teacher"), { route: "library", general: "library" });
  assert.deepEqual(teacherShell.routeContext("/teacher/create"), { route: "create", general: "library" });
  assert.deepEqual(teacherShell.routeContext("/teacher/videos"), { route: "videos", general: "videos" });
  assert.deepEqual(teacherShell.routeContext("/teacher/videos/video-1"), { route: "video-detail", general: "videos" });
  assert.deepEqual(teacherShell.routeContext("/teacher/anonymization/job-1"), { route: "anonymization", general: "videos" });
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
  assert.match(activityLibrarySource, /data-duplicate-id/);
  assert.match(activityLibrarySource, /data-delete-id/);
  assert.match(source("teacher.html"), /href="\/teacher\/create">Ajouter une activité/);
  assert.match(source("teacher-create.html"), /id="create"/);
  assert.match(source("teacher-edit.html"), /id="save"/);
  assert.match(source("teacher-guided.html"), /id="save"/);
  assert.match(source("teacher-author.html"), /id="save"/);
  assert.match(source("teacher-video-detail.html"), /data-action="workshop"/);
  assert.match(source("teacher-anonymization.html"), /id="derive"/);
  assert.doesNotMatch(source("teacher-videos.html"), /← Bibliothèque enseignant/);
  assert.doesNotMatch(source("teacher-create.html"), /← Bibliothèque enseignant|Ouvrir la Library/);
  assert.ok(teacherPages.every(page => !source(page).includes("anonymization-advanced")));
});

test("les routes enseignantes et les actifs partagés sont servis par une copie temporaire", { timeout: 15000 }, async () => {
  const store = {
    schemaVersion: "0.1",
    updatedAt: "test-only",
    activities: [{ ...fixtureActivity, id: "teacher-ui-fixture" }]
  };
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
      "/teacher/anonymization/job-fixture"
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
  const runnerFile = path.join(temporary.root, "prototype", "teacher-ui-save-runner.html");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-teacher-ui-save-profile-"));
  fs.writeFileSync(runnerFile, `<!doctype html><html><body data-test-state="running"><iframe id="page" src="/teacher/edit/teacher-ui-save-fixture"></iframe><script>
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
    const payload = await (await fetch('/api/proto05/activities/teacher-ui-save-fixture')).json();
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
  </script></body></html>`, "utf8");

  try {
    const dom = await runChromium(
      chromium,
      `${temporary.baseUrl}/teacher-ui-save-runner.html`,
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
