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
      { index: 1, surface: "embargo", normalized: "embargo", kind: "word", start: 4, end: 11, enrichments: [] },
      { index: 2, surface: ",", normalized: ",", kind: "punctuation", start: 11, end: 12, enrichments: [] },
    ],
    sieves: Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      label: `Tamis ${index + 1}`,
      description: "Description",
      status: index === 3 ? "experimental" : "supported",
    })),
    warnings: [{ code: "SIEVE_EXPERIMENTAL", message: "Traitement expérimental" }],
    pedagogical_enrichments: [{
      id: "p-0001", type: "connector_help", source: { kind: "connector_help", id: 1, label: "Dico-IC" },
      function: "OPPOSITION", expression: "Sin embargo", token_indexes: [0, 1], start: 0, end: 11,
      pedagogical_hint: "L’auteur introduit un contraste.", example: "sin embargo / cependant", caution: "Selon le contexte.",
    }],
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
  state.activateReadingAid("p-0001");
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
  assert.equal(state.activeReadingAidId, null);
  assert.equal(state.readingAidsVisible, false);
  assert.equal(activity.analysis.text, fixturePreparation().text);
  assert.equal(activity.analysis.pedagogical_enrichments.length, 1);
});

function analysisWith(text, tokens, pedagogicalEnrichments) {
  return {
    contract_version: "0.1",
    text,
    languages: { source: "es", mediation: "fr", comparison: ["it", "pt"] },
    tokens: tokens.map((token, index) => ({
      index,
      normalized: token.surface.toLocaleLowerCase("es"),
      kind: token.kind || "word",
      enrichments: [],
      ...token,
    })),
    sieves: Array.from({ length: 7 }, (_, index) => ({ id: index + 1, label: `Tamis ${index + 1}`, status: "supported" })),
    warnings: [],
    pedagogical_enrichments: pedagogicalEnrichments,
  };
}

function connectorAid(id, expression, start, end, tokenIndexes, extra = {}) {
  return {
    id,
    type: "connector_help",
    source: { kind: "connector_help", id: 1, label: "Dico-IC" },
    function: "OPPOSITION",
    expression,
    start,
    end,
    token_indexes: tokenIndexes,
    pedagogical_hint: "Une aide de lecture.",
    ...extra,
  };
}

test("reading aids map single and multi-token expressions from exact offsets", () => {
  const analysis = analysisWith("Además. Sin embargo.", [
    { surface: "Además", start: 0, end: 6 },
    { surface: ".", kind: "punctuation", start: 6, end: 7 },
    { surface: "Sin", start: 8, end: 11 },
    { surface: "embargo", start: 12, end: 19 },
    { surface: ".", kind: "punctuation", start: 19, end: 20 },
  ], [
    connectorAid("single", "Además", 0, 6, [0], { function: "ADDITION" }),
    connectorAid("multi", "Sin embargo", 8, 19, [2, 3]),
  ]);

  const aids = sessionContract.normalizeReadingAids(analysis);
  assert.deepEqual(aids.map((aid) => aid.tokenIndexes), [[0], [2, 3]]);
  assert.deepEqual(aids.map((aid) => aid.expression), ["Además", "Sin embargo"]);
  assert.deepEqual(aids.map((aid) => aid.functionLabel), ["Addition", "Opposition"]);
});

test("reading aids distinguish identical occurrences by offsets and preserve Unicode ranges", () => {
  const analysis = analysisWith("😀 Sin embargo. Sin embargo.", [
    { surface: "😀", kind: "symbol", start: 0, end: 2 },
    { surface: "Sin", start: 3, end: 6 },
    { surface: "embargo", start: 7, end: 14 },
    { surface: ".", kind: "punctuation", start: 14, end: 15 },
    { surface: "Sin", start: 16, end: 19 },
    { surface: "embargo", start: 20, end: 27 },
    { surface: ".", kind: "punctuation", start: 27, end: 28 },
  ], [
    connectorAid("first", "Sin embargo", 3, 14, [1, 2]),
    connectorAid("second", "Sin embargo", 16, 27, [4, 5]),
  ]);

  const aids = sessionContract.normalizeReadingAids(analysis);
  assert.deepEqual(aids.map((aid) => [aid.start, aid.end, aid.tokenIndexes]), [
    [3, 14, [1, 2]],
    [16, 27, [4, 5]],
  ]);
});

