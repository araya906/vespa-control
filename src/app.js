import { LANGS, makeT } from "./i18n.js";
import { REGIONS, regionText } from "./regions.js";
import { TYPES, SPECIES, NEST_STATUS, makeRecord, validate, summarise, parseLocation, trustLevels, TRUST_DEFAULTS, TRUST_LEVELS } from "./records.js";
import { PHOTOS, commonsPhotos, ART, NEST_ART } from "./media.js";
import { stationZone, zonePolygon, combineZones } from "./geo.js";
import { all, put, remove, clearAll, getSetting, setSetting } from "./store.js";
import { calendarHtml, sourcesHtml } from "./guide.js";
import { communityEnabled, uploadRecord, loadCommunity } from "./community.js";
import { API_BASE } from "./config.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const TABS = ["report", "map", "guide", "find", "data"];
const browserLang = (navigator.language || "es").slice(0, 2);
// Bump when the consent text changes in substance, so everybody is asked again.
const CONSENT_VERSION = "2026-11-10";
const consentState = () => ({ [CONSENT_VERSION]: true, declined: false })[getSetting("consent", "")] ?? null;
const S = {
  lang: getSetting("lang", LANGS[browserLang] ? browserLang : "es"),
  region: getSetting("region", "ES"),
  mode: getSetting("mode", "public"),
  photosOn: getSetting("photos_ok", false),
  trust: { ...TRUST_DEFAULTS, ...getSetting("trust", {}) },
  minLevel: "unconfirmed",
  consent: consentState(),
  community: [],
  outbox: [],
  sent: [],
  stations: [],
  filter: "all",
  type: "sighting",
  loc: null,
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
  $("#report-form").hidden = S.consent !== true;
  $("#report-locked").hidden = S.consent === true;
  $("#consent-status").textContent = t(S.consent === true ? "consent_status_yes" : "consent_status_no");
  $("#dl-geojson").href = API_BASE + "/reports";
  $("#dl-csv").href = API_BASE + "/reports.csv";
  const tr = S.trust;
  $("#trust-hint").textContent = t("trust_hint", { x: tr.minReports, r: tr.radiusM, d: tr.days, m: tr.dedupeMin });
  [["min", "minReports"], ["radius", "radiusM"], ["days", "days"]].forEach(([id, k]) => { $("#trust-" + id).value = tr[k]; });
}

