const TOKEN_KEY = "icHubAuthToken";
const OPENAI_OFFICIAL_BASE_URL = "https://api.openai.com/v1";

const userLine = document.querySelector("#userLine");
const healthBox = document.querySelector("#healthBox");
const storageBox = document.querySelector("#storageBox");
const aiStatusBox = document.querySelector("#aiStatusBox");
const aiProvidersBox = document.querySelector("#aiProvidersBox");
const aiModelsBox = document.querySelector("#aiModelsBox");
const aiModelCount = document.querySelector("#aiModelCount");
const aiChecklistBox = document.querySelector("#aiChecklistBox");
const aiNextStepBox = document.querySelector("#aiNextStepBox");
const aiRecommendedBox = document.querySelector("#aiRecommendedBox");
const aiRuntimeStatusBox = document.querySelector("#aiRuntimeStatusBox");
const aiRuntimeModelSelect = document.querySelector("#aiRuntimeModelSelect");
const aiLabResultBox = document.querySelector("#aiLabResultBox");
const runtimeModelHint = document.querySelector("#runtimeModelHint");
const draftCharacterSelect = document.querySelector("#draftCharacterSelect");
const draftLanguageSelect = document.querySelector("#draftLanguageSelect");
const draftScenarioSelect = document.querySelector("#draftScenarioSelect");
const draftClimateThemeInput = document.querySelector("#draftClimateThemeInput");
const draftLengthSelect = document.querySelector("#draftLengthSelect");
const draftStrictnessSelect = document.querySelector("#draftStrictnessSelect");
const checkOpenAiRuntimeButton = document.querySelector("#checkOpenAiRuntimeButton");
const smokeOpenAiButton = document.querySelector("#smokeOpenAiButton");
const generateDraftButton = document.querySelector("#generateDraftButton");
const generateMainDraftsButton = document.querySelector("#generateMainDraftsButton");
const clearSessionDraftsButton = document.querySelector("#clearSessionDraftsButton");
const sessionDraftsBox = document.querySelector("#sessionDraftsBox");
const syncOpenAiButton = document.querySelector("#syncOpenAiButton");
const syncStatusBox = document.querySelector("#syncStatusBox");
const aiProviderFilter = document.querySelector("#aiProviderFilter");
const aiFamilyFilter = document.querySelector("#aiFamilyFilter");
const aiModalityFilter = document.querySelector("#aiModalityFilter");
const aiStatusFilter = document.querySelector("#aiStatusFilter");
const aiRuntimeFilter = document.querySelector("#aiRuntimeFilter");
const aiCostFilter = document.querySelector("#aiCostFilter");
const aiRecommendationFilter = document.querySelector("#aiRecommendationFilter");
const aiProto06Filter = document.querySelector("#aiProto06Filter");
const aiPricingFilter = document.querySelector("#aiPricingFilter");
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
let aiProviderStatusCache = [];
let sessionDrafts = [];

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

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function row(title, detail) {
  return `<article class="row"><strong>${esc(title)}</strong><p>${esc(detail)}</p></article>`;
}

function toast(text, kind = "ok") {
  if (!message) return;
  message.textContent = text;
  message.className = `message ${kind}`;
}

function badge(value, kind = "") {
  return `<span class="badge ${kind}">${esc(value)}</span>`;
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
  const defaultLabel = select.id === "ownerFilter" || select.id === "aiProviderFilter" ? "Tous" : "Toutes";
  select.innerHTML = `<option value="">${defaultLabel}</option>${values.map((value) => `<option value="${esc(value)}">${esc(value || "aucun")}</option>`).join("")}`;
  select.value = values.includes(current) ? current : "";
}

function boolLabel(value) {
  return value ? "oui" : "non";
}

function boolBadge(value) {
  return badge(boolLabel(value), value ? "yes" : "no");
}

function recommendationLabel(value) {
  const labels = {
    recommended: "Recommande",
    candidate: "Candidat",
    experimental: "Experimental",
    restricted: "Restreint",
    not_for_proto06: "Non pertinent Proto06",
    not_recommended: "Non recommande",
    not_reviewed: "A examiner"
  };
  return labels[value] || value || "A examiner";
}

function priceLabel(model) {
  const pricing = model.pricing || {};
  const hasPrice = pricing.inputUsd !== null || pricing.cachedInputUsd !== null || pricing.outputUsd !== null;
  if (!hasPrice) return model.pricingDisplay || "Prix non renseigne";
  const parts = [];
  if (pricing.inputUsd !== null) parts.push(`input $${pricing.inputUsd}`);
  if (pricing.cachedInputUsd !== null) parts.push(`cache $${pricing.cachedInputUsd}`);
  if (pricing.outputUsd !== null) parts.push(`output $${pricing.outputUsd}`);
  return `${parts.join(" / ")} ${pricing.unit || ""}`.trim();
}

function runtimeEligibleModels() {
  return aiModelsCache
    .filter((model) =>
      model.providerId === "openai" &&
      model.allowedForRuntime === true &&
      model.status === "available" &&
      model.providerModelId &&
      model.deprecated !== true &&
      model.stale !== true &&
      !String(model.providerModelId).toLowerCase().includes("deprecated")
    )
    .sort((a, b) => {
      const recA = a.icLabRecommendation === "recommended" ? 0 : 1;
      const recB = b.icLabRecommendation === "recommended" ? 0 : 1;
      return recA - recB || String(a.costLevel || "").localeCompare(String(b.costLevel || "")) || String(a.title).localeCompare(String(b.title));
    });
}

