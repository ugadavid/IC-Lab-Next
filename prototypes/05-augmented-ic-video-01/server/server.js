const http = require("node:http");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const PORT = Number(process.env.PORT || 8791);
const VERSION = "0.1.7";
const SERVICE = "proto05-augmented-video";
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "activities.json");
const INDEX_FILE = "index-0.0.8.html";
const HUB_HLS_ORIGIN = "http://127.0.0.1:8790";
const HLS_JS_ASSET_PATH = path.resolve(ROOT_DIR, "..", "00-ic-hub", "server", "node_modules", "hls.js", "dist", "hls.min.js");
const HLS_PREFIX = "/api/hls/";
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
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t"
});
const VIDEO_CATALOG = Object.freeze([
  Object.freeze({
    id: "video-proto05-uga-37004",
    title: "Vidéo augmentée IC — source UGA",
    source: "UGA",
    sourceType: "hls-proxy",
    key: "uga-37004/livestream.m3u8",
    proxyUrl: "/api/hls/uga-37004/livestream.m3u8",
    mimeType: "application/vnd.apple.mpegurl",
    durationMs: 939217,
    authorized: true
  })
]);
let writeQueue = Promise.resolve();

function sendJson(response, status, payload, headers = {}) {
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
    return parsed;
  } catch (error) {
    console.error(`[data] lecture impossible : ${error.message}`);
    throw new Error("Données Proto05 absentes ou JSON invalide.");
  }
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
  const allowed = new Set(["title", "description", "instruction", "pedagogicalQuestion", "videoId"]);
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
  return payload;
}

function integerTime(value, label, durationMs = Infinity) {
  if (!Number.isInteger(value) || value < 0 || value > durationMs) throw new Error(`${label} doit être un entier positif dans la durée vidéo.`);
}

function validateAuthoringPatch(payload, current) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le corps JSON doit être un objet.");
  const allowed = new Set(["title", "description", "instruction", "pedagogicalQuestion", "videoId", "segments", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "layerConfiguration"]);
  const unknown = Object.keys(payload).filter(key => !allowed.has(key));
  if (unknown.length) throw new Error(`Champ non autorisé : ${unknown.join(", ")}.`);
  const metadata = validateMetadataPatch(Object.fromEntries(Object.entries(payload).filter(([key]) => ["title", "description", "instruction", "pedagogicalQuestion", "videoId"].includes(key))));
  const durationMs = current.video?.durationMs || Infinity;
  const availableLanguages = new Set((payload.languages || current.languages || []).map(item => item.id));
  const availableLayers = new Set((payload.layers || current.layers || []).map(item => item.id));
  const availableSegments = new Set((payload.segments || current.segments || []).map(item => item.id));
  if ([...availableLayers].some(id => !id) || (payload.layers && availableLayers.size !== payload.layers.length)) throw new Error("Les identifiants de couches doivent être uniques.");
  if (payload.segments !== undefined) {
    if (!Array.isArray(payload.segments)) throw new Error("segments doit être un tableau.");
    for (const segment of payload.segments) {
      if (!segment || typeof segment.id !== "string" || !segment.id || typeof segment.text !== "string") throw new Error("Segment invalide.");
      integerTime(segment.startMs, "startMs", durationMs); integerTime(segment.endMs, "endMs", durationMs);
      if (segment.startMs >= segment.endMs) throw new Error("Chaque segment doit commencer avant sa fin.");
      if (!Array.isArray(segment.languageIds) || !Array.isArray(segment.speakerIds)) throw new Error("Les références d’un segment sont invalides.");
      if (segment.languageIds.some(id => !availableLanguages.has(id))) throw new Error("Un segment référence une langue inconnue.");
      if (segment.speakerIds.some(id => !(current.speakers || []).some(speaker => speaker.id === id))) throw new Error("Un segment référence un locuteur inconnu.");
    }
  }
  if (payload.languageIntervals !== undefined) {
    if (!Array.isArray(payload.languageIntervals)) throw new Error("languageIntervals doit être un tableau.");
    const intervalIds = new Set();
    for (const interval of payload.languageIntervals) { if (!interval?.id || intervalIds.has(interval.id) || !interval?.languageId || !availableLanguages.has(interval.languageId) || (interval.segmentId && !availableSegments.has(interval.segmentId))) throw new Error("Intervalle linguistique invalide."); intervalIds.add(interval.id); integerTime(interval.startMs, "startMs", durationMs); integerTime(interval.endMs, "endMs", durationMs); if (interval.startMs >= interval.endMs) throw new Error("Un intervalle doit commencer avant sa fin."); }
  }
  if (payload.phenomena !== undefined) {
    if (!Array.isArray(payload.phenomena)) throw new Error("phenomena doit être un tableau.");
    for (const phenomenon of payload.phenomena) { if (!phenomenon?.id || !phenomenon?.layerId || !availableLayers.has(phenomenon.layerId) || (phenomenon.segmentId && !availableSegments.has(phenomenon.segmentId))) throw new Error("Occurrence de phénomène invalide."); integerTime(phenomenon.startMs, "startMs", durationMs); integerTime(phenomenon.endMs, "endMs", durationMs); if (phenomenon.startMs >= phenomenon.endMs) throw new Error("Une occurrence doit commencer avant sa fin."); }
  }
  for (const key of ["languages", "layers", "teacherAnnotations", "layerConfiguration"]) if (payload[key] !== undefined && (typeof payload[key] !== "object" || payload[key] === null)) throw new Error(`${key} invalide.`);
  if (payload.teacherAnnotations && payload.teacherAnnotations.some(annotation => annotation.segmentId && !availableSegments.has(annotation.segmentId))) throw new Error("Une annotation référence un segment inconnu.");
  return metadata;
}