function applyText() {
  applyStatic();
  renderSpecies();
  buildChoices();
  renderLoc();
  renderStations();
  renderFind();
  renderOutbox();
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

// ---------- species art and opt-in real photos ----------
const link = (url, text) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>` : esc(text);

function photoHtml(p) {
  return `<figure><img class="remote" loading="lazy" src="${esc(p.thumb)}" alt="${esc(p.file)}" referrerpolicy="no-referrer">
    <figcaption>${esc(t("photo_credit"))}: ${link(p.page, p.author)}${p.license ? ", " + link(p.licenseUrl, p.license) : ""}, Wikimedia Commons</figcaption></figure>`;
}

// Illustrations are local. Real photos are requested from Wikimedia Commons only after opt-in.
function renderGallery(el) {
  const key = el.dataset.photos;
  const art = ART[key] ? `<figure class="art"><img src="${ART[key]}" alt="${esc(t("sp_" + key))}"></figure>` : "";
  el.innerHTML = art;
  if (!S.photosOn || !PHOTOS[key]) return;
  commonsPhotos(PHOTOS[key])
    .then((list) => { el.innerHTML = art + list.map(photoHtml).join(""); })
    .catch(() => { el.innerHTML = art + `<div class="off">${esc(t("photo_offline"))}</div>`; });
}

function renderSpecies() {
  $$("[data-photos]").forEach(renderGallery);
  $$(".photos-optin").forEach((el) => { el.hidden = S.photosOn; });
}

function photosOn() {
  S.photosOn = true;
  setSetting("photos_ok", true);
  renderSpecies();
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

function resetForm(form) {
  form.reset();
  S.loc = null;
  buildChoices();
  renderLoc();
}

function showFormMsg(key) {
  const el = $("#form-ok");
  el.textContent = t(key);
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 6e3);
}

async function saveReport(ev) {
  ev.preventDefault();
  if (S.consent !== true) return openConsent();
  const f = new FormData(ev.target);
  const rec = makeRecord({
    type: S.type, species: f.get("species"), ...S.loc, count: f.get("count"), nest_status: f.get("nest_status"), region: S.region
  });
  const errs = validate(rec);
  $("#form-errors").hidden = !errs.length;
  $("#form-errors").innerHTML = errs.map((e) => esc(t(e))).join("<br>");
  if (errs.length) return;
  resetForm(ev.target);
  showFormMsg((await queueAndSend(rec)) ? "saved" : "queued");
}

// ---------- upload (nothing is kept on the phone once it is sent) ----------
// An unsent report waits in the outbox only until it is uploaded, then it is deleted from the phone.
async function queueAndSend(rec) {
  await put("records", rec);
  S.outbox.push(rec);
  const ok = await sendOne(rec);
  renderAfterChange();
  return ok;
}

async function sendOne(r) {
  if (!communityEnabled() || S.consent !== true) return false;
  try {
    await uploadRecord(r);
    await remove("records", r.id);
    S.outbox = S.outbox.filter((x) => x.id !== r.id);
    S.sent.push({ ...r, source: "community" });
    return true;
  } catch {
    return false;
  }
}

async function flushOutbox() {
  for (const r of [...S.outbox]) await sendOne(r);
  renderAfterChange();
}

function renderAfterChange() {
  renderOutbox();
  renderMarkers();
  renderSummary();
}

function renderOutbox() {
  $("#outbox").hidden = !S.outbox.length;
  $("#outbox").textContent = t("outbox_n", { n: S.outbox.length });
}

async function refreshCommunity() {
  if (!communityEnabled() || S.consent !== true) return;
  try {
    S.community = await loadCommunity();
    $("#community-msg").textContent = t("records_n", { n: S.community.length });
  } catch {
    $("#community-msg").textContent = t("community_fail");
  }
  renderMarkers();
  renderSummary();
}

// Public map = waiting reports + reports sent this session + everybody's reports from the server.
function allRecords() {
  const seen = new Set();
  return [...S.outbox.map((r) => ({ ...r, pending: true })), ...S.sent, ...S.community].filter((r) => !seen.has(r.id) && seen.add(r.id));
}

// ---------- consent (first use) ----------
function openConsent() {
  $("#consent").hidden = false;
  $("#consent-check").checked = S.consent === true;
  $("#consent-accept").disabled = !$("#consent-check").checked;
}

async function setConsent(ok) {
  S.consent = ok;
  setSetting("consent", ok ? CONSENT_VERSION : "declined");
  $("#consent").hidden = true;
  applyStatic();
  if (!ok) return;
  await flushOutbox();
  refreshCommunity();
}

// ---------- map (base tiles are opt-in) ----------
function ensureMap() {
  if (map) return syncMapConsent();
  const reg = REGIONS[S.region] || REGIONS.generic;
  map = L.map("map", { zoomControl: true }).setView(S.loc ? [S.loc.lat, S.loc.lon] : reg.center, S.loc ? 15 : reg.zoom);
  markerLayer = L.layerGroup().addTo(map);
  findLayer = L.layerGroup().addTo(map);
  map.on("click", onMapClick);
  if (getSetting("tiles_ok", false)) addBaseLayers();
  syncMapConsent();
  renderMarkers();
  drawFind();
}

function addBaseLayers() {
  if (baseLayers) return;
  // Spain's national mapping agency (IGN/CNIG): free, open (CC BY 4.0 scne.es), no API key.
  const ign = (service, layer) => `https://www.ign.es/wmts/${service}?service=WMTS&request=GetTile&version=1.0.0&Format=image/png`
    + `&layer=${layer}&style=default&tilematrixset=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}`;
  const common = { referrerPolicy: "no-referrer", maxZoom: 19, attribution: "CC BY 4.0 scne.es &middot; Sistema Geogr&aacute;fico Nacional IGN" };
  const street = L.tileLayer(ign("ign-base", "IGNBaseTodo"), common);
  const sat = L.tileLayer(ign("pnoa-ma", "OI.OrthoimageCoverage"), { ...common, minZoom: 4 });
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

const OPACITY = { unconfirmed: 0.45, probable: 0.75, confirmed: 1 };

function icon(r, tr) {
  const nest = r.type === "nest", gone = nest && (r.nest_status === "destroyed" || r.nest_status === "inactive");
  const color = gone ? "#9a9a9a" : `var(--sp-${r.species})`;
  const size = nest ? 22 : 16, shape = nest ? "border-radius:4px;transform:rotate(45deg)" : "border-radius:50%";
  const line = tr.level === "unconfirmed" || r.pending ? "dashed" : "solid";
  return L.divIcon({
    className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px ${line} #fff;${shape};opacity:${OPACITY[tr.level]};box-shadow:0 0 0 1px #0006"></div>`
  });
}

function trustLine(tr) {
  const detail = t("trust_detail", { n: tr.n, r: S.trust.radiusM, d: S.trust.days });
  return `<span class="trust trust-${tr.level}">${esc(t("trust_title"))}: ${esc(t("trust_" + tr.level))}</span> <small>(${esc(detail)})</small>`;
}

function popupHtml(r, tr) {
  const when = new Date(r.created).toLocaleString(S.lang);
  const status = r.type === "nest" && r.nest_status ? ` &middot; ${esc(t("st_" + r.nest_status))}` : "";
  return `<div class="popup"><b>${esc(t("type_" + r.type))}: ${esc(t("sp_short_" + r.species))}</b>
    ${r.pending ? `<span class="hint">${esc(t("pending_tag"))}</span><br>` : ""}${esc(t("created"))}: ${esc(when)}${r.count ? ` &middot; n = ${r.count}` : ""}${status}
    <div>${trustLine(tr)}</div></div>`;
}

function renderMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  const recs = allRecords();
  const trust = trustLevels(recs, S.trust);
  const min = TRUST_LEVELS.indexOf(S.minLevel);
  const shown = recs.filter((r) => (S.filter === "all" || r.species === S.filter) && TRUST_LEVELS.indexOf(trust.get(r.id).level) >= min);
  shown.forEach((r) => {
    const tr = trust.get(r.id);
    L.marker([r.lat, r.lon], { icon: icon(r, tr), title: t("sp_short_" + r.species) }).bindPopup(() => popupHtml(r, tr)).addTo(markerLayer);
  });
  $("#map-count").textContent = t("records_n", { n: shown.length });
}

