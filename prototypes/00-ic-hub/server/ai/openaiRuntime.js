const OpenAI = require("openai");

const allowedCharacters = new Set(["Clara", "Marco", "Ana", "Malik", "Lucía", "Lucia", "Andrei", "Laia"]);
const allowedLanguages = new Set(["es-ES", "it-IT", "pt-BR", "fr-FR", "es-AR", "ro-RO", "ca-ES"]);
const allowedScenarios = new Set([
  "globalUnderstanding",
  "affectsFeelings",
  "adaptationStrategies",
  "prospectiveStories",
  "transparentWords",
  "clarificationZones"
]);
const allowedStrictness = new Set(["safe", "exploratory"]);
const forbiddenDraftKeys = new Set([
  "prompt",
  "messages",
  "studentText",
  "learnerText",
  "learnerAnswer",
  "studentAnswer",
  "participantText",
  "launchToken",
  "token",
  "email",
  "displayName",
  "userId",
  "studentId",
  "learnerId"
]);

function getOpenAiRuntimeStatus() {
  return {
    provider: "openai",
    enabled: Boolean(process.env.OPENAI_API_KEY),
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    defaultModelConfigured: Boolean(process.env.OPENAI_DEFAULT_MODEL),
    browserCallsOpenAI: false,
    learnerFlowGenerative: false
  };
}

function runtimeError(code, message, statusCode = 400) {
  const error = new Error(message || code);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizedStatus(model) {
  return String(model?.status || "").toLowerCase();
}

function findCatalogModel(modelCatalogId, catalogModels = []) {
  return (catalogModels || []).find((model) => model.id === modelCatalogId);
}

function validateOpenAiCatalogModel(modelCatalogId, catalogModels = []) {
  const model = findCatalogModel(modelCatalogId, catalogModels);
  if (!model) throw runtimeError("MODEL_NOT_FOUND", "Modele catalogue introuvable.", 404);
  if (model.providerId !== "openai") throw runtimeError("MODEL_PROVIDER_NOT_OPENAI", "Le modele choisi n'appartient pas au provider OpenAI.");
  if (!model.providerModelId) throw runtimeError("MODEL_PROVIDER_ID_MISSING", "Le modele choisi n'a pas d'identifiant provider.");
  const status = normalizedStatus(model);
  if (status === "stale" || status === "deprecated" || String(model.providerModelId).toLowerCase().includes("deprecated")) {
    throw runtimeError("MODEL_DEPRECATED_OR_STALE", "Le modele choisi est stale ou deprecated.");
  }
  if (!["available", "active"].includes(status)) throw runtimeError("MODEL_NOT_AVAILABLE", "Le modele choisi n'est pas disponible.");
  if (model.allowedForRuntime !== true) {
    throw runtimeError("MODEL_NOT_ALLOWED_FOR_RUNTIME", "MODEL_NOT_ALLOWED_FOR_RUNTIME");
  }
  return model;
}

function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw runtimeError("OPENAI_API_KEY_MISSING", "Impossible d'appeler OpenAI : aucune cle n'est configuree cote serveur.", 400);
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID || undefined,
    project: process.env.OPENAI_PROJECT_ID || undefined,
    timeout: 20000,
    maxRetries: 0
  });
}

function extractText(response) {
  if (typeof response.output_text === "string") return response.output_text.trim();
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("").trim();
}

function cleanOpenAiError(error) {
  if (error.code && error.statusCode) return error;
  return runtimeError("OPENAI_RUNTIME_ERROR", error.message || "Erreur OpenAI.", error.status || 502);
}

