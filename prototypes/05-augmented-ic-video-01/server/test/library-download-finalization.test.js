"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const {
  cleanupDownloadWorkspace,
  createDownloadWorkspace,
  publishDownloadedFile
} = require("../library-download-finalization");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.join(prototypeDirectory, "data", "video-library-workspaces");
const fakeFfmpeg = path.join(__dirname, "fixtures", "fake-ffmpeg.js");
const mysql = require(path.resolve(
  prototypeDirectory,
  "..",
  "00-ic-hub",
  "server",
  "node_modules",
  "mysql2",
  "promise"
));

let localEnvironmentLoaded = false;

async function databaseConnection() {
  if (!localEnvironmentLoaded) {
    process.loadEnvFile(path.join(prototypeDirectory, ".env.local"));
    localEnvironmentLoaded = true;
  }
  return mysql.createConnection({
    ...mariadbConfigurationFromEnvironment(process.env),
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false
  });
}

async function adminDatabaseConnection() {
  if (!localEnvironmentLoaded) {
    process.loadEnvFile(path.join(prototypeDirectory, ".env.local"));
    localEnvironmentLoaded = true;
  }
  return mysql.createConnection({
    host: process.env.PROTO05_MARIADB_HOST,
    port: Number(process.env.PROTO05_MARIADB_PORT),
    database: process.env.PROTO05_MARIADB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false
  });
}

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function waitForJob(baseUrl, id) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await request(baseUrl, `/api/proto05/library/downloads/${encodeURIComponent(id)}`);
    if (["completed", "failed", "cancelled"].includes(result.body.job?.status)) return result.body.job;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("La tâche de téléchargement de fixture n’a pas atteint un état terminal.");
}

