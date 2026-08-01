"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");
const {
  cleanupDownloadWorkspace,
  createDownloadWorkspace,
  publishDownloadedFile
} = require("../library-download-finalization");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.join(prototypeDirectory, "data", "video-library-workspaces");
const fakeFfmpeg = path.join(__dirname, "fixtures", "fake-ffmpeg.js");

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
  assert.equal(confirmed.response.status, 201, confirmed.body.error);
  return { assetId: confirmed.body.assetId, playableId: confirmed.body.playableId };
}

async function removeRemoteAsset(server, assetId) {
  let detail = await request(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(assetId)}`);
  if (detail.response.status === 404) return;
  for (const copy of detail.body.asset.localCopies || []) {
    const removed = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(assetId)}/local-copies/${encodeURIComponent(copy.playableId)}`,
      { method: "DELETE" }
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
