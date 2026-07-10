const TOKEN_KEY = "icHubAuthToken";
const userLine = document.querySelector("#userLine");
const healthBox = document.querySelector("#healthBox");
const usersBox = document.querySelector("#usersBox");
const coursesBox = document.querySelector("#coursesBox");
const prototypesBox = document.querySelector("#prototypesBox");
const sessionsBox = document.querySelector("#sessionsBox");
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

function row(title, detail) {
  return `<article class="row"><strong>${title}</strong><p>${detail}</p></article>`;
}

async function init() {
  if (!token()) return goLogin();
  try {
    const [me, health, users, courses, prototypes, sessions] = await Promise.all([
      api("/api/auth/me"),
      api("/api/health"),
      api("/api/admin/users"),
      api("/api/courses"),
      api("/api/prototypes"),
      api("/api/admin/sessions")
    ]);
    if (me.user.role !== "admin") throw new Error("Acces admin refuse.");
    userLine.textContent = `${me.user.displayName} - ${me.user.role}`;
    healthBox.textContent = JSON.stringify(health, null, 2);
    usersBox.innerHTML = users.users.map((user) => row(user.email, `${user.displayName} - ${user.role}`)).join("");
    coursesBox.innerHTML = courses.courses.map((course) => row(course.title, `${course.accessCode} - ${course.teacherId}`)).join("");
    prototypesBox.innerHTML = prototypes.prototypes.map((proto) => row(proto.title, `${proto.status} - ${proto.entryUrl || "pas de lien"}`)).join("");
    sessionsBox.textContent = JSON.stringify(sessions.sessions, null, 2);
  } catch (error) {
    message.textContent = error.message;
  }
}

init();
