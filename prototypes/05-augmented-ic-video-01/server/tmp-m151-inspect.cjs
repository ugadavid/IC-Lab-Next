"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const mysql = require("../../00-ic-hub/server/node_modules/mysql2/promise");
const { mariadbConfigurationFromEnvironment } = require("./proto05-data-mode");

const prototypeDirectory = path.resolve(__dirname, "..");
const roots = Object.freeze({
  "legacy-media": path.join(prototypeDirectory, "data", "video-library-media"),
  workspace: path.join(prototypeDirectory, "data", "video-library-workspaces")
});

function resolveLocal(scope, key) {
  if (!Object.hasOwn(roots, scope)) throw new Error(`scope:${scope}`);
  if (typeof key !== "string" || !key || key.startsWith("/") || key.includes("\\") || key.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("invalid-key");
  }
  const root = path.resolve(roots[scope]);
  const target = path.resolve(root, key);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("outside-root");
  return target;
}

async function hashFile(file) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

(async () => {
  const database = await mysql.createConnection({
    ...mariadbConfigurationFromEnvironment(process.env),
    charset: "utf8mb4",
    dateStrings: true
  });
  try {
    const [rows] = await database.query(`SELECT
      mp.id playable_id, mp.asset_id, ma.title asset_title, mp.source_id,
      mp.kind, mp.provider, mp.role, mp.availability, mp.availability_reason,
      mp.storage_scope, mp.storage_key, mp.updated_at,
      mpm.size_bytes expected_size_bytes, mpm.sha256 expected_sha256,
      (SELECT COUNT(*) FROM activity_media_links aml
        WHERE aml.media_asset_id = mp.asset_id OR aml.media_playable_id = mp.id) activity_links,
      (SELECT COUNT(*) FROM media_treatments mt WHERE
        mt.source_asset_id = mp.asset_id OR mt.output_asset_id = mp.asset_id OR
        mt.source_playable_id = mp.id OR mt.output_playable_id = mp.id OR
        mt.published_playable_id = mp.id) treatment_links,
      (SELECT COUNT(*) FROM media_assets child
        WHERE child.parent_asset_id = mp.asset_id AND child.deleted_at IS NULL) derived_assets
      FROM media_playables mp
      JOIN media_assets ma ON ma.id = mp.asset_id AND ma.deleted_at IS NULL
      LEFT JOIN media_playable_metadata mpm ON mpm.playable_id = mp.id
      WHERE mp.removed_at IS NULL AND mp.kind = 'local-file'
      ORDER BY mp.id`);
    const observed = [];
    for (const row of rows) {
      const item = { ...row };
      try {
        const file = resolveLocal(row.storage_scope, row.storage_key);
        const stat = await fsp.stat(file);
        item.observation = stat.isFile() && stat.size > 0 ? "present-file" : stat.isFile() ? "empty-file" : "not-file";
        item.actual_size_bytes = stat.size;
        item.actual_sha256 = stat.isFile() ? await hashFile(file) : null;
        item.size_matches = row.expected_size_bytes === null || Number(row.expected_size_bytes) === stat.size;
        item.sha256_matches = row.expected_sha256 === null || row.expected_sha256 === item.actual_sha256;
      } catch (error) {
        item.observation = ["ENOENT", "ENOTDIR"].includes(error.code) ? "absent" : `refused:${error.message}`;
      }
      observed.push(item);
    }
    const mismatches = observed.filter(item => (
      item.availability === "missing-local" && item.observation === "present-file"
    ) || (
      item.availability === "available" && item.observation !== "present-file"
    ));
    console.log(JSON.stringify({ localCount: observed.length, mismatches, observed }, null, 2));
  } finally {
    await database.end();
  }
})().catch(error => {
  console.error(error.code || error.message, error.sqlMessage || "");
  process.exitCode = 1;
});
