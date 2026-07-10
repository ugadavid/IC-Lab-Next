const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 8788);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "activities.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const SERVICE = "proto06-connected-backend";
const VERSION = "1.1";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8"
};

async function ensureStorage() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify({ version: VERSION, updatedAt: new Date().toISOString(), activities: [] }, null, 2)
    );
  }
}

async function readStore() {
  await ensureStorage();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    version: parsed.version || VERSION,
    updatedAt: parsed.updatedAt || new Date().toISOString(),
    activities: Array.isArray(parsed.activities) ? parsed.activities : []
  };
}

async function writeStore(store) {
  await ensureStorage();
  const previous = await fs.readFile(DATA_FILE, "utf8").catch(() => "");
  if (previous.trim()) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(path.join(BACKUP_DIR, `activities-${stamp}.json`), previous);
  }

  const next = {
    version: VERSION,
    updatedAt: new Date().toISOString(),
    activities: store.activities
  };
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(next, null, 2)}\n`);
  await fs.rename(tempFile, DATA_FILE);
  return next;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  response.end(JSON.stringify(body, null, 2));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload trop volumineux."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalide."));
      }
    });
    request.on("error", reject);
  });
}

function validateActivity(activity) {
  const errors = [];
  if (!activity.title || typeof activity.title !== "string") errors.push("title est obligatoire.");
  if (!activity.scenarioId || typeof activity.scenarioId !== "string") errors.push("scenarioId est obligatoire.");
  if (!activity.pedagogicalGoal || typeof activity.pedagogicalGoal !== "string") errors.push("pedagogicalGoal est obligatoire.");
  if (!activity.commonQuestion || typeof activity.commonQuestion !== "string") errors.push("commonQuestion est obligatoire.");
  if (!Array.isArray(activity.characterIds)) {
    errors.push("characterIds doit etre un tableau.");
  } else if (activity.characterIds.length < 2 || activity.characterIds.length > 4) {
    errors.push("characterIds doit contenir 2 a 4 personnages.");
  }
  return errors;
}

function normalizeActivity(activity, existing = null) {
  const now = new Date().toISOString();
  return {
    ...activity,
    id: existing?.id || activity.id || `server-activity-${crypto.randomUUID()}`,
    source: "server",
    status: activity.status || existing?.status || "server-draft",
    createdAt: existing?.createdAt || activity.createdAt || now,
    updatedAt: now
  };
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});

  const parts = url.pathname.split("/").filter(Boolean);
  const activityId = decodeURIComponent(parts[2] || "");

  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, { ok: true, service: SERVICE, version: VERSION });
  }

  if (parts[0] !== "api" || parts[1] !== "activities") {
    return sendJson(response, 404, { error: "Endpoint API introuvable." });
  }

  const store = await readStore();

  if (request.method === "GET" && parts.length === 2) {
    return sendJson(response, 200, store.activities);
  }

  if (request.method === "GET" && activityId) {
    const activity = store.activities.find((item) => item.id === activityId);
    return activity
      ? sendJson(response, 200, activity)
      : sendJson(response, 404, { error: "Activite introuvable." });
  }

  if (request.method === "POST" && parts.length === 2) {
    const payload = await readRequestBody(request);
    const errors = validateActivity(payload);
    if (errors.length) return sendJson(response, 400, { error: "Activite invalide.", details: errors });

    const activity = normalizeActivity(payload);
    if (store.activities.some((item) => item.id === activity.id)) {
      return sendJson(response, 409, { error: "Une activite serveur existe deja avec cet id." });
    }

    const next = await writeStore({ activities: [...store.activities, activity] });
    return sendJson(response, 201, next.activities.find((item) => item.id === activity.id));
  }

  if (request.method === "PUT" && activityId) {
    const index = store.activities.findIndex((item) => item.id === activityId);
    if (index < 0) return sendJson(response, 404, { error: "Activite introuvable." });

    const payload = await readRequestBody(request);
    const candidate = { ...payload, id: activityId };
    const errors = validateActivity(candidate);
    if (errors.length) return sendJson(response, 400, { error: "Activite invalide.", details: errors });

    const activity = normalizeActivity(candidate, store.activities[index]);
    const activities = [...store.activities];
    activities[index] = activity;
    await writeStore({ activities });
    return sendJson(response, 200, activity);
  }

  if (request.method === "DELETE" && activityId) {
    const activities = store.activities.filter((item) => item.id !== activityId);
    if (activities.length === store.activities.length) {
      return sendJson(response, 404, { error: "Activite introuvable." });
    }
    await writeStore({ activities });
    return sendJson(response, 200, { ok: true, deletedId: activityId });
  }

  return sendJson(response, 405, { error: "Methode non autorisee." });
}

async function serveStatic(response, url) {
  const requested = url.pathname === "/" ? "/library-1.1.html" : decodeURIComponent(url.pathname);
  const target = path.resolve(ROOT_DIR, `.${requested}`);

  if (!target.startsWith(ROOT_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(target);
    const filePath = stat.isDirectory() ? path.join(target, "index.html") : target;
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "content-type": contentTypes[extension] || "application/octet-stream" });
    response.end(await fs.readFile(filePath));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
    } else {
      await serveStatic(response, url);
    }
  } catch (error) {
    sendJson(response, error.message === "JSON invalide." ? 400 : 500, {
      error: error.message || "Erreur serveur."
    });
  }
});

ensureStorage()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`${SERVICE} ${VERSION} listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