function renderRuntimeModelOptions() {
  if (!aiRuntimeModelSelect) return;
  const current = aiRuntimeModelSelect.value;
  const options = runtimeEligibleModels().map((model) => {
    const price = model.pricingKnown ? priceLabel(model) : "Prix non renseigne";
    const label = `${model.title || model.providerModelId} - ${model.costLevel || "unknown"} - ${price}`;
    return `<option value="${esc(model.id)}">${esc(label)}</option>`;
  });
  aiRuntimeModelSelect.innerHTML = `<option value="">Choisir un modele autorise</option>${options.join("")}`;
  aiRuntimeModelSelect.value = options.some((option) => option.includes(`value="${esc(current)}"`)) ? current : "";
  renderRuntimeModelHint();
}

function selectedRuntimeModelId() {
  return aiRuntimeModelSelect?.value || "";
}

function selectedRuntimeModel() {
  const modelId = selectedRuntimeModelId();
  return runtimeEligibleModels().find((model) => model.id === modelId) || null;
}

function renderRuntimeModelHint() {
  if (!runtimeModelHint) return;
  const model = selectedRuntimeModel();
  if (!model) {
    runtimeModelHint.textContent = "Choisissez un modele autorise pour afficher cout et prix.";
    runtimeModelHint.className = "model-hint";
    return;
  }
  const price = model.pricingKnown || modelHasKnownPrice(model) ? priceLabel(model) : "Prix inconnu : verifier manuellement avant usage prolonge.";
  runtimeModelHint.className = `model-hint ${model.pricingKnown || modelHasKnownPrice(model) ? "" : "warning"}`;
  runtimeModelHint.textContent = `Modele : ${model.title || model.providerModelId} - cout qualitatif ${model.costLevel || "unknown"} - ${price} - store=false - hors parcours apprenant.`;
}

function renderRuntimeStatus(status) {
  if (!aiRuntimeStatusBox) return;
  aiRuntimeStatusBox.innerHTML = `
    <div><dt>Provider</dt><dd>${esc(status.provider || "openai")}</dd></div>
    <div><dt>Runtime disponible</dt><dd>${boolBadge(status.enabled)}</dd></div>
    <div><dt>Cle presente cote serveur</dt><dd>${boolBadge(status.hasApiKey)}</dd></div>
    <div><dt>Modele par defaut configure</dt><dd>${boolBadge(status.defaultModelConfigured)}</dd></div>
    <div><dt>Navigateur appelle OpenAI</dt><dd>${boolBadge(false)}</dd></div>
    <div><dt>Parcours apprenant generatif</dt><dd>${boolBadge(false)}</dd></div>
  `;
}

function renderLabResult(title, payload, kind = "ok") {
  if (!aiLabResultBox) return;
  const draft = payload?.draft || {};
  const textValue = draft.text || payload?.text || "";
  const text = textValue ? `<pre>${esc(textValue)}</pre>` : "";
  const error = payload?.error ? `<p class="warning">Erreur : ${esc(payload.error)}</p>` : "";
  const checks = payload?.checks ? `
    <dl class="meta-grid">
      <div><dt>Markdown</dt><dd>${boolBadge(payload.checks.hasMarkdown)}</dd></div>
      <div><dt>Question directe</dt><dd>${boolBadge(payload.checks.hasQuestionMark)}</dd></div>
      <div><dt>Longueur OK</dt><dd>${boolBadge(payload.checks.withinWordLimit)}</dd></div>
      <div><dt>Langue cible</dt><dd>${esc(payload.checks.targetLanguage || draft.language || "n/a")}</dd></div>
    </dl>
  ` : "";
  aiLabResultBox.className = `lab-result ${kind}`;
  aiLabResultBox.innerHTML = `
    <strong>${esc(title)}</strong>
    ${error}
    ${text}
    <dl class="meta-grid">
      <div><dt>Modele catalogue</dt><dd>${esc(payload?.modelCatalogId || "n/a")}</dd></div>
      <div><dt>Modele provider</dt><dd>${esc(payload?.providerModelId || "n/a")}</dd></div>
      <div><dt>store</dt><dd>false</dd></div>
      <div><dt>Parcours apprenant</dt><dd>non modifie</dd></div>
    </dl>
    ${checks}
  `;
}

