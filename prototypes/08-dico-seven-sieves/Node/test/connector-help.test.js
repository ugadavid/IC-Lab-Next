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
const {
  connectorHelpCapableLanguages,
  connectorHelpLanguagePresentation,
  isConnectorHelpCapableLanguage,
} = require("../src/connector-help-capability");

const languages = [
  { code: "fr", name: "Français", family: "Romance", is_romance: 1, is_active: 1, documentation_status: "DOCUMENTED" },
  { code: "es", name: "Español", family: "Romance", is_romance: 1, is_active: 1, documentation_status: "DOCUMENTED" },
  { code: "it", name: "Italiano", family: "Romance", is_romance: 1, is_active: 1, documentation_status: "DOCUMENTED" },
  { code: "pt", name: "Português", family: "Romance", is_romance: 1, is_active: 1, documentation_status: "DOCUMENTED" },
  { code: "en", name: "English", family: "Germanic", is_romance: 0, is_active: 1, documentation_status: "DOCUMENTED" },
  ...["ca", "gl", "oc", "ro", "co", "sc", "rm"].map((code) => ({
    code, name: code, family: "Romance", is_romance: 1, is_active: 0, documentation_status: "REFERENCED",
  })),
];

async function withServer(repository, callback) {
  const completeRepository = {
    async getConnectorHelpLanguages() {
      return connectorHelpCapableLanguages(languages).map(connectorHelpLanguagePresentation);
    },
    ...repository,
  };
  const server = createApp(completeRepository).listen(0, "127.0.0.1");
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

test("connector help validation accepts every active documented language and refuses the others", () => {
  for (const code of ["fr", "es", "it", "pt", "en"]) {
    assert.equal(validateAdminConnectorHelp(validBody({ language: code }), languages).ok, true, code);
  }
  for (const code of ["ca", "gl", "oc", "ro", "co", "sc", "rm", "xx"]) {
    const result = validateAdminConnectorHelp(validBody({ language: code }), languages);
    assert.equal(result.ok, false, code);
    assert.equal(result.code, "UNSUPPORTED_CONNECTOR_LANGUAGE", code);
  }
  const functionResult = validateAdminConnectorHelp(validBody({ discourse_function: "CONCLUSION" }), languages);
  assert.equal(functionResult.ok, false);
  assert.equal(functionResult.code, "INVALID_DISCOURSE_FUNCTION");
});

test("connector help capability is derived only from active and DOCUMENTED language state", () => {
  assert.equal(isConnectorHelpCapableLanguage({ is_active: 1, documentation_status: "DOCUMENTED" }), true);
  assert.equal(isConnectorHelpCapableLanguage({ is_active: 0, documentation_status: "DOCUMENTED" }), false);
  assert.equal(isConnectorHelpCapableLanguage({ is_active: 1, documentation_status: "REFERENCED" }), false);
  assert.deepEqual(connectorHelpCapableLanguages(languages).map(({ code }) => code), ["fr", "es", "it", "pt", "en"]);
});

test("public connector language capability presents English as non-Romance comparison", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/connector-help-languages`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(data.languages.map(({ code }) => code), ["fr", "es", "it", "pt", "en"]);
    assert.deepEqual(data.languages.find(({ code }) => code === "en"), {
      code: "en", name: "English", family: "Germanic", is_romance: false,
      is_active: true, documentation_status: "DOCUMENTED",
      public_classification: "Langue de comparaison — non romane",
    });
  });
});

test("public connector routes accept five languages, keep IT/PT/EN empty, and reject forged codes", async () => {
  const calls = [];
  await withServer({
    async getConnectorHelps(options) {
      calls.push(options.language);
      return { total: 0, items: [] };
    },
  }, async (baseUrl) => {
    for (const code of ["fr", "es", "it", "pt", "en"]) {
      const response = await fetch(`${baseUrl}/connector-helps?language=${code}`);
      assert.equal(response.status, 200, code);
      const data = await response.json();
      assert.equal(data.total, 0, code);
      assert.deepEqual(data.items, [], code);
    }
    for (const code of ["ca", "xx"]) {
      const response = await fetch(`${baseUrl}/connector-helps?language=${code}`);
      assert.equal(response.status, 400, code);
      assert.equal((await response.json()).error.code, "INVALID_CONNECTOR_LANGUAGE", code);
    }
  });
  assert.deepEqual(calls, ["fr", "es", "it", "pt", "en"]);
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

test("admin connector list accepts five languages and rejects referenced or unknown codes", async () => {
  const calls = [];
  await withServer({
    async getAdminConnectorHelps(options) {
      calls.push(options.language);
      return { total: 0, items: [] };
    },
  }, async (baseUrl) => {
    for (const code of ["fr", "es", "it", "pt", "en"]) {
      const response = await fetch(`${baseUrl}/admin/connector-helps?language=${code}`);
      assert.equal(response.status, 200, code);
    }
    for (const code of ["ca", "xx"]) {
      const response = await fetch(`${baseUrl}/admin/connector-helps?language=${code}`);
      assert.equal(response.status, 400, code);
    }
  });
  assert.deepEqual(calls, ["fr", "es", "it", "pt", "en"]);
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

test("empty connector lookup is valid for Italian, Portuguese, and English", async () => {
  const calls = [];
  await withServer({
    async lookupConnectorHelp(options) {
      calls.push(options.language);
      return [];
    },
  }, async (baseUrl) => {
    for (const code of ["it", "pt", "en"]) {
      const response = await fetch(`${baseUrl}/connector-help/lookup?language=${code}&expression=test`);
      assert.equal(response.status, 200, code);
      assert.deepEqual((await response.json()).items, [], code);
    }
  });
  assert.deepEqual(calls, ["it", "pt", "en"]);
});

test("repository derives connector languages from persisted state", async () => {
  const repository = createRepository({
    async execute(sql) {
      assert.match(String(sql), /FROM language/);
      return [languages];
    },
  });
  const result = await repository.getConnectorHelpLanguages();
  assert.deepEqual(result.map(({ code }) => code), ["fr", "es", "it", "pt", "en"]);
  assert.equal(result.find(({ code }) => code === "en").public_classification, "Langue de comparaison — non romane");
});

test("repository write guard accepts an active documented Italian language", async () => {
  const connection = {
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async execute(sql) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      if (statement.includes("FROM language") && statement.includes("FOR UPDATE")) {
        return [[{ id: 3, code: "it", is_active: 1, documentation_status: "DOCUMENTED" }]];
      }
      if (statement.includes("FROM connector_help ch") && statement.includes("WHERE ch.id = ?")) {
        return [[{ id: 90, language: "it", expression: "tuttavia", status: "PROPOSED" }]];
      }
      if (statement.includes("FROM connector_help") && statement.includes("normalized_expression")) return [[]];
      if (statement.startsWith("INSERT INTO connector_help")) return [{ insertId: 90 }];
      throw new Error(`Unexpected SQL: ${statement}`);
    },
  };
  const repository = createRepository({ async getConnection() { return connection; } });
  const created = await repository.createAdminConnectorHelp({
    ...validBody({ language: "it", expression: "tuttavia", status: "PROPOSED" }),
    normalized_expression: "tuttavia", lexical_entry_key: "", pedagogical_title: "Connecteur logique",
    example: "", caution: "", source_label: "manual_admin_v0", notes: "",
  });
  assert.equal(created.language, "it");
});

test("repository write guard rejects an inactive referenced language", async () => {
  const connection = {
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async execute(sql) {
      if (String(sql).includes("FROM language")) {
        return [[{ id: 6, code: "ca", is_active: 0, documentation_status: "REFERENCED" }]];
      }
      throw new Error("No write should be attempted");
    },
  };
  const repository = createRepository({ async getConnection() { return connection; } });
  await assert.rejects(
    repository.createAdminConnectorHelp({
      ...validBody({ language: "ca" }), normalized_expression: "además", lexical_entry_key: "",
    }),
    (error) => error.code === "UNSUPPORTED_CONNECTOR_LANGUAGE"
  );
});

test("public connector repository query exposes only validated active documented help", async () => {
  const statements = [];
  const repository = createRepository({
    async execute(sql) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      statements.push(statement);
      if (statement.startsWith("SELECT COUNT")) return [[{ total: 0 }]];
      return [[]];
    },
  });
  await repository.getConnectorHelps({ language: "it", limit: 20, offset: 0 });
  const joined = statements.join("\n");
  assert.match(joined, /ch\.status = 'VALIDATED'/);
  assert.match(joined, /l\.is_active = 1/);
  assert.match(joined, /l\.documentation_status = 'DOCUMENTED'/);
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

test("connector SQL defines constraints and preserves the historical 12-item seed", () => {
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
