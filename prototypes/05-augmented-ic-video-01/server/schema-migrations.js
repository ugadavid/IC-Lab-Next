"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SCHEMA_MANIFEST_FORMAT = 1;
const RUNNER_VERSION = "1";
const REGISTRY_TABLE = "schema_migrations";
const DEFAULT_LOCK_TIMEOUT_SECONDS = 10;

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function schemaFingerprint(manifest) {
  return sha256(stableJson(manifest));
}

function migrationError(message, code, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

function normalizedText(value) {
  return String(value).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trimEnd() + "\n";
}

function safeSourcePath(manifestDirectory, prototypeDirectory, relativePath) {
  const target = path.resolve(manifestDirectory, relativePath);
  const root = path.resolve(prototypeDirectory) + path.sep;
  if (!target.startsWith(root)) {
    throw migrationError("Une source de migration sort du prototype.", "PROTO05_MIGRATION_SOURCE_INVALID");
  }
  return target;
}

function selectedSourceText(source, manifestDirectory, prototypeDirectory) {
  const target = safeSourcePath(manifestDirectory, prototypeDirectory, source.path);
  let text;
  try {
    text = normalizedText(fs.readFileSync(target, "utf8"));
  } catch (cause) {
    throw migrationError(
      `La source de migration est introuvable : ${source.path}.`,
      "PROTO05_MIGRATION_SOURCE_MISSING",
      { cause }
    );
  }
  if (source.beforeDelimiter) {
    const marker = "DELIMITER $$";
    const index = text.indexOf(marker);
    if (index < 0) {
      throw migrationError(
        `La frontière DDL attendue est absente de ${source.path}.`,
        "PROTO05_MIGRATION_SOURCE_INVALID"
      );
    }
    text = text.slice(0, index);
  }
  if (source.afterDelimiter) {
    const marker = "DELIMITER $$";
    const index = text.indexOf(marker);
    if (index < 0) {
      throw migrationError(
        `La frontière de routines attendue est absente de ${source.path}.`,
        "PROTO05_MIGRATION_SOURCE_INVALID"
      );
    }
    text = text.slice(index);
  }
  return { target, text: normalizedText(text) };
}

function splitSqlStatements(sql) {
  const statements = [];
  let buffer = "";
  let delimiter = ";";
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (!quote && (index === 0 || sql[index - 1] === "\n")) {
      const delimiterMatch = /^[ \t]*DELIMITER[ \t]+(\S+)[ \t]*(?:\n|$)/i.exec(sql.slice(index));
      if (delimiterMatch) {
        if (buffer.trim()) {
          throw migrationError("Un changement de délimiteur coupe une instruction SQL.", "PROTO05_MIGRATION_SQL_INVALID");
        }
        delimiter = delimiterMatch[1];
        index += delimiterMatch[0].length - 1;
        continue;
      }
    }
    if (!quote && character === "-" && next === "-" && /\s/.test(sql[index + 2] || "")) {
      lineComment = true;
      index += 1;
      continue;
    }
    if (!quote && character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (quote) {
      buffer += character;
      if (character === "\\" && quote !== "`") {
        if (next) { buffer += next; index += 1; }
      } else if (character === quote) {
        if (next === quote) { buffer += next; index += 1; }
        else quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      buffer += character;
      continue;
    }
    if (sql.startsWith(delimiter, index)) {
      const statement = buffer.trim();
      if (statement && !/^USE\s+/i.test(statement) && !/^SET\s+NAMES\s+/i.test(statement)) {
        statements.push(statement);
      }
      buffer = "";
      index += delimiter.length - 1;
      continue;
    }
    buffer += character;
  }
  if (quote || blockComment) {
    throw migrationError("Une chaîne ou un commentaire SQL n’est pas terminé.", "PROTO05_MIGRATION_SQL_INVALID");
  }
  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements;
}

function normalizeRoutineCreateStatement(value) {
  const sql = normalizedText(value)
    .replace(/^CREATE\s+DEFINER\s*=\s*(?:`[^`]*`|'[^']*'|[^\s]+)@(?:`[^`]*`|'[^']*'|[^\s]+)\s+/i, "CREATE ");
  let result = "";
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  let whitespace = false;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (lineComment) {
      if (character === "\n") { lineComment = false; whitespace = true; }
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") { blockComment = false; whitespace = true; index += 1; }
      continue;
    }
    if (!quote && character === "-" && next === "-" && /\s/.test(sql[index + 2] || "")) {
      lineComment = true;
      index += 1;
      continue;
    }
    if (!quote && character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (quote) {
      result += character;
      if (character === "\\" && quote !== "`") {
        if (next) { result += next; index += 1; }
      } else if (character === quote) {
        if (next === quote) { result += next; index += 1; }
        else quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      if (whitespace && result && !/\s$/.test(result)) result += " ";
      whitespace = false;
      quote = character;
      result += character;
      continue;
    }
    if (/\s/.test(character)) {
      whitespace = true;
      continue;
    }
    if (whitespace && result && !/\s$/.test(result)) result += " ";
    whitespace = false;
    result += character;
  }
  return result.trim();
}

function grantAllowsRoutineInspection(grantRows, databaseName) {
  const databaseTarget = `\`${String(databaseName).replaceAll("`", "``")}\`.*`.toLowerCase();
  return grantRows.some(row => {
    const statement = String(Object.values(row)[0] || "");
    const match = /^GRANT\s+(.+?)\s+ON\s+(.+?)\s+TO\s+/i.exec(statement);
    if (!match) return false;
    const privileges = match[1].split(",").map(value => value.trim().toUpperCase());
    const target = match[2].trim().toLowerCase();
    return (target === "*.*" && privileges.some(value => value === "ALL PRIVILEGES" || value === "SHOW CREATE ROUTINE"))
      || (target === databaseTarget && privileges.some(value => value === "ALL PRIVILEGES" || value === "SHOW CREATE ROUTINE"));
  });
}

function migrationContractPaths(prototypeDirectory, manifestPath = null) {
  const directory = path.join(prototypeDirectory, "database", "schema-migrations");
  return {
    directory,
    manifestPath: manifestPath || path.join(directory, "manifest.json")
  };
}

const SCHEMA_COLLECTIONS = Object.freeze([
  "tables",
  "columns",
  "indexes",
  "tableConstraints",
  "keyColumns",
  "foreignKeys",
  "checks",
  "views",
  "routines",
  "routineParameters",
  "triggers",
  "events"
]);

function assertSchemaManifestShape(manifest) {
  if (manifest?.formatVersion !== SCHEMA_MANIFEST_FORMAT
      || !manifest.databaseDefaults
      || typeof manifest.databaseDefaults !== "object"
      || SCHEMA_COLLECTIONS.some(collection => !Array.isArray(manifest[collection]))) {
    throw migrationError("Le manifeste de schéma attendu est invalide.", "PROTO05_SCHEMA_MANIFEST_INVALID");
  }
}

function loadMigrationContract(prototypeDirectory, { manifestPath = null } = {}) {
  const paths = migrationContractPaths(prototypeDirectory, manifestPath);
  const document = JSON.parse(fs.readFileSync(paths.manifestPath, "utf8"));
  if (document.contractVersion !== 1 || !Array.isArray(document.migrations) || document.migrations.length === 0) {
    throw migrationError("Le manifeste de migrations est invalide.", "PROTO05_MIGRATION_MANIFEST_INVALID");
  }
  const versions = new Set();
  const checksums = new Set();
  const migrations = document.migrations.map((entry, index) => {
    if (!/^\d{3,}$/.test(entry.version) || versions.has(entry.version)) {
      throw migrationError("Les versions de migration doivent être ordonnées et uniques.", "PROTO05_MIGRATION_MANIFEST_INVALID");
    }
    if (index > 0 && document.migrations[index - 1].version >= entry.version) {
      throw migrationError("L’ordre des migrations est incohérent.", "PROTO05_MIGRATION_MANIFEST_INVALID");
    }
    if (typeof entry.description !== "string" || !entry.description.trim() || entry.description.length > 255) {
      throw migrationError("La description d’une migration est invalide.", "PROTO05_MIGRATION_MANIFEST_INVALID");
    }
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      throw migrationError("Une migration ne possède aucune source SQL.", "PROTO05_MIGRATION_MANIFEST_INVALID");
    }
    versions.add(entry.version);
    const selected = entry.sources.map(source => selectedSourceText(
      source,
      paths.directory,
      prototypeDirectory
    ));
    const sql = selected.map((item, sourceIndex) => (
      `-- source ${entry.sources[sourceIndex].path}\n${item.text}`
    )).join("\n");
    const statements = splitSqlStatements(sql);
    if (statements.length === 0) {
      throw migrationError("Une migration ne contient aucune instruction SQL.", "PROTO05_MIGRATION_MANIFEST_INVALID");
    }
    const checksum = sha256(normalizedText(sql));
    if (checksums.has(checksum)) {
      throw migrationError("Deux migrations possèdent le même contenu canonique.", "PROTO05_MIGRATION_MANIFEST_INVALID");
    }
    checksums.add(checksum);
    const schemaPath = safeSourcePath(paths.directory, prototypeDirectory, entry.schemaManifest);
    const expectedSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    assertSchemaManifestShape(expectedSchema);
    return Object.freeze({
      version: entry.version,
      description: entry.description.trim(),
      kind: entry.kind === "baseline" ? "baseline" : "migration",
      adoptExisting: entry.adoptExisting === true,
      checksum,
      sql,
      statements: Object.freeze(statements),
      expectedSchema: Object.freeze(expectedSchema),
      expectedFingerprint: schemaFingerprint(expectedSchema)
    });
  });
  return Object.freeze({
    contractVersion: document.contractVersion,
    runnerVersion: RUNNER_VERSION,
    manifestPath: paths.manifestPath,
    migrations: Object.freeze(migrations),
    latestVersion: migrations.at(-1).version,
    latestFingerprint: migrations.at(-1).expectedFingerprint
  });
}

async function inspectDatabaseSchema(database, databaseName) {
  if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw migrationError("Le nom de base MariaDB est invalide.", "PROTO05_SCHEMA_IDENTIFIER_INVALID");
  }
  const [grantRows] = await database.query("SHOW GRANTS");
  if (!grantAllowsRoutineInspection(grantRows, databaseName)) {
    throw migrationError(
      "Le compte MariaDB ne peut pas vérifier les définitions des routines.",
      "PROTO05_ROUTINE_VISIBILITY_INSUFFICIENT"
    );
  }
  const [[databaseDefaults]] = await database.query(
    `SELECT DEFAULT_CHARACTER_SET_NAME characterSet, DEFAULT_COLLATION_NAME collation
       FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
    [databaseName]
  );
  if (!databaseDefaults) {
    throw migrationError("La base MariaDB configurée n’existe pas.", "PROTO05_SCHEMA_DATABASE_MISSING");
  }
  const [tables] = await database.query(
    `SELECT TABLE_NAME tableName, TABLE_TYPE tableType, ENGINE engine,
            TABLE_COLLATION collation, TABLE_COMMENT comment
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [databaseName]
  );
  const [columns] = await database.query(
    `SELECT TABLE_NAME tableName, ORDINAL_POSITION ordinalPosition,
            COLUMN_NAME columnName, COLUMN_TYPE columnType,
            IS_NULLABLE nullable, COLUMN_DEFAULT defaultValue, EXTRA extra,
            GENERATION_EXPRESSION generationExpression,
            CHARACTER_SET_NAME characterSet, COLLATION_NAME collation,
            COLUMN_COMMENT comment
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [databaseName]
  );
  const [indexes] = await database.query(
    `SELECT TABLE_NAME tableName, INDEX_NAME indexName, NON_UNIQUE nonUnique,
            SEQ_IN_INDEX sequence, COLUMN_NAME columnName, COLLATION collation,
            SUB_PART prefixLength, NULLABLE nullable, INDEX_TYPE indexType,
            INDEX_COMMENT comment, IGNORED ignored
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [databaseName]
  );
  const [tableConstraints] = await database.query(
    `SELECT TABLE_NAME tableName, CONSTRAINT_NAME constraintName,
            CONSTRAINT_TYPE constraintType
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = ? ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
    [databaseName]
  );
  const [keyColumns] = await database.query(
    `SELECT TABLE_NAME tableName, CONSTRAINT_NAME constraintName,
            ORDINAL_POSITION ordinalPosition, COLUMN_NAME columnName,
            POSITION_IN_UNIQUE_CONSTRAINT referencedPosition,
            REFERENCED_TABLE_NAME referencedTableName,
            REFERENCED_COLUMN_NAME referencedColumnName
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE CONSTRAINT_SCHEMA = ?
      ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
    [databaseName]
  );
  const [foreignKeys] = await database.query(
    `SELECT TABLE_NAME tableName, CONSTRAINT_NAME constraintName,
            UNIQUE_CONSTRAINT_NAME referencedConstraintName,
            REFERENCED_TABLE_NAME referencedTableName,
            MATCH_OPTION matchOption, UPDATE_RULE updateRule, DELETE_RULE deleteRule
       FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = ? ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
    [databaseName]
  );
  const [checks] = await database.query(
    `SELECT TABLE_NAME tableName, CONSTRAINT_NAME constraintName,
            CHECK_CLAUSE checkClause
       FROM information_schema.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = ? ORDER BY TABLE_NAME, CONSTRAINT_NAME`,
    [databaseName]
  );
  const [views] = await database.query(
    `SELECT TABLE_NAME viewName, ALGORITHM algorithm, CHECK_OPTION checkOption,
            IS_UPDATABLE updatable, SECURITY_TYPE securityType,
            VIEW_DEFINITION definition
       FROM information_schema.VIEWS
      WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [databaseName]
  );
  const [routineCatalogRows] = await database.query(
    `SELECT ROUTINE_NAME routineName, ROUTINE_TYPE routineType,
            DATA_TYPE dataType, DTD_IDENTIFIER dtdIdentifier,
            IS_DETERMINISTIC AS \`deterministic\`, SQL_DATA_ACCESS sqlDataAccess,
            SECURITY_TYPE securityType, SQL_MODE sqlMode,
            ROUTINE_COMMENT comment, CHARACTER_SET_CLIENT characterSetClient,
            COLLATION_CONNECTION collationConnection,
            DATABASE_COLLATION databaseCollation
       FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_TYPE, ROUTINE_NAME`,
    [databaseName]
  );
  const [procedureStatus] = await database.query(`SHOW PROCEDURE STATUS WHERE Db = '${databaseName}'`);
  const catalogNames = routineCatalogRows.map(row => row.routineName).sort();
  const statusNames = procedureStatus.map(row => row.Name).sort();
  if (stableJson(catalogNames) !== stableJson(statusNames)) {
    throw migrationError(
      "Les inventaires MariaDB des procédures sont contradictoires.",
      "PROTO05_ROUTINE_INVENTORY_INCONSISTENT",
      { catalogNames, statusNames }
    );
  }
  const routines = [];
  for (const routine of routineCatalogRows) {
    const [createRows] = await database.query(
      `SHOW CREATE PROCEDURE \`${databaseName}\`.\`${routine.routineName}\``
    );
    const createStatement = createRows[0]?.["Create Procedure"];
    if (!createStatement) {
      throw migrationError(
        `La définition de ${routine.routineName} est inaccessible.`,
        "PROTO05_ROUTINE_DEFINITION_INACCESSIBLE",
        { routineName: routine.routineName }
      );
    }
    routines.push({
      ...routine,
      createStatement: normalizeRoutineCreateStatement(createStatement)
    });
  }
  const [routineParameters] = await database.query(
    `SELECT SPECIFIC_NAME routineName, ORDINAL_POSITION ordinalPosition,
            PARAMETER_MODE parameterMode, PARAMETER_NAME parameterName,
            DATA_TYPE dataType, DTD_IDENTIFIER dtdIdentifier,
            CHARACTER_SET_NAME characterSet, COLLATION_NAME collation
       FROM information_schema.PARAMETERS
      WHERE SPECIFIC_SCHEMA = ? ORDER BY SPECIFIC_NAME, ORDINAL_POSITION`,
    [databaseName]
  );
  const [triggers] = await database.query(
    `SELECT TRIGGER_NAME triggerName, EVENT_MANIPULATION AS \`event\`,
            EVENT_OBJECT_TABLE tableName, ACTION_ORDER actionOrder,
            ACTION_TIMING timing, ACTION_ORIENTATION orientation,
            ACTION_STATEMENT statement, SQL_MODE sqlMode
       FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME`,
    [databaseName]
  );
  const [events] = await database.query(
    `SELECT EVENT_NAME eventName, EVENT_TYPE eventType,
            EXECUTE_AT executeAt, INTERVAL_VALUE intervalValue,
            INTERVAL_FIELD intervalField, STATUS status,
            ON_COMPLETION onCompletion, STARTS starts, ENDS ends,
            TIME_ZONE timeZone, EVENT_DEFINITION definition
       FROM information_schema.EVENTS
      WHERE EVENT_SCHEMA = ? ORDER BY EVENT_NAME`,
    [databaseName]
  );
  const numberOrNull = value => value === null ? null : Number(value);
  return {
    formatVersion: SCHEMA_MANIFEST_FORMAT,
    databaseDefaults,
    tables,
    columns: columns.map(row => ({ ...row, ordinalPosition: Number(row.ordinalPosition) })),
    indexes: indexes.map(row => ({
      ...row,
      nonUnique: Number(row.nonUnique),
      sequence: Number(row.sequence),
      prefixLength: numberOrNull(row.prefixLength)
    })),
    tableConstraints,
    keyColumns: keyColumns.map(row => ({
      ...row,
      ordinalPosition: Number(row.ordinalPosition),
      referencedPosition: numberOrNull(row.referencedPosition)
    })),
    foreignKeys,
    checks,
    views,
    routines,
    routineParameters: routineParameters.map(row => ({ ...row, ordinalPosition: Number(row.ordinalPosition) })),
    triggers: triggers.map(row => ({ ...row, actionOrder: Number(row.actionOrder) })),
    events
  };
}

const ROW_KEYS = Object.freeze({
  tables: row => row.tableName,
  columns: row => `${row.tableName}/${row.columnName}`,
  indexes: row => `${row.tableName}/${row.indexName}/${row.sequence}`,
  tableConstraints: row => `${row.tableName}/${row.constraintName}`,
  keyColumns: row => `${row.tableName}/${row.constraintName}/${row.ordinalPosition}`,
  foreignKeys: row => `${row.tableName}/${row.constraintName}`,
  checks: row => `${row.tableName}/${row.constraintName}`,
  views: row => row.viewName,
  routines: row => `${row.routineType}/${row.routineName}`,
  routineParameters: row => `${row.routineName}/${row.ordinalPosition}`,
  triggers: row => row.triggerName,
  events: row => row.eventName
});

function bounded(value, limit = 320) {
  const text = stableJson(value);
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function compareSchemaManifests(expected, actual, limit = 100) {
  const differences = [];
  if (stableJson(expected.databaseDefaults) !== stableJson(actual.databaseDefaults)) {
    differences.push({ path: "databaseDefaults", kind: "changed", expected: bounded(expected.databaseDefaults), actual: bounded(actual.databaseDefaults) });
  }
  for (const [collection, keyOf] of Object.entries(ROW_KEYS)) {
    const expectedRows = new Map((expected[collection] || []).map(row => [keyOf(row), row]));
    const actualRows = new Map((actual[collection] || []).map(row => [keyOf(row), row]));
    for (const [key, row] of expectedRows) {
      if (differences.length >= limit) break;
      if (!actualRows.has(key)) differences.push({ path: `${collection}/${key}`, kind: "missing", expected: bounded(row) });
      else if (stableJson(row) !== stableJson(actualRows.get(key))) {
        differences.push({ path: `${collection}/${key}`, kind: "changed", expected: bounded(row), actual: bounded(actualRows.get(key)) });
      }
    }
    for (const [key, row] of actualRows) {
      if (differences.length >= limit) break;
      if (!expectedRows.has(key)) differences.push({ path: `${collection}/${key}`, kind: "unexpected", actual: bounded(row) });
    }
  }
  return {
    equal: differences.length === 0 && schemaFingerprint(expected) === schemaFingerprint(actual),
    expectedFingerprint: schemaFingerprint(expected),
    actualFingerprint: schemaFingerprint(actual),
    differences,
    truncated: differences.length >= limit
  };
}

function withoutRoutines(manifest) {
  return { ...manifest, routines: [], routineParameters: [] };
}

function sameRoutineNames(expected, actual) {
  return stableJson((expected.routines || []).map(row => row.routineName).sort())
    === stableJson((actual.routines || []).map(row => row.routineName).sort());
}

async function readMigrationRegistry(database) {
  try {
    const [rows] = await database.query(
      `SELECT version, description, checksum_sha256 checksum,
              applied_at appliedAt, applied_by appliedBy
         FROM schema_migrations ORDER BY version`
    );
    return { exists: true, rows };
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") return { exists: false, rows: [] };
    throw error;
  }
}

function validateRegistry(rows, migrations) {
  const diagnostics = [];
  const seen = new Set();
  let previousAppliedAt = null;
  for (const [index, row] of rows.entries()) {
    if (seen.has(row.version)) diagnostics.push({ code: "duplicate", version: row.version });
    seen.add(row.version);
    if (!/^[a-f0-9]{64}$/.test(String(row.checksum || ""))) {
      diagnostics.push({ code: "checksum-invalid", version: row.version });
    }
    const expected = migrations[index];
    if (!expected || expected.version !== row.version) {
      diagnostics.push({ code: expected ? "order-or-gap" : "unknown-or-newer", version: row.version, expected: expected?.version || null });
    } else if (expected.checksum !== row.checksum) {
      diagnostics.push({ code: "checksum-mismatch", version: row.version, expected: expected.checksum, actual: row.checksum });
    }
    const appliedAt = String(row.appliedAt || "");
    if (previousAppliedAt && appliedAt < previousAppliedAt) diagnostics.push({ code: "applied-order", version: row.version });
    previousAppliedAt = appliedAt;
  }
  if (diagnostics.length) {
    throw migrationError("Le registre de migrations est incohérent.", "PROTO05_MIGRATION_REGISTRY_INVALID", { diagnostics });
  }
  return { appliedCount: rows.length, latestVersion: rows.at(-1)?.version || null };
}

function schemaSummary(manifest) {
  return {
    tables: manifest.tables.length,
    columns: manifest.columns.length,
    indexes: new Set(manifest.indexes.map(row => `${row.tableName}/${row.indexName}`)).size,
    foreignKeys: manifest.foreignKeys.length,
    checks: manifest.checks.length,
    views: manifest.views.length,
    routines: manifest.routines.length,
    triggers: manifest.triggers.length,
    events: manifest.events.length
  };
}

async function inspectMigrationState(database, { databaseName, prototypeDirectory, manifestPath = null } = {}) {
  const contract = loadMigrationContract(prototypeDirectory, { manifestPath });
  const actualSchema = await inspectDatabaseSchema(database, databaseName);
  const registry = await readMigrationRegistry(database);
  const registryState = validateRegistry(registry.rows, contract.migrations);
  const appliedCount = registryState.appliedCount;
  let action;
  let comparison = null;
  if (appliedCount === contract.migrations.length) {
    comparison = compareSchemaManifests(contract.migrations.at(-1).expectedSchema, actualSchema);
    if (!comparison.equal) {
      throw migrationError("Le schéma installé diverge du manifeste canonique.", "PROTO05_SCHEMA_DIVERGENCE", { comparison });
    }
    action = { type: "none", migrations: [] };
  } else if (appliedCount > 0) {
    comparison = compareSchemaManifests(contract.migrations[appliedCount - 1].expectedSchema, actualSchema);
    if (comparison.equal) {
      action = { type: "apply", migrations: contract.migrations.slice(appliedCount) };
    } else {
      const pending = contract.migrations.slice(appliedCount);
      const adoptionComparison = compareSchemaManifests(contract.migrations.at(-1).expectedSchema, actualSchema);
      if (pending.every(migration => migration.adoptExisting) && adoptionComparison.equal) {
        comparison = adoptionComparison;
        action = { type: "adopt", migrations: pending };
      } else if (
        pending.every(migration => migration.adoptExisting)
        && compareSchemaManifests(
          withoutRoutines(contract.migrations[appliedCount - 1].expectedSchema),
          withoutRoutines(actualSchema)
        ).equal
        && sameRoutineNames(contract.migrations.at(-1).expectedSchema, actualSchema)
      ) {
        comparison = adoptionComparison;
        action = { type: "upgrade", migrations: pending };
      } else if (pending.some(migration => migration.adoptExisting)) {
        throw migrationError(
          "Les routines installées ne correspondent pas exactement au canon à adopter.",
          "PROTO05_ROUTINE_ADOPTION_REFUSED",
          { comparison: adoptionComparison }
        );
      } else {
        throw migrationError("Le schéma ne correspond pas à la dernière migration enregistrée.", "PROTO05_SCHEMA_DIVERGENCE", { comparison });
      }
    }
  } else if (actualSchema.tables.length === 0 && !registry.exists) {
    action = { type: "apply", migrations: contract.migrations };
  } else if (contract.migrations.length === 1 && contract.migrations[0].kind === "baseline") {
    comparison = compareSchemaManifests(contract.migrations[0].expectedSchema, actualSchema);
    if (!comparison.equal) {
      throw migrationError("La baseline refuse un schéma divergent.", "PROTO05_SCHEMA_DIVERGENCE", { comparison });
    }
    action = { type: "baseline", migrations: [contract.migrations[0]] };
  } else {
    throw migrationError("Un schéma non vide sans registre ne peut pas être baseliné automatiquement.", "PROTO05_SCHEMA_BASELINE_AMBIGUOUS");
  }
  const plan = {
    database: databaseName,
    currentFingerprint: schemaFingerprint(actualSchema),
    currentSummary: schemaSummary(actualSchema),
    registryExists: registry.exists,
    registry: registry.rows.map(row => ({ version: row.version, checksum: row.checksum })),
    action: action.type,
    migrations: action.migrations.map(item => ({ version: item.version, checksum: item.checksum }))
  };
  return {
    contract,
    actualSchema,
    registry,
    comparison,
    action,
    plan,
    planHash: sha256(stableJson(plan))
  };
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw migrationError("Identifiant SQL invalide.", "PROTO05_SCHEMA_IDENTIFIER_INVALID");
  return `\`${value}\``;
}

async function protectedDataWitness(database, schemaManifest) {
  const counts = {};
  const tableHashes = {};
  for (const table of schemaManifest.tables.filter(row => row.tableType === "BASE TABLE" && row.tableName !== REGISTRY_TABLE)) {
    const primary = schemaManifest.keyColumns
      .filter(row => row.tableName === table.tableName && row.constraintName === "PRIMARY")
      .sort((left, right) => left.ordinalPosition - right.ordinalPosition)
      .map(row => row.columnName);
    const columns = schemaManifest.columns.filter(row => row.tableName === table.tableName).map(row => row.columnName);
    const order = primary.length ? primary : columns;
    const [rows] = await database.query(
      `SELECT * FROM ${quoteIdentifier(table.tableName)} ORDER BY ${order.map(quoteIdentifier).join(", ")}`
    );
    counts[table.tableName] = rows.length;
    tableHashes[table.tableName] = sha256(stableJson(rows));
  }
  return { counts, tableHashes, fingerprint: sha256(stableJson({ counts, tableHashes })) };
}

async function createRegistryBackup(database, options) {
  const state = await inspectMigrationState(database, options);
  if (!state.registry.exists) throw migrationError("Le registre à sauvegarder n’existe pas.", "PROTO05_MIGRATION_REGISTRY_MISSING");
  const [rows] = await database.query("SHOW CREATE TABLE schema_migrations");
  const witness = await protectedDataWitness(database, state.actualSchema);
  return {
    format: "proto05-schema-registry-backup/1",
    createdAt: new Date().toISOString(),
    database: options.databaseName,
    schemaFingerprint: schemaFingerprint(state.actualSchema),
    schemaManifest: state.actualSchema,
    registryCreateSql: rows[0]["Create Table"],
    registryRows: state.registry.rows,
    protectedData: witness
  };
}

function writeRegistryBackupExclusive(backup, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(backup, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { outputPath, size: fs.statSync(outputPath).size, sha256: sha256(fs.readFileSync(outputPath)) };
}

async function verifyRegistryBackup(database, options, backupPath, state) {
  if (!backupPath || !fs.existsSync(backupPath)) {
    throw migrationError("Une sauvegarde vérifiée du registre est obligatoire.", "PROTO05_MIGRATION_BACKUP_REQUIRED");
  }
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  if (backup.format !== "proto05-schema-registry-backup/1" || backup.database !== options.databaseName) {
    throw migrationError("La sauvegarde du registre ne correspond pas à la cible.", "PROTO05_MIGRATION_BACKUP_INVALID");
  }
  if (backup.schemaFingerprint !== schemaFingerprint(state.actualSchema)
      || stableJson(backup.registryRows) !== stableJson(state.registry.rows)) {
    throw migrationError("La sauvegarde ne correspond plus à l’état courant.", "PROTO05_MIGRATION_BACKUP_STALE");
  }
  const currentWitness = await protectedDataWitness(database, state.actualSchema);
  if (currentWitness.fingerprint !== backup.protectedData?.fingerprint) {
    throw migrationError("Les données protégées ont changé depuis la sauvegarde.", "PROTO05_MIGRATION_BACKUP_STALE");
  }
  return { backup, currentWitness };
}

async function insertMigrationRow(database, migration) {
  await database.query(
    `INSERT INTO schema_migrations
       (version, description, checksum_sha256, applied_by)
     VALUES (?, ?, ?, ?)`,
    [migration.version, migration.description, migration.checksum, `proto05-schema-runner/${RUNNER_VERSION}`]
  );
}

async function executeMigration(database, migration) {
  let completedStatements = 0;
  try {
    for (const statement of migration.statements) {
      await database.query(statement);
      completedStatements += 1;
    }
  } catch (cause) {
    throw migrationError(
      `La migration ${migration.version} a échoué après ${completedStatements} instruction(s) DDL potentiellement commitée(s).`,
      "PROTO05_MIGRATION_DDL_FAILED",
      { cause, migrationVersion: migration.version, completedStatements, partialDdlPossible: completedStatements > 0 }
    );
  }
}

async function acquireMigrationLock(database, databaseName, timeoutSeconds = DEFAULT_LOCK_TIMEOUT_SECONDS) {
  const lockName = `${databaseName}.proto05.schema-migrations`;
  const [[row]] = await database.query("SELECT GET_LOCK(?, ?) acquired", [lockName, timeoutSeconds]);
  if (Number(row.acquired) !== 1) {
    throw migrationError("Un autre runner de migrations détient déjà le verrou.", "PROTO05_MIGRATION_LOCK_UNAVAILABLE");
  }
  return lockName;
}

async function releaseMigrationLock(database, lockName, primaryError = null) {
  try {
    const [[row]] = await database.query("SELECT RELEASE_LOCK(?) released", [lockName]);
    if (Number(row.released) !== 1) throw new Error("Le verrou de migration n’a pas été libéré.");
  } catch (error) {
    if (primaryError) primaryError.lockReleaseError = error;
    else throw error;
  }
}

async function runMigrationCommand(database, options = {}) {
  const initial = await inspectMigrationState(database, options);
  if (initial.action.type === "none") return { changed: false, state: initial };
  const expectedMode = initial.action.type === "baseline" ? "baseline" : "apply";
  if (options.mode !== expectedMode) {
    throw migrationError(
      expectedMode === "baseline"
        ? "Le schéma existant exige la commande explicite de baseline."
        : "Le registre en retard exige la commande explicite d’application.",
      "PROTO05_MIGRATION_MODE_REQUIRED",
      { requiredMode: expectedMode, planHash: initial.planHash }
    );
  }
  if (!options.expectedPlanHash || options.expectedPlanHash !== initial.planHash) {
    throw migrationError("Le hash du plan approuvé est absent ou différent.", "PROTO05_MIGRATION_PLAN_MISMATCH", { planHash: initial.planHash });
  }
  const confirmation = options.mode === "baseline" ? "BASELINE PROTO05 SCHEMA" : "APPLY PROTO05 SCHEMA MIGRATIONS";
  if (options.confirm !== confirmation) {
    throw migrationError("La confirmation littérale de la commande est absente.", "PROTO05_MIGRATION_CONFIRMATION_REQUIRED");
  }
  let lockName = null;
  let primaryError = null;
  try {
    lockName = await acquireMigrationLock(database, options.databaseName, options.lockTimeoutSeconds);
    if (typeof options.afterLock === "function") await options.afterLock();
    const state = await inspectMigrationState(database, options);
    if (state.planHash !== initial.planHash || state.action.type !== initial.action.type) {
      throw migrationError("Le plan a changé après acquisition du verrou.", "PROTO05_MIGRATION_PLAN_DRIFT", { planHash: state.planHash });
    }
    let backupVerification = null;
    if (options.mode === "baseline" || state.action.type === "adopt") {
      backupVerification = await verifyRegistryBackup(database, options, options.backupPath, state);
      await database.beginTransaction();
      try {
        for (const migration of state.action.migrations) await insertMigrationRow(database, migration);
        await database.commit();
      } catch (error) {
        try { await database.rollback(); } catch {}
        throw error;
      }
    } else {
      if (state.action.type === "upgrade") {
        backupVerification = await verifyRegistryBackup(database, options, options.backupPath, state);
      }
      for (const migration of state.action.migrations) {
        await executeMigration(database, migration);
        const observed = await inspectDatabaseSchema(database, options.databaseName);
        const comparison = compareSchemaManifests(migration.expectedSchema, observed);
        if (!comparison.equal) {
          throw migrationError(
            `La migration ${migration.version} n’a pas produit le schéma attendu ; elle n’est pas inscrite.`,
            "PROTO05_MIGRATION_RESULT_DIVERGENCE",
            { migrationVersion: migration.version, comparison, partialDdlPossible: true }
          );
        }
        await database.beginTransaction();
        try {
          await insertMigrationRow(database, migration);
          await database.commit();
        } catch (error) {
          try { await database.rollback(); } catch {}
          throw error;
        }
      }
    }
    const finalState = await inspectMigrationState(database, options);
    if (finalState.action.type !== "none") {
      throw migrationError("Le registre n’est pas à jour après la commande.", "PROTO05_MIGRATION_FINAL_VERIFICATION_FAILED");
    }
    if (backupVerification) {
      const afterWitness = await protectedDataWitness(database, finalState.actualSchema);
      if (afterWitness.fingerprint !== backupVerification.currentWitness.fingerprint) {
        throw migrationError("Les données protégées ont changé pendant la baseline.", "PROTO05_MIGRATION_PROTECTED_DATA_CHANGED");
      }
    }
    return { changed: true, state: finalState, previous: state };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (lockName) await releaseMigrationLock(database, lockName, primaryError);
  }
}

async function verifyDatabaseSchema({ database, databaseName, prototypeDirectory, manifestPath = null }) {
  const state = await inspectMigrationState(database, { databaseName, prototypeDirectory, manifestPath });
  if (state.action.type !== "none") {
    throw migrationError(
      "Le registre MariaDB n’est pas à jour ; exécutez la commande d’administration des migrations.",
      "PROTO05_SCHEMA_MIGRATIONS_PENDING",
      { requiredAction: state.action.type, planHash: state.planHash }
    );
  }
  return {
    schemaVersion: state.contract.latestVersion,
    schemaFingerprint: state.contract.latestFingerprint,
    migrationCount: state.registry.rows.length
  };
}

module.exports = {
  REGISTRY_TABLE,
  RUNNER_VERSION,
  compareSchemaManifests,
  createRegistryBackup,
  inspectDatabaseSchema,
  inspectMigrationState,
  loadMigrationContract,
  normalizeRoutineCreateStatement,
  protectedDataWitness,
  runMigrationCommand,
  schemaFingerprint,
  schemaSummary,
  sha256,
  splitSqlStatements,
  stableJson,
  validateRegistry,
  verifyDatabaseSchema,
  writeRegistryBackupExclusive
};
