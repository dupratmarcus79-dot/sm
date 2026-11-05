"use strict";
/* SM : appli privée de Shaina et Marcus. Tout reste sur le téléphone : aucun serveur, aucune clé. */

// Empreintes SHA-256 des noms autorisés : les noms complets ne sont pas écrits dans le code public.
const UTILISATEURS = {
  "4f11608a5fce8b4ae6fc61159e23f95895e27d62fac6dceadf1325d2dfd46693": { id: "marcus", prenom: "Marcus" },
  "8f9193387ceedb3e9a6f17aa01673b9d391f9921f87dc59bce2fbf1b011d5ce4": { id: "shaina", prenom: "Shaina" },
};
const PERSONNES = { marcus: "Marcus", shaina: "Shaina" };
const CLE = "sm.v1";
const ITERATIONS = 310000;
const VERROU_APRES_MS = 60000;

const I = {
  accueil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  investir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
  bourse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  reves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  reglages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.5"/><circle cx="8" cy="17" r="2.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  commun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.8 3-6 6.5-6s5.900 2.200 6.500 6"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.400M18 14.500c1.900.8 3.100 2.600 3.500 5.500"/></svg>',
  personne: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.400 3.800-7 8-7s7.200 2.600 8 7"/></svg>',
  face: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M8.500 9v1.500M15.500 9v1.500M12 9v4h-1M9 16c1.800 1.300 4.200 1.300 6 0"/></svg>',
};

/* ---------- Données ---------- */
function etatVide() {
  return { profil: null, auth: null, faceid: null, prefs: { theme: "noir", accent: "lime", fond: true }, investissements: [], objectifs: [], supprimes: [] };
}
function charger() {
  try {
    const e = JSON.parse(localStorage.getItem(CLE));
    return e ? { ...etatVide(), ...e, prefs: { ...etatVide().prefs, ...e.prefs } } : etatVide();
  } catch { return etatVide(); }
}
let S = charger();
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(S)); }
  catch { toast("Stockage plein : la dernière action n'est pas enregistrée."); }
}
const uid = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
const moi = () => S.profil && S.profil.id;
const autre = () => (moi() === "marcus" ? "shaina" : "marcus");
const auj = () => new Date().toISOString().slice(0, 10);

let COURS = { maj: null, actifs: [] };
async function chargerCours() {
  try {
    const r = await fetch("data/quotes.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("réseau");
    COURS = await r.json();
  } catch { /* hors ligne sans cache : l'écran Bourse le signale */ }
}
const actif = (id) => COURS.actifs.find((a) => a.id === id);
const dernier = (a) => a.serie[a.serie.length - 1][1];
function varJour(a) {
  const s = a.serie;
  return s.length < 2 ? 0 : (s[s.length - 1][1] / s[s.length - 2][1] - 1) * 100;
}
function coursAu(a, date) {
  let p = a.serie[0][1];
  for (const [d, c] of a.serie) { if (d > date) break; p = c; }
  return p;
}
function valeur(inv) {
  const a = actif(inv.actif);
  return a ? inv.montant * (dernier(a) / coursAu(a, inv.date)) : inv.montant;
}
function bilan(liste) {
  const investi = liste.reduce((t, i) => t + i.montant, 0);
  const val = liste.reduce((t, i) => t + valeur(i), 0);
  return { investi, val, gain: val - investi, pct: investi ? (val / investi - 1) * 100 : 0 };
}
const mesInv = (qui) => S.investissements.filter((i) => i.compte === "perso" && i.owner === qui);
const invCommun = () => S.investissements.filter((i) => i.compte === "commun");

/* ---------- Outils d'affichage ---------- */
function h(tag, attrs, ...enfants) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "icone") el.innerHTML = v; // icônes constantes du fichier uniquement
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of enfants.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}
const NS = "http://www.w3.org/2000/svg";
function s(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  return el;
}
const euros = (n, d = 0) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const nombre = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: n >= 1000 ? 0 : 2, minimumFractionDigits: n >= 1000 ? 0 : 2 }).format(n);
const prix = (a) => {
  const v = dernier(a);
  if (a.famille === "indice") return nombre(v);
  if (a.famille === "devise") return v.toFixed(4);
  return nombre(v) + (a.devise === "EUR" ? " €" : a.devise === "USD" ? " $" : "");
};
const pct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2).replace(".", ",") + " %";
const dateFr = (d) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const lireMontant = (v) => { const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function compteur(el, fin, format) {
  if (calme()) { el.textContent = format(fin); return; }
  const t0 = performance.now(), duree = 1100;
  (function pas(t) {
    const p = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - p, 4);
    el.textContent = format(fin * e);
    if (p < 1) requestAnimationFrame(pas);
  })(t0);
}
function spark(serie, w = 72, hgt = 32) {
  const v = serie.map((x) => x[1]), min = Math.min(...v), max = Math.max(...v), e = max - min || 1;
  const d = v.map((y, i) => `${i ? "L" : "M"}${((i / (v.length - 1)) * w).toFixed(1)} ${(hgt - 2 - ((y - min) / e) * (hgt - 4)).toFixed(1)}`).join("");
  const svg = s("svg", { class: "spark", viewBox: `0 0 ${w} ${hgt}` });
  svg.append(s("path", { d, pathLength: 1, stroke: v[v.length - 1] >= v[0] ? "var(--vert)" : "var(--rouge)" }));
  return svg;
}
function ecran(enfants, sansTabs) {
  const app = document.getElementById("app");
  app.className = sansTabs ? "sans-tabs" : "";
  app.scrollTop = 0;
  const box = h("div", { class: sansTabs ? "accueil-auth entre" : "entre" }, enfants);
  [...box.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 9)));
  app.replaceChildren(box);
  document.getElementById("tabs").hidden = !!sansTabs;
}
let toastT;
function toast(texte) {
  const t = document.getElementById("toast");
  t.textContent = texte;
  t.classList.add("vu");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("vu"), 2600);
}
function feuille(enfants) {
  const f = document.getElementById("feuille");
  const panneau = h("div", { class: "panneau", onclick: (e) => e.stopPropagation() }, h("div", { class: "poignee" }), enfants);
  f.replaceChildren(panneau);
  f.hidden = false;
  f.onclick = fermerFeuille;
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add("ouverte")));
}
function fermerFeuille() {
  const f = document.getElementById("feuille");
  f.classList.remove("ouverte");
  setTimeout(() => { f.hidden = true; f.replaceChildren(); }, 320);
}
function appliquerPrefs() {
  const r = document.documentElement;
  r.dataset.theme = S.prefs.theme;
  r.dataset.accent = S.prefs.accent;
  r.classList.toggle("fond-fixe", !S.prefs.fond);
  document.querySelector('meta[name="theme-color"]').content = S.prefs.theme === "noir" ? "#07090b" : "#f3f5f4";
}

