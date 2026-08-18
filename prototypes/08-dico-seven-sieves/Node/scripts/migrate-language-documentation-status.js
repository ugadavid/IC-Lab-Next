"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { createPool } = require("../src/repository");

const DOCUMENTED = "DOCUMENTED";
const REFERENCED = "REFERENCED";
const CONSTRAINT_NAME = "chk_language_documentation_status";
const EXPECTED_LANGUAGES = [
  { id: 1, code: "fr", name: "Français", family: "Romance", is_romance: 1, is_active: 1 },
  { id: 2, code: "es", name: "Español", family: "Romance", is_romance: 1, is_active: 1 },
  { id: 3, code: "it", name: "Italiano", family: "Romance", is_romance: 1, is_active: 1 },
  { id: 4, code: "pt", name: "Português", family: "Romance", is_romance: 1, is_active: 1 },
  { id: 5, code: "en", name: "English", family: "Germanic", is_romance: 0, is_active: 1 },
];
const EXPECTED_VOLUMES = {
  languages: 5,
  lexical_entries: 150,
  lexical_forms: 597,
  inflected_forms: 16,
  connector_helps: 12,
  form_relations: 70,
  pattern_rules: 1,
  ic_features: 8,
};
const BASE_COLUMN_NAMES = ["id", "code", "name", "family", "is_romance", "is_active"];

function parseArguments(argv) {
  const mode = argv[2] || "--check";
  const backupFlag = argv.indexOf("--backup-dir");
  const backupDir = backupFlag >= 0 ? argv[backupFlag + 1] : null;
  if (!new Set(["--check", "--apply", "--rollback"]).has(mode)) {
    throw new Error("Usage : --check | --apply --backup-dir <dossier> | --rollback --backup-dir <dossier>");
  }
  if (mode !== "--check" && !backupDir) {
    throw new Error("Un chemin --backup-dir est obligatoire pour appliquer ou restaurer la migration.");
  }
  return { mode, backupDir: backupDir ? path.resolve(backupDir) : null };
}

function normalizeSql(sql) {
  return String(sql).replace(/`AUTO_INCREMENT`=\d+/giu, "").replace(/\s+/gu, " ").trim();
}

function normalizeLanguageRow(row, includeStatus = Object.hasOwn(row, "documentation_status")) {
  const normalized = {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    family: row.family,
    is_romance: Number(row.is_romance),
    is_active: Number(row.is_active),
  };
  if (includeStatus) normalized.documentation_status = row.documentation_status;
  return normalized;
}

function validateLanguages(rows, expectStatus) {
  if (!Array.isArray(rows) || rows.length !== EXPECTED_LANGUAGES.length) {
    throw new Error(`Migration refusée : ${EXPECTED_LANGUAGES.length} langues attendues, ${rows?.length ?? 0} trouvée(s).`);
  }
  rows.forEach((row, index) => {
    const normalized = normalizeLanguageRow(row, expectStatus);
    const expected = EXPECTED_LANGUAGES[index];
    for (const field of Object.keys(expected)) {
      if (normalized[field] !== expected[field]) {
        throw new Error(`Migration refusée : langue ${index + 1}, ${field} inattendu (${normalized[field]}).`);
      }
    }
    if (expectStatus && normalized.documentation_status !== DOCUMENTED) {
      throw new Error(`Migration refusée : ${normalized.code} ne porte pas le statut ${DOCUMENTED}.`);
    }
  });
  return rows;
}

function validateVolumes(volumes) {
  for (const [key, expected] of Object.entries(EXPECTED_VOLUMES)) {
    if (Number(volumes[key]) !== expected) {
      throw new Error(`Migration refusée : volume ${key} inattendu (${volumes[key]}, attendu ${expected}).`);
    }
  }
  return volumes;
}

