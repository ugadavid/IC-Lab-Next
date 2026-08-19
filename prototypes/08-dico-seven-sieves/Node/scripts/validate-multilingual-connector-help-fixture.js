"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createPool, createRepository } = require("../src/repository");
const {
  MISSION_SOURCE_LABEL,
  apply,
  inspect,
  loadBackup,
  loadPlan,
  rollback,
  sha256,
} = require("./manage-multilingual-connector-helps");

const FIXTURE_PORT = 3307;

function safeIdentifier(value) {
  if (!/^[a-z0-9_]+$/i.test(value)) throw new Error(`Identifiant SQL inattendu : ${value}.`);
  return `\`${value}\``;
}

async function copyCompleteDatabase(source, fixture) {
  const [tableRows] = await source.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableKey = Object.keys(tableRows[0] || {}).find((key) => key.startsWith("Tables_in_"));
  const tables = tableRows.map((row) => row[tableKey]);
  const fixtureConnection = await fixture.getConnection();
  try {
    await fixtureConnection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of tables) {
      const identifier = safeIdentifier(table);
      const [createRows] = await source.query(`SHOW CREATE TABLE ${identifier}`);
      await fixtureConnection.query(createRows[0]["Create Table"]);
      const [rows] = await source.query(`SELECT * FROM ${identifier} ORDER BY id`);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        for (let offset = 0; offset < rows.length; offset += 200) {
          const chunk = rows.slice(offset, offset + 200);
          await fixtureConnection.query(
            "INSERT INTO ?? (??) VALUES ?",
            [table, columns, chunk.map((row) => columns.map((column) => row[column]))]
          );
        }
      }
      const [autoRows] = await source.execute(`
        SELECT AUTO_INCREMENT AS value
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      `, [table]);
      if (autoRows[0]?.value) await fixtureConnection.query(`ALTER TABLE ${identifier} AUTO_INCREMENT = ${Number(autoRows[0].value)}`);
    }
    await fixtureConnection.query("SET FOREIGN_KEY_CHECKS = 1");

    const [procedureRows] = await source.query("SHOW PROCEDURE STATUS WHERE Db = DATABASE()");
    const procedures = procedureRows.sort((left, right) => left.Name.localeCompare(right.Name));
    for (const procedure of procedures) {
      const [createRows] = await source.query(`SHOW CREATE PROCEDURE ${safeIdentifier(procedure.Name)}`);
      const statement = createRows[0]["Create Procedure"].replace(
        /^CREATE\s+DEFINER=`[^`]+`@`[^`]+`\s+PROCEDURE/i,
        "CREATE PROCEDURE"
      );
      await fixtureConnection.query(statement);
    }
    return { tables, procedures: procedures.map((row) => row.Name) };
  } finally {
    fixtureConnection.release();
  }
}

