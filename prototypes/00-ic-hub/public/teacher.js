const TOKEN_KEY = "icHubAuthToken";
let courses = [];
let prototypes = [];

const userLine = document.querySelector("#userLine");
const courseList = document.querySelector("#courseList");
const assignCourse = document.querySelector("#assignCourse");
const prototypeSelect = document.querySelector("#prototypeSelect");
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

async function loadAssignments(courseId) {
  const body = await api(`/api/courses/${courseId}/activities`);
  return body.assignments;
}

async function render() {
  const rows = await Promise.all(courses.map(async (course) => {
    const assignments = await loadAssignments(course.id);
    return `
      <article class="card">
        <h3>${course.title}</h3>
        <p>${course.description || "Sans description"}</p>
        <p>Code: ${course.accessCode} - ${course.level || "niveau libre"}</p>
        <strong>Activites assignees</strong>
        <ul class="assignments">${assignments.map((item) => `<li>${item.prototypeId} / ${item.activityId} (${item.activitySource})</li>`).join("") || "<li>Aucune</li>"}</ul>
      </article>
    `;
  }));
  courseList.innerHTML = rows.join("") || "<p>Aucun cours.</p>";
  assignCourse.innerHTML = courses.map((course) => `<option value="${course.id}">${course.title}</option>`).join("");
  prototypeSelect.innerHTML = prototypes.map((proto) => `<option value="${proto.id}">${proto.title}</option>`).join("");
}

async function init() {
  if (!token()) return goLogin();
  try {
    const me = await api("/api/auth/me");
    if (!["teacher", "admin"].includes(me.user.role)) throw new Error("Acces enseignant refuse.");
    userLine.textContent = `${me.user.displayName} - ${me.user.role}`;
    courses = (await api("/api/courses")).courses;
    prototypes = (await api("/api/prototypes")).prototypes;
    await render();
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
    await render();
    message.textContent = "Cours cree.";
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelector("#assignForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api(`/api/courses/${assignCourse.value}/activities`, {
      method: "POST",
      body: JSON.stringify({
        prototypeId: prototypeSelect.value,
        activityId: document.querySelector("#activityId").value,
        activitySource: document.querySelector("#activitySource").value
      })
    });
    await render();
    message.textContent = "Activite assignee.";
  } catch (error) {
    message.textContent = error.message;
  }
});

init();
