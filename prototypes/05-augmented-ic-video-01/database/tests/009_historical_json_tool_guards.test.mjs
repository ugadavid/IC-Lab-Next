import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseArguments as parseInitialApply } from "../migrations/003_proto05_json_to_mariadb_apply.mjs";
import { parseArguments as parseMetadataMigration } from "../migrations/005_proto05_document_metadata_migration.mjs";
import { parseArguments as parseTargetedReconciliation } from "../migrations/007_proto05_targeted_json_mariadb_reconciliation.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(testDirectory, "../migrations");
const parsers = [
  ["003", parseInitialApply, []],
  ["005", parseMetadataMigration, []],
  ["007", parseTargetedReconciliation, ["--inspect"]]
];

test("chaque outil connecté refuse une cible absente avant toute autre action", () => {
  for (const [name, parse, args] of parsers) {
    assert.throws(
      () => parse(args),
      error => error.code === "HISTORICAL_TEST_DATABASE_REQUIRED",
      name
    );
  }
});

test("chaque outil connecté refuse explicitement la base métier réelle", () => {
  for (const [name, parse, args] of parsers) {
    assert.throws(
      () => parse([...args, "--database=ic_augmented_video"]),
      error => error.code === "HISTORICAL_PRODUCTION_DATABASE_FORBIDDEN",
      name
    );
  }
});

test("une cible explicite doit porter un nom de base de test Proto05", () => {
  for (const [name, parse, args] of parsers) {
    assert.throws(
      () => parse([...args, "--database=ic_dico"]),
      error => error.code === "HISTORICAL_TEST_DATABASE_NAME_REQUIRED",
      name
    );
  }
});

test("les bases temporaires Proto05 explicitement nommées restent acceptées", () => {
  assert.equal(
    parseInitialApply(["--verify-only", "--database=proto05_test_m171"]).database,
    "proto05_test_m171"
  );
  assert.equal(
    parseMetadataMigration(["--dry-run", "--database=proto05_m171_fixture"]).database,
    "proto05_m171_fixture"
  );
  assert.equal(
    parseTargetedReconciliation(["--inspect", "--database", "proto05_test_reconciliation"]).database,
    "proto05_test_reconciliation"
  );
});

test("les garde-fous précèdent plan, lecture de secrets et connexion dans chaque CLI", () => {
  const expectations = [
    ["003_proto05_json_to_mariadb_apply.mjs", "prepareValidatedPlan()"],
    ["005_proto05_document_metadata_migration.mjs", "prepareMetadataPlan()"],
    ["007_proto05_targeted_json_mariadb_reconciliation.mjs", "buildPlan()"]
  ];
  for (const [file, nextAction] of expectations) {
    const source = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");
    const main = source.slice(source.indexOf("async function main"));
    const guardIndex = main.indexOf("parseArguments(");
    assert.ok(guardIndex >= 0, file);
    assert.ok(guardIndex < main.indexOf(nextAction), file);
    for (const connectionCall of ["openConnection(", "openDatabase("]) {
      const connectionIndex = main.indexOf(connectionCall);
      if (connectionIndex >= 0) assert.ok(guardIndex < connectionIndex, file);
    }
  }
});
