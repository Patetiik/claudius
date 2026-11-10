// Contenu du jeu : tout ce qui est "données" vit ici pour faciliter les ajouts.

const COST_GROWTH = 1.15;

const GENERATORS = [
  { id: 'hyphe', name: 'Hyphe', icon: '〰️', color: '#e9dcc4',
    desc: 'Un filament blanc, fin comme un cheveu, qui fouille le sol.',
    baseCost: 15, baseProd: 0.1 },
  { id: 'rhizo', name: 'Rhizomorphe', icon: '🪢', color: '#d8b98a',
    desc: 'Des hyphes tressées en cordons qui transportent la sève loin.',
    baseCost: 100, baseProd: 1 },
  { id: 'litiere', name: 'Champignon de litière', icon: '🍄', color: '#e8945f',
    desc: 'Il décompose les feuilles mortes. Adore l’automne.',
    baseCost: 1100, baseProd: 8 },
  { id: 'myco', name: 'Mycorhize de chêne', icon: '🌳', color: '#9fd8a8',
    desc: 'Pacte avec un chêne : ton phosphore contre son sucre.',
    baseCost: 12000, baseProd: 47 },
  { id: 'termites', name: 'Termitière cultivatrice', icon: '🐜', color: '#c9a36b',
    desc: 'Des termites te cultivent… et te nourrissent en retour.',
    baseCost: 130000, baseProd: 260 },
  { id: 'wwweb', name: 'Wood Wide Web', icon: '🕸️', color: '#a7c7ff',
    desc: 'Toute la forêt échange messages et sucres à travers toi.',
    baseCost: 1.4e6, baseProd: 1400 },
  { id: 'lumi', name: 'Bois lumineux', icon: '✨', color: '#c6ff9e',
    desc: 'Tes filaments bioluminescents attirent des insectes porteurs.',
    baseCost: 20e6, baseProd: 7800 },
  { id: 'continent', name: 'Mycélium continental', icon: '🌍', color: '#ffd27a',
    desc: 'Plus vaste que n’importe quel être vivant. Et toujours affamé.',
    baseCost: 330e6, baseProd: 44000 },
  // V6 : fin de partie
  { id: 'lichen', name: 'Lichen pionnier', icon: '🪨', color: '#c4d2a6',
    desc: 'Pacte avec une algue : vous colonisez ensemble la roche nue des toundras.',
    baseCost: 1e14, baseProd: 2e8 },
  { id: 'abysses', name: 'Mycélium abyssal', icon: '🌊', color: '#74cfc6',
    desc: 'Sous les fonds marins, tes filaments boivent la chaleur des sources.',
    baseCost: 1e16, baseProd: 6e9 },
  { id: 'gaia', name: 'Noosphère fongique', icon: '🌌', color: '#e6d8ff',
    desc: 'La planète entière pense un peu à travers toi.',
    baseCost: 2e18, baseProd: 2e11 },
];

const LATE_GENS = ['lichen', 'abysses', 'gaia'];  // générateurs de fin de partie (V6)

// Saisons : multiplicateurs par générateur (1 par défaut)
const SEASON_DURATION = 90; // secondes
const SEASONS = [
  { id: 'printemps', name: '🌱 Printemps', tint: 'rgba(140, 220, 120, 0.07)',
    mult: { hyphe: 1.5, rhizo: 1.5 }, sugar: 1.2, hint: 'Hyphes et rhizomorphes ×1,5' },
  { id: 'ete', name: '☀️ Été', tint: 'rgba(255, 210, 110, 0.06)',
    mult: { myco: 1.5, lumi: 0.8, litiere: 0.8 }, sugar: 2, droughtChance: 0.5, hint: 'Mycorhizes ×1,5 et sucre ×2, mais sol sec' },
  { id: 'automne', name: '🍂 Automne', tint: 'rgba(230, 120, 60, 0.09)',
    mult: { litiere: 2, termites: 1.25 }, sugar: 1, droughtChance: 0.15, hint: 'Champignons de litière ×2 !' },
  { id: 'hiver', name: '❄️ Hiver', tint: 'rgba(150, 190, 255, 0.08)',
    mult: { hyphe: 0.75, rhizo: 0.75, litiere: 0.5, myco: 0.75, lumi: 1.5, lichen: 1.5 }, sugar: 0.3, hint: 'Le froid ralentit tout (sucre ×0,3), sauf le bois lumineux et le lichen ×1,5' },
];

