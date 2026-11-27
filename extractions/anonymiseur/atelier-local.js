"use strict";

const fs = require("node:fs/promises");
const {createReadStream, constants} = require("node:fs");
const {createHash, randomUUID} = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const {renderWorkshopMp4} = require("./moteur/workshop-mp4");
const {versionsOnDisk, failure} = require("./stockage");

function stamp(stat) {
  return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join("/");
}

function createWorkshop({dataDir, chooseVideo, chooseDestination, programs, temporary = os.tmpdir()}) {
  const sources = new Map(), jobs = new Map(), outputs = new Map();
  const active = new Set();
  const session = new AbortController();

  async function open() {
    const file = await chooseVideo(session.signal);
    if (!file) return null;
    return openFile(file);
  }
  async function openFile(file) {
    if (![".mp4",".m4v",".mov",".webm"].includes(path.extname(file).toLowerCase()))
      throw failure(400,"Choisissez une vidéo MP4, M4V, MOV ou WebM.");
    const before = await fs.stat(file,{bigint:true});
    if (!before.isFile() || !before.size) throw failure(400,"Choisissez un fichier vidéo non vide.");
    const hash = createHash("sha256");
    for await (const block of createReadStream(file,{signal:session.signal})) hash.update(block);
    const id = hash.digest("hex");
    const source = {id, file, name:path.basename(file), size:Number(before.size), stamp:stamp(before)};
    await checkSource(source);
    sources.set(id,source);
    return describe(source);
  }
  function describe({id, name, size}) { return {id, name, size}; }
  function sourceFor(id) {
    const source = sources.get(id);
    if (!source) throw failure(404,"Choisissez à nouveau cette vidéo sur votre disque.");
    return source;
  }
  async function checkSource(source) {
    const current = await fs.stat(source.file,{bigint:true}).catch(() => null);
    if (!current || stamp(current) !== source.stamp)
      throw failure(409,"Le fichier source a changé ou a été déplacé. Choisissez-le à nouveau.");
  }
  async function current(sourceId, versionId) {
    const live = jobs.get(sourceId + "/" + versionId);
    if (live) return live.view;
    const saved = await versionsOnDisk(dataDir,sourceId).lastExport(versionId);
    if (!saved) return {status:"idle"};
    outputs.set(saved.id,{file:saved.destination,stamp:saved.stamp});
    try { await outputFile(saved.id); }
    catch { return {status:"unavailable",error:"Le dernier MP4 a été déplacé ou modifié. Vous pouvez exporter à nouveau."}; }
    return {id:saved.id,status:"completed",destination:saved.destination,mediaUrl:"/api/exports/" + saved.id};
  }
  async function run(job, source, version) {
    const view = job.view;
    let workspace;
    try {
      const suggested = (version.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,"_").slice(0,90) || "Montage") + ".mp4";
      const destination = await chooseDestination(suggested, job.abort.signal);
      if (!destination) { view.status = "cancelled"; return; }
      if (path.extname(destination).toLowerCase() !== ".mp4") throw Error("Choisissez un fichier portant l’extension .mp4.");
      const existing = await fs.lstat(destination).catch(error => { if (error.code !== "ENOENT") throw error; });
      if (existing) throw Error("Ce fichier existe déjà. Choisissez un nouveau nom pour l’export.");
      job.abort.signal.throwIfAborted();
      await checkSource(source);
      workspace = await fs.mkdtemp(path.join(temporary,"anonymiseur-rendu-"));
      const output = path.join(workspace,"rendu.mp4");
      let buffer = "";
      view.status = "rendering";
      function progress(chunk) {
        const lines = (buffer + chunk).split(/\r?\n/);
        buffer = lines.pop();
        for (const line of lines) {
          const match = /^out_time_us=(\d+)$/.exec(line);
          if (match) view.progress = Math.min(99, Math.floor(Number(match[1]) / (version.project.duration * 10000)));
        }
      }
      await renderWorkshopMp4({...programs, input:source.file, output, project:version.project,
        signal:job.abort.signal, maxBytes:2 * 1024 ** 3, progress, validating:() => { view.status = "validating"; }});
      await checkSource(source);
      job.abort.signal.throwIfAborted();
      view.status = "publishing";
      await fs.copyFile(output, destination, constants.COPYFILE_EXCL);
      const stat = await fs.stat(destination,{bigint:true});
      const receipt = {id:view.id, versionId:version.id, sourceId:source.id, destination, stamp:stamp(stat),
        createdAt:new Date().toISOString()};
      try { await versionsOnDisk(dataDir,source.id).recordExport(version.id,receipt); }
      catch { throw Error("Le MP4 a été enregistré dans " + destination + ", mais son lien avec la variante n’a pas pu être enregistré."); }
      outputs.set(view.id,{file:destination,stamp:receipt.stamp});
      Object.assign(view,{status:"completed",progress:100,destination,mediaUrl:"/api/exports/" + view.id});
    } catch (error) {
      view.status = "failed";
      view.error = error.code === "EEXIST" ? "Cette destination vient d’être utilisée. Choisissez un nouveau nom." : error.message;
    } finally {
      if (workspace) await fs.rm(workspace,{recursive:true,force:true,maxRetries:4,retryDelay:50});
    }
  }
  function start(source, version, requestId) {
    const key = source.id + "/" + version.id;
    const prior = jobs.get(key);
    if (prior && (active.has(prior) || prior.requestId === requestId)) return prior.view;
    const job = {requestId, abort:new AbortController(), view:{id:randomUUID(),status:"starting",progress:null}};
    jobs.set(key,job);
    active.add(job);
    job.done = run(job,source,version).catch(error => console.error("Nettoyage du rendu", error.message))
      .finally(() => active.delete(job));
    return job.view;
  }
  async function outputFile(id) {
    const result = outputs.get(id);
    if (!result) throw failure(404,"Export introuvable dans cette session.");
    const stat = await fs.stat(result.file,{bigint:true}).catch(() => null);
    if (!stat || stamp(stat) !== result.stamp) throw failure(409,"Le MP4 a été déplacé ou modifié depuis cet export.");
    return result.file;
  }
  async function close() {
    session.abort();
    for (const job of active) job.abort.abort();
    await Promise.allSettled([...active].map(job => job.done));
  }
  return {open, openFile, describe, sourceFor, checkSource, current, start, outputFile, close,
    hasActiveExport:() => active.size > 0,
    versions:id => versionsOnDisk(dataDir,id)};
}
module.exports = {createWorkshop};
