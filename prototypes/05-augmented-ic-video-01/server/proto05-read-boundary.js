"use strict";

function createProto05ReadBoundary({ mariadbAdapter }) {
  if (!mariadbAdapter || typeof mariadbAdapter.readSnapshot !== "function") {
    throw new TypeError("L’adaptateur MariaDB doit exposer readSnapshot().");
  }

  return Object.freeze({
    async verify() {
      return mariadbAdapter.verify();
    },
    async readSnapshot(context = {}) {
      return mariadbAdapter.readSnapshot(context);
    },
    async close() {
      await mariadbAdapter.close?.();
    }
  });
}

module.exports = { createProto05ReadBoundary };
