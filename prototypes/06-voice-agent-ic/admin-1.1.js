const CUSTOM_KEY = "proto06CustomActivities";
const SELECTED_ACTIVITY_KEY = "proto06SelectedActivity";
const SELECTED_ACTIVITY_SOURCE_KEY = "proto06SelectedActivitySource";
const SELECTED_CHARACTERS_KEY = "proto06SelectedCharacters";
const SELECTED_SCENARIO_KEY = "proto06SelectedPedagogicalScenario";
const EDITING_ACTIVITY_KEY = "proto06EditingActivity";
const EDITING_ACTIVITY_SOURCE_KEY = "proto06EditingActivitySource";
const API_BASE = "/api";

const activityCards = document.querySelector("#activityCards");
const activityForm = document.querySelector("#activityForm");
const validationBox = document.querySelector("#validationBox");
const previewBox = document.querySelector("#previewBox");
const characterChoices = document.querySelector("#characterChoices");
const scenarioSelect = document.querySelector("#scenarioSelect");
const importInput = document.querySelector("#importInput");
const serverStatus = document.querySelector("#serverStatus");
const saveServerButton = document.querySelector("#saveServerButton");

let currentActivity = null;
let currentSource = "local";
let serverConnected = false;
let serverActivities = [];
let lastApiError = "";

function readCustomActivities() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomActivities(activities) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(activities));
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.details?.join(" ") || `Erreur API ${response.status}`);
  return body;
}

function updateServerStatus() {
  if (!serverStatus) return;
  serverStatus.textContent = serverConnected ? "Serveur connecte" : "Serveur indisponible - mode local";
  serverStatus.classList.toggle("is-offline", !serverConnected);
  saveServerButton.disabled = !serverConnected;
}

async function refreshServerActivities() {
  try {
    await apiJson("/health");
    serverActivities = await apiJson("/activities");
    serverConnected = true;
    lastApiError = "";
  } catch (error) {
    serverActivities = [];
    serverConnected = false;
    lastApiError = error.message;
  }
  updateServerStatus();
}

function allActivities() {
  return [
    ...Object.values(activityCatalog).map((activity) => ({ ...activity, source: "catalog" })),
    ...readCustomActivities().map((activity) => ({ ...activity, source: "local" })),
    ...serverActivities.map((activity) => ({ ...activity, source: "server" }))
  ];
}

function getRequestedActivity() {
  const id = localStorage.getItem(EDITING_ACTIVITY_KEY);
  const source = localStorage.getItem(EDITING_ACTIVITY_SOURCE_KEY);
  if (!id) return null;
  return allActivities().find((activity) => activity.id === id && activity.source === source) || null;
}

