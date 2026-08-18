"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createPool } = require("../src/repository");
const { DECISIONS, EXPECTED_COUNTS, loadPlan, stableRowsHash } = require("./normalize-semantic-domains-c");

const ROOT = path.resolve(__dirname, "../../../..");
const SOURCE_HEAD = "fb2161f5d20174f86b0003c1a8dc1208fb26414d";
const SOURCE_PATHS = [
  "reports/assets/207_dico_ic_semantic_domain_audit/semantic_domain_normalization_map.json",
  "reports/assets/208_dico_ic_semantic_domain_ab_normalization/backup.json",
  "reports/208_dico_ic_semantic_domain_ab_normalization_report.md",
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const index = argv.indexOf("--output");
  if (index < 0 || !argv[index + 1]) throw new Error("Préciser --output <fichier>.");
  return path.resolve(argv[index + 1]);
}

async function main() {
  const output = parseArgs(process.argv.slice(2));
  if (fs.existsSync(output)) throw new Error(`La sauvegarde existe déjà : ${output}`);
  const plan = loadPlan();
  const pool = createPool();
  try {
    const counts = {};
    const tableHashes = {};
    let allRows;
    for (const table of Object.keys(EXPECTED_COUNTS)) {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
      counts[table] = rows.length;
      tableHashes[table] = stableRowsHash(rows);
      if (table === "lexical_entry") allRows = rows;
    }
    for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
      if (counts[table] !== expected) throw new Error(`Compteur ${table} inattendu.`);
    }
    const cRows = allRows.filter((row) => plan.cIds.includes(Number(row.id)));
    const changedRows = allRows.filter((row) => plan.byId.has(Number(row.id)));
    const conservedRows = allRows.filter((row) => plan.conservedIds.includes(Number(row.id)));
    const outsideRows = allRows.filter((row) => !plan.cIds.includes(Number(row.id)));
    for (const row of changedRows) {
      const decision = plan.byId.get(Number(row.id));
      if (row.entry_key !== decision.entryKey || row.semantic_domain !== decision.oldValue) {
        throw new Error(`État initial incompatible sur l’ID ${row.id}.`);
      }
    }
    const finalRows = allRows.map((row) => {
      const decision = plan.byId.get(Number(row.id));
      return decision ? { ...row, semantic_domain: decision.newValue } : row;
    });
    const withoutDomain = changedRows.map(({ semantic_domain: _domain, ...row }) => row);
    const sourceHashes = Object.fromEntries(SOURCE_PATHS.map((relativePath) => [relativePath, sha256(fs.readFileSync(path.join(ROOT, relativePath)))]));
    const backup = {
      mission: 209,
      backup_version: 1,
      source_head: SOURCE_HEAD,
      source_database: "ic_dico",
      source_hashes: sourceHashes,
      counts,
      table_hashes_initial: tableHashes,
      c_ids: plan.cIds,
      changed_ids: plan.changedIds,
      conserved_ids: plan.conservedIds,
      decisions: DECISIONS.map(({ id, entryKey, oldValue, newValue }) => ({ id, entry_key: entryKey, old_value: oldValue, new_value: newValue })),
      c_rows: cRows,
      changed_rows: changedRows,
      conserved_rows: conservedRows,
      changed_static_hash: stableRowsHash(withoutDomain),
      conserved_rows_hash: stableRowsHash(conservedRows),
      outside_c_hash: stableRowsHash(outsideRows),
      initial_lexical_entry_hash: stableRowsHash(allRows),
      final_lexical_entry_hash: stableRowsHash(finalRows),
      plan_fingerprint: stableRowsHash(DECISIONS),
    };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(backup, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ output, c_rows: cRows.length, changed_rows: changedRows.length, conserved_rows: conservedRows.length, initial_hash: backup.initial_lexical_entry_hash, final_hash: backup.final_lexical_entry_hash }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
