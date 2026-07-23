"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

function abortRange(baseUrl, start) {
  return new Promise((resolve, reject) => {
    const target = new URL(`${baseUrl}/api/proto05/library/media/video_37004_1080p.mp4`);
    const request = http.request(target, { headers: { range: `bytes=${start}-${start + 1024 * 1024 - 1}` } });
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    request.once("error", error => { if (!(["ECONNRESET", "EPIPE"].includes(error.code))) reject(error); else finish(); });
    request.once("response", response => {
      response.once("data", () => request.destroy());
      response.once("close", finish);
      response.resume();
    });
    request.end();
  });
}

test("les requêtes Range interrompues sont silencieuses et sans réponse JSON tardive", async t => {
  const activities = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", "activities.json"), "utf8"));
  const server = await startTemporaryProto05Server(activities);
  t.after(() => server.cleanup());
  await Promise.all([0, 1, 2, 3, 4, 5].map(index => abortRange(server.baseUrl, index * 1024)));
  const health = await fetch(`${server.baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.doesNotMatch(server.stderr(), /\[server\].*(ERR_STREAM_PREMATURE_CLOSE|ECONNRESET|EPIPE|write after end)/i);
});
