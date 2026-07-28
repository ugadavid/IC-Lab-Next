"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const activitiesFile = path.resolve(__dirname, "../../data/activities.json");
const libraryFile = path.resolve(__dirname, "../../data/video-library.json");

async function jsonRequest(baseUrl, pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  return { response, body: await response.json() };
}

test("video-library.json est initialisée avec les structures persistantes", () => {
  const library = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
  assert.equal(library.schemaVersion, "1.0");
  assert.ok(library.assets.length >= 3);
  assert.ok(library.sources.some(source => source.kind === "hls"));
  assert.ok(library.sources.some(source => source.kind === "youtube-embed"));
  assert.ok(library.playables.some(playable => playable.id === "video-proto05-uga-37004"));
});

test("sert la copie locale contrÃ´lÃ©e avec une rÃ©ponse partielle", async () => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  try {
    fs.writeFileSync(path.join(server.videoLibraryMediaDirectory, "video_37004_1080p.mp4"), Buffer.alloc(32, 0x2a));
    const playable = await jsonRequest(server.baseUrl, "/api/proto05/library/playables/video-proto05-local-video-37004-1080p");
    assert.equal(playable.response.status, 200);
    assert.equal(playable.body.playable.provider, "local");
    assert.equal(playable.body.playable.url, "/api/proto05/library/media/video_37004_1080p.mp4");
    const media = await fetch(`${server.baseUrl}${playable.body.playable.url}`, { headers: { range: "bytes=0-15" } });
    assert.equal(media.status, 206);
    assert.equal(media.headers.get("content-type"), "video/mp4");
    assert.equal((await media.arrayBuffer()).byteLength, 16);
  } finally { await server.cleanup(); }
});

test("ajoute une source locale, directe et HLS par la route Library", async () => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  try {
    const inputs = [
      { title: "Fichier local déclaré", source: { kind: "local-file", storageKey: "library/example.mp4", mimeType: "video/mp4" } },
      { title: "URL directe déclarée", source: { kind: "direct-url", url: "https://cdn.example.test/video.mp4", mimeType: "video/mp4" } },
      { title: "HLS UGA déclaré", source: { kind: "hls", url: "https://videos.univ-grenoble-alpes.fr/media/videos/7d74074b07ff1dfc9ed59cdade1a126fc17fed888ca9d26da6e5b2875e8b5120/37004/livestream.m3u8" } }
    ];
    for (const input of inputs) {
      const result = await jsonRequest(server.baseUrl, "/api/proto05/library/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      assert.equal(result.response.status, 201);
      assert.equal(result.body.asset.sources.length, 1);
      assert.equal(result.body.asset.playables.length, 1);
    }
    const listed = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    assert.equal(listed.response.status, 200);
    assert.ok(listed.body.assets.some(asset => asset.title === "Fichier local déclaré"));
    assert.ok(listed.body.assets.some(asset => asset.title === "URL directe déclarée"));
    assert.ok(listed.body.assets.some(asset => asset.title === "HLS UGA déclaré"));
  } finally { await server.cleanup(); }
});

test("résout un playable existant et projette activity.video", async () => {
  const store = JSON.parse(fs.readFileSync(activitiesFile, "utf8"));
  const server = await startTemporaryProto05Server(store);
  try {
    const activity = await jsonRequest(server.baseUrl, "/api/proto05/activities/proto05-augmented-video-01");
    assert.equal(activity.response.status, 200);
    assert.equal(activity.body.activity.video.id, "video-proto05-uga-37004");
    assert.equal(activity.body.activity.videoRef.assetId, "media-proto05-video-proto05-uga-37004");
    const playable = await jsonRequest(server.baseUrl, "/api/proto05/library/playables/video-proto05-uga-37004");
    assert.equal(playable.response.status, 200);
    assert.equal(playable.body.playable.url, activity.body.activity.video.proxyUrl);
  } finally { await server.cleanup(); }
});

test("la Library ajoutée reste disponible après redémarrage du serveur", async () => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  try {
    const created = await jsonRequest(server.baseUrl, "/api/proto05/library/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Persistante", source: { kind: "local-file", storageKey: "library/persisted.mp4", mimeType: "video/mp4" } }) });
    assert.equal(created.response.status, 201);
    await server.restart();
    const listed = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    assert.equal(listed.response.status, 200);
    assert.ok(listed.body.assets.some(asset => asset.id === created.body.asset.id));
    const persisted = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
    assert.ok(persisted.assets.some(asset => asset.id === created.body.asset.id));
  } finally { await server.cleanup(); }
});

test("associe un asset Library à une activité sur une copie", async () => {
  const store = JSON.parse(fs.readFileSync(activitiesFile, "utf8"));
  const server = await startTemporaryProto05Server(store);
  try {
    const created = await jsonRequest(server.baseUrl, "/api/proto05/library/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Asset sélectionnable", source: { kind: "local-file", storageKey: "library/selectable.mp4", mimeType: "video/mp4" } }) });
    const asset = created.body.asset;
    const selected = await jsonRequest(server.baseUrl, "/api/proto05/activities/proto05-augmented-video-01/video-ref", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: asset.id, playableId: asset.defaultPlayableId }) });
    assert.equal(selected.response.status, 200);
    assert.equal(selected.body.activity.videoRef.assetId, asset.id);
    assert.equal(selected.body.activity.video.id, asset.defaultPlayableId);
  } finally { await server.cleanup(); }
});
