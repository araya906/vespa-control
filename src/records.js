import { haversine } from "./geo.js";

export const TYPES = ["sighting", "nest", "apiary_attack", "trap_catch"];
export const SPECIES = ["velutina", "orientalis", "crabro", "unsure"];
export const NEST_STATUS = ["active", "reported", "destroyed", "inactive"];
export const NEST_SETTING = ["tree", "building", "wall_cavity", "underground", "shrub", "other"];
export const CSV_FIELDS = [
  "id",
  "created",
  "updated",
  "type",
  "species",
  "lat",
  "lon",
  "accuracy_m",
  "count",
  "nest_status",
  "nest_setting",
  "height_m",
  "notes",
  "region"
];
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
export const num = (v) => v === "" || v === null || v === void 0 ? null : Number(v);
export function makeRecord(input, now = new Date()) {
  const r = {
    id: input.id || newId(),
    created: input.created || now.toISOString(),
    updated: now.toISOString(),
    type: input.type,
    species: input.species || "unsure",
    lat: num(input.lat),
    lon: num(input.lon),
    accuracy_m: num(input.accuracy_m),
    count: num(input.count),
    nest_status: input.type === "nest" ? input.nest_status || "active" : null,
    nest_setting: input.type === "nest" ? input.nest_setting || null : null,
    height_m: input.type === "nest" ? num(input.height_m) : null,
    notes: (input.notes || "").trim(),
    photo: input.photo || null,
    region: input.region || null
  };
  return r;
}
export function validate(r) {
  const e = [];
  if (!TYPES.includes(r.type)) e.push("err_type");
  if (!SPECIES.includes(r.species)) e.push("err_species");
  if (!Number.isFinite(r.lat) || r.lat < -90 || r.lat > 90 || !Number.isFinite(r.lon) || r.lon < -180 || r.lon > 180) e.push("err_location");
  if (r.count !== null && (!Number.isInteger(r.count) || r.count < 0)) e.push("err_count");
  if (r.height_m !== null && (!Number.isFinite(r.height_m) || r.height_m < -5 || r.height_m > 60)) e.push("err_height");
  if (r.type === "nest" && !NEST_STATUS.includes(r.nest_status)) e.push("err_status");
  return e;
}
export const round = (v, d) => d === null || d === void 0 ? v : Math.round(v * 10 ** d) / 10 ** d;
export function toGeoJSON(records, { decimals = null, photos = false } = {}) {
  return {
    type: "FeatureCollection",
    features: records.map((r) => {
      const { lat, lon, photo, ...props } = r;
      if (photos && photo) props.photo = photo;
      if (decimals !== null) props.accuracy_m = Math.max(props.accuracy_m || 0, 111320 / 10 ** decimals);
      return { type: "Feature", geometry: { type: "Point", coordinates: [round(lon, decimals), round(lat, decimals)] }, properties: props };
    })
  };
}
export function fromGeoJSON(fc) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) throw new Error("not a GeoJSON FeatureCollection");
  return fc.features.filter((f) => f?.geometry?.type === "Point").map((f) => {
    const [lon, lat] = f.geometry.coordinates;
    const p = f.properties || {};
    return {
      ...p,
      lat,
      lon,
      id: p.id || newId(),
      created: p.created || (new Date()).toISOString(),
      updated: p.updated || p.created || (new Date()).toISOString(),
      photo: p.photo || null
    };
  });
}
export const csvCell = (v) => {
  if (v === null || v === void 0) return "";
  const s = String(v);
  return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export function toCSV(records, { decimals = null } = {}) {
  const rows = records.map((r) => CSV_FIELDS.map((k) => csvCell(k === "lat" || k === "lon" ? round(r[k], decimals) : r[k])).join(","));
  return [CSV_FIELDS.join(","), ...rows].join("\r\n") + "\r\n";
}
export function mergeRecords(existing, incoming) {
  const map2 = new Map(existing.map((r) => [r.id, r]));
  let added = 0, updated = 0;
  for (const r of incoming) {
    const old = map2.get(r.id);
    if (!old) {
      map2.set(r.id, r);
      added++;
    } else if ((r.updated || "") > (old.updated || "")) {
      map2.set(r.id, { ...r, photo: r.photo || old.photo });
      updated++;
    }
  }
  return { records: [...map2.values()], added, updated };
}
export function summarise(records) {
  const out = { total: records.length, bySpecies: {}, nests: {} };
  for (const r of records) {
    out.bySpecies[r.species] = (out.bySpecies[r.species] || 0) + 1;
    if (r.type === "nest") out.nests[r.nest_status] = (out.nests[r.nest_status] || 0) + 1;
  }
  return out;
}
export function parseLocation(text) {
  const s = String(text || "").trim();
  const ok = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0) ? { lat, lon } : null;
  const url = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/[?&](?:q|ll|query|center|daddr|sll)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i) || s.match(/geo:(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
  if (url) return ok(Number(url[1]), Number(url[2]));
  const dms = [...s.matchAll(/(\d{1,3})\s*[°º]\s*(\d{1,2})\s*['’′]\s*(\d{1,2}(?:[.,]\d+)?)?\s*(?:["”″]|'')?\s*([NSEWO])/gi)];
  if (dms.length === 2) {
    const v = dms.map((m) => (Number(m[1]) + Number(m[2]) / 60 + Number((m[3] || "0").replace(",", ".")) / 3600) * (/[SWO]/i.test(m[4]) ? -1 : 1));
    return /[NS]/i.test(dms[0][4]) ? ok(v[0], v[1]) : ok(v[1], v[0]);
  }
  const dot = s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (dot) return ok(Number(dot[1]), Number(dot[2]));
  const comma = s.match(/^(-?\d{1,2},\d+)\s*[;\s]\s*(-?\d{1,3},\d+)$/);
  if (comma) return ok(Number(comma[1].replace(",", ".")), Number(comma[2].replace(",", ".")));
  return null;
}

// Reliability: a report is confirmed when enough reports of the same species are nearby in space and time.
// Reports closer in time than dedupeMin count once (likely the same event or person).
export const TRUST_DEFAULTS = Object.freeze({ minReports: 3, radiusM: 500, days: 90, dedupeMin: 15 });
export const TRUST_LEVELS = ["unconfirmed", "probable", "confirmed"];

function distinctInTime(list, dedupeMin) {
  const times = list.map((r) => Date.parse(r.created)).filter(Number.isFinite).sort((a, b) => a - b);
  let n = 0, last = -Infinity;
  for (const tm of times) {
    if (tm - last >= dedupeMin * 6e4) n++, last = tm;
  }
  return n;
}

export function trustLevels(records, opt = {}) {
  const o = { ...TRUST_DEFAULTS, ...opt };
  const win = o.days * 864e5;
  const out = new Map();
  for (const r of records) {
    const t0 = Date.parse(r.created);
    const near = records.filter((q) => q.species === r.species && r.species !== "unsure"
      && Math.abs(Date.parse(q.created) - t0) <= win && haversine(r, q) <= o.radiusM);
    const n = r.species === "unsure" ? 1 : Math.max(1, distinctInTime(near, o.dedupeMin));
    const level = n >= o.minReports ? "confirmed" : n >= 2 ? "probable" : "unconfirmed";
    out.set(r.id, { n, level });
  }
  return out;
}
