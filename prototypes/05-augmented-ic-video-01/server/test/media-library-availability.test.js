"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { collectLocalAvailability, isSafeStorageKey, resolveStorageKey } = require("../media-library-availability");
const {
  hashFile,
  inspectLocalMediaAvailability
} = require("../local-media-availability-reconciliation");

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

test("le plan restaure un fichier retrouvé, dégrade un fichier disparu et reste idempotent", async t => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-reconciliation-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const bytes = Buffer.from("media-local-valide");
  await fsp.writeFile(path.join(root, "present.mp4"), bytes);
  const sha256 = await hashFile(path.join(root, "present.mp4"));
  const rows = [
    {
      id: "playable-found", asset_id: "asset-a", source_id: "source-a", kind: "local-file",
      availability: "missing-local", availability_reason: "missing-file",
      storage_scope: "workspace", storage_key: "present.mp4", updated_at: "2026-01-01 00:00:00.000",
      expected_size_bytes: bytes.length, expected_sha256: sha256
    },
    {
      id: "playable-gone", asset_id: "asset-b", source_id: "source-b", kind: "local-file",
      availability: "available", availability_reason: null,
      storage_scope: "workspace", storage_key: "gone.mp4", updated_at: "2026-01-01 00:00:00.000",
      expected_size_bytes: 10, expected_sha256: null
    },
    {
      id: "playable-coherent", asset_id: "asset-c", source_id: "source-c", kind: "local-file",
      availability: "available", availability_reason: null,
      storage_scope: "workspace", storage_key: "present.mp4", updated_at: "2026-01-01 00:00:00.000",
      expected_size_bytes: bytes.length, expected_sha256: sha256
    },
    {
      id: "playable-remote", asset_id: "asset-d", source_id: "source-d", kind: "hls",
      availability: "unknown", availability_reason: null, updated_at: "2026-01-01 00:00:00.000"
    }
  ];
  const first = await inspectLocalMediaAvailability(rows, { roots: { workspace: root } });
  const second = await inspectLocalMediaAvailability(rows, { roots: { workspace: root } });
  assert.equal(first.safeToApply, true);
  assert.equal(first.planHash, second.planHash);
  assert.deepEqual(
    first.changes.map(entry => [entry.id, entry.decision, entry.after.availability]),
    [
      ["playable-found", "restore-available", "available"],
      ["playable-gone", "degrade-to-missing", "missing-local"]
    ]
  );
  assert.equal(first.entries.find(entry => entry.id === "playable-coherent").decision, "no-change");
  assert.equal(first.entries.find(entry => entry.id === "playable-remote").decision, "ignored-non-local");
});

test("les chemins invalides, portées inconnues et fichiers vides ferment le plan", async t => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-reconciliation-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  await fsp.writeFile(path.join(root, "empty.mp4"), Buffer.alloc(0));
  const plan = await inspectLocalMediaAvailability([
    {
      id: "invalid-key", asset_id: "asset-a", source_id: "source-a", kind: "local-file",
      availability: "missing-local", availability_reason: "missing-file",
      storage_scope: "workspace", storage_key: "../outside.mp4", updated_at: "2026-01-01 00:00:00.000"
    },
    {
      id: "unknown-scope", asset_id: "asset-b", source_id: "source-b", kind: "local-file",
      availability: "available", availability_reason: null,
      storage_scope: "external", storage_key: "outside.mp4", updated_at: "2026-01-01 00:00:00.000"
    },
    {
      id: "empty-file", asset_id: "asset-c", source_id: "source-c", kind: "local-file",
      availability: "available", availability_reason: null,
      storage_scope: "workspace", storage_key: "empty.mp4", updated_at: "2026-01-01 00:00:00.000"
    }
  ], { roots: { workspace: root } });
  assert.equal(plan.safeToApply, false);
  assert.deepEqual(
    plan.refusals.map(entry => [entry.id, entry.reason]),
    [
      ["empty-file", "empty-file"],
      ["invalid-key", "invalid-storage-key"],
      ["unknown-scope", "unknown-storage-scope"]
    ]
  );
  assert.equal(plan.changes.length, 0);
});

test("un stockage partagé est observé une fois et produit le même état pour chaque playable", async t => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "proto05-reconciliation-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "shared.mp4");
  await fsp.writeFile(file, "stockage-partagé");
  const expectedSha256 = await hashFile(file);
  let hashCalls = 0;
  const rows = ["a", "b"].map(id => ({
    id: `playable-${id}`, asset_id: `asset-${id}`, source_id: `source-${id}`, kind: "local-file",
    availability: "missing-local", availability_reason: "missing-file",
    storage_scope: "workspace", storage_key: "shared.mp4", updated_at: "2026-01-01 00:00:00.000",
    expected_size_bytes: 17, expected_sha256: expectedSha256
  }));
  const plan = await inspectLocalMediaAvailability(rows, {
    roots: { workspace: root },
    hash: async target => { hashCalls += 1; return hashFile(target); }
  });
  assert.equal(hashCalls, 1);
  assert.equal(plan.safeToApply, true);
  assert.equal(plan.changes.length, 2);
  assert.ok(plan.changes.every(entry => entry.after.availability === "available"));
});
