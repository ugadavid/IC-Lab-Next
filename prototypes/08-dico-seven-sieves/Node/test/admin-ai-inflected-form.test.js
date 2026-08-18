const test = require("node:test");
const assert = require("node:assert/strict");

const { AdminAiError } = require("../src/admin-ai-domain");
const { createApp } = require("../server");
const {
  MAX_INFLECTED_CANDIDATES,
  buildInflectedPrompts,
  generateInflectedCandidates,
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

function rawCandidate(surfaceForm, language = "es", overrides = {}) {
  return {
    surface_form: surfaceForm,
    language,
    lemma_candidate: `lemme-${surfaceForm}`,
    part_of_speech: "noun",
    grammatical_number: "PLURAL",
    confidence_score: 0.9,
    reason_short: "Proposition déterministe.",
    ...overrides,
  };
}

function inflectedRequest(items) {
  return {
    items: items.map(([surface_form, language = "es"]) => ({
      surface_form,
      language,
      context: `Contexte de ${surface_form}.`,
    })),
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

test("inflected AI request preserves the strict server limit of 100", () => {
  const item = {
    surface_form: "forme",
    language: "fr",
    context: "Une forme dans son contexte.",
  };
  const accepted = validateInflectedCandidateRequest({
    items: Array.from({ length: MAX_INFLECTED_CANDIDATES }, (_, index) => ({
      ...item,
      surface_form: `${item.surface_form}-${index + 1}`,
    })),
  }, languages);
  assert.equal(accepted.count, 100);

  assert.throws(
    () => validateInflectedCandidateRequest({
      items: Array.from({ length: MAX_INFLECTED_CANDIDATES + 1 }, (_, index) => ({
        ...item,
        surface_form: `${item.surface_form}-${index + 1}`,
      })),
    }, languages),
    (error) => error instanceof AdminAiError
      && error.code === "INFLECTED_ITEM_LIMIT_EXCEEDED"
      && error.message === "La génération est limitée à 100 formes."
  );
});

test("forged HTTP request with 101 items is rejected before AI generation", async (t) => {
  const repository = { async getLanguages() { return languages; } };
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/admin/ai/inflected-form-candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: Array.from({ length: 101 }, (_, index) => ({
        surface_form: `forme-${index + 1}`,
        language: "fr",
        context: `Contexte ${index + 1}.`,
      })),
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.error.code, "INFLECTED_ITEM_LIMIT_EXCEEDED");
  assert.equal(data.error.message, "La génération est limitée à 100 formes.");
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
  assert.match(prompts.system, /Recopie surface_form exactement/);
  assert.match(prompts.system, /Recopie language exactement/);
  assert.match(prompts.system, /N’invente aucune variante orthographique ou morphologique/);
  assert.match(prompts.system, /ne retourne aucune proposition/);
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
  assert.deepEqual(parsed.warnings, []);
});

test("12 valid proposals survive one unrequested surface", () => {
  const requested = Array.from({ length: 12 }, (_, index) => [`forme-${index + 1}`, "fr"]);
  const parsed = parseAndValidateInflectedCandidateJson({
    candidates: [
      ...requested.map(([surface, language]) => rawCandidate(surface, language)),
      rawCandidate("accélérées", "fr"),
    ],
  }, inflectedRequest(requested));

  assert.equal(parsed.candidates.length, 12);
  assert.equal(parsed.warnings.length, 1);
  assert.deepEqual(parsed.warnings[0], {
    code: "IGNORED_INFLECTED_PROPOSAL",
    reason: "UNREQUESTED_SURFACE",
    proposal_index: 13,
    surface_form: "accélérées",
    language: "fr",
  });
  assert.equal(parsed.candidates.some((item) => item.surface_form === "accélérées"), false);
});

test("an orthographic surface variant is not accepted as the requested surface", () => {
  const parsed = parseAndValidateInflectedCandidateJson({ candidates: [
    rawCandidate("Accélérée", "fr"),
  ] }, inflectedRequest([["accélérée", "fr"]]));

  assert.deepEqual(parsed.candidates, []);
  assert.equal(parsed.warnings[0].reason, "UNREQUESTED_SURFACE");
  assert.equal(parsed.warnings[0].surface_form, "Accélérée");
});

test("unrequested language and surface-language combination are isolated", () => {
  const request = inflectedRequest([["accélérée", "fr"], ["rapides", "es"]]);
  const parsed = parseAndValidateInflectedCandidateJson({ candidates: [
    rawCandidate("accélérée", "it"),
    rawCandidate("accélérée", "es"),
    rawCandidate("rapides", "es"),
  ] }, request);

  assert.equal(parsed.candidates.length, 1);
  assert.deepEqual(parsed.warnings.map((warning) => warning.reason), [
    "UNREQUESTED_LANGUAGE",
    "UNREQUESTED_COMBINATION",
  ]);
});

test("duplicate and malformed individual proposals are ignored", () => {
  const request = inflectedRequest([["organizaciones", "es"], ["rápidas", "es"]]);
  const parsed = parseAndValidateInflectedCandidateJson({ candidates: [
    rawCandidate("organizaciones"),
    rawCandidate("organizaciones"),
    rawCandidate("rápidas", "es", { confidence_score: "invalide" }),
  ] }, request);

  assert.equal(parsed.candidates.length, 1);
  assert.deepEqual(parsed.warnings.map((warning) => warning.reason), [
    "DUPLICATE_PROPOSAL",
    "INVALID_CONTRACT",
  ]);
});

test("a globally valid response with only invalid proposals succeeds with warnings", () => {
  const parsed = parseAndValidateInflectedCandidateJson({ candidates: [
    rawCandidate("accélérées", "fr"),
    null,
  ] }, inflectedRequest([["accélérée", "fr"]]));

  assert.deepEqual(parsed.candidates, []);
  assert.equal(parsed.warnings.length, 2);
  assert.deepEqual(parsed.warnings.map((warning) => warning.reason), [
    "UNREQUESTED_SURFACE",
    "INVALID_CONTRACT",
  ]);
});

test("globally unreadable inflected AI JSON remains blocking", () => {
  assert.throws(
    () => parseAndValidateInflectedCandidateJson("{not-json", inflectedRequest([["forme", "fr"]])),
    (error) => error instanceof AdminAiError && error.code === "OPENAI_INVALID_JSON"
  );
});

test("partial warnings propagate through structured generation", async () => {
  const request = inflectedRequest([["accélérée", "fr"]]);
  const generated = await generateInflectedCandidates(request, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        id: "response-test",
        output_text: JSON.stringify({ candidates: [
          rawCandidate("accélérée", "fr"),
          rawCandidate("accélérées", "fr"),
        ] }),
      }),
    }),
  });

  assert.equal(generated.candidates.length, 1);
  assert.equal(generated.warnings.length, 1);
  assert.equal(generated.warnings[0].surface_form, "accélérées");
});

test("inflected generation timeout remains blocking", async () => {
  const abortError = new Error("timeout");
  abortError.name = "AbortError";
  await assert.rejects(
    generateInflectedCandidates(inflectedRequest([["accélérée", "fr"]]), {
      apiKey: "test-key",
      fetchImpl: async () => { throw abortError; },
    }),
    (error) => error instanceof AdminAiError && error.code === "OPENAI_TIMEOUT"
  );
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
