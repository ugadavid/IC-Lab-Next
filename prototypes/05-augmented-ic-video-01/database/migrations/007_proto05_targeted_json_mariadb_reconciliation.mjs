#!/usr/bin/env node
"use strict";

import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  deterministicResult,
  stableStringify
} from "./001_proto05_json_to_mariadb_dry_run.mjs";
import { assertExplicitHistoricalTestDatabase } from "./historical-test-database-guard.mjs";

const require = createRequire(import.meta.url);
const SCRIPT_FILE = fileURLToPath(import.meta.url);
const PROTOTYPE_DIRECTORY = path.resolve(path.dirname(SCRIPT_FILE), "../..");
const { assertApplicationGrants } = require("../../server/proto05-mariadb-write");
const { compareCanonical } = require("../../server/proto05-canonical-compare");
const { projectCanonicalLibrary } = require("../../server/media-library-runtime");
const {
  READ_TABLES,
  mapMariaDbTablesToSnapshot,
  projectMariaDbSnapshotForApplication
} = require("../../server/proto05-mariadb-readonly");
const EDITORIAL_ASSET_IDS = Object.freeze([
  "media-proto05-anonymized-ce9376fcd4b7758691dfc4a6",
  "media-proto05-remote-ref-03738b8065e1866b8e956819"
]);
const UGA_ASSET_ID = "media-proto05-video-proto05-uga-37004";
const LOCK_NAME = "proto05_targeted_reconciliation_145_1";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function databaseValue(value) {
  if (value === undefined) return null;
  if (value && typeof value === "object") return JSON.stringify(value);
  return value;
}

function normalizedValue(value) {
  if (value instanceof Date) return value.toISOString().replace("T", " ").replace("Z", "");
  if (typeof value === "string") {
    try { return stableStringify(JSON.parse(value)); } catch {}
  }
  if (value && typeof value === "object") return stableStringify(value);
  return value;
}

function valuesEqual(actual, desired) {
  if (desired && typeof desired === "object") {
    if (actual === null || actual === undefined) return false;
    try {
      const parsed = typeof actual === "string" ? JSON.parse(actual) : actual;
      return stableStringify(parsed) === stableStringify(desired);
    } catch {
      return false;
    }
  }
  if (typeof desired === "number" && actual !== null && actual !== undefined) {
    return Number(actual) === desired;
  }
  return normalizedValue(actual) === normalizedValue(desired);
}

function assertRowMatches(actual, desired, label) {
  if (!actual) throw Object.assign(new Error(`${label} absent après réconciliation.`), { code: "RECONCILIATION_MISSING" });
  for (const [column, value] of Object.entries(desired)) {
    if (!valuesEqual(actual[column], value)) {
      throw Object.assign(new Error(`${label}.${column} diverge après réconciliation.`), {
        code: "RECONCILIATION_VALUE_MISMATCH"
      });
    }
  }
}

function tableRows(model, table) {
  return model.tables.get(table).rows.map(entry => entry.data);
}

async function hashFile(file) {
  const hash = crypto.createHash("sha256");
  const input = fsSync.createReadStream(file);
  for await (const chunk of input) hash.update(chunk);
  return hash.digest("hex");
}

