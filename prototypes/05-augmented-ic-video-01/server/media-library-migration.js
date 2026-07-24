"use strict";

/**
 * Pure migration core for the historical Proto05 media-library 0.1 shape.
 *
 * This module deliberately has no filesystem, path, network, process, clock or
 * application-route dependency. All observations and dates are supplied by the
 * caller. It returns a new object graph and never mutates its arguments.
 */

const crypto = require("crypto");
const { validateMediaLibrary } = require("./media-library-schema");

const LEGACY_SCHEMA_VERSION = "0.1";
const TARGET_SCHEMA_VERSION = "1.0";
const DEFAULT_MIGRATION_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,160}$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(seed) {
  return crypto.createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 32);
}

function diagnostic(diagnostics, code, severity, path, message, details = {}) {
  diagnostics.push({ code, severity, path, message, blocking: severity === "error", requiresDecision: ["ambiguous", "error"].includes(severity), details });
}

function dateFrom(...values) {
  for (const value of values) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !Number.isNaN(Date.parse(value))) return value.length === 20 ? value.replace("Z", ".000Z") : value;
  }
  return null;
}

function ensureTimestamp(options, diagnostics) {
  const supplied = options && options.defaultTimestamp;
  const timestamp = dateFrom(supplied) || DEFAULT_MIGRATION_TIMESTAMP;
  if (!dateFrom(supplied)) diagnostic(diagnostics, "DEFAULTED_DATE", "warning", "options.defaultTimestamp", "Une date historique absente est remplacée par une date de migration déterministe.", { rule: "fixed-default-timestamp" });
  return timestamp;
}

function validHistoricalId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function generatedId(type, historicalId, role, used) {
  const prefix = { asset: "asset", source: "source", playable: "playable", treatment: "treatment", folder: "folder", tag: "tag" }[type] || type;
  const base = `${prefix}-${digest(`${LEGACY_SCHEMA_VERSION}|${type}|${historicalId || "missing"}|${role}`)}`;
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) candidate = `${base}-${suffix++}`;
  used.add(candidate);
  return candidate;
}

function chooseId(type, historicalId, role, used, diagnostics, path) {
  if (validHistoricalId(historicalId) && !used.has(historicalId)) {
    used.add(historicalId);
    return historicalId;
  }
  if (historicalId !== undefined && historicalId !== null) {
    diagnostic(diagnostics, used.has(historicalId) ? "DUPLICATE_HISTORICAL_ID" : "INVALID_HISTORICAL_ID", "error", `${path}.id`, "L’identifiant historique ne peut pas être préservé dans cet espace canonique.", { historicalId: String(historicalId), type });
    return null;
  }
  diagnostic(diagnostics, "MISSING_HISTORICAL_ID", "error", `${path}.id`, "L’identifiant historique obligatoire est absent.", { type });
  return null;
}

function sourceKind(source) {
  if (source?.kind === "local-file" && (source.provider === "proto05-derived" || source.provenance?.kind === "derived-anonymized")) return "derived-output";
  return source?.kind;
}

function playableKind(source) {
  return sourceKind(source) === "derived-output" ? "local-file" : sourceKind(source);
}

function transportFor(source, sourceKindValue) {
  if (sourceKindValue === "hls") return "hls";
  if (sourceKindValue === "youtube-embed") return "youtube-iframe";
  if (sourceKindValue === "direct-url") {
    try { return new URL(source.url || source.originUrl || source.sourceUrl).protocol === "https:" ? "https" : "http"; } catch { return "http"; }
  }
  return "file";
}

function basename(value) {
  if (typeof value !== "string" || !value) return null;
  return value.replace(/\\/g, "/").split("/").pop() || null;
}

function safeHistoricalProvenance(value) {
  if (!isObject(value)) return {};
  const allowed = ["kind", "catalogId", "sourceAssetId", "sourcePreparationJobId", "method", "mode", "status", "createdAt", "importedAt", "sha256", "sizeBytes", "originalFileName", "derivationTypes", "blur", "masks", "temporalMasks", "temporalSteps", "parentAssetId", "familyRootAssetId", "sourcePlayableId", "ffmpegVersion"];
  const result = {};
  for (const key of allowed) if (value[key] !== undefined) result[key] = clone(value[key]);
  if (value.originalPath || value.copiedPath) result.pathsRedacted = true;
  return result;
}

