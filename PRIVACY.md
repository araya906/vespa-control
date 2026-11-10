# Privacy

VespaControl builds an **open public map** of Asian and oriental hornets. Reports are uploaded automatically and are public;
nothing about the reports is kept on the phone once they are sent. On first use the app asks for explicit consent
(Spanish first, also in English). Without consent, nothing is sent: the guide, the map and nest finding still work.

## What is sent, and where

When you save a report, the app sends to the VespaControl open-data server
(a Cloudflare Worker at `https://vespa-control-api.vespacontrol.workers.dev`, database in Western Europe), and only:

| Field | Detail |
|---|---|
| id | random, generated for the report (not linked to you or your phone) |
| type | sighting, nest, attack on hives, trap catch |
| species | Asian hornet, oriental hornet, European hornet, not sure |
| count, nest status | as entered |
| time | rounded to the hour |
| location | rounded to 3 decimals (~100 m) |

Never sent: name, account, contacts, photos, notes, device data, exact location or exact time.

Reports are **public open data (CC BY 4.0)**: anybody can see and download them. Once sent, they cannot be withdrawn from the app.
A location, even rounded, can point to a home or a property.

The server does not store IP addresses. To stop abuse it keeps a salted hash of (day, IP) with a counter, deleted the next day.

## What stays on the phone

- **Unsent reports only**, while there is no connection. They are deleted from the phone as soon as they are uploaded.
- Settings: language, region, profile, reliability filter values, opt-ins and your consent answer.
- Nothing else: bait stations (technician profile) live only in memory during the session.

"Delete settings and pending reports from this device" (Data tab) erases all of it and asks for consent again.

## Device permissions

- **Location**: read once, only when you tap "Use my location". Never tracked in the background.
- **Compass**: read once, only when you tap "Use phone compass" (technician profile).
- No camera, contacts, files or other sensors.

## Other network requests

- The app's own files, from the address you installed it from.
- The open-data server: uploads (above) and downloading everybody's reports for the map (your IP is seen, not stored).
- **Only if you tap "Load base map"**: map and aerial-photo tiles from Spain's National Geographic Institute (`www.ign.es`, CC BY 4.0 scne.es). That server sees your IP address and the area you view.
- Reference photos (from Wikimedia Commons, with their credits) are bundled in the app: viewing them contacts no one.
- Links to official sites open only when you tap them.

These are the only external hosts allowed by the app's Content-Security-Policy.
