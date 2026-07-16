"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");
const fixtureFile = path.join(__dirname, "fixtures", "layer-visibility.activity.json");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function findChromium() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

function send(response, status, contentType, body) {
  response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  response.end(body);
}

function runnerPage() {
  return `<!doctype html><html><body data-test-state="running"><iframe id="student" src="/student/layer-visibility-fixture"></iframe><script>
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      if (predicate()) return;
      await pause(25);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  function snapshot(document) {
    return {
      layerIds: [...document.querySelectorAll('#layerList input[data-tag]')].map(input => input.dataset.tag),
      phenomenonIds: [...document.querySelectorAll('#sharedTimelineMount [data-ic-type="phenomenon"]')].map(item => item.dataset.icId),
      transcriptTexts: [...document.querySelectorAll('#transcriptList .segment-text')].map(item => item.textContent.trim())
    };
  }
  (async () => {
    const frame = document.getElementById('student');
    await waitFor(() => frame.contentDocument?.querySelector('#layerList input[data-tag]'), 'chargement de la vue étudiant');
    const studentDocument = frame.contentDocument;
    const studentWindow = frame.contentWindow;
    const configBefore = studentWindow.eval('JSON.stringify(activityData.layerConfiguration)');
    const initial = snapshot(studentDocument);

    const proposedToggle = studentDocument.querySelector('#layerList input[data-tag="layer-proposed"]');
    proposedToggle.checked = false;
    proposedToggle.dispatchEvent(new studentWindow.Event('change', { bubbles: true }));
    await waitFor(() => !snapshot(studentDocument).phenomenonIds.includes('phenomenon-proposed'), 'désactivation étudiante');
    const afterDisable = snapshot(studentDocument);
    const configAfterDisable = studentWindow.eval('JSON.stringify(activityData.layerConfiguration)');

    const proposedToggleAgain = studentDocument.querySelector('#layerList input[data-tag="layer-proposed"]');
    proposedToggleAgain.checked = true;
    proposedToggleAgain.dispatchEvent(new studentWindow.Event('change', { bubbles: true }));
    await waitFor(() => snapshot(studentDocument).phenomenonIds.includes('phenomenon-proposed'), 'réactivation étudiante');
    const afterEnable = snapshot(studentDocument);
    const configAfterEnable = studentWindow.eval('JSON.stringify(activityData.layerConfiguration)');

    const results = { initial, afterDisable, afterEnable, configBefore, configAfterDisable, configAfterEnable };
    document.body.dataset.results = encodeURIComponent(JSON.stringify(results));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`;
}

function studentPageWithInertMedia() {
  const page = fs.readFileSync(path.join(prototypeDirectory, "index-0.0.8.html"), "utf8");
  const mediaStub = `<div id="video" data-test-media-stub></div><script>
    const testVideo = document.getElementById('video');
    testVideo.currentTime = 0;
    testVideo.duration = 60;
    testVideo.paused = true;
    testVideo.error = null;
    testVideo.pause = () => {};
    testVideo.load = () => {};
    testVideo.play = () => Promise.resolve();
    testVideo.canPlayType = () => '';
  </script>`;
  return page.replace('<video id="video" controls preload="metadata"></video>', mediaStub);
}

async function startFixtureServer(requests) {
  const fixture = fs.readFileSync(fixtureFile);
  const routes = new Map([
    ["/student/layer-visibility-fixture", ["text/html; charset=utf-8", studentPageWithInertMedia()]],
    ["/shared/ic-timeline.js", ["text/javascript; charset=utf-8", fs.readFileSync(path.join(prototypeDirectory, "shared", "ic-timeline.js"))]],
    ["/shared/ic-timeline.css", ["text/css; charset=utf-8", fs.readFileSync(path.join(prototypeDirectory, "shared", "ic-timeline.css"))]],
    ["/vendor/hls.js/hls.min.js", ["text/javascript; charset=utf-8", "window.Hls={isSupported:()=>false};"]],
    ["/api/proto05/activities/layer-visibility-fixture", ["application/json; charset=utf-8", fixture]],
    ["/test/no-video.m3u8", ["application/vnd.apple.mpegurl", "#EXTM3U\n#EXT-X-ENDLIST\n"]],
    ["/test-runner", ["text/html; charset=utf-8", runnerPage()]]
  ]);
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    requests.push({ method: request.method, pathname });
    const route = routes.get(pathname);
    if (!route) return send(response, 404, "text/plain; charset=utf-8", "Not found");
    send(response, 200, route[0], route[1]);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

async function runChromium(chromium, url, profileDirectory) {
  const argumentsList = [
    "--headless=new",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-gpu-compositing",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileDirectory}`,
    "--virtual-time-budget=6000",
    "--dump-dom",
    url
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(chromium, argumentsList, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Chromium n’a pas terminé le scénario de visibilité dans le délai imparti."));
    }, 15000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`Chromium a quitté avec le code ${code}. ${stderr.trim()}`));
      resolve(stdout);
    });
  });
}

