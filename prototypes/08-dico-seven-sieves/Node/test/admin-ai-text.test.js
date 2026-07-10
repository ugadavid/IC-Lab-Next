const test = require("node:test");
const assert = require("node:assert/strict");

const { MAX_TEXT_LENGTH } = require("../src/analysis");
const { AdminAiError, parseAndValidateCandidateJson } = require("../src/admin-ai-domain");
const {
  buildTextCoverage,
  buildTextPrompts,
  validateTextCandidateRequest,
  validateTextCoverageRequest,
} = require("../src/admin-ai-text");

const languages = ["fr", "es", "it", "pt"].map((code) => ({ code }));

test("text coverage rejects an empty text", () => {
  assert.throws(
    () => validateTextCoverageRequest({ text: "   ", source_language: "fr" }, languages),
    (error) => error instanceof AdminAiError && error.code === "INVALID_TEXT"
  );
});

test("text coverage rejects a text above the V0 limit", () => {
  assert.throws(
    () => validateTextCoverageRequest({
      text: "a".repeat(MAX_TEXT_LENGTH + 1),
      source_language: "fr",
    }, languages),
    (error) => error instanceof AdminAiError && error.code === "TEXT_TOO_LONG"
  );
});

test("text candidate generation rejects an empty unknown list", () => {
  assert.throws(
    () => validateTextCandidateRequest({ unknown_words: [], languages: ["fr"] }, languages),
    (error) => error instanceof AdminAiError && error.code === "EMPTY_UNKNOWN_WORDS"
  );
});

test("text AI JSON is parsed with the shared strict candidate contract", () => {
  const request = validateTextCandidateRequest({
    unknown_words: ["bibliothèque"],
    languages: ["fr", "es"],
  }, languages);
  const parsed = parseAndValidateCandidateJson(JSON.stringify({
    candidates: [{
      entry_key: "LIBRARY_PLACE",
      gloss_fr: "bibliothèque",
      gloss_en: "library",
      semantic_domain: "culture",
      forms: [
        { language_code: "fr", lemma: "bibliothèque", part_of_speech: "noun" },
        { language_code: "es", lemma: "biblioteca", part_of_speech: "noun" },
      ],
    }],
  }), request);

  assert.equal(parsed.candidates[0].entry_key, "LIBRARY_PLACE");
  assert.equal(parsed.candidates[0].forms.length, 2);
});

test("text coverage separates known normalized forms from unknown forms", () => {
  const request = validateTextCoverageRequest({
    text: "École école bibliothèque",
    source_language: "fr",
  }, languages);
  const coverage = buildTextCoverage(request, [{
    normalized_lemma: "ecole",
    lemma: "école",
    part_of_speech: "noun",
    language: "fr",
    entry_key: "SCHOOL_PLACE",
    gloss_fr: "école",
  }]);

  assert.equal(coverage.summary.total_words, 3);
  assert.equal(coverage.summary.unique_forms, 2);
  assert.equal(coverage.summary.known_forms, 1);
  assert.equal(coverage.known_forms[0].occurrences, 2);
  assert.deepEqual(coverage.unknown_forms.map((word) => word.normalized), ["bibliotheque"]);
});

test("text coverage separates known lemmas, validated inflections and review forms", () => {
  const request = validateTextCoverageRequest({
    text: "Organización organizaciones inéditas.",
    source_language: "es",
  }, languages);
  const coverage = buildTextCoverage(request, [{
    normalized_lemma: "organizacion",
    lemma: "organización",
    part_of_speech: "noun",
    language: "es",
    entry_key: "ORGANIZATION_ENTITY",
    gloss_fr: "organisation",
  }], [{
    id: 1,
    lexical_form_id: 41,
    normalized_surface: "organizaciones",
    grammatical_number: "PLURAL",
    status: "VALIDATED",
    lemma: "organización",
    part_of_speech: "noun",
    language: "es",
    entry_key: "ORGANIZATION_ENTITY",
  }]);

  assert.equal(coverage.summary.known_lemmas, 1);
  assert.equal(coverage.summary.known_inflected_forms, 1);
  assert.equal(coverage.summary.forms_to_review, 1);
  assert.equal(coverage.known_inflected_forms[0].surface, "organizaciones");
  assert.equal(coverage.forms_to_review[0].surface, "inéditas");
  assert.match(coverage.forms_to_review[0].contexts[0], /inéditas/);
});

test("AI text prompt converts inflected surfaces to dictionary lemmas", () => {
  const prompts = buildTextPrompts({
    unknown_words: ["utiles", "mangent"],
    languages: ["fr", "es", "it", "pt"],
  });

  assert.match(prompts.system, /lemmes dictionnaires, pas des formes fléchies/);
  assert.match(prompts.system, /FR utiles → utile/);
  assert.match(prompts.system, /ES útiles → útil/u);
  assert.match(prompts.system, /FR mangent → manger/);
  assert.match(prompts.user, /forme rencontrée dans le texte peut être fléchie/);
  assert.match(prompts.user, /identifie son lemme dictionnaire/);
});
