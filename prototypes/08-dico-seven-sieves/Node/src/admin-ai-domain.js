const fs = require("node:fs");
const path = require("node:path");
const { canonicalizeEntryKey } = require("../../admin/js/entry-key-canonicalization-0.1.js");

const ALLOWED_COUNTS = new Set([10, 20, 30, 50]);
const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2"]);
const ALLOWED_PARTS_OF_SPEECH = new Set(["noun", "verb", "adjective", "adverb"]);
const DEFAULT_MODEL = "gpt-4.1-mini";
const DICTIONARY_LEMMA_INSTRUCTIONS = [
  "Les formes proposées doivent être des lemmes dictionnaires, pas des formes fléchies.",
  "Pour chaque langue : noms au singulier ; verbes à l’infinitif ; adjectifs sous leur forme canonique de dictionnaire ; adverbes sous leur forme non fléchie ; déterminants et pronoms sous leur forme canonique la plus neutre.",
  "Ne propose pas de pluriels contextuels, de formes conjuguées ni de formes accordées en genre ou en nombre, sauf si la forme est lexicalisée ou réellement invariable.",
  "Exemples adjectivaux : FR utiles → utile ; ES útiles → útil ; IT utili → utile ; PT úteis → útil.",
  "Exemples nominaux : FR élèves → élève ; ES alumnos → alumno ; IT studenti → studente ; PT alunos → aluno.",
  "Exemples verbaux : FR mangent → manger ; ES comen → comer ; IT mangiano → mangiare ; PT comem → comer.",
];

class AdminAiError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.name = "AdminAiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

function loadAdminOpenAiConfig() {
  const values = {};
  const envPath = path.resolve(__dirname, "../../admin/.env");
  if (fs.existsSync(envPath)) {
    for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  }

  return {
    apiKey: process.env.OPENAI_API_KEY || values.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || values.OPENAI_MODEL || DEFAULT_MODEL,
  };
}

function validateDomainCandidateRequest(body, activeLanguages) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminAiError(400, "INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }

  const domain = typeof body.domain === "string" ? body.domain.trim() : "";
  if (domain.length < 2 || domain.length > 100) {
    throw new AdminAiError(
      400,
      "INVALID_DOMAIN",
      "Le domaine doit contenir entre 2 et 100 caractères.",
      "domain"
    );
  }

  const count = Number(body.count);
  if (count > 50) {
    throw new AdminAiError(400, "CANDIDATE_LIMIT_EXCEEDED", "Le nombre de propositions est limité à 50.", "count");
  }
  if (!ALLOWED_COUNTS.has(count)) {
    throw new AdminAiError(400, "INVALID_CANDIDATE_COUNT", "Le nombre doit être 10, 20, 30 ou 50.", "count");
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

  const level = typeof body.level === "string" ? body.level.toUpperCase() : "";
  if (!ALLOWED_LEVELS.has(level)) {
    throw new AdminAiError(400, "INVALID_LEVEL", "Le niveau doit être A1, A2, B1 ou B2.", "level");
  }

  if (!Array.isArray(body.parts_of_speech) || body.parts_of_speech.length === 0) {
    throw new AdminAiError(400, "INVALID_PARTS_OF_SPEECH", "Sélectionnez au moins une catégorie grammaticale.", "parts_of_speech");
  }
  const partsOfSpeech = [...new Set(body.parts_of_speech)];
  if (partsOfSpeech.length !== body.parts_of_speech.length
      || partsOfSpeech.some((part) => !ALLOWED_PARTS_OF_SPEECH.has(part))) {
    throw new AdminAiError(400, "INVALID_PARTS_OF_SPEECH", "Une catégorie grammaticale est invalide ou répétée.", "parts_of_speech");
  }

  return { domain, count, languages, level, parts_of_speech: partsOfSpeech };
}

function candidateSchema() {
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
          required: ["entry_key", "gloss_fr", "gloss_en", "semantic_domain", "forms"],
          properties: {
            entry_key: { type: "string" },
            gloss_fr: { type: "string" },
            gloss_en: { type: "string" },
            semantic_domain: { type: "string" },
            forms: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["language_code", "lemma", "part_of_speech"],
                properties: {
                  language_code: { type: "string" },
                  lemma: { type: "string" },
                  part_of_speech: { type: "string", enum: [...ALLOWED_PARTS_OF_SPEECH] },
                },
              },
            },
          },
        },
      },
    },
  };
}

function extractResponseText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new AdminAiError(502, "OPENAI_EMPTY_RESPONSE", "OpenAI n’a renvoyé aucun contenu exploitable.");
}

function canonicalizeCandidateEntryKey(value, index) {
  try {
    return canonicalizeEntryKey(value);
  } catch {
    throw new AdminAiError(
      502,
      "OPENAI_INVALID_CANDIDATE",
      `La clé technique du candidat ${index + 1} est vide après canonicalisation.`
    );
  }
}

