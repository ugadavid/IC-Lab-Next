const TOKEN_KEY = "icHubAuthToken";
const userLine = document.querySelector("#userLine");
const healthBox = document.querySelector("#healthBox");
const storageBox = document.querySelector("#storageBox");
const aiStatusBox = document.querySelector("#aiStatusBox");
const aiProvidersBox = document.querySelector("#aiProvidersBox");
const aiModelsBox = document.querySelector("#aiModelsBox");
const syncOpenAiButton = document.querySelector("#syncOpenAiButton");
const aiProviderFilter = document.querySelector("#aiProviderFilter");
const aiFamilyFilter = document.querySelector("#aiFamilyFilter");
const aiModalityFilter = document.querySelector("#aiModalityFilter");
const aiStatusFilter = document.querySelector("#aiStatusFilter");
const aiRuntimeFilter = document.querySelector("#aiRuntimeFilter");
const aiCostFilter = document.querySelector("#aiCostFilter");
const aiConfigsBox = document.querySelector("#aiConfigsBox");
const usersBox = document.querySelector("#usersBox");
const institutionsBox = document.querySelector("#institutionsBox");
const ownershipBox = document.querySelector("#ownershipBox");
const visibilityFilter = document.querySelector("#visibilityFilter");
const institutionFilter = document.querySelector("#institutionFilter");
const ownerFilter = document.querySelector("#ownerFilter");
const prototypeFilter = document.querySelector("#prototypeFilter");
const coursesBox = document.querySelector("#coursesBox");
const prototypesBox = document.querySelector("#prototypesBox");
const connectorsBox = document.querySelector("#connectorsBox");
const sessionsBox = document.querySelector("#sessionsBox");
const message = document.querySelector("#message");
let aiModelsCache = [];
let aiProvidersCache = [];

function token() { return localStorage.getItem(TOKEN_KEY); }
function goLogin() { window.location.href = "login.html"; }

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", authorization: `Bearer ${token()}`, ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Erreur ${response.status}`);
  return body;
}

function row(title, detail) {
  return `<article class="row"><strong>${title}</strong><p>${detail}</p></article>`;
}

function renderStorage(health) {
  if (!storageBox) return;
  const counts = health.db?.counts || {};
  const countLine = Object.entries(counts).map(([key, value]) => `${key}: ${value}`).join(" - ") || "counts indisponibles";
  storageBox.innerHTML = [
    row("Mode actif", `${String(health.store || "json").toUpperCase()} - demande ${health.requestedStore || "json"}`),
    row("Base", health.db ? `${health.db.ok ? "OK" : "KO"} - ${health.db.database || "n/a"} @ ${health.db.host || "n/a"}:${health.db.port || "n/a"}` : "JSON local"),
    row("Counts rapides", countLine),
    row("Coherence", "Commande locale : node db/check-db-consistency.js")
  ].join("");
}

function institutionLabel(institutions, id) {
  if (!id) return "aucune institution";
  const institution = institutions.find((item) => item.id === id);
  return institution ? `${institution.shortName || institution.name} (${institution.id})` : id;
}

function userLabel(users, id) {
  const user = users.find((item) => item.id === id);
  return user ? `${user.displayName} (${user.email})` : id || "n/a";
}

