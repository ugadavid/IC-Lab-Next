"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "data.js"), "utf8");

function loadCorpus() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${dataSource}\n;globalThis.__items = items;`, context);
  return context.__items;
}

function relationFunctions(items) {
  const start = script.indexOf("const isActorItem =");
  const end = script.indexOf("const actorStatusPills", start);
  assert.ok(start >= 0 && end > start);
  const context = { items };
  vm.createContext(context);
  vm.runInContext(
    `${script.slice(start, end)}\n;globalThis.__relations = { documentaryFamily, relationEntries, buildRelationNeighborhood, relationDegree };`,
    context
  );
  return context.__relations;
}

test("the contextual graph is built exclusively from the 86 typed corpus relations", () => {
  const items = loadCorpus();
  const functions = relationFunctions(items);
  const rawEntries = items.flatMap((item) =>
    (item.relations || []).map((relation) => `${item.id}\u0000${relation.target}\u0000${relation.type}\u0000${relation.note || ""}`)
  );
  const indexedEntries = functions
    .relationEntries(items)
    .map((entry) => `${entry.sourceId}\u0000${entry.targetId}\u0000${entry.type}\u0000${entry.note}`);

  assert.equal(indexedEntries.length, 86);
  assert.deepEqual([...indexedEntries].sort(), [...rawEntries].sort());
  assert.doesNotMatch(script.slice(script.indexOf("const relationEntries"), script.indexOf("const actorStatusPills")), /relatedItems/);

  const miriadi = functions.buildRelationNeighborhood("miriadi", items);
  assert.equal(miriadi.center.id, "miriadi");
  assert.equal(miriadi.edges.length, 11);
  assert.equal(miriadi.neighbors.length, 8);
  assert.ok(miriadi.edges.every((edge) => rawEntries.includes(`${edge.sourceId}\u0000${edge.targetId}\u0000${edge.type}\u0000${edge.note}`)));
  assert.ok(miriadi.edges.every((edge) => ["entrante", "sortante"].includes(edge.direction)));
});

test("the five primary families replace panels without erasing search or filter state", () => {
  const primaryLabels = [...html.matchAll(/data-primary-view="([^"]+)"[^>]*>([^<]+)</g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(primaryLabels, [
    ["explorer", "Explorer"],
    ["carte", "Carte"],
    ["visite", "Visite"],
    ["contribuer", "Contribuer"],
    ["comprendre", "Comprendre"],
  ]);

  const panels = ["accueil", "concept", "visite", "demo", "publics", "parcours", "frise", "bibliotheque", "partager", "contribuer", "carte", "graphe", "campagne", "pas-encore", "decisions", "sauver", "besoins"].map(
    (id) => ({
      id,
      dataset: { viewFamily: id === "accueil" ? "accueil" : id === "bibliotheque" || id === "partager" || id === "sauver" ? "explorer" : id === "carte" || id === "graphe" ? "carte" : id === "visite" || id === "demo" || id === "parcours" ? "visite" : id === "contribuer" || id === "campagne" ? "contribuer" : "comprendre" },
      hidden: false,
      matches: (selector) => selector === "[data-view-family]",
    })
  );
  const primaryLinks = ["explorer", "carte", "visite", "contribuer", "comprendre"].map((family) => ({
    dataset: { primaryView: family },
    active: false,
    attributes: {},
    classList: { toggle(_name, active) { this.owner.active = active; } },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
  }));
  primaryLinks.forEach((link) => { link.classList.owner = link; });
  const secondary = { hidden: true, innerHTML: "" };
  const body = { dataset: {} };
  const location = { hash: "#accueil" };
  const applicationState = { query: "EuRom5", filter: { value: "projet" }, focusItemId: "eurom", mapItemId: "miriadi" };
  const context = {
    state: applicationState,
    viewState: { family: "accueil", panel: "accueil" },
    viewConfiguration: {
      explorer: [{ id: "bibliotheque", label: "Toutes les fiches" }, { id: "partager", label: "À partager" }, { id: "sauver", label: "À sauver / vérifier" }],
      carte: [{ id: "carte", label: "Voisinage interactif" }, { id: "graphe", label: "Lectures guidées" }],
      visite: [{ id: "visite", label: "Visite en 5 étapes" }, { id: "demo", label: "Démo Galanet" }, { id: "parcours", label: "Par intention" }],
      contribuer: [{ id: "contribuer", label: "Préparer une contribution" }, { id: "campagne", label: "Campagne de récupération" }],
      comprendre: [{ id: "concept", label: "Le concept" }],
    },
    escapeHtml: (value) => String(value),
    renderRelationMap: () => {},
    document: {
      body,
      getElementById: (id) => panels.find((panel) => panel.id === id) || null,
      querySelector: (selector) => selector === "#secondary-navigation" ? secondary : selector === "#accueil" ? panels[0] : null,
      querySelectorAll: (selector) => selector === "[data-view-family]" ? panels : primaryLinks,
    },
    window: {
      location,
      history: { pushState(_state, _title, hash) { location.hash = hash; } },
      scrollTo: () => {},
    },
  };
  const start = script.indexOf("const setViewHash =");
  const end = script.indexOf("const shortSvgLabel", start);
  vm.createContext(context);
  vm.runInContext(`${script.slice(start, end)}\n;globalThis.__showAppView = showAppView;`, context);

  context.__showAppView("bibliotheque");
  assert.equal(panels.find((panel) => panel.id === "bibliotheque").hidden, false);
  assert.ok(panels.filter((panel) => panel.id !== "bibliotheque").every((panel) => panel.hidden));
  assert.equal(body.dataset.activeView, "explorer");
  assert.equal(location.hash, "#bibliotheque");
  assert.match(secondary.innerHTML, /Toutes les fiches/);
  assert.deepEqual(applicationState, { query: "EuRom5", filter: { value: "projet" }, focusItemId: "eurom", mapItemId: "miriadi" });
  assert.doesNotMatch(script, /scrollIntoView/);
});

test("Explorer exposes type color, documentary status, relation count, map and detail actions", () => {
  assert.match(script, /class="card family-\$\{documentaryFamily\(item\)\}"/);
  assert.match(script, /document-status \$\{slugStatus\(item\.status\)\}/);
  assert.match(script, /relationDegree\(item\.id\)/);
  assert.match(script, /data-open-map="\$\{item\.id\}"/);
  assert.match(script, /data-open-detail="\$\{item\.id\}"/);
  assert.match(script, /openMap\(mapButton\.dataset\.openMap\)/);
  assert.match(script, /showAppView\("carte"\)/);
  assert.match(script, /openDetail\(detailButton\.dataset\.openDetail\)/);
});

test("the map shows real labels, recentering and a path back to full records", () => {
  assert.match(html, /id="relation-map"/);
  assert.match(html, /id="relation-detail"/);
  assert.match(script, /labels = \[\.\.\.new Set\(edges\.map\(\(edge\) => edge\.type\)\)\]/);
  assert.match(script, /data-map-recenter/);
  assert.match(script, /data-open-detail="\$\{escapeHtml\(edge\.neighbor\.id\)\}"/);
  assert.match(script, /data-open-detail="\$\{escapeHtml\(neighborhood\.center\.id\)\}"/);
  assert.match(script, /renderRelationMap\(recenterButton\.dataset\.mapRecenter\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("lossless functions, local portability and critical responsive rules remain present", () => {
  assert.match(script, /const exportItemsJson =/);
  assert.match(script, /const exportRecoveryCsv =/);
  assert.match(script, /const submitSiteSearch =/);
  assert.match(script, /const prepareContribution =/);
  assert.match(script, /const runGalanetDemo =/);
  assert.match(html, /<script src="data\.js"><\/script>[\s\S]*<script src="script\.js"><\/script>/);
  assert.doesNotMatch(html, /type="module"|https?:\/\/[^"']+\.(?:js|css)/);
  assert.match(styles, /@media \(max-width: 1120px\)[\s\S]*\.relation-workspace[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /@media \(max-width: 780px\)[\s\S]*\.card-grid[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(`${html}\n${script}\n${styles}`, /\uFFFD|Ã|Â|â€™/);
});
