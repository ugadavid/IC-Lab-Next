"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {DatabaseSync} = require("node:sqlite");
const {createMariaDbReadonlyAdapter, READ_TABLES} = require("../proto05-mariadb-readonly");

test("un agrégat par catalogue et une liste des sources avec montages pour la fiche", async t => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec(`CREATE TABLE media_workshop_versions (source_asset_id TEXT, source_playable_id TEXT);
    INSERT INTO media_workshop_versions VALUES ('A','a1'),('A','a1'),('A','a2'),('B','b1');`);
  let queries = 0;
  const connection = {
    async query(sql, args = []) {
      if (sql.startsWith("CALL sp_author_activity_bundle")) return [READ_TABLES.map(() => [])];
      if (/^(SET|START TRANSACTION) /.test(sql)) return [[]];
      queries++;
      return [db.prepare(sql).all(...args)];
    },
    async commit() {}, async rollback() {}, async release() {}
  };
  const mysql = {createPool:() => ({getConnection:async () => connection})};
  const adapter = createMariaDbReadonlyAdapter({config:{}, mysql});
  await adapter.readSnapshot();
  assert.equal(queries, 0);
  const catalogue = await adapter.readSnapshot({includeWorkshopCounts:true});
  assert.deepEqual([...catalogue.workshopCounts], [["A",3],["B",1]]);
  assert.equal(queries, 1);
  const detail = await adapter.readSnapshot({includeWorkshopCounts:"A"});
  assert.deepEqual([...detail.workshopPlayableIds].sort(), ["a1","a2"]);
  assert.equal(queries, 2);
});
