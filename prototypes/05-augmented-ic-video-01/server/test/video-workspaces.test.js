"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { validateMediaLibrary } = require("../media-library-schema");
const { migrateWorkingCopy, projectAssetAccesses } = require("../video-workspaces");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const now = "2026-07-25T12:00:00.000Z";

function accessFixture() {
  const asset = { id: "asset-lineage", title: "Lignée contrôlée" };
  const sources = [
    { id: "source-original", assetId: asset.id, title: "Originale", role: "original-remote", kind: "hls", createdAt: now },
    { id: "source-work", assetId: asset.id, title: "Copie", role: "working-copy", kind: "local-file", createdAt: now },
    { id: "source-published", assetId: asset.id, title: "Publiée", role: "published-remote", kind: "direct-url", createdAt: now },
    { id: "source-legacy", assetId: asset.id, title: "Historique", kind: "direct-url", createdAt: now }
  ];
  const playables = sources.map((source, index) => ({
    id: `playable-${index}`, assetId: asset.id, sourceId: source.id, role: source.role,
    kind: source.kind === "local-file" ? "local-file" : source.kind,
    availability: "available", technicalMetadata: {}, createdAt: now, updatedAt: now
  }));
  const treatments = [
    { id: "derivation-one", derivationId: "derivation-one", label: "Essai 1", sourceAssetId: asset.id, sourcePlayableId: "playable-1", outputPlayableId: "derived-one", status: "completed", createdAt: now, parameters: {} },
    { id: "derivation-two", derivationId: "derivation-two", label: "Essai 2", sourceAssetId: asset.id, sourcePlayableId: "playable-1", outputPlayableId: "derived-two", status: "failed", createdAt: now, parameters: {}, error: { code: "FFMPEG" } }
  ];
  return { asset, sources, playables, treatments };
}

test("la projection distingue les quatre rôles, l’historique et plusieurs dérivations", () => {
  const fixture = accessFixture();
  const result = projectAssetAccesses(fixture.asset, fixture.sources, fixture.playables, fixture.treatments);
  assert.equal(result.originalRemote.length, 1);
  assert.equal(result.workingCopy.length, 1);
  assert.equal(result.publishedRemote.length, 1);
  assert.equal(result.legacy.length, 1);
  assert.deepEqual(result.derivations.map(item => item.derivationId), ["derivation-one", "derivation-two"]);
  assert.equal(result.workingCopy[0].activityEligible, false);
  assert.equal(result.publishedRemote[0].activityEligible, true);
});

test("le schéma refuse les rôles, portées et identifiants de dérivation incohérents", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "media-library-canonical.valid.json"), "utf8"));
  const source = fixture.sources[0];
  const playable = fixture.playables[0];
  source.role = "working-copy";
  playable.role = "working-copy";
  playable.kind = "local-file";
  playable.location = { storageScope: "workspace", storageKey: `${playable.assetId}/source/work.mp4` };
  assert.equal(validateMediaLibrary(fixture).valid, true);
  playable.location.storageScope = "../../escape";
  assert.ok(validateMediaLibrary(fixture).problems.some(problem => problem.code === "INVALID_STORAGE_SCOPE"));
  playable.location.storageScope = "workspace";
  playable.role = "hosted-local";
  assert.ok(validateMediaLibrary(fixture).problems.some(problem => problem.code === "INVALID_BUSINESS_ROLE"));
});

test("la migration d’une copie déplace le fichier, écrit le rôle et refuse les traversées", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-workspace-migration-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const legacy = path.join(root, "legacy");
  const workspaces = path.join(root, "workspaces");
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, "copy.mp4"), "controlled");
  let written = null;
  const result = await migrateWorkingCopy({ assetId: "asset-safe", fileName: "copy.mp4", legacyMediaRoot: legacy, workspaceRoot: workspaces, updateCanonical: async value => { written = value; } });
  assert.deepEqual(written, { role: "working-copy", storageScope: "workspace", storageKey: "asset-safe/source/copy.mp4" });
  assert.equal(fs.existsSync(result.oldPath), false);
  assert.equal(fs.readFileSync(result.newPath, "utf8"), "controlled");
  await assert.rejects(migrateWorkingCopy({ assetId: "../escape", fileName: "copy.mp4", legacyMediaRoot: legacy, workspaceRoot: workspaces, updateCanonical: async () => {} }), /invalide/);
});