function sourceOrigin(source) {
  const provenance = source?.provenance || {};
  const origin = {};
  for (const key of ["originUrl", "sourceUrl", "url", "manifestUrl", "proxyUrl", "embedUrl", "videoId", "fileName", "originalFileName"]) {
    if (source?.[key] !== undefined) origin[key] = source[key];
  }
  if (!origin.fileName && !origin.originalFileName) origin.originalFileName = basename(provenance.originalFileName);
  if (source?.storageKey) origin.declaredLocal = true;
  return origin;
}

function technicalMetadata(asset, source, playable) {
  const metadata = isObject(asset?.metadata) ? asset.metadata : {};
  const value = {
    durationMs: source?.durationMs ?? playable?.durationMs ?? metadata.durationMs ?? null,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    frameRate: metadata.frameRate ?? null,
    videoCodec: metadata.videoCodec ?? null,
    audioCodec: metadata.audioCodec ?? null,
    hasAudio: metadata.hasAudio ?? null,
    mimeType: source?.mimeType ?? playable?.mimeType ?? metadata.mimeType ?? null,
    sizeBytes: source?.sizeBytes ?? playable?.sizeBytes ?? metadata.sizeBytes ?? null,
    sha256: source?.sha256 ?? playable?.sha256 ?? metadata.sha256 ?? null,
    analyzedAt: metadata.analyzedAt ?? null,
    analyzer: metadata.analyzer ?? null,
    analyzerVersion: metadata.analyzerVersion ?? null,
    error: metadata.error ?? null
  };
  return value;
}

function observationMap(snapshot) {
  const entries = Array.isArray(snapshot?.observations) ? snapshot.observations : Array.isArray(snapshot) ? snapshot : [];
  return new Map(entries.filter(entry => isObject(entry) && typeof entry.storageKey === "string").map(entry => [entry.storageKey, entry]));
}

function localAvailability(source, snapshot, diagnostics, path) {
  const key = source.storageKey;
  const observation = observationMap(snapshot).get(key);
  if (!observation) {
    diagnostic(diagnostics, "AVAILABILITY_OBSERVATION_MISSING", "unavailable", path, "Aucune observation locale n’est fournie pour ce fichier.", { storageKey: "redacted" });
    return { availability: "unknown", availabilityReason: null };
  }
  if (observation.status === "present") return { availability: "available", availabilityReason: null };
  if (observation.status === "absent") {
    diagnostic(diagnostics, "LOCAL_FILE_MISSING", "unavailable", path, "Le fichier local référencé est absent; le playable est conservé.", { storageKey: "redacted" });
    return { availability: "missing-local", availabilityReason: "missing-file" };
  }
  if (observation.status === "contradictory") diagnostic(diagnostics, "AVAILABILITY_OBSERVATION_CONTRADICTORY", "ambiguous", path, "L’observation locale est contradictoire.");
  else diagnostic(diagnostics, "AVAILABILITY_OBSERVATION_UNAVAILABLE", "unavailable", path, "La présence locale n’est pas observable.");
  return { availability: "unknown", availabilityReason: null };
}

function remoteAvailability(source, diagnostics, path) {
  diagnostic(diagnostics, "REMOTE_AVAILABILITY_UNOBSERVED", "unavailable", path, "La disponibilité distante n’est pas sondée pendant la migration.");
  return { availability: "unknown", availabilityReason: null };
}

function defaultPlayable(assetId, candidates, historicalPreferred, availabilityById, diagnostics, path) {
  if (validHistoricalId(historicalPreferred) && candidates.some(item => item.id === historicalPreferred)) {
    const preferred = candidates.find(item => item.id === historicalPreferred);
    if (preferred && preferred.availability !== "missing-local" && preferred.availability !== "blocked") return preferred.id;
    diagnostic(diagnostics, "DEFAULT_PLAYABLE_UNAVAILABLE", "warning", path, "Le playable historiquement préféré est indisponible; une sélection technique peut être nécessaire.", { assetId });
  }
  const available = candidates.filter(item => item.availability === "available" || item.availability === "unknown").sort((a, b) => a.id.localeCompare(b.id));
  if (!available.length) return null;
  if (available.length > 1) diagnostic(diagnostics, "DEFAULT_PLAYABLE_TIEBROKEN", "warning", path, "Plusieurs playables sont admissibles; le choix est déterminé par l’identifiant.", { assetId });
  return available[0].id;
}

