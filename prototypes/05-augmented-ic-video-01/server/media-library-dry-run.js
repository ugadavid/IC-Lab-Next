"use strict";

/**
 * Dormant file-based orchestrator for an isolated migration dry run.
 * It never writes a functional Library, catalog, activity file or media file.
 */

const fs = require("fs/promises");
const path = require("path");
const { collectLocalAvailability } = require("./media-library-availability");
const { migrateLegacyMediaLibrary } = require("./media-library-migration");

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

async function assertIsolatedOutputDirectory(outputDirectory, protectedFiles) {
  if (typeof outputDirectory !== "string" || !outputDirectory) throw new Error("Un emplacement de sortie temporaire explicite est obligatoire.");
  const output = path.resolve(outputDirectory);
  for (const protectedFile of protectedFiles.filter(Boolean)) {
    const protectedPath = path.resolve(protectedFile);
    const protectedStat = await fs.stat(protectedPath).catch(() => null);
    const protectedRoot = protectedStat?.isDirectory() ? protectedPath : path.dirname(protectedPath);
    if (samePath(output, protectedPath) || output === protectedRoot || output.startsWith(`${protectedRoot}${path.sep}`)) throw new Error("La sortie temporaire ne peut pas remplacer une source fonctionnelle.");
  }
  try {
    const entries = await fs.readdir(output);
    if (entries.length) throw new Error("Le répertoire de sortie temporaire doit être absent ou vide.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.mkdir(output, { recursive: true });
  return output;
}

async function writeNew(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

async function runMediaLibraryDryRun({ legacyFile, catalogFile, activitiesFile, mediaDirectory, outputDirectory, defaultTimestamp } = {}) {
  if (!legacyFile || !mediaDirectory) throw new Error("legacyFile et mediaDirectory sont obligatoires.");
  const output = await assertIsolatedOutputDirectory(outputDirectory, [legacyFile, catalogFile, activitiesFile, mediaDirectory]);
  const sourceBytesBefore = await fs.readFile(legacyFile);
  const legacyDocument = JSON.parse(sourceBytesBefore.toString("utf8"));
  const catalog = catalogFile ? await readJson(catalogFile) : { videos: [] };
  const activities = activitiesFile ? (await readJson(activitiesFile)).activities || [] : [];
  const storageKeys = [...new Set([
    ...(legacyDocument.playables || []).map(item => item?.storageKey).filter(Boolean),
    ...(legacyDocument.sources || []).map(item => item?.storageKey).filter(Boolean)
  ])];
  const availabilitySnapshot = await collectLocalAvailability({ storageKeys, mediaDirectory });
  const first = migrateLegacyMediaLibrary({ legacyDocument, availabilitySnapshot, options: { defaultTimestamp, legacyCatalog: catalog.videos || [], activities } });
  const second = migrateLegacyMediaLibrary({ legacyDocument, availabilitySnapshot, options: { defaultTimestamp, legacyCatalog: catalog.videos || [], activities } });
  const firstOutput = JSON.stringify(first.output);
  const secondOutput = JSON.stringify(second.output);
  const firstResult = JSON.stringify({ ...first, output: undefined });
  const secondResult = JSON.stringify({ ...second, output: undefined });
  const deterministic = firstOutput === secondOutput && firstResult === secondResult;
  if (first.output) await writeNew(path.join(output, "media-library.canonical.json"), first.output);
  await writeNew(path.join(output, "migration.result.json"), { ...first, output: undefined, dryRunExecuted: true, realMigrationPerformed: false, persistedInFunctionalLocation: false, determinism: { equalOutputs: firstOutput === secondOutput, equalResults: firstResult === secondResult, equal: deterministic } });
  await writeNew(path.join(output, "entity-mappings.json"), first.mappings);
  await writeNew(path.join(output, "activity-reference-mappings.json"), first.activityReferenceMappings);
  const sourceBytesAfter = await fs.readFile(legacyFile);
  const sourceUnchanged = sourceBytesBefore.equals(sourceBytesAfter);
  return { ...first, dryRunExecuted: true, realMigrationPerformed: false, persistedInFunctionalLocation: false, temporaryOutputDirectory: output, sourceUnchanged, determinism: { equalOutputs: firstOutput === secondOutput, equalResults: firstResult === secondResult, equal: deterministic }, availabilitySnapshot, artifactNames: ["media-library.canonical.json", "migration.result.json", "entity-mappings.json", "activity-reference-mappings.json"] };
}

module.exports = { runMediaLibraryDryRun, assertIsolatedOutputDirectory };