test("un échec du writer restaure la copie historique", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-workspace-rollback-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const legacy = path.join(root, "legacy");
  const workspaces = path.join(root, "workspaces");
  fs.mkdirSync(legacy);
  const oldPath = path.join(legacy, "copy.mp4");
  fs.writeFileSync(oldPath, "rollback");
  await assert.rejects(migrateWorkingCopy({ assetId: "asset-safe", fileName: "copy.mp4", legacyMediaRoot: legacy, workspaceRoot: workspaces, updateCanonical: async () => { throw new Error("writer failed"); } }), /writer failed/);
  assert.equal(fs.readFileSync(oldPath, "utf8"), "rollback");
  assert.equal(fs.existsSync(path.join(workspaces, "asset-safe", "source", "copy.mp4")), false);
});

test("la vidéothèque ouvre une fiche dédiée sans détail transitoire dans les cartes", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  assert.match(html, /lineage-summary-button/);
  assert.match(html, /asset-detail-link/);
  assert.match(html, /Voir la fiche détaillée/);
  assert.match(html, /\/teacher\/videos\/\$\{encodeURIComponent\(asset\.id\)\}/);
  assert.doesNotMatch(html, /data-version-details/);
  assert.match(html, /window\.proto05CloseLineagePanel\?\.\(\)/);
  assert.match(html, /window\.proto05CloseUsagePanel\?\.\(\)/);
  assert.match(html, /Créer une copie locale de travail/);
  assert.match(html, /ne remplace aucune vidéo d’activité/);
  assert.doesNotMatch(html, /Copie locale disponible · lecture par défaut/);
});

test("l’échec d’une référence distante reste dans le panneau analysé", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  const remoteFlow = html.slice(
    html.indexOf("let remoteReferenceToken"),
    html.indexOf("function decorateLibraryMetadata")
  );
  const analysisStart = remoteFlow.indexOf("<h4>Analyse terminée</h4>");
  const errorStart = remoteFlow.indexOf('id="remoteReferenceError"', analysisStart);
  const actionsStart = remoteFlow.indexOf('<div class="actions">', errorStart);
  assert.ok(analysisStart >= 0 && errorStart > analysisStart && actionsStart > errorStart);
  assert.equal((remoteFlow.match(/id="remoteReferenceError"/g) || []).length, 1);
  assert.match(remoteFlow, /errorNode\.hidden=true;errorNode\.textContent=''/);
  assert.match(remoteFlow, /setStatus\(''\);errorNode\.textContent='Impossible d’enregistrer cette référence distante\./);
  assert.doesNotMatch(remoteFlow, /catch\(error\)\{button\.disabled=false;setStatus\(error\.message,'error'\)\}/);
});

test("les cartes distinguent les trois disponibilités et revérifient HLS, fichiers locaux et YouTube", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  assert.match(html, /new Intl\.DateTimeFormat\('fr-FR'\)/);
  assert.match(html, /\['hls','direct-url'\]\.includes\(playable\.kind\)/);
  assert.match(html, /playable\.kind==='local-file'&&playable\.storageKey/);
  assert.match(html, /playable\.kind==='youtube-embed'&&playable\.videoId/);
  assert.match(html, /Disponible\$\{checkable&&checkedDate\?` — vérifiée le \$\{checkedDate\}`:''\}/);
  assert.match(html, /Non disponible\$\{checkable&&checkedDate\?` — vérifiée le \$\{checkedDate\}`:''\}/);
  assert.match(html, /Disponibilité non vérifiée/);
  assert.match(html, /status\.checkable\?`<button type="button" class="availability-recheck"/);
  assert.match(html, /if\(button\.disabled\)return;button\.disabled=true/);
  assert.match(html, /status\.textContent='Vérification…'/);
  assert.match(html, /availability-check`,\{method:'POST'\}/);
  assert.match(html, /libraryState\.view==='unavailable'&&status\.className!=='unavailable'/);
  assert.match(html, /statusOf\(asset\)\.className==='unavailable'/);
  assert.doesNotMatch(html, /statusOf\(asset\)\.className!=='available'/);
  assert.match(html, /youtubeSourceUrl=playable=>playable\?\.kind==='youtube-embed'/);
  assert.match(html, /class="youtube-source-link" href="\$\{esc\(youtubeUrl\)\}" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /querySelectorAll\('\.youtube-source-link'\).*event=>event\.stopPropagation\(\)/);
});

