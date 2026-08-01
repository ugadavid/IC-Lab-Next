#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PROTOTYPE_DIRECTORY,
  TABLE_DEFINITIONS,
  stableStringify
} from "./001_proto05_json_to_mariadb_dry_run.mjs";
import {
  prepareValidatedPlan as prepareCorePlan,
  verifyBackup
} from "./003_proto05_json_to_mariadb_apply.mjs";
import { assertExplicitHistoricalTestDatabase } from "./historical-test-database-guard.mjs";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_FILE);
const TARGET_DATABASE = "ic_augmented_video";
const METADATA_TABLE = "data_projection_metadata";
const SCHEMA_FILE = path.join(
  SCRIPT_DIRECTORY,
  "004_proto05_document_metadata_schema.sql"
);
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
const EXPECTED_CORE_PLAN_HASH =
  "d2a76dace94e68cf1abea808902619a5d81fe99afda48aca0e48361fe6158233";
const EXPECTED_PLAN_HASH =
  "f266796b1e78ff06fcc30008d10119427bcd0ec2ebeea9716cc46cb5fc5c94bf";
const EXPECTED_SOURCE_SET_HASH =
  "a9c613242b38338dcb844a6a196015357d519c304a58eab09d6a0653c8f1afaa";
const INSTALL_CONFIRMATION = "INSTALL_PROTO05_DOCUMENT_METADATA_SCHEMA";
const APPLY_CONFIRMATION = "APPLY_PROTO05_DOCUMENT_METADATA";
const LOCK_NAME = "proto05:document-metadata:m136:v1";

const SOURCE_FILES = Object.freeze([
  {
    relativePath:
      "data/activities.20260716T205538855Z.before-original-copy-removal.json.bak",
    sha256:
      "862d270caf41fec4020b783f5650623bbb7981d414419ece08d604b3ed3afb47"
  },
  {
    relativePath: "data/activities.json",
    sha256:
      "95766c6256ace97a39f63760b2eb530183910113d8de6deff037d0b0f6d3d8c3"
  },
  {
    relativePath: "data/activities.json.bak",
    sha256:
      "cb024e557a12bc84bb155955ae5c5270b4464350ec2c42243ea68c66f9fb9976"
  },
  {
    relativePath: "data/activities.pre-language-catalog-0.1.12.json.bak",
    sha256:
      "35f780a52911b0aac69b0b887151844d4fc45fab42e75d3f4e2d90d4514b53bd"
  },
  {
    relativePath: "data/activity-library.json",
    sha256:
      "63ce330896759421397c987ccc685884ffb6e1c93663b68b7d3d6ead4c1c256a"
  },
  {
    relativePath: "data/activity-library.json.bak",
    sha256:
      "1426a224fb94fb54273a2aaf489d29036a24a775fa3c7941903f7dff8451ff65"
  },
  {
    relativePath: "data/backups/mission-102-video-library-0.1.json",
    sha256:
      "361305f679391fb8559c2958880ce9dcb5a0cf238a1c6371a2b3f6583cfd7a9b"
  },
  {
    relativePath: "data/video-catalog.json",
    sha256:
      "89a73a4065ab84ae1b676d25fbe62fd17feb0fb51302997b49999e68b05fe373"
  },
  {
    relativePath: "data/video-catalog.json.bak",
    sha256:
      "761410b2b5f1d981db3996d663f7d6f4b3225e56ea09e8641e297c5e27260172"
  },
  {
    relativePath: "data/video-library.json",
    sha256:
      "e98c9a4f051f09020e9227a37d60cf532fa446ba684b80bfb8505dbf3519d473"
  },
  {
    relativePath: "data/video-library.json.bak",
    sha256:
      "64079311a2fe741f7448d2415f8e74b866f976006f0fb88265f51d545431028a"
  },
  {
    relativePath: "server/package.json",
    sha256:
      "522ea570ac20703b10d66c4290dea2a0988e91c7a800133971eb136201f1d826"
  },
  {
    relativePath: "server/test/fixtures/layer-visibility.activity.json",
    sha256:
      "533556b24e33d49f746259ca9c072dbe4aee39df51ed0f1688e18395e03ecc39"
  },
  {
    relativePath:
      "server/test/fixtures/media-library-canonical.valid.json",
    sha256:
      "1593a0498a3f343ec0c2a1edaee5425bac3064cfde075ec113db5138e8291511"
  },
  {
    relativePath: "../../shared/reference-data/languages.json",
    sha256:
      "e3034a20260c6f77569966e3cc05618402362822b038cac4d491baee3afff355"
  }
]);

const DOCUMENTS = Object.freeze([
  {
    documentKey: "activities",
    relativePath: "data/activities.json",
    schemaVersionRequired: true,
    updatedAtRequired: true,
    exposed: true
  },
  {
    documentKey: "activity-library",
    relativePath: "data/activity-library.json",
    schemaVersionRequired: true,
    updatedAtRequired: true,
    exposed: true
  },
  {
    documentKey: "video-catalog",
    relativePath: "data/video-catalog.json",
    schemaVersionRequired: true,
    updatedAtRequired: false,
    exposed: false
  },
  {
    documentKey: "media-library",
    relativePath: "data/video-library.json",
    schemaVersionRequired: true,
    updatedAtRequired: true,
    exposed: true
  },
  {
    documentKey: "language-catalog",
    relativePath: "../../shared/reference-data/languages.json",
    schemaVersionRequired: false,
    updatedAtRequired: false,
    exposed: false
  }
]);

