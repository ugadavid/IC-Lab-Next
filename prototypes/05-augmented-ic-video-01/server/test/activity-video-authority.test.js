"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const prototypeDirectory = path.resolve(__dirname, "../..");
const canonicalStore = JSON.parse(fs.readFileSync(path.join(prototypeDirectory, "data", "activities.json"), "utf8"));
const canonicalLibrary = JSON.parse(fs.readFileSync(path.join(prototypeDirectory, "data", "video-library.json"), "utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stored(server) {
  return JSON.parse(fs.readFileSync(server.dataFile, "utf8"));
}

async function jsonRequest(server, pathname, options) {
  const response = await fetch(`${server.baseUrl}${pathname}`, options);
  return { response, body: await response.json() };
}

function assertProjectionNotStored(activity) {
  assert.ok(activity.videoRef);
  assert.equal(Object.prototype.hasOwnProperty.call(activity, "video"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(activity, "videoSource"), false);
}

test("stockage videoRef-only et projection canonique sur les frontières réelles", { timeout: 30000 }, async () => {
  const server = await startTemporaryProto05Server(clone(canonicalStore), "proto05-video-authority-");
  try {
    for (const activity of stored(server).activities) assertProjectionNotStored(activity);

    const list = await jsonRequest(server, "/api/proto05/activities");
    assert.equal(list.response.status, 200);
    for (const listed of list.body.activities) {
      const detail = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(listed.id)}`);
      assert.equal(detail.response.status, 200);
      assert.deepEqual(listed.videoRef, detail.body.activity.videoRef);
      assert.deepEqual(listed.video, detail.body.activity.video);
      assert.deepEqual(listed.videoSource, detail.body.activity.videoSource);
    }

    const hls = list.body.activities.find(activity => activity.video.kind === "hls");
    const youtube = list.body.activities.find(activity => activity.video.kind === "youtube-embed");
    assert.ok(hls);
    assert.ok(youtube);
    const activityLibrary = await jsonRequest(server, "/api/proto05/activity-library");
    assert.equal(activityLibrary.response.status, 200);
    const libraryHls = activityLibrary.body.activities.find(activity => activity.id === hls.id);
    assert.deepEqual(libraryHls.videoRef, hls.videoRef);
    assert.deepEqual(libraryHls.video, hls.video);
    assert.deepEqual(libraryHls.videoSource, hls.videoSource);
    for (const pathname of [
      `/student/${encodeURIComponent(hls.id)}`,
      `/teacher/preview/${encodeURIComponent(hls.id)}`,
      `/teacher/guided/${encodeURIComponent(hls.id)}`
    ]) {
      const page = await fetch(`${server.baseUrl}${pathname}`);
      assert.equal(page.status, 200, pathname);
    }
    assert.equal(hls.video.proxyUrl, "/api/hls/uga-37004/livestream.m3u8");
    assert.equal("videoId" in hls.video, false);
    assert.equal("embedUrl" in hls.video, false);
    assert.equal(youtube.video.provider, "youtube");
    assert.equal(youtube.video.videoId, "eV9RFKFhfa0");
    assert.equal("proxyUrl" in youtube.video, false);
    assert.equal("manifestUrl" in youtube.video, false);

    const change = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(hls.id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: youtube.video.id })
    });
    assert.equal(change.response.status, 200);
    assert.equal(change.body.activity.video.kind, "youtube-embed");
    assert.equal(change.body.activity.video.provider, "youtube");
    assert.equal("proxyUrl" in change.body.activity.video, false);
    assert.equal("manifestUrl" in change.body.activity.video, false);

    const storedAfterChange = stored(server).activities.find(activity => activity.id === hls.id);
    assertProjectionNotStored(storedAfterChange);
    assert.equal(storedAfterChange.videoRef.playableId, youtube.video.id);

    const save = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(hls.id)}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: change.body.activity.title,
        videoRef: change.body.activity.videoRef
      })
    });
    assert.equal(save.response.status, 200);
    assert.equal(save.body.activity.video.kind, "youtube-embed");
    assert.equal("proxyUrl" in save.body.activity.video, false);
    assertProjectionNotStored(stored(server).activities.find(activity => activity.id === hls.id));

    const rawBeforeFalseSnapshot = JSON.stringify(stored(server));
    const falseSnapshot = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(hls.id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        video: {
          id: youtube.video.id,
          kind: "hls",
          proxyUrl: "/ancien/flux.m3u8"
        },
        videoSource: { url: "/ancien/flux.m3u8" }
      })
    });
    assert.equal(falseSnapshot.response.status, 400);
    assert.match(falseSnapshot.body.error, /Champ non autorisé/);
    assert.equal(JSON.stringify(stored(server)), rawBeforeFalseSnapshot);

    const duplicate = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(hls.id)}/duplicate`, {
      method: "POST"
    });
    assert.equal(duplicate.response.status, 201);
    assert.equal(duplicate.body.activity.video.kind, "youtube-embed");
    assertProjectionNotStored(stored(server).activities.find(activity => activity.id === duplicate.body.activity.id));

    const localPlayable = canonicalLibrary.playables.find(playable =>
      playable.kind === "local-file" && playable.availability === "available"
    );
    assert.ok(localPlayable);
    const create = await jsonRequest(server, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Activité locale projetée",
        videoRef: {
          schemaVersion: "0.1",
          assetId: localPlayable.assetId,
          playableId: localPlayable.id
        }
      })
    });
    assert.equal(create.response.status, 201);
    assert.equal(create.body.activity.video.kind, "local-file");
    assert.ok(create.body.activity.video.url);
    assertProjectionNotStored(stored(server).activities.find(activity => activity.id === create.body.activity.id));
  } finally {
    await server.cleanup();
  }
});

