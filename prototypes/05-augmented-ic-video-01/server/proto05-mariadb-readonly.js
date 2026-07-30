"use strict";

const path = require("node:path");
const { projectCanonicalLibrary } = require("./media-library-runtime");

const PEDAGOGICAL_TEXT_FIELDS = Object.freeze({
  "adaptable-elements": "adaptableElements",
  "learning-objectives": "learningObjectives",
  limitations: "limitations",
  modalities: "modalities",
  origin: "origin",
  "pedagogical-core": "pedagogicalCore",
  prerequisites: "prerequisites",
  "recommended-scenario": "recommendedScenario",
  responsibility: "responsibility"
});

const READ_TABLES = Object.freeze([
  ["data_projection_metadata", "document_key"],
  ["languages", "id"],
  ["activity_folders", "sort_order, id"],
  ["media_folders", "sort_order, id"],
  ["media_tags", "id"],
  ["activities", "id", "deleted_at IS NULL"],
  ["activity_pedagogical_identities", "activity_id"],
  ["activity_pedagogical_text_fields", "activity_id, field_key"],
  ["activity_pedagogical_qualifications", "activity_id, id"],
  ["activity_languages", "activity_id, sort_order, language_id"],
  ["activity_transcriptions", "activity_id"],
  ["activity_speakers", "activity_id, sort_order, id"],
  ["activity_segments", "activity_id, sort_order, id"],
  ["activity_segment_speakers", "activity_id, segment_id, speaker_id"],
  ["activity_segment_languages", "activity_id, segment_id, language_id"],
  ["activity_language_intervals", "activity_id, sort_order, id"],
  ["activity_layers", "activity_id, sort_order, id"],
  ["activity_layer_visibility", "activity_id, layer_id, audience"],
  ["activity_phenomena", "activity_id, sort_order, id"],
  ["activity_annotations", "activity_id, sort_order, id"],
  ["activity_overlays", "activity_id, sort_order, id"],
  ["activity_overlay_layers", "activity_id, overlay_id, layer_id"],
  ["activity_media_links", "activity_id, role, sort_order, id"],
  ["media_assets", "id", "deleted_at IS NULL"],
  ["media_sources", "id"],
  ["media_playables", "id", "removed_at IS NULL"],
  ["media_playable_metadata", "playable_id"],
  ["media_asset_tags", "asset_id, tag_id"],
  ["media_treatments", "id"]
]);

const FORBIDDEN_PRIVILEGES = new Set([
  "ALL PRIVILEGES",
  "ALTER",
  "ALTER ROUTINE",
  "CREATE",
  "CREATE ROUTINE",
  "CREATE TABLESPACE",
  "CREATE TEMPORARY TABLES",
  "CREATE USER",
  "DELETE",
  "DROP",
  "EVENT",
  "EXECUTE",
  "FILE",
  "GRANT OPTION",
  "INDEX",
  "INSERT",
  "LOCK TABLES",
  "PROCESS",
  "REFERENCES",
  "RELOAD",
  "REPLICATION CLIENT",
  "REPLICATION SLAVE",
  "SET USER",
  "SHUTDOWN",
  "SUPER",
  "TRIGGER",
  "UPDATE"
]);

function jsonValue(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return structuredClone(value);
  try { return JSON.parse(value); } catch { return fallback; }
}

function withoutMigration(value) {
  const parsed = jsonValue(value, {});
  const migration = jsonValue(parsed._migration, {});
  delete parsed._migration;
  return { value: parsed, migration };
}

function isoDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(text) ? text : `${text}Z`).toISOString();
}

function numberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function booleanOrNull(value) {
  return value === null || value === undefined ? null : Boolean(Number(value));
}

function rowsFor(rows, name) {
  return Array.isArray(rows[name]) ? rows[name] : [];
}

function by(rows, key) {
  return new Map(rows.map(row => [row[key], row]));
}

function grouped(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row[key])) groups.set(row[key], []);
    groups.get(row[key]).push(row);
  }
  return groups;
}

