const TOKEN_KEY = "icHubAuthToken";
const form = document.querySelector("#loginForm");
const message = document.querySelector("#message");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");

async function login(email, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Connexion impossible.");
  localStorage.setItem(TOKEN_KEY, body.token);
  window.location.href = "hub.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  try {
    await login(emailInput.value.trim(), passwordInput.value);
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelectorAll("[data-demo-email]").forEach((button) => {
  button.addEventListener("click", () => {
    emailInput.value = button.dataset.demoEmail;
    passwordInput.value = button.dataset.demoPassword;
  });
});
