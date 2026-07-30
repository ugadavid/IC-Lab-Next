"use strict";

function createProto05WriteBoundary({
  mariadbAdapter
}) {
  if (!mariadbAdapter || typeof mariadbAdapter.writeScopedSnapshot !== "function") {
    throw new TypeError("L’adaptateur MariaDB doit exposer writeScopedSnapshot().");
  }
  if (typeof mariadbAdapter.appendWorkingCopy !== "function") {
    throw new TypeError("L’adaptateur MariaDB doit exposer appendWorkingCopy().");
  }
  return Object.freeze({
    async writeScopedSnapshot(baseSnapshot, desiredSnapshot, context = {}) {
      return mariadbAdapter.writeScopedSnapshot(baseSnapshot, desiredSnapshot, context);
    },
    async appendWorkingCopy(snapshot, mutation, context = {}) {
      return mariadbAdapter.appendWorkingCopy(snapshot, mutation, context);
    },
    async close() {
      await mariadbAdapter.close?.();
    }
  });
}

module.exports = { createProto05WriteBoundary };
