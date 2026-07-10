const { MAX_TEXT_LENGTH, toLookupKey, tokenize } = require("./analysis");
const {
  AdminAiError,
  DICTIONARY_LEMMA_INSTRUCTIONS,
  generateStructuredCandidates,
} = require("./admin-ai-domain");

const MAX_UNKNOWN_WORDS = 100;
const ALL_PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb"];

function extractContext(text, start, end) {
  const sentenceStart = Math.max(
    text.lastIndexOf(".", start - 1),
    text.lastIndexOf("!", start - 1),
    text.lastIndexOf("?", start - 1),
    text.lastIndexOf("\n", start - 1)
  ) + 1;
  const sentenceEnds = [
    text.indexOf(".", end),
    text.indexOf("!", end),
    text.indexOf("?", end),
    text.indexOf("\n", end),
  ].filter((value) => value >= 0);
  const sentenceEnd = sentenceEnds.length ? Math.min(...sentenceEnds) + 1 : text.length;
  return text.slice(sentenceStart, sentenceEnd).trim().slice(0, 500);
}

function validateTextCoverageRequest(body, activeLanguages = []) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminAiError(400, "INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    throw new AdminAiError(400, "INVALID_TEXT", "Le texte ne peut pas être vide.", "text");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new AdminAiError(
      413,
      "TEXT_TOO_LONG",
      `Le texte dépasse la limite de ${MAX_TEXT_LENGTH} unités UTF-16.`,
      "text"
    );
  }
  const sourceLanguage = typeof body.source_language === "string"
    ? body.source_language.trim().toLowerCase()
    : "";
  const activeCodes = new Set(activeLanguages
    .filter((language) => language.is_active !== false)
    .map((language) => language.code));
  if (!sourceLanguage || (activeCodes.size > 0 && !activeCodes.has(sourceLanguage))) {
    throw new AdminAiError(
      400,
      "INVALID_SOURCE_LANGUAGE",
      "Sélectionnez une langue source active.",
      "source_language"
    );
  }

  const words = tokenize(text).filter((token) => token.kind === "word");
  const uniqueWords = new Map();
  for (const word of words) {
    const existing = uniqueWords.get(word.lookup_key);
    const context = extractContext(text, word.start, word.end);
    if (existing) {
      existing.occurrences += 1;
      if (context && !existing.contexts.includes(context) && existing.contexts.length < 2) {
        existing.contexts.push(context);
      }
    }
    else {
      uniqueWords.set(word.lookup_key, {
        surface: word.surface,
        normalized: word.lookup_key,
        occurrences: 1,
        contexts: context ? [context] : [],
      });
    }
  }
  return {
    text,
    sourceLanguage,
    totalWords: words.length,
    uniqueWords: [...uniqueWords.values()],
  };
}

function buildTextCoverage(request, knownRows, inflectedRows = []) {
  const matchesByNormalized = new Map();
  for (const row of knownRows) {
    if (!matchesByNormalized.has(row.normalized_lemma)) {
      matchesByNormalized.set(row.normalized_lemma, []);
    }
    matchesByNormalized.get(row.normalized_lemma).push({
      entry_key: row.entry_key,
      gloss_fr: row.gloss_fr,
      language: row.language,
      lemma: row.lemma,
      part_of_speech: row.part_of_speech,
    });
  }
  const inflectedByNormalized = new Map();
  for (const row of inflectedRows) {
    if (!inflectedByNormalized.has(row.normalized_surface)) {
      inflectedByNormalized.set(row.normalized_surface, []);
    }
    inflectedByNormalized.get(row.normalized_surface).push({
      id: row.id,
      lexical_form_id: row.lexical_form_id,
      entry_key: row.entry_key,
      language: row.language,
      lemma: row.lemma,
      part_of_speech: row.part_of_speech,
      grammatical_number: row.grammatical_number,
      status: row.status,
    });
  }

  const knownForms = [];
  const knownInflectedForms = [];
  const unknownForms = [];
  for (const word of request.uniqueWords) {
    const matches = matchesByNormalized.get(word.normalized);
    if (matches?.length) knownForms.push({ ...word, matches });
    else {
      const inflectedMatches = inflectedByNormalized.get(word.normalized);
      if (inflectedMatches?.length) {
        knownInflectedForms.push({ ...word, matches: inflectedMatches });
      } else {
        unknownForms.push(word);
      }
    }
  }

  return {
    text: request.text,
    source_language: request.sourceLanguage,
    summary: {
      total_words: request.totalWords,
      unique_forms: request.uniqueWords.length,
      known_lemmas: knownForms.length,
      known_inflected_forms: knownInflectedForms.length,
      forms_to_review: unknownForms.length,
      concept_absent: 0,
      known_forms: knownForms.length + knownInflectedForms.length,
      unknown_forms: unknownForms.length,
    },
    known_forms: knownForms,
    known_inflected_forms: knownInflectedForms,
    forms_to_review: unknownForms,
    concept_absent: [],
    unknown_forms: unknownForms,
  };
}

