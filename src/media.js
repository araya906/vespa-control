// Real photos are requested from Wikimedia Commons only after the user opts in.
// The API returns the thumbnail URL plus author and licence, so credits are always the file's own.
// Titles that no longer exist are skipped.
export const PHOTOS = {
  velutina: ["Vespa velutina 165382529.jpg", "Asian hornet (33252984804) (2).jpg", "Vespa velutina nigrithorax MHNT dos.jpg"],
  orientalis: ["Vespa orientalis 2.jpg", "Oriental hornet (Vespa orientalis).jpg", "Vespa orientalis.queen.jpg"],
  crabro: ["Frelon europeen.jpg", "Vespa crabro by Sven Teschke.jpg"],
  nest_velutina: ["Vespa velutina nest.JPG", "Nido primario de una vespa velutina.jpg", "Vespa velutina nest Paslières n01.jpg", "Intérieur d'un nid de frelons asiatiques.jpg"],
  nest_orientalis: ["Vespa orientalis nest 1.jpg"],
  nest_crabro: ["Vespa crabro nest full.jpg", "The European hornet nest (Vespa crabro).jpg"]
};

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const meta = new Map();
const plain = (html) => (html && typeof DOMParser !== "undefined"
  ? new DOMParser().parseFromString(html, "text/html").body.textContent.trim()
  : String(html || "").replace(/<[^>]*>/g, "").trim());

function toPhoto(file, ii) {
  const m = ii.extmetadata || {};
  return {
    file,
    thumb: ii.thumburl || ii.url,
    page: ii.descriptionurl,
    author: plain(m.Artist?.value) || "?",
    license: plain(m.LicenseShortName?.value) || "",
    licenseUrl: m.LicenseUrl?.value || ""
  };
}

export async function commonsPhotos(files, width = 480) {
  const missing = files.filter((f) => !meta.has(f));
  if (missing.length) {
    const q = new URLSearchParams({
      action: "query", format: "json", origin: "*", prop: "imageinfo", iiprop: "url|extmetadata",
      iiurlwidth: String(width), titles: missing.map((f) => "File:" + f).join("|")
    });
    const res = await fetch(`${COMMONS_API}?${q}`, { credentials: "omit", referrerPolicy: "no-referrer", cache: "force-cache" });
    const data = await res.json();
    const from = new Map((data.query?.normalized || []).map((n) => [n.to, n.from]));
    for (const page of Object.values(data.query?.pages || {})) {
      const name = (from.get(page.title) || page.title).replace(/^File:/, "");
      const ii = page.imageinfo?.[0];
      meta.set(name, ii ? toPhoto(name, ii) : null);
    }
    missing.forEach((f) => { if (!meta.has(f)) meta.set(f, null); });
  }
  return files.map((f) => meta.get(f)).filter(Boolean);
}

// Local illustrations (original SVG, always available offline, no network).
export const ART = {
  velutina: "img/species/velutina.svg",
  orientalis: "img/species/orientalis.svg",
  crabro: "img/species/crabro.svg"
};
export const NEST_ART = [
  { src: "img/nests/velutina-primary.svg", key: "g_nest_v1" },
  { src: "img/nests/velutina-secondary.svg", key: "g_nest_v2" },
  { src: "img/nests/orientalis-cavity.svg", key: "g_nest_o" },
  { src: "img/nests/crabro-hollow.svg", key: "g_nest_c" }
];
