const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server");

const languages = ["fr", "es", "it", "pt", "en"].map((code) => ({ code }));

async function withServer(repository, callback) {
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("lexical entries endpoint forwards limit and offset", async () => {
  let received;
  await withServer({
    async getAdminLexicalEntries(options) {
      received = options;
      return { items: [{ entry_key: "ENTRY_31", forms: [] }], total: 67 };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/lexical-entries?limit=30&offset=30`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.offset, 30);
    assert.equal(data.total, 67);
    assert.equal(data.items.length, 1);
  });
  assert.deepEqual(received, { search: "", limit: 30, offset: 30 });
});

test("lexical entries endpoint keeps search with pagination", async () => {
  let received;
  await withServer({
    async getAdminLexicalEntries(options) {
      received = options;
      return { items: [], total: 0 };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/lexical-entries?search=international&limit=10&offset=20`);
    assert.equal(response.status, 200);
  });
  assert.deepEqual(received, { search: "international", limit: 10, offset: 20 });
});

test("lexical entry endpoint updates a validated existing entry", async () => {
  let updated;
  const repository = {
    async getLanguages() { return languages; },
    async updateAdminLexicalEntry(entryKey, entry) {
      updated = { entryKey, entry };
      return { ...entry, entry_key: entryKey };
    },
  };
  await withServer(repository, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/lexical-entry/SCHOOL_PLACE`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gloss_fr: "école",
        gloss_en: "school",
        semantic_domain: "éducation",
        forms: [{ id: 42, language: "fr", lemma: "École", part_of_speech: "noun" }],
      }),
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.entry.forms[0].normalized_lemma, "ecole");
  });
  assert.equal(updated.entryKey, "SCHOOL_PLACE");
});

test("lexical entry endpoint accepts a new form without id", async () => {
  let updated;
  const repository = {
    async getLanguages() { return languages; },
    async updateAdminLexicalEntry(entryKey, entry) {
      updated = entry;
      return { ...entry, entry_key: entryKey };
    },
  };
  await withServer(repository, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/lexical-entry/UTIL_ADJECTIVE_USEFUL`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gloss_fr: "utile",
        forms: [
          { id: 539, language: "es", lemma: "útiles", part_of_speech: "adjective" },
          { language: "en", lemma: "useful", part_of_speech: "adjective" },
        ],
      }),
    });
    assert.equal(response.status, 200);
  });
  assert.equal(updated.forms.length, 2);
  assert.equal(Object.hasOwn(updated.forms[1], "id"), false);
  assert.equal(updated.forms[1].normalized_lemma, "useful");
});

test("lexical entry endpoint refuses an invalid update", async () => {
  let called = false;
  await withServer({
    async getLanguages() { return languages; },
    async updateAdminLexicalEntry() { called = true; },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/lexical-entry/SCHOOL_PLACE`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gloss_fr: "", forms: [] }),
    });
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.equal(data.error.code, "INVALID_GLOSS");
  });
  assert.equal(called, false);
});

test("form relation endpoint creates a valid relation", async () => {
  let created;
  await withServer({
    async createAdminFormRelation(relation) {
      created = relation;
      return { id: 9, ...relation };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/form-relation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_form_id: 121,
        target_form_id: 120,
        relation_type: "COGNATE_STRONG",
        score: 0.95,
        source_label: "manual_admin_v0",
      }),
    });
    assert.equal(response.status, 201);
  });
  assert.equal(created.is_symmetric, true);
});

test("form relation endpoint reports a missing form", async () => {
  await withServer({
    async createAdminFormRelation() {
      const error = new Error("La forme source ou la forme cible n’existe pas.");
      error.code = "FORM_NOT_FOUND";
      throw error;
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/form-relation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_form_id: 999, target_form_id: 120, relation_type: "COGNATE_STRONG", score: 0.95 }),
    });
    const data = await response.json();
    assert.equal(response.status, 404);
    assert.equal(data.error.code, "FORM_NOT_FOUND");
  });
});

test("form relation endpoint reports a duplicate relation", async () => {
  await withServer({
    async createAdminFormRelation() {
      const error = new Error("Cette relation existe déjà entre les deux formes.");
      error.code = "DUPLICATE_RELATION";
      throw error;
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/form-relation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_form_id: 121, target_form_id: 120, relation_type: "COGNATE_STRONG", score: 0.95 }),
    });
    const data = await response.json();
    assert.equal(response.status, 409);
    assert.equal(data.error.code, "DUPLICATE_RELATION");
  });
});

test("inflected forms endpoint lists paginated mappings", async () => {
  let received;
  await withServer({
    async getAdminInflectedForms(options) {
      received = options;
      return { items: [{ id: 1, surface_form: "utiles" }], total: 1 };
    },
  }, async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/admin/inflected-forms?search=utile&status=VALIDATED&limit=10&offset=20`
    );
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.total, 1);
    assert.equal(data.items[0].surface_form, "utiles");
  });
  assert.deepEqual(received, { search: "utile", status: "VALIDATED", limit: 10, offset: 20 });
});

