const http = require("node:http");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const PORT = Number(process.env.PORT || 8791);
const VERSION = "0.1.15";
const SERVICE = "proto05-augmented-video";
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "activities.json");
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
  const durationMs = activity.video?.durationMs || Infinity;
  const identifiers = {
    speakers: collectionIdentifiers(activity, "speakers", "Chaque locuteur"),
    languages: collectionIdentifiers(activity, "languages", "Chaque langue"),
    segments: collectionIdentifiers(activity, "segments", "Chaque segment"),
    languageIntervals: collectionIdentifiers(activity, "languageIntervals", "Chaque intervalle linguistique"),
    layers: collectionIdentifiers(activity, "layers", "Chaque couche"),
    phenomena: collectionIdentifiers(activity, "phenomena", "Chaque phénomène"),
    teacherAnnotations: collectionIdentifiers(activity, "teacherAnnotations", "Chaque annotation")
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
    if (annotation.segmentId && !identifiers.segments.has(annotation.segmentId)) throw new Error(`L’annotation ${annotation.id} référence un segment inexistant : ${annotation.segmentId}.`);
    if (annotation.speakerId !== undefined && (typeof annotation.speakerId !== "string" || !identifiers.speakers.has(annotation.speakerId))) {
      throw new Error(`L’annotation ${annotation.id} référence un locuteur inexistant : ${String(annotation.speakerId)}.`);
    }
    if (annotation.speakerIds !== undefined) validateReferences(annotation.speakerIds, identifiers.speakers, `L’annotation ${annotation.id} (locuteurs)`);
    if (annotation.overlay !== undefined && annotation.overlay !== null) {
      requireObject(annotation.overlay, `L’overlay de l’annotation ${annotation.id}`);
      validateReferences(annotation.overlay.layerIds, identifiers.layers, `L’overlay de l’annotation ${annotation.id} (couches)`);
    }
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
  const allowed = new Set(["title", "description", "instruction", "pedagogicalQuestion", "videoId", "segments", "speakers", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "layerConfiguration"]);
  const unknown = Object.keys(payload).filter(key => !allowed.has(key));
  if (unknown.length) throw new Error(`Champ non autorisé : ${unknown.join(", ")}.`);
  validateMetadataPatch(Object.fromEntries(Object.entries(payload).filter(([key]) => ["title", "description", "instruction", "pedagogicalQuestion", "videoId"].includes(key))));
  const next = { ...current };
  for (const key of ["title", "description", "instruction", "pedagogicalQuestion", "segments", "speakers", "languages", "languageIntervals", "phenomena", "layers", "teacherAnnotations", "layerConfiguration"]) if (payload[key] !== undefined) next[key] = payload[key];
  if (payload.videoId !== undefined) {
    const video = VIDEO_CATALOG.find(entry => entry.id === payload.videoId && entry.authorized);
    next.video = { ...current.video, id: video.id, title: video.title, kind: "hls", proxyUrl: video.proxyUrl, durationMs: video.durationMs };
  }
  validateSharedLanguageSelection(next.languages);
  validateActivityIntegrity(next);
  return next;
}

function draftActivity(videoId, metadata = {}) {
  const video = VIDEO_CATALOG.find(entry => entry.id === videoId && entry.authorized);
  if (!video) throw new Error("La vidéo sélectionnée n’est pas autorisée.");
  const id = `proto05-draft-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  return { id, version: "0.1.0", status: "draft", title: metadata.title || "Nouvelle activité", description: metadata.description || "", instruction: metadata.instruction || "", pedagogicalQuestion: metadata.pedagogicalQuestion || "", video: { id: video.id, title: video.title, kind: "hls", proxyUrl: video.proxyUrl, durationMs: video.durationMs }, transcription: { id: `transcription-${id}`, languageId: null, segmentIds: [] }, segments: [], speakers: [], languages: [], languageIntervals: [], layers: [], phenomena: [], teacherAnnotations: [], layerConfiguration: { id: `layer-config-${id}`, defaultVisibleLayerIds: [], learnerVisibleLayerIds: [], teacherVisibleLayerIds: [], allowLearnerToggle: true } };
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
    segmentId: remapReferences([annotation.segmentId], segments.identifiers, "segmentId")[0],
    ...(annotation.overlay && typeof annotation.overlay === "object" ? {
      overlay: {
        ...annotation.overlay,
        layerIds: remapReferences(annotation.overlay.layerIds || [], layers.identifiers, "overlay.layerIds")
      }
    } : {})
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
  if (url.pathname === "/api/proto05/language-catalog") {
    if (request.method !== "GET") return sendJson(response, 405, { error: "Méthode non autorisée." }, { allow: "GET" });
    return sendJson(response, 200, { languages: LANGUAGE_CATALOG });
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
    try { activity = draftActivity(payload.videoId, payload); validateActivityIntegrity(activity); }
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
        next.video = { ...current.video, id: video.id, title: video.title, kind: "hls", proxyUrl: video.proxyUrl, durationMs: video.durationMs };
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
