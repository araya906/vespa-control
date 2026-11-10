import { LANGS, makeT } from "./i18n.js";
import { REGIONS, regionText } from "./regions.js";
import { TYPES, SPECIES, NEST_STATUS, NEST_SETTING, makeRecord, validate, toGeoJSON, fromGeoJSON, toCSV, mergeRecords, summarise, parseLocation } from "./records.js";
import { LICENSES, PHOTOS, photoUrl, pageUrl, ART, NEST_ART } from "./media.js";
import { stationZone, zonePolygon, combineZones } from "./geo.js";
import { all, put, remove, clearAll, getSetting, setSetting } from "./store.js";
import { calendarHtml, sourcesHtml } from "./guide.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const TABS = ["report", "map", "guide", "find", "data"];
const browserLang = (navigator.language || "es").slice(0, 2);
const S = {
  lang: getSetting("lang", LANGS[browserLang] ? browserLang : "es"),
  region: getSetting("region", "ES"),
  mode: getSetting("mode", "public"),
  photosOn: getSetting("photos_ok", false),
  records: [],
  stations: [],
  filter: "all",
  type: "sighting",
  loc: null,
  photo: null,
  pick: null,
  find: null,
  install: null
};
let t = makeT(S.lang);
let map, markerLayer, findLayer, baseLayers = null;

// ---------- text and static rendering ----------
function applyStatic() {
  document.documentElement.lang = S.lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $$("[data-i18n-alt]").forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
  $$("[data-i18n-list]").forEach((el) => { el.innerHTML = t.list(el.dataset.i18nList).map((x) => `<li>${esc(x)}</li>`).join(""); });
  $$("[data-mode]").forEach((el) => { el.hidden = el.dataset.mode !== S.mode; });
  const reg = REGIONS[S.region] || REGIONS.generic;
  $$("[data-legal]").forEach((el) => { el.textContent = regionText(reg.species[el.dataset.legal], S.lang); });
  $("#region-report").textContent = regionText(reg.report, S.lang);
  $("#region-links").innerHTML = reg.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(regionText(l.label, S.lang))}</a></li>`).join("");
  $("#calendar").innerHTML = calendarHtml(t, S.lang);
  $("#sources").innerHTML = sourcesHtml(S.lang);
  $("#nest-art").innerHTML = NEST_ART.map((n) => `<figure><img src="${n.src}" alt="${esc(t(n.key))}" loading="lazy"><figcaption>${esc(t(n.key))}</figcaption></figure>`).join("");
  $$("[name=mode]").forEach((r) => { r.checked = r.value === S.mode; });
  $("#install").hidden = !S.install;
}

function applyText() {
  applyStatic();
  renderSpecies();
  buildChoices();
  renderLoc();
  renderStations();
  renderFind();
  renderSummary();
  renderFilters();
  renderMarkers();
}

function goto(tab) {
  if (!TABS.includes(tab) || (tab === "find" && S.mode !== "tech")) tab = "report";
  $$(".tab").forEach((s) => { s.hidden = s.dataset.tab !== tab; });
  $$("#tabs button").forEach((b) => b.setAttribute("aria-current", b.dataset.goto === tab ? "page" : "false"));
  if (tab === "map") {
    ensureMap();
    setTimeout(() => map.invalidateSize(), 50);
  }
  if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
  window.scrollTo(0, 0);
}

function openEmergency() {
  goto("guide");
  const card = $("#g-emergency");
  card.querySelectorAll("details").forEach((d) => { d.open = true; });
  card.scrollIntoView({ block: "start" });
}

// ---------- species art and opt-in photos ----------
function photoHtml(p) {
  const kind = p.live ? t("photo_live") : t("photo_specimen");
  return `<figure><img class="remote" loading="lazy" src="${esc(photoUrl(p))}" alt="${esc(p.file)}" referrerpolicy="no-referrer">
    <figcaption>${esc(t("photo_credit"))} (${esc(kind)}): <a href="${esc(pageUrl(p))}" target="_blank" rel="noopener noreferrer">${esc(p.author)}</a>,
    <a href="${esc(LICENSES[p.license])}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>, Wikimedia Commons</figcaption></figure>`;
}

