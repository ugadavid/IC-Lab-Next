'use strict';

function createWorkshopProgress() {
  const byId = id => document.getElementById(id);
  const panel = byId('exportPanel'), title = byId('taskTitle'), label = byId('exportMessage');
  const number = byId('taskPercent'), meter = byId('taskMeter');
  let owner = null;
  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }
  function hide(key) {
    if (owner !== key) return;
    if (!panel.hidden) panel.hidden = true;
    owner = null;
  }
  function show(key, name, message, percent = null, terminal = false) {
    owner = key;
    setText(title,name);
    setText(label,message);
    const known = Number.isFinite(percent);
    if (meter.hidden === known) meter.hidden = !known;
    if (known) {
      const n = String(Math.max(0,Math.min(100, Math.floor(percent))));
      setText(number,n);
      if (meter.getAttribute('aria-valuenow') !== n) meter.setAttribute('aria-valuenow',n);
    }
    const close = byId('closeProgress');
    if (close.hidden === terminal) close.hidden = !terminal;
    if (panel.hidden) panel.hidden = false;
  }
  byId('closeProgress').onclick = () => {
    const key = owner;
    hide(key);
    if (key === 'export') byId('exportMp4').focus({preventScroll:true});
  };
  return {show, hide};
}

const workshopProgress = createWorkshopProgress();
