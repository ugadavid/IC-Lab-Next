const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server");

async function createStaticFileTestServer() {
  const repository = {
    getLanguages: async () => [],
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