function validateBaseColumns(columns) {
  const baseColumns = columns.filter((column) => column.COLUMN_NAME !== "documentation_status");
  if (baseColumns.map((column) => column.COLUMN_NAME).join(",") !== BASE_COLUMN_NAMES.join(",")) {
    throw new Error("Migration refusée : structure de base de language inattendue.");
  }
  const byName = Object.fromEntries(baseColumns.map((column) => [column.COLUMN_NAME, column]));
  const expected = {
    id: { type: /^int\(/u, nullable: "NO", extra: "auto_increment" },
    code: { type: "varchar(5)", nullable: "NO" },
    name: { type: "varchar(50)", nullable: "NO" },
    family: { type: "varchar(50)", nullable: "YES" },
    is_romance: { type: /^tinyint\(/u, nullable: "NO" },
    is_active: { type: /^tinyint\(/u, nullable: "NO" },
  };
  for (const [name, rule] of Object.entries(expected)) {
    const column = byName[name];
    const typeMatches = rule.type instanceof RegExp
      ? rule.type.test(column.COLUMN_TYPE)
      : column.COLUMN_TYPE === rule.type;
    if (!typeMatches || column.IS_NULLABLE !== rule.nullable
        || (rule.extra && column.EXTRA !== rule.extra)) {
      throw new Error(`Migration refusée : définition inattendue pour language.${name}.`);
    }
  }
}

function classifyState(columns, constraints) {
  validateBaseColumns(columns);
  const statusColumn = columns.find((column) => column.COLUMN_NAME === "documentation_status");
  const statusConstraint = constraints.find((constraint) => constraint.CONSTRAINT_NAME === CONSTRAINT_NAME);
  if (!statusColumn && !statusConstraint) return "pending";
  if (!statusColumn || !statusConstraint) return "partial";
  const validColumn = statusColumn.COLUMN_TYPE === "varchar(20)"
    && statusColumn.IS_NULLABLE === "NO"
    && String(statusColumn.COLUMN_DEFAULT).replace(/^'|'$/gu, "") === DOCUMENTED;
  const clause = String(statusConstraint.CHECK_CLAUSE || "").toUpperCase();
  const validConstraint = clause.includes("DOCUMENTATION_STATUS")
    && clause.includes(DOCUMENTED)
    && clause.includes(REFERENCED);
  return validColumn && validConstraint ? "applied" : "partial";
}

async function readState(executor) {
  const [createRows] = await executor.query("SHOW CREATE TABLE language");
  const [columns] = await executor.execute(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, ORDINAL_POSITION
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'language'
    ORDER BY ORDINAL_POSITION
  `);
  const [constraints] = await executor.execute(`
    SELECT CONSTRAINT_NAME, CHECK_CLAUSE
    FROM information_schema.CHECK_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'language'
    ORDER BY CONSTRAINT_NAME
  `);
  const state = classifyState(columns, constraints);
  const statusSelect = state === "applied" ? ", documentation_status" : "";
  const [languages] = await executor.execute(`
    SELECT id, code, name, family, is_romance, is_active${statusSelect}
    FROM language
    ORDER BY id
  `);
  const [volumeRows] = await executor.query(`
    SELECT
      (SELECT COUNT(*) FROM language) AS languages,
      (SELECT COUNT(*) FROM lexical_entry) AS lexical_entries,
      (SELECT COUNT(*) FROM lexical_form) AS lexical_forms,
      (SELECT COUNT(*) FROM inflected_form) AS inflected_forms,
      (SELECT COUNT(*) FROM connector_help) AS connector_helps,
      (SELECT COUNT(*) FROM form_relation) AS form_relations,
      (SELECT COUNT(*) FROM pattern_rule) AS pattern_rules,
      (SELECT COUNT(*) FROM ic_feature) AS ic_features
  `);
  validateLanguages(languages, state === "applied");
  validateVolumes(volumeRows[0]);
  return {
    state,
    createTable: createRows[0]["Create Table"],
    columns,
    constraints,
    languages: languages.map((row) => normalizeLanguageRow(row, state === "applied")),
    volumes: Object.fromEntries(Object.entries(volumeRows[0]).map(([key, value]) => [key, Number(value)])),
  };
}

async function writeBackup(backupDir, state) {
  await fs.mkdir(backupDir, { recursive: true });
  const schemaPath = path.join(backupDir, "language-schema-before.sql");
  const rowsPath = path.join(backupDir, "language-rows-before.json");
  const manifestPath = path.join(backupDir, "migration-manifest-before.json");
  await fs.writeFile(schemaPath, `${state.createTable};\n`, { encoding: "utf8", flag: "wx" });
  await fs.writeFile(rowsPath, `${JSON.stringify(state.languages, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await fs.writeFile(manifestPath, `${JSON.stringify({
    migration: "language.documentation_status",
    created_at: new Date().toISOString(),
    state: state.state,
    expected_values: [DOCUMENTED, REFERENCED],
    volumes: state.volumes,
  }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { schemaPath, rowsPath, manifestPath };
}

async function readBackup(backupDir) {
  const [schema, rows, manifest] = await Promise.all([
    fs.readFile(path.join(backupDir, "language-schema-before.sql"), "utf8"),
    fs.readFile(path.join(backupDir, "language-rows-before.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(backupDir, "migration-manifest-before.json"), "utf8").then(JSON.parse),
  ]);
  validateLanguages(rows, false);
  validateVolumes(manifest.volumes);
  if (manifest.migration !== "language.documentation_status" || manifest.state !== "pending") {
    throw new Error("Restauration refusée : manifeste de sauvegarde inattendu.");
  }
  return { schema, rows, manifest };
}

async function applyMigration(pool, backupDir) {
  const before = await readState(pool);
  if (before.state === "applied") {
    return { mode: "apply", state: "already_applied", changed_schema: 0, changed_rows: 0, after: before };
  }
  if (before.state !== "pending") {
    throw new Error("Migration refusée : état partiellement appliqué ou définition inattendue.");
  }
  const backup = await writeBackup(backupDir, before);
  await pool.query(`
    ALTER TABLE language
      ADD COLUMN documentation_status VARCHAR(20) NOT NULL DEFAULT 'DOCUMENTED' AFTER is_active,
      ADD CONSTRAINT ${CONSTRAINT_NAME}
        CHECK (documentation_status IN ('DOCUMENTED', 'REFERENCED'))
  `);
  const after = await readState(pool);
  if (after.state !== "applied") {
    throw new Error("Migration incomplète : le schéma final ne correspond pas au modèle attendu.");
  }
  return { mode: "apply", state: "applied", changed_schema: 1, changed_rows: 5, backup, before, after };
}

async function rollbackMigration(pool, backupDir) {
  const backup = await readBackup(backupDir);
  const before = await readState(pool);
  if (before.state !== "applied") {
    throw new Error("Restauration refusée : la migration n’est pas entièrement appliquée.");
  }
  await pool.query(`
    ALTER TABLE language
      DROP CONSTRAINT ${CONSTRAINT_NAME},
      DROP COLUMN documentation_status
  `);
  const after = await readState(pool);
  if (after.state !== "pending"
      || normalizeSql(after.createTable) !== normalizeSql(backup.schema.replace(/;\s*$/u, ""))) {
    throw new Error("Restauration incomplète : le schéma initial n’a pas été rétabli exactement.");
  }
  const restoredRows = after.languages.map((row) => normalizeLanguageRow(row, false));
  if (JSON.stringify(restoredRows) !== JSON.stringify(backup.rows)) {
    throw new Error("Restauration incomplète : les cinq lignes ne correspondent pas à la sauvegarde.");
  }
  return { mode: "rollback", state: "restored", changed_schema: 1, changed_rows: 5, before, after };
}

async function main() {
  const { mode, backupDir } = parseArguments(process.argv);
  const pool = createPool();
  try {
    if (mode === "--check") {
      console.log(JSON.stringify({ mode: "check", ...(await readState(pool)) }, null, 2));
      return;
    }
    const result = mode === "--apply"
      ? await applyMigration(pool, backupDir)
      : await rollbackMigration(pool, backupDir);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  BASE_COLUMN_NAMES,
  CONSTRAINT_NAME,
  DOCUMENTED,
  EXPECTED_LANGUAGES,
  EXPECTED_VOLUMES,
  REFERENCED,
  classifyState,
  normalizeLanguageRow,
  parseArguments,
  validateLanguages,
  validateVolumes,
};
