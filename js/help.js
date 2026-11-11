// Aide contextuelle (v10) : un « ? » discret sur chaque ressource, onglet et bonus.
// Tout élément [data-help="clé"] ouvre l'infobulle : au survol (souris), à l'appui long (tactile),
// au toucher du « ? » lui-même, ou au clavier (focus). Le contenu est recalculé tant qu'elle est ouverte.
const Help = {
  tip: null, anchor: null, timer: null, press: null, suppressUntil: 0,

  init() {
    this.tip = el('div', 'tip hidden');
    this.tip.id = 'tip';
    this.tip.setAttribute('role', 'tooltip');
    document.body.appendChild(this.tip);
    const isQ = a => a.classList.contains('help');

    // Souris : survol (tout de suite sur le « ? », avec un petit délai ailleurs)
    document.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const a = e.target.closest('[data-help]');
      if (!a || a === this.anchor) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.open(a), isQ(a) ? 60 : 500);
    });
    document.addEventListener('pointerout', e => {
      if (e.pointerType !== 'mouse') return;
      const a = e.target.closest('[data-help]');
      if (!a || (e.relatedTarget && a.contains(e.relatedTarget))) return;
      clearTimeout(this.timer);
      if (this.anchor === a) this.close();
    });

    // Tactile : appui long n'importe où sur l'élément, ou simple toucher du « ? »
    document.addEventListener('pointerdown', e => {
      const a = e.target.closest('[data-help]');
      if (this.anchor && a !== this.anchor && !this.tip.contains(e.target)) this.close();
      if (e.pointerType === 'mouse') return;
      clearTimeout(this.timer);
      if (!a) return;
      this.press = { x: e.clientX, y: e.clientY };
      if (isQ(a)) { this.open(a); this.touchOpen = Date.now(); return; }
      this.timer = setTimeout(() => {
        this.open(a);
        this.suppressUntil = Date.now() + 900;  // le clic qui suit l'appui long ne doit pas changer d'onglet
        const ua = navigator.userActivation;
        if (navigator.vibrate && (!ua || ua.hasBeenActive)) try { navigator.vibrate(8); } catch (err) { /* rien */ }
      }, 450);
    }, true);
    document.addEventListener('pointermove', e => {
      if (this.press && Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 10) { clearTimeout(this.timer); this.press = null; }
    }, { passive: true });
    const end = () => { if (this.press) clearTimeout(this.timer); this.press = null; };
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', end, true);
    document.addEventListener('contextmenu', e => { if (e.target.closest('[data-help]')) e.preventDefault(); });

    // Le « ? » n'actionne jamais ce qui le contient (onglet, ligne de ressource)
    document.addEventListener('click', e => {
      const q = e.target.closest('.help');
      if (q) {
        e.preventDefault();
        e.stopPropagation();
        if (Date.now() - (this.touchOpen || 0) < 800) return;  // déjà ouverte au toucher
        if (this.anchor === q) this.close(); else this.open(q);
      } else if (Date.now() < this.suppressUntil) {
        e.preventDefault();
        e.stopPropagation();
        this.suppressUntil = 0;
      }
    }, true);
    // Clavier : le « ? » s'ouvre quand on y arrive avec Tab
    document.addEventListener('focusin', e => {
      const q = e.target.closest && e.target.closest('.help');
      if (q && q.matches(':focus-visible')) this.open(q);
    });
    document.addEventListener('focusout', e => { if (e.target === this.anchor) this.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    window.addEventListener('resize', () => this.close());
    document.addEventListener('scroll', () => this.place(), true);
  },

  open(a) {
    this.anchor = a;
    if (!this.render()) { this.close(); return; }
    this.tip.classList.remove('hidden');
    this.place();
  },
  close() {
    clearTimeout(this.timer);
    this.anchor = null;
    if (this.tip) this.tip.classList.add('hidden');
  },
  // Contenu à jour (appelé aussi à chaque mise à jour de l'interface tant que l'infobulle est ouverte)
  render() {
    const a = this.anchor;
    if (!a || !a.isConnected) return false;
    const f = HELP[a.dataset.help];
    const c = f && f(a);
    if (!c) return false;
    const html = `<div class="tip-title">${c.title}</div>${c.html}`;
    if (html !== this._last) { this.tip.innerHTML = html; this._last = html; }
    return true;
  },
  refresh() {
    if (!this.anchor) return;
    if (!this.render()) this.close(); else this.place();
  },
  // Sous l'élément s'il y a la place, sinon au-dessus ; toujours dans l'écran
  place() {
    if (!this.anchor) return;
    const r = this.anchor.getBoundingClientRect(), tip = this.tip;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 8;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(m, Math.min(vw - w - m, x));
    let y = r.bottom + 8;
    if (y + h > vh - m && r.top - 8 - h >= m) y = r.top - 8 - h;
    y = Math.max(m, Math.min(vh - h - m, y));
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
  },
};