function sortedByOrder(rows) {
  return [...rows].sort((left, right) => (
    Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)
    || String(left.id ?? left.language_id ?? "").localeCompare(String(right.id ?? right.language_id ?? ""))
  ));
}

function metadataByDocument(rows) {
  return by(rowsFor(rows, "data_projection_metadata"), "document_key");
}

function pedagogicalField(state, value, note) {
  return {
    state,
    ...(value !== null ? { value } : {}),
    ...(note !== null ? { note } : {})
  };
}

function mapPedagogicalIdentity(activityId, tables) {
  const identity = rowsFor(tables, "activity_pedagogical_identities").find(row => row.activity_id === activityId);
  if (!identity) return null;
  const result = {
    schemaVersion: identity.schema_version,
    resourceNature: pedagogicalField(identity.resource_nature_state, identity.resource_nature_value, identity.resource_nature_note),
    designStatus: identity.design_status,
    indicativeDuration: {
      state: identity.duration_state,
      ...(identity.duration_minutes !== null ? { minutes: Number(identity.duration_minutes) } : {}),
      ...(identity.duration_note !== null ? { note: identity.duration_note } : {})
    },
    lineage: {
      state: identity.lineage_state,
      ...(identity.lineage_relation !== null ? { relation: identity.lineage_relation } : {}),
      ...(identity.parent_activity_id !== null
        ? { parentActivityId: identity.parent_activity_id }
        : identity.lineage_relation === "root"
          ? { parentActivityId: null }
          : {}),
      ...(identity.root_activity_id !== null ? { rootActivityId: identity.root_activity_id } : {}),
      ...(identity.lineage_note !== null ? { note: identity.lineage_note } : {})
    },
    qualifications: rowsFor(tables, "activity_pedagogical_qualifications")
      .filter(row => row.activity_id === activityId)
      .map(row => ({
        id: row.id,
        level: row.level,
        validatedBy: row.validated_by,
        validatedAt: row.validated_at,
        context: row.context_text,
        evidenceType: row.evidence_type,
        evidence: row.evidence_text,
        ...(row.note !== null ? { note: row.note } : {})
      })),
    intention: pedagogicalField(identity.intention_state, identity.intention_value, identity.intention_note),
    audience: pedagogicalField(identity.audience_state, identity.audience_value, identity.audience_note),
    useContext: pedagogicalField(identity.use_context_state, identity.use_context_value, identity.use_context_note)
  };
  for (const row of rowsFor(tables, "activity_pedagogical_text_fields").filter(row => row.activity_id === activityId)) {
    const property = PEDAGOGICAL_TEXT_FIELDS[row.field_key];
    if (property) result[property] = pedagogicalField(row.knowledge_state, row.value_text, row.note);
  }
  Object.assign(result, jsonValue(identity.extended_fields_json, {}));
  return result;
}

