function hasOpenAiApiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAiProviderStatus(provider = {}) {
  return {
    id: provider.id || "openai",
    status: provider.status || "planned",
    hasApiKey: hasOpenAiApiKey(),
    hasOrgId: Boolean(process.env.OPENAI_ORG_ID),
    hasProjectId: Boolean(process.env.OPENAI_PROJECT_ID),
    hasDefaultModel: Boolean(process.env.OPENAI_DEFAULT_MODEL),
    supportsModelSync: Boolean(provider.supportsModelSync ?? true)
  };
}

function safeModelId(providerModelId) {
  return `openai_${String(providerModelId || "model").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

function inferFamily(providerModelId) {
  const id = String(providerModelId || "").toLowerCase();
  if (id.startsWith("gpt-5")) return "gpt-5";
  if (id.startsWith("gpt-4")) return "gpt-4";
  if (id.includes("embed")) return "embedding";
  if (id.includes("tts") || id.includes("voice") || id.includes("audio")) return "audio";
  return id.split("-").slice(0, 2).join("-") || "openai";
}

function inferModality(providerModelId) {
  const id = String(providerModelId || "").toLowerCase();
  if (id.includes("embed")) return "embedding";
  if (id.includes("tts") || id.includes("voice") || id.includes("audio") || id.includes("transcribe")) return "audio";
  if (id.includes("realtime")) return "realtime";
  return "text";
}

function inferCapabilities(providerModelId) {
  const modality = inferModality(providerModelId);
  if (modality === "embedding") return ["embeddings"];
  if (modality === "audio") return ["audio"];
  if (modality === "realtime") return ["text", "audio", "realtime"];
  return ["text"];
}

function normalizeOpenAiModel(apiModel, stamp) {
  const providerModelId = String(apiModel.id || "").trim();
  return {
    id: safeModelId(providerModelId),
    providerId: "openai",
    providerModelId,
    title: providerModelId,
    family: inferFamily(providerModelId),
    modality: inferModality(providerModelId),
    capabilities: inferCapabilities(providerModelId),
    status: "available",
    source: "openai-sync",
    contextWindow: null,
    costLevel: "unknown",
    recommendedUse: "",
    allowedForTeachers: false,
    allowedForStudents: false,
    allowedForRuntime: false,
    notes: "",
    createdAt: stamp,
    updatedAt: stamp,
    lastSeenAt: stamp
  };
}

async function listOpenAiModelsFromApi() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY absente.");
    error.code = "OPENAI_API_KEY_MISSING";
    throw error;
  }

  const headers = {
    authorization: `Bearer ${process.env.OPENAI_API_KEY}`
  };
  if (process.env.OPENAI_ORG_ID) headers["openai-organization"] = process.env.OPENAI_ORG_ID;
  if (process.env.OPENAI_PROJECT_ID) headers["openai-project"] = process.env.OPENAI_PROJECT_ID;

  const response = await fetch("https://api.openai.com/v1/models", { headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || `OpenAI models HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return Array.isArray(body.data) ? body.data : [];
}

async function syncOpenAiModels({ readModelsStore, writeModelsStore, now }) {
  const stamp = now();
  const store = await readModelsStore();
  const existing = Array.isArray(store.models) ? store.models : [];
  const apiModels = await listOpenAiModelsFromApi();
  const synced = apiModels.map((model) => normalizeOpenAiModel(model, stamp));
  const byId = new Map(existing.map((model) => [model.id, model]));

  synced.forEach((model) => {
    const previous = byId.get(model.id);
    byId.set(model.id, {
      ...previous,
      ...model,
      createdAt: previous?.createdAt || model.createdAt,
      allowedForTeachers: previous?.allowedForTeachers ?? model.allowedForTeachers,
      allowedForStudents: previous?.allowedForStudents ?? model.allowedForStudents,
      allowedForRuntime: previous?.allowedForRuntime ?? model.allowedForRuntime,
      recommendedUse: previous?.recommendedUse || model.recommendedUse,
      shortDescription: previous?.shortDescription || model.shortDescription || "",
      icLabRecommendation: previous?.icLabRecommendation || model.icLabRecommendation || "",
      pricing: previous?.pricing || model.pricing || null,
      adminNotes: previous?.adminNotes || model.adminNotes || "",
      notes: previous?.notes || model.notes,
      costLevel: previous?.costLevel || model.costLevel
    });
  });

  const seenIds = new Set(synced.map((model) => model.id));
  existing.forEach((model) => {
    if (model.source === "openai-sync" && !seenIds.has(model.id)) {
      byId.set(model.id, {
        ...model,
        status: model.status === "available" ? "stale" : model.status,
        updatedAt: stamp
      });
    }
  });

  const next = {
    version: "0.8",
    updatedAt: stamp,
    models: [...byId.values()].sort((a, b) =>
      `${a.providerId}:${a.providerModelId}`.localeCompare(`${b.providerId}:${b.providerModelId}`)
    )
  };
  await writeModelsStore(next);
  return {
    syncedCount: synced.length,
    totalModels: next.models.length,
    models: next.models
  };
}

module.exports = {
  getOpenAiProviderStatus,
  listOpenAiModelsFromApi,
  syncOpenAiModels
};
