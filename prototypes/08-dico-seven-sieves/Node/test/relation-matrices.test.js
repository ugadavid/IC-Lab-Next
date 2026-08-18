"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const assetDirectory = path.resolve(__dirname, "../../../../reports/assets/211_dico_ic_consultation_workbench_matrices");
const information = JSON.parse(fs.readFileSync(path.join(assetDirectory, "information_data_relation_matrix.json"), "utf8"));
const nuit = JSON.parse(fs.readFileSync(path.join(assetDirectory, "nuit_relation_matrix.json"), "utf8"));
const semantics = fs.readFileSync(path.join(assetDirectory, "relation_scoring_semantics.md"), "utf8");

function validateMatrix(matrix, expectedFormIds, expectedExisting) {
  assert.equal(matrix.pairs.length, 10);
  assert.equal(new Set(matrix.pairs.map((item) => item.pair)).size, 10);
  const observedIds = new Set();
  for (const item of matrix.pairs) {
    assert.equal(item.forms.length, 2);
    const ids = item.forms.map((form) => Number(form.id));
    assert.equal(item.pair, [...ids].sort((left, right) => left - right).join(":"));
    ids.forEach((id) => observedIds.add(id));
    assert.ok(["existing", "proposed"].includes(item.status));
    assert.ok(["COGNATE_STRONG", "COGNATE_WEAK", "FALSE_FRIEND", "RELATED_FORM"].includes(item.proposed_type));
    assert.ok(item.proposed_score >= 0 && item.proposed_score <= 1);
    assert.ok(item.proposed_confidence >= 0 && item.proposed_confidence <= 1);
    assert.equal(typeof item.justification, "string");
    assert.ok(item.justification.length > 20);
    assert.ok(["low", "medium", "high"].includes(item.uncertainty));
    assert.equal(item.human_validation_required, item.status === "proposed");
  }
  assert.deepEqual([...observedIds].sort((left, right) => left - right), expectedFormIds);
  assert.equal(matrix.pairs.filter((item) => item.status === "existing").length, expectedExisting);
}

test("INFORMATION_DATA matrix preserves four real relations and proposes exactly six missing pairs", () => {
  validateMatrix(information, [6, 7, 8, 9, 10], 4);
  assert.deepEqual(information.pairs.filter((item) => item.status === "existing").map((item) => item.current_relation.id), [5, 6, 7, 8]);
  assert.equal(information.pairs.filter((item) => item.status === "proposed").every((item) => item.proposed_provenance === "human_review_mission212"), true);
});

test("NUIT matrix uses the five real form ids and keeps all ten pairs proposed", () => {
  validateMatrix(nuit, [1625, 1626, 1627, 1628, 1629], 0);
  assert.equal(nuit.pairs.every((item) => item.current_relation === null), true);
  assert.equal(nuit.pairs.every((item) => item.proposed_type === "COGNATE_WEAK"), true);
});

test("scoring note separates score, confidence, provenance and unresolved ambiguity", () => {
  assert.match(semantics, /force ou la qualité pédagogique/);
  assert.match(semantics, /confiance dans l'annotation/);
  assert.match(semantics, /human_review_mission212/);
  assert.match(semantics, /RELATED_FORM/);
  assert.match(semantics, /aucune formule de score n'est stabilisée/);
});
