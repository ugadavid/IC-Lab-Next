const test = require("node:test");
const assert = require("node:assert/strict");

const { AdminAiError } = require("../src/admin-ai-domain");
const {
  buildInflectedPrompts,
  inflectedCandidateSchema,
  parseAndValidateInflectedCandidateJson,
  resolveInflectedCandidates,
  validateInflectedCandidateRequest,
} = require("../src/admin-ai-inflected-form");

const languages = ["fr", "es", "it", "pt"].map((code) => ({ code, is_active: true }));

function candidate(overrides = {}) {
  return {
    surface_form: "organizaciones",
    normalized_surface: "organizaciones",
    language: "es",
    context: "Las organizaciones participan.",
    lemma_candidate: "organización",
    normalized_lemma_candidate: "organizacion",
    part_of_speech: "noun",
    grammatical_number: "PLURAL",
    confidence_score: 0.97,
    reason_short: "Pluriel nominal espagnol.",
    source_label: "ai_text_inflection_v0",
    ...overrides,
  };
}

function lexicalForm(overrides = {}) {
  return {
    id: 41,
    language: "es",
    lemma: "organización",
    normalized_lemma: "organizacion",
    part_of_speech: "noun",
    entry_key: "ORGANIZATION_ENTITY",
    ...overrides,
  };
}

test("inflected AI request validates selected contextual surfaces", () => {
  const request = validateInflectedCandidateRequest({
    items: [{
      surface_form: "organizaciones",
      language: "es",
      context: "Las organizaciones participan.",
    }],
  }, languages);

  assert.equal(request.count, 1);
  assert.equal(request.items[0].language, "es");
});

test("inflected AI request rejects unsupported languages and missing contexts", () => {
  assert.throws(
    () => validateInflectedCandidateRequest({
      items: [{ surface_form: "students", language: "en", context: "The students work." }],
    }, languages),
    (error) => error instanceof AdminAiError && error.code === "INVALID_INFLECTED_LANGUAGE"
  );
  assert.throws(
    () => validateInflectedCandidateRequest({
      items: [{ surface_form: "utiles", language: "fr", context: "" }],
    }, languages),
    (error) => error instanceof AdminAiError && error.code === "INVALID_INFLECTED_CONTEXT"
  );
});

test("inflected AI prompt keeps the V0 scope and examples", () => {
  const prompts = buildInflectedPrompts({
    items: [{
      surface_form: "internacionales",
      language: "es",
      context: "Las organizaciones internacionales participan.",
    }],
  });

  assert.match(prompts.system, /pluriels de noms et d’adjectifs/);
  assert.match(prompts.system, /organizaciones → organización/);
  assert.match(prompts.system, /internacionales → internacional/);
  assert.match(prompts.system, /ES utiles → útil/);
  assert.match(prompts.system, /ni verbe/);
});

test("inflected AI schema remains strict and plural-only", () => {
  const item = inflectedCandidateSchema().properties.candidates.items;
  assert.equal(item.additionalProperties, false);
  assert.deepEqual(item.properties.part_of_speech.enum.sort(), ["adjective", "noun"]);
  assert.deepEqual(item.properties.grammatical_number.enum, ["PLURAL"]);
});

test("inflected AI JSON is parsed without writing data", () => {
  const request = {
    items: [{
      surface_form: "organizaciones",
      language: "es",
      context: "Las organizaciones participan.",
    }],
  };
  const parsed = parseAndValidateInflectedCandidateJson({
    candidates: [{
      surface_form: "organizaciones",
      language: "es",
      lemma_candidate: "organización",
      part_of_speech: "noun",
      grammatical_number: "PLURAL",
      confidence_score: 0.97,
      reason_short: "Pluriel nominal espagnol.",
    }],
  }, request);

  assert.equal(parsed.candidates[0].normalized_surface, "organizaciones");
  assert.equal(parsed.candidates[0].normalized_lemma_candidate, "organizacion");
  assert.equal(parsed.candidates[0].source_label, "ai_text_inflection_v0");
});

for (const scenario of [
  {
    name: "organizaciones resolves to organización",
    generated: candidate(),
    target: lexicalForm(),
  },
  {
    name: "internacionales resolves to internacional",
    generated: candidate({
      surface_form: "internacionales",
      normalized_surface: "internacionales",
      context: "Las organizaciones internacionales participan.",
      lemma_candidate: "internacional",
      normalized_lemma_candidate: "internacional",
      part_of_speech: "adjective",
    }),
    target: lexicalForm({
      id: 42,
      lemma: "internacional",
      normalized_lemma: "internacional",
      part_of_speech: "adjective",
      entry_key: "INTERNATIONAL",
    }),
  },
  {
    name: "utiles resolves to Spanish útil",
    generated: candidate({
      surface_form: "utiles",
      normalized_surface: "utiles",
      context: "Son herramientas utiles.",
      lemma_candidate: "útil",
      normalized_lemma_candidate: "util",
      part_of_speech: "adjective",
    }),
    target: lexicalForm({
      id: 43,
      lemma: "útil",
      normalized_lemma: "util",
      part_of_speech: "adjective",
      entry_key: "USEFUL",
    }),
  },
]) {
  test(scenario.name, () => {
    const [resolved] = resolveInflectedCandidates(
      [scenario.generated],
      [scenario.target],
      []
    );
    assert.equal(resolved.state, "READY");
    assert.equal(resolved.lexical_form_id, scenario.target.id);
    assert.equal(resolved.selected, true);
  });
}

test("resolution reports a missing lemma", () => {
  const [resolved] = resolveInflectedCandidates([candidate()], [], []);
  assert.equal(resolved.state, "LEMMA_NOT_FOUND");
  assert.equal(resolved.selected, false);
});

test("resolution reports an ambiguous target", () => {
  const [resolved] = resolveInflectedCandidates(
    [candidate()],
    [lexicalForm(), lexicalForm({ id: 99, entry_key: "OTHER_ORGANIZATION" })],
    []
  );
  assert.equal(resolved.state, "AMBIGUOUS");
  assert.equal(resolved.lexical_form_id, null);
});

test("resolution reports an existing mapping", () => {
  const target = lexicalForm();
  const [resolved] = resolveInflectedCandidates(
    [candidate()],
    [target],
    [{
      id: 7,
      lexical_form_id: target.id,
      normalized_surface: "organizaciones",
      language: "es",
      status: "VALIDATED",
    }]
  );
  assert.equal(resolved.state, "ALREADY_KNOWN");
  assert.equal(resolved.selected, false);
});

test("resolution requires correction when the surface already targets another lemma", () => {
  const [resolved] = resolveInflectedCandidates(
    [candidate()],
    [lexicalForm()],
    [{
      id: 8,
      lexical_form_id: 999,
      normalized_surface: "organizaciones",
      language: "es",
      status: "VALIDATED",
    }]
  );
  assert.equal(resolved.state, "NEEDS_CORRECTION");
  assert.equal(resolved.selected, false);
});
