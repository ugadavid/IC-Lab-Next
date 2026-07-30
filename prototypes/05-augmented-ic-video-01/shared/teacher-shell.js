(function initializeTeacherShell(globalObject, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (globalObject) globalObject.Proto05TeacherShell = api;
  if (typeof document !== "undefined" && typeof location !== "undefined") api.boot();
})(typeof window !== "undefined" ? window : globalThis, function teacherShellFactory() {
  "use strict";

  const IC_HUB_URL = "http://127.0.0.1:8790/";
  const STYLE_PATH = "/shared/teacher-shell.css";

  function routeContext(pathname) {
    const path = String(pathname || "").replace(/\/+$/, "") || "/";
    if (path === "/teacher") return { route: "library", general: "library" };
    if (path === "/teacher/create") return { route: "create", general: "library" };
    if (path === "/teacher/videos") return { route: "videos", general: "videos" };
    if (/^\/teacher\/videos\/[^/]+$/.test(path)) return { route: "video-detail", general: "videos" };
    if (/^\/teacher\/anonymization\/[^/]+$/.test(path)) return { route: "anonymization", general: "videos" };
    const activityMatch = path.match(/^\/teacher\/(edit|guided|author|preview)\/([^/]+)$/);
    if (!activityMatch) return null;
    return {
      route: activityMatch[1],
      general: "library",
      activityId: decodeURIComponent(activityMatch[2]),
      activityPage: activityMatch[1]
    };
  }

  function generalItems(active) {
    return [
      { id: "library", label: "Bibliothèque", href: "/teacher", active: active === "library" },
      { id: "videos", label: "Vidéothèque", href: "/teacher/videos", active: active === "videos" }
    ];
  }

  function hubItem(hubUrl = IC_HUB_URL) {
    return { id: "hub", label: "IC-Hub", href: hubUrl, active: false, hub: true };
  }

  function activityItems(activityId, active) {
    const encoded = encodeURIComponent(activityId);
    return [
      { id: "edit", label: "Fiche", href: `/teacher/edit/${encoded}`, active: active === "edit" },
      { id: "guided", label: "Guidé", href: `/teacher/guided/${encoded}`, active: active === "guided" },
      { id: "author", label: "Auteur expert", href: `/teacher/author/${encoded}`, active: active === "author" },
      { id: "preview", label: "Prévisualisation", href: `/teacher/preview/${encoded}`, active: active === "preview" }
    ];
  }

  function activityStatusLabel(status) {
    const labels = {
      draft: "Brouillon",
      documented: "Documentée",
      qualified: "Qualifiée",
      published: "Publiée",
      archived: "Archivée"
    };
    return labels[String(status || "").toLowerCase()] || (status ? String(status) : "Brouillon");
  }

  function ensureStylesheet() {
    if (document.querySelector(`link[href="${STYLE_PATH}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLE_PATH;
    link.dataset.teacherShellStyle = "true";
    document.head.append(link);
  }

  function linkElement(item, context = false) {
    const anchor = document.createElement("a");
    anchor.href = item.href;
    anchor.className = context ? "teacher-shell__context-link" : "teacher-shell__link";
    if (item.active) anchor.setAttribute("aria-current", "page");
    const label = document.createElement("span");
    label.textContent = item.label;
    anchor.append(label);
    return anchor;
  }

  function createGeneralRow(context, hubUrl) {
    const row = document.createElement("div");
    row.className = "teacher-shell__general";

    const brand = document.createElement("a");
    brand.className = "teacher-shell__brand";
    brand.href = "/teacher";
    brand.setAttribute("aria-label", "Vidéo augmentée — Bibliothèque des activités");
    const mark = document.createElement("span");
    mark.className = "teacher-shell__brand-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "P5";
    const name = document.createElement("span");
    name.textContent = "Proto05";
    brand.append(mark, name);

    const nav = document.createElement("nav");
    nav.className = "teacher-shell__general-nav";
    nav.setAttribute("aria-label", "Navigation générale de Proto05");
    generalItems(context.general).forEach(item => nav.append(linkElement(item)));

    const hub = linkElement(hubItem(hubUrl));
    hub.classList.add("teacher-shell__hub");
    hub.setAttribute("aria-label", "Ouvrir IC-Hub");
    row.append(brand, nav, hub);
    return row;
  }

  function createContextRow(context) {
    const wrapper = document.createElement("div");
    wrapper.className = "teacher-shell__context";
    const row = document.createElement("div");
    row.className = "teacher-shell__context-inner";

    const activity = document.createElement("div");
    activity.className = "teacher-shell__activity";
    const eyebrow = document.createElement("span");
    eyebrow.className = "teacher-shell__eyebrow";
    eyebrow.textContent = "Activité courante";
    const line = document.createElement("div");
    line.className = "teacher-shell__activity-line";
    const title = document.createElement("span");
    title.className = "teacher-shell__activity-title";
    title.dataset.teacherActivityTitle = "";
    title.textContent = context.activityId;
    title.title = context.activityId;
    const status = document.createElement("span");
    status.className = "teacher-shell__activity-status";
    status.dataset.teacherActivityStatus = "";
    status.textContent = "Chargement…";
    line.append(title, status);
    activity.append(eyebrow, line);

    const nav = document.createElement("nav");
    nav.className = "teacher-shell__context-nav";
    nav.setAttribute("aria-label", "Espaces de travail de l’activité");
    activityItems(context.activityId, context.activityPage).forEach(item => nav.append(linkElement(item, true)));

    const actions = document.createElement("div");
    actions.className = "teacher-shell__actions";
    actions.dataset.teacherShellActions = "";
    row.append(activity, nav, actions);
    wrapper.append(row);
    return wrapper;
  }

  function saveStateFromMessage(message) {
    const normalized = String(message || "").toLocaleLowerCase("fr");
    if (/échec|erreur|refus|indisponible|impossible/.test(normalized)) return "error";
    if (/enregistrement en cours|enregistrement…|sauvegarde en cours/.test(normalized)) return "saving";
    if (/non enregistr/.test(normalized)) return "dirty";
    if (/enregistré|enregistrées|sauvegardé|sauvegardée/.test(normalized)) return "saved";
    if (/enregistrez|sauvegardez|ajouté au brouillon|modifi|supprim/.test(normalized)) return "dirty";
    return null;
  }

  function saveStateLabel(state) {
    return {
      dirty: "Modifications non enregistrées",
      saving: "Enregistrement…",
      saved: "Enregistré",
      error: "Échec de l’enregistrement"
    }[state] || "Enregistré";
  }

  function transitionSaveState(current, event) {
    const transitions = {
      "local-change": "dirty",
      "save-start": "saving",
      "save-success": "saved",
      "save-error": "error"
    };
    return transitions[event] || current || "saved";
  }

  function messageAfterLocalChange(message) {
    return saveStateFromMessage(message) === "saved"
      ? "Modifications non enregistrées."
      : message;
  }

  function installSaveMirror(context) {
    if (!["edit", "guided", "author"].includes(context.route)) return;
    const source = document.getElementById("save");
    const mount = document.querySelector("[data-teacher-shell-actions]");
    if (!source || !mount) return;

    const origin = source.closest(".actions");
    origin?.classList.add("teacher-shell-action-origin");
    source.classList.add("teacher-shell-source-save");
    source.tabIndex = -1;
    source.setAttribute("aria-hidden", "true");

    const status = document.createElement("span");
    status.className = "teacher-shell__save-status";
    status.dataset.state = "saved";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = saveStateLabel("saved");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "teacher-shell__save";
    button.dataset.teacherShellSave = "";
    button.textContent = "Enregistrer";

    function setState(state, message) {
      const resolved = state || "saved";
      status.dataset.state = resolved;
      status.textContent = message || saveStateLabel(resolved);
    }

    function syncButton() {
      button.disabled = source.disabled;
      button.setAttribute("aria-busy", source.getAttribute("aria-busy") || "false");
    }

    button.addEventListener("click", () => {
      setState(transitionSaveState(status.dataset.state, "save-start"));
      if (context.route === "edit" && source.form) source.form.requestSubmit(source);
      else source.click();
      syncButton();
    });

    const sourceObserver = new MutationObserver(syncButton);
    sourceObserver.observe(source, { attributes: true, attributeFilter: ["disabled", "aria-busy"] });

    const sourceStatus = document.getElementById("status");
    if (sourceStatus) {
      const syncStatus = () => {
        const state = sourceStatus.dataset.state === "saving"
          ? "saving"
          : saveStateFromMessage(sourceStatus.textContent);
        if (state) setState(state);
      };
      new MutationObserver(syncStatus).observe(sourceStatus, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-state", "class"]
      });
      syncStatus();
    }

    const main = document.querySelector("main");
    if (main) {
      const markDirty = event => {
        if (event.target.closest(".teacher-shell")) return;
        setState(transitionSaveState(status.dataset.state, "local-change"));
        if (sourceStatus) {
          const nextMessage = messageAfterLocalChange(sourceStatus.textContent);
          if (nextMessage === sourceStatus.textContent) return;
          sourceStatus.dataset.state = "dirty";
          sourceStatus.textContent = nextMessage;
        }
      };
      main.addEventListener("input", markDirty, true);
      main.addEventListener("change", markDirty, true);
    }

    syncButton();
    mount.append(status, button);
    api.setSaveState = setState;
  }

  function updateActivity(activity) {
    if (!activity) return;
    const title = document.querySelector("[data-teacher-activity-title]");
    const status = document.querySelector("[data-teacher-activity-status]");
    if (title) {
      title.textContent = activity.title || activity.id || "Activité sans titre";
      title.title = title.textContent;
    }
    if (status) status.textContent = activityStatusLabel(activity.status);
  }

  async function loadActivity(context) {
    if (!context.activityId) return;
    try {
      const response = await fetch(`/api/proto05/activities/${encodeURIComponent(context.activityId)}`);
      const payload = await response.json();
      if (!response.ok || !payload.activity) throw new Error(payload.error || "Activité indisponible");
      updateActivity(payload.activity);
    } catch {
      const status = document.querySelector("[data-teacher-activity-status]");
      if (status) status.textContent = "Indisponible";
    }
  }

  function mount(context) {
    if (document.querySelector("[data-teacher-shell]")) return;
    ensureStylesheet();
    const isPreview = context.route === "preview";
    document.body.classList.add(isPreview ? "proto05-teacher-preview-shell" : "proto05-teacher-ui");
    document.body.dataset.teacherRoute = context.route;

    const main = document.querySelector("main");
    if (main && !main.id) main.id = "teacher-main";
    const skip = document.createElement("a");
    skip.className = "teacher-skip-link";
    skip.href = main ? `#${main.id}` : "#";
    skip.textContent = "Aller au contenu";

    const header = document.createElement("header");
    header.className = "teacher-shell";
    header.dataset.teacherShell = "";
    header.append(createGeneralRow(context, IC_HUB_URL));
    if (context.activityId) header.append(createContextRow(context));
    document.body.prepend(skip, header);

    installSaveMirror(context);
    loadActivity(context);
    document.dispatchEvent(new CustomEvent("proto05:teacher-shell-ready", { detail: context }));
  }

  function boot() {
    const context = routeContext(location.pathname);
    if (!context) return;
    if (context.route === "preview" && window.self !== window.top) return;
    const run = () => mount(context);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }

  const api = {
    IC_HUB_URL,
    STYLE_PATH,
    routeContext,
    generalItems,
    hubItem,
    activityItems,
    activityStatusLabel,
    saveStateFromMessage,
    transitionSaveState,
    messageAfterLocalChange,
    updateActivity,
    setSaveState() {},
    boot
  };
  return api;
});
