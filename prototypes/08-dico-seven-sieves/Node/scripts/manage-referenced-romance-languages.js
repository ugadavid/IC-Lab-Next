"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { createPool } = require("../src/repository");

const MIGRATION_NAME = "referenced-romance-languages-v1";
const DOCUMENTED = "DOCUMENTED";
const REFERENCED = "REFERENCED";
const CONSTRAINT_NAME = "chk_language_documentation_status";
const BASE_LANGUAGES = [
  { id: 1, code: "fr", name: "Français", family: "Romance", is_romance: 1, documentation_status: DOCUMENTED, is_active: 1 },
  { id: 2, code: "es", name: "Español", family: "Romance", is_romance: 1, documentation_status: DOCUMENTED, is_active: 1 },
  { id: 3, code: "it", name: "Italiano", family: "Romance", is_romance: 1, documentation_status: DOCUMENTED, is_active: 1 },
  { id: 4, code: "pt", name: "Português", family: "Romance", is_romance: 1, documentation_status: DOCUMENTED, is_active: 1 },
  { id: 5, code: "en", name: "English", family: "Germanic", is_romance: 0, documentation_status: DOCUMENTED, is_active: 1 },
];
const TARGET_LANGUAGES = [
  { code: "ca", name: "Català", family: "Romance", is_romance: 1, documentation_status: REFERENCED, is_active: 0 },
  { code: "gl", name: "Galego", family: "Romance", is_romance: 1, documentation_status: REFERENCED, is_active: 0 },
  { code: "oc", name: "Occitan", family: "Romance", is_romance: 1, documentation_status: REFERENCED, is_active: 0 },
  { code: "ro", name: "Română", family: "Romance", is_romance: 1, documentation_status: REFERENCED, is_active: 0 },
  { code: "co", name: "Corsu", family: "Romance", is_romance: 1, documentation_status: REFERENCED, is_active: 0 },
  { code: "sc", name: "Sardu", family: "Romance", is_romance: 1, documentation_status: REFERENCED, is_active: 0 },
  { code: "rm", name: "Rumantsch", family: "Romance", is_romance: 1, documentation_status: REFERENCED, is_active: 0 },
];
const EXPECTED_FUNCTIONAL_VOLUMES = {
  lexical_entries: 150,
  lexical_forms: 597,
  inflected_forms: 16,
  connector_helps: 12,
  form_relations: 70,
  pattern_rules: 1,
  ic_features: 8,
};
const LANGUAGE_FIELDS = [
  "id", "code", "name", "family", "is_romance", "is_active", "documentation_status",
];

function parseArguments(argv) {
  const mode = argv[2] || "--check";
  const backupFlag = argv.indexOf("--backup-dir");
  const backupDir = backupFlag >= 0 ? argv[backupFlag + 1] : null;
  if (!new Set(["--check", "--apply", "--rollback"]).has(mode)) {
    throw new Error("Usage : --check | --apply --backup-dir <dossier> | --rollback --backup-dir <dossier>");
  }
  if (mode !== "--check" && !backupDir) {
    throw new Error("Un chemin --backup-dir est obligatoire pour appliquer ou restaurer les sept langues.");
  }
  return { mode, backupDir: backupDir ? path.resolve(backupDir) : null };
}

function normalizeRow(row) {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    family: row.family,
    is_romance: Number(row.is_romance),
    documentation_status: row.documentation_status,
    is_active: Number(row.is_active),
  };
}

function assertExactRow(actual, expected, context) {
  for (const field of Object.keys(expected)) {
    if (actual[field] !== expected[field]) {
      throw new Error(`Opération refusée : ${context}, ${field} inattendu (${actual[field]}).`);
    }
  }
}

