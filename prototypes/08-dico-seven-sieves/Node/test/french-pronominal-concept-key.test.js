const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  findDuplicateCanonicalEntryKeys,
  reconcileFrenchPronominalConceptKey,
} = require("../../admin/js/entry-key-canonicalization-0.1.js");
const {
  buildPrompts,
  parseAndValidateCandidateJson,
} = require("../src/admin-ai-domain");
const { buildTextPrompts } = require("../src/admin-ai-text");

function candidate(entryKey, lemma, partOfSpeech = "verb") {
  return {
    entry_key: entryKey,
    gloss_fr: "glose française accentuée",
    gloss_en: "English gloss",
    semantic_domain: "recette pronominale",
    forms: [
      { language_code: "fr", lemma, part_of_speech: partOfSpeech },
      { language_code: "en", lemma: "comparison form", part_of_speech: partOfSpeech },
    ],
  };
}

function parseOne(entryKey, lemma, partOfSpeech = "verb") {
  return parseAndValidateCandidateJson({ candidates: [candidate(entryKey, lemma, partOfSpeech)] }, {
    count: 1,
    languages: ["fr", "en"],
    parts_of_speech: [partOfSpeech],
  }).candidates[0];
}

test("restaure uniquement les séparateurs pronominaux français prouvés par le lemme verbal", () => {
  for (const [proposed, lemma, expected] of [
    ["SELEVER", "s’élever", "S_ELEVER"],
    ["SÉLEVER", "s’élever", "S_ELEVER"],
    ["SENFUIR", "s’enfuir", "S_ENFUIR"],
    ["SESOUVENIR", "se souvenir", "SE_SOUVENIR"],
    ["SE_LEVER", "se lever", "SE_LEVER"],
  ]) {
    assert.equal(parseOne(proposed, lemma).entry_key, expected, `${proposed} + ${lemma}`);
  }
});

test("ne fabrique aucun séparateur pour les verbes non pronominaux", () => {
  for (const lemma of ["semer", "servir", "serrer"]) {
    const proposed = lemma.toUpperCase();
    assert.deepEqual(
      reconcileFrenchPronominalConceptKey(proposed, [{ language_code: "fr", lemma, part_of_speech: "verb" }]),
      { entryKey: proposed, state: "unchanged" }
    );
    assert.equal(parseOne(proposed, lemma).entry_key, proposed);
  }
});

test("ignore les noms et adjectifs même si leur forme commence comme un pronom", () => {
  for (const partOfSpeech of ["noun", "adjective"]) {
    const result = reconcileFrenchPronominalConceptKey("SESOUVENIR", [
      { language_code: "fr", lemma: "se souvenir", part_of_speech: partOfSpeech },
    ]);
    assert.deepEqual(result, { entryKey: "SESOUVENIR", state: "unchanged" });
    assert.equal(parseOne("SESOUVENIR", "se souvenir", partOfSpeech).entry_key, "SESOUVENIR");
  }
});

test("conserve et signale une clé qualifiée ou non concordante au lieu de l’inventer", () => {
  for (const proposed of ["SELEVER_MOUVEMENT", "MONTER"]) {
    const result = reconcileFrenchPronominalConceptKey(proposed, [
      { language_code: "fr", lemma: "s’élever", part_of_speech: "verb" },
    ]);
    assert.equal(result.entryKey, proposed);
    assert.equal(result.state, "ambiguous");
    assert.match(result.warning, /à vérifier/);
  }
});

test("la clé restaurée rencontre immédiatement le doublon S_ELEVER", () => {
  const parsed = parseOne("SELEVER", "s’élever");
  const duplicates = findDuplicateCanonicalEntryKeys([parsed.entry_key], ["S_ELEVER"]);

  assert.equal(parsed.entry_key, "S_ELEVER");
  assert.ok(duplicates.has("S_ELEVER"));
});

test("la correction ne modifie jamais les formes ni les gloses", () => {
  const parsed = parseOne("SELEVER", "s’élever");

  assert.equal(parsed.forms[0].lemma, "s’élever");
  assert.equal(parsed.forms[1].lemma, "comparison form");
  assert.equal(parsed.gloss_fr, "glose française accentuée");
  assert.equal(parsed.gloss_en, "English gloss");
});

test("les prompts Domaine et Texte partagent les exemples et interdictions pronominales", () => {
  const domain = buildPrompts({
    domain: "mouvement",
    count: 10,
    languages: ["fr", "en"],
    level: "A2",
    parts_of_speech: ["verb"],
  }).system;
  const text = buildTextPrompts({ unknown_words: ["s’élever"], languages: ["fr", "en"] }).system;

  for (const expected of [
    "s’élever → S_ELEVER",
    "s'enfuir → S_ENFUIR",
    "se souvenir → SE_SOUVENIR",
    "se lever → SE_LEVER",
    "Ne supprime pas simplement l’apostrophe ou l’espace",
    "Ne produis pas SELEVER pour s’élever",
    "semer → SEMER",
    "servir → SERVIR",
    "serrer → SERRER",
  ]) {
    assert.ok(domain.includes(expected), expected);
    assert.ok(text.includes(expected), expected);
  }
});

test("les deux interfaces signalent les ambiguïtés et bloquent immédiatement les doublons", () => {
  const scriptRoot = path.resolve(__dirname, "../../admin/js");
  for (const file of ["admin-ai-domain-0.1.js", "admin-ai-text-0.1.js"]) {
    const script = fs.readFileSync(path.join(scriptRoot, file), "utf8");
    assert.match(script, /reconcileFrenchPronominalConceptKey/);
    assert.match(script, /state === "ambiguous"/);
    assert.match(script, /Structure à vérifier/);
    assert.match(script, /status\.code === "duplicate"[\s\S]*candidate\.keep = false/);
  }
});