const FORBIDDEN_SQL = Object.freeze([
  /SET\s+FOREIGN_KEY_CHECKS\s*=\s*0/i,
  /INSERT\s+IGNORE/i,
  /REPLACE\s+INTO/i,
  /ON\s+DUPLICATE\s+KEY\s+UPDATE/i
]);

const require = createRequire(import.meta.url);
const mysql = require(MYSQL2_DIRECTORY);

class MetadataMigrationError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = "MetadataMigrationError";
    this.code = code;
    this.context = context;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value);
}

function assertSafeIdentifier(value, label) {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new MetadataMigrationError(
      "UNSAFE_IDENTIFIER",
      `${label} is not a safe SQL identifier.`,
      { value }
    );
  }
  return `\`${value}\``;
}

function strictIsoUtc(value, label) {
  if (
    typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.]\d{3}Z$/.test(value)
    || new Date(value).toISOString() !== value
  ) {
    throw new MetadataMigrationError(
      "INVALID_UTC_MILLISECOND_TIMESTAMP",
      `${label} must be an exact UTC ISO timestamp with milliseconds.`,
      { value }
    );
  }
  return value;
}

function isoToMariaUtc(value, label = "updatedAt") {
  return strictIsoUtc(value, label).replace("T", " ").slice(0, -1);
}

function mariaUtcToIso(value, label = "source_updated_at_utc") {
  if (
    typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[.]\d{3}$/.test(value)
  ) {
    throw new MetadataMigrationError(
      "DATABASE_TIMESTAMP_PRECISION_LOST",
      `${label} did not round-trip with millisecond precision.`,
      { value }
    );
  }
  return strictIsoUtc(`${value.replace(" ", "T")}Z`, label);
}

function readJson(relativePath, prototypeDirectory = DEFAULT_PROTOTYPE_DIRECTORY) {
  const file = path.resolve(prototypeDirectory, relativePath);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new MetadataMigrationError(
      "DOCUMENT_READ_FAILED",
      `Canonical document could not be read: ${relativePath}.`,
      { relativePath, reason: error.code || error.message }
    );
  }
  if (!isPlainObject(value)) {
    throw new MetadataMigrationError(
      "DOCUMENT_ROOT_INVALID",
      `Canonical document root must be an object: ${relativePath}.`
    );
  }
  return value;
}

function sourceFileSnapshot(
  prototypeDirectory = DEFAULT_PROTOTYPE_DIRECTORY,
  definitions = SOURCE_FILES
) {
  const files = definitions.map(definition => {
    const file = path.resolve(prototypeDirectory, definition.relativePath);
    const actual = sha256(fs.readFileSync(file));
    if (actual !== definition.sha256) {
      throw new MetadataMigrationError(
        "SOURCE_HASH_MISMATCH",
        `A protected source hash differs: ${definition.relativePath}.`,
        {
          relativePath: definition.relativePath,
          expected: definition.sha256,
          actual
        }
      );
    }
    return {
      relativePath: definition.relativePath.replaceAll("\\", "/"),
      sha256: actual
    };
  });
  const sourceSetHash = sha256(stableStringify(files));
  return { files, sourceSetHash };
}

function rootScalarProperties(document) {
  return Object.fromEntries(
    Object.entries(document).filter(([, value]) => (
      value === null
      || ["string", "number", "boolean"].includes(typeof value)
    ))
  );
}

