# Changelog

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
