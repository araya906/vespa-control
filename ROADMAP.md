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
- [x] **"This report does not reach the authorities" message (do first, small).** After every saved report, and in the send note,
  say clearly that VespaControl does not notify the authorities and that the user must also use the official channel of their area,
  with a button to the regional directory (next item). Nest reports and attacks show it prominently. Spanish and English. Done 2026-11-12; the button opens the region card in Datos until the regional directory exists.
- [x] **Basque (`eu`) translation** (2026-11-14): `src/lang/eu.js`, pending native-speaker review. *Liztor asiarra* from bizkaia.eus;
  *V. orientalis* keeps the scientific name (no official Basque name found). Region texts translated too (`chk_i18n_regions`).

## Next

- [ ] **Regional directory with automatic "who to warn" by location.** Owner priority (2026-11-10). **Start with the Basque Country**
  (Araba, Bizkaia, Gipuzkoa, each with its Diputación Foral programme and fire services), then the rest.
  Already found on an official source (re-verify during the run, then use): Araba — Diputación Foral de Álava document "Vespa velutina Araban 2012-2024"
  (https://web.araba.eus/documents/d/araba/vespa-velutina-araban_2012_2024-web-pdf): Vitoria-Gasteiz urban or urgent cases, Bomberos de Vitoria-Gasteiz;
  rest of Álava, CECO Miñones; SOS Deiak 112 as alternative (take the phone numbers from that document). Bizkaia: protocol page on bizkaia.eus
  ("Protocolo de actuación frente a la Avispa Asiática"); Gipuzkoa: find the Diputación's official page.
  - Data: for each of the 17 autonomous communities, Ceuta and Melilla, and the provinces where the programme is provincial
    (e.g. the three Basque Diputaciones), the official way to report a nest or a sighting: phone (e.g. 012), official app (e.g. avisAP in Asturias),
    web form or email, and whether it covers V. velutina, V. orientalis or both. Each entry verified on an official site during the run,
    with the URL and the date checked stored next to it; unverified entries are left out (fallback: town hall, 112 only if immediate danger).
    Large regions may take several nights: keep a list of done/pending regions in this file.
  - Lookup on the phone, offline: bundle simplified province boundaries (≤ 300 KB, from IGN/CNIG open data, e.g. via the npm package `es-atlas`;
    check and record the licence and attribution) and find the province of the report's location with a point-in-polygon test.
    No network request, nothing sent anywhere. Fall back to the region picker when the point is outside Spain or the lookup fails.
  - After saving (and in the guide's "If you find a nest"), show "Avisa también a: <organismo>" with one-tap actions that the user performs:
    call (`tel:`), open the official app or web, or a pre-filled email/message (`mailto:` / Web Share) with species, type, date and a map link.
    The app never sends anything to the authority by itself.
  - Region picker in Datos sorted by name; default from the last lookup, otherwise Spain.
- [ ] **Official nests layer for Bizkaia (research first).** Open Data Euskadi publishes a dataset "Avispa asiática en Bizkaia". Check its licence,
  fields and update frequency; if the licence allows it, show it as a separate, clearly labelled "official data" layer (bundled at build time
  by an owner-run script like `tools/fetch_photos.mjs`, so the app makes no extra request), and use it to avoid duplicate reports of nests already handled.
- [ ] **Open feed for authorities (server item, owner deploys).** `GET /reports?bbox=` and `?province=` filters, and an Atom/RSS feed per province,
  so councils and regional services can follow new reports without accounts. Document it in `server/README.md`.
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
- Owner decision (2026-11-10): photos and messages are **never published** in the open dataset. They are stored only for verification (reliability weighting, AI check, technicians). The public dataset may only show `has_photo`, `has_message` and the AI result.
- [ ] Technician nest updates on the server: mark a nest as reported/treated/removed without accounts (design note first: how to avoid vandalism, e.g. a technician code issued by the owner).
- [ ] Map: let technicians filter community reports by date range; refresh button with last-updated time.

- [ ] Catalan (`ca`): full translation of `src/lang/es.js` into `src/lang/ca.js`, register in `LANGS`, note "pending native-speaker review" in README.
- [ ] Galician (`gl`): same as above.
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

- Automatic warnings sent by the server to authorities (checked 2026-11-10, not pursued for now): sending email from the Worker for free
  needs either a third-party mail service or Cloudflare Email Routing with a domain you own (paid); authorities mostly accept reports only
  through their own channels (012, avisAP, web forms) and would receive unverified automated messages as spam; forwarding user data to a third
  party needs its own consent. Instead: one-tap contact performed by the user, and an open feed authorities can follow. Revisit only with an
  authority that asks for a direct integration and offers an endpoint for it.

- Advertising (checked 2026-11-10, not pursued): ad networks need a paid custom domain (AdSense does not approve `*.github.io`), a certified cookie-consent platform in the EU, and third-party tracking scripts, which break the privacy promise and the CSP; GitHub Pages may not be used to run an online business; ads next to emergency/first-aid content would hurt trust with authorities and beekeepers; expected revenue for a niche app is very low. Funding routes that fit instead: public grants (e.g. FECYT citizen-science line with a research partner and a beekeeper/civil-society partner), regional invasive-species programmes, institutional sponsorship shown as a plain logo without tracking, and donations.

- Base map outside Spain: IGN covers Spain only; pick another free, no-key provider when the app is used in other countries.

- Bundle real photos locally (offline, no Wikimedia request): needs a one-time download from the owner's computer; this environment cannot reach Wikimedia.

- Android APK (Trusted Web Activity via Bubblewrap): needs the app hosted on HTTPS first and a signing key kept by the owner. Revisit when hosting is decided.
- Offline base-map tiles: privacy-neutral but heavy on storage; revisit after user feedback.
