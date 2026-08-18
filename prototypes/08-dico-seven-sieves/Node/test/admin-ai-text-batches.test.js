const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ALLOWED_BATCH_SIZES,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  ManualInflectedBatchSession,
  buildInflectedBatchRequest,
  formIdentity,
  formatIgnoredProposalWarning,
  validateBatchSize,
} = require("../../admin/js/admin-ai-text-batches-0.1.js");

function reviewItems(count) {
  return Array.from({ length: count }, (_, index) => ({
    surface: `forme-${index + 1}`,
    normalized: `forme-${index + 1}`,
    contexts: [`Contexte de forme-${index + 1}.`],
  }));
}

function proposal(item, overrides = {}) {
  return {
    surface_form: item.surface,
    normalized_surface: item.normalized,
    language: "fr",
    lemma_candidate: `lemme-${item.normalized}`,
    state: "READY",
    selected: true,
    ...overrides,
  };
}

for (const [count, expectedSizes] of [
  [0, []],
  [1, [1]],
  [99, [99]],
  [100, [100]],
  [101, [100, 1]],
  [164, [100, 64]],
  [200, [100, 100]],
]) {
  test(`${count} formes produisent les lots manuels attendus`, () => {
    const session = new ManualInflectedBatchSession();
    session.reset(reviewItems(count), "fr");
    session.setBatchSize(100);
    const sizes = [];
    while (session.nextBatch().length) {
      const batch = session.nextBatch();
      sizes.push(batch.length);
      assert.ok(batch.length <= MAX_BATCH_SIZE);
      session.completeBatch(batch, batch.map((item) => proposal(item)));
    }
    assert.deepEqual(sizes, expectedSizes);
    assert.equal(session.progress().examined, count);
    assert.equal(session.progress().remaining, 0);
  });
}

test("un échec ne progresse pas et le premier lot peut être repris exactement", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(164), "fr");
  session.setBatchSize(100);
  const firstKeys = session.nextBatch().map((item) => formIdentity("fr", item.normalized));

  const retryKeys = session.nextBatch().map((item) => formIdentity("fr", item.normalized));
  assert.deepEqual(retryKeys, firstKeys);
  assert.deepEqual(session.progress(), {
    total: 164, examined: 0, remaining: 164, nextSize: 100,
    complete: false, successfulBatches: 0,
  });
});

test("le constructeur de payload frontend refuse toute requête supérieure à 100", () => {
  const accepted = buildInflectedBatchRequest(reviewItems(100), "fr", "Contexte de repli.");
  assert.equal(accepted.items.length, 100);
  assert.equal(accepted.items[0].language, "fr");

  assert.throws(
    () => buildInflectedBatchRequest(reviewItems(101), "fr", "Contexte de repli."),
    (error) => error instanceof RangeError
      && error.message === "Le frontend ne peut pas envoyer plus de 100 formes."
  );
});

test("la taille par défaut vaut 30 et les cinq valeurs publiques sont acceptées", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(164), "fr");
  assert.equal(DEFAULT_BATCH_SIZE, 30);
  assert.equal(MAX_BATCH_SIZE, 100);
  assert.equal(session.batchSize, 30);
  assert.deepEqual(ALLOWED_BATCH_SIZES, [10, 20, 30, 50, 100]);

  for (const size of ALLOWED_BATCH_SIZES) {
    assert.equal(session.setBatchSize(String(size)), size);
    assert.equal(session.nextBatch().length, size);
  }
});

test("une taille falsifiée est refusée sans modifier la dernière taille valide", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(164), "fr");
  session.setBatchSize(20);
  for (const invalid of [0, 31, 101, 999, "invalide", ""]) {
    assert.throws(() => session.setBatchSize(invalid), RangeError);
    assert.equal(session.batchSize, 20);
    assert.equal(session.nextBatch().length, 20);
  }
  assert.throws(() => validateBatchSize(101), /10, 20, 30, 50, 100/);
});

test("164 formes avec la taille par défaut donnent 30+30+30+30+30+14", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(164), "fr");
  const sizes = [];
  while (session.nextBatch().length) {
    const batch = session.nextBatch();
    sizes.push(batch.length);
    session.completeBatch(batch, batch.map((item) => proposal(item)));
  }
  assert.deepEqual(sizes, [30, 30, 30, 30, 30, 14]);
});

test("la taille peut passer de 30 à 10 entre deux lots sans réinitialisation", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(164), "fr");
  const first = session.nextBatch();
  session.completeBatch(first, first.map((item) => proposal(item)));
  session.setBatchSize(10);
  const second = session.nextBatch();
  session.completeBatch(second, second.map((item) => proposal(item)));

  assert.equal(first.length, 30);
  assert.equal(second.length, 10);
  assert.equal(session.progress().examined, 40);
  assert.equal(session.progress().remaining, 124);
  assert.equal(session.candidates.length, 40);
});

