"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { assertIsolatedTestDatabase } = require("./helpers/temporary-proto05-server");

const base = {
  PROTO05_MARIADB_HOST: "127.0.0.1",
  PROTO05_MARIADB_PORT: "3306",
  PROTO05_MARIADB_USER: "test",
  PROTO05_MARIADB_PASSWORD: "test"
};

test("les tests mutateurs refusent la base métier", () => {
  assert.throws(
    () => assertIsolatedTestDatabase({ ...base, PROTO05_MARIADB_DATABASE: "ic_augmented_video" }),
    /base dédiée nommée proto05_test_/
  );
});

test("les tests mutateurs acceptent uniquement une base dédiée", () => {
  const configuration = assertIsolatedTestDatabase({ ...base, PROTO05_MARIADB_DATABASE: "proto05_test_m186" });
  assert.equal(configuration.database, "proto05_test_m186");
});
