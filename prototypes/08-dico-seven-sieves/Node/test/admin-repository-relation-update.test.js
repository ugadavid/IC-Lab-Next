"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createRepository } = require("../src/repository");

function normalized(sql) { return sql.replace(/\s+/g, " ").trim(); }

function harness({ existingRelation = { id: 7, source_form_id: 10, target_form_id: 11 }, duplicate = false } = {}) {
  const calls = [];
  const state = { committed: false, rolledBack: false };
  const connection = {
    async beginTransaction() {},
    async commit() { state.committed = true; },
    async rollback() { state.rolledBack = true; },
    release() {},
    async execute(sql, parameters) {
      const statement = normalized(sql);
      calls.push({ statement, parameters });
      if (statement.startsWith("SELECT id FROM lexical_form")) return [[{ id: 10 }, { id: 11 }]];
      if (statement.startsWith("SELECT id FROM form_relation") && statement.includes("source_form_id")) return [duplicate ? [{ id: 7 }] : []];
      if (statement.startsWith("SELECT id, source_form_id")) return [existingRelation ? [existingRelation] : []];
      if (statement.startsWith("INSERT INTO form_relation")) return [{ insertId: 9, affectedRows: 1 }];
      if (statement.startsWith("UPDATE form_relation")) return [{ affectedRows: 1 }];
      return [[]];
    },
  };
  return { repository: createRepository({ async getConnection() { return connection; } }), calls, state };
}

function relation(overrides = {}) {
  return {
    source_form_id: 10, target_form_id: 11, relation_type: "COGNATE_STRONG", score: 0.9,
    is_symmetric: true, source_label: "manual_admin_v0", confidence_score: 0.9,
    notes: "Relation manuelle via Dico-IC Admin V0.", ...overrides,
  };
}

test("repository refuses an inverse duplicate independently of relation type", async () => {
  const testHarness = harness({ duplicate: true });
  await assert.rejects(
    testHarness.repository.createAdminFormRelation(relation({ source_form_id: 11, target_form_id: 10, relation_type: "FALSE_FRIEND" })),
    (error) => error.code === "DUPLICATE_RELATION"
  );
  const duplicateQuery = testHarness.calls.find((call) => call.statement.startsWith("SELECT id FROM form_relation"));
  assert.doesNotMatch(duplicateQuery.statement, /relation_type =/);
  assert.equal(testHarness.calls.some((call) => call.statement.startsWith("INSERT INTO form_relation")), false);
  assert.equal(testHarness.state.rolledBack, true);
});

test("repository updates only the editable fields of an existing relation", async () => {
  const testHarness = harness();
  const updated = await testHarness.repository.updateAdminFormRelation(7, relation({ relation_type: "COGNATE_WEAK", score: 0.7, confidence_score: 0.7 }));
  const update = testHarness.calls.find((call) => call.statement.startsWith("UPDATE form_relation"));
  assert.match(update.statement, /SET relation_type = \?, score = \?, is_symmetric = 1/);
  assert.doesNotMatch(update.statement, /source_form_id =|target_form_id =/);
  assert.equal(updated.relation_type, "COGNATE_WEAK");
  assert.equal(testHarness.state.committed, true);
});

test("repository rolls back when a relation update attempts another pair", async () => {
  const testHarness = harness();
  await assert.rejects(
    testHarness.repository.updateAdminFormRelation(7, relation({ source_form_id: 10, target_form_id: 12 })),
    (error) => error.code === "RELATION_PAIR_IMMUTABLE"
  );
  assert.equal(testHarness.calls.some((call) => call.statement.startsWith("UPDATE form_relation")), false);
  assert.equal(testHarness.state.rolledBack, true);
});