function detectSource(value, diagnostics) {
  if (!isObject(value)) {
    diagnostic(diagnostics, "SOURCE_NOT_OBJECT", "error", "$", "La source historique doit être un objet.");
    return "unknown";
  }
  if (value.schemaVersion === LEGACY_SCHEMA_VERSION && Array.isArray(value.assets) && Array.isArray(value.sources) && Array.isArray(value.playables)) return "legacy-0.1";
  if (/^[0-9]+\.[0-9]+$/.test(String(value.schemaVersion || "")) && Number(value.schemaVersion.split(".")[0]) >= 1) return "canonical";
  if (value.schemaVersion === undefined) diagnostic(diagnostics, "SOURCE_VERSION_MISSING", "error", "schemaVersion", "La version historique est absente.");
  else diagnostic(diagnostics, "SOURCE_VERSION_INVALID", "error", "schemaVersion", "La version historique est invalide ou inconnue.");
  return "unknown";
}

function emptyResult(sourceVersion, diagnostics, validationResult = null) {
  const output = null;
  return {
    output,
    sourceVersion,
    targetVersion: TARGET_SCHEMA_VERSION,
    migrated: false,
    transformationProduced: false,
    valid: false,
    readable: Boolean(validationResult?.readable),
    writeEligible: false,
    requiresUnknownFieldPreservation: Boolean(validationResult?.requiresUnknownFieldPreservation),
    diagnostics,
    mappings: { assets: [], sources: [], playables: [], treatments: [] },
    activityReferenceMappings: [],
    validationResult,
    statistics: { assets: 0, sources: 0, playables: 0, localPresent: 0, localMissing: 0, treatments: 0, deferredTreatments: 0, omittedEntries: 0 },
    dryRunExecuted: false,
    realMigrationPerformed: false,
    persistedInFunctionalLocation: false
  };
}

