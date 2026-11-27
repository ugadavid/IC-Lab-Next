"use strict";

const fs = require("node:fs/promises");

function sourceOfWorkingCopy(playable, source) {
  if (playable?.kind !== "local-file" || playable.removedAt || !source ||
      source.assetId !== playable.assetId || (playable.role || source.role) !== "working-copy") {
    return null;
  }
  return playable.provenance?.sourcePlayableId || source.provenance?.sourcePlayableId ||
    source.origin?.sourcePlayableId || null;
}

function createCopyVerifier({observe, hash, probe}) {
  // Deux ouvertures simultanées peuvent partager la lecture de la même empreinte.
  const checked = new Map();
  return async function verified(playable, source) {
    const local = observe(playable, source);
    if (local.state !== "present" || !local.sizeBytes) return null;
    const metadata = playable.technicalMetadata || {};
    const size = metadata.sizeBytes ?? playable.provenance?.sizeBytes;
    if (size != null && Number(size) !== local.sizeBytes) return null;

    const expected = metadata.sha256 || playable.provenance?.sha256 || playable.sha256;
    const stat = await fs.stat(local.file, {bigint:true}).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!stat?.isFile()) return null;
    const stamp = [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs, expected].join("/");
    let entry = checked.get(local.file);
    if (entry?.stamp !== stamp) {
      const valid = expected
        ? hash(local.file).then(value => value.toLowerCase() === String(expected).toLowerCase())
        : Promise.resolve().then(() => probe(local.file)).then(Boolean);
      entry = {stamp, valid};
      checked.set(local.file, entry);
      if (checked.size > 512) checked.delete(checked.keys().next().value);
    }
    try {
      return await entry.valid ? local : null;
    } catch (error) {
      if (checked.get(local.file) === entry) checked.delete(local.file);
      if (error.code === "ENOENT") return null;
      throw error;
    }
  };
}

module.exports = {sourceOfWorkingCopy, createCopyVerifier};
