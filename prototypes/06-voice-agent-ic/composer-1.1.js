const CHARACTER_STORAGE_KEY = "proto06SelectedCharacters";
const SCENARIO_STORAGE_KEY = "proto06SelectedPedagogicalScenario";
const ACTIVITY_STORAGE_KEY = "proto06SelectedActivity";
const ACTIVITY_SOURCE_STORAGE_KEY = "proto06SelectedActivitySource";
const CUSTOM_ACTIVITIES_KEY = "proto06CustomActivities";
const DEBUG_KEY = "proto06Debug";
const API_BASE = "/api";
const MIN_SELECTION = 2;
const MAX_SELECTION = 4;
const debugEnabled = localStorage.getItem(DEBUG_KEY) === "1";

window.proto06Debug = function proto06Debug(enable = true) {
  if (enable) localStorage.setItem(DEBUG_KEY, "1");
  else localStorage.removeItem(DEBUG_KEY);
  location.reload();
};

function clearProto06LocalStorage({ keepDebug = false } = {}) {
  Object.keys(localStorage).filter((key) => key.startsWith("proto06")).forEach((key) => {
    if (keepDebug && key === DEBUG_KEY) return;
    localStorage.removeItem(key);
  });
}

function resetProto06State({ keepDebug = true } = {}) {
  clearProto06LocalStorage({ keepDebug });
  location.reload();
}

const scenarioList = document.querySelector("#scenarioList");
const activityList = document.querySelector("#activityList");
const characterList = document.querySelector("#characterList");
const selectedList = document.querySelector("#selectedList");
const selectionStatus = document.querySelector("#selectionStatus");
const meetingPreview = document.querySelector("#meetingPreview");
const configOutput = document.querySelector("#configOutput");
const launchButton = document.querySelector("#launchButton");
const resetButton = document.querySelector("#resetButton");
const serverStatus = document.querySelector("#serverStatus");

const baseScenario = scenarioCatalog[activeScenarioId];
let selectedActivityId = "";
let selectedActivitySource = "";
let selectedPedagogicalScenarioId = activePedagogicalScenarioId;
let selectedCharacterIds = [...baseScenario.participants].slice(0, 3);
let serverConnected = false;
let serverActivities = [];
let lastApiError = "";