function renderSpecies() {
  $$("[data-photos]").forEach((el) => {
    const sp = el.dataset.photos;
    const art = ART[sp] ? `<figure class="art"><img src="${ART[sp]}" alt="${esc(t("sp_" + sp))}"></figure>` : "";
    el.innerHTML = art + (S.photosOn ? (PHOTOS[sp] || []).map(photoHtml).join("") : "");
  });
  $("#photos-optin").hidden = S.photosOn;
}

function onRemoteImgError(e) {
  const img = e.target;
  if (img.tagName !== "IMG" || !img.classList.contains("remote")) return;
  const off = document.createElement("div");
  off.className = "off";
  off.textContent = t("photo_offline");
  img.replaceWith(off);
}

// ---------- report form ----------
function buildChoices() {
  $("#type-seg").innerHTML = TYPES.map((x) => `<button type="button" data-type="${x}" aria-pressed="${x === S.type}">${esc(t("type_" + x))}</button>`).join("");
  const cur = $("#species-choices input:checked")?.value || "unsure";
  $("#species-choices").innerHTML = SPECIES.map((x) => `<label><input type="radio" name="species" value="${x}" ${x === cur ? "checked" : ""}>
     <span class="dot" style="background:var(--sp-${x})"></span>${esc(t("sp_" + x))}${ART[x] ? `<img class="thumb" alt="" src="${ART[x]}">` : ""}</label>`).join("");
  const opts = (list, pre, sel) => list.map((x) => `<option value="${x}" ${x === sel ? "selected" : ""}>${esc(t(pre + x))}</option>`).join("");
  $("#nest-status").innerHTML = opts(NEST_STATUS, "st_", $("#nest-status").value || "active");
  $("#nest-setting").innerHTML = opts(NEST_SETTING, "set_", $("#nest-setting").value || "tree");
  syncType();
}

function syncType() {
  const nest = S.type === "nest";
  $("#nest-fields").hidden = !nest;
  $("#nest-safety").hidden = !nest;
  $("#count-field").hidden = nest;
}

function renderLoc() {
  const el = $("#loc-text");
  if (!S.loc) {
    el.textContent = t("no_location");
    return;
  }
  el.textContent = `${S.loc.lat.toFixed(5)}, ${S.loc.lon.toFixed(5)}` + (S.loc.accuracy_m ? ` (${t("accuracy")} ${Math.round(S.loc.accuracy_m)} m)` : "");
}

// Location is read once, only after a tap. No watchPosition, no background tracking.
function getGPS() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) return reject(new Error("gps_insecure"));
    if (!navigator.geolocation) return reject(new Error("gps_fail"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy_m: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? "gps_denied" : "gps_fail")),
      { enableHighAccuracy: true, timeout: 2e4, maximumAge: 0 }
    );
  });
}

// Re-encoding through a canvas drops all EXIF/XMP metadata (GPS, device, time).
async function resizePhoto(file, max = 1280) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  img.close?.();
  return c.toDataURL("image/jpeg", 0.72);
}

function resetForm(form) {
  form.reset();
  S.photo = null;
  S.loc = null;
  $("#photo-preview").hidden = true;
  buildChoices();
  renderLoc();
  renderSummary();
  renderMarkers();
  $("#form-ok").hidden = false;
  setTimeout(() => { $("#form-ok").hidden = true; }, 5e3);
}

async function saveReport(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const rec = makeRecord({
    type: S.type, species: f.get("species"), ...S.loc, count: f.get("count"),
    nest_status: f.get("nest_status"), nest_setting: f.get("nest_setting"), height_m: f.get("height_m"),
    notes: f.get("notes"), photo: S.photo, region: S.region
  });
  const errs = validate(rec);
  $("#form-errors").hidden = !errs.length;
  $("#form-errors").innerHTML = errs.map((e) => esc(t(e))).join("<br>");
  if (errs.length) return;
  await put("records", rec);
  S.records.push(rec);
  resetForm(ev.target);
}