// Améliorations
// type: 'gen' (multiplie un générateur), 'click', 'global'
const GEN_TIERS = [
  { at: 1,   costMul: 10,    name: 'Enzymes', mult: 2 },
  { at: 10,  costMul: 60,    name: 'Ramification', mult: 2 },
  { at: 25,  costMul: 600,   name: 'Mélanisation', mult: 2 },
  { at: 50,  costMul: 6000,  name: 'Anastomose', mult: 3 },
  { at: 100, costMul: 6e5,   name: 'Bioluminescence', mult: 3 },
];

const UPGRADES = [];
GENERATORS.forEach(g => {
  GEN_TIERS.forEach((t, i) => {
    UPGRADES.push({
      id: `${g.id}_t${i}`, type: 'gen', target: g.id, mult: t.mult,
      name: `${t.name} — ${g.name}`,
      desc: `${g.name} produit ×${t.mult}.`,
      cost: g.baseCost * t.costMul,
      hint: `${g.name} ×${t.at}`,
      // On ne dévoile que les évolutions des générateurs déjà possédés
      teasable: s => s.gens[g.id] > 0,
      req: s => s.gens[g.id] >= t.at,
    });
  });
});

[
  { id: 'click0', cost: 50,    pct: 0,    flat: 1, name: 'Sucs digestifs', desc: 'Clic +1 nutriment.' },
  { id: 'click1', cost: 600,   pct: 0.01, name: 'Exoenzymes', desc: 'Le clic gagne +1 % de ta production/s.' },
  { id: 'click2', cost: 8000,  pct: 0.02, name: 'Lignine dissoute', desc: 'Le clic gagne +2 % de ta production/s.' },
  { id: 'click3', cost: 2e5,   pct: 0.03, name: 'Pourriture blanche', desc: 'Le clic gagne +3 % de ta production/s.' },
  { id: 'click4', cost: 5e6,   pct: 0.04, name: 'Digestion foudroyante', desc: 'Le clic gagne +4 % de ta production/s.' },
].forEach((c, i) => UPGRADES.push({
  ...c, type: 'click', flat: c.flat || 0,
  hint: `${[10, 50, 150, 400, 1000][i]} clics`,
  req: s => s.stats.clicks >= [10, 50, 150, 400, 1000][i],
}));

[
  { id: 'g0', cost: 5000,  mult: 1.1, name: 'Signaux chimiques', desc: 'Toute la production +10 %.', hint: '2 k nutriments sur ce cycle', req: s => s.stats.totalEarned >= 2000 },
  { id: 'g1', cost: 1e5,   mult: 1.15, name: 'Mémoire du réseau', desc: 'Toute la production +15 %.', hint: '50 k nutriments sur ce cycle', req: s => s.stats.totalEarned >= 5e4 },
  { id: 'g2', cost: 5e6,   mult: 1.2, name: 'Horloge circadienne', desc: 'Toute la production +20 %.', hint: '2 M nutriments sur ce cycle', req: s => s.stats.totalEarned >= 2e6 },
  { id: 'g3', cost: 2e8,   mult: 1.25, name: 'Conscience fongique', desc: 'Toute la production +25 %.', hint: '100 M nutriments sur ce cycle', req: s => s.stats.totalEarned >= 1e8 },
  { id: 'g4', cost: 1e12,  mult: 1.3, name: 'Mémoire tellurique', desc: 'Toute la production +30 %.', hint: '500 Md nutriments sur ce cycle', req: s => s.stats.totalEarned >= 5e11 },
  { id: 'g5', cost: 1e15,  mult: 1.5, name: 'Pensée planétaire', desc: 'Toute la production +50 %.', hint: '500 T nutriments sur ce cycle', req: s => s.stats.totalEarned >= 5e14 },
  { id: 'rain0', cost: 20000, name: 'Sol spongieux', desc: 'Les gouttes de pluie apparaissent 2× plus souvent.', type: 'rain', hint: 'Attraper 3 gouttes de pluie', req: s => s.stats.dropsClicked >= 3 },
  { id: 'season0', cost: 3e5, name: 'Phénologie', desc: 'Les bonus de saison sont doublés (les malus restent).', type: 'season', hint: 'Vivre 4 saisons', req: s => s.stats.seasonsSeen >= 4 },
].forEach(u => UPGRADES.push({ type: 'global', ...u }));

