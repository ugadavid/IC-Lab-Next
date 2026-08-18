const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  createRepository,
  languageClassification,
  summarizeLanguageCatalog,
} = require("../src/repository");
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
const {
  classifyState,
  validateLanguages,
  validateVolumes,
} = require("../scripts/migrate-language-documentation-status.js");

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

test("language repository separates the operational list from the documentary catalog", async () => {
  const operationalRows = [
    ["fr", "Français", "Romance", 1, 1],
    ["es", "Español", "Romance", 1, 1],
    ["it", "Italiano", "Romance", 1, 1],
    ["pt", "Português", "Romance", 1, 1],
    ["en", "English", "Germanic", 0, 1],
  ].map(([code, name, family, is_romance, is_active]) => ({ code, name, family, is_romance, is_active }));
  const documentedRows = operationalRows.map((language, index) => ({
    ...language,
    documentation_status: "DOCUMENTED",
    lexical_entries: [123, 126, 117, 115, 116][index],
    lexical_forms: [123, 126, 117, 115, 116][index],
    inflected_forms: index === 1 ? 16 : 0,
    connector_helps: index < 2 ? 6 : 0,
  }));
  const referencedRows = [
    ["ca", "Català"], ["gl", "Galego"], ["oc", "Occitan"], ["ro", "Română"],
    ["co", "Corsu"], ["sc", "Sardu"], ["rm", "Rumantsch"],
  ].map(([code, name]) => ({
    code, name, family: "Romance", is_romance: 1, is_active: 0,
    documentation_status: "REFERENCED", lexical_entries: 0, lexical_forms: 0,
    inflected_forms: 0, connector_helps: 0,
  }));
  const catalogRows = [...documentedRows.slice(0, 4), ...referencedRows, documentedRows[4]];
  const queries = [];
  const pool = {
    async execute(sql) {
      queries.push(sql);
      return [queries.length === 1 ? operationalRows : catalogRows];
    },
  };
  const repository = createRepository(pool);
  const operational = await repository.getLanguages();
  const catalog = await repository.getLanguageCatalog();

  assert.deepEqual(operational.map((language) => language.code), ["fr", "es", "it", "pt", "en"]);
  assert.deepEqual(catalog.summary, {
    total: 12,
    romance_documented: 4,
    non_romance_comparison: 1,
    romance_referenced: 7,
  });
  assert.match(queries[0], /is_active = 1[\s\S]*documentation_status = 'DOCUMENTED'/);
  assert.match(queries[0], /FIELD\(code, 'fr', 'es', 'it', 'pt', 'en'\)/);
  assert.match(queries[1], /FROM language l/);
  assert.match(queries[1], /'ca', 'gl', 'oc', 'ro', 'co', 'sc', 'rm', 'en'/);
  assert.deepEqual(catalog.languages.map((language) => language.code), [
    "fr", "es", "it", "pt", "ca", "gl", "oc", "ro", "co", "sc", "rm", "en",
  ]);
});

test("language catalog derives public classifications without mixing technical statuses", () => {
  assert.equal(languageClassification({ is_romance: true, documentation_status: "DOCUMENTED" }), "Langue romane documentée");
  assert.equal(languageClassification({ is_romance: false, documentation_status: "DOCUMENTED" }), "Langue de comparaison — non romane");
  assert.equal(languageClassification({ is_romance: true, documentation_status: "REFERENCED" }), "Langue romane référencée — prête à documenter");
  assert.deepEqual(summarizeLanguageCatalog([
    ...Array.from({ length: 4 }, () => ({ is_romance: true, documentation_status: "DOCUMENTED" })),
    ...Array.from({ length: 7 }, () => ({ is_romance: true, documentation_status: "REFERENCED" })),
    { is_romance: false, documentation_status: "DOCUMENTED" },
  ]), { total: 12, romance_documented: 4, non_romance_comparison: 1, romance_referenced: 7 });
});

test("language migration validates the five historical rows and refuses partial schema state", () => {
  const rows = [
    [1, "fr", "Français", "Romance", 1],
    [2, "es", "Español", "Romance", 1],
    [3, "it", "Italiano", "Romance", 1],
    [4, "pt", "Português", "Romance", 1],
    [5, "en", "English", "Germanic", 0],
  ].map(([id, code, name, family, is_romance]) => ({
    id, code, name, family, is_romance, is_active: 1, documentation_status: "DOCUMENTED",
  }));
  assert.equal(validateLanguages(rows, true).length, 5);
  assert.throws(() => validateLanguages(rows.map((row, index) => (
    index === 0 ? { ...row, documentation_status: "REFERENCED" } : row
  )), true), /ne porte pas le statut DOCUMENTED/);
  assert.doesNotThrow(() => validateVolumes({
    languages: 5, lexical_entries: 150, lexical_forms: 597, inflected_forms: 16,
    connector_helps: 12, form_relations: 70, pattern_rules: 1, ic_features: 8,
  }));

  const baseColumns = [
    ["id", "int(11)", "NO", null, "auto_increment"],
    ["code", "varchar(5)", "NO", null, ""],
    ["name", "varchar(50)", "NO", null, ""],
    ["family", "varchar(50)", "YES", null, ""],
    ["is_romance", "tinyint(1)", "NO", "0", ""],
    ["is_active", "tinyint(1)", "NO", "1", ""],
  ].map(([COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA], index) => ({
    COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, ORDINAL_POSITION: index + 1,
  }));
  assert.equal(classifyState(baseColumns, []), "pending");
  assert.equal(classifyState([
    ...baseColumns,
    { COLUMN_NAME: "documentation_status", COLUMN_TYPE: "varchar(20)", IS_NULLABLE: "NO", COLUMN_DEFAULT: "DOCUMENTED", EXTRA: "", ORDINAL_POSITION: 7 },
  ], []), "partial");
});

test("language routes preserve the operational response and expose a distinct catalog", async () => {
  const languages = ["fr", "es", "it", "pt", "en"].map((code) => ({ code }));
  const catalogLanguages = ["fr", "es", "it", "pt", "ca", "gl", "oc", "ro", "co", "sc", "rm", "en"]
    .map((code) => ({ code }));
  const summary = { total: 12, romance_documented: 4, non_romance_comparison: 1, romance_referenced: 7 };
  await withServer({
    async getLanguages() { return languages; },
    async getLanguageCatalog() { return { languages: catalogLanguages, summary }; },
  }, async (baseUrl) => {
    const operationalResponse = await fetch(`${baseUrl}/languages`);
    const operational = await operationalResponse.json();
    assert.equal(operational.contract_version, "0.1");
    assert.deepEqual(operational.languages.map((language) => language.code), ["fr", "es", "it", "pt", "en"]);

    const catalogResponse = await fetch(`${baseUrl}/language-catalog`);
    const catalog = await catalogResponse.json();
    assert.equal(catalogResponse.status, 200);
    assert.deepEqual(catalog.summary, summary);
    assert.deepEqual(catalog.languages.map((language) => language.code), [
      "fr", "es", "it", "pt", "ca", "gl", "oc", "ro", "co", "sc", "rm", "en",
    ]);
  });
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
