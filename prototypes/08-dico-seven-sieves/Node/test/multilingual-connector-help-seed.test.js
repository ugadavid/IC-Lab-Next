"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { analyze, validateRequest } = require("../src/analysis");
const sevenSievesSession = require("../../prototypes/01-seven-sieves/js/seven-sieves-session-v0.js");
const {
  EXPECTED_INITIAL_COUNTS,
  FUNCTIONS,
  MISSION_NOTES,
  MISSION_SOURCE_LABEL,
  TARGET_LANGUAGES,
  classifyAdditionalRows,
  contentFingerprint,
  loadBackup,
  loadPlan,
  parseArgs,
} = require("../scripts/manage-multilingual-connector-helps");

const ROOT = path.resolve(__dirname, "../../../..");
const BACKUP_PATH = path.join(ROOT, "reports/assets/218_dico_ic_multilingual_connector_help_seed/pre_apply_backup.json");
const EVIDENCE_PATH = path.join(ROOT, "reports/assets/218_dico_ic_multilingual_connector_help_seed/fixture_validation_evidence.json");
const APPLICATION_EVIDENCE_PATH = path.join(ROOT, "reports/assets/218_dico_ic_multilingual_connector_help_seed/real_application_evidence.json");

test("le plan gelé contient exactement cinq aides IT, PT et EN", () => {
  const plan = loadPlan();
  assert.equal(plan.rows.length, 15);
  for (const language of TARGET_LANGUAGES) {
    const rows = plan.rows.filter((row) => row.language_code === language);
    assert.equal(rows.length, 5, language);
    assert.deepEqual(new Set(rows.map((row) => row.discourse_function)), new Set(FUNCTIONS), language);
  }
  assert.equal(new Set(plan.rows.map((row) => `${row.language_code}\u0000${row.normalized_expression}`)).size, 15);
});

test("les quinze aides sont publiées avec une provenance honnête et sans lien lexical", () => {
  const plan = loadPlan();
  for (const row of plan.rows) {
    assert.equal(row.status, "VALIDATED");
    assert.equal(row.source_label, MISSION_SOURCE_LABEL);
    assert.equal(row.notes, MISSION_NOTES);
    assert.equal(row.lexical_entry_id, null);
  }
  assert.equal(new Set(plan.rows.map(contentFingerprint)).size, 15);
});

test("les accents et expressions multi-token restent gelés", () => {
  const plan = loadPlan();
  const keys = new Set(plan.rows.map((row) => `${row.language_code}:${row.normalized_expression}`));
  for (const key of ["it:perché", "pt:no entanto", "pt:além disso"]) assert.equal(keys.has(key), true, key);
  assert.equal(keys.has("it:perche"), false);
  assert.equal(keys.has("pt:alem disso"), false);
});

test("la classification distingue pending, applied, partial et unknown", () => {
  const plan = loadPlan();
  assert.equal(classifyAdditionalRows([], plan), "pending");
  assert.equal(classifyAdditionalRows(plan.rows, plan), "applied");
  assert.equal(classifyAdditionalRows(plan.rows.slice(0, 1), plan), "partial");
  assert.equal(classifyAdditionalRows([{ ...plan.rows[0], source_label: "autre" }], plan), "unknown");
});

test("les modes mutateurs exigent une sauvegarde explicite", () => {
  assert.throws(() => parseArgs(["--apply"]), /backup/);
  assert.deepEqual(parseArgs(["--check", "--backup", "backup.json"]), {
    mode: "check", backupPath: "backup.json",
  });
});

test("la sauvegarde contient les douze aides historiques et les huit empreintes", () => {
  const backup = loadBackup(BACKUP_PATH);
  assert.equal(backup.connector_help_rows.length, 12);
  assert.equal(backup.connector_help_auto_increment, 17);
  assert.deepEqual(backup.counts, EXPECTED_INITIAL_COUNTS);
  assert.equal(Object.keys(backup.table_hashes).length, 8);
  assert.equal(backup.connector_help_rows.every((row) => row.lexical_entry_id === null), true);
});