function buildMetadataPlan(documentsByKey, sourceSnapshot) {
  const expectedKeys = DOCUMENTS.map(document => document.documentKey);
  const actualKeys = Object.keys(documentsByKey).sort();
  if (stableStringify(actualKeys) !== stableStringify([...expectedKeys].sort())) {
    throw new MetadataMigrationError(
      "DOCUMENT_SET_MISMATCH",
      "The canonical document set is incomplete or contains an unknown document.",
      { expectedKeys, actualKeys }
    );
  }

  const inventory = [];
  const rows = [];
  for (const definition of DOCUMENTS) {
    const document = documentsByKey[definition.documentKey];
    if (!isPlainObject(document)) {
      throw new MetadataMigrationError(
        "DOCUMENT_ROOT_INVALID",
        `Document ${definition.documentKey} is not an object.`
      );
    }
    const scalars = rootScalarProperties(document);
    const allowedScalars = new Set([
      ...(definition.schemaVersionRequired ? ["schemaVersion"] : []),
      ...(definition.updatedAtRequired ? ["updatedAt"] : [])
    ]);
    const unexpectedScalars = Object.keys(scalars).filter(
      property => !allowedScalars.has(property)
    );
    if (unexpectedScalars.length) {
      throw new MetadataMigrationError(
        "UNKNOWN_DOCUMENT_METADATA",
        `Document ${definition.documentKey} contains unknown root metadata.`,
        { unexpectedScalars }
      );
    }
    if (definition.schemaVersionRequired) {
      if (
        typeof document.schemaVersion !== "string"
        || !/^[0-9]+[.][0-9]+$/.test(document.schemaVersion)
      ) {
        throw new MetadataMigrationError(
          "INVALID_SCHEMA_VERSION",
          `Document ${definition.documentKey} has no valid schemaVersion.`
        );
      }
    } else if (Object.hasOwn(document, "schemaVersion")) {
      throw new MetadataMigrationError(
        "UNEXPECTED_SCHEMA_VERSION",
        `Document ${definition.documentKey} must not define schemaVersion.`
      );
    }
    if (definition.updatedAtRequired) {
      strictIsoUtc(document.updatedAt, `${definition.documentKey}.updatedAt`);
    } else if (Object.hasOwn(document, "updatedAt")) {
      throw new MetadataMigrationError(
        "UNEXPECTED_DOCUMENT_TIMESTAMP",
        `Document ${definition.documentKey} must not define updatedAt.`
      );
    }

    inventory.push({
      documentKey: definition.documentKey,
      sourceFile: definition.relativePath,
      rootKeys: Object.keys(document),
      scalarMetadata: scalars,
      exposed: definition.exposed
    });

    if (definition.schemaVersionRequired) {
      rows.push({
        documentKey: definition.documentKey,
        schemaVersion: document.schemaVersion,
        updatedAt: definition.updatedAtRequired ? document.updatedAt : null,
        sourceFile: definition.relativePath,
        sourcePaths: [
          "$.schemaVersion",
          ...(definition.updatedAtRequired ? ["$.updatedAt"] : [])
        ],
        database: {
          document_key: definition.documentKey,
          schema_version: document.schemaVersion,
          source_updated_at_utc: definition.updatedAtRequired
            ? isoToMariaUtc(
              document.updatedAt,
              `${definition.documentKey}.updatedAt`
            )
            : null
        }
      });
    }
  }

  rows.sort((left, right) => left.documentKey.localeCompare(right.documentKey));
  const payload = {
    contractVersion: "1",
    targetDatabase: TARGET_DATABASE,
    sourceSetHash: sourceSnapshot.sourceSetHash,
    rows
  };
  return {
    inventory,
    rows,
    totalDocuments: inventory.length,
    rowsPlanned: rows.length,
    deterministicHash: sha256(stableStringify(payload)),
    sourceSetHash: sourceSnapshot.sourceSetHash,
    payload
  };
}

function prepareMetadataPlan(
  prototypeDirectory = DEFAULT_PROTOTYPE_DIRECTORY
) {
  const core = prepareCorePlan();
  if (core.result.deterministicHash !== EXPECTED_CORE_PLAN_HASH) {
    throw new MetadataMigrationError(
      "CORE_PLAN_HASH_MISMATCH",
      "The Mission 134 core plan hash changed.",
      { actual: core.result.deterministicHash }
    );
  }
  const sourceSnapshot = sourceFileSnapshot(prototypeDirectory);
  const documentsByKey = Object.fromEntries(
    DOCUMENTS.map(definition => [
      definition.documentKey,
      readJson(definition.relativePath, prototypeDirectory)
    ])
  );
  const plan = buildMetadataPlan(documentsByKey, sourceSnapshot);
  if (
    EXPECTED_SOURCE_SET_HASH !== "PENDING_SOURCE_SET_HASH"
    && sourceSnapshot.sourceSetHash !== EXPECTED_SOURCE_SET_HASH
  ) {
    throw new MetadataMigrationError(
      "SOURCE_SET_HASH_MISMATCH",
      "The protected fifteen-file source set hash changed.",
      {
        expected: EXPECTED_SOURCE_SET_HASH,
        actual: sourceSnapshot.sourceSetHash
      }
    );
  }
  if (
    EXPECTED_PLAN_HASH !== "PENDING_METADATA_PLAN_HASH"
    && plan.deterministicHash !== EXPECTED_PLAN_HASH
  ) {
    throw new MetadataMigrationError(
      "PLAN_HASH_MISMATCH",
      "The document metadata plan hash changed.",
      { expected: EXPECTED_PLAN_HASH, actual: plan.deterministicHash }
    );
  }
  return { ...plan, sourceFiles: sourceSnapshot.files };
}