function draftActivity(videoId, metadata = {}) {
  const video = VIDEO_CATALOG.find(entry => entry.id === videoId && entry.authorized);
  if (!video) throw new Error("La vidéo sélectionnée n’est pas autorisée.");
  const id = `proto05-draft-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  return { id, version: "0.1.0", status: "draft", title: metadata.title || "Nouvelle activité", description: metadata.description || "", instruction: metadata.instruction || "", pedagogicalQuestion: metadata.pedagogicalQuestion || "", video: { id: video.id, title: video.title, kind: "hls", proxyUrl: video.proxyUrl, durationMs: video.durationMs }, transcription: { id: `transcription-${id}`, languageId: "lang-fr", segmentIds: [] }, segments: [], speakers: [], languages: [], languageIntervals: [], layers: [], phenomena: [], teacherAnnotations: [], layerConfiguration: { id: `layer-config-${id}`, defaultVisibleLayerIds: [], learnerVisibleLayerIds: [], teacherVisibleLayerIds: [], allowLearnerToggle: true } };
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

function activityResponse(store, activity) {
  return { schemaVersion: store.schemaVersion || "0.1", updatedAt: store.updatedAt || null, activity };
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    return sendJson(response, 200, { ok: true, service: SERVICE, version: VERSION, port: PORT });
  }
  if (url.pathname === "/api/proto05/video-catalog") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    return sendJson(response, 200, { videos: VIDEO_CATALOG });
  }
  if (url.pathname === "/api/proto05/activities" && request.method === "POST") {
    let payload;
    try { payload = validateMetadataPatch(JSON.parse(await readRequestBody(request))); }
    catch (error) { return sendJson(response, 400, { error: error.message || "Requête JSON invalide." }); }
    const store = await readActivities();
    let activity;
    try { activity = draftActivity(payload.videoId, payload); }
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
      let payload; try { payload = JSON.parse(await readRequestBody(request)); validateAuthoringPatch(payload, store.activities[index]); } catch (error) { return sendJson(response, 400, { error: error.message || "Données d’atelier invalides." }); }
      const current = store.activities[index]; const next = { ...current };
      for (const key of ["title", "description", "instruction", "pedagogicalQuestion", "segments", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "layerConfiguration"]) if (payload[key] !== undefined) next[key] = payload[key];
      if (payload.videoId !== undefined) { const video = VIDEO_CATALOG.find(entry => entry.id === payload.videoId); next.video = { ...current.video, id: video.id, title: video.title, proxyUrl: video.proxyUrl, durationMs: video.durationMs }; }
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
        next.video = { ...current.video, id: video.id, title: video.title, kind: "hls", proxyUrl: video.proxyUrl, durationMs: video.durationMs };
      }
      store.activities[index] = next;
      store.updatedAt = new Date().toISOString();
      try { await persistActivities(store); }
      catch (error) { console.error(`[data] sauvegarde Proto05 impossible : ${error.message}`); return sendJson(response, 500, { error: "Sauvegarde JSON impossible." }); }
      return sendJson(response, 200, activityResponse(store, next));
    }
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: isDetail ? "GET, PUT" : "GET" });
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
  if (/^\/teacher\/author\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-author.html"); const file = await fs.readFile(target);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": file.length });
    return request.method === "HEAD" ? response.end() : response.end(file);
  }
  if (/^\/teacher\/guided\/[^/]+$/.test(url.pathname)) {
    const target = path.join(ROOT_DIR, "teacher-guided.html"); const file = await fs.readFile(target);
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
    if (await handleHlsGateway(request, response, url)) return;
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
    return await serveStatic(request, response, url);
  } catch (error) {
    console.error(`[server] ${request.method} ${url.pathname}: ${error.stack || error.message}`);
    if (!response.headersSent) sendJson(response, 500, { error: error.message || "Erreur serveur." });
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`[startup] ${SERVICE} ${VERSION} sur http://127.0.0.1:${PORT}/`));
