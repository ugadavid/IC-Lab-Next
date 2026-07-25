"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const activitiesFile = path.resolve(__dirname, "../../data/activities.json");

async function jsonRequest(baseUrl, pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  return { response, body: await response.json() };
}

test("les dossiers virtuels se créent, se renomment, classent et se suppriment sans supprimer les assets", async () => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  try {
    const initial = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    const assetId = initial.body.assets[0].id;
    const created = await jsonRequest(server.baseUrl, "/api/proto05/library/folders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Corpus test" }) });
    assert.equal(created.response.status, 201);
    const renamed = await jsonRequest(server.baseUrl, `/api/proto05/library/folders/${created.body.folder.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Corpus renommé" }) });
    assert.equal(renamed.response.status, 200);
    const classified = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${assetId}/classification`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ folderId: created.body.folder.id, tagIds: [] }) });
    assert.equal(classified.response.status, 200);
    await server.restart();
    const persisted = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    assert.equal(persisted.body.folders.find(folder => folder.id === created.body.folder.id).name, "Corpus renommé");
    assert.equal(persisted.body.assets.find(asset => asset.id === assetId).folderId, created.body.folder.id);
    const removed = await jsonRequest(server.baseUrl, `/api/proto05/library/folders/${created.body.folder.id}`, { method: "DELETE" });
    assert.equal(removed.response.status, 200);
    const after = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    assert.equal(after.body.assets.find(asset => asset.id === assetId).folderId, null);
    assert.equal(after.body.assets.length, initial.body.assets.length);
  } finally { await server.cleanup(); }
});

test("les tags se créent, s’affectent, se recherchent par persistance et se retirent sans toucher aux sources", async () => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  try {
    const before = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    const asset = before.body.assets[0];
    const sourceIds = asset.sources.map(source => source.id);
    const created = await jsonRequest(server.baseUrl, "/api/proto05/library/tags", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Recherche test" }) });
    assert.equal(created.response.status, 201);
    const renamed = await jsonRequest(server.baseUrl, `/api/proto05/library/tags/${created.body.tag.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Recherche renommée" }) });
    assert.equal(renamed.response.status, 200);
    const classified = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${asset.id}/classification`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ folderId: null, tagIds: [created.body.tag.id] }) });
    assert.equal(classified.response.status, 200);
    await server.restart();
    const persisted = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    assert.deepEqual(persisted.body.assets.find(item => item.id === asset.id).tagIds, [created.body.tag.id]);
    assert.deepEqual(persisted.body.assets.find(item => item.id === asset.id).sources.map(source => source.id), sourceIds);
    const removed = await jsonRequest(server.baseUrl, `/api/proto05/library/tags/${created.body.tag.id}`, { method: "DELETE" });
    assert.equal(removed.response.status, 200);
    const after = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    assert.deepEqual(after.body.assets.find(item => item.id === asset.id).tagIds, []);
  } finally { await server.cleanup(); }
});

test("la recherche de la Library expose le titre, le dossier et le tag", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  assert.match(html, /Titre, identifiant, source, dossier ou tag/);
  assert.match(html, /state\.folders/);
  assert.match(html, /state\.tags/);
  assert.match(html, /folderName=folderLabel\(asset\.folderId\)/);
  assert.match(html, /tagNames=tagLabels\(asset\.tagIds\)/);
  assert.match(html, /searchText=\[asset\.title,asset\.id,folderName,tagNames/);
  assert.match(html, /if\(window\.proto05ModernLibraryRenderer\)return/);
  assert.match(html, /window\.proto05ModernLibraryRenderer=true/);
});

test("l'initialisation moderne remplace le chargement par un rendu de cartes", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  assert.match(html, /const loadFolders=async\(\)=>\{/);
  assert.match(html, /state\.folders=payload\.folders\|\|\[\];/);
  assert.match(html, /renderLibrary104\(\)\};loadFolders\(\)/);
  assert.match(html, /target\.innerHTML=assets\.map\(asset=>\{[\s\S]*?asset-thumb[\s\S]*?data-asset-card/);
  assert.doesNotMatch(html, /renderLibrary104\(\);\s*\}\)\(\);\s*render\(\)/);
});