function renderFilters() {
  $("#map-filters").innerHTML = ["all", ...SPECIES].map((x) => `<button class="chip" data-filter="${x}" aria-pressed="${S.filter === x}">${x === "all" ? "" : `<span class="dot" style="background:var(--sp-${x})"></span>`}${esc(x === "all" ? t("all") : t("sp_short_" + x))}</button>`).join("");
  const label = (lv) => lv === "unconfirmed" ? t("trust_any") : (lv === "probable" ? t("trust_probable") + " +" : t("trust_confirmed"));
  $("#trust-filters").innerHTML = TRUST_LEVELS.map((lv) => `<button class="chip" data-level="${lv}" aria-pressed="${S.minLevel === lv}">${esc(label(lv))}</button>`).join("");
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

// ---------- nest finding (technician mode) ----------
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const parseTime = (v) => {
  const m = String(v).trim().match(/^(\d+)(?::(\d{1,2}))?$/);
  return m ? Number(m[1]) * (m[2] === undefined ? 1 : 60) + Number(m[2] || 0) : NaN;
};

// Bait stations live in memory only (this session); nothing is stored on the phone.
function saveStations() {
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
    nest_status: "active", region: S.region
  });
  if (S.consent !== true) return openConsent();
  await queueAndSend(rec);
  showFind();
}

