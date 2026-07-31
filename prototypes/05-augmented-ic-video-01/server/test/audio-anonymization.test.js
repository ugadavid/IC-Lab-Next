"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn, spawnSync, execFileSync } = require("node:child_process");
const test = require("node:test");
const {
  activeAudioPassage,
  buildAudioReplacementFilter,
  normalizeAudioPlan
} = require("../audio-anonymization");
const { inspectMigrationState, runMigrationCommand } = require("../schema-migrations");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const mysql = require(path.resolve(prototypeDirectory, "..", "00-ic-hub", "server", "node_modules", "mysql2", "promise"));

function plan(passages) {
  return normalizeAudioPlan({
    id: "audio-plan-test",
    sourceAssetId: "asset-test",
    sourcePlayableId: "playable-test",
    durationMs: 6000,
    revision: 0,
    passages
  });
}

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    windowsHide: true,
    encoding: options.encoding === null ? null : "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  assert.equal(result.status, 0, String(result.stderr || result.stdout));
  return result;
}

function monoSamples(file, start, duration) {
  const result = run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-ss", String(start), "-t", String(duration),
    "-i", file, "-map", "0:a:0", "-ac", "1", "-ar", "48000", "-f", "f32le", "pipe:1"
  ], { encoding: null });
  return new Float32Array(result.stdout.buffer, result.stdout.byteOffset, Math.floor(result.stdout.byteLength / 4));
}

function rms(samples) {
  return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
}

function frequencyEnergy(samples, frequency, sampleRate = 48000) {
  let real = 0;
  let imaginary = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const angle = 2 * Math.PI * frequency * index / sampleRate;
    real += samples[index] * Math.cos(angle);
    imaginary -= samples[index] * Math.sin(angle);
  }
  return Math.hypot(real, imaginary) / samples.length;
}

async function freePort() {
  const server = http.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} resolve(); }, 4000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.kill();
  });
}

