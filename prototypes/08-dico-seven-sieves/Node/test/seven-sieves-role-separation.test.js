const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sessionContract = require("../../prototypes/01-seven-sieves/js/seven-sieves-session-v0.js");

function fixtureAnalysis() {
  const text = "Sin embargo, la información circula durante la noche.";
  return {
    contract_version: "0.1",
    text,
    languages: { source: "es", mediation: "fr", comparison: ["it", "pt"] },
    tokens: [
      { index: 0, surface: "Sin", normalized: "sin", kind: "word", start: 0, end: 3, enrichments: [{ sieve_id: 2, label: "Famille" }] },
      { index: 1, surface: " ", normalized: " ", kind: "space", start: 3, end: 4, enrichments: [] },
      { index: 2, surface: "embargo", normalized: "embargo", kind: "word", start: 4, end: 11, enrichments: [] },
    ],
    sieves: Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      label: `Tamis ${index + 1}`,
      description: "Description",
      status: index === 3 ? "experimental" : "supported",
    })),
    warnings: [{ code: "SIEVE_EXPERIMENTAL", message: "Traitement expérimental" }],
    pedagogical_enrichments: [{ source: { kind: "connector_help" }, explanation: "Aide discursive" }],
    extra_future_field: { preserved: true },
  };
}

function fixturePreparation() {
  return {
    text: "Sin embargo, la información circula durante la noche.",
    source_language: "es",
    mediation_language: "fr",
    comparison_languages: ["it", "pt"],
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test("versioned session transfer preserves the complete analysis package", () => {
  const analysis = fixtureAnalysis();
  const activity = sessionContract.createActivity(fixturePreparation(), analysis, "2026-08-19T09:00:00.000Z");
  const storage = memoryStorage();
  sessionContract.writeActivity(storage, activity);
  const restored = sessionContract.readActivity(storage);

  assert.equal(restored.status, "ok");
  assert.equal(restored.activity.format_version, "0.1");
  assert.deepEqual(restored.activity.analysis.pedagogical_enrichments, analysis.pedagogical_enrichments);
  assert.deepEqual(restored.activity.analysis.extra_future_field, { preserved: true });
  assert.deepEqual(sessionContract.summarizeAnalysis(restored.activity.analysis), {
    tokens: 3,
    enrichments: 1,
    sieve_ids: [2],
    warnings: 1,
    pedagogical_enrichments: 1,
  });
});

test("session reader isolates missing, malformed and unknown-version activities", () => {
  assert.equal(sessionContract.readActivity(memoryStorage()).status, "missing");
  assert.equal(sessionContract.readActivity(memoryStorage({
    [sessionContract.STORAGE_KEY]: "not-json",
  })).status, "invalid");
  assert.equal(sessionContract.readActivity(memoryStorage({
    [sessionContract.STORAGE_KEY]: JSON.stringify({ format_version: "9.9" }),
  })).status, "incompatible");
});

test("student exploration state supports selection, statuses and reset without touching the activity", () => {
  const activity = sessionContract.createActivity(fixturePreparation(), fixtureAnalysis());
  const state = sessionContract.createExplorationState();
  state.inspect(2);
  state.toggleSelection(2);
  state.setStatus(2, "known");
  state.activeSieve = 4;
  state.hintsVisible = true;
  assert.equal(state.selectedTokenIndexes.has(2), true);
  assert.equal(state.tokenStatuses[2], "known");

  state.toggleSelection(2);
  assert.equal(state.selectedTokenIndexes.has(2), false);
  state.toggleSelection(2);
  state.reset();
  assert.equal(state.selectedTokenIndexes.size, 0);
  assert.deepEqual(Object.keys(state.tokenStatuses), []);
  assert.equal(state.activeSieve, 1);
  assert.equal(state.inspectedTokenIndex, null);
  assert.equal(activity.analysis.text, fixturePreparation().text);
  assert.equal(activity.analysis.pedagogical_enrichments.length, 1);
});

test("session validation refuses a mismatched text or malformed token without mutating storage", () => {
  const storage = memoryStorage();
  assert.throws(() => sessionContract.createActivity(
    { ...fixturePreparation(), text: "Autre texte." },
    fixtureAnalysis(),
  ), /ne correspond pas/);
  const malformed = fixtureAnalysis();
  malformed.tokens[0].end = 2;
  assert.throws(() => sessionContract.createActivity(fixturePreparation(), malformed), /Offset UTF-16 incohérent/);
  assert.equal(storage.getItem(sessionContract.STORAGE_KEY), null);
});

test("teacher and student pages enforce role separation and keep one student engine", () => {
  const root = path.join(__dirname, "../../prototypes/01-seven-sieves");
  const teacher = fs.readFileSync(path.join(root, "index-teacher-0.1.html"), "utf8");
  const student = fs.readFileSync(path.join(root, "index-student-0.1.html"), "utf8");
  const studentScript = fs.readFileSync(path.join(root, "js/seven-sieves-student-v0.js"), "utf8");

  assert.match(teacher, /Texte à explorer/);
  assert.match(teacher, /Langue source/);
  assert.match(teacher, /Lancer l’analyse Dico-IC/);
  assert.doesNotMatch(teacher, /inspectionBox|selectedWords|Compris|Doute|Inconnu/);

  assert.match(student, /Les 7 tamis/);
  assert.match(student, /inspectionBox|selectedWords/);
  assert.match(student, /Comparer la sélection|Recommencer l’exploration/);
  assert.doesNotMatch(student, /sourceTextInput|sourceLanguage|mediationLanguage|Analyser avec Dico-IC|apiWarnings/);
  assert.doesNotMatch(student, /SIEVE_EXPERIMENTAL/);
  assert.equal((student.match(/class="sieve-btn"/g) || []).length, 7);
  assert.match(studentScript, /sessionContract\.readActivity\(window\.sessionStorage\)/);
  assert.match(studentScript, /L’activité préparée est conservée/);
});

test("student visual identity restores the historical pedagogical palette without changing roles", () => {
  const root = path.join(__dirname, "../../prototypes/01-seven-sieves");
  const teacher = fs.readFileSync(path.join(root, "index-teacher-0.1.html"), "utf8");
  const student = fs.readFileSync(path.join(root, "index-student-0.1.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "css/seven-sieves-roles-0.1.css"), "utf8");

  assert.match(student, /🌈 Seven Sieves/);
  assert.match(student, /🎒 Activité apprenante/);
  assert.match(student, /class="help-button"/);
  assert.match(student, /hints-action|compare-action|reset-action/);
  assert.match(student, /🧠 Les 7 tamis|📈 Mon observation/);
  assert.match(teacher, /🌈 Seven Sieves · Interface enseignant/);
  assert.match(css, /background: #4A90E2/);
  assert.match(css, /background: #F5A623/);
  assert.match(css, /background: #7ED321/);
  assert.match(css, /background: #D94A5B/);
  assert.match(css, /font-family: Arial, "Segoe UI", sans-serif/);
  assert.match(css, /body\[data-seven-sieves-role="student"\] \.word\.selected/);
  assert.match(css, /body\[data-seven-sieves-role="teacher"\] \.card/);
});
