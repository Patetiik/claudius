// Claudius — service worker : le jeu reste jouable hors connexion, sans jamais servir une ancienne version.
// Stratégie « réseau d'abord » : en ligne, on prend toujours les fichiers du serveur (et on en garde une copie) ;
// hors ligne ou réseau trop lent, on sert la dernière copie. Les sauvegardes (localStorage) ne passent pas par ici.
const VERSION = '9.0';   // changé par nouvelle-version.sh, comme les ?v= de index.html
const CACHE = 'claudius-' + VERSION;
const FILES = [
  './', 'css/style.css',
  'js/util.js', 'js/data.js', 'js/game.js', 'js/network.js', 'js/ui.js', 'js/main.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const TIMEOUT = 4000;  // au-delà, réseau jugé trop lent : on sert la copie (et elle se met à jour en arrière-plan)

// Les copies sont rangées sans le ?v=… ni ?sandbox=… : une seule copie par fichier.
const keyOf = url => { const u = new URL(url); u.search = ''; u.hash = ''; return u.href; };

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f =>
    fetch(f, { cache: 'no-cache' }).then(r => r.ok && c.put(keyOf(new URL(f, self.registration.scope)), r)).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('claudius-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  const key = nav ? keyOf(self.registration.scope) : keyOf(req.url);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // no-cache : le navigateur revalide auprès du serveur, donc une mise à jour est vue tout de suite
    const net = fetch(req, { cache: 'no-cache' }).then(r => {
      if (r.ok && r.type === 'basic') cache.put(key, r.clone());
      return r;
    });
    const copy = await cache.match(key);
    if (!copy) return net;
    const timer = new Promise(ok => setTimeout(() => ok(copy), TIMEOUT));
    e.waitUntil(net.catch(() => {}));
    return Promise.race([net.catch(() => copy), timer]);
  })());
});
