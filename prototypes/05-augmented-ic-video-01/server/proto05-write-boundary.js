"use strict";

function createProto05WriteBoundary({
  mode,
  jsonAdapter,
  mariadbAdapter = null
}) {
  if (!jsonAdapter || typeof jsonAdapter.writeSnapshot !== "function") {
    throw new TypeError("L’adaptateur JSON doit exposer writeSnapshot().");
  }
  if (mode === "mariadb" && (!mariadbAdapter || typeof mariadbAdapter.writeSnapshot !== "function")) {
    throw new TypeError("Le mode mariadb exige un adaptateur d’écriture MariaDB.");
  }
  return Object.freeze({
    mode,
    async writeSnapshot(snapshot, context = {}) {
      if (mode === "json") return jsonAdapter.writeSnapshot(snapshot, context);
      if (mode === "mariadb") return mariadbAdapter.writeSnapshot(snapshot, context);
      const error = new Error(`Mutation refusée : le mode ${mode} est strictement en lecture seule.`);
      error.code = "PROTO05_READONLY_MODE";
      throw error;
    },
    async close() {
      await mariadbAdapter?.close?.();
    }
  });
}

module.exports = { createProto05WriteBoundary };
