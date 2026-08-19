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
    assert.match(adminHtml, /app-version" content="0\.1\.8"/);
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
    assert.match(adminScript, /apiRequest\("\/connector-help-languages"\)/);
    assert.match(adminScript, /Langues romanes documentées/);
    assert.match(adminScript, /Langue de comparaison — non romane/);
    assert.doesNotMatch(adminHtml, /<option value="(?:fr|es|it|pt|en)">/);

    const entryView = await fetch(`${server.baseUrl}/admin-app/index-admin-entry-0.1.1.html?entry_key=INFORMATION_DATA`);
    assert.equal(entryView.status, 200);
    const entryHtml = await entryView.text();
    assert.match(entryHtml, /Lecture synthétique/);
    assert.match(entryHtml, /app-version" content="0\.1\.5"/);
    assert.match(entryHtml, /Modifier et documenter cette entrée/);
    assert.match(entryHtml, /Relations documentées/);
    assert.doesNotMatch(entryHtml, /relationPairsBody|Relation à documenter/);
    assert.match(entryHtml, /\? Comprendre les relations/);
    assert.match(entryHtml, /Il ne représente ni un pourcentage de parenté ni le résultat d’un test expérimental/);
    assert.match(entryHtml, /Cette grille est provisoire/);
    assert.doesNotMatch(entryHtml, /class="model-limit"/);
    assert.doesNotMatch(entryHtml, /Supprimer/);

    const workbench = await fetch(`${server.baseUrl}/admin-app/index-admin-entry-workbench-0.1.html?entry_key=INFORMATION_DATA`);
    assert.equal(workbench.status, 200);
    const workbenchHtml = await workbench.text();
    assert.match(workbenchHtml, /Atelier de l’entrée/);
    assert.match(workbenchHtml, /app-version" content="0\.1\.1"/);
    assert.match(workbenchHtml, /relationPairsBody/);
    assert.match(workbenchHtml, /Revenir à la fiche de consultation/);
    assert.match(workbenchHtml, /\? Comprendre les types, les scores et la confiance/);
    assert.match(workbenchHtml, /Le score est une estimation humaine provisoire de la transparence pédagogique, et non une probabilité/);

    const prototype = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/index-api-live-0.1.html`);
    assert.equal(prototype.status, 200);
    const html = await prototype.text();
    assert.match(html, /Entrée de compatibilité/);
    assert.match(html, /index-teacher-0\.1\.html/);

    const teacher = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/index-teacher-0.1.html`);
    assert.equal(teacher.status, 200);
    const teacherHtml = await teacher.text();
    assert.match(teacherHtml, /Interface enseignant/);
    assert.match(teacherHtml, /app-version" content="0\.1\.3"/);
    assert.match(teacherHtml, /Durante el día, los estudiantes observan los efectos del cambio climático/);
    assert.match(teacherHtml, /Sin embargo, durante la noche la información sigue circulando/);
    assert.match(teacherHtml, /Ouvrir l’activité en vue apprenant/);

    const student = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/index-student-0.1.html`);
    assert.equal(student.status, 200);
    const studentHtml = await student.text();
    assert.match(studentHtml, /Activité apprenante/);
    assert.match(studentHtml, /app-version" content="0\.1\.5"/);
    assert.match(studentHtml, /Aides à la lecture/);
    assert.match(studentHtml, /Afficher les aides à la lecture \(0\)/);
    assert.match(studentHtml, /Aucune activité n’a encore été préparée/);
    assert.equal((studentHtml.match(/class="sieve-btn"/g) || []).length, 7);

    const teacherScript = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/js/seven-sieves-teacher-v0.js`);
    assert.equal(teacherScript.status, 200);
    assert.match(await teacherScript.text(), /const ANALYSIS_API_URL = "\/analysis"/);

    const sessionScript = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/js/seven-sieves-session-v0.js`);
    assert.equal(sessionScript.status, 200);
    assert.match(await sessionScript.text(), /seven-sieves\.activity\.v/);

    const helpDialogScript = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/js/seven-sieves-help-dialog-v0.js`);
    assert.equal(helpDialogScript.status, 200);
    assert.match(await helpDialogScript.text(), /createController/);

    const lifecycleScript = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/js/seven-sieves-analysis-lifecycle-v0.js`);
    assert.equal(lifecycleScript.status, 200);
    assert.match(await lifecycleScript.text(), /DEFAULT_ANALYSIS_TIMEOUT_MS = 15_000/);

    const mock = await fetch(`${server.baseUrl}/prototypes/01-seven-sieves/mock/analysis-response-v0.json`);
    assert.equal(mock.status, 200);
    assert.equal((await mock.json()).contract_version, "0.1");
  } finally {
    await server.close();
  }
});
