const CUSTOM_KEY = "proto06CustomActivities";
const SELECTED_ACTIVITY_KEY = "proto06SelectedActivity";
const SELECTED_ACTIVITY_SOURCE_KEY = "proto06SelectedActivitySource";
const SELECTED_CHARACTERS_KEY = "proto06SelectedCharacters";
const SELECTED_SCENARIO_KEY = "proto06SelectedPedagogicalScenario";

const activityCards = document.querySelector("#activityCards");
const activityForm = document.querySelector("#activityForm");
const validationBox = document.querySelector("#validationBox");
const previewBox = document.querySelector("#previewBox");
const characterChoices = document.querySelector("#characterChoices");
const scenarioSelect = document.querySelector("#scenarioSelect");
const importInput = document.querySelector("#importInput");

let currentActivity = null;
let validationErrors = [];

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

function allActivities() {
  return [
    ...Object.values(activityCatalog).map((activity) => ({
      ...activity,
      source: "catalog"
    })),
    ...readCustomActivities().map((activity) => ({
      ...activity,
      source: "local"
    }))
  ];
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cloneForEdit(activity) {
  const copy = structuredClone(activity);
  copy.id = activity.source === "local"
    ? activity.id
    : `local-${activity.id}-${Date.now()}`;
  copy.status = "local-draft";
  copy.createdAt = activity.source === "local" ? activity.createdAt : today();
  copy.updatedAt = today();
  delete copy.source;
  return copy;
}

function getFormActivity() {
  const characterIds = [...characterChoices.querySelectorAll("input:checked")]
    .map((input) => input.value);
  const languages = [...new Set(characterIds.map((id) => characterCatalog[id]?.languageId).filter(Boolean))];

  return {
    id: currentActivity?.id || `local-activity-${Date.now()}`,
    title: document.querySelector("#titleInput").value.trim(),
    shortTitle: document.querySelector("#shortTitleInput").value.trim(),
    author: document.querySelector("#authorInput").value.trim() || "IC-Lab",
    version: currentActivity?.version || "0.1",
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
  if (!activity.scenarioId) errors.push("Scénario obligatoire.");
  if (!activity.pedagogicalGoal) errors.push("Objectif pédagogique obligatoire.");
  if (!activity.commonQuestion) errors.push("Question commune obligatoire.");
  if (activity.characterIds.length < 2) errors.push("Sélectionnez au moins 2 personnages.");
  if (activity.characterIds.length > 4) errors.push("Sélectionnez au maximum 4 personnages.");

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
      <p>${scenario?.shortTitle || activity.scenarioId} · ${activity.estimatedDuration || "durée libre"}</p>
      <p>${activity.characterIds.map((id) => characterCatalog[id]?.displayName || id).join(", ")}</p>
      <p>${(activity.tags || []).join(", ")}</p>
      <button type="button">Modifier une copie</button>
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
  validationErrors = errors;
  validationBox.hidden = errors.length === 0;
  validationBox.innerHTML = errors.map((error) => `<div>${error}</div>`).join("");
}

function renderPreview() {
  const activity = getFormActivity();
  const errors = validateActivity(activity);
  const places = activity.characterIds
    .map((id) => placeCatalog[characterCatalog[id]?.placeId]?.label)
    .filter(Boolean);

  renderValidation(errors);
  previewBox.innerHTML = `
    <dl>
      <dt>Titre</dt><dd>${activity.title || "Sans titre"}</dd>
      <dt>Objectif</dt><dd>${activity.pedagogicalGoal || "Non renseigné"}</dd>
      <dt>Scénario</dt><dd>${pedagogicalScenarioCatalog[activity.scenarioId]?.title || "Non défini"}</dd>
      <dt>Personnages</dt><dd>${activity.characterIds.map((id) => characterCatalog[id]?.displayName || id).join(", ") || "Aucun"}</dd>
      <dt>Langues</dt><dd>${activity.languages.join(", ") || "n/a"}</dd>
      <dt>Lieux</dt><dd>${places.join(", ") || "n/a"}</dd>
      <dt>Thèmes</dt><dd>${activity.climateThemes.join(", ") || "n/a"}</dd>
      <dt>Consigne</dt><dd>${activity.instructions || "n/a"}</dd>
      <dt>Question</dt><dd>${activity.commonQuestion || "n/a"}</dd>
      <dt>Notes</dt><dd>${activity.teacherNotes || "n/a"}</dd>
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

  if (index >= 0) {
    activities[index] = activity;
  } else {
    activities.push(activity);
  }

  writeCustomActivities(activities);
  currentActivity = activity;
  renderCards();
  renderPreview();
  return activity;
}

function launchActivity(activity) {
  localStorage.setItem(SELECTED_ACTIVITY_KEY, activity.id);
  localStorage.setItem(SELECTED_ACTIVITY_SOURCE_KEY, "local");
  localStorage.setItem(SELECTED_CHARACTERS_KEY, JSON.stringify(activity.characterIds));
  localStorage.setItem(SELECTED_SCENARIO_KEY, activity.scenarioId);
  window.location.href = "index-0.0.9.html";
}

activityForm.addEventListener("input", renderPreview);
activityForm.addEventListener("change", renderPreview);
activityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveLocalActivity();
});

document.querySelector("#launchButton").addEventListener("click", () => {
  const activity = saveLocalActivity();
  if (activity) launchActivity(activity);
});

document.querySelector("#exportButton").addEventListener("click", () => {
  const activity = getFormActivity();
  importInput.value = JSON.stringify(activity, null, 2);
});

document.querySelector("#importButton").addEventListener("click", () => {
  try {
    const activity = JSON.parse(importInput.value);
    const minimal = activity.id && activity.title && activity.scenarioId && Array.isArray(activity.characterIds);
    if (!minimal) throw new Error("JSON incomplet : id, title, scenarioId et characterIds sont requis.");
    fillForm(activity);
  } catch (error) {
    renderValidation([error.message]);
  }
});

renderChoices();
renderCards();
fillForm(Object.values(activityCatalog)[0]);
