// Contenu du jeu : tout ce qui est "données" vit ici pour faciliter les ajouts.
// Les textes (noms, descriptions, notes) sont dans js/i18n.js, en français et en anglais (v10).

const COST_GROWTH = 1.15;

const GENERATORS = [
  { id: 'hyphe', icon: '〰️', color: '#e9dcc4', baseCost: 15, baseProd: 0.1 },
  { id: 'rhizo', icon: '🪢', color: '#d8b98a', baseCost: 100, baseProd: 1 },
  { id: 'litiere', icon: '🍄', color: '#e8945f', baseCost: 900, baseProd: 8 },   // v10 : 1100 → 900 (premières minutes)
  { id: 'myco', icon: '🌳', color: '#9fd8a8', baseCost: 8500, baseProd: 47 },  // v10 : 12000 → 8500 (1re mycorhize avant 10 min)
  { id: 'termites', icon: '🐜', color: '#c9a36b', baseCost: 130000, baseProd: 260 },
  { id: 'wwweb', icon: '🕸️', color: '#a7c7ff', baseCost: 1.4e6, baseProd: 1400 },
  { id: 'lumi', icon: '✨', color: '#c6ff9e', baseCost: 20e6, baseProd: 7800 },
  { id: 'continent', icon: '🌍', color: '#ffd27a', baseCost: 330e6, baseProd: 44000 },
  // V6 : fin de partie
  { id: 'lichen', icon: '🪨', color: '#c4d2a6', baseCost: 1e14, baseProd: 2e8 },
  { id: 'abysses', icon: '🌊', color: '#74cfc6', baseCost: 1e16, baseProd: 6e9 },
  { id: 'gaia', icon: '🌌', color: '#e6d8ff', baseCost: 2e18, baseProd: 2e11 },
];

const LATE_GENS = ['lichen', 'abysses', 'gaia'];  // générateurs de fin de partie (V6)

// Saisons : multiplicateurs par générateur (1 par défaut)
const SEASON_DURATION = 90; // secondes
const SEASONS = [
  { id: 'printemps', tint: 'rgba(140, 220, 120, 0.07)',
    mult: { hyphe: 1.5, rhizo: 1.5 }, sugar: 1.2 },
  { id: 'ete', tint: 'rgba(255, 210, 110, 0.06)',
    mult: { myco: 1.5, lumi: 0.8, litiere: 0.8 }, sugar: 2, droughtChance: 0.5 },
  { id: 'automne', tint: 'rgba(230, 120, 60, 0.09)',
    mult: { litiere: 2, termites: 1.25 }, sugar: 1, droughtChance: 0.15 },
  { id: 'hiver', tint: 'rgba(150, 190, 255, 0.08)',
    mult: { hyphe: 0.75, rhizo: 0.75, litiere: 0.5, myco: 0.75, lumi: 1.5, lichen: 1.5 }, sugar: 0.3 },
];

// Améliorations
// type: 'gen' (multiplie un générateur), 'click', 'global'
const GEN_TIERS = [
  { at: 1,   costMul: 10, mult: 2 },
  { at: 10,  costMul: 60, mult: 2 },
  { at: 25,  costMul: 600, mult: 2 },
  { at: 50,  costMul: 6000, mult: 3 },
  { at: 100, costMul: 6e5, mult: 3 },
];

const UPGRADES = [];
GENERATORS.forEach(g => {
  GEN_TIERS.forEach((t, i) => {
    UPGRADES.push({
      id: `${g.id}_t${i}`, type: 'gen', target: g.id, mult: t.mult,
      tier: i, at: t.at,
      cost: g.baseCost * t.costMul,
      // On ne dévoile que les évolutions des générateurs déjà possédés
      teasable: s => s.gens[g.id] > 0,
      req: s => s.gens[g.id] >= t.at,
    });
  });
});