function splitList(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cloneForEdit(activity) {
  const copy = structuredClone(activity);
  currentSource = activity.source || "local";
  if (activity.source === "catalog") {
    copy.id = `local-${activity.id}-${Date.now()}`;
    copy.status = "local-draft";
    copy.createdAt = today();
  }
  copy.updatedAt = today();
  delete copy.source;
  return copy;
}

function getFormActivity() {
  const characterIds = [...characterChoices.querySelectorAll("input:checked")].map((input) => input.value);
  const languages = [...new Set(characterIds.map((id) => characterCatalog[id]?.languageId).filter(Boolean))];
  return {
    id: currentActivity?.id || `local-activity-${Date.now()}`,
    title: document.querySelector("#titleInput").value.trim(),
    shortTitle: document.querySelector("#shortTitleInput").value.trim(),
    author: document.querySelector("#authorInput").value.trim() || "IC-Lab",
    version: currentActivity?.version || "1.1",
    status: document.querySelector("#statusInput").value.trim() || "local-draft",
    pedagogicalGoal: document.querySelector("#goalInput").value.trim(),
    scenarioId: scenarioSelect.value,
    characterIds,
    estimatedDuration: document.querySelector("#durationInput").value.trim(),
    targetUsers: splitList(document.querySelector("#targetUsersInput").value),
    languages,
    climateThemes: splitList(document.querySelector("#themesInput").value),
    instructions: document.querySelector("#instructionsInput").value.trim(),
    commonQuestion: document.querySelector("#questionInput").value.trim(),
    teacherNotes: document.querySelector("#notesInput").value.trim(),
    whyThisActivity: document.querySelector("#whyInput").value.trim(),
    createdAt: currentActivity?.createdAt || today(),
    updatedAt: today(),
    tags: splitList(document.querySelector("#tagsInput").value)
  };
}

function validateActivity(activity) {
  const errors = [];
  if (!activity.title) errors.push("Titre obligatoire.");
  if (!activity.scenarioId) errors.push("Scenario obligatoire.");
  if (!activity.pedagogicalGoal) errors.push("Objectif pedagogique obligatoire.");
  if (!activity.commonQuestion) errors.push("Question commune obligatoire.");
  if (activity.characterIds.length < 2) errors.push("Selectionnez au moins 2 personnages.");
  if (activity.characterIds.length > 4) errors.push("Selectionnez au maximum 4 personnages.");
  return errors;
}

function fillForm(activity) {
  currentActivity = cloneForEdit(activity);
  document.querySelector("#titleInput").value = currentActivity.title || "";
  document.querySelector("#shortTitleInput").value = currentActivity.shortTitle || "";
  document.querySelector("#authorInput").value = currentActivity.author || "";
  document.querySelector("#statusInput").value = currentActivity.status || "local-draft";
  document.querySelector("#durationInput").value = currentActivity.estimatedDuration || "";
  document.querySelector("#goalInput").value = currentActivity.pedagogicalGoal || "";
  scenarioSelect.value = currentActivity.scenarioId || activePedagogicalScenarioId;
  document.querySelector("#targetUsersInput").value = (currentActivity.targetUsers || []).join(", ");
  document.querySelector("#themesInput").value = (currentActivity.climateThemes || []).join(", ");
  document.querySelector("#instructionsInput").value = currentActivity.instructions || "";
  document.querySelector("#questionInput").value = currentActivity.commonQuestion || "";
  document.querySelector("#notesInput").value = currentActivity.teacherNotes || "";
  document.querySelector("#whyInput").value = currentActivity.whyThisActivity || "";
  document.querySelector("#tagsInput").value = (currentActivity.tags || []).join(", ");
  characterChoices.querySelectorAll("input").forEach((input) => {
    input.checked = (currentActivity.characterIds || []).includes(input.value);
  });
  renderPreview();
}

function renderCards() {
  activityCards.innerHTML = "";
  allActivities().forEach((activity) => {
    const scenario = pedagogicalScenarioCatalog[activity.scenarioId];
    const card = document.createElement("article");
    card.className = "activity-card";
    card.innerHTML = `
      <h3>${activity.title}</h3>
      <p>${scenario?.shortTitle || activity.scenarioId} - ${activity.estimatedDuration || "duree libre"} - ${activity.source}</p>
      <p>${activity.characterIds.map((id) => characterCatalog[id]?.displayName || id).join(", ")}</p>
      <p>${(activity.tags || []).join(", ")}</p>
      <button type="button">Modifier</button>
    `;
    card.querySelector("button").addEventListener("click", () => fillForm(activity));
    activityCards.append(card);
  });
}

function renderChoices() {
  scenarioSelect.innerHTML = "";
  Object.values(pedagogicalScenarioCatalog).forEach((scenario) => {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = scenario.title;
    scenarioSelect.append(option);
  });
  characterChoices.innerHTML = "";
  Object.values(characterCatalog).forEach((character) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${character.id}"> ${character.displayName}`;
    characterChoices.append(label);
  });
}

function renderValidation(errors) {
  validationBox.hidden = errors.length === 0;
  validationBox.innerHTML = errors.map((error) => `<div>${error}</div>`).join("");
}

