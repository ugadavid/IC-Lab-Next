"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createPool } = require("../src/repository");
const { loadPlan: loadMission208Plan } = require("./normalize-semantic-domains-ab");

const ROOT = path.resolve(__dirname, "../../../..");
const MAP_PATH = "reports/assets/207_dico_ic_semantic_domain_audit/semantic_domain_normalization_map.json";
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
const DECISIONS = Object.freeze([
  [331, "BIODIVERSITE", "ENVIRONMENT_BIODIVERSITY", "nature"],
  [328, "INCENDIE", "ENVIRONMENT_FIRE", "catastrophe"],
  [329, "ETRE", "VERB_TO_BE", "verbe auxiliaire"],
  [285, "AGRICOLE", "activité", "agriculture"],
  [165, "TRES", "adverbe", "quantité"],
  [232, "PROVOQUER", "agir", "action"],
  [233, "SUBIR", "agir", "action"],
  [15, "WIDE_BROAD", "description", "qualité"],
  [16, "LONG_LENGTHY", "description", "qualité"],
  [26, "REASONABLE_SENSIBLE", "description", "qualité"],
  [27, "SENSITIVE_EMOTIONAL", "description", "qualité"],
  [326, "NATUREL", "description", "qualité"],
  [3, "IMPORTANT_SIGNIFICANT", "general", "qualité"],
  [20, "PROBLEM_DIFFICULTY", "general", "situation"],
  [22, "GENERAL_COMMON", "general", "qualité"],
  [23, "DIFFERENT_NOT_SAME", "general", "qualité"],
  [31, "ORGANIZATION_ENTITY", "general", "organisation"],
  [33, "SCIENTIFIC_PROPERTY", "general", "science"],
  [34, "PROMOTE_ACTION", "general", "action"],
  [35, "UNDERSTAND_COMPREHEND", "general", "cognition"],
  [311, "PRONOM_DEFINI_MAS_SING", "grammaire/déterminant", "grammaire"],
  [310, "PRONOM_DEFINI_PLURIEL", "grammaire/pronom", "grammaire"],
  [195, "ELEVATION", "quantité", "mouvement"],
  [145, "SANS", "relation", "absence"],
  [152, "DONC", "relation", "relations logiques"],
  [192, "PAR_CONSEQUENT", "relation", "relations logiques"],
  [253, "CAUSE", "relation", "causalité"],
  [275, "CAUSE_NOM", "relation", "causalité"],
  [58, "QUICKLY", "temps", "manière"],
  [179, "PREMIEREMENT", "temps", "discours"],
  [229, "EVENEMENT", "temps", "événement"],
  [221, "CONSEQUEMMENT", "temps_manière", "relations logiques"],
  [126, "RESULTAT", "économie", "causalité"],
  [257, "PRODUCTION_AGRICOLE", "économie", "agriculture"],
  [258, "FOOD_SUPPLY", "économie", "alimentation"],
  [203, "PERSONNE", "être", "personne"],
].map(([id, entryKey, oldValue, newValue]) => Object.freeze({ id, entryKey, oldValue, newValue })));

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableRowsHash(rows) {
  return sha256(JSON.stringify(rows));
}

function loadPlan() {
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, MAP_PATH), "utf8"));
  const groups = source.mappings.filter((mapping) => mapping.category === "C");
  if (groups.length !== 19 || groups.reduce((sum, group) => sum + group.entry_ids.length, 0) !== 123) {
    throw new Error("Le périmètre Mission 207 doit contenir exactement 19 groupes et 123 entrées C.");
  }
  const cIds = groups.flatMap((group) => group.entry_ids.map(Number)).sort((a, b) => a - b);
  if (new Set(cIds).size !== 123) throw new Error("Le périmètre C contient des IDs répétés.");
  const byId = new Map();
  for (const decision of DECISIONS) {
    if (!cIds.includes(decision.id)) throw new Error(`L’ID ${decision.id} n’appartient pas à la catégorie C.`);
    if (byId.has(decision.id)) throw new Error(`Décision répétée pour l’ID ${decision.id}.`);
    byId.set(decision.id, decision);
  }
  if (byId.size !== 36) throw new Error("Le plan doit contenir exactement 36 décisions.");
  const conservedIds = cIds.filter((id) => !byId.has(id));
  if (conservedIds.length !== 87) throw new Error("Le snapshot doit contenir exactement 87 conservations.");
  return { groups, cIds, byId, changedIds: [...byId.keys()].sort((a, b) => a - b), conservedIds };
}

