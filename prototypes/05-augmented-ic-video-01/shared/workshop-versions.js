'use strict';

function mountWorkshopVersions({assetId, playableId, snapshot, pause, restore, media}) {
  const $ = id => document.getElementById(id);
  const api = '/api/proto05/library/assets/' + encodeURIComponent(assetId) + '/playables/' +
    encodeURIComponent(playableId) + '/workshop-versions';
  const dialog = $('serverVersions');
  const date = new Intl.DateTimeFormat('fr-FR', {dateStyle:'short', timeStyle:'short'});
  const pendingKey = 'iclab.atelier.envoi.' + JSON.stringify([assetId, playableId]);
  let versions = [];
  let pending = null;
  let target = null;
  let busy = false;
  let listGeneration = 0;
  let reference = null;
  const initial = snapshot();
  if (!initial.parts.length && !initial.undo.length && !initial.redo.length) reference = JSON.stringify(initial);
  try {
    const record = JSON.parse(sessionStorage.getItem(pendingKey));
    if (record && record.project.assetId === assetId && record.project.playableId === playableId) pending = record;
  } catch {}

  function newId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, n => n.toString(16).padStart(2,'0')).join('');
    return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
  }
  function remember(record) {
    pending = record;
    try {
      if (record) sessionStorage.setItem(pendingKey, JSON.stringify(record));
      else sessionStorage.removeItem(pendingKey);
    } catch {}
  }
  async function request(suffix = '', options = {}) {
    const response = await fetch(api + suffix, {cache:'no-store', ...options});
    const body = await response.json();
    if (!response.ok) throw Object.assign(Error(body.error || 'Le serveur ne peut pas répondre.'), {status:response.status});
    return body;
  }
  function message(text, retry) {
    $('versionStatus').textContent = text;
    $('versionRetry').hidden = !retry;
    $('versionRetry').onclick = retry || null;
  }
  function show(section, title) {
    pause();
    for (const id of ['versionForm','versionList','replaceVersion']) $(id).hidden = section !== id;
    $('serverVersionsTitle').textContent = title;
    $('closeVersions').textContent = section === 'versionList' ? 'Fermer' : 'Annuler';
    message('');
    if (!dialog.open) dialog.showModal();
  }
  function lock(value) {
    busy = value;
    for (const el of dialog.querySelectorAll('button,input')) el.disabled = value;
  }
  function render() {
    $('listVersions').textContent = 'Versions (' + versions.length + ')';
    const list = $('versionList');
    list.replaceChildren();
    if (!versions.length) { list.textContent = 'Aucune version enregistrée pour cette source.'; return; }
    for (const version of versions) {
      const row = document.createElement('div');
      row.className = 'saved-version';
      const name = document.createElement('strong');
      name.textContent = version.name;
      const time = document.createElement('time');
      time.dateTime = version.createdAt;
      time.textContent = date.format(new Date(version.createdAt));
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = 'Ouvrir';
      button.setAttribute('aria-label','Ouvrir ' + version.name);
      button.onclick = () => load(version.id);
      row.append(name, time, button); list.append(row);
    }
  }
  async function refreshList(visible) {
    const generation = ++listGeneration;
    if (visible) {
      show('versionList','Versions du montage');
      message('Chargement des versions…');
    }
    try {
      const body = await request();
      if (generation !== listGeneration) return;
      versions = body.versions; render();
      if (visible && dialog.open && !$('versionList').hidden) message('');
    } catch {
      if (generation !== listGeneration) return;
      if (visible && dialog.open && !$('versionList').hidden) message('Liste indisponible. Votre montage est conservé.', () => refreshList(true));
    }
  }
  let exportAfterSave = false;
  const exporter = mountWorkshopExport({assetId, playableId, request, snapshot, pause, media,
    askSave:() => openForm(null,true)});
  function openForm(next = null, exporting = false) {
    exportAfterSave = exporting;
    target = next;
    show('versionForm', exporting ? 'Enregistrer la variante et exporter' : next ? 'Garder le montage actuel' : 'Enregistrer une version');
    $('versionName').value = pending?.name || ('Montage du ' + date.format(new Date()));
    $('versionName').readOnly = Boolean(pending);
    $('confirmVersion').textContent = pending ? 'Réessayer cet enregistrement' : exporting ? 'Enregistrer et exporter' : 'Enregistrer';
    if (pending) message('Un envoi reste à confirmer. La nouvelle tentative utilise la copie déjà envoyée.');
    $('versionName').focus(); $('versionName').select();
  }
  function apply(version) {
    restore(version.project);
    exporter.opened(version,version.project);
    reference = JSON.stringify(snapshot());
    dialog.close();
    $('fileStatus').textContent = 'Version ouverte · ' + version.name;
  }
  async function load(id) {
    if (busy) return;
    lock(true); message('Ouverture…');
    try {
      const {version} = await request('/' + id);
      validateWorkshopProject(version.project, assetId, playableId, snapshot().duration);
      if (reference !== JSON.stringify(snapshot())) {
        target = version;
        show('replaceVersion','Ouvrir « ' + version.name + ' »');
      } else apply(version);
    } catch (e) {
      message(e.message || 'Ouverture impossible.', () => load(id));
    } finally { lock(false); }
  }
  $('versionForm').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    const name = $('versionName').value.trim();
    if (!name) { message('Saisissez un nom.'); return; }
    if (!pending) {
      const record = {id:newId(), name, exporting:exportAfterSave, project:JSON.parse(JSON.stringify(snapshot()))};
      remember(record);
    }
    const record = pending;
    lock(true); message('Enregistrement en cours…');
    try {
      const {version} = await request('/' + record.id, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:record.name, project:record.project})
      });
      if (version?.id !== record.id) throw Error('Réponse du serveur inattendue.');
      remember(null);
      reference = JSON.stringify(record.project);
      ++listGeneration;
      versions = [version, ...versions.filter(entry => entry.id !== version.id)];
      render();
      const next = target;
      const sameMontage = JSON.stringify(record.project.parts) === JSON.stringify(snapshot().parts);
      exporter.opened(version,record.project,exportAfterSave && sameMontage);
      if (exportAfterSave && !sameMontage) {
        openForm(null,true);
        message('Envoi précédent confirmé. Nommez la variante actuellement à l’écran pour l’exporter.');
        return;
      }
      if (next && reference === JSON.stringify(snapshot())) apply(next);
      else {
        dialog.close();
        $('fileStatus').textContent = 'Version enregistrée · ' + version.name;
      }
      refreshList(false);
    } catch (e) {
      if ([400, 404, 409, 413].includes(e.status)) remember(null);
      $('versionName').readOnly = Boolean(pending);
      $('confirmVersion').textContent = pending ? 'Réessayer cet enregistrement' : exportAfterSave ? 'Enregistrer et exporter' : 'Enregistrer';
      message(e.message || 'Confirmation indisponible. Votre montage est conservé.');
    } finally { lock(false); }
  };
  $('saveVersion').onclick = () => openForm();
  $('listVersions').onclick = () => { target = null; refreshList(true); };
  $('openWithoutSaving').onclick = () => { if (target) apply(target); };
  $('keepVersion').onclick = () => openForm(target);
  $('closeVersions').onclick = () => dialog.close();
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  refreshList(false);
  if (pending?.exporting) openForm(null,true);
}
