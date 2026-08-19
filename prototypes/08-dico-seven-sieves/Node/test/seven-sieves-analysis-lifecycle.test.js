const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lifecycleApi = require("../../prototypes/01-seven-sieves/js/seven-sieves-analysis-lifecycle-v0.js");
const sessionContract = require("../../prototypes/01-seven-sieves/js/seven-sieves-session-v0.js");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function controlledTimers() {
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  return {
    setTimeoutFn(fn, delay) {
      const id = nextId++;
      timeouts.set(id, { fn, delay });
      return id;
    },
    clearTimeoutFn(id) { timeouts.delete(id); },
    setIntervalFn(fn, delay) {
      const id = nextId++;
      intervals.set(id, { fn, delay });
      return id;
    },
    clearIntervalFn(id) { intervals.delete(id); },
    fireTimeout() {
      const [id, timer] = timeouts.entries().next().value || [];
      if (!timer) return false;
      timeouts.delete(id);
      timer.fn();
      return true;
    },
    fireIntervals() { [...intervals.values()].forEach(({ fn }) => fn()); },
    timeoutDelay() { return timeouts.values().next().value?.delay; },
    activeIntervals() { return intervals.size; },
  };
}

function harness() {
  const timers = controlledTimers();
  const transitions = [];
  const elapsed = [];
  const lifecycle = lifecycleApi.createAnalysisLifecycle({
    ...timers,
    onTransition: (state, details) => transitions.push({ state, details }),
    onElapsed: (seconds) => elapsed.push(seconds),
  });
  return { lifecycle, timers, transitions, elapsed };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("normal success uses one generation and stops progress", async () => {
  const { lifecycle, timers, transitions, elapsed } = harness();
  const stored = [];
  const run = lifecycle.start(async ({ signal, generation }) => {
    assert.equal(signal.aborted, false);
    assert.equal(generation, 1);
    return "activity-A";
  }, { onSuccess: (value) => stored.push(value) });

  assert.equal(run.started, true);
  assert.equal(timers.timeoutDelay(), lifecycleApi.DEFAULT_ANALYSIS_TIMEOUT_MS);
  timers.fireIntervals();
  await flush();
  assert.deepEqual(stored, ["activity-A"]);
  assert.deepEqual(transitions.map(({ state }) => state), ["running", "success"]);
  assert.deepEqual(elapsed, [0, 1]);
  assert.equal(timers.activeIntervals(), 0);
});

test("double launch keeps a single active request and a single success", async () => {
  const { lifecycle } = harness();
  const pending = deferred();
  let requests = 0;
  let writes = 0;
  const execute = () => { requests += 1; return pending.promise; };
  const first = lifecycle.start(execute, { onSuccess: () => { writes += 1; } });
  const second = lifecycle.start(execute, { onSuccess: () => { writes += 1; } });
  await flush();
  assert.equal(first.started, true);
  assert.equal(second.started, false);
  assert.equal(first.promise, second.promise);
  assert.equal(requests, 1);
  pending.resolve("ok");
  await flush();
  assert.equal(writes, 1);
});

test("human cancellation aborts, stops progress and ignores a late response", async () => {
  const { lifecycle, timers, transitions, elapsed } = harness();
  const pending = deferred();
  let signal;
  let writes = 0;
  const run = lifecycle.start(({ signal: currentSignal }) => {
    signal = currentSignal;
    return pending.promise;
  }, { onSuccess: () => { writes += 1; } });
  await flush();
  assert.equal(lifecycle.cancel(), true);
  assert.equal(signal.aborted, true);
  assert.equal((await run.promise).status, "cancelled");
  timers.fireIntervals();
  pending.resolve("late-A");
  await flush();
  assert.equal(writes, 0);
  assert.deepEqual(elapsed, [0]);
  assert.deepEqual(transitions.map(({ state }) => state), ["running", "cancelled"]);
});

test("15-second timeout aborts without a real wait and ignores a late response", async () => {
  const { lifecycle, timers, transitions, elapsed } = harness();
  const pending = deferred();
  let signal;
  let writes = 0;
  const run = lifecycle.start(({ signal: currentSignal }) => {
    signal = currentSignal;
    return pending.promise;
  }, { onSuccess: () => { writes += 1; } });
  await flush();
  assert.equal(timers.timeoutDelay(), 15_000);
  assert.equal(timers.fireTimeout(), true);
  assert.equal(signal.aborted, true);
  assert.equal((await run.promise).status, "timed_out");
  timers.fireIntervals();
  pending.resolve("late-A");
  await flush();
  assert.equal(writes, 0);
  assert.deepEqual(elapsed, [0]);
  assert.deepEqual(transitions.map(({ state }) => state), ["running", "timed_out"]);
});

test("A cancelled then B succeeds without A overwriting B", async () => {
  const { lifecycle } = harness();
  const a = deferred();
  const b = deferred();
  const stored = [];
  const runA = lifecycle.start(() => a.promise, { onSuccess: (value) => stored.push(value) });
  await flush();
  lifecycle.cancel();
  await runA.promise;
  const runB = lifecycle.start(() => b.promise, { onSuccess: (value) => stored.push(value) });
  await flush();
  a.resolve("A");
  b.resolve("B");
  await flush();
  assert.equal((await runB.promise).status, "success");
  assert.deepEqual(stored, ["B"]);
  assert.equal(runB.generation, runA.generation + 1);
});

test("A times out then B succeeds without A overwriting B", async () => {
  const { lifecycle, timers } = harness();
  const a = deferred();
  const stored = [];
  const runA = lifecycle.start(() => a.promise, { onSuccess: (value) => stored.push(value) });
  await flush();
  timers.fireTimeout();
  await runA.promise;
  const runB = lifecycle.start(async () => "B", { onSuccess: (value) => stored.push(value) });
  a.resolve("A");
  await flush();
  assert.equal((await runB.promise).status, "success");
  assert.deepEqual(stored, ["B"]);
});

test("network, HTTP, invalid JSON and incomplete-contract failures remain retryable", async () => {
  const failures = [
    new TypeError("network detail"),
    new Error("HTTP 500"),
    new SyntaxError("JSON detail"),
    new Error("contract detail"),
  ];
  for (const failure of failures) {
    const { lifecycle } = harness();
    let errors = 0;
    const failed = lifecycle.start(async () => { throw failure; }, { onError: () => { errors += 1; } });
    await flush();
    assert.equal((await failed.promise).status, "error");
    assert.equal(errors, 1);
    const retry = lifecycle.start(async () => "retry", { onSuccess: () => {} });
    await flush();
    assert.equal((await retry.promise).status, "success");
  }

  const { lifecycle } = harness();
  const invalid = lifecycle.start(async () => "incomplete", {
    onSuccess: () => { throw new Error("contrat incomplet"); },
  });
  await flush();
  assert.equal((await invalid.promise).status, "error");
});

test("page departure aborts and prevents every later transition", async () => {
  const { lifecycle, transitions, timers } = harness();
  const pending = deferred();
  let signal;
  let writes = 0;
  const run = lifecycle.start(({ signal: currentSignal }) => {
    signal = currentSignal;
    return pending.promise;
  }, { onSuccess: () => { writes += 1; } });
  await flush();
  lifecycle.dispose();
  assert.equal(signal.aborted, true);
  assert.equal((await run.promise).status, "disposed");
  pending.resolve("late");
  timers.fireIntervals();
  await flush();
  assert.equal(writes, 0);
  assert.deepEqual(transitions.map(({ state }) => state), ["running"]);
});

function fixturePreparation() {
  return { text: "Hola.", source_language: "es", mediation_language: "fr", comparison_languages: ["it", "pt"] };
}

function fixtureAnalysis() {
  return {
    contract_version: "0.1",
    text: "Hola.",
    languages: { source: "es", mediation: "fr", comparison: ["it", "pt"] },
    tokens: [
      { index: 0, surface: "Hola", start: 0, end: 4, enrichments: [] },
      { index: 1, surface: ".", start: 4, end: 5, enrichments: [] },
    ],
    sieves: [],
    warnings: [],
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("exact preparation signature gates storage and invalidation leaves the student empty", () => {
  const preparation = fixturePreparation();
  const activity = sessionContract.createActivity(preparation, fixtureAnalysis());
  const storage = memoryStorage();
  sessionContract.writeActivity(storage, activity);
  assert.equal(sessionContract.readActivity(storage).status, "ok");
  assert.equal(activity.preparation_signature, sessionContract.preparationSignature(preparation));
  assert.notEqual(activity.preparation_signature, sessionContract.preparationSignature({
    ...preparation,
    source_language: "it",
  }));
  assert.notEqual(activity.preparation_signature, sessionContract.preparationSignature({
    ...preparation,
    comparison_languages: ["pt"],
  }));

  activity.preparation.text = "Texte modifié puis remis.";
  assert.throws(() => sessionContract.writeActivity(storage, activity), /signature/);
  sessionContract.invalidateActivity(storage);
  assert.equal(sessionContract.readActivity(storage).status, "missing");
});

test("legacy format 0.1 stays readable while mismatched comparison languages are rejected", () => {
  const legacy = sessionContract.createActivity(fixturePreparation(), fixtureAnalysis());
  delete legacy.preparation_signature;
  const storage = memoryStorage();
  storage.setItem(sessionContract.STORAGE_KEY, JSON.stringify(legacy));
  assert.equal(sessionContract.readActivity(storage).status, "ok");

  const mismatched = fixtureAnalysis();
  mismatched.languages.comparison = ["pt", "it"];
  assert.throws(
    () => sessionContract.createActivity(fixturePreparation(), mismatched),
    /langues de comparaison/,
  );
});

test("deterministic A-to-D recipe never reopens a stale activity", async () => {
  const { lifecycle, timers } = harness();
  const storage = memoryStorage();
  const pendingA = deferred();
  const pendingC = deferred();

  function activityFor(label) {
    const text = `${label}.`;
    return sessionContract.createActivity(
      { text, source_language: "es", mediation_language: "fr", comparison_languages: ["it", "pt"] },
      {
        contract_version: "0.1",
        text,
        languages: { source: "es", mediation: "fr", comparison: ["it", "pt"] },
        tokens: [
          { index: 0, surface: label, start: 0, end: label.length, enrichments: [] },
          { index: 1, surface: ".", start: label.length, end: label.length + 1, enrichments: [] },
        ],
        sieves: [],
        warnings: [],
      },
    );
  }

  sessionContract.writeActivity(storage, activityFor("A"));
  sessionContract.invalidateActivity(storage);
  assert.equal(sessionContract.readActivity(storage).status, "missing");

  const runA = lifecycle.start(() => pendingA.promise, {
    onSuccess: (label) => sessionContract.writeActivity(storage, activityFor(label)),
  });
  await flush();
  lifecycle.cancel();
  await runA.promise;
  assert.equal(sessionContract.readActivity(storage).status, "missing");

  const runB = lifecycle.start(async () => "B", {
    onSuccess: (label) => sessionContract.writeActivity(storage, activityFor(label)),
  });
  await flush();
  assert.equal((await runB.promise).status, "success");
  pendingA.resolve("A");
  await flush();
  assert.equal(sessionContract.readActivity(storage).activity.preparation.text, "B.");

  sessionContract.invalidateActivity(storage);
  const runC = lifecycle.start(() => pendingC.promise, {
    onSuccess: (label) => sessionContract.writeActivity(storage, activityFor(label)),
  });
  await flush();
  timers.fireTimeout();
  assert.equal((await runC.promise).status, "timed_out");
  pendingC.resolve("C");
  await flush();
  assert.equal(sessionContract.readActivity(storage).status, "missing");

  const runD = lifecycle.start(async () => "D", {
    onSuccess: (label) => sessionContract.writeActivity(storage, activityFor(label)),
  });
  await flush();
  assert.equal((await runD.promise).status, "success");
  assert.equal(sessionContract.readActivity(storage).activity.preparation.text, "D.");
});

test("teacher UI exposes accessible lifecycle controls while preserving the student UI", () => {
  const root = path.join(__dirname, "../../prototypes/01-seven-sieves");
  const teacher = fs.readFileSync(path.join(root, "index-teacher-0.1.html"), "utf8");
  const teacherScript = fs.readFileSync(path.join(root, "js/seven-sieves-teacher-v0.js"), "utf8");
  const student = fs.readFileSync(path.join(root, "index-student-0.1.html"), "utf8");
  const studentScript = fs.readFileSync(path.join(root, "js/seven-sieves-student-v0.js"), "utf8");

  assert.match(teacher, /app-version" content="0\.1\.3"/);
  assert.match(teacher, /Annuler l’analyse/);
  assert.match(teacher, /aria-busy="false"/);
  assert.match(teacher, /role="status" aria-live="polite"/);
  assert.match(teacher, /<progress[^>]*aria-label=/);
  assert.match(teacherScript, /DEFAULT_ANALYSIS_TIMEOUT_MS/);
  assert.match(teacherScript, /signal,/);
  assert.match(teacherScript, /pagehide/);
  assert.match(teacherScript, /invalidateActivity\(window\.sessionStorage\)/);
  assert.match(teacherScript, /preparationControls\.forEach/);
  assert.match(teacherScript, /console\.error/);
  assert.doesNotMatch(teacherScript, /teacherFeedback\.textContent\s*=.*error\.message/);

  assert.match(student, /app-version" content="0\.1\.5"/);
  assert.equal((student.match(/class="sieve-btn"/g) || []).length, 7);
  assert.match(studentScript, /readActivity\(window\.sessionStorage\)/);
  assert.match(studentScript, /showEmptyState\(storedActivity\.status\)/);
});
