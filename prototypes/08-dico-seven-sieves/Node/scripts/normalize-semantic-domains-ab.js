"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createPool } = require("../src/repository");

const ROOT = path.resolve(__dirname, "../../../..");
const MAP_PATH = "reports/assets/207_dico_ic_semantic_domain_audit/semantic_domain_normalization_map.json";
const INVENTORY_PATH = "reports/assets/207_dico_ic_semantic_domain_audit/semantic_domain_inventory.csv";
const SOURCE_HASHES = Object.freeze({
  "reports/207_dico_ic_semantic_domain_audit.md": "f7d3d566f71325b534f9440774d4a61975d69ef93d43601321edb13f7a0c8130",
  [MAP_PATH]: "cdca09967e039b5be82e88c4165eef09e667fd661d33a289d2078240f0b45429",
  [INVENTORY_PATH]: "4faaeea542de206a44263da174b00d0323b7213bcc14f3c60e9bbb6b29e36071",
  "reports/assets/207_dico_ic_semantic_domain_audit/semantic_domain_usage_audit.md": "1e363d5fa8f31cea6d5978698f41eb0eccc2ec558b65fc94638e374b4c68230d",
  "reports/assets/207_dico_ic_semantic_domain_audit/semantic_domain_preflight_selects.sql": "a7b6efbb06c28e54ed9080305859a46b45f66cb419adcc2c87f536bdada91a36",
});
const EXPECTED_COUNTS = Object.freeze({
  language: 12,
  lexical_entry: 270,
  lexical_form: 1125,
  inflected_form: 41,
  connector_help: 12,
  form_relation: 70,
  pattern_rule: 1,
  ic_feature: 8,
});
const EXPECTED_MAPPINGS = Object.freeze([
  ["Action", "action"], ["Changement", "changement"], ["FOOD_NUTRITION", "alimentation"],
  ["GEOGRAPHY", "géographie"], ["Grammaire", "grammaire"], ["Qualité", "qualité"],
  ["biology", "biologie"], ["discourse", "discours"], ["economy", "économie"],
  ["education", "éducation"], ["food", "alimentation"], ["health", "santé"],
  ["language", "langue"], ["liaison", "relations logiques"], ["météo", "météorologie"],
  ["politics", "politique"], ["social", "relations sociales"], ["society", "société"],
  ["time", "temps"],
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableRowsHash(rows) {
  return sha256(JSON.stringify(rows));
}

function verifySources() {
  for (const [relativePath, expected] of Object.entries(SOURCE_HASHES)) {
    const actual = sha256(fs.readFileSync(path.join(ROOT, relativePath)));
    if (actual !== expected) throw new Error(`Source Mission 207 modifiée : ${relativePath}`);
  }
}

function loadPlan() {
  verifySources();
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, MAP_PATH), "utf8"));
  const mappings = source.mappings
    .filter((mapping) => mapping.category === "A" || mapping.category === "B")
    .map((mapping) => ({
      category: mapping.category,
      oldValue: mapping.current_value_exact,
      newValue: mapping.proposed_french_value,
      ids: mapping.entry_ids.map(Number).sort((a, b) => a - b),
    }));
  if (mappings.length !== 19 || mappings.reduce((sum, mapping) => sum + mapping.ids.length, 0) !== 38) {
    throw new Error("Le plan A/B doit contenir exactement 19 valeurs et 38 IDs.");
  }
  if (mappings.filter((mapping) => mapping.category === "A").length !== 14
      || mappings.filter((mapping) => mapping.category === "B").length !== 5) {
    throw new Error("Répartition A/B incohérente.");
  }
  const expected = EXPECTED_MAPPINGS.map((item) => item.join("\0")).sort();
  const actual = mappings.map((item) => [item.oldValue, item.newValue].join("\0")).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Mappings A/B inattendus.");
  const byId = new Map();
  for (const mapping of mappings) {
    for (const id of mapping.ids) {
      if (byId.has(id)) throw new Error(`ID ${id} répété dans le plan.`);
      byId.set(id, mapping);
    }
  }
  return { mappings, byId, ids: [...byId.keys()].sort((a, b) => a - b) };
}

function classifyState(rows, plan) {
  if (rows.length !== 38) return "partial";
  let initial = true;
  let final = true;
  for (const row of rows) {
    const mapping = plan.byId.get(Number(row.id));
    if (!mapping || row.semantic_domain !== mapping.oldValue) initial = false;
    if (!mapping || row.semantic_domain !== mapping.newValue) final = false;
  }
  if (initial) return "initial";
  if (final) return "final";
  return "partial";
}

async function readCounts(executor) {
  const counts = {};
  for (const table of Object.keys(EXPECTED_COUNTS)) {
    const [rows] = await executor.query(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = Number(rows[0].count);
  }
  return counts;
}

function assertCounts(counts) {
  for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[table] !== expected) throw new Error(`Compteur ${table} inattendu : ${counts[table]} au lieu de ${expected}.`);
  }
}

async function readAllEntries(executor) {
  const [rows] = await executor.query("SELECT * FROM lexical_entry ORDER BY id");
  return rows;
}

