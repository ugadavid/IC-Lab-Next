"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { findChromium, readBrowserResults, runChromium } = require("./helpers/chromium");
const { startTemporaryProto05Server } = require("./helpers/temporary-proto05-server");

const prototype = path.resolve(__dirname, "../..");
const activitiesFile = path.join(prototype, "data", "activities.json");
const libraryFile = path.join(prototype, "data", "video-library.json");

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function addLocalAsset(library, id, storageKey) {
  const asset = clone(library.assets[0]);
  const source = clone(library.sources.find(item => item.assetId === asset.id));
  const playable = clone(library.playables.find(item => item.assetId === asset.id));
  const sourceId = `source-${id}`;
  const playableId = `playable-${id}`;
  asset.id = id;
  asset.title = `Test ${id}`;
  asset.defaultPlayableId = playableId;
  asset.folderId = null;
  asset.tagIds = [];
  asset.parentAssetId = null;
  asset.familyRootAssetId = id;
  asset.provenance = { creationType: "import", provider: "test" };
  asset.derivationTypes = [];
  delete asset.sourceIds;
  delete asset.playableIds;
  source.id = sourceId;
  source.assetId = id;
  source.kind = "local-file";
  source.provider = "local";
  source.storageKey = storageKey;
  source.url = `/api/proto05/library/media/${encodeURIComponent(storageKey)}`;
  source.availability = "missing-local";
  source.provenance = { kind: "test" };
  playable.id = playableId;
  playable.assetId = id;
  playable.sourceId = sourceId;
  playable.kind = "local-file";
  playable.provider = "local";
  playable.storageKey = storageKey;
  playable.location = { storageKey };
  playable.url = source.url;
  playable.availability = "missing-local";
  playable.availabilityReason = "missing-file";
  library.assets.push(asset);
  library.sources.push(source);
  library.playables.push(playable);
  return { assetId: id, sourceId, playableId, storageKey };
}

function activityFixture(base, id, title, videoRef, video) {
  const activity = clone(base);
  activity.id = id;
  if (title === null) delete activity.title;
  else activity.title = title;
  activity.videoRef = videoRef;
  activity.video = { ...(activity.video || {}), ...video };
  return activity;
}

function usageFixture() {
  const library = JSON.parse(fs.readFileSync(libraryFile, "utf8"));
  const canonicalStore = JSON.parse(fs.readFileSync(activitiesFile, "utf8"));
  const baseActivity = canonicalStore.activities[0];
  const unused = addLocalAsset(library, "usage-unused", "usage-unused.mp4");
  const single = addLocalAsset(library, "usage-single", "usage-single.mp4");
  const multiple = addLocalAsset(library, "usage-multiple", "usage-multiple.mp4");
  const shared = addLocalAsset(library, "usage-shared", "usage-shared.mp4");
  addLocalAsset(library, "usage-shared-reference", shared.storageKey);
  const activities = [
    activityFixture(baseActivity, "activity-single", "Atelier — Les salutations", { assetId: single.assetId }, {}),
    activityFixture(baseActivity, "activity-multi-direct", "Vidéo augmentée — Entretien Raquel", { assetId: multiple.assetId, playableId: multiple.playableId }, { id: multiple.playableId, sourceId: multiple.sourceId, storageKey: multiple.storageKey }),
    activityFixture(baseActivity, "activity-multi-source", "Atelier source indirecte", { sourceId: multiple.sourceId }, { sourceId: multiple.sourceId }),
    activityFixture(baseActivity, "activity-multi-playable", null, { playableId: multiple.playableId }, { id: multiple.playableId })
  ];
  return {
    library,
    store: { ...canonicalStore, activities },
    unused,
    single,
    multiple,
    shared
  };
}

async function requestJson(baseUrl, pathName, options) {
  const response = await fetch(`${baseUrl}${pathName}`, options);
  return { response, body: await response.json() };
}

