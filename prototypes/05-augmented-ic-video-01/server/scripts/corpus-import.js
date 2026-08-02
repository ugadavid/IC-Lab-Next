"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const { createMariaDbReadonlyAdapter } = require("../proto05-mariadb-readonly");
const { validateCorpusManifest } = require("../corpus-import-manifest");
const { canonicalJson, createCorpusImportPlan, manifestSemanticHash, sha256 } = require("../corpus-import-plan");
const { APPLY_CONFIRMATION, applyCorpusImport } = require("../corpus-import-apply");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const defaultManifestPath = path.join(prototypeDirectory, "imports", "corpora", "repli4c-24-videos.v1.json");
const defaultPlanPath = path.join(prototypeDirectory, "imports", "plans", "repli4c-24-videos.v2.plan.json");

function parseArguments(values) {
  if (values.length === 0 || !["plan", "apply"].includes(values[0])) throw new Error("Commande attendue : plan ou apply.");
  const result = { command: values[0], manifestPath: defaultManifestPath, planPath: defaultPlanPath, outputPath: null, expectedPlanHash: null, confirmation: null, receiptPath: null };
  for (const value of values.slice(1)) {
    if (value.startsWith("--manifest=")) result.manifestPath = path.resolve(value.slice(11));
    else if (value.startsWith("--plan=")) result.planPath = path.resolve(value.slice(7));
    else if (value.startsWith("--output=")) result.outputPath = path.resolve(value.slice(9));
    else if (value.startsWith("--expected-plan-hash=")) result.expectedPlanHash = value.slice(21);
    else if (value.startsWith("--confirm=")) result.confirmation = value.slice(10);
    else if (value.startsWith("--receipt=")) result.receiptPath = path.resolve(value.slice(10));
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

function loadEnvironment() {
  const envFile = path.join(prototypeDirectory, ".env.local");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
}

async function main(values = process.argv.slice(2)) {
  const options = parseArguments(values);
  const loaded = loadValidatedManifest(options.manifestPath);
  loadEnvironment();
  const config = mariadbConfigurationFromEnvironment(process.env);
  if (options.command === "apply") {
    if (!options.expectedPlanHash) throw new Error("--expected-plan-hash est obligatoire.");
    if (options.confirmation !== APPLY_CONFIRMATION) throw new Error(`--confirm=${APPLY_CONFIRMATION} est obligatoire.`);
    const mysql = require(path.resolve(prototypeDirectory, "..", "00-ic-hub", "server", "node_modules", "mysql2", "promise"));
    const database = await mysql.createConnection({ ...config, charset: "utf8mb4", dateStrings: true, multipleStatements: false });
    try {
      const bytes = fs.readFileSync(options.planPath);
      const plan = JSON.parse(bytes.toString("utf8"));
      const result = await applyCorpusImport({ database, ...loaded, plan, expectedPlanHash: options.expectedPlanHash, confirmation: options.confirmation });
      const receipt = {
        schemaVersion: "proto05-corpus-import-receipt/1.0", corpusId: plan.corpusId,
        planHash: plan.planHash, planFileHash: sha256(bytes), manifestHash: loaded.manifestHash,
        preImportSnapshotHash: result.beforeHash, postImportSnapshotHash: result.postPlan.inputs.snapshotHash,
        appliedCount: result.appliedCount,
        created: result.created.map(item => ({ entryId: item.entryId, assetId: item.ids.assetId, sourceId: item.ids.sourceId, playableId: item.ids.playableId, url: item.source.origin.sourceUrl, kind: item.source.kind })),
        postPlanHash: result.postPlan.planHash
      };
      if (options.outputPath) { fs.mkdirSync(path.dirname(options.outputPath), { recursive: true }); fs.writeFileSync(options.outputPath, canonicalJson(result.postPlan), { flag: "wx" }); }
      if (options.receiptPath) { fs.mkdirSync(path.dirname(options.receiptPath), { recursive: true }); fs.writeFileSync(options.receiptPath, canonicalJson(receipt), { flag: "wx" }); }
      process.stdout.write(canonicalJson(receipt));
      return receipt;
    } finally { await database.end(); }
  }
  const adapter = createMariaDbReadonlyAdapter({ config, prototypeDirectory, readonlySession: true, grantValidator: () => ({ readonlySession: true }) });
  try {
    const snapshot = await adapter.readSnapshot();
    const plan = createCorpusImportPlan({ ...loaded, snapshot });
    const output = canonicalJson(plan);
    if (options.outputPath) { fs.mkdirSync(path.dirname(options.outputPath), { recursive: true }); fs.writeFileSync(options.outputPath, output, { flag: "w" }); }
    else process.stdout.write(output);
    process.stderr.write(`Plan corpus : ${plan.summary.entryCount} entrées, ${plan.summary.matchedExistingCount} existantes, ${plan.summary.createTechnicalMediaCount} créations techniques, ${plan.summary.blockerCount} blocker(s).\nSHA-256 du plan : ${plan.planHash}\n`);
    if (plan.blockers.length) process.exitCode = 2;
    return plan;
  } finally { await adapter.close(); }
}

if (require.main === module) main().catch(error => { process.stderr.write(`Import corpus impossible : ${error.message}\n`); process.exitCode = 1; });

module.exports = { defaultPlanPath, loadValidatedManifest, main, parseArguments, producePlan };
