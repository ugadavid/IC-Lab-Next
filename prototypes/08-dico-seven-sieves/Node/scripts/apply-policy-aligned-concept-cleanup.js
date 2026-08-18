"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { createPool } = require("../src/repository");

const ROOT = path.resolve(__dirname, "../../../..");
const INITIAL_COUNTS = {
  lexical_entry: 326,
  lexical_form: 1125,
  inflected_form: 41,
  connector_help: 12,
  form_relation: 70,
  pattern_rule: 1,
  ic_feature: 8,
  language: 12,
};
const FINAL_COUNTS = { ...INITIAL_COUNTS, lexical_entry: 270 };
const PLAN_FILES = {
  "reports/205_dico_ic_policy_aligned_cleanup_plan.md": "891a6663fa68c284c2e1d7a176fe8c344eb305b0fd150830bfa0b0e1d67c3c72",
  "reports/assets/205_dico_ic_policy_aligned_cleanup_plan/policy_aligned_actions.json": "ce1a038132cfcc9c3611d1b9b366d352c1b30ae08b3167393d4dc60138afcf57",
  "reports/assets/205_dico_ic_policy_aligned_cleanup_plan/atomic_rekeys.json": "9e44e313a65a75c245b99e076b8bb90497d08e627a02c01c48b66793d74e93e9",
  "reports/assets/205_dico_ic_policy_aligned_cleanup_plan/test_only_protections.csv": "27840d2e1fc846eff909dd505b538b193c887a787dfa053ffe910572e2398612",
  "reports/assets/205_dico_ic_policy_aligned_cleanup_plan/preflight_selects.sql": "35b50f9344d9d66aa8f4736e97b74786950a8c2d4bbf39a825fed0ff973ee3b2",
};
const POLICY_PATH = "reports/assets/205_dico_ic_policy_aligned_cleanup_plan/policy_aligned_actions.json";
const ATOMIC_PATH = "reports/assets/205_dico_ic_policy_aligned_cleanup_plan/atomic_rekeys.json";
const TEXT_FILES = [
  "prototypes/08-dico-seven-sieves/Node/src/admin-ai-domain.js",
  "prototypes/08-dico-seven-sieves/Node/test/french-concept-key-policy.test.js",
];
const OLD_PROMPT = "Contre-exemples : ne produis pas SUFFER pour souffrir, WORRISOME pour préoccupant, SOFFRIR à partir de l’italien ou du portugais, ni systématiquement PREOCCUPANT_ADJECTIVE.";
const NEW_PROMPT = "Contre-exemples : pour souffrir, ne choisis pas l’anglais et ne copie pas une graphie italienne ou portugaise ; pour préoccupant, ne choisis pas l’anglais et n’ajoute pas systématiquement un suffixe grammatical.";
const OLD_TEST_FRAGMENTS = ["SUFFER pour souffrir", "WORRISOME pour préoccupant", "SOFFRIR à partir de l’italien ou du portugais", "PREOCCUPANT_ADJECTIVE"];
const NEW_TEST_FRAGMENTS = ["pour souffrir, ne choisis pas l’anglais", "ne copie pas une graphie italienne ou portugaise", "pour préoccupant, ne choisis pas l’anglais", "n’ajoute pas systématiquement un suffixe grammatical"];
const CHILD_TABLES = ["lexical_form", "inflected_form", "connector_help", "form_relation", "pattern_rule", "ic_feature", "language"];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashFile(relativePath) {
  return sha256(fs.readFileSync(path.join(ROOT, relativePath)));
}

function hashRows(rows) {
  return sha256(JSON.stringify(rows));
}

function canonicalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .replace(/[’']/g, "_").replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");
}

function parseArguments(argv) {
  const mode = argv[2] || "--check";
  const allowed = new Set(["--check", "--backup-create", "--apply", "--rollback"]);
  if (!allowed.has(mode)) throw new Error("Usage : --check | --backup-create | --apply | --rollback [--backup <fichier>]");
  const backupIndex = argv.indexOf("--backup");
  const backupPath = backupIndex >= 0 ? argv[backupIndex + 1] : null;
  if (backupIndex >= 0 && !backupPath) throw new Error("Le chemin suivant --backup est obligatoire.");
  if (mode !== "--check" && !backupPath) throw new Error("--backup <fichier> est obligatoire pour ce mode.");
  return { mode, backupPath: backupPath ? path.resolve(backupPath) : null };
}

function validatePlanFiles() {
  const actual = {};
  for (const [relativePath, expectedHash] of Object.entries(PLAN_FILES)) {
    actual[relativePath] = hashFile(relativePath);
    if (actual[relativePath] !== expectedHash) {
      throw new Error(`Plan Mission 205 refusé : empreinte inattendue pour ${relativePath}.`);
    }
  }
  return actual;
}

function loadPlan() {
  const planHashes = validatePlanFiles();
  const policy = JSON.parse(fs.readFileSync(path.join(ROOT, POLICY_PATH), "utf8"));
  const atomic = JSON.parse(fs.readFileSync(path.join(ROOT, ATOMIC_PATH), "utf8"));
  if (policy.mission !== 205 || policy.logical_action_count !== 74 || policy.actions.length !== 74) throw new Error("Plan Mission 205 incomplet.");
  if (atomic.mission !== 205 || atomic.operation_count !== 15 || atomic.operations.length !== 15) throw new Error("Plan atomique Mission 205 incomplet.");
  const categories = Object.fromEntries(["A", "B", "C", "D"].map((category) => [category, policy.actions.filter((action) => action.category === category).length]));
  if (JSON.stringify(categories) !== JSON.stringify({ A: 30, B: 26, C: 15, D: 3 })) throw new Error(`Catégories Mission 205 incohérentes : ${JSON.stringify(categories)}.`);
  const atomicFromPolicy = policy.actions.filter((action) => action.category === "C").map((action) => action.source_id).sort((a, b) => a - b);
  const atomicStandalone = atomic.operations.map((action) => action.source_id).sort((a, b) => a - b);
  if (JSON.stringify(atomicFromPolicy) !== JSON.stringify(atomicStandalone)) throw new Error("Les plans policy et atomic ont dérivé.");
  return { policy, atomic, planHashes, planFingerprint: sha256(JSON.stringify(planHashes)) };
}

function buildPlanState(policy) {
  const deletes = new Map();
  const renames = new Map();
  for (const action of policy.actions) {
    if (action.category === "A" || action.category === "D") deletes.set(action.source_id, action.current_key);
    if (action.category === "B") renames.set(action.retained_id, { oldKey: action.current_key, finalKey: action.final_key });
    if (action.category === "C") {
      renames.set(action.retained_id, { oldKey: action.retained_current_key, finalKey: action.final_key });
      for (const entry of action.entries_to_delete) deletes.set(entry.id, entry.entry_key);
    }
  }
  if (deletes.size !== 56 || renames.size !== 41) throw new Error(`Effets Mission 205 incohérents : ${deletes.size} suppressions, ${renames.size} renommages.`);
  for (const id of deletes.keys()) if (renames.has(id)) throw new Error(`ID ${id} à la fois supprimé et renommé.`);
  return {
    deletes,
    renames,
    mutationIds: [...deletes.keys(), ...renames.keys()].sort((a, b) => a - b),
    retainedIds: [...renames.keys()].sort((a, b) => a - b),
  };
}

function classifyEntryState(rows, planState) {
  const current = new Map(rows.map((row) => [Number(row.id), row.entry_key]));
  const initial = current.size === 97
    && [...planState.deletes].every(([id, key]) => current.get(id) === key)
    && [...planState.renames].every(([id, keys]) => current.get(id) === keys.oldKey);
  const final = current.size === 41
    && [...planState.deletes.keys()].every((id) => !current.has(id))
    && [...planState.renames].every(([id, keys]) => current.get(id) === keys.finalKey);
  return initial ? "initial" : final ? "final" : "partial_or_unknown";
}

function readTextState() {
  const promptText = fs.readFileSync(path.join(ROOT, TEXT_FILES[0]), "utf8");
  const testText = fs.readFileSync(path.join(ROOT, TEXT_FILES[1]), "utf8");
  const initial = promptText.includes(OLD_PROMPT) && OLD_TEST_FRAGMENTS.every((fragment) => testText.includes(fragment));
  const final = promptText.includes(NEW_PROMPT)
    && NEW_TEST_FRAGMENTS.every((fragment) => testText.includes(fragment))
    && !promptText.includes("SUFFER pour souffrir")
    && !promptText.includes("SOFFRIR à partir")
    && !promptText.includes("PREOCCUPANT_ADJECTIVE")
    && !testText.includes("SUFFER pour souffrir")
    && !testText.includes("SOFFRIR à partir")
    && !testText.includes("PREOCCUPANT_ADJECTIVE");
  return { state: initial ? "initial" : final ? "final" : "partial_or_unknown", promptText, testText };
}

async function readCounts(executor) {
  const counts = {};
  for (const table of Object.keys(INITIAL_COUNTS)) {
    const [rows] = await executor.query(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = Number(rows[0].count);
  }
  return counts;
}

function assertCounts(actual, expected, label) {
  for (const [table, count] of Object.entries(expected)) {
    if (actual[table] !== count) throw new Error(`${label} refusé : ${table}=${actual[table]}, attendu=${count}.`);
  }
}

async function readAffectedEntries(executor, planState, lock = false) {
  const placeholders = planState.mutationIds.map(() => "?").join(",");
  const [rows] = await executor.query(`SELECT * FROM lexical_entry WHERE id IN (${placeholders}) ORDER BY id${lock ? " FOR UPDATE" : ""}`, planState.mutationIds);
  return rows;
}

async function readAllRows(executor, table) {
  const [rows] = await executor.query(`SELECT * FROM ${table} ORDER BY id`);
  return rows;
}

async function readUntouchedEntries(executor, planState) {
  const placeholders = planState.mutationIds.map(() => "?").join(",");
  const [rows] = await executor.query(`SELECT * FROM lexical_entry WHERE id NOT IN (${placeholders}) ORDER BY id`, planState.mutationIds);
  return rows;
}

async function readDependencySnapshots(executor, retainedIds) {
  const placeholders = retainedIds.map(() => "?").join(",");
  const [forms] = await executor.query(`SELECT * FROM lexical_form WHERE entry_id IN (${placeholders}) ORDER BY id`, retainedIds);
  const formIds = forms.map((row) => Number(row.id));
  const formPlaceholders = formIds.map(() => "?").join(",") || "NULL";
  const [inflections] = await executor.query(`SELECT * FROM inflected_form WHERE lexical_form_id IN (${formPlaceholders}) ORDER BY id`, formIds);
  const [relations] = await executor.query(`SELECT * FROM form_relation WHERE source_form_id IN (${formPlaceholders}) OR target_form_id IN (${formPlaceholders}) ORDER BY id`, [...formIds, ...formIds]);
  const [features] = await executor.query(`SELECT * FROM ic_feature WHERE form_id IN (${formPlaceholders}) ORDER BY id`, formIds);
  const [helps] = await executor.query(`SELECT * FROM connector_help WHERE lexical_entry_id IN (${placeholders}) ORDER BY id`, retainedIds);
  const patternRules = await readAllRows(executor, "pattern_rule");
  return { forms, inflections, relations, features, connector_helps: helps, pattern_rules: patternRules };
}

async function childTableHashes(executor) {
  const hashes = {};
  for (const table of CHILD_TABLES) hashes[table] = hashRows(await readAllRows(executor, table));
  return hashes;
}

function assertObjectEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} incompatible avec la sauvegarde.`);
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

function assertNoFunctionalReferences(policy) {
  const keys = new Set();
  for (const action of policy.actions) {
    if (["A", "B", "D"].includes(action.category)) keys.add(action.current_key);
    if (action.category === "C") {
      keys.add(action.retained_current_key);
      for (const entry of action.entries_to_delete) keys.add(entry.entry_key);
    }
  }
  const offenders = [];
  for (const key of keys) {
    let output = "";
    try {
      output = execFileSync("git", ["grep", "-I", "-l", "-w", "-F", key, "--", "."], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch (error) {
      if (error.status !== 1) throw error;
    }
    const functional = output.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, "/")).filter((file) => (
      !file.startsWith("reports/")
      && !file.includes("/test/")
      && !file.includes("/docs/")
      && !file.endsWith("Node/src/admin-ai-domain.js")
    ));
    if (functional.length) offenders.push({ key, files: functional });
  }
  if (offenders.length) throw new Error(`Références fonctionnelles nouvelles : ${JSON.stringify(offenders)}.`);
  return keys.size;
}

async function assertCanonicalUniqueness(executor) {
  const [rows] = await executor.query("SELECT id, entry_key FROM lexical_entry ORDER BY id");
  const owners = new Map();
  for (const row of rows) {
    const canonical = canonicalize(row.entry_key);
    if (owners.has(canonical)) throw new Error(`Collision après canonicalisation : ${owners.get(canonical)} et ${row.id} → ${canonical}.`);
    owners.set(canonical, Number(row.id));
  }
}

function validateBackup(backup, plan, planState) {
  if (backup.mission !== 206 || backup.backup_version !== 1) throw new Error("Sauvegarde Mission 206 invalide.");
  if (backup.plan_fingerprint !== plan.planFingerprint) throw new Error("Sauvegarde liée à une autre empreinte du plan.");
  if (backup.lexical_entries.length !== 97 || backup.retained_ids.length !== 41) throw new Error("Sauvegarde incomplète.");
  if (JSON.stringify(backup.affected_entry_ids) !== JSON.stringify(planState.mutationIds)) throw new Error("IDs sauvegardés incohérents.");
  return backup;
}

function readBackup(backupPath, plan, planState) {
  if (!fs.existsSync(backupPath)) throw new Error(`Sauvegarde absente : ${backupPath}.`);
  return validateBackup(JSON.parse(fs.readFileSync(backupPath, "utf8")), plan, planState);
}

async function createBackup(pool, backupPath, plan, planState) {
  if (fs.existsSync(backupPath)) throw new Error(`Sauvegarde déjà présente : ${backupPath}.`);
  const entries = await readAffectedEntries(pool, planState);
  if (classifyEntryState(entries, planState) !== "initial") throw new Error("Sauvegarde refusée : MariaDB n'est pas dans l'état initial complet.");
  const counts = await readCounts(pool);
  assertCounts(counts, INITIAL_COUNTS, "Sauvegarde");
  const textState = readTextState();
  if (textState.state !== "initial") throw new Error("Sauvegarde refusée : les fichiers D ne sont pas dans l'état initial exact.");
  await assertCanonicalUniqueness(pool);
  const dependencySnapshots = await readDependencySnapshots(pool, planState.retainedIds);
  const backup = {
    mission: 206,
    backup_version: 1,
    source_head: currentHead(),
    source_database: process.env.DB_NAME || "ic_dico",
    plan_files: plan.planHashes,
    plan_fingerprint: plan.planFingerprint,
    initial_counts: counts,
    final_counts: FINAL_COUNTS,
    affected_entry_ids: planState.mutationIds,
    retained_ids: planState.retainedIds,
    deleted_ids: [...planState.deletes.keys()].sort((a, b) => a - b),
    renamed_ids: [...planState.renames.keys()].sort((a, b) => a - b),
    lexical_entries: entries,
    dependency_snapshots: dependencySnapshots,
    dependency_snapshot_hash: hashRows(dependencySnapshots),
    child_table_hashes: await childTableHashes(pool),
    untouched_lexical_entry_hash: hashRows(await readUntouchedEntries(pool, planState)),
    text_files: TEXT_FILES.map((relativePath) => {
      const content = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      return { relative_path: relativePath, sha256: sha256(Buffer.from(content, "utf8")), content };
    }),
  };
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { state: "backup_created", backup_path: backupPath, entry_rows: entries.length, retained_ids: planState.retainedIds.length, backup_sha256: hashFile(path.relative(ROOT, backupPath)) };
}

async function assertBackupInvariants(executor, backup, planState) {
  assertObjectEqual(await childTableHashes(executor), backup.child_table_hashes, "Tables enfants");
  assertObjectEqual(hashRows(await readDependencySnapshots(executor, planState.retainedIds)), backup.dependency_snapshot_hash, "Dépendances des IDs conservés");
  assertObjectEqual(hashRows(await readUntouchedEntries(executor, planState)), backup.untouched_lexical_entry_hash, "Familles hors périmètre");
}

async function checkState(pool, plan, planState, backup = null) {
  const entries = await readAffectedEntries(pool, planState);
  const state = classifyEntryState(entries, planState);
  if (state === "partial_or_unknown") throw new Error("État MariaDB partiel ou inconnu : aucune écriture autorisée.");
  const counts = await readCounts(pool);
  assertCounts(counts, state === "initial" ? INITIAL_COUNTS : FINAL_COUNTS, "Contrôle");
  const text = readTextState().state;
  if (text === "partial_or_unknown") throw new Error("État textuel D partiel ou inconnu.");
  await assertCanonicalUniqueness(pool);
  if (backup) await assertBackupInvariants(pool, backup, planState);
  return { state, text_state: text, counts, mutation_rows_present: entries.length, plan_fingerprint: plan.planFingerprint };
}

async function applyPlan(pool, backup, plan, planState) {
  const before = await checkState(pool, plan, planState, backup);
  if (before.text_state !== "final") throw new Error("Application refusée : le prompt et son test D doivent être modifiés et testés avant MariaDB.");
  if (before.state === "final") return { mode: "apply", state: "already_applied", changed_rows: 0, counts: before.counts };
  const connection = await pool.getConnection();
  let changedRows = 0;
  try {
    await connection.beginTransaction();
    const locked = await readAffectedEntries(connection, planState, true);
    if (classifyEntryState(locked, planState) !== "initial") throw new Error("État initial modifié pendant le verrouillage.");

    for (const action of plan.policy.actions.filter((item) => item.category === "B")) {
      const [result] = await connection.execute("UPDATE lexical_entry SET entry_key=? WHERE id=? AND entry_key=?", [action.final_key, action.retained_id, action.current_key]);
      if (result.affectedRows !== 1) throw new Error(`Renommage B refusé pour l'ID ${action.retained_id}.`);
      changedRows += result.affectedRows;
    }
    for (const action of plan.policy.actions.filter((item) => item.category === "C")) {
      const collision = action.entries_to_delete.find((entry) => entry.id === action.collision_entry_id);
      const [collisionResult] = await connection.execute("DELETE FROM lexical_entry WHERE id=? AND entry_key=?", [collision.id, collision.entry_key]);
      if (collisionResult.affectedRows !== 1) throw new Error(`Collision C non supprimée pour ${action.final_key}.`);
      changedRows += collisionResult.affectedRows;
      const [renameResult] = await connection.execute("UPDATE lexical_entry SET entry_key=? WHERE id=? AND entry_key=?", [action.final_key, action.retained_id, action.retained_current_key]);
      if (renameResult.affectedRows !== 1) throw new Error(`Renommage C refusé pour l'ID ${action.retained_id}.`);
      changedRows += renameResult.affectedRows;
      for (const entry of action.entries_to_delete.filter((item) => item.id !== action.collision_entry_id)) {
        const [deleteResult] = await connection.execute("DELETE FROM lexical_entry WHERE id=? AND entry_key=?", [entry.id, entry.entry_key]);
        if (deleteResult.affectedRows !== 1) throw new Error(`Alias C non supprimé : ${entry.id}.`);
        changedRows += deleteResult.affectedRows;
      }
    }
    for (const action of plan.policy.actions.filter((item) => item.category === "A")) {
      const [result] = await connection.execute("DELETE FROM lexical_entry WHERE id=? AND entry_key=?", [action.source_id, action.current_key]);
      if (result.affectedRows !== 1) throw new Error(`Suppression A refusée pour l'ID ${action.source_id}.`);
      changedRows += result.affectedRows;
    }
    for (const action of plan.policy.actions.filter((item) => item.category === "D")) {
      const [result] = await connection.execute("DELETE FROM lexical_entry WHERE id=? AND entry_key=?", [action.source_id, action.current_key]);
      if (result.affectedRows !== 1) throw new Error(`Suppression D refusée pour l'ID ${action.source_id}.`);
      changedRows += result.affectedRows;
    }
    if (changedRows !== 97) throw new Error(`Application incomplète : 97 mutations attendues, ${changedRows} obtenues.`);
    const finalRows = await readAffectedEntries(connection, planState);
    if (classifyEntryState(finalRows, planState) !== "final") throw new Error("Postcondition finale des clés non satisfaite.");
    assertCounts(await readCounts(connection), FINAL_COUNTS, "Application");
    await assertCanonicalUniqueness(connection);
    await assertBackupInvariants(connection, backup, planState);
    await connection.commit();
    return { mode: "apply", state: "applied", changed_rows: changedRows, deleted_rows: 56, renamed_rows: 41, counts: FINAL_COUNTS };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function assertRollbackFilesCompatible(backup) {
  const textState = readTextState().state;
  if (!new Set(["initial", "final"]).has(textState)) throw new Error("Rollback refusé : fichiers D modifiés de façon incompatible.");
  for (const file of backup.text_files) {
    if (sha256(Buffer.from(file.content, "utf8")) !== file.sha256) throw new Error(`Sauvegarde textuelle corrompue : ${file.relative_path}.`);
  }
  return textState;
}

