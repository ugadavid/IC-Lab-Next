const http = require("node:http");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const { spawn, spawnSync } = require("node:child_process");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const {
  mediaRefForCatalogEntry,
  resolveVideoRef
} = require("./media-contract");
const {
  libraryFromCatalog,
  mergeCatalogIntoLibrary,
  validateLibraryShape,
  normalizeLibrarySourceInput,
  playableFromSource,
  resolveLibraryPlayable
} = require("./library-contract");

const PORT = Number(process.env.PORT || 8791);
const VERSION = "0.1.29";
const SERVICE = "proto05-augmented-video";
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "activities.json");
const VIDEO_CATALOG_FILE = path.join(DATA_DIR, "video-catalog.json");
const VIDEO_LIBRARY_FILE = path.join(DATA_DIR, "video-library.json");
const VIDEO_LIBRARY_MEDIA_DIR = path.join(DATA_DIR, "video-library-media");
const REMOTE_COPY_MAX_BYTES = Number(process.env.PROTO05_REMOTE_COPY_MAX_BYTES || 1024 * 1024 * 1024);
const REMOTE_COPY_TIMEOUT_MS = Number(process.env.PROTO05_REMOTE_COPY_TIMEOUT_MS || 120000);
const HLS_PREPARATION_ROOT = path.join(os.tmpdir(), "proto05-hls-preparations");
const HLS_PREPARATION_TIMEOUT_MS = Number(process.env.PROTO05_HLS_PREPARATION_TIMEOUT_MS || 15 * 60 * 1000);
const HLS_PREPARATION_TTL_MS = Number(process.env.PROTO05_HLS_PREPARATION_TTL_MS || 30 * 60 * 1000);
const HLS_PREPARATION_MAX_BYTES = Number(process.env.PROTO05_HLS_PREPARATION_MAX_BYTES || 2 * 1024 * 1024 * 1024);
const HLS_PREPARATION_MAX_DURATION_SECONDS = Number(process.env.PROTO05_HLS_PREPARATION_MAX_DURATION_SECONDS || 2 * 60 * 60);
const ACTIVE_HLS_PREPARATIONS = new Map();
const HLS_DERIVATION_ROOT = path.join(os.tmpdir(), "proto05-hls-derivations");
const HLS_DERIVATION_TIMEOUT_MS = Number(process.env.PROTO05_HLS_DERIVATION_TIMEOUT_MS || 30 * 60 * 1000);
const HLS_DERIVATION_TTL_MS = Number(process.env.PROTO05_HLS_DERIVATION_TTL_MS || 30 * 60 * 1000);
const ACTIVE_HLS_DERIVATIONS = new Map();
const INDEX_FILE = "index-0.0.9.html";
const HUB_HLS_ORIGIN = "http://127.0.0.1:8790";
const HLS_JS_ASSET_PATH = path.resolve(ROOT_DIR, "..", "00-ic-hub", "server", "node_modules", "hls.js", "dist", "hls.min.js");
const HLS_PREFIX = "/api/hls/";
const LANGUAGE_CATALOG_FILE = path.resolve(process.env.PROTO05_LANGUAGE_CATALOG_FILE || path.join(ROOT_DIR, "..", "..", "shared", "reference-data", "languages.json"));
const STATIC_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t"
});
/* Legacy catalog retained only in history; the persistent data file below is authoritative.
const LEGACY_VIDEO_CATALOG = Object.freeze([
  Object.freeze({
    id: "video-proto05-uga-37004",
    title: "Vidéo augmentée IC — source UGA",
    source: "UGA",
    sourceType: "hls-proxy",
    key: "uga-37004/livestream.m3u8",
    proxyUrl: "/api/hls/uga-37004/livestream.m3u8",
    mimeType: "application/vnd.apple.mpegurl",
    durationMs: 939217,
    provider: "uga",
    authorized: true
  }),
  Object.freeze({
    id: "video-proto05-youtube-fg4h0-v3otk",
    title: "Vidéo de test — YouTube contrôlé",
    provider: "youtube",
    videoId: "FG4h0_v3oTk",
    embedUrl: "https://www.youtube.com/embed/FG4h0_v3oTk?si=O4Rv_ybx21escKID",
    durationMs: null,
    authorized: true
  })
]); */

function freezeVideoCatalog(entries) {
  return Object.freeze(entries.map(entry => Object.freeze({ ...entry })));
}

function safeVideoCatalogFile() {
  const root = path.resolve(DATA_DIR);
  const file = path.resolve(VIDEO_CATALOG_FILE);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("Chemin de catalogue invalide.");
  return file;
}

function validateYouTubeLink(value) {
  const input = String(value || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return { videoId: input, embedUrl: `https://www.youtube.com/embed/${input}` };
  let url;
  try { url = new URL(input); } catch { throw new Error("YouTube doit utiliser une URL d’intégration youtube.com/embed/... ou un identifiant vidéo valide."); }
  if (url.protocol !== "https:" || url.hostname !== "www.youtube.com" || !url.pathname.startsWith("/embed/") || !/^[A-Za-z0-9_-]{11}$/.test(url.pathname.slice("/embed/".length)) || url.hash) throw new Error("YouTube doit utiliser une URL d’intégration youtube.com/embed/... ou un identifiant vidéo valide.");
  return { videoId: url.pathname.slice("/embed/".length), embedUrl: url.toString() };
}

function validateUgaLink(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { throw new Error("La source HLS doit être une URL UGA autorisée."); }
  const prefix = "/media/videos/7d74074b07ff1dfc9ed59cdade1a126fc17fed888ca9d26da6e5b2875e8b5120/37004/";
  const match = url.protocol === "https:" && url.hostname === "videos.univ-grenoble-alpes.fr" && url.pathname.startsWith(prefix) && /^(livestream|360p|720p|1080p)\.m3u8$/.test(url.pathname.slice(prefix.length)) && !url.search && !url.hash;
  if (!match) throw new Error("La source HLS doit utiliser le domaine et le chemin UGA autorisés.");
  const file = url.pathname.slice(prefix.length);
  return { sourceUrl: url.toString(), key: `uga-37004/${file}`, proxyUrl: `/api/hls/uga-37004/${file}` };
}

function loadVideoCatalog() {
  const parsed = JSON.parse(fsSync.readFileSync(safeVideoCatalogFile(), "utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.videos)) throw new Error("Catalogue vidéo Proto05 invalide.");
  const ids = new Set();
  return freezeVideoCatalog(parsed.videos.map(video => {
    if (!video || typeof video !== "object" || typeof video.id !== "string" || !video.id || ids.has(video.id) || video.authorized !== true) throw new Error("Entrée vidéo Proto05 invalide.");
    ids.add(video.id);
    if (video.provider === "youtube") {
      const checked = validateYouTubeLink(video.embedUrl);
      if (checked.videoId !== video.videoId) throw new Error("Entrée YouTube Proto05 invalide.");
      return { ...video, ...checked };
    }
    if (video.provider === "uga") {
      const checked = validateUgaLink(video.sourceUrl || "https://videos.univ-grenoble-alpes.fr/media/videos/7d74074b07ff1dfc9ed59cdade1a126fc17fed888ca9d26da6e5b2875e8b5120/37004/livestream.m3u8");
      if (video.proxyUrl !== checked.proxyUrl) throw new Error("Entrée HLS Proto05 invalide.");
      return { ...video, ...checked };
    }
    throw new Error("Fournisseur vidéo Proto05 non autorisé.");
  }));
}

let VIDEO_CATALOG = loadVideoCatalog();

function safeVideoLibraryFile() {
  const root = path.resolve(DATA_DIR);
  const file = path.resolve(VIDEO_LIBRARY_FILE);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("Chemin de Library vidéo invalide.");
  return file;
}

function loadVideoLibrary() {
  const file = safeVideoLibraryFile();
  let library;
  if (!fsSync.existsSync(file)) {
    library = libraryFromCatalog(VIDEO_CATALOG);
    fsSync.writeFileSync(file, `${JSON.stringify(library, null, 2)}\n`, "utf8");
  } else {
    library = JSON.parse(fsSync.readFileSync(file, "utf8"));
  }
  const merged = mergeCatalogIntoLibrary(validateLibraryShape(library), VIDEO_CATALOG);
  if (JSON.stringify(merged) !== JSON.stringify(library)) {
    const backup = `${file}.bak`;
    try { fsSync.copyFileSync(file, backup); } catch {}
    fsSync.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  }
  return validateLibraryShape(merged);
}

let VIDEO_LIBRARY = loadVideoLibrary();

function safeLibraryMediaPath(storageKey) {
  if (typeof storageKey !== "string" || !storageKey || storageKey.startsWith("/") || storageKey.includes("\\") || storageKey.split("/").some(part => !part || part === "." || part === "..")) throw new Error("Clé de média locale invalide.");
  const root = path.resolve(VIDEO_LIBRARY_MEDIA_DIR);
  const file = path.resolve(root, storageKey);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Chemin de média local refusé.");
  return file;
}

async function serveLibraryMedia(request, response, url) {
  const prefix = "/api/proto05/library/media/";
  if (!url.pathname.startsWith(prefix)) return false;
  const canSendMediaError = () => !request.aborted && !response.headersSent && !response.destroyed;
  response._proto05Request = request;
  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, HEAD" });
    return true;
  }
  let storageKey;
  try { storageKey = decodeURIComponent(url.pathname.slice(prefix.length)); }
  catch { sendJson(response, 400, { error: "Clé de média locale invalide." }); return true; }
  let file;
  try { file = safeLibraryMediaPath(storageKey); }
  catch (error) { sendJson(response, 404, { error: error.message }); return true; }
  let stat;
  try { stat = await fs.stat(file); if (!stat.isFile()) throw new Error("not file"); }
  catch { sendJson(response, 404, { error: "Copie locale introuvable." }); return true; }
  const extension = path.extname(file).toLowerCase();
  const contentType = STATIC_TYPES[extension] || "application/octet-stream";
  const range = request.headers.range;
  let start = 0;
  let end = stat.size - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) { response.writeHead(416, { "content-range": `bytes */${stat.size}` }); response.end(); return true; }
    if (match[1]) start = Number(match[1]);
    if (match[2]) end = Number(match[2]);
    else end = Math.min(start + 1024 * 1024 - 1, stat.size - 1);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= stat.size) {
      response.writeHead(416, { "content-range": `bytes */${stat.size}` }); response.end(); return true;
    }
    end = Math.min(end, stat.size - 1); status = 206;
  }
  const headers = { "content-type": contentType, "accept-ranges": "bytes", "content-length": end - start + 1, "cache-control": "private, max-age=3600" };
  if (status === 206) headers["content-range"] = `bytes ${start}-${end}/${stat.size}`;
  if (request.aborted || response.destroyed) return true;
  response.writeHead(status, headers);
  if (request.method === "HEAD") return response.end();
  const stream = fsSync.createReadStream(file, { start, end });
  const abortStream = () => { if (!stream.destroyed) stream.destroy(); };
  request.once("aborted", abortStream);
  response.once("close", abortStream);
  try {
    await pipeline(stream, response);
  } catch (error) {
    const expectedAbort = request.aborted || response.destroyed || ["ERR_STREAM_PREMATURE_CLOSE", "ECONNRESET", "EPIPE"].includes(error?.code);
    if (!expectedAbort) throw error;
  } finally {
    request.removeListener("aborted", abortStream);
    response.removeListener("close", abortStream);
    if (!stream.destroyed) stream.destroy();
  }
  return true;
}

