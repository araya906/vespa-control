// Guide helpers: activity calendar and sources. Text lives in src/lang/*.js.
import { REGIONS, regionText } from "./regions.js";

// Monthly activity, 0 none .. 3 high, January first (Iberian Peninsula, general guidance).
const ACTIVITY = {
  velutina: [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 2, 1],
  orientalis: [0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 2, 0]
};
const MARK = ["·", "░", "▒", "█"];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function monthNames(lang) {
  const f = new Intl.DateTimeFormat(lang, { month: "narrow" });
  return Array.from({ length: 12 }, (_, m) => f.format(new Date(2026, m, 15)));
}

export function calendarHtml(t, lang) {
  const head = monthNames(lang).map((m) => `<th>${esc(m)}</th>`).join("");
  const rows = Object.entries(ACTIVITY).map(([sp, lv]) =>
    `<tr><th class="sp sp-${sp}">${esc(t("sp_short_" + sp))}</th>${lv.map((v) => `<td class="lv${v}">${MARK[v]}</td>`).join("")}</tr>`
  ).join("");
  return `<div class="cal-wrap"><table class="cal"><tr><th></th>${head}</tr>${rows}</table></div>`;
}

export function sourcesHtml(lang) {
  const links = (REGIONS.ES?.links || []).map((l) =>
    `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(regionText(l.label, lang))}</a></li>`
  );
  links.push("<li>Rojas-Nossa S. V. et al. (2022). Front. Insect Sci.</li>");
  return links.join("");
}
