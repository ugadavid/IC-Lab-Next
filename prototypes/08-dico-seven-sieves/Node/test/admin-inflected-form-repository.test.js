const test = require("node:test");
const assert = require("node:assert/strict");

const { createRepository } = require("../src/repository");

function sqlText(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

function mappingPayload() {
  return {
    lexical_form_id: 123,
    surface_form: "utiles",
    normalized_surface: "utiles",
    grammatical_number: "PLURAL",
    status: "VALIDATED",
    source_label: "manual_admin_v0",
    confidence_score: 1,
  };
}

function createMappingHarness({ target = {}, insertError = null } = {}) {
  const calls = [];
  const state = { committed: false, rolledBack: false, released: false };
  const defaultTarget = {
    id: 123,
    lemma: "utile",
    part_of_speech: "adjective",
    language: "fr",
    entry_key: "USEFUL",
    ...target,
  };
  const connection = {
    async beginTransaction() { calls.push({ type: "begin" }); },
    async commit() { state.committed = true; },
    async rollback() { state.rolledBack = true; },
    release() { state.released = true; },
    async execute(sql, parameters) {
      const statement = sqlText(sql);
      calls.push({ type: "execute", statement, parameters });
      if (statement.includes("FROM lexical_form lf") && statement.endsWith("FOR UPDATE")) {
        return [target === null ? [] : [defaultTarget]];
      }
      if (statement.startsWith("INSERT INTO inflected_form")) {
        if (insertError) throw insertError;
        return [{ insertId: 8 }];
      }
      if (statement.includes("FROM inflected_form inflected") && statement.includes("WHERE inflected.id = ?")) {
        return [[{
          id: 8,
          ...mappingPayload(),
          lemma: "utile",
          part_of_speech: "adjective",
          language: "fr",
          entry_key: "USEFUL",
          created_at: "2026-06-21T10:00:00.000Z",
        }]];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    },
  };
  return {
    repository: createRepository({ async getConnection() { return connection; } }),
    calls,
    state,
  };
}

test("repository creates a validated noun/adjective plural mapping transactionally", async () => {
  const harness = createMappingHarness();
  const created = await harness.repository.createAdminInflectedForm(mappingPayload());

  assert.equal(created.surface_form, "utiles");
  assert.equal(created.lemma, "utile");
  assert.equal(harness.state.committed, true);
  assert.equal(harness.state.rolledBack, false);
  assert.equal(harness.state.released, true);
  const insert = harness.calls.find((call) => call.statement?.startsWith("INSERT INTO inflected_form"));
  assert.deepEqual(insert.parameters.slice(0, 4), [123, "utiles", "utiles", "PLURAL"]);
});

test("repository refuses a missing inflected-form target", async () => {
  const harness = createMappingHarness({ target: null });
  await assert.rejects(
    harness.repository.createAdminInflectedForm(mappingPayload()),
    (error) => error.code === "TARGET_FORM_NOT_FOUND"
  );
  assert.equal(harness.state.rolledBack, true);
  assert.equal(harness.state.committed, false);
});

test("repository refuses a target outside noun and adjective", async () => {
  const harness = createMappingHarness({ target: { part_of_speech: "verb" } });
  await assert.rejects(
    harness.repository.createAdminInflectedForm(mappingPayload()),
    (error) => error.code === "UNSUPPORTED_INFLECTED_FORM_POS"
  );
  assert.equal(harness.state.rolledBack, true);
});

test("repository maps an exact SQL collision to a clear duplicate error", async () => {
  const sqlError = new Error("Duplicate entry");
  sqlError.code = "ER_DUP_ENTRY";
  const harness = createMappingHarness({ insertError: sqlError });
  await assert.rejects(
    harness.repository.createAdminInflectedForm(mappingPayload()),
    (error) => error.code === "DUPLICATE_INFLECTED_FORM"
  );
  assert.equal(harness.state.rolledBack, true);
  assert.equal(harness.state.committed, false);
});

test("repository lists inflected forms with filters and pagination", async () => {
  const calls = [];
  const repository = createRepository({
    async execute(sql, parameters) {
      const statement = sqlText(sql);
      calls.push({ statement, parameters });
      if (statement.startsWith("SELECT COUNT(*)")) return [[{ total: 4 }]];
      return [[{ id: 8, surface_form: "utiles", lemma: "utile", status: "VALIDATED" }]];
    },
  });
  const result = await repository.getAdminInflectedForms({
    search: "utile",
    status: "VALIDATED",
    limit: 10,
    offset: 20,
  });

  assert.equal(result.total, 4);
  assert.equal(result.items[0].lemma, "utile");
  assert.deepEqual(calls[1].parameters.slice(-2), [10, 20]);
});

test("analysis resource loading resolves a validated plural without writing", async () => {
  const statements = [];
  const canonical = {
    id: 123,
    entry_id: 501,
    lemma: "utile",
    normalized_lemma: "utile",
    part_of_speech: "adjective",
    language_code: "fr",
    entry_key: "USEFUL",
    gloss_fr: "utile",
    matched_lookup_key: "utiles",
    match_kind: "inflected_form",
    inflected_form_id: 8,
    inflected_grammatical_number: "PLURAL",
    inflected_status: "VALIDATED",
    inflected_source_label: "manual_admin_v0",
    inflected_confidence_score: 1,
  };
  const repository = createRepository({
    async execute(sql) {
      const statement = sqlText(sql);
      statements.push(statement);
      if (statement.includes("FROM connector_help ch")) return [[]];
      if (statement.includes("FROM inflected_form inflected")
          && statement.includes("inflected.status = 'VALIDATED'")) return [[canonical]];
      if (statement.includes("lf.normalized_lemma IN")) return [[]];
      if (statement.includes("WHERE lf.entry_id IN")) return [[canonical]];
      if (statement.includes("FROM form_relation r")) return [[]];
      if (statement.includes("FROM pattern_rule pr")) return [[]];
      throw new Error(`Unexpected SQL: ${statement}`);
    },
  });
  const resources = await repository.loadAnalysisResources({
    source_language: "fr",
    mediation_language: "es",
    comparison_languages: [],
    tokens: [{ kind: "word", lookup_key: "utiles" }],
  });

  assert.equal(resources.sourceForms[0].lemma, "utile");
  assert.equal(resources.sourceForms[0].matched_lookup_key, "utiles");
  assert.equal(resources.sourceForms[0].match_kind, "inflected_form");
  assert.equal(resources.sourceForms[0].inflected_grammatical_number, "PLURAL");
  const inflectedQuery = statements.find((statement) => statement.includes("FROM inflected_form"));
  assert.match(inflectedQuery, /inflected\.grammatical_number AS inflected_grammatical_number/);
  assert.match(inflectedQuery, /inflected\.status AS inflected_status/);
  const connectorQuery = statements.find((statement) => statement.includes("FROM connector_help ch"));
  assert.match(connectorQuery, /ch\.status = 'VALIDATED'/);
  assert.equal(statements.every((statement) => statement.startsWith("SELECT")), true);
});

test("analysis resource loading keeps exact lexical matches ahead of inflected mappings", async () => {
  const statements = [];
  const exact = {
    id: 124,
    entry_id: 502,
    lemma: "utile",
    normalized_lemma: "utile",
    matched_lookup_key: "utile",
    part_of_speech: "adjective",
    language_code: "fr",
  };
  const repository = createRepository({
    async execute(sql) {
      const statement = sqlText(sql);
      statements.push(statement);
      if (statement.includes("FROM connector_help ch")) return [[]];
      if (statement.includes("lf.normalized_lemma IN")) return [[exact]];
      if (statement.includes("WHERE lf.entry_id IN")) return [[exact]];
      if (statement.includes("FROM form_relation r")) return [[]];
      if (statement.includes("FROM pattern_rule pr")) return [[]];
      throw new Error(`Unexpected SQL: ${statement}`);
    },
  });
  const resources = await repository.loadAnalysisResources({
    source_language: "fr",
    mediation_language: "es",
    comparison_languages: [],
    tokens: [{ kind: "word", lookup_key: "utile" }],
  });

  assert.equal(resources.sourceForms[0].id, 124);
  assert.equal(statements.some((statement) => statement.includes("FROM inflected_form")), false);
});
