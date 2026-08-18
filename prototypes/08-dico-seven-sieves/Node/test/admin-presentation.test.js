const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createRepository } = require("../src/repository");
const { createApp } = require("../server");
const {
  confidenceLabel,
  entryPublicLabel,
  provenanceLabel,
  sortEntryForms,
} = require("../../admin/js/admin-entry-0.1.1.js");
const {
  CANONICAL_SOURCE_LABEL,
  EXPECTED_FORMS,
  validateTargetForms,
} = require("../scripts/correct-information-data-source-label.js");

async function withServer(repository, callback) {
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("model summary calculates central and English comparison coverage from database queries", async () => {
  const queries = [];
  const pool = {
    async query(sql) {
      queries.push(sql);
      if (queries.length === 1) {
        return [[{
          languages: 5, lexical_entries: 150, lexical_forms: 597, inflected_forms: 16,
          connector_helps: 12, form_relations: 70, pattern_rules: 1, ic_features: 8,
        }]];
      }
      return [[{ central_romance_entries: 115, comparison_english_entries: 109 }]];
    },
  };
  const model = await createRepository(pool).getAdminModelSummary();
  assert.equal(model.counts.lexical_entries, 150);
  assert.equal(model.counts.lexical_forms, 597);
  assert.deepEqual(model.coverage, {
    central_romance_entries: 115,
    comparison_english_entries: 109,
  });
  assert.match(queries[1], /MAX\(l\.code = 'fr'\)/);
  assert.match(queries[1], /has_fr AND has_es AND has_it AND has_pt AND has_en/);
});

test("read-only lexical entry endpoint exposes five forms and four relations with provenance fields", async () => {
  const forms = [
    { id: 1, language: "en", lemma: "information", source_label: "manual_seed", confidence_score: 0.98 },
    { id: 2, language: "es", lemma: "información", source_label: "manual_seed", confidence_score: 0.98 },
    { id: 3, language: "fr", lemma: "information", source_label: "manual_seed", confidence_score: 0.98 },
    { id: 4, language: "it", lemma: "informazione", source_label: "manual_seed", confidence_score: 0.98 },
    { id: 5, language: "pt", lemma: "informação", source_label: "manual_seed", confidence_score: 0.98 },
  ];
  const relations = [1, 2, 4, 5].map((target, index) => ({
    id: index + 1,
    source_form_id: 3,
    target_form_id: target,
    relation_type: "COGNATE_STRONG",
    score: 0.95 + index * 0.01,
    confidence_score: 0.98,
    source_label: "manual_seed",
    is_symmetric: true,
  }));
  await withServer({
    async getAdminLexicalEntry(entryKey) {
      assert.equal(entryKey, "INFORMATION_DATA");
      return { entry_key: entryKey, gloss_fr: "information, donnée communiquée", forms };
    },
    async getAdminRelationsForFormIds(ids) {
      assert.deepEqual(ids, [1, 2, 3, 4, 5]);
      return relations;
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/lexical-entry/INFORMATION_DATA`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.entry.forms.length, 5);
    assert.equal(data.relations.length, 4);
    assert.equal(data.entry.forms.every((form) => Object.hasOwn(form, "source_label")), true);
    assert.equal(data.relations.every((relation) => Object.hasOwn(relation, "confidence_score")), true);
  });
});

test("presentation helpers humanize public codes and keep technical provenance separate", () => {
  assert.equal(entryPublicLabel("noun"), "Nom");
  assert.equal(entryPublicLabel("COGNATE_STRONG"), "Cognat fort");
  assert.equal(confidenceLabel(0.98), "Très élevée (0.980)");
  assert.equal(provenanceLabel("manual_seed"), "Corpus initial Dico-IC");
  assert.doesNotMatch(provenanceLabel("manual_seed"), /manual_seed/);
});

test("entry presentation enforces FR ES IT PT EN and keeps English last", () => {
  const forms = [
    { language: "en" }, { language: "it" }, { language: "fr" },
    { language: "pt" }, { language: "es" },
  ];
  assert.deepEqual(sortEntryForms(forms).map((form) => form.language), ["fr", "es", "it", "pt", "en"]);
  assert.equal(sortEntryForms(forms).at(-1).language, "en");
});

test("corrective script accepts only the five exact INFORMATION_DATA forms", () => {
  const rows = EXPECTED_FORMS.map((form, index) => ({
    id: index + 6,
    entry_key: "INFORMATION_DATA",
    source_label: null,
    ...form,
  }));
  assert.equal(CANONICAL_SOURCE_LABEL, "manual_seed");
  assert.equal(validateTargetForms(rows).length, 5);
  assert.throws(() => validateTargetForms(rows.slice(0, 4)), /5 formes attendues/);
});

test("entry assets distinguish non-Romance English and keep validation details collapsed", () => {
  const script = fs.readFileSync(path.join(__dirname, "../../admin/js/admin-entry-0.1.1.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../../admin/css/admin-entry-0.1.1.css"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../../admin/index-admin-entry-0.1.1.html"), "utf8");
  assert.match(script, /Langue de comparaison — non romane/);
  assert.match(script, /Code technique : \$\{form\.source_label\}/);
  assert.match(css, /\.entry-form-card\[data-language="en"\]/);
  assert.doesNotMatch(html, /class="model-limit"/);
  assert.match(html, /<details class="relation-help">/);
});
