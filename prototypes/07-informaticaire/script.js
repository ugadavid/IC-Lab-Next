const state = {
  query: "",
  filter: filters[0],
  focusItemId: "",
};

const priorityShareIds = ["galanet", "miriadi", "romanofonia-cinema", "repli4c", "eurom", "portail-ple-katia", "phip", "elan", "speechmatics", "corpus-videos"];

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeSearchText = (value) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const slugStatus = (status) => `status-${normalize(status).replace(/\s+/g, "-")}`;

const itemById = () => new Map(items.map((item) => [item.id, item]));

const matchesFilter = (item) => {
  if (state.filter.mode === "all") return true;
  if (state.filter.mode === "audience") return (item.audience || []).some((audience) => normalize(audience) === normalize(state.filter.value));
  return normalize(item[state.filter.mode]) === normalize(state.filter.value);
};

const itemSearchText = (item) =>
  [
    item.title,
    item.type,
    item.status,
    item.period,
    item.description,
    ...(item.aliases || []),
    item.actorKind,
    ...(item.domains || []),
    ...(item.affiliations || []),
    ...(item.mentionedProjects || []),
    ...(item.mentionedResources || []),
    ...(item.citedBy || []),
    ...(item.tags || []),
    ...(item.actors || []),
    ...(item.interviews || []),
    ...(item.relatedItems || []),
    ...((item.relations || []).flatMap((relation) => [relation.target, relation.type, relation.note])),
    ...((item.evidence || []).flatMap((entry) => [entry.interview, entry.note])),
    ...(item.risks || []),
    ...(item.todo || []),
    item.confidence,
    item.sourceStatus,
    item.uncertaintyNote,
    item.communityUse,
    item.reuseHint,
    item.contributionHint,
    ...(item.audience || []),
    item.licenseStatus,
    item.accessStatus,
    item.rightsNote,
    item.communityPriority,
    item.communityPriorityReason,
    item.recovery?.priority,
    item.recovery?.status,
    item.recovery?.nextAction,
    item.recovery?.responsible,
    ...((item.externalLinks || []).flatMap((link) => [link.label, link.url, link.kind, link.status, link.note])),
  ].join(" ");

const matchesSearchText = (haystack, query) => {
  const normalizedHaystack = normalizeSearchText(haystack);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const compactHaystack = normalizedHaystack.replace(/\s+/g, "");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  return normalizedHaystack.includes(normalizedQuery) || compactHaystack.includes(compactQuery);
};

const matchesQuery = (item) => matchesSearchText(itemSearchText(item), state.query);

const searchRank = (item) => {
  const normalizedQuery = normalizeSearchText(state.query);
  if (!normalizedQuery) return 0;
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const title = normalizeSearchText(item.title);
  const compactTitle = title.replace(/\s+/g, "");
  const aliases = (item.aliases || []).map((alias) => normalizeSearchText(alias));
  if (title === normalizedQuery || compactTitle === compactQuery) return 0;
  if (aliases.some((alias) => alias === normalizedQuery || alias.replace(/\s+/g, "") === compactQuery)) return 1;
  if (title.includes(normalizedQuery) || compactTitle.includes(compactQuery)) return 2;
  if (aliases.some((alias) => alias.includes(normalizedQuery) || alias.replace(/\s+/g, "").includes(compactQuery))) return 3;
  return 4;
};

const emptySearchSuggestion = () => {
  const normalizedQuery = normalizeSearchText(state.query);
  if (normalizedQuery.includes("eurom")) {
    return `<p><strong>Suggestion :</strong> essayez la fiche EuRom / EuRom Web.</p>`;
  }
  return "";
};

const pluralize = (count) => `${count} fiche${count > 1 ? "s" : ""}`;

const pill = (text, className = "") => `<span class="pill ${className}">${text}</span>`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const listOrFallback = (values, fallback = "à compléter") => (values?.length ? values.join(", ") : fallback);

const isActorItem = (item) => ["acteur", "acteur collectif", "institution"].includes(item.type);

