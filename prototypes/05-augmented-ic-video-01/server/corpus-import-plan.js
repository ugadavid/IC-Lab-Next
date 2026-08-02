"use strict";

const crypto = require("node:crypto");
const { UGA_PREFIX } = require("./corpus-import-manifest");

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function manifestSemanticHash(manifest) {
  return sha256(canonicalJson({
    ...manifest,
    entries: [...manifest.entries].sort((left, right) => left.corpusOrder - right.corpusOrder),
    activityProposals: [...manifest.activityProposals].sort((left, right) => left.proposalId.localeCompare(right.proposalId))
  }));
}

function exactUgaIdentity(url) {
  if (typeof url !== "string") return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" || parsed.hostname !== "videos.univ-grenoble-alpes.fr" || parsed.username || parsed.password || parsed.hash || parsed.search) return null;
  const match = new RegExp(`^${UGA_PREFIX.replace("https://videos.univ-grenoble-alpes.fr", "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d{5})/livestream\\.m3u8$`).exec(parsed.pathname);
  return match ? { provider: "uga-video", videoId: match[1], url: parsed.href } : null;
}

function sourceUrls(source) {
  const origin = source.origin || {};
  return [origin.sourceUrl, origin.originUrl, origin.url, origin.manifestUrl].filter(value => typeof value === "string");
}

function stableAssetView(assetId, library, activities) {
  return {
    asset: library.assets.find(asset => asset.id === assetId),
    sources: library.sources.filter(source => source.assetId === assetId).sort((a, b) => a.id.localeCompare(b.id)),
    playables: library.playables.filter(playable => playable.assetId === assetId).sort((a, b) => a.id.localeCompare(b.id)),
    treatments: library.treatments.filter(item => item.sourceAssetId === assetId || item.outputAssetId === assetId).sort((a, b) => a.id.localeCompare(b.id)),
    activities: activities.filter(activity => activity.videoRef?.assetId === assetId).sort((a, b) => a.id.localeCompare(b.id))
  };
}

