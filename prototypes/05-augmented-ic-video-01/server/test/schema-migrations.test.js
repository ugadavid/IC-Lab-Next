"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const {
  createRegistryBackup,
  inspectDatabaseSchema,
  inspectMigrationState,
  loadMigrationContract,
  protectedDataWitness,
  runMigrationCommand,
  validateRegistry,
  verifyDatabaseSchema,
  writeRegistryBackupExclusive
} = require("../schema-migrations");
const { createMariaDbReadonlyAdapter } = require("../proto05-mariadb-readonly");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const mysql = require(path.resolve(
  prototypeDirectory,
  "..",
  "00-ic-hub",
  "server",
  "node_modules",
  "mysql2",
  "promise"
));
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-m154-"));
let admin = null;
let adminPassword = null;

function safeDatabaseName(label) {
  const suffix = crypto.randomBytes(5).toString("hex");
  const name = `proto05_m154_${label}_${suffix}`;
  assert.match(name, /^proto05_m154_[a-z]+_[a-f0-9]{10}$/);
  return name;
}

function rootPassword() {
  if (process.env.PROTO05_MARIADB_TEST_ADMIN_PASSWORD) {
    return process.env.PROTO05_MARIADB_TEST_ADMIN_PASSWORD;
  }
  const container = process.env.PROTO05_MARIADB_TEST_CONTAINER || "ic_dico_mariadb_next";
  return execFileSync(
    "docker",
    ["exec", container, "sh", "-lc", 'printf %s "$MARIADB_ROOT_PASSWORD"'],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  ).trim();
}

async function connection(database) {
  return mysql.createConnection({
    host: process.env.PROTO05_MARIADB_TEST_HOST || "127.0.0.1",
    port: Number(process.env.PROTO05_MARIADB_TEST_PORT || 3306),
    user: process.env.PROTO05_MARIADB_TEST_ADMIN_USER || "root",
    password: adminPassword,
    database,
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false
  });
}

async function withDatabase(label, action) {
  const databaseName = safeDatabaseName(label);
  await admin.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const database = await connection(databaseName);
  try {
    return await action(database, databaseName);
  } finally {
    await database.end();
    await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  }
}

function runnerOptions(databaseName, root = prototypeDirectory) {
  return { databaseName, prototypeDirectory: root };
}

async function installCanonical(database, databaseName) {
  const options = runnerOptions(databaseName);
  const plan = await inspectMigrationState(database, options);
  assert.equal(plan.action.type, "apply");
  return runMigrationCommand(database, {
    ...options,
    mode: "apply",
    expectedPlanHash: plan.planHash,
    confirm: "APPLY PROTO05 SCHEMA MIGRATIONS"
  });
}

async function removeAudioMigrationFixture(database) {
  for (const routine of [
    "sp_audio_anonymization_plan_get",
    "sp_audio_anonymization_plan_save",
    "sp_media_inline_treatment_start",
    "sp_media_inline_treatment_complete"
  ]) await database.query(`DROP PROCEDURE \`${routine}\``);
  await database.query("DROP TABLE media_audio_anonymization_passages");
  await database.query("DROP TABLE media_audio_anonymization_plans");
  await database.query("DELETE FROM schema_migrations WHERE version = '003'");
}

