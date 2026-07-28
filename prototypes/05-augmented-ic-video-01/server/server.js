const http = require("node:http");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { AsyncLocalStorage } = require("node:async_hooks");
const {
  mediaRefForCatalogEntry
} = require("./media-contract");
const {
  libraryFromCatalog,
  mergeCatalogIntoLibrary,
  validateLibraryShape,
  normalizeLibrarySourceInput,
  playableFromSource,
  resolveLibraryPlayable
} = require("./library-contract");
const {
  readCanonicalMediaLibrary,
  projectCanonicalLibrary,
  canonicalFromRuntime,
  assertWritableCanonical
} = require("./media-library-runtime");
const {
  projectActivityVideo,
  projectActivityVideoSource
} = require("./activity-video-projection");
const {
  dataModeFromEnvironment,
  mariadbConfigurationFromEnvironment,
  readonlyMutationPayload
} = require("./proto05-data-mode");
const { createMariaDbReadonlyAdapter } = require("./proto05-mariadb-readonly");
const {
  assertApplicationGrants,
  createMariaDbWriteAdapter
} = require("./proto05-mariadb-write");
const { createProto05ReadBoundary } = require("./proto05-read-boundary");
const { createProto05WriteBoundary } = require("./proto05-write-boundary");
const { explicitRole, hasActiveDerivation, projectAssetAccesses } = require("./video-workspaces");
const {
  assertPedagogicalLineage,
  createEmptyPedagogicalIdentity,
  normalizePedagogicalIdentityStates,
  pedagogicalIdentityForDuplicate,
  summarizePedagogicalIdentity,
  validatePedagogicalIdentity
} = require("./pedagogical-identity");

const PORT = Number(process.env.PORT || 8791);
const VERSION = "0.1.48";
const SERVICE = "proto05-augmented-video";
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_MODE = dataModeFromEnvironment(process.env);
const MARIADB_IS_AUTHORITY = DATA_MODE === "mariadb" || DATA_MODE === "mariadb-readonly";
const MARIADB_CONFIGURATION = DATA_MODE === "json"
  ? null
  : mariadbConfigurationFromEnvironment(process.env);
const READ_CONTEXT = new AsyncLocalStorage();
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "activities.json");
const ACTIVITY_LIBRARY_FILE = path.join(DATA_DIR, "activity-library.json");
const VIDEO_CATALOG_FILE = path.join(DATA_DIR, "video-catalog.json");
const VIDEO_LIBRARY_FILE = path.join(DATA_DIR, "video-library.json");
const VIDEO_LIBRARY_MEDIA_DIR = path.join(DATA_DIR, "video-library-media");
const VIDEO_LIBRARY_WORKSPACES_DIR = path.join(DATA_DIR, "video-library-workspaces");
const REMOTE_COPY_MAX_BYTES = Number(process.env.PROTO05_REMOTE_COPY_MAX_BYTES || 1024 * 1024 * 1024);
const REMOTE_COPY_TIMEOUT_MS = Number(process.env.PROTO05_REMOTE_COPY_TIMEOUT_MS || 120000);
const REMOTE_REFERENCE_TIMEOUT_MS = Number(process.env.PROTO05_REMOTE_REFERENCE_TIMEOUT_MS || 8000);
const REMOTE_REFERENCE_MAX_BYTES = Number(process.env.PROTO05_REMOTE_REFERENCE_MAX_BYTES || 256 * 1024);
const REMOTE_REFERENCE_TOKEN_TTL_MS = Number(process.env.PROTO05_REMOTE_REFERENCE_TOKEN_TTL_MS || 10 * 60 * 1000);
const REMOTE_REFERENCE_ANALYSES = new Map();
const REMOTE_HLS_GATEWAY_PREFIX = "/api/proto05/library/remote-hls/";
const REMOTE_HLS_GATEWAY_TIMEOUT_MS = Number(process.env.PROTO05_REMOTE_HLS_GATEWAY_TIMEOUT_MS || 30000);
const REMOTE_MEDIA_GATEWAY_PREFIX = "/api/proto05/library/remote-media/";
const LIBRARY_DOWNLOAD_ROOT = path.join(VIDEO_LIBRARY_MEDIA_DIR, ".proto05-downloads");
const LIBRARY_DOWNLOAD_TIMEOUT_MS = Number(process.env.PROTO05_LIBRARY_DOWNLOAD_TIMEOUT_MS || 4 * 60 * 60 * 1000);
const LIBRARY_DOWNLOAD_TTL_MS = Number(process.env.PROTO05_LIBRARY_DOWNLOAD_TTL_MS || 30 * 60 * 1000);
const LIBRARY_DOWNLOAD_MAX_HISTORY = Number(process.env.PROTO05_LIBRARY_DOWNLOAD_MAX_HISTORY || 100);
const ACTIVE_LIBRARY_DOWNLOADS = new Map();
let RUNTIME_FFMPEG_PATH = null;
let SERVER_SHUTTING_DOWN = false;
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
const UGA_HLS_MEDIA_ORIGIN = "https://videos.univ-grenoble-alpes.fr/media/videos/7d74074b07ff1dfc9ed59cdade1a126fc17fed888ca9d26da6e5b2875e8b5120/37004/";
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

let JSON_VIDEO_CATALOG = MARIADB_IS_AUTHORITY ? freezeVideoCatalog([]) : loadVideoCatalog();

function activeVideoCatalog() {
  return READ_CONTEXT.getStore()?.videoCatalog?.videos || JSON_VIDEO_CATALOG;
}

function safeVideoLibraryFile() {
  const root = path.resolve(DATA_DIR);
  const file = path.resolve(VIDEO_LIBRARY_FILE);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("Chemin de Library vidéo invalide.");
  return file;
}

let CANONICAL_LIBRARY = null;

function loadVideoLibrary() {
  const file = safeVideoLibraryFile();
  if (!fsSync.existsSync(file)) throw new Error("Library vidéo canonique introuvable.");
  const loaded = readCanonicalMediaLibrary(file);
  CANONICAL_LIBRARY = loaded.canonical;
  return validateLibraryShape(projectCanonicalLibrary(CANONICAL_LIBRARY));
}

let JSON_VIDEO_LIBRARY = MARIADB_IS_AUTHORITY ? null : loadVideoLibrary();

function activeCanonicalVideoLibrary() {
  const canonical = READ_CONTEXT.getStore()?.canonicalVideoLibrary || CANONICAL_LIBRARY;
  if (!canonical) throw new Error("Aucune Library vidéo canonique n’est disponible.");
  return canonical;
}

function activeVideoLibrary() {
  const library = READ_CONTEXT.getStore()?.videoLibrary || JSON_VIDEO_LIBRARY;
  if (!library) throw new Error("Aucune Library vidéo n’est disponible hors du contexte MariaDB.");
  return library;
}

const VIDEO_LIBRARY = new Proxy({}, {
  get(_target, property) {
    const library = activeVideoLibrary();
    return Reflect.get(library, property, library);
  },
  set(_target, property, value) {
    if (READ_CONTEXT.getStore()) throw new Error("Mutation de la Library interdite dans un contexte de lecture.");
    return Reflect.set(JSON_VIDEO_LIBRARY, property, value, JSON_VIDEO_LIBRARY);
  },
  has(_target, property) {
    return Reflect.has(activeVideoLibrary(), property);
  },
  ownKeys() {
    return Reflect.ownKeys(activeVideoLibrary());
  },
  getOwnPropertyDescriptor(_target, property) {
    const descriptor = Reflect.getOwnPropertyDescriptor(activeVideoLibrary(), property);
    return descriptor ? { ...descriptor, configurable: true } : undefined;
  }
});

function safeRelativeMediaPath(rootDirectory, storageKey) {
  if (typeof storageKey !== "string" || !storageKey || storageKey.startsWith("/") || storageKey.includes("\\") || storageKey.split("/").some(part => !part || part === "." || part === "..")) throw new Error("Clé de média locale invalide.");
  const root = path.resolve(rootDirectory);
  const file = path.resolve(root, storageKey);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Chemin de média local refusé.");
  return file;
}

function safeLibraryMediaPath(storageKey, storageScope = "legacy-media") {
  return safeRelativeMediaPath(storageScope === "workspace" ? VIDEO_LIBRARY_WORKSPACES_DIR : VIDEO_LIBRARY_MEDIA_DIR, storageKey);
}

function safeAssetWorkspacePath(assetId, ...parts) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,160}$/.test(String(assetId || ""))) throw new Error("Identifiant d’asset invalide.");
  return safeRelativeMediaPath(VIDEO_LIBRARY_WORKSPACES_DIR, [assetId, ...parts].join("/"));
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
  let storageScope = "legacy-media";
  let encodedStorageKey = url.pathname.slice(prefix.length);
  if (encodedStorageKey.startsWith("workspace/")) {
    storageScope = "workspace";
    encodedStorageKey = encodedStorageKey.slice("workspace/".length);
  }
  try { storageKey = decodeURIComponent(encodedStorageKey); }
  catch { sendJson(response, 400, { error: "Clé de média locale invalide." }); return true; }
  let file;
  try { file = safeLibraryMediaPath(storageKey, storageScope); }
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
const LANGUAGE_CATALOG = MARIADB_IS_AUTHORITY ? Object.freeze([]) : loadLanguageCatalog();

function activeLanguageCatalog() {
  return READ_CONTEXT.getStore()?.languageCatalog?.languages || LANGUAGE_CATALOG;
}

function activeLanguageCatalogById() {
  return new Map(activeLanguageCatalog().map(language => [language.id, language]));
}
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

function activityForStorage(activity) {
  const stored = { ...activity };
  delete stored.video;
  delete stored.videoSource;
  return stored;
}

function storeForPersistence(store) {
  return {
    ...store,
    activities: (store.activities || []).map(activityForStorage)
  };
}