async function apiJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Erreur API ${response.status}`);
  return body;
}

function updateServerStatus() {
  if (!serverStatus) return;
  serverStatus.textContent = serverConnected ? "Serveur connecte" : "Serveur indisponible - mode local";
  serverStatus.classList.toggle("is-offline", !serverConnected);
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

function getCatalogItem(catalog, id, label) {
  const item = catalog[id];
  if (!item) throw new Error(`${label} introuvable : ${id}`);
  return item;
}

function getCharacterBundle(characterId) {
  const character = getCatalogItem(characterCatalog, characterId, "Personnage");
  const language = getCatalogItem(languageCatalog, character.languageId, "Langue");
  const place = getCatalogItem(placeCatalog, character.placeId, "Lieu");
  return { character, language, place };
}

function getScenarioStepForCharacter(characterId) {
  return baseScenario.steps.find((step) => step.characterId === characterId);
}

function getTestimonyForCharacter(characterId, pedagogicalScenarioId) {
  const variants = testimonyVariantCatalog[characterId] || {};
  const selectedVariant = variants[pedagogicalScenarioId];
  const globalVariant = variants.globalUnderstanding;
  const catalogStep = getScenarioStepForCharacter(characterId);
  if (selectedVariant) return { ...selectedVariant, fallbackUsed: false, fallbackSource: "variante exacte" };
  if (globalVariant) return { ...globalVariant, fallbackUsed: pedagogicalScenarioId !== "globalUnderstanding", fallbackSource: "globalUnderstanding" };
  if (catalogStep) return { text: catalogStep.text, transparentWords: catalogStep.transparentWords, tags: [], translationFr: "", fallbackUsed: true, fallbackSource: "scenarioCatalog" };
  return { text: `Temoignage a completer pour ${characterId}.`, transparentWords: "temoignage a completer", tags: ["a completer"], translationFr: "", fallbackUsed: true, fallbackSource: "placeholder" };
}

function formatList(values) {
  return [...new Set(values)].join(", ");
}

function getCustomActivities() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_ACTIVITIES_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAllActivities() {
  return [
    ...Object.values(activityCatalog).map((activity) => ({ ...activity, source: "catalog" })),
    ...getCustomActivities().map((activity) => ({ ...activity, source: "local" })),
    ...serverActivities.map((activity) => ({ ...activity, source: "server" }))
  ];
}

function getSelectedActivity() {
  return selectedActivityId
    ? getAllActivities().find((activity) => activity.id === selectedActivityId && activity.source === selectedActivitySource)
    : null;
}

function loadActivity(activityId, source) {
  const activity = getAllActivities().find((item) => item.id === activityId && item.source === source);
  if (!activity) throw new Error(`Activite introuvable : ${activityId}`);
  selectedActivityId = activity.id;
  selectedActivitySource = activity.source;
  selectedPedagogicalScenarioId = activity.scenarioId;
  selectedCharacterIds = activity.characterIds.filter((characterId) => characterCatalog[characterId]).slice(0, MAX_SELECTION);
  render();
}

function buildScenarioFromSelection(selectionIds, pedagogicalScenarioId) {
  const pedagogicalScenario = getCatalogItem(pedagogicalScenarioCatalog, pedagogicalScenarioId, "Scenario pedagogique");
  const validIds = selectionIds.filter((id) => characterCatalog[id]);
  const bundles = validIds.map(getCharacterBundle);
  const names = bundles.map(({ character }) => character.displayName);
  const climateThemes = bundles.map(({ place }) => place.climateTheme);
  const keywords = bundles.flatMap(({ character, place }) => [
    character.displayName,
    ...character.tags,
    place.climateTheme,
    ...pedagogicalScenario.observationFocus
  ]);
  const steps = bundles.map(({ character, language }, index) => {
    const testimony = getTestimonyForCharacter(character.id, pedagogicalScenarioId);
    const nextBundle = bundles[index + 1];
    return {
      characterId: character.id,
      text: testimony.text,
      transparentWords: testimony.transparentWords,
      tags: testimony.tags || [],
      translationFr: testimony.translationFr || "",
      fallbackUsed: Boolean(testimony.fallbackUsed),
      fallbackSource: testimony.fallbackSource || "non renseigne",
      next: nextBundle ? `Ensuite : ${nextBundle.character.displayName} temoignera en ${nextBundle.language.label.toLowerCase()}.` : "Ensuite : a vous de reconstruire les points communs.",
      observation: null
    };
  });
  return {
    id: "composedMeeting",
    title: `Rencontre REPLI4C - ${pedagogicalScenario.shortTitle}`,
    description: "Rencontre experimentale construite a partir d'un scenario pedagogique et de personnages selectionnes.",
    instruction: pedagogicalScenario.instruction,
    pedagogicalScenario,
    participants: validIds,
    steps,
    commonQuestion: `Question commune : ${pedagogicalScenario.commonQuestion}`,
    fallbackUtterance: `Je comprends des changements lies a ${formatList(climateThemes)}. Pour l'activite "${pedagogicalScenario.shortTitle}", je peux repondre a partir de ces indices.`,
    initialObservation: pedagogicalScenario.initialObservation,
    analysis: {
      keywords: [...new Set(keywords.join(" ").split(/\s+/).map((word) => word.toLowerCase()).filter(Boolean))],
      response: "Merci. Vous mobilisez les temoignages pour repondre a la tache choisie et construire une comprehension partagee.",
      observation: pedagogicalScenario.initialObservation
    },
    partial: {
      response: "On peut repartir des personnes, des lieux, des mots proches et de la consigne choisie pour formuler une reponse partielle mais utile.",
      observation: pedagogicalScenario.initialObservation
    },
    preview: { names, climateThemes }
  };
}

function toggleScenario(scenarioId) {
  selectedPedagogicalScenarioId = scenarioId;
  selectedActivityId = "";
  selectedActivitySource = "";
  render();
}

function toggleSelection(characterId) {
  const alreadySelected = selectedCharacterIds.includes(characterId);
  if (alreadySelected) selectedCharacterIds = selectedCharacterIds.filter((id) => id !== characterId);
  else if (selectedCharacterIds.length < MAX_SELECTION) selectedCharacterIds = [...selectedCharacterIds, characterId];
  selectedActivityId = "";
  selectedActivitySource = "";
  render();
}

