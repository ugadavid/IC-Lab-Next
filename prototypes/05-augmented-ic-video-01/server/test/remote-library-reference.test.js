"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const activitiesFile = path.resolve(__dirname, "../../data/activities.json");
const master = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nmedia.m3u8?quality=720\n";
const media = "#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.0,\nsegment-001.ts\n#EXT-X-ENDLIST\n";
const direct = Buffer.from("controlled direct video bytes");
const segment = Buffer.from("controlled hls segment bytes");

function reply(request, response, status, headers, body = "") {
  response.writeHead(status, headers);
  response.end(request.method === "HEAD" ? undefined : body);
}

function startOrigin() {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push({ method: request.method, url: request.url, range: request.headers.range || null });
    const pathname = new URL(request.url, "http://fixture.test").pathname;
    if (pathname === "/master.m3u8") return reply(request, response, 200, { "content-type": "application/vnd.apple.mpegurl" }, master);
    if (pathname === "/media.m3u8" || pathname === "/media") return reply(request, response, 200, { "content-type": "application/octet-stream" }, media);
    if (pathname === "/segment-001.ts") {
      const ranged = Boolean(request.headers.range);
      return reply(request, response, ranged ? 206 : 200, {
        "content-type": "video/mp2t",
        "accept-ranges": "bytes",
        "content-length": segment.length,
        ...(ranged ? { "content-range": `bytes 0-${segment.length - 1}/${segment.length}` } : {})
      }, segment);
    }
    if (pathname === "/direct.mp4") return reply(request, response, 200, { "content-type": "video/mp4", "content-length": direct.length }, direct);
    if (pathname === "/head-fallback.mp4") {
      if (request.method === "HEAD") return reply(request, response, 405, {});
      return reply(request, response, 206, { "content-type": "video/mp4", "content-length": direct.length }, direct);
    }
    if (pathname === "/redirect") return reply(request, response, 302, { location: "/master.m3u8?token=kept" });
    if (pathname === "/redirect-private") return reply(request, response, 302, { location: `http://127.0.0.2:${server.address().port}/direct.mp4` });
    if (pathname.startsWith("/loop/")) {
      const hop = Number(pathname.split("/").pop());
      return reply(request, response, 302, { location: `/loop/${hop + 1}` });
    }
    if (pathname === "/html") return reply(request, response, 200, { "content-type": "text/html" }, "<!doctype html><title>not video</title>");
    if (pathname === "/invalid.m3u8") return reply(request, response, 200, { "content-type": "application/vnd.apple.mpegurl" }, "#EXTM3U\n# comment only\n");
    if (pathname === "/large-playlist") return reply(request, response, 200, { "content-type": "application/vnd.apple.mpegurl" }, `#EXTM3U\n#${"x".repeat(300 * 1024)}\n`);
    if (pathname === "/auth") return reply(request, response, 403, {});
    if (pathname === "/slow") return setTimeout(() => reply(request, response, 200, { "content-type": "video/mp4" }, direct), 250);
    return reply(request, response, 404, {});
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({
    server,
    requests,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  })));
}

async function jsonRequest(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { response, payload: await response.json() };
}

