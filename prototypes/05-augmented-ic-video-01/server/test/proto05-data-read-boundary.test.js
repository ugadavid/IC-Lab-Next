"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const {
  dataModeFromEnvironment,
  mariadbConfigurationFromEnvironment
} = require("../proto05-data-mode");
const {
  compareCanonical
} = require("../proto05-canonical-compare");
const {
  createProto05ReadBoundary
} = require("../proto05-read-boundary");
const {
  assertReadonlyGrants,
  createMariaDbReadonlyAdapter,
  mapMariaDbTablesToSnapshot,
  projectMariaDbSnapshotForApplication
} = require("../proto05-mariadb-readonly");
const {
  assertApplicationGrants,
  createMariaDbWriteAdapter,
  tablePlan
} = require("../proto05-mariadb-write");
const { createProto05WriteBoundary } = require("../proto05-write-boundary");
const { projectCanonicalLibrary } = require("../media-library-runtime");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const dataDirectory = path.join(prototypeDirectory, "data");
const fakeMysqlModule = path.join(__dirname, "fixtures", "fake-mysql2-readonly.js");
const dryRunModule = path.resolve(prototypeDirectory, "database", "migrations", "001_proto05_json_to_mariadb_dry_run.mjs");

function json(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function hash(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function canonicalJsonSnapshot() {
  const languageCatalog = json(path.resolve(prototypeDirectory, "..", "..", "shared", "reference-data", "languages.json"));
  return {
    activities: json(path.join(dataDirectory, "activities.json")),
    activityLibrary: json(path.join(dataDirectory, "activity-library.json")),
    languageCatalog: { languages: languageCatalog.languages },
    videoCatalog: json(path.join(dataDirectory, "video-catalog.json")),
    videoLibrary: json(path.join(dataDirectory, "video-library.json"))
  };
}

async function migrationTables() {
  const migration = await import(pathToFileURL(dryRunModule).href);
  const { model } = migration.deterministicResult(prototypeDirectory);
  assert.ok(model.tables.size > 0);
  const tables = {};
  for (const [name, table] of model.tables) tables[name] = table.rows.map(entry => structuredClone(entry.data));
  const source = canonicalJsonSnapshot();
  tables.data_projection_metadata = [
    { document_key: "activities", schema_version: source.activities.schemaVersion, source_updated_at_utc: source.activities.updatedAt.replace("T", " ").replace("Z", "") },
    { document_key: "activity-library", schema_version: source.activityLibrary.schemaVersion, source_updated_at_utc: source.activityLibrary.updatedAt.replace("T", " ").replace("Z", "") },
    { document_key: "media-library", schema_version: source.videoLibrary.schemaVersion, source_updated_at_utc: source.videoLibrary.updatedAt.replace("T", " ").replace("Z", "") },
    { document_key: "video-catalog", schema_version: source.videoCatalog.schemaVersion, source_updated_at_utc: null }
  ];
  return tables;
}

function testConfiguration() {
  return {
    host: "127.0.0.1",
    port: 3306,
    database: "ic_augmented_video",
    user: "ic_augmented_readonly",
    password: "test-only-not-a-real-secret"
  };
}

test("sélecteur de mode strict et configuration MariaDB différée", () => {
  assert.equal(dataModeFromEnvironment({}), "json");
  assert.equal(dataModeFromEnvironment({ PROTO05_DATA_MODE: "compare" }), "compare");
  assert.equal(dataModeFromEnvironment({ PROTO05_DATA_MODE: "mariadb-readonly" }), "mariadb-readonly");
  assert.equal(dataModeFromEnvironment({ PROTO05_DATA_MODE: "mariadb" }), "mariadb");
  assert.throws(() => dataModeFromEnvironment({ PROTO05_DATA_MODE: "hybrid" }), /invalide/);
  assert.deepEqual(
    mariadbConfigurationFromEnvironment({
      PROTO05_MARIADB_HOST: "127.0.0.1",
      PROTO05_MARIADB_PORT: "3306",
      PROTO05_MARIADB_DATABASE: "ic_augmented_video",
      PROTO05_MARIADB_USER: "reader",
      PROTO05_MARIADB_PASSWORD: "secret-test"
    }),
    {
      host: "127.0.0.1",
      port: 3306,
      database: "ic_augmented_video",
      user: "reader",
      password: "secret-test"
    }
  );
  assert.throws(
    () => mariadbConfigurationFromEnvironment({
      PROTO05_MARIADB_HOST: "127.0.0.1",
      PROTO05_MARIADB_PORT: "3306",
      PROTO05_MARIADB_DATABASE: "ic_augmented_video",
      PROTO05_MARIADB_USER: "reader"
    }),
    /PROTO05_MARIADB_PASSWORD/
  );
});

test("grants applicatifs MariaDB limités aux écritures de données Proto05", () => {
  const config = { ...testConfiguration(), user: "proto05_application" };
  const valid = [
    { grant: "GRANT USAGE ON *.* TO `proto05_application`@`%`" },
    { grant: "GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW ON `ic_augmented_video`.* TO `proto05_application`@`%`" }
  ];
  assert.deepEqual(assertApplicationGrants(valid, config), {
    readonly: false,
    privileges: ["DELETE", "INSERT", "SELECT", "SHOW VIEW", "UPDATE"]
  });
  for (const forbidden of [
    "ALTER",
    "CREATE",
    "DROP",
    "EXECUTE",
    "GRANT OPTION"
  ]) {
    const grant = forbidden === "GRANT OPTION"
      ? "GRANT SELECT, INSERT, UPDATE, DELETE ON `ic_augmented_video`.* TO `proto05_application`@`%` WITH GRANT OPTION"
      : `GRANT ${forbidden} ON \`ic_augmented_video\`.* TO \`proto05_application\`@\`%\``;
    assert.throws(() => assertApplicationGrants([...valid, { grant }], config));
  }
  assert.throws(() => assertApplicationGrants([
    ...valid,
    { grant: "GRANT SELECT ON `ic_hub`.* TO `proto05_application`@`%`" }
  ], config), /hors du périmètre/);
});

test("plan relationnel distingue insert, update, delete et préserve les lignes identiques", () => {
  const definition = { name: "activities", pk: ["id"] };
  const plan = tablePlan(
    definition,
    [{ id: "same", title: "A" }, { id: "update", title: "Avant" }, { id: "delete", title: "X" }],
    [{ id: "same", title: "A" }, { id: "update", title: "Après" }, { id: "insert", title: "Y" }]
  );
  assert.deepEqual(plan.inserts.map(row => row.id), ["insert"]);
  assert.deepEqual(plan.updates.map(change => change.desired.id), ["update"]);
  assert.deepEqual(plan.deletes.map(row => row.id), ["delete"]);
});

test("frontière d’écriture conserve JSON, autorise mariadb et refuse les modes de lecture", async () => {
  const calls = [];
  const json = createProto05WriteBoundary({
    mode: "json",
    jsonAdapter: { async writeSnapshot(snapshot) { calls.push(["json", snapshot]); } }
  });
  await json.writeSnapshot({ id: "json" });
  const maria = createProto05WriteBoundary({
    mode: "mariadb",
    jsonAdapter: { async writeSnapshot() { throw new Error("fallback JSON"); } },
    mariadbAdapter: {
      async writeSnapshot(snapshot) { calls.push(["mariadb", snapshot]); },
      async appendWorkingCopy(snapshot, mutation) { calls.push(["mariadb-working-copy", snapshot, mutation]); }
    }
  });
  await maria.writeSnapshot({ id: "mariadb" });
  await maria.appendWorkingCopy({ id: "snapshot" }, { id: "mutation" });
  assert.deepEqual(calls.map(call => call[0]), ["json", "mariadb", "mariadb-working-copy"]);
  for (const mode of ["compare", "mariadb-readonly"]) {
    const readonly = createProto05WriteBoundary({
      mode,
      jsonAdapter: { async writeSnapshot() {} }
    });
    await assert.rejects(() => readonly.writeSnapshot({}), error => (
      error.code === "PROTO05_READONLY_MODE"
    ));
  }
});

test("une erreur forcée après la première écriture déclenche un rollback sans commit", async () => {
  const tables = await migrationTables();
  const canonical = canonicalJsonSnapshot();
  const snapshot = {
    ...canonical,
    videoLibrary: projectCanonicalLibrary(canonical.videoLibrary)
  };
  snapshot.activities.activities[0].title += " [rollback]";
  snapshot.activities.updatedAt = new Date().toISOString();
  Object.defineProperty(snapshot, "canonicalVideoLibrary", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: canonical.videoLibrary
  });
  let rolledBack = 0;
  let committed = 0;
  let mutations = 0;
  const mysql = {
    async createConnection(options) {
      return {
        async query(sql) {
          if (/^SET SESSION/.test(sql) || /^SET TRANSACTION/.test(sql)) return [[], []];
          if (sql.startsWith("SELECT CURRENT_USER")) {
            return [[{ account: `${options.user}@%`, database_name: options.database }], []];
          }
          if (sql === "SHOW GRANTS") return [[
            { grant: `GRANT USAGE ON *.* TO \`${options.user}\`@\`%\`` },
            { grant: `GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW ON \`${options.database}\`.* TO \`${options.user}\`@\`%\`` }
          ], []];
          if (sql.startsWith("SELECT GET_LOCK")) return [[{ acquired: 1 }], []];
          if (sql.startsWith("SELECT RELEASE_LOCK")) return [[{ released: 1 }], []];
          const select = /^SELECT \* FROM `([a-z0-9_]+)`/.exec(sql);
          if (select) return [structuredClone(tables[select[1]] || []), []];
          if (/^(?:INSERT|UPDATE|DELETE)\s/i.test(sql)) {
            mutations += 1;
            return [{ affectedRows: 1 }, []];
          }
          throw new Error(`Requête inattendue : ${sql}`);
        },
        async beginTransaction() {},
        async rollback() { rolledBack += 1; },
        async commit() { committed += 1; },
        async end() {}
      };
    }
  };
  const adapter = createMariaDbWriteAdapter({
    config: { ...testConfiguration(), user: "proto05_application" },
    prototypeDirectory,
    mysql
  });
  await assert.rejects(
    () => adapter.writeSnapshot(snapshot, {
      operation: "forced-rollback-test",
      failAfterStatements: 1
    }),
    error => error.code === "PROTO05_FORCED_ROLLBACK"
  );
  assert.equal(mutations, 1);
  assert.equal(rolledBack, 1);
  assert.equal(committed, 0);
});

test("la copie de travail MariaDB reste ciblée et sa défaillance annule toute la transaction", async () => {
  const initialTables = await migrationTables();
  const canonical = canonicalJsonSnapshot();
  const snapshot = {
    ...canonical,
    videoLibrary: projectCanonicalLibrary(canonical.videoLibrary)
  };
  Object.defineProperty(snapshot, "canonicalVideoLibrary", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: canonical.videoLibrary
  });
  const now = "2026-07-30T15:00:00.000Z";
  const mutation = {
    assetId: "media-proto05-video-proto05-uga-37004",
    expectedPlayableId: "video-proto05-uga-37004",
    updatedAt: now,
    source: {
      id: "source-m145-targeted-working-copy",
      assetId: "media-proto05-video-proto05-uga-37004",
      kind: "local-file",
      provider: "local",
      role: "working-copy",
      transport: "file",
      mimeType: "video/mp4",
      origin: {
        originalFileName: "m145-targeted.mp4",
        sourceAssetId: "media-proto05-video-proto05-uga-37004",
        sourcePlayableId: "video-proto05-uga-37004"
      },
      provenance: { kind: "managed-remote-copy", sourceAssetId: "media-proto05-video-proto05-uga-37004" },
      createdAt: now
    },
    playable: {
      id: "video-m145-targeted-working-copy",
      assetId: "media-proto05-video-proto05-uga-37004",
      sourceId: "source-m145-targeted-working-copy",
      kind: "local-file",
      provider: "local",
      role: "working-copy",
      availability: "available",
      availabilityReason: null,
      location: { storageScope: "workspace", storageKey: "m145/source/m145-targeted.mp4" },
      technicalMetadata: {
        status: "available",
        mimeType: "video/mp4",
        durationMs: 2000,
        sizeBytes: 1024,
        sha256: "a".repeat(64),
        width: 640,
        height: 360,
        frameRate: 25,
        videoCodec: "h264",
        audioCodec: "aac",
        hasAudio: true,
        analyzer: "ffprobe",
        analyzerVersion: null,
        analyzedAt: now,
        error: null,
        fileName: "m145-targeted.mp4"
      },
      provenance: { kind: "managed-remote-copy", sourceAssetId: "media-proto05-video-proto05-uga-37004" },
      createdAt: now,
      updatedAt: now
    }
  };

  function transactionalMysql(seed) {
    const tables = structuredClone(seed);
    const writes = [];
    let transactionBackup = null;
    let committed = 0;
    let rolledBack = 0;
    const mysql = {
      async createConnection(options) {
        return {
          async query(sql, values = []) {
            if (/^SET SESSION/.test(sql) || /^SET TRANSACTION/.test(sql)) return [[], []];
            if (sql.startsWith("SELECT CURRENT_USER")) {
              return [[{ account: `${options.user}@%`, database_name: options.database }], []];
            }
            if (sql === "SHOW GRANTS") return [[
              { grant: `GRANT USAGE ON *.* TO \`${options.user}\`@\`%\`` },
              { grant: `GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW ON \`${options.database}\`.* TO \`${options.user}\`@\`%\`` }
            ], []];
            if (sql.startsWith("SELECT GET_LOCK")) return [[{ acquired: 1 }], []];
            if (sql.startsWith("SELECT RELEASE_LOCK")) return [[{ released: 1 }], []];
            if (sql.startsWith("SELECT `id`, `deleted_at` FROM `media_assets`")) {
              return [tables.media_assets.filter(row => row.id === values[0])
                .map(row => ({ id: row.id, deleted_at: row.deleted_at })), []];
            }
            if (sql.startsWith("SELECT `id` FROM `media_playables` WHERE `id` = ? AND")) {
              return [tables.media_playables.filter(row => (
                row.id === values[0] && row.asset_id === values[1] && row.removed_at === null
              )).map(row => ({ id: row.id })), []];
            }
            if (sql.startsWith("SELECT `id` FROM `media_sources`")) {
              return [tables.media_sources.filter(row => row.id === values[0]).map(row => ({ id: row.id })), []];
            }
            if (sql.startsWith("SELECT `id` FROM `media_playables`")) {
              return [tables.media_playables.filter(row => row.id === values[0]).map(row => ({ id: row.id })), []];
            }
            const select = /^SELECT \* FROM `([a-z0-9_]+)`/.exec(sql);
            if (select) return [structuredClone(tables[select[1]] || []), []];
            const insert = /^INSERT INTO `([a-z0-9_]+)` \((.+)\) VALUES/.exec(sql);
            if (insert) {
              const columns = [...insert[2].matchAll(/`([^`]+)`/g)].map(match => match[1]);
              tables[insert[1]].push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
              writes.push(sql);
              return [{ affectedRows: 1 }, []];
            }
            if (sql.startsWith("UPDATE `media_assets` SET `updated_at`")) {
              const row = tables.media_assets.find(item => item.id === values[1]);
              if (row) row.updated_at = values[0];
              writes.push(sql);
              return [{ affectedRows: row ? 1 : 0 }, []];
            }
            if (sql.startsWith("UPDATE `data_projection_metadata`")) {
              const row = tables.data_projection_metadata.find(item => item.document_key === "media-library");
              if (row) row.source_updated_at_utc = values[0];
              writes.push(sql);
              return [{ affectedRows: row ? 1 : 0 }, []];
            }
            throw new Error(`Requête inattendue : ${sql}`);
          },
          async beginTransaction() { transactionBackup = structuredClone(tables); },
          async rollback() {
            for (const key of Object.keys(tables)) tables[key] = structuredClone(transactionBackup[key]);
            rolledBack += 1;
          },
          async commit() { committed += 1; },
          async end() {}
        };
      }
    };
    return {
      mysql,
      tables,
      writes,
      counters: () => ({ committed, rolledBack })
    };
  }

  const successful = transactionalMysql(initialTables);
  const adapter = createMariaDbWriteAdapter({
    config: { ...testConfiguration(), user: "proto05_application" },
    prototypeDirectory,
    mysql: successful.mysql
  });
  const result = await adapter.appendWorkingCopy(snapshot, mutation);
  assert.deepEqual(result.cardinalityDeltas, {
    media_sources: 1,
    media_playables: 1,
    media_playable_metadata: 1
  });
  assert.equal(result.snapshot.canonicalVideoLibrary.sources.some(item => item.id === mutation.source.id), true);
  assert.equal(result.snapshot.canonicalVideoLibrary.playables.some(item => item.id === mutation.playable.id), true);
  assert.equal(successful.writes.some(sql => /^DELETE\b/i.test(sql)), false);
  assert.deepEqual(
    [...new Set(successful.writes.map(sql => (
      /^INSERT INTO `([^`]+)`/.exec(sql)?.[1]
      || /^UPDATE `([^`]+)`/.exec(sql)?.[1]
    )).filter(Boolean))].sort(),
    ["data_projection_metadata", "media_assets", "media_playable_metadata", "media_playables", "media_sources"]
  );
  assert.deepEqual(successful.counters(), { committed: 1, rolledBack: 0 });

  const failing = transactionalMysql(initialTables);
  const rollbackAdapter = createMariaDbWriteAdapter({
    config: { ...testConfiguration(), user: "proto05_application" },
    prototypeDirectory,
    mysql: failing.mysql
  });
  await assert.rejects(
    () => rollbackAdapter.appendWorkingCopy(snapshot, mutation, { failAfterStatements: 1 }),
    error => error.code === "PROTO05_FORCED_ROLLBACK"
  );
  assert.equal(failing.tables.media_sources.some(row => row.id === mutation.source.id), false);
  assert.equal(failing.tables.media_playables.some(row => row.id === mutation.playable.id), false);
  assert.deepEqual(failing.counters(), { committed: 0, rolledBack: 1 });
});

test("validation des grants strictement readonly", () => {
  const config = testConfiguration();
  const valid = [
    { grant: "GRANT USAGE ON *.* TO `ic_augmented_readonly`@`%` IDENTIFIED BY PASSWORD '*TEST'" },
    { grant: "GRANT SELECT, SHOW VIEW ON `ic_augmented_video`.* TO `ic_augmented_readonly`@`%`" }
  ];
  assert.deepEqual(assertReadonlyGrants(valid, config), {
    readonly: true,
    privileges: ["SELECT", "SHOW VIEW"]
  });
  assert.throws(
    () => assertReadonlyGrants([
      ...valid,
      { grant: "GRANT UPDATE ON `ic_augmented_video`.* TO `ic_augmented_readonly`@`%`" }
    ], config),
    /incompatibles/
  );
  assert.throws(
    () => assertReadonlyGrants([
      { grant: "GRANT USAGE ON *.* TO `ic_augmented_readonly`@`%`" },
      { grant: "GRANT SELECT ON `ic_hub`.* TO `ic_augmented_readonly`@`%`" }
    ], config),
    /hors du périmètre/
  );
});

test("mapping relationnel complet équivalent aux contrats JSON canoniques", async () => {
  const tables = await migrationTables();
  const mapped = mapMariaDbTablesToSnapshot(tables);
  const comparison = compareCanonical(canonicalJsonSnapshot(), mapped, {
    operation: "mapping-contract",
    maxDifferences: 1000
  });
  assert.equal(comparison.total, 0, JSON.stringify(comparison.differences.slice(0, 10), null, 2));
  assert.equal(mapped.activities.activities.length, 2);
  assert.equal(mapped.activities.activities[0].video, undefined);
  assert.equal(mapped.activities.activities[0].videoSource, undefined);
  assert.equal(mapped.activities.activities[0].videoRef.playableId, "video-proto05-uga-37004");
  assert.equal(mapped.activities.activities[1].videoRef.playableId, "video-proto05-youtube-ev9rfkfhfa0");
  assert.ok(mapped.videoLibrary.playables.some(playable => playable.kind === "local-file"));
  assert.ok(mapped.videoLibrary.playables.some(playable => playable.availability === "missing-local"));
  assert.equal(mapped.videoLibrary.folders.length, canonicalJsonSnapshot().videoLibrary.folders.length);
  assert.equal(mapped.videoLibrary.tags.length, canonicalJsonSnapshot().videoLibrary.tags.length);
  const applicationComparison = compareCanonical(
    {
      ...canonicalJsonSnapshot(),
      videoLibrary: projectCanonicalLibrary(canonicalJsonSnapshot().videoLibrary)
    },
    projectMariaDbSnapshotForApplication(mapped),
    { operation: "application-mapping-contract", maxDifferences: 1000 }
  );
  assert.equal(applicationComparison.total, 0, JSON.stringify(applicationComparison.differences.slice(0, 10), null, 2));
});

test("comparateur localise les divergences sans fusionner les sources", async () => {
  assert.equal(compareCanonical({ value: 1 }, { value: 1 }, { operation: "equal" }).total, 0);
  const value = compareCanonical({ value: 1 }, { value: 2 }, { operation: "value" });
  assert.equal(value.differences[0].path, "$.value");
  assert.equal(value.differences[0].kind, "value");
  assert.equal(compareCanonical({ value: 1 }, {}, { operation: "missing" }).differences[0].kind, "missing-in-mariadb");
  assert.equal(compareCanonical({}, { value: 1 }, { operation: "extra" }).differences[0].kind, "extra-in-mariadb");
  assert.equal(compareCanonical({ value: 1 }, { value: "1" }, { operation: "type" }).differences[0].kind, "type");
  assert.equal(compareCanonical({ tagIds: ["b", "a"] }, { tagIds: ["a", "b"] }, { operation: "unordered" }).total, 0);
  assert.notEqual(compareCanonical({ ordered: ["b", "a"] }, { ordered: ["a", "b"] }, { operation: "ordered" }).total, 0);

  const logs = [];
  const jsonSnapshot = { source: "json", value: 1 };
  const boundary = createProto05ReadBoundary({
    mode: "compare",
    jsonAdapter: { async readSnapshot() { return structuredClone(jsonSnapshot); } },
    mariadbAdapter: {
      async verify() { return { readonly: true }; },
      async readSnapshot() { return { source: "mariadb", value: 2 }; },
      async close() {}
    },
    logger: { error(message) { logs.push(message); }, info(message) { logs.push(message); } }
  });
  assert.deepEqual(await boundary.readSnapshot({ operation: "compare-response" }), jsonSnapshot);
  assert.ok(logs.some(message => message.includes("divergence")));
});

test("adaptateur ferme ses connexions et nettoie les erreurs", async () => {
  const tables = await migrationTables();
  const queries = [];
  let closed = 0;
  const mysql = {
    async createConnection(options) {
      return {
        async query(sql) {
          queries.push(sql);
          if (/^SET SESSION/.test(sql)) return [[], []];
          if (sql.startsWith("SELECT CURRENT_USER")) return [[{ account: `${options.user}@%`, database_name: options.database }], []];
          if (sql === "SHOW GRANTS") return [[
            { grant: `GRANT USAGE ON *.* TO \`${options.user}\`@\`%\`` },
            { grant: `GRANT SELECT, SHOW VIEW ON \`${options.database}\`.* TO \`${options.user}\`@\`%\`` }
          ], []];
          if (sql.startsWith("SELECT COUNT(*)")) return [[{ activity_count: 2 }], []];
          const match = /^SELECT \* FROM `([a-z0-9_]+)`/.exec(sql);
          if (match) return [structuredClone(tables[match[1]] || []), []];
          throw new Error("unexpected query");
        },
        async end() { closed += 1; }
      };
    }
  };
  const adapter = createMariaDbReadonlyAdapter({
    config: testConfiguration(),
    prototypeDirectory,
    mysql
  });
  assert.equal((await adapter.verify()).readonly, true);
  assert.equal((await adapter.readSnapshot()).activities.activities.length, 2);
  assert.equal(closed, 2);
  assert.ok(queries.every(sql => /^(?:SELECT|SHOW GRANTS|SET SESSION)/.test(sql)));
  assert.equal(queries.some(sql => /\b(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|CALL)\b/i.test(sql)), false);

  const unavailable = createMariaDbReadonlyAdapter({
    config: testConfiguration(),
    prototypeDirectory,
    mysql: { async createConnection() { throw new Error("secret-test should never escape"); } }
  });
  await assert.rejects(() => unavailable.verify(), error => {
    assert.equal(error.message, "Connexion MariaDB readonly impossible.");
    assert.doesNotMatch(error.message, /secret-test/);
    return true;
  });
});

