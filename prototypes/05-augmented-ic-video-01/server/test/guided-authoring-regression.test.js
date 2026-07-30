"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const {
  applyLanguageIntervalBounds,
  buildAuthoringPayload,
  deleteLayer,
  deleteSegmentCascade,
  ensureActivityLanguage,
  layerDeletionDialogMessage,
  layerDeletionIssue,
  languageIntervalTimeIssue,
  phenomenonIssue,
  preparePhenomenon,
  renderLanguageOptions,
  segmentDependencies
} = require("../../shared/guided-authoring-contract");
const {
  messageAfterLocalChange,
  saveStateFromMessage,
  transitionSaveState
} = require("../../shared/teacher-shell");
const {
  hasVisibleTranscription,
  projectSegments,
  segmentIndexAtTime
} = require("../../shared/playable-transcription");
const {
  hasVisibleOverlay,
  overlayAtTime,
  projectOverlays
} = require("../../shared/playable-overlays");
const { projectLayers } = require("../../shared/playable-layers");
const {
  projectPhenomena,
  visiblePhenomena
} = require("../../shared/playable-phenomena");
const { mariadbConfigurationFromEnvironment } = require("../proto05-data-mode");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalStore() {
  return JSON.parse(fs.readFileSync(canonicalDataFile, "utf8"));
}

async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      resolve();
    }, 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

async function startMariaDbServer() {
  const port = await freePort();
  let stderr = "";
  let child;
  const start = async () => {
    child = spawn(process.execPath, [path.join(serverDirectory, "server.js")], {
      cwd: serverDirectory,
      env: { ...process.env, PORT: String(port), PROTO05_DATA_MODE: "mariadb" },
      windowsHide: true
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => { stderr += chunk; });
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Serveur MariaDB arrêté prématurément : ${stderr}`);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (response.ok) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error(`Healthcheck MariaDB indisponible : ${stderr}`);
  };
  await start();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async restart() {
      await stopChild(child);
      stderr = "";
      await start();
    },
    async cleanup() {
      await stopChild(child);
    }
  };
}

async function jsonRequest(baseUrl, route, options) {
  const response = await fetch(`${baseUrl}${route}`, options);
  let body = {};
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function mariaDbConnection() {
  const mysql = require(path.resolve(
    prototypeDirectory,
    "..",
    "00-ic-hub",
    "server",
    "node_modules",
    "mysql2",
    "promise"
  ));
  return mysql.createConnection({
    ...mariadbConfigurationFromEnvironment(process.env),
    charset: "utf8mb4",
    dateStrings: true
  });
}

async function exerciseSpeakerAndPhenomenonPersistence(server, marker) {
  let activityId = null;
  try {
    const list = await jsonRequest(server.baseUrl, "/api/proto05/activities");
    assert.equal(list.response.status, 200);
    const sourceId = list.body.activities[0].id;
    const source = await jsonRequest(server.baseUrl, `/api/proto05/activities/${encodeURIComponent(sourceId)}`);
    assert.equal(source.response.status, 200);

    const created = await jsonRequest(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: `[TEST ${marker}] activité jetable`,
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: source.body.activity.videoRef
      })
    });
    assert.equal(created.response.status, 201);
    activityId = created.body.activity.id;

    const activity = created.body.activity;
    activity.speakers = [{ id: `speaker-${marker}`, label: "Locutrice initiale" }];
    activity.layers = [{
      id: `layer-${marker}`,
      label: "Phénomène test",
      description: "",
      color: "#4d7dbc"
    }];
    activity.layerConfiguration = {
      ...activity.layerConfiguration,
      learnerVisibleLayerIds: [`layer-${marker}`],
      teacherVisibleLayerIds: [`layer-${marker}`]
    };
    activity.segments = [{
      id: `segment-${marker}`,
      startMs: 1000,
      endMs: 5000,
      text: "Segment jetable",
      speakerIds: [`speaker-${marker}`],
      languageIds: [],
      phenomenonIds: [`phenomenon-${marker}`]
    }];
    activity.phenomena = [{
      id: `phenomenon-${marker}`,
      segmentId: `segment-${marker}`,
      layerId: `layer-${marker}`,
      startMs: 1500,
      endMs: 2500
    }];

    const firstSave = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildAuthoringPayload(activity))
      }
    );
    assert.equal(firstSave.response.status, 200, firstSave.body.error);
    assert.equal(firstSave.body.activity.speakers[0].label, "Locutrice initiale");
    assert.equal(firstSave.body.activity.phenomena[0].startMs, 1500);

    const updated = firstSave.body.activity;
    updated.speakers[0].label = "Locutrice modifiée";
    updated.phenomena[0].startMs = 2000;
    updated.phenomena[0].endMs = 3000;
    const secondSave = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildAuthoringPayload(updated))
      }
    );
    assert.equal(secondSave.response.status, 200, secondSave.body.error);

    await server.restart();
    const reloaded = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(reloaded.response.status, 200);
    assert.deepEqual(reloaded.body.activity.speakers, [{
      id: `speaker-${marker}`,
      label: "Locutrice modifiée"
    }]);
    assert.deepEqual(reloaded.body.activity.segments[0].speakerIds, [`speaker-${marker}`]);
    assert.deepEqual(reloaded.body.activity.phenomena, [{
      id: `phenomenon-${marker}`,
      segmentId: `segment-${marker}`,
      layerId: `layer-${marker}`,
      startMs: 2000,
      endMs: 3000
    }]);
  } finally {
    if (activityId) {
      const deleted = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`,
        { method: "DELETE" }
      );
      assert.equal(deleted.response.status, 200, deleted.body.error);
      const absent = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`
      );
      assert.equal(absent.response.status, 404);
    }
  }
}

async function exerciseLanguageCatalogPersistence(server) {
  let activityId = null;
  try {
    const catalog = await jsonRequest(server.baseUrl, "/api/proto05/language-catalog");
    assert.equal(catalog.response.status, 200);
    assert.ok(catalog.body.languages.length > 0);
    const optionMarkup = renderLanguageOptions(catalog.body.languages, catalog.body.languages[0].id);
    assert.equal((optionMarkup.match(/<option /g) || []).length, catalog.body.languages.length);
    for (const language of catalog.body.languages) assert.match(optionMarkup, new RegExp(`>${language.label}<`));

    const list = await jsonRequest(server.baseUrl, "/api/proto05/activities");
    const source = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(list.body.activities[0].id)}`
    );
    const created = await jsonRequest(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "[TEST language-catalog] activité jetable",
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: source.body.activity.videoRef
      })
    });
    assert.equal(created.response.status, 201);
    activityId = created.body.activity.id;

    const selected = catalog.body.languages[0];
    const activity = created.body.activity;
    ensureActivityLanguage(activity, selected);
    activity.languageIntervals = [{
      id: "interval-language-catalog-test",
      languageId: selected.id,
      startMs: 1000,
      endMs: 2000
    }];
    const saved = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildAuthoringPayload(activity))
      }
    );
    assert.equal(saved.response.status, 200, saved.body.error);
    assert.equal(saved.body.activity.languageIntervals[0].languageId, selected.id);

    await server.restart();
    const reloaded = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(reloaded.response.status, 200);
    assert.deepEqual(reloaded.body.activity.languages, [{
      id: selected.id,
      code: selected.id.toUpperCase(),
      label: selected.label
    }]);
    assert.deepEqual(reloaded.body.activity.languageIntervals, [{
      id: "interval-language-catalog-test",
      languageId: selected.id,
      startMs: 1000,
      endMs: 2000
    }]);
  } finally {
    if (activityId) {
      const deleted = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`,
        { method: "DELETE" }
      );
      assert.equal(deleted.response.status, 200, deleted.body.error);
      const absent = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`
      );
      assert.equal(absent.response.status, 404);
    }
  }
}

