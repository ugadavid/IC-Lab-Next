"use strict";

(function exposeEntryKeyCanonicalization(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DicoEntryKey = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildEntryKeyCanonicalizationApi() {
  class EntryKeyCanonicalizationError extends Error {
    constructor(message) {
      super(message);
      this.name = "EntryKeyCanonicalizationError";
      this.code = "EMPTY_ENTRY_KEY";
    }
  }

  function canonicalizeEntryKey(value) {
    const canonical = String(value ?? "")
      .toUpperCase()
      .replaceAll("Œ", "OE")
      .replaceAll("Æ", "AE")
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .replace(/[\s'’ʼ\u2010-\u2015-]+/gu, "_")
      .replace(/[^A-Z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!canonical) {
      throw new EntryKeyCanonicalizationError("La clé technique devient vide après canonicalisation.");
    }
    return canonical;
  }

  function findDuplicateCanonicalEntryKeys(proposedValues, existingValues = []) {
    const existing = new Set(existingValues.map(canonicalizeEntryKey));
    const counts = new Map();
    for (const value of proposedValues) {
      try {
        const key = canonicalizeEntryKey(value);
        counts.set(key, (counts.get(key) || 0) + 1);
      } catch {
        // An empty/invalid draft is classified separately as an error.
      }
    }
    return new Set([...counts]
      .filter(([key, count]) => count > 1 || existing.has(key))
      .map(([key]) => key));
  }

  return {
    EntryKeyCanonicalizationError,
    canonicalizeEntryKey,
    findDuplicateCanonicalEntryKeys,
  };
});