async function insertPlanRow(executor, row, sourceLabel = row.source_label, functionOverride = row.discourse_function) {
  const [languages] = await executor.execute("SELECT id FROM language WHERE code = ?", [row.language_code]);
  await executor.execute(`
    INSERT INTO connector_help (
      language_id, lexical_entry_id, expression, normalized_expression,
      discourse_function, pedagogical_title, pedagogical_hint, example,
      caution, status, source_label, notes
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    languages[0].id, row.expression, row.normalized_expression, functionOverride,
    row.pedagogical_title, row.pedagogical_hint, row.example, row.caution,
    row.status, sourceLabel, row.notes,
  ]);
}

async function expectRefusal(operation, pattern) {
  let message = "";
  try {
    await operation();
  } catch (error) {
    message = error.message;
  }
  assert.match(message, pattern);
  return message;
}

async function distribution(pool) {
  const [rows] = await pool.query(`
    SELECT l.code, COUNT(ch.id) AS total, COUNT(DISTINCT ch.discourse_function) AS functions
    FROM language l
    LEFT JOIN connector_help ch ON ch.language_id = l.id
    GROUP BY l.id
    ORDER BY l.id
  `);
  return Object.fromEntries(rows.map((row) => [row.code, {
    total: Number(row.total), functions: Number(row.functions),
  }]));
}

async function main() {
  const backupIndex = process.argv.indexOf("--backup");
  const evidenceIndex = process.argv.indexOf("--evidence");
  if (backupIndex < 0 || !process.argv[backupIndex + 1]) throw new Error("Préciser --backup <fichier>.");
  if (evidenceIndex < 0 || !process.argv[evidenceIndex + 1]) throw new Error("Préciser --evidence <fichier>.");
  const evidencePath = path.resolve(process.argv[evidenceIndex + 1]);
  const plan = loadPlan();
  const backup = loadBackup(process.argv[backupIndex + 1]);
  const source = createPool();
  const fixture = createPool({ host: "127.0.0.1", port: FIXTURE_PORT });
  try {
    const copied = await copyCompleteDatabase(source, fixture);
    assert.equal(copied.tables.length, 8);
    assert.equal(copied.procedures.length, 9);
    const initial = await inspect(fixture, plan, backup);
    assert.equal(initial.state, "pending");

    const applied = await apply(fixture, plan, backup);
    assert.equal(applied.changed_rows, 15);
    const appliedDistribution = await distribution(fixture);
    assert.deepEqual(appliedDistribution.fr, { total: 6, functions: 5 });
    assert.deepEqual(appliedDistribution.es, { total: 6, functions: 5 });
    for (const code of ["it", "pt", "en"]) assert.deepEqual(appliedDistribution[code], { total: 5, functions: 5 });

    const replayed = await apply(fixture, plan, backup);
    assert.equal(replayed.changed_rows, 0);

    const italianId = (await fixture.execute("SELECT id FROM language WHERE code = 'it'"))[0][0].id;
    await fixture.execute(`
      INSERT INTO connector_help (
        language_id, expression, normalized_expression, discourse_function,
        pedagogical_title, pedagogical_hint, status, source_label, notes
      ) VALUES (?, 'proposta fixture', 'proposta fixture', 'ADDITION',
        'Fixture', 'Ne doit pas être exposée.', 'PROPOSED', 'fixture_mission_218', 'Fixture jetable.')
    `, [italianId]);
    const publicItalian = await createRepository(fixture).getConnectorHelps({ language: "it", limit: 100, offset: 0 });
    assert.equal(publicItalian.total, 5);
    assert.equal(publicItalian.items.some((row) => row.normalized_expression === "proposta fixture"), false);
    await fixture.execute("DELETE FROM connector_help WHERE source_label = 'fixture_mission_218'");

    await fixture.execute(`
      UPDATE connector_help ch
      JOIN language l ON l.id = ch.language_id
      SET ch.pedagogical_hint = 'Altération de fixture'
      WHERE l.code = 'it' AND ch.normalized_expression = 'tuttavia'
        AND ch.source_label = ?
    `, [MISSION_SOURCE_LABEL]);
    const modifiedRollbackRefusal = await expectRefusal(
      () => rollback(fixture, plan, backup),
      /partial|rollback refusé/i
    );
    const tuttavia = plan.rows.find((row) => row.language_code === "it" && row.normalized_expression === "tuttavia");
    await fixture.execute(`
      UPDATE connector_help ch
      JOIN language l ON l.id = ch.language_id
      SET ch.pedagogical_hint = ?
      WHERE l.code = 'it' AND ch.normalized_expression = 'tuttavia'
        AND ch.source_label = ?
    `, [tuttavia.pedagogical_hint, MISSION_SOURCE_LABEL]);

    const rolledBack = await rollback(fixture, plan, backup);
    assert.equal(rolledBack.changed_rows, 15);
    assert.equal(rolledBack.hashes.connector_help, backup.table_hashes.connector_help);
    assert.equal(rolledBack.auto_increment, backup.connector_help_auto_increment);

    await insertPlanRow(fixture, plan.rows[0]);
    const partialRefusal = await expectRefusal(() => apply(fixture, plan, backup), /partial/i);
    await fixture.execute("DELETE FROM connector_help WHERE source_label = ?", [MISSION_SOURCE_LABEL]);
    await fixture.query(`ALTER TABLE connector_help AUTO_INCREMENT = ${Number(backup.connector_help_auto_increment)}`);

    await insertPlanRow(fixture, plan.rows[0], "fixture_collision", "CAUSE");
    const collisionRefusal = await expectRefusal(() => apply(fixture, plan, backup), /unknown|collision|conflit/i);
    await fixture.execute("DELETE FROM connector_help WHERE source_label = 'fixture_collision'");
    await fixture.query(`ALTER TABLE connector_help AUTO_INCREMENT = ${Number(backup.connector_help_auto_increment)}`);

    const final = await inspect(fixture, plan, backup);
    assert.equal(final.state, "pending");
    assert.deepEqual(final.counts, backup.counts);
    assert.deepEqual(final.hashes, backup.table_hashes);

    const evidence = {
      mission: 218,
      generated_at: new Date().toISOString(),
      fixture: { engine: "MariaDB 11", port: FIXTURE_PORT, removed_by_orchestrator: false },
      complete_copy: { table_count: copied.tables.length, procedure_count: copied.procedures.length },
      initial: { state: initial.state, counts: initial.counts, hashes: initial.hashes, auto_increment: initial.auto_increment },
      application: { changed_rows: applied.changed_rows, total: applied.counts.connector_help, distribution: appliedDistribution },
      idempotent_replay: { changed_rows: replayed.changed_rows, state: replayed.state },
      proposed_public_filter: { injected: 1, public_it_total: publicItalian.total, exposed: false, removed: 1 },
      modified_row_rollback_refusal: modifiedRollbackRefusal,
      rollback: { changed_rows: rolledBack.changed_rows, state: rolledBack.state, auto_increment: rolledBack.auto_increment },
      partial_state_refusal: partialRefusal,
      collision_refusal: collisionRefusal,
      final_restoration: { state: final.state, counts: final.counts, hashes: final.hashes, auto_increment: final.auto_increment },
    };
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(JSON.stringify({ evidence: evidencePath, sha256: sha256(fs.readFileSync(evidencePath)), ...evidence }, null, 2));
  } finally {
    await source.end();
    await fixture.end();
  }
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
