const test = require("node:test");
const assert = require("node:assert/strict");

const {
  analyze,
  tokenize,
  toLookupKey,
  validateRequest,
} = require("../src/analysis");

const languages = ["es", "fr", "it", "pt"].map((code) => ({ code }));

test("tokenize uses JavaScript-compatible UTF-16 offsets", () => {
  const text = "¡😀 Organización!";
  const tokens = tokenize(text);

  assert.deepEqual(tokens.map((token) => token.surface), ["¡", "😀", "Organización", "!"]);
  for (const token of tokens) {
    assert.equal(text.slice(token.start, token.end), token.surface);
  }
  assert.equal(tokens[2].start, 4);
  assert.equal(toLookupKey(tokens[2].surface), "organizacion");
});

test("validateRequest rejects duplicate comparison languages", () => {
  const validation = validateRequest({
    contract_version: "0.1",
    text: "Un texte",
    source_language: "es",
    mediation_language: "fr",
    comparison_languages: ["it", "it"],
  }, languages);

  assert.equal(validation.ok, false);
  assert.equal(validation.code, "DUPLICATE_COMPARISON_LANGUAGE");
});

test("analysis emits all seven V0 enrichment types from DB-shaped resources", () => {
  const body = {
    contract_version: "0.1",
    text: "La organización promueve educación científica lenguas comprender.",
    source_language: "es",
    mediation_language: "fr",
    comparison_languages: ["it", "pt"],
    sieves: [1, 2, 3, 4, 5, 6, 7],
  };
  const validation = validateRequest(body, languages);
  assert.equal(validation.ok, true);

  const sourceForms = [
    { id: 1, entry_id: 10, lemma: "organización", normalized_lemma: "organizacion", part_of_speech: "noun", confidence_score: 0.98, language_code: "es", entry_key: "ORGANIZATION_ENTITY", gloss_fr: "organisation" },
    { id: 2, entry_id: 20, lemma: "promueve", normalized_lemma: "promueve", part_of_speech: "verb", confidence_score: 0.97, language_code: "es", entry_key: "PROMOTE_ACTION", gloss_fr: "promouvoir" },
    { id: 3, entry_id: 30, lemma: "científica", normalized_lemma: "cientifica", part_of_speech: "adjective", confidence_score: 0.97, language_code: "es", entry_key: "SCIENTIFIC_PROPERTY", gloss_fr: "scientifique" },
    { id: 4, entry_id: 40, lemma: "lenguas", normalized_lemma: "lenguas", part_of_speech: "noun", confidence_score: 0.98, language_code: "es", entry_key: "LANGUAGE_SYSTEM", gloss_fr: "langue" },
    { id: 5, entry_id: 50, lemma: "comprender", normalized_lemma: "comprender", part_of_speech: "verb", confidence_score: 0.99, language_code: "es", entry_key: "UNDERSTAND_COMPREHEND", gloss_fr: "comprendre" },
  ];
  const relatedForms = [
    sourceForms[0],
    { id: 6, entry_id: 10, lemma: "organisation", normalized_lemma: "organisation", part_of_speech: "noun", language_code: "fr" },
    sourceForms[3],
    { id: 7, entry_id: 40, lemma: "langues", normalized_lemma: "langues", part_of_speech: "noun", language_code: "fr" },
    { id: 8, entry_id: 40, lemma: "lingue", normalized_lemma: "lingue", part_of_speech: "noun", language_code: "it" },
    { id: 9, entry_id: 40, lemma: "línguas", normalized_lemma: "linguas", part_of_speech: "noun", language_code: "pt" },
  ];
  const relations = [{
    id: 1,
    source_form_id: 6,
    target_form_id: 1,
    relation_type: "COGNATE_STRONG",
    score: 0.94,
    is_symmetric: 1,
    source_label: "api_mock_support_v0",
    source_lemma: "organisation",
    source_language_code: "fr",
    target_lemma: "organización",
    target_language_code: "es",
  }];
  const rules = [{
    id: 1,
    pattern_type: "SUFFIX_TRANSFORM",
    source_pattern: "ción",
    target_pattern: "tion",
    description: "Correspondance fréquente.",
    reliability_score: 0.88,
    source_language_code: "es",
    target_language_code: "fr",
  }];

  const response = analyze(validation.value, {
    sourceForms,
    relatedForms,
    relations,
    rules,
  });
  const types = new Set(response.tokens.flatMap((token) => token.enrichments.map((item) => item.type)));

  assert.equal(response.contract_version, "0.1");
  assert.deepEqual(types, new Set([
    "lexical_transparency",
    "pan_romance_family",
    "form_correspondence",
    "grapho_phonetic_signal",
    "syntax_role",
    "morphosyntactic_signal",
    "affix_signal",
  ]));
  assert.equal(response.tokens.some((token) => "lookup_key" in token), false);
});