[
  { id: 'click0', cost: 50,    pct: 0,    flat: 1 },
  { id: 'click1', cost: 600,   pct: 0.01 },
  { id: 'click2', cost: 8000,  pct: 0.02 },
  { id: 'click3', cost: 2e5,   pct: 0.03 },
  { id: 'click4', cost: 5e6,   pct: 0.04 },
].forEach((c, i) => UPGRADES.push({
  ...c, type: 'click', flat: c.flat || 0,
  clicks: [10, 50, 150, 400, 1000][i],
  req: s => s.stats.clicks >= [10, 50, 150, 400, 1000][i],
}));

[
  // v11 : seuils sur le total depuis toujours (il n'y a plus de cycle)
  { id: 'g0', cost: 5000,  mult: 1.1, need: 2000, req: s => s.stats.allTimeEarned >= 2000 },
  { id: 'g1', cost: 1e5,   mult: 1.15, need: 5e4, req: s => s.stats.allTimeEarned >= 5e4 },
  { id: 'g2', cost: 5e6,   mult: 1.2, need: 2e6, req: s => s.stats.allTimeEarned >= 2e6 },
  { id: 'g3', cost: 2e8,   mult: 1.25, need: 1e8, req: s => s.stats.allTimeEarned >= 1e8 },
  { id: 'g4', cost: 1e12,  mult: 1.3, need: 5e11, req: s => s.stats.allTimeEarned >= 5e11 },
  { id: 'g5', cost: 1e15,  mult: 1.5, need: 5e14, req: s => s.stats.allTimeEarned >= 5e14 },
  { id: 'rain0', cost: 20000, type: 'rain', req: s => s.stats.dropsClicked >= 3 },
  { id: 'season0', cost: 3e5, type: 'season', req: s => s.stats.seasonsSeen >= 4 },
].forEach(u => UPGRADES.push({ type: 'global', ...u }));

// Jalons (achievements) : +2 % de production chacun
const ACHIEVEMENTS = [
  { id: 'a_click1', check: s => s.stats.clicks >= 1 },
  { id: 'a_click100', check: s => s.stats.clicks >= 100 },
  { id: 'a_click1000', check: s => s.stats.clicks >= 1000 },
  { id: 'a_h10', check: s => s.gens.hyphe >= 10 },
  { id: 'a_h50', check: s => s.gens.hyphe >= 50 },
  { id: 'a_myco1', check: s => s.gens.myco >= 1 },
  { id: 'a_www', check: s => s.gens.wwweb >= 1 },
  { id: 'a_cont', check: s => s.gens.continent >= 1 },
  { id: 'a_nps10', check: (s, g) => g.nps() >= 10 },
  { id: 'a_nps1k', check: (s, g) => g.nps() >= 1000 },
  { id: 'a_nps1m', check: (s, g) => g.nps() >= 1e6 },
  { id: 'a_tot1m', check: s => s.stats.allTimeEarned >= 1e6 },
  { id: 'a_tot1md', check: s => s.stats.allTimeEarned >= 1e9 },
  { id: 'a_drop1', check: s => s.stats.dropsClicked >= 1 },
  { id: 'a_drop25', check: s => s.stats.dropsClicked >= 25 },
  { id: 'a_year', check: s => s.stats.seasonsSeen >= 4 },
  { id: 'a_spore', check: s => s.spores >= 1 },   // v11 : « Première spore » (avant : sporuler une fois)
  { id: 'a_spore10', check: s => s.spores >= 10 },
  { id: 'a_sugar1', check: s => s.stats.sugarEarned >= 100 },
  { id: 'a_sugarAll', check: s => SUGAR_UPGRADES.every(u => s.sugarUpg && s.sugarUpg[u.id]) },
  { id: 'a_boar1', check: s => s.stats.boars >= 1 },
  { id: 'a_boar10', check: s => s.stats.boars >= 10 },
  { id: 'a_drought', check: s => s.stats.droughts >= 1 },
  { id: 'a_species', check: s => s.species && s.species !== 'commun' },
  { id: 'a_chal1', check: s => Object.keys(s.challengesDone || {}).length >= 1 },
  { id: 'a_chalAll', check: s => CHALLENGES.every(c => s.challengesDone && s.challengesDone[c.id]) },
  { id: 'a_talent1', check: s => Object.keys(s.talents || {}).length >= 1 },
  { id: 'a_talentAll', check: s => TALENTS.every(t => s.talents && s.talents[t.id]) },
  // V6
  { id: 'a_lichen', check: s => s.gens.lichen >= 1 },
  { id: 'a_abysses', check: s => s.gens.abysses >= 1 },
  { id: 'a_gaia', check: s => s.gens.gaia >= 1 },
  { id: 'a_nps1md', check: (s, g) => g.nps() >= 1e9 },
  { id: 'a_rival1', check: s => s.stats.rivals >= 1 },
  { id: 'a_rival10', check: s => s.stats.rivals >= 10 },
  { id: 'a_flush25', check: s => s.stats.flushPicked >= 25 },
  { id: 'a_fossil1', check: s => s.amber >= 1 },
  { id: 'a_amber10', check: s => s.amber >= 10 },
  { id: 'a_relicAll', check: s => RELICS.every(r => s.relics && s.relics[r.id]) },
  // V9 : herbier
  { id: 'a_herb1', check: s => herbSpecies(s) >= 1 },
  { id: 'a_herb6', check: s => herbSpecies(s) >= 6 },
  { id: 'a_herbAll', check: s => herbSpecies(s) >= SPECIMENS.length },
  { id: 'a_herbSeason', check: s => SEASONS.some(se => SPECIMENS.filter(x => x.season === se.id).every(x => s.herbarium && s.herbarium[x.id] > 0)) },
  { id: 'a_herbMax', check: s => SPECIMENS.some(x => s.herbarium && s.herbarium[x.id] >= HERB_MAX_LEVEL) },
  // V11 : jalon exclusif des joueurs qui ont sporulé avant la v11 (Héritage des anciennes forêts).
  // exclusive : caché de la liste et du total tant qu'on ne l'a pas.
  { id: 'a_ancient', exclusive: true, check: s => !!(s.legacy && s.legacy.n >= 1) },
];

