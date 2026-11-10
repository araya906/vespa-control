export const NEST_DEFAULTS = Object.freeze({
  tNest: 45,
  // s spent inside the nest per trip (field estimate, 20 trips)
  sMin: 1.8,
  // m/s, mean field flight speed (1.8 +/- 0.32, n = 30)
  sMax: 5.4,
  // m/s, upper speed from harmonic-radar studies
  halfAngleShort: 10,
  // deg either side of the bearing when round trip < 10 min
  halfAngleLong: 15
  // deg when round trip >= 10 min
});
export const R = 63710088e-1;
export const rad = (d) => d * Math.PI / 180;
export const deg = (r) => r * 180 / Math.PI;
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
export function destination(p, brg, dist) {
  const d = dist / R, t2 = rad(brg), la = rad(p.lat), lo = rad(p.lon);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t2));
  const lo2 = lo + Math.atan2(Math.sin(t2) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: deg(la2), lon: (deg(lo2) + 540) % 360 - 180 };
}
export function angleDiff(a, b) {
  const d = ((a - b) % 360 + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}
export function meanBearing(list) {
  const s = list.reduce((acc, b) => acc + Math.sin(rad(b)), 0);
  const c = list.reduce((acc, b) => acc + Math.cos(rad(b)), 0);
  return (deg(Math.atan2(s, c)) + 360) % 360;
}
export function stationZone(station, opt = NEST_DEFAULTS) {
  const o = { ...NEST_DEFAULTS, ...opt };
  const times = (station.times || []).filter((t2) => Number.isFinite(t2) && t2 > 0);
  const bearings = (station.bearings || []).filter(Number.isFinite);
  if (!times.length || !bearings.length) throw new Error("station needs at least one bearing and one round-trip time");
  const tt = Math.min(...times);
  const flight = Math.max(0, tt - o.tNest);
  return {
    lat: station.lat,
    lon: station.lon,
    bearing: meanBearing(bearings),
    roundTrip: tt,
    dMin: o.sMin * flight / 2,
    dMax: o.sMax * flight / 2,
    halfAngle: tt < 600 ? o.halfAngleShort : o.halfAngleLong,
    warnings: [
      ...times.length < 3 ? ["fewer_than_3_trips"] : [],
      ...tt <= o.tNest ? ["roundtrip_shorter_than_nest_time"] : []
    ]
  };
}
export function inZone(zone, p) {
  const d = haversine(zone, p);
  if (d < zone.dMin || d > zone.dMax) return false;
  if (d < 1) return true;
  return Math.abs(angleDiff(bearing(zone, p), zone.bearing)) <= zone.halfAngle;
}
export function zonePolygon(zone, steps = 24) {
  const a0 = zone.bearing - zone.halfAngle, span = 2 * zone.halfAngle;
  const outer = [], inner = [];
  for (let i = 0; i <= steps; i++) {
    const b = a0 + span * i / steps;
    outer.push(destination(zone, b, zone.dMax));
    inner.unshift(zone.dMin > 0 ? destination(zone, b, zone.dMin) : { lat: zone.lat, lon: zone.lon });
  }
  return [...outer, ...inner];
}
export function combineZones(zones, cellM = 15) {
  if (!zones.length) return null;
  const pts = zones.flatMap((z) => zonePolygon(z, 12));
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const mLat = 111320, mLon = 111320 * Math.cos(rad(lat0));
  const minLat = Math.min(...pts.map((p) => p.lat)), maxLat = Math.max(...pts.map((p) => p.lat));
  const minLon = Math.min(...pts.map((p) => p.lon)), maxLon = Math.max(...pts.map((p) => p.lon));
  const nLat = Math.ceil((maxLat - minLat) * mLat / cellM), nLon = Math.ceil((maxLon - minLon) * mLon / cellM);
  const scale = Math.max(1, Math.sqrt(nLat * nLon / 25e4));
  const dLat = cellM * scale / mLat, dLon = cellM * scale / mLon;
  let best = 0, cells = [];
  for (let la = minLat + dLat / 2; la < maxLat; la += dLat) {
    for (let lo = minLon + dLon / 2; lo < maxLon; lo += dLon) {
      const p = { lat: la, lon: lo };
      const k = zones.reduce((s, z) => s + (inZone(z, p) ? 1 : 0), 0);
      if (k > best) {
        best = k;
        cells = [];
      }
      if (k === best && k > 0) cells.push(p);
    }
  }
  if (!cells.length) return { agree: 0, of: zones.length, cells: [], centroid: null, areaM2: 0, radiusM: 0 };
  const centroid = {
    lat: cells.reduce((s, p) => s + p.lat, 0) / cells.length,
    lon: cells.reduce((s, p) => s + p.lon, 0) / cells.length
  };
  const radiusM = Math.max(...cells.map((p) => haversine(centroid, p)));
  return { agree: best, of: zones.length, cells, centroid, areaM2: cells.length * (cellM * scale) ** 2, radiusM };
}