test("analysis attaches canonical lemma enrichments to an inflected surface", () => {
  const validation = validateRequest({
    contract_version: "0.1",
    text: "utiles",
    source_language: "fr",
    mediation_language: "es",
    comparison_languages: ["it", "pt"],
    sieves: [2],
  }, languages);
  assert.equal(validation.ok, true);

  const canonicalForm = {
    id: 101,
    entry_id: 501,
    lemma: "utile",
    normalized_lemma: "utile",
    matched_lookup_key: "utiles",
    match_kind: "inflected_form",
    inflected_form_id: 77,
    part_of_speech: "adjective",
    language_code: "fr",
    entry_key: "USEFUL",
    gloss_fr: "utile",
  };
  const response = analyze(validation.value, {
    sourceForms: [canonicalForm],
    relatedForms: [
      canonicalForm,
      { id: 102, entry_id: 501, lemma: "útil", language_code: "es" },
      { id: 103, entry_id: 501, lemma: "utile", language_code: "it" },
      { id: 104, entry_id: 501, lemma: "útil", language_code: "pt" },
    ],
    relations: [],
    rules: [],
  });

  assert.equal(response.tokens[0].surface, "utiles");
  assert.equal(response.tokens[0].enrichments[0].type, "pan_romance_family");
  assert.equal(response.tokens[0].enrichments[0].payload.family_label, "utile");
});

test("analysis emits a validated plural sieve 6 enrichment from inflected_form metadata", () => {
  const validation = validateRequest({
    contract_version: "0.1",
    text: "organizaciones",
    source_language: "es",
    mediation_language: "fr",
    comparison_languages: [],
    sieves: [6],
  }, languages);
  assert.equal(validation.ok, true);

  const response = analyze(validation.value, {
    sourceForms: [{
      id: 104,
      entry_id: 501,
      lemma: "organización",
      normalized_lemma: "organizacion",
      matched_lookup_key: "organizaciones",
      match_kind: "inflected_form",
      inflected_form_id: 1,
      inflected_grammatical_number: "PLURAL",
      inflected_status: "VALIDATED",
      inflected_source_label: "manual_admin_v0",
      inflected_confidence_score: 1,
      part_of_speech: "noun",
      language_code: "es",
      entry_key: "ORGANIZATION_ENTITY",
    }],
    relatedForms: [],
    relations: [],
    rules: [],
  });

  const enrichment = response.tokens[0].enrichments[0];
  assert.equal(enrichment.sieve_id, 6);
  assert.equal(enrichment.type, "morphosyntactic_signal");
  assert.equal(enrichment.label, "Pluriel validé");
  assert.deepEqual(enrichment.source, {
    kind: "inflected_form",
    id: 1,
    label: "Dico-IC",
  });
  assert.deepEqual(enrichment.payload, {
    category: "validated_plural",
    grammatical_number: "PLURAL",
    lemma: "organización",
    surface_form: "organizaciones",
  });
  assert.equal(response.sieves.find((sieve) => sieve.id === 6).result_count, 1);
});