async function servePreparationMedia(request, response, url) {
  const match = url.pathname.match(/^\/api\/proto05\/library\/hls-preparations\/([^/]+)\/media$/);
  if (!match) return false;
  if (!['GET', 'HEAD'].includes(request.method)) { sendJson(response, 405, { error: 'Méthode non autorisée.' }, { allow: 'GET, HEAD' }); return true; }
  const job = ACTIVE_HLS_PREPARATIONS.get(decodeURIComponent(match[1]));
  if (!job?.outputPath) { sendJson(response, 404, { error: 'Préparation HLS introuvable ou expirée.' }); return true; }
  let stat; try { stat = await fs.stat(job.outputPath); if (!stat.isFile()) throw new Error(); } catch { sendJson(response, 404, { error: 'Fichier temporaire introuvable.' }); return true; }
  let start = 0, end = stat.size - 1, status = 200;
  const range = request.headers.range;
  if (range) { const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(range); if (!rangeMatch) { response.writeHead(416, { 'content-range': `bytes */${stat.size}` }); response.end(); return true; } if (rangeMatch[1]) start = Number(rangeMatch[1]); if (rangeMatch[2]) end = Number(rangeMatch[2]); else end = Math.min(start + 1024 * 1024 - 1, stat.size - 1); if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= stat.size) { response.writeHead(416, { 'content-range': `bytes */${stat.size}` }); response.end(); return true; } end = Math.min(end, stat.size - 1); status = 206; }
  const headers = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'no-store' }; if (status === 206) headers['content-range'] = `bytes ${start}-${end}/${stat.size}`;
  if (request.aborted || response.destroyed) return true; response.writeHead(status, headers); if (request.method === 'HEAD') { response.end(); return true; }
  const stream = fsSync.createReadStream(job.outputPath, { start, end }); const abort = () => { if (!stream.destroyed) stream.destroy(); }; request.once('aborted', abort); response.once('close', abort); try { await pipeline(stream, response); } catch (error) { if (!(request.aborted || response.destroyed || ['ERR_STREAM_PREMATURE_CLOSE', 'ECONNRESET', 'EPIPE'].includes(error?.code))) throw error; } finally { request.removeListener('aborted', abort); response.removeListener('close', abort); if (!stream.destroyed) stream.destroy(); } return true;
}
function loadLanguageCatalog() {
  const parsed = JSON.parse(fsSync.readFileSync(LANGUAGE_CATALOG_FILE, "utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.languages)) throw new Error("Référentiel partagé des langues invalide.");
  const identifiers = new Set();
  const languages = parsed.languages.map(language => {
    if (!language || typeof language !== "object" || Array.isArray(language) || typeof language.id !== "string" || !language.id || typeof language.label !== "string" || !language.label) throw new Error("Entrée invalide dans le référentiel partagé des langues.");
    if (identifiers.has(language.id)) throw new Error(`Identifiant de langue partagé dupliqué : ${language.id}.`);
    identifiers.add(language.id);
    return Object.freeze({ id: language.id, label: language.label });
  });
  return Object.freeze(languages);
}
const LANGUAGE_CATALOG = loadLanguageCatalog();
const LANGUAGE_CATALOG_BY_ID = new Map(LANGUAGE_CATALOG.map(language => [language.id, language]));
let writeQueue = Promise.resolve();

function sendJson(response, status, payload, headers = {}) {
  if (response.headersSent || response.destroyed || response._proto05Request?.aborted) return false;
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(body);
}

function safeDataFile() {
  const root = path.resolve(DATA_DIR);
  const file = path.resolve(DATA_FILE);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("Chemin de données invalide.");
  return file;
}

async function readActivities() {
  try {
    const parsed = JSON.parse(await fs.readFile(safeDataFile(), "utf8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.activities)) throw new Error("JSON d’activités invalide.");
    parsed.activities = parsed.activities.map(normalizeActivityOverlays);
    parsed.activities.forEach(validateActivityVideoReference);
    return parsed;
  } catch (error) {
    console.error(`[data] lecture impossible : ${error.message}`);
    throw new Error("Données Proto05 absentes ou JSON invalide.");
  }
}

function normalizeActivityOverlays(activity) {
  const next = { ...activity };
  const segments = new Map((activity.segments || []).map(segment => [segment.id, segment]));
  const overlays = Array.isArray(activity.overlays) ? activity.overlays.map(overlay => ({ ...overlay, layerIds: [...(overlay.layerIds || [])] })) : [];
  const overlayIds = new Set(overlays.map(overlay => overlay.id));
  next.teacherAnnotations = (activity.teacherAnnotations || []).map(annotation => {
    const copy = { ...annotation };
    if (Object.prototype.hasOwnProperty.call(copy, "overlay") && !copy.overlay) delete copy.overlay;
    if (copy.overlay && typeof copy.overlay === "object") {
      const segment = segments.get(copy.segmentId);
      if (!segment) throw new Error(`Segment inconnu pour l’annotation ${copy.id}.`);
      let id = `overlay-${copy.id}`;
      let suffix = 1;
      while (overlayIds.has(id)) id = `overlay-${copy.id}-${suffix++}`;
      overlays.push({ id, annotationId: copy.id, startMs: segment.startMs, endMs: segment.endMs, title: copy.overlay.title, text: copy.overlay.text, layerIds: [...(copy.overlay.layerIds || [])] });
      overlayIds.add(id);
      delete copy.overlay;
    }
    return copy;
  });
  next.overlays = overlays;
  return next;
}

function validateActivityVideoReference(activity) {
  const video = activity?.video;
  const catalogEntry = VIDEO_CATALOG.find(entry => entry.id === video?.id && entry.authorized);
  if (catalogEntry) {
    if (catalogEntry.provider === "youtube" && (video.provider !== "youtube" || video.videoId !== catalogEntry.videoId || video.embedUrl !== catalogEntry.embedUrl)) throw new Error("Une activité référence une source YouTube incohérente.");
    if (catalogEntry.provider === "uga" && video.proxyUrl !== catalogEntry.proxyUrl) throw new Error("Une activité référence une source HLS incohérente.");
    return;
  }
  if (activity?.videoRef) {
    const playable = resolveLibraryPlayable(activity.videoRef, VIDEO_LIBRARY);
    if (!video || video.id !== playable.id) throw new Error("La projection activity.video ne correspond pas au playable Library.");
    return;
  }
  throw new Error("Une activité référence une source vidéo absente ou non validée.");
}

function activityVideoRef(activity) {
  if (activity?.videoRef) {
    try { return resolveLibraryPlayable(activity.videoRef, VIDEO_LIBRARY) && { schemaVersion: "0.1", assetId: activity.videoRef.assetId, playableId: activity.videoRef.playableId }; }
    catch {}
  }
  const entry = VIDEO_CATALOG.find(item => item.id === activity?.video?.id && item.authorized);
  if (!entry) throw new Error("Impossible de construire videoRef pour cette activitÃ©.");
  if (activity?.videoRef) {
    if (activity.videoRef.playableId !== entry.id) throw new Error("videoRef ne correspond pas Ã  activity.video.");
    return activity.videoRef;
  }
  return mediaRefForCatalogEntry(entry);
}

function resolveActivityVideo(activity) {
  validateActivityVideoReference(activity);
  const videoRef = activityVideoRef(activity);
  try {
    return { videoRef, source: resolveLibraryPlayable(videoRef, VIDEO_LIBRARY) };
  } catch (libraryError) {
    return { videoRef, source: resolveVideoRef(videoRef, VIDEO_CATALOG) };
  }
}

function activityForResponse(activity) {
  const resolved = resolveActivityVideo(activity);
  return { ...activity, videoRef: resolved.videoRef, videoSource: resolved.source };
}

function readRequestBody(request, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > limit) {
        request.destroy();
        reject(new Error("Payload trop volumineux."));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function validateMetadataPatch(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  const allowed = new Set(["title", "description", "instruction", "pedagogicalQuestion", "videoId", "videoRef"]);
  const unknown = Object.keys(payload).filter(key => !allowed.has(key));
  if (unknown.length) throw new Error(`Champ non autorisé : ${unknown.join(", ")}.`);
  for (const key of ["title", "description", "instruction", "pedagogicalQuestion"]) {
    if (payload[key] !== undefined && (typeof payload[key] !== "string" || payload[key].length > 5000)) {
      throw new Error(`Le champ ${key} doit être une chaîne de 5000 caractères maximum.`);
    }
  }
  if (payload.videoId !== undefined && (typeof payload.videoId !== "string" || !VIDEO_CATALOG.some(video => video.id === payload.videoId && video.authorized))) {
    throw new Error("La vidéo sélectionnée n’est pas autorisée.");
  }
  if (payload.videoRef !== undefined) {
    if (!payload.videoRef || typeof payload.videoRef !== "object" || Array.isArray(payload.videoRef)) throw new Error("videoRef doit être un objet.");
    if (typeof payload.videoRef.assetId !== "string" || typeof payload.videoRef.playableId !== "string") throw new Error("videoRef doit contenir assetId et playableId.");
  }
  return payload;
}

function activityVideoFromCatalog(video, current = {}) {
  if (video.provider === "youtube") {
    return { ...current, id: video.id, title: video.title, provider: "youtube", videoId: video.videoId, embedUrl: video.embedUrl, durationMs: video.durationMs };
  }
  return { ...current, id: video.id, title: video.title, ...(current.provider ? { provider: "uga" } : {}), kind: "hls", proxyUrl: video.proxyUrl, durationMs: video.durationMs };
}

function activityVideoFromLibrary(asset, playable, current = {}) {
  const projection = { ...current, id: playable.id, title: asset.title, kind: playable.kind, durationMs: playable.durationMs ?? null };
  if (playable.provider) projection.provider = playable.provider;
  if (playable.videoId) { projection.videoId = playable.videoId; projection.embedUrl = playable.embedUrl; }
  if (playable.url) projection.url = playable.url;
  if (playable.manifestUrl) projection.manifestUrl = playable.manifestUrl;
  if (playable.originUrl) projection.sourceUrl = playable.originUrl;
  if (playable.proxyUrl) projection.proxyUrl = playable.proxyUrl;
  if (playable.storageKey) projection.storageKey = playable.storageKey;
  return projection;
}

function integerTime(value, label, durationMs = Infinity) {
  if (!Number.isInteger(value) || value < 0 || value > durationMs) throw new Error(`${label} doit être un entier positif dans la durée vidéo.`);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} doit être un objet.`);
  return value;
}

function requireIdentifier(value, label) {
  if (typeof value !== "string" || !value) throw new Error(`${label} doit avoir un identifiant non vide.`);
  return value;
}

function decodeDeletionIdentifier(value) {
  let id;
  try { id = decodeURIComponent(value); }
  catch { throw new Error("Identifiant d’activité invalide."); }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(id)) throw new Error("Identifiant d’activité invalide.");
  return id;
}

function collectionIdentifiers(activity, key, label) {
  const collection = activity[key];
  if (!Array.isArray(collection)) throw new Error(`${key} doit être un tableau.`);
  const identifiers = new Set();
  for (const item of collection) {
    requireObject(item, label);
    const id = requireIdentifier(item.id, label);
    if (identifiers.has(id)) throw new Error(`Identifiant dupliqué dans ${key} : ${id}.`);
    identifiers.add(id);
  }
  return identifiers;
}

function validateReferences(values, available, label) {
  if (!Array.isArray(values)) throw new Error(`${label} doit être un tableau.`);
  const references = new Set();
  for (const id of values) {
    if (typeof id !== "string" || !id) throw new Error(`${label} contient une référence invalide.`);
    if (references.has(id)) throw new Error(`${label} contient un identifiant dupliqué : ${id}.`);
    if (!available.has(id)) throw new Error(`${label} référence un identifiant inexistant : ${id}.`);
    references.add(id);
  }
  return references;
}

function validateActivityIntegrity(activity) {
  requireObject(activity, "L’activité");
  validateActivityVideoReference(activity);
  const durationMs = activity.video?.durationMs || Infinity;
  const identifiers = {
    speakers: collectionIdentifiers(activity, "speakers", "Chaque locuteur"),
    languages: collectionIdentifiers(activity, "languages", "Chaque langue"),
    segments: collectionIdentifiers(activity, "segments", "Chaque segment"),
    languageIntervals: collectionIdentifiers(activity, "languageIntervals", "Chaque intervalle linguistique"),
    layers: collectionIdentifiers(activity, "layers", "Chaque couche"),
    phenomena: collectionIdentifiers(activity, "phenomena", "Chaque phénomène"),
    teacherAnnotations: collectionIdentifiers(activity, "teacherAnnotations", "Chaque annotation"),
    overlays: collectionIdentifiers(activity, "overlays", "Chaque overlay")
  };

  const allIdentifiers = new Map();
  const registerIdentifier = (id, label) => {
    requireIdentifier(id, label);
    if (allIdentifiers.has(id)) throw new Error(`Identifiant dupliqué entre ${allIdentifiers.get(id)} et ${label} : ${id}.`);
    allIdentifiers.set(id, label);
  };
  for (const [key, values] of Object.entries(identifiers)) for (const id of values) registerIdentifier(id, key);

  const transcription = requireObject(activity.transcription, "La transcription");
  registerIdentifier(transcription.id, "transcription");
  if (transcription.languageId !== null && transcription.languageId !== undefined) {
    if (typeof transcription.languageId !== "string" || !identifiers.languages.has(transcription.languageId)) {
      throw new Error(`La transcription référence une langue inexistante : ${String(transcription.languageId)}.`);
    }
  }
  validateReferences(transcription.segmentIds, identifiers.segments, "transcription.segmentIds");

  for (const speaker of activity.speakers) {
    if (typeof speaker.label !== "string" || !speaker.label.trim() || speaker.label.length > 500) {
      throw new Error(`Le locuteur ${speaker.id} doit avoir un libellé non vide de 500 caractères maximum.`);
    }
  }

  for (const segment of activity.segments) {
    if (typeof segment.text !== "string") throw new Error(`Le segment ${segment.id} doit contenir un texte.`);
    integerTime(segment.startMs, `startMs du segment ${segment.id}`, durationMs);
    integerTime(segment.endMs, `endMs du segment ${segment.id}`, durationMs);
    if (segment.startMs >= segment.endMs) throw new Error(`Le segment ${segment.id} doit commencer avant sa fin.`);
    validateReferences(segment.languageIds, identifiers.languages, `Le segment ${segment.id} (langues)`);
    validateReferences(segment.speakerIds, identifiers.speakers, `Le segment ${segment.id} (locuteurs)`);
  }

  for (const interval of activity.languageIntervals) {
    if (typeof interval.languageId !== "string" || !identifiers.languages.has(interval.languageId)) throw new Error(`L’intervalle ${interval.id} référence une langue inexistante : ${String(interval.languageId)}.`);
    if (interval.segmentId && !identifiers.segments.has(interval.segmentId)) throw new Error(`L’intervalle ${interval.id} référence un segment inexistant : ${interval.segmentId}.`);
    integerTime(interval.startMs, `startMs de l’intervalle ${interval.id}`, durationMs);
    integerTime(interval.endMs, `endMs de l’intervalle ${interval.id}`, durationMs);
    if (interval.startMs >= interval.endMs) throw new Error(`L’intervalle ${interval.id} doit commencer avant sa fin.`);
  }

  const phenomenonIdsBySegment = new Map(activity.segments.map(segment => [segment.id, []]));
  for (const phenomenon of activity.phenomena) {
    if (typeof phenomenon.layerId !== "string" || !identifiers.layers.has(phenomenon.layerId)) throw new Error(`Le phénomène ${phenomenon.id} référence une couche inexistante : ${String(phenomenon.layerId)}.`);
    if (typeof phenomenon.segmentId !== "string" || !identifiers.segments.has(phenomenon.segmentId)) throw new Error(`Le phénomène ${phenomenon.id} référence un segment inexistant : ${String(phenomenon.segmentId)}.`);
    integerTime(phenomenon.startMs, `startMs du phénomène ${phenomenon.id}`, durationMs);
    integerTime(phenomenon.endMs, `endMs du phénomène ${phenomenon.id}`, durationMs);
    if (phenomenon.startMs >= phenomenon.endMs) throw new Error(`Le phénomène ${phenomenon.id} doit commencer avant sa fin.`);
    phenomenonIdsBySegment.get(phenomenon.segmentId).push(phenomenon.id);
  }

  for (const segment of activity.segments) {
    if (segment.phenomenonIds === undefined) continue;
    if (!Array.isArray(segment.phenomenonIds)) throw new Error(`Le segment ${segment.id} (phénomènes dérivés) doit être un tableau.`);
    const declared = [...segment.phenomenonIds].sort();
    const derived = [...phenomenonIdsBySegment.get(segment.id)].sort();
    if (JSON.stringify(declared) !== JSON.stringify(derived)) {
      throw new Error(`Références de phénomène incohérentes pour le segment ${segment.id} : phenomenonIds dérivés attendus=${derived.join(", ") || "aucun"}, reçus=${declared.join(", ") || "aucun"}. La source de vérité est phenomena[].segmentId.`);
    }
    validateReferences(segment.phenomenonIds, identifiers.phenomena, `Le segment ${segment.id} (phénomènes dérivés)`);
  }

  for (const annotation of activity.teacherAnnotations) {
    if (typeof annotation.segmentId !== "string" || !identifiers.segments.has(annotation.segmentId)) throw new Error(`L’annotation ${annotation.id} référence un segment inexistant : ${String(annotation.segmentId)}.`);
    for (const key of ["note", "pedagogicalQuestion"]) {
      if (typeof annotation[key] !== "string" || annotation[key].length > 5000) throw new Error(`Le champ ${key} de l’annotation ${annotation.id} doit être une chaîne de 5000 caractères maximum.`);
    }
    if (annotation.speakerId !== undefined && (typeof annotation.speakerId !== "string" || !identifiers.speakers.has(annotation.speakerId))) {
      throw new Error(`L’annotation ${annotation.id} référence un locuteur inexistant : ${String(annotation.speakerId)}.`);
    }
    if (annotation.speakerIds !== undefined) validateReferences(annotation.speakerIds, identifiers.speakers, `L’annotation ${annotation.id} (locuteurs)`);
    if (Object.prototype.hasOwnProperty.call(annotation, "overlay")) throw new Error(`L’annotation ${annotation.id} ne doit plus contenir d’overlay imbriqué.`);
  }

  for (const overlay of activity.overlays) {
    integerTime(overlay.startMs, `startMs de l’overlay ${overlay.id}`, durationMs);
    integerTime(overlay.endMs, `endMs de l’overlay ${overlay.id}`, durationMs);
    if (overlay.startMs >= overlay.endMs) throw new Error(`L’overlay ${overlay.id} doit commencer avant sa fin.`);
    for (const key of ["title", "text"]) if (typeof overlay[key] !== "string" || overlay[key].length > 5000) throw new Error(`Le champ ${key} de l’overlay ${overlay.id} doit être une chaîne de 5000 caractères maximum.`);
    validateReferences(overlay.layerIds, identifiers.layers, `L’overlay ${overlay.id} (couches)`);
    if (overlay.annotationId !== undefined && (typeof overlay.annotationId !== "string" || !identifiers.teacherAnnotations.has(overlay.annotationId))) throw new Error(`L’overlay ${overlay.id} référence une annotation inexistante : ${String(overlay.annotationId)}.`);
  }

  const layerConfiguration = requireObject(activity.layerConfiguration, "La configuration de couches");
  registerIdentifier(layerConfiguration.id, "layerConfiguration");
  for (const key of ["defaultVisibleLayerIds", "learnerVisibleLayerIds", "teacherVisibleLayerIds"]) {
    validateReferences(layerConfiguration[key], identifiers.layers, `layerConfiguration.${key}`);
  }
  if (typeof layerConfiguration.allowLearnerToggle !== "boolean") throw new Error("layerConfiguration.allowLearnerToggle doit être un booléen.");
  const learnerVisible = new Set(layerConfiguration.learnerVisibleLayerIds);
  const invalidDefaults = layerConfiguration.defaultVisibleLayerIds.filter(id => !learnerVisible.has(id));
  if (invalidDefaults.length) throw new Error(`Les couches visibles par défaut doivent être visibles par les étudiants : ${invalidDefaults.join(", ")}.`);
}

function validateSharedLanguageSelection(languages) {
  if (!Array.isArray(languages)) throw new Error("languages doit être un tableau.");
  for (const language of languages) {
    const reference = LANGUAGE_CATALOG_BY_ID.get(language?.id);
    if (!reference) throw new Error(`Langue absente du référentiel partagé : ${String(language?.id)}.`);
    if (language.label !== reference.label || language.code !== reference.id.toUpperCase()) throw new Error(`La langue ${reference.id} doit reprendre le code et le libellé du référentiel partagé.`);
  }
}

function validateAuthoringPatch(payload, current) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  const allowed = new Set(["title", "description", "instruction", "pedagogicalQuestion", "videoId", "videoRef", "segments", "speakers", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "overlays", "layerConfiguration"]);
  const unknown = Object.keys(payload).filter(key => !allowed.has(key));
  if (unknown.length) throw new Error(`Champ non autorisé : ${unknown.join(", ")}.`);
  validateMetadataPatch(Object.fromEntries(Object.entries(payload).filter(([key]) => ["title", "description", "instruction", "pedagogicalQuestion", "videoId"].includes(key))));
  const next = { ...current };
  for (const key of ["title", "description", "instruction", "pedagogicalQuestion", "segments", "speakers", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "overlays", "layerConfiguration"]) if (payload[key] !== undefined) next[key] = payload[key];
  if (payload.videoRef !== undefined) {
    const resolved = resolveActivityVideo({ ...next, videoRef: payload.videoRef });
    if (resolved.videoRef.playableId !== next.video?.id) throw new Error("videoRef doit correspondre à la vidéo de l’activité.");
    next.videoRef = resolved.videoRef;
  }
  next.transcription = { ...(current.transcription || {}), segmentIds: (next.segments || []).map(segment => segment.id) };
  if (payload.videoId !== undefined) {
    const video = VIDEO_CATALOG.find(entry => entry.id === payload.videoId && entry.authorized);
    next.video = activityVideoFromCatalog(video, current.video);
  }
  validateSharedLanguageSelection(next.languages);
  validateActivityIntegrity(next);
  return next;
}

function draftActivity(videoId, metadata = {}) {
  const video = VIDEO_CATALOG.find(entry => entry.id === videoId && entry.authorized);
  if (!video) throw new Error("La vidéo sélectionnée n’est pas autorisée.");
  const id = `proto05-draft-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  return { id, version: "0.1.0", status: "draft", title: metadata.title || "Nouvelle activité", description: metadata.description || "", instruction: metadata.instruction || "", pedagogicalQuestion: metadata.pedagogicalQuestion || "", video: activityVideoFromCatalog(video), transcription: { id: `transcription-${id}`, languageId: null, segmentIds: [] }, segments: [], speakers: [], languages: [], languageIntervals: [], layers: [], phenomena: [], teacherAnnotations: [], overlays: [], layerConfiguration: { id: `layer-config-${id}`, defaultVisibleLayerIds: [], learnerVisibleLayerIds: [], teacherVisibleLayerIds: [], allowLearnerToggle: true } };
}

function draftActivityFromVideoRef(videoRef, metadata = {}) {
  const playable = resolveLibraryPlayable(videoRef, VIDEO_LIBRARY);
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === videoRef.assetId);
  if (!asset) throw new Error("Asset vidÃ©o introuvable.");
  const id = `proto05-draft-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  return { id, version: "0.1.0", status: "draft", title: metadata.title || "Nouvelle activitÃ©", description: metadata.description || "", instruction: metadata.instruction || "", pedagogicalQuestion: metadata.pedagogicalQuestion || "", videoRef: { schemaVersion: "0.1", assetId: asset.id, playableId: playable.id }, video: activityVideoFromLibrary(asset, playable), transcription: { id: `transcription-${id}`, languageId: null, segmentIds: [] }, segments: [], speakers: [], languages: [], languageIntervals: [], layers: [], phenomena: [], teacherAnnotations: [], overlays: [], layerConfiguration: { id: `layer-config-${id}`, defaultVisibleLayerIds: [], learnerVisibleLayerIds: [], teacherVisibleLayerIds: [], allowLearnerToggle: true } };
}

function uniqueCopyActivityId(activities) {
  const existingIds = new Set(activities.map(activity => activity && activity.id).filter(Boolean));
  let id;
  do {
    id = `proto05-copy-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  } while (existingIds.has(id));
  return id;
}

function remapCollection(items, activityId, kind) {
  if (!Array.isArray(items)) throw new Error(`${kind} doit être un tableau.`);
  const identifiers = new Map();
  const copies = items.map((item, index) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id || identifiers.has(item.id)) {
      throw new Error(`Les identifiants ${kind} doivent être présents et uniques.`);
    }
    const id = `${kind}-${activityId}-${index + 1}`;
    identifiers.set(item.id, id);
    return { ...item, id };
  });
  return { copies, identifiers };
}

