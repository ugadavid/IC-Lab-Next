"use strict";

const DEFINITELY_UNAVAILABLE = new Set([
  "blocked",
  "missing-local",
  "pending",
  "unreachable-remote"
]);

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} doit être un objet.`);
  }
  return value;
}

function copyDefined(target, source, key) {
  if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
    target[key] = source[key];
  }
}

function playableCanExposeLocator(playable) {
  return !DEFINITELY_UNAVAILABLE.has(playable.availability);
}

function projectActivityVideoSource(playable) {
  const source = { ...requireRecord(playable, "Le playable") };
  if (playableCanExposeLocator(source)) return source;
  for (const key of [
    "embedUrl",
    "manifestUrl",
    "originUrl",
    "proxyUrl",
    "sourceUrl",
    "storageKey",
    "url"
  ]) {
    delete source[key];
  }
  return source;
}

function projectActivityVideo(asset, playable) {
  requireRecord(asset, "L’asset");
  const source = projectActivityVideoSource(playable);
  if (typeof asset.title !== "string" || !asset.title) throw new Error("L’asset doit avoir un titre.");
  if (typeof source.id !== "string" || !source.id) throw new Error("Le playable doit avoir un identifiant.");
  if (typeof source.kind !== "string" || !source.kind) throw new Error("Le playable doit avoir un type.");

  const video = {
    id: source.id,
    title: asset.title,
    kind: source.kind
  };
  copyDefined(video, source, "provider");
  copyDefined(video, source, "durationMs");

  if (source.kind === "youtube-embed") {
    copyDefined(video, source, "videoId");
    copyDefined(video, source, "embedUrl");
    return video;
  }

  if (source.kind === "hls") {
    copyDefined(video, source, "url");
    copyDefined(video, source, "manifestUrl");
    const hlsLocator = source.manifestUrl ?? source.url ?? source.proxyUrl;
    if (hlsLocator !== undefined) video.proxyUrl = hlsLocator;
    return video;
  }

  if (source.kind === "direct-url") {
    copyDefined(video, source, "url");
    return video;
  }

  if (source.kind === "local-file") {
    copyDefined(video, source, "url");
    copyDefined(video, source, "storageKey");
    return video;
  }

  copyDefined(video, source, "url");
  return video;
}

module.exports = {
  DEFINITELY_UNAVAILABLE,
  playableCanExposeLocator,
  projectActivityVideo,
  projectActivityVideoSource
};
