export const LICENSES = {
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/"
};
export const PHOTOS = {
  velutina: [
    { file: "Vespa velutina 165382529.jpg", author: "Vespa-Watch (iNaturalist)", license: "CC0", live: true },
    { file: "Vespa velutina nigrithorax MHNT dos.jpg", author: "Didier Descouens, Muséum de Toulouse", license: "CC BY-SA 4.0" }
  ],
  orientalis: [
    { file: "Vespa orientalis 2.jpg", author: "Gideon Pisanty (Gidip)", license: "CC BY 3.0", live: true }
  ],
  crabro: [
    { file: "Frelon europeen.jpg", author: "Didier Descouens", license: "CC BY-SA 4.0" }
  ]
};
export const enc = (f) => encodeURIComponent(f.replace(/ /g, "_"));
export const photoUrl = (p, width = 480) => `https://commons.wikimedia.org/wiki/Special:FilePath/${enc(p.file)}?width=${width}`;
export const pageUrl = (p) => `https://commons.wikimedia.org/wiki/File:${enc(p.file)}`;

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