// ---------- map (base tiles are opt-in) ----------
function ensureMap() {
  if (map) return syncMapConsent();
  const reg = REGIONS[S.region] || REGIONS.generic;
  const start = S.loc || S.records[S.records.length - 1];
  map = L.map("map", { zoomControl: true }).setView(start ? [start.lat, start.lon] : reg.center, start ? 15 : reg.zoom);
  markerLayer = L.layerGroup().addTo(map);
  findLayer = L.layerGroup().addTo(map);
  map.on("click", onMapClick);
  if (getSetting("tiles_ok", false)) addBaseLayers();
  syncMapConsent();
  renderMarkers();
  drawFind();
  const pts = S.records.map((r) => [r.lat, r.lon]);
  if (pts.length > 1 && !S.loc) map.fitBounds(pts, { maxZoom: 15, padding: [30, 30] });
}

function addBaseLayers() {
  if (baseLayers) return;
  const common = { referrerPolicy: "no-referrer" };
  const street = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    ...common, maxZoom: 20, subdomains: "abcd", attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
  });
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    ...common, maxZoom: 19, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics"
  });
  street.addTo(map);
  baseLayers = L.control.layers({ [t("map_street")]: street, [t("map_sat")]: sat }, null, { position: "topright" }).addTo(map);
}

function syncMapConsent() {
  $("#map-consent").hidden = !!baseLayers;
}

function loadBaseMap() {
  if ($("#map-remember").checked) setSetting("tiles_ok", true);
  addBaseLayers();
  syncMapConsent();
}

function icon(r) {
  const nest = r.type === "nest", gone = nest && (r.nest_status === "destroyed" || r.nest_status === "inactive");
  const color = gone ? "#9a9a9a" : `var(--sp-${r.species})`;
  const size = nest ? 22 : 16, shape = nest ? "border-radius:4px;transform:rotate(45deg)" : "border-radius:50%";
  return L.divIcon({
    className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;background:${color};${shape};border:2px solid #fff;box-shadow:0 0 0 1px #0006"></div>`
  });
}

function popupHtml(r) {
  const when = new Date(r.created).toLocaleString(S.lang);
  const status = r.type === "nest" ? `<label>${esc(t("edit_status"))}<select data-status="${r.id}">${NEST_STATUS.map((x) => `<option value="${x}" ${x === r.nest_status ? "selected" : ""}>${esc(t("st_" + x))}</option>`).join("")}</select></label>` : "";
  return `<div class="popup"><b>${esc(t("type_" + r.type))}: ${esc(t("sp_short_" + r.species))}</b>
    ${esc(t("created"))}: ${esc(when)}${r.count ? ` &middot; n = ${r.count}` : ""}${r.height_m !== null ? ` &middot; ${r.height_m} m` : ""}
    ${r.photo ? `<img src="${r.photo}" alt="">` : ""}${r.notes ? `<p>${esc(r.notes)}</p>` : ""}${status}
    <div class="row"><button class="btn small ghost" data-del="${r.id}">${esc(t("delete"))}</button></div></div>`;
}

function renderMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  const shown = S.records.filter((r) => S.filter === "all" || r.species === S.filter);
  shown.forEach((r) => L.marker([r.lat, r.lon], { icon: icon(r), title: t("sp_short_" + r.species) }).bindPopup(() => popupHtml(r)).addTo(markerLayer));
  $("#map-count").textContent = t("records_n", { n: shown.length });
}

function renderFilters() {
  $("#map-filters").innerHTML = ["all", ...SPECIES].map((x) => `<button class="chip" data-filter="${x}" aria-pressed="${S.filter === x}">${x === "all" ? "" : `<span class="dot" style="background:var(--sp-${x})"></span>`}${esc(x === "all" ? t("all") : t("sp_short_" + x))}</button>`).join("");
}

function startPick(target) {
  S.pick = target;
  goto("map");
  $("#pick-banner").hidden = false;
}

