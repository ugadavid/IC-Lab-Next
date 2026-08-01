"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { resolveStorageKey } = require("./media-library-availability");
const { readCanonicalTablesWithProcedures } = require("./proto05-mariadb-readonly");

const PLAN_VERSION = 1;
const WRITE_LOCK = "proto05_transactional_write";
const RECONCILABLE_AVAILABILITIES = new Set(["available", "missing-local"]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, stableValue(value[key])])
  );
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function planHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function normalizedRow(row) {
  return {
    id: row.id,
    assetId: row.assetId ?? row.asset_id,
    sourceId: row.sourceId ?? row.source_id,
    kind: row.kind,
    provider: row.provider ?? null,
    role: row.role ?? null,
    availability: row.availability,
    availabilityReason: row.availabilityReason ?? row.availability_reason ?? null,
    storageScope: row.storageScope ?? row.storage_scope ?? null,
    storageKey: row.storageKey ?? row.storage_key ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
    expectedSizeBytes: row.expectedSizeBytes ?? row.expected_size_bytes ?? null,
    expectedSha256: row.expectedSha256 ?? row.expected_sha256 ?? null
  };
}

async function hashFile(file) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function observeManagedStorage(playable, { roots, stat = fsp.stat, hash = hashFile }) {
  if (!roots || !Object.prototype.hasOwnProperty.call(roots, playable.storageScope)) {
    return { status: "refused", reason: "unknown-storage-scope" };
  }
  let file;
  try {
    file = resolveStorageKey(roots[playable.storageScope], playable.storageKey);
  } catch {
    return { status: "refused", reason: "invalid-storage-key" };
  }
  let fileStat;
  try {
    fileStat = await stat(file);
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error?.code)) return { status: "absent" };
    return { status: "refused", reason: "unobservable-file" };
  }
  if (!fileStat.isFile()) return { status: "refused", reason: "not-a-file" };
  if (Number(fileStat.size) <= 0) return { status: "refused", reason: "empty-file", sizeBytes: Number(fileStat.size) };
  const actualSha256 = playable.expectedSha256 ? await hash(file) : null;
  const sizeMatches = playable.expectedSizeBytes === null
    || Number(playable.expectedSizeBytes) === Number(fileStat.size);
  const sha256Matches = playable.expectedSha256 === null
    || playable.expectedSha256 === actualSha256;
  if (!sizeMatches || !sha256Matches) {
    return {
      status: "refused",
      reason: !sizeMatches ? "size-mismatch" : "sha256-mismatch",
      sizeBytes: Number(fileStat.size),
      sha256: actualSha256,
      sizeMatches,
      sha256Matches
    };
  }
  return {
    status: "present",
    sizeBytes: Number(fileStat.size),
    sha256: actualSha256,
    sizeMatches,
    sha256Matches
  };
}

function decisionFor(playable, observation) {
  const before = {
    availability: playable.availability,
    availabilityReason: playable.availabilityReason,
    updatedAt: playable.updatedAt
  };
  if (observation.status === "refused") {
    return { decision: "refused", reason: observation.reason, before };
  }
  if (!RECONCILABLE_AVAILABILITIES.has(playable.availability)) {
    return { decision: "preserved-nonphysical-state", reason: playable.availability, before };
  }
  if (observation.status === "present") {
    if (playable.availability === "available" && playable.availabilityReason === null) {
      return { decision: "no-change", reason: "present-and-available", before };
    }
    return {
      decision: "restore-available",
      reason: "managed-file-found",
      before,
      after: { availability: "available", availabilityReason: null }
    };
  }
  if (playable.availability === "missing-local" && playable.availabilityReason === "missing-file") {
    return { decision: "no-change", reason: "absent-and-missing", before };
  }
  return {
    decision: "degrade-to-missing",
    reason: "managed-file-disappeared",
    before,
    after: { availability: "missing-local", availabilityReason: "missing-file" }
  };
}