test("la projection d'usage couvre les activités directes et indirectes sans N+1 ni doublon", async () => {
  const fixture = usageFixture();
  const server = await startTemporaryProto05Server(fixture.store, "proto05-library-usage-test-", { videoLibrary: fixture.library });
  try {
    const listed = await requestJson(server.baseUrl, "/api/proto05/library/assets");
    assert.equal(listed.response.status, 200);
    const byId = id => listed.body.assets.find(asset => asset.id === id);
    assert.deepEqual(byId(fixture.unused.assetId).usage, {
      whetherUsed: false,
      activityCount: 0,
      activities: [],
      otherDependencies: { derivations: [], treatments: [], sharedReferences: [] },
      blocking: { catalogRemoval: false, physicalDeletion: false }
    });
    assert.equal(byId(fixture.single.assetId).usage.activityCount, 1);
    assert.equal(byId(fixture.single.assetId).usage.activities[0].title, "Atelier — Les salutations");
    const multipleUsage = byId(fixture.multiple.assetId).usage;
    assert.equal(multipleUsage.activityCount, 3);
    assert.deepEqual(multipleUsage.activities.map(activity => activity.id), ["activity-multi-direct", "activity-multi-source", "activity-multi-playable"]);
    assert.deepEqual(multipleUsage.activities[0].relations.sort(), ["asset", "playable", "source", "storage-key"].sort());
    assert.deepEqual(multipleUsage.activities[1].relations, ["source"]);
    assert.deepEqual(multipleUsage.activities[2].relations, ["playable"]);
    assert.equal(multipleUsage.activities[2].title, "Activité sans titre");
    const sharedUsage = byId(fixture.shared.assetId).usage;
    assert.equal(sharedUsage.whetherUsed, true);
    assert.equal(sharedUsage.activityCount, 0);
    assert.equal(sharedUsage.otherDependencies.sharedReferences.length, 1);
    assert.equal(sharedUsage.blocking.catalogRemoval, false);
    assert.equal(sharedUsage.blocking.physicalDeletion, true);

    const blocked = await requestJson(server.baseUrl, `/api/proto05/library/assets/${fixture.multiple.assetId}`, { method: "DELETE" });
    assert.equal(blocked.response.status, 409);
    const conflict = blocked.body.conflicts.find(item => item.type === "activities");
    assert.deepEqual(conflict.items, multipleUsage.activities);
    const physicalShared = await requestJson(server.baseUrl, `/api/proto05/library/assets/${fixture.shared.assetId}/physical`, { method: "DELETE" });
    assert.equal(physicalShared.response.status, 409);
    assert.deepEqual(physicalShared.body.conflicts.find(item => item.type === "shared-references").items, sharedUsage.otherDependencies.sharedReferences);
  } finally {
    await server.cleanup();
  }
});

function chromiumRunnerPage(usedAssetId) {
  return `<!doctype html><html><body data-test-state="running"><iframe id="library" src="/teacher-videos.html" style="width:1440px;height:1000px"></iframe><script>
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const done=results=>{document.body.dataset.results=encodeURIComponent(JSON.stringify(results));document.body.dataset.testState='done'};
  const fail=error=>{document.body.dataset.error=encodeURIComponent(error.stack||error.message||String(error));document.body.dataset.testState='error'};
  (async()=>{try{
    const frame=document.getElementById('library');
    await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    const win=frame.contentWindow,doc=frame.contentDocument,errors=[];
    win.addEventListener('error',event=>errors.push(event.message));
    win.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
    let used;
    for(let attempt=0;attempt<80;attempt++){used=doc.querySelector('.usage-indicator-button[data-usage-asset="${usedAssetId}"]');if(used)break;await wait(50)}
    if(!used)throw new Error('Indicateur utilisé introuvable.');
    await wait(500);
    used=doc.querySelector('.usage-indicator-button[data-usage-asset="${usedAssetId}"]');
    const unused=doc.querySelector('.usage-indicator.unused');
    const panel=doc.getElementById('usagePanel');
    const geometry=()=>{const triggerRect=used.getBoundingClientRect(),panelRect=panel.getBoundingClientRect(),placement=panel.dataset.placement,gap=placement==='above'?triggerRect.top-panelRect.bottom:panelRect.top-triggerRect.bottom;return {placement,gap,within:panelRect.left>=11&&panelRect.right<=win.innerWidth-11&&panelRect.top>=11&&panelRect.bottom<=win.innerHeight-11}};
    const anchored=value=>value.within&&value.gap>=6&&value.gap<=10;
    const menus=[...doc.querySelectorAll('.asset-delete-menu')];
    const menusInitiallyClosed=menus.length>1&&menus.every(menu=>menu.hidden);
    used.scrollIntoView({block:'center'});
    await wait(50);
    used.dispatchEvent(new MouseEvent('mouseenter'));
    const hoverOpened=!panel.hidden&&panel.textContent.includes('Atelier — Les salutations');
    const middleAnchor=geometry();
    used.dispatchEvent(new MouseEvent('mouseleave'));
    panel.dispatchEvent(new MouseEvent('mouseenter'));
    await wait(180);
    const pointerTransferOpen=!panel.hidden;
    panel.dispatchEvent(new MouseEvent('mouseleave'));
    await wait(180);
    const hoverClosed=panel.hidden;
    used.scrollIntoView({block:'start'});
    await wait(50);
    used.focus({preventScroll:true});
    await wait(20);
    const focusOpened=!panel.hidden&&used.getAttribute('aria-expanded')==='true';
    const topAnchor=geometry();
    doc.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    used.blur();
    used.scrollIntoView({block:'end'});
    await wait(50);
    used.focus({preventScroll:true});
    await wait(20);
    const bottomAnchor=geometry();
    used.click();
    used.blur();
    await wait(180);
    const clickPinned=!panel.hidden;
    const beforeScroll=geometry();
    win.scrollBy(0,60);
    win.dispatchEvent(new Event('scroll'));
    await wait(50);
    const afterScroll=geometry();
    frame.style.width='1400px';
    win.dispatchEvent(new Event('resize'));
    await wait(100);
    const resizeAnchor=geometry();
    frame.style.width='760px';
    win.dispatchEvent(new Event('resize'));
    await wait(100);
    used=doc.querySelector('.usage-indicator-button[data-usage-asset="${usedAssetId}"]');
    used.scrollIntoView({block:'center'});
    used.blur();
    used.focus({preventScroll:true});
    await wait(20);
    const narrowAnchor=geometry();
    frame.style.width='1440px';
    win.dispatchEvent(new Event('resize'));
    await wait(100);
    doc.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    const escapeClosed=panel.hidden&&used.getAttribute('aria-expanded')==='false';
    const listButton=doc.getElementById('listView');
    listButton.click();
    await wait(50);
    used=doc.querySelector('.usage-indicator-button[data-usage-asset="${usedAssetId}"]');
    used.scrollIntoView({block:'center'});
    used.focus({preventScroll:true});
    await wait(20);
    const listAnchor=geometry(),listViewAnchored=doc.getElementById('assets').classList.contains('list-view')&&anchored(listAnchor);
    doc.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    doc.getElementById('gridView').click();
    await wait(50);
    const actionButtons=[...doc.querySelectorAll('.asset-secondary-menu>button')];
    actionButtons[0].click();
    actionButtons[1].click();
    const actionExclusive=actionButtons[0].nextElementSibling.hidden&&!actionButtons[1].nextElementSibling.hidden;
    doc.body.click();
    const actionsCloseOutside=[...doc.querySelectorAll('.asset-delete-menu')].every(menu=>menu.hidden);
    done({unused:Boolean(unused&&unused.textContent.includes('Non utilisée')),menusInitiallyClosed,hoverOpened,hoverClosed,pointerTransferOpen,focusOpened,clickPinned,escapeClosed,middleAnchored:anchored(middleAnchor),topAnchored:anchored(topAnchor)&&topAnchor.placement==='below',bottomAnchored:anchored(bottomAnchor)&&bottomAnchor.placement==='above',scrollAnchored:anchored(beforeScroll)&&anchored(afterScroll),resizeAnchored:anchored(resizeAnchor),narrowAnchored:anchored(narrowAnchor),listViewAnchored,actionExclusive,actionsCloseOutside,errors});
  }catch(error){fail(error)}})();
  </script></body></html>`;
}

