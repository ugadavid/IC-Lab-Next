"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const prototypeDirectory = path.resolve(__dirname, "../..");
const pureMappingFile = path.join(prototypeDirectory, "server", "proto05-relational-mapping.mjs");
const historicalCliFile = path.join(
  prototypeDirectory,
  "database",
  "migrations",
  "001_proto05_json_to_mariadb_dry_run.mjs"
);

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

test("le modèle extrait reste exactement équivalent au contrat exporté par le CLI 001", async () => {
  const pure = await import(pathToFileURL(pureMappingFile).href);
  const historical = await import(pathToFileURL(historicalCliFile).href);
  const snapshot = canonicalSnapshot();
  const beforeContract = historical.relationalModelFromCanonicalSnapshot(snapshot, { prototypeDirectory });
  const extracted = pure.relationalModelFromCanonicalSnapshot(snapshot, {
    observeLocalPlayable: () => ({ exists: false, actualSize: null })
  });
  assert.equal(
    pure.stableStringify(plainMapping(extracted)),
    historical.stableStringify(plainMapping(beforeContract))
  );
  assert.equal(
    pure.stableStringify(pure.TABLE_DEFINITIONS),
    historical.stableStringify(historical.TABLE_DEFINITIONS)
  );
});

test("le CLI 001 reste autonome et hors du chargement runtime", () => {
  const result = spawnSync(process.execPath, [historicalCliFile, "--help"], {
    cwd: prototypeDirectory,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /read-only/);
});