async function buildPlan() {
  const libraryFile = path.join(PROTOTYPE_DIRECTORY, "data", "video-library.json");
  const libraryBytes = await fs.readFile(libraryFile);
  const library = JSON.parse(libraryBytes.toString("utf8"));
  const editorialAssets = EDITORIAL_ASSET_IDS.map(id => library.assets.find(asset => asset.id === id));
  if (editorialAssets.some(asset => !asset || !Object.prototype.hasOwnProperty.call(asset, "editorialMetadata"))) {
    throw Object.assign(new Error("Une fiche Vidéo++ ciblée est absente ou ne possède pas editorialMetadata."), {
      code: "TARGET_EDITORIAL_AMBIGUOUS"
    });
  }
  const ugaAsset = library.assets.find(asset => asset.id === UGA_ASSET_ID);
  const workingPlayables = library.playables.filter(playable => (
    playable.assetId === UGA_ASSET_ID
    && playable.kind === "local-file"
    && playable.role === "working-copy"
    && playable.provenance?.creationType === "remote-copy"
  ));
  if (!ugaAsset || workingPlayables.length !== 1) {
    throw Object.assign(new Error("La copie locale UGA ciblée ne possède pas une identité unique."), {
      code: "TARGET_WORKING_COPY_AMBIGUOUS"
    });
  }
  const playable = workingPlayables[0];
  const source = library.sources.find(item => item.id === playable.sourceId && item.assetId === UGA_ASSET_ID);
  const sourcePlayableId = playable.provenance?.sourcePlayableId;
  const parentPlayable = library.playables.find(item => item.id === sourcePlayableId && item.assetId === UGA_ASSET_ID);
  if (
    !source
    || source.role !== "working-copy"
    || source.provenance?.sourcePlayableId !== sourcePlayableId
    || !parentPlayable
    || playable.location?.storageScope !== "workspace"
    || typeof playable.location?.storageKey !== "string"
    || !/^[a-f0-9]{64}$/.test(playable.technicalMetadata?.sha256 || "")
  ) {
    throw Object.assign(new Error("La filiation ou la localisation de la copie UGA est ambiguë."), {
      code: "TARGET_WORKING_COPY_LINEAGE_INVALID"
    });
  }
  const storageRoot = path.resolve(PROTOTYPE_DIRECTORY, "data", "video-library-workspaces");
  const physicalFile = path.resolve(storageRoot, playable.location.storageKey);
  if (!physicalFile.startsWith(`${storageRoot}${path.sep}`)) {
    throw Object.assign(new Error("Le fichier UGA sort du workspace autorisé."), { code: "TARGET_FILE_PATH_INVALID" });
  }
  const stat = await fs.stat(physicalFile).catch(() => null);
  if (!stat?.isFile()) throw Object.assign(new Error("Le fichier UGA ciblé est absent."), { code: "TARGET_FILE_MISSING" });
  const physicalSha256 = await hashFile(physicalFile);
  if (
    physicalSha256 !== playable.technicalMetadata.sha256
    || stat.size !== playable.technicalMetadata.sizeBytes
  ) {
    throw Object.assign(new Error("Le fichier UGA ne correspond pas à ses métadonnées JSON."), {
      code: "TARGET_FILE_WITNESS_MISMATCH"
    });
  }

  const { result, model } = deterministicResult(PROTOTYPE_DIRECTORY);
  const unrelatedKnownBlockers = new Set([
    "activities[].videoRef.assetId",
    "activities[].videoRef.playableId",
    "activities[].videoRef.schemaVersion"
  ]);
  const relevantBlockers = result.diagnostics.filter(diagnostic =>
    diagnostic.severity === "blocker"
    && !(
      diagnostic.code === "UNMAPPED_SOURCE_FIELD"
      && diagnostic.context?.source === "activities"
      && unrelatedKnownBlockers.has(diagnostic.context?.fieldPath)
    )
  );
  if (relevantBlockers.length) {
    throw Object.assign(new Error(`Le dry-run déterministe contient ${relevantBlockers.length} blocage(s) pertinent(s).`), {
      code: "DETERMINISTIC_MODEL_BLOCKED"
    });
  }
  const assetRows = tableRows(model, "media_assets");
  const sourceRow = tableRows(model, "media_sources").find(row => row.id === source.id);
  const playableRow = tableRows(model, "media_playables").find(row => row.id === playable.id);
  const metadataRow = tableRows(model, "media_playable_metadata")
    .find(row => row.playable_id === playable.id);
  const editorialRows = EDITORIAL_ASSET_IDS.map(id => assetRows.find(row => row.id === id));
  const ugaAssetRow = assetRows.find(row => row.id === UGA_ASSET_ID);
  if (!sourceRow || !playableRow || !metadataRow || !ugaAssetRow || editorialRows.some(row => !row)) {
    throw Object.assign(new Error("Le modèle déterministe ne produit pas toutes les lignes ciblées."), {
      code: "TARGET_ROWS_NOT_PRODUCED"
    });
  }
  const plan = {
    sourceJsonSha256: sha256(libraryBytes),
    sourceBundleHash: result.sourceBundleHash,
    deterministicHash: result.deterministicHash,
    documentUpdatedAt: library.updatedAt,
    editorialRows,
    ugaAssetRow,
    sourceRow,
    playableRow,
    metadataRow,
    physical: {
      storageKey: playable.location.storageKey,
      sizeBytes: stat.size,
      sha256: physicalSha256
    },
    lineage: {
      assetId: UGA_ASSET_ID,
      sourcePlayableId,
      sourceId: source.id,
      playableId: playable.id
    }
  };
  return Object.freeze({
    ...plan,
    planHash: sha256(stableStringify(plan))
  });
}

