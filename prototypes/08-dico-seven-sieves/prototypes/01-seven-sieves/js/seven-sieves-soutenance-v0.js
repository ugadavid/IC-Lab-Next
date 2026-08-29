(function initSevenSievesSoutenance(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SevenSievesSoutenance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSevenSievesSoutenanceApi() {
  "use strict";

  const ANALYSIS_URL = "./mock/soutenance-analysis-v0.json";

  function isSoutenanceRequest(search) {
    return new URLSearchParams(search).get("soutenance") === "1";
  }

  function preparationFromAnalysis(analysis) {
    return {
      text: analysis.text,
      source_language: analysis.languages.source,
      mediation_language: analysis.languages.mediation,
      comparison_languages: [...analysis.languages.comparison],
    };
  }

  async function loadActivity({ sessionContract, storage, fetchImpl, now = () => new Date().toISOString() }) {
    sessionContract.invalidateActivity(storage);
    const response = await fetchImpl(ANALYSIS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Paquet de soutenance indisponible (HTTP ${response.status}).`);

    const analysis = await response.json();
    const activity = sessionContract.createActivity(preparationFromAnalysis(analysis), analysis, now());
    sessionContract.writeActivity(storage, activity);
    return activity;
  }

  return { ANALYSIS_URL, isSoutenanceRequest, loadActivity, preparationFromAnalysis };
});