test("reading aids ignore absent, malformed or inconsistent ranges without guessing", () => {
  const tokens = [
    { surface: "Sin", start: 0, end: 3 },
    { surface: "embargo", start: 4, end: 11 },
  ];
  assert.deepEqual(sessionContract.normalizeReadingAids(analysisWith("Sin embargo", tokens, [])), []);
  const invalid = [
    connectorAid("bad-type", "Sin embargo", "0", 11, [0, 1]),
    connectorAid("outside", "Sin embargo", 0, 99, [0, 1]),
    connectorAid("mismatch", "Autre chose", 0, 11, [0, 1]),
    connectorAid("partial", "in em", 1, 6, []),
    connectorAid("wrong-tokens", "Sin embargo", 0, 11, [1, 0]),
    { ...connectorAid("wrong-source", "Sin embargo", 0, 11, [0, 1]), source: { kind: "heuristic" } },
  ];
  assert.deepEqual(sessionContract.normalizeReadingAids(analysisWith("Sin embargo", tokens, invalid)), []);
  assert.equal(sessionContract.summarizeAnalysis(analysisWith("Sin embargo", tokens, invalid)).pedagogical_enrichments, 0);
});

test("overlapping reading aids coexist and exploration changes do not mutate them", () => {
  const analysis = analysisWith("por tanto", [
    { surface: "por", start: 0, end: 3 },
    { surface: "tanto", start: 4, end: 9 },
  ], [
    connectorAid("short", "por", 0, 3, [0]),
    connectorAid("long", "por tanto", 0, 9, [0, 1], { function: "CONSEQUENCE" }),
  ]);
  const before = sessionContract.normalizeReadingAids(analysis);
  const state = sessionContract.createExplorationState();
  state.toggleSelection(0);
  state.setStatus(0, "doubt");
  state.activeSieve = 7;
  state.activateReadingAid("long");
  assert.equal(before.length, 2);
  assert.deepEqual(before[0].tokenIndexes, [0]);
  assert.deepEqual(before[1].tokenIndexes, [0, 1]);
  state.reset();
  assert.deepEqual(sessionContract.normalizeReadingAids(analysis), before);
});

test("reading aid content is escaped before HTML rendering", () => {
  const unsafe = `<img src=x onerror="alert('x')"> & suite`;
  assert.equal(
    sessionContract.escapeHtml(unsafe),
    "&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt; &amp; suite",
  );
});

test("reading aids are hidden by default and toggle without changing exploration or storage", () => {
  let storageWrites = 0;
  const storage = {
    getItem() { return null; },
    setItem() { storageWrites += 1; },
    removeItem() { storageWrites += 1; },
  };
  const aids = sessionContract.normalizeReadingAids(fixtureAnalysis());
  const state = sessionContract.createExplorationState();
  state.activeSieve = 4;
  state.inspect(0);
  state.toggleSelection(0);
  state.setStatus(0, "known");

  assert.deepEqual(sessionContract.readingAidsViewModel(aids, state), {
    count: 1,
    buttonHidden: false,
    sectionHidden: true,
    ariaPressed: "false",
    buttonLabel: "📚 Afficher les aides à la lecture (1)",
  });
  state.setReadingAidsVisible(true);
  state.activateReadingAid("p-0001");
  assert.deepEqual(sessionContract.readingAidsViewModel(aids, state), {
    count: 1,
    buttonHidden: false,
    sectionHidden: false,
    ariaPressed: "true",
    buttonLabel: "📚 Masquer les aides à la lecture",
  });
  state.setReadingAidsVisible(false);
  assert.equal(state.activeReadingAidId, null);
  assert.equal(state.activeSieve, 4);
  assert.equal(state.inspectedTokenIndex, 0);
  assert.equal(state.selectedTokenIndexes.has(0), true);
  assert.equal(state.tokenStatuses[0], "known");
  assert.equal(aids.length, 1);
  assert.equal(storageWrites, 0);
  assert.equal(storage.getItem(sessionContract.STORAGE_KEY), null);
  state.setReadingAidsVisible(true);
  state.activateReadingAid("p-0001");
  state.reset();
  assert.equal(state.readingAidsVisible, false);
  assert.equal(state.activeReadingAidId, null);
});

