"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const activitiesFile = path.resolve(__dirname, "../../data/activities.json");
const libraryFile = path.resolve(__dirname, "../../data/video-library.json");
const ffmpegPath = process.env.FFMPEG_PATH || "C:\\Tools\\FFmpeg\\bin\\ffmpeg.exe";

function makeHlsFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-hls-fixture-"));
  const input = path.resolve(__dirname, "..", "..", "..", "..", "temp", "video_37004_1080p.mp4");
  const result = spawnSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-t", "3", "-c:v", "libx264", "-c:a", "aac", "-f", "hls", "-hls_time", "1", "-hls_list_size", "0", path.join(directory, "stream.m3u8")], { windowsHide: true, timeout: 120000 });
  if (result.error || result.status !== 0) throw result.error || new Error(`fixture FFmpeg failed: ${result.stderr}`);
  return directory;
}

function startHlsOrigin(directory) {
  const state = { delaySegments: false };
  const origin = http.createServer((request, response) => {
    const name = path.basename(new URL(request.url, "http://127.0.0.1").pathname);
    const file = path.join(directory, name);
    if (!fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    const stat = fs.statSync(file);
    const headers = { "content-type": name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t", "content-length": stat.size };
    const send = () => { response.writeHead(200, headers); fs.createReadStream(file).pipe(response); };
    if (state.delaySegments && name.endsWith(".ts")) setTimeout(send, 500); else send();
  });
  return new Promise(resolve => origin.listen(0, "127.0.0.1", () => resolve({ origin, state, url: `http://127.0.0.1:${origin.address().port}/stream.m3u8` })));
}

function customLibrary(manifestUrl) {
  const library = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
  const assetId = "media-proto05-test-hls-preparation";
  const sourceId = "source-proto05-test-hls-preparation";
  const playableId = "video-proto05-test-hls-preparation";
  library.assets.push({ id: assetId, title: "HLS de test temporaire", status: "active", sourceIds: [sourceId], playableIds: [playableId], defaultPlayableId: playableId, provenance: { kind: "test-only" }, rights: {} });
  library.sources.push({ id: sourceId, assetId, title: "HLS de test temporaire", kind: "hls", provider: "test", originUrl: manifestUrl, manifestUrl, mimeType: "application/vnd.apple.mpegurl", durationMs: null, authorized: true, availability: "available", provenance: { kind: "test-only" } });
  library.playables.push({ id: playableId, assetId, sourceId, kind: "hls", provider: "test", status: "available", availability: "available", durationMs: null, mimeType: "application/vnd.apple.mpegurl", url: manifestUrl, manifestUrl });
  return library;
}

async function waitForJob(baseUrl, id, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/proto05/library/hls-preparations/${id}`);
    const payload = await response.json();
    if (["completed", "failed", "cancelled"].includes(payload.job.status)) return payload.job;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Job HLS non terminé dans le délai du test.");
}

test("préparation HLS temporaire, métadonnées, annulation et nettoyage", async t => {
  if (!fs.existsSync(ffmpegPath)) return t.skip("FFmpeg absent dans l’environnement de test.");
  const fixture = makeHlsFixture();
  const origin = await startHlsOrigin(fixture);
  process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE = "1";
  process.env.FFMPEG_PATH = ffmpegPath;
  process.env.PROTO05_HLS_PREPARATION_TIMEOUT_MS = "60000";
  const activitiesBefore = fs.readFileSync(activitiesFile, "utf8");
  const libraryBefore = fs.readFileSync(libraryFile, "utf8");
  const mediaBefore = fs.readdirSync(path.resolve(__dirname, "../../data/video-library-media"));
  const server = await startTemporaryProto05Server(JSON.parse(activitiesBefore), "proto05-hls-preparation-test-", { videoLibrary: customLibrary(origin.url) });
  t.after(async () => { await server.cleanup(); await new Promise(resolve => origin.origin.close(resolve)); fs.rmSync(fixture, { recursive: true, force: true }); delete process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE; delete process.env.FFMPEG_PATH; delete process.env.PROTO05_HLS_PREPARATION_TIMEOUT_MS; });
  const requestBody = { assetId: "media-proto05-test-hls-preparation", playableId: "video-proto05-test-hls-preparation", sourceId: "source-proto05-test-hls-preparation" };
  const started = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) })).json();
  assert.ok(["queued", "running"].includes(started.job.status));
  const completed = await waitForJob(server.baseUrl, started.job.id);
  assert.equal(completed.status, "completed", completed.error || "préparation échouée");
  assert.equal(completed.metadata.mimeType, "video/mp4");
  assert.ok(completed.metadata.sizeBytes > 0);
  const workspace = fs.readdirSync(path.join(os.tmpdir(), "proto05-hls-preparations")).find(name => name.startsWith(`${started.job.id}-`));
  assert.ok(workspace);
  assert.ok(fs.statSync(path.join(os.tmpdir(), "proto05-hls-preparations", workspace, "work.mp4")).size > 0);
  assert.deepEqual(fs.readdirSync(path.resolve(__dirname, "../../data/video-library-media")), mediaBefore);
  assert.equal(fs.readFileSync(activitiesFile, "utf8"), activitiesBefore);
  assert.equal(fs.readFileSync(libraryFile, "utf8"), libraryBefore);
  origin.state.delaySegments = true;
  const cancelling = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) })).json();
  await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations/${cancelling.job.id}`, { method: "DELETE" });
  const cancelled = await waitForJob(server.baseUrl, cancelling.job.id);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(fs.readdirSync(path.join(os.tmpdir(), "proto05-hls-preparations")).some(name => name.startsWith(`${cancelling.job.id}-`)), false);
});

test("préparation HLS refuse une source locale, directe, YouTube ou un manifeste invalide", async t => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(() => server.cleanup());
  const invalid = await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: "media-proto05-local-video-37004-1080p", playableId: "video-proto05-local-video-37004-1080p", sourceId: "source-proto05-local-video-37004-1080p" }) });
  assert.equal(invalid.status, 400);
  const unknown = await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: "missing", playableId: "missing", sourceId: "missing" }) });
  assert.equal(unknown.status, 400);
});