// Jalons (achievements) : +2 % de production chacun
const ACHIEVEMENTS = [
  { id: 'a_click1', name: 'Première bouchée', desc: 'Digérer une fois.', check: s => s.stats.clicks >= 1 },
  { id: 'a_click100', name: 'Mâchoire infatigable', desc: '100 clics.', check: s => s.stats.clicks >= 100 },
  { id: 'a_click1000', name: 'Glouton', desc: '1 000 clics.', check: s => s.stats.clicks >= 1000 },
  { id: 'a_h10', name: 'Petite pelote', desc: '10 hyphes.', check: s => s.gens.hyphe >= 10 },
  { id: 'a_h50', name: 'Feutrage', desc: '50 hyphes.', check: s => s.gens.hyphe >= 50 },
  { id: 'a_myco1', name: 'Pacte sylvestre', desc: 'Première mycorhize.', check: s => s.gens.myco >= 1 },
  { id: 'a_www', name: 'Connecté', desc: 'Premier Wood Wide Web.', check: s => s.gens.wwweb >= 1 },
  { id: 'a_cont', name: 'Géant invisible', desc: 'Premier mycélium continental.', check: s => s.gens.continent >= 1 },
  { id: 'a_nps10', name: 'Ça pousse', desc: '10 nutriments/s.', check: (s, g) => g.nps() >= 10 },
  { id: 'a_nps1k', name: 'Métabolisme', desc: '1 000 nutriments/s.', check: (s, g) => g.nps() >= 1000 },
  { id: 'a_nps1m', name: 'Fournaise souterraine', desc: '1 M nutriments/s.', check: (s, g) => g.nps() >= 1e6 },
  { id: 'a_tot1m', name: 'Millionnaire du sol', desc: '1 M nutriments au total.', check: s => s.stats.allTimeEarned >= 1e6 },
  { id: 'a_tot1md', name: 'Humus éternel', desc: '1 Md nutriments au total.', check: s => s.stats.allTimeEarned >= 1e9 },
  { id: 'a_drop1', name: 'Il pleut !', desc: 'Attraper une goutte.', check: s => s.stats.dropsClicked >= 1 },
  { id: 'a_drop25', name: 'Mousson', desc: 'Attraper 25 gouttes.', check: s => s.stats.dropsClicked >= 25 },
  { id: 'a_year', name: 'Une année sous terre', desc: 'Voir passer les 4 saisons.', check: s => s.stats.seasonsSeen >= 4 },
  { id: 'a_spore', name: 'Dans le vent', desc: 'Sporuler une fois.', check: s => s.stats.prestiges >= 1 },
  { id: 'a_spore10', name: 'Nuage de spores', desc: 'Posséder 10 spores.', check: s => s.spores >= 10 },
  { id: 'a_sugar1', name: 'Dent sucrée', desc: 'Recevoir 100 🍯 de sucre au total.', check: s => s.stats.sugarEarned >= 100 },
  { id: 'a_sugarAll', name: 'Sève d’or', desc: 'Toutes les évolutions sucrées sur un cycle.', check: s => SUGAR_UPGRADES.every(u => s.sugarUpg && s.sugarUpg[u.id]) },
  { id: 'a_boar1', name: 'Truffe !', desc: 'Attirer un sanglier truffier.', check: s => s.stats.boars >= 1 },
  { id: 'a_boar10', name: 'Ami des sangliers', desc: 'Attirer 10 sangliers truffiers.', check: s => s.stats.boars >= 10 },
  { id: 'a_drought', name: 'Résilience', desc: 'Traverser une sécheresse.', check: s => s.stats.droughts >= 1 },
  { id: 'a_species', name: 'Métamorphose', desc: 'Vivre un cycle dans une autre espèce.', check: s => s.species && s.species !== 'commun' },
  { id: 'a_chal1', name: 'Mise à l’épreuve', desc: 'Réussir un défi.', check: s => Object.keys(s.challengesDone || {}).length >= 1 },
  { id: 'a_chalAll', name: 'Indestructible', desc: 'Réussir tous les défis.', check: s => CHALLENGES.every(c => s.challengesDone && s.challengesDone[c.id]) },
  { id: 'a_talent1', name: 'Héritage', desc: 'Apprendre un premier talent.', check: s => Object.keys(s.talents || {}).length >= 1 },
  { id: 'a_talentAll', name: 'Arbre de vie', desc: 'Apprendre tous les talents.', check: s => TALENTS.every(t => s.talents && s.talents[t.id]) },
  // V6
  { id: 'a_lichen', name: 'Pionnier', desc: 'Premier lichen pionnier.', check: s => s.gens.lichen >= 1 },
  { id: 'a_abysses', name: 'Grand bleu', desc: 'Premier mycélium abyssal.', check: s => s.gens.abysses >= 1 },
  { id: 'a_gaia', name: 'Gaïa', desc: 'Première noosphère fongique.', check: s => s.gens.gaia >= 1 },
  { id: 'a_nps1md', name: 'Cœur de la Terre', desc: '1 Md nutriments/s.', check: (s, g) => g.nps() >= 1e9 },
  { id: 'a_rival1', name: 'Territoire', desc: 'Repousser une colonie rivale.', check: s => s.stats.rivals >= 1 },
  { id: 'a_rival10', name: 'Seigneur du sous-bois', desc: 'Repousser 10 colonies rivales.', check: s => s.stats.rivals >= 10 },
  { id: 'a_flush25', name: 'Panier plein', desc: 'Cueillir 25 carpophores.', check: s => s.stats.flushPicked >= 25 },
  { id: 'a_fossil1', name: 'Pris dans l’ambre', desc: 'Obtenir un premier ambre.', check: s => s.amber >= 1 },
  { id: 'a_amber10', name: 'Collection d’ambre', desc: 'Posséder 10 ambres.', check: s => s.amber >= 10 },
  { id: 'a_relicAll', name: 'Musée d’histoire naturelle', desc: 'Toutes les reliques.', check: s => RELICS.every(r => s.relics && s.relics[r.id]) },
];

