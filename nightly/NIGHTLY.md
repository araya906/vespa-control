# Nightly improvement run: brief

This file is the source of truth for unattended nightly runs on `araya906/vespa-control` (branch `main`).
The run takes ONE item per night from `ROADMAP.md`, implements it with the smallest change, checks it and pushes it.

## Product

VespaControl is a mobile-first web app (PWA, Android first) for Spain. It helps anybody report Asian hornets
(*Vespa velutina*) and oriental hornets (*Vespa orientalis*), identify them, know what to do when they find a hornet,
a nest or are stung, and helps technicians and researchers find and eradicate nests.

- Users: general public (default profile), beekeepers, council/regional technicians, researchers (technician profile).
- Languages, in priority order: **Spanish (source text, default)**, English, then Catalan, Galician, Basque (co-official), then Aranese.
- No build step: plain HTML + CSS + ES modules. Leaflet is vendored in `vendor/leaflet/`.

## Setup

1. Attach the repo (add_repo, owner `araya906`, repo `vespa-control`, access `push`), then clone it once with a generous timeout.
2. Node 18+ and Python 3 are enough. Playwright (`pip install --break-system-packages playwright && python3 -m playwright install --with-deps chromium`) is only needed for screenshots.
3. Set git `user.name`/`user.email` if unset. Export `VC_TRAILER` with the commit attribution lines this session's system reminders specify (newline-separated), or leave it empty if they specify none.
4. Preflight: `bash nightly/gate.sh --preflight`. If it fails, fixing it is the only job of the night.

## Each run

1. Read `ROADMAP.md`. Take the first unchecked item. Be critical: if an item is not useful for users, is unsafe, or a better approach exists, rewrite or park it in `ROADMAP.md` with a one-line reason and take the next one.
2. Implement it with the smallest change that works. Match the existing style.
3. Add or extend a check in `nightly/check.mjs` for what you changed (synthetic data only).
4. If the UI changed: serve with `python3 -m http.server 8000`, open `http://localhost:8000/` in Playwright Chromium with an Android viewport (412x915, deviceScaleFactor 2.625, isMobile, hasTouch, locale `es-ES`), take a screenshot of every tab you touched (and the guide sections), and look at them yourself. Fix overlaps, clipped text and anything unreadable at that width.
5. If any file listed in `sw.js` changed, or a file was added or removed, update the `SHELL` list and bump `VERSION`.
6. Update `CHANGELOG.md` (newest first) and tick the item in `ROADMAP.md`.
7. Finish with `bash nightly/gate.sh "<one-line summary>"`. Then confirm `git ls-remote --heads origin main` matches local HEAD; if not, `git pull --no-rebase origin main` and `git push origin HEAD:main` once more; if it still fails, report the error.

## Hard rules

**Privacy (mandatory, never weaken):**
- No accounts, no analytics, no telemetry, no ads, no cookies, no fingerprinting, no third-party scripts, fonts or CDNs.
- Reports are uploaded automatically to the open-data server **only after the first-use consent** (`chk_consent_gate`). Nothing is uploaded without it. If the consent text changes in substance (new fields, new recipients), bump `CONSENT_VERSION` in `src/app.js` so everybody is asked again, and update `PRIVACY.md`.
- Nothing about reports is kept on the phone once sent: the IndexedDB "records" store is only an outbox for unsent reports (`chk_outbox_only`). Settings may stay in localStorage.
- Device APIs only on an explicit tap and only once: location (`getCurrentPosition`, never `watchPosition`) and compass. Photos only from the in-app live camera on an explicit tap, never from files, gallery, paste or drag-and-drop. Until the on-site photo roadmap item is done, `chk_no_file_capture` forbids any capture; that item may only replace it with the stricter `chk_camera_only`. Never read contacts, device identifiers, battery, sensors in the background, clipboard without a tap, or other apps' data.
- Any request to a third-party host must be opt-in (button + clear text saying who receives what), use `referrerpolicy="no-referrer"`, and the host must be added to the CSP in `index.html` and to `PRIVACY.md`. The only allowed `connect-src` hosts are `https://commons.wikimedia.org` (opt-in photo titles only) and the open-data API origin in `src/config.js`; never add others. The open-data payload is exactly `publicPayload()` in `src/community.js` (`chk_share_minimal`): never add fields that could identify a person (notes, photos, exact location, exact time, device data).
- Uploaded locations stay rounded to ~100 m and times to the hour.

**Safety content:**
- Never tell the public to remove, burn, spray or block a nest. Removal is for trained professionals.
- First-aid and emergency content must stay consistent with official Spanish sources (112, Ministerio de Sanidad, regional health services). Cite sources in the Guide's source list when you add or change such content. No medicine doses.
- Official contacts (phone numbers, URLs, apps) must be verified on an official site (`.gob.es`, `.gal`, `.eus`, `.cat`, regional government domains) during the run; record the URL and the date checked next to the data. If you cannot verify it, do not add it.

**Languages:**
- `src/lang/es.js` is the source. Every other language file must have the same keys, array lengths and `{placeholders}` (`chk_i18n_parity_*`).
- A new language is registered in `LANGS` only when complete. Mark machine-assisted translations in `README.md` as "pending native-speaker review".

**Images:**
- Illustrations: original drawings (SVG, `tools/art.py` or hand-written), stored locally.
- Real photos: Wikimedia Commons files listed in `PHOTOS` (`src/media.js`), requested only after opt-in; credits come from the Commons API, never typed by hand. Add files only when the species/nest is clearly identified on the file page. Never copyrighted photos from other sites.

**AI:**
- Any AI (photo checks) must stay within a free allocation with a hard daily cap in code; never enable anything that can bill. The AI never rejects or deletes reports, it only suggests.

**Open-data server (`server/`):**
- Must stay on Cloudflare's Free plan forever: no paid features, no bindings or products that require a payment method.
- The nightly run cannot deploy it. Change `server/` only when a ROADMAP item says so; then say in the final report that the owner must run `cd server && npx wrangler deploy`, and keep the app working with the currently deployed server (backwards compatible).
- Schema changes only as new `server/migrations/NNNN_*.sql` files, never destructive.

**Code and repo:**
- Functions under 50 lines (`chk_functions_under_50_lines`). No new dependencies or build tools without a ROADMAP decision.
- Synthetic data only; never read or reference real or local user data.
- Never force-push or rewrite history; never weaken an existing check.
- No GitHub Actions, LFS, Codespaces or any paid service.

## Final report

Send the user (SendUserMessage, English, 3-6 lines): roadmap item done (or parked/rewritten, with reason), PASS or FAIL/rollback with failed checks, what to look at on the phone, and the pushed commit hash.
Send a push notification only if the run ended in FAIL, rollback, PREFLIGHT_FAIL, an unreachable repo or a push error.
