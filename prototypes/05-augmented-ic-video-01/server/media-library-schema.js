"use strict";

/**
 * Canonical Proto05 media-library contract (schema 1.x).
 *
 * This module is intentionally dormant: it does not read files, access the
 * network, mutate input values, or attach itself to the current 0.1 routes.
 */

const SUPPORTED_SCHEMA_MAJOR = 1;
const SUPPORTED_SCHEMA_MINOR = 0;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,160}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const ASSET_LIFECYCLES = new Set(["active", "archived"]);
const AVAILABILITIES = new Set(["available", "missing-local", "unreachable-remote", "blocked", "pending", "unknown"]);
const TREATMENT_STATUSES = new Set(["queued", "running", "cancelling", "completed", "failed", "cancelled", "interrupted"]);
const SOURCE_KINDS = new Set(["local-file", "direct-url", "hls", "youtube-embed", "derived-output"]);
const PLAYABLE_KINDS = new Set(["local-file", "direct-url", "hls", "youtube-embed"]);
const TRANSPORTS = new Set(["file", "http", "https", "hls", "youtube-iframe"]);
const BUSINESS_ROLES = new Set(["original-remote", "working-copy", "derivation-local", "published-remote"]);

/** @typedef {{ id:string, title:string, lifecycle:"active"|"archived", folderId:string|null, defaultPlayableId:string|null, parentAssetId:string|null, familyRootAssetId:string, derivationTypes:string[], tagIds:string[], provenance:Object, technicalMetadata:Object, rights:Object, createdAt:string, updatedAt:string }} MediaAsset */
/** @typedef {{ id:string, assetId:string, kind:string, provider:string, origin:Object, transport:string, mimeType:string|null, provenance:Object, createdAt:string }} MediaSource */
/** @typedef {{ id:string, assetId:string, sourceId:string, kind:string, availability:string, availabilityReason:string|null, location:Object, technicalMetadata:Object, provenance:Object, createdAt:string, updatedAt:string }} Playable */
/** @typedef {{ id:string, type:string, sourceAssetId:string, sourcePlayableId:string, sourcePreparationId:string|null, outputAssetId:string|null, outputPlayableId:string|null, status:string, progress:number, createdAt:string, startedAt:string|null, finishedAt:string|null, error:Object|null, parameters:Object, engine:string, engineVersion:string, ffmpegVersion:string|null, runtimeJobId:string|null, diagnostics:Object }} MediaTreatment */
/** @typedef {{ id:string, name:string, parentFolderId:string|null, sortOrder:number, createdAt:string, updatedAt:string }} MediaFolder */
/** @typedef {{ id:string, name:string, normalizedName:string, createdAt:string, updatedAt:string }} MediaTag */
/** @typedef {{ schemaVersion:string, updatedAt:string|null, assets:MediaAsset[], sources:MediaSource[], playables:Playable[], treatments:MediaTreatment[], folders:MediaFolder[], tags:MediaTag[] }} MediaLibrary */
/** @typedef {{ code:string, severity:"error"|"warning"|"unavailable"|"reconcilable", path:string, message:string, entityId?:string }} MediaLibraryProblem */
/** @typedef {{ valid:boolean, readable:boolean, writeEligible:boolean, requiresUnknownFieldPreservation:boolean, version:{major:number,minor:number}|null, problems:MediaLibraryProblem[], warnings:MediaLibraryProblem[], unavailable:MediaLibraryProblem[], reconcilable:MediaLibraryProblem[] }} MediaLibraryValidationResult */

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addProblem(result, code, severity, path, message, entityId) {
  const problem = { code, severity, path, message };
  if (entityId !== undefined) problem.entityId = entityId;
  if (severity === "warning") result.warnings.push(problem);
  else if (severity === "unavailable") result.unavailable.push(problem);
  else if (severity === "reconcilable") result.reconcilable.push(problem);
  else result.problems.push(problem);
}

function requiredString(result, value, path, code, entityId) {
  if (typeof value !== "string" || !value.trim()) {
    addProblem(result, code, "error", path, `${path} doit être une chaîne non vide.`, entityId);
    return null;
  }
  return value;
}

function nullableString(result, value, path, code, entityId) {
  if (value !== null && value !== undefined && (typeof value !== "string" || !value.trim())) {
    addProblem(result, code, "error", path, `${path} doit être une chaîne ou null.`, entityId);
    return null;
  }
  return value ?? null;
}

function validateId(result, value, path, entityId) {
  const id = requiredString(result, value, path, "INVALID_ID", entityId);
  if (id && !ID_PATTERN.test(id)) addProblem(result, "INVALID_ID", "error", path, `${path} contient des caractères interdits.`, entityId);
  return id;
}

