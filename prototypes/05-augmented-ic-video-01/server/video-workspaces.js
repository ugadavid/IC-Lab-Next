"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const BUSINESS_ROLES = new Set(["original-remote", "working-copy", "derivation-local", "published-remote"]);
const PROJECTED_LEGACY_ROLE = "legacy-unknown";
const ACTIVE_DERIVATION_STATUSES = new Set(["queued", "running", "cancelling"]);

function explicitRole(entity) {
  return BUSINESS_ROLES.has(entity?.role) ? entity.role : PROJECTED_LEGACY_ROLE;
}

function activityEligible(role) {
  return !["working-copy", "derivation-local"].includes(role);
}

function accessDate(entity) {
  return entity?.updatedAt || entity?.createdAt || entity?.provenance?.importedAt || null;
}

function projectAssetAccesses(asset, sources, playables, treatments) {
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const entries = playables.map(playable => {
    const source = sourceById.get(playable.sourceId);
    const role = explicitRole(playable.role ? playable : source);
    return {
      id: playable.id,
      sourceId: playable.sourceId,
      role,
      name: playable.technicalMetadata?.fileName || source?.title || asset.title,
      createdAt: accessDate(playable) || accessDate(source),
      availability: playable.availability,
      kind: playable.kind,
      mimeType: playable.technicalMetadata?.mimeType || source?.mimeType || null,
      url: playable.url || playable.manifestUrl || null,
      durationMs: playable.technicalMetadata?.durationMs ?? null,
      width: playable.technicalMetadata?.width ?? null,
      height: playable.technicalMetadata?.height ?? null,
      activityEligible: activityEligible(role),
      derivationId: playable.provenance?.derivationId || null
    };
  });
  const byRole = role => entries.filter(entry => entry.role === role);
  const derivations = treatments.filter(treatment => treatment.sourceAssetId === asset.id).map(treatment => {
    const output = playables.find(playable => playable.id === treatment.outputPlayableId);
    return {
    id: treatment.outputPlayableId || treatment.id,
    derivationId: treatment.derivationId || treatment.id,
    name: treatment.label || "Tentative d’anonymisation",
    label: treatment.label || "Tentative d’anonymisation",
    status: treatment.status,
    availability: output?.availability || treatment.status,
    kind: output?.kind || "local-file",
    mimeType: output?.technicalMetadata?.mimeType || null,
    durationMs: output?.technicalMetadata?.durationMs ?? null,
    width: output?.technicalMetadata?.width ?? null,
    height: output?.technicalMetadata?.height ?? null,
    url: output?.url || null,
    createdAt: treatment.createdAt,
    updatedAt: treatment.updatedAt || treatment.finishedAt || treatment.startedAt || treatment.createdAt,
    sourcePlayableId: treatment.sourcePlayableId,
    outputPlayableId: treatment.outputPlayableId || null,
    retained: Boolean(treatment.retained),
    publishedPlayableId: treatment.publishedPlayableId || null,
    error: treatment.error || null,
    recipe: treatment.parameters || {}
  };});
  return {
    originalRemote: byRole("original-remote"),
    workingCopy: byRole("working-copy"),
    derivations,
    publishedRemote: byRole("published-remote"),
    legacy: byRole(PROJECTED_LEGACY_ROLE)
  };
}

function hasActiveDerivation(treatments, assetId, playableId) {
  return treatments.some(treatment => treatment.sourceAssetId === assetId
    && treatment.sourcePlayableId === playableId
    && ACTIVE_DERIVATION_STATUSES.has(treatment.status));
}

function safeWorkspaceComponent(value, label) {
  const text = String(value || "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,160}$/.test(text)) throw new Error(`${label} invalide.`);
  return text;
}

function boundedPath(root, ...parts) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...parts);
  if (!target.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("Chemin d’espace de travail refusé.");
  return target;
}

async function migrateWorkingCopy({ assetId, fileName, legacyMediaRoot, workspaceRoot, updateCanonical }) {
  safeWorkspaceComponent(assetId, "Identifiant d’asset");
  if (typeof fileName !== "string" || path.basename(fileName) !== fileName || !fileName) throw new Error("Nom de fichier invalide.");
  if (typeof updateCanonical !== "function") throw new Error("Writer canonique obligatoire.");
  const oldPath = boundedPath(legacyMediaRoot, fileName);
  const relativeStorageKey = `${assetId}/source/${fileName}`;
  const newPath = boundedPath(workspaceRoot, assetId, "source", fileName);
  const stat = await fs.stat(oldPath);
  if (!stat.isFile()) throw new Error("La copie historique n’est pas un fichier.");
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.rename(oldPath, newPath);
  try {
    await updateCanonical({ role: "working-copy", storageScope: "workspace", storageKey: relativeStorageKey });
  } catch (error) {
    try { await fs.rename(newPath, oldPath); } catch (rollbackError) { error.message += ` Rollback physique impossible : ${rollbackError.message}`; }
    throw error;
  }
  return { oldPath, newPath, relativeStorageKey };
}

module.exports = {
  ACTIVE_DERIVATION_STATUSES,
  BUSINESS_ROLES,
  PROJECTED_LEGACY_ROLE,
  activityEligible,
  explicitRole,
  hasActiveDerivation,
  migrateWorkingCopy,
  projectAssetAccesses
};
