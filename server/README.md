# VespaControl open-data API

A tiny Cloudflare Worker + D1 database that receives **opt-in, anonymous, rounded** reports and serves them to everybody
as open data (CC BY 4.0).

## Always free

- Runs on the Cloudflare **Free** plan (Workers Free + D1 Free). No payment method is needed. **Never add one, and never upgrade to Workers Paid.**
- On the Free plan, going over the daily limits makes requests fail until the next day (UTC). It never charges.
  The app handles that: unsent reports stay "pending" and are retried later.
- Free limits (check the Cloudflare docs, they can change): about 100,000 requests/day, D1 5 GB storage, 5 million rows read and 100,000 rows written per day.

## What is stored

`reports`: random id, observation time rounded to the hour, reception time rounded to the hour, type, species (velutina, orientalis, crabro),
latitude/longitude rounded to 3 decimals (~100 m), count, nest status, and a SHA-256 hash of the reporter's private delete token.
No IP addresses, notes, photos, accounts or device data.

`rate`: a salted hash of (day, IP) with a counter, used to cap each connection at 30 reports per day. Rows from previous days are deleted on every write.

## Endpoints

- `GET /reports`: all shared reports from the last 2 years as GeoJSON (open to everybody, cached 5 min)
- `GET /reports.csv`: the same as CSV
- `POST /reports`: add a report (only from the app's origin)
- `DELETE /reports/:id` with header `X-Delete-Token`: withdraw your own report

## Deploy (one time, ~10 minutes)

You need a free Cloudflare account (https://dash.cloudflare.com/sign-up) and Node.js LTS.

```bash
git clone https://github.com/araya906/vespa-control.git
cd vespa-control/server
npx wrangler login
npx wrangler d1 create vespa-control
```

Copy the `database_id` it prints into `wrangler.toml` (replace `REPLACE_WITH_DATABASE_ID`), then:

```bash
npx wrangler d1 execute vespa-control --remote --file=schema.sql
npx wrangler secret put RATE_SALT
npx wrangler deploy
```

For `RATE_SALT`, paste any long random text (for example the output of `python -c "import secrets; print(secrets.token_hex(32))"`).
`wrangler deploy` prints the address, like `https://vespa-control-api.<your-subdomain>.workers.dev`.
Then in the app repo set it in `src/config.js` (`API_BASE`) and add the same origin to `connect-src` in `index.html`.

To update the server later: `cd server && npx wrangler deploy`.
