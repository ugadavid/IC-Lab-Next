function normalizeKey(providerId, providerModelId) {
  return `${String(providerId || "").toLowerCase()}::${String(providerModelId || "").toLowerCase()}`;
}

function parseOptionalPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function pricingFromMetadata(metadata) {
  const pricing = metadata?.pricing || {};
  return {
    unit: pricing.unit || "",
    inputUsd: parseOptionalPrice(pricing.inputUsd),
    cachedInputUsd: parseOptionalPrice(pricing.cachedInputUsd),
    outputUsd: parseOptionalPrice(pricing.outputUsd),
    source: pricing.source || "",
    lastCheckedAt: pricing.lastCheckedAt || null
  };
}

function inferFamily(modelId) {
  const id = String(modelId || "").toLowerCase();
  if (id.includes("gpt-5.5")) return "gpt-5.5";
  if (id.includes("gpt-5.4")) return "gpt-5.4";
  if (id.includes("gpt-5.3")) return "gpt-5.3";
  if (id.includes("gpt-5.2")) return "gpt-5.2";
  if (id.includes("gpt-5.1")) return "gpt-5.1";
  if (id.includes("gpt-5")) return "gpt-5";
  if (id.includes("gpt-4.1")) return "gpt-4.1";
  if (id.includes("gpt-4o")) return "gpt-4o";
  if (id.includes("realtime")) return "realtime";
  if (id.includes("embedding")) return "embedding";
  if (id.includes("moderation")) return "moderation";
  if (id.includes("image") || id.includes("dall-e") || id.includes("sora")) return "image";
  if (id.includes("tts") || id.includes("whisper") || id.includes("audio")) return "audio";
  return id.split("-").slice(0, 2).join("-") || "openai";
}

function inferModality(modelId) {
  const id = String(modelId || "").toLowerCase();
  if (id.includes("realtime")) return "realtime";
  if (id.includes("whisper") || id.includes("transcribe")) return "audio_transcription";
  if (id.includes("tts") || id.includes("audio")) return "audio";
  if (id.includes("embedding")) return "embedding";
  if (id.includes("moderation")) return "moderation";
  if (id.includes("image") || id.includes("dall-e") || id.includes("sora")) return "image";
  return "text";
}

function capabilitiesFor(modality, modelId) {
  const id = String(modelId || "").toLowerCase();
  if (modality === "embedding") return ["embeddings"];
  if (modality === "moderation") return ["moderation"];
  if (modality === "image") return ["image"];
  if (modality === "audio_transcription") return ["audio", "transcription"];
  if (modality === "audio") return ["audio"];
  if (modality === "realtime") return ["text", "audio", "realtime"];
  const capabilities = ["text"];
  if (id.includes("gpt-4") || id.includes("gpt-5")) capabilities.push("reasoning");
  return capabilities;
}

function inferCostLevel(modelId, modality, status) {
  const id = String(modelId || "").toLowerCase();
  if (status === "stale" || id.includes("deprecated")) return "unknown";
  if (id.includes("pro")) return "very-high";
  if (modality === "realtime") return "high";
  if (modality === "audio") return "high";
  if (modality === "image") return "high";
  if (id.includes("nano")) return "low";
  if (id.includes("mini")) return "medium";
  if (modality === "embedding") return "low";
  if (modality === "moderation") return "low";
  return "unknown";
}

function recommendationFor(modelId, modality, costLevel, status) {
  const id = String(modelId || "").toLowerCase();
  if (status === "stale" || id.includes("deprecated")) return "not_recommended";
  if (["embedding", "moderation", "image", "audio", "audio_transcription", "realtime"].includes(modality)) {
    return modality === "realtime" ? "restricted" : "not_for_proto06";
  }
  if (costLevel === "very-high") return "restricted";
  if (id.includes("mini") || id.includes("nano")) return "experimental";
  if (id.includes("gpt-5") || id.includes("gpt-4")) return "candidate";
  return "not_recommended";
}