test("un timeout à 100 puis une relance à 30 reprennent la même position", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(164), "fr");
  session.setBatchSize(100);
  const timedOut = session.nextBatch();

  session.setBatchSize(30);
  const retry = session.nextBatch();
  assert.equal(timedOut.length, 100);
  assert.equal(retry.length, 30);
  assert.deepEqual(retry, timedOut.slice(0, 30));
  assert.equal(session.progress().examined, 0);
  assert.equal(session.candidates.length, 0);
});

test("un second lot en échec reprend les 64 mêmes formes sans perdre le premier", () => {
  const items = reviewItems(164);
  const session = new ManualInflectedBatchSession();
  session.reset(items, "fr");
  session.setBatchSize(100);
  const first = session.nextBatch();
  session.completeBatch(first, first.map((item) => proposal(item)));
  const secondKeys = session.nextBatch().map((item) => formIdentity("fr", item.normalized));

  assert.equal(session.candidates.length, 100);
  assert.deepEqual(
    session.nextBatch().map((item) => formIdentity("fr", item.normalized)),
    secondKeys
  );
  assert.equal(session.progress().examined, 100);
  assert.equal(session.progress().remaining, 64);
});

test("un lot réussi examine aussi les formes sans proposition", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(101), "fr");
  session.setBatchSize(100);
  const first = session.nextBatch();
  session.completeBatch(first, first.slice(0, 3).map((item) => proposal(item)));

  assert.equal(session.progress().examined, 100);
  assert.equal(session.progress().remaining, 1);
  assert.equal(session.candidates.length, 3);
});

test("un succès partiel progresse tout le lot et conserve les propositions valides", () => {
  const session = new ManualInflectedBatchSession();
  session.reset(reviewItems(30), "fr");
  const batch = session.nextBatch();
  session.completeBatch(batch, batch.slice(0, 12).map((item) => proposal(item)));

  assert.equal(session.progress().examined, 30);
  assert.equal(session.progress().complete, true);
  assert.equal(session.candidates.length, 12);
});

test("les avertissements individuels sont visibles et non bloquants", () => {
  const warning = [{
    code: "IGNORED_INFLECTED_PROPOSAL",
    reason: "UNREQUESTED_SURFACE",
    surface_form: "accélérées",
  }];
  assert.equal(
    formatIgnoredProposalWarning(warning, 12),
    "1 proposition OpenAI a été ignorée car elle ne correspondait pas aux formes demandées : accélérées."
  );
  assert.equal(
    formatIgnoredProposalWarning(warning, 0),
    "Aucune proposition exploitable n’a été conservée. 1 proposition OpenAI a été ignorée car elle ne correspondait pas aux formes demandées : accélérées."
  );
});

test("la fusion conserve propositions, modifications et sélections humaines sans doublon", () => {
  const items = reviewItems(164);
  const session = new ManualInflectedBatchSession();
  session.reset(items, "fr");
  session.setBatchSize(100);
  const first = session.nextBatch();
  session.completeBatch(first, first.map((item) => proposal(item)));
  session.candidates[0].lemma_candidate = "lemme corrigé";
  session.candidates[0].selected = false;

  const second = session.nextBatch();
  session.completeBatch(second, [
    proposal(first[0], { lemma_candidate: "doublon à ignorer", selected: true }),
    ...second.map((item) => proposal(item)),
  ]);

  assert.equal(session.candidates.length, 164);
  assert.equal(session.candidates[0].lemma_candidate, "lemme corrigé");
  assert.equal(session.candidates[0].selected, false);
  assert.equal(session.progress().complete, true);
  assert.equal(session.nextBatch().length, 0);
});

test("une nouvelle analyse réinitialise lots et propositions avec une identité stable", () => {
  const session = new ManualInflectedBatchSession();
  const firstAnalysis = reviewItems(101);
  session.reset(firstAnalysis, "fr");
  session.setBatchSize(100);
  const first = session.nextBatch();
  session.completeBatch(first, first.map((item) => proposal(item)));

  const secondAnalysis = reviewItems(1);
  secondAnalysis[0].surface = "FÓRME-1";
  secondAnalysis[0].normalized = "forme-1";
  session.reset(secondAnalysis, "es");

  assert.equal(session.candidates.length, 0);
  assert.equal(session.batchSize, 30);
  assert.equal(session.progress().examined, 0);
  assert.equal(session.nextBatch().length, 1);
  assert.equal(session.reviewItemIdentity(secondAnalysis[0]), "es\u0000forme-1");
});
