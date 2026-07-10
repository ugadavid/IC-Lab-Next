const http = require("node:http");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const openAiModels = require("./ai/openaiModels");
const modelMetadataEnrichment = require("./ai/modelMetadataEnrichment");
const openAiRuntime = require("./ai/openaiRuntime");

const PORT = Number(process.env.PORT || 8790);
const VERSION = "0.10.1";
const SERVICE = "ic-hub-local";
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DOCS_DIR = path.join(ROOT_DIR, "docs");
const DATA_DIR = path.join(__dirname, "data");
const WORKSPACE_DIR = path.resolve(ROOT_DIR, "..", "..");

function loadRootEnv() {
  const envPath = path.join(WORKSPACE_DIR, ".env");
  if (!fsSync.existsSync(envPath)) return;
  try {
    require("dotenv").config({ path: envPath, override: false, quiet: true });
    return;
  } catch {}
  const raw = fsSync.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadRootEnv();

const STORE_MODE = (process.env.IC_HUB_STORE || "json").toLowerCase();
let mariaDbStore = null;
let mariaDbAvailable = false;
let lastMariaDbError = null;

const stores = {
  users: "users.json",
  sessions: "sessions.json",
  courses: "courses.json",
  enrollments: "enrollments.json",
  assignments: "course-activities.json",
  prototypes: "prototypes.json",
  runs: "runs.json",
  institutions: "institutions.json",
  ownership: "activity-ownership.json",
  sharingSpaces: "sharing-spaces.json",
  aiConfigs: "ai-configs.json",
  aiProviders: "ai-providers.json",
  aiModels: "ai-models.json",
  aiModelMetadata: "ai-model-metadata.json",
  proto06Manifests: "proto06-manifests.json"
};

const jsonWriteQueues = new Map();
const proto06SandboxAccessGrants = new Map();
const PROTO06_SANDBOX_ID = "proto06-v1.3-alpha";
const PROTO06_SANDBOX_URL = "http://127.0.0.1:8788/sandbox-1.3-alpha.html";
const PROTO06_SANDBOX_ACCESS_TTL_MS = 5 * 60 * 1000;

const defaultStores = {
  users: { users: [] },
  sessions: { sessions: [] },
  courses: { courses: [] },
  enrollments: { enrollments: [] },
  assignments: { assignments: [] },
  runs: { version: "0.3.1", updatedAt: "2026-07-02T00:00:00.000Z", runs: [] },
  institutions: {
    version: "0.4",
    institutions: [
      {
        id: "inst_uga",
        name: "Universite Grenoble Alpes",
        shortName: "UGA",
        type: "university",
        country: "France",
        status: "active",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      },
      {
        id: "inst_repli4c",
        name: "REPLI4C",
        shortName: "REPLI4C",
        type: "project",
        country: "international",
        status: "active",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      }
    ]
  },
  ownership: {
    version: "0.4",
    records: [
      {
        id: "own_proto06_climateObservations001_server",
        prototypeId: "proto06",
        activityId: "climateObservations001",
        activitySource: "server",
        title: "Comprendre des constats climatiques",
        ownerId: "user_teacher_demo",
        createdBy: "user_teacher_demo",
        updatedBy: "user_teacher_demo",
        institutionId: "inst_uga",
        visibility: "course",
        provenance: {
          kind: "external-prototype",
          sourcePrototype: "proto06",
          sourceActivityId: "climateObservations001",
          importedAt: "2026-07-02T00:00:00.000Z",
          registeredBy: "user_teacher_demo"
        },
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      }
    ]
  },
  sharingSpaces: {
    version: "0.5",
    spaces: [
      {
        id: "space_repli4c",
        name: "REPLI4C",
        type: "project",
        institutionId: "inst_repli4c",
        visibility: "shared",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      },
      {
        id: "space_uga",
        name: "UGA",
        type: "institution",
        institutionId: "inst_uga",
        visibility: "institution",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      }
    ]
  },
  aiConfigs: {
    version: "0.7",
    configs: [
      {
        id: "aicfg_proto06_scripted_browser_voice",
        title: "Mode scenarise + voix navigateur",
        description: "Aucune IA generative. Temoignages scenarises et synthese vocale navigateur.",
        prototypeId: "proto06",
        mode: "scripted",
        provider: "none",
        modelId: null,
        voiceMode: "browser",
        voiceProvider: "browser",
        estimatedCostLevel: "free",
        estimatedCostNotes: "Aucun cout API.",
        maxDurationSeconds: 600,
        languagePolicy: "participant-language-only",
        pedagogicalRole: "participant",
        allowParticipantAgents: true,
        allowTutorAgent: false,
        allowObserverAgent: false,
        costVisibleToTeacher: true,
        requiresApiKey: false,
        status: "active",
        warnings: ["Qualite des voix variable selon navigateur et systeme."],
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      },
      {
        id: "aicfg_proto06_llm_text_browser_voice",
        title: "IA texte future + voix navigateur",
        description: "Mode preparatoire pour generation texte future, avec restitution vocale par le navigateur.",
        prototypeId: "proto06",
        mode: "llm-text",
        provider: "future-provider",
        modelId: null,
        voiceMode: "browser",
        voiceProvider: "browser",
        estimatedCostLevel: "medium",
        estimatedCostNotes: "Cout dependant du modele texte et du volume de tokens.",
        maxDurationSeconds: 600,
        languagePolicy: "participant-language-only",
        pedagogicalRole: "participant",
        allowParticipantAgents: true,
        allowTutorAgent: false,
        allowObserverAgent: false,
        costVisibleToTeacher: true,
        requiresApiKey: true,
        status: "prototype",
        warnings: ["Aucun appel IA reel en V0.7.", "Verifier strictement le maintien de chaque agent dans sa langue."],
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      },
      {
        id: "aicfg_proto06_llm_text_api_voice",
        title: "IA texte future + voix API",
        description: "Mode prevu pour combiner generation texte et voix API future.",
        prototypeId: "proto06",
        mode: "llm-text-api-voice",
        provider: "future-provider",
        modelId: null,
        voiceMode: "api",
        voiceProvider: "future-voice-provider",
        estimatedCostLevel: "high",
        estimatedCostNotes: "Cout dependant de la duree audio et du modele vocal.",
        maxDurationSeconds: 480,
        languagePolicy: "participant-language-only",
        pedagogicalRole: "participant",
        allowParticipantAgents: true,
        allowTutorAgent: false,
        allowObserverAgent: false,
        costVisibleToTeacher: true,
        requiresApiKey: true,
        status: "planned",
        warnings: ["Aucune voix API n'est appelee en V0.7.", "Surveiller les couts avant activation."],
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      },
      {
        id: "aicfg_proto06_realtime_voice_agent",
        title: "Agent vocal temps reel futur",
        description: "Mode experimental prevu pour interaction vocale temps reel, avec limite de duree stricte.",
        prototypeId: "proto06",
        mode: "realtime-voice",
        provider: "future-realtime-provider",
        modelId: null,
        voiceMode: "realtime",
        voiceProvider: "future-realtime-provider",
        estimatedCostLevel: "very-high",
        estimatedCostNotes: "Mode a limiter strictement dans le temps.",
        maxDurationSeconds: 300,
        languagePolicy: "participant-language-only",
        pedagogicalRole: "participant",
        allowParticipantAgents: true,
        allowTutorAgent: false,
        allowObserverAgent: true,
        costVisibleToTeacher: true,
        requiresApiKey: true,
        status: "experimental",
        warnings: ["Mode non branche en V0.7.", "Risque de cout eleve et de derives conversationnelles."],
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      },
      {
        id: "aicfg_proto06_multi_agent_experimental",
        title: "Multi-agents experimental",
        description: "Mode de recherche pour plusieurs agents IA futurs, chacun tenu de rester dans sa langue.",
        prototypeId: "proto06",
        mode: "multi-agent",
        provider: "future-provider",
        modelId: null,
        voiceMode: "mixed",
        voiceProvider: "future-provider",
        estimatedCostLevel: "very-high",
        estimatedCostNotes: "Cout eleve probable, dependant du nombre d'agents et de la duree.",
        maxDurationSeconds: 300,
        languagePolicy: "participant-language-only",
        pedagogicalRole: "multi-agent",
        allowParticipantAgents: true,
        allowTutorAgent: true,
        allowObserverAgent: true,
        costVisibleToTeacher: true,
        requiresApiKey: true,
        status: "research",
        warnings: ["Risque pedagogique eleve.", "Aucun agent IA n'est lance en V0.7.", "Chaque agent devra rester dans sa langue."],
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z"
      }
    ],
    activityConfigs: []
  },
  aiProviders: {
    version: "0.8",
    providers: []
  },
  aiModels: {
    version: "0.8",
    models: []
  },
  aiModelMetadata: {
    version: "0.8.1",
    metadata: []
  },
  proto06Manifests: {
    version: "0.9.8",
    updatedAt: "2026-07-03T00:00:00.000Z",
    manifests: []
  },
  prototypes: {
    prototypes: [
      {
        id: "proto06",
        title: "Rencontre plurilingue REPLI4C",
        description: "Composer et lancer des activites d'intercomprehension orale incarnee.",
        status: "connected-local",
        entryUrl: "../../06-voice-agent-ic/library-1.1.html",
        baseUrl: "http://127.0.0.1:8788",
        libraryUrl: "http://127.0.0.1:8788/library-1.1.html",
        activityApiUrl: "http://127.0.0.1:8788/api/activities",
        launchUrl: "http://127.0.0.1:8788/index-1.2.3.html",
        supportsActivities: true,
        tags: ["REPLI4C", "oral", "rencontre", "activite"]
      },
      {
        id: "seven-sieves",
        title: "Seven Sieves",
        description: "Explorer la comprehension ecrite par tamis d'intercomprehension.",
        status: "planned",
        entryUrl: "",
        tags: ["lecture", "IC", "tamis"]
      },
      {
        id: "dico-ic",
        title: "Dico-IC",
        description: "Base de connaissances lexicale et intercomprehension.",
        status: "planned",
        entryUrl: "",
        tags: ["lexique", "API", "ressources"]
      },
      {
        id: "augmented-video",
        title: "Video augmentee IC",
        description: "Observer des strategies d'intercomprehension dans une video annotee.",
        status: "planned",
        entryUrl: "",
        tags: ["video", "observation", "strategies"]
      }
    ]
  }
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password, user) {
  const { passwordHash } = hashPassword(password, user.passwordSalt);
  const expected = Buffer.from(user.passwordHash || "", "hex");
  const actual = Buffer.from(passwordHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function dataFile(name) {
  if (!stores[name]) {
    throw new Error(`Store inconnu: ${name}`);
  }
  return path.join(DATA_DIR, stores[name]);
}

async function ensureStoreFile(name) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = dataFile(name);
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, `${JSON.stringify(defaultStores[name], null, 2)}\n`);
    console.log(`[startup] created data file ${stores[name]}`);
  }
}

function freshDefaultStore(name) {
  return structuredClone(defaultStores[name]);
}

async function recoverCorruptJsonStore(name) {
  await ensureStoreFile(name);
  const file = dataFile(name);
  try {
    JSON.parse(await fs.readFile(file, "utf8"));
    return false;
  } catch (error) {
    const stamp = now().replace(/[:.]/g, "-");
    const corruptFile = path.join(DATA_DIR, `${path.basename(stores[name], ".json")}.corrupt.${stamp}.json`);
    console.error(`[startup] ${stores[name]} is corrupt: ${error.message}`);
    try {
      await fs.rename(file, corruptFile);
      console.error(`[startup] corrupt ${stores[name]} saved as ${path.basename(corruptFile)}`);
    } catch (renameError) {
      console.error(`[startup] failed to save corrupt ${stores[name]}: ${renameError.message}`);
    }
    const cleanStore = freshDefaultStore(name);
    cleanStore.updatedAt = now();
    await fs.writeFile(file, `${JSON.stringify(cleanStore, null, 2)}\n`);
    console.log(`[startup] recreated clean ${stores[name]}`);
    return true;
  }
}

async function readJson(name) {
  if (STORE_MODE === "mariadb" && mariaDbAvailable && mariaDbStore) {
    try {
      return await mariaDbStore.readStore(name);
    } catch (error) {
      mariaDbAvailable = false;
      lastMariaDbError = error.message;
      console.error(`[db] MariaDB read failed for ${name}, falling back to JSON: ${error.message}`);
    }
  }
  await ensureStoreFile(name);
  const file = dataFile(name);
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : freshDefaultStore(name);
  } catch (error) {
    console.error(`[data] failed to read ${stores[name]}: ${error.message}`);
    throw new Error(`Lecture JSON impossible: ${stores[name]}`);
  }
}