async function inspectLocalMediaAvailability(rows, options = {}) {
  const playables = (rows || []).map(normalizedRow).sort((left, right) => left.id.localeCompare(right.id));
  const observations = new Map();
  const entries = [];
  for (const playable of playables) {
    if (playable.kind !== "local-file") {
      entries.push({
        ...playable,
        storageScope: null,
        storageKey: null,
        observation: { status: "not-managed-locally" },
        decision: "ignored-non-local",
        reason: "not-a-local-file"
      });
      continue;
    }
    const storageIdentity = `${playable.storageScope || ""}\n${playable.storageKey || ""}`;
    if (!observations.has(storageIdentity)) {
      observations.set(storageIdentity, await observeManagedStorage(playable, options));
    }
    const observation = observations.get(storageIdentity);
    entries.push({ ...playable, observation, ...decisionFor(playable, observation) });
  }
  const changes = entries.filter(entry => entry.after);
  const refusals = entries.filter(entry => entry.decision === "refused");
  const core = {
    version: PLAN_VERSION,
    entries,
    summary: {
      total: entries.length,
      local: entries.filter(entry => entry.kind === "local-file").length,
      ignored: entries.filter(entry => entry.decision === "ignored-non-local").length,
      unchanged: entries.filter(entry => entry.decision === "no-change").length,
      preserved: entries.filter(entry => entry.decision === "preserved-nonphysical-state").length,
      restoreAvailable: changes.filter(entry => entry.decision === "restore-available").length,
      degradeMissing: changes.filter(entry => entry.decision === "degrade-to-missing").length,
      refused: refusals.length
    }
  };
  return Object.freeze({
    ...core,
    changes,
    refusals,
    safeToApply: refusals.length === 0,
    planHash: planHash(core)
  });
}

function reconciliationDryRunReport(plan) {
  return {
    mode: "dry-run",
    applied: 0,
    safeToApply: Boolean(plan?.safeToApply),
    planHash: plan?.planHash || null,
    summary: plan?.summary || {},
    changes: (plan?.changes || []).map(entry => ({
      id: entry.id,
      assetId: entry.assetId,
      before: entry.before,
      after: entry.after,
      observation: {
        status: entry.observation?.status || null,
        reason: entry.observation?.reason || null
      }
    })),
    refusals: (plan?.refusals || []).map(entry => ({
      id: entry.id,
      assetId: entry.assetId,
      reason: entry.reason
    }))
  };
}