async function rollbackPlan(pool, backup, plan, planState) {
  const fileState = assertRollbackFilesCompatible(backup);
  const before = await checkState(pool, plan, planState, backup);
  if (before.state === "initial") return { mode: "rollback", state: "already_restored", changed_rows: 0, counts: before.counts };
  const backupEntries = new Map(backup.lexical_entries.map((entry) => [Number(entry.id), entry]));
  const connection = await pool.getConnection();
  let changedRows = 0;
  try {
    await connection.beginTransaction();
    const locked = await readAffectedEntries(connection, planState, true);
    if (classifyEntryState(locked, planState) !== "final") throw new Error("Rollback refusé : état final modifié pendant le verrouillage.");
    for (const [id, keys] of planState.renames) {
      const [result] = await connection.execute("UPDATE lexical_entry SET entry_key=? WHERE id=? AND entry_key=?", [keys.oldKey, id, keys.finalKey]);
      if (result.affectedRows !== 1) throw new Error(`Rollback du renommage refusé pour l'ID ${id}.`);
      changedRows += result.affectedRows;
    }
    for (const [id] of planState.deletes) {
      const row = backupEntries.get(id);
      if (!row) throw new Error(`Ligne ${id} absente de la sauvegarde.`);
      const columns = Object.keys(row);
      const [result] = await connection.execute(`INSERT INTO lexical_entry (${columns.map((column) => `\`${column}\``).join(",")}) VALUES (${columns.map(() => "?").join(",")})`, columns.map((column) => row[column]));
      if (result.affectedRows !== 1) throw new Error(`Réinsertion refusée pour l'ID ${id}.`);
      changedRows += result.affectedRows;
    }
    if (changedRows !== 97) throw new Error(`Rollback incomplet : 97 mutations attendues, ${changedRows} obtenues.`);
    const restoredRows = await readAffectedEntries(connection, planState);
    if (classifyEntryState(restoredRows, planState) !== "initial") throw new Error("État initial non restauré.");
    if (hashRows(restoredRows) !== hashRows(backup.lexical_entries)) throw new Error("Lignes lexical_entry non restaurées champ à champ.");
    assertCounts(await readCounts(connection), INITIAL_COUNTS, "Rollback");
    await assertCanonicalUniqueness(connection);
    await assertBackupInvariants(connection, backup, planState);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  const fixtureMode = process.env.DICO_CLEANUP_FIXTURE === "1";
  if (fileState === "final" && !fixtureMode) {
    for (const file of backup.text_files) fs.writeFileSync(path.join(ROOT, file.relative_path), file.content, "utf8");
  }
  return { mode: "rollback", state: "restored", changed_rows: changedRows, counts: INITIAL_COUNTS, text_files_restored: fileState === "final" && !fixtureMode, text_files_skipped_fixture: fixtureMode };
}

async function main() {
  const args = parseArguments(process.argv);
  const plan = loadPlan();
  const planState = buildPlanState(plan.policy);
  const scannedKeys = assertNoFunctionalReferences(plan.policy);
  const pool = createPool();
  try {
    if (args.mode === "--backup-create") {
      console.log(JSON.stringify({ mode: "backup-create", scanned_keys: scannedKeys, ...(await createBackup(pool, args.backupPath, plan, planState)) }, null, 2));
      return;
    }
    const backup = args.backupPath ? readBackup(args.backupPath, plan, planState) : null;
    if (args.mode === "--check") {
      console.log(JSON.stringify({ mode: "check", scanned_keys: scannedKeys, ...(await checkState(pool, plan, planState, backup)) }, null, 2));
      return;
    }
    const result = args.mode === "--apply"
      ? await applyPlan(pool, backup, plan, planState)
      : await rollbackPlan(pool, backup, plan, planState);
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
  INITIAL_COUNTS,
  FINAL_COUNTS,
  PLAN_FILES,
  canonicalize,
  parseArguments,
  loadPlan,
  buildPlanState,
  classifyEntryState,
  readTextState,
};
