"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findChromium, readBrowserResults, runChromium } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const prototype = path.resolve(__dirname, "../..");
const activities = JSON.parse(fs.readFileSync(path.join(prototype, "data", "activities.json"), "utf8"));
const fakeFfmpeg = path.join(__dirname, "fixtures", "fake-ffmpeg.js");
const segment = Buffer.from("controlled-hls-segment-video-payload");
const directVideo = Buffer.from("controlled-direct-video-payload");

async function startOrigin() {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push({ method: request.method, url: request.url, range: request.headers.range || null });
    if (request.url === "/master.m3u8") {
      const body = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=1280x720\nmedia.m3u8\n";
      response.writeHead(200, { "content-type": "application/vnd.apple.mpegurl", "content-length": Buffer.byteLength(body) });
      return request.method === "HEAD" ? response.end() : response.end(body);
    }
    if (request.url === "/media.m3u8") {
      const body = "#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nsegment-001.ts\n#EXTINF:6,\nsegment-002.ts\n#EXT-X-ENDLIST\n";
      response.writeHead(200, { "content-type": "application/vnd.apple.mpegurl", "content-length": Buffer.byteLength(body) });
      return request.method === "HEAD" ? response.end() : response.end(body);
    }
    if (request.url === "/segment-001.ts" || request.url === "/segment-002.ts") {
      response.writeHead(200, { "content-type": "video/mp2t", "content-length": segment.length });
      return request.method === "HEAD" ? response.end() : response.end(segment);
    }
    if (request.url === "/direct.mp4") {
      response.writeHead(200, { "content-type": "video/mp4", "content-length": directVideo.length, "accept-ranges": "bytes" });
      return request.method === "HEAD" ? response.end() : response.end(directVideo);
    }
    response.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}`, requests };
}

async function requestJson(baseUrl, pathname, { method = "GET", body } = {}) {
  const response = await fetch(baseUrl + pathname, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { response, body: await response.json() };
}

async function createRemoteReference(baseUrl, url, title) {
  const analyzed = await requestJson(baseUrl, "/api/proto05/library/remote-reference/analyze", { method: "POST", body: { url, title } });
  assert.equal(analyzed.response.status, 200, JSON.stringify(analyzed.body));
  const confirmed = await requestJson(baseUrl, "/api/proto05/library/remote-reference/confirm", { method: "POST", body: { token: analyzed.body.token } });
  assert.equal(confirmed.response.status, 201, JSON.stringify(confirmed.body));
  return confirmed.body;
}

async function waitForJob(baseUrl, id, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await requestJson(baseUrl, `/api/proto05/library/downloads/${encodeURIComponent(id)}`);
    if (["completed", "failed", "cancelled"].includes(result.body.job?.status)) return result.body.job;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error(`La tâche ${id} n'a pas atteint un état terminal.`);
}

function testEnvironment(mode = "success", extra = {}) {
  return {
    PROTO05_TEST_ALLOWED_REMOTE_HOSTS: "127.0.0.1",
    PROTO05_TEST_FFMPEG_SCRIPT: fakeFfmpeg,
    PROTO05_TEST_FFMPEG_MODE: mode,
    PROTO05_REMOTE_REFERENCE_TIMEOUT_MS: "1500",
    ...extra
  };
}

function workspaceTempEntries(server, assetId) {
  const directory = path.join(server.videoLibraryWorkspaceDirectory, assetId, "temp");
  return fs.existsSync(directory) ? fs.readdirSync(directory, { recursive: true }) : [];
}