const actorStatusPills = (item) => {
  if (!isActorItem(item)) return "";
  const labels = [];
  if (item.actorKind?.includes("interviewée et citée")) labels.push("Interviewé + cité");
  else if (item.actorKind?.includes("interviewée")) labels.push("Interviewé");
  else if (item.actorKind?.includes("citée")) labels.push("Cité");
  if (item.actorKind?.includes("institution")) labels.push("Collectif");
  if (item.confidence === "à vérifier" || item.sourceStatus?.includes("vérifier") || item.uncertain) labels.push("À vérifier");
  return labels.map((label) => pill(label)).join("");
};

const externalLinkBadge = (item) => {
  const links = item.externalLinks || [];
  if (!links.length) return pill("Sans lien");
  if (links.some((link) => link.status === "accessible")) return pill("Lien vérifié");
  return pill("Lien à vérifier");
};

const renderActorCardDetails = (item) => {
  if (!isActorItem(item)) return "";
  return `
    <div class="detail-group">
      <strong>Rôle / domaine</strong>
      <span>${listOrFallback(item.domains, item.period || "à compléter")}</span>
    </div>
    <div class="detail-group">
      <strong>Projets cités</strong>
      <span>${listOrFallback(item.mentionedProjects, listOrFallback(item.tags, "à compléter"))}</span>
    </div>
  `;
};

const renderActorDetail = (item) => {
  if (!isActorItem(item)) return "";
  return `
    <div class="detail-card">
      <div class="detail-group"><strong>Registre acteur</strong><span>${item.actorKind || "acteur à documenter"}</span></div>
      <div class="mini-list">${actorStatusPills(item)}</div>
      <div class="detail-group"><strong>Domaines</strong><span>${listOrFallback(item.domains)}</span></div>
      <div class="detail-group"><strong>Affiliations</strong><span>${listOrFallback(item.affiliations)}</span></div>
      <div class="detail-group"><strong>Projets mentionnés</strong><span>${listOrFallback(item.mentionedProjects)}</span></div>
      <div class="detail-group"><strong>Ressources mentionnées</strong><span>${listOrFallback(item.mentionedResources)}</span></div>
      <div class="detail-group"><strong>Cité par</strong><span>${listOrFallback(item.citedBy)}</span></div>
    </div>
  `;
};

const renderRelatedLinks = (item) => {
  const lookup = itemById();
  const related = (item.relatedItems || []).map((id) => lookup.get(id)).filter(Boolean);
  if (!related.length) return "";
  return `
    <div class="detail-group">
      <strong>Lié à</strong>
      <div class="mini-list">
        ${related
          .map((relatedItem) => `<button class="link-button" type="button" data-related-id="${relatedItem.id}">${relatedItem.title}</button>`)
          .join("")}
      </div>
    </div>
  `;
};

const renderEvidence = (item) => {
  if (!item.evidence?.length) return "";
  return `
    <div class="detail-group">
      <strong>Traçabilité</strong>
      <ul class="evidence-list">
        ${item.evidence
          .slice(0, 3)
          .map((entry) => `<li><b>${entry.interview}</b> - ${entry.note}</li>`)
          .join("")}
      </ul>
    </div>
  `;
};

const renderRelations = (item, compact = false) => {
  const lookup = itemById();
  if (!item.relations?.length) return "";
  return `
    <div class="detail-group">
      <strong>Relations typées</strong>
      <ul class="evidence-list">
        ${item.relations
          .slice(0, compact ? 2 : item.relations.length)
          .map((relation) => {
            const target = lookup.get(relation.target);
            return `<li><b>${relation.type}</b> → ${target?.title || relation.target}${relation.note ? ` - ${relation.note}` : ""}</li>`;
          })
          .join("")}
      </ul>
    </div>
  `;
};