// Prestige (v6 : racine 4ᵉ au lieu de la racine carrée, sinon les spores s'emballent en fin de partie)
const PRESTIGE_UNLOCK = 1e6;     // nutriments totaux sur le cycle pour débloquer
const SPORE_BONUS = 0.05;        // +5 % par spore
const SPORE_EXP = 1 / 4;
// m : multiplicateur de spores (ambre, reliques)
function sporesFor(total, m = 1) { return Math.floor(m * Math.pow(total / PRESTIGE_UNLOCK, SPORE_EXP) + 1e-9); }
function sporesNeeded(n, m = 1) { return n <= 0 ? 0 : Math.pow(n / m, 1 / SPORE_EXP) * PRESTIGE_UNLOCK; }

// Arbre de talents (v2) : achetés avec des spores, conservés pour toujours.
// Les spores dépensées continuent de compter pour le bonus de production.
const TALENT_BRANCHES = [
  { id: 'croissance', name: '🌿 Croissance' },
  { id: 'digestion', name: '🦷 Digestion' },
  { id: 'climat', name: '🌦️ Climat' },
];
const TALENTS = [
  { id: 'germ', branch: 'croissance', icon: '🌱', cost: 1, req: [],
    name: 'Germination rapide', desc: 'Chaque nouveau cycle commence avec 10 hyphes.' },
  { id: 'vigor', branch: 'croissance', icon: '💪', cost: 2, req: ['germ'],
    name: 'Vigueur', desc: 'Toute la production +25 %.' },
  { id: 'heritage', branch: 'croissance', icon: '🧬', cost: 5, req: ['vigor'],
    name: 'Mémoire génétique', desc: 'Les générateurs coûtent 10 % moins cher.' },
  { id: 'giant', branch: 'croissance', icon: '🗻', cost: 15, req: ['heritage'],
    name: 'Gigantisme', desc: 'Toute la production ×2.' },
  { id: 'colon', branch: 'croissance', icon: '🗺️', cost: 60, req: ['giant'],
    name: 'Colonisation', desc: 'Les trois derniers générateurs ×3.' },

  { id: 'jaws', branch: 'digestion', icon: '🦷', cost: 1, req: [],
    name: 'Mâchoires de chitine', desc: 'Le clic de base vaut ×5.' },
  { id: 'acid', branch: 'digestion', icon: '🧪', cost: 3, req: ['jaws'],
    name: 'Acide oxalique', desc: 'Le clic gagne +5 % de ta production/s.' },
  { id: 'frenzy', branch: 'digestion', icon: '⚡', cost: 8, req: ['acid'],
    name: 'Frénésie', desc: 'Ondées et orages durent 2× plus longtemps.' },
  { id: 'mycophagy', branch: 'digestion', icon: '🦠', cost: 30, req: ['frenzy'],
    name: 'Mycophagie', desc: 'Tes clics frappent 2× plus fort les colonies rivales, et les carpophores rapportent 2×.' },

  { id: 'dew', branch: 'climat', icon: '💧', cost: 1, req: [],
    name: 'Rosée', desc: 'Les gouttes de pluie arrivent 1,5× plus souvent.' },
  { id: 'dormancy', branch: 'climat', icon: '🌙', cost: 3, req: ['dew'],
    name: 'Dormance', desc: 'Gains hors-ligne à 100 %, jusqu’à 24 h.' },
  { id: 'bloom', branch: 'climat', icon: '🌸', cost: 6, req: ['dew'],
    name: 'Floraison perpétuelle', desc: 'Les malus de saison sont divisés par deux.' },
  { id: 'fertile', branch: 'climat', icon: '🌫️', cost: 12, req: ['dormancy', 'bloom'],
    name: 'Spores fertiles', desc: 'Chaque spore donne +7 % au lieu de +5 %.' },
  { id: 'aurora', branch: 'climat', icon: '🌠', cost: 45, req: ['fertile'],
    name: 'Aurore', desc: 'Chaque saison vécue sur le cycle ajoute +2 % de production (max +60 %).' },
];

