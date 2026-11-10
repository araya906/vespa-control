// Opt-in open data: share minimal report fields and read other people's shared reports.
// Only API_BASE is contacted, never with photos, notes, device data or identifiers.
import { API_BASE } from "./config.js";

export const communityEnabled = () => !!API_BASE;
const opts = { credentials: "omit", referrerPolicy: "no-referrer", mode: "cors" };
const hourIso = (iso) => new Date(Math.floor(Date.parse(iso) / 36e5) * 36e5).toISOString();
const round3 = (v) => Math.round(v * 1e3) / 1e3;

export function newToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Exactly the fields that leave the phone.
export function publicPayload(r, token) {
  return {
    id: r.id, token, created: hourIso(r.created), type: r.type, species: r.species,
    lat: round3(r.lat), lon: round3(r.lon), count: r.count ?? null, nest_status: r.type === "nest" ? r.nest_status : null
  };
}

export async function shareRecord(r) {
  const token = r.share_token || newToken();
  const res = await fetch(`${API_BASE}/reports`, {
    ...opts, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(publicPayload(r, token))
  });
  if (!res.ok) throw new Error("share " + res.status);
  return token;
}

export async function unshareRecord(r) {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(r.id)}`, {
    ...opts, method: "DELETE", headers: { "X-Delete-Token": r.share_token || "" }
  });
  if (!res.ok) throw new Error("unshare " + res.status);
}

export async function loadCommunity() {
  const res = await fetch(`${API_BASE}/reports`, { ...opts, method: "GET" });
  if (!res.ok) throw new Error("load " + res.status);
  const fc = await res.json();
  return (fc.features || []).filter((f) => f?.geometry?.type === "Point").map((f) => ({
    ...f.properties, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
    source: "community", notes: "", photo: null, height_m: null
  }));
}
