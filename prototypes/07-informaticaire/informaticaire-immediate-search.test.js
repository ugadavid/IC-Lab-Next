"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "data.js"), "utf8");
const originalDataSource = fs.readFileSync(path.join(root, "data_original.js"), "utf8");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function dataContext() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${dataSource}\n;globalThis.__data = { items, filters, timelineItems };`, context);
  return context;
}

test("the editorial corpus and all internal relation targets remain intact", () => {
  const { items, filters, timelineItems } = dataContext().__data;
  const ids = new Set(items.map((item) => item.id));
  const relatedItems = items.flatMap((item) => item.relatedItems || []);
  const relations = items.flatMap((item) => item.relations || []);

  assert.equal(sha256(dataSource), "34e1fcc7c6a645b3512083d083f2594ee5610c37b1313d6e6d459fcccf5a5626");
  assert.equal(sha256(originalDataSource), "9126ef227b07448a55173e83f371cdeba2ea361cc050db39a1ef3325d20e10b8");
  assert.equal(items.length, 110);
  assert.equal(ids.size, 110);
  assert.equal(filters.length, 18);
  assert.equal(timelineItems.length, 13);
  assert.equal(relatedItems.length, 414);
  assert.equal(relations.length, 86);
  assert.equal(relatedItems.filter((id) => !ids.has(id)).length, 0);
  assert.equal(relations.filter((relation) => !ids.has(relation.target)).length, 0);
});

test("the first screen exposes one real search entry point and the four requested shortcuts", () => {
  assert.match(html, /app-version" content="0\.6\.6"/);
  assert.match(html, /id="home-search-form"[^>]*role="search"/);
  assert.match(html, /Rechercher un projet, une personne, une ressource…/);
  assert.match(html, /id="home-search-input"[^>]*type="search"/);
  assert.match(html, /data-home-filter="projet"[^>]*>Projets</);
  assert.match(html, /data-home-filter="acteur"[^>]*>Acteurs</);
  assert.match(html, /data-home-filter="ressource"[^>]*>Ressources</);
  assert.match(html, /data-home-filter="à récupérer"[^>]*>À sauver</);
  assert.match(html, /href="#bibliotheque">Explorer</);
  assert.doesNotMatch(html, /href="#bibliotheque">Fiches</);
  assert.match(styles, /\.hero-search[\s\S]*\.hero-search-controls[\s\S]*\.hero-quick-filters/);
});

test("the existing library engine really filters transferred queries and quick-access types", () => {
  const context = dataContext();
  const pureSearchEnd = script.indexOf("const emptySearchSuggestion");
  assert.ok(pureSearchEnd > 0);
  vm.runInContext(`${script.slice(0, pureSearchEnd)}\n;globalThis.__search = { state, matchesFilter, matchesQuery, searchRank };`, context);
  const { items, filters } = context.__data;
  const search = context.__search;

  search.state.query = "EuroComRom";
  search.state.filter = filters[0];
  const euroComRomResults = items
    .filter((item) => search.matchesFilter(item) && search.matchesQuery(item))
    .sort((a, b) => search.searchRank(a) - search.searchRank(b));
  assert.equal(euroComRomResults[0].id, "eurocomrom");

  search.state.query = "EuRom5";
  const euRom5Results = items
    .filter((item) => search.matchesFilter(item) && search.matchesQuery(item))
    .sort((a, b) => search.searchRank(a) - search.searchRank(b));
  assert.equal(euRom5Results[0].id, "eurom");

  for (const filterValue of ["projet", "acteur", "ressource", "à récupérer"]) {
    search.state.query = "";
    search.state.filter = filters.find((filter) => filter.value === filterValue);
    const results = items.filter((item) => search.matchesFilter(item) && search.matchesQuery(item));
    assert.ok(results.length > 0, `${filterValue} returns results`);
    assert.ok(results.every((item) => search.matchesFilter(item)), `${filterValue} remains active`);
  }
});

test("activateLibrary transfers the exact query, renders once, navigates and restores search focus", () => {
  const start = script.indexOf("const activateLibrary =");
  const end = script.indexOf("\n};", start) + 3;
  assert.ok(start >= 0 && end > start);

  const state = { query: "old", filter: null, focusItemId: "old-item" };
  const filters = [
    { label: "Tous", mode: "all", value: "all" },
    { label: "Projets", mode: "type", value: "projet" },
  ];
  const searchInput = {
    value: "",
    focusOptions: null,
    selection: null,
    focus(options) { this.focusOptions = options; },
    setSelectionRange(startIndex, endIndex) { this.selection = [startIndex, endIndex]; },
  };
  const library = { scrollCalls: 0, scrollIntoView() { this.scrollCalls += 1; } };
  const location = { value: "#accueil" };
  Object.defineProperty(location, "hash", {
    get() { return this.value; },
    set(value) { this.value = String(value).startsWith("#") ? String(value) : `#${value}`; },
  });
  let filterRenders = 0;
  let cardRenders = 0;
  const context = {
    state,
    filters,
    document: { querySelector: (selector) => selector === "#search-input" ? searchInput : library },
    window: { location, setTimeout: (callback) => callback() },
    renderFilters: () => { filterRenders += 1; },
    renderCards: () => { cardRenders += 1; },
  };
  vm.createContext(context);
  vm.runInContext(`${script.slice(start, end)}\n;globalThis.__activateLibrary = activateLibrary;`, context);

  context.__activateLibrary({ query: "  EuRom5  ", filterValue: "projet" });
  assert.equal(state.query, "  EuRom5  ");
  assert.equal(state.filter.value, "projet");
  assert.equal(state.focusItemId, "");
  assert.equal(searchInput.value, "  EuRom5  ");
  assert.equal(location.hash, "#bibliotheque");
  assert.equal(searchInput.focusOptions.preventScroll, true);
  assert.deepEqual(searchInput.selection, [10, 10]);
  assert.equal(filterRenders, 1);
  assert.equal(cardRenders, 1);

  context.__activateLibrary();
  assert.equal(state.query, "");
  assert.equal(state.filter.value, "all");
  assert.equal(library.scrollCalls, 1);
});

test("home events reuse activateLibrary and the static page remains file-compatible", () => {
  assert.match(script, /#home-search-form[\s\S]*activateLibrary\(\{ query: document\.querySelector\("#home-search-input"\)\.value \}\)/);
  assert.match(script, /#home-quick-filters[\s\S]*activateLibrary\(\{ filterValue: button\.dataset\.homeFilter \}\)/);
  assert.match(script, /state\.query = exactQuery[\s\S]*renderFilters\(\)[\s\S]*renderCards\(\)/);
  assert.match(script, /window\.location\.hash = "bibliotheque"/);
  assert.match(script, /search\.focus\(\{ preventScroll: true \}\)/);
  assert.match(html, /<script src="data\.js"><\/script>[\s\S]*<script src="script\.js"><\/script>/);
  assert.doesNotMatch(html, /type="module"|https?:\/\/[^"']+\.(?:js|css)/);
});