async function readLocalJson(name) {
  await ensureStoreFile(name);
  const file = dataFile(name);
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : freshDefaultStore(name);
  } catch (error) {
    console.error(`[data] failed to read ${stores[name]}: ${error.message}`);
    throw new Error(`Lecture JSON impossible: ${stores[name]}`);
  }
}

async function writeJson(name, data) {
  if (STORE_MODE === "mariadb" && mariaDbAvailable && mariaDbStore) {
    try {
      await mariaDbStore.writeStore(name, data);
      return;
    } catch (error) {
      mariaDbAvailable = false;
      lastMariaDbError = error.message;
      console.error(`[db] MariaDB write failed for ${name}, falling back to JSON: ${error.message}`);
    }
  }
  await ensureStoreFile(name);
  const file = dataFile(name);
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    await fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`);
    await fs.rename(temp, file);
  } catch (error) {
    console.error(`[data] failed to write ${stores[name]}: ${error.message}`);
    throw new Error(`Ecriture JSON impossible: ${stores[name]}`);
  }
}

function isMariaDbActive() {
  return STORE_MODE === "mariadb" && mariaDbAvailable && mariaDbStore;
}

async function storeHealth() {
  const activeStore = isMariaDbActive() ? "mariadb" : "json";
  const health = {
    ok: true,
    service: SERVICE,
    version: VERSION,
    store: activeStore,
    requestedStore: STORE_MODE
  };
  if (STORE_MODE !== "mariadb") return health;
  if (!mariaDbStore) {
    return { ...health, db: { ok: false, lastError: lastMariaDbError || "MariaDB store non initialise." } };
  }
  try {
    const db = await mariaDbStore.healthSummary();
    if (db.ok) lastMariaDbError = null;
    return { ...health, store: "mariadb", db: { ...db, lastError: lastMariaDbError } };
  } catch (error) {
    lastMariaDbError = error.message;
    return { ...health, ok: false, store: "json", db: { ok: false, lastError: error.message } };
  }
}

const aiCostLevels = new Set(["free", "low", "medium", "high", "very-high"]);
const aiRoles = new Set(["participant", "tutor", "observer", "multi-agent", "none"]);
const DEFAULT_PROTO06_AI_CONFIG_ID = "aicfg_proto06_scripted_browser_voice";

function parseOptionalPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function normalizeWarnings(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeAiConfig(input, existing = null) {
  const stamp = now();
  const idValue = String(input.id || existing?.id || id("aicfg")).trim();
  return {
    id: idValue,
    title: String(input.title ?? existing?.title ?? idValue).trim(),
    description: String(input.description ?? existing?.description ?? "").trim(),
    prototypeId: String(input.prototypeId ?? existing?.prototypeId ?? "proto06").trim(),
    mode: String(input.mode ?? existing?.mode ?? "scripted").trim(),
    provider: String(input.provider ?? existing?.provider ?? "none").trim(),
    modelId: input.modelId === undefined ? (existing?.modelId ?? null) : (input.modelId ? String(input.modelId).trim() : null),
    modelCatalogId: input.modelCatalogId === undefined ? (existing?.modelCatalogId ?? null) : (input.modelCatalogId ? String(input.modelCatalogId).trim() : null),
    voiceMode: String(input.voiceMode ?? existing?.voiceMode ?? "none").trim(),
    voiceProvider: String(input.voiceProvider ?? existing?.voiceProvider ?? "none").trim(),
    estimatedCostLevel: aiCostLevels.has(input.estimatedCostLevel) ? input.estimatedCostLevel : (existing?.estimatedCostLevel || "free"),
    estimatedCostNotes: String(input.estimatedCostNotes ?? existing?.estimatedCostNotes ?? "").trim(),
    maxDurationSeconds: Number.isFinite(Number(input.maxDurationSeconds ?? existing?.maxDurationSeconds))
      ? Math.max(0, Math.round(Number(input.maxDurationSeconds ?? existing?.maxDurationSeconds)))
      : null,
    languagePolicy: String(input.languagePolicy ?? existing?.languagePolicy ?? "participant-language-only").trim(),
    pedagogicalRole: aiRoles.has(input.pedagogicalRole) ? input.pedagogicalRole : (existing?.pedagogicalRole || "none"),
    allowParticipantAgents: Boolean(input.allowParticipantAgents ?? existing?.allowParticipantAgents ?? false),
    allowTutorAgent: Boolean(input.allowTutorAgent ?? existing?.allowTutorAgent ?? false),
    allowObserverAgent: Boolean(input.allowObserverAgent ?? existing?.allowObserverAgent ?? false),
    costVisibleToTeacher: Boolean(input.costVisibleToTeacher ?? existing?.costVisibleToTeacher ?? true),
    requiresApiKey: Boolean(input.requiresApiKey ?? existing?.requiresApiKey ?? false),
    status: String(input.status ?? existing?.status ?? "planned").trim(),
    warnings: normalizeWarnings(input.warnings ?? existing?.warnings ?? []),
    createdAt: existing?.createdAt || input.createdAt || stamp,
    updatedAt: stamp
  };
}

function normalizeAiProvider(input, existing = null) {
  const stamp = now();
  const idValue = String(input.id || existing?.id || id("provider")).trim();
  return {
    id: idValue,
    title: String(input.title ?? existing?.title ?? idValue).trim(),
    type: String(input.type ?? existing?.type ?? idValue).trim(),
    status: String(input.status ?? existing?.status ?? "planned").trim(),
    apiKeyEnvName: String(input.apiKeyEnvName ?? existing?.apiKeyEnvName ?? "").trim(),
    baseUrl: String(input.baseUrl ?? existing?.baseUrl ?? "").trim(),
    supportsModelSync: Boolean(input.supportsModelSync ?? existing?.supportsModelSync ?? false),
    supportsText: Boolean(input.supportsText ?? existing?.supportsText ?? false),
    supportsAudio: Boolean(input.supportsAudio ?? existing?.supportsAudio ?? false),
    supportsRealtime: Boolean(input.supportsRealtime ?? existing?.supportsRealtime ?? false),
    supportsEmbeddings: Boolean(input.supportsEmbeddings ?? existing?.supportsEmbeddings ?? false),
    notes: String(input.notes ?? existing?.notes ?? "").trim(),
    createdAt: existing?.createdAt || input.createdAt || stamp,
    updatedAt: stamp
  };
}

function normalizeAiModel(input, existing = null) {
  const stamp = now();
  const providerModelId = String(input.providerModelId ?? existing?.providerModelId ?? "").trim();
  const idValue = String(input.id || existing?.id || `model_${providerModelId || crypto.randomUUID()}`).replace(/[^a-zA-Z0-9_]/g, "_");
  return {
    id: idValue,
    providerId: String(input.providerId ?? existing?.providerId ?? "openai").trim(),
    providerModelId,
    title: String(input.title ?? existing?.title ?? (providerModelId || idValue)).trim(),
    shortDescription: String(input.shortDescription ?? existing?.shortDescription ?? "").trim(),
    family: String(input.family ?? existing?.family ?? "").trim(),
    modality: String(input.modality ?? existing?.modality ?? "text").trim(),
    capabilities: Array.isArray(input.capabilities)
      ? input.capabilities.map((item) => String(item).trim()).filter(Boolean)
      : (existing?.capabilities || []),
    status: String(input.status ?? existing?.status ?? "available").trim(),
    source: String(input.source ?? existing?.source ?? "manual").trim(),
    contextWindow: Number.isFinite(Number(input.contextWindow ?? existing?.contextWindow))
      ? Math.max(0, Math.round(Number(input.contextWindow ?? existing?.contextWindow)))
      : null,
    costLevel: String(input.costLevel ?? existing?.costLevel ?? "unknown").trim(),
    icLabRecommendation: String(input.icLabRecommendation ?? existing?.icLabRecommendation ?? "not_reviewed").trim(),
    pricing: {
      unit: String(input.pricing?.unit ?? existing?.pricing?.unit ?? input.pricingUnit ?? existing?.pricingUnit ?? "").trim(),
      inputUsd: parseOptionalPrice(input.pricing?.inputUsd ?? existing?.pricing?.inputUsd ?? input.inputPriceUsd ?? existing?.inputPriceUsd),
      cachedInputUsd: parseOptionalPrice(input.pricing?.cachedInputUsd ?? existing?.pricing?.cachedInputUsd ?? input.cachedInputPriceUsd ?? existing?.cachedInputPriceUsd),
      outputUsd: parseOptionalPrice(input.pricing?.outputUsd ?? existing?.pricing?.outputUsd ?? input.outputPriceUsd ?? existing?.outputPriceUsd),
      source: String(input.pricing?.source ?? existing?.pricing?.source ?? input.pricingSource ?? existing?.pricingSource ?? "").trim(),
      lastCheckedAt: input.pricing?.lastCheckedAt ?? existing?.pricing?.lastCheckedAt ?? input.pricingLastCheckedAt ?? existing?.pricingLastCheckedAt ?? null
    },
    recommendedUse: String(input.recommendedUse ?? existing?.recommendedUse ?? "").trim(),
    allowedForTeachers: Boolean(input.allowedForTeachers ?? existing?.allowedForTeachers ?? false),
    allowedForStudents: Boolean(input.allowedForStudents ?? existing?.allowedForStudents ?? false),
    allowedForRuntime: Boolean(input.allowedForRuntime ?? existing?.allowedForRuntime ?? false),
    notes: String(input.notes ?? existing?.notes ?? "").trim(),
    adminNotes: String(input.adminNotes ?? existing?.adminNotes ?? "").trim(),
    createdAt: existing?.createdAt || input.createdAt || stamp,
    updatedAt: stamp,
    lastSeenAt: input.lastSeenAt ?? existing?.lastSeenAt ?? null
  };
}

function publicAiProvider(provider) {
  const status = provider.type === "openai" ? openAiModels.getOpenAiProviderStatus(provider) : {
    id: provider.id,
    status: provider.status,
    hasApiKey: Boolean(provider.apiKeyEnvName && process.env[provider.apiKeyEnvName]),
    hasDefaultModel: false,
    supportsModelSync: Boolean(provider.supportsModelSync)
  };
  return {
    ...provider,
    hasApiKey: Boolean(status.hasApiKey),
    hasDefaultModel: Boolean(status.hasDefaultModel),
    providerActivable: provider.status === "active" && (!provider.apiKeyEnvName || Boolean(status.hasApiKey))
  };
}

async function aiConfigForAssignment(assignment) {
  const store = await readJson("aiConfigs");
  const configs = Array.isArray(store.configs) ? store.configs : [];
  const configId = assignment.aiConfigId || (assignment.prototypeId === "proto06" ? DEFAULT_PROTO06_AI_CONFIG_ID : null);
  return configs.find((config) => config.id === configId) || null;
}

async function enrichAssignmentsWithAiConfig(assignments) {
  const store = await readJson("aiConfigs");
  const configs = Array.isArray(store.configs) ? store.configs : [];
  return assignments.map((assignment) => {
    const aiConfigId = assignment.aiConfigId || (assignment.prototypeId === "proto06" ? DEFAULT_PROTO06_AI_CONFIG_ID : null);
    const aiConfig = configs.find((config) => config.id === aiConfigId) || null;
    return { ...assignment, aiConfigId, aiConfig };
  });
}

async function getEnrichedAiModelsStore() {
  const [modelsStore, metadataStore] = await Promise.all([
    readJson("aiModels"),
    readLocalJson("aiModelMetadata")
  ]);
  return {
    ...modelsStore,
    version: "0.9.6",
    updatedAt: modelsStore.updatedAt || null,
    models: modelMetadataEnrichment.enrichModels(modelsStore.models || [], metadataStore)
  };
}

async function withJsonWriteLock(name, task) {
  const previous = jsonWriteQueues.get(name) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current, () => current);
  jsonWriteQueues.set(name, queued);
  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release();
    if (jsonWriteQueues.get(name) === queued) {
      jsonWriteQueues.delete(name);
    }
  }
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

function normalizePrototype(prototype) {
  if (prototype.id !== "proto06") return prototype;
  return {
    ...prototype,
    status: prototype.status || "connected-local",
    baseUrl: prototype.baseUrl || "http://127.0.0.1:8788",
    libraryUrl: prototype.libraryUrl || "http://127.0.0.1:8788/library-1.1.html",
    activityApiUrl: prototype.activityApiUrl || "http://127.0.0.1:8788/api/activities",
    launchUrl: prototype.launchUrl || "http://127.0.0.1:8788/index-1.2.3.html",
    supportsActivities: true
  };
}

async function getPrototypesStore() {
  const store = await readJson("prototypes");
  store.prototypes = (store.prototypes || []).map(normalizePrototype);
  return store;
}

function proto06ActivitySnapshot(activity) {
  return {
    title: activity.title || activity.id,
    pedagogicalGoal: activity.pedagogicalGoal || "",
    scenarioId: activity.scenarioId || "",
    characterIds: Array.isArray(activity.characterIds) ? activity.characterIds : []
  };
}

const publishedManifestStatuses = new Set(["published", "human-reviewed"]);
const reviewedManifestSources = new Set(["human-reviewed", "human_reviewed", "reviewed"]);
const forbiddenManifestKeys = new Set([
  "apikey",
  "openaiapikey",
  "launchtoken",
  "prompt",
  "provider",
  "modelid",
  "providermodelid"
]);

function hasForbiddenManifestKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasForbiddenManifestKey);
  return Object.entries(value).some(([key, nestedValue]) =>
    forbiddenManifestKeys.has(String(key).toLowerCase()) || hasForbiddenManifestKey(nestedValue)
  );
}

function validatePublishedProto06Manifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") errors.push("manifest absent");
  if (manifest?.schema !== "ic-lab-proto06-activity-manifest") errors.push("schema invalide");
  if (!manifest?.schemaVersion) errors.push("schemaVersion manquant");
  if (!manifest?.manifestId) errors.push("manifestId manquant");
  if (!publishedManifestStatuses.has(manifest?.status)) errors.push("status non publie");
  if (manifest?.review?.reviewStatus !== "human-reviewed") errors.push("review.reviewStatus non valide");
  if (manifest?.prototype?.id !== "proto06") errors.push("prototype.id non valide");
  if (!Array.isArray(manifest?.characters) || manifest.characters.length < 1) errors.push("characters[] manquant");
  if (!Array.isArray(manifest?.meeting?.steps) || manifest.meeting.steps.length < 1) errors.push("meeting.steps[] manquant");

  (manifest?.meeting?.steps || []).forEach((step, index) => {
    if (!step.characterId) errors.push(`step ${index} characterId manquant`);
    if (!step.text) errors.push(`step ${index} text manquant`);
    if (!step.languageId) errors.push(`step ${index} languageId manquant`);
    if (step.generated !== false) errors.push(`step ${index} generated non false`);
    if (!reviewedManifestSources.has(String(step.source || ""))) {
      errors.push(`step ${index} source non relue`);
    }
  });

  if (manifest?.safety?.generatedLive !== false) errors.push("safety.generatedLive non false");
  if (manifest?.safety?.openAiInLearnerFlow !== false) errors.push("safety.openAiInLearnerFlow non false");
  if (manifest?.safety?.containsLearnerText !== false) errors.push("safety.containsLearnerText non false");
  if (manifest?.safety?.containsApiKey !== false) errors.push("safety.containsApiKey non false");
  if (hasForbiddenManifestKey(manifest)) errors.push("champ interdit present");
  return errors;
}

function publicProto06ManifestSummary(manifest) {
  return {
    manifestId: manifest.manifestId,
    title: manifest.title || "",
    shortTitle: manifest.shortTitle || "",
    status: manifest.status,
    prototype: {
      id: manifest.prototype?.id || ""
    },
    targetLanguages: Array.isArray(manifest.targetLanguages) ? manifest.targetLanguages : [],
    climateThemes: Array.isArray(manifest.climateThemes) ? manifest.climateThemes : [],
    review: {
      reviewStatus: manifest.review?.reviewStatus || ""
    }
  };
}

async function readPublishedProto06Manifests() {
  const store = await readLocalJson("proto06Manifests");
  const manifests = Array.isArray(store.manifests) ? store.manifests : [];
  return manifests.filter((manifest) => {
    const errors = validatePublishedProto06Manifest(manifest);
    if (errors.length) {
      console.error(`[proto06-manifest] hidden ${manifest?.manifestId || "unknown"}: ${errors.join("; ")}`);
      return false;
    }
    return true;
  });
}

async function findPublishedProto06Manifest(manifestId) {
  const normalizedManifestId = String(manifestId || "").trim();
  if (!normalizedManifestId) return null;
  const manifests = await readPublishedProto06Manifests();
  return manifests.find((manifest) => manifest.manifestId === normalizedManifestId) || null;
}

async function requirePublishedProto06Manifest(manifestId) {
  const manifest = await findPublishedProto06Manifest(manifestId);
  if (!manifest) {
    const error = new Error("Manifest Proto06 introuvable ou non publiable.");
    error.statusCode = 400;
    throw error;
  }
  return manifest;
}

function manifestAssignmentSnapshot(manifest, existingSnapshot = null) {
  const baseSnapshot = existingSnapshot && typeof existingSnapshot === "object" && !Array.isArray(existingSnapshot)
    ? existingSnapshot
    : {};
  return {
    title: baseSnapshot.title || manifest.title || manifest.activityId || manifest.manifestId,
    pedagogicalGoal: baseSnapshot.pedagogicalGoal || manifest.pedagogicalScenario?.pedagogicalGoal || "",
    scenarioId: baseSnapshot.scenarioId || manifest.pedagogicalScenario?.id || "",
    characterIds: Array.isArray(baseSnapshot.characterIds)
      ? baseSnapshot.characterIds
      : (Array.isArray(manifest.characters) ? manifest.characters.map((character) => character.id).filter(Boolean) : []),
    manifestId: manifest.manifestId,
    manifestStatus: manifest.status,
    reviewStatus: manifest.review?.reviewStatus || ""
  };
}

async function handleProto06Manifests(request, response, url) {
  const listMatch = url.pathname === "/api/proto06/manifests";
  const detailMatch = url.pathname.match(/^\/api\/proto06\/manifests\/([^/]+)$/);
  if (!listMatch && !detailMatch) return false;
  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Methode non autorisee." });
  }

  const manifests = await readPublishedProto06Manifests();
  if (listMatch) {
    return sendJson(response, 200, {
      version: VERSION,
      manifests: manifests.map(publicProto06ManifestSummary)
    });
  }

  const manifestId = decodeURIComponent(detailMatch[1]);
  const manifest = manifests.find((item) => item.manifestId === manifestId);
  if (!manifest) {
    return sendJson(response, 404, { error: "Manifest Proto06 introuvable." });
  }
  return sendJson(response, 200, manifest);
}

const visibilityValues = new Set(["private", "course", "institution", "shared", "public"]);

function normalizeVisibility(value, fallback = "course") {
  return visibilityValues.has(value) ? value : fallback;
}

function ownershipIdFor(prototypeId, activityId, activitySource) {
  return `own_${String(prototypeId).replace(/[^a-z0-9]+/gi, "_")}_${String(activityId).replace(/[^a-z0-9]+/gi, "_")}_${String(activitySource).replace(/[^a-z0-9]+/gi, "_")}`;
}

async function findUserInstitution(userId) {
  const usersStore = await readJson("users");
  return usersStore.users.find((item) => item.id === userId)?.institutionId || null;
}

async function ensureActivityOwnershipRecord({ assignment, course, user, title }) {
  return withJsonWriteLock("ownership", async () => {
    const ownershipStore = await readJson("ownership");
    ownershipStore.version = "0.4";
    ownershipStore.records = Array.isArray(ownershipStore.records) ? ownershipStore.records : [];
    const activitySource = assignment.activitySource || "server";
    const existing = ownershipStore.records.find((record) =>
      record.prototypeId === assignment.prototypeId &&
      record.activityId === assignment.activityId &&
      record.activitySource === activitySource
    );
    if (existing) {
      return existing;
    }

    const stamp = now();
    const institutionId = course?.institutionId || user.institutionId || (await findUserInstitution(user.id));
    const record = {
      id: ownershipIdFor(assignment.prototypeId, assignment.activityId, activitySource),
      prototypeId: assignment.prototypeId,
      activityId: assignment.activityId,
      activitySource,
      title: title || assignment.activityTitle || assignment.activityId,
      ownerId: user.id,
      createdBy: user.id,
      updatedBy: user.id,
      institutionId: institutionId || null,
      visibility: "course",
      provenance: {
        kind: "external-prototype",
        sourcePrototype: assignment.prototypeId,
        sourceActivityId: assignment.activityId,
        importedAt: stamp,
        registeredBy: user.id
      },
      createdAt: stamp,
      updatedAt: stamp
    };
    ownershipStore.records.push(record);
    await writeJson("ownership", ownershipStore);
    console.log(`[ownership] created ${record.id}`);
    return record;
  });
}

function enrichAssignmentWithOwnership(assignment, ownershipStore) {
  const ownership = (ownershipStore.records || []).find((record) =>
    record.prototypeId === assignment.prototypeId &&
    record.activityId === assignment.activityId &&
    record.activitySource === assignment.activitySource
  );
  return ownership ? { ...assignment, ownership } : assignment;
}

function matchingAssignmentsForOwnership(record, assignments) {
  return (assignments || []).filter((assignment) =>
    assignment.prototypeId === record.prototypeId &&
    assignment.activityId === record.activityId &&
    assignment.activitySource === record.activitySource
  );
}

function canViewActivityOwnership(user, record, context = {}) {
  if (!user || !record) return { visible: false, reason: "no-user" };
  if (user.role === "admin") return { visible: true, reason: "admin" };
  if (record.ownerId === user.id) return { visible: true, reason: "owner" };

  const visibility = normalizeVisibility(record.visibility, "course");
  const assignments = matchingAssignmentsForOwnership(record, context.assignments || []);
  const courses = context.courses || [];
  const enrollments = context.enrollments || [];

  if (visibility === "private") {
    return { visible: false, reason: "private" };
  }

  if (visibility === "course") {
    if (user.role === "teacher") {
      const teacherCourseIds = new Set(courses.filter((course) => course.teacherId === user.id).map((course) => course.id));
      if (assignments.some((assignment) => teacherCourseIds.has(assignment.courseId))) {
        return { visible: true, reason: "course-teacher" };
      }
    }
    if (user.role === "student") {
      const studentCourseIds = new Set(enrollments.filter((item) => item.userId === user.id).map((item) => item.courseId));
      if (assignments.some((assignment) => studentCourseIds.has(assignment.courseId))) {
        return { visible: true, reason: "course-student-assigned" };
      }
    }
    return { visible: false, reason: "course-not-assigned-to-user" };
  }

  if (visibility === "institution") {
    if (user.institutionId && record.institutionId && user.institutionId === record.institutionId) {
      return { visible: true, reason: "same-institution" };
    }
    return { visible: false, reason: "different-institution" };
  }

  if (visibility === "shared") {
    if (["teacher", "observer"].includes(user.role)) {
      return { visible: true, reason: "shared-role" };
    }
    return { visible: false, reason: "shared-not-for-role" };
  }

  if (visibility === "public") {
    return { visible: true, reason: "public" };
  }

  return { visible: false, reason: "unknown-visibility" };
}

async function visibleActivityRecordsFor(user) {
  const [ownershipStore, assignmentsStore, coursesStore, enrollmentsStore, aiConfigsStore] = await Promise.all([
    readJson("ownership"),
    readJson("assignments"),
    readJson("courses"),
    readJson("enrollments"),
    readJson("aiConfigs")
  ]);
  const aiConfigs = aiConfigsStore.configs || [];
  const assignmentsWithAiConfig = (assignmentsStore.assignments || []).map((assignment) => {
    const aiConfigId = assignment.aiConfigId || (assignment.prototypeId === "proto06" ? DEFAULT_PROTO06_AI_CONFIG_ID : null);
    return {
      ...assignment,
      aiConfigId,
      aiConfig: aiConfigs.find((config) => config.id === aiConfigId) || null
    };
  });
  const context = {
    assignments: assignmentsWithAiConfig,
    courses: coursesStore.courses || [],
    enrollments: enrollmentsStore.enrollments || []
  };
  const records = (ownershipStore.records || []).map((record) => {
    const access = canViewActivityOwnership(user, record, context);
    return {
      ...record,
      theoreticalVisibility: theoreticalVisibility(record),
      visibilityReason: access.reason,
      assignments: matchingAssignmentsForOwnership(record, context.assignments)
    };
  });
  return user.role === "admin" ? records : records.filter((record) => canViewActivityOwnership(user, record, context).visible);
}

function theoreticalVisibility(record) {
  const visibility = normalizeVisibility(record.visibility, "course");
  if (visibility === "private") return "ownerId et admins";
  if (visibility === "course") return "ownerId, admins, enseignants et etudiants des cours assignes";
  if (visibility === "institution") return "utilisateurs de la meme institution et admins";
  if (visibility === "shared") return "enseignants connectes, observateurs et admins";
  if (visibility === "public") return "tous les utilisateurs connectes";
  return "regle inconnue";
}

async function fetchPrototypeActivities(prototypeId) {
  const store = await getPrototypesStore();
  const prototype = store.prototypes.find((item) => item.id === prototypeId);
  if (!prototype) {
    return {
      prototypeId,
      connectorStatus: "not-found",
      message: "Prototype connector not found.",
      activities: []
    };
  }
  if (!prototype.supportsActivities || !prototype.activityApiUrl) {
    return {
      prototypeId,
      connectorStatus: "unsupported",
      message: "Prototype does not expose activities.",
      activities: []
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(prototype.activityApiUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const rawActivities = Array.isArray(payload) ? payload : payload.activities || [];
    return {
      prototypeId,
      source: "server",
      connectorStatus: "ok",
      activities: rawActivities.map((activity) => ({
        ...activity,
        prototypeId,
        source: activity.source || "server"
      }))
    };
  } catch (error) {
    return {
      prototypeId,
      connectorStatus: "unavailable",
      message: `Prototype 06 backend unavailable on ${prototype.baseUrl || prototype.activityApiUrl}: ${error.message}`,
      activities: []
    };
  }
}

async function prototypeStatuses() {
  const store = await getPrototypesStore();
  const statuses = await Promise.all(store.prototypes.map(async (prototype) => {
    if (!prototype.supportsActivities) {
      return { ...prototype, connectorStatus: "unsupported" };
    }
    const result = await fetchPrototypeActivities(prototype.id);
    return {
      ...prototype,
      connectorStatus: result.connectorStatus,
      connectorMessage: result.message || "",
      activityCount: result.activities.length
    };
  }));
  return { prototypes: statuses };
}

async function ensureSeedData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await Promise.all(Object.keys(stores).map(ensureStoreFile));
  await recoverCorruptJsonStore("runs");
  console.log(`[startup] data directory ${DATA_DIR}`);
  console.log(`[startup] data files ${Object.values(stores).join(", ")}`);

  const usersStore = await readJson("users");
  if (!usersStore.users.length) {
    const stamp = now();
    usersStore.users = [
      {
        id: "user_admin_demo",
        displayName: "Admin demo",
        email: "admin@demo.local",
        role: "admin",
        ...hashPassword("admin"),
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        id: "user_teacher_demo",
        displayName: "Enseignant demo",
        email: "teacher@demo.local",
        role: "teacher",
        ...hashPassword("teacher"),
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        id: "user_student_demo",
        displayName: "Etudiant demo",
        email: "student@demo.local",
        role: "student",
        ...hashPassword("student"),
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        id: "user_observer_demo",
        displayName: "Observateur demo",
        email: "observer@demo.local",
        role: "observer",
        ...hashPassword("observer"),
        createdAt: stamp,
        updatedAt: stamp
      }
    ];
    await writeJson("users", usersStore);
  }

  const coursesStore = await readJson("courses");
  if (!coursesStore.courses.length) {
    const stamp = now();
    coursesStore.courses.push({
      id: "course_demo_repli4c",
      title: "REPLI4C - groupe demo",
      teacherId: "user_teacher_demo",
      description: "Cours demo pour tester les rencontres plurilingues.",
      accessCode: "REPLI4C-DEMO",
      level: "M2 / formation",
      createdAt: stamp,
      updatedAt: stamp
    });
    await writeJson("courses", coursesStore);
  }

  const enrollmentsStore = await readJson("enrollments");
  if (!enrollmentsStore.enrollments.some((item) => item.userId === "user_student_demo" && item.courseId === "course_demo_repli4c")) {
    enrollmentsStore.enrollments.push({
      userId: "user_student_demo",
      courseId: "course_demo_repli4c",
      joinedAt: now()
    });
    await writeJson("enrollments", enrollmentsStore);
  }

  const assignmentsStore = await readJson("assignments");
  if (!assignmentsStore.assignments.length) {
    assignmentsStore.assignments.push({
      id: "assign_demo_001",
      courseId: "course_demo_repli4c",
      prototypeId: "proto06",
      activityId: "climateObservations001",
      activitySource: "catalog",
      assignedBy: "user_teacher_demo",
      createdAt: now()
    });
    await writeJson("assignments", assignmentsStore);
  }

  let usersChanged = false;
  usersStore.users.forEach((user) => {
    const nextInstitutionId = user.email === "teacher@demo.local" || user.email === "student@demo.local"
      ? "inst_uga"
      : null;
    if (!Object.prototype.hasOwnProperty.call(user, "institutionId")) {
      user.institutionId = nextInstitutionId;
      usersChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(user, "createdBy")) {
      user.createdBy = user.role === "admin" ? user.id : "user_admin_demo";
      usersChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(user, "updatedBy")) {
      user.updatedBy = user.createdBy;
      usersChanged = true;
    }
  });
  if (!usersStore.users.some((user) => user.id === "user_teacher_repli4c_demo")) {
    const stamp = now();
    usersStore.users.push({
      id: "user_teacher_repli4c_demo",
      displayName: "Enseignant REPLI4C demo",
      email: "teacher2@demo.local",
      role: "teacher",
      institutionId: "inst_repli4c",
      createdBy: "user_admin_demo",
      updatedBy: "user_admin_demo",
      ...hashPassword("teacher2"),
      createdAt: stamp,
      updatedAt: stamp
    });
    usersChanged = true;
  }
  if (usersChanged) {
    await writeJson("users", usersStore);
    console.log("[startup] migrated users ownership metadata");
  }

  let coursesChanged = false;
  coursesStore.courses.forEach((course) => {
    const teacher = usersStore.users.find((user) => user.id === course.teacherId);
    if (!Object.prototype.hasOwnProperty.call(course, "institutionId")) {
      course.institutionId = teacher?.institutionId || null;
      coursesChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(course, "createdBy")) {
      course.createdBy = course.teacherId || "user_admin_demo";
      coursesChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(course, "updatedBy")) {
      course.updatedBy = course.createdBy;
      coursesChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(course, "ownerId")) {
      course.ownerId = course.teacherId || course.createdBy;
      coursesChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(course, "visibility")) {
      course.visibility = "course";
      coursesChanged = true;
    } else {
      const normalized = normalizeVisibility(course.visibility);
      if (normalized !== course.visibility) {
        course.visibility = normalized;
        coursesChanged = true;
      }
    }
  });
  if (coursesChanged) {
    await writeJson("courses", coursesStore);
    console.log("[startup] migrated courses ownership metadata");
  }

  let assignmentsChanged = false;
  assignmentsStore.assignments.forEach((assignment) => {
    const course = coursesStore.courses.find((item) => item.id === assignment.courseId);
    const assignedBy = assignment.assignedBy || course?.teacherId || "user_admin_demo";
    if (!Object.prototype.hasOwnProperty.call(assignment, "createdBy")) {
      assignment.createdBy = assignedBy;
      assignmentsChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(assignment, "updatedBy")) {
      assignment.updatedBy = assignment.createdBy;
      assignmentsChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(assignment, "institutionId")) {
      assignment.institutionId = course?.institutionId || null;
      assignmentsChanged = true;
    }
    if (!Object.prototype.hasOwnProperty.call(assignment, "visibility")) {
      assignment.visibility = course?.visibility || "course";
      assignmentsChanged = true;
    } else {
      const normalized = normalizeVisibility(assignment.visibility);
      if (normalized !== assignment.visibility) {
        assignment.visibility = normalized;
        assignmentsChanged = true;
      }
    }
    if (assignment.prototypeId === "proto06" && !assignment.aiConfigId) {
      assignment.aiConfigId = DEFAULT_PROTO06_AI_CONFIG_ID;
      assignmentsChanged = true;
    }
  });
  if (assignmentsChanged) {
    await writeJson("assignments", assignmentsStore);
    console.log("[startup] migrated assignments ownership metadata");
  }

  for (const assignment of assignmentsStore.assignments) {
    if (assignment.prototypeId !== "proto06") continue;
    const course = coursesStore.courses.find((item) => item.id === assignment.courseId);
    const owner = usersStore.users.find((item) => item.id === (assignment.assignedBy || assignment.createdBy || course?.teacherId));
    if (course && owner) {
      await ensureActivityOwnershipRecord({
        assignment,
        course,
        user: owner,
        title: assignment.activityTitle || assignment.activitySnapshot?.title || assignment.activityId
      });
    }
  }

  const ownershipSeeds = [
    {
      id: "own_demo_private_teacher",
      prototypeId: "proto06",
      activityId: "demoPrivateTeacher",
      activitySource: "registry",
      title: "Activite privee enseignant demo",
      ownerId: "user_teacher_demo",
      institutionId: "inst_uga",
      visibility: "private"
    },
    {
      id: "own_demo_institution_uga",
      prototypeId: "proto06",
      activityId: "demoInstitutionUga",
      activitySource: "registry",
      title: "Activite institutionnelle UGA",
      ownerId: "user_admin_demo",
      institutionId: "inst_uga",
      visibility: "institution"
    },
    {
      id: "own_demo_shared_repli4c",
      prototypeId: "proto06",
      activityId: "demoSharedRepli4c",
      activitySource: "registry",
      title: "Activite partagee REPLI4C",
      ownerId: "user_teacher_demo",
      institutionId: "inst_repli4c",
      visibility: "shared"
    },
    {
      id: "own_demo_public",
      prototypeId: "proto06",
      activityId: "demoPublic",
      activitySource: "registry",
      title: "Activite publique demo",
      ownerId: "user_teacher_demo",
      institutionId: null,
      visibility: "public"
    }
  ];
  await withJsonWriteLock("ownership", async () => {
    const ownershipStore = await readJson("ownership");
    ownershipStore.version = "0.5";
    ownershipStore.records = Array.isArray(ownershipStore.records) ? ownershipStore.records : [];
    let ownershipChanged = false;
    for (const seed of ownershipSeeds) {
      if (ownershipStore.records.some((record) => record.id === seed.id)) continue;
      const stamp = now();
      ownershipStore.records.push({
        ...seed,
        createdBy: seed.ownerId,
        updatedBy: seed.ownerId,
        provenance: {
          kind: "visibility-demo",
          sourcePrototype: seed.prototypeId,
          sourceActivityId: seed.activityId,
          importedAt: stamp,
          registeredBy: seed.ownerId
        },
        createdAt: stamp,
        updatedAt: stamp
      });
      ownershipChanged = true;
    }
    if (ownershipChanged) {
      await writeJson("ownership", ownershipStore);
      console.log("[startup] seeded V0.5 visibility ownership records");
    }
  });
}

function sendJson(response, status, body) {
  if (response.headersSent || response.writableEnded) {
    console.error(`[http] response already sent, skipped ${status}`);
    return false;
  }
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-launch-token"
  });
  response.end(JSON.stringify(body, null, 2));
  return true;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const expectedLength = Number(request.headers["content-length"] || 0);
    let body = "";
    let settled = false;
    const timeout = setTimeout(() => {
      fail(new Error("Body JSON incomplet ou non termine."));
    }, 2000);

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalide."));
      }
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    };

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        fail(new Error("Payload trop volumineux."));
        request.destroy();
        return;
      }
      if (expectedLength > 0 && Buffer.byteLength(body) >= expectedLength) {
        finish();
      }
    });
    request.on("end", finish);
    request.on("error", fail);
    request.on("aborted", () => fail(new Error("Requete interrompue.")));
  });
}

async function getAuthUser(request) {
  const auth = request.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const [sessionsStore, usersStore] = await Promise.all([readJson("sessions"), readJson("users")]);
  const hashedToken = hashSessionToken(token);
  const session = sessionsStore.sessions.find((item) => item.token === token || item.tokenHash === hashedToken);
  if (!session) return null;
  const user = usersStore.users.find((item) => item.id === session.userId);
  return user ? { user, session } : null;
}

async function requireUser(request, response) {
  const auth = await getAuthUser(request);
  if (!auth) {
    sendJson(response, 401, { error: "Connexion requise." });
    return null;
  }
  return auth.user;
}

function requireRole(response, user, roles) {
  if (!roles.includes(user.role)) {
    sendJson(response, 403, { error: "Acces refuse pour ce role." });
    return false;
  }
  return true;
}

async function visibleCoursesFor(user) {
  const [coursesStore, enrollmentsStore] = await Promise.all([readJson("courses"), readJson("enrollments")]);
  if (user.role === "admin") return coursesStore.courses;
  if (user.role === "teacher") return coursesStore.courses.filter((course) => course.teacherId === user.id);
  if (user.role === "student") {
    const courseIds = enrollmentsStore.enrollments.filter((item) => item.userId === user.id).map((item) => item.courseId);
    return coursesStore.courses.filter((course) => courseIds.includes(course.id));
  }
  return [];
}

async function canAccessCourse(user, courseId) {
  return (await visibleCoursesFor(user)).some((course) => course.id === courseId);
}

async function canManageCourse(user, courseId) {
  if (user.role === "admin") return true;
  const coursesStore = await readJson("courses");
  return user.role === "teacher" && coursesStore.courses.some((course) => course.id === courseId && course.teacherId === user.id);
}

function hashLaunchToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function buildProto06LaunchUrl(prototype, assignment, runId, launchToken) {
  const base = prototype.launchUrl || "http://127.0.0.1:8788/index-1.2.3.html";
  const aiConfigId = assignment.aiConfigId || DEFAULT_PROTO06_AI_CONFIG_ID;
  const manifestId = assignment.manifestId || assignment.activitySnapshot?.manifestId || "";
  const params = new URLSearchParams();
  if (assignment.activityId) params.set("activityId", assignment.activityId);
  if (manifestId) {
    params.set("activitySource", "hub-manifest");
    params.set("manifestId", manifestId);
  } else {
    params.set("activitySource", assignment.activitySource || "server");
  }
  params.set("courseId", assignment.courseId);
  params.set("assignmentId", assignment.id);
  params.set("runId", runId);
  params.set("launchToken", launchToken);
  if (aiConfigId) params.set("aiConfigId", aiConfigId);
  return `${base}?${params.toString()}`;
}

function compactRunEventPayload(type, payload = {}) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  if (type === "user_answer_submitted") {
    const fallbackText = typeof payload.text === "string" ? payload.text : "";
    const answerLength = Number.isFinite(Number(payload.answerLength))
      ? Math.max(0, Number(payload.answerLength))
      : fallbackText.length;
    return {
      answerLength,
      hasText: Boolean(payload.hasText ?? answerLength > 0),
      timestamp: now()
    };
  }

  const allowedKeys = [
    "activityId",
    "activitySource",
    "scenarioId",
    "characterCount",
    "aiConfigId",
    "status",
    "mode",
    "runtimeEnabled",
    "assignedMode",
    "selectedRuntime",
    "fallback",
    "generated",
    "message",
    "reason",
    "href"
  ];
  return allowedKeys.reduce((safe, key) => {
    if (payload[key] !== undefined) {
      if (key === "href" && typeof payload[key] === "string") {
        try {
          const safeUrl = new URL(payload[key]);
          safeUrl.searchParams.delete("launchToken");
          safe[key] = safeUrl.toString().slice(0, 300);
        } catch {
          safe[key] = payload[key].replace(/([?&]launchToken=)[^&]+/i, "$1[redacted]").slice(0, 300);
        }
      } else {
        safe[key] = typeof payload[key] === "string" ? payload[key].slice(0, 300) : payload[key];
      }
    }
    return safe;
  }, {});
}

function enrichRuns(runs, usersStore, assignmentsStore) {
  return runs.map((run) => {
    const student = usersStore.users.find((item) => item.id === run.studentId);
    const assignment = assignmentsStore.assignments.find((item) => item.id === run.assignmentId);
    return {
      ...run,
      launchTokenHash: undefined,
      studentName: student?.displayName || run.studentId,
      activityTitle: assignment?.activityTitle || assignment?.activitySnapshot?.title || run.activityId,
      eventCount: Array.isArray(run.events) ? run.events.length : 0
    };
  });
}

function publicRuntimeAiConfig(config) {
  if (!config) return null;
  return {
    id: config.id,
    title: config.title,
    description: config.description,
    prototypeId: config.prototypeId,
    mode: config.mode,
    provider: config.provider,
    modelId: config.modelId ?? null,
    modelCatalogId: config.modelCatalogId ?? null,
    voiceMode: config.voiceMode,
    voiceProvider: config.voiceProvider,
    estimatedCostLevel: config.estimatedCostLevel,
    estimatedCostNotes: config.estimatedCostNotes,
    maxDurationSeconds: config.maxDurationSeconds,
    languagePolicy: config.languagePolicy,
    pedagogicalRole: config.pedagogicalRole,
    allowParticipantAgents: Boolean(config.allowParticipantAgents),
    allowTutorAgent: Boolean(config.allowTutorAgent),
    allowObserverAgent: Boolean(config.allowObserverAgent),
    costVisibleToTeacher: Boolean(config.costVisibleToTeacher),
    requiresApiKey: Boolean(config.requiresApiKey),
    status: config.status,
    warnings: Array.isArray(config.warnings) ? config.warnings : [],
    runtimeEnabled: false
  };
}

async function handleRunAiConfig(request, response, url) {
  const match = url.pathname.match(/^\/api\/runs\/([^/]+)\/ai-config$/);
  if (!match || request.method !== "GET") return false;

  const runId = decodeURIComponent(match[1]);
  const launchToken = String(request.headers["x-launch-token"] || url.searchParams.get("launchToken") || "").trim();
  if (!launchToken) {
    return sendJson(response, 401, { error: "Launch token requis." });
  }

  const [runsStore, assignmentsStore, aiConfigsStore] = await Promise.all([
    readJson("runs"),
    readJson("assignments"),
    readJson("aiConfigs")
  ]);
  const run = (runsStore.runs || []).find((item) => item.id === runId);
  if (!run) {
    return sendJson(response, 404, { error: "Run introuvable." });
  }
  if (run.launchTokenHash !== hashLaunchToken(launchToken)) {
    return sendJson(response, 401, { error: "Launch token invalide." });
  }

  const assignment = (assignmentsStore.assignments || []).find((item) => item.id === run.assignmentId);
  if (!assignment) {
    return sendJson(response, 404, { error: "Assignation du run introuvable." });
  }

  const aiConfigId = assignment.aiConfigId || (assignment.prototypeId === "proto06" ? DEFAULT_PROTO06_AI_CONFIG_ID : "");
  if (!aiConfigId) {
    return sendJson(response, 404, { error: "Aucune configuration IA associee a cette assignation." });
  }

  const config = (aiConfigsStore.configs || []).find((item) => item.id === aiConfigId);
  if (!config) {
    return sendJson(response, 404, { error: "Configuration IA introuvable.", aiConfigId });
  }

  return sendJson(response, 200, {
    runId,
    assignmentId: assignment.id,
    aiConfigId,
    runtimeEnabled: false,
    aiConfig: publicRuntimeAiConfig(config)
  });
}

async function handleRuns(request, response, url, user) {
  if (request.method === "POST" && url.pathname === "/api/runs/start") {
    if (!requireRole(response, user, ["student"])) return;
    const body = await readBody(request);
    const courseId = String(body.courseId || "").trim();
    const assignmentId = String(body.assignmentId || "").trim();
    if (!courseId || !assignmentId) {
      return sendJson(response, 400, { error: "courseId et assignmentId sont obligatoires." });
    }
    if (!(await canAccessCourse(user, courseId))) {
      return sendJson(response, 404, { error: "Cours introuvable pour cet etudiant." });
    }

    const [assignmentsStore, prototypesStore] = await Promise.all([
      readJson("assignments"),
      getPrototypesStore()
    ]);
    const assignment = assignmentsStore.assignments.find((item) => item.id === assignmentId && item.courseId === courseId);
    if (!assignment) {
      return sendJson(response, 404, { error: "Assignation introuvable pour ce cours." });
    }
    const prototype = prototypesStore.prototypes.find((item) => item.id === assignment.prototypeId);
    if (!prototype || assignment.prototypeId !== "proto06") {
      return sendJson(response, 400, { error: "Cette assignation ne peut pas encore produire de trace de lancement." });
    }

    const assignmentManifestId = assignment.manifestId || assignment.activitySnapshot?.manifestId || "";
    if (assignmentManifestId) {
      try {
        await requirePublishedProto06Manifest(assignmentManifestId);
      } catch (error) {
        return sendJson(response, error.statusCode || 400, {
          error: "Manifest Proto06 introuvable ou non publiable pour cette assignation.",
          manifestId: assignmentManifestId
        });
      }
    }

    if (isMariaDbActive()) {
      const runId = id("run");
      const launchToken = crypto.randomBytes(32).toString("hex");
      const stamp = now();
      const launchUrl = buildProto06LaunchUrl(prototype, assignment, runId, launchToken);
      const run = {
        id: runId,
        courseId,
        assignmentId,
        prototypeId: assignment.prototypeId,
        activityId: assignment.activityId,
        activitySource: assignmentManifestId ? "hub-manifest" : (assignment.activitySource || "server"),
        studentId: user.id,
        status: "created",
        createdAt: stamp,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        launchTokenHash: hashLaunchToken(launchToken),
        events: []
      };
      await mariaDbStore.createRun(run);
      console.log(`[runs] start ${runId} student=${user.id} assignment=${assignmentId} store=mariadb`);
      return sendJson(response, 201, { runId, launchToken, launchUrl });
    }

    return withJsonWriteLock("runs", async () => {
      const runsStore = await readJson("runs");
      const runId = id("run");
      const launchToken = crypto.randomBytes(32).toString("hex");
      const stamp = now();
      const launchUrl = buildProto06LaunchUrl(prototype, assignment, runId, launchToken);
      const run = {
        id: runId,
        courseId,
        assignmentId,
        prototypeId: assignment.prototypeId,
        activityId: assignment.activityId,
        activitySource: assignmentManifestId ? "hub-manifest" : (assignment.activitySource || "server"),
        studentId: user.id,
        status: "created",
        createdAt: stamp,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        launchTokenHash: hashLaunchToken(launchToken),
        events: []
      };
      runsStore.version = "0.3.1";
      runsStore.updatedAt = stamp;
      runsStore.runs = Array.isArray(runsStore.runs) ? runsStore.runs : [];
      runsStore.runs.push(run);
      await writeJson("runs", runsStore);
      console.log(`[runs] start ${runId} student=${user.id} assignment=${assignmentId}`);
      return sendJson(response, 201, { runId, launchToken, launchUrl });
    });
  }

  return false;
}

async function handleRunEvent(request, response, url) {
  const match = url.pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
  if (!match || request.method !== "POST") return false;

  const allowedTypes = new Set([
    "proto_loaded",
    "activity_loaded",
    "meeting_started",
    "user_answer_submitted",
    "activity_completed",
    "ai_config_resolved",
    "agent_runtime_selected",
    "agent_runtime_fallback",
    "error"
  ]);
  const runId = decodeURIComponent(match[1]);
  const body = await readBody(request);
  const type = String(body.type || "").trim();
  if (!allowedTypes.has(type)) {
    return sendJson(response, 400, { error: "Type d'evenement inconnu." });
  }

  if (isMariaDbActive()) {
    const stamp = now();
    const result = await mariaDbStore.appendRunEvent({
      runId,
      launchToken: body.launchToken,
      type,
      payload: compactRunEventPayload(type, body.payload),
      createdAt: stamp
    });
    if (result.statusCode === 401) {
      console.log(`[runs] rejected event ${type} run=${runId} invalid-token store=mariadb`);
    } else if (result.statusCode === 200) {
      console.log(`[runs] event ${type} run=${runId} store=mariadb`);
    }
    return sendJson(response, result.statusCode, result.body);
  }

  return withJsonWriteLock("runs", async () => {
    const runsStore = await readJson("runs");
    runsStore.runs = Array.isArray(runsStore.runs) ? runsStore.runs : [];
    const run = runsStore.runs.find((item) => item.id === runId);
    if (!run) {
      return sendJson(response, 404, { error: "Run introuvable." });
    }
    if (run.launchTokenHash !== hashLaunchToken(body.launchToken)) {
      console.log(`[runs] rejected event ${type} run=${runId} invalid-token`);
      return sendJson(response, 401, { error: "launchToken invalide." });
    }

    const stamp = now();
    const event = {
      type,
      at: stamp,
      payload: compactRunEventPayload(type, body.payload)
    };
    run.events = Array.isArray(run.events) ? run.events : [];
    run.events.push(event);
    if (type === "proto_loaded" && run.status === "created") {
      run.status = "launched";
    }
    if (type === "meeting_started" && run.status !== "completed") {
      run.status = "started";
      run.startedAt = run.startedAt || stamp;
    }
    if (type === "activity_completed") {
      run.status = "completed";
      run.completedAt = stamp;
      const startTime = Date.parse(run.startedAt || run.createdAt);
      run.durationMs = Number.isFinite(startTime) ? Math.max(0, Date.parse(stamp) - startTime) : null;
    }
    if (type === "error" && run.status !== "completed") {
      run.status = "error";
    }
    runsStore.version = "0.3.1";
    runsStore.updatedAt = stamp;
    await writeJson("runs", runsStore);
    console.log(`[runs] event ${type} run=${runId}`);
    return sendJson(response, 200, { ok: true, eventCount: run.events.length, status: run.status });
  });
}

async function handleAuth(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(request);
    const usersStore = await readJson("users");
    const email = String(body.email || "").toLowerCase().trim();
    const user = usersStore.users.find((item) => item.email.toLowerCase() === email);
    if (!user || !verifyPassword(String(body.password || ""), user)) {
      console.log(`[auth] login failed ${email || "missing-email"}`);
      return sendJson(response, 401, { error: "Email ou mot de passe invalide." });
    }
    const sessionsStore = await readJson("sessions");
    const session = {
      token: crypto.randomBytes(32).toString("hex"),
      userId: user.id,
      createdAt: now(),
      lastSeenAt: now()
    };
    sessionsStore.sessions.push(session);
    await writeJson("sessions", sessionsStore);
    console.log(`[auth] login ok ${user.email} (${user.role})`);
    return sendJson(response, 200, { token: session.token, user: publicUser(user) });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const auth = await getAuthUser(request);
    if (auth) {
      const sessionsStore = await readJson("sessions");
      const authHash = auth.session.tokenHash || hashSessionToken(auth.session.token);
      sessionsStore.sessions = sessionsStore.sessions.filter((item) =>
        item.token !== auth.session.token && item.tokenHash !== authHash
      );
      await writeJson("sessions", sessionsStore);
    }
    return sendJson(response, 200, { ok: true });
  }

  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    const user = await requireUser(request, response);
    if (!user) return;
    return sendJson(response, 200, { user: publicUser(user) });
  }

  return false;
}

async function handleCourses(request, response, url, user) {
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/courses") {
    return sendJson(response, 200, { courses: await visibleCoursesFor(user) });
  }

  if (request.method === "POST" && url.pathname === "/api/courses") {
    if (!requireRole(response, user, ["admin", "teacher"])) return;
    const body = await readBody(request);
    if (!body.title) return sendJson(response, 400, { error: "title est obligatoire." });
    const coursesStore = await readJson("courses");
    const stamp = now();
    const course = {
      id: id("course"),
      title: String(body.title),
      teacherId: user.role === "admin" && body.teacherId ? String(body.teacherId) : user.id,
      description: String(body.description || ""),
      accessCode: String(body.accessCode || `IC-${crypto.randomBytes(3).toString("hex").toUpperCase()}`),
      level: String(body.level || ""),
      institutionId: body.institutionId === undefined ? (user.institutionId || null) : (body.institutionId || null),
      createdBy: user.id,
      updatedBy: user.id,
      ownerId: String(body.ownerId || user.id),
      visibility: normalizeVisibility(body.visibility, "course"),
      createdAt: stamp,
      updatedAt: stamp
    };
    coursesStore.courses.push(course);
    await writeJson("courses", coursesStore);
    return sendJson(response, 201, { course });
  }

  if (request.method === "POST" && url.pathname === "/api/courses/join") {
    if (!requireRole(response, user, ["student"])) return;
    const body = await readBody(request);
    const coursesStore = await readJson("courses");
    const course = coursesStore.courses.find((item) => item.accessCode === String(body.accessCode || "").trim());
    if (!course) return sendJson(response, 404, { error: "Code de cours introuvable." });
    const enrollmentsStore = await readJson("enrollments");
    if (!enrollmentsStore.enrollments.some((item) => item.userId === user.id && item.courseId === course.id)) {
      enrollmentsStore.enrollments.push({ userId: user.id, courseId: course.id, joinedAt: now() });
      await writeJson("enrollments", enrollmentsStore);
    }
    return sendJson(response, 200, { course });
  }

  const courseId = parts[2];
  if (parts.length === 3 && parts[0] === "api" && parts[1] === "courses" && courseId) {
    const coursesStore = await readJson("courses");
    const course = coursesStore.courses.find((item) => item.id === courseId);
    if (!course || !(await canAccessCourse(user, courseId))) return sendJson(response, 404, { error: "Cours introuvable." });

    if (request.method === "GET") return sendJson(response, 200, { course });

    if (request.method === "PUT") {
      if (!(await canManageCourse(user, courseId))) return sendJson(response, 403, { error: "Acces refuse." });
      const body = await readBody(request);
      Object.assign(course, {
        title: body.title ?? course.title,
        description: body.description ?? course.description,
        accessCode: body.accessCode ?? course.accessCode,
        level: body.level ?? course.level,
        institutionId: body.institutionId === undefined ? course.institutionId : (body.institutionId || null),
        ownerId: body.ownerId ?? course.ownerId,
        visibility: body.visibility ? normalizeVisibility(body.visibility, course.visibility || "course") : course.visibility,
        updatedBy: user.id,
        updatedAt: now()
      });
      await writeJson("courses", coursesStore);
      return sendJson(response, 200, { course });
    }

    if (request.method === "DELETE") {
      if (!(await canManageCourse(user, courseId))) return sendJson(response, 403, { error: "Acces refuse." });
      coursesStore.courses = coursesStore.courses.filter((item) => item.id !== courseId);
      await writeJson("courses", coursesStore);
      return sendJson(response, 200, { ok: true, deletedId: courseId });
    }
  }

  if (parts.length >= 4 && parts[0] === "api" && parts[1] === "courses" && parts[3] === "activities") {
    const courseIdForActivities = parts[2];
    if (!(await canAccessCourse(user, courseIdForActivities))) return sendJson(response, 404, { error: "Cours introuvable." });
    const assignmentsStore = await readJson("assignments");

    if (request.method === "GET" && parts.length === 4) {
      const ownershipStore = await readJson("ownership");
      const courseAssignments = assignmentsStore.assignments
        .filter((item) => item.courseId === courseIdForActivities)
        .map((item) => enrichAssignmentWithOwnership(item, ownershipStore));
      const enrichedAssignments = await enrichAssignmentsWithAiConfig(courseAssignments);
      return sendJson(response, 200, {
        assignments: enrichedAssignments
      });
    }

    if (request.method === "POST" && parts.length === 4) {
      if (!(await canManageCourse(user, courseIdForActivities))) return sendJson(response, 403, { error: "Acces refuse." });
      const body = await readBody(request);
      if (!body.prototypeId || !body.activityId || !body.activitySource) {
        return sendJson(response, 400, { error: "prototypeId, activityId et activitySource sont obligatoires." });
      }
      const coursesStore = await readJson("courses");
      const course = coursesStore.courses.find((item) => item.id === courseIdForActivities);
      const requestedAiConfigId = body.aiConfigId ? String(body.aiConfigId) : "";
      const aiConfigsStore = await readJson("aiConfigs");
      const prototypeAiConfigs = (aiConfigsStore.configs || []).filter((config) => config.prototypeId === String(body.prototypeId));
      const fallbackAiConfigId = String(body.prototypeId) === "proto06" ? DEFAULT_PROTO06_AI_CONFIG_ID : null;
      const aiConfigId = requestedAiConfigId || fallbackAiConfigId;
      if (aiConfigId && !prototypeAiConfigs.some((config) => config.id === aiConfigId)) {
        return sendJson(response, 400, { error: "Configuration IA introuvable pour ce prototype." });
      }
      const requestedManifestId = String(body.manifestId || body.activitySnapshot?.manifestId || "").trim();
      let manifest = null;
      if (requestedManifestId) {
        if (String(body.prototypeId) !== "proto06") {
          return sendJson(response, 400, { error: "manifestId est reserve aux assignations Proto06." });
        }
        try {
          manifest = await requirePublishedProto06Manifest(requestedManifestId);
        } catch (error) {
          return sendJson(response, error.statusCode || 400, {
            error: "Manifest Proto06 introuvable ou non publiable.",
            manifestId: requestedManifestId
          });
        }
      }
      const activitySnapshot = manifest
        ? manifestAssignmentSnapshot(manifest, body.activitySnapshot)
        : (body.activitySnapshot && typeof body.activitySnapshot === "object" ? body.activitySnapshot : null);
      const assignment = {
        id: id("assign"),
        courseId: courseIdForActivities,
        prototypeId: String(body.prototypeId),
        activityId: String(body.activityId),
        activitySource: requestedManifestId ? "hub-manifest" : String(body.activitySource),
        activityTitle: String(body.activityTitle || manifest?.title || body.activityId),
        activitySnapshot,
        manifestId: requestedManifestId || null,
        assignedBy: user.id,
        createdBy: user.id,
        updatedBy: user.id,
        institutionId: course?.institutionId || user.institutionId || null,
        visibility: normalizeVisibility(body.visibility, "course"),
        aiConfigId,
        createdAt: now(),
        updatedAt: now()
      };
      if (isMariaDbActive()) {
        const ownership = await mariaDbStore.createAssignmentWithOwnership({
          assignment,
          course,
          user,
          title: assignment.activityTitle || assignment.activitySnapshot?.title || assignment.activityId
        });
        const aiConfig = await aiConfigForAssignment(assignment);
        return sendJson(response, 201, { assignment: { ...assignment, ownership, aiConfig } });
      }
      assignmentsStore.assignments.push(assignment);
      await writeJson("assignments", assignmentsStore);
      const ownership = await ensureActivityOwnershipRecord({
        assignment,
        course,
        user,
        title: assignment.activityTitle || assignment.activitySnapshot?.title || assignment.activityId
      });
      const aiConfig = await aiConfigForAssignment(assignment);
      return sendJson(response, 201, { assignment: { ...assignment, ownership, aiConfig } });
    }

    if (request.method === "DELETE" && parts.length === 5) {
      if (!(await canManageCourse(user, courseIdForActivities))) return sendJson(response, 403, { error: "Acces refuse." });
      const assignmentId = parts[4];
      assignmentsStore.assignments = assignmentsStore.assignments.filter((item) => item.id !== assignmentId);
      await writeJson("assignments", assignmentsStore);
      return sendJson(response, 200, { ok: true, deletedId: assignmentId });
    }
  }

  if (parts.length === 4 && parts[0] === "api" && parts[1] === "courses" && parts[3] === "runs") {
    const courseIdForRuns = parts[2];
    if (request.method !== "GET") return false;
    if (!(await canAccessCourse(user, courseIdForRuns))) {
      return sendJson(response, 404, { error: "Cours introuvable." });
    }
    const [runsStore, usersStore, assignmentsStore] = await Promise.all([
      readJson("runs"),
      readJson("users"),
      readJson("assignments")
    ]);
    let runs = (runsStore.runs || []).filter((run) => run.courseId === courseIdForRuns);
    if (user.role === "student") {
      runs = runs.filter((run) => run.studentId === user.id);
    } else if (!(await canManageCourse(user, courseIdForRuns))) {
      return sendJson(response, 403, { error: "Acces refuse." });
    }
    runs.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return sendJson(response, 200, { runs: enrichRuns(runs, usersStore, assignmentsStore) });
  }

  return false;
}

async function handleInstitutions(request, response, url, user) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "institutions") return false;

  const institutionsStore = await readJson("institutions");
  institutionsStore.version = "0.4";
  institutionsStore.institutions = Array.isArray(institutionsStore.institutions) ? institutionsStore.institutions : [];

  if (request.method === "GET" && parts.length === 2) {
    return sendJson(response, 200, institutionsStore);
  }

  if (request.method === "GET" && parts.length === 3) {
    const institution = institutionsStore.institutions.find((item) => item.id === parts[2]);
    if (!institution) return sendJson(response, 404, { error: "Institution introuvable." });
    return sendJson(response, 200, { institution });
  }

  if (request.method === "POST" && parts.length === 2) {
    if (!requireRole(response, user, ["admin"])) return;
    const body = await readBody(request);
    const stamp = now();
    const institution = {
      id: String(body.id || id("inst")),
      name: String(body.name || "").trim(),
      shortName: String(body.shortName || body.name || "").trim(),
      type: String(body.type || "organization"),
      country: String(body.country || ""),
      status: String(body.status || "active"),
      createdAt: stamp,
      updatedAt: stamp
    };
    if (!institution.name) return sendJson(response, 400, { error: "name est obligatoire." });
    if (institutionsStore.institutions.some((item) => item.id === institution.id)) {
      return sendJson(response, 409, { error: "Institution deja existante." });
    }
    institutionsStore.institutions.push(institution);
    await writeJson("institutions", institutionsStore);
    return sendJson(response, 201, { institution });
  }

  if (request.method === "PUT" && parts.length === 3) {
    if (!requireRole(response, user, ["admin"])) return;
    const body = await readBody(request);
    const institution = institutionsStore.institutions.find((item) => item.id === parts[2]);
    if (!institution) return sendJson(response, 404, { error: "Institution introuvable." });
    Object.assign(institution, {
      name: body.name ?? institution.name,
      shortName: body.shortName ?? institution.shortName,
      type: body.type ?? institution.type,
      country: body.country ?? institution.country,
      status: body.status ?? institution.status,
      updatedAt: now()
    });
    await writeJson("institutions", institutionsStore);
    return sendJson(response, 200, { institution });
  }

  return false;
}

async function handleActivityOwnership(request, response, url, user) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "activity-ownership") return false;

  const ownershipStore = await readJson("ownership");
  ownershipStore.version = "0.4";
  ownershipStore.records = Array.isArray(ownershipStore.records) ? ownershipStore.records : [];

  if (request.method === "GET" && parts.length === 2) {
    const records = user.role === "admin"
      ? ownershipStore.records.map((record) => ({ ...record, theoreticalVisibility: theoreticalVisibility(record), visibilityReason: "admin" }))
      : await visibleActivityRecordsFor(user);
    return sendJson(response, 200, { version: ownershipStore.version, records });
  }

  if (request.method === "GET" && parts.length === 3) {
    const record = ownershipStore.records.find((item) => item.id === parts[2]);
    if (!record) return sendJson(response, 404, { error: "Fiche de paternite introuvable." });
    const visibleRecords = user.role === "admin"
      ? ownershipStore.records.map((item) => ({ ...item, theoreticalVisibility: theoreticalVisibility(item), visibilityReason: "admin" }))
      : await visibleActivityRecordsFor(user);
    const visibleRecord = visibleRecords.find((item) => item.id === record.id);
    if (!visibleRecord) return sendJson(response, 403, { error: "Acces refuse." });
    return sendJson(response, 200, { record: visibleRecord });
  }

  if (request.method === "PUT" && parts.length === 3) {
    const body = await readBody(request);
    return withJsonWriteLock("ownership", async () => {
      const lockedStore = await readJson("ownership");
      lockedStore.records = Array.isArray(lockedStore.records) ? lockedStore.records : [];
      const record = lockedStore.records.find((item) => item.id === parts[2]);
      if (!record) return sendJson(response, 404, { error: "Fiche de paternite introuvable." });
      if (user.role !== "admin" && record.ownerId !== user.id) {
        return sendJson(response, 403, { error: "Acces refuse." });
      }
      Object.assign(record, {
        title: body.title ?? record.title,
        ownerId: body.ownerId ?? record.ownerId,
        institutionId: body.institutionId === undefined ? record.institutionId : (body.institutionId || null),
        visibility: body.visibility ? normalizeVisibility(body.visibility, record.visibility || "course") : record.visibility,
        notes: body.notes ?? record.notes,
        updatedBy: user.id,
        updatedAt: now()
      });
      await writeJson("ownership", lockedStore);
      return sendJson(response, 200, { record });
    });
  }

  return false;
}

async function handleMeActivities(request, response, url, user) {
  if (request.method !== "GET" || url.pathname !== "/api/me/activities") return false;
  const records = await visibleActivityRecordsFor(user);
  return sendJson(response, 200, { activities: records });
}

async function handleSharingSpaces(request, response, url) {
  if (request.method !== "GET" || url.pathname !== "/api/sharing-spaces") return false;
  return sendJson(response, 200, await readJson("sharingSpaces"));
}

async function handleAiConfigs(request, response, url, user) {
  const parts = url.pathname.split("/").filter(Boolean);
  const canSeeAll = ["admin", "teacher"].includes(user.role);
  const store = await readJson("aiConfigs");
  store.version = "0.7";
  store.configs = Array.isArray(store.configs) ? store.configs : [];
  store.activityConfigs = Array.isArray(store.activityConfigs) ? store.activityConfigs : [];

  if (request.method === "GET" && url.pathname === "/api/ai-configs") {
    const configs = canSeeAll ? store.configs : store.configs.filter((config) => config.status === "active");
    return sendJson(response, 200, { version: store.version, configs });
  }

  if (request.method === "GET" && parts.length === 3 && parts[0] === "api" && parts[1] === "ai-configs") {
    const config = store.configs.find((item) => item.id === decodeURIComponent(parts[2]));
    if (!config || (!canSeeAll && config.status !== "active")) {
      return sendJson(response, 404, { error: "Configuration IA introuvable." });
    }
    return sendJson(response, 200, { config });
  }

  if (request.method === "POST" && url.pathname === "/api/ai-configs") {
    if (!requireRole(response, user, ["admin"])) return;
    const body = await readBody(request);
    return withJsonWriteLock("aiConfigs", async () => {
      const lockedStore = await readJson("aiConfigs");
      lockedStore.version = "0.7";
      lockedStore.configs = Array.isArray(lockedStore.configs) ? lockedStore.configs : [];
      const config = normalizeAiConfig(body);
      if (lockedStore.configs.some((item) => item.id === config.id)) {
        return sendJson(response, 409, { error: "Configuration IA deja existante." });
      }
      lockedStore.configs.push(config);
      lockedStore.activityConfigs = Array.isArray(lockedStore.activityConfigs) ? lockedStore.activityConfigs : [];
      await writeJson("aiConfigs", lockedStore);
      return sendJson(response, 201, { config });
    });
  }

  if (request.method === "PUT" && parts.length === 3 && parts[0] === "api" && parts[1] === "ai-configs") {
    if (!requireRole(response, user, ["admin"])) return;
    const configId = decodeURIComponent(parts[2]);
    const body = await readBody(request);
    return withJsonWriteLock("aiConfigs", async () => {
      const lockedStore = await readJson("aiConfigs");
      lockedStore.version = "0.7";
      lockedStore.configs = Array.isArray(lockedStore.configs) ? lockedStore.configs : [];
      const index = lockedStore.configs.findIndex((item) => item.id === configId);
      if (index === -1) return sendJson(response, 404, { error: "Configuration IA introuvable." });
      const config = normalizeAiConfig({ ...body, id: configId }, lockedStore.configs[index]);
      lockedStore.configs[index] = config;
      lockedStore.activityConfigs = Array.isArray(lockedStore.activityConfigs) ? lockedStore.activityConfigs : [];
      await writeJson("aiConfigs", lockedStore);
      return sendJson(response, 200, { config });
    });
  }

  if (request.method === "GET" && parts.length === 4 && parts[0] === "api" && parts[1] === "prototypes" && parts[3] === "ai-configs") {
    const prototypeId = decodeURIComponent(parts[2]);
    const configs = store.configs.filter((config) =>
      config.prototypeId === prototypeId && (canSeeAll || config.status === "active")
    );
    return sendJson(response, 200, { prototypeId, configs });
  }

  return false;
}

async function handleAdminAi(request, response, url, user) {
  if (!url.pathname.startsWith("/api/admin/ai")) return false;
  if (!requireRole(response, user, ["admin"])) return true;
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/admin/ai/status") {
    const providersStore = await readJson("aiProviders");
    const providers = (providersStore.providers || []).map(publicAiProvider).map((provider) => ({
      id: provider.id,
      status: provider.status,
      hasApiKey: provider.hasApiKey,
      hasDefaultModel: provider.hasDefaultModel,
      supportsModelSync: provider.supportsModelSync,
      providerActivable: provider.providerActivable
    }));
    return sendJson(response, 200, { providers });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/ai/providers") {
    const store = await readJson("aiProviders");
    return sendJson(response, 200, {
      version: store.version || "0.8",
      providers: (store.providers || []).map(publicAiProvider)
    });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/ai/models") {
    const store = await getEnrichedAiModelsStore();
    return sendJson(response, 200, {
      version: store.version || "0.9.6",
      updatedAt: store.updatedAt || null,
      models: Array.isArray(store.models) ? store.models : []
    });
  }

  if (request.method === "GET" && url.pathname === "/api/admin/ai/runtime/status") {
    return sendJson(response, 200, openAiRuntime.getOpenAiRuntimeStatus());
  }

  if (request.method === "POST" && url.pathname === "/api/admin/ai/runtime/smoke-test") {
    const body = await readBody(request);
    const started = Date.now();
    try {
      const store = await getEnrichedAiModelsStore();
      const result = await openAiRuntime.runOpenAiSmokeTest({
        modelCatalogId: String(body.modelCatalogId || "").trim(),
        catalogModels: store.models || []
      });
      console.log(`[admin-ai-runtime] smoke-test model=${result.providerModelId} ok durationMs=${Date.now() - started}`);
      return sendJson(response, 200, result);
    } catch (error) {
      console.error(`[admin-ai-runtime] smoke-test error=${error.code || "OPENAI_RUNTIME_ERROR"} durationMs=${Date.now() - started}`);
      return sendJson(response, error.statusCode || 502, { ok: false, error: error.code || error.message || "OPENAI_RUNTIME_ERROR" });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/admin/ai/runtime/ic-agent-draft") {
    const body = await readBody(request);
    const started = Date.now();
    try {
      const store = await getEnrichedAiModelsStore();
      const result = await openAiRuntime.generateIcAgentDraft({
        modelCatalogId: String(body.modelCatalogId || "").trim(),
        characterId: body.characterId,
        targetLanguage: body.targetLanguage,
        scenarioId: body.scenarioId,
        climateTheme: body.climateTheme,
        maxWords: body.maxWords,
        pedagogicalStrictness: body.pedagogicalStrictness,
        catalogModels: store.models || []
      });
      console.log(`[admin-ai-runtime] ic-agent-draft model=${result.providerModelId} ok durationMs=${Date.now() - started}`);
      return sendJson(response, 200, result);
    } catch (error) {
      console.error(`[admin-ai-runtime] ic-agent-draft error=${error.code || "OPENAI_RUNTIME_ERROR"} durationMs=${Date.now() - started}`);
      return sendJson(response, error.statusCode || 502, { ok: false, error: error.code || error.message || "OPENAI_RUNTIME_ERROR" });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/admin/ai/providers/openai/sync-models") {
    try {
      const result = await openAiModels.syncOpenAiModels({
        readModelsStore: () => readJson("aiModels"),
        writeModelsStore: (store) => writeJson("aiModels", store),
        now
      });
      return sendJson(response, 200, {
        ok: true,
        syncedCount: result.syncedCount,
        totalModels: result.totalModels,
        syncedAt: now(),
        models: (await getEnrichedAiModelsStore()).models
      });
    } catch (error) {
      const status = error.code === "OPENAI_API_KEY_MISSING" ? 400 : 502;
      console.error(`[admin-ai] OpenAI sync failed status=${status}`);
      return sendJson(response, status, { error: error.message });
    }
  }

  if (request.method === "PUT" && parts.length === 5 && parts[3] === "providers") {
    const providerId = decodeURIComponent(parts[4]);
    const body = await readBody(request);
    return withJsonWriteLock("aiProviders", async () => {
      const store = await readJson("aiProviders");
      store.version = "0.8";
      store.providers = Array.isArray(store.providers) ? store.providers : [];
      const index = store.providers.findIndex((provider) => provider.id === providerId);
      if (index === -1) return sendJson(response, 404, { error: "Provider IA introuvable." });
      const existing = store.providers[index];
      const next = normalizeAiProvider({
        ...existing,
        title: body.title ?? existing.title,
        status: body.status ?? existing.status,
        baseUrl: body.baseUrl ?? existing.baseUrl,
        supportsModelSync: body.supportsModelSync ?? existing.supportsModelSync,
        supportsText: body.supportsText ?? existing.supportsText,
        supportsAudio: body.supportsAudio ?? existing.supportsAudio,
        supportsRealtime: body.supportsRealtime ?? existing.supportsRealtime,
        supportsEmbeddings: body.supportsEmbeddings ?? existing.supportsEmbeddings,
        notes: body.notes ?? existing.notes
      }, existing);
      store.providers[index] = next;
      await writeJson("aiProviders", store);
      return sendJson(response, 200, { provider: publicAiProvider(next) });
    });
  }

  if (request.method === "PUT" && parts.length === 5 && parts[3] === "models") {
    const modelId = decodeURIComponent(parts[4]);
    const body = await readBody(request);
    return withJsonWriteLock("aiModels", async () => {
      const store = await readJson("aiModels");
      store.version = "0.8";
      store.models = Array.isArray(store.models) ? store.models : [];
      const index = store.models.findIndex((model) => model.id === modelId);
      if (index === -1) return sendJson(response, 404, { error: "Modele IA introuvable." });
      const existing = store.models[index];
      const next = normalizeAiModel({
        ...existing,
        title: body.title ?? existing.title,
        status: body.status ?? existing.status,
        costLevel: body.costLevel ?? existing.costLevel,
        shortDescription: body.shortDescription ?? existing.shortDescription,
        icLabRecommendation: body.icLabRecommendation ?? existing.icLabRecommendation,
        pricing: {
          unit: body.pricingUnit ?? existing.pricing?.unit ?? "",
          inputUsd: body.inputPriceUsd ?? existing.pricing?.inputUsd ?? null,
          cachedInputUsd: body.cachedInputPriceUsd ?? existing.pricing?.cachedInputUsd ?? null,
          outputUsd: body.outputPriceUsd ?? existing.pricing?.outputUsd ?? null,
          source: body.pricingSource ?? existing.pricing?.source ?? "",
          lastCheckedAt: body.pricingLastCheckedAt ?? existing.pricing?.lastCheckedAt ?? null
        },
        recommendedUse: body.recommendedUse ?? existing.recommendedUse,
        allowedForTeachers: body.allowedForTeachers ?? existing.allowedForTeachers,
        allowedForStudents: body.allowedForStudents ?? existing.allowedForStudents,
        allowedForRuntime: body.allowedForRuntime ?? existing.allowedForRuntime,
        notes: body.notes ?? existing.notes
      }, existing);
      store.models[index] = next;
      await writeJson("aiModels", store);
      return sendJson(response, 200, { model: next });
    });
  }

  return false;
}

async function handleCourseActivityAiConfig(request, response, url, user) {
  const match = url.pathname.match(/^\/api\/course-activities\/([^/]+)\/ai-config$/);
  if (!match) return false;
  const assignmentId = decodeURIComponent(match[1]);
  const assignmentsStore = await readJson("assignments");
  const assignments = Array.isArray(assignmentsStore.assignments) ? assignmentsStore.assignments : [];
  const assignment = assignments.find((item) => item.id === assignmentId);
  if (!assignment) return sendJson(response, 404, { error: "Assignation introuvable." });
  if (!(await canAccessCourse(user, assignment.courseId))) {
    return sendJson(response, 404, { error: "Assignation introuvable." });
  }

  if (request.method === "GET") {
    const aiConfig = await aiConfigForAssignment(assignment);
    return sendJson(response, 200, {
      assignmentId,
      aiConfigId: assignment.aiConfigId || (assignment.prototypeId === "proto06" ? DEFAULT_PROTO06_AI_CONFIG_ID : null),
      aiConfig
    });
  }

  if (request.method === "PUT") {
    if (!(await canManageCourse(user, assignment.courseId))) {
      return sendJson(response, 403, { error: "Acces refuse." });
    }
    const body = await readBody(request);
    const nextAiConfigId = String(body.aiConfigId || "").trim();
    const aiConfigsStore = await readJson("aiConfigs");
    const config = (aiConfigsStore.configs || []).find((item) =>
      item.id === nextAiConfigId && item.prototypeId === assignment.prototypeId
    );
    if (!config) return sendJson(response, 400, { error: "Configuration IA introuvable pour ce prototype." });
    return withJsonWriteLock("assignments", async () => {
      const lockedStore = await readJson("assignments");
      lockedStore.assignments = Array.isArray(lockedStore.assignments) ? lockedStore.assignments : [];
      const lockedAssignment = lockedStore.assignments.find((item) => item.id === assignmentId);
      if (!lockedAssignment) return sendJson(response, 404, { error: "Assignation introuvable." });
      lockedAssignment.aiConfigId = nextAiConfigId;
      lockedAssignment.updatedBy = user.id;
      lockedAssignment.updatedAt = now();
      await writeJson("assignments", lockedStore);
      return sendJson(response, 200, {
        assignment: { ...lockedAssignment, aiConfig: config }
      });
    });
  }

  return false;
}

async function handleAdminProto06Sandbox(request, response, url, user) {
  if (!requireRole(response, user, ["admin"])) return true;

  if (url.pathname === "/api/admin/proto06/sandbox/access") {
    if (request.method !== "GET") {
      return sendJson(response, 405, { error: "Methode non autorisee." });
    }
    return sendJson(response, 200, {
      allowed: true,
      role: user.role,
      sandbox: PROTO06_SANDBOX_ID,
      providerEnabled: false,
      generationEnabled: false
    });
  }

  if (url.pathname === "/api/admin/proto06/sandbox/launch") {
    if (request.method !== "POST") {
      return sendJson(response, 405, { error: "Methode non autorisee." });
    }
    cleanupProto06SandboxAccessGrants();
    const sandboxAccessId = crypto.randomBytes(18).toString("base64url");
    const expiresAtMs = Date.now() + PROTO06_SANDBOX_ACCESS_TTL_MS;
    proto06SandboxAccessGrants.set(sandboxAccessId, {
      sandboxAccessId,
      userId: user.id,
      role: user.role,
      createdAt: now(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresAtMs
    });
    const launchUrl = `${PROTO06_SANDBOX_URL}?sandboxAccessId=${encodeURIComponent(sandboxAccessId)}`;
    return sendJson(response, 200, {
      sandbox: PROTO06_SANDBOX_ID,
      launchUrl,
      expiresInSeconds: Math.floor(PROTO06_SANDBOX_ACCESS_TTL_MS / 1000),
      providerEnabled: false,
      generationEnabled: false
    });
  }

  return false;
}

function cleanupProto06SandboxAccessGrants() {
  const nowMs = Date.now();
  for (const [sandboxAccessId, grant] of proto06SandboxAccessGrants.entries()) {
    if (!grant || grant.expiresAtMs <= nowMs) {
      proto06SandboxAccessGrants.delete(sandboxAccessId);
    }
  }
}

async function handleProto06SandboxAccessGrant(request, response, url) {
  const accessMatch = url.pathname.match(/^\/api\/admin\/proto06\/sandbox\/access\/([^/]+)$/);
  if (!accessMatch) return false;
  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Methode non autorisee." });
  }
  cleanupProto06SandboxAccessGrants();
  const sandboxAccessId = decodeURIComponent(accessMatch[1] || "");
  const grant = proto06SandboxAccessGrants.get(sandboxAccessId);
  if (!grant) {
    return sendJson(response, 403, {
      allowed: false,
      error: "Acces sandbox expire ou invalide.",
      sandbox: PROTO06_SANDBOX_ID,
      providerEnabled: false,
      generationEnabled: false
    });
  }
  return sendJson(response, 200, {
    allowed: true,
    role: "admin",
    sandbox: PROTO06_SANDBOX_ID,
    providerEnabled: false,
    generationEnabled: false,
    expiresAt: grant.expiresAt
  });
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});
  if (url.pathname === "/api/health" || url.pathname === "/api/health/db") {
    return sendJson(response, 200, await storeHealth());
  }

  const proto06ManifestsHandled = await handleProto06Manifests(request, response, url);
  if (proto06ManifestsHandled !== false) return;

  const aiConfigHandled = await handleRunAiConfig(request, response, url);
  if (aiConfigHandled !== false) return;

  const eventHandled = await handleRunEvent(request, response, url);
  if (eventHandled !== false) return;

  const proto06SandboxAccessGrantHandled = await handleProto06SandboxAccessGrant(request, response, url);
  if (proto06SandboxAccessGrantHandled !== false) return;

  const authResult = await handleAuth(request, response, url);
  if (authResult !== false) return;

  const user = await requireUser(request, response);
  if (!user) return;

  if (url.pathname === "/api/prototypes" && request.method === "GET") {
    return sendJson(response, 200, await getPrototypesStore());
  }

  if (url.pathname === "/api/prototypes/status" && request.method === "GET") {
    return sendJson(response, 200, await prototypeStatuses());
  }

  const prototypeActivitiesMatch = url.pathname.match(/^\/api\/prototypes\/([^/]+)\/activities$/);
  if (prototypeActivitiesMatch && request.method === "GET") {
    return sendJson(response, 200, await fetchPrototypeActivities(decodeURIComponent(prototypeActivitiesMatch[1])));
  }

  if (url.pathname.startsWith("/api/institutions")) {
    const handled = await handleInstitutions(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname.startsWith("/api/activity-ownership")) {
    const handled = await handleActivityOwnership(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname === "/api/me/activities") {
    const handled = await handleMeActivities(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname === "/api/sharing-spaces") {
    const handled = await handleSharingSpaces(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname.startsWith("/api/ai-configs") || /^\/api\/prototypes\/[^/]+\/ai-configs$/.test(url.pathname)) {
    const handled = await handleAiConfigs(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname.startsWith("/api/course-activities/")) {
    const handled = await handleCourseActivityAiConfig(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname.startsWith("/api/admin/ai")) {
    const handled = await handleAdminAi(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname.startsWith("/api/admin/proto06/sandbox")) {
    const handled = await handleAdminProto06Sandbox(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname.startsWith("/api/runs")) {
    const handled = await handleRuns(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname.startsWith("/api/courses")) {
    const handled = await handleCourses(request, response, url, user);
    if (handled !== false) return;
  }

  if (url.pathname === "/api/admin/users" && request.method === "GET") {
    if (!requireRole(response, user, ["admin"])) return;
    const usersStore = await readJson("users");
    return sendJson(response, 200, { users: usersStore.users.map(publicUser) });
  }

  if (url.pathname === "/api/admin/sessions" && request.method === "GET") {
    if (!requireRole(response, user, ["admin"])) return;
    return sendJson(response, 200, await readJson("sessions"));
  }

  return sendJson(response, 404, { error: "Endpoint introuvable." });
}

async function serveStatic(response, url) {
  if (response.headersSent || response.writableEnded) {
    console.error(`[static] response already sent, skipped ${url.pathname}`);
    return false;
  }

  if (url.pathname === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return true;
  }

  const redirects = new Map([
    ["/student.html", "/student-0.7.1.html"],
    ["/teacher.html", "/teacher-0.7.1.html"],
    ["/hub.html", "/hub-0.9.6.html"],
    ["/admin.html", "/admin-0.9.6.html"]
  ]);
  if (redirects.has(url.pathname)) {
    response.writeHead(302, { location: redirects.get(url.pathname) });
    response.end();
    return true;
  }

  const requested = url.pathname === "/" ? "/login.html" : decodeURIComponent(url.pathname);
  const docsPrefix = "/docs/";
  const isDocsRequest = requested.startsWith(docsPrefix);
  const baseDir = isDocsRequest ? DOCS_DIR : PUBLIC_DIR;
  const relativeRequest = isDocsRequest ? requested.slice(docsPrefix.length) : `.${requested}`;
  const target = path.resolve(baseDir, relativeRequest);
  if (target !== baseDir && !target.startsWith(`${baseDir}${path.sep}`)) {
    if (response.headersSent || response.writableEnded) return false;
    response.writeHead(403);
    response.end("Forbidden");
    return true;
  }
  try {
    const extension = path.extname(target).toLowerCase();
    const file = await fs.readFile(target);
    if (response.headersSent || response.writableEnded) return false;
    response.writeHead(200, { "content-type": contentTypes[extension] || "application/octet-stream" });
    response.end(file);
    return true;
  } catch {
    if (response.headersSent || response.writableEnded) return false;
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return true;
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(response, url);
  } catch (error) {
    const status = ["JSON invalide.", "Payload trop volumineux."].includes(error.message) ? 400 : 500;
    console.error(`[server] ${request.method} ${url.pathname} -> ${status}: ${error.stack || error.message}`);
    sendJson(response, status, { error: error.message || "Erreur serveur." });
  }
});

process.on("uncaughtException", (error) => {
  console.error(`[process] uncaught exception: ${error.stack || error.message}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandled rejection:", reason);
});

async function initStoreMode() {
  if (STORE_MODE !== "mariadb") {
    console.log("[startup] store mode json");
    return;
  }
  try {
    mariaDbStore = require("./stores/mariadbStore");
    const { testConnection } = require("./db/db");
    await testConnection();
    mariaDbAvailable = true;
    console.log("[startup] store mode mariadb");
  } catch (error) {
    mariaDbAvailable = false;
    lastMariaDbError = error.message;
    console.error(`[startup] MariaDB unavailable, using JSON fallback: ${error.message}`);
  }
}

initStoreMode()
  .then(ensureSeedData)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`${SERVICE} ${VERSION} listening on http://localhost:${PORT}`);
      console.log(`[startup] public directory ${PUBLIC_DIR}`);
      console.log(`[startup] active store ${mariaDbAvailable ? "mariadb" : "json"}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