const renderRecovery = (item) => {
  if (!item.recovery) return "";
  const lookup = itemById();
  const contacts = (item.recovery.contacts || []).map((id) => lookup.get(id)?.title || id);
  return `
    <div class="detail-card">
      <div class="detail-group">
        <strong>Récupération / prochaine action</strong>
        <span>${item.recovery.nextAction}</span>
      </div>
      <div class="mini-list">
        ${pill(`Priorité ${item.recovery.priority}`)}
        ${pill(item.recovery.status)}
      </div>
      <div class="detail-group">
        <strong>Contacts</strong>
        <span>${listOrFallback(contacts, "à définir")}</span>
      </div>
      <div class="detail-group">
        <strong>Responsable</strong>
        <span>${item.recovery.responsible || "à définir"}</span>
      </div>
    </div>
  `;
};

const renderExternalLinks = (item) => {
  const links = item.externalLinks || [];
  if (!links.length) {
    return `
      <div class="detail-card">
        <div class="detail-group">
          <strong>Liens externes vérifiés</strong>
          <span>Aucun lien externe vérifié pour le moment.</span>
        </div>
      </div>
    `;
  }
  return `
    <div class="detail-card external-links-card">
      <div class="detail-group">
        <strong>Liens externes vérifiés</strong>
        <div class="external-links-list">
          ${links
            .map(
              (link) => `
                <a class="external-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                  <span>${escapeHtml(link.label)}</span>
                  <small>${escapeHtml(link.kind)} · ${escapeHtml(link.status)} · vérifié ${escapeHtml(link.lastChecked || "à dater")}</small>
                  ${link.note ? `<em>${escapeHtml(link.note)}</em>` : ""}
                </a>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
};

const renderTimeline = () => {
  const timeline = document.querySelector("#timeline");
  timeline.innerHTML = timelineItems
    .map(
      (item) => `
        <article class="timeline-item">
          <div class="timeline-period">${item.period}</div>
          <div>
            <div class="status-row">
              ${pill(item.status, slugStatus(item.status))}
            </div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="mini-list" aria-label="Acteurs liés">
              ${item.actors.map((actor) => pill(actor)).join("")}
            </div>
          </div>
        </article>
      `
    )
    .join("");
};

const renderFilters = () => {
  const container = document.querySelector("#filters");
  container.innerHTML = filters
    .map(
      (filter, index) => `
        <button
          class="filter-button ${filter.label === state.filter.label ? "active" : ""}"
          type="button"
          data-filter-index="${index}"
        >${filter.label}</button>
      `
    )
    .join("");
};

const renderCards = () => {
  const cards = document.querySelector("#cards");
  const results = items
    .filter((item) => (state.focusItemId ? item.id === state.focusItemId : matchesFilter(item) && matchesQuery(item)))
    .sort((a, b) => searchRank(a) - searchRank(b));

  document.querySelector("#results-count").textContent = pluralize(results.length);

  if (!results.length) {
    cards.innerHTML = `
      <article class="card">
        <h3>Aucune fiche trouvée</h3>
        <p>Essayez une variante du nom, par exemple EuRom 5 / EuRom5, Galanet / GalaNet, REPLI4C / Reply for C.</p>
        ${emptySearchSuggestion()}
      </article>
    `;
    return;
  }

  cards.innerHTML = results
    .map(
      (item) => `
        <article class="card" data-item-id="${item.id}">
          <div class="card-meta">
            ${pill(item.type, "type")}
            ${pill(item.status, slugStatus(item.status))}
            ${actorStatusPills(item)}
            ${item.uncertain ? pill("à confirmer") : ""}
          </div>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <div class="mini-list">${(item.tags || []).slice(0, 5).map((tag) => pill(tag)).join("")}</div>
          <div class="mini-list">
            ${pill(`Priorité ${item.communityPriority || "moyenne"}`)}
            ${pill(item.accessStatus || "à vérifier")}
            ${pill(item.licenseStatus || "inconnu")}
          </div>
          ${renderActorCardDetails(item)}
          <div class="detail-group">
            <strong>Acteurs liés</strong>
            <span>${(item.actors || []).join(", ") || "à compléter"}</span>
          </div>
          <div class="detail-group">
            <strong>Entretiens</strong>
            <span>${(item.interviews || []).join(", ") || "à compléter"}</span>
          </div>
          ${renderRelatedLinks(item)}
          ${renderRelations(item, true)}
          ${renderEvidence(item)}
          <div class="detail-group">
            <strong>Risques / points de suivi</strong>
            <span>${(item.risks || []).join(", ") || "aucun risque identifié"}</span>
          </div>
          <button class="card-action" type="button" data-open-detail="${item.id}">Ouvrir la fiche</button>
        </article>
      `
    )
    .join("");
};