function migrateLegacyMediaLibrary({ legacyDocument, availabilitySnapshot = { observations: [] }, options = {} } = {}) {
  const diagnostics = [];
  const sourceKindValue = detectSource(legacyDocument, diagnostics);
  if (sourceKindValue === "canonical") {
    diagnostic(diagnostics, "CANONICAL_SOURCE_NOT_REMIGRATED", "error", "schemaVersion", "Le document est déjà canonique et ne doit pas être remigré.");
    return emptyResult(legacyDocument?.schemaVersion || null, diagnostics, null);
  }
  if (sourceKindValue !== "legacy-0.1") return emptyResult(legacyDocument?.schemaVersion || null, diagnostics, null);
  const timestamp = ensureTimestamp(options, diagnostics);
  const assetsHistory = clone(legacyDocument.assets);
  const sourcesHistory = clone(legacyDocument.sources);
  const playablesHistory = clone(legacyDocument.playables);
  const byAsset = new Map(assetsHistory.map(item => [item?.id, item]));
  const bySource = new Map(sourcesHistory.map(item => [item?.id, item]));
  const byPlayable = new Map(playablesHistory.map(item => [item?.id, item]));
  const assetIds = new Set();
  const sourceIds = new Set();
  const playableIds = new Set();
  const assetIdMap = new Map();
  const sourceIdMap = new Map();
  const playableIdMap = new Map();
  const mappings = { assets: [], sources: [], playables: [], treatments: [] };
  let fatalIdentityError = false;
  for (const [index, item] of assetsHistory.entries()) { const id = chooseId("asset", item?.id, "logical-asset", assetIds, diagnostics, `assets[${index}]`); if (!id) fatalIdentityError = true; else assetIdMap.set(item.id, id); }
  for (const [index, item] of sourcesHistory.entries()) { const id = chooseId("source", item?.id, "origin", sourceIds, diagnostics, `sources[${index}]`); if (!id) fatalIdentityError = true; else sourceIdMap.set(item.id, id); }
  for (const [index, item] of playablesHistory.entries()) { const id = chooseId("playable", item?.id, "representation", playableIds, diagnostics, `playables[${index}]`); if (!id) fatalIdentityError = true; else playableIdMap.set(item.id, id); }
  if (fatalIdentityError) return emptyResult(LEGACY_SCHEMA_VERSION, diagnostics, null);

  const canonicalAssets = [];
  const canonicalSources = [];
  const canonicalPlayables = [];
  const playablesByAsset = new Map();
  const localSnapshot = observationMap(availabilitySnapshot);

  for (const [index, source] of sourcesHistory.entries()) {
    if (!byAsset.has(source.assetId)) { diagnostic(diagnostics, "SOURCE_REFERENCE_ORPHAN", "error", `sources[${index}].assetId`, "La source historique référence un asset absent.", { historicalId: source.id }); continue; }
    const targetSourceId = sourceIdMap.get(source.id);
    const kind = sourceKind(source);
    if (!["local-file", "direct-url", "hls", "youtube-embed", "derived-output"].includes(kind)) { diagnostic(diagnostics, "SOURCE_KIND_UNMAPPED", "error", `sources[${index}].kind`, "Le type de source historique n’est pas pris en charge.", { historicalKind: source.kind }); continue; }
    const createdAt = dateFrom(source.provenance?.createdAt, source.provenance?.importedAt, legacyDocument.updatedAt) || timestamp;
    const sourceRecord = {
      id: targetSourceId,
      assetId: assetIdMap.get(source.assetId),
      kind,
      provider: source.provider || "unknown",
      origin: sourceOrigin(source),
      transport: transportFor(source, kind),
      mimeType: source.mimeType ?? null,
      provenance: { legacyId: source.id, historical: safeHistoricalProvenance(source.provenance) },
      createdAt
    };
    canonicalSources.push(sourceRecord);
    mappings.sources.push({ historicalId: source.id, canonicalId: targetSourceId, status: "normalized", sourceKind: kind });
  }

  for (const [index, playable] of playablesHistory.entries()) {
    const source = bySource.get(playable.sourceId);
    if (!source || !byAsset.has(playable.assetId) || source.assetId !== playable.assetId) { diagnostic(diagnostics, "PLAYABLE_REFERENCE_ORPHAN", "error", `playables[${index}]`, "Le playable historique ne possède pas une relation asset/source cohérente.", { historicalId: playable.id }); continue; }
    const sourceTarget = canonicalSources.find(item => item.id === sourceIdMap.get(source.id));
    if (!sourceTarget) continue;
    const kind = playableKind(source);
    const createdAt = dateFrom(playable.provenance?.createdAt, playable.provenance?.importedAt, source.provenance?.createdAt, legacyDocument.updatedAt) || timestamp;
    const availability = source.storageKey || playable.storageKey ? localAvailability({ storageKey: playable.storageKey || source.storageKey }, availabilitySnapshot, diagnostics, `playables[${index}].availability`) : remoteAvailability(source, diagnostics, `playables[${index}].availability`);
    const location = kind === "local-file"
      ? { storageKey: playable.storageKey || source.storageKey }
      : kind === "youtube-embed"
        ? { embedUrl: playable.embedUrl || source.embedUrl, videoId: playable.videoId || source.videoId }
        : kind === "hls"
          ? { url: playable.url || playable.manifestUrl || source.proxyUrl || source.manifestUrl || source.originUrl, manifestUrl: playable.manifestUrl || source.manifestUrl || source.originUrl }
          : { url: playable.url || playable.originUrl || source.url || source.originUrl };
    const playableRecord = {
      id: playableIdMap.get(playable.id),
      assetId: assetIdMap.get(playable.assetId),
      sourceId: sourceTarget.id,
      kind,
      provider: source.provider || null,
      availability: availability.availability,
      availabilityReason: availability.availabilityReason,
      location,
      technicalMetadata: technicalMetadata(byAsset.get(playable.assetId), source, playable),
      provenance: { legacyId: playable.id, historical: safeHistoricalProvenance(playable.provenance) },
      createdAt,
      updatedAt: createdAt
    };
    canonicalPlayables.push(playableRecord);
    if (!playablesByAsset.has(playableRecord.assetId)) playablesByAsset.set(playableRecord.assetId, []);
    playablesByAsset.get(playableRecord.assetId).push(playableRecord);
    mappings.playables.push({ historicalId: playable.id, canonicalId: playableRecord.id, status: "normalized", kind });
  }

  const parentMap = new Map();
  for (const [index, asset] of assetsHistory.entries()) {
    const id = assetIdMap.get(asset.id);
    const provenance = isObject(asset.provenance) ? asset.provenance : {};
    let parentAssetId = null;
    if (validHistoricalId(provenance.parentAssetId) && assetIdMap.has(provenance.parentAssetId)) parentAssetId = assetIdMap.get(provenance.parentAssetId);
    else if (provenance.sourceAssetId) diagnostic(diagnostics, "FAMILY_PARENT_UNPROVABLE", "ambiguous", `assets[${index}].provenance.sourceAssetId`, "La provenance indique une origine, mais ne prouve pas le parent immédiat.", { historicalId: asset.id });
    parentMap.set(id, parentAssetId);
  }
  const familyRootFor = id => { const seen = new Set(); let current = id; while (parentMap.get(current)) { if (seen.has(current)) return null; seen.add(current); current = parentMap.get(current); } return current; };
  for (const [index, asset] of assetsHistory.entries()) {
    const id = assetIdMap.get(asset.id);
    const parentAssetId = parentMap.get(id) || null;
    const root = familyRootFor(id);
    if (!root) diagnostic(diagnostics, "FAMILY_CYCLE", "error", `assets[${index}].provenance`, "Le lignage historique forme un cycle.", { historicalId: asset.id });
    const derived = asset.provenance?.kind === "derived-anonymized" || asset.provenance?.derivationTypes?.includes?.("anonymization");
    const createdAt = dateFrom(asset.provenance?.createdAt, asset.provenance?.importedAt, legacyDocument.updatedAt) || timestamp;
    const candidates = playablesByAsset.get(id) || [];
    const defaultId = defaultPlayable(id, candidates, asset.defaultPlayableId && playableIdMap.get(asset.defaultPlayableId), new Map(candidates.map(item => [item.id, item.availability])), diagnostics, `assets[${index}].defaultPlayableId`);
    const familyRootAssetId = root || id;
    canonicalAssets.push({
      id,
      title: typeof asset.title === "string" ? asset.title : "",
      lifecycle: asset.status === "archived" ? "archived" : "active",
      folderId: null,
      defaultPlayableId: defaultId,
      parentAssetId,
      familyRootAssetId,
      derivationTypes: derived ? ["anonymization"] : [],
      tagIds: [],
      provenance: {
        creationType: derived ? "derivation" : "catalog-migration",
        provider: candidates[0]?.provider || null,
        originalFileName: basename(asset.provenance?.originalFileName),
        originReference: asset.provenance?.catalogId || null,
        parentAssetId,
        familyRootAssetId,
        historical: safeHistoricalProvenance(asset.provenance)
      },
      technicalMetadata: technicalMetadata(asset, null, null),
      rights: isObject(asset.rights) ? clone(asset.rights) : {},
      createdAt,
      updatedAt: createdAt
    });
    mappings.assets.push({ historicalId: asset.id, canonicalId: id, status: derived ? "normalized" : "direct", derivationTypes: derived ? ["anonymization"] : [] });
  }

  const treatments = [];
  for (const [index, asset] of assetsHistory.entries()) {
    const provenance = asset.provenance || {};
    if (provenance.status !== "completed" || !provenance.sourcePlayableId || !provenance.sourcePreparationJobId || !provenance.sourceAssetId) {
      if (provenance.kind === "derived-anonymized") { diagnostic(diagnostics, "TREATMENT_HISTORY_ABSENT", "unavailable", `assets[${index}].provenance`, "Le dérivé est conservé, mais la preuve historique complète d’un traitement persistant est absente.", { historicalId: asset.id }); }
      continue;
    }
    const sourcePlayableId = playableIdMap.get(provenance.sourcePlayableId);
    const sourceAssetId = assetIdMap.get(provenance.sourceAssetId);
    const outputAssetId = assetIdMap.get(asset.id);
    const outputPlayable = (playablesByAsset.get(outputAssetId) || [])[0];
    if (!sourcePlayableId || !sourceAssetId || !outputPlayable) { diagnostic(diagnostics, "TREATMENT_HISTORY_INCOHERENT", "ambiguous", `assets[${index}].provenance`, "Le traitement historique ne peut pas être relié sans ambiguïté à ses sources et sa sortie.", { historicalId: asset.id }); continue; }
    const createdAt = dateFrom(provenance.createdAt, provenance.importedAt, legacyDocument.updatedAt) || timestamp;
    const treatmentId = generatedId("treatment", asset.id, "historical-treatment", new Set(treatments.map(item => item.id)));
    treatments.push({ id: treatmentId, type: provenance.method || "legacy-treatment", sourceAssetId, sourcePlayableId, sourcePreparationId: provenance.sourcePreparationJobId, outputAssetId, outputPlayableId: outputPlayable.id, status: "completed", progress: 100, createdAt, startedAt: null, finishedAt: createdAt, error: null, parameters: safeHistoricalProvenance(provenance), engine: "proto05", engineVersion: "legacy-migration", ffmpegVersion: provenance.ffmpegVersion || null, runtimeJobId: null, diagnostics: {} });
    mappings.treatments.push({ historicalId: provenance.sourcePreparationJobId, canonicalId: treatmentId, status: "normalized" });
  }

  const output = { schemaVersion: TARGET_SCHEMA_VERSION, updatedAt: dateFrom(legacyDocument.updatedAt) || timestamp, assets: canonicalAssets.sort((a, b) => a.id.localeCompare(b.id)), sources: canonicalSources.sort((a, b) => a.id.localeCompare(b.id)), playables: canonicalPlayables.sort((a, b) => a.id.localeCompare(b.id)), treatments: treatments.sort((a, b) => a.id.localeCompare(b.id)), folders: [], tags: [] };
  const validationResult = validateMediaLibrary(output);
  if (!validationResult.valid) diagnostic(diagnostics, "CANONICAL_OUTPUT_INVALID", "error", "$", "La sortie de migration échoue au validateur canonique 099.", { codes: validationResult.problems.map(item => item.code) });
  const activityReferenceMappings = buildActivityMappings(options.activities || [], options.legacyCatalog || [], assetIdMap, playableIdMap, byPlayable, diagnostics);
  const localPresent = canonicalPlayables.filter(item => item.kind === "local-file" && item.availability === "available").length;
  const localMissing = canonicalPlayables.filter(item => item.availability === "missing-local").length;
  return {
    output,
    sourceVersion: LEGACY_SCHEMA_VERSION,
    targetVersion: TARGET_SCHEMA_VERSION,
    migrated: true,
    transformationProduced: true,
    valid: validationResult.valid,
    readable: validationResult.readable,
    writeEligible: validationResult.writeEligible,
    requiresUnknownFieldPreservation: validationResult.requiresUnknownFieldPreservation,
    diagnostics,
    mappings,
    activityReferenceMappings,
    validationResult,
    statistics: { assets: output.assets.length, sources: output.sources.length, playables: output.playables.length, localPresent, localMissing, treatments: output.treatments.length, deferredTreatments: diagnostics.filter(item => item.code === "TREATMENT_HISTORY_ABSENT").length, omittedEntries: diagnostics.filter(item => item.blocking).length },
    dryRunExecuted: false,
    realMigrationPerformed: false,
    persistedInFunctionalLocation: false
  };
}

