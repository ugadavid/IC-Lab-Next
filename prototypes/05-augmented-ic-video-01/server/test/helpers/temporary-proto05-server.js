"use strict";

const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const serverDirectory = path.resolve(__dirname, "..", "..");

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
  fs.mkdirSync(temporaryServerDirectory, { recursive: true });
  fs.mkdirSync(temporaryDataDirectory, { recursive: true });
  const serverFile = path.join(temporaryServerDirectory, "server.js");
  const dataFile = path.join(temporaryDataDirectory, "activities.json");
  fs.copyFileSync(path.join(serverDirectory, "server.js"), serverFile);
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let stderr = "";
  const child = spawn(process.execPath, [serverFile], {
    cwd: temporaryServerDirectory,
    env: { ...process.env, PORT: String(port) },
    windowsHide: true
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { stderr += chunk; });

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
    root,
    async stop() { await stopChild(child); },
    async cleanup() {
      await stopChild(child);
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

module.exports = { startTemporaryProto05Server };