async function initializeProjectedHlsPreview(playable) {
  const instances = [];
  class FakeHls {
    static Events = { MEDIA_ATTACHED: "mediaAttached", MANIFEST_PARSED: "manifestParsed", ERROR: "error" };
    static ErrorTypes = { NETWORK_ERROR: "networkError" };
    static isSupported() { return true; }
    constructor() { this.handlers = new Map(); this.destroyed = false; instances.push(this); }
    on(event, handler) { this.handlers.set(event, handler); }
    attachMedia() { this.handlers.get(FakeHls.Events.MEDIA_ATTACHED)?.(); }
    loadSource(source) {
      this.source = source;
      queueMicrotask(() => this.handlers.get(FakeHls.Events.MANIFEST_PARSED)?.());
    }
    destroy() { this.destroyed = true; }
  }
  const container = {
    children: [],
    classList: { add() {}, remove() {} },
    append(node) { this.children.push(node); },
    replaceChildren() { this.children = []; },
    querySelector() { return null; }
  };
  const document = {
    head: { appendChild() {} },
    getElementById() { return {}; },
    createElement(tag) {
      if (tag !== "video") return { textContent: "", id: "", addEventListener() {} };
      return {
        addEventListener() {},
        canPlayType() { return ""; },
        load() {},
        remove() {},
        paused: true,
        currentTime: 0,
        duration: 0
      };
    }
  };
  const context = {
    window: { Hls: FakeHls },
    Hls: FakeHls,
    document,
    location: { origin: "http://preview.test" },
    URL,
    setInterval,
    clearInterval,
    queueMicrotask
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../../shared/ic-video-player.js"), "utf8"), context);
  const player = context.window.createICVideoPlayer({ container });
  await player.load(playable);
  assert.equal(instances.length, 1);
  assert.equal(instances[0].source, playable.manifestUrl);
  player.destroy();
  assert.equal(instances[0].destroyed, true);
}

test("l’interface sépare l’analyse de la confirmation et active l’aperçu HLS distant", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  const player = fs.readFileSync(path.resolve(__dirname, "../../shared/ic-video-player.js"), "utf8");
  const server = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  assert.match(html, /Ajouter depuis une URL/);
  assert.match(html, /remote-reference\/analyze/);
  assert.match(html, /remote-reference\/confirm/);
  assert.match(html, /Confirmer l’ajout/);
  assert.match(server, /Référence distante : aucun fichier n’est copié/);
  assert.match(server, /remote-hls/);
  assert.match(html, /\['youtube','uga','direct','local'\]/);
  assert.match(html, /\/vendor\/hls\.js\/hls\.min\.js/);
  assert.match(player, /video\.kind === "hls"/);
});