function parseAndValidateCandidateJson(raw, request) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new AdminAiError(502, "OPENAI_INVALID_JSON", "La réponse OpenAI n’est pas un JSON valide.");
  }
  if (!parsed || !Array.isArray(parsed.candidates)) {
    throw new AdminAiError(502, "OPENAI_INVALID_PAYLOAD", "La réponse OpenAI ne contient pas de tableau candidates.");
  }

  const requestedLanguages = new Set(request.languages);
  const requestedPartsOfSpeech = new Set(request.parts_of_speech);
  const candidates = parsed.candidates.slice(0, request.count).map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new AdminAiError(502, "OPENAI_INVALID_CANDIDATE", `Le candidat ${index + 1} est invalide.`);
    }
    for (const field of ["entry_key", "gloss_fr", "gloss_en", "semantic_domain"] ) {
      if (typeof candidate[field] !== "string") {
        throw new AdminAiError(502, "OPENAI_INVALID_CANDIDATE", `Le champ ${field} du candidat ${index + 1} est invalide.`);
      }
    }
    if (!Array.isArray(candidate.forms)) {
      throw new AdminAiError(502, "OPENAI_INVALID_CANDIDATE", `Les formes du candidat ${index + 1} sont invalides.`);
    }
    const forms = candidate.forms.map((form, formIndex) => {
      if (!form || typeof form.language_code !== "string" || typeof form.lemma !== "string"
          || !ALLOWED_PARTS_OF_SPEECH.has(form.part_of_speech)) {
        throw new AdminAiError(502, "OPENAI_INVALID_FORM", `La forme ${formIndex + 1} du candidat ${index + 1} est invalide.`);
      }
      if (!requestedLanguages.has(form.language_code)) {
        throw new AdminAiError(502, "OPENAI_INVALID_LANGUAGE", `OpenAI a renvoyé une langue non demandée : ${form.language_code}.`);
      }
      if (!requestedPartsOfSpeech.has(form.part_of_speech)) {
        throw new AdminAiError(502, "OPENAI_INVALID_PART_OF_SPEECH", `OpenAI a renvoyé une catégorie non demandée : ${form.part_of_speech}.`);
      }
      return {
        language_code: form.language_code,
        lemma: form.lemma.trim(),
        part_of_speech: form.part_of_speech,
      };
    });
    return {
      entry_key: canonicalizeCandidateEntryKey(candidate.entry_key, index),
      gloss_fr: candidate.gloss_fr.trim(),
      gloss_en: candidate.gloss_en.trim(),
      semantic_domain: candidate.semantic_domain.trim(),
      forms,
    };
  });

  return { candidates };
}

function buildPrompts(request) {
  const system = [
    "Tu proposes des brouillons lexicaux pour une base d’intercompréhension romane.",
    "Retourne uniquement les données demandées par le schéma JSON.",
    "Chaque entry_key est une clé conceptuelle ASCII stable contenant uniquement A-Z, 0-9 et des underscores, sans accent, apostrophe, espace ni trait d’union.",
    "Les formes doivent être usuelles, pédagogiquement pertinentes et distinctes.",
    ...DICTIONARY_LEMMA_INSTRUCTIONS,
    "N’invente pas de langues et n’ajoute aucune explication hors JSON.",
  ].join(" ");
  const user = [
    `Domaine pédagogique : ${request.domain}.`,
    `Niveau approximatif : ${request.level}.`,
    `Nombre exact de propositions : ${request.count}.`,
    `Langues demandées : ${request.languages.join(", ")}.`,
    `Catégories autorisées : ${request.parts_of_speech.join(", ")}.`,
    "Pour chaque concept, fournis si possible une forme dans chaque langue demandée.",
    "semantic_domain doit reprendre un libellé cohérent avec le domaine fourni.",
  ].join(" ");
  return { system, user };
}

async function generateStructuredCandidates(request, prompts, schemaName, options = {}) {
  const config = loadAdminOpenAiConfig();
  const apiKey = options.apiKey ?? config.apiKey;
  const model = options.model ?? config.model;
  const fetchImpl = options.fetchImpl || fetch;
  const schema = options.schema || candidateSchema();
  const parseResponse = options.parseResponse || parseAndValidateCandidateJson;
  const cancellationSignal = options.signal;
  if (!apiKey) {
    throw new AdminAiError(503, "OPENAI_NOT_CONFIGURED", "La clé OpenAI n’est pas configurée côté serveur.");
  }

  const controller = new AbortController();
  let cancelledByClient = Boolean(cancellationSignal?.aborted);
  const cancelFromClient = () => {
    cancelledByClient = true;
    controller.abort();
  };
  if (cancellationSignal && !cancellationSignal.aborted) {
    cancellationSignal.addEventListener("abort", cancelFromClient, { once: true });
  } else if (cancelledByClient) {
    controller.abort();
  }
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: prompts.system }] },
          { role: "user", content: [{ type: "input_text", text: prompts.user }] },
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (cancelledByClient || cancellationSignal?.aborted) {
      throw new AdminAiError(499, "OPENAI_CANCELLED", "La génération OpenAI a été annulée par le client.");
    }
    if (!response.ok) {
      const message = data?.error?.message || `OpenAI a répondu avec le statut ${response.status}.`;
      throw new AdminAiError(502, "OPENAI_REQUEST_FAILED", message);
    }
    return {
      ...parseResponse(extractResponseText(data), request),
      model,
      response_id: data.id || null,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      if (cancelledByClient || cancellationSignal?.aborted) {
        throw new AdminAiError(499, "OPENAI_CANCELLED", "La génération OpenAI a été annulée par le client.");
      }
      throw new AdminAiError(504, "OPENAI_TIMEOUT", "La génération OpenAI a dépassé le délai autorisé.");
    }
    if (error instanceof AdminAiError) throw error;
    throw new AdminAiError(502, "OPENAI_UNAVAILABLE", "Impossible de joindre OpenAI.");
  } finally {
    clearTimeout(timeout);
    cancellationSignal?.removeEventListener("abort", cancelFromClient);
  }
}

async function generateDomainCandidates(request, options = {}) {
  return generateStructuredCandidates(
    request,
    buildPrompts(request),
    "dico_ic_domain_candidates",
    options
  );
}

module.exports = {
  AdminAiError,
  DICTIONARY_LEMMA_INSTRUCTIONS,
  buildPrompts,
  candidateSchema,
  generateDomainCandidates,
  generateStructuredCandidates,
  parseAndValidateCandidateJson,
  validateDomainCandidateRequest,
};