async function readAvailabilityRows(database, { ids = null, forUpdate = false } = {}) {
  const selectedIds = Array.isArray(ids) ? [...new Set(ids)].sort() : null;
  if (selectedIds?.length === 0) return [];
  void forUpdate;
  const tables = await readCanonicalTablesWithProcedures(database);
  const metadata = new Map((tables.media_playable_metadata || [])
    .map(row => [row.playable_id, row]));
  return (tables.media_playables || [])
    .filter(row => !selectedIds || selectedIds.includes(row.id))
    .map(row => ({
      ...row,
      expected_size_bytes: metadata.get(row.id)?.size_bytes ?? null,
      expected_sha256: metadata.get(row.id)?.sha256 ?? null
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function sameBefore(actual, planned) {
  return actual.availability === planned.before.availability
    && actual.availabilityReason === planned.before.availabilityReason
    && String(actual.updatedAt) === String(planned.before.updatedAt);
}

function sqlTimestamp(value) {
  return new Date(value).toISOString().replace("T", " ").replace("Z", "");
}

async function applyLocalMediaAvailabilityPlan({
  database,
  plan,
  roots,
  expectedPlanHash,
  expectedUpdateCount,
  now = new Date().toISOString()
}) {
  if (!plan || plan.planHash !== expectedPlanHash) {
    throw Object.assign(new Error("Le hash du plan de disponibilité ne correspond pas au plan validé."), {
      code: "PROTO05_AVAILABILITY_PLAN_HASH_MISMATCH"
    });
  }
  if (!plan.safeToApply) {
    throw Object.assign(new Error("Le plan contient une incohérence locale et ne peut pas être appliqué."), {
      code: "PROTO05_AVAILABILITY_PLAN_REFUSED"
    });
  }
  if (plan.changes.length !== expectedUpdateCount) {
    throw Object.assign(new Error("Le nombre de mises à jour ne correspond pas au plan validé."), {
      code: "PROTO05_AVAILABILITY_UPDATE_COUNT_MISMATCH"
    });
  }
  if (plan.changes.length === 0) return { applied: 0, planHash: plan.planHash, rows: [] };

  let lockAcquired = false;
  try {
    const [[lock]] = await database.query("SELECT GET_LOCK(?, 10) AS acquired", [WRITE_LOCK]);
    if (Number(lock.acquired) !== 1) {
      throw Object.assign(new Error("Le verrou applicatif MariaDB est indisponible."), {
        code: "PROTO05_AVAILABILITY_LOCK_UNAVAILABLE"
      });
    }
    lockAcquired = true;
    await database.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await database.beginTransaction();
    const beforeTables = await readCanonicalTablesWithProcedures(database);
    const metadataRows = beforeTables.data_projection_metadata
      .filter(row => row.document_key === "media-library");
    if (metadataRows.length !== 1) {
      throw Object.assign(new Error("Le témoin documentaire media-library est introuvable."), {
        code: "PROTO05_AVAILABILITY_METADATA_MISSING"
      });
    }
    const ids = plan.changes.map(entry => entry.id);
    const lockedRows = await readAvailabilityRows(database, { ids, forUpdate: true });
    if (lockedRows.length !== ids.length) {
      throw Object.assign(new Error("Une cible de disponibilité n'existe plus."), {
        code: "PROTO05_AVAILABILITY_TARGET_MISSING"
      });
    }
    const lockedById = new Map(lockedRows.map(row => [row.id, normalizedRow(row)]));
    for (const change of plan.changes) {
      const current = lockedById.get(change.id);
      if (!current || !sameBefore(current, change)) {
        throw Object.assign(new Error(`Le playable ${change.id} a changé depuis l'inspection.`), {
          code: "PROTO05_AVAILABILITY_PRECONDITION_FAILED"
        });
      }
    }
    const lockedPlan = await inspectLocalMediaAvailability(lockedRows, { roots });
    for (const change of plan.changes) {
      const current = lockedPlan.entries.find(entry => entry.id === change.id);
      if (
        !current
        || current.decision !== change.decision
        || current.after?.availability !== change.after.availability
        || current.after?.availabilityReason !== change.after.availabilityReason
      ) {
        throw Object.assign(new Error(`La preuve physique de ${change.id} a changé depuis l'inspection.`), {
          code: "PROTO05_AVAILABILITY_PHYSICAL_PRECONDITION_FAILED"
        });
      }
    }
    const updatedAt = sqlTimestamp(now);
    const appliedRows = [];
    for (const change of plan.changes) {
      await database.query("CALL sp_media_update_playable_availability(?, ?, ?)", [
        change.id,
        change.after.availability,
        JSON.stringify({
          reason: change.after.availabilityReason,
          expectedAvailability: change.before.availability,
          expectedReason: change.before.availabilityReason,
          expectedUpdatedAt: change.before.updatedAt,
          updatedAt
        })
      ]);
      appliedRows.push({
        id: change.id,
        before: change.before,
        after: { ...change.after, updatedAt }
      });
    }
    const [metadata] = await database.query(
      "UPDATE data_projection_metadata SET source_updated_at_utc = ? "
        + "WHERE document_key = 'media-library' AND source_updated_at_utc <=> ?",
      [updatedAt, metadataRows[0].source_updated_at_utc]
    );
    if (metadata.affectedRows !== 1) {
      throw Object.assign(new Error("Le témoin documentaire media-library n'a pas été mis à jour."), {
        code: "PROTO05_AVAILABILITY_METADATA_UPDATE_FAILED"
      });
    }
    const reloaded = (await readAvailabilityRows(database, { ids, forUpdate: true })).map(normalizedRow);
    for (const change of appliedRows) {
      const actual = reloaded.find(row => row.id === change.id);
      if (
        !actual
        || actual.availability !== change.after.availability
        || actual.availabilityReason !== change.after.availabilityReason
      ) {
        throw Object.assign(new Error(`La relecture transactionnelle de ${change.id} diverge.`), {
          code: "PROTO05_AVAILABILITY_RELOAD_FAILED"
        });
      }
    }
    await database.commit();
    return { applied: appliedRows.length, planHash: plan.planHash, rows: appliedRows };
  } catch (error) {
    try { await database.rollback(); } catch {}
    throw error;
  } finally {
    if (lockAcquired) {
      try { await database.query("SELECT RELEASE_LOCK(?)", [WRITE_LOCK]); } catch {}
    }
  }
}

module.exports = {
  PLAN_VERSION,
  applyLocalMediaAvailabilityPlan,
  hashFile,
  inspectLocalMediaAvailability,
  normalizedRow,
  observeManagedStorage,
  planHash,
  readAvailabilityRows,
  reconciliationDryRunReport,
  stableStringify
};