async function exerciseTranscriptionSegmentPersistence(server) {
  const segmentId = "segment-playable-projection-test";
  const segmentText = "Segment de transcription jetable M141";
  let activityId = null;
  try {
    const list = await jsonRequest(server.baseUrl, "/api/proto05/activities");
    assert.equal(list.response.status, 200);
    const source = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(list.body.activities[0].id)}`
    );
    assert.equal(source.response.status, 200);
    const created = await jsonRequest(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "[TEST transcription] activité jetable",
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: source.body.activity.videoRef
      })
    });
    assert.equal(created.response.status, 201);
    activityId = created.body.activity.id;

    const activity = created.body.activity;
    activity.segments = [{
      id: segmentId,
      startMs: 1000,
      endMs: 3000,
      text: segmentText,
      speakerIds: [],
      languageIds: [],
      phenomenonIds: []
    }];
    const saved = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildAuthoringPayload(activity))
      }
    );
    assert.equal(saved.response.status, 200, saved.body.error);

    const database = await mariaDbConnection();
    try {
      const [rows] = await database.query(
        "SELECT `id`, `start_ms`, `end_ms`, `text` FROM `activity_segments` WHERE `activity_id` = ? AND `id` = ?",
        [activityId, segmentId]
      );
      assert.deepEqual(rows.map(row => ({
        id: row.id,
        startMs: Number(row.start_ms),
        endMs: Number(row.end_ms),
        text: row.text
      })), [{
        id: segmentId,
        startMs: 1000,
        endMs: 3000,
        text: segmentText
      }]);
    } finally {
      await database.end();
    }

    await server.restart();
    const reloaded = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(reloaded.response.status, 200);
    assert.deepEqual(reloaded.body.activity.segments, [{
      id: segmentId,
      startMs: 1000,
      endMs: 3000,
      text: segmentText,
      speakerIds: [],
      languageIds: [],
      phenomenonIds: []
    }]);

    for (const route of [
      `/teacher/preview/${encodeURIComponent(activityId)}`,
      `/student/${encodeURIComponent(activityId)}`
    ]) {
      const response = await fetch(`${server.baseUrl}${route}`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, /\/shared\/playable-transcription\.js/);
      assert.match(html, /Proto05PlayableTranscription\.projectSegments/);
    }
  } finally {
    if (activityId) {
      const deleted = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`,
        { method: "DELETE" }
      );
      assert.equal(deleted.response.status, 200, deleted.body.error);
      const database = await mariaDbConnection();
      try {
        const [[remaining]] = await database.query(
          "SELECT COUNT(*) AS `count` FROM `activity_segments` WHERE `activity_id` = ? OR `id` = ?",
          [activityId, segmentId]
        );
        assert.equal(Number(remaining.count), 0);
      } finally {
        await database.end();
      }
    }
  }
}

