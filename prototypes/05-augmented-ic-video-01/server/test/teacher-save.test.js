"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");
const { findChromium, readBrowserResults, runChromium, sha256 } = require("./helpers/chromium");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");
const fixtureFile = path.join(__dirname, "fixtures", "layer-visibility.activity.json");
const fixtureActivity = JSON.parse(fs.readFileSync(fixtureFile, "utf8")).activity;

function send(response, status, contentType, body) {
  response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  response.end(body);
}

function sendJson(response, status, payload) {
  send(response, status, "application/json; charset=utf-8", JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function freePort() {
  const server = http.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForHealth(baseUrl, child, stderr) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Le serveur de test Proto05 s’est arrêté prématurément. ${stderr()}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error("Le serveur de test Proto05 n’a pas répondu au healthcheck.");
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  const closed = new Promise(resolve => child.once("close", resolve));
  child.kill();
  await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 2000))]);
}

test("API auteur sur une copie temporaire", { timeout: 15000 }, async context => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-save-api-"));
  const temporaryPrototype = path.join(temporaryRoot, "prototype");
  const temporaryServer = path.join(temporaryPrototype, "server");
  const temporaryData = path.join(temporaryPrototype, "data");
  fs.mkdirSync(temporaryServer, { recursive: true });
  fs.mkdirSync(temporaryData, { recursive: true });
  fs.copyFileSync(path.join(serverDirectory, "server.js"), path.join(temporaryServer, "server.js"));
  const temporaryDataFile = path.join(temporaryData, "activities.json");
  const originalStore = { schemaVersion: "0.1", updatedAt: "test-only", activities: [fixtureActivity] };
  fs.writeFileSync(temporaryDataFile, `${JSON.stringify(originalStore, null, 2)}\n`, "utf8");

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let stderr = "";
  const child = spawn(process.execPath, [path.join(temporaryServer, "server.js")], {
    cwd: temporaryServer,
    env: { ...process.env, PORT: String(port) },
    windowsHide: true
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { stderr += chunk; });
  const writes = [];
  let validResponse;
  let validPayload;
  let persistedStore;
  let backupStore;
  let invalidJsonResponse;
  let invalidJsonPayload;
  let unknownResponse;
  let unknownPayload;
  let dataHashAfterValid;
  let dataHashAfterRejectedRequests;
  let executionError;

  const authoringFetch = async (pathname, body) => {
    writes.push({ method: "PUT", pathname });
    return fetch(`${baseUrl}${pathname}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body
    });
  };

  try {
    await waitForHealth(baseUrl, child, () => stderr);
    const validPath = "/api/proto05/activities/layer-visibility-fixture/authoring";
    validResponse = await authoringFetch(validPath, JSON.stringify({ title: "Titre sauvegardé dans la copie temporaire" }));
    validPayload = await validResponse.json();
    persistedStore = JSON.parse(fs.readFileSync(temporaryDataFile, "utf8"));
    backupStore = JSON.parse(fs.readFileSync(`${temporaryDataFile}.bak`, "utf8"));
    dataHashAfterValid = sha256(temporaryDataFile);

    invalidJsonResponse = await authoringFetch(validPath, "{");
    invalidJsonPayload = await invalidJsonResponse.json();
    unknownResponse = await authoringFetch("/api/proto05/activities/activity-unknown/authoring", "{}");
    unknownPayload = await unknownResponse.json();
    dataHashAfterRejectedRequests = sha256(temporaryDataFile);
  } catch (error) {
    executionError = error;
  } finally {
    await stopChild(child);
  }

  await context.test("les données historiques canoniques restent inchangées", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });
  if (executionError) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    throw executionError;
  }

  await context.test("une sauvegarde valide utilise l’API auteur existante", () => {
    assert.equal(validResponse.status, 200);
    assert.equal(validPayload.activity.title, "Titre sauvegardé dans la copie temporaire");
    assert.equal(persistedStore.activities[0].title, "Titre sauvegardé dans la copie temporaire");
    assert.equal(backupStore.activities[0].title, fixtureActivity.title);
    assert.notEqual(dataHashAfterValid, sha256(`${temporaryDataFile}.bak`));
  });

  await context.test("un corps JSON invalide est refusé sans nouvelle écriture", () => {
    assert.equal(invalidJsonResponse.status, 400);
    assert.match(invalidJsonPayload.error, /JSON|Unexpected|position/i);
    assert.equal(dataHashAfterRejectedRequests, dataHashAfterValid);
  });

  await context.test("une activité inconnue est refusée", () => {
    assert.equal(unknownResponse.status, 404);
    assert.equal(unknownPayload.error, "Activité introuvable.");
  });

  await context.test("aucune requête d’écriture inattendue n’est émise", () => {
    assert.deepEqual(writes, [
      { method: "PUT", pathname: "/api/proto05/activities/layer-visibility-fixture/authoring" },
      { method: "PUT", pathname: "/api/proto05/activities/layer-visibility-fixture/authoring" },
      { method: "PUT", pathname: "/api/proto05/activities/activity-unknown/authoring" }
    ]);
  });

  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function teacherPageForTest() {
  const source = fs.readFileSync(path.join(prototypeDirectory, "teacher-guided.html"), "utf8");
  const timeoutSource = "setTimeout(()=>reject(new Error('Délai de sauvegarde dépassé.')) ,10000)";
  assert.ok(source.includes(timeoutSource), "Le délai applicatif attendu de 10 secondes doit rester présent.");
  const mediaStub = `<div id="video" class="video" data-test-media-stub></div><script>
    const testVideo = document.getElementById('video');
    testVideo.currentTime = 0;
    testVideo.duration = 60;
    testVideo.paused = true;
    testVideo.error = null;
    testVideo.pause = () => {};
    testVideo.load = () => {};
    testVideo.play = () => Promise.resolve();
    testVideo.canPlayType = () => '';
    if (location.pathname.endsWith('/save-timeout') || location.pathname.endsWith('/save-network-error')) {
      const testNativeFetch = window.fetch.bind(window);
      window.fetch = (url, options = {}) => {
        if (options.method === 'PUT') {
          const timeoutScenario = location.pathname.endsWith('/save-timeout');
          testNativeFetch(timeoutScenario ? '/test-timeout-attempt' : '/test-network-error-attempt').catch(() => {});
          return timeoutScenario ? new Promise(() => {}) : Promise.reject(new TypeError('Failed to fetch'));
        }
        return testNativeFetch(url, options);
      };
    }
  </script>`;
  return source
    .replace('<video id="video" class="video" controls preload="metadata"></video>', mediaStub)
    .replace(timeoutSource, "setTimeout(()=>reject(new Error('Délai de sauvegarde dépassé.')) ,100)");
}

function browserRunnerPage() {
  return `<!doctype html><html><body data-test-state="running"><div id="frames"></div><script>
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, label, timeout = 4000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try { if (predicate()) return; } catch {}
      await pause(20);
    }
    throw new Error('Délai dépassé dans le runner : ' + label);
  }
  async function runScenario(id, expectedMessage, success) {
    const frame = document.createElement('iframe');
    frame.src = '/teacher/guided/' + id;
    document.getElementById('frames').append(frame);
    await waitFor(() => frame.contentWindow?.eval('Boolean(state.activity)'), 'chargement ' + id);
    const page = frame.contentDocument;
    const save = page.querySelector('#save');
    save.click();
    await waitFor(() => page.querySelector('.save-feedback-modal')?.textContent.includes(expectedMessage), 'message ' + id);
    const backdrop = page.querySelector('.save-feedback-backdrop');
    const modal = page.querySelector('.save-feedback-modal');
    const result = {
      message: modal.textContent.trim(),
      buttonReactivated: !save.disabled,
      errorClass: modal.classList.contains('is-error'),
      successClass: modal.classList.contains('is-success'),
      closeButtonPresent: Boolean(modal.querySelector('.save-feedback-close')),
      closed: false
    };
    if (success) {
      await waitFor(() => backdrop.hidden, 'fermeture automatique ' + id, 3000);
      result.closed = backdrop.hidden;
    } else {
      modal.querySelector('.save-feedback-close')?.click();
      result.closed = backdrop.hidden;
    }
    frame.remove();
    return result;
  }
  (async () => {
    const success = await runScenario('save-success', 'Modifications enregistrées', true);
    const httpError = await runScenario('save-http-error', 'Service de sauvegarde indisponible.', false);
    const invalidJson = await runScenario('save-invalid-json', 'Échec de l’enregistrement', false);
    const networkError = await runScenario('save-network-error', 'Échec de l’enregistrement', false);
    const timeout = await runScenario('save-timeout', 'Délai de sauvegarde dépassé.', false);
    document.body.dataset.results = encodeURIComponent(JSON.stringify({ success, httpError, invalidJson, networkError, timeout }));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`;
}

async function startBrowserFixtureServer(requests) {
  const teacherPage = teacherPageForTest();
  const timelineScript = fs.readFileSync(path.join(prototypeDirectory, "shared", "ic-timeline.js"));
  const timelineStyle = fs.readFileSync(path.join(prototypeDirectory, "shared", "ic-timeline.css"));
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const entry = { method: request.method, pathname };
    requests.push(entry);
    if (pathname === "/test-runner") return send(response, 200, "text/html; charset=utf-8", browserRunnerPage());
    if (/^\/teacher\/guided\/save-[^/]+$/.test(pathname)) return send(response, 200, "text/html; charset=utf-8", teacherPage);
    if (pathname === "/shared/ic-timeline.js") return send(response, 200, "text/javascript; charset=utf-8", timelineScript);
    if (pathname === "/shared/ic-timeline.css") return send(response, 200, "text/css; charset=utf-8", timelineStyle);
    if (pathname === "/vendor/hls.js/hls.min.js") return send(response, 200, "text/javascript; charset=utf-8", "window.Hls={isSupported:()=>false};");
    if (pathname === "/test-timeout-attempt") return send(response, 204, "text/plain; charset=utf-8", "");
    if (pathname === "/test-network-error-attempt") return send(response, 204, "text/plain; charset=utf-8", "");

    const apiMatch = pathname.match(/^\/api\/proto05\/activities\/(save-[^/]+)(?:\/authoring)?$/);
    if (!apiMatch) return send(response, 404, "text/plain; charset=utf-8", "Not found");
    const scenario = apiMatch[1];
    if (request.method === "GET") {
      return sendJson(response, 200, { activity: { ...fixtureActivity, id: scenario } });
    }
    if (request.method !== "PUT") return sendJson(response, 405, { error: "Méthode non autorisée." });
    entry.body = await readBody(request);
    entry.contentType = request.headers["content-type"];
    if (scenario === "save-success") {
      const payload = JSON.parse(entry.body);
      return sendJson(response, 200, { activity: { ...fixtureActivity, id: scenario, ...payload } });
    }
    if (scenario === "save-http-error") return sendJson(response, 503, { error: "Service de sauvegarde indisponible." });
    if (scenario === "save-invalid-json") return send(response, 200, "application/json; charset=utf-8", "{");
    if (scenario === "save-network-error") return sendJson(response, 500, { error: "La panne réseau aurait dû être interceptée." });
    if (scenario === "save-timeout") return sendJson(response, 500, { error: "La requête de délai aurait dû être interceptée." });
    return sendJson(response, 404, { error: "Scénario inconnu." });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

test("retours de sauvegarde dans l’atelier guidé", { timeout: 25000 }, async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour les tests de sauvegarde guidée.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const requests = [];
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-teacher-save-"));
  const fixtureServer = await startBrowserFixtureServer(requests);
  const address = fixtureServer.address();
  let browserError;
  let results;
  try {
    const dom = await runChromium(
      chromium,
      `http://127.0.0.1:${address.port}/test-runner`,
      profileDirectory,
      { virtualTimeBudget: 8000, timeout: 20000 }
    );
    results = readBrowserResults(dom);
  } catch (error) {
    browserError = error;
  } finally {
    await new Promise(resolve => fixtureServer.close(resolve));
    fs.rmSync(profileDirectory, { recursive: true, force: true });
  }

  await context.test("les données historiques canoniques restent inchangées", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });
  if (browserError) throw browserError;

  await context.test("le succès réactive le bouton et ferme automatiquement la modale", () => {
    assert.equal(results.success.buttonReactivated, true);
    assert.equal(results.success.successClass, true);
    assert.equal(results.success.closeButtonPresent, false);
    assert.equal(results.success.closed, true);
  });

  await context.test("une réponse HTTP non-2xx affiche une erreur refermable", () => {
    assert.match(results.httpError.message, /Service de sauvegarde indisponible/);
    assert.equal(results.httpError.buttonReactivated, true);
    assert.equal(results.httpError.errorClass, true);
    assert.equal(results.httpError.closeButtonPresent, true);
    assert.equal(results.httpError.closed, true);
  });

  await context.test("une réponse JSON invalide affiche une erreur refermable", () => {
    assert.match(results.invalidJson.message, /Échec de l’enregistrement/);
    assert.equal(results.invalidJson.buttonReactivated, true);
    assert.equal(results.invalidJson.closeButtonPresent, true);
    assert.equal(results.invalidJson.closed, true);
  });

  await context.test("un réseau indisponible affiche une erreur et réactive le bouton", () => {
    assert.match(results.networkError.message, /Échec de l’enregistrement/);
    assert.equal(results.networkError.buttonReactivated, true);
    assert.equal(results.networkError.errorClass, true);
    assert.equal(results.networkError.closeButtonPresent, true);
    assert.equal(results.networkError.closed, true);
  });

  await context.test("un délai dépassé affiche une erreur et réactive le bouton", () => {
    assert.match(results.timeout.message, /Délai de sauvegarde dépassé/);
    assert.equal(results.timeout.buttonReactivated, true);
    assert.equal(results.timeout.errorClass, true);
    assert.equal(results.timeout.closeButtonPresent, true);
    assert.equal(results.timeout.closed, true);
  });

  await context.test("aucune écriture navigateur inattendue n’est émise", () => {
    const writes = requests.filter(request => !["GET", "HEAD"].includes(request.method));
    assert.deepEqual(writes.map(request => ({ method: request.method, pathname: request.pathname })), [
      { method: "PUT", pathname: "/api/proto05/activities/save-success/authoring" },
      { method: "PUT", pathname: "/api/proto05/activities/save-http-error/authoring" },
      { method: "PUT", pathname: "/api/proto05/activities/save-invalid-json/authoring" }
    ]);
    assert.ok(writes.every(request => request.contentType === "application/json"));
    assert.ok(writes.every(request => JSON.parse(request.body).title === fixtureActivity.title));
    assert.ok(requests.some(request => request.method === "GET" && request.pathname === "/test-network-error-attempt"));
    assert.ok(requests.some(request => request.method === "GET" && request.pathname === "/test-timeout-attempt"));
  });
});
