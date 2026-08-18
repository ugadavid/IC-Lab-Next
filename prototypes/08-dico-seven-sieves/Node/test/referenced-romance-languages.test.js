const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createApp } = require("../server");
const {
  BASE_LANGUAGES,
  EXPECTED_FUNCTIONAL_VOLUMES,
  TARGET_LANGUAGES,
  classifyLanguageState,
  validateFunctionalVolumes,
  validateNoDependencies,
} = require("../scripts/manage-referenced-romance-languages.js");

const OPERATIONAL_CODES = ["fr", "es", "it", "pt", "en"];
const TARGET_CODES = ["ca", "gl", "oc", "ro", "co", "sc", "rm"];

async function withServer(repository, callback) {
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("the dedicated script defines the seven exact referenced Romance rows", () => {
  assert.deepEqual(TARGET_LANGUAGES, [
    { code: "ca", name: "Català", family: "Romance", is_romance: 1, documentation_status: "REFERENCED", is_active: 0 },
    { code: "gl", name: "Galego", family: "Romance", is_romance: 1, documentation_status: "REFERENCED", is_active: 0 },
    { code: "oc", name: "Occitan", family: "Romance", is_romance: 1, documentation_status: "REFERENCED", is_active: 0 },
    { code: "ro", name: "Română", family: "Romance", is_romance: 1, documentation_status: "REFERENCED", is_active: 0 },
    { code: "co", name: "Corsu", family: "Romance", is_romance: 1, documentation_status: "REFERENCED", is_active: 0 },
    { code: "sc", name: "Sardu", family: "Romance", is_romance: 1, documentation_status: "REFERENCED", is_active: 0 },
    { code: "rm", name: "Rumantsch", family: "Romance", is_romance: 1, documentation_status: "REFERENCED", is_active: 0 },
  ]);
  assert.equal(classifyLanguageState(BASE_LANGUAGES), "pending");
  assert.equal(classifyLanguageState([
    ...BASE_LANGUAGES,
    ...TARGET_LANGUAGES.map((language, index) => ({ id: index + 6, ...language })),
  ]), "applied");
});

test("the dedicated script refuses partial or conflicting target rows", () => {
  assert.throws(() => classifyLanguageState([
    ...BASE_LANGUAGES,
    { id: 6, ...TARGET_LANGUAGES[0] },
  ]), /état partiel ou collision/);
  assert.throws(() => classifyLanguageState([
    ...BASE_LANGUAGES,
    ...TARGET_LANGUAGES.map((language, index) => ({
      id: index + 6,
      ...language,
      name: index === 0 ? "Catalan conflictuel" : language.name,
    })),
  ]), /name inattendu/);
});

test("functional volumes stay fixed and rollback is blocked by any dependency", () => {
  assert.doesNotThrow(() => validateFunctionalVolumes(EXPECTED_FUNCTIONAL_VOLUMES));
  assert.throws(() => validateFunctionalVolumes({
    ...EXPECTED_FUNCTIONAL_VOLUMES,
    lexical_forms: 598,
  }), /volume lexical_forms inattendu/);
  assert.doesNotThrow(() => validateNoDependencies({
    lexical_forms: 0, inflected_forms: 0, connector_helps: 0,
    pattern_rules: 0, form_relations: 0, ic_features: 0,
  }));
  assert.throws(() => validateNoDependencies({
    lexical_forms: 1, inflected_forms: 0, connector_helps: 0,
    pattern_rules: 0, form_relations: 0, ic_features: 0,
  }), /1 dépendance/);
});

test("all seven forged analyses stay rejected while manual lexical writes are accepted", async () => {
  let writes = 0;
  const repository = {
    async getLanguages() { return OPERATIONAL_CODES.map((code) => ({ code })); },
    async getDocumentableLanguages() {
      return [...OPERATIONAL_CODES, ...TARGET_CODES].map((code) => ({ code }));
    },
    async loadAnalysisResources() { throw new Error("analysis resources must not be loaded"); },
    async createAdminLexicalEntry(entry) { writes += 1; return entry; },
  };
  await withServer(repository, async (baseUrl) => {
    for (const code of TARGET_CODES) {
      const analysisResponse = await fetch(`${baseUrl}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_version: "0.1",
          text: "Texte de contrôle",
          source_language: code,
          mediation_language: "fr",
          comparison_languages: ["es"],
          sieves: [1],
        }),
      });
      assert.equal(analysisResponse.status, 400, code);
      assert.equal((await analysisResponse.json()).error.code, "INVALID_LANGUAGE", code);

      const writeResponse = await fetch(`${baseUrl}/admin/lexical-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_key: `FORGED_${code.toUpperCase()}_ENTRY`,
          gloss_fr: "contrôle",
          forms: [{ language: code, lemma: "contrôle", part_of_speech: "noun" }],
        }),
      });
      assert.equal(writeResponse.status, 201, code);
      assert.equal((await writeResponse.json()).entry.forms[0].language, code);
    }

    const unknownResponse = await fetch(`${baseUrl}/admin/lexical-entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry_key: "FORGED_UNKNOWN_ENTRY",
        gloss_fr: "contrôle",
        forms: [{ language: "xx", lemma: "contrôle", part_of_speech: "noun" }],
      }),
    });
    assert.equal(unknownResponse.status, 400);
    assert.equal((await unknownResponse.json()).error.code, "INVALID_LANGUAGE");
  });
  assert.equal(writes, 7);
});

test("AI domain and text requests reject all seven referenced codes before generation", async () => {
  await withServer({
    async getLanguages() { return OPERATIONAL_CODES.map((code) => ({ code })); },
  }, async (baseUrl) => {
    for (const code of TARGET_CODES) {
      const response = await fetch(`${baseUrl}/admin/ai/domain-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: "école", count: 10, languages: [code], level: "A1", parts_of_speech: ["noun"],
        }),
      });
      assert.equal(response.status, 400, code);
      assert.equal((await response.json()).error.code, "INVALID_LANGUAGES", code);

      const coverageResponse = await fetch(`${baseUrl}/admin/text-coverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "mot de contrôle", source_language: code }),
      });
      assert.equal(coverageResponse.status, 400, code);
      assert.equal((await coverageResponse.json()).error.code, "INVALID_SOURCE_LANGUAGE", code);

      const textCandidateResponse = await fetch(`${baseUrl}/admin/ai/text-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unknown_words: ["contrôle"], languages: [code] }),
      });
      assert.equal(textCandidateResponse.status, 400, code);
      assert.equal((await textCandidateResponse.json()).error.code, "INVALID_LANGUAGES", code);
    }
  });
});

