"use strict";

const crypto = require("node:crypto");

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function token(kind, identity, revision) {
  const encoded = Buffer.from(String(identity), "utf8").toString("base64url");
  return `"proto05:${kind}:${encoded}:${revision}"`;
}

function activityRevisionToken(activityId, revision) {
  return token("activity", activityId, revision);
}

function mediaEditorialRevision(asset) {
  if (!asset) return null;
  return digest({
    id: asset.id,
    title: asset.title ?? "",
    description: asset.description ?? null,
    editorialMetadata: asset.editorialMetadata ?? null,
    folderId: asset.folderId ?? null,
    tagIds: [...(asset.tagIds || [])].sort(),
    declaredProvenance: asset.provenance?.declared ?? null,
    rights: asset.rights ?? null
  });
}

function mediaEditorialRevisionToken(asset) {
  const revision = mediaEditorialRevision(asset);
  return revision ? token("media-editorial", asset.id, revision) : null;
}

function storageIdentity(playable, sourcesById) {
  const source = sourcesById.get(playable.sourceId);
  const location = playable.location || source?.location || {};
  const storageKey = location.storageKey || playable.storageKey || source?.storageKey || null;
  const storageScope = location.storageScope || playable.storageScope || source?.storageScope || null;
  return storageKey ? `${storageScope || ""}:${storageKey}` : null;
}

function mediaDeletionRevision({ assetId, library, activities = [] }) {
  const asset = library?.assets?.find(item => item.id === assetId);
  if (!asset) return null;
  const sources = (library.sources || []).filter(item => item.assetId === assetId);
  const playables = (library.playables || []).filter(item => item.assetId === assetId);
  const sourceIds = new Set(sources.map(item => item.id));
  const playableIds = new Set(playables.map(item => item.id));
  const sourcesById = new Map((library.sources || []).map(item => [item.id, item]));
  const storageIdentities = new Set(playables.map(item => storageIdentity(item, sourcesById)).filter(Boolean));
  return digest({
    asset,
    sources,
    playables,
    treatments: (library.treatments || []).filter(item => (
      item.sourceAssetId === assetId
      || item.outputAssetId === assetId
      || playableIds.has(item.sourcePlayableId)
      || playableIds.has(item.outputPlayableId)
      || playableIds.has(item.publishedPlayableId)
    )),
    descendants: (library.assets || []).filter(item => (
      item.id !== assetId
      && (item.parentAssetId === assetId || item.familyRootAssetId === assetId)
    )),
    sharedStorage: (library.playables || []).filter(item => (
      item.assetId !== assetId
      && storageIdentities.has(storageIdentity(item, sourcesById))
    )).map(item => ({ id: item.id, assetId: item.assetId, sourceId: item.sourceId })),
    activityReferences: (activities || []).filter(activity => (
      activity?.videoRef?.assetId === assetId
      || playableIds.has(activity?.videoRef?.playableId)
    )).map(activity => ({ id: activity.id, videoRef: activity.videoRef })),
    sourceIds: [...sourceIds].sort()
  });
}

function mediaDeletionRevisionToken(input) {
  const revision = mediaDeletionRevision(input);
  return revision ? token("media-deletion", input.assetId, revision) : null;
}

function preconditionError(message, statusCode, code) {
  return Object.assign(new Error(message), { statusCode, code });
}

function requiredIfMatch(request) {
  const value = request.headers["if-match"];
  if (typeof value !== "string" || !value.trim()) {
    throw preconditionError("La révision chargée est obligatoire pour cette opération.", 428, "PROTO05_REVISION_REQUIRED");
  }
  if (value.includes(",") || value === "*") {
    throw preconditionError("Le témoin de révision est invalide.", 400, "PROTO05_REVISION_INVALID");
  }
  return value;
}

function parseToken(request, kind, identity, validateRevision) {
  const value = requiredIfMatch(request);
  const match = /^"proto05:([^:]+):([^:]+):([^"\s]+)"$/.exec(value);
  let decoded = null;
  try { decoded = match ? Buffer.from(match[2], "base64url").toString("utf8") : null; } catch {}
  if (!match || match[1] !== kind || decoded !== String(identity) || !validateRevision(match[3])) {
    throw preconditionError("Le témoin de révision est invalide pour cette ressource.", 400, "PROTO05_REVISION_INVALID");
  }
  return match[3];
}

function expectedActivityRevision(request, activityId) {
  return Number(parseToken(
    request,
    "activity",
    activityId,
    value => /^(?:0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
  ));
}

function expectedMediaRevision(request, assetId, kind) {
  return parseToken(request, kind, assetId, value => /^[a-f0-9]{64}$/.test(value));
}

function concurrencyConflict({ entityType, entityId, currentRevision = null, reason = "stale" }) {
  const error = new Error(entityType === "activity"
    ? "Cette activité a été modifiée depuis son ouverture. Vos changements n’ont pas été enregistrés. Rechargez la version actuelle avant de recommencer."
    : "Cette vidéo a été modifiée depuis son ouverture. Aucune modification n’a été enregistrée. Rechargez la fiche avant de recommencer.");
  error.code = "PROTO05_CONCURRENCY_CONFLICT";
  error.statusCode = 409;
  error.entityType = entityType;
  error.entityId = entityId;
  error.currentRevision = currentRevision;
  error.reason = reason;
  return error;
}

module.exports = {
  activityRevisionToken,
  concurrencyConflict,
  expectedActivityRevision,
  expectedMediaRevision,
  mediaDeletionRevision,
  mediaDeletionRevisionToken,
  mediaEditorialRevision,
  mediaEditorialRevisionToken,
  stableJson
};
