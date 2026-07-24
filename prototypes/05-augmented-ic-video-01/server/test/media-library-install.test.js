"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { installCanonicalMediaLibrary } = require("../media-library-install");
const { readCanonicalMediaLibrary, projectCanonicalLibrary } = require("../media-library-runtime");

async function fixtureDirectory() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "proto05-media-library-install-"));
  const media = path.join(root, "media");
  await fs.mkdir(media);
  const legacyFile = path.join(root, "video-library.json");
  const catalogFile = path.join(root, "video-catalog.json");
  const activitiesFile = path.join(root, "activities.json");
  const canonicalFile = legacyFile;
  const backupFile = path.join(root, "backups", "mission-102-video-library-0.1.json");
  await fs.mkdir(path.dirname(backupFile));
  const local = path.join(media, "sample.mp4");
  await fs.writeFile(local, "fixture");
  await fs.writeFile(legacyFile, JSON.stringify({ schemaVersion: "0.1", updatedAt: "2026-01-01T00:00:00.000Z", assets: [{ id: "asset-1", title: "Test", status: "active", defaultPlayableId: "playable-1" }], sources: [{ id: "source-1", assetId: "asset-1", kind: "local-file", provider: "local", storageKey: "sample.mp4", provenance: {} }], playables: [{ id: "playable-1", assetId: "asset-1", sourceId: "source-1", kind: "local-file", provider: "local", storageKey: "sample.mp4", availability: "available" }] }, null, 2));
  await fs.writeFile(catalogFile, JSON.stringify({ videos: [] }));
  await fs.writeFile(activitiesFile, JSON.stringify({ activities: [{ id: "activity-1", video: { id: "playable-1" } }] }));
  return { root, media, mediaDirectory: media, legacyFile, catalogFile, activitiesFile, canonicalFile, backupFile, local };
}

test("installe une Library 1.0 avec sauvegarde exclusive et conservation de la projection activité", async () => {
  const fixture = await fixtureDirectory();
  try {
    const before = await fs.readFile(fixture.legacyFile);
    const activityBefore = await fs.readFile(fixture.activitiesFile);
    const result = await installCanonicalMediaLibrary(fixture);
    assert.equal(result.installed, true);
    assert.equal(result.sourceSha256, result.backupSha256);
    assert.deepEqual(await fs.readFile(fixture.backupFile), before);
    assert.equal((await fs.readFile(fixture.canonicalFile, "utf8")).includes('"schemaVersion": "1.0"'), true);
    assert.deepEqual(await fs.readFile(fixture.activitiesFile), activityBefore);
    await assert.rejects(() => installCanonicalMediaLibrary(fixture), /historique 0\.1|already exists|EEXIST/i);
  } finally {
    await fs.rm(fixture.root, { recursive: true, force: true });
  }
});

test("le lecteur canonique est validé et projeté pour les consommateurs historiques", async () => {
  const fixture = await fixtureDirectory();
  try {
    await installCanonicalMediaLibrary(fixture);
    const loaded = readCanonicalMediaLibrary(fixture.canonicalFile);
    assert.equal(loaded.canonical.schemaVersion, "1.0");
    const projection = projectCanonicalLibrary(loaded.canonical);
    assert.equal(projection.assets[0].sourceIds[0], "source-1");
    assert.equal(projection.playables[0].storageKey, "sample.mp4");
    assert.equal((await fs.readFile(fixture.activitiesFile, "utf8")), JSON.stringify({ activities: [{ id: "activity-1", video: { id: "playable-1" } }] }));
  } finally {
    await fs.rm(fixture.root, { recursive: true, force: true });
  }
});