// V11 : sporulation continue. Plus aucune remise à zéro : les spores se libèrent d'elles-mêmes
// d'après le total produit depuis toujours (stats.allTimeEarned), même hors ligne.
// Courbe : K × (total / 1 M)^P, réglée au simulateur (.claude/outils/sim.js) pour garder le rythme de la v10.
// La boucle spores → production → spores est très sensible : en P = 0,30 elle s'emballe déjà.
const SPORE_UNIT = 1e6;
const SPORE_EXP = 0.25;
const SPORE_K = 1.25;
const SPORE_BONUS = 0.05;        // +5 % de production par spore
// Plafond de sécurité : au-delà de SPORE_SOFT, la courbe ralentit (racine carrée) ; jamais plus de SPORE_CAP.
const SPORE_SOFT = 2e5;
const SPORE_CAP = 1e8;
function sporeCurve(total) {
  let c = SPORE_K * Math.pow(Math.max(0, total) / SPORE_UNIT, SPORE_EXP);
  if (c > SPORE_SOFT) c = SPORE_SOFT * Math.sqrt(c / SPORE_SOFT);
  return Math.min(SPORE_CAP, c);
}
// Total depuis toujours qu'il faut atteindre pour que la courbe vaille c (inverse de sporeCurve)
function sporeCurveInv(c) {
  if (c <= 0) return 0;
  if (c >= SPORE_CAP) return Infinity;
  if (c > SPORE_SOFT) c = SPORE_SOFT * Math.pow(c / SPORE_SOFT, 2);
  return SPORE_UNIT * Math.pow(c / SPORE_K, 1 / SPORE_EXP);
}
// Grande fructification : à chaque palier de spores, un grand carpophore sort de terre et libère un nuage de spores
// (purement visuel, rien n'est effacé). Paliers : chaque spore jusqu'à 10, puis tous les +10 %.
function nextFruitAfter(spores) { return Math.max(spores + 1, Math.ceil(spores * 1.1)); }
const FRUIT_MIN_GAP = 40;        // secondes au moins entre deux fructifications à l'écran
// Héritage des anciennes forêts : +2 % de production par sporulation faite avant la v11, au plus +100 %
const LEGACY_PER = 0.02;
const LEGACY_MAX = 1;

