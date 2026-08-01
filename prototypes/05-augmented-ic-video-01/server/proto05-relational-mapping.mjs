import crypto from "node:crypto";

const SOURCE_DEFINITIONS = Object.freeze([
  {
    key: "activities",
    relativePath: "data/activities.json",
    role: "authoritative-activities"
  },
  {
    key: "activityLibrary",
    relativePath: "data/activity-library.json",
    role: "authoritative-activity-classification"
  },
  {
    key: "mediaLibrary",
    relativePath: "data/video-library.json",
    role: "authoritative-media-library"
  },
  {
    key: "videoCatalog",
    relativePath: "data/video-catalog.json",
    role: "compatibility-cross-check"
  },
  {
    key: "languages",
    relativePath: "../../shared/reference-data/languages.json",
    role: "authoritative-shared-reference"
  }
]);

const TABLE_DEFINITIONS = Object.freeze([
  { name: "schema_migrations", pk: ["version"], order: 1 },
  { name: "import_runs", pk: ["id"], order: 2 },
  { name: "languages", pk: ["id"], order: 10 },
  { name: "activity_folders", pk: ["id"], order: 11 },
  {
    name: "media_folders",
    pk: ["id"],
    order: 12,
    fks: [{ columns: ["parent_folder_id"], target: "media_folders", targetColumns: ["id"] }]
  },
  { name: "media_tags", pk: ["id"], order: 13 },
  {
    name: "activities",
    pk: ["id"],
    order: 20,
    fks: [{ columns: ["folder_id"], target: "activity_folders", targetColumns: ["id"] }]
  },
  {
    name: "media_assets",
    pk: ["id"],
    order: 21,
    fks: [
      { columns: ["folder_id"], target: "media_folders", targetColumns: ["id"] },
      { columns: ["family_root_asset_id"], target: "media_assets", targetColumns: ["id"] },
      {
        columns: ["family_root_asset_id", "parent_asset_id"],
        target: "media_assets",
        targetColumns: ["lineage_root_key", "id"]
      },
      {
        columns: ["id", "default_playable_id"],
        target: "media_playables",
        targetColumns: ["asset_id", "id"],
        deferred: true
      }
    ]
  },
  {
    name: "media_sources",
    pk: ["id"],
    order: 30,
    fks: [{ columns: ["asset_id"], target: "media_assets", targetColumns: ["id"] }]
  },
  {
    name: "media_playables",
    pk: ["id"],
    order: 31,
    fks: [
      { columns: ["asset_id"], target: "media_assets", targetColumns: ["id"] },
      {
        columns: ["asset_id", "source_id"],
        target: "media_sources",
        targetColumns: ["asset_id", "id"]
      }
    ]
  },
  {
    name: "media_playable_metadata",
    pk: ["playable_id"],
    order: 32,
    fks: [{ columns: ["playable_id"], target: "media_playables", targetColumns: ["id"] }]
  },
  {
    name: "media_asset_tags",
    pk: ["asset_id", "tag_id"],
    order: 33,
    fks: [
      { columns: ["asset_id"], target: "media_assets", targetColumns: ["id"] },
      { columns: ["tag_id"], target: "media_tags", targetColumns: ["id"] }
    ]
  },
  {
    name: "media_treatments",
    pk: ["id"],
    order: 34,
    fks: [
      {
        columns: ["source_asset_id", "source_playable_id"],
        target: "media_playables",
        targetColumns: ["asset_id", "id"]
      },
      {
        columns: ["output_asset_id", "output_playable_id"],
        target: "media_playables",
        targetColumns: ["asset_id", "id"]
      },
      {
        columns: ["output_asset_id", "published_playable_id"],
        target: "media_playables",
        targetColumns: ["asset_id", "id"]
      }
    ]
  },
  {
    name: "activity_pedagogical_identities",
    pk: ["activity_id"],
    order: 40,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      { columns: ["parent_activity_id"], target: "activities", targetColumns: ["id"] },
      { columns: ["root_activity_id"], target: "activities", targetColumns: ["id"] },
      {
        columns: ["root_activity_id", "parent_activity_id"],
        target: "activity_pedagogical_identities",
        targetColumns: ["root_activity_id", "activity_id"]
      }
    ]
  },
  {
    name: "activity_pedagogical_text_fields",
    pk: ["activity_id", "field_key"],
    order: 41,
    fks: [{ columns: ["activity_id"], target: "activities", targetColumns: ["id"] }]
  },
  {
    name: "activity_pedagogical_qualifications",
    pk: ["activity_id", "id"],
    order: 42,
    fks: [{ columns: ["activity_id"], target: "activities", targetColumns: ["id"] }]
  },
  {
    name: "activity_languages",
    pk: ["activity_id", "language_id"],
    order: 43,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      { columns: ["language_id"], target: "languages", targetColumns: ["id"] }
    ]
  },
  {
    name: "activity_transcriptions",
    pk: ["activity_id"],
    order: 44,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      {
        columns: ["activity_id", "language_id"],
        target: "activity_languages",
        targetColumns: ["activity_id", "language_id"]
      }
    ]
  },
  {
    name: "activity_speakers",
    pk: ["activity_id", "id"],
    order: 45,
    fks: [{ columns: ["activity_id"], target: "activities", targetColumns: ["id"] }]
  },
  {
    name: "activity_segments",
    pk: ["activity_id", "id"],
    order: 46,
    fks: [{ columns: ["activity_id"], target: "activities", targetColumns: ["id"] }]
  },
  {
    name: "activity_segment_speakers",
    pk: ["activity_id", "segment_id", "speaker_id"],
    order: 47,
    fks: [
      {
        columns: ["activity_id", "segment_id"],
        target: "activity_segments",
        targetColumns: ["activity_id", "id"]
      },
      {
        columns: ["activity_id", "speaker_id"],
        target: "activity_speakers",
        targetColumns: ["activity_id", "id"]
      }
    ]
  },
  {
    name: "activity_segment_languages",
    pk: ["activity_id", "segment_id", "language_id"],
    order: 48,
    fks: [
      {
        columns: ["activity_id", "segment_id"],
        target: "activity_segments",
        targetColumns: ["activity_id", "id"]
      },
      {
        columns: ["activity_id", "language_id"],
        target: "activity_languages",
        targetColumns: ["activity_id", "language_id"]
      }
    ]
  },
  {
    name: "activity_language_intervals",
    pk: ["activity_id", "id"],
    order: 49,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      {
        columns: ["activity_id", "segment_id"],
        target: "activity_segments",
        targetColumns: ["activity_id", "id"]
      },
      {
        columns: ["activity_id", "language_id"],
        target: "activity_languages",
        targetColumns: ["activity_id", "language_id"]
      }
    ]
  },
  {
    name: "activity_layers",
    pk: ["activity_id", "id"],
    order: 50,
    fks: [{ columns: ["activity_id"], target: "activities", targetColumns: ["id"] }]
  },
  {
    name: "activity_layer_visibility",
    pk: ["activity_id", "layer_id", "audience"],
    order: 51,
    fks: [
      {
        columns: ["activity_id", "layer_id"],
        target: "activity_layers",
        targetColumns: ["activity_id", "id"]
      }
    ]
  },
  {
    name: "activity_phenomena",
    pk: ["activity_id", "id"],
    order: 52,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      {
        columns: ["activity_id", "segment_id"],
        target: "activity_segments",
        targetColumns: ["activity_id", "id"]
      },
      {
        columns: ["activity_id", "layer_id"],
        target: "activity_layers",
        targetColumns: ["activity_id", "id"]
      }
    ]
  },
  {
    name: "activity_annotations",
    pk: ["activity_id", "id"],
    order: 53,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      {
        columns: ["activity_id", "segment_id"],
        target: "activity_segments",
        targetColumns: ["activity_id", "id"]
      }
    ]
  },
  {
    name: "activity_overlays",
    pk: ["activity_id", "id"],
    order: 54,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      {
        columns: ["activity_id", "annotation_id"],
        target: "activity_annotations",
        targetColumns: ["activity_id", "id"]
      }
    ]
  },
  {
    name: "activity_overlay_layers",
    pk: ["activity_id", "overlay_id", "layer_id"],
    order: 55,
    fks: [
      {
        columns: ["activity_id", "overlay_id"],
        target: "activity_overlays",
        targetColumns: ["activity_id", "id"]
      },
      {
        columns: ["activity_id", "layer_id"],
        target: "activity_layers",
        targetColumns: ["activity_id", "id"]
      }
    ]
  },
  {
    name: "activity_media_links",
    pk: ["id"],
    order: 60,
    fks: [
      { columns: ["activity_id"], target: "activities", targetColumns: ["id"] },
      {
        columns: ["media_asset_id", "media_playable_id"],
        target: "media_playables",
        targetColumns: ["asset_id", "id"]
      }
    ]
  },
  {
    name: "storage_operations",
    pk: ["id"],
    order: 70,
    fks: [{ columns: ["playable_id"], target: "media_playables", targetColumns: ["id"] }]
  }
]);

