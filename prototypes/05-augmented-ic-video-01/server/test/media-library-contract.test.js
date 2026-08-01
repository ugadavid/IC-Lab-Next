"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateMediaLibrary, assertMediaLibrary } = require("../media-library-schema");
const {
  canonicalPlayableTreatmentDependencies,
  canonicalTreatmentDependencies
} = require("../media-deletion-preflight");

const fixturePath = path.join(__dirname, "fixtures", "media-library-canonical.valid.json");
const readFixture = () => JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const clone = value => JSON.parse(JSON.stringify(value));

function problem(result, code) {
  return result.problems.find(item => item.code === code);
}

test("le document canonique synthétique complet est accepté sans mutation", () => {
  const library = readFixture();
  const before = clone(library);
  const result = validateMediaLibrary(library);
  assert.equal(result.valid, true);
  assert.equal(result.problems.length, 0);
  assert.equal(result.unavailable.length, 1);
  assert.deepEqual(library, before);
  assert.doesNotThrow(() => assertMediaLibrary(library));
});

test("un asset sans playable et un lignage sur plusieurs générations sont valides", () => {
  const library = readFixture();
  library.assets.push({ id: "asset-empty", title: "Sans playable", lifecycle: "active", folderId: null, defaultPlayableId: null, parentAssetId: null, familyRootAssetId: "asset-empty", derivationTypes: [], tagIds: [], provenance: {}, technicalMetadata: { status: "unknown" }, rights: {}, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
  library.sources.push({ id: "source-empty", assetId: "asset-empty", kind: "direct-url", provider: "direct", origin: { originUrl: "https://media.example.test/empty.mp4" }, transport: "https", mimeType: "video/mp4", provenance: {}, createdAt: "2026-01-01T00:00:00.000Z" });
  const result = validateMediaLibrary(library);
  assert.equal(result.valid, true);
});

test("schemaVersion distingue syntaxe invalide, majeure inconnue et mineure future", () => {
  const invalid = readFixture(); invalid.schemaVersion = "1";
  assert.equal(problem(validateMediaLibrary(invalid), "INVALID_SCHEMA_VERSION").path, "schemaVersion");
  const unknownMajor = readFixture(); unknownMajor.schemaVersion = "2.0";
  const unknownMajorResult = validateMediaLibrary(unknownMajor);
  assert.equal(problem(unknownMajorResult, "UNKNOWN_SCHEMA_MAJOR").severity, "error");
  assert.equal(unknownMajorResult.readable, false);
  assert.equal(unknownMajorResult.writeEligible, false);
  const futureMinor = readFixture(); futureMinor.schemaVersion = "1.1";
  const futureResult = validateMediaLibrary(futureMinor);
  assert.equal(futureResult.valid, true);
  assert.equal(futureResult.readable, true);
  assert.equal(futureResult.writeEligible, false);
  assert.equal(futureResult.requiresUnknownFieldPreservation, true);
  assert.equal(futureResult.warnings[0].code, "FUTURE_SCHEMA_MINOR");
});

test("les collections, types, enums et champs obligatoires sont contrôlés", () => {
  const missing = readFixture(); delete missing.tags;
  assert.equal(problem(validateMediaLibrary(missing), "MISSING_COLLECTION").path, "tags");
  const invalid = readFixture(); invalid.assets[0].lifecycle = "deleted"; invalid.playables[0].availability = "gone"; invalid.treatments[0].status = "paused"; invalid.sources[0].transport = "ftp";
  const result = validateMediaLibrary(invalid);
  assert.ok(problem(result, "INVALID_ASSET_LIFECYCLE"));
  assert.ok(problem(result, "INVALID_AVAILABILITY"));
  assert.ok(problem(result, "INVALID_TREATMENT_STATUS"));
  assert.ok(problem(result, "INVALID_TRANSPORT"));
});

test("les projections sourceIds et playableIds ne deviennent pas une seconde vérité", () => {
  const library = readFixture();
  library.assets[0].sourceIds = ["source-remote"];
  library.assets[0].playableIds = ["playable-remote"];
  const result = validateMediaLibrary(library);
  assert.equal(problem(result, "PERSISTED_PROJECTION_FIELD").path, "assets[0]");
});

test("les références orphelines et les défauts incohérents sont refusés", () => {
  const library = readFixture();
  library.sources[0].assetId = "asset-missing";
  library.playables[0].sourceId = "source-missing";
  library.assets[0].defaultPlayableId = "playable-derived";
  library.assets[0].folderId = "folder-missing";
  library.assets[0].tagIds = ["tag-missing"];
  const result = validateMediaLibrary(library);
  for (const code of ["SOURCE_ASSET_NOT_FOUND", "PLAYABLE_SOURCE_NOT_FOUND", "DEFAULT_PLAYABLE_ASSET_MISMATCH", "FOLDER_NOT_FOUND", "TAG_NOT_FOUND"]) assert.ok(problem(result, code), code);
});

test("le lignage valide est accepté et les cycles ou racines incohérentes sont refusés", () => {
  const valid = validateMediaLibrary(readFixture());
  assert.equal(valid.valid, true);
  const cycle = readFixture(); cycle.assets[0].parentAssetId = "asset-derived-child";
  assert.ok(problem(validateMediaLibrary(cycle), "FAMILY_CYCLE"));
  const wrongRoot = readFixture(); wrongRoot.assets[2].familyRootAssetId = "asset-derived";
  assert.ok(problem(validateMediaLibrary(wrongRoot), "FAMILY_ROOT_MISMATCH"));
  const missingParent = readFixture(); missingParent.assets[1].parentAssetId = "asset-missing";
  assert.ok(problem(validateMediaLibrary(missingParent), "PARENT_ASSET_NOT_FOUND"));
});

test("les dossiers, tags et associations respectent leur hiérarchie", () => {
  const folderCycle = readFixture(); folderCycle.folders[0].parentFolderId = "folder-child";
  assert.ok(problem(validateMediaLibrary(folderCycle), "FOLDER_CYCLE"));
  const duplicateTags = readFixture(); duplicateTags.assets[0].tagIds = ["tag-corpus", "tag-corpus"];
  assert.ok(problem(validateMediaLibrary(duplicateTags), "DUPLICATE_TAG_ASSOCIATION"));
  const badNormalization = readFixture(); badNormalization.tags[0].normalizedName = "Corpus";
  assert.ok(problem(validateMediaLibrary(badNormalization), "INVALID_TAG_NORMALIZATION"));
});

test("la description d’asset et la couleur de tag sont optionnelles et typées", () => {
  const valid = readFixture();
  valid.assets[0].description = "Description canonique";
  valid.tags[0].color = "#123456";
  assert.equal(validateMediaLibrary(valid).valid, true);

  const badDescription = readFixture();
  badDescription.assets[0].description = { text: "invalide" };
  assert.ok(problem(validateMediaLibrary(badDescription), "INVALID_ASSET_DESCRIPTION"));

  const badColor = readFixture();
  badColor.tags[0].color = "x".repeat(33);
  assert.ok(problem(validateMediaLibrary(badColor), "INVALID_TAG_COLOR"));
});

test("la disponibilité et la localisation des playables sont séparées", () => {
  const library = readFixture();
  const missingReason = clone(library); missingReason.playables[2].availabilityReason = null;
  assert.ok(problem(validateMediaLibrary(missingReason), "MISSING_AVAILABILITY_REASON"));
  const unsafe = clone(library); unsafe.playables[1].location.storageKey = "../outside.mp4";
  assert.ok(problem(validateMediaLibrary(unsafe), "UNSAFE_STORAGE_KEY"));
  const absolute = clone(library); absolute.playables[1].location.storageKey = "C:/outside.mp4";
  assert.ok(problem(validateMediaLibrary(absolute), "UNSAFE_STORAGE_KEY"));
  const legacyStatus = clone(library); legacyStatus.playables[0].status = "available";
  const legacyResult = validateMediaLibrary(legacyStatus);
  assert.equal(legacyResult.valid, false);
  assert.equal(Object.hasOwn(legacyStatus.playables[0], "status"), true);
  assert.ok(problem(legacyResult, "PLAYABLE_STATUS_FORBIDDEN"));
});

test("les traitements valident leurs sources, sorties et états terminaux", () => {
  const badSource = readFixture(); badSource.treatments[0].sourcePlayableId = "playable-derived";
  assert.ok(problem(validateMediaLibrary(badSource), "TREATMENT_SOURCE_MISMATCH"));
  const badCompleted = readFixture(); badCompleted.treatments[0].outputPlayableId = null;
  assert.ok(problem(validateMediaLibrary(badCompleted), "COMPLETED_OUTPUT_MISSING"));
  const badFailed = readFixture(); badFailed.treatments[1].outputAssetId = "asset-derived-child";
  assert.ok(problem(validateMediaLibrary(badFailed), "FAILED_OUTPUT_PRESENT"));
  const noFalseOutput = readFixture();
  assert.equal(validateMediaLibrary(noFalseOutput).valid, true);
});

test("un traitement completed sans finishedAt est rejeté", () => {
  const library = readFixture();
  delete library.treatments[0].finishedAt;
  assert.ok(problem(validateMediaLibrary(library), "MISSING_DATE"));
});

test("un traitement completed avec une progression différente de 100 est rejeté", () => {
  const library = readFixture();
  library.treatments[0].progress = 99;
  assert.ok(problem(validateMediaLibrary(library), "COMPLETED_PROGRESS_INVALID"));
});

test("un playable publié de l’asset de sortie avec le rôle attendu est accepté", () => {
  const library = readFixture();
  const publishedSource = clone(library.sources.find(source => source.id === "source-remote"));
  publishedSource.id = "source-published-output";
  publishedSource.assetId = "asset-derived";
  publishedSource.role = "published-remote";
  const publishedPlayable = clone(library.playables.find(playable => playable.id === "playable-remote"));
  publishedPlayable.id = "playable-published-output";
  publishedPlayable.assetId = "asset-derived";
  publishedPlayable.sourceId = publishedSource.id;
  publishedPlayable.role = "published-remote";
  library.sources.push(publishedSource);
  library.playables.push(publishedPlayable);
  library.treatments[0].publishedPlayableId = publishedPlayable.id;
  assert.equal(validateMediaLibrary(library).valid, true);
});

test("un playable publié appartenant seulement à l’asset source est rejeté", () => {
  const library = readFixture();
  const publishedPlayable = clone(library.playables.find(playable => playable.id === "playable-local-copy"));
  publishedPlayable.id = "playable-published-source";
  publishedPlayable.role = "published-remote";
  library.playables.push(publishedPlayable);
  library.treatments[0].publishedPlayableId = publishedPlayable.id;
  assert.ok(problem(validateMediaLibrary(library), "TREATMENT_PUBLISHED_PLAYABLE_MISMATCH"));
});

test("les diagnostics sont stables, précis et distinguent indisponibilité et erreur", () => {
  const library = readFixture(); library.assets[0].folderId = "missing"; library.playables[0].location = null; library.tags[0].name = "À vérifier";
  const result = validateMediaLibrary(library);
  assert.equal(result.valid, false);
  assert.ok(result.problems.every(item => typeof item.code === "string" && typeof item.path === "string" && typeof item.message === "string"));
  assert.ok(result.problems.some(item => item.code === "FOLDER_NOT_FOUND"));
  assert.ok(result.problems.some(item => item.code === "INVALID_PLAYABLE_LOCATION"));
  assert.equal(result.unavailable.length, 1);
});

test("champ obligatoire absent : MediaAsset.title", () => {
  const library = readFixture(); delete library.assets[0].title;
  assert.ok(problem(validateMediaLibrary(library), "MISSING_FIELD"));
});

test("référence orpheline : MediaSource.assetId", () => {
  const library = readFixture(); library.sources[0].assetId = "asset-absent";
  assert.ok(problem(validateMediaLibrary(library), "SOURCE_ASSET_NOT_FOUND"));
});

test("référence orpheline : Playable.assetId", () => {
  const library = readFixture(); library.playables[0].assetId = "asset-absent";
  assert.ok(problem(validateMediaLibrary(library), "PLAYABLE_ASSET_NOT_FOUND"));
});

test("référence orpheline : Playable.sourceId", () => {
  const library = readFixture(); library.playables[0].sourceId = "source-absente";
  assert.ok(problem(validateMediaLibrary(library), "PLAYABLE_SOURCE_NOT_FOUND"));
});

test("référence orpheline : defaultPlayableId", () => {
  const library = readFixture(); library.assets[0].defaultPlayableId = "playable-absent";
  assert.ok(problem(validateMediaLibrary(library), "DEFAULT_PLAYABLE_NOT_FOUND"));
});

test("référence orpheline : traitement vers asset et playable", () => {
  const missingAsset = readFixture(); missingAsset.treatments[0].sourceAssetId = "asset-absent";
  assert.ok(problem(validateMediaLibrary(missingAsset), "TREATMENT_SOURCE_ASSET_NOT_FOUND"));
  const missingPlayable = readFixture(); missingPlayable.treatments[0].sourcePlayableId = "playable-absent";
  assert.ok(problem(validateMediaLibrary(missingPlayable), "TREATMENT_SOURCE_PLAYABLE_NOT_FOUND"));
});

test("auto-parent d’asset", () => {
  const library = readFixture(); library.assets[1].parentAssetId = "asset-derived";
  assert.ok(problem(validateMediaLibrary(library), "FAMILY_CYCLE"));
});

test("cycle direct d’assets", () => {
  const library = readFixture(); library.assets[0].parentAssetId = "asset-root";
  assert.ok(problem(validateMediaLibrary(library), "FAMILY_CYCLE"));
});

test("cycle indirect d’assets", () => {
  const library = readFixture(); library.assets[0].parentAssetId = "asset-derived-child";
  assert.ok(problem(validateMediaLibrary(library), "FAMILY_CYCLE"));
});

test("racine de famille incohérente", () => {
  const library = readFixture(); library.assets[2].familyRootAssetId = "asset-derived";
  assert.ok(problem(validateMediaLibrary(library), "FAMILY_ROOT_MISMATCH"));
});

test("auto-parent de dossier", () => {
  const library = readFixture(); library.folders[0].parentFolderId = "folder-root";
  assert.ok(problem(validateMediaLibrary(library), "FOLDER_CYCLE"));
});

test("cycle direct de dossiers", () => {
  const library = readFixture(); library.folders[0].parentFolderId = "folder-child";
  assert.ok(problem(validateMediaLibrary(library), "FOLDER_CYCLE"));
});

test("association de tag orpheline", () => {
  const library = readFixture(); library.assets[0].tagIds = ["tag-absent"];
  assert.ok(problem(validateMediaLibrary(library), "TAG_NOT_FOUND"));
});

test("doublon d’association de tag", () => {
  const library = readFixture(); library.assets[0].tagIds = ["tag-corpus", "tag-corpus"];
  assert.ok(problem(validateMediaLibrary(library), "DUPLICATE_TAG_ASSOCIATION"));
});

test("storageKey absolu", () => {
  const library = readFixture(); library.playables[1].location.storageKey = "C:/outside.mp4";
  assert.ok(problem(validateMediaLibrary(library), "UNSAFE_STORAGE_KEY"));
});

test("storageKey traversant un répertoire", () => {
  const library = readFixture(); library.playables[1].location.storageKey = "managed/../outside.mp4";
  assert.ok(problem(validateMediaLibrary(library), "UNSAFE_STORAGE_KEY"));
});

test("availabilityReason incohérent", () => {
  const missing = readFixture(); missing.playables[2].availabilityReason = null;
  assert.ok(problem(validateMediaLibrary(missing), "MISSING_AVAILABILITY_REASON"));
  const available = readFixture(); available.playables[1].availabilityReason = "missing-file";
  assert.ok(problem(validateMediaLibrary(available), "INVALID_AVAILABILITY_REASON"));
});

test("traitement completed incohérent", () => {
  const library = readFixture(); library.treatments[0].outputAssetId = null;
  assert.ok(problem(validateMediaLibrary(library), "COMPLETED_OUTPUT_MISSING"));
});

test("traitement failed sans output", () => {
  const library = readFixture();
  assert.equal(library.treatments[1].outputAssetId, null);
  assert.equal(library.treatments[1].outputPlayableId, null);
  assert.equal(validateMediaLibrary(library).valid, true);
});

test("plusieurs erreurs indépendantes sont rapportées séparément", () => {
  const library = readFixture(); delete library.assets[0].title; library.playables[0].availability = "invalid"; library.assets[0].folderId = "folder-absent";
  const result = validateMediaLibrary(library);
  assert.ok(result.problems.some(item => item.code === "MISSING_FIELD"));
  assert.ok(result.problems.some(item => item.code === "INVALID_AVAILABILITY"));
  assert.ok(result.problems.some(item => item.code === "FOLDER_NOT_FOUND"));
});

test("erreur, avertissement et indisponibilité sont distingués", () => {
  const current = validateMediaLibrary(readFixture());
  assert.equal(current.problems.length, 0);
  assert.equal(current.warnings.length, 0);
  assert.equal(current.unavailable.length, 1);
  assert.deepEqual(current.reconcilable, []);
  const future = readFixture(); future.schemaVersion = "1.1";
  const futureResult = validateMediaLibrary(future);
  assert.equal(futureResult.warnings[0].code, "FUTURE_SCHEMA_MINOR");
  assert.equal(futureResult.problems.length, 0);
});

test("source du playable appartenant à un autre asset", () => {
  const library = readFixture(); library.playables[0].sourceId = "source-derived";
  assert.ok(problem(validateMediaLibrary(library), "PLAYABLE_SOURCE_ASSET_MISMATCH"));
});

test("parent d’asset inexistant", () => {
  const library = readFixture(); library.assets[1].parentAssetId = "asset-absent";
  assert.ok(problem(validateMediaLibrary(library), "PARENT_ASSET_NOT_FOUND"));
});

test("racine de famille inexistante", () => {
  const library = readFixture(); library.assets[1].familyRootAssetId = "asset-absent";
  assert.ok(problem(validateMediaLibrary(library), "FAMILY_ROOT_NOT_FOUND"));
});

test("conflit de normalisation et d’unicité des tags", () => {
  const library = readFixture(); library.tags[1].name = "Corpus"; library.tags[1].normalizedName = "corpus";
  assert.ok(problem(validateMediaLibrary(library), "DUPLICATE_TAG_NAME"));
});

test("location incohérente", () => {
  const library = readFixture(); library.playables[0].location = {};
  assert.ok(problem(validateMediaLibrary(library), "INVALID_PLAYABLE_LOCATION"));
});

test("availability inconnue", () => {
  const library = readFixture(); library.playables[0].availability = "not-a-contract-state";
  assert.ok(problem(validateMediaLibrary(library), "INVALID_AVAILABILITY"));
});

test("état de traitement valide", () => {
  const library = readFixture();
  assert.deepEqual(library.treatments.map(item => item.status), ["completed", "failed"]);
  assert.equal(validateMediaLibrary(library).valid, true);
});

test("état de traitement inconnu", () => {
  const library = readFixture(); library.treatments[0].status = "paused";
  assert.ok(problem(validateMediaLibrary(library), "INVALID_TREATMENT_STATUS"));
});

test("relations source d’un traitement incohérentes", () => {
  const library = readFixture(); library.treatments[0].sourcePlayableId = "playable-derived";
  assert.ok(problem(validateMediaLibrary(library), "TREATMENT_SOURCE_MISMATCH"));
});

test("codes de diagnostic stables", () => {
  const first = readFixture(); delete first.assets[0].title;
  const second = readFixture(); delete second.assets[0].title;
  assert.equal(problem(validateMediaLibrary(first), "MISSING_FIELD").code, problem(validateMediaLibrary(second), "MISSING_FIELD").code);
});

test("chemins de diagnostic précis", () => {
  const library = readFixture(); delete library.assets[0].title;
  assert.equal(problem(validateMediaLibrary(library), "MISSING_FIELD").path, "assets[0].title");
});

test("validation invalide sans mutation", () => {
  const library = readFixture(); library.assets[0].title = null; library.playables[1].location.storageKey = "../outside.mp4";
  const before = clone(library);
  assert.equal(validateMediaLibrary(library).valid, false);
  assert.deepEqual(library, before);
});

test("document valide non muté explicitement", () => {
  const library = readFixture();
  const before = clone(library);
  const result = validateMediaLibrary(library);
  assert.equal(result.valid, true);
  assert.deepEqual(library, before);
});

test("lignage multi-générations valide explicitement", () => {
  const library = readFixture();
  assert.equal(library.assets[2].parentAssetId, "asset-derived");
  assert.equal(validateMediaLibrary(library).valid, true);
});

test("dossier inexistant explicitement", () => {
  const library = readFixture();
  library.assets[0].folderId = "folder-absent";
  assert.ok(problem(validateMediaLibrary(library), "FOLDER_NOT_FOUND"));
});

test("le préflight de suppression détecte toutes les relations canoniques des traitements", () => {
  const library = readFixture();
  const dependencies = canonicalTreatmentDependencies(library.treatments, {
    assetId: "asset-derived",
    playableIds: new Set(["playable-derived"])
  });
  assert.deepEqual(dependencies, [
    {
      id: "treatment-complete",
      title: "treatment-complete",
      status: "completed",
      relations: ["output-asset", "output-playable"],
      relationLabels: ["asset de sortie", "playable de sortie"]
    },
    {
      id: "treatment-failed",
      title: "treatment-failed",
      status: "failed",
      relations: ["source-asset", "source-playable"],
      relationLabels: ["asset d’entrée", "playable d’entrée"]
    }
  ]);
});

test("le préflight ignore les anciens champs artificiels d’un traitement", () => {
  const dependencies = canonicalTreatmentDependencies([{
    id: "treatment-legacy-decoy",
    label: "Ancien leurre",
    status: "running",
    sourceAssetId: "asset-other",
    sourcePlayableId: "playable-other",
    outputAssetId: null,
    outputPlayableId: null,
    publishedPlayableId: null,
    assetId: "asset-target",
    playableId: "playable-target",
    sourceId: "source-target"
  }], {
    assetId: "asset-target",
    playableIds: new Set(["playable-target"])
  });
  assert.deepEqual(dependencies, []);
});

test("le préflight d’une copie locale expose chaque traitement qui référence son playable", () => {
  const library = readFixture();
  assert.deepEqual(
    canonicalPlayableTreatmentDependencies(library.treatments, "playable-derived"),
    [{
      id: "treatment-complete",
      title: "treatment-complete",
      status: "completed",
      relations: ["output-playable"],
      relationLabels: ["playable de sortie"]
    }, {
      id: "treatment-failed",
      title: "treatment-failed",
      status: "failed",
      relations: ["source-playable"],
      relationLabels: ["playable d’entrée"]
    }]
  );
  assert.deepEqual(
    canonicalPlayableTreatmentDependencies(library.treatments, "playable-local-copy"),
    [{
      id: "treatment-complete",
      title: "treatment-complete",
      status: "completed",
      relations: ["source-playable"],
      relationLabels: ["playable d’entrée"]
    }]
  );
});