async function exercisePlayableOverlayPersistence(server) {
  const overlayId = "overlay-playable-projection-test";
  const overlayTitle = "Overlay jetable M141";
  const overlayText = "Contenu overlay commun preview et student";
  let activityId = null;
  try {
    const list = await jsonRequest(server.baseUrl, "/api/proto05/activities");
    assert.equal(list.response.status, 200);
    const source = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(list.body.activities[0].id)}`
    );
    assert.equal(source.response.status, 200);
    const created = await jsonRequest(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "[TEST overlay] activité jetable",
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: source.body.activity.videoRef
      })
    });
    assert.equal(created.response.status, 201);
    activityId = created.body.activity.id;

    const activity = created.body.activity;
    activity.overlays = [{
      id: overlayId,
      startMs: 1000,
      endMs: 3000,
      title: overlayTitle,
      text: overlayText,
      layerIds: []
    }];
    const payload = buildAuthoringPayload(activity);
    assert.deepEqual(payload.overlays, activity.overlays);
    const saved = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    assert.equal(saved.response.status, 200, saved.body.error);

    const database = await mariaDbConnection();
    try {
      const [rows] = await database.query(
        "SELECT `id`, `annotation_id`, `start_ms`, `end_ms`, `title`, `text`, `sort_order` FROM `activity_overlays` WHERE `activity_id` = ? AND `id` = ?",
        [activityId, overlayId]
      );
      assert.deepEqual(rows.map(row => ({
        id: row.id,
        annotationId: row.annotation_id,
        startMs: Number(row.start_ms),
        endMs: Number(row.end_ms),
        title: row.title,
        text: row.text,
        sortOrder: Number(row.sort_order)
      })), [{
        id: overlayId,
        annotationId: null,
        startMs: 1000,
        endMs: 3000,
        title: overlayTitle,
        text: overlayText,
        sortOrder: 0
      }]);
    } finally {
      await database.end();
    }

    await server.restart();
    const reloaded = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(reloaded.response.status, 200);
    assert.deepEqual(reloaded.body.activity.overlays, [{
      id: overlayId,
      startMs: 1000,
      endMs: 3000,
      title: overlayTitle,
      text: overlayText,
      layerIds: []
    }]);

    for (const route of [
      `/teacher/preview/${encodeURIComponent(activityId)}`,
      `/student/${encodeURIComponent(activityId)}`
    ]) {
      const response = await fetch(`${server.baseUrl}${route}`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, /\/shared\/playable-overlays\.js/);
      assert.match(html, /Proto05PlayableOverlays\.projectOverlays/);
    }
  } finally {
    if (activityId) {
      const deleted = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`,
        { method: "DELETE" }
      );
      assert.equal(deleted.response.status, 200, deleted.body.error);
      const database = await mariaDbConnection();
      try {
        const [[overlays]] = await database.query(
          "SELECT COUNT(*) AS `count` FROM `activity_overlays` WHERE `activity_id` = ? OR `id` = ?",
          [activityId, overlayId]
        );
        const [[layers]] = await database.query(
          "SELECT COUNT(*) AS `count` FROM `activity_overlay_layers` WHERE `activity_id` = ? OR `overlay_id` = ?",
          [activityId, overlayId]
        );
        assert.equal(Number(overlays.count), 0);
        assert.equal(Number(layers.count), 0);
      } finally {
        await database.end();
      }
    }
  }
}

async function exercisePlayableLayerPersistence(server) {
  const layerIds = ["layer-playable-one", "layer-playable-two"];
  const overlayIds = ["overlay-playable-autonomous", "overlay-playable-enriched"];
  let activityId = null;
  try {
    const list = await jsonRequest(server.baseUrl, "/api/proto05/activities");
    assert.equal(list.response.status, 200);
    const source = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(list.body.activities[0].id)}`
    );
    assert.equal(source.response.status, 200);
    const created = await jsonRequest(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "[TEST layers] activité jetable",
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: source.body.activity.videoRef
      })
    });
    assert.equal(created.response.status, 201);
    activityId = created.body.activity.id;

    const activity = created.body.activity;
    activity.layers = [
      { id: layerIds[0], label: "Couche jetable une", description: "Première", color: "#4d7dbc" },
      { id: layerIds[1], label: "Couche jetable deux", description: "Deuxième", color: "#8c65ad" }
    ];
    activity.layerConfiguration = {
      ...activity.layerConfiguration,
      defaultVisibleLayerIds: [],
      learnerVisibleLayerIds: [],
      teacherVisibleLayerIds: [],
      allowLearnerToggle: true
    };
    activity.segments = [
      {
        id: "segment-playable-simple",
        startMs: 1000,
        endMs: 3000,
        text: "Transcription simple toujours visible",
        speakerIds: [],
        languageIds: [],
        phenomenonIds: []
      },
      {
        id: "segment-playable-enriched",
        startMs: 4000,
        endMs: 6000,
        text: "Transcription enrichie toujours visible",
        speakerIds: [],
        languageIds: [],
        phenomenonIds: ["phenomenon-playable-one"]
      }
    ];
    activity.phenomena = [{
      id: "phenomenon-playable-one",
      segmentId: "segment-playable-enriched",
      layerId: layerIds[0],
      startMs: 4500,
      endMs: 5500
    }];
    activity.overlays = [
      {
        id: overlayIds[0],
        startMs: 1000,
        endMs: 3000,
        title: "Overlay autonome jetable",
        text: "Visible sans couche active",
        layerIds: []
      },
      {
        id: overlayIds[1],
        startMs: 4000,
        endMs: 6000,
        title: "Overlay enrichi jetable",
        text: "Visible avec la première couche",
        layerIds: [layerIds[0]]
      }
    ];
    const payload = buildAuthoringPayload(activity);
    assert.deepEqual(payload.layers, activity.layers);
    assert.deepEqual(payload.segments, activity.segments);
    assert.deepEqual(payload.phenomena, activity.phenomena);
    assert.deepEqual(payload.overlays.map(overlay => overlay.layerIds), [[], [layerIds[0]]]);
    const saved = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    assert.equal(saved.response.status, 200, saved.body.error);

    const database = await mariaDbConnection();
    try {
      const [layers] = await database.query(
        "SELECT `id`, `label`, `sort_order` FROM `activity_layers` WHERE `activity_id` = ? ORDER BY `sort_order`, `id`",
        [activityId]
      );
      assert.deepEqual(layers.map(layer => ({
        id: layer.id,
        label: layer.label,
        sortOrder: Number(layer.sort_order)
      })), [
        { id: layerIds[0], label: "Couche jetable une", sortOrder: 0 },
        { id: layerIds[1], label: "Couche jetable deux", sortOrder: 1 }
      ]);
      const [overlayLayers] = await database.query(
        "SELECT `overlay_id`, `layer_id` FROM `activity_overlay_layers` WHERE `activity_id` = ? ORDER BY `overlay_id`, `layer_id`",
        [activityId]
      );
      assert.deepEqual(overlayLayers, [{
        overlay_id: overlayIds[1],
        layer_id: layerIds[0]
      }]);
      const [segments] = await database.query(
        "SELECT `id`, `text`, `sort_order` FROM `activity_segments` WHERE `activity_id` = ? ORDER BY `sort_order`, `id`",
        [activityId]
      );
      assert.deepEqual(segments.map(segment => ({
        id: segment.id,
        text: segment.text,
        sortOrder: Number(segment.sort_order)
      })), [
        { id: "segment-playable-simple", text: "Transcription simple toujours visible", sortOrder: 0 },
        { id: "segment-playable-enriched", text: "Transcription enrichie toujours visible", sortOrder: 1 }
      ]);
      const [phenomena] = await database.query(
        "SELECT `id`, `segment_id`, `layer_id`, `start_ms`, `end_ms` FROM `activity_phenomena` WHERE `activity_id` = ?",
        [activityId]
      );
      assert.deepEqual(phenomena.map(phenomenon => ({
        id: phenomenon.id,
        segmentId: phenomenon.segment_id,
        layerId: phenomenon.layer_id,
        startMs: Number(phenomenon.start_ms),
        endMs: Number(phenomenon.end_ms)
      })), [{
        id: "phenomenon-playable-one",
        segmentId: "segment-playable-enriched",
        layerId: layerIds[0],
        startMs: 4500,
        endMs: 5500
      }]);
    } finally {
      await database.end();
    }

    await server.restart();
    const reloaded = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(reloaded.response.status, 200);
    assert.deepEqual(reloaded.body.activity.layers, activity.layers);
    assert.deepEqual(reloaded.body.activity.segments, activity.segments);
    assert.deepEqual(reloaded.body.activity.phenomena, activity.phenomena);
    assert.deepEqual(
      reloaded.body.activity.overlays.map(overlay => overlay.layerIds),
      [[], [layerIds[0]]]
    );
    assert.deepEqual(reloaded.body.activity.layerConfiguration.learnerVisibleLayerIds, []);
    assert.deepEqual(reloaded.body.activity.layerConfiguration.teacherVisibleLayerIds, []);

    for (const route of [
      `/teacher/preview/${encodeURIComponent(activityId)}`,
      `/student/${encodeURIComponent(activityId)}`
    ]) {
      const response = await fetch(`${server.baseUrl}${route}`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, /\/shared\/playable-layers\.js/);
      assert.match(html, /Proto05PlayableLayers\.projectLayers/);
      assert.match(html, /\/shared\/playable-phenomena\.js/);
      assert.match(html, /Proto05PlayablePhenomena\.visiblePhenomena/);
    }
  } finally {
    if (activityId) {
      const deleted = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`,
        { method: "DELETE" }
      );
      assert.equal(deleted.response.status, 200, deleted.body.error);
      const database = await mariaDbConnection();
      try {
        for (const table of [
          "activity_layers",
          "activity_layer_visibility",
          "activity_segments",
          "activity_phenomena",
          "activity_overlays",
          "activity_overlay_layers"
        ]) {
          const [[remaining]] = await database.query(
            `SELECT COUNT(*) AS \`count\` FROM \`${table}\` WHERE \`activity_id\` = ?`,
            [activityId]
          );
          assert.equal(Number(remaining.count), 0, table);
        }
      } finally {
        await database.end();
      }
    }
  }
}