function renderScenarios() {
  scenarioList.innerHTML = "";
  Object.values(pedagogicalScenarioCatalog).forEach((scenario) => {
    const isSelected = scenario.id === selectedPedagogicalScenarioId;
    const card = document.createElement("article");
    card.className = "scenario-card";
    card.classList.toggle("is-selected", isSelected);
    card.innerHTML = `
      <h3>${scenario.title}</h3>
      <p>${scenario.description}</p>
      <div class="scenario-meta"><span>${scenario.taskType}</span><span>${scenario.difficulty}</span><span>${scenario.recommendedParticipantCount} pers. conseille</span></div>
      <div class="tag-list">${scenario.observationFocus.map((item) => `<span>${item}</span>`).join("")}</div>
      <button type="button">${isSelected ? "Selectionne" : "Choisir"}</button>
    `;
    card.querySelector("button").addEventListener("click", () => toggleScenario(scenario.id));
    scenarioList.append(card);
  });
}

function renderActivities() {
  activityList.innerHTML = "";
  getAllActivities().forEach((activity) => {
    const scenario = getCatalogItem(pedagogicalScenarioCatalog, activity.scenarioId, "Scenario pedagogique");
    const characterNames = activity.characterIds.map((id) => characterCatalog[id]?.displayName || id).join(", ");
    const card = document.createElement("article");
    card.className = "activity-card";
    card.classList.toggle("is-selected", activity.id === selectedActivityId && activity.source === selectedActivitySource);
    card.innerHTML = `
      <h3>${activity.title}${activity.source === "local" ? " (locale)" : activity.source === "server" ? " (serveur)" : ""}</h3>
      <p>${activity.pedagogicalGoal}</p>
      <div class="activity-meta"><span>${scenario.shortTitle}</span><span>${characterNames}</span><span>${(activity.languages || []).join(", ")}</span><span>${activity.estimatedDuration || ""}</span></div>
      <div class="tag-list">${(activity.climateThemes || []).map((theme) => `<span>${theme}</span>`).join("")}</div>
      <button type="button">${activity.id === selectedActivityId && activity.source === selectedActivitySource ? "Activite chargee" : "Charger cette activite"}</button>
    `;
    card.querySelector("button").addEventListener("click", () => loadActivity(activity.id, activity.source));
    activityList.append(card);
  });
}

