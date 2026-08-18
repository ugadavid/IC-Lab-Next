const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CancellableGenerationSession,
  isAbortError,
} = require("../../admin/js/admin-ai-text-generation-0.1.js");

function controlledClock() {
  let now = 1_000;
  let callback = null;
  let cleared = 0;
  return {
    options: {
      now: () => now,
      setInterval: value => { callback = value; return 17; },
      clearInterval: timer => { assert.equal(timer, 17); cleared += 1; },
    },
    advance(milliseconds) {
      now += milliseconds;
      callback();
    },
    cleared: () => cleared,
  };
}

test("la progression démarre à zéro, avance et fige les langues demandées", () => {
  const clock = controlledClock();
  const ticks = [];
  const selectedLanguages = ["fr", "es"];
  const session = new CancellableGenerationSession(clock.options);
  const request = session.start(selectedLanguages, elapsed => ticks.push(elapsed));

  selectedLanguages.push("it");
  clock.advance(1_900);

  assert.deepEqual(ticks, [0, 1]);
  assert.deepEqual(request.languages, ["fr", "es"]);
  assert.equal(request.signal.aborted, false);
});

test("un double lancement est refusé pendant une génération active", () => {
  const clock = controlledClock();
  const session = new CancellableGenerationSession(clock.options);
  const first = session.start(["fr"], () => {});

  assert.ok(first);
  assert.equal(session.start(["es"], () => {}), null);
});

test("annuler interrompt le signal et arrête le chronomètre", () => {
  const clock = controlledClock();
  const session = new CancellableGenerationSession(clock.options);
  const request = session.start(["fr"], () => {});
  const cancelled = session.cancel();

  assert.equal(request.signal.aborted, true);
  assert.deepEqual(cancelled.languages, ["fr"]);
  assert.equal(session.active, null);
  assert.equal(clock.cleared(), 1);
  assert.equal(isAbortError(request.signal.reason), true);
});

test("A annulée puis B lancée ignore toute fin tardive de A et conserve B", () => {
  const clock = controlledClock();
  const session = new CancellableGenerationSession(clock.options);
  const requestA = session.start(["fr"], () => {});
  session.cancel();
  const requestB = session.start(["es", "it"], () => {});

  assert.notEqual(requestA.id, requestB.id);
  assert.equal(session.finish(requestA.id), false);
  assert.equal(session.isCurrent(requestB.id), true);
  assert.equal(requestB.signal.aborted, false);
  assert.equal(session.finish(requestB.id), true);
});

test("annulation et timeout restent des catégories distinctes", () => {
  assert.equal(isAbortError({ name: "AbortError" }), true);
  assert.equal(isAbortError({ code: "OPENAI_CANCELLED" }), true);
  assert.equal(isAbortError({ code: "OPENAI_TIMEOUT" }), false);
  assert.equal(isAbortError({ code: "OPENAI_UNAVAILABLE" }), false);
});