function readBrowserResults(dom) {
  const state = dom.match(/data-test-state="([^"]+)"/)?.[1];
  if (state !== "done") {
    const encodedError = dom.match(/data-error="([^"]+)"/)?.[1];
    throw new Error(encodedError ? decodeURIComponent(encodedError) : `Scénario navigateur incomplet (${state || "état absent"}).`);
  }
  const encodedResults = dom.match(/data-results="([^"]+)"/)?.[1];
  if (!encodedResults) throw new Error("Chromium n’a pas restitué les résultats du scénario.");
  return JSON.parse(decodeURIComponent(encodedResults));
}

test("visibilité des couches dans la vue étudiant", { timeout: 25000 }, async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour ce test DOM local (CHROME_PATH peut être défini).");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const requests = [];
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-layer-visibility-"));
  const fixtureServer = await startFixtureServer(requests);
  const address = fixtureServer.address();
  let browserError;
  let results;
  try {
    const dom = await runChromium(chromium, `http://127.0.0.1:${address.port}/test-runner`, profileDirectory);
    results = readBrowserResults(dom);
  } catch (error) {
    browserError = error;
  } finally {
    await new Promise(resolve => fixtureServer.close(resolve));
    fs.rmSync(profileDirectory, { recursive: true, force: true });
  }

  await context.test("les données historiques restent inchangées", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });
  if (browserError) throw browserError;

  await context.test("une couche proposée par l’enseignant apparaît côté étudiant", () => {
    assert.ok(results.initial.layerIds.includes("layer-proposed"));
    assert.ok(results.initial.phenomenonIds.includes("phenomenon-proposed"));
    assert.ok(results.initial.transcriptTexts.includes("Segment de la couche proposée."));
  });

  await context.test("une couche masquée disparaît de la liste étudiante et de la timeline", () => {
    assert.ok(!results.initial.layerIds.includes("layer-masked"));
    assert.ok(!results.initial.phenomenonIds.includes("phenomenon-masked"));
    assert.ok(!results.initial.transcriptTexts.includes("Segment de la couche masquée."));
  });

  await context.test("le toggle étudiant masque uniquement les phénomènes de sa couche", () => {
    assert.ok(!results.afterDisable.phenomenonIds.includes("phenomenon-proposed"));
    assert.ok(results.afterDisable.phenomenonIds.includes("phenomenon-shared"));
    assert.ok(!results.afterDisable.transcriptTexts.includes("Segment de la couche proposée."));
    assert.ok(results.afterDisable.transcriptTexts.includes("Segment de la couche témoin."));
  });

  await context.test("le toggle étudiant ne modifie pas la configuration enseignant", () => {
    assert.equal(results.configAfterDisable, results.configBefore);
    assert.equal(results.configAfterEnable, results.configBefore);
    assert.deepEqual(requests.filter(request => request.method !== "GET"), []);
  });

  await context.test("la réactivation restaure les phénomènes", () => {
    assert.ok(results.afterEnable.phenomenonIds.includes("phenomenon-proposed"));
    assert.ok(results.afterEnable.phenomenonIds.includes("phenomenon-shared"));
    assert.ok(results.afterEnable.transcriptTexts.includes("Segment de la couche proposée."));
  });
});
