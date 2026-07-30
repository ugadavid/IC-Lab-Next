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
  if (mode === "mariadb" && typeof mariadbAdapter.appendWorkingCopy !== "function") {
    throw new TypeError("Le mode mariadb exige la mutation ciblée appendWorkingCopy().");
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
    async appendWorkingCopy(snapshot, mutation, context = {}) {
      if (mode === "mariadb") {
        return mariadbAdapter.appendWorkingCopy(snapshot, mutation, context);
      }
      const error = new Error(`Mutation ciblée refusée : le mode ${mode} ne l’expose pas.`);
      error.code = mode === "json"
        ? "PROTO05_JSON_TARGETED_WRITE_REQUIRED"
        : "PROTO05_READONLY_MODE";
      throw error;
    },
    async close() {
      await mariadbAdapter?.close?.();
    }
  });
}

module.exports = { createProto05WriteBoundary };
