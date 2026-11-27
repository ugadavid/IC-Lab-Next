"use strict";

const fs = require("node:fs/promises");
const {createReadStream} = require("node:fs");
const {pipeline} = require("node:stream/promises");
const path = require("node:path");
const {failure} = require("./stockage");

const types = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".mp4":"video/mp4", ".m4v":"video/mp4", ".mov":"video/quicktime", ".webm":"video/webm"};
const ui = new Set(["index.html","local.js","workshop-project.js","workshop-timeline.js","workshop-timeline.css",
  "workshop-progress.js","workshop-versions.js","workshop-export.js"]);
function json(res,status,body) {
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
  res.end(JSON.stringify(body));
}
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const block of req) {
    size += block.length;
    if (size > 2 * 1024 ** 2) throw failure(413,"Le projet dépasse 2 Mio.");
    chunks.push(block);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw failure(400,"Document JSON invalide."); }
}
async function sendFile(req,res,file) {
  const {size} = await fs.stat(file);
  let start = 0, end = size - 1;
  const headers = {"Content-Type":types[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Accept-Ranges":"bytes","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      start = m[1] ? Number(m[1]) : Math.max(0,size - Number(m[2]));
      end = m[1] && m[2] ? Math.min(end,Number(m[2])) : end;
    }
    if (!m || (!m[1] && !m[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
      res.writeHead(416,{"Content-Range":"bytes */" + size}); res.end(); return;
    }
    headers["Content-Range"] = "bytes " + start + "-" + end + "/" + size;
  }
  res.writeHead(range ? 206 : 200,{...headers,"Content-Length":end-start+1});
  if (req.method === "HEAD" || !size) { res.end(); return; }
  await pipeline(createReadStream(file,{start,end}),res);
}
function createHandler(workshop, origin) {
  const host = new URL(origin).host;
  return async function handle(req,res) {
    try {
      const route = new URL(req.url,origin).pathname;
      const reading = req.method === "GET" || req.method === "HEAD";
      const landing = reading && route === "/" && req.headers["sec-fetch-dest"] === "document";
      if (req.headers.host !== host || (!landing && ((req.headers.origin && req.headers.origin !== origin) ||
          req.headers["sec-fetch-site"] === "cross-site"))) throw failure(403,"Accès local requis.");
      if (!reading && (req.headers.origin !== origin || !req.headers["content-type"]?.startsWith("application/json")))
        throw failure(403,"Ouvrez l’atelier pour effectuer cette action.");
      const name = route === "/" ? "index.html" : route.slice(1);
      if (reading && ui.has(name)) return await sendFile(req,res,path.join(__dirname,"ui",name));
      if (route === "/api/choisir" && req.method === "POST") return json(res,200,{source:await workshop.open()});
      const out = /^\/api\/exports\/([a-f0-9-]{36})$/.exec(route);
      if (out && reading) return await sendFile(req,res,await workshop.outputFile(out[1]));
      const m = /^\/api\/sources\/([a-f0-9]{64})(?:\/(media|versions)(?:\/([a-f0-9-]{36})(\/export)?)?)?$/.exec(route);
      if (!m) throw failure(404,"Ressource locale inconnue.");
      const [,sourceId,section,versionId,exporting] = m;
      const source = workshop.sourceFor(sourceId);
      if (!section && reading) return json(res,200,{source:workshop.describe(source)});
      if (section === "media" && reading && !versionId) {
        await workshop.checkSource(source);
        return await sendFile(req,res,source.file);
      }
      if (section !== "versions") throw failure(405,"Commande indisponible.");
      const versions = workshop.versions(sourceId);
      if (exporting) {
        if (reading) return json(res,200,{job:await workshop.current(sourceId,versionId)});
        if (req.method === "POST") {
          const {requestId} = await body(req);
          if (!/^[0-9a-f-]{36}$/.test(requestId || "")) throw failure(400,"Demande d’export invalide.");
          return json(res,200,{job:workshop.start(source,await versions.read(versionId),requestId)});
        }
      } else if (reading) {
        return json(res,200,versionId ? {version:await versions.read(versionId)} : {versions:await versions.list()});
      } else if (versionId && req.method === "PUT") {
        return json(res,200,{version:await versions.save(versionId,await body(req))});
      }
      throw failure(405,"Commande indisponible.");
    } catch (error) {
      if (!res.headersSent) json(res,error.status || 500,{error:error.message});
      else if (!res.destroyed) res.destroy();
    }
  };
}
module.exports = {createHandler};