function endPick(back) {
  const target = S.pick;
  S.pick = null;
  $("#pick-banner").hidden = true;
  if (back) goto(target === "report" ? "report" : "find");
}

function onMapClick(e) {
  if (!S.pick) return;
  const p = { lat: e.latlng.lat, lon: e.latlng.lng, accuracy_m: null };
  if (S.pick === "report") {
    S.loc = p;
    renderLoc();
  } else {
    const st = S.stations.find((s) => s.id === S.pick);
    if (st) {
      st.lat = p.lat;
      st.lon = p.lon;
      saveStations();
    }
  }
  endPick(true);
}

async function onPopupAction(e) {
  const del = e.target.closest("[data-del]");
  if (del && confirm(t("confirm_delete"))) {
    await remove("records", del.dataset.del);
    S.records = S.records.filter((r) => r.id !== del.dataset.del);
    map.closePopup();
    renderMarkers();
    renderSummary();
  }
}

async function onStatusChange(e) {
  const sel = e.target.closest("[data-status]");
  if (!sel) return;
  const r = S.records.find((x) => x.id === sel.dataset.status);
  const upd = makeRecord({ ...r, nest_status: sel.value });
  await put("records", upd);
  S.records = S.records.map((x) => x.id === upd.id ? upd : x);
  renderMarkers();
  renderSummary();
}

// ---------- nest finding (technician mode) ----------
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const parseTime = (v) => {
  const m = String(v).trim().match(/^(\d+)(?::(\d{1,2}))?$/);
  return m ? Number(m[1]) * (m[2] === undefined ? 1 : 60) + Number(m[2] || 0) : NaN;
};

function saveStations() {
  put("stations", S.stations);
  renderStations();
  renderFind();
}

function stationHtml(st, i) {
  const tags = (list, kind, fmt) => list.map((v, j) => `<span class="tag">${fmt(v)}<button aria-label="${esc(t("remove"))}" data-rm="${kind}" data-st="${st.id}" data-j="${j}">&times;</button></span>`).join("");
  let warn = [];
  try { warn = stationZone(st).warnings; } catch {}
  return `<div class="card station" data-id="${st.id}">
    <h3>${esc(t("station"))} ${i + 1}<button class="btn small ghost" data-act="del-st">${esc(t("remove"))}</button></h3>
    <span class="hint">${esc(t("station_loc"))}: ${Number.isFinite(st.lat) ? `${st.lat.toFixed(5)}, ${st.lon.toFixed(5)}` : esc(t("no_location"))}</span>
    <div class="row" style="margin:6px 0 10px"><button class="btn small" data-act="gps">${esc(t("use_gps"))}</button>
      <button class="btn small ghost" data-act="pick">${esc(t("pick_map"))}</button></div>
    <div class="inline" style="margin-bottom:10px"><input data-in="loc" autocomplete="off" placeholder="${esc(t("paste_loc"))}">
      <button class="btn small" data-act="paste">${esc(t("use_paste"))}</button></div>
    <span class="hint">${esc(t("bearing"))}</span><div class="vals">${tags(st.bearings, "b", (v) => `${Math.round(v)}&deg;`)}</div>
    <div class="inline"><input type="number" inputmode="numeric" min="0" max="359" placeholder="0-359" aria-label="${esc(t("bearing"))}" data-in="b">
      <button class="btn small" data-act="add-b">${esc(t("add_bearing"))}</button></div>
    <button class="btn small ghost" style="margin-top:6px" data-act="compass">${esc(t("use_compass"))}</button>
    <h3>${esc(t("timer"))}</h3>
    <div class="timer" data-timer>${st.startedAt ? fmtTime((Date.now() - st.startedAt) / 1e3) : "0:00"}</div>
    <button class="btn wide ${st.startedAt ? "primary" : ""}" data-act="timer">${esc(st.startedAt ? t("back") : t("left"))}</button>
    <span class="hint">${esc(t("trips"))}</span><div class="vals">${tags(st.times, "t", fmtTime)}</div>
    <div class="inline"><input inputmode="numeric" placeholder="${esc(t("add_time"))}" data-in="t">
      <button class="btn small" data-act="add-t">+</button></div>
    ${warn.map((w) => `<p class="warn-line">${esc(t("warn_" + w))}</p>`).join("")}
  </div>`;
}

