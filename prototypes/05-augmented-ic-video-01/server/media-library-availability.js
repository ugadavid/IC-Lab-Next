"use strict";

/**
 * Bounded, read-only local availability collector.
 * It examines only the storage keys explicitly supplied by the caller.
 */

const fs = require("fs/promises");
const path = require("path");

function isSafeStorageKey(storageKey) {
  return typeof storageKey === "string" && storageKey.trim() !== "" && !storageKey.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(storageKey) && !storageKey.includes("\\") && !storageKey.split("/").some(part => !part || part === "." || part === "..");
}

function resolveStorageKey(mediaDirectory, storageKey) {
  if (!isSafeStorageKey(storageKey)) throw new Error("Clé de stockage locale invalide.");
  const root = path.resolve(mediaDirectory);
  const candidate = path.resolve(root, storageKey);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) throw new Error("Clé de stockage locale hors périmètre.");
  return candidate;
}

async function collectLocalAvailability({ storageKeys, mediaDirectory } = {}) {
  if (!Array.isArray(storageKeys)) throw new TypeError("storageKeys doit être une liste.");
  if (typeof mediaDirectory !== "string" || !mediaDirectory) throw new TypeError("mediaDirectory est obligatoire.");
  const uniqueKeys = [...new Set(storageKeys)];
  const observations = [];
  for (const storageKey of uniqueKeys.sort()) {
    try {
      const file = resolveStorageKey(mediaDirectory, storageKey);
      const stat = await fs.stat(file);
      observations.push({ storageKey, status: stat.isFile() ? "present" : "contradictory" });
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR") observations.push({ storageKey, status: "absent" });
      else observations.push({ storageKey, status: "unobservable", code: error?.code || "LOCAL_OBSERVATION_FAILED" });
    }
  }
  return { observations };
}

module.exports = { collectLocalAvailability, isSafeStorageKey, resolveStorageKey };
