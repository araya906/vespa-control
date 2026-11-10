# Roadmap

Nightly runs take the first unchecked item. Order = priority. See `nightly/NIGHTLY.md`.

## Done

- [x] Mobile PWA base: modules, manifest, service worker, Android icons (2026-11-10)
- [x] Privacy hardening: strict CSP, opt-in base map and photos, metadata-free photos, delete-all (2026-11-10)
- [x] Guide: emergency/112, what to do with a hornet or a nest, where nests are, calendar, beekeepers, technicians (2026-11-10)
- [x] Original SVG illustrations of the three hornets and four nest types (2026-11-10)
- [x] Public / technician profiles (2026-11-10)
- [x] Real photos of hornets and nests from Wikimedia Commons, opt-in, credits from the API (2026-11-10)
- [x] Reliability filter by nearby reports of the same species (2026-11-10)
- [x] Open-data sharing: app side and Cloudflare Worker (2026-11-10). Goes live once the owner deploys `server/` and `API_BASE` is set.

## Next

- [ ] Waiting for the owner's decision (do not start): which extra fields join the open dataset (photo, notes, nest place, height, exact location for authorities).
- [ ] Technician nest updates on the server: mark a nest as reported/treated/removed without accounts (design note first: how to avoid vandalism, e.g. a technician code issued by the owner).
- [ ] Map: let technicians filter community reports by date range; refresh button with last-updated time.

- [ ] Catalan (`ca`): full translation of `src/lang/es.js` into `src/lang/ca.js`, register in `LANGS`, note "pending native-speaker review" in README.
- [ ] Galician (`gl`): same as above.
- [ ] Basque (`eu`): same as above.
- [ ] Regional directory: split `REGIONS.ES` into the 17 autonomous communities plus Ceuta and Melilla, each with the official way to report a nest (phone, app or web), verified on an official site with the URL and date checked. Region picker sorted by name; default stays Spain.
- [ ] Share a report without a server: Web Share API (fallback: copy text) with species, type, date and a map link; user chooses exact or ~100 m location; no photo by default.
- [ ] "Where to look" scene illustration (house eaves, shed, hedge, tall tree, ground hole) with numbered hotspots linked to the guide text.
- [ ] Interactive ID key: 4-6 yes/no questions (abdomen colour, leg tips, face colour, size, nest place) that end in a species suggestion and link to the species card.
- [ ] Trap log for technicians: trap id, location, bait, set/check dates, catches by species (velutina queens/workers, bycatch count); per-trap summary and CSV.
- [ ] Nest workflow for technicians: reported → assigned → treated → removed, with date, method and notes; export filtered by status.
- [ ] Trap planning helper: seasonal calendar (spring queens vs. summer-autumn apiary protection) and placement tips from official guidance; selective traps only.
- [ ] Monthly summary and simple density view of the user's own records (no external data).
- [ ] Accessibility pass: contrast, focus order, screen-reader labels on icon buttons, large-text check at 200% zoom.
- [ ] Health sources: verify and cite official first-aid sources for stings (Ministerio de Sanidad / regional health services) in the Guide; adjust wording if they differ.
- [ ] Aranese (`oc`) translation.
- [ ] Researcher view: import several GeoJSON exports, merge, and show a simple spread summary (first/last record per area and month). Spread model only after a design note in this file.

## Parked

- Bundle real photos locally (offline, no Wikimedia request): needs a one-time download from the owner's computer; this environment cannot reach Wikimedia.

- Android APK (Trusted Web Activity via Bubblewrap): needs the app hosted on HTTPS first and a signing key kept by the owner. Revisit when hosting is decided.
- Offline base-map tiles: privacy-neutral but heavy on storage; revisit after user feedback.