const REQUIRED_COLUMNS = Object.freeze({
  languages: ["id", "code", "label", "is_active"],
  activity_folders: ["id", "name", "normalized_name", "sort_order", "created_at", "updated_at"],
  media_folders: ["id", "name", "normalized_name", "sort_order", "created_at", "updated_at"],
  media_tags: ["id", "name", "normalized_name", "created_at", "updated_at"],
  activities: [
    "id", "version", "status", "title", "revision", "allow_learner_toggle",
    "created_at", "updated_at"
  ],
  activity_pedagogical_text_fields: ["activity_id", "field_key", "knowledge_state"],
  activity_pedagogical_qualifications: [
    "activity_id", "id", "level", "validated_by", "validated_at",
    "context_text", "evidence_type", "evidence_text"
  ],
  activity_languages: ["activity_id", "language_id", "sort_order"],
  activity_transcriptions: ["activity_id", "id"],
  activity_speakers: ["activity_id", "id", "label", "sort_order"],
  activity_segments: ["activity_id", "id", "start_ms", "end_ms", "sort_order"],
  activity_segment_speakers: ["activity_id", "segment_id", "speaker_id"],
  activity_segment_languages: ["activity_id", "segment_id", "language_id"],
  activity_language_intervals: [
    "activity_id", "id", "language_id", "start_ms", "end_ms", "sort_order"
  ],
  activity_layers: ["activity_id", "id", "label", "sort_order"],
  activity_layer_visibility: [
    "activity_id", "layer_id", "audience", "is_visible", "is_default"
  ],
  activity_phenomena: [
    "activity_id", "id", "segment_id", "layer_id", "start_ms", "end_ms", "sort_order"
  ],
  activity_annotations: ["activity_id", "id", "segment_id", "sort_order"],
  activity_overlays: ["activity_id", "id", "start_ms", "end_ms", "sort_order"],
  activity_overlay_layers: ["activity_id", "overlay_id", "layer_id"],
  media_assets: ["id", "title", "lifecycle", "created_at", "updated_at"],
  media_sources: ["id", "asset_id", "kind", "created_at"],
  media_playables: [
    "id", "asset_id", "source_id", "kind", "availability", "created_at", "updated_at"
  ],
  media_playable_metadata: ["playable_id", "analysis_status"],
  media_asset_tags: ["asset_id", "tag_id", "created_at"],
  media_treatments: [
    "id", "source_asset_id", "source_playable_id", "type", "status",
    "progress", "retained", "created_at", "updated_at"
  ],
  activity_media_links: [
    "id", "activity_id", "role", "media_asset_id", "media_playable_id",
    "sort_order", "created_at", "updated_at"
  ]
});

const ENUMS = Object.freeze({
  "activities.status": ["draft", "published", "archived", "deleted"],
  "media_assets.lifecycle": ["reserved", "active", "archived", "deleted"],
  "media_sources.kind": ["local-file", "direct-url", "hls", "youtube-embed", "derived-output"],
  "media_playables.kind": ["local-file", "direct-url", "hls", "youtube-embed"],
  "media_playables.availability": [
    "available", "missing-local", "unreachable-remote", "blocked",
    "pending", "pending-removal", "unknown"
  ],
  "media_treatments.status": [
    "queued", "running", "cancelling", "completed",
    "failed", "cancelled", "interrupted"
  ],
  "activity_media_links.role": ["primary", "supplementary"],
  "activity_layer_visibility.audience": ["learner", "teacher"]
});

const PEDAGOGICAL_TEXT_FIELDS = Object.freeze([
  ["learningObjectives", "learning-objectives"],
  ["prerequisites", "prerequisites"],
  ["modalities", "modalities"],
  ["recommendedScenario", "recommended-scenario"],
  ["pedagogicalCore", "pedagogical-core"],
  ["adaptableElements", "adaptable-elements"],
  ["origin", "origin"],
  ["responsibility", "responsibility"],
  ["limitations", "limitations"]
]);

const INSERTION_PLAN = Object.freeze([
  "languages, activity_folders, media_folders (parents before children), media_tags",
  "activities",
  "media_assets roots, then descendants, with default_playable_id temporarily NULL",
  "media_sources",
  "media_playables",
  "deferred update of media_assets.default_playable_id",
  "media_playable_metadata, media_asset_tags, media_treatments",
  "activity_pedagogical_identities roots, then variants by depth",
  "activity_pedagogical_text_fields, activity_pedagogical_qualifications",
  "activity_languages, activity_transcriptions, activity_speakers, activity_segments",
  "activity_segment_speakers, activity_segment_languages, activity_language_intervals",
  "activity_layers, activity_layer_visibility, activity_phenomena",
  "activity_annotations, activity_overlays, activity_overlay_layers",
  "activity_media_links",
  "storage_operations only when explicit pending filesystem operations exist",
  "import_runs audit row created by the future transactional migrator, not by this dry-run"
]);

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => (
    `${JSON.stringify(key)}:${stableStringify(value[key])}`
  )).join(",")}}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").normalize("NFKC").toLowerCase();
}

function mariaDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function dateOnly(value) {
  const normalized = mariaDate(value);
  return normalized ? normalized.slice(0, 10) : null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}: required string`);
  return value;
}

function validIdentifier(value, label) {
  const id = requiredString(value, label);
  if (id.length > 191) throw new Error(`${label}: identifier exceeds 191 characters`);
  return id;
}

function diagnosticCollector() {
  const diagnostics = [];
  return {
    diagnostics,
    add(severity, code, message, context = {}) {
      diagnostics.push({ severity, code, message, context });
    }
  };
}

function modelFactory() {
  const tables = new Map(TABLE_DEFINITIONS.map(definition => [
    definition.name,
    { ...definition, rows: [] }
  ]));
  return {
    tables,
    add(tableName, data, source) {
      const table = tables.get(tableName);
      if (!table) throw new Error(`Unknown intermediate table: ${tableName}`);
      table.rows.push({ data, source });
    }
  };
}

function rowKey(data, columns) {
  return columns.map(column => stableStringify(data[column] ?? null)).join("\u0000");
}

function tableRows(model, tableName) {
  return model.tables.get(tableName).rows;
}

function tableData(model, tableName) {
  return tableRows(model, tableName).map(item => item.data);
}

function addSourceRows(model, sources, diagnostics, observeLocalPlayable) {
  const byKey = Object.fromEntries(sources.map(source => [source.key, source.value]));
  const activityDocument = byKey.activities;
  const classification = byKey.activityLibrary;
  const media = byKey.mediaLibrary;
  const catalog = byKey.videoCatalog;
  const languageDocument = byKey.languages;

  if (activityDocument?.schemaVersion !== "0.1" || !Array.isArray(activityDocument.activities)) {
    diagnostics.add("blocker", "ACTIVITY_SOURCE_CONTRACT", "activities.json must use schemaVersion 0.1 and an activities array");
  }
  if (classification?.schemaVersion !== "0.1" || !Array.isArray(classification.folders)) {
    diagnostics.add("blocker", "ACTIVITY_LIBRARY_CONTRACT", "activity-library.json must use schemaVersion 0.1 and a folders array");
  }
  if (media?.schemaVersion !== "1.0") {
    diagnostics.add("blocker", "MEDIA_SOURCE_CONTRACT", "video-library.json must use canonical schemaVersion 1.0");
  }
  for (const collection of ["assets", "sources", "playables", "treatments", "folders", "tags"]) {
    if (!Array.isArray(media?.[collection])) {
      diagnostics.add("blocker", "MEDIA_COLLECTION_MISSING", `video-library.json.${collection} must be an array`, { collection });
    }
  }
  if (!Array.isArray(catalog?.videos)) {
    diagnostics.add("blocker", "VIDEO_CATALOG_CONTRACT", "video-catalog.json must contain a videos array");
  }
  if (!Array.isArray(languageDocument?.languages)) {
    diagnostics.add("blocker", "LANGUAGE_SOURCE_CONTRACT", "languages.json must contain a languages array");
  }

  const sourceTimestamp = mariaDate(activityDocument.updatedAt);
  const sharedLanguages = Array.isArray(languageDocument.languages) ? languageDocument.languages : [];
  for (const language of sharedLanguages) {
    model.add("languages", {
      id: language.id,
      code: String(language.id || "").toUpperCase(),
      label: language.label,
      is_active: 1
    }, "shared/reference-data/languages.json#languages[]");
  }

  for (const [index, folder] of (classification.folders || []).entries()) {
    model.add("activity_folders", {
      id: folder.id,
      name: folder.name,
      normalized_name: normalizeName(folder.name),
      sort_order: index,
      created_at: mariaDate(folder.createdAt) || sourceTimestamp,
      updated_at: mariaDate(folder.updatedAt) || sourceTimestamp
    }, `data/activity-library.json#folders[${index}]`);
  }

  for (const [index, folder] of (media.folders || []).entries()) {
    model.add("media_folders", {
      id: folder.id,
      parent_folder_id: folder.parentFolderId ?? null,
      name: folder.name,
      normalized_name: folder.normalizedName || normalizeName(folder.name),
      sort_order: folder.sortOrder ?? index,
      created_at: mariaDate(folder.createdAt),
      updated_at: mariaDate(folder.updatedAt)
    }, `data/video-library.json#folders[${index}]`);
  }

  for (const [index, tag] of (media.tags || []).entries()) {
    model.add("media_tags", {
      id: tag.id,
      name: tag.name,
      normalized_name: tag.normalizedName || normalizeName(tag.name),
      color: tag.color ?? null,
      created_at: mariaDate(tag.createdAt),
      updated_at: mariaDate(tag.updatedAt)
    }, `data/video-library.json#tags[${index}]`);
  }

  const sourceAssets = new Map((media.assets || []).map(asset => [asset.id, asset]));
  const resolvedLineage = new Map();
  const resolveMediaLineage = (asset, stack = []) => {
    if (resolvedLineage.has(asset.id)) return resolvedLineage.get(asset.id);
    if (stack.includes(asset.id)) {
      diagnostics.add("blocker", "MEDIA_LINEAGE_CYCLE", "media asset lineage contains a cycle", {
        cycle: [...stack, asset.id]
      });
      return { parentId: null, rootId: null, depth: 0 };
    }
    let parentId = asset.parentAssetId;
    if (parentId === asset.id) parentId = null;
    if (!parentId && Array.isArray(asset.derivationTypes) && asset.derivationTypes.length) {
      const historicalSource = asset.provenance?.historical?.sourceAssetId
        || asset.provenance?.sourceAssetId
        || null;
      if (historicalSource && historicalSource !== asset.id && sourceAssets.has(historicalSource)) {
        parentId = historicalSource;
        diagnostics.add(
          "warning",
          "MEDIA_LINEAGE_RECONSTRUCTED",
          "derived asset parent reconstructed from explicit provenance",
          { assetId: asset.id, parentAssetId: parentId }
        );
      }
    }
    if (!parentId) {
      const result = { parentId: null, rootId: null, depth: 0 };
      resolvedLineage.set(asset.id, result);
      return result;
    }
    const parent = sourceAssets.get(parentId);
    if (!parent) {
      diagnostics.add("blocker", "MEDIA_PARENT_ORPHAN", "derived asset parent is absent", {
        assetId: asset.id,
        parentAssetId: parentId
      });
      const result = { parentId, rootId: null, depth: 1 };
      resolvedLineage.set(asset.id, result);
      return result;
    }
    const parentLineage = resolveMediaLineage(parent, [...stack, asset.id]);
    const rootId = parentLineage.rootId || parent.id;
    const result = { parentId, rootId, depth: parentLineage.depth + 1 };
    resolvedLineage.set(asset.id, result);
    return result;
  };

  const sortedAssets = [...(media.assets || [])].sort((a, b) => {
    const depthA = resolveMediaLineage(a).depth;
    const depthB = resolveMediaLineage(b).depth;
    return depthA - depthB || a.id.localeCompare(b.id);
  });

  for (const [index, asset] of sortedAssets.entries()) {
    const lineage = resolveMediaLineage(asset);
    const derivationTypes = Array.isArray(asset.derivationTypes) ? asset.derivationTypes : [];
    if (derivationTypes.length > 1) {
      diagnostics.add(
        "warning",
        "MULTIPLE_DERIVATION_TYPES",
        "schema 003 has one derivation_type column; the complete array remains in provenance_json",
        { assetId: asset.id, derivationTypes }
      );
    }
    model.add("media_assets", {
      id: asset.id,
      folder_id: asset.folderId ?? null,
      parent_asset_id: lineage.parentId,
      family_root_asset_id: lineage.rootId,
      default_playable_id: asset.defaultPlayableId ?? null,
      title: asset.title,
      description: asset.description ?? null,
      editorial_metadata_json: clone(asset.editorialMetadata) ?? null,
      lifecycle: asset.lifecycle,
      derivation_type: derivationTypes[0] ?? null,
      provenance_json: {
        ...(clone(asset.provenance) || {}),
        _migration: {
          originalParentAssetId: asset.parentAssetId ?? null,
          originalFamilyRootAssetId: asset.familyRootAssetId ?? null,
          derivationTypes,
          assetTechnicalMetadata: clone(asset.technicalMetadata) ?? null
        }
      },
      rights_json: clone(asset.rights) ?? {},
      created_at: mariaDate(asset.createdAt),
      updated_at: mariaDate(asset.updatedAt),
      deleted_at: asset.lifecycle === "deleted" ? mariaDate(asset.updatedAt) : null
    }, `data/video-library.json#assets[${index}]`);
  }

  for (const [index, source] of (media.sources || []).entries()) {
    const origin = clone(source.origin) || {};
    const originUrl = origin.originUrl
      || origin.sourceUrl
      || origin.url
      || origin.manifestUrl
      || origin.embedUrl
      || null;
    model.add("media_sources", {
      id: source.id,
      asset_id: source.assetId,
      kind: source.kind,
      provider: source.provider ?? null,
      transport: source.transport ?? null,
      role: source.role ?? null,
      mime_type: source.mimeType ?? null,
      origin_url: originUrl,
      origin_json: origin,
      provenance_json: clone(source.provenance) || {},
      created_at: mariaDate(source.createdAt)
    }, `data/video-library.json#sources[${index}]`);
  }

  const physicalObservations = [];
  for (const [index, playable] of (media.playables || []).entries()) {
    const location = clone(playable.location) || {};
    let storageScope = null;
    let storageKey = null;
    let locationUrl = null;
    let embedVideoId = null;
    let availability = playable.availability;
    let availabilityReason = playable.availabilityReason ?? null;

    if (playable.kind === "local-file") {
      storageScope = location.storageScope || "legacy-media";
      storageKey = location.storageKey ?? null;
      const observation = observeLocalPlayable({ playable, storageScope, storageKey });
      const exists = Boolean(observation?.exists);
      const actualSize = exists ? (observation.actualSize ?? null) : null;
      physicalObservations.push({
        playableId: playable.id,
        storageScope,
        storageKey,
        declaredAvailability: playable.availability,
        normalizedAvailability: availability,
        exists,
        actualSize,
        declaredSize: playable.technicalMetadata?.sizeBytes ?? null
      });
      if (playable.availability === "available" && !exists) {
        availability = "missing-local";
        availabilityReason = "missing-file";
        physicalObservations.at(-1).normalizedAvailability = availability;
        diagnostics.add(
          "warning",
          "AVAILABLE_LOCAL_FILE_MISSING",
          "available local playable normalized to missing-local from filesystem evidence",
          { playableId: playable.id, storageScope, storageKey }
        );
      }
      if (
        exists
        && playable.technicalMetadata?.sizeBytes !== null
        && playable.technicalMetadata?.sizeBytes !== undefined
        && playable.technicalMetadata.sizeBytes !== actualSize
      ) {
        diagnostics.add("blocker", "LOCAL_FILE_SIZE_MISMATCH", "local file size differs from declared metadata", {
          playableId: playable.id,
          declared: playable.technicalMetadata.sizeBytes,
          actual: actualSize
        });
      }
    } else if (playable.kind === "youtube-embed") {
      embedVideoId = location.videoId ?? null;
    } else {
      locationUrl = location.manifestUrl || location.url || location.sourceUrl || null;
    }

    const technical = clone(playable.technicalMetadata) || {};
    let frameRate = technical.frameRate ?? null;
    if (typeof frameRate === "string" && /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.test(frameRate)) {
      const [, numerator, denominator] = frameRate.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
      frameRate = Number(denominator) === 0 ? null : Number(numerator) / Number(denominator);
    }

    model.add("media_playables", {
      id: playable.id,
      asset_id: playable.assetId,
      source_id: playable.sourceId,
      kind: playable.kind,
      provider: playable.provider ?? null,
      role: playable.role ?? null,
      availability,
      availability_reason: availabilityReason,
      storage_scope: storageScope,
      storage_key: storageKey,
      location_url: locationUrl,
      embed_video_id: embedVideoId,
      provenance_json: {
        ...(clone(playable.provenance) || {}),
        _migration: {
          originalLocation: location,
          technicalMetadataExtras: {
            fileName: technical.fileName ?? null,
            rawFrameRate: technical.frameRate ?? null
          }
        }
      },
      created_at: mariaDate(playable.createdAt),
      updated_at: mariaDate(playable.updatedAt),
      removed_at: null
    }, `data/video-library.json#playables[${index}]`);

    model.add("media_playable_metadata", {
      playable_id: playable.id,
      analysis_status: technical.status || (technical.error ? "failed" : "unknown"),
      mime_type: technical.mimeType ?? null,
      duration_ms: technical.durationMs ?? null,
      size_bytes: technical.sizeBytes ?? null,
      sha256: technical.sha256 ?? null,
      width: technical.width ?? null,
      height: technical.height ?? null,
      frame_rate: frameRate,
      video_codec: technical.videoCodec ?? null,
      audio_codec: technical.audioCodec ?? null,
      has_audio: technical.hasAudio === null || technical.hasAudio === undefined
        ? null
        : Number(Boolean(technical.hasAudio)),
      analyzer: technical.analyzer ?? null,
      analyzer_version: technical.analyzerVersion ?? null,
      analyzed_at: mariaDate(technical.analyzedAt),
      error_text: technical.error === null || technical.error === undefined
        ? null
        : typeof technical.error === "string"
          ? technical.error
          : stableStringify(technical.error)
    }, `data/video-library.json#playables[${index}].technicalMetadata`);
  }

  for (const [assetIndex, asset] of (media.assets || []).entries()) {
    for (const [tagIndex, tagId] of (asset.tagIds || []).entries()) {
      model.add("media_asset_tags", {
        asset_id: asset.id,
        tag_id: tagId,
        created_at: mariaDate(asset.updatedAt || asset.createdAt)
      }, `data/video-library.json#assets[${assetIndex}].tagIds[${tagIndex}]`);
    }
  }

  for (const [index, treatment] of (media.treatments || []).entries()) {
    model.add("media_treatments", {
      id: treatment.id,
      source_asset_id: treatment.sourceAssetId,
      source_playable_id: treatment.sourcePlayableId,
      output_asset_id: treatment.outputAssetId ?? null,
      output_playable_id: treatment.outputPlayableId ?? null,
      published_playable_id: treatment.publishedPlayableId ?? null,
      type: treatment.type,
      label: treatment.label ?? null,
      status: treatment.status,
      progress: treatment.progress ?? 0,
      retained: Number(treatment.retained !== false),
      source_preparation_id: treatment.sourcePreparationId ?? null,
      runtime_job_id: treatment.runtimeJobId ?? null,
      engine: treatment.engine ?? null,
      engine_version: treatment.engineVersion ?? null,
      ffmpeg_version: treatment.ffmpegVersion ?? null,
      parameters_json: {
        ...(clone(treatment.parameters) || {}),
        _migration: { derivationId: treatment.derivationId ?? null }
      },
      diagnostics_json: clone(treatment.diagnostics) || {},
      error_json: clone(treatment.error) ?? null,
      created_at: mariaDate(treatment.createdAt),
      started_at: mariaDate(treatment.startedAt),
      updated_at: mariaDate(treatment.updatedAt),
      finished_at: mariaDate(treatment.finishedAt)
    }, `data/video-library.json#treatments[${index}]`);
  }

  const assignments = isPlainObject(classification.assignments) ? classification.assignments : {};
  const sourceActivities = Array.isArray(activityDocument.activities)
    ? activityDocument.activities
    : [];
  const sourceActivityIds = new Set(sourceActivities.map(activity => activity.id));
  for (const [activityId, folderId] of Object.entries(assignments)) {
    if (!sourceActivityIds.has(activityId)) {
      diagnostics.add("blocker", "ACTIVITY_FOLDER_ASSIGNMENT_ORPHAN", "folder assignment references an absent activity", {
        activityId,
        folderId
      });
    }
  }

  const playableCandidatesById = new Map();
  for (const playable of media.playables || []) {
    if (!playableCandidatesById.has(playable.id)) playableCandidatesById.set(playable.id, []);
    playableCandidatesById.get(playable.id).push(playable);
  }
  const assetCandidatesById = new Map();
  for (const asset of media.assets || []) {
    if (!assetCandidatesById.has(asset.id)) assetCandidatesById.set(asset.id, []);
    assetCandidatesById.get(asset.id).push(asset);
  }
  const playableById = new Map(
    [...playableCandidatesById].filter(([, candidates]) => candidates.length === 1)
      .map(([id, [playable]]) => [id, playable])
  );
  const assetById = new Map(
    [...assetCandidatesById].filter(([, candidates]) => candidates.length === 1)
      .map(([id, [asset]]) => [id, asset])
  );

  for (const [activityIndex, activity] of sourceActivities.entries()) {
    const activityTimestamp = mariaDate(activity.updatedAt || activity.createdAt)
      || sourceTimestamp;
    if (!activity.createdAt || !activity.updatedAt) {
      diagnostics.add(
        "warning",
        "ACTIVITY_TIMESTAMP_FALLBACK",
        "activity has no item-level timestamps; document updatedAt is proposed for both columns",
        { activityId: activity.id, fallback: activityTimestamp }
      );
    }
    model.add("activities", {
      id: activity.id,
      folder_id: assignments[activity.id] ?? null,
      version: activity.version,
      status: activity.status,
      title: activity.title,
      description: activity.description ?? null,
      instruction: activity.instruction ?? null,
      pedagogical_question: activity.pedagogicalQuestion ?? null,
      layer_configuration_id: activity.layerConfiguration?.id ?? null,
      revision: 1,
      authoring_digest: sha256(stableStringify(activity)),
      pedagogical_details_digest: activity.pedagogicalIdentity
        ? sha256(stableStringify(activity.pedagogicalIdentity))
        : null,
      allow_learner_toggle: Number(activity.layerConfiguration?.allowLearnerToggle !== false),
      created_at: activityTimestamp,
      updated_at: activityTimestamp,
      deleted_at: activity.status === "deleted" ? activityTimestamp : null
    }, `data/activities.json#activities[${activityIndex}]`);

    if (activity.pedagogicalIdentity) {
      const identity = activity.pedagogicalIdentity;
      const lineage = identity.lineage || {};
      const knownIdentityKeys = new Set([
        "schemaVersion", "designStatus", "resourceNature", "indicativeDuration",
        "intention", "audience", "useContext", "lineage", "qualifications",
        ...PEDAGOGICAL_TEXT_FIELDS.map(([sourceKey]) => sourceKey)
      ]);
      const extended = Object.fromEntries(
        Object.entries(identity).filter(([key]) => !knownIdentityKeys.has(key))
      );
      model.add("activity_pedagogical_identities", {
        activity_id: activity.id,
        schema_version: identity.schemaVersion ?? null,
        design_status: identity.designStatus ?? null,
        resource_nature_state: identity.resourceNature?.state ?? null,
        resource_nature_value: identity.resourceNature?.value ?? null,
        resource_nature_note: identity.resourceNature?.note ?? null,
        duration_state: identity.indicativeDuration?.state ?? null,
        duration_minutes: identity.indicativeDuration?.minutes ?? null,
        duration_note: identity.indicativeDuration?.note ?? null,
        intention_state: identity.intention?.state ?? null,
        intention_value: identity.intention?.value ?? null,
        intention_note: identity.intention?.note ?? null,
        audience_state: identity.audience?.state ?? null,
        audience_value: identity.audience?.value ?? null,
        audience_note: identity.audience?.note ?? null,
        use_context_state: identity.useContext?.state ?? null,
        use_context_value: identity.useContext?.value ?? null,
        use_context_note: identity.useContext?.note ?? null,
        lineage_state: lineage.state ?? null,
        lineage_relation: lineage.relation ?? null,
        parent_activity_id: lineage.parentActivityId ?? null,
        root_activity_id: lineage.rootActivityId ?? null,
        lineage_note: lineage.note ?? null,
        extended_fields_json: Object.keys(extended).length ? extended : null,
        created_at: activityTimestamp,
        updated_at: activityTimestamp
      }, `data/activities.json#activities[${activityIndex}].pedagogicalIdentity`);

      for (const [sourceKey, fieldKey] of PEDAGOGICAL_TEXT_FIELDS) {
        const field = identity[sourceKey];
        if (!field) continue;
        model.add("activity_pedagogical_text_fields", {
          activity_id: activity.id,
          field_key: fieldKey,
          knowledge_state: field.state,
          value_text: field.value ?? null,
          note: field.note ?? null
        }, `data/activities.json#activities[${activityIndex}].pedagogicalIdentity.${sourceKey}`);
      }

      for (const [qualificationIndex, qualification] of (identity.qualifications || []).entries()) {
        model.add("activity_pedagogical_qualifications", {
          activity_id: activity.id,
          id: qualification.id,
          level: qualification.level,
          validated_by: qualification.validatedBy,
          validated_at: dateOnly(qualification.validatedAt),
          context_text: qualification.context,
          evidence_type: qualification.evidenceType,
          evidence_text: qualification.evidence,
          note: qualification.note ?? null
        }, `data/activities.json#activities[${activityIndex}].pedagogicalIdentity.qualifications[${qualificationIndex}]`);
      }
    }

    for (const [index, language] of (activity.languages || []).entries()) {
      model.add("activity_languages", {
        activity_id: activity.id,
        language_id: language.id,
        local_label: language.label ?? null,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].languages[${index}]`);
    }

    if (activity.transcription) {
      model.add("activity_transcriptions", {
        activity_id: activity.id,
        id: activity.transcription.id,
        language_id: activity.transcription.languageId ?? null,
        label: activity.transcription.label ?? null
      }, `data/activities.json#activities[${activityIndex}].transcription`);
    }

    for (const [index, speaker] of (activity.speakers || []).entries()) {
      model.add("activity_speakers", {
        activity_id: activity.id,
        id: speaker.id,
        label: speaker.label,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].speakers[${index}]`);
    }

    for (const [index, segment] of (activity.segments || []).entries()) {
      model.add("activity_segments", {
        activity_id: activity.id,
        id: segment.id,
        start_ms: segment.startMs,
        end_ms: segment.endMs,
        text: segment.text ?? null,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].segments[${index}]`);
      for (const speakerId of segment.speakerIds || []) {
        model.add("activity_segment_speakers", {
          activity_id: activity.id,
          segment_id: segment.id,
          speaker_id: speakerId
        }, `data/activities.json#activities[${activityIndex}].segments[${index}].speakerIds`);
      }
      for (const languageId of segment.languageIds || []) {
        model.add("activity_segment_languages", {
          activity_id: activity.id,
          segment_id: segment.id,
          language_id: languageId
        }, `data/activities.json#activities[${activityIndex}].segments[${index}].languageIds`);
      }
    }

    for (const [index, interval] of (activity.languageIntervals || []).entries()) {
      model.add("activity_language_intervals", {
        activity_id: activity.id,
        id: interval.id,
        segment_id: interval.segmentId ?? null,
        language_id: interval.languageId,
        start_ms: interval.startMs,
        end_ms: interval.endMs,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].languageIntervals[${index}]`);
    }

    const layerConfig = activity.layerConfiguration || {};
    const defaultVisible = new Set(layerConfig.defaultVisibleLayerIds || []);
    const learnerVisible = new Set(layerConfig.learnerVisibleLayerIds || []);
    const teacherVisible = new Set(layerConfig.teacherVisibleLayerIds || []);
    for (const [index, layer] of (activity.layers || []).entries()) {
      model.add("activity_layers", {
        activity_id: activity.id,
        id: layer.id,
        label: layer.label,
        description: layer.description ?? null,
        color: layer.color ?? null,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].layers[${index}]`);
      for (const [audience, visibleSet] of [
        ["learner", learnerVisible],
        ["teacher", teacherVisible]
      ]) {
        model.add("activity_layer_visibility", {
          activity_id: activity.id,
          layer_id: layer.id,
          audience,
          is_visible: Number(visibleSet.has(layer.id)),
          is_default: Number(defaultVisible.has(layer.id))
        }, `data/activities.json#activities[${activityIndex}].layerConfiguration`);
      }
    }

    for (const [index, phenomenon] of (activity.phenomena || []).entries()) {
      model.add("activity_phenomena", {
        activity_id: activity.id,
        id: phenomenon.id,
        segment_id: phenomenon.segmentId,
        layer_id: phenomenon.layerId,
        start_ms: phenomenon.startMs,
        end_ms: phenomenon.endMs,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].phenomena[${index}]`);
    }

    for (const [index, annotation] of (activity.teacherAnnotations || []).entries()) {
      model.add("activity_annotations", {
        activity_id: activity.id,
        id: annotation.id,
        segment_id: annotation.segmentId,
        note: annotation.note ?? null,
        pedagogical_question: annotation.pedagogicalQuestion ?? null,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].teacherAnnotations[${index}]`);
    }

    for (const [index, overlay] of (activity.overlays || []).entries()) {
      model.add("activity_overlays", {
        activity_id: activity.id,
        id: overlay.id,
        annotation_id: overlay.annotationId ?? null,
        start_ms: overlay.startMs,
        end_ms: overlay.endMs,
        title: overlay.title ?? null,
        text: overlay.text ?? null,
        sort_order: index
      }, `data/activities.json#activities[${activityIndex}].overlays[${index}]`);
      for (const layerId of overlay.layerIds || []) {
        model.add("activity_overlay_layers", {
          activity_id: activity.id,
          overlay_id: overlay.id,
          layer_id: layerId
        }, `data/activities.json#activities[${activityIndex}].overlays[${index}].layerIds`);
      }
    }

    const requestedPlayableId = activity.videoRef?.playableId || activity.video?.id || null;
    const requestedAssetId = activity.videoRef?.assetId
      || playableById.get(requestedPlayableId)?.assetId
      || null;
    const playableCandidateCount = playableCandidatesById.get(requestedPlayableId)?.length || 0;
    const assetCandidateCount = assetCandidatesById.get(requestedAssetId)?.length || 0;
    const playable = playableById.get(requestedPlayableId);
    const asset = assetById.get(requestedAssetId);
    if (
      playableCandidateCount !== 1
      || assetCandidateCount !== 1
      || !playable
      || !asset
      || playable.assetId !== asset.id
    ) {
      diagnostics.add(
        "blocker",
        playableCandidateCount > 1 || assetCandidateCount > 1
          ? "ACTIVITY_PRIMARY_MEDIA_AMBIGUOUS"
          : "ACTIVITY_PRIMARY_MEDIA_ORPHAN",
        "activity primary media must resolve to exactly one canonical playable and asset",
        {
        activityId: activity.id,
        requestedAssetId,
        requestedPlayableId,
        playableCandidateCount,
        assetCandidateCount
        }
      );
    } else {
      const linkSeed = `${activity.id}\u0000primary\u0000${asset.id}\u0000${playable.id}`;
      model.add("activity_media_links", {
        id: `link-${sha256(linkSeed).slice(0, 32)}`,
        activity_id: activity.id,
        role: "primary",
        media_asset_id: asset.id,
        media_playable_id: playable.id,
        sort_order: 0,
        created_at: activityTimestamp,
        updated_at: activityTimestamp
      }, `data/activities.json#activities[${activityIndex}].video`);

    }
  }

  for (const [index, video] of (catalog.videos || []).entries()) {
    const playable = playableById.get(video.id);
    const expectedAssetId = playable?.assetId || null;
    if (!playable || !expectedAssetId || !assetById.has(expectedAssetId)) {
      diagnostics.add(
        "blocker",
        "CATALOG_MEDIA_NOT_CANONICAL",
        "compatibility catalog entry has no canonical media counterpart",
        { catalogIndex: index, videoId: video.id }
      );
    }
  }

  return { physicalObservations };
}

function assertUniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    const id = validIdentifier(item.id, label);
    if (seen.has(id)) {
      const error = new Error(`${label}: duplicate id ${id}`);
      error.code = "DUPLICATE_ID";
      throw error;
    }
    seen.add(id);
  }
}

function assertLogicalForeignKey(sourceRows, sourceColumns, targetRows, targetColumns, label) {
  const targets = new Set(targetRows.map(row => rowKey(row, targetColumns)));
  for (const row of sourceRows) {
    const values = sourceColumns.map(column => row[column]);
    if (values.some(value => value === null || value === undefined)) continue;
    const key = rowKey(row, sourceColumns);
    if (!targets.has(key)) {
      const error = new Error(`${label}: orphan foreign key ${key}`);
      error.code = "ORPHAN_FOREIGN_KEY";
      throw error;
    }
  }
}

function assertAcyclic(items, idKey, parentKey, label) {
  const byId = new Map(items.map(item => [item[idKey], item]));
  for (const item of items) {
    const visited = new Set();
    let current = item;
    while (current?.[parentKey] !== null && current?.[parentKey] !== undefined) {
      if (visited.has(current[idKey])) {
        const error = new Error(`${label}: cycle detected at ${current[idKey]}`);
        error.code = "CYCLE";
        throw error;
      }
      visited.add(current[idKey]);
      current = byId.get(current[parentKey]);
    }
  }
}