// ---------- data ----------
function renderSummary() {
  const recs = allRecords();
  const s = summarise(recs);
  if (!s.total) {
    $("#summary").innerHTML = `<p class="hint">${esc(t("none"))}</p>`;
    return;
  }
  const rows = (obj, pre) => Object.entries(obj).map(([k, v]) => `<tr><td>${esc(t(pre + k))}</td><td class="n">${v}</td></tr>`).join("");
  const byTrust = {};
  trustLevels(recs, S.trust).forEach(({ level }) => { byTrust[level] = (byTrust[level] || 0) + 1; });
  $("#summary").innerHTML = `<table class="sum"><tr><th>${esc(t("species"))}</th><th></th></tr>${rows(s.bySpecies, "sp_short_")}
    <tr><th>${esc(t("trust_title"))}</th><th></th></tr>${rows(byTrust, "trust_")}
    ${Object.keys(s.nests).length ? `<tr><th>${esc(t("nests_by_status"))}</th><th></th></tr>${rows(s.nests, "st_")}` : ""}</table>
    <p class="hint">${esc(t("records_n", { n: s.total }))}</p>`;
}

async function deleteAll() {
  if (!confirm(t("confirm_delete_all"))) return;
  await clearAll();
  S.outbox = [];
  S.stations = [];
  S.photosOn = false;
  S.consent = null;
  applyText();
  $("#del-msg").textContent = t("deleted_all");
  openConsent();
}

// ---------- wiring ----------
function wireSettings() {
  const langOpts = Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === S.lang ? "selected" : ""}>${v}</option>`).join("");
  $("#lang").innerHTML = $("#consent-lang").innerHTML = langOpts;
  const setLang = (e) => {
    S.lang = e.target.value;
    setSetting("lang", S.lang);
    t = makeT(S.lang);
    $("#lang").value = $("#consent-lang").value = S.lang;
    renderRegions();
    applyText();
  };
  $("#lang").onchange = setLang;
  $("#consent-lang").onchange = setLang;
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

// Technicians can tune the reliability rule; values are clamped to sensible ranges.
function wireTrust() {
  const fields = [["min", "minReports", 1, 50], ["radius", "radiusM", 50, 10000], ["days", "days", 1, 730]];
  fields.forEach(([id, key, lo, hi]) => {
    $("#trust-" + id).onchange = (e) => {
      const v = Math.round(Number(e.target.value));
      S.trust[key] = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : TRUST_DEFAULTS[key];
      setSetting("trust", S.trust);
      applyStatic();
      renderMarkers();
      renderSummary();
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
  if (e.target.closest("[data-photos-on]")) photosOn();
  const ty = e.target.closest("[data-type]");
  if (ty) {
    S.type = ty.dataset.type;
    $$("#type-seg button").forEach((b) => b.setAttribute("aria-pressed", b === ty));
    syncType();
  }
  const lv = e.target.closest("[data-level]");
  if (lv) {
    S.minLevel = lv.dataset.level;
    renderFilters();
    renderMarkers();
  }
  const fl = e.target.closest("[data-filter]");
  if (fl) {
    S.filter = fl.dataset.filter;
    renderFilters();
    renderMarkers();
  }
  if (e.target.closest("[data-consent-open]")) openConsent();
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
  $("#consent-check").onchange = (e) => { $("#consent-accept").disabled = !e.target.checked; };
  $("#consent-accept").onclick = () => setConsent(true);
  $("#consent-decline").onclick = () => setConsent(false);
}

function wireData() {
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
  wireTrust();
  wireReport();
  wireData();
  document.addEventListener("click", onDocClick);
  document.addEventListener("error", onRemoteImgError, true);
  $("#map-load").onclick = loadBaseMap;
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

// Reports saved by older versions (and any unsent report) are in the outbox; old stations are discarded.
async function loadOutbox() {
  S.outbox = await all("records");
  (await all("stations")).forEach((st) => remove("stations", st.id));
}

async function init() {
  wire();
  await loadOutbox();
  applyText();
  goto((location.hash || "").slice(1) || "report");
  if (S.consent === null) openConsent();
  if (S.consent === true) flushOutbox().then(refreshCommunity);
  window.addEventListener("online", flushOutbox);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.outbox.length) flushOutbox(); });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    // When a new version takes over, reload once so page and code always match.
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !reloaded) {
        reloaded = true;
        location.reload();
      }
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(() => {
      $("#sw-msg").textContent = t("offline_ready");
    }).catch(() => {});
  }
}

init();
