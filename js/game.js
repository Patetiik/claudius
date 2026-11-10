// Logique pure du jeu (état, production, achats, sauvegarde)
// ?sandbox=<nom> : partie de test isolée, sur une autre clé (voir CLAUDE.md ; SANDBOX est défini dans util.js)
const SAVE_KEY = 'claudius-save-v1' + (SANDBOX ? ':sandbox:' + SANDBOX : '');
const BACKUP_KEY = SAVE_KEY + ':backup';    // la partie la plus avancée jamais vue
const CORRUPT_KEY = SAVE_KEY + ':corrupt';  // copie brute d'une sauvegarde illisible
const SAVE_VERSION = 8;
const EXPORT_PREFIX = 'CLAUDIUS8:';
const NET_LOG_MAX = 900;   // = MAX_BRANCHES du rendu
const EXPORT_PREFIX_RE = /^CLAUDIUS\d+:/;  // accepte aussi les codes v2

function freshState(keep) {
  const s = {
    version: SAVE_VERSION,
    nutrients: 0,
    spores: 0,         // spores gagnées au total (donnent le bonus)
    sporesSpent: 0,    // spores dépensées dans l'arbre de talents
    talents: {},
    sugar: 0,          // 🍯 sucre (remis à zéro à chaque sporulation)
    sugarUpg: {},      // évolutions sucrées du cycle
    species: 'commun',     // espèce du cycle en cours
    nextSpecies: 'commun', // espèce choisie pour le prochain cycle
    challenge: null,       // défi en cours (id) ou null
    challengesDone: {},
    amber: 0,          // ambre gagné au total (V6, 2ᵉ prestige)
    amberSpent: 0,     // ambre dépensé en reliques
    relics: {},
    cycleSeasons: 0,   // saisons vécues sur ce cycle (talent Aurore)
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
      specimens: 0, glows: 0,
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
    if (n > 0) o[x.id] = Math.min(HERB_MAX_LEVEL, n);
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
    if (this.inChal('winter')) return 3;
    return Math.floor(this.s.seasonClock / SEASON_DURATION) % SEASONS.length;
  },
  season() { return SEASONS[this.seasonIndex()]; },
  seasonProgress() { return (this.s.seasonClock % SEASON_DURATION) / SEASON_DURATION; },
  seasonMult(id) {
    let m = this.season().mult[id] || 1;
    if (m > 1 && this.s.upgrades.season0) m = 1 + (m - 1) * 2;
    if (m < 1 && this.has('bloom')) m = 1 - (1 - m) / 2;
    if (m < 1 && this.season().id === 'hiver' && this.chalDone('winter')) m = 1;
    if (m < 1 && this.relic('calendar')) m = 1;
    return m;
  },

  // ---------- Talents ----------
  has(id) { return !this.inChal('amnesia') && !!this.s.talents[id]; },
  sporesAvailable() { return this.s.spores - this.s.sporesSpent; },
  sporeBonusPer() {
    if (this.inChal('amnesia')) return 0;
    return (this.has('fertile') ? 0.07 : SPORE_BONUS) + (this.chalDone('amnesia') ? 0.01 : 0);
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
  genBaseCost(g) { return g.baseCost * (this.has('heritage') ? 0.9 : 1); },

  // ---------- Espèces (V4) ----------
  sp() { return SPECIES.find(x => x.id === this.s.species) || SPECIES[0]; },
  speciesUnlocked(sp) { return !sp.unlock || !!sp.unlock.check(this.s); },
  chooseSpecies(id) {
    const sp = SPECIES.find(x => x.id === id);
    if (!sp || !this.speciesUnlocked(sp)) return false;
    this.s.nextSpecies = id;
    return true;
  },

  // ---------- Défis (V4) ----------
  inChal(id) { return this.s.challenge === id; },
  chalDone(id) { return !!this.s.challengesDone[id]; },
  chal() { return CHALLENGES.find(c => c.id === this.s.challenge) || null; },
  challengesUnlocked() { return this.s.stats.prestiges >= 1; },
  startChallenge(id) {
    if (!this.challengesUnlocked() || !CHALLENGES.some(c => c.id === id)) return false;
    return this.prestige(id);
  },
  abandonChallenge() {
    if (!this.s.challenge) return false;
    this.emit('log', t('log.chalAbandon', { name: this.chal().name }));
    this.s.challenge = null;
    this.dirty();
    return true;
  },
  checkChallenge() {
    const c = this.chal();
    if (!c || this.s.stats.totalEarned < c.goal) return;
    this.s.challengesDone[c.id] = true;
    this.s.challenge = null;
    this.dirty();
    this.emit('challengeDone', c);
  },
  genBlocked(id) { return this.inChal('solo') && !['hyphe', 'rhizo', 'litiere'].includes(id); },

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
    ];
  },
  sugarRate() {
    return this.sugarParts().reduce((r, p) => r * p.m, this.sugarBase());
  },
  fermentMult() {
    if (!this.sug('ferment')) return 1;
    return 1 + Math.min(0.5, Math.floor(this.s.sugar / 10) * 0.01);
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
    this.earn(gain);
    this.addBuff('prod', 2, 45, 'buff.boar');
    const msg = t('log.boar', { gain: fmt(gain) });
    this.emit('log', msg);
    return msg;
  },
  droughtBuff() { return this.s.buffs.find(b => b.drought); },
  // Le défi Désert est une sécheresse permanente (calculée, pas stockée)
  droughtActive() { return this.inChal('desert') || !!this.droughtBuff(); },
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
  genUpgradeMult(id) {
    let m = 1;
    for (const u of UPGRADES) if (u.type === 'gen' && u.target === id && this.s.upgrades[u.id]) m *= u.mult;
    for (const u of SUGAR_UPGRADES) if (u.gens && u.gens[id] && this.s.sugarUpg[u.id]) m *= u.gens[id];
    const sp = this.sp();
    if (sp.gens && sp.gens[id]) m *= sp.gens[id];
    if (this.chalDone('solo') && ['hyphe', 'rhizo', 'litiere'].includes(id)) m *= 3;
    if (this.has('colon') && LATE_GENS.includes(id)) m *= 3;
    m *= this.herbGenMult(id);
    return m;
  },
  achCount() { return Object.keys(this.s.achievements).length; },
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
    if (this.chalDone('noclick')) ch *= 1.1;
    if (this.inChal('desert')) ch *= 0.5;
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
    if (this.inChal('noclick')) return 0;
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
  click() {
    const v = this.clickValue();
    this.earn(v);
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
    if (this.genBlocked(id)) return 0;
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
    return this.s.gens[g.id] > 0 || this.s.gens[prev.id] > 0 || this.s.stats.totalEarned >= g.baseCost * 0.4;
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
      this.earn(gain);
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

  // ---------- Prestige ----------
  sporeGainMult() { return this.relic('resin') ? 1.5 : 1; },
  prestigeGain() { return sporesFor(this.s.stats.totalEarned, this.sporeGainMult()); },
  // Sporulation ; avec challengeId, lance un défi (possible même sans spore à gagner)
  prestige(challengeId) {
    const gain = this.prestigeGain();
    if (!challengeId && gain < 1) return false;
    const old = this.s;
    this.s = freshState({
      spores: old.spores + gain,
      sporesSpent: old.sporesSpent,
      talents: old.talents,
      achievements: old.achievements,
      seasonClock: old.seasonClock,
      species: old.nextSpecies,
      nextSpecies: old.nextSpecies,
      challengesDone: old.challengesDone,
      challenge: challengeId || null,
      amber: old.amber,
      amberSpent: old.amberSpent,
      relics: old.relics,
      herbarium: old.herbarium,
      prospect: old.prospect,
      nextGlow: old.nextGlow,
      notes: old.notes,
      guideDone: old.guideDone,
      sugar: this.relicIn(old, 'sapfossil') ? old.sugar * 0.25 : 0,
    });
    Object.assign(this.s.stats, old.stats, { totalEarned: 0, prestiges: old.stats.prestiges + (gain >= 1 ? 1 : 0) });
    if (this.has('germ')) this.s.gens.hyphe = 10;
    if (this.relic('seedbank')) {
      this.s.gens.hyphe = Math.max(this.s.gens.hyphe, 25);
      this.s.gens.rhizo = 25;
      this.s.gens.litiere = 10;
    }
    this.syncNetLog();
    const amberGain = this.syncAmber();
    this.dirty();
    this.checkAchievements();
    this.emit('prestige', { gain, amberGain, challenge: this.chal() });
    this.save();
    return true;
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
        if (this.genBlocked(g.id) || !this.genVisible(i)) return;
        if (this.costOf(g.id, 1) <= this.s.nutrients * 0.05) this.buyGen(g.id, 1);
      });
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
    this.earn(gain);
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
    this.earn(gain);
    return gain;
  },

  // ---------- Herbier (V9) ----------
  // Le réseau prospecte tout seul, hors ligne compris : l'herbier avance même si on ne joue pas.
  herbLevel(id) { return this.s.herbarium[id] || 0; },
  herbLevels() { return SPECIMENS.reduce((n, x) => n + this.herbLevel(x.id), 0); },
  herbMult() { return 1 + HERB_PROD * this.herbLevels(); },
  herbGenMult(id) {
    let m = 1;
    for (const x of SPECIMENS) if (x.gens && x.gens[id]) m += x.gens[id] * this.herbLevel(x.id);
    return m;
  },
  herbKind(kind) {
    let m = 1;
    for (const x of SPECIMENS) if (x.kind === kind) m += x.per * this.herbLevel(x.id);
    return m;
  },
  specimenReqMet(x) { return !x.req || this.s.gens[x.req] > 0 || this.herbLevel(x.id) > 0; },
  // anySeason : la lueur trouve aussi des espèces hors saison
  findableSpecimens(anySeason) {
    const season = this.season().id;
    return SPECIMENS.filter(x => (anySeason || x.season === season) && this.specimenReqMet(x) && this.herbLevel(x.id) < HERB_MAX_LEVEL);
  },
  prospectRate() {
    return (1 + 0.25 * Math.log10(1 + this.nps(true))) / PROSPECT_TIME * (this.relic('loupe') ? 2 : 1);
  },
  // Une trouvaille : d'abord les espèces encore jamais vues, sinon la moins avancée
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
    this.dirty();
    const found = { x, level, isNew: level === 1 };
    this.emit('specimen', found);
    if (!quiet) this.emit('log', level === 1
      ? t('log.newSpecimen', { name: x.name, latin: x.latin })
      : t('log.betterSpecimen', { name: x.name, level }));
    return found;
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
      if (this.season().id === 'automne' && this.s.stats.prestiges >= 1 && Math.random() < FLUSH_CHANCE) {
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
    if (this.s.challenge) this.checkChallenge();
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
      species: SPECIES.some(x => x.id === data.species) ? data.species : 'commun',
      nextSpecies: SPECIES.some(x => x.id === data.nextSpecies) ? data.nextSpecies : 'commun',
      challenge: CHALLENGES.some(c => c.id === data.challenge) ? data.challenge : null,
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
    this.syncNetLog();
    this.syncAmber(true);
    // Sauvegarde d'avant la v10 : pas de notes d'un coup pour ce qu'on connaît déjà, pas d'objectifs de débutant
    if (!data.notes || typeof data.notes !== 'object') {
      this.markKnownNotes();
      if (this.s.gens.myco > 0 || this.s.stats.prestiges > 0 || this.s.stats.allTimeEarned >= 2e4) this.s.guideDone = true;
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
    const sugar = this.sugarRate() * elapsed * rate;
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
    return { elapsed, away, rate, live, gain, perGen, sugar, found, prospectFrom, prospectTo: this.s.prospect };
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
