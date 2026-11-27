'use strict';

function mountWorkshopExport({assetId, playableId, request, snapshot, pause, media, askSave}) {
  const $ = id => document.getElementById(id);
  const key = 'iclab.atelier.version-ouverte.' + JSON.stringify([assetId,playableId]);
  let selected = null, parts = null, generation = 0, timer, busy = false, queuedStart = false, restoring;
  const retry = $('retryExport'), read = $('readExport'), download = $('downloadExport');
  function clear() {
    clearTimeout(timer);
    retry.hidden = read.hidden = download.hidden = true;
    read.removeAttribute('href'); download.removeAttribute('href');
    $('exportMessage').textContent = '';
    $('exportPanel').hidden = true;
  }
  function select(version, project) {
    clear(); generation++; busy = queuedStart = false;
    selected = {id:version.id, name:version.name};
    parts = JSON.stringify(project.parts);
    try { sessionStorage.setItem(key,selected.id); } catch {}
  }
  function announce(text) {
    $('exportPanel').hidden = false;
    $('exportMessage').textContent = selected.name + ' · ' + text;
  }
  async function query(start, retryOf = null) {
    if (!selected) return;
    if (busy) { if (start) queuedStart = true; return; }
    const token = generation;
    clear(); busy = true;
    if (start) {
      announce('Demande d’export…');
      try { sessionStorage.setItem(key + '.export',JSON.stringify({id:selected.id,retryOf})); } catch {}
    }
    try {
      const options = start ? {method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...media(), retryOf})} : {};
      const {job} = await request('/' + selected.id + '/export', options);
      if (token !== generation) return;
      if (start) { try { sessionStorage.removeItem(key + '.export'); } catch {} }
      if (job.status === 'idle') return;
      if (job.status === 'completed') {
        announce('MP4 prêt.');
        read.href = download.href = job.mediaUrl;
        download.download = selected.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,100) + '-' + selected.id + '.mp4';
        read.hidden = download.hidden = false;
      } else if (job.status === 'failed') {
        announce(job.error); retry.hidden = false;
        retry.onclick = () => query(true,job.id);
      } else if (job.status === 'unavailable') announce(job.error);
      else {
        const phase = {starting:'Préparation…',rendering:'Rendu ' + (job.progress || 0) + ' %',validating:'Vérification des pistes et du fichier…',publishing:'Inscription dans la vidéothèque…'};
        announce(phase[job.status] || 'Traitement en cours…');
        timer = setTimeout(()=>query(false),650);
      }
    } catch (error) {
      if (token !== generation) return;
      announce(error.message || 'Connexion interrompue.'); retry.hidden = false;
      retry.onclick = () => query(start,retryOf);
    } finally {
      if (token === generation) {
        busy = false;
        if (queuedStart) { queuedStart = false; void query(true); }
      }
    }
  }
  function opened(version, project, start = false) {
    select(version, project);
    void query(start);
  }
  async function restoreSelection() {
    let id;
    try { id = sessionStorage.getItem(key); } catch {}
    if (!id) return;
    const token = generation;
    const {version} = await request('/' + id);
    if (generation !== token) return;
    select(version,version.project);
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem(key + '.export')); } catch {}
    await query(pending?.id === id, pending?.retryOf || null);
  }
  restoring = restoreSelection().catch(()=>{});
  $('exportMp4').onclick = async () => {
    pause(); await restoring;
    if (!selected || parts !== JSON.stringify(snapshot().parts)) askSave();
    else await query(true);
  };
  return {opened};
}