function assertLocator(row) {
  const local = row.kind === "local-file";
  const storagePresent = typeof row.storage_scope === "string"
    && row.storage_scope.trim()
    && typeof row.storage_key === "string"
    && row.storage_key.trim();
  const remotePresent = typeof row.location_url === "string" && row.location_url.trim()
    || typeof row.embed_video_id === "string" && row.embed_video_id.trim();
  const valid = local
    ? storagePresent && row.location_url === null && row.embed_video_id === null
    : row.storage_scope === null && row.storage_key === null && remotePresent;
  if (!valid) {
    const error = new Error(`invalid playable locator for ${row.id}`);
    error.code = "INVALID_LOCATOR";
    throw error;
  }
}

function assertRequiredRow(row, columns, label) {
  for (const column of columns) {
    if (row[column] === null || row[column] === undefined || row[column] === "") {
      const error = new Error(`${label}: required column ${column} is absent`);
      error.code = "REQUIRED_FIELD";
      throw error;
    }
  }
}

function assertEnumValue(value, allowed, label) {
  if (!allowed.includes(value)) {
    const error = new Error(`${label}: unknown enumeration ${String(value)}`);
    error.code = "UNKNOWN_ENUM";
    throw error;
  }
}

function assertCompletedTreatmentContract(row, playableRows) {
  if (row.status !== "completed") return;
  if (!row.output_asset_id || !row.output_playable_id || !row.finished_at) {
    const error = new Error(
      `completed treatment ${row.id} must preserve its output asset, output playable and finished_at`
    );
    error.code = "TREATMENT_COMPLETED_OUTPUT_INCOMPLETE";
    throw error;
  }
  const outputCandidates = playableRows.filter(
    playable => playable.id === row.output_playable_id
  );
  if (
    outputCandidates.length !== 1
    || outputCandidates[0].asset_id !== row.output_asset_id
  ) {
    const error = new Error(
      `completed treatment ${row.id} output playable is absent, ambiguous or owned by another asset`
    );
    error.code = "TREATMENT_OUTPUT_PLAYABLE_INVALID";
    throw error;
  }
  if (row.published_playable_id !== null && row.published_playable_id !== undefined) {
    const publishedCandidates = playableRows.filter(
      playable => playable.id === row.published_playable_id
    );
    if (
      publishedCandidates.length !== 1
      || publishedCandidates[0].asset_id !== row.output_asset_id
    ) {
      const error = new Error(
        `completed treatment ${row.id} published playable is absent, ambiguous or owned by another asset`
      );
      error.code = "TREATMENT_PUBLISHED_PLAYABLE_INVALID";
      throw error;
    }
  }
}

