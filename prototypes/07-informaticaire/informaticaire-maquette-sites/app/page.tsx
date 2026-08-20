"use client";

import { useMemo, useState } from "react";

type View = "home" | "explore" | "map";
type Kind = "projet" | "plateforme" | "ressource" | "acteur" | "référentiel";
type Card = { id: string; title: string; kind: Kind; icon: string; status: "vivant" | "fragile" | "à retrouver" | "documenté"; summary: string; tags: string[]; links: string[] };

const cards: Card[] = [
  { id: "galanet", title: "Galanet", kind: "plateforme", icon: "G", status: "à retrouver", summary: "Plateforme historique d’intercompréhension en réseau, organisée en scénarios et productions communes.", tags: ["télécollaboration", "forum", "historique"], links: ["galapro", "galatea", "miriadi"] },
  { id: "galapro", title: "Galapro", kind: "projet", icon: "Ga", status: "fragile", summary: "Formation de formateurs issue de Galanet, fondée sur la collaboration plurilingue.", tags: ["formation", "didactique", "réseau"], links: ["galanet", "miriadi", "refic"] },
  { id: "miriadi", title: "Miriadi", kind: "plateforme", icon: "M", status: "vivant", summary: "Réseau, scénarios et ressources d’intercompréhension à distance — un réservoir encore difficile à parcourir.", tags: ["mutualisation", "sessions", "réseau"], links: ["galanet", "galapro", "lecturio", "christian"] },
  { id: "lecturio", title: "Projet Lectŭrio", kind: "projet", icon: "L", status: "vivant", summary: "Lecture plurilingue pour le primaire, reliée à des histoires et activités pédagogiques.", tags: ["primaire", "lecture", "multimodal"], links: ["miriadi", "histoires", "richard"] },
  { id: "histoires", title: "Histoires infantiles plurilingues", kind: "ressource", icon: "Hi", status: "vivant", summary: "Contes et supports plurilingues créés en Argentine pour apprendre à comprendre entre langues.", tags: ["récit", "enfance", "Argentine"], links: ["lecturio", "richard"] },
  { id: "richard", title: "Richard Brunel Matias", kind: "acteur", icon: "RB", status: "documenté", summary: "Enseignant-chercheur à Mendoza, créateur d’Histoires infantiles plurilingues.", tags: ["Mendoza", "terrain", "créateur"], links: ["histoires", "lecturio"] },
  { id: "refic", title: "REFIC", kind: "référentiel", icon: "R", status: "documenté", summary: "Référentiel de compétences en intercompréhension pour situer les pratiques et les apprentissages.", tags: ["compétences", "repères", "formation"], links: ["refdic", "galapro"] },
  { id: "refdic", title: "REFDIC", kind: "référentiel", icon: "Rd", status: "documenté", summary: "Cadre pour décrire les compétences professionnelles liées à la didactique de l’intercompréhension.", tags: ["didactique", "enseignants", "formation"], links: ["refic", "christian"] },
  { id: "galatea", title: "Galatea", kind: "ressource", icon: "Gt", status: "à retrouver", summary: "Ressource fondatrice de la saga Gala, aujourd’hui dispersée entre supports et souvenirs d’usage.", tags: ["CD-ROM", "patrimoine", "langues romanes"], links: ["galanet"] },
  { id: "christian", title: "Christian Degache", kind: "acteur", icon: "CD", status: "documenté", summary: "Chercheur et acteur central des réseaux, plateformes et scénarios d’intercompréhension.", tags: ["terrain", "recherche", "réseau"], links: ["miriadi", "refdic"] },
];