function setLabBusy(isBusy, label = "") {
  [checkOpenAiRuntimeButton, smokeOpenAiButton, generateDraftButton, generateMainDraftsButton, ...document.querySelectorAll(".draft-button")].forEach((button) => {
    if (button) button.disabled = isBusy;
  });
  if (isBusy && aiLabResultBox) {
    aiLabResultBox.className = "lab-result";
    aiLabResultBox.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${esc(label || "Appel serveur en cours...")}`;
  }
}

function draftRequest(overrides = {}) {
  const climateTheme = String(draftClimateThemeInput?.value || "").trim();
  return {
    modelCatalogId: selectedRuntimeModelId(),
    characterId: overrides.characterId || draftCharacterSelect?.value || "Clara",
    targetLanguage: overrides.targetLanguage || draftLanguageSelect?.value || "es-ES",
    scenarioId: draftScenarioSelect?.value || "globalUnderstanding",
    climateTheme: climateTheme.slice(0, 120),
    maxWords: Number(draftLengthSelect?.value || 45),
    pedagogicalStrictness: draftStrictnessSelect?.value || "safe"
  };
}

function summarizeChecks(checks = {}) {
  const parts = [];
  parts.push(checks.hasMarkdown ? "markdown detecte" : "sans markdown");
  parts.push(checks.hasQuestionMark ? "question detectee" : "sans question directe");
  parts.push(checks.withinWordLimit ? "longueur OK" : "longueur a relire");
  return parts.join(" - ");
}

function renderSessionDrafts() {
  if (!sessionDraftsBox) return;
  if (!sessionDrafts.length) {
    sessionDraftsBox.textContent = "Aucun brouillon genere dans cette session.";
    return;
  }
  sessionDraftsBox.innerHTML = sessionDrafts.map((item, index) => `
    <article class="session-draft">
      <div class="card-head">
        <div>
          <h5>${esc(item.draft.characterId)} - ${esc(item.draft.language)} - ${esc(item.draft.scenarioId)}</h5>
          <p>${esc(item.draft.climateTheme)} - ${esc(item.providerModelId)} - ${esc(item.modelCatalogId)}</p>
        </div>
        <span class="badge">${esc(item.draft.wordCount)} mots</span>
      </div>
      <pre>${esc(item.draft.text)}</pre>
      <p class="soft-note">${esc(summarizeChecks(item.checks))} - store=false - non utilise dans le parcours apprenant</p>
      <div class="draft-actions">
        <button class="copy-session-draft secondary" type="button" data-index="${index}">Copier</button>
        <button class="delete-session-draft secondary" type="button" data-index="${index}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function rememberDraft(result) {
  if (!result?.draft?.text) return;
  sessionDrafts.unshift({
    ...result,
    createdAt: new Date().toISOString()
  });
  renderSessionDrafts();
}

async function generateControlledDraft(overrides = {}) {
  const request = draftRequest(overrides);
  if (!request.modelCatalogId) throw new Error("Choisissez d'abord un modele OpenAI autorise runtime.");
  if (!request.climateTheme) throw new Error("Indiquez un theme climatique controle.");
  const result = await api("/api/admin/ai/runtime/ic-agent-draft", {
    method: "POST",
    body: JSON.stringify(request)
  });
  rememberDraft(result);
  return result;
}

function modelHasKnownPrice(model) {
  const pricing = model.pricing || {};
  return pricing.inputUsd !== null || pricing.cachedInputUsd !== null || pricing.outputUsd !== null;
}

function lastModelSyncFor(providerId) {
  const dates = aiModelsCache
    .filter((model) => model.providerId === providerId)
    .map((model) => model.lastSeenAt || model.updatedAt || model.createdAt)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : "";
}

function latestModelSyncDate() {
  const dates = aiModelsCache
    .map((model) => model.lastSeenAt || model.updatedAt || model.createdAt)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : "";
}

function hasAiConfigLinkedToCatalog(aiConfigs) {
  return (aiConfigs || []).some((config) => Boolean(config.modelCatalogId));
}

function nextStepFor(aiConfigs) {
  const syncedCount = aiModelsCache.length;
  const recommendedCount = aiModelsCache.filter((model) => model.icLabRecommendation === "recommended").length;
  if (!syncedCount) return "Synchroniser les modeles OpenAI.";
  if (!recommendedCount) return "Marquer 2 ou 3 modeles comme recommandes pour IC-Lab.";
  if (!hasAiConfigLinkedToCatalog(aiConfigs)) return "Associer une AIConfig a un modele catalogue recommande.";
  return "Creer un mode de test serveur controle, sans flux apprenant.";
}

function recommendedStartModels() {
  const costRank = { low: 1, medium: 2 };
  return aiModelsCache
    .filter((model) =>
      model.icLabRecommendation === "recommended" &&
      model.allowedForRuntime === true &&
      model.modality === "text" &&
      ["low", "medium"].includes(model.costLevel) &&
      model.status === "available"
    )
    .sort((a, b) => (costRank[a.costLevel] || 9) - (costRank[b.costLevel] || 9) || String(a.title).localeCompare(String(b.title)))
    .slice(0, 5);
}

function scrollToModel(modelId) {
  const model = aiModelsCache.find((item) => item.id === modelId);
  if (!model) return;
  if (aiProviderFilter) aiProviderFilter.value = model.providerId || "";
  if (aiModalityFilter) aiModalityFilter.value = model.modality || "";
  if (aiRecommendationFilter) aiRecommendationFilter.value = model.icLabRecommendation || "";
  if (aiProto06Filter) aiProto06Filter.value = model.allowedForRuntime ? "usable" : "";
  if (aiPricingFilter) aiPricingFilter.value = "";
  renderAiModels();
  requestAnimationFrame(() => {
    document.querySelector(`[data-model-id="${CSS.escape(modelId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderAiDashboard(aiConfigs = []) {
  const openAiProvider = aiProvidersCache.find((provider) => provider.id === "openai") || {};
  const openAiStatus = providerStatusFor("openai");
  const recommendedCount = aiModelsCache.filter((model) => model.icLabRecommendation === "recommended").length;
  const runtimeCount = aiModelsCache.filter((model) => model.allowedForRuntime).length;
  const knownPriceCount = aiModelsCache.filter(modelHasKnownPrice).length;
  const syncDate = latestModelSyncDate();

  if (aiChecklistBox) {
    const items = [
      [".env ignore par Git", "rappel manuel", "Le fichier doit rester ignore et non committe."],
      ["Cle OpenAI detectee cote serveur", boolLabel(Boolean(openAiStatus.hasApiKey ?? openAiProvider.hasApiKey)), "Aucun secret n'est affiche."],
      ["Provider OpenAI actif", boolLabel(openAiProvider.status === "active"), "Statut local du provider."],
      ["Derniere synchronisation connue", syncDate || "non connue", "Date issue des modeles catalogues."],
      ["Modeles au catalogue", aiModelsCache.length, "Modeles visibles par l'admin."],
      ["Modeles recommandes IC-Lab", recommendedCount, "Marques localement recommended."],
      ["Modeles autorises runtime", runtimeCount, "Selectionnables pour configuration future."],
      ["Modeles avec prix renseigne", knownPriceCount, "Prix saisis ou verifies localement."],
      ["Prototype 06 generatif", "non", "Le runtime actuel reste scenarise."]
    ];
    aiChecklistBox.innerHTML = items.map(([label, value, detail]) => `
      <article>
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <small>${esc(detail)}</small>
      </article>
    `).join("");
  }

  if (aiNextStepBox) aiNextStepBox.textContent = nextStepFor(aiConfigs);

  if (aiRecommendedBox) {
    const models = recommendedStartModels();
    aiRecommendedBox.innerHTML = models.length ? models.map((model) => `
      <article class="recommended-model">
        <div class="card-head">
          <div>
            <h4>${esc(model.title || model.providerModelId)}</h4>
            <p><code>${esc(model.providerModelId || model.id)}</code></p>
          </div>
          ${badge(model.costLevel || "unknown", model.costLevel === "low" ? "yes" : "")}
        </div>
        <p><strong>Usage :</strong> ${esc(model.recommendedUse || "A documenter.")}</p>
        <p><strong>Prix :</strong> ${esc(priceLabel(model))}</p>
        <p><strong>Pourquoi :</strong> modele texte disponible, recommande IC-Lab, runtime autorise et cout ${esc(model.costLevel || "unknown")}.</p>
        <button type="button" class="secondary jump-model" data-model-id="${esc(model.id)}">Voir dans le catalogue</button>
      </article>
    `).join("") : `<p>Aucun modele recommande pour l'instant. Marquez quelques modeles comme recommended apres verification.</p>`;
  }
  renderRuntimeModelOptions();
}

function providerStatusFor(providerId) {
  return aiProviderStatusCache.find((item) => item.id === providerId) || {};
}

function providerExplanation(provider) {
  if (provider.type === "openai") {
    return "Provider distant configure cote serveur. La cle n'est jamais affichee dans le Hub.";
  }
  if (provider.type === "ollama") {
    return "Provider local possible pour des modeles executes sur une machine controlee.";
  }
  return "Provider declare dans le catalogue local. Son activation dependra d'une configuration serveur.";
}

function statusOptions(selected) {
  return ["active", "planned", "disabled", "deprecated"]
    .map((value) => `<option value="${value}" ${selected === value ? "selected" : ""}>${value}</option>`)
    .join("");
}

function renderAiProviderCatalog(status, providers) {
  if (!aiStatusBox || !aiProvidersBox) return;
  aiProviderStatusCache = status.providers || [];
  aiStatusBox.innerHTML = `<p class="soft-note">Les providers sont affiches en lecture simple. Ouvrez l'edition avancee seulement pour modifier les metadonnees locales.</p>`;

  aiProvidersBox.innerHTML = providers.map((provider) => {
    const publicStatus = providerStatusFor(provider.id);
    const hasKey = provider.hasApiKey ?? publicStatus.hasApiKey;
    const canSync = provider.supportsModelSync ?? publicStatus.supportsModelSync;
    const activable = provider.providerActivable ?? publicStatus.providerActivable;
    const baseUrlWarning = provider.type === "openai"
      ? `<p class="warning">Modifier la Base URL peut empecher la synchronisation de fonctionner. A reserver aux tests avances.</p>`
      : "";
    const restoreButton = provider.type === "openai"
      ? `<button type="button" class="secondary restore-openai-url">Restaurer l'URL officielle</button>`
      : "";
    return `
      <article class="provider-card" data-provider-id="${esc(provider.id)}">
        <div class="card-head">
          <div>
            <h4>${esc(provider.title || provider.id)}</h4>
            <p>${esc(providerExplanation(provider))}</p>
          </div>
          ${badge(provider.status || "planned", provider.status === "active" ? "yes" : "")}
        </div>
        <dl class="meta-grid">
          <div><dt>Type</dt><dd>${esc(provider.type || "n/a")}</dd></div>
          <div><dt>Cle presente</dt><dd>${boolBadge(hasKey)}</dd></div>
          <div><dt>Synchronisation possible</dt><dd>${boolBadge(canSync)}</dd></div>
          <div><dt>Activable</dt><dd>${boolBadge(activable)}</dd></div>
          <div><dt>Derniere synchronisation</dt><dd>${esc(lastModelSyncFor(provider.id) || "Non connue")}</dd></div>
        </dl>
      <details class="advanced-card">
        <summary>Modifier les informations locales</summary>
        <form class="ai-provider-form" data-provider-id="${esc(provider.id)}">
            <p class="soft-note">Cette action modifie les metadonnees locales. Elle ne modifie pas votre compte OpenAI.</p>
            ${baseUrlWarning}
            <label>Titre <input name="title" value="${esc(provider.title || "")}"></label>
            <label>Statut <select name="status">${statusOptions(provider.status || "planned")}</select></label>
            <label>Base URL <input name="baseUrl" value="${esc(provider.baseUrl || "")}" placeholder="aucune URL locale"></label>
            ${restoreButton}
            <label>Notes <textarea name="notes">${esc(provider.notes || "")}</textarea></label>
            <button type="submit">Enregistrer les informations locales du provider</button>
          </form>
        </details>
      </article>
    `;
  }).join("") || "<p>Aucun provider.</p>";
}

function fillAiModelFilters(models) {
  fillSelect(aiProviderFilter, [...new Set(models.map((model) => model.providerId).filter(Boolean))]);
  fillSelect(aiFamilyFilter, [...new Set(models.map((model) => model.family).filter(Boolean))]);
  fillSelect(aiModalityFilter, [...new Set(models.map((model) => model.modality).filter(Boolean))]);
  fillSelect(aiStatusFilter, [...new Set(models.map((model) => model.status).filter(Boolean))]);
  fillSelect(aiCostFilter, [...new Set(models.map((model) => model.costLevel).filter(Boolean))]);
  fillSelect(aiRecommendationFilter, [...new Set(models.map((model) => model.icLabRecommendation).filter(Boolean))]);
}

function filteredAiModels(models = aiModelsCache) {
  return models.filter((model) => {
    if (aiProviderFilter?.value && model.providerId !== aiProviderFilter.value) return false;
    if (aiFamilyFilter?.value && model.family !== aiFamilyFilter.value) return false;
    if (aiModalityFilter?.value && model.modality !== aiModalityFilter.value) return false;
    if (aiStatusFilter?.value && model.status !== aiStatusFilter.value) return false;
    if (aiCostFilter?.value && model.costLevel !== aiCostFilter.value) return false;
    if (aiRuntimeFilter?.value && String(Boolean(model.allowedForRuntime)) !== aiRuntimeFilter.value) return false;
    if (aiRecommendationFilter?.value && model.icLabRecommendation !== aiRecommendationFilter.value) return false;
    if (aiPricingFilter?.value === "known" && !model.pricingKnown) return false;
    if (aiPricingFilter?.value === "unknown" && model.pricingKnown) return false;
    if (aiProto06Filter?.value === "usable" && !model.allowedForRuntime) return false;
    if (aiProto06Filter?.value === "not_for_proto06" && model.icLabRecommendation !== "not_for_proto06") return false;
    return true;
  });
}

function renderAiModels(models = aiModelsCache) {
  if (!aiModelsBox) return;
  const filtered = filteredAiModels(models);
  if (aiModelCount) aiModelCount.textContent = `${filtered.length} / ${models.length} modeles`;
  aiModelsBox.innerHTML = filtered.map((model) => `
    <article class="model-card" data-model-id="${esc(model.id)}">
      <div class="card-head">
        <div>
          <h4>${esc(model.title || model.providerModelId)}</h4>
          <p>${esc(model.shortDescription || "Description a completer.")}</p>
        </div>
        ${badge(model.status || "available", model.status === "available" ? "yes" : "")}
      </div>
      <dl class="meta-grid">
        <div><dt>Provider</dt><dd>${esc(model.providerId || "n/a")}</dd></div>
        <div><dt>Id technique</dt><dd><code>${esc(model.providerModelId || model.id)}</code></dd></div>
        <div><dt>Famille</dt><dd>${esc(model.family || "n/a")}</dd></div>
        <div><dt>Modalite <button class="help" type="button" title="Texte, audio, image, embedding, moderation ou temps reel.">?</button></dt><dd>${esc(model.modality || "n/a")}</dd></div>
        <div><dt>Recommandation IC-Lab <button class="help" type="button" title="Indication locale pour aider l'admin a choisir, sans activer automatiquement le modele.">?</button></dt><dd>${esc(recommendationLabel(model.icLabRecommendation))}</dd></div>
        <div><dt>Runtime <button class="help" type="button" title="Runtime autorise signifie que le modele pourra etre utilise par une activite automatisee. Pour l'instant, Proto06 reste scenarise.">?</button></dt><dd>${boolBadge(model.allowedForRuntime)}</dd></div>
        <div><dt>Cout</dt><dd>${esc(model.costLevel || "unknown")}</dd></div>
        <div><dt>Prix <button class="help" type="button" title="Prix renseigne signifie qu'une valeur tarifaire locale a ete saisie ou verifiee.">?</button></dt><dd>${esc(priceLabel(model))}</dd></div>
      </dl>
      <p><strong>Usage recommande :</strong> ${esc(model.recommendedUse || "A documenter.")}</p>
      <details class="advanced-card">
        <summary>Details techniques</summary>
        <dl class="meta-grid">
          <div><dt>Provider model id</dt><dd><code>${esc(model.providerModelId || "")}</code></dd></div>
          <div><dt>Capabilities</dt><dd>${esc((model.capabilities || []).join(", ") || "n/a")}</dd></div>
          <div><dt>Pricing source</dt><dd>${esc(model.pricing?.source || "a completer")}</dd></div>
          <div><dt>Pricing last checked</dt><dd>${esc(model.pricing?.lastCheckedAt || "n/a")}</dd></div>
          <div><dt>Notes</dt><dd>${esc(model.notes || "n/a")}</dd></div>
        </dl>
      </details>
      <details class="advanced-card">
        <summary>Modifier la fiche modele</summary>
        <form class="ai-model-form" data-model-id="${esc(model.id)}">
          <p class="soft-note">Ces champs modifient seulement la fiche locale du catalogue. Ils n'activent aucune generation IA.</p>
          <label>Titre <input name="title" value="${esc(model.title || "")}"></label>
          <label>Description courte <textarea name="shortDescription">${esc(model.shortDescription || "")}</textarea></label>
          <label>Statut <select name="status">${statusOptions(model.status || "available")}</select></label>
          <label>Cout qualitatif <select name="costLevel">
            ${["free", "low", "medium", "high", "very-high", "unknown"].map((value) => `<option value="${value}" ${model.costLevel === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <label>Recommandation IC-Lab <select name="icLabRecommendation">
            ${["recommended", "candidate", "experimental", "restricted", "not_for_proto06", "not_recommended", "not_reviewed"].map((value) => `<option value="${value}" ${model.icLabRecommendation === value ? "selected" : ""}>${recommendationLabel(value)}</option>`).join("")}
          </select></label>
          <label>Prix input <input name="inputPriceUsd" type="number" step="0.000001" value="${esc(model.pricing?.inputUsd ?? "")}"></label>
          <label>Prix input cache <input name="cachedInputPriceUsd" type="number" step="0.000001" value="${esc(model.pricing?.cachedInputUsd ?? "")}"></label>
          <label>Prix output <input name="outputPriceUsd" type="number" step="0.000001" value="${esc(model.pricing?.outputUsd ?? "")}"></label>
          <label>Unite prix <input name="pricingUnit" value="${esc(model.pricing?.unit || "")}" placeholder="1M_tokens"></label>
          <label>Source prix <input name="pricingSource" value="${esc(model.pricing?.source || "")}"></label>
          <label>Prix verifie le <input name="pricingLastCheckedAt" value="${esc(model.pricing?.lastCheckedAt || "")}" placeholder="YYYY-MM-DD"></label>
          <label>Usage recommande <textarea name="recommendedUse">${esc(model.recommendedUse || "")}</textarea></label>
          <label class="switch-line"><input name="allowedForTeachers" type="checkbox" ${model.allowedForTeachers ? "checked" : ""}> Autorise teacher</label>
          <label class="switch-line"><input name="allowedForStudents" type="checkbox" ${model.allowedForStudents ? "checked" : ""}> Autorise student</label>
          <label class="switch-line"><input name="allowedForRuntime" type="checkbox" ${model.allowedForRuntime ? "checked" : ""}> Autorise runtime</label>
          <p class="soft-note">Autoriser runtime ne suffit pas a activer une IA dans Proto06. Cela rend seulement le modele selectionnable pour une future configuration.</p>
          <label>Notes <textarea name="notes">${esc(model.notes || "")}</textarea></label>
          <button type="submit">Enregistrer la fiche modele</button>
        </form>
      </details>
    </article>
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
    <form class="ai-config-form row" data-config-id="${esc(config.id)}">
      <strong>${esc(config.title)}</strong>
      <p>${esc(config.prototypeId)} - ${esc(config.mode)} - ${esc(config.provider || "none")} - voix ${esc(config.voiceMode || "n/a")} / ${esc(config.voiceProvider || "n/a")}</p>
      <p>Cout ${esc(config.estimatedCostLevel || "n/a")} - duree max ${esc(config.maxDurationSeconds || "n/a")}s - statut ${esc(config.status)}</p>
      <label>Statut <input name="status" value="${esc(config.status || "")}"></label>
      <label>Description <textarea name="description">${esc(config.description || "")}</textarea></label>
      <label>Cout estime <select name="estimatedCostLevel">
        ${["free", "low", "medium", "high", "very-high"].map((value) => `<option value="${value}" ${config.estimatedCostLevel === value ? "selected" : ""}>${value}</option>`).join("")}
      </select></label>
      <label>Notes cout <textarea name="estimatedCostNotes">${esc(config.estimatedCostNotes || "")}</textarea></label>
      <label>Duree max <input name="maxDurationSeconds" type="number" min="0" step="30" value="${esc(config.maxDurationSeconds || 0)}"></label>
      <label>Provider <input name="provider" value="${esc(config.provider || "")}"></label>
      <label>Model ID <input name="modelId" value="${esc(config.modelId || "")}" placeholder="aucune cle API"></label>
      <label>Warnings <textarea name="warnings">${esc((config.warnings || []).join("\n"))}</textarea></label>
      <button type="submit">Mettre a jour</button>
    </form>
  `).join("") || "<p>Aucune configuration IA.</p>";
}

async function refreshAiProviders() {
  const [status, providers] = await Promise.all([
    api("/api/admin/ai/status"),
    api("/api/admin/ai/providers")
  ]);
  aiProvidersCache = providers.providers || [];
  renderAiProviderCatalog(status, aiProvidersCache);
}

async function refreshAiModels() {
  const models = await api("/api/admin/ai/models");
  aiModelsCache = models.models || [];
  fillAiModelFilters(aiModelsCache);
  renderAiProviderCatalog({ providers: aiProviderStatusCache }, aiProvidersCache);
  renderAiModels();
  renderAiDashboard();
  renderRuntimeModelOptions();
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
    aiProviderStatusCache = aiProviderStatus.providers || [];
    aiModelsCache = aiModels.models || [];
    renderAiProviderCatalog(aiProviderStatus, aiProvidersCache);
    fillAiModelFilters(aiModelsCache);
    [aiProviderFilter, aiFamilyFilter, aiModalityFilter, aiStatusFilter, aiRuntimeFilter, aiCostFilter, aiRecommendationFilter, aiProto06Filter, aiPricingFilter].forEach((select) => {
      select?.addEventListener("change", () => renderAiModels());
    });
    renderAiModels();
    renderAiDashboard(aiConfigs.configs || []);
    renderRuntimeModelOptions();
    renderSessionDrafts();
    coursesBox.innerHTML = courses.courses.map((course) => row(
      course.title,
      `${course.accessCode} - teacher ${course.teacherId} - owner ${course.ownerId || "n/a"} - ${institutionLabel(institutionRows, course.institutionId)} - ${course.visibility || "n/a"}`
    )).join("");
    prototypesBox.innerHTML = prototypes.prototypes.map((proto) => row(proto.title, `${proto.status} - ${proto.entryUrl || "pas de lien"}`)).join("");
    connectorsBox.innerHTML = statuses.prototypes.map((proto) => row(proto.title, `${proto.connectorStatus || "n/a"} - ${proto.activityApiUrl || "pas d'API"} ${proto.connectorMessage || ""}`)).join("");
    sessionsBox.textContent = JSON.stringify(sessions.sessions, null, 2);
  } catch (error) {
    toast(error.message, "error");
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
    toast("Modifications enregistrees.");
  } catch (error) {
    toast(`Impossible d'enregistrer : ${error.message}`, "error");
  }
});

aiProvidersBox?.addEventListener("click", (event) => {
  const restoreButton = event.target.closest(".restore-openai-url");
  if (!restoreButton) return;
  const form = restoreButton.closest("form");
  const input = form?.querySelector('input[name="baseUrl"]');
  if (input) input.value = OPENAI_OFFICIAL_BASE_URL;
  toast("URL officielle OpenAI prete a etre enregistree.");
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
    await refreshAiProviders();
    toast("Modifications enregistrees.");
  } catch (error) {
    toast(`Impossible d'enregistrer : ${error.message}`, "error");
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
        shortDescription: data.get("shortDescription"),
        status: data.get("status"),
        costLevel: data.get("costLevel"),
        icLabRecommendation: data.get("icLabRecommendation"),
        inputPriceUsd: data.get("inputPriceUsd"),
        cachedInputPriceUsd: data.get("cachedInputPriceUsd"),
        outputPriceUsd: data.get("outputPriceUsd"),
        pricingUnit: data.get("pricingUnit"),
        pricingSource: data.get("pricingSource"),
        pricingLastCheckedAt: data.get("pricingLastCheckedAt"),
        recommendedUse: data.get("recommendedUse"),
        allowedForTeachers: data.has("allowedForTeachers"),
        allowedForStudents: data.has("allowedForStudents"),
        allowedForRuntime: data.has("allowedForRuntime"),
        notes: data.get("notes")
      })
    });
    await refreshAiModels();
    toast("Modifications enregistrees.");
  } catch (error) {
    toast(`Impossible d'enregistrer : ${error.message}`, "error");
  }
});

