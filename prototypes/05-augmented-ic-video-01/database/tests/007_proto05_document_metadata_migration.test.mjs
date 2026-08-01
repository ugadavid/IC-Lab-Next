import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLY_CONFIRMATION,
  DOCUMENTS,
  EXPECTED_PLAN_HASH,
  EXPECTED_SOURCE_SET_HASH,
  FORBIDDEN_SQL,
  INSTALL_CONFIRMATION,
  MetadataMigrationError,
  assertDestinationEmpty,
  buildInsertStatement,
  buildMetadataPlan,
  expectedProjection,
  isoToMariaUtc,
  mariaUtcToIso,
  metadataProjection,
  parseArguments,
  prepareMetadataPlan,
  reconcileMetadata,
  sourceFileSnapshot,
  strictIsoUtc
} from "../migrations/005_proto05_document_metadata_migration.mjs";

function canonicalDocuments() {
  return {
    activities: {
      schemaVersion: "0.1",
      updatedAt: "2026-07-26T17:30:42.426Z",
      activities: []
    },
    "activity-library": {
      schemaVersion: "0.1",
      updatedAt: "2026-07-26T20:07:58.978Z",
      folders: [],
      assignments: []
    },
    "video-catalog": {
      schemaVersion: "0.1",
      videos: []
    },
    "media-library": {
      schemaVersion: "1.0",
      updatedAt: "2026-07-26T18:39:12.425Z",
      assets: [],
      sources: [],
      playables: [],
      treatments: [],
      folders: [],
      tags: []
    },
    "language-catalog": {
      languages: []
    }
  };
}

function memoryPlan(documents = canonicalDocuments()) {
  return buildMetadataPlan(documents, { sourceSetHash: "memory-fixture" });
}

function databaseRows(plan) {
  return plan.rows.map(row => ({ ...row.database }));
}

test("le mode par défaut refuse une cible implicite", () => {
  assert.throws(
    () => parseArguments([]),
    error => error.code === "HISTORICAL_TEST_DATABASE_REQUIRED"
  );
});

test("les trois modes écrivants exigent tous les garde-fous", () => {
  for (const mode of ["install-schema", "rollback-test", "apply"]) {
    assert.throws(
      () => parseArguments([`--${mode}`, "--database=proto05_test_m171"]),
      error => (
        error instanceof MetadataMigrationError
        && error.code === "EXPECTED_PLAN_HASH_REQUIRED"
      )
    );
  }
});

test("les intentions DDL et données exactes sont acceptées", () => {
  const common = [
    "--database=proto05_test_m171",
    `--expected-plan-hash=${EXPECTED_PLAN_HASH}`,
    `--expected-source-set-hash=${EXPECTED_SOURCE_SET_HASH}`,
    "--backup-file=C:\\Temp\\proto05-m136.sql"
  ];
  assert.equal(parseArguments([
    "--install-schema",
    ...common,
    `--confirm=${INSTALL_CONFIRMATION}`
  ]).mode, "install-schema");
  assert.equal(parseArguments([
    "--apply",
    ...common,
    `--confirm=${APPLY_CONFIRMATION}`
  ]).mode, "apply");
});

test("un hash source différent est refusé avant toute connexion", () => {
  assert.throws(
    () => parseArguments([
      "--apply",
      "--database=proto05_test_m171",
      `--expected-plan-hash=${EXPECTED_PLAN_HASH}`,
      "--expected-source-set-hash=incorrect",
      `--confirm=${APPLY_CONFIRMATION}`,
      "--backup-file=C:\\Temp\\proto05-m136.sql"
    ]),
    error => (
      error instanceof MetadataMigrationError
      && error.code === "EXPECTED_SOURCE_SET_HASH_REQUIRED"
    )
  );
});

test("un hash individuel protégé différent est détecté sur les sources réelles", () => {
  assert.throws(
    () => sourceFileSnapshot(undefined, [{
      relativePath: "data/activities.json",
      sha256: "0".repeat(64)
    }]),
    error => (
      error instanceof MetadataMigrationError
      && error.code === "SOURCE_HASH_MISMATCH"
    )
  );
});

test("une base hors périmètre est refusée avant toute connexion", () => {
  assert.throws(
    () => parseArguments(["--verify-only", "--database=ic_dico"]),
    error => (
      error.code === "HISTORICAL_TEST_DATABASE_NAME_REQUIRED"
    )
  );
});

test("le plan réel conserve les checkpoints déterministes", () => {
  const plan = prepareMetadataPlan();
  assert.equal(plan.deterministicHash, EXPECTED_PLAN_HASH);
  assert.equal(plan.sourceSetHash, EXPECTED_SOURCE_SET_HASH);
  assert.equal(plan.totalDocuments, 5);
  assert.equal(plan.rowsPlanned, 4);
  assert.equal(plan.sourceFiles.length, 15);
  assert.deepEqual(
    plan.inventory.map(item => item.documentKey),
    DOCUMENTS.map(item => item.documentKey)
  );
});