// Arbre de talents (v2) : achetés avec des spores, conservés pour toujours.
// Les spores dépensées continuent de compter pour le bonus de production.
const TALENT_BRANCHES = [
  { id: 'croissance' },
  { id: 'digestion' },
  { id: 'climat' },
];
const TALENTS = [
  { id: 'germ', branch: 'croissance', icon: '🌱', cost: 1, req: [] },   // v11 : hyphes et rhizomorphes ×3 (avant : 10 hyphes au début de chaque cycle)
  { id: 'vigor', branch: 'croissance', icon: '💪', cost: 2, req: ['germ'] },
  { id: 'heritage', branch: 'croissance', icon: '🧬', cost: 5, req: ['vigor'] },
  { id: 'giant', branch: 'croissance', icon: '🗻', cost: 15, req: ['heritage'] },
  { id: 'colon', branch: 'croissance', icon: '🗺️', cost: 60, req: ['giant'] },

  { id: 'jaws', branch: 'digestion', icon: '🦷', cost: 1, req: [] },
  { id: 'acid', branch: 'digestion', icon: '🧪', cost: 3, req: ['jaws'] },
  { id: 'frenzy', branch: 'digestion', icon: '⚡', cost: 8, req: ['acid'] },
  { id: 'mycophagy', branch: 'digestion', icon: '🦠', cost: 30, req: ['frenzy'] },

  { id: 'dew', branch: 'climat', icon: '💧', cost: 1, req: [] },
  { id: 'dormancy', branch: 'climat', icon: '🌙', cost: 3, req: ['dew'] },
  { id: 'bloom', branch: 'climat', icon: '🌸', cost: 6, req: ['dew'] },
  { id: 'fertile', branch: 'climat', icon: '🌫️', cost: 12, req: ['dormancy', 'bloom'] },
  { id: 'aurora', branch: 'climat', icon: '🌠', cost: 45, req: ['fertile'] },
];

// ---------- V3 : Sucre ----------
// Les mycorhizes (et le Wood Wide Web) échangent ton phosphore contre le sucre des arbres.
const SUGAR_PER_GEN = { myco: 0.1, wwweb: 0.5, continent: 2, lichen: 6, gaia: 25 };
// Évolutions sucrées : payées en 🍯. Permanentes depuis la v11 (le sucre ne repart plus de zéro), d'où des prix revus.
// gens : multiplicateurs de production par générateur.
const SUGAR_UPGRADES = [
  { id: 'trade', icon: '🤝', cost: 15, gens: { myco: 3 } },
  { id: 'sap', icon: '🧃', cost: 50, gens: { hyphe: 5, rhizo: 5 } },
  { id: 'bait', icon: '🌰', cost: 120 },
  { id: 'starch', icon: '🥔', cost: 250 },
  { id: 'ferment', icon: '🫧', cost: 600 },
  { id: 'nectar', icon: '🌼', cost: 1500, gens: { lumi: 4, termites: 3 } },
  { id: 'symb', icon: '♾️', cost: 5000, gens: { wwweb: 3 } },
  // V6
  { id: 'photo', icon: '🌿', cost: 30000, gens: { lichen: 4, continent: 2 } },
  { id: 'tide', icon: '🌊', cost: 150000, gens: { abysses: 3, gaia: 2 } },
];
const FERMENT_STEP = 50;           // Fermentation : +1 % par 50 de sucre en réserve (v11, avant 10), au plus +50 %

// ---------- V3 : événements ----------
const BOAR_INTERVAL = [150, 300];   // secondes entre deux passages
const BOAR_STAY = 14;               // temps pour cliquer dessus
const DROUGHT_DURATION = 45;