test("le panneau s'ouvre au survol, au focus et au clic sans régresser le menu Actions", async context => {
  const chromium = findChromium();
  assert.ok(chromium, "Chrome, Edge ou Chromium est requis pour la vérification ciblée.");
  const fixture = usageFixture();
  const server = await startTemporaryProto05Server(fixture.store, "proto05-library-usage-chromium-", { videoLibrary: fixture.library });
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "proto05-library-usage-profile-"));
  fs.writeFileSync(path.join(server.root, "prototype", "usage-runner.html"), chromiumRunnerPage(fixture.single.assetId), "utf8");
  try {
    const dom = await runChromium(chromium, `${server.baseUrl}/usage-runner.html`, profileDirectory, { virtualTimeBudget: 12000, timeout: 22000, windowSize: "1440,1000" });
    const results = readBrowserResults(dom);
    assert.equal(results.unused, true);
    assert.equal(results.menusInitiallyClosed, true);
    assert.equal(results.hoverOpened, true);
    assert.equal(results.hoverClosed, true);
    assert.equal(results.pointerTransferOpen, true);
    assert.equal(results.focusOpened, true);
    assert.equal(results.clickPinned, true);
    assert.equal(results.escapeClosed, true);
    assert.equal(results.middleAnchored, true);
    assert.equal(results.topAnchored, true);
    assert.equal(results.bottomAnchored, true);
    assert.equal(results.scrollAnchored, true);
    assert.equal(results.resizeAnchored, true);
    assert.equal(results.narrowAnchored, true);
    assert.equal(results.listViewAnchored, true);
    assert.equal(results.actionExclusive, true);
    assert.equal(results.actionsCloseOutside, true);
    assert.deepEqual(results.errors, []);
    context.diagnostic(`Recette Chromium ciblée exécutée avec ${chromium}.`);
  } finally {
    await server.cleanup();
    fs.rmSync(profileDirectory, { recursive: true, force: true });
  }
});
