"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { bind, formatTime, relativeTime } = require("../../shared/precise-video-time");

const prototypeDirectory = path.resolve(__dirname, "../..");

test("les quatre pas temporels sont exacts, bornés et stables au dixième", () => {
  assert.equal(relativeTime(12.3, -1, 20), 11.3);
  assert.equal(relativeTime(12.3, -0.1, 20), 12.2);
  assert.equal(relativeTime(12.3, 0.1, 20), 12.4);
  assert.equal(relativeTime(12.3, 1, 20), 13.3);
  assert.equal(relativeTime(0.05, -1, 20), 0);
  assert.equal(relativeTime(19.95, 1, 20), 20);
  let current = 12.3;
  for (let index = 0; index < 10; index += 1) current = relativeTime(current, 0.1, 20);
  assert.equal(current, 13.3);
  assert.equal(formatTime(942.299999999), "15:42,3");
});

test("le binding attend les métadonnées, préserve la lecture et actualise immédiatement", () => {
  const listeners = new Map();
  const video = { currentTime: 4.2, duration: NaN, readyState: 0, paused: false, addEventListener: (name, listener) => listeners.set(name, listener) };
  const buttons = [-1, -0.1, 0.1, 1].map(step => ({ dataset: { videoStep: String(step) }, disabled: false, addEventListener(name, listener) { this[name] = listener; } }));
  const output = { textContent: "" };
  let usedTime = null;
  bind({ video, root: { querySelectorAll: () => buttons }, output, onSeek: value => { usedTime = value; } });
  assert.ok(buttons.every(button => button.disabled));
  buttons[2].click();
  assert.equal(video.currentTime, 4.2);
  video.duration = 10;
  video.readyState = 1;
  listeners.get("loadedmetadata")();
  assert.ok(buttons.every(button => !button.disabled));
  buttons[2].click();
  assert.equal(video.currentTime, 4.3);
  assert.equal(usedTime, 4.3);
  assert.equal(video.paused, false);
  assert.equal(output.textContent, "00:04,3 / 00:10,0");
});

test("les trois lecteurs exposent les commandes accessibles et gardent les contrats métier séparés", () => {
  for (const file of ["teacher-anonymization.html", "teacher-audio-anonymization.html", "teacher-guided.html"]) {
    const source = fs.readFileSync(path.join(prototypeDirectory, file), "utf8");
    assert.match(source, /shared\/precise-video-time\.js/);
    assert.deepEqual([...source.matchAll(/data-video-step="([^"]+)"/g)].map(match => match[1]), ["-1", "-0.1", "0.1", "1"]);
    for (const label of ["Reculer d’une seconde", "Reculer d’un dixième de seconde", "Avancer d’un dixième de seconde", "Avancer d’une seconde"]) assert.match(source, new RegExp(`aria-label="${label}"`));
  }
  const guided = fs.readFileSync(path.join(prototypeDirectory, "teacher-guided.html"), "utf8");
  assert.match(guided, /Moments de transcription/);
  assert.match(guided, /Langues entendues/);
  assert.match(guided, /Phénomènes d’intercompréhension/);
  const timeline = fs.readFileSync(path.join(prototypeDirectory, "shared", "ic-timeline.js"), "utf8");
  assert.match(timeline, /languageIntervals/);
  assert.match(timeline, /phenomena/);
  assert.doesNotMatch(timeline, /transcription|segments/);
  assert.match(guided, /Math\.round\(video\.currentTime\*1000\)/);
  assert.match(guided, /preparePhenomenon\(state\.activity,video\.currentTime\*1000/);
});

test("l’atelier guidé branche les clics après upgrade sur la façade du véritable lecteur", () => {
  const guided = fs.readFileSync(path.join(prototypeDirectory, "teacher-guided.html"), "utf8");
  const upgradePosition = guided.indexOf("await window.upgradeICVideoElement(video,source)");
  const bindPosition = guided.indexOf("guidedPreciseTimeNavigation=Proto05PreciseVideoTime.bind({video");
  assert.ok(upgradePosition >= 0 && bindPosition > upgradePosition);
  assert.doesNotMatch(guided.slice(0, upgradePosition), /Proto05PreciseVideoTime\.bind/);
  const playerSource = fs.readFileSync(path.join(prototypeDirectory, "shared", "ic-video-player.js"), "utf8");
  assert.match(playerSource, /get readyState\(\) \{ return ready \? 1 : \(nativeVideo\?\.readyState \|\| 0\); \}/);
  assert.match(playerSource, /readyState: \{ configurable: true, get: \(\) => player\.readyState \}/);

  const listeners = new Map();
  const realPlayer = { currentTime: 12.3, duration: 30, readyState: 1, paused: true };
  const guidedFacade = {
    get currentTime() { return realPlayer.currentTime; },
    set currentTime(value) { realPlayer.currentTime = value; },
    get duration() { return realPlayer.duration; },
    get readyState() { return realPlayer.readyState; },
    get paused() { return realPlayer.paused; },
    addEventListener(name, listener) { listeners.set(name, listener); }
  };
  const button = { dataset: { videoStep: "0.1" }, disabled: false, addEventListener(name, listener) { this[name] = listener; } };
  const output = { textContent: "" };
  bind({ video: guidedFacade, root: { querySelectorAll: () => [button] }, output });
  button.click();
  assert.equal(realPlayer.currentTime, 12.4);
  assert.equal(guidedFacade.currentTime, 12.4);
  assert.equal(realPlayer.paused, true);
  assert.equal(output.textContent, "00:12,4 / 00:30,0");
});
