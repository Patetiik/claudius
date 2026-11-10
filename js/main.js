// Point d'entrée : boucles, événements, sauvegarde auto
(function () {
  const AWAY_THRESHOLD = 120;  // secondes sans tick au-delà desquelles on compte une absence
  // Fenêtre « Bon retour » détaillée (v10) : ce qui a été produit et rapporté pendant l'absence
  function welcomeBack(o) {
    const r = Math.round(o.rate * 100);
    const row = (label, value, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td><td>${value}</td></tr>`;
    const rows = [row(t('wb.nutrients'), '+' + fmt(o.gain), 'main')];
    // les 4 générateurs qui ont le plus rapporté, puis le reste
    const top = o.perGen.slice(0, 4);
    for (const x of top) rows.push(row(t('wb.of', { gen: `${x.g.name} ×${x.n}` }), '+' + fmt(x.gain), 'sub'));
    if (o.perGen.length > 4) rows.push(row('…', '+' + fmt(o.perGen.slice(4).reduce((a, x) => a + x.gain, 0)), 'sub'));
    if (o.sugar > 0) rows.push(row(t('wb.sugar'), '+' + fmt(o.sugar, o.sugar < 10 ? 1 : 0), 'main'));
    if (o.found.length || o.prospectTo !== o.prospectFrom) {
      const a = Math.floor(o.prospectFrom * 100), b = Math.floor(o.prospectTo * 100);
      rows.push(row(t('wb.prospect'), o.found.length ? t(o.found.length > 1 ? 'wb.finds' : 'wb.find1', { n: o.found.length }) : t('wb.prospectVal', { a, b }), 'main'));
    }
    // spécimens : un par espèce, avec le niveau atteint
    const sp = new Map();
    for (const f of o.found) sp.set(f.x.id, { x: f.x, level: f.level, isNew: (sp.get(f.x.id) || f).isNew || f.isNew });
    const spec = [...sp.values()].map(v => `<li><strong>${v.x.name}</strong> <em>${v.x.latin}</em> · ${v.isNew ? t('wb.newSp') : t('wb.lvl', { l: v.level })}</li>`).join('');
    UI.modal(`<h2>${t('wb.title')}</h2>
      <p>${t('wb.away', { t: fmtTime(o.away) })}${o.away > o.elapsed + 1 ? t('wb.capped', { t: fmtTime(o.elapsed) }) : ''}</p>
      <p class="small">${t('wb.rate', { r })}</p>
      <table class="wb-table">${rows.join('')}</table>
      ${spec ? `<div class="wb-specimens"><div class="small muted">${t('wb.specimens')}</div><ul>${spec}</ul></div>` : ''}
      ${o.live > 0 ? `<p class="muted small">${t('wb.equiv', { t: fmtTime(o.gain / o.live) })}</p>` : ''}
      <p class="muted small">${t('wb.foot', { r, h: Game.offlineCap() / 3600 })}</p>`);
  }
  const canvas = $('network');
  Network.init(canvas);
  UI.init();

  const offline = Game.load();
  if (offline && offline.found) UI.herbNew = offline.found.length;
  Network.rebuild(Game.s);
  if (Game.s.rival) Network.startRival(Game.s.rival);
  if (Game.s.stats.clicks > 0) $('hint').style.opacity = 0;

  if (SANDBOX) {
    const tag = el('div', 'sandbox-tag');
    tag.id = 'sandbox-tag';
    tag.textContent = t('sandbox.tag', { name: SANDBOX });
    tag.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:20;padding:4px 10px;font-size:12px;background:#5a2a1e;color:#f3e3c8;border:1px solid var(--bad);border-radius:2px;pointer-events:none';
    document.body.appendChild(tag);
  }

  // Accueil d'un nouveau joueur : un lien permet de passer tout de suite dans l'autre langue
  function welcome() {
    const other = isEn() ? 'fr' : 'en';
    UI.modal(`<h2>${t('m.welcomeTitle')}</h2><p>${t('m.welcome')}</p>
      <p class="muted small">${t('m.welcomeSmall')}</p>
      <p><button type="button" class="ghost lang-switch" id="btn-lang" lang="${other}">${t('m.otherLang')}</button></p>`);
    $('btn-lang').addEventListener('click', () => { UI.changeSetting('lang', other); welcome(); });
  }
  if (offline && offline.fromBackup) {
    UI.modal(`<h2>${t('m.recoveredTitle')}</h2>
      <p>${Game.loadIssue === 'corrupt' ? t('m.recoveredCorrupt') : t('m.recoveredMissing')}
      ${t('m.recovered')}</p>
      <p class="muted small">${t('m.recoveredScore', { n: fmt(Game.progressScore(Game.s)) })}</p>`);
  } else if (offline && offline.elapsed > 60 && (offline.gain > 0 || offline.found.length)) {
    welcomeBack(offline);
  } else if (!offline) {
    welcome();
  }

  if (Game.storageOk && !Game.storageOk()) UI.log(t('log.noStorage'));
  UI.initChangelog(!!offline);

  // Une seule partie active par navigateur : si le jeu s'ouvre dans un autre onglet, celui-ci se met en pause
  // et n'écrit plus rien (sinon les deux onglets sauvegarderaient l'un par-dessus l'autre).
  function pauseHere() {
    if (Game.readOnly) return;
    Game.readOnly = true;
    $('modal-ok').classList.add('hidden');
    UI.modal(`<h2>${t('m.elsewhereTitle')}</h2>
      <p>${t('m.elsewhere')}</p>
      <button id="btn-here" class="big">${t('m.playHere')}</button>`);
    $('btn-here').addEventListener('click', () => location.reload());
  }
  try {
    const channel = new BroadcastChannel('claudius:' + SAVE_KEY);
    channel.onmessage = e => { if (e.data === 'hello') pauseHere(); };
    channel.postMessage('hello');
  } catch (e) { /* navigateur ancien : l'événement storage ci-dessous suffit */ }
  window.addEventListener('storage', e => { if (e.key === SAVE_KEY) pauseHere(); });

  // iOS Safari zoome au double tap malgré touch-action : on annule le 2ᵉ tap rapproché
  // (sauf dans les champs de texte) et on relaie son clic, pour qu'aucun achat ne se perde.
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now(), quick = now - lastTouchEnd < 350;
    lastTouchEnd = now;
    if (!quick || e.touches.length || e.target.closest('textarea, input, select')) return;
    e.preventDefault();
    if (e.target !== canvas) e.target.click();  // le réseau, lui, réagit déjà au pointerdown
  }, { passive: false });
  document.addEventListener('dblclick', e => { if (!e.target.closest('textarea, input')) e.preventDefault(); });

  // Clic sur le réseau
  canvas.addEventListener('pointerdown', e => {
    const v = Game.click();
    Network.clickBurst();
    const r = canvas.getBoundingClientRect();
    UI.floater(e.clientX - r.left, e.clientY - r.top, Game.inChal('noclick') ? '🤐' : '+' + fmt(v));
    $('hint').style.opacity = 0;
  });

  Game.on('buyGen', ({ id, n }) => {
    const g = GENERATORS.find(x => x.id === id);
    const gi = GENERATORS.indexOf(g);
    for (let i = 0; i < Math.min(n, 30); i++) {
      if (!Game.logBranch(gi) || !Network.addBranch(g)) break;
    }
  });
  Game.on('log', msg => UI.log(msg));
  Game.on('achievement', a => UI.log(t('log.achievement', { name: a.name })));
  Game.on('season', s => UI.log(t('log.season', { name: s.name, hint: s.hint })));
  // Notes de terrain déclenchées par un événement (v10) : la 1ʳᵉ goutte, le 1ᵉʳ sanglier…
  const noteOn = id => UI.queueNote(Game.openNote(id), true);
  Game.on('drop', () => { noteOn('drop'); UI.spawnDrop(); });  // la note d'abord : la goutte se pose au-dessus
  Game.on('boar', () => { UI.spawnBoar(); noteOn('boar'); });
  Game.on('drought', () => noteOn('drought'));
  Game.on('prestige', ({ gain, amberGain, challenge }) => {
    Network.rebuild(Game.s);
    UI.upgKey = null;
    const sp = Game.sp();
    UI.modal(challenge
      ? `<h2>${t('m.chalTitle', { name: challenge.name })}</h2>
        ${gain >= 1 ? `<p>${t('m.chalSpores', { n: gain })}</p>` : ''}
        <p>⚖️ ${challenge.rule}</p>
        <p>${t('m.chalGoal', { n: fmt(challenge.goal) })}</p>
        <p class="muted small">🏆 ${challenge.reward}</p>`
      : `<h2>${t('m.sporeTitle')}</h2><p>${t('m.sporeGain', { n: gain })}</p>
        <p>${t('m.reborn', { icon: sp.icon, name: sp.name })}</p>
        <p>${t('m.permProd', { p: fmt(Game.s.spores * Game.sporeBonusPer() * 100) })}</p>
        ${amberGain ? `<p>${t('m.amberGain', { n: amberGain, m: fmt(Game.amberMult(), 2) })}</p>` : ''}
        <p class="muted small">${t('m.spendSpores')}</p>`);
    UI.update();
  });
  Game.on('rival', () => { Network.startRival(Game.s.rival); noteOn('rival'); });
  Game.on('rivalEnd', ({ won }) => { Network.endRival(won); UI.update(); });
  Game.on('flush', n => { UI.spawnFlush(n); noteOn('flush'); });
  Game.on('glow', () => { noteOn('glow'); UI.spawnGlow(); });
  Game.on('specimen', () => {
    if (!$('tab-herbier').classList.contains('active')) UI.herbNew++;
  });
  Game.on('challengeDone', c => {
    UI.log(t('log.chalDone', { name: c.name }));
    UI.modal(`<h2>${t('m.chalDoneTitle')}</h2><p><strong>${c.name}</strong></p>
      <p>${c.reward}</p><p class="muted small">${t('m.chalContinue')}</p>`);
    UI.update();
  });

  // Logique : 10 ticks/s
  let last = Date.now();  // horloge réelle : performance.now() peut se figer pendant la veille sur iOS
  setInterval(() => {
    const now = Date.now();
    const dt = Math.max(0, (now - last) / 1000);  // jamais négatif si l’heure du système recule
    last = now;
    if (Game.readOnly) return;  // partie reprise dans un autre onglet
    // Longue pause (page mise en veille, iPhone notamment) : traitée comme du hors-ligne, avec la fenêtre « Bon retour ».
    // En dessous de 2 min (onglet en arrière-plan ralenti), on rattrape normalement.
    if (dt > AWAY_THRESHOLD) {
      const away = Game.applyAway(dt);
      if (away.gain > 0 || away.found.length) welcomeBack(away);
      UI.herbNew += away.found.length;
      Game.tick(0.1);
      Game.save();
    } else Game.tick(dt);
  }, 100);

  // Interface : 5 maj/s, jalons 1/s
  setInterval(() => UI.update(), 200);
  // Jalons et notes de terrain (v10) : 1 fois par seconde
  setInterval(() => {
    if (Game.readOnly) return;
    Game.checkAchievements();
    Game.checkNotes().forEach(n => UI.queueNote(n));
    UI.pumpNotes();
  }, 1000);

  // Rendu
  let lastFrame = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);  // d'abord : une erreur de dessin ne doit jamais figer la planche
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    Network.update(dt, Game.nps());
    Network.draw(Game.s, Game.season(), { drought: Game.droughtActive(), sugarRate: Game.sugarRate() });
  }
  requestAnimationFrame(frame);

  // Rattrapage si l'onglet a dormi (setInterval est ralenti en arrière-plan)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Game.save();
  });

  // Sauvegarde
  setInterval(() => Game.save(), 10000);
  window.addEventListener('beforeunload', () => Game.save());
  window.addEventListener('pagehide', () => Game.save());  // mobile : beforeunload n'arrive pas toujours

  // Application installable et jouable hors connexion (seulement en https, ou en local)
  if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  // Demande au navigateur de ne pas effacer la partie quand il manque de place (Chrome, Edge, appli installée).
  // Pas sur Firefox hors appli : il afficherait une demande d'autorisation dès l'ouverture.
  try {
    const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (navigator.storage && navigator.storage.persist && (installed || navigator.userAgentData)) navigator.storage.persist().catch(() => {});
  } catch (e) { /* rien */ }
  $('btn-save').addEventListener('click', () => { UI.log(Game.save() ? t('log.saved') : t('log.saveFailed')); });
  $('btn-reset').addEventListener('click', () => {
    if (!confirm(t('m.resetConfirm'))) return;
    Game.hardReset();
    Game.pendingNotes.clear();
    UI.noteQueue = [];
    UI._guideShown = UI._guideEnd = null;
    Network.rebuild(Game.s);
    UI.upgKey = null;
    UI.achKey = null;
    UI.update();
  });

  UI.emitImported = () => {
    Game.pendingNotes.clear();
    UI.noteQueue = [];
    Network.rebuild(Game.s);
    if (Game.s.rival) Network.startRival(Game.s.rival);
    UI.upgKey = null;
    UI.achKey = null;
    UI.update();
  };

  UI.update();
})();