function remapReferences(values, identifiers, label) {
  if (!Array.isArray(values)) throw new Error(`${label} doit être un tableau.`);
  return values.map(value => {
    const remapped = identifiers.get(value);
    if (!remapped) throw new Error(`${label} référence un identifiant inconnu.`);
    return remapped;
  });
}

function duplicateActivity(source, activities) {
  if (!source || typeof source !== "object") throw new Error("Activité source invalide.");
  validateActivityIntegrity(source);
  const videoId = source.video && source.video.id;
  validateMetadataPatch({
    title: source.title,
    description: source.description,
    instruction: source.instruction || "",
    pedagogicalQuestion: source.pedagogicalQuestion || "",
    videoId
  });
  if (!source.transcription || typeof source.transcription !== "object") throw new Error("Transcription source invalide.");
  if (!source.layerConfiguration || typeof source.layerConfiguration !== "object") throw new Error("Configuration de couches source invalide.");

  const id = uniqueCopyActivityId(activities);
  const speakers = remapCollection(source.speakers, id, "speaker");
  validateSharedLanguageSelection(source.languages);
  const languages = {
    copies: source.languages.map(language => ({ ...language })),
    identifiers: new Map(source.languages.map(language => [language.id, language.id]))
  };
  const segments = remapCollection(source.segments, id, "segment");
  const intervals = remapCollection(source.languageIntervals, id, "language-interval");
  const layers = remapCollection(source.layers, id, "layer");
  const phenomena = remapCollection(source.phenomena, id, "phenomenon");
  const annotations = remapCollection(source.teacherAnnotations, id, "annotation");
  const overlays = remapCollection(source.overlays, id, "overlay");

  segments.copies = segments.copies.map(segment => ({
    ...segment,
    speakerIds: remapReferences(segment.speakerIds, speakers.identifiers, "speakerIds"),
    languageIds: remapReferences(segment.languageIds, languages.identifiers, "languageIds")
  }));
  intervals.copies = intervals.copies.map(interval => ({
    ...interval,
    languageId: remapReferences([interval.languageId], languages.identifiers, "languageId")[0],
    segmentId: remapReferences([interval.segmentId], segments.identifiers, "segmentId")[0]
  }));
  phenomena.copies = phenomena.copies.map(phenomenon => ({
    ...phenomenon,
    segmentId: remapReferences([phenomenon.segmentId], segments.identifiers, "segmentId")[0],
    layerId: remapReferences([phenomenon.layerId], layers.identifiers, "layerId")[0]
  }));
  const copiedPhenomenonIdsBySegment = new Map(segments.copies.map(segment => [segment.id, []]));
  for (const phenomenon of phenomena.copies) copiedPhenomenonIdsBySegment.get(phenomenon.segmentId).push(phenomenon.id);
  segments.copies = segments.copies.map(segment => ({
    ...segment,
    phenomenonIds: copiedPhenomenonIdsBySegment.get(segment.id)
  }));
  annotations.copies = annotations.copies.map(annotation => ({
    ...annotation,
    segmentId: remapReferences([annotation.segmentId], segments.identifiers, "segmentId")[0]
  }));
  overlays.copies = overlays.copies.map(overlay => ({
    ...overlay,
    layerIds: remapReferences(overlay.layerIds, layers.identifiers, "overlay.layerIds"),
    ...(overlay.annotationId ? { annotationId: remapReferences([overlay.annotationId], annotations.identifiers, "overlay.annotationId")[0] } : {})
  }));

  const transcriptionLanguageId = languages.identifiers.get(source.transcription.languageId);
  if (!transcriptionLanguageId && languages.copies.length) throw new Error("La transcription référence une langue inconnue.");
  const copy = {
    id,
    version: typeof source.version === "string" ? source.version : "0.1.0",
    status: "draft",
    title: `Copie de ${source.title || source.id}`.slice(0, 5000),
    description: source.description || "",
    instruction: source.instruction || "",
    pedagogicalQuestion: source.pedagogicalQuestion || "",
    video: { ...source.video },
    transcription: {
      ...source.transcription,
      id: `transcription-${id}`,
      languageId: transcriptionLanguageId || source.transcription.languageId,
      segmentIds: remapReferences(source.transcription.segmentIds, segments.identifiers, "transcription.segmentIds")
    },
    segments: segments.copies,
    speakers: speakers.copies,
    languages: languages.copies,
    languageIntervals: intervals.copies,
    layers: layers.copies,
    phenomena: phenomena.copies,
    teacherAnnotations: annotations.copies,
    overlays: overlays.copies,
    layerConfiguration: {
      ...source.layerConfiguration,
      id: `layer-config-${id}`,
      defaultVisibleLayerIds: remapReferences(source.layerConfiguration.defaultVisibleLayerIds, layers.identifiers, "defaultVisibleLayerIds"),
      learnerVisibleLayerIds: remapReferences(source.layerConfiguration.learnerVisibleLayerIds, layers.identifiers, "learnerVisibleLayerIds"),
      teacherVisibleLayerIds: remapReferences(source.layerConfiguration.teacherVisibleLayerIds, layers.identifiers, "teacherVisibleLayerIds")
    }
  };

  validateActivityIntegrity(copy);
  return copy;
}

