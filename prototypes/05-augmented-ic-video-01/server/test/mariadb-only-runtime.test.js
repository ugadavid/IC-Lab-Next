"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");
const {
  buildAuthoringPayload,
  ensureActivityLanguage
} = require("../../shared/guided-authoring-contract");
const {
  applyCanonicalActivity,
  rebindSelection,
  singleFlight
} = require("../../shared/authoring-mutation-state");
const {
  presentationAtTime,
  projectAnnotations
} = require("../../shared/playable-annotations");
const {
  classifyMariaDbError,
  diagnosticPage,
  unavailablePayload
} = require("../mariadb-diagnostics");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const workspaceDirectory = path.resolve(prototypeDirectory, "..", "..");
const envFile = path.join(prototypeDirectory, ".env.local");

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, child, output, expectedStatus = "available") {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Le serveur s’est arrêté avant readiness : ${output()}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();
      if (body.status === expectedStatus) return body;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error(`Le serveur n’est pas prêt : ${output()}`);
}

async function startServer(extraEnvironment = {}) {
  const port = await freePort();
  let stdout = "";
  let stderr = "";
  const child = spawn(
    process.execPath,
    [`--env-file=${envFile}`, "server.js"],
    {
      cwd: serverDirectory,
      env: { ...process.env, PORT: String(port), ...extraEnvironment },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    child,
    baseUrl,
    output: () => `${stdout}\n${stderr}`.trim(),
    async ready(expectedStatus = "available") {
      return waitForHealth(baseUrl, child, this.output, expectedStatus);
    },
    async stop() {
      if (child.exitCode !== null) return;
      child.kill();
      await new Promise(resolve => {
        child.once("exit", resolve);
        setTimeout(() => resolve(), 3_000).unref();
      });
    }
  };
}

async function startMariaDbProxy(port) {
  const source = [
    "const net=require('node:net');",
    "const port=Number(process.argv[1]);",
    "const targetPort=Number(process.env.PROTO05_MARIADB_PORT);",
    "const targetHost=process.env.PROTO05_MARIADB_HOST;",
    "const server=net.createServer(client=>{",
    " const upstream=net.connect({host:targetHost,port:targetPort});",
    " client.pipe(upstream).pipe(client);",
    " const close=()=>{client.destroy();upstream.destroy()};",
    " client.on('error',close);upstream.on('error',close);",
    "});",
    "server.listen(port,'127.0.0.1',()=>process.stdout.write('READY\\n'));"
  ].join("");
  const child = spawn(process.execPath, [`--env-file=${envFile}`, "-e", source, String(port)], {
    cwd: serverDirectory,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Le proxy MariaDB de test ne démarre pas.")), 5_000);
    child.once("exit", code => reject(new Error(`Le proxy MariaDB s’est arrêté (${code}).`)));
    child.stdout.on("data", chunk => {
      if (!String(chunk).includes("READY")) return;
      clearTimeout(timeout);
      resolve();
    });
  });
  return {
    async stop() {
      if (child.exitCode !== null) return;
      child.kill();
      await new Promise(resolve => child.once("exit", resolve));
    }
  };
}

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json();
  return { response, body };
}

