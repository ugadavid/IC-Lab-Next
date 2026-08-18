const { normalizeClient, toLookupKey } = require("./analysis");
const { canonicalizeEntryKey } = require("../../admin/js/entry-key-canonicalization-0.1.js");

const MAX_FORMS = 20;
const ALLOWED_RELATION_TYPES = new Set([
  "COGNATE_STRONG",
  "COGNATE_WEAK",
  "FALSE_FRIEND",
  "RELATED_FORM",
]);
const ALLOWED_INFLECTED_FORM_STATUSES = new Set([
  "PROPOSED",
  "VALIDATED",
  "REJECTED",
  "ARCHIVED",
]);
const ALLOWED_CONNECTOR_HELP_LANGUAGES = new Set(["es", "fr"]);
const ALLOWED_CONNECTOR_HELP_STATUSES = new Set([
  "PROPOSED",
  "VALIDATED",
  "REJECTED",
  "ARCHIVED",
]);
const DISCOURSE_FUNCTIONS = Object.freeze({
  OPPOSITION: Object.freeze({ label: "Opposition", description: "Introduit un contraste ou une restriction." }),
  CAUSE: Object.freeze({ label: "Cause", description: "Introduit une raison ou une explication." }),
  CONSEQUENCE: Object.freeze({ label: "Conséquence", description: "Introduit un résultat ou une déduction." }),
  ADDITION: Object.freeze({ label: "Addition", description: "Ajoute une information ou un argument." }),
  CHRONOLOGY: Object.freeze({ label: "Chronologie", description: "Signale une étape ou une succession temporelle." }),
});
const ALLOWED_DISCOURSE_FUNCTIONS = new Set(Object.keys(DISCOURSE_FUNCTIONS));

function invalid(code, message, field) {
  return { ok: false, status: 400, code, message, field };
}

