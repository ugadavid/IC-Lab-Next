"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const prototype = path.resolve(__dirname, "../..");
const activitiesFile = path.join(prototype, "data", "activities.json");
const libraryFile = path.join(prototype, "data", "video-library.json");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readLibrary() { return JSON.parse(fs.readFileSync(libraryFile, "utf8")); }

function addLocalAsset(library, id, storageKey, availability = "available") {
  const asset = clone(library.assets[0]);
  const source = clone(library.sources.find(item => item.assetId === asset.id));
  const playable = clone(library.playables.find(item => item.assetId === asset.id));
  const sourceId = `source-${id}`;
  const playableId = `playable-${id}`;
  asset.id = id; asset.title = `Test ${id}`; asset.sourceIds = [sourceId]; asset.playableIds = [playableId]; asset.defaultPlayableId = playableId; asset.folderId = null; asset.tagIds = []; asset.parentAssetId = null; asset.familyRootAssetId = id; asset.provenance = { creationType: "import", provider: "test" }; asset.derivationTypes = [];
  delete asset.sourceIds; delete asset.playableIds;
  source.id = sourceId; source.assetId = id; source.kind = "local-file"; source.provider = "local"; source.storageKey = storageKey; source.url = `/api/proto05/library/media/${encodeURIComponent(storageKey)}`; source.availability = availability; source.provenance = { kind: "test" };
  playable.id = playableId; playable.assetId = id; playable.sourceId = sourceId; playable.kind = "local-file"; playable.provider = "local"; playable.storageKey = storageKey; playable.location = { storageKey }; playable.url = source.url; playable.availability = availability; playable.availabilityReason = availability === "missing-local" ? "missing-file" : null;
  library.assets.push(asset); library.sources.push(source); library.playables.push(playable);
  return { assetId: id, sourceId, playableId, storageKey };
}

async function requestJson(baseUrl, pathName, options) {
  const response = await fetch(`${baseUrl}${pathName}`, options);
  return { response, body: await response.json() };
}

async function fixture({ fileMode = "file", dependent = false, shared = false } = {}) {
  const library = readLibrary();
  const item = addLocalAsset(library, `delete-test-${Date.now()}-${Math.random().toString(16).slice(2)}`, shared ? "shared-delete.mp4" : fileMode === "directory" ? "not-a-file" : `delete-${Date.now()}.mp4`, fileMode === "missing" ? "missing-local" : "available");
  let store = JSON.parse(fs.readFileSync(activitiesFile, "utf8"));
  if (dependent) {
    const activity = clone(store.activities[0]);
    activity.id = `delete-dependent-${Date.now()}`;
    activity.title = "Activité dépendante de test";
    activity.videoRef = { schemaVersion: "0.1", assetId: item.assetId, playableId: item.playableId };
    activity.video = { ...(activity.video || {}), id: item.playableId, storageKey: item.storageKey, provider: "local" };
    store.activities.push(activity);
  }
  if (shared) addLocalAsset(library, `delete-shared-${Date.now()}-${Math.random().toString(16).slice(2)}`, item.storageKey, "available");
  const server = await startTemporaryProto05Server(store, "proto05-library-deletion-test-", { videoLibrary: library });
  const mediaPath = path.join(server.root, "prototype", "data", "video-library-media", item.storageKey);
  if (fileMode === "directory") fs.mkdirSync(mediaPath, { recursive: true });
  else if (fileMode !== "missing") fs.writeFileSync(mediaPath, "temporary video fixture", "utf8");
  return { server, item, mediaPath, initialLibrary: library };
}

test("le retrait retire uniquement le catalogue et conserve le fichier et les autres données", async () => {
  const fixtureData = await fixture();
  try {
    const before = await requestJson(fixtureData.server.baseUrl, "/api/proto05/library/assets");
    const result = await requestJson(fixtureData.server.baseUrl, `/api/proto05/library/assets/${fixtureData.item.assetId}`, { method: "DELETE" });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.deletedFile, false);
    assert.equal(fs.existsSync(fixtureData.mediaPath), true);
    const after = await requestJson(fixtureData.server.baseUrl, "/api/proto05/library/assets");
    assert.equal(after.body.assets.some(asset => asset.id === fixtureData.item.assetId), false);
    assert.equal(after.body.assets.length, before.body.assets.length - 1);
    assert.deepEqual(after.body.folders, before.body.folders);
    assert.deepEqual(after.body.tags, before.body.tags);
  } finally { await fixtureData.server.cleanup(); }
});

