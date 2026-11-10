// Utilitaires partagés : bac à sable, réglages du joueur, format des nombres

// ?sandbox=<nom> : partie de test isolée, sur une autre clé (voir CLAUDE.md)
const SANDBOX = (() => {
  try {
    const v = new URLSearchParams(location.search).get('sandbox');
    return v == null ? null : (v.replace(/[^\w-]/g, '').slice(0, 32) || 'test');
  } catch (e) { return null; }
})();

// ---------- Réglages (v10) ----------
// Propres à chaque joueur (ce navigateur, cet appareil) et rangés à part de la partie :
// ils ne partent pas dans les codes d'export et « Effacer » ne les touche pas.
const SETTINGS_KEY = 'claudius-settings-v1' + (SANDBOX ? ':sandbox:' + SANDBOX : '');
const TEXT_SIZES = [1, 1.15, 1.3];
const Settings = {
  v: { lang: null, motion: 'auto', text: 0, contrast: false, numbers: 'suffix', seen: null },  // seen : dernière version dont on a vu les nouveautés
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (e) { /* illisible : valeurs par défaut */ }
    if (d && typeof d === 'object') {
      if (d.lang === 'fr' || d.lang === 'en') this.v.lang = d.lang;
      if (['auto', 'on', 'off'].includes(d.motion)) this.v.motion = d.motion;
      if ([0, 1, 2].includes(d.text)) this.v.text = d.text;
      this.v.contrast = d.contrast === true;
      if (d.numbers === 'sci' || d.numbers === 'suffix') this.v.numbers = d.numbers;
      if (typeof d.seen === 'string' && /^[\d.]{1,12}$/.test(d.seen)) this.v.seen = d.seen;
    }
    if (!this.v.lang) { this.v.lang = this.defaultLang(); this.save(); }
  },
  save() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.v)); } catch (e) { /* stockage bloqué */ } },
  set(k, val) { this.v[k] = val; this.save(); },
  // Une partie existante reste en français (elle a été commencée ainsi) ; sinon la langue du navigateur
  defaultLang() {
    try { if (localStorage.getItem('claudius-save-v1' + (SANDBOX ? ':sandbox:' + SANDBOX : ''))) return 'fr'; } catch (e) { /* rien */ }
    const langs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    return langs.some(l => /^fr\b/i.test(l || '')) || !langs.length ? 'fr' : 'en';
  },
  reducedMotion() {
    if (this.v.motion !== 'auto') return this.v.motion === 'on';
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  },
};

// ---------- Nombres ----------
const SUFFIXES = {
  fr: ['', 'k', 'M', 'Md', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'],
  en: ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'],
};
function isEn() { return Settings.v.lang === 'en'; }
function pctSign() { return isEn() ? '%' : '\u00a0%'; }  // « 5 % » en français, « 5% » en anglais
// Nombre décimal avec la virgule (français) ou le point (anglais)
function fmtDec(x, d) {
  const s = d == null ? String(Math.round(x * 1000) / 1000) : x.toFixed(d);
  return isEn() ? s : s.replace('.', ',');
}
function fmtSci(n) {
  let e = Math.floor(Math.log10(n)), m = n / Math.pow(10, e);
  if (m >= 9.995) { m /= 10; e++; }
  return fmtDec(m, 2) + 'e' + e;
}

function fmt(n, decimals) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, decimals);
  if (n < 1000) {
    const d = decimals != null ? decimals : (n < 10 && n % 1 !== 0 ? 1 : 0);
    return fmtDec(n, d);
  }
  if (Settings.v.numbers === 'sci') {
    // notation scientifique à partir du million ; en dessous, le nombre entier avec ses séparateurs
    if (n < 1e6) return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, isEn() ? ',' : ' ');
    return fmtSci(n);
  }
  const suf = SUFFIXES[isEn() ? 'en' : 'fr'];
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= suf.length) return fmtSci(n);
  const scaled = n / Math.pow(1000, tier);
  return fmtDec(scaled, scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + ' ' + suf[tier];
}

function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function rand(a, b) { return a + Math.random() * (b - a); }
