"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { DECISIONS, classifyState, loadPlan, parseArgs } = require("../scripts/normalize-semantic-domains-c");

test("le plan C distingue exactement 36 modifications et 87 conservations", () => {
  const plan = loadPlan();
  assert.equal(plan.groups.length, 19);
  assert.equal(plan.cIds.length, 123);
  assert.equal(DECISIONS.length, 36);
  assert.equal(plan.changedIds.length, 36);
  assert.equal(plan.conservedIds.length, 87);
});

test("les décisions de conservation explicites ont les effectifs attendus", () => {
  const plan = loadPlan();
  const conserved = new Set(plan.conservedIds);
  const group = (domain) => plan.groups.find((item) => item.current_value_exact === domain).entry_ids.filter((id) => conserved.has(id));
  assert.equal(group("action").length, 32);
  assert.deepEqual(group("activité"), [286]);
  assert.equal(group("nature").length, 16);
  assert.equal(group("qualité").length, 28);
  assert.equal(group("quantité").length, 9);
  assert.deepEqual(group("temps"), [108]);
});

test("les 36 clés, sources et cibles correspondent aux décisions humaines", () => {
  const byId = new Map(DECISIONS.map((item) => [item.id, item]));
  assert.deepEqual(byId.get(331), { id: 331, entryKey: "BIODIVERSITE", oldValue: "ENVIRONMENT_BIODIVERSITY", newValue: "nature" });
  assert.deepEqual(byId.get(329), { id: 329, entryKey: "ETRE", oldValue: "VERB_TO_BE", newValue: "verbe auxiliaire" });
  assert.deepEqual(byId.get(258), { id: 258, entryKey: "FOOD_SUPPLY", oldValue: "économie", newValue: "alimentation" });
  assert.deepEqual(byId.get(203), { id: 203, entryKey: "PERSONNE", oldValue: "être", newValue: "personne" });
});

test("économie disparaît des trois décisions C sans inclure l’ID 28 de Mission 208", () => {
  const plan = loadPlan();
  assert.deepEqual(
    DECISIONS.filter((item) => item.oldValue === "économie").map((item) => [item.id, item.newValue]),
    [[126, "causalité"], [257, "agriculture"], [258, "alimentation"]]
  );
  assert.equal(plan.changedIds.includes(28), false);
});

test("la classification refuse toute combinaison partielle ou clé divergente", () => {
  const plan = loadPlan();
  const initial = plan.changedIds.map((id) => ({ id, entry_key: plan.byId.get(id).entryKey, semantic_domain: plan.byId.get(id).oldValue }));
  const final = plan.changedIds.map((id) => ({ id, entry_key: plan.byId.get(id).entryKey, semantic_domain: plan.byId.get(id).newValue }));
  assert.equal(classifyState(initial, plan), "initial");
  assert.equal(classifyState(final, plan), "final");
  assert.equal(classifyState([{ ...initial[0], semantic_domain: final[0].semantic_domain }, ...initial.slice(1)], plan), "partial");
  assert.equal(classifyState([{ ...initial[0], entry_key: "AUTRE_CLE" }, ...initial.slice(1)], plan), "partial");
});

test("les modes exigent une sauvegarde explicite", () => {
  assert.throws(() => parseArgs(["--apply"]), /backup/);
  assert.deepEqual(parseArgs(["--check", "--backup", "backup.json"]), { mode: "check", backupPath: "backup.json" });
});

test("chaque écriture cible ID, clé et domaine avec comparaisons binaires", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/normalize-semantic-domains-c.js"), "utf8");
  assert.match(source, /WHERE id=\? AND BINARY entry_key=BINARY \? AND BINARY semantic_domain=BINARY \?/);
  assert.doesNotMatch(source, /WHERE semantic_domain\s*=/);
});
