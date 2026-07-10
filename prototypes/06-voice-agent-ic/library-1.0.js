const CUSTOM_KEY = "proto06CustomActivities";
const DEBUG_KEY = "proto06Debug";
const selectedKeys = {
  activity: "proto06SelectedActivity",
  source: "proto06SelectedActivitySource",
  characters: "proto06SelectedCharacters",
  scenario: "proto06SelectedPedagogicalScenario",
  editing: "proto06EditingActivity",
  editingSource: "proto06EditingActivitySource"
};

const activityList = document.querySelector("#activityList");
const detailBox = document.querySelector("#detailBox");
const jsonBox = document.querySelector("#jsonBox");
const debugBox = document.querySelector("#debugBox");
const filters = {
  search: document.querySelector("#searchInput"),
  source: document.querySelector("#sourceFilter"),
  scenario: document.querySelector("#scenarioFilter"),
  language: document.querySelector("#languageFilter"),
  theme: document.querySelector("#themeFilter"),
  duration: document.querySelector("#durationFilter"),
  status: document.querySelector("#statusFilter")
};

let selectedActivity = null;

window.proto06Debug = function proto06Debug(enable = true) {
  if (enable) localStorage.setItem(DEBUG_KEY, "1");
  else localStorage.removeItem(DEBUG_KEY);
  location.reload();
};

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
    ...Object.values(activityCatalog).map((activity) => ({ ...activity, source: "catalog" })),
    ...readCustomActivities().map((activity) => ({ ...activity, source: "local" }))
  ];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function launchActivity(activity) {
  localStorage.setItem(selectedKeys.activity, activity.id);
  localStorage.setItem(selectedKeys.source, activity.source);
  localStorage.setItem(selectedKeys.characters, JSON.stringify(activity.characterIds));
  localStorage.setItem(selectedKeys.scenario, activity.scenarioId);
  window.location.href = "index-1.0.html";
}

function editActivity(activity) {
  localStorage.setItem(selectedKeys.editing, activity.id);
  localStorage.setItem(selectedKeys.editingSource, activity.source);
  window.location.href = "admin-1.0.html";
}

function duplicateActivity(activity) {
  const copy = {
    ...structuredClone(activity),
    id: `local-copy-${activity.id}-${Date.now()}`,
    title: `Copie de ${activity.title}`,
    author: activity.author || "Local",
    status: "local-draft",
    createdAt: today(),
    updatedAt: today()
  };
  delete copy.source;
  writeCustomActivities([...readCustomActivities(), copy]);
  render();
  showDetails({ ...copy, source: "local" });
}

function deleteLocalActivity(activity) {
  if (activity.source !== "local") return;
  if (!confirm(`Supprimer l'activité locale "${activity.title}" ?`)) return;
  writeCustomActivities(readCustomActivities().filter((item) => item.id !== activity.id));
  selectedActivity = null;
  render();
}

function exportActivity(activity) {
  jsonBox.value = JSON.stringify(activity, null, 2);
}

function validateImport(activity) {
  return Boolean(activity.id && activity.title && activity.scenarioId && Array.isArray(activity.characterIds));
}

function importActivity() {
  try {
    const activity = JSON.parse(jsonBox.value);
    if (!validateImport(activity)) throw new Error("JSON incomplet : id, title, scenarioId et characterIds sont requis.");
    const activities = readCustomActivities();
    let imported = { ...activity, status: activity.status || "local-draft", updatedAt: today() };
    if (activities.some((item) => item.id === imported.id)) {
      imported = { ...imported, id: `local-import-${imported.id}-${Date.now()}`, createdAt: today() };
    }
    writeCustomActivities([...activities, imported]);
    render();
    showDetails({ ...imported, source: "local" });
  } catch (error) {
    alert(error.message);
  }
}

function searchableText(activity) {
  return [
    activity.title,
    activity.pedagogicalGoal,
    activity.author,
    ...(activity.tags || []),
    ...(activity.climateThemes || []),
    ...(activity.characterIds || []),
    ...(activity.languages || [])
  ].join(" ").toLowerCase();
}

function filteredActivities() {
  const term = filters.search.value.trim().toLowerCase();
  return allActivities().filter((activity) => {
    if (term && !searchableText(activity).includes(term)) return false;
    if (filters.source.value !== "all" && activity.source !== filters.source.value) return false;
    if (filters.scenario.value !== "all" && activity.scenarioId !== filters.scenario.value) return false;
    if (filters.language.value !== "all" && !(activity.languages || []).includes(filters.language.value)) return false;
    if (filters.theme.value !== "all" && !(activity.climateThemes || []).includes(filters.theme.value)) return false;
    if (filters.duration.value !== "all" && activity.estimatedDuration !== filters.duration.value) return false;
    if (filters.status.value !== "all" && activity.status !== filters.status.value) return false;
    return true;
  });
}

