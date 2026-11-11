// Logique pure du jeu (état, production, achats, sauvegarde)
// ?sandbox=<nom> : partie de test isolée, sur une autre clé (voir CLAUDE.md ; SANDBOX est défini dans util.js)
const SAVE_KEY = 'claudius-save-v1' + (SANDBOX ? ':sandbox:' + SANDBOX : '');
const BACKUP_KEY = SAVE_KEY + ':backup';    // la partie la plus avancée jamais vue
const CORRUPT_KEY = SAVE_KEY + ':corrupt';  // copie brute d'une sauvegarde illisible
const SAVE_VERSION = 10;  // v12 : nouvelles planches (v11 : sporulation continue, migration des sauvegardes 1 à 8 dans applyData)
const EXPORT_PREFIX = 'CLAUDIUS10:';
const NET_LOG_MAX = 900;   // = MAX_BRANCHES du rendu
const EXPORT_PREFIX_RE = /^CLAUDIUS\d+:/;  // accepte aussi les codes v2

function freshState(keep) {
  const s = {
    version: SAVE_VERSION,
    nutrients: 0,
    spores: 0,         // spores gagnées au total (donnent le bonus ; ne baisse jamais)
    sporesSpent: 0,    // spores dépensées dans l'arbre de talents
    // V11 : spores = sporeLegacy + ⌊m × (sporeCurve(total depuis toujours) − sporeOrigin)⌋
    // Une partie d'avant la v11 garde ses spores (sporeLegacy) et repart du point de la courbe où elle en était.
    sporeLegacy: 0,
    sporeOrigin: 0,
    nextFruit: 1,      // V11 : palier de spores de la prochaine grande fructification
    talents: {},
    sugar: 0,          // 🍯 sucre (permanent depuis la v11)
    sugarUpg: {},      // évolutions sucrées (permanentes depuis la v11)
    species: 'commun', // espèce actuelle (V11 : mutation à tout moment, une fois par saison)
    mutSeason: -1,     // V11 : saison (stats.seasonsSeen) de la dernière mutation
    challengesDone: {},
    trialLevels: {},   // V12 : épreuves réussies, par planche (niveau atteint ; une épreuve d'avant la v12 compte pour 1)
    links: {},         // V12 : niveau de chaque lien racinaire
    variants: {},      // V12 : variantes rares trouvées, par espèce (chiffres = index dans VARIANTS)
    plates: {},        // V11 : planches à part (épreuves ; biomes en v12), par identifiant
    legacy: null,      // V11 : Héritage des anciennes forêts { n: sporulations d'avant la v11, thanked }
    amber: 0,          // ambre gagné au total (V6, 2ᵉ prestige)
    amberSpent: 0,     // ambre dépensé en reliques
    relics: {},
    cycleSeasons: 0,   // saisons vécues (talent Aurore ; « sur ce cycle » avant la v11)
    rival: null,       // colonie rivale en cours : { hp, max, left, seed }
    nextRival: 200,
    herbarium: {},     // V9 : niveau de chaque espèce trouvée (jamais remis à zéro)
    prospect: 0,       // V9 : avancement de la prospection (0 → 1 = une trouvaille)
    nextGlow: 240,     // V9 : prochaine lueur dans la litière
    notes: {},         // V10 : notes de terrain déjà ouvertes (jamais remises à zéro)
    guideDone: false,  // V10 : objectifs guidés des premières minutes terminés
    // Réseau dessiné : graine + ordre des branches (1 lettre = 1 branche, 'a' = hyphe…).
    // Rejouer ce journal avec la même graine redonne exactement le même dessin.
    netSeed: (Math.random() * 4294967296) >>> 0,
    netLog: '',
    gens: {},
    upgrades: {},
    achievements: {},
    stats: {
      clicks: 0, totalEarned: 0, allTimeEarned: 0, dropsClicked: 0,
      seasonsSeen: 1, prestiges: 0, playTime: 0, clickEarned: 0,
      sugarEarned: 0, boars: 0, droughts: 0,
      rivals: 0, flushPicked: 0, fossils: 0,
      specimens: 0, glows: 0, fruitings: 0,
    },
    seasonClock: 0,
    buffs: [],
    nextDrop: 45,
    nextBoar: 90,
    lastSave: Date.now(),
  };
  GENERATORS.forEach(g => s.gens[g.id] = 0);
  if (keep) Object.assign(s, keep);
  return s;
}

// Herbier d'une sauvegarde : seulement les espèces connues, niveaux entiers de 0 à 5
function cleanHerbarium(h) {
  const o = {};
  if (h && typeof h === 'object') for (const x of SPECIMENS) {
    const n = Math.floor(Number(h[x.id]) || 0);
    if (n > 0) o[x.id] = Math.min(HERB_LEVEL_CAP, n);
  }
  return o;
}
// V12 : compteurs entiers d'une sauvegarde (niveaux d'épreuve, de liens), seulement pour des identifiants connus
function cleanCounts(d, ids, max) {
  const o = {};
  if (d && typeof d === 'object') for (const id of ids) {
    const n = Math.floor(Number(d[id]) || 0);
    if (n > 0) o[id] = Math.min(max, n);
  }
  return o;
}
function cleanVariants(d) {
  const o = {};
  if (d && typeof d === 'object') for (const x of SPECIMENS) {
    const v = typeof d[x.id] === 'string' ? [...new Set(d[x.id].replace(/[^0-9]/g, ''))].filter(c => Number(c) < VARIANTS.length).join('') : '';
    if (v) o[x.id] = v;
  }
  return o;
}

// Planches d'une sauvegarde (V11) : seulement les planches connues, des nombres et un journal valide.
// V12 : une épreuve au plus (avec son objectif et son niveau), et les biomes colonisés.
const PLATE_LOG_MAX = 260;
function cleanPlate(p, gens, logRe) {
  const g = {};
  for (const id of gens) { const n = Math.floor(Number(p.gens && p.gens[id]) || 0); if (n > 0) g[id] = n; }
  return { nutrients: Math.max(0, Number(p.nutrients) || 0), earned: Math.max(0, Number(p.earned) || 0), gens: g,
    netSeed: Number.isInteger(p.netSeed) ? p.netSeed >>> 0 : 1,
    netLog: typeof p.netLog === 'string' && logRe.test(p.netLog) ? p.netLog.slice(0, PLATE_LOG_MAX) : '' };
}
function cleanPlates(d) {
  const o = {};
  if (!d || typeof d !== 'object') return o;
  for (const c of CHALLENGES) {
    const p = d[c.id];
    if (!p || typeof p !== 'object') continue;
    o[c.id] = cleanPlate(p, c.gens || PLATE_GENS, /^[a-k]*$/);
    if (Number(p.goal) > 0 && isFinite(Number(p.goal))) o[c.id].goal = Number(p.goal);
    o[c.id].level = Math.max(1, Math.floor(Number(p.level) || 1));
    break;  // une seule épreuve à la fois
  }
  for (const b of BIOMES) {
    const p = d[b.id];
    if (p && typeof p === 'object') o[b.id] = cleanPlate(p, b.gens.map(g => g.id), /^[a-d]*$/);
  }
  return o;
}