function validateDate(result, value, path, { required = false, entityId } = {}) {
  if (value === undefined || value === null) {
    if (required) addProblem(result, "MISSING_DATE", "error", path, `${path} est obligatoire.`, entityId);
    return;
  }
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    addProblem(result, "INVALID_DATE", "error", path, `${path} doit être une date ISO UTC valide.`, entityId);
  }
}

function validateSafeStorageKey(result, value, path, entityId) {
  if (typeof value !== "string" || !value || value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.includes("\\")) {
    addProblem(result, "UNSAFE_STORAGE_KEY", "error", path, `${path} doit être une clé relative sûre.`, entityId);
    return;
  }
  const parts = value.split("/");
  if (parts.some(part => !part || part === "." || part === "..")) addProblem(result, "UNSAFE_STORAGE_KEY", "error", path, `${path} ne doit pas traverser un répertoire.`, entityId);
}

function validateTechnicalMetadata(result, value, path, entityId) {
  if (!isObject(value)) {
    addProblem(result, "INVALID_TECHNICAL_METADATA", "error", path, `${path} doit être un objet.`, entityId);
    return;
  }
  const nonNegativeNumbers = ["durationMs", "width", "height", "sizeBytes"];
  for (const key of nonNegativeNumbers) {
    if (value[key] !== undefined && value[key] !== null && (typeof value[key] !== "number" || !Number.isFinite(value[key]) || value[key] < 0)) addProblem(result, "INVALID_TECHNICAL_METADATA", "error", `${path}.${key}`, `${path}.${key} doit être un nombre positif ou nul ou null.`, entityId);
  }
  if (value.hasAudio !== undefined && typeof value.hasAudio !== "boolean" && value.hasAudio !== null) addProblem(result, "INVALID_TECHNICAL_METADATA", "error", `${path}.hasAudio`, `${path}.hasAudio doit être booléen ou null.`, entityId);
  for (const key of ["mimeType", "videoCodec", "audioCodec", "sha256", "analyzedAt", "analyzer", "analyzerVersion", "error"]) {
    if (value[key] !== undefined && value[key] !== null && typeof value[key] !== "string" && key !== "error") addProblem(result, "INVALID_TECHNICAL_METADATA", "error", `${path}.${key}`, `${path}.${key} doit être une chaîne ou null.`, entityId);
  }
  if (value.frameRate !== undefined && value.frameRate !== null && typeof value.frameRate !== "string" && typeof value.frameRate !== "number") addProblem(result, "INVALID_TECHNICAL_METADATA", "error", `${path}.frameRate`, `${path}.frameRate doit être une cadence représentable.`, entityId);
  if (value.status !== undefined && (typeof value.status !== "string" || !value.status.trim())) addProblem(result, "INVALID_ANALYSIS_STATUS", "error", `${path}.status`, `${path}.status doit être une chaîne lorsqu’il est présent.`, entityId);
  if (value.analyzedAt !== undefined && value.analyzedAt !== null) validateDate(result, value.analyzedAt, `${path}.analyzedAt`, { entityId });
}

function validateLocation(result, playable, path) {
  const location = playable.location;
  if (!isObject(location)) {
    addProblem(result, "INVALID_PLAYABLE_LOCATION", "error", path, `${path} doit être un objet.`, playable.id);
    return;
  }
  if (playable.kind === "local-file") {
    if (typeof location.storageKey !== "string") addProblem(result, "MISSING_STORAGE_KEY", "error", `${path}.storageKey`, `${path}.storageKey est obligatoire pour un playable local.`, playable.id);
    else validateSafeStorageKey(result, location.storageKey, `${path}.storageKey`, playable.id);
    if (location.storageScope !== undefined && !["legacy-media", "workspace"].includes(location.storageScope)) addProblem(result, "INVALID_STORAGE_SCOPE", "error", `${path}.storageScope`, "La portée de stockage locale est inconnue.", playable.id);
  } else if (playable.kind === "youtube-embed") {
    if (typeof location.embedUrl !== "string" || !location.embedUrl) addProblem(result, "INVALID_PLAYABLE_LOCATION", "error", `${path}.embedUrl`, `${path}.embedUrl est obligatoire pour YouTube.`, playable.id);
    if (typeof location.videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(location.videoId)) addProblem(result, "INVALID_PLAYABLE_LOCATION", "error", `${path}.videoId`, `${path}.videoId doit être un identifiant YouTube valide.`, playable.id);
  } else if (!["direct-url", "hls"].includes(playable.kind)) {
    addProblem(result, "INVALID_PLAYABLE_KIND", "error", `${path}.kind`, `${path}.kind n’est pas pris en charge.`, playable.id);
  } else if (!["string"].includes(typeof location.url) && typeof location.manifestUrl !== "string") {
    addProblem(result, "INVALID_PLAYABLE_LOCATION", "error", `${path}.url`, `${path}.url ou ${path}.manifestUrl est obligatoire.`, playable.id);
  }
}

