"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  normalizeDirectMediaUrl,
  normalizeHlsManifest,
  mediaRefForCatalogEntry,
  playbackDescriptorForCatalogEntry
} = require("../media-contract");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const dataFile = path.resolve(__dirname, "../../data/activities.json");
const catalogFile = path.resolve(__dirname, "../../data/video-catalog.json");

async function jsonRequest(baseUrl, pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  return { response, body: await response.json() };
}

test("normalise une URL média directe contrôlée", () => {
  const source = normalizeDirectMediaUrl("https://cdn.example.test/media/video.mp4", { mimeType: "video/mp4" });
  assert.deepEqual(source, { kind: "direct-url", url: "https://cdn.example.test/media/video.mp4", manifestUrl: null, mimeType: "video/mp4" });
  assert.throws(() => normalizeDirectMediaUrl("http://cdn.example.test/video.mp4"), /HTTPS/);
});

test("normalise un manifeste HLS m3u8", () => {
  const source = normalizeHlsManifest("/api/hls/uga-37004/livestream.m3u8");
  assert.equal(source.kind, "hls");
  assert.equal(source.url, "/api/hls/uga-37004/livestream.m3u8");
  assert.throws(() => normalizeHlsManifest("/api/hls/uga-37004/livestream.mp4"), /m3u8/);
});

test("résout une activité existante sans réécrire le fichier canonique", async () => {
  const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const original = JSON.stringify(store);
  const server = await startTemporaryProto05Server(store);
  try {
    const result = await jsonRequest(server.baseUrl, "/api/proto05/activities/proto05-augmented-video-01");
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.activity.videoRef, { schemaVersion: "0.1", assetId: "media-proto05-video-proto05-uga-37004", playableId: "video-proto05-uga-37004" });
    assert.equal(result.body.activity.videoSource.kind, "hls");
    assert.equal(result.body.activity.videoSource.url, result.body.activity.video.proxyUrl);
    const resolution = await jsonRequest(server.baseUrl, "/api/proto05/activities/proto05-augmented-video-01/video-resolution");
    assert.equal(resolution.response.status, 200);
    assert.equal(resolution.body.source.url, result.body.activity.video.proxyUrl);
  } finally {
    await server.cleanup();
  }
  assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(dataFile, "utf8"))), original);
});

test("résout la référence YouTube existante et conserve sa projection", () => {
  const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8")).videos;
  const entry = catalog.find(video => video.videoId === "FG4h0_v3oTk");
  const descriptor = playbackDescriptorForCatalogEntry(entry);
  assert.equal(descriptor.assetId, "media-proto05-video-proto05-youtube-fg4h0-v3otk");
  assert.equal(descriptor.playableId, entry.id);
  assert.equal(descriptor.provider, "youtube");
  assert.equal(descriptor.kind, "youtube-embed");
  assert.equal(descriptor.videoId, "FG4h0_v3oTk");
  assert.deepEqual(mediaRefForCatalogEntry(entry), { schemaVersion: "0.1", assetId: "media-proto05-video-proto05-youtube-fg4h0-v3otk", playableId: entry.id });
});

test("PUT authoring conserve activity.video et accepte videoRef sur une copie", async () => {
  const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const server = await startTemporaryProto05Server(store);
  try {
    const loaded = await jsonRequest(server.baseUrl, "/api/proto05/activities/proto05-augmented-video-01");
    const activity = loaded.body.activity;
    const payload = {
      title: activity.title,
      description: activity.description,
      instruction: activity.instruction,
      pedagogicalQuestion: activity.pedagogicalQuestion,
      videoId: activity.video.id,
      videoRef: activity.videoRef,
      segments: activity.segments,
      speakers: activity.speakers,
      languages: activity.languages,
      languageIntervals: activity.languageIntervals,
      phenomena: activity.phenomena,
      layers: activity.layers,
      teacherAnnotations: activity.teacherAnnotations,
      overlays: activity.overlays,
      layerConfiguration: activity.layerConfiguration
    };
    const saved = await jsonRequest(server.baseUrl, "/api/proto05/activities/proto05-augmented-video-01/authoring", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.body.activity.video.id, activity.video.id);
    assert.deepEqual(saved.body.activity.videoRef, activity.videoRef);
    assert.equal(saved.body.activity.videoSource.url, activity.video.proxyUrl);
  } finally {
    await server.cleanup();
  }
});
