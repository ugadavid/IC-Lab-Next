const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  FRENCH_CONCEPT_KEY_INSTRUCTIONS,
  buildPrompts,
  parseAndValidateCandidateJson,
} = require("../src/admin-ai-domain");
const { buildTextPrompts } = require("../src/admin-ai-text");

function domainPrompts() {
  return buildPrompts({
    domain: "environnement",
    count: 10,
    languages: ["fr", "es", "it", "pt", "en"],
    level: "A2",
    parts_of_speech: ["noun", "verb", "adjective", "adverb"],
  });
}

function textPrompts() {
  return buildTextPrompts({
    unknown_words: ["souffrir", "préoccupant", "augmenter"],
    languages: ["fr", "es", "it", "pt", "en"],
  });
}

test("les assistants Domaine et Texte réutilisent exactement l’instruction française partagée", () => {
  const domain = domainPrompts().system;
  const text = textPrompts().system;

  assert.ok(FRENCH_CONCEPT_KEY_INSTRUCTIONS.length >= 4);
  for (const instruction of FRENCH_CONCEPT_KEY_INSTRUCTIONS) {
    assert.ok(domain.includes(instruction), instruction);
    assert.ok(text.includes(instruction), instruction);
  }
});

test("l’instruction couvre la politique linguistique, la polysémie et la validation humaine", () => {
  const prompt = domainPrompts().system;

  assert.match(prompt, /nomme entry_key en français à partir du sens visé/);
  assert.match(prompt, /infinitif pour un verbe/);
  assert.match(prompt, /singulier pour un nom/);
  assert.match(prompt, /forme dictionnaire pour un adjectif ou un adverbe/);
  assert.match(prompt, /anglais reste une forme linguistique de comparaison/);
  assert.match(prompt, /forme espagnole, italienne, portugaise ou d’une forme fléchie/);
  assert.match(prompt, /qualificatif sémantique français bref/);
  assert.match(prompt, /N’ajoute pas systématiquement une catégorie grammaticale/);
  assert.match(prompt, /brouillon à vérifier humainement/);
});

test("l’instruction contient les exemples et contre-exemples essentiels sans ambiguïté", () => {
  const prompt = textPrompts().system;

  for (const expected of [
    "souffrir → SOUFFRIR",
    "préoccupant → PREOCCUPANT",
    "augmenter → AUGMENTER",
    "banque au sens financier → BANQUE_FINANCE",
    "banque comme collection de données → BANQUE_DONNEES",
    "voler dans les airs → VOLER_DEPLACEMENT_AERIEN",
    "voler quelque chose → VOLER_DEROBER",
    "SUFFER pour souffrir",
    "WORRISOME pour préoccupant",
    "SOFFRIR à partir de l’italien ou du portugais",
    "PREOCCUPANT_ADJECTIVE",
  ]) {
    assert.ok(prompt.includes(expected), expected);
  }
});

test("la fixture des sept concepts canonicalise seulement les clés et préserve les textes multilingues", () => {
  const concepts = [
    ["souffrir", "SOUFFRIR", "éprouver une souffrance", "suffer", "verb"],
    ["PRÉOCCUPANT", "PREOCCUPANT", "qui suscite de l’inquiétude", "worrisome", "adjective"],
    ["augmenter", "AUGMENTER", "rendre plus grand", "increase", "verb"],
    ["BANQUE_FINANCE", "BANQUE_FINANCE", "établissement financier", "bank", "noun"],
    ["BANQUE_DONNÉES", "BANQUE_DONNEES", "collection organisée de données", "data bank", "noun"],
    ["VOLER_DÉPLACEMENT_AÉRIEN", "VOLER_DEPLACEMENT_AERIEN", "se déplacer dans les airs", "fly", "verb"],
    ["VOLER_DÉROBER", "VOLER_DEROBER", "prendre le bien d’autrui", "steal", "verb"],
  ];
  const parsed = parseAndValidateCandidateJson({
    candidates: concepts.map(([entryKey, _expectedKey, glossFr, lemmaEn, partOfSpeech]) => ({
      entry_key: entryKey,
      gloss_fr: glossFr,
      gloss_en: lemmaEn,
      semantic_domain: "révision humaine",
      forms: [
        { language_code: "fr", lemma: entryKey === "PRÉOCCUPANT" ? "préoccupant" : glossFr, part_of_speech: partOfSpeech },
        { language_code: "en", lemma: lemmaEn, part_of_speech: partOfSpeech },
      ],
    })),
  }, {
    count: 7,
    languages: ["fr", "en"],
    parts_of_speech: ["noun", "verb", "adjective"],
  });

  assert.deepEqual(parsed.candidates.map(candidate => candidate.entry_key), concepts.map(item => item[1]));
  assert.equal(parsed.candidates[1].forms[0].lemma, "préoccupant");
  assert.equal(parsed.candidates[1].gloss_fr, "qui suscite de l’inquiétude");
  assert.equal(parsed.candidates[4].gloss_fr, "collection organisée de données");
  assert.equal(parsed.candidates[5].forms[1].lemma, "fly");
});

test("les deux interfaces présentent calmement la convention et gardent une décision humaine explicite", () => {
  const adminRoot = path.resolve(__dirname, "../../admin");
  for (const file of ["index-admin-ai-domain-0.1.html", "index-admin-ai-text-0.1.html"]) {
    const html = fs.readFileSync(path.join(adminRoot, file), "utf8");
    assert.match(html, /Convention :<\/strong> les nouveaux concepts sont nommés en français\./);
    assert.match(html, /Les clés historiques peuvent conserver une autre langue\./);
    assert.match(html, /<details>/);
    assert.match(html, /validation humaine/);
    assert.match(html, /Créer les entrées sélectionnées/);
  }
});

test("les deux interfaces canonicalisent au blur, recalculent les doublons et n’écrivent qu’au clic", () => {
  const scriptRoot = path.resolve(__dirname, "../../admin/js");
  for (const file of ["admin-ai-domain-0.1.js", "admin-ai-text-0.1.js"]) {
    const script = fs.readFileSync(path.join(scriptRoot, file), "utf8");
    assert.match(script, /addEventListener\("focusout"/);
    assert.match(script, /canonicalizeCandidateForReview/);
    assert.match(script, /refreshCanonicalEntryKeyExistence/);
    assert.match(script, /findDuplicateCanonicalEntryKeys/);
    assert.match(script, /createSelectedButton\.addEventListener\("click", createSelectedCandidates\)/);
    assert.match(script, /async function createSelectedCandidates\(\) \{\s+canonicalizeAllCandidateKeys\(\)/);
  }
});

test("les lots, la progression et l’annulation de l’assistant Texte restent câblés", () => {
  const adminRoot = path.resolve(__dirname, "../../admin");
  const html = fs.readFileSync(path.join(adminRoot, "index-admin-ai-text-0.1.html"), "utf8");
  const script = fs.readFileSync(path.join(adminRoot, "js/admin-ai-text-0.1.js"), "utf8");

  assert.match(html, /id="inflectedBatchSize"/);
  assert.match(html, /id="generationProgress"/);
  assert.match(html, /id="cancelGenerationButton"/);
  assert.match(script, /CancellableGenerationSession/);
  assert.match(script, /cancelLexicalGeneration/);
});
