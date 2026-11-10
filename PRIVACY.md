# Privacy

VespaControl collects the minimum needed to record a hornet or nest, and keeps it on your phone.

## What the app stores, and where

| Data | When | Where |
|---|---|---|
| Records (type, species, location, count, nest details, notes, photo) | When you tap Save | On this device only (IndexedDB) |
| Bait stations (location, directions, times) | Technician profile, when you add them | On this device only |
| Settings (language, region, profile, opt-ins) | When you change them | On this device only (localStorage) |

There are no accounts, no analytics, no ads and no cookies. "Delete all my data" in the Data tab erases everything.

## Device permissions

- **Location**: read once, only when you tap "Use my location". Never tracked in the background.
- **Camera / photos**: only when you choose a photo. The photo is re-encoded on the device, which removes its metadata (GPS position, phone model, date).
- **Compass**: read once, only when you tap "Use phone compass" (technician profile).

## Network requests

- The app's own files, from the address you installed it from.
- **Only if you tap "Load base map"**: map tiles from CARTO (`*.basemaps.cartocdn.com`, OpenStreetMap data) and Esri (`server.arcgisonline.com`). Those servers see your IP address and the area you view.
- **Only if you tap "Show real photos"**: the app asks the Wikimedia Commons API (`commons.wikimedia.org`) for a fixed list of reference photos and their author/licence, then loads the images (`upload.wikimedia.org`). Wikimedia sees your IP address; nothing about you or your records is sent.
- Links to official sites (BOE, MITECO, licences) open only when you tap them.

These are the only external hosts allowed by the app's Content-Security-Policy. The app cannot send your records anywhere: `connect-src` allows only the app's own origin, the Commons photo API (photo titles only) and the VespaControl open-data server (only what is listed above).

## Sharing on the public map (optional)

Only if you tick "Share this report on the open public map" (or tap "Share" on a saved report), the app sends to the
VespaControl open-data server (a Cloudflare Worker at `https://vespa-control-api.vespacontrol.workers.dev`): a random report id, species, type, observation time rounded to the hour,
count, nest status and the location rounded to about 100 m, plus a private random key that lets only your phone withdraw it.
Never the photo, notes, device data or any identifier. Reports with an unsure species are never shared.

The server does not store IP addresses. To stop abuse it keeps a salted hash of (day, IP) with a counter, deleted the next day.
Shared reports are public open data (CC BY 4.0) that anybody can download. You can withdraw a report at any time with
"Stop sharing" (deleting a shared report also withdraws it).

**Only if you tap "Load community reports"**: the app downloads the shared reports; the server sees your IP address and nothing else.

## Exports

"Export for sharing" rounds locations to about 100 m and drops photos. Exports never include the private withdrawal key.