function mapActivities(tables) {
  const metadata = metadataByDocument(tables).get("activities");
  const languageReferences = by(rowsFor(tables, "languages"), "id");
  const speakers = grouped(rowsFor(tables, "activity_speakers"), "activity_id");
  const segments = grouped(rowsFor(tables, "activity_segments"), "activity_id");
  const segmentSpeakers = grouped(rowsFor(tables, "activity_segment_speakers"), "segment_id");
  const segmentLanguages = grouped(rowsFor(tables, "activity_segment_languages"), "segment_id");
  const phenomena = grouped(rowsFor(tables, "activity_phenomena"), "activity_id");
  const phenomenaBySegment = grouped(rowsFor(tables, "activity_phenomena"), "segment_id");
  const intervals = grouped(rowsFor(tables, "activity_language_intervals"), "activity_id");
  const layers = grouped(rowsFor(tables, "activity_layers"), "activity_id");
  const visibility = grouped(rowsFor(tables, "activity_layer_visibility"), "activity_id");
  const annotations = grouped(rowsFor(tables, "activity_annotations"), "activity_id");
  const overlays = grouped(rowsFor(tables, "activity_overlays"), "activity_id");
  const overlayLayers = grouped(rowsFor(tables, "activity_overlay_layers"), "overlay_id");
  const activityLanguages = grouped(rowsFor(tables, "activity_languages"), "activity_id");
  const transcriptions = by(rowsFor(tables, "activity_transcriptions"), "activity_id");
  const primaryLinks = new Map(
    rowsFor(tables, "activity_media_links")
      .filter(row => row.role === "primary")
      .map(row => [row.activity_id, row])
  );

  const activities = rowsFor(tables, "activities").map(row => {
    const activityId = row.id;
    const activitySegments = sortedByOrder(segments.get(activityId) || []);
    const activityLayers = sortedByOrder(layers.get(activityId) || []);
    const activityVisibility = visibility.get(activityId) || [];
    const transcription = transcriptions.get(activityId);
    const mediaLink = primaryLinks.get(activityId);
    const activity = {
      id: activityId,
      version: row.version,
      status: row.status,
      title: row.title,
      description: row.description ?? "",
      instruction: row.instruction ?? "",
      pedagogicalQuestion: row.pedagogical_question ?? "",
      videoRef: mediaLink ? {
        schemaVersion: "0.1",
        assetId: mediaLink.media_asset_id,
        playableId: mediaLink.media_playable_id
      } : null,
      transcription: transcription ? {
        id: transcription.id,
        languageId: transcription.language_id,
        segmentIds: activitySegments.map(segment => segment.id),
        ...(transcription.label !== null ? { label: transcription.label } : {})
      } : null,
      segments: activitySegments.map(segment => ({
        id: segment.id,
        startMs: Number(segment.start_ms),
        endMs: Number(segment.end_ms),
        text: segment.text ?? "",
        speakerIds: (segmentSpeakers.get(segment.id) || []).map(item => item.speaker_id),
        languageIds: (segmentLanguages.get(segment.id) || []).map(item => item.language_id),
        phenomenonIds: (phenomenaBySegment.get(segment.id) || []).map(item => item.id)
      })),
      speakers: sortedByOrder(speakers.get(activityId) || []).map(speaker => ({
        id: speaker.id,
        label: speaker.label
      })),
      languages: sortedByOrder(activityLanguages.get(activityId) || []).map(language => ({
        id: language.language_id,
        code: languageReferences.get(language.language_id)?.code || language.language_id.toUpperCase(),
        label: language.local_label || languageReferences.get(language.language_id)?.label || language.language_id
      })),
      languageIntervals: sortedByOrder(intervals.get(activityId) || []).map(interval => ({
        id: interval.id,
        languageId: interval.language_id,
        startMs: Number(interval.start_ms),
        endMs: Number(interval.end_ms),
        ...(interval.segment_id !== null ? { segmentId: interval.segment_id } : {})
      })),
      layers: activityLayers.map(layer => ({
        id: layer.id,
        label: layer.label,
        description: layer.description ?? "",
        color: layer.color ?? ""
      })),
      phenomena: sortedByOrder(phenomena.get(activityId) || []).map(phenomenon => ({
        id: phenomenon.id,
        segmentId: phenomenon.segment_id,
        layerId: phenomenon.layer_id,
        startMs: Number(phenomenon.start_ms),
        endMs: Number(phenomenon.end_ms)
      })),
      teacherAnnotations: sortedByOrder(annotations.get(activityId) || []).map(annotation => ({
        id: annotation.id,
        segmentId: annotation.segment_id,
        note: annotation.note ?? "",
        pedagogicalQuestion: annotation.pedagogical_question ?? ""
      })),
      layerConfiguration: {
        id: row.layer_configuration_id,
        defaultVisibleLayerIds: activityLayers.filter(layer => activityVisibility.some(item => item.layer_id === layer.id && Number(item.is_default) === 1)).map(layer => layer.id),
        learnerVisibleLayerIds: activityLayers.filter(layer => activityVisibility.some(item => item.layer_id === layer.id && item.audience === "learner" && Number(item.is_visible) === 1)).map(layer => layer.id),
        teacherVisibleLayerIds: activityLayers.filter(layer => activityVisibility.some(item => item.layer_id === layer.id && item.audience === "teacher" && Number(item.is_visible) === 1)).map(layer => layer.id),
        allowLearnerToggle: Boolean(Number(row.allow_learner_toggle))
      },
      overlays: sortedByOrder(overlays.get(activityId) || []).map(overlay => ({
        id: overlay.id,
        ...(overlay.annotation_id !== null ? { annotationId: overlay.annotation_id } : {}),
        startMs: Number(overlay.start_ms),
        endMs: Number(overlay.end_ms),
        title: overlay.title ?? "",
        text: overlay.text ?? "",
        layerIds: (overlayLayers.get(overlay.id) || []).map(item => item.layer_id)
      }))
    };
    const identity = mapPedagogicalIdentity(activityId, tables);
    if (identity) activity.pedagogicalIdentity = identity;
    return activity;
  });

  return {
    schemaVersion: metadata?.schema_version || "0.1",
    updatedAt: isoDate(metadata?.source_updated_at_utc),
    activities
  };
}

