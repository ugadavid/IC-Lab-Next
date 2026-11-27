'use strict';

function validateWorkshopProject(p, assetId, playableId, duration = p?.duration) {
  const fail = () => {
    throw Error('Format de projet invalide ou incompatible.');
  };
  if (!p || p.format !== 'iclab-atelier' || p.version !== 2 || p.assetId !== assetId || p.playableId !== playableId || !Number.isFinite(p.duration) || p.duration <= 0 ||
    !Number.isFinite(p.cursor) || p.cursor < 0 || p.cursor > p.duration || ![.1, 1, 5].includes(p.step) ||
    !Number.isSafeInteger(p.serial) || p.serial < 0)
    fail();
  if (Math.abs(p.duration - duration) > .05)
    throw Error('La durée du média ne correspond plus au projet.');
  if (typeof p.magnet !== 'boolean' || typeof p.preview !== 'boolean' || typeof p.looping !== 'boolean' ||
      !Number.isFinite(p.zoom) || p.zoom < 1 || !Number.isFinite(p.leftTime) || p.leftTime < 0) fail();
  const partFields = new Set(['id', 'type', 'start', 'end', 'x', 'y', 'w', 'h', 'effect']);
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
      for (const key of Object.keys(part)) if (!partFields.has(key)) delete part[key];
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
      if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'string')
        fail();
      const items = JSON.parse(item[0]);
      check(items, item[1]);
      item[0] = JSON.stringify(items);
    }
  }
  const fields = ['format', 'version', 'assetId', 'playableId', 'zoom', 'leftTime', 'duration', 'cursor',
    'parts', 'selectedId', 'serial', 'step', 'magnet', 'preview', 'looping', 'undo', 'redo'];
  return Object.fromEntries(fields.map(key => [key, p[key]]));
}

if (typeof module !== 'undefined' && module.exports) module.exports = {validateWorkshopProject};