test("le runtime ne contient plus de backend métier JSON sélectionnable", () => {
  const dataFiles = fs.readdirSync(path.join(prototypeDirectory, "data"))
    .filter(name => /\.(?:json|bak)$/i.test(name));
  assert.deepEqual(dataFiles, []);
  const runtimeFiles = [
    "server.js",
    "proto05-data-mode.js",
    "proto05-read-boundary.js",
    "proto05-write-boundary.js",
    "proto05-mariadb-write.js"
  ].map(name => fs.readFileSync(path.join(serverDirectory, name), "utf8")).join("\n");
  assert.doesNotMatch(runtimeFiles, /PROTO05_DATA_MODE/);
  assert.doesNotMatch(runtimeFiles, /["'](?:mariadb-readonly|compare)["']/);
  assert.doesNotMatch(runtimeFiles, /activities\.json|activity-library\.json|video-catalog\.json|video-library\.json/);
  const hub = fs.readFileSync(
    path.join(workspaceDirectory, "prototypes", "00-ic-hub", "server", "server.js"),
    "utf8"
  );
  assert.doesNotMatch(hub, /PROTO05_DATA_FILE|readProto05Activities/);
});

test("le diagnostic MariaDB classe les erreurs sans exposer de secret", () => {
  const refused = Object.assign(new Error("connect refused"), { code: "ECONNREFUSED" });
  const denied = Object.assign(new Error("access denied"), { code: "ER_ACCESS_DENIED_ERROR" });
  const missing = Object.assign(new Error("table missing"), { code: "ER_NO_SUCH_TABLE" });
  assert.equal(classifyMariaDbError(new Error("wrapper", { cause: refused })), "connection_refused");
  assert.equal(classifyMariaDbError(denied), "authentication_or_grants");
  assert.equal(classifyMariaDbError(missing), "schema_or_migrations");
  assert.deepEqual(unavailablePayload("connection_refused"), {
    status: "unavailable",
    service: "mariadb",
    reason: "connection_refused",
    error: "Le serveur MariaDB est inaccessible."
  });
  const page = diagnosticPage("connection_refused");
  assert.match(page, /Connexion à MariaDB impossible/);
  assert.match(page, /Docker Desktop/);
  assert.match(page, />Réessayer</);
  assert.doesNotMatch(page, /password|dsn|PROTO05_MARIADB_PASSWORD/i);
});

test("la réponse canonique rend une annotation immédiatement et les clics répétés restent uniques", async () => {
  const state = { activity: { teacherAnnotations: [] } };
  let renders = 0;
  applyCanonicalActivity(state, {
    activity: {
      teacherAnnotations: [{ id: "annotation-test", segmentId: "segment-test", note: "Visible", pedagogicalQuestion: "" }]
    }
  }, () => { renders += 1; });
  assert.equal(renders, 1);
  assert.equal(state.activity.teacherAnnotations[0].note, "Visible");

  const staleSelection = {
    type: "annotation",
    item: { id: "annotation-test", note: "Objet auteur désormais détaché" },
    isNew: true
  };
  const rebound = rebindSelection(state.activity, staleSelection);
  assert.equal(rebound.item, state.activity.teacherAnnotations[0]);
  assert.equal(rebound.item.note, "Visible");
  assert.equal(rebound.isNew, false);

  let requests = 0;
  const save = singleFlight(async () => {
    requests += 1;
    await new Promise(resolve => setTimeout(resolve, 20));
    return requests;
  });
  const [first, second] = await Promise.all([save(), save()]);
  assert.equal(first, 1);
  assert.equal(second, 1);
  assert.equal(requests, 1);
});

test("MariaDB indisponible conserve HTTP, ferme le métier et récupère par Réessayer", { timeout: 30_000 }, async () => {
  const proxyPort = await freePort();
  const server = await startServer({
    PROTO05_MARIADB_HOST: "127.0.0.1",
    PROTO05_MARIADB_PORT: String(proxyPort)
  });
  let proxy = null;
  try {
    const unavailable = await server.ready("unavailable");
    assert.equal(unavailable.service, "mariadb");
    assert.equal(unavailable.reason, "connection_refused");
    assert.equal(server.child.exitCode, null);
    const business = await request(server.baseUrl, "/api/proto05/activities");
    assert.equal(business.response.status, 503);
    assert.equal(business.body.reason, "connection_refused");
    const pageResponse = await fetch(`${server.baseUrl}/teacher`);
    const page = await pageResponse.text();
    assert.equal(pageResponse.status, 503);
    assert.match(page, /Connexion à MariaDB impossible/);
    assert.match(page, /Réessayer/);
    assert.doesNotMatch(page, /password|PROTO05_MARIADB_PASSWORD/i);
    const stillUnavailable = await request(server.baseUrl, "/api/diagnostics/mariadb/retry", { method: "POST" });
    assert.equal(stillUnavailable.response.status, 503);

    proxy = await startMariaDbProxy(proxyPort);
    const recovered = await request(server.baseUrl, "/api/diagnostics/mariadb/retry", { method: "POST" });
    assert.equal(recovered.response.status, 200, recovered.body.error);
    assert.equal(recovered.body.status, "available");
    const activities = await request(server.baseUrl, "/api/proto05/activities");
    assert.equal(activities.response.status, 200);
    assert.doesNotMatch(server.output(), /password|PROTO05_MARIADB_PASSWORD/i);
  } finally {
    await proxy?.stop();
    await server.stop();
  }
});

test("CRUD activité, classement média et redémarrage restent transactionnels", { timeout: 45_000 }, async () => {
  let server = await startServer();
  let activityId = null;
  let folderId = null;
  let tagId = null;
  try {
    const health = await server.ready();
    assert.equal(health.storageAuthority, "mariadb");
    const list = await request(server.baseUrl, "/api/proto05/activities");
    assert.equal(list.response.status, 200);
    const source = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(list.body.activities[0].id)}`
    );
    const marker = `mission146-${Date.now()}`;
    const created = await request(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: `[TEST ${marker}]`,
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: source.body.activity.videoRef
      })
    });
    assert.equal(created.response.status, 201, created.body.error);
    activityId = created.body.activity.id;
    const languageCatalog = await request(server.baseUrl, "/api/proto05/language-catalog");
    const language = languageCatalog.body.languages[0];
    const authored = created.body.activity;
    ensureActivityLanguage(authored, language);
    authored.transcription = {
      ...authored.transcription,
      languageId: language.id,
      segmentIds: [`segment-${marker}`]
    };
    authored.speakers = [{ id: `speaker-${marker}`, label: "Locutrice test" }];
    authored.layers = [{
      id: `layer-${marker}`,
      label: "Couche test",
      description: "",
      color: "#4d7dbc"
    }];
    authored.layerConfiguration = {
      ...authored.layerConfiguration,
      learnerVisibleLayerIds: [`layer-${marker}`],
      teacherVisibleLayerIds: [`layer-${marker}`]
    };
    authored.segments = [{
      id: `segment-${marker}`,
      startMs: 0,
      endMs: 5000,
      text: "Segment MariaDB exclusif",
      speakerIds: [`speaker-${marker}`],
      languageIds: [language.id],
      phenomenonIds: []
    }];
    authored.languageIntervals = [{
      id: `interval-${marker}`,
      languageId: language.id,
      startMs: 0,
      endMs: 5000
    }];
    authored.overlays = [{
      id: `overlay-${marker}`,
      type: "text",
      title: "Overlay test",
      text: "Visible pendant l’intervalle",
      startMs: 1000,
      endMs: 3000,
      x: 10,
      y: 10,
      width: 30,
      height: 20,
      layerIds: [`layer-${marker}`]
    }];
    authored.teacherAnnotations = [{
      id: `annotation-${marker}`,
      segmentId: `segment-${marker}`,
      note: "ANNOTATION-M147-DEBUT",
      pedagogicalQuestion: "Question test"
    }];
    const authoring = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildAuthoringPayload(authored))
      }
    );
    assert.equal(authoring.response.status, 200, authoring.body.error);
    assert.equal(authoring.body.activity.segments[0].text, "Segment MariaDB exclusif");
    assert.equal(authoring.body.activity.teacherAnnotations[0].note, "ANNOTATION-M147-DEBUT");
    assert.equal(
      presentationAtTime(projectAnnotations(authoring.body.activity), 2).note,
      "ANNOTATION-M147-DEBUT"
    );
    assert.equal(presentationAtTime(projectAnnotations(authoring.body.activity), 6).note, "");
    const displayedState = { activity: created.body.activity };
    let displayedRenders = 0;
    applyCanonicalActivity(displayedState, authoring.body, () => { displayedRenders += 1; });
    assert.equal(displayedRenders, 1);
    assert.equal(displayedState.activity.teacherAnnotations[0].note, "ANNOTATION-M147-DEBUT");
    const updatedTitle = `[TEST ${marker}] modifiée`;
    const updated = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: updatedTitle })
      }
    );
    assert.equal(updated.response.status, 200, updated.body.error);

    const folder = await request(server.baseUrl, "/api/proto05/library/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `[TEST ${marker}] dossier` })
    });
    assert.equal(folder.response.status, 201, folder.body.error);
    folderId = folder.body.folder.id;
    const tag = await request(server.baseUrl, "/api/proto05/library/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `[TEST ${marker}] tag` })
    });
    assert.equal(tag.response.status, 201, tag.body.error);
    tagId = tag.body.tag.id;

    await server.stop();
    server = await startServer();
    await server.ready();
    const reloaded = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(reloaded.response.status, 200);
    assert.equal(reloaded.body.activity.title, updatedTitle);
    assert.equal(reloaded.body.activity.segments[0].text, "Segment MariaDB exclusif");
    assert.equal(reloaded.body.activity.overlays[0].id, `overlay-${marker}`);
    assert.equal(reloaded.body.activity.teacherAnnotations[0].note, "ANNOTATION-M147-DEBUT");

    const modifiedActivity = reloaded.body.activity;
    modifiedActivity.teacherAnnotations[0].note = "ANNOTATION-M147-MODIFIEE";
    const modifiedAnnotation = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildAuthoringPayload(modifiedActivity))
      }
    );
    assert.equal(modifiedAnnotation.response.status, 200, modifiedAnnotation.body.error);
    assert.equal(modifiedAnnotation.body.activity.teacherAnnotations[0].note, "ANNOTATION-M147-MODIFIEE");
    assert.doesNotMatch(JSON.stringify(modifiedAnnotation.body.activity), /ANNOTATION-M147-DEBUT/);

    modifiedAnnotation.body.activity.overlays = modifiedAnnotation.body.activity.overlays
      .map(overlay => overlay.annotationId === `annotation-${marker}` ? { ...overlay, annotationId: undefined } : overlay);
    modifiedAnnotation.body.activity.teacherAnnotations = [];
    const deletedAnnotation = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildAuthoringPayload(modifiedAnnotation.body.activity))
      }
    );
    assert.equal(deletedAnnotation.response.status, 200, deletedAnnotation.body.error);
    assert.deepEqual(deletedAnnotation.body.activity.teacherAnnotations, []);

    await server.stop();
    server = await startServer();
    await server.ready();
    const afterAnnotationDeletion = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(afterAnnotationDeletion.response.status, 200);
    assert.deepEqual(afterAnnotationDeletion.body.activity.teacherAnnotations, []);
    const library = await request(server.baseUrl, "/api/proto05/library/assets");
    assert.ok(library.body.folders.some(item => item.id === folderId));
    assert.ok(library.body.tags.some(item => item.id === tagId));
  } finally {
    if (server.child.exitCode === null) {
      if (tagId) await request(server.baseUrl, `/api/proto05/library/tags/${encodeURIComponent(tagId)}`, { method: "DELETE" });
      if (folderId) await request(server.baseUrl, `/api/proto05/library/folders/${encodeURIComponent(folderId)}`, { method: "DELETE" });
      if (activityId) await request(server.baseUrl, `/api/proto05/activities/${encodeURIComponent(activityId)}`, { method: "DELETE" });
    }
    await server.stop();
  }
});
