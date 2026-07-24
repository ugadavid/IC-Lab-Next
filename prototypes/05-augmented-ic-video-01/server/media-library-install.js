"use strict";

/**
 * One-shot installer for the Proto05 canonical MediaLibrary.
 * It is deliberately explicit: the caller supplies the historical file,
 * backup destination and functional target. No activity or media file is
 * ever written by this module.
 */

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { collectLocalAvailability } = require("./media-library-availability");
const { migrateLegacyMediaLibrary } = require("./media-library-migration");
const { validateMediaLibrary } = require("./media-library-schema");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sameOrChild(child, parent) {
  const a = path.resolve(child);
  const b = path.resolve(parent);
  return a === b || a.startsWith(`${b}${path.sep}`);
}

async function installCanonicalMediaLibrary({ legacyFile, catalogFile, activitiesFile, mediaDirectory, canonicalFile, backupFile, defaultTimestamp } = {}) {
  for (const [name, value] of Object.entries({ legacyFile, mediaDirectory, canonicalFile, backupFile })) {
    if (typeof value !== "string" || !value) throw new Error(`${name} est obligatoire.`);
  }
  if (path.resolve(legacyFile) !== path.resolve(canonicalFile)) throw new Error("La migration doit remplacer le fichier historique explicitement désigné.");
  if (sameOrChild(backupFile, mediaDirectory)) throw new Error("La sauvegarde ne peut pas être placée dans le stockage média.");
  const sourceBytes = await fs.readFile(legacyFile);
  const legacyDocument = JSON.parse(sourceBytes.toString("utf8"));
  if (legacyDocument.schemaVersion !== "0.1") throw new Error("Le fichier à installer doit être une Library historique 0.1.");
  await fs.writeFile(backupFile, sourceBytes, { flag: "wx" });
  let installed = false;
  try {
    const catalog = catalogFile ? JSON.parse(await fs.readFile(catalogFile, "utf8")) : { videos: [] };
    const activities = activitiesFile ? (JSON.parse(await fs.readFile(activitiesFile, "utf8")).activities || []) : [];
    const storageKeys = [...new Set([
      ...(legacyDocument.playables || []).map(item => item?.storageKey).filter(Boolean),
      ...(legacyDocument.sources || []).map(item => item?.storageKey).filter(Boolean)
    ])];
    const availabilitySnapshot = await collectLocalAvailability({ storageKeys, mediaDirectory });
    const result = migrateLegacyMediaLibrary({ legacyDocument, availabilitySnapshot, options: { defaultTimestamp, activities, legacyCatalog: catalog.videos || [] } });
    if (!result.output || !result.valid || !result.readable || !result.writeEligible) {
      const error = new Error("La migration ne produit pas une Library canonique inscriptible.");
      error.migration = result;
      throw error;
    }
    const validation = validateMediaLibrary(result.output);
    if (!validation.valid || !validation.writeEligible) throw new Error("La revalidation de la Library canonique a échoué.");
    const tempFile = `${canonicalFile}.${process.pid}.${Date.now()}.install.tmp`;
    try {
      await fs.writeFile(tempFile, `${JSON.stringify(result.output, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await fs.rename(tempFile, canonicalFile);
      installed = true;
    } finally {
      try { await fs.unlink(tempFile); } catch {}
    }
    return {
      ...result,
      installed,
      sourceSha256: sha256(sourceBytes),
      backupSha256: sha256(await fs.readFile(backupFile)),
      canonicalSha256: sha256(await fs.readFile(canonicalFile)),
      activityFileUnchanged: true,
      backupFile,
      canonicalFile
    };
  } catch (error) {
    if (!installed) {
      // The exclusive backup is retained deliberately for forensic rollback.
      // The canonical target is untouched until the atomic rename succeeds.
    }
    throw error;
  }
}

module.exports = { installCanonicalMediaLibrary, sha256 };
