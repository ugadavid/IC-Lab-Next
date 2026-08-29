"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sessionContract = require("../../prototypes/01-seven-sieves/js/seven-sieves-session-v0.js");
const soutenance = require("../../prototypes/01-seven-sieves/js/seven-sieves-soutenance-v0.js");

const prototypeRoot = path.join(__dirname, "../../prototypes/01-seven-sieves");
const analysis = JSON.parse(fs.readFileSync(path.join(prototypeRoot, "mock/soutenance-analysis-v0.json"), "utf8"));

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("the defense fixture is the current valid ES to FR activity with IT and PT", () => {
  const preparation = soutenance.preparationFromAnalysis(analysis);
  const activity = sessionContract.createActivity(preparation, analysis, "2026-08-29T08:00:00.000Z");

  assert.match(activity.analysis.text, /^Durante el día, los estudiantes observan/);
  assert.match(activity.analysis.text, /Sin embargo, durante la noche la información sigue circulando/);
  assert.deepEqual(activity.analysis.languages, { source: "es", mediation: "fr", comparison: ["it", "pt"] });
  assert.equal(activity.analysis.tokens.length, 50);
  assert.equal(activity.analysis.sieves.length, 7);
  assert.equal(activity.analysis.pedagogical_enrichments.length, 1);
  assert.equal(sessionContract.validateActivity(activity), activity);
});

test("two independent blank tabs each load a fresh valid activity without redirect", async () => {
  const openings = [];
  for (const preparedAt of ["2026-08-29T08:30:00.000Z", "2026-08-29T08:31:00.000Z"]) {
    const storage = memoryStorage();
    const events = [];
    const originalRemove = storage.removeItem.bind(storage);
    storage.removeItem = (key) => { events.push(`remove:${key}`); originalRemove(key); };
    const originalSet = storage.setItem.bind(storage);
    storage.setItem = (key, value) => { events.push(`set:${key}`); originalSet(key, value); };

    const activity = await soutenance.loadActivity({
      sessionContract,
      storage,
      fetchImpl: async (url, options) => {
        events.push(`fetch:${url}:${options.cache}`);
        return { ok: true, json: async () => structuredClone(analysis) };
      },
      now: () => preparedAt,
    });

    assert.deepEqual(events, [
      `remove:${sessionContract.STORAGE_KEY}`,
      `fetch:${soutenance.ANALYSIS_URL}:no-store`,
      `set:${sessionContract.STORAGE_KEY}`,
    ]);
    assert.equal(sessionContract.readActivity(storage).status, "ok");
    openings.push(activity.prepared_at);
  }
  assert.deepEqual(openings, ["2026-08-29T08:30:00.000Z", "2026-08-29T08:31:00.000Z"]);
});

test("a missing fixture leaves no stale activity", async () => {
  const storage = memoryStorage({ [sessionContract.STORAGE_KEY]: "stale" });

  await assert.rejects(() => soutenance.loadActivity({
    sessionContract,
    storage,
    fetchImpl: async () => ({ ok: false, status: 404 }),
  }), /HTTP 404/);

  assert.equal(storage.getItem(sessionContract.STORAGE_KEY), null);
});

test("the explicit query mode remains separate from the normal teacher and student paths", () => {
  const teacher = fs.readFileSync(path.join(prototypeRoot, "index-teacher-0.1.html"), "utf8");
  const student = fs.readFileSync(path.join(prototypeRoot, "index-student-0.1.html"), "utf8");

  assert.match(teacher, /app-version" content="0\.1\.3"/);
  assert.match(student, /app-version" content="0\.1\.6"/);
  assert.match(student, /seven-sieves-soutenance-v0\.js/);
  assert.doesNotMatch(teacher, /seven-sieves-soutenance/);
  assert.equal(soutenance.isSoutenanceRequest("?soutenance=1"), true);
  assert.equal(soutenance.isSoutenanceRequest(""), false);
  assert.equal(soutenance.isSoutenanceRequest("?soutenance=0"), false);
});
