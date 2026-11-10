# Changelog

## 2026-11-10 (10)

- Licence: code under GNU AGPL-3.0-or-later (`LICENSE`); illustrations, guide texts and the open dataset under CC BY 4.0.
  `NOTICE.md` lists third-party material and the commercial-licence option; `CONTRIBUTING.md` explains the contributor terms.

## 2026-11-10 (9)

- Reference photos are now bundled in the app (work offline, no request to Wikimedia when viewing, no opt-in button).
  `tools/fetch_photos.mjs` downloads them once from Wikimedia Commons with author and licence from the API and updates
  `src/photos.js` and the offline list in `sw.js`. CSP no longer allows Wikimedia.

## 2026-11-10 (8)

- Base map: CARTO now requires an API key, so the map and aerial photo come from Spain's IGN/CNIG (IGN Base and PNOA orthophoto,
  free, CC BY 4.0 scne.es, no key). CSP and privacy texts updated; Esri removed. Coverage is Spain-focused.

## 2026-11-10 (7)

- Fix: app could open frozen with no text after an update (new page with old cached code). The service worker is now
  network-first with an offline fallback, precaches bypassing the HTTP cache, and the page reloads once when a new version takes over.

## 2026-11-10 (6)

- Reports are no longer stored on the phone: they upload automatically to the open map. Unsent reports wait in an outbox
  only until they are uploaded (retried when the connection returns or the app is reopened), then are deleted from the phone.
- First-use consent sheet (es/en, language selector) explaining what is sent, that it is public (CC BY 4.0) and cannot be withdrawn,
  that a rounded location can still point to a home, and a note for under-14s. Declining keeps the guide, map and nest finding.
- Removed: photo, notes, nest place and height from the form (not part of the open dataset yet); export/import of own records;
  withdrawal of shared reports; nest-status editing. Bait stations live in memory only.
- Server: accepts "not sure" species; no withdrawal tokens or DELETE route. Needs `npx wrangler deploy`.

## 2026-11-10 (5)

- Open-data server deployed at https://vespa-control-api.vespacontrol.workers.dev (Cloudflare Free plan, D1 in Western Europe); community features switched on.

## 2026-11-10 (4)

- Open data: opt-in "share on the public map" per report (minimal, rounded, withdrawable), community reports layer (opt-in),
  open dataset download (GeoJSON/CSV, CC BY 4.0). Reliability filter now uses own + community reports.
- `server/`: Cloudflare Worker + D1 (Free plan) with validation, rounding, abuse limit without storing IPs, withdrawal by private key.
  Hidden in the app until `API_BASE` is set in `src/config.js` after deployment.

## 2026-11-10 (3)

- Reliability filter: each report is *sin confirmar*, *probable* or *confirmado* depending on how many reports of the same
  species are within R m and D days (defaults 3 reports, 500 m, 90 days; reports under 15 min apart count once).
  Faded/dashed markers, map filter by reliability, reliability in popups and summary; technicians can tune X, R and D.
- Guide: "¿Qué avispa es?" moved right after the emergency card and open by default, so the hornet pictures are visible at once.

## 2026-11-10 (2)

- Real photos of the three hornets and of their nests (Wikimedia Commons), shown next to the illustrations after one opt-in tap;
  author and licence come from the Commons API for each file. CSP `connect-src` allows only `commons.wikimedia.org` for this.
- `.nojekyll` for GitHub Pages.

## 2026-11-10

- Split the single-file app into plain ES modules (`src/`), vendored Leaflet, `css/app.css`.
- PWA for Android: `manifest.webmanifest`, offline service worker (`sw.js`), 192/512 and maskable icons.
- Privacy: strict Content-Security-Policy; base map tiles and Wikimedia photos load only after a tap (with a clear notice);
  `no-referrer` everywhere; photos re-encoded on device to strip metadata; "delete all my data" button.
- New Guide tab: emergency card with a 112 call button and warning signs, what to do after a sting or an attack,
  what to do with a hornet or a nest, where nests usually are (with illustrations and an activity calendar), beekeepers, technicians.
- Original SVG illustrations of *V. velutina*, *V. orientalis*, *V. crabro* and four nest types (`tools/art.py`).
- Public / technician profiles: the nest-finding tab and technical guide appear in the technician profile.
- Spanish is the default language; English complete.
- Nightly infrastructure: `nightly/NIGHTLY.md`, `nightly/check.mjs`, `nightly/gate.sh`, `ROADMAP.md`.