test("la preuve jetable couvre application, rejeu, rollback et refus", () => {
  const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, "utf8"));
  assert.deepEqual(evidence.complete_copy, { table_count: 8, procedure_count: 9 });
  assert.equal(evidence.application.changed_rows, 15);
  assert.equal(evidence.application.total, 27);
  assert.equal(evidence.idempotent_replay.changed_rows, 0);
  assert.equal(evidence.proposed_public_filter.exposed, false);
  assert.equal(evidence.rollback.changed_rows, 15);
  assert.match(evidence.partial_state_refusal, /partial/);
  assert.match(evidence.collision_refusal, /unknown|collision|conflit/);
  assert.equal(evidence.final_restoration.state, "pending");
  assert.equal(evidence.fixture.removed_by_orchestrator, true);
  assert.deepEqual(evidence.final_restoration.hashes, evidence.initial.hashes);
});

test("la preuve réelle conserve les douze historiques et répartit 6/6/5/5/5", () => {
  const evidence = JSON.parse(fs.readFileSync(APPLICATION_EVIDENCE_PATH, "utf8"));
  assert.equal(evidence.state, "applied");
  assert.equal(evidence.changed_rows, 15);
  assert.equal(evidence.idempotent_replay_changed_rows, 0);
  assert.equal(evidence.counts.connector_help, 27);
  assert.equal(evidence.historical_rows_sha256, "10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846");
  assert.deepEqual(["fr", "es", "it", "pt", "en"].map((code) => evidence.distribution[code].total), [6, 6, 5, 5, 5]);
  for (const code of ["ca", "gl", "oc", "ro", "co", "sc", "rm"]) assert.equal(evidence.distribution[code].total, 0, code);
});

test("le script permanent utilise une transaction unique et des empreintes de rollback", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/manage-multilingual-connector-helps.js"), "utf8");
  assert.match(source, /beginTransaction\(\)/);
  assert.match(source, /insertedIds\.length !== 15/);
  assert.match(source, /identityFingerprint\(row\)/);
  assert.match(source, /contentFingerprint\(row\)/);
  assert.match(source, /BINARY normalized_expression = BINARY \?/);
  assert.doesNotMatch(source, /id BETWEEN|AUTO_INCREMENT\s*\+\s*15/);
});

test("le seed canonique contient exactement les quinze valeurs du plan Mission 218", () => {
  const plan = loadPlan();
  const sql = fs.readFileSync(path.join(ROOT, "prototypes/08-dico-seven-sieves/database/current_draft/60_connector_help.sql"), "utf8");
  const block = sql.split("-- Mission 218:")[1];
  assert.ok(block);
  const matrix = block.match(/FROM \(([\s\S]*?)\) AS seed/)[1];
  assert.equal((matrix.match(/\bSELECT\b/g) || []).length, 15);
  const quoted = (value) => `'${String(value).replaceAll("'", "''")}'`;
  for (const row of plan.rows) {
    for (const field of [
      "language_code", "expression", "normalized_expression", "discourse_function",
      "pedagogical_title", "pedagogical_hint", "example", "caution",
    ]) assert.ok(matrix.includes(quoted(row[field])), `${row.language_code}/${row.normalized_expression}/${field}`);
  }
  assert.match(block, /'VALIDATED'/);
  assert.match(block, /'Noyau multilingue Dico-IC'/);
  assert.match(block, /'Catalogue de travail à revoir avec Christian et Sylvain\.'/);
  assert.match(block, /lang\.is_active = TRUE/);
  assert.match(block, /lang\.documentation_status = 'DOCUMENTED'/);
  assert.match(block, /WHERE existing\.id IS NULL/);
});

