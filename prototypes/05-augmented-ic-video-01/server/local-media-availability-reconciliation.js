"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { resolveStorageKey } = require("./media-library-availability");

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

async function readAvailabilityRows(database, { ids = null, forUpdate = false } = {}) {
  const selectedIds = Array.isArray(ids) ? [...new Set(ids)].sort() : null;
  if (selectedIds?.length === 0) return [];
  const where = selectedIds
    ? `AND mp.id IN (${selectedIds.map(() => "?").join(", ")})`
    : "";
  const [rows] = await database.query(
    `SELECT mp.id, mp.asset_id, mp.source_id, mp.kind, mp.provider, mp.role,
      mp.availability, mp.availability_reason, mp.storage_scope, mp.storage_key,
      mp.updated_at, mpm.size_bytes expected_size_bytes, mpm.sha256 expected_sha256
      FROM media_playables mp
      LEFT JOIN media_playable_metadata mpm ON mpm.playable_id = mp.id
      WHERE mp.removed_at IS NULL ${where}
      ORDER BY mp.id${forUpdate ? " FOR UPDATE" : ""}`,
    selectedIds || []
  );
  return rows;
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
      const [result] = await database.query(
        `UPDATE media_playables
          SET availability = ?, availability_reason = ?, updated_at = ?
          WHERE id = ? AND availability = ? AND availability_reason <=> ? AND updated_at <=> ?`,
        [
          change.after.availability,
          change.after.availabilityReason,
          updatedAt,
          change.id,
          change.before.availability,
          change.before.availabilityReason,
          change.before.updatedAt
        ]
      );
      if (result.affectedRows !== 1) {
        throw Object.assign(new Error(`La précondition SQL de ${change.id} a été refusée.`), {
          code: "PROTO05_AVAILABILITY_CONDITIONAL_UPDATE_FAILED"
        });
      }
      appliedRows.push({
        id: change.id,
        before: change.before,
        after: { ...change.after, updatedAt }
      });
    }
    const [metadata] = await database.query(
      "UPDATE data_projection_metadata SET source_updated_at_utc = ? WHERE document_key = 'media-library'",
      [updatedAt]
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
  stableStringify
};