async function startHlsFixture() {
  const server = http.createServer((request, response) => {
    if (request.url === "/master.m3u8") {
      response.setHeader("content-type", "application/vnd.apple.mpegurl");
      return response.end("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100000,RESOLUTION=320x180\nmedia.m3u8\n");
    }
    if (request.url === "/media.m3u8") {
      response.setHeader("content-type", "application/vnd.apple.mpegurl");
      return response.end("#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2.0,\nsegment.ts\n#EXT-X-ENDLIST\n");
    }
    if (request.url === "/segment.ts") {
      response.setHeader("content-type", "video/mp2t");
      return response.end(Buffer.from("PROTO05-HLS-SEGMENT-M162"));
    }
    response.statusCode = 404;
    response.end("absent");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}/master.m3u8`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function createRemoteAsset(server, url, marker) {
  const analyzed = await request(server.baseUrl, "/api/proto05/library/remote-reference/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, title: `[TEST M162] ${marker}` })
  });
  assert.equal(analyzed.response.status, 200, analyzed.body.error);
  const confirmed = await request(server.baseUrl, "/api/proto05/library/remote-reference/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: analyzed.body.token })
  });
  assert.equal(
    confirmed.response.status,
    201,
    `${JSON.stringify(confirmed.body)}\n${server.stderr?.() || ""}`
  );
  return { assetId: confirmed.body.assetId, playableId: confirmed.body.playableId };
}

async function removeRemoteAsset(server, assetId) {
  let detail = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(assetId)}`);
  if (detail.response.status === 404) return;
  for (const copy of detail.body.asset.localCopies || []) {
    detail = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(assetId)}`);
    const removed = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(assetId)}/local-copies/${encodeURIComponent(copy.playableId)}`,
      { method: "DELETE", headers: { "if-match": detail.body.asset.deletionRevisionToken } }
    );
    assert.equal(removed.response.status, 200, removed.body.error);
  }
  detail = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(assetId)}`);
  const removed = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
    headers: { "if-match": detail.body.asset.deletionRevisionToken }
  });
  assert.equal(removed.response.status, 200, removed.body.error);
}

test("la publication atomique nettoie un échec, autorise la reprise et refuse une collision", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-m162-publication-"));
  const downloadRoot = path.join(root, ".downloads");
  const workspaceRoot = path.join(root, "workspaces");
  const target = path.join(workspaceRoot, "asset-m162", "source", "fixture.mp4");
  try {
    const failedWorkspace = await createDownloadWorkspace(downloadRoot, "failed");
    const failedSource = path.join(failedWorkspace, "download.mp4.incomplete");
    fs.writeFileSync(failedSource, "PREMIERE-TENTATIVE");
    await assert.rejects(
      publishDownloadedFile({
        temporaryPath: failedSource,
        targetPath: target,
        workspaceRoot,
        persist: async publish => {
          await publish();
          throw new Error("rollback contrôlé");
        }
      }),
      /rollback contrôlé/
    );
    assert.equal(fs.existsSync(target), false);
    assert.equal(fs.existsSync(path.join(workspaceRoot, "asset-m162")), false);
    await cleanupDownloadWorkspace(failedWorkspace, downloadRoot);

    const retryWorkspace = await createDownloadWorkspace(downloadRoot, "retry");
    const retrySource = path.join(retryWorkspace, "download.mp4.incomplete");
    fs.writeFileSync(retrySource, "SECONDE-TENTATIVE");
    await publishDownloadedFile({
      temporaryPath: retrySource,
      targetPath: target,
      workspaceRoot,
      persist: async publish => {
        await publish();
        return { saved: true };
      }
    });
    assert.equal(fs.readFileSync(target, "utf8"), "SECONDE-TENTATIVE");
    await cleanupDownloadWorkspace(retryWorkspace, downloadRoot);

    const collisionWorkspace = await createDownloadWorkspace(downloadRoot, "collision");
    const collisionSource = path.join(collisionWorkspace, "download.mp4.incomplete");
    fs.writeFileSync(collisionSource, "NE-DOIT-PAS-ECRASER");
    await assert.rejects(
      publishDownloadedFile({
        temporaryPath: collisionSource,
        targetPath: target,
        workspaceRoot,
        persist: async publish => {
          await publish();
          return { saved: true };
        }
      }),
      error => error.code === "EEXIST"
    );
    assert.equal(fs.readFileSync(target, "utf8"), "SECONDE-TENTATIVE");
    await cleanupDownloadWorkspace(collisionWorkspace, downloadRoot);
    assert.equal(fs.existsSync(downloadRoot), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un rollback MariaDB ne laisse aucun dossier et le même média peut être retenté", { timeout: 40_000 }, async () => {
  const origin = await startHlsFixture();
  const commonEnvironment = {
    PROTO05_TEST_ALLOW_PRIVATE_REMOTE: "1",
    PROTO05_TEST_FFMPEG_SCRIPT: fakeFfmpeg
  };
  const failingServer = await startTemporaryProto05Server(
    { activities: [] },
    "proto05-m162-rollback-",
    { env: { ...commonEnvironment, PROTO05_TEST_FAIL_WORKING_COPY_AFTER_STATEMENTS: "2" } }
  );
  let retryServer = null;
  let asset = null;
  try {
    asset = await createRemoteAsset(failingServer, origin.url, "rollback et reprise");
    fs.mkdirSync(path.join(workspaceRoot, asset.assetId, "temp"), { recursive: true });
    const first = await request(failingServer.baseUrl, "/api/proto05/library/downloads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...asset, fileName: "m162-retry.mp4" })
    });
    assert.equal(first.response.status, 202, first.body.error);
    const failedJob = await waitForJob(failingServer.baseUrl, first.body.job.id);
    assert.equal(failedJob.status, "failed");
    assert.match(failedJob.error, /Échec forcé/);
    assert.equal(fs.existsSync(path.join(workspaceRoot, asset.assetId)), false);

    retryServer = await startTemporaryProto05Server(
      { activities: [] },
      "proto05-m162-retry-",
      { env: commonEnvironment }
    );
    const retry = await request(retryServer.baseUrl, "/api/proto05/library/downloads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...asset, fileName: "m162-retry.mp4" })
    });
    assert.equal(retry.response.status, 202, retry.body.error);
    const completedJob = await waitForJob(retryServer.baseUrl, retry.body.job.id);
    assert.equal(completedJob.status, "completed", completedJob.error);
    assert.equal(fs.statSync(path.join(workspaceRoot, completedJob.result.storageKey)).isFile(), true);
    await removeRemoteAsset(retryServer, asset.assetId);
    assert.equal(fs.existsSync(path.join(workspaceRoot, asset.assetId)), false);
    asset = null;
  } finally {
    if (asset) {
      const cleanupServer = retryServer || failingServer;
      await removeRemoteAsset(cleanupServer, asset.assetId).catch(() => {});
      fs.rmSync(path.join(workspaceRoot, asset.assetId), { recursive: true, force: true });
    }
    if (retryServer) await retryServer.cleanup();
    await failingServer.cleanup();
    await origin.close();
  }
});

test("un téléchargement HLS court est publié sans écrasement puis nettoyé", { timeout: 30_000 }, async () => {
  const origin = await startHlsFixture();
  const server = await startTemporaryProto05Server(
    { activities: [] },
    "proto05-m162-download-",
    { env: { PROTO05_TEST_ALLOW_PRIVATE_REMOTE: "1", PROTO05_TEST_FFMPEG_SCRIPT: fakeFfmpeg } }
  );
  let asset = null;
  try {
    asset = await createRemoteAsset(server, origin.url, "finalisation Windows");
    fs.mkdirSync(path.join(workspaceRoot, asset.assetId, "temp"), { recursive: true });
    const started = await request(server.baseUrl, "/api/proto05/library/downloads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...asset, fileName: "m162-fixture.mp4" })
    });
    assert.equal(started.response.status, 202, started.body.error);
    const job = await waitForJob(server.baseUrl, started.body.job.id);
    assert.equal(job.status, "completed", `${job.error || "échec sans détail"}\n${server.stderr()}`);
    const finalFile = path.join(workspaceRoot, job.result.storageKey);
    assert.equal(fs.statSync(finalFile).isFile(), true);
    assert.ok(fs.statSync(finalFile).size > 0);

    const duplicate = await request(server.baseUrl, "/api/proto05/library/downloads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...asset, fileName: "m162-fixture.mp4" })
    });
    assert.equal(duplicate.response.status, 409);
    await removeRemoteAsset(server, asset.assetId);
    assert.equal(fs.existsSync(path.join(workspaceRoot, asset.assetId)), false);
    asset = null;
  } finally {
    if (asset) {
      await removeRemoteAsset(server, asset.assetId).catch(() => {});
      fs.rmSync(path.join(workspaceRoot, asset.assetId), { recursive: true, force: true });
    }
    await server.cleanup();
    await origin.close();
  }
});

test("une copie dont le fichier a disparu peut être retirée logiquement sans toucher aux autres accès", { timeout: 30_000 }, async () => {
  const origin = await startHlsFixture();
  const server = await startTemporaryProto05Server(
    { activities: [] },
    "proto05-m164-missing-copy-",
    { env: { PROTO05_TEST_ALLOW_PRIVATE_REMOTE: "1", PROTO05_TEST_FFMPEG_SCRIPT: fakeFfmpeg } }
  );
  let asset = null;
  try {
    asset = await createRemoteAsset(server, origin.url, "copie physiquement absente");
    const started = await request(server.baseUrl, "/api/proto05/library/downloads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...asset, fileName: "m164-missing-copy.mp4" })
    });
    assert.equal(started.response.status, 202, started.body.error);
    const job = await waitForJob(server.baseUrl, started.body.job.id);
    assert.equal(job.status, "completed", job.error);
    const file = path.join(workspaceRoot, job.result.storageKey);
    fs.rmSync(file);

    const before = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}`);
    const copy = before.body.asset.localCopies.find(item => item.playableId === job.result.playableId);
    assert.equal(copy.fileState, "missing");
    assert.equal(copy.deletion.allowed, true);
    const removed = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}/local-copies/${encodeURIComponent(copy.playableId)}`,
      { method: "DELETE", headers: { "if-match": before.body.asset.deletionRevisionToken } }
    );
    assert.equal(removed.response.status, 200, removed.body.error);
    assert.equal(removed.body.deletedFile, false);
    assert.equal(removed.body.fileWasAlreadyMissing, true);
    const after = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}`);
    assert.equal(after.response.status, 200);
    assert.equal(
      after.body.asset.localCopies.some(item => item.playableId === copy.playableId),
      false,
      JSON.stringify(after.body.asset.localCopies)
    );
    assert.ok(after.body.asset.playables.some(item => item.id === asset.playableId));
    await removeRemoteAsset(server, asset.assetId);
    asset = null;
  } finally {
    if (asset) await removeRemoteAsset(server, asset.assetId).catch(() => {});
    await server.cleanup();
    await origin.close();
  }
});