function renderStations() {
  $("#stations").innerHTML = S.stations.map(stationHtml).join("");
}

// Compass is read once per tap, then the listener is removed.
async function getHeading() {
  if (typeof DeviceOrientationEvent === "undefined") throw new Error("na");
  if (typeof DeviceOrientationEvent.requestPermission === "function" && await DeviceOrientationEvent.requestPermission() !== "granted") throw new Error("denied");
  return new Promise((resolve, reject) => {
    const ev = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    const done = (h) => {
      window.removeEventListener(ev, on);
      clearTimeout(to);
      h === null ? reject(new Error("na")) : resolve(h);
    };
    const on = (e) => {
      if (Number.isFinite(e.webkitCompassHeading)) done(e.webkitCompassHeading);
      else if (e.absolute && Number.isFinite(e.alpha)) done((360 - e.alpha) % 360);
    };
    const to = setTimeout(() => done(null), 3e3);
    window.addEventListener(ev, on);
  });
}

async function stationLocAction(act, st, card) {
  if (act === "gps") {
    try { Object.assign(st, await getGPS()); } catch (err) { alert(t(err.message)); }
  }
  if (act === "paste") {
    const p = parseLocation($("[data-in=loc]", card).value);
    if (p) Object.assign(st, p);
    else alert(t("paste_fail"));
  }
  if (act === "compass") {
    try { st.bearings.push(Math.round(await getHeading())); } catch { alert(t("compass_na")); }
  }
}

function stationDataAction(act, st, card) {
  if (act === "add-b") {
    const v = Number($("[data-in=b]", card).value);
    if (Number.isFinite(v) && v >= 0 && v < 360) st.bearings.push(v);
  }
  if (act === "add-t") {
    const v = parseTime($("[data-in=t]", card).value);
    if (v > 0) st.times.push(v);
  }
  if (act === "timer") {
    if (st.startedAt) {
      st.times.push(Math.round((Date.now() - st.startedAt) / 1e3));
      st.startedAt = null;
    } else st.startedAt = Date.now();
  }
}

async function onStationAction(e) {
  const card = e.target.closest(".station");
  if (!card) return;
  const st = S.stations.find((s) => s.id === card.dataset.id);
  const rm = e.target.closest("[data-rm]");
  if (rm) {
    (rm.dataset.rm === "b" ? st.bearings : st.times).splice(Number(rm.dataset.j), 1);
    return saveStations();
  }
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act) return;
  if (act === "pick") return startPick(st.id);
  if (act === "del-st") {
    S.stations = S.stations.filter((s) => s !== st);
    remove("stations", st.id);
  }
  await stationLocAction(act, st, card);
  stationDataAction(act, st, card);
  saveStations();
}

function computeFind() {
  const zones = [];
  for (const st of S.stations) {
    if (!Number.isFinite(st.lat)) continue;
    try { zones.push(stationZone(st)); } catch {}
  }
  if (!zones.length) return null;
  return { zones, combined: zones.length > 1 ? combineZones(zones) : null };
}

function renderFind() {
  S.find = computeFind();
  const f = S.find;
  let txt = t("result_none");
  if (f && !f.combined) {
    const z = f.zones[0];
    txt = t("result_one", { dmin: Math.round(z.dMin), dmax: Math.round(z.dMax), brg: Math.round(z.bearing) });
  } else if (f && f.combined.agree < 2) txt = t("result_conflict");
  else if (f) txt = t("result_many", { agree: f.combined.agree, of: f.combined.of, r: Math.round(f.combined.radiusM), ha: (f.combined.areaM2 / 1e4).toFixed(1) });
  $("#find-result").textContent = txt;
  $("#find-show").disabled = !f;
  $("#find-save").disabled = !(f?.combined?.centroid && f.combined.agree >= 2);
  drawFind();
}