test("l’aperçu remplace le visuel de la carte sans ajouter une ligne", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  const modernRenderer = html.slice(html.indexOf("function renderLibrary104"), html.indexOf("async function recheckAvailability"));
  assert.match(modernRenderer, /class="asset-thumb"><div class="asset-visual">/);
  assert.match(modernRenderer, /<div id="preview-\$\{esc\(playable\.id\)\}" class="preview" hidden>/);
  assert.doesNotMatch(modernRenderer, /<\/div><div id="preview-\$\{esc\(playable\?\.id\|\|asset\.id\)\}" class="preview"/);
  assert.match(html, /\.asset-thumb \.asset-visual,\.asset-thumb \.preview,\.asset-thumb \.preview-mount\{width:100%;height:100%\}/);
  assert.match(html, /const closing=state\.previewPlayableId===playableId&&!shell\.hidden/);
  assert.match(html, /querySelectorAll\('\.preview-button,\.local-preview-button'\).*button\.textContent='Aperçu'/);
  assert.match(html, /shell\.parentElement\?\.querySelector\('\.asset-visual'\)\?\.setAttribute\('hidden',''\)/);
  assert.match(html, /button\.textContent='Fermer l’aperçu'/);
  assert.match(html, /state\.previewPlayer\?\.destroy\?\.\(\)/);
  assert.match(html, /await player\.waitUntilReady\(\)/);
  assert.match(html, /localFileState==='missing'/);
  assert.doesNotMatch(html, /button\.onclick=async\(\)=>\{\s*shell\.hidden=false/);
});

