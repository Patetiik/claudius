// Ambiance et partage (v13) : ciel selon l'heure réelle, petite faune, paysage sonore synthétisé, fiche « Partager ma planche ».
// Tout est décoratif : rien ici ne touche à la production ni à la sauvegarde.

// ---------- Couleurs ----------
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// Mélange deux couleurs #rrggbb (k = 0 : a, k = 1 : b)
function mixHex(a, b, k) {
  const x = hexRgb(a), y = hexRgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
}
function mixRgb(a, b, k) {  // idem, mais a peut déjà être un rgb(…)
  const p = s => s[0] === '#' ? hexRgb(s) : s.match(/\d+/g).map(Number);
  const x = p(a), y = p(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
}
const smooth = (a, b, v) => { const u = Math.min(1, Math.max(0, (v - a) / (b - a))); return u * u * (3 - 2 * u); };

// ---------- Cycle jour/nuit (heure réelle du joueur) ----------
// Lever et coucher approchés pour une latitude tempérée (~46° N), selon le jour de l'année :
// environ 8 h de jour en décembre, 16 h en juin. Visuel seulement.
const Sky = {
  debugHour: null,   // pour les tests : forcer une heure (0–24) depuis la console
  _key: -1, _v: null,
  get() {
    if (!Settings.v.sky) return this.OFF;
    const now = new Date(), key = Math.floor(now.getTime() / 1000);
    if (key === this._key && this.debugHour == null) return this._v;
    this._key = key;
    const h = this.debugHour != null ? this.debugHour : now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const doy = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 864e5;
    const len = 12 + 3.8 * Math.cos((doy - 172) / 365.25 * 2 * Math.PI);   // durée du jour en heures
    // midi solaire à peu près (Europe de l'Ouest) : 12 h 45, une heure plus tard à l'heure d'été
    const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset(), jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
    const noon = 12.75 + (now.getTimezoneOffset() < Math.max(jan, jul) ? 1 : 0);
    const rise = noon - len / 2, set = noon + len / 2;
    // élévation : sinus sur le jour, prolongé doucement sous l'horizon la nuit
    let el;
    if (h >= rise && h <= set) el = Math.sin(Math.PI * (h - rise) / len);
    else {
      const nightLen = 24 - len, since = (h - set + 24) % 24;
      el = -Math.sin(Math.PI * since / nightLen) * 0.6;
    }
    const day = smooth(-0.08, 0.35, el);
    const warm = Math.exp(-Math.pow((el - 0.02) / 0.14, 2));   // aube et crépuscule : près de l'horizon
    const night = 1 - smooth(-0.2, 0.02, el);
    const u = Math.min(1, Math.max(0, (h - rise) / len));     // course du soleil, de gauche à droite
    this._v = { on: true, day, warm, night, el, sunX: 0.1 + 0.8 * u, sunY: 0.92 - 0.7 * Math.max(0, el), hour: h,
      dusk: h > noon };
    return this._v;
  },
  // Réglage coupé : la planche de toujours, de nuit sous la lune (comme avant la v13)
  OFF: { on: false, day: 0, warm: 0, night: 0, el: -1, sunX: 0.86, sunY: 0.3, hour: 0, dusk: false },

  // Ciels de jour, à mélanger avec les ciels de nuit d'origine (Network.SKY)
  DAY: {
    printemps: ['#3b566c', '#7d927a'], ete: ['#3e5874', '#9a8f6c'], automne: ['#4a4a5c', '#9c7754'], hiver: ['#48546a', '#8f98a4'],
    drought: ['#5a3f22', '#b08a4e'], tourbiere: ['#36485a', '#7e8670'], alpine: ['#344f76', '#8fa2b8'], tropical: ['#2a4a3e', '#76926a'],
  },
  TWILIGHT: ['#3d3352', '#d98b5c'],
};

Object.assign(Network, {
  // Ciel, astre et étoiles. night : [haut, bas] du ciel nocturne d'origine ; key : palette de jour
  drawSky(night, key, sy, opts = {}) {
    const ctx = this.ctx, w = this.w, S = Sky.get();
    let [top, bottom] = night;
    if (S.on) {
      const d = Sky.DAY[key];
      top = mixHex(top, d[0], S.day); bottom = mixHex(bottom, d[1], S.day);
      top = mixRgb(top, Sky.TWILIGHT[0], S.warm * 0.4); bottom = mixRgb(bottom, Sky.TWILIGHT[1], S.warm * 0.55);
    }
    const sky = ctx.createLinearGradient(0, 0, 0, sy);
    sky.addColorStop(0, top); sky.addColorStop(1, bottom);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, sy);
    // étoiles, la nuit seulement (fixes : graine constante ; elles scintillent sauf animations réduites)
    if (S.on && S.night > 0.02 && !opts.noStars) {
      const rng = seededRng(77), t = this.clock();
      ctx.fillStyle = '#eef0f8';
      for (let i = 0; i < 34; i++) {
        const x = rng() * w, y = rng() * sy * 0.62, ph = rng() * 6.28;
        ctx.globalAlpha = S.night * (0.22 + 0.4 * rng()) * (0.75 + 0.25 * Math.sin(t * 0.9 + ph));
        ctx.fillRect(x, y, rng() < 0.15 ? 1.5 : 1, 1);
      }
      ctx.globalAlpha = 1;
    }
    // lune (la nuit, ou toujours si le cycle est coupé)
    const moonA = S.on ? 1 - S.day : 1;
    const mx = w * (opts.moonX || 0.86), my = sy * (opts.moonY || 0.3);
    if (moonA > 0.01 && !opts.sunOnly) {
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, sy * 0.45);
      // cycle coupé et sécheresse : le soleil écrasant d'avant la v13, au même endroit
      const hot = opts.dry && !S.on, mc = hot ? '255,220,120' : '240,236,220', mc2 = hot ? '255,200,90' : mc;
      glow.addColorStop(0, `rgba(${mc},${((hot ? 0.9 : 0.75) * moonA).toFixed(3)})`);
      glow.addColorStop(0.18, `rgba(${mc2},${((hot ? 0.5 : 0.25) * moonA).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(mx - sy, 0, sy * 2, sy);
    }
    // soleil, voilé et bas sur l'horizon à l'aube et au crépuscule
    if (S.on && S.el > -0.05) {
      const a = smooth(-0.05, 0.12, S.el), sx = w * S.sunX, sY = sy * S.sunY;
      const hot = opts.dry ? 1 : 0;
      const c0 = S.warm > 0.3 ? '255,196,130' : hot ? '255,220,120' : '255,244,214';
      const glow = ctx.createRadialGradient(sx, sY, 0, sx, sY, sy * 0.5);
      glow.addColorStop(0, `rgba(${c0},${(0.85 * a).toFixed(3)})`);
      glow.addColorStop(0.16, `rgba(${c0},${(0.32 * a).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${c0},0)`);
      ctx.fillStyle = glow; ctx.fillRect(sx - sy, 0, sy * 2, sy);
    }
  },
  // Lumière du jour sur la surface, posée après le décor : très légère, pour ne rien rendre illisible
  drawDaylight(sy) {
    const S = Sky.get();
    if (!S.on) return;
    const ctx = this.ctx, w = this.w;
    if (S.day > 0.01) { ctx.fillStyle = `rgba(255,242,220,${(0.04 * S.day).toFixed(3)})`; ctx.fillRect(0, 0, w, sy + 2); }
    if (S.warm > 0.05) { ctx.fillStyle = `rgba(230,140,80,${(0.06 * S.warm).toFixed(3)})`; ctx.fillRect(0, 0, w, sy + 2); }
  },

  // ---------- Petite faune décorative (v13) ----------
  // De petites bêtes sombres et mates, dessinées dans la planche : aucune lueur, aucun clic, rien à attraper.
  // Les éléments à toucher (gouttes, sanglier, carpophores, lueurs) restent des objets lumineux par-dessus la planche.
  // phase(t, période, décalage) : position dans un cycle, de 0 à 1
  drawFauna(where, sy, t, env = {}) {
    if (!Settings.v.fauna) return;
    const S = Sky.get();
    const isDay = S.on ? S.day > 0.5 : false, isNight = S.on ? S.night > 0.5 : true, dusk = S.on && S.warm > 0.35;
    const ph = (P, off) => (((t + off) % P) + P) % P / P;
    const ctx = this.ctx, w = this.w;
    ctx.save();
    if (where === 'printemps' || where === 'ete' || where === 'automne') {
      // cloporte : un petit ovale gris segmenté qui longe la surface
      const u = ph(140, 13);
      if (u < 0.7) this.critter('bugWoodlouse', w * (0.12 + 0.7 * (u / 0.7)), sy - 1.5, t);
      // escargot, au printemps et en automne (plus souvent sous la pluie)
      if (where !== 'ete') {
        const v = ph(env.rain ? 120 : 260, 71);
        if (v < 0.55) this.critter('bugSnail', w * (0.86 - 0.22 * (v / 0.55)), sy - 0.5, t);
      }
    }
    if ((where === 'printemps' || where === 'ete') && isDay) {
      const v = ph(70, 5);
      if (v < 0.45) this.critter('bugButterfly', w * (0.15 + 0.7 * (v / 0.45)), sy * (0.55 + 0.15 * Math.sin(t * 0.8)), t, '#d9c690');
    }
    if ((where === 'printemps' || where === 'ete') && dusk) {
      for (let k = 0; k < 2; k++) this.critter('bugBat', w * (0.3 + 0.4 * ph(23, k * 9)) + Math.sin(t * 1.7 + k * 3) * w * 0.12, sy * (0.25 + 0.12 * k) + Math.sin(t * 3.1 + k) * 6, t + k);
    }
    if (where === 'hiver' && !env.dry) {
      // rouge-gorge qui sautille sur la neige, le jour
      if (isDay || !S.on) { const v = ph(110, 33); if (v < 0.5) this.critter('bugRobin', w * (0.25 + 0.5 * (v / 0.5)), sy - 4, t); }
    }
    if ((where === 'ete' || where === 'printemps' || where === 'tourbiere') && isNight && S.on) this.bugFireflies(sy, t, 7);
    if (where === 'tourbiere') {
      this.critter('bugFrog', w * 0.29 + 3, sy - 0.5, t);   // au bord de la grande flaque
      if (isDay) { const v = ph(55, 2); if (v < 0.6) this.critter('bugDragonfly', w * (0.58 + 0.12 * Math.sin(t * 0.7)), sy * (0.72 + 0.08 * Math.sin(t * 1.9)), t); }
    }
    if (where === 'alpine') {
      if (isDay || !S.on) {
        const v = ph(180, 40);
        if (v < 0.6) { const x = w * (0.6 + 0.3 * (v / 0.6)); this.critter('bugChamois', x, this.ridgeY(x, 4.1, 0.42, sy) - 4.2, t); }  // sur la crête de devant
        this.critter('bugMarmot', w * 0.41, sy - 1, t);
      }
    }
    if (where === 'tropical') {
      if (isDay) { const v = ph(60, 17); if (v < 0.5) this.critter('bugButterfly', w * (0.2 + 0.6 * (v / 0.5)), sy * (0.5 + 0.12 * Math.sin(t)), t, '#5f86b8'); }
      if (isNight || !S.on) this.critter('bugGecko', w * 0.3 + Math.sin(t * 0.15) * w * 0.08, sy - 12, t);
    }
    ctx.restore();
  },
  // Une bête dessinée autour de (0, 0), un peu agrandie : 1,4 fois sa taille de croquis
  critter(name, x, y, ...rest) {
    const c = this.ctx;
    c.save(); c.translate(x, y); c.scale(1.4, 1.4);
    this[name](0, 0, ...rest);
    c.restore();
  },
  bugWoodlouse(x, y, t) {
    const c = this.ctx;
    c.fillStyle = '#6e675e';
    c.beginPath(); c.ellipse(x, y, 3.2, 1.6, 0, Math.PI, 0); c.fill();
    c.strokeStyle = 'rgba(30,26,22,0.7)'; c.lineWidth = 0.4;
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * 1.1, y - 1.5); c.lineTo(x + k * 1.1, y); c.stroke(); }
    c.strokeStyle = '#4d4741'; c.lineWidth = 0.5;
    const s = Math.sin(t * 9) * 0.5;
    c.beginPath(); c.moveTo(x + 3, y - 0.6); c.lineTo(x + 4.6, y - 1.6 + s); c.stroke();
  },
  bugSnail(x, y, t) {
    const c = this.ctx, stretch = 1 + 0.08 * Math.sin(t * 0.8);
    c.fillStyle = '#8b8172';
    c.beginPath(); c.ellipse(x - 1, y, 4.2 * stretch, 1.1, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8b8172'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(x - 4.5 * stretch, y - 0.5); c.lineTo(x - 5.5 * stretch, y - 3); c.stroke();
    c.fillStyle = '#7a5634';
    c.beginPath(); c.arc(x + 0.3, y - 2.4, 2.6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(40,24,12,0.7)'; c.lineWidth = 0.5;
    c.beginPath(); c.arc(x + 0.3, y - 2.4, 1.3, 0, Math.PI * 1.6); c.stroke();
  },
  bugButterfly(x, y, t, col) {
    const c = this.ctx, f = this.reduced ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * 11));
    c.fillStyle = col;
    c.globalAlpha = 0.85;
    c.beginPath(); c.ellipse(x - 2 * f, y - 1, 2.4 * f, 1.7, -0.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + 2 * f, y - 1, 2.4 * f, 1.7, 0.5, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#3a2c20'; c.fillRect(x - 0.4, y - 2.4, 0.8, 3);
  },
  bugBat(x, y, t) {
    const c = this.ctx, f = this.reduced ? 0 : Math.sin(t * 14) * 1.6;
    c.strokeStyle = '#1c1714'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(x - 4, y - f); c.quadraticCurveTo(x - 2, y + 0.5, x, y); c.quadraticCurveTo(x + 2, y + 0.5, x + 4, y - f); c.stroke();
  },
  bugRobin(x, y, t) {
    const c = this.ctx, hop = this.reduced ? 0 : Math.max(0, Math.sin(t * 5)) * 2;
    c.fillStyle = '#5a4634';
    c.beginPath(); c.ellipse(x, y - hop, 3, 2.3, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + 2.4, y - 2 - hop, 1.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b4643a';
    c.beginPath(); c.ellipse(x + 1.6, y - 0.6 - hop, 1.5, 1.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a4634'; c.fillRect(x - 4.4, y - 1.6 - hop, 2, 0.9);
  },
  bugFireflies(sy, t, n) {
    const c = this.ctx, w = this.w, S = Sky.get();
    c.fillStyle = '#efe6a2';
    for (let i = 0; i < n; i++) {
      const x = (w * ((i * 0.43 + 0.11) % 1) + Math.sin(t * 0.35 + i * 2.1) * 16 + w) % w;
      const y = sy * (0.62 + ((i * 0.29) % 1) * 0.32) + Math.cos(t * 0.6 + i) * 4;
      c.globalAlpha = S.night * (0.15 + 0.4 * Math.max(0, Math.sin(t * 1.3 + i * 1.7)));
      c.beginPath(); c.arc(x, y, 0.9, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  },
  bugFrog(x, y, t) {
    const c = this.ctx, puff = this.reduced ? 0 : Math.max(0, Math.sin(t * 2.3)) > 0.97 ? 1 : 0;
    c.fillStyle = '#4f5a32';
    c.beginPath(); c.ellipse(x, y - 1.6, 3.2, 2, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.arc(x + 2.2, y - 3, 1.1, 0, Math.PI * 2); c.fill();
    if (puff) { c.fillStyle = '#8e9a5c'; c.beginPath(); c.arc(x + 2.6, y - 1.2, 1.2, 0, Math.PI * 2); c.fill(); }
  },
  bugDragonfly(x, y, t) {
    const c = this.ctx;
    c.strokeStyle = '#3f7a78'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 2, y); c.stroke();
    c.strokeStyle = 'rgba(200,220,220,0.45)'; c.lineWidth = 0.6;
    const f = this.reduced ? 1.5 : 1 + Math.abs(Math.sin(t * 30));
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1, y - 2.5 * f); c.moveTo(x, y); c.lineTo(x + 1, y - 2.5 * f); c.stroke();
  },
  bugChamois(x, y, t) {
    const c = this.ctx, step = this.reduced ? 0 : Math.sin(t * 4) * 0.8;
    c.fillStyle = '#2a2622';
    c.beginPath(); c.ellipse(x, y, 4, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(x - 3.2 + step, y, 0.7, 3); c.fillRect(x + 2.4 - step, y, 0.7, 3);
    c.beginPath(); c.ellipse(x + 4.2, y - 1.8, 1.4, 1.1, -0.4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2a2622'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(x + 4.3, y - 2.7); c.quadraticCurveTo(x + 4.4, y - 4.2, x + 3.6, y - 4.3); c.stroke();
  },
  bugMarmot(x, y, t) {
    const c = this.ctx, up = this.reduced ? 1 : smooth(0.6, 0.75, Math.sin(t * 0.21) * 0.5 + 0.5);
    c.fillStyle = '#6b5640';
    c.beginPath(); c.ellipse(x, y - 2 - up * 1.5, 2.4, 2 + up * 1.6, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + 0.4, y - 4.2 - up * 3, 1.5, 0, Math.PI * 2); c.fill();
  },
  bugGecko(x, y, t) {
    const c = this.ctx, wig = this.reduced ? 0 : Math.sin(t * 2) * 0.8;
    c.strokeStyle = '#7d7a4e'; c.lineWidth = 1.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 5, y + wig); c.quadraticCurveTo(x - 2, y - wig, x + 3, y); c.stroke();
    c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 0.8, y + 1.6); c.moveTo(x + 1.6, y); c.lineTo(x + 2.2, y - 1.6); c.stroke();
  },
});

// ---------- Paysage sonore (v13) ----------
// Entièrement synthétisé avec Web Audio : aucun fichier, aucune requête. Désactivé par défaut.
// Le contexte audio ne naît qu'après un geste du joueur (exigence d'iOS) et se suspend dès que l'onglet passe en arrière-plan.
const Sound = {
  ctx: null, master: null, amb: null, fx: null, noise: null, layers: null,
  lastGesture: 0, _last: {}, _timer: null, _spores: null,
  VOLUMES: [0.22, 0.45, 0.8],
  enabled() { return !!Settings.v.sound; },
  // Appelée depuis un geste du joueur (clic sur « Activé », ou 1ᵉʳ toucher de la page) : crée ou relance le contexte
  unlock() {
    this.lastGesture = performance.now();
    if (!this.enabled() || document.hidden) return;
    try {
      if (!this.ctx) this.build();
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      if (!this._unlocked) {   // iOS : un son vide joué pendant le geste déverrouille la sortie
        const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
        s.buffer = b; s.connect(this.ctx.destination); s.start(0);
        this._unlocked = true;
      }
      this.start();
    } catch (e) { /* pas de Web Audio : le jeu reste muet */ }
  },
  build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('no audio');
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.amb = ctx.createGain(); this.amb.connect(this.master);
    this.fx = ctx.createGain(); this.fx.gain.value = 0.9; this.fx.connect(this.master);
    // bruit rose approché (filtre de Paul Kellet), 3 s en boucle
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const wn = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + wn * 0.099; b1 = 0.963 * b1 + wn * 0.2965; b2 = 0.57 * b2 + wn * 1.0526;
      d[i] = (b0 + b1 + b2 + wn * 0.1848) * 0.18;
    }
    this.noise = buf;
    const loop = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); s.start(0, Math.random() * 3); return s; };
    const filt = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
    const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const L = this.layers = {};
    // vent : bruit grave et doux, dont le souffle varie lentement
    L.windF = filt('lowpass', 420, 0.5); L.wind = gain(0);
    loop().connect(L.windF); L.windF.connect(L.wind); L.wind.connect(this.amb);
    // pluie : bruit clair et serré
    L.rainF = filt('bandpass', 2600, 0.5); L.rain = gain(0);
    loop().connect(L.rainF); L.rainF.connect(L.rain); L.rain.connect(this.amb);
    // cigales (été, sécheresse) : bruit très aigu pulsé
    L.cicF = filt('bandpass', 5200, 8); L.cicAM = gain(0); L.cic = gain(0);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 46; const lfoG = gain(0.5);
    lfo.connect(lfoG); lfoG.connect(L.cicAM.gain); lfo.start();
    loop().connect(L.cicF); L.cicF.connect(L.cicAM); L.cicAM.connect(L.cic); L.cic.connect(this.amb);
    L.cicAM.gain.value = 0.5;
    // nappe très basse, la « voix » du sol : deux sinus à peine désaccordés
    L.padF = filt('lowpass', 500, 0.7); L.pad = gain(0);
    L.o1 = ctx.createOscillator(); L.o2 = ctx.createOscillator(); L.o1.type = 'sine'; L.o2.type = 'triangle';
    L.o1.frequency.value = 110; L.o2.frequency.value = 164.8; L.o2.detune.value = 6;
    const o2g = gain(0.35);
    L.o1.connect(L.padF); L.o2.connect(o2g); o2g.connect(L.padF); L.padF.connect(L.pad); L.pad.connect(this.amb);
    L.o1.start(); L.o2.start();
    document.addEventListener('visibilitychange', () => this.visibility());
    window.addEventListener('pagehide', () => this.stop(true));
  },
  start() {
    if (!this.ctx || this._timer) return;
    this.applyVolume();
    this._timer = setInterval(() => this.tick(), 400);
    this.tick();
  },
  // Coupe tout : réglage désactivé, onglet en arrière-plan, page quittée
  stop(suspend) {
    clearInterval(this._timer); this._timer = null;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, 0.05);
    if (suspend) setTimeout(() => { if (!this._timer && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }, 250);
  },
  visibility() {
    if (document.hidden || !this.enabled()) this.stop(true);
    else if (this.ctx) { this.ctx.resume().catch(() => {}); this.start(); }
  },
  applyVolume() {
    if (!this.ctx) return;
    const v = this.enabled() && !document.hidden ? this.VOLUMES[Settings.v.volume] || 0.45 : 0;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.4);
  },
  // Réglage changé (depuis le clic : c'est un geste du joueur)
  apply() {
    if (this.enabled()) this.unlock();
    else this.stop(true);
    this.applyVolume();
  },
  // Ce qui s'entend : la planche affichée, sa saison, sa météo, l'heure
  scene() {
    const bdef = typeof UI !== 'undefined' && UI.biomeSel && BIOMES.find(b => b.id === UI.biomeSel && Game.plate(b.id));
    const buffs = Game.s.buffs || [];
    const rain = buffs.some(b => b.lk === 'buff.shower' || b.lk === 'buff.storm');
    const storm = buffs.some(b => b.lk === 'buff.storm');
    return { where: bdef ? bdef.id : Game.season().id, dry: !bdef && Game.droughtActive(), rain: rain && !bdef, storm, sky: Sky.get() };
  },
  PADS: { printemps: [110, 164.8], ete: [98, 146.8], automne: [87.3, 130.8], hiver: [123.5, 185], tourbiere: [82.4, 123.5], alpine: [130.8, 196], tropical: [92.5, 138.6] },
  tick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (Game.readOnly) { this.stop(true); return; }   // partie reprise dans un autre onglet : celui-ci se tait
    const c = this.scene(), L = this.layers, now = this.ctx.currentTime, still = Settings.reducedMotion();
    const night = c.sky.on ? c.sky.night : 0.6, day = c.sky.on ? c.sky.day : 0;
    const set = (p, v, tc) => p.setTargetAtTime(v, now, tc || 1.5);
    const winter = c.where === 'hiver' || c.where === 'alpine';
    // vent : plus fort en hiver et en montagne, plus clair et sec pendant la sécheresse ; il « respire » sauf animations réduites
    const breath = still ? 0 : 0.35 * Math.sin(now * 0.23) + 0.2 * Math.sin(now * 0.071);
    set(L.wind.gain, (winter ? 0.5 : c.dry ? 0.36 : 0.22) * (1 + breath));
    set(L.windF.frequency, (winter ? 320 : c.dry ? 900 : 480) * (1 + 0.4 * breath));
    set(L.rain.gain, c.rain ? (c.storm ? 0.5 : 0.34) : c.where === 'tropical' ? 0.06 : 0, 2);
    set(L.cic.gain, (c.dry ? 0.07 : c.where === 'ete' ? 0.045 * day : c.where === 'tropical' ? 0.03 : 0), 2);
    const pad = this.PADS[c.where] || this.PADS.printemps;
    set(L.o1.frequency, pad[0], 3); set(L.o2.frequency, pad[1], 3);
    set(L.pad.gain, 0.05 + 0.02 * night, 3);
    // petits sons de la vie alentour, au hasard
    const r = Math.random();
    if (c.rain && r < 0.35) this.drip();
    if ((c.where === 'printemps' || c.where === 'ete') && !c.dry && day > 0.4 && r < 0.05) this.bird();
    if ((c.where === 'ete' || c.where === 'printemps') && night > 0.5 && r < 0.12) this.cricket();
    if ((c.where === 'automne' || c.where === 'hiver') && night > 0.5 && r < 0.012) this.owl();
    if (c.where === 'automne' && r < 0.06) this.rustle();
    if (c.where === 'tourbiere' && r < (night > 0.5 ? 0.12 : 0.04)) this.frog();
    if (c.where === 'tropical' && r < 0.08) this.drip(0.6);
    if (winter && r < 0.02) this.chime();
    // une spore libérée : un léger scintillement (au plus toutes les 12 s)
    const n = Game.s.spores;
    if (this._spores != null && n > this._spores) this.spore();
    this._spores = n;
  },
  // ---------- briques ----------
  tone(freq, start, dur, vol, type, glideTo, dest) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.02, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest || this.fx);
    o.start(start); o.stop(start + dur + 0.05);
  },
  burst(start, dur, vol, type, f, q, dest) {
    const ctx = this.ctx, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.amb);
    s.start(start, Math.random() * 2); s.stop(start + dur + 0.05);
  },
  ready(key, gap) {
    if (!this.ctx || this.ctx.state !== 'running' || !this._timer) return false;
    const now = performance.now();
    if (now - (this._last[key] || 0) < gap) return false;
    this._last[key] = now;
    return true;
  },
  drip(v = 1) { const t = this.ctx.currentTime + Math.random() * 0.3, f = 1400 + Math.random() * 1400; this.tone(f, t, 0.09, 0.03 * v, 'sine', f * 0.55, this.amb); },
  bird() {
    const t = this.ctx.currentTime, base = 2600 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) this.tone(base * (1 + 0.1 * (k % 2)), t + k * 0.13, 0.09, 0.018, 'sine', base * 1.35, this.amb);
  },
  cricket() {
    const t = this.ctx.currentTime, f = 4300 + Math.random() * 400;
    for (let k = 0; k < 3; k++) this.tone(f, t + k * 0.045, 0.025, 0.012, 'sine', null, this.amb);
  },
  owl() {
    const t = this.ctx.currentTime;
    this.tone(410, t, 0.35, 0.03, 'sine', 380, this.amb);
    this.tone(400, t + 0.6, 0.7, 0.028, 'sine', 360, this.amb);
  },
  rustle() { this.burst(this.ctx.currentTime, 0.5 + Math.random() * 0.4, 0.05, 'highpass', 2400, 0.7); },
  frog() {
    const t = this.ctx.currentTime, f = 140 + Math.random() * 60;
    for (let k = 0; k < 2; k++) this.tone(f, t + k * 0.11, 0.08, 0.035, 'square', f * 0.8, this.layers.padF);
  },
  chime() { const t = this.ctx.currentTime, f = [1568, 1760, 2093][Math.floor(Math.random() * 3)]; this.tone(f, t, 1.4, 0.008, 'sine', null, this.amb); },
  // ---------- sons du jeu ----------
  click() { if (this.ready('click', 70)) this.tone(520, this.ctx.currentTime, 0.06, 0.05, 'sine', 260); },
  buy() {
    if (performance.now() - this.lastGesture > 900 || !this.ready('buy', 120)) return;  // les achats automatiques restent muets
    const t = this.ctx.currentTime;
    this.tone(392, t, 0.12, 0.05, 'triangle'); this.tone(587, t + 0.07, 0.16, 0.04, 'triangle');
  },
  spore() {
    if (!this.ready('spore', 12000)) return;
    const t = this.ctx.currentTime;
    [1760, 2217, 2637].forEach((f, k) => this.tone(f, t + k * 0.09, 0.5, 0.012, 'sine'));
  },
  fruiting() {
    if (!this.ready('fruit', 20000)) return;
    const t = this.ctx.currentTime, still = Settings.reducedMotion(), d = still ? 1.4 : 3.2;
    [220, 277.2, 329.6, 440].forEach((f, k) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.022, t + d * 0.45 + k * 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + k * 0.1);
      o.connect(g); g.connect(this.fx); o.start(t); o.stop(t + d + 0.5);
    });
    if (!still) this.burst(t + 0.4, 2.6, 0.04, 'bandpass', 3000, 0.6, this.fx);
  },
  init() {
    // 1ᵉʳ geste du joueur sur la page : le son (s'il est activé) peut démarrer
    const g = () => this.unlock();
    ['pointerdown', 'keydown', 'touchend'].forEach(e => document.addEventListener(e, g, { capture: true, passive: true }));
    Game.on('fruiting', () => this.fruiting());
    // achats faits à la main : on enveloppe les fonctions d'achat (le son ne suit qu'un geste récent)
    for (const m of ['buyGen', 'buyUpgrade', 'buyTalent', 'buyPlateGen', 'buyLink', 'buySugarUpg', 'buyRelic']) {
      const orig = Game[m];
      if (typeof orig !== 'function') continue;
      Game[m] = function () { const r = orig.apply(this, arguments); if (r && Sound.ctx) Sound.buy(); return r; };
    }
  },
};

// ---------- Fiche « Partager ma planche » (v13) ----------
// Une image PNG faite dans le navigateur : la planche affichée, l'espèce, quelques relevés, la date et l'adresse du jeu.
// Rien de personnel ni de la sauvegarde brute.
const GAME_URL = 'https://patetiik.github.io/claudius/';
const Share = {
  blob: null, url: null, file: null,
  redraw: null,   // posé par main.js : redessine la planche affichée
  W: 1080, H: 1350,
  SERIF: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  SANS: '"Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif',
  // la planche à l'écran : la forêt (Pl. I) ou le biome choisi
  current() {
    const bdef = UI.biomeSel && BIOMES.find(b => b.id === UI.biomeSel && Game.plate(b.id));
    if (bdef) return { canvas: $('biome-canvas'), plate: bdef.plate, caption: bdef.caption, id: bdef.id };
    return { canvas: $('network'), plate: 'I', caption: null, id: 'forest' };
  },
  strip(html) { return (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').trim(); },   // texte seul, rien d'exécuté
  stats() {
    const s = Game.s, c = Game.collectPoints();
    const rows = [
      [t('share.prod'), fmt(Game.nps()) + ' /s'],
      [t('share.spores'), fmt(s.spores)],
    ];
    if (s.amber > 0) rows.push([t('share.amber'), fmt(s.amber)]);
    const nb = BIOMES.filter(b => Game.biomeOpen(b)).length;
    if (nb > 0 || Game.biomesTeased()) rows.push([t('share.biomes'), `${nb} / ${BIOMES.length}`]);
    rows.push([t('share.herb'), `${herbSpecies(s)} / ${SPECIMENS.length}`]);
    rows.push([t('share.collect'), `${fmt(c.total)} · ${t('col.rank' + c.rank)}`]);
    return rows;
  },
  draw() {
    const { W, SERIF, SANS } = this, M = 84;
    // dimensions d'abord : la planche garde ses proportions (large sur ordinateur, presque carrée sur téléphone)
    // et la fiche s'allonge d'autant, pour que les relevés ne débordent jamais sur l'adresse du jeu
    // deux fois : une planche jamais mesurée (biome tout juste choisi) prend sa taille au 1ᵉʳ passage et se dessine au 2ᵉ
    try { if (this.redraw) { this.redraw(); this.redraw(); } } catch (e) { /* on garde la dernière image */ }
    const p = this.current(), src = p.canvas, rows = this.stats();
    const bw = W - 2 * M, by = 248, bhMax = 760;
    const ratio = src.width / Math.max(1, src.height);
    let dw = bw, dh = bw / ratio;
    if (dh > bhMax) { dh = bhMax; dw = dh * ratio; }
    const statsH = 96 + 52 + Math.ceil(rows.length / 2) * 82;
    const H = Math.max(1350, Math.round(by + dh + 52 + 76 + statsH + 170));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    // papier sombre du carnet, grain léger et vignette
    c.fillStyle = '#16110d'; c.fillRect(0, 0, W, H);
    const vg = c.createRadialGradient(W * 0.35, -H * 0.1, 0, W * 0.35, -H * 0.1, H * 1.1);
    vg.addColorStop(0, 'rgba(120,86,52,0.28)'); vg.addColorStop(1, 'rgba(120,86,52,0)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const rng = seededRng(13);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(236,226,207,${(rng() * 0.035).toFixed(3)})`; c.fillRect(rng() * W, rng() * H, 1.4, 1.4); }
    // double filet gravé
    c.strokeStyle = 'rgba(236,226,207,0.28)'; c.lineWidth = 2; c.strokeRect(34, 34, W - 68, H - 68);
    c.strokeStyle = 'rgba(236,226,207,0.12)'; c.lineWidth = 1; c.strokeRect(46, 46, W - 92, H - 92);
    c.textBaseline = 'alphabetic';
    // en-tête
    c.fillStyle = '#ece2cf'; c.font = `600 74px ${SERIF}`; c.fillText('Claudius', M, 158);
    c.fillStyle = '#8e7f69'; c.font = `italic 30px ${SERIF}`; c.fillText(t('share.subtitle'), M, 204);
    const date = new Date().toLocaleDateString(L().locale, { day: 'numeric', month: 'long', year: 'numeric' });
    c.textAlign = 'right'; c.font = `24px ${SANS}`; c.fillStyle = '#c4b59b';
    c.fillText(date, W - M, 158);
    c.textAlign = 'left';
    // la planche
    const dx = M + (bw - dw) / 2;
    c.fillStyle = '#120d09'; c.fillRect(dx, by, dw, dh);
    try { c.drawImage(src, dx, by, dw, dh); } catch (e) { /* planche vide */ }
    c.strokeStyle = 'rgba(236,226,207,0.35)'; c.lineWidth = 2; c.strokeRect(dx, by, dw, dh);
    c.strokeStyle = 'rgba(236,226,207,0.12)'; c.lineWidth = 1; c.strokeRect(dx - 9, by - 9, dw + 18, dh + 18);
    let y = by + dh + 52;
    const cap = p.caption ? p.caption : this.strip(t('plate.caption')).replace(/^Pl\.\s*I\s*—\s*/, '');
    c.font = `600 22px ${SANS}`; c.fillStyle = '#c4b59b';
    const pl = 'PL. ' + p.plate;
    c.fillText(pl, dx, y);
    const plw = c.measureText(pl).width;
    c.font = `italic 27px ${SERIF}`; c.fillStyle = '#8e7f69';
    c.fillText('— ' + this.strip(cap), dx + plw + 12, y, W - 2 * M - plw - 12);
    // espèce
    y += 76;
    const sp = Game.sp();
    c.fillStyle = '#8e7f69'; c.font = `600 21px ${SANS}`;
    c.fillText(t('share.species').toUpperCase(), M, y);
    c.fillStyle = '#ece2cf'; c.font = `italic 44px ${SERIF}`;
    c.fillText(sp.name, M, y + 50, W - 2 * M);
    // relevés, sur deux colonnes
    y += 96;
    c.strokeStyle = 'rgba(236,226,207,0.16)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(M, y); c.lineTo(W - M, y); c.stroke();
    const colW = (W - 2 * M) / 2;
    rows.forEach((r, i) => {
      const x = M + (i % 2) * colW, yy = y + 52 + Math.floor(i / 2) * 82;
      c.fillStyle = '#8e7f69'; c.font = `600 19px ${SANS}`; c.fillText(r[0].toUpperCase(), x, yy, colW - 20);
      c.fillStyle = '#d9a858'; c.font = `34px ${SERIF}`; c.fillText(r[1], x, yy + 40, colW - 20);
    });
    // adresse du jeu
    c.fillStyle = '#a6c48c'; c.font = `26px ${SANS}`; c.textAlign = 'center';
    c.fillText(GAME_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), W / 2, H - 82);
    c.fillStyle = '#8e7f69'; c.font = `italic 22px ${SERIF}`;
    c.fillText(t('share.foot'), W / 2, H - 116);
    c.textAlign = 'left';
    return cv;
  },
  fileName() {
    const d = new Date(), z = n => String(n).padStart(2, '0');
    return `claudius-pl-${this.current().plate.toLowerCase()}-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}.png`;
  },
  // Ouvre l'aperçu : l'image est prête avant le clic « Partager » (Safari exige un partage pendant le geste)
  open() {
    if (this._busy) return;   // l'image met parfois une seconde à se faire : pas de double fenêtre
    this._busy = true;
    let cv;
    try { cv = this.draw(); } catch (e) { this._busy = false; UI.log(t('share.fail')); return; }
    cv.toBlob(blob => {
      this._busy = false;
      if (!blob) { UI.log(t('share.fail')); return; }
      this.release();
      this.blob = blob;
      this.url = URL.createObjectURL(blob);
      try { this.file = new File([blob], this.fileName(), { type: 'image/png' }); } catch (e) { this.file = null; }
      const canShare = !!(this.file && navigator.canShare && navigator.share && (() => { try { return navigator.canShare({ files: [this.file] }); } catch (e) { return false; } })());
      UI.modal(`<h2>${t('share.title')}</h2>
        <p class="small">${t('share.intro')}</p>
        <img class="share-preview" src="${this.url}" alt="${t('share.alt')}">
        <div class="save-actions share-actions">
          ${canShare ? `<button type="button" class="big" id="btn-share-native">${t('share.native')}</button>` : ''}
          <button type="button" id="btn-share-dl"${canShare ? '' : ' class="big"'}>${t('share.download')}</button>
        </div>
        <p class="muted small">${t('share.privacy')}</p>`);
      document.querySelector('.modal-box').classList.add('share-open');
      if (canShare) $('btn-share-native').addEventListener('click', () => this.native());
      $('btn-share-dl').addEventListener('click', () => this.download());
    }, 'image/png');
  },
  native() {
    navigator.share({ files: [this.file], title: 'Claudius', text: t('share.text') + ' ' + GAME_URL })
      .catch(e => { if (!e || e.name !== 'AbortError') this.download(); });
  },
  download() {
    const a = document.createElement('a');
    a.href = this.url; a.download = this.fileName();
    document.body.appendChild(a); a.click(); a.remove();
  },
  release() { if (this.url) URL.revokeObjectURL(this.url); this.url = this.blob = this.file = null; },
};