function mapActivityLibrary(tables) {
  const metadata = metadataByDocument(tables).get("activity-library");
  const folders = rowsFor(tables, "activity_folders").map(folder => ({
    id: folder.id,
    name: folder.name,
    createdAt: isoDate(folder.created_at),
    updatedAt: isoDate(folder.updated_at)
  }));
  const assignments = {};
  for (const activity of rowsFor(tables, "activities")) {
    if (activity.folder_id !== null) assignments[activity.id] = activity.folder_id;
  }
  return {
    schemaVersion: metadata?.schema_version || "0.1",
    updatedAt: isoDate(metadata?.source_updated_at_utc),
    folders,
    assignments
  };
}

function playableTechnicalMetadata(row, migration, provenance) {
  const error = row.error_text === null ? null : jsonValue(row.error_text, row.error_text);
  const rawFrameRate = migration.technicalMetadataExtras?.rawFrameRate;
  const fileName = migration.technicalMetadataExtras?.fileName;
  if (provenance.kind === "derived-anonymized") {
    return {
      durationMs: numberOrNull(row.duration_ms),
      width: numberOrNull(row.width),
      height: numberOrNull(row.height),
      mimeType: row.mime_type,
      sizeBytes: numberOrNull(row.size_bytes),
      sha256: row.sha256,
      fileName,
      status: row.analysis_status,
      error
    };
  }
  return {
    durationMs: numberOrNull(row.duration_ms),
    width: numberOrNull(row.width),
    height: numberOrNull(row.height),
    frameRate: rawFrameRate ?? numberOrNull(row.frame_rate),
    videoCodec: row.video_codec,
    audioCodec: row.audio_codec,
    hasAudio: booleanOrNull(row.has_audio),
    mimeType: row.mime_type,
    sizeBytes: numberOrNull(row.size_bytes),
    sha256: row.sha256,
    ...(fileName !== null && fileName !== undefined ? { fileName } : {}),
    analyzedAt: isoDate(row.analyzed_at),
    analyzer: row.analyzer,
    analyzerVersion: row.analyzer_version,
    ...(provenance.kind === "managed-remote-copy" ? { status: row.analysis_status } : {}),
    error
  };
}