function fillSelect(select, values) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${select.id === "ownerFilter" ? "Tous" : "Toutes"}</option>${values.map((value) => `<option value="${value}">${value || "aucun"}</option>`).join("")}`;
  select.value = values.includes(current) ? current : "";
}

function boolLabel(value) {
  return value ? "oui" : "non";
}

function renderAiProviderCatalog(status, providers) {
  if (!aiStatusBox || !aiProvidersBox) return;
  aiStatusBox.innerHTML = (status.providers || []).map((provider) => row(
    provider.id,
    `status ${provider.status} - cle presente: ${boolLabel(provider.hasApiKey)} - modele defaut configure: ${boolLabel(provider.hasDefaultModel)} - sync: ${boolLabel(provider.supportsModelSync)} - activable: ${boolLabel(provider.providerActivable)}`
  )).join("") || "<p>Aucun statut provider.</p>";

  aiProvidersBox.innerHTML = providers.map((provider) => `
    <form class="ai-provider-form row" data-provider-id="${provider.id}">
      <strong>${provider.title}</strong>
      <p>${provider.type} - ${provider.status} - cle presente: ${boolLabel(provider.hasApiKey)} - sync: ${boolLabel(provider.supportsModelSync)}</p>
      <label>Titre <input name="title" value="${provider.title || ""}"></label>
      <label>Statut <input name="status" value="${provider.status || ""}"></label>
      <label>Base URL <input name="baseUrl" value="${provider.baseUrl || ""}" placeholder="aucune cle API"></label>
      <label>Notes <textarea name="notes">${provider.notes || ""}</textarea></label>
      <button type="submit">Mettre a jour provider</button>
    </form>
  `).join("") || "<p>Aucun provider.</p>";
}

function fillAiModelFilters(models) {
  fillSelect(aiProviderFilter, [...new Set(models.map((model) => model.providerId).filter(Boolean))]);
  fillSelect(aiFamilyFilter, [...new Set(models.map((model) => model.family).filter(Boolean))]);
  fillSelect(aiModalityFilter, [...new Set(models.map((model) => model.modality).filter(Boolean))]);
  fillSelect(aiStatusFilter, [...new Set(models.map((model) => model.status).filter(Boolean))]);
  fillSelect(aiCostFilter, [...new Set(models.map((model) => model.costLevel).filter(Boolean))]);
}

function renderAiModels(models = aiModelsCache) {
  if (!aiModelsBox) return;
  const filtered = models.filter((model) => {
    if (aiProviderFilter?.value && model.providerId !== aiProviderFilter.value) return false;
    if (aiFamilyFilter?.value && model.family !== aiFamilyFilter.value) return false;
    if (aiModalityFilter?.value && model.modality !== aiModalityFilter.value) return false;
    if (aiStatusFilter?.value && model.status !== aiStatusFilter.value) return false;
    if (aiCostFilter?.value && model.costLevel !== aiCostFilter.value) return false;
    if (aiRuntimeFilter?.value && String(Boolean(model.allowedForRuntime)) !== aiRuntimeFilter.value) return false;
    return true;
  });
  aiModelsBox.innerHTML = filtered.map((model) => `
    <form class="ai-model-form row" data-model-id="${model.id}">
      <strong>${model.title}</strong>
      <p>${model.providerId} - ${model.providerModelId} - ${model.family || "n/a"} - ${model.modality || "n/a"} - ${model.status}</p>
      <p>Capacites: ${(model.capabilities || []).join(", ") || "n/a"} - source ${model.source || "n/a"} - cout ${model.costLevel || "n/a"} - lastSeenAt ${model.lastSeenAt || "n/a"}</p>
      <p>Teacher ${boolLabel(model.allowedForTeachers)} - Student ${boolLabel(model.allowedForStudents)} - Runtime ${boolLabel(model.allowedForRuntime)}</p>
      <label>Titre <input name="title" value="${model.title || ""}"></label>
      <label>Statut <input name="status" value="${model.status || ""}"></label>
      <label>Cout <input name="costLevel" value="${model.costLevel || ""}"></label>
      <label>Usage recommande <textarea name="recommendedUse">${model.recommendedUse || ""}</textarea></label>
      <label><input name="allowedForTeachers" type="checkbox" ${model.allowedForTeachers ? "checked" : ""}> Autorise teacher</label>
      <label><input name="allowedForStudents" type="checkbox" ${model.allowedForStudents ? "checked" : ""}> Autorise student</label>
      <label><input name="allowedForRuntime" type="checkbox" ${model.allowedForRuntime ? "checked" : ""}> Autorise runtime</label>
      <label>Notes <textarea name="notes">${model.notes || ""}</textarea></label>
      <button type="submit">Mettre a jour modele</button>
    </form>
  `).join("") || "<p>Aucun modele pour ces filtres.</p>";
}

function renderOwnership(records, users, institutions) {
  const filtered = records.filter((record) => {
    if (visibilityFilter?.value && record.visibility !== visibilityFilter.value) return false;
    if (institutionFilter?.value && String(record.institutionId || "") !== institutionFilter.value) return false;
    if (ownerFilter?.value && record.ownerId !== ownerFilter.value) return false;
    if (prototypeFilter?.value && record.prototypeId !== prototypeFilter.value) return false;
    return true;
  });
  ownershipBox.innerHTML = filtered.map((record) => {
    const aiModes = (record.assignments || [])
      .map((assignment) => assignment.aiConfig ? `${assignment.aiConfig.title} (${assignment.aiConfig.status}, ${assignment.aiConfig.estimatedCostLevel})` : assignment.aiConfigId)
      .filter(Boolean);
    return row(
      `${record.prototypeId} / ${record.activityId}`,
      `${record.activitySource} - ${record.title} - owner ${userLabel(users, record.ownerId)} - ${institutionLabel(institutions, record.institutionId)} - ${record.visibility} - provenance ${record.provenance?.kind || "n/a"} - visible pour: ${record.theoreticalVisibility || "n/a"} - modes IA: ${aiModes.join(" | ") || "n/a"} - ${record.createdAt || "n/a"}`
    );
  }).join("") || "<p>Aucune activite referencee.</p>";
}

function renderAiConfigs(configs) {
  if (!aiConfigsBox) return;
  aiConfigsBox.innerHTML = configs.map((config) => `
    <form class="ai-config-form row" data-config-id="${config.id}">
      <strong>${config.title}</strong>
      <p>${config.prototypeId} - ${config.mode} - ${config.provider || "none"} - voix ${config.voiceMode || "n/a"} / ${config.voiceProvider || "n/a"}</p>
      <p>Cout ${config.estimatedCostLevel || "n/a"} - duree max ${config.maxDurationSeconds || "n/a"}s - statut ${config.status}</p>
      <label>Statut <input name="status" value="${config.status || ""}"></label>
      <label>Description <textarea name="description">${config.description || ""}</textarea></label>
      <label>Cout estime <select name="estimatedCostLevel">
        ${["free", "low", "medium", "high", "very-high"].map((value) => `<option value="${value}" ${config.estimatedCostLevel === value ? "selected" : ""}>${value}</option>`).join("")}
      </select></label>
      <label>Notes cout <textarea name="estimatedCostNotes">${config.estimatedCostNotes || ""}</textarea></label>
      <label>Duree max <input name="maxDurationSeconds" type="number" min="0" step="30" value="${config.maxDurationSeconds || 0}"></label>
      <label>Provider <input name="provider" value="${config.provider || ""}"></label>
      <label>Model ID <input name="modelId" value="${config.modelId || ""}" placeholder="aucune cle API"></label>
      <label>Warnings <textarea name="warnings">${(config.warnings || []).join("\n")}</textarea></label>
      <button type="submit">Mettre a jour</button>
    </form>
  `).join("") || "<p>Aucune configuration IA.</p>";
}

async function init() {
  if (!token()) return goLogin();
  try {
    const [me, health, users, courses, prototypes, statuses, sessions, institutions, ownership, aiConfigs, aiProviderStatus, aiProviders, aiModels] = await Promise.all([
      api("/api/auth/me"),
      api("/api/health"),
      api("/api/admin/users"),
      api("/api/courses"),
      api("/api/prototypes"),
      api("/api/prototypes/status"),
      api("/api/admin/sessions"),
      api("/api/institutions"),
      api("/api/activity-ownership"),
      api("/api/ai-configs"),
      api("/api/admin/ai/status"),
      api("/api/admin/ai/providers"),
      api("/api/admin/ai/models")
    ]);
    if (me.user.role !== "admin") throw new Error("Acces admin refuse.");
    const institutionRows = institutions.institutions || [];
    const userRows = users.users || [];
    userLine.textContent = `${me.user.displayName} - ${me.user.role}`;
    healthBox.textContent = JSON.stringify(health, null, 2);
    renderStorage(health);
    usersBox.innerHTML = userRows.map((user) => row(
      user.email,
      `${user.displayName} - ${user.role} - ${institutionLabel(institutionRows, user.institutionId)} - createdBy ${user.createdBy || "n/a"} - updatedBy ${user.updatedBy || "n/a"}`
    )).join("");
    institutionsBox.innerHTML = institutionRows.map((institution) => row(
      institution.name,
      `${institution.id} - ${institution.type} - ${institution.country} - ${institution.status}`
    )).join("");
    const ownershipRows = ownership.records || [];
    fillSelect(visibilityFilter, [...new Set(ownershipRows.map((record) => record.visibility).filter(Boolean))]);
    fillSelect(institutionFilter, [...new Set(ownershipRows.map((record) => record.institutionId || "").filter((value) => value !== undefined))]);
    fillSelect(ownerFilter, [...new Set(ownershipRows.map((record) => record.ownerId).filter(Boolean))]);
    fillSelect(prototypeFilter, [...new Set(ownershipRows.map((record) => record.prototypeId).filter(Boolean))]);
    [visibilityFilter, institutionFilter, ownerFilter, prototypeFilter].forEach((select) => {
      select?.addEventListener("change", () => renderOwnership(ownershipRows, userRows, institutionRows));
    });
    renderOwnership(ownershipRows, userRows, institutionRows);
    renderAiConfigs(aiConfigs.configs || []);
    aiProvidersCache = aiProviders.providers || [];
    aiModelsCache = aiModels.models || [];
    renderAiProviderCatalog(aiProviderStatus, aiProvidersCache);
    fillAiModelFilters(aiModelsCache);
    [aiProviderFilter, aiFamilyFilter, aiModalityFilter, aiStatusFilter, aiRuntimeFilter, aiCostFilter].forEach((select) => {
      select?.addEventListener("change", () => renderAiModels());
    });
    renderAiModels();
    coursesBox.innerHTML = courses.courses.map((course) => row(
      course.title,
      `${course.accessCode} - teacher ${course.teacherId} - owner ${course.ownerId || "n/a"} - ${institutionLabel(institutionRows, course.institutionId)} - ${course.visibility || "n/a"}`
    )).join("");
    prototypesBox.innerHTML = prototypes.prototypes.map((proto) => row(proto.title, `${proto.status} - ${proto.entryUrl || "pas de lien"}`)).join("");
    connectorsBox.innerHTML = statuses.prototypes.map((proto) => row(proto.title, `${proto.connectorStatus || "n/a"} - ${proto.activityApiUrl || "pas d'API"} ${proto.connectorMessage || ""}`)).join("");
    sessionsBox.textContent = JSON.stringify(sessions.sessions, null, 2);
  } catch (error) {
    message.textContent = error.message;
  }
}

aiConfigsBox?.addEventListener("submit", async (event) => {
  const form = event.target.closest(".ai-config-form");
  if (!form) return;
  event.preventDefault();
  try {
    const data = new FormData(form);
    await api(`/api/ai-configs/${form.dataset.configId}`, {
      method: "PUT",
      body: JSON.stringify({
        status: data.get("status"),
        description: data.get("description"),
        estimatedCostLevel: data.get("estimatedCostLevel"),
        estimatedCostNotes: data.get("estimatedCostNotes"),
        maxDurationSeconds: Number(data.get("maxDurationSeconds")),
        provider: data.get("provider"),
        modelId: data.get("modelId"),
        warnings: data.get("warnings")
      })
    });
    const aiConfigs = await api("/api/ai-configs");
    renderAiConfigs(aiConfigs.configs || []);
    message.textContent = "Configuration IA mise a jour.";
  } catch (error) {
    message.textContent = error.message;
  }
});

aiProvidersBox?.addEventListener("submit", async (event) => {
  const form = event.target.closest(".ai-provider-form");
  if (!form) return;
  event.preventDefault();
  try {
    const data = new FormData(form);
    await api(`/api/admin/ai/providers/${form.dataset.providerId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: data.get("title"),
        status: data.get("status"),
        baseUrl: data.get("baseUrl"),
        notes: data.get("notes")
      })
    });
    const [status, providers] = await Promise.all([
      api("/api/admin/ai/status"),
      api("/api/admin/ai/providers")
    ]);
    aiProvidersCache = providers.providers || [];
    renderAiProviderCatalog(status, aiProvidersCache);
    message.textContent = "Provider IA mis a jour.";
  } catch (error) {
    message.textContent = error.message;
  }
});