function validateAsset(result, asset, index, maps) {
  const path = `assets[${index}]`;
  const id = validateId(result, asset?.id, `${path}.id`);
  if (!isObject(asset)) { addProblem(result, "INVALID_ASSET", "error", path, `${path} doit être un objet.`); return; }
  requiredString(result, asset.title, `${path}.title`, "MISSING_FIELD", id);
  if (!ASSET_LIFECYCLES.has(asset.lifecycle)) addProblem(result, "INVALID_ASSET_LIFECYCLE", "error", `${path}.lifecycle`, `Cycle de vie inconnu : ${String(asset.lifecycle)}.`, id);
  if (asset.folderId !== null && asset.folderId !== undefined) { validateId(result, asset.folderId, `${path}.folderId`, id); maps.foldersReferenced.push({ id: asset.folderId, path: `${path}.folderId`, assetId: id }); }
  if (asset.defaultPlayableId !== null && asset.defaultPlayableId !== undefined) { validateId(result, asset.defaultPlayableId, `${path}.defaultPlayableId`, id); maps.defaults.push({ assetId: id, playableId: asset.defaultPlayableId, path: `${path}.defaultPlayableId` }); }
  if (!Array.isArray(asset.derivationTypes) || asset.derivationTypes.some(value => typeof value !== "string" || !value.trim())) addProblem(result, "INVALID_DERIVATION_TYPES", "error", `${path}.derivationTypes`, `${path}.derivationTypes doit être une liste de chaînes.`, id);
  if (!Array.isArray(asset.tagIds) || asset.tagIds.some(value => typeof value !== "string" || !value.trim())) addProblem(result, "INVALID_TAG_ASSOCIATIONS", "error", `${path}.tagIds`, `${path}.tagIds doit être une liste de tags.`, id);
  if (Array.isArray(asset.tagIds) && new Set(asset.tagIds).size !== asset.tagIds.length) addProblem(result, "DUPLICATE_TAG_ASSOCIATION", "error", `${path}.tagIds`, `${path}.tagIds contient une association dupliquée.`, id);
  if (asset.parentAssetId !== null && asset.parentAssetId !== undefined) { validateId(result, asset.parentAssetId, `${path}.parentAssetId`, id); maps.parents.set(id, asset.parentAssetId); }
  else maps.parents.set(id, null);
  validateId(result, asset.familyRootAssetId, `${path}.familyRootAssetId`, id);
  if (!isObject(asset.provenance)) addProblem(result, "INVALID_PROVENANCE", "error", `${path}.provenance`, `${path}.provenance doit être un objet.`, id);
  validateTechnicalMetadata(result, asset.technicalMetadata, `${path}.technicalMetadata`, id);
  if (!isObject(asset.rights)) addProblem(result, "INVALID_RIGHTS", "error", `${path}.rights`, `${path}.rights doit être un objet.`, id);
  validateDate(result, asset.createdAt, `${path}.createdAt`, { required: true, entityId: id });
  validateDate(result, asset.updatedAt, `${path}.updatedAt`, { required: true, entityId: id });
  if (Object.prototype.hasOwnProperty.call(asset, "sourceIds") || Object.prototype.hasOwnProperty.call(asset, "playableIds")) addProblem(result, "PERSISTED_PROJECTION_FIELD", "error", path, "sourceIds et playableIds sont des projections calculées et ne doivent pas être persistés dans le document canonique.", id);
}

