(function initSevenSievesSession(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SevenSievesSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSevenSievesSessionApi() {
  "use strict";

  const FORMAT_VERSION = "0.1";
  const STORAGE_KEY = `seven-sieves.activity.v${FORMAT_VERSION}`;
  const TEACHER_PAGE = "./index-teacher-0.1.html";
  const STUDENT_PAGE = "./index-student-0.1.html";

  function assertLanguageCode(value, label) {
    if (typeof value !== "string" || !/^[a-z]{2,5}$/.test(value)) {
      throw new Error(`${label} invalide.`);
    }
    return value;
  }

  function validateAnalysisPackage(data) {
    if (!data || data.contract_version !== "0.1") {
      throw new Error("Version de contrat d’analyse absente ou incompatible.");
    }
    if (typeof data.text !== "string" || !Array.isArray(data.tokens)) {
      throw new Error("Le paquet d’analyse ne contient pas de texte ou de tokens valides.");
    }
    if (!data.languages || !Array.isArray(data.languages.comparison)) {
      throw new Error("Les langues du paquet d’analyse sont invalides.");
    }
    assertLanguageCode(data.languages.source, "Langue source");
    assertLanguageCode(data.languages.mediation, "Langue de médiation");
    data.languages.comparison.forEach((code) => assertLanguageCode(code, "Langue de comparaison"));
    if (!Array.isArray(data.sieves) || !Array.isArray(data.warnings)) {
      throw new Error("Le paquet d’analyse ne contient pas les tamis ou avertissements attendus.");
    }
    if (data.pedagogical_enrichments !== undefined && !Array.isArray(data.pedagogical_enrichments)) {
      throw new Error("Les aides pédagogiques du paquet sont invalides.");
    }

    let previousEnd = 0;
    data.tokens.forEach((token, position) => {
      if (!token || token.index !== position) {
        throw new Error(`Index de token incohérent à la position ${position}.`);
      }
      if (!Number.isInteger(token.start) || !Number.isInteger(token.end)) {
        throw new Error(`Offsets absents pour le token ${position}.`);
      }
      if (token.start < previousEnd || token.end < token.start || token.end > data.text.length) {
        throw new Error(`Offsets non ordonnés pour le token ${position}.`);
      }
      if (data.text.slice(token.start, token.end) !== token.surface) {
        throw new Error(`Offset UTF-16 incohérent pour le token ${position}.`);
      }
      if (!Array.isArray(token.enrichments)) {
        throw new Error(`Enrichissements invalides pour le token ${position}.`);
      }
      previousEnd = token.end;
    });
    return data;
  }

  function validatePreparation(preparation) {
    if (!preparation || typeof preparation.text !== "string" || !preparation.text.trim()) {
      throw new Error("Le texte préparé est absent.");
    }
    assertLanguageCode(preparation.source_language, "Langue source préparée");
    assertLanguageCode(preparation.mediation_language, "Langue de médiation préparée");
    if (!Array.isArray(preparation.comparison_languages)) {
      throw new Error("Les langues de comparaison préparées sont invalides.");
    }
    preparation.comparison_languages.forEach((code) => assertLanguageCode(code, "Langue de comparaison préparée"));
    return preparation;
  }

  function validateActivity(activity) {
    if (!activity || typeof activity !== "object") throw new Error("Paquet d’activité absent.");
    if (activity.format_version !== FORMAT_VERSION) {
      const error = new Error("Version de paquet d’activité incompatible.");
      error.code = "INCOMPATIBLE_FORMAT";
      throw error;
    }
    const preparation = validatePreparation(activity.preparation);
    const analysis = validateAnalysisPackage(activity.analysis);
    if (analysis.text !== preparation.text) throw new Error("Le texte préparé ne correspond pas à l’analyse.");
    if (analysis.languages.source !== preparation.source_language
      || analysis.languages.mediation !== preparation.mediation_language) {
      throw new Error("Les langues préparées ne correspondent pas à l’analyse.");
    }
    if (typeof activity.prepared_at !== "string" || Number.isNaN(Date.parse(activity.prepared_at))) {
      throw new Error("Date de préparation invalide.");
    }
    return activity;
  }

  function createActivity(preparation, analysis, preparedAt = new Date().toISOString()) {
    return validateActivity({
      format_version: FORMAT_VERSION,
      prepared_at: preparedAt,
      preparation,
      analysis,
    });
  }

  function writeActivity(storage, activity) {
    const validActivity = validateActivity(activity);
    storage.setItem(STORAGE_KEY, JSON.stringify(validActivity));
    return validActivity;
  }

  function readActivity(storage) {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { status: "missing", activity: null };
    try {
      const parsed = JSON.parse(raw);
      return { status: "ok", activity: validateActivity(parsed) };
    } catch (error) {
      return {
        status: error?.code === "INCOMPATIBLE_FORMAT" ? "incompatible" : "invalid",
        activity: null,
      };
    }
  }

  function summarizeAnalysis(analysis) {
    validateAnalysisPackage(analysis);
    const enrichments = analysis.tokens.flatMap((token) => token.enrichments);
    const sieveIds = [...new Set(enrichments.map((item) => item.sieve_id))]
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
    return {
      tokens: analysis.tokens.length,
      enrichments: enrichments.length,
      sieve_ids: sieveIds,
      warnings: analysis.warnings.length,
      pedagogical_enrichments: analysis.pedagogical_enrichments?.length || 0,
    };
  }

  function createExplorationState() {
    return {
      activeSieve: 1,
      inspectedTokenIndex: null,
      hintsVisible: false,
      selectedTokenIndexes: new Set(),
      tokenStatuses: Object.create(null),
      inspect(tokenIndex) {
        this.inspectedTokenIndex = tokenIndex;
      },
      toggleSelection(tokenIndex) {
        if (this.selectedTokenIndexes.has(tokenIndex)) this.selectedTokenIndexes.delete(tokenIndex);
        else this.selectedTokenIndexes.add(tokenIndex);
      },
      setStatus(tokenIndex, status) {
        if (!new Set(["known", "doubt", "unknown"]).has(status)) {
          throw new Error("Statut apprenant invalide.");
        }
        this.tokenStatuses[tokenIndex] = status;
      },
      reset() {
        this.activeSieve = 1;
        this.inspectedTokenIndex = null;
        this.hintsVisible = false;
        this.selectedTokenIndexes.clear();
        Object.keys(this.tokenStatuses).forEach((key) => delete this.tokenStatuses[key]);
      },
    };
  }

  return {
    FORMAT_VERSION,
    STORAGE_KEY,
    TEACHER_PAGE,
    STUDENT_PAGE,
    createActivity,
    createExplorationState,
    readActivity,
    summarizeAnalysis,
    validateActivity,
    validateAnalysisPackage,
    writeActivity,
  };
});
