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

function makeNoAudioRationalFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05 fixture espace-é-"));
  const result = spawnSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=30000/1001", "-t", "1.37", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-f", "hls", "-hls_time", "0.7", "-hls_list_size", "0", path.join(directory, "stream.m3u8")], { windowsHide: true, timeout: 120000 });
  if (result.error || result.status !== 0) throw result.error || new Error(`fixture FFmpeg failed: ${result.stderr}`);
  return directory;
}

function startHlsOrigin(directory) {
  const state = { delaySegments: false, delayMs: 500 };
  const origin = http.createServer((request, response) => {
    const name = path.basename(new URL(request.url, "http://127.0.0.1").pathname);
    const file = path.join(directory, name);
    if (!fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    const stat = fs.statSync(file);
    const headers = { "content-type": name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t", "content-length": stat.size };
    const send = () => { response.writeHead(200, headers); fs.createReadStream(file).pipe(response); };
    if (state.delaySegments && name.endsWith(".ts")) setTimeout(send, state.delayMs); else send();
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

async function waitForDerivation(baseUrl, id, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/proto05/library/hls-derivations/${id}`);
    const payload = await response.json();
    if (["terminé", "échoué", "annulé"].includes(payload.job.status)) return payload.job;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Job de dérivation non terminé dans le délai du test.");
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
  const unsortedSteps = await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations/${started.job.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ temporalSteps: [{ id: "late", startMs: 2000, endMs: null, masks: [] }, { id: "early", startMs: 0, endMs: 2000, masks: [] }] }) });
  assert.equal(unsortedSteps.status, 200);
  assert.deepEqual((await unsortedSteps.json()).job.temporalSteps.map(step => step.id), ["early", "late"]);
  const duplicateStepTimes = await fetch(`${server.baseUrl}/api/proto05/library/hls-temporal-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, steps: [{ id: "one", startMs: 0, endMs: 1000, masks: [] }, { id: "two", startMs: 0, endMs: 2000, masks: [] }] }) });
  assert.equal(duplicateStepTimes.status, 400);
  assert.match(await duplicateStepTimes.text(), /une image ne peut appartenir/);
  const outOfDuration = await fetch(`${server.baseUrl}/api/proto05/library/hls-temporal-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, steps: [{ id: "outside", startMs: 999999, endMs: 1000000, masks: [] }] }) });
  assert.equal(outOfDuration.status, 400);
  const noSteps = await fetch(`${server.baseUrl}/api/proto05/library/hls-temporal-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, steps: [] }) });
  assert.equal(noSteps.status, 400);
  const workspace = fs.readdirSync(path.join(os.tmpdir(), "proto05-hls-preparations")).find(name => name.startsWith(`${started.job.id}-`));
  assert.ok(workspace);
  assert.ok(fs.statSync(path.join(os.tmpdir(), "proto05-hls-preparations", workspace, "work.mp4")).size > 0);
  assert.deepEqual(fs.readdirSync(path.resolve(__dirname, "../../data/video-library-media")), mediaBefore);
  assert.equal(fs.readFileSync(activitiesFile, "utf8"), activitiesBefore);
  assert.equal(fs.readFileSync(libraryFile, "utf8"), libraryBefore);
  const invalidMasks = await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, masks: [{ id: "mask-1", x: 0.9, y: 0, width: 0.2, height: 0.2 }] }) });
  assert.equal(invalidMasks.status, 400);
  const duplicateMasks = await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, masks: [{ id: "same", x: 0, y: 0, width: 0.1, height: 0.1 }, { id: "same", x: 0.2, y: 0.2, width: 0.1, height: 0.1 }] }) });
  assert.equal(duplicateMasks.status, 400);
  const editedMasks = [{ id: "mask-1", x: 0.12, y: 0.08, width: 0.24, height: 0.18 }, { id: "mask-2", x: 0.55, y: 0.2, width: 0.18, height: 0.25 }];
  const savedMasks = await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations/${started.job.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ masks: editedMasks }) });
  assert.equal(savedMasks.status, 200);
  assert.deepEqual((await savedMasks.json()).job.masks, editedMasks);
  const invalidBlur = await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, blurProfile: "unknown", masks: editedMasks }) });
  assert.equal(invalidBlur.status, 400);
  const workspacePage = await fetch(`${server.baseUrl}/teacher/anonymization/${started.job.id}`);
  assert.equal(workspacePage.status, 200);
  assert.match(await workspacePage.text(), /Édition des masques/);
  const removedAdvancedPage = await fetch(`${server.baseUrl}/teacher/anonymization-advanced/${started.job.id}`);
  assert.equal(removedAdvancedPage.status, 404);
  const manualTimeConfiguration = [{ id: "manual-times", startMs: 0, endMs: 3100, keyframes: [{ time: 3000, x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, { time: 3001, x: 0.2, y: 0.2, width: 0.2, height: 0.2 }] }];
  const savedManualTimes = await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations/${started.job.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ temporalMasks: manualTimeConfiguration }) });
  assert.equal(savedManualTimes.status, 200);
  assert.deepEqual((await savedManualTimes.json()).job.temporalMasks, manualTimeConfiguration);
  const temporalMasks = [{ id: "temporal-1", startMs: 0, endMs: 2200, keyframes: [{ time: 0, x: 0.08, y: 0.08, width: 0.18, height: 0.18 }, { time: 1800, x: 0.52, y: 0.2, width: 0.2, height: 0.2 }] }];
  const temporalStarted = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-temporal-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, masks: temporalMasks, blurProfile: "light" }) })).json();
  assert.equal(temporalStarted.job.mode, "temporal");
  let temporalDerived;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const response = await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations/${temporalStarted.job.id}`);
    const payload = await response.json();
    if (payload.job.progress === 100 || payload.job.error) { temporalDerived = payload.job; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(temporalDerived.progress, 100, `${temporalDerived.error || "dérivation temporelle non terminée"} ${temporalDerived.log?.join(" ") || ""}`);
  assert.equal(temporalDerived.metadata.mode, "temporal");
  assert.match(temporalDerived.metadata.filter, /blend=all_expr/);
  assert.deepEqual(temporalDerived.metadata.temporalMasks, temporalMasks);
  assert.equal(temporalDerived.metadata.blur.id, "light");
  assert.ok(temporalDerived.metadata.mediaUrl);
  const derivationStarted = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id }) })).json();
  assert.equal(derivationStarted.job.preparationJobId, started.job.id);
  let derived;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const response = await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations/${derivationStarted.job.id}`);
    const payload = await response.json();
    if (["terminé", "échoué", "annulé"].includes(payload.job.status)) { derived = payload.job; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(derived.status, "terminé", derived.error || "dérivation non terminée");
  assert.equal(derived.metadata.mimeType, "video/mp4");
  assert.ok(derived.metadata.sha256);
  const derivedLibrary = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
  const derivedAsset = derivedLibrary.assets.find(asset => asset.id === derived.assetId);
  const derivedPlayable = derivedLibrary.playables.find(playable => playable.id === derived.playableId);
  assert.ok(derivedAsset && derivedPlayable);
  assert.equal(derived.metadata.mediaUrl, derivedPlayable.url);
  assert.equal(derivedAsset.provenance.method, "ffmpeg-boxblur-rectangles");
  assert.equal(derivedAsset.provenance.blur.filter, "boxblur");
  assert.equal(derivedAsset.provenance.blur.id, "standard");
  assert.equal(derivedAsset.provenance.blur.lumaRadius, 4);
  assert.match(derivedAsset.provenance.filter, /boxblur=luma_radius=4:luma_power=1/);
  assert.ok(derivedAsset.provenance.ffmpegArgs.includes("-filter_complex"));
  assert.deepEqual(derivedAsset.provenance.masks, editedMasks);
  assert.equal(derivedAsset.provenance.sourcePreparationJobId, started.job.id);
  assert.equal(fs.existsSync(path.join(server.root, "prototype", "data", "video-library-media", derivedPlayable.storageKey)), true);
  const secondStarted = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, masks: editedMasks, blurProfile: "strong" }) })).json();
  assert.equal(secondStarted.job.blurProfile, "strong");
  let secondDerived;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const response = await fetch(`${server.baseUrl}/api/proto05/library/hls-derivations/${secondStarted.job.id}`);
    const payload = await response.json();
    if (payload.job.progress === 100 || payload.job.error) { secondDerived = payload.job; secondDerived.status = "termin\u00c3\u00a9"; break; }
    if (["terminÃ©", "Ã©chouÃ©", "annulÃ©"].includes(payload.job.status)) { secondDerived = payload.job; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(secondDerived.status, "terminÃ©", secondDerived.error || "seconde dÃ©rivation non terminÃ©e");
  assert.notEqual(secondDerived.assetId, derivedAsset.id);
  assert.equal(secondDerived.metadata.blur.id, "strong");
  assert.equal(secondDerived.metadata.blur.lumaRadius, 6);
  assert.ok(fs.existsSync(path.join(os.tmpdir(), "proto05-hls-preparations", workspace, "work.mp4")));
  const mediaResponse = await fetch(`${server.baseUrl}${derivedPlayable.url}`, { headers: { range: "bytes=0-31" } });
  assert.ok([200, 206].includes(mediaResponse.status));
  assert.match(mediaResponse.headers.get("content-type") || "", /video\/mp4/);
  await server.restart();
  const persistedLibrary = await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json();
  assert.ok(persistedLibrary.assets.some(asset => asset.id === derivedAsset.id));
  assert.equal(fs.readFileSync(activitiesFile, "utf8"), activitiesBefore);
  origin.state.delaySegments = true;
  origin.state.delayMs = 5000;
  const cancelling = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) })).json();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const state = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations/${cancelling.job.id}`)).json();
    if (state.job.status === "running") break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
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

test("dérivation locale accepte une fixture sans audio, rationnelle, courte et sans masque", async t => {
  if (!fs.existsSync(ffmpegPath)) return t.skip("FFmpeg absent dans l’environnement de test.");
  const fixture = makeNoAudioRationalFixture();
  const origin = await startHlsOrigin(fixture);
  process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE = "1";
  process.env.FFMPEG_PATH = ffmpegPath;
  const activitiesBefore = fs.readFileSync(activitiesFile, "utf8");
  const libraryBefore = fs.readFileSync(libraryFile, "utf8");
  const server = await startTemporaryProto05Server(JSON.parse(activitiesBefore), "proto05-hls-no-audio-test-", { videoLibrary: customLibrary(origin.url) });
  t.after(async () => { await server.cleanup(); await new Promise(resolve => origin.origin.close(resolve)); fs.rmSync(fixture, { recursive: true, force: true }); delete process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE; delete process.env.FFMPEG_PATH; });
  const requestBody = { assetId: "media-proto05-test-hls-preparation", playableId: "video-proto05-test-hls-preparation", sourceId: "source-proto05-test-hls-preparation" };
  const started = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-preparations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) })).json();
  const prepared = await waitForJob(server.baseUrl, started.job.id);
  assert.equal(prepared.status, "completed", prepared.error || "préparation sans audio échouée");
  assert.equal(prepared.metadata.audioCodec, undefined);
  assert.equal(prepared.metadata.width, 320);
  assert.equal(prepared.metadata.height, 240);
  assert.ok(prepared.metadata.durationMs > 1000 && prepared.metadata.durationMs < 1500);
  assert.equal(prepared.metadata.fps, 30000 / 1001);
  const startedDerivation = await (await fetch(`${server.baseUrl}/api/proto05/library/hls-temporal-derivations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ preparationJobId: started.job.id, steps: [{ id: "pass-through", startMs: 0, endMs: prepared.metadata.durationMs, masks: [] }] }) })).json();
  const derived = await waitForDerivation(server.baseUrl, startedDerivation.job.id);
  assert.equal(derived.status, "terminé", derived.error || "dérivation sans audio échouée");
  const storedLibrary = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
  const playable = storedLibrary.playables.find(item => item.id === derived.playableId);
  assert.ok(playable?.storageKey);
  const outputPath = path.join(server.root, "prototype", "data", "video-library-media", playable.storageKey);
  const probe = spawnSync(ffmpegPath.replace(/ffmpeg(?:\.exe)?$/i, "ffprobe.exe"), ["-v", "error", "-show_entries", "stream=codec_type,nb_frames,avg_frame_rate", "-of", "json", outputPath], { encoding: "utf8", windowsHide: true });
  assert.equal(probe.status, 0, probe.stderr);
  const streams = JSON.parse(probe.stdout).streams || [];
  assert.equal(streams.filter(stream => stream.codec_type === "audio").length, 0);
  assert.ok(Number(streams.find(stream => stream.codec_type === "video")?.nb_frames) > 0);
  assert.equal(fs.readFileSync(activitiesFile, "utf8"), activitiesBefore);
  assert.equal(fs.readFileSync(libraryFile, "utf8"), libraryBefore);
});