async function exerciseUpdateDeleteLifecycle(server, marker, inspectDatabase = false) {
  let activityId = null;
  const ids = {
    speaker: `speaker-${marker}`,
    secondSpeaker: `speaker-two-${marker}`,
    segment: `segment-${marker}`,
    interval: `interval-${marker}`,
    firstLayer: `layer-one-${marker}`,
    secondLayer: `layer-two-${marker}`,
    phenomenon: `phenomenon-${marker}`,
    overlay: `overlay-${marker}`
  };
  const save = activity => jsonRequest(
    server.baseUrl,
    `/api/proto05/activities/${encodeURIComponent(activityId)}/authoring`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildAuthoringPayload(activity))
    }
  );

  try {
    const list = await jsonRequest(server.baseUrl, "/api/proto05/activities");
    assert.equal(list.response.status, 200);
    const source = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(list.body.activities[0].id)}`
    );
    assert.equal(source.response.status, 200);
    const created = await jsonRequest(server.baseUrl, "/api/proto05/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: `[TEST ${marker}] cycle modification suppression`,
        description: "",
        instruction: "",
        pedagogicalQuestion: "",
        videoRef: source.body.activity.videoRef
      })
    });
    assert.equal(created.response.status, 201, created.body.error);
    activityId = created.body.activity.id;

    let activity = created.body.activity;
    activity.speakers = [
      { id: ids.speaker, label: "Locuteur initial" },
      { id: ids.secondSpeaker, label: "Locuteur conservé" }
    ];
    activity.languages = [
      { id: "fr", code: "FR", label: "Français" },
      { id: "es", code: "ES", label: "Espagnol" }
    ];
    activity.segments = [{
      id: ids.segment,
      startMs: 0,
      endMs: 5000,
      text: "Segment initial",
      speakerIds: [ids.speaker],
      languageIds: ["fr"],
      phenomenonIds: [ids.phenomenon]
    }];
    activity.languageIntervals = [{
      id: ids.interval,
      languageId: "fr",
      startMs: 0,
      endMs: 5000
    }];
    activity.layers = [
      { id: ids.firstLayer, label: "Couche initiale", description: "", color: "#4d7dbc" },
      { id: ids.secondLayer, label: "Couche conservée", description: "", color: "#57a675" }
    ];
    activity.phenomena = [{
      id: ids.phenomenon,
      segmentId: ids.segment,
      layerId: ids.firstLayer,
      startMs: 1000,
      endMs: 2000
    }];
    activity.overlays = [{
      id: ids.overlay,
      startMs: 1000,
      endMs: 3000,
      title: "Overlay initial",
      text: "Contenu initial",
      layerIds: [ids.secondLayer]
    }];
    activity.layerConfiguration = {
      ...activity.layerConfiguration,
      defaultVisibleLayerIds: [ids.firstLayer],
      learnerVisibleLayerIds: [ids.firstLayer, ids.secondLayer],
      teacherVisibleLayerIds: [ids.firstLayer, ids.secondLayer]
    };

    let saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;

    activity.speakers[0].label = "Locuteur modifié";
    activity.segments[0].text = "Segment modifié";
    activity.segments[0].speakerIds = [ids.secondSpeaker];
    activity.languageIntervals[0].languageId = "es";
    activity.layers[0].label = "Couche modifiée";
    activity.layers[0].description = "Description modifiée";
    activity.phenomena[0].startMs = 2000;
    activity.phenomena[0].endMs = 3000;
    activity.overlays[0].title = "Overlay modifié";
    activity.overlays[0].text = "Contenu modifié";
    activity.overlays[0].startMs = 1500;
    activity.overlays[0].endMs = 3500;

    saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;
    assert.equal(activity.speakers[0].label, "Locuteur modifié");
    assert.equal(activity.segments[0].text, "Segment modifié");
    assert.deepEqual(activity.segments[0].speakerIds, [ids.secondSpeaker]);
    assert.equal(activity.languageIntervals[0].languageId, "es");
    assert.equal(activity.layers[0].label, "Couche modifiée");
    assert.equal(activity.phenomena[0].startMs, 2000);
    assert.equal(activity.overlays[0].title, "Overlay modifié");
    assert.doesNotMatch(JSON.stringify(activity), /Locuteur initial|Segment initial|Couche initiale|Overlay initial/);

    await server.restart();
    let reloaded = await jsonRequest(
      server.baseUrl,
      `/api/proto05/activities/${encodeURIComponent(activityId)}`
    );
    assert.equal(reloaded.response.status, 200);
    activity = reloaded.body.activity;
    assert.equal(activity.speakers[0].label, "Locuteur modifié");
    assert.deepEqual(activity.segments[0].speakerIds, [ids.secondSpeaker]);
    assert.equal(activity.overlays[0].title, "Overlay modifié");

    activity.languageIntervals = [];
    saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;
    assert.equal(activity.languageIntervals.length, 0);
    assert.equal(activity.overlays.length, 1);

    activity.overlays = [];
    saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;
    assert.equal(activity.overlays.length, 0);
    assert.equal(activity.phenomena.length, 1);

    activity.phenomena = [];
    activity.segments[0].phenomenonIds = [];
    saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;
    assert.equal(activity.phenomena.length, 0);
    assert.equal(activity.segments.length, 1);

    activity.segments = [];
    activity.transcription.segmentIds = [];
    saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;
    assert.equal(activity.segments.length, 0);
    assert.equal(activity.speakers.length, 2);

    assert.equal(deleteLayer(activity, ids.firstLayer).deleted, true);
    assert.equal(deleteLayer(activity, ids.secondLayer).deleted, true);
    saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;
    assert.equal(activity.layers.length, 0);
    assert.deepEqual(activity.layerConfiguration.defaultVisibleLayerIds, []);
    assert.deepEqual(activity.layerConfiguration.learnerVisibleLayerIds, []);
    assert.deepEqual(activity.layerConfiguration.teacherVisibleLayerIds, []);

    activity.speakers = [];
    saved = await save(activity);
    assert.equal(saved.response.status, 200, saved.body.error);
    activity = saved.body.activity;
    assert.equal(activity.speakers.length, 0);

    for (const route of [
      `/teacher/preview/${encodeURIComponent(activityId)}`,
      `/student/${encodeURIComponent(activityId)}`
    ]) {
      const response = await fetch(`${server.baseUrl}${route}`);
      assert.equal(response.status, 200);
    }

    if (inspectDatabase) {
      const database = await mariaDbConnection();
      try {
        for (const table of [
          "activity_language_intervals",
          "activity_overlays",
          "activity_overlay_layers",
          "activity_phenomena",
          "activity_segments",
          "activity_segment_speakers",
          "activity_layers",
          "activity_layer_visibility",
          "activity_speakers"
        ]) {
          const [[remaining]] = await database.query(
            `SELECT COUNT(*) AS \`count\` FROM \`${table}\` WHERE \`activity_id\` = ?`,
            [activityId]
          );
          assert.equal(Number(remaining.count), 0, table);
        }
      } finally {
        await database.end();
      }
    }
  } finally {
    if (activityId) {
      const deleted = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`,
        { method: "DELETE" }
      );
      assert.equal(deleted.response.status, 200, deleted.body.error);
      const missing = await jsonRequest(
        server.baseUrl,
        `/api/proto05/activities/${encodeURIComponent(activityId)}`
      );
      assert.equal(missing.response.status, 404);
    }
  }
}

test("le contrat guidé conserve les locuteurs et guide la création d’un phénomène valide", () => {
  const activity = {
    video: { durationMs: 20_000 },
    videoRef: { mediaAssetId: "asset-test" },
    speakers: [{ id: "speaker-test", label: "Locutrice" }],
    segments: [{ id: "segment-test", startMs: 5000, endMs: 9000 }],
    layers: [{ id: "layer-test", label: "Couche" }],
    languages: [],
    languageIntervals: [],
    phenomena: [],
    teacherAnnotations: [],
    overlays: [],
    layerConfiguration: {}
  };
  assert.deepEqual(buildAuthoringPayload(activity).speakers, activity.speakers);
  assert.match(preparePhenomenon({ ...activity, segments: [] }, 6000).error, /créez d’abord un segment/i);
  assert.match(preparePhenomenon({ ...activity, layers: [] }, 6000).error, /créez d’abord une couche/i);
  assert.match(preparePhenomenon(activity, 12_000).error, /tête de lecture.*segment/i);

  const prepared = preparePhenomenon(activity, 12_000, "segment-test");
  assert.equal(prepared.usedSelectedSegment, true);
  assert.deepEqual(prepared.phenomenon, {
    segmentId: "segment-test",
    layerId: "layer-test",
    startMs: 5000,
    endMs: 9000
  });
  assert.equal(phenomenonIssue(activity, prepared.phenomenon), null);
  assert.match(
    phenomenonIssue(activity, { ...prepared.phenomenon, startMs: 9000, endMs: 9000 }),
    /intervalle temporel non nul/i
  );
  assert.match(
    phenomenonIssue(activity, { ...prepared.phenomenon, startMs: 4000 }),
    /à l’intérieur du segment/i
  );
});

test("l’indicateur suit enregistré → modification → non enregistré → sauvegarde → enregistré", () => {
  let state = "saved";
  assert.equal(saveStateFromMessage("Modifications enregistrées."), "saved");
  state = transitionSaveState(state, "local-change");
  assert.equal(state, "dirty");
  assert.equal(
    messageAfterLocalChange("Modifications enregistrées."),
    "Modifications non enregistrées."
  );
  assert.equal(saveStateFromMessage("Modifications non enregistrées."), "dirty");
  state = transitionSaveState(state, "save-start");
  assert.equal(state, "saving");
  state = transitionSaveState(state, "save-success");
  assert.equal(state, "saved");
});

test("les suppressions programmatiques rendent l’atelier non enregistré", () => {
  for (const message of [
    "Overlay supprimé. Enregistrez pour confirmer.",
    "Couche supprimée. Enregistrez pour confirmer.",
    "Locuteur supprimé. Enregistrez pour confirmer.",
    "Segment et éléments liés supprimés. Enregistrez pour confirmer."
  ]) {
    assert.equal(saveStateFromMessage(message), "dirty", message);
  }
});

test("les suppressions relationnelles de l’atelier respectent les références", () => {
  const activity = {
    transcription: { segmentIds: ["segment-one", "segment-two"] },
    speakers: [{ id: "speaker-one", label: "Locuteur" }],
    segments: [
      { id: "segment-one", phenomenonIds: ["phenomenon-one"] },
      { id: "segment-two", phenomenonIds: [] }
    ],
    languageIntervals: [
      { id: "interval-one", segmentId: "segment-one" },
      { id: "interval-two" }
    ],
    layers: [
      { id: "layer-one", label: "Couche liée" },
      { id: "layer-two", label: "Couche libre" }
    ],
    phenomena: [{
      id: "phenomenon-one",
      segmentId: "segment-one",
      layerId: "layer-one"
    }],
    teacherAnnotations: [{
      id: "annotation-one",
      segmentId: "segment-one",
      note: "",
      pedagogicalQuestion: ""
    }],
    overlays: [
      { id: "overlay-one", annotationId: "annotation-one", layerIds: ["layer-one"] },
      { id: "overlay-two", layerIds: ["layer-two"] }
    ],
    layerConfiguration: {
      defaultVisibleLayerIds: ["layer-one", "layer-two"],
      learnerVisibleLayerIds: ["layer-one", "layer-two"],
      teacherVisibleLayerIds: ["layer-one", "layer-two"]
    }
  };

  assert.match(layerDeletionIssue(activity, "layer-one"), /phénomène/i);
  assert.match(layerDeletionIssue(activity, "layer-two"), /overlay/i);
  const phenomenonRefusal = deleteLayer(activity, "layer-one");
  assert.equal(phenomenonRefusal.deleted, false);
  assert.equal(
    layerDeletionDialogMessage(phenomenonRefusal.references),
    "Cette couche ne peut pas être supprimée, car elle est utilisée par un phénomène et un overlay."
  );
  assert.equal(
    layerDeletionDialogMessage({ phenomena: phenomenonRefusal.references.phenomena, overlays: [] }),
    "Cette couche ne peut pas être supprimée, car elle est utilisée par un phénomène."
  );
  assert.equal(
    layerDeletionDialogMessage({ phenomena: [], overlays: [{ id: "overlay-test" }] }),
    "Cette couche ne peut pas être supprimée, car elle est utilisée par un overlay."
  );
  assert.equal(activity.layers.length, 2);

  const dependencies = segmentDependencies(activity, "segment-one");
  assert.deepEqual(dependencies.phenomena.map(item => item.id), ["phenomenon-one"]);
  assert.deepEqual(dependencies.annotations.map(item => item.id), ["annotation-one"]);
  assert.deepEqual(dependencies.overlays.map(item => item.id), ["overlay-one"]);

  const cascade = deleteSegmentCascade(activity, "segment-one");
  assert.equal(cascade.deleted, true);
  assert.deepEqual(activity.transcription.segmentIds, ["segment-two"]);
  assert.deepEqual(activity.segments.map(item => item.id), ["segment-two"]);
  assert.deepEqual(activity.phenomena, []);
  assert.deepEqual(activity.teacherAnnotations, []);
  assert.deepEqual(activity.overlays.map(item => item.id), ["overlay-two"]);
  assert.equal(Object.prototype.hasOwnProperty.call(activity.languageIntervals[0], "segmentId"), false);

  activity.overlays = [];
  assert.equal(deleteLayer(activity, "layer-two").deleted, true);
  assert.deepEqual(activity.layers.map(item => item.id), ["layer-one"]);
  assert.deepEqual(activity.layerConfiguration.defaultVisibleLayerIds, ["layer-one"]);
  assert.deepEqual(activity.layerConfiguration.learnerVisibleLayerIds, ["layer-one"]);
  assert.deepEqual(activity.layerConfiguration.teacherVisibleLayerIds, ["layer-one"]);
});

test("les parcours réels de l’atelier utilisent les gardes et l’état sale partagés", () => {
  const guidedPage = fs.readFileSync(
    path.join(prototypeDirectory, "teacher-guided.html"),
    "utf8"
  );
  const overlayScript = fs.readFileSync(
    path.join(prototypeDirectory, "guided-overlays.js"),
    "utf8"
  );
  assert.match(guidedPage, /Proto05GuidedAuthoring\.deleteLayer\(state\.activity,x\.id\)/);
  assert.match(guidedPage, /Proto05GuidedAuthoring\.deleteSegmentCascade\(state\.activity,segment\.id\)/);
  assert.match(guidedPage, /showGuidedDeletionRefusal\(deletion,event\.currentTarget\)/);
  assert.match(guidedPage, /resetGuidedSelection\('Couche supprimée\.'\)/);
  assert.match(guidedPage, /markGuidedDirty\('Locuteur supprimé\./);
  assert.match(overlayScript, /resetGuidedSelection\("Overlay supprimé\."\)/);
  assert.match(overlayScript, /markGuidedDirty\("Overlay supprimé\./);
});

test("le menu Langue est produit depuis le référentiel et inscrit la sélection dans l’activité", () => {
  const catalog = [
    { id: "es", label: "Espagnol" },
    { id: "fr", label: "Français" }
  ];
  const markup = renderLanguageOptions(catalog, "fr");
  assert.equal((markup.match(/<option /g) || []).length, 2);
  assert.match(markup, /value="fr" selected>Français<\/option>/);
  const activity = { languages: [] };
  assert.deepEqual(ensureActivityLanguage(activity, catalog[1]), {
    id: "fr",
    code: "FR",
    label: "Français"
  });
  assert.deepEqual(activity.languages, [{
    id: "fr",
    code: "FR",
    label: "Français"
  }]);
});

test("les bornes linguistiques invalides restent corrigeables sans modifier l’intervalle", () => {
  const created = { id: "interval-created", startMs: 0, endMs: 5000 };
  assert.equal(
    languageIntervalTimeIssue(10000, 5000, 30000),
    "La fin doit être postérieure au début."
  );
  assert.deepEqual(
    applyLanguageIntervalBounds(created, { startMs: 10000, endMs: 5000 }, 30000),
    { valid: false, issue: "La fin doit être postérieure au début." }
  );
  assert.deepEqual(created, { id: "interval-created", startMs: 0, endMs: 5000 });

  assert.deepEqual(
    applyLanguageIntervalBounds(created, { startMs: 10000, endMs: 10000 }, 30000),
    { valid: false, issue: "La fin doit être postérieure au début." }
  );
  assert.deepEqual(created, { id: "interval-created", startMs: 0, endMs: 5000 });

  assert.deepEqual(
    applyLanguageIntervalBounds(created, { startMs: 10000, endMs: 15000 }, 30000),
    { valid: true, issue: null }
  );
  assert.deepEqual(created, { id: "interval-created", startMs: 10000, endMs: 15000 });

  const modified = { id: "interval-modified", startMs: 2000, endMs: 8000 };
  assert.equal(
    applyLanguageIntervalBounds(modified, { startMs: 10000, endMs: 5000 }, 30000).valid,
    false
  );
  assert.deepEqual(modified, { id: "interval-modified", startMs: 2000, endMs: 8000 });

  assert.equal(
    languageIntervalTimeIssue(undefined, 15000, 30000),
    "Renseignez des bornes temporelles valides."
  );
  assert.equal(
    languageIntervalTimeIssue(10000, 35000, 30000),
    "La fin doit rester dans la durée de la vidéo."
  );
});

test("la projection jouable conserve le texte et les bornes d’un segment sans couche", () => {
  const activity = {
    segments: [{
      id: "segment-projection",
      startMs: 1000,
      endMs: 3000,
      text: "Texte projeté",
      speakerIds: [],
      languageIds: []
    }],
    speakers: [],
    languages: [],
    phenomena: [],
    teacherAnnotations: []
  };
  const [segment] = projectSegments(activity);
  assert.equal(segment.text, "Texte projeté");
  assert.equal(segment.start, 1);
  assert.equal(segment.end, 3);
  assert.equal(hasVisibleTranscription(segment, new Set()), true);
  assert.equal(hasVisibleTranscription({ ...segment, tags: ["layer-test"] }, new Set()), true);
  assert.equal(hasVisibleTranscription({ ...segment, tags: ["layer-test"] }, new Set(["layer-test"])), true);
  assert.equal(segmentIndexAtTime([segment], 0.999), -1);
  assert.equal(segmentIndexAtTime([segment], 1), 0);
  assert.equal(segmentIndexAtTime([segment], 2.999), 0);
  assert.equal(segmentIndexAtTime([segment], 3), -1);
});

test("la projection jouable conserve un overlay autonome et son intervalle", () => {
  const [overlay] = projectOverlays({
    overlays: [{
      id: "overlay-projection",
      startMs: 1000,
      endMs: 3000,
      title: "Titre projeté",
      text: "Texte projeté",
      layerIds: []
    }]
  });
  assert.deepEqual(overlay, {
    id: "overlay-projection",
    annotationId: null,
    start: 1,
    end: 3,
    title: "Titre projeté",
    text: "Texte projeté",
    tags: []
  });
  assert.equal(hasVisibleOverlay(overlay, new Set()), true);
  assert.equal(overlayAtTime([overlay], 0.999), null);
  assert.equal(overlayAtTime([overlay], 1), overlay);
  assert.equal(overlayAtTime([overlay], 2.999), overlay);
  assert.equal(overlayAtTime([overlay], 3), null);
  const [enriched] = projectOverlays({
    overlays: [{
      id: "overlay-enriched",
      annotationId: "annotation-test",
      startMs: 1000,
      endMs: 3000,
      title: "Enrichi",
      text: "Texte",
      layerIds: ["layer-test"]
    }]
  });
  assert.equal(enriched.annotationId, "annotation-test");
  assert.deepEqual(enriched.tags, ["layer-test"]);
  assert.equal(hasVisibleOverlay(enriched, new Set()), false);
  assert.equal(hasVisibleOverlay(enriched, new Set(["layer-test"])), true);
});

test("les couches sans visibilité initiale restent disponibles et désactivées", () => {
  const activity = {
    layers: [
      { id: "layer-one", label: "Couche une" },
      { id: "layer-two", label: "Couche deux" }
    ],
    layerConfiguration: {
      defaultVisibleLayerIds: [],
      learnerVisibleLayerIds: [],
      teacherVisibleLayerIds: []
    }
  };
  assert.deepEqual(projectLayers(activity, "learner"), {
    layers: activity.layers,
    activeLayerIds: []
  });
  assert.deepEqual(projectLayers(activity, "teacher"), {
    layers: activity.layers,
    activeLayerIds: []
  });
  activity.layerConfiguration.learnerVisibleLayerIds = ["layer-two"];
  activity.layerConfiguration.defaultVisibleLayerIds = ["layer-two"];
  assert.deepEqual(projectLayers(activity, "learner"), {
    layers: [activity.layers[1]],
    activeLayerIds: ["layer-two"]
  });
});

test("la transcription reste permanente quand les phénomènes suivent leurs couches", () => {
  const activity = {
    speakers: [],
    languages: [],
    teacherAnnotations: [],
    segments: [
      {
        id: "segment-simple",
        startMs: 1000,
        endMs: 3000,
        text: "Simple",
        speakerIds: [],
        languageIds: []
      },
      {
        id: "segment-enriched",
        startMs: 4000,
        endMs: 6000,
        text: "Enrichi",
        speakerIds: [],
        languageIds: []
      }
    ],
    phenomena: [{
      id: "phenomenon-one",
      segmentId: "segment-enriched",
      layerId: "layer-one",
      startMs: 4500,
      endMs: 5500
    }]
  };
  const segments = projectSegments(activity);
  const phenomena = projectPhenomena(activity);
  assert.deepEqual(segments.map(segment => segment.text), ["Simple", "Enrichi"]);
  assert.ok(segments.every(segment => hasVisibleTranscription(segment, new Set())));
  assert.deepEqual(visiblePhenomena(phenomena, new Set()), []);
  assert.deepEqual(visiblePhenomena(phenomena, new Set(["layer-two"])), []);
  assert.deepEqual(visiblePhenomena(phenomena, new Set(["layer-one"])), phenomena);
  assert.ok(segments.every(segment => hasVisibleTranscription(segment, new Set())));
});

test("JSON sauvegarde et recharge un locuteur et un phénomène jetables", { timeout: 30_000 }, async () => {
  const temporary = await startTemporaryProto05Server(clone(canonicalStore()), "proto05-guided-json-");
  try {
    await exerciseSpeakerAndPhenomenonPersistence(temporary, "json");
  } finally {
    await temporary.cleanup();
  }
});

test("JSON modifie puis supprime sans orphelin toutes les entités guidées", {
  timeout: 45_000
}, async () => {
  const temporary = await startTemporaryProto05Server(
    clone(canonicalStore()),
    "proto05-guided-update-delete-json-"
  );
  try {
    await exerciseUpdateDeleteLifecycle(temporary, "update-delete-json");
  } finally {
    await temporary.cleanup();
  }
});

test("MariaDB sauvegarde et recharge un locuteur et un phénomène jetables", {
  timeout: 60_000,
  skip: process.env.PROTO05_RUN_MARIADB_INTEGRATION !== "1"
}, async () => {
  const server = await startMariaDbServer();
  try {
    await exerciseSpeakerAndPhenomenonPersistence(server, "mariadb");
  } finally {
    await server.cleanup();
  }
});

test("MariaDB modifie puis supprime sans orphelin toutes les entités guidées", {
  timeout: 90_000,
  skip: process.env.PROTO05_RUN_MARIADB_INTEGRATION !== "1"
}, async () => {
  const server = await startMariaDbServer();
  try {
    await exerciseUpdateDeleteLifecycle(server, "update-delete-mariadb", true);
  } finally {
    await server.cleanup();
  }
});

test("MariaDB lit le référentiel et persiste l’intervalle linguistique jetable", {
  timeout: 60_000,
  skip: process.env.PROTO05_RUN_MARIADB_INTEGRATION !== "1"
}, async () => {
  const server = await startMariaDbServer();
  try {
    await exerciseLanguageCatalogPersistence(server);
  } finally {
    await server.cleanup();
  }
});

test("MariaDB persiste et reprojette un segment vers les deux lecteurs", {
  timeout: 60_000,
  skip: process.env.PROTO05_RUN_MARIADB_INTEGRATION !== "1"
}, async () => {
  const server = await startMariaDbServer();
  try {
    await exerciseTranscriptionSegmentPersistence(server);
  } finally {
    await server.cleanup();
  }
});

test("MariaDB persiste et reprojette un overlay autonome vers les deux lecteurs", {
  timeout: 60_000,
  skip: process.env.PROTO05_RUN_MARIADB_INTEGRATION !== "1"
}, async () => {
  const server = await startMariaDbServer();
  try {
    await exercisePlayableOverlayPersistence(server);
  } finally {
    await server.cleanup();
  }
});

test("MariaDB préserve cumulativement couches, overlays, phénomènes et transcriptions", {
  timeout: 60_000,
  skip: process.env.PROTO05_RUN_MARIADB_INTEGRATION !== "1"
}, async () => {
  const server = await startMariaDbServer();
  try {
    await exercisePlayableLayerPersistence(server);
  } finally {
    await server.cleanup();
  }
});
