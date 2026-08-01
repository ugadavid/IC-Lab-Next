import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PROTOTYPE_DIRECTORY,
  deterministicResult
} from "./001_proto05_json_to_mariadb_dry_run.mjs";
import { TABLE_DEFINITIONS, stableStringify } from "../../server/proto05-relational-mapping.mjs";
import { assertExplicitHistoricalTestDatabase } from "./historical-test-database-guard.mjs";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_FILE);
const WORKSPACE_DIRECTORY = path.resolve(DEFAULT_PROTOTYPE_DIRECTORY, "..", "..");
const EXPECTED_PLAN_HASH =
  "d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233";
const APPLY_CONFIRMATION = "APPLY_PROTO05_CANONICAL_JSON_TO_MARIADB";
const LOCK_NAME = "proto05:json-to-mariadb:initial-import:v1";
const DEFAULT_CONTAINER = "ic_dico_mariadb_next";
const MYSQL2_DIRECTORY = path.resolve(
  DEFAULT_PROTOTYPE_DIRECTORY,
  "..",
  "00-ic-hub",
  "server",
  "node_modules",
  "mysql2",
  "promise"
);
const WARNING_COUNTS = Object.freeze({
  ACTIVITY_TIMESTAMP_FALLBACK: 2,
  ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE: 2,
  AVAILABLE_LOCAL_FILE_MISSING: 7,
  MEDIA_LINEAGE_RECONSTRUCTED: 10,
  SEMANTIC_INTERVAL_DUPLICATE: 1
});
const FORBIDDEN_SQL = [
  /SET\s+FOREIGN_KEY_CHECKS\s*=\s*0/i,
  /INSERT\s+IGNORE/i,
  /REPLACE\s+INTO/i,
  /ON\s+DUPLICATE\s+KEY\s+UPDATE/i
];

const require = createRequire(import.meta.url);
const mysql = require(MYSQL2_DIRECTORY);

class MigrationError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = "MigrationError";
    this.code = code;
    this.context = context;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertSafeIdentifier(value, label) {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new MigrationError("UNSAFE_IDENTIFIER", `${label} is not a safe SQL identifier`, { value });
  }
  return `\`${value}\``;
}

function parseArguments(argv) {
  const options = {
    mode: "verify-only",
    database: null,
    expectedPlanHash: null,
    confirmation: null,
    container: DEFAULT_CONTAINER,
    backupFile: null
  };
  let explicitMode = false;
  let explicitDatabase = false;
  for (const argument of argv) {
    if (["--verify-only", "--apply", "--rollback-test", "--backup"].includes(argument)) {
      if (explicitMode) throw new MigrationError("ARGUMENT_CONFLICT", "Only one mode may be selected.");
      explicitMode = true;
      options.mode = argument.slice(2);
    } else if (argument.startsWith("--database=")) {
      options.database = argument.slice("--database=".length);
      explicitDatabase = true;
    } else if (argument.startsWith("--expected-plan-hash=")) {
      options.expectedPlanHash = argument.slice("--expected-plan-hash=".length);
    } else if (argument.startsWith("--confirm=")) {
      options.confirmation = argument.slice("--confirm=".length);
    } else if (argument.startsWith("--container=")) {
      options.container = argument.slice("--container=".length);
    } else if (argument.startsWith("--backup-file=")) {
      options.backupFile = path.resolve(argument.slice("--backup-file=".length));
    } else if (argument === "--help") {
      options.mode = "help";
    } else {
      throw new MigrationError("UNKNOWN_ARGUMENT", `Unknown argument: ${argument}`);
    }
  }
  if (options.mode !== "help") {
    options.database = assertExplicitHistoricalTestDatabase(options.database, { explicit: explicitDatabase });
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(options.container)) {
    throw new MigrationError("INVALID_CONTAINER", "The Docker container name is invalid.");
  }
  if (["apply", "rollback-test"].includes(options.mode)) {
    if (options.expectedPlanHash !== EXPECTED_PLAN_HASH) {
      throw new MigrationError(
        "EXPECTED_HASH_REQUIRED",
        "The exact validated plan hash is required for a write-capable mode."
      );
    }
    if (options.confirmation !== APPLY_CONFIRMATION) {
      throw new MigrationError(
        "EXPLICIT_CONFIRMATION_REQUIRED",
        `Write intent must be confirmed with --confirm=${APPLY_CONFIRMATION}.`
      );
    }
    if (!options.backupFile) {
      throw new MigrationError(
        "BACKUP_REQUIRED",
        "A verified pre-migration backup file is required."
      );
    }
  }
  if (options.mode === "backup" && !options.backupFile) {
    throw new MigrationError("BACKUP_PATH_REQUIRED", "--backup-file is required in backup mode.");
  }
  return options;
}

