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
  for (const method of [
    "updateRemotePlayableAvailability",
    "saveAudioAnonymizationPlan",
    "startInlineMediaTreatment",
    "updateMediaTreatment",
    "completeInlineMediaTreatment"
  ]) {
    if (typeof mariadbAdapter[method] !== "function") {
      throw new TypeError(`L’adaptateur MariaDB doit exposer ${method}().`);
    }
  }
  return Object.freeze({
    async writeScopedSnapshot(baseSnapshot, desiredSnapshot, context = {}) {
      return mariadbAdapter.writeScopedSnapshot(baseSnapshot, desiredSnapshot, context);
    },
    async appendWorkingCopy(snapshot, mutation, context = {}) {
      return mariadbAdapter.appendWorkingCopy(snapshot, mutation, context);
    },
    async updateRemotePlayableAvailability(observation) {
      return mariadbAdapter.updateRemotePlayableAvailability(observation);
    },
    async saveAudioAnonymizationPlan(plan) {
      return mariadbAdapter.saveAudioAnonymizationPlan(plan);
    },
    async startInlineMediaTreatment(treatment) {
      return mariadbAdapter.startInlineMediaTreatment(treatment);
    },
    async updateMediaTreatment(treatment) {
      return mariadbAdapter.updateMediaTreatment(treatment);
    },
    async completeInlineMediaTreatment(result) {
      return mariadbAdapter.completeInlineMediaTreatment(result);
    },
    async close() {
      await mariadbAdapter.close?.();
    }
  });
}

module.exports = { createProto05WriteBoundary };
