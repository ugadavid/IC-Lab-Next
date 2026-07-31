"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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
const {
  mariadbConfigurationFromEnvironment
} = require("../proto05-data-mode");
const {
  applyLocalMediaAvailabilityPlan,
  inspectLocalMediaAvailability,
  readAvailabilityRows
} = require("../local-media-availability-reconciliation");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const workspaceDirectory = path.resolve(prototypeDirectory, "..", "..");
const envFile = path.join(prototypeDirectory, ".env.local");
const mysql = require(path.resolve(
  prototypeDirectory,
  "..",
  "00-ic-hub",
  "server",
  "node_modules",
  "mysql2",
  "promise"
));

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

let testEnvironmentLoaded = false;

function loadTestEnvironment() {
  if (testEnvironmentLoaded) return;
  process.loadEnvFile(envFile);
  testEnvironmentLoaded = true;
}

async function testDatabaseConnection() {
  loadTestEnvironment();
  const config = mariadbConfigurationFromEnvironment(process.env);
  return mysql.createConnection({
    ...config,
    charset: "utf8mb4",
    dateStrings: true,
    multipleStatements: false
  });
}

async function mediaCardinalities(database) {
  const [[row]] = await database.query(`SELECT
    (SELECT COUNT(*) FROM activities) activities,
    (SELECT COUNT(*) FROM activity_media_links) activity_media_links,
    (SELECT COUNT(*) FROM media_assets) media_assets,
    (SELECT COUNT(*) FROM media_sources) media_sources,
    (SELECT COUNT(*) FROM media_playables) media_playables,
    (SELECT COUNT(*) FROM media_playable_metadata) media_playable_metadata,
    (SELECT COUNT(*) FROM media_treatments) media_treatments,
    (SELECT COUNT(*) FROM media_asset_tags) media_asset_tags,
    (SELECT COUNT(*) FROM media_folders) media_folders,
    (SELECT COUNT(*) FROM media_tags) media_tags`);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
}