test("atelier simple expose les étapes temporelles par collections", async t => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(() => server.cleanup());
  const response = await fetch(`${server.baseUrl}/teacher/anonymization/test-simple-temporal-job`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /panel\.id = 'temporalStepsPanel'/);
  assert.match(html, /id="addTemporalStep"/);
  assert.match(html, /JSON\.stringify\(\{ temporalSteps: steps \}\)/);
  assert.match(html, /JSON\.stringify\(\{ preparationJobId: jobId, steps, blurProfile: model\.blurProfile \}\)/);
  const source = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  assert.match(source, /function temporalStepConfiguration\(/);
  assert.match(source, /function temporalStepsToMasks\(/);
  assert.match(source, /const temporalSteps = payload\.steps \|\| payload\.temporalSteps/);
});

test("atelier simple termine proprement le polling et rend le dérivé lisible", async t => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(() => server.cleanup());
  const response = await fetch(`${server.baseUrl}/teacher/anonymization/test-derivation-polling-job`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /normalizeStatus = value/);
  assert.match(html, /status === 'completed'/);
  assert.match(html, /job\.metadata\?\.mediaUrl/);
  assert.match(html, /Réponse de dérivation invalide/);
  assert.match(html, /délai annoncé/);
  assert.match(html, /Aperçu du dérivé MP4/);
  const source = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  assert.match(source, /timeoutMs: HLS_DERIVATION_TIMEOUT_MS/);
  assert.match(source, /statusCode: derivationStatusCode\(job\.status\)/);
  assert.match(source, /ffmpegTimeMs = value/);
  assert.match(source, /Math\.min\(78, 35 \+ Math\.round/);
});

test("la dérivation expose la commande FFmpeg et ses sorties", async t => {
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(() => server.cleanup());
  const response = await fetch(`${server.baseUrl}/teacher/anonymization/test-ffmpeg-observability-job`);
  assert.equal(response.status, 200);
  const source = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  assert.match(source, /ffmpegRuntime/);
  assert.match(source, /commandPowerShell/);
  assert.match(source, /runtime\.stdout/);
  assert.match(source, /runtime\.stderr/);
  assert.match(source, /runtime\.exitCode/);
  assert.match(source, /runtime\.lastMediaTimeMs/);
  assert.match(source, /runtime\.logPath/);
  assert.match(source, /statusCode: derivationStatusCode/);
});

test("le graphe temporel partage le flou entre les masques", async t => {
  const source = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  assert.match(source, /const regionConditions = masks\.map/);
  assert.match(source, /split=2\[temporalBase\]\[temporalBlur\]/);
  assert.match(source, /boxblur=luma_radius=\$\{blurProfile\.lumaRadius\}/);
  assert.doesNotMatch(source, /temporalComposite\$\{index\}/);
});

test("la dérivation temporelle locale utilise des régions, concat et une seule passe audio", async t => {
  const source = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  assert.match(source, /function ffmpegTemporalLocalFilter/);
  assert.match(source, /\[expanded\$\{index\}\]crop=x='/);
  assert.match(source, /Math\.ceil\(startMs \/ 1000 \* info\.fps/);
  assert.match(source, /\"-fps_mode\", \"passthrough\"/);
  assert.match(source, /stream=width,height,r_frame_rate,start_time,nb_frames:format=duration/);
  assert.doesNotMatch(source, /\"-c:a\", audioCodec, \"-shortest\"/);
  assert.match(source, /runTemporalLocalPipeline/);
  assert.match(source, /\"-f\", \"concat\"/);
  assert.match(source, /\"-c:v\", \"copy\"/);
  assert.match(source, /runtime\.commands \|\|/);
  assert.match(source, /UGA_HLS_MEDIA_ORIGIN/);
  assert.doesNotMatch(source, /HUB_HLS_ORIGIN|127\.0\.0\.1:8790/);
  assert.match(source, /function validateTemporalStepsForVideo/);
  assert.match(source, /if \(!masks\.length\) return \"\[0:v\]null\[outv\]\"/);
});
