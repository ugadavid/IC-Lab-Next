const TOKEN_KEY = "icHubAuthToken";
let courses = [];
let prototypes = [];
let institutions = [];
let visibleActivities = [];
let aiConfigs = [];
let prototypeAiConfigs = [];
let currentUser = null;
let connectorActivities = [];
let selectedActivity = null;

const userLine = document.querySelector("#userLine");
const courseList = document.querySelector("#courseList");
const visibleActivitiesBox = document.querySelector("#visibleActivities");
const aiModesBox = document.querySelector("#aiModesBox");
const assignCourse = document.querySelector("#assignCourse");
const prototypeSelect = document.querySelector("#prototypeSelect");
const activityPicker = document.querySelector("#activityPicker");
const connectorStatus = document.querySelector("#connectorStatus");
const aiConfigSelect = document.querySelector("#aiConfigSelect");
const aiConfigDetails = document.querySelector("#aiConfigDetails");
const message = document.querySelector("#message");

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

function snapshot(activity) {
  return {
    title: activity.title || activity.id,
    pedagogicalGoal: activity.pedagogicalGoal || "",
    scenarioId: activity.scenarioId || "",
    characterIds: Array.isArray(activity.characterIds) ? activity.characterIds : []
  };
}

async function loadAssignments(courseId) {
  const body = await api(`/api/courses/${courseId}/activities`);
  return body.assignments;
}

async function loadRuns(courseId) {
  const body = await api(`/api/courses/${courseId}/runs`);
  return body.runs || [];
}

function assignmentLabel(item) {
  return item.activityTitle || item.activitySnapshot?.title || item.activityId;
}

function institutionLabel(id) {
  if (!id) return "institution non renseignee";
  const institution = institutions.find((item) => item.id === id);
  return institution ? `${institution.shortName || institution.name}` : id;
}

function ownershipMeta(item) {
  if (!item.ownership) {
    return "paternite non referencee";
  }
  return `proprietaire ${item.ownership.ownerId || "n/a"} - ${institutionLabel(item.ownership.institutionId)} - ${item.ownership.visibility || "n/a"} - ${item.ownership.provenance?.kind || "provenance n/a"}`;
}

function debugMeta(data) {
  if (localStorage.getItem("icHubDebug") !== "1") return "";
  return `<pre class="debug-meta">${JSON.stringify(data, null, 2)}</pre>`;
}

function renderAiModes() {
  if (!aiModesBox) return;
  aiModesBox.innerHTML = aiConfigs.map((config) => `
    <article class="card ai-mode">
      <strong>${config.title}</strong>
      <p>${config.description || "Sans description"}</p>
      <p>Mode ${config.mode} - provider ${config.provider || "none"} - voix ${config.voiceMode || "n/a"} / ${config.voiceProvider || "n/a"}</p>
      <p>Cout ${config.estimatedCostLevel || "n/a"} - ${config.estimatedCostNotes || "note indisponible"}</p>
      <p>Duree max ${config.maxDurationSeconds || "n/a"}s - role ${config.pedagogicalRole || "none"} - statut ${config.status}</p>
      ${(config.warnings || []).map((warning) => `<small>${warning}</small>`).join("")}
    </article>
  `).join("") || "<p>Aucun mode IA disponible pour Prototype 06.</p>";
}

function aiConfigLabel(config) {
  if (!config) return "Mode IA non renseigne";
  const status = config.status === "active" ? "actif" : `${config.status} - non active`;
  return `${config.title} (${status}, cout ${config.estimatedCostLevel || "n/a"})`;
}

function renderAiConfigSelect() {
  if (!aiConfigSelect) return;
  aiConfigSelect.innerHTML = prototypeAiConfigs.map((config) =>
    `<option value="${config.id}">${aiConfigLabel(config)}</option>`
  ).join("");
  if (prototypeAiConfigs.some((config) => config.id === "aicfg_proto06_scripted_browser_voice")) {
    aiConfigSelect.value = "aicfg_proto06_scripted_browser_voice";
  }
  renderSelectedAiConfigDetails();
}

