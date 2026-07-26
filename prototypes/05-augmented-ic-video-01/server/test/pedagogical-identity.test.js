"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  QUALIFIED_TEXT_FIELDS,
  createEmptyPedagogicalIdentity,
  normalizePedagogicalIdentityStates,
  summarizePedagogicalIdentity,
  validatePedagogicalIdentity
} = require("../pedagogical-identity");
const { findChromium, readBrowserResults, runChromium, sha256 } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const serverDirectory = path.resolve(__dirname, "..");
const prototypeDirectory = path.resolve(serverDirectory, "..");
const canonicalDataFile = path.join(prototypeDirectory, "data", "activities.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalStore() {
  return JSON.parse(fs.readFileSync(canonicalDataFile, "utf8"));
}

function qualifiedText(value) {
  return { state: "known", value };
}

function completeIdentity(activityId) {
  const identity = createEmptyPedagogicalIdentity(activityId);
  identity.resourceNature = { state: "known", value: "pedagogical-activity" };
  identity.designStatus = "documented";
  for (const [key, value] of Object.entries({
    intention: "Observer une stratégie d’intercompréhension.",
    audience: "Étudiants participant à un échange plurilingue.",
    useContext: "Séance collective guidée.",
    learningObjectives: "Identifier et expliquer une stratégie.",
    prerequisites: "Aucun prérequis établi.",
    modalities: "Travail collectif.",
    recommendedScenario: "Observer, discuter puis réinvestir.",
    pedagogicalCore: "Rendre visible la négociation du sens.",
    adaptableElements: "Questions, durée et nombre de visionnages.",
    origin: "Conception locale de test.",
    responsibility: "Équipe de conception Proto05.",
    limitations: "Droits vidéo à vérifier séparément."
  })) identity[key] = qualifiedText(value);
  identity.indicativeDuration = { state: "known", minutes: 45, note: "Durée indicative." };
  return identity;
}

function metadataBody(activity, identity) {
  return {
    title: activity.title,
    description: activity.description,
    instruction: activity.instruction || "",
    pedagogicalQuestion: activity.pedagogicalQuestion || "",
    pedagogicalIdentity: identity
  };
}

test("contrat d’identité pédagogique et séparation complétude–qualification", () => {
  const activityId = "activity-pedagogical-contract";
  const identity = completeIdentity(activityId);
  assert.doesNotThrow(() => validatePedagogicalIdentity(identity, activityId));
  const complete = summarizePedagogicalIdentity({ id: activityId, pedagogicalIdentity: identity });
  assert.equal(complete.completeness, "complete");
  assert.equal(complete.qualificationLevel, "unqualified");

  identity.qualifications.push({
    id: "qualification-expert-1",
    level: "reviewed-by-expert",
    validatedBy: "Expert IC",
    validatedAt: "2026-07-26",
    context: "Relecture de la fiche avant expérimentation.",
    evidenceType: "expert-review",
    evidence: "Avis argumenté consigné dans le dossier de conception."
  });
  const reviewed = summarizePedagogicalIdentity({ id: activityId, pedagogicalIdentity: identity });
  assert.equal(reviewed.completeness, "complete");
  assert.equal(reviewed.qualificationLevel, "reviewed-by-expert");

  const invalid = clone(identity);
  invalid.qualifications[0].context = "";
  assert.throws(() => validatePedagogicalIdentity(invalid, activityId), /context.*non vide/i);
});

