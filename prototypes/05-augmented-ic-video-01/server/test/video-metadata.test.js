"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");
const { validateMediaLibrary } = require("../media-library-schema");
const {
  editableProfile,
  validateProfile
} = require("../../shared/video-metadata-contract");

const prototypeDirectory = path.resolve(__dirname, "../..");
const activitiesFile = path.join(prototypeDirectory, "data", "activities.json");
const libraryFile = path.join(prototypeDirectory, "data", "video-library.json");
const testAssetId = "media-proto05-video-proto05-youtube-fg4h0-v3otk";

async function jsonRequest(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  return { response, body: await response.json() };
}

function completePayload(asset) {
  const profile = editableProfile(asset);
  return {
    ...profile,
    title: "Vidéo test Vidéo++",
    description: "Description éditoriale de recette.",
    usage: "test-video",
    context: "Mission 144",
    responsibleParty: "Équipe de recette",
    captureDate: "2026-07-30",
    languageIds: ["fr", "es"],
    notes: "Note interne jetable.",
    source: "Source déclarée pour la recette.",
    originUrl: "https://example.test/video-source",
    license: "Conditions de recette, sans prétention juridique.",
    consent: "Autorisation de recette uniquement.",
    restrictions: "Ne pas diffuser.",
    confidentiality: "internal",
    folderId: asset.folders?.[0]?.id || null,
    tagIds: asset.tags?.filter(tag => tag.normalizedName !== "untag").slice(0, 1).map(tag => tag.id) || []
  };
}

test("le contrat Vidéo++ distingue les champs facultatifs et les erreurs ciblées", () => {
  const empty = validateProfile({
    title: "Titre",
    description: "",
    usage: "",
    context: "",
    responsibleParty: "",
    captureDate: "",
    languageIds: [],
    notes: "",
    source: "",
    originUrl: "",
    license: "",
    consent: "",
    restrictions: "",
    confidentiality: "",
    folderId: null,
    tagIds: []
  }, { knownLanguageIds: ["fr", "es"] });
  assert.equal(empty.valid, true);
  assert.equal(empty.value.description, null);
  assert.equal(empty.value.editorialMetadata.usage, null);
  assert.equal(empty.value.declaredRights.confidentiality, null);

  const invalid = validateProfile({
    ...empty.value,
    title: " ",
    usage: "invented",
    captureDate: "2026-02-31",
    languageIds: ["unknown"],
    originUrl: "file:///tmp/video.mp4",
    confidentiality: "public"
  }, { knownLanguageIds: ["fr", "es"] });
  assert.equal(invalid.valid, false);
  assert.match(invalid.fieldErrors.title, /obligatoire/);
  assert.match(invalid.fieldErrors.captureDate, /date valide/);
  assert.match(invalid.fieldErrors.languageIds, /référentiel/);
  assert.match(invalid.fieldErrors.originUrl, /HTTP/);
  assert.match(invalid.fieldErrors.confidentiality, /invalide/);
});

test("le contrat média reste rétrocompatible et accepte l’identité éditoriale optionnelle", () => {
  const legacy = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
  assert.equal(validateMediaLibrary(legacy).valid, true);
  const enriched = structuredClone(legacy);
  enriched.assets[0].editorialMetadata = {
    usage: "reference",
    context: null,
    responsibleParty: null,
    captureDate: null,
    languageIds: [],
    notes: null
  };
  assert.equal(validateMediaLibrary(enriched).valid, true);
  enriched.assets[0].editorialMetadata = "invalid";
  const invalid = validateMediaLibrary(enriched);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.problems.some(problem => problem.code === "INVALID_ASSET_EDITORIAL_METADATA"));
});