function renderSelectedAiConfigDetails() {
  if (!aiConfigDetails) return;
  const config = prototypeAiConfigs.find((item) => item.id === aiConfigSelect?.value);
  if (!config) {
    aiConfigDetails.textContent = "Aucun mode IA disponible pour ce prototype.";
    return;
  }
  aiConfigDetails.innerHTML = `
    <strong>${config.title}</strong><br>
    ${config.description || "Sans description"}<br>
    Cout ${config.estimatedCostLevel || "n/a"} - duree max ${config.maxDurationSeconds || "n/a"}s - voix ${config.voiceMode || "n/a"} / ${config.voiceProvider || "n/a"} - statut ${config.status}<br>
    ${(config.warnings || []).join(" ")}
  `;
}

function renderVisibleActivities() {
  if (!visibleActivitiesBox) return;
  if (!visibleActivities.length) {
    visibleActivitiesBox.innerHTML = "<p>Aucune ressource accessible pour le moment.</p>";
    return;
  }
  visibleActivitiesBox.innerHTML = visibleActivities.map((record) => {
    const canEdit = currentUser && (currentUser.role === "admin" || record.ownerId === currentUser.id);
    const editControls = canEdit
      ? `<label>Visibilite <select class="visibility-select" data-record-id="${record.id}">
          ${["private", "course", "institution", "shared", "public"].map((value) => `<option value="${value}" ${record.visibility === value ? "selected" : ""}>${value}</option>`).join("")}
        </select></label>`
      : "";
    return `
      <article class="card visible-activity">
        <strong>${record.title || record.activityId}</strong>
        <p>${record.prototypeId} / ${record.activityId} (${record.activitySource})</p>
        <p>Owner: ${record.ownerId || "n/a"} - ${institutionLabel(record.institutionId)} - ${record.visibility}</p>
        <p>Provenance: ${record.provenance?.kind || "n/a"} - raison: ${record.visibilityReason || "n/a"}</p>
        ${debugMeta({ reason: record.visibilityReason, theoreticalVisibility: record.theoreticalVisibility, assignments: record.assignments })}
        <button type="button" class="use-visible-activity" data-prototype-id="${record.prototypeId}" data-activity-id="${record.activityId}" data-activity-source="${record.activitySource}" data-title="${record.title || record.activityId}">Assigner</button>
        ${editControls}
      </article>
    `;
  }).join("");
}

function launchUrlForAssignment(item) {
  if (item.prototypeId !== "proto06") return "";
  const proto = prototypes.find((prototype) => prototype.id === item.prototypeId) || {};
  const params = new URLSearchParams({
    activityId: item.activityId,
    activitySource: item.activitySource || "server"
  });
  if (item.courseId) params.set("courseId", item.courseId);
  if (item.id) params.set("assignmentId", item.id);
  return `${proto.launchUrl || "http://127.0.0.1:8788/index-1.1.2.html"}?${params.toString()}`;
}

