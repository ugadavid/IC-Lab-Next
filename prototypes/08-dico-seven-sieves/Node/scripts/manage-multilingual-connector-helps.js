"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createPool } = require("../src/repository");

const ROOT = path.resolve(__dirname, "../../../..");
const PLAN_PATH = path.join(
  ROOT,
  "reports/assets/218_dico_ic_multilingual_connector_help_seed/mission_218_frozen_plan.json"
);
const SOURCE_MATRIX_PATH = path.join(
  ROOT,
  "reports/assets/216_dico_ic_connector_help_catalog_audit/proposed_multilingual_matrix.json"
);
const TABLES = Object.freeze([
  "language",
  "lexical_entry",
  "lexical_form",
  "inflected_form",
  "connector_help",
  "form_relation",
  "pattern_rule",
  "ic_feature",
]);
const EXPECTED_INITIAL_COUNTS = Object.freeze({
  language: 12,
  lexical_entry: 305,
  lexical_form: 1286,
  inflected_form: 41,
  connector_help: 12,
  form_relation: 86,
  pattern_rule: 1,
  ic_feature: 8,
});
const EXPECTED_INITIAL_HASHES = Object.freeze({
  language: "9956ca164174656abb6fe57a73ab11cb95b527263744290fb5de932e97b74cff",
  lexical_entry: "34e32bd46e20d5bbc3b45f1171edecc54895eafc0b93a417e6c2e78d9e56d7ec",
  lexical_form: "a13665b8b26c4994bd0d491160fd93c7698dfb08b18bb909383f2e3781bb1c41",
  inflected_form: "35d15bb6b4c68441809397abc1691e9270e430b8befd24645fa0f0d065ed5184",
  connector_help: "10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846",
  form_relation: "216f0b7ba7055791d9b08286eb8210cb506f9d57b17533446de81e2fb0651a15",
  pattern_rule: "432537d637c3770d6ef60b1ba061799c0f0b0fac076fd1a2600d5e1ca12ba22d",
  ic_feature: "d0b7789145816be38945546c51000109d3ed156021b9874df76b15c2a084b44a",
});
const MISSION_SOURCE_LABEL = "Noyau multilingue Dico-IC";
const MISSION_NOTES = "Catalogue de travail à revoir avec Christian et Sylvain.";
const TARGET_LANGUAGES = Object.freeze(["it", "pt", "en"]);
const FUNCTIONS = Object.freeze(["OPPOSITION", "CAUSE", "CONSEQUENCE", "ADDITION", "CHRONOLOGY"]);
const CONTENT_FIELDS = Object.freeze([
  "language_code",
  "expression",
  "normalized_expression",
  "discourse_function",
  "pedagogical_title",
  "pedagogical_hint",
  "example",
  "caution",
  "status",
  "source_label",
  "notes",
  "lexical_entry_id",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableRowsHash(rows) {
  return sha256(JSON.stringify(stableClone(rows)));
}

function rowContent(row) {
  return Object.fromEntries(CONTENT_FIELDS.map((field) => [field, row[field] ?? null]));
}

function contentFingerprint(row) {
  return sha256(JSON.stringify(rowContent(row)));
}

function identityFingerprint(row) {
  return sha256(JSON.stringify([
    row.language_code,
    row.normalized_expression,
    row.discourse_function,
    row.source_label,
  ]));
}

function loadPlan() {
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
  const matrix = JSON.parse(fs.readFileSync(SOURCE_MATRIX_PATH, "utf8"));
  if (plan.mission !== 218 || !Array.isArray(plan.rows) || plan.rows.length !== 15) {
    throw new Error("Le plan Mission 218 doit contenir exactement quinze lignes.");
  }
  const matrixRows = matrix.candidates.filter((row) => TARGET_LANGUAGES.includes(row.language_code.toLowerCase()));
  if (matrixRows.length !== 15) throw new Error("La matrice Mission 216 ne contient pas les quinze candidats attendus.");
  const identities = new Set();
  for (const row of plan.rows) {
    if (!TARGET_LANGUAGES.includes(row.language_code)) throw new Error(`Langue interdite dans le plan : ${row.language_code}.`);
    if (!FUNCTIONS.includes(row.discourse_function)) throw new Error(`Fonction interdite : ${row.discourse_function}.`);
    if (row.status !== "VALIDATED" || row.source_label !== MISSION_SOURCE_LABEL || row.notes !== MISSION_NOTES) {
      throw new Error("Statut, provenance ou note Mission 218 divergents.");
    }
    if (row.lexical_entry_id !== null) throw new Error("Aucun lien lexical ne doit être créé par la Mission 218.");
    const identity = `${row.language_code}\u0000${row.normalized_expression}`;
    if (identities.has(identity)) throw new Error(`Expression normalisée répétée : ${row.language_code}/${row.normalized_expression}.`);
    identities.add(identity);
    const source = matrixRows.find((candidate) => (
      candidate.language_code.toLowerCase() === row.language_code
      && candidate.normalized_expression === row.normalized_expression
      && candidate.discourse_function === row.discourse_function
    ));
    if (!source) throw new Error(`Candidat absent de la matrice : ${identity}.`);
    for (const field of [
      "expression", "normalized_expression", "discourse_function", "pedagogical_title",
      "pedagogical_hint", "example", "caution",
    ]) {
      if (row[field] !== source[field]) throw new Error(`Divergence avec la matrice pour ${identity}, champ ${field}.`);
    }
  }
  for (const language of TARGET_LANGUAGES) {
    const rows = plan.rows.filter((row) => row.language_code === language);
    if (rows.length !== 5 || new Set(rows.map((row) => row.discourse_function)).size !== 5) {
      throw new Error(`La langue ${language} doit couvrir les cinq fonctions une fois.`);
    }
  }
  return {
    ...plan,
    rows: plan.rows.map((row) => Object.freeze({
      ...row,
      identity_fingerprint: identityFingerprint(row),
      content_fingerprint: contentFingerprint(row),
    })),
  };
}

async function readCounts(executor) {
  const counts = {};
  for (const table of TABLES) {
    const [rows] = await executor.query(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = Number(rows[0].count);
  }
  return counts;
}

async function readTableRows(executor, table) {
  const [rows] = await executor.query(`SELECT * FROM ${table} ORDER BY id`);
  return stableClone(rows);
}

async function readTableHashes(executor) {
  const hashes = {};
  for (const table of TABLES) hashes[table] = stableRowsHash(await readTableRows(executor, table));
  return hashes;
}

async function readAutoIncrement(executor) {
  const [rows] = await executor.query(`
    SELECT AUTO_INCREMENT AS value
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'connector_help'
  `);
  return Number(rows[0].value);
}

async function readJoinedConnectorRows(executor, lock = false) {
  const [rows] = await executor.query(`
    SELECT ch.*, l.code AS language_code
    FROM connector_help ch
    JOIN language l ON l.id = ch.language_id
    ORDER BY ch.id${lock ? " FOR UPDATE" : ""}
  `);
  return stableClone(rows);
}

async function verifyTargetLanguages(executor, lock = false) {
  const placeholders = TARGET_LANGUAGES.map(() => "?").join(", ");
  const [rows] = await executor.execute(`
    SELECT id, code, is_active, documentation_status
    FROM language
    WHERE code IN (${placeholders})
    ORDER BY code${lock ? " FOR UPDATE" : ""}
  `, TARGET_LANGUAGES);
  if (rows.length !== 3) throw new Error("Les trois langues cibles ne sont pas toutes présentes.");
  for (const row of rows) {
    if (Number(row.is_active) !== 1 || row.documentation_status !== "DOCUMENTED") {
      throw new Error(`La langue ${row.code} n’est pas active et DOCUMENTED.`);
    }
  }
  return new Map(rows.map((row) => [row.code, Number(row.id)]));
}

function assertObjectEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} divergent.`);
}

function loadBackup(backupPath) {
  if (!backupPath) throw new Error("Préciser --backup <fichier>.");
  const resolved = path.resolve(backupPath);
  const backup = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (backup.mission !== 218 || backup.connector_help_rows.length !== 12) {
    throw new Error("Sauvegarde Mission 218 invalide.");
  }
  if (backup.plan_sha256 !== sha256(fs.readFileSync(PLAN_PATH))) throw new Error("Le plan a changé depuis la sauvegarde.");
  if (backup.source_matrix_sha256 !== sha256(fs.readFileSync(SOURCE_MATRIX_PATH))) throw new Error("La matrice source a changé depuis la sauvegarde.");
  if (stableRowsHash(backup.connector_help_rows) !== backup.connector_help_rows_sha256) {
    throw new Error("Empreinte interne de la sauvegarde invalide.");
  }
  return backup;
}

function classifyAdditionalRows(additionalRows, plan) {
  if (additionalRows.length === 0) return "pending";
  const expectedFingerprints = new Set(plan.rows.map((row) => row.content_fingerprint));
  const actualFingerprints = additionalRows.map(contentFingerprint);
  const exact = actualFingerprints.filter((fingerprint) => expectedFingerprints.has(fingerprint));
  if (additionalRows.length === 15 && exact.length === 15 && new Set(actualFingerprints).size === 15) return "applied";
  if (exact.length > 0) return "partial";
  return "unknown";
}

function assertNoConflicts(rows, plan) {
  for (const target of plan.rows) {
    const exactKey = rows.find((row) => (
      row.language_code === target.language_code
      && row.normalized_expression === target.normalized_expression
      && row.discourse_function === target.discourse_function
    ));
    if (exactKey) throw new Error(`Collision exacte : ${target.language_code}/${target.normalized_expression}/${target.discourse_function}.`);
    const validatedExpression = rows.find((row) => (
      row.language_code === target.language_code
      && row.normalized_expression === target.normalized_expression
      && row.status === "VALIDATED"
    ));
    if (validatedExpression) throw new Error(`Conflit applicatif validé : ${target.language_code}/${target.normalized_expression}.`);
  }
}

async function inspect(executor, plan, backup, { lock = false } = {}) {
  await verifyTargetLanguages(executor, lock);
  const counts = await readCounts(executor);
  const hashes = await readTableHashes(executor);
  for (const table of TABLES.filter((name) => name !== "connector_help")) {
    if (counts[table] !== backup.counts[table] || hashes[table] !== backup.table_hashes[table]) {
      throw new Error(`La table ${table} a changé depuis la sauvegarde.`);
    }
  }
  const rawRows = await readTableRows(executor, "connector_help");
  const joinedRows = await readJoinedConnectorRows(executor, lock);
  const historicalIds = new Set(backup.connector_help_rows.map((row) => Number(row.id)));
  const historicalRows = rawRows.filter((row) => historicalIds.has(Number(row.id)));
  if (historicalRows.length !== 12 || stableRowsHash(historicalRows) !== backup.connector_help_rows_sha256) {
    throw new Error("Une des douze aides historiques a changé.");
  }
  const additionalRows = joinedRows.filter((row) => !historicalIds.has(Number(row.id)));
  const state = classifyAdditionalRows(additionalRows, plan);
  const expectedCount = state === "pending" ? 12 : state === "applied" ? 27 : null;
  if (expectedCount !== null && counts.connector_help !== expectedCount) {
    throw new Error(`Volume connector_help incompatible avec l’état ${state}.`);
  }
  if (state === "pending") assertNoConflicts(joinedRows, plan);
  return {
    state,
    counts,
    hashes,
    auto_increment: await readAutoIncrement(executor),
    historical_rows_sha256: stableRowsHash(historicalRows),
    additionalRows,
  };
}

async function createBackup(pool, outputPath) {
  const resolved = path.resolve(outputPath);
  const allowedRoot = path.dirname(PLAN_PATH) + path.sep;
  if (!resolved.startsWith(allowedRoot)) throw new Error("La sauvegarde doit rester dans le dossier d’artefacts Mission 218.");
  const plan = loadPlan();
  await verifyTargetLanguages(pool);
  const counts = await readCounts(pool);
  const tableHashes = await readTableHashes(pool);
  assertObjectEqual(counts, EXPECTED_INITIAL_COUNTS, "Volumes initiaux");
  assertObjectEqual(tableHashes, EXPECTED_INITIAL_HASHES, "Empreintes initiales");
  const joinedRows = await readJoinedConnectorRows(pool);
  assertNoConflicts(joinedRows, plan);
  const connectorRows = await readTableRows(pool, "connector_help");
  const backup = {
    mission: 218,
    created_at: new Date().toISOString(),
    database: "ic_dico",
    plan_sha256: sha256(fs.readFileSync(PLAN_PATH)),
    source_matrix_sha256: sha256(fs.readFileSync(SOURCE_MATRIX_PATH)),
    counts,
    table_hashes: tableHashes,
    connector_help_auto_increment: await readAutoIncrement(pool),
    connector_help_rows_sha256: stableRowsHash(connectorRows),
    connector_help_rows: connectorRows,
  };
  fs.writeFileSync(resolved, `${JSON.stringify(backup, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { output: resolved, rows: connectorRows.length, sha256: sha256(fs.readFileSync(resolved)) };
}

async function apply(pool, plan, backup) {
  const before = await inspect(pool, plan, backup);
  if (before.state === "applied") return { mode: "apply", state: "already_applied", changed_rows: 0, ...before };
  if (before.state !== "pending") throw new Error(`État ${before.state} : application refusée.`);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locked = await inspect(connection, plan, backup, { lock: true });
    if (locked.state !== "pending") throw new Error("État modifié avant verrouillage : application refusée.");
    const languageIds = await verifyTargetLanguages(connection, true);
    const insertedIds = [];
    for (const row of plan.rows) {
      const [result] = await connection.execute(`
        INSERT INTO connector_help (
          language_id, lexical_entry_id, expression, normalized_expression,
          discourse_function, pedagogical_title, pedagogical_hint, example,
          caution, status, source_label, notes
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        languageIds.get(row.language_code), row.expression, row.normalized_expression,
        row.discourse_function, row.pedagogical_title, row.pedagogical_hint, row.example,
        row.caution, row.status, row.source_label, row.notes,
      ]);
      insertedIds.push(Number(result.insertId));
    }
    const after = await inspect(connection, plan, backup);
    if (after.state !== "applied" || insertedIds.length !== 15) throw new Error("Postconditions d’application non satisfaites.");
    await connection.commit();
    return { mode: "apply", state: "applied", changed_rows: 15, inserted_ids: insertedIds, ...after };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rollback(pool, plan, backup) {
  const before = await inspect(pool, plan, backup);
  if (before.state === "pending") return { mode: "rollback", state: "already_restored", changed_rows: 0, ...before };
  if (before.state !== "applied") throw new Error(`État ${before.state} : rollback refusé.`);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locked = await inspect(connection, plan, backup, { lock: true });
    if (locked.state !== "applied") throw new Error("État modifié avant verrouillage : rollback refusé.");
    for (const row of locked.additionalRows) {
      const expected = plan.rows.find((target) => contentFingerprint(target) === contentFingerprint(row));
      if (!expected || identityFingerprint(row) !== expected.identity_fingerprint) {
        throw new Error(`Empreinte de rollback inattendue pour l’ID ${row.id}.`);
      }
      const [result] = await connection.execute(`
        DELETE FROM connector_help
        WHERE id = ? AND language_id = ?
          AND BINARY normalized_expression = BINARY ?
          AND discourse_function = ?
          AND BINARY source_label = BINARY ?
          AND lexical_entry_id IS NULL
      `, [row.id, row.language_id, row.normalized_expression, row.discourse_function, row.source_label]);
      if (Number(result.affectedRows) !== 1) throw new Error(`Suppression refusée pour l’ID ${row.id}.`);
    }
    const after = await inspect(connection, plan, backup);
    if (after.state !== "pending") throw new Error("Postconditions de rollback non satisfaites.");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  await pool.query(`ALTER TABLE connector_help AUTO_INCREMENT = ${Number(backup.connector_help_auto_increment)}`);
  const restored = await inspect(pool, plan, backup);
  if (restored.auto_increment !== Number(backup.connector_help_auto_increment)) {
    throw new Error("L’auto-incrément initial n’a pas été restauré.");
  }
  return { mode: "rollback", state: "restored", changed_rows: 15, ...restored };
}

function parseArgs(argv) {
  const modes = ["--check", "--apply", "--rollback"].filter((mode) => argv.includes(mode));
  if (modes.length !== 1) throw new Error("Choisir exactement un mode : --check, --apply ou --rollback.");
  const backupIndex = argv.indexOf("--backup");
  if (backupIndex < 0 || !argv[backupIndex + 1]) throw new Error("Préciser --backup <fichier>.");
  return { mode: modes[0].slice(2), backupPath: argv[backupIndex + 1] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = loadPlan();
  const backup = loadBackup(args.backupPath);
  const pool = createPool();
  try {
    if (args.mode === "apply") return console.log(JSON.stringify(await apply(pool, plan, backup), null, 2));
    if (args.mode === "rollback") return console.log(JSON.stringify(await rollback(pool, plan, backup), null, 2));
    const result = await inspect(pool, plan, backup);
    console.log(JSON.stringify({ mode: "check", ...result, additionalRows: undefined }, null, 2));
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = {
  EXPECTED_INITIAL_COUNTS,
  EXPECTED_INITIAL_HASHES,
  FUNCTIONS,
  MISSION_NOTES,
  MISSION_SOURCE_LABEL,
  PLAN_PATH,
  SOURCE_MATRIX_PATH,
  TARGET_LANGUAGES,
  apply,
  classifyAdditionalRows,
  contentFingerprint,
  createBackup,
  identityFingerprint,
  inspect,
  loadBackup,
  loadPlan,
  parseArgs,
  rollback,
  sha256,
  stableRowsHash,
};