function configuration(databaseName) {
  const required = key => {
    const value = process.env[key];
    if (!value) throw Object.assign(new Error(`Configuration absente : ${key}.`), { code: "CONFIGURATION_MISSING" });
    return value;
  };
  return {
    host: required("PROTO05_MARIADB_HOST"),
    port: Number(required("PROTO05_MARIADB_PORT")),
    user: required("PROTO05_MARIADB_USER"),
    password: required("PROTO05_MARIADB_PASSWORD"),
    database: databaseName
  };
}

function mysqlClient() {
  const configured = process.env.PROTO05_MYSQL2_DIRECTORY;
  const modulePath = configured
    ? path.resolve(configured)
    : path.resolve(PROTOTYPE_DIRECTORY, "../00-ic-hub/server/node_modules/mysql2/promise");
  return require(modulePath);
}

async function openDatabase(options) {
  const config = configuration(options.database);
  const database = await mysqlClient().createConnection({
    ...config,
    charset: "utf8mb4",
    dateStrings: true,
    decimalNumbers: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: false
  });
  await database.query("SET SESSION time_zone = '+00:00'");
  const [[identity]] = await database.query("SELECT CURRENT_USER() AS account, DATABASE() AS database_name");
  if (identity.database_name !== config.database || !String(identity.account || "").startsWith(`${config.user}@`)) {
    await database.end();
    throw Object.assign(new Error("L’identité MariaDB ne correspond pas à la cible configurée."), {
      code: "DATABASE_IDENTITY_MISMATCH"
    });
  }
  const [grants] = await database.query("SHOW GRANTS");
  assertApplicationGrants(grants, config);
  return { database, identity };
}

async function readWitness(database, plan) {
  const [assets] = await database.query(
    "SELECT * FROM `media_assets` WHERE `id` IN (?, ?, ?) ORDER BY `id`",
    [...EDITORIAL_ASSET_IDS, UGA_ASSET_ID]
  );
  const [sources] = await database.query(
    "SELECT * FROM `media_sources` WHERE `id` = ?",
    [plan.sourceRow.id]
  );
  const [playables] = await database.query(
    "SELECT * FROM `media_playables` WHERE `id` = ?",
    [plan.playableRow.id]
  );
  const [metadata] = await database.query(
    "SELECT * FROM `media_playable_metadata` WHERE `playable_id` = ?",
    [plan.metadataRow.playable_id]
  );
  const [sourcePlayable] = await database.query(
    "SELECT `id`, `asset_id`, `removed_at` FROM `media_playables` WHERE `id` = ?",
    [plan.lineage.sourcePlayableId]
  );
  const [[counts]] = await database.query(
    "SELECT "
      + "(SELECT COUNT(*) FROM `media_assets`) AS assets, "
      + "(SELECT COUNT(*) FROM `media_sources`) AS sources, "
      + "(SELECT COUNT(*) FROM `media_playables`) AS playables, "
      + "(SELECT COUNT(*) FROM `media_playable_metadata`) AS metadata"
  );
  const [documentMetadata] = await database.query(
    "SELECT * FROM `data_projection_metadata` WHERE `document_key` = 'media-library'"
  );
  return {
    counts,
    assets,
    sources,
    playables,
    metadata,
    sourcePlayable,
    documentMetadata
  };
}