function drawFind() {
  if (!findLayer) return;
  findLayer.clearLayers();
  const f = S.find;
  if (!f) return;
  f.zones.forEach((z) => {
    L.polygon(zonePolygon(z).map((p) => [p.lat, p.lon]), { color: "#2f5d34", weight: 1, fillOpacity: 0.12 }).addTo(findLayer);
    L.circleMarker([z.lat, z.lon], { radius: 6, color: "#2f5d34", fillOpacity: 1 }).addTo(findLayer);
  });
  const c = f.combined;
  if (c?.centroid && c.agree >= 2) L.circle([c.centroid.lat, c.centroid.lon], { radius: Math.max(c.radiusM, 15), color: "#c0392b", weight: 2, fillOpacity: 0.15 }).addTo(findLayer);
}

function showFind() {
  goto("map");
  setTimeout(() => {
    map.invalidateSize();
    const b = findLayer.getLayers().filter((l) => l.getBounds).map((l) => l.getBounds());
    if (b.length) map.fitBounds(b.reduce((a, x) => L.latLngBounds(a).extend(x)), { padding: [20, 20] });
  }, 60);
}

async function saveSuspect() {
  const c = S.find.combined.centroid;
  const rec = makeRecord({
    type: "nest", species: "unsure", lat: c.lat, lon: c.lon, accuracy_m: Math.round(S.find.combined.radiusM),
    nest_status: "active", notes: t("result") + " (" + t("tab_find") + ")", region: S.region
  });
  await put("records", rec);
  S.records.push(rec);
  renderMarkers();
  renderSummary();
  showFind();
}

// ---------- data ----------
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
}
const stamp = () => new Date().toISOString().slice(0, 10);

function renderSummary() {
  const s = summarise(S.records);
  if (!s.total) {
    $("#summary").innerHTML = `<p class="hint">${esc(t("none"))}</p>`;
    return;
  }
  const rows = (obj, pre) => Object.entries(obj).map(([k, v]) => `<tr><td>${esc(t(pre + k))}</td><td class="n">${v}</td></tr>`).join("");
  $("#summary").innerHTML = `<table class="sum"><tr><th>${esc(t("species"))}</th><th></th></tr>${rows(s.bySpecies, "sp_short_")}
    ${Object.keys(s.nests).length ? `<tr><th>${esc(t("nests_by_status"))}</th><th></th></tr>${rows(s.nests, "st_")}` : ""}</table>
    <p class="hint">${esc(t("records_n", { n: s.total }))}</p>`;
}

async function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const incoming = fromGeoJSON(JSON.parse(await file.text())).filter((r) => !validate(r).length);
    const m = mergeRecords(S.records, incoming);
    await put("records", m.records);
    S.records = m.records;
    $("#imp-msg").textContent = t("imported", { a: m.added, u: m.updated });
    renderMarkers();
    renderSummary();
  } catch (err) {
    $("#imp-msg").textContent = t("import_fail", { e: err.message });
  }
  e.target.value = "";
}

async function deleteAll() {
  if (!confirm(t("confirm_delete_all"))) return;
  await clearAll();
  S.records = [];
  S.stations = [];
  S.photosOn = false;
  applyText();
  $("#del-msg").textContent = t("deleted_all");
}