/* ---------- Mot de passe et Face ID ---------- */
const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
const deb64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
async function empreinte(mdp, sel, iter) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sel, iterations: iter }, cle, 256));
}
async function definirMdp(mdp) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  S.auth = { sel: b64(sel), iter: ITERATIONS, hash: await empreinte(mdp, sel, ITERATIONS), echecs: 0, bloqueJusqua: 0 };
  sauver();
}
async function verifierMdp(mdp) {
  return (await empreinte(mdp, deb64(S.auth.sel), S.auth.iter)) === S.auth.hash;
}
async function faceIdDispo() {
  try { return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); }
  catch { return false; }
}
async function activerFaceId() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: "SM" },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: S.profil.nom, displayName: S.profil.prenom },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
    timeout: 60000,
  } });
  S.faceid = { id: b64(cred.rawId) };
  sauver();
}
async function demanderFaceId() {
  await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{ type: "public-key", id: deb64(S.faceid.id), transports: ["internal"] }],
    userVerification: "required",
    timeout: 60000,
  } });
}

/* ---------- Connexion ---------- */
const logoMini = () => h("img", { class: "logo-mini", src: "icons/icon-192.png", alt: "" });
function ecranBienvenue() {
  const champ = h("input", { autocomplete: "name", autocapitalize: "words", placeholder: "Prénom et nom", "aria-label": "Prénom et nom" });
  const err = h("p", { class: "erreur" });
  const valider = async (e) => {
    e.preventDefault();
    const cle = champ.value.trim().toLowerCase().replace(/\s+/g, " ");
    const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cle));
    const hex = [...new Uint8Array(octets)].map((x) => x.toString(16).padStart(2, "0")).join("");
    const u = Object.prototype.hasOwnProperty.call(UTILISATEURS, hex) ? UTILISATEURS[hex] : null;
    if (!u) { err.textContent = "Cette appli est privée."; champ.classList.add("tremble"); setTimeout(() => champ.classList.remove("tremble"), 450); return; }
    S.profil = { ...u, nom: cle.replace(/(^| )\p{L}/gu, (m) => m.toUpperCase()) };
    sauver();
    ecranMdp();
  };
  ecran([logoMini(), h("h1", {}, "Bienvenue"), h("p", { class: "sous" }, "Qui es-tu ?"),
    h("form", { onsubmit: valider }, h("label", { class: "champ" }, champ), err, h("button", { class: "bouton", type: "submit" }, "Continuer"))], true);
}
function ecranMdp() {
  const a = h("input", { type: "password", autocomplete: "new-password", placeholder: "8 caractères minimum", "aria-label": "Mot de passe" });
  const b = h("input", { type: "password", autocomplete: "new-password", placeholder: "Encore une fois", "aria-label": "Confirmer le mot de passe" });
  const err = h("p", { class: "erreur" });
  const valider = async (e) => {
    e.preventDefault();
    if (a.value.length < 8) { err.textContent = "Il faut au moins 8 caractères."; return; }
    if (a.value !== b.value) { err.textContent = "Les deux mots de passe sont différents."; return; }
    await definirMdp(a.value);
    (await faceIdDispo()) ? ecranProposerFaceId() : entrer();
  };
  ecran([logoMini(), h("h1", {}, `Salut ${S.profil.prenom}`), h("p", { class: "sous" }, "Crée ton mot de passe."),
    h("form", { onsubmit: valider }, h("label", { class: "champ" }, "Mot de passe", a), h("label", { class: "champ" }, "Confirmation", b), err, h("button", { class: "bouton", type: "submit" }, "Créer mon mot de passe"))], true);
}
function ecranProposerFaceId() {
  ecran([h("div", { class: "faceid", icone: I.face }), h("h1", {}, "Activer Face ID ?"), h("p", { class: "sous" }, "Tu ouvriras l'appli d'un regard."),
    h("button", { class: "bouton", onclick: async () => {
      try { await activerFaceId(); toast("Face ID activé"); } catch { toast("Face ID n'a pas été activé."); }
      entrer();
    } }, "Activer Face ID"),
    h("button", { class: "bouton discret", onclick: entrer }, "Plus tard")], true);
}
function ecranVerrou() {
  document.getElementById("tabs").hidden = true;
  const champ = h("input", { type: "password", autocomplete: "current-password", placeholder: "Mot de passe", "aria-label": "Mot de passe" });
  const err = h("p", { class: "erreur" });
  const valider = async (e) => {
    e.preventDefault();
    const reste = S.auth.bloqueJusqua - Date.now();
    if (reste > 0) { err.textContent = `Réessaie dans ${Math.ceil(reste / 1000)} s.`; return; }
    if (await verifierMdp(champ.value)) { S.auth.echecs = 0; sauver(); entrer(); return; }
    S.auth.echecs = (S.auth.echecs || 0) + 1;
    if (S.auth.echecs >= 5) { S.auth.bloqueJusqua = Date.now() + 30000 * Math.pow(2, S.auth.echecs - 5); }
    sauver();
    err.textContent = "Mot de passe incorrect.";
    champ.value = "";
    champ.classList.add("tremble");
    setTimeout(() => champ.classList.remove("tremble"), 450);
  };
  const face = async () => {
    try { await demanderFaceId(); entrer(); } catch { err.textContent = "Face ID n'a pas abouti. Utilise ton mot de passe."; }
  };
  ecran([logoMini(), h("h1", {}, `Bonjour ${S.profil.prenom}`), h("p", { class: "sous" }, "Déverrouille SM."),
    S.faceid && h("button", { class: "faceid", icone: I.face, "aria-label": "Déverrouiller avec Face ID", onclick: face }),
    h("form", { onsubmit: valider }, h("label", { class: "champ" }, champ), err, h("button", { class: "bouton", type: "submit" }, "Déverrouiller"))], true);
  if (S.faceid) face();
}