test("mode JSON par défaut sans configuration ni connexion MariaDB", { timeout: 15000 }, async () => {
  const canonical = canonicalJsonSnapshot();
  const server = await startTemporaryProto05Server(
    structuredClone(canonical.activities),
    "proto05-json-default-",
    {
      activityLibrary: canonical.activityLibrary,
      env: {
        PROTO05_MYSQL2_DIRECTORY: path.join(os.tmpdir(), "module-mysql-inexistant")
      }
    }
  );
  try {
    const health = await (await fetch(`${server.baseUrl}/api/health`)).json();
    assert.equal(health.dataMode, "json");
    const list = await (await fetch(`${server.baseUrl}/api/proto05/activities`)).json();
    assert.equal(list.activities.length, canonical.activities.activities.length);
    assert.equal(list.activities[0].video.kind, "hls");
    assert.equal(list.activities[1].video.kind, "youtube-embed");
  } finally {
    await server.cleanup();
  }
});

test("modes HTTP compare et MariaDB readonly, projections et gardes de mutation", { timeout: 30000 }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-read-boundary-"));
  const rowsFile = path.join(root, "rows.json");
  fs.writeFileSync(rowsFile, `${JSON.stringify(await migrationTables())}\n`, "utf8");
  const canonical = canonicalJsonSnapshot();
  const commonEnvironment = {
    PROTO05_MARIADB_HOST: "127.0.0.1",
    PROTO05_MARIADB_PORT: "3306",
    PROTO05_MARIADB_DATABASE: "ic_augmented_video",
    PROTO05_MARIADB_USER: "ic_augmented_readonly",
    PROTO05_MARIADB_PASSWORD: "test-only-not-a-real-secret",
    PROTO05_MYSQL2_DIRECTORY: fakeMysqlModule,
    PROTO05_FAKE_MARIADB_ROWS: rowsFile
  };

  const compare = await startTemporaryProto05Server(
    structuredClone(canonical.activities),
    "proto05-compare-mode-",
    {
      activityLibrary: canonical.activityLibrary,
      env: { ...commonEnvironment, PROTO05_DATA_MODE: "compare" }
    }
  );
  try {
    const beforeActivities = hash(compare.dataFile);
    const beforeLibrary = hash(compare.videoLibraryFile);
    const health = await (await fetch(`${compare.baseUrl}/api/health`)).json();
    assert.equal(health.dataMode, "compare");
    const list = await (await fetch(`${compare.baseUrl}/api/proto05/activities`)).json();
    assert.equal(list.activities.length, 2);
    const mutations = [
      ["POST", "/api/proto05/activities"],
      ["PUT", `/api/proto05/activities/${encodeURIComponent(list.activities[0].id)}`],
      ["PUT", `/api/proto05/activities/${encodeURIComponent(list.activities[0].id)}/authoring`],
      ["PUT", `/api/proto05/activities/${encodeURIComponent(list.activities[0].id)}/video-ref`],
      ["POST", `/api/proto05/activities/${encodeURIComponent(list.activities[0].id)}/duplicate`],
      ["DELETE", `/api/proto05/activities/${encodeURIComponent(list.activities[0].id)}`],
      ["PUT", "/api/proto05/activity-library"],
      ["POST", "/api/proto05/library/import-local"],
      ["POST", "/api/proto05/library/remote-references"],
      ["POST", "/api/proto05/library/hls-preparations"],
      ["POST", "/api/proto05/library/hls-derivations"]
    ];
    for (const [method, route] of mutations) {
      const blocked = await fetch(`${compare.baseUrl}${route}`, {
        method,
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      assert.equal(blocked.status, 409, `${method} ${route}`);
      assert.equal((await blocked.json()).code, "PROTO05_READONLY_MODE");
    }
    assert.equal(hash(compare.dataFile), beforeActivities);
    assert.equal(hash(compare.videoLibraryFile), beforeLibrary);
  } finally {
    await compare.cleanup();
  }

  const maria = await startTemporaryProto05Server(
    { schemaVersion: "0.1", updatedAt: "json-must-not-be-used", activities: [] },
    "proto05-mariadb-mode-",
    {
      env: { ...commonEnvironment, PROTO05_DATA_MODE: "mariadb-readonly" }
    }
  );
  try {
    const health = await (await fetch(`${maria.baseUrl}/api/health`)).json();
    assert.equal(health.dataMode, "mariadb-readonly");
    const list = await (await fetch(`${maria.baseUrl}/api/proto05/activities`)).json();
    assert.equal(list.activities.length, 2);
    assert.equal(list.activities[0].video.kind, "hls");
    assert.equal(list.activities[0].video.youtubeVideoId, undefined);
    assert.equal(list.activities[1].video.kind, "youtube-embed");
    assert.equal(list.activities[1].video.proxyUrl, undefined);
    const detail = await (await fetch(`${maria.baseUrl}/api/proto05/activities/${encodeURIComponent(list.activities[1].id)}`)).json();
    assert.equal(detail.activity.videoRef.playableId, list.activities[1].videoRef.playableId);
    const missing = await fetch(`${maria.baseUrl}/api/proto05/activities/activity-inexistante`);
    assert.equal(missing.status, 404);
    const library = await (await fetch(`${maria.baseUrl}/api/proto05/activity-library`)).json();
    assert.equal(library.activities.length, 2);
    const assets = await (await fetch(`${maria.baseUrl}/api/proto05/library/assets`)).json();
    assert.equal(assets.assets.length, canonical.videoLibrary.assets.length);
    const languages = await (await fetch(`${maria.baseUrl}/api/proto05/language-catalog`)).json();
    assert.equal(languages.languages.length, canonical.languageCatalog.languages.length);
    const blocked = await fetch(`${maria.baseUrl}/api/proto05/activities/${encodeURIComponent(list.activities[0].id)}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    assert.equal(blocked.status, 409);
    assert.equal((await blocked.json()).dataMode, "mariadb-readonly");
    assert.equal(json(maria.dataFile).activities.length, 0);
  } finally {
    await maria.cleanup();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
