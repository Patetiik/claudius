// Rendu du réseau mycélien sur canvas
const MAX_BRANCHES = 900;
const WORLD_UP = 95;   // les filaments ne remontent pas plus haut que ça au-dessus du cœur

// Générateur pseudo-aléatoire à graine (mulberry32) : même graine → même réseau
function seededRng(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Éclaircit une couleur hexadécimale (#rrggbb) vers le blanc
function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = sh => Math.round(((n >> sh) & 255) + (255 - ((n >> sh) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

const Network = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
  nodes: [],       // {x, y, cx, cy, parent, color, tier, grow, children, load}
  pulses: [],
  corePulse: 0,
  view: { scale: 1 },
  bounds: { maxX: 1, maxY: 1, minY: 0 },
  rng: Math.random,
  layer: null, layerDirty: true, layerScale: 0,   // réseau pré-rendu (redessiné seulement s'il change)
  soil: null,                                      // texture du sol, fixe
  reduced: false,                                  // v10 : animations réduites (réglage du joueur)

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layer = document.createElement('canvas');
    this.soil = document.createElement('canvas');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.reset(1);
  },
  reset(seed) {
    this.rng = seededRng(seed);
    this.nodes = [{ x: 0, y: 0, cx: 0, cy: 0, parent: -1, color: '#fff3dc', tier: 0, grow: 1, children: 0, load: 0 }];
    this.pulses = [];
    this.bounds = { maxX: 1, maxY: 1, minY: 0 };
    this.layerDirty = true;
  },
  // Rejoue le journal de branches de la sauvegarde : dessin identique à chaque chargement
  rebuild(state) {
    this.reset(state.netSeed);
    this.rival = null;
    const list = this.genList || GENERATORS;   // v12 : une planche de biome a ses 4 générateurs à elle
    for (let i = 0; i < state.netLog.length; i++) {
      const g = list[state.netLog.charCodeAt(i) - 97];
      if (g) this.addBranch(g, true);
    }
    this.view.scale = this.fitScale();
  },
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.w = r.width; this.h = r.height;
    for (const c of [this.canvas, this.layer, this.soil]) {
      c.width = Math.max(1, r.width * this.dpr);
      c.height = Math.max(1, r.height * this.dpr);
    }
    this.renderSoil();
    this.layerDirty = true;
  },
  surfaceY() { return this.h * 0.2; },
  // Horloge du décor : figée quand les animations sont réduites (ciel, herbe, neige, cœur qui respire)
  clock() {
    if (!this.reduced) return performance.now() / 1000;
    if (this._frozen == null) this._frozen = performance.now() / 1000;
    return this._frozen;
  },
  coreScreen() { return { x: this.w / 2, y: this.surfaceY() + (this.h - this.surfaceY()) * 0.42 }; },
  r(a, b) { return a + this.rng() * (b - a); },

  // Ajoute une branche ; renvoie true si elle a été dessinée (le journal reste ainsi aligné)
  addBranch(gen, instant) {
    if (this.nodes.length >= MAX_BRANCHES) return false;
    const tier = gen.tier != null ? gen.tier : GENERATORS.indexOf(gen);
    let parentIdx;
    const tips = [];
    for (let i = 1; i < this.nodes.length; i++) if (this.nodes[i].children === 0) tips.push(i);
    const roll = this.rng();
    if (this.nodes.length < 12 || roll < 0.08) parentIdx = 0;
    else if (tips.length && roll < 0.6) parentIdx = tips[Math.floor(this.rng() * tips.length)];
    else parentIdx = Math.floor(this.rng() * this.nodes.length);
    const p = this.nodes[parentIdx];
    // Croissance radiale : on s'éloigne du cœur avec un peu de hasard
    let angle = parentIdx === 0 ? this.r(0, Math.PI * 2) : Math.atan2(p.y, p.x) + this.r(-0.8, 0.8);
    const len = this.r(13, 24) * (1 + Math.min(tier, 7) * 0.15);  // plafonné : les générateurs V6 ne font pas exploser le dessin
    let x = p.x + Math.cos(angle) * len;
    let y = p.y + Math.sin(angle) * len;
    if (y < -WORLD_UP) { y = p.y + Math.abs(Math.sin(angle)) * len; }
    // Point de contrôle décalé : filament légèrement courbe
    const bend = this.r(-0.35, 0.35) * len;
    const mx = (p.x + x) / 2, my = (p.y + y) / 2;
    const nx = -(y - p.y) / len, ny = (x - p.x) / len;
    p.children++;
    this.nodes.push({ x, y, cx: mx + nx * bend, cy: my + ny * bend, parent: parentIdx, color: gen.color, tier,
      grow: instant ? 1 : 0, children: 0, load: 0 });
    // Chaque ancêtre porte une branche de plus : les troncs s'épaississent
    for (let k = parentIdx; k > 0; k = this.nodes[k].parent) this.nodes[k].load++;
    const b = this.bounds;
    b.maxX = Math.max(b.maxX, Math.abs(x)); b.maxY = Math.max(b.maxY, y); b.minY = Math.min(b.minY, y);
    this.layerDirty = true;
    return true;
  },

  spawnPulse() {
    if (this.nodes.length < 3) return;
    const i = 1 + Math.floor(Math.random() * (this.nodes.length - 1));
    this.pulses.push({ node: i, t: 0, speed: rand(1.5, 3) });
  },
  clickBurst() {
    this.corePulse = 1;
    for (let k = 0; k < 3; k++) this.spawnPulse();
  },

  fitScale() {
    const core = this.coreScreen(), b = this.bounds;
    const down = (this.h - core.y) * 0.9, up = (core.y - this.surfaceY()) * 0.85;
    // Planche pas encore mesurée (onglet caché au chargement) : on garde l'échelle actuelle
    if (!(this.w > 0 && down > 0 && up > 0)) return this.view.scale > 0 ? this.view.scale : 1;
    const maxR = Math.max(1, b.maxX / (this.w * 0.46), b.maxY / down, -b.minY / up);
    return Math.min(1, 1 / maxR);
  },

  update(dt, nps) {
    let growing = false;
    for (const n of this.nodes) if (n.grow < 1) { n.grow = Math.min(1, n.grow + dt * 2); growing = true; }
    if (growing) this.layerDirty = true;
    const target = Math.min(60, Math.floor(Math.log10(nps + 1) * 8)) / (this.reduced ? 4 : 1);
    if (this.pulses.length < target && Math.random() < 0.3) this.spawnPulse();
    for (const p of this.pulses) {
      p.t += dt * p.speed;
      while (p.t >= 1 && p.node > 0) { p.t -= 1; p.node = this.nodes[p.node].parent; }
    }
    this.pulses = this.pulses.filter(p => p.node > 0);
    this.corePulse = Math.max(0, this.corePulse - dt * 3);
    this.view.scale += (this.fitScale() - this.view.scale) * Math.min(1, dt * 2);
  },

  // Point sur le filament d'un nœud (t = 0 au parent, 1 au bout)
  pointOn(n, t) {
    const p = this.nodes[n.parent], u = 1 - t;
    return { x: u * u * p.x + 2 * u * t * n.cx + t * t * n.x, y: u * u * p.y + 2 * u * t * n.cy + t * t * n.y };
  },

  // Texture du sol : strates et petits cailloux, fixes (graine constante)
  renderSoil() {
    const c = this.soil.getContext('2d'), { w, h, dpr } = this;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const rng = seededRng(7), sy = this.surfaceY();
    const pal = this.soilPal || this.SOIL;   // v12 : chaque biome a son sol
    const g = c.createLinearGradient(0, sy, 0, h);
    g.addColorStop(0, pal.top); g.addColorStop(0.5, pal.mid); g.addColorStop(1, pal.bottom);
    c.fillStyle = g; c.fillRect(0, sy, w, h - sy);
    c.strokeStyle = pal.strata; c.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const y0 = sy + (h - sy) * (0.12 + k * 0.13);
      c.beginPath(); c.moveTo(0, y0);
      for (let x = 0; x <= w; x += 20) c.lineTo(x, y0 + Math.sin(x * 0.02 + k * 1.9) * 4);
      c.stroke();
    }
    const count = Math.floor(w * (h - sy) / 900);
    for (let k = 0; k < count; k++) {
      const x = rng() * w, y = sy + 6 + rng() * (h - sy - 6), r = 0.4 + rng() * rng() * 2.6;
      c.fillStyle = rng() < 0.5 ? pal.pebble : 'rgba(0,0,0,0.25)';
      c.beginPath(); c.ellipse(x, y, r * 1.3, r, rng() * 3, 0, Math.PI * 2); c.fill();
    }
  },

  SOIL: { top: '#22180f', mid: '#18110b', bottom: '#100b08', strata: 'rgba(120,90,60,0.06)', pebble: 'rgba(160,130,95,0.10)' },

  // Réseau pré-rendu sur un calque : redessiné seulement si une branche pousse ou si le zoom change
  renderLayer() {
    const c = this.layer.getContext('2d'), { w, h, dpr } = this;
    const sc = this.view.scale, core = this.coreScreen();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.translate(core.x, core.y);
    c.scale(sc, sc);
    c.lineCap = 'round';
    const segs = [];
    for (let i = 1; i < this.nodes.length; i++) {
      const n = this.nodes[i], p = this.nodes[n.parent];
      const t = n.grow;
      // Sous-courbe [0, t] (de Casteljau) pour l'animation de pousse
      const e = t < 1 ? this.pointOn(n, t) : n;
      const cx = p.x + (n.cx - p.x) * t, cy = p.y + (n.cy - p.y) * t;
      segs.push({ n, p, e, cx, cy, lw: (0.45 + Math.log2(n.load + 2) * 0.42 + n.tier * 0.1) / sc });
    }
    // 1) Halo diffus, en mode additif
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.07;
    for (const s of segs) {
      c.strokeStyle = s.n.color; c.lineWidth = s.lw * 4.5;
      c.beginPath(); c.moveTo(s.p.x, s.p.y); c.quadraticCurveTo(s.cx, s.cy, s.e.x, s.e.y); c.stroke();
    }
    // 2) Filament
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 0.62;
    for (const s of segs) {
      c.strokeStyle = s.n.color; c.lineWidth = s.lw;
      c.beginPath(); c.moveTo(s.p.x, s.p.y); c.quadraticCurveTo(s.cx, s.cy, s.e.x, s.e.y); c.stroke();
    }
    // 3) Pointes en croissance : petites perles claires au bout des hyphes
    c.globalAlpha = 0.85;
    for (const s of segs) {
      if (s.n.children) continue;
      c.fillStyle = lighten(s.n.color, 0.55);
      c.beginPath(); c.arc(s.e.x, s.e.y, (0.9 + s.n.tier * 0.12) / sc, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    this.layerScale = sc;
    this.layerDirty = false;
  },

  draw(state, season, env = {}) {
    const { ctx, dpr, w, h } = this;
    if (!(w > 0 && h > 0)) { this.resize(); return; }  // planche invisible : rien à dessiner
    if (!(this.view.scale > 0) || !isFinite(this.view.scale)) this.view.scale = this.fitScale();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.soil, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawSurface(state, season, env);

    const sc = this.view.scale;
    if (this.layerDirty || Math.abs(sc - this.layerScale) > 0.002) this.renderLayer();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const c = this.coreScreen();
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(sc, sc);

    // Impulsions de nutriments qui remontent vers le cœur, avec une petite traîne
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.pulses) {
      const n = this.nodes[p.node];
      if (!n || n.parent < 0) continue;
      for (let k = 0; k < 4; k++) {
        const t = Math.min(1, 1 - p.t + k * 0.09);
        const pt = this.pointOn(n, t);
        ctx.globalAlpha = 0.75 - k * 0.18;
        ctx.fillStyle = k ? '#bfe6a0' : '#f2ffe4';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, (2 - k * 0.35) / sc, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    this.drawRival();

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(sc, sc);
    // Cœur de Claudius : un nœud organique qui respire
    const t = this.clock();
    const r = (13 + Math.sin(t * 2) * 1.2 + this.corePulse * 8) / sc;
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
    halo.addColorStop(0, 'rgba(255,236,190,0.55)');
    halo.addColorStop(0.4, 'rgba(232,184,107,0.22)');
    halo.addColorStop(1, 'rgba(232,184,107,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 0, 0, 0, r);
    body.addColorStop(0, '#fff6df');
    body.addColorStop(0.55, '#f0cf8e');
    body.addColorStop(1, '#c48a45');
    ctx.fillStyle = body;
    ctx.beginPath();
    const K = 11;
    for (let k = 0; k <= K; k++) {
      const a = (k / K) * Math.PI * 2;
      const rr = r * 0.62 * (1 + 0.09 * Math.sin(t * 1.4 + k * 1.9) + 0.05 * Math.sin(k * 3.1));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    // Spore dorée (V11, Héritage des anciennes forêts) : décor seulement, elle tourne lentement autour du cœur
    if (state.legacy) {
      const a = t * 0.16, d = r * 1.05, gx = Math.cos(a) * d, gy = Math.sin(a) * d * 0.8, gr = r * 0.34;
      const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * 3.2);
      gl.addColorStop(0, 'rgba(255,226,140,0.55)');
      gl.addColorStop(1, 'rgba(255,226,140,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(gx, gy, gr * 3.2, 0, Math.PI * 2); ctx.fill();
      const gb = ctx.createRadialGradient(gx - gr * 0.3, gy - gr * 0.35, 0, gx, gy, gr);
      gb.addColorStop(0, '#fff8d8'); gb.addColorStop(0.5, '#f4cf5e'); gb.addColorStop(1, '#a8761f');
      ctx.fillStyle = gb;
      ctx.beginPath(); ctx.ellipse(gx, gy, gr, gr * 0.78, a + 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,36,10,0.55)'; ctx.lineWidth = 0.6 / sc; ctx.stroke();
    }
    ctx.restore();
  },

  // ---------- Grande fructification (V11) ----------
  // À chaque palier de spores, un grand carpophore sort de terre à la surface et libère un nuage de spores.
  // Purement visuel : rien n'est effacé. Avec les animations réduites, il apparaît d'un coup, sans mouvement.
  FRUIT_LIFE: 10,
  fruits: [],
  fruit() {
    this.fruits.push({ t0: performance.now() / 1000, x: 0.5 + (Math.random() - 0.5) * 0.36, seed: (Math.random() * 1e9) >>> 0 });
    if (this.fruits.length > 2) this.fruits.shift();
  },
  drawFruits(sy) {
    if (!this.fruits.length) return;
    const ctx = this.ctx, now = performance.now() / 1000, D = this.FRUIT_LIFE;
    const life = this.reduced ? 5 : D;
    this.fruits = this.fruits.filter(f => now - f.t0 < life);
    const cl = v => Math.min(1, Math.max(0, v));
    const ease = v => 1 - Math.pow(1 - cl(v), 3);
    for (const f of this.fruits) {
      const age = now - f.t0, x = this.w * f.x;
      const rise = this.reduced ? 1 : ease(age / 1.6), open = this.reduced ? 1 : ease((age - 1.1) / 1.3);
      const fade = this.reduced ? cl((life - age) / 1) : 1 - cl((age - (D - 1.8)) / 1.8);
      const H = Math.max(30, Math.min(sy - 24, 96)) * rise;
      const sway = this.reduced ? 0 : Math.sin(age * 1.3) * 1.5 * open;
      const top = { x: x + sway, y: sy - H };
      const R = (8 + 19 * open) * (0.6 + 0.4 * rise);
      ctx.save();
      ctx.globalAlpha = fade;
      // halo au pied et autour du chapeau
      const halo = ctx.createRadialGradient(top.x, top.y, 0, top.x, top.y, R * 2.6);
      halo.addColorStop(0, 'rgba(255,238,200,0.28)');
      halo.addColorStop(1, 'rgba(255,238,200,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(top.x, top.y, R * 2.6, 0, Math.PI * 2); ctx.fill();
      // pied ivoire, légèrement courbe, plus épais à la base
      const st = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
      st.addColorStop(0, '#cdbd9c'); st.addColorStop(0.45, '#f6eedb'); st.addColorStop(1, '#bba987');
      ctx.fillStyle = st;
      ctx.beginPath();
      ctx.moveTo(x - 4.2, sy + 1);
      ctx.quadraticCurveTo(x - 3 + sway * 0.4, sy - H * 0.55, top.x - 2.4, top.y + 2);
      ctx.lineTo(top.x + 2.4, top.y + 2);
      ctx.quadraticCurveTo(x + 3 + sway * 0.4, sy - H * 0.55, x + 4.2, sy + 1);
      ctx.closePath(); ctx.fill();
      // anneau
      if (open > 0.3) {
        ctx.strokeStyle = 'rgba(240,230,205,0.8)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(top.x, top.y + H * 0.22, 4.2, 1.4, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // chapeau : œuf fermé qui s'ouvre en ombrelle
      const capH = R * (0.95 - 0.5 * open);
      const cg = ctx.createRadialGradient(top.x - R * 0.3, top.y - capH * 0.7, 0, top.x, top.y, R * 1.1);
      cg.addColorStop(0, '#fbf3df'); cg.addColorStop(0.6, '#e6d1a6'); cg.addColorStop(1, '#a98657');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(top.x, top.y, R, capH, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      // lames sous le chapeau
      ctx.fillStyle = 'rgba(90,64,40,0.55)';
      ctx.beginPath(); ctx.ellipse(top.x, top.y, R * 0.96, R * 0.16 * open + 0.6, 0, 0, Math.PI); ctx.fill();
      // écailles
      ctx.fillStyle = 'rgba(150,110,70,0.35)';
      for (let k = 0; k < 5; k++) {
        const a = Math.PI * (1.15 + k * 0.17);
        ctx.beginPath(); ctx.arc(top.x + Math.cos(a) * R * 0.62, top.y + Math.sin(a) * capH * 0.62, 1.1, 0, Math.PI * 2); ctx.fill();
      }
      // nuage de spores : parti des lames, emporté par le vent
      const rng = seededRng(f.seed);
      ctx.globalCompositeOperation = 'lighter';
      // la plupart retombent en pluie fine sur la planche, au-dessus du réseau
      const dir = rng() < 0.5 ? -1 : 1;
      for (let k = 0; k < 140; k++) {
        const born = 2 + rng() * 3.2, ph = rng() * 6.28, vx = dir * (8 + rng() * 30) * (rng() < 0.25 ? -0.6 : 1), vy = (rng() - 0.7) * 22, ox = (rng() - 0.5) * R * 1.7;
        const sz = 0.8 + rng() * 1.5, gold = rng() < 0.18;
        let pa = this.reduced ? 0.5 + rng() * 3 : age - born;
        if (pa <= 0) continue;
        const a = fade * cl(1 - pa / 5.5) * cl(pa * 3) * 0.85;
        if (a <= 0) continue;
        const px = top.x + ox + vx * pa + Math.sin(pa * 1.7 + ph) * 5;
        const py = top.y + 1 - vy * pa + Math.cos(pa * 1.3 + ph) * 3;
        ctx.globalAlpha = a;
        ctx.fillStyle = gold ? '#ffd98a' : '#f4ecd6';
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },

  // ---------- Colonie rivale (V6) ----------
  // Un mycélium violet qui part d'un bord de la planche et rampe vers le cœur.
  // Coordonnées : x en fraction de la largeur, y en fraction de la hauteur du sol (résiste au redimensionnement).
  rival: null,
  startRival(r) {
    const rng = seededRng(r.seed || 1);
    const side = rng() < 0.5 ? -1 : 1;
    const nodes = [{ x: side < 0 ? -0.02 : 1.02, y: 0.3 + rng() * 0.55, parent: -1 }];
    const target = { x: 0.5, y: 0.42 };
    for (let k = 1; k < 80; k++) {
      const pi = k < 4 ? 0 : Math.max(0, k - 1 - Math.floor(rng() * rng() * k));
      const p = nodes[pi];
      const a = Math.atan2(target.y - p.y, target.x - p.x) + (rng() - 0.5) * 2.2;
      const len = 0.025 + rng() * 0.035;
      nodes.push({ x: p.x + Math.cos(a) * len, y: Math.min(0.98, Math.max(0.04, p.y + Math.sin(a) * len * 1.6)), parent: pi });
    }
    this.rival = { nodes, data: r, end: 0, won: false };
  },
  endRival(won) {
    if (!this.rival) return;
    this.rival.end = performance.now();
    this.rival.won = won;
  },
  drawRival() {
    const rv = this.rival;
    if (!rv) return;
    const { ctx, w, h } = this, sy = this.surfaceY(), sh = h - sy;
    let fade = 1;
    if (rv.end) {
      fade = 1 - (performance.now() - rv.end) / 900;
      if (fade <= 0) { this.rival = null; return; }
    }
    const d = rv.data;
    const grow = Math.min(1, 0.25 + 0.75 * (1 - Math.max(0, d.left) / RIVAL_DURATION));
    const health = Math.max(0, d.hp) / (d.max || 1);
    const shown = Math.max(2, Math.ceil(rv.nodes.length * grow * (rv.end ? 1 : 0.35 + 0.65 * health)));
    const X = n => n.x * w, Y = n => sy + n.y * sh;
    const t = this.clock();
    ctx.save();
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalCompositeOperation = pass ? 'source-over' : 'lighter';
      ctx.globalAlpha = (pass ? 0.75 : 0.12) * fade;
      ctx.strokeStyle = rv.end && rv.won ? '#f2e6ff' : pass ? '#9a64b4' : '#b77ad6';
      ctx.lineWidth = pass ? 1.3 : 5;
      ctx.beginPath();
      for (let k = 1; k < shown; k++) {
        const n = rv.nodes[k], p = rv.nodes[n.parent];
        const wob = Math.sin(t * 2 + k) * 1.2;
        ctx.moveTo(X(p), Y(p));
        ctx.quadraticCurveTo((X(p) + X(n)) / 2 + wob, (Y(p) + Y(n)) / 2 - wob, X(n), Y(n));
      }
      ctx.stroke();
    }
    // Têtes de croissance, qui battent comme un pouls
    ctx.globalAlpha = fade * (0.6 + 0.3 * Math.sin(t * 5));
    ctx.fillStyle = '#d7a8ee';
    for (let k = Math.max(1, shown - 8); k < shown; k++) {
      const n = rv.nodes[k];
      ctx.beginPath(); ctx.arc(X(n), Y(n), 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // ---------- Surface (V3) ----------
  // Ordre des emplacements d'arbres : bien répartis même avec peu d'arbres
  TREE_SLOTS: [0.5, 0.18, 0.82, 0.34, 0.66, 0.07, 0.93, 0.26, 0.74],
  SKY: {
    printemps: ['#17263a', '#46684f'], ete: ['#1d2c48', '#8a7550'],
    automne: ['#241a2c', '#83502f'], hiver: ['#1a202c', '#5b6574'],
  },
  GROUND: {
    printemps: ['#2f4a25', '#7bbf5c'], ete: ['#3d4a22', '#a9b84c'],
    automne: ['#4a2f1a', '#c97a3a'], hiver: ['#3a3f48', '#eef3f8'],
  },

  drawSurface(state, season, env) {
    if (this.biome) { this.drawBiomeSurface(state, env); return; }  // v12 : planches de biome
    const { ctx, w } = this;
    const sy = this.surfaceY();
    const t = this.clock();
    const id = season.id;
    const dry = !!env.drought;
    const ground = this.GROUND[id];

    // Ciel en dégradé, plus chaud pendant une sécheresse ; v13 : jour, nuit, aube et crépuscule selon l'heure réelle
    this.drawSky(dry ? ['#3c2a18', '#c08a42'] : this.SKY[id], dry ? 'drought' : id, sy, { dry });

    // Aurore (V6) : la noosphère fait onduler le ciel
    const gaia = state.gens.gaia || 0;
    if (gaia > 0) {
      const a = Math.min(1, 0.3 + gaia / 25) * (1 - 0.8 * Sky.get().day);   // v13 : à peine visible en plein jour
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) {
        const col = ['rgba(150,230,190,', 'rgba(200,170,255,', 'rgba(130,200,255,'][b];
        const g = ctx.createLinearGradient(0, 0, 0, sy);
        g.addColorStop(0, col + '0)');
        g.addColorStop(0.5, col + (0.3 * a).toFixed(3) + ')');
        g.addColorStop(1, col + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, sy * 0.15);
        for (let x = 0; x <= w; x += 12) ctx.lineTo(x, sy * (0.12 + 0.08 * b) + Math.sin(x * 0.012 + t * 0.4 + b * 2) * sy * 0.08);
        for (let x = w; x >= 0; x -= 12) ctx.lineTo(x, sy * (0.45 + 0.08 * b) + Math.sin(x * 0.01 + t * 0.3 + b) * sy * 0.1);
        ctx.fill();
      }
      ctx.restore();
    }

    // Forêt lointaine en silhouette (profondeur)
    ctx.fillStyle = 'rgba(8,10,8,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, sy);
    for (let x = 0; x <= w; x += 14) {
      const hh = sy * (0.22 + 0.1 * Math.sin(x * 0.05) + 0.07 * Math.sin(x * 0.13 + 1.7));
      ctx.lineTo(x, sy - hh);
    }
    ctx.lineTo(w, sy);
    ctx.fill();

    // Arbres : au moins 3 en décor, les premiers sont ceux avec qui Claudius a pactisé
    const pacted = Math.min(state.gens.myco, this.TREE_SLOTS.length);
    const count = Math.max(3, pacted);
    const core = this.coreScreen();
    for (let i = 0; i < count; i++) {
      const x = w * this.TREE_SLOTS[i];
      const hgt = sy * (0.62 + ((i * 17) % 5) * 0.06);
      if (i < pacted) this.drawRoot(x, sy, core, i, t, env.sugarRate > 0);
      this.drawTree(x, sy, hgt, id, dry, i < pacted, i);
    }

    // Sol : couche d'humus qui s'estompe vers le réseau
    const humus = ctx.createLinearGradient(0, sy, 0, sy + 22);
    humus.addColorStop(0, dry ? 'rgba(120,80,40,0.75)' : 'rgba(70,48,30,0.75)');
    humus.addColorStop(1, 'rgba(70,48,30,0)');
    ctx.fillStyle = humus;
    ctx.fillRect(0, sy, w, 22);
    ctx.fillStyle = dry ? '#6b5530' : ground[0];
    ctx.fillRect(0, sy - 3, w, 5);

    // Herbe (ou neige / herbe sèche)
    if (id === 'hiver' && !dry) {
      ctx.fillStyle = ground[1];
      ctx.beginPath();
      ctx.moveTo(0, sy - 2);
      for (let x = 0; x <= w; x += 10) ctx.lineTo(x, sy - 4 - 1.5 * Math.sin(x * 0.21));
      ctx.lineTo(w, sy + 1); ctx.lineTo(0, sy + 1);
      ctx.fill();
    } else {
      ctx.strokeStyle = dry ? '#b79a52' : ground[1];
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 2; x < w; x += 5) {
        const hh = 3 + 3 * Math.abs(Math.sin(x * 1.37)) * (dry ? 0.5 : 1);
        const sway = Math.sin(t * 1.5 + x * 0.05) * 1.2;
        ctx.moveTo(x, sy - 1);
        ctx.lineTo(x + sway, sy - 1 - hh);
      }
      ctx.stroke();
    }

    // Rochers couverts de lichen (V6, plus visibles en V7)
    const rocks = Math.min(state.gens.lichen || 0, this.ROCK_SLOTS.length);
    for (let i = 0; i < rocks; i++) this.drawRock(w * this.ROCK_SLOTS[i], sy, i, id, dry);

    // Champignons de litière (V7) : discrets, en petites touffes, pour ne pas ressembler
    // aux carpophores à cueillir (grands, ivoire et lumineux, dessinés hors du canvas)
    const shrooms = Math.min(state.gens.litiere, 18);
    for (let i = 0; i < shrooms; i++) {
      const tuft = i % 6, k = Math.floor(i / 6);
      const x = w * (0.05 + ((tuft * 0.379 + 0.12) % 1) * 0.9) + (k - 1) * 4.5 + (k === 1 ? 0 : 0.8);
      const s = 0.62 + ((i * 7) % 3) * 0.1 - (k === 1 ? 0 : 0.08);
      const base = sy + 1;
      ctx.fillStyle = '#b9a88a';
      ctx.fillRect(x - 0.7 * s, base - 6 * s, 1.4 * s, 6 * s);
      ctx.fillStyle = (i % 3) ? '#9c5a33' : '#86502f';
      ctx.beginPath(); ctx.ellipse(x, base - 6 * s, 3.6 * s, 2.8 * s, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(40,24,14,0.45)';
      ctx.fillRect(x - 3.6 * s, base - 6.2 * s, 7.2 * s, 0.7 * s);
    }

    // Lueur des abysses (V6) : le fond de la planche s'éclaire de vert d'eau
    const aby = state.gens.abysses || 0;
    if (aby > 0) {
      const a = Math.min(1, 0.35 + aby / 40) * (0.85 + 0.15 * Math.sin(t * 0.8));
      const g = ctx.createLinearGradient(0, this.h, 0, this.h * 0.7);
      g.addColorStop(0, `rgba(116,207,198,${(0.22 * a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(116,207,198,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, this.h * 0.7, w, this.h * 0.3);
    }

    // Lucioles (bois lumineux)
    const flies = Math.min(state.gens.lumi * 2, 30), flyK = 1 - 0.6 * Sky.get().day;   // v13 : moins visibles en plein jour
    ctx.fillStyle = '#c6ff9e';
    for (let i = 0; i < flies; i++) {
      const x = (w * ((i * 0.618) % 1) + Math.sin(t * 0.7 + i) * 20 + w) % w;
      const y = sy * 0.2 + ((i * 0.37) % 1) * sy * 0.6 + Math.cos(t + i * 2) * 6;
      ctx.globalAlpha = (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))) * flyK;
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawFauna(id, sy, t, { rain: env.rain, dry });   // v13 : petite faune décorative
    this.drawDaylight(sy);
    this.drawWeather(id, dry, sy, t);
    this.drawFruits(sy);
  },

  // Emplacements des rochers de lichen : entre les arbres, du centre vers les bords
  ROCK_SLOTS: [0.42, 0.6, 0.12, 0.88, 0.28, 0.72, 0.02, 0.98, 0.5, 0.2],

  // Un rocher clair, éclairé par la lune, couvert de croûtes de lichen (vert pâle et jaune orangé)
  drawRock(x, sy, i, season, dry) {
    const ctx = this.ctx;
    const rng = seededRng(101 + i * 31);
    const s = 1.25 + ((i * 5) % 3) * 0.28;
    const rw = 10 * s, rh = 7 * s, base = sy + 2;
    // Ombre portée sur le sol
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x + 2, base, rw * 1.05, 1.6 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Silhouette irrégulière
    const pts = [];
    const K = 9;
    for (let k = 0; k <= K; k++) {
      const a = Math.PI + (k / K) * Math.PI;
      const rr = 0.82 + rng() * 0.22;
      pts.push([x + Math.cos(a) * rw * rr, base + Math.sin(a) * rh * rr * (k === 0 || k === K ? 0.2 : 1)]);
    }
    const path = () => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], base);
      for (const [px, py] of pts) ctx.lineTo(px, py);
      ctx.lineTo(pts[K][0], base); ctx.closePath();
    };
    const g = ctx.createLinearGradient(x - rw * 0.5, base - rh, x + rw * 0.4, base);
    g.addColorStop(0, dry ? '#b4a68c' : '#a7a196');
    g.addColorStop(0.55, '#7d776c');
    g.addColorStop(1, '#4e4942');
    ctx.fillStyle = g; path(); ctx.fill();
    // Arête éclairée et contour sombre : le rocher se détache du sol foncé
    ctx.strokeStyle = 'rgba(20,16,12,0.55)'; ctx.lineWidth = 1; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,235,0.32)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pts[1][0], pts[1][1] + 0.5);
    for (let k = 2; k <= 5; k++) ctx.lineTo(pts[k][0], pts[k][1] + 0.5);
    ctx.stroke();
    // Croûtes de lichen : rosettes plus vives en hiver (le lichen aime le froid)
    const cold = season === 'hiver' && !dry;
    ctx.save();
    path(); ctx.clip();
    for (let k = 0; k < 7; k++) {
      const lx = x + (rng() - 0.5) * rw * 1.5, ly = base - rh * (0.25 + rng() * 0.7);
      const lr = (1.1 + rng() * 1.6) * s;
      const gold = k % 3 === 2;
      ctx.globalAlpha = cold ? 0.95 : 0.82;
      ctx.fillStyle = gold ? '#e3b347' : (cold ? '#dcf0b8' : '#c4d8a0');
      // Rosette : petits lobes irréguliers autour d'un centre
      ctx.beginPath();
      const lobes = 5 + Math.floor(rng() * 3), a0 = rng() * 6;
      for (let q = 0; q < lobes; q++) {
        const a = a0 + (q / lobes) * Math.PI * 2, d = lr * (0.45 + rng() * 0.35);
        ctx.moveTo(lx + Math.cos(a) * d, ly + Math.sin(a) * d * 0.8);
        ctx.arc(lx + Math.cos(a) * d, ly + Math.sin(a) * d * 0.8, lr * (0.35 + rng() * 0.25), 0, Math.PI * 2);
      }
      ctx.moveTo(lx + lr * 0.5, ly);
      ctx.arc(lx, ly, lr * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gold ? '#b9782a' : '#8aa36a';
      ctx.beginPath(); ctx.arc(lx, ly, lr * 0.22, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // Un peu de neige sur le dessus en hiver
    if (cold) {
      ctx.fillStyle = 'rgba(240,245,250,0.85)';
      ctx.beginPath(); ctx.ellipse(x - rw * 0.1, base - rh * 0.92, rw * 0.45, 1.6 * s, -0.1, Math.PI, 0); ctx.fill();
    }
  },

  // Un arbre : tronc effilé, couronne en trois boules, selon la saison
  drawTree(x, base, hgt, season, dry, pacted, i) {
    const ctx = this.ctx;
    const trunkH = hgt * 0.5, tw = Math.max(2.5, hgt * 0.06);
    ctx.fillStyle = pacted ? '#5e3f28' : '#3f2c1f';
    ctx.beginPath();
    ctx.moveTo(x - tw, base); ctx.lineTo(x - tw * 0.45, base - trunkH);
    ctx.lineTo(x + tw * 0.45, base - trunkH); ctx.lineTo(x + tw, base);
    ctx.fill();
    const cy = base - trunkH - hgt * 0.15, r = hgt * 0.24;
    if (season === 'hiver' && !dry) {
      // Branches nues + un peu de neige
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const [dx, dy] of [[-1, -0.6], [1, -0.8], [-0.4, -1.2], [0.5, -1.3]]) {
        ctx.moveTo(x, base - trunkH * 0.85); ctx.lineTo(x + dx * r, cy + dy * r * 0.6);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(238,243,248,0.85)';
      ctx.beginPath(); ctx.ellipse(x, cy - r * 0.5, r * 0.7, r * 0.18, 0, Math.PI, 0); ctx.fill();
      return;
    }
    const palette = dry ? ['#7d7a3a', '#a49a4a']
      : { printemps: ['#3f7a3a', '#66a852'], ete: ['#2f6a30', '#4f8f3a'], automne: ['#a4502a', '#df8f38'] }[season];
    const alpha = pacted ? 1 : 0.7;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette[0];
    ctx.beginPath();
    ctx.arc(x - r * 0.6, cy + r * 0.15, r * 0.75, 0, Math.PI * 2);
    ctx.arc(x + r * 0.6, cy + r * 0.15, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette[1];
    ctx.beginPath(); ctx.arc(x, cy - r * 0.3, r * 0.85, 0, Math.PI * 2); ctx.fill();
    // Fleurs au printemps
    if (season === 'printemps' && !dry) {
      ctx.fillStyle = '#f4c6d8';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(k * 2.4 + i) * r * 0.7, cy - r * 0.2 + Math.sin(k * 2.4 + i) * r * 0.5, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Halo doré au pied des arbres pactisés
    if (pacted) {
      const g = ctx.createRadialGradient(x, base, 0, x, base, r * 1.2);
      g.addColorStop(0, 'rgba(255,207,110,0.35)');
      g.addColorStop(1, 'rgba(255,207,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r * 1.2, base - r * 1.2, r * 2.4, r * 2.4);
    }
  },

  // Racine qui relie un arbre pactisé au réseau ; le sucre y descend en gouttes dorées
  drawRoot(x, sy, core, i, t, sugarFlow) {
    const ctx = this.ctx;
    const p0 = { x, y: sy };
    const p1 = { x: x + (core.x - x) * 0.1, y: sy + (core.y - sy) * 0.55 };
    const p2 = { x: x + (core.x - x) * 0.6, y: sy + (core.y - sy) * 0.8 };
    ctx.strokeStyle = 'rgba(255,207,110,0.28)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); ctx.stroke();
    if (!sugarFlow) return;
    ctx.fillStyle = '#ffcf6e';
    for (let k = 0; k < 2; k++) {
      const u = (t * 0.35 + k / 2 + i * 0.13) % 1, v = 1 - u;
      const px = v * v * p0.x + 2 * v * u * p1.x + u * u * p2.x;
      const py = v * v * p0.y + 2 * v * u * p1.y + u * u * p2.y;
      ctx.globalAlpha = Math.sin(u * Math.PI);
      ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // Feuilles mortes en automne, neige en hiver, poussière en sécheresse
  drawWeather(season, dry, sy, t) {
    const ctx = this.ctx, w = this.w;
    let n = 0, color = '', size = 1.5, fall = 12;
    if (dry) { n = 14; color = 'rgba(220,180,110,0.5)'; size = 1; fall = 3; }
    else if (season === 'automne') { n = 12; color = '#d9853a'; size = 2.2; fall = 10; }
    else if (season === 'hiver') { n = 26; color = 'rgba(245,248,255,0.85)'; size = 1.4; fall = 8; }
    if (!n) return;
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const seed = (i * 0.618) % 1;
      const y = ((seed * sy + t * fall * (0.7 + seed)) % sy);
      const x = (w * ((i * 0.381) % 1) + Math.sin(t * 0.9 + i) * 14 + w) % w;
      ctx.beginPath();
      if (season === 'automne' && !dry) ctx.ellipse(x, y, size, size * 0.55, t + i, 0, Math.PI * 2);
      else ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

// ---------- Planche d'épreuve (V11) ----------
// Une 2ᵉ planche dessinée comme la principale, sur son propre canvas, avec son propre réseau.
// Prévue pour resservir aux biomes de la v12 : PlateView.make(canvas) crée une vue indépendante.
const PlateView = {
  make(canvas) {
    const v = Object.create(Network);
    Object.assign(v, { nodes: [], pulses: [], fruits: [], rival: null, view: { scale: 1 }, bounds: { maxX: 1, maxY: 1, minY: 0 },
      corePulse: 0, layerDirty: true, layerScale: 0, plateId: null });
    v.init(canvas);
    return v;
  },
  // Le dessin de surface lit state.gens : on lui passe ceux de la planche (list : générateurs d'un biome, v12)
  fakeState(p, list) {
    const gens = {};
    for (const g of (list || GENERATORS)) gens[g.id] = (p && p.gens[g.id]) || 0;
    return { gens, legacy: null };
  },
  // v12 : la vue devient celle d'un biome (ou redevient une planche d'épreuve avec def = null)
  setBiome(v, def) {
    if (v.biome === def) return;
    v.biome = def;
    v.genList = def ? def.gens : null;
    v.soilPal = def ? BIOME_SOIL[def.id] : null;
    v.renderSoil();
    v.layerDirty = true;
  },
};

// ---------- Surfaces des biomes (V12) ----------
// Même gravure que la forêt : ciel de nuit, horizon, et ce que les générateurs du biome font pousser en surface.
const BIOME_SOIL = {
  tourbiere: { top: '#1f150c', mid: '#170f08', bottom: '#0e0905', strata: 'rgba(150,100,60,0.09)', pebble: 'rgba(120,150,80,0.10)' },
  alpine: { top: '#1c1e23', mid: '#15171b', bottom: '#0e0f12', strata: 'rgba(170,185,210,0.07)', pebble: 'rgba(200,210,225,0.12)' },
  tropical: { top: '#26150d', mid: '#1b0f09', bottom: '#110906', strata: 'rgba(190,110,60,0.08)', pebble: 'rgba(210,140,70,0.12)' },
};
Object.assign(Network, {
  drawBiomeSurface(state, env) {
    const { ctx, w } = this, sy = this.surfaceY(), t = this.clock(), g = state.gens, id = this.biome.id;
    const night = { tourbiere: ['#10161a', '#2a3226'], alpine: ['#0a1020', '#283954'], tropical: ['#0b1613', '#22402f'] }[id];
    // lune plus haute en montagne ; l'alpage a déjà ses étoiles
    this.drawSky(night, id, sy, id === 'alpine' ? { moonX: 0.18, moonY: 0.22, noStars: true } : {});
    if (id === 'tourbiere') this.drawBog(g, sy, t);
    else if (id === 'alpine') this.drawAlpine(g, sy, t);
    else this.drawTropical(g, sy, t);
    this.drawFauna(id, sy, t);   // v13
    this.drawDaylight(sy);
  },
  // Sol : un trait d'horizon et une couche qui s'estompe vers le réseau
  drawGround(sy, top, line) {
    const ctx = this.ctx, w = this.w;
    const humus = ctx.createLinearGradient(0, sy, 0, sy + 22);
    humus.addColorStop(0, top); humus.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = humus; ctx.fillRect(0, sy, w, 22);
    ctx.fillStyle = line; ctx.fillRect(0, sy - 3, w, 5);
  },
  // Tourbière : flaques où se reflète la lune, buttes de sphaigne, linaigrettes, bruyère, rossolis, brume
  drawBog(g, sy, t) {
    const ctx = this.ctx, w = this.w;
    ctx.fillStyle = 'rgba(8,10,8,0.4)';     // bouleaux lointains, clairsemés
    for (let i = 0; i < 9; i++) {
      const x = w * ((i * 0.137 + 0.05) % 1), hh = sy * (0.18 + ((i * 7) % 4) * 0.05);
      ctx.fillRect(x, sy - hh, 1.6, hh);
      ctx.beginPath(); ctx.ellipse(x + 0.8, sy - hh, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    this.drawGround(sy, 'rgba(60,40,22,0.8)', '#3d3a22');
    // flaques d'eau noire
    for (const [fx, fw] of [[0.2, 0.16], [0.63, 0.12], [0.9, 0.08]]) {
      const x = w * fx, rw = w * fw / 2;
      ctx.fillStyle = '#0c1214';
      ctx.beginPath(); ctx.ellipse(x, sy + 1, rw, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,230,210,0.25)';
      ctx.fillRect(x - rw * 0.25 + Math.sin(t * 0.6 + fx * 9) * 2, sy, rw * 0.5, 0.8);
    }
    // buttes de sphaigne (tapis) et buttes millénaires (plus hautes)
    const mounds = Math.min(3 + Math.floor((g.sphaigne || 0) / 4), 14);
    for (let i = 0; i < mounds; i++) {
      const x = w * ((i * 0.293 + 0.07) % 1), r = 7 + (i % 3) * 3;
      ctx.fillStyle = i % 2 ? '#6f7a3a' : '#8a5a3a';
      ctx.beginPath(); ctx.ellipse(x, sy, r, r * 0.45, 0, Math.PI, 0); ctx.fill();
    }
    const old = Math.min(g.butte || 0, 4);
    for (let i = 0; i < old; i++) {
      const x = w * [0.42, 0.76, 0.1, 0.55][i], r = 20 + i * 2;
      ctx.fillStyle = '#5b4a2c';
      ctx.beginPath(); ctx.ellipse(x, sy, r, r * 0.55, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(150,170,90,0.5)';
      ctx.beginPath(); ctx.ellipse(x, sy - r * 0.45, r * 0.7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // bruyère : petites touffes violettes
    const heath = Math.min(g.ericoide || 0, 16);
    for (let i = 0; i < heath; i++) {
      const x = w * ((i * 0.381 + 0.15) % 1);
      ctx.strokeStyle = '#4c3a3a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x - 2, sy - 5); ctx.moveTo(x, sy); ctx.lineTo(x + 2, sy - 6); ctx.stroke();
      ctx.fillStyle = '#b98bb0';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - 2 + k * 2, sy - 5 - (k % 2), 1.1, 0, Math.PI * 2); ctx.fill(); }
    }
    // rossolis : rosettes rouges, gouttes de glu qui brillent
    const dew = Math.min(g.rossolis || 0, 10);
    for (let i = 0; i < dew; i++) {
      const x = w * ((i * 0.517 + 0.31) % 1);
      ctx.fillStyle = '#b24a38';
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + k * 1.6, sy - 1.2, 1.1, 2, k * 0.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,240,200,' + (0.5 + 0.4 * Math.sin(t * 2 + i)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, sy - 3.6, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    // linaigrettes : toujours quelques-unes, des pompons blancs qui se balancent
    const cotton = 6 + Math.min(Math.floor((g.sphaigne || 0) / 3), 14);
    for (let i = 0; i < cotton; i++) {
      const x = w * ((i * 0.618 + 0.02) % 1), hh = 9 + (i % 4) * 2.5, sw = Math.sin(t * 1.2 + i) * 1.4;
      ctx.strokeStyle = '#6d6a46'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, sy - 1); ctx.lineTo(x + sw, sy - hh); ctx.stroke();
      ctx.fillStyle = 'rgba(245,242,230,0.9)';
      ctx.beginPath(); ctx.arc(x + sw, sy - hh - 1.5, 2, 0, Math.PI * 2); ctx.fill();
    }
    // brume basse qui dérive
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let k = 0; k < 2; k++) {
      const mx = ((t * (6 + k * 3) + k * w * 0.5) % (w * 1.6)) - w * 0.3;
      const m = ctx.createRadialGradient(mx, sy - 6, 0, mx, sy - 6, w * 0.4);
      m.addColorStop(0, '#dfe6da'); m.addColorStop(1, 'rgba(223,230,218,0)');
      ctx.fillStyle = m; ctx.fillRect(mx - w * 0.4, sy - 30, w * 0.8, 34);
    }
    ctx.restore();
  },
  // Sommets en dents de scie (onde triangulaire), avec un peu de relief ; v13 : partagé avec le chamois qui y marche
  ridgeY(x, k, amp, sy) {
    const u = (x / (this.w * 0.22) + k) % 2, tri = 1 - Math.abs(u - 1);
    return sy - sy * amp * (0.35 + 0.55 * tri * (0.75 + 0.25 * Math.sin(x * 0.05 + k * 3)) + 0.04 * Math.sin(x * 0.31));
  },
  // Forêt alpine : étoiles, sommets enneigés, pins arolles, rhododendrons, blocs de moraine, neige qui tombe
  drawAlpine(g, sy, t) {
    const ctx = this.ctx, w = this.w;
    const rng = seededRng(41), S = Sky.get(), starK = S.on ? S.night : 1;   // v13 : étoiles la nuit seulement
    for (let i = 0; i < 40 && starK > 0.02; i++) {
      const x = rng() * w, y = rng() * sy * 0.6;
      ctx.globalAlpha = starK * (0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + i * 1.7)));
      ctx.fillStyle = '#e8eefc'; ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    const ridge = (k, amp, col) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, sy);
      for (let x = 0; x <= w; x += 6) ctx.lineTo(x, this.ridgeY(x, k, amp, sy));
      ctx.lineTo(w, sy); ctx.fill();
    };
    ridge(1.3, 0.7, '#1b2538');
    // neiges éternelles sur la crête du fond
    ctx.save(); ctx.globalAlpha = 0.35; ridge(1.3, 0.7, 'rgba(220,232,250,0.5)'); ctx.restore();
    ridge(4.1, 0.42, '#141c2b');
    this.drawGround(sy, 'rgba(180,200,225,0.22)', '#d9e4f0');
    // congères (hyphes de névé)
    const drifts = 3 + Math.min(Math.floor((g.neve || 0) / 4), 10);
    ctx.fillStyle = '#e8f0f8';
    for (let i = 0; i < drifts; i++) {
      const x = w * ((i * 0.293 + 0.11) % 1), r = 8 + (i % 3) * 4;
      ctx.beginPath(); ctx.ellipse(x, sy - 1, r, r * 0.3, 0, Math.PI, 0); ctx.fill();
    }
    // blocs de moraine
    const rocks = Math.min(g.moraine || 0, 6);
    for (let i = 0; i < rocks; i++) {
      const x = w * [0.36, 0.7, 0.14, 0.86, 0.5, 0.25][i], r = 7 + (i % 2) * 3;
      ctx.fillStyle = '#6c7584';
      ctx.beginPath(); ctx.moveTo(x - r, sy); ctx.lineTo(x - r * 0.6, sy - r * 0.9); ctx.lineTo(x + r * 0.3, sy - r); ctx.lineTo(x + r, sy); ctx.fill();
      ctx.fillStyle = '#eef3fa';
      ctx.beginPath(); ctx.moveTo(x - r * 0.6, sy - r * 0.9); ctx.lineTo(x + r * 0.3, sy - r); ctx.lineTo(x + r * 0.1, sy - r * 0.75); ctx.fill();
    }
    // rhododendrons : buissons sombres piqués de rose
    const rho = Math.min(g.rhodo || 0, 12);
    for (let i = 0; i < rho; i++) {
      const x = w * ((i * 0.447 + 0.2) % 1);
      ctx.fillStyle = '#2d3d2e';
      ctx.beginPath(); ctx.ellipse(x, sy - 2, 5, 3.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e58aa8';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - 3 + k * 3, sy - 4 - (k % 2), 1, 0, Math.PI * 2); ctx.fill(); }
    }
    // pins arolles : au moins trois en décor, les autres poussent avec les achats
    const pines = Math.max(3, Math.min(g.arolle || 0, 9));
    for (let i = 0; i < pines; i++) {
      const x = w * [0.08, 0.3, 0.58, 0.8, 0.45, 0.19, 0.69, 0.93, 0.02][i], hh = sy * (0.42 + (i % 3) * 0.08);
      const own = i < (g.arolle || 0);
      ctx.fillStyle = own ? '#24402f' : 'rgba(20,30,28,0.8)';
      for (let k = 0; k < 4; k++) {
        const y = sy - hh * (0.25 + k * 0.22), half = hh * (0.28 - k * 0.055);
        ctx.beginPath(); ctx.moveTo(x - half, y + hh * 0.2); ctx.lineTo(x, y - hh * 0.12); ctx.lineTo(x + half, y + hh * 0.2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(235,242,250,0.75)';
      ctx.beginPath(); ctx.moveTo(x - 3, sy - hh * 0.86); ctx.lineTo(x, sy - hh * 0.98); ctx.lineTo(x + 3, sy - hh * 0.86); ctx.fill();
      ctx.fillStyle = '#3a2c20'; ctx.fillRect(x - 1, sy - hh * 0.2, 2, hh * 0.2);
    }
    this.drawWeather('hiver', false, sy, t);
  },
  // Bois mort tropical : un kapokier abattu en travers de la planche, lianes, figuier étrangleur, fourmis, lucioles
  drawTropical(g, sy, t) {
    const ctx = this.ctx, w = this.w;
    ctx.fillStyle = 'rgba(6,14,10,0.55)';   // canopée lointaine
    ctx.beginPath(); ctx.moveTo(0, sy);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, sy - sy * (0.45 + 0.12 * Math.sin(x * 0.03) + 0.08 * Math.sin(x * 0.11 + 2)));
    ctx.lineTo(w, sy); ctx.fill();
    this.drawGround(sy, 'rgba(70,40,22,0.8)', '#3a2a18');
    // le tronc abattu (toujours là : c'est le bois mort qu'on colonise), plus moussu avec les kapokiers
    const moss = Math.min(g.kapok || 0, 6);
    const tx0 = w * 0.08, tx1 = w * 0.74, ty = sy - 7, th = 11;
    const bark = ctx.createLinearGradient(0, ty - th, 0, ty + th);
    bark.addColorStop(0, '#6a4a32'); bark.addColorStop(0.5, '#4a3222'); bark.addColorStop(1, '#2c1d14');
    ctx.fillStyle = bark;
    ctx.beginPath(); ctx.moveTo(tx0, ty - th * 0.8); ctx.lineTo(tx1, ty - th); ctx.lineTo(tx1, ty + th * 0.6); ctx.lineTo(tx0, ty + th * 0.5); ctx.fill();
    ctx.fillStyle = '#5a3c28';
    ctx.beginPath(); ctx.ellipse(tx1, ty - th * 0.2, 4, th * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,10,0.6)'; ctx.lineWidth = 0.8;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(tx1, ty - th * 0.2, 1 + k, th * 0.2 * (k + 1), 0, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 3 + moss * 2; i++) {
      const x = tx0 + (tx1 - tx0) * ((i * 0.37 + 0.1) % 1);
      ctx.fillStyle = i % 2 ? '#5f8a3a' : '#7aa64a';
      ctx.beginPath(); ctx.ellipse(x, ty - th * 0.85, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // souches moussues
    const stumps = Math.min(1 + Math.floor((g.souche || 0) / 5), 6);
    for (let i = 0; i < stumps; i++) {
      const x = w * [0.86, 0.95, 0.8, 0.04, 0.9, 0.12][i], hh = 10 + (i % 2) * 5;
      ctx.fillStyle = '#4a3222'; ctx.fillRect(x - 4, sy - hh, 8, hh);
      ctx.fillStyle = '#c8955e'; ctx.beginPath(); ctx.ellipse(x, sy - hh, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6f9a42'; ctx.beginPath(); ctx.ellipse(x - 2, sy - hh + 1, 2.5, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // figuier étrangleur : racines qui enlacent le tronc
    const fig = Math.min(g.figuier || 0, 8);
    ctx.strokeStyle = '#8a7a52'; ctx.lineWidth = 1.4;
    for (let i = 0; i < fig; i++) {
      const x = tx0 + (tx1 - tx0) * ((i * 0.29 + 0.15) % 1);
      ctx.beginPath(); ctx.moveTo(x, ty - th); ctx.quadraticCurveTo(x + 7, ty, x - 2, sy + 2); ctx.stroke();
    }
    // lianes qui pendent du haut de la planche
    ctx.strokeStyle = 'rgba(90,130,70,0.7)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5 + Math.min(fig, 5); i++) {
      const x = w * ((i * 0.211 + 0.03) % 1), len = sy * (0.25 + (i % 4) * 0.12), sw = Math.sin(t * 0.7 + i) * 3;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + sw, len * 0.6, x + sw * 1.5, len); ctx.stroke();
    }
    // fourmis champignonnistes : une file qui porte des miettes de feuilles
    const ants = Math.min((g.attine || 0) * 2, 24);
    for (let i = 0; i < ants; i++) {
      const x = ((t * 14 + i * (w / Math.max(1, ants))) % (w + 20)) - 10;
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(x, sy - 1.5, 2.2, 1.2);
      ctx.fillStyle = '#8fbf5a'; ctx.fillRect(x + 0.2, sy - 3.6, 1.8, 1.6);
    }
    // lucioles dorées dans l'air humide
    ctx.fillStyle = '#ffe08a';
    for (let i = 0; i < 14; i++) {
      const x = (w * ((i * 0.618) % 1) + Math.sin(t * 0.5 + i) * 18 + w) % w;
      const y = sy * 0.3 + ((i * 0.37) % 1) * sy * 0.55 + Math.cos(t * 0.8 + i * 2) * 5;
      ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t * 1.6 + i));
      ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
});
