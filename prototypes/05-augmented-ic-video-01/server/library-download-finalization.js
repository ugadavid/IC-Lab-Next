"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

function assertContained(target, root, label) {
  const resolvedTarget = path.resolve(target);
  const resolvedRoot = path.resolve(root);
  if (resolvedTarget === resolvedRoot || !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`${label} sort de la racine autorisée.`);
  }
  return { target: resolvedTarget, root: resolvedRoot };
}

async function removeEmptyParents(directory, boundary) {
  const checked = assertContained(directory, boundary, "Le nettoyage");
  let current = checked.target;
  while (current !== checked.root) {
    let removed = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await fs.rmdir(current);
        removed = true;
        break;
      } catch (error) {
        if (error?.code === "ENOENT") {
          removed = true;
          break;
        }
        if (["ENOTEMPTY", "EEXIST"].includes(error?.code)) return;
        if (!["EPERM", "EBUSY"].includes(error?.code) || attempt === 4) throw error;
        await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
      }
    }
    if (!removed) return;
    current = path.dirname(current);
  }
}

async function createDownloadWorkspace(downloadRoot, prefix) {
  const safePrefix = String(prefix || "download").replace(/[^a-z0-9-]/gi, "-").slice(0, 96);
  await fs.mkdir(downloadRoot, { recursive: true });
  return fs.mkdtemp(path.join(downloadRoot, `${safePrefix}-`));
}

async function linkThenUnlinkWithWindowsRetries(source, target, options = {}) {
  const attempts = Number.isInteger(options.attempts) ? options.attempts : 5;
  const delayMs = Number.isInteger(options.delayMs) ? options.delayMs : 40;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fs.link(source, target);
      try {
        await fs.unlink(source);
      } catch (error) {
        await fs.rm(target, { force: true, maxRetries: 5, retryDelay: 40 }).catch(() => {});
        throw error;
      }
      return;
    } catch (error) {
      if (error?.code === "EEXIST") {
        const collision = new Error("Un fichier géré utilise déjà cette destination.");
        collision.code = "EEXIST";
        throw collision;
      }
      if (!["EPERM", "EBUSY"].includes(error?.code) || attempt === attempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
}

async function publishDownloadedFile({
  temporaryPath,
  targetPath,
  workspaceRoot,
  persist,
  move = linkThenUnlinkWithWindowsRetries
}) {
  const checked = assertContained(targetPath, workspaceRoot, "La destination finale");
  const parent = path.dirname(checked.target);
  let published = false;
  try {
    const result = await persist(async () => {
      if (published) throw new Error("La publication finale a déjà été exécutée.");
      await fs.mkdir(parent, { recursive: true });
      await move(temporaryPath, checked.target);
      published = true;
    });
    if (!published) throw new Error("La transaction n’a pas exécuté la publication finale.");
    return result;
  } catch (error) {
    const cleanupErrors = [];
    if (published) {
      try {
        await fs.rm(checked.target, { force: true, maxRetries: 5, retryDelay: 40 });
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") cleanupErrors.push(cleanupError);
      }
    }
    try { await removeEmptyParents(parent, checked.root); } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }
    if (cleanupErrors.length) {
      error.message += ` Nettoyage de publication impossible : ${cleanupErrors.map(item => item.message).join("; ")}`;
    }
    throw error;
  }
}

async function cleanupDownloadWorkspace(workspace, downloadRoot) {
  if (!workspace) return;
  const checked = assertContained(workspace, downloadRoot, "Le dossier temporaire");
  await fs.rm(checked.target, { recursive: true, force: true, maxRetries: 5, retryDelay: 40 });
  await fs.rmdir(checked.root).catch(error => {
    if (!["ENOENT", "ENOTEMPTY", "EEXIST", "EPERM"].includes(error?.code)) throw error;
  });
}

module.exports = {
  cleanupDownloadWorkspace,
  createDownloadWorkspace,
  linkThenUnlinkWithWindowsRetries,
  publishDownloadedFile,
  removeEmptyParents
};
