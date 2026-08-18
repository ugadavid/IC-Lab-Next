"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const scriptPath = path.resolve(__dirname, "../scripts/apply-policy-aligned-concept-cleanup.js");
const migration = require(scriptPath);

test("le plan permanent valide exactement les 56 suppressions et 41 renommages", () => {
  const { policy } = migration.loadPlan();
  const state = migration.buildPlanState(policy);
  assert.equal(state.deletes.size, 56);
  assert.equal(state.renames.size, 41);
  assert.equal(state.mutationIds.length, 97);
  assert.equal(state.retainedIds.length, 41);
  assert.equal([...state.deletes.keys()].some((id) => state.renames.has(id)), false);
});

test("la classification refuse tout état partiel", () => {
  const { policy } = migration.loadPlan();
  const state = migration.buildPlanState(policy);
  const initialRows = [
    ...[...state.deletes].map(([id, entry_key]) => ({ id, entry_key })),
    ...[...state.renames].map(([id, keys]) => ({ id, entry_key: keys.oldKey })),
  ];
  const finalRows = [...state.renames].map(([id, keys]) => ({ id, entry_key: keys.finalKey }));
  assert.equal(migration.classifyEntryState(initialRows, state), "initial");
  assert.equal(migration.classifyEntryState(finalRows, state), "final");
  assert.equal(migration.classifyEntryState(initialRows.slice(1), state), "partial_or_unknown");
});

test("la canonicalisation détecte les cibles françaises attendues", () => {
  assert.equal(migration.canonicalize("étudiant"), "ETUDIANT");
  assert.equal(migration.canonicalize("s’élever"), "S_ELEVER");
  assert.equal(migration.canonicalize("parce que"), "PARCE_QUE");
});

test("les modes mutateurs exigent une sauvegarde", () => {
  assert.throws(() => migration.parseArguments(["node", scriptPath, "--apply"]), /--backup/);
  assert.throws(() => migration.parseArguments(["node", scriptPath, "--rollback"]), /--backup/);
  assert.equal(migration.parseArguments(["node", scriptPath, "--check"]).mode, "--check");
});

test("le script permanent ne lit jamais refined_human_review.csv", () => {
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.equal(source.includes("refined_human_review.csv"), false);
});