function parseArguments(argv) {
  const options = {
    mode: "dry-run",
    database: null,
    expectedPlanHash: null,
    expectedSourceSetHash: null,
    confirmation: null,
    backupFile: null,
    container: DEFAULT_CONTAINER
  };
  let explicitMode = false;
  let explicitDatabase = false;
  for (const argument of argv) {
    if (
      [
        "--dry-run",
        "--verify-only",
        "--install-schema",
        "--rollback-test",
        "--apply"
      ].includes(argument)
    ) {
      if (explicitMode) {
        throw new MetadataMigrationError(
          "ARGUMENT_CONFLICT",
          "Only one mode may be selected."
        );
      }
      explicitMode = true;
      options.mode = argument.slice(2);
    } else if (argument.startsWith("--database=")) {
      options.database = argument.slice("--database=".length);
      explicitDatabase = true;
    } else if (argument.startsWith("--expected-plan-hash=")) {
      options.expectedPlanHash = argument.slice("--expected-plan-hash=".length);
    } else if (argument.startsWith("--expected-source-set-hash=")) {
      options.expectedSourceSetHash = argument.slice(
        "--expected-source-set-hash=".length
      );
    } else if (argument.startsWith("--confirm=")) {
      options.confirmation = argument.slice("--confirm=".length);
    } else if (argument.startsWith("--backup-file=")) {
      options.backupFile = path.resolve(argument.slice("--backup-file=".length));
    } else if (argument.startsWith("--container=")) {
      options.container = argument.slice("--container=".length);
    } else if (argument === "--help") {
      options.mode = "help";
    } else {
      throw new MetadataMigrationError(
        "UNKNOWN_ARGUMENT",
        `Unknown argument: ${argument}`
      );
    }
  }
  if (options.mode !== "help") {
    options.database = assertExplicitHistoricalTestDatabase(options.database, { explicit: explicitDatabase });
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(options.container)) {
    throw new MetadataMigrationError(
      "INVALID_CONTAINER",
      "The Docker container name is invalid."
    );
  }
  if (["install-schema", "rollback-test", "apply"].includes(options.mode)) {
    if (options.expectedPlanHash !== EXPECTED_PLAN_HASH) {
      throw new MetadataMigrationError(
        "EXPECTED_PLAN_HASH_REQUIRED",
        "The exact validated document plan hash is required."
      );
    }
    if (options.expectedSourceSetHash !== EXPECTED_SOURCE_SET_HASH) {
      throw new MetadataMigrationError(
        "EXPECTED_SOURCE_SET_HASH_REQUIRED",
        "The exact protected fifteen-file source set hash is required."
      );
    }
    const expectedConfirmation = options.mode === "install-schema"
      ? INSTALL_CONFIRMATION
      : APPLY_CONFIRMATION;
    if (options.confirmation !== expectedConfirmation) {
      throw new MetadataMigrationError(
        "EXPLICIT_CONFIRMATION_REQUIRED",
        `Write intent requires --confirm=${expectedConfirmation}.`
      );
    }
    if (!options.backupFile) {
      throw new MetadataMigrationError(
        "BACKUP_REQUIRED",
        "A verified pre-DDL backup is required."
      );
    }
  }
  return options;
}

function helpText() {
  return [
    "Usage:",
    "  node 005_proto05_document_metadata_migration.mjs --dry-run --database=proto05_test_NAME",
    "  node 005_proto05_document_metadata_migration.mjs --verify-only --database=proto05_test_NAME",
    "  node 005_proto05_document_metadata_migration.mjs --install-schema",
    "  node 005_proto05_document_metadata_migration.mjs --rollback-test",
    "  node 005_proto05_document_metadata_migration.mjs --apply",
    "",
    "Write-capable modes require:",
    "  --database=proto05_test_NAME (la base réelle est toujours refusée)",
    `  --expected-plan-hash=${EXPECTED_PLAN_HASH}`,
    `  --expected-source-set-hash=${EXPECTED_SOURCE_SET_HASH}`,
    "  --backup-file=ABSOLUTE_PATH",
    `  --confirm=${INSTALL_CONFIRMATION} (schema installation)`,
    `  --confirm=${APPLY_CONFIRMATION} (rollback-test/apply)`,
    "",
    "No password argument is supported."
  ].join("\n");
}

