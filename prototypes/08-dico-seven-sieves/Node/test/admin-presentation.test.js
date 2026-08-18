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
  buildFormPairs,
  confidenceLabel,
  createEntryEditSession,
  entryPublicLabel,
  provenanceLabel,
  relationCoverage,
  relationPairKey,
  sortEntryForms,
} = require("../../admin/js/admin-entry-workbench-0.1.js");
const { documentedRelationModels } = require("../../admin/js/admin-entry-0.1.1.js");
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
      if (queries.length === 1) return [operationalRows];
      return [catalogRows];
    },
  };
  const repository = createRepository(pool);
  const operational = await repository.getLanguages();
  const documentable = await repository.getDocumentableLanguages();
  const catalog = await repository.getLanguageCatalog();

  assert.deepEqual(operational.map((language) => language.code), ["fr", "es", "it", "pt", "en"]);
  assert.deepEqual(documentable.map((language) => language.code), [
    "fr", "es", "it", "pt", "ca", "gl", "oc", "ro", "co", "sc", "rm", "en",
  ]);
  assert.equal(documentable.some((language) => Object.hasOwn(language, "documentation_status")), false);
  assert.deepEqual(catalog.summary, {
    total: 12,
    romance_documented: 4,
    non_romance_comparison: 1,
    romance_referenced: 7,
  });
  assert.match(queries[0], /is_active = 1[\s\S]*documentation_status = 'DOCUMENTED'/);
  assert.match(queries[0], /FIELD\(code, 'fr', 'es', 'it', 'pt', 'en'\)/);
  assert.match(queries[1], /documentation_status IN \('DOCUMENTED', 'REFERENCED'\)/);
  assert.doesNotMatch(queries[1], /is_active = 1/);
  assert.match(queries[2], /FROM language l/);
  assert.match(queries[2], /'ca', 'gl', 'oc', 'ro', 'co', 'sc', 'rm', 'en'/);
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
    async getDocumentableLanguages() { return catalogLanguages; },
    async getLanguageCatalog() { return { languages: catalogLanguages, summary }; },
  }, async (baseUrl) => {
    const operationalResponse = await fetch(`${baseUrl}/languages`);
    const operational = await operationalResponse.json();
    assert.equal(operational.contract_version, "0.1");
    assert.deepEqual(operational.languages.map((language) => language.code), ["fr", "es", "it", "pt", "en"]);

    const documentableResponse = await fetch(`${baseUrl}/admin/documentable-languages`);
    const documentable = await documentableResponse.json();
    assert.equal(documentableResponse.status, 200);
    assert.deepEqual(documentable.languages.map((language) => language.code), [
      "fr", "es", "it", "pt", "ca", "gl", "oc", "ro", "co", "sc", "rm", "en",
    ]);

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

test("pair calculation covers 0, 1, 2 and exactly 10 pairs for 5 ordered forms", () => {
  const forms = ["en", "it", "fr", "pt", "es"].map((language, index) => ({ id: index + 1, language, lemma: language }));
  assert.equal(buildFormPairs([], []).length, 0);
  assert.equal(buildFormPairs(forms.slice(0, 1), []).length, 0);
  assert.equal(buildFormPairs(forms.slice(0, 2), []).length, 1);
  const pairs = buildFormPairs(forms, []);
  assert.equal(pairs.length, 10);
  assert.deepEqual(pairs.map((pair) => `${pair.source.language}-${pair.target.language}`), [
    "fr-es", "fr-it", "fr-pt", "fr-en", "es-it", "es-pt", "es-en", "it-pt", "it-en", "pt-en",
  ]);
});

test("relation detection is symmetric, unique per pair and reports present over total", () => {
  const forms = ["fr", "es", "it", "pt", "en"].map((language, index) => ({ id: index + 10, language, lemma: language }));
  const relations = [
    { id: 1, source_form_id: 11, target_form_id: 10 },
    { id: 2, source_form_id: 10, target_form_id: 12 },
  ];
  const pairs = buildFormPairs(forms, relations);
  assert.equal(relationPairKey(10, 11), relationPairKey(11, 10));
  assert.equal(pairs.filter((pair) => pair.relation).length, 2);
  assert.deepEqual(relationCoverage(pairs), { present: 2, total: 10 });
});

test("consultation exposes only documented relations and supports a calm empty state", () => {
  const entry = { forms: [
    { id: 1, language: "fr", lemma: "information" },
    { id: 2, language: "es", lemma: "información" },
    { id: 3, language: "it", lemma: "informazione" },
  ] };
  assert.deepEqual(documentedRelationModels(entry, []).map((item) => item.relation.id), []);
  const models = documentedRelationModels(entry, [
    { id: 8, source_form_id: 2, target_form_id: 1, relation_type: "COGNATE_STRONG" },
  ]);
  assert.equal(models.length, 1);
  assert.equal(models[0].source.lemma, "información");
  assert.equal(models[0].target.lemma, "information");
});

test("entry edit session restores cancel, keeps server errors and adopts a saved state", () => {
  const entry = {
    entry_key: "NUIT", gloss_fr: "nuit", gloss_en: "night", semantic_domain: "temps",
    forms: [{ id: 1, language: "fr", lemma: "nuit", part_of_speech: "noun" }],
  };
  const session = createEntryEditSession(entry);
  session.replace({ ...session.draft, gloss_fr: "nuit modifiée" });
  assert.equal(session.dirty, true);
  assert.equal(session.cancel().gloss_fr, "nuit");
  assert.equal(session.dirty, false);
  session.replace({ ...session.draft, gloss_fr: "erreur" });
  session.fail("Serveur indisponible");
  assert.equal(session.error, "Serveur indisponible");
  assert.equal(session.draft.gloss_fr, "erreur");
  const saved = session.saved({ ...entry, gloss_fr: "enregistrée" });
  assert.equal(saved.draft.gloss_fr, "enregistrée");
  assert.equal(saved.dirty, false);
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

test("consultation and workbench assets keep presentation and editing strictly separated", () => {
  const consultationScript = fs.readFileSync(path.join(__dirname, "../../admin/js/admin-entry-0.1.1.js"), "utf8");
  const workbenchScript = fs.readFileSync(path.join(__dirname, "../../admin/js/admin-entry-workbench-0.1.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../../admin/css/admin-entry-0.1.1.css"), "utf8");
  const consultationHtml = fs.readFileSync(path.join(__dirname, "../../admin/index-admin-entry-0.1.1.html"), "utf8");
  const workbenchHtml = fs.readFileSync(path.join(__dirname, "../../admin/index-admin-entry-workbench-0.1.html"), "utf8");
  const adminScript = fs.readFileSync(path.join(__dirname, "../../admin/js/admin-0.1.js"), "utf8");
  assert.match(consultationScript, /Langue de comparaison — non romane/);
  assert.match(consultationScript, /documentedRelationModels/);
  assert.doesNotMatch(consultationScript, /Ajouter la relation|Relation à documenter|method: "PUT"|method: "POST"/);
  assert.match(consultationHtml, /Relations documentées/);
  assert.match(consultationHtml, /Aucun rapprochement explicite n’est encore documenté/);
  assert.match(consultationHtml, /Modifier et documenter cette entrée/);
  assert.match(consultationHtml, /Comment lire les relations \?/);
  assert.match(consultationHtml, /La confiance indique séparément le degré de certitude accordé à l’annotation/);
  assert.match(consultationHtml, /Cette grille est provisoire\. Elle doit être discutée avec des spécialistes du domaine et confrontée aux usages/);
  assert.doesNotMatch(consultationHtml, /<details[^>]*\sopen(?:\s|>)/);
  assert.doesNotMatch(consultationHtml, /relationPairsBody|Relation à documenter|Ajouter la relation|paires possibles/);
  assert.match(workbenchScript, /Code technique : \$\{form\.source_label\}/);
  assert.match(css, /\.entry-form-card\[data-language="en"\]/);
  assert.match(css, /\.relation-pairs-table/);
  assert.match(css, /\.documented-relations-grid/);
  assert.match(workbenchHtml, /← Revenir à la fiche de consultation/);
  assert.match(workbenchHtml, /Modifier l’entrée/);
  assert.match(workbenchHtml, /Domaine en français naturel : minuscules, accents et espaces/);
  assert.match(workbenchScript, /Ajouter la relation/);
  assert.match(workbenchHtml, /Enregistrer/);
  assert.match(workbenchHtml, /Annuler/);
  assert.match(workbenchHtml, /\? Comprendre les types, les scores et la confiance/);
  assert.match(workbenchHtml, /Le score est une estimation humaine provisoire de la transparence pédagogique, et non une probabilité/);
  assert.match(workbenchHtml, /0,90 à 1,00 : relation presque transparente/);
  assert.match(workbenchHtml, /Ces valeurs ne constituent ni des probabilités ni des résultats expérimentaux/);
  assert.match(workbenchHtml, /Une relation peut donc être faiblement transparente mais annotée avec une forte confiance/);
  assert.match(workbenchHtml, /Les relations sont modélisées comme symétriques/);
  assert.doesNotMatch(workbenchHtml, /<details[^>]*\sopen(?:\s|>)/);
  assert.doesNotMatch(`${consultationHtml}\n${workbenchHtml}`, /Christian Degache|Sylvain Hatier/);
  assert.match(workbenchScript, /paires entre les \$\{formCount\} formes actuellement documentées/);
  assert.match(adminScript, /viewLink\.href = `\.\/index-admin-entry-0\.1\.1\.html/);
  assert.match(adminScript, /editButton\.href = `\.\/index-admin-entry-workbench-0\.1\.html/);
});
