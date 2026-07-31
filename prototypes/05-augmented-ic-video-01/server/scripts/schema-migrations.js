"use strict";

const path = require("node:path");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const {
  createRegistryBackup,
  inspectMigrationState,
  runMigrationCommand,
  verifyDatabaseSchema,
  writeRegistryBackupExclusive
} = require("../schema-migrations");

const PROTOTYPE_DIRECTORY = path.resolve(__dirname, "..", "..");
const EXPECTED_DATABASE = "ic_augmented_video";
const COMMANDS = new Set(["inspect", "plan", "verify", "backup-registry", "baseline", "apply"]);

function parseArguments(argv) {
  const command = argv[0];
  if (!COMMANDS.has(command)) {
    throw Object.assign(new Error(
      "Commande attendue : inspect, plan, verify, backup-registry, baseline ou apply."
    ), { code: "PROTO05_MIGRATION_COMMAND_INVALID" });
  }
  const options = {};
  for (const argument of argv.slice(1)) {
    const match = /^--([a-z-]+)=(.*)$/.exec(argument);
    if (!match || Object.hasOwn(options, match[1])) {
      throw Object.assign(new Error(`Argument invalide : ${argument}`), {
        code: "PROTO05_MIGRATION_ARGUMENT_INVALID"
      });
    }
    options[match[1]] = match[2];
  }
  return { command, options };
}

function mysqlClient() {
  const configuredPath = process.env.PROTO05_MYSQL2_DIRECTORY;
  const modulePath = configuredPath
    ? path.resolve(configuredPath)
    : path.resolve(PROTOTYPE_DIRECTORY, "..", "00-ic-hub", "server", "node_modules", "mysql2", "promise");
  return require(modulePath);
}

function safeError(error) {
  const result = {
    ok: false,
    code: error?.code || "PROTO05_MIGRATION_UNEXPECTED",
    message: error?.message || "Erreur inattendue du registre de migrations."
  };
  for (const key of ["requiredMode", "requiredAction", "planHash", "migrationVersion", "completedStatements", "partialDdlPossible", "diagnostics", "comparison"]) {
    if (error?.[key] !== undefined) result[key] = error[key];
  }
  return result;
}

function stateOutput(state) {
  return {
    ok: true,
    database: state.plan.database,
    action: state.action.type,
    planHash: state.planHash,
    currentFingerprint: state.plan.currentFingerprint,
    expectedFingerprint: state.contract.latestFingerprint,
    latestVersion: state.contract.latestVersion,
    summary: state.plan.currentSummary,
    registry: state.plan.registry,
    pendingMigrations: state.plan.migrations
  };
}

async function main() {
  const { command, options: cli } = parseArguments(process.argv.slice(2));
  const config = mariadbConfigurationFromEnvironment(process.env);
  if (config.database !== EXPECTED_DATABASE) {
    throw Object.assign(new Error(
      `Ce CLI Proto05 refuse toute base autre que ${EXPECTED_DATABASE}.`
    ), { code: "PROTO05_MIGRATION_DATABASE_REFUSED" });
  }
  const database = await mysqlClient().createConnection({
    ...config,
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false,
    connectTimeout: 10_000
  });
  const runnerOptions = {
    databaseName: config.database,
    prototypeDirectory: PROTOTYPE_DIRECTORY
  };
  try {
    if (command === "verify") {
      const verification = await verifyDatabaseSchema({ database, ...runnerOptions });
      console.log(JSON.stringify({ ok: true, database: config.database, ...verification }, null, 2));
      return;
    }
    if (command === "backup-registry") {
      if (!cli.output) {
        throw Object.assign(new Error("--output est obligatoire pour la sauvegarde du registre."), {
          code: "PROTO05_MIGRATION_BACKUP_PATH_REQUIRED"
        });
      }
      const backup = await createRegistryBackup(database, runnerOptions);
      const written = writeRegistryBackupExclusive(backup, path.resolve(cli.output));
      console.log(JSON.stringify({ ok: true, database: config.database, backup: written }, null, 2));
      return;
    }
    if (command === "baseline" || command === "apply") {
      const result = await runMigrationCommand(database, {
        ...runnerOptions,
        mode: command,
        expectedPlanHash: cli["plan-hash"],
        confirm: cli.confirm,
        backupPath: cli.backup ? path.resolve(cli.backup) : null
      });
      console.log(JSON.stringify({ ...stateOutput(result.state), changed: result.changed }, null, 2));
      return;
    }
    const state = await inspectMigrationState(database, runnerOptions);
    console.log(JSON.stringify(stateOutput(state), null, 2));
  } finally {
    await database.end();
  }
}

main().catch(error => {
  console.error(JSON.stringify(safeError(error), null, 2));
  process.exitCode = 1;
});
