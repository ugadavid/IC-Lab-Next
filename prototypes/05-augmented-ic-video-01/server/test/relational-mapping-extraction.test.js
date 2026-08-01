"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const prototypeDirectory = path.resolve(__dirname, "../..");
const pureMappingFile = path.join(prototypeDirectory, "server", "proto05-relational-mapping.mjs");
const historicalToolNames = [
  "001_proto05_json_to_mariadb_dry_run.mjs",
  "003_proto05_json_to_mariadb_apply.mjs",
  "005_proto05_document_metadata_migration.mjs",
  "007_proto05_targeted_json_mariadb_reconciliation.mjs"
];

function canonicalSnapshot() {
  const updatedAt = "2026-01-01T00:00:00.000Z";
  return {
    activities: { schemaVersion: "0.1", updatedAt, activities: [] },
    activityLibrary: { schemaVersion: "0.1", updatedAt, folders: [], assignments: {} },
    mediaLibrary: {
      schemaVersion: "1.0",
      updatedAt,
      assets: [],
      sources: [],
      playables: [],
      treatments: [],
      folders: [],
      tags: []
    },
    videoCatalog: { videos: [] },
    languages: { languages: [] }
  };
}

function plainMapping(result) {
  return {
    tables: [...result.model.tables.values()].map(table => ({
      name: table.name,
      pk: table.pk,
      fks: table.fks,
      order: table.order,
      rows: table.rows
    })),
    sources: result.sources,
    diagnostics: result.diagnostics,
    observations: result.observations
  };
}

test("le noyau relationnel de production est strictement dépourvu d'accès fichier", async () => {
  const source = fs.readFileSync(pureMappingFile, "utf8");
  for (const forbidden of [
    "node:fs",
    "node:path",
    "readFile",
    "writeFile",
    "existsSync",
    "statSync",
    '"SOURCE_MISSING"',
    "--source-root"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  const module = await import(pathToFileURL(pureMappingFile).href);
  assert.deepEqual(Object.keys(module).sort(), [
    "TABLE_DEFINITIONS",
    "relationalModelFromCanonicalSnapshot",
    "stableStringify"
  ]);
});

test("le repository MariaDB charge le mapping de production sans dépendre de 001", () => {
  const writer = fs.readFileSync(path.join(prototypeDirectory, "server", "proto05-mariadb-write.js"), "utf8");
  assert.match(writer, /server["'],\s*[\r\n\s]*["']proto05-relational-mapping\.mjs/);
  assert.doesNotMatch(writer, /001_proto05_json_to_mariadb_dry_run|database["'],\s*[\r\n\s]*["']migrations/);
});

test("le modèle extrait conserve ses empreintes relationnelles déterministes", async () => {
  const pure = await import(pathToFileURL(pureMappingFile).href);
  const extracted = pure.relationalModelFromCanonicalSnapshot(canonicalSnapshot(), {
    observeLocalPlayable: () => ({ exists: false, actualSize: null })
  });
  const sha256 = value => crypto.createHash("sha256").update(pure.stableStringify(value)).digest("hex");
  assert.equal(
    sha256(plainMapping(extracted)),
    "591a9d5cafedc7bcf8f5651cf08b13e25f6deeb242feb62fd3adc4e437d9bfd2"
  );
  assert.equal(
    sha256(pure.TABLE_DEFINITIONS),
    "332e695a686ac7eb51738b080405abf7cebd7c3a6be0f1dc70a40453ebe21b9b"
  );
});

test("la chaîne exécutable historique n'existe plus", () => {
  for (const name of historicalToolNames) {
    assert.equal(
      fs.existsSync(path.join(prototypeDirectory, "database", "migrations", name)),
      false,
      name
    );
  }
});
