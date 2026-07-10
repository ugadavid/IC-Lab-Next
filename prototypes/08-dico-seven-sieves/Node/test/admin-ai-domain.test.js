const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AdminAiError,
  buildPrompts,
  candidateSchema,
  parseAndValidateCandidateJson,
  validateDomainCandidateRequest,
} = require("../src/admin-ai-domain");

const languages = ["fr", "es", "it", "pt"].map((code) => ({ code }));

test("AI domain request rejects an empty domain", () => {
  assert.throws(
    () => validateDomainCandidateRequest({
      domain: " ", count: 10, languages: ["fr"], level: "A1", parts_of_speech: ["noun"],
    }, languages),
    (error) => error instanceof AdminAiError && error.code === "INVALID_DOMAIN"
  );
});

test("AI domain request refuses more than 50 candidates", () => {
  assert.throws(
    () => validateDomainCandidateRequest({
      domain: "école", count: 51, languages: ["fr"], level: "A1", parts_of_speech: ["noun"],
    }, languages),
    (error) => error instanceof AdminAiError && error.code === "CANDIDATE_LIMIT_EXCEEDED"
  );
});

test("AI candidate JSON is parsed and minimally validated", () => {
  const request = {
    domain: "école",
    count: 10,
    languages: ["fr", "es"],
    level: "A1",
    parts_of_speech: ["noun"],
  };
  const result = parseAndValidateCandidateJson(JSON.stringify({
    candidates: [{
      entry_key: "SCHOOL_PLACE",
      gloss_fr: "école",
      gloss_en: "school",
      semantic_domain: "école",
      forms: [
        { language_code: "fr", lemma: "école", part_of_speech: "noun" },
        { language_code: "es", lemma: "escuela", part_of_speech: "noun" },
      ],
    }],
  }), request);

  assert.equal(result.candidates[0].entry_key, "SCHOOL_PLACE");
  assert.equal(result.candidates[0].forms.length, 2);
});

test("AI candidate JSON rejects an unrequested language", () => {
  const request = {
    domain: "école",
    count: 10,
    languages: ["fr"],
    level: "A1",
    parts_of_speech: ["noun"],
  };
  assert.throws(
    () => parseAndValidateCandidateJson({
      candidates: [{
        entry_key: "SCHOOL_PLACE",
        gloss_fr: "école",
        gloss_en: "school",
        semantic_domain: "école",
        forms: [{ language_code: "es", lemma: "escuela", part_of_speech: "noun" }],
      }],
    }, request),
    (error) => error instanceof AdminAiError && error.code === "OPENAI_INVALID_LANGUAGE"
  );
});

test("AI domain prompt requires dictionary lemmas with explicit examples", () => {
  const prompts = buildPrompts({
    domain: "école",
    count: 10,
    languages: ["fr", "es", "it", "pt"],
    level: "A2",
    parts_of_speech: ["noun", "verb", "adjective", "adverb"],
  });

  assert.match(prompts.system, /lemmes dictionnaires, pas des formes fléchies/);
  assert.match(prompts.system, /noms au singulier/);
  assert.match(prompts.system, /verbes à l’infinitif/);
  assert.match(prompts.system, /FR utiles → utile/);
  assert.match(prompts.system, /ES útiles → útil/u);
  assert.match(prompts.system, /FR mangent → manger/);
});

test("AI candidate JSON schema keeps the existing lemma field contract", () => {
  const formSchema = candidateSchema()
    .properties.candidates.items.properties.forms.items;

  assert.deepEqual(
    formSchema.required,
    ["language_code", "lemma", "part_of_speech"]
  );
  assert.deepEqual(
    Object.keys(formSchema.properties),
    ["language_code", "lemma", "part_of_speech"]
  );
  assert.deepEqual(formSchema.properties.lemma, { type: "string" });
  assert.equal(formSchema.additionalProperties, false);
});
