// Garde l'appli disponible sans réseau. Les cours sont cherchés sur le réseau d'abord.
const CACHE = "sm-v1";
const FICHIERS = ["./", "index.html", "styles.css", "app.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "data/quotes.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const reseauDabord = url.pathname.endsWith("quotes.json") || e.request.mode === "navigate";
  if (reseauDabord) {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copie = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie));
        return r;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
    );
  } else {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});