function validateTextCandidateRequest(body, activeLanguages) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminAiError(400, "INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }
  if (!Array.isArray(body.unknown_words) || body.unknown_words.length === 0) {
    throw new AdminAiError(
      400,
      "EMPTY_UNKNOWN_WORDS",
      "Aucune forme inconnue n’est disponible pour la génération.",
      "unknown_words"
    );
  }
  if (body.unknown_words.length > MAX_UNKNOWN_WORDS) {
    throw new AdminAiError(
      400,
      "UNKNOWN_WORD_LIMIT_EXCEEDED",
      `La génération est limitée à ${MAX_UNKNOWN_WORDS} formes inconnues.`,
      "unknown_words"
    );
  }

  const unknownWords = [];
  const seen = new Set();
  for (const value of body.unknown_words) {
    if (typeof value !== "string" || !value.trim()) {
      throw new AdminAiError(400, "INVALID_UNKNOWN_WORD", "Chaque forme inconnue doit être une chaîne non vide.", "unknown_words");
    }
    const surface = value.trim();
    const lookupKey = toLookupKey(surface);
    if (!seen.has(lookupKey)) {
      seen.add(lookupKey);
      unknownWords.push(surface);
    }
  }

  if (!Array.isArray(body.languages) || body.languages.length === 0) {
    throw new AdminAiError(400, "INVALID_LANGUAGES", "Sélectionnez au moins une langue active.", "languages");
  }
  const activeCodes = new Set(activeLanguages.map((language) => language.code));
  const languages = [...new Set(body.languages)];
  if (languages.length !== body.languages.length
      || languages.some((code) => typeof code !== "string" || !activeCodes.has(code))) {
    throw new AdminAiError(400, "INVALID_LANGUAGES", "Les langues doivent être actives et sans doublon.", "languages");
  }

  return {
    unknown_words: unknownWords,
    languages,
    count: unknownWords.length,
    parts_of_speech: ALL_PARTS_OF_SPEECH,
  };
}

function buildTextPrompts(request) {
  return {
    system: [
      "Tu proposes des brouillons lexicaux pour une base d’intercompréhension romane.",
      "Les mots fournis sont absents de la base Dico-IC : ne propose que ces concepts manquants.",
      "Retourne uniquement les données demandées par le schéma JSON.",
      "Chaque entry_key est une clé conceptuelle stable en MAJUSCULES_AVEC_UNDERSCORES.",
      ...DICTIONARY_LEMMA_INSTRUCTIONS,
      "N’ajoute aucune explication hors JSON.",
    ].join(" "),
    user: [
      `Formes absentes à traiter, une proposition par forme : ${request.unknown_words.join(", ")}.`,
      `Langues demandées : ${request.languages.join(", ")}.`,
      "Une forme rencontrée dans le texte peut être fléchie : identifie son lemme dictionnaire avant de proposer les formes multilingues canoniques.",
      "Identifie le concept et la catégorie grammaticale de chaque forme dans un contexte général.",
      "Fournis si possible une forme usuelle dans chaque langue demandée.",
      "Utilise un semantic_domain bref et une glose française utile à la révision humaine.",
    ].join(" "),
  };
}

async function generateTextCandidates(request, options = {}) {
  return generateStructuredCandidates(
    request,
    buildTextPrompts(request),
    "dico_ic_text_candidates",
    options
  );
}

module.exports = {
  MAX_UNKNOWN_WORDS,
  buildTextCoverage,
  buildTextPrompts,
  extractContext,
  generateTextCandidates,
  validateTextCandidateRequest,
  validateTextCoverageRequest,
};