function validateSource(result, source, index, maps) {
  const path = `sources[${index}]`;
  const id = validateId(result, source?.id, `${path}.id`);
  if (!isObject(source)) { addProblem(result, "INVALID_SOURCE", "error", path, `${path} doit être un objet.`); return; }
  validateId(result, source.assetId, `${path}.assetId`, id); maps.sources.set(id, source);
  if (!SOURCE_KINDS.has(source.kind)) addProblem(result, "INVALID_SOURCE_KIND", "error", `${path}.kind`, `Type de source inconnu : ${String(source.kind)}.`, id);
  if (source.role !== undefined && !BUSINESS_ROLES.has(source.role)) addProblem(result, "INVALID_BUSINESS_ROLE", "error", `${path}.role`, `Rôle métier inconnu : ${String(source.role)}.`, id);
  requiredString(result, source.provider, `${path}.provider`, "MISSING_FIELD", id);
  if (!isObject(source.origin)) addProblem(result, "INVALID_SOURCE_ORIGIN", "error", `${path}.origin`, `${path}.origin doit être un objet.`, id);
  if (!TRANSPORTS.has(source.transport)) addProblem(result, "INVALID_TRANSPORT", "error", `${path}.transport`, `Transport inconnu : ${String(source.transport)}.`, id);
  if (source.mimeType !== undefined && source.mimeType !== null && typeof source.mimeType !== "string") addProblem(result, "INVALID_MIME_TYPE", "error", `${path}.mimeType`, `${path}.mimeType doit être une chaîne ou null.`, id);
  if (!isObject(source.provenance)) addProblem(result, "INVALID_PROVENANCE", "error", `${path}.provenance`, `${path}.provenance doit être un objet.`, id);
  validateDate(result, source.createdAt, `${path}.createdAt`, { required: true, entityId: id });
}

function validatePlayable(result, playable, index, maps) {
  const path = `playables[${index}]`;
  const id = validateId(result, playable?.id, `${path}.id`);
  if (!isObject(playable)) { addProblem(result, "INVALID_PLAYABLE", "error", path, `${path} doit être un objet.`); return; }
  validateId(result, playable.assetId, `${path}.assetId`, id);
  validateId(result, playable.sourceId, `${path}.sourceId`, id);
  if (Object.prototype.hasOwnProperty.call(playable, "status")) addProblem(result, "PLAYABLE_STATUS_FORBIDDEN", "error", `${path}.status`, "Playable.status n’appartient pas au contrat canonique ; utiliser availability.", id);
  if (!PLAYABLE_KINDS.has(playable.kind)) addProblem(result, "INVALID_PLAYABLE_KIND", "error", `${path}.kind`, `Type de playable inconnu : ${String(playable.kind)}.`, id);
  if (playable.role !== undefined && !BUSINESS_ROLES.has(playable.role)) addProblem(result, "INVALID_BUSINESS_ROLE", "error", `${path}.role`, `Rôle métier inconnu : ${String(playable.role)}.`, id);
  if (!AVAILABILITIES.has(playable.availability)) addProblem(result, "INVALID_AVAILABILITY", "error", `${path}.availability`, `Disponibilité inconnue : ${String(playable.availability)}.`, id);
  if (!Object.prototype.hasOwnProperty.call(playable, "availabilityReason")) addProblem(result, "MISSING_AVAILABILITY_REASON", "error", `${path}.availabilityReason`, `${path}.availabilityReason est obligatoire et peut valoir null.`, id);
  else if (playable.availabilityReason !== null && (typeof playable.availabilityReason !== "string" || !playable.availabilityReason.trim())) addProblem(result, "INVALID_AVAILABILITY_REASON", "error", `${path}.availabilityReason`, `${path}.availabilityReason doit être une chaîne ou null.`, id);
  if (playable.availability === "missing-local" && playable.availabilityReason !== "missing-file") addProblem(result, "MISSING_AVAILABILITY_REASON", "error", `${path}.availabilityReason`, "Un playable missing-local doit porter availabilityReason=missing-file.", id);
  if (playable.availability !== "missing-local" && playable.availabilityReason === "missing-file") addProblem(result, "INVALID_AVAILABILITY_REASON", "error", `${path}.availabilityReason`, "missing-file est réservé à la disponibilité missing-local.", id);
  validateLocation(result, playable, `${path}.location`);
  validateTechnicalMetadata(result, playable.technicalMetadata, `${path}.technicalMetadata`, id);
  if (!isObject(playable.provenance)) addProblem(result, "INVALID_PROVENANCE", "error", `${path}.provenance`, `${path}.provenance doit être un objet.`, id);
  validateDate(result, playable.createdAt, `${path}.createdAt`, { required: true, entityId: id });
  validateDate(result, playable.updatedAt, `${path}.updatedAt`, { required: true, entityId: id });
  maps.playables.set(id, playable);
}