function mapVideoLibrary(tables) {
  const metadata = metadataByDocument(tables).get("media-library");
  const playableMetadata = by(rowsFor(tables, "media_playable_metadata"), "playable_id");
  const tagsByAsset = grouped(rowsFor(tables, "media_asset_tags"), "asset_id");
  const folders = rowsFor(tables, "media_folders").map(folder => ({
    id: folder.id,
    name: folder.name,
    parentFolderId: folder.parent_folder_id,
    sortOrder: Number(folder.sort_order),
    createdAt: isoDate(folder.created_at),
    updatedAt: isoDate(folder.updated_at)
  }));
  const tags = rowsFor(tables, "media_tags").map(tag => ({
    id: tag.id,
    name: tag.name,
    normalizedName: tag.normalized_name,
    ...(tag.color !== null ? { color: tag.color } : {}),
    createdAt: isoDate(tag.created_at),
    updatedAt: isoDate(tag.updated_at)
  }));
  const assets = rowsFor(tables, "media_assets").map(row => {
    const provenanceParts = withoutMigration(row.provenance_json);
    const migration = provenanceParts.migration;
    return {
      id: row.id,
      title: row.title,
      ...(row.description !== null ? { description: row.description } : {}),
      ...(row.editorial_metadata_json !== null && row.editorial_metadata_json !== undefined
        ? { editorialMetadata: jsonValue(row.editorial_metadata_json, {}) }
        : {}),
      lifecycle: row.lifecycle,
      folderId: row.folder_id,
      defaultPlayableId: row.default_playable_id,
      parentAssetId: Object.prototype.hasOwnProperty.call(migration, "originalParentAssetId")
        ? migration.originalParentAssetId
        : row.parent_asset_id,
      familyRootAssetId: Object.prototype.hasOwnProperty.call(migration, "originalFamilyRootAssetId")
        ? migration.originalFamilyRootAssetId
        : row.family_root_asset_id,
      derivationTypes: Array.isArray(migration.derivationTypes)
        ? migration.derivationTypes
        : row.derivation_type ? [row.derivation_type] : [],
      tagIds: (tagsByAsset.get(row.id) || []).map(item => item.tag_id),
      provenance: provenanceParts.value,
      technicalMetadata: jsonValue(migration.assetTechnicalMetadata, {}),
      rights: jsonValue(row.rights_json, {}),
      createdAt: isoDate(row.created_at),
      updatedAt: isoDate(row.updated_at)
    };
  });
  const sources = rowsFor(tables, "media_sources").map(row => ({
    id: row.id,
    assetId: row.asset_id,
    kind: row.kind,
    provider: row.provider,
    ...(row.role !== null ? { role: row.role } : {}),
    origin: jsonValue(row.origin_json, {}),
    transport: row.transport,
    mimeType: row.mime_type,
    provenance: jsonValue(row.provenance_json, {}),
    createdAt: isoDate(row.created_at)
  }));
  const playables = rowsFor(tables, "media_playables").map(row => {
    const provenanceParts = withoutMigration(row.provenance_json);
    const metadataRow = playableMetadata.get(row.id) || {};
    return {
      id: row.id,
      assetId: row.asset_id,
      sourceId: row.source_id,
      kind: row.kind,
      provider: row.provider,
      ...(row.role !== null ? { role: row.role } : {}),
      availability: row.availability,
      availabilityReason: row.availability_reason,
      location: jsonValue(provenanceParts.migration.originalLocation, {}),
      technicalMetadata: playableTechnicalMetadata(metadataRow, provenanceParts.migration, provenanceParts.value),
      provenance: provenanceParts.value,
      createdAt: isoDate(row.created_at),
      updatedAt: isoDate(row.updated_at)
    };
  });
  const treatments = rowsFor(tables, "media_treatments").map(row => {
    const parametersParts = withoutMigration(row.parameters_json);
    return {
      id: row.id,
      derivationId: parametersParts.migration.derivationId,
      label: row.label,
      type: row.type,
      sourceAssetId: row.source_asset_id,
      sourcePlayableId: row.source_playable_id,
      sourcePreparationId: row.source_preparation_id,
      outputAssetId: row.output_asset_id,
      outputPlayableId: row.output_playable_id,
      status: row.status,
      progress: Number(row.progress),
      createdAt: isoDate(row.created_at),
      updatedAt: isoDate(row.updated_at),
      startedAt: isoDate(row.started_at),
      finishedAt: isoDate(row.finished_at),
      error: jsonValue(row.error_json, null),
      parameters: parametersParts.value,
      engine: row.engine,
      engineVersion: row.engine_version,
      ffmpegVersion: row.ffmpeg_version,
      runtimeJobId: row.runtime_job_id,
      diagnostics: jsonValue(row.diagnostics_json, {}),
      retained: Boolean(Number(row.retained)),
      publishedPlayableId: row.published_playable_id
    };
  });
  return {
    schemaVersion: metadata?.schema_version || "1.0",
    updatedAt: isoDate(metadata?.source_updated_at_utc),
    assets,
    sources,
    playables,
    treatments,
    folders,
    tags
  };
}

