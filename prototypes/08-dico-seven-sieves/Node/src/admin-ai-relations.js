const {
  AdminAiError,
  generateStructuredCandidates,
} = require("./admin-ai-domain");
const { ALLOWED_RELATION_TYPES } = require("./admin");

const MAX_ENTRY_FORMS = 20;
const REFERENCE_LANGUAGES = new Set(["fr", "es", "it", "pt", "en", "all"]);

function validateRelationCandidateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminAiError(400, "INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }
  const entryKey = typeof body.entry_key === "string" ? body.entry_key.trim().toUpperCase() : "";
  if (!/^[A-Z][A-Z0-9_]{2,99}$/.test(entryKey)) {
    throw new AdminAiError(400, "INVALID_ENTRY_KEY", "entry_key est invalide.", "entry_key");
  }
  const referenceLanguage = body.reference_language === undefined
    ? "fr"
    : typeof body.reference_language === "string"
      ? body.reference_language.trim().toLowerCase()
      : "";
  if (!REFERENCE_LANGUAGES.has(referenceLanguage)) {
    throw new AdminAiError(
      400,
      "INVALID_REFERENCE_LANGUAGE",
      "reference_language doit valoir fr, es, it, pt, en ou all.",
      "reference_language"
    );
  }
  return { entry_key: entryKey, reference_language: referenceLanguage };
}

function relationCandidateSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["candidates"],
    properties: {
      candidates: {
        type: "array",
        maxItems: 190,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["left_form_id", "right_form_id", "relation_type", "score", "justification"],
          properties: {
            left_form_id: { type: "integer" },
            right_form_id: { type: "integer" },
            relation_type: { type: "string", enum: [...ALLOWED_RELATION_TYPES] },
            score: { type: "number", minimum: 0, maximum: 1 },
            justification: { type: "string" },
          },
        },
      },
    },
  };
}

function parseAndValidateRelationJson(raw, request) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new AdminAiError(502, "OPENAI_INVALID_JSON", "La réponse OpenAI n’est pas un JSON valide.");
  }
  if (!parsed || !Array.isArray(parsed.candidates)) {
    throw new AdminAiError(502, "OPENAI_INVALID_PAYLOAD", "La réponse OpenAI ne contient pas de tableau candidates.");
  }

  const allowedFormIds = new Set(request.forms.map((form) => Number(form.id)));
  const seen = new Set();
  const candidates = parsed.candidates.map((candidate, index) => {
    const leftFormId = Number(candidate?.left_form_id);
    const rightFormId = Number(candidate?.right_form_id);
    const relationType = candidate?.relation_type;
    const score = Number(candidate?.score);
    const justification = typeof candidate?.justification === "string"
      ? candidate.justification.trim()
      : "";

    if (!Number.isSafeInteger(leftFormId) || !allowedFormIds.has(leftFormId)
        || !Number.isSafeInteger(rightFormId) || !allowedFormIds.has(rightFormId)) {
      throw new AdminAiError(502, "OPENAI_FORM_OUT_OF_SCOPE", `Le candidat ${index + 1} référence une forme hors de l’entrée.`);
    }
    if (leftFormId === rightFormId) {
      throw new AdminAiError(502, "OPENAI_SAME_FORM", `Le candidat ${index + 1} relie une forme à elle-même.`);
    }
    if (!ALLOWED_RELATION_TYPES.has(relationType)) {
      throw new AdminAiError(502, "OPENAI_INVALID_RELATION_TYPE", `Le candidat ${index + 1} contient un type inconnu.`);
    }
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new AdminAiError(502, "OPENAI_INVALID_SCORE", `Le score du candidat ${index + 1} est invalide.`);
    }
    if (!justification || justification.length > 500) {
      throw new AdminAiError(502, "OPENAI_INVALID_JUSTIFICATION", `La justification du candidat ${index + 1} est invalide.`);
    }

    const pair = [leftFormId, rightFormId].sort((a, b) => a - b);
    const key = `${pair[0]}:${pair[1]}:${relationType}`;
    if (seen.has(key)) {
      throw new AdminAiError(502, "OPENAI_DUPLICATE_CANDIDATE", `Le candidat ${index + 1} répète une relation.`);
    }
    seen.add(key);
    return {
      left_form_id: leftFormId,
      right_form_id: rightFormId,
      relation_type: relationType,
      score: Number(score.toFixed(3)),
      justification,
    };
  });

  return { candidates };
}

function buildRelationPrompts(request) {
  const referenceLanguage = request.reference_language || "fr";
  const forms = request.forms.map((form) => ({
    id: Number(form.id),
    language_code: form.language,
    lemma: form.lemma,
    part_of_speech: form.part_of_speech,
  }));
  const comparisonStrategy = referenceLanguage === "all"
    ? "Examine librement toutes les paires pertinentes de l’entrée et retiens les meilleures proximités, sans langue pivot."
    : `Privilégie nettement les relations impliquant la langue de référence ${referenceLanguage.toUpperCase()}. Les relations entre les autres langues restent possibles mais secondaires.`;
  return {
    system: [
      "Tu proposes des relations linguistiques pour une base d’intercompréhension.",
      "Travaille uniquement avec les identifiants de formes fournis et uniquement à l’intérieur de cette entrée lexicale.",
      "Types autorisés : COGNATE_STRONG, COGNATE_WEAK, RELATED_FORM, FALSE_FRIEND.",
      comparisonStrategy,
      "Évite les paires transitives redondantes lorsque la stratégie utilise une langue de référence.",
      "Ne propose une relation que si elle est pédagogiquement défendable.",
      "Retourne uniquement le JSON demandé, sans explication extérieure.",
    ].join(" "),
    user: JSON.stringify({
      entry_key: request.entry_key,
      gloss_fr: request.gloss_fr,
      gloss_en: request.gloss_en,
      reference_language: referenceLanguage,
      forms,
    }),
  };
}

function annotateExistingRelations(candidates, existingRelations) {
  return candidates.map((candidate) => {
    const existing = existingRelations.find((relation) => {
      const sameDirection = Number(relation.source_form_id) === candidate.left_form_id
        && Number(relation.target_form_id) === candidate.right_form_id;
      const reverseDirection = Number(relation.source_form_id) === candidate.right_form_id
        && Number(relation.target_form_id) === candidate.left_form_id;
      return sameDirection || reverseDirection;
    });
    return {
      ...candidate,
      status: existing ? "existing" : "new",
      existing_relation: existing ? {
        id: Number(existing.id),
        relation_type: existing.relation_type,
        score: existing.score === null ? null : Number(existing.score),
      } : null,
    };
  });
}

async function generateRelationCandidates(request, options = {}) {
  if (!Array.isArray(request.forms) || request.forms.length < 2) {
    throw new AdminAiError(422, "INSUFFICIENT_FORMS", "L’entrée doit contenir au moins deux formes.");
  }
  if (request.forms.length > MAX_ENTRY_FORMS) {
    throw new AdminAiError(422, "TOO_MANY_FORMS", `L’assistant est limité à ${MAX_ENTRY_FORMS} formes.`);
  }
  return generateStructuredCandidates(
    request,
    buildRelationPrompts(request),
    "dico_ic_relation_candidates",
    {
      ...options,
      schema: relationCandidateSchema(),
      parseResponse: parseAndValidateRelationJson,
    }
  );
}

module.exports = {
  REFERENCE_LANGUAGES,
  annotateExistingRelations,
  buildRelationPrompts,
  generateRelationCandidates,
  parseAndValidateRelationJson,
  relationCandidateSchema,
  validateRelationCandidateRequest,
};