// ---------- V3 : Sucre ----------
// Les mycorhizes (et le Wood Wide Web) échangent ton phosphore contre le sucre des arbres.
const SUGAR_PER_GEN = { myco: 0.1, wwweb: 0.5, continent: 2, lichen: 6, gaia: 25 };
// Évolutions sucrées : payées en 🍯, perdues à la sporulation (comme les évolutions classiques).
// gens : multiplicateurs de production par générateur.
const SUGAR_UPGRADES = [
  { id: 'trade', icon: '🤝', cost: 10, gens: { myco: 3 },
    name: 'Échange équitable', desc: 'Mycorhizes ×3.' },
  { id: 'sap', icon: '🧃', cost: 30, gens: { hyphe: 5, rhizo: 5 },
    name: 'Sève sucrée', desc: 'Hyphes et rhizomorphes ×5.' },
  { id: 'bait', icon: '🌰', cost: 60,
    name: 'Appât sucré', desc: 'Le sanglier truffier passe 2× plus souvent.' },
  { id: 'starch', icon: '🥔', cost: 100,
    name: 'Réserves d’amidon', desc: 'Sécheresses moins dures (×0,75 au lieu de ×0,5) et 2× moins chères à arroser.' },
  { id: 'ferment', icon: '🫧', cost: 250,
    name: 'Fermentation', desc: 'Production +1 % par 10 🍯 en réserve (max +50 %).' },
  { id: 'nectar', icon: '🌼', cost: 500, gens: { lumi: 4, termites: 3 },
    name: 'Nectar lumineux', desc: 'Bois lumineux ×4 et termitières ×3.' },
  { id: 'symb', icon: '♾️', cost: 1500, gens: { wwweb: 3 },
    name: 'Symbiose totale', desc: 'Sucre ×3 et Wood Wide Web ×3.' },
  // V6
  { id: 'photo', icon: '🌿', cost: 8000, gens: { lichen: 4, continent: 2 },
    name: 'Photobionte', desc: 'Lichens ×4 et mycélium continental ×2.' },
  { id: 'tide', icon: '🌊', cost: 40000, gens: { abysses: 3, gaia: 2 },
    name: 'Marée de sève', desc: 'Mycélium abyssal ×3 et noosphère ×2.' },
];

