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
    this.updateStats();
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
      ['Ambre', `${fmt(Game.s.amber)} (×${fmt(Game.amberMult(), 2)})`],
      ['Reliques', `${Object.keys(Game.s.relics).length} / ${RELICS.length}`],
      ['Jalons', `${Game.achCount()} / ${ACHIEVEMENTS.length} (+${Game.achCount() * 2} %)`],
      ['Multiplicateur permanent', '×' + fmt(Game.permanentMult(), 2)],
      ['Filaments dessinés', fmt(Network.nodes.length)],
    ];
    $('stats').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
  },
};
