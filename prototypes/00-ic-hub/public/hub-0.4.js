const TOKEN_KEY = "icHubAuthToken";
const userLine = document.querySelector("#userLine");
const prototypeList = document.querySelector("#prototypeList");
const courseList = document.querySelector("#courseList");
const message = document.querySelector("#message");

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token()}`,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Erreur ${response.status}`);
  return body;
}

function requireLogin() {
  if (!token()) window.location.href = "login.html";
}

function prototypeCard(proto) {
  const link = proto.libraryUrl || proto.entryUrl ? `<a href="${proto.libraryUrl || proto.entryUrl}">Ouvrir</a>` : "";
  return `
    <article class="card">
      <h3>${proto.title}</h3>
      <p>${proto.description}</p>
      <p><strong>${proto.status}</strong> - connecteur ${proto.connectorStatus || "n/a"}</p>
      <div class="tags">${proto.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      ${link}
    </article>
  `;
}

function courseCard(course) {
  return `
    <article class="card">
      <h3>${course.title}</h3>
      <p>${course.description || "Sans description"}</p>
      <p>${course.level || "niveau libre"} - code ${course.accessCode}</p>
    </article>
  `;
}

async function init() {
  requireLogin();
  try {
    const [{ user }, prototypes, courses] = await Promise.all([
      api("/api/auth/me"),
      api("/api/prototypes/status"),
      api("/api/courses")
    ]);
    userLine.textContent = `${user.displayName} - role ${user.role}`;
    prototypeList.innerHTML = prototypes.prototypes.map(prototypeCard).join("");
    courseList.innerHTML = courses.courses.map(courseCard).join("") || "<p>Aucun cours accessible.</p>";
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    message.textContent = error.message;
    setTimeout(() => window.location.href = "login.html", 700);
  }
}

document.querySelector("#logoutButton").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "login.html";
});

init();
