"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { sha256 } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const canonicalActivitiesFile = path.join(prototypeDirectory, "data", "activities.json");
const canonicalVideoLibraryFile = path.join(prototypeDirectory, "data", "video-library.json");
const teacherHtml = fs.readFileSync(path.join(prototypeDirectory, "teacher.html"), "utf8");
const activityLibrarySource = fs.readFileSync(path.join(prototypeDirectory, "shared", "activity-library.js"), "utf8");
const activityLibrary = require(path.join(prototypeDirectory, "shared", "activity-library.js"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function jsonRequest(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  return { response, body: await response.json() };
}

test("la page adopte la charpente de collection sans répéter ses actions principales", () => {
  assert.match(teacherHtml, /<h1>Bibliothèque d’activités<\/h1>/);
  assert.match(teacherHtml, /class="activity-toolbar"/);
  assert.match(teacherHtml, /class="activity-sidebar"/);
  assert.match(teacherHtml, /data-view-choice="grid"/);
  assert.match(teacherHtml, /data-view-choice="list"/);
  assert.equal((teacherHtml.match(/Ajouter une activité/g) || []).length, 1);
  assert.doesNotMatch(teacherHtml, /Préparation enseignant|Gérer les sources vidéo|Créer une activité/);
  assert.match(teacherHtml, /\/shared\/teacher-shell\.js/);
  assert.match(teacherHtml, /\/shared\/activity-library\.js/);
});

test("la recherche, les tris, les états et les dossiers se combinent localement", () => {
  const activities = [
    {
      id: "activity-alpha",
      title: "Échange plurilingue",
      description: "Observation guidée",
      status: "draft",
      folderId: "folder-a",
      video: { title: "Corpus Alpes" },
      pedagogicalIdentity: {
        intention: { state: "known", value: "Comprendre les stratégies" },
        audience: { state: "known", value: "Étudiants" }
      },
      pedagogicalIdentitySummary: { completeness: "complete", presence: "present", qualificationLevel: "documented-by-author" }
    },
    {
      id: "activity-beta",
      title: "Brouillon laboratoire",
      description: "Analyse collective",
      status: "draft",
      folderId: null,
      video: { title: "Entretien test" },
      pedagogicalIdentitySummary: { completeness: "incomplete", presence: "partial", qualificationLevel: "unqualified" }
    },
    {
      id: "activity-gamma",
      title: "Atelier de clarification",
      status: "published",
      folderId: "folder-a",
      video: { title: "Séminaire IC" },
      pedagogicalIdentitySummary: { completeness: "incomplete", presence: "partial", qualificationLevel: "reviewed-by-expert" }
    }
  ];
  const folders = [{ id: "folder-a", name: "Corpus Été" }];

  assert.equal(activityLibrary.normalizeText("  ÉTUDIANTS   plurilingues "), "etudiants plurilingues");
  assert.deepEqual(
    activityLibrary.selectActivities(activities, folders, { query: "  strategies  ", folder: "all", status: "all", sort: "title-asc" }).map(item => item.id),
    ["activity-alpha"]
  );
  assert.deepEqual(
    activityLibrary.selectActivities(activities, folders, { query: "corpus ete", folder: "folder-a", status: "complete", sort: "title-asc" }).map(item => item.id),
    ["activity-alpha"]
  );
  assert.deepEqual(
    activityLibrary.selectActivities(activities, folders, { query: "", folder: "unclassified", status: "draft", sort: "title-desc" }).map(item => item.id),
    ["activity-beta"]
  );
  assert.deepEqual(
    activityLibrary.selectActivities(activities, folders, { query: "", folder: "all", status: "incomplete", sort: "title-desc" }).map(item => item.title),
    ["Brouillon laboratoire", "Atelier de clarification"]
  );
  assert.deepEqual(
    activityLibrary.selectActivities(activities, folders, { query: "aucun resultat", folder: "all", status: "all", sort: "title-asc" }),
    []
  );
});

test("les deux vues conservent les destinations et le menu complémentaire partagé", () => {
  for (const expected of [
    "Ouvrir la fiche",
    "Prévisualiser",
    "Vue étudiante",
    "data-duplicate-id",
    "data-delete-id",
    "data-folder-activity"
  ]) assert.match(activityLibrarySource, new RegExp(expected));
  assert.match(activityLibrarySource, /localStorage\.setItem\(VIEW_STORAGE_KEY/);
  assert.match(activityLibrarySource, /event\.key !== "Escape"/);
  assert.match(activityLibrarySource, /confirm\(`Supprimer définitivement l’activité/);
  assert.match(activityLibrarySource, /Ses activités redeviendront non classées\. Aucune activité ne sera supprimée/);
});

test("les dossiers persistent séparément et leur suppression ne supprime aucune activité", { timeout: 20000 }, async () => {
  const canonicalActivitiesHash = sha256(canonicalActivitiesFile);
  const canonicalVideoHash = sha256(canonicalVideoLibraryFile);
  const canonicalStore = JSON.parse(fs.readFileSync(canonicalActivitiesFile, "utf8"));
  assert.equal(canonicalStore.activities.length, 2);
  const originalIds = canonicalStore.activities.map(activity => activity.id);
  const server = await startTemporaryProto05Server(clone(canonicalStore), "proto05-activity-library-");

  try {
    const initial = await jsonRequest(server.baseUrl, "/api/proto05/activity-library");
    assert.equal(initial.response.status, 200);
    assert.deepEqual(initial.body.folders, []);
    assert.deepEqual(initial.body.activities.map(activity => activity.folderId), [null, null]);
    assert.equal(fs.existsSync(server.activityLibraryFile), false);

    const created = await jsonRequest(server.baseUrl, "/api/proto05/activity-library/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Corpus test" })
    });
    assert.equal(created.response.status, 201);
    const folderId = created.body.folder.id;

    const renamed = await jsonRequest(server.baseUrl, `/api/proto05/activity-library/folders/${encodeURIComponent(folderId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Corpus renommé" })
    });
    assert.equal(renamed.response.status, 200);

    const activityId = originalIds[0];
    const classified = await jsonRequest(server.baseUrl, `/api/proto05/activity-library/activities/${encodeURIComponent(activityId)}/classification`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId })
    });
    assert.equal(classified.response.status, 200);
    await server.restart();

    const persisted = await jsonRequest(server.baseUrl, "/api/proto05/activity-library");
    assert.equal(persisted.body.folders.find(folder => folder.id === folderId).name, "Corpus renommé");
    assert.equal(persisted.body.activities.find(activity => activity.id === activityId).folderId, folderId);

    const removed = await jsonRequest(server.baseUrl, `/api/proto05/activity-library/folders/${encodeURIComponent(folderId)}`, { method: "DELETE" });
    assert.equal(removed.response.status, 200);
    assert.deepEqual(removed.body.unclassifiedActivityIds, [activityId]);

    const after = await jsonRequest(server.baseUrl, "/api/proto05/activity-library");
    assert.deepEqual(after.body.folders, []);
    assert.deepEqual(after.body.activities.map(activity => activity.id), originalIds);
    assert.deepEqual(after.body.activities.map(activity => activity.folderId), [null, null]);
    assert.deepEqual(JSON.parse(fs.readFileSync(server.dataFile, "utf8")), canonicalStore);
    assert.equal(fs.existsSync(`${server.activityLibraryFile}.bak`), true);
    assert.equal(sha256(canonicalActivitiesFile), canonicalActivitiesHash);
    assert.equal(sha256(canonicalVideoLibraryFile), canonicalVideoHash);
  } finally {
    await server.cleanup();
  }
});

test("le classement refuse les dossiers ou activités inconnus sans écrire dans les données métier", { timeout: 15000 }, async () => {
  const canonicalStore = JSON.parse(fs.readFileSync(canonicalActivitiesFile, "utf8"));
  const server = await startTemporaryProto05Server(clone(canonicalStore), "proto05-activity-library-refusals-");
  try {
    const unknownActivity = await jsonRequest(server.baseUrl, "/api/proto05/activity-library/activities/inconnue/classification", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId: null })
    });
    assert.equal(unknownActivity.response.status, 404);
    const unknownFolder = await jsonRequest(server.baseUrl, `/api/proto05/activity-library/activities/${encodeURIComponent(canonicalStore.activities[0].id)}/classification`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId: "folder-unknown" })
    });
    assert.equal(unknownFolder.response.status, 404);
    assert.deepEqual(JSON.parse(fs.readFileSync(server.dataFile, "utf8")), canonicalStore);
  } finally {
    await server.cleanup();
  }
});