async function importTemporaryMedia(server, marker, mission = "M150") {
  const fileName = `${marker}.mp4`;
  const imported = await request(
    server.baseUrl,
    `/api/proto05/library/import-local?title=${encodeURIComponent(`[TEST ${mission}] ${marker}`)}`,
    {
      method: "POST",
      headers: {
        "content-type": "video/mp4",
        "x-proto05-file-name": encodeURIComponent(fileName)
      },
      body: Buffer.from(`PROTO05-${mission}-${marker}-${crypto.randomBytes(12).toString("hex")}`)
    }
  );
  assert.equal(imported.response.status, 201, imported.body.error);
  assert.equal(imported.body.duplicate, false);
  const playable = imported.body.asset.playables.find(item => item.id === imported.body.playableId);
  assert.ok(playable?.storageKey, "Le fichier temporaire importé doit posséder une storageKey.");
  return {
    assetId: imported.body.assetId,
    playableId: imported.body.playableId,
    storageKey: playable.storageKey,
    file: path.join(prototypeDirectory, "data", "video-library-media", playable.storageKey)
  };
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

test("le préflight média MariaDB bloque les relations canoniques et nettoie uniquement les fixtures", {
  timeout: 60_000
}, async () => {
  const marker = `mission150-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const server = await startServer();
  const assets = [];
  const files = [];
  const activityIds = [];
  const treatmentIds = [];
  const folderIds = [];
  const tagIds = [];
  let database = null;
  let baseline = null;

  try {
    await server.ready();
    database = await testDatabaseConnection();
    baseline = await mediaCardinalities(database);

    const removable = await importTemporaryMedia(server, `${marker}-removable`);
    assets.push(removable.assetId);
    files.push(removable.file);
    assert.equal(fs.existsSync(removable.file), true);

    let detail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(removable.assetId)}`
    );
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.asset.usage.preflight.catalog.decision, "allowed");
    assert.equal(detail.body.asset.usage.preflight.catalog.allowed, true);

    const folder = await request(server.baseUrl, "/api/proto05/library/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `[TEST M150] dossier ${marker}` })
    });
    assert.equal(folder.response.status, 201, folder.body.error);
    folderIds.push(folder.body.folder.id);
    const tag = await request(server.baseUrl, "/api/proto05/library/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `[TEST M150] étiquette ${marker}` })
    });
    assert.equal(tag.response.status, 201, tag.body.error);
    tagIds.push(tag.body.tag.id);
    const classified = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(removable.assetId)}/classification`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folderId: folder.body.folder.id, tagIds: [tag.body.tag.id] })
      }
    );
    assert.equal(classified.response.status, 200, classified.body.error);
    detail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(removable.assetId)}`
    );
    assert.equal(detail.body.asset.usage.preflight.catalog.decision, "allowed-with-cleanup");
    assert.deepEqual(detail.body.asset.usage.cleanupDependencies, {
      folder: [{ id: folder.body.folder.id }],
      tags: [{ id: tag.body.tag.id }]
    });
    const removed = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(removable.assetId)}/physical`,
      { method: "DELETE" }
    );
    assert.equal(removed.response.status, 200, removed.body.error);
    assert.equal(removed.body.deletedFile, true);
    assert.equal(fs.existsSync(removable.file), false);
    const removedDetail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(removable.assetId)}`
    );
    assert.equal(removedDetail.response.status, 404);
    assets.splice(assets.indexOf(removable.assetId), 1);

    const folderStillExists = await database.query(
      "SELECT COUNT(*) count FROM media_folders WHERE id = ?",
      [folder.body.folder.id]
    );
    const tagStillExists = await database.query(
      "SELECT COUNT(*) count FROM media_tags WHERE id = ?",
      [tag.body.tag.id]
    );
    assert.equal(Number(folderStillExists[0][0].count), 1);
    assert.equal(Number(tagStillExists[0][0].count), 1);
    const removedFolder = await request(
      server.baseUrl,
      `/api/proto05/library/folders/${encodeURIComponent(folder.body.folder.id)}`,
      { method: "DELETE" }
    );
    assert.equal(removedFolder.response.status, 200, removedFolder.body.error);
    folderIds.length = 0;
    const removedTag = await request(
      server.baseUrl,
      `/api/proto05/library/tags/${encodeURIComponent(tag.body.tag.id)}`,
      { method: "DELETE" }
    );
    assert.equal(removedTag.response.status, 200, removedTag.body.error);
    tagIds.length = 0;

    const used = await importTemporaryMedia(server, `${marker}-activity`);
    assets.push(used.assetId);
    files.push(used.file);
    const activity = await request(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: `[TEST M150] activité ${marker}`,
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: { assetId: used.assetId, playableId: used.playableId }
      })
    });
    assert.equal(activity.response.status, 201, activity.body.error);
    activityIds.push(activity.body.activity.id);
    detail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(used.assetId)}`
    );
    assert.equal(detail.body.asset.usage.preflight.catalog.decision, "blocked");
    assert.equal(detail.body.asset.usage.activities[0].id, activity.body.activity.id);
    const refusedActivity = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(used.assetId)}/physical`,
      { method: "DELETE" }
    );
    assert.equal(refusedActivity.response.status, 409);
    assert.ok(refusedActivity.body.conflicts.some(item => item.type === "activities"));
    assert.equal(fs.existsSync(used.file), true);
    const persistedActivityAsset = await database.query(
      "SELECT COUNT(*) count FROM media_assets WHERE id = ?",
      [used.assetId]
    );
    assert.equal(Number(persistedActivityAsset[0][0].count), 1);
    const deletedActivity = await request(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activity.body.activity.id)}`,
      { method: "DELETE" }
    );
    assert.equal(deletedActivity.response.status, 200, deletedActivity.body.error);
    activityIds.length = 0;
    const deletedUsed = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(used.assetId)}/physical`,
      { method: "DELETE" }
    );
    assert.equal(deletedUsed.response.status, 200, deletedUsed.body.error);
    assert.equal(fs.existsSync(used.file), false);
    assets.splice(assets.indexOf(used.assetId), 1);

    const input = await importTemporaryMedia(server, `${marker}-input`);
    const output = await importTemporaryMedia(server, `${marker}-output`);
    assets.push(input.assetId, output.assetId);
    files.push(input.file, output.file);
    const treatmentId = `treatment-${marker}`;
    treatmentIds.push(treatmentId);
    await database.beginTransaction();
    try {
      await database.query(
        `UPDATE media_assets
         SET parent_asset_id = ?,
             family_root_asset_id = ?,
             provenance_json = JSON_REMOVE(
               COALESCE(provenance_json, JSON_OBJECT()),
               '$._migration.originalParentAssetId',
               '$._migration.originalFamilyRootAssetId'
             )
         WHERE id = ?`,
        [input.assetId, input.assetId, output.assetId]
      );
      await database.query(
        `INSERT INTO media_treatments (
          id, source_asset_id, source_playable_id, output_asset_id, output_playable_id,
          published_playable_id, type, label, status, progress, retained,
          source_preparation_id, runtime_job_id, engine, engine_version, ffmpeg_version,
          parameters_json, diagnostics_json, error_json,
          created_at, started_at, updated_at, finished_at
        ) VALUES (?, ?, ?, ?, ?, NULL, 'mission150-fixture', ?, 'running', 50, 0,
          NULL, NULL, 'mission150', '1', NULL, '{}', '{}', NULL,
          CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), NULL)`,
        [
          treatmentId,
          input.assetId,
          input.playableId,
          output.assetId,
          output.playableId,
          `[TEST M150] traitement ${marker}`
        ]
      );
      await database.commit();
    } catch (error) {
      await database.rollback();
      throw error;
    }

    const inputDetail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(input.assetId)}`
    );
    assert.equal(inputDetail.response.status, 200, inputDetail.body.error);
    assert.deepEqual(
      inputDetail.body.asset.usage.otherDependencies.treatments[0].relations,
      ["source-asset", "source-playable"]
    );
    assert.ok(inputDetail.body.asset.usage.otherDependencies.derivations.some(
      item => item.id === output.assetId
    ));
    const outputDetail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(output.assetId)}`
    );
    assert.equal(outputDetail.response.status, 200, outputDetail.body.error);
    assert.deepEqual(
      outputDetail.body.asset.usage.otherDependencies.treatments[0].relations,
      ["output-asset", "output-playable"]
    );
    for (const target of [input, output]) {
      const refused = await request(
        server.baseUrl,
        `/api/proto05/library/assets/${encodeURIComponent(target.assetId)}/physical`,
        { method: "DELETE" }
      );
      assert.equal(refused.response.status, 409);
      assert.ok(refused.body.conflicts.some(item => item.type === "treatments"));
      assert.equal(fs.existsSync(target.file), true);
    }
    await database.beginTransaction();
    try {
      await database.query("DELETE FROM media_treatments WHERE id = ?", [treatmentId]);
      await database.query(
        "UPDATE media_assets SET parent_asset_id = NULL, family_root_asset_id = NULL WHERE id = ?",
        [output.assetId]
      );
      await database.commit();
    } catch (error) {
      await database.rollback();
      throw error;
    }
    treatmentIds.length = 0;
    for (const target of [output, input]) {
      const deletion = await request(
        server.baseUrl,
        `/api/proto05/library/assets/${encodeURIComponent(target.assetId)}/physical`,
        { method: "DELETE" }
      );
      assert.equal(deletion.response.status, 200, deletion.body.error);
      assert.equal(fs.existsSync(target.file), false);
      assets.splice(assets.indexOf(target.assetId), 1);
    }

    const missing = await importTemporaryMedia(server, `${marker}-missing`);
    assets.push(missing.assetId);
    files.push(missing.file);
    fs.rmSync(missing.file);
    detail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(missing.assetId)}`
    );
    assert.equal(detail.body.asset.usage.preflight.physical.decision, "file-missing");
    assert.equal(detail.body.asset.usage.preflight.physical.allowed, false);
    assert.equal(detail.body.asset.usage.preflight.catalog.allowed, true);
    const refusedMissing = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(missing.assetId)}/physical`,
      { method: "DELETE" }
    );
    assert.equal(refusedMissing.response.status, 409);
    const stillPresent = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(missing.assetId)}`
    );
    assert.equal(stillPresent.response.status, 200);
    const removedMissing = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(missing.assetId)}`,
      { method: "DELETE" }
    );
    assert.equal(removedMissing.response.status, 200, removedMissing.body.error);
    assets.splice(assets.indexOf(missing.assetId), 1);
  } finally {
    if (database) {
      if (treatmentIds.length) {
        await database.query(
          `DELETE FROM media_treatments WHERE id IN (${treatmentIds.map(() => "?").join(",")})`,
          treatmentIds
        );
      }
      if (activityIds.length) {
        await database.query(
          `DELETE FROM activities WHERE id IN (${activityIds.map(() => "?").join(",")})`,
          activityIds
        );
      }
      if (assets.length) {
        await database.query(
          `UPDATE media_assets SET parent_asset_id = NULL, family_root_asset_id = NULL
           WHERE id IN (${assets.map(() => "?").join(",")})`,
          assets
        );
        await database.query(
          `UPDATE media_assets SET default_playable_id = NULL
           WHERE id IN (${assets.map(() => "?").join(",")})`,
          assets
        );
        await database.query(
          `DELETE FROM media_asset_tags WHERE asset_id IN (${assets.map(() => "?").join(",")})`,
          assets
        );
        await database.query(
          `DELETE FROM media_playable_metadata
           WHERE playable_id IN (
             SELECT id FROM media_playables
             WHERE asset_id IN (${assets.map(() => "?").join(",")})
           )`,
          assets
        );
        await database.query(
          `DELETE FROM media_playables WHERE asset_id IN (${assets.map(() => "?").join(",")})`,
          assets
        );
        await database.query(
          `DELETE FROM media_sources WHERE asset_id IN (${assets.map(() => "?").join(",")})`,
          assets
        );
        await database.query(
          `DELETE FROM media_assets WHERE id IN (${assets.map(() => "?").join(",")})`,
          assets
        );
      }
      if (folderIds.length) {
        await database.query(
          `DELETE FROM media_folders WHERE id IN (${folderIds.map(() => "?").join(",")})`,
          folderIds
        );
      }
      if (tagIds.length) {
        await database.query(
          `DELETE FROM media_tags WHERE id IN (${tagIds.map(() => "?").join(",")})`,
          tagIds
        );
      }
      for (const file of files) {
        const mediaRoot = path.resolve(prototypeDirectory, "data", "video-library-media");
        const resolved = path.resolve(file);
        assert.ok(resolved.startsWith(`${mediaRoot}${path.sep}`));
        fs.rmSync(resolved, { force: true });
      }
      if (baseline) {
        assert.deepEqual(await mediaCardinalities(database), baseline);
      }
      await database.end();
    }
    await server.stop();
  }
});