function assertBeforeState(witness, plan) {
  if (witness.assets.length !== 3) {
    throw Object.assign(new Error("Les trois assets ciblés ne sont pas présents en MariaDB."), { code: "TARGET_ASSET_MISSING" });
  }
  for (const id of EDITORIAL_ASSET_IDS) {
    const row = witness.assets.find(asset => asset.id === id);
    if (row.description !== null || row.editorial_metadata_json !== null) {
      throw Object.assign(new Error(`La fiche ${id} n’est plus dans l’état préalable attendu.`), {
        code: "EDITORIAL_TARGET_ALREADY_CHANGED"
      });
    }
  }
  const ugaAsset = witness.assets.find(asset => asset.id === UGA_ASSET_ID);
  if (ugaAsset.deleted_at !== null || witness.sources.length || witness.playables.length || witness.metadata.length) {
    throw Object.assign(new Error("La cible UGA est supprimée ou la copie existe déjà en MariaDB."), {
      code: "WORKING_COPY_TARGET_ALREADY_CHANGED"
    });
  }
  if (
    witness.sourcePlayable.length !== 1
    || witness.sourcePlayable[0].asset_id !== UGA_ASSET_ID
    || witness.sourcePlayable[0].removed_at !== null
  ) {
    throw Object.assign(new Error("Le playable HLS parent est absent ou n’appartient pas à l’asset UGA."), {
      code: "SOURCE_PLAYABLE_INVALID"
    });
  }
  if (witness.documentMetadata.length !== 1) {
    throw Object.assign(new Error("Le témoin documentaire media-library est absent."), {
      code: "DOCUMENT_METADATA_MISSING"
    });
  }
  for (const desired of plan.editorialRows) {
    const current = witness.assets.find(asset => asset.id === desired.id);
    if (normalizedValue(current.updated_at) !== normalizedValue(desired.updated_at)) {
      throw Object.assign(new Error(`L’horodatage préalable de ${desired.id} a dérivé.`), {
        code: "EDITORIAL_TIMESTAMP_DRIFT"
      });
    }
  }
}

function assertAfterState(before, after, plan) {
  const deltas = {
    assets: Number(after.counts.assets) - Number(before.counts.assets),
    sources: Number(after.counts.sources) - Number(before.counts.sources),
    playables: Number(after.counts.playables) - Number(before.counts.playables),
    metadata: Number(after.counts.metadata) - Number(before.counts.metadata)
  };
  if (stableStringify(deltas) !== stableStringify({ assets: 0, metadata: 1, playables: 1, sources: 1 })) {
    throw Object.assign(new Error(`Cardinalités inattendues : ${stableStringify(deltas)}.`), {
      code: "CARDINALITY_MISMATCH"
    });
  }
  for (const desired of plan.editorialRows) {
    assertRowMatches(
      after.assets.find(asset => asset.id === desired.id),
      {
        id: desired.id,
        description: desired.description,
        editorial_metadata_json: desired.editorial_metadata_json,
        updated_at: desired.updated_at
      },
      `media_assets.${desired.id}`
    );
  }
  assertRowMatches(
    after.assets.find(asset => asset.id === UGA_ASSET_ID),
    { id: UGA_ASSET_ID, updated_at: plan.ugaAssetRow.updated_at },
    `media_assets.${UGA_ASSET_ID}`
  );
  assertRowMatches(after.sources[0], plan.sourceRow, `media_sources.${plan.sourceRow.id}`);
  assertRowMatches(after.playables[0], plan.playableRow, `media_playables.${plan.playableRow.id}`);
  assertRowMatches(after.metadata[0], plan.metadataRow, `media_playable_metadata.${plan.metadataRow.playable_id}`);
  assertRowMatches(
    after.documentMetadata[0],
    {
      document_key: "media-library",
      source_updated_at_utc: plan.documentUpdatedAt.replace("T", " ").replace("Z", "")
    },
    "data_projection_metadata.media-library"
  );
}