function classifyState(rows, plan) {
  if (rows.length !== 36) return "partial";
  let initial = true;
  let final = true;
  for (const row of rows) {
    const decision = plan.byId.get(Number(row.id));
    if (!decision || row.entry_key !== decision.entryKey || row.semantic_domain !== decision.oldValue) initial = false;
    if (!decision || row.entry_key !== decision.entryKey || row.semantic_domain !== decision.newValue) final = false;
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

async function readTableHashes(executor) {
  const hashes = {};
  for (const table of Object.keys(EXPECTED_COUNTS)) {
    const [rows] = await executor.query(`SELECT * FROM ${table} ORDER BY id`);
    hashes[table] = stableRowsHash(rows);
  }
  return hashes;
}

async function readAllEntries(executor, lock = false) {
  const [rows] = await executor.query(`SELECT * FROM lexical_entry ORDER BY id${lock ? " FOR UPDATE" : ""}`);
  return rows;
}

function withoutDomain(rows) {
  return rows.map(({ semantic_domain: _domain, ...row }) => row);
}

function loadBackup(filePath, plan) {
  if (!filePath) throw new Error("Une sauvegarde --backup est obligatoire.");
  const backup = JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
  if (backup.mission !== 209 || backup.c_rows.length !== 123 || backup.changed_rows.length !== 36 || backup.conserved_rows.length !== 87) {
    throw new Error("Sauvegarde Mission 209 invalide.");
  }
  if (JSON.stringify(backup.c_ids) !== JSON.stringify(plan.cIds)) throw new Error("IDs C de sauvegarde incompatibles.");
  return backup;
}

function assertMission208Applied(allRows) {
  const mission208 = loadMission208Plan();
  for (const id of mission208.ids) {
    const row = allRows.find((item) => Number(item.id) === id);
    if (!row || row.semantic_domain !== mission208.byId.get(id).newValue) {
      throw new Error(`Mission 208 absente ou altérée sur l’ID ${id}.`);
    }
  }
}

async function inspect(executor, plan, backup, lock = false) {
  const counts = await readCounts(executor);
  assertCounts(counts);
  const allRows = await readAllEntries(executor, lock);
  assertMission208Applied(allRows);
  const changed = allRows.filter((row) => plan.byId.has(Number(row.id)));
  const conserved = allRows.filter((row) => plan.conservedIds.includes(Number(row.id)));
  const outside = allRows.filter((row) => !plan.cIds.includes(Number(row.id)));
  const state = classifyState(changed, plan);
  if (stableRowsHash(withoutDomain(changed)) !== backup.changed_static_hash) {
    throw new Error("Une colonne autre que semantic_domain ou une clé a changé sur les 36 décisions.");
  }
  if (stableRowsHash(conserved) !== backup.conserved_rows_hash) {
    throw new Error("Une des 87 décisions de conservation a changé.");
  }
  if (stableRowsHash(outside) !== backup.outside_c_hash) {
    throw new Error("Une entrée hors catégorie C a changé.");
  }
  const hashes = await readTableHashes(executor);
  for (const [table, expected] of Object.entries(backup.table_hashes_initial)) {
    if (table !== "lexical_entry" && hashes[table] !== expected) throw new Error(`La table ${table} a changé.`);
  }
  const expectedFullHash = state === "initial" ? backup.initial_lexical_entry_hash
    : state === "final" ? backup.final_lexical_entry_hash : null;
  if (expectedFullHash && hashes.lexical_entry !== expectedFullHash) throw new Error(`Empreinte ${state} de lexical_entry incompatible.`);
  return { state, counts, hashes, changed, conserved };
}

async function apply(pool, plan, backup) {
  const before = await inspect(pool, plan, backup);
  if (before.state === "final") return { mode: "apply", state: "already_applied", changed_rows: 0, conserved_rows: 87, counts: before.counts, lexical_entry_hash: before.hashes.lexical_entry };
  if (before.state !== "initial") throw new Error("État MariaDB partiel ou inconnu : aucune écriture autorisée.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locked = await inspect(connection, plan, backup, true);
    if (locked.state !== "initial") throw new Error("État modifié avant verrouillage : transaction refusée.");
    let changedCount = 0;
    for (const id of plan.changedIds) {
      const decision = plan.byId.get(id);
      const [result] = await connection.execute(
        "UPDATE lexical_entry SET semantic_domain=? WHERE id=? AND BINARY entry_key=BINARY ? AND BINARY semantic_domain=BINARY ?",
        [decision.newValue, id, decision.entryKey, decision.oldValue]
      );
      if (result.affectedRows !== 1) throw new Error(`Mise à jour binaire refusée pour l’ID ${id}.`);
      changedCount += result.affectedRows;
    }
    const after = await inspect(connection, plan, backup);
    if (after.state !== "final" || changedCount !== 36) throw new Error("Postconditions d’application non satisfaites.");
    await connection.commit();
    return { mode: "apply", state: "applied", changed_rows: changedCount, conserved_rows: 87, counts: after.counts, lexical_entry_hash: after.hashes.lexical_entry };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rollback(pool, plan, backup) {
  const before = await inspect(pool, plan, backup);
  if (before.state === "initial") return { mode: "rollback", state: "already_restored", changed_rows: 0, conserved_rows: 87, counts: before.counts, lexical_entry_hash: before.hashes.lexical_entry };
  if (before.state !== "final") throw new Error("État MariaDB partiel ou inconnu : rollback refusé.");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const locked = await inspect(connection, plan, backup, true);
    if (locked.state !== "final") throw new Error("État modifié avant verrouillage : rollback refusé.");
    let changedCount = 0;
    for (const id of plan.changedIds) {
      const decision = plan.byId.get(id);
      const [result] = await connection.execute(
        "UPDATE lexical_entry SET semantic_domain=? WHERE id=? AND BINARY entry_key=BINARY ? AND BINARY semantic_domain=BINARY ?",
        [decision.oldValue, id, decision.entryKey, decision.newValue]
      );
      if (result.affectedRows !== 1) throw new Error(`Restauration binaire refusée pour l’ID ${id}.`);
      changedCount += result.affectedRows;
    }
    const after = await inspect(connection, plan, backup);
    if (after.state !== "initial" || changedCount !== 36) throw new Error("Postconditions de rollback non satisfaites.");
    await connection.commit();
    return { mode: "rollback", state: "restored", changed_rows: changedCount, conserved_rows: 87, counts: after.counts, lexical_entry_hash: after.hashes.lexical_entry };
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
    console.log(JSON.stringify({ mode: "check", state: result.state, changed_rows: 36, conserved_rows: 87, counts: result.counts, lexical_entry_hash: result.hashes.lexical_entry }, null, 2));
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { DECISIONS, EXPECTED_COUNTS, classifyState, loadPlan, parseArgs, stableRowsHash };
