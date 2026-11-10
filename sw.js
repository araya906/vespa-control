// Offline app shell. Only same-origin files are cached; third-party requests
// (opt-in map tiles, opt-in Wikimedia photos) pass straight through and are never stored.
// Bump VERSION whenever a file in SHELL changes.
const VERSION = "vc-2026-11-10-4";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "vendor/leaflet/leaflet.css",
  "vendor/leaflet/leaflet.js",
  "src/app.js",
  "src/i18n.js",
  "src/lang/es.js",
  "src/lang/en.js",
  "src/regions.js",
  "src/records.js",
  "src/media.js",
  "src/geo.js",
  "src/store.js",
  "src/guide.js",
  "src/config.js",
  "src/community.js",
  "img/icon.svg",
  "img/icon-192.png",
  "img/icon-512.png",
  "img/icon-maskable-512.png",
  "img/species/velutina.svg",
  "img/species/orientalis.svg",
  "img/species/crabro.svg",
  "img/nests/velutina-primary.svg",
  "img/nests/velutina-secondary.svg",
  "img/nests/orientalis-cavity.svg",
  "img/nests/crabro-hollow.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