function chromiumDownloadRunner(assetId) {
  return `<!doctype html><html><body data-test-state="running"><iframe id="library" src="/teacher/videos" style="width:1400px;height:900px"></iframe><script>
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const until=async callback=>{for(let index=0;index<240;index++){const value=callback();if(value)return value;await wait(50);await fetch('/api/health',{cache:'no-store'})}throw new Error('Délai Chromium dépassé')};
  const done=value=>{document.body.dataset.results=encodeURIComponent(JSON.stringify(value));document.body.dataset.testState='done'};
  const fail=error=>{document.body.dataset.error=encodeURIComponent(error.stack||error.message);document.body.dataset.testState='failed'};
  (async()=>{try{
    const frame=document.getElementById('library');await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    const win=frame.contentWindow,doc=frame.contentDocument,errors=[];
    win.addEventListener('error',event=>errors.push(event.message));win.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
    const card=await until(()=>doc.querySelector('[data-asset-card="${assetId}"]'));
    const menuButton=await until(()=>card.querySelector('.asset-secondary-menu>button'));
    const menu=menuButton.nextElementSibling;
    const menusInitiallyClosed=[...doc.querySelectorAll('.asset-delete-menu')].every(item=>item.hidden);
    menuButton.click();
    const download=[...menu.querySelectorAll('button')].find(button=>button.textContent.includes('Créer une copie locale de travail'));
    if(!download)throw new Error('Action de téléchargement absente');
    download.click();
    const panel=await until(()=>doc.querySelector('.download-panel'));
    const start=await until(()=>panel.querySelector('.start-download:not(:disabled)'));
    const summary={type:panel.textContent.includes('HLS'),host:panel.textContent.includes('127.0.0.1'),quality:panel.textContent.includes('1280 × 720'),destination:panel.textContent.includes('Espace de travail'),ffmpeg:panel.textContent.includes('fixture-1.0')};
    start.click();
    const sawProgress=Boolean(await until(()=>panel.querySelector('progress.download-progress')));
    await until(()=>[...doc.querySelectorAll('[data-asset-card="${assetId}"] .asset-delete-menu button')].some(button=>button.textContent.includes('Supprimer la copie de travail')));
    const completed=panel.textContent.includes('Terminé')&&panel.textContent.includes('100 %');
    doc.getElementById('listView').click();await wait(80);const listView=doc.getElementById('assets').classList.contains('list-view');
    doc.getElementById('gridView').click();await wait(80);const gridView=!doc.getElementById('assets').classList.contains('list-view');
    const detailLoaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    frame.src='/teacher/videos/${assetId}';await detailLoaded;
    const detailDoc=frame.contentDocument;
    const workingCard=await until(()=>detailDoc.querySelector('[data-action="workshop"]')?.closest('.access-card'));
    const preview=workingCard.querySelector('[data-action="preview"]');
    preview.click();await until(()=>workingCard.querySelector('.preview-mount video'));
    const previewOpened=!workingCard.querySelector('.preview').hidden;
    done({menusInitiallyClosed,summary,sawProgress,completed,previewOpened,listView,gridView,errors});
  }catch(error){fail(error)}})();
  <\/script></body></html>`;
}