test("un playable absent produit une erreur explicite sans fallback snapshot", { timeout: 15000 }, async () => {
  const store = clone(canonicalStore);
  store.activities = [store.activities[0]];
  store.activities[0].videoRef = {
    schemaVersion: "0.1",
    assetId: "asset-absent",
    playableId: "playable-absent"
  };
  const server = await startTemporaryProto05Server(store, "proto05-video-missing-");
  try {
    const detail = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(store.activities[0].id)}`);
    assert.equal(detail.response.status, 409);
    assert.equal(detail.body.code, "ACTIVITY_PLAYABLE_UNRESOLVED");
    const resolution = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(store.activities[0].id)}/video-resolution`);
    assert.equal(resolution.response.status, 409);
    assert.equal(resolution.body.code, "ACTIVITY_PLAYABLE_UNRESOLVED");
    assertProjectionNotStored(stored(server).activities[0]);
  } finally {
    await server.cleanup();
  }
});

test("un playable déclaré indisponible conserve son état sans localisateur de secours", { timeout: 15000 }, async () => {
  const library = clone(canonicalLibrary);
  const playable = library.playables.find(item => item.kind === "local-file" && item.availability === "available");
  assert.ok(playable);
  playable.availability = "missing-local";
  playable.availabilityReason = "missing-file";
  const store = clone(canonicalStore);
  store.activities = [store.activities[1]];
  store.activities[0].videoRef = {
    schemaVersion: "0.1",
    assetId: playable.assetId,
    playableId: playable.id
  };
  const server = await startTemporaryProto05Server(store, "proto05-video-unavailable-", {
    videoLibrary: library
  });
  try {
    const detail = await jsonRequest(server, `/api/proto05/activities/${encodeURIComponent(store.activities[0].id)}`);
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.activity.videoSource.availability, "missing-local");
    assert.equal(detail.body.activity.videoSource.availabilityReason, "missing-file");
    for (const key of ["url", "storageKey", "proxyUrl", "manifestUrl", "embedUrl"]) {
      assert.equal(key in detail.body.activity.videoSource, false);
      assert.equal(key in detail.body.activity.video, false);
    }
  } finally {
    await server.cleanup();
  }
});
