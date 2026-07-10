const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createApp } = require("../server");
const { createRepository } = require("../src/repository");
const {
  normalizeConnectorExpression,
  validateAdminConnectorHelp,
} = require("../src/admin");

const languages = [
  { code: "es", is_active: true },
  { code: "fr", is_active: true },
  { code: "it", is_active: true },
];

async function withServer(repository, callback) {
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function validBody(overrides = {}) {
  return {
    language: "es",
    expression: "Además",
    discourse_function: "ADDITION",
    pedagogical_hint: "L’auteur ajoute probablement une information.",
    status: "VALIDATED",
    ...overrides,
  };
}

test("connector help validation preserves accents and normalizes case and spaces", () => {
  const result = validateAdminConnectorHelp(validBody({ expression: "  ADEMÁS   " }), languages);
  assert.equal(result.ok, true);
  assert.equal(result.value.expression, "ADEMÁS");
  assert.equal(result.value.normalized_expression, "además");
  assert.equal(normalizeConnectorExpression("  Sin   Embargo "), "sin embargo");
});

test("connector help validation refuses unsupported languages and functions", () => {
  const languageResult = validateAdminConnectorHelp(validBody({ language: "it" }), languages);
  const functionResult = validateAdminConnectorHelp(validBody({ discourse_function: "CONCLUSION" }), languages);
  assert.equal(languageResult.ok, false);
  assert.equal(languageResult.code, "UNSUPPORTED_CONNECTOR_LANGUAGE");
  assert.equal(functionResult.ok, false);
  assert.equal(functionResult.code, "INVALID_DISCOURSE_FUNCTION");
});

test("public connector list forwards filters and hides work fields", async () => {
  let received;
  await withServer({
    async getConnectorHelps(options) {
      received = options;
      return {
        total: 1,
        items: [{
          id: 1,
          language: "es",
          language_name: "Espagnol",
          expression: "sin embargo",
          normalized_expression: "sin embargo",
          discourse_function: "OPPOSITION",
          pedagogical_title: "Connecteur logique",
          pedagogical_hint: "Contraste probable.",
          status: "VALIDATED",
          notes: "interne",
        }],
      };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/connector-helps?language=es&function=OPPOSITION&limit=10&offset=20`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.items[0].language.code, "es");
    assert.equal(Object.hasOwn(data.items[0], "notes"), false);
    assert.equal(Object.hasOwn(data.items[0], "status"), false);
  });
  assert.deepEqual(received, {
    language: "es",
    discourseFunction: "OPPOSITION",
    search: "",
    limit: 10,
    offset: 20,
  });
});

test("admin connector endpoint creates a normalized object", async () => {
  let created;
  await withServer({
    async getLanguages() { return languages; },
    async createAdminConnectorHelp(value) {
      created = value;
      return { id: 8, ...value };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/admin/connector-help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody()),
    });
    assert.equal(response.status, 201);
  });
  assert.equal(created.normalized_expression, "además");
  assert.equal(Object.hasOwn(created, "normalized_expression"), true);
});

test("connector lookup normalizes the requested expression", async () => {
  let received;
  await withServer({
    async lookupConnectorHelp(options) {
      received = options;
      return [];
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/connector-help/lookup?language=es&expression=SIN%20%20EMBARGO`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(data.items, []);
  });
  assert.deepEqual(received, { language: "es", normalizedExpression: "sin embargo" });
});

test("admin connector endpoint reports duplicate and archives logically", async () => {
  await withServer({
    async getLanguages() { return languages; },
    async createAdminConnectorHelp() {
      const error = new Error("Doublon.");
      error.code = "DUPLICATE_CONNECTOR_HELP";
      throw error;
    },
    async archiveAdminConnectorHelp(id) {
      return { id, expression: "pero", status: "ARCHIVED" };
    },
  }, async (baseUrl) => {
    const duplicate = await fetch(`${baseUrl}/admin/connector-help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody()),
    });
    assert.equal(duplicate.status, 409);
    const archived = await fetch(`${baseUrl}/admin/connector-help/4`, { method: "DELETE" });
    const data = await archived.json();
    assert.equal(archived.status, 200);
    assert.equal(data.connector_help.status, "ARCHIVED");
  });
});

test("repository archive updates status without physical deletion", async () => {
  const statements = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      statements.push(statement);
      if (statement.startsWith("UPDATE connector_help")) return [{ affectedRows: 1 }];
      if (statement.includes("FROM connector_help ch")) {
        return [[{ id: 4, expression: "pero", status: "ARCHIVED" }]];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    },
  };
  const repository = createRepository({ async getConnection() { return connection; } });
  const result = await repository.archiveAdminConnectorHelp(4);
  assert.equal(result.status, "ARCHIVED");
  assert.equal(statements.some((statement) => statement.startsWith("DELETE")), false);
});

test("connector SQL defines constraints and an idempotent 12-item seed", () => {
  const sqlPath = path.resolve(__dirname, "../../database/current_draft/60_connector_help.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  for (const expression of [
    "sin embargo", "pero", "porque", "por tanto", "además", "después",
    "cependant", "mais", "parce que", "donc", "de plus", "ensuite",
  ]) {
    assert.match(sql, new RegExp(`'${expression}'`, "u"));
  }
  assert.match(sql, /COLLATE utf8mb4_bin/);
  assert.match(sql, /UNIQUE \(language_id, normalized_expression, discourse_function\)/);
  assert.match(sql, /WHERE existing\.id IS NULL/);
  assert.match(sql, /'PROPOSED', 'VALIDATED', 'REJECTED', 'ARCHIVED'/);
});

test("Seven Sieves consumes API connector help without a local catalogue", () => {
  const scriptPath = path.resolve(
    __dirname,
    "../../prototypes/01-seven-sieves/js/seven-sieves-tamis4-pedagogical-hint-v0.js"
  );
  const script = fs.readFileSync(scriptPath, "utf8");
  assert.match(script, /analysisPackage\?\.pedagogical_enrichments/);
  assert.match(script, /item\.source\?\.kind === "connector_help"/);
  assert.doesNotMatch(script, /connectorHelpCatalog/);
  assert.doesNotMatch(script, /expression: "sin embargo"/);
  assert.doesNotMatch(script, /sieve_id: 8/);
});