function readContainerRootPassword(container) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      container,
      "sh",
      "-c",
      'printf %s "$MARIADB_ROOT_PASSWORD"'
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024
    }
  );
  if (result.status !== 0 || !result.stdout) {
    throw new MetadataMigrationError(
      "DATABASE_CREDENTIAL_UNAVAILABLE",
      "The MariaDB credential could not be obtained from the container."
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
  await connection.query("SET SESSION time_zone = '+00:00'");
  if (readOnly) await connection.query("SET SESSION TRANSACTION READ ONLY");
  return connection;
}

async function selectedDatabase(connection) {
  const [[row]] = await connection.query("SELECT DATABASE() AS database_name");
  return row.database_name;
}

async function schemaCounts(connection) {
  const databaseName = await selectedDatabase(connection);
  const [[row]] = await connection.query(
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
          AND ENGINE <> 'InnoDB') AS non_innodb` ,
    Array(7).fill(databaseName)
  );
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)])
  );
}

function expectedSchemaCounts(metadataInstalled) {
  return {
    tables_count: metadataInstalled ? 32 : 31,
    procedures_count: 43,
    fk_count: 48,
    checks_count: metadataInstalled ? 68 : 65,
    triggers_count: 0,
    events_count: 0,
    non_innodb: 0
  };
}

async function metadataTableExists(connection) {
  const databaseName = await selectedDatabase(connection);
  const [[row]] = await connection.query(
    `SELECT COUNT(*) AS table_count
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND TABLE_TYPE = 'BASE TABLE'`,
    [databaseName, METADATA_TABLE]
  );
  return Number(row.table_count) === 1;
}

async function assertSchemaCounts(connection, metadataInstalled) {
  const actual = await schemaCounts(connection);
  const expected = expectedSchemaCounts(metadataInstalled);
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new MetadataMigrationError(
      "SCHEMA_COUNT_MISMATCH",
      "The installed schema counts do not match the expected revision.",
      { expected, actual }
    );
  }
  return actual;
}

async function assertMetadataTableDefinition(connection) {
  const databaseName = await selectedDatabase(connection);
  if (!await metadataTableExists(connection)) {
    throw new MetadataMigrationError(
      "METADATA_TABLE_MISSING",
      `${METADATA_TABLE} is not installed.`
    );
  }
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE,
            CHARACTER_MAXIMUM_LENGTH, DATETIME_PRECISION
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [databaseName, METADATA_TABLE]
  );
  const normalizedColumns = columns.map(column => ({
    name: column.COLUMN_NAME,
    dataType: column.DATA_TYPE,
    columnType: column.COLUMN_TYPE,
    nullable: column.IS_NULLABLE,
    maxLength: column.CHARACTER_MAXIMUM_LENGTH === null
      ? null
      : Number(column.CHARACTER_MAXIMUM_LENGTH),
    dateTimePrecision: column.DATETIME_PRECISION === null
      ? null
      : Number(column.DATETIME_PRECISION)
  }));
  const expectedColumns = [
    {
      name: "document_key",
      dataType: "varchar",
      columnType: "varchar(64)",
      nullable: "NO",
      maxLength: 64,
      dateTimePrecision: null
    },
    {
      name: "schema_version",
      dataType: "varchar",
      columnType: "varchar(32)",
      nullable: "NO",
      maxLength: 32,
      dateTimePrecision: null
    },
    {
      name: "source_updated_at_utc",
      dataType: "datetime",
      columnType: "datetime(3)",
      nullable: "YES",
      maxLength: null,
      dateTimePrecision: 3
    }
  ];
  if (stableStringify(normalizedColumns) !== stableStringify(expectedColumns)) {
    throw new MetadataMigrationError(
      "METADATA_COLUMNS_MISMATCH",
      "The metadata table columns do not match migration 004.",
      { expected: expectedColumns, actual: normalizedColumns }
    );
  }

  const [primaryKey] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
     ORDER BY ORDINAL_POSITION`,
    [databaseName, METADATA_TABLE]
  );
  if (
    primaryKey.length !== 1
    || primaryKey[0].COLUMN_NAME !== "document_key"
  ) {
    throw new MetadataMigrationError(
      "METADATA_PRIMARY_KEY_MISMATCH",
      "The metadata table primary key is invalid."
    );
  }

  const [checks] = await connection.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.CHECK_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY CONSTRAINT_NAME`,
    [databaseName, METADATA_TABLE]
  );
  const actualChecks = checks.map(check => check.CONSTRAINT_NAME);
  const expectedChecks = [
    "chk_data_projection_document_key",
    "chk_data_projection_schema_version",
    "chk_data_projection_updated_at"
  ];
  if (stableStringify(actualChecks) !== stableStringify(expectedChecks)) {
    throw new MetadataMigrationError(
      "METADATA_CHECKS_MISMATCH",
      "The metadata table CHECK constraints are invalid.",
      { expected: expectedChecks, actual: actualChecks }
    );
  }

  const [[table]] = await connection.query(
    `SELECT ENGINE, TABLE_COLLATION
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [databaseName, METADATA_TABLE]
  );
  if (
    table.ENGINE !== "InnoDB"
    || table.TABLE_COLLATION !== "utf8mb4_unicode_ci"
  ) {
    throw new MetadataMigrationError(
      "METADATA_TABLE_STORAGE_MISMATCH",
      "The metadata table engine or collation is invalid.",
      table
    );
  }
  return {
    columns: normalizedColumns,
    primaryKey: ["document_key"],
    checks: actualChecks,
    engine: table.ENGINE,
    collation: table.TABLE_COLLATION
  };
}

function normalizeDatabaseValue(value) {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value.toString("hex");
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeDatabaseValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeDatabaseValue(item)
      ])
    );
  }
  return value;
}

async function coreContentSnapshot(connection) {
  const tables = {};
  for (const definition of [...TABLE_DEFINITIONS].sort(
    (left, right) => left.name.localeCompare(right.name)
  )) {
    const table = assertSafeIdentifier(definition.name, "table");
    const order = definition.pk
      .map(column => assertSafeIdentifier(column, "primary-key column"))
      .join(", ");
    const [rows] = await connection.query(
      `SELECT * FROM ${table} ORDER BY ${order}`
    );
    tables[definition.name] = rows.map(normalizeDatabaseValue);
  }
  const counts = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [table, rows.length])
  );
  return {
    counts,
    totalRows: Object.values(counts).reduce((sum, count) => sum + count, 0),
    populatedTables: Object.values(counts).filter(count => count > 0).length,
    hash: sha256(stableStringify(tables))
  };
}

function dataDumpHash(database, container = DEFAULT_CONTAINER) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      container,
      "sh",
      "-c",
      'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --no-create-info --skip-triggers --compact --skip-comments --skip-dump-date --skip-extended-insert --order-by-primary --default-character-set=utf8mb4 "$1"',
      "proto05-witness",
      database
    ],
    {
      encoding: null,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024
    }
  );
  if (result.status !== 0) {
    throw new MetadataMigrationError(
      "WITNESS_DUMP_FAILED",
      `Could not read the ${database} witness.`
    );
  }
  return sha256(result.stdout);
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

