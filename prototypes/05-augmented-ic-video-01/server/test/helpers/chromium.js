"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function findChromium() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

async function runChromium(chromium, url, profileDirectory, options = {}) {
  const virtualTimeBudget = options.virtualTimeBudget || 6000;
  const timeout = options.timeout || 15000;
  const argumentsList = [
    "--headless=new",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-gpu-compositing",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileDirectory}`,
    `--virtual-time-budget=${virtualTimeBudget}`,
    "--dump-dom",
    url
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(chromium, argumentsList, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Chromium n’a pas terminé le scénario dans le délai imparti."));
    }, timeout);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", error => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`Chromium a quitté avec le code ${code}. ${stderr.trim()}`));
      resolve(stdout);
    });
  });
}

function readBrowserResults(dom) {
  const state = dom.match(/data-test-state="([^"]+)"/)?.[1];
  if (state !== "done") {
    const encodedError = dom.match(/data-error="([^"]+)"/)?.[1];
    throw new Error(encodedError ? decodeURIComponent(encodedError) : `Scénario navigateur incomplet (${state || "état absent"}).`);
  }
  const encodedResults = dom.match(/data-results="([^"]+)"/)?.[1];
  if (!encodedResults) throw new Error("Chromium n’a pas restitué les résultats du scénario.");
  return JSON.parse(decodeURIComponent(encodedResults));
}

module.exports = { findChromium, readBrowserResults, runChromium, sha256 };
