"use strict";

const SCHEMA_VERSION = "proto05-corpus-import-manifest/1.0";
const UGA_PREFIX = "https://videos.univ-grenoble-alpes.fr/media/videos/7d74074b07ff1dfc9ed59cdade1a126fc17fed888ca9d26da6e5b2875e8b5120/";
const LANGUAGES = new Set(["es", "fr", "it", "pt"]);
const ORIGINS = new Set(["source-technical", "qwen-asr", "automatic-synthesis", "existing-canonical", "human-entry"]);
const VALIDATIONS = new Set(["machine-observed", "to-verify", "human-verified", "preserve-existing"]);

function fail(path, message) {
  const error = new Error(`${path}: ${message}`);
  error.code = "PROTO05_CORPUS_MANIFEST_INVALID";
  throw error;
}

function object(value, path, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "objet attendu");
  const unknown = Object.keys(value).filter(key => !keys.includes(key));
  if (unknown.length) fail(path, `propriété inconnue ${unknown[0]}`);
  return value;
}

function string(value, path) {
  if (typeof value !== "string" || !value.trim()) fail(path, "chaîne non vide attendue");
  return value;
}

function integer(value, path, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) fail(path, `entier >= ${minimum} attendu`);
  return value;
}

function evidence(value, path) {
  object(value, path, ["origin", "validation", "sourceRef", "validator", "validatedAt", "proof"]);
  if (!ORIGINS.has(value.origin)) fail(`${path}.origin`, "origine inconnue");
  if (!VALIDATIONS.has(value.validation)) fail(`${path}.validation`, "validation inconnue");
  string(value.sourceRef, `${path}.sourceRef`);
  if (value.validation === "human-verified") {
    for (const key of ["validator", "validatedAt", "proof"]) string(value[key], `${path}.${key}`);
  } else if (["validator", "validatedAt", "proof"].some(key => key in value)) {
    fail(path, "les attributs de validation humaine sont réservés à human-verified");
  }
}

function validateEntry(entry, index) {
  const path = `entries[${index}]`;
  object(entry, path, ["entryId", "corpusOrder", "functionalName", "grouping", "externalIdentity", "source", "analysis", "evidence", "notes", "canonicalMatch"]);
  string(entry.entryId, `${path}.entryId`);
  integer(entry.corpusOrder, `${path}.corpusOrder`, 1);
  string(entry.functionalName, `${path}.functionalName`);
  object(entry.grouping, `${path}.grouping`, ["group", "framework", "meeting", "sourceRangeLabel"]);
  string(entry.grouping.group, `${path}.grouping.group`);
  string(entry.grouping.framework, `${path}.grouping.framework`);
  integer(entry.grouping.meeting, `${path}.grouping.meeting`, 1);
  string(entry.grouping.sourceRangeLabel, `${path}.grouping.sourceRangeLabel`);
  object(entry.externalIdentity, `${path}.externalIdentity`, ["provider", "videoId"]);
  if (entry.externalIdentity.provider !== "uga-video") fail(`${path}.externalIdentity.provider`, "provider attendu uga-video");
  if (!/^\d{5}$/.test(entry.externalIdentity.videoId)) fail(`${path}.externalIdentity.videoId`, "ID UGA à cinq chiffres attendu");
  object(entry.source, `${path}.source`, ["kind", "url", "mimeType"]);
  if (entry.source.kind !== "hls") fail(`${path}.source.kind`, "type hls attendu");
  if (entry.source.mimeType !== "application/vnd.apple.mpegurl") fail(`${path}.source.mimeType`, "MIME HLS attendu");
  const expectedUrl = `${UGA_PREFIX}${entry.externalIdentity.videoId}/livestream.m3u8`;
  if (entry.source.url !== expectedUrl) fail(`${path}.source.url`, "URL UGA incohérente avec videoId");
  object(entry.analysis, `${path}.analysis`, ["durationMs", "languageIds", "summary", "pedagogicalInterest", "passages"]);
  integer(entry.analysis.durationMs, `${path}.analysis.durationMs`, 1);
  if (!Array.isArray(entry.analysis.languageIds) || entry.analysis.languageIds.length === 0) fail(`${path}.analysis.languageIds`, "liste non vide attendue");
  for (const [languageIndex, language] of entry.analysis.languageIds.entries()) {
    if (!LANGUAGES.has(language)) fail(`${path}.analysis.languageIds[${languageIndex}]`, "langue non autorisée");
  }
  if (new Set(entry.analysis.languageIds).size !== entry.analysis.languageIds.length) fail(`${path}.analysis.languageIds`, "langues dupliquées");
  string(entry.analysis.summary, `${path}.analysis.summary`);
  string(entry.analysis.pedagogicalInterest, `${path}.analysis.pedagogicalInterest`);
  if (!Array.isArray(entry.analysis.passages)) fail(`${path}.analysis.passages`, "tableau attendu");
  for (const [passageIndex, passage] of entry.analysis.passages.entries()) {
    const passagePath = `${path}.analysis.passages[${passageIndex}]`;
    object(passage, passagePath, ["startMs", "endMs", "purpose"]);
    integer(passage.startMs, `${passagePath}.startMs`);
    integer(passage.endMs, `${passagePath}.endMs`, 1);
    if (passage.endMs <= passage.startMs) fail(passagePath, "endMs doit être supérieur à startMs");
    string(passage.purpose, `${passagePath}.purpose`);
  }
  object(entry.evidence, `${path}.evidence`, ["technical", "analysis"]);
  evidence(entry.evidence.technical, `${path}.evidence.technical`);
  evidence(entry.evidence.analysis, `${path}.evidence.analysis`);
  if (entry.evidence.technical.origin !== "source-technical" || entry.evidence.technical.validation !== "machine-observed") fail(`${path}.evidence.technical`, "preuve technique incohérente");
  if (!["qwen-asr", "automatic-synthesis"].includes(entry.evidence.analysis.origin) || entry.evidence.analysis.validation !== "to-verify") fail(`${path}.evidence.analysis`, "analyse automatique doit rester to-verify");
  if (!Array.isArray(entry.notes) || entry.notes.some(note => typeof note !== "string" || !note.trim())) fail(`${path}.notes`, "tableau de chaînes attendu");
  if (entry.canonicalMatch !== null) {
    object(entry.canonicalMatch, `${path}.canonicalMatch`, ["assetId"]);
    string(entry.canonicalMatch.assetId, `${path}.canonicalMatch.assetId`);
  }
}