test("deux constructions indépendantes du plan donnent le même hash", () => {
  const first = memoryPlan(structuredClone(canonicalDocuments()));
  const second = memoryPlan(structuredClone(canonicalDocuments()));
  assert.equal(first.deterministicHash, second.deterministicHash);
  assert.deepEqual(first.payload, second.payload);
});

test("les quatre lignes minimales et l'absence du timestamp vidéo sont planifiées", () => {
  const plan = memoryPlan();
  assert.deepEqual(
    plan.rows.map(row => [row.documentKey, row.schemaVersion, row.updatedAt]),
    [
      ["activities", "0.1", "2026-07-26T17:30:42.426Z"],
      ["activity-library", "0.1", "2026-07-26T20:07:58.978Z"],
      ["media-library", "1.0", "2026-07-26T18:39:12.425Z"],
      ["video-catalog", "0.1", null]
    ]
  );
});

test("les timestamps UTC milliseconde font un aller-retour exact", () => {
  for (const value of [
    "2026-07-26T17:30:42.426Z",
    "2026-07-26T20:07:58.978Z",
    "2026-07-26T18:39:12.425Z"
  ]) {
    assert.equal(mariaUtcToIso(isoToMariaUtc(value)), value);
    assert.equal(strictIsoUtc(value, "fixture"), value);
  }
});

test("la conversion explicite reste stable quel que soit le fuseau Node", () => {
  const initialTimezone = process.env.TZ;
  try {
    for (const timezone of ["Pacific/Honolulu", "Asia/Tokyo"]) {
      process.env.TZ = timezone;
      assert.equal(
        mariaUtcToIso(isoToMariaUtc("2026-07-26T20:07:58.978Z")),
        "2026-07-26T20:07:58.978Z"
      );
    }
  } finally {
    if (initialTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = initialTimezone;
    }
  }
});

test("les timestamps ambigus ou sans millisecondes sont refusés", () => {
  for (const value of [
    "2026-07-26T17:30:42Z",
    "2026-07-26 17:30:42.426",
    "2026-07-26T19:30:42.426+02:00"
  ]) {
    assert.throws(
      () => strictIsoUtc(value, "fixture"),
      error => (
        error instanceof MetadataMigrationError
        && error.code === "INVALID_UTC_MILLISECOND_TIMESTAMP"
      )
    );
  }
});

test("un clone en mémoire avec une métadonnée racine inconnue est refusé", () => {
  const clone = structuredClone(canonicalDocuments());
  clone.activities.owner = "unexpected";
  assert.throws(
    () => memoryPlan(clone),
    error => (
      error instanceof MetadataMigrationError
      && error.code === "UNKNOWN_DOCUMENT_METADATA"
    )
  );
});

test("un clone avec timestamp inventé pour le catalogue vidéo est refusé", () => {
  const clone = structuredClone(canonicalDocuments());
  clone["video-catalog"].updatedAt = "2026-07-26T00:00:00.000Z";
  assert.throws(
    () => memoryPlan(clone),
    error => (
      error instanceof MetadataMigrationError
      && error.code === "UNKNOWN_DOCUMENT_METADATA"
    )
  );
});

test("la projection conforme donne un bilan strictement nul", () => {
  const plan = memoryPlan();
  const rows = databaseRows(plan);
  assert.deepEqual(metadataProjection(rows), expectedProjection(plan));
  const result = reconcileMetadata(plan, rows);
  assert.equal(result.differences.length, 0);
  assert.equal(result.missingDocuments, 0);
  assert.equal(result.extraDocuments, 0);
  assert.equal(result.divergentValues, 0);
  assert.equal(result.precisionLosses, 0);
});

test("la comparaison détecte document manquant, supplémentaire et valeur divergente", () => {
  const plan = memoryPlan();
  const rows = databaseRows(plan);
  rows.shift();
  rows.push({
    document_key: "extra",
    schema_version: "9.9",
    source_updated_at_utc: null
  });
  rows[0].schema_version = "9.8";
  const result = reconcileMetadata(plan, rows);
  assert.equal(result.missingDocuments, 1);
  assert.equal(result.extraDocuments, 1);
  assert.equal(result.divergentValues, 1);
});

test("une destination déjà peuplée est refusée", () => {
  assert.doesNotThrow(() => assertDestinationEmpty(0));
  assert.throws(
    () => assertDestinationEmpty(1),
    error => (
      error instanceof MetadataMigrationError
      && error.code === "DESTINATION_NOT_EMPTY"
    )
  );
});

test("le SQL d'insertion est paramétré et sans construction interdite", () => {
  const sql = buildInsertStatement();
  assert.equal(
    sql,
    "INSERT INTO `data_projection_metadata` "
      + "(`document_key`, `schema_version`, `source_updated_at_utc`) "
      + "VALUES (?, ?, ?)"
  );
  assert.equal(FORBIDDEN_SQL.some(pattern => pattern.test(sql)), false);
});