function assertReconciledState(witness, plan) {
  for (const desired of plan.editorialRows) {
    assertRowMatches(
      witness.assets.find(asset => asset.id === desired.id),
      {
        id: desired.id,
        description: desired.description,
        editorial_metadata_json: desired.editorial_metadata_json,
        updated_at: desired.updated_at
      },
      `media_assets.${desired.id}`
    );
  }
  assertRowMatches(
    witness.assets.find(asset => asset.id === UGA_ASSET_ID),
    { id: UGA_ASSET_ID, updated_at: plan.ugaAssetRow.updated_at },
    `media_assets.${UGA_ASSET_ID}`
  );
  assertRowMatches(witness.sources[0], plan.sourceRow, `media_sources.${plan.sourceRow.id}`);
  assertRowMatches(witness.playables[0], plan.playableRow, `media_playables.${plan.playableRow.id}`);
  assertRowMatches(witness.metadata[0], plan.metadataRow, `media_playable_metadata.${plan.metadataRow.playable_id}`);
  assertRowMatches(
    witness.documentMetadata[0],
    {
      document_key: "media-library",
      source_updated_at_utc: plan.documentUpdatedAt.replace("T", " ").replace("Z", "")
    },
    "data_projection_metadata.media-library"
  );
}

function assertRepairableProjectionDrift(witness, plan) {
  const playable = witness.playables[0];
  if (
    witness.playables.length !== 1
    || !(
      playable.availability === "missing-local"
      && playable.availability_reason === "missing-file"
      || playable.availability === plan.playableRow.availability
      && playable.availability_reason === plan.playableRow.availability_reason
      && normalizedValue(playable.updated_at) !== normalizedValue(plan.playableRow.updated_at)
    )
  ) {
    throw Object.assign(new Error("L’état MariaDB ne correspond pas à la dérive de disponibilité démontrée."), {
      code: "UNEXPECTED_REPAIR_STATE"
    });
  }
  const normalized = structuredClone(witness);
  normalized.playables[0].availability = plan.playableRow.availability;
  normalized.playables[0].availability_reason = plan.playableRow.availability_reason;
  normalized.playables[0].updated_at = plan.playableRow.updated_at;
  assertReconciledState(normalized, plan);
}

function insertCommand(table, row) {
  const columns = Object.keys(row);
  return {
    sql: `INSERT INTO \`${table}\` (${columns.map(column => `\`${column}\``).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    values: columns.map(column => databaseValue(row[column]))
  };
}