function validateFolder(result, folder, index, maps) {
  const path = `folders[${index}]`;
  const id = validateId(result, folder?.id, `${path}.id`);
  if (!isObject(folder)) { addProblem(result, "INVALID_FOLDER", "error", path, `${path} doit être un objet.`); return; }
  requiredString(result, folder.name, `${path}.name`, "MISSING_FIELD", id);
  if (folder.parentFolderId !== null && folder.parentFolderId !== undefined) { validateId(result, folder.parentFolderId, `${path}.parentFolderId`, id); maps.folderParents.set(id, folder.parentFolderId); }
  else maps.folderParents.set(id, null);
  validateDate(result, folder.createdAt, `${path}.createdAt`, { required: true, entityId: id });
  validateDate(result, folder.updatedAt, `${path}.updatedAt`, { required: true, entityId: id });
  if (folder.sortOrder !== undefined && (typeof folder.sortOrder !== "number" || !Number.isFinite(folder.sortOrder))) addProblem(result, "INVALID_FOLDER_ORDER", "error", `${path}.sortOrder`, `${path}.sortOrder doit être un nombre.`, id);
  maps.folders.set(id, folder);
}

function validateTag(result, tag, index, maps) {
  const path = `tags[${index}]`;
  const id = validateId(result, tag?.id, `${path}.id`);
  if (!isObject(tag)) { addProblem(result, "INVALID_TAG", "error", path, `${path} doit être un objet.`); return; }
  requiredString(result, tag.name, `${path}.name`, "MISSING_FIELD", id);
  requiredString(result, tag.normalizedName, `${path}.normalizedName`, "MISSING_FIELD", id);
  validateDate(result, tag.createdAt, `${path}.createdAt`, { required: true, entityId: id });
  validateDate(result, tag.updatedAt, `${path}.updatedAt`, { required: true, entityId: id });
  const normalized = typeof tag.name === "string" ? tag.name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-") : "";
  if (tag.normalizedName !== normalized) addProblem(result, "INVALID_TAG_NORMALIZATION", "error", `${path}.normalizedName`, `${path}.normalizedName ne correspond pas à la normalisation contractuelle.`, id);
  maps.tags.set(id, tag);
  if (maps.normalizedTags.has(normalized)) addProblem(result, "DUPLICATE_TAG_NAME", "error", `${path}.name`, "Deux tags ont le même nom normalisé.", id);
  maps.normalizedTags.set(normalized, id);
}

function validateTreatment(result, treatment, index, maps) {
  const path = `treatments[${index}]`;
  const id = validateId(result, treatment?.id, `${path}.id`);
  if (!isObject(treatment)) { addProblem(result, "INVALID_TREATMENT", "error", path, `${path} doit être un objet.`); return; }
  requiredString(result, treatment.type, `${path}.type`, "MISSING_FIELD", id);
  if (treatment.derivationId !== undefined && treatment.derivationId !== treatment.id) addProblem(result, "DERIVATION_ID_MISMATCH", "error", `${path}.derivationId`, "derivationId doit être identique à l’identifiant canonique du traitement.", id);
  if (treatment.label !== undefined) requiredString(result, treatment.label, `${path}.label`, "INVALID_DERIVATION_LABEL", id);
  if (treatment.updatedAt !== undefined) validateDate(result, treatment.updatedAt, `${path}.updatedAt`, { entityId: id });
  if (treatment.retained !== undefined && typeof treatment.retained !== "boolean") addProblem(result, "INVALID_RETAINED_FLAG", "error", `${path}.retained`, "retained doit être booléen.", id);
  if (treatment.publishedPlayableId !== undefined && treatment.publishedPlayableId !== null) validateId(result, treatment.publishedPlayableId, `${path}.publishedPlayableId`, id);
  validateId(result, treatment.sourceAssetId, `${path}.sourceAssetId`, id);
  validateId(result, treatment.sourcePlayableId, `${path}.sourcePlayableId`, id);
  if (treatment.sourcePreparationId !== null && treatment.sourcePreparationId !== undefined) validateId(result, treatment.sourcePreparationId, `${path}.sourcePreparationId`, id);
  if (!TREATMENT_STATUSES.has(treatment.status)) addProblem(result, "INVALID_TREATMENT_STATUS", "error", `${path}.status`, `État de traitement inconnu : ${String(treatment.status)}.`, id);
  if (treatment.progress !== undefined && (typeof treatment.progress !== "number" || !Number.isFinite(treatment.progress) || treatment.progress < 0 || treatment.progress > 100)) addProblem(result, "INVALID_PROGRESS", "error", `${path}.progress`, `${path}.progress doit être compris entre 0 et 100.`, id);
  validateDate(result, treatment.createdAt, `${path}.createdAt`, { required: true, entityId: id });
  validateDate(result, treatment.startedAt, `${path}.startedAt`, { entityId: id });
  validateDate(result, treatment.finishedAt, `${path}.finishedAt`, { entityId: id });
  if (!isObject(treatment.parameters)) addProblem(result, "INVALID_TREATMENT_PARAMETERS", "error", `${path}.parameters`, `${path}.parameters doit être un objet.`, id);
  requiredString(result, treatment.engine, `${path}.engine`, "MISSING_FIELD", id);
  requiredString(result, treatment.engineVersion, `${path}.engineVersion`, "MISSING_FIELD", id);
  if (!isObject(treatment.diagnostics)) addProblem(result, "INVALID_TREATMENT_DIAGNOSTICS", "error", `${path}.diagnostics`, `${path}.diagnostics doit être un objet.`, id);
  if (treatment.error !== null && treatment.error !== undefined && !isObject(treatment.error)) addProblem(result, "INVALID_TREATMENT_ERROR", "error", `${path}.error`, `${path}.error doit être un objet ou null.`, id);
  if (treatment.status === "completed" && (!treatment.outputAssetId || !treatment.outputPlayableId)) addProblem(result, "COMPLETED_OUTPUT_MISSING", "error", path, "Un traitement completed doit référencer son asset et son playable de sortie.", id);
  if (["failed", "cancelled", "interrupted"].includes(treatment.status) && (treatment.outputAssetId !== null && treatment.outputAssetId !== undefined || treatment.outputPlayableId !== null && treatment.outputPlayableId !== undefined)) addProblem(result, "FAILED_OUTPUT_PRESENT", "error", path, "Un traitement échoué, annulé ou interrompu ne doit pas publier de sortie.", id);
  maps.treatments.set(id, treatment);
}