test("text coverage endpoint distinguishes known lemmas and inflected mappings without writing", async () => {
  let createCalled = false;
  let received;
  await withServer({
    async getLanguages() { return languages; },
    async findTextCoverageForms(normalizedSurfaces, language) {
      received = { normalizedSurfaces, language };
      return {
        lexicalForms: [{
          normalized_lemma: "organizacion",
          lemma: "organización",
          part_of_speech: "noun",
          language: "es",
          entry_key: "ORGANIZATION_ENTITY",
          gloss_fr: "organisation",
        }],
        inflectedForms: [{
          id: 1,
          lexical_form_id: 41,
          normalized_surface: "organizaciones",
          grammatical_number: "PLURAL",
          status: "VALIDATED",
          lemma: "organización",
          part_of_speech: "noun",
          language: "es",
          entry_key: "ORGANIZATION_ENTITY",
        }],
      };
    },
    async createAdminInflectedForm() { createCalled = true; },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/text-coverage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_language: "es",
        text: "Organización organizaciones inéditas.",
      }),
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.summary.known_lemmas, 1);
    assert.equal(data.summary.known_inflected_forms, 1);
    assert.equal(data.summary.forms_to_review, 1);
  });
  assert.equal(received.language, "es");
  assert.equal(received.normalizedSurfaces.includes("organizaciones"), true);
  assert.equal(createCalled, false);
});

test("inflected form endpoint creates a normalized mapping", async () => {
  let created;
  await withServer({
    async createAdminInflectedForm(mapping) {
      created = mapping;
      return { id: 8, lemma: "utile", language: "fr", entry_key: "USEFUL", ...mapping };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/inflected-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lexical_form_id: 123,
        surface_form: "Utiles",
        grammatical_number: "PLURAL",
        status: "VALIDATED",
        confidence_score: 1,
      }),
    });
    const data = await response.json();
    assert.equal(response.status, 201);
    assert.equal(data.mapping.normalized_surface, "utiles");
  });
  assert.equal(created.normalized_surface, "utiles");
});

test("inflected form endpoint rejects an invalid status before repository access", async () => {
  let called = false;
  await withServer({
    async createAdminInflectedForm() { called = true; },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/inflected-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lexical_form_id: 123, surface_form: "utiles", status: "INVALID" }),
    });
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.equal(data.error.code, "INVALID_INFLECTED_FORM_STATUS");
  });
  assert.equal(called, false);
});

for (const scenario of [
  { code: "TARGET_FORM_NOT_FOUND", status: 404 },
  { code: "UNSUPPORTED_INFLECTED_FORM_POS", status: 422 },
  { code: "UNSUPPORTED_INFLECTED_FORM_LANGUAGE", status: 422 },
  { code: "DUPLICATE_INFLECTED_FORM", status: 409 },
]) {
  test(`inflected form endpoint reports ${scenario.code}`, async () => {
    await withServer({
      async createAdminInflectedForm() {
        const error = new Error("Mapping refusé.");
        error.code = scenario.code;
        throw error;
      },
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/admin/inflected-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lexical_form_id: 123, surface_form: "utiles" }),
      });
      const data = await response.json();
      assert.equal(response.status, scenario.status);
      assert.equal(data.error.code, scenario.code);
    });
  });
}