test("référence distante : analyse HLS/directe sans écriture, confirmation canonique, requête conservée, association et suppression logique", async t => {
  process.env.PROTO05_TEST_ALLOWED_REMOTE_HOSTS = "127.0.0.1";
  process.env.PROTO05_REMOTE_REFERENCE_TIMEOUT_MS = "1000";
  const origin = await startOrigin();
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(async () => {
    await server.cleanup();
    await new Promise(resolve => origin.server.close(resolve));
    delete process.env.PROTO05_TEST_ALLOWED_REMOTE_HOSTS;
    delete process.env.PROTO05_REMOTE_REFERENCE_TIMEOUT_MS;
  });

  const before = await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json();
  const analyzed = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/analyze`, {
    title: "Référence HLS contrôlée",
    url: `${origin.baseUrl}/redirect?original=1`
  });
  assert.equal(analyzed.response.status, 200);
  assert.equal(analyzed.payload.summary.kind, "hls");
  assert.equal(analyzed.payload.summary.playlistType, "master");
  assert.equal(analyzed.payload.summary.domain, "127.0.0.1");
  assert.match(analyzed.payload.summary.finalUrl, /master\.m3u8\?token=kept$/);
  assert.equal((await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json()).assets.length, before.assets.length, "l’analyse seule ne doit rien écrire");

  const created = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/confirm`, { token: analyzed.payload.token });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.asset.title, "Référence HLS contrôlée");
  assert.equal(created.payload.asset.sources[0].kind, "hls");
  assert.equal(created.payload.asset.sources[0].provider, "direct");
  assert.match(created.payload.asset.sources[0].url, /\?token=kept$/);
  assert.match(created.payload.asset.playables[0].manifestUrl, /^\/api\/proto05\/library\/remote-hls\//);
  assert.match(created.payload.asset.playables[0].originUrl, /\/redirect\?original=1$/);
  assert.equal(created.payload.asset.deletion.canDeleteFile, false);
  assert.equal(created.payload.asset.playables[0].storageKey, undefined);

  const persisted = fs.readFileSync(server.videoLibraryFile, "utf8");
  assert.doesNotMatch(persisted, /#EXTM3U|cookie|authorization/i);
  const persistedJson = JSON.parse(persisted);
  const canonicalPlayable = persistedJson.playables.find(item => item.id === created.payload.playableId);
  assert.equal(canonicalPlayable.kind, "hls");
  assert.match(canonicalPlayable.location.manifestUrl, /\?token=kept$/);

  await server.restart();
  const reloadedLibrary = await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json();
  const reloadedAsset = reloadedLibrary.assets.find(item => item.id === created.payload.assetId);
  const projectedPlayable = reloadedAsset.playables.find(item => item.id === created.payload.playableId);
  assert.equal(projectedPlayable.kind, "hls");
  assert.equal(projectedPlayable.provider, "direct");
  assert.match(projectedPlayable.originUrl, /master\.m3u8\?token=kept$/);
  assert.match(projectedPlayable.manifestUrl, new RegExp(`^/api/proto05/library/remote-hls/${encodeURIComponent(created.payload.playableId)}/master\\.m3u8$`));

  const projectedMaster = await fetch(server.baseUrl + projectedPlayable.manifestUrl);
  assert.equal(projectedMaster.status, 200);
  assert.equal(await projectedMaster.text(), master);
  const gatewayBase = projectedPlayable.manifestUrl.replace(/master\.m3u8$/, "");
  const projectedMedia = await fetch(server.baseUrl + gatewayBase + "media.m3u8?quality=720");
  assert.equal(projectedMedia.status, 200);
  assert.equal(await projectedMedia.text(), media);
  const projectedSegment = await fetch(server.baseUrl + gatewayBase + "segment-001.ts", { headers: { range: "bytes=0-9" } });
  assert.equal(projectedSegment.status, 206);
  assert.deepEqual(Buffer.from(await projectedSegment.arrayBuffer()), segment);
  assert.ok(origin.requests.some(item => item.url === "/media.m3u8?quality=720"));
  assert.ok(origin.requests.some(item => item.url === "/segment-001.ts" && item.range === "bytes=0-9"));
  await initializeProjectedHlsPreview(projectedPlayable);

  const duplicateAnalysis = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/analyze`, { url: `${origin.baseUrl}/redirect?another=2` });
  assert.equal(duplicateAnalysis.payload.summary.duplicate.assetId, created.payload.assetId);
  const duplicateConfirm = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/confirm`, { token: duplicateAnalysis.payload.token });
  assert.equal(duplicateConfirm.response.status, 409);
  assert.equal(duplicateConfirm.payload.assetId, created.payload.assetId);

  const activities = await (await fetch(`${server.baseUrl}/api/proto05/activities`)).json();
  const target = activities.activities[0];
  const association = await fetch(`${server.baseUrl}/api/proto05/activities/${encodeURIComponent(target.id)}/video-ref`, {
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId: created.payload.assetId, playableId: created.payload.playableId })
  });
  assert.equal(association.status, 200);
  const associated = await association.json();
  assert.equal(associated.activity.video.kind, "hls");
  assert.match(associated.activity.video.manifestUrl, /^\/api\/proto05\/library\/remote-hls\//);
  assert.match(associated.activity.video.sourceUrl, /master\.m3u8\?token=kept$/);

  const blockedDelete = await fetch(`${server.baseUrl}/api/proto05/library/assets/${encodeURIComponent(created.payload.assetId)}`, { method: "DELETE" });
  assert.equal(blockedDelete.status, 409, "une référence associée conserve la protection d’usage");
  const restoreAssociation = await fetch(`${server.baseUrl}/api/proto05/activities/${encodeURIComponent(target.id)}/video-ref`, {
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId: before.assets[0].id, playableId: before.assets[0].defaultPlayableId })
  });
  const restorePayload = await restoreAssociation.json();
  assert.equal(restoreAssociation.status, 200, JSON.stringify(restorePayload));
  const removed = await fetch(`${server.baseUrl}/api/proto05/library/assets/${encodeURIComponent(created.payload.assetId)}`, { method: "DELETE" });
  assert.equal(removed.status, 200);
  assert.equal(origin.requests.some(item => item.method === "DELETE"), false, "aucune suppression distante ne doit être tentée");

  for (const [endpoint, expectedKind] of [["/media", "hls"], ["/direct.mp4?signature=a%2Bb&quality=high", "direct-url"], ["/head-fallback.mp4", "direct-url"]]) {
    const result = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/analyze`, { url: origin.baseUrl + endpoint });
    assert.equal(result.response.status, 200, endpoint);
    assert.equal(result.payload.summary.kind, expectedKind, endpoint);
    if (endpoint.includes("signature")) assert.match(result.payload.summary.finalUrl, /signature=a%2Bb&quality=high$/);
  }
  assert.ok(origin.requests.some(item => item.url.startsWith("/head-fallback.mp4") && item.method === "GET"));
});

test("référence distante : protocoles et SSRF refusés avant accès réseau", async t => {
  delete process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE;
  delete process.env.PROTO05_TEST_ALLOWED_REMOTE_HOSTS;
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(() => server.cleanup());
  for (const url of [
    "file:///C:/private/video.mp4",
    "ftp://example.com/video.mp4",
    "http://user:secret@example.com/video.mp4",
    "http://127.0.0.1/video.mp4",
    "http://10.0.0.1/video.mp4",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/video.mp4",
    "http://[::ffff:127.0.0.1]/video.mp4",
    "http://192.0.2.1/video.mp4",
    "http://does-not-exist.invalid/video.mp4"
  ]) {
    const result = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/analyze`, { url });
    assert.equal(result.response.status, 400, url);
  }
});

