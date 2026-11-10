// Static and synthetic-data checks. No network, no real data, no dependencies.
// Usage: node nightly/check.mjs   (exit code 1 on any failure)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const fails = [];
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}\t${name}${detail ? "\t" + detail : ""}`);
  if (!ok) fails.push(name);
};
const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
  const p = join(dir, f);
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
});
const load = (p) => import(pathToFileURL(join(ROOT, p)).href);

async function chkI18n() {
  const langs = readdirSync(join(ROOT, "src/lang")).filter((f) => f.endsWith(".js"));
  const es = (await load("src/lang/es.js")).default;
  const ph = (v) => JSON.stringify([...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort());
  for (const f of langs) {
    const d = (await load(`src/lang/${f}`)).default;
    const missing = Object.keys(es).filter((k) => !(k in d));
    const extra = Object.keys(d).filter((k) => !(k in es));
    const badType = Object.keys(es).filter((k) => k in d && Array.isArray(es[k]) !== Array.isArray(d[k]));
    const badPh = Object.keys(es).filter((k) => k in d && !Array.isArray(es[k]) && ph(es[k]) !== ph(d[k]));
    const badLen = Object.keys(es).filter((k) => Array.isArray(es[k]) && Array.isArray(d[k]) && es[k].length !== d[k].length);
    const probs = [...missing.map((k) => "missing:" + k), ...extra.map((k) => "extra:" + k), ...badType.map((k) => "type:" + k),
      ...badPh.map((k) => "placeholder:" + k), ...badLen.map((k) => "length:" + k)];
    check(`chk_i18n_parity_${f}`, !probs.length, probs.slice(0, 8).join(" "));
  }
  const i18n = await load("src/i18n.js");
  const registered = Object.keys(i18n.LANGS);
  check("chk_i18n_registered", registered[0] === "es" && registered.every((l) => langs.includes(l + ".js")), registered.join(","));
  return es;
}

async function chkKeysUsed(es) {
  const html = read("index.html");
  const htmlKeys = [...html.matchAll(/data-i18n(?:-ph|-alt|-list)?="([a-z0-9_]+)"/g)].map((m) => m[1]);
  const srcKeys = walk("src").filter((p) => p.endsWith(".js") && !p.includes("lang")).flatMap((p) =>
    [...read(p).matchAll(/\bt(?:\.list)?\("([a-z0-9_]+)"\s*[),]/g)].map((m) => m[1]));
  const rec = await load("src/records.js");
  const dyn = [...rec.TYPES.map((x) => "type_" + x), ...rec.SPECIES.flatMap((x) => ["sp_" + x, "sp_short_" + x]),
    ...rec.NEST_STATUS.map((x) => "st_" + x), ...rec.NEST_SETTING.map((x) => "set_" + x),
    "warn_fewer_than_3_trips", "warn_roundtrip_shorter_than_nest_time", "gps_insecure", "gps_denied", "gps_fail", ...rec.TRUST_LEVELS.map((x) => "trust_" + x)];
  const missing = [...new Set([...htmlKeys, ...srcKeys, ...dyn])].filter((k) => !(k in es));
  check("chk_keys_defined", !missing.length, missing.join(" "));
}

function chkOffline() {
  const sw = read("sw.js");
  const shell = [...sw.matchAll(/^\s*"([^"]+)",?$/gm)].map((m) => m[1]).filter((p) => p !== "./");
  const missing = shell.filter((p) => !existsSync(join(ROOT, p)));
  check("chk_sw_files_exist", !missing.length, missing.join(" "));
  const shipped = ["src", "css", "img", "vendor"].flatMap(walk).map((p) => relative(".", p).replace(/\\/g, "/"));
  const uncached = shipped.filter((p) => !shell.includes(p));
  check("chk_sw_covers_app", !uncached.length, uncached.join(" "));
  const man = JSON.parse(read("manifest.webmanifest"));
  const icons = man.icons.filter((i) => !existsSync(join(ROOT, i.src))).map((i) => i.src);
  const sizes = ["192x192", "512x512"].every((s) => man.icons.some((i) => i.sizes === s && i.type === "image/png"));
  const maskable = man.icons.some((i) => i.purpose === "maskable");
  check("chk_manifest_installable", !icons.length && sizes && maskable && man.display === "standalone", icons.join(" "));
}

function chkPrivacy() {
  const html = read("index.html");
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] || "";
  const img = csp.match(/img-src ([^;]+)/)?.[1].split(/\s+/) || [];
  const allowed = img.filter((h) => h.startsWith("https://")).map((h) => h.replace("https://", ""));
  const hostOk = (h) => allowed.some((a) => a.startsWith("*.") ? h.endsWith(a.slice(1)) : h === a);
  const connect = csp.match(/connect-src ([^;]+)/)?.[1].trim();
  const connectOk = ["'self'", "'self' https://commons.wikimedia.org"].includes(connect);
  check("chk_csp_strict", connectOk && /script-src 'self'(;|$)/.test(csp) && /default-src 'self'/.test(csp), connect);
  const code = walk("src").filter((p) => p.endsWith(".js") && !p.includes("lang")).map((p) => [p, read(p)]);
  const hosts = code.flatMap(([, s]) => [...s.matchAll(/https:\/\/([a-z0-9.{}-]+)\//gi)].map((m) => m[1].replace("{s}", "a")));
  const loaded = hosts.filter((h) => !/^(www\.)?(boe\.es|miteco\.gob\.es|creativecommons\.org)$/.test(h));
  const bad = loaded.filter((h) => !hostOk(h));
  check("chk_external_hosts_in_csp", !bad.length, [...new Set(bad)].join(" "));
  const banned = /\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource|watchPosition|userAgentData|getBattery|enumerateDevices|document\.cookie)\b/;
  const offenders = code.filter(([, s]) => banned.test(s)).map(([p]) => p);
  check("chk_no_network_or_tracking_apis", !offenders.length, offenders.join(" "));
  // The only network call is the opt-in Commons photo request in media.js, and it sends photo titles only.
  const fetchers = code.filter(([, s]) => /\bfetch\(/.test(s)).map(([p]) => p.replace(/\\/g, "/"));
  const media = read("src/media.js");
  const oneFetch = (media.match(/\bfetch\(/g) || []).length === 1 && /fetch\(`\$\{COMMONS_API\}\?\$\{q\}`/.test(media)
    && /COMMONS_API = "https:\/\/commons\.wikimedia\.org\/w\/api\.php"/.test(media);
  check("chk_only_commons_fetch", fetchers.length === 1 && fetchers[0] === "src/media.js" && oneFetch, fetchers.join(" "));
  const gallery = read("src/app.js").match(/function renderGallery\([\s\S]*?\n\}/)?.[0] || "";
  const callers = (read("src/app.js").match(/commonsPhotos\(/g) || []).length;
  check("chk_photos_opt_in", callers === 1 && /if \(!S\.photosOn[^\n]*return;[\s\S]*commonsPhotos\(/.test(gallery));
  const app = read("src/app.js");
  const calls = [...app.matchAll(/^.*addBaseLayers\(\);.*$/gm)].map((m) => m[0]);
  // Base tiles may only load from the remembered opt-in or from the user's "load map" click.
  const loadFn = app.match(/function loadBaseMap\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  const guarded = calls.filter((l) => /getSetting\("tiles_ok"/.test(l)).length;
  check("chk_tiles_opt_in", calls.length === guarded + 1 && /addBaseLayers\(\);/.test(loadFn), calls.join(" | "));
  check("chk_photo_metadata_stripped", /toDataURL\("image\/jpeg"/.test(read("src/app.js")));
}

function chkFunctionSize() {
  const long = [];
  for (const p of walk("src").filter((x) => x.endsWith(".js") && !x.includes("lang"))) {
    const lines = read(p).split("\n");
    lines.forEach((l, i) => {
      if (!/^(export )?(async )?function \w+/.test(l)) return;
      let depth = 0, j = i;
      for (; j < lines.length; j++) {
        depth += (lines[j].match(/\{/g) || []).length - (lines[j].match(/\}/g) || []).length;
        if (depth === 0 && j > i) break;
      }
      if (j - i + 1 > 50) long.push(`${p}:${i + 1}`);
    });
  }
  check("chk_functions_under_50_lines", !long.length, long.join(" "));
}

async function chkGeo() {
  const g = await load("src/geo.js");
  const nest = { lat: 43.3, lon: -2.9 };
  const station = (brg, dist) => {
    const p = g.destination(nest, (brg + 180) % 360, dist);
    const rt = 45 + 2 * dist / 3;
    return { ...p, bearings: [brg - 3, brg + 2, brg], times: [rt + 20, rt, rt + 40] };
  };
  const zones = [station(40, 300), station(130, 250), station(250, 400)].map((s) => g.stationZone(s));
  const c = g.combineZones(zones);
  const err = g.haversine(c.centroid, nest);
  check("chk_geo_triangulation_recovers_nest", c.agree === 3 && err < Math.max(60, c.radiusM), `err=${err.toFixed(1)}m r=${c.radiusM.toFixed(1)}m`);
  check("chk_geo_bearing_roundtrip", Math.abs(g.angleDiff(g.bearing(nest, g.destination(nest, 77, 500)), 77)) < 0.5);
}

async function chkRecords() {
  const r = await load("src/records.js");
  const rec = r.makeRecord({ type: "nest", species: "velutina", lat: 43.123456, lon: -2.987654, notes: 'a,"b"', nest_status: "active" });
  check("chk_record_valid", r.validate(rec).length === 0);
  const pub = r.toGeoJSON([{ ...rec, photo: "data:x" }], { decimals: 3 });
  const [lon, lat] = pub.features[0].geometry.coordinates;
  check("chk_public_export_rounded_no_photo", lat === 43.123 && lon === -2.988 && !("photo" in pub.features[0].properties));
  check("chk_csv_escaping", r.toCSV([rec]).includes('"a,""b"""'));
  const p1 = r.parseLocation("https://www.google.com/maps/@42.88,-8.54,15z");
  const p2 = r.parseLocation("42°52'48\"N 8°32'24\"W");
  check("chk_parse_location", p1?.lat === 42.88 && p1?.lon === -8.54 && Math.abs(p2.lat - 42.88) < 1e-6 && Math.abs(p2.lon + 8.54) < 1e-6);
}

async function chkTrust() {
  const r = await load("src/records.js");
  const g = await load("src/geo.js");
  const base = { lat: 43.3, lon: -2.9 };
  const day = (d, min = 0) => new Date(Date.UTC(2026, 7, 1 + d, 10, min)).toISOString();
  const mk = (id, d, dist, brg, extra = {}) => ({ id, species: "velutina", created: day(d), ...g.destination(base, brg, dist), ...extra });
  const recs = [
    mk("a", 0, 0, 0), mk("b", 3, 200, 90), mk("c", 10, 300, 180),            // cluster of 3 -> confirmed
    { ...mk("dup", 0, 50, 45), created: day(0, 5) },                        // 5 min after "a": counts once
    mk("far", 1, 3000, 0),                                                  // 3 km away -> unconfirmed
    mk("old", 200, 100, 270),                                               // outside 90-day window
    mk("other", 2, 100, 0, { species: "orientalis" }),                      // other species
    mk("pair1", 0, 5000, 90), mk("pair2", 5, 5200, 90)                      // two -> probable
  ];
  const m = r.trustLevels(recs);
  const lv = (id) => m.get(id).level;
  check("chk_trust_levels", lv("a") === "confirmed" && m.get("a").n === 3 && lv("far") === "unconfirmed" && lv("old") === "unconfirmed"
    && lv("other") === "unconfirmed" && lv("pair1") === "probable", [...m].map(([k, v]) => `${k}:${v.n}`).join(" "));
}

const es = await chkI18n();
await chkKeysUsed(es);
chkOffline();
chkPrivacy();
chkFunctionSize();
await chkGeo();
await chkRecords();
await chkTrust();
console.log(results.join("\n"));
console.log(fails.length ? `\nFAIL (${fails.length}): ${fails.join(", ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