function copyCanonicalContract(label) {
  const root = fs.mkdtempSync(path.join(temporaryRoot, `${label}-`));
  const mappings = [
    ["database/schema-migrations/manifest.json", "database/schema-migrations/manifest.json"],
    ["database/schema-migrations/001_proto05_canonical_schema.manifest.json", "database/schema-migrations/001_proto05_canonical_schema.manifest.json"],
    ["database/schema-migrations/002_proto05_canonical_routines.manifest.json", "database/schema-migrations/002_proto05_canonical_routines.manifest.json"],
    ["database/schema-migrations/002_proto05_routine_session.sql", "database/schema-migrations/002_proto05_routine_session.sql"],
    ["database/schema-migrations/002_proto05_canonical_routines.sql", "database/schema-migrations/002_proto05_canonical_routines.sql"],
    ["database/schema-migrations/003_proto05_audio_anonymization.sql", "database/schema-migrations/003_proto05_audio_anonymization.sql"],
    ["database/schema-migrations/003_proto05_audio_anonymization.manifest.json", "database/schema-migrations/003_proto05_audio_anonymization.manifest.json"],
    ["database/drafts/003_proto05_schema_hardening.sql", "database/drafts/003_proto05_schema_hardening.sql"],
    ["database/migrations/002_proto05_mariadb_schema_alignment.sql", "database/migrations/002_proto05_mariadb_schema_alignment.sql"],
    ["database/migrations/004_proto05_document_metadata_schema.sql", "database/migrations/004_proto05_document_metadata_schema.sql"],
    ["database/migrations/006_proto05_video_plus_metadata_schema.sql", "database/migrations/006_proto05_video_plus_metadata_schema.sql"]
  ];
  for (const [source, target] of mappings) {
    const destination = path.join(root, target);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(prototypeDirectory, source), destination);
  }
  return root;
}

function legacyRoutineContract(label) {
  const root = copyCanonicalContract(label);
  const manifestPath = path.join(root, "database", "schema-migrations", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.migrations = manifest.migrations.slice(0, 2);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return root;
}

function emptySchemaManifest() {
  return {
    formatVersion: 1,
    databaseDefaults: { characterSet: "utf8mb4", collation: "utf8mb4_unicode_ci" },
    tables: [], columns: [], indexes: [], tableConstraints: [], keyColumns: [],
    foreignKeys: [], checks: [], views: [], routines: [], routineParameters: [],
    triggers: [], events: []
  };
}

function failingContract() {
  const root = fs.mkdtempSync(path.join(temporaryRoot, "ddl-failure-"));
  const directory = path.join(root, "database", "schema-migrations");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(root, "database", "failure.sql"), [
    "CREATE TABLE first_statement_survives (id INT NOT NULL PRIMARY KEY);",
    "THIS IS NOT VALID SQL;",
    "CREATE TABLE later_migration_statement (id INT NOT NULL PRIMARY KEY);"
  ].join("\n"));
  fs.writeFileSync(path.join(directory, "expected.json"), JSON.stringify(emptySchemaManifest()));
  fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify({
    contractVersion: 1,
    migrations: [{
      version: "001",
      description: "Fixture DDL failure",
      kind: "baseline",
      sources: [{ path: "../failure.sql" }],
      schemaManifest: "expected.json"
    }]
  }));
  return root;
}

test.before(async () => {
  adminPassword = rootPassword();
  assert.ok(adminPassword, "Le secret administrateur de test doit rester disponible uniquement en mémoire.");
  admin = await mysql.createConnection({
    host: process.env.PROTO05_MARIADB_TEST_HOST || "127.0.0.1",
    port: Number(process.env.PROTO05_MARIADB_TEST_PORT || 3306),
    user: process.env.PROTO05_MARIADB_TEST_ADMIN_USER || "root",
    password: adminPassword,
    dateStrings: true,
    multipleStatements: false
  });
});

