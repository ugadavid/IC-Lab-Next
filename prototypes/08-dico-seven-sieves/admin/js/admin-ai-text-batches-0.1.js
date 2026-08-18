(function initManualInflectedBatches(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DicoManualInflectedBatches = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createManualInflectedBatchesApi() {
  "use strict";

  const MAX_BATCH_SIZE = 100;
  const DEFAULT_BATCH_SIZE = 30;
  const ALLOWED_BATCH_SIZES = Object.freeze([10, 20, 30, 50, 100]);

  function validateBatchSize(value) {
    const size = Number(value);
    if (!Number.isInteger(size) || !ALLOWED_BATCH_SIZES.includes(size)) {
      throw new RangeError(`Choisissez une taille de lot parmi ${ALLOWED_BATCH_SIZES.join(", ")} formes.`);
    }
    return size;
  }

  function normalizeIdentity(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function formIdentity(language, value) {
    return `${String(language || "").toLowerCase()}\u0000${normalizeIdentity(value)}`;
  }

  function buildInflectedBatchRequest(batch, language, fallbackText = "") {
    const items = Array.isArray(batch) ? batch : [];
    if (items.length > MAX_BATCH_SIZE) {
      throw new RangeError(`Le frontend ne peut pas envoyer plus de ${MAX_BATCH_SIZE} formes.`);
    }
    return {
      items: items.map((item) => ({
        surface_form: item.surface,
        language,
        context: item.contexts?.[0] || String(fallbackText).slice(0, 500),
      })),
    };
  }

  function formatIgnoredProposalWarning(warnings, validCount) {
    const ignored = Array.isArray(warnings) ? warnings : [];
    if (ignored.length === 0) return "";
    const noValidProposal = Number(validCount) === 0
      ? "Aucune proposition exploitable n’a été conservée. "
      : "";
    const unrequestedReasons = new Set([
      "UNREQUESTED_SURFACE",
      "UNREQUESTED_LANGUAGE",
      "UNREQUESTED_COMBINATION",
    ]);
    const onlyUnrequested = ignored.every((warning) => unrequestedReasons.has(warning.reason));
    const surfaces = [...new Set(ignored
      .map((warning) => String(warning.surface_form || "").trim())
      .filter(Boolean))];
    const countLabel = ignored.length === 1
      ? "1 proposition OpenAI a été ignorée"
      : `${ignored.length} propositions OpenAI ont été ignorées`;
    if (onlyUnrequested) {
      return `${noValidProposal}${countLabel} car ${ignored.length === 1 ? "elle ne correspondait" : "elles ne correspondaient"} pas aux formes demandées${surfaces.length ? ` : ${surfaces.join(", ")}` : ""}.`;
    }
    return `${noValidProposal}${countLabel} car ${ignored.length === 1 ? "elle ne respectait" : "elles ne respectaient"} pas le contrat attendu${surfaces.length ? ` : ${surfaces.join(", ")}` : ""}.`;
  }

  class ManualInflectedBatchSession {
    constructor(batchSize = DEFAULT_BATCH_SIZE) {
      this.batchSize = DEFAULT_BATCH_SIZE;
      this.reset([], "");
      this.setBatchSize(batchSize);
    }

    reset(items, language) {
      this.batchSize = DEFAULT_BATCH_SIZE;
      const seen = new Set();
      this.language = String(language || "").toLowerCase();
      this.items = [];
      for (const item of Array.isArray(items) ? items : []) {
        const key = this.reviewItemIdentity(item);
        if (!key.endsWith("\u0000") && !seen.has(key)) {
          seen.add(key);
          this.items.push(item);
        }
      }
      this.examined = new Set();
      this.candidates = [];
      this.successfulBatches = 0;
    }

    setBatchSize(value) {
      this.batchSize = validateBatchSize(value);
      return this.batchSize;
    }

    reviewItemIdentity(item) {
      return formIdentity(this.language, item?.normalized || item?.surface);
    }

    candidateIdentity(candidate) {
      return formIdentity(
        candidate?.language || this.language,
        candidate?.normalized_surface || candidate?.surface_form
      );
    }

    nextBatch() {
      return this.items
        .filter((item) => !this.examined.has(this.reviewItemIdentity(item)))
        .slice(0, this.batchSize);
    }

    completeBatch(batch, candidates) {
      const requested = Array.isArray(batch) ? batch : [];
      if (requested.length > MAX_BATCH_SIZE) {
        throw new RangeError(`Un lot réussi ne peut pas dépasser ${MAX_BATCH_SIZE} formes.`);
      }
      for (const item of requested) this.examined.add(this.reviewItemIdentity(item));

      const existing = new Set(this.candidates.map((candidate) => this.candidateIdentity(candidate)));
      for (const candidate of Array.isArray(candidates) ? candidates : []) {
        const key = this.candidateIdentity(candidate);
        if (!key.endsWith("\u0000") && !existing.has(key)) {
          existing.add(key);
          this.candidates.push(candidate);
        }
      }
      this.successfulBatches += 1;
      return this.progress();
    }

    progress() {
      const total = this.items.length;
      const examined = this.items.reduce(
        (count, item) => count + Number(this.examined.has(this.reviewItemIdentity(item))),
        0
      );
      const remaining = total - examined;
      return {
        total,
        examined,
        remaining,
        nextSize: Math.min(this.batchSize, remaining),
        complete: total > 0 && remaining === 0,
        successfulBatches: this.successfulBatches,
      };
    }
  }

  return {
    ALLOWED_BATCH_SIZES,
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE,
    ManualInflectedBatchSession,
    buildInflectedBatchRequest,
    formIdentity,
    formatIgnoredProposalWarning,
    normalizeIdentity,
    validateBatchSize,
  };
}));