test("la fiche complète persiste en JSON sans modifier le nom physique ni la filiation", async () => {
  const store = JSON.parse(fs.readFileSync(activitiesFile, "utf8"));
  const library = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
  const server = await startTemporaryProto05Server(store, "proto05-video-metadata-", {
    videoLibrary: library,
    env: { PROTO05_DATA_MODE: "json" }
  });
  try {
    const before = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}`);
    assert.equal(before.response.status, 200);
    const physicalBefore = before.body.asset.technicalSummary.fileName;
    const lineageBefore = before.body.asset.lineageSummary;
    const payload = completePayload(before.body.asset);
    const saved = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}/metadata`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.body.asset.title, payload.title);
    assert.equal(saved.body.asset.description, payload.description);
    assert.equal(saved.body.asset.editorialMetadata.usage, "test-video");
    assert.equal(saved.body.asset.provenance.declared.originUrl, payload.originUrl);
    assert.equal(saved.body.asset.rights.confidentiality, "internal");
    assert.equal(saved.body.asset.technicalSummary.fileName, physicalBefore);
    assert.equal(saved.body.asset.lineageSummary.familyRoot.id, lineageBefore.familyRoot.id);
    assert.equal(saved.body.asset.parentAssetId, before.body.asset.parentAssetId);
    assert.equal(saved.body.asset.familyRootAssetId, before.body.asset.familyRootAssetId);

    const persisted = JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8"));
    const persistedAsset = persisted.assets.find(asset => asset.id === testAssetId);
    assert.equal(persistedAsset.title, payload.title);
    assert.equal(persistedAsset.editorialMetadata.context, payload.context);
    assert.equal(persistedAsset.provenance.declared.source, payload.source);
    assert.equal(persistedAsset.rights.license, payload.license);

    await server.restart();
    const reloaded = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}`);
    assert.equal(reloaded.body.asset.title, payload.title);
    assert.equal(reloaded.body.asset.editorialMetadata.notes, payload.notes);
    const listed = await jsonRequest(server.baseUrl, "/api/proto05/library/assets");
    assert.ok(listed.body.assets.some(asset => asset.id === testAssetId && asset.title === payload.title));
    const catalog = await jsonRequest(server.baseUrl, "/api/proto05/video-catalog");
    assert.ok(catalog.body.videos.some(video => video.id === before.body.asset.defaultPlayableId && video.title === payload.title));
    const cleared = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}/metadata`, {
      method: "PUT",
      body: JSON.stringify({ ...payload, description: "" })
    });
    assert.equal(cleared.response.status, 200);
    assert.equal(cleared.body.asset.description, null);
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        JSON.parse(fs.readFileSync(server.videoLibraryFile, "utf8")).assets.find(asset => asset.id === testAssetId),
        "description"
      ),
      false
    );

    const localPlayable = library.playables.find(playable => playable.kind === "local-file");
    assert.ok(localPlayable);
    const localBefore = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${localPlayable.assetId}`);
    assert.ok(localBefore.body.asset.technicalSummary.fileName);
    const localSaved = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${localPlayable.assetId}/metadata`, {
      method: "PUT",
      body: JSON.stringify({
        ...completePayload(localBefore.body.asset),
        title: `${localBefore.body.asset.title} — titre éditorial temporaire`
      })
    });
    assert.equal(localSaved.response.status, 200, JSON.stringify(localSaved.body));
    assert.equal(localSaved.body.asset.technicalSummary.fileName, localBefore.body.asset.technicalSummary.fileName);
    assert.deepEqual(
      localSaved.body.asset.sources.map(source => source.origin),
      localBefore.body.asset.sources.map(source => source.origin)
    );
    assert.deepEqual(
      localSaved.body.asset.playables.map(playable => playable.location),
      localBefore.body.asset.playables.map(playable => playable.location)
    );
  } finally {
    await server.cleanup();
  }
});

test("une erreur de fiche ne produit aucune écriture et restitue les champs concernés", async () => {
  const store = JSON.parse(fs.readFileSync(activitiesFile, "utf8"));
  const library = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
  const server = await startTemporaryProto05Server(store, "proto05-video-metadata-invalid-", {
    videoLibrary: library,
    env: { PROTO05_DATA_MODE: "json" }
  });
  try {
    const beforeText = fs.readFileSync(server.videoLibraryFile, "utf8");
    const before = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}`);
    const payload = { ...completePayload(before.body.asset), originUrl: "javascript:forbidden()" };
    const refused = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}/metadata`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    assert.equal(refused.response.status, 400);
    assert.match(refused.body.fieldErrors.originUrl, /HTTP/);
    assert.equal(fs.readFileSync(server.videoLibraryFile, "utf8"), beforeText);
  } finally {
    await server.cleanup();
  }
});