test.after(async () => {
  await admin?.end();
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

test("empty install, populated baseline and a second run are deterministic", async () => {
  await withDatabase("lifecycle", async (database, databaseName) => {
    const installed = await installCanonical(database, databaseName);
    assert.equal(installed.changed, true);
    assert.equal(installed.state.action.type, "none");
    assert.deepEqual(installed.state.plan.currentSummary, {
      tables: 34, columns: 293, indexes: 95, foreignKeys: 51, checks: 74,
      views: 0, routines: 47, triggers: 0, events: 0
    });
    assert.equal(new Set(installed.state.actualSchema.routines.map(row => row.routineName)).size, 47);
    assert.ok(installed.state.actualSchema.routines.every(row => row.createStatement.startsWith("CREATE PROCEDURE")));
    const verified = await verifyDatabaseSchema({ database, ...runnerOptions(databaseName) });
    assert.equal(verified.schemaVersion, "003");
    assert.equal(verified.migrationCount, 3);
    const second = await runMigrationCommand(database, runnerOptions(databaseName));
    assert.equal(second.changed, false);

    await removeAudioMigrationFixture(database);
    await database.query("DELETE FROM schema_migrations WHERE version = '002'");
    await database.query(
      "INSERT INTO languages (id, code, label, is_active) VALUES ('m154-language', 'm154', 'Mission 154', 1)"
    );
    const legacyOptions = runnerOptions(databaseName, legacyRoutineContract("lifecycle-legacy"));
    const baselinePlan = await inspectMigrationState(database, legacyOptions);
    assert.equal(baselinePlan.action.type, "adopt");
    const before = await protectedDataWitness(database, baselinePlan.actualSchema);
    const backupPath = path.join(temporaryRoot, `${databaseName}-registry-backup.json`);
    const backup = await createRegistryBackup(database, legacyOptions);
    const backupFile = writeRegistryBackupExclusive(backup, backupPath);
    assert.ok(backupFile.size > 0);
    const baselined = await runMigrationCommand(database, {
      ...legacyOptions,
      mode: "apply",
      expectedPlanHash: baselinePlan.planHash,
      confirm: "APPLY PROTO05 SCHEMA MIGRATIONS",
      backupPath
    });
    assert.equal(baselined.changed, true);
    const after = await protectedDataWitness(database, baselined.state.actualSchema);
    assert.deepEqual(after, before);
    const [[language]] = await database.query("SELECT label FROM languages WHERE id = 'm154-language'");
    assert.equal(language.label, "Mission 154");
  });
});

test("a modified or missing migration source and invalid registry states fail closed", async () => {
  const canonical = loadMigrationContract(prototypeDirectory);
  assert.throws(
    () => validateRegistry([{ version: "001", checksum: "bad", appliedAt: "2026-01-01" }], canonical.migrations),
    error => error.code === "PROTO05_MIGRATION_REGISTRY_INVALID"
  );
  assert.throws(
    () => validateRegistry([{ version: "999", checksum: "a".repeat(64), appliedAt: "2026-01-01" }], canonical.migrations),
    error => error.code === "PROTO05_MIGRATION_REGISTRY_INVALID"
  );
  const twoMigrations = [
    { version: "001", checksum: "a".repeat(64) },
    { version: "002", checksum: "b".repeat(64) }
  ];
  assert.throws(
    () => validateRegistry([
      { version: "001", checksum: "a".repeat(64), appliedAt: "2026-01-02" },
      { version: "001", checksum: "a".repeat(64), appliedAt: "2026-01-01" }
    ], twoMigrations),
    error => error.code === "PROTO05_MIGRATION_REGISTRY_INVALID"
      && error.diagnostics.some(item => item.code === "duplicate")
  );
  assert.throws(
    () => validateRegistry([
      { version: "002", checksum: "b".repeat(64), appliedAt: "2026-01-01" },
      { version: "001", checksum: "a".repeat(64), appliedAt: "2026-01-02" }
    ], twoMigrations),
    error => error.code === "PROTO05_MIGRATION_REGISTRY_INVALID"
      && error.diagnostics.some(item => item.code === "order-or-gap")
  );
  const missingRoot = copyCanonicalContract("missing");
  fs.unlinkSync(path.join(missingRoot, "database", "migrations", "006_proto05_video_plus_metadata_schema.sql"));
  assert.throws(
    () => loadMigrationContract(missingRoot),
    error => error.code === "PROTO05_MIGRATION_SOURCE_MISSING"
  );

  await withDatabase("changed", async (database, databaseName) => {
    await installCanonical(database, databaseName);
    const changedRoot = copyCanonicalContract("changed");
    fs.appendFileSync(
      path.join(changedRoot, "database", "migrations", "006_proto05_video_plus_metadata_schema.sql"),
      "\n-- modification volontaire de fixture\n"
    );
    await assert.rejects(
      inspectMigrationState(database, runnerOptions(databaseName, changedRoot)),
      error => error.code === "PROTO05_MIGRATION_REGISTRY_INVALID"
        && error.diagnostics.some(item => item.code === "checksum-mismatch")
    );
  });
});

test("a pending migration blocks startup verification and explicit apply repairs the fixture", async () => {
  const registrySql = `CREATE TABLE schema_migrations (
    version VARCHAR(64) NOT NULL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    checksum_sha256 CHAR(64) NOT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    applied_by VARCHAR(191) NULL,
    CONSTRAINT uq_schema_migration_checksum UNIQUE (checksum_sha256)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
  const alphaSql = "CREATE TABLE m154_alpha (id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
  const betaSql = "CREATE TABLE m154_beta (id INT NOT NULL PRIMARY KEY, alpha_id INT NOT NULL, CONSTRAINT fk_m154_beta_alpha FOREIGN KEY (alpha_id) REFERENCES m154_alpha(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
  let expectedFirst;
  let expectedSecond;
  await withDatabase("contract", async (database, databaseName) => {
    await database.query(registrySql);
    await database.query(alphaSql);
    expectedFirst = await inspectDatabaseSchema(database, databaseName);
    await database.query(betaSql);
    expectedSecond = await inspectDatabaseSchema(database, databaseName);
  });
  const root = fs.mkdtempSync(path.join(temporaryRoot, "pending-"));
  const directory = path.join(root, "database", "schema-migrations");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(root, "database", "001.sql"), `${registrySql};\n${alphaSql};\n`);
  fs.writeFileSync(path.join(root, "database", "002.sql"), `${betaSql};\n`);
  fs.writeFileSync(path.join(directory, "001.json"), JSON.stringify(expectedFirst));
  fs.writeFileSync(path.join(directory, "002.json"), JSON.stringify(expectedSecond));
  fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify({
    contractVersion: 1,
    migrations: [
      { version: "001", description: "Fixture initiale", sources: [{ path: "../001.sql" }], schemaManifest: "001.json" },
      { version: "002", description: "Fixture attendue", sources: [{ path: "../002.sql" }], schemaManifest: "002.json" }
    ]
  }));
  const contract = loadMigrationContract(root);

  await withDatabase("pending", async (database, databaseName) => {
    for (const statement of contract.migrations[0].statements) await database.query(statement);
    await database.query(
      "INSERT INTO schema_migrations (version, description, checksum_sha256, applied_by) VALUES (?, ?, ?, 'fixture')",
      [contract.migrations[0].version, contract.migrations[0].description, contract.migrations[0].checksum]
    );
    const options = runnerOptions(databaseName, root);
    const pending = await inspectMigrationState(database, options);
    assert.equal(pending.action.type, "apply");
    assert.deepEqual(pending.action.migrations.map(item => item.version), ["002"]);
    await assert.rejects(
      verifyDatabaseSchema({ database, ...options }),
      error => error.code === "PROTO05_SCHEMA_MIGRATIONS_PENDING"
    );
    const repaired = await runMigrationCommand(database, {
      ...options,
      mode: "apply",
      expectedPlanHash: pending.planHash,
      confirm: "APPLY PROTO05 SCHEMA MIGRATIONS"
    });
    assert.equal(repaired.changed, true);
    assert.deepEqual(repaired.state.registry.rows.map(row => row.version), ["001", "002"]);
    assert.equal((await verifyDatabaseSchema({ database, ...options })).schemaVersion, "002");
  });
});

for (const scenario of [
  {
    label: "column",
    sql: "ALTER TABLE import_runs DROP COLUMN source_label",
    expectedPath: "columns/import_runs/source_label"
  },
  {
    label: "default",
    sql: "ALTER TABLE languages ALTER COLUMN is_active SET DEFAULT 0",
    expectedPath: "columns/languages/is_active"
  },
  {
    label: "index",
    sql: "DROP INDEX idx_import_runs_snapshot ON import_runs",
    expectedPath: "indexes/import_runs/idx_import_runs_snapshot/1"
  }
]) {
  test(`baseline refuses a divergent ${scenario.label}`, async () => {
    await withDatabase(scenario.label, async (database, databaseName) => {
      await installCanonical(database, databaseName);
      await database.query(scenario.sql);
      await assert.rejects(
        inspectMigrationState(database, runnerOptions(databaseName)),
        error => error.code === "PROTO05_SCHEMA_DIVERGENCE"
          && error.comparison.differences.some(item => item.path === scenario.expectedPath)
      );
    });
  });
}

test("baseline refuses a missing foreign key", async () => {
  await withDatabase("foreignkey", async (database, databaseName) => {
    const installed = await installCanonical(database, databaseName);
    const foreignKey = installed.state.actualSchema.foreignKeys[0];
    assert.match(foreignKey.tableName, /^[A-Za-z0-9_]+$/);
    assert.match(foreignKey.constraintName, /^[A-Za-z0-9_]+$/);
    await database.query(
      `ALTER TABLE \`${foreignKey.tableName}\` DROP FOREIGN KEY \`${foreignKey.constraintName}\``
    );
    await assert.rejects(
      inspectMigrationState(database, runnerOptions(databaseName)),
      error => error.code === "PROTO05_SCHEMA_DIVERGENCE"
        && error.comparison.differences.some(item => item.path.startsWith("foreignKeys/"))
    );
  });
});