function renderCharacters() {
  characterList.innerHTML = "";
  Object.keys(characterCatalog).forEach((characterId) => {
    const { character, language, place } = getCharacterBundle(characterId);
    const isSelected = selectedCharacterIds.includes(characterId);
    const card = document.createElement("article");
    card.className = "character-card";
    card.classList.toggle("is-selected", isSelected);
    card.innerHTML = `
      <div class="character-figure"><img src="${character.image}" alt="${character.displayName}"></div>
      <div class="character-content">
        <h2>${character.displayName}</h2>
        <p>${language.label} - ${place.label}, ${place.country}</p>
        <p class="theme">${place.climateTheme}</p>
        <div class="tag-list">${character.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        <button type="button" ${!isSelected && selectedCharacterIds.length >= MAX_SELECTION ? "disabled" : ""}>${isSelected ? "Retirer" : "Ajouter"}</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => toggleSelection(characterId));
    characterList.append(card);
  });
}

function renderSelection() {
  selectedList.innerHTML = "";
  selectedCharacterIds.forEach((characterId, index) => {
    const { character, language, place } = getCharacterBundle(characterId);
    const item = document.createElement("li");
    item.innerHTML = `<strong>${index + 1}. ${character.displayName}</strong><span>${language.label}</span><span>${place.country}</span>`;
    selectedList.append(item);
  });
  const count = selectedCharacterIds.length;
  selectionStatus.textContent = count < MIN_SELECTION ? `Selectionnez au moins ${MIN_SELECTION} personnages.` : `${count} personnage${count > 1 ? "s" : ""} selectionne${count > 1 ? "s" : ""}.`;
}

function renderPreview() {
  const scenario = buildScenarioFromSelection(selectedCharacterIds, selectedPedagogicalScenarioId);
  const selectedActivity = getSelectedActivity();
  const pedagogicalScenario = scenario.pedagogicalScenario;
  const bundles = selectedCharacterIds.map(getCharacterBundle);
  const debugMarkup = debugEnabled
    ? `
      <div class="composer-debug">
        <strong>Debug IC-Lab</strong>
        <div class="composer-debug-actions">
          <button type="button" data-debug-action="reload-server">Recharger activites serveur</button>
          <button type="button" data-debug-action="reset-meeting">Reset rencontre</button>
          <button type="button" data-debug-action="disable-debug">Desactiver debug</button>
        </div>
        <dl>
          <div><dt>Etat serveur</dt><dd>${serverConnected ? "connecte" : "indisponible"}</dd></div>
          <div><dt>Erreur API</dt><dd>${lastApiError || "aucune"}</dd></div>
          <div><dt>Activite ID</dt><dd>${selectedActivity?.id || "aucune"}</dd></div>
          <div><dt>Source activite</dt><dd>${selectedActivity?.source || "composition manuelle"}</dd></div>
          <div><dt>Endpoint</dt><dd>${selectedActivity?.source === "server" ? `${API_BASE}/activities/${selectedActivity.id}` : "n/a"}</dd></div>
          <div><dt>Scenario ID</dt><dd>${selectedPedagogicalScenarioId}</dd></div>
          <div><dt>Personnages IDs</dt><dd>${selectedCharacterIds.join(", ")}</dd></div>
        </dl>
      </div>
    `
    : "";
  const activityMarkup = selectedActivity
    ? `<div class="teacher-notes"><strong>${selectedActivity.title}</strong><p>${selectedActivity.pedagogicalGoal}</p><p>${selectedActivity.teacherNotes || ""}</p><p>${selectedActivity.whyThisActivity || ""}</p></div>`
    : "";
  meetingPreview.innerHTML = `
    ${activityMarkup}
    <dl>
      <div><dt>Activite</dt><dd>${pedagogicalScenario.title}</dd></div>
      <div><dt>Source</dt><dd>${selectedActivity?.source || "composition manuelle"}</dd></div>
      <div><dt>Ordre</dt><dd>${bundles.map(({ character }) => character.displayName).join(" -> ")}</dd></div>
      <div><dt>Langues</dt><dd>${formatList(bundles.map(({ language }) => language.label))}</dd></div>
      <div><dt>Lieux</dt><dd>${formatList(bundles.map(({ place }) => `${place.label} (${place.country})`))}</dd></div>
      <div><dt>Theme</dt><dd>${formatList(bundles.map(({ place }) => place.climateTheme))}</dd></div>
      <div><dt>Question</dt><dd>${scenario.commonQuestion}</dd></div>
    </dl>
    ${debugMarkup}
  `;
  meetingPreview.querySelector('[data-debug-action="reload-server"]')?.addEventListener("click", async () => {
    await refreshServerActivities();
    render();
  });
  meetingPreview.querySelector('[data-debug-action="reset-meeting"]')?.addEventListener("click", () => resetProto06State({ keepDebug: true }));
  meetingPreview.querySelector('[data-debug-action="disable-debug"]')?.addEventListener("click", () => resetProto06State({ keepDebug: false }));
  configOutput.textContent = JSON.stringify(scenario, null, 2);
}

function renderActions() {
  launchButton.disabled = selectedCharacterIds.length < MIN_SELECTION;
}

function render() {
  renderActivities();
  renderScenarios();
  renderCharacters();
  renderSelection();
  renderPreview();
  renderActions();
}

launchButton.addEventListener("click", () => {
  if (selectedCharacterIds.length < MIN_SELECTION) return;
  localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(selectedCharacterIds));
  localStorage.setItem(SCENARIO_STORAGE_KEY, selectedPedagogicalScenarioId);
  if (selectedActivityId) {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, selectedActivityId);
    localStorage.setItem(ACTIVITY_SOURCE_STORAGE_KEY, selectedActivitySource || getSelectedActivity()?.source || "catalog");
  } else {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_SOURCE_STORAGE_KEY);
  }
  window.location.href = "index-1.1.html";
});

resetButton.addEventListener("click", () => {
  selectedActivityId = "";
  selectedActivitySource = "";
  selectedPedagogicalScenarioId = activePedagogicalScenarioId;
  selectedCharacterIds = [...baseScenario.participants].slice(0, 3);
  render();
});

async function init() {
  await refreshServerActivities();
  render();
}

init();