const renderRescue = () => {
  const rescueStatuses = ["fragile", "disparu", "à récupérer", "à vérifier"];
  const fragileItems = items.filter((item) => rescueStatuses.includes(item.status));
  document.querySelector("#rescue-list").innerHTML = fragileItems
    .map(
      (item) => `
        <article class="rescue-card" data-item-id="${item.id}">
          <div class="card-meta">
            ${pill(item.type, "type")}
            ${pill(item.status, slugStatus(item.status))}
          </div>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <div class="detail-group">
            <strong>À suivre</strong>
            <span>${(item.risks || []).join(", ")}</span>
          </div>
        </article>
      `
    )
    .join("");
};

const renderGraph = () => {
  const graph = document.querySelector("#graph-map");
  const rows = typeof graphRows === "undefined" ? [] : graphRows;
  graph.innerHTML = rows
    .map(
      (row) => `
        <article class="graph-row">
          <div class="graph-chain">
            <button class="graph-node link-button" type="button" data-open-detail="${row.actor.id}">
              <small>Acteur</small>
              <strong>${row.actor.label}</strong>
            </button>
            <span class="graph-arrow">→</span>
            <button class="graph-node link-button" type="button" data-open-detail="${row.project.id}">
              <small>Projet / outil</small>
              <strong>${row.project.label}</strong>
            </button>
            <span class="graph-arrow">→</span>
            <button class="graph-node link-button" type="button" data-open-detail="${row.resource.id}">
              <small>Ressource / besoin</small>
              <strong>${row.resource.label}</strong>
            </button>
          </div>
          <p>${row.note}</p>
        </article>
      `
    )
    .join("");
};

const renderCampaign = () => {
  const lookup = itemById();
  const campaignItems = items.filter((item) => item.recovery);
  document.querySelector("#campaign-list").innerHTML = campaignItems
    .map((item) => {
      const contactIds = item.recovery.contacts || [];
      const contacts = contactIds.map((id) => lookup.get(id)?.title || id);
      return `
        <article class="campaign-card" data-item-id="${item.id}">
          <div class="card-meta">
            ${pill(item.recovery.priority, "type")}
            ${pill(item.recovery.status, slugStatus(item.recovery.status))}
          </div>
          <h3>${item.title}</h3>
          <div class="detail-group">
            <strong>Pourquoi c'est important</strong>
            <span>${item.communityUse || item.description}</span>
          </div>
          <div class="detail-group">
            <strong>Prochaine action</strong>
            <span>${item.recovery.nextAction}</span>
          </div>
          <div class="detail-group">
            <strong>Qui pourrait aider</strong>
            <span>${contacts.join(", ") || "à définir"}</span>
          </div>
          <div class="detail-group">
            <strong>Responsable</strong>
            <span>${item.recovery.responsible}</span>
          </div>
        </article>
      `;
    })
    .join("");
};

