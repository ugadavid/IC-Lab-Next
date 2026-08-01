"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  READ_TABLES,
  mapAudioAnonymizationPlan,
  mapMariaDbTablesToSnapshot,
  projectMariaDbSnapshotForApplication,
  readCanonicalTablesWithProcedures
} = require("./proto05-mariadb-readonly");
const {
  concurrencyConflict,
  mediaDeletionRevision,
  mediaEditorialRevision
} = require("./optimistic-concurrency");

const REQUIRED_PRIVILEGES = Object.freeze(["EXECUTE", "SELECT", "SHOW CREATE ROUTINE"]);
const OPTIONAL_PRIVILEGES = new Set(["SHOW VIEW"]);
const TECHNICAL_METADATA_TARGET = "data_projection_metadata";
const MANAGED_METADATA = Object.freeze({
  name: "data_projection_metadata",
  pk: ["document_key"],
  order: 5
});

function privilegeList(statement) {
  const match = /^GRANT\s+(.+?)\s+ON\s+/i.exec(statement);
  return match ? match[1].split(",").map(value => value.trim().toUpperCase()) : [];
}

function assertApplicationGrants(grantRows, config) {
  const statements = grantRows.map(row => String(Object.values(row)[0] || "")
    .replace(/\s+IDENTIFIED BY PASSWORD\s+'[^']+'/i, ""));
  const databaseTarget = `\`${config.database.replaceAll("`", "``")}\`.*`.toLowerCase();
  const metadataTarget = `\`${config.database.replaceAll("`", "``")}\`.\`${TECHNICAL_METADATA_TARGET}\``.toLowerCase();
  const databasePrivileges = new Set();
  let metadataUpdate = false;
  for (const statement of statements) {
    if (/\sWITH GRANT OPTION(?:\s|$)/i.test(statement)) {
      throw new Error("Le compte MariaDB applicatif peut déléguer des privilèges.");
    }
    const privileges = privilegeList(statement);
    const target = /\sON\s+(.+?)\s+TO\s+/i.exec(statement)?.[1]?.toLowerCase();
    if (target === "*.*") {
      if (privileges.some(privilege => privilege !== "USAGE")) {
        throw new Error("Le compte MariaDB applicatif possède un privilège global non autorisé.");
      }
      continue;
    }
    if (target === metadataTarget) {
      if (privileges.length !== 1 || privileges[0] !== "UPDATE") {
        throw new Error("Le compte MariaDB applicatif possède un privilège technique non autorisé.");
      }
      metadataUpdate = true;
      continue;
    }
    if (target !== databaseTarget) {
      throw new Error("Le compte MariaDB applicatif possède des privilèges hors du périmètre Proto05.");
    }
    for (const privilege of privileges) {
      if (!REQUIRED_PRIVILEGES.includes(privilege) && !OPTIONAL_PRIVILEGES.has(privilege)) {
        throw new Error("Le compte MariaDB applicatif possède un privilège de base non autorisé.");
      }
      databasePrivileges.add(privilege);
    }
  }
  for (const privilege of REQUIRED_PRIVILEGES) {
    if (!databasePrivileges.has(privilege)) {
      throw new Error(`Le compte MariaDB applicatif ne possède pas ${privilege}.`);
    }
  }
  if (!metadataUpdate) {
    throw new Error("Le compte MariaDB applicatif ne peut pas actualiser le témoin technique de projection.");
  }
  return {
    readonly: false,
    privileges: [...databasePrivileges, `UPDATE:${TECHNICAL_METADATA_TARGET}`].sort()
  };
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

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function normalizeValue(value) {
  if (value instanceof Date) return value.toISOString().replace("T", " ").replace("Z", "");
  if (value && typeof value === "object") return stableJson(value);
  return value;
}

function comparableValue(actual, desired) {
  if (desired && typeof desired === "object") {
    if (actual === null || actual === undefined) return actual;
    if (typeof actual === "string") {
      try { return stableJson(JSON.parse(actual)); } catch { return actual; }
    }
    return stableJson(actual);
  }
  if (typeof desired === "number" && actual !== null && actual !== undefined) return Number(actual);
  return normalizeValue(actual);
}

function databaseValue(value) {
  if (value === undefined) return null;
  if (value && typeof value === "object") return JSON.stringify(value);
  return value;
}

function rowKey(row, primaryKey) {
  return primaryKey.map(column => String(row[column])).join("\u0000");
}

function rowChanged(current, desired) {
  return Object.keys(desired).some(column => (
    comparableValue(current[column], desired[column]) !== normalizeValue(desired[column])
  ));
}

function tablePlan(definition, currentRows, desiredRows) {
  const current = new Map(currentRows.map(row => [rowKey(row, definition.pk), row]));
  const desired = new Map(desiredRows.map(row => [rowKey(row, definition.pk), row]));
  return {
    definition,
    deletes: [...current].filter(([key]) => !desired.has(key)).map(([, row]) => row),
    inserts: [...desired].filter(([key]) => !current.has(key)).map(([, row]) => row),
    updates: [...desired].filter(([key, row]) => current.has(key) && rowChanged(current.get(key), row))
      .map(([key, row]) => ({ current: current.get(key), desired: row }))
  };
}

function metadataRows(snapshot, canonicalLibrary) {
  function sqlTimestamp(value) {
    return value ? new Date(value).toISOString().replace("T", " ").replace("Z", "") : null;
  }
  return [
    {
      document_key: "activities",
      schema_version: snapshot.activities.schemaVersion || "0.1",
      source_updated_at_utc: sqlTimestamp(snapshot.activities.updatedAt)
    },
    {
      document_key: "activity-library",
      schema_version: snapshot.activityLibrary.schemaVersion || "0.1",
      source_updated_at_utc: sqlTimestamp(snapshot.activityLibrary.updatedAt)
    },
    {
      document_key: "media-library",
      schema_version: canonicalLibrary.schemaVersion || "1.0",
      source_updated_at_utc: sqlTimestamp(canonicalLibrary.updatedAt)
    },
    {
      document_key: "video-catalog",
      schema_version: snapshot.videoCatalog.schemaVersion || "0.1",
      source_updated_at_utc: null
    }
  ];
}

function mapperActivities(activities) {
  return {
    ...activities,
    activities: (activities?.activities || []).map(activity => {
      const result = structuredClone(activity);
      delete result.revision;
      delete result.revisionToken;
      return result;
    })
  };
}

function activityAuthoringPayload(activity, desiredRows) {
  const activityId = activity.id;
  const layerConfiguration = activity.layerConfiguration || {};
  const learnerVisible = new Set(layerConfiguration.learnerVisibleLayerIds || []);
  const teacherVisible = new Set(layerConfiguration.teacherVisibleLayerIds || []);
  const defaultVisible = new Set(layerConfiguration.defaultVisibleLayerIds || []);
  return {
    activity: {
      version: activity.version,
      status: activity.status,
      title: activity.title,
      description: activity.description ?? null,
      instruction: activity.instruction ?? null,
      pedagogicalQuestion: activity.pedagogicalQuestion ?? null
    },
    languages: (activity.languages || []).map((item, sortOrder) => ({
      id: item.id,
      label: item.label ?? null,
      sortOrder
    })),
    transcription: activity.transcription || null,
    speakers: (activity.speakers || []).map((item, sortOrder) => ({ ...item, sortOrder })),
    segments: (activity.segments || []).map((item, sortOrder) => ({ ...item, sortOrder })),
    segmentSpeakers: (activity.segments || []).flatMap(segment =>
      (segment.speakerIds || []).map(speakerId => ({ segmentId: segment.id, speakerId }))),
    segmentLanguages: (activity.segments || []).flatMap(segment =>
      (segment.languageIds || []).map(languageId => ({ segmentId: segment.id, languageId }))),
    languageIntervals: (activity.languageIntervals || []).map((item, sortOrder) => ({ ...item, sortOrder })),
    layers: (activity.layers || []).map((item, sortOrder) => ({ ...item, sortOrder })),
    layerVisibility: (activity.layers || []).flatMap(layer => [
      { layerId: layer.id, audience: "learner", isVisible: learnerVisible.has(layer.id), isDefault: defaultVisible.has(layer.id) },
      { layerId: layer.id, audience: "teacher", isVisible: teacherVisible.has(layer.id), isDefault: false }
    ]),
    phenomena: (activity.phenomena || []).map((item, sortOrder) => ({ ...item, sortOrder })),
    annotations: (activity.teacherAnnotations || []).map((item, sortOrder) => ({ ...item, sortOrder })),
    overlays: (activity.overlays || []).map((item, sortOrder) => ({ ...item, sortOrder })),
    overlayLayers: (activity.overlays || []).flatMap(overlay =>
      (overlay.layerIds || []).map(layerId => ({ overlayId: overlay.id, layerId }))),
    layerConfiguration: {
      id: layerConfiguration.id,
      allowLearnerToggle: layerConfiguration.allowLearnerToggle !== false
    },
    allowLearnerToggle: layerConfiguration.allowLearnerToggle !== false,
    pedagogicalIdentity: (desiredRows.activity_pedagogical_identities || [])
      .find(row => row.activity_id === activityId) || null,
    pedagogicalTextFields: (desiredRows.activity_pedagogical_text_fields || [])
      .filter(row => row.activity_id === activityId),
    pedagogicalQualifications: (desiredRows.activity_pedagogical_qualifications || [])
      .filter(row => row.activity_id === activityId)
  };
}

function procedureName(value) {
  if (!/^sp_[a-z0-9_]+$/.test(value)) throw new Error("Nom de procédure Proto05 invalide.");
  return value;
}

async function callProcedure(database, name, parameters = []) {
  const placeholders = parameters.map(() => "?").join(", ");
  const [result] = await database.query(
    `CALL ${procedureName(name)}(${placeholders})`,
    parameters.map(databaseValue)
  );
  return result.filter(Array.isArray);
}

function sqlTimestamp(value) {
  return value ? new Date(value).toISOString().replace("T", " ").replace("Z", "") : null;
}

function changedIds(before = [], after = [], id = "id") {
  const previous = new Map((before || []).map(item => [item[id], item]));
  const next = new Map((after || []).map(item => [item[id], item]));
  return new Set([...previous.keys(), ...next.keys()].filter(key => (
    stableJson(previous.get(key)) !== stableJson(next.get(key))
  )));
}

function changedAssignmentIds(before = {}, after = {}) {
  return new Set([...Object.keys(before || {}), ...Object.keys(after || {})].filter(key => (
    (before || {})[key] !== (after || {})[key]
  )));
}

function mutationScope(baseSnapshot, desiredSnapshot) {
  const baseLibrary = baseSnapshot.canonicalVideoLibrary;
  const desiredLibrary = desiredSnapshot.canonicalVideoLibrary;
  if (!baseLibrary || !desiredLibrary) {
    throw new Error("Les projections média de départ et d’arrivée sont obligatoires.");
  }
  const activityIds = changedIds(
    baseSnapshot.activities?.activities,
    desiredSnapshot.activities?.activities
  );
  for (const id of changedAssignmentIds(
    baseSnapshot.activityLibrary?.assignments,
    desiredSnapshot.activityLibrary?.assignments
  )) activityIds.add(id);
  const assetIds = changedIds(baseLibrary.assets, desiredLibrary.assets);
  const sourceIds = changedIds(baseLibrary.sources, desiredLibrary.sources);
  const playableIds = changedIds(baseLibrary.playables, desiredLibrary.playables);
  const treatmentIds = changedIds(baseLibrary.treatments, desiredLibrary.treatments);
  for (const id of changedIds(
    baseSnapshot.videoCatalog?.videos,
    desiredSnapshot.videoCatalog?.videos
  )) assetIds.add(id);
  return {
    activityIds,
    activityFolderIds: changedIds(
      baseSnapshot.activityLibrary?.folders,
      desiredSnapshot.activityLibrary?.folders
    ),
    assetIds,
    sourceIds,
    playableIds,
    treatmentIds,
    mediaFolderIds: changedIds(baseLibrary.folders, desiredLibrary.folders),
    mediaTagIds: changedIds(baseLibrary.tags, desiredLibrary.tags)
  };
}

function rowAllowed(table, row, scope, desiredRows, currentTables) {
  if (table === "data_projection_metadata") {
    const key = row.document_key;
    if (key === "activities") return scope.activityIds.size > 0;
    if (key === "activity-library") {
      return scope.activityIds.size > 0 || scope.activityFolderIds.size > 0;
    }
    if (key === "media-library" || key === "video-catalog") {
      return scope.assetIds.size > 0
        || scope.sourceIds.size > 0
        || scope.playableIds.size > 0
        || scope.treatmentIds.size > 0
        || scope.mediaFolderIds.size > 0
        || scope.mediaTagIds.size > 0;
    }
    return false;
  }
  if (table === "languages") return false;
  if (table === "activity_folders") return scope.activityFolderIds.has(row.id);
  if (table === "activities") return scope.activityIds.has(row.id);
  if (table.startsWith("activity_")) return scope.activityIds.has(row.activity_id);
  if (table === "media_folders") return scope.mediaFolderIds.has(row.id);
  if (table === "media_tags") return scope.mediaTagIds.has(row.id);
  if (table === "media_assets") return scope.assetIds.has(row.id);
  if (table === "media_sources") {
    return scope.sourceIds.has(row.id) || scope.assetIds.has(row.asset_id);
  }
  if (table === "media_playables") {
    return scope.playableIds.has(row.id)
      || scope.sourceIds.has(row.source_id)
      || scope.assetIds.has(row.asset_id);
  }
  if (table === "media_playable_metadata") {
    if (scope.playableIds.has(row.playable_id)) return true;
    const playable = [...(desiredRows.media_playables || []), ...(currentTables.media_playables || [])]
      .find(item => item.id === row.playable_id);
    return Boolean(playable && (
      scope.sourceIds.has(playable.source_id) || scope.assetIds.has(playable.asset_id)
    ));
  }
  if (table === "media_asset_tags") {
    return scope.assetIds.has(row.asset_id) || scope.mediaTagIds.has(row.tag_id);
  }
  if (table === "media_treatments") {
    return scope.treatmentIds.has(row.id)
      || scope.assetIds.has(row.source_asset_id)
      || scope.assetIds.has(row.output_asset_id);
  }
  return false;
}

function plansForScope(plans, scope, desiredRows, currentTables) {
  let changes = 0;
  const scoped = plans.map(plan => {
    const allowed = row => rowAllowed(
      plan.definition.name,
      row,
      scope,
      desiredRows,
      currentTables
    );
    const selected = {
      ...plan,
      deletes: plan.deletes.filter(allowed),
      inserts: plan.inserts.filter(allowed),
      updates: plan.updates.filter(change => allowed(change.current) && allowed(change.desired))
    };
    changes += selected.deletes.length + selected.inserts.length + selected.updates.length;
    return selected;
  });
  if (changes === 0) {
    const error = new Error("La mutation demandée ne produit aucune modification relationnelle.");
    error.code = "PROTO05_EMPTY_TARGETED_WRITE";
    throw error;
  }
  return { plans: scoped, changes };
}

function alignProcedureOwnedIdentifiers(desiredRows, currentTables) {
  const currentLinks = currentTables.activity_media_links || [];
  desiredRows.activity_media_links = (desiredRows.activity_media_links || []).map(row => {
    const existing = currentLinks.find(current => (
      current.activity_id === row.activity_id
      && current.role === row.role
      && (row.role === "primary" || current.media_asset_id === row.media_asset_id)
    ));
    return existing ? { ...row, id: existing.id } : row;
  });
}

function planFor(plans, table) {
  return plans.find(plan => plan.definition.name === table) || {
    inserts: [], updates: [], deletes: []
  };
}

async function executeSnapshotProcedures({
  database,
  operation,
  plans,
  snapshot,
  desiredRows,
  currentTables,
  preconditions,
  beforeCall
}) {
  let calls = 0;
  const invoke = async (name, parameters) => {
    await beforeCall?.(calls);
    const resultSets = await callProcedure(database, name, parameters);
    calls += 1;
    return resultSets;
  };
  const activityPlan = planFor(plans, "activities");
  const activityFolderPlan = planFor(plans, "activity_folders");
  const mediaFolderPlan = planFor(plans, "media_folders");
  const mediaTagPlan = planFor(plans, "media_tags");
  const mediaAssetPlan = planFor(plans, "media_assets");
  const currentActivityRows = new Map((currentTables.activities || []).map(row => [row.id, row]));
  const revisions = new Map((currentTables.activities || []).map(row => [row.id, Number(row.revision)]));

  for (const row of activityFolderPlan.inserts) {
    await invoke("sp_activity_folder_create", [row.id, row.name]);
  }
  for (const { desired } of activityFolderPlan.updates) {
    await invoke("sp_activity_folder_rename", [desired.id, desired.name]);
  }
  for (const row of activityFolderPlan.deletes) {
    await invoke("sp_activity_folder_delete", [row.id]);
  }

  for (const row of mediaFolderPlan.inserts) {
    await invoke("sp_media_folder_create", [row.id, row.parent_folder_id, row.name]);
  }
  for (const { desired } of mediaFolderPlan.updates) {
    await invoke("sp_media_folder_rename", [desired.id, desired.name]);
  }
  for (const row of mediaFolderPlan.deletes) {
    await invoke("sp_media_folder_delete", [row.id]);
  }
  for (const row of mediaTagPlan.inserts) {
    await invoke("sp_media_tag_create", [row.id, row.name, {
      color: row.color,
      normalizedName: row.normalized_name
    }]);
  }
  for (const { desired } of mediaTagPlan.updates) {
    await invoke("sp_media_tag_rename", [desired.id, desired.name, {
      color: desired.color,
      normalizedName: desired.normalized_name
    }]);
  }
  for (const row of mediaTagPlan.deletes) {
    await invoke("sp_media_tag_delete", [row.id]);
  }

  for (const row of activityPlan.inserts) {
    const activity = snapshot.activities.activities.find(item => item.id === row.id);
    await database.query("SET @proto05_new_activity_id = ?", [row.id]);
    if (operation === "activity-duplicate") {
      const sourceId = activity?.pedagogicalIdentity?.lineage?.parentActivityId;
      const source = currentActivityRows?.get?.(sourceId);
      await invoke("sp_activity_duplicate", [
        sourceId,
        Number(source?.revision),
        row.id,
        row.title,
        0
      ]);
    } else {
      await invoke("sp_activity_create", [
        row.id,
        row.version,
        row.title,
        row.description,
        row.instruction,
        row.pedagogical_question
      ]);
    }
    const result = await invoke("sp_activity_replace_authoring", [
      row.id,
      1,
      activityAuthoringPayload(activity, desiredRows)
    ]);
    revisions.set(row.id, Number(result[0]?.[0]?.revision ?? 2));
  }

  const changedActivityIds = new Set([
    ...activityPlan.updates.map(change => change.desired.id),
    ...Object.keys(snapshot.activityLibrary?.assignments || {}).filter(id => {
      const desired = (desiredRows.activities || []).find(row => row.id === id)?.folder_id ?? null;
      return (currentActivityRows.get(id)?.folder_id ?? null) !== desired;
    })
  ]);
  for (const activityId of changedActivityIds) {
    const current = currentActivityRows.get(activityId);
    const desired = (desiredRows.activities || []).find(row => row.id === activityId);
    if (!current || !desired) continue;
    let revision = Number(current.revision);
    if (operation === "activity-library" && current.folder_id !== desired.folder_id) {
      const result = await invoke("sp_activity_assign_folder", [activityId, desired.folder_id]);
      revision = Number(result[0]?.[0]?.revision ?? revision);
      continue;
    }
    if (operation === "activity-video-ref") continue;
    const activity = snapshot.activities.activities.find(item => item.id === activityId);
    const result = await invoke("sp_activity_replace_authoring", [
      activityId,
      revision,
      activityAuthoringPayload(activity, desiredRows)
    ]);
    revision = Number(result[0]?.[0]?.revision ?? (revision + 1));
    revisions.set(activityId, revision);
  }

  const linkPlan = planFor(plans, "activity_media_links");
  for (const row of operation === "activity-delete" ? [] : linkPlan.deletes) {
    if (row.role !== "supplementary") {
      const error = new Error("La suppression de la vidéo primaire n’est pas couverte par le contrat canonique.");
      error.code = "PROTO05_PROCEDURE_OPERATION_UNSUPPORTED";
      throw error;
    }
    const result = await invoke("sp_activity_remove_supplementary_media", [
      row.activity_id,
      revisions.get(row.activity_id),
      row.media_asset_id
    ]);
    revisions.set(row.activity_id, Number(result[0]?.[0]?.revision ?? (revisions.get(row.activity_id) + 1)));
  }
  for (const row of operation === "activity-delete" ? [] : [
    ...linkPlan.inserts,
    ...linkPlan.updates.map(change => change.desired)
  ]) {
    const name = row.role === "primary"
      ? "sp_activity_set_primary_media"
      : "sp_activity_set_supplementary_media";
    const parameters = [
      row.activity_id,
      revisions.get(row.activity_id),
      row.media_asset_id,
      row.media_playable_id
    ];
    if (row.role !== "primary") parameters.push(row.sort_order);
    const result = await invoke(name, parameters);
    revisions.set(row.activity_id, Number(result[0]?.[0]?.revision ?? (revisions.get(row.activity_id) + 1)));
  }
  await database.query("SET @proto05_new_activity_id = NULL");

  for (const row of activityPlan.deletes) {
    const expected = preconditions.activities?.find(item => item.id === row.id)?.expected
      ?? Number(row.revision);
    await invoke("sp_activity_delete", [row.id, expected]);
  }

  const sourcePlan = planFor(plans, "media_sources");
  const playablePlan = planFor(plans, "media_playables");
  const metadataPlan = planFor(plans, "media_playable_metadata");
  for (const asset of mediaAssetPlan.inserts.filter(row => row.lifecycle !== "reserved")) {
    const source = sourcePlan.inserts.find(row => row.asset_id === asset.id);
    const playable = playablePlan.inserts.find(row => row.asset_id === asset.id && row.source_id === source?.id);
    if (!source || !playable) {
      const error = new Error("Un nouvel asset doit fournir une source et un playable canoniques.");
      error.code = "PROTO05_PROCEDURE_OPERATION_UNSUPPORTED";
      throw error;
    }
    const metadata = metadataPlan.inserts.find(row => row.playable_id === playable.id);
    const tagIds = (desiredRows.media_asset_tags || [])
      .filter(row => row.asset_id === asset.id)
      .map(row => row.tag_id);
    await invoke("sp_media_register_import", [
      asset.id, source.id, playable.id, asset.title, source.kind,
      source.provider, source.transport, source.role, source.mime_type,
      source.origin_url, playable.storage_scope, playable.storage_key,
      playable.location_url, playable.embed_video_id, playable.availability,
      {
        asset: {
          description: asset.description,
          folderId: asset.folder_id,
          editorialMetadata: asset.editorial_metadata_json,
          provenance: asset.provenance_json,
          rights: asset.rights_json,
          tagIds
        },
        source: {
          origin: source.origin_json,
          provenance: source.provenance_json
        },
        playable: { provenance: playable.provenance_json },
        metadata: metadata ? {
          analysisStatus: metadata.analysis_status,
          mimeType: metadata.mime_type,
          durationMs: metadata.duration_ms,
          sizeBytes: metadata.size_bytes,
          sha256: metadata.sha256,
          width: metadata.width,
          height: metadata.height,
          frameRate: metadata.frame_rate,
          videoCodec: metadata.video_codec,
          audioCodec: metadata.audio_codec,
          hasAudio: metadata.has_audio,
          analyzer: metadata.analyzer,
          analyzerVersion: metadata.analyzer_version,
          error: metadata.error_text
        } : null
      }
    ]);
  }

  for (const { current, desired } of mediaAssetPlan.updates) {
    const currentTags = (currentTables.media_asset_tags || []).filter(row => row.asset_id === desired.id).map(row => row.tag_id).sort();
    const desiredTags = (desiredRows.media_asset_tags || []).filter(row => row.asset_id === desired.id).map(row => row.tag_id).sort();
    const supported = new Set([
      "title", "description", "folder_id", "default_playable_id",
      "editorial_metadata_json", "provenance_json", "rights_json", "updated_at"
    ]);
    const unsupported = Object.keys(desired).filter(key => !supported.has(key)
      && comparableValue(current[key], desired[key]) !== normalizeValue(desired[key]));
    if (unsupported.length) {
      const error = new Error(`La procédure média ne couvre pas encore : ${unsupported.join(", ")}.`);
      error.code = "PROTO05_PROCEDURE_OPERATION_UNSUPPORTED";
      throw error;
    }
    if (stableJson(currentTags) !== stableJson(desiredTags)
        || Object.keys(desired).some(key => supported.has(key)
          && comparableValue(current[key], desired[key]) !== normalizeValue(desired[key]))) {
      await invoke("sp_media_asset_set_tags", [desired.id, {
        tagIds: desiredTags,
        title: desired.title,
        description: desired.description,
        folderId: desired.folder_id,
        defaultPlayableId: desired.default_playable_id,
        editorialMetadata: desired.editorial_metadata_json,
        provenance: desired.provenance_json,
        rights: desired.rights_json
      }]);
    }
  }

  for (const row of mediaAssetPlan.deletes) {
    await invoke(row.parent_asset_id ? "sp_media_derivation_delete" : "sp_media_asset_delete", [row.id]);
  }

  return calls;
}

function createMariaDbWriteAdapter({
  config,
  prototypeDirectory,
  mysqlModulePath = null,
  mysql = null
}) {
  const client = mysql || defaultMysqlModule(prototypeDirectory, mysqlModulePath);
  const migrationModuleUrl = pathToFileURL(path.join(
    prototypeDirectory,
    "database",
    "migrations",
    "001_proto05_json_to_mariadb_dry_run.mjs"
  )).href;
  let contractPromise = null;

  async function contract() {
    contractPromise ||= import(migrationModuleUrl);
    return contractPromise;
  }

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
      return result;
    } catch {
      throw new Error("Connexion MariaDB applicative impossible.");
    }
  }

  async function verifyConnection(database) {
    const [[identity]] = await database.query("SELECT CURRENT_USER() AS account, DATABASE() AS database_name");
    if (identity.database_name !== config.database || !String(identity.account || "").startsWith(`${config.user}@`)) {
      throw new Error("L’identité MariaDB obtenue ne correspond pas à la configuration applicative.");
    }
    const [grantRows] = await database.query("SHOW GRANTS");
    return { identity, grants: assertApplicationGrants(grantRows, config) };
  }

  async function targetedProcedureTransaction(operation, action, { touchMediaLibrary = false } = {}) {
    const database = await connection();
    let transactionStarted = false;
    let lockAcquired = false;
    try {
      await verifyConnection(database);
      const [[lock]] = await database.query("SELECT GET_LOCK('proto05_transactional_write', 10) AS acquired");
      if (Number(lock.acquired) !== 1) throw new Error("Verrou applicatif MariaDB indisponible.");
      lockAcquired = true;
      await database.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      await database.beginTransaction();
      transactionStarted = true;
      await database.query("SET @proto05_runtime_transaction = 1");
      const value = await action(database);
      if (touchMediaLibrary) {
        await database.query(
          "UPDATE `data_projection_metadata` SET `source_updated_at_utc` = CURRENT_TIMESTAMP(3) WHERE `document_key` = 'media-library'"
        );
      }
      await database.commit();
      transactionStarted = false;
      return value;
    } catch (error) {
      if (transactionStarted) {
        try { await database.rollback(); } catch {}
      }
      const safeDetail = String(error?.sqlMessage || error?.message || "erreur MariaDB").replace(/\s+/g, " ").slice(0, 500);
      const wrapped = new Error(`${operation} impossible : ${safeDetail}`);
      wrapped.code = error?.errno === 30503 ? "PROTO05_AUDIO_PLAN_CONFLICT" : "PROTO05_MARIADB_WRITE_FAILED";
      wrapped.reasonCode = error?.code || error?.errno || "MARIA_TARGETED_TRANSACTION_ERROR";
      wrapped.cause = error;
      throw wrapped;
    } finally {
      try { await database.query("SET @proto05_runtime_transaction = NULL"); } catch {}
      if (lockAcquired) {
        try { await database.query("SELECT RELEASE_LOCK('proto05_transactional_write')"); } catch {}
      }
      await database.end();
    }
  }

  async function mappedWorkingCopyRows(snapshot, mutation) {
    const canonicalLibrary = structuredClone(snapshot.canonicalVideoLibrary);
    const asset = canonicalLibrary.assets.find(item => item.id === mutation.assetId);
    const expectedPlayable = canonicalLibrary.playables.find(item => (
      item.id === mutation.expectedPlayableId && item.assetId === mutation.assetId
    ));
    if (!asset || !expectedPlayable) {
      throw new Error("La vidéo source de la copie de travail n’existe plus.");
    }
    if (
      canonicalLibrary.sources.some(item => item.id === mutation.source.id)
      || canonicalLibrary.playables.some(item => item.id === mutation.playable.id)
    ) {
      throw new Error("La destination canonique de la copie existe déjà.");
    }
    canonicalLibrary.sources.push(structuredClone(mutation.source));
    canonicalLibrary.playables.push(structuredClone(mutation.playable));
    asset.updatedAt = mutation.updatedAt;
    canonicalLibrary.updatedAt = mutation.updatedAt;
    const mapperInput = {
      activities: snapshot.activities,
      activityLibrary: snapshot.activityLibrary,
      mediaLibrary: canonicalLibrary,
      videoCatalog: snapshot.videoCatalog,
      languages: snapshot.languageCatalog
    };
    const { relationalModelFromCanonicalSnapshot } = await contract();
    const { model } = relationalModelFromCanonicalSnapshot(mapperInput, { prototypeDirectory });
    const row = (table, column, value) => model.tables.get(table).rows
      .map(entry => entry.data)
      .find(entry => entry[column] === value);
    return {
      canonicalLibrary,
      asset: row("media_assets", "id", mutation.assetId),
      source: row("media_sources", "id", mutation.source.id),
      playable: row("media_playables", "id", mutation.playable.id),
      metadata: row("media_playable_metadata", "playable_id", mutation.playable.id)
    };
  }

  return Object.freeze({
    async verify() {
      const database = await connection();
      try {
        const { identity, grants } = await verifyConnection(database);
        const tables = await readCanonicalTablesWithProcedures(database);
        return {
          mode: "mariadb",
          account: String(identity.account),
          database: identity.database_name,
          activityCount: tables.activities.length,
          ...grants
        };
      } finally {
        await database.end();
      }
    },

    async writeScopedSnapshot(baseSnapshot, snapshot, {
      operation = "mutation",
      failAfterStatements = null,
      preconditions = {}
    } = {}) {
      const canonicalLibrary = snapshot.canonicalVideoLibrary;
      if (!canonicalLibrary) throw new Error("Snapshot média canonique absent de la transaction MariaDB.");
      const mapperInput = {
        activities: mapperActivities(snapshot.activities),
        activityLibrary: snapshot.activityLibrary,
        mediaLibrary: canonicalLibrary,
        videoCatalog: snapshot.videoCatalog,
        languages: snapshot.languageCatalog
      };
      const { TABLE_DEFINITIONS, relationalModelFromCanonicalSnapshot } = await contract();
      const { model } = relationalModelFromCanonicalSnapshot(mapperInput, { prototypeDirectory });
      const definitions = [
        MANAGED_METADATA,
        ...TABLE_DEFINITIONS.filter(definition => READ_TABLES.some(([name]) => name === definition.name)
          && definition.name !== MANAGED_METADATA.name)
      ].sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
      const desiredRows = Object.fromEntries(definitions.map(definition => [
        definition.name,
        definition.name === MANAGED_METADATA.name
          ? metadataRows(snapshot, canonicalLibrary)
          : model.tables.get(definition.name).rows.map(row => row.data)
      ]));
      const canonicalAssets = new Map(canonicalLibrary.assets.map(asset => [asset.id, asset]));
      desiredRows.media_assets = desiredRows.media_assets.map(row => {
        const asset = canonicalAssets.get(row.id);
        return {
          ...row,
          editorial_metadata_json: Object.prototype.hasOwnProperty.call(asset || {}, "editorialMetadata")
            ? asset.editorialMetadata
            : null
        };
      });
      const database = await connection();
      let statementCount = 0;
      let lockAcquired = false;
      let transactionStarted = false;
      const executeMutation = async ({ sql, values }) => {
        await database.query(sql, values);
        statementCount += 1;
        if (Number.isInteger(failAfterStatements) && statementCount >= failAfterStatements) {
          const forced = new Error("Échec forcé après une première écriture.");
          forced.code = "PROTO05_FORCED_ROLLBACK";
          throw forced;
        }
      };
      try {
        await verifyConnection(database);
        const [[lock]] = await database.query("SELECT GET_LOCK('proto05_transactional_write', 10) AS acquired");
        if (Number(lock.acquired) !== 1) throw new Error("Verrou applicatif MariaDB indisponible.");
        lockAcquired = true;
        await database.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        await database.beginTransaction();
        transactionStarted = true;
        await database.query("SET @proto05_runtime_transaction = 1");
        const currentTables = await readCanonicalTablesWithProcedures(database);
        alignProcedureOwnedIdentifiers(desiredRows, currentTables);
        const currentActivityRows = new Map((currentTables.activities || []).map(row => [row.id, row]));
        const desiredActivityRows = new Map((desiredRows.activities || []).map(row => [row.id, row]));
        for (const desired of desiredActivityRows.values()) {
          const current = currentActivityRows.get(desired.id);
          if (current) desired.revision = Number(current.revision);
        }
        const currentSnapshot = projectMariaDbSnapshotForApplication(
          mapMariaDbTablesToSnapshot(currentTables)
        );
        for (const condition of preconditions.activities || []) {
          const current = currentActivityRows.get(condition.id);
          if (!current || current.deleted_at !== null) {
            throw concurrencyConflict({
              entityType: "activity",
              entityId: condition.id,
              reason: "deleted"
            });
          }
          const currentRevision = Number(current.revision);
          if (currentRevision !== condition.expected) {
            throw concurrencyConflict({
              entityType: "activity",
              entityId: condition.id,
              currentRevision,
              reason: condition.expected > currentRevision ? "future" : "stale"
            });
          }
          const desired = desiredActivityRows.get(condition.id);
          if (desired && condition.increment !== false) desired.revision = currentRevision + 1;
        }
        for (const condition of preconditions.mediaEditorial || []) {
          const current = currentSnapshot.canonicalVideoLibrary?.assets?.find(item => item.id === condition.id);
          const currentRevision = mediaEditorialRevision(current);
          if (!current || currentRevision !== condition.expected) {
            throw concurrencyConflict({
              entityType: "media-asset",
              entityId: condition.id,
              currentRevision,
              reason: current ? "stale" : "deleted"
            });
          }
        }
        for (const condition of preconditions.mediaDeletion || []) {
          const currentRevision = mediaDeletionRevision({
            assetId: condition.id,
            library: currentSnapshot.canonicalVideoLibrary,
            activities: currentSnapshot.activities?.activities || []
          });
          if (currentRevision !== condition.expected) {
            throw concurrencyConflict({
              entityType: "media-asset",
              entityId: condition.id,
              currentRevision,
              reason: currentRevision ? "stale" : "deleted"
            });
          }
        }
        const allPlans = definitions.map(definition => tablePlan(
          definition,
          currentTables[definition.name] || [],
          desiredRows[definition.name]
        ));
        const scope = mutationScope(baseSnapshot, snapshot);
        const scoped = plansForScope(
          allPlans,
          scope,
          desiredRows,
          currentTables
        );
        const plans = scoped.plans;
        const scopedChangeCount = scoped.changes;
        statementCount += await executeSnapshotProcedures({
          database,
          operation,
          plans,
          snapshot,
          desiredRows,
          currentTables,
          preconditions,
          beforeCall: async calls => {
            if (Number.isInteger(failAfterStatements) && calls + 1 >= failAfterStatements) {
              const forced = new Error("Échec forcé avant l’appel de procédure.");
              forced.code = "PROTO05_FORCED_ROLLBACK";
              throw forced;
            }
          }
        });
        const metadataPlan = planFor(plans, "data_projection_metadata");
        for (const { desired } of metadataPlan.updates) {
          await executeMutation({
            sql: "UPDATE `data_projection_metadata` SET `schema_version` = ?, `source_updated_at_utc` = ? WHERE `document_key` = ?",
            values: [desired.schema_version, desired.source_updated_at_utc, desired.document_key]
          });
        }
        const resultingTables = await readCanonicalTablesWithProcedures(database);
        const resultingSnapshot = projectMariaDbSnapshotForApplication(
          mapMariaDbTablesToSnapshot(resultingTables)
        );
        await database.commit();
        transactionStarted = false;
        return {
          operation,
          statements: statementCount,
          scopedChanges: scopedChangeCount,
          snapshot: resultingSnapshot
        };
      } catch (error) {
        if (transactionStarted) {
          try { await database.rollback(); } catch {}
          transactionStarted = false;
        }
        if (error?.code === "PROTO05_CONCURRENCY_CONFLICT") throw error;
        if (error?.code === "PROTO05_FORCED_ROLLBACK") throw error;
        const wrapped = new Error("Écriture MariaDB transactionnelle impossible.");
        wrapped.code = error?.code === "SNAPSHOT_RELATIONAL_MAPPING_BLOCKED"
          || error?.code?.startsWith("PROTO05_TARGETED_")
          || error?.code === "PROTO05_EMPTY_TARGETED_WRITE"
          ? error.code
          : "PROTO05_MARIADB_WRITE_FAILED";
        wrapped.reasonCode = error?.code || "MARIA_TRANSACTION_ERROR";
        wrapped.differencePaths = error?.differencePaths
          || (error?.code?.startsWith("PROTO05_TARGETED_")
            || error?.code === "PROTO05_PROCEDURE_OPERATION_UNSUPPORTED" ? [error.message] : []);
        throw wrapped;
      } finally {
        try { await database.query("SET @proto05_runtime_transaction = NULL"); } catch {}
        if (lockAcquired) {
          try { await database.query("SELECT RELEASE_LOCK('proto05_transactional_write')"); } catch {}
        }
        await database.end();
      }
    },

    async saveAudioAnonymizationPlan(plan) {
      return targetedProcedureTransaction(
        "Enregistrement transactionnel du plan d’anonymisation audio",
        async database => mapAudioAnonymizationPlan(await callProcedure(
          database,
          "sp_audio_anonymization_plan_save",
          [
            plan.id,
            plan.sourceAssetId,
            plan.sourcePlayableId,
            plan.durationMs,
            plan.revision,
            plan.passages
          ]
        ))
      );
    },

    async startInlineMediaTreatment(treatment) {
      return targetedProcedureTransaction(
        "Démarrage transactionnel du traitement média",
        async database => (await callProcedure(database, "sp_media_inline_treatment_start", [
          treatment.id,
          treatment.planId || null,
          treatment.sourceAssetId,
          treatment.sourcePlayableId,
          treatment.type,
          treatment.label || null,
          treatment.runtimeJobId || treatment.id,
          treatment.engine || "ffmpeg",
          treatment.engineVersion,
          treatment.parameters || {}
        ]))[0]?.[0] || null,
        { touchMediaLibrary: true }
      );
    },

    async updateMediaTreatment(treatment) {
      return targetedProcedureTransaction(
        "Mise à jour transactionnelle du traitement média",
        async database => (await callProcedure(database, "sp_media_treatment_update", [
          treatment.id,
          treatment.status,
          treatment.progress,
          treatment.diagnostics || {},
          treatment.error || null
        ]))[0]?.[0] || null,
        { touchMediaLibrary: true }
      );
    },

    async completeInlineMediaTreatment(result) {
      return targetedProcedureTransaction(
        "Finalisation transactionnelle du traitement média",
        async database => (await callProcedure(database, "sp_media_inline_treatment_complete", [
          result.treatmentId,
          result.outputSourceId,
          result.outputPlayableId,
          result.storageScope,
          result.storageKey,
          result.mimeType,
          result.sizeBytes,
          result.durationMs,
          result.sha256,
          result.audioCodec || null,
          result.hasAudio ? 1 : 0,
          result.ffmpegVersion,
          result.diagnostics || {}
        ]))[0]?.[0] || null,
        { touchMediaLibrary: true }
      );
    },

    async updateRemotePlayableAvailability(observation) {
      if (
        !observation?.assetId
        || !observation?.playableId
        || !["available", "unreachable-remote", "unknown"].includes(observation.availability)
      ) {
        throw new Error("Observation de disponibilité distante invalide.");
      }
      return targetedProcedureTransaction(
        "Mise à jour de la disponibilité distante",
        async database => {
          const beforeTables = await readCanonicalTablesWithProcedures(database);
          const playable = beforeTables.media_playables.find(row => (
            row.id === observation.playableId && row.asset_id === observation.assetId
          ));
          const source = beforeTables.media_sources.find(row => row.id === playable?.source_id);
          if (
            !playable
            || !source
            || !["hls", "direct-url"].includes(playable.kind)
            || !["hls", "direct-url"].includes(source.kind)
          ) {
            const error = new Error("La référence distante à contrôler est introuvable.");
            error.code = "PROTO05_REMOTE_PLAYABLE_NOT_FOUND";
            throw error;
          }
          const metadata = beforeTables.media_playable_metadata.find(row => (
            row.playable_id === observation.playableId
          )) || {};
          await callProcedure(database, "sp_media_update_playable_availability", [
            observation.playableId,
            observation.availability,
            observation.availabilityReason || null
          ]);
          await callProcedure(database, "sp_media_set_playable_metadata", [
            observation.playableId,
            observation.availability === "available"
              ? "complete"
              : observation.availability === "unreachable-remote" ? "failed" : "unknown",
            metadata.mime_type ?? source.mime_type ?? null,
            metadata.duration_ms ?? null,
            metadata.size_bytes ?? null,
            metadata.sha256 ?? null,
            metadata.width ?? null,
            metadata.height ?? null,
            metadata.frame_rate ?? null,
            metadata.video_codec ?? null,
            metadata.audio_codec ?? null,
            metadata.has_audio ?? null,
            "remote-availability",
            "1",
            observation.availability === "available" ? null : observation.availabilityReason || null
          ]);
          const resultingTables = await readCanonicalTablesWithProcedures(database);
          const result = projectMariaDbSnapshotForApplication(
            mapMariaDbTablesToSnapshot(resultingTables)
          );
          const saved = result.canonicalVideoLibrary.playables.find(item => (
            item.id === observation.playableId && item.assetId === observation.assetId
          ));
          if (
            !saved
            || saved.availability !== observation.availability
            || !saved.technicalMetadata?.analyzedAt
          ) {
            const error = new Error("La relecture de la disponibilité distante diverge.");
            error.code = "PROTO05_TARGETED_WRITE_RECONCILIATION_FAILED";
            throw error;
          }
          return { snapshot: result, playable: saved };
        },
        { touchMediaLibrary: true }
      );
    },

    async appendWorkingCopy(snapshot, mutation, {
      failAfterStatements = null
    } = {}) {
      if (!snapshot?.canonicalVideoLibrary) {
        throw new Error("Snapshot média canonique absent de la transaction MariaDB.");
      }
      if (
        !mutation?.assetId
        || !mutation?.expectedPlayableId
        || !mutation?.source?.id
        || !mutation?.playable?.id
        || mutation.source.assetId !== mutation.assetId
        || mutation.playable.assetId !== mutation.assetId
        || mutation.playable.sourceId !== mutation.source.id
      ) {
        throw new Error("Mutation ciblée de copie de travail invalide.");
      }
      const desired = await mappedWorkingCopyRows(snapshot, mutation);
      const database = await connection();
      let statementCount = 0;
      let lockAcquired = false;
      let transactionStarted = false;
      const executeMutation = async command => {
        await database.query(command.sql, command.values);
        statementCount += 1;
        if (Number.isInteger(failAfterStatements) && statementCount >= failAfterStatements) {
          const forced = new Error("Échec forcé pendant la création de la copie de travail.");
          forced.code = "PROTO05_FORCED_ROLLBACK";
          throw forced;
        }
      };
      try {
        await verifyConnection(database);
        const [[lock]] = await database.query("SELECT GET_LOCK('proto05_transactional_write', 10) AS acquired");
        if (Number(lock.acquired) !== 1) throw new Error("Verrou applicatif MariaDB indisponible.");
        lockAcquired = true;
        await database.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        await database.beginTransaction();
        transactionStarted = true;
        await database.query("SET @proto05_runtime_transaction = 1");
        const beforeTables = await readCanonicalTablesWithProcedures(database);
        const assetRow = beforeTables.media_assets.find(row => row.id === mutation.assetId);
        const sourcePlayable = beforeTables.media_playables.find(row => (
          row.id === mutation.expectedPlayableId && row.asset_id === mutation.assetId
        ));
        if (!assetRow || !sourcePlayable) {
          throw new Error("La vidéo source de la copie de travail n’existe plus.");
        }
        if (beforeTables.media_sources.some(row => row.id === mutation.source.id)
            || beforeTables.media_playables.some(row => row.id === mutation.playable.id)) {
          throw new Error("La destination canonique de la copie existe déjà.");
        }
        if (Number.isInteger(failAfterStatements) && failAfterStatements <= 1) {
          const forced = new Error("Échec forcé avant l’appel de procédure de copie de travail.");
          forced.code = "PROTO05_FORCED_ROLLBACK";
          throw forced;
        }
        await callProcedure(database, "sp_media_register_playable", [
          desired.playable.id,
          mutation.assetId,
          desired.source.id,
          desired.playable.kind,
          desired.playable.provider,
          desired.playable.role,
          desired.playable.availability,
          desired.playable.storage_scope,
          desired.playable.storage_key,
          desired.playable.location_url,
          desired.playable.embed_video_id,
          desired.asset.default_playable_id === desired.playable.id ? 1 : 0,
          {
            playable: desired.playable.provenance_json,
            source: {
              kind: desired.source.kind,
              provider: desired.source.provider,
              transport: desired.source.transport,
              role: desired.source.role,
              mimeType: desired.source.mime_type,
              originUrl: desired.source.origin_url,
              origin: desired.source.origin_json,
              provenance: desired.source.provenance_json
            },
            metadata: desired.metadata ? {
              analysisStatus: desired.metadata.analysis_status,
              mimeType: desired.metadata.mime_type,
              durationMs: desired.metadata.duration_ms,
              sizeBytes: desired.metadata.size_bytes,
              sha256: desired.metadata.sha256,
              width: desired.metadata.width,
              height: desired.metadata.height,
              frameRate: desired.metadata.frame_rate,
              videoCodec: desired.metadata.video_codec,
              audioCodec: desired.metadata.audio_codec,
              hasAudio: desired.metadata.has_audio,
              analyzer: desired.metadata.analyzer,
              analyzerVersion: desired.metadata.analyzer_version,
              error: desired.metadata.error_text
            } : null
          }
        ]);
        statementCount += 1;
        await executeMutation({
          sql: "UPDATE `data_projection_metadata` SET `source_updated_at_utc` = ? WHERE `document_key` = 'media-library'",
          values: [sqlTimestamp(mutation.updatedAt)]
        });

        const resultingTables = await readCanonicalTablesWithProcedures(database);
        const expectedDeltas = new Map([
          ["media_sources", 1],
          ["media_playables", 1],
          ["media_playable_metadata", desired.metadata ? 1 : 0]
        ]);
        for (const [table] of READ_TABLES) {
          const delta = resultingTables[table].length - beforeTables[table].length;
          if (delta !== (expectedDeltas.get(table) || 0)) {
            const error = new Error(`La cardinalité de ${table} a changé hors du périmètre ciblé.`);
            error.code = "PROTO05_TARGETED_WRITE_SCOPE_VIOLATION";
            throw error;
          }
        }
        for (const [table, wanted, key] of [
          ["media_sources", desired.source, mutation.source.id],
          ["media_playables", desired.playable, mutation.playable.id],
          ["media_playable_metadata", desired.metadata, mutation.playable.id]
        ]) {
          if (!wanted) continue;
          const primaryKey = table === "media_playable_metadata" ? "playable_id" : "id";
          const actual = resultingTables[table].find(row => row[primaryKey] === key);
          if (!actual || rowChanged(actual, wanted)) {
            const error = new Error(`La relecture ciblée de ${table} diverge.`);
            error.code = "PROTO05_TARGETED_WRITE_RECONCILIATION_FAILED";
            throw error;
          }
        }
        const resultingSnapshot = projectMariaDbSnapshotForApplication(
          mapMariaDbTablesToSnapshot(resultingTables)
        );
        await database.commit();
        transactionStarted = false;
        return {
          operation: "media-working-copy",
          statements: statementCount,
          cardinalityDeltas: Object.fromEntries(expectedDeltas),
          snapshot: resultingSnapshot
        };
      } catch (error) {
        if (transactionStarted) {
          try { await database.rollback(); } catch {}
          transactionStarted = false;
        }
        if (error?.code === "PROTO05_FORCED_ROLLBACK") throw error;
        const wrapped = new Error("Création transactionnelle de la copie de travail impossible.");
        wrapped.code = error?.code?.startsWith("PROTO05_TARGETED_")
          ? error.code
          : "PROTO05_MARIADB_WRITE_FAILED";
        wrapped.reasonCode = error?.code || "MARIA_TARGETED_TRANSACTION_ERROR";
        throw wrapped;
      } finally {
        try { await database.query("SET @proto05_runtime_transaction = NULL"); } catch {}
        if (lockAcquired) {
          try { await database.query("SELECT RELEASE_LOCK('proto05_transactional_write')"); } catch {}
        }
        await database.end();
      }
    },
    async close() {}
  });
}

module.exports = {
  assertApplicationGrants,
  createMariaDbWriteAdapter,
  tablePlan
};