function helpText() {
  return [
    "Usage:",
    "  node 003_proto05_json_to_mariadb_apply.mjs --verify-only --database=proto05_test_NAME",
    "  node 003_proto05_json_to_mariadb_apply.mjs --backup --database=proto05_test_NAME --backup-file=ABSOLUTE_PATH",
    "  node 003_proto05_json_to_mariadb_apply.mjs --rollback-test",
    "    --database=proto05_test_NAME",
    `    --expected-plan-hash=${EXPECTED_PLAN_HASH}`,
    `    --confirm=${APPLY_CONFIRMATION}`,
    "    --backup-file=ABSOLUTE_PATH",
    "  node 003_proto05_json_to_mariadb_apply.mjs --apply (same guards; real database always refused)",
    "",
    "Default mode is verify-only. No password argument is supported."
  ].join("\n");
}

function readContainerRootPassword(container) {
  const command = 'printf %s "$MARIADB_ROOT_PASSWORD"';
  const result = spawnSync("docker", ["exec", container, "sh", "-c", command], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024
  });
  if (result.status !== 0 || !result.stdout) {
    throw new MigrationError(
      "DATABASE_CREDENTIAL_UNAVAILABLE",
      "The MariaDB credential could not be obtained from the container environment."
    );
  }
  return result.stdout;
}

async function openConnection(options, { readOnly = false } = {}) {
  const password = readContainerRootPassword(options.container);
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password,
    database: options.database,
    charset: "utf8mb4",
    dateStrings: true,
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: false,
    connectTimeout: 10_000
  });
  password.fill?.(0);
  if (readOnly) await connection.query("SET SESSION TRANSACTION READ ONLY");
  return connection;
}

async function selectedDatabase(connection) {
  const [[row]] = await connection.query("SELECT DATABASE() AS database_name");
  return row.database_name;
}

function prepareValidatedPlan() {
  const prepared = deterministicResult(DEFAULT_PROTOTYPE_DIRECTORY);
  const { result, model, intermediate } = prepared;
  const actualWarningCounts = Object.fromEntries(
    Object.keys(WARNING_COUNTS).map(code => [
      code,
      result.diagnostics.filter(item => item.severity === "warning" && item.code === code).length
    ])
  );
  const unexpectedWarnings = result.diagnostics.filter(
    item => item.severity === "warning" && !Object.hasOwn(WARNING_COUNTS, item.code)
  );
  if (
    !model
    || !intermediate
    || result.status !== "valid"
    || result.blockers !== 0
    || result.warnings !== 22
    || result.totalPreparedRows !== 264
    || result.tablesWithRows !== 27
    || result.deterministicHash !== EXPECTED_PLAN_HASH
    || stableStringify(actualWarningCounts) !== stableStringify(WARNING_COUNTS)
    || unexpectedWarnings.length !== 0
  ) {
    throw new MigrationError("PLAN_PREFLIGHT_FAILED", "The dry-run plan no longer matches Mission 133.", {
      status: result.status,
      blockers: result.blockers,
      warnings: result.warnings,
      rows: result.totalPreparedRows,
      tables: result.tablesWithRows,
      hash: result.deterministicHash,
      warningCounts: actualWarningCounts,
      unexpectedWarnings: unexpectedWarnings.map(item => item.code)
    });
  }
  return { ...prepared, warningCounts: actualWarningCounts };
}