function validateSchema(columns, constraints) {
  const names = columns.map((column) => column.COLUMN_NAME);
  if (names.join(",") !== LANGUAGE_FIELDS.join(",")) {
    throw new Error(`Opération refusée : colonnes de language inattendues (${names.join(",")}).`);
  }
  const status = columns.find((column) => column.COLUMN_NAME === "documentation_status");
  const defaultValue = String(status?.COLUMN_DEFAULT || "").replace(/^'|'$/gu, "");
  if (status?.COLUMN_TYPE !== "varchar(20)" || status.IS_NULLABLE !== "NO" || defaultValue !== DOCUMENTED) {
    throw new Error("Opération refusée : définition de language.documentation_status inattendue.");
  }
  const constraint = constraints.find((item) => item.CONSTRAINT_NAME === CONSTRAINT_NAME);
  const clause = String(constraint?.CHECK_CLAUSE || "").toUpperCase();
  const normalizedClause = clause.replace(/[`'(),\s]/gu, "");
  if (normalizedClause !== `DOCUMENTATION_STATUSIN${DOCUMENTED}${REFERENCED}`) {
    throw new Error("Opération refusée : contrainte documentaire absente ou inattendue.");
  }
}

function classifyLanguageState(rows) {
  const normalized = rows.map(normalizeRow);
  if (normalized.length < BASE_LANGUAGES.length) {
    throw new Error(`Opération refusée : cinq langues historiques attendues, ${normalized.length} trouvée(s).`);
  }
  BASE_LANGUAGES.forEach((expected, index) => assertExactRow(
    normalized[index], expected, `langue historique ${expected.code}`
  ));
  const extra = normalized.slice(BASE_LANGUAGES.length);
  if (extra.length === 0) return "pending";
  if (extra.length !== TARGET_LANGUAGES.length) {
    throw new Error(`Opération refusée : état partiel ou collision (${extra.length} langue(s) supplémentaire(s)).`);
  }
  TARGET_LANGUAGES.forEach((target, index) => assertExactRow(
    extra[index], { id: BASE_LANGUAGES.length + index + 1, ...target }, `langue référencée ${target.code}`
  ));
  return "applied";
}

function validateFunctionalVolumes(volumes) {
  for (const [name, expected] of Object.entries(EXPECTED_FUNCTIONAL_VOLUMES)) {
    if (Number(volumes[name]) !== expected) {
      throw new Error(`Opération refusée : volume ${name} inattendu (${volumes[name]}, attendu ${expected}).`);
    }
  }
}

function totalDependencies(dependencies) {
  return Object.values(dependencies).reduce((sum, value) => sum + Number(value), 0);
}

function validateNoDependencies(dependencies) {
  const total = totalDependencies(dependencies);
  if (total !== 0) {
    throw new Error(`Opération refusée : ${total} dépendance(s) existent pour les langues référencées (${JSON.stringify(dependencies)}).`);
  }
}

async function readState(executor, { validateVolumes = true } = {}) {
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
  validateSchema(columns, constraints);
  const [languageRows] = await executor.execute(`
    SELECT id, code, name, family, is_romance, documentation_status, is_active
    FROM language
    ORDER BY id
  `);
  const languages = languageRows.map(normalizeRow);
  const state = classifyLanguageState(languages);
  const [volumeRows] = await executor.query(`
    SELECT
      (SELECT COUNT(*) FROM lexical_entry) AS lexical_entries,
      (SELECT COUNT(*) FROM lexical_form) AS lexical_forms,
      (SELECT COUNT(*) FROM inflected_form) AS inflected_forms,
      (SELECT COUNT(*) FROM connector_help) AS connector_helps,
      (SELECT COUNT(*) FROM form_relation) AS form_relations,
      (SELECT COUNT(*) FROM pattern_rule) AS pattern_rules,
      (SELECT COUNT(*) FROM ic_feature) AS ic_features
  `);
  const volumes = Object.fromEntries(Object.entries(volumeRows[0]).map(([key, value]) => [key, Number(value)]));
  if (validateVolumes) validateFunctionalVolumes(volumes);
  const targetCodes = TARGET_LANGUAGES.map((language) => language.code);
  const placeholders = targetCodes.map(() => "?").join(", ");
  const [dependencyRows] = await executor.execute(`
    SELECT
      (SELECT COUNT(*) FROM lexical_form lf JOIN language l ON l.id = lf.language_id WHERE l.code IN (${placeholders})) AS lexical_forms,
      (SELECT COUNT(*) FROM inflected_form inf JOIN lexical_form lf ON lf.id = inf.lexical_form_id JOIN language l ON l.id = lf.language_id WHERE l.code IN (${placeholders})) AS inflected_forms,
      (SELECT COUNT(*) FROM connector_help ch JOIN language l ON l.id = ch.language_id WHERE l.code IN (${placeholders})) AS connector_helps,
      (SELECT COUNT(*) FROM pattern_rule pr JOIN language source_language ON source_language.id = pr.source_language_id JOIN language target_language ON target_language.id = pr.target_language_id WHERE source_language.code IN (${placeholders}) OR target_language.code IN (${placeholders})) AS pattern_rules,
      (SELECT COUNT(DISTINCT rel.id) FROM form_relation rel JOIN lexical_form source_form ON source_form.id = rel.source_form_id JOIN language source_language ON source_language.id = source_form.language_id JOIN lexical_form target_form ON target_form.id = rel.target_form_id JOIN language target_language ON target_language.id = target_form.language_id WHERE source_language.code IN (${placeholders}) OR target_language.code IN (${placeholders})) AS form_relations,
      (SELECT COUNT(*) FROM ic_feature feature JOIN lexical_form lf ON lf.id = feature.form_id JOIN language l ON l.id = lf.language_id WHERE l.code IN (${placeholders})) AS ic_features
  `, [...targetCodes, ...targetCodes, ...targetCodes, ...targetCodes, ...targetCodes, ...targetCodes, ...targetCodes, ...targetCodes]);
  const dependencies = Object.fromEntries(Object.entries(dependencyRows[0]).map(([key, value]) => [key, Number(value)]));
  return {
    state,
    createTable: createRows[0]["Create Table"],
    columns,
    constraints,
    languages,
    volumes,
    dependencies,
  };
}

function readAutoIncrement(createTable) {
  const match = String(createTable).match(/AUTO_INCREMENT=(\d+)/u);
  return match ? Number(match[1]) : BASE_LANGUAGES.length + 1;
}

async function writeBackup(backupDir, state) {
  await fs.mkdir(backupDir, { recursive: true });
  const schemaPath = path.join(backupDir, "language-schema-before.sql");
  const rowsPath = path.join(backupDir, "language-rows-before.json");
  const manifestPath = path.join(backupDir, "migration-manifest-before.json");
  const manifest = {
    migration: MIGRATION_NAME,
    created_at: new Date().toISOString(),
    state: state.state,
    target_codes: TARGET_LANGUAGES.map((language) => language.code),
    auto_increment: readAutoIncrement(state.createTable),
    volumes: state.volumes,
  };
  await fs.writeFile(schemaPath, `${state.createTable};\n`, { encoding: "utf8", flag: "wx" });
  await fs.writeFile(rowsPath, `${JSON.stringify(state.languages, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { schemaPath, rowsPath, manifestPath };
}

async function readBackup(backupDir) {
  const [schema, rows, manifest] = await Promise.all([
    fs.readFile(path.join(backupDir, "language-schema-before.sql"), "utf8"),
    fs.readFile(path.join(backupDir, "language-rows-before.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(backupDir, "migration-manifest-before.json"), "utf8").then(JSON.parse),
  ]);
  if (manifest.migration !== MIGRATION_NAME || manifest.state !== "pending") {
    throw new Error("Restauration refusée : manifeste de sauvegarde inattendu.");
  }
  if (classifyLanguageState(rows) !== "pending") {
    throw new Error("Restauration refusée : la sauvegarde ne contient pas les cinq lignes initiales exactes.");
  }
  validateFunctionalVolumes(manifest.volumes);
  if (!Number.isInteger(Number(manifest.auto_increment)) || Number(manifest.auto_increment) !== 6) {
    throw new Error("Restauration refusée : auto-incrément initial inattendu.");
  }
  return { schema, rows: rows.map(normalizeRow), manifest };
}

async function applyLanguages(pool, backupDir) {
  const before = await readState(pool);
  if (before.state === "applied") {
    validateNoDependencies(before.dependencies);
    return { mode: "apply", state: "already_applied", changed_rows: 0, after: before };
  }
  const backup = await writeBackup(backupDir, before);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("SELECT id FROM language ORDER BY id FOR UPDATE");
    const locked = await readState(connection);
    if (locked.state !== "pending") throw new Error("Application refusée : l’état a changé après la sauvegarde.");
    validateNoDependencies(locked.dependencies);
    const values = TARGET_LANGUAGES.flatMap((language) => [
      language.code, language.name, language.family, language.is_romance,
      language.documentation_status, language.is_active,
    ]);
    const valueSlots = TARGET_LANGUAGES.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const [result] = await connection.execute(`
      INSERT INTO language (code, name, family, is_romance, documentation_status, is_active)
      VALUES ${valueSlots}
    `, values);
    if (Number(result.affectedRows) !== TARGET_LANGUAGES.length) {
      throw new Error(`Application incomplète : ${result.affectedRows} insertion(s) au lieu de sept.`);
    }
    const after = await readState(connection);
    if (after.state !== "applied") throw new Error("Application incomplète : état final inattendu.");
    validateNoDependencies(after.dependencies);
    await connection.commit();
    return { mode: "apply", state: "applied", changed_rows: 7, backup, before, after };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rollbackLanguages(pool, backupDir) {
  const backup = await readBackup(backupDir);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("SELECT id FROM language ORDER BY id FOR UPDATE");
    const before = await readState(connection, { validateVolumes: false });
    if (before.state !== "applied") {
      throw new Error("Restauration refusée : les sept langues exactes ne sont pas toutes présentes.");
    }
    validateNoDependencies(before.dependencies);
    validateFunctionalVolumes(before.volumes);
    const codes = TARGET_LANGUAGES.map((language) => language.code);
    const [result] = await connection.execute(
      `DELETE FROM language WHERE code IN (${codes.map(() => "?").join(", ")})`, codes
    );
    if (Number(result.affectedRows) !== TARGET_LANGUAGES.length) {
      throw new Error(`Restauration incomplète : ${result.affectedRows} suppression(s) au lieu de sept.`);
    }
    const afterDelete = await readState(connection);
    if (afterDelete.state !== "pending" || JSON.stringify(afterDelete.languages) !== JSON.stringify(backup.rows)) {
      throw new Error("Restauration incomplète : les cinq lignes initiales ne sont pas rétablies exactement.");
    }
    await connection.commit();
    const autoIncrement = Number(backup.manifest.auto_increment);
    await pool.query(`ALTER TABLE language AUTO_INCREMENT = ${autoIncrement}`);
    const after = await readState(pool);
    if (after.state !== "pending" || readAutoIncrement(after.createTable) !== autoIncrement) {
      throw new Error("Restauration incomplète : l’auto-incrément initial n’a pas été rétabli.");
    }
    return { mode: "rollback", state: "restored", changed_rows: 7, before, after };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  const { mode, backupDir } = parseArguments(process.argv);
  const pool = createPool();
  try {
    const result = mode === "--check"
      ? { mode: "check", ...(await readState(pool)) }
      : mode === "--apply"
        ? await applyLanguages(pool, backupDir)
        : await rollbackLanguages(pool, backupDir);
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
  BASE_LANGUAGES,
  CONSTRAINT_NAME,
  EXPECTED_FUNCTIONAL_VOLUMES,
  TARGET_LANGUAGES,
  classifyLanguageState,
  parseArguments,
  totalDependencies,
  validateFunctionalVolumes,
  validateNoDependencies,
  validateSchema,
};