const kindMeta: Record<Kind, { label: string; icon: string }> = {
  projet: { label: "Projet", icon: "✦" }, plateforme: { label: "Plateforme", icon: "▦" }, ressource: { label: "Ressource", icon: "◫" }, acteur: { label: "Acteur", icon: "●" }, référentiel: { label: "Référentiel", icon: "⌘" },
};
const graphNodes = [
  { id: "galanet", x: 230, y: 110 }, { id: "galapro", x: 105, y: 205 }, { id: "miriadi", x: 275, y: 260 }, { id: "lecturio", x: 430, y: 190 }, { id: "histoires", x: 510, y: 320 }, { id: "richard", x: 410, y: 390 }, { id: "refic", x: 65, y: 345 }, { id: "refdic", x: 205, y: 405 }, { id: "christian", x: 305, y: 430 }, { id: "galatea", x: 90, y: 80 },
];
const graphEdges = [["galatea", "galanet"], ["galanet", "galapro"], ["galanet", "miriadi"], ["galapro", "miriadi"], ["galapro", "refic"], ["refic", "refdic"], ["refdic", "christian"], ["christian", "miriadi"], ["miriadi", "lecturio"], ["lecturio", "histoires"], ["histoires", "richard"], ["richard", "lecturio"]];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "tous">("tous");
  const [selected, setSelected] = useState<Card>(cards[0]);
  const filtered = useMemo(() => { const q = query.trim().toLocaleLowerCase("fr"); return cards.filter((card) => (kind === "tous" || card.kind === kind) && (!q || [card.title, card.summary, ...card.tags].join(" ").toLocaleLowerCase("fr").includes(q))); }, [query, kind]);
  function searchNow() { setView("explore"); requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#main-search")?.focus()); }
  function openCard(card: Card) { setSelected(card); setView("map"); }

  return <main>
    <header className="topbar">
      <button className="brand" onClick={() => setView("home")} aria-label="Retour à l’accueil"><span className="brand-mark">IC</span><span><strong>Informaticaire</strong><small>Mémoire vivante de l’intercompréhension</small></span></button>
      <nav aria-label="Navigation principale"><button className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}>Explorer</button><button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Carte</button><button>Visite</button><button>Contribuer</button><button className="understand">Comprendre <span>⌄</span></button></nav>
    </header>

    {view === "home" && <section className="home-view">
      <div className="hero-copy">
        <p className="eyebrow"><span /> PROTOTYPE DOCUMENTAIRE VIVANT</p><h1>Les ressources de l’IC<br /><em>se retrouvent.</em></h1>
        <p className="lede">Retrouver les projets, les personnes et les traces. Comprendre leurs histoires. Voir ce qui les relie — et ce qui risque de disparaître.</p>
        <div className="home-search"><label htmlFor="home-query">Que cherches-tu dans la mémoire de l’IC&nbsp;?</label><div className="search-row"><span aria-hidden="true">⌕</span><input id="home-query" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchNow()} placeholder="Un projet, une personne, une ressource…" /><button onClick={searchNow}>Explorer <span>→</span></button></div>
          <div className="quick-links"><span>Accès rapides</span>{(["projet", "acteur", "ressource", "plateforme"] as Kind[]).map((value) => <button key={value} onClick={() => { setKind(value); setView("explore"); }}>{kindMeta[value].icon} {kindMeta[value].label}s</button>)}<button className="save-quick" onClick={() => { setQuery("fragile"); setView("explore"); }}>♡ À sauver</button></div>
        </div>
        <div className="hero-actions"><button className="primary" onClick={() => setView("explore")}>Parcourir les 110 fiches</button><button>Découvrir en 5 étapes</button><button>Voir la démo rapide</button></div>
      </div>
      <div className="hero-universe" aria-label="Aperçu des relations entre les fiches"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><svg viewBox="0 0 560 500" role="img" aria-label="Constellation de ressources et d’acteurs">{graphEdges.slice(0, 9).map(([a, b]) => { const start = graphNodes.find((n) => n.id === a)!; const end = graphNodes.find((n) => n.id === b)!; return <line key={`${a}-${b}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />; })}</svg>
        {graphNodes.slice(0, 8).map((node, index) => { const card = cards.find((item) => item.id === node.id)!; return <button key={node.id} className={`universe-node kind-${card.kind}`} style={{ left: `${node.x / 5.6}%`, top: `${node.y / 5}%`, animationDelay: `${index * -0.7}s` }} onClick={() => openCard(card)}><span className="node-icon">{card.icon}</span><strong>{card.title}</strong><small>{kindMeta[card.kind].label}</small></button>; })}
        <div className="universe-caption"><span className="pulse" /><strong>86 relations documentées</strong><small>Une mémoire se comprend aussi par ses liens.</small></div></div>
      <div className="home-stats"><button><strong>110</strong><span>fiches documentées</span></button><button><strong>86</strong><span>relations typées</span></button><button><strong>11</strong><span>ressources à sauver</span></button><button><strong>5</strong><span>publics concernés</span></button></div>
    </section>}

    {view === "explore" && <section className="explore-view">
      <div className="view-heading"><div><p className="eyebrow"><span /> BIBLIOTHÈQUE VIVANTE</p><h1>Explorer les traces de l’IC</h1><p>Recherche, filtre et suis les relations qui donnent du sens à chaque fiche.</p></div><button className="map-button" onClick={() => setView("map")}>◌ Voir la carte des relations</button></div>
      <div className="explore-tools"><div className="main-search"><span>⌕</span><input id="main-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans 110 fiches…" /><kbd>⌘ K</kbd></div><div className="filter-row"><span>Afficher</span>{(["tous", "projet", "plateforme", "acteur", "ressource", "référentiel"] as const).map((value) => <button key={value} className={kind === value ? "active" : ""} onClick={() => setKind(value)}>{value === "tous" ? "Tout" : `${kindMeta[value].icon} ${kindMeta[value].label}s`}</button>)}</div></div>
      <div className="result-line"><strong>{filtered.length}</strong> fiches dans cette maquette <span /><button>Les plus reliées d’abord ⌄</button></div>
      <div className="card-grid">{filtered.map((card) => <article key={card.id} className={`record-card kind-${card.kind}`}><div className="record-top"><span className="record-icon">{card.icon}</span><div><span className="kind-label">{kindMeta[card.kind].icon} {kindMeta[card.kind].label}</span><h2>{card.title}</h2></div><span className={`status status-${card.status.replace(" ", "-")}`}>{card.status}</span></div><p>{card.summary}</p><div className="tags">{card.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><footer><span><b>{card.links.length}</b> relations</span><button onClick={() => openCard(card)}>Ouvrir la fiche <span>→</span></button></footer></article>)}</div>
    </section>}

    {view === "map" && <section className="map-view">
      <div className="view-heading map-heading"><div><p className="eyebrow"><span /> CARTOGRAPHIE DOCUMENTAIRE</p><h1>Voir ce qui relie les fiches</h1><p>Choisis un objet : son voisinage raconte une histoire, une filiation ou un besoin de transmission.</p></div><button onClick={() => setView("explore")}>← Retour à l’explorateur</button></div>
      <div className="map-shell"><div className="relation-map"><div className="map-legend"><span className="kind-projet">Projet</span><span className="kind-plateforme">Plateforme</span><span className="kind-ressource">Ressource</span><span className="kind-acteur">Acteur</span><span className="kind-référentiel">Référentiel</span></div><svg viewBox="0 0 560 500" role="img" aria-label="Carte des relations documentées">{graphEdges.map(([a, b]) => { const start = graphNodes.find((n) => n.id === a)!; const end = graphNodes.find((n) => n.id === b)!; const active = a === selected.id || b === selected.id; return <line className={active ? "selected-edge" : ""} key={`${a}-${b}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />; })}</svg>{graphNodes.map((node) => { const card = cards.find((item) => item.id === node.id)!; const related = selected.links.includes(card.id); return <button key={node.id} aria-label={card.title} className={`map-node kind-${card.kind} ${selected.id === card.id ? "selected" : ""} ${related ? "related" : ""}`} style={{ left: `${node.x / 5.6}%`, top: `${node.y / 5}%` }} onClick={() => setSelected(card)}><span>{card.icon}</span><strong>{card.title}</strong></button>; })}</div>
        <aside className={`detail-panel kind-${selected.kind}`}><div className="detail-head"><span className="record-icon">{selected.icon}</span><div><span className="kind-label">{kindMeta[selected.kind].icon} {kindMeta[selected.kind].label}</span><h2>{selected.title}</h2></div></div><p>{selected.summary}</p><div className="detail-section"><h3>Pourquoi cette fiche compte</h3><p>Elle permet de retrouver un élément du patrimoine de l’IC et de comprendre les personnes, projets et usages qui lui donnent sens.</p></div><div className="detail-section"><h3>Relations documentées <span>{selected.links.length}</span></h3><ul>{selected.links.map((id) => { const related = cards.find((card) => card.id === id)!; return <li key={id}><button onClick={() => setSelected(related)}><span className={`mini-icon kind-${related.kind}`}>{related.icon}</span><span><strong>{related.title}</strong><small>{id === "richard" || id === "christian" ? "contribue à / connaît" : "hérite de / prolonge / documente"}</small></span><b>→</b></button></li>; })}</ul></div><button className="full-card">Consulter la fiche complète <span>→</span></button></aside>
      </div>
    </section>}
  </main>;
}
