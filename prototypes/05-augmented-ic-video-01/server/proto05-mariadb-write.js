"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { compareCanonical } = require("./proto05-canonical-compare");
const {
  READ_TABLES,
  mapMariaDbTablesToSnapshot,
  projectMariaDbSnapshotForApplication
} = require("./proto05-mariadb-readonly");

const REQUIRED_PRIVILEGES = Object.freeze(["DELETE", "INSERT", "SELECT", "UPDATE"]);
const OPTIONAL_PRIVILEGES = new Set(["SHOW VIEW"]);
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
  const databasePrivileges = new Set();
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
  return {
    readonly: false,
    privileges: [...databasePrivileges].sort()
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

function relationshipDepth(row, rowsById, parentColumn) {
  let depth = 0;
  let cursor = row;
  const seen = new Set();
  while (cursor?.[parentColumn] && !seen.has(cursor[parentColumn])) {
    seen.add(cursor[parentColumn]);
    const parent = rowsById.get(cursor[parentColumn]);
    if (!parent || parent === cursor) break;
    depth += 1;
    cursor = parent;
  }
  return depth;
}

function sortSelfReferences(tableName, rows, descending = false) {
  const parentColumn = tableName === "media_folders"
    ? "parent_folder_id"
    : tableName === "media_assets"
      ? "parent_asset_id"
      : tableName === "activity_pedagogical_identities"
        ? "parent_activity_id"
        : null;
  if (!parentColumn) return rows;
  const idColumn = tableName === "activity_pedagogical_identities" ? "activity_id" : "id";
  const rowsById = new Map(rows.map(row => [row[idColumn], row]));
  return [...rows].sort((left, right) => {
    const difference = relationshipDepth(left, rowsById, parentColumn)
      - relationshipDepth(right, rowsById, parentColumn);
    return (descending ? -difference : difference)
      || rowKey(left, [idColumn]).localeCompare(rowKey(right, [idColumn]));
  });
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

function buildInsert(table, row, excluded = new Set()) {
  const columns = Object.keys(row).filter(column => !excluded.has(column));
  return {
    sql: `INSERT INTO \`${table}\` (${columns.map(column => `\`${column}\``).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    values: columns.map(column => databaseValue(row[column]))
  };
}

function buildUpdate(definition, row, excluded = new Set()) {
  const columns = Object.keys(row).filter(column => (
    !definition.pk.includes(column) && !excluded.has(column)
  ));
  return {
    sql: `UPDATE \`${definition.name}\` SET ${columns.map(column => `\`${column}\` = ?`).join(", ")} WHERE ${definition.pk.map(column => `\`${column}\` <=> ?`).join(" AND ")}`,
    values: [
      ...columns.map(column => databaseValue(row[column])),
      ...definition.pk.map(column => databaseValue(row[column]))
    ]
  };
}

function buildDelete(definition, row) {
  return {
    sql: `DELETE FROM \`${definition.name}\` WHERE ${definition.pk.map(column => `\`${column}\` <=> ?`).join(" AND ")}`,
    values: definition.pk.map(column => databaseValue(row[column]))
  };
}

function desiredApplicationSnapshot(snapshot) {
  return {
    activities: snapshot.activities,
    activityLibrary: snapshot.activityLibrary,
    languageCatalog: snapshot.languageCatalog,
    videoCatalog: snapshot.videoCatalog,
    videoLibrary: snapshot.videoLibrary
  };
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

  async function readTables(database, lock = false) {
    const tables = {};
    for (const [table, orderBy] of READ_TABLES) {
      const [rows] = await database.query(
        `SELECT * FROM \`${table}\` ORDER BY ${orderBy}${lock ? " FOR UPDATE" : ""}`
      );
      tables[table] = rows;
    }
    return tables;
  }

  return Object.freeze({
    async verify() {
      const database = await connection();
      try {
        const { identity, grants } = await verifyConnection(database);
        const [[probe]] = await database.query("SELECT COUNT(*) AS activity_count FROM activities WHERE deleted_at IS NULL");
        return {
          mode: "mariadb",
          account: String(identity.account),
          database: identity.database_name,
          activityCount: Number(probe.activity_count),
          ...grants
        };
      } finally {
        await database.end();
      }
    },

    async writeSnapshot(snapshot, {
      operation = "mutation",
      failAfterStatements = null
    } = {}) {
      const canonicalLibrary = snapshot.canonicalVideoLibrary;
      if (!canonicalLibrary) throw new Error("Snapshot média canonique absent de la transaction MariaDB.");
      const mapperInput = {
        activities: snapshot.activities,
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
      const database = await connection();
      let statementCount = 0;
      let lockAcquired = false;
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
        const currentTables = await readTables(database, true);
        const plans = definitions.map(definition => tablePlan(
          definition,
          currentTables[definition.name] || [],
          desiredRows[definition.name]
        ));

        const mediaPlan = plans.find(plan => plan.definition.name === "media_assets");
        for (const change of [...(mediaPlan?.updates || []), ...(mediaPlan?.deletes || []).map(current => ({ current, desired: {} }))]) {
          if (change.current.default_playable_id !== (change.desired.default_playable_id ?? null)) {
            await executeMutation({
              sql: "UPDATE `media_assets` SET `default_playable_id` = NULL WHERE `id` = ?",
              values: [change.current.id]
            });
          }
        }

        const earlyUpdates = new Map();
        const deletedActivityFolders = new Set(
          (plans.find(plan => plan.definition.name === "activity_folders")?.deletes || [])
            .map(row => row.id)
        );
        const deletedMediaFolders = new Set(
          (plans.find(plan => plan.definition.name === "media_folders")?.deletes || [])
            .map(row => row.id)
        );
        for (const plan of plans) {
          const isActivityDetachment = plan.definition.name === "activities";
          const isMediaDetachment = plan.definition.name === "media_assets";
          if (!isActivityDetachment && !isMediaDetachment) continue;
          const excluded = isMediaDetachment ? new Set(["default_playable_id"]) : new Set();
          for (const change of plan.updates) {
            const mustDetach = isActivityDetachment
              ? deletedActivityFolders.has(change.current.folder_id) && change.desired.folder_id === null
              : deletedMediaFolders.has(change.current.folder_id) && change.desired.folder_id === null;
            if (!mustDetach) continue;
            await executeMutation(buildUpdate(plan.definition, change.desired, excluded));
            earlyUpdates.set(
              plan.definition.name,
              (earlyUpdates.get(plan.definition.name) || new Set()).add(
                rowKey(change.desired, plan.definition.pk)
              )
            );
          }
        }

        for (const plan of [...plans].reverse()) {
          for (const row of sortSelfReferences(plan.definition.name, plan.deletes, true)) {
            await executeMutation(buildDelete(plan.definition, row));
          }
        }
        for (const plan of plans) {
          const excluded = plan.definition.name === "media_assets"
            ? new Set(["default_playable_id"])
            : new Set();
          for (const row of sortSelfReferences(plan.definition.name, plan.inserts)) {
            await executeMutation(buildInsert(plan.definition.name, row, excluded));
          }
        }
        for (const plan of plans) {
          const excluded = plan.definition.name === "media_assets"
            ? new Set(["default_playable_id"])
            : new Set();
          for (const { desired } of plan.updates) {
            if (earlyUpdates.get(plan.definition.name)?.has(rowKey(desired, plan.definition.pk))) {
              continue;
            }
            await executeMutation(buildUpdate(plan.definition, desired, excluded));
          }
        }
        const finalDefaultRows = [
          ...(mediaPlan?.inserts || []),
          ...(mediaPlan?.updates || [])
            .filter(change => change.current.default_playable_id !== change.desired.default_playable_id)
            .map(change => change.desired)
        ];
        for (const row of finalDefaultRows) {
          if (row.default_playable_id !== null) {
            await executeMutation({
              sql: "UPDATE `media_assets` SET `default_playable_id` = ?, `updated_at` = ? WHERE `id` = ? AND NOT (`default_playable_id` <=> ?)",
              values: [row.default_playable_id, row.updated_at, row.id, row.default_playable_id]
            });
          }
        }

        const resultingTables = await readTables(database);
        const resultingSnapshot = projectMariaDbSnapshotForApplication(
          mapMariaDbTablesToSnapshot(resultingTables)
        );
        const comparison = compareCanonical(
          desiredApplicationSnapshot(snapshot),
          resultingSnapshot,
          { operation }
        );
        if (comparison.total) {
          const error = new Error("La relecture transactionnelle diverge du snapshot demandé.");
          error.code = "PROTO05_TRANSACTION_RECONCILIATION_FAILED";
          error.differencePaths = comparison.differences.slice(0, 10).map(item => `${item.path}:${item.kind}`);
          throw error;
        }
        await database.commit();
        return {
          operation,
          statements: statementCount,
          snapshot: resultingSnapshot
        };
      } catch (error) {
        try { await database.rollback(); } catch {}
        if (error?.code === "PROTO05_FORCED_ROLLBACK") throw error;
        const wrapped = new Error("Écriture MariaDB transactionnelle impossible.");
        wrapped.code = error?.code === "SNAPSHOT_RELATIONAL_MAPPING_BLOCKED"
          ? error.code
          : "PROTO05_MARIADB_WRITE_FAILED";
        wrapped.reasonCode = error?.code || "MARIA_TRANSACTION_ERROR";
        wrapped.differencePaths = error?.differencePaths || [];
        throw wrapped;
      } finally {
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