function optionalText(value, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

function normalizeConnectorExpression(value) {
  return normalizeClient(String(value).trim().replace(/\s+/gu, " "));
}

function validateAdminConnectorHelp(body, languages) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalid("INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }

  const language = typeof body.language === "string" ? body.language.trim().toLowerCase() : "";
  const available = new Set(languages
    .filter((item) => item.is_active !== false)
    .map((item) => item.code));
  if (!available.has(language) || !ALLOWED_CONNECTOR_HELP_LANGUAGES.has(language)) {
    return {
      ...invalid(
      "UNSUPPORTED_CONNECTOR_LANGUAGE",
      "La langue doit être une langue active parmi es ou fr.",
      "language"
      ),
      status: 422,
    };
  }

  const expression = typeof body.expression === "string"
    ? body.expression.trim().replace(/\s+/gu, " ")
    : "";
  if (!expression || expression.length > 255) {
    return invalid(
      "INVALID_CONNECTOR_EXPRESSION",
      "L’expression est obligatoire et limitée à 255 caractères.",
      "expression"
    );
  }

  const discourseFunction = typeof body.discourse_function === "string"
    ? body.discourse_function.trim().toUpperCase()
    : "";
  if (!ALLOWED_DISCOURSE_FUNCTIONS.has(discourseFunction)) {
    return invalid(
      "INVALID_DISCOURSE_FUNCTION",
      "La fonction discursive n’est pas autorisée.",
      "discourse_function"
    );
  }

  const pedagogicalTitle = optionalText(body.pedagogical_title || "Connecteur logique", 100);
  const pedagogicalHint = optionalText(body.pedagogical_hint, 4000);
  if (!pedagogicalTitle) {
    return invalid("INVALID_PEDAGOGICAL_TITLE", "Le titre pédagogique est invalide.", "pedagogical_title");
  }
  if (!pedagogicalHint) {
    return invalid("INVALID_PEDAGOGICAL_HINT", "L’aide pédagogique est obligatoire.", "pedagogical_hint");
  }

  const example = optionalText(body.example, 2000);
  const caution = optionalText(body.caution, 2000);
  const sourceLabel = optionalText(body.source_label, 100);
  const notes = optionalText(body.notes, 4000);
  if (body.example && example === undefined) {
    return invalid("INVALID_CONNECTOR_EXAMPLE", "L’exemple est invalide.", "example");
  }
  if (body.caution && caution === undefined) {
    return invalid("INVALID_CONNECTOR_CAUTION", "La prudence est invalide.", "caution");
  }
  if (body.source_label && sourceLabel === undefined) {
    return invalid("INVALID_SOURCE_LABEL", "La provenance est invalide.", "source_label");
  }
  if (body.notes && notes === undefined) {
    return invalid("INVALID_CONNECTOR_NOTES", "Les notes sont invalides.", "notes");
  }

  const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : "PROPOSED";
  if (!ALLOWED_CONNECTOR_HELP_STATUSES.has(status)) {
    return invalid(
      "INVALID_CONNECTOR_HELP_STATUS",
      "Le statut doit valoir PROPOSED, VALIDATED, REJECTED ou ARCHIVED.",
      "status"
    );
  }

  let lexicalEntryKey = null;
  if (body.lexical_entry_key !== undefined && body.lexical_entry_key !== null && body.lexical_entry_key !== "") {
    lexicalEntryKey = typeof body.lexical_entry_key === "string"
      ? body.lexical_entry_key.trim().toUpperCase()
      : "";
    if (!/^[A-Z][A-Z0-9_]{2,99}$/.test(lexicalEntryKey)) {
      return invalid("INVALID_ENTRY_KEY", "La clé lexicale facultative est invalide.", "lexical_entry_key");
    }
  }

  return {
    ok: true,
    value: {
      language,
      lexical_entry_key: lexicalEntryKey,
      expression,
      normalized_expression: normalizeConnectorExpression(expression),
      discourse_function: discourseFunction,
      pedagogical_title: pedagogicalTitle,
      pedagogical_hint: pedagogicalHint,
      example,
      caution,
      status,
      source_label: sourceLabel || "manual_admin_v0",
      notes,
    },
  };
}

function validateAdminLexicalEntry(body, languages) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalid("INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }

  let entryKey = "";
  if (typeof body.entry_key === "string") {
    try {
      entryKey = canonicalizeEntryKey(body.entry_key);
    } catch {
      entryKey = "";
    }
  }
  if (!/^[A-Z][A-Z0-9_]{2,99}$/.test(entryKey)) {
    return invalid(
      "INVALID_ENTRY_KEY",
      "entry_key doit contenir 3 à 100 caractères majuscules, chiffres ou underscores.",
      "entry_key"
    );
  }

  const glossFr = optionalText(body.gloss_fr, 1000);
  if (!glossFr) {
    return invalid("INVALID_GLOSS", "gloss_fr est obligatoire.", "gloss_fr");
  }
  const glossEn = optionalText(body.gloss_en, 1000);
  if (body.gloss_en && glossEn === undefined) {
    return invalid("INVALID_GLOSS", "gloss_en doit être une chaîne valide.", "gloss_en");
  }
  const semanticDomain = optionalText(body.semantic_domain, 100);
  if (body.semantic_domain && semanticDomain === undefined) {
    return invalid(
      "INVALID_SEMANTIC_DOMAIN",
      "semantic_domain ne doit pas dépasser 100 caractères.",
      "semantic_domain"
    );
  }

  if (!Array.isArray(body.forms) || body.forms.length === 0 || body.forms.length > MAX_FORMS) {
    return invalid(
      "INVALID_FORMS",
      `forms doit contenir entre 1 et ${MAX_FORMS} formes.`,
      "forms"
    );
  }

  const languageCodes = new Set(languages.map((language) => language.code));
  const forms = [];
  const seenForms = new Set();
  for (let index = 0; index < body.forms.length; index += 1) {
    const form = body.forms[index];
    if (!form || typeof form !== "object" || Array.isArray(form)) {
      return invalid("INVALID_FORM", `La forme ${index + 1} est invalide.`, `forms[${index}]`);
    }
    if (typeof form.language !== "string" || !languageCodes.has(form.language)) {
      return invalid(
        "INVALID_LANGUAGE",
        `La langue de la forme ${index + 1} n’est pas disponible.`,
        `forms[${index}].language`
      );
    }
    const lemma = typeof form.lemma === "string" ? form.lemma.trim() : "";
    if (!lemma || lemma.length > 255) {
      return invalid(
        "INVALID_LEMMA",
        `Le lemme de la forme ${index + 1} est obligatoire et limité à 255 caractères.`,
        `forms[${index}].lemma`
      );
    }
    const partOfSpeech = optionalText(form.part_of_speech, 20);
    if (!partOfSpeech) {
      return invalid(
        "INVALID_PART_OF_SPEECH",
        `La catégorie grammaticale de la forme ${index + 1} est obligatoire.`,
        `forms[${index}].part_of_speech`
      );
    }

    const duplicateKey = `${form.language}\u0000${toLookupKey(lemma)}\u0000${partOfSpeech.toLowerCase()}`;
    if (seenForms.has(duplicateKey)) {
      return invalid(
        "DUPLICATE_FORM",
        `La forme ${lemma} (${form.language}) est répétée dans la requête.`,
        "forms"
      );
    }
    seenForms.add(duplicateKey);
    forms.push({
      language: form.language,
      lemma,
      normalized_lemma: toLookupKey(lemma),
      part_of_speech: partOfSpeech.toLowerCase(),
      confidence_score: 1,
      notes: "Ajout manuel via Dico-IC Admin V0.",
    });
  }

  return {
    ok: true,
    value: {
      entry_key: entryKey,
      gloss_fr: glossFr,
      gloss_en: glossEn,
      semantic_domain: semanticDomain,
      notes: "Ajout manuel via Dico-IC Admin V0.",
      forms,
    },
  };
}

function validateAdminLexicalEntryUpdate(body, entryKey, languages) {
  let canonicalEntryKey = "";
  try {
    canonicalEntryKey = canonicalizeEntryKey(entryKey);
  } catch {
    canonicalEntryKey = "";
  }
  if (!/^[A-Z][A-Z0-9_]{2,99}$/.test(canonicalEntryKey)) {
    return invalid("INVALID_ENTRY_KEY", "La clé d’entrée demandée est invalide.", "entry_key");
  }
  if (body?.entry_key) {
    let bodyEntryKey = "";
    try {
      bodyEntryKey = canonicalizeEntryKey(body.entry_key);
    } catch {
      bodyEntryKey = "";
    }
    if (bodyEntryKey !== canonicalEntryKey) {
      return invalid("ENTRY_KEY_IMMUTABLE", "entry_key ne peut pas être modifié dans cette V0.", "entry_key");
    }
  }
  if (!Array.isArray(body?.forms)) {
    return invalid("INVALID_FORMS", "forms doit contenir les formes existantes.", "forms");
  }

  const formIds = [];
  const seenIds = new Set();
  for (let index = 0; index < body.forms.length; index += 1) {
    const form = body.forms[index];
    if (!Object.prototype.hasOwnProperty.call(form || {}, "id")) {
      formIds.push(null);
      continue;
    }
    const id = Number(form.id);
    if (!Number.isSafeInteger(id) || id < 1 || seenIds.has(id)) {
      return invalid(
        "INVALID_FORM_ID",
        `L’identifiant de la forme ${index + 1} est invalide ou répété.`,
        `forms[${index}].id`
      );
    }
    seenIds.add(id);
    formIds.push(id);
  }

  const result = validateAdminLexicalEntry({ ...body, entry_key: canonicalEntryKey }, languages);
  if (!result.ok) return result;
  result.value.notes = "Modification manuelle via Dico-IC Admin V0.";
  result.value.forms = result.value.forms.map((form, index) => {
    const id = formIds[index];
    return {
      ...form,
      ...(id === null ? {} : { id }),
      notes: id === null
        ? "Ajout manuel via Dico-IC Admin V0."
        : "Modification manuelle via Dico-IC Admin V0.",
    };
  });
  return result;
}

function validateAdminFormRelation(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalid("INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }

  const sourceFormId = Number(body.source_form_id);
  const targetFormId = Number(body.target_form_id);
  if (!Number.isSafeInteger(sourceFormId) || sourceFormId < 1) {
    return invalid("INVALID_SOURCE_FORM", "La forme source est invalide.", "source_form_id");
  }
  if (!Number.isSafeInteger(targetFormId) || targetFormId < 1) {
    return invalid("INVALID_TARGET_FORM", "La forme cible est invalide.", "target_form_id");
  }
  if (sourceFormId === targetFormId) {
    return invalid("SAME_FORM_RELATION", "Une forme ne peut pas être reliée à elle-même.", "target_form_id");
  }

  const relationType = typeof body.relation_type === "string"
    ? body.relation_type.trim().toUpperCase()
    : "";
  if (!ALLOWED_RELATION_TYPES.has(relationType)) {
    return invalid("INVALID_RELATION_TYPE", "Le type de relation n’est pas autorisé.", "relation_type");
  }

  const score = Number(body.score);
  if (body.score === "" || body.score === null || body.score === undefined
      || !Number.isFinite(score) || score < 0 || score > 1) {
    return invalid("INVALID_RELATION_SCORE", "Le score doit être compris entre 0 et 1.", "score");
  }
  const parsedSourceLabel = optionalText(body.source_label, 100);
  if (body.source_label && parsedSourceLabel === undefined) {
    return invalid("INVALID_SOURCE_LABEL", "source_label ne doit pas dépasser 100 caractères.", "source_label");
  }
  const sourceLabel = parsedSourceLabel || "manual_admin_v0";

  return {
    ok: true,
    value: {
      source_form_id: sourceFormId,
      target_form_id: targetFormId,
      relation_type: relationType,
      score,
      is_symmetric: true,
      source_label: sourceLabel,
      confidence_score: score,
      notes: "Relation manuelle via Dico-IC Admin V0.",
    },
  };
}

function validateAdminInflectedForm(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalid("INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }

  const lexicalFormId = Number(body.lexical_form_id);
  if (!Number.isSafeInteger(lexicalFormId) || lexicalFormId < 1) {
    return invalid("INVALID_LEXICAL_FORM_ID", "La forme lexicale cible est invalide.", "lexical_form_id");
  }

  const surfaceForm = typeof body.surface_form === "string" ? body.surface_form.trim() : "";
  if (!surfaceForm || surfaceForm.length > 255) {
    return invalid(
      "INVALID_SURFACE_FORM",
      "La surface fléchie est obligatoire et limitée à 255 caractères.",
      "surface_form"
    );
  }
  const normalizedSurface = toLookupKey(surfaceForm);
  if (!normalizedSurface) {
    return invalid("INVALID_SURFACE_FORM", "La surface fléchie ne peut pas être normalisée.", "surface_form");
  }

  const grammaticalNumber = body.grammatical_number || "PLURAL";
  if (grammaticalNumber !== "PLURAL") {
    return invalid(
      "INVALID_GRAMMATICAL_NUMBER",
      "grammatical_number doit valoir PLURAL dans cette V0.",
      "grammatical_number"
    );
  }

  const status = body.status || "VALIDATED";
  if (!ALLOWED_INFLECTED_FORM_STATUSES.has(status)) {
    return invalid(
      "INVALID_INFLECTED_FORM_STATUS",
      "Le statut doit valoir PROPOSED, VALIDATED, REJECTED ou ARCHIVED.",
      "status"
    );
  }

  const parsedSourceLabel = optionalText(body.source_label, 100);
  if (body.source_label && parsedSourceLabel === undefined) {
    return invalid("INVALID_SOURCE_LABEL", "La provenance est invalide.", "source_label");
  }

  const confidenceScore = body.confidence_score === undefined || body.confidence_score === null
    ? null
    : Number(body.confidence_score);
  if (confidenceScore !== null
      && (!Number.isFinite(confidenceScore) || confidenceScore < 0 || confidenceScore > 1)) {
    return invalid(
      "INVALID_CONFIDENCE_SCORE",
      "confidence_score doit être compris entre 0 et 1.",
      "confidence_score"
    );
  }

  return {
    ok: true,
    value: {
      lexical_form_id: lexicalFormId,
      surface_form: surfaceForm,
      normalized_surface: normalizedSurface,
      grammatical_number: grammaticalNumber,
      status,
      source_label: parsedSourceLabel || "manual_admin_v0",
      confidence_score: confidenceScore,
    },
  };
}

module.exports = {
  ALLOWED_CONNECTOR_HELP_LANGUAGES,
  ALLOWED_CONNECTOR_HELP_STATUSES,
  ALLOWED_DISCOURSE_FUNCTIONS,
  ALLOWED_INFLECTED_FORM_STATUSES,
  ALLOWED_RELATION_TYPES,
  DISCOURSE_FUNCTIONS,
  normalizeConnectorExpression,
  validateAdminConnectorHelp,
  validateAdminFormRelation,
  validateAdminInflectedForm,
  validateAdminLexicalEntry,
  validateAdminLexicalEntryUpdate,
};
