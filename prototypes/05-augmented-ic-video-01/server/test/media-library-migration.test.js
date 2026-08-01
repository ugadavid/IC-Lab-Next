"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { migrateLegacyMediaLibrary } = require("../media-library-migration");

const timestamp = "2026-07-24T00:00:00.000Z";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function legacyFixture() {
  return {
    schemaVersion: "0.1",
    updatedAt: timestamp,
    assets: [
      { id: "asset-remote", title: "Remote", status: "active", sourceIds: ["source-remote"], playableIds: ["playable-remote"], defaultPlayableId: "playable-remote", provenance: { kind: "catalog-migration", catalogId: "catalog-remote" }, rights: {} },
      { id: "asset-local", title: "Local", status: "active", sourceIds: ["source-local"], playableIds: ["playable-local"], defaultPlayableId: "playable-local", provenance: { kind: "managed-local-copy", originalFileName: "local.mp4" }, rights: {} },
      { id: "asset-derived", title: "Derived", status: "active", sourceIds: ["source-derived"], playableIds: ["playable-derived"], defaultPlayableId: "playable-derived", provenance: { kind: "derived-anonymized", sourceAssetId: "asset-remote", sourcePreparationJobId: "job-old", method: "blur", status: "completed" }, rights: {} }
    ],
    sources: [
      { id: "source-remote", assetId: "asset-remote", title: "Remote", kind: "direct-url", provider: "direct", url: "https://example.test/video.mp4", sourceUrl: "https://example.test/video.mp4", mimeType: "video/mp4", availability: "declared", authorized: true, provenance: { kind: "catalog-migration" } },
      { id: "source-local", assetId: "asset-local", title: "Local", kind: "local-file", provider: "local", storageKey: "local.mp4", mimeType: "video/mp4", sizeBytes: 12, sha256: "a".repeat(64), availability: "available", authorized: true, provenance: { kind: "managed-local-copy", originalFileName: "local.mp4" } },
      { id: "source-derived", assetId: "asset-derived", title: "Derived", kind: "local-file", provider: "proto05-derived", storageKey: "derived.mp4", mimeType: "video/mp4", sizeBytes: 13, sha256: "b".repeat(64), availability: "available", authorized: true, provenance: { kind: "derived-anonymized", sourceAssetId: "asset-remote", sourcePreparationJobId: "job-old", method: "blur", status: "completed" } }
    ],
    playables: [
      { id: "playable-remote", assetId: "asset-remote", sourceId: "source-remote", kind: "direct-url", provider: "direct", status: "available", availability: "available", url: "https://example.test/video.mp4", mimeType: "video/mp4", durationMs: 1000 },
      { id: "playable-local", assetId: "asset-local", sourceId: "source-local", kind: "local-file", provider: "local", status: "available", availability: "available", storageKey: "local.mp4", url: "/internal/local.mp4", mimeType: "video/mp4", sizeBytes: 12, sha256: "a".repeat(64) },
      { id: "playable-derived", assetId: "asset-derived", sourceId: "source-derived", kind: "local-file", provider: "proto05-derived", status: "available", availability: "available", storageKey: "derived.mp4", url: "/internal/derived.mp4", mimeType: "video/mp4", sizeBytes: 13, sha256: "b".repeat(64) }
    ]
  };
}

function snapshot(statusLocal = "present", statusDerived = "absent") {
  return { observations: [{ storageKey: "local.mp4", status: statusLocal }, { storageKey: "derived.mp4", status: statusDerived }] };
}

function migrate(legacy = legacyFixture(), availability = snapshot(), options = {}) {
  return migrateLegacyMediaLibrary({ legacyDocument: legacy, availabilitySnapshot: availability, options: { defaultTimestamp: timestamp, ...options } });
}

test("migre séparément asset, source et playable sans listes persistées", () => {
  const result = migrate();
  assert.equal(result.sourceVersion, "0.1");
  assert.equal(result.targetVersion, "1.0");
  assert.equal(result.valid, true);
  assert.equal(result.readable, true);
  assert.equal(result.writeEligible, true);
  assert.equal(result.output.assets.some(asset => "sourceIds" in asset || "playableIds" in asset), false);
  assert.equal(result.output.playables.find(item => item.id === "playable-local").location.storageKey, "local.mp4");
  assert.deepEqual(result.statistics, { assets: 3, sources: 3, playables: 3, localPresent: 1, localMissing: 1, treatments: 0, deferredTreatments: 1, omittedEntries: 0 });
});