function validateLineage(result, assets) {
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  for (const asset of assets) {
    const seen = new Set([asset.id]);
    let current = asset;
    while (current.parentAssetId !== null && current.parentAssetId !== undefined) {
      if (seen.has(current.parentAssetId)) { addProblem(result, "FAMILY_CYCLE", "error", `assets.${asset.id}.parentAssetId`, "Le lignage contient un cycle.", asset.id); break; }
      seen.add(current.parentAssetId);
      const parent = byId.get(current.parentAssetId);
      if (!parent) { addProblem(result, "PARENT_ASSET_NOT_FOUND", "error", `assets.${asset.id}.parentAssetId`, "Le parent de famille est introuvable.", asset.id); break; }
      current = parent;
    }
    if (current && current.parentAssetId === null && asset.familyRootAssetId !== current.id) addProblem(result, "FAMILY_ROOT_MISMATCH", "error", `assets.${asset.id}.familyRootAssetId`, "La racine déclarée ne correspond pas à la racine atteinte.", asset.id);
    const root = byId.get(asset.familyRootAssetId);
    if (!root) addProblem(result, "FAMILY_ROOT_NOT_FOUND", "error", `assets.${asset.id}.familyRootAssetId`, "La racine de famille est introuvable.", asset.id);
    else if (root.parentAssetId !== null && root.parentAssetId !== undefined) addProblem(result, "FAMILY_ROOT_NOT_ROOT", "error", `assets.${asset.id}.familyRootAssetId`, "La racine déclarée possède elle-même un parent.", asset.id);
  }
}

