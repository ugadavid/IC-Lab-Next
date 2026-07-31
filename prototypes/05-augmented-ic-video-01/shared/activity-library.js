(function initializeActivityLibrary(globalObject, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (globalObject) globalObject.Proto05ActivityLibrary = api;
  if (typeof document !== "undefined") {
    const run = () => api.boot();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }
})(typeof window !== "undefined" ? window : globalThis, function activityLibraryFactory() {
  "use strict";

  const VIEW_STORAGE_KEY = "proto05.activity-library.view";
  const state = {
    activities: [],
    folders: [],
    query: "",
    sort: "title-asc",
    status: "all",
    folder: "all",
    view: "grid"
  };

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr")
      .trim()
      .replace(/\s+/g, " ");
  }

  function knownIdentityValue(value) {
    return value?.state === "known" ? value.value : "";
  }

  function folderName(folders, folderId) {
    return folders.find(folder => folder.id === folderId)?.name || "";
  }

  function activitySearchText(activity, folders = []) {
    const identity = activity.pedagogicalIdentity || {};
    const summary = activity.pedagogicalIdentitySummary || {};
    return normalizeText([
      activity.title,
      activity.id,
      activity.description,
      activity.instruction,
      activity.pedagogicalQuestion,
      knownIdentityValue(identity.intention),
      knownIdentityValue(identity.audience),
      knownIdentityValue(identity.useContext),
      activity.video?.title,
      activity.video?.id,
      activity.video?.source,
      activity.video?.provider,
      summary.qualificationLevel,
      summary.completeness,
      summary.presence,
      folderName(folders, activity.folderId)
    ].filter(Boolean).join(" "));
  }

  function matchesStatus(activity, status) {
    const summary = activity.pedagogicalIdentitySummary || {};
    if (status === "all") return true;
    if (status === "draft") return String(activity.status || "").toLowerCase() === "draft";
    if (status === "complete") return summary.completeness === "complete";
    if (status === "incomplete") return summary.completeness !== "complete";
    return true;
  }

  function selectActivities(activities, folders, controls = {}) {
    const query = normalizeText(controls.query);
    const folder = controls.folder || "all";
    const status = controls.status || "all";
    const selected = activities.filter(activity => {
      if (folder === "unclassified" && activity.folderId) return false;
      if (folder !== "all" && folder !== "unclassified" && activity.folderId !== folder) return false;
      if (!matchesStatus(activity, status)) return false;
      return !query || activitySearchText(activity, folders).includes(query);
    });
    const direction = controls.sort === "title-desc" ? -1 : 1;
    return selected.sort((left, right) => direction * String(left.title || left.id).localeCompare(
      String(right.title || right.id),
      "fr",
      { sensitivity: "base", numeric: true }
    ));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function completenessLabel(activity) {
    const summary = activity.pedagogicalIdentitySummary || {};
    if (summary.completeness === "complete") return "Fiche complète";
    if (summary.presence === "absent") return "Fiche absente";
    return "Fiche incomplète";
  }

  function qualificationLabel(activity) {
    const labels = {
      "documented-by-author": "Documentée par l’auteur",
      "reviewed-by-expert": "Relue par un expert",
      experimented: "Expérimentée",
      "reused-by-third-party": "Reprise par un tiers",
      unqualified: "Non qualifiée"
    };
    return labels[activity.pedagogicalIdentitySummary?.qualificationLevel] || "Non qualifiée";
  }

  function activityContext(activity) {
    const identity = activity.pedagogicalIdentity || {};
    return knownIdentityValue(identity.intention)
      || knownIdentityValue(identity.useContext)
      || activity.description
      || "Aucune intention ou description renseignée.";
  }

  function folderOptions(activity) {
    const options = [
      `<option value=""${activity.folderId ? "" : " selected"}>Non classée</option>`,
      ...state.folders.map(folder => `<option value="${escapeHtml(folder.id)}"${activity.folderId === folder.id ? " selected" : ""}>${escapeHtml(folder.name)}</option>`)
    ];
    return options.join("");
  }

  function activityMarkup(activity) {
    const encoded = encodeURIComponent(activity.id);
    const folder = folderName(state.folders, activity.folderId);
    return `
      <article class="activity-card" data-activity-card="${escapeHtml(activity.id)}">
        <div class="activity-card__main">
          <div class="activity-card__heading">
            <div>
              <h3>${escapeHtml(activity.title || activity.id)}</h3>
              <p class="activity-card__id">${escapeHtml(activity.id)}</p>
            </div>
            <span class="activity-card__state ${activity.pedagogicalIdentitySummary?.completeness === "complete" ? "is-complete" : "is-incomplete"}">${escapeHtml(completenessLabel(activity))}</span>
          </div>
          <p class="activity-card__summary">${escapeHtml(activityContext(activity))}</p>
          <dl class="activity-card__facts">
            <div><dt>Vidéo</dt><dd>${escapeHtml(activity.video?.title || activity.video?.id || "Non renseignée")}</dd></div>
            <div><dt>Qualification</dt><dd>${escapeHtml(qualificationLabel(activity))}</dd></div>
            <div><dt>Dossier</dt><dd>${escapeHtml(folder || "Non classée")}</dd></div>
          </dl>
        </div>
        <div class="activity-card__classification">
          <label for="folder-${escapeHtml(activity.id)}">Dossier</label>
          <select id="folder-${escapeHtml(activity.id)}" data-folder-activity="${escapeHtml(activity.id)}">
            ${folderOptions(activity)}
          </select>
        </div>
        <div class="activity-card__actions">
          <a class="activity-primary-action" href="/teacher/edit/${encoded}">Ouvrir la fiche</a>
          <a href="/teacher/preview/${encoded}">Prévisualiser</a>
          <a href="/student/${encoded}">Vue étudiante</a>
          <div class="activity-more">
            <button type="button" class="activity-more__toggle" data-menu-toggle="${escapeHtml(activity.id)}" aria-expanded="false" aria-controls="activity-menu-${escapeHtml(activity.id)}" aria-label="Autres actions pour ${escapeHtml(activity.title || activity.id)}">…</button>
            <div class="activity-more__menu" id="activity-menu-${escapeHtml(activity.id)}" role="menu" hidden>
              <button type="button" role="menuitem" data-duplicate-id="${escapeHtml(activity.id)}">Dupliquer</button>
              <button type="button" role="menuitem" class="danger" data-delete-id="${escapeHtml(activity.id)}" data-delete-title="${escapeHtml(activity.title || activity.id)}">Supprimer</button>
            </div>
          </div>
          <span class="activity-card__status" role="status" aria-live="polite"></span>
        </div>
      </article>`;
  }

  function closeMenus(exceptId = null) {
    document.querySelectorAll(".activity-more__menu").forEach(menu => {
      if (menu.id === exceptId) return;
      menu.hidden = true;
      document.querySelector(`[aria-controls="${CSS.escape(menu.id)}"]`)?.setAttribute("aria-expanded", "false");
    });
  }

  function globalCounts() {
    const counts = { all: state.activities.length, unclassified: 0, folders: new Map(state.folders.map(folder => [folder.id, 0])) };
    for (const activity of state.activities) {
      if (!activity.folderId) counts.unclassified += 1;
      else counts.folders.set(activity.folderId, (counts.folders.get(activity.folderId) || 0) + 1);
    }
    return counts;
  }

  function selectedFolderLabel() {
    if (state.folder === "unclassified") return "Non classées";
    if (state.folder !== "all") return folderName(state.folders, state.folder) || "Dossier";
    return "Toutes les activités";
  }

  function renderFolders() {
    const counts = globalCounts();
    const navigation = document.getElementById("activityFolders");
    navigation.innerHTML = `
      <button type="button" class="folder-choice${state.folder === "all" ? " is-active" : ""}" data-folder-choice="all" aria-pressed="${state.folder === "all"}"><span>Toutes les activités</span><strong>${counts.all}</strong></button>
      <button type="button" class="folder-choice${state.folder === "unclassified" ? " is-active" : ""}" data-folder-choice="unclassified" aria-pressed="${state.folder === "unclassified"}"><span>Non classées</span><strong>${counts.unclassified}</strong></button>
      <div class="folder-section-title"><span>Dossiers</span><button type="button" id="addFolder" aria-label="Ajouter un dossier">+</button></div>
      <div class="folder-list">
        ${state.folders.length ? state.folders.map(folder => `
          <div class="folder-row">
            <button type="button" class="folder-choice${state.folder === folder.id ? " is-active" : ""}" data-folder-choice="${escapeHtml(folder.id)}" aria-pressed="${state.folder === folder.id}"><span>${escapeHtml(folder.name)}</span><strong>${counts.folders.get(folder.id) || 0}</strong></button>
            <details class="folder-more">
              <summary aria-label="Actions du dossier ${escapeHtml(folder.name)}">…</summary>
              <div>
                <button type="button" data-folder-rename="${escapeHtml(folder.id)}">Renommer</button>
                <button type="button" class="danger" data-folder-delete="${escapeHtml(folder.id)}">Supprimer</button>
              </div>
            </details>
          </div>`).join("") : '<p class="folder-empty">Aucun dossier créé.</p>'}
      </div>`;
    document.getElementById("addFolder").addEventListener("click", () => openFolderDialog());
  }

  function renderActivities() {
    const result = selectActivities(state.activities, state.folders, state);
    const target = document.getElementById("activityResults");
    target.dataset.view = state.view;
    document.getElementById("resultTitle").textContent = selectedFolderLabel();
    document.getElementById("resultCount").textContent = `${result.length} résultat${result.length > 1 ? "s" : ""}`;
    if (!result.length) {
      target.innerHTML = `<div class="activity-empty" role="status"><h3>Aucune activité trouvée</h3><p>Modifiez la recherche, le filtre ou le dossier sélectionné.</p><button type="button" id="resetFilters">Réinitialiser les filtres</button></div>`;
      document.getElementById("resetFilters").addEventListener("click", resetFilters);
      return;
    }
    target.innerHTML = result.map(activityMarkup).join("");
  }

  function render() {
    renderFolders();
    renderActivities();
    document.querySelectorAll("[data-view-choice]").forEach(button => {
      const active = button.dataset.viewChoice === state.view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "content-type": "application/json", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error || "Opération impossible."), { status: response.status, payload });
    return payload;
  }

  function setPageStatus(message, stateName = "") {
    const status = document.getElementById("libraryStatus");
    status.dataset.state = stateName;
    status.textContent = message;
  }

  async function load() {
    setPageStatus("Chargement de la bibliothèque…");
    try {
      const payload = await api("/api/proto05/activity-library");
      state.activities = payload.activities || [];
      state.folders = payload.folders || [];
      if (state.folder !== "all" && state.folder !== "unclassified" && !state.folders.some(folder => folder.id === state.folder)) state.folder = "all";
      setPageStatus("");
      render();
    } catch (error) {
      setPageStatus(`Impossible de charger la bibliothèque : ${error.message}`, "error");
      document.getElementById("activityResults").innerHTML = '<div class="activity-empty" role="alert">Bibliothèque indisponible.</div>';
    }
  }

  function resetFilters() {
    state.query = "";
    state.status = "all";
    state.folder = "all";
    document.getElementById("activitySearch").value = "";
    document.getElementById("activityStatusFilter").value = "all";
    document.getElementById("clearSearch").hidden = true;
    render();
  }

  function openFolderDialog(folder = null) {
    const dialog = document.getElementById("folderDialog");
    dialog.dataset.folderId = folder?.id || "";
    dialog.querySelector("h2").textContent = folder ? "Renommer le dossier" : "Ajouter un dossier";
    dialog.querySelector("button[type=submit]").textContent = folder ? "Renommer" : "Ajouter";
    const input = dialog.querySelector("input");
    input.value = folder?.name || "";
    dialog.showModal();
    input.focus();
  }

  async function saveFolder(event) {
    event.preventDefault();
    const dialog = event.currentTarget.closest("dialog");
    const folderId = dialog.dataset.folderId;
    const name = dialog.querySelector("input").value.trim();
    try {
      await api(folderId
        ? `/api/proto05/activity-library/folders/${encodeURIComponent(folderId)}`
        : "/api/proto05/activity-library/folders", {
        method: folderId ? "PATCH" : "POST",
        body: JSON.stringify({ name })
      });
      dialog.close();
      await load();
      setPageStatus(folderId ? "Dossier renommé." : "Dossier ajouté.", "success");
    } catch (error) {
      dialog.querySelector(".dialog-status").textContent = error.message;
    }
  }

  async function classifyActivity(select) {
    const activityId = select.dataset.folderActivity;
    select.disabled = true;
    try {
      await api(`/api/proto05/activity-library/activities/${encodeURIComponent(activityId)}/classification`, {
        method: "PUT",
        body: JSON.stringify({ folderId: select.value || null })
      });
      await load();
      setPageStatus(select.value ? "Activité classée." : "Activité retirée du dossier.", "success");
    } catch (error) {
      setPageStatus(error.message, "error");
      select.disabled = false;
    }
  }

  async function duplicateActivity(button) {
    const activityId = button.dataset.duplicateId;
    const activity = state.activities.find(item => item.id === activityId);
    const card = button.closest("[data-activity-card]");
    const status = card.querySelector(".activity-card__status");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Duplication en cours…";
    status.textContent = "Duplication en cours…";
    try {
      const payload = await api(`/api/proto05/activities/${encodeURIComponent(activityId)}/duplicate`, { method: "POST", headers: { "if-match": activity?.revisionToken } });
      if (!payload.activity?.id || payload.activity.id === activityId) throw new Error("Réponse de duplication invalide.");
      location.assign(`/teacher/author/${encodeURIComponent(payload.activity.id)}`);
    } catch (error) {
      status.textContent = `Échec : ${error.message}`;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Dupliquer";
    }
  }

  async function deleteActivity(button) {
    const activityId = button.dataset.deleteId;
    const activity = state.activities.find(item => item.id === activityId);
    const title = button.dataset.deleteTitle;
    const card = button.closest("[data-activity-card]");
    const status = card.querySelector(".activity-card__status");
    const confirmed = await Proto05TeacherDialogs.confirm({
      title: "Supprimer l’activité ?",
      message: `L’activité « ${title} » sera définitivement supprimée.`,
      details: [
        `Identifiant : ${activityId}`,
        "Une sauvegarde .bak sera créée avant la suppression."
      ],
      confirmLabel: "Supprimer l’activité",
      destructive: true,
      trigger: button
    });
    if (!confirmed) {
      status.textContent = "Suppression annulée. Aucune donnée modifiée.";
      return;
    }
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Suppression en cours…";
    status.textContent = "Suppression atomique en cours…";
    try {
      const payload = await api(`/api/proto05/activities/${encodeURIComponent(activityId)}`, { method: "DELETE", headers: { "if-match": activity?.revisionToken } });
      if (payload.deleted?.id !== activityId) throw new Error("Réponse de suppression invalide.");
      await load();
      setPageStatus(`Activité supprimée : « ${title} ».`, "success");
    } catch (error) {
      status.textContent = `Échec : ${error.message}`;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Supprimer";
    }
  }

  function installEvents() {
    const search = document.getElementById("activitySearch");
    const clear = document.getElementById("clearSearch");
    search.addEventListener("input", () => {
      state.query = search.value;
      clear.hidden = !search.value;
      renderActivities();
    });
    clear.addEventListener("click", () => {
      search.value = "";
      state.query = "";
      clear.hidden = true;
      search.focus();
      renderActivities();
    });
    document.getElementById("activitySort").addEventListener("change", event => {
      state.sort = event.target.value;
      renderActivities();
    });
    document.getElementById("activityStatusFilter").addEventListener("change", event => {
      state.status = event.target.value;
      renderActivities();
    });
    document.querySelector("[data-view-controls]").addEventListener("click", event => {
      const button = event.target.closest("[data-view-choice]");
      if (!button) return;
      state.view = button.dataset.viewChoice;
      try { localStorage.setItem(VIEW_STORAGE_KEY, state.view); } catch {}
      render();
    });
    document.getElementById("activityFolders").addEventListener("click", async event => {
      const choice = event.target.closest("[data-folder-choice]");
      if (choice) {
        state.folder = choice.dataset.folderChoice;
        render();
        return;
      }
      const rename = event.target.closest("[data-folder-rename]");
      if (rename) {
        const folder = state.folders.find(item => item.id === rename.dataset.folderRename);
        if (folder) openFolderDialog(folder);
        return;
      }
      const remove = event.target.closest("[data-folder-delete]");
      if (!remove) return;
      const folder = state.folders.find(item => item.id === remove.dataset.folderDelete);
      if (!folder) return;
      const confirmed = await Proto05TeacherDialogs.confirm({
        title: "Supprimer le dossier ?",
        message: `Le dossier « ${folder.name} » sera supprimé.`,
        details: [
          "Ses activités redeviendront non classées.",
          "Aucune activité ne sera supprimée."
        ],
        confirmLabel: "Supprimer le dossier",
        destructive: true,
        trigger: remove
      });
      if (!confirmed) return;
      try {
        await api(`/api/proto05/activity-library/folders/${encodeURIComponent(folder.id)}`, { method: "DELETE" });
        if (state.folder === folder.id) state.folder = "all";
        await load();
        setPageStatus("Dossier supprimé ; ses activités sont non classées.", "success");
      } catch (error) {
        setPageStatus(error.message, "error");
      }
    });
    document.getElementById("activityResults").addEventListener("change", event => {
      const select = event.target.closest("[data-folder-activity]");
      if (select) classifyActivity(select);
    });
    document.getElementById("activityResults").addEventListener("click", event => {
      const toggle = event.target.closest("[data-menu-toggle]");
      if (toggle) {
        const menu = document.getElementById(toggle.getAttribute("aria-controls"));
        const open = menu.hidden;
        closeMenus(open ? menu.id : null);
        menu.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        if (open) menu.querySelector("button")?.focus();
        return;
      }
      const duplicate = event.target.closest("[data-duplicate-id]");
      if (duplicate) duplicateActivity(duplicate);
      const remove = event.target.closest("[data-delete-id]");
      if (remove) deleteActivity(remove);
    });
    document.getElementById("folderForm").addEventListener("submit", saveFolder);
    document.getElementById("cancelFolder").addEventListener("click", () => document.getElementById("folderDialog").close());
    document.addEventListener("click", event => {
      if (!event.target.closest(".activity-more")) closeMenus();
      if (!event.target.closest(".folder-more")) document.querySelectorAll(".folder-more[open]").forEach(details => details.removeAttribute("open"));
    });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      closeMenus();
      document.querySelectorAll(".folder-more[open]").forEach(details => details.removeAttribute("open"));
    });
  }

  function boot() {
    if (!document.getElementById("activityResults")) return;
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (["grid", "list"].includes(stored)) state.view = stored;
    } catch {}
    installEvents();
    load();
  }

  return {
    VIEW_STORAGE_KEY,
    normalizeText,
    activitySearchText,
    matchesStatus,
    selectActivities,
    boot
  };
});
