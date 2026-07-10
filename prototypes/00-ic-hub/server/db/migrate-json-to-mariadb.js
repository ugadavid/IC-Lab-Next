const fs = require("node:fs/promises");
const path = require("node:path");
const { getPool, testConnection, dbConfig } = require("./db");
const mariaDbStore = require("../stores/mariadbStore");
const modelMetadataEnrichment = require("../ai/modelMetadataEnrichment");

const SERVER_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(SERVER_DIR, "data");
const dryRun = process.argv.includes("--dry-run");
const DEFAULT_PROTO06_AI_CONFIG_ID = "aicfg_proto06_scripted_browser_voice";

const files = {
  users: "users.json",
  sessions: "sessions.json",
  courses: "courses.json",
  enrollments: "enrollments.json",
  assignments: "course-activities.json",
  prototypes: "prototypes.json",
  runs: "runs.json",
  institutions: "institutions.json",
  ownership: "activity-ownership.json",
  sharingSpaces: "sharing-spaces.json",
  aiConfigs: "ai-configs.json",
  aiProviders: "ai-providers.json",
  aiModels: "ai-models.json",
  aiModelMetadata: "ai-model-metadata.json"
};

async function readJsonStore(name) {
  const file = path.join(DATA_DIR, files[name]);
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    console.warn(`[migrate] skipped ${files[name]}: ${error.message}`);
    if (name === "users") return { users: [] };
    if (name === "sessions") return { sessions: [] };
    if (name === "courses") return { courses: [] };
    if (name === "enrollments") return { enrollments: [] };
    if (name === "assignments") return { assignments: [] };
    if (name === "prototypes") return { prototypes: [] };
    if (name === "runs") return { runs: [] };
    if (name === "institutions") return { institutions: [] };
    if (name === "ownership") return { records: [] };
    if (name === "sharingSpaces") return { spaces: [] };
    if (name === "aiConfigs") return { configs: [], activityConfigs: [] };
    if (name === "aiProviders") return { providers: [] };
    if (name === "aiModels") return { models: [] };
    if (name === "aiModelMetadata") return { metadata: [] };
    return {};
  }
}

async function executeSchema() {
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  if (dryRun) {
    console.log("[dry-run] schema.sql would be executed.");
    return;
  }
  await getPool().query(schema);
  console.log("[migrate] schema.sql executed.");
}

function splitSqlScript(script) {
  const statements = [];
  let delimiter = ";";
  let buffer = "";
  for (const line of script.split(/\r?\n/)) {
    const delimiterMatch = line.match(/^\s*DELIMITER\s+(.+)\s*$/i);
    if (delimiterMatch) {
      if (buffer.trim()) {
        statements.push(buffer.trim());
        buffer = "";
      }
      delimiter = delimiterMatch[1];
      continue;
    }

    buffer += `${line}\n`;
    if (buffer.trimEnd().endsWith(delimiter)) {
      const end = buffer.lastIndexOf(delimiter);
      const statement = buffer.slice(0, end).trim();
      if (statement) statements.push(statement);
      buffer = "";
    }
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function executeProcedures() {
  const file = path.join(__dirname, "procedures.sql");
  const procedures = await fs.readFile(file, "utf8");
  if (dryRun) {
    console.log("[dry-run] procedures.sql would be executed.");
    return;
  }
  const pool = getPool();
  for (const statement of splitSqlScript(procedures)) {
    await pool.query(statement);
  }
  console.log("[migrate] procedures.sql executed.");
}

async function countRows() {
  const pool = getPool();
  const tables = [
    "users",
    "sessions",
    "institutions",
    "courses",
    "enrollments",
    "prototypes",
    "course_activities",
    "activity_ownership",
    "sharing_spaces",
    "ai_configs",
    "activity_ai_config",
    "ai_providers",
    "ai_models",
    "runs",
    "run_events"
  ];
  const counts = {};
  for (const table of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
    counts[table] = rows[0].count;
  }
  return counts;
}

async function main() {
  const config = dbConfig();
  console.log(`[migrate] target ${config.user}@${config.host}:${config.port}/${config.database}`);
  await testConnection();
  console.log("[migrate] MariaDB connection OK.");
  await executeSchema();
  await executeProcedures();

  const stores = {};
  for (const name of Object.keys(files)) {
    stores[name] = await readJsonStore(name);
    console.log(`[migrate] loaded ${files[name]}`);
  }
  stores.assignments.assignments = (stores.assignments.assignments || []).map((assignment) => ({
    ...assignment,
    aiConfigId: assignment.aiConfigId || (assignment.prototypeId === "proto06" ? DEFAULT_PROTO06_AI_CONFIG_ID : null)
  }));
  stores.aiModels.models = modelMetadataEnrichment.enrichModels(stores.aiModels.models || [], stores.aiModelMetadata || {});

  if (dryRun) {
    console.log("[dry-run] no rows written.");
    console.log(JSON.stringify({
      users: stores.users.users?.length || 0,
      courses: stores.courses.courses?.length || 0,
      institutions: stores.institutions.institutions?.length || 0,
      ownership: stores.ownership.records?.length || 0,
      runs: stores.runs.runs?.length || 0,
      aiConfigs: stores.aiConfigs.configs?.length || 0,
      aiProviders: stores.aiProviders.providers?.length || 0,
      aiModels: stores.aiModels.models?.length || 0,
      aiModelMetadata: stores.aiModelMetadata.metadata?.length || 0
    }, null, 2));
    return;
  }

  const order = [
    "institutions",
    "users",
    "sessions",
    "courses",
    "enrollments",
    "prototypes",
    "assignments",
    "ownership",
    "sharingSpaces",
    "aiProviders",
    "aiModels",
    "aiConfigs",
    "runs"
  ];
  for (const name of order) {
    await mariaDbStore.writeStore(name, stores[name]);
    console.log(`[migrate] upserted ${name}`);
  }

  console.log("[migrate] complete.");
  console.log(JSON.stringify(await countRows(), null, 2));
}

main()
  .catch((error) => {
    console.error(`[migrate] failed: ${error.stack || error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getPool().end();
    } catch {}
  });