aiRecommendedBox?.addEventListener("click", (event) => {
  const button = event.target.closest(".jump-model");
  if (!button) return;
  scrollToModel(button.dataset.modelId);
});

checkOpenAiRuntimeButton?.addEventListener("click", async () => {
  try {
    setLabBusy(true, "Verification du runtime OpenAI cote serveur...");
    const status = await api("/api/admin/ai/runtime/status");
    renderRuntimeStatus(status);
    renderLabResult("Runtime OpenAI verifie", {
      modelCatalogId: selectedRuntimeModelId() || "n/a",
      providerModelId: "n/a",
      text: `Cle presente cote serveur : ${boolLabel(status.hasApiKey)}\nNavigateur appelle OpenAI : non\nParcours apprenant generatif : non`
    });
  } catch (error) {
    renderLabResult("Verification impossible", { error: error.message }, "error");
  } finally {
    setLabBusy(false);
  }
});

smokeOpenAiButton?.addEventListener("click", async () => {
  try {
    const modelCatalogId = selectedRuntimeModelId();
    if (!modelCatalogId) throw new Error("Choisissez d'abord un modele OpenAI autorise runtime.");
    setLabBusy(true, "Smoke test serveur en cours...");
    const result = await api("/api/admin/ai/runtime/smoke-test", {
      method: "POST",
      body: JSON.stringify({ modelCatalogId })
    });
    renderLabResult("Smoke test termine", result);
  } catch (error) {
    renderLabResult("Smoke test impossible", { error: error.message, modelCatalogId: selectedRuntimeModelId() }, "error");
  } finally {
    setLabBusy(false);
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".draft-button");
  if (!button) return;
  try {
    setLabBusy(true, `Generation brouillon ${button.dataset.character} cote serveur...`);
    const result = await generateControlledDraft({
      characterId: button.dataset.character,
      targetLanguage: button.dataset.language
    });
    renderLabResult(`Brouillon ${button.dataset.character} genere`, result);
  } catch (error) {
    renderLabResult("Generation impossible", { error: error.message, modelCatalogId: selectedRuntimeModelId() }, "error");
  } finally {
    setLabBusy(false);
  }
});