function fillFilterOptions() {
  const activities = allActivities();
  const addOptions = (select, values) => {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  };
  addOptions(filters.scenario, Object.keys(pedagogicalScenarioCatalog));
  addOptions(filters.language, [...new Set(activities.flatMap((item) => item.languages || []))]);
  addOptions(filters.theme, [...new Set(activities.flatMap((item) => item.climateThemes || []))]);
  addOptions(filters.duration, [...new Set(activities.map((item) => item.estimatedDuration).filter(Boolean))]);
  addOptions(filters.status, [...new Set(activities.map((item) => item.status).filter(Boolean))]);
}

function render() {
  const activities = filteredActivities();
  activityList.innerHTML = "";
  activities.forEach((activity) => {
    const scenario = pedagogicalScenarioCatalog[activity.scenarioId];
    const card = document.createElement("article");
    card.className = "activity-card";
    card.innerHTML = `
      <h2>${activity.title}</h2>
      <p>${activity.pedagogicalGoal}</p>
      <div class="meta-row">
        <span>${scenario?.shortTitle || activity.scenarioId}</span>
        <span>${activity.source === "local" ? "locale" : "native"}</span>
        <span>${activity.estimatedDuration || "durée libre"}</span>
        <span>${activity.status || "prototype"}</span>
      </div>
      <p>${activity.characterIds.map((id) => characterCatalog[id]?.displayName || id).join(", ")}</p>
      <p>${(activity.languages || []).join(", ")} · ${(activity.climateThemes || []).join(", ")}</p>
      <div class="tag-row">${(activity.tags || []).map((tag) => `<span>${tag}</span>`).join("")}</div>
      <div class="card-actions">
        <button data-action="details">Voir détails</button>
        <button data-action="launch">Lancer</button>
        <button data-action="edit">Modifier</button>
        <button data-action="duplicate">Dupliquer</button>
        <button data-action="export">Exporter</button>
        ${activity.source === "local" ? '<button class="danger" data-action="delete">Supprimer</button>' : ""}
      </div>
    `;
    card.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return showDetails(activity);
      if (action === "details") showDetails(activity);
      if (action === "launch") launchActivity(activity);
      if (action === "edit") editActivity(activity);
      if (action === "duplicate") duplicateActivity(activity);
      if (action === "export") exportActivity(activity);
      if (action === "delete") deleteLocalActivity(activity);
    });
    activityList.append(card);
  });
  renderDebug();
}

function showDetails(activity) {
  selectedActivity = activity;
  detailBox.innerHTML = `
    <dl>
      <dt>Titre</dt><dd>${activity.title}</dd>
      <dt>Objectif</dt><dd>${activity.pedagogicalGoal}</dd>
      <dt>Pourquoi</dt><dd>${activity.whyThisActivity || "n/a"}</dd>
      <dt>Notes</dt><dd>${activity.teacherNotes || "n/a"}</dd>
      <dt>Consigne</dt><dd>${activity.instructions || "n/a"}</dd>
      <dt>Question</dt><dd>${activity.commonQuestion || "n/a"}</dd>
      <dt>Personnages</dt><dd>${activity.characterIds.map((id) => `${characterCatalog[id]?.displayName || id} (${characterCatalog[id]?.languageId || "?"})`).join(", ")}</dd>
      <dt>Thèmes</dt><dd>${(activity.climateThemes || []).join(", ")}</dd>
      <dt>Tags</dt><dd>${(activity.tags || []).join(", ")}</dd>
      <dt>Version</dt><dd>${activity.version || "n/a"}</dd>
      <dt>Source</dt><dd>${activity.source}</dd>
      <dt>Dates</dt><dd>${activity.createdAt || "?"} / ${activity.updatedAt || "?"}</dd>
    </dl>
  `;
  if (localStorage.getItem(DEBUG_KEY) === "1") {
    jsonBox.value = JSON.stringify(activity, null, 2);
  }
  renderDebug();
}

function renderDebug() {
  if (localStorage.getItem(DEBUG_KEY) !== "1") {
    debugBox.hidden = true;
    return;
  }
  const nativeCount = Object.keys(activityCatalog).length;
  const localCount = readCustomActivities().length;
  debugBox.hidden = false;
  debugBox.innerHTML = `
    <strong>Debug IC-Lab</strong>
    <p>Natives: ${nativeCount} · Locales: ${localCount}</p>
    <p>Clés: ${Object.keys(localStorage).filter((key) => key.startsWith("proto06")).join(", ") || "aucune"}</p>
    <p>Activité sélectionnée: ${selectedActivity?.id || "aucune"}</p>
    <button id="debugReset" type="button">Reset rencontre</button>
    <button id="debugOff" type="button">Désactiver debug</button>
  `;
  debugBox.querySelector("#debugReset").addEventListener("click", () => {
    Object.keys(localStorage).filter((key) => key.startsWith("proto06") && key !== DEBUG_KEY).forEach((key) => localStorage.removeItem(key));
    location.reload();
  });
  debugBox.querySelector("#debugOff").addEventListener("click", () => {
    localStorage.removeItem(DEBUG_KEY);
    location.reload();
  });
}

Object.values(filters).forEach((control) => control.addEventListener("input", render));
document.querySelector("#importButton").addEventListener("click", importActivity);

fillFilterOptions();
render();
showDetails(allActivities()[0]);
