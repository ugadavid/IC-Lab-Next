#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_FILE);
const DEFAULT_PROTOTYPE_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..", "..");
const SCHEMA_RELATIVE_PATH = "database/drafts/003_proto05_schema_hardening.sql";
const ALIGNMENT_MIGRATION_RELATIVE_PATH =
  "database/migrations/002_proto05_mariadb_schema_alignment.sql";

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

function parseJsonText(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`${label}: invalid JSON (${error.message})`);
    wrapped.code = "INVALID_JSON";
    throw wrapped;
  }
}

function readSourceFile(prototypeDirectory, definition) {
  const absolutePath = path.resolve(prototypeDirectory, definition.relativePath);
  let bytes;
  try {
    bytes = fs.readFileSync(absolutePath);
  } catch (error) {
    const wrapped = new Error(
      `${definition.relativePath}: source is missing or unreadable (${error.code || error.message})`
    );
    wrapped.code = "SOURCE_MISSING";
    throw wrapped;
  }
  return {
    ...definition,
    absolutePath,
    size: bytes.length,
    sha256: sha256(bytes),
    value: parseJsonText(bytes.toString("utf8"), definition.relativePath)
  };
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

const COVERAGE_STATUSES = Object.freeze([
  "column-mapped",
  "json-preserved",
  "validation-only",
  "explicitly-excluded",
  "unmapped-blocking"
]);

const EMPTY_ARRAY_TOKEN = Symbol("empty-array");

function coverageRegistryKey(source, fieldPath) {
  return `${source}\u0000${fieldPath}`;
}

function registerCoverage(registry, source, fieldPaths, rule) {
  for (const fieldPath of fieldPaths) {
    const key = coverageRegistryKey(source, fieldPath);
    if (registry.has(key)) throw new Error(`duplicate coverage rule for ${source}:${fieldPath}`);
    registry.set(key, Object.freeze({
      source,
      fieldPath,
      ...rule
    }));
  }
}

function flattenExplicitShape(prefix, shape, output = new Set()) {
  if (shape === true) {
    output.add(prefix);
    return output;
  }
  if (Array.isArray(shape)) {
    const arrayPath = `${prefix}[]`;
    output.add(arrayPath);
    if (shape.length) flattenExplicitShape(arrayPath, shape[0], output);
    return output;
  }
  if (isPlainObject(shape)) {
    output.add(prefix);
    for (const [key, child] of Object.entries(shape)) {
      flattenExplicitShape(`${prefix}.${key}`, child, output);
    }
    return output;
  }
  throw new Error(`invalid explicit coverage shape at ${prefix}`);
}

function columnCoverage(registry, source, builder, selector, mappings) {
  for (const [fieldPath, definition] of Object.entries(mappings)) {
    const normalized = typeof definition === "string" ? { column: definition } : definition;
    registerCoverage(registry, source, [fieldPath], {
      status: "column-mapped",
      table: normalized.table,
      column: normalized.column,
      builder,
      selector,
      selectorArgument: normalized.selectorArgument ?? null,
      transformation: normalized.transformation || "identity",
      absence: normalized.absence || "property absence remains distinct; NULL is preserved when allowed",
      destination: `${normalized.table}.${normalized.column}`
    });
  }
}

function jsonCoverage(registry, source, prefix, shape, definition) {
  registerCoverage(registry, source, [...flattenExplicitShape(prefix, shape)], {
    status: "json-preserved",
    table: definition.table,
    column: definition.column,
    builder: definition.builder,
    selector: definition.selector,
    sourceRoot: prefix,
    targetRoot: definition.targetRoot || "",
    destination: `${definition.table}.${definition.column}${definition.targetRoot ? `.${definition.targetRoot}` : ""}`,
    absence: "object keys, NULL, empty strings, zeroes and empty collections are compared distinctly"
  });
}

function validationCoverage(registry, source, fieldPaths, definition) {
  registerCoverage(registry, source, fieldPaths, {
    status: "validation-only",
    validationId: definition.validationId,
    executor: "validateCoverageOccurrence",
    invariant: definition.invariant,
    failure: definition.failure || "blocking diagnostic",
    destination: `validation:${definition.validationId}`
  });
}

function explicitUnmappedCoverage(registry, source, fieldPaths, rationale) {
  registerCoverage(registry, source, fieldPaths, {
    status: "unmapped-blocking",
    destination: null,
    rationale,
    severity: "blocker"
  });
}

const MASK_SHAPE = Object.freeze({
  id: true,
  time: true,
  x: true,
  y: true,
  width: true,
  height: true
});

const KEYFRAME_SHAPE = Object.freeze({
  time: true,
  x: true,
  y: true,
  width: true,
  height: true
});

const BLUR_SHAPE = Object.freeze({
  id: true,
  label: true,
  filter: true,
  lumaRadius: true,
  lumaPower: true
});

const TEMPORAL_MASK_SHAPE = Object.freeze({
  id: true,
  startMs: true,
  endMs: true,
  keyframes: [KEYFRAME_SHAPE]
});

const TEMPORAL_STEP_SHAPE = Object.freeze({
  id: true,
  startMs: true,
  endMs: true,
  masks: [MASK_SHAPE]
});

const PROVENANCE_SHAPE = Object.freeze({
  blur: BLUR_SHAPE,
  createdAt: true,
  creationType: true,
  derivationId: true,
  familyRootAssetId: true,
  ffmpeg: true,
  ffmpegVersion: true,
  historical: {
    blur: BLUR_SHAPE,
    catalogId: true,
    createdAt: true,
    importedAt: true,
    kind: true,
    masks: [MASK_SHAPE],
    method: true,
    mode: true,
    originalFileName: true,
    pathsRedacted: true,
    sha256: true,
    sizeBytes: true,
    sourceAssetId: true,
    sourcePreparationJobId: true,
    status: true,
    temporalMasks: [TEMPORAL_MASK_SHAPE],
    temporalSteps: [TEMPORAL_STEP_SHAPE]
  },
  importedAt: true,
  interpolation: true,
  kind: true,
  legacyId: true,
  masks: [MASK_SHAPE],
  method: true,
  mode: true,
  originalFileName: true,
  originReference: true,
  parentAssetId: true,
  provider: true,
  sha256: true,
  sizeBytes: true,
  sourceAssetId: true,
  sourcePlayableId: true,
  sourcePreparationJobId: true,
  status: true,
  temporalMasks: [TEMPORAL_MASK_SHAPE],
  temporalSteps: [TEMPORAL_STEP_SHAPE]
});

const TECHNICAL_METADATA_SHAPE = Object.freeze({
  analyzedAt: true,
  analyzer: true,
  analyzerVersion: true,
  audioCodec: true,
  durationMs: true,
  error: true,
  fileName: true,
  frameRate: true,
  hasAudio: true,
  height: true,
  mimeType: true,
  sha256: true,
  sizeBytes: true,
  status: true,
  videoCodec: true,
  width: true
});

const EDITORIAL_METADATA_SHAPE = Object.freeze({
  usage: true,
  context: true,
  responsibleParty: true,
  captureDate: true,
  languageIds: [true],
  notes: true
});

const SOURCE_ORIGIN_SHAPE = Object.freeze({
  declaredLocal: true,
  derivationId: true,
  embedUrl: true,
  manifestUrl: true,
  originalFileName: true,
  originUrl: true,
  proxyUrl: true,
  sourceAssetId: true,
  sourcePlayableId: true,
  sourceUrl: true,
  url: true,
  videoId: true
});

const TREATMENT_PARAMETERS_SHAPE = Object.freeze({
  blur: BLUR_SHAPE,
  masks: [MASK_SHAPE],
  method: true,
  mode: true,
  temporalMasks: [TEMPORAL_MASK_SHAPE],
  temporalSteps: [TEMPORAL_STEP_SHAPE]
});

function buildCoverageRegistry() {
  const registry = new Map();

  columnCoverage(registry, "languages", "buildLanguages", "language-reference", {
    "languages[].id": { table: "languages", column: "id" },
    "languages[].label": { table: "languages", column: "label" }
  });

  validationCoverage(registry, "activities", ["schemaVersion"], {
    validationId: "activities-document-schema",
    invariant: "activities.json schemaVersion equals 0.1"
  });
  validationCoverage(registry, "activities", ["updatedAt"], {
    validationId: "activities-document-timestamp",
    invariant: "document timestamp is valid and is the deterministic fallback for undated activities"
  });
  validationCoverage(registry, "activityLibrary", ["schemaVersion"], {
    validationId: "activity-library-schema",
    invariant: "activity-library.json schemaVersion equals 0.1"
  });
  validationCoverage(registry, "activityLibrary", ["updatedAt"], {
    validationId: "activity-library-timestamp",
    invariant: "activity-library document timestamp is valid"
  });
  validationCoverage(registry, "mediaLibrary", ["schemaVersion"], {
    validationId: "media-library-schema",
    invariant: "video-library.json schemaVersion equals 1.0"
  });
  validationCoverage(registry, "mediaLibrary", ["updatedAt"], {
    validationId: "media-library-timestamp",
    invariant: "media-library document timestamp is valid"
  });
  validationCoverage(registry, "videoCatalog", ["schemaVersion"], {
    validationId: "video-catalog-schema",
    invariant: "video-catalog.json schemaVersion equals 0.1"
  });

  columnCoverage(registry, "activityLibrary", "buildActivityFolders", "activity-folder", {
    "folders[].id": { table: "activity_folders", column: "id" },
    "folders[].name": { table: "activity_folders", column: "name" },
    "folders[].createdAt": {
      table: "activity_folders",
      column: "created_at",
      transformation: "maria-date"
    },
    "folders[].updatedAt": {
      table: "activity_folders",
      column: "updated_at",
      transformation: "maria-date"
    },
    "assignments.proto05-augmented-video-01": {
      table: "activities",
      column: "folder_id",
      selectorArgument: "proto05-augmented-video-01"
    }
  });

  columnCoverage(registry, "mediaLibrary", "buildMediaFolders", "media-folder", {
    "folders[].id": { table: "media_folders", column: "id" },
    "folders[].parentFolderId": { table: "media_folders", column: "parent_folder_id" },
    "folders[].name": { table: "media_folders", column: "name" },
    "folders[].sortOrder": { table: "media_folders", column: "sort_order" },
    "folders[].createdAt": {
      table: "media_folders",
      column: "created_at",
      transformation: "maria-date"
    },
    "folders[].updatedAt": {
      table: "media_folders",
      column: "updated_at",
      transformation: "maria-date"
    }
  });

  columnCoverage(registry, "mediaLibrary", "buildMediaTags", "media-tag", {
    "tags[].id": { table: "media_tags", column: "id" },
    "tags[].name": { table: "media_tags", column: "name" },
    "tags[].normalizedName": { table: "media_tags", column: "normalized_name" },
    "tags[].color": { table: "media_tags", column: "color" },
    "tags[].createdAt": {
      table: "media_tags",
      column: "created_at",
      transformation: "maria-date"
    },
    "tags[].updatedAt": {
      table: "media_tags",
      column: "updated_at",
      transformation: "maria-date"
    }
  });

  columnCoverage(registry, "mediaLibrary", "buildMediaAssets", "media-asset", {
    "assets[].id": { table: "media_assets", column: "id" },
    "assets[].folderId": { table: "media_assets", column: "folder_id" },
    "assets[].defaultPlayableId": { table: "media_assets", column: "default_playable_id" },
    "assets[].title": { table: "media_assets", column: "title" },
    "assets[].description": { table: "media_assets", column: "description" },
    "assets[].lifecycle": { table: "media_assets", column: "lifecycle" },
    "assets[].createdAt": {
      table: "media_assets",
      column: "created_at",
      transformation: "maria-date"
    },
    "assets[].updatedAt": {
      table: "media_assets",
      column: "updated_at",
      transformation: "maria-date"
    },
    "assets[].tagIds[]": {
      table: "media_asset_tags",
      column: "tag_id",
      selectorArgument: "asset-tag"
    }
  });
  jsonCoverage(registry, "mediaLibrary", "assets[].provenance", PROVENANCE_SHAPE, {
    table: "media_assets",
    column: "provenance_json",
    builder: "buildMediaAssets",
    selector: "media-asset"
  });
  jsonCoverage(registry, "mediaLibrary", "assets[].rights", {}, {
    table: "media_assets",
    column: "rights_json",
    builder: "buildMediaAssets",
    selector: "media-asset"
  });
  jsonCoverage(registry, "mediaLibrary", "assets[].editorialMetadata", EDITORIAL_METADATA_SHAPE, {
    table: "media_assets",
    column: "editorial_metadata_json",
    builder: "buildMediaAssets",
    selector: "media-asset"
  });
  jsonCoverage(registry, "mediaLibrary", "assets[].technicalMetadata", TECHNICAL_METADATA_SHAPE, {
    table: "media_assets",
    column: "provenance_json",
    targetRoot: "_migration.assetTechnicalMetadata",
    builder: "buildMediaAssets",
    selector: "media-asset"
  });
  jsonCoverage(registry, "mediaLibrary", "assets[].derivationTypes", [true], {
    table: "media_assets",
    column: "provenance_json",
    targetRoot: "_migration.derivationTypes",
    builder: "buildMediaAssets",
    selector: "media-asset"
  });
  jsonCoverage(registry, "mediaLibrary", "assets[].parentAssetId", true, {
    table: "media_assets",
    column: "provenance_json",
    targetRoot: "_migration.originalParentAssetId",
    builder: "buildMediaAssets",
    selector: "media-asset"
  });
  jsonCoverage(registry, "mediaLibrary", "assets[].familyRootAssetId", true, {
    table: "media_assets",
    column: "provenance_json",
    targetRoot: "_migration.originalFamilyRootAssetId",
    builder: "buildMediaAssets",
    selector: "media-asset"
  });
  columnCoverage(registry, "mediaLibrary", "buildMediaSources", "media-source", {
    "sources[].id": { table: "media_sources", column: "id" },
    "sources[].assetId": { table: "media_sources", column: "asset_id" },
    "sources[].kind": { table: "media_sources", column: "kind" },
    "sources[].provider": { table: "media_sources", column: "provider" },
    "sources[].transport": { table: "media_sources", column: "transport" },
    "sources[].role": { table: "media_sources", column: "role" },
    "sources[].mimeType": { table: "media_sources", column: "mime_type" },
    "sources[].createdAt": {
      table: "media_sources",
      column: "created_at",
      transformation: "maria-date"
    }
  });
  jsonCoverage(registry, "mediaLibrary", "sources[].origin", SOURCE_ORIGIN_SHAPE, {
    table: "media_sources",
    column: "origin_json",
    builder: "buildMediaSources",
    selector: "media-source"
  });
  jsonCoverage(registry, "mediaLibrary", "sources[].provenance", PROVENANCE_SHAPE, {
    table: "media_sources",
    column: "provenance_json",
    builder: "buildMediaSources",
    selector: "media-source"
  });

  columnCoverage(registry, "mediaLibrary", "buildMediaPlayables", "media-playable", {
    "playables[].id": { table: "media_playables", column: "id" },
    "playables[].assetId": { table: "media_playables", column: "asset_id" },
    "playables[].sourceId": { table: "media_playables", column: "source_id" },
    "playables[].kind": { table: "media_playables", column: "kind" },
    "playables[].provider": { table: "media_playables", column: "provider" },
    "playables[].role": { table: "media_playables", column: "role" },
    "playables[].availability": {
      table: "media_playables",
      column: "availability",
      transformation: "normalized-availability"
    },
    "playables[].availabilityReason": {
      table: "media_playables",
      column: "availability_reason",
      transformation: "normalized-availability-reason"
    },
    "playables[].createdAt": {
      table: "media_playables",
      column: "created_at",
      transformation: "maria-date"
    },
    "playables[].updatedAt": {
      table: "media_playables",
      column: "updated_at",
      transformation: "maria-date"
    }
  });
  jsonCoverage(registry, "mediaLibrary", "playables[].location", {
    embedUrl: true,
    manifestUrl: true,
    storageKey: true,
    storageScope: true,
    url: true,
    videoId: true
  }, {
    table: "media_playables",
    column: "provenance_json",
    targetRoot: "_migration.originalLocation",
    builder: "buildMediaPlayables",
    selector: "media-playable"
  });
  jsonCoverage(registry, "mediaLibrary", "playables[].provenance", PROVENANCE_SHAPE, {
    table: "media_playables",
    column: "provenance_json",
    builder: "buildMediaPlayables",
    selector: "media-playable"
  });
  columnCoverage(registry, "mediaLibrary", "buildPlayableMetadata", "playable-metadata", {
    "playables[].technicalMetadata.status": {
      table: "media_playable_metadata",
      column: "analysis_status"
    },
    "playables[].technicalMetadata.mimeType": {
      table: "media_playable_metadata",
      column: "mime_type"
    },
    "playables[].technicalMetadata.durationMs": {
      table: "media_playable_metadata",
      column: "duration_ms"
    },
    "playables[].technicalMetadata.sizeBytes": {
      table: "media_playable_metadata",
      column: "size_bytes"
    },
    "playables[].technicalMetadata.sha256": {
      table: "media_playable_metadata",
      column: "sha256"
    },
    "playables[].technicalMetadata.width": {
      table: "media_playable_metadata",
      column: "width"
    },
    "playables[].technicalMetadata.height": {
      table: "media_playable_metadata",
      column: "height"
    },
    "playables[].technicalMetadata.frameRate": {
      table: "media_playable_metadata",
      column: "frame_rate",
      transformation: "frame-rate"
    },
    "playables[].technicalMetadata.videoCodec": {
      table: "media_playable_metadata",
      column: "video_codec"
    },
    "playables[].technicalMetadata.audioCodec": {
      table: "media_playable_metadata",
      column: "audio_codec"
    },
    "playables[].technicalMetadata.hasAudio": {
      table: "media_playable_metadata",
      column: "has_audio",
      transformation: "nullable-boolean-number"
    },
    "playables[].technicalMetadata.analyzer": {
      table: "media_playable_metadata",
      column: "analyzer"
    },
    "playables[].technicalMetadata.analyzerVersion": {
      table: "media_playable_metadata",
      column: "analyzer_version"
    },
    "playables[].technicalMetadata.analyzedAt": {
      table: "media_playable_metadata",
      column: "analyzed_at",
      transformation: "maria-date"
    },
    "playables[].technicalMetadata.error": {
      table: "media_playable_metadata",
      column: "error_text",
      transformation: "error-text"
    }
  });
  jsonCoverage(registry, "mediaLibrary", "playables[].technicalMetadata.fileName", true, {
    table: "media_playables",
    column: "provenance_json",
    targetRoot: "_migration.technicalMetadataExtras.fileName",
    builder: "buildMediaPlayables",
    selector: "media-playable"
  });

  columnCoverage(registry, "mediaLibrary", "buildMediaTreatments", "media-treatment", {
    "treatments[].id": { table: "media_treatments", column: "id" },
    "treatments[].sourceAssetId": { table: "media_treatments", column: "source_asset_id" },
    "treatments[].sourcePlayableId": { table: "media_treatments", column: "source_playable_id" },
    "treatments[].outputAssetId": { table: "media_treatments", column: "output_asset_id" },
    "treatments[].outputPlayableId": { table: "media_treatments", column: "output_playable_id" },
    "treatments[].publishedPlayableId": {
      table: "media_treatments",
      column: "published_playable_id"
    },
    "treatments[].type": { table: "media_treatments", column: "type" },
    "treatments[].label": { table: "media_treatments", column: "label" },
    "treatments[].status": { table: "media_treatments", column: "status" },
    "treatments[].progress": { table: "media_treatments", column: "progress" },
    "treatments[].retained": {
      table: "media_treatments",
      column: "retained",
      transformation: "not-false-number"
    },
    "treatments[].sourcePreparationId": {
      table: "media_treatments",
      column: "source_preparation_id"
    },
    "treatments[].runtimeJobId": { table: "media_treatments", column: "runtime_job_id" },
    "treatments[].engine": { table: "media_treatments", column: "engine" },
    "treatments[].engineVersion": { table: "media_treatments", column: "engine_version" },
    "treatments[].ffmpegVersion": { table: "media_treatments", column: "ffmpeg_version" },
    "treatments[].createdAt": {
      table: "media_treatments",
      column: "created_at",
      transformation: "maria-date"
    },
    "treatments[].startedAt": {
      table: "media_treatments",
      column: "started_at",
      transformation: "maria-date"
    },
    "treatments[].updatedAt": {
      table: "media_treatments",
      column: "updated_at",
      transformation: "maria-date"
    },
    "treatments[].finishedAt": {
      table: "media_treatments",
      column: "finished_at",
      transformation: "maria-date"
    }
  });
  jsonCoverage(registry, "mediaLibrary", "treatments[].parameters", TREATMENT_PARAMETERS_SHAPE, {
    table: "media_treatments",
    column: "parameters_json",
    builder: "buildMediaTreatments",
    selector: "media-treatment"
  });
  jsonCoverage(registry, "mediaLibrary", "treatments[].diagnostics", {}, {
    table: "media_treatments",
    column: "diagnostics_json",
    builder: "buildMediaTreatments",
    selector: "media-treatment"
  });
  jsonCoverage(registry, "mediaLibrary", "treatments[].error", true, {
    table: "media_treatments",
    column: "error_json",
    builder: "buildMediaTreatments",
    selector: "media-treatment"
  });
  jsonCoverage(registry, "mediaLibrary", "treatments[].derivationId", true, {
    table: "media_treatments",
    column: "parameters_json",
    targetRoot: "_migration.derivationId",
    builder: "buildMediaTreatments",
    selector: "media-treatment"
  });

  columnCoverage(registry, "activities", "buildActivities", "activity", {
    "activities[].id": { table: "activities", column: "id" },
    "activities[].version": { table: "activities", column: "version" },
    "activities[].status": { table: "activities", column: "status" },
    "activities[].title": { table: "activities", column: "title" },
    "activities[].description": { table: "activities", column: "description" },
    "activities[].instruction": { table: "activities", column: "instruction" },
    "activities[].pedagogicalQuestion": {
      table: "activities",
      column: "pedagogical_question"
    },
    "activities[].layerConfiguration.id": {
      table: "activities",
      column: "layer_configuration_id"
    },
    "activities[].layerConfiguration.allowLearnerToggle": {
      table: "activities",
      column: "allow_learner_toggle",
      transformation: "not-false-number"
    }
  });
  validationCoverage(registry, "activities", [
    "activities[].layerConfiguration.defaultVisibleLayerIds[]",
    "activities[].layerConfiguration.learnerVisibleLayerIds[]",
    "activities[].layerConfiguration.teacherVisibleLayerIds[]"
  ], {
    validationId: "layer-visibility-projection",
    invariant: "visibility ID sets equal the activity_layer_visibility rows; array order is non-semantic"
  });

  const identityMappings = {
    "activities[].pedagogicalIdentity.schemaVersion": ["schema_version"],
    "activities[].pedagogicalIdentity.designStatus": ["design_status"],
    "activities[].pedagogicalIdentity.resourceNature.state": ["resource_nature_state"],
    "activities[].pedagogicalIdentity.resourceNature.value": ["resource_nature_value"],
    "activities[].pedagogicalIdentity.resourceNature.note": ["resource_nature_note"],
    "activities[].pedagogicalIdentity.indicativeDuration.state": ["duration_state"],
    "activities[].pedagogicalIdentity.indicativeDuration.minutes": ["duration_minutes"],
    "activities[].pedagogicalIdentity.indicativeDuration.note": ["duration_note"],
    "activities[].pedagogicalIdentity.intention.state": ["intention_state"],
    "activities[].pedagogicalIdentity.intention.value": ["intention_value"],
    "activities[].pedagogicalIdentity.intention.note": ["intention_note"],
    "activities[].pedagogicalIdentity.audience.state": ["audience_state"],
    "activities[].pedagogicalIdentity.audience.value": ["audience_value"],
    "activities[].pedagogicalIdentity.audience.note": ["audience_note"],
    "activities[].pedagogicalIdentity.useContext.state": ["use_context_state"],
    "activities[].pedagogicalIdentity.useContext.value": ["use_context_value"],
    "activities[].pedagogicalIdentity.useContext.note": ["use_context_note"],
    "activities[].pedagogicalIdentity.lineage.state": ["lineage_state"],
    "activities[].pedagogicalIdentity.lineage.relation": ["lineage_relation"],
    "activities[].pedagogicalIdentity.lineage.parentActivityId": ["parent_activity_id"],
    "activities[].pedagogicalIdentity.lineage.rootActivityId": ["root_activity_id"],
    "activities[].pedagogicalIdentity.lineage.note": ["lineage_note"]
  };
  columnCoverage(
    registry,
    "activities",
    "buildPedagogicalIdentity",
    "pedagogical-identity",
    Object.fromEntries(Object.entries(identityMappings).map(([fieldPath, [column]]) => [
      fieldPath,
      { table: "activity_pedagogical_identities", column }
    ]))
  );
  for (const [sourceKey, fieldKey] of PEDAGOGICAL_TEXT_FIELDS) {
    columnCoverage(registry, "activities", "buildPedagogicalTextFields", "pedagogical-text", {
      [`activities[].pedagogicalIdentity.${sourceKey}.state`]: {
        table: "activity_pedagogical_text_fields",
        column: "knowledge_state",
        selectorArgument: fieldKey
      },
      [`activities[].pedagogicalIdentity.${sourceKey}.value`]: {
        table: "activity_pedagogical_text_fields",
        column: "value_text",
        selectorArgument: fieldKey
      },
      [`activities[].pedagogicalIdentity.${sourceKey}.note`]: {
        table: "activity_pedagogical_text_fields",
        column: "note",
        selectorArgument: fieldKey
      }
    });
  }
  columnCoverage(registry, "activities", "buildPedagogicalQualifications", "qualification", {
    "activities[].pedagogicalIdentity.qualifications[].id": {
      table: "activity_pedagogical_qualifications",
      column: "id"
    },
    "activities[].pedagogicalIdentity.qualifications[].level": {
      table: "activity_pedagogical_qualifications",
      column: "level"
    },
    "activities[].pedagogicalIdentity.qualifications[].validatedBy": {
      table: "activity_pedagogical_qualifications",
      column: "validated_by"
    },
    "activities[].pedagogicalIdentity.qualifications[].validatedAt": {
      table: "activity_pedagogical_qualifications",
      column: "validated_at",
      transformation: "date-only"
    },
    "activities[].pedagogicalIdentity.qualifications[].context": {
      table: "activity_pedagogical_qualifications",
      column: "context_text"
    },
    "activities[].pedagogicalIdentity.qualifications[].evidenceType": {
      table: "activity_pedagogical_qualifications",
      column: "evidence_type"
    },
    "activities[].pedagogicalIdentity.qualifications[].evidence": {
      table: "activity_pedagogical_qualifications",
      column: "evidence_text"
    },
    "activities[].pedagogicalIdentity.qualifications[].note": {
      table: "activity_pedagogical_qualifications",
      column: "note"
    }
  });
  validationCoverage(registry, "activities", [
    "activities[].pedagogicalIdentity.qualifications[]"
  ], {
    validationId: "empty-pedagogical-qualification-collection",
    invariant: "an empty qualification collection produces no qualification rows"
  });

  columnCoverage(registry, "activities", "buildActivityLanguages", "activity-language", {
    "activities[].languages[].id": {
      table: "activity_languages",
      column: "language_id"
    },
    "activities[].languages[].label": {
      table: "activity_languages",
      column: "local_label"
    }
  });
  validationCoverage(registry, "activities", ["activities[].languages[].code"], {
    validationId: "activity-language-code",
    invariant: "redundant uppercase code equals the shared language reference migrated to languages"
  });

  columnCoverage(registry, "activities", "buildTranscriptions", "transcription", {
    "activities[].transcription.id": {
      table: "activity_transcriptions",
      column: "id"
    },
    "activities[].transcription.languageId": {
      table: "activity_transcriptions",
      column: "language_id"
    }
  });
  validationCoverage(registry, "activities", ["activities[].transcription.segmentIds[]"], {
    validationId: "transcription-segment-order",
    invariant: "ordered transcription segmentIds exactly equal ordered activity_segments IDs"
  });

  columnCoverage(registry, "activities", "buildSpeakers", "speaker", {
    "activities[].speakers[].id": { table: "activity_speakers", column: "id" },
    "activities[].speakers[].label": { table: "activity_speakers", column: "label" }
  });
  columnCoverage(registry, "activities", "buildSegments", "segment", {
    "activities[].segments[].id": { table: "activity_segments", column: "id" },
    "activities[].segments[].startMs": { table: "activity_segments", column: "start_ms" },
    "activities[].segments[].endMs": { table: "activity_segments", column: "end_ms" },
    "activities[].segments[].text": { table: "activity_segments", column: "text" },
    "activities[].segments[].speakerIds[]": {
      table: "activity_segment_speakers",
      column: "speaker_id",
      selectorArgument: "segment-speaker"
    },
    "activities[].segments[].languageIds[]": {
      table: "activity_segment_languages",
      column: "language_id",
      selectorArgument: "segment-language"
    }
  });
  validationCoverage(registry, "activities", ["activities[].segments[].phenomenonIds[]"], {
    validationId: "segment-phenomenon-order",
    invariant: "ordered redundant phenomenonIds equal phenomena linked to the segment in source order"
  });

  columnCoverage(registry, "activities", "buildLanguageIntervals", "language-interval", {
    "activities[].languageIntervals[].id": {
      table: "activity_language_intervals",
      column: "id"
    },
    "activities[].languageIntervals[].segmentId": {
      table: "activity_language_intervals",
      column: "segment_id"
    },
    "activities[].languageIntervals[].languageId": {
      table: "activity_language_intervals",
      column: "language_id"
    },
    "activities[].languageIntervals[].startMs": {
      table: "activity_language_intervals",
      column: "start_ms"
    },
    "activities[].languageIntervals[].endMs": {
      table: "activity_language_intervals",
      column: "end_ms"
    }
  });
  columnCoverage(registry, "activities", "buildLayers", "layer", {
    "activities[].layers[].id": { table: "activity_layers", column: "id" },
    "activities[].layers[].label": { table: "activity_layers", column: "label" },
    "activities[].layers[].description": {
      table: "activity_layers",
      column: "description"
    },
    "activities[].layers[].color": { table: "activity_layers", column: "color" }
  });
  columnCoverage(registry, "activities", "buildPhenomena", "phenomenon", {
    "activities[].phenomena[].id": { table: "activity_phenomena", column: "id" },
    "activities[].phenomena[].segmentId": {
      table: "activity_phenomena",
      column: "segment_id"
    },
    "activities[].phenomena[].layerId": {
      table: "activity_phenomena",
      column: "layer_id"
    },
    "activities[].phenomena[].startMs": {
      table: "activity_phenomena",
      column: "start_ms"
    },
    "activities[].phenomena[].endMs": {
      table: "activity_phenomena",
      column: "end_ms"
    }
  });
  columnCoverage(registry, "activities", "buildAnnotations", "annotation", {
    "activities[].teacherAnnotations[].id": {
      table: "activity_annotations",
      column: "id"
    },
    "activities[].teacherAnnotations[].segmentId": {
      table: "activity_annotations",
      column: "segment_id"
    },
    "activities[].teacherAnnotations[].note": {
      table: "activity_annotations",
      column: "note"
    },
    "activities[].teacherAnnotations[].pedagogicalQuestion": {
      table: "activity_annotations",
      column: "pedagogical_question"
    }
  });
  columnCoverage(registry, "activities", "buildOverlays", "overlay", {
    "activities[].overlays[].id": { table: "activity_overlays", column: "id" },
    "activities[].overlays[].annotationId": {
      table: "activity_overlays",
      column: "annotation_id"
    },
    "activities[].overlays[].startMs": {
      table: "activity_overlays",
      column: "start_ms"
    },
    "activities[].overlays[].endMs": {
      table: "activity_overlays",
      column: "end_ms"
    },
    "activities[].overlays[].title": { table: "activity_overlays", column: "title" },
    "activities[].overlays[].text": { table: "activity_overlays", column: "text" },
    "activities[].overlays[].layerIds[]": {
      table: "activity_overlay_layers",
      column: "layer_id",
      selectorArgument: "overlay-layer"
    }
  });
  validationCoverage(registry, "activities", [
    "activities[].layers[]",
    "activities[].overlays[]",
    "activities[].phenomena[]",
    "activities[].segments[]",
    "activities[].speakers[]",
    "activities[].teacherAnnotations[]"
  ], {
    validationId: "empty-activity-collection",
    invariant: "an empty source collection produces no rows for its owner"
  });
  validationCoverage(registry, "activities", [
    "activities[].video.id",
    "activities[].video.title",
    "activities[].video.kind",
    "activities[].video.proxyUrl",
    "activities[].video.durationMs",
    "activities[].video.provider",
    "activities[].video.videoId",
    "activities[].video.embedUrl"
  ], {
    validationId: "activity-video-projection",
    invariant: "every projected value equals the canonical asset/playable projection and primary link"
  });

  validationCoverage(registry, "videoCatalog", [
    "videos[].authorized",
    "videos[].durationMs",
    "videos[].embedUrl",
    "videos[].id",
    "videos[].key",
    "videos[].mimeType",
    "videos[].provider",
    "videos[].proxyUrl",
    "videos[].source",
    "videos[].sourceType",
    "videos[].sourceUrl",
    "videos[].title",
    "videos[].videoId"
  ], {
    validationId: "video-catalog-semantic-projection",
    invariant: "compatibility fields, asset ownership, default playable and locator equal the canonical projection"
  });

  return registry;
}

const FIELD_COVERAGE_REGISTRY = buildCoverageRegistry();

function valueKind(value) {
  if (value === EMPTY_ARRAY_TOKEN) return "empty-array";
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length ? "array" : "empty-array";
  if (isPlainObject(value)) return Object.keys(value).length ? "object" : "empty-object";
  if (value === "") return "empty-string";
  if (value === 0) return "zero";
  return typeof value;
}

function collectObservedOccurrences(
  value,
  normalizedPath,
  concretePath,
  owners,
  output,
  presence
) {
  if (Array.isArray(value)) {
    const arrayPath = `${normalizedPath}[]`;
    presence.set(arrayPath, (presence.get(arrayPath) || 0) + 1);
    if (value.length === 0) {
      output.push({
        fieldPath: arrayPath,
        concretePath: `${concretePath}[]`,
        value: EMPTY_ARRAY_TOKEN,
        kind: "empty-array",
        owners: new Map(owners)
      });
      return;
    }
    value.forEach((item, index) => {
      const nextOwners = new Map(owners);
      if (isPlainObject(item)) {
        nextOwners.set(arrayPath, {
          value: item,
          index,
          concretePath: `${concretePath}[${index}]`
        });
      }
      collectObservedOccurrences(
        item,
        arrayPath,
        `${concretePath}[${index}]`,
        nextOwners,
        output,
        presence
      );
    });
    return;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    presence.set(normalizedPath, (presence.get(normalizedPath) || 0) + 1);
    if (entries.length === 0) {
      output.push({
        fieldPath: normalizedPath,
        concretePath,
        value: {},
        kind: "empty-object",
        owners: new Map(owners)
      });
      return;
    }
    for (const [key, item] of entries) {
      const nextNormalized = normalizedPath ? `${normalizedPath}.${key}` : key;
      const nextConcrete = concretePath ? `${concretePath}.${key}` : key;
      presence.set(nextNormalized, (presence.get(nextNormalized) || 0) + 1);
      collectObservedOccurrences(
        item,
        nextNormalized,
        nextConcrete,
        owners,
        output,
        presence
      );
    }
    return;
  }
  output.push({
    fieldPath: normalizedPath,
    concretePath,
    value,
    kind: valueKind(value),
    owners: new Map(owners)
  });
}

function sourceObservations(sources) {
  const observations = [];
  const presenceBySource = new Map();
  for (const source of sources) {
    const sourceOutput = [];
    const presence = new Map();
    collectObservedOccurrences(source.value, "", "", new Map(), sourceOutput, presence);
    for (const occurrence of sourceOutput) observations.push({ source: source.key, ...occurrence });
    presenceBySource.set(source.key, presence);
  }
  return { observations, presenceBySource };
}

function fieldCoverageRule(source, fieldPath) {
  return FIELD_COVERAGE_REGISTRY.get(coverageRegistryKey(source, fieldPath)) || Object.freeze({
    source,
    fieldPath,
    status: "unmapped-blocking",
    destination: null,
    rationale: "observed path has no exact entry in the explicit coverage registry",
    severity: "blocker"
  });
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

function addSourceRows(model, sources, diagnostics, prototypeDirectory) {
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
      const physicalRoot = storageScope === "workspace"
        ? path.join(prototypeDirectory, "data", "video-library-workspaces")
        : path.join(prototypeDirectory, "data", "video-library-media");
      const resolvedFile = storageKey ? path.resolve(physicalRoot, storageKey) : null;
      const rootPrefix = `${path.resolve(physicalRoot)}${path.sep}`;
      const safe = Boolean(resolvedFile && resolvedFile.startsWith(rootPrefix));
      const exists = Boolean(safe && fs.existsSync(resolvedFile) && fs.statSync(resolvedFile).isFile());
      const actualSize = exists ? fs.statSync(resolvedFile).size : null;
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

function comparableValue(value) {
  return value === EMPTY_ARRAY_TOKEN ? [] : value;
}

function exactValueEqual(left, right) {
  return stableStringify(comparableValue(left)) === stableStringify(comparableValue(right));
}

function tokenizeJsonPath(fieldPath) {
  const tokens = [];
  const pattern = /([^.[]+)|\[(\d*)\]/g;
  for (const match of fieldPath.matchAll(pattern)) {
    if (match[1]) tokens.push(match[1]);
    else if (match[2] === "") tokens.push(EMPTY_ARRAY_TOKEN);
    else tokens.push(Number(match[2]));
  }
  return tokens;
}

function valueAtTokens(value, tokens) {
  let current = value;
  for (const token of tokens) {
    if (token === EMPTY_ARRAY_TOKEN) return current;
    if (current === null || current === undefined) return undefined;
    current = current[token];
  }
  return current;
}

function ownerValue(occurrence, ownerPath) {
  return occurrence.owners.get(ownerPath)?.value;
}

function standardTargetRows(rule, occurrence, model) {
  const rows = tableData(model, rule.table);
  const activity = ownerValue(occurrence, "activities[]");
  const folder = ownerValue(occurrence, "folders[]");
  const tag = ownerValue(occurrence, "tags[]");
  const asset = ownerValue(occurrence, "assets[]");
  const source = ownerValue(occurrence, "sources[]");
  const playable = ownerValue(occurrence, "playables[]");
  const treatment = ownerValue(occurrence, "treatments[]");
  const qualification = ownerValue(
    occurrence,
    "activities[].pedagogicalIdentity.qualifications[]"
  );
  const language = ownerValue(occurrence, "languages[]");
  const activityLanguage = ownerValue(occurrence, "activities[].languages[]");
  const speaker = ownerValue(occurrence, "activities[].speakers[]");
  const segment = ownerValue(occurrence, "activities[].segments[]");
  const interval = ownerValue(occurrence, "activities[].languageIntervals[]");
  const layer = ownerValue(occurrence, "activities[].layers[]");
  const phenomenon = ownerValue(occurrence, "activities[].phenomena[]");
  const annotation = ownerValue(occurrence, "activities[].teacherAnnotations[]");
  const overlay = ownerValue(occurrence, "activities[].overlays[]");

  if (rule.selector === "language-reference") {
    return rows.filter(row => row.id === language?.id);
  }
  if (rule.selector === "activity-folder") {
    if (rule.selectorArgument && rule.fieldPath.startsWith("assignments.")) {
      return rows.filter(row => row.id === rule.selectorArgument);
    }
    return rows.filter(row => row.id === folder?.id);
  }
  if (rule.selector === "media-folder") {
    return rows.filter(row => row.id === folder?.id);
  }
  if (rule.selector === "media-tag") return rows.filter(row => row.id === tag?.id);
  if (rule.selector === "media-asset") {
    if (rule.selectorArgument === "asset-tag") {
      const ownerRows = rows.filter(row => row.asset_id === asset?.id);
      return occurrence.value === EMPTY_ARRAY_TOKEN
        ? ownerRows
        : ownerRows.filter(row => row.tag_id === occurrence.value);
    }
    return rows.filter(row => row.id === asset?.id);
  }
  if (rule.selector === "media-source") return rows.filter(row => row.id === source?.id);
  if (rule.selector === "media-playable") return rows.filter(row => row.id === playable?.id);
  if (rule.selector === "playable-metadata") {
    return rows.filter(row => row.playable_id === playable?.id);
  }
  if (rule.selector === "media-treatment") return rows.filter(row => row.id === treatment?.id);
  if (rule.selector === "activity") return rows.filter(row => row.id === activity?.id);
  if (rule.selector === "pedagogical-identity") {
    return rows.filter(row => row.activity_id === activity?.id);
  }
  if (rule.selector === "pedagogical-text") {
    return rows.filter(row => (
      row.activity_id === activity?.id
      && row.field_key === rule.selectorArgument
    ));
  }
  if (rule.selector === "qualification") {
    return rows.filter(row => (
      row.activity_id === activity?.id
      && row.id === qualification?.id
    ));
  }
  if (rule.selector === "activity-language") {
    return rows.filter(row => (
      row.activity_id === activity?.id
      && row.language_id === activityLanguage?.id
    ));
  }
  if (rule.selector === "transcription") {
    return rows.filter(row => row.activity_id === activity?.id);
  }
  if (rule.selector === "speaker") {
    return rows.filter(row => row.activity_id === activity?.id && row.id === speaker?.id);
  }
  if (rule.selector === "segment") {
    if (rule.selectorArgument === "segment-speaker") {
      const ownerRows = rows.filter(row => (
        row.activity_id === activity?.id
        && row.segment_id === segment?.id
      ));
      return occurrence.value === EMPTY_ARRAY_TOKEN
        ? ownerRows
        : ownerRows.filter(row => row.speaker_id === occurrence.value);
    }
    if (rule.selectorArgument === "segment-language") {
      const ownerRows = rows.filter(row => (
        row.activity_id === activity?.id
        && row.segment_id === segment?.id
      ));
      return occurrence.value === EMPTY_ARRAY_TOKEN
        ? ownerRows
        : ownerRows.filter(row => row.language_id === occurrence.value);
    }
    return rows.filter(row => row.activity_id === activity?.id && row.id === segment?.id);
  }
  if (rule.selector === "language-interval") {
    return rows.filter(row => row.activity_id === activity?.id && row.id === interval?.id);
  }
  if (rule.selector === "layer") {
    return rows.filter(row => row.activity_id === activity?.id && row.id === layer?.id);
  }
  if (rule.selector === "phenomenon") {
    return rows.filter(row => row.activity_id === activity?.id && row.id === phenomenon?.id);
  }
  if (rule.selector === "annotation") {
    return rows.filter(row => row.activity_id === activity?.id && row.id === annotation?.id);
  }
  if (rule.selector === "overlay") {
    if (rule.selectorArgument === "overlay-layer") {
      const ownerRows = rows.filter(row => (
        row.activity_id === activity?.id
        && row.overlay_id === overlay?.id
      ));
      return occurrence.value === EMPTY_ARRAY_TOKEN
        ? ownerRows
        : ownerRows.filter(row => row.layer_id === occurrence.value);
    }
    return rows.filter(row => row.activity_id === activity?.id && row.id === overlay?.id);
  }
  return [];
}

function localPlayableFileExists(playable, prototypeDirectory) {
  if (playable?.kind !== "local-file") return true;
  const scope = playable.location?.storageScope || "legacy-media";
  const storageKey = playable.location?.storageKey;
  if (!storageKey) return false;
  const root = scope === "workspace"
    ? path.join(prototypeDirectory, "data", "video-library-workspaces")
    : path.join(prototypeDirectory, "data", "video-library-media");
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) return false;
  return fs.existsSync(resolved) && fs.statSync(resolved).isFile();
}

function transformedCoverageValue(value, rule, occurrence, prototypeDirectory) {
  const playable = ownerValue(occurrence, "playables[]");
  if (rule.transformation === "identity") return comparableValue(value);
  if (rule.transformation === "maria-date") return mariaDate(value);
  if (rule.transformation === "date-only") return dateOnly(value);
  if (rule.transformation === "not-false-number") return Number(value !== false);
  if (rule.transformation === "nullable-boolean-number") {
    return value === null || value === undefined ? null : Number(Boolean(value));
  }
  if (rule.transformation === "frame-rate") {
    if (typeof value !== "string") return value;
    const match = value.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    return match && Number(match[2]) !== 0 ? Number(match[1]) / Number(match[2]) : null;
  }
  if (rule.transformation === "error-text") {
    if (value === null || value === undefined) return null;
    return typeof value === "string" ? value : stableStringify(value);
  }
  if (rule.transformation === "normalized-availability") {
    return (
      playable?.availability === "available"
      && playable.kind === "local-file"
      && !localPlayableFileExists(playable, prototypeDirectory)
    ) ? "missing-local" : playable?.availability;
  }
  if (rule.transformation === "normalized-availability-reason") {
    return (
      playable?.availability === "available"
      && playable.kind === "local-file"
      && !localPlayableFileExists(playable, prototypeDirectory)
    ) ? "missing-file" : (playable?.availabilityReason ?? null);
  }
  throw new Error(`unknown coverage transformation ${rule.transformation}`);
}

function assertColumnCoverage(rule, occurrence, model, prototypeDirectory) {
  if (!model.tables.has(rule.table)) {
    const error = new Error(`coverage table does not exist: ${rule.table}`);
    error.code = "COVERAGE_COLUMN_MISMATCH";
    throw error;
  }
  const rows = standardTargetRows(rule, occurrence, model);
  const relationCollection = [
    "asset-tag",
    "segment-speaker",
    "segment-language",
    "overlay-layer"
  ].includes(rule.selectorArgument);
  if (occurrence.value === EMPTY_ARRAY_TOKEN && relationCollection) {
    if (rows.length === 0) return;
    const error = new Error(`empty source collection produced ${rows.length} ${rule.table} rows`);
    error.code = "COVERAGE_COLUMN_MISMATCH";
    throw error;
  }
  if (rows.length !== 1) {
    const error = new Error(`expected one ${rule.table} row, found ${rows.length}`);
    error.code = "COVERAGE_COLUMN_MISMATCH";
    throw error;
  }
  if (!Object.hasOwn(rows[0], rule.column)) {
    const error = new Error(`${rule.table}.${rule.column} is not produced by ${rule.builder}`);
    error.code = "COVERAGE_COLUMN_MISMATCH";
    throw error;
  }
  const expected = transformedCoverageValue(
    occurrence.value,
    rule,
    occurrence,
    prototypeDirectory
  );
  const actual = rows[0][rule.column];
  if (!exactValueEqual(expected, actual)) {
    const error = new Error(
      `${rule.table}.${rule.column} differs: expected ${stableStringify(expected)}, `
      + `received ${stableStringify(actual)}`
    );
    error.code = "COVERAGE_COLUMN_MISMATCH";
    throw error;
  }
}

function assertJsonCoverage(rule, occurrence, model) {
  if (!model.tables.has(rule.table)) {
    const error = new Error(`coverage table does not exist: ${rule.table}`);
    error.code = "COVERAGE_JSON_MISMATCH";
    throw error;
  }
  const rows = standardTargetRows(rule, occurrence, model);
  if (rows.length !== 1 || !Object.hasOwn(rows[0], rule.column)) {
    const error = new Error(`${rule.table}.${rule.column} is not produced by ${rule.builder}`);
    error.code = "COVERAGE_JSON_MISMATCH";
    throw error;
  }
  const sourceRootLength = tokenizeJsonPath(rule.sourceRoot).length;
  const concreteTokens = tokenizeJsonPath(occurrence.concretePath);
  const relativeTokens = concreteTokens.slice(sourceRootLength);
  const targetTokens = [
    ...tokenizeJsonPath(rule.targetRoot),
    ...relativeTokens
  ];
  const actual = valueAtTokens(rows[0][rule.column], targetTokens);
  const expected = comparableValue(occurrence.value);
  if (!exactValueEqual(expected, actual)) {
    const error = new Error(
      `${rule.destination} does not preserve ${occurrence.concretePath}: `
      + `expected ${stableStringify(expected)}, received ${stableStringify(actual)}`
    );
    error.code = "COVERAGE_JSON_MISMATCH";
    throw error;
  }
}

function canonicalMediaContext(sources) {
  const byKey = Object.fromEntries(sources.map(source => [source.key, source.value]));
  const media = byKey.mediaLibrary;
  const playableCandidates = new Map();
  for (const playable of media.playables || []) {
    if (!playableCandidates.has(playable.id)) playableCandidates.set(playable.id, []);
    playableCandidates.get(playable.id).push(playable);
  }
  return {
    byKey,
    media,
    assets: new Map((media.assets || []).map(asset => [asset.id, asset])),
    sources: new Map((media.sources || []).map(source => [source.id, source])),
    playableCandidates,
    playables: new Map(
      [...playableCandidates].filter(([, candidates]) => candidates.length === 1)
        .map(([id, [playable]]) => [id, playable])
    )
  };
}

function expectedActivityVideoValue(field, activity, mediaContext, model) {
  const projected = activity.video || {};
  const requestedPlayableId = activity.videoRef?.playableId || projected.id;
  const candidates = mediaContext.playableCandidates.get(requestedPlayableId) || [];
  if (candidates.length !== 1) {
    return {
      valid: false,
      expected: null,
      reason: candidates.length
        ? "canonical playable identity is ambiguous"
        : "canonical playable identity is absent"
    };
  }
  const playable = mediaContext.playables.get(requestedPlayableId);
  const asset = playable ? mediaContext.assets.get(playable.assetId) : null;
  const link = tableData(model, "activity_media_links").find(row => (
    row.activity_id === activity.id
    && row.role === "primary"
  ));
  if (!playable || !asset || !link || link.media_playable_id !== playable.id) {
    return { valid: false, expected: null, reason: "canonical primary link is absent" };
  }
  const expected = {
    id: playable.id,
    title: asset.title,
    kind: playable.kind,
    proxyUrl: playable.kind === "hls"
      ? (playable.location?.manifestUrl || playable.location?.url || null)
      : null,
    durationMs: playable.technicalMetadata?.durationMs ?? null,
    provider: playable.provider ?? null,
    videoId: playable.location?.videoId ?? null,
    embedUrl: playable.location?.embedUrl ?? null
  }[field];
  return { valid: true, expected };
}

function expectedCatalogValue(field, video, mediaContext) {
  const playable = mediaContext.playables.get(video.id);
  const asset = playable ? mediaContext.assets.get(playable.assetId) : null;
  const source = playable ? mediaContext.sources.get(playable.sourceId) : null;
  if (!playable || !asset || !source || asset.defaultPlayableId !== playable.id) {
    return {
      valid: false,
      expected: null,
      reason: "canonical playable, asset ownership or default-playable relation is absent"
    };
  }
  const manifest = playable.location?.manifestUrl || playable.location?.url || null;
  const values = {
    authorized: true,
    durationMs: playable.technicalMetadata?.durationMs ?? null,
    embedUrl: playable.location?.embedUrl ?? null,
    id: playable.id,
    key: typeof manifest === "string" && manifest.startsWith("/api/hls/")
      ? manifest.slice("/api/hls/".length)
      : null,
    mimeType: playable.technicalMetadata?.mimeType ?? source.mimeType ?? null,
    provider: playable.provider ?? null,
    proxyUrl: playable.kind === "hls" ? manifest : null,
    source: playable.provider ? playable.provider.toUpperCase() : null,
    sourceType: playable.kind === "hls" && manifest?.startsWith("/api/hls/")
      ? "hls-proxy"
      : playable.kind,
    sourceUrl: source.origin?.originUrl || source.origin?.sourceUrl || null,
    title: asset.title,
    videoId: playable.location?.videoId ?? null
  };
  return { valid: true, expected: values[field] };
}

function validateCoverageOccurrence(rule, occurrence, sources, model) {
  const context = canonicalMediaContext(sources);
  const activity = ownerValue(occurrence, "activities[]");
  if (rule.validationId.endsWith("-schema")) {
    const expected = rule.validationId === "media-library-schema" ? "1.0" : "0.1";
    return {
      ok: occurrence.value === expected,
      expected,
      actual: occurrence.value
    };
  }
  if (rule.validationId.endsWith("-timestamp")) {
    const normalized = mariaDate(occurrence.value);
    let ok = Boolean(normalized);
    if (rule.validationId === "activities-document-timestamp") {
      const fallbackRows = tableData(model, "activities").filter(row => {
        const sourceActivity = context.byKey.activities.activities.find(
          candidate => candidate.id === row.id
        );
        return sourceActivity && (!sourceActivity.createdAt || !sourceActivity.updatedAt);
      });
      ok = ok && fallbackRows.every(row => (
        row.created_at === normalized && row.updated_at === normalized
      ));
    }
    return { ok, expected: normalized, actual: occurrence.value };
  }
  if (rule.validationId === "activity-language-code") {
    const language = ownerValue(occurrence, "activities[].languages[]");
    const reference = tableData(model, "languages").find(row => row.id === language?.id);
    const membership = tableData(model, "activity_languages").find(row => (
      row.activity_id === activity?.id && row.language_id === language?.id
    ));
    const expected = reference?.code;
    return {
      ok: Boolean(reference && membership) && occurrence.value === expected,
      expected,
      actual: occurrence.value
    };
  }
  if (rule.validationId === "transcription-segment-order") {
    const expected = tableData(model, "activity_segments")
      .filter(row => row.activity_id === activity?.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(row => row.id);
    const actual = activity?.transcription?.segmentIds || [];
    return { ok: exactValueEqual(actual, expected), expected, actual };
  }
  if (rule.validationId === "segment-phenomenon-order") {
    const segment = ownerValue(occurrence, "activities[].segments[]");
    const expectedFromSource = (activity?.phenomena || [])
      .filter(phenomenon => phenomenon.segmentId === segment?.id)
      .map(phenomenon => phenomenon.id);
    const expectedFromRows = tableData(model, "activity_phenomena")
      .filter(row => row.activity_id === activity?.id && row.segment_id === segment?.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(row => row.id);
    const actual = segment?.phenomenonIds || [];
    return {
      ok: exactValueEqual(actual, expectedFromSource)
        && exactValueEqual(expectedFromSource, expectedFromRows),
      expected: expectedFromRows,
      actual
    };
  }
  if (rule.validationId === "layer-visibility-projection") {
    const config = activity?.layerConfiguration || {};
    const rows = tableData(model, "activity_layer_visibility").filter(
      row => row.activity_id === activity?.id
    );
    const layerIds = (activity?.layers || []).map(layer => layer.id).sort();
    const actualSets = {
      defaultVisibleLayerIds: [...new Set(config.defaultVisibleLayerIds || [])].sort(),
      learnerVisibleLayerIds: [...new Set(config.learnerVisibleLayerIds || [])].sort(),
      teacherVisibleLayerIds: [...new Set(config.teacherVisibleLayerIds || [])].sort()
    };
    const rowSets = {
      defaultVisibleLayerIds: rows.filter(row => row.is_default).map(row => row.layer_id).sort(),
      learnerVisibleLayerIds: rows
        .filter(row => row.audience === "learner" && row.is_visible)
        .map(row => row.layer_id)
        .sort(),
      teacherVisibleLayerIds: rows
        .filter(row => row.audience === "teacher" && row.is_visible)
        .map(row => row.layer_id)
        .sort()
    };
    rowSets.defaultVisibleLayerIds = [...new Set(rowSets.defaultVisibleLayerIds)].sort();
    const key = rule.fieldPath.match(/layerConfiguration\.([^.[]+)/)?.[1];
    const expected = rowSets[key];
    const actual = actualSets[key];
    return {
      ok: exactValueEqual(actual, expected)
        && rows.length === layerIds.length * 2
        && actualSets.defaultVisibleLayerIds.every(id => (
          actualSets.learnerVisibleLayerIds.includes(id)
        )),
      expected,
      actual
    };
  }
  if (rule.validationId === "empty-activity-collection") {
    const collection = rule.fieldPath.match(/activities\[\]\.([^.[]+)\[\]$/)?.[1];
    const tableByCollection = {
      layers: "activity_layers",
      overlays: "activity_overlays",
      phenomena: "activity_phenomena",
      segments: "activity_segments",
      speakers: "activity_speakers",
      teacherAnnotations: "activity_annotations"
    };
    const rows = tableData(model, tableByCollection[collection]).filter(
      row => row.activity_id === activity?.id
    );
    return {
      ok: occurrence.value === EMPTY_ARRAY_TOKEN && rows.length === 0,
      expected: [],
      actual: rows
    };
  }
  if (rule.validationId === "empty-pedagogical-qualification-collection") {
    const rows = tableData(model, "activity_pedagogical_qualifications").filter(
      row => row.activity_id === activity?.id
    );
    return {
      ok: occurrence.value === EMPTY_ARRAY_TOKEN && rows.length === 0,
      expected: [],
      actual: rows
    };
  }
  if (rule.validationId === "activity-video-projection") {
    const field = rule.fieldPath.split(".").at(-1);
    const projection = expectedActivityVideoValue(field, activity, context, model);
    const differs = projection.valid
      && !exactValueEqual(occurrence.value, projection.expected);
    const historicalSnapshotDivergence = differs
      && ["kind", "proxyUrl"].includes(field);
    return {
      ok: projection.valid && (!differs || historicalSnapshotDivergence),
      expected: projection.expected,
      actual: occurrence.value,
      reason: projection.reason || null,
      warning: historicalSnapshotDivergence
        ? {
            code: "ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE",
            field,
            activityId: activity?.id ?? null,
            playableId: activity?.videoRef?.playableId || activity?.video?.id || null,
            oldValue: occurrence.value,
            newValue: projection.expected,
            canonicalProjectionUsed: true
          }
        : null
    };
  }
  if (rule.validationId === "video-catalog-semantic-projection") {
    const video = ownerValue(occurrence, "videos[]");
    const field = rule.fieldPath.split(".").at(-1);
    const projection = expectedCatalogValue(field, video, context);
    const actual = field === "provider" && typeof occurrence.value === "string"
      ? occurrence.value.toLowerCase()
      : occurrence.value;
    return {
      ok: projection.valid && exactValueEqual(actual, projection.expected),
      expected: projection.expected,
      actual,
      reason: projection.reason || null
    };
  }
  return {
    ok: false,
    expected: null,
    actual: comparableValue(occurrence.value),
    reason: `validation executor missing for ${rule.validationId}`
  };
}

function deepestOwnerPath(occurrence) {
  return [...occurrence.owners.keys()]
    .sort((a, b) => b.length - a.length)[0] || null;
}

function coverageInventory(sources, model, diagnostics, prototypeDirectory) {
  const { observations } = sourceObservations(sources);
  const ownerUniverse = new Map();
  for (const occurrence of observations) {
    for (const [ownerPath, owner] of occurrence.owners) {
      if (!ownerUniverse.has(ownerPath)) ownerUniverse.set(ownerPath, new Set());
      ownerUniverse.get(ownerPath).add(owner.concretePath);
    }
  }
  const groups = new Map();
  for (const occurrence of observations) {
    const rule = fieldCoverageRule(occurrence.source, occurrence.fieldPath);
    const groupKey = coverageRegistryKey(occurrence.source, occurrence.fieldPath);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        source: occurrence.source,
        fieldPath: occurrence.fieldPath,
        status: rule.status,
        destination: rule.destination,
        builder: rule.builder || null,
        validationId: rule.validationId || null,
        rationale: rule.rationale || rule.invariant || null,
        occurrences: 0,
        nonNullValues: 0,
        nullValues: 0,
        emptyArrays: 0,
        emptyObjects: 0,
        emptyStrings: 0,
        zeroValues: 0,
        reconciledOccurrences: 0,
        mismatches: 0,
        mismatchSamples: [],
        presentOwners: new Set(),
        ownerPath: deepestOwnerPath(occurrence)
      });
    }
    const group = groups.get(groupKey);
    group.occurrences += 1;
    if (occurrence.value === null) group.nullValues += 1;
    else group.nonNullValues += 1;
    if (occurrence.kind === "empty-array") group.emptyArrays += 1;
    if (occurrence.kind === "empty-object") group.emptyObjects += 1;
    if (occurrence.kind === "empty-string") group.emptyStrings += 1;
    if (occurrence.kind === "zero") group.zeroValues += 1;
    const ownerPath = deepestOwnerPath(occurrence);
    if (ownerPath) group.presentOwners.add(occurrence.owners.get(ownerPath).concretePath);

    try {
      if (!COVERAGE_STATUSES.includes(rule.status)) {
        const error = new Error(`unknown coverage status ${rule.status}`);
        error.code = "UNMAPPED_SOURCE_FIELD";
        throw error;
      }
      if (rule.status === "unmapped-blocking") {
        const error = new Error(rule.rationale);
        error.code = "UNMAPPED_SOURCE_FIELD";
        throw error;
      }
      if (rule.status === "column-mapped") {
        assertColumnCoverage(rule, occurrence, model, prototypeDirectory);
      } else if (rule.status === "json-preserved") {
        assertJsonCoverage(rule, occurrence, model);
      } else if (rule.status === "validation-only") {
        const proof = validateCoverageOccurrence(rule, occurrence, sources, model);
        if (!proof.ok) {
          const error = new Error(
            `${rule.validationId}: expected ${stableStringify(proof.expected)}, `
            + `received ${stableStringify(proof.actual)}`
            + (proof.reason ? ` (${proof.reason})` : "")
          );
          error.code = "COVERAGE_VALIDATION_MISMATCH";
          throw error;
        }
        if (proof.warning) {
          diagnostics.add(
            "warning",
            proof.warning.code,
            "historical activity.video snapshot differs from the canonical playable; canonical values are retained",
            proof.warning
          );
        }
      }
      group.reconciledOccurrences += 1;
    } catch (error) {
      group.mismatches += 1;
      if (group.mismatchSamples.length < 3) {
        group.mismatchSamples.push({
          concretePath: occurrence.concretePath,
          code: error.code || "COVERAGE_PROOF_ERROR",
          message: error.message
        });
      }
    }
  }

  const inventory = [...groups.values()]
    .sort((a, b) => a.source.localeCompare(b.source) || a.fieldPath.localeCompare(b.fieldPath))
    .map(group => {
      const eligibleOwners = group.ownerPath
        ? (ownerUniverse.get(group.ownerPath)?.size || 0)
        : 1;
      return {
        ...group,
        presentOwners: group.presentOwners.size,
        eligibleOwners,
        missingOwners: Math.max(0, eligibleOwners - group.presentOwners.size),
        severity: group.status === "explicitly-excluded"
          ? "warning"
          : group.mismatches > 0
            ? "blocker"
            : "none"
      };
    });

  for (const field of inventory.filter(item => item.mismatches > 0)) {
    const codeByStatus = {
      "column-mapped": "COVERAGE_COLUMN_MISMATCH",
      "json-preserved": "COVERAGE_JSON_MISMATCH",
      "validation-only": "COVERAGE_VALIDATION_MISMATCH",
      "explicitly-excluded": "COVERAGE_EXCLUSION_MISMATCH",
      "unmapped-blocking": "UNMAPPED_SOURCE_FIELD"
    };
    diagnostics.add(
      "blocker",
      codeByStatus[field.status],
      "field-by-field coverage proof failed",
      {
        source: field.source,
        fieldPath: field.fieldPath,
        status: field.status,
        destination: field.destination,
        occurrences: field.occurrences,
        reconciledOccurrences: field.reconciledOccurrences,
        mismatches: field.mismatches,
        samples: field.mismatchSamples
      }
    );
  }

  const statusSummary = Object.fromEntries(COVERAGE_STATUSES.map(status => [
    status,
    {
      paths: inventory.filter(item => item.status === status).length,
      occurrences: inventory
        .filter(item => item.status === status)
        .reduce((sum, item) => sum + item.occurrences, 0),
      reconciledOccurrences: inventory
        .filter(item => item.status === status)
        .reduce((sum, item) => sum + item.reconciledOccurrences, 0),
      mismatches: inventory
        .filter(item => item.status === status)
        .reduce((sum, item) => sum + item.mismatches, 0)
    }
  ]));

  return {
    inventory,
    summary: {
      normalizedPaths: inventory.length,
      totalOccurrences: inventory.reduce((sum, item) => sum + item.occurrences, 0),
      reconciledOccurrences: inventory.reduce(
        (sum, item) => sum + item.reconciledOccurrences,
        0
      ),
      mismatches: inventory.reduce((sum, item) => sum + item.mismatches, 0),
      executedValidationIds: [...new Set(
        inventory
          .filter(item => item.status === "validation-only")
          .map(item => item.validationId)
      )].sort(),
      status: statusSummary
    }
  };
}

function conservationSummary(sources, model, physicalObservations, fieldInventory) {
  const byKey = Object.fromEntries(sources.map(source => [source.key, source.value]));
  const activities = byKey.activities.activities || [];
  const media = byKey.mediaLibrary;
  const sourceCounts = {
    assets: media.assets?.length || 0,
    sources: media.sources?.length || 0,
    playables: media.playables?.length || 0,
    mediaFamilies: new Set((media.assets || []).map(asset => asset.familyRootAssetId || asset.id)).size,
    mediaLineageRelations: (media.assets || []).filter(asset => (
      asset.parentAssetId
      || asset.provenance?.historical?.sourceAssetId
      || asset.provenance?.sourceAssetId
    )).length,
    treatments: media.treatments?.length || 0,
    activities: activities.length,
    primaryMedia: activities.filter(activity => activity.video?.id || activity.videoRef?.playableId).length,
    supplementaryMedia: activities.reduce((sum, activity) => (
      sum + (activity.supplementaryMedia?.length || 0)
    ), 0),
    segments: activities.reduce((sum, activity) => sum + (activity.segments?.length || 0), 0),
    activityLanguages: activities.reduce((sum, activity) => sum + (activity.languages?.length || 0), 0),
    speakers: activities.reduce((sum, activity) => sum + (activity.speakers?.length || 0), 0),
    intervals: activities.reduce((sum, activity) => sum + (activity.languageIntervals?.length || 0), 0),
    phenomena: activities.reduce((sum, activity) => sum + (activity.phenomena?.length || 0), 0),
    annotations: activities.reduce((sum, activity) => sum + (activity.teacherAnnotations?.length || 0), 0),
    layers: activities.reduce((sum, activity) => sum + (activity.layers?.length || 0), 0),
    overlays: activities.reduce((sum, activity) => sum + (activity.overlays?.length || 0), 0),
    missingLocalDeclared: (media.playables || []).filter(playable => playable.availability === "missing-local").length
  };
  const preparedCounts = {
    assets: tableData(model, "media_assets").length,
    sources: tableData(model, "media_sources").length,
    playables: tableData(model, "media_playables").length,
    mediaFamilies: tableData(model, "media_assets").filter(row => row.parent_asset_id === null).length,
    mediaLineageRelations: tableData(model, "media_assets").filter(row => row.parent_asset_id !== null).length,
    treatments: tableData(model, "media_treatments").length,
    activities: tableData(model, "activities").length,
    primaryMedia: tableData(model, "activity_media_links").filter(row => row.role === "primary").length,
    supplementaryMedia: tableData(model, "activity_media_links").filter(row => row.role === "supplementary").length,
    segments: tableData(model, "activity_segments").length,
    activityLanguages: tableData(model, "activity_languages").length,
    speakers: tableData(model, "activity_speakers").length,
    intervals: tableData(model, "activity_language_intervals").length,
    phenomena: tableData(model, "activity_phenomena").length,
    annotations: tableData(model, "activity_annotations").length,
    layers: tableData(model, "activity_layers").length,
    overlays: tableData(model, "activity_overlays").length,
    missingLocalNormalized: tableData(model, "media_playables").filter(row => row.availability === "missing-local").length
  };
  const joinCounts = Object.fromEntries([
    "media_asset_tags",
    "activity_segment_speakers",
    "activity_segment_languages",
    "activity_layer_visibility",
    "activity_overlay_layers"
  ].map(tableName => [tableName, tableData(model, tableName).length]));
  return {
    source: sourceCounts,
    prepared: preparedCounts,
    joins: joinCounts,
    physical: {
      localPlayables: physicalObservations.length,
      present: physicalObservations.filter(item => item.exists).length,
      absent: physicalObservations.filter(item => !item.exists).length,
      availabilityCorrections: physicalObservations.filter(item => (
        item.declaredAvailability !== item.normalizedAvailability
      )).length
    },
    fields: {
      observedPaths: fieldInventory.length,
      observedOccurrences: fieldInventory.reduce((sum, item) => sum + item.occurrences, 0),
      reconciledOccurrences: fieldInventory.reduce(
        (sum, item) => sum + item.reconciledOccurrences,
        0
      ),
      mismatches: fieldInventory.reduce((sum, item) => sum + item.mismatches, 0),
      explicitlyExcludedPaths: fieldInventory.filter(
        item => item.status === "explicitly-excluded"
      ).length,
      explicitlyExcludedValues: fieldInventory
        .filter(item => item.status === "explicitly-excluded")
        .reduce((sum, item) => sum + item.occurrences, 0),
      whollyUnmappedPaths: fieldInventory.filter(
        item => item.status === "unmapped-blocking"
      ).length,
      status: Object.fromEntries(COVERAGE_STATUSES.map(status => [
        status,
        {
          paths: fieldInventory.filter(item => item.status === status).length,
          occurrences: fieldInventory
            .filter(item => item.status === status)
            .reduce((sum, item) => sum + item.occurrences, 0),
          reconciledOccurrences: fieldInventory
            .filter(item => item.status === status)
            .reduce((sum, item) => sum + item.reconciledOccurrences, 0),
          mismatches: fieldInventory
            .filter(item => item.status === status)
            .reduce((sum, item) => sum + item.mismatches, 0)
        }
      ]))
    }
  };
}

function canonicalIntermediate(model, sources, schemaHash, fieldInventory) {
  const tables = [...model.tables.values()]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(table => {
      const rows = [...table.rows].sort((left, right) => (
        rowKey(left.data, table.pk).localeCompare(rowKey(right.data, table.pk))
      ));
      return {
        name: table.name,
        order: table.order,
        primaryKey: table.pk,
        foreignKeys: table.fks || [],
        rows
      };
    });
  return {
    contract: {
      schemaRevision: "003+002-alignment",
      schemaSha256: schemaHash,
      tableCount: TABLE_DEFINITIONS.length
    },
    sources: sources.map(source => ({
      key: source.key,
      relativePath: source.relativePath.replaceAll("\\", "/"),
      role: source.role,
      size: source.size,
      sha256: source.sha256
    })),
    insertionPlan: INSERTION_PLAN,
    coverage: fieldInventory.map(field => ({
      source: field.source,
      fieldPath: field.fieldPath,
      status: field.status,
      destination: field.destination,
      occurrences: field.occurrences,
      nonNullValues: field.nonNullValues,
      nullValues: field.nullValues,
      emptyArrays: field.emptyArrays,
      emptyObjects: field.emptyObjects,
      emptyStrings: field.emptyStrings,
      zeroValues: field.zeroValues,
      presentOwners: field.presentOwners,
      eligibleOwners: field.eligibleOwners,
      missingOwners: field.missingOwners,
      reconciledOccurrences: field.reconciledOccurrences,
      mismatches: field.mismatches
    })),
    tables
  };
}

function verifySchemaContract(prototypeDirectory, diagnostics) {
  const schemaPath = path.join(prototypeDirectory, SCHEMA_RELATIVE_PATH);
  const migrationPath = path.join(
    prototypeDirectory,
    ALIGNMENT_MIGRATION_RELATIVE_PATH
  );
  let text;
  let migrationText;
  try {
    text = fs.readFileSync(schemaPath, "utf8");
  } catch (error) {
    diagnostics.add("blocker", "SCHEMA_SOURCE_MISSING", "schema 003 cannot be read", {
      relativePath: SCHEMA_RELATIVE_PATH,
      reason: error.code || error.message
    });
    return {
      sha256: null,
      baseSha256: null,
      migrationSha256: null,
      tables: [],
      procedures: 0
    };
  }
  try {
    migrationText = fs.readFileSync(migrationPath, "utf8");
  } catch (error) {
    diagnostics.add("blocker", "ALIGNMENT_MIGRATION_MISSING", "schema alignment migration cannot be read", {
      relativePath: ALIGNMENT_MIGRATION_RELATIVE_PATH,
      reason: error.code || error.message
    });
    return {
      sha256: null,
      baseSha256: sha256(text),
      migrationSha256: null,
      tables: [],
      procedures: 0
    };
  }
  const tables = [...text.matchAll(/^CREATE TABLE\s+([A-Za-z0-9_]+)/gm)].map(match => match[1]);
  const procedures = [...text.matchAll(/^CREATE PROCEDURE\s+([A-Za-z0-9_]+)/gm)].length;
  const expectedTables = new Set(TABLE_DEFINITIONS.map(table => table.name));
  const missingTables = [...expectedTables].filter(table => !tables.includes(table));
  if (tables.length !== 31 || procedures !== 43 || missingTables.length) {
    diagnostics.add("blocker", "SCHEMA_CONTRACT_MISMATCH", "local schema 003 does not match the expected 31-table/43-procedure contract", {
      tableCount: tables.length,
      procedureCount: procedures,
      missingTables
    });
  }
  const requiredAlignmentFragments = [
    "ADD COLUMN description TEXT NULL",
    "ADD COLUMN color VARCHAR(32) NULL",
    "ADD COLUMN layer_configuration_id VARCHAR(191) NULL",
    "MODIFY segment_id VARCHAR(191) NULL",
    "DROP CONSTRAINT chk_media_treatment_completed_output",
    "CREATE PROCEDURE sp_media_treatment_complete"
  ];
  const missingAlignmentFragments = requiredAlignmentFragments.filter(
    fragment => !migrationText.includes(fragment)
  );
  if (missingAlignmentFragments.length) {
    diagnostics.add(
      "blocker",
      "ALIGNMENT_MIGRATION_CONTRACT_MISMATCH",
      "alignment migration does not expose every required schema decision",
      { missingAlignmentFragments }
    );
  }
  const baseSha256 = sha256(text);
  const migrationSha256 = sha256(migrationText);
  return {
    sha256: sha256(`${baseSha256}\u0000${migrationSha256}`),
    baseSha256,
    migrationSha256,
    tables,
    procedures
  };
}

function deterministicResult(prototypeDirectory) {
  const collector = diagnosticCollector();
  const schema = verifySchemaContract(prototypeDirectory, collector);
  let sources;
  try {
    sources = SOURCE_DEFINITIONS.map(definition => readSourceFile(prototypeDirectory, definition));
  } catch (error) {
    collector.add("blocker", error.code || "SOURCE_READ_ERROR", error.message);
    return {
      collector,
      result: {
        status: "blocked",
        deterministicHash: null,
        sourceBundleHash: null,
        tablesWithRows: 0,
        totalPreparedRows: 0,
        blockers: collector.diagnostics.filter(item => item.severity === "blocker").length,
        warnings: 0,
        unmappedFieldPaths: null,
        coverage: null,
        sourceFiles: [],
        tableCounts: {},
        conservation: null,
        schema: {
          tables: schema.tables.length,
          procedures: schema.procedures,
          sha256: schema.sha256,
          baseSha256: schema.baseSha256,
          migrationSha256: schema.migrationSha256
        },
        diagnostics: collector.diagnostics
      }
    };
  }

  const model = modelFactory();
  const observations = addSourceRows(model, sources, collector, prototypeDirectory);
  validateIntermediate(model, collector);
  const coverage = coverageInventory(sources, model, collector, prototypeDirectory);
  const fieldInventory = coverage.inventory;

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

  const intermediate = canonicalIntermediate(model, sources, schema.sha256, fieldInventory);
  const intermediateText = stableStringify(intermediate);
  const deterministicHash = sha256(intermediateText);
  const sourceBundleHash = sha256(stableStringify(sources.map(source => ({
    key: source.key,
    sha256: source.sha256
  }))));
  const tableCounts = Object.fromEntries(
    [...model.tables.values()]
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map(table => [table.name, table.rows.length])
  );
  const totalPreparedRows = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
  const blockers = collector.diagnostics.filter(item => item.severity === "blocker").length;
  const warnings = collector.diagnostics.filter(item => item.severity === "warning").length;
  const conservation = conservationSummary(
    sources,
    model,
    observations.physicalObservations,
    fieldInventory
  );

  return {
    collector,
    model,
    intermediate,
    sources,
    result: {
      status: blockers ? "blocked" : "valid",
      deterministicHash,
      sourceBundleHash,
      tablesWithRows: Object.values(tableCounts).filter(count => count > 0).length,
      totalPreparedRows,
      blockers,
      warnings,
      unmappedFieldPaths: conservation.fields.whollyUnmappedPaths,
      coverage: coverage.summary,
      sourceFiles: sources.map(source => ({
        key: source.key,
        relativePath: source.relativePath.replaceAll("\\", "/"),
        role: source.role,
        size: source.size,
        sha256: source.sha256
      })),
      tableCounts,
      conservation,
      schema: {
        tables: schema.tables.length,
        procedures: schema.procedures,
        sha256: schema.sha256,
        baseSha256: schema.baseSha256,
        migrationSha256: schema.migrationSha256
      },
      fieldInventory,
      diagnostics: collector.diagnostics,
      insertionPlan: INSERTION_PLAN
    }
  };
}

function relationalModelFromCanonicalSnapshot(snapshot, {
  prototypeDirectory = DEFAULT_PROTOTYPE_DIRECTORY
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
  const observations = addSourceRows(model, sources, collector, prototypeDirectory);
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
  if (blockers.length) {
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

function expectErrorCode(label, expectedCode, callback) {
  try {
    callback();
  } catch (error) {
    if (error.code === expectedCode) return { label, status: "PASS", code: expectedCode };
    throw new Error(`${label}: expected ${expectedCode}, received ${error.code || error.message}`);
  }
  throw new Error(`${label}: expected ${expectedCode}, but no error was raised`);
}

function assertExplicitCoverageRule(source, fieldPath) {
  const exactRule = FIELD_COVERAGE_REGISTRY.get(coverageRegistryKey(source, fieldPath));
  if (!exactRule || exactRule.status === "unmapped-blocking") {
    const error = new Error(`${source}:${fieldPath} is not covered by an actionable rule`);
    error.code = "UNMAPPED_SOURCE_FIELD";
    throw error;
  }
  return exactRule;
}

function assertValidationCoverage(rule, occurrence, sources, model) {
  const proof = validateCoverageOccurrence(rule, occurrence, sources, model);
  if (!proof.ok) {
    const error = new Error(
      `${rule.validationId}: expected ${stableStringify(proof.expected)}, `
      + `received ${stableStringify(proof.actual)}`
    );
    error.code = "COVERAGE_VALIDATION_MISMATCH";
    throw error;
  }
}

function assertSpecialValueDistinctions() {
  const synthetic = [{
    key: "synthetic",
    value: {
      items: [
        {},
        { field: null },
        { field: "" },
        { field: [] },
        { field: 0 }
      ]
    }
  }];
  const { observations } = sourceObservations(synthetic);
  const fieldValues = observations
    .filter(item => item.fieldPath === "items[].field" || item.fieldPath === "items[].field[]");
  const kinds = new Set(fieldValues.map(item => item.kind));
  const ownerCount = new Set(
    observations.flatMap(item => (
      item.owners.has("items[]") ? [item.owners.get("items[]").concretePath] : []
    ))
  ).size;
  if (
    ownerCount !== 5
    || !kinds.has("null")
    || !kinds.has("empty-string")
    || !kinds.has("empty-array")
    || !kinds.has("zero")
    || fieldValues.length !== 4
  ) {
    const error = new Error("absent, null, empty string, empty array and zero were conflated");
    error.code = "VALUE_DISTINCTION_LOST";
    throw error;
  }
}

function assertFutureDedicatedColumnValue({
  source,
  fieldPath,
  concretePath,
  ownerPath,
  owner,
  table,
  row,
  expectedValue,
  forbiddenJsonPath = null
}) {
  const model = modelFactory();
  model.add(table, row, "memory");
  const occurrence = {
    source,
    fieldPath,
    concretePath,
    value: expectedValue,
    owners: new Map([[ownerPath, { value: owner, concretePath: ownerPath.replace("[]", "[0]") }]])
  };
  const rule = assertExplicitCoverageRule(source, fieldPath);
  if (rule.status !== "column-mapped") {
    const error = new Error(`${fieldPath} is not column-mapped`);
    error.code = "DEDICATED_COLUMN_MISSING";
    throw error;
  }
  assertColumnCoverage(rule, occurrence, model, DEFAULT_PROTOTYPE_DIRECTORY);
  if (forbiddenJsonPath) {
    const [jsonColumn, forbiddenKey] = forbiddenJsonPath;
    const jsonText = stableStringify(row[jsonColumn]);
    if (jsonText.includes(forbiddenKey) || jsonText.includes(expectedValue)) {
      const error = new Error(`${fieldPath} leaked into ${table}.${jsonColumn}`);
      error.code = "DEDICATED_VALUE_DIVERTED_TO_JSON";
      throw error;
    }
  }
}

function runSelfTests() {
  const tests = [];
  tests.push(expectErrorCode("missing source", "SOURCE_MISSING", () => {
    readSourceFile(path.join(DEFAULT_PROTOTYPE_DIRECTORY, "__missing__"), SOURCE_DEFINITIONS[0]);
  }));
  tests.push(expectErrorCode("invalid JSON", "INVALID_JSON", () => {
    parseJsonText("{", "internal-invalid-json");
  }));
  tests.push(expectErrorCode("duplicate identifier", "DUPLICATE_ID", () => {
    assertUniqueIds([{ id: "same" }, { id: "same" }], "fixture");
  }));
  tests.push(expectErrorCode("orphan logical FK", "ORPHAN_FOREIGN_KEY", () => {
    assertLogicalForeignKey(
      [{ asset_id: "missing" }],
      ["asset_id"],
      [{ id: "present" }],
      ["id"],
      "fixture"
    );
  }));
  tests.push(expectErrorCode("cycle", "CYCLE", () => {
    assertAcyclic(
      [{ id: "a", parent_id: "b" }, { id: "b", parent_id: "a" }],
      "id",
      "parent_id",
      "fixture"
    );
  }));
  tests.push(expectErrorCode("invalid locator", "INVALID_LOCATOR", () => {
    assertLocator({
      id: "playable",
      kind: "local-file",
      storage_scope: null,
      storage_key: "file.mp4",
      location_url: null,
      embed_video_id: null
    });
  }));
  tests.push(expectErrorCode("missing required field", "REQUIRED_FIELD", () => {
    assertRequiredRow({ id: null }, ["id"], "fixture");
  }));
  tests.push(expectErrorCode("unknown enumeration", "UNKNOWN_ENUM", () => {
    assertEnumValue("surprise", ["known"], "fixture.enum");
  }));
  tests.push(expectErrorCode("unknown source field", "UNMAPPED_SOURCE_FIELD", () => {
    const synthetic = [{
      key: "mediaLibrary",
      value: { assets: [{ id: "asset", neverRegisteredByTheDryRun: "value" }] }
    }];
    const { observations } = sourceObservations(synthetic);
    const unknown = observations.find(
      item => item.fieldPath === "assets[].neverRegisteredByTheDryRun"
    );
    assertExplicitCoverageRule(unknown.source, unknown.fieldPath);
  }));
  assertLogicalForeignKey(
    [{ activity_id: "activity", segment_id: null }],
    ["activity_id", "segment_id"],
    [],
    ["activity_id", "id"],
    "nullable interval fixture"
  );
  tests.push({
    label: "nullable interval segment FK",
    status: "PASS",
    code: "NULLABLE_FOREIGN_KEY"
  });
  tests.push(expectErrorCode("unknown non-null interval segment", "ORPHAN_FOREIGN_KEY", () => {
    assertLogicalForeignKey(
      [{ activity_id: "activity", segment_id: "unknown" }],
      ["activity_id", "segment_id"],
      [],
      ["activity_id", "id"],
      "unknown interval segment fixture"
    );
  }));
  tests.push(expectErrorCode("mapped value not produced", "COVERAGE_COLUMN_MISMATCH", () => {
    const model = modelFactory();
    model.add("media_tags", {
      id: "tag",
      name: "altered",
      normalized_name: "altered",
      created_at: "2026-01-01 00:00:00.000",
      updated_at: "2026-01-01 00:00:00.000"
    }, "memory");
    const occurrence = {
      source: "mediaLibrary",
      fieldPath: "tags[].name",
      concretePath: "tags[0].name",
      value: "expected",
      owners: new Map([[
        "tags[]",
        { value: { id: "tag", name: "expected" }, concretePath: "tags[0]" }
      ]])
    };
    const rule = assertExplicitCoverageRule(occurrence.source, occurrence.fieldPath);
    assertColumnCoverage(rule, occurrence, model, DEFAULT_PROTOTYPE_DIRECTORY);
  }));
  assertFutureDedicatedColumnValue({
    source: "mediaLibrary",
    fieldPath: "assets[].description",
    concretePath: "assets[0].description",
    ownerPath: "assets[]",
    owner: { id: "asset", description: "future asset description" },
    table: "media_assets",
    row: {
      id: "asset",
      description: "future asset description",
      provenance_json: { source: "fixture", _migration: {} }
    },
    expectedValue: "future asset description",
    forbiddenJsonPath: ["provenance_json", "sourceDescription"]
  });
  tests.push({
    label: "future asset description uses dedicated column",
    status: "PASS",
    code: "DEDICATED_COLUMN"
  });
  assertFutureDedicatedColumnValue({
    source: "mediaLibrary",
    fieldPath: "tags[].color",
    concretePath: "tags[0].color",
    ownerPath: "tags[]",
    owner: { id: "tag", color: "#123456" },
    table: "media_tags",
    row: { id: "tag", color: "#123456" },
    expectedValue: "#123456"
  });
  tests.push({
    label: "future media tag color uses dedicated column",
    status: "PASS",
    code: "DEDICATED_COLUMN"
  });
  assertFutureDedicatedColumnValue({
    source: "activities",
    fieldPath: "activities[].layerConfiguration.id",
    concretePath: "activities[0].layerConfiguration.id",
    ownerPath: "activities[]",
    owner: {
      id: "activity",
      layerConfiguration: { id: "layer-config-activity" }
    },
    table: "activities",
    row: { id: "activity", layer_configuration_id: "layer-config-activity" },
    expectedValue: "layer-config-activity"
  });
  tests.push({
    label: "future layer configuration id uses dedicated column",
    status: "PASS",
    code: "DEDICATED_COLUMN"
  });
  assertCompletedTreatmentContract({
    id: "treatment",
    status: "completed",
    output_asset_id: "output-asset",
    output_playable_id: "output-playable",
    published_playable_id: null,
    finished_at: "2026-01-01 00:00:00.000"
  }, [{ id: "output-playable", asset_id: "output-asset" }]);
  tests.push({
    label: "completed treatment may remain unpublished",
    status: "PASS",
    code: "UNPUBLISHED_COMPLETION"
  });
  tests.push(expectErrorCode(
    "completed treatment still requires output",
    "TREATMENT_COMPLETED_OUTPUT_INCOMPLETE",
    () => assertCompletedTreatmentContract({
      id: "treatment",
      status: "completed",
      output_asset_id: "output-asset",
      output_playable_id: null,
      published_playable_id: null,
      finished_at: "2026-01-01 00:00:00.000"
    }, [])
  ));
  tests.push(expectErrorCode(
    "published treatment playable must belong to output asset",
    "TREATMENT_PUBLISHED_PLAYABLE_INVALID",
    () => assertCompletedTreatmentContract({
      id: "treatment",
      status: "completed",
      output_asset_id: "output-asset",
      output_playable_id: "output-playable",
      published_playable_id: "published-playable",
      finished_at: "2026-01-01 00:00:00.000"
    }, [
      { id: "output-playable", asset_id: "output-asset" },
      { id: "published-playable", asset_id: "other-asset" }
    ])
  ));
  tests.push(expectErrorCode(
    "redundant relation mismatch",
    "COVERAGE_VALIDATION_MISMATCH",
    () => {
      const model = modelFactory();
      const activity = {
        id: "activity",
        transcription: { segmentIds: ["missing-segment"] },
        segments: []
      };
      const occurrence = {
        source: "activities",
        fieldPath: "activities[].transcription.segmentIds[]",
        concretePath: "activities[0].transcription.segmentIds[0]",
        value: "missing-segment",
        owners: new Map([[
          "activities[]",
          { value: activity, concretePath: "activities[0]" }
        ]])
      };
      const sources = [
        { key: "activities", value: { activities: [activity] } },
        { key: "mediaLibrary", value: { assets: [], sources: [], playables: [] } }
      ];
      const rule = assertExplicitCoverageRule(occurrence.source, occurrence.fieldPath);
      assertValidationCoverage(rule, occurrence, sources, model);
    }
  ));
  {
    const model = modelFactory();
    const activity = {
      id: "activity",
      videoRef: { assetId: "asset", playableId: "playable" },
      video: { id: "playable", kind: "hls" }
    };
    model.add("activity_media_links", {
      activity_id: "activity",
      role: "primary",
      media_asset_id: "asset",
      media_playable_id: "playable"
    }, "memory");
    const sources = [
      { key: "activities", value: { activities: [activity] } },
      {
        key: "mediaLibrary",
        value: {
          assets: [{ id: "asset", title: "Canonical" }],
          sources: [],
          playables: [{
            id: "playable",
            assetId: "asset",
            kind: "youtube-embed",
            provider: "youtube",
            location: { videoId: "abcdefghijk", embedUrl: "https://example.invalid/embed" },
            technicalMetadata: {}
          }]
        }
      }
    ];
    const occurrence = {
      source: "activities",
      fieldPath: "activities[].video.kind",
      concretePath: "activities[0].video.kind",
      value: "hls",
      owners: new Map([[
        "activities[]",
        { value: activity, concretePath: "activities[0]" }
      ]])
    };
    const rule = assertExplicitCoverageRule(occurrence.source, occurrence.fieldPath);
    const proof = validateCoverageOccurrence(rule, occurrence, sources, model);
    if (!proof.ok || proof.warning?.code !== "ACTIVITY_VIDEO_SNAPSHOT_DIVERGENCE") {
      throw new Error("historical activity video snapshot was not downgraded to a warning");
    }
    tests.push({
      label: "historical activity video snapshot warning",
      status: "PASS",
      code: "SNAPSHOT_WARNING"
    });
  }
  tests.push(expectErrorCode(
    "compatibility catalog mismatch",
    "COVERAGE_VALIDATION_MISMATCH",
    () => {
      const model = modelFactory();
      const video = { id: "playable", title: "altered" };
      const sources = [
        {
          key: "mediaLibrary",
          value: {
            assets: [{ id: "asset", title: "canonical", defaultPlayableId: "playable" }],
            sources: [{ id: "source", assetId: "asset", origin: {} }],
            playables: [{
              id: "playable",
              assetId: "asset",
              sourceId: "source",
              kind: "direct-url",
              provider: "fixture",
              location: { url: "https://example.invalid/video.mp4" },
              technicalMetadata: {}
            }]
          }
        },
        { key: "videoCatalog", value: { videos: [video] } }
      ];
      const occurrence = {
        source: "videoCatalog",
        fieldPath: "videos[].title",
        concretePath: "videos[0].title",
        value: "altered",
        owners: new Map([[
          "videos[]",
          { value: video, concretePath: "videos[0]" }
        ]])
      };
      const rule = assertExplicitCoverageRule(occurrence.source, occurrence.fieldPath);
      assertValidationCoverage(rule, occurrence, sources, model);
    }
  ));
  assertSpecialValueDistinctions();
  tests.push({
    label: "absent/null/empty/zero distinction",
    status: "PASS",
    code: "DISTINCT_VALUES"
  });

  console.log("Proto05 JSON -> MariaDB 003+002 alignment dry-run self-tests");
  for (const test of tests) console.log(`  ${test.status} ${test.label} (${test.code})`);
  console.log(`SELF_TEST_RESULT pass=${tests.length} fail=0`);
  return 0;
}

function parseArguments(argv) {
  const options = {
    selfTest: false,
    coverageMarkdown: false,
    prototypeDirectory: DEFAULT_PROTOTYPE_DIRECTORY
  };
  for (const argument of argv) {
    if (argument === "--self-test") {
      options.selfTest = true;
    } else if (argument === "--coverage-markdown") {
      options.coverageMarkdown = true;
    } else if (argument.startsWith("--source-root=")) {
      options.prototypeDirectory = path.resolve(argument.slice("--source-root=".length));
    } else if (argument === "--help") {
      console.log("Usage: node 001_proto05_json_to_mariadb_dry_run.mjs [--self-test] [--coverage-markdown] [--source-root=PATH]");
      console.log("This command is read-only and has no database write mode.");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function markdownCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function printCoverageMarkdown(fieldInventory) {
  console.log("COVERAGE_MARKDOWN_BEGIN");
  console.log("| Source | Chemin normalisé | Statut | Occ. | Non-NULL | NULL | Vides | Propriétaires absents | Destination / contrôle | Conciliées | Écarts |");
  console.log("|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|");
  for (const field of fieldInventory) {
    const emptyValues = field.emptyArrays + field.emptyObjects + field.emptyStrings;
    console.log(
      `| ${markdownCell(field.source)} | \`${markdownCell(field.fieldPath)}\` `
      + `| \`${field.status}\` | ${field.occurrences} | ${field.nonNullValues} `
      + `| ${field.nullValues} | ${emptyValues} | ${field.missingOwners} `
      + `| ${markdownCell(field.destination)} | ${field.reconciledOccurrences} `
      + `| ${field.mismatches} |`
    );
  }
  console.log("COVERAGE_MARKDOWN_END");
}

function printResult(result, durationMs) {
  console.log("Proto05 JSON -> MariaDB 003+002 alignment deterministic dry-run");
  console.log(`  status: ${result.status}`);
  console.log(`  source files: ${result.sourceFiles.length}`);
  console.log(`  schema contract: ${result.schema.tables} tables / ${result.schema.procedures} procedures`);
  console.log(`  tables with prepared rows: ${result.tablesWithRows}`);
  console.log(`  total prepared rows: ${result.totalPreparedRows}`);
  console.log(`  blockers: ${result.blockers}`);
  console.log(`  warnings: ${result.warnings}`);
  console.log(`  unmapped field paths: ${result.unmappedFieldPaths}`);
  if (result.coverage) {
    console.log(
      `  field coverage: ${result.coverage.normalizedPaths} paths / `
      + `${result.coverage.totalOccurrences} occurrences / `
      + `${result.coverage.reconciledOccurrences} reconciled / `
      + `${result.coverage.mismatches} mismatches`
    );
    for (const status of COVERAGE_STATUSES) {
      const summary = result.coverage.status[status];
      console.log(
        `    ${status}: ${summary.paths} paths / ${summary.occurrences} occurrences`
      );
    }
  }
  console.log(`  source bundle hash: ${result.sourceBundleHash}`);
  console.log(`  deterministic intermediate hash: ${result.deterministicHash}`);
  console.log(`  indicative duration: ${durationMs.toFixed(1)} ms (excluded from hash)`);
  console.log("  table counts:");
  for (const [tableName, count] of Object.entries(result.tableCounts)) {
    if (count > 0) console.log(`    ${tableName}: ${count}`);
  }
  if (result.diagnostics.length) {
    console.log("  diagnostics:");
    for (const diagnostic of result.diagnostics) {
      console.log(
        `    ${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`
        + ` ${stableStringify(diagnostic.context)}`
      );
    }
  }
  const deterministicOutput = {
    status: result.status,
    deterministicHash: result.deterministicHash,
    sourceBundleHash: result.sourceBundleHash,
    tablesWithRows: result.tablesWithRows,
    totalPreparedRows: result.totalPreparedRows,
    blockers: result.blockers,
    warnings: result.warnings,
    unmappedFieldPaths: result.unmappedFieldPaths,
    coverage: result.coverage,
    sourceFiles: result.sourceFiles,
    tableCounts: result.tableCounts,
    conservation: result.conservation,
    schema: result.schema,
    diagnostics: result.diagnostics,
    insertionPlan: result.insertionPlan
  };
  console.log(`DRY_RUN_RESULT_JSON=${stableStringify(deterministicOutput)}`);
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.selfTest) return runSelfTests();
  const started = process.hrtime.bigint();
  const { result } = deterministicResult(options.prototypeDirectory);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  printResult(result, elapsedMs);
  if (options.coverageMarkdown) printCoverageMarkdown(result.fieldInventory || []);
  return result.blockers > 0 ? 1 : 0;
}

export {
  DEFAULT_PROTOTYPE_DIRECTORY,
  TABLE_DEFINITIONS,
  deterministicResult,
  relationalModelFromCanonicalSnapshot,
  stableStringify
};

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`DRY_RUN_FATAL ${error.code || "ERROR"}: ${error.message}`);
    process.exitCode = 1;
  }
}
