"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findChromium, readBrowserResults, runChromium, sha256 } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");
const expectedIds = [
  "proto05-augmented-video-01",
  "proto05-draft-1784218562686-f87014",
  "proto05-draft-1784219853222-b9e6a5",
  "proto05-draft-1784230655360-d1182f",
  "proto05-copy-1784236861048-984dec",
  "proto05-copy-1784304228900-10fb33",
  "proto05-draft-1784811747316-88a00c"
];
const deletionTargetId = "proto05-copy-1784236861048-984dec";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readCanonicalStore() {
  const store = JSON.parse(fs.readFileSync(canonicalDataFile, "utf8"));
  assert.deepEqual(store.activities.map(activity => activity.id), expectedIds);
  return store;
}

function assertOtherActivitiesPreserved(before, after, deletedId) {
  const expected = before.activities.filter(activity => activity.id !== deletedId);
  assert.deepEqual(after.activities, expected);
}

test("DELETE supprime une seule activité sur une copie et crée la sauvegarde préalable", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = clone(readCanonicalStore());
  const target = initialStore.activities.find(activity => activity.id === deletionTargetId);
  assert.equal(target.title, "CopieCopie");
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-deletion-api-");

  try {
    const response = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(target.id)}`, { method: "DELETE" });
    const payload = await response.json();
    const after = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    const backup = JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8"));

    assert.equal(response.status, 200);
    assert.deepEqual(payload.deleted, { id: target.id, title: target.title });
    assert.equal(payload.activitiesRemaining, 6);
    assert.equal(after.activities.some(activity => activity.id === target.id), false);
    assertOtherActivitiesPreserved(initialStore, after, target.id);
    assert.deepEqual(backup, initialStore);
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  } finally {
    await temporary.cleanup();
  }
});

test("DELETE refuse activité inconnue, identifiant invalide et identifiant ambigu sans écriture", { timeout: 15000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = clone(readCanonicalStore());
  initialStore.activities.push(clone(initialStore.activities[1]));
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-deletion-refusals-");

  try {
    const temporaryHashBefore = sha256(temporary.dataFile);
    const unknown = await fetch(`${temporary.baseUrl}/api/proto05/activities/activite-inconnue`, { method: "DELETE" });
    const invalid = await fetch(`${temporary.baseUrl}/api/proto05/activities/%20`, { method: "DELETE" });
    const ambiguous = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(initialStore.activities[1].id)}`, { method: "DELETE" });

    assert.equal(unknown.status, 404);
    assert.match((await unknown.json()).error, /introuvable/i);
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /identifiant.*invalide/i);
    assert.equal(ambiguous.status, 409);
    assert.match((await ambiguous.json()).error, /identifiant.*ambigu/i);
    assert.equal(sha256(temporary.dataFile), temporaryHashBefore);
    assert.equal(fs.existsSync(`${temporary.dataFile}.bak`), false);
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  } finally {
    await temporary.cleanup();
  }
});

test("Chromium annule sans requête puis confirme la suppression depuis la bibliothèque", { timeout: 30000 }, async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chromium ou Edge doit être disponible pour la recette demandée.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const initialStore = clone(readCanonicalStore());
  const target = initialStore.activities.find(activity => activity.id === deletionTargetId);
  const temporary = await startTemporaryProto05Server(initialStore, "proto05-deletion-browser-");
  const runnerFile = path.join(temporary.root, "prototype", "deletion-runner.html");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-deletion-chromium-"));
  const runner = `<!doctype html><html lang="fr"><body data-test-state="running"><iframe id="app" src="/teacher"></iframe><script>
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitFor(predicate, message) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) { const value = predicate(); if (value) return value; await sleep(20); }
    throw new Error(message);
  }
  window.addEventListener("load", async () => {
    try {
      const frame = document.getElementById("app");
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      const button = await waitFor(() => doc.querySelector('[data-delete-id="${target.id}"]'), "Bouton de suppression absent.");
      const article = button.closest("article.activity");
      const status = article.querySelector(".activity-status");
      const confirmationMessages = [];
      let deleteRequests = 0;
      const originalFetch = win.fetch.bind(win);
      win.fetch = (input, options = {}) => {
        if (options.method === "DELETE") {
          deleteRequests += 1;
          return new Promise((resolve, reject) => setTimeout(() => originalFetch(input, options).then(resolve, reject), 180));
        }
        return originalFetch(input, options);
      };
      win.confirm = message => { confirmationMessages.push(message); return false; };
      button.click();
      await waitFor(() => /annulée/i.test(status.textContent), "L’annulation n’est pas affichée.");
      const cancellation = {
        deleteRequests,
        articlePresent: doc.body.contains(article),
        status: status.textContent,
        buttonDisabled: button.disabled
      };
      win.confirm = message => { confirmationMessages.push(message); return true; };
      button.click();
      const disabledDuringRequest = button.disabled && button.getAttribute("aria-busy") === "true" && /en cours/i.test(button.textContent);
      await waitFor(() => !doc.body.contains(article), "L’activité supprimée reste dans la bibliothèque.");
      const results = {
        confirmationMessages,
        cancellation,
        disabledDuringRequest,
        deleteRequests,
        remainingCards: doc.querySelectorAll("article.activity").length,
        libraryStatus: doc.getElementById("library-status").textContent,
        visibleError: doc.querySelector('[data-state="error"]')?.textContent || ""
      };
      document.body.dataset.results = encodeURIComponent(JSON.stringify(results));
      document.body.dataset.testState = "done";
    } catch (error) {
      document.body.dataset.error = encodeURIComponent(error.stack || error.message);
      document.body.dataset.testState = "error";
    }
  });
  <\/script></body></html>`;
  fs.writeFileSync(runnerFile, runner, "utf8");

  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/deletion-runner.html`, profileDirectory, { virtualTimeBudget: 8000, timeout: 20000 });
    const results = readBrowserResults(dom);
    const after = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    const backup = JSON.parse(fs.readFileSync(`${temporary.dataFile}.bak`, "utf8"));

    assert.equal(results.confirmationMessages.length, 2);
    for (const message of results.confirmationMessages) {
      assert.match(message, new RegExp(target.id));
      assert.match(message, new RegExp(target.title));
    }
    assert.deepEqual(results.cancellation, {
      deleteRequests: 0,
      articlePresent: true,
      status: "Suppression annulée. Aucune donnée modifiée.",
      buttonDisabled: false
    });
    assert.equal(results.disabledDuringRequest, true);
    assert.equal(results.deleteRequests, 1);
    assert.equal(results.remainingCards, 6);
    assert.match(results.libraryStatus, /Activité supprimée.*Retour à la bibliothèque/);
    assert.equal(results.visibleError, "");
    assertOtherActivitiesPreserved(initialStore, after, target.id);
    assert.deepEqual(backup, initialStore);
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  } finally {
    await temporary.cleanup();
    fs.rmSync(profileDirectory, { recursive: true, force: true });
  }

  context.diagnostic(`Recette Chromium exécutée avec ${chromium}.`);
});
