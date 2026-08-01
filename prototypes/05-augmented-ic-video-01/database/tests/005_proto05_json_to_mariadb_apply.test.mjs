import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLY_CONFIRMATION,
  EXPECTED_PLAN_HASH,
  FORBIDDEN_SQL,
  MigrationError,
  buildInsertStatement,
  parseArguments,
  prepareValidatedPlan
} from "../migrations/003_proto05_json_to_mariadb_apply.mjs";

test("le mode par défaut refuse une cible implicite", () => {
  assert.throws(
    () => parseArguments([]),
    error => error.code === "HISTORICAL_TEST_DATABASE_REQUIRED"
  );
});

test("le mode apply refuse une intention incomplète", () => {
  assert.throws(
    () => parseArguments(["--apply", "--database=proto05_test_m171"]),
    error => error instanceof MigrationError && error.code === "EXPECTED_HASH_REQUIRED"
  );
});

test("le mode apply exige la base, le hash, la confirmation et la sauvegarde exacts", () => {
  const options = parseArguments([
    "--apply",
    "--database=proto05_test_m171",
    `--expected-plan-hash=${EXPECTED_PLAN_HASH}`,
    `--confirm=${APPLY_CONFIRMATION}`,
    "--backup-file=C:\\Temp\\proto05.sql"
  ]);
  assert.equal(options.mode, "apply");
  assert.equal(options.database, "proto05_test_m171");
  assert.equal(options.expectedPlanHash, EXPECTED_PLAN_HASH);
  assert.equal(options.confirmation, APPLY_CONFIRMATION);
});

test("une autre base est refusée avant toute connexion", () => {
  assert.throws(
    () => parseArguments(["--verify-only", "--database=ic_dico"]),
    error => error.code === "HISTORICAL_TEST_DATABASE_NAME_REQUIRED"
  );
});

test("le plan partagé conserve le checkpoint Mission 133", () => {
  const plan = prepareValidatedPlan();
  assert.equal(plan.result.deterministicHash, EXPECTED_PLAN_HASH);
  assert.equal(plan.result.totalPreparedRows, 264);
  assert.equal(plan.result.tablesWithRows, 27);
  assert.equal(plan.result.blockers, 0);
  assert.equal(plan.result.warnings, 22);
});

test("le SQL d’insertion est strict et sans construction interdite", () => {
  const sql = buildInsertStatement("activities", ["id", "title"]);
  assert.equal(sql, "INSERT INTO `activities` (`id`, `title`) VALUES (?, ?)");
  assert.equal(FORBIDDEN_SQL.some(pattern => pattern.test(sql)), false);
});