function formatDuration(ms) {
  if (!Number.isFinite(Number(ms))) return "n/a";
  const seconds = Math.round(Number(ms) / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes} min ${rest}s` : `${rest}s`;
}

function renderRuns(runs) {
  if (!runs.length) {
    return "<p>Aucune session etudiante pour ce cours.</p>";
  }
  return `
    <div class="runs-list">
      ${runs.slice(0, 8).map((run) => `
        <article class="run-row">
          <strong>${run.activityTitle || run.activityId}</strong>
          <span>${run.studentName || run.studentId}</span>
          <span>${run.status}</span>
          <small>${run.createdAt || "date inconnue"} - ${formatDuration(run.durationMs)} - ${run.eventCount || 0} evenement(s)</small>
        </article>
      `).join("")}
    </div>
  `;
}

async function renderCourses() {
  const rows = await Promise.all(courses.map(async (course) => {
    const [assignments, runs] = await Promise.all([loadAssignments(course.id), loadRuns(course.id)]);
    return `
      <article class="card">
        <h3>${course.title}</h3>
        <p>${course.description || "Sans description"}</p>
        <p>Code: ${course.accessCode} - ${course.level || "niveau libre"}</p>
        <p>Institution: ${institutionLabel(course.institutionId)} - visibilite: ${course.visibility || "n/a"} - owner: ${course.ownerId || course.teacherId}</p>
        <strong>Activites assignees</strong>
        <ul class="assignments">${assignments.map((item) => {
          const launchUrl = launchUrlForAssignment(item);
          const launchLink = launchUrl ? ` <a href="${launchUrl}" target="_blank" rel="noopener">Lancer</a>` : "";
          const modeLine = item.aiConfig ? `<br><small>Mode IA / voix : ${aiConfigLabel(item.aiConfig)}</small>` : "";
          return `<li>${item.prototypeId} / ${assignmentLabel(item)} (${item.activitySource})${launchLink}<br><small>${ownershipMeta(item)}</small>${modeLine}${debugMeta({ ownerId: item.ownership?.ownerId, institutionId: item.ownership?.institutionId, visibility: item.ownership?.visibility || item.visibility, provenance: item.ownership?.provenance, aiConfigId: item.aiConfigId, aiConfig: item.aiConfig })}</li>`;
        }).join("") || "<li>Aucune</li>"}</ul>
        ${debugMeta({ courseId: course.id, institutionId: course.institutionId, ownerId: course.ownerId, visibility: course.visibility })}
        <strong>Traces recentes</strong>
        ${renderRuns(runs)}
      </article>
    `;
  }));
  courseList.innerHTML = rows.join("") || "<p>Aucun cours.</p>";
  assignCourse.innerHTML = courses.map((course) => `<option value="${course.id}">${course.title}</option>`).join("");
}

function renderPrototypeOptions() {
  prototypeSelect.innerHTML = prototypes.map((proto) => `<option value="${proto.id}">${proto.title}</option>`).join("");
}

function renderActivities(status) {
  connectorStatus.textContent = status.message || `Connecteur ${status.connectorStatus || "n/a"}`;
  connectorStatus.classList.toggle("is-unavailable", status.connectorStatus !== "ok");
  connectorActivities = status.activities || [];
  selectedActivity = connectorActivities[0] || null;

  if (!connectorActivities.length) {
    activityPicker.innerHTML = "<p>Aucune activite serveur disponible pour ce prototype. Utilisez le champ manuel en fallback.</p>";
    return;
  }

  activityPicker.innerHTML = connectorActivities.map((activity, index) => `
    <label class="activity-option">
      <input type="radio" name="protoActivity" value="${activity.id}" ${index === 0 ? "checked" : ""}>
      <span>
        <strong>${activity.title || activity.id}</strong>
        <small>${activity.pedagogicalGoal || "Objectif non renseigne"}</small>
        <small>Scenario: ${activity.scenarioId || "n/a"} - Duree: ${activity.estimatedDuration || "n/a"} - Source: ${activity.source || "server"}</small>
        <small>Personnages: ${(activity.characterIds || []).join(", ") || "n/a"} - ID: ${activity.id}</small>
      </span>
    </label>
  `).join("");

  activityPicker.querySelectorAll("input[name='protoActivity']").forEach((input) => {
    input.addEventListener("change", () => {
      selectedActivity = connectorActivities.find((activity) => activity.id === input.value) || null;
      if (selectedActivity) {
        document.querySelector("#activityId").value = selectedActivity.id;
        document.querySelector("#activitySource").value = selectedActivity.source || "server";
      }
    });
  });
  if (selectedActivity) {
    document.querySelector("#activityId").value = selectedActivity.id;
    document.querySelector("#activitySource").value = selectedActivity.source || "server";
  }
}

async function loadPrototypeActivities() {
  const prototype = prototypes.find((item) => item.id === prototypeSelect.value);
  try {
    prototypeAiConfigs = (await api(`/api/prototypes/${prototypeSelect.value}/ai-configs`)).configs || [];
  } catch {
    prototypeAiConfigs = [];
  }
  renderAiConfigSelect();
  if (!prototype?.supportsActivities) {
    connectorStatus.textContent = "Ce prototype ne fournit pas encore de liste d'activites.";
    activityPicker.innerHTML = "<p>Utilisez le champ manuel.</p>";
    connectorActivities = [];
    selectedActivity = null;
    return;
  }
  connectorStatus.textContent = "Chargement des activites...";
  try {
    const status = await api(`/api/prototypes/${prototype.id}/activities`);
    renderActivities(status);
  } catch (error) {
    connectorStatus.textContent = error.message;
    connectorStatus.classList.add("is-unavailable");
    activityPicker.innerHTML = "<p>Connecteur indisponible. Utilisez le champ manuel.</p>";
  }
}

async function init() {
  if (!token()) return goLogin();
  try {
    const me = await api("/api/auth/me");
    currentUser = me.user;
    if (!["teacher", "admin"].includes(currentUser.role)) throw new Error("Acces enseignant refuse.");
    userLine.textContent = `${currentUser.displayName} - ${currentUser.role}`;
    courses = (await api("/api/courses")).courses;
    prototypes = (await api("/api/prototypes")).prototypes;
    institutions = (await api("/api/institutions")).institutions || [];
    visibleActivities = (await api("/api/me/activities")).activities || [];
    aiConfigs = (await api("/api/prototypes/proto06/ai-configs")).configs || [];
    renderAiModes();
    renderVisibleActivities();
    await renderCourses();
    renderPrototypeOptions();
    await loadPrototypeActivities();
  } catch (error) {
    message.textContent = error.message;
    if (error.message.includes("Connexion")) goLogin();
  }
}

document.querySelector("#courseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/courses", {
      method: "POST",
      body: JSON.stringify({
        title: document.querySelector("#courseTitle").value,
        description: document.querySelector("#courseDescription").value,
        level: document.querySelector("#courseLevel").value,
        accessCode: document.querySelector("#courseCode").value
      })
    });
    courses = (await api("/api/courses")).courses;
    await renderCourses();
    message.textContent = "Cours cree.";
  } catch (error) {
    message.textContent = error.message;
  }
});

prototypeSelect.addEventListener("change", loadPrototypeActivities);
aiConfigSelect?.addEventListener("change", renderSelectedAiConfigDetails);

visibleActivitiesBox?.addEventListener("click", (event) => {
  const button = event.target.closest(".use-visible-activity");
  if (!button) return;
  prototypeSelect.value = button.dataset.prototypeId;
  document.querySelector("#activityId").value = button.dataset.activityId;
  document.querySelector("#activitySource").value = button.dataset.activitySource;
  selectedActivity = {
    id: button.dataset.activityId,
    source: button.dataset.activitySource,
    title: button.dataset.title
  };
  message.textContent = "Ressource prete a assigner.";
});

visibleActivitiesBox?.addEventListener("change", async (event) => {
  const select = event.target.closest(".visibility-select");
  if (!select) return;
  try {
    await api(`/api/activity-ownership/${select.dataset.recordId}`, {
      method: "PUT",
      body: JSON.stringify({ visibility: select.value })
    });
    visibleActivities = (await api("/api/me/activities")).activities || [];
    renderVisibleActivities();
    await renderCourses();
    message.textContent = "Visibilite mise a jour.";
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelector("#assignForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const manualId = document.querySelector("#activityId").value.trim();
  const activity = selectedActivity || { id: manualId, source: document.querySelector("#activitySource").value };
  if (!activity.id) {
    message.textContent = "Choisissez une activite ou renseignez un Activity ID.";
    return;
  }
  try {
    await api(`/api/courses/${assignCourse.value}/activities`, {
      method: "POST",
      body: JSON.stringify({
        prototypeId: prototypeSelect.value,
        activityId: activity.id,
        activitySource: activity.source || document.querySelector("#activitySource").value,
        activityTitle: activity.title || manualId,
        activitySnapshot: activity.title ? snapshot(activity) : null,
        aiConfigId: aiConfigSelect?.value || null
      })
    });
    await renderCourses();
    message.textContent = "Activite assignee.";
  } catch (error) {
    message.textContent = error.message;
  }
});

init();