test("une sortie locale absente et son traitement terminal sont supprimés ensemble", { timeout: 30_000 }, async () => {
  const origin = await startHlsFixture();
  const server = await startTemporaryProto05Server(
    { activities: [] },
    "proto05-m165-terminal-output-",
    { env: { PROTO05_TEST_ALLOW_PRIVATE_REMOTE: "1" } }
  );
  let asset = null;
  let database = null;
  let adminDatabase = null;
  let planId = null;
  try {
    asset = await createRemoteAsset(server, origin.url, "sortie terminale absente");
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const treatmentId = `m165-treatment-${suffix}`;
    planId = `m166-audio-plan-${suffix}`;
    const sourceId = `source-${treatmentId}`;
    const playableId = `video-${treatmentId}`;
    const storageKey = `${asset.assetId}/derived/${treatmentId}/ghost-output.mp4`;
    database = await databaseConnection();
    adminDatabase = await adminDatabaseConnection();
    await database.query(
      "CALL sp_media_inline_treatment_start(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        treatmentId,
        null,
        asset.assetId,
        asset.playableId,
        "visual-anonymization",
        "[TEST M165] sortie absente",
        treatmentId,
        "fixture",
        "1",
        JSON.stringify({ mission: 165 })
      ]
    );
    await database.query(
      "CALL sp_media_inline_treatment_complete(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        treatmentId,
        sourceId,
        playableId,
        "workspace",
        storageKey,
        "video/mp4",
        128,
        1000,
        "a".repeat(64),
        "aac",
        1,
        "fixture-1",
        JSON.stringify({ completed: true })
      ]
    );
    const emptyOutputDirectory = path.dirname(path.join(workspaceRoot, storageKey));
    fs.mkdirSync(emptyOutputDirectory, { recursive: true });

    const before = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}`);
    const output = before.body.asset.versionsAndAccess.derivations.find(item => item.derivationId === treatmentId);
    assert.equal(output.id, playableId);
    assert.equal(output.localFileState, "missing");

    await database.query(
      "CALL sp_audio_anonymization_plan_save(?, ?, ?, ?, ?, ?)",
      [planId, asset.assetId, playableId, 1000, 0, JSON.stringify([])]
    );
    const blockedPreflight = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}/derivations/${encodeURIComponent(treatmentId)}`
    );
    assert.equal(blockedPreflight.response.status, 200);
    assert.equal(blockedPreflight.body.deletion.allowed, false);
    assert.ok(blockedPreflight.body.deletion.conflicts.some(conflict => (
      conflict.type === "audio-plans" && conflict.items.some(item => item.id === planId)
    )));
    const blockedDeletion = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}/derivations/${encodeURIComponent(treatmentId)}`,
      { method: "DELETE", headers: { "if-match": blockedPreflight.body.deletion.revisionToken } }
    );
    assert.equal(blockedDeletion.response.status, 409);
    assert.ok(blockedDeletion.body.conflicts.some(conflict => conflict.type === "audio-plans"));
    assert.equal(fs.existsSync(emptyOutputDirectory), true);
    await adminDatabase.query("DELETE FROM media_audio_anonymization_plans WHERE id = ?", [planId]);
    planId = null;

    const allowedPreflight = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}/derivations/${encodeURIComponent(treatmentId)}`
    );
    assert.equal(allowedPreflight.response.status, 200);
    assert.equal(allowedPreflight.body.deletion.allowed, true);

    const removed = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}/derivations/${encodeURIComponent(treatmentId)}`,
      { method: "DELETE", headers: { "if-match": allowedPreflight.body.deletion.revisionToken } }
    );
    assert.equal(removed.response.status, 200, removed.body.error);
    assert.equal(removed.body.deletedFile, false);
    assert.equal(fs.existsSync(emptyOutputDirectory), false);

    const after = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(asset.assetId)}`);
    assert.equal(after.response.status, 200);
    assert.equal(after.body.asset.versionsAndAccess.derivations.some(item => item.id === playableId), false);
    assert.equal(after.body.asset.usage.otherDependencies.treatments.some(item => item.id === treatmentId), false);
    assert.ok(after.body.asset.playables.some(item => item.id === asset.playableId));
    const [[counts]] = await database.query(
      "SELECT "
        + "(SELECT COUNT(*) FROM media_treatments WHERE id = ?) AS treatments, "
        + "(SELECT COUNT(*) FROM media_playables WHERE id = ?) AS playables, "
        + "(SELECT COUNT(*) FROM media_sources WHERE id = ?) AS sources",
      [treatmentId, playableId, sourceId]
    );
    assert.deepEqual(
      { treatments: Number(counts.treatments), playables: Number(counts.playables), sources: Number(counts.sources) },
      { treatments: 0, playables: 0, sources: 0 }
    );
    await removeRemoteAsset(server, asset.assetId);
    asset = null;
  } finally {
    if (planId) await adminDatabase?.query("DELETE FROM media_audio_anonymization_plans WHERE id = ?", [planId]).catch(() => {});
    await adminDatabase?.end();
    await database?.end();
    if (asset) await removeRemoteAsset(server, asset.assetId).catch(() => {});
    await server.cleanup();
    await origin.close();
  }
});
