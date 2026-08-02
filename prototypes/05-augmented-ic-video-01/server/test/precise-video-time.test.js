"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { ACTIONS, bind, formatTime, relativeTime, transportMarkup } = require("../../shared/precise-video-time");

const prototypeDirectory = path.resolve(__dirname, "../..");

function button({ step = null, toggle = false } = {}) {
  const symbol = { innerHTML: "" };
  const hint = { textContent: toggle ? "Lecture" : "" };
  return {
    dataset: step === null ? {} : { videoStep: String(step) }, disabled: false, attributes: {},
    addEventListener(name, listener) { this[name] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector(selector) { return selector.includes("symbol") ? symbol : selector.includes("hint") ? hint : null; },
    symbol, hint
  };
}

function fixture({ paused = true, duration = 20, currentTime = 10 } = {}) {
  const listeners = new Map();
  const video = {
    currentTime, duration, readyState: Number.isFinite(duration) ? 1 : 0, paused,
    addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
    play() { this.paused = false; for (const listener of listeners.get("play") || []) listener(); return Promise.resolve(); },
    pause() { this.paused = true; for (const listener of listeners.get("pause") || []) listener(); }
  };
  const steps = [-5, -1, -0.1, 0.1, 1, 5].map(step => button({ step }));
  const toggle = button({ toggle: true });
  const output = { textContent: "" };
  const root = {
    querySelectorAll(selector) { return selector === "[data-video-step]" ? steps : []; },
    querySelector(selector) { return selector === "[data-video-toggle]" ? toggle : selector === "[data-video-time]" ? output : null; }
  };
  return { listeners, output, root, steps, toggle, video };
}

test("les six pas sont exacts, bornés et stables en millisecondes", () => {
  assert.deepEqual(ACTIONS.map(action => action.toggle ? "toggle" : action.step), [-5, -1, -0.1, "toggle", 0.1, 1, 5]);
  assert.equal(relativeTime(12.3, -5, 20), 7.3);
  assert.equal(relativeTime(12.3, -1, 20), 11.3);
  assert.equal(relativeTime(12.3, -0.1, 20), 12.2);
  assert.equal(relativeTime(12.3, 0.1, 20), 12.4);
  assert.equal(relativeTime(12.3, 1, 20), 13.3);
  assert.equal(relativeTime(12.3, 5, 20), 17.3);
  assert.equal(relativeTime(0.05, -5, 20), 0);
  assert.equal(relativeTime(19.95, 5, 20), 20);
  let current = 12.3;
  for (let index = 0; index < 10; index += 1) current = relativeTime(current, 0.1, 20);
  assert.equal(current, 13.3);
  assert.equal(formatTime(942.299999999), "15:42,3");
});

test("la barre attend les métadonnées et les déplacements préservent lecture ou pause", () => {
  const unavailable = fixture({ duration: NaN, currentTime: 4.2, paused: false });
  bind({ video: unavailable.video, root: unavailable.root });
  assert.ok(unavailable.steps.every(item => item.disabled));
  assert.equal(unavailable.toggle.disabled, true);

  const active = fixture({ paused: false, currentTime: 4.2, duration: 10 });
  let usedTime = null;
  bind({ video: active.video, root: active.root, onSeek: value => { usedTime = value; } });
  active.steps[3].click();
  assert.equal(active.video.currentTime, 4.3);
  assert.equal(usedTime, 4.3);
  assert.equal(active.video.paused, false);
  assert.equal(active.output.textContent, "00:04,3 / 00:10,0");
});

test("lecture et pause pilotent le vrai lecteur et synchronisent symbole et nom accessible", async () => {
  const active = fixture({ paused: true });
  bind({ video: active.video, root: active.root });
  assert.match(active.toggle.symbol.innerHTML, /M9 7\.5 17 12l-8 4\.5z/);
  assert.equal(active.toggle.attributes["aria-label"], "Lire la vidéo");
  await active.toggle.click();
  assert.equal(active.video.paused, false);
  assert.match(active.toggle.symbol.innerHTML, /M8\.5 7\.5h2\.8v9H8\.5z/);
  assert.equal(active.toggle.attributes["aria-label"], "Mettre la vidéo en pause");
  await active.toggle.click();
  assert.equal(active.video.paused, true);
  active.video.paused = true;
  for (const listener of active.listeners.get("ended") || []) listener();
  assert.match(active.toggle.symbol.innerHTML, /M9 7\.5 17 12l-8 4\.5z/);

  let rejected = null;
  active.video.play = () => Promise.reject(new Error("lecture refusée"));
  await active.toggle.click();
  assert.equal(active.video.paused, true);
  assert.match(active.toggle.symbol.innerHTML, /M9 7\.5 17 12l-8 4\.5z/);
  const rejectedFixture = fixture();
  rejectedFixture.video.play = () => Promise.reject(new Error("lecture refusée"));
  bind({ video: rejectedFixture.video, root: rejectedFixture.root, onPlayError: error => { rejected = error.message; } });
  await rejectedFixture.toggle.click();
  assert.equal(rejected, "lecture refusée");
});

test("le rendu partagé fournit exactement les sept commandes accessibles dans le bon ordre", () => {
  const markup = transportMarkup();
  assert.deepEqual([...markup.matchAll(/aria-label="([^"]+)"/g)].map(match => match[1]), [
    "Reculer de 5 secondes", "Reculer de 1 seconde", "Reculer de 0,1 seconde", "Lire la vidéo",
    "Avancer de 0,1 seconde", "Avancer de 1 seconde", "Avancer de 5 secondes"
  ]);
  assert.equal((markup.match(/<svg /g) || []).length, 7);
  assert.equal((markup.match(/<polyline /g) || []).length, 12);
  assert.match(markup, /video-transport__icon--playback/);
  assert.doesNotMatch(markup, /&lt;|&gt;|<<<|>>>/);
  for (const value of ["−5 s", "−1 s", "−0,1 s", "+0,1 s", "+1 s", "+5 s"]) assert.match(markup, new RegExp(value.replace("+", "\\+")));
  assert.match(markup, /data-video-time aria-live="polite">00:00,0 \/ --:--,-/);
});