function buildInsertStatement() {
  const sql =
    "INSERT INTO `data_projection_metadata` "
    + "(`document_key`, `schema_version`, `source_updated_at_utc`) "
    + "VALUES (?, ?, ?)";
  if (FORBIDDEN_SQL.some(pattern => pattern.test(sql))) {
    throw new MetadataMigrationError(
      "FORBIDDEN_SQL",
      "Generated SQL contains a forbidden construct."
    );
  }
  return sql;
}

function assertDestinationEmpty(rowCount) {
  if (Number(rowCount) !== 0) {
    throw new MetadataMigrationError(
      "DESTINATION_NOT_EMPTY",
      "Document metadata import refused because the destination is not empty.",
      { rowCount: Number(rowCount) }
    );
  }
}

async function readMetadataRows(connection) {
  const [rows] = await connection.query(
    `SELECT document_key, schema_version,
            DATE_FORMAT(
              source_updated_at_utc,
              '%Y-%m-%d %H:%i:%s.%f'
            ) AS source_updated_at_utc
     FROM data_projection_metadata
     ORDER BY document_key`
  );
  return rows.map(row => ({
    document_key: row.document_key,
    schema_version: row.schema_version,
    source_updated_at_utc: row.source_updated_at_utc === null
      ? null
      : row.source_updated_at_utc.slice(0, 23)
  }));
}

function metadataProjection(rows) {
  return rows.map(row => ({
    documentKey: row.document_key,
    schemaVersion: row.schema_version,
    updatedAtPresent: row.source_updated_at_utc !== null,
    updatedAt: row.source_updated_at_utc === null
      ? null
      : mariaUtcToIso(
        row.source_updated_at_utc,
        `${row.document_key}.source_updated_at_utc`
      )
  }));
}

function expectedProjection(plan) {
  return plan.rows.map(row => ({
    documentKey: row.documentKey,
    schemaVersion: row.schemaVersion,
    updatedAtPresent: row.updatedAt !== null,
    updatedAt: row.updatedAt
  }));
}

function reconcileMetadata(plan, rows) {
  const expected = expectedProjection(plan);
  const actual = metadataProjection(rows);
  const differences = [];
  const expectedById = new Map(expected.map(row => [row.documentKey, row]));
  const actualById = new Map(actual.map(row => [row.documentKey, row]));
  for (const documentKey of new Set([
    ...expectedById.keys(),
    ...actualById.keys()
  ])) {
    const expectedRow = expectedById.get(documentKey);
    const actualRow = actualById.get(documentKey);
    if (!expectedRow) {
      differences.push({
        documentKey,
        property: "$",
        code: "EXTRA_DOCUMENT",
        expected: null,
        actual: actualRow
      });
      continue;
    }
    if (!actualRow) {
      differences.push({
        documentKey,
        property: "$",
        code: "MISSING_DOCUMENT",
        expected: expectedRow,
        actual: null
      });
      continue;
    }
    for (const property of [
      "schemaVersion",
      "updatedAtPresent",
      "updatedAt"
    ]) {
      if (actualRow[property] !== expectedRow[property]) {
        differences.push({
          documentKey,
          property,
          code: "VALUE_MISMATCH",
          expected: expectedRow[property],
          actual: actualRow[property]
        });
      }
    }
  }
  return {
    expected,
    actual,
    differences,
    missingDocuments: differences.filter(
      difference => difference.code === "MISSING_DOCUMENT"
    ).length,
    extraDocuments: differences.filter(
      difference => difference.code === "EXTRA_DOCUMENT"
    ).length,
    missingProperties: 0,
    extraProperties: 0,
    divergentValues: differences.filter(
      difference => difference.code === "VALUE_MISMATCH"
    ).length,
    precisionLosses: differences.filter(
      difference => (
        difference.property === "updatedAt"
        && difference.code === "VALUE_MISMATCH"
      )
    ).length,
    databaseHash: sha256(stableStringify(rows))
  };
}

function assertReconciled(reconciliation) {
  if (reconciliation.differences.length !== 0) {
    throw new MetadataMigrationError(
      "METADATA_RECONCILIATION_FAILED",
      "Document metadata differs from the deterministic plan.",
      { differences: reconciliation.differences }
    );
  }
  return reconciliation;
}

function readCreateTableStatement() {
  const sql = fs.readFileSync(SCHEMA_FILE, "utf8");
  if (FORBIDDEN_SQL.some(pattern => pattern.test(sql))) {
    throw new MetadataMigrationError(
      "FORBIDDEN_SCHEMA_SQL",
      "Schema migration contains a forbidden SQL construct."
    );
  }
  const match = sql.match(
    /CREATE TABLE data_projection_metadata\s*\([\s\S]+?\)\s*ENGINE=InnoDB[\s\S]+?;/
  );
  if (!match) {
    throw new MetadataMigrationError(
      "SCHEMA_STATEMENT_MISSING",
      "Migration 004 does not contain the expected CREATE TABLE."
    );
  }
  return match[0];
}

async function acquireLock(connection) {
  const [[row]] = await connection.execute(
    "SELECT GET_LOCK(?, 10) AS acquired",
    [LOCK_NAME]
  );
  if (Number(row.acquired) !== 1) {
    throw new MetadataMigrationError(
      "LOCK_NOT_ACQUIRED",
      "The document metadata migration lock could not be acquired."
    );
  }
}

