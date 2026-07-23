"use strict";

const MEDIA_REF_SCHEMA = "0.1";

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} doit être une chaîne non vide.`);
  return value.trim();
}

function mediaAssetIdForCatalogEntry(entry) {
  return `media-proto05-${requireString(entry?.id, "L’identifiant de source")}`;
}

function mediaRefForCatalogEntry(entry) {
  return {
    schemaVersion: MEDIA_REF_SCHEMA,
    assetId: mediaAssetIdForCatalogEntry(entry),
    playableId: requireString(entry.id, "L’identifiant de source")
  };
}

function normalizeDirectMediaUrl(value, options = {}) {
  const input = requireString(value, "L’URL média");
  let url;
  try { url = new URL(input); } catch { throw new Error("L’URL média est invalide."); }
  if (url.protocol !== "https:") throw new Error("L’URL média doit utiliser HTTPS.");
  if (url.hash) throw new Error("L’URL média ne doit pas contenir de fragment.");
  return {
    kind: "direct-url",
    url: url.toString(),
    manifestUrl: null,
    mimeType: options.mimeType || null
  };
}

function normalizeHlsManifest(value, options = {}) {
  const input = requireString(value, "Le manifeste HLS");
  let url;
  try { url = new URL(input, "https://proto05.invalid"); } catch { throw new Error("Le manifeste HLS est invalide."); }
  const pathname = url.pathname;
  if (!/\.m3u8$/i.test(pathname)) throw new Error("Le manifeste HLS doit se terminer par .m3u8.");
  if (url.origin === "https://proto05.invalid") {
    if (!input.startsWith("/")) throw new Error("Le manifeste HLS doit être une URL absolue ou un chemin interne.");
    return { kind: "hls", url: input, manifestUrl: input, mimeType: options.mimeType || "application/vnd.apple.mpegurl" };
  }
  if (url.protocol !== "https:") throw new Error("Le manifeste HLS doit utiliser HTTPS.");
  if (url.hash) throw new Error("Le manifeste HLS ne doit pas contenir de fragment.");
  return { kind: "hls", url: url.toString(), manifestUrl: url.toString(), mimeType: options.mimeType || "application/vnd.apple.mpegurl" };
}

function playbackDescriptorForCatalogEntry(entry) {
  if (!entry || typeof entry !== "object") throw new Error("Source vidéo absente.");
  const reference = mediaRefForCatalogEntry(entry);
  if (entry.provider === "youtube") {
    return { ...reference, provider: "youtube", kind: "youtube-embed", url: entry.embedUrl, manifestUrl: null, videoId: entry.videoId, embedUrl: entry.embedUrl, durationMs: entry.durationMs ?? null };
  }
  if (entry.provider === "uga" && entry.proxyUrl) {
    return { ...reference, provider: "uga", ...normalizeHlsManifest(entry.proxyUrl, { mimeType: entry.mimeType }), originUrl: entry.sourceUrl || null, durationMs: entry.durationMs ?? null };
  }
  if (entry.sourceType === "direct-url" && entry.sourceUrl) {
    return { ...reference, provider: entry.provider || "direct", ...normalizeDirectMediaUrl(entry.sourceUrl, { mimeType: entry.mimeType }), durationMs: entry.durationMs ?? null };
  }
  if (entry.sourceUrl && /\.m3u8$/i.test(entry.sourceUrl)) {
    return { ...reference, provider: entry.provider || "hls", ...normalizeHlsManifest(entry.sourceUrl, { mimeType: entry.mimeType }), durationMs: entry.durationMs ?? null };
  }
  throw new Error("Source vidéo non lisible.");
}

function resolveVideoRef(videoRef, catalog) {
  if (!videoRef || typeof videoRef !== "object" || Array.isArray(videoRef)) throw new Error("videoRef doit être un objet.");
  const assetId = requireString(videoRef.assetId, "videoRef.assetId");
  const playableId = requireString(videoRef.playableId, "videoRef.playableId");
  const entry = (catalog || []).find(item => item && item.id === playableId && mediaAssetIdForCatalogEntry(item) === assetId && item.authorized === true);
  if (!entry) throw new Error("videoRef référence une source vidéo absente ou non autorisée.");
  return playbackDescriptorForCatalogEntry(entry);
}

module.exports = {
  MEDIA_REF_SCHEMA,
  mediaAssetIdForCatalogEntry,
  mediaRefForCatalogEntry,
  normalizeDirectMediaUrl,
  normalizeHlsManifest,
  playbackDescriptorForCatalogEntry,
  resolveVideoRef
};
