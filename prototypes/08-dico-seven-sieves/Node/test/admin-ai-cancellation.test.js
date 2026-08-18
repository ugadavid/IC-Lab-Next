const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createApp } = require("../server");
const {
  AdminAiError,
  generateStructuredCandidates,
} = require("../src/admin-ai-domain");

function abortError() {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

test("le signal client est propagé au fournisseur simulé", async () => {
  const client = new AbortController();
  let providerSignal = null;
  const generation = generateStructuredCandidates(
    { count: 1 },
    { system: "system", user: "user" },
    "test_schema",
    {
      apiKey: "test-key",
      signal: client.signal,
      schema: { type: "object" },
      fetchImpl: async (_url, options) => {
        providerSignal = options.signal;
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(abortError()), { once: true });
        });
      },
    }
  );

  client.abort();
  await assert.rejects(
    generation,
    error => error instanceof AdminAiError && error.code === "OPENAI_CANCELLED" && error.status === 499
  );
  assert.equal(providerSignal.aborted, true);
});

test("l’abandon HTTP annule la génération serveur sans résolution ni écriture", async () => {
  let providerStartedResolve;
  const providerStarted = new Promise(resolve => { providerStartedResolve = resolve; });
  let providerAbortedResolve;
  const providerAborted = new Promise(resolve => { providerAbortedResolve = resolve; });
  let resolutionCalls = 0;
  let writes = 0;
  const repository = {
    getLanguages: async () => [{ code: "fr" }],
    findExistingEntryKeys: async () => { resolutionCalls += 1; return []; },
    createAdminLexicalEntry: async () => { writes += 1; },
  };
  const generateTextCandidates = async (_request, options) => {
    providerStartedResolve();
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        providerAbortedResolve();
        reject(new AdminAiError(499, "OPENAI_CANCELLED", "cancelled"));
      }, { once: true });
    });
  };
  const server = createApp(repository, { generateTextCandidates }).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const controller = new AbortController();
  const request = fetch(`http://127.0.0.1:${server.address().port}/admin/ai/text-candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unknown_words: ["inédit"], languages: ["fr"] }),
    signal: controller.signal,
  });

  await providerStarted;
  controller.abort();
  await assert.rejects(request, error => error.name === "AbortError");
  await providerAborted;
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(resolutionCalls, 0);
  assert.equal(writes, 0);
  await new Promise(resolve => server.close(resolve));
});

test("l’interface expose les états accessibles et les annulations de cycle de vie", () => {
  const adminRoot = path.resolve(__dirname, "../../admin");
  const html = fs.readFileSync(path.join(adminRoot, "index-admin-ai-text-0.1.html"), "utf8");
  const script = fs.readFileSync(path.join(adminRoot, "js/admin-ai-text-0.1.js"), "utf8");

  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /<progress aria-label="Progression indéterminée de la génération OpenAI"><\/progress>/);
  assert.match(html, /Génération OpenAI en cours…/);
  assert.match(html, /Aucun brouillon n’est encore écrit en base\./);
  assert.match(html, /Annuler la génération/);
  assert.match(script, /targetLanguageInputs\(\).*input\.disabled = loading/s);
  assert.match(script, /pagehide.*cancelLexicalGeneration/s);
  assert.match(script, /analyzeCoverage[\s\S]*cancelLexicalGeneration\(\{ showMessage: false \}\)/);
  assert.match(script, /Génération annulée\. Aucun nouveau brouillon n’a été créé\./);
  assert.match(script, /OPENAI_TIMEOUT/);
});