test("les quinze aides reconnaissent casse, accents, multi-token et offsets réels", () => {
  const plan = loadPlan();
  const cases = [
    ["it", "Tuttavia, procediamo perché gli indizi sono chiari. Inoltre, confrontiamo le forme; quindi comprendiamo meglio e poi continuiamo."],
    ["pt", "No entanto, avançamos porque os indícios são claros. Além disso, comparamos as formas; portanto compreendemos melhor e depois continuamos."],
    ["en", "However, we continue because the clues are clear. Moreover, we compare the forms; therefore we understand better and then continue."],
  ];
  for (const [language, text] of cases) {
    const validation = validateRequest({
      contract_version: "0.1", text, source_language: language,
      mediation_language: "fr", comparison_languages: [], sieves: [],
    }, ["fr", "es", "it", "pt", "en"].map((code) => ({ code })));
    assert.equal(validation.ok, true, language);
    const response = analyze(validation.value, {
      sourceForms: [], relatedForms: [], relations: [], rules: [],
      connectorHelps: plan.rows.filter((row) => row.language_code === language).map((row, index) => ({ id: index + 1, ...row })),
    });
    assert.equal(response.pedagogical_enrichments.length, 5, language);
    assert.deepEqual(new Set(response.pedagogical_enrichments.map((item) => item.function)), new Set(FUNCTIONS), language);
    for (const item of response.pedagogical_enrichments) {
      assert.equal(text.slice(item.start, item.end), item.expression, `${language}/${item.expression}`);
      assert.equal(Object.hasOwn(item, "sieve_id"), false);
    }
  }
});

test("la reconnaissance ignore la casse mais conserve la distinction des accents", () => {
  const plan = loadPlan();
  const run = (text) => {
    const validation = validateRequest({
      contract_version: "0.1", text, source_language: "it",
      mediation_language: "fr", comparison_languages: [], sieves: [],
    }, ["fr", "it"].map((code) => ({ code })));
    return analyze(validation.value, {
      sourceForms: [], relatedForms: [], relations: [], rules: [],
      connectorHelps: plan.rows.filter((row) => row.language_code === "it").map((row, index) => ({ id: index + 1, ...row })),
    }).pedagogical_enrichments.map((item) => item.expression);
  };
  assert.deepEqual(run("TUTTAVIA, procediamo PERCHÉ."), ["TUTTAVIA", "PERCHÉ"]);
  assert.deepEqual(run("Tuttavia, procediamo perche."), ["Tuttavia"]);
});

test("Seven Sieves consomme les aides IT/PT sans les transformer en huitième tamis", () => {
  const plan = loadPlan();
  for (const [language, text] of [
    ["it", "Tuttavia, poi continuiamo."],
    ["pt", "No entanto, além disso continuamos."],
  ]) {
    const validation = validateRequest({
      contract_version: "0.1", text, source_language: language,
      mediation_language: "fr", comparison_languages: [], sieves: [1, 2, 3, 4, 5, 6, 7],
    }, ["fr", "it", "pt"].map((code) => ({ code })));
    const analysis = analyze(validation.value, {
      sourceForms: [], relatedForms: [], relations: [], rules: [],
      connectorHelps: plan.rows.filter((row) => row.language_code === language).map((row, index) => ({ id: index + 1, ...row })),
    });
    const aids = sevenSievesSession.normalizeReadingAids(analysis);
    assert.equal(aids.length, 2, language);
    assert.equal(analysis.sieves.length, 7, language);
    const state = sevenSievesSession.createExplorationState();
    state.activeSieve = 4;
    assert.equal(sevenSievesSession.readingAidsViewModel(aids, state).sectionHidden, true);
    state.setReadingAidsVisible(true);
    assert.equal(sevenSievesSession.readingAidsViewModel(aids, state).sectionHidden, false);
    state.setReadingAidsVisible(false);
    assert.equal(state.activeSieve, 4);
  }
});