function dumpArguments(database, { schema = true } = {}) {
  const args = [
    "exec",
    DEFAULT_CONTAINER,
    "sh",
    "-c",
    schema
      ? 'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --events --triggers --hex-blob --default-character-set=utf8mb4 --skip-dump-date --databases "$1"'
      : 'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --no-create-info --skip-triggers --compact --skip-comments --skip-dump-date --skip-extended-insert --order-by-primary --default-character-set=utf8mb4 "$1"',
    "proto05-dump",
    database
  ];
  return args;
}

function createBackup(options) {
  if (!path.isAbsolute(options.backupFile)) {
    throw new MigrationError("BACKUP_PATH_NOT_ABSOLUTE", "The backup path must be absolute.");
  }
  const relative = path.relative(WORKSPACE_DIRECTORY, options.backupFile);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new MigrationError("BACKUP_INSIDE_REPOSITORY", "The backup must be stored outside the repository.");
  }
  if (fs.existsSync(options.backupFile)) {
    throw new MigrationError("BACKUP_ALREADY_EXISTS", "The backup path already exists; no file was overwritten.");
  }
  const result = spawnSync("docker", dumpArguments(options.database, { schema: true }), {
    encoding: null,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0 || !result.stdout?.length) {
    throw new MigrationError("BACKUP_FAILED", "mariadb-dump did not produce a readable backup.");
  }
  fs.writeFileSync(options.backupFile, result.stdout, { flag: "wx" });
  const verification = verifyBackup(options.backupFile);
  return verification;
}

function verifyBackup(backupFile) {
  const buffer = fs.readFileSync(backupFile);
  const text = buffer.toString("utf8");
  const tableDefinitions = (text.match(/CREATE TABLE /g) || []).length;
  const procedureDefinitions = (text.match(/CREATE(?: DEFINER=.*)? PROCEDURE /g) || []).length;
  if (
    buffer.length === 0
    || !text.includes("USE `ic_augmented_video`")
    || tableDefinitions !== 31
    || procedureDefinitions !== 43
  ) {
    throw new MigrationError("BACKUP_UNREADABLE", "The backup does not contain the expected complete schema.", {
      size: buffer.length,
      tableDefinitions,
      procedureDefinitions
    });
  }
  return {
    file: backupFile,
    size: buffer.length,
    sha256: sha256(buffer),
    readable: true,
    tableDefinitions,
    procedureDefinitions
  };
}

function dataDumpHash(database, container = DEFAULT_CONTAINER) {
  const args = dumpArguments(database, { schema: false });
  args[1] = container;
  const result = spawnSync("docker", args, {
    encoding: null,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new MigrationError("WITNESS_DUMP_FAILED", `Could not read the ${database} witness.`);
  }
  return sha256(result.stdout);
}

async function schemaSnapshot(connection) {
  const databaseName = await selectedDatabase(connection);
  const [[counts]] = await connection.query(
    `SELECT
       (SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE') AS tables_count,
       (SELECT COUNT(*) FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE') AS procedures_count,
       (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = ?) AS fk_count,
       (SELECT COUNT(*) FROM information_schema.CHECK_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = ?) AS checks_count,
       (SELECT COUNT(*) FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = ?) AS triggers_count,
       (SELECT COUNT(*) FROM information_schema.EVENTS
        WHERE EVENT_SCHEMA = ?) AS events_count,
       (SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
          AND ENGINE <> 'InnoDB') AS non_innodb,
       (SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'data_projection_metadata'
          AND TABLE_TYPE = 'BASE TABLE') AS metadata_table_count`,
    Array(8).fill(databaseName)
  );
  const snapshot = Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, Number(value)])
  );
  const metadataInstalled = snapshot.metadata_table_count === 1;
  const expected = {
    tables_count: metadataInstalled ? 32 : 31,
    procedures_count: 43,
    fk_count: 48,
    checks_count: metadataInstalled ? 68 : 65,
    triggers_count: 0,
    events_count: 0,
    non_innodb: 0,
    metadata_table_count: metadataInstalled ? 1 : 0
  };
  if (stableStringify(snapshot) !== stableStringify(expected)) {
    throw new MigrationError("SCHEMA_PREFLIGHT_FAILED", "The installed schema does not match Mission 133.", {
      expected,
      actual: snapshot
    });
  }
  return snapshot;
}