function buildActivityMappings(activities, catalog, assetIdMap, playableIdMap, legacyPlayables, diagnostics) {
  return clone(activities).map(activity => {
    const videoRef = activity?.videoRef;
    const historicalPlayableId = videoRef?.playableId || activity?.video?.id;
    const canonicalPlayableId = historicalPlayableId && playableIdMap.get(historicalPlayableId);
    const historicalPlayable = historicalPlayableId && legacyPlayables.get(historicalPlayableId);
    const canonicalAssetId = canonicalPlayableId && assetIdMap.get(historicalPlayable?.assetId);
    const status = canonicalPlayableId && canonicalAssetId ? "resolved" : historicalPlayableId ? "orphaned" : "invalid";
    if (status !== "resolved") diagnostic(diagnostics, status === "orphaned" ? "ACTIVITY_REFERENCE_ORPHAN" : "ACTIVITY_REFERENCE_INVALID", status === "orphaned" ? "error" : "error", "activities[].video", "La référence vidéo de l’activité ne peut pas être résolue dans la migration.", { historicalId: "redacted" });
    return { activityId: activity?.id || null, sourcePath: videoRef ? "videoRef" : "video.id", historicalReferenceType: videoRef ? "videoRef" : "activity.video", assetId: canonicalAssetId || null, playableId: canonicalPlayableId || null, status, justification: status === "resolved" ? "relation asset/playable reconstruite depuis la Library historique" : "référence non résolue" };
  }).sort((a, b) => String(a.activityId).localeCompare(String(b.activityId)));
}

module.exports = {
  LEGACY_SCHEMA_VERSION,
  TARGET_SCHEMA_VERSION,
  migrateLegacyMediaLibrary,
  stableJson
};
