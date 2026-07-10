const TOKEN_KEY = "icHubAuthToken";
let courses = [];
let prototypes = [];
let connectorActivities = [];
let selectedActivity = null;

const userLine = document.querySelector("#userLine");
const courseList = document.querySelector("#courseList");
const assignCourse = document.querySelector("#assignCourse");
const prototypeSelect = document.querySelector("#prototypeSelect");
const activityPicker = document.querySelector("#activityPicker");
const connectorStatus = document.querySelector("#connectorStatus");
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
        <strong>Activites assignees</strong>
        <ul class="assignments">${assignments.map((item) => {
          const launchUrl = launchUrlForAssignment(item);
          const launchLink = launchUrl ? ` <a href="${launchUrl}" target="_blank" rel="noopener">Lancer</a>` : "";
          return `<li>${item.prototypeId} / ${assignmentLabel(item)} (${item.activitySource})${launchLink}</li>`;
        }).join("") || "<li>Aucune</li>"}</ul>
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
    if (!["teacher", "admin"].includes(me.user.role)) throw new Error("Acces enseignant refuse.");
    userLine.textContent = `${me.user.displayName} - ${me.user.role}`;
    courses = (await api("/api/courses")).courses;
    prototypes = (await api("/api/prototypes")).prototypes;
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
        activitySnapshot: activity.title ? snapshot(activity) : null
      })
    });
    await renderCourses();
    message.textContent = "Activite assignee.";
  } catch (error) {
    message.textContent = error.message;
  }
});

init();