test("un fichier local absent devient missing-local sans supprimer l’asset", () => {
  const result = migrate();
  const playable = result.output.playables.find(item => item.id === "playable-derived");
  assert.equal(playable.availability, "missing-local");
  assert.equal(playable.availabilityReason, "missing-file");
  assert.ok(result.output.assets.some(item => item.id === "asset-derived"));
  assert.ok(result.validationResult.unavailable.some(item => item.code === "PLAYABLE_UNAVAILABLE"));
});

test("un traitement historique incomplet reste différé sans faux MediaTreatment", () => {
  const result = migrate();
  assert.equal(result.output.treatments.length, 0);
  assert.ok(result.diagnostics.some(item => item.code === "TREATMENT_HISTORY_ABSENT"));
});

test("la provenance anonymisée propre devient derivationTypes sans héritage automatique", () => {
  const legacy = legacyFixture();
  legacy.assets[0].provenance = { kind: "catalog-migration" };
  legacy.assets[2].provenance = { kind: "derived-anonymized", sourceAssetId: "asset-remote" };
  const result = migrate(legacy);
  assert.deepEqual(result.output.assets.find(item => item.id === "asset-remote").derivationTypes, []);
  assert.deepEqual(result.output.assets.find(item => item.id === "asset-derived").derivationTypes, ["anonymization"]);
});

test("les références d’activités sont produites sans modifier les activités", () => {
  const activities = [{ id: "activity-a", video: { id: "playable-local" } }, { id: "activity-b", videoRef: { schemaVersion: "0.1", assetId: "asset-remote", playableId: "playable-remote" }, video: { id: "playable-remote" } }];
  const before = clone(activities);
  const result = migrate(legacyFixture(), snapshot(), { activities });
  assert.deepEqual(activities, before);
  assert.deepEqual(result.activityReferenceMappings.map(item => item.status), ["resolved", "resolved"]);
});

test("les options et l’instantané de disponibilité ne sont pas mutés", () => {
  const legacy = legacyFixture();
  const availability = snapshot();
  const options = { defaultTimestamp: timestamp };
  const beforeLegacy = clone(legacy);
  const beforeAvailability = clone(availability);
  const beforeOptions = clone(options);
  migrateLegacyMediaLibrary({ legacyDocument: legacy, availabilitySnapshot: availability, options });
  assert.deepEqual(legacy, beforeLegacy);
  assert.deepEqual(availability, beforeAvailability);
  assert.deepEqual(options, beforeOptions);
});

test("deux exécutions identiques ne partagent pas de sous-objets mutables", () => {
  const first = migrate();
  const second = migrate();
  assert.deepEqual(first, second);
  first.output.assets[0].rights.changed = true;
  assert.equal(second.output.assets[0].rights.changed, undefined);
});

test("l’ordre des collections historiques ne change pas la sortie canonique", () => {
  const original = legacyFixture();
  const reordered = clone(original);
  reordered.assets.reverse();
  reordered.sources.reverse();
  reordered.playables.reverse();
  assert.deepEqual(migrate(original).output, migrate(reordered).output);
});

test("un titre ou une métadonnée technique modifiés ne changent pas les identifiants", () => {
  const first = migrate().output;
  const changed = legacyFixture();
  changed.assets[0].title = "Titre changé";
  changed.assets[0].metadata = { width: 1920, height: 1080 };
  const second = migrate(changed).output;
  assert.deepEqual(first.assets.map(item => item.id), second.assets.map(item => item.id));
  assert.deepEqual(first.sources.map(item => item.id), second.sources.map(item => item.id));
  assert.deepEqual(first.playables.map(item => item.id), second.playables.map(item => item.id));
});

test("un document inconnu, canonique ou incomplet est refusé sans correction silencieuse", () => {
  assert.equal(migrateLegacyMediaLibrary({ legacyDocument: { schemaVersion: "9.0" } }).migrated, false);
  assert.ok(migrateLegacyMediaLibrary({ legacyDocument: { schemaVersion: "1.0", assets: [], sources: [], playables: [], treatments: [], folders: [], tags: [] } }).diagnostics.some(item => item.code === "CANONICAL_SOURCE_NOT_REMIGRATED"));
  assert.ok(migrateLegacyMediaLibrary({ legacyDocument: { schemaVersion: "0.1", assets: [], sources: [] } }).diagnostics.some(item => item.code === "SOURCE_VERSION_INVALID"));
});

test("une collision d’identifiant historique est bloquante et diagnostiquée", () => {
  const legacy = legacyFixture();
  legacy.assets[1].id = legacy.assets[0].id;
  const result = migrate(legacy);
  assert.equal(result.migrated, false);
  assert.ok(result.diagnostics.some(item => item.code === "DUPLICATE_HISTORICAL_ID"));
});
