'use strict';

const choose = document.getElementById('chooseMedia');
const message = document.getElementById('message');
const panel = document.getElementById('panel');
const video = document.getElementById('player');
let timeline;

function notify(text) {
  panel.hidden = false;
  message.textContent = text;
}

choose.onclick = async () => {
  const hadFocus = document.activeElement === choose;
  choose.disabled = true;
  try {
    timeline?.suspend();
    const response = await fetch('/api/choisir', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'});
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    if (result.source) location.assign('?video=' + result.source.id);
  } catch (error) {
    notify(error.message || 'Impossible de choisir la vidéo.');
  } finally {
    choose.disabled = false;
    if (hadFocus && document.activeElement === document.body) choose.focus({preventScroll:true});
  }
};

async function openSource(id) {
  const url = '/api/sources/' + encodeURIComponent(id);
  const response = await fetch(url, {cache:'no-store'});
  if (!response.ok) { notify('Choisissez à nouveau cette vidéo pour retrouver ses montages.'); return; }
  const {source} = await response.json();
  document.querySelector('h1').textContent = source.name;
  video.onloadeddata = () => {
    if (timeline) return;
    if (!(Number.isFinite(video.duration) && video.duration > 0)) { notify('Durée du média indisponible.'); return; }
    panel.hidden = true;
    for (const key of ['workspace','projectTools','layoutBtn','help']) document.getElementById(key).hidden = false;
    document.getElementById('version').textContent = 'Vidéo locale';
    timeline = mountWorkshopTimeline({video, assetId:id, playableId:id, name:source.name, size:source.size, media:() => ({})});
  };
  video.onerror = () => notify('Cette vidéo ne peut pas être lue ici. Choisissez un MP4 H.264 ou un fichier WebM compatible avec votre navigateur.');
  video.src = url + '/media';
}
const mediaId = new URL(location.href).searchParams.get('video');
if (mediaId) openSource(mediaId).catch(error => notify(error.message));
window.addEventListener('pagehide', () => timeline?.suspend());
window.addEventListener('pageshow', event => { if (event.persisted) timeline?.resume(); });