async function executeTargetedTransaction(database, before, plan, { rollbackProof }) {
  const [[lock]] = await database.query("SELECT GET_LOCK(?, 10) AS acquired", [LOCK_NAME]);
  if (Number(lock.acquired) !== 1) throw Object.assign(new Error("Verrou de réconciliation indisponible."), { code: "LOCK_UNAVAILABLE" });
  try {
    await database.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await database.beginTransaction();
    const [lockedAssets] = await database.query(
      "SELECT `id`, `description`, `editorial_metadata_json`, `updated_at`, `deleted_at` "
        + "FROM `media_assets` WHERE `id` IN (?, ?, ?) ORDER BY `id` FOR UPDATE",
      [...EDITORIAL_ASSET_IDS, UGA_ASSET_ID]
    );
    if (lockedAssets.length !== 3) throw Object.assign(new Error("Verrouillage incomplet des assets ciblés."), { code: "LOCKED_TARGET_MISSING" });
    const [lockedSourcePlayable] = await database.query(
      "SELECT `id`, `asset_id`, `removed_at` FROM `media_playables` WHERE `id` = ? FOR UPDATE",
      [plan.lineage.sourcePlayableId]
    );
    if (
      lockedSourcePlayable.length !== 1
      || lockedSourcePlayable[0].asset_id !== UGA_ASSET_ID
      || lockedSourcePlayable[0].removed_at !== null
    ) {
      throw Object.assign(new Error("Le playable parent a dérivé avant l’écriture."), { code: "LOCKED_SOURCE_PLAYABLE_INVALID" });
    }

    for (const desired of plan.editorialRows) {
      const current = before.assets.find(asset => asset.id === desired.id);
      const [result] = await database.query(
        "UPDATE `media_assets` SET `description` = ?, `editorial_metadata_json` = ?, `updated_at` = ? "
          + "WHERE `id` = ? AND `description` IS NULL AND `editorial_metadata_json` IS NULL AND `updated_at` <=> ?",
        [
          desired.description,
          databaseValue(desired.editorial_metadata_json),
          desired.updated_at,
          desired.id,
          current.updated_at
        ]
      );
      if (result.affectedRows !== 1) {
        throw Object.assign(new Error(`Précondition d’écriture refusée pour ${desired.id}.`), {
          code: "TARGET_UPDATE_PRECONDITION_FAILED"
        });
      }
    }

    for (const [table, row] of [
      ["media_sources", plan.sourceRow],
      ["media_playables", plan.playableRow],
      ["media_playable_metadata", plan.metadataRow]
    ]) {
      const command = insertCommand(table, row);
      await database.query(command.sql, command.values);
    }
    const currentUga = before.assets.find(asset => asset.id === UGA_ASSET_ID);
    const [assetUpdate] = await database.query(
      "UPDATE `media_assets` SET `updated_at` = ? WHERE `id` = ? AND `deleted_at` IS NULL AND `updated_at` <=> ?",
      [plan.ugaAssetRow.updated_at, UGA_ASSET_ID, currentUga.updated_at]
    );
    if (assetUpdate.affectedRows !== 1) {
      throw Object.assign(new Error("L’asset UGA a dérivé avant sa mise à jour."), { code: "UGA_ASSET_PRECONDITION_FAILED" });
    }
    const [metadataUpdate] = await database.query(
      "UPDATE `data_projection_metadata` SET `source_updated_at_utc` = ? "
        + "WHERE `document_key` = 'media-library' AND `source_updated_at_utc` <=> ?",
      [
        plan.documentUpdatedAt.replace("T", " ").replace("Z", ""),
        before.documentMetadata[0].source_updated_at_utc
      ]
    );
    if (metadataUpdate.affectedRows !== 1) {
      throw Object.assign(new Error("Le témoin documentaire a dérivé avant sa mise à jour."), {
        code: "DOCUMENT_METADATA_PRECONDITION_FAILED"
      });
    }
    const after = await readWitness(database, plan);
    assertAfterState(before, after, plan);
    if (rollbackProof) {
      const forced = new Error("Rollback contrôlé demandé avant commit.");
      forced.code = "CONTROLLED_ROLLBACK";
      throw forced;
    }
    await database.commit();
    return after;
  } catch (error) {
    try { await database.rollback(); } catch {}
    throw error;
  } finally {
    try { await database.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]); } catch {}
  }
}

async function repairAvailabilityProjection(database, before, plan) {
  const [[lock]] = await database.query("SELECT GET_LOCK(?, 10) AS acquired", [LOCK_NAME]);
  if (Number(lock.acquired) !== 1) throw Object.assign(new Error("Verrou de réconciliation indisponible."), { code: "LOCK_UNAVAILABLE" });
  try {
    await database.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await database.beginTransaction();
    const [update] = await database.query(
      "UPDATE `media_playables` SET `availability` = ?, `availability_reason` = ?, `updated_at` = ? "
        + "WHERE `id` = ? AND `availability` = ? AND `availability_reason` <=> ? AND `updated_at` <=> ?",
      [
        plan.playableRow.availability,
        plan.playableRow.availability_reason,
        plan.playableRow.updated_at,
        plan.playableRow.id,
        before.playables[0].availability,
        before.playables[0].availability_reason,
        before.playables[0].updated_at
      ]
    );
    if (update.affectedRows !== 1) {
      throw Object.assign(new Error("La disponibilité ciblée a dérivé avant sa correction."), {
        code: "AVAILABILITY_REPAIR_PRECONDITION_FAILED"
      });
    }
    await database.commit();
  } catch (error) {
    try { await database.rollback(); } catch {}
    throw error;
  } finally {
    try { await database.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]); } catch {}
  }
}

async function writeBackup(file, payload) {
  const absolute = path.resolve(file);
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(absolute, body, { encoding: "utf8", flag: "wx" });
  const parsed = JSON.parse(await fs.readFile(absolute, "utf8"));
  if (parsed.planHash !== payload.planHash) throw new Error("La sauvegarde ciblée n’est pas relisible.");
  return { file: absolute, sha256: sha256(body) };
}

