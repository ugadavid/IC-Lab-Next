const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server");
const { AdminAiError } = require("../src/admin-ai-domain");
const {
  annotateExistingRelations,
  buildRelationPrompts,
  generateRelationCandidates,
  parseAndValidateRelationJson,
  validateRelationCandidateRequest,
} = require("../src/admin-ai-relations");

const entry = {
  entry_key: "INTERNATIONAL",
  gloss_fr: "international",
  gloss_en: "international",
  forms: [
    { id: 120, language: "fr", lemma: "international", part_of_speech: "noun" },
    { id: 121, language: "es", lemma: "internacional", part_of_speech: "noun" },
    { id: 122, language: "it", lemma: "internazionale", part_of_speech: "noun" },
  ],
};

async function withServer(repository, callback) {
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("AI relation request rejects an invalid entry key", () => {
  assert.throws(
    () => validateRelationCandidateRequest({ entry_key: "?" }),
    (error) => error instanceof AdminAiError && error.code === "INVALID_ENTRY_KEY"
  );
});

test("relation assistant keeps FR as the historical default", () => {
  const request = validateRelationCandidateRequest({ entry_key: "INTERNATIONAL" });
  assert.equal(request.reference_language, "fr");
  assert.match(buildRelationPrompts({ ...entry, ...request }).system, /référence FR/);
});

for (const referenceLanguage of ["fr", "es", "it", "pt", "en"]) {
  test(`relation assistant accepts reference language ${referenceLanguage.toUpperCase()}`, () => {
    const request = validateRelationCandidateRequest({
      entry_key: "INTERNATIONAL",
      reference_language: referenceLanguage,
    });
    const prompts = buildRelationPrompts({ ...entry, ...request });
    assert.equal(request.reference_language, referenceLanguage);
    assert.match(prompts.system, new RegExp(`référence ${referenceLanguage.toUpperCase()}`));
  });
}

test("relation assistant accepts ALL mode without a pivot", () => {
  const request = validateRelationCandidateRequest({
    entry_key: "INTERNATIONAL",
    reference_language: "all",
  });
  const prompts = buildRelationPrompts({ ...entry, ...request });
  assert.equal(request.reference_language, "all");
  assert.match(prompts.system, /sans langue pivot/);
});

test("relation assistant refuses an invalid reference language", () => {
  assert.throws(
    () => validateRelationCandidateRequest({
      entry_key: "INTERNATIONAL",
      reference_language: "de",
    }),
    (error) => error instanceof AdminAiError && error.code === "INVALID_REFERENCE_LANGUAGE"
  );
});

test("AI relation JSON accepts forms from the requested entry", () => {
  const result = parseAndValidateRelationJson(JSON.stringify({
    candidates: [{
      left_form_id: 121,
      right_form_id: 120,
      relation_type: "COGNATE_STRONG",
      score: 0.95,
      justification: "formes quasi identiques",
    }],
  }), entry);

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].score, 0.95);
});

test("AI relation JSON refuses an unknown relation type", () => {
  assert.throws(
    () => parseAndValidateRelationJson({
      candidates: [{
        left_form_id: 121,
        right_form_id: 120,
        relation_type: "TRANSLATION",
        score: 0.95,
        justification: "test",
      }],
    }, entry),
    (error) => error instanceof AdminAiError && error.code === "OPENAI_INVALID_RELATION_TYPE"
  );
});

test("AI relation JSON refuses a form outside the requested entry", () => {
  assert.throws(
    () => parseAndValidateRelationJson({
      candidates: [{
        left_form_id: 999,
        right_form_id: 120,
        relation_type: "COGNATE_STRONG",
        score: 0.95,
        justification: "test",
      }],
    }, entry),
    (error) => error instanceof AdminAiError && error.code === "OPENAI_FORM_OUT_OF_SCOPE"
  );
});

test("existing relation is annotated and not treated as new", () => {
  const candidates = [{
    left_form_id: 121,
    right_form_id: 120,
    relation_type: "COGNATE_STRONG",
    score: 0.95,
    justification: "formes quasi identiques",
  }];
  const result = annotateExistingRelations(candidates, [{
    id: 7,
    source_form_id: 120,
    target_form_id: 121,
    relation_type: "COGNATE_STRONG",
    score: 0.94,
  }]);

  assert.equal(result[0].status, "existing");
  assert.equal(result[0].existing_relation.id, 7);
});

test("relation generator refuses an entry without enough forms", async () => {
  await assert.rejects(
    generateRelationCandidates({ ...entry, forms: [] }, { apiKey: "test" }),
    (error) => error instanceof AdminAiError && error.code === "INSUFFICIENT_FORMS"
  );
});

test("relation generator parses a valid strict OpenAI response", async () => {
  const result = await generateRelationCandidates(entry, {
    apiKey: "test",
    model: "test-model",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          id: "resp_test",
          output_text: JSON.stringify({
            candidates: [{
              left_form_id: 121,
              right_form_id: 120,
              relation_type: "COGNATE_STRONG",
              score: 0.95,
              justification: "formes quasi identiques",
            }],
          }),
        };
      },
    }),
  });

  assert.equal(result.model, "test-model");
  assert.equal(result.candidates[0].left_form_id, 121);
});

test("relation candidate endpoint reports an unknown entry", async () => {
  await withServer({
    async getAdminLexicalEntry() { return null; },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/ai/relation-candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_key: "MISSING_ENTRY" }),
    });
    const data = await response.json();
    assert.equal(response.status, 404);
    assert.equal(data.error.code, "ENTRY_NOT_FOUND");
  });
});

test("relation candidate endpoint reports an entry without forms", async () => {
  await withServer({
    async getAdminLexicalEntry() { return { ...entry, forms: [] }; },
    async getAdminRelationsForFormIds() { return []; },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/ai/relation-candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_key: "INTERNATIONAL" }),
    });
    const data = await response.json();
    assert.equal(response.status, 422);
    assert.equal(data.error.code, "INSUFFICIENT_FORMS");
  });
});

test("validated AI candidate is created through the existing manual endpoint", async () => {
  const candidate = parseAndValidateRelationJson({
    candidates: [{
      left_form_id: 121,
      right_form_id: 120,
      relation_type: "COGNATE_STRONG",
      score: 0.95,
      justification: "formes quasi identiques",
    }],
  }, entry).candidates[0];
  let written;
  await withServer({
    async createAdminFormRelation(relation) {
      written = relation;
      return { id: 99, ...relation };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/form-relation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_form_id: candidate.left_form_id,
        target_form_id: candidate.right_form_id,
        relation_type: candidate.relation_type,
        score: candidate.score,
        source_label: "ai_relations_v0",
      }),
    });
    assert.equal(response.status, 201);
  });
  assert.equal(written.source_label, "ai_relations_v0");
  assert.equal(written.is_symmetric, true);
});
