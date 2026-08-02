"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const { createMariaDbReadonlyAdapter } = require("../proto05-mariadb-readonly");
const { validateCorpusManifest } = require("../corpus-import-manifest");
const { canonicalJson, createCorpusImportPlan, manifestSemanticHash, sha256 } = require("../corpus-import-plan");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const defaultManifestPath = path.join(prototypeDirectory, "imports", "corpora", "repli4c-24-videos.v1.json");

function parseArguments(values) {
  if (values.length === 0 || values[0] !== "plan") throw new Error("Commande refusée : seule l’opération explicite « plan » est disponible.");
  const result = { manifestPath: defaultManifestPath, outputPath: null };
  for (const value of values.slice(1)) {
    if (value.startsWith("--manifest=")) result.manifestPath = path.resolve(value.slice(11));
    else if (value.startsWith("--output=")) result.outputPath = path.resolve(value.slice(9));
    else throw new Error(`Option inconnue : ${value}`);
  }
  return result;
}

function loadValidatedManifest(manifestPath) {
  const bytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));
  const sourceHashes = {};
  for (const source of manifest.corpus?.sources || []) {
    const sourcePath = path.resolve(prototypeDirectory, source.path);
    sourceHashes[source.path] = sha256(fs.readFileSync(sourcePath));
  }
  validateCorpusManifest(manifest, { sourceHashes });
  return { manifest, manifestHash: manifestSemanticHash(manifest), manifestFileHash: sha256(bytes), sourceHashes };
}

async function producePlan({ manifestPath, readSnapshot }) {
  const loaded = loadValidatedManifest(manifestPath);
  const snapshot = await readSnapshot();
  return createCorpusImportPlan({ ...loaded, snapshot });
}

async function main(values = process.argv.slice(2)) {
  const options = parseArguments(values);
  const loaded = loadValidatedManifest(options.manifestPath);
  const envFile = path.join(prototypeDirectory, ".env.local");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const adapter = createMariaDbReadonlyAdapter({
    config: mariadbConfigurationFromEnvironment(process.env),
    prototypeDirectory,
    readonlySession: true,
    grantValidator: () => ({ readonlySession: true })
  });
  try {
    const snapshot = await adapter.readSnapshot();
    const plan = createCorpusImportPlan({ ...loaded, snapshot });
    const output = canonicalJson(plan);
    if (options.outputPath) {
      fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
      fs.writeFileSync(options.outputPath, output, { flag: "w" });
    } else {
      process.stdout.write(output);
    }
    process.stderr.write(`Plan corpus : ${plan.summary.entryCount} entrées, ${plan.summary.matchedExistingCount} existantes, ${plan.summary.createTechnicalMediaCount} créations techniques, ${plan.summary.blockerCount} blocker(s).\n`);
    process.stderr.write(`SHA-256 du plan : ${plan.planHash}\n`);
    if (plan.blockers.length) process.exitCode = 2;
    return plan;
  } finally {
    await adapter.close();
  }
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`Plan corpus impossible : ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { loadValidatedManifest, main, parseArguments, producePlan };