function recommendedUseFor(modality, recommendation) {
  if (modality === "text") {
    if (recommendation === "candidate" || recommendation === "recommended") {
      return "Candidat pour brouillons controles d'agents participants, apres validation pedagogique.";
    }
    if (recommendation === "experimental") {
      return "Tests courts et peu critiques avant activation dans une AIConfig.";
    }
    return "Usage texte a evaluer avant toute activation.";
  }
  if (modality === "embedding") return "Recherche semantique future, non adapte aux tours de parole Proto06.";
  if (modality === "moderation") return "Moderation ou controle futur, pas de generation.";
  if (modality === "image") return "Generation ou analyse image hors Prototype 06 actuel.";
  if (modality === "audio_transcription") return "Transcription audio future, pas de generation de personnage.";
  if (modality === "audio") return "Audio/voix future, non active dans Proto06 V1.2.";
  if (modality === "realtime") return "Recherche vocale temps reel future, environnement controle uniquement.";
  return "Usage a documenter.";
}

function shortDescriptionFor(model) {
  const modality = model.modality;
  if (modality === "text") return "Modele texte synchronise depuis le provider, a evaluer avant usage pedagogique.";
  if (modality === "embedding") return "Modele d'embeddings non generatif pour recherche ou indexation.";
  if (modality === "moderation") return "Modele de moderation, non destine a generer des reponses.";
  if (modality === "image") return "Modele image, non utilise par Prototype 06.";
  if (modality === "audio_transcription") return "Modele de transcription audio, non generatif pour les personnages.";
  if (modality === "audio") return "Modele audio ou voix, non active dans le parcours apprenant.";
  if (modality === "realtime") return "Modele temps reel avance, preparatoire et desactive par defaut.";
  return "Modele synchronise, metadata a completer.";
}

function defaultAllowedForRuntime(modality, recommendation) {
  return modality === "text" && ["recommended", "candidate", "experimental"].includes(recommendation);
}

function enrichModel(model, metadataByKey) {
  const metadata = metadataByKey.get(normalizeKey(model.providerId, model.providerModelId)) || {};
  const modality = metadata.modality || model.modality || inferModality(model.providerModelId);
  const family = metadata.family || model.family || inferFamily(model.providerModelId);
  const status = model.status || "available";
  const costLevel = metadata.costLevel || model.costLevel || inferCostLevel(model.providerModelId, modality, status);
  const recommendation = metadata.icLabRecommendation || model.icLabRecommendation || recommendationFor(model.providerModelId, modality, costLevel, status);
  const pricing = pricingFromMetadata(metadata.pricing ? metadata : model);
  const hasManualPricing = pricing.inputUsd !== null || pricing.cachedInputUsd !== null || pricing.outputUsd !== null;
  const capabilities = metadata.capabilities || model.capabilities || capabilitiesFor(modality, model.providerModelId);
  const runtimeDefault = defaultAllowedForRuntime(modality, recommendation);
  const allowedForRuntime = model.allowedForRuntime === true || (model.source === "openai-sync" && runtimeDefault);

  return {
    ...model,
    title: metadata.title || model.title || model.providerModelId,
    shortDescription: metadata.shortDescription || model.shortDescription || shortDescriptionFor({ modality }),
    family,
    modality,
    capabilities,
    recommendedUse: metadata.recommendedUse || model.recommendedUse || recommendedUseFor(modality, recommendation),
    icLabRecommendation: recommendation,
    costLevel: costLevel === "unknown" ? inferCostLevel(model.providerModelId, modality, status) : costLevel,
    pricing,
    pricingKnown: hasManualPricing,
    pricingDisplay: hasManualPricing ? "Prix renseigne" : (["embedding", "moderation"].includes(modality) ? "Non pertinent ou a completer" : "Prix non renseigne"),
    allowedForRuntime,
    notes: model.notes || metadata.adminNotes || "",
    adminNotes: metadata.adminNotes || model.adminNotes || ""
  };
}

function enrichModels(models, metadataStore = {}) {
  const metadataByKey = new Map((metadataStore.metadata || []).map((item) => [
    normalizeKey(item.providerId, item.providerModelId),
    item
  ]));
  return (models || []).map((model) => enrichModel(model, metadataByKey));
}

module.exports = {
  enrichModel,
  enrichModels,
  inferModality,
  inferFamily
};