test("routine adoption refuses an incomplete inventory", async () => {
  await withDatabase("routinemissing", async (database, databaseName) => {
    await installCanonical(database, databaseName);
    await removeAudioMigrationFixture(database);
    await database.query("DELETE FROM schema_migrations WHERE version = '002'");
    await database.query("DROP PROCEDURE sp_media_get");
    const legacyOptions = runnerOptions(databaseName, legacyRoutineContract("missing-routine-legacy"));
    await assert.rejects(
      inspectMigrationState(database, legacyOptions),
      error => error.code === "PROTO05_ROUTINE_ADOPTION_REFUSED"
        && error.comparison.differences.some(item => item.path === "routines/PROCEDURE/sp_media_get")
    );
  });
});

test("a divergent routine is never silently adopted", async () => {
  await withDatabase("routinedivergent", async (database, databaseName) => {
    await installCanonical(database, databaseName);
    await removeAudioMigrationFixture(database);
    await database.query("DELETE FROM schema_migrations WHERE version = '002'");
    await database.query("DROP PROCEDURE sp_media_get");
    await database.query("CREATE PROCEDURE sp_media_get(IN p_asset_id VARCHAR(64)) SELECT p_asset_id AS asset_id");
    const legacyOptions = runnerOptions(databaseName, legacyRoutineContract("divergent-routine-legacy"));
    const state = await inspectMigrationState(database, legacyOptions);
    assert.equal(state.action.type, "upgrade");
    assert.ok(state.comparison.differences.some(item => item.path === "routines/PROCEDURE/sp_media_get"));
    await assert.rejects(
      runMigrationCommand(database, {
        ...legacyOptions,
        mode: "apply",
        expectedPlanHash: state.planHash,
        confirm: "APPLY PROTO05 SCHEMA MIGRATIONS"
      }),
      error => error.code === "PROTO05_MIGRATION_BACKUP_REQUIRED"
    );
  });
});