async function readAffected(executor, plan, lock = false) {
  const placeholders = plan.ids.map(() => "?").join(",");
  const [rows] = await executor.query(
    `SELECT * FROM lexical_entry WHERE id IN (${placeholders}) ORDER BY id${lock ? " FOR UPDATE" : ""}`,
    plan.ids
  );
  return rows;
}

function staticAffectedHash(rows) {
  return stableRowsHash(rows.map(({ semantic_domain: _domain, ...row }) => row));
}

function untouchedHash(rows, plan) {
  return stableRowsHash(rows.filter((row) => !plan.byId.has(Number(row.id))));
}

function loadBackup(filePath, plan) {
  if (!filePath) throw new Error("Une sauvegarde --backup est obligatoire.");
  const backup = JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
  if (backup.mission !== 208 || backup.affected_ids.length !== 38) throw new Error("Sauvegarde Mission 208 invalide.");
  if (JSON.stringify(backup.affected_ids) !== JSON.stringify(plan.ids)) throw new Error("IDs de sauvegarde incompatibles.");
  return backup;
}

async function inspect(executor, plan, backup, lock = false) {
  const counts = await readCounts(executor);
  assertCounts(counts);
  const allRows = await readAllEntries(executor);
  const affected = lock ? await readAffected(executor, plan, true) : allRows.filter((row) => plan.byId.has(Number(row.id)));
  const state = classifyState(affected, plan);
  if (untouchedHash(allRows, plan) !== backup.untouched_lexical_entry_hash) {
    throw new Error("Les entrées hors périmètre A/B ont changé.");
  }
  if (staticAffectedHash(affected) !== backup.affected_static_hash) {
    throw new Error("Une colonne autre que semantic_domain a changé sur les 38 IDs.");
  }
  const fullHash = stableRowsHash(allRows);
  const expectedHash = state === "initial" ? backup.initial_lexical_entry_hash
    : state === "final" ? backup.final_lexical_entry_hash : null;
  if (expectedHash && fullHash !== expectedHash) throw new Error(`Empreinte ${state} incompatible.`);
  return { state, counts, fullHash, affected };
}

async function apply(pool, plan, backup) {
  const before = await inspect(pool, plan, backup);
  if (before.state === "final") return { mode: "apply", state: "already_applied", changed_rows: 0, counts: before.counts, lexical_entry_hash: before.fullHash };
  if (before.state !== "initial") throw new Error("État MariaDB partiel ou inconnu : aucune écriture autorisée.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locked = await inspect(connection, plan, backup, true);
    if (locked.state !== "initial") throw new Error("État modifié avant verrouillage : transaction refusée.");
    let changed = 0;
    for (const id of plan.ids) {
      const mapping = plan.byId.get(id);
      const [result] = await connection.execute(
        "UPDATE lexical_entry SET semantic_domain=? WHERE id=? AND BINARY semantic_domain=BINARY ?",
        [mapping.newValue, id, mapping.oldValue]
      );
      if (result.affectedRows !== 1) throw new Error(`Mise à jour binaire refusée pour l’ID ${id}.`);
      changed += result.affectedRows;
    }
    const after = await inspect(connection, plan, backup);
    if (after.state !== "final" || changed !== 38) throw new Error("Postconditions d’application non satisfaites.");
    await connection.commit();
    return { mode: "apply", state: "applied", changed_rows: changed, counts: after.counts, lexical_entry_hash: after.fullHash };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rollback(pool, plan, backup) {
  const before = await inspect(pool, plan, backup);
  if (before.state === "initial") return { mode: "rollback", state: "already_restored", changed_rows: 0, counts: before.counts, lexical_entry_hash: before.fullHash };
  if (before.state !== "final") throw new Error("État MariaDB partiel ou inconnu : rollback refusé.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locked = await inspect(connection, plan, backup, true);
    if (locked.state !== "final") throw new Error("État modifié avant verrouillage : rollback refusé.");
    let changed = 0;
    for (const id of plan.ids) {
      const mapping = plan.byId.get(id);
      const [result] = await connection.execute(
        "UPDATE lexical_entry SET semantic_domain=? WHERE id=? AND BINARY semantic_domain=BINARY ?",
        [mapping.oldValue, id, mapping.newValue]
      );
      if (result.affectedRows !== 1) throw new Error(`Restauration binaire refusée pour l’ID ${id}.`);
      changed += result.affectedRows;
    }
    const after = await inspect(connection, plan, backup);
    if (after.state !== "initial" || changed !== 38) throw new Error("Postconditions de rollback non satisfaites.");
    await connection.commit();
    return { mode: "rollback", state: "restored", changed_rows: changed, counts: after.counts, lexical_entry_hash: after.fullHash };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
  const backup = loadBackup(args.backupPath, plan);
  const pool = createPool();
  try {
    if (args.mode === "apply") return console.log(JSON.stringify(await apply(pool, plan, backup), null, 2));
    if (args.mode === "rollback") return console.log(JSON.stringify(await rollback(pool, plan, backup), null, 2));
    const result = await inspect(pool, plan, backup);
    console.log(JSON.stringify({ mode: "check", state: result.state, scanned_ids: 38, counts: result.counts, lexical_entry_hash: result.fullHash }, null, 2));
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { EXPECTED_COUNTS, EXPECTED_MAPPINGS, classifyState, loadPlan, parseArgs, stableRowsHash };