// ---------- Contenus ----------
const tipRow = (label, value, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td><td>${value}</td></tr>`;
const tipRows = rows => `<table class="tip-rows">${rows.join('')}</table>`;
const tipMult = m => '×' + fmt(m, m < 10 ? 2 : 1);
const tipP = text => `<p>${text}</p>`;
const tipH = text => `<div class="tip-h">${text}</div>`;
const rate = v => fmt(v, v < 100 ? 1 : 0) + '/s';
function partRows(parts) {
  return parts.filter(p => Math.abs(p.m - 1) > 1e-9).map(p => tipRow(t('help.' + p.k, p.v), tipMult(p.m)));
}
// Étiquette d'un effet en cours (v10 : traduite ; texte d'origine pour les effets des anciennes sauvegardes)
function buffLabel(b) {
  return b.lk ? t(b.lk, { m: fmtDec(b.mult) }) : String(b.label || '');
}
// Texte sûr dans du HTML (l'étiquette d'un effet peut venir d'une sauvegarde importée)
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const HELP = {
  nutrients() {
    const st = Game.s.stats;
    return {
      title: t('res.nutrients').replace(/^./, c => c.toUpperCase()),
      html: tipP(t('help.nutrients')) + tipRows([
        tipRow(t('help.allTime'), fmt(st.allTimeEarned)),
        tipRow(t('help.click'), '+' + fmt(Game.clickValue(), 1)),
      ]),
    };
  },
  nps() {
    const b = Game.prodBreakdown();
    let html = tipP(t('help.nps'));
    const act = Game.activeRate();
    if (act > 0) html += tipRows([tipRow(t('help.passive'), rate(b.total)), tipRow(t('help.active'), rate(act)),
      tipRow(t('help.shown'), rate(b.total + act), 'total')]) + tipP(`<span class="tip-note">${t('help.activeNote')}</span>`);
    if (!b.gens.length) return { title: t('help.npsTitle'), html: html + tipP(t('help.none')) };
    const top = b.gens.slice(0, 5).map(x => tipRow(t('help.genLine', { name: x.g.name, n: x.n }), rate(x.prod)));
    if (b.gens.length > 5) {
      const rest = b.gens.slice(5).reduce((s, x) => s + x.prod, 0);
      top.push(tipRow('…', rate(rest)));
    }
    html += tipH(t('help.sources')) + tipRows(top);
    const rows = [tipRow(t('help.base'), rate(b.base))];
    if (Math.abs(b.genUpg - 1) > 1e-9) rows.push(tipRow(t('help.genUpg'), tipMult(b.genUpg)));
    if (Math.abs(b.season - 1) > 1e-9) rows.push(tipRow(t('help.seasonMult', { name: seasonLabel(Game.season()) }), tipMult(b.season)));
    rows.push(...partRows(b.parts));
    if (Math.abs(b.buffs - 1) > 1e-9) rows.push(tipRow(t('help.buffs'), tipMult(b.buffs)));
    if (b.rival !== 1) rows.push(tipRow(t('help.rival'), tipMult(b.rival)));
    rows.push(tipRow(t('help.total'), rate(b.total), 'total'));
    return { title: t('help.npsTitle'), html: html + tipH(t('help.mults')) + tipRows(rows) };
  },
  sugar() {
    const base = Game.sugarBase();
    let html = tipP(t('help.sugar'));
    if (!base) return { title: t('help.sugarTitle'), html: html + tipP(t('help.sugarNone')) };
    const src = Object.keys(SUGAR_PER_GEN).filter(id => Game.s.gens[id] > 0).map(id => {
      const g = GENERATORS.find(x => x.id === id);
      return tipRow(t('help.genLine', { name: g.name, n: Game.s.gens[id] }), fmt(SUGAR_PER_GEN[id] * Game.s.gens[id], 2) + '/s');
    });
    const rows = [tipRow(t('help.base'), fmt(base, 2) + '/s'), ...partRows(Game.sugarParts()),
      tipRow(t('help.total'), fmt(Game.sugarRate(), 2) + '/s', 'total')];
    return { title: t('help.sugarTitle'), html: html + tipH(t('help.sources')) + tipRows(src) + tipH(t('help.mults')) + tipRows(rows) };
  },
  spores() {
    const per = Game.sporeBonusPer() * 100, pc = isEn() ? '%' : ' %';
    const pr = Game.sporeProgress();
    const rows = [
      tipRow(t('help.sporeBonus'), '+' + fmt(Game.s.spores * per) + pc),
      tipRow(t('help.toSpend'), fmt(Game.sporesAvailable())),
      tipRow(t('help.nextSpore'), isFinite(pr.next) ? t('help.atTotal', { n: fmt(pr.next) }) : t('help.capped')),
      tipRow(t('help.nextFruit'), t('help.fruitAt', { n: fmt(Game.s.nextFruit) })),
    ];
    if (Game.relic('resin')) rows.push(tipRow(t('help.resin'), '×1,5'.replace(',', isEn() ? '.' : ',')));
    if (Game.s.sporeLegacy > 0) rows.push(tipRow(t('help.sporeLegacy'), fmt(Game.s.sporeLegacy)));
    return { title: t('help.sporesTitle'), html: tipP(t('help.sporesBody', { p: fmtDec(per) })) + tipRows(rows) };
  },
  amber() {
    const have = Game.s.spores, next = amberNeeded(amberFor(have) + 1);
    return {
      title: t('help.amberTitle'),
      html: tipP(t('help.amberBody')) + tipRows([
        tipRow(t('help.amberBonus'), tipMult(Game.amberMult())),
        tipRow(t('help.toSpend'), fmt(Game.amberAvailable())),
        tipRow(t('help.nextAmber'), t('help.sporesOf', { a: fmt(have), b: fmt(next) })),
      ]),
    };
  },
  prospect() {
    const r = Game.prospectRate(), findable = Game.findableSpecimens().length > 0;
    const speed = Game.prospectSpeed();
    return {
      title: t('help.prospectTitle'),
      html: tipP(t('help.prospectBody')) + tipRows([
        tipRow(t('help.every'), fmtTime(1 / r)),
        tipRow(t('help.speed'), t('help.speedVal', { m: fmtDec(speed, 2), loupe: Game.relic('loupe') ? t('help.loupe') : '' })),
        ...(Game.linkMult('prospect') > 1 ? [tipRow(t('help.biomeLinks'), tipMult(Game.linkMult('prospect')))] : []),
        tipRow(t('help.nextFind'), findable ? fmtTime(Math.max(0, (1 - Game.s.prospect) / r)) : t('help.nothing')),
      ]),
    };
  },
  season() {
    const se = Game.season(), idx = Game.seasonIndex();
    const rows = Object.keys(se.mult).map(id => {
      const g = GENERATORS.find(x => x.id === id);
      return tipRow(g.name, tipMult(Game.seasonMult(id)), Game.seasonMult(id) >= 1 ? 'up' : 'down');
    });
    const sm = Game.sugarParts()[0].m;
    if (sm !== 1) rows.push(tipRow(t('help.sugarMult'), tipMult(sm), sm >= 1 ? 'up' : 'down'));
    if (se.droughtChance && !Game.chalDone('desert')) rows.push(tipRow(t('help.droughtRisk'), Math.round(se.droughtChance * 100) + (isEn() ? '%' : ' %')));
    rows.push(tipRow(t('help.left'), fmtTime((1 - Game.seasonProgress()) * SEASON_DURATION)));
    rows.push(tipRow(t('help.then'), seasonLabel(SEASONS[(idx + 1) % SEASONS.length])));
    return { title: seasonLabel(se), html: tipP(t('help.seasonBody')) + tipRows(rows) };
  },
  // v12 : ressource d'un biome (tourbe, givre, spores rares) : d'où elle vient, multiplicateur par multiplicateur
  biome() {
    const def = UI.biomeSel && Game.plateDef(UI.biomeSel), p = def && Game.plate(def.id);
    if (!p) return null;
    const src = def.gens.filter(g => p.gens[g.id]).map(g => tipRow(t('help.genLine', { name: g.name, n: p.gens[g.id] }), rate(Game.plateUnitProd(def, g.id) * p.gens[g.id])));
    const base = def.gens.reduce((a, g) => a + g.baseProd * (p.gens[g.id] || 0), 0);
    const rows = [tipRow(t('help.base'), rate(base)), ...partRows(Game.biomeParts(def)), tipRow(t('help.total'), rate(Game.plateNps(def)), 'total')];
    return {
      title: def.resName.replace(/^./, c => c.toUpperCase()),
      html: tipP(t('help.biomeBody')) + tipRows([tipRow(t('help.biomeTotal'), fmt(p.earned))])
        + tipH(t('help.sources')) + tipRows(src) + tipH(t('help.mults')) + tipRows(rows),
    };
  },
  buff(a) {
    const b = Game.s.buffs[Number(a.dataset.buff)];
    if (!b) return null;
    const kind = (b.lk || '').replace('buff.', '');
    const body = HELP_BUFFS.includes(kind) ? t('help.buff.' + kind)
      : t('help.buff.other', { what: t(b.kind === 'click' ? 'help.buff.click' : 'help.buff.prod') });
    return { title: escHtml(buffLabel(b)), html: tipP(body) + tipP(t('help.buffLeft', { t: fmtTime(Math.ceil(b.left)) })) };
  },
};
const HELP_BUFFS = ['shower', 'storm', 'boar', 'territory', 'drought'];
['gens', 'upgrades', 'achievements', 'prestige', 'amber', 'herbier', 'stats'].forEach(k => {
  HELP['tab-' + k] = () => {
    let html = tipP(t('help.tab.' + k));
    if (k === 'achievements') html += tipP(t('help.tab.achCount', { n: Game.achCount(), t: Game.achTotal(), p: Game.achCount() * 2 }));
    return { title: t('tab.' + k), html };
  };
});
