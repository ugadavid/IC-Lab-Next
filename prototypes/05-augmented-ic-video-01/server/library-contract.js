"use strict";

const { normalizeDirectMediaUrl, normalizeHlsManifest, mediaAssetIdForCatalogEntry } = require("./media-contract");

const LIBRARY_SCHEMA = "0.1";

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} doit être une chaîne non vide.`);
  return value.trim();
}

function validId(value, label) {
  const id = requiredString(value, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,160}$/.test(id)) throw new Error(`${label} contient des caractères interdits.`);
  return id;
}

function libraryAssetIdForCatalogEntry(entry) {
  return mediaAssetIdForCatalogEntry(entry);
}

function sourceIdForCatalogEntry(entry) {
  return `source-${validId(entry.id, "L’identifiant de source")}`;
}

function playableIdForCatalogEntry(entry) {
  return validId(entry.id, "L’identifiant de source");
}

function emptyLibrary() {
  return { schemaVersion: LIBRARY_SCHEMA, updatedAt: null, assets: [], sources: [], playables: [] };
}

function libraryEntryFromCatalog(entry) {
  const assetId = libraryAssetIdForCatalogEntry(entry);
  const sourceId = sourceIdForCatalogEntry(entry);
  const playableId = playableIdForCatalogEntry(entry);
  const common = {
    id: sourceId,
    assetId,
    title: entry.title,
    durationMs: entry.durationMs ?? null,
    mimeType: entry.mimeType || null,
    authorized: entry.authorized === true,
    availability: "available"
  };
  let source;
  let playable;
  if (entry.provider === "youtube") {
    source = { ...common, kind: "youtube-embed", provider: "youtube", videoId: entry.videoId, embedUrl: entry.embedUrl, provenance: { catalogId: entry.id } };
    playable = { id: playableId, assetId, sourceId, kind: "youtube-embed", provider: "youtube", status: "available", availability: "available", durationMs: entry.durationMs ?? null, mimeType: null, videoId: entry.videoId, embedUrl: entry.embedUrl, url: entry.embedUrl, manifestUrl: null };
  } else if (entry.provider === "uga") {
    source = { ...common, kind: "hls", provider: "uga", originUrl: entry.sourceUrl || null, proxyUrl: entry.proxyUrl, manifestUrl: entry.proxyUrl, provenance: { catalogId: entry.id } };
    playable = { id: playableId, assetId, sourceId, kind: "hls", provider: "uga", status: "available", availability: "available", durationMs: entry.durationMs ?? null, mimeType: entry.mimeType || "application/vnd.apple.mpegurl", url: entry.proxyUrl, manifestUrl: entry.proxyUrl, originUrl: entry.sourceUrl || null };
  } else {
    throw new Error("Fournisseur non pris en charge dans la Library Proto05.");
  }
  return {
    asset: { id: assetId, title: entry.title, status: "active", sourceIds: [sourceId], playableIds: [playableId], defaultPlayableId: playableId, provenance: { kind: "catalog-migration", catalogId: entry.id }, rights: {} },
    source,
    playable
  };
}

function libraryFromCatalog(catalog) {
  const library = emptyLibrary();
  for (const entry of catalog || []) {
    if (!entry || entry.authorized !== true) continue;
    const item = libraryEntryFromCatalog(entry);
    library.assets.push(item.asset);
    library.sources.push(item.source);
    library.playables.push(item.playable);
  }
  return library;
}

function mergeCatalogIntoLibrary(library, catalog) {
  const next = JSON.parse(JSON.stringify(library || emptyLibrary()));
  next.schemaVersion = LIBRARY_SCHEMA;
  next.assets = Array.isArray(next.assets) ? next.assets : [];
  next.sources = Array.isArray(next.sources) ? next.sources : [];
  next.playables = Array.isArray(next.playables) ? next.playables : [];
  const existingAssets = new Set(next.assets.map(item => item.id));
  const existingSources = new Set(next.sources.map(item => item.id));
  const existingPlayables = new Set(next.playables.map(item => item.id));
  for (const entry of catalog || []) {
    if (!entry || entry.authorized !== true || existingPlayables.has(entry.id)) continue;
    const item = libraryEntryFromCatalog(entry);
    if (!existingAssets.has(item.asset.id)) next.assets.push(item.asset);
    if (!existingSources.has(item.source.id)) next.sources.push(item.source);
    next.playables.push(item.playable);
    existingAssets.add(item.asset.id); existingSources.add(item.source.id); existingPlayables.add(item.playable.id);
  }
  return next;
}

function validateLibraryShape(library) {
  if (!library || typeof library !== "object" || Array.isArray(library)) throw new Error("Library vidéo Proto05 invalide.");
  for (const key of ["assets", "sources", "playables"]) if (!Array.isArray(library[key])) throw new Error(`Library vidéo Proto05 : ${key} invalide.`);
  const ids = new Set();
  for (const item of [...library.assets, ...library.sources, ...library.playables]) {
    if (!item || typeof item.id !== "string" || ids.has(item.id)) throw new Error("Identifiant dupliqué dans la Library vidéo Proto05.");
    ids.add(item.id);
  }
  return library;
}

function normalizeLocalStorageKey(value) {
  const storageKey = requiredString(value, "La clé du fichier local");
  if (storageKey.startsWith("/") || storageKey.includes("\\") || storageKey.split("/").includes("..")) throw new Error("La clé du fichier local est invalide.");
  return storageKey;
}

function normalizeLibrarySourceInput(input, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("La source Library doit être un objet.");
  const kind = input.kind || input.sourceType;
  if (!["local-file", "direct-url", "hls"].includes(kind)) throw new Error("Le type de source doit être local-file, direct-url ou hls.");
  const base = { kind, provider: input.provider || null, mimeType: input.mimeType || null, durationMs: input.durationMs ?? null, availability: "declared", authorized: true };
  if (base.durationMs !== null && (!Number.isFinite(base.durationMs) || base.durationMs < 0)) throw new Error("La durée média est invalide.");
  if (kind === "local-file") return { ...base, provider: "local", storageKey: normalizeLocalStorageKey(input.storageKey), availability: "unavailable" };
  if (kind === "direct-url") {
    const normalized = normalizeDirectMediaUrl(input.url || input.sourceUrl, { mimeType: input.mimeType });
    if (["youtube.com", "www.youtube.com", "youtu.be"].includes(new URL(normalized.url).hostname)) throw new Error("YouTube doit rester une source d’intégration contrôlée.");
    return { ...base, provider: input.provider || "direct", ...normalized, sourceUrl: normalized.url, availability: "declared" };
  }
  if (typeof options.validateHls === "function") return { ...base, provider: input.provider || "hls", ...options.validateHls(input.url || input.manifestUrl || input.sourceUrl) };
  const normalized = normalizeHlsManifest(input.url || input.manifestUrl || input.sourceUrl, { mimeType: input.mimeType });
  return { ...base, provider: input.provider || "hls", ...normalized };
}

function playableFromSource(source, assetId, playableId) {
  const playable = { id: validId(playableId, "L’identifiant de playable"), assetId: validId(assetId, "L’identifiant d’asset"), sourceId: source.id, kind: source.kind, provider: source.provider, status: source.availability === "available" ? "available" : "pending", availability: source.availability, durationMs: source.durationMs ?? null, mimeType: source.mimeType || null };
  if (source.kind === "local-file") playable.storageKey = source.storageKey;
  else { playable.url = source.url || source.proxyUrl || null; playable.manifestUrl = source.manifestUrl || null; playable.originUrl = source.sourceUrl || source.originUrl || null; }
  return playable;
}

function resolveLibraryPlayable(videoRef, library) {
  const assetId = validId(videoRef?.assetId, "videoRef.assetId");
  const playableId = validId(videoRef?.playableId, "videoRef.playableId");
  const asset = library.assets.find(item => item.id === assetId);
  const playable = library.playables.find(item => item.id === playableId && item.assetId === assetId && item.status !== "blocked");
  if (!asset || !playable) throw new Error("videoRef ne référence pas un playable de Library disponible.");
  return { ...playable };
}

module.exports = { LIBRARY_SCHEMA, emptyLibrary, libraryEntryFromCatalog, libraryFromCatalog, mergeCatalogIntoLibrary, validateLibraryShape, normalizeLibrarySourceInput, playableFromSource, resolveLibraryPlayable, libraryAssetIdForCatalogEntry };
