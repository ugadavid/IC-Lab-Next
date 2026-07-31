"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { buildAuthoringPayload } = require("../../../shared/guided-authoring-contract");

const serverDirectory = path.resolve(__dirname, "..", "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const envFile = path.join(prototypeDirectory, ".env.local");

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

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      resolve();
    }, 3000);
    timer.unref();
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function waitForHealth(baseUrl, child, output) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Le serveur de test Proto05 s’est arrêté prématurément. ${output()}`);
    }
    try {
      const health = await request(baseUrl, "/api/health");
      if (health.response.ok && health.body?.storageAuthority === "mariadb") return health.body;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error(`Le serveur MariaDB de test Proto05 n’est pas prêt. ${output()}`);
}

function isolatedRuntimeDirectory(prefix) {
  const safePrefix = String(prefix).replace(/[^a-z0-9-]/gi, "-").slice(0, 40);
  return path.join(
    prototypeDirectory,
    `.proto05-test-runtime-${safePrefix}-${process.pid}-${crypto.randomBytes(4).toString("hex")}`
  );
}

function removeRuntimeDirectory(runtimeDirectory) {
  const resolved = path.resolve(runtimeDirectory);
  assert.ok(
    resolved.startsWith(`${prototypeDirectory}${path.sep}`)
      && path.basename(resolved).startsWith(".proto05-test-runtime-"),
    "Répertoire temporaire Proto05 inattendu."
  );
  fs.rmSync(resolved, { recursive: true, force: true });
}

async function seedActivity(baseUrl, source, marker) {
  assert.ok(source?.videoRef, `La fixture ${source?.id || "sans identifiant"} doit fournir videoRef.`);
  const title = `[TEST ${marker}] ${source.title || source.id || "activité temporaire"}`;
  const created = await request(baseUrl, "/api/proto05/activities", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title,
      description: source.description || "",
      instruction: source.instruction || "",
      pedagogicalQuestion: source.pedagogicalQuestion || "",
      videoRef: source.videoRef
    })
  });
  assert.equal(created.response.status, 201, created.body?.error);
  const activity = {
    ...created.body.activity,
    ...source,
    id: created.body.activity.id,
    title,
    videoRef: source.videoRef,
    layerConfiguration: {
      ...(source.layerConfiguration || created.body.activity.layerConfiguration),
      id: `layer-config-${created.body.activity.id}`
    }
  };
  const authored = await request(
    baseUrl,
    `/api/proto05/activities/${encodeURIComponent(activity.id)}/authoring`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "if-match": created.body.activity.revisionToken
      },
      body: JSON.stringify(buildAuthoringPayload(activity))
    }
  );
  if (authored.response.status !== 200) {
    await request(baseUrl, `/api/proto05/activities/${encodeURIComponent(activity.id)}`, {
      method: "DELETE",
      headers: { "if-match": created.body.activity.revisionToken }
    });
  }
  assert.equal(authored.response.status, 200, authored.body?.error);
  return { sourceId: source.id, id: activity.id, activity: authored.body.activity };
}

async function startTemporaryProto05Server(store = { activities: [] }, prefix = "proto05-server-test-") {
  assert.ok(fs.existsSync(envFile), "La configuration locale MariaDB de Proto05 est requise.");
  const runtimeDirectory = isolatedRuntimeDirectory(prefix);
  fs.mkdirSync(runtimeDirectory, { recursive: false });
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let stdout = "";
  let stderr = "";
  const child = spawn(
    process.execPath,
    [`--env-file=${envFile}`, "server.js"],
    {
      cwd: serverDirectory,
      env: { ...process.env, PORT: String(port) },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const output = () => `${stdout}\n${stderr}`.trim();
  const seeded = [];
  let baselineIds = [];

  try {
    await waitForHealth(baseUrl, child, output);
    const baseline = await request(baseUrl, "/api/proto05/activities");
    assert.equal(baseline.response.status, 200, baseline.body?.error);
    baselineIds = baseline.body.activities.map(activity => activity.id).sort();
    const marker = `${prefix}${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    for (const activity of store?.activities || []) {
      seeded.push(await seedActivity(baseUrl, activity, marker));
    }
  } catch (error) {
    for (const activity of seeded.reverse()) {
      try {
        await request(baseUrl, `/api/proto05/activities/${encodeURIComponent(activity.id)}`, {
          method: "DELETE"
        });
      } catch {}
    }
    await stopChild(child);
    removeRuntimeDirectory(runtimeDirectory);
    throw error;
  }

  let cleaned = false;
  return {
    baseUrl,
    stderr: () => stderr,
    activityId(sourceId) {
      const match = seeded.find(activity => activity.sourceId === sourceId);
      assert.ok(match, `Fixture d’activité non initialisée : ${sourceId}.`);
      return match.id;
    },
    writeRunner(name, content) {
      assert.equal(path.basename(name), name, "Le runner doit être un simple nom de fichier.");
      assert.ok(name.endsWith(".html"), "Le runner doit être un fichier HTML.");
      const target = path.join(runtimeDirectory, name);
      fs.writeFileSync(target, content, "utf8");
      const relative = path.relative(prototypeDirectory, target).split(path.sep).join("/");
      return `/${relative}`;
    },
    async cleanup() {
      if (cleaned) return;
      cleaned = true;
      let cleanupError = null;
      try {
        for (const activity of [...seeded].reverse()) {
          const current = await request(
            baseUrl,
            `/api/proto05/activities/${encodeURIComponent(activity.id)}`
          );
          const deletion = await request(
            baseUrl,
            `/api/proto05/activities/${encodeURIComponent(activity.id)}`,
            {
              method: "DELETE",
              headers: current.response.status === 200
                ? { "if-match": current.body.activity.revisionToken }
                : {}
            }
          );
          if (![200, 404].includes(deletion.response.status)) {
            throw new Error(`Nettoyage refusé pour ${activity.id} (${deletion.response.status}).`);
          }
          const verification = await request(
            baseUrl,
            `/api/proto05/activities/${encodeURIComponent(activity.id)}`
          );
          assert.equal(verification.response.status, 404, `La fixture ${activity.id} subsiste.`);
        }
        const after = await request(baseUrl, "/api/proto05/activities");
        assert.equal(after.response.status, 200, after.body?.error);
        assert.deepEqual(
          after.body.activities.map(activity => activity.id).sort(),
          baselineIds,
          "La liste MariaDB diffère du témoin initial après nettoyage."
        );
      } catch (error) {
        cleanupError = error;
      } finally {
        await stopChild(child);
        removeRuntimeDirectory(runtimeDirectory);
      }
      if (cleanupError) throw cleanupError;
    }
  };
}

module.exports = { startTemporaryProto05Server };
