"use strict";

const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {execFile, spawnSync} = require("node:child_process");
const {promisify} = require("node:util");
const {createWorkshop} = require("./atelier-local");
const {createHandler} = require("./http-local");

const exec = promisify(execFile);
function program(name, configured) {
  const suffix = process.platform === "win32" ? ".exe" : "";
  const installed = path.join("C:\\Tools\\FFmpeg\\bin", name + suffix);
  const choices = configured ? [configured] : [...(process.platform === "win32" && fs.existsSync(installed) ? [installed] : []), name + suffix];
  for (const file of choices) {
    const check = spawnSync(file,["-version"],{windowsHide:true,timeout:5000,encoding:"utf8"});
    if (check.status === 0 && check.stdout.startsWith(name + " version ")) return file;
  }
  throw Error(name + " introuvable. Consultez la rubrique Prérequis du README.");
}
function programs() {
  return {ffmpeg:program("ffmpeg",process.env.FFMPEG_PATH),ffprobe:program("ffprobe",process.env.FFPROBE_PATH)};
}
async function dialog(mode, suggested = "", signal) {
  const args = ["-NoProfile","-STA","-File",path.join(__dirname,"choisir.ps1"),mode];
  const options = {windowsHide:true,encoding:"utf8",signal,env:{...process.env,ANONYMISEUR_NOM_MP4:suggested}};
  let result;
  try { result = await exec("pwsh.exe",args,options); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    result = await exec("powershell.exe",args,options);
  }
  return result.stdout || null;
}
function start() {
  const port = 8797, origin = "http://127.0.0.1:" + port;
  const dataDir = path.join(process.env.LOCALAPPDATA || os.homedir(),"IC-Lab","Anonymiseur","projets");
  const workshop = createWorkshop({dataDir,programs:programs(),chooseVideo:signal => dialog("ouvrir","",signal),
    chooseDestination:(name,signal) => dialog("exporter",name,signal)});
  const server = http.createServer(createHandler(workshop,origin));
  server.on("error", error => {
    console.error(error.code === "EADDRINUSE" ? "Le port 8797 est déjà occupé. Si l’atelier est ouvert, retrouvez-le à " + origin : error.message);
    process.exitCode = 1;
  });
  server.listen(port,"127.0.0.1",() => console.log("Atelier autonome 0.1.0 — ouvrez " + origin + "\nCtrl+C pour fermer l’atelier."));
  function stop() {
    server.close();
    void workshop.close().catch(error => console.error(error.message));
  }
  process.once("SIGINT",stop);
  process.once("SIGTERM",stop);
}
if (require.main === module) {
  try { start(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {programs};
