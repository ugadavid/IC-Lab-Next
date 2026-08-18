const test = require("node:test");
const assert = require("node:assert/strict");

const { createRepository } = require("../src/repository");

function normalizedSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

function createUpdateHarness({ existingIds = [539, 540, 541, 542], failInsert = false } = {}) {
  const calls = [];
  const state = { committed: false, rolledBack: false, released: false };
  const languageIds = { es: 2, fr: 1, it: 3, pt: 4, en: 5, ca: 6 };
  const connection = {
    async beginTransaction() { calls.push({ type: "begin" }); },
    async commit() { state.committed = true; calls.push({ type: "commit" }); },
    async rollback() { state.rolledBack = true; calls.push({ type: "rollback" }); },
    release() { state.released = true; calls.push({ type: "release" }); },
    async execute(sql, parameters) {
      const statement = normalizedSql(sql);
      calls.push({ type: "execute", statement, parameters });
      if (statement.startsWith("SELECT id FROM lexical_entry")) return [[{ id: 121 }]];
      if (statement.startsWith("SELECT id FROM lexical_form")) {
        return [existingIds.map((id) => ({ id }))];
      }
      if (statement.startsWith("SELECT id FROM language")) {
        const id = languageIds[parameters[0]];
        return [id ? [{ id }] : []];
      }
      if (statement.startsWith("INSERT INTO lexical_form") && failInsert) {
        const error = new Error("Duplicate entry");
        error.code = "ER_DUP_ENTRY";
        throw error;
      }
      if (statement.includes("FROM lexical_entry le")) {
        return [[{
          id: 121,
          entry_key: "UTIL_ADJECTIVE_USEFUL",
          gloss_fr: "qui sert à quelque chose",
          gloss_en: "serving a purpose",
          semantic_domain: "description",
          notes: "Modification manuelle via Dico-IC Admin V0.",
          form_id: 543,
          language: "en",
          lemma: "useful",
          normalized_lemma: "useful",
          part_of_speech: "adjective",
          confidence_score: 1,
        }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const pool = { async getConnection() { return connection; } };
  return { repository: createRepository(pool), calls, state };
}

function usefulEntry({ includeNew = true, existingIds = [539, 540, 541, 542] } = {}) {
  const formsById = {
    539: { id: 539, language: "es", lemma: "útiles", normalized_lemma: "utiles", part_of_speech: "adjective" },
    540: { id: 540, language: "fr", lemma: "utiles", normalized_lemma: "utiles", part_of_speech: "adjective" },
    541: { id: 541, language: "it", lemma: "utili", normalized_lemma: "utili", part_of_speech: "adjective" },
    542: { id: 542, language: "pt", lemma: "úteis", normalized_lemma: "uteis", part_of_speech: "adjective" },
  };
  const forms = existingIds.map((id) => ({
    ...formsById[id],
    confidence_score: 1,
    notes: "Modification manuelle via Dico-IC Admin V0.",
  }));
  if (includeNew) {
    forms.push({
      language: "en",
      lemma: "useful",
      normalized_lemma: "useful",
      part_of_speech: "adjective",
      confidence_score: 1,
      notes: "Ajout manuel via Dico-IC Admin V0.",
    });
  }
  return {
    entry_key: "UTIL_ADJECTIVE_USEFUL",
    gloss_fr: "qui sert à quelque chose",
    gloss_en: "serving a purpose",
    semantic_domain: "description",
    notes: "Modification manuelle via Dico-IC Admin V0.",
    forms,
  };
}

test("repository adds EN useful in the same transaction as existing form updates", async () => {
  const harness = createUpdateHarness();
  const updated = await harness.repository.updateAdminLexicalEntry(
    "UTIL_ADJECTIVE_USEFUL",
    usefulEntry()
  );

  const inserts = harness.calls.filter((call) => call.statement?.startsWith("INSERT INTO lexical_form"));
  const updates = harness.calls.filter((call) => call.statement?.startsWith("UPDATE lexical_form"));
  assert.equal(updates.length, 4);
  assert.equal(inserts.length, 1);
  assert.deepEqual(inserts[0].parameters.slice(0, 5), [121, 5, "useful", "useful", "adjective"]);
  assert.equal(harness.state.committed, true);
  assert.equal(harness.state.rolledBack, false);
  assert.equal(harness.state.released, true);
  assert.equal(updated.forms[0].lemma, "useful");
});

test("repository refuses an update when an existing form is missing", async () => {
  const harness = createUpdateHarness();
  await assert.rejects(
    harness.repository.updateAdminLexicalEntry(
      "UTIL_ADJECTIVE_USEFUL",
      usefulEntry({ existingIds: [539, 540, 541] })
    ),
    (error) => error.code === "INVALID_FORM_SET"
  );
  assert.equal(harness.state.committed, false);
  assert.equal(harness.state.rolledBack, true);
  assert.equal(harness.calls.some((call) => call.statement?.startsWith("UPDATE lexical_entry")), false);
});

test("repository rolls back all changes when a new form collides", async () => {
  const harness = createUpdateHarness({ failInsert: true });
  await assert.rejects(
    harness.repository.updateAdminLexicalEntry("UTIL_ADJECTIVE_USEFUL", usefulEntry()),
    (error) => error.code === "DUPLICATE_FORM"
  );
  assert.equal(harness.state.committed, false);
  assert.equal(harness.state.rolledBack, true);
  assert.equal(harness.state.released, true);
});

test("repository keeps the historical update-only behavior", async () => {
  const harness = createUpdateHarness();
  await harness.repository.updateAdminLexicalEntry(
    "UTIL_ADJECTIVE_USEFUL",
    usefulEntry({ includeNew: false })
  );
  assert.equal(
    harness.calls.some((call) => call.statement?.startsWith("INSERT INTO lexical_form")),
    false
  );
  assert.equal(harness.state.committed, true);
});

test("repository resolves referenced languages without requiring activation", async () => {
  const harness = createUpdateHarness();
  const entry = usefulEntry();
  entry.forms.at(-1).language = "ca";
  entry.forms.at(-1).lemma = "útil";
  entry.forms.at(-1).normalized_lemma = "util";
  await harness.repository.updateAdminLexicalEntry("UTIL_ADJECTIVE_USEFUL", entry);

  const languageLookup = harness.calls.find((call) => (
    call.statement?.startsWith("SELECT id FROM language") && call.parameters[0] === "ca"
  ));
  const insert = harness.calls.find((call) => call.statement?.startsWith("INSERT INTO lexical_form"));
  assert.match(languageLookup.statement, /documentation_status IN \('DOCUMENTED', 'REFERENCED'\)/);
  assert.doesNotMatch(languageLookup.statement, /is_active/);
  assert.equal(insert.parameters[1], 6);
  assert.equal(harness.state.committed, true);
});

test("repository rejects a language absent from the documentary catalog", async () => {
  const harness = createUpdateHarness();
  const entry = usefulEntry();
  entry.forms.at(-1).language = "xx";
  await assert.rejects(
    harness.repository.updateAdminLexicalEntry("UTIL_ADJECTIVE_USEFUL", entry),
    (error) => error.code === "INVALID_LANGUAGE"
  );
  assert.equal(harness.state.committed, false);
  assert.equal(harness.state.rolledBack, true);
});
