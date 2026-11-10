# Privacy

VespaControl collects the minimum needed to record a hornet or nest, and keeps it on your phone.

## What the app stores, and where

| Data | When | Where |
|---|---|---|
| Records (type, species, location, count, nest details, notes, photo) | When you tap Save | On this device only (IndexedDB) |
| Bait stations (location, directions, times) | Technician profile, when you add them | On this device only |
| Settings (language, region, profile, opt-ins) | When you change them | On this device only (localStorage) |

There are no accounts, no servers, no analytics, no ads and no cookies. "Delete all my data" in the Data tab erases everything.

## Device permissions

- **Location**: read once, only when you tap "Use my location". Never tracked in the background.
- **Camera / photos**: only when you choose a photo. The photo is re-encoded on the device, which removes its metadata (GPS position, phone model, date).
- **Compass**: read once, only when you tap "Use phone compass" (technician profile).

## Network requests

- The app's own files, from the address you installed it from.
- **Only if you tap "Load base map"**: map tiles from CARTO (`*.basemaps.cartocdn.com`, OpenStreetMap data) and Esri (`server.arcgisonline.com`). Those servers see your IP address and the area you view.
- **Only if you tap "Show real photos"**: reference photos from Wikimedia Commons (`commons.wikimedia.org`, `upload.wikimedia.org`). Wikimedia sees your IP address.
- Links to official sites (BOE, MITECO, licences) open only when you tap them.

These are the only external hosts allowed by the app's Content-Security-Policy. The app cannot send your records anywhere: `connect-src` is limited to the app's own origin.

## Sharing

Nothing leaves the phone unless you export or share it. "Export for sharing" rounds locations to about 100 m and drops photos.
