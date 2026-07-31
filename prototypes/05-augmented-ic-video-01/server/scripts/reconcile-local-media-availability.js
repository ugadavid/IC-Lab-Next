"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require(path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "00-ic-hub",
  "server",
  "node_modules",
  "mysql2",
  "promise"
));
const {
  applyLocalMediaAvailabilityPlan,
  inspectLocalMediaAvailability,
  readAvailabilityRows
} = require("../local-media-availability-reconciliation");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const { assertApplicationGrants } = require("../proto05-mariadb-write");

const CONFIRMATION = "APPLY_PROTO05_LOCAL_AVAILABILITY_RECONCILIATION";
const prototypeDirectory = path.resolve(__dirname, "..", "..");
const roots = Object.freeze({
  "legacy-media": path.join(prototypeDirectory, "data", "video-library-media"),
  workspace: path.join(prototypeDirectory, "data", "video-library-workspaces")
});

function parseArguments(argv) {
  const options = {
    mode: "inspect",
    expectedPlanHash: null,
    expectedUpdateCount: null,
    expectedIds: null,
    confirmation: null,
    witnessFile: null
  };
  for (const argument of argv) {
    if (argument === "--inspect") options.mode = "inspect";
    else if (argument === "--apply") options.mode = "apply";
    else if (argument.startsWith("--expected-plan-hash=")) options.expectedPlanHash = argument.slice(21);
    else if (argument.startsWith("--expected-update-count=")) options.expectedUpdateCount = Number(argument.slice(24));
    else if (argument.startsWith("--expected-ids=")) options.expectedIds = argument.slice(15).split(",").filter(Boolean).sort();
    else if (argument.startsWith("--confirm=")) options.confirmation = argument.slice(10);
    else if (argument.startsWith("--witness-file=")) options.witnessFile = path.resolve(argument.slice(15));
    else throw new Error(`Argument inconnu : ${argument}`);
  }
  if (options.mode === "apply") {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanHash || "")) throw new Error("Le hash exact du plan est obligatoire.");
    if (!Number.isInteger(options.expectedUpdateCount) || options.expectedUpdateCount < 0) throw new Error("Le nombre attendu de mises à jour est obligatoire.");
    if (!options.expectedIds || options.expectedIds.length !== options.expectedUpdateCount) throw new Error("La liste exacte des playables attendus est obligatoire.");
    if (options.confirmation !== CONFIRMATION) throw new Error("La confirmation explicite d'application est obligatoire.");
    if (!options.witnessFile) throw new Error("Un fichier témoin hors base est obligatoire.");
  }
  return options;
}

async function connect() {
  const config = mariadbConfigurationFromEnvironment(process.env);
  const database = await mysql.createConnection({
    ...config,
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false
  });
  await database.query("SET SESSION time_zone = '+00:00'");
  const [[identity]] = await database.query("SELECT CURRENT_USER() account, DATABASE() database_name");
  if (identity.database_name !== config.database || !String(identity.account).startsWith(`${config.user}@`)) {
    await database.end();
    throw new Error("L'identité MariaDB ne correspond pas à la configuration Proto05.");
  }
  const [grantRows] = await database.query("SHOW GRANTS");
  assertApplicationGrants(grantRows, config);
  return database;
}

function publicPlan(plan) {
  return {
    version: plan.version,
    planHash: plan.planHash,
    safeToApply: plan.safeToApply,
    summary: plan.summary,
    changes: plan.changes.map(entry => ({
      id: entry.id,
      assetId: entry.assetId,
      sourceId: entry.sourceId,
      role: entry.role,
      storageScope: entry.storageScope,
      storageKey: entry.storageKey,
      observation: entry.observation,
      decision: entry.decision,
      before: entry.before,
      after: entry.after
    })),
    refusals: plan.refusals.map(entry => ({
      id: entry.id,
      storageScope: entry.storageScope,
      storageKey: entry.storageKey,
      reason: entry.reason
    }))
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  let database = await connect();
  try {
    const rows = await readAvailabilityRows(database);
    const plan = await inspectLocalMediaAvailability(rows, { roots });
    const exposedPlan = publicPlan(plan);
    if (options.mode === "inspect") {
      process.stdout.write(`${JSON.stringify({ mode: "inspect", plan: exposedPlan }, null, 2)}\n`);
      return;
    }
    const actualIds = plan.changes.map(entry => entry.id).sort();
    if (JSON.stringify(actualIds) !== JSON.stringify(options.expectedIds)) {
      throw new Error("Les playables à modifier ne correspondent pas à la liste validée.");
    }
    await fs.writeFile(
      options.witnessFile,
      `${JSON.stringify({ createdAt: new Date().toISOString(), plan: exposedPlan }, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" }
    );
    const result = await applyLocalMediaAvailabilityPlan({
      database,
      plan,
      roots,
      expectedPlanHash: options.expectedPlanHash,
      expectedUpdateCount: options.expectedUpdateCount
    });
    await database.end();
    database = null;
    const verificationDatabase = await connect();
    try {
      const afterRows = await readAvailabilityRows(verificationDatabase);
      const afterPlan = await inspectLocalMediaAvailability(afterRows, { roots });
      if (afterPlan.changes.length !== 0 || !afterPlan.safeToApply) {
        throw new Error("La relecture après reconnexion n'est pas idempotente.");
      }
      process.stdout.write(`${JSON.stringify({
        mode: "apply",
        applied: result.applied,
        planHash: result.planHash,
        witnessWritten: true,
        after: publicPlan(afterPlan)
      }, null, 2)}\n`);
    } finally {
      await verificationDatabase.end();
    }
  } finally {
    if (database) await database.end();
  }
}

main().catch(error => {
  process.stderr.write(`${JSON.stringify({ error: error.code || "PROTO05_AVAILABILITY_RECONCILIATION_FAILED", message: error.message })}\n`);
  process.exitCode = 1;
});