/* ---------- Onglets ---------- */
const ONGLETS = [["accueil", "Accueil", vueAccueil], ["investir", "Investir", vueInvestir], ["bourse", "Bourse", vueBourse], ["reves", "Rêves", vueReves], ["reglages", "Réglages", vueReglages]];
let onglet = "accueil";
let deverrouille = false;
function entrer() {
  deverrouille = true;
  const nav = document.getElementById("tabs");
  const bulle = h("i", { class: "bulle" });
  nav.replaceChildren(bulle, ...ONGLETS.map(([id, nom]) => h("button", { class: "tab", "data-id": id, onclick: () => aller(id) }, h("span", { icone: I[id] }), nom)));
  aller(onglet);
}
function aller(id) {
  onglet = id;
  const n = ONGLETS.findIndex((o) => o[0] === id);
  document.querySelector("#tabs .bulle").style.transform = `translateX(${n * 100}%)`;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("actif", t.dataset.id === id));
  ONGLETS[n][2]();
}
function segment(options, actifId, surChoix) {
  const n = options.length, i = Math.max(0, options.findIndex((o) => o[0] === actifId));
  const curseur = h("i", { class: "curseur" });
  curseur.style.width = `calc((100% - 6px) / ${n})`;
  curseur.style.transform = `translateX(${i * 100}%)`;
  return h("div", { class: "segment" }, curseur, options.map(([id, nom], k) => h("button", { class: k === i ? "actif" : "", onclick: () => surChoix(id) }, nom)));
}

/* Accueil */
function vueAccueil() {
  const tous = S.investissements;
  const b = bilan(tous), bm = bilan(mesInv(moi())), ba = bilan(mesInv(autre())), bc = bilan(invCommun());
  const montant = h("div", { class: "montant" }, euros(0));
  const reve = S.objectifs[0];
  const ligneCompte = (ic, nom, sous, bl, vers) => h("button", { class: "carte", onclick: vers },
    h("div", { class: "compte" }, h("div", { class: "icone", icone: ic }),
      h("div", { class: "milieu" }, h("div", { class: "nom" }, nom), h("div", { class: "sous" }, sous)),
      h("div", { class: "droite" }, euros(bl.val), bl.investi ? h("small", { class: bl.gain >= 0 ? "hausse" : "baisse" }, pct(bl.pct)) : null)));
  const items = COURS.actifs.map((a) => h("span", { class: "defile-item" }, h("b", {}, a.nom), h("span", { class: varJour(a) >= 0 ? "hausse" : "baisse" }, pct(varJour(a)))));
  const noeuds = [
    h("div", { class: "bonjour" }, h("div", { class: "avatar" }, S.profil.prenom[0]), h("div", {}, h("div", { class: "sous" }, "Bonjour"), h("strong", {}, S.profil.prenom))),
    h("div", { class: "solde" }, h("div", { class: "sous" }, "Total suivi à deux"), montant, b.investi ? h("span", { class: "gain " + (b.gain >= 0 ? "hausse" : "baisse") }, `${b.gain >= 0 ? "+" : ""}${euros(b.gain)} · ${pct(b.pct)}`) : null),
    h("div", { class: "actions" },
      h("button", { class: "pastille forte", onclick: () => feuilleAjout("perso") }, h("span", { icone: I.plus }), "Ajouter"),
      h("button", { class: "pastille", onclick: () => { vueCompte = "commun"; aller("investir"); } }, h("span", { icone: I.commun }), "Commun"),
      h("button", { class: "pastille", onclick: () => aller("reves") }, h("span", { icone: I.reves }), "Rêves")),
    items.length ? h("div", { class: "defile" }, h("div", { class: "defile-piste" }, items, items.map((x) => x.cloneNode(true)))) : null,
    h("p", { class: "section" }, "Comptes"),
    h("div", { class: "pile" },
      ligneCompte(I.personne, "Mon portefeuille", S.profil.prenom, bm, () => { vueCompte = "moi"; aller("investir"); }),
      ligneCompte(I.personne, `Portefeuille de ${PERSONNES[autre()]}`, "Ce que l'autre a mis", ba, () => { vueCompte = "autre"; aller("investir"); }),
      ligneCompte(I.commun, "Compte commun", "Shaina et Marcus", bc, () => { vueCompte = "commun"; aller("investir"); })),
    reve ? h("p", { class: "section" }, "Prochain rêve") : null,
    reve ? carteReve(reve) : null,
  ];
  ecran(noeuds.filter(Boolean));
  compteur(montant, b.val, (v) => euros(v));
}