const openDetail = (itemId) => {
  const item = itemById().get(itemId);
  if (!item) return;
  const modal = document.querySelector("#detail-modal");
  const content = document.querySelector("#detail-content");
  const lookup = itemById();
  const related = (item.relatedItems || []).map((id) => lookup.get(id)).filter(Boolean);
  const recovery = renderRecovery(item);
  const audience = item.audience?.length ? item.audience : ["enseignants", "chercheurs", "réseaux IC"];
  content.innerHTML = `
    <header class="detail-header">
      <div class="card-meta">
        ${pill(item.type, "type")}
        ${pill(item.status, slugStatus(item.status))}
        ${pill(item.status || "état à préciser")}
        ${actorStatusPills(item)}
        ${externalLinkBadge(item)}
        ${item.communityPriority ? pill(`Priorité ${item.communityPriority}`) : ""}
      </div>
      <h2 id="detail-title">${item.title}</h2>
      <p>${item.longDescription || item.description}</p>
      <div class="mini-list">${(item.tags || []).map((tag) => pill(tag)).join("")}</div>
      <div class="result-actions detail-actions">
        <button class="ghost-button" type="button" data-propose-correction="${item.id}">Proposer une correction</button>
      </div>
    </header>
    <div class="detail-grid">
      <div class="detail-card">
        <div class="detail-group"><strong>À quoi ça sert ?</strong><span>${item.communityUse || item.description}</span></div>
        <div class="detail-group"><strong>Pour qui ?</strong><span>${listOrFallback(audience)}</span></div>
      </div>
      ${renderActorDetail(item)}
      <div class="detail-card">
        <div class="detail-group"><strong>Comment réutiliser ?</strong><span>${item.reuseHint || "S'en servir comme repère, source d'inspiration ou point de départ pour documenter une ressource liée."}</span></div>
        <div class="detail-group"><strong>Contribuer</strong><span>${item.contributionHint || "Ajouter liens, captures, responsables, variantes ou informations de disponibilité."}</span></div>
      </div>
      <div class="detail-card">
        <div class="detail-group"><strong>Droits / licence</strong><span>${item.licenseStatus || "à vérifier"}</span></div>
        <div class="detail-group"><strong>Accessibilité</strong><span>${item.accessStatus || "à retrouver"}</span></div>
        <div class="detail-group"><strong>Note de droits</strong><span>${item.rightsNote || "Droits à vérifier avant diffusion publique."}</span></div>
      </div>
      <div class="detail-card">
        <div class="detail-group"><strong>État actuel</strong><span>${item.status || "à vérifier"}${item.period ? ` - ${item.period}` : ""}</span></div>
        <div class="detail-group"><strong>Priorité communautaire</strong><span>${item.communityPriority || "moyenne"}${item.communityPriorityReason ? ` - ${item.communityPriorityReason}` : ""}</span></div>
        <div class="detail-group"><strong>Actions possibles</strong>
          <ul>${(item.todo?.length ? item.todo : ["Compléter la fiche avec des informations communautaires."]).map((todo) => `<li>${todo}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="detail-card">
        <div class="detail-group"><strong>Personnes / projets liés</strong>
          <span>${listOrFallback(item.actors)}</span>
        </div>
        <div class="detail-group"><strong>Fiches liées</strong>
          <div class="mini-list">
            ${related.map((relatedItem) => `<button class="link-button" type="button" data-related-id="${relatedItem.id}">${relatedItem.title}</button>`).join("") || "<span>à compléter</span>"}
          </div>
        </div>
      </div>
      ${recovery}
      ${renderExternalLinks(item)}
      <div class="detail-card">${renderRelations(item)}</div>
      <div class="detail-card">
        <div class="detail-group"><strong>Traçabilité documentaire</strong><span>Repéré dans les entretiens et consolidé progressivement.</span></div>
        <div class="mini-list">
          ${pill(`Confiance ${item.confidence || "moyenne"}`)}
          ${pill(item.sourceStatus || "transcription à vérifier")}
          ${pill(`Vérifié ${item.lastChecked || "2026-07-03"}`)}
        </div>
        ${renderEvidence(item)}
      </div>
      <div class="detail-card">
        <div class="detail-group"><strong>Risques</strong><span>${listOrFallback(item.risks, "aucun risque identifié")}</span></div>
        <div class="detail-group"><strong>Notes d'incertitude</strong><span>${item.uncertaintyNote || (item.uncertain ? "Référence à confirmer dans une passe documentaire." : "Aucune incertitude majeure indiquée.")}</span></div>
      </div>
    </div>
  `;
  modal.hidden = false;
};

const closeDetail = () => {
  document.querySelector("#detail-modal").hidden = true;
};

const downloadFile = (filename, mimeType, content) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportItemsJson = () => {
  const filename = "informaticaire_items_v0.6.json";
  downloadFile(filename, "application/json;charset=utf-8", JSON.stringify(items, null, 2));
  document.querySelector("#export-status").textContent = `${filename} généré.`;
};

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const exportRecoveryCsv = () => {
  const lookup = itemById();
  const rows = items
    .filter((item) => item.recovery)
    .map((item) => {
      const contacts = (item.recovery.contacts || []).map((id) => lookup.get(id)?.title || id).join("; ");
      return [
        item.id,
        item.title,
        item.recovery.priority,
        item.recovery.status,
        item.recovery.nextAction,
        contacts,
        item.recovery.responsible,
      ].map(csvCell).join(",");
    });
  const header = ["id", "ressource", "priorite", "etat", "prochaine_action", "personnes_a_contacter", "responsable"].map(csvCell).join(",");
  const filename = "informaticaire_recovery_v0.6.csv";
  downloadFile(filename, "text/csv;charset=utf-8", [header, ...rows].join("\n"));
  document.querySelector("#export-status").textContent = `${filename} généré.`;
};

const renderPriorityShare = () => {
  const lookup = itemById();
  document.querySelector("#priority-share-list").innerHTML = priorityShareIds
    .map((id) => lookup.get(id))
    .filter(Boolean)
    .map((item) => `
      <article class="share-card" data-item-id="${item.id}">
        <div class="card-meta">
          ${pill(item.type, "type")}
          ${pill(`Priorité ${item.communityPriority || "moyenne"}`)}
          ${pill(item.accessStatus || "à retrouver")}
        </div>
        <h3>${item.title}</h3>
        <div class="detail-group">
          <strong>Pourquoi cette fiche compte ?</strong>
          <span>${item.communityPriorityReason || item.communityUse}</span>
        </div>
        <div class="detail-group">
          <strong>Qui peut l'utiliser ?</strong>
          <span>${listOrFallback(item.audience)}</span>
        </div>
        <div class="detail-group">
          <strong>Que manque-t-il ?</strong>
          <span>${item.contributionHint || "Ajouter droits, liens, contacts ou exemples de réutilisation."}</span>
        </div>
        <button class="card-action" type="button" data-open-detail="${item.id}">Ouvrir la fiche</button>
      </article>
    `)
    .join("");
};

const populateContributionTargets = () => {
  const select = document.querySelector("#contribution-target");
  select.innerHTML = items
    .map((item) => `<option value="${item.id}">${item.title}</option>`)
    .join("");
};

let latestContributionDraft = null;

const correctionTemplate = (item) => [
  `Fiche : ${item.title}`,
  "Champ concerné : à préciser",
  "Valeur actuelle : à copier depuis la fiche",
  "Correction proposée :",
  "Justification / source :",
].join("\n");

const renderCorrectionReview = (draft) => {
  const container = document.querySelector("#correction-review");
  if (!container) return;
  if (!draft || draft.type !== "correction") {
    container.innerHTML = `
      <h3>Corrections à relire</h3>
      <p>Aucun brouillon de correction préparé pour le moment.</p>
    `;
    return;
  }
  container.innerHTML = `
    <h3>Corrections à relire</h3>
    <article class="correction-card">
      <strong>${escapeHtml(draft.targetTitle)}</strong>
      <span>${escapeHtml(draft.field || "champ à préciser")}</span>
      <p>${escapeHtml(draft.proposedValue || "Correction proposée à compléter.")}</p>
    </article>
  `;
};

const prefillCorrection = (itemId) => {
  const item = itemById().get(itemId);
  if (!item) return;
  closeDetail();
  document.querySelector("#contribution-type").value = "correction";
  document.querySelector("#contribution-target").value = item.id;
  document.querySelector("#correction-field").value = "description";
  document.querySelector("#correction-current-value").value = item.description || item.longDescription || "";
  document.querySelector("#correction-proposed-value").value = "";
  document.querySelector("#correction-reason").value = "";
  document.querySelector("#contribution-note").value = correctionTemplate(item);
  document.querySelector("#contribution-confidence").value = "à vérifier";
  document.querySelector("#contribution-contact").value = "";
  highlightSection("#contribuer");
  document.querySelector("#correction-field").focus({ preventScroll: true });
};

const prepareContribution = (event) => {
  event.preventDefault();
  const target = document.querySelector("#contribution-target").value;
  const type = document.querySelector("#contribution-type").value;
  const note = document.querySelector("#contribution-note").value.trim();
  const confidence = document.querySelector("#contribution-confidence").value;
  const contact = document.querySelector("#contribution-contact").value.trim() || "à compléter";
  const targetTitle = itemById().get(target)?.title || target;
  if (type === "correction") {
    latestContributionDraft = {
      type: "correction",
      target,
      targetTitle,
      field: document.querySelector("#correction-field").value || "à préciser",
      currentValue: document.querySelector("#correction-current-value").value.trim() || "à compléter",
      proposedValue: document.querySelector("#correction-proposed-value").value.trim() || "à compléter",
      reason: document.querySelector("#correction-reason").value.trim() || note || "à compléter",
      confidence,
      contact,
      createdAt: new Date().toISOString(),
    };
  } else if (type === "external-link") {
    latestContributionDraft = {
      type: "external-link",
      target,
      targetTitle,
      label: document.querySelector("#external-link-label").value.trim() || "à compléter",
      url: document.querySelector("#external-link-url").value.trim() || "à compléter",
      kind: document.querySelector("#external-link-kind").value || "à vérifier",
      reason: note || "Lien proposé par la communauté, à vérifier avant intégration.",
      confidence,
      contact,
      createdAt: new Date().toISOString(),
    };
  } else {
    latestContributionDraft = {
      target,
      targetTitle,
      type,
      note: note || "à compléter",
      confidence,
      contact,
      createdAt: new Date().toISOString(),
      nextStep: "Relire puis intégrer manuellement dans data.js après vérification communautaire.",
    };
  }
  document.querySelector("#contribution-draft").textContent = JSON.stringify(latestContributionDraft, null, 2);
  document.querySelector("#download-contribution-button").disabled = false;
  renderCorrectionReview(latestContributionDraft);
};

const exportContributionDraft = () => {
  if (!latestContributionDraft) return;
  const safeTarget = latestContributionDraft.target.replace(/[^a-z0-9-]/gi, "-");
  const filename = `informaticaire_contribution_${safeTarget}.json`;
  downloadFile(filename, "application/json;charset=utf-8", JSON.stringify(latestContributionDraft, null, 2));
  document.querySelector("#contribution-export-status").textContent = `${filename} généré.`;
};

const highlightSection = (selector) => {
  const section = document.querySelector(selector);
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  section.classList.add("highlight-section");
  window.setTimeout(() => section.classList.remove("highlight-section"), 1800);
};

const runGalanetDemo = () => {
  const galanet = itemById().get("galanet");
  if (!galanet) return;
  state.query = "Galanet";
  state.filter = filters[0];
  state.focusItemId = "galanet";
  document.querySelector("#search-input").value = "Galanet";
  document.querySelector("#contribution-target").value = "galanet";
  renderFilters();
  renderCards();
  highlightSection("#bibliotheque");
  window.setTimeout(() => openDetail("galanet"), 550);
};

const applyJourney = (journey) => {
  const search = document.querySelector("#search-input");
  state.focusItemId = "";
  state.filter = filters[0];

  const journeys = {
    pedagogie: { query: "ressource", target: "#bibliotheque" },
    plateforme: { query: "plateforme", target: "#bibliotheque" },
    personne: { query: "", filter: "acteur", target: "#bibliotheque" },
    sauver: { query: "", target: "#campagne" },
    adapter: { query: "adapter", target: "#bibliotheque" },
    histoire: { query: "historique", target: "#graphe" },
  };

  const selected = journeys[journey];
  if (!selected) return;
  state.query = selected.query;
  if (selected.filter) {
    state.filter = filters.find((filter) => filter.value === selected.filter) || filters[0];
  }
  search.value = selected.query;
  renderFilters();
  renderCards();
  document.querySelector(selected.target).scrollIntoView({ behavior: "smooth", block: "start" });
};

const renderNeeds = () => {
  document.querySelector("#needs-list").innerHTML = needs
    .map(
      (need) => `
        <article class="need-card">
          <h3>${need.title}</h3>
          <p>${need.description}</p>
          <div class="mini-list">${need.tags.map((tag) => pill(tag)).join("")}</div>
        </article>
      `
    )
    .join("");
};

const updateStats = () => {
  const recoveryCount = items.filter((item) => item.recovery).length;
  const audienceCount = filters.filter((filter) => filter.mode === "audience").length;
  const relationCount = items.reduce((total, item) => total + (item.relations || []).length, 0);
  document.querySelector("#stat-items").textContent = items.length;
  document.querySelector("#stat-recovery").textContent = recoveryCount;
  document.querySelector("#stat-share").textContent = priorityShareIds.length;
  document.querySelector("#stat-audiences").textContent = audienceCount;
  document.querySelector("#stat-relations").textContent = relationCount;
};

const bindEvents = () => {
  document.querySelector("#visite").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tour-target]");
    if (button) highlightSection(button.dataset.tourTarget);
  });

  document.querySelector("#demo-galanet-button").addEventListener("click", runGalanetDemo);

  document.querySelector("#parcours").addEventListener("click", (event) => {
    const button = event.target.closest("[data-journey]");
    if (button) applyJourney(button.dataset.journey);
  });

  document.querySelector("#priority-share-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-detail]");
    if (button) openDetail(button.dataset.openDetail);
  });

  document.querySelector("#search-input").addEventListener("input", (event) => {
    state.query = event.target.value;
    state.focusItemId = "";
    renderCards();
  });

  document.querySelector("#filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-index]");
    if (!button) return;
    state.filter = filters[Number(button.dataset.filterIndex)];
    state.focusItemId = "";
    renderFilters();
    renderCards();
  });

  document.querySelector("#cards").addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-open-detail]");
    if (detailButton) {
      openDetail(detailButton.dataset.openDetail);
      return;
    }

    const button = event.target.closest("[data-related-id]");
    if (!button) return;
    const linkedItem = itemById().get(button.dataset.relatedId);
    if (!linkedItem) return;
    state.query = linkedItem.title;
    state.filter = filters[0];
    state.focusItemId = linkedItem.id;
    document.querySelector("#search-input").value = linkedItem.title;
    renderFilters();
    renderCards();
    document.querySelector("#bibliotheque").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#cards").addEventListener("click", (event) => {
    if (event.target.closest("[data-related-id], [data-open-detail]")) return;
    const card = event.target.closest("[data-item-id]");
    if (card) openDetail(card.dataset.itemId);
  });

  document.querySelector("#cards").addEventListener("dblclick", (event) => {
    const card = event.target.closest("[data-item-id]");
    if (card) openDetail(card.dataset.itemId);
  });

  document.querySelector("#graph-map").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-detail]");
    if (button) openDetail(button.dataset.openDetail);
  });

  document.querySelector("#detail-modal").addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-detail]");
    if (closeButton) {
      closeDetail();
      return;
    }

    const correctionButton = event.target.closest("[data-propose-correction]");
    if (correctionButton) {
      prefillCorrection(correctionButton.dataset.proposeCorrection);
      return;
    }

    const relatedButton = event.target.closest("[data-related-id]");
    if (relatedButton) {
      closeDetail();
      openDetail(relatedButton.dataset.relatedId);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDetail();
  });

  document.querySelector("#export-json-button").addEventListener("click", exportItemsJson);
  document.querySelector("#export-csv-button").addEventListener("click", exportRecoveryCsv);
  document.querySelector("#contribution-form").addEventListener("submit", prepareContribution);
  document.querySelector("#download-contribution-button").addEventListener("click", exportContributionDraft);

  document.querySelector("#reset-button").addEventListener("click", () => {
    state.query = "";
    state.filter = filters[0];
    state.focusItemId = "";
    document.querySelector("#search-input").value = "";
    renderFilters();
    renderCards();
  });
};

renderTimeline();
renderFilters();
renderCards();
renderPriorityShare();
renderGraph();
renderCampaign();
renderRescue();
renderNeeds();
updateStats();
populateContributionTargets();
bindEvents();
