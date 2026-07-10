const { toLookupKey } = require("./analysis");
const {
  AdminAiError,
  generateStructuredCandidates,
} = require("./admin-ai-domain");

const MAX_INFLECTED_CANDIDATES = 100;
const ALLOWED_LANGUAGES = new Set(["fr", "es", "it", "pt"]);
const ALLOWED_PARTS_OF_SPEECH = new Set(["noun", "adjective"]);

function validateInflectedCandidateRequest(body, activeLanguages) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminAiError(400, "INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new AdminAiError(
      400,
      "EMPTY_INFLECTED_ITEMS",
      "Sélectionnez au moins une forme à examiner.",
      "items"
    );
  }
  if (body.items.length > MAX_INFLECTED_CANDIDATES) {
    throw new AdminAiError(
      400,
      "INFLECTED_ITEM_LIMIT_EXCEEDED",
      `La génération est limitée à ${MAX_INFLECTED_CANDIDATES} formes.`,
      "items"
    );
  }

  const activeCodes = new Set(activeLanguages
    .filter((language) => language.is_active !== false)
    .map((language) => language.code));
  const seen = new Set();
  const items = body.items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AdminAiError(
        400,
        "INVALID_INFLECTED_ITEM",
        `La forme ${index + 1} est invalide.`,
        `items[${index}]`
      );
    }
    const surfaceForm = typeof item.surface_form === "string" ? item.surface_form.trim() : "";
    if (!surfaceForm || surfaceForm.length > 255) {
      throw new AdminAiError(
        400,
        "INVALID_SURFACE_FORM",
        `La surface ${index + 1} est obligatoire et limitée à 255 caractères.`,
        `items[${index}].surface_form`
      );
    }
    const language = typeof item.language === "string" ? item.language.trim().toLowerCase() : "";
    if (!activeCodes.has(language) || !ALLOWED_LANGUAGES.has(language)) {
      throw new AdminAiError(
        400,
        "INVALID_INFLECTED_LANGUAGE",
        "La langue doit être active et valoir fr, es, it ou pt.",
        `items[${index}].language`
      );
    }
    const context = typeof item.context === "string" ? item.context.trim() : "";
    if (!context || context.length > 500) {
      throw new AdminAiError(
        400,
        "INVALID_INFLECTED_CONTEXT",
        "Chaque forme doit disposer d’un contexte court de 1 à 500 caractères.",
        `items[${index}].context`
      );
    }
    const duplicateKey = `${language}\u0000${toLookupKey(surfaceForm)}`;
    if (seen.has(duplicateKey)) {
      throw new AdminAiError(
        400,
        "DUPLICATE_INFLECTED_ITEM",
        `La surface ${surfaceForm} est répétée dans la requête.`,
        "items"
      );
    }
    seen.add(duplicateKey);
    return { surface_form: surfaceForm, language, context };
  });

  return { items, count: items.length };
}

function inflectedCandidateSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["candidates"],
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "surface_form",
            "language",
            "lemma_candidate",
            "part_of_speech",
            "grammatical_number",
            "confidence_score",
            "reason_short",
          ],
          properties: {
            surface_form: { type: "string" },
            language: { type: "string", enum: [...ALLOWED_LANGUAGES] },
            lemma_candidate: { type: "string" },
            part_of_speech: { type: "string", enum: [...ALLOWED_PARTS_OF_SPEECH] },
            grammatical_number: { type: "string", enum: ["PLURAL"] },
            confidence_score: { type: "number", minimum: 0, maximum: 1 },
            reason_short: { type: "string" },
          },
        },
      },
    },
  };
}

function parseAndValidateInflectedCandidateJson(raw, request) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new AdminAiError(502, "OPENAI_INVALID_JSON", "La réponse OpenAI n’est pas un JSON valide.");
  }
  if (!parsed || !Array.isArray(parsed.candidates)) {
    throw new AdminAiError(
      502,
      "OPENAI_INVALID_PAYLOAD",
      "La réponse OpenAI ne contient pas de tableau candidates."
    );
  }

  const requestedByKey = new Map(request.items.map((item) => [
    `${item.language}\u0000${toLookupKey(item.surface_form)}`,
    item,
  ]));
  const seen = new Set();
  const candidates = parsed.candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new AdminAiError(
        502,
        "OPENAI_INVALID_INFLECTED_CANDIDATE",
        `Le candidat ${index + 1} est invalide.`
      );
    }
    const surfaceForm = typeof candidate.surface_form === "string"
      ? candidate.surface_form.trim()
      : "";
    const language = typeof candidate.language === "string"
      ? candidate.language.trim().toLowerCase()
      : "";
    const requestKey = `${language}\u0000${toLookupKey(surfaceForm)}`;
    const requested = requestedByKey.get(requestKey);
    if (!requested) {
      throw new AdminAiError(
        502,
        "OPENAI_UNREQUESTED_INFLECTED_FORM",
        `OpenAI a renvoyé une forme ou une langue non demandée : ${surfaceForm}.`
      );
    }
    if (seen.has(requestKey)) {
      throw new AdminAiError(
        502,
        "OPENAI_DUPLICATE_INFLECTED_CANDIDATE",
        `OpenAI a répété la forme ${surfaceForm}.`
      );
    }
    seen.add(requestKey);

    const lemmaCandidate = typeof candidate.lemma_candidate === "string"
      ? candidate.lemma_candidate.trim()
      : "";
    if (!lemmaCandidate || lemmaCandidate.length > 255) {
      throw new AdminAiError(
        502,
        "OPENAI_INVALID_LEMMA_CANDIDATE",
        `Le lemme du candidat ${index + 1} est invalide.`
      );
    }
    if (!ALLOWED_PARTS_OF_SPEECH.has(candidate.part_of_speech)) {
      throw new AdminAiError(
        502,
        "OPENAI_INVALID_PART_OF_SPEECH",
        `La catégorie du candidat ${index + 1} est hors périmètre.`
      );
    }
    if (candidate.grammatical_number !== "PLURAL") {
      throw new AdminAiError(
        502,
        "OPENAI_INVALID_GRAMMATICAL_NUMBER",
        `Le nombre du candidat ${index + 1} doit valoir PLURAL.`
      );
    }
    const confidenceScore = Number(candidate.confidence_score);
    if (!Number.isFinite(confidenceScore) || confidenceScore < 0 || confidenceScore > 1) {
      throw new AdminAiError(
        502,
        "OPENAI_INVALID_CONFIDENCE_SCORE",
        `La confiance du candidat ${index + 1} est invalide.`
      );
    }
    const reasonShort = typeof candidate.reason_short === "string"
      ? candidate.reason_short.trim()
      : "";
    if (!reasonShort || reasonShort.length > 300) {
      throw new AdminAiError(
        502,
        "OPENAI_INVALID_REASON",
        `La justification du candidat ${index + 1} est invalide.`
      );
    }

    return {
      surface_form: requested.surface_form,
      normalized_surface: toLookupKey(requested.surface_form),
      language,
      context: requested.context,
      lemma_candidate: lemmaCandidate,
      normalized_lemma_candidate: toLookupKey(lemmaCandidate),
      part_of_speech: candidate.part_of_speech,
      grammatical_number: "PLURAL",
      confidence_score: confidenceScore,
      reason_short: reasonShort,
      source_label: "ai_text_inflection_v0",
    };
  });

  return { candidates };
}

