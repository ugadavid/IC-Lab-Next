(function initializeGuidedOverlays() {
  "use strict";

  function ensure() {
    if ($("#guidedOverlays")) return;
    const section = document.createElement("section");
    section.className = "card wide";
    section.innerHTML = "<h2>Affichage dans la vidéo</h2><div id=\"guidedOverlays\" class=\"list\"></div><button id=\"guidedAddOverlay\" type=\"button\">Créer un overlay autonome</button>";
    $("#phenomena").closest(".card").after(section);
  }

  const oldLists = renderLists;
  renderLists = function renderListsWithOverlays() {
    oldLists();
    ensure();
    const box = $("#guidedOverlays");
    box.innerHTML = (state.activity.overlays || []).map(item => (
      `<div class="item" data-guided-overlay-id="${esc(item.id)}"><span>${esc(item.title || "Overlay sans titre")}</span><span class="muted">${mm(item.startMs)} — ${mm(item.endMs)}</span></div>`
    )).join("") || "<p class=\"muted\">Aucun overlay.</p>";
    box.querySelectorAll("[data-guided-overlay-id]").forEach(node => {
      node.onclick = () => select(
        (state.activity.overlays || []).find(item => item.id === node.dataset.guidedOverlayId),
        "overlay"
      );
    });
  };

  const oldFind = find;
  find = function findWithOverlays(type, id) {
    if (type === "overlay") {
      return (state.activity.overlays || []).find(item => item.id === id);
    }
    return oldFind(type, id);
  };

  const oldSelect = select;
  select = function selectWithOverlays(item, type) {
    if (type === "overlay") {
      if (!item) return;
      selected = { item, type };
      video.currentTime = item.startMs / 1000;
      $("#summary").textContent = `Affichage dans la vidéo · ${mm(item.startMs)} — ${mm(item.endMs)}`;
      renderEditor();
      return;
    }
    oldSelect(item, type);
  };

  const oldEditor = renderEditor;
  renderEditor = function renderEditorWithOverlays() {
    if (selected?.type === "overlay") {
      const item = selected.item;
      const activity = state.activity;
      $("#editor").innerHTML = `<div class="form"><strong>Affichage dans la vidéo</strong><label>Annotation liée (optionnelle)<select id="goAnnotation"><option value="">Aucune</option>${(activity.teacherAnnotations || []).map(annotation => `<option value="${esc(annotation.id)}" ${annotation.id === item.annotationId ? "selected" : ""}>${esc(annotation.note || annotation.id)}</option>`).join("")}</select></label><label>Début (ms)<input id="goStart" type="number" min="0" value="${item.startMs}"></label><label>Fin (ms)<input id="goEnd" type="number" min="0" value="${item.endMs}"></label><label class="fullrow">Titre<textarea id="goTitle">${esc(item.title || "")}</textarea></label><label class="fullrow">Texte<textarea id="goText">${esc(item.text || "")}</textarea></label><label class="fullrow">Couches<select id="goLayers" multiple size="4">${(activity.layers || []).map(layer => `<option value="${esc(layer.id)}" ${(item.layerIds || []).includes(layer.id) ? "selected" : ""}>${esc(layer.label)}</option>`).join("")}</select></label></div><button id="goApply" type="button">Appliquer</button><button id="goRemove" class="secondary" type="button">Supprimer l’overlay</button>`;
      $("#goApply").onclick = () => {
        const startMs = Number($("#goStart").value);
        const endMs = Number($("#goEnd").value);
        const maximum = Number(activity.video.durationMs);
        if (!Number.isInteger(startMs) || !Number.isInteger(endMs) || startMs < 0
          || endMs <= startMs || (maximum > 0 && endMs > maximum)) {
          $("#status").textContent = "Temps d’overlay invalides.";
          return;
        }
        item.annotationId = $("#goAnnotation").value || undefined;
        item.startMs = startMs;
        item.endMs = endMs;
        item.title = $("#goTitle").value;
        item.text = $("#goText").value;
        item.layerIds = [...$("#goLayers").selectedOptions].map(option => option.value);
        $("#status").textContent = "Overlay modifié. Enregistrez pour confirmer.";
        render();
      };
      $("#goRemove").onclick = () => {
        state.activity.overlays = state.activity.overlays.filter(overlay => overlay.id !== item.id);
        resetGuidedSelection("Overlay supprimé.");
        markGuidedDirty("Overlay supprimé. Enregistrez pour confirmer.");
        render();
      };
      return;
    }

    if (selected?.type === "annotation") {
      const item = selected.item;
      $("#editor").innerHTML = `<div class="form"><strong>Annotation pédagogique</strong><label>Segment<select id="gaSegment">${(state.activity.segments || []).map(segment => `<option value="${esc(segment.id)}" ${segment.id === item.segmentId ? "selected" : ""}>${esc(segment.text || segment.id)}</option>`).join("")}</select></label><label class="fullrow">Texte<textarea id="gaNote">${esc(item.note || "")}</textarea></label><label class="fullrow">Question pédagogique<textarea id="gaQuestion">${esc(item.pedagogicalQuestion || "")}</textarea></label></div><button id="gaApply" type="button">Appliquer</button><button id="gaRemove" class="secondary" type="button">Supprimer</button>`;
      $("#gaApply").onclick = () => {
        item.segmentId = $("#gaSegment").value;
        item.note = $("#gaNote").value;
        item.pedagogicalQuestion = $("#gaQuestion").value;
        delete item.overlay;
        $("#status").textContent = "Annotation modifiée. Enregistrez pour confirmer.";
        render();
      };
      $("#gaRemove").onclick = () => {
        state.activity.teacherAnnotations = state.activity.teacherAnnotations
          .filter(annotation => annotation.id !== item.id);
        resetGuidedSelection("Annotation supprimée.");
        markGuidedDirty("Annotation supprimée. Enregistrez pour confirmer.");
        render();
      };
      return;
    }
    oldEditor();
  };

  document.addEventListener("click", event => {
    if (event.target.id !== "guidedAddOverlay") return;
    const startMs = Math.round(video.currentTime * 1000);
    const item = {
      id: `overlay-guided-${Date.now()}`,
      startMs,
      endMs: startMs + 1000,
      title: "",
      text: "",
      layerIds: []
    };
    state.activity.overlays.push(item);
    select(item, "overlay");
    $("#status").textContent = "Overlay ajouté. Enregistrez pour confirmer.";
  });

  $("#save").onclick = async () => {
    if (state.relationIssue) {
      $("#status").textContent = state.relationIssue;
      return;
    }
    syncDerivedPhenomenonIds();
    const payload = Proto05GuidedAuthoring.buildAuthoringPayload(state.activity);
    const response = await fetch(`/api/proto05/activities/${encodeURIComponent(id)}/authoring`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    $("#status").textContent = response.ok
      ? "Modifications enregistrées."
      : (body.error || "Enregistrement impossible.");
    if (response.ok) {
      state.activity = body.activity;
      render();
    }
  };

  if (state.activity) render();
})();
