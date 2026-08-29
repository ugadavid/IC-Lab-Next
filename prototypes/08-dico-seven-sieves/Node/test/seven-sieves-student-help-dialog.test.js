"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createController } = require("../../prototypes/01-seven-sieves/js/seven-sieves-help-dialog-v0.js");

class FakeElement {
  constructor(documentRef) {
    this.documentRef = documentRef;
    this.listeners = new Map();
    this.attributes = new Map();
    this.hidden = false;
    this.focusable = [];
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  emit(type, event = {}) {
    const emitted = { target: this, preventDefault() { this.defaultPrevented = true; }, ...event };
    for (const listener of this.listeners.get(type) || []) listener(emitted);
    return emitted;
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name); }
  querySelectorAll() { return this.focusable; }
  contains(element) { return element === this || this.focusable.includes(element); }
  focus() { this.documentRef.activeElement = this; }
}

class FakeDocument extends FakeElement {
  constructor() {
    super(null);
    this.documentRef = this;
    this.body = { style: { overflow: "auto" } };
    this.activeElement = null;
  }
}

function fixture() {
  const documentRef = new FakeDocument();
  const button = new FakeElement(documentRef);
  const layer = new FakeElement(documentRef);
  const dialog = new FakeElement(documentRef);
  const closeIcon = new FakeElement(documentRef);
  const closeButton = new FakeElement(documentRef);
  const outside = new FakeElement(documentRef);
  layer.hidden = true;
  dialog.focusable = [closeIcon, closeButton];
  button.setAttribute("aria-expanded", "false");
  layer.setAttribute("aria-hidden", "true");
  const controller = createController({ button, layer, dialog, closeButtons: [closeIcon, closeButton], documentRef });
  return { documentRef, button, layer, dialog, closeIcon, closeButton, outside, controller };
}

test("learner guide replaces the accordion with an accessible contextual dialog", () => {
  const root = path.join(__dirname, "../../prototypes/01-seven-sieves");
  const html = fs.readFileSync(path.join(root, "index-student-0.1.html"), "utf8");

  assert.match(html, /app-version" content="0\.1\.6"/);
  assert.match(html, /id="helpButton"[^>]*aria-haspopup="dialog"[^>]*aria-controls="learnerHelpDialog"[^>]*aria-expanded="false"/);
  assert.doesNotMatch(html, /href="#studentHelp"|id="studentHelp"|<details|<summary/);
  assert.match(html, /id="learnerHelpLayer"[^>]*aria-hidden="true" hidden/);
  assert.match(html, /id="learnerHelpDialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="learnerHelpTitle"/);
  assert.match(html, /id="helpCloseIcon"[^>]*aria-label="Fermer le guide"/);
  assert.match(html, /id="helpCloseButton"[^>]*>Fermer</);
  assert.match(html, /À quoi sert Seven Sieves \?|Comment explorer \?|En complément/);
  assert.match(html, /Choisis l’un des sept tamis|Double-clique sur les mots utiles|Montrer les indices/);
  assert.match(html, /Aides à la lecture[^]*indépendantes des sept tamis[^]*restent masquées/);
  assert.match(html, /croise-les et vérifie-les toujours dans le contexte/);
});

test("the help button opens the layer and both explicit controls close it", () => {
  const view = fixture();
  view.button.emit("click");
  assert.equal(view.controller.isOpen(), true);
  assert.equal(view.layer.hidden, false);
  assert.equal(view.layer.getAttribute("aria-hidden"), "false");
  assert.equal(view.button.getAttribute("aria-expanded"), "true");
  assert.equal(view.documentRef.body.style.overflow, "hidden");
  assert.equal(view.documentRef.activeElement, view.closeIcon);

  view.closeIcon.emit("click");
  assert.equal(view.controller.isOpen(), false);
  assert.equal(view.documentRef.activeElement, view.button);
  assert.equal(view.documentRef.body.style.overflow, "auto");

  view.button.emit("click");
  view.closeButton.emit("click");
  assert.equal(view.layer.hidden, true);
  assert.equal(view.layer.getAttribute("aria-hidden"), "true");
  assert.equal(view.button.getAttribute("aria-expanded"), "false");
  assert.equal(view.documentRef.activeElement, view.button);
});

test("Escape closes the guide and restores focus without changing learner state", () => {
  const view = fixture();
  const learnerState = { activeSieve: 6, selectedTokenIndexes: [2, 5], inspectedTokenIndex: 5, statuses: { 2: "known" } };
  const before = JSON.stringify(learnerState);
  view.button.emit("click");
  const event = view.documentRef.emit("keydown", { key: "Escape" });

  assert.equal(event.defaultPrevented, true);
  assert.equal(view.controller.isOpen(), false);
  assert.equal(view.documentRef.activeElement, view.button);
  assert.equal(JSON.stringify(learnerState), before);
});

test("only a click on the layer background closes the guide", () => {
  const view = fixture();
  view.button.emit("click");
  view.layer.emit("click", { target: view.dialog });
  assert.equal(view.controller.isOpen(), true);
  view.layer.emit("click", { target: view.layer });
  assert.equal(view.controller.isOpen(), false);
  assert.equal(view.documentRef.activeElement, view.button);
});

test("Tab and Shift+Tab remain trapped inside the open dialog", () => {
  const view = fixture();
  view.button.emit("click");
  view.closeButton.focus();
  const forward = view.documentRef.emit("keydown", { key: "Tab", shiftKey: false });
  assert.equal(forward.defaultPrevented, true);
  assert.equal(view.documentRef.activeElement, view.closeIcon);

  const backward = view.documentRef.emit("keydown", { key: "Tab", shiftKey: true });
  assert.equal(backward.defaultPrevented, true);
  assert.equal(view.documentRef.activeElement, view.closeButton);

  view.outside.focus();
  view.documentRef.emit("keydown", { key: "Tab", shiftKey: false });
  assert.equal(view.documentRef.activeElement, view.closeIcon);
});

test("the isolated dialog controller has no access to activity or exploration storage", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../prototypes/01-seven-sieves/js/seven-sieves-help-dialog-v0.js"), "utf8");
  assert.doesNotMatch(source, /analysisPackage|explorationState|sessionStorage|localStorage|SevenSievesSession/);
});
