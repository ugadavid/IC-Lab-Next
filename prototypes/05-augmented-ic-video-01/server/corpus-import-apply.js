"use strict";

const { canonicalJson, createCorpusImportPlan, sha256 } = require("./corpus-import-plan");
const { mapMariaDbTablesToSnapshot, projectMariaDbSnapshotForApplication, readCanonicalTablesWithProcedures } = require("./proto05-mariadb-readonly");

const APPLY_CONFIRMATION = "APPLY PROTO05 REPLI4C CORPUS";
const APPLY_LOCK = "proto05_repli4c_corpus_import";

function assertApplyInputs({ manifest, plan, expectedPlanHash, confirmation }) {
  if (confirmation !== APPLY_CONFIRMATION) throw new Error("Confirmation explicite d’application absente ou incorrecte.");
  if (!plan || plan.planHash !== expectedPlanHash) throw new Error("Le hash attendu ne correspond pas au plan fourni.");
  const core = { ...plan };
  delete core.planHash;
  if (sha256(canonicalJson(core)) !== expectedPlanHash) throw new Error("Le contenu du plan ne correspond pas à son hash sémantique.");
  if (manifest.corpus.id !== plan.corpusId) throw new Error("Le manifeste et le plan ne désignent pas le même corpus.");
}

function comparePlanToCurrent(plan, current) {
  if (canonicalJson(plan) !== canonicalJson(current)) throw new Error("Le plan fourni ne correspond plus au snapshot MariaDB courant.");
  if (current.conflicts.length || current.blockers.length) throw new Error("Le plan contient un conflit ou un blocker.");
  if (current.createTechnicalMedia.some(item => item.source.kind !== "hls" || item.playable.kind !== "hls")) {
    throw new Error("Le plan contient une source incompatible avec le contrat HLS.");
  }
}

async function readSnapshot(database) {
  const tables = await readCanonicalTablesWithProcedures(database);
  return projectMariaDbSnapshotForApplication(mapMariaDbTablesToSnapshot(tables));
}

async function applyCorpusImport({ database, manifest, plan, expectedPlanHash, confirmation, manifestHash, sourceHashes, failureAfter = null }) {
  assertApplyInputs({ manifest, plan, expectedPlanHash, confirmation });
  let locked = false;
  let transaction = false;
  try {
    const [[lock]] = await database.query("SELECT GET_LOCK(?, 10) AS acquired", [APPLY_LOCK]);
    if (Number(lock.acquired) !== 1) throw new Error("Le verrou exclusif d’import du corpus est indisponible.");
    locked = true;
    await database.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await database.beginTransaction();
    transaction = true;
    await database.query("SET @proto05_runtime_transaction = 1");
    const before = await readSnapshot(database);
    const current = createCorpusImportPlan({ manifest, snapshot: before, manifestHash, sourceHashes });
    comparePlanToCurrent(plan, current);
    const beforeHash = current.inputs.snapshotHash;
    for (const [index, item] of current.createTechnicalMedia.entries()) {
      await database.query("CALL sp_media_register_import(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        item.ids.assetId, item.ids.sourceId, item.ids.playableId, item.asset.title,
        item.source.kind, item.source.provider, item.source.transport, null,
        item.source.mimeType, item.source.origin.sourceUrl, null, null,
        item.playable.location.manifestUrl, null, item.playable.availability,
        JSON.stringify({
          asset: { provenance: item.source.provenance },
          source: { origin: item.source.origin, provenance: item.source.provenance },
          playable: { provenance: item.source.provenance },
          metadata: { analysisStatus: "pending", mimeType: item.source.mimeType }
        })
      ]);
      if (failureAfter === index + 1) throw new Error(`Échec contrôlé après ${failureAfter} création(s).`);
    }
    const afterInTransaction = await readSnapshot(database);
    const postPlan = createCorpusImportPlan({ manifest, snapshot: afterInTransaction, manifestHash, sourceHashes });
    if (postPlan.summary.matchedExistingCount !== 24 || postPlan.summary.createTechnicalMediaCount !== 0 || postPlan.summary.blockerCount !== 0) {
      throw new Error("La réconciliation transactionnelle post-import a échoué.");
    }
    await database.commit();
    transaction = false;
    await database.query("SET @proto05_runtime_transaction = NULL");
    return { appliedCount: current.createTechnicalMedia.length, beforeHash, postPlan, created: current.createTechnicalMedia };
  } catch (error) {
    if (transaction) await database.rollback();
    try { await database.query("SET @proto05_runtime_transaction = NULL"); } catch {}
    throw error;
  } finally {
    if (locked) {
      try { await database.query("SELECT RELEASE_LOCK(?)", [APPLY_LOCK]); } catch {}
    }
  }
}

module.exports = { APPLY_CONFIRMATION, APPLY_LOCK, applyCorpusImport, assertApplyInputs, comparePlanToCurrent, readSnapshot };