test("the retained fresh seed writes explicit REFERENCED statuses without changing the procedure", () => {
  const root = path.resolve(__dirname, "../..");
  const seed = fs.readFileSync(path.join(root, "database/current_draft/20_seed_base.sql"), "utf8");
  const procedures = fs.readFileSync(path.join(root, "database/current_draft/10_procedures.sql"), "utf8");
  for (const code of TARGET_CODES) {
    assert.match(seed, new RegExp(`\\('${code}',[\\s\\S]*?'REFERENCED', FALSE\\)`));
  }
  assert.equal((seed.match(/'REFERENCED'/gu) || []).length, 7);
  assert.match(procedures, /sp_upsert_language\s*\([\s\S]*p_is_active/u);
  assert.doesNotMatch(procedures, /p_documentation_status/u);
});

test("manual authoring UI exposes the 12 documentable languages in readable groups", () => {
  const root = path.resolve(__dirname, "../..");
  const script = fs.readFileSync(path.join(root, "admin/js/admin-0.1.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "admin/index-admin-0.1.html"), "utf8");
  assert.match(script, /DEFAULT_FORM_LANGUAGES = \["fr", "es", "it", "pt"\]/);
  assert.match(script, /apiRequest\("\/admin\/documentable-languages"\)/);
  assert.match(script, /Langues romanes documentées/);
  assert.match(script, /Langues romanes prêtes à documenter/);
  assert.match(script, /Langue non romane de comparaison/);
  assert.match(html, /app-version" content="0\.1\.5"/);
  assert.match(html, /Une langue prête à documenter peut déjà recevoir des formes linguistiques dans l’atelier manuel\. Elle ne devient analysable qu’après constitution, vérification et activation de son contenu\./);
});