test("harmonisation uniforme des informations saisies depuis l’état inconnu", () => {
  const activityId = "activity-state-consistency";
  const identity = createEmptyPedagogicalIdentity(activityId);
  for (const field of QUALIFIED_TEXT_FIELDS) {
    identity[field] = { state: "unknown", value: `Information saisie pour ${field}.` };
  }
  identity.resourceNature = { state: "unknown", value: "functional-test" };
  identity.indicativeDuration = { state: "unknown", minutes: 60 };

  const normalized = normalizePedagogicalIdentityStates(identity);

  for (const field of QUALIFIED_TEXT_FIELDS) {
    assert.equal(normalized[field].state, "to-verify", field);
    assert.equal(normalized[field].value, `Information saisie pour ${field}.`);
  }
  assert.deepEqual(normalized.resourceNature, { state: "to-verify", value: "functional-test" });
  assert.deepEqual(normalized.indicativeDuration, { state: "to-verify", minutes: 60 });
  assert.deepEqual(normalized.qualifications, []);
  assert.doesNotThrow(() => validatePedagogicalIdentity(normalized, activityId));

  assert.equal(identity.learningObjectives.state, "unknown", "La normalisation ne mute pas l’objet reçu.");
  const empty = normalizePedagogicalIdentityStates(createEmptyPedagogicalIdentity("activity-empty"));
  assert.equal(empty.learningObjectives.state, "unknown");
  assert.equal(empty.indicativeDuration.state, "unknown");

  const explicit = completeIdentity("activity-explicit");
  assert.equal(normalizePedagogicalIdentityStates(explicit).intention.state, "known");
  assert.equal(normalizePedagogicalIdentityStates(explicit).indicativeDuration.state, "known");
});

test("lecture legacy, fiche partielle et reprise sans migration canonique", { timeout: 20000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const historical = store.activities.find(activity => !activity.pedagogicalIdentity);
  assert.ok(historical);
  assert.equal(historical.pedagogicalIdentity, undefined);
  const historicalBefore = clone(historical);
  const temporary = await startTemporaryProto05Server(clone(store), "proto05-pedagogical-legacy-");

  try {
    const initialResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(historical.id)}`);
    assert.equal(initialResponse.status, 200);
    const initial = (await initialResponse.json()).activity;
    assert.equal(initial.pedagogicalIdentity, undefined);
    assert.deepEqual(initial.pedagogicalIdentitySummary, {
      presence: "absent",
      completeness: "incomplete",
      missingFields: ["pedagogicalIdentity"],
      qualificationLevel: "unqualified",
      qualificationLevels: [],
      requalificationRequired: false
    });

    const identity = createEmptyPedagogicalIdentity(historical.id, {
      lineage: { state: "unknown" }
    });
    identity.intention = qualifiedText("Documenter progressivement une intention sans la qualifier automatiquement.");
    identity.audience = { state: "to-verify", value: "Public à confirmer avec l’équipe pédagogique." };
    const saveResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(historical.id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(metadataBody(historical, identity))
    });
    assert.equal(saveResponse.status, 200);
    const saved = (await saveResponse.json()).activity;
    assert.equal(saved.pedagogicalIdentity.intention.state, "known");
    assert.equal(saved.pedagogicalIdentity.audience.state, "to-verify");
    assert.equal(saved.pedagogicalIdentitySummary.completeness, "incomplete");
    assert.equal(saved.pedagogicalIdentitySummary.qualificationLevel, "unqualified");
    assert.equal(saved.segments.length, historicalBefore.segments.length);
    assert.deepEqual(saved.teacherAnnotations, historicalBefore.teacherAnnotations);

    const persisted = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    const persistedHistorical = persisted.activities.find(activity => activity.id === historical.id);
    assert.deepEqual(persistedHistorical.pedagogicalIdentity, identity);
    const withoutIdentity = clone(persistedHistorical);
    delete withoutIdentity.pedagogicalIdentity;
    assert.deepEqual(withoutIdentity, historicalBefore);
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  } finally {
    await temporary.cleanup();
  }
});

test("consultation sans écriture puis harmonisation à la prochaine sauvegarde", { timeout: 20000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const activity = store.activities.find(item => item.id === "proto05-augmented-video-01");
  assert.equal(activity.pedagogicalIdentity.indicativeDuration.state, "unknown");
  assert.equal(activity.pedagogicalIdentity.indicativeDuration.minutes, 60);
  const temporary = await startTemporaryProto05Server(clone(store), "proto05-pedagogical-consistency-");

  try {
    const persistedBeforeConsultation = fs.readFileSync(temporary.dataFile, "utf8");
    const consultation = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(activity.id)}`);
    assert.equal(consultation.status, 200);
    assert.equal(fs.readFileSync(temporary.dataFile, "utf8"), persistedBeforeConsultation);

    const identity = clone(activity.pedagogicalIdentity);
    identity.learningObjectives = { state: "unknown", value: "Comparer plusieurs stratégies d’intercompréhension." };
    identity.prerequisites = { state: "unknown", value: "Préparation éventuelle à confirmer." };
    identity.limitations = { state: "known", value: "Droits vidéo traités séparément." };
    const save = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(activity.id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(metadataBody(activity, identity))
    });
    assert.equal(save.status, 200);
    const saved = (await save.json()).activity;
    assert.deepEqual(saved.pedagogicalIdentity.learningObjectives, {
      state: "to-verify",
      value: "Comparer plusieurs stratégies d’intercompréhension."
    });
    assert.deepEqual(saved.pedagogicalIdentity.prerequisites, {
      state: "to-verify",
      value: "Préparation éventuelle à confirmer."
    });
    assert.deepEqual(saved.pedagogicalIdentity.indicativeDuration, {
      state: "to-verify",
      minutes: 60
    });
    assert.equal(saved.pedagogicalIdentity.limitations.state, "known");
    assert.equal(saved.pedagogicalIdentity.intention.state, "known");
    assert.deepEqual(saved.pedagogicalIdentity.qualifications, []);
    assert.equal(saved.pedagogicalIdentitySummary.qualificationLevel, "unqualified");

    const persisted = JSON.parse(fs.readFileSync(temporary.dataFile, "utf8"));
    const reloaded = persisted.activities.find(item => item.id === activity.id);
    assert.deepEqual(reloaded.pedagogicalIdentity, saved.pedagogicalIdentity);
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  } finally {
    await temporary.cleanup();
  }
});

