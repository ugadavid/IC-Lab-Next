const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server");

async function createStaticFileTestServer() {
  const repository = {
    getLanguages: async () => [],
    getDocumentableLanguages: async () => [],
    getLanguageCatalog: async () => ({
      languages: [],
      summary: { total: 0, romance_documented: 0, non_romance_comparison: 0, romance_referenced: 0 },
    }),
  };
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

test("serves admin and Seven Sieves prototypes from the Node app", async () => {
  const server = await createStaticFileTestServer();
  try {
    const admin = await fetch(`${server.baseUrl}/admin-app/index-admin-0.1.html`);
    assert.equal(admin.status, 200);
    assert.match(await admin.text(), /Dico-IC Admin/);

    const adminHtml = await (await fetch(`${server.baseUrl}/admin-app/index-admin-0.1.html`)).text();
    assert.match(adminHtml, /app-version" content="0\.1\.6"/);
    assert.match(adminHtml, /Domaine en français naturel : minuscules, accents et espaces/);
    assert.match(adminHtml, /Catalogue des langues/);
    assert.match(adminHtml, /Dico-IC documente actuellement quatre langues romanes/);
    assert.match(adminHtml, /\? Comprendre le catalogue des langues/);
    assert.doesNotMatch(adminHtml, /documentation_status|DOCUMENTED|REFERENCED/);

    const adminScript = await (await fetch(`${server.baseUrl}/admin-app/js/admin-0.1.js`)).text();
    assert.match(adminScript, /langues romanes prêtes à documenter/);
    assert.match(adminScript, /langue de comparaison — non romane/);
    assert.match(adminScript, /Prête à accueillir des contenus validés/);
    assert.match(adminScript, /Romance: "Romane", Germanic: "Germanique"/);

    const entryView = await fetch(`${server.baseUrl}/admin-app/index-admin-entry-0.1.1.html?entry_key=INFORMATION_DATA`);
    assert.equal(entryView.status, 200);
    const entryHtml = await entryView.text();
    assert.match(entryHtml, /Vue de consultation — aucune modification possible/);
    assert.match(entryHtml, /\? Comprendre les relations/);
    assert.match(entryHtml, /gestion d’un statut de validation distinct est prévue/);
    assert.doesNotMatch(entryHtml, /class="model-limit"/);
    assert.doesNotMatch(entryHtml, /<form\b|Créer|Modifier|Supprimer/);

    const prototype = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/index-api-live-0.1.html`);
    assert.equal(prototype.status, 200);
    const html = await prototype.text();
    assert.match(html, /Seven Sieves Explorer/);
    assert.match(html, /\.\/js\/seven-sieves-api-live-v0\.js/);

    const script = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/js/seven-sieves-api-live-v0.js`);
    assert.equal(script.status, 200);
    assert.match(await script.text(), /http:\/\/localhost:3000\/analysis/);

    const mock = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/mock/analysis-response-v0.json`);
    assert.equal(mock.status, 200);
    assert.equal((await mock.json()).contract_version, "0.1");
  } finally {
    await server.close();
  }
});