aiModelsBox?.addEventListener("submit", async (event) => {
  const form = event.target.closest(".ai-model-form");
  if (!form) return;
  event.preventDefault();
  try {
    const data = new FormData(form);
    await api(`/api/admin/ai/models/${form.dataset.modelId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: data.get("title"),
        status: data.get("status"),
        costLevel: data.get("costLevel"),
        recommendedUse: data.get("recommendedUse"),
        allowedForTeachers: data.has("allowedForTeachers"),
        allowedForStudents: data.has("allowedForStudents"),
        allowedForRuntime: data.has("allowedForRuntime"),
        notes: data.get("notes")
      })
    });
    const models = await api("/api/admin/ai/models");
    aiModelsCache = models.models || [];
    renderAiModels();
    message.textContent = "Modele IA mis a jour.";
  } catch (error) {
    message.textContent = error.message;
  }
});

syncOpenAiButton?.addEventListener("click", async () => {
  try {
    syncOpenAiButton.disabled = true;
    message.textContent = "Synchronisation OpenAI en cours...";
    const result = await api("/api/admin/ai/providers/openai/sync-models", { method: "POST" });
    aiModelsCache = result.models || [];
    fillAiModelFilters(aiModelsCache);
    renderAiModels();
    message.textContent = `${result.syncedCount || 0} modeles OpenAI synchronises.`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    syncOpenAiButton.disabled = false;
  }
});

init();
