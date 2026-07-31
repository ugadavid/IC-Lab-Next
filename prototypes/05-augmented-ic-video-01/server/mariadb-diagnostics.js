"use strict";

const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ER_CON_COUNT_ERROR",
  "PROTOCOL_CONNECTION_LOST"
]);
const AUTHORIZATION_CODES = new Set([
  "ER_ACCESS_DENIED_ERROR",
  "ER_DBACCESS_DENIED_ERROR",
  "ER_TABLEACCESS_DENIED_ERROR"
]);
const SCHEMA_CODES = new Set([
  "ER_BAD_DB_ERROR",
  "ER_BAD_FIELD_ERROR",
  "ER_NO_SUCH_TABLE",
  "ER_SP_DOES_NOT_EXIST"
]);

function errorChain(error) {
  const errors = [];
  const visited = new Set();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    errors.push(current);
    visited.add(current);
    current = current.cause;
  }
  return errors;
}

function classifyMariaDbError(error) {
  const chain = errorChain(error);
  const codes = new Set(chain.map(item => String(item.code || "").toUpperCase()).filter(Boolean));
  const message = chain.map(item => String(item.message || "")).join(" ");
  if ([...codes].some(code => CONNECTION_CODES.has(code))) return "connection_refused";
  if ([...codes].some(code => AUTHORIZATION_CODES.has(code))
    || /acc[eè]s refus[eé]|access denied|privil[eè]ges?|grant/i.test(message)) {
    return "authentication_or_grants";
  }
  if ([...codes].some(code => SCHEMA_CODES.has(code)
      || code.startsWith("PROTO05_SCHEMA_")
      || code.startsWith("PROTO05_MIGRATION_"))
    || /table .*doesn.?t exist|schema|migration|base .*inconnue/i.test(message)) {
    return "schema_or_migrations";
  }
  if (/configuration mariadb/i.test(message)) return "configuration_invalid";
  return "unexpected_error";
}

function safeMariaDbLogDetails(error) {
  return errorChain(error)
    .map(item => [item.code, item.sqlState, item.errno].filter(value => value !== undefined && value !== null).join("/"))
    .filter(Boolean)
    .join(" <- ") || "no-diagnostic-code";
}

function diagnosticMessage(reason) {
  if (reason === "connection_refused") return "Le serveur MariaDB est inaccessible.";
  if (reason === "authentication_or_grants") return "L’authentification MariaDB ou les droits d’accès ont été refusés.";
  if (reason === "schema_or_migrations") return "Le schéma MariaDB attendu ou ses migrations sont indisponibles.";
  if (reason === "configuration_invalid") return "La configuration locale MariaDB est incomplète ou invalide.";
  if (reason === "initializing") return "La connexion à MariaDB est en cours de vérification.";
  return "Une erreur interne inattendue empêche la connexion à MariaDB.";
}

function unavailablePayload(reason) {
  return {
    status: "unavailable",
    service: "mariadb",
    reason,
    error: diagnosticMessage(reason)
  };
}

function diagnosticPage(reason) {
  const message = diagnosticMessage(reason);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Proto05 — MariaDB indisponible</title>
  <style>
    :root{font-family:Arial,sans-serif;color:#20242c;background:#eef3f7}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
    main{max-width:660px;background:#fff;border:1px solid #d9e0e8;border-radius:14px;padding:28px;box-shadow:0 12px 34px #1923301f}
    h1{margin-top:0;color:#7c2d12}p{line-height:1.55}ul{line-height:1.7}
    button{border:0;border-radius:8px;background:#325f8f;color:#fff;padding:10px 15px;font-weight:700;cursor:pointer}
    button:disabled{cursor:wait;opacity:.65}.status{min-height:1.5em;color:#475467;font-weight:700}
  </style>
</head>
<body data-diagnostic-reason="${reason}">
  <main>
    <h1>Connexion à MariaDB impossible</h1>
    <p id="reason">${message}</p>
    <p>Proto05 reste fermé pour les données métier : aucune donnée ancienne, fictive ou issue d’un autre stockage n’est affichée.</p>
    <p>Vérifiez :</p>
    <ul>
      <li>que Docker Desktop est démarré ;</li>
      <li>que le conteneur MariaDB fonctionne ;</li>
      <li>que la configuration locale de Proto05 est correcte.</li>
    </ul>
    <button id="retry" type="button">Réessayer</button>
    <p id="status" class="status" role="status" aria-live="polite"></p>
  </main>
  <script>
    const retry=document.getElementById("retry"),status=document.getElementById("status");
    retry.addEventListener("click",async()=>{
      retry.disabled=true;status.textContent="Nouvelle vérification en cours…";
      try{
        const response=await fetch("/api/diagnostics/mariadb/retry",{method:"POST"});
        const body=await response.json().catch(()=>({}));
        if(response.ok){status.textContent="MariaDB est de nouveau disponible. Rechargement…";location.reload();return}
        status.textContent=body.error||"MariaDB reste indisponible.";
      }catch{status.textContent="Le serveur de diagnostic ne répond pas."}
      finally{retry.disabled=false}
    });
  </script>
</body>
</html>`;
}

module.exports = {
  classifyMariaDbError,
  diagnosticMessage,
  diagnosticPage,
  safeMariaDbLogDetails,
  unavailablePayload
};
