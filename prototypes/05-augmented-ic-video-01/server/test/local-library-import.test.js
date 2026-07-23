"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const test = require("node:test");
const path = require("node:path");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

function fixtureStore() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "activities.json"), "utf8"));
}

test("importe local, copie gérée, hash, doublon et persistance", async t => {
  const server = await startTemporaryProto05Server(fixtureStore());
  t.after(() => server.cleanup());
  const body = Buffer.from("fake mp4 payload for Proto05 mission 072");
  const expectedHash = crypto.createHash("sha256").update(body).digest("hex");
  const headers = { "content-type": "video/mp4", "x-proto05-file-name": encodeURIComponent("test-local.mp4") };
  const first = await fetch(`${server.baseUrl}/api/proto05/library/import-local?title=Test%20local`, { method: "POST", headers, body });
  const firstPayload = await first.json();
  assert.equal(first.status, 201);
  assert.equal(firstPayload.asset.playables[0].sha256, expectedHash);
  assert.equal(fs.existsSync(path.join(server.root, "prototype", "data", "video-library-media", `${expectedHash.slice(0, 16)}-test-local.mp4`)), true);
  const duplicate = await fetch(`${server.baseUrl}/api/proto05/library/import-local?title=Test%20local`, { method: "POST", headers, body });
  const duplicatePayload = await duplicate.json();
  assert.equal(duplicate.status, 409);
  assert.equal(duplicatePayload.assetId, firstPayload.asset.id);
  await server.restart();
  const library = await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json();
  assert.ok(library.assets.some(asset => asset.id === firstPayload.asset.id));
});

test("création d’activité par videoRef et routes guidée/étudiant", async t => {
  const server = await startTemporaryProto05Server(fixtureStore());
  t.after(() => server.cleanup());
  const body = Buffer.from("another fake mp4 payload for Proto05 mission 072");
  const imported = await (await fetch(`${server.baseUrl}/api/proto05/library/import-local?title=Création%20locale`, { method: "POST", headers: { "content-type": "video/mp4", "x-proto05-file-name": "creation.mp4" }, body })).json();
  const playable = imported.asset.playables[0];
  const createdResponse = await fetch(`${server.baseUrl}/api/proto05/activities`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Activité locale de test", videoRef: { schemaVersion: "0.1", assetId: imported.asset.id, playableId: playable.id } }) });
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 201);
  assert.deepEqual(created.activity.videoRef, { schemaVersion: "0.1", assetId: imported.asset.id, playableId: playable.id });
  assert.equal(created.activity.video.id, playable.id);
  assert.equal((await fetch(`${server.baseUrl}/teacher/guided/${created.activity.id}`)).status, 200);
  assert.equal((await fetch(`${server.baseUrl}/student/${created.activity.id}`)).status, 200);
});