// ---------- V4 : espèces ----------
// V11 : mutation à tout moment, effet immédiat, au plus une fois par saison. Chaque espèce change le style de jeu.
// prod : production passive · click : valeur du clic · clickPct : % de prod ajouté au clic
// gens : multiplicateurs par générateur · sugar · boarFreq/boarReward · dropFreq
const SPECIES = [
  { id: 'commun', icon: '🍄', unlock: null },
  { id: 'armillaire', icon: '🟤', prod: 2, click: 0.25,
    unlock: { check: s => s.spores >= 1 } },
  { id: 'pleurote', icon: '🦪', prod: 0.6, click: 4, clickPct: 0.05,
    unlock: { check: s => s.spores >= 1 } },
  { id: 'laccaire', icon: '🟣', sugar: 3, gens: { myco: 2, hyphe: 0.5, rhizo: 0.5 },
    unlock: { check: s => s.achievements.a_sugar1 } },
  { id: 'truffe', icon: '⚫',
    boarFreq: 3, boarReward: 2, dropFreq: 0.5,
    unlock: { check: s => s.achievements.a_boar1 && (s.spores >= 25 || s.stats.prestiges >= 3) } },
];

// ---------- V4 → V11 : planches d'épreuve ----------
// Un petit réseau à part, avec sa contrainte et son objectif, qui pousse À CÔTÉ du réseau principal sans le toucher
// (avant la v11, un défi faisait sporuler). Réussir donne une récompense permanente ; abandonner ne coûte rien.
// Modèle générique de « planche », prévu pour resservir aux biomes de la v12 :
//   gens  : générateurs qu'on peut y faire pousser (PLATE_GENS par défaut)
//   goal  : nutriments à produire sur la planche · rule : contrainte de la planche
//     rule.noClick (toucher la planche ne rapporte rien) · rule.season (saison figée sur la planche)
//     rule.prod (multiplicateur de production) · rule.noSpores (ni spores, ni talents, ni héritage)
// La planche hérite des évolutions et des bonus permanents du réseau principal (c'en est une bouture),
// mais ce qu'elle produit ne compte pas pour les spores.
const PLATE_GENS = ['hyphe', 'rhizo', 'litiere', 'myco', 'termites', 'wwweb', 'lumi', 'continent'];
const PLATE_CLICK_PCT = 0.05;   // toucher une planche : 1 + 5 % de sa production
const PLATE_NOCLICK_START = 10;  // hyphes offertes sur la planche « Sans dents » (sinon impossible à démarrer)
const TRIAL_UNLOCK = 5;         // spores pour débloquer les planches d'épreuve
const CHALLENGES = [
  { id: 'noclick', icon: '🤐', goal: 1e6, rule: { noClick: true } },
  { id: 'solo', icon: '🧵', goal: 2e6, rule: {}, gens: ['hyphe', 'rhizo', 'litiere'] },
  { id: 'winter', icon: '❄️', goal: 5e6, rule: { season: 'hiver' } },
  { id: 'desert', icon: '🏜️', goal: 1e7, rule: { prod: 0.5 } },
  { id: 'amnesia', icon: '🫥', goal: 5e7, rule: { noSpores: true } },
];

// ---------- V6 : événements ----------
// Colonie rivale : un autre mycélium envahit la planche. Clique le réseau pour la repousser.
const RIVAL_INTERVAL = [240, 480];  // secondes entre deux invasions (dès le 1er Wood Wide Web)
const RIVAL_ACTIVE = 60;            // seulement si le joueur a cliqué dans la dernière minute : l'idle tourne seul
const RIVAL_DURATION = 45;          // temps pour la repousser
const RIVAL_HP = 30;                // clics nécessaires
const RIVAL_STEAL = 0.75;           // production ×0,75 tant qu'elle est là
// Poussée de carpophores : en automne, de petits champignons sortent du sol, à cueillir.
const FLUSH_CHANCE = 0.6;           // chance à chaque automne (dès la 1ʳᵉ spore)
const FLUSH_COUNT = 7;
const FLUSH_STAY = 22;

// ---------- V6 : ambre ----------
// Les spores accumulées se figent d'elles-mêmes en ambre, sans aucune remise à zéro.
// (La fossilisation avec remise à zéro a été retirée : l'ambre déjà gagné est conservé.)
const FOSSIL_UNLOCK = 200;          // spores gagnées pour le 1er ambre
const AMBER_PROD = 0.25;            // +25 % de production par ambre
function amberFor(spores) { return Math.floor(Math.sqrt(spores / FOSSIL_UNLOCK) + 1e-9); }
function amberNeeded(n) { return n * n * FOSSIL_UNLOCK; }

