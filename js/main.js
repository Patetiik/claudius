// Point d'entrée : boucles, événements, sauvegarde auto
(function () {
  const AWAY_THRESHOLD = 120;  // secondes sans tick au-delà desquelles on compte une absence
  function welcomeBack(offline) {
    UI.modal(`<h2>Bon retour</h2><p>Pendant ${fmtTime(offline.elapsed)}, Claudius a digéré en silence :</p>
      <p style="font-size:24px;color:var(--accent)"><strong>+${fmt(offline.gain)}</strong> nutriments</p>
      ${offline.sugar > 0 ? `<p>et <strong>+${fmt(offline.sugar)}</strong> sucre</p>` : ''}
      ${offline.found && offline.found.length ? `<p>Ton réseau a aussi rapporté ${offline.found.length > 1 ? offline.found.length + ' spécimens' : 'un spécimen'} pour l’herbier :
        ${[...new Set(offline.found.map(f => f.x.name))].join(', ')}.</p>` : ''}
      <p class="muted small">(${Game.offlineRate() * 100} % de la production, ${Game.offlineCap() / 3600} h max)</p>`);
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
    document.title = `[Bac à sable ${SANDBOX}] ` + document.title;
    const tag = el('div', 'sandbox-tag', `Bac à sable « ${SANDBOX} » : ta vraie partie n’est pas touchée`);
    tag.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:20;padding:4px 10px;font-size:12px;background:#5a2a1e;color:#f3e3c8;border:1px solid var(--bad);border-radius:2px;pointer-events:none';
    document.body.appendChild(tag);
  }

  if (offline && offline.fromBackup) {
    UI.modal(`<h2>Partie récupérée</h2>
      <p>${Game.loadIssue === 'corrupt' ? 'Ta sauvegarde était illisible (une copie brute est gardée de côté).' : 'Ta sauvegarde avait disparu.'}
      Claudius a repris sa <strong>sauvegarde de secours</strong>.</p>
      <p class="muted small">${fmt(Game.progressScore(Game.s))} nutriments gagnés au total.</p>`);
  } else if (offline && offline.elapsed > 60 && offline.gain > 0) {
    welcomeBack(offline);
  } else if (!offline) {
    UI.modal(`<h2>Bienvenue, Claudius</h2>
      <p>Tu es une spore qui vient de germer sous une forêt. Clique pour digérer la litière,
      tisse des hyphes, pactise avec les arbres… et deviens le plus grand être vivant du monde.</p>
      <p class="muted small">Les saisons changent toutes les 90 s et favorisent certaines parties du réseau.
      Guette les 💧 gouttes de pluie !</p>`);
  }

  if (Game.storageOk && !Game.storageOk()) {
    UI.log('⚠️ Ce navigateur ne garde pas la partie (navigation privée ou stockage bloqué). Exporte ton code depuis le Carnet avant de fermer.');
  }

  // Une seule partie active par navigateur : si le jeu s'ouvre dans un autre onglet, celui-ci se met en pause
  // et n'écrit plus rien (sinon les deux onglets sauvegarderaient l'un par-dessus l'autre).
  function pauseHere() {
    if (Game.readOnly) return;
    Game.readOnly = true;
    $('modal-ok').classList.add('hidden');
    UI.modal(`<h2>Partie ouverte ailleurs</h2>
      <p>Claudius pousse aussi dans un autre onglet ou une autre fenêtre de ce navigateur.
      Pour ne pas mélanger les deux, cette page est mise en pause.</p>
      <button id="btn-here" class="big">Jouer ici</button>`);
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
  Game.on('achievement', a => UI.log(`🏅 Jalon : <strong>${a.name}</strong> (+2 % de production)`));
  Game.on('season', s => UI.log(`${s.name} — ${s.hint}`));
  Game.on('drop', () => UI.spawnDrop());
  Game.on('boar', () => UI.spawnBoar());
  Game.on('prestige', ({ gain, amberGain, challenge }) => {
    Network.rebuild(Game.s);
    UI.upgKey = null;
    const sp = Game.sp();
    UI.modal(challenge
      ? `<h2>Défi : ${challenge.name}</h2>
        ${gain >= 1 ? `<p>${gain} spore(s) s’envolent avant l’épreuve.</p>` : ''}
        <p>⚖️ ${challenge.rule}</p>
        <p>🎯 Atteins <strong>${fmt(challenge.goal)}</strong> nutriments sur ce cycle.</p>
        <p class="muted small">🏆 ${challenge.reward}</p>`
      : `<h2>Sporulation</h2><p>${gain} spore(s) s’envolent et germent dans une forêt nouvelle.</p>
        <p>${sp.icon} Tu renais en <strong>${sp.name}</strong>.</p>
        <p>Production permanente : <strong>+${fmt(Game.s.spores * Game.sporeBonusPer() * 100)} %</strong></p>
        ${amberGain ? `<p>Une partie se fige dans la résine : <strong>+${amberGain}</strong> ambre (production ×${fmt(Game.amberMult(), 2)}).</p>` : ''}
        <p class="muted small">Dépense tes spores dans l’arbre de talents (onglet Sporulation).</p>`);
    UI.update();
  });
  Game.on('rival', () => Network.startRival(Game.s.rival));
  Game.on('rivalEnd', ({ won }) => { Network.endRival(won); UI.update(); });
  Game.on('flush', n => UI.spawnFlush(n));
  Game.on('glow', () => UI.spawnGlow());
  Game.on('specimen', () => {
    if (!$('tab-herbier').classList.contains('active')) UI.herbNew++;
  });
  Game.on('challengeDone', c => {
    UI.log(`🏆 Défi réussi : <strong>${c.name}</strong>`);
    UI.modal(`<h2>Défi réussi</h2><p><strong>${c.name}</strong></p>
      <p>${c.reward}</p><p class="muted small">Ton cycle continue normalement.</p>`);
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
      Game.tick(0.1);
      Game.save();
    } else Game.tick(dt);
  }, 100);

  // Interface : 5 maj/s, jalons 1/s
  setInterval(() => UI.update(), 200);
  setInterval(() => Game.checkAchievements(), 1000);

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
  $('btn-save').addEventListener('click', () => { Game.save() ? UI.log('💾 Partie sauvegardée') : UI.log('⚠️ Sauvegarde impossible (stockage bloqué)'); });
  $('btn-reset').addEventListener('click', () => {
    if (!confirm('Repartir de zéro ? (spores et jalons compris)\nTa partie la plus avancée reste restaurable depuis le Carnet.')) return;
    Game.hardReset();
    Network.rebuild(Game.s);
    UI.upgKey = null;
    UI.achKey = null;
    UI.update();
  });

  UI.emitImported = () => {
    Network.rebuild(Game.s);
    if (Game.s.rival) Network.startRival(Game.s.rival);
    UI.upgKey = null;
    UI.achKey = null;
    UI.update();
  };

  UI.update();
})();