async function tableCounts(connection) {
  const result = {};
  for (const definition of [...TABLE_DEFINITIONS].sort((a, b) => a.name.localeCompare(b.name))) {
    const table = assertSafeIdentifier(definition.name, "table");
    const [[row]] = await connection.query(`SELECT COUNT(*) AS row_count FROM ${table}`);
    result[definition.name] = Number(row.row_count);
  }
  return result;
}

function totalRows(counts) {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

async function otherDatabaseWitnesses(connection, container) {
  const output = {};
  for (const database of ["ic_dico", "ic_hub"]) {
    const [[row]] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE') AS base_tables,
         (SELECT COUNT(*) FROM information_schema.VIEWS
          WHERE TABLE_SCHEMA = ?) AS views,
         (SELECT COUNT(*) FROM information_schema.ROUTINES
          WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE') AS procedures`,
      [database, database, database]
    );
    output[database] = {
      baseTables: Number(row.base_tables),
      views: Number(row.views),
      procedures: Number(row.procedures),
      dataDumpSha256: dataDumpHash(database, container)
    };
  }
  return output;
}

function expectedRowsForTable(model, tableName) {
  const table = model.tables.get(tableName);
  if (!table) throw new MigrationError("PLAN_TABLE_MISSING", `Plan table not found: ${tableName}`);
  return table.rows.map(row => row.data);
}

function rowColumns(rows) {
  return [...new Set(rows.flatMap(row => Object.keys(row)))].sort();
}

function databaseValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return stableStringify(value);
  return value;
}

function selfDependencyDepth(rows, row, idColumn, parentColumn, stack = new Set()) {
  const parent = row[parentColumn];
  if (parent === null || parent === undefined) return 0;
  if (stack.has(row[idColumn])) throw new MigrationError("PLAN_CYCLE", `Cycle detected in ${parentColumn}.`);
  const parentRow = rows.find(candidate => candidate[idColumn] === parent);
  if (!parentRow) return 1;
  const next = new Set(stack);
  next.add(row[idColumn]);
  return 1 + selfDependencyDepth(rows, parentRow, idColumn, parentColumn, next);
}

function insertionRows(tableName, rows) {
  const sorted = [...rows];
  const selfDependencies = {
    media_folders: ["id", "parent_folder_id"],
    media_assets: ["id", "parent_asset_id"],
    activity_pedagogical_identities: ["activity_id", "parent_activity_id"]
  };
  if (selfDependencies[tableName]) {
    const [idColumn, parentColumn] = selfDependencies[tableName];
    sorted.sort((left, right) => (
      selfDependencyDepth(rows, left, idColumn, parentColumn)
      - selfDependencyDepth(rows, right, idColumn, parentColumn)
      || String(left[idColumn]).localeCompare(String(right[idColumn]))
    ));
  }
  return sorted;
}