test("référence distante : redirections, HTML, HLS invalide, auth, timeout, jeton et échec d’écriture restent sans effet partiel", async t => {
  process.env.PROTO05_TEST_ALLOWED_REMOTE_HOSTS = "127.0.0.1";
  process.env.PROTO05_REMOTE_REFERENCE_TIMEOUT_MS = "80";
  process.env.PROTO05_REMOTE_REFERENCE_TOKEN_TTL_MS = "30";
  const origin = await startOrigin();
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(async () => {
    await server.cleanup();
    await new Promise(resolve => origin.server.close(resolve));
    delete process.env.PROTO05_TEST_ALLOWED_REMOTE_HOSTS;
    delete process.env.PROTO05_REMOTE_REFERENCE_TIMEOUT_MS;
    delete process.env.PROTO05_REMOTE_REFERENCE_TOKEN_TTL_MS;
  });
  const initialCount = (await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json()).assets.length;
  for (const endpoint of ["/redirect-private", "/loop/0", "/html", "/invalid.m3u8", "/large-playlist", "/auth", "/slow"]) {
    const result = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/analyze`, { url: origin.baseUrl + endpoint });
    assert.equal(result.response.status, 400, endpoint);
  }
  assert.equal((await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json()).assets.length, initialCount);
  const missingToken = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/confirm`, { token: "inexistant" });
  assert.equal(missingToken.response.status, 409);

  process.env.PROTO05_REMOTE_REFERENCE_TOKEN_TTL_MS = "30";
  const expiring = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/analyze`, { url: `${origin.baseUrl}/direct.mp4` });
  await new Promise(resolve => setTimeout(resolve, 45));
  const expired = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/confirm`, { token: expiring.payload.token });
  assert.equal(expired.response.status, 409);

  const writable = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/analyze`, { url: `${origin.baseUrl}/direct.mp4?write=failure` });
  const backup = `${server.videoLibraryFile}.test-backup`;
  fs.renameSync(server.videoLibraryFile, backup);
  fs.mkdirSync(server.videoLibraryFile);
  try {
    const failed = await jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/confirm`, { token: writable.payload.token });
    assert.equal(failed.response.status, 500);
    assert.equal((await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json()).assets.length, initialCount);
  } finally {
    fs.rmSync(server.videoLibraryFile, { recursive: true, force: true });
    fs.renameSync(backup, server.videoLibraryFile);
  }
  const simultaneous = await Promise.all([
    jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/confirm`, { token: writable.payload.token }),
    jsonRequest(`${server.baseUrl}/api/proto05/library/remote-reference/confirm`, { token: writable.payload.token })
  ]);
  assert.deepEqual(simultaneous.map(item => item.response.status).sort(), [201, 409]);
  const created = simultaneous.find(item => item.response.status === 201).payload;
  assert.equal((await (await fetch(`${server.baseUrl}/api/proto05/library/assets`)).json()).assets.filter(asset => asset.id === created.assetId).length, 1);
  assert.equal((await fetch(`${server.baseUrl}/api/proto05/library/assets/${encodeURIComponent(created.assetId)}`, { method: "DELETE" })).status, 200);
});