test("zero valid reading aids hide both control and section", () => {
  assert.deepEqual(sessionContract.readingAidsViewModel([], sessionContract.createExplorationState()), {
    count: 0,
    buttonHidden: true,
    sectionHidden: true,
    ariaPressed: "false",
    buttonLabel: "📚 Afficher les aides à la lecture (0)",
  });
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
  const teacherScript = fs.readFileSync(path.join(root, "js/seven-sieves-teacher-v0.js"), "utf8");

  assert.match(teacher, /Texte à explorer/);
  assert.match(teacher, /Langue source/);
  assert.match(teacher, /Lancer l’analyse Dico-IC/);
  assert.match(teacher, /Aides à la lecture[^<]*<\/span><strong id="summaryReadingAids">0/);
  assert.match(teacherScript, /summaryReadingAids[\s\S]*summary\.pedagogical_enrichments/);
  assert.doesNotMatch(teacher, /inspectionBox|selectedWords|Compris|Doute|Inconnu/);

  assert.match(student, /Les 7 tamis/);
  assert.match(student, /inspectionBox|selectedWords/);
  assert.match(student, /Comparer la sélection|Recommencer l’exploration/);
  assert.doesNotMatch(student, /sourceTextInput|sourceLanguage|mediationLanguage|Analyser avec Dico-IC|apiWarnings/);
  assert.doesNotMatch(student, /SIEVE_EXPERIMENTAL/);
  assert.equal((student.match(/class="sieve-btn"/g) || []).length, 7);
  assert.match(studentScript, /sessionContract\.readActivity\(window\.sessionStorage\)/);
  assert.match(studentScript, /L’activité préparée est conservée/);
  assert.match(student, /📚 Aides à la lecture/);
  assert.match(student, /id="toggleReadingAidsButton"[\s\S]*aria-pressed="false" hidden/);
  assert.match(studentScript, /setReadingAidsVisible\(!explorationState\.readingAidsVisible\)/);
  assert.doesNotMatch(studentScript.match(/function toggleReadingAids\(\)[\s\S]*?\n}/)?.[0] || "", /sessionStorage/);
  assert.match(studentScript, /sessionContract\.normalizeReadingAids\(analysisPackage\)/);
  assert.match(studentScript, /escapeHtml\(aid\.expression\)|escapeHtml\(aid\.pedagogicalHint\)/);
  assert.doesNotMatch(studentScript, /pedagogicalHints|matchMode|normalized_expression|source\.label/);
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

test("student microcopy classifies all seven sieves without repeating generic principles", () => {
  const root = path.join(__dirname, "../../prototypes/01-seven-sieves");
  const student = fs.readFileSync(path.join(root, "index-student-0.1.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "js/seven-sieves-student-v0.js"), "utf8");
  const principles = [
    "Prudence : une ressemblance est un indice à vérifier dans le contexte, pas une traduction automatique.",
    "Prudence : les formes comparées sont des aides à l’inférence, pas une traduction automatique.",
    "Prudence : la prononciation peut varier selon les régions ; le repère reste ici graphique.",
    "Prudence : la lecture syntaxique reste simplifiée ; le rôle exact doit être vérifié dans la phrase.",
    "Les pluriels affichés s’appuient sur des mappings validés dans Dico-IC. Prudence : le rôle exact des infinitifs probables doit être vérifié dans la phrase.",
    "Prudence : un affixe isolé ne détermine pas le sens complet.",
  ];

  assert.match(student, /app-version" content="0\.1\.4"/);
  assert.match(student, /id="sievePrincipleCaution"[^>]*hidden/);
  for (const principle of principles) {
    assert.equal(script.split(principle).length - 1, 1, `single principle rendering: ${principle}`);
  }
  const principleCautions = script.match(/const SIEVE_PRINCIPLE_CAUTIONS = Object\.freeze\(\{[\s\S]*?\n\}\);/)?.[0] || "";
  for (const sieveId of [1, 2, 4, 5, 6, 7]) assert.match(principleCautions, new RegExp(`\\n\\s*${sieveId}:`));
  assert.doesNotMatch(principleCautions, /\n\s*3:/);
  assert.match(script, /const principleCaution = SIEVE_PRINCIPLE_CAUTIONS\[number\] \|\| ""/);
  assert.match(script, /sievePrincipleCaution\.hidden = !principleCaution/);

  assert.doesNotMatch(script, /Ce retour n’est pas une note\./);
  assert.doesNotMatch(`${student}\n${script}`, /\bnotation\b/i);
  assert.match(script, /Observe quels tamis peuvent éclairer chacun des mots sélectionnés\./);

  const genericCautions = script.match(/const GENERIC_SIEVE_CAUTIONS = Object\.freeze\(\{[\s\S]*?\n\}\);/)?.[0] || "";
  for (const sieveId of [1, 2, 4, 5, 6, 7]) assert.match(genericCautions, new RegExp(`\\n\\s*${sieveId}:`));
  assert.doesNotMatch(genericCautions, /\n\s*3:/);
  assert.match(genericCautions, /Cette ressemblance est un indice/);
  assert.match(genericCautions, /Les formes comparées sont des aides/);
  assert.match(genericCautions, /La réalisation varie selon les régions/);
  assert.match(genericCautions, /Le rôle exact dans la phrase n’est pas analysé en V0/);
  assert.match(genericCautions, /lecture syntaxique simplifiée et contextuelle/);
  assert.match(genericCautions, /mapping validé dans Dico-IC/);
  assert.match(genericCautions, /Le rôle exact doit être vérifié dans la phrase/);
  assert.match(genericCautions, /Un suffixe isolé ne détermine pas le sens complet/);

  const cautionFormatter = script.match(/function individualCautionText\(enrichment\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(cautionFormatter, /GENERIC_SIEVE_CAUTIONS\[enrichment\.sieve_id\]/);
  assert.match(cautionFormatter, /\.includes\(enrichment\.caution\)\) return ""/);
  assert.match(cautionFormatter, /enrichment\.sieve_id === 3/);
  assert.match(cautionFormatter, /La forme proposée est confirmée ici par le lexique/);
  assert.match(cautionFormatter, /Forme confirmée par le lexique : \$\{lexicalConfirmation\[1\]\}\./);
  assert.match(cautionFormatter, /return `Prudence : \$\{enrichment\.caution\}`/);

  const formatter = script.match(/function formatEnrichmentPlain\(enrichment\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(formatter, /enrichment\.label/);
  assert.match(formatter, /formatPayload\(enrichment\.payload\)/);
  assert.match(formatter, /enrichment\.explanation/);
  assert.match(formatter, /individualCautionText\(enrichment\)/);
  assert.match(script, /payload\.forms/);
  assert.match(script, /payload\.source_form && payload\.mediation_form/);
  assert.match(script, /tooltip\.textContent = enrichments\.map\(formatEnrichmentPlain\)/);
  assert.match(script, /activeEnrichments\.map\(enrichmentHtml\)/);
  assert.match(script, /transformationsBox\.textContent = rows\.length \? rows\.join\("\\n"\)/);

  const sidebar = script.match(/function updateSidebar\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(sidebar, /currentHintsEl\.textContent = sieve\s*\? publicSieveStatus\(sieve\)/);
  assert.doesNotMatch(sidebar, /sieve\.description/);
});