function validateIntermediate(model, diagnostics) {
  for (const table of model.tables.values()) {
    const seen = new Set();
    for (const entry of table.rows) {
      const key = rowKey(entry.data, table.pk);
      if (seen.has(key)) {
        diagnostics.add("blocker", "DUPLICATE_PRIMARY_KEY", "duplicate intermediate primary key", {
          table: table.name,
          key
        });
      }
      seen.add(key);
      try {
        assertRequiredRow(entry.data, REQUIRED_COLUMNS[table.name] || [], table.name);
      } catch (error) {
        diagnostics.add("blocker", error.code, error.message, { table: table.name, source: entry.source });
      }
    }
  }

  const generatedRows = new Map();
  for (const table of model.tables.values()) {
    generatedRows.set(table.name, table.rows.map(entry => {
      if (table.name !== "media_assets") return entry.data;
      return {
        ...entry.data,
        lineage_root_key: entry.data.family_root_asset_id || entry.data.id
      };
    }));
  }

  for (const table of model.tables.values()) {
    for (const foreignKey of table.fks || []) {
      try {
        assertLogicalForeignKey(
          generatedRows.get(table.name),
          foreignKey.columns,
          generatedRows.get(foreignKey.target),
          foreignKey.targetColumns,
          `${table.name} -> ${foreignKey.target}`
        );
      } catch (error) {
        diagnostics.add("blocker", error.code, error.message, {
          table: table.name,
          target: foreignKey.target,
          deferred: Boolean(foreignKey.deferred)
        });
      }
    }
  }

  for (const [qualifiedName, allowed] of Object.entries(ENUMS)) {
    const [tableName, column] = qualifiedName.split(".");
    for (const row of tableData(model, tableName)) {
      try {
        assertEnumValue(row[column], allowed, qualifiedName);
      } catch (error) {
        diagnostics.add("blocker", error.code, error.message, { table: tableName, id: row.id ?? null });
      }
    }
  }

  for (const row of tableData(model, "media_playables")) {
    try {
      assertLocator(row);
    } catch (error) {
      diagnostics.add("blocker", error.code, error.message, { playableId: row.id });
    }
  }

  const uniqueCandidates = [
    ["languages", ["code"]],
    ["activity_folders", ["normalized_name"]],
    ["media_tags", ["normalized_name"]],
    ["media_folders", ["parent_folder_id", "normalized_name"]],
    ["media_playables", ["storage_scope", "storage_key"]],
    ["activity_media_links", ["activity_id", "media_asset_id"]],
    ["activity_media_links", ["activity_id", "role", "sort_order"]]
  ];
  for (const [tableName, columns] of uniqueCandidates) {
    const seen = new Set();
    for (const row of tableData(model, tableName)) {
      const values = columns.map(column => row[column]);
      if (tableName === "media_playables" && values.some(value => value === null)) continue;
      const key = rowKey(row, columns);
      if (seen.has(key)) {
        diagnostics.add("blocker", "DUPLICATE_CANDIDATE_KEY", "duplicate candidate key", {
          table: tableName,
          columns,
          key
        });
      }
      seen.add(key);
    }
  }

  for (const [tableName, parentColumn] of [
    ["media_folders", "parent_folder_id"],
    ["media_assets", "parent_asset_id"]
  ]) {
    try {
      assertAcyclic(tableData(model, tableName), "id", parentColumn, tableName);
    } catch (error) {
      diagnostics.add("blocker", error.code, error.message, { table: tableName });
    }
  }

  const identityRows = tableData(model, "activity_pedagogical_identities");
  try {
    assertAcyclic(identityRows, "activity_id", "parent_activity_id", "pedagogical lineage");
  } catch (error) {
    diagnostics.add("blocker", error.code, error.message, { table: "activity_pedagogical_identities" });
  }

  const playableRows = tableData(model, "media_playables");
  for (const row of tableData(model, "media_treatments")) {
    try {
      assertCompletedTreatmentContract(row, playableRows);
    } catch (error) {
      diagnostics.add("blocker", error.code, error.message, {
        treatmentId: row.id,
        outputAssetId: row.output_asset_id,
        outputPlayableId: row.output_playable_id,
        publishedPlayableId: row.published_playable_id
      });
    }
    if (row.status === "queued" && Number(row.progress) !== 0) {
      diagnostics.add("blocker", "TREATMENT_PROGRESS_INVALID", "queued treatment progress must be 0", {
        treatmentId: row.id
      });
    }
    if (row.status === "completed" && Number(row.progress) !== 100) {
      diagnostics.add("blocker", "TREATMENT_PROGRESS_INVALID", "completed treatment progress must be 100", {
        treatmentId: row.id
      });
    }
  }

  for (const tableName of [
    "activity_segments", "activity_language_intervals", "activity_phenomena",
    "activity_overlays"
  ]) {
    for (const row of tableData(model, tableName)) {
      if (
        !Number.isInteger(row.start_ms)
        || !Number.isInteger(row.end_ms)
        || row.start_ms < 0
        || row.end_ms <= row.start_ms
      ) {
        diagnostics.add("blocker", "INVALID_TIME_RANGE", "time range must use non-negative integer milliseconds and end after start", {
          table: tableName,
          id: row.id
        });
      }
    }
  }

  const intervals = tableData(model, "activity_language_intervals");
  const semanticIntervalKeys = new Map();
  for (const row of intervals) {
    const key = rowKey(row, ["activity_id", "segment_id", "language_id", "start_ms", "end_ms"]);
    if (semanticIntervalKeys.has(key)) {
      diagnostics.add(
        "warning",
        "SEMANTIC_INTERVAL_DUPLICATE",
        "two distinct interval IDs carry the same semantic interval; both are preserved",
        { firstId: semanticIntervalKeys.get(key), secondId: row.id }
      );
    } else {
      semanticIntervalKeys.set(key, row.id);
    }
  }
}