// ---------- V3 : événements ----------
const BOAR_INTERVAL = [150, 300];   // secondes entre deux passages
const BOAR_STAY = 14;               // temps pour cliquer dessus
const DROUGHT_DURATION = 45;

// ---------- V4 : espèces ----------
// Choisie pour le prochain cycle, appliquée à la sporulation. Chaque espèce change le style de jeu.
// prod : production passive · click : valeur du clic · clickPct : % de prod ajouté au clic
// gens : multiplicateurs par générateur · sugar · boarFreq/boarReward · dropFreq
const SPECIES = [
  { id: 'commun', icon: '🍄', name: 'Claudius commun', style: 'Équilibré',
    desc: 'Aucun bonus, aucun malus.', unlock: null },
  { id: 'armillaire', icon: '🟤', name: 'Armillaire obscure', style: 'Inactif',
    desc: 'Production ×2, mais clic ×0,25.', prod: 2, click: 0.25,
    unlock: { text: 'Sporuler une fois', check: s => s.stats.prestiges >= 1 } },
  { id: 'pleurote', icon: '🦪', name: 'Pleurote carnivore', style: 'Actif',
    desc: 'Clic ×4 et +5 % de ta production par clic, mais production ×0,6.', prod: 0.6, click: 4, clickPct: 0.05,
    unlock: { text: 'Sporuler une fois', check: s => s.stats.prestiges >= 1 } },
  { id: 'laccaire', icon: '🟣', name: 'Laccaire améthyste', style: 'Sucre',
    desc: 'Sucre ×3 et mycorhizes ×2, mais hyphes et rhizomorphes ×0,5.', sugar: 3, gens: { myco: 2, hyphe: 0.5, rhizo: 0.5 },
    unlock: { text: 'Jalon « Dent sucrée »', check: s => s.achievements.a_sugar1 } },
  { id: 'truffe', icon: '⚫', name: 'Truffe noire', style: 'Événements',
    desc: 'Le sanglier passe 3× plus souvent et rapporte 2× plus, mais la pluie est 2× plus rare.',
    boarFreq: 3, boarReward: 2, dropFreq: 0.5,
    unlock: { text: 'Jalon « Truffe ! » et 3 sporulations', check: s => s.achievements.a_boar1 && s.stats.prestiges >= 3 } },
];

