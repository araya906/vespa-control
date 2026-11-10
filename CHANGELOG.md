# Changelog

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