test("la fiche et la liste exposent le parcours Vidéo++ sans incohérence visible connue", () => {
  const detail = fs.readFileSync(path.join(prototypeDirectory, "teacher-video-detail.html"), "utf8");
  const list = fs.readFileSync(path.join(prototypeDirectory, "teacher-videos.html"), "utf8");
  assert.match(detail, /Modifier la fiche/);
  assert.match(detail, /Abandonner les modifications/);
  assert.match(detail, /\/metadata/);
  assert.match(detail, /Accès historiques non qualifiés/);
  assert.match(detail, /Aucune version publiée/);
  assert.match(detail, /technicalSummary\?\.durationMs/);
  assert.match(detail, /deletionUnderstanding/);
  assert.match(detail, /normalizedName !== "untag"/);
  assert.match(list, /normalizedName!=='untag'/);
  assert.match(list, /deletionUnderstanding/);
  const nativeDialog = /\bwindow\.(?:alert|confirm|prompt)\s*\(|(?<![\w.])(?:alert|confirm|prompt)\s*\(/;
  assert.doesNotMatch(detail, nativeDialog);
  assert.doesNotMatch(list, nativeDialog);
});

test("les scripts intégrés des deux pages vidéo sont syntaxiquement valides", () => {
  for (const file of ["teacher-video-detail.html", "teacher-videos.html"]) {
    const html = fs.readFileSync(path.join(prototypeDirectory, file), "utf8");
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(match => match[1])
      .filter(source => source.trim());
    assert.ok(scripts.length > 0);
    scripts.forEach((source, index) => {
      assert.doesNotThrow(() => new Function(source), `${file} script intégré ${index + 1}`);
    });
  }
});

test("la fiche Vidéo++ persiste en MariaDB, survit au redémarrage puis restaure le témoin", {
  skip: process.env.PROTO05_RUN_MARIADB_INTEGRATION !== "1",
  timeout: 30000
}, async () => {
  const mysqlModulePath = process.env.PROTO05_MYSQL2_DIRECTORY
    || path.resolve(prototypeDirectory, "..", "00-ic-hub", "server", "node_modules", "mysql2", "promise");
  const mysql = require(mysqlModulePath);
  const connectionOptions = {
    host: process.env.PROTO05_MARIADB_HOST,
    port: Number(process.env.PROTO05_MARIADB_PORT),
    user: process.env.PROTO05_MARIADB_USER,
    password: process.env.PROTO05_MARIADB_PASSWORD,
    database: process.env.PROTO05_MARIADB_DATABASE,
    timezone: "Z"
  };
  const database = await mysql.createConnection(connectionOptions);
  const [[assetWitness]] = await database.query(
    "SELECT * FROM media_assets WHERE id = ?",
    [testAssetId]
  );
  const [tagWitness] = await database.query(
    "SELECT * FROM media_asset_tags WHERE asset_id = ? ORDER BY tag_id",
    [testAssetId]
  );
  const [[metadataWitness]] = await database.query(
    "SELECT * FROM data_projection_metadata WHERE document_key = 'media-library'"
  );
  await database.end();

  const store = JSON.parse(fs.readFileSync(activitiesFile, "utf8"));
  const server = await startTemporaryProto05Server(store, "proto05-video-metadata-mariadb-", {
    copyVideoLibraryWorkspaces: true,
    env: {
      PROTO05_DATA_MODE: "mariadb",
      PROTO05_MYSQL2_DIRECTORY: mysqlModulePath
    }
  });
  try {
    const before = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}`);
    assert.equal(before.response.status, 200);
    const physicalBefore = before.body.asset.technicalSummary.fileName;
    const lineageBefore = {
      parentAssetId: before.body.asset.parentAssetId,
      familyRootAssetId: before.body.asset.familyRootAssetId,
      defaultPlayableId: before.body.asset.defaultPlayableId
    };
    const payload = completePayload(before.body.asset);
    const saved = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}/metadata`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    assert.equal(saved.response.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.asset.editorialMetadata.usage, "test-video");
    assert.equal(saved.body.asset.technicalSummary.fileName, physicalBefore);

    await server.restart();
    const reloaded = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}`);
    assert.equal(reloaded.body.asset.title, payload.title);
    assert.equal(reloaded.body.asset.editorialMetadata.notes, payload.notes);
    assert.equal(reloaded.body.asset.provenance.declared.originUrl, payload.originUrl);
    assert.equal(reloaded.body.asset.rights.confidentiality, payload.confidentiality);
    assert.deepEqual({
      parentAssetId: reloaded.body.asset.parentAssetId,
      familyRootAssetId: reloaded.body.asset.familyRootAssetId,
      defaultPlayableId: reloaded.body.asset.defaultPlayableId
    }, lineageBefore);
    const catalog = await jsonRequest(server.baseUrl, "/api/proto05/video-catalog");
    assert.ok(catalog.body.videos.some(video => video.id === lineageBefore.defaultPlayableId && video.title === payload.title));
    const cleared = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}/metadata`, {
      method: "PUT",
      body: JSON.stringify({ ...payload, description: "" })
    });
    assert.equal(cleared.response.status, 200, JSON.stringify(cleared.body));
    assert.equal(cleared.body.asset.description, undefined);
    await server.restart();
    const clearedAfterRestart = await jsonRequest(server.baseUrl, `/api/proto05/library/assets/${testAssetId}`);
    assert.equal(clearedAfterRestart.body.asset.description, undefined);
  } finally {
    await server.stop();
    const restore = await mysql.createConnection(connectionOptions);
    try {
      await restore.beginTransaction();
      const generatedColumns = new Set(["id", "lineage_root_key"]);
      const assetColumns = Object.keys(assetWitness).filter(column => !generatedColumns.has(column));
      await restore.query(
        `UPDATE media_assets SET ${assetColumns.map(column => `\`${column}\` = ?`).join(", ")} WHERE id = ?`,
        [...assetColumns.map(column => assetWitness[column]), testAssetId]
      );
      await restore.query("DELETE FROM media_asset_tags WHERE asset_id = ?", [testAssetId]);
      for (const row of tagWitness) {
        const columns = Object.keys(row);
        await restore.query(
          `INSERT INTO media_asset_tags (${columns.map(column => `\`${column}\``).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
          columns.map(column => row[column])
        );
      }
      const metadataColumns = Object.keys(metadataWitness).filter(column => column !== "document_key");
      await restore.query(
        `UPDATE data_projection_metadata SET ${metadataColumns.map(column => `\`${column}\` = ?`).join(", ")} WHERE document_key = ?`,
        [...metadataColumns.map(column => metadataWitness[column]), "media-library"]
      );
      await restore.commit();
    } catch (error) {
      await restore.rollback();
      throw error;
    } finally {
      await restore.end();
      await server.cleanup();
    }
  }

  const verify = await mysql.createConnection(connectionOptions);
  try {
    const [[restored]] = await verify.query(
      "SELECT title, description, editorial_metadata_json, provenance_json, rights_json, folder_id, parent_asset_id, family_root_asset_id, default_playable_id, updated_at FROM media_assets WHERE id = ?",
      [testAssetId]
    );
    assert.equal(restored.title, assetWitness.title);
    assert.equal(restored.description, assetWitness.description);
    assert.equal(restored.editorial_metadata_json, assetWitness.editorial_metadata_json);
    assert.equal(String(restored.provenance_json), String(assetWitness.provenance_json));
    assert.equal(String(restored.rights_json), String(assetWitness.rights_json));
    assert.equal(restored.folder_id, assetWitness.folder_id);
    assert.equal(restored.parent_asset_id, assetWitness.parent_asset_id);
    assert.equal(restored.family_root_asset_id, assetWitness.family_root_asset_id);
    assert.equal(restored.default_playable_id, assetWitness.default_playable_id);
    assert.equal(new Date(restored.updated_at).toISOString(), new Date(assetWitness.updated_at).toISOString());
  } finally {
    await verify.end();
  }
});
