// Séance guidée : service worker (16/11/2026).
// Garde l'appli et les schémas dans le téléphone pour qu'elle s'ouvre sans réseau (aire de street workout).
// On sert la copie gardée tout de suite ; s'il y a du réseau, la dernière version est récupérée
// en arrière-plan et utilisée à l'ouverture suivante.
// Le relevé des séances ne passe jamais par ici : il reste dans le stockage de Chrome.
const VERSION = 'seance-guidee-v1';
const SCHEMAS = ['01_squat', '02_pont_fessier', '03_fente_statique', '04_tirage_incline', '05_planche',
  '06_planche_laterale', '07_bird_dog', '08_dead_bug', '09_marche_laterale', '10_mollets', '11_suspension',
  '12_freeman', '13_etirement_hanche', '14_chat_vache', '15_pompes', '16_burpee_incline',
  '17_rowing_elastique', '18_pas_chasses', '19_planche_touches'].map(n => 'schemas/' + n + '.png');
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'].concat(SCHEMAS);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k.startsWith('seance-guidee-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const navigation = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const garde = navigation
      ? (await cache.match('./')) || (await cache.match('index.html'))
      : await cache.match(req, { ignoreSearch: true });
    const frais = fetch(req, { cache: 'no-cache' })
      .then(rep => {
        if (rep && rep.ok) cache.put(navigation ? './' : req, rep.clone());
        return rep;
      })
      .catch(() => null);
    if (garde) {
      e.waitUntil(frais);
      return garde;
    }
    return (await frais) || new Response('Séance guidée : pas de réseau et appli pas encore gardée sur ce téléphone. L\'ouvrir une fois avec du réseau.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
