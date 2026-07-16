"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const EXPECTED_LANGUAGE_IDS = ["fr", "es", "it", "pt"];
const VOLUME_KEYS = ["segments", "speakers", "languages", "languageIntervals", "layers", "phenomena", "teacherAnnotations"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function catalogMap(catalogStore) {
  assert.ok(catalogStore && Array.isArray(catalogStore.languages), "Le référentiel doit exposer languages[].");
  assert.deepEqual(catalogStore.languages.map(language => language.id), EXPECTED_LANGUAGE_IDS, "Le référentiel attendu est fr, es, it, pt dans cet ordre.");
  const result = new Map();
  for (const language of catalogStore.languages) {
    assert.equal(typeof language.label, "string", `Libellé absent pour ${language.id}.`);
    assert.ok(language.label, `Libellé vide pour ${language.id}.`);
    assert.equal(result.has(language.id), false, `Identifiant de langue dupliqué : ${language.id}.`);
    result.set(language.id, { id: language.id, code: language.id.toUpperCase(), label: language.label });
  }
  return result;
}

function remapLanguageReference(value, identifiers, label, allowNull = false) {
  if (allowNull && value === null) return null;
  assert.equal(typeof value, "string", `${label} doit être un identifiant de langue.`);
  const mapped = identifiers.get(value);
  assert.ok(mapped, `${label} référence une langue inconnue : ${value}.`);
  return mapped;
}

function migrateActivity(source, references) {
  const activity = clone(source);
  assert.ok(Array.isArray(activity.languages), `${activity.id}.languages doit être un tableau.`);
  assert.ok(activity.transcription && typeof activity.transcription === "object", `${activity.id}.transcription est absente.`);
  assert.ok(Array.isArray(activity.segments), `${activity.id}.segments doit être un tableau.`);
  assert.ok(Array.isArray(activity.languageIntervals), `${activity.id}.languageIntervals doit être un tableau.`);

  if (activity.languages.length === 0) {
    assert.equal(activity.segments.length, 0, `${activity.id} ne peut pas avoir des segments sans langue déclarée.`);
    assert.equal(activity.languageIntervals.length, 0, `${activity.id} ne peut pas avoir des intervalles sans langue déclarée.`);
    activity.transcription.languageId = null;
    return activity;
  }

  const identifiers = new Map();
  const selectedIds = new Set();
  activity.languages = activity.languages.map(language => {
    assert.ok(language && typeof language === "object", `${activity.id} contient une langue invalide.`);
    const stableId = typeof language.code === "string" ? language.code.toLowerCase() : "";
    const reference = references.get(stableId);
    assert.ok(reference, `${activity.id} contient un code de langue hors référentiel : ${String(language.code)}.`);
    assert.equal(identifiers.has(language.id), false, `${activity.id} contient un identifiant de langue dupliqué : ${language.id}.`);
    assert.equal(selectedIds.has(stableId), false, `${activity.id} contient deux entrées pour la langue ${stableId}.`);
    identifiers.set(language.id, stableId);
    selectedIds.add(stableId);
    return { ...reference };
  });

  activity.transcription.languageId = remapLanguageReference(
    activity.transcription.languageId,
    identifiers,
    `${activity.id}.transcription.languageId`,
    true
  );
  activity.segments = activity.segments.map(segment => ({
    ...segment,
    languageIds: (segment.languageIds || []).map((languageId, index) => remapLanguageReference(
      languageId,
      identifiers,
      `${activity.id}.segments.${segment.id}.languageIds[${index}]`
    ))
  }));
  activity.languageIntervals = activity.languageIntervals.map(interval => ({
    ...interval,
    languageId: remapLanguageReference(
      interval.languageId,
      identifiers,
      `${activity.id}.languageIntervals.${interval.id}.languageId`
    )
  }));
  return activity;
}

function withoutLanguageFields(store) {
  const result = clone(store);
  delete result.updatedAt;
  for (const activity of result.activities) {
    activity.languages = "<migrated>";
    activity.transcription.languageId = "<migrated>";
    for (const segment of activity.segments) segment.languageIds = "<migrated>";
    for (const interval of activity.languageIntervals) interval.languageId = "<migrated>";
  }
  return result;
}

function summarizeStore(store) {
  return store.activities.map(activity => ({
    id: activity.id,
    title: activity.title,
    volumes: Object.fromEntries(VOLUME_KEYS.map(key => [key, activity[key].length])),
    languageIds: activity.languages.map(language => language.id),
    transcriptionLanguageId: activity.transcription.languageId,
    segmentLanguageReferences: activity.segments.reduce((total, segment) => total + segment.languageIds.length, 0),
    intervalLanguageReferences: activity.languageIntervals.length
  }));
}

function validateMigratedStore(before, after, references) {
  assert.ok(before && Array.isArray(before.activities), "Le magasin source doit exposer activities[].");
  assert.ok(after && Array.isArray(after.activities), "Le magasin migré doit exposer activities[].");
  assert.deepEqual(after.activities.map(activity => activity.id), before.activities.map(activity => activity.id), "L’ordre ou les identifiants des activités ont changé.");
  assert.deepEqual(withoutLanguageFields(after), withoutLanguageFields(before), "La migration a modifié un champ hors langues ou updatedAt.");

  for (const activity of after.activities) {
    const ids = new Set(activity.languages.map(language => language.id));
    assert.equal(ids.size, activity.languages.length, `${activity.id} contient des langues dupliquées.`);
    for (const language of activity.languages) assert.deepEqual(language, references.get(language.id), `${activity.id} ne reprend pas exactement le référentiel pour ${language.id}.`);
    if (activity.languages.length === 0) {
      assert.equal(activity.transcription.languageId, null, `${activity.id} doit conserver une langue de transcription nulle.`);
      assert.equal(activity.segments.length, 0, `${activity.id} doit conserver une collection de segments vide.`);
      assert.equal(activity.languageIntervals.length, 0, `${activity.id} doit conserver une collection d’intervalles vide.`);
    } else if (activity.transcription.languageId !== null) {
      assert.ok(ids.has(activity.transcription.languageId), `${activity.id}.transcription.languageId est orpheline.`);
    }
    for (const segment of activity.segments) {
      for (const languageId of segment.languageIds) assert.ok(ids.has(languageId), `${activity.id}.${segment.id} référence une langue absente.`);
    }
    for (const interval of activity.languageIntervals) assert.ok(ids.has(interval.languageId), `${activity.id}.${interval.id} référence une langue absente.`);
  }
  return true;
}

function migrateStore(before, catalogStore, updatedAt = new Date().toISOString()) {
  assert.ok(before && Array.isArray(before.activities), "Le magasin source doit exposer activities[].");
  const references = catalogMap(catalogStore);
  const after = { ...clone(before), updatedAt, activities: before.activities.map(activity => migrateActivity(activity, references)) };
  validateMigratedStore(before, after, references);
  return after;
}

function writeAtomically(dataFile, backupFile, after) {
  assert.ok(backupFile, "Une sauvegarde .bak explicite est obligatoire pour appliquer la migration.");
  assert.ok(backupFile.endsWith(".bak"), "Le chemin de sauvegarde doit se terminer par .bak.");
  const rawBefore = fs.readFileSync(dataFile);
  fs.copyFileSync(dataFile, backupFile, fs.constants.COPYFILE_EXCL);
  const temporaryFile = path.join(path.dirname(dataFile), `.${path.basename(dataFile)}.${process.pid}.${Date.now()}.tmp`);
  try {
    const descriptor = fs.openSync(temporaryFile, "wx");
    try {
      fs.writeFileSync(descriptor, `${JSON.stringify(after, null, 2)}\n`, "utf8");
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(temporaryFile, dataFile);
  } finally {
    try { fs.unlinkSync(temporaryFile); } catch {}
  }
  assert.equal(sha256(fs.readFileSync(backupFile)), sha256(rawBefore), "La sauvegarde ne correspond pas au fichier source.");
}

function runMigration({ dataFile, catalogFile, apply = false, backupFile, updatedAt }) {
  const rawBefore = fs.readFileSync(dataFile);
  const before = JSON.parse(rawBefore.toString("utf8"));
  const catalogStore = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
  const after = migrateStore(before, catalogStore, updatedAt);
  const rawAfter = Buffer.from(`${JSON.stringify(after, null, 2)}\n`, "utf8");
  if (apply) writeAtomically(dataFile, backupFile, after);
  return {
    applied: apply,
    dataFile,
    backupFile: apply ? backupFile : null,
    beforeSha256: sha256(rawBefore),
    afterSha256: sha256(rawAfter),
    before: summarizeStore(before),
    after: summarizeStore(after)
  };
}

function parseArguments(argv) {
  const result = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") result.apply = true;
    else if (argument === "--data") result.dataFile = path.resolve(argv[++index]);
    else if (argument === "--catalog") result.catalogFile = path.resolve(argv[++index]);
    else if (argument === "--backup") result.backupFile = path.resolve(argv[++index]);
    else if (argument === "--updated-at") result.updatedAt = argv[++index];
    else throw new Error(`Argument inconnu : ${argument}.`);
  }
  assert.ok(result.dataFile, "--data est obligatoire.");
  assert.ok(result.catalogFile, "--catalog est obligatoire.");
  if (result.apply) assert.ok(result.backupFile, "--backup est obligatoire avec --apply.");
  return result;
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(runMigration(parseArguments(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { catalogMap, migrateStore, runMigration, summarizeStore, validateMigratedStore };
