"use strict";

const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { runMediaLibraryDryRun, assertIsolatedOutputDirectory } = require("../media-library-dry-run");

const timestamp = "2026-07-24T00:00:00.000Z";

function legacyDocument() {
  return {
    schemaVersion: "0.1",
    updatedAt: timestamp,
    assets: [{ id: "asset-one", title: "One", status: "active", sourceIds: ["source-one"], playableIds: ["playable-one"], defaultPlayableId: "playable-one", provenance: { kind: "catalog-migration" }, rights: {} }],
    sources: [{ id: "source-one", assetId: "asset-one", title: "One", kind: "direct-url", provider: "direct", url: "https://example.test/one.mp4", mimeType: "video/mp4", availability: "declared", authorized: true, provenance: {} }],
    playables: [{ id: "playable-one", assetId: "asset-one", sourceId: "source-one", kind: "direct-url", provider: "direct", status: "available", availability: "available", url: "https://example.test/one.mp4", mimeType: "video/mp4" }]
  };
}

test("l’orchestrateur écrit uniquement les artefacts d’une sortie isolée", async () => {
  const sourceRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-dry-run-source-"));
  const outputRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-dry-run-output-"));
  const legacyFile = path.join(sourceRoot, "video-library.json");
  const mediaDirectory = path.join(sourceRoot, "media");
  await fsp.mkdir(mediaDirectory);
  await fsp.writeFile(legacyFile, `${JSON.stringify(legacyDocument(), null, 2)}\n`);
  const before = await fsp.readFile(legacyFile);
  const result = await runMediaLibraryDryRun({ legacyFile, mediaDirectory, outputDirectory: outputRoot, defaultTimestamp: timestamp });
  assert.equal(result.dryRunExecuted, true);
  assert.equal(result.realMigrationPerformed, false);
  assert.equal(result.persistedInFunctionalLocation, false);
  assert.equal(result.sourceUnchanged, true);
  assert.equal(result.determinism.equal, true);
  assert.deepEqual(await fsp.readFile(legacyFile), before);
  assert.deepEqual((await fsp.readdir(outputRoot)).sort(), ["activity-reference-mappings.json", "entity-mappings.json", "media-library.canonical.json", "migration.result.json"]);
  const canonical = JSON.parse(await fsp.readFile(path.join(outputRoot, "media-library.canonical.json"), "utf8"));
  assert.equal(canonical.schemaVersion, "1.0");
  await fsp.rm(sourceRoot, { recursive: true, force: true });
  await fsp.rm(outputRoot, { recursive: true, force: true });
});

test("l’orchestrateur refuse une sortie fonctionnelle ou déjà remplie", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-dry-run-guard-"));
  const source = path.join(root, "source.json");
  const data = path.join(root, "data");
  const output = path.join(root, "output");
  await fsp.writeFile(source, "{}");
  await fsp.mkdir(data);
  await assert.rejects(() => assertIsolatedOutputDirectory(path.dirname(source), [source]), /fonctionnelle/);
  await fsp.mkdir(output);
  await fsp.writeFile(path.join(output, "existing"), "x");
  await assert.rejects(() => assertIsolatedOutputDirectory(output, [data]), /vide/);
  await fsp.rm(root, { recursive: true, force: true });
});
