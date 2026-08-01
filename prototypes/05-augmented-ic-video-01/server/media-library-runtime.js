"use strict";

/**
 * Runtime adapter for the canonical Proto05 MediaLibrary.
 *
 * The 1.0 document is the only persisted source of truth. The returned
 * projection deliberately exposes the historical flat fields used by the
 * existing routes and pages during the transition.
 */

const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const { validateMediaLibrary } = require("./media-library-schema");
const { migrateLegacyMediaLibrary } = require("./media-library-migration");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceTitle(asset, source) {
  return source.title || asset?.title || source.id;
}

function flattenPlayable(playable) {
  const location = playable.location || {};
  const result = {
    id: playable.id,
    assetId: playable.assetId,
    sourceId: playable.sourceId,
    kind: playable.kind,
    provider: playable.provider || null,
    status: playable.availability === "blocked" ? "blocked" : playable.availability === "available" ? "available" : "pending",
    availability: playable.availability,
    availabilityReason: playable.availabilityReason ?? null,
    durationMs: playable.technicalMetadata?.durationMs ?? null,
    mimeType: playable.technicalMetadata?.mimeType ?? null,
    sha256: playable.technicalMetadata?.sha256 ?? null,
    sizeBytes: playable.technicalMetadata?.sizeBytes ?? null,
    fileName: playable.technicalMetadata?.fileName ?? null,
    technicalMetadata: clone(playable.technicalMetadata || {}),
    provenance: clone(playable.provenance || {}),
    role: playable.role || null,
    ...location
  };
  if (location.storageKey) result.url = `/api/proto05/library/media/${location.storageScope === "workspace" ? "workspace/" : ""}${encodeURIComponent(location.storageKey)}`;
  if (location.manifestUrl && !result.url) result.url = location.manifestUrl;
  if (location.embedUrl && !result.url) result.url = location.embedUrl;
  return result;
}

function projectCanonicalLibrary(canonical) {
  const assets = canonical.assets.map(asset => ({
    ...clone(asset),
    status: asset.lifecycle,
    sourceIds: canonical.sources.filter(source => source.assetId === asset.id).map(source => source.id),
    playableIds: canonical.playables.filter(playable => playable.assetId === asset.id).map(playable => playable.id)
  }));
  const sources = canonical.sources.map(source => {
    const asset = canonical.assets.find(item => item.id === source.assetId);
    const origin = source.origin || {};
    return {
      ...clone(source),
      title: sourceTitle(asset, source),
      originUrl: origin.originUrl || origin.sourceUrl || origin.url || null,
      sourceUrl: origin.sourceUrl || origin.originUrl || origin.url || null,
      url: origin.url || null,
      manifestUrl: origin.manifestUrl || null,
      proxyUrl: origin.proxyUrl || null,
      embedUrl: origin.embedUrl || null,
      videoId: origin.videoId || null,
      storageKey: origin.storageKey || null,
      role: source.role || null,
      availability: source.availability || "unknown"
    };
  });
  const playables = canonical.playables.map(flattenPlayable);
  return { ...clone(canonical), assets, sources, playables };
}

function readJsonSync(file) {
  return JSON.parse(fsSync.readFileSync(file, "utf8"));
}

function migrationForLegacy(document, options = {}) {
  const result = migrateLegacyMediaLibrary({
    legacyDocument: document,
    availabilitySnapshot: options.availabilitySnapshot || { observations: [] },
    options: { defaultTimestamp: options.defaultTimestamp, activities: options.activities || [], legacyCatalog: options.legacyCatalog || [] }
  });
  if (!result.output || !result.valid || !result.writeEligible) {
    const error = new Error("La Library historique ne peut pas être adaptée au contrat canonique.");
    error.migration = result;
    throw error;
  }
  return result.output;
}

function readCanonicalMediaLibrary(file, options = {}) {
  const value = typeof file === "string" ? readJsonSync(file) : file;
  if (value?.schemaVersion === "0.1") return { canonical: migrationForLegacy(value, options), sourceWasLegacy: true, validation: null };
  const validation = validateMediaLibrary(value);
  if (!validation.readable || !validation.valid) {
    const error = new Error("La Library canonique est invalide ou illisible.");
    error.validation = validation;
    throw error;
  }
  return { canonical: clone(value), sourceWasLegacy: false, validation };
}