// ---------- V4 : défis ----------
// Lancer un défi fait sporuler (en gardant les spores gagnées). Atteindre l'objectif sur le cycle
// le réussit et donne une récompense permanente. On peut l'abandonner à tout moment.
const CHALLENGES = [
  { id: 'noclick', icon: '🤐', name: 'Sans dents', goal: 1e6,
    rule: 'Les clics ne rapportent rien.', reward: 'Production +10 % pour toujours.' },
  { id: 'solo', icon: '🧵', name: 'Filament solitaire', goal: 2e6,
    rule: 'Seuls hyphes, rhizomorphes et champignons de litière sont achetables.',
    reward: 'Ces trois générateurs ×3 pour toujours.' },
  { id: 'winter', icon: '❄️', name: 'Hiver éternel', goal: 5e6,
    rule: 'La saison reste bloquée sur l’hiver.', reward: 'L’hiver ne réduit plus ni la production ni le sucre.' },
  { id: 'desert', icon: '🏜️', name: 'Désert', goal: 1e7,
    rule: 'Sécheresse permanente : production ×0,5, pas de pluie, arrosage impossible.',
    reward: 'Les sécheresses ne t’atteignent plus.' },
  { id: 'amnesia', icon: '🫥', name: 'Sans mémoire', goal: 5e7,
    rule: 'Le bonus des spores et les talents sont désactivés.', reward: 'Chaque spore donne +1 % de plus.' },
];

// ---------- V6 : événements ----------
// Colonie rivale : un autre mycélium envahit la planche. Clique le réseau pour la repousser.
const RIVAL_INTERVAL = [240, 480];  // secondes entre deux invasions (dès le 1er Wood Wide Web)
const RIVAL_ACTIVE = 60;            // seulement si le joueur a cliqué dans la dernière minute : l'idle tourne seul
const RIVAL_DURATION = 45;          // temps pour la repousser
const RIVAL_HP = 30;                // clics nécessaires
const RIVAL_STEAL = 0.75;           // production ×0,75 tant qu'elle est là
// Poussée de carpophores : en automne, de petits champignons sortent du sol, à cueillir.
const FLUSH_CHANCE = 0.6;           // chance à chaque automne (après la 1ʳᵉ sporulation)
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
const RELICS = [
  { id: 'seedbank', icon: '🫙', cost: 1, name: 'Banque de graines',
    desc: 'Chaque cycle commence avec 25 hyphes, 25 rhizomorphes et 10 champignons de litière.' },
  { id: 'instinct', icon: '🧠', cost: 1, name: 'Instinct',
    desc: 'Les évolutions (nutriments) s’achètent seules dès qu’elles coûtent moins de 25 % de tes réserves.' },
  { id: 'autogrow', icon: '⚙️', cost: 2, name: 'Croissance autonome',
    desc: 'Chaque seconde, achète un exemplaire de chaque générateur qui coûte moins de 5 % de tes réserves.' },
  { id: 'resin', icon: '🟠', cost: 2, name: 'Résine',
    desc: 'Spores gagnées à la sporulation +50 %.' },
  { id: 'calendar', icon: '📅', cost: 3, name: 'Mémoire des saisons',
    desc: 'Plus aucun malus de saison, ni sur la production ni sur le sucre.' },
  { id: 'sapfossil', icon: '🍯', cost: 3, name: 'Sève fossile',
    desc: 'Sucre ×2, et chaque cycle commence avec 25 % du sucre du précédent.' },
  { id: 'keeper', icon: '🏺', cost: 5, name: 'Gardien du sous-bois',
    desc: 'Colonies rivales 2× moins résistantes, carpophores 2× plus nombreux.' },
  { id: 'planet', icon: '🪐', cost: 8, name: 'Conscience planétaire',
    desc: 'Toute la production ×3.' },
];