test("analysis does not emit the noun-only V0 plural enrichment for an adjective mapping", () => {
  const validation = validateRequest({
    contract_version: "0.1",
    text: "utiles",
    source_language: "fr",
    mediation_language: "es",
    comparison_languages: [],
    sieves: [6],
  }, languages);

  const response = analyze(validation.value, {
    sourceForms: [{
      id: 101,
      entry_id: 501,
      lemma: "utile",
      matched_lookup_key: "utiles",
      match_kind: "inflected_form",
      inflected_form_id: 77,
      inflected_grammatical_number: "PLURAL",
      inflected_status: "VALIDATED",
      part_of_speech: "adjective",
      language_code: "fr",
    }],
    relatedForms: [],
    relations: [],
    rules: [],
  });

  assert.equal(response.tokens[0].enrichments.length, 0);
});

test("analysis emits exact multi-token connector help with UTF-16 offsets", () => {
  const validation = validateRequest({
    contract_version: "0.1",
    text: "😀 Sin embargo, por tanto seguimos.",
    source_language: "es",
    mediation_language: "fr",
    comparison_languages: [],
    sieves: [1, 4, 6],
  }, languages);
  const response = analyze(validation.value, {
    sourceForms: [],
    relatedForms: [],
    relations: [],
    rules: [],
    connectorHelps: [
      {
        id: 1,
        normalized_expression: "sin embargo",
        discourse_function: "OPPOSITION",
        pedagogical_title: "Connecteur logique",
        pedagogical_hint: "Une idée contrastée suit probablement.",
        example: "sin embargo / cependant",
        caution: "La fonction exacte dépend du contexte.",
      },
      {
        id: 2,
        normalized_expression: "por tanto",
        discourse_function: "CONSEQUENCE",
        pedagogical_title: "Connecteur logique",
        pedagogical_hint: "Une conséquence suit probablement.",
        example: "por tanto / donc",
        caution: "La fonction exacte dépend du contexte.",
      },
    ],
  });

  assert.equal(response.pedagogical_enrichments.length, 2);
  const first = response.pedagogical_enrichments[0];
  assert.equal(first.expression, "Sin embargo");
  assert.deepEqual(first.token_indexes, [1, 2]);
  assert.equal(first.start, 3);
  assert.equal(first.end, 14);
  assert.equal(validation.value.text.slice(first.start, first.end), first.expression);
  assert.equal(Object.hasOwn(first, "sieve_id"), false);
  assert.equal(response.tokens.every((token) => token.enrichments.length === 0), true);
});

test("analysis recognizes French connector spans and ignores case", () => {
  const validation = validateRequest({
    contract_version: "0.1",
    text: "PARCE QUE le texte est clair.",
    source_language: "fr",
    mediation_language: "es",
    comparison_languages: [],
    sieves: [5],
  }, languages);
  const response = analyze(validation.value, {
    sourceForms: [], relatedForms: [], relations: [], rules: [],
    connectorHelps: [{
      id: 3,
      normalized_expression: "parce que",
      discourse_function: "CAUSE",
      pedagogical_title: "Connecteur logique",
      pedagogical_hint: "Une raison suit probablement.",
      example: "parce que / porque",
      caution: "La fonction exacte dépend du contexte.",
    }],
  });
  assert.equal(response.pedagogical_enrichments[0].expression, "PARCE QUE");
  assert.deepEqual(response.pedagogical_enrichments[0].token_indexes, [0, 1]);
});

test("analysis preserves accents and rejects internal punctuation", () => {
  const validation = validateRequest({
    contract_version: "0.1",
    text: "Además, ademas, sin, embargo.",
    source_language: "es",
    mediation_language: "fr",
    comparison_languages: [],
    sieves: [],
  }, languages);
  const response = analyze(validation.value, {
    sourceForms: [], relatedForms: [], relations: [], rules: [],
    connectorHelps: [
      {
        id: 4,
        normalized_expression: "además",
        discourse_function: "ADDITION",
        pedagogical_title: "Connecteur logique",
        pedagogical_hint: "Une information est ajoutée.",
      },
      {
        id: 5,
        normalized_expression: "sin embargo",
        discourse_function: "OPPOSITION",
        pedagogical_title: "Connecteur logique",
        pedagogical_hint: "Une opposition est introduite.",
      },
    ],
  });
  assert.deepEqual(response.pedagogical_enrichments.map((item) => item.expression), ["Además"]);
});
