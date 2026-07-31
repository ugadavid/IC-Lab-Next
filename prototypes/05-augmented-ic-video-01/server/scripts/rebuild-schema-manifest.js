"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const { inspectDatabaseSchema, loadMigrationContract } = require("../schema-migrations");

const CONFIRMATION = "--confirm=REBUILD PROTO05 SCHEMA MANIFEST";
const PROTOTYPE_DIRECTORY = path.resolve(__dirname, "..", "..");

async function main() {
  if (process.argv[2] !== CONFIRMATION) {
    throw Object.assign(new Error(`Confirmation requise : ${CONFIRMATION}`), {
      code: "PROTO05_MANIFEST_CONFIRMATION_REQUIRED"
    });
  }
  const config = mariadbConfigurationFromEnvironment(process.env);
  const mysql = require(path.resolve(
    PROTOTYPE_DIRECTORY,
    "..",
    "00-ic-hub",
    "server",
    "node_modules",
    "mysql2",
    "promise"
  ));
  const suffix = crypto.randomBytes(6).toString("hex");
  const databaseName = `proto05_manifest_${process.pid}_${suffix}`;
  const database = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false
  });
  try {
    await database.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await database.query(`USE \`${databaseName}\``);
    const contract = loadMigrationContract(PROTOTYPE_DIRECTORY);
    for (const migration of contract.migrations) {
      for (const statement of migration.statements) await database.query(statement);
    }
    const manifest = await inspectDatabaseSchema(database, databaseName);
    if (manifest.routines.length !== 43) {
      throw Object.assign(new Error("La reconstruction n’a pas produit les 43 procédures attendues."), {
        code: "PROTO05_MANIFEST_ROUTINE_COUNT_INVALID"
      });
    }
    const outputPath = path.join(
      PROTOTYPE_DIRECTORY,
      "database",
      "schema-migrations",
      "002_proto05_canonical_routines.manifest.json"
    );
    fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ ok: true, tables: manifest.tables.length, routines: manifest.routines.length })}\n`);
  } finally {
    await database.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    await database.end();
  }
}

main().catch(error => {
  process.stderr.write(`${JSON.stringify({ ok: false, code: error.code || "ERROR", message: error.message })}\n`);
  process.exitCode = 1;
});