function validateReferences(result, library, maps) {
  const assetById = new Map(library.assets.map(item => [item.id, item]));
  for (const source of library.sources) if (!assetById.has(source.assetId)) addProblem(result, "SOURCE_ASSET_NOT_FOUND", "error", `sources.${source.id}.assetId`, "Le MediaAsset de la source est introuvable.", source.id);
  for (const playable of library.playables) {
    const asset = assetById.get(playable.assetId);
    const source = maps.sources.get(playable.sourceId);
    if (!asset) addProblem(result, "PLAYABLE_ASSET_NOT_FOUND", "error", `playables.${playable.id}.assetId`, "Le MediaAsset du playable est introuvable.", playable.id);
    if (!source) addProblem(result, "PLAYABLE_SOURCE_NOT_FOUND", "error", `playables.${playable.id}.sourceId`, "La MediaSource du playable est introuvable.", playable.id);
    else if (source.assetId !== playable.assetId) addProblem(result, "PLAYABLE_SOURCE_ASSET_MISMATCH", "error", `playables.${playable.id}.sourceId`, "La source du playable appartient à un autre asset.", playable.id);
  }
  for (const entry of maps.defaults) {
    const playable = maps.playables.get(entry.playableId);
    if (!playable) addProblem(result, "DEFAULT_PLAYABLE_NOT_FOUND", "error", entry.path, "Le playable par défaut est introuvable.", entry.assetId);
    else if (playable.assetId !== entry.assetId) addProblem(result, "DEFAULT_PLAYABLE_ASSET_MISMATCH", "error", entry.path, "Le playable par défaut appartient à un autre asset.", entry.assetId);
  }
  for (const entry of maps.foldersReferenced) if (!maps.folders.has(entry.id)) addProblem(result, "FOLDER_NOT_FOUND", "error", entry.path, "Le dossier référencé est introuvable.", entry.assetId);
  for (const asset of library.assets) for (const tagId of asset.tagIds) if (!maps.tags.has(tagId)) addProblem(result, "TAG_NOT_FOUND", "error", `assets.${asset.id}.tagIds`, "Le tag référencé est introuvable.", asset.id);
  for (const treatment of library.treatments) {
    const sourceAsset = assetById.get(treatment.sourceAssetId);
    const sourcePlayable = maps.playables.get(treatment.sourcePlayableId);
    if (!sourceAsset) addProblem(result, "TREATMENT_SOURCE_ASSET_NOT_FOUND", "error", `treatments.${treatment.id}.sourceAssetId`, "L’asset source du traitement est introuvable.", treatment.id);
    if (!sourcePlayable) addProblem(result, "TREATMENT_SOURCE_PLAYABLE_NOT_FOUND", "error", `treatments.${treatment.id}.sourcePlayableId`, "Le playable source du traitement est introuvable.", treatment.id);
    else if (sourcePlayable.assetId !== treatment.sourceAssetId) addProblem(result, "TREATMENT_SOURCE_MISMATCH", "error", `treatments.${treatment.id}.sourcePlayableId`, "Le playable source n’appartient pas à l’asset source.", treatment.id);
    if (treatment.outputAssetId !== null && treatment.outputAssetId !== undefined && !assetById.has(treatment.outputAssetId)) addProblem(result, "TREATMENT_OUTPUT_ASSET_NOT_FOUND", "error", `treatments.${treatment.id}.outputAssetId`, "L’asset de sortie du traitement est introuvable.", treatment.id);
    if (treatment.outputPlayableId !== null && treatment.outputPlayableId !== undefined) {
      const outputPlayable = maps.playables.get(treatment.outputPlayableId);
      if (!outputPlayable) addProblem(result, "TREATMENT_OUTPUT_PLAYABLE_NOT_FOUND", "error", `treatments.${treatment.id}.outputPlayableId`, "Le playable de sortie du traitement est introuvable.", treatment.id);
      else if (outputPlayable.assetId !== treatment.outputAssetId) addProblem(result, "TREATMENT_OUTPUT_MISMATCH", "error", `treatments.${treatment.id}.outputPlayableId`, "Le playable de sortie n’appartient pas à l’asset de sortie.", treatment.id);
    }
    if (treatment.publishedPlayableId !== null && treatment.publishedPlayableId !== undefined) {
      const publishedPlayable = maps.playables.get(treatment.publishedPlayableId);
      if (!publishedPlayable) addProblem(result, "TREATMENT_PUBLISHED_PLAYABLE_NOT_FOUND", "error", `treatments.${treatment.id}.publishedPlayableId`, "Le playable publié relié est introuvable.", treatment.id);
      else if (publishedPlayable.assetId !== treatment.sourceAssetId || publishedPlayable.role !== "published-remote") addProblem(result, "TREATMENT_PUBLISHED_PLAYABLE_MISMATCH", "error", `treatments.${treatment.id}.publishedPlayableId`, "Le playable publié doit appartenir à la même fiche et porter le rôle published-remote.", treatment.id);
    }
  }
}

function validateFolderCycles(result, folders) {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  for (const folder of folders) {
    const seen = new Set([folder.id]);
    let parentId = folder.parentFolderId;
    while (parentId !== null && parentId !== undefined) {
      if (seen.has(parentId)) { addProblem(result, "FOLDER_CYCLE", "error", `folders.${folder.id}.parentFolderId`, "La hiérarchie des dossiers contient un cycle.", folder.id); break; }
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) { addProblem(result, "FOLDER_PARENT_NOT_FOUND", "error", `folders.${folder.id}.parentFolderId`, "Le parent du dossier est introuvable.", folder.id); break; }
      parentId = parent.parentFolderId;
    }
  }
}