function createCorpusImportPlan({ manifest, snapshot, manifestHash, sourceHashes }) {
  const library = snapshot.canonicalVideoLibrary || snapshot.videoLibrary;
  const activities = snapshot.activities?.activities || [];
  const assetsById = new Map(library.assets.map(asset => [asset.id, asset]));
  const candidatesByVideoId = new Map();
  for (const source of library.sources) {
    for (const url of sourceUrls(source)) {
      const identity = exactUgaIdentity(url);
      if (!identity) continue;
      if (!candidatesByVideoId.has(identity.videoId)) candidatesByVideoId.set(identity.videoId, new Set());
      candidatesByVideoId.get(identity.videoId).add(source.assetId);
    }
  }
  for (const playable of library.playables) {
    const identity = exactUgaIdentity(playable.location?.manifestUrl || playable.location?.url);
    if (!identity) continue;
    if (!candidatesByVideoId.has(identity.videoId)) candidatesByVideoId.set(identity.videoId, new Set());
    candidatesByVideoId.get(identity.videoId).add(playable.assetId);
  }

  const matchedExisting = [];
  const createTechnicalMedia = [];
  const preserveExisting = [];
  const conflicts = [];
  const blockers = [];
  for (const entry of [...manifest.entries].sort((a, b) => a.corpusOrder - b.corpusOrder)) {
    const videoId = entry.externalIdentity.videoId;
    const candidates = [...(candidatesByVideoId.get(videoId) || [])].sort();
    if (candidates.length > 1) {
      blockers.push({ code: "AMBIGUOUS_EXACT_IDENTITY", entryId: entry.entryId, videoId, assetIds: candidates });
      continue;
    }
    if (candidates.length === 1) {
      const assetId = candidates[0];
      if (entry.canonicalMatch && entry.canonicalMatch.assetId !== assetId) {
        blockers.push({ code: "KNOWN_MATCH_DIVERGED", entryId: entry.entryId, expectedAssetId: entry.canonicalMatch.assetId, actualAssetId: assetId });
        continue;
      }
      const preserved = stableAssetView(assetId, library, activities);
      matchedExisting.push({ entryId: entry.entryId, videoId, assetId, matchedBy: "exact-uga-url" });
      preserveExisting.push({ entryId: entry.entryId, assetId, snapshot: preserved, snapshotHash: sha256(canonicalJson(preserved)) });
      continue;
    }
    if (entry.canonicalMatch) {
      blockers.push({ code: "KNOWN_MATCH_MISSING", entryId: entry.entryId, expectedAssetId: entry.canonicalMatch.assetId });
      continue;
    }
    const ids = {
      assetId: `media-proto05-uga-${videoId}`,
      sourceId: `source-proto05-uga-${videoId}`,
      playableId: `video-proto05-uga-${videoId}`
    };
    const collisions = [ids.assetId, ids.sourceId, ids.playableId].filter(id => assetsById.has(id) || library.sources.some(source => source.id === id) || library.playables.some(playable => playable.id === id));
    if (collisions.length) {
      blockers.push({ code: "DETERMINISTIC_ID_COLLISION", entryId: entry.entryId, ids: collisions });
      continue;
    }
    createTechnicalMedia.push({
      entryId: entry.entryId,
      corpusOrder: entry.corpusOrder,
      externalIdentity: entry.externalIdentity,
      ids,
      asset: { id: ids.assetId, title: entry.functionalName },
      source: { id: ids.sourceId, assetId: ids.assetId, kind: "remote", provider: "uga-video", transport: "hls", mimeType: entry.source.mimeType, origin: { externalVideoId: videoId, sourceUrl: entry.source.url }, provenance: { corpusId: manifest.corpus.id, entryId: entry.entryId } },
      playable: { id: ids.playableId, assetId: ids.assetId, sourceId: ids.sourceId, kind: "hls", provider: "uga-video", availability: "unknown", location: { manifestUrl: entry.source.url } }
    });
  }

  const proposedEnrichments = [...manifest.entries].sort((a, b) => a.corpusOrder - b.corpusOrder).map(entry => ({
    entryId: entry.entryId,
    validation: "to-verify",
    canonicalWrite: false,
    durationMs: entry.analysis.durationMs,
    languageIds: entry.analysis.languageIds,
    summary: entry.analysis.summary,
    pedagogicalInterest: entry.analysis.pedagogicalInterest,
    passages: entry.analysis.passages,
    notes: entry.notes
  }));
  const proposedActivities = manifest.activityProposals.map(proposal => ({ ...proposal, canonicalWrite: false }));
  const snapshotProjection = { videoLibrary: library, activities };
  const core = {
    schemaVersion: "proto05-corpus-import-plan/1.0",
    corpusId: manifest.corpus.id,
    inputs: { sourceHashes, manifestHash, snapshotHash: sha256(canonicalJson(snapshotProjection)) },
    observedState: {
      assetCount: library.assets.length,
      sourceCount: library.sources.length,
      playableCount: library.playables.length,
      treatmentCount: library.treatments.length,
      activityCount: activities.length
    },
    summary: {
      entryCount: manifest.entries.length,
      matchedExistingCount: matchedExisting.length,
      createTechnicalMediaCount: createTechnicalMedia.length,
      proposedEnrichmentCount: proposedEnrichments.length,
      proposedActivityCount: proposedActivities.length,
      conflictCount: conflicts.length,
      blockerCount: blockers.length
    },
    matchedExisting,
    createTechnicalMedia,
    preserveExisting,
    proposedEnrichments,
    proposedActivities,
    conflicts,
    blockers,
    noOp: matchedExisting.length === manifest.entries.length && createTechnicalMedia.length === 0 && blockers.length === 0
  };
  return { ...core, planHash: sha256(canonicalJson(core)) };
}

module.exports = { canonicalJson, createCorpusImportPlan, exactUgaIdentity, manifestSemanticHash, sha256 };