function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function hasMarkdown(text) {
  return /(^|\n)\s{0,3}(#{1,6}\s|[-*]\s|\d+\.\s|```)|[*_]{2,}|`/.test(String(text || ""));
}

function localDraftChecks(text, input) {
  const wordCount = countWords(text);
  return {
    hasMarkdown: hasMarkdown(text),
    hasQuestionMark: /[?¿]/.test(String(text || "")),
    withinWordLimit: wordCount <= input.maxWords + 8 && wordCount >= Math.max(10, input.maxWords - 20),
    targetLanguage: input.targetLanguage
  };
}

async function runOpenAiSmokeTest({ modelCatalogId, catalogModels = [] }) {
  try {
    const model = validateOpenAiCatalogModel(modelCatalogId, catalogModels);
    const started = Date.now();
    const response = await client().responses.create({
      model: model.providerModelId,
      input: "Reponds exactement : IC-Lab OK",
      store: false,
      max_output_tokens: 16
    });
    return {
      ok: true,
      provider: "openai",
      modelCatalogId: model.id,
      providerModelId: model.providerModelId,
      text: extractText(response),
      stored: false,
      durationMs: Date.now() - started
    };
  } catch (error) {
    throw cleanOpenAiError(error);
  }
}

function validateDraftInput(input) {
  for (const key of Object.keys(input || {})) {
    if (forbiddenDraftKeys.has(key)) {
      throw runtimeError("LEARNER_DATA_NOT_ACCEPTED", "Aucune donnee apprenante ou prompt libre n'est accepte par cet endpoint.");
    }
  }
  const characterId = String(input.characterId || "").trim();
  const targetLanguage = String(input.targetLanguage || "").trim();
  const scenarioId = String(input.scenarioId || "").trim();
  const climateTheme = String(input.climateTheme || "").trim();
  const maxWords = Math.max(20, Math.min(60, Math.round(Number(input.maxWords || 45))));
  const pedagogicalStrictness = String(input.pedagogicalStrictness || "safe").trim();

  if (!allowedCharacters.has(characterId)) throw runtimeError("INVALID_CHARACTER", "Personnage non autorise.");
  if (!allowedLanguages.has(targetLanguage)) throw runtimeError("INVALID_LANGUAGE", "Langue cible non autorisee.");
  if (!allowedScenarios.has(scenarioId)) throw runtimeError("INVALID_SCENARIO", "Scenario non autorise.");
  if (!climateTheme || climateTheme.length > 120) throw runtimeError("INVALID_CLIMATE_THEME", "Theme climat invalide.");
  if (!allowedStrictness.has(pedagogicalStrictness)) throw runtimeError("INVALID_PEDAGOGICAL_STRICTNESS", "Niveau de prudence pedagogique invalide.");
  return { characterId, targetLanguage, scenarioId, climateTheme, maxWords, pedagogicalStrictness };
}

function scenarioInstruction(scenarioId) {
  const instructions = {
    globalUnderstanding: "Favorise une comprehension globale : idee principale claire, vocabulaire transparent, peu de details.",
    affectsFeelings: "Fais entendre une reaction affective simple face au climat, sans dramatisation excessive.",
    adaptationStrategies: "Mentionne une strategie locale d'adaptation concrete et observable.",
    prospectiveStories: "Raconte une projection breve dans un futur proche, plausible et non catastrophiste.",
    transparentWords: "Inclue quelques mots transparents entre langues romanes, sans les signaler explicitement.",
    clarificationZones: "Garde une ou deux zones lexicales legerement ambigues, utiles pour discuter des strategies de clarification."
  };
  return instructions[scenarioId] || instructions.globalUnderstanding;
}

function draftPrompt({ characterId, targetLanguage, scenarioId, climateTheme, maxWords, pedagogicalStrictness }) {
  const strictnessLine = pedagogicalStrictness === "exploratory"
    ? "Prudence pedagogique : exploratoire, avec une nuance personnelle, mais sans contenu anxiogene."
    : "Prudence pedagogique : safe, simple, rassurante, compatible avec un test enseignant.";
  return [
    `Tu es ${characterId}, un personnage d'une activite d'intercomprehension orale sur le climat.`,
    `Langue cible obligatoire : ${targetLanguage}.`,
    `Scenario pedagogique : ${scenarioId}.`,
    scenarioInstruction(scenarioId),
    `Theme climat : ${climateTheme}.`,
    `Produis un court temoignage naturel d'environ ${maxWords} mots.`,
    strictnessLine,
    "Contraintes : langue cible uniquement, pas de traduction, pas de markdown, pas de question directe a l'apprenant, pas de donnees personnelles, pas d'instruction technique."
  ].join("\n");
}

async function generateIcAgentDraft({ modelCatalogId, characterId, targetLanguage, scenarioId, climateTheme, maxWords, pedagogicalStrictness, catalogModels = [] }) {
  try {
    const model = validateOpenAiCatalogModel(modelCatalogId, catalogModels);
    const input = validateDraftInput({ characterId, targetLanguage, scenarioId, climateTheme, maxWords, pedagogicalStrictness });
    const started = Date.now();
    const response = await client().responses.create({
      model: model.providerModelId,
      input: draftPrompt(input),
      store: false,
      max_output_tokens: 220
    });
    const text = extractText(response);
    const checks = localDraftChecks(text, input);
    return {
      ok: true,
      generated: true,
      source: "openai",
      stored: false,
      runtimeId: "admin_openai_ic_agent_draft",
      modelCatalogId: model.id,
      providerModelId: model.providerModelId,
      draft: {
        text,
        language: input.targetLanguage,
        characterId: input.characterId,
        scenarioId: input.scenarioId,
        climateTheme: input.climateTheme,
        wordCount: countWords(text)
      },
      checks,
      durationMs: Date.now() - started,
      safety: {
        adminOnly: true,
        studentTextSent: false,
        containsApiKey: false,
        learnerFlowAffected: false,
        storedInRunEvents: false
      }
    };
  } catch (error) {
    throw cleanOpenAiError(error);
  }
}

module.exports = {
  generateIcAgentDraft,
  getOpenAiRuntimeStatus,
  runOpenAiSmokeTest,
  validateOpenAiCatalogModel
};