test("les trois pages montent le composant unique sans anciens transports dupliqués", () => {
  for (const file of ["teacher-anonymization.html", "teacher-audio-anonymization.html", "teacher-guided.html"]) {
    const source = fs.readFileSync(path.join(prototypeDirectory, file), "utf8");
    assert.match(source, /shared\/precise-video-time\.css/);
    assert.match(source, /shared\/precise-video-time\.js/);
    assert.equal((source.match(/id="videoTransport"/g) || []).length, 1);
    assert.match(source, /Proto05PreciseVideoTime\.mount\(\{video(?:[:,])/);
    assert.doesNotMatch(source, /preciseTimeNavigation|id="preciseTime"|data-video-step=|Revenir de 5 secondes|Avancer de 5 secondes/);
  }
  const visual = fs.readFileSync(path.join(prototypeDirectory, "teacher-anonymization.html"), "utf8");
  assert.match(visual, /addTemporalStep|renderTemporalSteps|maskLayer/);
  const audio = fs.readFileSync(path.join(prototypeDirectory, "teacher-audio-anonymization.html"), "utf8");
  for (const label of ["Passage précédent", "Passage suivant", "Son original", "Aperçu anonymisé", "Définir le début au curseur", "Définir la fin au curseur"]) assert.match(audio, new RegExp(label));
  assert.doesNotMatch(audio, /id="clock"/);
  const guided = fs.readFileSync(path.join(prototypeDirectory, "teacher-guided.html"), "utf8");
  for (const label of ["Ajouter un moment ici", "Ajouter une langue ici", "Ajouter un phénomène ici"]) assert.match(guided, new RegExp(label));
  assert.doesNotMatch(guided, /id="clock"/);
});

test("l’atelier guidé branche la barre après upgrade sur la façade du véritable lecteur", () => {
  const guided = fs.readFileSync(path.join(prototypeDirectory, "teacher-guided.html"), "utf8");
  const upgradePosition = guided.indexOf("await window.upgradeICVideoElement(video,source)");
  const mountPosition = guided.indexOf("guidedPreciseTimeNavigation=Proto05PreciseVideoTime.mount({video");
  assert.ok(upgradePosition >= 0 && mountPosition > upgradePosition);
  assert.doesNotMatch(guided.slice(0, upgradePosition), /Proto05PreciseVideoTime\.mount/);
  const playerSource = fs.readFileSync(path.join(prototypeDirectory, "shared", "ic-video-player.js"), "utf8");
  assert.match(playerSource, /get readyState\(\) \{ return ready \? 1 : \(nativeVideo\?\.readyState \|\| 0\); \}/);
  assert.match(playerSource, /"play", "playing", "pause", "ended"/);
  assert.match(guided, /Math\.round\(video\.currentTime\*1000\)/);
  assert.match(guided, /preparePhenomenon\(state\.activity,video\.currentTime\*1000/);
});

test("le style partagé définit le groupe compact, les états, le focus et le responsive", () => {
  const css = fs.readFileSync(path.join(prototypeDirectory, "shared", "precise-video-time.css"), "utf8");
  for (const contract of [".video-transport__controls", ".video-transport__icon", ".video-transport__toggle", "border-radius:50%", "font-variant-numeric:tabular-nums", ":hover", ":active", ":focus-visible", ":disabled", "@media(max-width:540px)", "@media(max-width:390px)"]) assert.match(css, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