syncOpenAiButton?.addEventListener("click", async () => {
  try {
    syncOpenAiButton.disabled = true;
    if (syncStatusBox) {
      syncStatusBox.innerHTML = `<span class="spinner" aria-hidden="true"></span> Synchronisation en cours...`;
    }
    toast("Synchronisation en cours...");
    const result = await api("/api/admin/ai/providers/openai/sync-models", { method: "POST" });
    aiModelsCache = result.models || [];
    fillAiModelFilters(aiModelsCache);
    renderAiModels();
    renderAiProviderCatalog({ providers: aiProviderStatusCache }, aiProvidersCache);
    renderAiDashboard();
    renderRuntimeModelOptions();
    const staleCount = aiModelsCache.filter((model) => model.status === "stale").length;
    const syncedAt = new Date().toLocaleString("fr-FR");
    const summary = `Synchronisation terminee : ${result.syncedCount || 0} modeles recuperes, ${result.totalModels || aiModelsCache.length} modeles au catalogue. ${staleCount} modele(s) stale. ${syncedAt}`;
    if (syncStatusBox) syncStatusBox.textContent = summary;
    toast(summary);
  } catch (error) {
    const readable = error.message.toLowerCase().includes("absente")
      ? "Impossible de synchroniser : aucune cle OpenAI n'est configuree cote serveur."
      : `Impossible de synchroniser : ${error.message}`;
    if (syncStatusBox) syncStatusBox.textContent = readable;
    toast(readable, "error");
  } finally {
    syncOpenAiButton.disabled = false;
  }
});

