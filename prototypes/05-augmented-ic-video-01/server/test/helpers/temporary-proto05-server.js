"use strict";

const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const serverDirectory = path.resolve(__dirname, "..", "..");
const sourcePrototypeDirectory = path.resolve(serverDirectory, "..");
const sourceLanguageCatalogFile = path.resolve(sourcePrototypeDirectory, "..", "..", "shared", "reference-data", "languages.json");
const sourceVideoCatalogFile = path.join(sourcePrototypeDirectory, "data", "video-catalog.json");
const sourceVideoLibraryFile = path.join(sourcePrototypeDirectory, "data", "video-library.json");

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
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
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

async function startTemporaryProto05Server(store, prefix = "proto05-server-test-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const prototypeDirectory = path.join(root, "prototype");
  const temporaryServerDirectory = path.join(prototypeDirectory, "server");
  const temporaryDataDirectory = path.join(prototypeDirectory, "data");
  const temporaryReferenceDirectory = path.join(root, "shared", "reference-data");
  fs.mkdirSync(temporaryServerDirectory, { recursive: true });
  fs.mkdirSync(temporaryDataDirectory, { recursive: true });
  fs.mkdirSync(temporaryReferenceDirectory, { recursive: true });
  const serverFile = path.join(temporaryServerDirectory, "server.js");
  const dataFile = path.join(temporaryDataDirectory, "activities.json");
  const videoCatalogFile = path.join(temporaryDataDirectory, "video-catalog.json");
  const videoLibraryFile = path.join(temporaryDataDirectory, "video-library.json");
  const languageCatalogFile = path.join(temporaryReferenceDirectory, "languages.json");
  fs.copyFileSync(path.join(serverDirectory, "server.js"), serverFile);
  fs.copyFileSync(path.join(serverDirectory, "media-contract.js"), path.join(temporaryServerDirectory, "media-contract.js"));
  fs.copyFileSync(path.join(serverDirectory, "library-contract.js"), path.join(temporaryServerDirectory, "library-contract.js"));
  fs.copyFileSync(sourceLanguageCatalogFile, languageCatalogFile);
  fs.copyFileSync(sourceVideoLibraryFile, videoLibraryFile);
  const videoCatalog = JSON.parse(fs.readFileSync(sourceVideoCatalogFile, "utf8"));
  const knownVideoIds = new Set(videoCatalog.videos.map(video => video.id));
  for (const activity of store.activities || []) {
    if (activity.video?.id && !knownVideoIds.has(activity.video.id)) {
      const proxyUrl = "/api/hls/uga-37004/livestream.m3u8";
      activity.video.proxyUrl = proxyUrl;
      videoCatalog.videos.push({ id: activity.video.id, title: activity.video.title || "Fixture vidéo", provider: "uga", sourceUrl: "https://videos.univ-grenoble-alpes.fr/media/videos/7d74074b07ff1dfc9ed59cdade1a126fc17fed888ca9d26da6e5b2875e8b5120/37004/livestream.m3u8", proxyUrl, durationMs: activity.video.durationMs ?? null, authorized: true });
      knownVideoIds.add(activity.video.id);
    }
  }
  fs.writeFileSync(videoCatalogFile, `${JSON.stringify(videoCatalog, null, 2)}\n`, "utf8");
  for (const file of ["teacher.html", "teacher-create.html", "teacher-author.html", "teacher-guided.html", "index-0.0.9.html"]) {
    fs.copyFileSync(path.join(sourcePrototypeDirectory, file), path.join(prototypeDirectory, file));
  }
  const temporarySharedDirectory = path.join(prototypeDirectory, "shared");
  fs.mkdirSync(temporarySharedDirectory, { recursive: true });
  for (const file of ["ic-timeline.js", "ic-timeline.css"]) {
    fs.copyFileSync(path.join(sourcePrototypeDirectory, "shared", file), path.join(temporarySharedDirectory, file));
  }
  fs.copyFileSync(path.join(sourcePrototypeDirectory, "guided-overlays.js"), path.join(prototypeDirectory, "guided-overlays.js"));
  const temporaryHlsDirectory = path.join(root, "00-ic-hub", "server", "node_modules", "hls.js", "dist");
  fs.mkdirSync(temporaryHlsDirectory, { recursive: true });
  fs.writeFileSync(path.join(temporaryHlsDirectory, "hls.min.js"), "window.Hls={isSupported:()=>false};\n", "utf8");
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let stderr = "";
  let child;
  const startChild = () => {
    child = spawn(process.execPath, [serverFile], {
      cwd: temporaryServerDirectory,
      env: { ...process.env, PORT: String(port), PROTO05_LANGUAGE_CATALOG_FILE: languageCatalogFile },
      windowsHide: true
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => { stderr += chunk; });
  };
  startChild();

  try {
    await waitForHealth(baseUrl, child, () => stderr);
  } catch (error) {
    await stopChild(child);
    fs.rmSync(root, { recursive: true, force: true });
    throw error;
  }

  return {
    baseUrl,
    dataFile,
    videoLibraryFile,
    languageCatalogFile,
    root,
    async restart() { await stopChild(child); stderr = ""; startChild(); await waitForHealth(baseUrl, child, () => stderr); },
    async stop() { await stopChild(child); },
    async cleanup() {
      await stopChild(child);
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

module.exports = { startTemporaryProto05Server };
