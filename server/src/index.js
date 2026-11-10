// VespaControl open-data API (Cloudflare Workers Free plan + D1).
// Stores only minimal, rounded, anonymous report fields. No IPs, no accounts, no cookies.
// Routes: GET /  ·  GET /reports (GeoJSON)  ·  GET /reports.csv  ·  POST /reports  ·  DELETE /reports/:id

export const TYPES = ["sighting", "nest", "apiary_attack", "trap_catch"];
export const SPECIES = ["velutina", "orientalis", "crabro"];
export const NEST_STATUS = ["active", "reported", "destroyed", "inactive"];
const DAILY_LIMIT = 30;
const MAX_AGE_DAYS = 730;
const LICENSE = { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/", attribution: "VespaControl contributors" };

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const hourIso = (ms) => new Date(Math.floor(ms / 36e5) * 36e5).toISOString().slice(0, 13) + ":00:00Z";

// Validate and minimise a submitted report. Returns null if anything is off.
export function clean(b, now = Date.now()) {
  if (!b || typeof b !== "object") return null;
  const t = Date.parse(b.created);
  const lat = Number(b.lat), lon = Number(b.lon);
  const ok = typeof b.id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(b.id)
    && typeof b.token === "string" && /^[A-Za-z0-9]{24,64}$/.test(b.token)
    && TYPES.includes(b.type) && SPECIES.includes(b.species)
    && Number.isFinite(t) && t <= now + 36e5 && t >= now - MAX_AGE_DAYS * 864e5
    && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  if (!ok) return null;
  const count = b.count === null || b.count === undefined ? null : Number(b.count);
  if (count !== null && !(Number.isInteger(count) && count >= 0 && count <= 10000)) return null;
  const nest = b.type === "nest" ? (NEST_STATUS.includes(b.nest_status) ? b.nest_status : "active") : null;
  return { id: b.id, created: hourIso(t), type: b.type, species: b.species, lat: round(lat, 3), lon: round(lon, 3), count, nest_status: nest };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function cors(env, req, write) {
  const origin = req.headers.get("Origin") || "";
  const allow = write ? (origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN) : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Delete-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

const json = (data, status, headers) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
});

// One salted hash per IP per day, deleted the next day. Never the IP itself.
async function underLimit(env, req) {
  const day = new Date().toISOString().slice(0, 10);
  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const key = await sha256(`${env.RATE_SALT || ""}|${day}|${ip}`);
  await env.DB.prepare("DELETE FROM rate WHERE day < ?").bind(day).run();
  const row = await env.DB.prepare("INSERT INTO rate (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k, day) DO UPDATE SET n = n + 1 RETURNING n")
    .bind(key, day).first();
  return (row?.n || 1) <= DAILY_LIMIT;
}

async function postReport(env, req, h) {
  if (Number(req.headers.get("Content-Length") || 0) > 2000) return json({ error: "too large" }, 413, h);
  if (req.headers.get("Origin") !== env.ALLOWED_ORIGIN) return json({ error: "origin" }, 403, h);
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400, h); }
  const r = clean(body);
  if (!r) return json({ error: "invalid report" }, 400, h);
  if (!(await underLimit(env, req))) return json({ error: "daily limit reached" }, 429, h);
  await env.DB.prepare(`INSERT OR IGNORE INTO reports (id, created, received, type, species, lat, lon, count, nest_status, del_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(r.id, r.created, hourIso(Date.now()), r.type, r.species, r.lat, r.lon, r.count, r.nest_status, await sha256(body.token)).run();
  return json({ ok: true, id: r.id }, 201, h);
}

async function deleteReport(env, req, id, h) {
  const token = req.headers.get("X-Delete-Token") || "";
  if (!/^[A-Za-z0-9]{24,64}$/.test(token)) return json({ error: "token" }, 400, h);
  const res = await env.DB.prepare("DELETE FROM reports WHERE id = ? AND del_hash = ?").bind(id, await sha256(token)).run();
  return json({ ok: true, deleted: res.meta?.changes || 0 }, 200, h);
}

async function listReports(env) {
  const since = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString();
  const { results } = await env.DB.prepare(
    "SELECT id, created, type, species, lat, lon, count, nest_status FROM reports WHERE created >= ? ORDER BY created DESC LIMIT 20000"
  ).bind(since).all();
  return results || [];
}

function toGeoJSON(rows) {
  return {
    type: "FeatureCollection", license: LICENSE, generated: new Date().toISOString(),
    features: rows.map(({ lat, lon, ...p }) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: p }))
  };
}

function toCSV(rows) {
  const cols = ["id", "created", "type", "species", "lat", "lon", "count", "nest_status"];
  return [cols.join(","), ...rows.map((r) => cols.map((c) => r[c] ?? "").join(","))].join("\r\n") + "\r\n";
}

async function route(req, env) {
  const url = new URL(req.url);
  const write = req.method === "POST" || req.method === "DELETE";
  const h = cors(env, req, write || req.method === "OPTIONS");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method === "POST" && url.pathname === "/reports") return postReport(env, req, h);
  const del = url.pathname.match(/^\/reports\/([A-Za-z0-9-]{8,64})$/);
  if (req.method === "DELETE" && del) return deleteReport(env, req, del[1], h);
  if (req.method !== "GET") return json({ error: "method" }, 405, h);
  const pub = { ...h, "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" };
  if (url.pathname === "/reports") return new Response(JSON.stringify(toGeoJSON(await listReports(env))), { headers: { ...pub, "Content-Type": "application/geo+json; charset=utf-8" } });
  if (url.pathname === "/reports.csv") return new Response(toCSV(await listReports(env)), { headers: { ...pub, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=vespa-control-open-data.csv" } });
  if (url.pathname === "/") return json({ name: "VespaControl open data", license: LICENSE, endpoints: ["/reports", "/reports.csv"] }, 200, pub);
  return json({ error: "not found" }, 404, h);
}

export default {
  async fetch(req, env) {
    try {
      return await route(req, env);
    } catch {
      return json({ error: "server error" }, 500, { "Access-Control-Allow-Origin": "*" });
    }
  }
};
