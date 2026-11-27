"use strict";

const {app,BrowserWindow,dialog,session,shell} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const {createWorkshop} = require("../atelier-local");
const {desktopHandler,origin} = require("./transport.cjs");

const title = "Atelier d’anonymisation";
const root = path.join(process.env.LOCALAPPDATA,"IC-Lab","Anonymiseur");
const profile = path.join(root,"profil-windows");
const lastFile = path.join(profile,"derniere-video.json");
app.setName(title);
app.setAppUserModelId("ICLab.AtelierAnonymisation");
require("node:fs").mkdirSync(profile,{recursive:true});
app.setPath("userData",profile);
let win, workshop, closing = false, canClose = false;

async function chooseVideo() {
  const result = await dialog.showOpenDialog(win,{title:"Ouvrir une vidéo",properties:["openFile"],
    filters:[{name:"Vidéos",extensions:["mp4","m4v","mov","webm"]},{name:"Tous les fichiers",extensions:["*"]}]});
  return result.canceled ? null : result.filePaths[0];
}
async function chooseDestination(name) {
  const result = await dialog.showSaveDialog(win,{title:"Enregistrer le MP4 dans un nouveau fichier",
    defaultPath:name,filters:[{name:"Vidéo MP4",extensions:["mp4"]}]});
  return result.canceled ? null : result.filePath;
}
async function closeWindow(event) {
  if (canClose) return;
  event.preventDefault();
  if (closing) return;
  closing = true;
  try {
    if (workshop.hasActiveExport()) {
      const {response} = await dialog.showMessageBox(win,{type:"question",title,
        message:"Un export MP4 est en cours.",detail:"Gardez la fenêtre ouverte pour le terminer, ou arrêtez le rendu et quittez.",
        buttons:["Continuer l’export","Arrêter et quitter"],defaultId:0,cancelId:0});
      if (response === 0) return;
    }
    // Le même geste que lors d’un changement de page arrête la lecture et enregistre le brouillon.
    if (!win.webContents.isCrashed()) {
      await win.webContents.executeJavaScript('window.dispatchEvent(new Event("pagehide"))');
      win.webContents.session.flushStorageData();
    }
    await workshop.close();
    canClose = true;
    win.close();
  } catch (error) {
    dialog.showErrorBox(title,error.message);
  } finally { closing = false; }
}
async function start() {
  const tools = path.join(process.resourcesPath,"outils");
  const programs = {ffmpeg:path.join(tools,"ffmpeg.exe"),ffprobe:path.join(tools,"ffprobe.exe")};
  await Promise.all(Object.values(programs).map(file => fs.access(file)));
  workshop = createWorkshop({dataDir:path.join(root,"projets"),chooseVideo,chooseDestination,programs});
  const open = workshop.open;
  workshop.open = async () => {
    const result = await open();
    if (result) {
      await fs.writeFile(lastFile + ".tmp",JSON.stringify(workshop.sourceFor(result.id).file),"utf8");
      await fs.rename(lastFile + ".tmp",lastFile);
    }
    return result;
  };
  const ses = session.defaultSession;
  ses.protocol.handle("https",desktopHandler(workshop,details => {
    try {
      const entry = {date:new Date().toISOString(), version:app.getVersion(), ...details};
      require("node:fs").writeFileSync(path.join(profile,"diagnostic-acces.json"),JSON.stringify(entry,null,2),"utf8");
    } catch (error) { console.warn("Diagnostic d’accès",error.message); }
  }));
  ses.setPermissionRequestHandler((_contents,_permission,answer) => answer(false));
  ses.setPermissionCheckHandler(() => false);
  ses.webRequest.onBeforeRequest((details,answer) => {
    const url = new URL(details.url);
    answer({cancel:url.origin !== origin});
  });
  win = new BrowserWindow({title,width:1280,height:840,minWidth:750,minHeight:540,show:false,
    autoHideMenuBar:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,webviewTag:false}});
  win.removeMenu();
  win.webContents.on("will-navigate",(event,url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  win.webContents.setWindowOpenHandler(({url}) => {
    const link = new URL(url);
    const match = /^\/api\/exports\/([a-f0-9-]{36})$/.exec(link.pathname);
    if (link.origin === origin && match) {
      workshop.outputFile(match[1]).then(file => shell.openPath(file)).then(error => {
        if (error) dialog.showErrorBox(title,error);
      }).catch(error => dialog.showErrorBox(title,error.message));
    }
    return {action:"deny"};
  });
  win.on("close",closeWindow);
  win.once("ready-to-show",() => win.show());
  let source;
  try {
    const file = JSON.parse(await fs.readFile(lastFile,"utf8"));
    if (typeof file === "string") source = await workshop.openFile(file);
  } catch (error) {
    if (error.code !== "ENOENT" && error.name !== "AbortError") console.warn("Reprise du média",error.message);
  }
  if (!closing && !canClose) await win.loadURL(origin + "/" + (source ? "?video=" + source.id : ""));
}
if (app.requestSingleInstanceLock()) {
  app.on("second-instance",() => {
    if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  });
  app.on("window-all-closed",() => app.quit());
  app.whenReady().then(start).catch(error => { dialog.showErrorBox(title,error.message); app.quit(); });
} else { app.quit(); }
