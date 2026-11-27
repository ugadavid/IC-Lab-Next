"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {randomUUID} = require("node:crypto");
const {Readable, Writable} = require("node:stream");
const {createWorkshop} = require("../atelier-local");
const {createHandler} = require("../http-local");

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),"extraction-atelier-"));
  t.after(() => fs.rm(root,{recursive:true,force:true}));
  const file = path.join(root,"source.mp4");
  await fs.writeFile(file,"fixture locale");
  const options = {dataDir:path.join(root,"projets"),chooseVideo:async () => file,chooseDestination:async () => file};
  const atelier = createWorkshop(options);
  const source = await atelier.open();
  const project = {format:"iclab-atelier",version:2,assetId:source.id,playableId:source.id,cursor:1,duration:6,
    zoom:1,leftTime:0,parts:[],selectedId:null,serial:0,step:1,magnet:false,preview:false,looping:false,undo:[],redo:[]};
  return {root,file,source,options,atelier,project};
}

test("reprise des variantes, envoi concurrent idempotent et refus d’écraser la vidéo", async t => {
  const {source,atelier,project,options,file} = await fixture(t);
  const id = randomUUID(), versions = atelier.versions(source.id);
  const draft = {name:"Variante",project};
  const [a,b] = await Promise.all([versions.save(id,draft),versions.save(id,draft)]);
  assert.deepEqual(a,b);
  await assert.rejects(versions.save(id,{...draft,name:"Variante différente"}), {status:409});
  const next = createWorkshop(options);
  assert.equal((await next.open()).id,source.id);
  const [one] = await next.versions(source.id).list();
  assert.equal(one.id,id);
  const version = await versions.read(id);
  const job = next.start(next.sourceFor(source.id),version,randomUUID());
  assert.equal(next.start(next.sourceFor(source.id),version,randomUUID()).id,job.id);
  for (let i=0;i<250 && job.status === "starting";i++) await new Promise(r=>setTimeout(r,10));
  assert.equal(job.status,"failed");
  assert.match(job.error,/existe déjà/);
  assert.equal(await fs.readFile(file,"utf8"),"fixture locale");
  assert.deepEqual(await versions.read(id),version);
  await fs.writeFile(file,"autre source");
  await assert.rejects(next.checkSource(next.sourceFor(source.id)),{status:409});
  assert.notEqual((await next.open()).id,source.id);
  await next.close();
});

test("le lecteur local reçoit les plages d’octets du fichier choisi", async t => {
  const {atelier,source} = await fixture(t);
  const host = "127.0.0.1:8797", handle = createHandler(atelier,"http://" + host);
  async function get(url,headers={}) {
    const req = Object.assign(Readable.from([]),{method:"GET",url,headers:{host,...headers}});
    const chunks=[];
    const res=new Writable({write(block,encoding,done){chunks.push(block);done();}});
    res.writeHead=(status,meta)=>{res.status=status;res.meta=meta;res.headersSent=true;};
    await handle(req,res);
    return {status:res.status,meta:res.meta,text:Buffer.concat(chunks).toString()};
  }
  const url="/api/sources/"+source.id+"/media";
  const range=await get(url,{range:"bytes=1-5"});
  assert.equal(range.status,206);
  assert.equal(range.text,"ixtur");
  assert.equal(range.meta["Content-Range"],"bytes 1-5/14");
  assert.equal((await get(url,{range:"bytes=100-"})).status,416);
  assert.equal((await get(url,{origin:"https://exemple.invalid"})).status,403);
  assert.equal((await get("/")).status,200);
  assert.equal((await get("/",{"sec-fetch-site":"cross-site","sec-fetch-dest":"document"})).status,200);
  assert.match((await get("/workshop-timeline.js")).text,/mountWorkshopTimeline/);
});