test("création neuve, duplication comme variante et invalidation des preuves", { timeout: 20000 }, async () => {
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const source = store.activities.find(activity => activity.videoRef);
  assert.ok(source, "Une activité avec videoRef est nécessaire à la fixture.");
  source.pedagogicalIdentity = completeIdentity(source.id);
  source.pedagogicalIdentity.qualifications.push({
    id: "qualification-author-1",
    level: "documented-by-author",
    validatedBy: "Auteur de test",
    validatedAt: "2026-07-26",
    context: "Qualification de la source uniquement.",
    evidenceType: "author-declaration",
    evidence: "Fiche relue et assumée par son auteur."
  });
  const sibling = store.activities.find(activity => activity.id !== source.id && activity.video?.id === source.video?.id);
  assert.ok(sibling, "Une activité sœur partageant le média est nécessaire.");
  assert.equal(sibling.pedagogicalIdentity, undefined);
  const temporary = await startTemporaryProto05Server(clone(store), "proto05-pedagogical-duplicate-");

  try {
    const duplicateResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(source.id)}/duplicate`, { method: "POST" });
    assert.equal(duplicateResponse.status, 201);
    const copy = (await duplicateResponse.json()).activity;
    assert.deepEqual(copy.videoRef, source.videoRef);
    assert.equal(copy.pedagogicalIdentity.designStatus, "to-review");
    assert.deepEqual(copy.pedagogicalIdentity.qualifications, []);
    assert.deepEqual(copy.pedagogicalIdentity.lineage, {
      state: "known",
      relation: "variant",
      parentActivityId: source.id,
      rootActivityId: source.id
    });
    assert.equal(copy.pedagogicalIdentitySummary.qualificationLevel, "unqualified");
    assert.equal(copy.pedagogicalIdentitySummary.requalificationRequired, true);

    const siblingResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(sibling.id)}`);
    const siblingReloaded = (await siblingResponse.json()).activity;
    assert.equal(siblingReloaded.pedagogicalIdentity, undefined);
    assert.equal(siblingReloaded.pedagogicalIdentitySummary.presence, "absent");

    const deleteSource = await fetch(`${temporary.baseUrl}/api/proto05/activities/${encodeURIComponent(source.id)}`, { method: "DELETE" });
    assert.equal(deleteSource.status, 409);
    assert.match((await deleteSource.json()).error, /variante pédagogique/i);

    const videoCatalog = JSON.parse(fs.readFileSync(path.join(prototypeDirectory, "data", "video-catalog.json"), "utf8"));
    const catalogVideo = videoCatalog.videos.find(video => video.authorized);
    const createResponse = await fetch(`${temporary.baseUrl}/api/proto05/activities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Nouvelle activité avec fiche", description: "", videoId: catalogVideo.id })
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()).activity;
    assert.equal(created.pedagogicalIdentity.designStatus, "draft");
    assert.deepEqual(created.pedagogicalIdentity.qualifications, []);
    assert.deepEqual(created.pedagogicalIdentity.lineage, {
      state: "known",
      relation: "root",
      parentActivityId: null,
      rootActivityId: created.id
    });
    assert.equal(created.pedagogicalIdentitySummary.completeness, "incomplete");
    assert.equal(created.pedagogicalIdentitySummary.qualificationLevel, "unqualified");
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  } finally {
    await temporary.cleanup();
  }
});

test("la vue étudiante reste distincte de la fiche enseignante", () => {
  const studentPage = fs.readFileSync(path.join(prototypeDirectory, "index-0.0.9.html"), "utf8");
  assert.doesNotMatch(studentPage, /pedagogicalIdentity|Qualifications et preuves|Fiche pédagogique/);
  const teacherPage = fs.readFileSync(path.join(prototypeDirectory, "teacher-edit.html"), "utf8");
  assert.match(teacherPage, /Identité pédagogique/);
  assert.match(teacherPage, /Une fiche complète n’est jamais une validation pédagogique automatique/);
});

function chromiumIdentityRunner(activityId) {
  return `<!doctype html><html><body data-test-state="running"><iframe id="flow" style="width:1440px;height:1000px;border:0" src="/teacher/edit/${encodeURIComponent(activityId)}"></iframe><script>
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 9000;
    while (Date.now() < deadline) {
      try { if (predicate()) return; } catch {}
      await pause(30);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  (async () => {
    const frame = document.getElementById('flow');
    await waitFor(() => frame.contentDocument?.querySelector('#startIdentity') && !frame.contentDocument.querySelector('#startIdentity').hidden, 'fiche legacy absente');
    const editDocument = frame.contentDocument;
    const initialBadge = editDocument.querySelector('#identityBadge').textContent;
    editDocument.querySelector('#startIdentity').click();
    editDocument.querySelector('#resourceNatureState').value = 'known';
    editDocument.querySelector('#resourceNatureValue').value = 'functional-test';
    const intention = editDocument.querySelector('[data-qualified-field="intention"]');
    intention.querySelector('[data-role="state"]').value = 'known';
    intention.querySelector('[data-role="value"]').value = 'Observer une stratégie sans qualification automatique.';
    const audience = editDocument.querySelector('[data-qualified-field="audience"]');
    audience.querySelector('[data-role="state"]').value = 'to-verify';
    audience.querySelector('[data-role="value"]').value = 'Public à confirmer.';
    editDocument.querySelector('#save').click();
    await waitFor(() => editDocument.querySelector('#status').textContent.includes('enregistrées'), 'sauvegarde de la fiche partielle');
    const savedStatus = editDocument.querySelector('#status').textContent;
    frame.contentWindow.location.reload();
    await waitFor(() => frame.contentDocument?.querySelector('[data-qualified-field="intention"] [data-role="value"]')?.value.includes('Observer une stratégie'), 'relecture de la fiche');
    const reloadedDocument = frame.contentDocument;
    const reloadedValue = reloadedDocument.querySelector('[data-qualified-field="intention"] [data-role="value"]').value;
    const editWidth = reloadedDocument.documentElement.scrollWidth;
    frame.contentWindow.location.href = '/teacher';
    await waitFor(() => frame.contentWindow.location.pathname === '/teacher' && frame.contentDocument?.querySelector('.identity-summary')?.textContent.includes('Observer une stratégie'), 'résumé en bibliothèque');
    const libraryText = frame.contentDocument.querySelector('article.activity').textContent;
    frame.contentWindow.location.href = '/teacher/guided/${encodeURIComponent(activityId)}';
    await waitFor(() => frame.contentWindow.location.pathname.includes('/teacher/guided/') && frame.contentDocument?.querySelector('#pedagogicalReminder')?.textContent.includes('Observer une stratégie'), 'rappel dans atelier guidé');
    const guidedText = frame.contentDocument.querySelector('#pedagogicalReminder').textContent;
    frame.contentWindow.location.href = '/student/${encodeURIComponent(activityId)}';
    await waitFor(() => frame.contentWindow.location.pathname.includes('/student/') && frame.contentDocument?.querySelector('#activityTitle, h1'), 'vue étudiante');
    const studentHasTeacherReminder = Boolean(frame.contentDocument.querySelector('#pedagogicalReminder, #identityBadge'));
    const persisted = await (await fetch('/api/proto05/activities/${encodeURIComponent(activityId)}')).json();
    document.body.dataset.results = encodeURIComponent(JSON.stringify({
      initialBadge,
      savedStatus,
      reloadedValue,
      libraryText,
      guidedText,
      studentHasTeacherReminder,
      editWidth,
      qualificationCount: persisted.activity.pedagogicalIdentity.qualifications.length,
      qualificationLevel: persisted.activity.pedagogicalIdentitySummary.qualificationLevel
    }));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`;
}

test("parcours Chromium de fiche partielle, bibliothèque, atelier guidé et vue étudiante", { timeout: 30000 }, async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la validation de l’identité pédagogique.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const historical = store.activities.find(activity => !activity.pedagogicalIdentity);
  const temporary = await startTemporaryProto05Server(clone(store), "proto05-pedagogical-chromium-");
  const runnerFile = path.join(temporary.root, "prototype", "pedagogical-identity-runner.html");
  fs.writeFileSync(runnerFile, chromiumIdentityRunner(historical.id), "utf8");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-pedagogical-chromium-profile-"));
  let results;
  let browserError;
  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/pedagogical-identity-runner.html`, profileDirectory, {
      virtualTimeBudget: 18000,
      timeout: 26000,
      windowSize: "1500,1100"
    });
    results = readBrowserResults(dom);
  } catch (error) {
    browserError = error;
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.stop();
  }

  await context.test("les données canoniques restent inchangées", () => {
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  });
  if (browserError) {
    await temporary.cleanup();
    throw browserError;
  }
  await context.test("la fiche partielle est explicite, sauvegardée et relue", () => {
    assert.equal(results.initialBadge, "Fiche absente");
    assert.match(results.savedStatus, /enregistrées/i);
    assert.equal(results.reloadedValue, "Observer une stratégie sans qualification automatique.");
    assert.equal(results.qualificationCount, 0);
    assert.equal(results.qualificationLevel, "unqualified");
    assert.ok(results.editWidth <= 1440, `La fiche déborde horizontalement (${results.editWidth}px).`);
  });
  await context.test("la bibliothèque et l’atelier montrent un résumé sans polluer la vue étudiante", () => {
    assert.match(results.libraryText, /Observer une stratégie/);
    assert.match(results.libraryText, /Fiche incomplète/);
    assert.match(results.guidedText, /Observer une stratégie/);
    assert.match(results.guidedText, /Fiche incomplète/);
    assert.equal(results.studentHasTeacherReminder, false);
  });
  await temporary.cleanup();
});

function chromiumStateConsistencyRunner(activityId) {
  return `<!doctype html><html><body data-test-state="running"><iframe id="flow" src="/teacher/edit/${encodeURIComponent(activityId)}"></iframe><script>
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 9000;
    while (Date.now() < deadline) {
      try { if (predicate()) return; } catch {}
      await pause(30);
    }
    throw new Error('Délai dépassé : ' + label);
  }
  const input = control => control.dispatchEvent(new Event('input', { bubbles: true }));
  const change = control => control.dispatchEvent(new Event('change', { bubbles: true }));
  (async () => {
    const frame = document.getElementById('flow');
    await waitFor(() => frame.contentDocument?.querySelector('#identityFields') && !frame.contentDocument.querySelector('#identityFields').hidden, 'fiche existante');
    const editDocument = frame.contentDocument;
    const objective = editDocument.querySelector('[data-qualified-field="learningObjectives"]');
    const prerequisite = editDocument.querySelector('[data-qualified-field="prerequisites"]');
    const intention = editDocument.querySelector('[data-qualified-field="intention"]');
    const durationState = editDocument.querySelector('#indicativeDurationState');
    const durationMinutes = editDocument.querySelector('#indicativeDurationMinutes');
    const natureState = editDocument.querySelector('#resourceNatureState');
    const natureValue = editDocument.querySelector('#resourceNatureValue');
    const initialDurationState = durationState.value;

    objective.querySelector('[data-role="value"]').value = 'Comparer plusieurs stratégies d’intercompréhension.';
    input(objective.querySelector('[data-role="value"]'));
    prerequisite.querySelector('[data-role="value"]').value = 'Préparation éventuelle à confirmer.';
    input(prerequisite.querySelector('[data-role="value"]'));
    durationMinutes.value = '60';
    input(durationMinutes);
    natureState.value = 'unknown';
    natureValue.value = 'functional-test';
    change(natureState);
    intention.querySelector('[data-role="value"]').value = 'Test fonctionnel précisé.';
    input(intention.querySelector('[data-role="value"]'));

    const automaticStates = {
      objective: objective.querySelector('[data-role="state"]').value,
      prerequisite: prerequisite.querySelector('[data-role="state"]').value,
      duration: durationState.value,
      nature: natureState.value,
      intention: intention.querySelector('[data-role="state"]').value
    };
    editDocument.querySelector('#save').click();
    await waitFor(() => editDocument.querySelector('#status').textContent.includes('enregistrées'), 'sauvegarde harmonisée');
    frame.contentWindow.location.reload();
    await waitFor(() => frame.contentDocument?.querySelector('[data-qualified-field="learningObjectives"] [data-role="value"]')?.value.includes('Comparer plusieurs'), 'relecture harmonisée');
    const reloaded = frame.contentDocument;
    const persisted = await (await fetch('/api/proto05/activities/${encodeURIComponent(activityId)}')).json();
    document.body.dataset.results = encodeURIComponent(JSON.stringify({
      initialDurationState,
      automaticStates,
      reloadedObjectiveState: reloaded.querySelector('[data-qualified-field="learningObjectives"] [data-role="state"]').value,
      reloadedObjectiveValue: reloaded.querySelector('[data-qualified-field="learningObjectives"] [data-role="value"]').value,
      reloadedDurationState: reloaded.querySelector('#indicativeDurationState').value,
      reloadedDurationMinutes: reloaded.querySelector('#indicativeDurationMinutes').value,
      reloadedPrerequisiteState: reloaded.querySelector('[data-qualified-field="prerequisites"] [data-role="state"]').value,
      qualificationCount: persisted.activity.pedagogicalIdentity.qualifications.length,
      qualificationLevel: persisted.activity.pedagogicalIdentitySummary.qualificationLevel
    }));
    document.body.dataset.testState = 'done';
  })().catch(error => {
    document.body.dataset.error = encodeURIComponent(error.stack || error.message || String(error));
    document.body.dataset.testState = 'failed';
  });
  </script></body></html>`;
}

test("harmonisation Chromium de la saisie, sauvegarde et relecture", { timeout: 30000 }, async () => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la validation ciblée des états.");
  const canonicalHashBefore = sha256(canonicalDataFile);
  const store = canonicalStore();
  const activity = store.activities.find(item => item.id === "proto05-augmented-video-01");
  const temporary = await startTemporaryProto05Server(clone(store), "proto05-pedagogical-consistency-chromium-");
  const runnerFile = path.join(temporary.root, "prototype", "pedagogical-state-consistency-runner.html");
  fs.writeFileSync(runnerFile, chromiumStateConsistencyRunner(activity.id), "utf8");
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-pedagogical-consistency-profile-"));

  try {
    const dom = await runChromium(chromium, `${temporary.baseUrl}/pedagogical-state-consistency-runner.html`, profileDirectory, {
      virtualTimeBudget: 15000,
      timeout: 24000,
      windowSize: "1500,1100"
    });
    const results = readBrowserResults(dom);
    assert.equal(results.initialDurationState, "unknown");
    assert.deepEqual(results.automaticStates, {
      objective: "to-verify",
      prerequisite: "to-verify",
      duration: "to-verify",
      nature: "to-verify",
      intention: "known"
    });
    assert.equal(results.reloadedObjectiveState, "to-verify");
    assert.equal(results.reloadedObjectiveValue, "Comparer plusieurs stratégies d’intercompréhension.");
    assert.equal(results.reloadedDurationState, "to-verify");
    assert.equal(results.reloadedDurationMinutes, "60");
    assert.equal(results.reloadedPrerequisiteState, "to-verify");
    assert.equal(results.qualificationCount, 0);
    assert.equal(results.qualificationLevel, "unqualified");
    assert.equal(sha256(canonicalDataFile), canonicalHashBefore);
  } finally {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
    await temporary.cleanup();
  }
});
