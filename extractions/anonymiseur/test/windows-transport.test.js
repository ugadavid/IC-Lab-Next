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
    for (const [site,status] of [["https://ailleurs.invalid",403],[origin,200]]) {
      const response = await handle(new Request(origin + "/api/choisir",{method:"POST",
        headers:{origin:site,"content-type":"application/json"},body:"{}"}));
      assert.equal(response.status,status);
      if (status===200) assert.deepEqual(await response.json(),{source:null});
    }
    assert.equal(picks,1);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
