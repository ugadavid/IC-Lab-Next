"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {desktopHandler,origin} = require("../windows/transport.cjs");

test("les requêtes de la fenêtre lisent les plages et passent par le même contrôle d’origine",async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),"atelier-transport-"));
  try {
    const file = path.join(dir,"source.mp4");
    await fs.writeFile(file,"0123456789");
    let picks = 0;
    const service = {open:() => { picks++; return null; },sourceFor:() => ({file}),checkSource:async () => {}};
    const handle = desktopHandler(service);
    const url = origin + "/api/sources/" + "a".repeat(64) + "/media";
    const media = await handle(new Request(url,{headers:{Range:"bytes=2-5"}}));
    assert.equal(media.status,206);
    assert.equal(media.headers.get("Content-Range"),"bytes 2-5/10");
    assert.equal(await media.text(),"2345");
    const head = await handle(new Request(url,{method:"HEAD"}));
    assert.equal(head.body,null);
    assert.equal(head.headers.get("Content-Length"),"10");
    const index = await handle(new Request(origin + "/"));
    assert.match(await index.text(),/id="chooseMedia"/);
    assert.match(index.headers.get("Content-Security-Policy"),/frame-ancestors 'none'/);
    assert.equal(picks,0);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});

test("le sélecteur, la sauvegarde et l’export utilisent l’initiateur Electron même sans en-tête Origin",async () => {
  const calls = [], diagnostics = [];
  const id = "a".repeat(64), version = "b2e49d43-d21e-43cb-b3d8-bed9ca245791";
  const versions = {save:async (key,data) => { calls.push(["sauver",key,data.name]); return {id:key}; },
    read:async key => ({id:key})};
  const handle = desktopHandler({open:async () => { calls.push(["ouvrir"]); return null; },
    sourceFor:() => ({id}),versions:() => versions,
    start:(_source,v,job) => { calls.push(["exporter",v.id,job]); return {status:"starting"}; }},
    entry => diagnostics.push(entry));
  const url = "/api/sources/" + id + "/versions/" + version;
  function write(route,method,body,initiator,headers) {
    const request = new Request(origin + route,{method,headers,body:JSON.stringify(body)});
    if (initiator !== undefined) request.initiatorOrigin = initiator;
    return handle(request);
  }
  const json = {"content-type":"application/json;charset=utf-8"};
  assert.equal((await write("/api/choisir","POST",{},origin,json)).status,200);
  assert.equal(diagnostics.at(-1).origineHTTP,"absente");
  assert.equal((await write(url,"PUT",{name:"Visages seuls"},origin,json)).status,200);
  assert.equal((await write(url + "/export","POST",{requestId:version},origin,{...json,origin})).status,200);
  assert.deepEqual(calls,[["ouvrir"],["sauver",version,"Visages seuls"],["exporter",version,version]]);

  for (const [initiator,headers] of [
    [undefined,{...json,origin}], ["null",{...json,origin}], ["https://ailleurs.invalid",{...json,origin}],
    [origin,{...json,origin:"https://ailleurs.invalid"}], [origin,{...json,origin:"null"}],
    [origin,{...json,"sec-fetch-site":"cross-site"}], [origin,{}],
    [origin,{"content-type":"text/plain"}], [origin,{"content-type":"application/jsonp"}]
  ]) {
    assert.equal((await write("/api/choisir","POST",{},initiator,headers)).status,403);
  }
  const noType = new Request(origin + "/api/choisir",{method:"POST",body:Buffer.from("{}")});
  noType.initiatorOrigin = origin;
  assert.equal(noType.headers.has("content-type"),false);
  assert.equal((await handle(noType)).status,403);
  const foreign = new Request("https://ailleurs.invalid/api/choisir",{method:"POST",headers:json,body:"{}"});
  foreign.initiatorOrigin = origin;
  assert.equal((await handle(foreign)).status,403);
  assert.equal(calls.length,3);
  assert.equal(diagnostics.at(-1).typeJSON,false);
});