test("un HLS importé traverse le catalogue écrit puis devient une copie locale du même asset", { timeout: 20000 }, async t => {
  const origin = await startOrigin();
  const server = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-hls-", { env: testEnvironment() });
  t.after(async () => {
    await server.cleanup();
    await new Promise(resolve => origin.server.close(resolve));
  });

  const created = await createRemoteReference(server.baseUrl, `${origin.baseUrl}/master.m3u8`, "HLS contrôlé Mission 112");
  await server.restart();
  const before = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
  const remoteAsset = before.assets.find(item => item.id === created.assetId);
  const remoteSource = before.sources.find(item => item.assetId === created.assetId);
  const remotePlayable = before.playables.find(item => item.id === created.playableId);
  assert.equal(remoteSource.role, "original-remote");
  assert.equal(remotePlayable.role, "original-remote");
  const classified = await requestJson(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(created.assetId)}/accesses/${encodeURIComponent(created.playableId)}/role`, { method: "PUT", body: { role: "original-remote" } });
  assert.equal(classified.response.status, 200);
  assert.equal(classified.body.role, "original-remote");
  const publishedAnalysis = await requestJson(server.baseUrl, "/api/proto05/library/remote-reference/analyze", { method: "POST", body: { url: `${origin.baseUrl}/direct.mp4`, title: "Version publiée contrôlée" } });
  assert.equal(publishedAnalysis.response.status, 200);
  const published = await requestJson(server.baseUrl, "/api/proto05/library/remote-reference/confirm", { method: "POST", body: { token: publishedAnalysis.body.token, assetId: created.assetId } });
  assert.equal(published.response.status, 201, JSON.stringify(published.body));
  assert.equal(published.body.role, "published-remote");
  assert.equal(remoteAsset.defaultPlayableId, remotePlayable.id);

  const options = await requestJson(server.baseUrl, `/api/proto05/library/download-options/${encodeURIComponent(created.assetId)}?playableId=${encodeURIComponent(created.playableId)}`);
  assert.equal(options.response.status, 200, JSON.stringify(options.body));
  assert.equal(options.body.sourceKind, "hls");
  assert.equal(options.body.quality, "1280 × 720");
  assert.equal(options.body.durationMs, 12000);
  assert.equal(options.body.ffmpeg.available, true);
  assert.equal(options.body.ffmpeg.candidate, undefined, "aucun chemin serveur ne doit être projeté");

  const started = await requestJson(server.baseUrl, "/api/proto05/library/downloads", {
    method: "POST",
    body: { assetId: created.assetId, playableId: created.playableId, fileName: "hls-controle.mp4" }
  });
  assert.equal(started.response.status, 202, JSON.stringify(started.body));
  const job = await waitForJob(server.baseUrl, started.body.job.id);
  assert.equal(job.status, "completed", job.error);
  assert.equal(job.progress, 100);
  assert.equal(job.result.assetId, created.assetId);

  const after = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
  const asset = after.assets.find(item => item.id === created.assetId);
  const sources = after.sources.filter(item => item.assetId === created.assetId);
  const playables = after.playables.filter(item => item.assetId === created.assetId);
  assert.equal(sources.length, 3);
  assert.equal(playables.length, 3);
  assert.deepEqual(after.sources.find(item => item.id === remoteSource.id), remoteSource, "la provenance distante reste intacte");
  assert.deepEqual(after.playables.find(item => item.id === remotePlayable.id), remotePlayable, "le playable distant reste intact");
  assert.equal(asset.title, remoteAsset.title);
  assert.equal(asset.folderId, remoteAsset.folderId);
  assert.deepEqual(asset.tagIds, remoteAsset.tagIds);
  assert.equal(asset.defaultPlayableId, remotePlayable.id);
  assert.ok(fs.existsSync(path.join(server.videoLibraryWorkspaceDirectory, job.result.storageKey)));
  assert.equal(playables.find(item => item.id === job.result.playableId).role, "working-copy");
  assert.equal(playables.find(item => item.id === job.result.playableId).location.storageScope, "workspace");
  assert.equal(playables.find(item => item.id === published.body.playableId).role, "published-remote");
  assert.equal(fs.existsSync(path.join(server.videoLibraryWorkspaceDirectory, created.assetId, "temp")), true);

  const listed = await requestJson(server.baseUrl, "/api/proto05/library/assets");
  const projected = listed.body.assets.find(item => item.id === created.assetId);
  assert.equal(projected.defaultPlayableId, remotePlayable.id);
  assert.equal(projected.localCopies.length, 1);
  assert.equal(projected.download.canDownload, false);
  const localPlayable = projected.playables.find(item => item.id === job.result.playableId);
  assert.match(localPlayable.url, /^\/api\/proto05\/library\/media\//);
  const preview = await fetch(server.baseUrl + localPlayable.url);
  assert.equal(preview.status, 200);
  assert.ok((await preview.arrayBuffer()).byteLength > 0);
  assert.ok(origin.requests.some(item => item.url === "/media.m3u8"));
  assert.ok(origin.requests.some(item => item.url === "/segment-001.ts"));

  const removed = await requestJson(server.baseUrl, `/api/proto05/library/assets/${encodeURIComponent(created.assetId)}/local-copies/${encodeURIComponent(job.result.playableId)}`, { method: "DELETE" });
  assert.equal(removed.response.status, 200, JSON.stringify(removed.body));
  const restored = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
  assert.ok(restored.assets.some(item => item.id === created.assetId));
  assert.ok(restored.sources.some(item => item.id === remoteSource.id));
  assert.ok(restored.playables.some(item => item.id === created.playableId));
  assert.ok(restored.playables.some(item => item.id === published.body.playableId));
  assert.equal(restored.assets.find(item => item.id === created.assetId).defaultPlayableId, created.playableId);
  assert.equal(fs.existsSync(path.join(server.videoLibraryWorkspaceDirectory, job.result.storageKey)), false);
});

test("une URL vidéo directe utilise la même tâche FFmpeg et devient immédiatement prévisualisable", { timeout: 15000 }, async t => {
  const origin = await startOrigin();
  const server = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-direct-", { env: testEnvironment() });
  t.after(async () => {
    await server.cleanup();
    await new Promise(resolve => origin.server.close(resolve));
  });
  const created = await createRemoteReference(server.baseUrl, `${origin.baseUrl}/direct.mp4`, "Direct contrôlé");
  const started = await requestJson(server.baseUrl, "/api/proto05/library/downloads", {
    method: "POST", body: { assetId: created.assetId, playableId: created.playableId, fileName: "direct-controle.mp4" }
  });
  assert.equal(started.response.status, 202, JSON.stringify(started.body));
  const job = await waitForJob(server.baseUrl, started.body.job.id);
  assert.equal(job.status, "completed", job.error);
  const listed = await requestJson(server.baseUrl, "/api/proto05/library/assets");
  const asset = listed.body.assets.find(item => item.id === created.assetId);
  assert.equal(asset.playables.find(item => item.id === asset.defaultPlayableId).kind, "direct-url");
  assert.ok(origin.requests.some(item => item.method === "HEAD" && item.url === "/direct.mp4"));
  assert.ok(origin.requests.some(item => item.method === "GET" && item.url === "/direct.mp4"));
});

test("une source HLS canonique historique provider UGA est résolue depuis son URL d'origine", { timeout: 15000 }, async t => {
  const origin = await startOrigin();
  const server = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-uga-", { env: testEnvironment() });
  t.after(async () => {
    await server.cleanup();
    await new Promise(resolve => origin.server.close(resolve));
  });
  const manifestUrl = `${origin.baseUrl}/master.m3u8`;
  const created = await createRemoteReference(server.baseUrl, manifestUrl, "HLS UGA historique contrôlé");
  await server.stop();
  const canonical = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
  const source = canonical.sources.find(item => item.assetId === created.assetId);
  const playable = canonical.playables.find(item => item.id === created.playableId);
  source.provider = "uga";
  source.origin = { ...(source.origin || {}), originUrl: manifestUrl };
  playable.provider = "uga";
  playable.location = { url: "/api/hls/fixture/master.m3u8", manifestUrl: "/api/hls/fixture/master.m3u8" };
  fs.writeFileSync(server.videoLibraryFile, `${JSON.stringify(canonical, null, 2)}\n`, "utf8");
  await server.restart();
  const options = await requestJson(server.baseUrl, `/api/proto05/library/download-options/${encodeURIComponent(created.assetId)}?playableId=${encodeURIComponent(created.playableId)}`);
  assert.equal(options.response.status, 200, JSON.stringify(options.body));
  assert.equal(options.body.quality, "1280 × 720");
});

test("FFmpeg absent, noms invalides, échec et sortie illisible restent sans effet canonique", { timeout: 25000 }, async t => {
  const origin = await startOrigin();
  t.after(() => new Promise(resolve => origin.server.close(resolve)));

  const unavailable = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-absent-", {
    env: {
      PROTO05_TEST_ALLOWED_REMOTE_HOSTS: "127.0.0.1",
      PROTO05_TEST_DISABLE_PATH_FFMPEG: "1",
      FFMPEG_PATH: "",
      PROTO05_FFMPEG_PATH: ""
    }
  });
  t.after(() => unavailable.cleanup());
  const absentReference = await createRemoteReference(unavailable.baseUrl, `${origin.baseUrl}/direct.mp4`, "FFmpeg absent");
  const status = await requestJson(unavailable.baseUrl, "/api/proto05/library/ffmpeg");
  assert.equal(status.body.ffmpeg.available, false);
  const invalidConfiguration = await requestJson(unavailable.baseUrl, "/api/proto05/library/ffmpeg", { method: "PUT", body: { path: path.join(unavailable.root, "not-ffmpeg.txt") } });
  assert.equal(invalidConfiguration.response.status, 400);
  const absentStart = await requestJson(unavailable.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: absentReference.assetId, playableId: absentReference.playableId, fileName: "absent.mp4" } });
  assert.equal(absentStart.response.status, 503);
  await unavailable.cleanup();

  for (const mode of ["fail", "invalid"]) {
    const server = await startTemporaryProto05Server(structuredClone(activities), `proto05-library-download-${mode}-`, { env: testEnvironment(mode) });
    t.after(() => server.cleanup());
    const created = await createRemoteReference(server.baseUrl, `${origin.baseUrl}/direct.mp4`, `Mode ${mode}`);
    const before = fs.readFileSync(server.videoLibraryFile, "utf8");
    const traversal = await requestJson(server.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: created.assetId, playableId: created.playableId, fileName: "../escape.mp4" } });
    assert.equal(traversal.response.status, 400);
    const started = await requestJson(server.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: created.assetId, playableId: created.playableId, fileName: `${mode}.mp4` } });
    assert.equal(started.response.status, 202);
    const job = await waitForJob(server.baseUrl, started.body.job.id);
    assert.equal(job.status, "failed");
    assert.equal(fs.readFileSync(server.videoLibraryFile, "utf8"), before);
    assert.deepEqual(workspaceTempEntries(server, created.assetId), []);
    await server.cleanup();
  }
});

test("annuler une tâche lente termine son arbre et nettoie tous ses temporaires", { timeout: 15000 }, async t => {
  const origin = await startOrigin();
  const childPidFile = path.join(process.cwd(), `tmp-proto05-child-${process.pid}.txt`);
  const server = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-cancel-", {
    env: testEnvironment("slow-child", { PROTO05_TEST_CHILD_PID_FILE: childPidFile })
  });
  t.after(async () => {
    await server.cleanup();
    await new Promise(resolve => origin.server.close(resolve));
    fs.rmSync(childPidFile, { force: true });
  });
  const created = await createRemoteReference(server.baseUrl, `${origin.baseUrl}/direct.mp4`, "Annulation contrôlée");
  const before = fs.readFileSync(server.videoLibraryFile, "utf8");
  const started = await requestJson(server.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: created.assetId, playableId: created.playableId, fileName: "annulation.mp4" } });
  assert.equal(started.response.status, 202);
  const concurrent = await requestJson(server.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: created.assetId, playableId: created.playableId, fileName: "concurrent.mp4" } });
  assert.equal(concurrent.response.status, 409);
  const pidDeadline = Date.now() + 3000;
  while (!fs.existsSync(childPidFile) && Date.now() < pidDeadline) await new Promise(resolve => setTimeout(resolve, 30));
  assert.ok(fs.existsSync(childPidFile));
  const cancelled = await requestJson(server.baseUrl, `/api/proto05/library/downloads/${encodeURIComponent(started.body.job.id)}`, { method: "DELETE" });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.job.status, "cancelled");
  assert.equal(fs.readFileSync(server.videoLibraryFile, "utf8"), before);
  assert.deepEqual(workspaceTempEntries(server, created.assetId), []);
  const childPid = Number(fs.readFileSync(childPidFile, "utf8"));
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.throws(() => process.kill(childPid, 0), /ESRCH|not permitted|no such process/i);
});

test("timeout, collision et arrêt serveur ne publient jamais de copie partielle", { timeout: 25000 }, async t => {
  const origin = await startOrigin();
  t.after(() => new Promise(resolve => origin.server.close(resolve)));

  const timeoutServer = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-timeout-", {
    env: testEnvironment("slow", { PROTO05_LIBRARY_DOWNLOAD_TIMEOUT_MS: "250" })
  });
  t.after(() => timeoutServer.cleanup());
  const timeoutReference = await createRemoteReference(timeoutServer.baseUrl, `${origin.baseUrl}/direct.mp4`, "Timeout contrôlé");
  const timeoutBefore = fs.readFileSync(timeoutServer.videoLibraryFile, "utf8");
  const timeoutStart = await requestJson(timeoutServer.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: timeoutReference.assetId, playableId: timeoutReference.playableId, fileName: "timeout.mp4" } });
  const timedOut = await waitForJob(timeoutServer.baseUrl, timeoutStart.body.job.id);
  assert.equal(timedOut.status, "failed");
  assert.match(timedOut.error, /durée maximale/);
  assert.equal(fs.readFileSync(timeoutServer.videoLibraryFile, "utf8"), timeoutBefore);
  assert.deepEqual(workspaceTempEntries(timeoutServer, timeoutReference.assetId), []);
  await timeoutServer.cleanup();

  const collisionServer = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-collision-", { env: testEnvironment() });
  t.after(() => collisionServer.cleanup());
  const collisionReference = await createRemoteReference(collisionServer.baseUrl, `${origin.baseUrl}/direct.mp4`, "Collision contrôlée");
  const collisionKey = `${crypto.createHash("sha256").update(directVideo).digest("hex").slice(0, 16)}-collision.mp4`;
  const collisionPath = path.join(collisionServer.videoLibraryWorkspaceDirectory, collisionReference.assetId, "source", collisionKey);
  fs.mkdirSync(path.dirname(collisionPath), { recursive: true });
  fs.writeFileSync(collisionPath, Buffer.from("existing-controlled-file"));
  const collisionBefore = fs.readFileSync(collisionServer.videoLibraryFile, "utf8");
  const collisionStart = await requestJson(collisionServer.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: collisionReference.assetId, playableId: collisionReference.playableId, fileName: "collision.mp4" } });
  const collision = await waitForJob(collisionServer.baseUrl, collisionStart.body.job.id);
  assert.equal(collision.status, "failed");
  assert.match(collision.error, /destination/);
  assert.equal(fs.readFileSync(collisionServer.videoLibraryFile, "utf8"), collisionBefore);
  assert.deepEqual(fs.readFileSync(collisionPath), Buffer.from("existing-controlled-file"));
  await collisionServer.cleanup();

  const shutdownServer = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-shutdown-", { env: testEnvironment("slow") });
  t.after(() => shutdownServer.cleanup());
  const shutdownReference = await createRemoteReference(shutdownServer.baseUrl, `${origin.baseUrl}/direct.mp4`, "Arrêt contrôlé");
  const shutdownBefore = fs.readFileSync(shutdownServer.videoLibraryFile, "utf8");
  const shutdownStart = await requestJson(shutdownServer.baseUrl, "/api/proto05/library/downloads", { method: "POST", body: { assetId: shutdownReference.assetId, playableId: shutdownReference.playableId, fileName: "shutdown.mp4" } });
  assert.equal(shutdownStart.response.status, 202);
  await new Promise(resolve => setTimeout(resolve, 180));
  await shutdownServer.stop();
  assert.equal(fs.readFileSync(shutdownServer.videoLibraryFile, "utf8"), shutdownBefore);
  await shutdownServer.restart();
  assert.deepEqual(workspaceTempEntries(shutdownServer, shutdownReference.assetId), []);
  await shutdownServer.cleanup();
});

test("Chromium télécharge un HLS depuis Actions, suit la progression et ouvre aussitôt l'aperçu local", { timeout: 30000 }, async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la recette Mission 112.");
  const origin = await startOrigin();
  const server = await startTemporaryProto05Server(structuredClone(activities), "proto05-library-download-chromium-", { env: testEnvironment() });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-library-download-profile-"));
  try {
    const created = await createRemoteReference(server.baseUrl, `${origin.baseUrl}/master.m3u8`, "HLS Chromium Mission 112");
    fs.writeFileSync(path.join(server.root, "prototype", "download-runner.html"), chromiumDownloadRunner(created.assetId), "utf8");
    const dom = await runChromium(chromium, `${server.baseUrl}/download-runner.html`, profile, { virtualTimeBudget: 15000, timeout: 25000, windowSize: "1440,1000" });
    const result = readBrowserResults(dom);
    assert.equal(result.menusInitiallyClosed, true);
    assert.deepEqual(result.summary, { type: true, host: true, quality: true, destination: true, ffmpeg: true });
    assert.equal(result.sawProgress, true);
    assert.equal(result.completed, true);
    assert.equal(result.previewOpened, true);
    assert.equal(result.listView, true);
    assert.equal(result.gridView, true);
    assert.deepEqual(result.errors, []);
    context.diagnostic(`Recette Chromium Mission 112 exécutée avec ${chromium}.`);
  } finally {
    await server.cleanup();
    await new Promise(resolve => origin.server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
  }
});

test("le serveur invoque explicitement FFmpeg sans shell", () => {
  const source = fs.readFileSync(path.join(prototype, "server", "server.js"), "utf8");
  const downloadRunner = source.match(/async function runLibraryDownload[\s\S]*?\nfunction trimLibraryDownloadHistory/)?.[0] || "";
  assert.match(downloadRunner, /spawn\(ffmpegStatus\.program\.executable, args, \{[\s\S]*?shell: false/);
  assert.match(source, /spawnSync\(program\.executable,[\s\S]*?shell: false/);
  assert.match(downloadRunner, /"-protocol_whitelist", "http,https,tcp,tls,crypto"/);
  assert.doesNotMatch(downloadRunner, /"-protocol_whitelist", "[^"]*file/);
  assert.match(source, /error\?\.code === "ENOSPC"/);
  assert.match(source, /\["EACCES", "EPERM"\]\.includes/);
  assert.doesNotMatch(source, /spawn\(ffmpegStatus\.program\.executable,[\s\S]*?shell: true/);
});