function buildInflectedPrompts(request) {
  return {
    system: [
      "Tu proposes uniquement des mappings de formes fléchies pour Dico-IC.",
      "Le périmètre est strict : pluriels de noms et d’adjectifs en français, espagnol, italien ou portugais.",
      "Pour chaque surface, retrouve le lemme dictionnaire singulier canonique dans la même langue.",
      "N’accepte ni verbe, ni temps, ni personne, ni genre complexe, ni comparatif, ni superlatif.",
      "Une surface hors périmètre ne doit pas apparaître dans la réponse.",
      "Exemples : organizaciones → organización (noun) ; internacionales → internacional (adjective) ; ES utiles → útil (adjective).",
      "Retourne uniquement le JSON conforme au schéma, sans commentaire supplémentaire.",
    ].join(" "),
    user: [
      "Examine les surfaces suivantes dans leur contexte :",
      ...request.items.map((item) => (
        `- language=${item.language}; surface_form=${JSON.stringify(item.surface_form)}; context=${JSON.stringify(item.context)}`
      )),
      "Retourne au plus une proposition par surface.",
      "grammatical_number doit toujours valoir PLURAL.",
      "reason_short doit rester factuel et bref.",
      "confidence_score estime seulement la plausibilité de l’analyse et ne remplace pas la validation humaine.",
    ].join("\n"),
  };
}

function resolveInflectedCandidates(candidates, lexicalForms, existingMappings) {
  const lexicalByKey = new Map();
  for (const form of lexicalForms) {
    const key = `${form.language}\u0000${form.normalized_lemma}\u0000${String(form.part_of_speech).toLowerCase()}`;
    if (!lexicalByKey.has(key)) lexicalByKey.set(key, []);
    lexicalByKey.get(key).push(form);
  }

  const mappingsBySurface = new Map();
  for (const mapping of existingMappings) {
    const key = `${mapping.language}\u0000${mapping.normalized_surface}`;
    if (!mappingsBySurface.has(key)) mappingsBySurface.set(key, []);
    mappingsBySurface.get(key).push(mapping);
  }

  return candidates.map((candidate) => {
    const lexicalKey = [
      candidate.language,
      candidate.normalized_lemma_candidate,
      candidate.part_of_speech,
    ].join("\u0000");
    const targets = lexicalByKey.get(lexicalKey) || [];
    const surfaceKey = `${candidate.language}\u0000${toLookupKey(candidate.surface_form)}`;
    const mappings = mappingsBySurface.get(surfaceKey) || [];

    let state = "READY";
    let target = targets.length === 1 ? targets[0] : null;
    if (targets.length === 0) state = "LEMMA_NOT_FOUND";
    else if (targets.length > 1) state = "AMBIGUOUS";
    else if (mappings.some((mapping) => Number(mapping.lexical_form_id) === Number(target.id))) {
      state = "ALREADY_KNOWN";
    } else if (mappings.length > 0
        || candidate.normalized_lemma_candidate === toLookupKey(candidate.surface_form)) {
      state = "NEEDS_CORRECTION";
    }

    return {
      ...candidate,
      state,
      selected: state === "READY",
      lexical_form_id: target?.id || null,
      target: target || null,
      target_options: targets,
      existing_mappings: mappings,
    };
  });
}

async function generateInflectedCandidates(request, options = {}) {
  return generateStructuredCandidates(
    request,
    buildInflectedPrompts(request),
    "dico_ic_inflected_form_candidates",
    {
      ...options,
      schema: inflectedCandidateSchema(),
      parseResponse: parseAndValidateInflectedCandidateJson,
    }
  );
}

module.exports = {
  ALLOWED_INFLECTED_AI_LANGUAGES: ALLOWED_LANGUAGES,
  ALLOWED_INFLECTED_AI_PARTS_OF_SPEECH: ALLOWED_PARTS_OF_SPEECH,
  MAX_INFLECTED_CANDIDATES,
  buildInflectedPrompts,
  generateInflectedCandidates,
  inflectedCandidateSchema,
  parseAndValidateInflectedCandidateJson,
  resolveInflectedCandidates,
  validateInflectedCandidateRequest,
};
