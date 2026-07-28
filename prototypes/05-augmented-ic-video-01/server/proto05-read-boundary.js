"use strict";

const { compareCanonical } = require("./proto05-canonical-compare");

function createProto05ReadBoundary({
  mode,
  jsonAdapter,
  mariadbAdapter = null,
  logger = console
}) {
  if (!jsonAdapter || typeof jsonAdapter.readSnapshot !== "function") {
    throw new TypeError("L’adaptateur JSON doit exposer readSnapshot().");
  }
  if (mode !== "json" && (!mariadbAdapter || typeof mariadbAdapter.readSnapshot !== "function")) {
    throw new TypeError(`Le mode ${mode} exige un adaptateur MariaDB.`);
  }

  return Object.freeze({
    mode,
    async verify() {
      if (mode === "json") return { mode, mariadb: false };
      return mariadbAdapter.verify();
    },
    async readSnapshot(context = {}) {
      if (mode === "json") return jsonAdapter.readSnapshot(context);
      if (mode === "mariadb-readonly") return mariadbAdapter.readSnapshot(context);

      const [jsonSnapshot, mariadbSnapshot] = await Promise.all([
        jsonAdapter.readSnapshot(context),
        mariadbAdapter.readSnapshot(context)
      ]);
      const comparison = compareCanonical(jsonSnapshot, mariadbSnapshot, context);
      if (comparison.total) {
        logger.error(`[compare] ${comparison.operation}: ${comparison.total} divergence(s) sémantique(s).`);
        for (const difference of comparison.differences.slice(0, 20)) {
          logger.error(`[compare] ${difference.path} ${difference.kind} JSON=${difference.json} MariaDB=${difference.mariadb}`);
        }
      } else {
        logger.info?.(`[compare] ${comparison.operation}: 0 divergence sémantique.`);
      }
      return jsonSnapshot;
    },
    async close() {
      await mariadbAdapter?.close?.();
    }
  });
}

module.exports = { createProto05ReadBoundary };
