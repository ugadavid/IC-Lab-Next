'use strict';
function mountWorkshopTimeline({ video, assetId, playableId, name, size }) {
  const $ = id => document.getElementById(id), stage = $('picture'), canvas = $('canvas'), ctx = canvas.getContext('2d'), v = video;
  const iconPaths = {
    "save": "M4 3h13l4 4v14H3V3z M7 3v6h9V3 M7 21v-8h10v8",
    "pickopenProject": "M3 19V5h6l3 3h8v3 M3 19l3-8h16l-3 8z",
    "undo": "M8 4L3 9l5 5 M4 9h9a7 7 0 017 7v3",
    "redo": "M16 4l5 5-5 5 M20 9h-9a7 7 0 00-7 7v3",
    "loop": "M4 12V9a3 3 0 013-3h13l-3-3 M20 6l-3 3 M20 12v3a3 3 0 01-3 3H4l3 3 M4 18l3-3",
    "mag": "M4 4h5v9a3 3 0 006 0V4h5v9a8 8 0 01-16 0z M4 8h5 M15 8h5",
    "mode": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 11-6 0 3 3 0 016 0",
    "newMask": "M9 4H3v6 M3 15v5h6 M14 20h6v-5 M14 4h6v6 M7 14l6-7 M8 17l8-9 M12 17l5-6",
    "newSound": "M9 16V5l11-2v11 M9 16a3 3 0 11-3-3h3 M20 14a3 3 0 11-3-3h3",
    "split": "M7 5a3 3 0 11-6 0 3 3 0 016 0 M7 19a3 3 0 11-6 0 3 3 0 016 0 M6 7l14 14 M6 17L20 3",
    "startAt": "M4 4v16 M18 6l-8 6 8 6",
    "stopAt": "M20 4v16 M6 6l8 6-8 6",
    "deletePart": "M3 6h18 M8 6V3h8v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
    "zoomAll": "M3 5v14 M21 5v14 M6 12h12 M9 9l-3 3 3 3 M15 9l3 3-3 3"
  };
  function setTip(el, label) {
    el.dataset.tip = label;
    el.setAttribute('aria-label', label);
    el.removeAttribute('title');
  }
  function icon(el, label) {
    el.classList.add('icon');
    setTip(el, label);
    el.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + iconPaths[el.id] + '"/></svg>';
  }
  const tips = {
    save: 'Enregistrer le projet (Ctrl+S)',
    pickopenProject: 'Ouvrir un projet',
    undo: 'Annuler (Ctrl+Z)',
    redo: 'Rétablir (Ctrl+Y)',
    mag: 'Aimants · aligner les passages pendant le glissement (Alt pour suspendre)',
    loop: 'Boucle · relire la sélection avec une seconde de contexte (B)',
    mode: 'Prévisualiser le résultat',
    newMask: 'Ajouter une zone à flouter au curseur (M)',
    newSound: 'Ajouter un passage sonore au curseur (S)',
    zoomAll: 'Afficher toute la timeline'
  };
  for (const [id, label] of Object.entries(tips))
    icon($(id), label);
  $('newMask').append('Flouter');
  $('newSound').append('Traiter le son');
  $('pickopenProject').onclick = () => $('openProject').click();
  const tip = $('toolTip');
  let tipTimer;
  function hideTip() {
    clearTimeout(tipTimer);
    tip.hidden = true;
  }
  function displayTip(event) {
    const el = event.target.closest?.('[data-tip]');
    if (!el)
      return;
    hideTip();
    tipTimer = setTimeout(() => {
      if (!el.isConnected)
        return;
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      tip.style.left = Math.max(4, Math.min(innerWidth - tip.offsetWidth - 4, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
      tip.style.top = (r.bottom + tip.offsetHeight + 8 < innerHeight ? r.bottom + 6 : r.top - tip.offsetHeight - 5) + 'px';
    }, 300);
  }
  document.addEventListener('pointerover', displayTip);
  document.addEventListener('focusin', displayTip);
  for (const event of ['focusout', 'pointerout', 'pointerdown', 'keydown', 'scroll'])
    document.addEventListener(event, hideTip, true);
  const duration = v.duration;
  let t = 0, playing = false, preview = false, serial = 0, parts = [], selected = null, drag = null, audio, osc, gain;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function fmt(seconds) {
    const cs = Math.round(seconds * 100);
    return Math.floor(cs / 6000) + ':' + String(Math.floor(cs / 100) % 60).padStart(2, '0') + ',' + String(cs % 100).padStart(2, '0');
  }
  function add(type, start, end, opts = {}) {
    let p = { id: ++serial, type, start, end, x: .27, y: .37, w: .43, h: .24, effect: 'Couper le son', ...opts };
    parts.push(p);
    selected = p;
    return p;
  }
  const historyBack = [], historyForward = [];
  let saved = JSON.stringify(parts), savedId = selected?.id, looping = false, magnet = false, frame;
  function trackEdit() {
    if (drag || gesture)
      return;
    const next = JSON.stringify(parts);
    if (next !== saved) {
      historyBack.push([saved, savedId]);
      historyForward.length = 0;
      saved = next;
    }
    savedId = selected?.id;
    $('undo').disabled = !historyBack.length;
    $('redo').disabled = !historyForward.length;
  }
  function restore(from, to) {
    if (!from.length || drag || gesture)
      return;
    pause();
    to.push([saved, savedId]);
    [saved, savedId] = from.pop();
    parts = JSON.parse(saved);
    selected = parts.find(p => p.id === savedId) || null;
    edit();
    refresh();
  }
  $('undo').onclick = () => restore(historyBack, historyForward);
  $('redo').onclick = () => restore(historyForward, historyBack);
  $('mag').onclick = () => {
    magnet = !magnet;
    $('mag').setAttribute('aria-pressed', magnet);
  };
  function loopRange() {
    return [Math.max(0, selected.start - 1), Math.min(duration, selected.end + 1)];
  }
  $('loop').onclick = () => {
    if (!selected)
      return;
    looping = !looping;
    pause();
    if (looping) {
      seek(loopRange()[0]);
      $('play').click();
    }
    refresh();
  };
  document.addEventListener('keydown', e => {
    if (!ready || $('workspace').hidden || document.querySelector('dialog[open]') || !popup.hidden || drag || gesture || e.isComposing ||
      e.target.isContentEditable || e.target.closest?.('input:not([type="range"]),textarea,select'))
      return;
    const key = e.key.toLowerCase();
    if (e.ctrlKey && !e.altKey && !e.shiftKey && ['z', 'y'].includes(key)) {
      e.preventDefault();
      $(key === 'z' ? 'undo' : 'redo').click();
    }
    else if (key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !e.repeat) {
      e.preventDefault();
      $('loop').click();
    }
  });
  function tone() {
    if (!audio) {
      audio = new AudioContext();
      osc = audio.createOscillator();
      osc.frequency.value = 650;
      gain = audio.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(audio.destination);
      osc.start();
    }
    audio.resume();
  }
  function pause() {
    cancelAnimationFrame(frame);
    playing = false;
    v.pause();
    $('play').textContent = '▶ Lire';
    if (gain)
      gain.gain.value = 0;
  }
  function seek(x) {
    t = clamp(x, 0, duration);
    if (v.readyState)
      v.currentTime = t;
    refresh();
  }
  function edit() {
    let box = $('editor');
    box.replaceChildren();
    if (!selected) {
      box.textContent = 'Choisissez une modification sur une piste ou ajoutez-en une.';
      return;
    }
    let p = selected, isImg = p.type === 'image';
    box.innerHTML = '<h2></h2><div class="row"><label>Début (secondes)<br><input id="start" type="number" step=".01"></label><label>Fin (secondes)<br><input id="end" type="number" step=".01"></label></div>';
    box.querySelector('h2').textContent = isImg ? 'Zone à flouter' : 'Passage sonore';
    for (let k of ['start', 'end']) {
      let n = $(k);
      n.min = 0;
      n.max = duration;
      n.value = +p[k].toFixed(2);
      n.onchange = () => {
        if (!Number.isFinite(n.valueAsNumber) || !n.value.trim()) {
          edit();
          return;
        }
        p[k] = k === 'start' ? clamp(+n.value, 0, p.end - .01) : clamp(+n.value, p.start + .01, duration);
        seek(p.start);
        edit();
      };
    }
    function btn(title, fn, id) {
      let b = document.createElement('button');
      b.textContent = title;
      b.onclick = fn;
      if (id)
        b.id = id;
      icon(b, title + (id === 'deletePart' ? ' (Suppr)' : ''));
      let tools = box.querySelector('.miniTools');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'miniTools';
        box.append(tools);
      }
      tools.append(b);
    }
    btn('Scinder ici', () => {
      const { id, type, start, end, ...options } = p;
      p.end = t;
      add(type, t, end, options);
      edit();
      refresh();
    }, 'split');
    if (!isImg) {
      let l = document.createElement('label');
      l.textContent = 'Traitement du passage ';
      let sel = document.createElement('select');
      for (let e of ['Couper le son', 'Remplacer par un bip'])
        sel.add(new Option(e, e));
      sel.value = p.effect;
      sel.onchange = () => {
        p.effect = sel.value;
        refresh();
      };
      l.append(sel);
      box.append(l);
    }
    btn(isImg ? 'Débuter le flou au curseur' : 'Débuter le passage au curseur', () => {
      p.start = t;
      edit();
      refresh();
    }, 'startAt');
    btn(isImg ? 'Arrêter le flou au curseur' : 'Terminer le passage au curseur', () => {
      p.end = t;
      edit();
      refresh();
    }, 'stopAt');
    btn(isImg ? 'Supprimer le masque' : 'Supprimer le passage sonore', removeSelected, 'deletePart');
    $('deletePart').setAttribute('aria-keyshortcuts', 'Delete');
  }
  function removeSelected() {
    if (!selected || drag || gesture)
      return;
    parts = parts.filter(part => part !== selected);
    selected = null;
    edit();
    refresh();
  }
  function deleteShortcut(e) {
    if ($('helpBox').open || dialog.open || !popup.hidden || e.key !== 'Delete' || e.repeat || e.isComposing || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)
      return;
    if (!selected || drag || gesture || e.target.isContentEditable)
      return;
    if (e.target.closest?.('textarea,select,input:not([type="range"])'))
      return;
    e.preventDefault();
    removeSelected();
  }
  document.addEventListener('keydown', deleteShortcut);
  let step = 1, durationTarget = null;
  const popup = $('popup'), dialog = $('durationBox');
  const secondsLabel = n => String(n).replace('.', ',') + ' s';
  function updateSteps() {
    for (const [id, sign, name] of [['back', '−', 'Reculer'], ['forward', '+', 'Avancer']]) {
      $(id).textContent = sign + secondsLabel(step);
      $(id).setAttribute('aria-label', name + ' de ' + secondsLabel(step));
    }
  }
  function place(el, x, y) {
    el.style.left = clamp(x, 4, innerWidth - el.offsetWidth - 4) + 'px';
    el.style.top = clamp(y, 4, innerHeight - el.offsetHeight - 4) + 'px';
  }
  function openPopup(x, y, choices) {
    popup.replaceChildren();
    for (const [label, action, key] of choices) {
      const b = document.createElement('button');
      b.textContent = label;
      if (key) {
        const hint = document.createElement('kbd');
        hint.textContent = key;
        b.append(hint);
      }
      b.onclick = () => {
        popup.hidden = true;
        action();
      };
      popup.append(b);
    }
    popup.hidden = false;
    place(popup, x, y);
    popup.firstChild.focus({ preventScroll: true });
  }
  const stepChoices = [.1, 1, 5];
  let stepReturn = null;
  function closeStepMenu() {
    popup.hidden = true;
    if (stepReturn?.isConnected)
      stepReturn.focus({ preventScroll: true });
    stepReturn = null;
  }
  function chooseStep(anchor) {
    const rect = anchor.getBoundingClientRect();
    stepReturn = document.activeElement;
    openPopup(rect.left, rect.bottom, stepChoices.map(value => [
      (value === step ? '✓  ' : '') + secondsLabel(value),
      () => {
        step = value;
        updateSteps();
        closeStepMenu();
      }
    ]));
    popup.children[stepChoices.indexOf(step)].focus({ preventScroll: true });
  }
  for (const b of document.querySelectorAll('[data-step]'))
    b.onclick = () => chooseStep(b);
  document.addEventListener('pointerdown', e => {
    if (!popup.contains(e.target)) {
      popup.hidden = true;
      stepReturn = null;
    }
  });
  popup.addEventListener('keydown', e => {
    const items = Array.from(popup.children);
    const direction = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (direction) {
      e.preventDefault();
      e.stopPropagation();
      items[(items.indexOf(document.activeElement) + direction + items.length) % items.length].focus();
    }
    if (e.key === 'Tab')
      closeStepMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !popup.hidden) {
      e.preventDefault();
      closeStepMenu();
    }
  });
  $('help').onclick = () => {
    $('helpBox').showModal();
  };
  $('closeHelp').onclick = () => $('helpBox').close();
  function moveByStep(sign) {
    pause();
    seek(Math.round((t + sign * step) * 1e9) / 1e9);
  }
  for (const [id, sign, key] of [['back', -1, 'ArrowLeft'], ['forward', 1, 'ArrowRight']]) {
    $(id).onclick = () => moveByStep(sign);
    $(id).setAttribute('aria-keyshortcuts', key);
    $(id).title = sign < 0 ? 'Reculer (←)' : 'Avancer (→)';
  }
  function editTiming(key, x, y) {
    pause();
    if (key === 'u') {
      openLength(selected, x, y);
      return;
    }
    const input = $(key === 'd' ? 'start' : 'end');
    input.focus();
    input.select();
  }
  function timelineKeys(e) {
    if (!ready || $('workspace').hidden || $('layoutBox').matches(':popover-open') || e.defaultPrevented || e.isComposing || e.ctrlKey || e.altKey || e.metaKey || (e.shiftKey && e.key !== '?'))
      return;
    if ($('helpBox').open || dialog.open || !popup.hidden || gesture || drag || e.target.isContentEditable)
      return;
    if (e.target.closest?.('input:not([type="range"]),select,textarea'))
      return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveByStep(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    const key = e.key.toLowerCase();
    if (['m', 's', 'p', '?'].includes(key)) {
      e.preventDefault();
      if (e.repeat)
        return;
      if (key === 'p')
        chooseStep(document.querySelector('[data-step]'));
      else
        $({ 'm': 'newMask', 's': 'newSound', '?': 'help' }[key]).click();
      return;
    }
    if (!selected || e.repeat || !['d', 'f', 'u'].includes(key))
      return;
    e.preventDefault();
    const rect = $(selected.type + 'Track').getBoundingClientRect();
    editTiming(key, rect.left, rect.top);
  }
  document.addEventListener('keydown', timelineKeys);
  updateSteps();
  function parseDuration(text) {
    const match = /^(\d+)(?:[.,](\d{1,2})\s*s?|\s*s\s*(\d{0,2}))?$/i.exec(text.trim());
    if (!match)
      return NaN;
    return Number(match[1]) + Number((match[2] || match[3] || '').padEnd(2, '0')) / 100;
  }
  function availableCS(p) {
    return Math.floor((duration - p.start) * 100 + 1e-8);
  }
  function inspectLength() {
    const p = durationTarget, value = parseDuration($('lengthInput').value);
    const max = availableCS(p), tooLong = value * 100 > max + 1e-8;
    $('fit').hidden = !tooLong || max < 1;
    $('lengthInfo').textContent = tooLong ? 'Durée disponible : ' + (max / 100).toFixed(2).replace('.', ',') + ' s' :
      !(value > 0) ? 'Saisissez une durée positive, par exemple 3s15.' :
        'Début ' + fmt(p.start) + ' → Fin ' + fmt(p.start + value);
    return value > 0 && !tooLong ? value : null;
  }
  function openLength(p, x, y) {
    durationTarget = p;
    $('durationTitle').textContent = p.type === 'image' ? 'Durée du masque' : 'Durée du passage sonore';
    $('lengthInput').value = (Math.min(Math.round((p.end - p.start) * 100), availableCS(p)) / 100).toFixed(2).replace('.', ',');
    inspectLength();
    dialog.showModal();
    place(dialog, x, y - dialog.offsetHeight);
    $('lengthInput').select();
  }
  $('lengthInput').oninput = inspectLength;
  $('fit').onclick = () => {
    $('lengthInput').value = (availableCS(durationTarget) / 100).toFixed(2).replace('.', ',');
    inspectLength();
    $('durationForm').querySelector('.primary').focus();
  };
  $('durationForm').onsubmit = e => {
    e.preventDefault();
    const value = inspectLength();
    if (value === null)
      return;
    durationTarget.end = Math.min(duration, durationTarget.start + value);
    dialog.close();
    edit();
    refresh();
  };
  $('cancelLength').onclick = () => dialog.close();
  function sizePicture() {
    const bounds = $('stage').getBoundingClientRect();
    const scale = Math.min(bounds.width / v.videoWidth, bounds.height / v.videoHeight);
    stage.style.width = (v.videoWidth * scale) + 'px';
    stage.style.height = (v.videoHeight * scale) + 'px';
  }
  const resolution = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
  canvas.width = Math.max(1, Math.round(v.videoWidth * resolution));
  canvas.height = Math.max(1, Math.round(v.videoHeight * resolution));
  new ResizeObserver(sizePicture).observe($('stage'));
  function draw(active) {
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const masks = active.filter(p => p.type === 'image');
    if (!masks.length || v.readyState < 2)
      return;
    ctx.save();
    ctx.beginPath();
    for (const p of masks)
      ctx.rect(p.x * width, p.y * height, p.w * width, p.h * height);
    ctx.clip();
    ctx.filter = 'blur(' + Math.max(4, Math.round(width * .017)) + 'px)';
    ctx.drawImage(v, 0, 0, width, height);
    ctx.restore();
  }
  let gesture = null;
  function bounds(start, end, delta, mode, total, minSpan) {
    if (mode === 'left')
      return [clamp(start + delta, 0, end - minSpan), end];
    if (mode === 'right')
      return [start, clamp(end + delta, start + minSpan, total)];
    let shift = clamp(delta, -start, total - end);
    return [start + shift, end + shift];
  }
  function snapInterval(g, start, end) {
    let best = null, distance = Math.min(.30, 8 * duration / g.width);
    for (const peer of parts) {
      if (peer === g.p || peer.type !== g.p.type)
        continue;
      for (const target of [peer.start, peer.end]) {
        for (const side of (g.mode === 'move' ? ['left', 'right'] : [g.mode])) {
          const delta = target - (side === 'left' ? start : end);
          if (Math.abs(delta) > distance)
            continue;
          const a = g.mode === 'move' || side === 'left' ? start + delta : start;
          const b = g.mode === 'move' || side === 'right' ? end + delta : end;
          if (a < 0 || b > duration || b - a < Math.min(.1, g.end - g.start) - 1e-9)
            continue;
          distance = Math.abs(delta);
          best = [side === 'left' ? target : a, side === 'right' ? target : b, target];
        }
      }
    }
    return best;
  }
  function positionBar(b, p) {
    b.style.left = 100 * p.start / duration + '%';
    b.style.width = 100 * (p.end - p.start) / duration + '%';
    b.title = (p.type === 'image' ? 'Flou' : p.effect) + ' · ' + fmt(p.start) + ' – ' + fmt(p.end);
    b.setAttribute('aria-label', b.title);
  }
  function showTracks() {
    for (const type of ['image', 'audio']) {
      const tr = $(type + 'Track');
      if (!gesture && (!playing || !tr.children.length)) {
        tr.replaceChildren();
        const ends = [];
        const items = parts.filter(p => p.type === type).sort((a, b) => a.start - b.start);
        for (const p of items) {
          let lane = ends.findIndex(end => end <= p.start + 1e-8);
          if (lane < 0)
            lane = ends.length;
          ends[lane] = p.end;
          const b = document.createElement('button');
          b.className = 'bar ' + type + (p === selected ? ' active' : '');
          b.style.top = (3 + lane * 31) + 'px';
          b.innerHTML = '<i class="grip" data-edge="left"></i><span></span><i class="grip" data-edge="right"></i>';
          b.querySelector('span').textContent = type === 'image' ? 'Flou' : p.effect;
          positionBar(b, p);
          b.onpointerdown = e => {
            if (e.button !== 0 || gesture)
              return;
            e.preventDefault();
            pause();
            preview = false;
            selected = p;
            gesture = { id: e.pointerId, p, b, tr, x: e.clientX, start: p.start, end: p.end,
              mode: e.target.dataset.edge || 'move', width: tr.clientWidth, moved: false };
            tr.setPointerCapture(e.pointerId);
            document.querySelectorAll('.bar.active').forEach(n => n.classList.remove('active'));
            b.classList.add('active');
            edit();
            refresh();
          };
          b.oncontextmenu = e => {
            e.preventDefault();
            pause();
            selected = p;
            edit();
            refresh();
            const { clientX: x, clientY: y } = e;
            openPopup(x, y, [
              ['Définir le début…', () => editTiming('d', x, y), 'D'],
              ['Définir la fin…', () => editTiming('f', x, y), 'F'],
              ['Définir la durée…', () => editTiming('u', x, y), 'U']
            ]);
          };
          b.onclick = e => {
            if (e.detail === 0) {
              pause();
              preview = false;
              selected = p;
              edit();
              seek(p.start);
            }
          };
          tr.append(b);
        }
        tr.style.height = Math.max(33, ends.length * 31 + 2) + 'px';
        const line = document.createElement('i');
        line.className = 'needle';
        tr.append(line);
      }
      tr.lastChild.style.left = 100 * t / duration + '%';
    }
  }
  for (const track of [$('imageTrack'), $('audioTrack')]) {
    track.onpointermove = e => {
      const g = gesture;
      if (!g || g.id !== e.pointerId || g.tr !== track)
        return;
      const pixels = e.clientX - g.x;
      if (!g.moved && Math.abs(pixels) < 2)
        return;
      g.moved = true;
      const precision = zoom > 1 ? 100 : 10;
      const delta = Math.round(pixels * duration / g.width * precision) / precision;
      [g.p.start, g.p.end] = bounds(g.start, g.end, delta, g.mode, duration, Math.min(.1, g.end - g.start));
      const match = magnet && !e.altKey ? snapInterval(g, g.p.start, g.p.end) : null;
      track.classList.toggle('snapped', !!match);
      if (match) {
        [g.p.start, g.p.end] = match;
        track.style.setProperty('--snap', 100 * match[2] / duration + '%');
      }
      $('snapInfo').textContent = match ? 'Aligné à ' + fmt(match[2]) : '';
      positionBar(g.b, g.p);
      $('start').value = +g.p.start.toFixed(2);
      $('end').value = +g.p.end.toFixed(2);
      seek(g.mode === 'right' ? Math.max(g.p.start, g.p.end - .001) : g.p.start);
    };
    function finish(e) {
      const g = gesture;
      if (!g || g.id !== e.pointerId || g.tr !== track)
        return;
      gesture = null;
      track.classList.remove('snapped');
      $('snapInfo').textContent = '';
      if (e.type === 'pointercancel') {
        g.p.start = g.start;
        g.p.end = g.end;
      }
      if (!g.moved)
        seek(g.p.start);
      edit();
      refresh();
    }
    track.onpointerup = track.onpointercancel = track.onlostpointercapture = finish;
  }
  function updateMaskCounts() {
    const groups = new Map();
    for (const node of stage.querySelectorAll('.mask')) {
      node.querySelector('.mask-count')?.remove();
      if (preview)
        continue;
      const { x, y, w, h } = node.maskPart;
      const key = [x, y, w, h].join(',');
      const count = (groups.get(key)?.count || 0) + 1;
      groups.set(key, { node, count });
    }
    for (const { node, count } of groups.values()) {
      if (count < 2)
        continue;
      const badge = document.createElement('span');
      badge.className = 'mask-count';
      badge.textContent = String(count);
      badge.setAttribute('aria-label', count + ' masques superposés');
      node.append(badge);
    }
  }
  function refresh() {
    if (!playing)
      trackEdit();
    if (!selected)
      looping = false;
    $('loop').disabled = !selected;
    $('loop').setAttribute('aria-pressed', looping);
    const active = parts.filter(p => p.start <= t && t < p.end);
    const sound = active.filter(p => p.type === 'audio').at(-1);
    if (v.muted !== Boolean(sound)) v.muted = Boolean(sound);
    if (gain)
      gain.gain.value = playing && sound?.effect === 'Remplacer par un bip' ? .045 : 0;
    draw(active);
    $('clock').textContent = fmt(t) + ' / ' + fmt(duration);
    $('seek').value = t;
    stage.classList.toggle('preview', preview);
    const visible = active.filter(part => part.type === 'image');
    for (const node of stage.querySelectorAll('.mask')) {
      if (!visible.includes(node.maskPart) && !drag)
        node.remove();
    }
    for (const p of visible) {
      let node = Array.from(stage.querySelectorAll('.mask')).find(n => n.maskPart === p);
      if (!node) {
        node = document.createElement('div');
        node.maskPart = p;
        node.className = 'mask';
        node.setAttribute('role', 'button');
        node.setAttribute('aria-label', 'Zone à flouter ' + p.id + ' · flèches pour déplacer, Maj + flèches pour redimensionner');
        stage.append(node);
        node.onpointerdown = e => {
          if (preview || e.button !== 0 || drag)
            return;
          pause();
          selected = p;
          edit();
          node.focus({ preventScroll: true });
          const r = node.getBoundingClientRect();
          drag = { p, n: node, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, x: p.x, y: p.y, w: p.w, h: p.h,
            resize: e.clientX > r.right - 19 && e.clientY > r.bottom - 19 };
          node.setPointerCapture(e.pointerId);
          refresh();
        };
        node.onkeydown = e => {
          if (preview || e.altKey || e.ctrlKey || e.metaKey || drag || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
            return;
          e.preventDefault();
          e.stopPropagation();
          pause();
          selected = p;
          const dx = ((e.key === 'ArrowRight') - (e.key === 'ArrowLeft')) / v.videoWidth;
          const dy = ((e.key === 'ArrowDown') - (e.key === 'ArrowUp')) / v.videoHeight;
          if (e.shiftKey) {
            p.w = clamp(p.w + dx, 1 / v.videoWidth, 1 - p.x);
            p.h = clamp(p.h + dy, 1 / v.videoHeight, 1 - p.y);
          }
          else {
            p.x = clamp(p.x + dx, 0, 1 - p.w);
            p.y = clamp(p.y + dy, 0, 1 - p.h);
          }
          edit();
          refresh();
        };
      }
      node.tabIndex = preview ? -1 : 0;
      node.classList.toggle('sel', p === selected);
      Object.assign(node.style, { left: p.x * 100 + '%', top: p.y * 100 + '%', width: p.w * 100 + '%', height: p.h * 100 + '%' });
    }
    updateMaskCounts();
    showTracks();
    if ($('startAt'))
      $('startAt').disabled = t === selected.start || t > selected.end - .01;
    for (let id of ['split', 'stopAt'])
      if ($(id))
        $(id).disabled = !(selected && t > selected.start + .01 && t < selected.end - .01);
    setTip($('mode'), preview ? 'Revenir au montage' : 'Prévisualiser le résultat');
    $('mode').setAttribute('aria-pressed', preview);
  }
  stage.onpointermove = event => {
    if (!drag || !drag.n.hasPointerCapture(event.pointerId))
      return;
    const { p, x, y, w, h, sx, sy } = drag;
    const box = stage.getBoundingClientRect();
    const dx = (event.clientX - sx) / box.width;
    const dy = (event.clientY - sy) / box.height;
    if (drag.resize) {
      p.w = clamp(w + dx, Math.min(w, .04), 1 - x);
      p.h = clamp(h + dy, Math.min(h, .04), 1 - y);
    }
    else {
      p.x = clamp(x + dx, 0, 1 - w);
      p.y = clamp(y + dy, 0, 1 - h);
    }
    refresh();
  };
  function finishMask(event) {
    if (!drag || drag.pointerId !== event.pointerId)
      return;
    if (event.type === 'pointercancel') {
      const { x, y, w, h } = drag;
      Object.assign(drag.p, { x, y, w, h });
    }
    drag = null;
    refresh();
  }
  stage.onpointerup = stage.onpointercancel = stage.onlostpointercapture = finishMask;
  function tick() {
    if (!playing)
      return;
    t = v.currentTime;
    if (looping && selected) {
      const [a, b] = loopRange();
      if (t >= b || t < a - .02 || v.ended) {
        t = a;
        v.currentTime = a;
        if (v.paused)
          v.play().catch(pause);
      }
    }
    else if (t >= duration || v.ended)
      pause();
    refresh();
    if (playing)
      frame = requestAnimationFrame(tick);
  }
  $('play').onclick = async () => {
    if (playing) {
      pause();
      refresh();
      return;
    }
    if (looping && selected) {
      const [a, b] = loopRange();
      if (t < a || t >= b)
        seek(a);
    }
    else if (t >= duration)
      seek(0);
    tone();
    try {
      await v.play();
    }
    catch {
      pause();
      return;
    }
    playing = true;
    $('play').textContent = 'Ⅱ Pause';
    frame = requestAnimationFrame(tick);
  };
  $('seek').oninput = e => {
    pause();
    seek(+e.target.value);
  };
  $('mode').onclick = () => {
    preview = !preview;
    refresh();
  };
  for (let [id, type] of [['newMask', 'image'], ['newSound', 'audio']])
    $(id).onclick = () => {
      pause();
      if (t >= duration - .01)
        seek(0);
      preview = false;
      add(type, t, duration);
      edit();
      refresh();
    };
  const view = $('timelineView');
  let zoom = 1;
  function zoomLimit() {
    return 2 ** Math.ceil(Math.log2(Math.max(8, Math.min(1024, duration / 2))));
  }
  function viewMetrics() {
    const track = $('imageTrack');
    const inset = track.getBoundingClientRect().left - $('timelineBody').getBoundingClientRect().left;
    const width = Math.max(1, view.clientWidth - inset);
    return { inset, width };
  }
  function visibleTimes() {
    const { width } = viewMetrics(), scale = width * zoom / duration;
    return [view.scrollLeft / scale, Math.min(duration, (view.scrollLeft + width) / scale)];
  }
  function showWindow() {
    const [a, b] = visibleTimes();
    $('windowTimes').textContent = fmt(a) + ' – ' + fmt(b);
  }
  function setZoom(value, leftTime) {
    zoom = clamp(value, 1, zoomLimit());
    const { inset, width } = viewMetrics();
    $('timelineBody').style.width = (inset + width * zoom) + 'px';
    const pxPerSecond = width * zoom / duration;
    view.scrollLeft = Number.isFinite(leftTime) ? leftTime * pxPerSecond : t * pxPerSecond - width / 2;
    $('zoomLevel').textContent = '×' + zoom;
    $('zoomOut').disabled = $('zoomAll').disabled = zoom === 1;
    $('zoomIn').disabled = zoom >= zoomLimit();
    showWindow();
  }
  $('zoomIn').onclick = () => setZoom(zoom * 2);
  $('zoomOut').onclick = () => setZoom(zoom / 2);
  $('zoomAll').onclick = () => setZoom(1);
  view.onscroll = showWindow;
  window.addEventListener('resize', () => setZoom(zoom));
  const draftKey = 'iclab.proto05.atelier.' + JSON.stringify([assetId, playableId]);
  let ready = false, lastDraft = '', handle = null, draftWriteBlocked = false;
  function snapshot() {
    return { format: 'iclab-atelier', version: 2, assetId, playableId, zoom, leftTime: visibleTimes()[0], duration, cursor: t, parts, selectedId: selected?.id ?? null,
      serial, step, magnet, preview, looping, undo: historyBack, redo: historyForward };
  }
  function validateProject(p) {
    const fail = () => {
      throw Error('Format de projet invalide ou incompatible.');
    };
    if (!p || p.format !== 'iclab-atelier' || p.version !== 2 || p.assetId !== assetId || p.playableId !== playableId || !Number.isFinite(p.duration) || p.duration <= 0 ||
      !Number.isFinite(p.cursor) || p.cursor < 0 || p.cursor > p.duration || ![.1, 1, 5].includes(p.step) ||
      !Number.isSafeInteger(p.serial) || p.serial < 0)
      fail();
    if (Math.abs(p.duration - duration) > .05)
      throw Error('La durée du média ne correspond plus au projet.');
    function check(items, id) {
      if (!Array.isArray(items))
        fail();
      const ids = new Set();
      for (const part of items) {
        if (!part || !['image', 'audio'].includes(part.type) || !Number.isSafeInteger(part.id) || part.id < 1 || part.id > p.serial ||
          ids.has(part.id) || !Number.isFinite(part.start) || !Number.isFinite(part.end) || part.start < 0 ||
          part.end <= part.start || part.end > p.duration + 1e-7)
          fail();
        ids.add(part.id);
        if (part.type === 'image' && !['x', 'y', 'w', 'h'].every(k => Number.isFinite(part[k]) && part[k] >= 0 && part[k] <= 1 + 1e-7))
          fail();
        if (part.type === 'image' && (part.w <= 0 || part.h <= 0 || part.x + part.w > 1 + 1e-7 || part.y + part.h > 1 + 1e-7))
          fail();
        part.end = Math.min(duration, part.end);
        if (part.start >= part.end)
          fail();
        if (part.type === 'audio' && !['Couper le son', 'Remplacer par un bip'].includes(part.effect))
          fail();
      }
      if (id != null && !ids.has(id))
        fail();
    }
    check(p.parts, p.selectedId);
    for (const stack of [p.undo, p.redo]) {
      if (!Array.isArray(stack))
        fail();
      for (const item of stack) {
        if (!Array.isArray(item) || typeof item[0] !== 'string')
          fail();
        const items = JSON.parse(item[0]);
        check(items, item[1]);
        item[0] = JSON.stringify(items);
      }
    }
    return p;
  }
  function autoSave() {
    if (!ready || draftWriteBlocked || gesture || drag || $('workspace').hidden)
      return;
    try {
      const data = JSON.stringify(snapshot());
      if (data === lastDraft)
        return;
      if ((localStorage.getItem(draftKey) || '') !== lastDraft) {
        draftWriteBlocked = true;
        $('autos').textContent = 'Cette version a été modifiée dans un autre onglet. Enregistrez votre projet avec Ctrl+S.';
        return;
      }
      localStorage.setItem(draftKey, data);
      lastDraft = data;
      $('autos').textContent = 'Reprise automatique à jour';
    }
    catch {
      $('autos').textContent = 'Reprise automatique indisponible · enregistrez avec Ctrl+S';
    }
  }
  function applyProject(p) {
    validateProject(p);
    pause();
    t = clamp(p.cursor, 0, duration);
    v.currentTime = t;
    parts = p.parts;
    serial = p.serial;
    selected = parts.find(part => part.id === p.selectedId) || null;
    historyBack.length = historyForward.length = 0;
    for (const item of p.undo)
      historyBack.push(item);
    for (const item of p.redo)
      historyForward.push(item);
    saved = JSON.stringify(parts);
    savedId = selected?.id;
    step = p.step;
    magnet = !!p.magnet;
    preview = !!p.preview;
    looping = !!p.looping;
    $('mag').setAttribute('aria-pressed', magnet);
    updateSteps();
    $('seek').max = duration;
    edit();
    refresh();
    setZoom(Number.isFinite(p.zoom) ? p.zoom : 1, p.leftTime);
    autoSave();
  }
  let saving = false;
  async function saveProject() {
    if (!ready || saving)
      return;
    saving = true;
    try {
      document.activeElement?.blur();
      const fileName = name.replace(/[\\/:*?"<>|]/g, '_') + '.iclab.json';
      const blob = new Blob([JSON.stringify(snapshot())], { type: 'application/json' });
      if (window.showSaveFilePicker) {
        try {
          const target = handle || await window.showSaveFilePicker({ suggestedName: fileName });
          const stream = await target.createWritable();
          await stream.write(blob);
          await stream.close();
          handle = target;
          $('fileStatus').textContent = 'Projet enregistré · ' + target.name;
          return;
        }
        catch (e) {
          if (e.name === 'AbortError')
            return;
          if (!['SecurityError', 'NotAllowedError'].includes(e.name))
            throw e;
        }
      }
      const link = document.createElement('a'), href = URL.createObjectURL(blob);
      link.href = href;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 60000);
      $('fileStatus').textContent = 'Copie du projet proposée au téléchargement';
    }
    catch (e) {
      alert('Enregistrement impossible : ' + e.message);
    }
    finally {
      saving = false;
    }
  }
  $('save').onclick = saveProject;
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!e.repeat)
        saveProject();
    }
  });
  $('openProject').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file)
      return;
    try {
      const p = readProject(JSON.parse(await file.text()));
      if (!confirm('Ouvrir ce projet à la place du montage affiché ?'))
        return;
      if (draftWriteBlocked) {
        try {
          lastDraft = localStorage.getItem(draftKey) || '';
          draftWriteBlocked = false;
        }
        catch {
        }
      }
      applyProject(p);
      handle = null;
      $('fileStatus').textContent = 'Projet ouvert · ' + file.name;
    }
    catch (err) {
      alert(err.message);
    }
  };
  function readProject(project) {
    if (project?.format !== 'iclab-atelier')
      throw Error('Format de projet inconnu.');
    if (project.version !== 1) {
      if (project.assetId !== assetId || project.playableId !== playableId)
        throw Error('Ce projet appartient à une autre vidéo ou version. Ouvrez sa fiche dans la vidéothèque.');
      return validateProject(project);
    }
    // La V12 autonome exprimait ses rectangles dans toute la scène 16:9.
    if (!project.media || project.media.name !== name || (Number.isSafeInteger(size) && project.media.size !== size))
      throw Error('Le fichier vidéo du projet V12 ne correspond pas à cette version.');
    const aspect = v.videoWidth / v.videoHeight;
    const width = Math.min(1, aspect / (16 / 9)), height = Math.min(1, (16 / 9) / aspect);
    function convert(parts) {
      for (const p of parts) {
        if (p.type !== 'image')
          continue;
        const x = (p.x - (1 - width) / 2) / width, y = (p.y - (1 - height) / 2) / height;
        const right = clamp(x + p.w / width, 0, 1), bottom = clamp(y + p.h / height, 0, 1);
        p.x = clamp(x, 0, 1);
        p.y = clamp(y, 0, 1);
        p.w = right - p.x;
        p.h = bottom - p.y;
        if (!(p.w > 0 && p.h > 0))
          throw Error('Un masque V12 est entièrement en dehors de l’image.');
      }
      return parts;
    }
    convert(project.parts);
    for (const stack of [project.undo, project.redo])
      for (const entry of stack)
        entry[0] = JSON.stringify(convert(JSON.parse(entry[0])));
    return validateProject({ ...project, version: 2, assetId, playableId });
  }
  v.onseeked = () => {
    t = v.currentTime;
    refresh();
  };
  const layoutKey = 'iclab-v12-disposition';
  let hasReaderPreference = false;
  function applyLayout() {
    const left = visibleTimes()[0];
    document.body.classList.toggle('wide', $('workspaceWidth').value === 'wide');
    document.body.dataset.panel = $('panelSide').value;
    document.body.style.setProperty('--reader-size', $('readerSize').value + '%');
    $('sizeLabel').textContent = $('readerSize').value + ' %';
    setZoom(zoom, left);
  }
  try {
    const prefs = JSON.parse(localStorage.getItem(layoutKey) || 'null');
    if (prefs) {
      if (['compact', 'wide'].includes(prefs.width))
        $('workspaceWidth').value = prefs.width;
      if (['left', 'right', 'below'].includes(prefs.panel))
        $('panelSide').value = prefs.panel;
      if (Number.isFinite(prefs.size)) {
        $('readerSize').value = clamp(prefs.size, 40, 100);
        hasReaderPreference = true;
      }
    }
  }
  catch {
  }
  sizePicture();
  applyLayout();
  for (const id of ['workspaceWidth', 'panelSide', 'readerSize']) {
    $(id).oninput = () => {
      applyLayout();
      try {
        localStorage.setItem(layoutKey, JSON.stringify({ width: $('workspaceWidth').value, panel: $('panelSide').value, size: +$('readerSize').value }));
      }
      catch {
      }
    };
  }
  $('layoutBox').addEventListener('toggle', () => {
    const box = $('layoutBox');
    if (!box.matches(':popover-open'))
      return;
    const r = $('layoutBtn').getBoundingClientRect();
    box.style.margin = '0';
    box.style.inset = 'auto';
    box.style.left = Math.max(4, Math.min(innerWidth - box.offsetWidth - 4, r.right - box.offsetWidth)) + 'px';
    box.style.top = Math.max(4, Math.min(innerHeight - box.offsetHeight - 4, r.bottom + 6)) + 'px';
  });
  setZoom(1);
  try {
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      applyProject(JSON.parse(draft));
      lastDraft = draft;
      $('autos').textContent = 'Montage récupéré automatiquement';
    }
  }
  catch {
    draftWriteBlocked = true;
    $('autos').textContent = 'Ce brouillon ne peut pas être repris. Ouvrez votre fichier projet ou enregistrez une copie avec Ctrl+S.';
  }
  ready = true;
  $('seek').max = duration;
  edit();
  refresh();
  if (!hasReaderPreference && innerWidth > 780) {
    // Au premier accès, laisser les deux pistes visibles sous le lecteur.
    const pictureHeight = $('stage').getBoundingClientRect().height;
    const overflow = Math.max(0, view.getBoundingClientRect().bottom + 48 - innerHeight);
    const percent = 100 * (1 - overflow / Math.max(1, pictureHeight));
    $('readerSize').value = clamp(Math.floor(percent / 5) * 5, 40, 100);
    applyLayout();
  }
  setInterval(autoSave, 1000);
  window.addEventListener('pagehide', autoSave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden)
      suspend();
  });
  function suspend() {
    if (playing)
      t = v.currentTime;
    pause();
    autoSave();
  }
  return { suspend, resume() {
      v.currentTime = t;
      sizePicture();
      refresh();
    } };
}
