"use strict";

function createProto05ReadBoundary({ mariadbAdapter }) {
  if (!mariadbAdapter || typeof mariadbAdapter.readSnapshot !== "function") {
    throw new TypeError("L’adaptateur MariaDB doit exposer readSnapshot().");
  }
  if (typeof mariadbAdapter.readAudioAnonymizationPlan !== "function") {
    throw new TypeError("L’adaptateur MariaDB doit exposer readAudioAnonymizationPlan().");
  }

  return Object.freeze({
    async verify() {
      return mariadbAdapter.verify();
    },
    async readSnapshot(context = {}) {
      return mariadbAdapter.readSnapshot(context);
    },
    async readAudioAnonymizationPlan(selector) {
      return mariadbAdapter.readAudioAnonymizationPlan(selector);
    },
    async close() {
      await mariadbAdapter.close?.();
    }
  });
}

module.exports = { createProto05ReadBoundary };
