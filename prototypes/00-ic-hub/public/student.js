const TOKEN_KEY = "icHubAuthToken";
let prototypes = [];
let courses = [];

const userLine = document.querySelector("#userLine");
const courseList = document.querySelector("#courseList");
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

function protoById(id) {
  return prototypes.find((item) => item.id === id) || {};
}

async function render() {
  const rows = await Promise.all(courses.map(async (course) => {
    const { assignments } = await api(`/api/courses/${course.id}/activities`);
    return `
      <article class="card">
        <h3>${course.title}</h3>
        <p>${course.description || "Sans description"}</p>
        <p>${course.level || "niveau libre"}</p>
        ${assignments.map((item) => {
          const proto = protoById(item.prototypeId);
          const link = proto.entryUrl ? `<a href="${proto.entryUrl}">Lancer</a>` : "<span>Prototype planifie</span>";
          return `<div class="activity-row"><span>${proto.title || item.prototypeId} - ${item.activityId} (${item.activitySource})</span>${link}</div>`;
        }).join("") || "<p>Aucune activite assignee.</p>"}
      </article>
    `;
  }));
  courseList.innerHTML = rows.join("") || "<p>Aucun cours. Utilisez un code d'acces.</p>";
}

async function load() {
  courses = (await api("/api/courses")).courses;
  prototypes = (await api("/api/prototypes")).prototypes;
}

async function init() {
  if (!token()) return goLogin();
  try {
    const me = await api("/api/auth/me");
    if (!["student", "admin"].includes(me.user.role)) throw new Error("Acces etudiant refuse.");
    userLine.textContent = `${me.user.displayName} - ${me.user.role}`;
    await load();
    await render();
  } catch (error) {
    message.textContent = error.message;
  }
}

document.querySelector("#joinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/courses/join", {
      method: "POST",
      body: JSON.stringify({ accessCode: document.querySelector("#accessCode").value })
    });
    await load();
    await render();
    message.textContent = "Cours rejoint.";
  } catch (error) {
    message.textContent = error.message;
  }
});

init();