// Reliques : achetées avec l'ambre, conservées pour toujours.
// v11 : Banque de graines (générateurs −25 %) et Sève fossile (sucre ×2, sucre hors ligne à 100 %) changent d'effet.
const RELICS = [
  { id: 'seedbank', icon: '🫙', cost: 1 },
  { id: 'instinct', icon: '🧠', cost: 1 },
  { id: 'autogrow', icon: '⚙️', cost: 2 },
  { id: 'resin', icon: '🟠', cost: 2 },
  { id: 'calendar', icon: '📅', cost: 3 },
  { id: 'sapfossil', icon: '🍯', cost: 3 },
  { id: 'keeper', icon: '🏺', cost: 5 },
  { id: 'planet', icon: '🪐', cost: 8 },
  // V9
  { id: 'loupe', icon: '🔍', cost: 4 },
];

// ---------- V9 : herbier ----------
// Le réseau prospecte tout seul (même hors ligne) et trouve des spécimens de la saison en cours.
// Chaque niveau d'espèce : +3 % de production, plus l'effet propre à l'espèce. Rien n'est remis à zéro.
const HERB_MAX_LEVEL = 5;
const HERB_PROD = 0.03;          // +3 % de production par niveau d'espèce
const PROSPECT_TIME = 420;       // secondes pour une trouvaille au tout début (plus rapide ensuite)
const GLOW_INTERVAL = [180, 360];// lueur dans la litière (dès le 1er spécimen)
const GLOW_STAY = 12;
// gens : +x par niveau sur ces générateurs · kind/per : effet spécial (+per par niveau)
// shape : dessin de la planche · req : générateur à posséder pour trouver l'espèce
const SPECIMENS = [
  { id: 'morille', season: 'printemps', latin: 'Morchella esculenta', shape: 'morel', cap: '#b48d5c', stem: '#efe3c8',
    gens: { hyphe: 0.2, rhizo: 0.2 }, req: null },
  { id: 'pezize', season: 'printemps', latin: 'Aleuria aurantia', shape: 'cup', cap: '#e8813a', stem: null,
    kind: 'drop', per: 0.1, req: 'litiere' },
  { id: 'saintgeorges', season: 'printemps', latin: 'Calocybe gambosa', shape: 'convex', cap: '#ece0c4', stem: '#f3ead6',
    gens: { myco: 0.2 }, req: 'myco' },
  { id: 'girolle', season: 'ete', latin: 'Cantharellus cibarius', shape: 'funnel', cap: '#e9b44c', stem: '#e9b44c',
    kind: 'sugar', per: 0.1, req: 'myco' },
  { id: 'cepe', season: 'ete', latin: 'Boletus edulis', shape: 'bolete', cap: '#80512e', stem: '#e6d6b0',
    gens: { termites: 0.2 }, req: 'termites' },
  { id: 'cesar', season: 'ete', latin: 'Amanita caesarea', shape: 'convex', cap: '#e2672e', stem: '#f0d36a',
    kind: 'boar', per: 0.15, req: 'wwweb' },
  { id: 'coprin', season: 'automne', latin: 'Coprinus comatus', shape: 'shaggy', cap: '#efe9dc', stem: '#f5f0e6',
    gens: { litiere: 0.2 }, req: 'litiere' },
  { id: 'trompette', season: 'automne', latin: 'Craterellus cornucopioides', shape: 'funnel', cap: '#6a5c52', stem: '#5a4d44',
    kind: 'click', per: 0.1, req: 'rhizo' },
  { id: 'clathre', season: 'automne', latin: 'Clathrus ruber', shape: 'cage', cap: '#d9452e', stem: null,
    kind: 'flush', per: 0.2, req: 'termites' },
  { id: 'mycene', season: 'hiver', latin: 'Mycena chlorophos', shape: 'bell', cap: '#c8eca8', stem: '#dff3cf', glow: true,
    gens: { lumi: 0.2 }, req: 'lumi' },
  { id: 'piedbleu', season: 'hiver', latin: 'Lepista nuda', shape: 'convex', cap: '#8f84b8', stem: '#a89ccc',
    gens: { continent: 0.2 }, req: 'continent' },
  { id: 'polypore', season: 'hiver', latin: 'Fomitopsis betulina', shape: 'bracket', cap: '#d8cbb0', stem: null,
    gens: { lichen: 0.15, abysses: 0.15, gaia: 0.15 }, req: 'lichen' },
];
function herbSpecies(s) { return SPECIMENS.filter(x => s.herbarium && s.herbarium[x.id] > 0).length; }