function parseSchemaVersion(value, result) {
  if (typeof value !== "string" || !/^[0-9]+\.[0-9]+$/.test(value)) {
    addProblem(result, "INVALID_SCHEMA_VERSION", "error", "schemaVersion", "schemaVersion doit utiliser le format MAJEUR.MINEUR.");
    return null;
  }
  const [major, minor] = value.split(".").map(Number);
  if (major < 1 || minor < 0) { addProblem(result, "INVALID_SCHEMA_VERSION", "error", "schemaVersion", "Les composantes de schemaVersion sont hors limites."); return null; }
  if (major !== SUPPORTED_SCHEMA_MAJOR) addProblem(result, "UNKNOWN_SCHEMA_MAJOR", "error", "schemaVersion", `Version majeure non prise en charge : ${major}.`);
  else {
    result.readable = true;
    if (minor > SUPPORTED_SCHEMA_MINOR) {
      result.requiresUnknownFieldPreservation = true;
      result.writeEligible = false;
      addProblem(result, "FUTURE_SCHEMA_MINOR", "warning", "schemaVersion", `Version mineure ultérieure détectée : ${value}. La lecture est tolérée, mais aucune réécriture n’est autorisée tant que les champs inconnus ne peuvent pas être préservés sans perte.`);
    }
  }
  return { major, minor };
}

/**
 * Validate a canonical schema 1.x value without mutation or I/O.
 * `readable` describes supported parsing; `writeEligible` is only a contract
 * signal for a future writer and is never an authorization to write.
 * @param {unknown} value
 * @returns {MediaLibraryValidationResult}
 */
function validateMediaLibrary(value) {
  const result = { valid: true, readable: false, writeEligible: false, requiresUnknownFieldPreservation: false, version: null, problems: [], warnings: [], unavailable: [], reconcilable: [] };
  if (!isObject(value)) { addProblem(result, "INVALID_LIBRARY", "error", "$", "La Library doit être un objet."); result.valid = false; return result; }
  result.version = parseSchemaVersion(value.schemaVersion, result);
  for (const key of ["assets", "sources", "playables", "treatments", "folders", "tags"]) if (!Array.isArray(value[key])) addProblem(result, "MISSING_COLLECTION", "error", key, `${key} doit être une collection obligatoire.`);
  if (!Array.isArray(value.assets) || !Array.isArray(value.sources) || !Array.isArray(value.playables) || !Array.isArray(value.treatments) || !Array.isArray(value.folders) || !Array.isArray(value.tags)) { result.valid = result.problems.length === 0; return result; }
  const maps = { sources: new Map(), playables: new Map(), folders: new Map(), folderParents: new Map(), tags: new Map(), normalizedTags: new Map(), treatments: new Map(), parents: new Map(), defaults: [], foldersReferenced: [] };
  for (const [index, asset] of value.assets.entries()) validateAsset(result, asset, index, maps);
  for (const [index, source] of value.sources.entries()) validateSource(result, source, index, maps);
  for (const [index, playable] of value.playables.entries()) validatePlayable(result, playable, index, maps);
  for (const [index, folder] of value.folders.entries()) validateFolder(result, folder, index, maps);
  for (const [index, tag] of value.tags.entries()) validateTag(result, tag, index, maps);
  for (const [index, treatment] of value.treatments.entries()) validateTreatment(result, treatment, index, maps);
  for (const [space, items] of [["assets", value.assets], ["sources", value.sources], ["playables", value.playables], ["folders", value.folders], ["tags", value.tags], ["treatments", value.treatments]]) {
    const seen = new Set();
    for (const [index, item] of items.entries()) if (item?.id && seen.has(item.id)) addProblem(result, "DUPLICATE_ID", "error", `${space}[${index}].id`, `Identifiant dupliqué dans ${space}.`, item.id); else if (item?.id) seen.add(item.id);
  }
  validateReferences(result, value, maps);
  validateLineage(result, value.assets);
  validateFolderCycles(result, value.folders);
  for (const item of value.playables) if (item.availability === "missing-local") addProblem(result, "PLAYABLE_UNAVAILABLE", "unavailable", `playables.${item.id}.availability`, "Le fichier local est déclaré manquant ; la Library reste structurellement valide.", item.id);
  result.valid = result.problems.length === 0;
  result.writeEligible = result.valid && result.readable && !result.requiresUnknownFieldPreservation;
  return result;
}

/**
 * Assert structural validity only. This does not authorize a future writer,
 * especially for a readable future minor version.
 */
function assertMediaLibrary(value) {
  const validation = validateMediaLibrary(value);
  if (!validation.valid) {
    const error = new Error("La MediaLibrary est invalide.");
    error.validation = validation;
    throw error;
  }
  return value;
}

module.exports = {
  SUPPORTED_SCHEMA_MAJOR,
  SUPPORTED_SCHEMA_MINOR,
  validateMediaLibrary,
  assertMediaLibrary,
  isMediaLibrary: value => validateMediaLibrary(value).valid
};
