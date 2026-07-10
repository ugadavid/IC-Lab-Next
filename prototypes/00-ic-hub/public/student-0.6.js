const TOKEN_KEY = "icHubAuthToken";
let prototypes = [];
let courses = [];
let institutions = [];

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

function activityTitle(item) {
  return item.activityTitle || item.activitySnapshot?.title || item.activityId;
}

function institutionLabel(id) {
  if (!id) return "institution non renseignee";
  const institution = institutions.find((item) => item.id === id);
  return institution ? `${institution.shortName || institution.name}` : id;
}

function debugMeta(data) {
  if (localStorage.getItem("icHubDebug") !== "1") return "";
  return `<pre class="debug-meta">${JSON.stringify(data, null, 2)}</pre>`;
}

function launchControl(proto, assignment) {
  if (assignment.prototypeId === "proto06") {
    return `<button type="button" class="launch-run" data-course-id="${assignment.courseId}" data-assignment-id="${assignment.id}">Lancer</button>`;
  }
  return proto.entryUrl
    ? `<a href="${proto.entryUrl}" target="_blank" rel="noopener">Lancer</a>`
    : "<span>Prototype planifie</span>";
}

async function render() {
  const rows = await Promise.all(courses.map(async (course) => {
    const { assignments } = await api(`/api/courses/${course.id}/activities`);
    return `
      <article class="card">
        <h3>${course.title}</h3>
        <p>${course.description || "Sans description"}</p>
        <p>${course.level || "niveau libre"} - ${institutionLabel(course.institutionId)}</p>
        ${debugMeta({ courseId: course.id, institutionId: course.institutionId, visibility: course.visibility })}
        ${assignments.map((item) => {
          const proto = protoById(item.prototypeId);
          return `
            <div class="activity-row">
              <span>
                <strong>${activityTitle(item)}</strong>
                <small>${proto.title || item.prototypeId}</small>
                <small>${item.activitySnapshot?.pedagogicalGoal || "Objectif non renseigne"}</small>
                <small>ID ${item.activityId} - source ${item.activitySource}</small>
              </span>
              ${launchControl(proto, item)}
            </div>
          `;
        }).join("") || "<p>Aucune activite assignee.</p>"}
      </article>
    `;
  }));
  courseList.innerHTML = rows.join("") || "<p>Aucun cours. Utilisez un code d'acces.</p>";
}

async function load() {
  courses = (await api("/api/courses")).courses;
  prototypes = (await api("/api/prototypes")).prototypes;
  institutions = (await api("/api/institutions")).institutions || [];
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

courseList.addEventListener("click", async (event) => {
  const button = event.target.closest(".launch-run");
  if (!button) return;
  button.disabled = true;
  const previousText = button.textContent;
  button.textContent = "Lancement...";
  message.textContent = "";
  try {
    const result = await api("/api/runs/start", {
      method: "POST",
      body: JSON.stringify({
        courseId: button.dataset.courseId,
        assignmentId: button.dataset.assignmentId
      })
    });
    const opened = window.open(result.launchUrl, "_blank", "noopener");
    if (!opened) {
      window.location.href = result.launchUrl;
    }
    message.textContent = "Session lancee.";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
});

init();