// ---------- wiring ----------
function wireSettings() {
  $("#lang").innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === S.lang ? "selected" : ""}>${v}</option>`).join("");
  $("#lang").onchange = (e) => {
    S.lang = e.target.value;
    setSetting("lang", S.lang);
    t = makeT(S.lang);
    renderRegions();
    applyText();
  };
  renderRegions();
  $("#region").onchange = (e) => {
    S.region = e.target.value;
    setSetting("region", S.region);
    applyText();
    if (map) map.setView(REGIONS[S.region].center, REGIONS[S.region].zoom);
  };
  $$("[name=mode]").forEach((r) => {
    r.onchange = () => {
      S.mode = r.value;
      setSetting("mode", S.mode);
      applyStatic();
      if (S.mode !== "tech" && location.hash === "#find") goto("report");
    };
  });
}

function renderRegions() {
  $("#region").innerHTML = Object.entries(REGIONS).map(([k, r]) => `<option value="${k}" ${k === S.region ? "selected" : ""}>${esc(regionText(r.name, S.lang))}</option>`).join("");
}

function onDocClick(e) {
  const g = e.target.closest("[data-goto]");
  if (g) {
    e.preventDefault();
    goto(g.dataset.goto);
  }
  if (e.target.closest("[data-sos]")) openEmergency();
  const ty = e.target.closest("[data-type]");
  if (ty) {
    S.type = ty.dataset.type;
    $$("#type-seg button").forEach((b) => b.setAttribute("aria-pressed", b === ty));
    syncType();
  }
  const fl = e.target.closest("[data-filter]");
  if (fl) {
    S.filter = fl.dataset.filter;
    renderFilters();
    renderMarkers();
  }
  onPopupAction(e);
  onStationAction(e);
}

function wireReport() {
  $("#report-form").addEventListener("submit", saveReport);
  $("#btn-gps").onclick = async () => {
    $("#loc-text").textContent = t("gps_wait");
    try { S.loc = await getGPS(); } catch (err) {
      $("#loc-text").textContent = t(err.message);
      return;
    }
    renderLoc();
  };
  $("#btn-paste").onclick = () => {
    const p = parseLocation($("#loc-paste").value);
    if (!p) {
      $("#loc-text").textContent = t("paste_fail");
      return;
    }
    S.loc = { ...p, accuracy_m: null };
    $("#loc-paste").value = "";
    renderLoc();
  };
  $("#btn-pick").onclick = () => startPick("report");
  $("#pick-cancel").onclick = () => endPick(true);
  $("#photo").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    S.photo = await resizePhoto(f);
    $("#photo-preview").src = S.photo;
    $("#photo-preview").hidden = false;
  };
}

function wireData() {
  $("#exp-full").onclick = () => download(`vespa-records-${stamp()}.geojson`, JSON.stringify(toGeoJSON(S.records, { photos: true })), "application/geo+json");
  $("#exp-public").onclick = () => download(`vespa-public-${stamp()}.geojson`, JSON.stringify(toGeoJSON(S.records, { decimals: 3 })), "application/geo+json");
  $("#exp-csv").onclick = () => download(`vespa-records-${stamp()}.csv`, toCSV(S.records), "text/csv");
  $("#imp").onchange = importFile;
  $("#del-all").onclick = deleteAll;
  $("#install").onclick = async () => {
    if (!S.install) return;
    S.install.prompt();
    await S.install.userChoice;
    S.install = null;
    $("#install").hidden = true;
  };
}

function wire() {
  wireSettings();
  wireReport();
  wireData();
  document.addEventListener("click", onDocClick);
  document.addEventListener("change", onStatusChange);
  document.addEventListener("error", onRemoteImgError, true);
  $("#map-load").onclick = loadBaseMap;
  $("#btn-photos").onclick = () => {
    S.photosOn = true;
    setSetting("photos_ok", true);
    renderSpecies();
  };
  $("#add-station").onclick = () => {
    S.stations.push({ id: "s" + Date.now().toString(36), lat: null, lon: null, bearings: [], times: [], startedAt: null });
    saveStations();
  };
  $("#find-show").onclick = showFind;
  $("#find-save").onclick = saveSuspect;
  setInterval(() => $$(".station").forEach((c) => {
    const st = S.stations.find((s) => s.id === c.dataset.id);
    if (st?.startedAt) $("[data-timer]", c).textContent = fmtTime((Date.now() - st.startedAt) / 1e3);
  }), 500);
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    S.install = e;
    $("#install").hidden = false;
  });
}

async function init() {
  wire();
  [S.records, S.stations] = await Promise.all([all("records"), all("stations")]);
  applyText();
  goto((location.hash || "").slice(1) || "report");
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").then(() => {
      $("#sw-msg").textContent = t("offline_ready");
    }).catch(() => {});
  }
}

init();