function renderPreview() {
  const activity = getFormActivity();
  const errors = validateActivity(activity);
  renderValidation(errors);
  previewBox.innerHTML = `
    <dl>
      <dt>Titre</dt><dd>${activity.title || "Sans titre"}</dd>
      <dt>Objectif</dt><dd>${activity.pedagogicalGoal || "Non renseigne"}</dd>
      <dt>Scenario</dt><dd>${pedagogicalScenarioCatalog[activity.scenarioId]?.title || "Non defini"}</dd>
      <dt>Personnages</dt><dd>${activity.characterIds.map((id) => characterCatalog[id]?.displayName || id).join(", ") || "Aucun"}</dd>
      <dt>Langues</dt><dd>${activity.languages.join(", ") || "n/a"}</dd>
      <dt>Themes</dt><dd>${activity.climateThemes.join(", ") || "n/a"}</dd>
      <dt>Question</dt><dd>${activity.commonQuestion || "n/a"}</dd>
      <dt>Source edition</dt><dd>${currentSource}</dd>
      <dt>Serveur</dt><dd>${serverConnected ? "connecte" : `indisponible (${lastApiError || "mode local"})`}</dd>
      <dt>Erreurs</dt><dd>${errors.length ? errors.join(" ") : "Aucune"}</dd>
    </dl>
  `;
}

function saveLocalActivity() {
  const activity = getFormActivity();
  const errors = validateActivity(activity);
  renderValidation(errors);
  if (errors.length) return null;
  const activities = readCustomActivities();
  const index = activities.findIndex((item) => item.id === activity.id);
  activity.status = activity.status || "local-draft";
  activity.updatedAt = today();
  if (index >= 0) activities[index] = activity;
  else activities.push(activity);
  writeCustomActivities(activities);
  currentActivity = activity;
  currentSource = "local";
  renderCards();
  renderPreview();
  return activity;
}

async function saveServerActivity() {
  const activity = getFormActivity();
  const errors = validateActivity(activity);
  renderValidation(errors);
  if (errors.length) return null;
  if (!serverConnected) {
    renderValidation(["Serveur indisponible : sauvegarde locale seulement possible."]);
    return null;
  }
  const payload = { ...activity, status: activity.status || "server-draft" };
  try {
    const isExistingServer = currentSource === "server" && serverActivities.some((item) => item.id === payload.id);
    const saved = isExistingServer
      ? await apiJson(`/activities/${encodeURIComponent(payload.id)}`, { method: "PUT", body: JSON.stringify(payload) })
      : await apiJson("/activities", { method: "POST", body: JSON.stringify(payload) });
    await refreshServerActivities();
    currentActivity = saved;
    currentSource = "server";
    renderCards();
    renderPreview();
    return saved;
  } catch (error) {
    lastApiError = error.message;
    renderValidation([error.message]);
    renderPreview();
    return null;
  }
}

function launchActivity(activity, source = currentSource) {
  localStorage.setItem(SELECTED_ACTIVITY_KEY, activity.id);
  localStorage.setItem(SELECTED_ACTIVITY_SOURCE_KEY, source === "server" ? "server" : "local");
  localStorage.setItem(SELECTED_CHARACTERS_KEY, JSON.stringify(activity.characterIds));
  localStorage.setItem(SELECTED_SCENARIO_KEY, activity.scenarioId);
  window.location.href = "index-1.1.html";
}

activityForm.addEventListener("input", renderPreview);
activityForm.addEventListener("change", renderPreview);
activityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveLocalActivity();
});

saveServerButton.addEventListener("click", saveServerActivity);

document.querySelector("#launchButton").addEventListener("click", () => {
  const activity = currentSource === "server" ? getFormActivity() : saveLocalActivity();
  if (activity) launchActivity(activity, currentSource);
});

document.querySelector("#exportButton").addEventListener("click", () => {
  importInput.value = JSON.stringify(getFormActivity(), null, 2);
});

document.querySelector("#importButton").addEventListener("click", () => {
  try {
    const activity = JSON.parse(importInput.value);
    const minimal = activity.title && activity.scenarioId && Array.isArray(activity.characterIds);
    if (!minimal) throw new Error("JSON incomplet : title, scenarioId et characterIds sont requis.");
    fillForm({ ...activity, source: "local" });
  } catch (error) {
    renderValidation([error.message]);
  }
});

async function init() {
  renderChoices();
  await refreshServerActivities();
  renderCards();
  fillForm(getRequestedActivity() || Object.values(activityCatalog)[0]);
}

init();
