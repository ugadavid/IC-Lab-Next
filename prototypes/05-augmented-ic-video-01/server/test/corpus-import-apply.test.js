"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { APPLY_CONFIRMATION, assertApplyInputs, comparePlanToCurrent } = require("../corpus-import-apply");
const { canonicalJson, sha256 } = require("../corpus-import-plan");

function plan(overrides = {}) {
  const core = { corpusId: "repli4c-24-videos", createTechnicalMedia: [], conflicts: [], blockers: [], ...overrides };
  return { ...core, planHash: sha256(canonicalJson(core)) };
}

test("apply refuse une confirmation absente", () => assert.throws(() => assertApplyInputs({ manifest: { corpus: { id: "repli4c-24-videos" } }, plan: plan(), expectedPlanHash: plan().planHash }), /Confirmation/));
test("apply refuse une confirmation incorrecte", () => assert.throws(() => assertApplyInputs({ manifest: { corpus: { id: "repli4c-24-videos" } }, plan: plan(), expectedPlanHash: plan().planHash, confirmation: "oui" }), /Confirmation/));
test("apply refuse un hash attendu incorrect", () => assert.throws(() => assertApplyInputs({ manifest: { corpus: { id: "repli4c-24-videos" } }, plan: plan(), expectedPlanHash: "0".repeat(64), confirmation: APPLY_CONFIRMATION }), /hash attendu/));
test("apply refuse un plan modifié après calcul du hash", () => { const value = plan(); value.corpusId = "altéré"; assert.throws(() => assertApplyInputs({ manifest: { corpus: { id: "altéré" } }, plan: value, expectedPlanHash: value.planHash, confirmation: APPLY_CONFIRMATION }), /contenu du plan/); });
test("apply refuse un autre corpus", () => { const value = plan(); assert.throws(() => assertApplyInputs({ manifest: { corpus: { id: "autre" } }, plan: value, expectedPlanHash: value.planHash, confirmation: APPLY_CONFIRMATION }), /même corpus/); });
test("apply accepte le contrat exact", () => { const value = plan(); assert.doesNotThrow(() => assertApplyInputs({ manifest: { corpus: { id: value.corpusId } }, plan: value, expectedPlanHash: value.planHash, confirmation: APPLY_CONFIRMATION })); });
test("la comparaison refuse un snapshot périmé", () => assert.throws(() => comparePlanToCurrent(plan(), plan({ marker: true })), /snapshot/));
test("la comparaison refuse un blocker", () => { const value = plan({ blockers: [{ code: "X" }] }); assert.throws(() => comparePlanToCurrent(value, value), /blocker/); });
test("la comparaison refuse un conflit", () => { const value = plan({ conflicts: [{ code: "X" }] }); assert.throws(() => comparePlanToCurrent(value, value), /conflit/); });
test("la comparaison refuse source remote", () => { const item = { source: { kind: "remote" }, playable: { kind: "hls" } }; const value = plan({ createTechnicalMedia: [item] }); assert.throws(() => comparePlanToCurrent(value, value), /HLS/); });
test("la comparaison accepte uniquement HLS", () => { const item = { source: { kind: "hls" }, playable: { kind: "hls" } }; const value = plan({ createTechnicalMedia: [item] }); assert.doesNotThrow(() => comparePlanToCurrent(value, value)); });