generateDraftButton?.addEventListener("click", async () => {
  try {
    setLabBusy(true, "Generation brouillon controle cote serveur...");
    const result = await generateControlledDraft();
    renderLabResult(`Brouillon ${result.draft?.characterId || "controle"} genere`, result);
  } catch (error) {
    renderLabResult("Generation impossible", { error: error.message, modelCatalogId: selectedRuntimeModelId() }, "error");
  } finally {
    setLabBusy(false);
  }
});

generateMainDraftsButton?.addEventListener("click", async () => {
  const presets = [
    { characterId: "Clara", targetLanguage: "es-ES" },
    { characterId: "Marco", targetLanguage: "it-IT" },
    { characterId: "Ana", targetLanguage: "pt-BR" }
  ];
  try {
    const model = selectedRuntimeModel();
    if (!model) throw new Error("Choisissez d'abord un modele OpenAI autorise runtime.");
    setLabBusy(true, `Generation sequentielle 0/${presets.length} - ${model.providerModelId} - ${model.costLevel || "unknown"} - store=false`);
    const results = [];
    for (let index = 0; index < presets.length; index += 1) {
      const preset = presets[index];
      if (aiLabResultBox) {
        aiLabResultBox.innerHTML = `<span class="spinner" aria-hidden="true"></span> Generation sequentielle ${index + 1}/${presets.length} : ${esc(preset.characterId)} avec ${esc(model.providerModelId)} - store=false - hors parcours apprenant.`;
      }
      const result = await generateControlledDraft(preset);
      results.push(result);
    }
    renderLabResult("Generation sequentielle terminee", {
      modelCatalogId: selectedRuntimeModelId(),
      providerModelId: model.providerModelId,
      text: `${results.length} brouillons generes successivement : ${results.map((item) => item.draft.characterId).join(", ")}.\nCout qualitatif : ${model.costLevel || "unknown"}.\nstore=false.\nNon utilise dans le parcours apprenant.`
    });
  } catch (error) {
    renderLabResult("Generation sequentielle impossible", { error: error.message, modelCatalogId: selectedRuntimeModelId() }, "error");
  } finally {
    setLabBusy(false);
  }
});

clearSessionDraftsButton?.addEventListener("click", () => {
  sessionDrafts = [];
  renderSessionDrafts();
  toast("Brouillons de session vides.");
});

aiRuntimeModelSelect?.addEventListener("change", renderRuntimeModelHint);

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest(".copy-session-draft");
  const deleteButton = event.target.closest(".delete-session-draft");
  if (copyButton) {
    const item = sessionDrafts[Number(copyButton.dataset.index)];
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.draft.text);
      toast("Brouillon copie.");
    } catch {
      toast("Copie impossible dans ce navigateur.", "error");
    }
  }
  if (deleteButton) {
    const index = Number(deleteButton.dataset.index);
    sessionDrafts.splice(index, 1);
    renderSessionDrafts();
    toast("Brouillon supprime de la session.");
  }
});

init();
