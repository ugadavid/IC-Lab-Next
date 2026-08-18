"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { createPool } = require("../src/repository");

const CANONICAL_SOURCE_LABEL = "manual_seed";
const EXPECTED_FORMS = [
  { language: "fr", lemma: "information", normalized_lemma: "information", part_of_speech: "noun" },
  { language: "es", lemma: "información", normalized_lemma: "informacion", part_of_speech: "noun" },
  { language: "it", lemma: "informazione", normalized_lemma: "informazione", part_of_speech: "noun" },
  { language: "pt", lemma: "informação", normalized_lemma: "informacao", part_of_speech: "noun" },
  { language: "en", lemma: "information", normalized_lemma: "information", part_of_speech: "noun" },
];

const SELECT_TARGETS = `
  SELECT
    lf.id,
    le.entry_key,
    l.code AS language,
    lf.lemma,
    lf.normalized_lemma,
    lf.part_of_speech,
    lf.source_label,
    lf.confidence_score
  FROM lexical_form lf
  JOIN lexical_entry le ON le.id = lf.entry_id
  JOIN language l ON l.id = lf.language_id
  WHERE le.entry_key = 'INFORMATION_DATA'
  ORDER BY FIELD(l.code, 'fr', 'es', 'it', 'pt', 'en'), lf.id
`;

function validateTargetForms(rows) {
  if (!Array.isArray(rows) || rows.length !== EXPECTED_FORMS.length) {
    throw new Error(`Correction refusée : ${EXPECTED_FORMS.length} formes attendues, ${rows?.length ?? 0} trouvée(s).`);
  }
  rows.forEach((row, index) => {
    const expected = EXPECTED_FORMS[index];
    for (const field of ["language", "lemma", "normalized_lemma", "part_of_speech"]) {
      if (row[field] !== expected[field]) {
        throw new Error(`Correction refusée : forme ${index + 1}, ${field} inattendu (${row[field]}).`);
      }
    }
    if (row.entry_key !== "INFORMATION_DATA" || !Number.isSafeInteger(Number(row.id))) {
      throw new Error(`Correction refusée : identité invalide pour la forme ${index + 1}.`);
    }
  });
  if (new Set(rows.map((row) => Number(row.id))).size !== rows.length) {
    throw new Error("Correction refusée : identifiants de formes dupliqués.");
  }
  return rows;
}

function parseArguments(argv) {
  const mode = argv[2] || "--check";
  const backupFlag = argv.indexOf("--backup");
  const backupPath = backupFlag >= 0 ? argv[backupFlag + 1] : null;
  if (!new Set(["--check", "--apply", "--rollback"]).has(mode)) {
    throw new Error("Usage : --check | --apply --backup <fichier> | --rollback --backup <fichier>");
  }
  if (mode !== "--check" && !backupPath) {
    throw new Error("Un chemin --backup est obligatoire pour appliquer ou restaurer la correction.");
  }
  return { mode, backupPath: backupPath ? path.resolve(backupPath) : null };
}

async function readTargetForms(executor, lock = false) {
  const [rows] = await executor.execute(`${SELECT_TARGETS}${lock ? " FOR UPDATE" : ""}`);
  return validateTargetForms(rows);
}

async function databaseTotals(executor) {
  const [rows] = await executor.execute(`
    SELECT
      COUNT(*) AS lexical_forms,
      SUM(source_label IS NULL) AS null_sources,
      SUM(source_label = 'manual_seed') AS manual_seed_sources
    FROM lexical_form
  `);
  return rows[0];
}

async function writeBackup(backupPath, rows, totals) {
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  const backup = {
    correction: "INFORMATION_DATA lexical_form source_label",
    created_at: new Date().toISOString(),
    canonical_source_label: CANONICAL_SOURCE_LABEL,
    rows,
    database_totals: totals,
  };
  await fs.writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

async function applyCorrection(pool, backupPath) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const rows = await readTargetForms(connection, true);
    const invalidSources = rows.filter((row) => !new Set([null, CANONICAL_SOURCE_LABEL]).has(row.source_label));
    if (invalidSources.length) throw new Error("Correction refusée : une provenance existante ne doit pas être écrasée.");
    const beforeTotals = await databaseTotals(connection);
    const pending = rows.filter((row) => row.source_label === null);
    if (pending.length === 0) {
      await connection.commit();
      return { mode: "apply", changed_rows: 0, state: "already_applied", rows, before_totals: beforeTotals };
    }
    if (pending.length !== rows.length) {
      throw new Error("Correction refusée : état partiellement appliqué détecté.");
    }
    await writeBackup(backupPath, rows, beforeTotals);
    const ids = rows.map((row) => Number(row.id));
    const placeholders = ids.map(() => "?").join(", ");
    const [result] = await connection.execute(`
      UPDATE lexical_form
      SET source_label = ?
      WHERE id IN (${placeholders})
        AND source_label IS NULL
    `, [CANONICAL_SOURCE_LABEL, ...ids]);
    if (result.affectedRows !== EXPECTED_FORMS.length) {
      throw new Error(`Correction annulée : ${EXPECTED_FORMS.length} lignes devaient changer, ${result.affectedRows} ont changé.`);
    }
    const afterRows = await readTargetForms(connection, false);
    if (afterRows.some((row) => row.source_label !== CANONICAL_SOURCE_LABEL)) {
      throw new Error("Correction annulée : réconciliation finale incomplète.");
    }
    const afterTotals = await databaseTotals(connection);
    await connection.commit();
    return { mode: "apply", changed_rows: result.affectedRows, state: "applied", rows: afterRows, before_totals: beforeTotals, after_totals: afterTotals };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rollbackCorrection(pool, backupPath) {
  const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
  const backupRows = validateTargetForms(backup.rows);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const currentRows = await readTargetForms(connection, true);
    if (currentRows.some((row) => row.source_label !== CANONICAL_SOURCE_LABEL)) {
      throw new Error("Restauration refusée : les cinq formes ne portent pas toutes manual_seed.");
    }
    let changedRows = 0;
    for (const backupRow of backupRows) {
      const [result] = await connection.execute(`
        UPDATE lexical_form
        SET source_label = ?
        WHERE id = ? AND source_label = ?
      `, [backupRow.source_label, Number(backupRow.id), CANONICAL_SOURCE_LABEL]);
      changedRows += result.affectedRows;
    }
    if (changedRows !== EXPECTED_FORMS.length) {
      throw new Error(`Restauration annulée : ${EXPECTED_FORMS.length} lignes attendues, ${changedRows} modifiée(s).`);
    }
    const restoredRows = await readTargetForms(connection, false);
    restoredRows.forEach((row, index) => {
      if (row.source_label !== backupRows[index].source_label) {
        throw new Error("Restauration annulée : la sauvegarde n’a pas été restaurée exactement.");
      }
    });
    await connection.commit();
    return { mode: "rollback", changed_rows: changedRows, state: "restored", rows: restoredRows };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  const { mode, backupPath } = parseArguments(process.argv);
  const pool = createPool();
  try {
    if (mode === "--check") {
      const rows = await readTargetForms(pool);
      console.log(JSON.stringify({ mode: "check", rows, totals: await databaseTotals(pool) }, null, 2));
      return;
    }
    const result = mode === "--apply"
      ? await applyCorrection(pool, backupPath)
      : await rollbackCorrection(pool, backupPath);
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
  CANONICAL_SOURCE_LABEL,
  EXPECTED_FORMS,
  parseArguments,
  validateTargetForms,
};
