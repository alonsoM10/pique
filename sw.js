// sw.js — caché para que la app abra sin conexión.
// Sube CACHE cada vez que cambies archivos y el móvil recogerá la versión nueva.

const CACHE = 'pique-v2';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/ui.js',
  './js/onboarding.js',
  './js/view-hoy.js',
  './js/view-entreno.js',
  './js/view-comida.js',
  './js/view-progreso.js',
  './js/view-pique.js',
  './js/view-ayuda.js',
  './js/exportar.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // Ojo: NO llamamos skipWaiting aquí a propósito. El worker nuevo queda "esperando"
  // hasta que la app muestre el banner y el usuario toque "Actualizar" (mensaje de abajo).
  e.waitUntil(
    caches.open(CACHE)
      // addAll falla entero si un archivo falta; así toleramos ausencias
      .then(c => Promise.allSettled(ARCHIVOS.map(f => c.add(f))))
  );
});

// La app pide activar la versión nueva cuando el usuario toca el banner.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Peticiones a las APIs externas: siempre a la red, nunca de caché.
  if (url.origin !== location.origin) return;

  // Navegación: red primero para recoger cambios, caché si no hay internet.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Estáticos: caché primero, y refrescamos por detrás.
  e.respondWith(
    caches.match(req).then(hit => {
      const red = fetch(req)
        .then(r => {
          if (r && r.status === 200) caches.open(CACHE).then(c => c.put(req, r.clone()));
          return r;
        })
        .catch(() => hit);
      return hit || red;
    })
  );
});