// ---------- V10 : premières pages ----------
// Notes de terrain : une courte note s'ouvre la 1ʳᵉ fois qu'on rencontre chaque mécanique (textes dans i18n.js).
// check : déclenchée par l'état de la partie · event : déclenchée par un événement du jeu
// known : le joueur connaît déjà la mécanique (anciennes sauvegardes : la note est marquée lue au chargement)
const LONG_PLAY = 1800;   // 30 min de jeu : un événement débloqué depuis si longtemps a forcément déjà été vu
const NOTES = [
  { id: 'buy', check: s => GENERATORS.some(g => s.gens[g.id] > 0) || s.spores > 0 },
  { id: 'upgrade', check: (s, g) => Object.keys(s.upgrades).length > 0 || g.availableUpgrades().some(u => u.cost <= s.nutrients) || s.spores > 0 },
  { id: 'drop', event: 'drop', known: s => s.stats.dropsClicked > 0 || s.stats.playTime > LONG_PLAY },
  { id: 'season', check: s => s.stats.seasonsSeen >= 2 },
  { id: 'achievement', check: s => Object.keys(s.achievements).length >= 2 },
  { id: 'sugar', check: s => s.gens.myco > 0 || s.stats.sugarEarned > 0 },
  { id: 'boar', event: 'boar', known: s => s.stats.boars > 0 || (s.stats.sugarEarned > 0 && s.stats.playTime > LONG_PLAY) },
  { id: 'drought', event: 'drought', known: s => s.stats.droughts > 0 || (s.stats.sugarEarned > 0 && s.stats.playTime > LONG_PLAY) },
  { id: 'specimen', check: s => herbSpecies(s) > 0 },
  { id: 'glow', event: 'glow', known: s => s.stats.glows > 0 || (herbSpecies(s) > 0 && s.stats.playTime > LONG_PLAY) },
  // v11 : « bientôt des spores » (à mi-chemin de la 1ʳᵉ), puis la 1ʳᵉ spore
  { id: 'sporeReady', check: s => s.stats.allTimeEarned >= sporeCurveInv(0.5) || s.spores > 0 },
  { id: 'spores', check: s => s.spores > 0 },
  { id: 'rival', event: 'rival', known: s => s.stats.rivals > 0 || (s.gens.wwweb > 0 && s.stats.playTime > LONG_PLAY) },
  { id: 'flush', event: 'flush', known: s => s.stats.flushPicked > 0 || (s.spores > 0 && s.stats.playTime > LONG_PLAY) },
  { id: 'amber', check: s => s.amber > 0 },
  { id: 'fruiting', event: 'fruiting', known: s => false },
  // v11
  { id: 'mutation', check: s => s.spores >= 1 },
  { id: 'trial', check: s => s.spores >= TRIAL_UNLOCK },
];

// Objectifs guidés des premières minutes, affichés un par un sous les ressources, puis plus jamais.
// n : quantité à atteindre · have : quantité actuelle
const GUIDE = [
  { id: 'click', n: 10, have: s => s.stats.clicks },
  { id: 'hyphe1', n: 1, have: s => s.gens.hyphe },
  { id: 'hyphe5', n: 5, have: s => s.gens.hyphe },
  { id: 'upgrade', n: 1, have: s => Object.keys(s.upgrades).length },
  { id: 'rhizo', n: 1, have: s => s.gens.rhizo },
  { id: 'litiere', n: 1, have: s => s.gens.litiere },
  { id: 'myco', n: 1, have: s => s.gens.myco },
];