async function compareLiveProjectionAll(database) {
  const json = file => JSON.parse(fsSync.readFileSync(file, "utf8"));
  const languageCatalog = json(path.resolve(PROTOTYPE_DIRECTORY, "..", "..", "shared", "reference-data", "languages.json"));
  const source = {
    activities: json(path.join(PROTOTYPE_DIRECTORY, "data", "activities.json")),
    activityLibrary: json(path.join(PROTOTYPE_DIRECTORY, "data", "activity-library.json")),
    languageCatalog: { languages: languageCatalog.languages },
    videoCatalog: json(path.join(PROTOTYPE_DIRECTORY, "data", "video-catalog.json")),
    videoLibrary: json(path.join(PROTOTYPE_DIRECTORY, "data", "video-library.json"))
  };
  const tables = {};
  for (const [table, orderBy, where] of READ_TABLES) {
    const sql = `SELECT * FROM \`${table}\`${where ? ` WHERE ${where}` : ""} ORDER BY ${orderBy}`;
    const [rows] = await database.query(sql);
    tables[table] = rows;
  }
  const mapped = mapMariaDbTablesToSnapshot(tables);
  const canonical = compareCanonical(source, mapped, {
    operation: "mission-145.1-canonical",
    maxDifferences: 1000
  });
  const application = compareCanonical(
    { ...source, videoLibrary: projectCanonicalLibrary(source.videoLibrary) },
    projectMariaDbSnapshotForApplication(mapped),
    { operation: "mission-145.1-application", maxDifferences: 1000 }
  );
  if (canonical.total || application.total) {
    const error = new Error(`La comparaison conserve ${canonical.total}/${application.total} divergence(s).`);
    error.code = "LIVE_COMPARISON_FAILED";
    error.diagnostics = {
      canonical: canonical.differences.slice(0, 100),
      application: application.differences.slice(0, 100)
    };
    throw error;
  }
  return { applicationDifferences: application.total, canonicalDifferences: canonical.total };
}