function mapVideoCatalog(tables, videoLibrary) {
  const metadata = metadataByDocument(tables).get("video-catalog");
  const assets = by(videoLibrary.assets, "id");
  const sources = by(videoLibrary.sources, "id");
  const videos = videoLibrary.playables
    .filter(playable => playable.id === "video-proto05-uga-37004" || playable.id.startsWith("video-proto05-youtube-"))
    .map(playable => {
      const asset = assets.get(playable.assetId);
      const source = sources.get(playable.sourceId);
      if (playable.kind === "youtube-embed") {
        return {
          id: playable.id,
          title: asset?.title || playable.id,
          provider: "youtube",
          videoId: playable.location.videoId,
          embedUrl: playable.location.embedUrl,
          durationMs: playable.technicalMetadata.durationMs,
          authorized: true
        };
      }
      const proxyUrl = playable.location.manifestUrl || playable.location.url;
      return {
        id: playable.id,
        title: asset?.title || playable.id,
        provider: "uga",
        source: "UGA",
        sourceType: "hls-proxy",
        key: typeof proxyUrl === "string" ? proxyUrl.replace(/^\/api\/hls\//, "") : null,
        proxyUrl,
        mimeType: playable.technicalMetadata.mimeType,
        durationMs: playable.technicalMetadata.durationMs,
        authorized: true,
        sourceUrl: source?.origin?.sourceUrl || source?.origin?.originUrl || null
      };
    });
  return {
    schemaVersion: metadata?.schema_version || "0.1",
    videos
  };
}

function mapMariaDbTablesToSnapshot(tables) {
  const videoLibrary = mapVideoLibrary(tables);
  return {
    activities: mapActivities(tables),
    activityLibrary: mapActivityLibrary(tables),
    languageCatalog: {
      languages: rowsFor(tables, "languages")
        .filter(language => Number(language.is_active) === 1)
        .map(language => ({ id: language.id, label: language.label }))
    },
    videoCatalog: mapVideoCatalog(tables, videoLibrary),
    videoLibrary
  };
}

function projectMariaDbSnapshotForApplication(snapshot) {
  const projected = {
    ...snapshot,
    videoLibrary: projectCanonicalLibrary(snapshot.videoLibrary)
  };
  Object.defineProperty(projected, "canonicalVideoLibrary", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: snapshot.videoLibrary
  });
  return projected;
}

function privilegeList(statement) {
  const match = /^GRANT\s+(.+?)\s+ON\s+/i.exec(statement);
  return match ? match[1].split(",").map(value => value.trim().toUpperCase()) : [];
}