test("routine definition visibility failures stop schema inspection", async () => {
  await withDatabase("routinevisibility", async (database, databaseName) => {
    await installCanonical(database, databaseName);
    const restricted = {
      query(sql, values) {
        if (String(sql).startsWith("SHOW CREATE PROCEDURE")) {
          const error = new Error("command denied");
          error.code = "ER_SPECIFIC_ACCESS_DENIED_ERROR";
          throw error;
        }
        return database.query(sql, values);
      }
    };
    await assert.rejects(
      inspectDatabaseSchema(restricted, databaseName),
      error => error.code === "ER_SPECIFIC_ACCESS_DENIED_ERROR"
    );
  });
});

test("concurrent runners serialize and never double-register a migration", async () => {
  await withDatabase("concurrent", async (first, databaseName) => {
    const second = await connection(databaseName);
    try {
      const options = runnerOptions(databaseName);
      const plan = await inspectMigrationState(first, options);
      let signalLock;
      const locked = new Promise(resolve => { signalLock = resolve; });
      const firstRun = runMigrationCommand(first, {
        ...options,
        mode: "apply",
        expectedPlanHash: plan.planHash,
        confirm: "APPLY PROTO05 SCHEMA MIGRATIONS",
        afterLock: async () => {
          signalLock();
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      });
      await locked;
      const secondRun = runMigrationCommand(second, {
        ...options,
        mode: "apply",
        expectedPlanHash: plan.planHash,
        confirm: "APPLY PROTO05 SCHEMA MIGRATIONS"
      });
      const results = await Promise.allSettled([firstRun, secondRun]);
      assert.equal(results.filter(item => item.status === "fulfilled").length, 1);
      const refused = results.find(item => item.status === "rejected");
      assert.equal(refused.reason.code, "PROTO05_MIGRATION_PLAN_DRIFT");
      const [[registry]] = await first.query("SELECT COUNT(*) count FROM schema_migrations");
      assert.equal(Number(registry.count), 3);
    } finally {
      await second.end();
    }
  });
});

test("a DDL failure is honest about partial commit, stops, and releases its lock", async () => {
  await withDatabase("ddlfailure", async (database, databaseName) => {
    const root = failingContract();
    const options = runnerOptions(databaseName, root);
    const plan = await inspectMigrationState(database, options);
    await assert.rejects(
      runMigrationCommand(database, {
        ...options,
        mode: "apply",
        expectedPlanHash: plan.planHash,
        confirm: "APPLY PROTO05 SCHEMA MIGRATIONS"
      }),
      error => error.code === "PROTO05_MIGRATION_DDL_FAILED"
        && error.completedStatements === 1
        && error.partialDdlPossible === true
    );
    const [tables] = await database.query(
      "SELECT TABLE_NAME tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [databaseName]
    );
    assert.deepEqual(tables.map(row => row.tableName), ["first_statement_survives"]);
    const [[free]] = await database.query(
      "SELECT IS_FREE_LOCK(?) free",
      [`${databaseName}.proto05.schema-migrations`]
    );
    assert.equal(Number(free.free), 1);
  });
});

test("the readonly startup probe fails before business reads when schema verification fails", async () => {
  const queries = [];
  let released = false;
  let ended = false;
  const database = {
    async query(sql) {
      queries.push(sql);
      if (sql.startsWith("SET SESSION")) return [[], []];
      if (sql.startsWith("SELECT CURRENT_USER")) {
        return [[{ account: "proto05_test@%", database_name: "proto05_test" }], []];
      }
      if (sql === "SHOW GRANTS") return [[{}], []];
      throw new Error(`Requête métier inattendue : ${sql}`);
    },
    release() { released = true; }
  };
  const adapter = createMariaDbReadonlyAdapter({
    config: { host: "test", port: 3306, database: "proto05_test", user: "proto05_test", password: "unused" },
    prototypeDirectory,
    mysql: {
      createPool: () => ({
        getConnection: async () => database,
        end: async () => { ended = true; }
      })
    },
    grantValidator: () => ({ readonly: true, privileges: ["SELECT"] }),
    schemaVerifier: async () => {
      throw Object.assign(new Error("Le registre de migrations est absent."), {
        code: "PROTO05_SCHEMA_MIGRATIONS_PENDING"
      });
    }
  });
  await assert.rejects(
    adapter.verify(),
    error => error.code === "PROTO05_SCHEMA_MIGRATIONS_PENDING"
  );
  assert.equal(queries.some(sql => sql.includes("activity_count")), false);
  assert.equal(released, true);
  await adapter.close();
  assert.equal(ended, true);
});

test("audio plans and inline treatments are transactional, ordered and restart-readable", async () => {
  await withDatabase("audioplan", async (database, databaseName) => {
    await installCanonical(database, databaseName);
    await database.query("CALL sp_media_register_import(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      "asset-audio-test", "source-audio-test", "playable-audio-test", "Audio fixture",
      "local-file", "local", "filesystem", "working-copy", "video/mp4", null,
      "workspace", "asset-audio-test/source/fixture.mp4", null, null, "available",
      JSON.stringify({ asset: { provenance: {}, rights: {}, tagIds: [] }, source: { origin: {}, provenance: {} }, playable: { provenance: {} }, metadata: { analysisStatus: "complete", mimeType: "video/mp4", durationMs: 6000, audioCodec: "aac", hasAudio: true } })
    ]);
    const passages = [
      { id: "zone-a", startMs: 1000, endMs: 2000, replacementType: "soft-tone", label: "A" },
      { id: "zone-b", startMs: 2000, endMs: 3000, replacementType: "beep", label: "B" },
      { id: "zone-c", startMs: 4000, endMs: 5000, replacementType: "silence", label: "C" }
    ];
    const [saved] = await database.query("CALL sp_audio_anonymization_plan_save(?, ?, ?, ?, ?, ?)", [
      "plan-audio-test", "asset-audio-test", "playable-audio-test", 6000, 0, JSON.stringify(passages)
    ]);
    assert.equal(Number(saved[0][0].revision), 1);
    assert.deepEqual(saved[1].map(row => row.id), ["zone-a", "zone-b", "zone-c"]);
    await assert.rejects(
      database.query("CALL sp_audio_anonymization_plan_save(?, ?, ?, ?, ?, ?)", [
        "plan-audio-test", "asset-audio-test", "playable-audio-test", 6000, 0, JSON.stringify(passages)
      ]),
      error => error.errno === 30503
    );
    await assert.rejects(
      database.query("CALL sp_audio_anonymization_plan_save(?, ?, ?, ?, ?, ?)", [
        "plan-audio-test", "asset-audio-test", "playable-audio-test", 6000, 1,
        JSON.stringify([
          { id: "overlap-a", startMs: 1000, endMs: 2500, replacementType: "soft-tone" },
          { id: "overlap-b", startMs: 2000, endMs: 3000, replacementType: "beep" }
        ])
      ]),
      error => error.errno === 30506
    );
    const [readBack] = await database.query("CALL sp_audio_anonymization_plan_get(NULL, ?, ?)", [
      "asset-audio-test", "playable-audio-test"
    ]);
    assert.equal(readBack[0][0].id, "plan-audio-test");
    assert.deepEqual(readBack[1].map(row => row.id), ["zone-a", "zone-b", "zone-c"]);

    await database.query("CALL sp_media_inline_treatment_start(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      "treatment-audio-test", "plan-audio-test", "asset-audio-test", "playable-audio-test",
      "audio-anonymization", "Audio test", "runtime-audio-test", "ffmpeg", "proto05-test",
      JSON.stringify({ planId: "plan-audio-test", passages })
    ]);
    await database.query("CALL sp_media_inline_treatment_complete(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      "treatment-audio-test", "source-audio-output", "playable-audio-output", "workspace",
      "asset-audio-test/derived/treatment-audio-test/output.mp4", "video/mp4", 1024, 6000,
      "a".repeat(64), "aac", 1, "ffmpeg test", JSON.stringify({ checked: true })
    ]);
    const [[treatment]] = await database.query(
      "SELECT type, status, progress, source_asset_id, output_asset_id, output_playable_id FROM media_treatments WHERE id = 'treatment-audio-test'"
    );
    assert.deepEqual(treatment, {
      type: "audio-anonymization",
      status: "completed",
      progress: "100.00",
      source_asset_id: "asset-audio-test",
      output_asset_id: "asset-audio-test",
      output_playable_id: "playable-audio-output"
    });
    const [[output]] = await database.query(
      "SELECT role, storage_scope, storage_key FROM media_playables WHERE id = 'playable-audio-output'"
    );
    assert.equal(output.role, "derivation-local");
    assert.equal(output.storage_scope, "workspace");
    assert.match(output.storage_key, /treatment-audio-test/);
  });
});
