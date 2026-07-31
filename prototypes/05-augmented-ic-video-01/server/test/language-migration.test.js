"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { migrateStore, runMigration } = require("../scripts/migrate-language-catalog");

const fixedMigrationDate = "2026-07-16T20:00:00.000Z";
const catalog = {
  languages: [
    { id: "fr", label: "Français" },
    { id: "es", label: "Español" },
    { id: "it", label: "Italiano" },
    { id: "pt", label: "Português" }
  ]
};

function syntheticStore() {
  return {
    schemaVersion: "0.1",
    updatedAt: "historical",
    activities: [
      {
        id: "activity-with-languages",
        title: "Fixture synthétique",
        transcription: { id: "transcription-test", languageId: "legacy-fr", segmentIds: ["segment-test"] },
        segments: [{
          id: "segment-test",
          startMs: 0,
          endMs: 1000,
          text: "Texte inchangé",
          languageIds: ["legacy-fr", "legacy-es"],
          speakerIds: [],
          phenomenonIds: []
        }],
        speakers: [],
        languages: [
          { id: "legacy-fr", code: "FR", label: "Ancien français" },
          { id: "legacy-es", code: "ES", label: "Ancien espagnol" }
        ],
        languageIntervals: [{
          id: "interval-test",
          languageId: "legacy-es",
          startMs: 0,
          endMs: 1000
        }],
        layers: [],
        phenomena: [],
        teacherAnnotations: []
      },
      {
        id: "empty-activity",
        title: "Fixture vide",
        transcription: { id: "transcription-empty", languageId: "legacy-unused", segmentIds: [] },
        segments: [],
        speakers: [],
        languages: [],
        languageIntervals: [],
        layers: [],
        phenomena: [],
        teacherAnnotations: []
      }
    ]
  };
}

test("l’outil historique remappe un magasin synthétique sans modifier le contenu pédagogique", () => {
  const before = syntheticStore();
  const after = migrateStore(before, catalog, fixedMigrationDate);

  assert.equal(after.updatedAt, fixedMigrationDate);
  assert.deepEqual(after.activities.map(activity => activity.id), before.activities.map(activity => activity.id));
  assert.deepEqual(after.activities[0].languages, [
    { id: "fr", code: "FR", label: "Français" },
    { id: "es", code: "ES", label: "Español" }
  ]);
  assert.equal(after.activities[0].transcription.languageId, "fr");
  assert.deepEqual(after.activities[0].segments[0].languageIds, ["fr", "es"]);
  assert.equal(after.activities[0].languageIntervals[0].languageId, "es");
  assert.equal(after.activities[0].segments[0].text, "Texte inchangé");
  assert.deepEqual(after.activities[1].languages, []);
  assert.equal(after.activities[1].transcription.languageId, null);
  assert.equal(before.activities[0].languages[0].id, "legacy-fr");
});

test("l’application reste atomique sur des fichiers temporaires et crée une sauvegarde exacte", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-language-migration-synthetic-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dataFile = path.join(root, "activities.json");
  const catalogFile = path.join(root, "languages.json");
  const backupFile = path.join(root, "activities.before-language-migration.json.bak");
  fs.writeFileSync(dataFile, `${JSON.stringify(syntheticStore(), null, 2)}\n`, "utf8");
  fs.writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  const before = fs.readFileSync(dataFile);

  const result = runMigration({
    dataFile,
    catalogFile,
    apply: true,
    backupFile,
    updatedAt: fixedMigrationDate
  });

  assert.equal(result.applied, true);
  assert.equal(result.before.length, 2);
  assert.equal(result.after.length, 2);
  assert.deepEqual(fs.readFileSync(backupFile), before);
  assert.equal(JSON.parse(fs.readFileSync(dataFile, "utf8")).activities[0].languages[0].id, "fr");
});

test("l’outil refuse un code hors référentiel sans altérer le magasin source", () => {
  const before = syntheticStore();
  before.activities[0].languages[0].code = "DE";
  const witness = structuredClone(before);
  assert.throws(
    () => migrateStore(before, catalog, fixedMigrationDate),
    /code de langue hors référentiel/
  );
  assert.deepEqual(before, witness);
});