/* Investir */
let vueCompte = "moi";
function vueInvestir() {
  const liste = vueCompte === "moi" ? mesInv(moi()) : vueCompte === "autre" ? mesInv(autre()) : invCommun();
  const b = bilan(liste);
  const montant = h("div", { class: "montant" }, euros(0));
  const modifiable = vueCompte !== "autre";
  const lignes = [...liste].sort((x, y) => y.date.localeCompare(x.date)).map((inv) => {
    const a = actif(inv.actif), v = valeur(inv), g = (v / inv.montant - 1) * 100;
    const sous = `${dateFr(inv.date)}${inv.compte === "commun" ? " · " + PERSONNES[inv.owner] : ""}`;
    return h("button", { class: "carte", onclick: () => feuilleDetailInv(inv) },
      h("div", { class: "compte" }, h("div", { class: "milieu" }, h("div", { class: "nom tronque" }, a ? a.nom : "Épargne"), h("div", { class: "sous" }, sous)),
        h("div", { class: "droite" }, euros(v, 2), h("small", { class: g >= 0 ? "hausse" : "baisse" }, pct(g)))));
  });
  ecran([
    h("h1", { class: "titre" }, "Investir"),
    segment([["moi", "Moi"], ["autre", PERSONNES[autre()]], ["commun", "Commun"]], vueCompte, (id) => { vueCompte = id; vueInvestir(); }),
    h("div", { class: "solde" }, h("div", { class: "sous" }, vueCompte === "commun" ? "Valeur du compte commun" : "Valeur du portefeuille"), montant,
      b.investi ? h("span", { class: "gain " + (b.gain >= 0 ? "hausse" : "baisse") }, `Investi ${euros(b.investi)} · ${pct(b.pct)}`) : null),
    modifiable ? h("div", { class: "actions" }, h("button", { class: "pastille forte", onclick: () => feuilleAjout(vueCompte === "commun" ? "commun" : "perso") }, h("span", { icone: I.plus }), "Ajouter")) : null,
    vueCompte === "commun" ? partsCommun() : null,
    h("p", { class: "section" }, "Lignes"),
    lignes.length ? h("div", { class: "pile" }, lignes) : h("p", { class: "note" }, modifiable ? "Rien pour l'instant. Ajoute ta première ligne." : `Rien de reçu de ${PERSONNES[autre()]}. Passe par Réglages pour échanger vos chiffres.`),
    h("p", { class: "note", style: "margin-top:16px" }, "Suivi uniquement. Aucun argent réel ne passe par l'appli : tu notes ici ce que tu investis chez ton courtier."),
  ].filter(Boolean));
  compteur(montant, b.val, (v) => euros(v));
}
function partsCommun() {
  const l = invCommun(), tot = l.reduce((t, i) => t + i.montant, 0);
  if (!tot) return null;
  const part = (q) => l.filter((i) => i.owner === q).reduce((t, i) => t + i.montant, 0);
  const pm = part("marcus"), barre = h("i");
  requestAnimationFrame(() => requestAnimationFrame(() => { barre.style.width = (pm / tot) * 100 + "%"; }));
  return h("div", { class: "carte" }, h("div", { class: "ligne sous" }, h("span", {}, `Marcus ${euros(pm)}`), h("span", {}, `Shaina ${euros(part("shaina"))}`)), h("div", { class: "barre" }, barre));
}
function feuilleAjout(compte) {
  const sel = h("select", { "aria-label": "Placement" }, h("option", { value: "cash" }, "Épargne (sans cours)"), COURS.actifs.filter((a) => a.famille !== "devise").map((a) => h("option", { value: a.id }, a.nom)));
  const mt = h("input", { inputmode: "decimal", placeholder: "0", "aria-label": "Montant en euros" });
  const dt = h("input", { type: "date", value: auj(), max: auj(), "aria-label": "Date" });
  const err = h("p", { class: "erreur" });
  feuille([h("h2", {}, compte === "commun" ? "Ajouter au commun" : "Ajouter à mon portefeuille"),
    h("form", { onsubmit: (e) => {
      e.preventDefault();
      const m = lireMontant(mt.value);
      if (!(m > 0 && m <= 1e9)) { err.textContent = "Indique un montant valide."; return; }
      if (!dt.value || dt.value > auj()) { err.textContent = "Indique une date valide."; return; }
      S.investissements.push({ id: uid(), owner: moi(), compte, actif: sel.value, montant: m, date: dt.value, maj: Date.now() });
      sauver(); fermerFeuille(); toast("Ajouté"); aller(onglet);
    } }, h("label", { class: "champ" }, "Placement", sel), h("label", { class: "champ" }, "Montant (€)", mt), h("label", { class: "champ" }, "Date", dt), err, h("button", { class: "bouton", type: "submit" }, "Ajouter"))]);
}
function feuilleDetailInv(inv) {
  const a = actif(inv.actif), v = valeur(inv), mien = inv.owner === moi();
  feuille([h("h2", {}, a ? a.nom : "Épargne"),
    h("div", { class: "carte pile" }, h("div", { class: "ligne" }, h("span", { class: "sous" }, "Investi"), h("b", {}, euros(inv.montant, 2))), h("div", { class: "ligne" }, h("span", { class: "sous" }, "Valeur estimée"), h("b", {}, euros(v, 2))), h("div", { class: "ligne" }, h("span", { class: "sous" }, "Date"), h("b", {}, dateFr(inv.date))), h("div", { class: "ligne" }, h("span", { class: "sous" }, "Ajouté par"), h("b", {}, PERSONNES[inv.owner]))),
    a && a.devise !== "EUR" ? h("p", { class: "note", style: "margin-top:12px" }, "Estimation sur la variation du cours, sans l'effet du taux de change.") : null,
    h("div", { style: "height:14px" }),
    mien ? h("button", { class: "bouton danger", onclick: () => {
      S.investissements = S.investissements.filter((i) => i.id !== inv.id);
      S.supprimes.push(inv.id); sauver(); fermerFeuille(); toast("Supprimé"); aller(onglet);
    } }, "Supprimer cette ligne") : null].filter(Boolean));
}