function removePreparationWorkspaces(jobIds) {
  const root = path.resolve(os.tmpdir(), "proto05-hls-preparations");
  if (!fs.existsSync(root)) return;
  for (const jobId of jobIds) {
    assert.match(jobId, /^hls-prep-[a-z0-9-]+$/i, "Identifiant de préparation inattendu.");
    for (const entry of fs.readdirSync(root)) {
      if (!entry.startsWith(`${jobId}-`)) continue;
      const target = path.resolve(root, entry);
      assert.ok(target.startsWith(`${root}${path.sep}`), "Workspace de préparation inattendu.");
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

async function waitFor(predicate, label, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    try { const result = await predicate(); if (result) return result; }
    catch (error) { if (error?.terminal) throw error; last = error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Délai dépassé : ${label}${last ? ` (${last.message})` : ""}`);
}

test("le plan ordonne les passages, conserve les identifiants et autorise la contiguïté", () => {
  const result = plan([
    { id: "zone-b", startMs: 3000, endMs: 4000, replacementType: "silence" },
    { id: "zone-a", startMs: 1000, endMs: 3000, replacementType: "beep", label: "Voix" }
  ]);
  assert.deepEqual(result.passages.map(item => item.id), ["zone-a", "zone-b"]);
  assert.equal(result.maskedDurationMs, 3000);
  assert.equal(activeAudioPassage(result.passages, 2999).id, "zone-a");
  assert.equal(activeAudioPassage(result.passages, 3000).id, "zone-b");
  assert.equal(activeAudioPassage(result.passages, 4000), null);
});

test("le plan refuse les bornes, doublons et chevauchements ambigus", () => {
  assert.throws(() => plan([{ id: "bad", startMs: 1000, endMs: 1000, replacementType: "beep" }]), /postérieure/);
  assert.throws(() => plan([{ id: "bad", startMs: 0, endMs: 7000, replacementType: "beep" }]), /durée/);
  assert.throws(() => plan([
    { id: "same", startMs: 0, endMs: 1000, replacementType: "beep" },
    { id: "same", startMs: 1000, endMs: 2000, replacementType: "silence" }
  ]), /dupliqué/);
  assert.throws(() => plan([
    { id: "first", startMs: 0, endMs: 1500, replacementType: "soft-tone" },
    { id: "second", startMs: 1400, endMs: 2000, replacementType: "soft-tone" }
  ]), /chevauchent/);
});

test("FFmpeg remplace objectivement chaque zone et copie le flux vidéo", { timeout: 30000 }, t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-audio-engine-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source.mp4");
  const output = path.join(root, "output.mp4");
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "color=c=blue:s=320x180:r=25:d=6",
    "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=6",
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "ultrafast",
    "-c:a", "aac", "-shortest", source
  ]);
  const recipe = buildAudioReplacementFilter([
    { id: "soft", startMs: 1000, endMs: 2000, replacementType: "soft-tone" },
    { id: "beep", startMs: 2000, endMs: 3000, replacementType: "beep" },
    { id: "silent", startMs: 4000, endMs: 5000, replacementType: "silence" }
  ], 6000);
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", source,
    "-filter_complex", recipe.filter, "-map", "0:v:0", "-map", recipe.outputLabel,
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", output
  ]);

  const original = monoSamples(output, 0.2, 0.6);
  const soft = monoSamples(output, 1.2, 0.6);
  const beep = monoSamples(output, 2.2, 0.6);
  const silence = monoSamples(output, 4.2, 0.6);
  assert.ok(frequencyEnergy(original, 440) > 0.02, "le signal original subsiste hors zone");
  assert.ok(frequencyEnergy(soft, 440) < frequencyEnergy(original, 440) / 8, "la voix synthétique originale disparaît de la zone douce");
  assert.ok(frequencyEnergy(soft, 196) > frequencyEnergy(soft, 440) * 3, "la tonalité douce remplace la zone");
  assert.ok(frequencyEnergy(beep, 880) > frequencyEnergy(beep, 440) * 5, "le bip remplace la zone");
  assert.ok(rms(silence) < 0.001, "la zone silence ne conserve pas le signal original");

  const probe = JSON.parse(run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,nb_frames",
    "-of", "json", output
  ]).stdout);
  assert.ok(Math.abs(Number(probe.format.duration) - 6) < 0.05);
  assert.equal(probe.streams.find(stream => stream.codec_type === "video").codec_name, "h264");
  assert.equal(probe.streams.find(stream => stream.codec_type === "audio").codec_name, "aac");
});

test("l’atelier audio reste distinct de l’atelier visuel et expose le parcours complet", () => {
  const prototype = path.resolve(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(prototype, "teacher-audio-anonymization.html"), "utf8");
  const detail = fs.readFileSync(path.join(prototype, "teacher-video-detail.html"), "utf8");
  assert.match(html, /Définir le début au curseur/);
  assert.match(html, /Tonalité douce/);
  assert.match(html, /audio-anonymization\/plans/);
  assert.match(html, /audio-anonymization\/derivations/);
  assert.match(detail, /Anonymiser l’image/);
  assert.match(detail, /Anonymiser le son/);
  assert.doesNotMatch(html, /mask-layer|keyframe|boxblur/);
});

test("le parcours HTTP sauvegarde, recharge et dérive sur une MariaDB isolée", { timeout: 90000 }, async t => {
  const suffix = `${process.pid}${crypto.randomBytes(4).toString("hex")}`;
  const databaseName = `proto05_m156_${suffix}`;
  const user = `proto05_m156_${suffix}`.slice(0, 30);
  const password = crypto.randomBytes(18).toString("hex");
  const assetId = `asset-m156-${suffix}`;
  const sourceId = `source-m156-${suffix}`;
  const playableId = `playable-m156-${suffix}`;
  const silentAssetId = `asset-m156-silent-${suffix}`;
  const silentSourceId = `source-m156-silent-${suffix}`;
  const silentPlayableId = `playable-m156-silent-${suffix}`;
  const storageKey = `${assetId}/source/fixture.mp4`;
  const silentStorageKey = `${silentAssetId}/source/fixture.mp4`;
  const assetDirectory = path.join(prototypeDirectory, "data", "video-library-workspaces", assetId);
  const silentAssetDirectory = path.join(prototypeDirectory, "data", "video-library-workspaces", silentAssetId);
  const sourceFile = path.join(assetDirectory, "source", "fixture.mp4");
  const silentSourceFile = path.join(silentAssetDirectory, "source", "fixture.mp4");
  const rootPassword = execFileSync(
    "docker",
    ["exec", process.env.PROTO05_MARIADB_TEST_CONTAINER || "ic_dico_mariadb_next", "sh", "-lc", 'printf %s "$MARIADB_ROOT_PASSWORD"'],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  ).trim();
  const host = process.env.PROTO05_MARIADB_TEST_HOST || "127.0.0.1";
  const port = Number(process.env.PROTO05_MARIADB_TEST_PORT || 3306);
  const admin = await mysql.createConnection({ host, port, user: "root", password: rootPassword, charset: "utf8mb4", dateStrings: true, multipleStatements: false });
  let child = null;
  let output = "";
  const preparationJobIds = new Set();
  const startServer = async () => {
    const serverPort = await freePort();
    output = "";
    child = spawn(process.execPath, ["server.js"], {
      cwd: serverDirectory,
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(serverPort),
        PROTO05_MARIADB_HOST: host,
        PROTO05_MARIADB_PORT: String(port),
        PROTO05_MARIADB_DATABASE: databaseName,
        PROTO05_MARIADB_USER: user,
        PROTO05_MARIADB_PASSWORD: password
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
    const baseUrl = `http://127.0.0.1:${serverPort}`;
    await waitFor(async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      return response.ok && (await response.json()).status === "available";
    }, `démarrage du serveur ${output}`);
    return baseUrl;
  };
  const json = async (baseUrl, pathname, options = {}) => {
    const response = await fetch(`${baseUrl}${pathname}`, { headers: { "content-type": "application/json" }, ...options });
    const body = await response.json();
    assert.ok(response.ok, `${pathname}: ${body.error || response.status}`);
    return body;
  };

  t.after(async () => {
    await stop(child);
    try { await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``); } catch {}
    try { await admin.query(`DROP USER IF EXISTS \`${user}\`@'%'`); } catch {}
    await admin.end();
    fs.rmSync(assetDirectory, { recursive: true, force: true });
    fs.rmSync(silentAssetDirectory, { recursive: true, force: true });
    removePreparationWorkspaces(preparationJobIds);
  });

  await admin.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const database = await mysql.createConnection({ host, port, user: "root", password: rootPassword, database: databaseName, charset: "utf8mb4", dateStrings: true, multipleStatements: false });
  try {
    const options = { databaseName, prototypeDirectory };
    const pending = await inspectMigrationState(database, options);
    await runMigrationCommand(database, { ...options, mode: "apply", expectedPlanHash: pending.planHash, confirm: "APPLY PROTO05 SCHEMA MIGRATIONS" });
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=green:s=320x180:r=25:d=6",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=6",
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", sourceFile
    ]);
    fs.mkdirSync(path.dirname(silentSourceFile), { recursive: true });
    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
      "color=c=gray:s=320x180:r=25:d=2", "-c:v", "libx264", "-preset", "ultrafast", "-an", silentSourceFile
    ]);
    await database.query("CALL sp_media_register_import(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      assetId, sourceId, playableId, "Fixture Mission 156", "local-file", "local", "filesystem",
      "working-copy", "video/mp4", null, "workspace", storageKey, null, null, "available",
      JSON.stringify({ asset: { provenance: {}, rights: {}, tagIds: [] }, source: { origin: {}, provenance: {} }, playable: { provenance: {} }, metadata: { analysisStatus: "complete", mimeType: "video/mp4", durationMs: 6000, audioCodec: "aac", hasAudio: true } })
    ]);
    await database.query("CALL sp_media_register_import(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      silentAssetId, silentSourceId, silentPlayableId, "Fixture sans audio Mission 156", "local-file", "local", "filesystem",
      "working-copy", "video/mp4", null, "workspace", silentStorageKey, null, null, "available",
      JSON.stringify({ asset: { provenance: {}, rights: {}, tagIds: [] }, source: { origin: {}, provenance: {} }, playable: { provenance: {} }, metadata: { analysisStatus: "complete", mimeType: "video/mp4", durationMs: 2000, hasAudio: false } })
    ]);
    await admin.query(`CREATE USER \`${user}\`@'%' IDENTIFIED BY '${password}'`);
    await admin.query(`GRANT SELECT, EXECUTE, SHOW VIEW, SHOW CREATE ROUTINE ON \`${databaseName}\`.* TO \`${user}\`@'%'`);
    await admin.query(`GRANT UPDATE ON \`${databaseName}\`.data_projection_metadata TO \`${user}\`@'%'`);
  } finally {
    await database.end();
  }

  let baseUrl = await startServer();
  const preparation = await json(baseUrl, "/api/proto05/library/hls-preparations", {
    method: "POST", body: JSON.stringify({ assetId, sourceId, playableId })
  });
  preparationJobIds.add(preparation.job.id);
  const ready = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/hls-preparations/${encodeURIComponent(preparation.job.id)}`);
    if (result.job.status === "failed") throw new Error(result.job.error);
    return result.job.status === "completed" ? result.job : null;
  }, "préparation locale");
  const empty = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans?assetId=${encodeURIComponent(assetId)}&playableId=${encodeURIComponent(playableId)}`);
  assert.equal(empty.plan, null);
  const saved = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans/${encodeURIComponent(empty.suggestedPlanId)}`, {
    method: "PUT",
    body: JSON.stringify({
      preparationJobId: ready.id,
      revision: 0,
      passages: [
        { id: `zone-a-${suffix}`, startMs: 1000, endMs: 2000, replacementType: "soft-tone", label: "Douce" },
        { id: `zone-b-${suffix}`, startMs: 2000, endMs: 3000, replacementType: "beep", label: "Bip" },
        { id: `zone-c-${suffix}`, startMs: 4000, endMs: 5000, replacementType: "silence", label: "Silence" }
      ]
    })
  });
  assert.equal(saved.plan.revision, 1);
  assert.equal(saved.plan.passageCount, 3);

  const staleSave = await fetch(`${baseUrl}/api/proto05/library/audio-anonymization/plans/${encodeURIComponent(saved.plan.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ preparationJobId: ready.id, revision: 0, passages: saved.plan.passages })
  });
  assert.equal(staleSave.status, 409, "une révision périmée doit être refusée");

  const modified = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans/${encodeURIComponent(saved.plan.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      preparationJobId: ready.id,
      revision: 1,
      passages: [
        { ...saved.plan.passages[0], label: "Douce modifiée" },
        saved.plan.passages[1]
      ]
    })
  });
  assert.equal(modified.plan.revision, 2);
  assert.equal(modified.plan.passageCount, 2);
  assert.equal(modified.plan.passages[0].label, "Douce modifiée");
  assert.equal(modified.plan.passages.some(item => item.id === `zone-c-${suffix}`), false);

  const restored = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans/${encodeURIComponent(saved.plan.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      preparationJobId: ready.id,
      revision: 2,
      passages: saved.plan.passages
    })
  });
  assert.equal(restored.plan.revision, 3);
  assert.equal(restored.plan.passageCount, 3);

  await stop(child); child = null;
  baseUrl = await startServer();
  const reloaded = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans?assetId=${encodeURIComponent(assetId)}&playableId=${encodeURIComponent(playableId)}`);
  assert.deepEqual(reloaded.plan.passages.map(item => item.replacementType), ["soft-tone", "beep", "silence"]);
  const preparationAfterRestart = await json(baseUrl, "/api/proto05/library/hls-preparations", {
    method: "POST", body: JSON.stringify({ assetId, sourceId, playableId })
  });
  preparationJobIds.add(preparationAfterRestart.job.id);
  const readyAfterRestart = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/hls-preparations/${encodeURIComponent(preparationAfterRestart.job.id)}`);
    return result.job.status === "completed" ? result.job : null;
  }, "nouvelle préparation après redémarrage");
  const started = await json(baseUrl, "/api/proto05/library/audio-anonymization/derivations", {
    method: "POST", body: JSON.stringify({ preparationJobId: readyAfterRestart.id, planId: reloaded.plan.id })
  });
  const completed = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/audio-anonymization/derivations/${encodeURIComponent(started.job.id)}`);
    if (result.job.statusCode === "failed") throw Object.assign(new Error(result.job.error), { terminal: true });
    return result.job.statusCode === "completed" ? result.job : null;
  }, "dérivation audio", 40000);
  assert.equal(completed.metadata.videoCodec, "copy");
  assert.equal(completed.metadata.audioCodec, "aac");
  const media = await fetch(`${baseUrl}${completed.metadata.mediaUrl}`, { headers: { range: "bytes=0-1023" } });
  assert.equal(media.status, 206);

  const audioOutputPreparation = await json(baseUrl, "/api/proto05/library/hls-preparations", {
    method: "POST",
    body: JSON.stringify({ assetId, sourceId: `source-${started.job.id}`, playableId: completed.playableId })
  });
  preparationJobIds.add(audioOutputPreparation.job.id);
  const audioOutputReady = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/hls-preparations/${encodeURIComponent(audioOutputPreparation.job.id)}`);
    return result.job.status === "completed" ? result.job : null;
  }, "préparation du dérivé audio");
  const visualStarted = await json(baseUrl, "/api/proto05/library/hls-derivations", {
    method: "POST",
    body: JSON.stringify({ preparationJobId: audioOutputReady.id, masks: [{ id: "mask-chain", x: 0.05, y: 0.05, width: 0.2, height: 0.2 }], blurProfile: "light" })
  });
  const visualCompleted = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/hls-derivations/${encodeURIComponent(visualStarted.job.id)}`);
    if (result.job.statusCode === "failed") throw Object.assign(new Error(result.job.error), { terminal: true });
    return result.job.statusCode === "completed" ? result.job : null;
  }, "anonymisation visuelle après audio", 40000);
  assert.ok(visualCompleted.playableId);

  const visualOutputPreparation = await json(baseUrl, "/api/proto05/library/hls-preparations", {
    method: "POST",
    body: JSON.stringify({ assetId, sourceId: `source-${visualStarted.job.id}`, playableId: visualCompleted.playableId })
  });
  preparationJobIds.add(visualOutputPreparation.job.id);
  const visualOutputReady = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/hls-preparations/${encodeURIComponent(visualOutputPreparation.job.id)}`);
    return result.job.status === "completed" ? result.job : null;
  }, "préparation du dérivé visuel");
  const reverseEmpty = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans?assetId=${encodeURIComponent(assetId)}&playableId=${encodeURIComponent(visualCompleted.playableId)}`);
  const reversePlan = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans/${encodeURIComponent(reverseEmpty.suggestedPlanId)}`, {
    method: "PUT",
    body: JSON.stringify({ preparationJobId: visualOutputReady.id, revision: 0, passages: [{ id: `zone-reverse-${suffix}`, startMs: 500, endMs: 900, replacementType: "silence" }] })
  });
  const reverseStarted = await json(baseUrl, "/api/proto05/library/audio-anonymization/derivations", {
    method: "POST", body: JSON.stringify({ preparationJobId: visualOutputReady.id, planId: reversePlan.plan.id })
  });
  const reverseCompleted = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/audio-anonymization/derivations/${encodeURIComponent(reverseStarted.job.id)}`);
    if (result.job.statusCode === "failed") throw Object.assign(new Error(result.job.error), { terminal: true });
    return result.job.statusCode === "completed" ? result.job : null;
  }, "anonymisation audio après visuel", 40000);
  assert.ok(reverseCompleted.playableId);

  const cancellation = await json(baseUrl, "/api/proto05/library/audio-anonymization/derivations", {
    method: "POST", body: JSON.stringify({ preparationJobId: readyAfterRestart.id, planId: reloaded.plan.id })
  });
  await json(baseUrl, `/api/proto05/library/audio-anonymization/derivations/${encodeURIComponent(cancellation.job.id)}`, { method: "DELETE" });
  const cancelled = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/audio-anonymization/derivations/${encodeURIComponent(cancellation.job.id)}`);
    return result.job.statusCode === "cancelled" ? result.job : null;
  }, "annulation audio");
  assert.equal(cancelled.playableId, null);
  assert.equal(fs.existsSync(path.join(assetDirectory, "derived", cancellation.job.id)), false);

  const silentPreparation = await json(baseUrl, "/api/proto05/library/hls-preparations", {
    method: "POST", body: JSON.stringify({ assetId: silentAssetId, sourceId: silentSourceId, playableId: silentPlayableId })
  });
  preparationJobIds.add(silentPreparation.job.id);
  const silentReady = await waitFor(async () => {
    const result = await json(baseUrl, `/api/proto05/library/hls-preparations/${encodeURIComponent(silentPreparation.job.id)}`);
    return result.job.status === "completed" ? result.job : null;
  }, "préparation sans audio");
  const silentEmpty = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans?assetId=${encodeURIComponent(silentAssetId)}&playableId=${encodeURIComponent(silentPlayableId)}`);
  const silentPlan = await json(baseUrl, `/api/proto05/library/audio-anonymization/plans/${encodeURIComponent(silentEmpty.suggestedPlanId)}`, {
    method: "PUT",
    body: JSON.stringify({ preparationJobId: silentReady.id, revision: 0, passages: [{ id: `zone-silent-source-${suffix}`, startMs: 0, endMs: 500, replacementType: "silence" }] })
  });
  const noAudioResponse = await fetch(`${baseUrl}/api/proto05/library/audio-anonymization/derivations`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ preparationJobId: silentReady.id, planId: silentPlan.plan.id })
  });
  assert.equal(noAudioResponse.status, 400);
  assert.match((await noAudioResponse.json()).error, /aucune piste audio/);

  const verification = await mysql.createConnection({ host, port, user: "root", password: rootPassword, database: databaseName, charset: "utf8mb4", dateStrings: true, multipleStatements: false });
  try {
    const [[treatment]] = await verification.query("SELECT type, status, source_asset_id, output_asset_id, output_playable_id FROM media_treatments WHERE id = ?", [started.job.id]);
    assert.equal(treatment.type, "audio-anonymization");
    assert.equal(treatment.status, "completed");
    assert.equal(treatment.source_asset_id, assetId);
    assert.equal(treatment.output_asset_id, assetId);
    const [[visualTreatment]] = await verification.query("SELECT type, status, source_playable_id FROM media_treatments WHERE id = ?", [visualStarted.job.id]);
    assert.equal(visualTreatment.type, "anonymization");
    assert.equal(visualTreatment.status, "completed");
    assert.equal(visualTreatment.source_playable_id, completed.playableId);
    const [[reverseTreatment]] = await verification.query("SELECT type, status, source_playable_id FROM media_treatments WHERE id = ?", [reverseStarted.job.id]);
    assert.equal(reverseTreatment.type, "audio-anonymization");
    assert.equal(reverseTreatment.status, "completed");
    assert.equal(reverseTreatment.source_playable_id, visualCompleted.playableId);
    const [[planRow]] = await verification.query("SELECT last_treatment_id FROM media_audio_anonymization_plans WHERE id = ?", [reloaded.plan.id]);
    assert.equal(planRow.last_treatment_id, cancellation.job.id);
    const [[cancelledTreatment]] = await verification.query("SELECT status, output_playable_id FROM media_treatments WHERE id = ?", [cancellation.job.id]);
    assert.equal(cancelledTreatment.status, "cancelled");
    assert.equal(cancelledTreatment.output_playable_id, null);
    const [[silentTreatments]] = await verification.query("SELECT COUNT(*) count FROM media_treatments WHERE source_playable_id = ?", [silentPlayableId]);
    assert.equal(Number(silentTreatments.count), 0);
  } finally {
    await verification.end();
  }
  assert.equal(output.includes(password), false);
});
