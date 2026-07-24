"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { collectLocalAvailability, isSafeStorageKey, resolveStorageKey } = require("../media-library-availability");

test("le collecteur observe uniquement les clés demandées", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-availability-"));
  await fsp.writeFile(path.join(root, "present.mp4"), "fixture");
  const result = await collectLocalAvailability({ mediaDirectory: root, storageKeys: ["present.mp4", "missing.mp4", "present.mp4"] });
  assert.deepEqual(result, { observations: [{ storageKey: "missing.mp4", status: "absent" }, { storageKey: "present.mp4", status: "present" }] });
  await fsp.rm(root, { recursive: true, force: true });
});

test("les chemins absolus et traversées sont refusés avant toute lecture", () => {
  for (const value of ["/outside.mp4", "C:/outside.mp4", "nested/../outside.mp4", "nested\\outside.mp4", ""]) assert.equal(isSafeStorageKey(value), false);
  assert.throws(() => resolveStorageKey(os.tmpdir(), "../outside.mp4"), /invalide/);
});

test("le collecteur signale une observation contradictoire pour un répertoire", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-availability-"));
  await fsp.mkdir(path.join(root, "not-a-file"));
  const result = await collectLocalAvailability({ mediaDirectory: root, storageKeys: ["not-a-file"] });
  assert.deepEqual(result.observations, [{ storageKey: "not-a-file", status: "contradictory" }]);
  await fsp.rm(root, { recursive: true, force: true });
});

test("le collecteur ne calcule ni hash ni métadonnée média", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-availability-"));
  await fsp.writeFile(path.join(root, "present.mp4"), "fixture");
  const result = await collectLocalAvailability({ mediaDirectory: root, storageKeys: ["present.mp4"] });
  assert.deepEqual(Object.keys(result.observations[0]).sort(), ["status", "storageKey"]);
  assert.equal(fs.existsSync(path.join(root, "present.mp4")), true);
  await fsp.rm(root, { recursive: true, force: true });
});
