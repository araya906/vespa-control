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

- [ ] **Server: on-site photo + message** (server change authorised by this item; the owner deploys).
  New migration `server/migrations/0001_media.sql`: table `report_media` (report id, JPEG ≤ 200 KB, message ≤ 280 chars).
  `POST /reports` accepts optional `photo` (JPEG data URL, ≤ 1280 px, ≤ 200 KB) and `message`; raise the size limit only as needed.
  Until the owner decides otherwise, photos and messages are **not** published: `GET /reports` and the CSV only add `has_photo`, `has_message`
  (and later `ai_species`, `ai_confidence`). `GET /` returns `version` and `features` so the app can detect support.
  Final report must give the owner the exact commands (`npx wrangler d1 execute vespa-control --remote --file=migrations/0001_media.sql`, `npx wrangler deploy`).
- [ ] **App: on-site photo + message** (only after `GET /` lists the `photo` feature; detect it at runtime and hide the UI otherwise).
  Photos only from an in-app live camera: `getUserMedia({ video: { facingMode: "environment" } })` started on an explicit tap,
  frame drawn to a canvas and saved as JPEG (no metadata by construction, ≤ 1280 px, ≤ 200 KB), camera track stopped right after.
  No `<input type="file">`, no gallery, no paste or drag-and-drop of images. Message field (≤ 280 chars) with a warning not to include
  names, phone numbers, addresses or people's faces. Photo/message kept only in the outbox until uploaded.
  Update the consent text and `PRIVACY.md`, bump `CONSENT_VERSION`. Replace `chk_no_file_capture` with the stricter `chk_camera_only`
  (no file inputs; `getUserMedia` only inside a tap handler; tracks stopped after capture).
- [ ] **Reliability in low-density areas: weight reports with evidence.** A single report must not be undervalued when it has evidence.
  Weight per report: 1 base, +1 on-site photo, +0.5 message of 20+ characters, +1 when the AI check (next item) agrees with the species.
  Levels from the weighted sum of distinct nearby reports (same species, radius, window, 15-min dedupe): < 2 unconfirmed, ≥ 2 probable,
  ≥ minReports confirmed. So a lone report with photo + message is *probable*, and with AI agreement *confirmed*.
  Weights tunable in the technician profile; popup lists the reasons. Synthetic checks: lone photo report in an empty area = probable;
  three photo-less reports within 15 min still count once; AI agreement upgrades. Uses `has_photo`/`has_message`/`ai_*` from the server
  so every phone computes the same level.
- [ ] **AI photo check: design note first, then implement after the owner approves it.** Must stay free.
  Preferred: Cloudflare Workers AI on the Free plan (10,000 Neurons/day; over the limit requests fail, no charge): a vision-language model
  (e.g. Llama 3.2 11B Vision Instruct) answering a fixed structured question (velutina / orientalis / crabro / other insect / nest / not a hornet + confidence),
  or an image classifier. Alternative: small on-device model (open licence, adds MBs to the app).
  The note must cover: model and prompt, Neurons per photo vs. the daily budget with a hard daily cap in code (queue the rest for the next day),
  evaluation on openly licensed labelled images, failure handling. The AI never rejects or deletes a report; it only adds a suggestion and trust weight.
- [ ] Owner decision pending (do not implement until written here): are photos and messages published in the open dataset, or used only for verification (trust, AI, technicians)?
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

- Base map outside Spain: IGN covers Spain only; pick another free, no-key provider when the app is used in other countries.

- Bundle real photos locally (offline, no Wikimedia request): needs a one-time download from the owner's computer; this environment cannot reach Wikimedia.

- Android APK (Trusted Web Activity via Bubblewrap): needs the app hosted on HTTPS first and a signing key kept by the owner. Revisit when hosting is decided.
- Offline base-map tiles: privacy-neutral but heavy on storage; revisit after user feedback.