async function readJsonActivities() {
  try {
    const parsed = JSON.parse(await fs.readFile(safeDataFile(), "utf8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.activities)) throw new Error("JSON d’activités invalide.");
    parsed.activities = parsed.activities.map(activity => activityForStorage(normalizeActivityOverlays(activity)));
    return parsed;
  } catch (error) {
    console.error(`[data] lecture impossible : ${error.message}`);
    throw new Error("Données Proto05 absentes ou JSON invalide.");
  }
}

async function readActivities() {
  return READ_CONTEXT.getStore()?.activities || readJsonActivities();
}

function safeActivityLibraryFile() {
  const root = path.resolve(DATA_DIR);
  const file = path.resolve(ACTIVITY_LIBRARY_FILE);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("Chemin de classement des activités invalide.");
  return file;
}

function emptyActivityLibraryClassification() {
  return { schemaVersion: "0.1", updatedAt: null, folders: [], assignments: {} };
}

function activityFolderName(value) {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!name) throw new Error("Le nom du dossier est obligatoire.");
  if (name.length > 120) throw new Error("Le nom du dossier est limité à 120 caractères.");
  return name;
}

function normalizeActivityLibraryClassification(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Classement des activités invalide.");
  const folders = Array.isArray(value.folders) ? value.folders.map(folder => {
    if (!folder || typeof folder !== "object" || Array.isArray(folder)) throw new Error("Dossier d’activités invalide.");
    const id = typeof folder.id === "string" ? folder.id : "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,160}$/.test(id)) throw new Error("Identifiant de dossier d’activités invalide.");
    return { ...folder, id, name: activityFolderName(folder.name) };
  }) : [];
  const folderIds = new Set();
  const folderNames = [];
  for (const folder of folders) {
    if (folderIds.has(folder.id)) throw new Error("Identifiant de dossier d’activités dupliqué.");
    if (folderNames.some(name => name.localeCompare(folder.name, "fr", { sensitivity: "base" }) === 0)) throw new Error("Nom de dossier d’activités dupliqué.");
    folderIds.add(folder.id);
    folderNames.push(folder.name);
  }
  const sourceAssignments = value.assignments && typeof value.assignments === "object" && !Array.isArray(value.assignments)
    ? value.assignments
    : {};
  const assignments = {};
  for (const [activityId, folderId] of Object.entries(sourceAssignments)) {
    if (!activityId || typeof folderId !== "string" || !folderIds.has(folderId)) throw new Error("Affectation de dossier d’activités invalide.");
    assignments[activityId] = folderId;
  }
  return {
    ...value,
    schemaVersion: "0.1",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    folders,
    assignments
  };
}

async function readJsonActivityLibraryClassification() {
  const file = safeActivityLibraryFile();
  try {
    return normalizeActivityLibraryClassification(JSON.parse(await fs.readFile(file, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return emptyActivityLibraryClassification();
    console.error(`[data] classement des activités illisible : ${error.message}`);
    throw new Error("Classement des activités absent ou invalide.");
  }
}

async function readActivityLibraryClassification() {
  return READ_CONTEXT.getStore()?.activityLibrary || readJsonActivityLibraryClassification();
}

async function persistActivityLibraryClassification(classification) {
  const normalized = normalizeActivityLibraryClassification({
    ...classification,
    updatedAt: new Date().toISOString()
  });
  if (DATA_MODE === "mariadb") {
    await persistMariaDbSnapshot(
      { activityLibrary: normalized },
      { operation: "activity-library" }
    );
    return normalized;
  }
  const operation = writeQueue.then(async () => {
    const file = safeActivityLibraryFile();
    const backup = `${file}.bak`;
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    try { await fs.copyFile(file, backup); } catch (error) { if (error.code !== "ENOENT") throw error; }
    try {
      await fs.writeFile(temp, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
      await fs.rename(temp, file);
    } finally {
      try { await fs.unlink(temp); } catch {}
    }
  });
  writeQueue = operation.catch(() => {});
  await operation;
  return normalized;
}

function activityLibraryFolderFromInput(classification, payload) {
  const name = activityFolderName(payload?.name);
  if (classification.folders.some(folder => folder.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0)) throw new Error("Ce dossier existe déjà.");
  const now = new Date().toISOString();
  return {
    id: `activity-folder-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    name,
    createdAt: now,
    updatedAt: now
  };
}

function activityLibraryPayload(store, classification) {
  const folderIds = new Set(classification.folders.map(folder => folder.id));
  return {
    schemaVersion: classification.schemaVersion,
    updatedAt: classification.updatedAt,
    folders: classification.folders,
    activities: store.activities.map(activity => ({
      ...activityForLibraryResponse(activity),
      folderId: folderIds.has(classification.assignments[activity.id]) ? classification.assignments[activity.id] : null
    }))
  };
}

async function removeActivityLibraryAssignment(activityId) {
  if (DATA_MODE !== "mariadb") {
    const file = safeActivityLibraryFile();
    if (!fsSync.existsSync(file)) return;
  }
  const classification = await readActivityLibraryClassification();
  if (!Object.prototype.hasOwnProperty.call(classification.assignments, activityId)) return;
  const assignments = { ...classification.assignments };
  delete assignments[activityId];
  await persistActivityLibraryClassification({ ...classification, assignments });
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

function unresolvedActivityPlayable(message = "La référence vidéo de l’activité ne peut pas être résolue.") {
  const error = new Error(message);
  error.code = "ACTIVITY_PLAYABLE_UNRESOLVED";
  return error;
}

function activityProjectionErrorPayload(error, fallback) {
  return {
    status: error?.code === "ACTIVITY_PLAYABLE_UNRESOLVED" ? 409 : 500,
    body: {
      code: error?.code || "ACTIVITY_PROJECTION_FAILED",
      error: error?.message || fallback
    }
  };
}

function normalizedActivityVideoRef(videoRef) {
  if (!videoRef || typeof videoRef !== "object" || Array.isArray(videoRef)) throw unresolvedActivityPlayable("videoRef doit être un objet.");
  const { assetId, playableId } = videoRef;
  if (typeof assetId !== "string" || !assetId || typeof playableId !== "string" || !playableId) {
    throw unresolvedActivityPlayable("videoRef doit contenir assetId et playableId.");
  }
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
  const playable = VIDEO_LIBRARY.playables.find(item => item.id === playableId && item.assetId === assetId);
  if (!asset || !playable) throw unresolvedActivityPlayable();
  return { schemaVersion: "0.1", assetId, playableId };
}

function activityVideoRefFromCatalogId(videoId) {
  const entry = activeVideoCatalog().find(item => item.id === videoId && item.authorized);
  if (!entry) throw new Error("La vidéo sélectionnée n’est pas autorisée.");
  return normalizedActivityVideoRef(mediaRefForCatalogEntry(entry));
}

function selectedActivityVideoRef(payload, currentVideoRef = null) {
  const fromCatalog = payload.videoId !== undefined ? activityVideoRefFromCatalogId(payload.videoId) : null;
  const explicit = payload.videoRef !== undefined ? normalizedActivityVideoRef(payload.videoRef) : null;
  if (fromCatalog && explicit && (fromCatalog.assetId !== explicit.assetId || fromCatalog.playableId !== explicit.playableId)) {
    throw new Error("videoId et videoRef doivent désigner le même playable.");
  }
  if (explicit || fromCatalog) return explicit || fromCatalog;
  if (currentVideoRef) return normalizedActivityVideoRef(currentVideoRef);
  throw unresolvedActivityPlayable("Une référence vidéo canonique est obligatoire.");
}

function resolveActivityVideo(activity) {
  const videoRef = normalizedActivityVideoRef(activity?.videoRef);
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === videoRef.assetId);
  const playable = VIDEO_LIBRARY.playables.find(item => item.id === videoRef.playableId && item.assetId === videoRef.assetId);
  if (!asset || !playable) throw unresolvedActivityPlayable();
  const source = projectActivityVideoSource(playableForClient(playable));
  return {
    videoRef,
    video: projectActivityVideo(asset, source),
    source
  };
}

function activityForResponse(activity) {
  const resolved = resolveActivityVideo(activity);
  return {
    ...activityForStorage(activity),
    videoRef: resolved.videoRef,
    video: resolved.video,
    videoSource: resolved.source,
    pedagogicalIdentitySummary: summarizePedagogicalIdentity(activity)
  };
}

function activityForLibraryResponse(activity) {
  return activityForResponse(activity);
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
  const allowed = new Set(["title", "description", "instruction", "pedagogicalQuestion", "videoId", "videoRef", "pedagogicalIdentity"]);
  const unknown = Object.keys(payload).filter(key => !allowed.has(key));
  if (unknown.length) throw new Error(`Champ non autorisé : ${unknown.join(", ")}.`);
  for (const key of ["title", "description", "instruction", "pedagogicalQuestion"]) {
    if (payload[key] !== undefined && (typeof payload[key] !== "string" || payload[key].length > 5000)) {
      throw new Error(`Le champ ${key} doit être une chaîne de 5000 caractères maximum.`);
    }
  }
  if (payload.videoId !== undefined && (typeof payload.videoId !== "string" || !activeVideoCatalog().some(video => video.id === payload.videoId && video.authorized))) {
    throw new Error("La vidéo sélectionnée n’est pas autorisée.");
  }
  if (payload.videoRef !== undefined) {
    if (!payload.videoRef || typeof payload.videoRef !== "object" || Array.isArray(payload.videoRef)) throw new Error("videoRef doit être un objet.");
    if (typeof payload.videoRef.assetId !== "string" || typeof payload.videoRef.playableId !== "string") throw new Error("videoRef doit contenir assetId et playableId.");
  }
  if (payload.pedagogicalIdentity !== undefined && (!payload.pedagogicalIdentity || typeof payload.pedagogicalIdentity !== "object" || Array.isArray(payload.pedagogicalIdentity))) {
    throw new Error("pedagogicalIdentity doit être un objet.");
  }
  return payload;
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
  const resolvedVideo = resolveActivityVideo(activity);
  const durationMs = Number.isInteger(resolvedVideo.source.durationMs) && resolvedVideo.source.durationMs > 0
    ? resolvedVideo.source.durationMs
    : Infinity;
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
  if (activity.pedagogicalIdentity !== undefined) validatePedagogicalIdentity(activity.pedagogicalIdentity, activity.id);
}

function validateSharedLanguageSelection(languages) {
  if (!Array.isArray(languages)) throw new Error("languages doit être un tableau.");
  for (const language of languages) {
    const reference = activeLanguageCatalogById().get(language?.id);
    if (!reference) throw new Error(`Langue absente du référentiel partagé : ${String(language?.id)}.`);
    if (language.label !== reference.label || language.code !== reference.id.toUpperCase()) throw new Error(`La langue ${reference.id} doit reprendre le code et le libellé du référentiel partagé.`);
  }
}

function validateAuthoringPatch(payload, current) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  const allowed = new Set(["title", "description", "instruction", "pedagogicalQuestion", "videoId", "videoRef", "segments", "speakers", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "overlays", "layerConfiguration"]);
  const unknown = Object.keys(payload).filter(key => !allowed.has(key));
  if (unknown.length) throw new Error(`Champ non autorisé : ${unknown.join(", ")}.`);
  validateMetadataPatch(Object.fromEntries(Object.entries(payload).filter(([key]) => ["title", "description", "instruction", "pedagogicalQuestion", "videoId", "videoRef"].includes(key))));
  const next = activityForStorage(current);
  for (const key of ["title", "description", "instruction", "pedagogicalQuestion", "segments", "speakers", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "overlays", "layerConfiguration"]) if (payload[key] !== undefined) next[key] = payload[key];
  next.videoRef = selectedActivityVideoRef(payload, current.videoRef);
  next.transcription = { ...(current.transcription || {}), segmentIds: (next.segments || []).map(segment => segment.id) };
  validateSharedLanguageSelection(next.languages);
  validateActivityIntegrity(next);
  return next;
}

function draftActivityFromVideoRef(videoRef, metadata = {}) {
  const normalizedVideoRef = normalizedActivityVideoRef(videoRef);
  const id = `proto05-draft-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  return { id, version: "0.1.0", status: "draft", title: metadata.title || "Nouvelle activité", description: metadata.description || "", instruction: metadata.instruction || "", pedagogicalQuestion: metadata.pedagogicalQuestion || "", pedagogicalIdentity: metadata.pedagogicalIdentity || createEmptyPedagogicalIdentity(id), videoRef: normalizedVideoRef, transcription: { id: `transcription-${id}`, languageId: null, segmentIds: [] }, segments: [], speakers: [], languages: [], languageIntervals: [], layers: [], phenomena: [], teacherAnnotations: [], overlays: [], layerConfiguration: { id: `layer-config-${id}`, defaultVisibleLayerIds: [], learnerVisibleLayerIds: [], teacherVisibleLayerIds: [], allowLearnerToggle: true } };
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
  validateMetadataPatch({
    title: source.title,
    description: source.description,
    instruction: source.instruction || "",
    pedagogicalQuestion: source.pedagogicalQuestion || "",
    videoRef: source.videoRef
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
    pedagogicalIdentity: pedagogicalIdentityForDuplicate(source, id),
    videoRef: { ...source.videoRef },
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
  assertPedagogicalLineage(copy, [...activities, copy]);
  return copy;
}

async function persistActivities(store) {
  if (DATA_MODE === "mariadb") {
    const currentClassification = READ_CONTEXT.getStore()?.activityLibrary;
    const activityIds = new Set((store.activities || []).map(activity => activity.id));
    const assignments = Object.fromEntries(Object.entries(currentClassification?.assignments || {})
      .filter(([activityId]) => activityIds.has(activityId)));
    const classificationChanged = Object.keys(assignments).length
      !== Object.keys(currentClassification?.assignments || {}).length;
    await persistMariaDbSnapshot(
      {
        activities: storeForPersistence(store),
        ...(classificationChanged
          ? {
              activityLibrary: normalizeActivityLibraryClassification({
                ...currentClassification,
                assignments,
                updatedAt: new Date().toISOString()
              })
            }
          : {})
      },
      { operation: "activities" }
    );
    return;
  }
  const operation = writeQueue.then(async () => {
    const file = safeDataFile();
    const backup = `${file}.bak`;
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    const stored = storeForPersistence(store);
    await fs.copyFile(file, backup);
    try {
      await fs.writeFile(temp, `${JSON.stringify(stored, null, 2)}\n`, "utf8");
      await fs.rename(temp, file);
    } finally {
      try { await fs.unlink(temp); } catch {}
    }
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

async function persistVideoCatalog(videos) {
  if (DATA_MODE === "mariadb") {
    const runtimeLibrary = mergeCatalogIntoLibrary(activeVideoLibrary(), videos);
    const canonical = assertWritableCanonical(canonicalFromRuntime(
      runtimeLibrary,
      activeCanonicalVideoLibrary()
    ));
    canonical.updatedAt = new Date().toISOString();
    await persistMariaDbSnapshot(
      {
        videoCatalog: { schemaVersion: "0.1", videos: structuredClone(videos) },
        videoLibrary: projectCanonicalLibrary(canonical)
      },
      { operation: "video-catalog", canonicalVideoLibrary: canonical }
    );
    return;
  }
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

async function renameWithWindowsRetries(source, target, options = {}) {
  const attempts = Number.isInteger(options.attempts) ? options.attempts : 5;
  const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 40;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fs.rename(source, target);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EBUSY'].includes(error?.code) || attempt === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

async function writeCanonicalVideoLibrary(canonical) {
  const operation = writeQueue.then(async () => {
    const file = safeVideoLibraryFile();
    assertWritableCanonical(canonical);
    const backup = `${file}.bak`;
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fs.copyFile(file, backup);
    try {
      await fs.writeFile(temp, `${JSON.stringify(canonical, null, 2)}\n`, "utf8");
      await renameWithWindowsRetries(temp, file);
      CANONICAL_LIBRARY = canonical;
    } finally {
      try { await fs.unlink(temp); } catch {}
    }
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

async function persistVideoLibrary(library) {
  const canonical = assertWritableCanonical(canonicalFromRuntime(
    library,
    activeCanonicalVideoLibrary()
  ));
  if (DATA_MODE === "mariadb") {
    canonical.updatedAt = new Date().toISOString();
    await persistMariaDbSnapshot(
      { videoLibrary: projectCanonicalLibrary(canonical) },
      { operation: "media-library", canonicalVideoLibrary: canonical }
    );
    return;
  }
  return writeCanonicalVideoLibrary(canonical);
}

async function persistCanonicalLibrary(canonical) {
  const next = assertWritableCanonical(JSON.parse(JSON.stringify(canonical)));
  next.updatedAt = new Date().toISOString();
  if (DATA_MODE === "mariadb") {
    await persistMariaDbSnapshot(
      { videoLibrary: projectCanonicalLibrary(next) },
      { operation: "media-library", canonicalVideoLibrary: next }
    );
    return VIDEO_LIBRARY;
  }
  await writeCanonicalVideoLibrary(next);
  CANONICAL_LIBRARY = next;
  JSON_VIDEO_LIBRARY = projectCanonicalLibrary(next);
  return VIDEO_LIBRARY;
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

function libraryAssetDetails(asset, usage = null) {
  const sources = VIDEO_LIBRARY.sources.filter(source => source.assetId === asset.id);
  const playables = VIDEO_LIBRARY.playables.filter(playable => playable.assetId === asset.id);
  const localCandidates = playables.map(playable => {
    const source = sources.find(item => item.id === playable.sourceId);
    const storageKey = localStorageKeyForPlayable(playable, source);
    if (!storageKey) return null;
    try {
      const file = safeLibraryMediaPath(storageKey, localStorageScopeForPlayable(playable));
      const stat = fsSync.statSync(file);
      return stat.isFile() ? { storageKey, storageScope: localStorageScopeForPlayable(playable), sizeBytes: stat.size } : null;
    } catch { return null; }
  }).filter(Boolean);
  const remoteCandidate = remoteDownloadCandidate(asset.id);
  const activeDownload = [...ACTIVE_LIBRARY_DOWNLOADS.values()].find(job => job.assetId === asset.id && ["preparing", "downloading", "finalizing", "cancelling"].includes(job.status));
  const hasRemoteSource = sources.some(source => ["hls", "direct-url"].includes(source.kind) && ["http", "https", "hls"].includes(source.transport || (source.kind === "hls" ? "hls" : "https")));
  const localCopies = localCandidates.map(candidate => {
    const playable = playables.find(item => localStorageKeyForPlayable(item, sources.find(source => source.id === item.sourceId)) === candidate.storageKey);
    return { ...candidate, playableId: playable?.id || null, sourceId: playable?.sourceId || null, role: explicitRole(playable), isDefault: playable?.id === asset.defaultPlayableId };
  });
  return {
    ...asset,
    sources,
    playables: playables.map(playableForClient),
    deletion: { canDeleteFile: localCandidates.length === 1 && !hasRemoteSource, ...(localCandidates.length === 1 ? localCandidates[0] : {}) },
    localCopies,
    versionsAndAccess: projectAssetAccesses(asset, sources, playables, VIDEO_LIBRARY.treatments || []),
    download: {
      canDownload: Boolean(remoteCandidate) && localCopies.length === 0 && !activeDownload,
      active: Boolean(activeDownload),
      jobId: activeDownload?.id || null,
      sourcePlayableId: remoteCandidate?.playable.id || null,
      sourceKind: remoteCandidate?.playable.kind || null,
      host: remoteCandidate?.host || null,
      proposedFileName: remoteCandidate ? proposedDownloadFileName(asset, remoteCandidate) : null,
      destinationLabel: `Espace de travail de ${asset.title || asset.id}`
    },
    ...(usage ? { usage } : {}),
    folders: VIDEO_LIBRARY.folders || [],
    tags: VIDEO_LIBRARY.tags || []
  };
}

function remoteUrlForDownload(playable, source) {
  const values = playable?.kind === "hls"
    ? [playable.manifestUrl, playable.url, source?.manifestUrl, source?.originUrl, source?.sourceUrl, source?.url]
    : [playable?.url, playable?.originUrl, source?.url, source?.sourceUrl, source?.originUrl];
  for (const value of values) {
    try {
      const url = new URL(value);
      if (["http:", "https:"].includes(url.protocol)) return url;
    } catch {}
  }
  return null;
}

function remoteDownloadCandidate(assetId, playableId = null) {
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
  if (!asset) return null;
  const playables = VIDEO_LIBRARY.playables.filter(item => item.assetId === assetId && ["hls", "direct-url"].includes(item.kind));
  const playable = playableId ? playables.find(item => item.id === playableId) : playables.find(item => item.id === asset.defaultPlayableId) || playables[0];
  if (!playable) return null;
  const source = VIDEO_LIBRARY.sources.find(item => item.id === playable.sourceId && item.assetId === assetId);
  const url = remoteUrlForDownload(playable, source);
  return url ? { asset, playable, source, url, host: url.hostname } : null;
}

function proposedDownloadFileName(asset, candidate) {
  const fallback = candidate.playable.kind === "hls" ? "video-hls" : path.parse(candidate.url.pathname).name || "video";
  const base = String(asset.title || fallback).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._ -]+/g, "-").replace(/\s+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140) || fallback;
  const remoteExtension = path.extname(candidate.url.pathname).toLowerCase();
  return `${base}${candidate.playable.kind === "direct-url" && remoteExtension === ".webm" ? ".webm" : ".mp4"}`;
}

function remoteHlsManifestUrl(playable, source = null) {
  if (playable?.kind !== "hls") return null;
  const values = [
    playable.manifestUrl, playable.url, playable.originUrl, playable.sourceUrl,
    source?.manifestUrl, source?.originUrl, source?.sourceUrl, source?.url,
    source?.origin?.manifestUrl, source?.origin?.originUrl
  ];
  for (const value of values) {
    try {
      const url = new URL(value);
      if (["http:", "https:"].includes(url.protocol)) return url;
    } catch {}
  }
  return null;
}

function remoteHlsGatewayUrl(playable) {
  const manifest = remoteHlsManifestUrl(playable);
  if (!manifest) return null;
  const fileName = path.posix.basename(manifest.pathname) || "manifest.m3u8";
  return `${REMOTE_HLS_GATEWAY_PREFIX}${encodeURIComponent(playable.id)}/${encodeURIComponent(fileName)}`;
}

function playableForClient(playable) {
  const gatewayUrl = remoteHlsGatewayUrl(playable);
  if (!gatewayUrl) return playable;
  return {
    ...playable,
    originUrl: playable.originUrl || playable.manifestUrl || playable.url,
    url: gatewayUrl,
    manifestUrl: gatewayUrl
  };
}

function libraryName(value, fallback) {
  const name = typeof value === "string" ? value.trim().slice(0, 200) : "";
  if (!name) throw new Error(fallback);
  return name;
}

function normalizedLibraryName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function libraryMutationCopy() {
  return JSON.parse(JSON.stringify(VIDEO_LIBRARY));
}

function localStorageKeyForPlayable(playable, source) {
  return playable?.location?.storageKey || playable?.storageKey || source?.location?.storageKey || source?.storageKey || null;
}

function localStorageScopeForPlayable(playable) {
  return playable?.location?.storageScope || playable?.storageScope || "legacy-media";
}

function activityDependencyRelations(activity, assetId, sourceIds, playableIds, playables, sources) {
  const ref = activity?.videoRef || {};
  const relations = [];
  if (ref.assetId === assetId) relations.push("asset");
  if (playableIds.has(ref.playableId)) relations.push("playable");
  return [...new Set(relations)];
}

function libraryAssetDeletionPlan(assetId, activities) {
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
  if (!asset) throw new Error("Asset vidéo introuvable.");
  const sources = (VIDEO_LIBRARY.sources || []).filter(source => source.assetId === assetId || (asset.sourceIds || []).includes(source.id));
  const playables = (VIDEO_LIBRARY.playables || []).filter(playable => playable.assetId === assetId || (asset.playableIds || []).includes(playable.id));
  const sourceIds = new Set(sources.map(source => source.id));
  const playableIds = new Set(playables.map(playable => playable.id));
  const activityDependenciesById = new Map();
  (activities || []).forEach((activity, index) => {
    const relations = activityDependencyRelations(activity, assetId, sourceIds, playableIds, playables, sources);
    if (!relations.length) return;
    const id = typeof activity?.id === "string" && activity.id.trim() ? activity.id.trim() : `activite-inconnue-${index + 1}`;
    const title = typeof activity?.title === "string" && activity.title.trim() ? activity.title.trim() : "Activité sans titre";
    const existing = activityDependenciesById.get(id);
    if (existing) {
      existing.relations = [...new Set([...existing.relations, ...relations])];
      if (existing.title === "Activité sans titre" && title !== existing.title) existing.title = title;
    } else {
      activityDependenciesById.set(id, { id, title, relations });
    }
  });
  const activityDependencies = [...activityDependenciesById.values()];
  const derivationDependencies = (VIDEO_LIBRARY.assets || []).filter(other => other.id !== assetId && (other.parentAssetId === assetId || other.provenance?.parentAssetId === assetId || other.provenance?.historical?.sourceAssetId === assetId)).map(other => ({ id: other.id, title: other.title || other.id }));
  const treatmentDependencies = (VIDEO_LIBRARY.treatments || []).filter(treatment => treatment.assetId === assetId || playableIds.has(treatment.playableId) || sourceIds.has(treatment.sourceId)).map(treatment => ({ id: treatment.id, status: treatment.status || null }));
  const localFiles = playables.map(playable => {
    const source = sources.find(item => item.id === playable.sourceId);
    const storageKey = localStorageKeyForPlayable(playable, source);
    if (!storageKey) return null;
    let file;
    try { file = safeLibraryMediaPath(storageKey); } catch { return { storageKey, invalid: true }; }
    return { storageKey, file, playableId: playable.id };
  }).filter(Boolean);
  const localStorageKeys = new Set(localFiles.map(item => item.storageKey));
  const sharedObjects = (VIDEO_LIBRARY.assets || []).filter(other => other.id !== assetId && ((other.sourceIds || []).some(id => sourceIds.has(id)) || (other.playableIds || []).some(id => playableIds.has(id)) || (VIDEO_LIBRARY.playables || []).filter(playable => playable.assetId === other.id).some(playable => localStorageKeys.has(localStorageKeyForPlayable(playable, (VIDEO_LIBRARY.sources || []).find(source => source.id === playable.sourceId)))))).map(other => ({ id: other.id, title: other.title || other.id }));
  return { asset, sources, playables, activityDependencies, derivationDependencies, treatmentDependencies, sharedObjects, localFiles };
}

function deletionConflict(plan, physical) {
  const conflicts = [];
  if (plan.activityDependencies.length) conflicts.push({ type: "activities", items: plan.activityDependencies });
  if (plan.derivationDependencies.length) conflicts.push({ type: "derivations", items: plan.derivationDependencies });
  if (plan.treatmentDependencies.length) conflicts.push({ type: "treatments", items: plan.treatmentDependencies });
  if (physical && plan.sharedObjects.length) conflicts.push({ type: "shared-references", items: plan.sharedObjects });
  return conflicts;
}

function libraryUsageSummary(plan) {
  const catalogConflicts = deletionConflict(plan, false);
  const physicalConflicts = deletionConflict(plan, true);
  return {
    whetherUsed: physicalConflicts.length > 0,
    activityCount: plan.activityDependencies.length,
    activities: plan.activityDependencies,
    otherDependencies: {
      derivations: plan.derivationDependencies,
      treatments: plan.treatmentDependencies,
      sharedReferences: plan.sharedObjects
    },
    blocking: {
      catalogRemoval: catalogConflicts.length > 0,
      physicalDeletion: physicalConflicts.length > 0
    }
  };
}

async function removeLibraryAsset(assetId, { physical = false } = {}) {
  const activities = (await readActivities()).activities || [];
  const plan = libraryAssetDeletionPlan(assetId, activities);
  const conflicts = deletionConflict(plan, physical);
  if (conflicts.length) {
    const error = new Error("La vidéo est encore utilisée par des activités ou des ressources dépendantes.");
    error.statusCode = 409;
    error.conflicts = conflicts;
    throw error;
  }
  let physicalFile = null;
  if (physical) {
    if (plan.localFiles.length !== 1 || plan.localFiles[0].invalid) {
      const error = new Error("Le fichier local référencé est absent, ambigu ou invalide.");
      error.statusCode = 409;
      throw error;
    }
    physicalFile = plan.localFiles[0];
    const stat = await fs.stat(physicalFile.file).catch(() => null);
    if (!stat || !stat.isFile()) {
      const error = new Error("Le fichier local référencé est introuvable ou n’est pas un fichier.");
      error.statusCode = 409;
      throw error;
    }
  }
  const nextLibrary = libraryMutationCopy();
  nextLibrary.assets = nextLibrary.assets.filter(item => item.id !== assetId);
  nextLibrary.sources = nextLibrary.sources.filter(source => !plan.sources.some(item => item.id === source.id));
  nextLibrary.playables = nextLibrary.playables.filter(playable => !plan.playables.some(item => item.id === playable.id));
  let transactionBackup = null;
  try {
    if (physicalFile) {
      transactionBackup = path.join(os.tmpdir(), `proto05-library-delete-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.bak`);
      await fs.copyFile(physicalFile.file, transactionBackup);
      await fs.unlink(physicalFile.file);
    }
    await persistLibraryMutation(nextLibrary);
    return { assetId, removedFromLibrary: true, deletedFile: Boolean(physicalFile), storageKey: physicalFile?.storageKey || null };
  } catch (error) {
    if (physicalFile && transactionBackup) {
      try { await fs.copyFile(transactionBackup, physicalFile.file); } catch (restoreError) { error.message += ` Restauration du fichier impossible : ${restoreError.message}`; }
    }
    throw error;
  } finally {
    if (transactionBackup) { try { await fs.unlink(transactionBackup); } catch {} }
  }
}

function localCopyConflicts(assetId, playableId, activities) {
  const playable = VIDEO_LIBRARY.playables.find(item => item.id === playableId && item.assetId === assetId && item.kind === "local-file");
  if (!playable) throw Object.assign(new Error("Copie locale introuvable."), { statusCode: 404 });
  const source = VIDEO_LIBRARY.sources.find(item => item.id === playable.sourceId && item.assetId === assetId);
  const storageKey = localStorageKeyForPlayable(playable, source);
  if (!storageKey) throw Object.assign(new Error("La copie locale ne possède pas de fichier géré valide."), { statusCode: 409 });
  const activityDependencies = (activities || []).filter(activity => {
    const ref = activity?.videoRef || {};
    return ref.playableId === playableId || (ref.assetId === assetId && !ref.playableId);
  }).map(activity => ({ id: activity.id, title: activity.title || "Activité sans titre" }));
  const sharedReferences = VIDEO_LIBRARY.playables.filter(item => item.id !== playableId && localStorageKeyForPlayable(item, VIDEO_LIBRARY.sources.find(sourceItem => sourceItem.id === item.sourceId)) === storageKey).map(item => {
    const asset = VIDEO_LIBRARY.assets.find(candidate => candidate.id === item.assetId);
    return { id: item.id, title: asset?.title || item.id };
  });
  return { playable, source, storageKey, activityDependencies, sharedReferences };
}

async function removeLocalLibraryCopy(assetId, playableId) {
  const store = await readActivities();
  const plan = localCopyConflicts(assetId, playableId, store.activities || []);
  const conflicts = [];
  if (plan.activityDependencies.length) conflicts.push({ type: "activities", items: plan.activityDependencies });
  if (plan.sharedReferences.length) conflicts.push({ type: "shared-references", items: plan.sharedReferences });
  if (hasActiveDerivation(VIDEO_LIBRARY.treatments || [], assetId, playableId)) conflicts.push({ type: "active-derivations", items: [{ id: playableId }] });
  if (conflicts.length) throw Object.assign(new Error("La copie locale est encore utilisée ou partage son fichier avec une autre référence."), { statusCode: 409, conflicts });
  const file = safeLibraryMediaPath(plan.storageKey, localStorageScopeForPlayable(plan.playable));
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) throw Object.assign(new Error("Le fichier de la copie locale est introuvable."), { statusCode: 409 });
  const backup = path.join(os.tmpdir(), `proto05-local-copy-${process.pid}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}.bak`);
  await fs.copyFile(file, backup);
  try {
    await fs.unlink(file);
    const canonical = JSON.parse(JSON.stringify(activeCanonicalVideoLibrary()));
    const asset = canonical.assets.find(item => item.id === assetId);
    if (!asset) throw new Error("Asset vidéo introuvable.");
    canonical.playables = canonical.playables.filter(item => item.id !== playableId);
    if (!canonical.playables.some(item => item.sourceId === plan.source?.id)) canonical.sources = canonical.sources.filter(item => item.id !== plan.source?.id);
    if (asset.defaultPlayableId === playableId) asset.defaultPlayableId = canonical.playables.find(item => item.assetId === assetId)?.id || null;
    asset.updatedAt = new Date().toISOString();
    await persistCanonicalLibrary(canonical);
    const projectedAsset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
    return { assetId, playableId, deletedFile: true, storageKey: plan.storageKey, asset: libraryAssetDetails(projectedAsset) };
  } catch (error) {
    try { await fs.copyFile(backup, file); } catch (restoreError) { error.message += ` Restauration du fichier impossible : ${restoreError.message}`; }
    throw error;
  } finally {
    try { await fs.unlink(backup); } catch {}
  }
}

async function removeLibraryDerivation(assetId, derivationId) {
  const treatment = activeCanonicalVideoLibrary().treatments.find(item => item.id === derivationId && item.sourceAssetId === assetId);
  if (!treatment) throw Object.assign(new Error("Tentative de dérivation introuvable."), { statusCode: 404 });
  if (["queued", "running", "cancelling"].includes(treatment.status)) throw Object.assign(new Error("Une dérivation active ne peut pas être supprimée."), { statusCode: 409 });
  if (treatment.publishedPlayableId) throw Object.assign(new Error("Cette dérivation est reliée à une version publiée."), { statusCode: 409 });
  const playable = activeCanonicalVideoLibrary().playables.find(item => item.id === treatment.outputPlayableId && item.assetId === assetId);
  const expectedPrefix = `${assetId}/derived/${derivationId}/`;
  const storageKey = playable?.location?.storageKey || null;
  if (storageKey && (playable.location?.storageScope !== "workspace" || !storageKey.startsWith(expectedPrefix))) throw Object.assign(new Error("Le fichier de dérivation n’appartient pas à son espace de travail."), { statusCode: 409 });
  const file = storageKey ? safeLibraryMediaPath(storageKey, "workspace") : null;
  const stat = file ? await fs.stat(file).catch(() => null) : null;
  const backup = stat?.isFile() ? path.join(os.tmpdir(), `proto05-derivation-${process.pid}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}.bak`) : null;
  const canonical = JSON.parse(JSON.stringify(activeCanonicalVideoLibrary()));
  canonical.treatments = canonical.treatments.filter(item => item.id !== derivationId);
  if (playable) {
    canonical.playables = canonical.playables.filter(item => item.id !== playable.id);
    if (!canonical.playables.some(item => item.sourceId === playable.sourceId)) canonical.sources = canonical.sources.filter(item => item.id !== playable.sourceId);
  }
  const asset = canonical.assets.find(item => item.id === assetId);
  if (asset?.defaultPlayableId === playable?.id) asset.defaultPlayableId = canonical.playables.find(item => item.assetId === assetId && !["working-copy", "derivation-local"].includes(item.role))?.id || null;
  if (asset) asset.updatedAt = new Date().toISOString();
  assertWritableCanonical(canonical);
  if (backup) await fs.copyFile(file, backup);
  try {
    if (file && stat?.isFile()) await fs.unlink(file);
    await persistCanonicalLibrary(canonical);
    if (file) await fs.rm(path.dirname(file), { recursive: false }).catch(() => {});
    return { assetId, derivationId, deletedFile: Boolean(stat?.isFile()) };
  } catch (error) {
    if (backup && file) try { await fs.copyFile(backup, file); } catch (restoreError) { error.message += ` Restauration impossible : ${restoreError.message}`; }
    throw error;
  } finally {
    if (backup) try { await fs.unlink(backup); } catch {}
  }
}

async function assignLibraryAccessRole(assetId, playableId, role) {
  if (!["original-remote", "working-copy", "derivation-local", "published-remote"].includes(role)) throw new Error("Rôle métier invalide.");
  const canonical = JSON.parse(JSON.stringify(activeCanonicalVideoLibrary()));
  const playable = canonical.playables.find(item => item.id === playableId && item.assetId === assetId);
  const source = canonical.sources.find(item => item.id === playable?.sourceId && item.assetId === assetId);
  if (!playable || !source) throw Object.assign(new Error("Accès vidéo introuvable."), { statusCode: 404 });
  const localRole = ["working-copy", "derivation-local"].includes(role);
  if (localRole !== (playable.kind === "local-file")) throw new Error("Ce rôle est incompatible avec le type de playable.");
  if (playable.role === role && source.role === role) return { assetId, playableId, sourceId: source.id, role };
  playable.role = role;
  source.role = role;
  playable.updatedAt = new Date().toISOString();
  const asset = canonical.assets.find(item => item.id === assetId);
  if (asset) asset.updatedAt = playable.updatedAt;
  await persistCanonicalLibrary(canonical);
  return { assetId, playableId, sourceId: source.id, role };
}

async function persistLibraryMutation(nextLibrary) {
  nextLibrary.updatedAt = new Date().toISOString();
  validateLibraryShape(nextLibrary);
  await persistVideoLibrary(nextLibrary);
  JSON_VIDEO_LIBRARY = nextLibrary;
}

function libraryFolderFromInput(payload) {
  const name = libraryName(payload?.name, "Le nom du dossier est obligatoire.");
  if ((VIDEO_LIBRARY.folders || []).some(folder => folder.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0)) throw new Error("Ce dossier existe déjà.");
  const id = `folder-proto05-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  return { id, name, parentFolderId: null, sortOrder: VIDEO_LIBRARY.folders?.length || 0, createdAt: now, updatedAt: now };
}

function libraryTagFromInput(payload) {
  const name = libraryName(payload?.name, "Le nom du tag est obligatoire.");
  const normalizedName = normalizedLibraryName(name);
  if (!normalizedName) throw new Error("Le nom du tag est invalide.");
  if ((VIDEO_LIBRARY.tags || []).some(tag => tag.normalizedName === normalizedName)) throw new Error("Ce tag existe déjà.");
  const id = `tag-proto05-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  return { id, name, normalizedName, createdAt: now, updatedAt: now };
}

function classificationFromInput(assetId, payload) {
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
  if (!asset) throw new Error("Asset vidéo introuvable.");
  const folderId = payload && Object.prototype.hasOwnProperty.call(payload, "folderId") ? payload.folderId : asset.folderId || null;
  if (folderId !== null && !(VIDEO_LIBRARY.folders || []).some(folder => folder.id === folderId)) throw new Error("Dossier introuvable.");
  const tagIds = Array.isArray(payload?.tagIds) ? [...new Set(payload.tagIds)] : (Array.isArray(asset.tagIds) ? [...asset.tagIds] : []);
  if (tagIds.some(tagId => !(VIDEO_LIBRARY.tags || []).some(tag => tag.id === tagId))) throw new Error("Tag introuvable.");
  return { folderId, tagIds };
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
  try { validateLibraryShape(nextLibrary); await persistVideoLibrary(nextLibrary); JSON_VIDEO_LIBRARY = nextLibrary; }
  catch (error) { try { await fs.unlink(targetPath); } catch {}; throw error; }
  return { duplicate: false, asset: libraryAssetDetails(asset), assetId, playableId };
}

function isPrivateAddress(address) {
  const value = String(address || "").toLowerCase().split("%", 1)[0];
  if (net.isIPv4(value)) {
    const [a, b, c] = value.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 0 && c === 0)
      || (a === 192 && b === 0 && c === 2)
      || (a === 192 && b === 88 && c === 99)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || (a === 198 && b === 51 && c === 100)
      || (a === 203 && b === 0 && c === 113);
  }
  if (!net.isIPv6(value)) return true;
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice(7);
    if (net.isIPv4(mapped)) return isPrivateAddress(mapped);
    const parts = mapped.split(":");
    if (parts.length === 2 && parts.every(part => /^[0-9a-f]{1,4}$/.test(part))) {
      const high = Number.parseInt(parts[0], 16);
      const low = Number.parseInt(parts[1], 16);
      return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return true;
  }
  const [first = "", second = ""] = value.split(":");
  const secondValue = Number.parseInt(second || "0", 16);
  return value === "::" || value === "::1"
    || value.startsWith("fc") || value.startsWith("fd")
    || /^fe[89ab]/.test(value)
    || value.startsWith("ff")
    || value.startsWith("64:ff9b:")
    || value.startsWith("100:")
    || value.startsWith("2002:")
    || (first === "2001" && (secondValue <= 0x01ff || secondValue === 0x0db8));
}

async function validateRemoteCopyUrl(value, options = {}) {
  let current;
  try { current = new URL(String(value || "")); } catch { throw new Error("L’URL directe est invalide."); }
  if (!["http:", "https:"].includes(current.protocol)) throw new Error("L’URL directe doit utiliser HTTP ou HTTPS.");
  if (current.username || current.password) throw new Error("L’URL ne doit pas contenir d’identifiants.");
  if (!options.allowHls && /\.m3u8$/i.test(current.pathname)) throw new Error("L’URL doit désigner un média direct, pas un manifeste HLS.");
  const hostname = current.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("L’URL ne doit pas viser une adresse privée ou interne.");
  let addresses;
  try { addresses = await dns.lookup(hostname, { all: true }); }
  catch { throw new Error("Le domaine distant est introuvable."); }
  const testAllowedHosts = new Set(String(process.env.PROTO05_TEST_ALLOWED_REMOTE_HOSTS || "").split(",").map(item => item.trim()).filter(Boolean));
  const allowPrivateForTest = process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE === "1" || testAllowedHosts.has(hostname);
  if (!addresses.length || (!allowPrivateForTest && addresses.some(item => isPrivateAddress(item.address)))) throw new Error("L’URL ne doit pas viser une adresse privée ou interne.");
  return current;
}

function remoteReferenceDuplicate(originalUrl, finalUrl) {
  const candidates = new Set([originalUrl, finalUrl]);
  const source = VIDEO_LIBRARY.sources.find(item => [
    item.url, item.originUrl, item.sourceUrl, item.manifestUrl,
    item.origin?.url, item.origin?.originUrl, item.origin?.sourceUrl, item.origin?.manifestUrl
  ].filter(Boolean).some(value => candidates.has(value)));
  if (!source) return null;
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === source.assetId);
  const playable = VIDEO_LIBRARY.playables.find(item => item.sourceId === source.id);
  return asset && playable ? { asset, playable } : null;
}

async function remoteReferenceFetch(startUrl, method, signal) {
  let current = await validateRemoteCopyUrl(startUrl, { allowHls: true });
  const redirects = [];
  for (let hop = 0; hop <= 5; hop += 1) {
    let response;
    try {
      response = await fetch(current, {
        method,
        redirect: "manual",
        signal,
        headers: method === "GET" ? { range: `bytes=0-${REMOTE_REFERENCE_MAX_BYTES}` } : undefined
      });
    } catch (error) {
      if (signal.aborted) throw new Error("L’analyse distante a dépassé le délai maximal.");
      throw new Error(`La ressource distante est inaccessible : ${error.message}`);
    }
    if (response.status < 300 || response.status >= 400) return { response, finalUrl: current, redirects };
    if (hop === 5) throw new Error("La ressource distante comporte trop de redirections.");
    const location = response.headers.get("location");
    if (!location) throw new Error("La ressource distante renvoie une redirection sans destination.");
    current = await validateRemoteCopyUrl(new URL(location, current), { allowHls: true });
    redirects.push(current.toString());
  }
  throw new Error("La ressource distante comporte trop de redirections.");
}

async function boundedRemoteText(response) {
  if (!response.body) throw new Error("La ressource distante est vide.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > REMOTE_REFERENCE_MAX_BYTES) throw new Error("La réponse distante dépasse la limite d’analyse.");
      chunks.push(Buffer.from(value));
    }
  } finally {
    try { await reader.cancel(); } catch {}
  }
  if (!size) throw new Error("La ressource distante est vide.");
  return Buffer.concat(chunks).toString("utf8");
}

function hlsReferenceType(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!normalized.startsWith("#EXTM3U")) return null;
  if (/#EXT-X-STREAM-INF\s*:/i.test(normalized)) return "master";
  if (/#EXTINF\s*:/i.test(normalized) || /#EXT-X-TARGETDURATION\s*:/i.test(normalized)) return "media";
  return "invalid";
}

async function analyzeRemoteLibraryReference(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  const original = await validateRemoteCopyUrl(payload.url, { allowHls: true });
  const title = typeof payload.title === "string" ? payload.title.trim().slice(0, 500) : "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_REFERENCE_TIMEOUT_MS);
  try {
    let result = await remoteReferenceFetch(original, "HEAD", controller.signal);
    if ([405, 501].includes(result.response.status)) result = await remoteReferenceFetch(original, "GET", controller.signal);
    if (!result.response.ok) {
      if ([401, 403].includes(result.response.status)) throw new Error("La ressource distante exige une authentification ou refuse l’accès.");
      throw new Error(`Réponse HTTP distante invalide : ${result.response.status}.`);
    }
    let contentType = (result.response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    const directMime = contentType.startsWith("video/");
    let kind = result.response.body === null && directMime ? "direct-url" : null;
    let playlistType = null;
    if (!kind) {
      if (result.response.body === null || result.response.bodyUsed) result = await remoteReferenceFetch(result.finalUrl, "GET", controller.signal);
      if (!result.response.ok) throw new Error(`Réponse HTTP distante invalide : ${result.response.status}.`);
      contentType = (result.response.headers.get("content-type") || contentType).split(";", 1)[0].trim().toLowerCase();
      if (contentType.startsWith("text/html")) throw new Error("La ressource distante est une page HTML, pas une vidéo.");
      if (contentType.startsWith("video/")) {
        kind = "direct-url";
        try { await result.response.body?.cancel(); } catch {}
      } else {
        playlistType = hlsReferenceType(await boundedRemoteText(result.response));
        if (!playlistType || playlistType === "invalid") throw new Error("La ressource distante n’est ni une vidéo directe ni un manifeste HLS valide.");
        kind = "hls";
        if (!contentType || contentType === "application/octet-stream" || contentType.startsWith("text/")) contentType = "application/vnd.apple.mpegurl";
      }
    }
    const originalUrl = original.toString();
    const finalUrl = result.finalUrl.toString();
    const duplicate = remoteReferenceDuplicate(originalUrl, finalUrl);
    const token = crypto.randomBytes(24).toString("base64url");
    const analysis = {
      token, title, originalUrl, finalUrl, redirects: result.redirects,
      kind, playlistType, contentType: contentType || (kind === "hls" ? "application/vnd.apple.mpegurl" : "video/*"),
      domain: result.finalUrl.hostname, analyzedAt: new Date().toISOString(),
      expiresAt: Date.now() + REMOTE_REFERENCE_TOKEN_TTL_MS
    };
    REMOTE_REFERENCE_ANALYSES.set(token, analysis);
    for (const [key, value] of REMOTE_REFERENCE_ANALYSES) if (value.expiresAt <= Date.now()) REMOTE_REFERENCE_ANALYSES.delete(key);
    return {
      token,
      summary: {
        kind, playlistType, contentType: analysis.contentType, domain: analysis.domain,
        originalUrl, finalUrl, redirects: analysis.redirects,
        warning: "Référence distante : aucun fichier n’est copié. La lecture dépendra de cette URL.",
        duplicate: duplicate ? { assetId: duplicate.asset.id, title: duplicate.asset.title } : null
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function confirmRemoteLibraryReference(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  const token = typeof payload.token === "string" ? payload.token : "";
  const analysis = REMOTE_REFERENCE_ANALYSES.get(token);
  if (!analysis || analysis.expiresAt <= Date.now()) {
    REMOTE_REFERENCE_ANALYSES.delete(token);
    const error = new Error("Cette analyse a expiré. Analysez de nouveau l’URL.");
    error.statusCode = 409;
    throw error;
  }
  if (analysis.confirming) {
    const error = new Error("Cette référence est déjà en cours d’ajout.");
    error.statusCode = 409;
    throw error;
  }
  analysis.confirming = true;
  const duplicate = remoteReferenceDuplicate(analysis.originalUrl, analysis.finalUrl);
  if (duplicate) {
    REMOTE_REFERENCE_ANALYSES.delete(token);
    return { duplicate: true, asset: libraryAssetDetails(duplicate.asset), assetId: duplicate.asset.id, playableId: duplicate.playable.id };
  }
  const createdAt = new Date().toISOString();
  const identity = crypto.createHash("sha256").update(`${analysis.kind}\n${analysis.finalUrl}`).digest("hex").slice(0, 24);
  const assetId = `media-proto05-remote-ref-${identity}`;
  const sourceId = `source-${assetId}`;
  const playableId = `video-${assetId}`;
  const fallbackTitle = (() => {
    try { return decodeURIComponent(path.basename(new URL(analysis.finalUrl).pathname)) || analysis.domain; }
    catch { return analysis.domain; }
  })();
  const title = analysis.title || fallbackTitle || "Référence vidéo distante";
  const provenance = { kind: "remote-reference", importedAt: createdAt };
  const targetAssetId = typeof payload.assetId === "string" ? payload.assetId : "";
  if (targetAssetId) {
    const canonical = JSON.parse(JSON.stringify(activeCanonicalVideoLibrary()));
    const targetAsset = canonical.assets.find(item => item.id === targetAssetId);
    if (!targetAsset) throw Object.assign(new Error("La fiche Library cible est introuvable."), { statusCode: 404 });
    const publishedIdentity = crypto.createHash("sha256").update(`${targetAssetId}\n${analysis.kind}\n${analysis.finalUrl}`).digest("hex").slice(0, 24);
    const publishedSourceId = `source-${targetAssetId}-published-${publishedIdentity}`;
    const publishedPlayableId = `video-${targetAssetId}-published-${publishedIdentity}`;
    const derivationId = typeof payload.derivationId === "string" && payload.derivationId ? payload.derivationId : null;
    const treatment = derivationId ? canonical.treatments.find(item => item.id === derivationId && item.sourceAssetId === targetAssetId) : null;
    if (derivationId && !treatment) throw new Error("La dérivation reliée est introuvable sur cette fiche.");
    const publicationProvenance = { ...provenance, kind: "published-remote-reference", derivationId };
    canonical.sources.push({
      id: publishedSourceId, assetId: targetAssetId, kind: analysis.kind, provider: "direct", role: "published-remote",
      origin: { originUrl: analysis.originalUrl, sourceUrl: analysis.originalUrl, url: analysis.finalUrl, ...(analysis.kind === "hls" ? { manifestUrl: analysis.finalUrl } : {}) },
      transport: analysis.kind === "hls" ? "hls" : new URL(analysis.finalUrl).protocol.replace(":", ""),
      mimeType: analysis.contentType, provenance: publicationProvenance, createdAt
    });
    canonical.playables.push({
      id: publishedPlayableId, assetId: targetAssetId, sourceId: publishedSourceId,
      kind: analysis.kind, provider: "direct", role: "published-remote",
      availability: "unknown", availabilityReason: null,
      location: { url: analysis.finalUrl, ...(analysis.kind === "hls" ? { manifestUrl: analysis.finalUrl } : {}) },
      technicalMetadata: { durationMs: null, width: null, height: null, frameRate: null, videoCodec: null, audioCodec: null, hasAudio: null, mimeType: analysis.contentType, sizeBytes: null, sha256: null, analyzedAt: analysis.analyzedAt, analyzer: null, analyzerVersion: null, error: null },
      provenance: publicationProvenance, createdAt, updatedAt: createdAt
    });
    if (treatment) treatment.publishedPlayableId = publishedPlayableId;
    targetAsset.updatedAt = createdAt;
    await persistCanonicalLibrary(canonical);
    REMOTE_REFERENCE_ANALYSES.delete(token);
    const projectedAsset = VIDEO_LIBRARY.assets.find(item => item.id === targetAssetId);
    return { duplicate: false, asset: libraryAssetDetails(projectedAsset), assetId: targetAssetId, playableId: publishedPlayableId, sourceId: publishedSourceId, role: "published-remote" };
  }
  const source = {
    id: sourceId, assetId, title, kind: analysis.kind, provider: "direct", role: "original-remote",
    originUrl: analysis.originalUrl, sourceUrl: analysis.originalUrl, url: analysis.finalUrl,
    ...(analysis.kind === "hls" ? { manifestUrl: analysis.finalUrl } : {}),
    mimeType: analysis.contentType, durationMs: null, authorized: true, availability: "unknown", provenance
  };
  const playable = {
    id: playableId, assetId, sourceId, kind: analysis.kind, provider: "direct", role: "original-remote",
    status: "pending", availability: "unknown", durationMs: null, mimeType: analysis.contentType,
    url: analysis.finalUrl, ...(analysis.kind === "hls" ? { manifestUrl: analysis.finalUrl } : {}),
    originUrl: analysis.originalUrl, provenance
  };
  const asset = {
    id: assetId, title, status: "active", sourceIds: [sourceId], playableIds: [playableId],
    defaultPlayableId: playableId, provenance,
    metadata: { originalUrl: analysis.originalUrl, finalUrl: analysis.finalUrl, mimeType: analysis.contentType, durationMs: null, analyzedAt: analysis.analyzedAt },
    rights: {}
  };
  const nextLibrary = libraryMutationCopy();
  nextLibrary.assets.push(asset);
  nextLibrary.sources.push(source);
  nextLibrary.playables.push(playable);
  try {
    await persistLibraryMutation(nextLibrary);
    REMOTE_REFERENCE_ANALYSES.delete(token);
    return { duplicate: false, asset: libraryAssetDetails(asset), assetId, playableId };
  } catch (error) {
    analysis.confirming = false;
    error.statusCode = 500;
    throw error;
  }
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
    try { validateLibraryShape(nextLibrary); await persistVideoLibrary(nextLibrary); JSON_VIDEO_LIBRARY = nextLibrary; }
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
  const configured = RUNTIME_FFMPEG_PATH || process.env.PROTO05_FFMPEG_PATH || process.env.FFMPEG_PATH;
  if (configured) {
    if (!fsSync.existsSync(configured)) throw new Error("FFmpeg configuré mais inaccessible.");
    return configured;
  }
  return "ffmpeg";
}

function libraryDownloadProgram(candidate, { probe = false } = {}) {
  const testScript = process.env.PROTO05_TEST_FFMPEG_SCRIPT;
  if (testScript) return { executable: process.execPath, prefixArgs: [testScript, probe ? "--ffprobe" : "--ffmpeg"] };
  if (probe) {
    if (/ffmpeg(?:\.exe)?$/i.test(candidate)) return { executable: candidate.replace(/ffmpeg(?:\.exe)?$/i, process.platform === "win32" ? "ffprobe.exe" : "ffprobe"), prefixArgs: [] };
    return { executable: "ffprobe", prefixArgs: [] };
  }
  return { executable: candidate, prefixArgs: [] };
}

function validateConfiguredFfmpegPath(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Le chemin de ffmpeg.exe est obligatoire.");
  const candidate = value.trim();
  if (!path.isAbsolute(candidate) || !/^ffmpeg(?:\.exe)?$/i.test(path.basename(candidate))) throw new Error("Sélectionnez uniquement le fichier ffmpeg.exe.");
  if (!fsSync.existsSync(candidate) || !fsSync.statSync(candidate).isFile()) throw new Error("Le fichier ffmpeg.exe est introuvable.");
  return candidate;
}

function inspectFfmpegCandidate(candidate, source) {
  const program = libraryDownloadProgram(candidate);
  const checked = spawnSync(program.executable, [...program.prefixArgs, "-version"], { encoding: "utf8", timeout: 4000, windowsHide: true, shell: false });
  if (checked.error || checked.status !== 0 || !/^ffmpeg version /i.test(String(checked.stdout || ""))) {
    return { available: false, source, error: "FFmpeg est absent ou invalide. Configurez le chemin exact de ffmpeg.exe." };
  }
  const version = String(checked.stdout).split(/\r?\n/, 1)[0].replace(/^ffmpeg version\s+/i, "").slice(0, 160);
  const probe = libraryDownloadProgram(candidate, { probe: true });
  const probeCheck = spawnSync(probe.executable, [...probe.prefixArgs, "-version"], { encoding: "utf8", timeout: 4000, windowsHide: true, shell: false });
  if (probeCheck.error || probeCheck.status !== 0) return { available: false, source, error: "FFprobe associé à FFmpeg est absent ou invalide." };
  return { available: true, source, version, candidate, program, probe };
}

function detectLibraryFfmpeg() {
  if (process.env.PROTO05_TEST_FFMPEG_SCRIPT) return inspectFfmpegCandidate(process.execPath, "fixture contrôlée");
  const configured = RUNTIME_FFMPEG_PATH || process.env.PROTO05_FFMPEG_PATH || process.env.FFMPEG_PATH;
  if (configured) {
    try { return inspectFfmpegCandidate(validateConfiguredFfmpegPath(configured), RUNTIME_FFMPEG_PATH ? "configuration temporaire" : "configuration Proto05"); }
    catch (error) { return { available: false, source: "configuration Proto05", error: error.message }; }
  }
  if (process.env.PROTO05_TEST_DISABLE_PATH_FFMPEG === "1") return { available: false, source: "PATH", error: "FFmpeg est introuvable dans la configuration Proto05 et dans PATH." };
  return inspectFfmpegCandidate("ffmpeg", "PATH");
}

function publicFfmpegStatus(status = detectLibraryFfmpeg()) {
  return { available: status.available, source: status.source, version: status.version || null, error: status.error || null, configurable: true };
}

function configureLibraryFfmpeg(value) {
  const candidate = validateConfiguredFfmpegPath(value);
  const status = inspectFfmpegCandidate(candidate, "configuration temporaire");
  if (!status.available) throw new Error(status.error);
  RUNTIME_FFMPEG_PATH = candidate;
  return status;
}

function safeDownloadFileName(value, candidate) {
  const expectedExtension = candidate.playable.kind === "direct-url" && path.extname(candidate.url.pathname).toLowerCase() === ".webm" ? ".webm" : ".mp4";
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw !== path.basename(raw) || raw.includes("\\") || /[\u0000-\u001f<>:"/|?*]/.test(raw) || raw.length > 180) throw new Error("Le nom de sortie est invalide.");
  if (path.extname(raw).toLowerCase() !== expectedExtension) throw new Error(`Le nom de sortie doit utiliser l’extension ${expectedExtension}.`);
  return raw;
}

function hlsVariantCandidates(text, baseUrl) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const variants = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const attributes = line.slice(line.indexOf(":") + 1);
    let uri = "";
    for (let next = index + 1; next < lines.length; next += 1) {
      const candidate = lines[next].trim();
      if (!candidate || candidate.startsWith("#")) continue;
      uri = candidate;
      break;
    }
    if (!uri) continue;
    const bandwidth = Number(/\bBANDWIDTH=(\d+)/i.exec(attributes)?.[1] || 0);
    const resolution = /\bRESOLUTION=(\d+)x(\d+)/i.exec(attributes);
    const url = new URL(uri, baseUrl);
    if (!url.search && baseUrl.search) url.search = baseUrl.search;
    variants.push({ url, bandwidth, width: Number(resolution?.[1] || 0), height: Number(resolution?.[2] || 0) });
  }
  return variants.sort((a, b) => b.bandwidth - a.bandwidth || b.width * b.height - a.width * a.height);
}

function hlsPlaylistDurationMs(text) {
  const durations = [...String(text || "").matchAll(/#EXTINF:([0-9.]+)/g)].map(match => Number(match[1])).filter(Number.isFinite);
  return durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) * 1000) : null;
}

function gatewayPathForRemoteHls(playable, selectedUrl, source = null) {
  const manifest = remoteHlsManifestUrl(playable, source);
  if (!manifest) throw new Error("Le manifeste canonique du playable est invalide.");
  const directory = new URL(".", manifest);
  if (selectedUrl.origin !== manifest.origin || !selectedUrl.pathname.startsWith(directory.pathname)) throw new Error("La variante HLS sélectionnée sort du répertoire distant autorisé.");
  const relative = selectedUrl.pathname.slice(directory.pathname.length);
  if (!relative || relative.split("/").some(part => !part || part === "." || part === "..")) throw new Error("Le chemin de variante HLS est invalide.");
  return `${REMOTE_HLS_GATEWAY_PREFIX}${encodeURIComponent(playable.id)}/${relative.split("/").map(encodeURIComponent).join("/")}${selectedUrl.search}`;
}

async function inspectRemoteDownload(candidate) {
  const checked = await validateRemoteCopyUrl(candidate.url, { allowHls: candidate.playable.kind === "hls" });
  if (candidate.playable.kind === "direct-url") {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_REFERENCE_TIMEOUT_MS);
    try {
      const result = await remoteReferenceFetch(checked, "HEAD", controller.signal);
      if (!result.response.ok) throw new Error(`La source distante répond HTTP ${result.response.status}.`);
      return {
        inputPath: `${REMOTE_MEDIA_GATEWAY_PREFIX}${encodeURIComponent(candidate.playable.id)}`,
        quality: path.extname(result.finalUrl.pathname).slice(1).toUpperCase() || "fichier direct",
        bandwidth: null,
        durationMs: candidate.playable.durationMs || null,
        estimatedSizeBytes: Number(result.response.headers.get("content-length")) || null
      };
    } finally { clearTimeout(timeout); }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_REFERENCE_TIMEOUT_MS);
  try {
    const masterResult = await remoteReferenceFetch(checked, "GET", controller.signal);
    if (!masterResult.response.ok) throw new Error(`Le manifeste HLS répond HTTP ${masterResult.response.status}.`);
    const masterText = await boundedRemoteText(masterResult.response);
    const variants = hlsVariantCandidates(masterText, masterResult.finalUrl);
    const selected = variants[0] || { url: masterResult.finalUrl, bandwidth: null, width: null, height: null };
    await validateRemoteCopyUrl(selected.url, { allowHls: true });
    let durationMs = candidate.playable.durationMs || null;
    if (variants.length) {
      const mediaResult = await remoteReferenceFetch(selected.url, "GET", controller.signal);
      if (!mediaResult.response.ok) throw new Error(`La playlist HLS sélectionnée répond HTTP ${mediaResult.response.status}.`);
      durationMs = hlsPlaylistDurationMs(await boundedRemoteText(mediaResult.response)) || durationMs;
    } else {
      durationMs = hlsPlaylistDurationMs(masterText) || durationMs;
    }
    return {
      inputPath: gatewayPathForRemoteHls(candidate.playable, selected.url, candidate.source),
      quality: selected.width && selected.height ? `${selected.width} × ${selected.height}` : (variants.length ? "variante HLS sélectionnée" : "playlist HLS"),
      bandwidth: selected.bandwidth || null,
      durationMs,
      estimatedSizeBytes: durationMs && selected.bandwidth ? Math.ceil(durationMs / 1000 * selected.bandwidth / 8) : null
    };
  } finally { clearTimeout(timeout); }
}

function publicLibraryDownloadJob(job) {
  return {
    id: job.id, assetId: job.assetId, playableId: job.playableId,
    status: job.status, stateLabel: job.stateLabel, progress: job.progress,
    mediaTimeMs: job.mediaTimeMs, durationMs: job.durationMs, speed: job.speed,
    outputSizeBytes: job.outputSizeBytes, quality: job.quality,
    estimatedSizeBytes: job.estimatedSizeBytes, fileName: job.fileName,
    createdAt: job.createdAt, updatedAt: job.updatedAt,
    finishedAt: job.finishedAt || null, error: job.error || null,
    result: job.result || null
  };
}

async function hashFile(file) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fsSync.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function probeDownloadedMedia(ffmpegStatus, file) {
  const args = [...ffmpegStatus.probe.prefixArgs, "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate", "-of", "json", file];
  const result = spawnSync(ffmpegStatus.probe.executable, args, { encoding: "utf8", timeout: 15000, windowsHide: true, shell: false });
  if (result.error || result.status !== 0) throw new Error("Le fichier produit est vide ou illisible.");
  let payload;
  try { payload = JSON.parse(result.stdout); } catch { throw new Error("FFprobe n’a pas pu valider le fichier produit."); }
  const video = (payload.streams || []).find(stream => stream.codec_type === "video");
  if (!video) throw new Error("Le fichier produit ne contient aucun flux vidéo lisible.");
  const audio = (payload.streams || []).find(stream => stream.codec_type === "audio");
  return {
    durationMs: Number.isFinite(Number(payload.format?.duration)) ? Math.round(Number(payload.format.duration) * 1000) : null,
    width: Number(video.width) || null, height: Number(video.height) || null,
    frameRate: video.r_frame_rate || null, videoCodec: video.codec_name || null,
    audioCodec: audio?.codec_name || null, hasAudio: Boolean(audio)
  };
}

function waitForChildClose(child, timeoutMs = 5000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("close", () => { clearTimeout(timer); resolve(); });
  });
}

async function terminateOwnedDownloadProcess(job) {
  const child = job?.process;
  if (!child || !child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise(resolve => {
      const killer = spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, shell: false });
      killer.once("error", resolve);
      killer.once("close", resolve);
    });
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch {} }
  }
  await waitForChildClose(child);
}

function downloadedTechnicalMetadata(probe, { mimeType, sizeBytes, sha256, fileName, analyzedAt }) {
  return {
    durationMs: probe.durationMs, width: probe.width, height: probe.height,
    frameRate: probe.frameRate, videoCodec: probe.videoCodec,
    audioCodec: probe.audioCodec, hasAudio: probe.hasAudio,
    mimeType, sizeBytes, sha256, fileName,
    analyzedAt, analyzer: "ffprobe", analyzerVersion: null,
    status: "available", error: null
  };
}

async function finalizeLibraryDownload(job, candidate, ffmpegStatus) {
  const stat = await fs.stat(job.temporaryPath).catch(() => null);
  if (!stat?.isFile() || stat.size <= 0) throw new Error("FFmpeg n’a produit aucun fichier exploitable.");
  const probe = probeDownloadedMedia(ffmpegStatus, job.temporaryPath);
  const sha256 = await hashFile(job.temporaryPath);
  const duplicate = VIDEO_LIBRARY.playables.find(item => item.assetId === job.assetId && item.sha256 === sha256);
  if (duplicate) throw new Error("Une copie locale équivalente existe déjà pour cet asset.");
  const storageKey = `${job.assetId}/source/${sha256.slice(0, 16)}-${job.fileName}`;
  const targetPath = safeLibraryMediaPath(storageKey, "workspace");
  if (fsSync.existsSync(targetPath)) throw new Error("Un fichier géré utilise déjà cette destination.");
  const now = new Date().toISOString();
  const mimeType = path.extname(job.fileName).toLowerCase() === ".webm" ? "video/webm" : "video/mp4";
  const metadata = downloadedTechnicalMetadata(probe, { mimeType, sizeBytes: stat.size, sha256, fileName: job.fileName, analyzedAt: now });
  const identity = `${job.assetId}-download-${sha256.slice(0, 16)}`;
  const sourceId = `source-${identity}`;
  const playableId = `video-${identity}`;
  const provenance = {
    kind: "managed-remote-copy", creationType: "remote-copy",
    sourceAssetId: job.assetId, sourcePlayableId: job.playableId,
    importedAt: now, ffmpegVersion: ffmpegStatus.version,
    sha256, sizeBytes: stat.size, originalFileName: job.fileName
  };
  const canonical = JSON.parse(JSON.stringify(activeCanonicalVideoLibrary()));
  const asset = canonical.assets.find(item => item.id === job.assetId);
  if (!asset || canonical.sources.some(item => item.id === sourceId) || canonical.playables.some(item => item.id === playableId)) throw new Error("La destination canonique de la copie existe déjà.");
  canonical.sources.push({
    id: sourceId, assetId: asset.id, kind: "local-file", provider: "local", role: "working-copy",
    origin: { originalFileName: job.fileName, sourceAssetId: asset.id, sourcePlayableId: job.playableId },
    transport: "file", mimeType, provenance, createdAt: now
  });
  canonical.playables.push({
    id: playableId, assetId: asset.id, sourceId, kind: "local-file", provider: "local", role: "working-copy",
    availability: "available", availabilityReason: null,
    location: { storageScope: "workspace", storageKey }, technicalMetadata: metadata,
    provenance, createdAt: now, updatedAt: now
  });
  asset.updatedAt = now;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await renameWithWindowsRetries(job.temporaryPath, targetPath);
  try {
    await persistCanonicalLibrary(canonical);
  } catch (error) {
    try { await fs.unlink(targetPath); } catch (rollbackError) { error.message += ` Nettoyage du fichier final impossible : ${rollbackError.message}`; }
    throw error;
  }
  job.finalPath = targetPath;
  job.storageKey = storageKey;
  const projectedAsset = VIDEO_LIBRARY.assets.find(item => item.id === asset.id);
  return { assetId: asset.id, sourceId, playableId, storageKey, asset: libraryAssetDetails(projectedAsset) };
}

function parseFfmpegProgress(job, chunk) {
  job.progressBuffer = `${job.progressBuffer || ""}${chunk}`;
  const lines = job.progressBuffer.split(/\r?\n/);
  job.progressBuffer = lines.pop() || "";
  for (const line of lines) {
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).trim();
    if (key === "out_time_us" || key === "out_time_ms") {
      const mediaTimeMs = Math.max(0, Math.round(Number(value) / 1000));
      if (Number.isFinite(mediaTimeMs)) job.mediaTimeMs = Math.max(job.mediaTimeMs || 0, mediaTimeMs);
    } else if (key === "out_time") {
      const match = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(value);
      if (match) job.mediaTimeMs = Math.max(job.mediaTimeMs || 0, Math.round((Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000));
    } else if (key === "speed") job.speed = value;
  }
  job.progress = job.durationMs ? Math.min(99, Math.max(job.progress, Math.floor((job.mediaTimeMs / job.durationMs) * 100))) : Math.max(job.progress, job.mediaTimeMs > 0 ? 1 : 0);
  job.updatedAt = new Date().toISOString();
}

function libraryDownloadError(error, job) {
  if (job.cancelRequested) return "Téléchargement annulé.";
  if (job.timeout) return "Le téléchargement a dépassé la durée maximale autorisée.";
  if (error?.code === "ENOSPC") return "Espace disque insuffisant pour finaliser la copie.";
  if (["EACCES", "EPERM"].includes(error?.code)) return "Permission refusée dans le dossier géré de la Library.";
  const message = String(error?.message || "Le téléchargement distant a échoué.").replace(/https?:\/\/[^\s?#]+[^\s]*/g, value => value.replace(/\?.*$/, "?…"));
  return message.slice(0, 500);
}

async function runLibraryDownload(job, candidate, inspection, ffmpegStatus) {
  let sizeMonitor;
  let terminalStatus = null;
  let terminalLabel = null;
  const timeout = setTimeout(() => { job.timeout = true; void terminateOwnedDownloadProcess(job); }, LIBRARY_DOWNLOAD_TIMEOUT_MS);
  try {
    const tempRoot = safeAssetWorkspacePath(job.assetId, "temp");
    await fs.mkdir(tempRoot, { recursive: true });
    job.workspace = await fs.mkdtemp(path.join(tempRoot, `${job.id}-`));
    job.temporaryPath = path.join(job.workspace, `download.${job.container}.incomplete`);
    job.status = "downloading"; job.stateLabel = "Téléchargement"; job.updatedAt = new Date().toISOString();
    const inputUrl = new URL(inspection.inputPath, `http://127.0.0.1:${PORT}`).toString();
    const args = [
      ...ffmpegStatus.program.prefixArgs,
      "-hide_banner", "-nostdin", "-n",
      "-protocol_whitelist", "http,https,tcp,tls,crypto",
      "-i", inputUrl,
      "-map", "0:v:0", "-map", "0:a:0?",
      "-c", "copy",
      ...(job.container === "mp4" ? ["-movflags", "+faststart"] : []),
      "-progress", "pipe:1", "-nostats",
      "-f", job.container,
      job.temporaryPath
    ];
    const child = spawn(ffmpegStatus.program.executable, args, {
      cwd: job.workspace, windowsHide: true, shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"]
    });
    job.process = child;
    job.pid = child.pid || null;
    job.spawn = { shell: false, executableSource: ffmpegStatus.source, argumentCount: args.length };
    let spawnError = null;
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => parseFfmpegProgress(job, String(chunk)));
    child.stderr.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-4000); });
    child.once("error", error => { spawnError = error; });
    sizeMonitor = setInterval(async () => {
      try { job.outputSizeBytes = (await fs.stat(job.temporaryPath)).size; job.updatedAt = new Date().toISOString(); } catch {}
    }, 250);
    const code = await new Promise(resolve => child.once("close", resolve));
    delete job.process;
    if (job.cancelRequested) throw new Error("Téléchargement annulé.");
    if (spawnError) throw spawnError;
    if (code !== 0) throw new Error(`FFmpeg a échoué (code ${code}) : ${stderr.trim().slice(-300) || "aucun flux compatible ou source inaccessible"}.`);
    job.status = "finalizing"; job.stateLabel = "Finalisation"; job.progress = Math.min(job.progress, 99); job.updatedAt = new Date().toISOString();
    job.result = await finalizeLibraryDownload(job, candidate, ffmpegStatus);
    terminalStatus = "completed"; terminalLabel = "Terminé"; job.progress = 100;
  } catch (error) {
    job.error = libraryDownloadError(error, job);
    terminalStatus = job.cancelRequested ? "cancelled" : "failed";
    terminalLabel = job.cancelRequested ? "Annulé" : "Échec";
    job.status = "cleaning"; job.stateLabel = "Nettoyage"; job.progress = 0;
  } finally {
    clearTimeout(timeout);
    if (sizeMonitor) clearInterval(sizeMonitor);
    if (job.process) { await terminateOwnedDownloadProcess(job); delete job.process; }
    if (job.workspace) { try { await fs.rm(job.workspace, { recursive: true, force: true }); } catch {} }
    job.workspace = null; job.temporaryPath = null; delete job.pid; delete job.progressBuffer;
    if (terminalStatus) {
      job.status = terminalStatus; job.stateLabel = terminalLabel;
      job.finishedAt = new Date().toISOString(); job.updatedAt = job.finishedAt;
    }
  }
}

function trimLibraryDownloadHistory() {
  const finished = [...ACTIVE_LIBRARY_DOWNLOADS.values()].filter(job => ["completed", "failed", "cancelled"].includes(job.status)).sort((a, b) => Date.parse(a.finishedAt || 0) - Date.parse(b.finishedAt || 0));
  const expiredBefore = Date.now() - LIBRARY_DOWNLOAD_TTL_MS;
  for (const job of finished) {
    if (Date.parse(job.finishedAt || 0) < expiredBefore || ACTIVE_LIBRARY_DOWNLOADS.size > LIBRARY_DOWNLOAD_MAX_HISTORY) ACTIVE_LIBRARY_DOWNLOADS.delete(job.id);
  }
}

async function startLibraryDownload(payload) {
  if (SERVER_SHUTTING_DOWN) throw Object.assign(new Error("Le serveur est en cours d’arrêt."), { statusCode: 503 });
  const assetId = String(payload?.assetId || "");
  const playableId = String(payload?.playableId || "");
  const candidate = remoteDownloadCandidate(assetId, playableId);
  if (!candidate) throw Object.assign(new Error("L’asset ou le playable distant est introuvable."), { statusCode: 404 });
  if (VIDEO_LIBRARY.playables.some(item => {
    if (item.assetId !== assetId || item.kind !== "local-file" || item.availability !== "available") return false;
    const storageKey = localStorageKeyForPlayable(item, VIDEO_LIBRARY.sources.find(source => source.id === item.sourceId));
    return Boolean(storageKey) && fsSync.existsSync(safeLibraryMediaPath(storageKey, localStorageScopeForPlayable(item)));
  })) {
    throw Object.assign(new Error("Une copie locale disponible existe déjà pour cet asset."), { statusCode: 409 });
  }
  if ([...ACTIVE_LIBRARY_DOWNLOADS.values()].some(job => job.assetId === assetId && ["preparing", "downloading", "finalizing", "cancelling"].includes(job.status))) {
    throw Object.assign(new Error("Un téléchargement est déjà actif pour cet asset."), { statusCode: 409 });
  }
  const ffmpegStatus = detectLibraryFfmpeg();
  if (!ffmpegStatus.available) throw Object.assign(new Error(ffmpegStatus.error), { statusCode: 503 });
  const fileName = safeDownloadFileName(payload?.fileName, candidate);
  const inspection = await inspectRemoteDownload(candidate);
  const now = new Date().toISOString();
  const job = {
    id: `library-download-${crypto.randomBytes(18).toString("base64url")}`,
    assetId, playableId: candidate.playable.id, fileName,
    container: path.extname(fileName).toLowerCase() === ".webm" ? "webm" : "mp4",
    status: "preparing", stateLabel: "Préparation", progress: 0,
    mediaTimeMs: 0, durationMs: inspection.durationMs,
    speed: null, outputSizeBytes: 0, quality: inspection.quality,
    estimatedSizeBytes: inspection.estimatedSizeBytes,
    createdAt: now, updatedAt: now, error: null
  };
  trimLibraryDownloadHistory();
  ACTIVE_LIBRARY_DOWNLOADS.set(job.id, job);
  job.completion = runLibraryDownload(job, candidate, inspection, ffmpegStatus);
  return job;
}

async function cancelLibraryDownload(job) {
  if (!job) throw Object.assign(new Error("Tâche de téléchargement introuvable."), { statusCode: 404 });
  if (!["preparing", "downloading", "finalizing"].includes(job.status)) return job;
  job.cancelRequested = true; job.status = "cancelling"; job.stateLabel = "Annulation"; job.updatedAt = new Date().toISOString();
  await terminateOwnedDownloadProcess(job);
  await job.completion;
  return job;
}

async function shutdownLibraryDownloads() {
  SERVER_SHUTTING_DOWN = true;
  const active = [...ACTIVE_LIBRARY_DOWNLOADS.values()].filter(job => ["preparing", "downloading", "finalizing", "cancelling"].includes(job.status));
  await Promise.all(active.map(async job => {
    job.cancelRequested = true; job.status = "cancelling"; job.stateLabel = "Arrêt du serveur";
    await terminateOwnedDownloadProcess(job);
    await job.completion;
  }));
  try { await fs.rm(LIBRARY_DOWNLOAD_ROOT, { recursive: true, force: true }); } catch {}
}

async function cleanupIncompleteWorkspaceDownloads() {
  for (const asset of activeCanonicalVideoLibrary().assets) {
    const tempRoot = safeAssetWorkspacePath(asset.id, "temp");
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

setInterval(trimLibraryDownloadHistory, 60 * 1000).unref();

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

function temporalMaskCollection(value, context = "La collection temporelle") {
  if (!Array.isArray(value) || value.length > 20) throw new Error(`${context} doit contenir de 0 à 20 masques.`);
  const ids = new Set();
  return value.map((mask, index) => {
    if (!mask || typeof mask !== "object") throw new Error(`${context} : le masque ${index + 1} est invalide.`);
    const id = typeof mask.id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(mask.id) ? mask.id : `mask-${index + 1}`;
    if (ids.has(id)) throw new Error(`${context} : identifiant de masque dupliqué : ${id}.`);
    ids.add(id);
    const values = ["x", "y", "width", "height"].map(key => Number(mask[key]));
    if (values.some(item => !Number.isFinite(item)) || values[0] < 0 || values[1] < 0 || values[2] <= 0 || values[3] <= 0 || values[0] + values[2] > 1 || values[1] + values[3] > 1) {
      throw new Error(`${context} : le masque ${id} sort de l'image ou possède des dimensions invalides.`);
    }
    return { id, x: values[0], y: values[1], width: values[2], height: values[3] };
  });
}

function temporalStepConfiguration(value, durationMs = null) {
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error("Les étapes temporelles doivent être une liste non vide de 1 à 20 étapes.");
  const ids = new Set();
  const steps = value.map((step, index) => {
    if (!step || typeof step !== "object") throw new Error(`L’étape temporelle ${index + 1} est invalide.`);
    const id = typeof step.id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(step.id) ? step.id : `step-${index + 1}`;
    if (ids.has(id)) throw new Error(`Identifiant d’étape dupliqué : ${id}.`);
    ids.add(id);
    const startMs = Number(step.startMs);
    if (!Number.isFinite(startMs) || startMs < 0 || (Number.isFinite(durationMs) && startMs >= durationMs)) throw new Error(`Le début de l’étape ${id} est hors de la durée vidéo.`);
    const requestedEnd = step.endMs === null || step.endMs === undefined || step.endMs === "" ? null : Number(step.endMs);
    const endMs = requestedEnd === null ? null : requestedEnd;
    if (endMs !== null && (!Number.isFinite(endMs) || endMs <= startMs || (Number.isFinite(durationMs) && endMs > durationMs))) throw new Error(`La fin de l’étape ${id} est hors de la durée vidéo.`);
    const masks = step.masks === undefined ? defaultAnonymizationMasks() : temporalMaskCollection(step.masks, `L’étape ${id}`);
    return { id, startMs, endMs, masks };
  }).sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
  for (let index = 1; index < steps.length; index += 1) {
    if (steps[index].startMs === steps[index - 1].startMs) throw new Error(`Deux étapes temporelles commencent à ${steps[index].startMs} ms ; une image ne peut appartenir qu’à une seule étape.`);
  }
  for (let index = 0; index < steps.length - 1; index += 1) {
    const current = steps[index], next = steps[index + 1];
    if (current.endMs === null) current.endMs = next.startMs;
    if (current.endMs !== next.startMs || current.endMs <= current.startMs) throw new Error(`Les plages des étapes ${current.id} et ${next.id} sont incohérentes.`);
  }
  const last = steps.at(-1);
  if (last.endMs === null) last.endMs = Number.isFinite(durationMs) ? durationMs : last.startMs + 1;
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
  if (!masks.length) return "[0:v]null[outv]";
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
  const result = spawnSync(executable, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,start_time,nb_frames:format=duration", "-of", "json", filePath], { encoding: "utf8", windowsHide: true, timeout: 10000 });
  if (result.error || result.status !== 0) throw new Error("Impossible de lire les paramètres vidéo préparés.");
  const payload = JSON.parse(String(result.stdout || "{}"));
  const stream = payload.streams?.[0];
  const match = String(stream?.r_frame_rate || "").match(/^(\d+)\/(\d+)$/);
  const fps = match ? Number(match[1]) / Number(match[2]) : 0;
  if (!stream || !Number.isFinite(fps) || fps <= 0) throw new Error("La cadence vidéo préparée est invalide.");
  const nbFrames = Number(stream.nb_frames);
  const duration = Number(payload.format?.duration);
  return { width: Number(stream.width), height: Number(stream.height), fps, nbFrames: Number.isFinite(nbFrames) && nbFrames > 0 ? Math.floor(nbFrames) : null, durationMs: Number.isFinite(duration) && duration >= 0 ? Math.round(duration * 1000) : null, startTime: Number.isFinite(Number(stream.start_time)) ? Number(stream.start_time) : 0 };
}

function validateTemporalStepsForVideo(steps, info) {
  for (const step of steps) {
    if (step.endMs <= step.startMs) throw new Error(`L’étape ${step.id} ne contient aucune image.`);
    for (const mask of step.masks) {
      const x = Math.floor(info.width * mask.x / 2) * 2;
      const y = Math.floor(info.height * mask.y / 2) * 2;
      const width = Math.floor(info.width * mask.width / 2) * 2;
      const height = Math.floor(info.height * mask.height / 2) * 2;
      if (x < 0 || y < 0 || width < 2 || height < 2 || x + width > info.width || y + height > info.height) {
        throw new Error(`Le masque ${mask.id} de l’étape ${step.id} est trop petit ou sort des dimensions vidéo ${info.width}×${info.height}.`);
      }
    }
  }
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
  validateTemporalStepsForVideo(steps, info);
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const endMs = Number(step.endMs);
    const startMs = Number(step.startMs);
    const startFrame = Math.max(0, Math.ceil(startMs / 1000 * info.fps - 1e-9));
    const requestedEndFrame = Math.max(startFrame + 1, Math.ceil(endMs / 1000 * info.fps - 1e-9));
    const endFrame = info.nbFrames ? Math.min(requestedEndFrame, info.nbFrames) : requestedEndFrame;
    const frames = endFrame - startFrame;
    if (frames <= 0) throw new Error(`L’étape ${step.id} ne contient aucune image source.`);
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
  const derivationId = job.id;
  const assetId = prepJob.assetId;
  const storageKey = `${assetId}/derived/${derivationId}/${hash.slice(0, 16)}-anonymized.mp4`;
  const targetPath = safeLibraryMediaPath(storageKey, "workspace");
  const temporaryTarget = `${targetPath}.incomplete`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  try {
    await fs.copyFile(job.outputPath, temporaryTarget);
    await fs.rename(temporaryTarget, targetPath);
  } catch (error) {
    try { await fs.unlink(temporaryTarget); } catch {}
    throw error;
  }
  const sourceId = `source-${derivationId}`;
  const playableId = `video-${derivationId}`;
  const now = new Date().toISOString();
  const sourceOrigin = prepJob.metadata?.sourceUrl || prepJob.sourceUrl;
  const provenance = { kind: "derived-anonymized", derivationId, sourceOriginUrl: sourceOrigin, sourceAssetId: assetId, sourcePreparationJobId: prepJob.id, mode: job.mode || "fixed", method: job.method, masks: job.masks, temporalMasks: job.temporalMasks || null, temporalSteps: job.temporalSteps || null, interpolation: job.temporalMasks ? "linear-between-keyframes-clamped-at-bounds" : null, blur: job.metadata.blur, filter: job.metadata.filter, ffmpeg: job.metadata.ffmpeg, ffmpegArgs: job.metadata.ffmpegArgs, createdAt: now, status: "completed", sha256: hash, sizeBytes: stat.size };
  const canonical = JSON.parse(JSON.stringify(activeCanonicalVideoLibrary()));
  const asset = canonical.assets.find(item => item.id === assetId);
  if (!asset || canonical.treatments.some(item => item.id === derivationId)) throw new Error("La destination canonique de la dérivation existe déjà.");
  canonical.sources.push({ id: sourceId, assetId, kind: "derived-output", provider: "proto05-derived", role: "derivation-local", origin: { sourceOriginUrl: sourceOrigin, derivationId }, transport: "file", mimeType: "video/mp4", provenance, createdAt: now });
  canonical.playables.push({ id: playableId, assetId, sourceId, kind: "local-file", provider: "proto05-derived", role: "derivation-local", availability: "available", availabilityReason: null, location: { storageScope: "workspace", storageKey }, technicalMetadata: { durationMs: null, width: null, height: null, mimeType: "video/mp4", sizeBytes: stat.size, sha256: hash, fileName: path.basename(storageKey), status: "available", error: null }, provenance, createdAt: now, updatedAt: now });
  canonical.treatments.push({
    id: derivationId, derivationId, label: `Tentative ${new Date(now).toLocaleString("fr-FR")}`,
    type: "anonymization", sourceAssetId: assetId, sourcePlayableId: prepJob.playableId,
    sourcePreparationId: prepJob.id, outputAssetId: assetId, outputPlayableId: playableId,
    status: "completed", progress: 100, createdAt: job.createdAt || now, updatedAt: now,
    startedAt: job.createdAt || now, finishedAt: now, error: null,
    parameters: { mode: job.mode || "fixed", method: job.method, masks: job.masks, temporalMasks: job.temporalMasks || null, temporalSteps: job.temporalSteps || null, blur: job.metadata.blur },
    engine: "ffmpeg", engineVersion: "proto05-0.1.36", ffmpegVersion: job.metadata.ffmpeg || null,
    runtimeJobId: job.id, diagnostics: { filter: job.metadata.filter, ffmpegArgs: job.metadata.ffmpegArgs },
    retained: false, publishedPlayableId: null
  });
  asset.updatedAt = now;
  try { await persistCanonicalLibrary(canonical); }
  catch (error) { try { await fs.unlink(targetPath); } catch {}; throw error; }
  const projectedAsset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
  return { duplicate: false, derivationId, assetId, playableId, asset: libraryAssetDetails(projectedAsset), sha256: hash, storageKey, mediaUrl: `/api/proto05/library/media/workspace/${encodeURIComponent(storageKey)}` };
}

async function runHlsDerivation(job, prepJob) {
  job.status = "anonymisation"; job.progress = 35; job.updatedAt = new Date().toISOString();
  let child; let sizeMonitor; let ffmpegLogStream; const timeout = setTimeout(() => { job.timeout = true; try { job.process?.kill(); child?.kill(); } catch {} }, HLS_DERIVATION_TIMEOUT_MS);
  try {
    await fs.mkdir(HLS_DERIVATION_ROOT, { recursive: true }); job.workspace = await fs.mkdtemp(path.join(HLS_DERIVATION_ROOT, `${job.id}-`)); job.outputPath = path.join(job.workspace, "derived.mp4");
    const ffmpeg = findFfmpeg(); const version = ffmpegVersion(ffmpeg); const blur = anonymizationBlurProfile(job.blurProfile); const filter = job.mode === "temporal" ? ffmpegTemporalBlurFilter(job.temporalMasks, blur) : ffmpegBlurFilter(job.masks, blur); const audioCodec = ffprobeAudioCodec(ffmpeg, prepJob.outputPath) === "aac" ? "copy" : "aac"; const args = ["-hide_banner", "-y", "-i", prepJob.outputPath, "-filter_complex", filter, "-map", "[outv]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", audioCodec, "-movflags", "+faststart", job.outputPath]; job.metadata = { ffmpeg: version, method: job.method, mode: job.mode || "fixed", masks: job.masks, temporalMasks: job.temporalMasks || null, blur, filter, ffmpegArgs: args, audioCodec, inputFileName: "work.mp4" };
    const ffmpegLogPath = path.join(HLS_DERIVATION_ROOT, `${job.id}.ffmpeg.log`);
    const runtime = { executable: ffmpeg, cwd: process.cwd(), args, commandPowerShell: ffmpegPowerShellCommand(ffmpeg, args, process.cwd(), ffmpegLogPath), commands: [], logPath: ffmpegLogPath, startedAt: new Date().toISOString(), endedAt: null, pid: null, exitCode: null, lastMediaTimeMs: null, outputSizeBytes: 0, inputPath: prepJob.outputPath, outputPath: job.outputPath, stdout: "", stderr: "", error: null, env: { FFMPEG_PATH: process.env.FFMPEG_PATH || null, PROTO05_HLS_DERIVATION_TIMEOUT_MS: process.env.PROTO05_HLS_DERIVATION_TIMEOUT_MS || null } };
    job.ffmpegRuntime = runtime;
    ffmpegLogStream = fsSync.createWriteStream(ffmpegLogPath, { flags: "w", encoding: "utf8" });
    if (job.mode === "temporal" && Array.isArray(job.temporalSteps) && job.temporalSteps.length) {
      job.metadata = { ffmpeg: version, method: job.method, mode: "temporal", strategy: "local-regions-by-step", temporalSteps: job.temporalSteps, blur, audioCodec: null, inputFileName: "work.mp4" };
      await runTemporalLocalPipeline(job, prepJob, { ffmpeg, blur, runtime, logStream: ffmpegLogStream });
      ffmpegLogStream.end();
      ffmpegLogStream = null;
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
  } finally { clearTimeout(timeout); if (sizeMonitor) clearInterval(sizeMonitor); if (ffmpegLogStream) ffmpegLogStream.end(); delete job.process; delete job.pid; delete job.timeout; delete job.sizeLimit; if (job.status === "terminé") job.updatedAt = new Date().toISOString(); }
}

async function cancelHlsDerivation(job) { if (!job || !["anonymisation", "validation"].includes(job.status)) return job; job.cancelRequested = true; job.status = "annulation"; job.updatedAt = new Date().toISOString(); if (job.process?.kill) job.process.kill(); return job; }

function cleanupExpiredHlsDerivations() { const now = Date.now(); for (const [id, job] of ACTIVE_HLS_DERIVATIONS) if (job.expiresAt && Date.parse(job.expiresAt) <= now && !["anonymisation", "validation", "annulation"].includes(job.status)) { job.status = "expiré"; void removeDerivationWorkspace(job); ACTIVE_HLS_DERIVATIONS.delete(id); } }
setInterval(cleanupExpiredHlsDerivations, 60 * 1000).unref();

async function hlsPreparationSource(assetId, playableId, sourceId) {
  const asset = VIDEO_LIBRARY.assets.find(item => item.id === assetId);
  const playable = VIDEO_LIBRARY.playables.find(item => item.id === playableId && item.assetId === assetId);
  const source = VIDEO_LIBRARY.sources.find(item => item.id === sourceId && item.assetId === assetId);
  if (!asset || !playable || !source) throw new Error("La source de travail est introuvable.");
  if (playable.kind === "local-file" && explicitRole(playable) === "working-copy") {
    const storageKey = localStorageKeyForPlayable(playable, source);
    const inputPath = safeLibraryMediaPath(storageKey, localStorageScopeForPlayable(playable));
    const stat = await fs.stat(inputPath).catch(() => null);
    if (!stat?.isFile()) throw new Error("La copie locale de travail est introuvable.");
    return { asset, playable, source, manifest: inputPath, isLocal: true, sourceLabel: source.title || asset.title };
  }
  if (source.kind !== "hls" || playable.kind !== "hls") throw new Error("Seules une copie locale de travail ou une source HLS peuvent être préparées.");
  const manifest = source.originUrl || source.sourceUrl || source.manifestUrl;
  if (!manifest) throw new Error("Le manifeste HLS de la source est invalide.");
  const validatedManifest = await validateRemoteCopyUrl(manifest, { allowHls: true });
  if (!/\.m3u8$/i.test(validatedManifest.pathname)) throw new Error("Le manifeste HLS de la source est invalide.");
  return { asset, playable, source, manifest: validatedManifest.toString(), isLocal: false, sourceLabel: source.title || asset.title };
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
    const args = ["-hide_banner", "-y", ...(job.isLocal ? [] : ["-protocol_whitelist", "file,http,https,tcp,tls,crypto"]), "-i", manifest, "-map", "0:v:0?", "-map", "0:a:0?", "-c", "copy", "-t", String(HLS_PREPARATION_MAX_DURATION_SECONDS), "-movflags", "+faststart", job.outputPath];
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
    const info = ffprobeVideoInfo(ffmpeg, job.outputPath);
    job.status = "completed"; job.progress = 100; job.expiresAt = new Date(Date.now() + HLS_PREPARATION_TTL_MS).toISOString(); job.metadata = { ...(job.metadata || {}), fileName: "work.mp4", sizeBytes: stat.size, workspaceId: path.basename(job.workspace), mimeType: "video/mp4" };
    job.metadata = { ...job.metadata, durationMs: info.durationMs, width: info.width, height: info.height, fps: info.fps, nbFrames: info.nbFrames };
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
  if (activeVideoCatalog().some(video => video.id === id)) throw new Error("Cette source vidéo existe déjà dans le catalogue.");
  return { id, title, provider: payload.provider, ...(payload.provider === "youtube" ? source : { source: "UGA", sourceType: "hls-proxy", mimeType: "application/vnd.apple.mpegurl", durationMs: null, ...source }), authorized: true };
}

function activityResponse(store, activity) {
  return { schemaVersion: store.schemaVersion || "0.1", updatedAt: store.updatedAt || null, activity: activityForResponse(activity) };
}

const JSON_READ_ADAPTER = Object.freeze({
  async readSnapshot() {
    const [activities, activityLibrary] = await Promise.all([
      readJsonActivities(),
      readJsonActivityLibraryClassification()
    ]);
    return {
      activities,
      activityLibrary,
      languageCatalog: {
        languages: structuredClone(LANGUAGE_CATALOG)
      },
      videoCatalog: {
        schemaVersion: "0.1",
        videos: structuredClone(JSON_VIDEO_CATALOG)
      },
      videoLibrary: structuredClone(JSON_VIDEO_LIBRARY)
    };
  }
});

let READ_BOUNDARY = null;
let WRITE_BOUNDARY = null;
let MARIADB_WRITE_ADAPTER = null;

function proto05ReadBoundary() {
  if (READ_BOUNDARY) return READ_BOUNDARY;
  const mariadbAdapter = DATA_MODE === "json"
    ? null
    : createMariaDbReadonlyAdapter({
        config: MARIADB_CONFIGURATION,
        prototypeDirectory: ROOT_DIR,
        mysqlModulePath: process.env.PROTO05_MYSQL2_DIRECTORY || null,
        ...(DATA_MODE === "mariadb"
          ? {
              grantValidator: assertApplicationGrants,
              mode: "mariadb"
            }
          : {})
      });
  READ_BOUNDARY = createProto05ReadBoundary({
    mode: DATA_MODE,
    jsonAdapter: JSON_READ_ADAPTER,
    mariadbAdapter
  });
  return READ_BOUNDARY;
}

function proto05WriteBoundary() {
  if (WRITE_BOUNDARY) return WRITE_BOUNDARY;
  if (DATA_MODE === "mariadb") {
    MARIADB_WRITE_ADAPTER = createMariaDbWriteAdapter({
      config: MARIADB_CONFIGURATION,
      prototypeDirectory: ROOT_DIR,
      mysqlModulePath: process.env.PROTO05_MYSQL2_DIRECTORY || null
    });
  }
  WRITE_BOUNDARY = createProto05WriteBoundary({
    mode: DATA_MODE,
    jsonAdapter: Object.freeze({
      async writeSnapshot() {
        throw new Error("Les écritures JSON historiques ne passent pas par l’adaptateur MariaDB.");
      }
    }),
    mariadbAdapter: MARIADB_WRITE_ADAPTER
  });
  return WRITE_BOUNDARY;
}

async function persistMariaDbSnapshot(patch, {
  operation,
  canonicalVideoLibrary = null,
  failAfterStatements = null
}) {
  const context = READ_CONTEXT.getStore();
  if (!context) throw new Error("Contexte MariaDB transactionnel absent.");
  const snapshot = structuredClone(context);
  Object.assign(snapshot, structuredClone(patch));
  Object.defineProperty(snapshot, "canonicalVideoLibrary", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: structuredClone(canonicalVideoLibrary || context.canonicalVideoLibrary)
  });
  const queued = writeQueue.then(() => proto05WriteBoundary().writeSnapshot(snapshot, {
    operation,
    failAfterStatements
  }));
  writeQueue = queued.catch(() => {});
  const result = await queued;
  Object.assign(context, result.snapshot);
  Object.defineProperty(context, "canonicalVideoLibrary", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: result.snapshot.canonicalVideoLibrary
  });
  return result;
}

async function handleApiInReadContext(request, response, url) {
  if (url.pathname === "/api/health") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    return sendJson(response, 200, { ok: true, service: SERVICE, version: VERSION, port: PORT, dataMode: DATA_MODE });
  }
  if (url.pathname === "/api/proto05/video-catalog") {
    if (request.method === "GET") return sendJson(response, 200, { videos: activeVideoCatalog() });
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, POST" });
    let entry;
    try { entry = catalogEntryFromInput(JSON.parse(await readRequestBody(request))); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Source vidéo invalide." }); }
    const nextCatalog = freezeVideoCatalog([...activeVideoCatalog(), entry]);
    try { await persistVideoCatalog(nextCatalog); JSON_VIDEO_CATALOG = nextCatalog; }
    catch (error) { console.error(`[data] catalogue vidéo Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Enregistrement du catalogue impossible." }); }
    return sendJson(response, 201, { video: entry });
  }
  if (url.pathname === "/api/proto05/activity-library") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    try {
      const [store, classification] = await Promise.all([readActivities(), readActivityLibraryClassification()]);
      return sendJson(response, 200, activityLibraryPayload(store, classification));
    } catch (error) {
      const failure = activityProjectionErrorPayload(error, "Bibliothèque d’activités indisponible.");
      return sendJson(response, failure.status, failure.body);
    }
  }
  const activityFolderRoute = /^\/api\/proto05\/activity-library\/folders(?:\/([^/]+))?$/.exec(url.pathname);
  if (activityFolderRoute) {
    let classification;
    try { classification = await readActivityLibraryClassification(); }
    catch (error) { return sendJson(response, 500, { error: error.message }); }
    if (request.method === "POST" && !activityFolderRoute[1]) {
      try {
        const folder = activityLibraryFolderFromInput(classification, JSON.parse(await readRequestBody(request)));
        const next = await persistActivityLibraryClassification({
          ...classification,
          folders: [...classification.folders, folder]
        });
        return sendJson(response, 201, { folder: next.folders.find(item => item.id === folder.id) });
      } catch (error) {
        return sendJson(response, 400, { error: error.message || "Dossier invalide." });
      }
    }
    if (!activityFolderRoute[1]) return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    const folderId = decodeURIComponent(activityFolderRoute[1]);
    const folder = classification.folders.find(item => item.id === folderId);
    if (!folder) return sendJson(response, 404, { error: "Dossier introuvable." });
    if (request.method === "PATCH") {
      try {
        const name = activityFolderName(JSON.parse(await readRequestBody(request)).name);
        if (classification.folders.some(item => item.id !== folderId && item.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0)) throw new Error("Ce dossier existe déjà.");
        const folders = classification.folders.map(item => item.id === folderId
          ? { ...item, name, updatedAt: new Date().toISOString() }
          : item);
        const next = await persistActivityLibraryClassification({ ...classification, folders });
        return sendJson(response, 200, { folder: next.folders.find(item => item.id === folderId) });
      } catch (error) {
        return sendJson(response, 400, { error: error.message || "Renommage impossible." });
      }
    }
    if (request.method === "DELETE") {
      try {
        const assignments = Object.fromEntries(Object.entries(classification.assignments).filter(([, assignedFolderId]) => assignedFolderId !== folderId));
        const unclassifiedActivityIds = Object.entries(classification.assignments)
          .filter(([, assignedFolderId]) => assignedFolderId === folderId)
          .map(([activityId]) => activityId);
        await persistActivityLibraryClassification({
          ...classification,
          folders: classification.folders.filter(item => item.id !== folderId),
          assignments
        });
        return sendJson(response, 200, { folderId, unclassifiedActivityIds });
      } catch (error) {
        return sendJson(response, 400, { error: error.message || "Suppression impossible." });
      }
    }
    return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "PATCH, DELETE" });
  }
  const activityClassificationRoute = /^\/api\/proto05\/activity-library\/activities\/([^/]+)\/classification$/.exec(url.pathname);
  if (activityClassificationRoute) {
    if (request.method !== "PUT") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "PUT" });
    try {
      const activityId = decodeURIComponent(activityClassificationRoute[1]);
      const [store, classification] = await Promise.all([readActivities(), readActivityLibraryClassification()]);
      if (!store.activities.some(activity => activity?.id === activityId)) return sendJson(response, 404, { error: "Activité introuvable." });
      const payload = JSON.parse(await readRequestBody(request));
      const folderId = payload?.folderId ?? null;
      if (folderId !== null && !classification.folders.some(folder => folder.id === folderId)) return sendJson(response, 404, { error: "Dossier introuvable." });
      const assignments = { ...classification.assignments };
      if (folderId === null) delete assignments[activityId];
      else assignments[activityId] = folderId;
      await persistActivityLibraryClassification({ ...classification, assignments });
      return sendJson(response, 200, { activityId, folderId });
    } catch (error) {
      return sendJson(response, 400, { error: error.message || "Classement impossible." });
    }
  }
  const folderRoute = /^\/api\/proto05\/library\/folders(?:\/([^/]+))?$/.exec(url.pathname);
  if (folderRoute) {
    if (request.method === "POST" && !folderRoute[1]) {
      try { const folder = libraryFolderFromInput(JSON.parse(await readRequestBody(request))); const nextLibrary = libraryMutationCopy(); nextLibrary.folders = [...(nextLibrary.folders || []), folder]; await persistLibraryMutation(nextLibrary); return sendJson(response, 201, { folder }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Dossier invalide." }); }
    }
    if (!folderRoute[1]) return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    const folderId = decodeURIComponent(folderRoute[1]);
    const folder = (VIDEO_LIBRARY.folders || []).find(item => item.id === folderId);
    if (!folder) return sendJson(response, 404, { error: "Dossier introuvable." });
    if (request.method === "PATCH") {
      try { const payload = JSON.parse(await readRequestBody(request)); const name = libraryName(payload.name, "Le nom du dossier est obligatoire."); if ((VIDEO_LIBRARY.folders || []).some(item => item.id !== folderId && item.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0)) throw new Error("Ce dossier existe déjà."); const nextLibrary = libraryMutationCopy(); const target = nextLibrary.folders.find(item => item.id === folderId); target.name = name; target.updatedAt = new Date().toISOString(); await persistLibraryMutation(nextLibrary); return sendJson(response, 200, { folder: target }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Renommage impossible." }); }
    }
    if (request.method === "DELETE") {
      try { const detachedAssetCount = VIDEO_LIBRARY.assets.filter(asset => asset.folderId === folderId).length; const nextLibrary = libraryMutationCopy(); nextLibrary.folders = nextLibrary.folders.filter(item => item.id !== folderId); nextLibrary.assets = nextLibrary.assets.map(asset => asset.folderId === folderId ? { ...asset, folderId: null } : asset); await persistLibraryMutation(nextLibrary); return sendJson(response, 200, { folderId, detachedAssetCount }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Suppression impossible." }); }
    }
    return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "PATCH, DELETE" });
  }
  const tagRoute = /^\/api\/proto05\/library\/tags(?:\/([^/]+))?$/.exec(url.pathname);
  if (tagRoute) {
    if (request.method === "POST" && !tagRoute[1]) {
      try { const tag = libraryTagFromInput(JSON.parse(await readRequestBody(request))); const nextLibrary = libraryMutationCopy(); nextLibrary.tags = [...(nextLibrary.tags || []), tag]; await persistLibraryMutation(nextLibrary); return sendJson(response, 201, { tag }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Tag invalide." }); }
    }
    if (!tagRoute[1]) return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    const tagId = decodeURIComponent(tagRoute[1]);
    const tag = (VIDEO_LIBRARY.tags || []).find(item => item.id === tagId);
    if (!tag) return sendJson(response, 404, { error: "Tag introuvable." });
    if (request.method === "PATCH") {
      try { const payload = JSON.parse(await readRequestBody(request)); const name = libraryName(payload.name, "Le nom du tag est obligatoire."); const normalizedName = normalizedLibraryName(name); if (!normalizedName) throw new Error("Le nom du tag est invalide."); if ((VIDEO_LIBRARY.tags || []).some(item => item.id !== tagId && item.normalizedName === normalizedName)) throw new Error("Ce tag existe déjà."); const nextLibrary = libraryMutationCopy(); const target = nextLibrary.tags.find(item => item.id === tagId); target.name = name; target.normalizedName = normalizedName; target.updatedAt = new Date().toISOString(); await persistLibraryMutation(nextLibrary); return sendJson(response, 200, { tag: target }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Renommage impossible." }); }
    }
    if (request.method === "DELETE") {
      try { const nextLibrary = libraryMutationCopy(); nextLibrary.tags = nextLibrary.tags.filter(item => item.id !== tagId); nextLibrary.assets = nextLibrary.assets.map(asset => ({ ...asset, tagIds: (asset.tagIds || []).filter(id => id !== tagId) })); await persistLibraryMutation(nextLibrary); return sendJson(response, 200, { tagId }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Suppression impossible." }); }
    }
    return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "PATCH, DELETE" });
  }
  const classificationRoute = /^\/api\/proto05\/library\/assets\/([^/]+)\/classification$/.exec(url.pathname);
  if (classificationRoute) {
    if (request.method !== "PUT") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "PUT" });
    try { const assetId = decodeURIComponent(classificationRoute[1]); const payload = JSON.parse(await readRequestBody(request)); const classification = classificationFromInput(assetId, payload); const nextLibrary = libraryMutationCopy(); const asset = nextLibrary.assets.find(item => item.id === assetId); asset.folderId = classification.folderId; asset.tagIds = classification.tagIds; await persistLibraryMutation(nextLibrary); return sendJson(response, 200, { asset: libraryAssetDetails(asset) }); }
      catch (error) { return sendJson(response, 400, { error: error.message || "Classement impossible." }); }
  }
  const localCopyDeleteMatch = /^\/api\/proto05\/library\/assets\/([^/]+)\/local-copies\/([^/]+)$/.exec(url.pathname);
  if (localCopyDeleteMatch) {
    if (request.method !== "DELETE") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "DELETE" });
    try {
      const result = await removeLocalLibraryCopy(decodeURIComponent(localCopyDeleteMatch[1]), decodeURIComponent(localCopyDeleteMatch[2]));
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, { error: error.message || "Suppression de la copie locale impossible.", conflicts: error.conflicts || [] });
    }
  }
  const derivationDeleteMatch = /^\/api\/proto05\/library\/assets\/([^/]+)\/derivations\/([^/]+)$/.exec(url.pathname);
  if (derivationDeleteMatch) {
    if (request.method !== "DELETE") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "DELETE" });
    try {
      const result = await removeLibraryDerivation(decodeURIComponent(derivationDeleteMatch[1]), decodeURIComponent(derivationDeleteMatch[2]));
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, { error: error.message || "Suppression de la dérivation impossible." });
    }
  }
  const accessRoleMatch = /^\/api\/proto05\/library\/assets\/([^/]+)\/accesses\/([^/]+)\/role$/.exec(url.pathname);
  if (accessRoleMatch) {
    if (request.method !== "PUT") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "PUT" });
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const result = await assignLibraryAccessRole(decodeURIComponent(accessRoleMatch[1]), decodeURIComponent(accessRoleMatch[2]), payload.role);
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, { error: error.message || "Attribution du rôle impossible." });
    }
  }
  const libraryAssetDeleteMatch = /^\/api\/proto05\/library\/assets\/([^/]+)(\/physical)?$/.exec(url.pathname);
  if (libraryAssetDeleteMatch) {
    if (request.method === "GET" && !libraryAssetDeleteMatch[2]) {
      const asset = VIDEO_LIBRARY.assets.find(item => item.id === decodeURIComponent(libraryAssetDeleteMatch[1]));
      if (!asset) return sendJson(response, 404, { error: "Asset vidéo introuvable." });
      const activities = (await readActivities()).activities || [];
      const plan = libraryAssetDeletionPlan(asset.id, activities);
      return sendJson(response, 200, { asset: libraryAssetDetails(asset, libraryUsageSummary(plan)) });
    }
    if (request.method !== "DELETE") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "DELETE" });
    try {
      const result = await removeLibraryAsset(decodeURIComponent(libraryAssetDeleteMatch[1]), { physical: Boolean(libraryAssetDeleteMatch[2]) });
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, { error: error.message || "Suppression impossible.", conflicts: error.conflicts || [] });
    }
  }
  if (url.pathname === "/api/proto05/library/assets") {
    if (request.method === "GET") {
      const activities = (await readActivities()).activities || [];
      const assets = VIDEO_LIBRARY.assets.map(asset => {
        const plan = libraryAssetDeletionPlan(asset.id, activities);
        return libraryAssetDetails(asset, libraryUsageSummary(plan));
      });
      return sendJson(response, 200, { schemaVersion: VIDEO_LIBRARY.schemaVersion, updatedAt: VIDEO_LIBRARY.updatedAt || null, assets, folders: VIDEO_LIBRARY.folders || [], tags: VIDEO_LIBRARY.tags || [] });
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
    try { validateLibraryShape(nextLibrary); await persistVideoLibrary(nextLibrary); JSON_VIDEO_LIBRARY = nextLibrary; }
    catch (error) {
      console.error(`[data] Library vidéo Proto05 impossible : ${error.code || "ERROR"}/${error.reasonCode || "UNKNOWN"} ${(error.differencePaths || []).join(",")}`);
      return sendJson(response, 500, { error: "Enregistrement de la Library impossible." });
    }
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
  if (url.pathname === "/api/proto05/library/ffmpeg") {
    if (request.method === "GET") return sendJson(response, 200, { ffmpeg: publicFfmpegStatus() });
    if (request.method !== "PUT") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, PUT" });
    try {
      const payload = JSON.parse(await readRequestBody(request));
      return sendJson(response, 200, { ffmpeg: publicFfmpegStatus(configureLibraryFfmpeg(payload?.path)) });
    } catch (error) { return sendJson(response, 400, { error: error.message || "Configuration FFmpeg invalide." }); }
  }
  const downloadOptionsMatch = /^\/api\/proto05\/library\/download-options\/([^/]+)$/.exec(url.pathname);
  if (downloadOptionsMatch) {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    const assetId = decodeURIComponent(downloadOptionsMatch[1]);
    const candidate = remoteDownloadCandidate(assetId, url.searchParams.get("playableId"));
    if (!candidate) return sendJson(response, 404, { error: "Source distante téléchargeable introuvable." });
    try {
      const inspection = await inspectRemoteDownload(candidate);
      return sendJson(response, 200, {
        assetId, playableId: candidate.playable.id, title: candidate.asset.title,
        sourceKind: candidate.playable.kind, host: candidate.host,
        proposedFileName: proposedDownloadFileName(candidate.asset, candidate),
        destinationLabel: `Espace de travail de ${candidate.asset.title || candidate.asset.id}`,
        quality: inspection.quality, bandwidth: inspection.bandwidth || null,
        durationMs: inspection.durationMs, estimatedSizeBytes: inspection.estimatedSizeBytes,
        ffmpeg: publicFfmpegStatus()
      });
    } catch (error) { return sendJson(response, 400, { error: error.message || "Analyse du téléchargement impossible.", ffmpeg: publicFfmpegStatus() }); }
  }
  if (url.pathname === "/api/proto05/library/downloads") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    try {
      const job = await startLibraryDownload(JSON.parse(await readRequestBody(request)));
      return sendJson(response, 202, { job: publicLibraryDownloadJob(job) });
    } catch (error) { return sendJson(response, error.statusCode || 400, { error: error.message || "Téléchargement impossible.", ffmpeg: publicFfmpegStatus() }); }
  }
  const downloadJobMatch = /^\/api\/proto05\/library\/downloads\/([^/]+)$/.exec(url.pathname);
  if (downloadJobMatch) {
    let id;
    try { id = decodeURIComponent(downloadJobMatch[1]); } catch { return sendJson(response, 400, { error: "Identifiant de tâche invalide." }); }
    const job = ACTIVE_LIBRARY_DOWNLOADS.get(id);
    if (!job) return sendJson(response, 404, { error: "Tâche de téléchargement introuvable." });
    if (request.method === "GET") return sendJson(response, 200, { job: publicLibraryDownloadJob(job) });
    if (request.method === "DELETE") {
      try { return sendJson(response, 200, { job: publicLibraryDownloadJob(await cancelLibraryDownload(job)) }); }
      catch (error) { return sendJson(response, error.statusCode || 400, { error: error.message || "Annulation impossible." }); }
    }
    return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, DELETE" });
  }
  if (url.pathname === "/api/proto05/library/remote-reference/analyze") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    try { return sendJson(response, 200, await analyzeRemoteLibraryReference(JSON.parse(await readRequestBody(request)))); }
    catch (error) { return sendJson(response, error.statusCode || 400, { error: error.message || "Analyse distante impossible." }); }
  }
  if (url.pathname === "/api/proto05/library/remote-reference/confirm") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "POST" });
    try {
      const result = await confirmRemoteLibraryReference(JSON.parse(await readRequestBody(request)));
      return sendJson(response, result.duplicate ? 409 : 201, result);
    } catch (error) {
      const status = error.statusCode || 400;
      return sendJson(response, status, { error: status >= 500 ? "Enregistrement de la référence distante impossible." : (error.message || "Ajout de la référence distante impossible.") });
    }
  }
  if (url.pathname === "/api/proto05/library/hls-preparations") {
    if (request.method !== "POST") return sendJson(response, 405, { error: "MÃ©thode non autorisÃ©e." }, { allow: "POST" });
    try {
      const payload = JSON.parse(await readRequestBody(request));
      const resolved = await hlsPreparationSource(payload.assetId, payload.playableId, payload.sourceId);
      const job = { id: `hls-prep-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`, assetId: resolved.asset.id, playableId: resolved.playable.id, sourceId: resolved.source.id, isLocal: resolved.isLocal, status: "queued", progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: null, metadata: { sourceUrl: resolved.isLocal ? null : resolved.manifest, sourceTitle: resolved.sourceLabel }, masks: defaultAnonymizationMasks(), temporalMasks: null, error: null, log: [], cancelRequested: false };
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
    try { return sendJson(response, 200, { playable: playableForClient(resolveLibraryPlayable({ assetId: playable.assetId, playableId }, VIDEO_LIBRARY)) }); }
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
      const next = {
        ...activityForStorage(store.activities[index]),
        videoRef: normalizedActivityVideoRef(payload)
      };
      validateActivityIntegrity(next);
      store.activities[index] = next;
      store.updatedAt = new Date().toISOString();
      await persistActivities(store);
      return sendJson(response, 200, activityResponse(store, next));
    } catch (error) { return sendJson(response, 400, { error: error.message || "Association vidéo invalide." }); }
  }
  if (url.pathname === "/api/proto05/language-catalog") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    return sendJson(response, 200, { languages: activeLanguageCatalog() });
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
      return sendJson(response, error.code === "ACTIVITY_PLAYABLE_UNRESOLVED" ? 409 : 400, { code: error.code || "ACTIVITY_VIDEO_INVALID", error: error.message || "Source vidéo introuvable." });
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
    catch (error) { console.error(`[data] duplication Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Duplication impossible." }); }
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
    const pedagogicalVariants = store.activities.filter(activity =>
      activity?.id !== id
      && activity?.pedagogicalIdentity?.lineage?.parentActivityId === id
    );
    if (pedagogicalVariants.length) {
      return sendJson(response, 409, {
        error: "Suppression refusée : cette activité est la source d’une variante pédagogique.",
        variants: pedagogicalVariants.map(activity => ({ id: activity.id, title: activity.title || activity.id }))
      });
    }
    const [index] = matches;
    const [deleted] = store.activities.splice(index, 1);
    store.updatedAt = new Date().toISOString();
    try { await persistActivities(store); }
    catch (error) {
      console.error(`[data] suppression Proto05 impossible : ${error.message}`);
      return sendJson(response, 500, { error: "Suppression impossible." });
    }
    try { await removeActivityLibraryAssignment(id); }
    catch (error) { console.error(`[data] nettoyage du classement de ${id} impossible : ${error.message}`); }
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
    try {
      activity = draftActivityFromVideoRef(selectedActivityVideoRef(payload), payload);
      validateActivityIntegrity(activity);
      assertPedagogicalLineage(activity, [...store.activities, activity]);
    }
    catch (error) { return sendJson(response, 400, { error: error.message }); }
    store.activities.push(activity); store.updatedAt = new Date().toISOString();
    try { await persistActivities(store); }
    catch (error) {
      console.error(`[data] création Proto05 impossible : ${error.code || "ERROR"}/${error.reasonCode || "UNKNOWN"} ${(error.differencePaths || []).join(",")}`);
      return sendJson(response, 500, { error: "Création impossible." });
    }
    return sendJson(response, 201, activityResponse(store, activity));
  }
  if (url.pathname === "/api/proto05/activities" || /^\/api\/proto05\/activities\/[^/]+(?:\/authoring)?$/.test(url.pathname)) {
    const isDetail = url.pathname !== "/api/proto05/activities";
    if (request.method === "PUT" && /^\/api\/proto05\/activities\/[^/]+\/authoring$/.test(url.pathname)) {
      const id = decodeURIComponent(url.pathname.slice("/api/proto05/activities/".length, -"/authoring".length));
      const store = await readActivities(); const index = store.activities.findIndex(activity => activity && activity.id === id);
      if (index < 0) return sendJson(response, 404, { error: "Activité introuvable." });
      let payload; let next;
      try {
        payload = JSON.parse(await readRequestBody(request));
        next = validateAuthoringPatch(payload, store.activities[index]);
        assertPedagogicalLineage(next, store.activities.map((activity, activityIndex) => activityIndex === index ? next : activity));
      }
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
      const next = activityForStorage(current);
      for (const key of ["title", "description", "instruction", "pedagogicalQuestion"]) if (payload[key] !== undefined) next[key] = payload[key];
      if (payload.pedagogicalIdentity !== undefined) {
        next.pedagogicalIdentity = normalizePedagogicalIdentityStates(payload.pedagogicalIdentity);
      }
      if (payload.videoId !== undefined || payload.videoRef !== undefined) next.videoRef = selectedActivityVideoRef(payload, current.videoRef);
      try {
        validateActivityIntegrity(next);
        assertPedagogicalLineage(next, store.activities.map((activity, activityIndex) => activityIndex === index ? next : activity));
      }
      catch (error) { return sendJson(response, 400, { error: error.message || "Activité invalide." }); }
      store.activities[index] = next;
      store.updatedAt = new Date().toISOString();
      try { await persistActivities(store); }
      catch (error) { console.error(`[data] sauvegarde Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Sauvegarde impossible." }); }
      return sendJson(response, 200, activityResponse(store, next));
    }
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: isDetail ? "GET, PUT, DELETE" : "GET" });
    const store = await readActivities();
    if (url.pathname === "/api/proto05/activities") {
      try {
        return sendJson(response, 200, {
          schemaVersion: store.schemaVersion || "0.1",
          updatedAt: store.updatedAt || null,
          activities: store.activities.map(activityForLibraryResponse)
        });
      } catch (error) {
        const failure = activityProjectionErrorPayload(error, "Projection des activités impossible.");
        return sendJson(response, failure.status, failure.body);
      }
    }
    const id = decodeURIComponent(url.pathname.slice("/api/proto05/activities/".length));
    const activity = store.activities.find((entry) => entry && entry.id === id);
    if (!activity) return sendJson(response, 404, { error: "Activité introuvable." });
    try {
      return sendJson(response, 200, activityResponse(store, activity));
    } catch (error) {
      const failure = activityProjectionErrorPayload(error, "Projection de l’activité impossible.");
      return sendJson(response, failure.status, failure.body);
    }
  }
  return sendJson(response, 404, { error: "Route API introuvable." });
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") return handleApiInReadContext(request, response, url);
  if (["compare", "mariadb-readonly"].includes(DATA_MODE) && !["GET", "HEAD"].includes(request.method)) {
    return sendJson(response, 409, readonlyMutationPayload(DATA_MODE));
  }
  if (DATA_MODE === "json") return handleApiInReadContext(request, response, url);
  if (READ_CONTEXT.getStore()) return handleApiInReadContext(request, response, url);
  try {
    const snapshot = await proto05ReadBoundary().readSnapshot({
      operation: `${request.method} ${url.pathname}`
    });
    return await READ_CONTEXT.run(snapshot, () => handleApiInReadContext(request, response, url));
  } catch (error) {
    console.error(`[data] ${DATA_MODE} ${request.method} ${url.pathname}: ${error.message}`);
    return sendJson(response, 503, {
      code: "PROTO05_READ_BACKEND_UNAVAILABLE",
      error: `Lecture ${DATA_MODE} indisponible.`,
      dataMode: DATA_MODE
    });
  }
}

function hlsPathIsAllowed(url) {
  if (!url.pathname.startsWith(HLS_PREFIX)) return false;
  const suffix = url.pathname.slice(HLS_PREFIX.length);
  return /^uga-37004\/(?:livestream|360p|720p|1080p)\.(?:m3u8|ts)$/.test(suffix);
}

async function fetchRemoteHlsResource(target, request, signal) {
  let current = await validateRemoteCopyUrl(target, { allowHls: true });
  const headers = { accept: request.headers.accept || "*/*" };
  for (const key of ["range", "if-range"]) if (request.headers[key]) headers[key] = request.headers[key];
  for (let hop = 0; hop <= 5; hop += 1) {
    const upstream = await fetch(current, { method: request.method, headers, redirect: "manual", signal });
    if (upstream.status < 300 || upstream.status >= 400) return upstream;
    if (hop === 5) throw new Error("Trop de redirections HLS.");
    const location = upstream.headers.get("location");
    if (!location) throw new Error("Redirection HLS sans destination.");
    current = await validateRemoteCopyUrl(new URL(location, current), { allowHls: true });
  }
  throw new Error("Trop de redirections HLS.");
}

async function handleRemoteLibraryMedia(request, response, url) {
  if (!url.pathname.startsWith(REMOTE_MEDIA_GATEWAY_PREFIX)) return false;
  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, HEAD" });
    return true;
  }
  let playableId;
  try { playableId = decodeURIComponent(url.pathname.slice(REMOTE_MEDIA_GATEWAY_PREFIX.length)); }
  catch { sendJson(response, 400, { error: "Playable distant invalide." }); return true; }
  if (!playableId || playableId.includes("/")) { sendJson(response, 404, { error: "Playable distant introuvable." }); return true; }
  const playable = VIDEO_LIBRARY.playables.find(item => item.id === playableId && item.kind === "direct-url");
  const source = playable && VIDEO_LIBRARY.sources.find(item => item.id === playable.sourceId && item.assetId === playable.assetId);
  const target = remoteUrlForDownload(playable, source);
  if (!target) { sendJson(response, 404, { error: "Playable distant introuvable." }); return true; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_HLS_GATEWAY_TIMEOUT_MS);
  const abort = () => controller.abort();
  request.once("aborted", abort);
  response.once("close", abort);
  try {
    const upstream = await fetchRemoteHlsResource(target, request, controller.signal);
    const contentType = (upstream.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
    if (!(contentType.startsWith("video/") || contentType === "application/octet-stream")) {
      sendJson(response, 502, { error: "La source distante ne renvoie pas une vidéo compatible." });
      return true;
    }
    const relay = { "cache-control": "private, no-store" };
    for (const name of ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) relay[name] = value;
    }
    response.writeHead(upstream.status, relay);
    if (request.method === "HEAD" || !upstream.body) response.end();
    else {
      try { await pipeline(Readable.fromWeb(upstream.body), response); }
      catch (error) {
        const expectedAbort = controller.signal.aborted || request.aborted || response.destroyed || ["ERR_STREAM_PREMATURE_CLOSE", "ECONNRESET", "EPIPE"].includes(error?.code);
        if (!expectedAbort) throw error;
      }
    }
  } catch {
    if (!response.headersSent) sendJson(response, 502, { error: controller.signal.aborted ? "La source distante a dépassé le délai de lecture." : "La source distante est indisponible." });
  } finally {
    clearTimeout(timeout);
    request.removeListener("aborted", abort);
    response.removeListener("close", abort);
  }
  return true;
}

async function handleRemoteLibraryHls(request, response, url) {
  if (!url.pathname.startsWith(REMOTE_HLS_GATEWAY_PREFIX)) return false;
  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET, HEAD" });
    return true;
  }
  const match = /^\/api\/proto05\/library\/remote-hls\/([^/]+)\/(.+)$/.exec(url.pathname);
  if (!match) { sendJson(response, 404, { error: "Ressource HLS distante introuvable." }); return true; }
  let playableId;
  let relativePath;
  try {
    playableId = decodeURIComponent(match[1]);
    relativePath = decodeURIComponent(match[2]);
  } catch { sendJson(response, 400, { error: "Chemin HLS distant invalide." }); return true; }
  if (!relativePath || relativePath.includes("\\") || relativePath.split("/").some(part => !part || part === "." || part === "..")) {
    sendJson(response, 400, { error: "Chemin HLS distant invalide." });
    return true;
  }
  const playable = VIDEO_LIBRARY.playables.find(item => item.id === playableId);
  const source = playable && VIDEO_LIBRARY.sources.find(item => item.id === playable.sourceId && item.assetId === playable.assetId);
  const manifest = remoteHlsManifestUrl(playable, source);
  if (!manifest) { sendJson(response, 404, { error: "Playable HLS distant introuvable." }); return true; }
  const manifestFile = path.posix.basename(manifest.pathname) || "manifest.m3u8";
  let target;
  if (relativePath === manifestFile) target = new URL(manifest);
  else {
    const manifestDirectory = new URL(".", manifest);
    target = new URL(relativePath, manifestDirectory);
    if (target.origin !== manifest.origin || !target.pathname.startsWith(manifestDirectory.pathname)) {
      sendJson(response, 400, { error: "Chemin HLS distant hors du répertoire autorisé." });
      return true;
    }
    target.search = url.search;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_HLS_GATEWAY_TIMEOUT_MS);
  const abort = () => controller.abort();
  request.once("aborted", abort);
  response.once("close", abort);
  try {
    const upstream = await fetchRemoteHlsResource(target, request, controller.signal);
    const contentType = (upstream.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
    const allowedType = contentType.startsWith("video/")
      || contentType.startsWith("audio/")
      || ["application/vnd.apple.mpegurl", "application/x-mpegurl", "application/mpegurl", "application/octet-stream"].includes(contentType);
    if (!allowedType) {
      sendJson(response, 502, { error: "La ressource HLS distante renvoie un type de contenu incompatible." });
      return true;
    }
    const relay = { "cache-control": "private, max-age=60" };
    for (const name of ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) relay[name] = value;
    }
    response.writeHead(upstream.status, relay);
    if (request.method === "HEAD" || !upstream.body) response.end();
    else {
      try { await pipeline(Readable.fromWeb(upstream.body), response); }
      catch (error) {
        const expectedAbort = controller.signal.aborted || request.aborted || response.destroyed || ["ERR_STREAM_PREMATURE_CLOSE", "ECONNRESET", "EPIPE"].includes(error?.code);
        if (!expectedAbort) throw error;
      }
    }
  } catch (error) {
    if (!response.headersSent) sendJson(response, 502, { error: controller.signal.aborted ? "La source HLS distante a dépassé le délai de lecture." : "La source HLS distante est indisponible." });
  } finally {
    clearTimeout(timeout);
    request.removeListener("aborted", abort);
    response.removeListener("close", abort);
  }
  return true;
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
    const relativeHlsPath = url.pathname.slice(`${HLS_PREFIX}uga-37004/`.length);
    upstream = await fetch(new URL(relativeHlsPath + url.search, UGA_HLS_MEDIA_ORIGIN), { method: request.method, headers, redirect: "manual", signal: controller.signal });
  } catch (error) {
    if (!controller.signal.aborted) console.error(`[hls-gateway] ${error.message}`);
    if (!response.headersSent) sendJson(response, 502, { error: "La source HLS UGA est indisponible." });
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
  if (/^\/teacher\/videos\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-video-detail.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/anonymization\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-anonymization.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/author\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-author.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/guided\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-guided.html");
    const file = Buffer.from((await fs.readFile(target, "utf8")).replace("</head>", "<script src=\"/shared/ic-video-player.js\"></script></head>").replace("</body>", "<script>attachVideo=()=>{upgradeICVideoElement(video,state.activity.videoSource).catch(error=>$('#status').textContent=error.message)};</script></body>"));
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
    if (isTeacherPreviewRoute) {
      const file = Buffer.from((await fs.readFile(target, "utf8")).replace(
        "</head>",
        "  <script src=\"/shared/teacher-shell.js\" defer></script>\n</head>"
      ));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
      return request.method === "HEAD" ? response.end() : response.end(file);
    }
    response.writeHead(200, { "content-type": STATIC_TYPES[extension] || "application/octet-stream", "content-length": stat.size });
    if (request.method === "HEAD") return response.end();
    return await pipeline((await import("node:fs")).createReadStream(target), response);
  } catch {
    return sendJson(response, 404, { error: "Ressource introuvable." });
  }
}

function requestNeedsReadContext(request, url) {
  if (DATA_MODE === "json" || READ_CONTEXT.getStore()) return false;
  if (!["GET", "HEAD"].includes(request.method)) return false;
  if (!url.pathname.startsWith("/api/")) return false;
  return !(
    url.pathname === "/api/health"
    || url.pathname.startsWith("/api/hls/")
    || url.pathname.startsWith("/api/proto05/library/media/")
    || url.pathname.match(/^\/api\/proto05\/library\/hls-preparations\/[^/]+\/media$/)
  );
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const routeRequest = async () => {
    if (await servePreparationMedia(request, response, url)) return;
    if (await serveLibraryMedia(request, response, url)) return;
    if (await handleRemoteLibraryMedia(request, response, url)) return;
    if (await handleRemoteLibraryHls(request, response, url)) return;
    if (await handleHlsGateway(request, response, url)) return;
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
    return await serveStatic(request, response, url);
  };
  try {
    if (requestNeedsReadContext(request, url)) {
      const snapshot = await proto05ReadBoundary().readSnapshot({
        operation: `${request.method} ${url.pathname}`
      });
      return await READ_CONTEXT.run(snapshot, routeRequest);
    }
    return await routeRequest();
  } catch (error) {
    console.error(`[server] ${request.method} ${url.pathname}: ${error.stack || error.message}`);
    if (!response.headersSent) sendJson(response, 500, { error: error.message || "Erreur serveur." });
  }
});

let shutdownPromise = null;
async function shutdownServer(signal) {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    console.log(`[shutdown] ${signal}: arrêt des téléchargements de la Library.`);
    await shutdownLibraryDownloads();
    await READ_BOUNDARY?.close?.();
    await new Promise(resolve => {
      const force = setTimeout(() => server.closeAllConnections?.(), 500);
      force.unref();
      server.close(() => { clearTimeout(force); resolve(); });
      server.closeIdleConnections?.();
    });
  })();
  return shutdownPromise;
}

process.once("SIGINT", () => { void shutdownServer("SIGINT").finally(() => process.exit(0)); });
process.once("SIGTERM", () => { void shutdownServer("SIGTERM").finally(() => process.exit(0)); });

Promise.all(DATA_MODE === "json"
  ? [
      fs.rm(LIBRARY_DOWNLOAD_ROOT, { recursive: true, force: true }),
      cleanupIncompleteWorkspaceDownloads()
    ]
  : []
)
  .then(() => proto05ReadBoundary().verify())
  .then(() => server.listen(PORT, "127.0.0.1", () => console.log(`[startup] ${SERVICE} ${VERSION} (${DATA_MODE}) sur http://127.0.0.1:${PORT}/`)))
  .catch(error => {
    console.error(`[startup] ${error.message}`);
    process.exitCode = 1;
  });