test("les suppressions de la vidéothèque utilisent un préflight frais, un If-Match et des retours locaux", () => {
  const cards = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  const detail = fs.readFileSync(path.resolve(__dirname, "../../teacher-video-detail.html"), "utf8");
  const server = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  const cardRemoval = cards.match(/async function removeAsset\(assetId, physical\)[\s\S]*?\n      let openSecondaryMenu=/)?.[0];
  assert.ok(cardRemoval, "le parcours de retrait des cartes doit rester identifiable");
  assert.match(cards, /Vérification des dépendances avant suppression/);
  assert.match(cardRemoval, /await api\(`\/api\/proto05\/library\/assets\/\$\{encodeURIComponent\(assetId\)\}`\)/);
  assert.match(cardRemoval, /await refreshAssetList\(\)/);
  assert.doesNotMatch(cardRemoval, /jsonApi|refreshLibrary/);
  assert.match(cardRemoval, /Éléments concernés/);
  assert.match(cards, /headers:\{'if-match':asset\.deletionRevisionToken\}/);
  assert.match(cards, /assetActionStatusMarkup\(asset\.id\)/);
  assert.match(cards, /setAssetActionStatus\(assetId/);
  assert.doesNotMatch(cardRemoval, /setStatus\(/);
  assert.match(cards, /fileWasAlreadyMissing/);
  assert.match(cards, /other\.audioPlans/);
  assert.match(detail, /asset = \(await api\(`\/api\/proto05\/library\/assets\/\$\{encodeURIComponent\(asset\.id\)\}`\)\)\.asset/);
  assert.match(detail, /Préflight impossible/);
  assert.match(detail, /headers: \{ "if-match": asset\.deletionRevisionToken \}/);
  assert.match(detail, /data-asset-action-status/);
  assert.match(detail, /setActionStatus\("asset"/);
  assert.match(detail, /fileWasAlreadyMissing/);
  assert.match(detail, /other\.audioPlans/);
  assert.match(detail, /await player\.waitUntilReady\(\)/);
  assert.match(server, /\[media-delete\] diagnostic=/);
  assert.match(server, /scope=\$\{context\.scope/);
  assert.match(server, /errno=\$\{Number\(error\?\.databaseErrno\)/);
  assert.match(server, /diagnosticId/);
  assert.match(server, /Le détail a été enregistré dans le journal du serveur/);
  assert.doesNotMatch(server, /communiquez l.identifiant/);
  assert.match(cards, /Dépendances de \$\{esc\(asset\.title\|\|asset\.id\)\}/);
  assert.match(cards, /data-delete-treatment/);
  assert.match(cards, />Effacer<\/button>/);
  assert.match(cards, /usageTrigger\(assetId\)\)openUsagePanel\(assetId,\{pinned:true\}\)/);
  assert.doesNotMatch(cards, /libraryNotice/);
});

test("la suppression d’une dérivation préflight les plans audio dans son cartouche", () => {
  const cards = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  const detail = fs.readFileSync(path.resolve(__dirname, "../../teacher-video-detail.html"), "utf8");
  const server = fs.readFileSync(path.resolve(__dirname, "../server.js"), "utf8");
  const cardFlow = cards.match(/async function removeDerivation\(asset,derivation\)[\s\S]*?\n  }/)?.[0];
  const detailFlow = detail.match(/async function removeDerivation\(id\)[\s\S]*?\n    }/)?.[0];
  assert.ok(cardFlow);
  assert.ok(detailFlow);
  assert.match(cardFlow, /const preflight=await jsonApi\(endpoint\)/);
  assert.match(cardFlow, /headers:\{'if-match':preflight\.deletion\.revisionToken\}/);
  assert.match(cardFlow, /setAssetActionStatus\(asset\.id/);
  assert.doesNotMatch(cardFlow, /setStatus\(/);
  assert.match(detailFlow, /const preflight = await api\(endpoint\)/);
  assert.match(detailFlow, /headers: \{ "if-match": preflight\.deletion\.revisionToken \}/);
  assert.match(detailFlow, /setActionStatus\(entry\.id/);
  assert.doesNotMatch(detailFlow, /setStatus\(/);
  assert.match(server, /async function libraryDerivationDeletionPlan/);
  assert.match(server, /audioPlanDependenciesForPlayables\(\[playable\]\)/);
  assert.match(server, /type: "audio-plans"/);
  assert.match(server, /request\.method === "GET"/);
});

test("les retours d’action de la vidéothèque sont ramenés dans la zone visible", () => {
  const cards = fs.readFileSync(path.resolve(__dirname, "../../teacher-videos.html"), "utf8");
  const detail = fs.readFileSync(path.resolve(__dirname, "../../teacher-video-detail.html"), "utf8");
  assert.match(cards, /if\(message\)node\.scrollIntoView\(\{block:'center'\}\)/);
  assert.match(detail, /if \(message\) status\.scrollIntoView\(\{ block: "center" \}\)/);
});

test("la route détaillée projette un asset et traite proprement un identifiant inconnu", async t => {
  const server = await startTemporaryProto05Server({ schemaVersion: "0.1", activities: [] }, "proto05-video-detail-");
  t.after(() => server.cleanup());
  const list = await fetch(`${server.baseUrl}/api/proto05/library/assets`).then(response => response.json());
  const first = list.assets[0];
  assert.ok(first?.id);
  const page = await fetch(`${server.baseUrl}/teacher/videos/${encodeURIComponent(first.id)}`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /Sources et travail/);
  const detail = await fetch(`${server.baseUrl}/api/proto05/library/assets/${encodeURIComponent(first.id)}`);
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).asset.id, first.id);
  const missing = await fetch(`${server.baseUrl}/api/proto05/library/assets/asset-inconnu-mission-117`);
  assert.equal(missing.status, 404);
});

test("la fiche dédiée conserve les actions par rôle et normalise les dérivations locales", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../teacher-video-detail.html"), "utf8");
  assert.match(
    html,
    /entry\.role\s*===\s*["']derivation-local["']\s*\?\s*\{\s*\.\.\.entry,\s*provider:\s*["']local["']\s*\}\s*:\s*entry/
  );
  assert.match(html, /Anonymiser l’image/);
  assert.match(html, /Anonymiser le son/);
  assert.match(html, /Récupérer sur mon disque/);
  assert.match(html, /Supprimer la tentative/);
  assert.match(html, /Associer à l’activité/);
  assert.match(html, /Ajouter une version publiée/);
  assert.match(html, /data-save-metadata/);
  assert.match(html, /Fiche enregistrée\./);
});
