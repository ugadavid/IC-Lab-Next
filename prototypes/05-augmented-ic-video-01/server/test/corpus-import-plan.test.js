"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateCorpusManifest } = require("../corpus-import-manifest");
const { ALLOWED_SOURCE_KINDS, canonicalJson, createCorpusImportPlan, manifestSemanticHash } = require("../corpus-import-plan");
const { loadValidatedManifest, parseArguments, producePlan } = require("../scripts/corpus-import");

const prototypeDirectory = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(prototypeDirectory, "imports", "corpora", "repli4c-24-videos.v1.json");

function clone(value) { return structuredClone(value); }
function manifest() { return JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
function hashes(value = manifest()) { return Object.fromEntries(value.corpus.sources.map(source => [source.path, source.sha256])); }
function validate(value) { return validateCorpusManifest(value, { sourceHashes: hashes(value) }); }
function invalid(change, pattern) {
  const value = manifest();
  change(value);
  assert.throws(() => validate(value), pattern);
}
function hls(videoId) { return manifest().entries.find(entry => entry.externalIdentity.videoId === videoId).source.url; }
function asset(videoId, id, description = undefined) {
  return { id, title: `Titre ${videoId}`, ...(description !== undefined ? { description } : {}), lifecycle: "active", folderId: null, defaultPlayableId: `playable-${videoId}`, parentAssetId: null, familyRootAssetId: id, derivationTypes: [], tagIds: [], provenance: {}, technicalMetadata: {}, rights: {}, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
}
function snapshot() {
  const matches = [
    ["36971", "media-proto05-remote-ref-03738b8065e1866b8e956819", "D'où viens tu ?"],
    ["36973", "media-proto05-remote-ref-0b565a4a0ba865a02cd10c87"],
    ["36976", "media-proto05-remote-ref-c3bd95a1556c0bb08ba0e0fb"],
    ["37004", "media-proto05-video-proto05-uga-37004"]
  ];
  const assets = matches.map(([videoId, id, description]) => asset(videoId, id, description));
  const sources = matches.map(([videoId, id]) => ({ id: `source-${videoId}`, assetId: id, kind: "remote", provider: "uga", origin: { sourceUrl: hls(videoId) }, transport: "hls", mimeType: "application/vnd.apple.mpegurl", provenance: {}, createdAt: "2026-01-01T00:00:00.000Z" }));
  const playables = matches.map(([videoId, id]) => ({ id: `playable-${videoId}`, assetId: id, sourceId: `source-${videoId}`, kind: "hls", provider: "uga", availability: "available", availabilityReason: null, location: { manifestUrl: hls(videoId) }, technicalMetadata: { durationMs: Number(videoId) }, provenance: {}, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }));
  const canonicalVideoLibrary = { schemaVersion: "1.0", updatedAt: "2026-01-01T00:00:00.000Z", assets, sources, playables, treatments: [{ id: "derivation-36976", sourceAssetId: matches[2][1], outputAssetId: "derived-36976" }], folders: [], tags: [] };
  return { canonicalVideoLibrary, activities: { activities: [{ id: "proto05-augmented-video-01", title: "Activité existante", videoRef: { assetId: matches[3][1], playableId: "playable-37004" } }] } };
}
function plan(sourceSnapshot = snapshot(), sourceManifest = manifest()) {
  validate(sourceManifest);
  return createCorpusImportPlan({ manifest: sourceManifest, snapshot: sourceSnapshot, manifestHash: manifestSemanticHash(sourceManifest), sourceHashes: hashes(sourceManifest) });
}

test("le manifeste v1 valide contient exactement 24 entrées", () => assert.equal(validate(manifest()).entries.length, 24));
test("une cardinalité incorrecte est rejetée", () => invalid(value => value.entries.pop(), /24 entrées/));
test("un entryId dupliqué est rejeté", () => invalid(value => { value.entries[1].entryId = value.entries[0].entryId; }, /entryId dupliqué/));
test("un corpusOrder dupliqué est rejeté", () => invalid(value => { value.entries[1].corpusOrder = value.entries[0].corpusOrder; }, /corpusOrder dupliqué/));
test("un videoId dupliqué est rejeté", () => invalid(value => { value.entries[1].externalIdentity.videoId = value.entries[0].externalIdentity.videoId; value.entries[1].source.url = value.entries[0].source.url.replace("36970", "36970"); }, /videoId dupliqué|URL dupliqué/));
test("une URL dupliquée est rejetée", () => invalid(value => { value.entries[1].source.url = value.entries[0].source.url; }, /URL UGA incohérente|URL dupliqué/));
test("une URL UGA incohérente est rejetée", () => invalid(value => { value.entries[0].source.url = "https://example.test/36970/livestream.m3u8"; }, /URL UGA incohérente/));
test("une empreinte source incorrecte est rejetée", () => { const value = manifest(); const sourceHashes = hashes(value); sourceHashes[value.corpus.sources[0].path] = "0".repeat(64); assert.throws(() => validateCorpusManifest(value, { sourceHashes }), /empreinte source différente/); });
test("un passage temporel invalide est rejeté", () => invalid(value => { value.entries[0].analysis.passages[0].endMs = 0; }, /entier >= 1|endMs doit être supérieur/));
test("une langue non autorisée est rejetée", () => invalid(value => { value.entries[0].analysis.languageIds.push("de"); }, /langue non autorisée/));
test("une preuve manquante est rejetée", () => invalid(value => { delete value.entries[0].evidence.analysis.sourceRef; }, /sourceRef/));
test("un faux human-verified est rejeté", () => invalid(value => { value.entries[0].evidence.analysis.validation = "human-verified"; }, /validator/));

test("le plan retrouve 4 correspondances et propose 20 créations", () => { const value = plan(); assert.equal(value.matchedExisting.length, 4); assert.equal(value.createTechnicalMedia.length, 20); });
test("les 20 créations HLS respectent l’enum MariaDB 006", () => { const created = plan().createTechnicalMedia; assert.equal(created.length, 20); assert.ok(created.every(item => item.source.kind === "hls" && item.playable.kind === "hls")); assert.ok(created.every(item => ALLOWED_SOURCE_KINDS.has(item.source.kind))); assert.ok(created.every(item => item.source.kind !== "remote")); });
test("aucun rapprochement flou n’est effectué", () => { const state = snapshot(); state.canonicalVideoLibrary.assets.push(asset("fake", "asset-same-title")); state.canonicalVideoLibrary.assets.at(-1).title = manifest().entries[0].functionalName; const value = plan(state); assert.ok(value.createTechnicalMedia.some(item => item.entryId === "repli4c-video-36970")); });
test("une ambiguïté exacte est bloquante", () => { const state = snapshot(); state.canonicalVideoLibrary.sources.push({ ...state.canonicalVideoLibrary.sources[0], id: "ambiguous", assetId: state.canonicalVideoLibrary.assets[1].id }); assert.ok(plan(state).blockers.some(item => item.code === "AMBIGUOUS_EXACT_IDENTITY")); });
test("une collision d’ID déterministe est bloquante", () => { const state = snapshot(); state.canonicalVideoLibrary.assets.push(asset("collision", "media-proto05-uga-36970")); assert.ok(plan(state).blockers.some(item => item.code === "DETERMINISTIC_ID_COLLISION")); });
test("la description humaine de 36971 est préservée", () => assert.equal(plan().preserveExisting.find(item => item.entryId.endsWith("36971")).snapshot.asset.description, "D'où viens tu ?"));
test("les titres, durées, sources, dérivations et relations existantes sont capturés sans mutation", () => { const before = snapshot(); const copy = clone(before); const value = plan(before); assert.deepEqual(before, copy); assert.ok(value.preserveExisting.some(item => item.snapshot.treatments.length)); assert.ok(value.preserveExisting.every(item => item.snapshot.asset.title)); });
test("l’activité existante de 37004 demeure inchangée", () => { const state = snapshot(); const value = plan(state); assert.deepEqual(value.preserveExisting.find(item => item.entryId.endsWith("37004")).snapshot.activities, state.activities.activities); });
test("aucun enrichissement Qwen n’est une écriture canonique", () => assert.ok(plan().proposedEnrichments.every(item => item.canonicalWrite === false && item.validation === "to-verify")));
test("A et B restent seulement des propositions", () => assert.deepEqual(plan().proposedActivities.map(item => [item.entryId, item.canonicalWrite]), [["repli4c-video-37004", false], ["repli4c-video-36988", false]]));
test("un même snapshot produit le même plan et le même hash", () => { const first = plan(); const second = plan(); assert.equal(canonicalJson(first), canonicalJson(second)); assert.equal(first.planHash, second.planHash); });
test("l’ordre physique du manifeste est sans incidence hors corpusOrder", () => { const reversed = manifest(); reversed.entries.reverse(); assert.equal(plan().planHash, plan(snapshot(), reversed).planHash); });
test("le planificateur pur n’accède ni au réseau ni à MariaDB", () => { const source = fs.readFileSync(path.join(__dirname, "..", "corpus-import-plan.js"), "utf8"); assert.doesNotMatch(source, /node:fs|mysql|fetch\(|https\.request|http\.request/); });
test("la commande produit le plan avec un reader injecté sans écriture", async () => { let reads = 0; const value = await producePlan({ manifestPath, readSnapshot: async () => { reads += 1; return snapshot(); } }); assert.equal(reads, 1); assert.equal(value.createTechnicalMedia.length, 20); });
test("aucun fallback JSON métier n’est introduit", () => { const sources = ["corpus-import-manifest.js", "corpus-import-plan.js", "scripts/corpus-import.js"].map(file => fs.readFileSync(path.join(__dirname, "..", file), "utf8")).join("\n"); assert.doesNotMatch(sources, /activities\.json|video-library\.json|activity-library\.json/); });
test("la commande accepte plan et apply explicites et refuse les commandes inconnues", () => { assert.equal(parseArguments(["apply"]).command, "apply"); assert.throws(() => parseArguments(["unknown"]), /plan ou apply/); assert.equal(parseArguments(["plan"]).outputPath, null); });
test("les deux SHA-256 source réels correspondent au manifeste avant toute lecture métier", () => { const loaded = loadValidatedManifest(manifestPath); assert.deepEqual(loaded.sourceHashes, hashes()); });
