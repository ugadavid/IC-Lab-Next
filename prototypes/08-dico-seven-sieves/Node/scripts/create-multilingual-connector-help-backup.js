"use strict";

const path = require("node:path");
const { createPool } = require("../src/repository");
const { createBackup } = require("./manage-multilingual-connector-helps");

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex < 0 || !process.argv[outputIndex + 1]) throw new Error("Préciser --output <fichier>.");
  const pool = createPool();
  try {
    const result = await createBackup(pool, path.resolve(process.argv[outputIndex + 1]));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