function relationalModelFromCanonicalSnapshot(snapshot, {
  observeLocalPlayable = () => ({ exists: false, actualSize: null }),
  throwOnBlockers = true
} = {}) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("canonical snapshot must be an object");
  }
  const values = {
    activities: snapshot.activities,
    activityLibrary: snapshot.activityLibrary,
    mediaLibrary: snapshot.mediaLibrary || snapshot.videoLibrary,
    videoCatalog: snapshot.videoCatalog,
    languages: snapshot.languages || snapshot.languageCatalog
  };
  for (const definition of SOURCE_DEFINITIONS) {
    if (!values[definition.key] || typeof values[definition.key] !== "object") {
      const error = new Error(`canonical snapshot is missing ${definition.key}`);
      error.code = "SNAPSHOT_SOURCE_MISSING";
      throw error;
    }
  }
  const sources = SOURCE_DEFINITIONS.map(definition => {
    const value = structuredClone(values[definition.key]);
    const bytes = Buffer.from(`${stableStringify(value)}\n`, "utf8");
    return {
      ...definition,
      absolutePath: null,
      size: bytes.length,
      sha256: sha256(bytes),
      value
    };
  });
  const collector = diagnosticCollector();
  const model = modelFactory();
  const observations = addSourceRows(model, sources, collector, observeLocalPlayable);
  validateIntermediate(model, collector);
  for (const table of model.tables.values()) {
    table.rows.sort((left, right) => (
      rowKey(left.data, table.pk).localeCompare(rowKey(right.data, table.pk))
    ));
  }
  collector.diagnostics.sort((a, b) => (
    a.severity.localeCompare(b.severity)
    || a.code.localeCompare(b.code)
    || stableStringify(a.context).localeCompare(stableStringify(b.context))
  ));
  const blockers = collector.diagnostics.filter(item => item.severity === "blocker");
  if (throwOnBlockers && blockers.length) {
    const error = new Error("canonical snapshot cannot be represented by the MariaDB contract");
    error.code = "SNAPSHOT_RELATIONAL_MAPPING_BLOCKED";
    error.diagnostics = blockers;
    throw error;
  }
  return {
    model,
    sources,
    diagnostics: collector.diagnostics,
    observations
  };
}

export {
  TABLE_DEFINITIONS,
  relationalModelFromCanonicalSnapshot,
  stableStringify
};
