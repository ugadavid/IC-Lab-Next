"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findChromium, readBrowserResults, runChromium, sha256 } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

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

test("API auteur sur une copie temporaire", { timeout: 15000 }, async context => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const originalStore = { schemaVersion: "0.1", updatedAt: "test-only", activities: [fixtureActivity] };
  const temporary = await startTemporaryProto05Server(originalStore, "proto05-save-api-");
  const temporaryDataFile = temporary.dataFile;
  const baseUrl = temporary.baseUrl;
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
    await temporary.stop();
  }

  await context.test("les données historiques canoniques restent inchangées", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });
  if (executionError) {
    await temporary.cleanup();
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

  await temporary.cleanup();
});

function teacherPageForTest() {
  const source = fs.readFileSync(path.join(prototypeDirectory, "teacher-guided.html"), "utf8");
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
          testNativeFetch('/test-network-error-attempt').catch(() => {});
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return testNativeFetch(url, options);
      };
    }
  </script>`;
  return source
    .replace('<video id="video" class="video" controls preload="metadata"></video>', mediaStub)
    ;
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
    await waitFor(() => page.querySelector('#status')?.textContent.includes(expectedMessage), 'message ' + id);
    const result = {
      message: page.querySelector('#status').textContent.trim(),
      buttonReactivated: !save.disabled,
      errorClass: false,
      successClass: false,
      closeButtonPresent: false,
      closed: true
    };
    if (success) {
    }
    frame.remove();
    return result;
  }
  (async () => {
    const success = await runScenario('save-success', 'Modifications enregistrées', true);
    const httpError = await runScenario('save-http-error', 'Service de sauvegarde indisponible.', false);
    const invalidJson = await runScenario('save-invalid-json', 'Échec de l’enregistrement', false);
    const networkError = await runScenario('save-network-error', 'Échec de l’enregistrement', false);
    document.body.dataset.results = encodeURIComponent(JSON.stringify({ success, httpError, invalidJson, networkError }));
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
  const teacherShellScript = fs.readFileSync(path.join(prototypeDirectory, "shared", "teacher-shell.js"));
  const teacherShellStyle = fs.readFileSync(path.join(prototypeDirectory, "shared", "teacher-shell.css"));
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const entry = { method: request.method, pathname };
    requests.push(entry);
    if (pathname === "/test-runner") return send(response, 200, "text/html; charset=utf-8", browserRunnerPage());
    if (/^\/teacher\/guided\/save-[^/]+$/.test(pathname)) return send(response, 200, "text/html; charset=utf-8", teacherPage);
    if (pathname === "/shared/ic-timeline.js") return send(response, 200, "text/javascript; charset=utf-8", timelineScript);
    if (pathname === "/shared/ic-timeline.css") return send(response, 200, "text/css; charset=utf-8", timelineStyle);
    if (pathname === "/shared/teacher-shell.js") return send(response, 200, "text/javascript; charset=utf-8", teacherShellScript);
    if (pathname === "/shared/teacher-shell.css") return send(response, 200, "text/css; charset=utf-8", teacherShellStyle);
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

  await context.test("le succès réactive le bouton et expose un état lisible", () => {
    assert.equal(results.success.buttonReactivated, true);
    assert.equal(results.success.message, "Modifications enregistrées.");
    assert.equal(results.success.closed, true);
  });

  await context.test("une réponse HTTP non-2xx affiche une erreur lisible", () => {
    assert.match(results.httpError.message, /Service de sauvegarde indisponible/);
    assert.equal(results.httpError.buttonReactivated, true);
    assert.equal(results.httpError.closed, true);
  });

  await context.test("une réponse JSON invalide affiche une erreur lisible", () => {
    assert.match(results.invalidJson.message, /Échec de l’enregistrement/);
    assert.equal(results.invalidJson.buttonReactivated, true);
    assert.equal(results.invalidJson.closed, true);
  });

  await context.test("un réseau indisponible affiche une erreur et réactive le bouton", () => {
    assert.match(results.networkError.message, /Échec de l’enregistrement/);
    assert.equal(results.networkError.buttonReactivated, true);
    assert.equal(results.networkError.closed, true);
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
  });
});