function assertReadonlyGrants(grantRows, config) {
  const statements = grantRows.map(row => String(Object.values(row)[0] || ""));
  const normalized = statements.map(statement => statement.replace(/\s+IDENTIFIED BY PASSWORD\s+'[^']+'/i, ""));
  const databaseTarget = `\`${config.database.replaceAll("`", "``")}\`.*`.toLowerCase();
  let hasSelect = false;
  for (const statement of normalized) {
    const upper = statement.toUpperCase();
    const privileges = privilegeList(statement);
    for (const privilege of privileges) {
      if (FORBIDDEN_PRIVILEGES.has(privilege)) throw new Error("Le compte MariaDB configuré possède des privilèges incompatibles avec la lecture seule.");
    }
    if (upper.includes(" WITH GRANT OPTION")) throw new Error("Le compte MariaDB configuré peut déléguer des privilèges.");
    const onMatch = /\sON\s+(.+?)\s+TO\s+/i.exec(statement);
    const target = onMatch?.[1]?.toLowerCase();
    if (target === "*.*") {
      if (privileges.some(privilege => privilege !== "USAGE")) throw new Error("Le compte MariaDB configuré possède un privilège global non autorisé.");
    } else if (target === databaseTarget) {
      if (privileges.some(privilege => !["SELECT", "SHOW VIEW"].includes(privilege))) {
        throw new Error("Le compte MariaDB configuré possède un privilège de base non autorisé.");
      }
      if (privileges.includes("SELECT")) hasSelect = true;
    } else {
      throw new Error("Le compte MariaDB configuré possède des privilèges hors du périmètre Proto05.");
    }
  }
  if (!hasSelect) throw new Error("Le compte MariaDB configuré ne possède pas SELECT sur la base Proto05.");
  return { readonly: true, privileges: ["SELECT", "SHOW VIEW"] };
}

function defaultMysqlModule(prototypeDirectory, configuredPath = null) {
  const modulePath = configuredPath
    ? path.resolve(configuredPath)
    : path.resolve(
        prototypeDirectory,
        "..",
        "00-ic-hub",
        "server",
        "node_modules",
        "mysql2",
        "promise"
      );
  try {
    return require(modulePath);
  } catch {
    throw new Error("Le client MariaDB prévu par le workspace est indisponible.");
  }
}

function createMariaDbReadonlyAdapter({
  config,
  prototypeDirectory,
  mysqlModulePath = null,
  mysql = null,
  grantValidator = assertReadonlyGrants,
  mode = "mariadb-readonly",
  readonlySession = true
}) {
  const client = mysql || defaultMysqlModule(prototypeDirectory, mysqlModulePath);

  async function connection() {
    try {
      const result = await client.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        charset: "utf8mb4",
        dateStrings: true,
        decimalNumbers: false,
        supportBigNumbers: true,
        bigNumberStrings: true,
        multipleStatements: false,
        connectTimeout: 10_000
      });
      await result.query("SET SESSION time_zone = '+00:00'");
      if (readonlySession) await result.query("SET SESSION TRANSACTION READ ONLY");
      return result;
    } catch (cause) {
      throw new Error("Connexion MariaDB readonly impossible.", { cause });
    }
  }

  return Object.freeze({
    async verify() {
      const database = await connection();
      try {
        const [[identity]] = await database.query("SELECT CURRENT_USER() AS account, DATABASE() AS database_name");
        if (identity.database_name !== config.database || !String(identity.account || "").startsWith(`${config.user}@`)) {
          throw new Error("L’identité MariaDB obtenue ne correspond pas à la configuration readonly.");
        }
        const [grantRows] = await database.query("SHOW GRANTS");
        const grants = grantValidator(grantRows, config);
        const [[probe]] = await database.query("SELECT COUNT(*) AS activity_count FROM activities WHERE deleted_at IS NULL");
        return {
          mode,
          account: String(identity.account),
          database: identity.database_name,
          activityCount: Number(probe.activity_count),
          ...grants
        };
      } finally {
        await database.end();
      }
    },
    async readSnapshot() {
      const database = await connection();
      try {
        const tables = {};
        for (const [table, orderBy, where] of READ_TABLES) {
          const sql = `SELECT * FROM \`${table}\`${where ? ` WHERE ${where}` : ""} ORDER BY ${orderBy}`;
          const [rows] = await database.query(sql);
          tables[table] = rows;
        }
        return projectMariaDbSnapshotForApplication(mapMariaDbTablesToSnapshot(tables));
      } catch (error) {
        if (error?.message?.startsWith("Connexion MariaDB")) throw error;
        throw new Error("Lecture MariaDB readonly impossible.", { cause: error });
      } finally {
        await database.end();
      }
    },
    async close() {}
  });
}

module.exports = {
  READ_TABLES,
  assertReadonlyGrants,
  createMariaDbReadonlyAdapter,
  mapMariaDbTablesToSnapshot,
  projectMariaDbSnapshotForApplication
};