test("la réconciliation locale MariaDB suit le disque, refuse un état concurrent et nettoie sa fixture", {
  timeout: 60_000
}, async () => {
  const marker = `mission151-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const roots = {
    "legacy-media": path.join(prototypeDirectory, "data", "video-library-media"),
    workspace: path.join(prototypeDirectory, "data", "video-library-workspaces")
  };
  let server = await startServer();
  let database = null;
  let imported = null;
  let absentFile = null;
  let baseline = null;
  let documentUpdatedAt = null;
  try {
    await server.ready();
    database = await testDatabaseConnection();
    baseline = await mediaCardinalities(database);
    [[{ source_updated_at_utc: documentUpdatedAt }]] = await database.query(
      "SELECT source_updated_at_utc FROM data_projection_metadata WHERE document_key = 'media-library'"
    );
    imported = await importTemporaryMedia(server, marker, "M151");

    let rows = await readAvailabilityRows(database, { ids: [imported.playableId] });
    let plan = await inspectLocalMediaAvailability(rows, { roots });
    assert.equal(plan.safeToApply, true);
    assert.equal(plan.changes.length, 0);

    await database.query(
      "UPDATE media_playables SET availability = 'missing-local', availability_reason = 'missing-file' WHERE id = ?",
      [imported.playableId]
    );
    rows = await readAvailabilityRows(database, { ids: [imported.playableId] });
    plan = await inspectLocalMediaAvailability(rows, { roots });
    assert.equal(plan.changes[0].decision, "restore-available");
    let applied = await applyLocalMediaAvailabilityPlan({
      database,
      plan,
      roots,
      expectedPlanHash: plan.planHash,
      expectedUpdateCount: 1
    });
    assert.equal(applied.applied, 1);
    let detail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(imported.assetId)}`
    );
    assert.equal(detail.response.status, 200);
    assert.equal(
      detail.body.asset.playables.find(item => item.id === imported.playableId).availability,
      "available"
    );

    absentFile = `${imported.file}.m151-away`;
    fs.renameSync(imported.file, absentFile);
    rows = await readAvailabilityRows(database, { ids: [imported.playableId] });
    plan = await inspectLocalMediaAvailability(rows, { roots });
    assert.equal(plan.changes[0].decision, "degrade-to-missing");
    applied = await applyLocalMediaAvailabilityPlan({
      database,
      plan,
      roots,
      expectedPlanHash: plan.planHash,
      expectedUpdateCount: 1
    });
    assert.equal(applied.applied, 1);
    detail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(imported.assetId)}`
    );
    assert.equal(
      detail.body.asset.playables.find(item => item.id === imported.playableId).availability,
      "missing-local"
    );
    const [[assetStillPresent]] = await database.query(
      "SELECT COUNT(*) count FROM media_assets WHERE id = ?",
      [imported.assetId]
    );
    assert.equal(Number(assetStillPresent.count), 1);

    fs.renameSync(absentFile, imported.file);
    absentFile = null;
    rows = await readAvailabilityRows(database, { ids: [imported.playableId] });
    const stalePlan = await inspectLocalMediaAvailability(rows, { roots });
    assert.equal(stalePlan.changes[0].decision, "restore-available");
    await database.query(
      "UPDATE media_playables SET availability = 'unknown', availability_reason = NULL WHERE id = ?",
      [imported.playableId]
    );
    await assert.rejects(
      applyLocalMediaAvailabilityPlan({
        database,
        plan: stalePlan,
        roots,
        expectedPlanHash: stalePlan.planHash,
        expectedUpdateCount: 1
      }),
      error => error.code === "PROTO05_AVAILABILITY_PRECONDITION_FAILED"
    );
    const [[concurrentState]] = await database.query(
      "SELECT availability, availability_reason FROM media_playables WHERE id = ?",
      [imported.playableId]
    );
    assert.deepEqual(
      { availability: concurrentState.availability, reason: concurrentState.availability_reason },
      { availability: "unknown", reason: null }
    );

    await database.query(
      "UPDATE media_playables SET availability = 'missing-local', availability_reason = 'missing-file' WHERE id = ?",
      [imported.playableId]
    );
    rows = await readAvailabilityRows(database, { ids: [imported.playableId] });
    plan = await inspectLocalMediaAvailability(rows, { roots });
    await applyLocalMediaAvailabilityPlan({
      database,
      plan,
      roots,
      expectedPlanHash: plan.planHash,
      expectedUpdateCount: 1
    });
    rows = await readAvailabilityRows(database, { ids: [imported.playableId] });
    plan = await inspectLocalMediaAvailability(rows, { roots });
    assert.equal(plan.changes.length, 0);

    await server.stop();
    server = await startServer();
    await server.ready();
    detail = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(imported.assetId)}`
    );
    assert.equal(detail.response.status, 200);
    assert.equal(
      detail.body.asset.playables.find(item => item.id === imported.playableId).availability,
      "available"
    );
    const removed = await request(
      server.baseUrl,
      `/api/proto05/library/assets/${encodeURIComponent(imported.assetId)}/physical`,
      { method: "DELETE" }
    );
    assert.equal(removed.response.status, 200, removed.body.error);
    assert.equal(fs.existsSync(imported.file), false);
    imported = null;
  } finally {
    if (absentFile && fs.existsSync(absentFile) && imported?.file) fs.renameSync(absentFile, imported.file);
    if (server?.child.exitCode === null && imported?.assetId) {
      await request(
        server.baseUrl,
        `/api/proto05/library/assets/${encodeURIComponent(imported.assetId)}/physical`,
        { method: "DELETE" }
      ).catch(() => null);
    }
    if (database) {
      if (imported?.assetId) {
        await database.query("UPDATE media_assets SET default_playable_id = NULL WHERE id = ?", [imported.assetId]);
        await database.query("DELETE FROM media_playable_metadata WHERE playable_id = ?", [imported.playableId]);
        await database.query("DELETE FROM media_playables WHERE id = ?", [imported.playableId]);
        await database.query("DELETE FROM media_sources WHERE asset_id = ?", [imported.assetId]);
        await database.query("DELETE FROM media_assets WHERE id = ?", [imported.assetId]);
        fs.rmSync(imported.file, { force: true });
      }
      if (documentUpdatedAt !== null) {
        await database.query(
          "UPDATE data_projection_metadata SET source_updated_at_utc = ? WHERE document_key = 'media-library'",
          [documentUpdatedAt]
        );
      }
      if (baseline) assert.deepEqual(await mediaCardinalities(database), baseline);
      await database.end();
    }
    await server.stop();
  }
});