async function releaseLock(connection) {
  try {
    await connection.execute("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
  } catch {
    // The connection close also releases the named lock.
  }
}

function verifyBackupForMission(backupFile) {
  try {
    return verifyBackup(backupFile);
  } catch (error) {
    throw new MetadataMigrationError(
      "BACKUP_UNVERIFIED",
      "The required pre-DDL backup is absent or unverifiable.",
      { reason: error.code || error.message }
    );
  }
}

async function verifyCoreSnapshot(connection) {
  const snapshot = await coreContentSnapshot(connection);
  if (snapshot.totalRows !== 264 || snapshot.populatedTables !== 27) {
    throw new MetadataMigrationError(
      "CORE_CONTENT_MISMATCH",
      "The historical 31-table core no longer contains 264 rows in 27 tables.",
      snapshot
    );
  }
  return snapshot;
}

async function installSchema(options, plan) {
  const backup = verifyBackupForMission(options.backupFile);
  const connection = await openConnection(options);
  let locked = false;
  try {
    const installed = await metadataTableExists(connection);
    if (installed) {
      const schema = await assertSchemaCounts(connection, true);
      const definition = await assertMetadataTableDefinition(connection);
      return {
        mode: "install-schema",
        status: "already-installed",
        planHash: plan.deterministicHash,
        backup,
        schema,
        definition
      };
    }

    const schemaBefore = await assertSchemaCounts(connection, false);
    const coreBefore = await verifyCoreSnapshot(connection);
    const witnessesBefore = await otherDatabaseWitnesses(
      connection,
      options.container
    );
    await acquireLock(connection);
    locked = true;
    await connection.query(readCreateTableStatement());

    const schemaAfter = await assertSchemaCounts(connection, true);
    const definition = await assertMetadataTableDefinition(connection);
    const coreAfter = await verifyCoreSnapshot(connection);
    const witnessesAfter = await otherDatabaseWitnesses(
      connection,
      options.container
    );
    if (coreAfter.hash !== coreBefore.hash) {
      throw new MetadataMigrationError(
        "CORE_CHANGED_DURING_DDL",
        "Historical business rows changed during schema installation.",
        { before: coreBefore.hash, after: coreAfter.hash }
      );
    }
    if (stableStringify(witnessesAfter) !== stableStringify(witnessesBefore)) {
      throw new MetadataMigrationError(
        "OTHER_DATABASE_CHANGED",
        "An out-of-scope database witness changed during schema installation.",
        { before: witnessesBefore, after: witnessesAfter }
      );
    }
    return {
      mode: "install-schema",
      status: "installed",
      ddlTransactional: false,
      planHash: plan.deterministicHash,
      backup,
      schemaBefore,
      schemaAfter,
      definition,
      coreBefore,
      coreAfter,
      witnessesBefore,
      witnessesAfter
    };
  } finally {
    if (locked) await releaseLock(connection);
    await connection.end();
  }
}

async function verifyInstalledState(options, plan) {
  const connection = await openConnection(options, { readOnly: true });
  try {
    const schema = await assertSchemaCounts(connection, true);
    const definition = await assertMetadataTableDefinition(connection);
    const core = await verifyCoreSnapshot(connection);
    const rows = await readMetadataRows(connection);
    const reconciliation = rows.length
      ? reconcileMetadata(plan, rows)
      : null;
    if (reconciliation) assertReconciled(reconciliation);
    const witnesses = await otherDatabaseWitnesses(
      connection,
      options.container
    );
    return {
      mode: "verify-only",
      status: "verified",
      schema,
      definition,
      core,
      rows: rows.length,
      reconciliation,
      totalRows: core.totalRows + rows.length,
      populatedTables: core.populatedTables + (rows.length ? 1 : 0),
      databaseHash: sha256(stableStringify({
        coreHash: core.hash,
        metadataRows: rows
      })),
      witnesses
    };
  } finally {
    await connection.end();
  }
}

async function applyOrRollback(options, plan) {
  const backup = verifyBackupForMission(options.backupFile);
  const connection = await openConnection(options);
  let locked = false;
  let transactionOpen = false;
  const witnessesBefore = await otherDatabaseWitnesses(
    connection,
    options.container
  );
  const coreBefore = await verifyCoreSnapshot(connection);
  try {
    await assertSchemaCounts(connection, true);
    await assertMetadataTableDefinition(connection);
    await acquireLock(connection);
    locked = true;
    await connection.beginTransaction();
    transactionOpen = true;

    const [[countRow]] = await connection.query(
      "SELECT COUNT(*) AS row_count FROM data_projection_metadata"
    );
    if (Number(countRow.row_count) !== 0) {
      const currentRows = await readMetadataRows(connection);
      const current = reconcileMetadata(plan, currentRows);
      throw new MetadataMigrationError(
        "DESTINATION_NOT_EMPTY",
        "Document metadata import refused before writing.",
        {
          rowCount: Number(countRow.row_count),
          databaseHash: current.databaseHash,
          differences: current.differences
        }
      );
    }
    assertDestinationEmpty(countRow.row_count);

    const sql = buildInsertStatement();
    for (const row of plan.rows) {
      await connection.execute(sql, [
        row.database.document_key,
        row.database.schema_version,
        row.database.source_updated_at_utc
      ]);
    }

    const insertedRows = await readMetadataRows(connection);
    const preCommit = assertReconciled(
      reconcileMetadata(plan, insertedRows)
    );
    const coreDuring = await verifyCoreSnapshot(connection);
    if (coreDuring.hash !== coreBefore.hash) {
      throw new MetadataMigrationError(
        "CORE_CHANGED_BEFORE_COMMIT",
        "Historical business rows changed inside the metadata transaction.",
        { before: coreBefore.hash, during: coreDuring.hash }
      );
    }

    if (options.mode === "rollback-test") {
      throw new MetadataMigrationError(
        "CONTROLLED_ROLLBACK_TEST",
        "Controlled rollback requested after successful reconciliation.",
        { preCommit }
      );
    }

    await connection.commit();
    transactionOpen = false;
    await releaseLock(connection);
    locked = false;
    await connection.end();

    const postCommit = await verifyInstalledState(options, plan);
    if (postCommit.core.hash !== coreBefore.hash) {
      throw new MetadataMigrationError(
        "CORE_CHANGED_AFTER_COMMIT",
        "Historical business rows changed after metadata commit.",
        { before: coreBefore.hash, after: postCommit.core.hash }
      );
    }
    if (
      stableStringify(postCommit.witnesses)
      !== stableStringify(witnessesBefore)
    ) {
      throw new MetadataMigrationError(
        "OTHER_DATABASE_CHANGED",
        "An out-of-scope database witness changed.",
        { before: witnessesBefore, after: postCommit.witnesses }
      );
    }
    return {
      mode: "apply",
      status: "committed",
      planHash: plan.deterministicHash,
      sourceSetHash: plan.sourceSetHash,
      backup,
      insertedRows: plan.rows.length,
      preCommit,
      postCommit
    };
  } catch (error) {
    if (transactionOpen) {
      await connection.rollback();
      transactionOpen = false;
    }
    if (locked) {
      await releaseLock(connection);
      locked = false;
    }
    await connection.end();

    if (error.code === "CONTROLLED_ROLLBACK_TEST") {
      const afterRollback = await verifyInstalledState(options, plan);
      if (afterRollback.rows !== 0) {
        throw new MetadataMigrationError(
          "ROLLBACK_FAILED",
          "The controlled rollback left document metadata rows.",
          { rows: afterRollback.rows }
        );
      }
      if (afterRollback.core.hash !== coreBefore.hash) {
        throw new MetadataMigrationError(
          "CORE_CHANGED_AFTER_ROLLBACK",
          "Historical business rows changed during rollback test.",
          { before: coreBefore.hash, after: afterRollback.core.hash }
        );
      }
      if (
        stableStringify(afterRollback.witnesses)
        !== stableStringify(witnessesBefore)
      ) {
        throw new MetadataMigrationError(
          "OTHER_DATABASE_CHANGED",
          "An out-of-scope database witness changed during rollback test."
        );
      }
      return {
        mode: "rollback-test",
        status: "rolled-back",
        controlledError: error.code,
        planHash: plan.deterministicHash,
        backup,
        preRollback: error.context.preCommit,
        afterRollback
      };
    }
    throw error;
  }
}

function dryRunResult(plan) {
  return {
    mode: "dry-run",
    status: "valid",
    targetDatabase: TARGET_DATABASE,
    documentsInventoried: plan.totalDocuments,
    rowsPlanned: plan.rowsPlanned,
    sourceFilesProtected: plan.sourceFiles.length,
    sourceSetHash: plan.sourceSetHash,
    deterministicHash: plan.deterministicHash,
    corePlanHash: EXPECTED_CORE_PLAN_HASH,
    warnings: 0,
    inventory: plan.inventory,
    rows: plan.rows
  };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.mode === "help") {
    console.log(helpText());
    return 0;
  }
  const plan = prepareMetadataPlan();
  let result;
  if (options.mode === "dry-run") {
    result = dryRunResult(plan);
  } else if (options.mode === "install-schema") {
    result = await installSchema(options, plan);
  } else if (options.mode === "verify-only") {
    result = await verifyInstalledState(options, plan);
  } else {
    result = await applyOrRollback(options, plan);
  }
  console.log(`DOCUMENT_METADATA_RESULT_JSON=${stableStringify(result)}`);
  return 0;
}

export {
  APPLY_CONFIRMATION,
  DOCUMENTS,
  EXPECTED_CORE_PLAN_HASH,
  EXPECTED_PLAN_HASH,
  EXPECTED_SOURCE_SET_HASH,
  FORBIDDEN_SQL,
  INSTALL_CONFIRMATION,
  MetadataMigrationError,
  SOURCE_FILES,
  assertDestinationEmpty,
  buildInsertStatement,
  buildMetadataPlan,
  dryRunResult,
  expectedProjection,
  isoToMariaUtc,
  mariaUtcToIso,
  metadataProjection,
  parseArguments,
  prepareMetadataPlan,
  reconcileMetadata,
  sourceFileSnapshot,
  strictIsoUtc
};

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(`DOCUMENT_METADATA_FAILED_JSON=${stableStringify({
      status: "failed",
      code: error.code || "DOCUMENT_METADATA_ERROR",
      message: error.message,
      context: error.context || {}
    })}`);
    process.exitCode = 1;
  }
}
