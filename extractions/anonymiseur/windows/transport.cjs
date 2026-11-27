"use strict";

const {PassThrough, Readable} = require("node:stream");
const {createHandler,isJson} = require("../http-local");

const origin = "https://atelier.invalid";
const policy = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

// Electron intercepte cette origine dans sa propre session. Aucun port en écoute.
function desktopHandler(workshop, recordAccess = () => {}) {
  const handle = createHandler(workshop,origin);
  return function dispatch(request) {
    const url = new URL(request.url);
    if (url.origin !== origin) return new Response(null,{status:403});
    const writing = request.method !== "GET" && request.method !== "HEAD";
    const opening = url.pathname === "/api/choisir" && request.method === "POST";
    const headers = {...Object.fromEntries(request.headers),host:url.host};
    function record(status,control) {
      if (!opening && !(writing && status === 403)) return;
      const classify = value => value == null ? "absente" : value === origin ? "atelier" : "autre";
      recordAccess({action:opening ? "choisir" : request.method === "PUT" ? "variante" : "écriture",
        statut:status, controle:control, initiateur:classify(request.initiatorOrigin),
        origineHTTP:classify(request.headers.get("origin")),
        typeJSON:isJson(headers["content-type"]),
        intersite:headers["sec-fetch-site"] === "cross-site"});
    }
    if (writing) {
      // initiatorOrigin est fourni par le processus natif Electron, hors des en-têtes de la page.
      if (request.initiatorOrigin !== origin) {
        record(403,"initiateur Electron");
        return Response.json({error:"L’application ne reconnaît pas la page à l’origine de cette action."},{status:403});
      }
      if (!request.headers.has("origin")) headers.origin = request.initiatorOrigin;
    }
    const req = request.body ? Readable.fromWeb(request.body) : Readable.from([]);
    req.method = request.method;
    req.url = url.pathname + url.search;
    req.headers = headers;

    return new Promise((resolve,reject) => {
      const res = new PassThrough();
      res.writeHead = (status, headers) => {
        record(status,"gestionnaire local");
        res.headersSent = true;
        const body = req.method === "HEAD" ? null : Readable.toWeb(res);
        if (!body) res.resume();
        resolve(new Response(body,{status,headers:{...headers,"Content-Security-Policy":policy,
          "X-Content-Type-Options":"nosniff"}}));
      };
      const abort = () => { req.destroy(); res.destroy(); };
      request.signal.addEventListener("abort",abort,{once:true});
      res.once("close",() => request.signal.removeEventListener("abort",abort));
      res.on("error",reject);
      if (request.signal.aborted) { abort(); reject(new Error("Requête annulée")); return; }
      handle(req,res).catch(reject);
    });
  };
}
module.exports = {desktopHandler,origin};