function appendMigratedEntries(canonical, runtime, knownIds) {
  const newAssets = runtime.assets.filter(item => !knownIds.assets.has(item.id));
  const newSources = runtime.sources.filter(item => !knownIds.sources.has(item.id));
  const newPlayables = runtime.playables.filter(item => !knownIds.playables.has(item.id));
  if (!newAssets.length && !newSources.length && !newPlayables.length) return clone(canonical);
  const migrated = migrationForLegacy({ schemaVersion: "0.1", updatedAt: runtime.updatedAt || canonical.updatedAt, assets: newAssets, sources: newSources, playables: newPlayables });
  const next = clone(canonical);
  next.assets.push(...migrated.assets);
  next.sources.push(...migrated.sources);
  next.playables.push(...migrated.playables);
  for (const item of migrated.assets) {
    const source = newAssets.find(candidate => candidate.id === item.id);
    if (source?.provenance) item.provenance = { ...item.provenance, ...clone(source.provenance) };
  }
  for (const item of migrated.sources) {
    const source = newSources.find(candidate => candidate.id === item.id);
    if (source?.provenance) item.provenance = { ...item.provenance, ...clone(source.provenance) };
    if (source?.role) item.role = source.role;
  }
  for (const item of migrated.playables) {
    const source = newPlayables.find(candidate => candidate.id === item.id);
    if (source?.provenance) item.provenance = { ...item.provenance, ...clone(source.provenance) };
    if (source?.role) item.role = source.role;
  }
  return next;
}

function canonicalFromRuntime(runtime, previousCanonical) {
  if (!previousCanonical || previousCanonical.schemaVersion === "0.1") return migrationForLegacy(runtime);
  const knownIds = {
    assets: new Set(previousCanonical.assets.map(item => item.id)),
    sources: new Set(previousCanonical.sources.map(item => item.id)),
    playables: new Set(previousCanonical.playables.map(item => item.id))
  };
  const next = appendMigratedEntries(previousCanonical, runtime, knownIds);
  for (const asset of next.assets) {
    const runtimeAsset = runtime.assets.find(item => item.id === asset.id);
    if (runtimeAsset) {
      if (typeof runtimeAsset.title === "string") asset.title = runtimeAsset.title;
      if (Object.prototype.hasOwnProperty.call(runtimeAsset, "description")) {
        if (runtimeAsset.description === null) delete asset.description;
        else asset.description = runtimeAsset.description;
      }
      if (Object.prototype.hasOwnProperty.call(runtimeAsset, "editorialMetadata")) {
        asset.editorialMetadata = clone(runtimeAsset.editorialMetadata);
      }
      if (runtimeAsset.provenance && typeof runtimeAsset.provenance === "object") {
        asset.provenance = clone(runtimeAsset.provenance);
      }
      if (runtimeAsset.rights && typeof runtimeAsset.rights === "object") {
        asset.rights = clone(runtimeAsset.rights);
      }
      if (runtimeAsset.defaultPlayableId !== undefined) asset.defaultPlayableId = runtimeAsset.defaultPlayableId;
      if (Object.prototype.hasOwnProperty.call(runtimeAsset, "folderId")) asset.folderId = runtimeAsset.folderId;
      if (Array.isArray(runtimeAsset.tagIds)) asset.tagIds = clone(runtimeAsset.tagIds);
      if (runtimeAsset.status === "archived" || runtimeAsset.lifecycle === "archived") asset.lifecycle = "archived";
    }
  }
  if (Array.isArray(runtime.folders)) next.folders = clone(runtime.folders);
  if (Array.isArray(runtime.tags)) next.tags = clone(runtime.tags);
  next.updatedAt = runtime.updatedAt || next.updatedAt;
  return next;
}

function assertWritableCanonical(canonical) {
  const validation = validateMediaLibrary(canonical);
  if (!validation.valid || !validation.writeEligible) {
    const detail = validation.problems?.[0];
    const error = new Error(detail
      ? `La Library canonique ne peut pas être écrite : ${detail.path} — ${detail.message}`
      : "La Library canonique ne peut pas être écrite.");
    error.validation = validation;
    throw error;
  }
  return canonical;
}

async function readCanonicalMediaLibraryAsync(file, options = {}) {
  return readCanonicalMediaLibrary(JSON.parse(await fs.readFile(file, "utf8")), options);
}

module.exports = {
  readCanonicalMediaLibrary,
  readCanonicalMediaLibraryAsync,
  projectCanonicalLibrary,
  canonicalFromRuntime,
  assertWritableCanonical,
  migrationForLegacy
};