const Game = {
  s: freshState(),
  listeners: {},
  _cache: null,

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); },
  emit(evt, data) { (this.listeners[evt] || []).forEach(fn => fn(data)); },
  dirty() { this._cache = null; },

  // ---------- Saisons ----------
  seasonIndex() {
    return Math.floor(this.s.seasonClock / SEASON_DURATION) % SEASONS.length;
  },
  season() { return SEASONS[this.seasonIndex()]; },
  seasonProgress() { return (this.s.seasonClock % SEASON_DURATION) / SEASON_DURATION; },
  // se : saison à utiliser (une planche peut avoir sa saison figée), par défaut la saison en cours
  seasonMult(id, se) {
    se = se || this.season();
    let m = se.mult[id] || 1;
    if (m > 1 && this.s.upgrades.season0) m = 1 + (m - 1) * 2;
    if (m < 1 && this.has('bloom')) m = 1 - (1 - m) / 2;
    if (m < 1 && se.id === 'hiver' && this.chalDone('winter')) m = 1;
    if (m < 1 && this.relic('calendar')) m = 1;
    return m;
  },

  // ---------- Talents ----------
  has(id) { return !!this.s.talents[id]; },
  sporesAvailable() { return this.s.spores - this.s.sporesSpent; },
  sporeBonusPer() {
    // v12 : Sans mémoire, +0,05 % de plus par niveau au-delà du 1ᵉʳ
    return (this.has('fertile') ? 0.07 : SPORE_BONUS) + (this.chalDone('amnesia') ? 0.01 * (1 + this.chalExtra('amnesia')) : 0);
  },
  talentState(t) {
    if (this.s.talents[t.id]) return 'owned';
    if (!t.req.every(r => this.has(r))) return 'locked';
    return this.sporesAvailable() >= t.cost ? 'buyable' : 'poor';
  },
  buyTalent(id) {
    const x = TALENTS.find(y => y.id === id);
    if (!x || this.talentState(x) !== 'buyable') return false;
    this.s.sporesSpent += x.cost;
    this.s.talents[id] = true;
    this.dirty();
    this.emit('log', t('log.talent', { name: x.name }));
    return true;
  },
  offlineCap() { return (this.has('dormancy') ? 24 : 8) * 3600; },
  offlineRate() { return this.has('dormancy') ? 1 : 0.5; },
  genBaseCost(g) { return g.baseCost * (this.has('heritage') ? 0.9 : 1) * (this.relic('seedbank') ? 0.75 : 1); },

  // ---------- Espèces (V4 ; mutation en V11) ----------
  sp() { return SPECIES.find(x => x.id === this.s.species) || SPECIES[0]; },
  speciesUnlocked(sp) { return !sp.unlock || !!sp.unlock.check(this.s); },
  // Mutation : effet immédiat, au plus une fois par saison
  canMutate() { return this.s.mutSeason !== this.s.stats.seasonsSeen; },
  mutate(id) {
    const sp = SPECIES.find(x => x.id === id);
    if (!sp || id === this.s.species || !this.speciesUnlocked(sp) || !this.canMutate()) return false;
    this.s.species = id;
    this.s.mutSeason = this.s.stats.seasonsSeen;
    this.dirty();
    this.emit('mutation', sp);
    this.emit('log', t('log.mutation', { name: sp.name }));
    return true;
  },

  // ---------- Planches d'épreuve (V11, d'après les défis de la V4) ----------
  // Une planche est un petit réseau à part : ses nutriments, ses générateurs, son dessin. Elle ne touche jamais
  // au réseau principal et ce qu'elle produit ne compte pas pour les spores. V12 : les biomes sont aussi des planches.
  chalDone(id) { return !!this.s.challengesDone[id]; },
  // V12 : niveau atteint d'une épreuve (0 = jamais réussie ; une épreuve réussie avant la v12 compte pour 1)
  chalLevel(id) { return Math.max(this.s.trialLevels[id] || 0, this.chalDone(id) ? 1 : 0); },
  // Bonus d'une épreuve au-delà de son 1ᵉʳ niveau (0 tant qu'elle n'a pas été réussie deux fois)
  chalExtra(id) { return Math.max(0, this.chalLevel(id) - 1) * TRIAL_LEVEL_BONUS; },
  challengesUnlocked() { return this.s.spores >= TRIAL_UNLOCK || this.s.stats.prestiges >= 1; },
  plateDef(id) { return CHALLENGES.find(c => c.id === id) || BIOMES.find(b => b.id === id) || null; },
  plate(id) { return this.s.plates[id] || null; },
  // Épreuve en cours (une seule à la fois)
  trial() { return CHALLENGES.find(c => this.s.plates[c.id]) || null; },
  plateGens(def) { return def.biome ? def.gens : (def.gens || PLATE_GENS).map(id => GENERATORS.find(g => g.id === id)); },
  plateGen(def, gid) { return this.plateGens(def).find(g => g.id === gid); },
  plateSeason(def) { return def.rule.season ? SEASONS.find(se => se.id === def.rule.season) : this.season(); },
  // Bonus permanents du réseau principal hérités par la planche, moins ce que sa règle retire
  plateParts(def) {
    if (def.biome) return this.biomeParts(def);
    const r = def.rule;
    const parts = this.permanentParts().filter(p => !(r.noSpores && ['spores', 'talents', 'legacy'].includes(p.k)));
    if (r.prod) parts.push({ k: 'plateRule', m: r.prod });
    return parts;
  },
  plateMult(def) { return this.plateParts(def).reduce((m, p) => m * p.m, 1); },
  // se : saison imposée (simulation de l'objectif), sinon celle de la planche
  plateUnitProd(def, gid, se) {
    const g = this.plateGen(def, gid);
    if (def.biome) return g.baseProd * this.plateMult(def);
    return g.baseProd * this.genUpgradeMult(gid, def.rule.noSpores) * this.seasonMult(gid, se || this.plateSeason(def)) * this.plateMult(def);
  },
  plateNps(def) {
    const p = this.plate(def.id);
    if (!p) return 0;
    return this.plateGens(def).reduce((a, g) => a + (p.gens[g.id] ? this.plateUnitProd(def, g.id) * p.gens[g.id] : 0), 0);
  },
  plateBaseCost(def, g) { return def.biome ? g.baseCost : this.genBaseCost(g); },
  plateCost(def, gid, n) {
    const g = this.plateGen(def, gid), r = COST_GROWTH;
    return this.plateBaseCost(def, g) * Math.pow(r, this.plate(def.id).gens[gid] || 0) * (Math.pow(r, n) - 1) / (r - 1);
  },
  plateMaxAffordable(def, gid) {
    const p = this.plate(def.id), g = this.plateGen(def, gid), r = COST_GROWTH;
    const n = Math.floor(Math.log(p.nutrients * (r - 1) / (this.plateBaseCost(def, g) * Math.pow(r, p.gens[gid] || 0)) + 1) / Math.log(r));
    return Math.max(0, n);
  },
  plateGenVisible(def, i) {
    const p = this.plate(def.id), list = this.plateGens(def), g = list[i];
    if (i === 0 || p.gens[g.id] > 0 || p.gens[list[i - 1].id] > 0) return true;
    return p.earned >= g.baseCost * 0.4;
  },
  buyPlateGen(id, gid, mode) {
    const def = this.plateDef(id), p = this.plate(id);
    if (!def || !p || !this.plateGen(def, gid)) return 0;
    const n = mode === 'max' ? this.plateMaxAffordable(def, gid) : mode;
    if (n <= 0) return 0;
    const cost = this.plateCost(def, gid, n);
    if (cost > p.nutrients) return 0;
    p.nutrients -= cost;
    p.gens[gid] = (p.gens[gid] || 0) + n;
    // journal du dessin : lettre = rang dans GENERATORS (épreuve) ou dans les 4 générateurs du biome
    const gi = def.biome ? def.gens.findIndex(g => g.id === gid) : GENERATORS.findIndex(g => g.id === gid);
    for (let k = 0; k < Math.min(n, 30) && p.netLog.length < PLATE_LOG_MAX; k++) p.netLog += String.fromCharCode(97 + gi);
    if (def.biome) this.dirty();
    this.emit('plateGen', { id, gid, n });
    return n;
  },
  plateClickValue(def) { return def.rule.noClick ? 0 : (1 + PLATE_CLICK_PCT * this.plateNps(def)) * this.herbKind('click'); },
  clickPlate(id) {
    const def = this.plateDef(id), p = this.plate(id);
    if (!def || !p) return 0;
    this.lastActive = Date.now();
    const v = this.plateClickValue(def);
    p.nutrients += v; p.earned += v;
    this.checkPlate(def);
    return v;
  },
  // V12 : objectif d'une épreuve au niveau donné. L'objectif nominal (×10 par niveau) est ramené entre ce qu'un réseau
  // sans clic produirait sur cette planche vide en TRIAL_MIN et en TRIAL_MAX secondes, avec tous les bonus du moment :
  // ni 9 secondes en fin de partie, ni des heures pour un débutant.
  trialNominal(def, level) { return def.goal * Math.pow(TRIAL_LEVEL_MULT, level - 1); },
  trialGoal(def, level) {
    const [lo, hi] = this.trialReach(def, Math.min(TRIAL_MAX, TRIAL_MIN + TRIAL_STEP * (level - 1)));
    const g = Math.min(hi, Math.max(lo, this.trialNominal(def, level)));
    return Number(g.toPrecision(2)) || def.goal;
  },
  // Simulation rapide (pas de 5 s) : achats au meilleur rendement, 2 touchers par seconde pendant les 3 premières minutes.
  // Renvoie ce qui est produit en minT et en TRIAL_MAX secondes.
  trialReach(def, minT = TRIAL_MIN) {
    const gens = this.plateGens(def), fixed = !!def.rule.season, r = COST_GROWTH, dt = 5;
    const prods = (fixed ? [null] : SEASONS).map(se => gens.map(g => this.plateUnitProd(def, g.id, se || undefined)));
    const costs = gens.map(g => this.genBaseCost(g));
    const owned = gens.map(g => (def.rule.noClick && g.id === 'hyphe') ? PLATE_NOCLICK_START : 0);
    let nut = 0, earned = 0, lo = 0;
    for (let t = 0; t < TRIAL_MAX; t += dt) {
      const pr = prods[fixed ? 0 : Math.floor((this.s.seasonClock + t) / SEASON_DURATION) % SEASONS.length];
      for (let k = 0; k < 500; k++) {
        let best = -1, br = 0;
        for (let i = 0; i < gens.length; i++) {
          if (!(i === 0 || owned[i] || owned[i - 1] || earned >= gens[i].baseCost * 0.4)) continue;
          const c = costs[i] * Math.pow(r, owned[i]);
          if (c > nut || !(pr[i] / c > br)) continue;
          br = pr[i] / c; best = i;
        }
        if (best < 0) break;
        nut -= costs[best] * Math.pow(r, owned[best]);
        owned[best]++;
      }
      let nps = 0;
      for (let i = 0; i < gens.length; i++) nps += owned[i] * pr[i];
      const gain = nps * dt + (!def.rule.noClick && t < 180 ? 2 * (1 + PLATE_CLICK_PCT * nps) * this.herbKind('click') * dt : 0);
      nut += gain; earned += gain;
      if (!lo && t + dt >= minT) lo = earned;
    }
    return [lo || earned, earned];
  },
  startTrial(id) {
    const def = this.plateDef(id);
    if (!def || def.biome || !this.challengesUnlocked() || this.trial()) return false;
    const level = this.chalLevel(id) + 1;
    // Sans clic, une planche vide ne peut jamais acheter sa 1ʳᵉ hyphe : on lui en offre quelques-unes (v11.1)
    const start = def.rule.noClick ? { hyphe: PLATE_NOCLICK_START } : {};
    this.s.plates[id] = { nutrients: 0, earned: 0, gens: { ...start }, netSeed: (Math.random() * 4294967296) >>> 0,
      netLog: 'a'.repeat(start.hyphe || 0), level, goal: this.trialGoal(def, level) };
    this.emit('trialStart', def);
    this.emit('log', t('log.trialStart', { name: def.name, l: level }));
    return true;
  },
  plateGoal(def) { const p = this.plate(def.id); return (p && p.goal) || def.goal; },
  abandonTrial() {
    const def = this.trial();
    if (!def) return false;
    delete this.s.plates[def.id];
    this.emit('trialEnd', { def, won: false });
    this.emit('log', t('log.chalAbandon', { name: def.name }));
    return true;
  },
  checkPlate(def, quiet) {
    const p = this.plate(def.id);
    if (def.biome || !p || p.earned < this.plateGoal(def)) return false;
    const first = !this.chalDone(def.id);
    this.s.challengesDone[def.id] = true;
    this.s.trialLevels[def.id] = Math.max(this.chalLevel(def.id), p.level || 1);
    delete this.s.plates[def.id];
    this.dirty();
    if (!quiet) this.emit('challengeDone', { def, level: this.s.trialLevels[def.id], first });
    this.emit('trialEnd', { def, won: true });
    return true;
  },
  // rate : 1 en jeu, taux hors ligne pendant une absence. Renvoie les épreuves réussies.
  tickPlates(dt, rate = 1, quiet) {
    const done = [];
    for (const id of Object.keys(this.s.plates)) {
      const def = this.plateDef(id), p = this.s.plates[id];
      if (!def) { delete this.s.plates[id]; continue; }
      const g = this.plateNps(def) * dt * rate;
      p.nutrients += g; p.earned += g;
      if (this.checkPlate(def, quiet)) done.push(def);
    }
    return done;
  },

  // ---------- Nouvelles planches : biomes (V12) ----------
  biomeOpen(b) { return !!this.s.plates[b.id]; },
  biomeReady(b) { return b.unlock.have(this.s) >= b.unlock.need; },
  biomesTeased() { return this.biomeOpen(BIOMES[0]) || this.amberUnlocked() || this.s.gens.lichen > 0; },
  // Colonise les biomes dont la condition est remplie, dans l'ordre. Renvoie les biomes colonisés.
  checkBiomes(quiet) {
    const out = [];
    for (const b of BIOMES) {
      if (this.biomeOpen(b)) continue;
      if (!this.biomeReady(b)) break;
      const g0 = b.gens[0].id;
      this.s.plates[b.id] = { nutrients: 0, earned: 0, gens: { [g0]: BIOME_START }, netSeed: (Math.random() * 4294967296) >>> 0,
        netLog: 'a'.repeat(BIOME_START) };
      this.dirty();
      out.push(b);
      this.emit('biome', { def: b, quiet });
      this.emit('log', t('log.biome', { plate: b.plate, name: b.name }));
    }
    return out;
  },
  // Multiplicateurs d'un biome : la forêt principale le nourrit, ses liens racinaires et son espèce d'herbier le renforcent
  biomeParts(def) {
    return [
      { k: 'biomeForest', m: 1 + BIOME_FOREST * Math.log10(1 + this.nps(true)) },
      { k: 'biomeLinks', m: this.linkMult(def.id) },
      { k: 'biomeHerb', m: this.herbBiome(def.id) },
    ];
  },
  linkLevel(id) { return this.s.links[id] || 0; },
  // prix polynomial (et non géométrique) : la progression ralentit doucement au lieu de caler d'un coup
  linkCost(l) { const n = this.linkLevel(l.id); return l.cost * Math.pow(n + 1, LINK_POW) * Math.pow(l.growth, n); },
  linkMult(kind) {
    let m = 1;
    for (const l of LINKS) if (l.kind === kind) m += l.per * this.linkLevel(l.id);
    return m;
  },
  linkState(l) {
    const p = this.plate(l.biome);
    if (!p) return 'locked';
    if (this.linkLevel(l.id) >= LINK_MAX) return 'max';
    return p.nutrients >= this.linkCost(l) ? 'buyable' : 'poor';
  },
  buyLink(id) {
    const l = LINKS.find(x => x.id === id);
    if (!l || this.linkState(l) !== 'buyable') return false;
    this.plate(l.biome).nutrients -= this.linkCost(l);
    this.s.links[id] = this.linkLevel(id) + 1;
    this.dirty();
    this.emit('log', t('log.link', { name: l.name, n: this.s.links[id] }));
    return true;
  },

  // ---------- Sucre (V3) ----------
  sug(id) { return !!this.s.sugarUpg[id]; },
  sugarUnlocked() { return this.s.gens.myco > 0 || this.s.sugar > 0 || this.s.stats.sugarEarned > 0; },
  sugarBase() {
    let r = 0;
    for (const id in SUGAR_PER_GEN) r += SUGAR_PER_GEN[id] * (this.s.gens[id] || 0);
    return r;
  },
  // Multiplicateurs du sucre, un par un (détaillés dans l'aide)
  sugarParts() {
    let sm = this.season().sugar || 1;
    if (sm < 1 && ((this.season().id === 'hiver' && this.chalDone('winter')) || this.relic('calendar'))) sm = 1;
    return [
      { k: 'seasonMult', v: { name: seasonLabel(this.season()) }, m: sm },
      { k: 'species', v: { name: this.sp().name }, m: this.sp().sugar || 1 },
      { k: 'symb', m: this.sug('symb') ? 3 : 1 },
      { k: 'sapfossil', m: this.relic('sapfossil') ? 2 : 1 },
      { k: 'drought', m: this.droughtActive() ? 0.5 : 1 },
      { k: 'herbPlain', m: this.herbKind('sugar') },
      { k: 'linkSugar', m: this.linkMult('sugar') },        // v12 : lien racinaire « Eaux brunes »
      { k: 'chalSugar', m: 1 + this.chalExtra('desert') },  // v12 : niveaux de l'épreuve Désert
    ];
  },
  sugarRate() {
    return this.sugarParts().reduce((r, p) => r * p.m, this.sugarBase());
  },
  fermentMult() {
    if (!this.sug('ferment')) return 1;
    return 1 + Math.min(0.5, Math.floor(this.s.sugar / FERMENT_STEP) * 0.01);
  },
  sugarUpgState(u) {
    if (this.sug(u.id)) return 'owned';
    return this.s.sugar >= u.cost ? 'buyable' : 'poor';
  },
  buySugarUpg(id) {
    const u = SUGAR_UPGRADES.find(x => x.id === id);
    if (!u || this.sugarUpgState(u) !== 'buyable') return false;
    this.s.sugar -= u.cost;
    this.s.sugarUpg[id] = true;
    this.dirty();
    this.emit('log', t('log.sugarUpg', { name: u.name }));
    return true;
  },

  // ---------- Événements (V3) ----------
  eventsUnlocked() { return this.s.gens.myco > 0; },
  boarInterval() { return rand(...BOAR_INTERVAL) / (this.sug('bait') ? 2 : 1) / (this.sp().boarFreq || 1); },
  catchBoar() {
    this.s.stats.boars++;
    const gain = Math.max(this.nps() * 90, this.clickValue() * 50, 100) * (this.sp().boarReward || 1) * this.herbKind('boar');
    this.earnActive(gain);
    this.addBuff('prod', 2, 45, 'buff.boar');
    const msg = t('log.boar', { gain: fmt(gain) });
    this.emit('log', msg);
    return msg;
  },
  droughtBuff() { return this.s.buffs.find(b => b.drought); },
  droughtActive() { return !!this.droughtBuff(); },
  startDrought() {
    if (this.droughtActive() || this.chalDone('desert')) return;
    const mult = this.sug('starch') ? 0.75 : 0.5;
    this.s.buffs.push({ kind: 'prod', mult, left: DROUGHT_DURATION, total: DROUGHT_DURATION, drought: true, lk: 'buff.drought' });
    this.dirty();
    this.emit('drought');
    this.emit('log', t('log.drought'));
  },
  waterCost() { return Math.max(5, Math.ceil(this.sugarRate() * 20 / (this.sug('starch') ? 2 : 1))); },
  waterDrought() {
    const b = this.droughtBuff();
    if (!b || this.s.sugar < this.waterCost()) return false;
    this.s.sugar -= this.waterCost();
    b.left = 0;
    this.endBuffs();
    this.emit('log', t('log.watered'));
    return true;
  },
  endBuffs() {
    const before = this.s.buffs.length;
    this.s.buffs = this.s.buffs.filter(b => {
      if (b.left > 0) return true;
      if (b.drought) this.s.stats.droughts++;
      return false;
    });
    if (this.s.buffs.length !== before) this.dirty();
  },

  // ---------- Multiplicateurs ----------
  // noTalents : planche « Sans mémoire » (les talents n'y comptent pas)
  genUpgradeMult(id, noTalents) {
    let m = 1;
    for (const u of UPGRADES) if (u.type === 'gen' && u.target === id && this.s.upgrades[u.id]) m *= u.mult;
    for (const u of SUGAR_UPGRADES) if (u.gens && u.gens[id] && this.s.sugarUpg[u.id]) m *= u.gens[id];
    const sp = this.sp();
    if (sp.gens && sp.gens[id]) m *= sp.gens[id];
    if (this.chalDone('solo') && ['hyphe', 'rhizo', 'litiere'].includes(id)) m *= 3 * (1 + this.chalExtra('solo'));
    if (!noTalents && this.has('colon') && LATE_GENS.includes(id)) m *= 3;
    if (!noTalents && this.has('germ') && (id === 'hyphe' || id === 'rhizo')) m *= 3;  // v11 : Germination rapide
    m *= this.herbGenMult(id);
    return m;
  },
  achCount() { return Object.keys(this.s.achievements).length; },
  // Total affiché : un jalon exclusif (V11) ne compte que pour ceux qui l'ont
  achTotal() { return ACHIEVEMENTS.filter(a => !a.exclusive || this.s.achievements[a.id]).length; },
  buffMult(kind) {
    const m = this.s.buffs.filter(b => b.kind === kind).reduce((m, b) => m * b.mult, 1);
    return kind === 'prod' && this.s.rival ? m * RIVAL_STEAL : m;
  },
  // Multiplicateurs permanents, un par un (v10 : détaillés dans l'aide de la production)
  // k : clé du libellé (help.<k>) · v : variables du libellé · m : multiplicateur
  permanentParts() {
    let up = 1;
    for (const u of UPGRADES) if (u.type === 'global' && u.mult && this.s.upgrades[u.id]) up *= u.mult;
    let tal = 1;
    if (this.has('vigor')) tal *= 1.25;
    if (this.has('giant')) tal *= 2;
    if (this.has('aurora')) tal *= 1 + Math.min(0.6, 0.02 * this.s.cycleSeasons);
    let ch = 1;
    // v12 : chaque niveau d'épreuve au-delà du 1ᵉʳ ajoute un peu à sa récompense
    if (this.chalDone('noclick')) ch *= 1.1 + this.chalExtra('noclick');
    if (this.season().id === 'hiver') ch *= 1 + this.chalExtra('winter');
    const per = this.sporeBonusPer();
    return [
      { k: 'upgGlobal', m: up },
      { k: 'ach', v: { n: this.achCount() }, m: 1 + 0.02 * this.achCount() },
      { k: 'spores', v: { n: fmt(this.s.spores), p: fmtDec(per * 100) }, m: 1 + per * this.s.spores },
      { k: 'talents', m: tal },
      { k: 'ferment', m: this.fermentMult() },
      { k: 'species', v: { name: this.sp().name }, m: this.sp().prod || 1 },
      { k: 'challenges', m: ch },
      { k: 'amber', v: { n: fmt(this.s.amber) }, m: this.amberMult() },
      { k: 'relics', m: this.relic('planet') ? 3 : 1 },
      { k: 'herb', v: { n: this.herbLevels() }, m: this.herbMult() },
      { k: 'legacy', v: { n: this.legacyN() }, m: this.legacyMult() },
      { k: 'links', v: { n: linkLevels(this.s) }, m: this.linkMult('prod') },   // v12 : liens racinaires
    ];
  },
  permanentMult() {
    return this.permanentParts().reduce((m, p) => m * p.m, 1);
  },
  // Production détaillée : base → évolutions des générateurs → saison → permanents → effets en cours
  prodBreakdown() {
    let base = 0, upg = 0, seas = 0;
    const gens = [];
    for (const g of GENERATORS) {
      const n = this.s.gens[g.id];
      if (!n) continue;
      const b = g.baseProd * n, u = b * this.genUpgradeMult(g.id), s = u * this.seasonMult(g.id);
      base += b; upg += u; seas += s;
      gens.push({ g, n, prod: this.genProd(g.id) });
    }
    const buffs = this.s.buffs.filter(b => b.kind === 'prod').reduce((m, b) => m * b.mult, 1);
    return {
      base, gens: gens.sort((a, b) => b.prod - a.prod),
      genUpg: base ? upg / base : 1, season: upg ? seas / upg : 1,
      parts: this.permanentParts(), buffs, rival: this.s.rival ? RIVAL_STEAL : 1, total: this.nps(),
    };
  },
  genUnitProd(id) {
    const g = GENERATORS.find(x => x.id === id);
    return g.baseProd * this.genUpgradeMult(id) * this.seasonMult(id) * this.permanentMult() * this.buffMult('prod');
  },
  genProd(id) { return this.genUnitProd(id) * this.s.gens[id]; },
  nps(noBuffs) {
    if (!noBuffs && this._cache != null) return this._cache;
    let total = 0;
    for (const g of GENERATORS) {
      if (!this.s.gens[g.id]) continue;
      total += g.baseProd * this.s.gens[g.id] * this.genUpgradeMult(g.id) * this.seasonMult(g.id);
    }
    total *= this.permanentMult();
    if (noBuffs) return total;
    this._cache = total * this.buffMult('prod');
    return this._cache;
  },
  clickValue() {
    let flat = 1, pct = (this.has('acid') ? 0.05 : 0) + (this.sp().clickPct || 0);
    for (const u of UPGRADES) if (u.type === 'click' && this.s.upgrades[u.id]) { flat += u.flat; pct += u.pct; }
    if (this.has('jaws')) flat *= 5;
    return (flat * (1 + this.sporeBonusPer() * this.s.spores) + pct * this.nps()) * this.buffMult('click') * (this.sp().click || 1) * this.herbKind('click');
  },

  // ---------- Gains ----------
  earn(n) {
    this.s.nutrients += n;
    this.s.stats.totalEarned += n;
    this.s.stats.allTimeEarned += n;
  },
  // Gains du joueur actif (clics, sanglier, gouttes, carpophores, colonie repoussée) : notés pour l'affichage du /s (v10.1)
  ACTIVE_WINDOW: 5,
  activeLog: [],
  earnActive(n) {
    this.earn(n);
    if (n > 0) this.activeLog.push([Date.now(), n]);
  },
  // Revenu actif moyen sur les 5 dernières secondes. Affichage seulement : jamais utilisé par nps(),
  // le clic (qui gagne un % de nps()), le hors-ligne ni les jalons, sinon tout s'emballerait.
  activeRate() {
    const from = Date.now() - this.ACTIVE_WINDOW * 1000;
    while (this.activeLog.length && this.activeLog[0][0] < from) this.activeLog.shift();
    return this.activeLog.reduce((a, e) => a + e[1], 0) / this.ACTIVE_WINDOW;
  },
  displayRate() { return this.nps() + this.activeRate(); },
  click() {
    const v = this.clickValue();
    this.earnActive(v);
    this.s.stats.clicks++;
    this.lastActive = Date.now();
    this.s.stats.clickEarned += v;
    if (this.s.rival) this.hitRival();
    return v;
  },

  // ---------- Achats ----------
  costOf(id, n) {
    const g = GENERATORS.find(x => x.id === id);
    const owned = this.s.gens[id];
    const r = COST_GROWTH;
    return this.genBaseCost(g) * Math.pow(r, owned) * (Math.pow(r, n) - 1) / (r - 1);
  },
  maxAffordable(id) {
    const g = GENERATORS.find(x => x.id === id);
    const r = COST_GROWTH, owned = this.s.gens[id];
    const n = Math.floor(Math.log(this.s.nutrients * (r - 1) / (this.genBaseCost(g) * Math.pow(r, owned)) + 1) / Math.log(r));
    return Math.max(0, n);
  },
  buyGen(id, mode) {
    const n = mode === 'max' ? this.maxAffordable(id) : mode;
    if (n <= 0) return 0;
    const cost = this.costOf(id, n);
    if (cost > this.s.nutrients) return 0;
    this.s.nutrients -= cost;
    this.s.gens[id] += n;
    this.dirty();
    this.emit('buyGen', { id, n });
    return n;
  },
  genVisible(i) {
    if (i === 0) return true;
    const g = GENERATORS[i], prev = GENERATORS[i - 1];
    return this.s.gens[g.id] > 0 || this.s.gens[prev.id] > 0 || this.s.stats.allTimeEarned >= g.baseCost * 0.4;
  },
  // Prochaines évolutions encore verrouillées, montrées en aperçu
  lockedUpgrades(max = 3) {
    return UPGRADES
      .filter(u => !this.s.upgrades[u.id] && !u.req(this.s) && (!u.teasable || u.teasable(this.s)))
      .sort((a, b) => a.cost - b.cost)
      .slice(0, max);
  },
  availableUpgrades() {
    return UPGRADES.filter(u => !this.s.upgrades[u.id] && u.req(this.s));
  },
  buyUpgrade(id, silent) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u || this.s.upgrades[id] || u.cost > this.s.nutrients || !u.req(this.s)) return false;
    this.s.nutrients -= u.cost;
    this.s.upgrades[id] = true;
    this.dirty();
    if (!silent) this.emit('log', t('log.upgrade', { name: u.name }));
    return true;
  },

  // ---------- Pluie ----------
  dropInterval() { return rand(60, 140) / (this.s.upgrades.rain0 ? 2 : 1) / (this.has('dew') ? 1.5 : 1) / (this.sp().dropFreq || 1) / this.herbKind('drop'); },
  collectDrop() {
    this.lastActive = Date.now();
    this.s.stats.dropsClicked++;
    const r = Math.random();
    let msg;
    if (r < 0.5) {
      const d = this.has('frenzy') ? 60 : 30;
      this.addBuff('prod', 3, d, 'buff.shower');
      msg = t('log.shower', { d });
    } else if (r < 0.85) {
      const gain = Math.max(this.nps() * 120, this.clickValue() * 25, 20);
      this.earnActive(gain);
      msg = t('log.puddle', { gain: fmt(gain) });
    } else {
      const d = this.has('frenzy') ? 24 : 12;
      this.addBuff('click', 15, d, 'buff.storm');
      msg = t('log.storm', { d });
    }
    this.emit('log', msg);
    return msg;
  },
  // lk : clé de traduction de l'étiquette (v10 ; les anciennes sauvegardes ont un texte « label »)
  addBuff(kind, mult, duration, lk) {
    this.s.buffs.push({ kind, mult, left: duration, total: duration, lk });
    this.dirty();
  },

  // ---------- Sporulation continue (V11) ----------
  // Plus de remise à zéro : les spores se libèrent d'elles-mêmes d'après le total produit depuis toujours.
  sporeGainMult() { return (this.relic('resin') ? 1.5 : 1) * this.linkMult('spores'); },  // v12 : lien « Pluie de spores rares »
  // Jamais moins qu'un nouveau joueur au même total : une ancienne partie qui n'avait pas encore sporulé
  // reçoit tout de suite les spores de la courbe.
  sporeTarget() {
    const s = this.s, m = this.sporeGainMult(), c = sporeCurve(s.stats.allTimeEarned);
    const kept = s.sporeLegacy + Math.max(0, Math.floor(m * (c - s.sporeOrigin) + 1e-9));
    return Math.max(kept, Math.floor(m * c + 1e-9));
  },
  // Total depuis toujours où l'on aura n spores (pour la barre « Prochaine spore »)
  sporeAt(n) {
    const s = this.s, m = this.sporeGainMult();
    const kept = n < s.sporeLegacy ? 0 : sporeCurveInv(s.sporeOrigin + (n - s.sporeLegacy) / m);
    return Math.min(kept, sporeCurveInv(n / m));
  },
  sporeProgress() {
    const n = this.s.spores, a = this.sporeAt(n), b = this.sporeAt(n + 1), x = this.s.stats.allTimeEarned;
    return { have: x, next: b, pct: isFinite(b) && b > a ? Math.min(1, Math.max(0, (x - a) / (b - a))) : 1 };
  },
  // Met les spores à jour (elles ne baissent jamais). quiet : hors ligne, pas de fructification à l'écran.
  syncSpores(quiet) {
    const s = this.s, target = this.sporeTarget();
    if (target <= s.spores) return 0;
    const gain = target - s.spores;
    s.spores = target;
    this.dirty();
    if (s.spores >= s.nextFruit) {
      s.nextFruit = nextFruitAfter(s.spores);
      const now = Date.now();
      if (!quiet && !(now - (this._lastFruit || 0) < FRUIT_MIN_GAP * 1000)) {
        this._lastFruit = now;
        s.stats.fruitings++;
        this.emit('fruiting', { spores: s.spores });
        this.emit('log', t('log.fruiting', { n: fmt(s.spores), p: fmt(s.spores * this.sporeBonusPer() * 100) }));
      }
    }
    this.syncAmber(quiet);
    return gain;
  },

  // ---------- Héritage des anciennes forêts (V11) ----------
  // Pour les joueurs qui ont sporulé avant la v11 (posé une seule fois, à la migration de leur sauvegarde)
  legacyN() { return this.s.legacy ? this.s.legacy.n : 0; },
  legacyMult() { return 1 + Math.min(LEGACY_MAX, LEGACY_PER * this.legacyN()); },
  // Migration d'une sauvegarde d'avant la v11 : rien n'est perdu.
  // Les spores déjà gagnées restent (sporeLegacy) et les nouvelles s'ajoutent tout de suite à partir du point
  // de la courbe où en est le joueur (sporeOrigin) ; le réseau en cours devient définitif ; un défi en cours est annulé.
  migrateV11(data) {
    const s = this.s, st = s.stats;
    s.sporeLegacy = Math.max(0, Math.floor(Number(data.spores) || 0));
    s.sporeOrigin = sporeCurve(st.allTimeEarned);
    s.spores = Math.max(s.sporeLegacy, this.sporeTarget());
    s.nextFruit = nextFruitAfter(s.spores);
    s.cycleSeasons = Number(data.cycleSeasons) || 0;
    const n = Math.floor(Number(st.prestiges) || 0);
    if (n >= 1) s.legacy = { n, thanked: false };
    this.migrated = { from: Number(data.version) || 1, chal: CHALLENGES.find(c => c.id === data.challenge) || null, prestiges: n };
  },

  // ---------- Ambre (V6) ----------
  // L'ambre se forme tout seul à partir des spores gagnées : pas de remise à zéro.
  relic(id) { return !!this.s.relics[id]; },
  relicIn(state, id) { return !!(state.relics && state.relics[id]); },
  amberAvailable() { return this.s.amber - this.s.amberSpent; },
  amberMult() { return 1 + AMBER_PROD * this.s.amber; },
  amberUnlocked() { return this.s.amber > 0 || this.s.spores >= FOSSIL_UNLOCK; },
  // Met l'ambre à jour d'après les spores (ne descend jamais) ; renvoie l'ambre gagné
  syncAmber(silent) {
    const target = amberFor(this.s.spores);
    if (target <= this.s.amber) return 0;
    const gain = target - this.s.amber;
    this.s.amber = target;
    this.dirty();
    if (!silent) this.emit('log', t('log.amber', { n: gain, m: fmt(this.amberMult(), 2) }));
    return gain;
  },
  relicState(r) {
    if (this.relic(r.id)) return 'owned';
    return this.amberAvailable() >= r.cost ? 'buyable' : 'poor';
  },
  buyRelic(id) {
    const r = RELICS.find(x => x.id === id);
    if (!r || this.relicState(r) !== 'buyable') return false;
    this.s.amberSpent += r.cost;
    this.s.relics[id] = true;
    this.dirty();
    this.emit('log', t('log.relic', { name: r.name }));
    return true;
  },
  // Automatisation (reliques Instinct et Croissance autonome), appelée une fois par seconde
  autoBuy() {
    if (this.relic('instinct')) {
      for (const u of this.availableUpgrades().sort((a, b) => a.cost - b.cost)) {
        if (u.cost > this.s.nutrients * 0.25) break;
        this.buyUpgrade(u.id, true);
      }
    }
    if (this.relic('autogrow')) {
      GENERATORS.forEach((g, i) => {
        if (!this.genVisible(i)) return;
        if (this.costOf(g.id, 1) <= this.s.nutrients * 0.05) this.buyGen(g.id, 1);
      });
      // les planches poussent aussi toutes seules
      for (const id of Object.keys(this.s.plates)) {
        const def = this.plateDef(id), p = this.plate(id);
        if (def) this.plateGens(def).forEach((g, i) => {
          if (this.plateGenVisible(def, i) && this.plateCost(def, g.id, 1) <= p.nutrients * 0.05) this.buyPlateGen(id, g.id, 1);
        });
      }
    }
  },

  // ---------- Colonie rivale (V6) ----------
  rivalsUnlocked() { return this.s.gens.wwweb > 0 || this.s.stats.rivals > 0; },
  // Les rivales ne viennent que si le joueur est là : laissé seul, le jeu ne perd rien
  playerActive() { return Date.now() - (this.lastActive || 0) < RIVAL_ACTIVE * 1000; },
  startRival() {
    const max = Math.ceil(RIVAL_HP / (this.relic('keeper') ? 2 : 1));
    this.s.rival = { hp: max, max, left: RIVAL_DURATION, seed: (Math.random() * 4294967296) >>> 0 };
    this.dirty();
    this.emit('rival', this.s.rival);
    this.emit('log', t('log.rival'));
  },
  hitRival() {
    const r = this.s.rival;
    r.hp -= this.has('mycophagy') ? 2 : 1;
    if (r.hp > 0) return;
    this.s.rival = null;
    this.s.stats.rivals++;
    const gain = Math.max(this.nps(true) * 120, this.clickValue() * 40, 500);
    this.earnActive(gain);
    this.addBuff('prod', 1.5, 90, 'buff.territory');
    this.emit('rivalEnd', { won: true, gain });
    this.emit('log', t('log.rivalWon', { gain: fmt(gain) }));
  },

  // ---------- Poussée de carpophores (V6) ----------
  flushCount() { return FLUSH_COUNT * (this.relic('keeper') ? 2 : 1); },
  pickMushroom() {
    this.lastActive = Date.now();
    this.s.stats.flushPicked++;
    const gain = Math.max(this.nps() * 20, this.clickValue() * 10, 50) * (this.has('mycophagy') ? 2 : 1) * this.herbKind('flush');
    this.earnActive(gain);
    return gain;
  },

  // ---------- Herbier (V9) ----------
  // Le réseau prospecte tout seul, hors ligne compris : l'herbier avance même si on ne joue pas.
  herbLevel(id) { return this.s.herbarium[id] || 0; },
  // V12 : les niveaux continuent au-delà de 5, mais les effets s'arrêtent au niveau 5
  herbEff(id) { return Math.min(HERB_MAX_LEVEL, this.herbLevel(id)); },
  herbLevels() { return SPECIMENS.reduce((n, x) => n + this.herbEff(x.id), 0); },
  herbMult() { return 1 + HERB_PROD * this.herbLevels() + VARIANT_PROD * variantCount(this.s); },
  herbGenMult(id) {
    let m = 1;
    for (const x of SPECIMENS) if (x.gens && x.gens[id]) m += x.gens[id] * this.herbEff(x.id);
    return m;
  },
  herbKind(kind) {
    let m = 1;
    for (const x of SPECIMENS) if (x.kind === kind) m += x.per * this.herbEff(x.id);
    return m;
  },
  herbBiome(bid) {
    let m = 1;
    for (const x of SPECIMENS) if (x.biome === bid) m += x.per * this.herbEff(x.id);
    return m;
  },
  specimenReqMet(x) {
    if (x.biome) return !!this.s.plates[x.biome] || this.herbLevel(x.id) > 0;
    return !x.req || this.s.gens[x.req] > 0 || this.herbLevel(x.id) > 0;
  },
  hasVariant(id, v) { return (this.s.variants[id] || '').includes(String(v)); },
  // anySeason : la lueur trouve aussi des espèces hors saison. Les espèces de biome se trouvent en toute saison.
  findableSpecimens(anySeason) {
    const season = this.season().id;
    return SPECIMENS.filter(x => (anySeason || x.biome || x.season === season) && this.specimenReqMet(x) && this.herbLevel(x.id) < HERB_LEVEL_CAP);
  },
  prospectSpeed() { return 1 + 0.25 * Math.log10(1 + this.nps(true)); },   // plus rapide quand la production grandit
  prospectRate() {
    return this.prospectSpeed() / PROSPECT_TIME * (this.relic('loupe') ? 2 : 1) * this.linkMult('prospect');
  },
  // Une trouvaille : d'abord les espèces encore jamais vues, sinon la moins avancée.
  // V12 : au-delà du niveau 5, petite chance de tomber sur une variante rare pas encore trouvée.
  findSpecimen(anySeason, quiet) {
    const list = this.findableSpecimens(anySeason);
    if (!list.length) return null;
    const fresh = list.filter(x => !this.herbLevel(x.id));
    let pool = fresh;
    if (!pool.length) {
      const low = Math.min(...list.map(x => this.herbLevel(x.id)));
      pool = list.filter(x => this.herbLevel(x.id) === low);
    }
    const x = pool[Math.floor(Math.random() * pool.length)];
    const level = this.herbLevel(x.id) + 1;
    this.s.herbarium[x.id] = level;
    this.s.stats.specimens++;
    let variant = null;
    if (level > HERB_MAX_LEVEL) {
      const missing = VARIANTS.map((v, i) => i).filter(i => !this.hasVariant(x.id, i));
      // chance ramenée à la vitesse due à la production : environ une variante toutes les 2 h 30 de prospection,
      // à tous les stades (la Loupe et le lien « Sentiers de givre » les rendent plus fréquentes)
      if (missing.length && Math.random() < VARIANT_CHANCE / this.prospectSpeed()) {
        const i = missing[Math.floor(Math.random() * missing.length)];
        this.s.variants[x.id] = (this.s.variants[x.id] || '') + i;
        variant = VARIANTS[i];
      }
    }
    this.dirty();
    const found = { x, level, isNew: level === 1, variant };
    this.emit('specimen', found);
    if (variant) this.emit('variant', found);
    if (!quiet) this.emit('log', variant ? t('log.variant', { name: x.name, v: t('var.' + variant) })
      : level === 1 ? t('log.newSpecimen', { name: x.name, latin: x.latin })
      : t('log.betterSpecimen', { name: x.name, level }));
    return found;
  },
  // ---------- Prestige de collection (V12) ----------
  // Compteur de long terme (Carnet) : niveaux d'herbier, variantes, niveaux d'épreuve et de liens, biomes, jalons
  collectPoints() {
    const s = this.s;
    const parts = {
      herb: SPECIMENS.reduce((n, x) => n + this.herbLevel(x.id), 0), variant: variantCount(s), trial: trialLevels(s),
      link: linkLevels(s), biome: BIOMES.filter(b => s.plates[b.id]).length, ach: this.achCount(),
    };
    let total = 0;
    for (const k in parts) total += parts[k] * COLLECT_PTS[k];
    let rank = 0;
    while (rank + 1 < COLLECT_RANKS.length && total >= COLLECT_RANKS[rank + 1]) rank++;
    return { parts, total, rank, next: COLLECT_RANKS[rank + 1] || null, prev: COLLECT_RANKS[rank] };
  },
  glowUnlocked() { return herbSpecies(this.s) > 0; },
  collectGlow() {
    this.lastActive = Date.now();
    this.s.stats.glows++;
    const found = this.findSpecimen(true);
    if (!found) this.emit('log', t('log.glowEmpty'));
    return found;
  },

  // ---------- Notes de terrain et objectifs guidés (V10) ----------
  noteSeen(id) { return !!this.s.notes[id]; },
  // Renvoie la note si elle est encore à montrer (elle n'est marquée lue qu'une fois affichée : noteShown)
  pendingNotes: new Set(),
  openNote(id) {
    const n = NOTES.find(x => x.id === id);
    if (!n || this.s.notes[id] || this.pendingNotes.has(id)) return null;
    this.pendingNotes.add(id);
    return n;
  },
  noteShown(id) {
    this.pendingNotes.delete(id);
    this.s.notes[id] = true;
  },
  // Notes déclenchées par l'état de la partie (appelé une fois par seconde)
  checkNotes() {
    const out = [];
    for (const n of NOTES) if (n.check && !this.s.notes[n.id] && !this.pendingNotes.has(n.id) && n.check(this.s, this)) out.push(this.openNote(n.id));
    return out;
  },
  // Anciennes sauvegardes : les mécaniques déjà connues ne rouvrent pas leur note
  markKnownNotes() {
    for (const n of NOTES) if ((n.known || n.check)(this.s, this)) this.s.notes[n.id] = true;
  },
  // Objectif en cours (index dans GUIDE) ou -1 quand tout est fait
  guideStep() {
    if (this.s.guideDone) return -1;
    const i = GUIDE.findIndex(g => g.have(this.s) < g.n);
    if (i < 0) this.s.guideDone = true;
    return i;
  },

  // ---------- Journal du réseau ----------
  logBranch(genIndex) {
    if (this.s.netLog.length >= NET_LOG_MAX) return false;
    this.s.netLog += String.fromCharCode(97 + genIndex);
    return true;
  },
  // Sauvegardes anciennes (sans journal) ou cycle démarré avec des générateurs offerts :
  // on écrit un journal à partir des quantités possédées, une seule fois.
  syncNetLog() {
    if (this.s.netLog) return;
    const perGen = Math.floor(NET_LOG_MAX / GENERATORS.length) + 20;
    GENERATORS.forEach((g, i) => {
      const n = Math.min(this.s.gens[g.id] || 0, perGen);
      for (let k = 0; k < n; k++) this.logBranch(i);
    });
  },

  // ---------- Jalons ----------
  checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (!this.s.achievements[a.id] && a.check(this.s, this)) {
        this.s.achievements[a.id] = true;
        this.dirty();
        this.emit('achievement', a);
      }
    }
  },

  // ---------- Boucle ----------
  tick(dt) {
    const prevSeason = this.seasonIndex();
    this.s.seasonClock += dt;
    if (this.seasonIndex() !== prevSeason) {
      this.s.stats.seasonsSeen++;
      this.s.cycleSeasons++;
      this.dirty();
      this.emit('season', this.season());
      if (this.eventsUnlocked() && Math.random() < (this.season().droughtChance || 0)) this.startDrought();
      if (this.season().id === 'automne' && this.s.spores >= 1 && Math.random() < FLUSH_CHANCE) {
        this.emit('flush', this.flushCount());
        this.emit('log', t('log.flush'));
      }
    }
    if (this.s.rival) {
      this.s.rival.left -= dt;
      if (this.s.rival.left <= 0) {
        this.s.rival = null;
        this.dirty();
        this.emit('rivalEnd', { won: false });
        this.emit('log', t('log.rivalLeft'));
      }
    } else if (this.rivalsUnlocked() && this.playerActive()) {
      this.s.nextRival -= dt;  // le compte à rebours n'avance que pendant que tu joues
      if (this.s.nextRival <= 0) {
        this.s.nextRival = rand(...RIVAL_INTERVAL);
        this.startRival();
      }
    }
    // Herbier (V9) : la prospection attend à 100 % s'il n'y a rien de nouveau à trouver cette saison
    this.s.prospect = Math.min(1, this.s.prospect + this.prospectRate() * dt);
    if (this.s.prospect >= 1 && this.findableSpecimens().length) {
      this.s.prospect = 0;
      this.findSpecimen();
    }
    if (this.glowUnlocked()) {
      this.s.nextGlow -= dt;
      if (this.s.nextGlow <= 0) {
        this.s.nextGlow = rand(...GLOW_INTERVAL);
        this.emit('glow');
      }
    }
    this._autoClock = (this._autoClock || 0) + dt;
    if (this._autoClock >= 1) { this._autoClock = 0; this.autoBuy(); }
    if (this.s.buffs.length) {
      this.s.buffs.forEach(b => b.left -= dt);
      this.endBuffs();
    }
    this.earn(this.nps() * dt);
    this.syncSpores();
    this.tickPlates(dt);
    this._biomeClock = (this._biomeClock || 0) + dt;
    if (this._biomeClock >= 1) { this._biomeClock = 0; this.checkBiomes(); }
    const sugar = this.sugarRate() * dt;
    if (sugar > 0) {
      this.s.sugar += sugar;
      this.s.stats.sugarEarned += sugar;
      if (this.sug('ferment')) this.dirty();
    }
    this.s.stats.playTime += dt;
    this.s.nextDrop -= dt;
    if (this.s.nextDrop <= 0) {
      this.s.nextDrop = this.dropInterval();
      if (!this.droughtActive()) this.emit('drop');  // pas de pluie pendant une sécheresse
    }
    if (this.eventsUnlocked()) {
      this.s.nextBoar -= dt;
      if (this.s.nextBoar <= 0) {
        this.s.nextBoar = this.boarInterval();
        this.emit('boar');
      }
    }
  },

  // ---------- Sauvegarde ----------
  // readOnly : la même partie est ouverte dans un autre onglet, celui-ci ne doit plus rien écrire (v8)
  save() {
    if (this.readOnly) return false;
    this.s.lastSave = Date.now();
    const json = JSON.stringify(this.s);
    try { localStorage.setItem(SAVE_KEY, json); }
    catch (e) { return false; }
    this.updateBackup(json);
    return true;
  },

  // Le navigateur garde-t-il la partie ? (non en navigation privée stricte ou stockage bloqué)
  storageOk() {
    try {
      const k = SAVE_KEY + ':probe';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  },

  // ---------- Sauvegarde de secours ----------
  // Progression = nutriments gagnés depuis toujours (ne baisse jamais, même en sporulant)
  progressScore(d) { return Number(d && d.stats && d.stats.allTimeEarned) || 0; },
  readBackup() {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return d && typeof d === 'object' ? d : null;
    } catch (e) { return null; }
  },
  // Le secours n'est jamais remplacé par une partie moins avancée
  updateBackup(json) {
    if (this._backupScore === undefined) this._backupScore = this.progressScore(this.readBackup());
    const score = this.progressScore(this.s);
    if (score <= 0 || score < this._backupScore) return;
    try { localStorage.setItem(BACKUP_KEY, json); this._backupScore = score; } catch (e) { /* plein */ }
  },
  backupInfo() {
    const b = this.readBackup();
    if (!b || this.progressScore(b) <= 0) return null;
    return { score: this.progressScore(b), lastSave: b.lastSave, playTime: (b.stats && b.stats.playTime) || 0,
      better: this.progressScore(b) > this.progressScore(this.s) };
  },
  restoreBackup() {
    const b = this.readBackup();
    if (!b) return false;
    const current = this.s;
    try { this.applyData(b); }
    catch (e) { this.s = current; this.dirty(); return false; }
    this.save();
    return true;
  },
  // Fusionne des données sauvegardées dans un état neuf (clés inconnues ignorées)
  applyData(data) {
    if (!data || typeof data !== 'object' || typeof data.nutrients !== 'number' || !isFinite(data.nutrients)) {
      throw new Error('sauvegarde invalide');
    }
    const base = freshState();
    const clean = {};
    for (const k of Object.keys(base)) if (Object.prototype.hasOwnProperty.call(data, k)) clean[k] = data[k];
    const pick = (b, d) => {
      const o = Object.assign({}, b);
      if (d && typeof d === 'object') for (const k of Object.keys(d)) if (k !== '__proto__') o[k] = d[k];
      return o;
    };
    this.s = Object.assign(base, clean, {
      version: SAVE_VERSION,
      gens: pick(base.gens, data.gens),
      stats: pick(base.stats, data.stats),
      upgrades: pick({}, data.upgrades),
      achievements: pick({}, data.achievements),
      talents: pick({}, data.talents),
      sugarUpg: pick({}, data.sugarUpg),
      sugar: Number(data.sugar) || 0,
      challengesDone: pick({}, data.challengesDone),
      trialLevels: cleanCounts(data.trialLevels, CHALLENGES.map(c => c.id), 1e6),
      links: cleanCounts(data.links, LINKS.map(l => l.id), LINK_MAX),
      variants: cleanVariants(data.variants),
      species: SPECIES.some(x => x.id === data.species) ? data.species : 'commun',
      spores: Math.max(0, Math.floor(Number(data.spores) || 0)),
      sporeLegacy: Math.max(0, Math.floor(Number(data.sporeLegacy) || 0)),
      sporeOrigin: Math.max(0, Number(data.sporeOrigin) || 0),
      nextFruit: Math.max(1, Math.floor(Number(data.nextFruit) || 1)),
      mutSeason: Number.isInteger(data.mutSeason) ? data.mutSeason : -1,
      plates: cleanPlates(data.plates),
      legacy: data.legacy && typeof data.legacy === 'object' && Number(data.legacy.n) >= 1
        ? { n: Math.floor(Number(data.legacy.n)), thanked: data.legacy.thanked === true } : null,
      amber: Number(data.amber) || 0,
      amberSpent: Number(data.amberSpent) || 0,
      relics: pick({}, data.relics),
      cycleSeasons: Number(data.cycleSeasons) || 0,
      herbarium: cleanHerbarium(data.herbarium),
      prospect: Math.min(1, Math.max(0, Number(data.prospect) || 0)),
      nextGlow: Number(data.nextGlow) > 0 ? Math.min(GLOW_INTERVAL[1], Number(data.nextGlow)) : base.nextGlow,
      rival: data.rival && typeof data.rival === 'object' && data.rival.hp > 0 && data.rival.left > 0
        ? { hp: Number(data.rival.hp), max: Number(data.rival.max) || RIVAL_HP, left: Number(data.rival.left), seed: Number(data.rival.seed) >>> 0 }
        : null,
      netSeed: Number.isInteger(data.netSeed) ? data.netSeed >>> 0 : base.netSeed,
      netLog: typeof data.netLog === 'string' && /^[a-k]*$/.test(data.netLog) ? data.netLog.slice(0, NET_LOG_MAX) : '',
      // effets en cours : seulement des nombres et des étiquettes connues (une sauvegarde importée peut venir de n'importe qui)
      buffs: Array.isArray(data.buffs) ? data.buffs.filter(b => b && typeof b === 'object').map(b => ({
        kind: b.kind === 'click' ? 'click' : 'prod', mult: Number(b.mult) || 1, left: Number(b.left) || 0, total: Number(b.total) || 1,
        drought: b.drought === true,
        lk: typeof b.lk === 'string' && /^buff\.\w+$/.test(b.lk) && b.lk in I18N.fr.ui ? b.lk : undefined,
        label: typeof b.label === 'string' ? b.label.slice(0, 80) : undefined,
      })).filter(b => b.left > 0) : [],
      sporesSpent: Number(data.sporesSpent) || 0,
      notes: pick({}, data.notes),
      guideDone: data.guideDone === true,
    });
    for (const k of Object.keys(this.s.notes)) if (!NOTES.some(n => n.id === k)) delete this.s.notes[k];
    this.migrated = null;
    if (!(Number(data.version) >= 9)) this.migrateV11(data);
    this.s.nextFruit = Math.max(this.s.nextFruit, Math.min(this.s.spores + 1, nextFruitAfter(this.s.spores)));
    // v12 : une épreuve réussie avant les niveaux compte pour le niveau 1
    for (const c of CHALLENGES) if (this.s.challengesDone[c.id] && !this.s.trialLevels[c.id]) this.s.trialLevels[c.id] = 1;
    this.syncNetLog();
    this.syncSpores(true);
    this.syncAmber(true);
    // Sauvegarde d'avant la v10 : pas de notes d'un coup pour ce qu'on connaît déjà, pas d'objectifs de débutant
    if (!data.notes || typeof data.notes !== 'object') {
      this.markKnownNotes();
      if (this.s.gens.myco > 0 || this.s.spores > 0 || this.s.stats.allTimeEarned >= 2e4) this.s.guideDone = true;
    }
    this.dirty();
  },
  // Charge la partie. Si elle manque ou est illisible, on garde une copie brute
  // et on reprend la sauvegarde de secours plutôt que de repartir de zéro.
  load() {
    this.loadIssue = null;
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* stockage indisponible */ }
    if (raw) {
      try { return this.resume(JSON.parse(raw)); }
      catch (e) {
        this.loadIssue = 'corrupt';
        try { if (!localStorage.getItem(CORRUPT_KEY)) localStorage.setItem(CORRUPT_KEY, raw); } catch (e2) { /* rien */ }
      }
    }
    const b = this.readBackup();
    if (b && this.progressScore(b) > 0) {
      try {
        const r = this.resume(b);
        r.fromBackup = true;
        this.loadIssue = this.loadIssue || 'missing';
        return r;
      } catch (e) { /* secours illisible aussi */ }
    }
    this.s = freshState();
    this.dirty();
    return null;
  },
  // Applique une sauvegarde et ajoute les gains hors-ligne
  resume(data) {
    this.applyData(data);
    return this.applyAway((Date.now() - (data.lastSave || Date.now())) / 1000);
  },
  // Absence (page fermée, ou mise en veille par le navigateur, fréquent sur iPhone) :
  // gains hors-ligne au taux et au plafond habituels
  // Renvoie le détail de l'absence pour la fenêtre « Bon retour » (v10)
  applyAway(seconds) {
    const away = Math.max(0, seconds);
    const elapsed = Math.min(this.offlineCap(), away);
    const rate = this.offlineRate();
    const live = this.nps(true);
    const gain = live * elapsed * rate;
    // part de chaque générateur (sans les effets temporaires, comme le gain lui-même)
    const buffs = this.buffMult('prod') || 1;
    const perGen = GENERATORS.filter(g => this.s.gens[g.id] > 0)
      .map(g => ({ g, n: this.s.gens[g.id], gain: this.genProd(g.id) / buffs * elapsed * rate }))
      .sort((a, b) => b.gain - a.gain);
    if (gain > 0) this.earn(gain);
    const sporesFrom = this.s.spores;
    this.syncSpores(true);  // v11 : les spores continuent de se libérer hors ligne
    // v12 : les biomes poussent aussi pendant l'absence
    const biomeFrom = BIOMES.map(b => this.s.plates[b.id] ? this.s.plates[b.id].earned : 0);
    const trials = this.tickPlates(elapsed, rate, true);
    const biomes = BIOMES.map((b, i) => ({ def: b, gain: this.s.plates[b.id] ? this.s.plates[b.id].earned - biomeFrom[i] : 0 }))
      .filter(x => x.gain > 0);
    const colonized = this.checkBiomes(true);
    const sugar = this.sugarRate() * elapsed * (this.relic('sapfossil') ? 1 : rate);  // v11 : Sève fossile
    if (sugar > 0) { this.s.sugar += sugar; this.s.stats.sugarEarned += sugar; }
    // Herbier : la prospection continue pendant l'absence (espèces de la saison en cours)
    const found = [];
    const prospectFrom = this.s.prospect;
    let p = this.s.prospect + this.prospectRate() * elapsed * rate;
    while (p >= 1 && found.length < 60) {
      const f = this.findSpecimen(false, true);
      if (!f) break;
      found.push(f);
      p -= 1;
    }
    this.s.prospect = Math.min(1, p);
    this.s.buffs = this.s.buffs.filter(b => b.left - elapsed > 0).map(b => ({ ...b, left: b.left - elapsed }));
    if (this.s.rival && elapsed > 5) { this.s.rival = null; this.dirty(); }  // elle repart pendant ton absence
    return { elapsed, away, rate, live, gain, perGen, sugar, found, prospectFrom, prospectTo: this.s.prospect,
      spores: this.s.spores - sporesFrom, trials, biomes, colonized };
  },
  exportSave() {
    this.s.lastSave = Date.now();
    const json = JSON.stringify(this.s);
    let bin = '';
    for (const b of new TextEncoder().encode(json)) bin += String.fromCharCode(b);
    return EXPORT_PREFIX + btoa(bin);
  },
  // Renvoie true si l'import a réussi ; l'état courant n'est remplacé qu'en cas de succès
  importSave(text) {
    text = String(text || '').trim();
    let json;
    if (text.startsWith('{')) json = text;
    else {
      const b64 = text.replace(EXPORT_PREFIX_RE, '');
      const bytes = Uint8Array.from(atob(b64.replace(/\s+/g, '')), c => c.charCodeAt(0));
      json = new TextDecoder().decode(bytes);
    }
    const data = JSON.parse(json);
    const backup = this.s;
    try { this.applyData(data); }
    catch (e) { this.s = backup; this.dirty(); throw e; }
    this.s.lastSave = Date.now(); // pas de gains hors-ligne à l'import
    this.save();
    return true;
  },
  // Repart de zéro mais garde la sauvegarde de secours (restaurable depuis le Carnet).
  // On écrit l'état neuf au lieu de supprimer la clé, sinon le secours serait rechargé tout seul.
  hardReset() {
    this.s = freshState();
    this.dirty();
    this.save();
  },
};
