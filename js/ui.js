// Interface : construction et mise à jour du DOM
const $ = id => document.getElementById(id);

const UI = {
  buyMode: 1,
  genRows: {},
  upgKey: '',
  achKey: '',

  init() {
    applyPageText();  // textes fixes de la page, dans la langue du joueur (v10)
    // Onglets
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + b.dataset.tab));
    }));
    // Mode d'achat
    document.querySelectorAll('.buy-mode button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.buy-mode button').forEach(x => x.classList.toggle('active', x === b));
      this.buyMode = b.dataset.mode === 'max' ? 'max' : Number(b.dataset.mode);
      this.update();
    }));
    // Générateurs
    const list = $('gen-list');
    GENERATORS.forEach((g, i) => {
      const row = el('div', 'gen');
      row.innerHTML = `
        <div class="icon">${g.icon}</div>
        <div><div class="name">${g.name}<span class="season-tag"></span></div>
          <div class="desc">${g.desc}</div>
          <div class="meta"></div></div>
        <div class="right-col"><div class="owned">0</div><div class="cost"></div></div>`;
      row.addEventListener('click', () => {
        const n = Game.buyGen(g.id, this.buyMode);
        if (n) this.update();
      });
      list.appendChild(row);
      this.genRows[g.id] = {
        row, i, owned: row.querySelector('.owned'), cost: row.querySelector('.cost'),
        meta: row.querySelector('.meta'), tag: row.querySelector('.season-tag'),
        name: row.querySelector('.name'), desc: row.querySelector('.desc'), icon: row.querySelector('.icon'),
      };
    });

    // Espèces (V4) : mutation à tout moment, une fois par saison (V11)
    this.speciesNodes = {};
    SPECIES.forEach(sp => {
      const d = el('div', 'species', `<div class="name"><span class="glyph">${sp.icon}</span><span class="tx"></span></div>
        <div class="style small"></div><div class="desc"></div>`);
      d.setAttribute('role', 'button');
      d.tabIndex = 0;
      const go = () => {
        if (Game.s.species === sp.id || !Game.speciesUnlocked(sp) || !Game.canMutate()) return;
        if (!confirm(t('pre.mutateConfirm', { icon: sp.icon, name: sp.name }))) return;
        if (Game.mutate(sp.id)) this.update();
      };
      d.addEventListener('click', go);
      d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      $('species-list').appendChild(d);
      this.speciesNodes[sp.id] = { d, style: d.querySelector('.style'), name: d.querySelector('.tx'), desc: d.querySelector('.desc') };
    });

    // Planches d'épreuve (V11, d'après les défis de la V4) : elles poussent à côté du réseau principal
    this.chalNodes = {};
    CHALLENGES.forEach(c => {
      const d = el('div', 'chal', `<div class="chal-head"><div class="name"><span class="glyph">${c.icon}</span><span class="tx"></span></div><button type="button"></button></div>
        <div class="desc rule"></div>
        <div class="desc goal"></div>
        <div class="reward small"></div>`);
      const btn = d.querySelector('button');
      btn.addEventListener('click', () => {
        if (Game.startTrial(c.id)) { this.openPlate(); this.update(); }
      });
      $('chal-list').appendChild(d);
      this.chalNodes[c.id] = { d, btn, name: d.querySelector('.tx'), rule: d.querySelector('.rule'),
        goal: d.querySelector('.goal'), reward: d.querySelector('.reward') };
    });
    $('btn-abandon').addEventListener('click', () => {
      if (!confirm(t('chal.abandonConfirm'))) return;
      Game.abandonTrial();
      this.update();
    });
    // L'encart sous les ressources mène à la planche
    const toPlate = () => { document.querySelector('.tabs button[data-tab="prestige"]').click(); $('plate-panel').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    $('chal-box').addEventListener('click', toPlate);
    $('chal-box').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toPlate(); } });
    this.initPlate();
    $('modal-ok').addEventListener('click', () => {
      $('modal').classList.add('hidden');
      const next = this.modalQueue.shift();
      if (next) { this._modalGap = true; setTimeout(() => { this._modalGap = false; this.modal(next); }, 250); }
      else setTimeout(() => this.pumpNotes(), 600);
    });
    $('btn-legacy').addEventListener('click', () => this.showLegacy());

    // Arbre de talents
    const tree = $('talent-tree');
    this.talentNodes = {};
    TALENT_BRANCHES.forEach(br => {
      const col = el('div', 'branch', `<div class="branch-name"></div>`);
      this.branchNodes = this.branchNodes || {};
      this.branchNodes[br.id] = col.firstChild;
      TALENTS.filter(x => x.branch === br.id).forEach(x => {
        const n = el('div', 'talent', `
          <div class="name"><span class="glyph">${x.icon}</span><span class="tx"></span></div>
          <div class="desc"></div>
          <div class="cost"></div>
          ${x.req.length > 1 ? `<div class="req small muted"></div>` : ''}`);
        n.addEventListener('click', () => { if (Game.buyTalent(x.id)) this.update(); });
        col.appendChild(n);
        this.talentNodes[x.id] = { n, cost: n.querySelector('.cost'), name: n.querySelector('.tx'), desc: n.querySelector('.desc'), req: n.querySelector('.req') };
      });
      tree.appendChild(col);
    });

    // Évolutions sucrées (V3)
    const sl = $('sugar-list');
    this.sugarNodes = {};
    SUGAR_UPGRADES.forEach(u => {
      const d = el('div', 'upg sugar', `<div class="name"><span class="glyph">${u.icon}</span><span class="tx"></span></div><div class="desc"></div><div class="cost"></div>`);
      d.addEventListener('click', () => { if (Game.buySugarUpg(u.id)) this.update(); });
      sl.appendChild(d);
      this.sugarNodes[u.id] = { d, cost: d.querySelector('.cost'), name: d.querySelector('.tx'), desc: d.querySelector('.desc') };
    });
    $('btn-water').addEventListener('click', () => { if (Game.waterDrought()) this.update(); });

    // Ambre et reliques (V6)
    this.relicNodes = {};
    RELICS.forEach(r => {
      const d = el('div', 'upg relic', `<div class="name"><span class="glyph">${r.icon}</span><span class="tx"></span></div><div class="desc"></div><div class="cost"></div>`);
      d.addEventListener('click', () => { if (Game.buyRelic(r.id)) this.update(); });
      $('relic-list').appendChild(d);
      this.relicNodes[r.id] = { d, cost: d.querySelector('.cost'), name: d.querySelector('.tx'), desc: d.querySelector('.desc') };
    });

    // Herbier (V9) : une planche par espèce, regroupées par saison
    this.herbNodes = {};
    this.herbNew = 0;
    SEASONS.forEach((se, i) => {
      const sec = el('div', 'herb-season', `<div class="herb-season-head"></div>`);
      this.herbHeads = this.herbHeads || [];
      this.herbHeads.push({ head: sec.firstChild, se, n: ['II', 'III', 'IV', 'V'][i] });
      const grid = el('div', 'herb-grid');
      SPECIMENS.filter(x => x.season === se.id).forEach(x => {
        const d = el('div', 'specimen', `<div class="plate"></div><div class="sp-text">
          <div class="name"></div><div class="latin">${x.latin}</div><div class="levels"></div>
          <div class="desc"></div><div class="unlock"></div></div>`);
        grid.appendChild(d);
        this.herbNodes[x.id] = { d, key: '', plate: d.querySelector('.plate'), name: d.querySelector('.name'),
          levels: d.querySelector('.levels'), desc: d.querySelector('.desc'), unlock: d.querySelector('.unlock') };
      });
      sec.appendChild(grid);
      $('herb-list').appendChild(sec);
    });
    document.querySelector('.tabs button[data-tab="herbier"]').addEventListener('click', () => { this.herbNew = 0; });

    // Export / import
    const msg = (t, bad) => { $('save-msg').textContent = t; $('save-msg').style.color = bad ? 'var(--bad)' : 'var(--accent2)'; };
    $('btn-export').addEventListener('click', async () => {
      const code = Game.exportSave();
      $('save-text').value = code;
      $('save-text').select();
      try { await navigator.clipboard.writeText(code); msg(t('save.copied')); }
      catch (e) { msg(t('save.ready')); }
    });
    $('btn-download').addEventListener('click', () => {
      const blob = new Blob([Game.exportSave()], { type: 'text/plain' });
      const a = el('a');
      a.href = URL.createObjectURL(blob);
      a.download = `claudius-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      msg(t('save.downloaded'));
    });
    $('btn-import').addEventListener('click', () => {
      const text = $('save-text').value;
      if (!text.trim()) return msg(t('save.pasteFirst'), true);
      if (!confirm(t('save.importConfirm'))) return;
      try {
        Game.importSave(text);
        this.emitImported && this.emitImported();
        msg(t('save.imported'));
      } catch (e) {
        msg(t('save.invalid'), true);
      }
    });
    $('btn-restore').addEventListener('click', () => {
      const b = Game.backupInfo();
      if (!b) return;
      if (!confirm(t('save.restoreConfirm', { n: fmt(b.score) }))) return;
      if (Game.restoreBackup()) {
        this.emitImported && this.emitImported();
        msg(t('save.restored'));
      } else msg(t('save.backupBad'), true);
    });

    this.initV10();
    this.applyText();
  },

  updateBackup() {
    const b = Game.backupInfo();
    $('btn-restore').disabled = !b || !b.better;
    $('backup-info').textContent = b
      ? t('save.backupInfo', { n: fmt(b.score), t: fmtTime(b.playTime), d: new Date(b.lastSave).toLocaleString(L().locale) })
        + (b.better ? t('save.backupBetter') : t('save.backupSame'))
      : t('save.noBackup');
  },

  // Fenêtres à la suite (V11 : la note de l'Héritage passe avant le « Bon retour »)
  modalQueue: [],
  queueModal(html) {
    if (this.modalOpen()) this.modalQueue.push(html); else this.modal(html);
  },
  modal(html) {
    document.querySelector('.modal-box').classList.remove('cl-open', 'legacy-open');
    $('modal-content').innerHTML = html;
    $('modal').classList.remove('hidden');
    Help.close();
  },
  modalOpen() { return !$('modal').classList.contains('hidden') || this.modalQueue.length > 0 || !!this._modalGap; },

  log(msg) {
    const box = $('log');
    box.prepend(el('div', null, msg));
    while (box.children.length > 4) box.lastChild.remove();
  },

  floater(x, y, text) {
    const f = el('div', 'floater', text);
    f.style.left = (x - 20) + 'px';
    f.style.top = (y - 20) + 'px';
    $('floaters').appendChild(f);
    setTimeout(() => f.remove(), 1000);
  },

  spawnDrop() {
    const wrap = $('floaters');
    const d = el('div', 'drop', '💧');
    d.style.left = rand(8, 85) + '%';
    d.style.top = this.freeTop(25, 80) + '%';
    d.title = t('ev.drop');
    d.addEventListener('click', e => {
      e.stopPropagation();
      const msg = Game.collectDrop();
      const r = wrap.getBoundingClientRect();
      this.floater(e.clientX - r.left, e.clientY - r.top, '💧');
      this.toast(msg);
      d.remove();
    });
    wrap.appendChild(d);
    setTimeout(() => d.remove(), 13000);
  },

  spawnBoar() {
    const wrap = $('floaters');
    const b = el('div', 'boar', '🐗');
    b.title = t('ev.boar');
    b.style.animationDuration = BOAR_STAY + 's';
    b.addEventListener('click', e => {
      e.stopPropagation();
      const msg = Game.catchBoar();
      const r = wrap.getBoundingClientRect();
      this.floater(e.clientX - r.left, e.clientY - r.top, '🍄🍄🍄');
      b.remove();
      this.update();
    });
    wrap.appendChild(b);
    setTimeout(() => b.remove(), BOAR_STAY * 1000);
  },

  // Lueur dans la litière (V9) : un spécimen rare luit sous la surface. Le rater ne coûte rien.
  spawnGlow() {
    const wrap = $('floaters');
    const g = el('div', 'glow-spot', '<i></i>');
    g.style.left = rand(10, 88) + '%';
    g.style.top = this.freeTop(32, 82) + '%';
    g.title = t('ev.glow');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', t('ev.glowAria'));
    g.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (g.classList.contains('picked')) return;
      const found = Game.collectGlow();
      const r = wrap.getBoundingClientRect();
      if (found) this.floater(e.clientX - r.left, e.clientY - r.top, found.x.name);
      g.classList.add('picked');
      setTimeout(() => g.remove(), 300);
      this.update();
    });
    wrap.appendChild(g);
    setTimeout(() => g.classList.add('wilt'), (GLOW_STAY - 2) * 1000);
    setTimeout(() => g.remove(), GLOW_STAY * 1000);
  },

  // Poussée de carpophores (V6, redessinée en V7) : grands champignons ivoire et lumineux,
  // bien distincts des champignons de litière du décor. Zone de toucher de 44 px.
  flush: null,   // { total, picked, end } pour l'encart de suivi
  spawnFlush(n) {
    const wrap = $('floaters');
    const end = Date.now() + (FLUSH_STAY + (n - 1) * 0.35) * 1000;
    const f = this.flush = { total: n, picked: 0, end };
    // Annotation de carnet : « à cueillir », le temps de repérer les premiers
    const note = el('div', 'flush-note');
    note.textContent = t('ev.flushNote');
    wrap.appendChild(note);
    setTimeout(() => note.classList.add('gone'), 5000);
    setTimeout(() => note.remove(), 6500);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const m = el('div', 'shroom');
        m.innerHTML = '<i class="halo"></i><i class="stem"></i><i class="cap"></i>';
        m.style.left = (4 + ((i * 0.618 + Math.random() * 0.1) % 1) * 86) + '%';
        m.style.setProperty('--s', (0.9 + Math.random() * 0.3).toFixed(2));
        m.style.setProperty('--d', (Math.random() * 2).toFixed(2) + 's');
        m.title = t('ev.shroom');
        m.setAttribute('role', 'button');
        m.setAttribute('aria-label', t('ev.shroomAria'));
        m.addEventListener('pointerdown', e => {
          e.stopPropagation();
          if (m.classList.contains('picked')) return;
          const gain = Game.pickMushroom();
          if (this.flush === f) f.picked++;
          const r = wrap.getBoundingClientRect();
          this.floater(e.clientX - r.left, e.clientY - r.top, '+' + fmt(gain));
          m.classList.add('picked');
          setTimeout(() => m.remove(), 250);
          this.update();
        });
        wrap.appendChild(m);
        setTimeout(() => m.classList.add('wilt'), (FLUSH_STAY - 2) * 1000);
        setTimeout(() => m.remove(), FLUSH_STAY * 1000);
      }, i * 350);
    }
  },

  toast(msg) { this.log(msg); },

  // Hauteur (en %) où faire apparaître une goutte ou une lueur : jamais sous une note de terrain ouverte (v10)
  freeTop(min, max) {
    const c = this.noteCard, wrap = document.querySelector('.network-wrap');
    if (c && wrap.offsetHeight) {
      const limit = (c.offsetTop - 34) / wrap.offsetHeight * 100;
      if (limit > min + 4) max = Math.min(max, limit);
      else min = max = 22;
    }
    return rand(min, max);
  },

  // ---------- V10 : premières pages ----------
  noteQueue: [], noteCard: null,
  initV10() {
    Help.init();
    this.applySettings();
    try {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => this.applySettings());
    } catch (e) { /* navigateur ancien */ }
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.noteCard) this.closeNote(0); });
  },

  // Textes posés une fois pour toutes à la construction : rejoués à chaque changement de langue
  applyText() {
    applyPageText();
    for (const sp of SPECIES) {
      const n = this.speciesNodes[sp.id];
      n.name.textContent = sp.name;
      n.desc.textContent = sp.desc;
    }
    for (const c of CHALLENGES) {
      const n = this.chalNodes[c.id];
      n.name.textContent = c.name;
      n.name.parentNode.dataset.done = t('chal.done');
      n.rule.textContent = '⚖️ ' + c.ruleText;
      n.goal.textContent = t('chal.goal', { n: fmt(c.goal) });
      n.reward.textContent = '🏆 ' + c.reward;
    }
    for (const br of TALENT_BRANCHES) this.branchNodes[br.id].textContent = br.name;
    for (const x of TALENTS) {
      const n = this.talentNodes[x.id];
      n.name.textContent = x.name;
      n.desc.textContent = x.desc;
      if (n.req) n.req.textContent = t('pre.requires', { names: x.req.map(r => TALENTS.find(y => y.id === r).name).join(' + ') });
    }
    for (const u of SUGAR_UPGRADES) { const n = this.sugarNodes[u.id]; n.name.textContent = u.name; n.desc.textContent = u.desc; }
    for (const r of RELICS) { const n = this.relicNodes[r.id]; n.name.textContent = r.name; n.desc.textContent = r.desc; }
    for (const h of this.herbHeads) h.head.innerHTML = `<span>${t('herb.plate', { n: h.n })}</span> — ${seasonLabel(h.se)}`;
    document.querySelectorAll('button.help').forEach(b => b.setAttribute('aria-label', t('help.open')));
    if ($('sandbox-tag')) $('sandbox-tag').textContent = t('sandbox.tag', { name: SANDBOX });
    $('fossil-unlock').textContent = fmt(FOSSIL_UNLOCK);
    $('chal-total').textContent = CHALLENGES.length;
    $('chal-teaser').textContent = t('pre.chalTeaser', { n: TRIAL_UNLOCK });
    this.plateKey = null;
    if ($('news-text').innerHTML) this.updateNews();  // bandeau des nouveautés déjà construit : on le traduit
    this.upgKey = this.achKey = this.buffKey = this.notesKey = null;
    this._guideKey = null;
    this.buildSettings();
  },

  // ---------- Notes de version (v10) ----------
  // Bandeau en haut de page à l'arrivée d'une nouvelle version ; fermé, il ne revient qu'à la suivante.
  // known : le joueur avait déjà une partie (un nouveau joueur ne reçoit pas les nouveautés de sa première version)
  initChangelog(known) {
    const cur = CHANGELOG[0].version;
    if (Settings.v.seen == null) Settings.set('seen', known ? '' : cur);
    $('news-close').addEventListener('click', () => { Settings.set('seen', cur); this.updateNews(); });
    $('news-open').addEventListener('click', () => { Settings.set('seen', cur); this.updateNews(); this.showChangelog(); });
    $('btn-changelog').addEventListener('click', () => this.showChangelog());
    this.updateNews();
  },
  updateNews() {
    const e = changelogEntries()[0];
    const v = e.version.replace(/\.0$/, '');
    const hide = Settings.v.seen === e.version;
    if (hide !== $('news').classList.contains('hidden')) requestAnimationFrame(() => Network.resize());  // la planche change de taille
    $('news').classList.toggle('hidden', hide);
    $('news-text').innerHTML = `<strong>${t('news.title', { v })}</strong> — <em>${e.title}</em>. ${e.summary || ''}`;
    $('news-open').textContent = t('news.open');
    $('news-close').setAttribute('aria-label', t('news.close'));
    $('cl-current').textContent = t('cl.current', { v });
  },
  showChangelog() {
    const date = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString(L().locale, { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
    const html = changelogEntries().map(e => `<section class="cl-entry">
      <div class="cl-head"><span class="cl-v">v${e.version.replace(/\.0$/, '')}</span><span class="cl-title">${e.title}</span><span class="cl-date">${date(e.date)}</span></div>
      ${['added', 'changed', 'removed', 'fixed'].filter(k => e[k] && e[k].length).map(k =>
        `<div class="cl-k cl-${k}">${t('cl.' + k)}</div><ul>${e[k].map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}
      </section>`).join('');
    this.modal(`<h2>${t('cl.title')}</h2><div class="changelog">${html}</div>`);
    document.querySelector('.modal-box').classList.add('cl-open');
  },

  // Réglages du joueur (v10), dans le Carnet
  buildSettings() {
    const v = Settings.v;
    const ex1 = fmtDec(1.5, 1) + ' M', ex2 = fmtDec(1.5, 1) + 'e6';
    const rows = [
      ['lang', t('set.lang'), [['fr', 'Français'], ['en', 'English']]],
      ['motion', t('set.motion'), [['auto', t('set.motionAuto')], ['on', t('set.on')], ['off', t('set.off')]]],
      ['text', t('set.text'), [[0, t('set.text0')], [1, t('set.text1')], [2, t('set.text2')]]],
      ['contrast', t('set.contrast'), [[false, t('set.off')], [true, t('set.on')]]],
      ['numbers', t('set.numbers'), [['suffix', t('set.suffix', { ex: ex1 })], ['sci', t('set.sci', { ex: ex2 })]]],
    ];
    const box = $('settings');
    box.replaceChildren(...rows.map(([k, label, opts]) => {
      const row = el('div', 'set-row');
      const lab = el('div', 'set-label');
      lab.textContent = label;
      const seg = el('div', 'seg');
      seg.setAttribute('role', 'radiogroup');
      seg.setAttribute('aria-label', label);
      for (const [val, text] of opts) {
        const b = el('button');
        b.type = 'button';
        b.textContent = text;
        if (k === 'lang') b.lang = val;
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(v[k] === val));
        b.classList.toggle('active', v[k] === val);
        b.addEventListener('click', () => this.changeSetting(k, val));
        seg.appendChild(b);
      }
      row.append(lab, seg);
      return row;
    }));
  },
  changeSetting(k, val) {
    if (Settings.v[k] === val) return;
    Settings.set(k, val);
    this.applySettings(k);
  },
  applySettings(changed) {
    const h = document.documentElement;
    const reduced = Settings.reducedMotion();
    h.classList.toggle('reduce-motion', reduced);
    h.classList.toggle('contrast', Settings.v.contrast);
    h.style.setProperty('--fs', TEXT_SIZES[Settings.v.text]);
    h.classList.toggle('text-big', Settings.v.text > 0);
    Network.reduced = reduced;
    if (changed === 'lang') $('log').replaceChildren();  // le journal repart dans la nouvelle langue
    if (changed === 'lang' || changed === 'numbers') {
      applyContentText();
      this.applyText();
    } else if (changed) this.buildSettings();
    if (changed === 'text') requestAnimationFrame(() => Network.resize());
    if (changed) this.update();
  },

  // Notes de terrain : une à la fois, jamais par-dessus une fenêtre
  // urgent : note d'un événement à l'écran (goutte, sanglier…), passe devant les autres
  queueNote(n, urgent) {
    if (!n) return;
    if (urgent) this.noteQueue.unshift(n); else this.noteQueue.push(n);
    this.pumpNotes();
  },
  pumpNotes() {
    if (this.noteCard || !this.noteQueue.length || this.modalOpen() || Game.readOnly) return;
    const n = this.noteQueue.shift();
    Game.noteShown(n.id);
    const c = el('div', 'note-card');
    c.setAttribute('role', 'status');
    c.innerHTML = `<div class="note-kicker"></div><div class="note-title"></div><p class="note-text"></p>
      <div class="note-foot"><span></span><button type="button" class="note-x">✕</button></div>`;
    c.querySelector('.note-kicker').textContent = t('note.kicker');
    c.querySelector('.note-title').textContent = n.title;
    c.querySelector('.note-text').textContent = n.text;
    c.querySelector('.note-foot span').textContent = t('note.close');
    c.querySelector('.note-x').setAttribute('aria-label', t('note.closeAria'));
    // Un geste suffit : toucher la note, ou la faire glisser de côté
    let start = null, dx = 0, dy = 0;
    c.addEventListener('pointerdown', e => {
      e.stopPropagation();
      start = { x: e.clientX, y: e.clientY };
      dx = dy = 0;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    });
    c.addEventListener('pointermove', e => {
      if (!start) return;
      dx = e.clientX - start.x;
      dy = e.clientY - start.y;
      if (Math.abs(dx) > 6) {
        c.style.transform = `translateX(${dx}px)`;
        c.style.opacity = Math.max(0.2, 1 - Math.abs(dx) / 220);
      }
    });
    const up = () => {
      if (!start) return;
      start = null;
      const d = Math.hypot(dx, dy);
      if (d < 12 || Math.abs(dx) > 60 || dy > 40) this.closeNote(dx);
      else { c.style.transform = ''; c.style.opacity = ''; }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { start = null; c.style.transform = ''; c.style.opacity = ''; });
    c.querySelector('.note-x').addEventListener('click', e => { e.stopPropagation(); this.closeNote(0); });
    document.querySelector('.network-wrap').appendChild(c);
    this.noteCard = c;
    this.notesKey = null;
  },
  closeNote(dx) {
    const c = this.noteCard;
    if (!c) return;
    this.noteCard = null;
    c.classList.add('gone');
    c.style.transform = dx ? `translateX(${dx > 0 ? 120 : -120}%)` : '';
    setTimeout(() => c.remove(), 260);
    setTimeout(() => this.pumpNotes(), 1200);
  },
  updateNotesList() {
    const key = NOTES.map(n => (Game.noteSeen(n.id) ? 1 : 0)).join('') + Settings.v.lang;
    if (key === this.notesKey) return;
    this.notesKey = key;
    const seen = NOTES.filter(n => Game.noteSeen(n.id)).length;
    $('notes-count').textContent = t('notes.count', { n: seen, t: NOTES.length });
    $('notes-list').replaceChildren(...NOTES.map(n => {
      const ok = Game.noteSeen(n.id);
      const d = el('div', 'fnote' + (ok ? '' : ' teased'), '<div class="name"></div><div class="desc"></div>');
      d.firstChild.textContent = n.title;
      d.lastChild.textContent = ok ? n.text : t('notes.unknown');
      return d;
    }));
  },

  // Objectifs guidés : un seul à la fois, sous les ressources ; disparaissent une fois tous atteints
  updateGuide() {
    const box = $('guide');
    const i = Game.guideStep();
    if (i < 0) {
      if (this._guideShown && !this._guideEnd) {
        this._guideEnd = Date.now();
        box.classList.add('done');
        $('guide-step').textContent = t('guide.label');
        $('guide-text').textContent = t('guide.done');
        $('guide-count').textContent = '';
        $('guide-bar').style.width = '100%';
      }
      if (!this._guideEnd || Date.now() - this._guideEnd > 6000) box.classList.add('hidden');
      return;
    }
    this._guideShown = true;
    const g = GUIDE[i], have = Math.min(g.n, g.have(Game.s));
    box.classList.remove('hidden');
    if (this._guideIdx !== undefined && this._guideIdx !== i) {
      box.classList.remove('step');
      void box.offsetWidth;  // relance l'animation
      box.classList.add('step');
    }
    this._guideIdx = i;
    const key = i + '|' + have + '|' + Settings.v.lang;
    if (key === this._guideKey) return;
    this._guideKey = key;
    $('guide-step').textContent = `${t('guide.label')} · ${i + 1}/${GUIDE.length}`;
    $('guide-text').textContent = g.text;
    $('guide-count').textContent = g.n > 1 ? `${have} / ${g.n}` : '';
    $('guide-bar').style.width = (i / GUIDE.length * 100 + have / g.n / GUIDE.length * 100) + '%';
  },

  update() {
    const s = Game.s;
    const nps = Game.nps();
    $('nutrients').textContent = fmt(s.nutrients);
    // /s affiché : production passive + revenu des clics et cueillettes des 5 dernières secondes (v10.1)
    const act = Game.activeRate(), shown = nps + act;
    $('nps').textContent = fmt(shown, shown < 100 ? 1 : 0);
    $('nps-click').textContent = act > 0 && act >= shown * 0.01 ? t('res.clickRate', { v: fmt(act, act < 100 ? 1 : 0) }) : '';

    // Spores
    $('spores-box').classList.toggle('hidden', s.spores <= 0);
    $('spores').textContent = fmt(s.spores);
    $('spore-bonus').textContent = fmt(s.spores * Game.sporeBonusPer() * 100) + pctSign();

    // Sucre
    const sugarOn = Game.sugarUnlocked();
    $('sugar-box').classList.toggle('hidden', !sugarOn);
    $('sugar').textContent = fmt(Math.floor(s.sugar));
    const sr = Game.sugarRate();
    $('sugar-rate').textContent = fmt(sr, sr < 10 ? 2 : 0);
    const dry = !!Game.droughtBuff();
    $('btn-water').classList.toggle('hidden', !dry);
    if (dry) {
      $('btn-water').textContent = t('res.water', { n: fmt(Game.waterCost()) });
      $('btn-water').disabled = s.sugar < Game.waterCost();
    }

    // Ambre (V6)
    $('amber-box').classList.toggle('hidden', s.amber <= 0);
    $('amber').textContent = fmt(s.amber);
    $('amber-bonus').textContent = fmt(Game.amberMult(), 2);

    // Colonie rivale (V6)
    const rv = s.rival;
    $('rival-box').classList.toggle('hidden', !rv);
    if (rv) {
      $('rival-hp').textContent = `${Math.max(0, rv.hp)} / ${rv.max}`;
      $('rival-left').textContent = Math.ceil(rv.left);
      $('rival-bar').style.width = (Math.max(0, rv.hp) / rv.max * 100) + '%';
    }

    // Poussée de carpophores en cours (V7)
    const fl = this.flush;
    const flLeft = fl ? Math.ceil((fl.end - Date.now()) / 1000) : 0;
    const flOn = fl && flLeft > 0 && fl.picked < fl.total;
    if (fl && !flOn) this.flush = null;
    $('flush-box').classList.toggle('hidden', !flOn);
    if (flOn) $('flush-text').textContent = t('res.flush', { n: fl.total - fl.picked, t: flLeft });

    // Espèce et planche d'épreuve en cours
    const sp = Game.sp();
    $('species-box').textContent = sp.id === 'commun' && !s.spores ? '' : t('res.species', { name: sp.name });
    const c = Game.trial();
    $('chal-box').classList.toggle('hidden', !c);
    if (c) {
      const pct = Math.min(100, Game.plate(c.id).earned / c.goal * 100);
      $('chal-name').textContent = t('res.chal', { name: c.name });
      $('chal-pct').textContent = fmt(pct, 1) + pctSign();
      $('chal-bar').style.width = pct + '%';
    }

    // Effets en cours : les étiquettes restent en place (l'aide s'y accroche), seul le temps change
    const buffBox = $('buffs');
    const bkey = s.buffs.map(b => (b.lk || b.label) + b.total).join('|') + Settings.v.lang;
    if (bkey !== this.buffKey) {
      this.buffKey = bkey;
      buffBox.replaceChildren(...s.buffs.map((b, i) => {
        const sp = el('span', 'buff');
        sp.dataset.help = 'buff';
        sp.dataset.buff = i;
        return sp;
      }));
    }
    s.buffs.forEach((b, i) => {
      const n = buffBox.children[i];
      if (n) n.textContent = `${buffLabel(b)} · ${Math.ceil(b.left)} s`;
    });

    // Saison
    const season = Game.season();
    $('season-name').textContent = seasonLabel(season);  // sans l'emoji
    $('season-bar').style.width = (Game.seasonProgress() * 100) + '%';
    document.documentElement.style.setProperty('--season-tint', season.tint);

    // Générateurs
    let hiddenShown = false;
    GENERATORS.forEach((g, i) => {
      const r = this.genRows[g.id];
      const visible = Game.genVisible(i);
      if (!visible) {
        // On montre un seul générateur "mystère" pour donner un objectif
        r.row.classList.toggle('hidden', hiddenShown);
        if (!hiddenShown) {
          hiddenShown = true;
          r.row.classList.add('locked');
          r.icon.textContent = '❔';
          r.name.firstChild.textContent = '???';
          r.desc.textContent = t('gens.mysteryDesc', { n: fmt(g.baseCost * 0.4) });
          r.meta.textContent = '';
          r.owned.textContent = '';
          r.cost.textContent = '';
          r.tag.textContent = '';
        }
        return;
      }
      r.row.classList.remove('hidden', 'locked');
      r.icon.textContent = g.icon;
      r.name.firstChild.textContent = g.name;
      r.desc.textContent = g.desc;
      const n = this.buyMode === 'max' ? Math.max(1, Game.maxAffordable(g.id)) : this.buyMode;
      const cost = Game.costOf(g.id, n);
      const can = cost <= s.nutrients;
      r.row.classList.toggle('affordable', can);
      r.row.classList.toggle('too-expensive', !can);
      r.owned.textContent = s.gens[g.id];
      r.cost.textContent = `${n > 1 ? '×' + n + ' · ' : ''}${fmt(cost)}`;
      const unit = Game.genUnitProd(g.id);
      r.meta.textContent = s.gens[g.id]
        ? t('gens.total', { v: fmt(unit, unit < 10 ? 1 : 0), t: fmt(Game.genProd(g.id)) })
        : t('gens.each', { v: fmt(unit, unit < 10 ? 1 : 0) });
      const sm = Game.seasonMult(g.id);
      r.tag.textContent = sm !== 1 ? `×${fmtDec(sm)}` : '';
      r.tag.className = 'season-tag ' + (sm > 1 ? 'up' : sm < 1 ? 'down' : '');
    });

    this.updateUpgrades();
    this.updateAchievements();
    this.updatePrestige();
    this.updateAmber();
    this.updatePlate();
    this.updateHerbarium();
    this.updateStats();
    this.updateGuide();
    Help.refresh();
  },

  updateHerbarium() {
    const s = Game.s;
    const nSp = herbSpecies(s);
    const pct = Math.floor(s.prospect * 100);
    const findable = Game.findableSpecimens().length > 0;
    $('herb-box').classList.toggle('hidden', nSp === 0 && s.stats.playTime < 30);
    $('prospect-pct').textContent = pct + pctSign();
    $('prospect-mini').style.width = pct + '%';
    $('herb-badge').classList.toggle('hidden', !this.herbNew);
    $('herb-badge').textContent = this.herbNew;
    if (!$('tab-herbier').classList.contains('active')) return;
    $('herb-summary').innerHTML = t('herb.summary', { n: nSp, t: SPECIMENS.length, l: Game.herbLevels(), lt: SPECIMENS.length * HERB_MAX_LEVEL, m: fmt(Game.herbMult(), 2) });
    $('prospect-bar').style.width = pct + '%';
    const rate = Game.prospectRate();
    const season = seasonLabel(Game.season()).toLowerCase();
    $('prospect-info').textContent = findable
      ? t('herb.next', { p: pct, t: fmtTime(Math.max(0, (1 - s.prospect) / rate)), every: fmtTime(1 / rate) })
      : t('herb.wait', { p: pct, season });
    for (const x of SPECIMENS) {
      const n = this.herbNodes[x.id];
      const lvl = Game.herbLevel(x.id), reqOk = Game.specimenReqMet(x);
      const key = lvl + '|' + reqOk + '|' + Settings.v.lang;
      if (key === n.key) continue;
      n.key = key;
      n.d.className = 'specimen' + (lvl ? ' found' : ' teased') + (lvl >= HERB_MAX_LEVEL ? ' max' : '');
      n.plate.innerHTML = specimenSVG(x, lvl > 0);
      n.name.textContent = x.name;
      n.levels.innerHTML = lvl ? Array.from({ length: HERB_MAX_LEVEL }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('') : '';
      const cur = lvl ? t('herb.current', { p: fmt((x.gens ? Object.values(x.gens)[0] : x.per) * lvl * 100) }) : '';
      const per = t('herb.perLevel', { effect: x.effect, cur });
      n.desc.textContent = lvl ? `${x.note} ${per}` : per;
      const seasonName = seasonLabel(SEASONS.find(se => se.id === x.season)).toLowerCase();
      const gen = x.req && GENERATORS.find(g => g.id === x.req);
      n.unlock.textContent = lvl ? (lvl >= HERB_MAX_LEVEL ? t('herb.max') : t('herb.level', { l: lvl, max: HERB_MAX_LEVEL, season: seasonName }))
        : t('herb.where', { season: seasonName }) + (reqOk ? '' : t('herb.needs', { gen: gen.name }));
    }
  },

  updateUpgrades() {
    const s = Game.s;
    const avail = Game.availableUpgrades().sort((a, b) => a.cost - b.cost);
    const locked = Game.lockedUpgrades();
    const key = avail.map(u => u.id).join(',') + '|' + locked.map(u => u.id).join(',') + '|' + Settings.v.lang + Settings.v.numbers;
    const list = $('upg-list');
    if (key !== this.upgKey) {
      this.upgKey = key;
      list.innerHTML = '';
      avail.forEach(u => {
        const d = el('div', 'upg', `<div class="name">${u.name}</div><div class="desc">${u.desc}</div><div class="cost">${fmt(u.cost)}</div>`);
        d.dataset.id = u.id;
        d.dataset.cost = u.cost;
        d.addEventListener('click', () => { if (Game.buyUpgrade(u.id)) this.update(); });
        list.appendChild(d);
      });
      locked.forEach(u => {
        list.appendChild(el('div', 'upg teased',
          `<div class="name">${u.name}</div><div class="desc">${u.desc}</div>
           <div class="cost">${fmt(u.cost)}</div><div class="unlock">${t('upg.condition', { hint: u.hint })}</div>`));
      });
    }
    let affordable = 0;
    list.querySelectorAll('.upg:not(.teased)').forEach(d => {
      const can = Number(d.dataset.cost) <= s.nutrients;
      if (can) affordable++;
      d.classList.toggle('affordable', can);
      d.classList.toggle('too-expensive', !can);
    });
    $('upg-empty').classList.toggle('hidden', avail.length + locked.length > 0);

    // Évolutions sucrées : aperçu grisé tant qu'il n'y a pas de sucre
    const sugarOn = Game.sugarUnlocked();
    $('sugar-list').classList.toggle('teased', !sugarOn);
    $('sugar-hint').textContent = sugarOn ? t('upg.sugarHint') : t('upg.sugarLocked');
    for (const u of SUGAR_UPGRADES) {
      const st = sugarOn ? Game.sugarUpgState(u) : 'poor';
      if (st === 'buyable') affordable++;
      const { d, cost } = this.sugarNodes[u.id];
      d.className = 'upg sugar ' + st;
      cost.textContent = st === 'owned' ? t('upg.owned') : t('upg.sugarCost', { n: fmt(u.cost) });
    }
    $('upg-badge').classList.toggle('hidden', affordable === 0);
    $('upg-badge').textContent = affordable;
  },

  updateAchievements() {
    const key = Object.keys(Game.s.achievements).join(',') + Settings.v.lang;
    if (key === this.achKey) return;
    this.achKey = key;
    // jalon exclusif (V11, Ancien des forêts) : seulement pour ceux qui l'ont
    $('ach-list').innerHTML = ACHIEVEMENTS.filter(a => !a.exclusive || Game.s.achievements[a.id]).map(a => {
      const done = Game.s.achievements[a.id];
      return `<div class="ach ${done ? 'done' : ''}${a.exclusive ? ' exclusive' : ''}"><div class="name">${a.name}</div><div class="desc">${a.desc}</div></div>`;
    }).join('');
  },

  updatePrestige() {
    const s = Game.s;
    const pr = Game.sporeProgress();
    const per = Game.sporeBonusPer() * 100;
    $('prestige-have-line').innerHTML = t('pre.have', { n: fmt(s.spores), p: fmt(s.spores * per) });
    $('prestige-bar').style.width = (pr.pct * 100) + '%';
    $('prestige-next-line').textContent = isFinite(pr.next)
      ? t('pre.next', { a: fmt(pr.have), b: fmt(pr.next) }) : t('pre.capped');
    $('prestige-fruit-line').textContent = t('pre.fruit', { n: fmt(s.nextFruit) });
    // Avant la toute première spore, l'arbre est montré en aperçu
    const teaser = Game.s.spores <= 0;
    $('talent-tree').classList.toggle('teased', teaser);
    $('tree-teaser').classList.toggle('hidden', !teaser);

    $('spores-avail').textContent = fmt(Game.sporesAvailable());
    let buyable = 0;
    for (const x of TALENTS) {
      const st = Game.talentState(x);
      if (st === 'buyable') buyable++;
      const { n, cost } = this.talentNodes[x.id];
      n.className = 'talent ' + st;
      cost.textContent = st === 'owned' ? t('pre.learned') : t(x.cost > 1 ? 'pre.sporesCost' : 'pre.sporeCost', { n: x.cost });
    }
    $('talent-badge').classList.toggle('hidden', buyable === 0);

    const canMut = Game.canMutate();
    $('mutation-state').textContent = s.spores < 1 ? '' : canMut ? t('pre.mutReady') : t('pre.mutWait');
    for (const sp of SPECIES) {
      const { d, style } = this.speciesNodes[sp.id];
      const open = Game.speciesUnlocked(sp), cur = s.species === sp.id;
      d.className = 'species' + (open ? '' : ' locked') + (cur ? ' current chosen' : '') + (open && !cur && !canMut ? ' waiting' : '');
      d.setAttribute('aria-disabled', String(!open || cur || !canMut));
      style.textContent = open ? `${sp.style}${cur ? t('pre.current') : ''}` : t('pre.locked', { text: sp.unlock.text });
    }

    const chalOn = Game.challengesUnlocked();
    const running = Game.trial();
    $('chal-list').classList.toggle('teased', !chalOn);
    $('chal-teaser').classList.toggle('hidden', chalOn);
    $('chal-done-count').textContent = Object.keys(s.challengesDone).filter(id => CHALLENGES.some(c => c.id === id)).length;
    for (const c of CHALLENGES) {
      const { d, btn } = this.chalNodes[c.id];
      const done = Game.chalDone(c.id), active = running === c;
      d.className = 'chal' + (done ? ' done' : '') + (active ? ' active' : '');
      btn.textContent = active ? t('chal.running') : done ? t('chal.doneBtn') : t('chal.launch');
      btn.disabled = active || done || !!running || !chalOn;
    }
    $('talent-badge').textContent = buyable;
  },

  updateAmber() {
    const s = Game.s;
    const have = s.spores, level = amberFor(have);
    const prev = amberNeeded(level), next = amberNeeded(level + 1);
    $('fossil-gain').textContent = t('amb.gain', { n: fmt(s.amber), m: fmt(Game.amberMult(), 2) });
    $('fossil-have').textContent = fmt(have);
    $('fossil-next').textContent = fmt(next);
    $('fossil-bar').style.width = Math.min(100, Math.max(0, (have - prev) / (next - prev) * 100)) + '%';
    const open = Game.amberUnlocked();
    $('relic-list').classList.toggle('teased', !open);
    $('relic-teaser').classList.toggle('hidden', open);
    $('amber-avail').textContent = fmt(Game.amberAvailable());
    let buyable = 0;
    for (const r of RELICS) {
      const st = Game.relicState(r);
      if (st === 'buyable') buyable++;
      const { d, cost } = this.relicNodes[r.id];
      d.className = 'upg relic ' + st;
      cost.textContent = st === 'owned' ? t('upg.owned') : t('amb.cost', { n: r.cost });
    }
    $('relic-badge').classList.toggle('hidden', buyable === 0);
    $('relic-badge').textContent = buyable;
  },

  updateStats() {
    if (!$('tab-stats').classList.contains('active')) return;
    if (!this._backupTick || Date.now() - this._backupTick > 2000) { this._backupTick = Date.now(); this.updateBackup(); }
    const st = Game.s.stats;
    const pc = isEn() ? '%' : ' %';
    const rows = [
      ['st.playTime', fmtTime(st.playTime)],
      ['st.allTime', fmt(st.allTimeEarned)],
      ['st.clicks', fmt(st.clicks)],
      ['st.clickValue', fmt(Game.clickValue(), 1)],
      ['st.clickEarned', fmt(st.clickEarned)],
      ['st.drops', fmt(st.dropsClicked)],
      ['st.seasons', fmt(st.seasonsSeen)],
      ['st.spores', fmt(Game.s.spores)],
      ['st.fruitings', fmt(st.fruitings)],
      ...(st.prestiges > 0 ? [['st.prestiges', fmt(st.prestiges)]] : []),
      ['st.talents', `${Object.keys(Game.s.talents).length} / ${TALENTS.length}`],
      ['st.sugar', fmt(st.sugarEarned)],
      ['st.boars', fmt(st.boars)],
      ['st.species', `${Game.sp().icon} ${Game.sp().name}`],
      ['st.chal', `${Object.keys(Game.s.challengesDone).length} / ${CHALLENGES.length}`],
      ['st.droughts', fmt(st.droughts)],
      ['st.rivals', fmt(st.rivals)],
      ['st.flush', fmt(st.flushPicked)],
      ['st.herb', t('st.herbVal', { n: herbSpecies(Game.s), t: SPECIMENS.length, m: fmt(Game.herbMult(), 2) })],
      ['st.specimens', fmt(st.specimens)],
      ['st.glows', fmt(st.glows)],
      ['st.amber', `${fmt(Game.s.amber)} (×${fmt(Game.amberMult(), 2)})`],
      ['st.relics', `${Object.keys(Game.s.relics).length} / ${RELICS.length}`],
      ['st.ach', `${Game.achCount()} / ${Game.achTotal()} (+${Game.achCount() * 2}${pc})`],
      ['st.perm', '×' + fmt(Game.permanentMult(), 2)],
      ['st.branches', fmt(Network.nodes.length)],
    ];
    $('stats').innerHTML = rows.map(r => `<tr><td>${t(r[0])}</td><td>${r[1]}</td></tr>`).join('');
    this.updateNotesList();
    this.updateLegacy();
  },

  // ---------- Héritage des anciennes forêts (V11) ----------
  updateLegacy() {
    const lg = Game.s.legacy;
    $('legacy-sec').classList.toggle('hidden', !lg);
    if (!lg) return;
    $('legacy-text').innerHTML = t(lg.n > 1 ? 'leg.text' : 'leg.text1', { n: fmt(lg.n), p: fmt((Game.legacyMult() - 1) * 100) });
  },
  legacyHTML() {
    const lg = Game.s.legacy;
    const p = fmt((Game.legacyMult() - 1) * 100);
    return `<div class="legacy-note"><div class="note-kicker">${t('leg.kicker')}</div>
      <h2>${t('leg.noteTitle')}</h2>
      ${t('leg.note', { s: lg.n > 2 ? t('leg.many', { n: fmt(lg.n) }) : t(lg.n === 2 ? 'leg.twice' : 'leg.once') }).split('\n').map(x => `<p>${x}</p>`).join('')}
      <ul class="legacy-gifts"><li>${t('leg.gift1', { p })}</li><li>${t('leg.gift2')}</li><li>${t('leg.gift3')}</li><li>${t('leg.gift4')}</li></ul>
      <p class="legacy-sign">${t('leg.sign')}</p></div>`;
  },
  showLegacy() {
    if (!Game.s.legacy) return;
    this.modal(this.legacyHTML());
    document.querySelector('.modal-box').classList.add('legacy-open');
  },

  // ---------- Planche d'épreuve (V11) ----------
  // Petit réseau à part : sa planche dessinée, ses générateurs, sa barre d'objectif. Rien n'y touche le réseau principal.
  initPlate() {
    this.plateView = PlateView.make($('plate-canvas'));
    this.plateRows = {};
    $('plate-canvas').addEventListener('pointerdown', e => {
      const def = Game.trial();
      if (!def) return;
      const v = Game.clickPlate(def.id);
      this.plateView.clickBurst();
      const r = $('plate-canvas').getBoundingClientRect();
      const f = el('div', 'floater', def.rule.noClick ? '0' : '+' + fmt(v));
      f.style.left = (e.clientX - r.left - 20) + 'px';
      f.style.top = (e.clientY - r.top - 20) + 'px';
      $('plate-floaters').appendChild(f);
      setTimeout(() => f.remove(), 1000);
      this.update();
    });
  },
  // Rejoue le dessin de la planche en cours (au lancement, au chargement, à l'import)
  openPlate() {
    const def = Game.trial();
    this.plateKey = null;
    $('plate-panel').classList.toggle('hidden', !def);
    if (!def) { this.plateView.plateId = null; return; }
    requestAnimationFrame(() => {
      this.plateView.resize();
      this.plateView.rebuild(Game.plate(def.id));
      this.plateView.plateId = def.id;
    });
  },
  platePanelVisible() { return !!Game.trial() && $('tab-prestige').classList.contains('active'); },
  updatePlate() {
    const def = Game.trial();
    $('plate-panel').classList.toggle('hidden', !def);
    if (!def) return;
    if (this.plateView.plateId !== def.id) this.openPlate();
    if (!$('tab-prestige').classList.contains('active')) return;
    const p = Game.plate(def.id);
    const list = Game.plateGens(def);
    const key = def.id + '|' + Settings.v.lang + Settings.v.numbers;
    if (key !== this.plateKey) {
      this.plateKey = key;
      $('plate-icon').textContent = def.icon;
      $('plate-name').textContent = def.name;
      $('plate-rule').textContent = '⚖️ ' + def.ruleText;
      $('plate-caption').innerHTML = t('plate.trialCaption', { name: def.name });
      this.plateRows = {};
      $('plate-gens').replaceChildren(...list.map(g => {
        const row = el('button', 'pgen', `<span class="icon">${g.icon}</span><span class="pname"></span><span class="powned"></span><span class="pcost"></span>`);
        row.type = 'button';
        row.addEventListener('click', () => { if (Game.buyPlateGen(def.id, g.id, this.buyMode)) this.update(); });
        this.plateRows[g.id] = { row, name: row.querySelector('.pname'), owned: row.querySelector('.powned'), cost: row.querySelector('.pcost'), icon: row.querySelector('.icon') };
        return row;
      }));
    }
    const nps = Game.plateNps(def);
    $('plate-nutrients').innerHTML = t('plate.nutrients', { n: fmt(p.nutrients) });
    $('plate-nps').textContent = t('plate.nps', { v: fmt(nps, nps < 100 ? 1 : 0) });
    const pct = Math.min(1, p.earned / def.goal);
    $('plate-bar').style.width = (pct * 100) + '%';
    $('plate-goal').textContent = t('plate.goal', { a: fmt(p.earned), b: fmt(def.goal), p: fmt(pct * 100, 1) });
    let mystery = false;
    list.forEach((g, i) => {
      const r = this.plateRows[g.id];
      const vis = Game.plateGenVisible(def, i);
      r.row.classList.toggle('hidden', !vis && mystery);
      if (!vis) {
        mystery = true;
        r.row.classList.add('locked');
        r.row.disabled = true;
        r.icon.textContent = '❔';
        r.name.textContent = '???';
        r.owned.textContent = '';
        r.cost.textContent = t('plate.mystery', { n: fmt(g.baseCost * 0.4) });
        return;
      }
      r.row.classList.remove('locked');
      r.icon.textContent = g.icon;
      r.name.textContent = g.name;
      const n = this.buyMode === 'max' ? Math.max(1, Game.plateMaxAffordable(def, g.id)) : this.buyMode;
      const cost = Game.plateCost(def, g.id, n);
      const can = cost <= p.nutrients;
      r.row.disabled = !can;
      r.row.classList.toggle('affordable', can);
      r.owned.textContent = p.gens[g.id] || 0;
      r.cost.textContent = `${n > 1 ? '×' + n + ' · ' : ''}${fmt(cost)}`;
    });
  },
};

// Planche d'herbier (V9) : un dessin à la plume par forme de champignon.
// found = false : silhouette grisée, pour l'aperçu des espèces pas encore trouvées.
function specimenSVG(x, found) {
  const cap = found ? x.cap : 'rgba(236,226,207,.10)';
  const stem = found ? (x.stem || x.cap) : 'rgba(236,226,207,.07)';
  const line = found ? 'rgba(20,14,9,.55)' : 'rgba(236,226,207,.28)';
  const dash = found ? '' : ' stroke-dasharray="2 2"';
  const st = `stroke="${line}" stroke-width="1"${dash}`;
  const hi = found ? 'rgba(255,250,235,.35)' : 'none';
  const ink = found ? 'rgba(20,14,9,.4)' : 'rgba(236,226,207,.18)';
  let body = '';
  switch (x.shape) {
    case 'convex':
      body = `<path d="M36 70 Q35 56 37 43 L43 43 Q45 56 44 70 Z" fill="${stem}" ${st}/>
        <path d="M14 45 Q14 18 40 17 Q66 18 66 45 Q40 49 14 45 Z" fill="${cap}" ${st}/>
        <path d="M24 26 Q32 20 42 21" stroke="${hi}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M20 46 L60 46" stroke="${ink}" stroke-width="1"/>`;
      break;
    case 'bolete':
      body = `<path d="M31 70 Q24 57 34 44 L46 44 Q56 57 49 70 Z" fill="${stem}" ${st}/>
        <path d="M11 46 Q11 15 40 14 Q69 15 69 46 Q40 51 11 46 Z" fill="${cap}" ${st}/>
        <path d="M22 25 Q31 18 43 18" stroke="${hi}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M36 52 L37 64 M42 52 L43 66" stroke="${ink}" stroke-width=".7"/>`;
      break;
    case 'funnel':
      body = `<path d="M37 70 L43 70 L48 42 Q60 32 64 25 Q40 33 16 25 Q20 32 32 42 Z" fill="${stem}" ${st}/>
        <ellipse cx="40" cy="25.5" rx="24" ry="4.5" fill="${cap}" ${st}/>
        <path d="M34 40 L38 62 M40 38 L40 64 M46 40 L42 62" stroke="${ink}" stroke-width=".7"/>`;
      break;
    case 'morel':
      body = `<path d="M34 70 L46 70 L45 50 L35 50 Z" fill="${stem}" ${st}/>
        <path d="M30 52 Q23 30 40 9 Q57 30 50 52 Q40 55 30 52 Z" fill="${cap}" ${st}/>
        <path d="M33 22 Q40 26 47 22 M29 33 Q40 38 51 33 M29 44 Q40 48 51 44 M36 14 L33 52 M44 14 L47 52 M40 9 L40 54" stroke="${ink}" stroke-width="1" fill="none"/>`;
      break;
    case 'cup':
      body = `<path d="M16 50 Q19 70 40 70 Q61 70 64 50 Q40 57 16 50 Z" fill="${cap}" ${st}/>
        <ellipse cx="40" cy="50" rx="24" ry="5.5" fill="${found ? 'rgba(255,220,170,.35)' : 'none'}" ${st}/>`;
      break;
    case 'shaggy':
      body = `<path d="M38 70 L42 70 L41.5 30 L38.5 30 Z" fill="${stem}" ${st}/>
        <path d="M28 52 Q25 14 40 7 Q55 14 52 52 Q40 55 28 52 Z" fill="${cap}" ${st}/>
        <path d="M34 18 l2 3 M44 16 l-2 3 M32 28 l2 3 M40 25 l0 3 M48 28 l-2 3 M31 39 l2 3 M39 36 l1 3 M47 40 l-2 3" stroke="${ink}" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M29 51 Q40 56 51 51" stroke="${found ? 'rgba(30,24,20,.8)' : ink}" stroke-width="2.5" fill="none"/>`;
      break;
    case 'bell':
      body = (found && x.glow ? `<circle cx="40" cy="38" r="26" fill="url(#glow-${x.id})"/>` : '')
        + `<path d="M39.3 70 L40.7 70 L40.5 40 L39.5 40 Z" fill="${stem}" ${st}/>
        <path d="M29 42 Q31 25 40 23 Q49 25 51 42 Q40 45 29 42 Z" fill="${cap}" ${st}/>
        <path d="M34 41 L37 28 M40 43 L40 25 M46 41 L43 28" stroke="${ink}" stroke-width=".6"/>
        <path d="M22 70 L24 66 L27 70 M52 70 L55 67 L57 70" stroke="${found ? stem : 'none'}" stroke-width="1" fill="none"/>`;
      break;
    case 'cage':
      body = `<ellipse cx="40" cy="44" rx="21" ry="24" fill="none" stroke="${cap}" stroke-width="3.5"${dash}/>
        <path d="M22 34 Q40 44 58 34 M20 50 Q40 58 60 50 M30 22 Q36 44 30 66 M50 22 Q44 44 50 66 M40 20 L40 68" stroke="${cap}" stroke-width="3" fill="none"${dash}/>
        <ellipse cx="40" cy="69" rx="10" ry="2.5" fill="${found ? '#ece2cf' : 'none'}" ${st}/>`;
      break;
    case 'bracket':
      body = `<path d="M58 6 L72 6 L72 74 L58 74 Z" fill="${found ? '#3b3027' : 'none'}" ${st}/>
        <path d="M62 14 l6 0 M61 30 l8 0 M62 66 l5 0" stroke="${found ? 'rgba(236,226,207,.35)' : ink}" stroke-width="1"/>
        <path d="M58 30 Q30 26 20 38 Q36 46 58 43 Z" fill="${cap}" ${st}/>
        <path d="M58 52 Q40 50 32 58 Q44 63 58 61 Z" fill="${cap}" ${st}/>
        <path d="M26 37 Q40 38 56 35 M36 57 Q46 58 56 56" stroke="${ink}" stroke-width=".8" fill="none"/>`;
      break;
  }
  const defs = x.glow ? `<defs><radialGradient id="glow-${x.id}"><stop offset="0" stop-color="#c8eca8" stop-opacity=".55"/><stop offset="1" stop-color="#c8eca8" stop-opacity="0"/></radialGradient></defs>` : '';
  return `<svg viewBox="0 0 80 80" aria-hidden="true">${defs}<path d="M6 70.5 L74 70.5" stroke="rgba(236,226,207,.25)" stroke-width="1"/>${body}</svg>`;
}
