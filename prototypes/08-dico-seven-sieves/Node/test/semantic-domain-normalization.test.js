"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  EXPECTED_MAPPINGS,
  classifyState,
  loadPlan,
  parseArgs,
} = require("../scripts/normalize-semantic-domains-ab");
const {
  SEMANTIC_DOMAIN_INSTRUCTIONS,
  buildPrompts,
  parseAndValidateCandidateJson,
} = require("../src/admin-ai-domain");
const { buildTextPrompts } = require("../src/admin-ai-text");

test("le plan A/B contient exactement 19 valeurs et 38 IDs", () => {
  const plan = loadPlan();
  assert.equal(EXPECTED_MAPPINGS.length, 19);
  assert.equal(plan.mappings.length, 19);
  assert.equal(plan.ids.length, 38);
  assert.equal(plan.mappings.filter((item) => item.category === "A").length, 14);
  assert.equal(plan.mappings.filter((item) => item.category === "B").length, 5);
});

test("la classification distingue strictement les états initial, final et partiel", () => {
  const plan = loadPlan();
  const initial = plan.ids.map((id) => ({ id, semantic_domain: plan.byId.get(id).oldValue }));
  const final = plan.ids.map((id) => ({ id, semantic_domain: plan.byId.get(id).newValue }));
  assert.equal(classifyState(initial, plan), "initial");
  assert.equal(classifyState(final, plan), "final");
  assert.equal(classifyState([{ ...initial[0], semantic_domain: final[0].semantic_domain }, ...initial.slice(1)], plan), "partial");
});

test("les modes mutateurs exigent une sauvegarde explicite", () => {
  assert.throws(() => parseArgs(["--apply"]), /backup/);
  assert.deepEqual(parseArgs(["--check", "--backup", "backup.json"]), { mode: "check", backupPath: "backup.json" });
});

test("chaque écriture est ciblée par ID et comparaison binaire", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/normalize-semantic-domains-ab.js"), "utf8");
  assert.match(source, /WHERE id=\? AND BINARY semantic_domain=BINARY \?/);
  assert.doesNotMatch(source, /WHERE semantic_domain\s*=/);
});

test("la consigne de domaine est réellement partagée et laisse le champ libre", () => {
  const request = { domain: "climat", level: "B1", count: 10, languages: ["fr"], parts_of_speech: ["noun"] };
  const domain = buildPrompts(request);
  const text = buildTextPrompts({ unknown_words: ["biosphère"], languages: ["fr"] });
  for (const instruction of SEMANTIC_DOMAIN_INSTRUCTIONS) {
    assert.ok(domain.system.includes(instruction));
    assert.ok(text.system.includes(instruction));
  }
  assert.match(domain.system, /français naturel/);
  assert.match(domain.system, /ni anglais, ni majuscules techniques, ni underscores/);
  const parsed = parseAndValidateCandidateJson({ candidates: [{
    entry_key: "BIOSPHERE",
    gloss_fr: "ensemble des milieux vivants",
    gloss_en: "biosphere",
    semantic_domain: "écologie humaine",
    forms: [{ language_code: "fr", lemma: "biosphère", part_of_speech: "noun" }],
  }] }, request);
  assert.equal(parsed.candidates[0].semantic_domain, "écologie humaine");
});

test("les trois interfaces présentent l’aide discrète et leurs versions baby-step", () => {
  const root = path.resolve(__dirname, "../../admin");
  const main = fs.readFileSync(path.join(root, "index-admin-0.1.html"), "utf8");
  const domain = fs.readFileSync(path.join(root, "index-admin-ai-domain-0.1.html"), "utf8");
  const text = fs.readFileSync(path.join(root, "index-admin-ai-text-0.1.html"), "utf8");
  for (const html of [main, domain, text]) assert.match(html, /français naturel[^<]*minuscules[^<]*accents[^<]*espaces/);
  assert.match(main, /app-version" content="0\.1\.8"/);
  assert.match(domain, /app-version" content="0\.1\.4"/);
  assert.match(text, /app-version" content="0\.1\.14"/);
});
