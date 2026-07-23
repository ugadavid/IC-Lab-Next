"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const activitiesFile = path.resolve(__dirname, "../../data/activities.json");
const body = Buffer.from("small controlled video payload for Proto05");

function jsonResponse(response) { return response.json().then(payload => ({ response, payload })); }

function startSourceServer() {
  const source = http.createServer((request, response) => {
    if (request.url === "/video.mp4" || request.url === "/alias.mp4") {
      response.writeHead(200, { "content-type": "video/mp4", "content-length": body.length }); response.end(body); return;
    }
    if (request.url === "/redirect") { response.writeHead(302, { location: "/video.mp4" }); response.end(); return; }
    if (request.url === "/bad-redirect") { response.writeHead(302, { location: "file:///C:/private/video.mp4" }); response.end(); return; }
    if (request.url === "/bad-type") { response.writeHead(200, { "content-type": "text/plain", "content-length": body.length }); response.end(body); return; }
    if (request.url === "/manifest.m3u8") { response.writeHead(200, { "content-type": "application/vnd.apple.mpegurl", "content-length": body.length }); response.end(body); return; }
    if (request.url === "/error") { response.writeHead(503); response.end("unavailable"); return; }
    if (request.url === "/large.mp4") { const large = Buffer.alloc(128, 7); response.writeHead(200, { "content-type": "video/mp4", "content-length": large.length }); response.end(large); return; }
    if (request.url === "/slow.mp4") { setTimeout(() => { response.writeHead(200, { "content-type": "video/mp4", "content-length": body.length }); response.end(body); }, 250); return; }
    response.writeHead(404); response.end();
  });
  return new Promise(resolve => source.listen(0, "127.0.0.1", () => resolve({ source, baseUrl: `http://127.0.0.1:${source.address().port}` })));
}

test("copie directe contrôlée : validation, provenance, hash, déduplication et persistance", async t => {
  process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE = "1";
  process.env.PROTO05_REMOTE_COPY_MAX_BYTES = "64";
  process.env.PROTO05_REMOTE_COPY_TIMEOUT_MS = "60";
  const origin = await startSourceServer();
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(async () => { await server.cleanup(); await new Promise(resolve => origin.source.close(resolve)); delete process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE; delete process.env.PROTO05_REMOTE_COPY_MAX_BYTES; delete process.env.PROTO05_REMOTE_COPY_TIMEOUT_MS; });
  const expectedHash = crypto.createHash("sha256").update(body).digest("hex");
  const copied = await jsonResponse(await fetch(`${server.baseUrl}/api/proto05/library/copy-direct`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Copie directe de test", url: `${origin.baseUrl}/video.mp4` }) }));
  assert.equal(copied.response.status, 201);
  assert.equal(copied.payload.asset.metadata.sha256, expectedHash);
  assert.equal(copied.payload.asset.metadata.sizeBytes, body.length);
  assert.equal(copied.payload.asset.sources[0].kind, "direct-url");
  assert.equal(copied.payload.asset.sources[0].originUrl, `${origin.baseUrl}/video.mp4`);
  assert.equal(copied.payload.asset.playables[0].provider, "local");
  const storageKey = copied.payload.asset.playables[0].storageKey;
  assert.equal(fs.existsSync(path.join(server.root, "prototype", "data", "video-library-media", storageKey)), true);
  const playableResponse = await fetch(`${server.baseUrl}${copied.payload.asset.playables[0].url}`, { headers: { range: "bytes=0-7" } });
  assert.equal(playableResponse.status, 206);
  assert.equal((await playableResponse.arrayBuffer()).byteLength, 8);
  const byUrl = await jsonResponse(await fetch(`${server.baseUrl}/api/proto05/library/copy-direct`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: `${origin.baseUrl}/video.mp4` }) }));
  assert.equal(byUrl.response.status, 409);
  const byHash = await jsonResponse(await fetch(`${server.baseUrl}/api/proto05/library/copy-direct`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: `${origin.baseUrl}/alias.mp4` }) }));
  assert.equal(byHash.response.status, 409);
  await server.restart();
  const listed = await jsonResponse(await fetch(`${server.baseUrl}/api/proto05/library/assets`));
  assert.ok(listed.payload.assets.some(asset => asset.id === copied.payload.asset.id));
});

test("copie directe refuse les réponses dangereuses et nettoie l’annulation", async t => {
  process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE = "1";
  process.env.PROTO05_REMOTE_COPY_MAX_BYTES = "64";
  process.env.PROTO05_REMOTE_COPY_TIMEOUT_MS = "60";
  const origin = await startSourceServer();
  const server = await startTemporaryProto05Server(JSON.parse(fs.readFileSync(activitiesFile, "utf8")));
  t.after(async () => { await server.cleanup(); await new Promise(resolve => origin.source.close(resolve)); delete process.env.PROTO05_TEST_ALLOW_PRIVATE_REMOTE; delete process.env.PROTO05_REMOTE_COPY_MAX_BYTES; delete process.env.PROTO05_REMOTE_COPY_TIMEOUT_MS; });
  for (const url of ["/large.mp4", "/bad-type", "/manifest.m3u8", "/error", "/bad-redirect", "/slow.mp4"]) {
    const result = await jsonResponse(await fetch(`${server.baseUrl}/api/proto05/library/copy-direct`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: `${origin.baseUrl}${url}` }) }));
    assert.equal(result.response.status, 400, url);
  }
  await new Promise((resolve, reject) => {
    const request = http.request(`${server.baseUrl}/api/proto05/library/copy-direct`, { method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(JSON.stringify({ url: `${origin.baseUrl}/slow.mp4` })) } });
    request.once("error", error => ["ECONNRESET", "EPIPE"].includes(error.code) ? resolve() : reject(error));
    request.write(JSON.stringify({ url: `${origin.baseUrl}/slow.mp4` }));
    setTimeout(() => request.destroy(), 10);
  });
  const leftovers = fs.readdirSync(path.join(server.root, "prototype", "data", "video-library-media")).filter(name => name.endsWith(".remote.tmp"));
  assert.deepEqual(leftovers, []);
  assert.equal((await fetch(`${server.baseUrl}/api/health`)).status, 200);
});
