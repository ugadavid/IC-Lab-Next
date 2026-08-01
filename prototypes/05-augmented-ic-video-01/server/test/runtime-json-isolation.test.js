"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createProto05ReadBoundary } = require("../proto05-read-boundary");
const { createProto05WriteBoundary } = require("../proto05-write-boundary");
const { loadMigrationContract } = require("../schema-migrations");
const {
  assertWritableCanonical,
  canonicalFromRuntime,
  projectCanonicalLibrary
} = require("../media-library-projection");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const relativeRequire = /require\(["'](\.{1,2}\/[^"']+)["']\)/g;

function resolveLocalModule(fromFile, request) {
  const target = path.resolve(path.dirname(fromFile), request);
  for (const candidate of [target, `${target}.js`, path.join(target, "index.js")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Module local introuvable depuis ${fromFile} : ${request}`);
}

function localRuntimeGraph(entryFile) {
  const pending = [entryFile];
  const visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(relativeRequire)) {
      const dependency = resolveLocalModule(file, match[1]);
      if (dependency.startsWith(`${prototypeDirectory}${path.sep}`)) pending.push(dependency);
    }
  }
  return visited;
}

function writeAdapter(overrides = {}) {
  const noop = async () => null;
  return {
    writeScopedSnapshot: noop,
    appendWorkingCopy: noop,
    updatePlayableAvailability: noop,
    saveAudioAnonymizationPlan: noop,
    startInlineMediaTreatment: noop,
    updateMediaTreatment: noop,
    completeInlineMediaTreatment: noop,
    ...overrides
  };
}

test("le graphe du serveur exclut les lecteurs et outils JSON métier historiques", () => {
  const graph = localRuntimeGraph(path.join(serverDirectory, "server.js"));
  const relativeFiles = [...graph].map(file => path.relative(serverDirectory, file).replaceAll("\\", "/"));
  const sources = [...graph].map(file => fs.readFileSync(file, "utf8")).join("\n");

  assert.ok(relativeFiles.includes("media-library-projection.js"));
  assert.ok(relativeFiles.includes("proto05-mariadb-readonly.js"));
  assert.ok(relativeFiles.includes("proto05-mariadb-write.js"));
  for (const excluded of [
    "media-library-runtime.js",
    "media-library-dry-run.js",
    "media-library-install.js",
    "scripts/migrate-language-catalog.js"
  ]) {
    assert.ok(!relativeFiles.includes(excluded), `${excluded} ne doit pas être chargé au démarrage.`);
  }
  for (const retired of [
    "media-library-runtime.js",
    "media-library-install.js",
    "media-library-dry-run.js",
    "scripts/migrate-language-catalog.js"
  ]) {
    assert.equal(fs.existsSync(path.join(serverDirectory, retired)), false, `${retired} doit rester supprimé.`);
  }
  assert.doesNotMatch(sources, /activities\.json|activity-library\.json|video-catalog\.json|video-library\.json/);
  assert.doesNotMatch(sources, /readCanonicalMediaLibrary(?:Async)?/);
  assert.doesNotMatch(sources, /database[\\/]["'`,\s]*migrations|001_proto05_json_to_mariadb_dry_run/);

  const projectionSource = fs.readFileSync(path.join(serverDirectory, "media-library-projection.js"), "utf8");
  assert.doesNotMatch(projectionSource, /node:fs|readFile|writeFile|rename|copyFile/);
});

test("les frontières métier délèguent uniquement aux repositories MariaDB et échouent sans fallback", async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-json-fallback-proof-"));
  const historicalFile = path.join(temporaryDirectory, "activities.json");
  fs.writeFileSync(historicalFile, JSON.stringify({ activities: [{ id: "legacy-must-not-load" }] }));
  const expectedFailure = new Error("MariaDB indisponible pour le test");
  let writeCalls = 0;
  const reader = createProto05ReadBoundary({
    mariadbAdapter: {
      verify: async () => { throw expectedFailure; },
      readSnapshot: async () => { throw expectedFailure; },
      readAudioAnonymizationPlan: async () => { throw expectedFailure; }
    }
  });
  const writer = createProto05WriteBoundary({
    mariadbAdapter: writeAdapter({
      writeScopedSnapshot: async () => {
        writeCalls += 1;
        return { repository: "mariadb" };
      }
    })
  });

  try {
    await assert.rejects(reader.readSnapshot(), error => error === expectedFailure);
    assert.deepEqual(await writer.writeScopedSnapshot({}, {}), { repository: "mariadb" });
    assert.equal(writeCalls, 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(historicalFile, "utf8")), {
      activities: [{ id: "legacy-must-not-load" }]
    });
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("la projection extraite conserve le contrat métier reconstruit depuis MariaDB", () => {
  const canonical = JSON.parse(fs.readFileSync(
    path.join(__dirname, "fixtures", "media-library-canonical.valid.json"),
    "utf8"
  ));
  const runtime = projectCanonicalLibrary(canonical);
  const reconstructed = canonicalFromRuntime(runtime, canonical);

  assert.equal(runtime.assets[0].sourceIds[0], canonical.sources[0].id);
  assert.equal(runtime.assets[0].playableIds[0], canonical.playables[0].id);
  assert.deepEqual(assertWritableCanonical(reconstructed), canonical);
});

test("les manifestes JSON techniques restent chargeables hors de toute donnée métier", () => {
  const contract = loadMigrationContract(prototypeDirectory);
  assert.deepEqual(contract.migrations.map(migration => migration.version), ["001", "002", "003", "004", "005", "006"]);
  assert.equal(contract.latestVersion, "006");
  assert.ok(contract.latestFingerprint);
});