function buildInsertStatement(tableName, columns) {
  const table = assertSafeIdentifier(tableName, "table");
  const identifiers = columns.map(column => assertSafeIdentifier(column, "column")).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${identifiers}) VALUES (${placeholders})`;
  if (FORBIDDEN_SQL.some(pattern => pattern.test(sql))) {
    throw new MigrationError("FORBIDDEN_SQL", "Generated SQL contains a forbidden construct.");
  }
  return sql;
}

async function insertPlan(connection, model) {
  const counts = {};
  const orderedTables = [...TABLE_DEFINITIONS].sort(
    (left, right) => left.order - right.order || left.name.localeCompare(right.name)
  );
  for (const definition of orderedTables) {
    const expectedRows = expectedRowsForTable(model, definition.name);
    if (!expectedRows.length) {
      counts[definition.name] = 0;
      continue;
    }
    const columns = rowColumns(expectedRows);
    const sql = buildInsertStatement(definition.name, columns);
    for (const row of insertionRows(definition.name, expectedRows)) {
      const insertRow = { ...row };
      if (definition.name === "media_assets") insertRow.default_playable_id = null;
      await connection.execute(sql, columns.map(column => databaseValue(insertRow[column])));
    }
    counts[definition.name] = expectedRows.length;
    if (definition.name === "media_playables") {
      const mediaAssets = expectedRowsForTable(model, "media_assets");
      for (const asset of mediaAssets.filter(item => item.default_playable_id !== null)) {
        await connection.execute(
          "UPDATE media_assets SET default_playable_id = ?, updated_at = ? WHERE id = ?",
          [asset.default_playable_id, asset.updated_at, asset.id]
        );
      }
    }
  }
  return counts;
}

function normalizeActualValue(actual, expected) {
  if (expected === null || expected === undefined) return actual === null ? null : actual;
  if (typeof expected === "boolean") return Number(actual);
  if (typeof expected === "number") return Number(actual);
  if (typeof expected === "object") {
    const parsed = typeof actual === "string" ? JSON.parse(actual) : actual;
    return JSON.parse(stableStringify(parsed));
  }
  return actual === null ? null : String(actual);
}

async function reconcile(connection, model) {
  const databaseName = await selectedDatabase(connection);
  const tables = [];
  const mismatches = [];
  let expectedTotal = 0;
  let actualTotal = 0;
  for (const definition of [...TABLE_DEFINITIONS].sort(
    (left, right) => left.order - right.order || left.name.localeCompare(right.name)
  )) {
    const expectedRows = expectedRowsForTable(model, definition.name);
    const columns = rowColumns(expectedRows);
    const table = assertSafeIdentifier(definition.name, "table");
    const orderColumns = definition.pk.map(column => assertSafeIdentifier(column, "primary key")).join(", ");
    const selectColumns = columns.length
      ? columns.map(column => assertSafeIdentifier(column, "column")).join(", ")
      : "1 AS empty_projection";
    const [actualRows] = await connection.query(
      `SELECT ${selectColumns} FROM ${table}${orderColumns ? ` ORDER BY ${orderColumns}` : ""}`
    );
    expectedTotal += expectedRows.length;
    actualTotal += actualRows.length;
    if (actualRows.length !== expectedRows.length) {
      mismatches.push({
        table: definition.name,
        kind: "row-count",
        expected: expectedRows.length,
        actual: actualRows.length
      });
    }
    const primaryKey = row => stableStringify(
      Object.fromEntries(definition.pk.map(column => [column, String(row[column])]))
    );
    const expectedByKey = new Map(expectedRows.map(row => [primaryKey(row), row]));
    const actualByKey = new Map(actualRows.map(row => [primaryKey(row), row]));
    const allKeys = [...new Set([...expectedByKey.keys(), ...actualByKey.keys()])].sort();
    const canonicalRows = [];
    for (const key of allKeys) {
      const expectedRow = expectedByKey.get(key);
      const actualRow = actualByKey.get(key);
      if (!expectedRow) {
        mismatches.push({
          table: definition.name,
          kind: "unexpected-row",
          key: JSON.parse(key)
        });
        continue;
      }
      if (!actualRow) {
        mismatches.push({
          table: definition.name,
          kind: "missing-row",
          key: JSON.parse(key)
        });
        continue;
      }
      const canonicalRow = {};
      for (const column of columns) {
        const normalizedActual = normalizeActualValue(actualRow[column], expectedRow[column]);
        const normalizedExpected = normalizeActualValue(databaseValue(expectedRow[column]), expectedRow[column]);
        canonicalRow[column] = normalizedActual;
        if (stableStringify(normalizedActual) !== stableStringify(normalizedExpected)) {
          mismatches.push({
            table: definition.name,
            key: Object.fromEntries(definition.pk.map(key => [key, expectedRow[key]])),
            column,
            expected: normalizedExpected,
            actual: normalizedActual
          });
        }
      }
      canonicalRows.push(canonicalRow);
    }
    tables.push({
      name: definition.name,
      primaryKey: definition.pk,
      columns,
      rows: canonicalRows
    });
  }
  const canonicalReadback = {
    method: "proto05-mariadb-plan-columns-v1",
    database: databaseName,
    tables
  };
  return {
    expectedTotal,
    actualTotal,
    mismatches,
    mismatchCount: mismatches.length,
    databaseHash: sha256(stableStringify(canonicalReadback)),
    canonicalReadback
  };
}

async function orphanCount(connection) {
  const databaseName = await selectedDatabase(connection);
  const [rows] = await connection.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME,
            REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, ORDINAL_POSITION
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE CONSTRAINT_SCHEMA = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
    [databaseName]
  );
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.TABLE_NAME}\u0000${row.CONSTRAINT_NAME}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  let total = 0;
  for (const columns of groups.values()) {
    const sourceTable = assertSafeIdentifier(columns[0].TABLE_NAME, "source table");
    const targetTable = assertSafeIdentifier(columns[0].REFERENCED_TABLE_NAME, "target table");
    const joins = columns.map(item => (
      `s.${assertSafeIdentifier(item.COLUMN_NAME, "source column")}`
      + ` = t.${assertSafeIdentifier(item.REFERENCED_COLUMN_NAME, "target column")}`
    )).join(" AND ");
    const sourcePresent = columns.map(item => (
      `s.${assertSafeIdentifier(item.COLUMN_NAME, "source column")} IS NOT NULL`
    )).join(" AND ");
    const targetMissing = `t.${assertSafeIdentifier(columns[0].REFERENCED_COLUMN_NAME, "target column")} IS NULL`;
    const [[row]] = await connection.query(
      `SELECT COUNT(*) AS orphan_count
       FROM ${sourceTable} s
       LEFT JOIN ${targetTable} t ON ${joins}
       WHERE ${sourcePresent} AND ${targetMissing}`
    );
    total += Number(row.orphan_count);
  }
  return total;
}

async function businessInvariants(connection) {
  const [[row]] = await connection.query(
    `SELECT
       (SELECT COUNT(*) FROM activity_language_intervals
        WHERE segment_id IS NULL) AS null_intervals,
       (SELECT COUNT(*) FROM media_treatments
        WHERE status = 'completed'
          AND published_playable_id IS NULL
          AND output_asset_id IS NOT NULL
          AND output_playable_id IS NOT NULL
          AND progress = 100
          AND finished_at IS NOT NULL) AS completed_unpublished,
       (SELECT COUNT(*) FROM media_assets
        WHERE description IS NOT NULL) AS described_assets,
       (SELECT COUNT(*) FROM media_tags
        WHERE color IS NOT NULL) AS colored_tags,
       (SELECT COUNT(*) FROM activities
        WHERE layer_configuration_id IS NOT NULL) AS configured_activities,
       (SELECT COUNT(*) FROM activity_media_links
        WHERE role = 'primary') AS primary_links`
  );
  const actual = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)])
  );
  const expected = {
    null_intervals: 4,
    completed_unpublished: 2,
    described_assets: 0,
    colored_tags: 0,
    configured_activities: 2,
    primary_links: 2
  };
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new MigrationError("BUSINESS_INVARIANT_FAILED", "A business invariant differs from the plan.", {
      expected,
      actual
    });
  }
  return actual;
}

async function validationSnapshot(connection, model) {
  const schema = await schemaSnapshot(connection);
  const counts = await tableCounts(connection);
  const reconciliation = await reconcile(connection, model);
  const orphans = await orphanCount(connection);
  const invariants = await businessInvariants(connection);
  if (
    totalRows(counts) !== 264
    || Object.values(counts).filter(value => value > 0).length !== 27
    || reconciliation.actualTotal !== 264
    || reconciliation.mismatchCount !== 0
    || orphans !== 0
  ) {
    throw new MigrationError("RECONCILIATION_FAILED", "MariaDB does not exactly match the prepared plan.", {
      counts,
      reconciliation: {
        expectedTotal: reconciliation.expectedTotal,
        actualTotal: reconciliation.actualTotal,
        mismatchCount: reconciliation.mismatchCount,
        mismatches: reconciliation.mismatches.slice(0, 20)
      },
      orphans
    });
  }
  return {
    schema,
    counts,
    totalRows: totalRows(counts),
    populatedTables: Object.values(counts).filter(value => value > 0).length,
    databaseHash: reconciliation.databaseHash,
    mismatchCount: reconciliation.mismatchCount,
    orphanCount: orphans,
    invariants
  };
}

async function verifyOnly(options, plan) {
  const connection = await openConnection(options, { readOnly: true });
  try {
    await connection.beginTransaction();
    const schema = await schemaSnapshot(connection);
    const counts = await tableCounts(connection);
    const witnesses = await otherDatabaseWitnesses(connection, options.container);
    let reconciliation = null;
    if (totalRows(counts) > 0) reconciliation = await validationSnapshot(connection, plan.model);
    await connection.rollback();
    return {
      mode: "verify-only",
      status: "verified",
      planHash: plan.result.deterministicHash,
      warnings: plan.result.warnings,
      schema,
      counts,
      totalRows: totalRows(counts),
      populatedTables: Object.values(counts).filter(value => value > 0).length,
      reconciliation,
      witnesses
    };
  } finally {
    await connection.end();
  }
}

let activeConnection = null;
let handlingSignal = false;

async function emergencyRollback(signal) {
  if (handlingSignal) return;
  handlingSignal = true;
  try {
    if (activeConnection) {
      await activeConnection.rollback();
      await activeConnection.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
      await activeConnection.end();
    }
  } finally {
    console.error(`MIGRATION_INTERRUPTED ${signal}: transaction rolled back`);
    process.exit(130);
  }
}

async function applyOrRollback(options, plan) {
  const backup = verifyBackup(options.backupFile);
  const connection = await openConnection(options);
  activeConnection = connection;
  let lockAcquired = false;
  let transactionStarted = false;
  const witnessesBefore = await otherDatabaseWitnesses(connection, options.container);
  try {
    await schemaSnapshot(connection);
    const [lockRows] = await connection.query("SELECT GET_LOCK(?, 10) AS acquired", [LOCK_NAME]);
    if (Number(lockRows[0].acquired) !== 1) {
      throw new MigrationError("LOCK_NOT_ACQUIRED", "The migration lock could not be acquired.");
    }
    lockAcquired = true;
    const beforeCounts = await tableCounts(connection);
    if (totalRows(beforeCounts) !== 0) {
      let current = null;
      try {
        current = await validationSnapshot(connection, plan.model);
      } catch (error) {
        current = { validationError: error.code || error.message };
      }
      throw new MigrationError(
        "DESTINATION_NOT_EMPTY",
        "The destination is not empty; initial import refused without writing.",
        {
          totalRows: totalRows(beforeCounts),
          counts: beforeCounts,
          databaseHash: current?.databaseHash || null,
          reconciliation: current
        }
      );
    }
    await connection.beginTransaction();
    transactionStarted = true;
    const immediateCounts = await tableCounts(connection);
    if (totalRows(immediateCounts) !== 0) {
      throw new MigrationError("DESTINATION_CHANGED", "The destination changed after the migration lock.");
    }
    const insertedCounts = await insertPlan(connection, plan.model);
    const preCommit = await validationSnapshot(connection, plan.model);
    if (options.mode === "rollback-test") {
      throw new MigrationError(
        "CONTROLLED_ROLLBACK_TEST",
        "Controlled failure injected after successful pre-commit reconciliation."
      );
    }
    await connection.commit();
    transactionStarted = false;
    await connection.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
    lockAcquired = false;
    await connection.end();
    activeConnection = null;

    const postConnection = await openConnection(options, { readOnly: true });
    let postCommit;
    let witnessesAfter;
    try {
      await postConnection.beginTransaction();
      postCommit = await validationSnapshot(postConnection, plan.model);
      witnessesAfter = await otherDatabaseWitnesses(postConnection, options.container);
      await postConnection.rollback();
    } finally {
      await postConnection.end();
    }
    if (stableStringify(witnessesBefore) !== stableStringify(witnessesAfter)) {
      throw new MigrationError("OTHER_DATABASE_WITNESS_CHANGED", "An external database witness changed.", {
        before: witnessesBefore,
        after: witnessesAfter
      });
    }
    return {
      mode: "apply",
      status: "committed",
      planHash: plan.result.deterministicHash,
      warningCounts: plan.warningCounts,
      backup,
      beforeCounts,
      insertedCounts,
      preCommit,
      postCommit,
      witnessesBefore,
      witnessesAfter
    };
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }
    if (lockAcquired) {
      await connection.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
      lockAcquired = false;
    }
    await connection.end();
    activeConnection = null;
    if (error.code === "CONTROLLED_ROLLBACK_TEST") {
      const verificationConnection = await openConnection(options, { readOnly: true });
      try {
        await verificationConnection.beginTransaction();
        const afterCounts = await tableCounts(verificationConnection);
        await verificationConnection.rollback();
        if (totalRows(afterCounts) !== 0) {
          throw new MigrationError("ROLLBACK_TEST_FAILED", "The controlled rollback left persisted rows.", {
            counts: afterCounts
          });
        }
        return {
          mode: "rollback-test",
          status: "rolled-back",
          injectedError: error.code,
          planHash: plan.result.deterministicHash,
          backup,
          afterCounts,
          totalRowsAfterRollback: 0
        };
      } finally {
        await verificationConnection.end();
      }
    }
    throw error;
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.mode === "help") {
    console.log(helpText());
    return 0;
  }
  if (options.mode === "backup") {
    const backup = createBackup(options);
    console.log(`MIGRATION_RESULT_JSON=${stableStringify({
      mode: "backup",
      status: "created",
      database: options.database,
      backup
    })}`);
    return 0;
  }
  const plan = prepareValidatedPlan();
  const output = options.mode === "verify-only"
    ? await verifyOnly(options, plan)
    : await applyOrRollback(options, plan);
  console.log(`MIGRATION_RESULT_JSON=${stableStringify(output)}`);
  return 0;
}

export {
  APPLY_CONFIRMATION,
  EXPECTED_PLAN_HASH,
  FORBIDDEN_SQL,
  MigrationError,
  buildInsertStatement,
  parseArguments,
  prepareValidatedPlan,
  verifyBackup
};

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE) {
  process.once("SIGINT", () => { void emergencyRollback("SIGINT"); });
  process.once("SIGTERM", () => { void emergencyRollback("SIGTERM"); });
  try {
    process.exitCode = await main();
  } catch (error) {
    const output = {
      status: "failed",
      code: error.code || "MIGRATION_ERROR",
      message: error.message,
      context: error.context || {}
    };
    console.error(`MIGRATION_FAILED_JSON=${stableStringify(output)}`);
    process.exitCode = 1;
  }
}