function parseArguments(args) {
  const options = { mode: "inspect", expectedPlanHash: null, backup: null, database: null };
  let explicitDatabase = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--inspect") options.mode = "inspect";
    else if (argument === "--compare") options.mode = "compare";
    else if (argument === "--compare-all") options.mode = "compare-all";
    else if (argument === "--verify") options.mode = "verify";
    else if (argument === "--repair-projection-drift") options.mode = "repair-projection-drift";
    else if (argument === "--rollback-proof") options.mode = "rollback-proof";
    else if (argument === "--apply") options.mode = "apply";
    else if (argument === "--expected-plan-hash") options.expectedPlanHash = args[++index];
    else if (argument === "--backup") options.backup = args[++index];
    else if (argument === "--database") { options.database = args[++index]; explicitDatabase = true; }
    else if (argument.startsWith("--database=")) { options.database = argument.slice("--database=".length); explicitDatabase = true; }
    else throw new Error(`Argument inconnu : ${argument}`);
  }
  options.database = assertExplicitHistoricalTestDatabase(options.database, { explicit: explicitDatabase });
  if (!["compare", "compare-all", "inspect", "verify"].includes(options.mode) && !options.backup) throw new Error("--backup est obligatoire avant toute transaction.");
  if (["apply", "repair-projection-drift"].includes(options.mode) && !options.expectedPlanHash) {
    throw new Error("--expected-plan-hash est obligatoire avec cette écriture.");
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const plan = await buildPlan();
  const { database, identity } = await openDatabase(options);
  try {
    if (options.mode === "compare") {
      const witness = await readWitness(database, plan);
      assertReconciledState(witness, plan);
      console.log(`TARGET_COMPARISON_OK=${stableStringify({
        differences: 0,
        database: identity.database_name,
        planHash: plan.planHash
      })}`);
      return;
    }
    if (options.mode === "compare-all") {
      const comparison = await compareLiveProjectionAll(database);
      console.log(`LIVE_COMPARISON_OK=${stableStringify({
        ...comparison,
        database: identity.database_name,
        planHash: plan.planHash
      })}`);
      return;
    }
    const before = await readWitness(database, plan);
    if (options.mode === "verify") {
      assertReconciledState(before, plan);
      console.log(`RECONCILIATION_VERIFIED=${stableStringify({
        counts: before.counts,
        database: identity.database_name,
        planHash: plan.planHash,
        targetRows: {
          assets: before.assets.length,
          metadata: before.metadata.length,
          playables: before.playables.length,
          sources: before.sources.length
        }
      })}`);
      return;
    }
    if (options.mode === "repair-projection-drift") {
      if (options.expectedPlanHash !== plan.planHash) {
        throw Object.assign(new Error("Le hash du plan ne correspond pas à l’autorisation."), { code: "PLAN_HASH_MISMATCH" });
      }
      assertRepairableProjectionDrift(before, plan);
      const backup = await writeBackup(options.backup, {
        planHash: plan.planHash,
        sourceJsonSha256: plan.sourceJsonSha256,
        createdAt: new Date().toISOString(),
        witness: before
      });
      console.log(`BACKUP_OK sha256=${backup.sha256}`);
      await repairAvailabilityProjection(database, before, plan);
      await database.end();
      const reopened = await openDatabase(options);
      try {
        const repaired = await readWitness(reopened.database, plan);
        assertReconciledState(repaired, plan);
        console.log(`PROJECTION_REPAIR_OK counts=${stableStringify(repaired.counts)}`);
      } finally {
        await reopened.database.end();
      }
      return;
    }
    assertBeforeState(before, plan);
    const publicPlan = {
      planHash: plan.planHash,
      sourceJsonSha256: plan.sourceJsonSha256,
      sourceBundleHash: plan.sourceBundleHash,
      deterministicHash: plan.deterministicHash,
      database: identity.database_name,
      counts: before.counts,
      editorialAssets: plan.editorialRows.map(row => ({
        id: row.id,
        description: row.description,
        editorialMetadata: row.editorial_metadata_json
      })),
      workingCopy: {
        ...plan.lineage,
        ...plan.physical
      }
    };
    console.log(`RECONCILIATION_PLAN=${stableStringify(publicPlan)}`);
    if (options.mode === "inspect") return;
    if (options.expectedPlanHash && options.expectedPlanHash !== plan.planHash) {
      throw Object.assign(new Error("Le hash du plan ne correspond pas à l’autorisation."), { code: "PLAN_HASH_MISMATCH" });
    }
    const backup = await writeBackup(options.backup, {
      planHash: plan.planHash,
      sourceJsonSha256: plan.sourceJsonSha256,
      createdAt: new Date().toISOString(),
      witness: before
    });
    console.log(`BACKUP_OK sha256=${backup.sha256}`);
    try {
      await executeTargetedTransaction(database, before, plan, {
        rollbackProof: options.mode === "rollback-proof"
      });
    } catch (error) {
      if (options.mode !== "rollback-proof" || error.code !== "CONTROLLED_ROLLBACK") throw error;
      await database.end();
      const reopened = await openDatabase(options);
      try {
        const afterRollback = await readWitness(reopened.database, plan);
        if (stableStringify(afterRollback) !== stableStringify(before)) {
          throw Object.assign(new Error("Le témoin diffère après rollback et reconnexion."), {
            code: "ROLLBACK_WITNESS_MISMATCH"
          });
        }
        console.log("ROLLBACK_PROOF_OK");
      } finally {
        await reopened.database.end();
      }
      return;
    }
    await database.end();
    const reopened = await openDatabase(options);
    try {
      const afterCommit = await readWitness(reopened.database, plan);
      assertAfterState(before, afterCommit, plan);
      console.log(`APPLY_OK counts=${stableStringify(afterCommit.counts)}`);
    } finally {
      await reopened.database.end();
    }
  } finally {
    try { await database.end(); } catch {}
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE) {
  main().catch(error => {
    console.error(`RECONCILIATION_FAILED ${error.code || "ERROR"}: ${error.message}`);
    if (error.diagnostics) console.error(`RECONCILIATION_DIAGNOSTICS=${stableStringify(error.diagnostics)}`);
    process.exitCode = 1;
  });
}

export {
  EDITORIAL_ASSET_IDS,
  UGA_ASSET_ID,
  buildPlan,
  parseArguments
};
