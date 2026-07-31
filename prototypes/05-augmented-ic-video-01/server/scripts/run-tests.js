"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const testDirectory = path.resolve(__dirname, "..", "test");

function collectTests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? collectTests(target) : [target];
    })
    .filter(file => file.endsWith(".test.js"))
    .sort((left, right) => left.localeCompare(right));
}

const testFiles = collectTests(testDirectory);
if (testFiles.length === 0) {
  throw new Error(`Aucun fichier *.test.js trouvé dans ${testDirectory}.`);
}

const result = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", ...testFiles],
  { stdio: "inherit" }
);

if (result.error) throw result.error;
if (result.signal) {
  process.kill(process.pid, result.signal);
}
process.exit(result.status ?? 1);