test("une référence indisponible peut être retirée sans tenter de supprimer un fichier", async () => {
  const fixtureData = await fixture({ fileMode: "missing" });
  try {
    const result = await requestJson(fixtureData.server.baseUrl, `/api/proto05/library/assets/${fixtureData.item.assetId}`, { method: "DELETE" });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.deletedFile, false);
    assert.equal(fs.existsSync(fixtureData.mediaPath), false);
  } finally { await fixtureData.server.cleanup(); }
});

test("la suppression physique réussie précède le retrait du catalogue", async () => {
  const fixtureData = await fixture();
  try {
    const result = await requestJson(fixtureData.server.baseUrl, `/api/proto05/library/assets/${fixtureData.item.assetId}/physical`, { method: "DELETE" });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.deletedFile, true);
    assert.equal(fs.existsSync(fixtureData.mediaPath), false);
    const listed = await requestJson(fixtureData.server.baseUrl, "/api/proto05/library/assets");
    assert.equal(listed.body.assets.some(asset => asset.id === fixtureData.item.assetId), false);
  } finally { await fixtureData.server.cleanup(); }
});

test("un échec de suppression physique laisse le catalogue intact", async () => {
  const fixtureData = await fixture({ fileMode: "directory" });
  try {
    const result = await requestJson(fixtureData.server.baseUrl, `/api/proto05/library/assets/${fixtureData.item.assetId}/physical`, { method: "DELETE" });
    assert.equal(result.response.status, 409);
    const listed = await requestJson(fixtureData.server.baseUrl, "/api/proto05/library/assets");
    assert.equal(listed.body.assets.some(asset => asset.id === fixtureData.item.assetId), true);
    assert.equal(fs.existsSync(fixtureData.mediaPath), true);
  } finally { await fixtureData.server.cleanup(); }
});

test("les activités dépendantes bloquent les deux suppressions", async () => {
  const fixtureData = await fixture({ dependent: true });
  try {
    for (const suffix of ["", "/physical"]) {
      const result = await requestJson(fixtureData.server.baseUrl, `/api/proto05/library/assets/${fixtureData.item.assetId}${suffix}`, { method: "DELETE" });
      assert.equal(result.response.status, 409);
      assert.match(result.body.error, /utilisée|dépendantes/);
      assert.ok(result.body.conflicts.some(conflict => conflict.type === "activities"));
    }
    assert.equal(fs.existsSync(fixtureData.mediaPath), true);
  } finally { await fixtureData.server.cleanup(); }
});

test("un fichier partagé bloque uniquement la suppression physique", async () => {
  const fixtureData = await fixture({ shared: true });
  try {
    const physical = await requestJson(fixtureData.server.baseUrl, `/api/proto05/library/assets/${fixtureData.item.assetId}/physical`, { method: "DELETE" });
    assert.equal(physical.response.status, 409);
    assert.ok(physical.body.conflicts.some(conflict => conflict.type === "shared-references"));
    const removed = await requestJson(fixtureData.server.baseUrl, `/api/proto05/library/assets/${fixtureData.item.assetId}`, { method: "DELETE" });
    assert.equal(removed.response.status, 200);
    assert.equal(fs.existsSync(fixtureData.mediaPath), true);
  } finally { await fixtureData.server.cleanup(); }
});

test("la Library propose les deux actions destructives dans le menu secondaire", () => {
  const html = fs.readFileSync(path.join(prototype, "teacher-videos.html"), "utf8");
  assert.match(html, /Retirer de la Library/);
  assert.match(html, /Supprimer de la Library et du disque/);
  assert.match(html, /\/physical/);
  assert.match(html, /sera retirée de la Library/);
  assert.match(html, /asset\.deletion\?\.canDeleteFile/);
});

test("le menu secondaire suit le cycle fermé, ouvert puis fermé", () => {
  const html = fs.readFileSync(path.join(prototype, "teacher-videos.html"), "utf8");
  assert.match(html, /\.asset-delete-menu\{[^}]*display:none/);
  assert.match(html, /\.asset-delete-menu:not\(\[hidden\]\)\{display:grid\}/);
  assert.match(html, /menu\.hidden=true/);
  assert.match(html, /menuButton\.setAttribute\('aria-expanded','false'\)/);
  assert.match(html, /menuButton\.setAttribute\('aria-controls',menu\.id\)/);
  assert.match(html, /closeSecondaryMenus\(menu\)/);
  assert.match(html, /menu\.hidden=!shouldOpen/);
  assert.match(html, /event\.key==='Escape'/);
  assert.match(html, /event\.target\.closest\('\.asset-secondary-menu'\)/);
});