function validateActivity(proposal, index, entryIds) {
  const path = `activityProposals[${index}]`;
  object(proposal, path, ["proposalId", "entryId", "title", "range", "summary", "verificationRequirements", "evidence"]);
  string(proposal.proposalId, `${path}.proposalId`);
  if (!entryIds.has(proposal.entryId)) fail(`${path}.entryId`, "entrée corpus inconnue");
  string(proposal.title, `${path}.title`);
  object(proposal.range, `${path}.range`, ["startMs", "endMs"]);
  integer(proposal.range.startMs, `${path}.range.startMs`);
  integer(proposal.range.endMs, `${path}.range.endMs`, 1);
  if (proposal.range.endMs <= proposal.range.startMs) fail(`${path}.range`, "bornes invalides");
  string(proposal.summary, `${path}.summary`);
  if (!Array.isArray(proposal.verificationRequirements) || proposal.verificationRequirements.length === 0) fail(`${path}.verificationRequirements`, "liste non vide attendue");
  proposal.verificationRequirements.forEach((value, itemIndex) => string(value, `${path}.verificationRequirements[${itemIndex}]`));
  evidence(proposal.evidence, `${path}.evidence`);
  if (proposal.evidence.validation !== "to-verify") fail(`${path}.evidence`, "activité automatique doit rester to-verify");
}

function duplicates(values) {
  const seen = new Set();
  return values.find(value => seen.has(value) || !seen.add(value));
}

function validateCorpusManifest(manifest, { sourceHashes = null } = {}) {
  object(manifest, "$", ["schemaVersion", "corpus", "entries", "activityProposals"]);
  if (manifest.schemaVersion !== SCHEMA_VERSION) fail("schemaVersion", `version attendue ${SCHEMA_VERSION}`);
  object(manifest.corpus, "corpus", ["id", "sources"]);
  if (manifest.corpus.id !== "repli4c-24-videos") fail("corpus.id", "identité de corpus inattendue");
  if (!Array.isArray(manifest.corpus.sources) || manifest.corpus.sources.length !== 2) fail("corpus.sources", "exactement deux sources attendues");
  for (const [index, source] of manifest.corpus.sources.entries()) {
    object(source, `corpus.sources[${index}]`, ["path", "sha256", "role"]);
    string(source.path, `corpus.sources[${index}].path`);
    if (!/^[a-f0-9]{64}$/.test(source.sha256)) fail(`corpus.sources[${index}].sha256`, "SHA-256 minuscule attendu");
    if (!["technical-source", "qwen-analysis"].includes(source.role)) fail(`corpus.sources[${index}].role`, "rôle inconnu");
    if (sourceHashes && sourceHashes[source.path] !== source.sha256) fail(`corpus.sources[${index}].sha256`, "empreinte source différente");
  }
  if (new Set(manifest.corpus.sources.map(source => source.role)).size !== 2) fail("corpus.sources", "rôles dupliqués");
  if (!Array.isArray(manifest.entries) || manifest.entries.length !== 24) fail("entries", "exactement 24 entrées attendues");
  manifest.entries.forEach(validateEntry);
  for (const [label, values] of [
    ["entryId", manifest.entries.map(entry => entry.entryId)],
    ["corpusOrder", manifest.entries.map(entry => entry.corpusOrder)],
    ["videoId", manifest.entries.map(entry => entry.externalIdentity.videoId)],
    ["URL", manifest.entries.map(entry => entry.source.url)]
  ]) {
    const duplicate = duplicates(values);
    if (duplicate !== undefined) fail("entries", `${label} dupliqué : ${duplicate}`);
  }
  const orders = [...manifest.entries.map(entry => entry.corpusOrder)].sort((a, b) => a - b);
  if (orders.some((value, index) => value !== index + 1)) fail("entries.corpusOrder", "séquence 1–24 attendue");
  if (!Array.isArray(manifest.activityProposals) || manifest.activityProposals.length !== 2) fail("activityProposals", "exactement deux propositions attendues");
  const entryIds = new Set(manifest.entries.map(entry => entry.entryId));
  manifest.activityProposals.forEach((proposal, index) => validateActivity(proposal, index, entryIds));
  if (duplicates(manifest.activityProposals.map(proposal => proposal.proposalId)) !== undefined) fail("activityProposals", "proposalId dupliqué");
  const activities = new Map(manifest.activityProposals.map(proposal => [proposal.entryId, proposal]));
  if (activities.get("repli4c-video-37004")?.range.startMs !== 456000 || activities.get("repli4c-video-37004")?.range.endMs !== 627000) fail("activityProposals", "activité A incohérente");
  if (activities.get("repli4c-video-36988")?.range.startMs !== 24000 || activities.get("repli4c-video-36988")?.range.endMs !== 135000) fail("activityProposals", "activité B incohérente");
  return manifest;
}

module.exports = { SCHEMA_VERSION, UGA_PREFIX, validateCorpusManifest };
