// Interface : construction et mise à jour du DOM
const $ = id => document.getElementById(id);

const UI = {
  buyMode: 1,
  genRows: {},
  upgKey: '',
  achKey: '',

  init() {
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

    $('btn-prestige').addEventListener('click', () => {
      const gain = Game.prestigeGain();
      if (gain < 1) return;
      const sp = SPECIES.find(x => x.id === Game.s.nextSpecies);
      if (!confirm(`Sporuler et gagner ${gain} spore(s) ? Ton réseau actuel sera perdu.\nProchain cycle : ${sp.icon} ${sp.name}.`)) return;
      Game.prestige();
    });

    // Espèces (V4)
    this.speciesNodes = {};
    SPECIES.forEach(sp => {
      const d = el('div', 'species', `<div class="name"><span class="glyph">${sp.icon}</span>${sp.name}</div>
        <div class="style small"></div><div class="desc">${sp.desc}</div>`);
      d.addEventListener('click', () => { if (Game.chooseSpecies(sp.id)) this.update(); });
      $('species-list').appendChild(d);
      this.speciesNodes[sp.id] = { d, style: d.querySelector('.style') };
    });

    // Défis (V4)
    this.chalNodes = {};
    $('chal-total').textContent = CHALLENGES.length;
    CHALLENGES.forEach(c => {
      const d = el('div', 'chal', `<div class="chal-head"><div class="name"><span class="glyph">${c.icon}</span>${c.name}</div><button>Lancer</button></div>
        <div class="desc">⚖️ ${c.rule}</div>
        <div class="desc">🎯 Objectif : ${fmt(c.goal)} nutriments sur le cycle</div>
        <div class="reward small">🏆 ${c.reward}</div>`);
      const btn = d.querySelector('button');
      btn.addEventListener('click', () => {
        const gain = Game.prestigeGain();
        const sp = SPECIES.find(x => x.id === Game.s.nextSpecies);
        const msg = `Lancer le défi « ${c.name} » ? Ton réseau actuel sera perdu`
          + (gain >= 1 ? ` (tu gagnes ${gain} spore(s))` : ' (aucune spore gagnée)')
          + `.\nEspèce : ${sp.icon} ${sp.name}.`;
        if (!confirm(msg)) return;
        Game.startChallenge(c.id);
      });
      $('chal-list').appendChild(d);
      this.chalNodes[c.id] = { d, btn };
    });
    $('btn-abandon').addEventListener('click', () => {
      if (!confirm('Abandonner le défi ? Ton cycle continue normalement, sans récompense.')) return;
      Game.abandonChallenge();
      this.update();
    });
    $('modal-ok').addEventListener('click', () => $('modal').classList.add('hidden'));

    // Arbre de talents
    const tree = $('talent-tree');
    this.talentNodes = {};
    TALENT_BRANCHES.forEach(br => {
      const col = el('div', 'branch', `<div class="branch-name">${br.name}</div>`);
      TALENTS.filter(t => t.branch === br.id).forEach(t => {
        const reqNames = t.req.map(r => TALENTS.find(x => x.id === r).name).join(' + ');
        const n = el('div', 'talent', `
          <div class="name"><span class="glyph">${t.icon}</span>${t.name}</div>
          <div class="desc">${t.desc}</div>
          <div class="cost"></div>
          ${t.req.length > 1 ? `<div class="req small muted">Requiert ${reqNames}</div>` : ''}`);
        n.addEventListener('click', () => { if (Game.buyTalent(t.id)) this.update(); });
        col.appendChild(n);
        this.talentNodes[t.id] = { n, cost: n.querySelector('.cost') };
      });
      tree.appendChild(col);
    });

    // Évolutions sucrées (V3)
    const sl = $('sugar-list');
    this.sugarNodes = {};
    SUGAR_UPGRADES.forEach(u => {
      const d = el('div', 'upg sugar', `<div class="name"><span class="glyph">${u.icon}</span>${u.name}</div><div class="desc">${u.desc}</div><div class="cost"></div>`);
      d.addEventListener('click', () => { if (Game.buySugarUpg(u.id)) this.update(); });
      sl.appendChild(d);
      this.sugarNodes[u.id] = { d, cost: d.querySelector('.cost') };
    });
    $('btn-water').addEventListener('click', () => { if (Game.waterDrought()) this.update(); });

    // Ambre et reliques (V6)
    $('fossil-unlock').textContent = fmt(FOSSIL_UNLOCK);
    this.relicNodes = {};
    RELICS.forEach(r => {
      const d = el('div', 'upg relic', `<div class="name"><span class="glyph">${r.icon}</span>${r.name}</div><div class="desc">${r.desc}</div><div class="cost"></div>`);
      d.addEventListener('click', () => { if (Game.buyRelic(r.id)) this.update(); });
      $('relic-list').appendChild(d);
      this.relicNodes[r.id] = { d, cost: d.querySelector('.cost') };
    });

    // Herbier (V9) : une planche par espèce, regroupées par saison
    this.herbNodes = {};
    this.herbNew = 0;
    SEASONS.forEach((se, i) => {
      const sec = el('div', 'herb-season', `<div class="herb-season-head"><span>Pl. ${['II', 'III', 'IV', 'V'][i]}</span> — ${se.name.replace(/^\S+\s+/, '')}</div>`);
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
      try { await navigator.clipboard.writeText(code); msg('Code copié dans le presse-papiers ✔'); }
      catch (e) { msg('Code prêt : sélectionne-le et copie-le.'); }
    });
    $('btn-download').addEventListener('click', () => {
      const blob = new Blob([Game.exportSave()], { type: 'text/plain' });
      const a = el('a');
      a.href = URL.createObjectURL(blob);
      a.download = `claudius-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      msg('Fichier téléchargé ✔');
    });
    $('btn-import').addEventListener('click', () => {
      const text = $('save-text').value;
      if (!text.trim()) return msg('Colle d’abord un code de sauvegarde.', true);
      if (!confirm('Remplacer la partie actuelle par celle importée ?')) return;
      try {
        Game.importSave(text);
        this.emitImported && this.emitImported();
        msg('Partie importée ✔');
      } catch (e) {
        msg('Code invalide : rien n’a été modifié.', true);
      }
    });
    $('btn-restore').addEventListener('click', () => {
      const b = Game.backupInfo();
      if (!b) return;
      if (!confirm(`Remplacer la partie actuelle par le secours (${fmt(b.score)} nutriments gagnés au total) ?`)) return;
      if (Game.restoreBackup()) {
        this.emitImported && this.emitImported();
        msg('Sauvegarde de secours restaurée ✔');
      } else msg('Le secours est illisible : rien n’a été modifié.', true);
    });
  },

  updateBackup() {
    const b = Game.backupInfo();
    $('btn-restore').disabled = !b || !b.better;
    $('backup-info').textContent = b
      ? `${fmt(b.score)} nutriments gagnés au total · ${fmtTime(b.playTime)} de jeu · sauvée le ${new Date(b.lastSave).toLocaleString('fr-FR')}`
        + (b.better ? ' · plus avancée que ta partie actuelle' : ' · c’est ta partie actuelle')
      : 'Aucune pour l’instant.';
  },

  modal(html) {
    $('modal-content').innerHTML = html;
    $('modal').classList.remove('hidden');
  },

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
    d.style.top = rand(25, 80) + '%';
    d.title = 'Une goutte de pluie ! Attrape-la.';
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
    b.title = 'Un sanglier truffier ! Attire-le pour qu’il disperse tes spores.';
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
    g.style.top = rand(32, 82) + '%';
    g.title = 'Une lueur dans la litière : un spécimen pour ton herbier';
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', 'Ramasser le spécimen lumineux');
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
    const note = el('div', 'flush-note', 'carpophores — à cueillir');
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
        m.title = 'Un carpophore ! Cueille-le.';
        m.setAttribute('role', 'button');
        m.setAttribute('aria-label', 'Cueillir le carpophore');
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

  update() {
    const s = Game.s;
    const nps = Game.nps();
    $('nutrients').textContent = fmt(s.nutrients);
    $('nps').textContent = fmt(nps, nps < 100 ? 1 : 0);

    // Spores
    $('spores-box').classList.toggle('hidden', s.spores <= 0);
    $('spores').textContent = fmt(s.spores);
    $('spore-bonus').textContent = fmt(s.spores * Game.sporeBonusPer() * 100);

    // Sucre
    const sugarOn = Game.sugarUnlocked();
    $('sugar-box').classList.toggle('hidden', !sugarOn);
    $('sugar').textContent = fmt(Math.floor(s.sugar));
    const sr = Game.sugarRate();
    $('sugar-rate').textContent = fmt(sr, sr < 10 ? 2 : 0);
    const dry = !!Game.droughtBuff();
    $('btn-water').classList.toggle('hidden', !dry);
    if (dry) {
      $('water-cost').textContent = fmt(Game.waterCost());
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
    if (flOn) {
      $('flush-left').textContent = fl.total - fl.picked;
      $('flush-time').textContent = flLeft;
    }

    // Espèce et défi en cours
    const sp = Game.sp();
    $('species-box').textContent = sp.id === 'commun' && !s.stats.prestiges ? '' : `Espèce : ${sp.name}`;
    const c = Game.chal();
    $('chal-box').classList.toggle('hidden', !c);
    if (c) {
      const pct = Math.min(100, s.stats.totalEarned / c.goal * 100);
      $('chal-name').textContent = `Défi : ${c.name}`;
      $('chal-pct').textContent = fmt(pct, 1);
      $('chal-bar').style.width = pct + '%';
    }

    // Buffs
    const buffBox = $('buffs');
    buffBox.replaceChildren(...s.buffs.map(b => {
      const sp = el('span', 'buff');
      sp.textContent = `${b.label} · ${Math.ceil(b.left)} s`;
      return sp;
    }));

    // Saison
    const season = Game.season();
    $('season-name').textContent = season.name.replace(/^\S+\s+/, '');  // sans l'emoji
    $('season-name').title = season.hint;
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
          r.desc.textContent = `Atteins ${fmt(g.baseCost * 0.4)} nutriments sur ce cycle pour le découvrir.`;
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
      if (Game.genBlocked(g.id)) {
        r.row.classList.add('locked');
        r.row.classList.remove('affordable', 'too-expensive');
        r.desc.textContent = 'Interdit pendant le défi « Filament solitaire ».';
        r.meta.textContent = '';
        r.cost.textContent = '';
        r.owned.textContent = s.gens[g.id] || '';
        r.tag.textContent = '';
        return;
      }
      const n = this.buyMode === 'max' ? Math.max(1, Game.maxAffordable(g.id)) : this.buyMode;
      const cost = Game.costOf(g.id, n);
      const can = cost <= s.nutrients;
      r.row.classList.toggle('affordable', can);
      r.row.classList.toggle('too-expensive', !can);
      r.owned.textContent = s.gens[g.id];
      r.cost.textContent = `${n > 1 ? '×' + n + ' · ' : ''}${fmt(cost)}`;
      const unit = Game.genUnitProd(g.id);
      r.meta.textContent = s.gens[g.id]
        ? `${fmt(unit, unit < 10 ? 1 : 0)}/s chacun · ${fmt(Game.genProd(g.id))}/s au total`
        : `${fmt(unit, unit < 10 ? 1 : 0)}/s chacun`;
      const sm = Game.seasonMult(g.id);
      r.tag.textContent = sm !== 1 ? `×${String(sm).replace('.', ',')}` : '';
      r.tag.className = 'season-tag ' + (sm > 1 ? 'up' : sm < 1 ? 'down' : '');
    });

    this.updateUpgrades();
    this.updateAchievements();
    this.updatePrestige();
    this.updateAmber();
    this.updateHerbarium();
    this.updateStats();
  },

  updateHerbarium() {
    const s = Game.s;
    const nSp = herbSpecies(s);
    const pct = Math.floor(s.prospect * 100);
    const findable = Game.findableSpecimens().length > 0;
    $('herb-box').classList.toggle('hidden', nSp === 0 && s.stats.playTime < 30);
    $('prospect-pct').textContent = pct;
    $('prospect-mini').style.width = pct + '%';
    $('herb-badge').classList.toggle('hidden', !this.herbNew);
    $('herb-badge').textContent = this.herbNew;
    if (!$('tab-herbier').classList.contains('active')) return;
    $('herb-summary').innerHTML = `<strong>${nSp}</strong> / ${SPECIMENS.length} espèces · ${Game.herbLevels()} / ${SPECIMENS.length * HERB_MAX_LEVEL} niveaux · production <strong>×${fmt(Game.herbMult(), 2)}</strong>`;
    $('prospect-bar').style.width = pct + '%';
    const rate = Game.prospectRate();
    const season = Game.season().name.replace(/^\S+\s+/, '').toLowerCase();
    $('prospect-info').textContent = findable
      ? `Prospection : ${pct} % · prochaine trouvaille dans ${fmtTime(Math.max(0, (1 - s.prospect) / rate))} environ (une toutes les ${fmtTime(1 / rate)}).`
      : `Prospection : ${pct} % · rien de nouveau à trouver en ${season} pour l’instant : la trouvaille attend la saison suivante ou un nouveau générateur.`;
    for (const x of SPECIMENS) {
      const n = this.herbNodes[x.id];
      const lvl = Game.herbLevel(x.id), reqOk = Game.specimenReqMet(x);
      const key = lvl + '|' + reqOk;
      if (key === n.key) continue;
      n.key = key;
      n.d.className = 'specimen' + (lvl ? ' found' : ' teased') + (lvl >= HERB_MAX_LEVEL ? ' max' : '');
      n.plate.innerHTML = specimenSVG(x, lvl > 0);
      n.name.textContent = x.name;
      n.levels.innerHTML = lvl ? Array.from({ length: HERB_MAX_LEVEL }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('') : '';
      const cur = lvl ? ` (actuel +${fmt((x.gens ? Object.values(x.gens)[0] : x.per) * lvl * 100)} %)` : '';
      n.desc.textContent = lvl ? `${x.note} ${x.effect} par niveau${cur}.` : `${x.effect} par niveau.`;
      const seasonName = SEASONS.find(se => se.id === x.season).name.replace(/^\S+\s+/, '').toLowerCase();
      const gen = x.req && GENERATORS.find(g => g.id === x.req);
      n.unlock.textContent = lvl ? (lvl >= HERB_MAX_LEVEL ? 'Spécimen de référence' : `Niveau ${lvl} / ${HERB_MAX_LEVEL} · se trouve en ${seasonName}`)
        : `Se trouve en ${seasonName}` + (reqOk ? '' : ` · requiert : ${gen.name}`);
    }
  },

  updateUpgrades() {
    const s = Game.s;
    const avail = Game.availableUpgrades().sort((a, b) => a.cost - b.cost);
    const locked = Game.lockedUpgrades();
    const key = avail.map(u => u.id).join(',') + '|' + locked.map(u => u.id).join(',');
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
           <div class="cost">${fmt(u.cost)}</div><div class="unlock">Condition : ${u.hint}</div>`));
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
    $('sugar-hint').textContent = sugarOn
      ? 'Les arbres te paient en sucre. Ces évolutions sont perdues à la sporulation.'
      : 'Pactise avec un chêne (Mycorhize) pour recevoir du sucre.';
    for (const u of SUGAR_UPGRADES) {
      const st = sugarOn ? Game.sugarUpgState(u) : 'poor';
      if (st === 'buyable') affordable++;
      const { d, cost } = this.sugarNodes[u.id];
      d.className = 'upg sugar ' + st;
      cost.textContent = st === 'owned' ? 'Acquise' : `${fmt(u.cost)} sucre`;
    }
    $('upg-badge').classList.toggle('hidden', affordable === 0);
    $('upg-badge').textContent = affordable;
  },

  updateAchievements() {
    const key = Object.keys(Game.s.achievements).join(',');
    if (key === this.achKey) return;
    this.achKey = key;
    $('ach-list').innerHTML = ACHIEVEMENTS.map(a => {
      const done = Game.s.achievements[a.id];
      return `<div class="ach ${done ? 'done' : ''}"><div class="name">${a.name}</div><div class="desc">${a.desc}</div></div>`;
    }).join('');
  },

  updatePrestige() {
    const s = Game.s;
    const gain = Game.prestigeGain();
    const total = Game.s.stats.totalEarned;
    const m = Game.sporeGainMult();
    const prev = sporesNeeded(gain, m);
    const next = sporesNeeded(gain + 1, m);
    $('prestige-gain').textContent = fmt(gain);
    $('prestige-have').textContent = fmt(total);
    $('prestige-next').textContent = fmt(next);
    $('prestige-bar').style.width = Math.min(100, (total - prev) / (next - prev) * 100) + '%';
    // Avant la toute première spore, l'arbre est montré en aperçu
    const teaser = Game.s.spores <= 0;
    $('talent-tree').classList.toggle('teased', teaser);
    $('tree-teaser').classList.toggle('hidden', !teaser);
    $('btn-prestige').disabled = gain < 1;

    $('spores-avail').textContent = fmt(Game.sporesAvailable());
    let buyable = 0;
    for (const t of TALENTS) {
      const st = Game.talentState(t);
      if (st === 'buyable') buyable++;
      const { n, cost } = this.talentNodes[t.id];
      n.className = 'talent ' + st;
      cost.textContent = st === 'owned' ? 'Appris' : `${t.cost} spore${t.cost > 1 ? 's' : ''}`;
    }
    $('talent-badge').classList.toggle('hidden', buyable === 0);

    for (const sp of SPECIES) {
      const { d, style } = this.speciesNodes[sp.id];
      const open = Game.speciesUnlocked(sp);
      d.className = 'species' + (open ? '' : ' locked') + (s.nextSpecies === sp.id ? ' chosen' : '') + (s.species === sp.id ? ' current' : '');
      style.textContent = open
        ? `${sp.style}${s.species === sp.id ? ' · espèce actuelle' : ''}${s.nextSpecies === sp.id ? ' · ✔ choisie' : ''}`
        : `Verrouillée · ${sp.unlock.text}`;
    }

    const chalOn = Game.challengesUnlocked();
    $('chal-list').classList.toggle('teased', !chalOn);
    $('chal-teaser').classList.toggle('hidden', chalOn);
    $('chal-done-count').textContent = Object.keys(s.challengesDone).length;
    for (const c of CHALLENGES) {
      const { d, btn } = this.chalNodes[c.id];
      const done = Game.chalDone(c.id), active = Game.inChal(c.id);
      d.className = 'chal' + (done ? ' done' : '') + (active ? ' active' : '');
      btn.textContent = active ? 'En cours' : done ? 'Refaire' : 'Lancer';
      btn.disabled = active || !!s.challenge || !chalOn;
    }
    $('talent-badge').textContent = buyable;
  },

  updateAmber() {
    const s = Game.s;
    const have = s.spores, level = amberFor(have);
    const prev = amberNeeded(level), next = amberNeeded(level + 1);
    $('fossil-gain').textContent = `${fmt(s.amber)} · production ×${fmt(Game.amberMult(), 2)}`;
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
      cost.textContent = st === 'owned' ? 'Acquise' : `${r.cost} ambre`;
    }
    $('relic-badge').classList.toggle('hidden', buyable === 0);
    $('relic-badge').textContent = buyable;
  },

  updateStats() {
    if (!$('tab-stats').classList.contains('active')) return;
    if (!this._backupTick || Date.now() - this._backupTick > 2000) { this._backupTick = Date.now(); this.updateBackup(); }
    const st = Game.s.stats;
    const rows = [
      ['Temps de jeu', fmtTime(st.playTime)],
      ['Nutriments (ce cycle)', fmt(st.totalEarned)],
      ['Nutriments (depuis toujours)', fmt(st.allTimeEarned)],
      ['Clics', fmt(st.clicks)],
      ['Valeur d’un clic', fmt(Game.clickValue(), 1)],
      ['Gagné en cliquant', fmt(st.clickEarned)],
      ['Gouttes attrapées', fmt(st.dropsClicked)],
      ['Saisons vécues', fmt(st.seasonsSeen)],
      ['Sporulations', fmt(st.prestiges)],
      ['Talents', `${Object.keys(Game.s.talents).length} / ${TALENTS.length}`],
      ['Sucre reçu (depuis toujours)', fmt(st.sugarEarned)],
      ['Sangliers attirés', fmt(st.boars)],
      ['Espèce actuelle', `${Game.sp().icon} ${Game.sp().name}`],
      ['Défis réussis', `${Object.keys(Game.s.challengesDone).length} / ${CHALLENGES.length}`],
      ['Sécheresses traversées', fmt(st.droughts)],
      ['Colonies rivales repoussées', fmt(st.rivals)],
      ['Carpophores cueillis', fmt(st.flushPicked)],
      ['Herbier', `${herbSpecies(Game.s)} / ${SPECIMENS.length} espèces (×${fmt(Game.herbMult(), 2)})`],
      ['Spécimens trouvés', fmt(st.specimens)],
      ['Lueurs ramassées', fmt(st.glows)],
      ['Ambre', `${fmt(Game.s.amber)} (×${fmt(Game.amberMult(), 2)})`],
      ['Reliques', `${Object.keys(Game.s.relics).length} / ${RELICS.length}`],
      ['Jalons', `${Game.achCount()} / ${ACHIEVEMENTS.length} (+${Game.achCount() * 2} %)`],
      ['Multiplicateur permanent', '×' + fmt(Game.permanentMult(), 2)],
      ['Filaments dessinés', fmt(Network.nodes.length)],
    ];
    $('stats').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
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
