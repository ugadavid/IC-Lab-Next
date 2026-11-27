"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {validateWorkshopProject} = require("./ui/workshop-project");

const versionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const summary = ({id, name, createdAt}) => ({id, name, createdAt});
const failure = (status, message) => Object.assign(Error(message), {status});

function versionsOnDisk(dataDir, sourceId) {
  if (!/^[a-f0-9]{64}$/.test(sourceId)) throw failure(400,"Identifiant vidéo invalide.");
  const directory = path.join(dataDir, sourceId, "versions");
  function folder(id) {
    if (!versionId.test(id)) throw failure(400,"Identifiant de version invalide.");
    return path.join(directory, id);
  }
  async function read(id) {
    try { return JSON.parse(await fs.readFile(path.join(folder(id),"montage.json"), "utf8")); }
    catch (error) {
      if (error.code === "ENOENT") throw failure(404,"Version de montage introuvable.");
      throw error;
    }
  }
  async function list() {
    let names;
    try { names = await fs.readdir(directory); }
    catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const rows = await Promise.all(names.filter(name => versionId.test(name)).map(read));
    return rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).map(summary);
  }
  async function save(id, payload) {
    const destination = folder(id);
    const name = typeof payload.name === "string" && payload.name.trim();
    if (!name || [...name].length > 191) throw failure(400,"Nom de version invalide.");
    let project;
    try { project = validateWorkshopProject(payload.project, sourceId, sourceId); }
    catch (error) { throw failure(400,error.message); }
    const version = {id, name, createdAt:new Date().toISOString(), project};
    await fs.mkdir(directory,{recursive:true});
    const staging = await fs.mkdtemp(path.join(directory,".envoi-"));
    try {
      await fs.writeFile(path.join(staging,"montage.json"),JSON.stringify(version),"utf8");
      try { await fs.rename(staging, destination); }
      catch (error) {
        if (!["EEXIST","ENOTEMPTY","EPERM","EACCES"].includes(error.code)) throw error;
        const prior = await read(id).catch(() => { throw error; });
        if (prior.name !== name || JSON.stringify(prior.project) !== JSON.stringify(project))
          throw failure(409,"Cette version est déjà enregistrée avec un autre montage.");
        return summary(prior);
      }
      return summary(version);
    } finally { await fs.rm(staging,{recursive:true,force:true}); }
  }
  async function recordExport(id, receipt) {
    const exports = path.join(folder(id),"exports");
    await fs.mkdir(exports,{recursive:true});
    const target = path.join(exports,receipt.id + ".json");
    const staging = await fs.mkdtemp(path.join(exports,".envoi-"));
    try {
      const file = path.join(staging,"sortie.json");
      await fs.writeFile(file,JSON.stringify(receipt),"utf8");
      await fs.rename(file,target);
    } finally { await fs.rm(staging,{recursive:true,force:true}); }
  }
  async function lastExport(id) {
    const exports = path.join(folder(id),"exports");
    let files;
    try { files = await fs.readdir(exports); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
    const receipts = await Promise.all(files.filter(file => file.endsWith(".json") && versionId.test(file.slice(0,-5)))
      .map(async file => JSON.parse(await fs.readFile(path.join(exports,file),"utf8"))));
    return receipts.sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  }
  return {list, read, save, recordExport, lastExport};
}
module.exports = {versionsOnDisk, failure};