async function persistActivities(store) {
  const operation = writeQueue.then(async () => {
    const file = safeDataFile();
    const backup = `${file}.bak`;
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fs.copyFile(file, backup);
    try {
      await fs.writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
      await fs.rename(temp, file);
    } finally {
      try { await fs.unlink(temp); } catch {}
    }
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

async function persistVideoCatalog(videos) {
  const operation = writeQueue.then(async () => {
    const file = safeVideoCatalogFile();
    const backup = `${file}.bak`;
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fs.copyFile(file, backup);
    try {
      await fs.writeFile(temp, `${JSON.stringify({ schemaVersion: "0.1", videos }, null, 2)}\n`, "utf8");
      await fs.rename(temp, file);
    } finally {
      try { await fs.unlink(temp); } catch {}
    }
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

async function persistVideoLibrary(library) {
  const operation = writeQueue.then(async () => {
    const file = safeVideoLibraryFile();
    const backup = `${file}.bak`;
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fs.copyFile(file, backup);
    try {
      await fs.writeFile(temp, `${JSON.stringify(library, null, 2)}\n`, "utf8");
      await fs.rename(temp, file);
    } finally {
      try { await fs.unlink(temp); } catch {}
    }
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

function libraryAssetFromInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim().slice(0, 500) : "Asset vidéo Proto05";
  const assetId = `media-proto05-asset-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const sourceId = `source-${assetId}`;
  const playableId = `playable-${assetId}`;
  const sourceInput = payload.source || payload;
  const source = normalizeLibrarySourceInput(sourceInput, {
    validateHls(value) {
      const checked = validateUgaLink(value);
      return {
        provider: "uga",
        sourceUrl: checked.sourceUrl,
        proxyUrl: checked.proxyUrl,
        url: checked.proxyUrl,
        manifestUrl: checked.proxyUrl,
        mimeType: sourceInput.mimeType || "application/vnd.apple.mpegurl",
        availability: "declared"
      };
    }
  });
  const storedSource = { ...source, id: sourceId, assetId, title, provenance: { kind: "manual-library-add" } };
  const playable = playableFromSource(storedSource, assetId, playableId);
  if (storedSource.kind === "direct-url") playable.status = "pending";
  const asset = {
    id: assetId,
    title,
    status: "active",
    sourceIds: [sourceId],
    playableIds: [playableId],
    defaultPlayableId: playableId,
    provenance: { kind: "manual-library-add" },
    rights: {}
  };
  return { asset, source: storedSource, playable };
}

function libraryAssetDetails(asset) {
  return {
    ...asset,
    sources: VIDEO_LIBRARY.sources.filter(source => source.assetId === asset.id),
    playables: VIDEO_LIBRARY.playables.filter(playable => playable.assetId === asset.id)
  };
}

function safeImportedFileName(value) {
  const raw = typeof value === "string" ? value : "";
  const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
  const name = path.basename(decoded).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").trim();
  if (!name || name === "." || name === ".." || name.length > 180) throw new Error("Le nom du fichier vidéo est invalide.");
  if (!/\.(mp4|m4v|webm|mov|ogv|ogg)$/i.test(name)) throw new Error("Le fichier doit avoir une extension vidéo prise en charge.");
  return name;
}

async function importLocalLibraryMedia(request, url) {
  const fileName = safeImportedFileName(request.headers["x-proto05-file-name"]);
  const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].toLowerCase();
  if (!(contentType.startsWith("video/") || /\.(mp4|m4v|webm|mov|ogv|ogg)$/i.test(fileName))) throw new Error("Le contenu doit Ãªtre une vidÃ©o locale.");
  const title = (url.searchParams.get("title") || fileName).trim().slice(0, 500);
  await fs.mkdir(VIDEO_LIBRARY_MEDIA_DIR, { recursive: true });
  const temporaryPath = path.join(VIDEO_LIBRARY_MEDIA_DIR, `.${process.pid}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}.upload.tmp`);
  const output = fsSync.createWriteStream(temporaryPath, { flags: "wx" });
  const hash = crypto.createHash("sha256");
  let sizeBytes = 0;
  try {
    for await (const chunk of request) {
      sizeBytes += chunk.length;
      if (sizeBytes > 1024 * 1024 * 1024) throw new Error("La vidÃ©o dÃ©passe la taille maximale autorisÃ©e (1 Go).");
      hash.update(chunk);
      if (!output.write(chunk)) await new Promise((resolve, reject) => { output.once("drain", resolve); output.once("error", reject); });
    }
    await new Promise((resolve, reject) => output.end(error => error ? reject(error) : resolve()));
  } catch (error) {
    output.destroy();
    try { await fs.unlink(temporaryPath); } catch {}
    throw error;
  }
  if (!sizeBytes) { try { await fs.unlink(temporaryPath); } catch {}; throw new Error("Le fichier vidÃ©o est vide."); }
  const sha256 = hash.digest("hex");
  const duplicateSource = VIDEO_LIBRARY.sources.find(source => source.kind === "local-file" && (source.sha256 === sha256 || source.checksum === sha256 || source.provenance?.sha256 === sha256));
  if (duplicateSource) {
    try { await fs.unlink(temporaryPath); } catch {}
    const duplicateAsset = VIDEO_LIBRARY.assets.find(asset => asset.id === duplicateSource.assetId);
    const duplicatePlayable = VIDEO_LIBRARY.playables.find(playable => playable.sourceId === duplicateSource.id);
    return { duplicate: true, asset: duplicateAsset ? libraryAssetDetails(duplicateAsset) : null, assetId: duplicateAsset?.id || null, playableId: duplicatePlayable?.id || null };
  }
  const assetId = `media-proto05-local-${sha256.slice(0, 24)}`;
  const sourceId = `source-${assetId}`;
  const playableId = `video-${assetId}`;
  const storageKey = `${sha256.slice(0, 16)}-${fileName}`;
  const targetPath = safeLibraryMediaPath(storageKey);
  const importedAt = new Date().toISOString();
  await fs.rename(temporaryPath, targetPath);
  const provenance = { kind: "managed-local-copy", source: "browser-file-selection", originalFileName: fileName, importedAt, sha256, sizeBytes };
  const source = { id: sourceId, assetId, title, kind: "local-file", provider: "local", storageKey, url: `/api/proto05/library/media/${encodeURIComponent(storageKey)}`, mimeType: contentType || "application/octet-stream", durationMs: null, sizeBytes, sha256, checksum: sha256, authorized: true, availability: "available", provenance };
  const playable = { id: playableId, assetId, sourceId, kind: "local-file", provider: "local", status: "available", availability: "available", durationMs: null, mimeType: source.mimeType, storageKey, url: source.url, manifestUrl: null, fileName, sizeBytes, sha256 };
  const asset = { id: assetId, title, status: "active", sourceIds: [sourceId], playableIds: [playableId], defaultPlayableId: playableId, provenance, metadata: { fileName, sizeBytes, sha256, mimeType: source.mimeType, durationMs: null }, rights: {} };
  const nextLibrary = JSON.parse(JSON.stringify(VIDEO_LIBRARY));
  nextLibrary.updatedAt = importedAt;
  nextLibrary.assets.push(asset); nextLibrary.sources.push(source); nextLibrary.playables.push(playable);
  try { validateLibraryShape(nextLibrary); await persistVideoLibrary(nextLibrary); VIDEO_LIBRARY = nextLibrary; }
  catch (error) { try { await fs.unlink(targetPath); } catch {}; throw error; }
  return { duplicate: false, asset: libraryAssetDetails(asset), assetId, playableId };
}

function isPrivateAddress(address) {
  const value = String(address || "").toLowerCase();
  if (value === "localhost" || value === "::1" || value === "0.0.0.0") return true;
  if (/^127\./.test(value) || /^10\./.test(value) || /^192\.168\./.test(value) || /^169\.254\./.test(value)) return true;
  const octets = value.split(".").map(Number);
  if (octets.length === 4 && octets.every(Number.isInteger)) return octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31;
  return value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}

async function validateRemoteCopyUrl(value, options = {}) {
  let current;
  try { current = new URL(String(value || "")); } catch { throw new Error("L’URL directe est invalide."); }
  if (!["http:", "https:"].includes(current.protocol)) throw new Error("L’URL directe doit utiliser HTTP ou HTTPS.");
  if (current.username || current.password || (!options.allowHls && /\.m3u8$/i.test(current.pathname))) throw new Error("L’URL doit désigner un média direct, pas un manifeste HLS.");
  const addresses = await dns.lookup(current.hostname, { all: true });
  if (!addresses.length || (process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE !== "1" && addresses.some(item => isPrivateAddress(item.address)))) throw new Error("L’URL ne doit pas viser une adresse privée ou interne.");
  return current;
}

function remoteCopyFileName(url, contentDisposition) {
  const match = /filename\*?=(?:UTF-8''|\"|')?([^\"';]+)/i.exec(contentDisposition || "");
  const candidate = match?.[1] || path.basename(url.pathname) || "video.mp4";
  const decoded = (() => { try { return decodeURIComponent(candidate); } catch { return candidate; } })();
  const name = path.basename(decoded).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").trim();
  if (!name || name === "." || name === ".." || name.length > 180) return "video.mp4";
  return /\.[A-Za-z0-9]{2,8}$/.test(name) ? name : `${name}.mp4`;
}

async function copyDirectLibraryMedia(request, url) {
  const payload = JSON.parse(await readRequestBody(request));
  const originalUrl = await validateRemoteCopyUrl(payload.url);
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim().slice(0, 500) : remoteCopyFileName(originalUrl);
  const existingByUrl = VIDEO_LIBRARY.sources.find(source => source.kind === "direct-url" && (source.url === originalUrl.toString() || source.originUrl === originalUrl.toString()));
  if (existingByUrl) {
    const asset = VIDEO_LIBRARY.assets.find(item => item.id === existingByUrl.assetId);
    const playable = VIDEO_LIBRARY.playables.find(item => item.sourceId === existingByUrl.id);
    if (asset && playable) return { duplicate: true, reason: "url", asset: libraryAssetDetails(asset), assetId: asset.id, playableId: playable.id };
  }
  await fs.mkdir(VIDEO_LIBRARY_MEDIA_DIR, { recursive: true });
  const temporaryPath = path.join(VIDEO_LIBRARY_MEDIA_DIR, `.${process.pid}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}.remote.tmp`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Le téléchargement a dépassé le délai maximal.")), REMOTE_COPY_TIMEOUT_MS);
  const abortDownload = () => controller.abort(new Error("Téléchargement annulé par le client."));
  request.once("aborted", abortDownload);
  let response;
  let output;
  try {
    response = await fetch(originalUrl, { redirect: "manual", signal: controller.signal });
    const redirects = [];
    for (let hop = 0; response.status >= 300 && response.status < 400; hop += 1) {
      if (hop >= 5) throw new Error("Trop de redirections.");
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirection sans destination.");
      const nextUrl = await validateRemoteCopyUrl(new URL(location, originalUrl));
      redirects.push(nextUrl.toString());
      response = await fetch(nextUrl, { redirect: "manual", signal: controller.signal });
    }
    if (!response.ok) throw new Error(`Réponse HTTP distante invalide : ${response.status}.`);
    const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
    if (!contentType.startsWith("video/") || contentType === "application/vnd.apple.mpegurl") throw new Error("La réponse distante n’est pas une vidéo directe.");
    const announcedSize = Number(response.headers.get("content-length"));
    if (Number.isSafeInteger(announcedSize) && announcedSize > REMOTE_COPY_MAX_BYTES) throw new Error("La vidéo distante dépasse la taille maximale autorisée.");
    if (!response.body) throw new Error("La réponse distante ne contient aucun flux.");
    output = fsSync.createWriteStream(temporaryPath, { flags: "wx" });
    const hash = crypto.createHash("sha256");
    let sizeBytes = 0;
    for await (const chunk of response.body) {
      sizeBytes += chunk.length;
      if (sizeBytes > REMOTE_COPY_MAX_BYTES) throw new Error("La vidéo distante dépasse la taille maximale autorisée.");
      hash.update(chunk);
      if (!output.write(chunk)) await new Promise((resolve, reject) => { output.once("drain", resolve); output.once("error", reject); });
    }
    await new Promise((resolve, reject) => output.end(error => error ? reject(error) : resolve()));
    if (!sizeBytes) throw new Error("La réponse distante est vide.");
    const sha256 = hash.digest("hex");
    const existingByHash = VIDEO_LIBRARY.playables.find(playable => playable.provider === "local" && playable.sha256 === sha256);
    if (existingByHash) {
      try { await fs.unlink(temporaryPath); } catch {}
      const asset = VIDEO_LIBRARY.assets.find(item => item.id === existingByHash.assetId);
      return { duplicate: true, reason: "hash", asset: asset ? libraryAssetDetails(asset) : null, assetId: asset?.id || null, playableId: existingByHash.id };
    }
    const storageKey = `${sha256.slice(0, 16)}-${remoteCopyFileName(originalUrl, response.headers.get("content-disposition"))}`;
    const targetPath = safeLibraryMediaPath(storageKey);
    await fs.rename(temporaryPath, targetPath);
    const importedAt = new Date().toISOString();
    const assetId = `media-proto05-remote-${sha256.slice(0, 24)}`;
    const sourceId = `source-${assetId}`;
    const playableId = `video-${assetId}`;
    const provenance = { kind: "managed-remote-copy", originalUrl: originalUrl.toString(), finalUrl: response.url || originalUrl.toString(), redirects, importedAt, sha256, sizeBytes, contentType };
    const source = { id: sourceId, assetId, title, kind: "direct-url", provider: "direct", url: originalUrl.toString(), originUrl: originalUrl.toString(), finalUrl: response.url || originalUrl.toString(), copiedStorageKey: storageKey, copiedUrl: `/api/proto05/library/media/${encodeURIComponent(storageKey)}`, mimeType: contentType, durationMs: null, authorized: true, availability: "available", provenance };
    const playable = { id: playableId, assetId, sourceId, kind: "local-file", provider: "local", status: "available", availability: "available", durationMs: null, mimeType: contentType, storageKey, url: source.copiedUrl, manifestUrl: null, originUrl: originalUrl.toString(), sha256, sizeBytes };
    const asset = { id: assetId, title, status: "active", sourceIds: [sourceId], playableIds: [playableId], defaultPlayableId: playableId, provenance, metadata: { originalUrl: originalUrl.toString(), finalUrl: response.url || originalUrl.toString(), redirects, sizeBytes, sha256, mimeType: contentType, durationMs: null }, rights: {} };
    const nextLibrary = JSON.parse(JSON.stringify(VIDEO_LIBRARY));
    nextLibrary.updatedAt = importedAt; nextLibrary.assets.push(asset); nextLibrary.sources.push(source); nextLibrary.playables.push(playable);
    try { validateLibraryShape(nextLibrary); await persistVideoLibrary(nextLibrary); VIDEO_LIBRARY = nextLibrary; }
    catch (error) { try { await fs.unlink(targetPath); } catch {}; throw error; }
    return { duplicate: false, asset: libraryAssetDetails(asset), assetId, playableId };
  } catch (error) {
    try { output?.destroy(); } catch {}
    try { await fs.unlink(temporaryPath); } catch {}
    if (controller.signal.aborted && request.aborted) return { cancelled: true };
    throw error;
  } finally {
    clearTimeout(timeout);
    request.removeListener("aborted", abortDownload);
  }
}

function findFfmpeg() {
  const configured = process.env.FFMPEG_PATH;
  if (configured) {
    if (!fsSync.existsSync(configured)) throw new Error("FFmpeg configuré mais inaccessible.");
    return configured;
  }
  return "ffmpeg";
}

function powerShellQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function ffmpegPowerShellCommand(executable, args, cwd, logPath) {
  const quotedArgs = args.map(powerShellQuote).join(", ");
  return `$ffmpegExe = ${powerShellQuote(executable)}\n$workDir = ${powerShellQuote(cwd)}\n$logPath = ${powerShellQuote(logPath)}\nSet-Location -LiteralPath $workDir\n$ffmpegArgs = @(${quotedArgs})\n& $ffmpegExe @ffmpegArgs 2>&1 | Tee-Object -FilePath $logPath\n$LASTEXITCODE`;
}

function publicFfmpegRuntime(job) {
  if (!job.ffmpegRuntime) return null;
  const runtime = job.ffmpegRuntime;
  return { executable: runtime.executable, cwd: runtime.cwd, args: runtime.args, commands: runtime.commands || [], commandPowerShell: runtime.commandPowerShell, logPath: runtime.logPath || null, startedAt: runtime.startedAt || null, endedAt: runtime.endedAt || null, pid: runtime.pid || null, exitCode: runtime.exitCode ?? null, lastMediaTimeMs: runtime.lastMediaTimeMs ?? null, outputSizeBytes: runtime.outputSizeBytes ?? null, inputPath: runtime.inputPath || null, outputPath: runtime.outputPath || null, stdout: runtime.stdout || "", stderr: runtime.stderr || "", error: runtime.error || null, env: runtime.env || {} };
}

function publicHlsPreparationJob(job) {
  return { id: job.id, assetId: job.assetId, playableId: job.playableId, sourceId: job.sourceId, status: job.status, progress: job.progress, createdAt: job.createdAt, updatedAt: job.updatedAt, expiresAt: job.expiresAt || null, error: job.error || null, metadata: job.metadata || null, masks: job.masks || null, temporalMasks: job.temporalMasks || null, temporalSteps: job.temporalSteps || null, log: job.log.slice(-20) };
}

function derivationStatusCode(status) {
  const value = String(status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (value === "completed" || value.includes("termin")) return "completed";
  if (value === "failed" || value.includes("echou")) return "failed";
  if (value === "cancelled" || value.includes("annul")) return "cancelled";
  if (value === "expired" || value.includes("expir")) return "expired";
  if (value.includes("validation")) return "validation";
  if (value.includes("annulation")) return "cancelling";
  if (value.includes("anonym") || value === "running") return "running";
  return value || "unknown";
}

function publicHlsDerivationJob(job) {
  return { id: job.id, preparationJobId: job.preparationJobId, assetId: job.assetId, playableId: job.playableId || null, mode: job.mode || "fixed", status: job.status, statusCode: derivationStatusCode(job.status), progress: job.progress, timeoutMs: HLS_DERIVATION_TIMEOUT_MS, blurProfile: job.blurProfile || job.metadata?.blur?.id || "standard", metadata: job.metadata || null, ffmpeg: publicFfmpegRuntime(job), createdAt: job.createdAt, updatedAt: job.updatedAt, expiresAt: job.expiresAt || null, error: job.error || null, log: job.log.slice(-20) };
}

function defaultAnonymizationMasks(value) {
  const masks = value === undefined ? [{ x: 0, y: 0, width: 0.2, height: 0.2 }] : value;
  const identifiers = new Set();
  if (!Array.isArray(masks) || !masks.length || masks.length > 20) throw new Error("Les masques d’anonymisation doivent être une liste non vide de 1 à 20 zones.");
  return masks.map((mask, index) => {
    if (!mask || typeof mask !== "object") throw new Error(`Le masque ${index + 1} est invalide.`);
    const values = ["x", "y", "width", "height"].map(key => Number(mask[key]));
    if (values.some(item => !Number.isFinite(item)) || values[0] < 0 || values[1] < 0 || values[2] <= 0 || values[3] <= 0 || values[0] + values[2] > 1 || values[1] + values[3] > 1) throw new Error(`Le masque ${index + 1} doit rester dans l’image avec des ratios compris entre 0 et 1.`);
    const id = typeof mask.id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(mask.id) ? mask.id : `mask-${index + 1}`;
    if (identifiers.has(id)) throw new Error(`Identifiant de masque dupliqué : ${id}.`);
    identifiers.add(id);
    return { id, x: values[0], y: values[1], width: values[2], height: values[3] };
  });
}

const ANONYMIZATION_BLUR_PROFILES = Object.freeze({
  light: Object.freeze({ id: "light", label: "Léger", filter: "boxblur", lumaRadius: 2, lumaPower: 1 }),
  standard: Object.freeze({ id: "standard", label: "Standard", filter: "boxblur", lumaRadius: 4, lumaPower: 1 }),
  strong: Object.freeze({ id: "strong", label: "Fort", filter: "boxblur", lumaRadius: 6, lumaPower: 1 })
});

function anonymizationBlurProfile(value) {
  const key = typeof value === "string" ? value : "standard";
  const profile = ANONYMIZATION_BLUR_PROFILES[key];
  if (!profile) throw new Error("La puissance du flou doit être légère, standard ou forte.");
  return profile;
}

function ffmpegBlurFilter(masks, blurProfile = anonymizationBlurProfile()) {
  const labels = masks.map((_, index) => `[source${index}]`).join("");
  const graph = [`[0:v]split=${masks.length + 1}[base]${labels}`];
  masks.forEach((mask, index) => {
    const x = `trunc(iw*${mask.x}/2)*2`;
    const y = `trunc(ih*${mask.y}/2)*2`;
    const width = `trunc(iw*${mask.width}/2)*2`;
    const height = `trunc(ih*${mask.height}/2)*2`;
    graph.push(`[source${index}]crop=x='${x}':y='${y}':w='${width}':h='${height}',boxblur=luma_radius=${blurProfile.lumaRadius}:luma_power=${blurProfile.lumaPower}[blurred${index}]`);
  });
  let current = "base";
  masks.forEach((mask, index) => {
    const output = index === masks.length - 1 ? "outv" : `composite${index}`;
    const x = `trunc(main_w*${mask.x}/2)*2`;
    const y = `trunc(main_h*${mask.y}/2)*2`;
    graph.push(`[${current}][blurred${index}]overlay=x='${x}':y='${y}':eof_action=pass[${output}]`);
    current = output;
  });
  return graph.join(";");
}

function temporalMaskConfiguration(value) {
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error("Les masques temporels doivent être une liste non vide de 1 à 20 zones.");
  const ids = new Set();
  return value.map((mask, index) => {
    if (!mask || typeof mask !== "object") throw new Error(`Le masque temporel ${index + 1} est invalide.`);
    const id = typeof mask.id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(mask.id) ? mask.id : `mask-${index + 1}`;
    if (ids.has(id)) throw new Error(`Identifiant de masque dupliqué : ${id}.`); ids.add(id);
    const startMs = Number(mask.startMs), endMs = Number(mask.endMs);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs) throw new Error(`La plage temporelle du masque ${id} est invalide.`);
    if (!Array.isArray(mask.keyframes) || !mask.keyframes.length || mask.keyframes.length > 100) throw new Error(`Le masque ${id} doit posséder au moins une image-clé.`);
    let previous = -1;
    const keyframes = mask.keyframes.map((keyframe, keyIndex) => {
      const time = Number(keyframe.time), values = ["x", "y", "width", "height"].map(key => Number(keyframe[key]));
      if (!Number.isFinite(time) || time < startMs || time > endMs || time < previous) throw new Error(`L’image-clé ${keyIndex + 1} du masque ${id} est invalide.`);
      if (time < previous) throw new Error(`L’image-clé ${keyIndex + 1} du masque ${id} est invalide.`);
      previous = time;
      if (values.some(item => !Number.isFinite(item)) || values[0] < 0 || values[1] < 0 || values[2] <= 0 || values[3] <= 0 || values[0] + values[2] > 1 || values[1] + values[3] > 1) throw new Error(`L’image-clé ${keyIndex + 1} du masque ${id} sort de l’image.`);
      return { time, x: values[0], y: values[1], width: values[2], height: values[3] };
    });
    return { id, startMs, endMs, keyframes };
  });
}

function temporalStepConfiguration(value, durationMs = null) {
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error("Les étapes temporelles doivent être une liste non vide de 1 à 20 étapes.");
  const ids = new Set();
  let previousStart = -1;
  const steps = value.map((step, index) => {
    if (!step || typeof step !== "object") throw new Error(`L’étape temporelle ${index + 1} est invalide.`);
    const id = typeof step.id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(step.id) ? step.id : `step-${index + 1}`;
    if (ids.has(id)) throw new Error(`Identifiant d’étape dupliqué : ${id}.`);
    ids.add(id);
    const startMs = Number(step.startMs);
    if (!Number.isFinite(startMs) || startMs < 0 || startMs < previousStart) throw new Error(`Le début de l’étape ${id} est invalide.`);
    previousStart = startMs;
    const requestedEnd = step.endMs === null || step.endMs === undefined || step.endMs === "" ? null : Number(step.endMs);
    const endMs = requestedEnd === null ? (index === value.length - 1 && Number.isFinite(durationMs) ? durationMs : null) : requestedEnd;
    if (endMs !== null && (!Number.isFinite(endMs) || endMs <= startMs)) throw new Error(`La fin de l’étape ${id} est invalide.`);
    const masks = defaultAnonymizationMasks(step.masks);
    return { id, startMs, endMs, masks };
  });
  for (let index = 0; index < steps.length - 1; index += 1) {
    const current = steps[index], next = steps[index + 1];
    if (current.endMs === null) current.endMs = next.startMs;
    if (current.endMs !== next.startMs || current.endMs <= current.startMs) throw new Error(`Les plages des étapes ${current.id} et ${next.id} sont incohérentes.`);
  }
  const last = steps.at(-1);
  if (last.endMs === null) last.endMs = last.startMs + 1;
  if (last.endMs <= last.startMs) throw new Error(`La plage de l’étape ${last.id} est vide.`);
  return steps;
}

function temporalStepsToMasks(steps) {
  const byMask = new Map();
  for (const step of steps) {
    for (const mask of step.masks) {
      const entry = byMask.get(mask.id) || { id: mask.id, startMs: step.startMs, endMs: step.endMs, keyframes: [] };
      entry.startMs = Math.min(entry.startMs, step.startMs);
      entry.endMs = Math.max(entry.endMs, step.endMs);
      if (!entry.keyframes.some(keyframe => keyframe.time === step.startMs)) entry.keyframes.push({ time: step.startMs, x: mask.x, y: mask.y, width: mask.width, height: mask.height });
      byMask.set(mask.id, entry);
    }
  }
  return [...byMask.values()].map(mask => ({ ...mask, keyframes: mask.keyframes.sort((left, right) => left.time - right.time) }));
}

function temporalInterpolationExpression(keyframes, key) {
  const values = keyframes.map(frame => ({ time: frame.time / 1000, value: frame[key] }));
  let expression = String(values.at(-1).value);
  for (let index = values.length - 2; index >= 0; index -= 1) {
    const current = values[index], next = values[index + 1];
    const slope = (next.value - current.value) / (next.time - current.time || 1);
    const between = `${current.value}+(${slope})*(t-${current.time})`;
    expression = `if(lt(t,${next.time}),${between},${expression})`;
  }
  return `if(lt(t,${values[0].time}),${values[0].value},${expression})`;
}

function ffmpegTemporalBlurFilter(masks, blurProfile = anonymizationBlurProfile()) {
  const timeExpression = value => value.replace(/\bt\b/g, "T");
  const regionConditions = masks.map(mask => {
    const x = timeExpression(temporalInterpolationExpression(mask.keyframes, "x"));
    const y = timeExpression(temporalInterpolationExpression(mask.keyframes, "y"));
    const width = timeExpression(temporalInterpolationExpression(mask.keyframes, "width"));
    const height = timeExpression(temporalInterpolationExpression(mask.keyframes, "height"));
    return [`gte(X,W*(${x}))`, `lt(X,W*(${x}+${width}))`, `gte(Y,H*(${y}))`, `lt(Y,H*(${y}+${height}))`, `gte(T,${mask.startMs / 1000})`, `lte(T,${mask.endMs / 1000})`].join("*");
  });
  const region = regionConditions.length === 1 ? regionConditions[0] : `(${regionConditions.join(")+(")})`;
  return `[0:v]split=2[temporalBase][temporalBlur];[temporalBlur]boxblur=luma_radius=${blurProfile.lumaRadius}:luma_power=${blurProfile.lumaPower}[temporalBlurred];[temporalBase][temporalBlurred]blend=all_expr='if(${region},B,A)'[outv]`;
}

function ffmpegTemporalLocalFilter(masks, blurProfile = anonymizationBlurProfile(), videoInfo = null) {
  const margin = Math.max(4, Math.ceil(blurProfile.lumaRadius * 2));
  const labels = masks.map((_, index) => `[source${index}]`).join("");
  const graph = [`[0:v]split=${masks.length + 1}[base]${labels}`];
  const cropOrigin = (value, axis) => videoInfo ? Math.max(0, Math.floor(((axis === "iw" ? videoInfo.width : videoInfo.height) * value - margin) / 2) * 2) : `max(0,trunc((${axis}*${value}-${margin})/2)*2)`;
  masks.forEach((mask, index) => {
    const x = cropOrigin(mask.x, "iw"), y = cropOrigin(mask.y, "ih");
    const exactX = videoInfo ? Math.floor(videoInfo.width * mask.x / 2) * 2 : `trunc(iw*${mask.x}/2)*2`;
    const exactY = videoInfo ? Math.floor(videoInfo.height * mask.y / 2) * 2 : `trunc(ih*${mask.y}/2)*2`;
    const exactWidth = videoInfo ? Math.floor(videoInfo.width * mask.width / 2) * 2 : `trunc(iw*${mask.width}/2)*2`;
    const exactHeight = videoInfo ? Math.floor(videoInfo.height * mask.height / 2) * 2 : `trunc(ih*${mask.height}/2)*2`;
    const expandedWidth = videoInfo ? Math.min(videoInfo.width - x, Math.ceil((videoInfo.width * mask.width + margin * 2) / 2) * 2) : `min(iw-${x},trunc((iw*${mask.width}+${margin * 2})/2)*2)`;
    const expandedHeight = videoInfo ? Math.min(videoInfo.height - y, Math.ceil((videoInfo.height * mask.height + margin * 2) / 2) * 2) : `min(ih-${y},trunc((ih*${mask.height}+${margin * 2})/2)*2)`;
    const relativeX = videoInfo ? exactX - x : `(${exactX})-(${x})`;
    const relativeY = videoInfo ? exactY - y : `(${exactY})-(${y})`;
    graph.push(`[source${index}]crop=x='${x}':y='${y}':w='${expandedWidth}':h='${expandedHeight}',boxblur=luma_radius=${blurProfile.lumaRadius}:luma_power=${blurProfile.lumaPower}[expanded${index}];[expanded${index}]crop=x='${relativeX}':y='${relativeY}':w='${exactWidth}':h='${exactHeight}'[blurred${index}]`);
  });
  let current = "base";
  masks.forEach((mask, index) => {
    const x = videoInfo ? Math.floor(videoInfo.width * mask.x / 2) * 2 : cropOrigin(mask.x, "main_w");
    const y = videoInfo ? Math.floor(videoInfo.height * mask.y / 2) * 2 : cropOrigin(mask.y, "main_h");
    const output = index === masks.length - 1 ? "outv" : `localComposite${index}`;
    graph.push(`[${current}][blurred${index}]overlay=x='${x}':y='${y}':eof_action=pass[${output}]`);
    current = output;
  });
  return graph.join(";");
}

function ffprobeVideoInfo(ffmpeg, filePath) {
  const executable = path.basename(ffmpeg).toLowerCase().startsWith("ffmpeg")
    ? path.join(path.dirname(ffmpeg), path.basename(ffmpeg).replace(/^ffmpeg/i, "ffprobe"))
    : "ffprobe";
  const result = spawnSync(executable, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,start_time,nb_frames", "-of", "json", filePath], { encoding: "utf8", windowsHide: true, timeout: 10000 });
  if (result.error || result.status !== 0) throw new Error("Impossible de lire les paramètres vidéo préparés.");
  const stream = JSON.parse(String(result.stdout || "{}")).streams?.[0];
  const match = String(stream?.r_frame_rate || "").match(/^(\d+)\/(\d+)$/);
  const fps = match ? Number(match[1]) / Number(match[2]) : 0;
  if (!stream || !Number.isFinite(fps) || fps <= 0) throw new Error("La cadence vidéo préparée est invalide.");
  const nbFrames = Number(stream.nb_frames);
  return { width: Number(stream.width), height: Number(stream.height), fps, nbFrames: Number.isFinite(nbFrames) && nbFrames > 0 ? Math.floor(nbFrames) : null, startTime: Number.isFinite(Number(stream.start_time)) ? Number(stream.start_time) : 0 };
}

function concatFilePath(filePath) {
  return String(filePath).replace(/\\/g, "/").replace(/'/g, "'\\''");
}

async function runTemporalLocalPipeline(job, prepJob, context) {
  const { ffmpeg, blur, runtime, logStream } = context;
  const info = ffprobeVideoInfo(ffmpeg, prepJob.outputPath);
  const segmentsDirectory = path.join(job.workspace, "segments");
  await fs.mkdir(segmentsDirectory, { recursive: true });
  const commands = runtime.commands || (runtime.commands = []);
  const runStage = async (stage, args, outputPath, progress) => {
    const command = { stage, executable: ffmpeg, cwd: runtime.cwd, args, startedAt: new Date().toISOString(), endedAt: null, pid: null, exitCode: null, outputPath };
    commands.push(command);
    const child = spawn(ffmpeg, args, { cwd: runtime.cwd, windowsHide: true });
    job.process = child; command.pid = child.pid || null; runtime.pid = command.pid; runtime.args = args; runtime.commandPowerShell = ffmpegPowerShellCommand(ffmpeg, args, runtime.cwd, runtime.logPath);
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { const text = String(chunk); runtime.stdout += text; logStream.write(`[${stage} stdout] ${text}`); });
    child.stderr.on("data", chunk => { const text = String(chunk); runtime.stderr += text; logStream.write(`[${stage} stderr] ${text}`); job.log.push(text.trim().slice(-500)); job.progress = Math.max(job.progress, progress); job.updatedAt = new Date().toISOString(); });
    await new Promise((resolve, reject) => { child.once("error", error => { runtime.error = error.message; command.endedAt = new Date().toISOString(); reject(error); }); child.once("close", code => { command.exitCode = code; command.endedAt = new Date().toISOString(); runtime.exitCode = code; runtime.endedAt = command.endedAt; code === 0 ? resolve() : reject(job.cancelRequested ? new Error("Dérivation annulée.") : new Error(`FFmpeg a échoué (étape ${stage}, code ${code}).`)); }); });
    job.process = null; runtime.pid = null;
  };
  const list = [];
  const steps = job.temporalSteps || [];
  if (!steps.length) throw new Error("Aucune étape temporelle à dériver.");
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const endMs = Number(step.endMs);
    const startMs = Number(step.startMs);
    const startFrame = Math.max(0, Math.ceil(startMs / 1000 * info.fps - 1e-9));
    const requestedEndFrame = Math.max(startFrame + 1, Math.ceil(endMs / 1000 * info.fps - 1e-9));
    const endFrame = info.nbFrames ? Math.min(requestedEndFrame, info.nbFrames) : requestedEndFrame;
    const frames = endFrame - startFrame;
    const seekSeconds = startFrame === 0 ? 0 : info.startTime + ((startFrame - 1) / info.fps) + 0.001;
    const segmentPath = path.join(segmentsDirectory, `segment-${String(index + 1).padStart(3, "0")}.mp4`);
    const filter = ffmpegTemporalLocalFilter(step.masks, blur, info);
    const args = ["-hide_banner", "-y", "-i", prepJob.outputPath, "-ss", String(seekSeconds), "-frames:v", String(frames), "-filter_complex", filter, "-map", "[outv]", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-fps_mode", "passthrough", "-video_track_timescale", "90000", segmentPath];
    await runStage(`segment-${index + 1}`, args, segmentPath, 35 + Math.round((index / steps.length) * 35));
    list.push(`file '${concatFilePath(segmentPath)}'`);
  }
  const listPath = path.join(job.workspace, "segments.txt");
  await fs.writeFile(listPath, `${list.join("\n")}\n`, "utf8");
  const videoPath = path.join(job.workspace, "video-concat.mp4");
  await runStage("concat", ["-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:v", "copy", "-an", videoPath], videoPath, 72);
  const audioCodec = ffprobeAudioCodec(ffmpeg, prepJob.outputPath) === "aac" ? "copy" : "aac";
  const args = ["-hide_banner", "-y", "-i", videoPath, "-i", prepJob.outputPath, "-map", "0:v:0", "-map", "1:a?", "-c:v", "copy", "-c:a", audioCodec, "-movflags", "+faststart", job.outputPath];
  await runStage("remux", args, job.outputPath, 78);
  runtime.audioCodec = audioCodec; runtime.outputPath = job.outputPath; runtime.outputSizeBytes = (await fs.stat(job.outputPath)).size;
}

function ffmpegVersion(ffmpeg) {
  const result = require("node:child_process").spawnSync(ffmpeg, ["-version"], { encoding: "utf8", windowsHide: true, timeout: 10000 });
  if (result.error || result.status !== 0) throw new Error("FFmpeg est absent ou inaccessible.");
  return String(result.stdout || "").split(/\r?\n/, 1)[0] || "ffmpeg";
}

function ffprobeAudioCodec(ffmpeg, filePath) {
  const executable = path.basename(ffmpeg).toLowerCase().startsWith("ffmpeg")
    ? path.join(path.dirname(ffmpeg), path.basename(ffmpeg).replace(/^ffmpeg/i, "ffprobe"))
    : "ffprobe";
  const result = spawnSync(executable, ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "default=nw=1:nk=1", filePath], { encoding: "utf8", windowsHide: true, timeout: 10000 });
  return result.error || result.status !== 0 ? null : String(result.stdout || "").trim().toLowerCase() || null;
}

async function validateMediaFileWithFfmpeg(ffmpeg, filePath) {
  await new Promise((resolve, reject) => {
    const probe = spawn(ffmpeg, ["-hide_banner", "-v", "error", "-i", filePath, "-f", "null", "-"], { windowsHide: true });
    let stderr = "";
    probe.stderr.setEncoding("utf8");
    probe.stderr.on("data", chunk => { stderr += chunk; });
    probe.on("error", error => reject(error));
    probe.on("close", code => code === 0 ? resolve() : reject(new Error(`Le fichier dérivé est invalide : ${stderr.trim().slice(-500) || `FFmpeg code ${code}`}`)));
  });
}

async function removeDerivationWorkspace(job) {
  if (job.workspace) { try { await fs.rm(job.workspace, { recursive: true, force: true }); } catch {} }
  job.workspace = null; job.outputPath = null;
}

async function persistDerivedPlayable(job, prepJob) {
  const stat = await fs.stat(job.outputPath);
  if (!stat.isFile() || stat.size === 0 || stat.size > HLS_PREPARATION_MAX_BYTES) throw new Error("Le fichier dérivé est vide ou dépasse la taille maximale autorisée.");
  const hash = crypto.createHash("sha256").update(await fs.readFile(job.outputPath)).digest("hex");
  const existing = VIDEO_LIBRARY.playables.find(playable => playable.sha256 === hash && playable.provenance?.derivation);
  if (existing) {
    const existingAsset = VIDEO_LIBRARY.assets.find(asset => asset.id === existing.assetId);
    return { duplicate: true, assetId: existing.assetId, playableId: existing.id, asset: existingAsset ? libraryAssetDetails(existingAsset) : null, sha256: hash, storageKey: existing.storageKey || null, mediaUrl: existing.url || null };
  }
  const storageKey = `${hash.slice(0, 16)}-anonymized.mp4`;
  const targetPath = safeLibraryMediaPath(storageKey);
  const temporaryTarget = path.join(VIDEO_LIBRARY_MEDIA_DIR, `.${process.pid}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}.derived.tmp`);
  await fs.mkdir(VIDEO_LIBRARY_MEDIA_DIR, { recursive: true });
  await fs.copyFile(job.outputPath, temporaryTarget);
  await fs.rename(temporaryTarget, targetPath);
  const assetId = `media-proto05-anonymized-${hash.slice(0, 24)}`;
  const sourceId = `source-${assetId}`;
  const playableId = `video-${assetId}`;
  const sourceOrigin = prepJob.metadata?.sourceUrl || prepJob.sourceUrl;
  const provenance = { kind: "derived-anonymized", sourceOriginUrl: sourceOrigin, sourceAssetId: prepJob.assetId, sourcePreparationJobId: prepJob.id, mode: job.mode || "fixed", method: job.method, masks: job.masks, temporalMasks: job.temporalMasks || null, temporalSteps: job.temporalSteps || null, interpolation: job.temporalMasks ? "linear-between-keyframes-clamped-at-bounds" : null, blur: job.metadata.blur, filter: job.metadata.filter, ffmpeg: job.metadata.ffmpeg, ffmpegArgs: job.metadata.ffmpegArgs, createdAt: new Date().toISOString(), status: "completed", sha256: hash, sizeBytes: stat.size };
  const source = { id: sourceId, assetId, title: "Version anonymisée dérivée", kind: "local-file", provider: "proto05-derived", storageKey, url: `/api/proto05/library/media/${encodeURIComponent(storageKey)}`, copiedUrl: `/api/proto05/library/media/${encodeURIComponent(storageKey)}`, mimeType: "video/mp4", sizeBytes: stat.size, sha256: hash, checksum: hash, authorized: true, availability: "available", provenance };
  const playable = { id: playableId, assetId, sourceId, kind: "local-file", provider: "proto05-derived", status: "available", availability: "available", mimeType: "video/mp4", storageKey, url: source.url, manifestUrl: null, sha256: hash, sizeBytes: stat.size, provenance: { derivation: provenance } };
  const asset = { id: assetId, title: "Version anonymisée dérivée", status: "active", sourceIds: [sourceId], playableIds: [playableId], defaultPlayableId: playableId, provenance, metadata: { fileName: storageKey, mimeType: "video/mp4", sizeBytes: stat.size, sha256: hash }, rights: {} };
  const nextLibrary = JSON.parse(JSON.stringify(VIDEO_LIBRARY)); nextLibrary.updatedAt = new Date().toISOString(); nextLibrary.assets.push(asset); nextLibrary.sources.push(source); nextLibrary.playables.push(playable);
  try { validateLibraryShape(nextLibrary); await persistVideoLibrary(nextLibrary); VIDEO_LIBRARY = nextLibrary; }
  catch (error) { try { await fs.unlink(targetPath); } catch {}; throw error; }
  return { duplicate: false, assetId, playableId, asset: libraryAssetDetails(asset), sha256: hash, storageKey, mediaUrl: source.url };
}

async function runHlsDerivation(job, prepJob) {
  job.status = "anonymisation"; job.progress = 35; job.updatedAt = new Date().toISOString();
  let child; let sizeMonitor; const timeout = setTimeout(() => { job.timeout = true; try { job.process?.kill(); child?.kill(); } catch {} }, HLS_DERIVATION_TIMEOUT_MS);
  try {
    await fs.mkdir(HLS_DERIVATION_ROOT, { recursive: true }); job.workspace = await fs.mkdtemp(path.join(HLS_DERIVATION_ROOT, `${job.id}-`)); job.outputPath = path.join(job.workspace, "derived.mp4");
    const ffmpeg = findFfmpeg(); const version = ffmpegVersion(ffmpeg); const blur = anonymizationBlurProfile(job.blurProfile); const filter = job.mode === "temporal" ? ffmpegTemporalBlurFilter(job.temporalMasks, blur) : ffmpegBlurFilter(job.masks, blur); const audioCodec = ffprobeAudioCodec(ffmpeg, prepJob.outputPath) === "aac" ? "copy" : "aac"; const args = ["-hide_banner", "-y", "-i", prepJob.outputPath, "-filter_complex", filter, "-map", "[outv]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", audioCodec, "-movflags", "+faststart", job.outputPath]; job.metadata = { ffmpeg: version, method: job.method, mode: job.mode || "fixed", masks: job.masks, temporalMasks: job.temporalMasks || null, blur, filter, ffmpegArgs: args, audioCodec, inputFileName: "work.mp4" };
    const ffmpegLogPath = path.join(HLS_DERIVATION_ROOT, `${job.id}.ffmpeg.log`);
    const runtime = { executable: ffmpeg, cwd: process.cwd(), args, commandPowerShell: ffmpegPowerShellCommand(ffmpeg, args, process.cwd(), ffmpegLogPath), commands: [], logPath: ffmpegLogPath, startedAt: new Date().toISOString(), endedAt: null, pid: null, exitCode: null, lastMediaTimeMs: null, outputSizeBytes: 0, inputPath: prepJob.outputPath, outputPath: job.outputPath, stdout: "", stderr: "", error: null, env: { FFMPEG_PATH: process.env.FFMPEG_PATH || null, PROTO05_HLS_DERIVATION_TIMEOUT_MS: process.env.PROTO05_HLS_DERIVATION_TIMEOUT_MS || null } };
    job.ffmpegRuntime = runtime;
    const ffmpegLogStream = fsSync.createWriteStream(ffmpegLogPath, { flags: "w", encoding: "utf8" });
    if (job.mode === "temporal" && Array.isArray(job.temporalSteps) && job.temporalSteps.length) {
      job.metadata = { ffmpeg: version, method: job.method, mode: "temporal", strategy: "local-regions-by-step", temporalSteps: job.temporalSteps, blur, audioCodec: null, inputFileName: "work.mp4" };
      await runTemporalLocalPipeline(job, prepJob, { ffmpeg, blur, runtime, logStream: ffmpegLogStream });
      ffmpegLogStream.end();
      job.status = "validation"; job.progress = 80; await validateMediaFileWithFfmpeg(ffmpeg, job.outputPath); const result = await persistDerivedPlayable(job, prepJob); await removeDerivationWorkspace(job); job.result = result; job.assetId = result.assetId; job.playableId = result.playableId; job.status = "terminé"; job.progress = 100; job.expiresAt = new Date(Date.now() + HLS_DERIVATION_TTL_MS).toISOString(); job.metadata = { ...job.metadata, ...result, mimeType: "video/mp4" };
      return;
    }
    const detectedDuration = String(prepJob.metadata?.detectedTime || "").match(/^(\d+):(\d{2}):(\d{2})(?:[.,](\d+))?$/);
    const detectedDurationMs = detectedDuration ? ((Number(detectedDuration[1]) * 3600 + Number(detectedDuration[2]) * 60 + Number(detectedDuration[3])) * 1000 + Number(`0.${detectedDuration[4] || "0"}`) * 1000) : null;
    const expectedDurationMs = Number(job.temporalSteps?.at(-1)?.endMs) || Number(prepJob.metadata?.durationMs) || detectedDurationMs;
    const ffmpegTimeMs = value => { const match = String(value).match(/time=(\d+):(\d{2}):(\d{2})(?:[.,](\d+))?/g)?.at(-1)?.match(/time=(\d+):(\d{2}):(\d{2})(?:[.,](\d+))?/); return match ? ((Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000 + Number(`0.${match[4] || "0"}`) * 1000) : null; };
    child = spawn(ffmpeg, args, { cwd: runtime.cwd, windowsHide: true }); job.process = child; runtime.pid = child.pid || null; child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8"); child.stdout.on("data", chunk => { const text = String(chunk); runtime.stdout += text; ffmpegLogStream.write(`[stdout] ${text}`); }); child.stderr.on("data", chunk => { const text = String(chunk); runtime.stderr += text; ffmpegLogStream.write(`[stderr] ${text}`); const currentMs = ffmpegTimeMs(text); if (currentMs !== null) runtime.lastMediaTimeMs = currentMs; job.log.push(text.trim().slice(-500)); job.progress = expectedDurationMs && currentMs !== null ? Math.max(job.progress, Math.min(78, 35 + Math.round((currentMs / expectedDurationMs) * 43))) : Math.max(job.progress, 60); job.updatedAt = new Date().toISOString(); }); child.on("error", error => { job.spawnError = error; runtime.error = error.message; }); child.on("close", () => ffmpegLogStream.end());
    sizeMonitor = setInterval(async () => { if (!job.outputPath || !child || child.exitCode !== null) return; try { const current = await fs.stat(job.outputPath); runtime.outputSizeBytes = current.size; if (current.size > HLS_PREPARATION_MAX_BYTES) { job.sizeLimit = true; child.kill(); } } catch {} }, 250);
    await new Promise((resolve, reject) => child.once("close", code => { runtime.exitCode = code; runtime.endedAt = new Date().toISOString(); if (code === 0) return resolve(); reject(job.timeout ? new Error("La dérivation a dépassé le délai maximal.") : job.sizeLimit ? new Error("La dérivation dépasse la taille maximale autorisée.") : job.cancelRequested ? new Error("Dérivation annulée.") : job.spawnError || new Error(`FFmpeg a échoué (code ${code}).`)); }));
    job.status = "validation"; job.progress = 80; await validateMediaFileWithFfmpeg(ffmpeg, job.outputPath); const result = await persistDerivedPlayable(job, prepJob); await removeDerivationWorkspace(job); job.result = result; job.assetId = result.assetId; job.playableId = result.playableId; job.status = "terminé"; job.progress = 100; job.expiresAt = new Date(Date.now() + HLS_DERIVATION_TTL_MS).toISOString(); job.metadata = { ...job.metadata, ...result, mimeType: "video/mp4" };
  } catch (error) {
    job.error = job.cancelRequested ? "Dérivation annulée." : error.message; await removeDerivationWorkspace(job); job.status = job.cancelRequested ? "annulé" : "échoué"; job.progress = 0; job.updatedAt = new Date().toISOString();
    // Une préparation valide reste réutilisable pour tester un autre profil.
    // Son nettoyage est assuré par l’expiration normale du job de préparation.
  } finally { clearTimeout(timeout); if (sizeMonitor) clearInterval(sizeMonitor); delete job.process; delete job.pid; delete job.timeout; delete job.sizeLimit; if (job.status === "terminé") job.updatedAt = new Date().toISOString(); }
}

async function cancelHlsDerivation(job) { if (!job || !["anonymisation", "validation"].includes(job.status)) return job; job.cancelRequested = true; job.status = "annulation"; job.updatedAt = new Date().toISOString(); if (job.process?.kill) job.process.kill(); return job; }

function cleanupExpiredHlsDerivations() { const now = Date.now(); for (const [id, job] of ACTIVE_HLS_DERIVATIONS) if (job.expiresAt && Date.parse(job.expiresAt) <= now && !["anonymisation", "validation", "annulation"].includes(job.status)) { job.status = "expiré"; void removeDerivationWorkspace(job); ACTIVE_HLS_DERIVATIONS.delete(id); } }
setInterval(cleanupExpiredHlsDerivations, 60 * 1000).unref();

async function hlsPreparationSource(assetId, playableId, sourceId) {
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
  const playable = VIDEO_LIBRARY.playables.find(item => item.id === playableId && item.assetId === assetId);
  const source = VIDEO_LIBRARY.sources.find(item => item.id === sourceId && item.assetId === assetId);
  if (!asset || !playable || !source || source.kind !== "hls" || playable.kind !== "hls") throw new Error("Seules les sources HLS de la Library peuvent être préparées.");
  const manifest = source.originUrl || source.sourceUrl || source.manifestUrl;
  if (!manifest) throw new Error("Le manifeste HLS de la source est invalide.");
  const validatedManifest = await validateRemoteCopyUrl(manifest, { allowHls: true });
  if (!/\.m3u8$/i.test(validatedManifest.pathname)) throw new Error("Le manifeste HLS de la source est invalide.");
  return { asset, playable, source, manifest: validatedManifest.toString() };
}

async function removePreparationWorkspace(job) {
  if (job.workspace) { try { await fs.rm(job.workspace, { recursive: true, force: true }); } catch {} }
  job.workspace = null; job.outputPath = null;
}

async function runHlsPreparation(job, manifest) {
  job.status = "running"; job.progress = 1; job.updatedAt = new Date().toISOString();
  let child;
  let sizeMonitor;
  const timeout = setTimeout(() => { job.timeout = true; try { child?.kill(); } catch {} }, HLS_PREPARATION_TIMEOUT_MS);
  try {
    await fs.mkdir(HLS_PREPARATION_ROOT, { recursive: true });
    job.workspace = await fs.mkdtemp(path.join(HLS_PREPARATION_ROOT, `${job.id}-`));
    job.outputPath = path.join(job.workspace, "work.mp4");
    const ffmpeg = findFfmpeg();
    const args = ["-hide_banner", "-y", "-protocol_whitelist", "file,http,https,tcp,tls,crypto", "-i", manifest, "-map", "0:v:0?", "-map", "0:a:0?", "-c", "copy", "-t", String(HLS_PREPARATION_MAX_DURATION_SECONDS), "-movflags", "+faststart", job.outputPath];
    child = spawn(ffmpeg, args, { windowsHide: true });
    job.process = child;
    job.pid = child.pid || null;
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => { for (const line of String(chunk).split(/\r?\n/).filter(Boolean)) { job.log.push(line.slice(-500)); const time = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line); if (time) job.metadata = { ...(job.metadata || {}), detectedTime: `${time[1]}:${time[2]}:${time[3]}` }; } job.updatedAt = new Date().toISOString(); });
    child.on("error", error => { job.spawnError = error; });
    sizeMonitor = setInterval(async () => {
      if (!job.outputPath || !child || child.exitCode !== null) return;
      try { const current = await fs.stat(job.outputPath); if (current.size > HLS_PREPARATION_MAX_BYTES) { job.sizeLimit = true; child.kill(); } } catch {}
    }, 250);
    await new Promise((resolve, reject) => child.once("close", code => code === 0 ? resolve() : reject(job.timeout ? new Error("La préparation HLS a dépassé le délai maximal.") : job.spawnError || new Error(`FFmpeg a échoué (code ${code}).`))));
    const stat = await fs.stat(job.outputPath);
    if (!stat.isFile() || stat.size === 0) throw new Error("FFmpeg n’a produit aucun fichier exploitable.");
    if (stat.size > HLS_PREPARATION_MAX_BYTES || job.sizeLimit) throw new Error("La préparation HLS dépasse la taille maximale autorisée.");
    job.status = "completed"; job.progress = 100; job.expiresAt = new Date(Date.now() + HLS_PREPARATION_TTL_MS).toISOString(); job.metadata = { ...(job.metadata || {}), fileName: "work.mp4", sizeBytes: stat.size, workspaceId: path.basename(job.workspace), mimeType: "video/mp4" };
  } catch (error) {
    job.error = job.cancelRequested ? "Préparation annulée." : error.message;
    await removePreparationWorkspace(job);
    job.status = job.cancelRequested ? "cancelled" : "failed"; job.progress = 0; job.updatedAt = new Date().toISOString();
    await removePreparationWorkspace(job);
  } finally {
    clearTimeout(timeout); if (sizeMonitor) clearInterval(sizeMonitor); delete job.pid; delete job.process; delete job.spawnError; delete job.timeout; delete job.sizeLimit;
    if (job.status === "completed") job.updatedAt = new Date().toISOString();
  }
}

async function cancelHlsPreparation(job) {
  if (!job || !["queued", "running"].includes(job.status)) return job;
  job.cancelRequested = true; job.status = "cancelling"; job.updatedAt = new Date().toISOString();
  if (job.process?.kill) job.process.kill();
  return job;
}

function cleanupExpiredHlsPreparations() {
  const now = Date.now();
  for (const [id, job] of ACTIVE_HLS_PREPARATIONS) if (job.expiresAt && Date.parse(job.expiresAt) <= now && !["queued", "running", "cancelling"].includes(job.status)) { void removePreparationWorkspace(job); ACTIVE_HLS_PREPARATIONS.delete(id); }
}
setInterval(cleanupExpiredHlsPreparations, 60 * 1000).unref();

function catalogEntryFromInput(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  if (typeof payload.provider !== "string" || !["youtube", "uga"].includes(payload.provider)) throw new Error("Le type doit être YouTube ou HLS UGA.");
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim().slice(0, 500) : "Source vidéo Proto05";
  const link = payload.link;
  let source;
  if (payload.provider === "youtube") source = validateYouTubeLink(link);
  else source = validateUgaLink(link);
  const id = payload.provider === "youtube" ? `video-proto05-youtube-${source.videoId.toLowerCase()}` : `video-proto05-uga-${source.key.split("/").pop().replace(".m3u8", "")}`;
  if (VIDEO_CATALOG.some(video => video.id === id)) throw new Error("Cette source vidéo existe déjà dans le catalogue.");
  return { id, title, provider: payload.provider, ...(payload.provider === "youtube" ? source : { source: "UGA", sourceType: "hls-proxy", mimeType: "application/vnd.apple.mpegurl", durationMs: null, ...source }), authorized: true };
}

function activityResponse(store, activity) {
  return { schemaVersion: store.schemaVersion || "0.1", updatedAt: store.updatedAt || null, activity: activityForResponse(activity) };
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    return sendJson(response, 200, { ok: true, service: SERVICE, version: VERSION, port: PORT });
  }
  if (url.pathname === "/api/proto05/video-catalog") {
    if (request.method === "GET") return sendJson(response, 200, { videos: VIDEO_CATALOG });
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, POST" });
    let entry;
    try { entry = catalogEntryFromInput(JSON.parse(await readRequestBody(request))); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Source vidéo invalide." }); }
    const nextCatalog = freezeVideoCatalog([...VIDEO_CATALOG, entry]);
    try { await persistVideoCatalog(nextCatalog); VIDEO_CATALOG = nextCatalog; }
    catch (error) { console.error(`[data] catalogue vidéo Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Enregistrement du catalogue impossible." }); }
    return sendJson(response, 201, { video: entry });
  }
  if (url.pathname === "/api/proto05/library/assets") {
    if (request.method === "GET") {
      return sendJson(response, 200, { schemaVersion: VIDEO_LIBRARY.schemaVersion, updatedAt: VIDEO_LIBRARY.updatedAt || null, assets: VIDEO_LIBRARY.assets.map(libraryAssetDetails) });
    }
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, POST" });
    let created;
    try { created = libraryAssetFromInput(JSON.parse(await readRequestBody(request))); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Asset vidéo invalide." }); }
    const nextLibrary = JSON.parse(JSON.stringify(VIDEO_LIBRARY));
    nextLibrary.updatedAt = new Date().toISOString();
    nextLibrary.assets.push(created.asset);
    nextLibrary.sources.push(created.source);
    nextLibrary.playables.push(created.playable);
    try { validateLibraryShape(nextLibrary); await persistVideoLibrary(nextLibrary); VIDEO_LIBRARY = nextLibrary; }
    catch (error) { console.error(`[data] Library vidéo Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Enregistrement de la Library impossible." }); }
    return sendJson(response, 201, { asset: libraryAssetDetails(created.asset) });
  }
  if (url.pathname === "/api/proto05/library/copy-direct") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "MÃ©thode non autorisÃ©e." }, { allow: "POST" });
    try {
      const result = await copyDirectLibraryMedia(request, url);
      if (result.cancelled) return true;
      return sendJson(response, result.duplicate ? 409 : 201, result);
    } catch (error) {
      return sendJson(response, request.aborted ? 499 : 400, { error: error.message || "Copie distante impossible." });
    }
  }
  if (url.pathname === "/api/proto05/library/hls-preparations") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "MÃ©thode non autorisÃ©e." }, { allow: "POST" });
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const resolved = await hlsPreparationSource(payload.assetId, payload.playableId, payload.sourceId);
      const job = { id: `hls-prep-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`, assetId: resolved.asset.id, playableId: resolved.playable.id, sourceId: resolved.source.id, status: "queued", progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null, metadata: { sourceUrl: resolved.manifest, sourceTitle: resolved.source.title || resolved.asset.title }, masks: defaultAnonymizationMasks(), temporalMasks: null, error: null, log: [], cancelRequested: false };
      ACTIVE_HLS_PREPARATIONS.set(job.id, job);
      void runHlsPreparation(job, resolved.manifest);
      return sendJson(response, 202, { job: publicHlsPreparationJob(job) });
    } catch (error) { return sendJson(response, 400, { error: error.message || "Préparation HLS impossible." }); }
  }
  if (url.pathname === "/api/proto05/library/hls-temporal-derivations") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const prepJob = ACTIVE_HLS_PREPARATIONS.get(String(payload.preparationJobId || ""));
      if (!prepJob || prepJob.status !== "completed" || !prepJob.outputPath) throw new Error("La préparation HLS est introuvable, expirée ou incomplète.");
      const temporalSteps = payload.steps || payload.temporalSteps;
      const normalizedSteps = temporalSteps ? temporalStepConfiguration(temporalSteps, prepJob.metadata?.durationMs) : null;
      const temporalMasks = normalizedSteps ? temporalStepsToMasks(normalizedSteps) : temporalMaskConfiguration(payload.masks);
      const blur = anonymizationBlurProfile(payload.blurProfile);
      const job = { id: `hls-temporal-derivation-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`, preparationJobId: prepJob.id, assetId: prepJob.assetId, status: "prêt", progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null, metadata: null, error: null, log: [], cancelRequested: false, mode: "temporal", method: "ffmpeg-boxblur-temporal-steps", masks: temporalMasks.map(mask => mask.keyframes[0]), temporalMasks, temporalSteps: normalizedSteps, blurProfile: blur.id };
      ACTIVE_HLS_DERIVATIONS.set(job.id, job); void runHlsDerivation(job, prepJob);
      return sendJson(response, 202, { job: publicHlsDerivationJob(job) });
    } catch (error) { return sendJson(response, 400, { error: error.message || "Dérivation temporelle impossible." }); }
  }
  if (url.pathname === "/api/proto05/library/hls-derivations") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const prepJob = ACTIVE_HLS_PREPARATIONS.get(String(payload.preparationJobId || ""));
      if (!prepJob || prepJob.status !== "completed" || !prepJob.outputPath) throw new Error("La préparation HLS est introuvable, expirée ou incomplète.");
      const masks = defaultAnonymizationMasks(payload.masks === undefined ? prepJob.masks : payload.masks);
      prepJob.masks = masks;
const blur = anonymizationBlurProfile(payload.blurProfile);
const job = { id: `hls-derivation-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`, preparationJobId: prepJob.id, assetId: prepJob.assetId, status: "prêt", progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null, metadata: null, error: null, log: [], cancelRequested: false, method: "ffmpeg-boxblur-rectangles", masks, blurProfile: blur.id };
      ACTIVE_HLS_DERIVATIONS.set(job.id, job); void runHlsDerivation(job, prepJob);
      return sendJson(response, 202, { job: publicHlsDerivationJob(job) });
    } catch (error) { return sendJson(response, 400, { error: error.message || "Dérivation anonymisée impossible." }); }
  }
  const hlsDerivationMatch = url.pathname.match(/^\/api\/proto05\/library\/hls-derivations\/([^/]+)$/);
  if (hlsDerivationMatch) {
    const job = ACTIVE_HLS_DERIVATIONS.get(decodeURIComponent(hlsDerivationMatch[1]));
    if (!job) return sendJson(response, 404, { error: "Dérivation introuvable ou expirée." });
    if (request.method === "GET") return sendJson(response, 200, { job: publicHlsDerivationJob(job) });
    if (request.method === "DELETE") { await cancelHlsDerivation(job); return sendJson(response, 202, { job: publicHlsDerivationJob(job) }); }
    return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, DELETE" });
  }
  const hlsPreparationMatch = url.pathname.match(/^\/api\/proto05\/library\/hls-preparations\/([^/]+)$/);
  if (hlsPreparationMatch) {
    const job = ACTIVE_HLS_PREPARATIONS.get(decodeURIComponent(hlsPreparationMatch[1]));
    if (!job) return sendJson(response, 404, { error: "Préparation HLS introuvable ou expirée." });
    if (request.method === "GET") return sendJson(response, 200, { job: publicHlsPreparationJob(job) });
    if (request.method === "PUT") {
      try { const payload = JSON.parse(await readRequestBody(request)); if (payload.masks !== undefined) job.masks = defaultAnonymizationMasks(payload.masks); if (payload.temporalMasks !== undefined) job.temporalMasks = temporalMaskConfiguration(payload.temporalMasks); if (payload.temporalSteps !== undefined || payload.steps !== undefined) { job.temporalSteps = temporalStepConfiguration(payload.temporalSteps || payload.steps, job.metadata?.durationMs); job.temporalMasks = temporalStepsToMasks(job.temporalSteps); } if (payload.masks === undefined && payload.temporalMasks === undefined && payload.temporalSteps === undefined && payload.steps === undefined) throw new Error("Aucune configuration de masque fournie."); job.updatedAt = new Date().toISOString(); return sendJson(response, 200, { job: publicHlsPreparationJob(job) }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Masques invalides." }); }
    }
    if (request.method === "DELETE") { await cancelHlsPreparation(job); return sendJson(response, 202, { job: publicHlsPreparationJob(job) }); }
    return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, PUT, DELETE" });
  }
  if (url.pathname === "/api/proto05/library/import-local") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "MÃ©thode non autorisÃ©e." }, { allow: "POST" });
    try {
      const result = await importLocalLibraryMedia(request, url);
      return sendJson(response, result.duplicate ? 409 : 201, result);
    } catch (error) {
      return sendJson(response, 400, { error: error.message || "Import local impossible." });
    }
  }
  const libraryAssetMatch = url.pathname.match(/^\/api\/proto05\/library\/assets\/([^/]+)$/);
  if (libraryAssetMatch) {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    const asset = VIDEO_LIBRARY.assets.find(item => item.id === decodeURIComponent(libraryAssetMatch[1]));
    if (!asset) return sendJson(response, 404, { error: "Asset vidéo introuvable." });
    return sendJson(response, 200, { asset: libraryAssetDetails(asset) });
  }
  const libraryPlayableMatch = url.pathname.match(/^\/api\/proto05\/library\/playables\/([^/]+)$/);
  if (libraryPlayableMatch) {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    const playableId = decodeURIComponent(libraryPlayableMatch[1]);
    const playable = VIDEO_LIBRARY.playables.find(item => item.id === playableId);
    if (!playable) return sendJson(response, 404, { error: "Playable vidéo introuvable." });
    try { return sendJson(response, 200, { playable: resolveLibraryPlayable({ assetId: playable.assetId, playableId }, VIDEO_LIBRARY) }); }
    catch (error) { return sendJson(response, 409, { error: error.message }); }
  }
  const activityVideoRefMatch = url.pathname.match(/^\/api\/proto05\/activities\/([^/]+)\/video-ref$/);
  if (activityVideoRefMatch) {
    if (request.method !== "PUT") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "PUT" });
    const id = decodeURIComponent(activityVideoRefMatch[1]);
    const store = await readActivities();
    const index = store.activities.findIndex(activity => activity && activity.id === id);
    if (index < 0) return sendJson(response, 404, { error: "Activité introuvable." });
    let payload;
    try { payload = JSON.parse(await readRequestBody(request)); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Requête JSON invalide." }); }
    try {
      const playable = resolveLibraryPlayable(payload, VIDEO_LIBRARY);
      const asset = VIDEO_LIBRARY.assets.find(item => item.id === payload.assetId);
      const next = { ...store.activities[index], videoRef: { schemaVersion: "0.1", assetId: payload.assetId, playableId: payload.playableId } };
      next.video = activityVideoFromLibrary(asset, playable, next.video);
      validateActivityIntegrity(next);
      store.activities[index] = next;
      store.updatedAt = new Date().toISOString();
      await persistActivities(store);
      return sendJson(response, 200, activityResponse(store, next));
    } catch (error) { return sendJson(response, 400, { error: error.message || "Association vidéo invalide." }); }
  }
  if (url.pathname === "/api/proto05/language-catalog") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    return sendJson(response, 200, { languages: LANGUAGE_CATALOG });
  }
  const resolutionMatch = url.pathname.match(/^\/api\/proto05\/activities\/([^/]+)\/video-resolution$/);
  if (resolutionMatch) {
    if (request.method !== "GET") return sendJson(response, 405, { error: "MÃ©thode non autorisÃ©e." }, { allow: "GET" });
    const id = decodeURIComponent(resolutionMatch[1]);
    const store = await readActivities();
    const activity = store.activities.find(entry => entry && entry.id === id);
    if (!activity) return sendJson(response, 404, { error: "ActivitÃ© introuvable." });
    try {
      const resolved = resolveActivityVideo(activity);
      return sendJson(response, 200, { activityId: id, videoRef: resolved.videoRef, source: resolved.source });
    } catch (error) {
      return sendJson(response, 400, { error: error.message || "Source vidÃ©o introuvable." });
    }
  }
  const duplicateMatch = url.pathname.match(/^\/api\/proto05\/activities\/([^/]+)\/duplicate$/);
  if (duplicateMatch) {
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    const id = decodeURIComponent(duplicateMatch[1]);
    const store = await readActivities();
    const source = store.activities.find(activity => activity && activity.id === id);
    if (!source) return sendJson(response, 404, { error: "Activité introuvable." });
    let activity;
    try { activity = duplicateActivity(source, store.activities); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Duplication invalide." }); }
    store.activities.push(activity); store.updatedAt = new Date().toISOString();
    try { await persistActivities(store); }
    catch (error) { console.error(`[data] duplication Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Duplication JSON impossible." }); }
    return sendJson(response, 201, activityResponse(store, activity));
  }
  const deleteMatch = url.pathname.match(/^\/api\/proto05\/activities\/([^/]+)$/);
  if (request.method === "DELETE" && deleteMatch) {
    let id;
    try { id = decodeDeletionIdentifier(deleteMatch[1]); }
    catch (error) { return sendJson(response, 400, { error: error.message }); }
    const store = await readActivities();
    const matches = store.activities
      .map((activity, index) => activity && activity.id === id ? index : -1)
      .filter(index => index >= 0);
    if (!matches.length) return sendJson(response, 404, { error: "Activité introuvable." });
    if (matches.length > 1) return sendJson(response, 409, { error: `Identifiant d’activité ambigu : ${id}.` });
    const [index] = matches;
    const [deleted] = store.activities.splice(index, 1);
    store.updatedAt = new Date().toISOString();
    try { await persistActivities(store); }
    catch (error) {
      console.error(`[data] suppression Proto05 impossible : ${error.message}`);
      return sendJson(response, 500, { error: "Suppression JSON impossible." });
    }
    return sendJson(response, 200, {
      schemaVersion: store.schemaVersion || "0.1",
      updatedAt: store.updatedAt,
      deleted: { id: deleted.id, title: deleted.title || deleted.id },
      activitiesRemaining: store.activities.length
    });
  }
  if (url.pathname === "/api/proto05/activities" && request.method === "POST") {
    let payload;
    try { payload = validateMetadataPatch(JSON.parse(await readRequestBody(request))); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Requête JSON invalide." }); }
    const store = await readActivities();
    let activity;
    try { activity = payload.videoRef ? draftActivityFromVideoRef(payload.videoRef, payload) : draftActivity(payload.videoId, payload); validateActivityIntegrity(activity); }
    catch (error) { return sendJson(response, 400, { error: error.message }); }
    store.activities.push(activity); store.updatedAt = new Date().toISOString();
    try { await persistActivities(store); } catch { return sendJson(response, 500, { error: "Création JSON impossible." }); }
    return sendJson(response, 201, activityResponse(store, activity));
  }
  if (url.pathname === "/api/proto05/activities" || /^\/api\/proto05\/activities\/[^/]+(?:\/authoring)?$/.test(url.pathname)) {
    const isDetail = url.pathname !== "/api/proto05/activities";
    if (request.method === "PUT" && /^\/api\/proto05\/activities\/[^/]+\/authoring$/.test(url.pathname)) {
      const id = decodeURIComponent(url.pathname.slice("/api/proto05/activities/".length, -"/authoring".length));
      const store = await readActivities(); const index = store.activities.findIndex(activity => activity && activity.id === id);
      if (index < 0) return sendJson(response, 404, { error: "Activité introuvable." });
      let payload; let next;
      try { payload = JSON.parse(await readRequestBody(request)); next = validateAuthoringPatch(payload, store.activities[index]); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Données d’atelier invalides." }); }
      next.status = "draft"; store.activities[index] = next; store.updatedAt = new Date().toISOString();
      try { await persistActivities(store); } catch { return sendJson(response, 500, { error: "Sauvegarde de l’atelier impossible." }); }
      return sendJson(response, 200, activityResponse(store, next));
    }
    if (request.method === "PUT" && isDetail) {
      const id = decodeURIComponent(url.pathname.slice("/api/proto05/activities/".length));
      const store = await readActivities();
      const index = store.activities.findIndex(activity => activity && activity.id === id);
      if (index < 0) return sendJson(response, 404, { error: "Activité introuvable." });
      let payload;
      try { payload = validateMetadataPatch(JSON.parse(await readRequestBody(request))); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Requête JSON invalide." }); }
      const current = store.activities[index];
      const next = { ...current };
      for (const key of ["title", "description", "instruction", "pedagogicalQuestion"]) if (payload[key] !== undefined) next[key] = payload[key];
      if (payload.videoId !== undefined) {
        const video = VIDEO_CATALOG.find(entry => entry.id === payload.videoId);
        next.video = activityVideoFromCatalog(video, current.video);
      }
      try { validateActivityIntegrity(next); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Activité invalide." }); }
      store.activities[index] = next;
      store.updatedAt = new Date().toISOString();
      try { await persistActivities(store); }
      catch (error) { console.error(`[data] sauvegarde Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Sauvegarde JSON impossible." }); }
      return sendJson(response, 200, activityResponse(store, next));
    }
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: isDetail ? "GET, PUT, DELETE" : "GET" });
    const store = await readActivities();
    if (url.pathname === "/api/proto05/activities") {
      return sendJson(response, 200, { schemaVersion: store.schemaVersion || "0.1", updatedAt: store.updatedAt || null, activities: store.activities });
    }
    const id = decodeURIComponent(url.pathname.slice("/api/proto05/activities/".length));
    const activity = store.activities.find((entry) => entry && entry.id === id);
    if (!activity) return sendJson(response, 404, { error: "Activité introuvable." });
    return sendJson(response, 200, activityResponse(store, activity));
  }
  return sendJson(response, 404, { error: "Route API introuvable." });
}

function hlsPathIsAllowed(url) {
  if (!url.pathname.startsWith(HLS_PREFIX)) return false;
  const suffix = url.pathname.slice(HLS_PREFIX.length);
  return /^uga-37004\/(?:livestream|360p|720p|1080p)\.(?:m3u8|ts)$/.test(suffix);
}

async function handleHlsGateway(request, response, url) {
  if (!url.pathname.startsWith(HLS_PREFIX)) return false;
  if (!hlsPathIsAllowed(url)) {
    sendJson(response, 404, { error: "Ressource HLS non autorisée." });
    return true;
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, HEAD" });
    return true;
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.once("aborted", abort);
  response.once("close", abort);
  const headers = { accept: request.headers.accept || "*/*" };
  for (const key of ["range", "if-range"]) if (request.headers[key]) headers[key] = request.headers[key];
  let upstream;
  try {
    upstream = await fetch(new URL(url.pathname + url.search, HUB_HLS_ORIGIN), { method: request.method, headers, redirect: "manual", signal: controller.signal });
  } catch (error) {
    if (!controller.signal.aborted) console.error(`[hls-gateway] ${error.message}`);
    if (!response.headersSent) sendJson(response, 502, { error: "Le proxy HLS IC-Hub est indisponible." });
    return true;
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    sendJson(response, 502, { error: "Redirection HLS refusée." });
    return true;
  }
  const relay = {};
  for (const name of ["accept-ranges", "cache-control", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) relay[name] = value;
  }
  response.writeHead(upstream.status, relay);
  if (request.method === "HEAD" || !upstream.body) response.end();
  else {
    try { await pipeline(Readable.fromWeb(upstream.body), response); }
    catch (error) { if (!controller.signal.aborted) console.error(`[hls-gateway] streaming : ${error.message}`); }
  }
  request.off("aborted", abort);
  response.off("close", abort);
  return true;
}

async function serveStatic(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, HEAD" });
  if (url.pathname === "/vendor/hls.js/hls.min.js") {
    try {
      const stat = await fs.stat(HLS_JS_ASSET_PATH);
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "content-length": stat.size, "cache-control": "public, max-age=31536000, immutable" });
      if (request.method === "HEAD") return response.end();
      return await pipeline((await import("node:fs")).createReadStream(HLS_JS_ASSET_PATH), response);
    } catch {
      return sendJson(response, 503, { error: "hls.js local indisponible." });
    }
  }
  const isStudentRoute = url.pathname === "/student" || url.pathname === "/student/" || /^\/student\/[^/]+$/.test(url.pathname);
  const isTeacherPreviewRoute = /^\/teacher\/preview\/[^/]+$/.test(url.pathname);
  if (url.pathname === "/teacher" || url.pathname === "/teacher/") {
    const target = path.join(ROOT_DIR, "teacher.html");
    const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (url.pathname === "/teacher/create" || url.pathname === "/teacher/create/") {
    const target = path.join(ROOT_DIR, "teacher-create.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (url.pathname === "/teacher/videos" || url.pathname === "/teacher/videos/") {
    const target = path.join(ROOT_DIR, "teacher-videos.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/anonymization\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-anonymization.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/anonymization-advanced\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-anonymization-advanced.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); response.end(file); return true;
  }
  if (/^\/teacher\/author\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-author.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/guided\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-guided.html");
    const file = Buffer.from((await fs.readFile(target, "utf8")).replace("</head>", "<script src=\"/shared/ic-video-player.js\"></script></head>").replace("</body>", "<script>attachVideo=()=>{upgradeICVideoElement(video,state.activity.video).catch(error=>$('#status').textContent=error.message)};</script></body>"));
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/edit\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-edit.html");
    const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  let relative = url.pathname === "/" || isStudentRoute || isTeacherPreviewRoute
    ? INDEX_FILE
    : decodeURIComponent(url.pathname.slice(1));
  if (!relative || relative.includes("\\") || relative.split("/").some((part) => part === "." || part === "..")) return sendJson(response, 403, { error: "Accès refusé." });
  const target = path.resolve(ROOT_DIR, relative);
  if (target !== ROOT_DIR && !target.startsWith(`${ROOT_DIR}${path.sep}`)) return sendJson(response, 403, { error: "Accès refusé." });
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error("not file");
    const extension = path.extname(target).toLowerCase();
    response.writeHead(200, { "content-type": STATIC_TYPES[extension] || "application/octet-stream", "content-length": stat.size });
    if (request.method === "HEAD") return response.end();
    return await pipeline((await import("node:fs")).createReadStream(target), response);
  } catch {
    return sendJson(response, 404, { error: "Ressource introuvable." });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (await servePreparationMedia(request, response, url)) return;
    if (await serveLibraryMedia(request, response, url)) return;
    if (await handleHlsGateway(request, response, url)) return;
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
    return await serveStatic(request, response, url);
  } catch (error) {
    console.error(`[server] ${request.method} ${url.pathname}: ${error.stack || error.message}`);
    if (!response.headersSent) sendJson(response, 500, { error: error.message || "Erreur serveur." });
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`[startup] ${SERVICE} ${VERSION} sur http://127.0.0.1:${PORT}/`));
