"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  projectActivityVideo,
  projectActivityVideoSource
} = require("../activity-video-projection");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const asset = { id: "asset-a", title: "Vidéo canonique" };

test("projette un playable YouTube sans propriété HLS", () => {
  const playable = {
    id: "youtube-a",
    assetId: asset.id,
    kind: "youtube-embed",
    provider: "youtube",
    availability: "available",
    durationMs: null,
    videoId: "abc123",
    embedUrl: "https://www.youtube.com/embed/abc123",
    proxyUrl: "/ancien/flux.m3u8"
  };
  assert.deepEqual(projectActivityVideo(asset, playable), {
    id: "youtube-a",
    title: "Vidéo canonique",
    kind: "youtube-embed",
    provider: "youtube",
    durationMs: null,
    videoId: "abc123",
    embedUrl: "https://www.youtube.com/embed/abc123"
  });
});

test("projette un playable HLS sans propriété YouTube", () => {
  const playable = {
    id: "hls-a",
    assetId: asset.id,
    kind: "hls",
    provider: "uga",
    availability: "available",
    durationMs: 42,
    url: "/media/master.m3u8",
    manifestUrl: "/media/master.m3u8",
    videoId: "ancien",
    embedUrl: "https://example.test/ancien"
  };
  assert.deepEqual(projectActivityVideo(asset, playable), {
    id: "hls-a",
    title: "Vidéo canonique",
    kind: "hls",
    provider: "uga",
    durationMs: 42,
    url: "/media/master.m3u8",
    manifestUrl: "/media/master.m3u8",
    proxyUrl: "/media/master.m3u8"
  });
});

test("projette les localisateurs propres aux playables locaux et directs", () => {
  assert.deepEqual(projectActivityVideo(asset, {
    id: "local-a",
    kind: "local-file",
    provider: "local",
    availability: "available",
    durationMs: 12,
    url: "/api/media/local-a",
    storageKey: "library/local-a.mp4"
  }), {
    id: "local-a",
    title: "Vidéo canonique",
    kind: "local-file",
    provider: "local",
    durationMs: 12,
    url: "/api/media/local-a",
    storageKey: "library/local-a.mp4"
  });
  assert.deepEqual(projectActivityVideo(asset, {
    id: "direct-a",
    kind: "direct-url",
    provider: "direct",
    availability: "available",
    url: "https://cdn.example.test/direct-a.mp4"
  }), {
    id: "direct-a",
    title: "Vidéo canonique",
    kind: "direct-url",
    provider: "direct",
    url: "https://cdn.example.test/direct-a.mp4"
  });
});

test("un playable indisponible ne projette aucun ancien localisateur", () => {
  const playable = {
    id: "local-missing",
    kind: "local-file",
    provider: "local",
    availability: "missing-local",
    availabilityReason: "missing-file",
    durationMs: null,
    url: "/api/media/missing.mp4",
    storageKey: "missing.mp4"
  };
  assert.deepEqual(projectActivityVideo(asset, playable), {
    id: "local-missing",
    title: "Vidéo canonique",
    kind: "local-file",
    provider: "local",
    durationMs: null
  });
  assert.deepEqual(projectActivityVideoSource(playable), {
    id: "local-missing",
    kind: "local-file",
    provider: "local",
    availability: "missing-local",
    availabilityReason: "missing-file",
    durationMs: null
  });
});

test("la projection est déterministe et ne modifie pas ses sources", () => {
  const sourceAsset = clone(asset);
  const playable = {
    id: "youtube-a",
    kind: "youtube-embed",
    provider: "youtube",
    availability: "unknown",
    durationMs: null,
    videoId: "abc123",
    embedUrl: "https://www.youtube.com/embed/abc123"
  };
  const sourcePlayable = clone(playable);
  const first = projectActivityVideo(asset, playable);
  const second = projectActivityVideo(asset, playable);
  assert.deepEqual(first, second);
  assert.notStrictEqual(first, second);
  assert.deepEqual(asset, sourceAsset);
  assert.deepEqual(playable, sourcePlayable);
  assert.throws(() => projectActivityVideo(asset, null), /objet/);
});
