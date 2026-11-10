# VespaControl

Mobile app (installable web app, Android first) to report, identify and help eradicate the Asian hornet
(*Vespa velutina*) and the oriental hornet (*Vespa orientalis*) in Spain.

- **Anybody**: report a hornet, a nest or an attack on hives with GPS, map or pasted coordinates; see your records on a map.
- **Guide**: what to do after a sting or an attack (112), with a hornet or a nest, how to tell the species apart, where nests usually are and when hornets are active.
- **Technicians and researchers** (technician profile): nest finding with bait stations (triangulation), technical guide, GeoJSON/CSV export and import.
- **Privacy first**: everything stays on the phone; no accounts or tracking. See [PRIVACY.md](PRIVACY.md).

Languages: Spanish (default), English. Catalan, Galician and Basque are on the [roadmap](ROADMAP.md).

## Run it

No build step. Serve the folder over HTTPS (GPS, offline mode and installation need a secure origin), for example any static host,
or locally with `python3 -m http.server 8000` and open `http://localhost:8000/`.
On Android: open the address in Chrome → ⋮ → *Install app*.

## Layout

- `index.html`, `css/app.css`: the app shell.
- `src/`: ES modules (`app.js` UI, `records.js`, `geo.js` nest triangulation, `store.js` on-device storage, `i18n.js` + `lang/*.js` texts, `regions.js`, `guide.js`, `media.js`).
- `img/`: icons and original SVG illustrations (regenerate with `python3 tools/art.py`).
- `vendor/leaflet/`: Leaflet 1.9.4 (BSD-2-Clause).
- `sw.js`, `manifest.webmanifest`: offline and installation.
- `nightly/`: brief, checks (`node nightly/check.mjs`) and push gate for the nightly improvement run.

## Disclaimer

Guidance only. In an emergency call 112. Nests must be removed by trained professionals.
