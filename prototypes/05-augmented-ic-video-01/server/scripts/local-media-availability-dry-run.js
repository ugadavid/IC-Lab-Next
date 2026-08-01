"use strict";

const path = require("node:path");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const {
  inspectLocalMediaAvailability,
  readAvailabilityRows,
  reconciliationDryRunReport
} = require("../local-media-availability-reconciliation");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const mysql = require(path.resolve(
  prototypeDirectory,
  "..",
  "00-ic-hub",
  "server",
  "node_modules",
  "mysql2",
  "promise"
));

function selectedIds(argumentsList) {
  const option = argumentsList.find(value => value.startsWith("--ids="));
  if (!option) return null;
  return [...new Set(option.slice(6).split(",").map(value => value.trim()).filter(Boolean))];
}

async function main() {
  const database = await mysql.createConnection({
    ...mariadbConfigurationFromEnvironment(process.env),
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false
  });
  try {
    const rows = await readAvailabilityRows(database, { ids: selectedIds(process.argv.slice(2)) });
    const legacyRoot = path.join(prototypeDirectory, "data", "video-library-media");
    const plan = await inspectLocalMediaAvailability(rows, {
      roots: {
        "legacy-media": legacyRoot,
        "library-media": legacyRoot,
        workspace: path.join(prototypeDirectory, "data", "video-library-workspaces")
      }
    });
    process.stdout.write(`${JSON.stringify(reconciliationDryRunReport(plan), null, 2)}\n`);
  } finally {
    await database.end();
  }
}

main().catch(error => {
  process.stderr.write(`Dry-run de disponibilité impossible : ${error.message}\n`);
  process.exitCode = 1;
});