/* Bourse */
let filtre = "tout";
function vueBourse() {
  const familles = [["tout", "Tout"], ["indice", "Indices"], ["action", "Actions"], ["crypto", "Crypto"], ["etf", "ETF"], ["matiere", "Or"], ["devise", "Devises"]];
  const liste = COURS.actifs.filter((a) => filtre === "tout" || a.famille === filtre);
  const maj = COURS.maj ? new Date(COURS.maj.replace("Z", ":00Z")).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : null;
  ecran([
    h("h1", { class: "titre" }, "Bourse"),
    h("div", { class: "puces" }, familles.map(([id, nom]) => h("button", { class: "puce" + (id === filtre ? " actif" : ""), onclick: () => { filtre = id; vueBourse(); } }, nom))),
    liste.length ? h("div", { class: "pile" }, liste.map((a) => h("button", { class: "carte", onclick: () => feuilleActif(a) },
      h("div", { class: "compte" }, h("div", { class: "milieu" }, h("div", { class: "nom tronque" }, a.nom), h("div", { class: "sous" }, a.type)), spark(a.serie.slice(-30)),
        h("div", { class: "cours" }, prix(a), h("small", { class: varJour(a) >= 0 ? "hausse" : "baisse" }, pct(varJour(a)))))))) : h("p", { class: "note" }, "Cours indisponibles pour l'instant. Reconnecte-toi au réseau."),
    h("p", { class: "note", style: "margin-top:16px" }, `${maj ? "Mis à jour le " + maj + ". " : ""}Cours de clôture quotidiens, source Yahoo Finance. Information seulement, pas un conseil d'investissement.`),
  ]);
}
function feuilleActif(a) {
  const zone = h("div");
  const info = h("div", { class: "solde" });
  const periodes = [["1M", 22], ["3M", 66], ["6M", 130], ["1A", 9999]];
  let choisi = "3M";
  const dessiner = () => {
    const n = periodes.find((p) => p[0] === choisi)[1];
    const serie = a.serie.slice(-n), v0 = serie[0][1], v1 = serie[serie.length - 1][1];
    const montrer = (d, v) => info.replaceChildren(h("div", { class: "montant" }, nombre(v)), h("div", { class: "sous" }, dateFr(d)), h("span", { class: "gain " + (v >= v0 ? "hausse" : "baisse") }, pct((v / v0 - 1) * 100)));
    montrer(...serie[serie.length - 1]);
    zone.replaceChildren(graphe(serie, montrer), segment(periodes.map((p) => [p[0], p[0]]), choisi, (id) => { choisi = id; dessiner(); }));
  };
  feuille([h("h2", {}, a.nom), info, zone]);
  dessiner();
}
function graphe(serie, surPoint) {
  const W = 340, H = 200, v = serie.map((x) => x[1]), min = Math.min(...v), max = Math.max(...v), e = max - min || 1;
  const X = (i) => (i / (v.length - 1)) * W, Y = (y) => H - 8 - ((y - min) / e) * (H - 16);
  const d = v.map((y, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(y).toFixed(1)}`).join("");
  const coul = v[v.length - 1] >= v[0] ? "var(--vert)" : "var(--rouge)";
  const svg = s("svg", { class: "graphe", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
  const defs = s("defs"), lg = s("linearGradient", { id: "aire", x1: 0, y1: 0, x2: 0, y2: 1 });
  const a = s("stop", { offset: 0, "stop-color": coul, "stop-opacity": .3 }), b = s("stop", { offset: 1, "stop-color": coul, "stop-opacity": 0 });
  lg.append(a, b); defs.append(lg);
  const ligneV = s("line", { class: "curseur-v", y1: 0, y2: H, x1: 0, x2: 0, opacity: 0 });
  svg.append(defs, s("path", { class: "aire", d: `${d}L${W} ${H}L0 ${H}Z`, fill: "url(#aire)" }), s("path", { class: "courbe", d, pathLength: 1, stroke: coul }), ligneV);
  const suivre = (ev) => {
    const r = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(v.length - 1, Math.round(((ev.clientX - r.left) / r.width) * (v.length - 1))));
    ligneV.setAttribute("x1", X(i)); ligneV.setAttribute("x2", X(i)); ligneV.setAttribute("opacity", 1);
    surPoint(serie[i][0], serie[i][1]);
  };
  svg.addEventListener("pointerdown", suivre);
  svg.addEventListener("pointermove", (ev) => { if (ev.buttons || ev.pointerType === "touch") suivre(ev); });
  return svg;
}

/* Rêves */
const totalReve = (o) => o.versements.reduce((t, x) => t + x.montant, 0);
function moisRestants(o) {
  if (!o.echeance) return null;
  const a = new Date(), b = new Date(o.echeance + "T12:00:00");
  return Math.max(1, Math.ceil((b - a) / (30.44 * 864e5)));
}
function anneau(o) {
  const p = Math.min(100, (totalReve(o) / o.cible) * 100);
  const svg = s("svg", { viewBox: "0 0 74 74" });
  const niveau = s("circle", { class: "niveau", cx: 37, cy: 37, r: 33, pathLength: 100 });
  svg.append(s("circle", { class: "piste", cx: 37, cy: 37, r: 33 }), niveau);
  requestAnimationFrame(() => requestAnimationFrame(() => { niveau.style.strokeDashoffset = 100 - p; }));
  return h("div", { class: "anneau" }, svg, o.emoji || "✈️");
}
function carteReve(o) {
  const t = totalReve(o), reste = Math.max(0, o.cible - t), m = moisRestants(o);
  return h("button", { class: "carte", onclick: () => feuilleReve(o) }, h("div", { class: "reve" }, anneau(o),
    h("div", { class: "milieu", style: "min-width:0" }, h("div", { class: "nom tronque", style: "font-weight:650" }, o.titre),
      h("div", { class: "sous tronque" }, `${euros(t)} sur ${euros(o.cible)}`),
      h("div", { class: "sous tronque" }, reste === 0 ? "Objectif atteint 🎉" : m ? `${euros(reste / m)} par mois pendant ${m} mois` : `Encore ${euros(reste)}`))));
}
function vueReves() {
  ecran([
    h("div", { class: "ligne" }, h("h1", { class: "titre" }, "Rêves"), h("button", { class: "pastille forte", "aria-label": "Nouveau rêve", onclick: feuilleNouveauReve }, h("span", { icone: I.plus }))),
    S.objectifs.length ? h("div", { class: "pile" }, S.objectifs.map(carteReve)) : h("p", { class: "note" }, "Voyage, maison, projet : ajoute votre premier rêve et ce qu'il faut mettre de côté."),
  ]);
}
function feuilleNouveauReve() {
  const emojis = ["✈️", "🏝️", "🏔️", "🏠", "🚗", "💍"];
  let emoji = emojis[0];
  const titre = h("input", { placeholder: "Bali à deux", maxlength: 60, "aria-label": "Nom du rêve" });
  const lieu = h("input", { placeholder: "Indonésie", maxlength: 60, "aria-label": "Destination" });
  const cible = h("input", { inputmode: "decimal", placeholder: "4000", "aria-label": "Montant à économiser" });
  const ech = h("input", { type: "date", min: auj(), "aria-label": "Date visée" });
  const err = h("p", { class: "erreur" });
  const puces = h("div", { class: "puces" }, emojis.map((e, i) => h("button", { type: "button", class: "puce" + (i ? "" : " actif"), onclick: (ev) => { emoji = e; [...puces.children].forEach((c) => c.classList.remove("actif")); ev.currentTarget.classList.add("actif"); } }, e)));
  feuille([h("h2", {}, "Nouveau rêve"), puces,
    h("form", { onsubmit: (e) => {
      e.preventDefault();
      const c = lireMontant(cible.value);
      if (!titre.value.trim()) { err.textContent = "Donne un nom à ce rêve."; return; }
      if (!(c > 0 && c <= 1e9)) { err.textContent = "Indique le montant à économiser."; return; }
      S.objectifs.unshift({ id: uid(), titre: titre.value.trim(), lieu: lieu.value.trim(), emoji, cible: c, echeance: ech.value || null, versements: [], taches: [], maj: Date.now() });
      sauver(); fermerFeuille(); aller("reves");
    } }, h("label", { class: "champ" }, "Le rêve", titre), h("label", { class: "champ" }, "Destination", lieu), h("label", { class: "champ" }, "Combien économiser (€)", cible), h("label", { class: "champ" }, "Pour quand", ech), err, h("button", { class: "bouton", type: "submit" }, "Créer le rêve"))]);
}
function feuilleReve(o) {
  const mt = h("input", { inputmode: "decimal", placeholder: "Montant (€)", "aria-label": "Montant à ajouter" });
  const tx = h("input", { placeholder: "Réserver les billets", maxlength: 80, "aria-label": "Nouvelle chose à faire" });
  const toucher = () => { o.maj = Date.now(); sauver(); };
  const barre = h("i");
  const pourc = Math.min(100, (totalReve(o) / o.cible) * 100);
  requestAnimationFrame(() => requestAnimationFrame(() => { barre.style.width = pourc + "%"; }));
  feuille([h("h2", {}, `${o.emoji} ${o.titre}`),
    h("p", { class: "sous" }, [o.lieu, o.echeance && dateFr(o.echeance)].filter(Boolean).join(" · ")),
    h("div", { class: "carte", style: "margin:12px 0" }, h("div", { class: "ligne" }, h("b", {}, euros(totalReve(o))), h("span", { class: "sous" }, `sur ${euros(o.cible)}`)), h("div", { class: "barre" }, barre)),
    h("form", { class: "ligne", style: "align-items:stretch", onsubmit: (e) => {
      e.preventDefault();
      const m = lireMontant(mt.value);
      if (!(m > 0 && m <= 1e9)) { toast("Indique un montant valide."); return; }
      o.versements.push({ id: uid(), owner: moi(), montant: m, date: auj() });
      toucher(); feuilleReve(o); aller(onglet);
    } }, h("label", { class: "champ", style: "flex:1;margin:0" }, mt), h("button", { class: "bouton", style: "width:110px", type: "submit" }, "Mettre")),
    h("p", { class: "section" }, "À faire"),
    h("div", {}, o.taches.map((t) => h("button", { class: "tache" + (t.fait ? " faite" : ""), onclick: (e) => { t.fait = !t.fait; toucher(); e.currentTarget.classList.toggle("faite", t.fait); } }, h("span", { class: "coche" }, "✓"), h("span", { class: "texte" }, t.texte)))),
    h("form", { class: "ligne", style: "align-items:stretch;margin-top:10px", onsubmit: (e) => {
      e.preventDefault();
      if (!tx.value.trim()) return;
      o.taches.push({ id: uid(), texte: tx.value.trim(), fait: false });
      toucher(); feuilleReve(o);
    } }, h("label", { class: "champ", style: "flex:1;margin:0" }, tx), h("button", { class: "bouton discret", style: "width:110px", type: "submit" }, "Ajouter")),
    h("div", { style: "height:14px" }),
    h("button", { class: "bouton danger", onclick: () => {
      if (!confirm("Supprimer ce rêve ?")) return;
      S.objectifs = S.objectifs.filter((x) => x.id !== o.id);
      S.supprimes.push(o.id); sauver(); fermerFeuille(); aller(onglet);
    } }, "Supprimer ce rêve")]);
}

/* Réglages */
function vueReglages() {
  const inter = (on, fn) => h("span", { class: "interrupteur" + (on ? " on" : "") , onclick: fn });
  const fichier = h("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: importer });
  const blocFace = h("div", { class: "reglage" }, h("span", {}, "Face ID"), inter(!!S.faceid, async () => {
    if (S.faceid) { S.faceid = null; sauver(); vueReglages(); return; }
    if (!(await faceIdDispo())) { toast("Face ID n'est pas disponible ici."); return; }
    try { await activerFaceId(); toast("Face ID activé"); } catch { toast("Face ID n'a pas été activé."); }
    vueReglages();
  }));
  ecran([
    h("h1", { class: "titre" }, "Réglages"),
    h("div", { class: "carte" }, h("div", { class: "compte" }, h("div", { class: "avatar" }, S.profil.prenom[0]), h("div", {}, h("div", { class: "nom" }, S.profil.nom), h("div", { class: "sous" }, "Données gardées sur ce téléphone")))),
    h("p", { class: "section" }, "Apparence"),
    h("div", { class: "carte" },
      segment([["noir", "Noir"], ["blanc", "Blanc"]], S.prefs.theme, (id) => { S.prefs.theme = id; sauver(); appliquerPrefs(); vueReglages(); }),
      h("div", { class: "reglage" }, h("span", {}, "Couleur"), h("div", { class: "couleurs" },
        [["lime", "#c8ff2e", "Vert lime"], ["turquoise", "#19e3c8", "Bleu turquoise"]].map(([id, c, nom]) => h("button", { class: "couleur" + (S.prefs.accent === id ? " actif" : ""), style: `background:${c}`, "aria-label": nom, onclick: () => { S.prefs.accent = id; sauver(); appliquerPrefs(); vueReglages(); } })))),
      h("div", { class: "reglage" }, h("span", {}, "Fond animé"), inter(S.prefs.fond, () => { S.prefs.fond = !S.prefs.fond; sauver(); appliquerPrefs(); vueReglages(); }))),
    h("p", { class: "section" }, "Sécurité"),
    h("div", { class: "carte" }, blocFace,
      h("button", { class: "reglage", onclick: feuilleChangerMdp }, h("span", {}, "Changer le mot de passe"), h("span", { class: "sous" }, "›")),
      h("button", { class: "reglage", onclick: verrouiller }, h("span", {}, "Verrouiller maintenant"), h("span", { class: "sous" }, "›"))),
    h("p", { class: "section" }, `Échanger avec ${PERSONNES[autre()]}`),
    h("div", { class: "carte" },
      h("button", { class: "reglage", onclick: exporter }, h("span", {}, "Envoyer mes chiffres"), h("span", { class: "sous" }, "›")),
      h("button", { class: "reglage", onclick: () => fichier.click() }, h("span", {}, "Recevoir ses chiffres"), h("span", { class: "sous" }, "›")), fichier),
    h("p", { class: "note", style: "margin-top:12px" }, "Le fichier contient vos chiffres et vos rêves, jamais ton mot de passe. Envoie-le seulement à la bonne personne."),
    h("div", { style: "height:14px" }),
    h("button", { class: "bouton danger", onclick: () => {
      if (!confirm("Effacer toutes les données de ce téléphone ? C'est définitif.")) return;
      localStorage.removeItem(CLE); location.reload();
    } }, "Effacer ce téléphone"),
  ]);
}
function feuilleChangerMdp() {
  const a = h("input", { type: "password", autocomplete: "current-password", "aria-label": "Mot de passe actuel" });
  const b = h("input", { type: "password", autocomplete: "new-password", placeholder: "8 caractères minimum", "aria-label": "Nouveau mot de passe" });
  const err = h("p", { class: "erreur" });
  feuille([h("h2", {}, "Changer le mot de passe"), h("form", { onsubmit: async (e) => {
    e.preventDefault();
    if (!(await verifierMdp(a.value))) { err.textContent = "Mot de passe actuel incorrect."; return; }
    if (b.value.length < 8) { err.textContent = "Il faut au moins 8 caractères."; return; }
    await definirMdp(b.value); fermerFeuille(); toast("Mot de passe changé");
  } }, h("label", { class: "champ" }, "Actuel", a), h("label", { class: "champ" }, "Nouveau", b), err, h("button", { class: "bouton", type: "submit" }, "Changer"))]);
}
function verrouiller() {
  deverrouille = false;
  const f = document.getElementById("feuille");
  f.hidden = true; f.classList.remove("ouverte"); f.replaceChildren();
  ecranVerrou();
}

/* Échange de fichiers entre les deux téléphones */
async function exporter() {
  const donnees = { app: "sm", version: 1, de: moi(), investissements: S.investissements.filter((i) => i.owner === moi()), objectifs: S.objectifs, supprimes: S.supprimes };
  const nom = `sm-${moi()}-${auj()}.json`;
  const fichier = new File([JSON.stringify(donnees)], nom, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) { await navigator.share({ files: [fichier], title: "Mes chiffres SM" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const lien = h("a", { href: URL.createObjectURL(fichier), download: nom });
  lien.click();
  URL.revokeObjectURL(lien.href);
  toast("Fichier enregistré");
}
const estDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const texte = (t, n) => (typeof t === "string" ? t.slice(0, n) : "");
const montantOk = (m) => typeof m === "number" && m > 0 && m <= 1e9;
function nettoyerInv(i, de) {
  if (!i || typeof i.id !== "string" || !montantOk(i.montant) || !estDate(i.date) || !["perso", "commun"].includes(i.compte)) return null;
  return { id: texte(i.id, 40), owner: de, compte: i.compte, actif: texte(i.actif, 20) || "cash", montant: i.montant, date: i.date, maj: Number(i.maj) || 0 };
}
function nettoyerReve(o) {
  if (!o || typeof o.id !== "string" || !montantOk(o.cible)) return null;
  const vers = (Array.isArray(o.versements) ? o.versements : []).filter((v) => v && montantOk(v.montant) && PERSONNES[v.owner] && estDate(v.date)).map((v) => ({ id: texte(v.id, 40), owner: v.owner, montant: v.montant, date: v.date }));
  const taches = (Array.isArray(o.taches) ? o.taches : []).filter((t) => t && typeof t.texte === "string").map((t) => ({ id: texte(t.id, 40), texte: texte(t.texte, 80), fait: !!t.fait }));
  return { id: texte(o.id, 40), titre: texte(o.titre, 60) || "Rêve", lieu: texte(o.lieu, 60), emoji: texte(o.emoji, 8) || "✈️", cible: o.cible, echeance: estDate(o.echeance) ? o.echeance : null, versements: vers, taches, maj: Number(o.maj) || 0 };
}
async function importer(ev) {
  const f = ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  try {
    if (f.size > 2e6) throw new Error("taille");
    const d = JSON.parse(await f.text());
    if (d.app !== "sm" || d.de !== autre() || !Array.isArray(d.investissements) || !Array.isArray(d.objectifs)) throw new Error("format");
    const recus = d.investissements.map((i) => nettoyerInv(i, autre())).filter(Boolean);
    S.investissements = S.investissements.filter((i) => i.owner !== autre()).concat(recus);
    const supprimes = new Set([...S.supprimes, ...(Array.isArray(d.supprimes) ? d.supprimes.filter((x) => typeof x === "string") : [])]);
    const parId = new Map(S.objectifs.map((o) => [o.id, o]));
    for (const brut of d.objectifs) {
      const o = nettoyerReve(brut);
      if (o && (!parId.has(o.id) || o.maj > parId.get(o.id).maj)) parId.set(o.id, o);
    }
    S.objectifs = [...parId.values()].filter((o) => !supprimes.has(o.id));
    S.supprimes = [...supprimes].slice(-500);
    sauver();
    toast(`Chiffres de ${PERSONNES[autre()]} reçus`);
  } catch { toast(`Ce fichier ne vient pas de ${PERSONNES[autre()]}.`); }
}

/* ---------- Démarrage ---------- */
let cacheDepuis = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { cacheDepuis = Date.now(); return; }
  if (deverrouille && S.auth && Date.now() - cacheDepuis > VERROU_APRES_MS) verrouiller();
  else if (deverrouille) chargerCours();
});

async function demarrer() {
  appliquerPrefs();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  const attente = new Promise((r) => setTimeout(r, calme() ? 300 : 2150));
  await Promise.all([chargerCours(), attente]);
  const sp = document.getElementById("splash");
  sp.classList.add("sortie");
  setTimeout(() => sp.remove(), 650);
  if (!S.profil) ecranBienvenue();
  else if (!S.auth) ecranMdp();
  else ecranVerrou();
}
demarrer();
