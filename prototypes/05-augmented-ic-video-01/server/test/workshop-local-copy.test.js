"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {createHash} = require("node:crypto");
const {sourceOfWorkingCopy, createCopyVerifier} = require("../workshop-local-copy");
const {publishExclusive} = require("../library-download-finalization");

test("une copie de travail doit conserver la provenance de sa source exacte", () => {
  const source = {assetId:"film", role:"working-copy", origin:{sourcePlayableId:"version-A"}};
  const copy = {assetId:"film", kind:"local-file"};
  assert.equal(sourceOfWorkingCopy(copy, source), "version-A");
  assert.equal(sourceOfWorkingCopy({...copy, assetId:"autre"}, source), null);
  assert.equal(sourceOfWorkingCopy({...copy, role:"derivation-local"}, source), null);
  assert.equal(sourceOfWorkingCopy({...copy, removedAt:"hier"}, source), null);
  assert.equal(sourceOfWorkingCopy(copy, {...source, origin:{}}), null);
});

test("une seule empreinte pour deux ouvertures et nouvelle vérification après remplacement", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ic244-copy-"));
  t.after(() => fs.rm(dir, {recursive:true, force:true}));
  const file = path.join(dir, "source.mp4");
  const digest = value => createHash("sha256").update(value).digest("hex");
  await fs.writeFile(file, "source");
  let reads = 0;
  const options = {
    observe:() => ({state:"present", file, sizeBytes:6}),
    hash:async name => { reads++; return digest(await fs.readFile(name)); },
    probe:() => assert.fail("Une empreinte connue suffit")
  };
  const verify = createCopyVerifier(options);
  const copy = {technicalMetadata:{sizeBytes:6, sha256:digest("source")}};
  assert.ok((await Promise.all([verify(copy), verify(copy)])).every(Boolean));
  assert.equal(reads, 1);
  assert.ok(await createCopyVerifier(options)(copy));
  assert.equal(reads, 2);
  assert.equal(await verify({technicalMetadata:{sizeBytes:8}}), null);
  await fs.rename(file, path.join(dir, "ancien.mp4"));
  assert.equal(await verify(copy), null);
  await fs.writeFile(file, "autres");
  assert.equal(await verify(copy), null);
  assert.equal(reads, 3);
  const legacy = createCopyVerifier({...options, probe:() => false});
  assert.equal(await legacy({}), null);
});

test("une publication exclusive préserve le fichier déjà présent", async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ic244-publish-"));
  t.after(() => fs.rm(dir, {recursive:true, force:true}));
  const source = path.join(dir,"source"), target = path.join(dir,"copie");
  await fs.writeFile(source, "original");
  await publishExclusive(source, target);
  const other = path.join(dir, "autre");
  await fs.writeFile(other, "autre");
  await assert.rejects(publishExclusive(other, target), {code:"EEXIST"});
  assert.equal(await fs.readFile(target,"utf8"), "original");
});
